"use client";

import { useState, useEffect } from "react";
import {
  Wallet as WalletIcon, Plus, ArrowRightLeft, Landmark, Smartphone,
  CreditCard, PiggyBank, Edit2, Trash2, Check, ArrowUpRight,
  ArrowDownLeft, Clock, Search, ShieldCheck, Eye, EyeOff,
  MoreHorizontal, ChevronRight, Sparkles, X, ChevronDown
} from "lucide-react";
import { Wallet, WalletTransfer } from "@/lib/types";
import { formatCurrency, formatShortDate, onDataUpdated, emitDataUpdated, apiFetch } from "@/lib/utils";

const WALLET_TYPE_CONFIG: Record<string, { label: string; icon: any; gradient: string; accent: string }> = {
  bank: {
    label: "Bank Account",
    icon: Landmark,
    gradient: "linear-gradient(135deg, #1E3A8A 0%, #172554 60%, #0F172A 100%)",
    accent: "#3B82F6",
  },
  mfs: {
    label: "MFS (bKash/Nagad)",
    icon: Smartphone,
    gradient: "linear-gradient(135deg, #831843 0%, #500724 60%, #1E1B4B 100%)",
    accent: "#EC4899",
  },
  cash: {
    label: "Cash on Hand",
    icon: WalletIcon,
    gradient: "linear-gradient(135deg, #064E3B 0%, #022C22 60%, #0F172A 100%)",
    accent: "#10B981",
  },
  card: {
    label: "Credit/Debit Card",
    icon: CreditCard,
    gradient: "linear-gradient(135deg, #312E81 0%, #1E1B4B 60%, #0F172A 100%)",
    accent: "#8B5CF6",
  },
  savings: {
    label: "Savings & Reserve",
    icon: PiggyBank,
    gradient: "linear-gradient(135deg, #78350F 0%, #451A03 60%, #0F172A 100%)",
    accent: "#F59E0B",
  },
  other: {
    label: "Other Account",
    icon: WalletIcon,
    gradient: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
    accent: "#64748B",
  },
};

