import { AgentMemoryCandidate, AgentMemoryEntry } from "../../types";

// ─── Deterministic Validation Rules ─────────────────────────────────────────

const REJECT_CONTENT_PATTERNS = [
  /^(hello|hi|hey|thanks|bye|ok|yes|no|sure)/i,
  /\b(password|secret|api.?key|token|credit.?card.?number|cvv|pin|otp)\b/i,
];

const MIN_CONTENT_LENGTH = 5;
const MIN_CONFIDENCE = 0.5;
const MAX_CONTENT_LENGTH = 500;

interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validate a single memory candidate using deterministic rules.
 * No LLM call needed here — pure logic.
 */
export function validateCandidate(
  candidate: AgentMemoryCandidate,
  existingMemories: AgentMemoryEntry[]
): ValidationResult {
  // 1. Content length check
  if (!candidate.content || candidate.content.trim().length < MIN_CONTENT_LENGTH) {
    return { valid: false, reason: "Content too short" };
  }

  if (candidate.content.length > MAX_CONTENT_LENGTH) {
    return { valid: false, reason: "Content too long — likely a transcript, not a memory" };
  }

  // 2. Confidence threshold
  if (candidate.confidence < MIN_CONFIDENCE) {
    return { valid: false, reason: `Confidence ${candidate.confidence} below threshold ${MIN_CONFIDENCE}` };
  }

  // 3. Sensitive data rejection
  for (const pattern of REJECT_CONTENT_PATTERNS) {
    if (pattern.test(candidate.content)) {
      return { valid: false, reason: "Contains sensitive/trivial content" };
    }
  }

  // 4. Category must be valid
  if (!["fact", "preference", "pattern", "rule"].includes(candidate.category)) {
    return { valid: false, reason: `Invalid category: ${candidate.category}` };
  }

  // 5. Check for exact duplicate content (case-insensitive)
  const normalizedContent = candidate.content.toLowerCase().trim();
  const exactDupe = existingMemories.find(
    m => m.status === "active" && m.content.toLowerCase().trim() === normalizedContent
  );
  if (exactDupe) {
    return { valid: false, reason: "Exact duplicate of existing active memory" };
  }

  return { valid: true };
}

/**
 * Validate a batch of memory candidates.
 * Returns only the valid candidates.
 */
export function validateCandidates(
  candidates: AgentMemoryCandidate[],
  existingMemories: AgentMemoryEntry[]
): AgentMemoryCandidate[] {
  return candidates.filter(candidate => {
    const result = validateCandidate(candidate, existingMemories);
    if (!result.valid) {
      console.log(`[MemoryValidator] Rejected: "${candidate.content.slice(0, 40)}..." — ${result.reason}`);
    }
    return result.valid;
  });
}
