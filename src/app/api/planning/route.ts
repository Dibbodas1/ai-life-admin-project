import { NextRequest, NextResponse } from "next/server";
import { getDriveData, saveDriveData } from "@/lib/drive-db";
import { PlannedExpense } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") || "demo_token";
    const { data } = await getDriveData(token);
    const plans: PlannedExpense[] = data.monthlyPlans || [];

    const now = new Date();
    const nowMs = now.getTime();
    const in7DaysMs = nowMs + 7 * 24 * 60 * 60 * 1000;

    const plannedItems = plans.filter(p => p.status === "planned");
    const paidItems = plans.filter(p => p.status === "paid");

    const totalPlanned = plannedItems.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalPaid = paidItems.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const upcomingNext7Days = plannedItems.filter(p => {
      if (!p.dueDate) return false;
      const dueMs = new Date(p.dueDate).getTime();
      return dueMs >= (nowMs - 24 * 60 * 60 * 1000) && dueMs <= in7DaysMs;
    });

    const highPriorityCount = plannedItems.filter(p => p.priority === "high").length;

    const categoryBreakdown: Record<string, number> = {};
    plans.forEach(p => {
      const cat = p.category || "General";
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + (Number(p.amount) || 0);
    });

    const totalLiquidity = (data.wallets || []).reduce((sum, w) => sum + (Number(w.balance) || 0), 0);
    const remainingBuffer = totalLiquidity - totalPlanned;

    // Sort: planned items first (by dueDate ascending), then paid items (by paidAt/dueDate descending)
    const sortedPlans = plans.slice().sort((a, b) => {
      if (a.status === "planned" && b.status !== "planned") return -1;
      if (a.status !== "planned" && b.status === "planned") return 1;
      return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();
    });

    return NextResponse.json({
      plans: sortedPlans,
      metrics: {
        totalPlanned,
        totalPaid,
        dueNext7DaysCount: upcomingNext7Days.length,
        dueNext7DaysAmount: upcomingNext7Days.reduce((s, p) => s + (Number(p.amount) || 0), 0),
        highPriorityCount,
        totalLiquidity,
        remainingBuffer,
        bufferHealth: remainingBuffer >= 0 ? "healthy" : "deficit",
      },
      categoryBreakdown,
    }, { headers: noCacheHeaders });
  } catch (error) {
    console.error("Monthly Planning GET error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500, headers: noCacheHeaders });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token || token === "demo_token" || token === "dummy_demo_token") {
      return NextResponse.json(
        { error: "Google Drive not connected. Please connect your Google Drive to manage monthly planning." },
        { status: 401, headers: noCacheHeaders }
      );
    }
    const { data } = await getDriveData(token);
    if (!data.monthlyPlans) data.monthlyPlans = [];
    if (!data.wallets) data.wallets = [];
    if (!data.expenses) data.expenses = [];

    const body = await req.json();
    const { action, id, title, amount, dueDate, category, priority, walletName, walletId, notes, deductWallet } = body;

    if (action === "delete") {
      data.monthlyPlans = data.monthlyPlans.filter(p => p._id !== id);
      await saveDriveData(token, data);
      return NextResponse.json({ success: true, message: "Deleted successfully" }, { headers: noCacheHeaders });
    }

    if (action === "markPaid") {
      const plan = data.monthlyPlans.find(p => p._id === id);
      if (!plan) return NextResponse.json({ error: "Planned item not found" }, { status: 404, headers: noCacheHeaders });

      plan.status = "paid";
      plan.paidAt = new Date().toISOString();

      let matchedWallet = null;
      const targetWalletName = (walletName || plan.walletName || "").trim().toLowerCase();
      const targetWalletId = walletId || plan.walletId;

      if (targetWalletId || targetWalletName) {
        matchedWallet = data.wallets.find(w => 
          (targetWalletId && w._id === targetWalletId) ||
          (targetWalletName && (w.name.toLowerCase() === targetWalletName || w.name.toLowerCase().includes(targetWalletName)))
        );
      }

      // Optionally deduct from wallet and log as an actual expense
      if (deductWallet !== false) {
        if (matchedWallet) {
          matchedWallet.balance = (Number(matchedWallet.balance) || 0) - Number(plan.amount);
          plan.walletId = matchedWallet._id;
          plan.walletName = matchedWallet.name;
        }

        const newExpense = {
          _id: crypto.randomUUID(),
          userId: "demo_user_alex",
          merchant: plan.title,
          amount: Number(plan.amount),
          category: plan.category || "General",
          date: new Date().toISOString(),
          isRecurring: false,
          walletId: matchedWallet?._id,
          walletName: matchedWallet?.name,
          notes: plan.notes ? `Fulfillment of plan: ${plan.notes}` : "Fulfilled from Monthly Planning",
          aiCategorized: false,
        };
        data.expenses.push(newExpense);
        plan.expenseId = newExpense._id;
      }

      await saveDriveData(token, data);
      return NextResponse.json({ success: true, plan, deducted: !!matchedWallet }, { headers: noCacheHeaders });
    }

    if (action === "markPlanned") {
      const plan = data.monthlyPlans.find(p => p._id === id);
      if (!plan) return NextResponse.json({ error: "Planned item not found" }, { status: 404, headers: noCacheHeaders });

      plan.status = "planned";
      plan.paidAt = undefined;
      await saveDriveData(token, data);
      return NextResponse.json({ success: true, plan }, { headers: noCacheHeaders });
    }

    if (action === "update") {
      const plan = data.monthlyPlans.find(p => p._id === id);
      if (!plan) return NextResponse.json({ error: "Planned item not found" }, { status: 404, headers: noCacheHeaders });

      if (title !== undefined) plan.title = title.trim();
      if (amount !== undefined) plan.amount = Number(amount) || 0;
      if (dueDate !== undefined) plan.dueDate = dueDate;
      if (category !== undefined) plan.category = category;
      if (priority !== undefined) plan.priority = priority;
      if (walletName !== undefined) plan.walletName = walletName;
      if (walletId !== undefined) plan.walletId = walletId;
      if (notes !== undefined) plan.notes = notes;

      await saveDriveData(token, data);
      return NextResponse.json({ success: true, plan }, { headers: noCacheHeaders });
    }

    // Default action: Create new planned expense
    if (!title || !amount) {
      return NextResponse.json({ error: "Title and amount are required" }, { status: 400, headers: noCacheHeaders });
    }

    let assignedWallet = null;
    if (walletName || walletId) {
      const wSearch = (walletName || "").trim().toLowerCase();
      assignedWallet = data.wallets.find(w => 
        (walletId && w._id === walletId) ||
        (wSearch && (w.name.toLowerCase() === wSearch || w.name.toLowerCase().includes(wSearch)))
      );
    }

    const newPlan: PlannedExpense = {
      _id: crypto.randomUUID(),
      userId: data.users[0]?._id || "demo_user_alex",
      title: title.trim(),
      amount: Number(amount) || 0,
      dueDate: dueDate || new Date().toISOString().split("T")[0],
      category: category || "General",
      priority: priority || "medium",
      status: "planned",
      walletId: assignedWallet?._id,
      walletName: assignedWallet?.name || walletName,
      notes: notes || undefined,
      createdAt: new Date().toISOString(),
    };

    data.monthlyPlans.push(newPlan);
    await saveDriveData(token, data);

    return NextResponse.json({ success: true, plan: newPlan }, { status: 201, headers: noCacheHeaders });
  } catch (error) {
    console.error("Monthly Planning POST error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500, headers: noCacheHeaders });
  }
}
