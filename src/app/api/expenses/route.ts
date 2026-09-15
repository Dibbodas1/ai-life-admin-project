import { NextRequest, NextResponse } from "next/server";
import { getDriveData, saveDriveData } from "@/lib/drive-db";
import { classifyExpense } from "@/lib/ai/classifier";

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

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const category = searchParams.get("category");

    const { data } = await getDriveData(token);

    let expenses = (data.expenses || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (category) expenses = expenses.filter((e) => e.category === category);

    return NextResponse.json(expenses.slice(0, limit), { headers: noCacheHeaders });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500, headers: noCacheHeaders });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token || token === "demo_token" || token === "dummy_demo_token") {
      return NextResponse.json(
        { error: "Google Drive not connected. Please connect your Google Drive to save expenses." },
        { status: 401, headers: noCacheHeaders }
      );
    }
    const body = await req.json();
    const { data } = await getDriveData(token);
    if (!data.expenses) data.expenses = [];
    if (!data.wallets) data.wallets = [];

    // Handle Deletion
    if (body.action === "delete") {
      data.expenses = data.expenses.filter((e) => e._id !== body.id);
      await saveDriveData(token, data);
      return NextResponse.json({ success: true, message: "Deleted successfully" }, { headers: noCacheHeaders });
    }

    // AI Categorization if not provided
    if (!body.category && body.merchant) {
      const classification = await classifyExpense(body.merchant, body.amount, body.notes);
      body.category = classification.category;
      body.aiCategorized = true;
      body.aiConfidence = classification.confidence;
    }

    body._id = crypto.randomUUID();
    body.userId = "demo_user_alex";
    body.amount = Number(body.amount) || 0;
    body.date = body.date || new Date().toISOString();

    // If funding wallet selected, deduct from wallet
    if (body.walletId) {
      const targetWallet = data.wallets.find((w) => w._id === body.walletId);
      if (targetWallet) {
        targetWallet.balance = (Number(targetWallet.balance) || 0) - body.amount;
        body.walletName = targetWallet.name;
      }
    }

    data.expenses.push(body);
    await saveDriveData(token, data);

    return NextResponse.json(body, { status: 201, headers: noCacheHeaders });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500, headers: noCacheHeaders });
  }
}
