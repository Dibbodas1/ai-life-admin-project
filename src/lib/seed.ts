import { DriveAppData, User, Expense, Income, Category, Budget, Subscription, Bill, FinancialGoal, LifeAdminTask, DocumentModel, Insight, Alert } from "./types";

const DEMO_USER_ID = "demo_user_alex";

const DEFAULT_CATEGORIES = [
  { name: "Housing", icon: "🏠", color: "#6366f1" },
  { name: "Food", icon: "🍔", color: "#f59e0b" },
  { name: "Transport", icon: "🚗", color: "#3b82f6" },
  { name: "Utilities", icon: "⚡", color: "#eab308" },
  { name: "Shopping", icon: "🛍️", color: "#ec4899" },
  { name: "Entertainment", icon: "🎬", color: "#8b5cf6" },
  { name: "Health", icon: "💊", color: "#10b981" },
  { name: "Education", icon: "📚", color: "#06b6d4" },
  { name: "Travel", icon: "✈️", color: "#f97316" },
  { name: "Subscriptions", icon: "📱", color: "#a855f7" },
  { name: "Personal", icon: "👤", color: "#64748b" },
  { name: "Other", icon: "📦", color: "#94a3b8" },
];

const MERCHANTS: Record<string, string[]> = {
  Housing: ["Rent Payment", "Home Depot", "IKEA"],
  Food: ["Whole Foods", "Trader Joe's", "Chipotle", "Starbucks", "DoorDash", "McDonald's", "Panera Bread", "Pizza Hut", "Subway", "Local Grocery"],
  Transport: ["Uber", "Lyft", "Shell Gas", "Chevron", "Parking", "Metro Pass"],
  Utilities: ["Electric Company", "Water Utility", "Gas Company"],
  Shopping: ["Amazon", "Target", "Best Buy", "Nike", "Zara", "Etsy"],
  Entertainment: ["AMC Theaters", "Steam", "PlayStation Store", "Concert Tickets", "Barnes & Noble"],
  Health: ["CVS Pharmacy", "Gym Membership", "Doctor Visit", "Dental Checkup"],
  Education: ["Udemy", "Coursera", "Book Store"],
  Travel: ["Delta Airlines", "Airbnb", "Hilton Hotel"],
  Subscriptions: ["Netflix", "Spotify", "Adobe", "iCloud", "GitHub"],
  Personal: ["Haircut", "Dry Cleaning", "Gift Shop"],
};

function randomBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Generate coherent 12-month transaction history
function generateExpenses(): Array<{
  userId: string; amount: number; merchant: string;
  category: string; date: Date; isRecurring: boolean;
  notes: string; aiCategorized: boolean; aiConfidence: number;
}> {
  const expenses: ReturnType<typeof generateExpenses> = [];
  const now = new Date();

  for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
    const year = now.getFullYear();
    const month = now.getMonth() - monthOffset;
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const isCurrentMonth = monthOffset === 0;
    const daysInMonth = isCurrentMonth ? now.getDate() : monthEnd.getDate();

    // Fixed monthly expenses
    expenses.push({
      userId: DEMO_USER_ID, amount: 1200, merchant: "Rent Payment",
      category: "Housing", date: new Date(year, month, 1),
      isRecurring: true, notes: "Monthly rent", aiCategorized: true, aiConfidence: 0.99,
    });

    // Utilities (slight seasonal variation for Pattern C: electricity rises in summer)
    const summerMultiplier = [5, 6, 7].includes((month + 12) % 12) ? 1.4 : 1;
    expenses.push({
      userId: DEMO_USER_ID, amount: Math.round(72 * summerMultiplier + randomBetween(-8, 12)),
      merchant: "Electric Company", category: "Utilities",
      date: new Date(year, month, 15), isRecurring: true,
      notes: "", aiCategorized: true, aiConfidence: 0.97,
    });
    expenses.push({
      userId: DEMO_USER_ID, amount: randomBetween(28, 38),
      merchant: "Water Utility", category: "Utilities",
      date: new Date(year, month, 18), isRecurring: true,
      notes: "", aiCategorized: true, aiConfidence: 0.96,
    });

    // Food: ~15-25 transactions per month, Pattern A: higher on weekends
    const foodCount = Math.floor(randomBetween(15, 25));
    for (let i = 0; i < foodCount; i++) {
      const day = Math.min(Math.floor(randomBetween(1, daysInMonth)), daysInMonth);
      const txDate = new Date(year, month, day);
      const isWeekend = txDate.getDay() === 0 || txDate.getDay() === 6;
      const baseAmount = isWeekend ? randomBetween(25, 65) : randomBetween(8, 35);
      // Pattern: dining spending gradually increases month over month
      const trendMultiplier = 1 + (11 - monthOffset) * 0.02;

      expenses.push({
        userId: DEMO_USER_ID,
        amount: Math.round(baseAmount * trendMultiplier * 100) / 100,
        merchant: pickRandom(MERCHANTS.Food),
        category: "Food", date: txDate, isRecurring: false,
        notes: "", aiCategorized: true, aiConfidence: 0.95,
      });
    }

    // Transport: Pattern F: user underestimates, ~8-12 per month
    const transportCount = Math.floor(randomBetween(8, 12));
    for (let i = 0; i < transportCount; i++) {
      const day = Math.min(Math.floor(randomBetween(1, daysInMonth)), daysInMonth);
      expenses.push({
        userId: DEMO_USER_ID,
        amount: randomBetween(8, 35),
        merchant: pickRandom(MERCHANTS.Transport),
        category: "Transport",
        date: new Date(year, month, day), isRecurring: false,
        notes: "", aiCategorized: true, aiConfidence: 0.94,
      });
    }

    // Shopping: 3-6 per month, occasional large purchase (Pattern D)
    const shoppingCount = Math.floor(randomBetween(3, 6));
    for (let i = 0; i < shoppingCount; i++) {
      const day = Math.min(Math.floor(randomBetween(1, daysInMonth)), daysInMonth);
      // Every ~3 months, one large purchase
      const isLarge = monthOffset % 3 === 0 && i === 0;
      expenses.push({
        userId: DEMO_USER_ID,
        amount: isLarge ? randomBetween(200, 450) : randomBetween(15, 80),
        merchant: pickRandom(MERCHANTS.Shopping),
        category: "Shopping",
        date: new Date(year, month, day), isRecurring: false,
        notes: isLarge ? "Large purchase" : "", aiCategorized: true, aiConfidence: 0.93,
      });
    }

    // Entertainment: 2-4 per month
    const entCount = Math.floor(randomBetween(2, 4));
    for (let i = 0; i < entCount; i++) {
      const day = Math.min(Math.floor(randomBetween(1, daysInMonth)), daysInMonth);
      expenses.push({
        userId: DEMO_USER_ID,
        amount: randomBetween(10, 50),
        merchant: pickRandom(MERCHANTS.Entertainment),
        category: "Entertainment",
        date: new Date(year, month, day), isRecurring: false,
        notes: "", aiCategorized: true, aiConfidence: 0.91,
      });
    }

    // Health: 1-2 per month
    if (Math.random() > 0.3) {
      const day = Math.min(Math.floor(randomBetween(1, daysInMonth)), daysInMonth);
      expenses.push({
        userId: DEMO_USER_ID,
        amount: randomBetween(15, 120),
        merchant: pickRandom(MERCHANTS.Health),
        category: "Health",
        date: new Date(year, month, day), isRecurring: false,
        notes: "", aiCategorized: true, aiConfidence: 0.88,
      });
    }

    // Personal: 1-3 per month
    const personalCount = Math.floor(randomBetween(1, 3));
    for (let i = 0; i < personalCount; i++) {
      const day = Math.min(Math.floor(randomBetween(1, daysInMonth)), daysInMonth);
      expenses.push({
        userId: DEMO_USER_ID,
        amount: randomBetween(12, 45),
        merchant: pickRandom(MERCHANTS.Personal),
        category: "Personal",
        date: new Date(year, month, day), isRecurring: false,
        notes: "", aiCategorized: true, aiConfidence: 0.87,
      });
    }

    // Add one anomalous expense in the current month (Section 102)
    if (isCurrentMonth) {
      expenses.push({
        userId: DEMO_USER_ID,
        amount: 720,
        merchant: "Best Buy",
        category: "Shopping",
        date: new Date(year, month, Math.max(1, now.getDate() - 3)),
        isRecurring: false,
        notes: "New monitor",
        aiCategorized: true,
        aiConfidence: 0.96,
      });
    }
  }

  return expenses;
}

