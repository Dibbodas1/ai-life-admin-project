import { NextRequest, NextResponse } from "next/server";
import { getDriveData } from "@/lib/drive-db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") || "demo_token";
    const { data } = await getDriveData(token);
    const goals = (data.financialGoals || []).sort((a, b) => {
      const p = { high: 1, medium: 2, low: 3 };
      return (p[a.priority] || 4) - (p[b.priority] || 4);
    });
    return NextResponse.json(goals, {
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
