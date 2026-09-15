"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  CalendarClock,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  Edit2,
  Search,
  Filter,
  ShieldCheck,
  Wallet as WalletIcon,
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Landmark,
  Layers,
  LayoutGrid,
  BarChart3,
  Check,
  X,
  Tag,
  CircleDot
} from "lucide-react";
import { formatCurrency, formatShortDate, formatDate, onDataUpdated, emitDataUpdated, apiFetch } from "@/lib/utils";
import { PlannedExpense, Wallet } from "@/lib/types";

interface PlanningMetrics {
  totalPlanned: number;
  totalPaid: number;
  dueNext7DaysCount: number;
  dueNext7DaysAmount: number;
  highPriorityCount: number;
  totalLiquidity: number;
  remainingBuffer: number;
  bufferHealth: "healthy" | "deficit";
}

const CATEGORY_OPTIONS = [
  "Housing", "Groceries", "Utilities", "Transport", "Food & Dining",
  "Education", "Shopping", "Health", "Entertainment", "Personal", "Other"
];

const CATEGORY_COLORS: Record<string, { accent: string; bg: string; border: string }> = {
  Housing: { accent: "#6366F1", bg: "rgba(99, 102, 241, 0.15)", border: "rgba(99, 102, 241, 0.3)" },
  Groceries: { accent: "#10B981", bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.3)" },
  Utilities: { accent: "#F59E0B", bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.3)" },
  Transport: { accent: "#3B82F6", bg: "rgba(59, 130, 246, 0.15)", border: "rgba(59, 130, 246, 0.3)" },
  "Food & Dining": { accent: "#EC4899", bg: "rgba(236, 72, 153, 0.15)", border: "rgba(236, 72, 153, 0.3)" },
  Education: { accent: "#8B5CF6", bg: "rgba(139, 92, 246, 0.15)", border: "rgba(139, 92, 246, 0.3)" },
  Shopping: { accent: "#F97316", bg: "rgba(249, 115, 22, 0.15)", border: "rgba(249, 115, 22, 0.3)" },
  Health: { accent: "#06B6D4", bg: "rgba(6, 182, 212, 0.15)", border: "rgba(6, 182, 212, 0.3)" },
  Entertainment: { accent: "#A855F7", bg: "rgba(168, 85, 247, 0.15)", border: "rgba(168, 85, 247, 0.3)" },
  Personal: { accent: "#64748B", bg: "rgba(100, 116, 139, 0.15)", border: "rgba(100, 116, 139, 0.3)" },
  Other: { accent: "#94A3B8", bg: "rgba(148, 163, 184, 0.15)", border: "rgba(148, 163, 184, 0.3)" }
};