function generateIncome() {
  const records = [];
  const now = new Date();

  for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
    const year = now.getFullYear();
    const month = now.getMonth() - monthOffset;

    // Primary salary
    records.push({
      userId: DEMO_USER_ID, source: "TechCorp Inc.", amount: 3200,
      date: new Date(year, month, 15), type: "salary" as const,
      isRecurring: true, cycle: "monthly" as const, notes: "Monthly salary",
    });

    // Freelance income (irregular)
    if (Math.random() > 0.4) {
      records.push({
        userId: DEMO_USER_ID, source: "Freelance Projects", amount: randomBetween(400, 800),
        date: new Date(year, month, Math.floor(randomBetween(20, 28))),
        type: "freelance" as const, isRecurring: false, notes: "Side project work",
      });
    }
  }

  return records;
}

function generateSubscriptions() {
  const now = new Date();
  return [
    { userId: DEMO_USER_ID, name: "Netflix", amount: 15.99, billingCycle: "monthly" as const, nextBillingDate: new Date(now.getFullYear(), now.getMonth(), 20), category: "Entertainment", usageLevel: "low" as const, status: "active" as const, previousAmount: 12.99, startDate: new Date(now.getFullYear() - 1, 2, 1) },
    { userId: DEMO_USER_ID, name: "Spotify", amount: 10.99, billingCycle: "monthly" as const, nextBillingDate: new Date(now.getFullYear(), now.getMonth(), 12), category: "Entertainment", usageLevel: "high" as const, status: "active" as const, startDate: new Date(now.getFullYear() - 2, 5, 1) },
    { userId: DEMO_USER_ID, name: "Adobe Creative Cloud", amount: 35.00, billingCycle: "monthly" as const, nextBillingDate: new Date(now.getFullYear(), now.getMonth(), 5), category: "Subscriptions", usageLevel: "low" as const, status: "active" as const, startDate: new Date(now.getFullYear() - 1, 0, 1) },
    { userId: DEMO_USER_ID, name: "GitHub Pro", amount: 4.00, billingCycle: "monthly" as const, nextBillingDate: new Date(now.getFullYear(), now.getMonth(), 8), category: "Subscriptions", usageLevel: "high" as const, status: "active" as const, startDate: new Date(now.getFullYear() - 1, 6, 1) },
    { userId: DEMO_USER_ID, name: "iCloud Storage", amount: 2.99, billingCycle: "monthly" as const, nextBillingDate: new Date(now.getFullYear(), now.getMonth(), 3), category: "Subscriptions", usageLevel: "medium" as const, status: "active" as const, startDate: new Date(now.getFullYear() - 2, 0, 1) },
    { userId: DEMO_USER_ID, name: "Google One", amount: 9.99, billingCycle: "monthly" as const, nextBillingDate: new Date(now.getFullYear(), now.getMonth(), 17), category: "Subscriptions", usageLevel: "medium" as const, status: "active" as const, startDate: new Date(now.getFullYear() - 1, 3, 1) },
    { userId: DEMO_USER_ID, name: "ChatGPT Plus", amount: 20.00, billingCycle: "monthly" as const, nextBillingDate: new Date(now.getFullYear(), now.getMonth(), 22), category: "Subscriptions", usageLevel: "high" as const, status: "active" as const, startDate: new Date(now.getFullYear(), 0, 1) },
    { userId: DEMO_USER_ID, name: "Notion", amount: 8.00, billingCycle: "monthly" as const, nextBillingDate: new Date(now.getFullYear(), now.getMonth(), 25), category: "Subscriptions", usageLevel: "medium" as const, status: "active" as const, startDate: new Date(now.getFullYear() - 1, 8, 1) },
    { userId: DEMO_USER_ID, name: "Figma", amount: 12.00, billingCycle: "monthly" as const, nextBillingDate: new Date(now.getFullYear(), now.getMonth(), 10), category: "Subscriptions", usageLevel: "low" as const, status: "active" as const, startDate: new Date(now.getFullYear() - 1, 1, 1) },
    { userId: DEMO_USER_ID, name: "Gym Membership", amount: 39.99, billingCycle: "monthly" as const, nextBillingDate: new Date(now.getFullYear(), now.getMonth(), 1), category: "Health", usageLevel: "medium" as const, status: "active" as const, startDate: new Date(now.getFullYear() - 1, 0, 1) },
    { userId: DEMO_USER_ID, name: "Disney+", amount: 7.99, billingCycle: "monthly" as const, nextBillingDate: new Date(now.getFullYear(), now.getMonth(), 14), category: "Entertainment", usageLevel: "none" as const, status: "active" as const, startDate: new Date(now.getFullYear() - 1, 10, 1) },
    { userId: DEMO_USER_ID, name: "Medium", amount: 5.00, billingCycle: "monthly" as const, nextBillingDate: new Date(now.getFullYear(), now.getMonth(), 28), category: "Education", usageLevel: "low" as const, status: "active" as const, startDate: new Date(now.getFullYear(), 2, 1) },
  ];
}

