import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { code, redirectUri } = await req.json();

    if (!code) {
      return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri || "postmessage",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      console.error("Token exchange failed:", tokenData);
      return NextResponse.json({ error: "Failed to exchange token", details: tokenData }, { status: 400 });
    }

    const { access_token, refresh_token, expires_in } = tokenData;
    let userKey: string | null = null;

    if (refresh_token) {
      // Create a stable user key from the refresh token
      userKey = crypto.createHash("sha256").update(refresh_token).digest("hex");
      
      // Store refresh token permanently in Redis
      await redis.set(`auth:refresh:${userKey}`, refresh_token);
    }

    return NextResponse.json({
      access_token,
      refresh_token,
      expires_in,
      userKey,
    });
  } catch (err) {
    console.error("Google callback error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
