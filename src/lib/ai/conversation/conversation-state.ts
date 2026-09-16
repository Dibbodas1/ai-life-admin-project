import { ConversationState } from "../../types";

/**
 * Create a fresh conversation state.
 */
export function createConversationState(): ConversationState {
  return {
    lastEntities: {},
    turnCount: 0,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Extract entities and topic from a message + response turn,
 * and update the conversation state accordingly.
 */
export function updateConversationState(
  state: ConversationState,
  userMessage: string,
  assistantResponse: string,
  toolResult?: { toolName: string; resultSummary?: string }
): ConversationState {
  const lower = userMessage.toLowerCase();
  const updated = { ...state };

  // ─── Topic Detection ──────────────────────────────────────────────────────
  const topicPatterns: Array<{ pattern: RegExp; topic: string }> = [
    { pattern: /wallet|balance|bkash|nagad|bank|cash|card|savings|mfs|account/i, topic: "wallet" },
    { pattern: /expense|spend|spent|khoroch|bought|cost|paid for/i, topic: "expense" },
    { pattern: /income|salary|earn|beton|tuition|freelance/i, topic: "income" },
    { pattern: /loan|debt|owe|lent|borrowed|dhar|pabo|dite hobe/i, topic: "loan" },
    { pattern: /plan|upcoming|due|rent|bill|monthly plan/i, topic: "planning" },
    { pattern: /goal|save|target|jomate/i, topic: "goal" },
    { pattern: /transfer|move|send|pathao|load|withdraw/i, topic: "transfer" },
    { pattern: /budget|limit|allocation/i, topic: "budget" },
  ];

  for (const { pattern, topic } of topicPatterns) {
    if (pattern.test(lower)) {
      updated.activeTopic = topic;
      break;
    }
  }

  // ─── Entity Extraction ────────────────────────────────────────────────────

  // Wallet names
  const walletPatterns = [
    /\b(bkash|b-?kash)\b/i,
    /\b(nagad)\b/i,
    /\b(brac\s*bank|brac)\b/i,
    /\b(dutch\s*bangla|dbbl)\b/i,
    /\b(rocket)\b/i,
    /\b(cash)\b/i,
    /\b(card|credit\s*card|debit\s*card)\b/i,
    /\b(savings?)\b/i,
  ];

  const walletNameMap: Record<string, string> = {
    "bkash": "bKash", "b-kash": "bKash",
    "nagad": "Nagad",
    "brac bank": "BRAC Bank", "brac": "BRAC Bank",
    "dutch bangla": "Dutch Bangla Bank", "dbbl": "Dutch Bangla Bank",
    "rocket": "Rocket",
    "cash": "Cash",
    "card": "Card", "credit card": "Card", "debit card": "Card",
    "savings": "Savings", "saving": "Savings",
  };

  for (const pattern of walletPatterns) {
    const match = lower.match(pattern);
    if (match) {
      const raw = match[0].toLowerCase().trim();
      updated.lastEntities = {
        ...updated.lastEntities,
        walletName: walletNameMap[raw] || match[0],
      };
      break;
    }
  }

  // Person names (from loan/debt context)
  if (updated.activeTopic === "loan") {
    // Pattern: "[Name] owes me" / "I lent [Name]" / "[Name] theke dhar"
    const personPatterns = [
      /(?:that\s+)?([a-zA-Z]{2,})\s+(?:owes|owe|took|borrowed|lent|gave|paid)/i,
      /(?:lent|borrowed|gave)\s+(?:to\s+)?([a-zA-Z]{2,})/i,
      /([a-zA-Z]{2,})\s+(?:amar\s+theke|kach\s+theke|ke\s+disi|theke\s+nisi)/i,
    ];
    const stopWords = new Set([
      "that", "who", "what", "how", "the", "and", "for", "from",
      "money", "cash", "taka", "tk", "bdt", "dollar", "usd", "some", "any"
    ]);
    for (const pp of personPatterns) {
      const match = lower.match(pp);
      if (match && match[1] && match[1].length > 1) {
        const rawName = match[1].toLowerCase();
        // Disallow numbers or stop words
        if (!/\d/.test(rawName) && !stopWords.has(rawName)) {
          const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
          updated.lastEntities = {
            ...updated.lastEntities,
            personName: name,
          };
          break;
        }
      }
    }
  }

  // Plan title detection
  if (updated.activeTopic === "planning") {
    // Look for plan-related entities in the response
    const planMatch = assistantResponse.match(/(?:plan|planned|upcoming).*?"([^"]+)"/i);
    if (planMatch) {
      updated.lastEntities = {
        ...updated.lastEntities,
        planTitle: planMatch[1],
      };
    }
  }

  // ─── Pending Action Detection ─────────────────────────────────────────────

  const actionPatterns: Array<{ pattern: RegExp; type: string }> = [
    { pattern: /\b(add|create|make|banao|koro|korte)\b/i, type: "add" },
    { pattern: /\b(transfer|move|send|pathao|load)\b/i, type: "transfer" },
    { pattern: /\b(delete|remove|erase|moche felo)\b/i, type: "delete" },
    { pattern: /\b(update|change|modify|edit|fix)\b/i, type: "update" },
    { pattern: /\b(mark.*paid|paid|shodh|ferot)\b/i, type: "mark_paid" },
  ];

  for (const { pattern, type } of actionPatterns) {
    if (pattern.test(lower)) {
      updated.pendingAction = {
        type,
        target: updated.lastEntities.walletName || updated.lastEntities.personName || undefined,
      };
      break;
    }
  }

  // ─── Tool Result ──────────────────────────────────────────────────────────

  if (toolResult) {
    updated.lastToolResult = {
      ...toolResult,
      timestamp: new Date().toISOString(),
    };
  }

  updated.turnCount = (state.turnCount || 0) + 1;
  updated.updatedAt = new Date().toISOString();

  return updated;
}

/**
 * Format conversation state into a compact context block for the LLM.
 */
export function formatConversationStateForPrompt(state: ConversationState): string {
  const parts: string[] = [];

  if (state.activeTopic) {
    parts.push(`Current topic: ${state.activeTopic}`);
  }

  const entities = Object.entries(state.lastEntities)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`);
  if (entities.length > 0) {
    parts.push(`Referenced entities: ${entities.join(", ")}`);
  }

  if (state.pendingAction) {
    parts.push(`Pending action: ${state.pendingAction.type}${state.pendingAction.target ? ` → ${state.pendingAction.target}` : ""}`);
  }

  if (state.lastToolResult) {
    parts.push(`Last tool used: ${state.lastToolResult.toolName}${state.lastToolResult.resultSummary ? ` (${state.lastToolResult.resultSummary})` : ""}`);
  }

  if (parts.length === 0) return "";

  return `CURRENT CONVERSATION STATE:\n${parts.map(p => `  - ${p}`).join("\n")}`;
}
