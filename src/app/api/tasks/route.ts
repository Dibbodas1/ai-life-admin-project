import { NextRequest, NextResponse } from "next/server";
import { getDriveData } from "@/lib/drive-db";

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data } = await getDriveData(token);
    const tasks = data.lifeAdminTasks.sort((a, b) => new Date(a.deadline || "").getTime() - new Date(b.deadline || "").getTime());
    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
