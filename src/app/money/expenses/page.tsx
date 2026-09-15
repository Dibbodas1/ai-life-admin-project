"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Receipt, Plus, Search, Filter, Loader2, Sparkles,
  TrendingDown, Calendar, Wallet as WalletIcon, Trash2,
  Tag, ArrowUpRight, BarChart3, LayoutGrid, TableProperties,
  Flame, CheckCircle2, X, AlertCircle
} from "lucide-react";
import { formatCurrency, formatShortDate, formatDate, onDataUpdated, emitDataUpdated, apiFetch } from "@/lib/utils";
import { Wallet } from "@/lib/types";

interface ExpenseItem {
  _id: string;
  amount: number;
  merchant: string;
  category: string;
  date: string | Date;
  walletId?: string;
  walletName?: string;
  notes?: string;
  aiCategorized?: boolean;
  aiConfidence?: number;
}

const CATEGORY_CONFIG: Record<string, { color: string; label: string }> = {
  Housing: { color: "#6366F1", label: "Housing & Rent" },
  "Food & Dining": { color: "#F59E0B", label: "Food & Dining" },
  Food: { color: "#F59E0B", label: "Food & Dining" },
  Groceries: { color: "#10B981", label: "Groceries & Market" },
  Transport: { color: "#3B82F6", label: "Transport & Fuel" },
  Utilities: { color: "#EAB308", label: "Utilities & Bills" },
  Shopping: { color: "#EC4899", label: "Shopping & Retail" },
  Entertainment: { color: "#8B5CF6", label: "Entertainment" },
  Health: { color: "#06B6D4", label: "Healthcare & Meds" },
  Education: { color: "#84CC16", label: "Education & Courses" },
  Subscriptions: { color: "#A855F7", label: "Subscriptions" },
  Travel: { color: "#F97316", label: "Travel & Vacations" },
  Personal: { color: "#64748B", label: "Personal Care" },
  Other: { color: "#94A3B8", label: "Other Outflow" },
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [formMerchant, setFormMerchant] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formCategory, setFormCategory] = useState("Food & Dining");
  const [formWalletId, setFormWalletId] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formNotes, setFormNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [aiResultToast, setAiResultToast] = useState<{ category: string; confidence: number } | null>(null);

  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [expRes, walletRes] = await Promise.all([
        apiFetch("/api/expenses?limit=100"),
        apiFetch("/api/wallets"),
      ]);
      const expData = await expRes.json();
      const walletData = await walletRes.json();

      if (Array.isArray(expData)) setExpenses(expData);
      else setExpenses([]);

      if (walletData.wallets) setWallets(walletData.wallets);
    } catch (err) {
      console.error("Failed to load expense data:", err);
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
    setFormMerchant("");
    setFormAmount("");
    setFormCategory("Food & Dining");
    setFormWalletId(wallets[0]?._id || "");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormNotes("");
    setShowAddModal(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMerchant.trim() || !formAmount || Number(formAmount) <= 0) return;
    setSubmitting(true);

    const selectedWallet = wallets.find((w) => w._id === formWalletId);

    try {
      const res = await apiFetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant: formMerchant.trim(),
          amount: parseFloat(formAmount),
          category: formCategory,
          walletId: selectedWallet?._id,
          walletName: selectedWallet?.name,
          date: formDate,
          notes: formNotes || undefined,
        }),
      });

      const created = await res.json();
      if (created.aiCategorized) {
        setAiResultToast({ category: created.category, confidence: created.aiConfidence });
        setTimeout(() => setAiResultToast(null), 5000);
      }

      setShowAddModal(false);
      fetchData(true);
      emitDataUpdated();
    } catch (err) {
      console.error("Error adding expense:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (item: ExpenseItem) => {
    if (!confirm(`Delete expense record "${item.merchant}" (${formatCurrency(item.amount)})?`)) return;
    try {
      const res = await apiFetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: item._id }),
      });
      if (res.ok) {
        fetchData(true);
        emitDataUpdated();
      }
    } catch (err) {
      console.error("Error deleting expense:", err);
    }
  };

  // Metrics Calculations
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const totalSpentThisMonth = useMemo(() => {
    return expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses, currentMonth, currentYear]);

  const totalAllTime = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses]);

  const dailyAverageBurn = useMemo(() => {
    const daysInCurrentMonth = new Date().getDate();
    return daysInCurrentMonth > 0 ? totalSpentThisMonth / daysInCurrentMonth : 0;
  }, [totalSpentThisMonth]);

  const topCategory = useMemo(() => {
    const catSums: Record<string, number> = {};
    expenses.forEach((e) => {
      const cat = e.category || "Other";
      catSums[cat] = (catSums[cat] || 0) + (Number(e.amount) || 0);
    });
    const sorted = Object.entries(catSums).sort(([, a], [, b]) => b - a);
    return sorted[0] ? { name: sorted[0][0], total: sorted[0][1] } : null;
  }, [expenses]);

  const aiClassifiedRatio = useMemo(() => {
    if (expenses.length === 0) return 0;
    const aiCount = expenses.filter((e) => e.aiCategorized).length;
    return Math.round((aiCount / expenses.length) * 100);
  }, [expenses]);

  // Category Breakdown Map
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      const cat = e.category || "Other";
      map[cat] = (map[cat] || 0) + (Number(e.amount) || 0);
    });
    return map;
  }, [expenses]);

  // Filtered List
  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const matchMerchant = item.merchant.toLowerCase().includes(q);
        const matchCat = (item.category || "").toLowerCase().includes(q);
        const matchWallet = (item.walletName || "").toLowerCase().includes(q);
        const matchNotes = (item.notes || "").toLowerCase().includes(q);
        if (!matchMerchant && !matchCat && !matchWallet && !matchNotes) return false;
      }

      if (filterCat !== "all" && item.category !== filterCat) {
        return false;
      }

      return true;
    });
  }, [expenses, search, filterCat]);

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "28px", paddingBottom: "60px" }} className="animate-fade-in">
        {/* 1. Header Section & Primary Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, rgba(244, 63, 94, 0.25) 0%, rgba(249, 115, 22, 0.2) 100%)",
                border: "1px solid rgba(244, 63, 94, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 20px rgba(244, 63, 94, 0.2)",
              }}>
                <Receipt size={22} color="#FB7185" />
              </div>
              <div>
                <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", margin: 0 }}>
                  Expenses &amp; Cash Outflow
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "2px", margin: 0 }}>
                  Monitor daily burn, merchant charges, AI-classified categories, and capital outflows.
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
                  background: viewMode === "cards" ? "linear-gradient(135deg, #F43F5E, #BE123C)" : "transparent",
                  color: viewMode === "cards" ? "#FFFFFF" : "var(--text-secondary)",
                  boxShadow: viewMode === "cards" ? "0 4px 12px rgba(244, 63, 94, 0.3)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                <LayoutGrid size={14} />
                <span>Expense Cards</span>
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
                  background: viewMode === "table" ? "linear-gradient(135deg, #F43F5E, #BE123C)" : "transparent",
                  color: viewMode === "table" ? "#FFFFFF" : "var(--text-secondary)",
                  boxShadow: viewMode === "table" ? "0 4px 12px rgba(244, 63, 94, 0.3)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                <TableProperties size={14} />
                <span>Expense Sheet</span>
              </button>
            </div>

            <button
              onClick={handleOpenAdd}
              className="pill-btn pill-btn-primary"
              style={{
                padding: "10px 22px",
                background: "linear-gradient(135deg, #F43F5E 0%, #BE123C 100%)",
                boxShadow: "0 4px 16px rgba(244, 63, 94, 0.35)",
              }}
            >
              <Plus size={16} />
              <span>Record Expense</span>
            </button>
          </div>
        </div>

        {/* AI Categorization Toast Notification */}
        {aiResultToast && (
          <div style={{
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(16, 185, 129, 0.15) 100%)",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            borderRadius: "16px",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            animation: "fadeIn 0.3s ease-out",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Sparkles size={18} color="#818CF8" />
              <span style={{ fontSize: "13px", color: "#F8FAFC" }}>
                AI classified as <strong>{aiResultToast.category}</strong> with {Math.round(aiResultToast.confidence * 100)}% confidence
              </span>
            </div>
            <button
              onClick={() => setAiResultToast(null)}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* 2. Executive Burn Rate KPI Cockpit (Frosted Dark Glass) */}
        <div className="grid-responsive-kpi">
          {/* KPI 1: Total Spent This Month */}
          <div className="glass-panel" style={{ padding: "24px", position: "relative", overflow: "hidden" }}>
            <div style={{
              position: "absolute",
              top: "-20%",
              right: "-15%",
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(244, 63, 94, 0.2) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px" }}>
                TOTAL SPENT THIS MONTH
              </span>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(244, 63, 94, 0.15)",
                border: "1px solid rgba(244, 63, 94, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <TrendingDown size={18} color="#FB7185" />
              </div>
            </div>
            <div style={{ fontSize: "30px", fontWeight: 900, color: "#FB7185", letterSpacing: "-0.5px" }}>
              {formatCurrency(totalSpentThisMonth)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", fontSize: "12px", color: "var(--text-secondary)" }}>
              <span>Burn rate in {now.toLocaleDateString("en-US", { month: "long" })}</span>
            </div>
          </div>

          {/* KPI 2: Daily Average Burn */}
          <div className="glass-panel" style={{ padding: "24px", position: "relative", overflow: "hidden" }}>
            <div style={{
              position: "absolute",
              top: "-20%",
              right: "-15%",
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(249, 115, 22, 0.2) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px" }}>
                DAILY AVERAGE BURN
              </span>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(249, 115, 22, 0.15)",
                border: "1px solid rgba(249, 115, 22, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Flame size={18} color="#FB923C" />
              </div>
            </div>
            <div style={{ fontSize: "30px", fontWeight: 900, color: "#FB923C", letterSpacing: "-0.5px" }}>
              {formatCurrency(dailyAverageBurn)}
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}> / day</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", fontSize: "12px", color: "var(--text-secondary)" }}>
              <span>Averaged across {now.getDate()} active days</span>
            </div>
          </div>

          {/* KPI 3: Top Outflow Category */}
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
                TOP EXPENSE AREA
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
                <BarChart3 size={18} color="#818CF8" />
              </div>
            </div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#F8FAFC", letterSpacing: "-0.2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {topCategory ? topCategory.name : "None logged"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", fontSize: "12px", color: "var(--text-secondary)" }}>
              {topCategory ? (
                <>Consumes <strong style={{ color: "#FB7185" }}>{formatCurrency(topCategory.total)}</strong> total</>
              ) : (
                "Add your expenses to view breakdown"
              )}
            </div>
          </div>

          {/* KPI 4: Total Outflow & AI Coverage */}
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
                AI COPILOT CATEGORIZATION
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
                <Sparkles size={18} color="#34D399" />
              </div>
            </div>
            <div style={{ fontSize: "30px", fontWeight: 900, color: "#34D399", letterSpacing: "-0.5px" }}>
              {aiClassifiedRatio}%
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", fontSize: "12px", color: "var(--text-secondary)" }}>
              <span>Auto-categorized across {expenses.length} records</span>
            </div>
          </div>
        </div>

        {/* 3. Category Outflow Breakdown Bar */}
        <div className="glass-panel" style={{ padding: "26px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h3 style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                Spending Allocation by Category
              </h3>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px", margin: 0 }}>
                Cumulative outflow matrix across food, housing, bills, shopping, and life expenses
              </p>
            </div>
            <span style={{ fontSize: "13px", fontWeight: 800, color: "#FB7185" }}>
              Total: {formatCurrency(totalAllTime)}
            </span>
          </div>

          {/* Progress Bar */}
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
              const cfg = CATEGORY_CONFIG[cat] || { color: "#94A3B8" };
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

          {/* Badges */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {Object.entries(categoryBreakdown).map(([cat, amt]) => {
              if (amt <= 0) return null;
              const pct = totalAllTime > 0 ? ((amt / totalAllTime) * 100).toFixed(0) : "0";
              const cfg = CATEGORY_CONFIG[cat] || { color: "#94A3B8" };
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
          {/* Quick Search */}
          <div style={{ position: "relative", minWidth: "260px" }}>
            <Search size={15} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search merchant, category, or note..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="modern-input"
              style={{ paddingLeft: "38px", height: "40px", borderRadius: "9999px" }}
            />
          </div>

          {/* Category Filter Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Filter size={15} color="var(--text-muted)" />
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="modern-input"
              style={{ height: "40px", borderRadius: "9999px", paddingRight: "28px", width: "auto" }}
            >
              <option value="all">All Categories ({expenses.length})</option>
              {Object.keys(CATEGORY_CONFIG).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 5. Expense Display: Cards vs Sheet Table */}
        {filteredExpenses.length === 0 ? (
          <div className="glass-panel" style={{ padding: "50px", textAlign: "center", color: "var(--text-secondary)" }}>
            <Receipt size={44} style={{ margin: "0 auto 14px", opacity: 0.3, color: "#FB7185" }} />
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>No Expense Records Found</h3>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "6px", maxWidth: "420px", margin: "6px auto 0" }}>
              Click &quot;Record Expense&quot; to log a purchase or tell AI: &quot;starbucks 450 tk expense add koro&quot;.
            </p>
          </div>
        ) : viewMode === "cards" ? (
          /* Cards Grid */
          <div className="grid-responsive-cards">
            {filteredExpenses.map((item) => {
              const cfg = CATEGORY_CONFIG[item.category] || { color: "#94A3B8", label: item.category };

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
                    e.currentTarget.style.boxShadow = "0 18px 40px -6px rgba(0, 0, 0, 0.6), 0 0 20px rgba(244, 63, 94, 0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "var(--card-shadow)";
                  }}
                >
                  <div>
                    {/* Top Row: Category + AI Badge + Delete */}
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
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                        }}>
                          {item.category}
                          {item.aiCategorized && <Sparkles size={10} />}
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteExpense(item)}
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

                    {/* Merchant & Outflow Amount */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                      <div style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "14px",
                        background: "linear-gradient(135deg, rgba(244, 63, 94, 0.25) 0%, rgba(190, 18, 60, 0.3) 100%)",
                        border: "1px solid rgba(244, 63, 94, 0.4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        fontWeight: 800,
                        color: "#FB7185",
                        flexShrink: 0,
                      }}>
                        {item.merchant ? item.merchant[0].toUpperCase() : "$"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#F8FAFC", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.merchant}
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
                      color: "#FB7185",
                      letterSpacing: "-0.5px",
                      marginBottom: "12px",
                    }}>
                      -{formatCurrency(item.amount)}
                    </div>

                    {/* Funding Wallet Tag */}
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
                        <span>Paid from: <strong>{item.walletName}</strong></span>
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
                  <th style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: "11px", fontWeight: 700 }}>MERCHANT / PAYEE</th>
                  <th style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: "11px", fontWeight: 700 }}>CATEGORY</th>
                  <th style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: "11px", fontWeight: 700 }}>FUNDING ACCOUNT</th>
                  <th style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: "11px", fontWeight: 700, textAlign: "right" }}>AMOUNT</th>
                  <th style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: "11px", fontWeight: 700, textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((item) => {
                  const cfg = CATEGORY_CONFIG[item.category] || { color: "#94A3B8" };
                  return (
                    <tr
                      key={item._id}
                      style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}
                    >
                      <td style={{ padding: "14px", color: "var(--text-secondary)" }}>
                        {formatShortDate(item.date)}
                      </td>
                      <td style={{ padding: "14px" }}>
                        <div style={{ fontWeight: 800, color: "#F8FAFC" }}>{item.merchant}</div>
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
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}>
                          {item.category}
                          {item.aiCategorized && <Sparkles size={10} />}
                        </span>
                      </td>
                      <td style={{ padding: "14px", color: "#A5B4FC" }}>
                        {item.walletName ? `💳 ${item.walletName}` : "—"}
                      </td>
                      <td style={{ padding: "14px", textAlign: "right", fontWeight: 900, color: "#FB7185", fontSize: "15px" }}>
                        -{formatCurrency(item.amount)}
                      </td>
                      <td style={{ padding: "14px", textAlign: "right" }}>
                        <button
                          onClick={() => handleDeleteExpense(item)}
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

      {/* MODAL: Brand New Screen-Centered Record Expense Modal */}
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
                <Receipt size={20} color="#FB7185" />
                <h3 style={{ fontSize: "19px", fontWeight: 800, color: "#F8FAFC", margin: 0 }}>
                  Record New Expense Outflow
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: "rgba(255, 255, 255, 0.08)", border: "none", borderRadius: "50%", width: "32px", height: "32px", color: "#94A3B8", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                  MERCHANT / PAYEE *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Starbucks, Shwapno, Netflix, Shell Gas"
                  value={formMerchant}
                  onChange={(e) => setFormMerchant(e.target.value)}
                  className="modern-input"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                    AMOUNT ($) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0.01"
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="modern-input"
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                    TRANSACTION DATE *
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
                    CATEGORY (AUTO-CLASSIFY)
                  </label>
                  <select
                    className="modern-input"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    style={{ background: "rgba(15, 23, 42, 0.95)" }}
                  >
                    {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                    PAID FROM WALLET
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

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                  NOTES / MEMO (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dinner with team, monthly fuel refill"
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
                    background: "linear-gradient(135deg, #F43F5E 0%, #BE123C 100%)",
                    boxShadow: "0 4px 14px rgba(244, 63, 94, 0.4)",
                  }}
                >
                  {submitting ? "Processing..." : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