export default function WalletsPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transfers, setTransfers] = useState<WalletTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showBalance, setShowBalance] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Form states - Add/Edit Wallet
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"cash" | "bank" | "card" | "mfs" | "savings" | "other">("mfs");
  const [formBalance, setFormBalance] = useState("");
  const [formAccount, setFormAccount] = useState("");
  const [formColor, setFormColor] = useState("#EC4899");
  const [formIsDefault, setFormIsDefault] = useState(false);

  // Form states - Transfer
  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split("T")[0]);

  const [submitting, setSubmitting] = useState(false);

  const fetchWallets = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await apiFetch("/api/wallets");
      const data = await res.json();
      if (data.wallets) {
        setWallets(data.wallets);
        setTransfers(data.transfers || []);
      }
    } catch (err) {
      console.error("Failed to load wallets:", err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
    const cleanup = onDataUpdated(() => {
      fetchWallets(true);
    });
    return cleanup;
  }, []);

  const totalLiquidity = wallets.reduce((sum, w) => sum + (Number(w.balance) || 0), 0);

  const breakdown = wallets.reduce((acc, w) => {
    acc[w.type] = (acc[w.type] || 0) + (Number(w.balance) || 0);
    return acc;
  }, {} as Record<string, number>);

  const handleOpenAdd = () => {
    setEditingWallet(null);
    setFormName("");
    setFormType("mfs");
    setFormBalance("");
    setFormAccount("");
    setFormColor("#EC4899");
    setFormIsDefault(false);
    setShowAddModal(true);
  };

  const handleOpenEdit = (w: Wallet) => {
    setEditingWallet(w);
    setFormName(w.name);
    setFormType(w.type);
    setFormBalance(String(w.balance));
    setFormAccount(w.accountNumber || "");
    setFormColor(w.color || "#10B981");
    setFormIsDefault(Boolean(w.isDefault));
    setShowAddModal(true);
  };

  const handleOpenTransfer = (prefillFromId?: string) => {
    if (prefillFromId) {
      setTransferFrom(prefillFromId);
      const other = wallets.find((w) => w._id !== prefillFromId);
      setTransferTo(other ? other._id : "");
    } else {
      if (wallets.length >= 2) {
        setTransferFrom(wallets[0]._id);
        setTransferTo(wallets[1]._id);
      } else if (wallets.length === 1) {
        setTransferFrom(wallets[0]._id);
      }
    }
    setTransferAmount("");
    setTransferNotes("");
    setShowTransferModal(true);
  };

  const handleSaveWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setSubmitting(true);

    try {
      if (editingWallet) {
        const res = await apiFetch("/api/wallets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update",
            id: editingWallet._id,
            name: formName.trim(),
            type: formType,
            balance: Number(formBalance) || 0,
            accountNumber: formAccount || undefined,
            color: formColor,
            isDefault: formIsDefault,
          }),
        });
        if (res.ok) {
          setShowAddModal(false);
          fetchWallets(true);
          emitDataUpdated();
        }
      } else {
        const res = await apiFetch("/api/wallets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            type: formType,
            balance: Number(formBalance) || 0,
            accountNumber: formAccount || undefined,
            color: formColor,
            isDefault: formIsDefault,
          }),
        });
        if (res.ok) {
          setShowAddModal(false);
          fetchWallets(true);
          emitDataUpdated();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWallet = async (wallet: Wallet) => {
    if (!confirm(`Are you sure you want to remove wallet "${wallet.name}"?`)) return;
    try {
      const res = await apiFetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: wallet._id }),
      });
      if (res.ok) {
        fetchWallets(true);
        emitDataUpdated();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(transferAmount);
    if (!transferFrom || !transferTo || !amount || amount <= 0) return;
    if (transferFrom === transferTo) {
      alert("Source and destination wallets must be different");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "transfer",
          fromWalletId: transferFrom,
          toWalletId: transferTo,
          amount,
          notes: transferNotes || undefined,
          date: transferDate,
        }),
      });
      if (res.ok) {
        setShowTransferModal(false);
        fetchWallets(true);
        emitDataUpdated();
      } else {
        const json = await res.json();
        alert(json.error || "Failed to execute transfer");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredWallets = wallets.filter((w) => {
    const matchesCategory = selectedCategory === "all" || w.type === selectedCategory;
    const matchesSearch =
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      (w.accountNumber && w.accountNumber.includes(search));
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "28px", paddingBottom: "50px" }} className="animate-fade-in">
      {/* 1. Header Section with Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", margin: 0 }}>
            Wallets &amp; Accounts
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "4px", margin: 0 }}>
            Manage liquid accounts, bank vaults, MFS cards, and instantaneous multi-wallet transfers.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => handleOpenTransfer()}
            className="pill-btn pill-btn-dark"
            style={{ padding: "10px 20px" }}
          >
            <ArrowRightLeft size={16} color="#818CF8" />
            <span>Transfer Funds</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="pill-btn pill-btn-primary"
            style={{ padding: "10px 22px" }}
          >
            <Plus size={16} />
            <span>Add Custom Wallet</span>
          </button>
        </div>
      </div>

      {/* 2. Executive Net Liquidity & Allocation Overview (Frosted Dark Glass, 32px Padding) */}
      <div className="glass-panel" style={{ padding: "clamp(18px, 3.5vw, 32px)", position: "relative", overflow: "hidden" }}>
        <div className="grid-responsive-wallets-overview">
          {/* Left: Total Net Liquidity */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <ShieldCheck size={16} color="#10B981" />
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "1px" }}>
                Total Verified Net Liquidity
              </span>
              <button
                onClick={() => setShowBalance(!showBalance)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px" }}
              >
                {showBalance ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            </div>

            <div className="text-fluid-balance" style={{ color: "var(--text-primary)" }}>
              {showBalance ? formatCurrency(totalLiquidity) : "••••••••••"}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px" }}>
              <span className="badge-pill badge-pill-green">
                <Check size={11} /> {wallets.length} Accounts Synchronized
              </span>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Zero latency real-time tracking
              </span>
            </div>
          </div>

          {/* Right: Liquidity Distribution Bar & Badges */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
              <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>Liquidity Distribution</span>
              <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>By Account Type</span>
            </div>

            {/* Proportional Segmented Progress Bar */}
            <div style={{
              height: "10px",
              borderRadius: "9999px",
              background: "rgba(255, 255, 255, 0.08)",
              display: "flex",
              overflow: "hidden",
              gap: "2px",
            }}>
              {["bank", "mfs", "cash", "card", "savings"].map((type) => {
                const amt = breakdown[type] || 0;
                if (!amt || totalLiquidity === 0) return null;
                const pct = (amt / totalLiquidity) * 100;
                const color = WALLET_TYPE_CONFIG[type]?.accent || "#6366F1";
                return (
                  <div
                    key={type}
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: color,
                      transition: "width 0.4s ease",
                    }}
                    title={`${WALLET_TYPE_CONFIG[type]?.label}: ${formatCurrency(amt)} (${pct.toFixed(1)}%)`}
                  />
                );
              })}
            </div>

            {/* Allocation Badges */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {["bank", "mfs", "cash", "savings", "card"].map((type) => {
                const amt = breakdown[type] || 0;
                if (!amt && selectedCategory !== "all") return null;
                const pct = totalLiquidity > 0 ? Math.round((amt / totalLiquidity) * 100) : 0;
                const cfg = WALLET_TYPE_CONFIG[type];
                return (
                  <div
                    key={type}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      borderRadius: "10px",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      fontSize: "12px",
                    }}
                  >
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: cfg?.accent || "#6366F1" }} />
                    <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{cfg?.label.split(" ")[0]}</span>
                    <span style={{ fontWeight: 800, color: "var(--text-primary)" }}>{formatCurrency(amt)}</span>
                    <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Category Filter Tabs & Instant Search Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        {/* Filter Pills */}
        <div className="mobile-scroll-x" style={{ gap: "8px", maxWidth: "100%" }}>
          {[
            { id: "all", label: "All Accounts", count: wallets.length },
            { id: "bank", label: "Banks", count: wallets.filter(w => w.type === "bank").length },
            { id: "mfs", label: "MFS", count: wallets.filter(w => w.type === "mfs").length },
            { id: "cash", label: "Cash", count: wallets.filter(w => w.type === "cash").length },
            { id: "card", label: "Cards", count: wallets.filter(w => w.type === "card").length },
            { id: "savings", label: "Savings", count: wallets.filter(w => w.type === "savings").length },
          ].map((tab) => {
            const isActive = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "9999px",
                  fontSize: "13px",
                  fontWeight: 600,
                  border: isActive ? "1px solid #6366F1" : "1px solid rgba(255, 255, 255, 0.08)",
                  cursor: "pointer",
                  background: isActive ? "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)" : "rgba(15, 23, 42, 0.7)",
                  color: isActive ? "#FFFFFF" : "var(--text-secondary)",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  boxShadow: isActive ? "0 4px 14px rgba(99, 102, 241, 0.3)" : "none",
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  marginLeft: "6px",
                  fontSize: "11px",
                  opacity: isActive ? 1 : 0.6,
                  fontWeight: 700,
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div style={{ position: "relative", minWidth: "260px" }}>
          <Search size={15} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search wallet name or account..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="modern-input"
            style={{ paddingLeft: "38px", height: "40px", borderRadius: "9999px" }}
          />
        </div>
      </div>

      {/* 4. Luxury Physical Card Mockups (Generous 24px Gaps) */}
      {filteredWallets.length === 0 ? (
        <div className="glass-panel" style={{ padding: "50px", textAlign: "center", color: "var(--text-secondary)" }}>
          <WalletIcon size={44} style={{ margin: "0 auto 14px", opacity: 0.3, color: "#818CF8" }} />
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>No Accounts Found</h3>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "6px", maxWidth: "400px", margin: "6px auto 0" }}>
            Click &quot;Add Custom Wallet&quot; or ask your AI Copilot: &quot;amar bkash wallet e 2500 tk add koro&quot;.
          </p>
        </div>
      ) : (
        <div className="grid-responsive-cards">
          {filteredWallets.map((wallet) => {
            const cfg = WALLET_TYPE_CONFIG[wallet.type] || WALLET_TYPE_CONFIG.other;
            const Icon = cfg.icon;

            return (
              <div
                key={wallet._id}
                style={{
                  background: cfg.gradient,
                  borderRadius: "24px",
                  padding: "26px",
                  color: "#FFFFFF",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: "0 14px 36px -8px rgba(0, 0, 0, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: "220px",
                  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = `0 20px 48px -8px rgba(0, 0, 0, 0.8), 0 0 24px ${cfg.accent}33`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 14px 36px -8px rgba(0, 0, 0, 0.6)";
                }}
              >
                {/* Radial ambient sheen */}
                <div style={{
                  position: "absolute",
                  top: "-30%",
                  right: "-20%",
                  width: "200px",
                  height: "200px",
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${cfg.accent}40 0%, transparent 70%)`,
                  pointerEvents: "none",
                }} />

                {/* Top Card Row */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "12px",
                        background: "rgba(255, 255, 255, 0.15)",
                        backdropFilter: "blur(8px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                      }}>
                        <Icon size={18} color="#FFFFFF" />
                      </div>
                      <div>
                        <div style={{ fontSize: "15px", fontWeight: 800, letterSpacing: "-0.2px" }}>{wallet.name}</div>
                        <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.7)", fontWeight: 500 }}>
                          {cfg.label}
                        </div>
                      </div>
                    </div>

                    {/* Default Tag or Chip */}
                    {wallet.isDefault ? (
                      <span style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        background: "rgba(16, 185, 129, 0.25)",
                        color: "#34D399",
                        padding: "3px 8px",
                        borderRadius: "9999px",
                        border: "1px solid rgba(52, 211, 153, 0.4)",
                      }}>
                        PRIMARY
                      </span>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "26px", height: "18px", borderRadius: "4px", background: "rgba(255, 215, 0, 0.35)", border: "1px solid rgba(255, 215, 0, 0.6)" }} />
                      </div>
                    )}
                  </div>

                  {/* Masked Account Number / Digits */}
                  <div style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", fontFamily: "monospace", letterSpacing: "1.5px", marginBottom: "14px" }}>
                    {wallet.accountNumber ? `•••• ${wallet.accountNumber.slice(-4)}` : "•••• •••• 4765"}
                  </div>

                  {/* Big Formatted Balance */}
                  <div style={{ fontSize: "28px", fontWeight: 900, letterSpacing: "-0.5px" }}>
                    {showBalance ? formatCurrency(wallet.balance) : "••••••••••"}
                  </div>
                </div>

                {/* Card Bottom Actions Bar */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: "16px",
                  marginTop: "16px",
                  borderTop: "1px solid rgba(255, 255, 255, 0.12)",
                }}>
                  <button
                    onClick={() => handleOpenTransfer(wallet._id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "rgba(255, 255, 255, 0.15)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      color: "#FFFFFF",
                      padding: "6px 14px",
                      borderRadius: "9999px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)"; }}
                  >
                    <ArrowRightLeft size={13} />
                    <span>Transfer</span>
                  </button>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      onClick={() => handleOpenEdit(wallet)}
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: "rgba(255, 255, 255, 0.1)",
                        border: "none",
                        color: "#FFFFFF",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s ease",
                      }}
                      title="Edit Wallet"
                    >
                      <Edit2 size={14} />
                    </button>
                    {wallets.length > 1 && (
                      <button
                        onClick={() => handleDeleteWallet(wallet)}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background: "rgba(239, 68, 68, 0.2)",
                          border: "none",
                          color: "#FCA5A5",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.2s ease",
                        }}
                        title="Delete Wallet"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Intra-Wallet Transfer History Section */}
      <div className="glass-panel" style={{ padding: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h3 style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
              Transfer History
            </h3>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px", margin: 0 }}>
              Audit trail of fund reallocations and intra-wallet movements
            </p>
          </div>
          <button
            onClick={() => handleOpenTransfer()}
            className="pill-btn pill-btn-dark"
            style={{ fontSize: "12px", padding: "6px 14px" }}
          >
            <ArrowRightLeft size={13} />
            <span>New Transfer</span>
          </button>
        </div>

        {transfers.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
            No internal transfers recorded yet. Click &quot;Transfer Funds&quot; to reallocate balances.
          </div>
        ) : (
          <div className="table-responsive-container">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", textAlign: "left" }}>
                  <th style={{ padding: "10px 12px", color: "var(--text-muted)", fontSize: "11px", fontWeight: 700 }}>MOVEMENT</th>
                  <th style={{ padding: "10px 12px", color: "var(--text-muted)", fontSize: "11px", fontWeight: 700 }}>DATE</th>
                  <th style={{ padding: "10px 12px", color: "var(--text-muted)", fontSize: "11px", fontWeight: 700 }}>NOTE</th>
                  <th style={{ padding: "10px 12px", color: "var(--text-muted)", fontSize: "11px", fontWeight: 700, textAlign: "right" }}>AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {transfers.slice(0, 10).map((t, idx) => {
                  const fromW = wallets.find((w) => w._id === t.fromWalletId);
                  const toW = wallets.find((w) => w._id === t.toWalletId);
                  return (
                    <tr
                      key={t._id || idx}
                      style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}
                    >
                      <td style={{ padding: "14px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700 }}>
                          <span style={{ color: "#F8FAFC" }}>{fromW?.name || "Source Account"}</span>
                          <ChevronRight size={14} color="#818CF8" />
                          <span style={{ color: "#34D399" }}>{toW?.name || "Destination Account"}</span>
                        </div>
                      </td>
                      <td style={{ padding: "14px 12px", color: "var(--text-muted)", fontSize: "12px" }}>
                        {formatShortDate(t.date)}
                      </td>
                      <td style={{ padding: "14px 12px", color: "var(--text-secondary)" }}>
                        {t.notes || "Balance reallocation"}
                      </td>
                      <td style={{ padding: "14px 12px", textAlign: "right", fontWeight: 800, color: "#818CF8" }}>
                        {formatCurrency(t.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>

    {/* Modal: Add / Edit Wallet */}
    {showAddModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px",
          margin: 0,
        }}>
          <div className="modal-responsive-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
              <h3 style={{ fontSize: "19px", fontWeight: 800, color: "#F8FAFC", margin: 0 }}>
                {editingWallet ? "Edit Account Details" : "Add Custom Account / Wallet"}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: "rgba(255, 255, 255, 0.08)", border: "none", borderRadius: "50%", width: "32px", height: "32px", color: "#94A3B8", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveWallet} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                  ACCOUNT / WALLET NAME
                </label>
                <input
                  className="modern-input"
                  placeholder="e.g. City Bank Savings, bKash Personal, Main Cash"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                  ACCOUNT CATEGORY
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                  {[
                    { id: "mfs", label: "MFS" },
                    { id: "bank", label: "Bank" },
                    { id: "cash", label: "Cash" },
                    { id: "card", label: "Card" },
                    { id: "savings", label: "Savings" },
                    { id: "other", label: "Other" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormType(cat.id as any)}
                      style={{
                        padding: "10px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: 700,
                        border: formType === cat.id ? "1px solid #6366F1" : "1px solid rgba(255, 255, 255, 0.08)",
                        background: formType === cat.id ? "rgba(99, 102, 241, 0.2)" : "rgba(255, 255, 255, 0.04)",
                        color: formType === cat.id ? "#A5B4FC" : "#94A3B8",
                        cursor: "pointer",
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                  CURRENT BALANCE ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="modern-input"
                  placeholder="0.00"
                  value={formBalance}
                  onChange={(e) => setFormBalance(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                  ACCOUNT NUMBER / LAST 4 DIGITS (OPTIONAL)
                </label>
                <input
                  className="modern-input"
                  placeholder="e.g. 4765 or 01712345678"
                  value={formAccount}
                  onChange={(e) => setFormAccount(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="pill-btn pill-btn-ghost"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="pill-btn pill-btn-primary"
                  style={{ flex: 1.5 }}
                >
                  {submitting ? "Saving..." : editingWallet ? "Save Changes" : "Create Wallet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Transfer Funds */}
      {showTransferModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px",
          margin: 0,
        }}>
          <div className="modal-responsive-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <ArrowRightLeft size={20} color="#818CF8" />
                <h3 style={{ fontSize: "19px", fontWeight: 800, color: "#F8FAFC", margin: 0 }}>
                  Transfer Between Wallets
                </h3>
              </div>
              <button
                onClick={() => setShowTransferModal(false)}
                style={{ background: "rgba(255, 255, 255, 0.08)", border: "none", borderRadius: "50%", width: "32px", height: "32px", color: "#94A3B8", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                  FROM ACCOUNT (SOURCE)
                </label>
                <select
                  className="modern-input"
                  value={transferFrom}
                  onChange={(e) => setTransferFrom(e.target.value)}
                  style={{ background: "rgba(15, 23, 42, 0.95)" }}
                  required
                >
                  <option value="">Select source account...</option>
                  {wallets.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.name} ({formatCurrency(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                  TO ACCOUNT (DESTINATION)
                </label>
                <select
                  className="modern-input"
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  style={{ background: "rgba(15, 23, 42, 0.95)" }}
                  required
                >
                  <option value="">Select destination account...</option>
                  {wallets
                    .filter((w) => w._id !== transferFrom)
                    .map((w) => (
                      <option key={w._id} value={w._id}>
                        {w.name} ({formatCurrency(w.balance)})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                  TRANSFER AMOUNT ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="modern-input"
                  placeholder="0.00"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                  NOTE / PURPOSE (OPTIONAL)
                </label>
                <input
                  className="modern-input"
                  placeholder="e.g. ATM withdrawal, monthly savings top-up"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="pill-btn pill-btn-ghost"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="pill-btn pill-btn-primary"
                  style={{ flex: 1.5 }}
                >
                  {submitting ? "Processing..." : "Complete Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
