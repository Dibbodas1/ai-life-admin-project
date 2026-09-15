import { NextRequest, NextResponse } from "next/server";
import { getDriveData } from "@/lib/drive-db";

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data } = await getDriveData(token);
    const bills = data.bills.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    return NextResponse.json(bills);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
