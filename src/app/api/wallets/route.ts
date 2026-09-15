import { NextRequest, NextResponse } from "next/server";
import { getDriveData, saveDriveData } from "@/lib/drive-db";
import { Wallet, WalletTransfer } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") || "demo_token";
    const { data } = await getDriveData(token);
    const wallets = data.wallets || [];
    const transfers = data.walletTransfers || [];

    const totalBalance = wallets.reduce((sum, w) => sum + (Number(w.balance) || 0), 0);
    const breakdown: Record<string, number> = {};
    wallets.forEach((w) => {
      breakdown[w.type] = (breakdown[w.type] || 0) + (Number(w.balance) || 0);
    });

    return NextResponse.json({
      wallets,
      transfers: transfers.slice().reverse().slice(0, 20),
      totalBalance,
      breakdown,
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      }
    });
  } catch (error) {
    console.error("Wallets GET error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token || token === "demo_token" || token === "dummy_demo_token") {
      return NextResponse.json(
        { error: "Google Drive not connected. Please connect your Google Drive to manage wallets." },
        { status: 401 }
      );
    }
    const { data } = await getDriveData(token);
    if (!data.wallets) data.wallets = [];
    if (!data.walletTransfers) data.walletTransfers = [];

    const body = await req.json();
    const { action } = body;

    if (action === "transfer") {
      const { fromWalletId, toWalletId, amount, notes, date } = body;
      const numAmount = Number(amount);
      if (!fromWalletId || !toWalletId || !numAmount || numAmount <= 0) {
        return NextResponse.json({ error: "Invalid transfer parameters" }, { status: 400 });
      }

      if (fromWalletId === toWalletId) {
        return NextResponse.json({ error: "Source and destination wallets must be different" }, { status: 400 });
      }

      const fromWallet = data.wallets.find((w) => w._id === fromWalletId);
      const toWallet = data.wallets.find((w) => w._id === toWalletId);

      if (!fromWallet || !toWallet) {
        return NextResponse.json({ error: "One or both wallets not found" }, { status: 404 });
      }

      fromWallet.balance = (Number(fromWallet.balance) || 0) - numAmount;
      toWallet.balance = (Number(toWallet.balance) || 0) + numAmount;

      const transfer: WalletTransfer = {
        _id: crypto.randomUUID(),
        userId: data.users[0]?._id || "demo_user_alex",
        fromWalletId,
        toWalletId,
        fromWalletName: fromWallet.name,
        toWalletName: toWallet.name,
        amount: numAmount,
        date: date || new Date().toISOString(),
        notes: notes || `Transfer from ${fromWallet.name} to ${toWallet.name}`,
      };

      data.walletTransfers.push(transfer);
      await saveDriveData(token, data);

      return NextResponse.json({ success: true, transfer, wallets: data.wallets });
    }

    if (action === "update") {
      const { id, name, type, balance, color, icon, accountNumber, isDefault } = body;
      const idx = data.wallets.findIndex((w) => w._id === id);
      if (idx === -1) {
        return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
      }

      if (isDefault) {
        data.wallets.forEach((w) => (w.isDefault = false));
      }

      data.wallets[idx] = {
        ...data.wallets[idx],
        ...(name !== undefined && { name: name.trim() }),
        ...(type !== undefined && { type }),
        ...(balance !== undefined && { balance: Number(balance) }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
        ...(accountNumber !== undefined && { accountNumber }),
        ...(isDefault !== undefined && { isDefault }),
      };

      await saveDriveData(token, data);
      return NextResponse.json({ success: true, wallet: data.wallets[idx] });
    }

    if (action === "delete") {
      const { id } = body;
      data.wallets = data.wallets.filter((w) => w._id !== id);
      await saveDriveData(token, data);
      return NextResponse.json({ success: true });
    }

    // Default: Create wallet
    const { name, type = "cash", balance = 0, currency = "BDT", color, icon, accountNumber, isDefault } = body;
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Wallet name is required" }, { status: 400 });
    }

    const trimmedName = name.trim();
    // Check if wallet already exists
    const existing = data.wallets.find((w) => w.name.toLowerCase() === trimmedName.toLowerCase());
    if (existing) {
      existing.balance = Number(balance);
      if (type) existing.type = type;
      if (color) existing.color = color;
      if (icon) existing.icon = icon;
      await saveDriveData(token, data);
      return NextResponse.json({ success: true, wallet: existing, updated: true });
    }

    if (isDefault) {
      data.wallets.forEach((w) => (w.isDefault = false));
    }

    const defaultColors: Record<string, string> = {
      cash: "#10B981",
      bank: "#3B82F6",
      mfs: "#EC4899",
      card: "#8B5CF6",
      savings: "#F59E0B",
      other: "#64748B",
    };

    const newWallet: Wallet = {
      _id: crypto.randomUUID(),
      userId: data.users[0]?._id || "demo_user_alex",
      name: trimmedName,
      type,
      balance: Number(balance) || 0,
      currency,
      color: color || defaultColors[type] || "#10B981",
      icon: icon || (type === "bank" ? "Landmark" : type === "mfs" ? "Smartphone" : type === "card" ? "CreditCard" : type === "savings" ? "PiggyBank" : "Wallet"),
      accountNumber: accountNumber || undefined,
      isDefault: Boolean(isDefault),
      createdAt: new Date().toISOString(),
    };

    data.wallets.push(newWallet);
    await saveDriveData(token, data);

    return NextResponse.json({ success: true, wallet: newWallet });
  } catch (error) {
    console.error("Wallets POST error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
