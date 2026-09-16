import { isMemoryWorthy } from "./src/lib/ai/memory/memory-extractor";
import { validateCandidates, validateCandidate } from "./src/lib/ai/memory/memory-validator";
import { deduplicateMemories } from "./src/lib/ai/memory/memory-deduplicator";
import { resolveConflictsAndMerge, applyMemoryChanges } from "./src/lib/ai/memory/memory-conflict-resolver";
import { retrieveRelevantMemories, formatMemoriesForPrompt } from "./src/lib/ai/memory/memory-retriever";
import { createConversationState, updateConversationState, formatConversationStateForPrompt } from "./src/lib/ai/conversation/conversation-state";
import { resolveEntities } from "./src/lib/ai/conversation/entity-resolver";
import { AgentMemoryEntry, AgentMemoryCandidate, ConversationState } from "./src/lib/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

async function runUnitTests() {
  console.log("=================================================");
  console.log("🧪 RUNNING AGENT MEMORY & CONVERSATION UNIT TESTS");
  console.log("=================================================\n");

  // ─── 1. Memory Worthiness Filter ───
  console.log("--- 1. Testing Memory Worthiness ---");
  assert(!isMemoryWorthy("hi"), "Greeting 'hi' is not memory-worthy");
  assert(!isMemoryWorthy("hello how are you?"), "Greeting question is not memory-worthy");
  assert(!isMemoryWorthy("thanks"), "Thanks is not memory-worthy");
  assert(!isMemoryWorthy("ok"), "Single word 'ok' is not memory-worthy");
  assert(isMemoryWorthy("My salary is 85,000 BDT paid into BRAC Bank"), "Salary statement is memory-worthy");
  assert(isMemoryWorthy("I prefer using bKash for small grocery purchases"), "Preference statement is memory-worthy");
  assert(isMemoryWorthy("Never touch my emergency fund without confirmation"), "Rule statement is memory-worthy");
  assert(isMemoryWorthy("I pay house rent 15000 tk on the 28th of every month"), "Recurring pattern is memory-worthy");

  // ─── 2. Validation & Sensitive Data Rejection ───
  console.log("\n--- 2. Testing Memory Validation ---");
  const sensitiveCheck1 = validateCandidate({ category: "fact", content: "My password is secret123", confidence: 0.9, tags: [] }, []);
  assert(!sensitiveCheck1.valid, "Password rejected as sensitive");

  const sensitiveCheck2 = validateCandidate({ category: "fact", content: "Here is my bank pin: 4421", confidence: 0.9, tags: [] }, []);
  assert(!sensitiveCheck2.valid, "PIN rejected as sensitive");

  const normalCheck = validateCandidate({ category: "fact", content: "User pays 15000 BDT for rent", confidence: 0.9, tags: [] }, []);
  assert(normalCheck.valid, "Normal rent info is valid");

  const candidates: AgentMemoryCandidate[] = [
    { category: "preference", content: "User prefers bKash for grocery shopping", confidence: 0.9, tags: ["bkash", "grocery"] },
    { category: "fact", content: "123", confidence: 0.9, tags: [] }, // Invalid: too short (<5 chars)
    { category: "rule", content: "Never clear data without confirmation", confidence: 0.4, tags: [] }, // Invalid: low confidence
    { category: "fact", content: "User bank PIN is 1234", confidence: 0.9, tags: [] }, // Invalid: sensitive
  ];

  const existing: AgentMemoryEntry[] = [];
  const validated = validateCandidates(candidates, existing);
  assert(validated.length === 1, `Expected 1 valid candidate, got ${validated.length}`);
  assert(validated[0].content === "User prefers bKash for grocery shopping", "Correct candidate preserved");

  // ─── 3. Deduplication & Conflict Resolution ───
  console.log("\n--- 3. Testing Deduplication & Merge ---");
  const existingMemories: AgentMemoryEntry[] = [
    {
      _id: "mem_1",
      category: "preference",
      content: "User prefers paying electricity bills via bKash",
      source: "auto",
      confidence: 0.8,
      status: "active",
      usageCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ["bkash", "electricity"]
    }
  ];

  // Exact duplicate test (should bump confidence)
  const dupCandidate: AgentMemoryCandidate = {
    category: "preference",
    content: "User prefers paying electricity bills via bKash",
    confidence: 0.85,
    tags: ["bkash", "electricity"]
  };

  const dedupExact = await deduplicateMemories(existingMemories, [dupCandidate]);
  assert(dedupExact.duplicates.length === 1, "Detected exact duplicate");

  const mergeDup = resolveConflictsAndMerge(existingMemories, dedupExact);
  assert(mergeDup.memoriesToUpdate.length === 1, "Duplicate turned into confidence boost update");
  assert((mergeDup.memoriesToUpdate[0].changes.confidence || 0) > 0.8, "Confidence boosted above 0.8");

  // New memory candidate
  const newCandidate: AgentMemoryCandidate = {
    category: "fact",
    content: "User cousin Tanvir owes 2500 taka",
    confidence: 0.9,
    tags: ["tanvir", "loan"]
  };
  const dedupNew = await deduplicateMemories(existingMemories, [newCandidate]);
  assert(dedupNew.newCandidates.length === 1, "Detected brand new memory");

  const mergeNew = resolveConflictsAndMerge(existingMemories, dedupNew);
  assert(mergeNew.memoriesToAdd.length === 1, "New memory prepared for addition");

  // Apply changes to database array
  applyMemoryChanges(existingMemories, mergeNew.memoriesToAdd, mergeDup.memoriesToUpdate);
  assert(existingMemories.length === 2, `Expected 2 memories in db, got ${existingMemories.length}`);
  assert(existingMemories[0].confidence > 0.8, "Confidence updated on existing memory");

  // ─── 4. Retrieval & Prompt Formatting ───
  console.log("\n--- 4. Testing Retrieval & Prompt Formatting ---");
  const retrieved = retrieveRelevantMemories(existingMemories, "How much money does Tanvir owe me?");
  assert(retrieved.length > 0, "Retrieved memory relevant to 'Tanvir'");
  assert(retrieved[0].content.includes("Tanvir"), "Tanvir memory retrieved at top rank");

  const formattedPrompt = formatMemoriesForPrompt(retrieved);
  assert(formattedPrompt.includes("AGENT MEMORY"), "Formatted prompt contains memory section");
  assert(formattedPrompt.includes("Tanvir"), "Formatted prompt contains Tanvir memory");

  // ─── 5. Conversation State Tracking ───
  console.log("\n--- 5. Testing Conversation State Tracking ---");
  let convState = createConversationState();
  assert(convState.turnCount === 0, "Initial turnCount is 0");

  convState = updateConversationState(convState, "How much is in my bKash account?", "You currently have 15,000 tk in your bKash wallet.");
  assert(convState.turnCount === 1, "Turn count incremented to 1");
  assert(convState.activeTopic === "wallet", `Active topic is wallet, got ${convState.activeTopic}`);
  assert(convState.lastEntities.walletName?.toLowerCase() === "bkash", "Last referenced entity is bKash");

  const statePrompt = formatConversationStateForPrompt(convState);
  assert(statePrompt.includes("Current topic: wallet"), "Conversation prompt contains active topic");
  assert(statePrompt.includes("bKash"), "Conversation prompt contains entity bKash");

  // ─── 6. Pronoun & Entity Resolution ───
  console.log("\n--- 6. Testing Pronoun & Entity Resolution ---");
  // Turn 2 follow-up: "now add 500 tk in it"
  const resolved = resolveEntities("now add 500 tk in it", convState, [], existingMemories, ["bKash"], []);
  assert(resolved.resolved, "Pronoun 'it' successfully resolved");
  assert(resolved.resolvedEntity?.name.toLowerCase() === "bkash", `Pronoun 'it' resolved to bKash, got ${resolved.resolvedEntity?.name}`);
  assert(!resolved.ambiguous, "Pronoun resolution is unambiguous");

  // Test Person pronoun resolution in loan context: "how much does he owe me?"
  let loanState = createConversationState();
  loanState = updateConversationState(loanState, "Tanvir borrowed 2500 tk from me", "Recorded that Tanvir owes you 2,500 tk.");
  const resolvedPerson = resolveEntities("how much does he owe me?", loanState, [], existingMemories, [], ["Tanvir"]);
  assert(resolvedPerson.resolved, "Pronoun 'he' resolved to loan person");
  assert(resolvedPerson.resolvedEntity?.name.toLowerCase() === "tanvir", `Pronoun 'he' resolved to Tanvir, got ${resolvedPerson.resolvedEntity?.name}`);

  console.log("\n=================================================");
  console.log("🎉 ALL 18 UNIT & INTEGRATION ASSERTIONS PASSED!");
  console.log("=================================================");
}

runUnitTests().catch(console.error);
