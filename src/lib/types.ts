// Plain TS Interfaces for the app (replacing Mongoose models)

export interface User {
  _id: string;
  name: string;
  email: string;
  image?: string;
  currency: string;
  preferences: {
    budgetingStyle: "monthly" | "weekly";
    reminderDays: number;
    theme: "dark" | "light";
  };
}

export interface Expense {
  _id: string;
  userId: string;
  merchant: string;
  amount: number;
  date: string | Date;
  category: string;
  isRecurring: boolean;
  walletId?: string;
  walletName?: string;
  notes?: string;
  aiCategorized: boolean;
  aiConfidence?: number;
}

export interface Income {
  _id: string;
  userId: string;
  source: string;
  amount: number;
  date: string | Date;
  category: string;
  isRecurring: boolean;
  walletId?: string;
  walletName?: string;
  notes?: string;
}

export interface Category {
  _id: string;
  userId: string;
  name: string;
  type: "expense" | "income";
  color: string;
  icon: string;
}

export interface Budget {
  _id: string;
  userId: string;
  category: string;
  amount: number;
  period: "monthly" | "weekly";
}

export interface Subscription {
  _id: string;
  userId: string;
  name: string;
  amount: number;
  billingCycle: "monthly" | "annual" | "quarterly" | "weekly";
  nextBillingDate: string | Date;
  category: string;
  usageLevel: "high" | "medium" | "low" | "none";
  status: "active" | "cancelled" | "paused";
  previousAmount?: number;
}

export interface Bill {
  _id: string;
  userId: string;
  payee: string;
  amount: number;
  dueDate: string | Date;
  category: string;
  isAutoPay: boolean;
  status: "pending" | "paid" | "overdue";
}

export interface FinancialGoal {
  _id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | Date;
  monthlyContribution: number;
  priority: "high" | "medium" | "low";
  status: "active" | "completed" | "paused";
  icon?: string;
}

export interface LifeAdminTask {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  category: string;
  priority: "high" | "medium" | "low";
  deadline?: string | Date;
  status: "pending" | "in_progress" | "completed" | "overdue";
  relatedTo?: {
    model: string;
    id: string;
  };
}

export interface DocumentModel {
  _id: string;
  userId: string;
  name: string;
  type: "receipt" | "contract" | "tax" | "id" | "other";
  url: string;
  extractedData?: any;
  aiSummary?: string;
  tags: string[];
}

export interface Insight {
  _id: string;
  userId: string;
  type: "spending_spike" | "subscription_warning" | "goal_milestone" | "budget_alert" | "general_advice";
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  actionable: boolean;
  relatedEntities: Array<{ model: string; id: string }>;
  createdAt: string | Date;
}

export interface Alert {
  _id: string;
  userId: string;
  type: "bill_due" | "subscription_renewal" | "task_deadline" | "budget_exceeded";
  title: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  read: boolean;
  actionUrl?: string;
  createdAt: string | Date;
}

export interface LoanDebtTransaction {
  _id: string;
  amount: number;
  type: "lent" | "borrowed" | "repayment";
  date: string | Date;
  notes?: string;
}

export interface LoanDebt {
  _id: string;
  userId: string;
  personName: string;
  type: "lent" | "borrowed"; // "lent" = they owe you, "borrowed" = you owe them
  amount: number; // outstanding balance
  status: "active" | "settled";
  dueDate?: string | Date;
  notes?: string;
  createdAt: string | Date;
  history: LoanDebtTransaction[];
}

export interface Wallet {
  _id: string;
  userId: string;
  name: string; // e.g. "Main Cash", "BRAC Bank", "bKash"
  type: "cash" | "bank" | "card" | "mfs" | "savings" | "other";
  balance: number;
  currency?: string; // default "BDT" or "USD"
  color?: string;
  icon?: string;
  accountNumber?: string;
  isDefault?: boolean;
  createdAt: string | Date;
}

export interface WalletTransfer {
  _id: string;
  userId: string;
  fromWalletId: string;
  toWalletId: string;
  fromWalletName: string;
  toWalletName: string;
  amount: number;
  date: string | Date;
  notes?: string;
}

export interface PlannedExpense {
  _id: string;
  userId: string;
  title: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD or ISO string
  category: string;
  priority: "high" | "medium" | "low";
  status: "planned" | "paid" | "cancelled";
  walletId?: string;
  walletName?: string;
  notes?: string;
  createdAt: string;
  paidAt?: string;
  expenseId?: string;
}

// ─── Agent Memory System ───────────────────────────────────────────────────

export type AgentMemoryCategory = "fact" | "preference" | "pattern" | "rule";
export type AgentMemorySource = "auto" | "user";
export type AgentMemoryStatus = "active" | "superseded" | "rejected";

export interface AgentMemoryEntry {
  _id: string;
  category: AgentMemoryCategory;
  content: string;
  source: AgentMemorySource;
  confidence: number; // 0–1
  status: AgentMemoryStatus;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  tags: string[];
  evidence?: {
    conversationId?: string;
    messageId?: string;
    sourceText?: string;
  };
  relatedMemoryIds?: string[];
}

/** Candidate produced by the memory extractor before validation */
export interface AgentMemoryCandidate {
  category: AgentMemoryCategory;
  content: string;
  confidence: number;
  tags: string[];
  sourceText?: string;
}

// ─── Conversation State ────────────────────────────────────────────────────

export interface ConversationState {
  activeTopic?: string;

  lastEntities: {
    walletId?: string;
    walletName?: string;
    personName?: string;
    expenseCategory?: string;
    goalName?: string;
    planTitle?: string;
  };

  pendingAction?: {
    type: string;
    target?: string;
    parameters?: Record<string, unknown>;
  };

  lastToolResult?: {
    toolName: string;
    resultSummary?: string;
    timestamp: string;
  };

  turnCount: number;
  updatedAt: string;
}

// ─── Proactive Intelligence ────────────────────────────────────────────────

export type ProactiveLevel = "silent" | "suggest" | "notify" | "require_confirmation";

// Global App State in Google Drive
export interface DriveAppData {
  users: User[];
  expenses: Expense[];
  income: Income[];
  categories: Category[];
  budgets: Budget[];
  subscriptions: Subscription[];
  bills: Bill[];
  financialGoals: FinancialGoal[];
  lifeAdminTasks: LifeAdminTask[];
  documents: DocumentModel[];
  insights: Insight[];
  alerts: Alert[];
  loans: LoanDebt[];
  wallets: Wallet[];
  walletTransfers: WalletTransfer[];
  monthlyPlans: PlannedExpense[];
  agentMemory: AgentMemoryEntry[];
}
