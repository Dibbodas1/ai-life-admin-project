import { NextRequest, NextResponse } from "next/server";
import { redis, TELEGRAM_LINK_KEY, PENDING_LINK_KEY, TelegramLink } from "@/lib/redis";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendMessage(chatId: number, text: string) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

async function resolveLink(telegramId: number): Promise<TelegramLink | null> {
  const raw = await redis.get(TELEGRAM_LINK_KEY(telegramId));
  if (!raw) return null;
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as TelegramLink; } catch { return null; }
  }
  return raw as TelegramLink;
}

/**
 * Strip markdown formatting from AI responses so they read cleanly in Telegram HTML mode.
 * Converts **bold** → <b>bold</b>, converts ``` code blocks → <code>, removes # headings.
 */
function formatForTelegram(text: string): string {
  return text
    // Convert **bold** → <b>bold</b>
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
    // Convert *italic* → <i>italic</i>
    .replace(/\*(.*?)\*/g, "<i>$1</i>")
    // Convert `inline code` → <code>inline code</code>
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Remove ``` code blocks (just keep content)
    .replace(/```[\s\S]*?```/g, (match) => {
      const content = match.replace(/```\w*\n?/g, "").replace(/```/g, "").trim();
      return `<code>${content}</code>`;
    })
    // Remove # markdown headings (keep the text)
    .replace(/^#{1,4}\s+/gm, "")
    // Trim excessive blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    const message = update.message;
    if (!message || !message.text) return NextResponse.json({ ok: true });

    const chatId: number = message.chat.id;
    const telegramId: number = message.from.id;
    const username: string = message.from.username || message.from.first_name || "User";
    const text: string = message.text.trim();

    // ── /start ────────────────────────────────────────────────────────────
    if (text === "/start") {
      await sendMessage(chatId,
        `👋 Welcome to <b>AI Life Admin Bot</b>!\n\n` +
        `I'm the same AI assistant from your AI Life Admin web app — ` +
        `I can do <b>everything</b> your web assistant can:\n\n` +
        `💸 Add/edit/delete expenses & income\n` +
        `🏦 Create & manage wallets\n` +
        `✅ Add tasks & bills\n` +
        `🎯 Track savings goals\n` +
        `💳 Manage subscriptions & loans\n` +
        `📊 Get financial summaries & insights\n` +
        `📅 Plan monthly budgets\n\n` +
        `<b>To get started:</b>\n` +
        `1. Open your AI Life Admin web app\n` +
        `2. Go to <b>Settings → Telegram Bot</b>\n` +
        `3. Click <b>Generate Linking Code</b>\n` +
        `4. Send me: <code>/link YOUR_CODE</code>`
      );
      return NextResponse.json({ ok: true });
    }

    // ── /link CODE ────────────────────────────────────────────────────────
    if (text.startsWith("/link")) {
      const code = text.split(" ")[1]?.trim();
      if (!code || code.length !== 6) {
        await sendMessage(chatId, `❌ Please send: <code>/link 123456</code>\n\nGet your code from Settings → Telegram Bot in the app.`);
        return NextResponse.json({ ok: true });
      }
      const googleAccessToken = await redis.get<string>(PENDING_LINK_KEY(code));
      if (!googleAccessToken) {
        await sendMessage(chatId, `❌ Code expired or not found.\n\nCodes last 10 minutes. Please generate a new one from the app.`);
        return NextResponse.json({ ok: true });
      }
      const link: TelegramLink = {
        telegramId, telegramUsername: username,
        googleAccessToken,
        linkedAt: new Date().toISOString(),
      };
      await redis.set(TELEGRAM_LINK_KEY(telegramId), link, { ex: 60 * 60 * 24 * 30 });
      await redis.set(`tg:user:${googleAccessToken}`, telegramId, { ex: 60 * 60 * 24 * 30 });
      await redis.del(PENDING_LINK_KEY(code));
      await sendMessage(chatId,
        `✅ <b>Successfully linked!</b>\n\n` +
        `Your Telegram (@${username}) is now connected to AI Life Admin.\n\n` +
        `You can now talk to me just like the web assistant. Try:\n` +
        `• <i>"add expense 50 tk for lunch"</i>\n` +
        `• <i>"create wallet IBBL bank with 5000 taka"</i>\n` +
        `• <i>"what's my balance?"</i>\n` +
        `• <i>"show my recent expenses"</i>`
      );
      return NextResponse.json({ ok: true });
    }

    // ── /help ─────────────────────────────────────────────────────────────
    if (text === "/help") {
      await sendMessage(chatId,
        `<b>🤖 AI Life Admin — Full Capabilities</b>\n\n` +
        `Just talk to me naturally, like you would to the web assistant:\n\n` +
        `<b>💸 Money Tracking</b>\n` +
        `"spent 200 on groceries from bKash"\n` +
        `"got salary 30000 today"\n` +
        `"delete my last expense"\n\n` +
        `<b>🏦 Wallets</b>\n` +
        `"create wallet IBBL bank with 10000"\n` +
        `"transfer 500 from cash to bKash"\n` +
        `"what's my IBBL balance?"\n\n` +
        `<b>🎯 Goals & Savings</b>\n` +
        `"add goal: save 50000 for laptop by December"\n` +
        `"add 2000 to my laptop goal"\n\n` +
        `<b>✅ Tasks & Bills</b>\n` +
        `"add task: pay electricity bill by 20th"\n` +
        `"add bill for DESCO 800 taka due this month"\n\n` +
        `<b>💳 Subscriptions & Loans</b>\n` +
        `"I lent 1000 to Rahim"\n` +
        `"Rahim paid back 500"\n` +
        `"add Netflix subscription 15 USD monthly"\n\n` +
        `<b>📊 Reports</b>\n` +
        `"show my spending this month"\n` +
        `"how much did I spend on food this week?"\n` +
        `"give me a financial summary"`
      );
      return NextResponse.json({ ok: true });
    }

    // ── Auth check ────────────────────────────────────────────────────────
    const link = await resolveLink(telegramId);
    if (!link) {
      await sendMessage(chatId,
        `🔗 Your account is not linked yet.\n\nSend /start to learn how to connect your AI Life Admin account.`
      );
      return NextResponse.json({ ok: true });
    }

    // ── Show typing indicator ─────────────────────────────────────────────
    await fetch(`${TELEGRAM_API}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" }),
    });

    // ── Pipe directly to the existing AI assistant API ────────────────────
    // This gives Telegram access to 100% of the same capabilities as the web app.
    const assistantRes = await fetch(
      new URL("/api/assistant", process.env.NEXTAUTH_URL || "http://localhost:3000").toString(),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${link.googleAccessToken}`,
        },
        body: JSON.stringify({
          message: text,
          history: [],
        }),
      }
    );

    if (!assistantRes.ok) {
      await sendMessage(chatId, `⚠️ Something went wrong. Please try again.`);
      return NextResponse.json({ ok: true });
    }

    const assistantData = await assistantRes.json();
    const rawResponse: string = assistantData.response || "I couldn't process that request.";

    // Format the AI response for clean Telegram display
    const formatted = formatForTelegram(rawResponse);

    // Telegram has a 4096 character limit per message — chunk if needed
    const MAX_LEN = 4000;
    if (formatted.length <= MAX_LEN) {
      await sendMessage(chatId, formatted);
    } else {
      const chunks = formatted.match(/.{1,4000}/gs) || [formatted];
      for (const chunk of chunks) {
        await sendMessage(chatId, chunk);
        await new Promise(r => setTimeout(r, 300)); // small delay between chunks
      }
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("Telegram webhook error:", err);
    // Always return 200 so Telegram doesn't retry endlessly
    return NextResponse.json({ ok: true });
  }
}
