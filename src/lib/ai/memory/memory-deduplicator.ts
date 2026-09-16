import { AgentMemoryEntry, AgentMemoryCandidate } from "../../types";
import { generateAIResponse } from "../gemini";

/**
 * Result of deduplication: which candidates are new, which are duplicates,
 * and which are updates to existing memories.
 */
export interface DeduplicationResult {
  newCandidates: AgentMemoryCandidate[];
  duplicates: Array<{ candidate: AgentMemoryCandidate; existingId: string }>;
  updates: Array<{ candidate: AgentMemoryCandidate; existingId: string }>;
}

/**
 * Normalize text for comparison: lowercase, collapse whitespace, strip punctuation.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calculate a simple word-overlap similarity between two strings.
 * Returns 0–1.
 */
function wordOverlapSimilarity(a: string, b: string): number {
  const wordsA = new Set(normalize(a).split(" ").filter(w => w.length > 2));
  const wordsB = new Set(normalize(b).split(" ").filter(w => w.length > 2));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  const intersection = [...wordsA].filter(w => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.length / union.size; // Jaccard similarity
}

/**
 * Find existing memories that are semantically similar to a candidate.
 */
function findSimilarMemories(
  candidate: AgentMemoryCandidate,
  existingMemories: AgentMemoryEntry[],
  threshold: number = 0.55
): AgentMemoryEntry[] {
  return existingMemories.filter(existing => {
    if (existing.status !== "active") return false;

    // Check word overlap
    const similarity = wordOverlapSimilarity(candidate.content, existing.content);
    if (similarity >= threshold) return true;

    // Check tag overlap (at least 2 shared tags AND same category)
    if (candidate.category === existing.category) {
      const sharedTags = candidate.tags.filter(t => existing.tags.includes(t));
      if (sharedTags.length >= 2) {
        // If tags match strongly, do a softer content check
        return similarity >= 0.3;
      }
    }

    return false;
  });
}

/**
 * For ambiguous cases, use LLM to determine if two memories are about the same fact.
 */
async function llmAreSameFact(contentA: string, contentB: string): Promise<"same" | "update" | "different"> {
  const prompt = `Are these two statements about the SAME underlying personal fact?

Statement A: "${contentA}"
Statement B: "${contentB}"

Answer with EXACTLY one word:
- "same" if they express the same fact with the same value
- "update" if they are about the same topic but the value/detail has changed
- "different" if they are about different topics

Answer:`;

  try {
    const result = await generateAIResponse(prompt,
      "You are a semantic comparison engine. Respond with exactly one word: same, update, or different.");
    const answer = result.trim().toLowerCase();
    if (answer.includes("same")) return "same";
    if (answer.includes("update")) return "update";
    return "different";
  } catch {
    // Fallback: treat as different to avoid data loss
    return "different";
  }
}

/**
 * Deduplicate memory candidates against existing memories.
 * 
 * Returns:
 * - newCandidates: truly novel memories to create
 * - duplicates: candidates that already exist (skip)
 * - updates: candidates that update existing memories (handle via conflict resolver)
 */
export async function deduplicateMemories(
  existing: AgentMemoryEntry[],
  candidates: AgentMemoryCandidate[]
): Promise<DeduplicationResult> {
  const result: DeduplicationResult = {
    newCandidates: [],
    duplicates: [],
    updates: [],
  };

  for (const candidate of candidates) {
    // 1. Exact match check (fast path)
    const exactMatch = existing.find(
      e => e.status === "active" && normalize(e.content) === normalize(candidate.content)
    );
    if (exactMatch) {
      result.duplicates.push({ candidate, existingId: exactMatch._id });
      continue;
    }

    // 2. Similarity-based check
    const similar = findSimilarMemories(candidate, existing);

    if (similar.length === 0) {
      result.newCandidates.push(candidate);
      continue;
    }

    // 3. For the most similar match, determine relationship
    // Sort by similarity score descending
    const bestMatch = similar.sort((a, b) =>
      wordOverlapSimilarity(candidate.content, b.content) -
      wordOverlapSimilarity(candidate.content, a.content)
    )[0];

    const similarity = wordOverlapSimilarity(candidate.content, bestMatch.content);

    if (similarity > 0.85) {
      // Very high overlap — almost certainly a duplicate
      result.duplicates.push({ candidate, existingId: bestMatch._id });
    } else if (similarity > 0.55) {
      // Moderate overlap — could be an update. Ask LLM.
      try {
        const relationship = await llmAreSameFact(bestMatch.content, candidate.content);
        if (relationship === "same") {
          result.duplicates.push({ candidate, existingId: bestMatch._id });
        } else if (relationship === "update") {
          result.updates.push({ candidate, existingId: bestMatch._id });
        } else {
          result.newCandidates.push(candidate);
        }
      } catch {
        // Fallback: treat as new to avoid losing information
        result.newCandidates.push(candidate);
      }
    } else {
      result.newCandidates.push(candidate);
    }
  }

  return result;
}
