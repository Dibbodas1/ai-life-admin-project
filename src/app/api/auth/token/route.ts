import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userKey = searchParams.get("key");

    if (!userKey) {
      return NextResponse.json({ error: "No key provided" }, { status: 400 });
    }

    const refreshToken = await redis.get<string>(`auth:refresh:${userKey}`);

    if (!refreshToken) {
      return NextResponse.json({ error: "No refresh token found for this user" }, { status: 404 });
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      console.error("Token exchange failed:", tokenData);
      return NextResponse.json({ error: "Failed to fetch fresh token", details: tokenData }, { status: 400 });
    }

    if (tokenData.refresh_token) {
      await redis.set(`auth:refresh:${userKey}`, tokenData.refresh_token);
    }

    return NextResponse.json({
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
    });
  } catch (err) {
    console.error("Google token GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
