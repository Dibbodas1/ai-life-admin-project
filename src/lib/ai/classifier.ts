import { generateJSON } from "./gemini";

const DEFAULT_CATEGORIES = [
  "Housing", "Food", "Transport", "Utilities", "Shopping",
  "Entertainment", "Health", "Education", "Travel",
  "Subscriptions", "Personal", "Other"
];

interface ClassificationResult {
  category: string;
  confidence: number;
  reasoning: string;
}

export async function classifyExpense(
  merchant: string,
  amount: number,
  notes?: string,
  userCategories?: string[]
): Promise<ClassificationResult> {
  const categories = userCategories?.length ? userCategories : DEFAULT_CATEGORIES;
  
  const prompt = `Classify this expense into one of these categories: ${categories.join(", ")}

Expense details:
- Merchant: ${merchant}
- Amount: $${amount}
${notes ? `- Notes: ${notes}` : ""}

Return JSON with: { "category": "string", "confidence": number (0-1), "reasoning": "brief explanation" }`;

  try {
    return await generateJSON<ClassificationResult>(prompt,
      "You are an expense categorization engine. Classify expenses accurately based on merchant name, amount, and context. Be precise with your confidence scores."
    );
  } catch {
    return { category: "Other", confidence: 0.5, reasoning: "Could not classify automatically" };
  }
}
