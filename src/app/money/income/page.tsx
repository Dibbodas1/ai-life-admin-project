"use client";

import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp, Plus, Search, Filter, Loader2, ArrowUpRight,
  Landmark, Wallet as WalletIcon, Calendar, CheckCircle2,
  Trash2, Sparkles, CircleDollarSign, Repeat, ArrowDownLeft,
  Briefcase, BarChart3, LayoutGrid, TableProperties, X
} from "lucide-react";
import { formatCurrency, formatShortDate, formatDate, onDataUpdated, emitDataUpdated, apiFetch } from "@/lib/utils";
import { Wallet } from "@/lib/types";

interface IncomeItem {
  _id: string;
  amount: number;
  source: string;
  category: string;
  date: string | Date;
  isRecurring?: boolean;
  walletId?: string;
  walletName?: string;
  notes?: string;
}

const INCOME_CATEGORIES = [
  { id: "Salary", label: "Salary / Employment", color: "#10B981" },
  { id: "Freelance", label: "Freelance / Contract", color: "#06B6D4" },
  { id: "Investments", label: "Investments & Dividends", color: "#8B5CF6" },
  { id: "Consulting", label: "Consulting & Advisory", color: "#3B82F6" },
  { id: "Rental", label: "Rental & Real Estate", color: "#F59E0B" },
  { id: "Business", label: "Business Profits", color: "#EC4899" },
  { id: "Gift", label: "Gift / Transfer", color: "#14B8A6" },
  { id: "Other", label: "Other Inflow", color: "#94A3B8" },
];