function generateBills() {
  const now = new Date();
  return [
    { userId: DEMO_USER_ID, name: "Electricity", amount: 84, dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3), recurring: true, cycle: "monthly" as const, autoPay: false, status: "upcoming" as const, reminder: true },
    { userId: DEMO_USER_ID, name: "Internet", amount: 35, dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5), recurring: true, cycle: "monthly" as const, autoPay: true, status: "upcoming" as const, reminder: true },
    { userId: DEMO_USER_ID, name: "Phone", amount: 45, dueDate: new Date(now.getFullYear(), now.getMonth(), 20), recurring: true, cycle: "monthly" as const, autoPay: true, status: "upcoming" as const, reminder: true },
    { userId: DEMO_USER_ID, name: "Insurance", amount: 140, dueDate: new Date(now.getFullYear(), now.getMonth(), 25), recurring: true, cycle: "monthly" as const, autoPay: false, status: "upcoming" as const, reminder: true },
    { userId: DEMO_USER_ID, name: "Car Insurance", amount: 95, dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 1), recurring: true, cycle: "monthly" as const, autoPay: true, status: "upcoming" as const, reminder: true },
    { userId: DEMO_USER_ID, name: "Water", amount: 32, dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10), recurring: true, cycle: "monthly" as const, autoPay: false, status: "upcoming" as const, reminder: true },
    { userId: DEMO_USER_ID, name: "Gas", amount: 28, dueDate: new Date(now.getFullYear(), now.getMonth(), 22), recurring: true, cycle: "monthly" as const, autoPay: false, status: "upcoming" as const, reminder: true },
    { userId: DEMO_USER_ID, name: "Student Loan", amount: 180, dueDate: new Date(now.getFullYear(), now.getMonth(), 28), recurring: true, cycle: "monthly" as const, autoPay: true, status: "upcoming" as const, reminder: true },
  ];
}

