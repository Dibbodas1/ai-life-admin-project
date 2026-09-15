import { NextRequest, NextResponse } from "next/server";
import { getDriveData, saveDriveData } from "@/lib/drive-db";
import { LoanDebt, LoanDebtTransaction } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") || "demo-token";
    const { data } = await getDriveData(token);
    const loans = data.loans || [];
    return NextResponse.json(loans, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      }
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token || token === "demo_token" || token === "dummy_demo_token" || token === "demo-token") {
      return NextResponse.json(
        { error: "Google Drive not connected. Please connect your Google Drive to manage loans." },
        { status: 401 }
      );
    }
    const { data } = await getDriveData(token);
    if (!data.loans) data.loans = [];

    const body = await req.json();
    const { action, id, personName, type, amount, notes, dueDate } = body;

    if (action === "delete") {
      data.loans = data.loans.filter(l => l._id !== id);
      await saveDriveData(token, data);
      return NextResponse.json({ success: true, message: "Deleted successfully" });
    }

    if (action === "settle") {
      const loan = data.loans.find(l => l._id === id);
      if (!loan) return NextResponse.json({ error: "Loan not found" }, { status: 404 });
      
      const prevAmount = loan.amount;
      loan.amount = 0;
      loan.status = "settled";
      loan.history.push({
        _id: crypto.randomUUID(),
        amount: prevAmount,
        type: "repayment",
        date: new Date().toISOString(),
        notes: notes || "Settled in full"
      });
      await saveDriveData(token, data);
      return NextResponse.json({ success: true, loan });
    }

    if (action === "repay") {
      const loan = data.loans.find(l => l._id === id);
      if (!loan) return NextResponse.json({ error: "Loan not found" }, { status: 404 });

      const repayAmount = Number(amount) || 0;
      loan.amount = Math.max(0, loan.amount - repayAmount);
      if (loan.amount === 0) {
        loan.status = "settled";
      }
      loan.history.push({
        _id: crypto.randomUUID(),
        amount: repayAmount,
        type: "repayment",
        date: new Date().toISOString(),
        notes: notes || "Partial repayment"
      });
      await saveDriveData(token, data);
      return NextResponse.json({ success: true, loan });
    }

    // Default: Add or update loan entry (Upsert by personName)
    if (!personName || !type || amount === undefined) {
      return NextResponse.json({ error: "personName, type, and amount are required" }, { status: 400 });
    }

    const cleanName = personName.trim();
    const numAmount = Number(amount) || 0;
    const existing = data.loans.find(
      l => l.personName.toLowerCase() === cleanName.toLowerCase()
    );

    if (existing) {
      // If the same direction (e.g. lent again or borrowed again), add to balance
      if (existing.type === type) {
        existing.amount += numAmount;
        if (existing.amount > 0) existing.status = "active";
      } else {
        // Opposite direction: net out the balance
        if (existing.amount >= numAmount) {
          existing.amount -= numAmount;
          if (existing.amount === 0) existing.status = "settled";
        } else {
          existing.type = type;
          existing.amount = numAmount - existing.amount;
          existing.status = "active";
        }
      }

      if (dueDate) existing.dueDate = dueDate;
      if (notes) existing.notes = notes;

      existing.history.push({
        _id: crypto.randomUUID(),
        amount: numAmount,
        type: type,
        date: new Date().toISOString(),
        notes: notes || `Additional ${type}`
      });

      await saveDriveData(token, data);
      return NextResponse.json({ success: true, loan: existing });
    }

    // Create new profile
    const newLoan: LoanDebt = {
      _id: crypto.randomUUID(),
      userId: data.users[0]?._id || "demo_user_alex",
      personName: cleanName,
      type: type as "lent" | "borrowed",
      amount: numAmount,
      status: numAmount > 0 ? "active" : "settled",
      dueDate: dueDate || undefined,
      notes: notes || undefined,
      createdAt: new Date().toISOString(),
      history: [
        {
          _id: crypto.randomUUID(),
          amount: numAmount,
          type: type as "lent" | "borrowed",
          date: new Date().toISOString(),
          notes: notes || `Initial ${type}`
        }
      ]
    };

    data.loans.push(newLoan);
    await saveDriveData(token, data);
    return NextResponse.json({ success: true, loan: newLoan });
  } catch (error) {
    console.error("Loan API error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