export default function IncomePage() {
  const [income, setIncome] = useState<IncomeItem[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeTab, setActiveTab] = useState<"all" | "recurring" | "one-off">("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [formSource, setFormSource] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formCategory, setFormCategory] = useState("Salary");
  const [formWalletId, setFormWalletId] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formRecurring, setFormRecurring] = useState(false);
  const [formNotes, setFormNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [incomeRes, walletRes] = await Promise.all([
        apiFetch("/api/income"),
        apiFetch("/api/wallets"),
      ]);
      const incomeData = await incomeRes.json();
      const walletData = await walletRes.json();

      if (Array.isArray(incomeData)) setIncome(incomeData);
      else setIncome([]);

      if (walletData.wallets) setWallets(walletData.wallets);
    } catch (err) {
      console.error("Failed to load income data:", err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const cleanup = onDataUpdated(() => {
      fetchData(true);
    });
    return cleanup;
  }, []);

  const handleOpenAdd = () => {
    setFormSource("");
    setFormAmount("");
    setFormCategory("Salary");
    setFormWalletId(wallets[0]?._id || "");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormRecurring(false);
    setFormNotes("");
    setShowAddModal(true);
  };

  const handleSaveIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSource.trim() || !formAmount || Number(formAmount) <= 0) return;
    setSubmitting(true);

    const selectedWallet = wallets.find((w) => w._id === formWalletId);

    try {
      const res = await apiFetch("/api/income", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: formSource.trim(),
          amount: parseFloat(formAmount),
          category: formCategory,
          walletId: selectedWallet?._id,
          walletName: selectedWallet?.name,
          date: formDate,
          isRecurring: formRecurring,
          notes: formNotes || undefined,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        fetchData(true);
        emitDataUpdated();
      }
    } catch (err) {
      console.error("Error saving income:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteIncome = async (item: IncomeItem) => {
    if (!confirm(`Delete income record "${item.source}" (${formatCurrency(item.amount)})?`)) return;
    try {
      const res = await apiFetch("/api/income", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: item._id }),
      });
      if (res.ok) {
        fetchData(true);
        emitDataUpdated();
      }
    } catch (err) {
      console.error("Error deleting income:", err);
    }
  };

  // Metrics Calculations
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const totalThisMonth = useMemo(() => {
    return income
      .filter((i) => {
        const d = new Date(i.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  }, [income, currentMonth, currentYear]);

  const totalAllTime = useMemo(() => {
    return income.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  }, [income]);

  const uniqueSourcesCount = useMemo(() => {
    return new Set(income.map((i) => i.source.trim().toLowerCase())).size;
  }, [income]);

  const topSource = useMemo(() => {
    const sourceSums: Record<string, number> = {};
    income.forEach((i) => {
      const s = i.source.trim();
      sourceSums[s] = (sourceSums[s] || 0) + (Number(i.amount) || 0);
    });
    const sorted = Object.entries(sourceSums).sort(([, a], [, b]) => b - a);
    return sorted[0] ? { name: sorted[0][0], total: sorted[0][1] } : null;
  }, [income]);

  // Category Breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    income.forEach((i) => {
      const c = i.category || "Other";
      map[c] = (map[c] || 0) + (Number(i.amount) || 0);
    });
    return map;
  }, [income]);

  // Filtered List
  const filteredIncome = useMemo(() => {
    return income.filter((item) => {
      // Search
      const q = search.trim().toLowerCase();
      if (q) {
        const matchSource = item.source.toLowerCase().includes(q);
        const matchCat = (item.category || "").toLowerCase().includes(q);
        const matchWallet = (item.walletName || "").toLowerCase().includes(q);
        const matchNotes = (item.notes || "").toLowerCase().includes(q);
        if (!matchSource && !matchCat && !matchWallet && !matchNotes) return false;
      }

      // Category
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }

      // Recurrence Tab
      if (activeTab === "recurring" && !item.isRecurring) return false;
      if (activeTab === "one-off" && item.isRecurring) return false;

      return true;
    });
  }, [income, search, selectedCategory, activeTab]);

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "28px", paddingBottom: "60px" }} className="animate-fade-in">
        {/* 1. Top Header & Primary Action */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(6, 182, 212, 0.2) 100%)",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 20px rgba(16, 185, 129, 0.2)",
              }}>
                <TrendingUp size={22} color="#34D399" />
              </div>
              <div>
                <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", margin: 0 }}>
                  Income &amp; Cash Inflow
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "2px", margin: 0 }}>
                  Track earnings, salary deposits, freelance retainers, and capital inflows.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            {/* Display Mode Toggle */}
            <div style={{
              display: "flex",
              background: "rgba(15, 23, 42, 0.8)",
              padding: "4px",
              borderRadius: "14px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              gap: "4px",
            }}>
              <button
                onClick={() => setViewMode("cards")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 14px",
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  background: viewMode === "cards" ? "linear-gradient(135deg, #10B981, #059669)" : "transparent",
                  color: viewMode === "cards" ? "#FFFFFF" : "var(--text-secondary)",
                  boxShadow: viewMode === "cards" ? "0 4px 12px rgba(16, 185, 129, 0.3)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                <LayoutGrid size={14} />
                <span>Inflow Cards</span>
              </button>

              <button
                onClick={() => setViewMode("table")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 14px",
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  background: viewMode === "table" ? "linear-gradient(135deg, #10B981, #059669)" : "transparent",
                  color: viewMode === "table" ? "#FFFFFF" : "var(--text-secondary)",
                  boxShadow: viewMode === "table" ? "0 4px 12px rgba(16, 185, 129, 0.3)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                <TableProperties size={14} />
                <span>Inflow Sheet</span>
              </button>
            </div>

            <button
              onClick={handleOpenAdd}
              className="pill-btn pill-btn-primary"
              style={{
                padding: "10px 22px",
                background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                boxShadow: "0 4px 16px rgba(16, 185, 129, 0.35)",
              }}
            >
              <Plus size={16} />
              <span>Record Income</span>
            </button>
          </div>
        </div>

        {/* 2. Executive Cash Flow KPI Cockpit (Frosted Dark Glass) */}
        <div className="grid-responsive-kpi">
          {/* KPI 1: Earned This Month */}
          <div className="glass-panel" style={{ padding: "24px", position: "relative", overflow: "hidden" }}>
            <div style={{
              position: "absolute",
              top: "-20%",
              right: "-15%",
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px" }}>
                EARNED THIS MONTH
              </span>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <TrendingUp size={18} color="#34D399" />
              </div>
            </div>
            <div style={{ fontSize: "30px", fontWeight: 900, color: "#34D399", letterSpacing: "-0.5px" }}>
              +{formatCurrency(totalThisMonth)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", fontSize: "12px", color: "var(--text-secondary)" }}>
              <span>Recorded in {now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
            </div>
          </div>

          {/* KPI 2: All-Time Cumulative Inflow */}
          <div className="glass-panel" style={{ padding: "24px", position: "relative", overflow: "hidden" }}>
            <div style={{
              position: "absolute",
              top: "-20%",
              right: "-15%",
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(6, 182, 212, 0.2) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px" }}>
                ALL-TIME ACCUMULATED INFLOW
              </span>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(6, 182, 212, 0.15)",
                border: "1px solid rgba(6, 182, 212, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <CircleDollarSign size={18} color="#22D3EE" />
              </div>
            </div>
            <div style={{ fontSize: "30px", fontWeight: 900, color: "#F8FAFC", letterSpacing: "-0.5px" }}>
              {formatCurrency(totalAllTime)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", fontSize: "12px", color: "var(--text-secondary)" }}>
              <strong style={{ color: "#22D3EE" }}>{income.length}</strong> total deposits logged
            </div>
          </div>

          {/* KPI 3: Top Inflow Stream */}
          <div className="glass-panel" style={{ padding: "24px", position: "relative", overflow: "hidden" }}>
            <div style={{
              position: "absolute",
              top: "-20%",
              right: "-15%",
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px" }}>
                TOP INFLOW STREAM
              </span>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(99, 102, 241, 0.15)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Briefcase size={18} color="#818CF8" />
              </div>
            </div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#F8FAFC", letterSpacing: "-0.2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {topSource ? topSource.name : "None logged"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", fontSize: "12px", color: "var(--text-secondary)" }}>
              {topSource ? (
                <>Generated <strong style={{ color: "#34D399" }}>{formatCurrency(topSource.total)}</strong> total</>
              ) : (
                "Record your salary or clients"
              )}
            </div>
          </div>

          {/* KPI 4: Active Income Streams */}
          <div className="glass-panel" style={{ padding: "24px", position: "relative", overflow: "hidden" }}>
            <div style={{
              position: "absolute",
              top: "-20%",
              right: "-15%",
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px" }}>
                ACTIVE INFLOW SOURCES
              </span>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Repeat size={18} color="#FBBF24" />
              </div>
            </div>
            <div style={{ fontSize: "30px", fontWeight: 900, color: "#FBBF24", letterSpacing: "-0.5px" }}>
              {uniqueSourcesCount}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", fontSize: "12px", color: "var(--text-secondary)" }}>
              <span>{income.filter((i) => i.isRecurring).length} recurring monthly retainers</span>
            </div>
          </div>
        </div>

        {/* 3. Category Inflow Distribution Bar */}
        <div className="glass-panel" style={{ padding: "26px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h3 style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                Inflow Distribution by Category
              </h3>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px", margin: 0 }}>
                Proportional breakdown of earnings across employment, consulting, freelance, and capital returns
              </p>
            </div>
            <span style={{ fontSize: "13px", fontWeight: 800, color: "#34D399" }}>
              Total: {formatCurrency(totalAllTime)}
            </span>
          </div>

          {/* Distribution Bar */}
          <div style={{
            height: "12px",
            borderRadius: "9999px",
            background: "rgba(255, 255, 255, 0.05)",
            overflow: "hidden",
            display: "flex",
            marginBottom: "16px",
          }}>
            {Object.entries(categoryBreakdown).map(([cat, amt]) => {
              if (amt <= 0 || totalAllTime <= 0) return null;
              const pct = (amt / totalAllTime) * 100;
              const cfg = INCOME_CATEGORIES.find((c) => c.id === cat) || { color: "#10B981" };
              return (
                <div
                  key={cat}
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: cfg.color,
                    transition: "width 0.4s ease",
                  }}
                  title={`${cat}: ${formatCurrency(amt)} (${pct.toFixed(1)}%)`}
                />
              );
            })}
          </div>

          {/* Category Badges */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {Object.entries(categoryBreakdown).map(([cat, amt]) => {
              if (amt <= 0) return null;
              const pct = totalAllTime > 0 ? ((amt / totalAllTime) * 100).toFixed(0) : "0";
              const cfg = INCOME_CATEGORIES.find((c) => c.id === cat) || { color: "#10B981" };
              return (
                <div
                  key={cat}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 12px",
                    borderRadius: "10px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    fontSize: "12px",
                  }}
                >
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: cfg.color }} />
                  <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{cat}</span>
                  <span style={{ fontWeight: 800, color: "var(--text-primary)" }}>{formatCurrency(amt)}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Filter Tabs & Search Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          {/* Pills Tabs */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {[
              { id: "all", label: "All Inflows", count: income.length },
              { id: "recurring", label: "Recurring Streams", count: income.filter((i) => i.isRecurring).length },
              { id: "one-off", label: "One-Off Deposits", count: income.filter((i) => !i.isRecurring).length },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "9999px",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: isActive ? "1px solid #10B981" : "1px solid rgba(255, 255, 255, 0.08)",
                    cursor: "pointer",
                    background: isActive ? "linear-gradient(135deg, #10B981 0%, #059669 100%)" : "rgba(15, 23, 42, 0.7)",
                    color: isActive ? "#FFFFFF" : "var(--text-secondary)",
                    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    boxShadow: isActive ? "0 4px 14px rgba(16, 185, 129, 0.3)" : "none",
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

          {/* Search & Category Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ position: "relative", minWidth: "240px" }}>
              <Search size={15} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Search source or note..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="modern-input"
                style={{ paddingLeft: "38px", height: "40px", borderRadius: "9999px" }}
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="modern-input"
              style={{ height: "40px", borderRadius: "9999px", paddingRight: "28px", width: "auto" }}
            >
              <option value="all">All Categories</option>
              {INCOME_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 5. Inflow Display: Cards vs Sheet Table */}
        {filteredIncome.length === 0 ? (
          <div className="glass-panel" style={{ padding: "50px", textAlign: "center", color: "var(--text-secondary)" }}>
            <TrendingUp size={44} style={{ margin: "0 auto 14px", opacity: 0.3, color: "#34D399" }} />
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>No Income Records Found</h3>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "6px", maxWidth: "420px", margin: "6px auto 0" }}>
              Click &quot;Record Income&quot; to log earnings or ask AI: &quot;salary 85000 tk income add koro&quot;.
            </p>
          </div>
        ) : viewMode === "cards" ? (
          /* Cards Grid */
          <div className="grid-responsive-cards">
            {filteredIncome.map((item) => {
              const cfg = INCOME_CATEGORIES.find((c) => c.id === item.category) || { color: "#10B981" };

              return (
                <div
                  key={item._id}
                  className="glass-panel"
                  style={{
                    padding: "24px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "16px",
                    transition: "all 0.25s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = "0 18px 40px -6px rgba(0, 0, 0, 0.6), 0 0 20px rgba(16, 185, 129, 0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "var(--card-shadow)";
                  }}
                >
                  <div>
                    {/* Top Row: Category + Recurrence Badge + Delete */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          color: cfg.color,
                          background: `${cfg.color}18`,
                          border: `1px solid ${cfg.color}35`,
                          padding: "3px 10px",
                          borderRadius: "9999px",
                        }}>
                          {item.category}
                        </span>

                        {item.isRecurring && (
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "10px",
                            fontWeight: 800,
                            color: "#818CF8",
                            background: "rgba(99, 102, 241, 0.15)",
                            border: "1px solid rgba(99, 102, 241, 0.3)",
                            padding: "3px 8px",
                            borderRadius: "6px",
                          }}>
                            <Repeat size={10} />
                            <span>RECURRING</span>
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteIncome(item)}
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "50%",
                          background: "rgba(239, 68, 68, 0.12)",
                          border: "none",
                          color: "#FCA5A5",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.25)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.12)")}
                        title="Delete Record"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Source Name & Inflow Amount */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                      <div style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "14px",
                        background: "linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.3) 100%)",
                        border: "1px solid rgba(16, 185, 129, 0.4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        fontWeight: 800,
                        color: "#34D399",
                        flexShrink: 0,
                      }}>
                        {item.source ? item.source[0].toUpperCase() : "$"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#F8FAFC", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.source}
                        </h3>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                          📅 {formatDate(item.date)}
                        </div>
                      </div>
                    </div>

                    {/* Big Amount */}
                    <div style={{
                      fontSize: "28px",
                      fontWeight: 900,
                      color: "#34D399",
                      letterSpacing: "-0.5px",
                      marginBottom: "12px",
                    }}>
                      +{formatCurrency(item.amount)}
                    </div>

                    {/* Destination Wallet Tag */}
                    {item.walletName && (
                      <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                        color: "#A5B4FC",
                        background: "rgba(99, 102, 241, 0.12)",
                        border: "1px solid rgba(99, 102, 241, 0.25)",
                        padding: "4px 10px",
                        borderRadius: "8px",
                      }}>
                        <WalletIcon size={12} />
                        <span>Deposited to: <strong>{item.walletName}</strong></span>
                      </div>
                    )}

                    {/* Notes */}
                    {item.notes && (
                      <p style={{ fontSize: "12px", color: "var(--text-secondary)", fontStyle: "italic", margin: "10px 0 0", lineHeight: 1.4 }}>
                        &quot;{item.notes}&quot;
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* High-Density Sheet Table */
          <div className="glass-panel" style={{ padding: "clamp(18px, 3vw, 24px)" }}>
            <div className="table-responsive-container">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", textAlign: "left" }}>
                  <th style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: "11px", fontWeight: 700 }}>DATE</th>
                  <th style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: "11px", fontWeight: 700 }}>SOURCE / PAYER</th>
                  <th style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: "11px", fontWeight: 700 }}>CATEGORY</th>
                  <th style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: "11px", fontWeight: 700 }}>DESTINATION WALLET</th>
                  <th style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: "11px", fontWeight: 700, textAlign: "right" }}>AMOUNT</th>
                  <th style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: "11px", fontWeight: 700, textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncome.map((item) => {
                  const cfg = INCOME_CATEGORIES.find((c) => c.id === item.category) || { color: "#10B981" };
                  return (
                    <tr
                      key={item._id}
                      style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}
                    >
                      <td style={{ padding: "14px", color: "var(--text-secondary)" }}>
                        {formatShortDate(item.date)}
                      </td>
                      <td style={{ padding: "14px" }}>
                        <div style={{ fontWeight: 800, color: "#F8FAFC" }}>{item.source}</div>
                        {item.notes && <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{item.notes}</div>}
                      </td>
                      <td style={{ padding: "14px" }}>
                        <span style={{
                          padding: "3px 8px",
                          borderRadius: "9999px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: `${cfg.color}18`,
                          color: cfg.color,
                          border: `1px solid ${cfg.color}35`,
                        }}>
                          {item.category}
                        </span>
                      </td>
                      <td style={{ padding: "14px", color: "#A5B4FC" }}>
                        {item.walletName ? `💳 ${item.walletName}` : "—"}
                      </td>
                      <td style={{ padding: "14px", textAlign: "right", fontWeight: 900, color: "#34D399", fontSize: "15px" }}>
                        +{formatCurrency(item.amount)}
                      </td>
                      <td style={{ padding: "14px", textAlign: "right" }}>
                        <button
                          onClick={() => handleDeleteIncome(item)}
                          style={{ background: "none", border: "none", color: "#FCA5A5", cursor: "pointer", padding: "4px" }}
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Brand New Screen-Centered Record Income Modal */}
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
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <TrendingUp size={20} color="#34D399" />
                <h3 style={{ fontSize: "19px", fontWeight: 800, color: "#F8FAFC", margin: 0 }}>
                  Record New Income / Inflow
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: "rgba(255, 255, 255, 0.08)", border: "none", borderRadius: "50%", width: "32px", height: "32px", color: "#94A3B8", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveIncome} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                  INCOME SOURCE / PAYER *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp Salary, Upwork Client, Google AdSense"
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                  className="modern-input"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                    AMOUNT ($) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="1"
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="modern-input"
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                    DEPOSIT DATE *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="modern-input"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                    CATEGORY
                  </label>
                  <select
                    className="modern-input"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    style={{ background: "rgba(15, 23, 42, 0.95)" }}
                  >
                    {INCOME_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                    DEPOSIT TO WALLET
                  </label>
                  <select
                    className="modern-input"
                    value={formWalletId}
                    onChange={(e) => setFormWalletId(e.target.value)}
                    style={{ background: "rgba(15, 23, 42, 0.95)" }}
                  >
                    <option value="">No Wallet Linked</option>
                    {wallets.map((w) => (
                      <option key={w._id} value={w._id}>
                        {w.name} ({formatCurrency(w.balance)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Recurring Stream Toggle */}
              <div style={{
                background: "rgba(255, 255, 255, 0.04)",
                padding: "12px 16px",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", fontWeight: 700, color: "#F8FAFC", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={formRecurring}
                    onChange={(e) => setFormRecurring(e.target.checked)}
                    style={{ width: "18px", height: "18px", accentColor: "#10B981", cursor: "pointer" }}
                  />
                  <span>Mark as Recurring Monthly Stream</span>
                </label>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                  MEMO / NOTES (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="e.g. September bonus, milestone 2 payment"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="modern-input"
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
                  style={{
                    flex: 1.5,
                    background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                    boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)",
                  }}
                >
                  {submitting ? "Recording..." : "Save Inflow"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
