import { ConversationState, AgentMemoryEntry } from "../../types";

/**
 * Pronouns and references that need resolution.
 */
const PRONOUN_PATTERNS = [
  /\b(it|its)\b/i,
  /\b(that|this)\b/i,
  /\b(this one|that one)\b/i,
  /\b(same|same one|same account|same wallet)\b/i,
  /\b(there)\b/i,
  /\b(the other one)\b/i,
  /\b(my usual|my usual one|my default)\b/i,
  /\b(he|him|his|she|her)\b/i,
];

/**
 * Check whether a message contains unresolved references.
 */
export function containsUnresolvedReference(message: string): boolean {
  return PRONOUN_PATTERNS.some(p => p.test(message));
}

interface EntityResolution {
  resolved: boolean;
  resolvedMessage?: string;
  resolvedEntity?: { type: string; name: string };
  ambiguous: boolean;
  clarificationNeeded?: string;
}

/**
 * Attempt to resolve pronouns/references in the user's message using:
 * 1. Current conversation state (primary)
 * 2. Recent conversation history
 * 3. Long-term memory (fallback)
 * 
 * Returns whether resolution succeeded, the resolved entity, and
 * optionally a clarification question if ambiguous.
 */
export function resolveEntities(
  message: string,
  conversationState: ConversationState,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  memories: AgentMemoryEntry[],
  availableWallets: string[],
  availablePersons: string[]
): EntityResolution {
  const lower = message.toLowerCase();

  // ─── Priority 1: Current conversation state entities ─────────────────────

  // "Add 500 to it" or "how much does he owe me"
  if (/\b(it|its|that|this|there|same|same one|he|him|his|she|her)\b/i.test(lower)) {
    // Check if the reference is a person pronoun or loan topic
    if (/\b(he|him|his|she|her)\b/i.test(lower) || conversationState.activeTopic === "loan") {
      if (conversationState.lastEntities.personName) {
        return {
          resolved: true,
          resolvedEntity: { type: "person", name: conversationState.lastEntities.personName },
          resolvedMessage: message.replace(
            /\b(he|him|his|she|her|it|its|that|this|there|same|same one|the other one)\b/gi,
            conversationState.lastEntities.personName
          ),
          ambiguous: false,
        };
      }
    }

    // Check if the context is about wallets
    if (conversationState.activeTopic === "wallet" || conversationState.activeTopic === "transfer") {
      if (conversationState.lastEntities.walletName) {
        return {
          resolved: true,
          resolvedEntity: { type: "wallet", name: conversationState.lastEntities.walletName },
          resolvedMessage: message.replace(
            /\b(it|its|that|this|there|same|same one|same wallet|same account)\b/gi,
            conversationState.lastEntities.walletName
          ),
          ambiguous: false,
        };
      }
    }

    // Check if the context is about loans/people
    if (conversationState.activeTopic === "loan") {
      if (conversationState.lastEntities.personName) {
        return {
          resolved: true,
          resolvedEntity: { type: "person", name: conversationState.lastEntities.personName },
          resolvedMessage: message.replace(
            /\b(it|its|that|this|there|same|same one|the other one)\b/gi,
            conversationState.lastEntities.personName
          ),
          ambiguous: false,
        };
      }
    }

    // Check if context is about planning
    if (conversationState.activeTopic === "planning") {
      if (conversationState.lastEntities.planTitle) {
        return {
          resolved: true,
          resolvedEntity: { type: "plan", name: conversationState.lastEntities.planTitle },
          resolvedMessage: message.replace(
            /\b(it|its|that|this|there|same|same one)\b/gi,
            conversationState.lastEntities.planTitle
          ),
          ambiguous: false,
        };
      }
    }
  }

  // ─── Priority 2: "my account" / "my wallet" — check for ambiguity ───────

  if (/\bmy\s+(account|wallet|bank)\b/i.test(lower)) {
    if (availableWallets.length === 1) {
      return {
        resolved: true,
        resolvedEntity: { type: "wallet", name: availableWallets[0] },
        ambiguous: false,
      };
    }
    if (availableWallets.length > 1) {
      // Check conversation state for context
      if (conversationState.lastEntities.walletName) {
        return {
          resolved: true,
          resolvedEntity: { type: "wallet", name: conversationState.lastEntities.walletName },
          ambiguous: false,
        };
      }

      // Check long-term memory for a default/preferred wallet
      const defaultWalletMemory = memories.find(
        m => m.status === "active" &&
          (m.content.toLowerCase().includes("default") || m.content.toLowerCase().includes("usual")) &&
          m.tags.includes("wallet")
      );
      if (defaultWalletMemory) {
        const walletMatch = availableWallets.find(w =>
          defaultWalletMemory.content.toLowerCase().includes(w.toLowerCase())
        );
        if (walletMatch) {
          return {
            resolved: true,
            resolvedEntity: { type: "wallet", name: walletMatch },
            ambiguous: false,
          };
        }
      }

      // Truly ambiguous — need clarification
      return {
        resolved: false,
        ambiguous: true,
        clarificationNeeded: `You have ${availableWallets.length} wallets (${availableWallets.join(", ")}). Which one do you mean?`,
      };
    }
  }

  // ─── Priority 3: Scan recent history for context ──────────────────────────

  if (containsUnresolvedReference(lower) && conversationHistory.length > 0) {
    // Search last 4 messages for entity mentions
    const recentMessages = conversationHistory.slice(-4);
    for (const msg of recentMessages.reverse()) {
      const msgLower = msg.content.toLowerCase();

      // Check for wallet names
      for (const wallet of availableWallets) {
        if (msgLower.includes(wallet.toLowerCase())) {
          return {
            resolved: true,
            resolvedEntity: { type: "wallet", name: wallet },
            resolvedMessage: message.replace(
              /\b(it|its|that|this|there|same|same one|same wallet|same account)\b/gi,
              wallet
            ),
            ambiguous: false,
          };
        }
      }

      // Check for person names
      for (const person of availablePersons) {
        if (msgLower.includes(person.toLowerCase())) {
          return {
            resolved: true,
            resolvedEntity: { type: "person", name: person },
            resolvedMessage: message.replace(
              /\b(it|its|that|this|same|same one|the other one)\b/gi,
              person
            ),
            ambiguous: false,
          };
        }
      }
    }
  }

  // No pronoun to resolve, or couldn't resolve
  return {
    resolved: false,
    ambiguous: false,
  };
}
