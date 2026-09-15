import { NextRequest, NextResponse } from "next/server";
import { getDriveData, saveDriveData } from "@/lib/drive-db";

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data } = await getDriveData(token);
    const subs = data.subscriptions.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json(subs);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    body._id = crypto.randomUUID();
    body.userId = "demo_user_alex";

    const { data } = await getDriveData(token);
    data.subscriptions.push(body);
    await saveDriveData(token, data);

    return NextResponse.json(body, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
