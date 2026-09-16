import { generateAIResponse, chatWithTools } from "./gemini";
import { FinancialContext } from "./context-builder";
import { AgentMemoryEntry, ConversationState } from "../types";
import { retrieveRelevantMemories, formatMemoriesForPrompt } from "./memory/memory-retriever";
import { formatConversationStateForPrompt } from "./conversation/conversation-state";
import { containsUnresolvedReference, resolveEntities } from "./conversation/entity-resolver";

// ─── Chat Input ─────────────────────────────────────────────────────────────

interface ChatInput {
  userMessage: string;
  context: FinancialContext;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  conversationState?: ConversationState;
  tools?: any[];
  toolExecutors?: Record<string, (args: any) => Promise<any>>;
}

// ─── System Instruction ─────────────────────────────────────────────────────

const SYSTEM_INSTRUCTION = `You are AI Life Admin, a personal finance and life administration copilot. You answer questions using ONLY the user's actual stored data and memories provided in the context. You have FULL ADMINISTRATIVE CONTROL over the database and can call tools to mutate data on the user's behalf.

CONVERSATIONAL INTELLIGENCE RULES:

1. FOLLOW-UP RESOLUTION: Resolve pronouns and references using the CURRENT CONVERSATION STATE block. When the user says "it", "that", "this", "same one", etc., resolve using the conversation state entities. Example: "How much in my bKash?" → "Add 500 tk in it" → "it" = bKash wallet.

2. LIVE DATA PRIORITY: The LIVE APPLICATION DATA section is the authoritative source for current balances, transactions, expenses, tasks, bills, and all mutable state. Long-term memory MUST NEVER override live data. If memory says "bKash = 8,000" but live data says "bKash = 3,500", use 3,500.

3. MEMORY USAGE: Use the AGENT MEMORY section to understand the user's habits, preferences, and personal context. Do NOT mention irrelevant memories. Do NOT expose the internal memory retrieval process. Use memories naturally in responses.

4. MEMORY CONFIDENCE: Do NOT present uncertain memories (confidence < 70%) as confirmed facts. If a memory is uncertain, acknowledge the uncertainty or verify with the user.

5. TOOL USE: When the user asks you to modify, add, or delete data and you have tools available, ALWAYS call the mutate_database tool. Never invent tool results. Never assume a tool succeeded without observing its result.

6. PROACTIVE INTELLIGENCE: Only surface patterns when clearly relevant to the user's current goal. Do not repeatedly mention the same pattern. Do not become intrusive. For financial actions, ask for confirmation according to existing rules.

7. LEARNING ACKNOWLEDGMENT: When the user explicitly teaches you a durable fact or preference, briefly acknowledge: "Got it — I'll remember that your salary arrives on the 1st."

8. CLARIFICATION: When multiple interpretations exist and choosing incorrectly could cause harm, ask a concise clarification question. Do NOT guess when ambiguity is dangerous. Example: "You have 3 accounts — which one do you mean?"

9. NO FABRICATION: Never claim to remember something unless it exists in the provided memory context. Never invent expenses, balances, bills, or financial history.

10. NO HIDDEN AUTHORITY: Memory provides context. Memory does NOT grant permission to perform actions. Before executing DELETE or CLEAR actions, always confirm unless the user was extremely explicit.

DB SCHEMAS FOR MUTATIONS:
- wallets: { name: string, type: "cash" | "bank" | "card" | "mfs" | "savings" | "other", balance: number, currency?: string }
  * "Add a bKash wallet with 5000 tk" -> collection: "wallets", action: "ADD", payload: { name: "bKash", type: "mfs", balance: 5000 }
- walletTransfers: { fromWalletName: string, toWalletName: string, amount: number, notes?: string }
  * "Transfer 2000 from Bank to bKash" -> collection: "walletTransfers", action: "ADD", payload: { fromWalletName: "Bank", toWalletName: "bKash", amount: 2000 }
- expenses: { amount: number, merchant: string, category: string, date?: string, walletName?: string }
  * If the user specifies which wallet they spent from, always include walletName!
- income: { amount: number, source: string, category?: string, date?: string, walletName?: string }
- categories: { name: string, type: "expense" | "income", color: string, icon: string }
- financialGoals: { name: string, targetAmount: number, currentAmount: number }
- monthlyPlans: { title: string, amount: number, dueDate: string, category?: string, priority?: "high" | "medium" | "low", walletName?: string, notes?: string, status?: "planned" | "paid" }
- loans: { personName: string, type: "lent" | "borrowed" | "repayment", amount: number, dueDate?: string, notes?: string }
  * "X will get $Y from me" or "I owe X $Y" -> type: "borrowed"
  * "X took $Y from me" or "I lent $Y to X" -> type: "lent"
  * "X paid me back $Y" -> type: "repayment"

BANGLISH & BENGALI UNDERSTANDING:
You must fluently interpret Banglish (Bengali in English alphabet) across ALL modules:

1. Wallets: "amar bkash e 5000 tk" -> bKash wallet | "bank theke bkash e 2000 tk transfer" -> wallet transfer
2. Loans: "X amar theke Y tk pabe" -> I owe X (borrowed) | "X amar theke Y tk nise" -> X owes me (lent) | repayments: "ferot dise/shodh korse"
3. Expenses: "ajke 500 takar bazar" -> expense | "cash theke 300 tk lunch" -> expense from Cash wallet
4. Income: "tuition theke 3000 tk bkash e" -> income to bKash | "salary 60000 tk bank e" -> income to Bank
5. Planning: "5 tarikhe rent 15000 tk" -> monthly plan | "mark as paid" -> update status
6. Goals: "bike kinbo 1 lakh taka" -> financial goal
7. Numbers: "tk/taka/টাকা" = currency | "k" = thousand | "hajar/hazar" = thousand | "lakh/lac" = 100,000 | "koti/crore" = 10,000,000

MUTATION NOTES:
- ADD: Creates items. Income for same source sums amounts. Loans for same person update profile.
- UPDATE: Modifies existing items. Use 'query' parameter to match by properties.
- DELETE/CLEAR: Remove items. Always ask confirmation first.

RESPONSE STYLE: Write clean, warm, concise responses. Use paragraphs and bullet points, not messy markdown. Avoid robotic headers or excessive formatting.`;

