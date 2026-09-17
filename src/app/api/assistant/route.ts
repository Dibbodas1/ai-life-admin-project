import { NextRequest, NextResponse } from "next/server";
import { getDriveData, saveDriveData } from "@/lib/drive-db";
import { buildFinancialContext } from "@/lib/ai/context-builder";
import { chatWithAssistant } from "@/lib/ai/chat";
import { SchemaType } from "@google/generative-ai";
import { ConversationState } from "@/lib/types";
import { isMemoryWorthy, extractMemoryCandidates } from "@/lib/ai/memory/memory-extractor";
import { validateCandidates } from "@/lib/ai/memory/memory-validator";
import { deduplicateMemories } from "@/lib/ai/memory/memory-deduplicator";
import { resolveConflictsAndMerge, applyMemoryChanges } from "@/lib/ai/memory/memory-conflict-resolver";
import { createConversationState, updateConversationState } from "@/lib/ai/conversation/conversation-state";

const tools = [{
  functionDeclarations: [{
    name: "mutate_database",
    description: "Execute a CRUD operation to add, update, delete, or clear entries in the user's database. ALWAYS ask for confirmation before using DELETE or CLEAR.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        collection: { type: SchemaType.STRING, description: "The collection to mutate (e.g. agentMemory, monthlyPlans, wallets, walletTransfers, loans, expenses, income, categories, financialGoals, OR 'all' to wipe the entire database)" },
        action: { type: SchemaType.STRING, description: "The action to perform: ADD, UPDATE, DELETE, CLEAR" },
        id: { type: SchemaType.STRING, description: "The exact ID of the item to update or delete" },
        query: { type: SchemaType.STRING, description: "If ID is unknown, a JSON string of properties to match the item (e.g. {\"category\": \"Pets\"} or {\"name\": \"Emergency Fund\"})" },
        payload: { type: SchemaType.STRING, description: "JSON string of the item (or JSON array of items) to ADD, or properties to UPDATE" }
      },
      required: ["collection", "action"]
    }
  },
  {
    name: "analyze_purchase",
    description: "Analyze a planned expense or purchase to see if it is affordable, calculate its impact on runway and goals, and get AI recommendations. Use this when the user asks if they can afford something or wants suggestions on a new expense.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        amount: { type: SchemaType.NUMBER, description: "The amount of the planned purchase or expense" },
        description: { type: SchemaType.STRING, description: "A brief description of the purchase" }
      },
      required: ["amount", "description"]
    }
  }]
}];

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseNumeric(val: any, fallback = 0): number {
  if (typeof val === "number" && !isNaN(val)) return val;
  if (!val) return fallback;
  const cleaned = String(val).replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? fallback : num;
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") || "demo_token";

    const { message, history, conversationState: clientConvState } = await req.json();
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const { data } = await getDriveData(token);
    if (!data.wallets) data.wallets = [];
    if (!data.walletTransfers) data.walletTransfers = [];
    if (!data.monthlyPlans) data.monthlyPlans = [];
    if (!data.agentMemory) data.agentMemory = [];

    // Hydrate or create conversation state
    let convState: ConversationState = clientConvState || createConversationState();

    let hasMutated = false;
    let context: any; // Declared here for tool executors to access
    
    const toolExecutors = {
      analyze_purchase: async (args: { amount: number; description: string }) => {
        try {
          const { analyzePurchase } = await import("@/lib/ai/purchase-engine");
          if (!context) {
            context = await buildFinancialContext(data);
            context.conversationState = convState;
          }
          const analysis = await analyzePurchase(args.amount, args.description, context);
          
          return {
            success: true,
            affordable: analysis.affordable,
            safetyScore: analysis.safetyScore,
            verdictBadge: analysis.verdictBadge,
            impact: analysis.impact,
            aiAnalysis: analysis.aiAnalysis,
            recommendation: analysis.recommendation,
            alternativeStrategies: analysis.alternativeStrategies,
            detailedMetrics: {
               totalLiquidity: analysis.totalLiquidity,
               afterPurchase: analysis.afterPurchase,
               remainingAfterAllObligations: analysis.remainingAfterAllObligations
            }
          };
        } catch (e) {
          return { success: false, error: String(e) };
        }
      },
      mutate_database: async (args: { collection: string; action: string; id?: string; query?: string; payload?: string }) => {
        try {
          if (!token || token === "demo_token" || token === "dummy_demo_token") {
            return {
              success: false,
              error: "Google Drive is not connected. The user MUST connect their Google Drive from the bottom-left sidebar before any data can be saved. Please politely ask the user to connect their Google Drive so their data can be stored securely in their private cloud drive.",
            };
          }
          const { collection, action, id, query, payload } = args;
          
          if (collection === "all" && action === "CLEAR") {
            const collections = ["expenses", "income", "categories", "budgets", "subscriptions", "bills", "financialGoals", "lifeAdminTasks", "documents", "insights", "alerts", "loans", "wallets", "walletTransfers", "monthlyPlans"];
            for (const coll of collections) {
              if (coll in data) {
                (data as any)[coll] = [];
              }
            }
            await saveDriveData(token, data);
            return { success: true, message: `Successfully cleared ALL database collections.` };
          }

          if (!(collection in data)) {
            return { success: false, error: `Collection ${collection} does not exist.` };
          }

          const targetArray = (data as any)[collection] as any[];
          let parsedPayload: any = {};
          let parsedQuery: any = {};
          
          if (payload) {
            try { parsedPayload = JSON.parse(payload); } 
            catch { return { success: false, error: "Invalid JSON payload string." }; }
          }
          if (query) {
            try { parsedQuery = JSON.parse(query); } 
            catch { return { success: false, error: "Invalid JSON query string." }; }
          }

          const findIndex = () => {
            if (id) return targetArray.findIndex((item: any) => item._id === id);
            if (Object.keys(parsedQuery).length > 0) {
               return targetArray.findIndex(item => {
                 return Object.entries(parsedQuery).every(([k, v]) => 
                   String(item[k]).toLowerCase().includes(String(v).toLowerCase())
                 );
               });
            }
            return -1;
          };

          if (action === "ADD") {
            const items = Array.isArray(parsedPayload) ? parsedPayload : [parsedPayload];
            for (const p of items) {
              // Special handling for Wallet Transfers
              if (collection === "walletTransfers") {
                const fromSearch = (p.fromWalletName || p.from || "").trim().toLowerCase();
                const toSearch = (p.toWalletName || p.to || "").trim().toLowerCase();
                const transferAmt = parseNumeric(p.amount);

                if (transferAmt > 0) {
                  let fromWallet = data.wallets.find((w: any) => {
                    const name = (w.name || "").toLowerCase();
                    return name === fromSearch || name.includes(fromSearch) || fromSearch.includes(name);
                  });
                  let toWallet = data.wallets.find((w: any) => {
                    const name = (w.name || "").toLowerCase();
                    return name === toSearch || name.includes(toSearch) || toSearch.includes(name);
                  });

                  if (!fromWallet && fromSearch) {
                    fromWallet = {
                      _id: crypto.randomUUID(),
                      userId: data.users[0]?._id || "demo_user_alex",
                      name: p.fromWalletName || "Main Cash",
                      type: fromSearch.includes("bank") ? "bank" : fromSearch.includes("bkash") || fromSearch.includes("nagad") ? "mfs" : "cash",
                      balance: 0,
                      createdAt: new Date().toISOString()
                    };
                    data.wallets.push(fromWallet);
                  }
                  if (!toWallet && toSearch) {
                    toWallet = {
                      _id: crypto.randomUUID(),
                      userId: data.users[0]?._id || "demo_user_alex",
                      name: p.toWalletName || "bKash Personal",
                      type: toSearch.includes("bank") ? "bank" : toSearch.includes("bkash") || toSearch.includes("nagad") ? "mfs" : "cash",
                      balance: 0,
                      createdAt: new Date().toISOString()
                    };
                    data.wallets.push(toWallet);
                  }

                  if (fromWallet) fromWallet.balance = (Number(fromWallet.balance) || 0) - transferAmt;
                  if (toWallet) toWallet.balance = (Number(toWallet.balance) || 0) + transferAmt;

                  targetArray.push({
                    _id: crypto.randomUUID(),
                    userId: data.users[0]?._id || "demo_user_alex",
                    fromWalletId: fromWallet?._id || "unknown",
                    toWalletId: toWallet?._id || "unknown",
                    fromWalletName: fromWallet?.name || p.fromWalletName || "Source",
                    toWalletName: toWallet?.name || p.toWalletName || "Destination",
                    amount: transferAmt,
                    date: p.date || new Date().toISOString(),
                    notes: p.notes || `Transfer from ${fromWallet?.name || "Source"} to ${toWallet?.name || "Destination"}`
                  });
                  continue;
                }
              }

              // 1. Smart Upsert / Deduplication: check if an existing item should be updated instead of duplicated
              let existingIdx = -1;

              if (collection === "categories" && p.name) {
                existingIdx = targetArray.findIndex(
                  (c: any) => c.name && c.name.trim().toLowerCase() === p.name.trim().toLowerCase()
                );
              } else if (collection === "wallets" && p.name) {
                const targetWallet = p.name.trim().toLowerCase();
                existingIdx = targetArray.findIndex((w: any) => {
                  const wName = (w.name || "").trim().toLowerCase();
                  return wName === targetWallet || wName.includes(targetWallet) || targetWallet.includes(wName);
                });
              } else if (collection === "budgets" && p.category) {
                existingIdx = targetArray.findIndex(
                  (b: any) => b.category && b.category.trim().toLowerCase() === p.category.trim().toLowerCase()
                );
              } else if (collection === "subscriptions" && p.name) {
                existingIdx = targetArray.findIndex(
                  (s: any) => s.name && s.name.trim().toLowerCase() === p.name.trim().toLowerCase()
                );
              } else if (collection === "financialGoals" && p.name) {
                const targetName = p.name.trim().toLowerCase();
                existingIdx = targetArray.findIndex((g: any) => {
                  const existingName = (g.name || "").trim().toLowerCase();
                  return existingName === targetName || existingName.includes(targetName) || targetName.includes(existingName);
                });
              } else if (collection === "income" && p.source) {
                existingIdx = targetArray.findIndex(
                  (i: any) => i.source && i.source.trim().toLowerCase() === p.source.trim().toLowerCase()
                );
              } else if (collection === "loans" && p.personName) {
                const targetPerson = p.personName.trim().toLowerCase();
                existingIdx = targetArray.findIndex(
                  (l: any) => l.personName && l.personName.trim().toLowerCase() === targetPerson
                );
              } else if (collection === "monthlyPlans" && (p.title || p.name)) {
                const targetTitle = (p.title || p.name).trim().toLowerCase();
                existingIdx = targetArray.findIndex(
                  (m: any) => m.title && m.title.trim().toLowerCase() === targetTitle
                );
              }

              if (existingIdx !== -1) {
                if (collection === "income") {
                  // Sum up income amounts for the same source instead of overwriting
                  const prevAmount = parseNumeric(targetArray[existingIdx].amount);
                  const addedAmount = parseNumeric(p.amount);
                  targetArray[existingIdx] = {
                    ...targetArray[existingIdx],
                    ...p,
                    amount: prevAmount + addedAmount,
                    date: p.date || new Date().toISOString()
                  };
                } else if (collection === "loans") {
                  // Smart Loan/Debt Person Profile Management
                  const loan = targetArray[existingIdx];
                  const transType = p.type || loan.type;
                  const transAmount = parseNumeric(p.amount);

                  if (transType === "repayment") {
                    loan.amount = Math.max(0, loan.amount - transAmount);
                    if (loan.amount === 0) loan.status = "settled";
                  } else if (transType === loan.type) {
                    loan.amount += transAmount;
                    if (loan.amount > 0) loan.status = "active";
                  } else {
                    // Opposite direction: net out the balance
                    if (loan.amount >= transAmount) {
                      loan.amount -= transAmount;
                      if (loan.amount === 0) loan.status = "settled";
                    } else {
                      loan.type = transType;
                      loan.amount = transAmount - loan.amount;
                      loan.status = "active";
                    }
                  }

                  if (p.dueDate) loan.dueDate = p.dueDate;
                  if (p.notes) loan.notes = p.notes;
                  if (!loan.history) loan.history = [];
                  loan.history.push({
                    _id: crypto.randomUUID(),
                    amount: transAmount,
                    type: transType,
                    date: p.date || new Date().toISOString(),
                    notes: p.notes || `Transaction for ${loan.personName}`
                  });
                } else if (collection === "wallets") {
                  const wallet = targetArray[existingIdx];
                  if (p.balance !== undefined) wallet.balance = parseNumeric(p.balance);
                  if (p.type) wallet.type = p.type;
                  if (p.color) wallet.color = p.color;
                  if (p.icon) wallet.icon = p.icon;
                  if (p.isDefault !== undefined) wallet.isDefault = p.isDefault;
                } else if (collection === "monthlyPlans") {
                  const plan = targetArray[existingIdx];
                  if (p.amount !== undefined) plan.amount = parseNumeric(p.amount);
                  if (p.dueDate) plan.dueDate = p.dueDate;
                  if (p.priority) plan.priority = p.priority;
                  if (p.category) plan.category = p.category;
                  if (p.walletName) plan.walletName = p.walletName;
                  if (p.notes) plan.notes = p.notes;
                  if (p.status) {
                    plan.status = p.status;
                    if (p.status === "paid") plan.paidAt = new Date().toISOString();
                  }
                } else {
                  // Other collections (budgets, categories, subscriptions, goals): update in place
                  targetArray[existingIdx] = { ...targetArray[existingIdx], ...p };
                }
                continue;
              }

              // 2. Safe defaults for new items
              const newItem = { _id: crypto.randomUUID(), userId: data.users[0]?._id || "demo_user_alex", ...p };

              if (collection === "expenses" || collection === "income") {
                if (!newItem.date) newItem.date = new Date().toISOString();
                
                // Sync wallet balance if expense or income specifies a wallet
                const wSearch = (p.walletName || "").trim().toLowerCase();
                const matchedWallet = data.wallets.find((w: any) => 
                  (p.walletId && w._id === p.walletId) ||
                  (wSearch && (w.name.toLowerCase().includes(wSearch) || wSearch.includes(w.name.toLowerCase()) || w.type.toLowerCase() === wSearch))
                );
                if (matchedWallet) {
                  if (collection === "expenses") {
                    matchedWallet.balance = (Number(matchedWallet.balance) || 0) - (Number(p.amount) || 0);
                  } else {
                    matchedWallet.balance = (Number(matchedWallet.balance) || 0) + (Number(p.amount) || 0);
                  }
                  newItem.walletId = matchedWallet._id;
                  newItem.walletName = matchedWallet.name;
                }
              } else if (collection === "budgets") {
                if (!newItem.period) newItem.period = "monthly";
              } else if (collection === "financialGoals") {
                if (newItem.currentAmount === undefined) newItem.currentAmount = 0;
                if (!newItem.deadline) newItem.deadline = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
                if (!newItem.priority) newItem.priority = "medium";
                if (!newItem.status) newItem.status = "active";
                if (!newItem.monthlyContribution && newItem.targetAmount) {
                  newItem.monthlyContribution = Math.ceil((newItem.targetAmount - newItem.currentAmount) / 12);
                }
              } else if (collection === "subscriptions") {
                if (!newItem.billingCycle) newItem.billingCycle = "monthly";
                if (!newItem.status) newItem.status = "active";
              } else if (collection === "lifeAdminTasks") {
                if (!newItem.status) newItem.status = "pending";
                if (!newItem.priority) newItem.priority = "medium";
              } else if (collection === "wallets") {
                newItem.name = newItem.name || "My Wallet";
                newItem.type = newItem.type || "cash";
                newItem.balance = Number(newItem.balance) || 0;
                newItem.currency = newItem.currency || "BDT";
                const defaultColors: Record<string, string> = {
                  cash: "#10B981",
                  bank: "#3B82F6",
                  mfs: "#EC4899",
                  card: "#8B5CF6",
                  savings: "#F59E0B",
                  other: "#64748B"
                };
                newItem.color = newItem.color || defaultColors[newItem.type] || "#10B981";
                newItem.icon = newItem.icon || (newItem.type === "bank" ? "Landmark" : newItem.type === "mfs" ? "Smartphone" : newItem.type === "card" ? "CreditCard" : newItem.type === "savings" ? "PiggyBank" : "Wallet");
                newItem.createdAt = new Date().toISOString();
              } else if (collection === "loans") {
                newItem.amount = parseNumeric(newItem.amount);
                newItem.type = newItem.type || "lent";
                newItem.status = newItem.amount > 0 ? "active" : "settled";
                newItem.createdAt = new Date().toISOString();
                if (!newItem.history) {
                  newItem.history = [{
                    _id: crypto.randomUUID(),
                    amount: newItem.amount,
                    type: newItem.type,
                    date: p.date || new Date().toISOString(),
                    notes: newItem.notes || `Initial ${newItem.type}`
                  }];
                }
              } else if (collection === "monthlyPlans") {
                newItem.title = newItem.title || newItem.name || "Upcoming Expense";
                newItem.amount = parseNumeric(newItem.amount);
                newItem.dueDate = newItem.dueDate || new Date().toISOString().split("T")[0];
                newItem.category = newItem.category || "General";
                newItem.priority = newItem.priority || "medium";
                newItem.status = newItem.status || "planned";
                newItem.createdAt = new Date().toISOString();
                if (p.walletName) {
                  const wSearch = p.walletName.trim().toLowerCase();
                  const matchedW = data.wallets.find((w: any) => w.name.toLowerCase().includes(wSearch) || wSearch.includes(w.name.toLowerCase()));
                  if (matchedW) {
                    newItem.walletId = matchedW._id;
                    newItem.walletName = matchedW.name;
                  }
                }
              }

              targetArray.push(newItem);

              // 3. Auto-Category Provisioning:
              // If a budget, expense, or bill is added for a category that doesn't exist yet, automatically create it
              if ((collection === "budgets" || collection === "expenses" || collection === "bills") && p.category) {
                const catName = p.category.trim();
                const exists = data.categories.some((c: any) => c.name && c.name.toLowerCase() === catName.toLowerCase());
                if (!exists) {
                  data.categories.push({
                    _id: crypto.randomUUID(),
                    userId: data.users[0]?._id || "demo_user_alex",
                    name: catName,
                    type: "expense",
                    color: "#6366F1",
                    icon: "tag"
                  });
                }
              }
            }
          } else if (action === "UPDATE") {
            const idx = findIndex();
            if (idx === -1) return { success: false, error: "Item not found for UPDATE. Provide a valid ID or query." };
            if ("balance" in parsedPayload) parsedPayload.balance = parseNumeric(parsedPayload.balance);
            if ("amount" in parsedPayload) parsedPayload.amount = parseNumeric(parsedPayload.amount);
            if ("targetAmount" in parsedPayload) parsedPayload.targetAmount = parseNumeric(parsedPayload.targetAmount);
            if ("currentAmount" in parsedPayload) parsedPayload.currentAmount = parseNumeric(parsedPayload.currentAmount);
            if (collection === "monthlyPlans" && parsedPayload.status === "paid") {
              parsedPayload.paidAt = new Date().toISOString();
              const wName = targetArray[idx]?.walletName || parsedPayload.walletName;
              if (wName) {
                const wSearch = wName.toLowerCase();
                const w = data.wallets.find((wl: any) => wl.name.toLowerCase().includes(wSearch) || wSearch.includes(wl.name.toLowerCase()));
                if (w) {
                  w.balance = (Number(w.balance) || 0) - (Number(targetArray[idx]?.amount || parsedPayload.amount) || 0);
                }
              }
            }
            targetArray[idx] = { ...targetArray[idx], ...parsedPayload };
          } else if (action === "DELETE") {
            const idx = findIndex();
            if (idx === -1) return { success: false, error: "Item not found for DELETE. Provide a valid ID or query." };
            targetArray.splice(idx, 1);
          } else if (action === "CLEAR") {
            (data as any)[collection] = [];
          } else {
            return { success: false, error: `Unknown action: ${action}` };
          }
          
          hasMutated = true;
          await saveDriveData(token, data);
          return { success: true, message: `Successfully executed ${action} on ${collection}.` };
        } catch (e) {
          return { success: false, error: String(e) };
        }
      }
    };

    // ─── Build context & generate response ──────────────────────────────
    if (!context) {
      context = await buildFinancialContext(data);
      context.conversationState = convState;
    }

    const response = await chatWithAssistant({
      userMessage: message,
      context,
      conversationHistory: history || [],
      conversationState: convState,
      tools,
      toolExecutors,
    });

    // ─── Update conversation state (deterministic, fast) ────────────────
    const toolResult = hasMutated
      ? { toolName: "mutate_database", resultSummary: "Data modified successfully" }
      : undefined;
    convState = updateConversationState(convState, message, response, toolResult);

    // ─── Memory extraction pipeline (async, non-blocking on failure) ────
    let memoryCount = (data.agentMemory || []).filter(m => m.status === "active").length;

    try {
      if (isMemoryWorthy(message)) {
        const candidates = await extractMemoryCandidates(message, response, convState);

        if (candidates.length > 0) {
          // Validate → deduplicate → resolve conflicts → persist
          const validated = validateCandidates(candidates, data.agentMemory);

          if (validated.length > 0) {
            const dedupResult = await deduplicateMemories(data.agentMemory, validated);
            const { memoriesToAdd, memoriesToUpdate } = resolveConflictsAndMerge(
              data.agentMemory, dedupResult
            );

            if (memoriesToAdd.length > 0 || memoriesToUpdate.length > 0) {
              applyMemoryChanges(data.agentMemory, memoriesToAdd, memoriesToUpdate);
              await saveDriveData(token, data);
              memoryCount = data.agentMemory.filter(m => m.status === "active").length;
              console.log(`[Memory] +${memoriesToAdd.length} new, ${memoriesToUpdate.length} updated. Total active: ${memoryCount}`);
            }
          }
        }
      }
    } catch (memErr) {
      // Memory failure must NOT break the assistant response
      console.error("[Memory] Extraction pipeline failed (non-fatal):", memErr);
    }

    return NextResponse.json(
      {
        response,
        mutated: hasMutated,
        conversationState: convState,
        memoryCount,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
