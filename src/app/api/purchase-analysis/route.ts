import { NextRequest, NextResponse } from "next/server";
import { getDriveData } from "@/lib/drive-db";
import { buildFinancialContext } from "@/lib/ai/context-builder";
import { analyzePurchase } from "@/lib/ai/purchase-engine";

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
    const context = await buildFinancialContext(data);
    
    return NextResponse.json({
      totalWalletLiquidity: context.totalWalletLiquidity,
      currentAvailable: context.currentAvailable,
      upcomingCommitments: context.upcomingCommitments + (context.totalPlannedUpcoming || 0),
      currentMonthSpend: context.currentMonthSpend,
      activeGoalsCount: context.activeGoals.length,
      wallets: context.wallets,
    }, { headers: noCacheHeaders });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500, headers: noCacheHeaders });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") || "demo_token";

    const { amount, description } = await req.json();

    if (!amount || !description) {
      return NextResponse.json({ error: "Amount and description are required" }, { status: 400, headers: noCacheHeaders });
    }

    const { data } = await getDriveData(token);
    const context = await buildFinancialContext(data);
    const analysis = await analyzePurchase(Number(amount), description, context);

    return NextResponse.json(analysis, { headers: noCacheHeaders });
  } catch (error) {
    console.error("Purchase analysis error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500, headers: noCacheHeaders });
  }
}