export default function MonthlyPlanningPage() {
  const [plans, setPlans] = useState<PlannedExpense[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [metrics, setMetrics] = useState<PlanningMetrics | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // View switch: "calendar" | "cards" | "breakdown"
  const [viewMode, setViewMode] = useState<"calendar" | "cards" | "breakdown">("calendar");

  // Calendar State
  const [currentCalendarDate, setCurrentCalendarDate] = useState(() => new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Filters
  const [activeStatusTab, setActiveStatusTab] = useState<"all" | "planned" | "paid" | "high">("all");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlannedExpense | null>(null);
  const [payingPlan, setPayingPlan] = useState<PlannedExpense | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDueDate, setFormDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [formCategory, setFormCategory] = useState("Housing");
  const [formPriority, setFormPriority] = useState<"high" | "medium" | "low">("high");
  const [formWalletId, setFormWalletId] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Pay Modal State
  const [payWalletId, setPayWalletId] = useState("");
  const [payDeductWallet, setPayDeductWallet] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch planning & wallet data
  const fetchPlanningData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [planRes, walletRes] = await Promise.all([
        apiFetch("/api/planning"),
        apiFetch("/api/wallets"),
      ]);
      const planData = await planRes.json();
      const walletData = await walletRes.json();

      if (planData.plans) {
        setPlans(planData.plans);
        setMetrics(planData.metrics);
        setCategoryBreakdown(planData.categoryBreakdown || {});
      }
      if (walletData.wallets) {
        setWallets(walletData.wallets);
      }
    } catch (err) {
      console.error("Failed to load monthly planning data:", err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanningData();
    const cleanup = onDataUpdated(() => {
      fetchPlanningData(true);
    });
    return cleanup;
  }, []);

  // Modal Handlers
  const handleOpenAdd = (prefillDate?: string) => {
    setEditingPlan(null);
    setFormTitle("");
    setFormAmount("");
    setFormDueDate(prefillDate || selectedCalendarDate || new Date().toISOString().split("T")[0]);
    setFormCategory("Housing");
    setFormPriority("high");
    setFormWalletId(wallets[0]?._id || "");
    setFormNotes("");
    setShowAddModal(true);
  };

  const handleOpenEdit = (plan: PlannedExpense) => {
    setEditingPlan(plan);
    setFormTitle(plan.title);
    setFormAmount(String(plan.amount));
    setFormDueDate(plan.dueDate ? plan.dueDate.split("T")[0] : new Date().toISOString().split("T")[0]);
    setFormCategory(plan.category || "General");
    setFormPriority(plan.priority || "medium");
    setFormWalletId(plan.walletId || "");
    setFormNotes(plan.notes || "");
    setShowAddModal(true);
  };

  const handleOpenPay = (plan: PlannedExpense) => {
    setPayingPlan(plan);
    setPayWalletId(plan.walletId || wallets[0]?._id || "");
    setPayDeductWallet(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formAmount || Number(formAmount) <= 0) return;
    setSubmitting(true);

    const selectedWallet = wallets.find((w) => w._id === formWalletId);

    try {
      if (editingPlan) {
        const res = await apiFetch("/api/planning", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update",
            id: editingPlan._id,
            title: formTitle.trim(),
            amount: Number(formAmount),
            dueDate: formDueDate,
            category: formCategory,
            priority: formPriority,
            walletId: selectedWallet?._id,
            walletName: selectedWallet?.name,
            notes: formNotes || undefined,
          }),
        });
        if (res.ok) {
          setShowAddModal(false);
          fetchPlanningData(true);
          emitDataUpdated();
        }
      } else {
        const res = await apiFetch("/api/planning", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formTitle.trim(),
            amount: Number(formAmount),
            dueDate: formDueDate,
            category: formCategory,
            priority: formPriority,
            walletId: selectedWallet?._id,
            walletName: selectedWallet?.name,
            notes: formNotes || undefined,
          }),
        });
        if (res.ok) {
          setShowAddModal(false);
          fetchPlanningData(true);
          emitDataUpdated();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecutePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingPlan) return;
    setSubmitting(true);

    const targetWallet = wallets.find((w) => w._id === payWalletId);

    try {
      const res = await apiFetch("/api/planning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "markPaid",
          id: payingPlan._id,
          walletId: targetWallet?._id,
          walletName: targetWallet?.name,
          deductWallet: payDeductWallet,
        }),
      });
      if (res.ok) {
        setPayingPlan(null);
        fetchPlanningData(true);
        emitDataUpdated();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePlan = async (plan: PlannedExpense) => {
    if (!confirm(`Are you sure you want to remove planned expense "${plan.title}"?`)) return;
    try {
      const res = await apiFetch("/api/planning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: plan._id }),
      });
      if (res.ok) {
        fetchPlanningData(true);
        emitDataUpdated();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkPlanned = async (plan: PlannedExpense) => {
    try {
      const res = await apiFetch("/api/planning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markPlanned", id: plan._id }),
      });
      if (res.ok) {
        fetchPlanningData(true);
        emitDataUpdated();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Days until & urgency helper
  const getDueStatus = (dueDateStr: string, status: string) => {
    if (status === "paid") {
      return { text: "Fulfilled / Paid", color: "#10B981", bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.3)", icon: CheckCircle2 };
    }
    if (!dueDateStr) {
      return { text: "No Target Date", color: "var(--text-muted)", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)", icon: Clock };
    }

    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)}d`, color: "#EF4444", bg: "rgba(239, 68, 68, 0.16)", border: "rgba(239, 68, 68, 0.35)", icon: AlertCircle };
    }
    if (diffDays === 0) {
      return { text: "Due Today", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.2)", border: "rgba(245, 158, 11, 0.4)", icon: AlertTriangle };
    }
    if (diffDays === 1) {
      return { text: "Due Tomorrow", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.16)", border: "rgba(245, 158, 11, 0.3)", icon: Clock };
    }
    if (diffDays <= 7) {
      return { text: `Due in ${diffDays}d`, color: "#06B6D4", bg: "rgba(6, 182, 212, 0.15)", border: "rgba(6, 182, 212, 0.3)", icon: Clock };
    }
    return { text: `Due in ${diffDays}d`, color: "var(--text-secondary)", bg: "rgba(255, 255, 255, 0.06)", border: "rgba(255, 255, 255, 0.1)", icon: Clock };
  };

  // Calendar Math and Grid Generation
  const calendarYear = currentCalendarDate.getFullYear();
  const calendarMonth = currentCalendarDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentCalendarDate(new Date(calendarYear, calendarMonth - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentCalendarDate(new Date(calendarYear, calendarMonth + 1, 1));
  };
  const handleCurrentMonth = () => {
    setCurrentCalendarDate(new Date());
  };

  const calendarGridDays = useMemo(() => {
    const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const prevMonthDays = new Date(calendarYear, calendarMonth, 0).getDate();

    const todayStr = new Date().toISOString().split("T")[0];

    const days = [];

    // Preceding month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const month = calendarMonth === 0 ? 12 : calendarMonth;
      const year = calendarMonth === 0 ? calendarYear - 1 : calendarYear;
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // Trailing month leading days (to fill 35 or 42 grid cells)
    const remainingSlots = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remainingSlots; d++) {
      const month = calendarMonth === 11 ? 1 : calendarMonth + 2;
      const year = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    return days;
  }, [calendarYear, calendarMonth]);

  // Plans grouped by date
  const plansByDate = useMemo(() => {
    const map: Record<string, PlannedExpense[]> = {};
    plans.forEach((p) => {
      if (!p.dueDate) return;
      const dateOnly = p.dueDate.split("T")[0];
      if (!map[dateOnly]) map[dateOnly] = [];
      map[dateOnly].push(p);
    });
    return map;
  }, [plans]);

  // Total commitments in the viewed month
  const viewedMonthStats = useMemo(() => {
    const prefix = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}`;
    const monthPlans = plans.filter((p) => p.dueDate && p.dueDate.startsWith(prefix));
    const planned = monthPlans.filter((p) => p.status === "planned");
    const paid = monthPlans.filter((p) => p.status === "paid");
    const totalPlannedAmt = planned.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const totalPaidAmt = paid.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    return {
      count: monthPlans.length,
      pendingCount: planned.length,
      paidCount: paid.length,
      totalPlannedAmt,
      totalPaidAmt,
      totalMonthAmt: totalPlannedAmt + totalPaidAmt,
    };
  }, [plans, calendarYear, calendarMonth]);

  // Filtered plans list
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      // Date filter from calendar selection
      if (selectedCalendarDate) {
        const planDate = p.dueDate ? p.dueDate.split("T")[0] : "";
        if (planDate !== selectedCalendarDate) return false;
      }

      // Search Query
      const q = search.trim().toLowerCase();
      if (q) {
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchCat = (p.category || "").toLowerCase().includes(q);
        const matchWallet = (p.walletName || "").toLowerCase().includes(q);
        const matchNotes = (p.notes || "").toLowerCase().includes(q);
        if (!matchTitle && !matchCat && !matchWallet && !matchNotes) return false;
      }

      // Category filter
      if (selectedCategory !== "all" && p.category !== selectedCategory) {
        return false;
      }

      // Status tab filter
      if (activeStatusTab === "planned") return p.status === "planned";
      if (activeStatusTab === "paid") return p.status === "paid";
      if (activeStatusTab === "high") return p.priority === "high" && p.status === "planned";

      return true;
    });
  }, [plans, selectedCalendarDate, search, selectedCategory, activeStatusTab]);

  const selectedDayPlans = useMemo(() => {
    if (!selectedCalendarDate) return [];
    return plans.filter((p) => p.dueDate && p.dueDate.split("T")[0] === selectedCalendarDate);
  }, [plans, selectedCalendarDate]);

  const m = metrics || {
    totalPlanned: 0,
    totalPaid: 0,
    dueNext7DaysCount: 0,
    dueNext7DaysAmount: 0,
    highPriorityCount: 0,
    totalLiquidity: 0,
    remainingBuffer: 0,
    bufferHealth: "healthy",
  };

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "28px", paddingBottom: "60px" }} className="animate-fade-in">
        {/* 1. Header Section with Actions & View Mode Switcher */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(6, 182, 212, 0.2) 100%)",
                border: "1px solid rgba(99, 102, 241, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 20px rgba(99, 102, 241, 0.2)",
              }}>
                <CalendarDays size={22} color="#818CF8" />
              </div>
              <div>
                <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", margin: 0 }}>
                  Monthly Planning
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "2px", margin: 0 }}>
                  Interactive predictive calendar, obligation timeline, and liquid cash reserve horizon.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {/* View Mode Switcher */}
            <div className="mobile-scroll-x" style={{
              background: "rgba(15, 23, 42, 0.8)",
              padding: "4px",
              borderRadius: "14px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              gap: "4px",
              maxWidth: "100%",
            }}>
              <button
                onClick={() => setViewMode("calendar")}
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
                  background: viewMode === "calendar" ? "linear-gradient(135deg, #6366F1, #4F46E5)" : "transparent",
                  color: viewMode === "calendar" ? "#FFFFFF" : "var(--text-secondary)",
                  boxShadow: viewMode === "calendar" ? "0 4px 12px rgba(99, 102, 241, 0.3)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                <CalendarIcon size={14} />
                <span>Calendar Grid</span>
              </button>

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
                  background: viewMode === "cards" ? "linear-gradient(135deg, #6366F1, #4F46E5)" : "transparent",
                  color: viewMode === "cards" ? "#FFFFFF" : "var(--text-secondary)",
                  boxShadow: viewMode === "cards" ? "0 4px 12px rgba(99, 102, 241, 0.3)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                <LayoutGrid size={14} />
                <span>Agenda & Cards</span>
              </button>

              <button
                onClick={() => setViewMode("breakdown")}
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
                  background: viewMode === "breakdown" ? "linear-gradient(135deg, #6366F1, #4F46E5)" : "transparent",
                  color: viewMode === "breakdown" ? "#FFFFFF" : "var(--text-secondary)",
                  boxShadow: viewMode === "breakdown" ? "0 4px 12px rgba(99, 102, 241, 0.3)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                <BarChart3 size={14} />
                <span>Cash Flow Buffer</span>
              </button>
            </div>

            <button
              onClick={() => handleOpenAdd()}
              className="pill-btn pill-btn-primary"
              style={{ padding: "10px 22px" }}
            >
              <Plus size={16} />
              <span>Plan New Expense</span>
            </button>
          </div>
        </div>

        {/* 2. Executive KPI Summary Cards (Frosted Dark Glass) */}
        <div className="grid-responsive-kpi">
          {/* Card 1: Total Horizon Planned */}
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
                TOTAL HORIZON PLANNED
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
                <CalendarClock size={18} color="#818CF8" />
              </div>
            </div>
            <div style={{ fontSize: "30px", fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
              {formatCurrency(m.totalPlanned)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", fontSize: "12px", color: "var(--text-secondary)" }}>
              <span style={{ color: "#818CF8", fontWeight: 700 }}>{plans.filter((p) => p.status === "planned").length} commitments</span> pending payment
            </div>
          </div>

          {/* Card 2: Due in 7 Days (Critical Window) */}
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
                DUE NEXT 7 DAYS
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
                <Clock size={18} color="#F59E0B" />
              </div>
            </div>
            <div style={{ fontSize: "30px", fontWeight: 900, color: "#F59E0B", letterSpacing: "-0.5px" }}>
              {formatCurrency(m.dueNext7DaysAmount)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", fontSize: "12px", color: "var(--text-secondary)" }}>
              <span style={{
                background: m.dueNext7DaysCount > 0 ? "rgba(245, 158, 11, 0.2)" : "rgba(255, 255, 255, 0.05)",
                color: m.dueNext7DaysCount > 0 ? "#FBBF24" : "var(--text-muted)",
                padding: "2px 8px",
                borderRadius: "9999px",
                fontWeight: 700,
                fontSize: "11px",
              }}>
                {m.dueNext7DaysCount} urgent deadlines
              </span>
              <span>requiring liquidity</span>
            </div>
          </div>

          {/* Card 3: Covered / Paid */}
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
                FULFILLED / PAID
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
                <CheckCircle2 size={18} color="#10B981" />
              </div>
            </div>
            <div style={{ fontSize: "30px", fontWeight: 900, color: "#10B981", letterSpacing: "-0.5px" }}>
              {formatCurrency(m.totalPaid)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", fontSize: "12px", color: "var(--text-secondary)" }}>
              <span style={{ color: "#34D399", fontWeight: 700 }}>
                {plans.filter((p) => p.status === "paid").length} fulfilled
              </span>
              <span>out of {plans.length} total</span>
            </div>
          </div>

          {/* Card 4: Safe Liquidity Runway Buffer */}
          <div className="glass-panel" style={{ padding: "24px", position: "relative", overflow: "hidden" }}>
            <div style={{
              position: "absolute",
              top: "-20%",
              right: "-15%",
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              background: `radial-gradient(circle, ${m.bufferHealth === "healthy" ? "rgba(99, 102, 241, 0.25)" : "rgba(239, 68, 68, 0.25)"} 0%, transparent 70%)`,
              pointerEvents: "none",
            }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px" }}>
                ESTIMATED SAFE BUFFER
              </span>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: m.bufferHealth === "healthy" ? "rgba(99, 102, 241, 0.15)" : "rgba(239, 68, 68, 0.15)",
                border: m.bufferHealth === "healthy" ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <ShieldCheck size={18} color={m.bufferHealth === "healthy" ? "#818CF8" : "#EF4444"} />
              </div>
            </div>
            <div style={{
              fontSize: "30px",
              fontWeight: 900,
              color: m.bufferHealth === "healthy" ? "#818CF8" : "#EF4444",
              letterSpacing: "-0.5px"
            }}>
              {formatCurrency(m.remainingBuffer)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", fontSize: "12px" }}>
              <span style={{
                padding: "2px 8px",
                borderRadius: "9999px",
                fontSize: "11px",
                fontWeight: 700,
                background: m.bufferHealth === "healthy" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                color: m.bufferHealth === "healthy" ? "#34D399" : "#F87171",
              }}>
                {m.bufferHealth === "healthy" ? "✓ Fully Funded" : "⚠ Deficit Alert"}
              </span>
              <span style={{ color: "var(--text-muted)" }}>
                vs {formatCurrency(m.totalLiquidity)} liquidity
              </span>
            </div>
          </div>
        </div>

        {/* 3. CORE COMPONENT: Interactive Month Calendar with Marked Dates */}
        {(viewMode === "calendar" || viewMode === "breakdown") && (
          <div className="glass-panel" style={{ padding: "28px" }}>
            {/* Calendar Navigation & Month Bar */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: "24px",
              paddingBottom: "20px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    onClick={handlePrevMonth}
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#F8FAFC",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)")}
                    title="Previous Month"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#F8FAFC", margin: 0, minWidth: "190px" }}>
                    {currentCalendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </h2>

                  <button
                    onClick={handleNextMonth}
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#F8FAFC",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)")}
                    title="Next Month"
                  >
                    <ChevronRight size={18} />
                  </button>

                  <button
                    onClick={handleCurrentMonth}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      background: "rgba(99, 102, 241, 0.15)",
                      border: "1px solid rgba(99, 102, 241, 0.3)",
                      color: "#A5B4FC",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      marginLeft: "6px",
                    }}
                  >
                    Today
                  </button>
                </div>

                {/* Monthly Total Commitment Badge */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "6px 14px",
                  borderRadius: "9999px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  fontSize: "12px",
                }}>
                  <span style={{ color: "var(--text-muted)" }}>This Month:</span>
                  <span style={{ color: "#F8FAFC", fontWeight: 800 }}>{formatCurrency(viewedMonthStats.totalPlannedAmt)}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>({viewedMonthStats.pendingCount} pending)</span>
                </div>
              </div>

              {/* Legend & Filter Clear */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px", color: "var(--text-muted)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#EF4444" }} />
                    <span>Urgent / High</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#6366F1" }} />
                    <span>Planned</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10B981" }} />
                    <span>Paid</span>
                  </span>
                </div>

                {selectedCalendarDate && (
                  <button
                    onClick={() => setSelectedCalendarDate(null)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      background: "rgba(239, 68, 68, 0.15)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      color: "#FCA5A5",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <X size={12} />
                    <span>Reset Date Filter</span>
                  </button>
                )}
              </div>
            </div>

            {/* Calendar Swipable Container on Mobile */}
            <div className="table-responsive-container">
              <div style={{ minWidth: "600px" }}>
                {/* 7-Days Grid Header */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: "8px",
                  marginBottom: "10px",
                  textAlign: "center",
                }}>
              {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((dayName, idx) => (
                <div
                  key={dayName}
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    color: idx === 0 || idx === 6 ? "#818CF8" : "var(--text-muted)",
                    padding: "8px 0",
                    letterSpacing: "1px",
                  }}
                >
                  {dayName}
                </div>
              ))}
            </div>

            {/* Monthly Calendar Matrix (Cells) */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "8px",
            }}>
              {calendarGridDays.map((cell, idx) => {
                const dayPlans = plansByDate[cell.dateStr] || [];
                const isSelected = selectedCalendarDate === cell.dateStr;
                const totalDayAmount = dayPlans.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                const hasHighPriority = dayPlans.some((p) => p.priority === "high" && p.status === "planned");
                const allPaid = dayPlans.length > 0 && dayPlans.every((p) => p.status === "paid");

                return (
                  <div
                    key={cell.dateStr + idx}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedCalendarDate(null);
                      } else {
                        setSelectedCalendarDate(cell.dateStr);
                      }
                    }}
                    style={{
                      minHeight: "110px",
                      borderRadius: "16px",
                      background: isSelected
                        ? "rgba(99, 102, 241, 0.16)"
                        : cell.isCurrentMonth
                        ? "rgba(15, 23, 42, 0.55)"
                        : "rgba(15, 23, 42, 0.2)",
                      border: isSelected
                        ? "2px solid #6366F1"
                        : cell.isToday
                        ? "1.5px solid rgba(99, 102, 241, 0.5)"
                        : dayPlans.length > 0
                        ? "1px solid rgba(255, 255, 255, 0.1)"
                        : "1px solid rgba(255, 255, 255, 0.04)",
                      padding: "10px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                      position: "relative",
                      overflow: "hidden",
                      opacity: cell.isCurrentMonth ? 1 : 0.45,
                      boxShadow: isSelected
                        ? "0 0 20px rgba(99, 102, 241, 0.3)"
                        : cell.isToday
                        ? "0 0 14px rgba(99, 102, 241, 0.15)"
                        : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.4)";
                        e.currentTarget.style.background = "rgba(30, 41, 59, 0.7)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.borderColor = dayPlans.length > 0 ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.04)";
                        e.currentTarget.style.background = cell.isCurrentMonth ? "rgba(15, 23, 42, 0.55)" : "rgba(15, 23, 42, 0.2)";
                      }
                    }}
                  >
                    {/* Top Row: Date Number & Indicators */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: cell.isToday ? "26px" : "auto",
                        height: cell.isToday ? "26px" : "auto",
                        borderRadius: cell.isToday ? "50%" : "0",
                        background: cell.isToday ? "#6366F1" : "transparent",
                        color: cell.isToday ? "#FFFFFF" : cell.isCurrentMonth ? "#F8FAFC" : "var(--text-muted)",
                        fontSize: "13px",
                        fontWeight: cell.isToday || isSelected ? 800 : 600,
                      }}>
                        {cell.dayNumber}
                      </div>

                      {/* Day summary badges */}
                      {dayPlans.length > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          {hasHighPriority && (
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#EF4444" }} title="High Priority Expense" />
                          )}
                          <span style={{
                            fontSize: "10px",
                            fontWeight: 800,
                            padding: "1px 6px",
                            borderRadius: "9999px",
                            background: allPaid ? "rgba(16, 185, 129, 0.2)" : "rgba(99, 102, 241, 0.2)",
                            color: allPaid ? "#34D399" : "#A5B4FC",
                          }}>
                            {formatCurrency(totalDayAmount)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Middle: Planned Expense Mini-Pills */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px", flex: 1 }}>
                      {dayPlans.slice(0, 2).map((p) => {
                        const catTheme = CATEGORY_COLORS[p.category] || CATEGORY_COLORS.Other;
                        const isPaid = p.status === "paid";

                        return (
                          <div
                            key={p._id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "4px",
                              padding: "3px 6px",
                              borderRadius: "6px",
                              background: isPaid ? "rgba(16, 185, 129, 0.12)" : catTheme.bg,
                              border: `1px solid ${isPaid ? "rgba(16, 185, 129, 0.25)" : catTheme.border}`,
                              fontSize: "10px",
                              color: isPaid ? "#34D399" : "#F8FAFC",
                              overflow: "hidden",
                              whiteSpace: "nowrap",
                              textOverflow: "ellipsis",
                            }}
                            title={`${p.title}: ${formatCurrency(p.amount)} (${p.status})`}
                          >
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", fontWeight: 600 }}>
                              {p.title}
                            </span>
                            <span style={{ fontWeight: 800, flexShrink: 0 }}>
                              {formatCurrency(p.amount)}
                            </span>
                          </div>
                        );
                      })}

                      {dayPlans.length > 2 && (
                        <div style={{
                          fontSize: "10px",
                          color: "var(--text-muted)",
                          fontWeight: 700,
                          textAlign: "center",
                          paddingTop: "2px",
                        }}>
                          +{dayPlans.length - 2} more
                        </div>
                      )}
                    </div>

                    {/* Bottom: Quick Add on Hover or empty state */}
                    {dayPlans.length === 0 && (
                      <div style={{ fontSize: "10px", color: "var(--text-muted)", opacity: 0.3, textAlign: "right" }}>
                        —
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
              </div>
            </div>

            {/* 4. Selected Day Focus Inspector (Reveals when user clicks any calendar day) */}
            {selectedCalendarDate && (
              <div style={{
                marginTop: "24px",
                padding: "24px",
                borderRadius: "20px",
                background: "rgba(99, 102, 241, 0.08)",
                border: "1px solid rgba(99, 102, 241, 0.25)",
                animation: "fadeIn 0.25s ease-out",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: "18px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <CalendarDays size={18} color="#818CF8" />
                      <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#F8FAFC", margin: 0 }}>
                        {formatDate(selectedCalendarDate)}
                      </h3>
                      <span style={{
                        padding: "3px 10px",
                        borderRadius: "9999px",
                        fontSize: "11px",
                        fontWeight: 700,
                        background: selectedDayPlans.length > 0 ? "rgba(99, 102, 241, 0.25)" : "rgba(255, 255, 255, 0.06)",
                        color: selectedDayPlans.length > 0 ? "#A5B4FC" : "var(--text-muted)",
                      }}>
                        {selectedDayPlans.length} {selectedDayPlans.length === 1 ? "expense" : "expenses"}
                      </span>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px", margin: 0 }}>
                      Total commitment for this day:{" "}
                      <strong style={{ color: "#F8FAFC" }}>
                        {formatCurrency(selectedDayPlans.reduce((sum, p) => sum + (Number(p.amount) || 0), 0))}
                      </strong>
                    </p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button
                      onClick={() => handleOpenAdd(selectedCalendarDate)}
                      className="pill-btn pill-btn-primary"
                      style={{ fontSize: "12px", padding: "6px 16px" }}
                    >
                      <Plus size={14} />
                      <span>+ Plan on This Date</span>
                    </button>

                    <button
                      onClick={() => setSelectedCalendarDate(null)}
                      className="pill-btn pill-btn-ghost"
                      style={{ fontSize: "12px", padding: "6px 14px" }}
                    >
                      <X size={14} />
                      <span>Clear Focus</span>
                    </button>
                  </div>
                </div>

                {selectedDayPlans.length === 0 ? (
                  <div style={{
                    padding: "24px",
                    textAlign: "center",
                    color: "var(--text-muted)",
                    fontSize: "13px",
                    background: "rgba(15, 23, 42, 0.4)",
                    borderRadius: "14px",
                    border: "1px dashed rgba(255, 255, 255, 0.08)",
                  }}>
                    No planned payments scheduled for {formatDate(selectedCalendarDate)}. Click &quot;+ Plan on This Date&quot; to assign one.
                  </div>
                ) : (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                    gap: "16px",
                  }}>
                    {selectedDayPlans.map((plan) => {
                      const dueStatus = getDueStatus(plan.dueDate, plan.status);
                      const catTheme = CATEGORY_COLORS[plan.category] || CATEGORY_COLORS.Other;

                      return (
                        <div
                          key={plan._id}
                          style={{
                            background: "rgba(15, 23, 42, 0.8)",
                            borderRadius: "16px",
                            padding: "18px",
                            border: "1px solid rgba(255, 255, 255, 0.08)",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            gap: "14px",
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                              <span style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                color: catTheme.accent,
                                background: catTheme.bg,
                                border: `1px solid ${catTheme.border}`,
                                padding: "2px 8px",
                                borderRadius: "6px",
                              }}>
                                {plan.category}
                              </span>
                              <span style={{
                                fontSize: "10px",
                                fontWeight: 800,
                                padding: "2px 8px",
                                borderRadius: "9999px",
                                background: dueStatus.bg,
                                color: dueStatus.color,
                                border: `1px solid ${dueStatus.border}`,
                              }}>
                                {dueStatus.text}
                              </span>
                            </div>

                            <h4 style={{ fontSize: "16px", fontWeight: 800, color: "#F8FAFC", margin: 0 }}>
                              {plan.title}
                            </h4>
                            <div style={{ fontSize: "22px", fontWeight: 900, color: plan.status === "paid" ? "#10B981" : "#F8FAFC", marginTop: "4px" }}>
                              {formatCurrency(plan.amount)}
                            </div>

                            {plan.notes && (
                              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px", margin: 0, fontStyle: "italic" }}>
                                &quot;{plan.notes}&quot;
                              </p>
                            )}
                          </div>

                          <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            paddingTop: "12px",
                            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                          }}>
                            {plan.status === "paid" ? (
                              <span style={{ fontSize: "11px", color: "#10B981", fontWeight: 700 }}>
                                ✓ Fulfilled
                              </span>
                            ) : (
                              <button
                                onClick={() => handleOpenPay(plan)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  background: "rgba(16, 185, 129, 0.15)",
                                  border: "1px solid rgba(16, 185, 129, 0.3)",
                                  color: "#34D399",
                                  padding: "6px 14px",
                                  borderRadius: "9999px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                <Check size={13} />
                                <span>Mark as Paid</span>
                              </button>
                            )}

                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                onClick={() => handleOpenEdit(plan)}
                                style={{
                                  width: "30px",
                                  height: "30px",
                                  borderRadius: "50%",
                                  background: "rgba(255, 255, 255, 0.06)",
                                  border: "none",
                                  color: "#94A3B8",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                                title="Edit"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeletePlan(plan)}
                                style={{
                                  width: "30px",
                                  height: "30px",
                                  borderRadius: "50%",
                                  background: "rgba(239, 68, 68, 0.15)",
                                  border: "none",
                                  color: "#FCA5A5",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                                title="Delete"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 5. Category Allocation Breakdown Strip */}
        <div className="glass-panel" style={{ padding: "26px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h3 style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                Budget Allocation by Category
              </h3>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px", margin: 0 }}>
                Distribution of upcoming commitments across living, housing, and operational areas
              </p>
            </div>
            <span style={{ fontSize: "13px", fontWeight: 800, color: "#818CF8" }}>
              Total: {formatCurrency(m.totalPlanned)}
            </span>
          </div>

          {/* Multi-segment distribution bar */}
          <div style={{
            height: "12px",
            borderRadius: "9999px",
            background: "rgba(255, 255, 255, 0.05)",
            overflow: "hidden",
            display: "flex",
            marginBottom: "16px",
          }}>
            {Object.entries(categoryBreakdown).map(([cat, amt]) => {
              if (amt <= 0 || m.totalPlanned <= 0) return null;
              const pct = (amt / m.totalPlanned) * 100;
              const color = CATEGORY_COLORS[cat]?.accent || "#6366F1";
              return (
                <div
                  key={cat}
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: color,
                    transition: "width 0.4s ease",
                  }}
                  title={`${cat}: ${formatCurrency(amt)} (${pct.toFixed(1)}%)`}
                />
              );
            })}
          </div>

          {/* Category Chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {Object.entries(categoryBreakdown).map(([cat, amt]) => {
              if (amt <= 0) return null;
              const pct = m.totalPlanned > 0 ? ((amt / m.totalPlanned) * 100).toFixed(0) : "0";
              const cfg = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other;
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
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: cfg.accent }} />
                  <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{cat}</span>
                  <span style={{ fontWeight: 800, color: "var(--text-primary)" }}>{formatCurrency(amt)}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6. Filter & Search Controls for Agenda / Cards List */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          {/* Status Filter Pills */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {[
              { id: "all", label: "All Obligations", count: plans.length },
              { id: "planned", label: "Pending Plans", count: plans.filter((p) => p.status === "planned").length },
              { id: "high", label: "High Priority", count: m.highPriorityCount },
              { id: "paid", label: "Fulfilled", count: plans.filter((p) => p.status === "paid").length },
            ].map((tab) => {
              const isActive = activeStatusTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveStatusTab(tab.id as any)}
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

          {/* Search & Category Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ position: "relative", minWidth: "220px" }}>
              <Search size={15} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Search plan or note..."
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
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 7. Comprehensive Cards & Agenda Grid */}
        {filteredPlans.length === 0 ? (
          <div className="glass-panel" style={{ padding: "50px", textAlign: "center", color: "var(--text-secondary)" }}>
            <CalendarClock size={44} style={{ margin: "0 auto 14px", opacity: 0.3, color: "#818CF8" }} />
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>No Planned Expenses Found</h3>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "6px", maxWidth: "420px", margin: "6px auto 0" }}>
              {selectedCalendarDate
                ? `No commitments matching filters on ${formatDate(selectedCalendarDate)}. Click "Plan New Expense" to schedule one.`
                : "Schedule your upcoming commitments or ask AI: 'next month e bashavara 15000 tk plan koro'."}
            </p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
            gap: "24px",
          }}>
            {filteredPlans.map((plan) => {
              const dueStatus = getDueStatus(plan.dueDate, plan.status);
              const DueIcon = dueStatus.icon;
              const catTheme = CATEGORY_COLORS[plan.category] || CATEGORY_COLORS.Other;
              const isPaid = plan.status === "paid";

              const priorityBadge = {
                high: { label: "HIGH", color: "#EF4444", bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.3)" },
                medium: { label: "MED", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.3)" },
                low: { label: "LOW", color: "#64748B", bg: "rgba(100, 116, 139, 0.15)", border: "rgba(100, 116, 139, 0.3)" },
              }[plan.priority || "medium"];

              return (
                <div
                  key={plan._id}
                  className="glass-panel"
                  style={{
                    padding: "24px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                    border: isPaid
                      ? "1px solid rgba(16, 185, 129, 0.2)"
                      : plan.priority === "high"
                      ? "1px solid rgba(239, 68, 68, 0.25)"
                      : "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 20px 48px -4px rgba(0, 0, 0, 0.65), 0 0 24px rgba(99, 102, 241, 0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "var(--card-shadow)";
                  }}
                >
                  <div>
                    {/* Top Row: Category + Priority + Actions */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          color: catTheme.accent,
                          background: catTheme.bg,
                          border: `1px solid ${catTheme.border}`,
                          padding: "3px 10px",
                          borderRadius: "9999px",
                        }}>
                          {plan.category}
                        </span>

                        <span style={{
                          fontSize: "10px",
                          fontWeight: 800,
                          color: priorityBadge.color,
                          background: priorityBadge.bg,
                          border: `1px solid ${priorityBadge.border}`,
                          padding: "3px 8px",
                          borderRadius: "6px",
                          letterSpacing: "0.5px",
                        }}>
                          {priorityBadge.label}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <button
                          onClick={() => handleOpenEdit(plan)}
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            background: "rgba(255, 255, 255, 0.06)",
                            border: "none",
                            color: "var(--text-secondary)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)")}
                          title="Edit Plan"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeletePlan(plan)}
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            background: "rgba(239, 68, 68, 0.15)",
                            border: "none",
                            color: "#FCA5A5",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.3)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)")}
                          title="Delete Plan"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Expense Title & Big Amount */}
                    <div style={{ marginBottom: "16px" }}>
                      <h3 style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.2px", margin: 0 }}>
                        {plan.title}
                      </h3>
                      <div style={{
                        fontSize: "28px",
                        fontWeight: 900,
                        color: isPaid ? "#10B981" : "var(--text-primary)",
                        marginTop: "4px",
                        letterSpacing: "-0.5px"
                      }}>
                        {formatCurrency(plan.amount)}
                      </div>
                    </div>

                    {/* Due Date Status Pill */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
                      <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "4px 10px",
                        borderRadius: "8px",
                        background: dueStatus.bg,
                        color: dueStatus.color,
                        border: `1px solid ${dueStatus.border}`,
                        fontSize: "12px",
                        fontWeight: 700,
                      }}>
                        <DueIcon size={13} />
                        <span>{dueStatus.text}</span>
                      </div>

                      {plan.dueDate && (
                        <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <span>📅 {formatDate(plan.dueDate)}</span>
                        </span>
                      )}
                    </div>

                    {/* Funding Wallet Tag */}
                    {plan.walletName && (
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
                        marginBottom: "12px",
                      }}>
                        <WalletIcon size={12} />
                        <span>Funded by: <strong>{plan.walletName}</strong></span>
                      </div>
                    )}

                    {/* Notes */}
                    {plan.notes && (
                      <p style={{ fontSize: "13px", color: "var(--text-secondary)", fontStyle: "italic", margin: "4px 0 16px", lineHeight: 1.4 }}>
                        &quot;{plan.notes}&quot;
                      </p>
                    )}
                  </div>

                  {/* Card Bottom: Fulfill Button / Status */}
                  <div style={{
                    paddingTop: "16px",
                    marginTop: "8px",
                    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}>
                    {isPaid ? (
                      <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                        <span style={{ fontSize: "12px", color: "#10B981", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                          <CheckCircle2 size={15} />
                          <span>Fulfilled {plan.paidAt ? `on ${formatShortDate(plan.paidAt)}` : ""}</span>
                        </span>
                        <button
                          onClick={() => handleMarkPlanned(plan)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--text-muted)",
                            fontSize: "11px",
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          Mark Unpaid
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleOpenPay(plan)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          background: "rgba(16, 185, 129, 0.15)",
                          border: "1px solid rgba(16, 185, 129, 0.35)",
                          color: "#34D399",
                          padding: "10px 18px",
                          borderRadius: "12px",
                          fontSize: "13px",
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#10B981";
                          e.currentTarget.style.color = "#000000";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(16, 185, 129, 0.15)";
                          e.currentTarget.style.color = "#34D399";
                        }}
                      >
                        <Check size={15} />
                        <span>Fulfill & Mark as Paid</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: Plan / Edit Expense (Rendered at Root Fragment Level for Perfect Screen Centering) */}
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
                <CalendarDays size={20} color="#818CF8" />
                <h3 style={{ fontSize: "19px", fontWeight: 800, color: "#F8FAFC", margin: 0 }}>
                  {editingPlan ? "Edit Planned Commitment" : "Plan New Upcoming Expense"}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: "rgba(255, 255, 255, 0.08)", border: "none", borderRadius: "50%", width: "32px", height: "32px", color: "#94A3B8", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSavePlan} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                  EXPENSE TITLE / OBLIGATION *
                </label>
                <input
                  className="modern-input"
                  placeholder="e.g. Apartment Rent, Electricity Bill, Semester Tuition"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
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
                    className="modern-input"
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                    TARGET DUE DATE *
                  </label>
                  <input
                    type="date"
                    className="modern-input"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    required
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
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                    PRIORITY
                  </label>
                  <select
                    className="modern-input"
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    style={{ background: "rgba(15, 23, 42, 0.95)" }}
                  >
                    <option value="high">High (Urgent / Essential)</option>
                    <option value="medium">Medium (Standard)</option>
                    <option value="low">Low (Discretionary)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                  ASSIGNED FUNDING WALLET (OPTIONAL)
                </label>
                <select
                  className="modern-input"
                  value={formWalletId}
                  onChange={(e) => setFormWalletId(e.target.value)}
                  style={{ background: "rgba(15, 23, 42, 0.95)" }}
                >
                  <option value="">No Wallet Assigned Yet</option>
                  {wallets.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.name} (Balance: {formatCurrency(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                  NOTES / CONTEXT (OPTIONAL)
                </label>
                <textarea
                  className="modern-input"
                  placeholder="e.g. Needs payment before 10th of month"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  style={{ resize: "none" }}
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
                  {submitting ? "Saving..." : editingPlan ? "Update Commitment" : "Create Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Mark as Paid & Fulfill Commitment (Screen Centered) */}
      {payingPlan && (
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <CheckCircle2 size={22} color="#10B981" />
                <h3 style={{ fontSize: "19px", fontWeight: 800, color: "#F8FAFC", margin: 0 }}>
                  Fulfill Planned Expense
                </h3>
              </div>
              <button
                onClick={() => setPayingPlan(null)}
                style={{ background: "rgba(255, 255, 255, 0.08)", border: "none", borderRadius: "50%", width: "32px", height: "32px", color: "#94A3B8", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              borderRadius: "16px",
              padding: "18px",
              marginBottom: "20px",
            }}>
              <div style={{ fontSize: "12px", color: "#A7F3D0", fontWeight: 600 }}>
                SETTLING COMMITMENT
              </div>
              <div style={{ fontSize: "17px", fontWeight: 800, color: "#F8FAFC", marginTop: "2px" }}>
                {payingPlan.title}
              </div>
              <div style={{ fontSize: "26px", fontWeight: 900, color: "#34D399", marginTop: "4px" }}>
                {formatCurrency(payingPlan.amount)}
              </div>
            </div>

            <form onSubmit={handleExecutePayment} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{
                background: "rgba(255, 255, 255, 0.04)",
                padding: "12px 16px",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", fontWeight: 700, color: "#F8FAFC", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={payDeductWallet}
                    onChange={(e) => setPayDeductWallet(e.target.checked)}
                    style={{ width: "18px", height: "18px", accentColor: "#10B981", cursor: "pointer" }}
                  />
                  <span>Deduct from wallet & log to actual expenses</span>
                </label>
              </div>

              {payDeductWallet && (
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                    SELECT FUNDING WALLET / ACCOUNT
                  </label>
                  <select
                    className="modern-input"
                    value={payWalletId}
                    onChange={(e) => setPayWalletId(e.target.value)}
                    style={{ background: "rgba(15, 23, 42, 0.95)" }}
                    required
                  >
                    {wallets.map((w) => (
                      <option key={w._id} value={w._id}>
                        {w.name} — Balance: {formatCurrency(w.balance)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setPayingPlan(null)}
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
                  {submitting ? "Processing..." : "Confirm & Fulfill"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
