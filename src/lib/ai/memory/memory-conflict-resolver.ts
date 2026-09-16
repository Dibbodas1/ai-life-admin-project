import { AgentMemoryEntry, AgentMemoryCandidate } from "../../types";
import { DeduplicationResult } from "./memory-deduplicator";

/**
 * Process deduplication results and apply conflict resolution to the memory bank.
 * 
 * Rules:
 * - New candidates: create fresh active memories
 * - Duplicates: skip (optionally bump confidence of existing)
 * - Updates: supersede old memory, create new active memory with link
 */
export function resolveConflictsAndMerge(
  existingMemories: AgentMemoryEntry[],
  dedupResult: DeduplicationResult
): {
  memoriesToAdd: AgentMemoryEntry[];
  memoriesToUpdate: Array<{ id: string; changes: Partial<AgentMemoryEntry> }>;
} {
  const now = new Date().toISOString();
  const memoriesToAdd: AgentMemoryEntry[] = [];
  const memoriesToUpdate: Array<{ id: string; changes: Partial<AgentMemoryEntry> }> = [];

  // 1. Handle new candidates — create fresh memories
  for (const candidate of dedupResult.newCandidates) {
    memoriesToAdd.push(candidateToMemory(candidate, now));
  }

  // 2. Handle duplicates — bump confidence if auto-confirmed
  for (const { existingId } of dedupResult.duplicates) {
    const existing = existingMemories.find(m => m._id === existingId);
    if (existing && existing.confidence < 1.0) {
      // Repeated statement increases confidence
      const newConfidence = Math.min(1.0, existing.confidence + 0.05);
      memoriesToUpdate.push({
        id: existingId,
        changes: {
          confidence: newConfidence,
          updatedAt: now,
        },
      });
    }
  }

  // 3. Handle updates — supersede old, create new with link
  for (const { candidate, existingId } of dedupResult.updates) {
    // Supersede the old memory
    memoriesToUpdate.push({
      id: existingId,
      changes: {
        status: "superseded",
        updatedAt: now,
      },
    });

    // Create the new memory with a link to the superseded one
    const newMemory = candidateToMemory(candidate, now);
    newMemory.relatedMemoryIds = [existingId];

    // Inherit usage history for continuity
    const oldMemory = existingMemories.find(m => m._id === existingId);
    if (oldMemory) {
      // Carry forward some confidence if the old memory was well-established
      if (oldMemory.confidence > 0.8 && oldMemory.usageCount > 3) {
        newMemory.confidence = Math.max(newMemory.confidence, 0.85);
      }
    }

    memoriesToAdd.push(newMemory);
  }

  return { memoriesToAdd, memoriesToUpdate };
}

/**
 * Apply resolved changes directly to the memory array (mutates in place).
 * Returns the updated array.
 */
export function applyMemoryChanges(
  memories: AgentMemoryEntry[],
  memoriesToAdd: AgentMemoryEntry[],
  memoriesToUpdate: Array<{ id: string; changes: Partial<AgentMemoryEntry> }>
): AgentMemoryEntry[] {
  // Apply updates
  for (const { id, changes } of memoriesToUpdate) {
    const idx = memories.findIndex(m => m._id === id);
    if (idx !== -1) {
      memories[idx] = { ...memories[idx], ...changes };
    }
  }

  // Add new memories
  memories.push(...memoriesToAdd);

  return memories;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function candidateToMemory(candidate: AgentMemoryCandidate, now: string): AgentMemoryEntry {
  return {
    _id: crypto.randomUUID(),
    category: candidate.category,
    content: candidate.content,
    source: "auto",
    confidence: candidate.confidence,
    status: "active",
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
    tags: candidate.tags,
    evidence: candidate.sourceText
      ? { sourceText: candidate.sourceText }
      : undefined,
  };
}
