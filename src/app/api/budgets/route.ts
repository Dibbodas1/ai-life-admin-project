import { NextRequest, NextResponse } from "next/server";
import { getDriveData } from "@/lib/drive-db";

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data } = await getDriveData(token);
    
    // Get current month's expenses to calculate spent amounts
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const expenses = data.expenses.filter(exp => new Date(exp.date) >= startOfMonth);

    // Calculate spent per category
    const spentByCategory: Record<string, number> = {};
    expenses.forEach(exp => {
      spentByCategory[exp.category] = (spentByCategory[exp.category] || 0) + exp.amount;
    });

    // Merge budgets with spent amounts
    const enrichedBudgets = data.budgets.map(b => {
      const spent = spentByCategory[b.category] || 0;
      return {
        ...b,
        spent,
        remaining: b.amount - spent,
        percentUsed: Math.min(Math.round((spent / b.amount) * 100), 100)
      };
    });

    return NextResponse.json(enrichedBudgets);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