function generateGoals() {
  const now = new Date();
  return [
    { userId: DEMO_USER_ID, name: "MacBook Pro", targetAmount: 1800, currentAmount: 720, deadline: new Date(now.getFullYear(), 11, 31), monthlyContribution: 270, priority: "high" as const, status: "active" as const, icon: "💻" },
    { userId: DEMO_USER_ID, name: "Emergency Fund", targetAmount: 5000, currentAmount: 2300, deadline: new Date(now.getFullYear() + 1, 5, 30), monthlyContribution: 200, priority: "high" as const, status: "active" as const, icon: "🛡️" },
    { userId: DEMO_USER_ID, name: "Japan Trip", targetAmount: 3500, currentAmount: 850, deadline: new Date(now.getFullYear() + 1, 3, 15), monthlyContribution: 350, priority: "medium" as const, status: "active" as const, icon: "🗾" },
  ];
}

function generateTasks() {
  const now = new Date();
  return [
    { userId: DEMO_USER_ID, title: "Renew passport", description: "Passport expires in 3 months", deadline: new Date(now.getFullYear(), now.getMonth() + 2, 14), status: "pending" as const, priority: "high" as const, category: "documents" },
    { userId: DEMO_USER_ID, title: "Review phone contract", description: "Contract renewal coming up", deadline: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 12), status: "pending" as const, priority: "medium" as const, category: "contracts" },
    { userId: DEMO_USER_ID, title: "File quarterly taxes", description: "Q3 freelance income taxes", deadline: new Date(now.getFullYear(), now.getMonth() + 1, 15), status: "pending" as const, priority: "high" as const, category: "finance" },
    { userId: DEMO_USER_ID, title: "Cancel unused gym class", description: "Haven't attended in 2 months", deadline: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5), status: "pending" as const, priority: "low" as const, category: "subscriptions" },
    { userId: DEMO_USER_ID, title: "Renew car registration", description: "Registration expires next month", deadline: new Date(now.getFullYear(), now.getMonth() + 1, 1), status: "in_progress" as const, priority: "high" as const, category: "documents" },
    { userId: DEMO_USER_ID, title: "Schedule dental checkup", description: "Due for 6-month checkup", deadline: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 20), status: "pending" as const, priority: "medium" as const, category: "health" },
    { userId: DEMO_USER_ID, title: "Update home insurance", description: "Annual review", deadline: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5), status: "pending" as const, priority: "high" as const, category: "insurance" },
    { userId: DEMO_USER_ID, title: "Organize tax documents", description: "Compile receipts and statements", deadline: new Date(now.getFullYear(), now.getMonth() + 3, 1), status: "pending" as const, priority: "low" as const, category: "finance" },
    { userId: DEMO_USER_ID, title: "Review electricity plan", description: "Compare providers for better rate", deadline: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2), status: "overdue" as const, priority: "medium" as const, category: "utilities" },
    { userId: DEMO_USER_ID, title: "Set up automatic savings", description: "Configure monthly auto-transfer", deadline: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7), status: "pending" as const, priority: "medium" as const, category: "finance" },
  ];
}

function generateDocuments() {
  const now = new Date();
  return [
    { userId: DEMO_USER_ID, name: "Internet Contract", type: "contract" as const, extractedData: { provider: "XYZ Telecom", amount: 35, renewalDate: `${now.getFullYear()}-12-31`, cancellationNotice: "30 days", obligations: ["Monthly payment", "12-month commitment"] } },
    { userId: DEMO_USER_ID, name: "Lease Agreement", type: "contract" as const, extractedData: { provider: "Sunset Apartments", amount: 1200, renewalDate: `${now.getFullYear() + 1}-03-01`, cancellationNotice: "60 days", obligations: ["Monthly rent", "Renter's insurance required"] } },
    { userId: DEMO_USER_ID, name: "Car Insurance Policy", type: "contract" as const, extractedData: { provider: "SafeGuard Insurance", amount: 95, renewalDate: `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}-15`, obligations: ["Monthly premium"] } },
    { userId: DEMO_USER_ID, name: "MacBook Pro Receipt", type: "receipt" as const, extractedData: { provider: "Apple Store", amount: 2499 } },
    { userId: DEMO_USER_ID, name: "Health Insurance Card", type: "other" as const, extractedData: { provider: "Blue Cross", expirationDate: `${now.getFullYear() + 1}-01-01` } },
    { userId: DEMO_USER_ID, name: "Electricity Bill Sept", type: "bill" as const, extractedData: { provider: "City Electric", amount: 84 } },
    { userId: DEMO_USER_ID, name: "Gym Membership Contract", type: "contract" as const, extractedData: { provider: "FitLife Gym", amount: 39.99, renewalDate: `${now.getFullYear()}-${String(now.getMonth() + 3).padStart(2, '0')}-01`, cancellationNotice: "14 days" } },
    { userId: DEMO_USER_ID, name: "Phone Warranty", type: "warranty" as const, extractedData: { provider: "Samsung", expirationDate: `${now.getFullYear() + 1}-06-15` } },
  ];
}

