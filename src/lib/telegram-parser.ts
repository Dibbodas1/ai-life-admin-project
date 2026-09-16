import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export type ParsedAction =
  | "add_expense"
  | "add_income"
  | "check_balance"
  | "create_wallet"
  | "add_task"
  | "add_bill"
  | "show_expenses"
  | "add_to_goal"
  | "unknown";

export interface ParsedMessage {
  action: ParsedAction;
  // add_expense / add_income
  amount?: number;
  currency?: string;
  category?: string;
  description?: string;
  date?: string;
  // create_wallet
  walletName?: string;
  walletType?: "cash" | "bank" | "card" | "mfs" | "savings" | "other";
  walletBalance?: number;
  // add_task
  taskTitle?: string;
  taskDeadline?: string;
  taskPriority?: "high" | "medium" | "low";
  // add_bill
  billPayee?: string;
  billAmount?: number;
  billDueDate?: string;
  // show_expenses
  limit?: number;
  // add_to_goal
  goalName?: string;
  goalAmount?: number;
}

const PARSE_PROMPT = `You are a financial assistant AI for a personal finance app called "AI Life Admin".
Parse the user's Telegram message and extract the intent + data.
Return ONLY raw JSON — no markdown, no code blocks, no explanation.

Actions you understand:
- "add_expense": user spent money
- "add_income": user received money
- "check_balance": user wants to see balance
- "create_wallet": user wants to create a wallet/account
- "add_task": user wants to add a to-do or reminder
- "add_bill": user wants to track a bill payment due
- "show_expenses": user wants to see recent expenses
- "add_to_goal": user wants to contribute to a savings goal
- "unknown": none of the above

JSON Schema (use only the fields relevant to the action):
{
  "action": string,
  "amount": number,
  "currency": "BDT" (default if tk/taka/৳ mentioned or unspecified) | "USD" | "EUR",
  "category": string (food/transport/shopping/bills/entertainment/health/education/other),
  "description": string,
  "date": "YYYY-MM-DD" (use today if unspecified),
  "walletName": string,
  "walletType": "cash" | "bank" | "card" | "mfs" | "savings" | "other",
  "walletBalance": number (initial balance, default 0),
  "taskTitle": string,
  "taskDeadline": "YYYY-MM-DD" (optional),
  "taskPriority": "high" | "medium" | "low" (default "medium"),
  "billPayee": string,
  "billAmount": number,
  "billDueDate": "YYYY-MM-DD",
  "limit": number (default 5 for show_expenses),
  "goalName": string,
  "goalAmount": number
}

Wallet type heuristics:
- "bank", "account", any bank name (IBBL, BRAC, Dutch-Bangla, DBBL, EBL) → "bank"
- "bKash", "Nagad", "Rocket", "Upay", "MFS" → "mfs"
- "card", "credit", "debit" → "card"
- "cash", "pocket money" → "cash"
- "savings", "FDR" → "savings"

Today's date: {{TODAY}}

User message: "{{MESSAGE}}"`;

export async function parseTelegramMessage(
  message: string
): Promise<ParsedMessage> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
    const today = new Date().toISOString().split("T")[0];
    const prompt = PARSE_PROMPT.replace("{{TODAY}}", today).replace(
      "{{MESSAGE}}",
      message
    );

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    if (!text) return { action: "unknown" };

    const cleaned = text.replace(/```json?/g, "").replace(/```/g, "").trim();
    if (!cleaned) return { action: "unknown" };

    const parsed = JSON.parse(cleaned) as ParsedMessage;

    // Normalise dates — replace "today" string with real date
    const todayNormalise = (d?: string) =>
      !d || d === "today" ? today : d;
    parsed.date = todayNormalise(parsed.date);
    if (parsed.taskDeadline) parsed.taskDeadline = todayNormalise(parsed.taskDeadline);
    if (parsed.billDueDate) parsed.billDueDate = todayNormalise(parsed.billDueDate);

    return parsed;
  } catch (err) {
    console.error("Telegram message parse error:", err);
    return { action: "unknown" };
  }
}
