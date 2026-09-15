import { NextRequest, NextResponse } from "next/server";
import { getDriveData, saveDriveData } from "@/lib/drive-db";

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
    const income = (data.income || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return NextResponse.json(income, { headers: noCacheHeaders });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500, headers: noCacheHeaders });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token || token === "demo_token" || token === "dummy_demo_token") {
      return NextResponse.json(
        { error: "Google Drive not connected. Please connect your Google Drive to save income." },
        { status: 401, headers: noCacheHeaders }
      );
    }
    const body = await req.json();
    const { data } = await getDriveData(token);
    if (!data.income) data.income = [];
    if (!data.wallets) data.wallets = [];

    // Handle Deletion
    if (body.action === "delete") {
      data.income = data.income.filter((i) => i._id !== body.id);
      await saveDriveData(token, data);
      return NextResponse.json({ success: true, message: "Deleted successfully" }, { headers: noCacheHeaders });
    }

    // Handle Creation
    body._id = crypto.randomUUID();
    body.userId = "demo_user_alex";
    body.amount = Number(body.amount) || 0;
    body.date = body.date || new Date().toISOString();

    // If destination wallet selected, deposit into wallet
    if (body.walletId) {
      const targetWallet = data.wallets.find((w) => w._id === body.walletId);
      if (targetWallet) {
        targetWallet.balance = (Number(targetWallet.balance) || 0) + body.amount;
        body.walletName = targetWallet.name;
      }
    }

    data.income.push(body);
    await saveDriveData(token, data);

    return NextResponse.json(body, {
      status: 201,
      headers: noCacheHeaders,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500, headers: noCacheHeaders });
  }
}