// ─── Prompt Builder ─────────────────────────────────────────────────────────

function buildPrompt(input: ChatInput): string {
  const { userMessage, context, conversationHistory = [], conversationState } = input;

  // ── Section 1: Live Application Data (authoritative) ──────────────────
  const walletLines = (context.wallets || [])
    .map((w) => `  - ${w.name} (${w.type}): $${w.balance.toFixed(2)}${w.isDefault ? " [Default]" : ""}`)
    .join("\n") || "  No wallets recorded";

  const transferLines = (context.recentTransfers || []).length > 0
    ? "Recent Transfers:\n" + (context.recentTransfers || []).map(t => `  - ${t.from} -> ${t.to}: $${t.amount}`).join("\n")
    : "";

  const categoryLines = Object.entries(context.categorySpending)
    .map(([k, v]) => `  ${k}: $${v.toFixed(2)}`)
    .join("\n") || "  None";

  const goalLines = context.activeGoals
    .map((g) => `  ${g.name}: $${g.current}/$${g.target}`)
    .join("\n") || "  No active goals";

  const loanLines = (context.activeLoansAndDebts || [])
    .map((l) => `  - ${l.personName}: ${l.type === "lent" ? "owes you" : "you owe them"} $${l.amount}`)
    .join("\n") || "  None";

  const planLines = (context.upcomingMonthlyPlans || [])
    .map((p) => `  - ${p.title} (${p.category}): $${p.amount} due ${p.dueDate} [${p.priority.toUpperCase()}]${p.walletName ? " via " + p.walletName : ""}`)
    .join("\n") || "  No upcoming planned expenses";

  const liveData = [
    "LIVE APPLICATION DATA (Authoritative — always takes priority over memory):",
    `- Total Net Liquidity: $${(context.totalWalletLiquidity || 0).toFixed(2)}`,
    `- Available this month: $${context.currentAvailable.toFixed(2)}`,
    `- Total Income: $${context.totalIncome.toFixed(2)}`,
    `- Total Expenses: $${context.totalExpenses.toFixed(2)}`,
    "",
    "WALLETS & ACCOUNTS:",
    walletLines,
    transferLines,
    "",
    "SPENDING BY CATEGORY:",
    categoryLines,
    "",
    "ACTIVE GOALS:",
    goalLines,
    "",
    "LOANS & DEBTS:",
    `  Total Owed To You: $${(context.totalOwedToYou || 0).toFixed(0)}`,
    `  Total You Owe: $${(context.totalYouOwe || 0).toFixed(0)}`,
    loanLines,
    "",
    "UPCOMING MONTHLY PLANNING:",
    `  Total Planned: $${(context.totalPlannedUpcoming || 0).toFixed(2)}`,
    planLines,
  ].filter(line => line !== undefined).join("\n");

  // ── Section 2: Conversation State ─────────────────────────────────────
  const stateBlock = conversationState
    ? formatConversationStateForPrompt(conversationState)
    : "";

  // ── Section 3: Conversation History (last 10 messages) ────────────────
  const historyText = conversationHistory
    .slice(-10)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");

  // ── Section 4: Relevant Long-Term Memories ────────────────────────────
  const relevantMemories = retrieveRelevantMemories(
    context.agentMemory || [],
    userMessage,
    conversationState
  );
  const memoryBlock = formatMemoriesForPrompt(relevantMemories);

  // ── Assemble (order matters: live data → state → history → memory → message) ──
  const sections = [
    liveData,
    stateBlock,
    historyText ? `RECENT CONVERSATION:\n${historyText}` : "",
    memoryBlock,
    `User Question/Command: ${userMessage}`,
    "Answer the user's question using ONLY the data above. If they asked you to modify, add, or delete data and you have tools available, call the mutate_database tool! If data is missing, say so honestly. Write in a clean, elegant, human-readable format. Keep your response concise and helpful."
  ].filter(Boolean);

  return sections.join("\n\n");
}

