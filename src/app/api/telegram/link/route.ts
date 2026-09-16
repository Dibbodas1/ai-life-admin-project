import { NextRequest, NextResponse } from "next/server";
import { redis, PENDING_LINK_KEY, TELEGRAM_LINK_KEY, TelegramLink } from "@/lib/redis";
import crypto from "crypto";

// Generates a random 6-char linking code and stores it pending for 10 minutes
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userKey } = body;

    if (!userKey) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Generate a unique 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();

    // Store the user key under the code for 10 minutes (600 seconds)
    await redis.set(PENDING_LINK_KEY(code), userKey, { ex: 600 });

    return NextResponse.json({ code });
  } catch (err) {
    console.error("Telegram link code generation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Check if a Telegram account is already linked for this Google user
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const actualUserKey = searchParams.get("userKey");
    
    if (!actualUserKey) {
      return NextResponse.json({ linked: false });
    }

    // Check if there's a telegram ID stored for this token (reverse lookup stored at linking time)
    const telegramId = await redis.get<number>(`tg:user:${actualUserKey}`);

    if (telegramId) {
      const link = await redis.get<TelegramLink>(TELEGRAM_LINK_KEY(telegramId));
      return NextResponse.json({ linked: true, telegramId, username: link?.telegramUsername });
    }

    return NextResponse.json({ linked: false });
  } catch (err) {
    console.error("Telegram link check error:", err);
    return NextResponse.json({ linked: false });
  }
}
