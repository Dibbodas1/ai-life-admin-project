import { NextRequest, NextResponse } from "next/server";
import { getDriveData } from "@/lib/drive-db";
import { generateAllInsights } from "@/lib/ai/insight-engine";

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data } = await getDriveData(token);
    // Since insights is currently a background process in production, for MVP we just generate them dynamically on GET if none exist, or we can just always generate them dynamically.
    const insights = await generateAllInsights(data);
    
    return NextResponse.json(insights);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
