import { DriveAppData, AgentMemoryEntry, ConversationState } from "../types";

export interface FinancialContext {
  currentAvailable: number;
  totalIncome: number;
  totalExpenses: number;
  expectedIncome: number;
  upcomingCommitments: number;
  currentMonthSpend: number;
  recurringMonthly: number;
  activeGoals: Array<{ name: string; target: number; current: number; deadline: string }>;
  upcomingBills: Array<{ name: string; amount: number; dueDate: string; daysUntil: number }>;
  recentLargeExpenses: Array<{ merchant: string; amount: number; date: string; category: string }>;
  categorySpending: Record<string, number>;
  budgets: Array<{ category: string; budgeted: number; spent: number; remaining: number }>;
  importantDeadlines: Array<{ title: string; deadline: string; daysUntil: number }>;
  subscriptionTotal: number;
  overdueTasks: number;
  activeLoansAndDebts: Array<{ personName: string; type: "lent" | "borrowed"; amount: number; status: string; dueDate?: string }>;
  totalOwedToYou: number;
  totalYouOwe: number;
  wallets: Array<{ name: string; type: string; balance: number; isDefault?: boolean }>;
  totalWalletLiquidity: number;
  walletBreakdown: Record<string, number>;
  recentTransfers: Array<{ from: string; to: string; amount: number; date: string }>;
  upcomingMonthlyPlans: Array<{ title: string; amount: number; dueDate: string; category: string; priority: string; status: string; walletName?: string }>;
  totalPlannedUpcoming: number;
  agentMemory: AgentMemoryEntry[];
  conversationState?: ConversationState;
}

export async function buildFinancialContext(data: DriveAppData): Promise<FinancialContext> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const next14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  // Income & Expenses
  const allIncome = data.income;
  const allExpenses = data.expenses;
  
  const totalIncome = allIncome.reduce((sum, inc) => sum + inc.amount, 0);
  const totalExpenses = allExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const currentAvailable = Math.max(0, totalIncome - totalExpenses);

  const currentMonthExpenses = allExpenses.filter(e => new Date(e.date) >= startOfMonth);
  const currentMonthSpend = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Categories
  const categorySpending: Record<string, number> = {};
  currentMonthExpenses.forEach(exp => {
    categorySpending[exp.category] = (categorySpending[exp.category] || 0) + exp.amount;
  });

  // Subscriptions & Bills
  const activeSubs = data.subscriptions.filter(s => s.status === "active");
  const recurringMonthly = activeSubs.reduce((sum, sub) => {
    return sum + (sub.billingCycle === "annual" ? sub.amount / 12 : sub.amount);
  }, 0);

  const upcomingBills = data.bills
    .filter(b => b.status !== "paid" && new Date(b.dueDate) >= now && new Date(b.dueDate) <= next14Days)
    .map(b => ({
      name: b.payee,
      amount: b.amount,
      dueDate: b.dueDate as string,
      daysUntil: Math.ceil((new Date(b.dueDate).getTime() - now.getTime()) / 86400000)
    }));

  const upcomingSubs = activeSubs
    .filter(s => new Date(s.nextBillingDate) >= now && new Date(s.nextBillingDate) <= next14Days);

  const upcomingCommitments = upcomingBills.reduce((s, b) => s + b.amount, 0) + 
                             upcomingSubs.reduce((s, sub) => s + sub.amount, 0);

  // Goals
  const activeGoals = data.financialGoals
    .filter(g => g.status === "active")
    .map(g => ({
      name: g.name,
      target: g.targetAmount,
      current: g.currentAmount,
      deadline: g.deadline as string
    }));

  // Tasks
  const overdueTasks = data.lifeAdminTasks.filter(t => t.status === "overdue").length;
  const importantDeadlines = data.lifeAdminTasks
    .filter(t => t.status !== "completed" && t.deadline && new Date(t.deadline) >= now && new Date(t.deadline) <= next14Days)
    .map(t => ({
      title: t.title,
      deadline: t.deadline as string,
      daysUntil: Math.ceil((new Date(t.deadline as string).getTime() - now.getTime()) / 86400000)
    }));

  // Budgets
  const budgets = data.budgets.map(b => {
    const spent = categorySpending[b.category] || 0;
    const budgetedAmount = b.amount || (b as any).budget || 0; // Fallback in case AI guessed 'budget'
    return {
      category: b.category || "Unknown",
      budgeted: budgetedAmount,
      spent,
      remaining: budgetedAmount - spent
    };
  });

  // Recent large expenses (>$100)
  const recentLargeExpenses = allExpenses
    .filter(e => e.amount > 100)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
    .map(e => ({
      merchant: e.merchant,
      amount: e.amount,
      date: e.date as string,
      category: e.category
    }));

  // Loans & Debts
  const activeLoans = (data.loans || []).filter(l => l.status === "active" && l.amount > 0);
  const totalOwedToYou = activeLoans
    .filter(l => l.type === "lent")
    .reduce((sum, l) => sum + l.amount, 0);
  const totalYouOwe = activeLoans
    .filter(l => l.type === "borrowed")
    .reduce((sum, l) => sum + l.amount, 0);
  const activeLoansAndDebts = activeLoans.map(l => ({
    personName: l.personName,
    type: l.type,
    amount: l.amount,
    status: l.status,
    dueDate: l.dueDate ? String(l.dueDate) : undefined
  }));

  // Wallets & Transfers
  const walletsList = data.wallets || [];
  const totalWalletLiquidity = walletsList.reduce((sum, w) => sum + (Number(w.balance) || 0), 0);
  const walletBreakdown: Record<string, number> = {};
  walletsList.forEach(w => {
    walletBreakdown[w.type] = (walletBreakdown[w.type] || 0) + (Number(w.balance) || 0);
  });
  const wallets = walletsList.map(w => ({
    name: w.name,
    type: w.type,
    balance: Number(w.balance) || 0,
    isDefault: w.isDefault
  }));
  const recentTransfers = (data.walletTransfers || [])
    .slice(-5)
    .reverse()
    .map(t => ({
      from: t.fromWalletName,
      to: t.toWalletName,
      amount: t.amount,
      date: String(t.date)
    }));

  return {
    currentAvailable,
    totalIncome,
    totalExpenses,
    expectedIncome: 0, // Placeholder
    upcomingCommitments,
    currentMonthSpend,
    recurringMonthly,
    activeGoals,
    upcomingBills,
    recentLargeExpenses,
    categorySpending,
    budgets,
    importantDeadlines,
    subscriptionTotal: activeSubs.length,
    overdueTasks,
    activeLoansAndDebts,
    totalOwedToYou,
    totalYouOwe,
    wallets,
    totalWalletLiquidity,
    walletBreakdown,
    recentTransfers,
    upcomingMonthlyPlans: (data.monthlyPlans || [])
      .filter(p => p.status === "planned")
      .map(p => ({
        title: p.title,
        amount: Number(p.amount) || 0,
        dueDate: p.dueDate,
        category: p.category || "General",
        priority: p.priority || "medium",
        status: p.status,
        walletName: p.walletName,
      })),
    totalPlannedUpcoming: (data.monthlyPlans || [])
      .filter(p => p.status === "planned")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    agentMemory: (data.agentMemory || []),
  };
}
