import { AgentMemoryCandidate, ConversationState } from "../../types";
import { generateAIResponse } from "../gemini";

// ─── Pre-filter: skip extraction for messages that won't contain memories ──

const SKIP_PATTERNS = [
  /^(hi|hello|hey|thanks|thank you|ok|okay|sure|yes|no|bye|good morning|good night)/i,
  /^(show|list|display|what is|what are|how much|how many|check|view|open)/i,
  /^(help|menu|commands|options)/i,
  /^\d+(\.\d+)?$/,   // bare numbers
];

const MEMORY_TRIGGER_PATTERNS = [
  /\b(my|i|i'm|i am|i have|i get|i earn|i spend|i pay|i always|i usually|i prefer|i like|i want|i need)\b/i,
  /\b(salary|income|rent|job|work|school|college|university)\b/i,
  /\b(remember|don't forget|keep in mind|note that|from now on|always|never|every month|every week)\b/i,
  /\b(prefer|favorite|usual|default|normal|regular)\b/i,
  /\b(born|birthday|age|live in|stay at|address|phone|email)\b/i,
];

/**
 * Cheap deterministic check: should we even bother asking the LLM to extract memories?
 */
export function isMemoryWorthy(message: string): boolean {
  const trimmed = message.trim();

  // Too short to contain meaningful durable info
  if (trimmed.length < 10) return false;

  // Matches a known skip pattern (greetings, queries, bare numbers)
  if (SKIP_PATTERNS.some(p => p.test(trimmed))) return false;

  // Must match at least one memory trigger pattern
  return MEMORY_TRIGGER_PATTERNS.some(p => p.test(trimmed));
}

/**
 * Extract memory candidates from a conversation turn.
 * Only called when `isMemoryWorthy` passes.
 */
export async function extractMemoryCandidates(
  userMessage: string,
  assistantResponse: string,
  _conversationState?: ConversationState
): Promise<AgentMemoryCandidate[]> {
  const extractionPrompt = `Analyze this conversation turn and extract ONLY durable personal facts, preferences, patterns, or rules about the USER.

USER MESSAGE:
"${userMessage}"

ASSISTANT RESPONSE:
"${assistantResponse}"

RULES:
1. Only extract information the USER explicitly stated or strongly implied about THEMSELVES.
2. Do NOT extract:
   - Greetings, questions, or casual remarks
   - Information about the world (generic facts)
   - Temporary/one-time context
   - Things the assistant said or inferred on its own
   - Financial balances or transaction amounts (these are live data, not memories)
   - Actions the user requested (these are commands, not facts)
3. Each extracted memory must be a concise, standalone statement.
4. Assign a confidence score (0.0–1.0):
   - 0.9–1.0: User explicitly stated a clear fact ("My salary is 60k")
   - 0.7–0.89: User strongly implied ("I get paid on the 1st" in context of salary discussion)
   - 0.5–0.69: Reasonable inference but somewhat ambiguous
   - Below 0.5: Too uncertain, do NOT include
5. Assign a category: "fact", "preference", "pattern", or "rule"
6. Assign relevant tags (lowercase, no spaces, use underscores).

Respond ONLY with a valid JSON array. If nothing is memory-worthy, respond with [].

Example output:
[
  {
    "category": "fact",
    "content": "User's salary is 60,000 BDT per month",
    "confidence": 0.95,
    "tags": ["salary", "income", "monthly"],
    "sourceText": "My salary is 60k"
  }
]`;

  try {
    const raw = await generateAIResponse(extractionPrompt,
      "You are a precise memory extraction engine. Output ONLY valid JSON arrays. Never add commentary.");

    // Parse the JSON from the response
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    // Validate and normalize each candidate
    return parsed
      .filter((c: any) =>
        c.content &&
        typeof c.content === "string" &&
        c.content.length > 3 &&
        typeof c.confidence === "number" &&
        c.confidence >= 0.5 &&
        ["fact", "preference", "pattern", "rule"].includes(c.category)
      )
      .map((c: any): AgentMemoryCandidate => ({
        category: c.category,
        content: c.content.trim(),
        confidence: Math.min(1, Math.max(0, c.confidence)),
        tags: Array.isArray(c.tags) ? c.tags.map((t: string) => String(t).toLowerCase().trim()) : [],
        sourceText: c.sourceText || undefined,
      }));
  } catch (err) {
    console.error("[MemoryExtractor] Extraction failed:", err);
    return [];
  }
}
