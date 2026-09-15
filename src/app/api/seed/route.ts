import { NextRequest, NextResponse } from "next/server";
import { getDriveData, saveDriveData } from "@/lib/drive-db";
import { generateDemoData } from "@/lib/seed";

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const demoData = generateDemoData();
    await saveDriveData(token, demoData);

    return NextResponse.json({ success: true, stats: { items: Object.keys(demoData).length } });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