// ─── Entity Resolution Layer ────────────────────────────────────────────────

function resolveMessageReferences(input: ChatInput): ChatInput {
  const { userMessage, context, conversationHistory = [], conversationState } = input;

  if (!conversationState || !containsUnresolvedReference(userMessage)) {
    return input;
  }

  const walletNames = (context.wallets || []).map(w => w.name);
  const personNames = (context.activeLoansAndDebts || []).map(l => l.personName);

  const resolution = resolveEntities(
    userMessage,
    conversationState,
    conversationHistory,
    context.agentMemory || [],
    walletNames,
    personNames
  );

  if (resolution.resolved && resolution.resolvedMessage) {
    return {
      ...input,
      userMessage: resolution.resolvedMessage,
    };
  }

  if (resolution.ambiguous && resolution.clarificationNeeded) {
    // Inject clarification hint into the message so the AI asks for clarification
    return {
      ...input,
      userMessage: `${userMessage}\n\n[SYSTEM NOTE: The user's reference is ambiguous. ${resolution.clarificationNeeded} Please ask the user to clarify.]`,
    };
  }

  return input;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Main chat function. Accepts structured input with memory and conversation state.
 * 
 * Also supports legacy positional arguments for backward compatibility.
 */
export async function chatWithAssistant(
  messageOrInput: string | ChatInput,
  context?: FinancialContext,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>,
  tools?: any[],
  toolExecutors?: Record<string, (args: any) => Promise<any>>
): Promise<string> {
  // Support both new object-style and legacy positional-style calls
  let input: ChatInput;

  if (typeof messageOrInput === "string") {
    input = {
      userMessage: messageOrInput,
      context: context!,
      conversationHistory: conversationHistory || [],
      tools,
      toolExecutors,
    };
  } else {
    input = messageOrInput;
  }

  // Step 1: Resolve entity references (pronouns, "it", "that", etc.)
  input = resolveMessageReferences(input);

  // Step 2: Build the prompt
  const prompt = buildPrompt(input);

  // Step 3: Execute
  try {
    if (input.tools && input.toolExecutors) {
      return await chatWithTools(prompt, SYSTEM_INSTRUCTION, input.tools, input.toolExecutors, []);
    }
    return await generateAIResponse(prompt, SYSTEM_INSTRUCTION);
  } catch (err) {
    console.error("Chat error:", err);
    return "I'm having trouble processing your request right now. Please try again in a moment.";
  }
}
