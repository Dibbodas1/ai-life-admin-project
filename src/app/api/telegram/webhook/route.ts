import { NextRequest, NextResponse } from "next/server";
import { redis, TELEGRAM_LINK_KEY, PENDING_LINK_KEY, TelegramLink } from "@/lib/redis";
import { getDriveData } from "@/lib/drive-db";

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

function formatForTelegram(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
    .replace(/\*(.*?)\*/g, "<i>$1</i>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/```[\s\S]*?```/g, (match) => {
      const content = match.replace(/```\w*\n?/g, "").replace(/```/g, "").trim();
      return `<code>${content}</code>`;
    })
    .replace(/^#{1,4}\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function progressBar(current: number, target: number, length = 10): string {
  const pct = Math.min(1, current / target);
  const filled = Math.round(pct * length);
  return "▓".repeat(filled) + "░".repeat(length - filled) + ` ${Math.round(pct * 100)}%`;
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

// ── Quick command handlers (instant, no AI needed) ──────────────────────────

async function handleSummary(chatId: number, accessToken: string) {
  const { data } = await getDriveData(accessToken);
  const today = new Date().toISOString().split("T")[0];
  const thisMonth = today.slice(0, 7);

  const monthExpenses = data.expenses.filter(e =>
    (typeof e.date === "string" ? e.date : new Date(e.date).toISOString()).startsWith(thisMonth)
  );
  const monthIncome = data.income.filter(i =>
    (typeof i.date === "string" ? i.date : new Date(i.date).toISOString()).startsWith(thisMonth)
  );
  const todayExpenses = data.expenses.filter(e =>
    (typeof e.date === "string" ? e.date : new Date(e.date).toISOString()).startsWith(today)
  );

  const totalMonthExp = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const totalMonthInc = monthIncome.reduce((s, i) => s + i.amount, 0);
  const totalTodayExp = todayExpenses.reduce((s, e) => s + e.amount, 0);
  const walletTotal = data.wallets.reduce((s, w) => s + (w.balance || 0), 0);

  const pendingTasks = data.lifeAdminTasks.filter(t => t.status === "pending").length;
  const overdueBills = data.bills.filter(b => b.status === "pending").length;

  const monthName = new Date().toLocaleString("en", { month: "long" });

  await sendMessage(chatId,
    `📊 <b>Financial Summary</b>\n` +
    `📅 ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}\n` +
    `━━━━━━━━━━━━━━━\n\n` +
    `<b>☀️ Today</b>\n` +
    `💸 Spent: <b>${fmt(totalTodayExp)} BDT</b>\n\n` +
    `<b>📆 ${monthName}</b>\n` +
    `📈 Income: <b>${fmt(totalMonthInc)} BDT</b>\n` +
    `📉 Expenses: <b>${fmt(totalMonthExp)} BDT</b>\n` +
    `💼 Net: <b>${fmt(totalMonthInc - totalMonthExp)} BDT</b>\n\n` +
    `<b>🏦 Wallets Total</b>\n` +
    `💰 <b>${fmt(walletTotal)} BDT</b>\n\n` +
    `<b>📋 Pending</b>\n` +
    `✅ Tasks: ${pendingTasks} • 📋 Bills: ${overdueBills}`
  );
}

async function handleBalance(chatId: number, accessToken: string) {
  const { data } = await getDriveData(accessToken);
  if (data.wallets.length === 0) {
    await sendMessage(chatId, `🏦 No wallets found.\n\nCreate one by saying:\n<i>"create wallet IBBL bank with 5000"</i>`);
    return;
  }
  const typeEmoji: Record<string, string> = {
    bank: "🏦", mfs: "📱", cash: "💵", card: "💳", savings: "🐷", other: "👛",
  };
  const total = data.wallets.reduce((s, w) => s + (w.balance || 0), 0);
  const lines = data.wallets
    .sort((a, b) => (b.balance || 0) - (a.balance || 0))
    .map(w => `${typeEmoji[w.type] || "👛"} <b>${w.name}</b>\n   💰 ${fmt(w.balance || 0)} ${w.currency || "BDT"} • <i>${w.type}</i>`)
    .join("\n\n");

  await sendMessage(chatId,
    `🏦 <b>Wallet Balances</b>\n` +
    `━━━━━━━━━━━━━━━\n\n` +
    `${lines}\n\n` +
    `━━━━━━━━━━━━━━━\n` +
    `💼 <b>Total: ${fmt(total)} BDT</b>`
  );
}

async function handleExpenses(chatId: number, accessToken: string) {
  const { data } = await getDriveData(accessToken);
  const recent = [...data.expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  if (recent.length === 0) {
    await sendMessage(chatId, `📊 No expenses recorded yet.\n\nTry: <i>"spent 50 tk on lunch"</i>`);
    return;
  }

  const catEmoji: Record<string, string> = {
    food: "🍔", transport: "🚌", shopping: "🛒", bills: "💡",
    entertainment: "🎬", health: "💊", education: "📚", other: "📌",
  };

  const lines = recent.map((e, i) => {
    const date = (typeof e.date === "string" ? e.date : new Date(e.date).toISOString()).slice(0, 10);
    const emoji = catEmoji[e.category] || "📌";
    return `${i + 1}. ${emoji} <b>${fmt(e.amount)} BDT</b> — ${e.merchant}\n   🏷️ ${e.category} • 📅 ${date}`;
  }).join("\n\n");

  const total = recent.reduce((s, e) => s + e.amount, 0);
  await sendMessage(chatId,
    `📊 <b>Last ${recent.length} Expenses</b>\n` +
    `━━━━━━━━━━━━━━━\n\n` +
    `${lines}\n\n` +
    `━━━━━━━━━━━━━━━\n` +
    `💸 Total shown: <b>${fmt(total)} BDT</b>`
  );
}

async function handleGoals(chatId: number, accessToken: string) {
  const { data } = await getDriveData(accessToken);
  const activeGoals = data.financialGoals.filter(g => g.status === "active");

  if (activeGoals.length === 0) {
    await sendMessage(chatId, `🎯 No active goals yet.\n\nTry: <i>"add goal: save 50000 for laptop by December"</i>`);
    return;
  }

  const lines = activeGoals.map(g => {
    const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
    const bar = progressBar(g.currentAmount, g.targetAmount);
    const deadline = g.deadline
      ? new Date(g.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      : "No deadline";
    return (
      `🎯 <b>${g.name}</b>\n` +
      `   ${bar}\n` +
      `   💰 ${fmt(g.currentAmount)} / ${fmt(g.targetAmount)} BDT\n` +
      `   📅 By ${deadline}`
    );
  }).join("\n\n");

  await sendMessage(chatId,
    `🎯 <b>Savings Goals</b>\n` +
    `━━━━━━━━━━━━━━━\n\n` +
    `${lines}`
  );
}

async function handleTasks(chatId: number, accessToken: string) {
  const { data } = await getDriveData(accessToken);
  const pending = data.lifeAdminTasks
    .filter(t => t.status === "pending" || t.status === "in_progress")
    .sort((a, b) => {
      const pri = { high: 0, medium: 1, low: 2 };
      return (pri[a.priority] ?? 1) - (pri[b.priority] ?? 1);
    })
    .slice(0, 10);

  if (pending.length === 0) {
    await sendMessage(chatId, `✅ No pending tasks! You're all caught up.\n\nAdd one: <i>"add task pay electricity bill by 20th"</i>`);
    return;
  }

  const priEmoji = { high: "🔴", medium: "🟡", low: "🟢" };
  const lines = pending.map((t, i) => {
    const pri = priEmoji[t.priority] || "🟡";
    const deadline = t.deadline
      ? `📅 ${new Date(t.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
      : "";
    return `${i + 1}. ${pri} <b>${t.title}</b>${deadline ? " • " + deadline : ""}`;
  }).join("\n");

  await sendMessage(chatId,
    `✅ <b>Pending Tasks (${pending.length})</b>\n` +
    `━━━━━━━━━━━━━━━\n\n` +
    `${lines}\n\n` +
    `Say <i>"mark [task name] as done"</i> to complete one.`
  );
}

async function handleWallets(chatId: number, accessToken: string) {
  await handleBalance(chatId, accessToken); // same as balance but reuse
}

// ── Main Webhook ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    const message = update.message;
    if (!message || !message.text) return NextResponse.json({ ok: true });

    const chatId: number = message.chat.id;
    const telegramId: number = message.from.id;
    const username: string = message.from.username || message.from.first_name || "User";
    const text: string = message.text.trim();

    // ── /start ─────────────────────────────────────────────────────────────
    if (text === "/start") {
      await sendMessage(chatId,
        `👋 Welcome to <b>AI Life Admin Bot</b>!\n\n` +
        `I'm the same AI assistant from your web app — I can do <b>everything</b>:\n\n` +
        `💸 Track expenses and income\n` +
        `🏦 Manage wallets and transfers\n` +
        `🎯 Track savings goals\n` +
        `✅ Add and complete tasks\n` +
        `💳 Manage subscriptions and loans\n` +
        `📊 Get financial summaries\n\n` +
        `<b>To get started:</b>\n` +
        `1. Open your AI Life Admin web app\n` +
        `2. Go to <b>Settings → Telegram Bot</b>\n` +
        `3. Click <b>Generate Linking Code</b>\n` +
        `4. Send me: <code>/link YOUR_CODE</code>\n\n` +
        `Type / to see all quick commands!`
      );
      return NextResponse.json({ ok: true });
    }

    // ── /link CODE ─────────────────────────────────────────────────────────
    if (text.startsWith("/link")) {
      const code = text.split(" ")[1]?.trim();
      if (!code || code.length !== 6) {
        await sendMessage(chatId, `❌ Please send: <code>/link 123456</code>\n\nGet your code from <b>Settings → Telegram Bot</b> in the web app.`);
        return NextResponse.json({ ok: true });
      }
      const userKey = await redis.get<string>(PENDING_LINK_KEY(code));
      if (!userKey) {
        await sendMessage(chatId, `❌ Code expired or not found.\n\nCodes last <b>10 minutes</b>. Please generate a new one from the app.`);
        return NextResponse.json({ ok: true });
      }
      const link: TelegramLink = { telegramId, telegramUsername: username, userKey, linkedAt: new Date().toISOString() };
      await redis.set(TELEGRAM_LINK_KEY(telegramId), link, { ex: 60 * 60 * 24 * 30 });
      await redis.set(`tg:user:${userKey}`, telegramId, { ex: 60 * 60 * 24 * 30 });
      await redis.del(PENDING_LINK_KEY(code));
      await sendMessage(chatId,
        `✅ <b>Successfully linked!</b>\n\n` +
        `Your Telegram (@${username}) is connected to AI Life Admin.\n\n` +
        `<b>Try these quick commands:</b>\n` +
        `/summary — Today's overview\n` +
        `/balance — All wallets\n` +
        `/goals — Savings progress\n\n` +
        `Or just talk naturally:\n` +
        `<i>"spent 50 tk on lunch"</i>\n` +
        `<i>"create wallet IBBL bank with 5000"</i>`
      );
      return NextResponse.json({ ok: true });
    }

    // ── /help ──────────────────────────────────────────────────────────────
    if (text === "/help") {
      await sendMessage(chatId,
        `<b>🤖 AI Life Admin — All Commands</b>\n\n` +
        `<b>⚡ Quick Commands</b>\n` +
        `/summary — Daily financial overview\n` +
        `/balance — All wallet balances\n` +
        `/expenses — Last 5 expenses\n` +
        `/goals — Savings goals progress\n` +
        `/tasks — Pending tasks\n` +
        `/wallets — Wallets overview\n\n` +
        `<b>💬 Natural Language (just talk!)</b>\n\n` +
        `💸 <i>"spent 200 on groceries from bKash"</i>\n` +
        `💰 <i>"got salary 30000 today"</i>\n` +
        `🏦 <i>"create wallet IBBL bank with 10000"</i>\n` +
        `🔄 <i>"transfer 500 from cash to bKash"</i>\n` +
        `🎯 <i>"save 50000 for laptop by December"</i>\n` +
        `✅ <i>"add task pay electricity bill by 20th"</i>\n` +
        `💳 <i>"add Netflix 15 USD monthly subscription"</i>\n` +
        `🤝 <i>"I lent 1000 to Rahim"</i>\n` +
        `📅 <i>"plan 3000 for groceries this month"</i>\n` +
        `📊 <i>"how much did I spend this month?"</i>`
      );
      return NextResponse.json({ ok: true });
    }

    // ── Auth check ─────────────────────────────────────────────────────────
    const link = await resolveLink(telegramId);
    if (!link) {
      await sendMessage(chatId, `🔗 Your account is not linked yet.\n\nSend /start to learn how to connect your AI Life Admin account.`);
      return NextResponse.json({ ok: true });
    }

    // ── Quick commands (instant, no AI) ────────────────────────────────────
    
    // Fetch fresh access token via userKey
    let accessToken = (link as any).googleAccessToken; // backward compat for users who linked before this fix
    if (link.userKey) {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      try {
        const tokenRes = await fetch(`${baseUrl}/api/auth/token?key=${link.userKey}`);
        if (tokenRes.ok) {
          const data = await tokenRes.json();
          if (data.access_token) {
            accessToken = data.access_token;
          }
        }
      } catch (err) {
        console.error("Failed to fetch fresh access token", err);
      }
    }

    if (!accessToken) {
      await sendMessage(chatId, `⚠️ Session expired or invalid. Please re-link your Telegram account from the web app.`);
      return NextResponse.json({ ok: true });
    }

    if (text === "/summary") { await handleSummary(chatId, accessToken); return NextResponse.json({ ok: true }); }
    if (text === "/balance") { await handleBalance(chatId, accessToken); return NextResponse.json({ ok: true }); }
    if (text === "/expenses") { await handleExpenses(chatId, accessToken); return NextResponse.json({ ok: true }); }
    if (text === "/goals") { await handleGoals(chatId, accessToken); return NextResponse.json({ ok: true }); }
    if (text === "/tasks") { await handleTasks(chatId, accessToken); return NextResponse.json({ ok: true }); }
    if (text === "/wallets") { await handleWallets(chatId, accessToken); return NextResponse.json({ ok: true }); }

    // ── Typing indicator then pipe to full AI assistant ────────────────────
    await fetch(`${TELEGRAM_API}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" }),
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const assistantRes = await fetch(`${baseUrl}/api/assistant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ message: text, history: [] }),
    });

    if (!assistantRes.ok) {
      await sendMessage(chatId, `⚠️ Something went wrong. Please try again in a moment.`);
      return NextResponse.json({ ok: true });
    }

    const assistantData = await assistantRes.json();
    const rawResponse: string = assistantData.response || "I couldn't process that request.";
    const formatted = formatForTelegram(rawResponse);

    const MAX_LEN = 4000;
    if (formatted.length <= MAX_LEN) {
      await sendMessage(chatId, formatted);
    } else {
      const chunks = formatted.match(/.{1,4000}/gs) || [formatted];
      for (const chunk of chunks) {
        await sendMessage(chatId, chunk);
        await new Promise(r => setTimeout(r, 300));
      }
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("Telegram webhook error:", err);
    return NextResponse.json({ ok: true });
  }
}
