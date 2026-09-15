import { NextRequest, NextResponse } from "next/server";
import { clearUserCache } from "@/lib/drive-db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (token) {
      clearUserCache(token);
    }
    return NextResponse.json({ success: true, message: "Logged out and cache cleared" });
  } catch (error) {
    console.error("Disconnect error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
