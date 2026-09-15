import { NextRequest, NextResponse } from "next/server";
import { getDriveData } from "@/lib/drive-db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") || "demo_token";
    const { data } = await getDriveData(token);

    const wallets = data.wallets || [];
    const totalLiquidity = wallets.reduce((sum, w) => sum + (Number(w.balance) || 0), 0);

    const walletBreakdown: Record<string, number> = {};
    wallets.forEach((w) => {
      walletBreakdown[w.type] = (walletBreakdown[w.type] || 0) + (Number(w.balance) || 0);
    });

    // Inflow & Outflow
    const allIncome = data.income || [];
    const allExpenses = data.expenses || [];

    const totalIncome = allIncome.reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);
    const totalExpenses = allExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    const currentAvailable = Math.max(0, totalIncome - totalExpenses);

    // Loans & Debts
    const activeLoans = (data.loans || []).filter((l) => l.status === "active" && l.amount > 0);
    const totalLent = activeLoans
      .filter((l) => l.type === "lent")
      .reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
    const totalBorrowed = activeLoans
      .filter((l) => l.type === "borrowed")
      .reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
    const netLoanBalance = totalLent - totalBorrowed;

    // Spending breakdown
    const categorySpending: Record<string, number> = {};
    allExpenses.forEach((e) => {
      const cat = e.category || "General";
      categorySpending[cat] = (categorySpending[cat] || 0) + (Number(e.amount) || 0);
    });

    // Generate Cash Flow Curve Points (last 7 date points or cumulative trajectory)
    // Create an organized timeline of cashflow
    const now = new Date();
    const cashFlowTrend = [];
    let runningIncome = 0;
    let runningExpense = 0;

    for (let i = 6; i >= 0; i--) {
      const dayDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = dayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      
      // Calculate daily increments
      const dayIncome = allIncome
        .filter((inc) => new Date(inc.date).toDateString() === dayDate.toDateString())
        .reduce((s, inc) => s + (Number(inc.amount) || 0), 0);
      const dayExpense = allExpenses
        .filter((exp) => new Date(exp.date).toDateString() === dayDate.toDateString())
        .reduce((s, exp) => s + (Number(exp.amount) || 0), 0);

      runningIncome += dayIncome;
      runningExpense += dayExpense;

      // Provide baseline values if newly created data
      cashFlowTrend.push({
        name: dateStr,
        income: Math.round(runningIncome || (totalIncome * ((7 - i) / 7))),
        expense: Math.round(runningExpense || (totalExpenses * ((7 - i) / 7))),
        net: Math.round((runningIncome || totalIncome * ((7 - i) / 7)) - (runningExpense || totalExpenses * ((7 - i) / 7))),
      });
    }

    // Consolidated Recent Activity Feed
    const recentActivity = [
      ...allExpenses.map((e) => ({
        id: e._id,
        type: "expense",
        title: e.merchant || "Expense",
        subtitle: `${e.category || "General"}${e.walletName ? ` · ${e.walletName}` : ""}`,
        amount: -e.amount,
        date: String(e.date),
      })),
      ...allIncome.map((i) => ({
        id: i._id,
        type: "income",
        title: i.source || "Income",
        subtitle: `Inflow${i.walletName ? ` · ${i.walletName}` : ""}`,
        amount: i.amount,
        date: String(i.date),
      })),
      ...(data.walletTransfers || []).map((t) => ({
        id: t._id,
        type: "transfer",
        title: `Transfer to ${t.toWalletName}`,
        subtitle: `From ${t.fromWalletName}`,
        amount: t.amount,
        date: String(t.date),
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);

    const activeGoals = (data.financialGoals || []).map((g) => ({
      name: g.name,
      target: g.targetAmount,
      current: g.currentAmount,
    }));

    return NextResponse.json({
      totalLiquidity,
      totalIncome,
      totalExpenses,
      currentAvailable,
      wallets,
      walletBreakdown,
      loansSummary: {
        totalLent,
        totalBorrowed,
        netBalance: netLoanBalance,
        activeCount: activeLoans.length,
        activeLoans: activeLoans.slice(0, 4),
      },
      cashFlowTrend,
      recentActivity,
      categorySpending,
      activeGoals,
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      }
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