function generateAlerts() {
  const now = new Date();
  return [
    { userId: DEMO_USER_ID, type: "bill_due", severity: "high" as const, title: "Electricity bill due soon", message: "Your electricity bill of $84 is due in 3 days.", read: false },
    { userId: DEMO_USER_ID, type: "subscription", severity: "medium" as const, title: "Subscription costs increased", message: "Your total subscription spending increased 14% this month due to Netflix price change.", read: false },
    { userId: DEMO_USER_ID, type: "spending", severity: "low" as const, title: "Food spending on track", message: "You spent 11% less on food this month compared to your average. Great job!", read: false },
    { userId: DEMO_USER_ID, type: "commitment", severity: "high" as const, title: "Upcoming commitments", message: "You have $420 in recurring payments due in the next 7 days.", read: false },
    { userId: DEMO_USER_ID, type: "task", severity: "medium" as const, title: "Overdue task", message: "Review electricity plan was due 2 days ago.", read: false },
    { userId: DEMO_USER_ID, type: "anomaly", severity: "medium" as const, title: "Unusual purchase detected", message: "$720 at Best Buy — this is approximately 6× your recent electronics average.", read: false },
  ];
}

export function generateDemoData(): DriveAppData {
  const user: User = {
    _id: DEMO_USER_ID,
    name: "Alex Chen",
    email: "alex@demo.com",
    image: "",
    currency: "USD",
    preferences: { budgetingStyle: "monthly", reminderDays: 3, theme: "dark" },
  };

  const categories = DEFAULT_CATEGORIES.map((c) => ({ ...c, _id: crypto.randomUUID(), userId: DEMO_USER_ID, type: "expense" as const }));
  
  const budgets: Budget[] = [
    { _id: crypto.randomUUID(), userId: DEMO_USER_ID, category: "Food", amount: 400, period: "monthly" },
    { _id: crypto.randomUUID(), userId: DEMO_USER_ID, category: "Transport", amount: 200, period: "monthly" },
    { _id: crypto.randomUUID(), userId: DEMO_USER_ID, category: "Shopping", amount: 250, period: "monthly" },
    { _id: crypto.randomUUID(), userId: DEMO_USER_ID, category: "Entertainment", amount: 100, period: "monthly" },
    { _id: crypto.randomUUID(), userId: DEMO_USER_ID, category: "Personal", amount: 80, period: "monthly" },
  ];

  const addIds = (arr: any[]) => arr.map(item => ({ _id: crypto.randomUUID(), ...item }));

  return {
    users: [user],
    categories,
    expenses: addIds(generateExpenses()) as any,
    income: addIds(generateIncome()) as any,
    budgets,
    subscriptions: addIds(generateSubscriptions()) as any,
    bills: addIds(generateBills()) as any,
    financialGoals: addIds(generateGoals()) as any,
    lifeAdminTasks: addIds(generateTasks()) as any,
    documents: addIds(generateDocuments()) as any,
    insights: [],
    alerts: addIds(generateAlerts()) as any,
    loans: [],
    wallets: [],
    walletTransfers: [],
    monthlyPlans: [],
    agentMemory: [],
  };
}
