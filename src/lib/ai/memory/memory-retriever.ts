import { AgentMemoryEntry, ConversationState } from "../../types";

// ─── Scoring Weights (tunable) ──────────────────────────────────────────────

const WEIGHTS = {
  entityMatch: 3.0,     // Exact entity match (wallet name, person, etc.)
  tagMatch: 2.0,        // Shared tags between message and memory
  topicMatch: 1.5,      // Category/topic alignment
  confidence: 1.0,      // Memory's confidence score
  recency: 0.8,         // How recently the memory was created/updated
  usefulness: 0.5,      // Historical usage count
};

const MAX_RESULTS = 8;
const MIN_SCORE = 0.5;

// ─── Entity Extraction (lightweight, deterministic) ─────────────────────────

function extractMessageEntities(message: string): string[] {
  const lower = message.toLowerCase();
  const entities: string[] = [];

  // Extract quoted terms
  const quoted = message.match(/"([^"]+)"/g);
  if (quoted) entities.push(...quoted.map(q => q.replace(/"/g, "").toLowerCase()));

  // Extract capitalized words (names, accounts, proper nouns like Tanvir, Hasan, City Bank)
  const capitalized = message.match(/\b[A-Z][a-zA-Z0-9_-]+\b/g);
  if (capitalized) {
    entities.push(...capitalized.map(c => c.toLowerCase()));
  }

  // Extract known financial keywords
  const keywords = [
    "salary", "income", "rent", "bkash", "nagad", "bank", "cash", "card",
    "savings", "loan", "debt", "goal", "budget", "expense", "bill",
    "transfer", "payment", "wallet", "account", "spending", "food",
    "transport", "groceries", "shopping", "entertainment", "education",
    "health", "utility", "insurance", "subscription", "reminders",
    "morning", "evening", "night", "weekend", "monthly", "weekly", "daily",
  ];

  for (const kw of keywords) {
    if (lower.includes(kw)) entities.push(kw);
  }

  return [...new Set(entities)];
}

function extractTags(message: string): string[] {
  return extractMessageEntities(message);
}

// ─── Scoring ────────────────────────────────────────────────────────────────

function scoreMemory(
  memory: AgentMemoryEntry,
  messageEntities: string[],
  messageTags: string[],
  conversationTopic: string | undefined,
  now: number
): number {
  let score = 0;

  // 1. Entity match: do any message entities appear in the memory content?
  const memLower = memory.content.toLowerCase();
  const entityHits = messageEntities.filter(e => memLower.includes(e));
  score += (entityHits.length > 0 ? 1 : 0) * WEIGHTS.entityMatch;

  // 2. Tag match: overlap between message tags and memory tags
  const tagOverlap = messageTags.filter(t => memory.tags.includes(t));
  const tagScore = memory.tags.length > 0
    ? tagOverlap.length / Math.max(memory.tags.length, 1)
    : 0;
  score += tagScore * WEIGHTS.tagMatch;

  // 3. Topic match: does the memory category align with the conversation topic?
  if (conversationTopic) {
    const topicLower = conversationTopic.toLowerCase();
    if (memLower.includes(topicLower) || memory.tags.includes(topicLower)) {
      score += WEIGHTS.topicMatch;
    }
  }

  // 4. Confidence
  score += memory.confidence * WEIGHTS.confidence;

  // 5. Recency: decay over time (half-life ≈ 30 days)
  const updatedMs = new Date(memory.updatedAt).getTime();
  const ageMs = now - updatedMs;
  const ageDays = ageMs / (24 * 60 * 60 * 1000);
  const recencyScore = Math.exp(-ageDays / 30);
  score += recencyScore * WEIGHTS.recency;

  // 6. Usefulness: logarithmic scaling of usage count
  const usageScore = Math.log2(1 + memory.usageCount) / 5; // caps around 1.0 at ~32 uses
  score += usageScore * WEIGHTS.usefulness;

  return score;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Retrieve the most relevant memories for the current user message.
 * Returns 0–MAX_RESULTS memories, sorted by relevance score.
 * 
 * Designed to be replaceable with a vector DB retriever in the future.
 */
export function retrieveRelevantMemories(
  memories: AgentMemoryEntry[],
  userMessage: string,
  conversationState?: ConversationState
): AgentMemoryEntry[] {
  // Only consider active memories
  const activeMemories = memories.filter(m => m.status === "active");
  if (activeMemories.length === 0) return [];

  const messageEntities = extractMessageEntities(userMessage);
  const messageTags = extractTags(userMessage);
  const topic = conversationState?.activeTopic;
  const now = Date.now();

  // Add conversation state entities to the search
  if (conversationState?.lastEntities) {
    const stateEntities = Object.values(conversationState.lastEntities).filter(Boolean) as string[];
    messageEntities.push(...stateEntities.map(e => e.toLowerCase()));
  }

  // Score all active memories
  const scored = activeMemories.map(memory => ({
    memory,
    score: scoreMemory(memory, messageEntities, messageTags, topic, now),
  }));

  // Filter by minimum score, sort descending, take top N
  return scored
    .filter(s => s.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)
    .map(s => s.memory);
}

/**
 * Format retrieved memories into a compact context block for the LLM.
 */
export function formatMemoriesForPrompt(memories: AgentMemoryEntry[]): string {
  if (memories.length === 0) return "";

  const lines = memories.map((m, i) => {
    const conf = m.confidence >= 0.9 ? "" : ` [confidence: ${Math.round(m.confidence * 100)}%]`;
    return `  ${i + 1}. [${m.category}] ${m.content}${conf}`;
  });

  return `AGENT MEMORY (Personalized Knowledge About This User):\n${lines.join("\n")}`;
}
