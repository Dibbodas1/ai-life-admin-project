"use client";

import { useState, useEffect, useMemo } from "react";
import {
  HandCoins, Plus, ArrowUpRight, ArrowDownLeft, CheckCircle2,
  Clock, History, Trash2, Calendar, Search, X, Check,
  AlertCircle, ShieldCheck, UserCheck, ChevronRight,
  Scale, Users, CheckCheck, Landmark, LayoutGrid, TableProperties,
  ArrowRightLeft, BadgePercent, Sparkles, AlertTriangle
} from "lucide-react";
import { formatCurrency, formatShortDate, formatDate, onDataUpdated, emitDataUpdated, apiFetch } from "@/lib/utils";
import { LoanDebt, LoanDebtTransaction } from "@/lib/types";

export default function LoansPage() {
  const [loans, setLoans] = useState<LoanDebt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"split" | "lent" | "borrowed" | "settled">("split");
  const [displayMode, setDisplayMode] = useState<"slates" | "table">("slates");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [historyModalLoan, setHistoryModalLoan] = useState<LoanDebt | null>(null);
  const [paymentModalLoan, setPaymentModalLoan] = useState<LoanDebt | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"lent" | "borrowed">("lent");
  const [formAmount, setFormAmount] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchLoans = (isSilent = false) => {
    if (!isSilent) setLoading(true);
    apiFetch("/api/loans")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setLoans(data);
        else setLoans([]);
      })
      .catch(() => setLoans([]))
      .finally(() => {
        if (!isSilent) setLoading(false);
      });
  };

  useEffect(() => {
    fetchLoans();
    const cleanup = onDataUpdated(() => {
      fetchLoans(true);
    });
    return cleanup;
  }, []);

  const handleAddLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formAmount || Number(formAmount) <= 0) return;
    setSubmitting(true);

    try {
      const res = await apiFetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personName: formName.trim(),
          type: formType,
          amount: Number(formAmount),
          dueDate: formDueDate || undefined,
          notes: formNotes || undefined,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setFormName("");
        setFormAmount("");
        setFormDueDate("");
        setFormNotes("");
        fetchLoans(true);
        emitDataUpdated();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalLoan || !paymentAmount || Number(paymentAmount) <= 0) return;
    setSubmitting(true);

    try {
      const res = await apiFetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "repay",
          id: paymentModalLoan._id,
          amount: Number(paymentAmount),
          notes: paymentNotes || "Repayment recorded",
        }),
      });
      if (res.ok) {
        setPaymentModalLoan(null);
        setPaymentAmount("");
        setPaymentNotes("");
        fetchLoans(true);
        emitDataUpdated();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettleUp = async (loan: LoanDebt) => {
    if (!confirm(`Settle up the remaining balance of ${formatCurrency(loan.amount)} with ${loan.personName}?`)) return;
    try {
      const res = await apiFetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "settle",
          id: loan._id,
          notes: "Marked as fully settled",
        }),
      });
      if (res.ok) {
        fetchLoans(true);
        emitDataUpdated();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (loan: LoanDebt) => {
    if (!confirm(`Delete contact profile and ledger for ${loan.personName}?`)) return;
    try {
      const res = await apiFetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: loan._id }),
      });
      if (res.ok) {
        fetchLoans(true);
        emitDataUpdated();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Days until & urgency helper
  const getDueStatus = (dueDateStr?: string | Date) => {
    if (!dueDateStr) {
      return { text: "No Fixed Deadline", color: "var(--text-muted)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", icon: Clock };
    }

    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)}d`, color: "#EF4444", bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.35)", icon: AlertCircle };
    }
    if (diffDays === 0) {
      return { text: "Due Today", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.2)", border: "rgba(245, 158, 11, 0.4)", icon: AlertTriangle };
    }
    if (diffDays === 1) {
      return { text: "Due Tomorrow", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.3)", icon: Clock };
    }
    if (diffDays <= 7) {
      return { text: `Due in ${diffDays}d`, color: "#06B6D4", bg: "rgba(6, 182, 212, 0.15)", border: "rgba(6, 182, 212, 0.3)", icon: Clock };
    }
    return { text: `Due: ${formatShortDate(dueDateStr)}`, color: "var(--text-secondary)", bg: "rgba(255, 255, 255, 0.05)", border: "rgba(255, 255, 255, 0.08)", icon: Clock };
  };

  // Helper to calculate total repaid and progress percentage
  const getLoanProgress = (loan: LoanDebt) => {
    const totalRepaid = (loan.history || [])
      .filter((h) => h.type === "repayment")
      .reduce((sum, h) => sum + (Number(h.amount) || 0), 0);

    const totalPrincipal = loan.amount + totalRepaid;
    const progressPct = totalPrincipal > 0 ? Math.min(100, Math.round((totalRepaid / totalPrincipal) * 100)) : 0;

    return { totalRepaid, totalPrincipal, progressPct };
  };

  // Calculations
  const activeLoans = loans.filter((l) => l.status === "active" && l.amount > 0);
  const totalLent = activeLoans.filter((l) => l.type === "lent").reduce((s, l) => s + l.amount, 0);
  const totalBorrowed = activeLoans.filter((l) => l.type === "borrowed").reduce((s, l) => s + l.amount, 0);
  const netStanding = totalLent - totalBorrowed;

  const lentList = activeLoans.filter(
    (l) =>
      l.type === "lent" &&
      (l.personName.toLowerCase().includes(search.toLowerCase()) || (l.notes && l.notes.toLowerCase().includes(search.toLowerCase())))
  );

  const borrowedList = activeLoans.filter(
    (l) =>
      l.type === "borrowed" &&
      (l.personName.toLowerCase().includes(search.toLowerCase()) || (l.notes && l.notes.toLowerCase().includes(search.toLowerCase())))
  );

  const settledList = loans.filter(
    (l) =>
      (l.status === "settled" || l.amount === 0) &&
      (l.personName.toLowerCase().includes(search.toLowerCase()) || (l.notes && l.notes.toLowerCase().includes(search.toLowerCase())))
  );

  // Render a Single Modern Bilateral Ledger Slate
  const renderSlateCard = (loan: LoanDebt) => {
    const isSettled = loan.status === "settled" || loan.amount === 0;
    const isLent = loan.type === "lent";
    const dueStatus = getDueStatus(loan.dueDate);
    const DueIcon = dueStatus.icon;
    const { totalRepaid, totalPrincipal, progressPct } = getLoanProgress(loan);

    // Accent styles
    const accentColor = isSettled ? "#94A3B8" : isLent ? "#34D399" : "#FB7185";
    const badgeBg = isSettled
      ? "rgba(148, 163, 184, 0.15)"
      : isLent
      ? "rgba(16, 185, 129, 0.15)"
      : "rgba(244, 63, 94, 0.15)";
    const badgeBorder = isSettled
      ? "rgba(148, 163, 184, 0.3)"
      : isLent
      ? "rgba(16, 185, 129, 0.35)"
      : "rgba(244, 63, 94, 0.35)";

    return (
      <div
        key={loan._id}
        style={{
          background: "linear-gradient(145deg, rgba(15, 23, 42, 0.85) 0%, rgba(11, 15, 28, 0.95) 100%)",
          borderRadius: "24px",
          border: `1px solid ${isSettled ? "rgba(255, 255, 255, 0.08)" : isLent ? "rgba(16, 185, 129, 0.22)" : "rgba(244, 63, 94, 0.22)"}`,
          boxShadow: "0 14px 36px -8px rgba(0, 0, 0, 0.5)",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: "18px",
          position: "relative",
          overflow: "hidden",
          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = `0 20px 48px -6px rgba(0, 0, 0, 0.7), 0 0 24px ${isSettled ? "rgba(255,255,255,0.05)" : isLent ? "rgba(16, 185, 129, 0.18)" : "rgba(244, 63, 94, 0.18)"}`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 14px 36px -8px rgba(0, 0, 0, 0.5)";
        }}
      >
        {/* Subtle Radial Ambient Sheen */}
        <div style={{
          position: "absolute",
          top: "-20%",
          right: "-15%",
          width: "160px",
          height: "160px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${isSettled ? "rgba(255,255,255,0.05)" : isLent ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)"} 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />

        <div>
          {/* Top Row: Contact Identity Chip & Relationship Tag */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {/* Monogram Avatar with Glowing Ring */}
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "14px",
                background: isSettled
                  ? "rgba(255, 255, 255, 0.08)"
                  : isLent
                  ? "linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(5, 150, 105, 0.4) 100%)"
                  : "linear-gradient(135deg, rgba(244, 63, 94, 0.3) 0%, rgba(190, 18, 60, 0.4) 100%)",
                border: `1.5px solid ${isSettled ? "rgba(255, 255, 255, 0.12)" : isLent ? "rgba(16, 185, 129, 0.5)" : "rgba(244, 63, 94, 0.5)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                fontWeight: 900,
                color: accentColor,
                boxShadow: isSettled ? "none" : `0 0 16px ${isLent ? "rgba(16, 185, 129, 0.25)" : "rgba(244, 63, 94, 0.25)"}`,
              }}>
                {loan.personName ? loan.personName[0].toUpperCase() : "?"}
              </div>

              <div>
                <div style={{ fontSize: "17px", fontWeight: 800, color: "#F8FAFC", letterSpacing: "-0.2px" }}>
                  {loan.personName}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                  <span style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: accentColor,
                    background: badgeBg,
                    border: `1px solid ${badgeBorder}`,
                    padding: "2px 8px",
                    borderRadius: "9999px",
                  }}>
                    {isSettled ? "✓ Fully Settled" : isLent ? "● Capital Lent Out" : "● Obligation Owed"}
                  </span>
                </div>
              </div>
            </div>

            {/* Smart Due Date Tag */}
            {!isSettled && (
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "11px",
                fontWeight: 700,
                color: dueStatus.color,
                background: dueStatus.bg,
                border: `1px solid ${dueStatus.border}`,
                padding: "3px 9px",
                borderRadius: "8px",
              }}>
                <DueIcon size={12} />
                <span>{dueStatus.text}</span>
              </div>
            )}
          </div>

          {/* Central Position: Outstanding Balance Display */}
          <div style={{
            background: "rgba(0, 0, 0, 0.3)",
            borderRadius: "16px",
            padding: "16px 18px",
            border: "1px solid rgba(255, 255, 255, 0.05)",
            marginBottom: "14px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {isSettled ? "FINAL SETTLED AMOUNT" : isLent ? "REMAINING RECEIVABLE" : "REMAINING LIABILITY"}
              </span>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                {isLent ? "Incoming to You" : "Outgoing from You"}
              </span>
            </div>

            <div style={{
              fontSize: "30px",
              fontWeight: 900,
              color: isSettled ? "var(--text-muted)" : isLent ? "#34D399" : "#FB7185",
              letterSpacing: "-0.5px",
              marginTop: "4px",
            }}>
              {isSettled ? formatCurrency(0) : isLent ? `+${formatCurrency(loan.amount)}` : `-${formatCurrency(loan.amount)}`}
            </div>

            {/* Repayment Progress Meter */}
            {!isSettled && totalPrincipal > 0 && (
              <div style={{ marginTop: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", marginBottom: "5px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>
                    Settled: <strong style={{ color: "#F8FAFC" }}>{formatCurrency(totalRepaid)}</strong>
                  </span>
                  <span style={{ color: accentColor, fontWeight: 800 }}>
                    {progressPct}% Cleared
                  </span>
                </div>
                <div style={{
                  height: "6px",
                  borderRadius: "9999px",
                  background: "rgba(255, 255, 255, 0.08)",
                  overflow: "hidden",
                }}>
                  <div style={{
                    width: `${progressPct}%`,
                    height: "100%",
                    background: isLent
                      ? "linear-gradient(90deg, #10B981, #34D399)"
                      : "linear-gradient(90deg, #F43F5E, #FB7185)",
                    transition: "width 0.4s ease",
                  }} />
                </div>
              </div>
            )}
          </div>

          {/* Reason / Context Notes */}
          {loan.notes && (
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", fontStyle: "italic", margin: "0 0 4px", lineHeight: 1.4 }}>
              &quot;{loan.notes}&quot;
            </p>
          )}
        </div>

        {/* Bottom Actions Toolbar */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: "14px",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        }}>
          {/* Audit Ledger Trigger */}
          <button
            onClick={() => setHistoryModalLoan(loan)}
            style={{
              background: "rgba(99, 102, 241, 0.1)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              color: "#A5B4FC",
              fontSize: "12px",
              fontWeight: 700,
              padding: "6px 12px",
              borderRadius: "9999px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99, 102, 241, 0.2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(99, 102, 241, 0.1)")}
          >
            <History size={13} />
            <span>Ledger ({loan.history?.length || 1})</span>
          </button>

          {/* Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {!isSettled ? (
              <>
                <button
                  onClick={() => {
                    setPaymentModalLoan(loan);
                    setPaymentAmount("");
                    setPaymentNotes("");
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: isLent
                      ? "linear-gradient(135deg, #10B981 0%, #059669 100%)"
                      : "linear-gradient(135deg, #F43F5E 0%, #BE123C 100%)",
                    border: "none",
                    color: "#FFFFFF",
                    borderRadius: "9999px",
                    padding: "7px 16px",
                    fontSize: "12px",
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: isLent ? "0 4px 14px rgba(16, 185, 129, 0.3)" : "0 4px 14px rgba(244, 63, 94, 0.3)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                >
                  {isLent ? <HandCoins size={14} /> : <ArrowUpRight size={14} />}
                  <span>{isLent ? "Collect / Repay" : "Pay Back"}</span>
                </button>

                <button
                  onClick={() => handleSettleUp(loan)}
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "var(--text-secondary)",
                    borderRadius: "9999px",
                    padding: "7px 12px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
                    e.currentTarget.style.color = "#FFFFFF";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  Settle
                </button>
              </>
            ) : (
              <span style={{ fontSize: "12px", color: "#34D399", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                <CheckCircle2 size={14} /> Reconciled
              </span>
            )}

            <button
              onClick={() => handleDelete(loan)}
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
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.25)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)")}
              title="Delete Record"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "28px", paddingBottom: "60px" }} className="animate-fade-in">
        {/* 1. Header Section with Actions & Layout Mode Switcher */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(16, 185, 129, 0.2) 100%)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 20px rgba(245, 158, 11, 0.2)",
              }}>
                <HandCoins size={22} color="#FBBF24" />
              </div>
              <div>
                <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", margin: 0 }}>
                  Peer Loans &amp; Debts
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "2px", margin: 0 }}>
                  Bilateral ledgers for money lent to friends, liabilities owed, and repayment settlements.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            {/* Display Mode Toggle: Slates vs Dense Table */}
            <div style={{
              display: "flex",
              background: "rgba(15, 23, 42, 0.8)",
              padding: "4px",
              borderRadius: "14px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              gap: "4px",
            }}>
              <button
                onClick={() => setDisplayMode("slates")}
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
                  background: displayMode === "slates" ? "linear-gradient(135deg, #6366F1, #4F46E5)" : "transparent",
                  color: displayMode === "slates" ? "#FFFFFF" : "var(--text-secondary)",
                  boxShadow: displayMode === "slates" ? "0 4px 12px rgba(99, 102, 241, 0.3)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                <LayoutGrid size={14} />
                <span>Executive Slates</span>
              </button>

              <button
                onClick={() => setDisplayMode("table")}
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
                  background: displayMode === "table" ? "linear-gradient(135deg, #6366F1, #4F46E5)" : "transparent",
                  color: displayMode === "table" ? "#FFFFFF" : "var(--text-secondary)",
                  boxShadow: displayMode === "table" ? "0 4px 12px rgba(99, 102, 241, 0.3)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                <TableProperties size={14} />
                <span>Ledger Sheet</span>
              </button>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="pill-btn pill-btn-primary"
              style={{ padding: "10px 22px" }}
            >
              <Plus size={16} />
              <span>Add Loan / Debt</span>
            </button>
          </div>
        </div>

        {/* 2. Executive Net Position Overview Cockpit (Frosted Dark Glass) */}
        <div className="glass-panel" style={{ padding: "32px", position: "relative", overflow: "hidden" }}>
          {/* Radial Sheen Accents */}
          <div style={{
            position: "absolute",
            top: "-30%",
            left: "-10%",
            width: "250px",
            height: "250px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute",
            bottom: "-30%",
            right: "-10%",
            width: "250px",
            height: "250px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(244, 63, 94, 0.15) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          <div className="grid-responsive-loans-overview">
            {/* Left: Total Lent (Receivables) */}
            <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
              <div style={{
                width: "52px",
                height: "52px",
                borderRadius: "16px",
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#34D399",
                boxShadow: "0 0 20px rgba(16, 185, 129, 0.2)",
              }}>
                <ArrowDownLeft size={26} />
              </div>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "1px", textTransform: "uppercase" }}>
                  RECEIVABLES (LENT OUT)
                </div>
                <div style={{ fontSize: "28px", fontWeight: 900, color: "#34D399", letterSpacing: "-0.5px", marginTop: "2px" }}>
                  {formatCurrency(totalLent)}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  <strong style={{ color: "#F8FAFC" }}>{lentList.length}</strong> people owe you money
                </div>
              </div>
            </div>

            {/* Center: Overall Net Standing Cockpit */}
            <div style={{
              background: "rgba(15, 23, 42, 0.9)",
              borderRadius: "20px",
              padding: "20px 24px",
              textAlign: "center",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
              position: "relative",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <Scale size={14} color="#818CF8" />
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "1px", textTransform: "uppercase" }}>
                  OVERALL NET STANDING
                </span>
              </div>
              <div style={{
                fontSize: "34px",
                fontWeight: 900,
                marginTop: "4px",
                letterSpacing: "-0.5px",
                color: netStanding >= 0 ? "#34D399" : "#FB7185",
              }}>
                {netStanding >= 0 ? `+${formatCurrency(netStanding)}` : `-${formatCurrency(Math.abs(netStanding))}`}
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "8px" }}>
                <span style={{
                  padding: "3px 12px",
                  borderRadius: "9999px",
                  fontSize: "11px",
                  fontWeight: 700,
                  background: netStanding >= 0 ? "rgba(16, 185, 129, 0.2)" : "rgba(244, 63, 94, 0.2)",
                  color: netStanding >= 0 ? "#34D399" : "#FDA4AF",
                  border: `1px solid ${netStanding >= 0 ? "rgba(16, 185, 129, 0.35)" : "rgba(244, 63, 94, 0.35)"}`,
                }}>
                  {netStanding >= 0 ? "✓ Net Creditor (+ Surplus)" : "⚠ Net Debtor (- Liabilities)"}
                </span>
              </div>
            </div>

            {/* Right: Total Borrowed (Payables) */}
            <div style={{ display: "flex", alignItems: "center", gap: "18px", justifyContent: "flex-end" }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "1px", textTransform: "uppercase" }}>
                  PAYABLES (BORROWED)
                </div>
                <div style={{ fontSize: "28px", fontWeight: 900, color: "#FB7185", letterSpacing: "-0.5px", marginTop: "2px" }}>
                  {formatCurrency(totalBorrowed)}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  <strong style={{ color: "#F8FAFC" }}>{borrowedList.length}</strong> debts you owe to others
                </div>
              </div>
              <div style={{
                width: "52px",
                height: "52px",
                borderRadius: "16px",
                background: "rgba(244, 63, 94, 0.15)",
                border: "1px solid rgba(244, 63, 94, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FB7185",
                boxShadow: "0 0 20px rgba(244, 63, 94, 0.2)",
              }}>
                <ArrowUpRight size={26} />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Filter Tabs & Search Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          {/* Pills Tabs */}
          <div className="mobile-scroll-x" style={{ gap: "8px", maxWidth: "100%" }}>
            {[
              { id: "split", label: "Split Cockpit", count: activeLoans.length },
              { id: "lent", label: "Owed to You (Lent)", count: lentList.length },
              { id: "borrowed", label: "You Owe (Debts)", count: borrowedList.length },
              { id: "settled", label: "Settled Ledgers", count: settledList.length },
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
              placeholder="Search person name or note..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="modern-input"
              style={{ paddingLeft: "38px", height: "40px", borderRadius: "9999px" }}
            />
          </div>
        </div>

        {/* 4. Main Content Render: Either Slates or Ledger Sheet Table */}
        {displayMode === "table" ? (
          /* Dense Financial Ledger Sheet Table */
          <div className="glass-panel" style={{ padding: "clamp(18px, 3vw, 26px)" }}>
            <div className="table-responsive-container">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", textAlign: "left" }}>
                  <th style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: "11px", fontWeight: 700 }}>PEER CONTACT</th>
                  <th style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: "11px", fontWeight: 700 }}>RELATION / TYPE</th>
                  <th style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: "11px", fontWeight: 700 }}>REPAYMENT STATUS</th>
                  <th style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: "11px", fontWeight: 700 }}>DEADLINE</th>
                  <th style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: "11px", fontWeight: 700, textAlign: "right" }}>OUTSTANDING BALANCE</th>
                  <th style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: "11px", fontWeight: 700, textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {(activeTab === "split"
                  ? [...lentList, ...borrowedList]
                  : activeTab === "lent"
                  ? lentList
                  : activeTab === "borrowed"
                  ? borrowedList
                  : settledList
                ).map((loan) => {
                  const isSettled = loan.status === "settled" || loan.amount === 0;
                  const isLent = loan.type === "lent";
                  const dueStatus = getDueStatus(loan.dueDate);
                  const { totalRepaid, totalPrincipal, progressPct } = getLoanProgress(loan);

                  return (
                    <tr
                      key={loan._id}
                      style={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "10px",
                            background: isSettled ? "rgba(255,255,255,0.06)" : isLent ? "rgba(16, 185, 129, 0.2)" : "rgba(244, 63, 94, 0.2)",
                            color: isSettled ? "#94A3B8" : isLent ? "#34D399" : "#FDA4AF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: "13px",
                          }}>
                            {loan.personName ? loan.personName[0].toUpperCase() : "?"}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: "#F8FAFC" }}>{loan.personName}</div>
                            {loan.notes && (
                              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{loan.notes}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "14px" }}>
                        <span style={{
                          padding: "3px 8px",
                          borderRadius: "9999px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: isSettled ? "rgba(100, 116, 139, 0.15)" : isLent ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)",
                          color: isSettled ? "#94A3B8" : isLent ? "#34D399" : "#FDA4AF",
                        }}>
                          {isSettled ? "Settled" : isLent ? "They Owe You" : "You Owe"}
                        </span>
                      </td>

                      <td style={{ padding: "14px" }}>
                        {isSettled ? (
                          <span style={{ color: "#34D399", fontSize: "12px", fontWeight: 700 }}>100% Cleared</span>
                        ) : (
                          <div style={{ minWidth: "120px" }}>
                            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "3px" }}>
                              {formatCurrency(totalRepaid)} of {formatCurrency(totalPrincipal)} ({progressPct}%)
                            </div>
                            <div style={{ width: "100%", height: "4px", borderRadius: "9999px", background: "rgba(255, 255, 255, 0.08)" }}>
                              <div style={{
                                width: `${progressPct}%`,
                                height: "100%",
                                borderRadius: "9999px",
                                background: isLent ? "#10B981" : "#F43F5E",
                              }} />
                            </div>
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "14px" }}>
                        <span style={{ color: dueStatus.color, fontSize: "12px", fontWeight: 600 }}>
                          {dueStatus.text}
                        </span>
                      </td>

                      <td style={{ padding: "14px", textAlign: "right" }}>
                        <div style={{
                          fontSize: "16px",
                          fontWeight: 900,
                          color: isSettled ? "var(--text-muted)" : isLent ? "#34D399" : "#FB7185",
                        }}>
                          {isSettled ? formatCurrency(0) : isLent ? `+${formatCurrency(loan.amount)}` : `-${formatCurrency(loan.amount)}`}
                        </div>
                      </td>

                      <td style={{ padding: "14px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          {!isSettled && (
                            <button
                              onClick={() => {
                                setPaymentModalLoan(loan);
                                setPaymentAmount("");
                                setPaymentNotes("");
                              }}
                              className="pill-btn pill-btn-dark"
                              style={{ fontSize: "11px", padding: "5px 12px" }}
                            >
                              {isLent ? "Collect" : "Pay"}
                            </button>
                          )}
                          <button
                            onClick={() => setHistoryModalLoan(loan)}
                            style={{ background: "none", border: "none", color: "#818CF8", cursor: "pointer", padding: "4px" }}
                            title="Audit Ledger"
                          >
                            <History size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(loan)}
                            style={{ background: "none", border: "none", color: "#FCA5A5", cursor: "pointer", padding: "4px" }}
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        ) : (
          /* Executive Slates Mode */
          <>
            {/* Split View Columns */}
            {activeTab === "split" && (
              <div className="grid-responsive-split">
                {/* Column 1: Owed to You (Receivables) */}
                <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10B981" }} />
                      <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                        People Who Owe You (Receivables)
                      </h3>
                    </div>
                    <span style={{
                      fontSize: "12px",
                      fontWeight: 800,
                      color: "#34D399",
                      background: "rgba(16, 185, 129, 0.15)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      padding: "3px 10px",
                      borderRadius: "9999px",
                    }}>
                      {formatCurrency(totalLent)}
                    </span>
                  </div>

                  {lentList.length === 0 ? (
                    <div className="glass-panel" style={{ padding: "44px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                      No active loans where people owe you money.
                    </div>
                  ) : (
                    lentList.map((loan) => renderSlateCard(loan))
                  )}
                </div>

                {/* Column 2: You Owe (Payables) */}
                <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#F43F5E" }} />
                      <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                        People You Owe (Payables)
                      </h3>
                    </div>
                    <span style={{
                      fontSize: "12px",
                      fontWeight: 800,
                      color: "#FB7185",
                      background: "rgba(244, 63, 94, 0.15)",
                      border: "1px solid rgba(244, 63, 94, 0.3)",
                      padding: "3px 10px",
                      borderRadius: "9999px",
                    }}>
                      {formatCurrency(totalBorrowed)}
                    </span>
                  </div>

                  {borrowedList.length === 0 ? (
                    <div className="glass-panel" style={{ padding: "44px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                      You have no outstanding debts owed to others. All clear!
                    </div>
                  ) : (
                    borrowedList.map((loan) => renderSlateCard(loan))
                  )}
                </div>
              </div>
            )}

            {/* Single Views (Lent, Borrowed, Settled) */}
            {activeTab !== "split" && (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
                gap: "24px",
              }}>
                {(activeTab === "lent" ? lentList : activeTab === "borrowed" ? borrowedList : settledList).map((loan) =>
                  renderSlateCard(loan)
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL 1: Add Loan / Debt (Root Fragment Level - Perfect Viewport Centering) */}
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
                <HandCoins size={20} color="#FBBF24" />
                <h3 style={{ fontSize: "19px", fontWeight: 800, color: "#F8FAFC", margin: 0 }}>
                  Add Peer Loan or Debt
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: "rgba(255, 255, 255, 0.08)", border: "none", borderRadius: "50%", width: "32px", height: "32px", color: "#94A3B8", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddLoan} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                  CONTACT / PEER NAME *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Raj, Ifti, Ove, Tanvir"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="modern-input"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                  DIRECTION OF CAPITAL *
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setFormType("lent")}
                    style={{
                      padding: "12px",
                      borderRadius: "14px",
                      border: formType === "lent" ? "1.5px solid #10B981" : "1px solid rgba(255, 255, 255, 0.08)",
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: "13px",
                      background: formType === "lent" ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.04)",
                      color: formType === "lent" ? "#34D399" : "#94A3B8",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <ArrowDownLeft size={18} />
                    <span>I Lent (They owe me)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormType("borrowed")}
                    style={{
                      padding: "12px",
                      borderRadius: "14px",
                      border: formType === "borrowed" ? "1.5px solid #F43F5E" : "1px solid rgba(255, 255, 255, 0.08)",
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: "13px",
                      background: formType === "borrowed" ? "rgba(244, 63, 94, 0.2)" : "rgba(255, 255, 255, 0.04)",
                      color: formType === "borrowed" ? "#FDA4AF" : "#94A3B8",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <ArrowUpRight size={18} />
                    <span>I Borrowed (I owe them)</span>
                  </button>
                </div>
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
                    min="1"
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="modern-input"
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                    TARGET DUE DATE
                  </label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="modern-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                  PURPOSE / NOTES (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lunch split, ticket advance, emergency loan"
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
                  style={{ flex: 1.5 }}
                >
                  {submitting ? "Saving..." : "Create Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Record Repayment (Screen Centered) */}
      {paymentModalLoan && (
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
                  Record Repayment: {paymentModalLoan.personName}
                </h3>
              </div>
              <button
                onClick={() => setPaymentModalLoan(null)}
                style={{ background: "rgba(255, 255, 255, 0.08)", border: "none", borderRadius: "50%", width: "32px", height: "32px", color: "#94A3B8", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{
              background: paymentModalLoan.type === "lent" ? "rgba(16, 185, 129, 0.1)" : "rgba(244, 63, 94, 0.1)",
              border: `1px solid ${paymentModalLoan.type === "lent" ? "rgba(16, 185, 129, 0.25)" : "rgba(244, 63, 94, 0.25)"}`,
              borderRadius: "16px",
              padding: "18px",
              marginBottom: "20px",
            }}>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>
                OUTSTANDING BALANCE
              </div>
              <div style={{ fontSize: "28px", fontWeight: 900, color: paymentModalLoan.type === "lent" ? "#34D399" : "#FB7185", marginTop: "2px" }}>
                {formatCurrency(paymentModalLoan.amount)}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                {paymentModalLoan.type === "lent" ? "They are returning money to you" : "You are paying back your debt"}
              </div>
            </div>

            <form onSubmit={handleRecordPayment} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                  REPAYMENT AMOUNT ($) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min="1"
                  max={paymentModalLoan.amount}
                  placeholder={`Max ${paymentModalLoan.amount}`}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="modern-input"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
                  PAYMENT NOTE / CHANNEL (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid via bKash, Cash in hand"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="modern-input"
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setPaymentModalLoan(null)}
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
                  {submitting ? "Recording..." : "Confirm Repayment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Bilateral Audit Ledger Drawer (Screen Centered) */}
      {historyModalLoan && (
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
          <div style={{
            background: "rgba(15, 23, 42, 0.96)",
            borderRadius: "28px",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.8)",
            maxWidth: "520px",
            width: "100%",
            maxHeight: "85vh",
            overflowY: "auto",
            padding: "32px",
            animation: "fadeIn 0.25s ease-out",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <History size={20} color="#818CF8" />
                  <h3 style={{ fontSize: "19px", fontWeight: 800, color: "#F8FAFC", margin: 0 }}>
                    Ledger: {historyModalLoan.personName}
                  </h3>
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Current Outstanding Balance: <strong style={{ color: "#F8FAFC" }}>{formatCurrency(historyModalLoan.amount)}</strong>
                </div>
              </div>
              <button
                onClick={() => setHistoryModalLoan(null)}
                style={{ background: "rgba(255, 255, 255, 0.08)", border: "none", borderRadius: "50%", width: "32px", height: "32px", color: "#94A3B8", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
              {(historyModalLoan.history || []).length === 0 ? (
                <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                  No transaction events recorded yet.
                </div>
              ) : (
                (historyModalLoan.history || []).map((h, i) => {
                  const isRepayment = h.type === "repayment";
                  return (
                    <div
                      key={h._id || i}
                      style={{
                        padding: "14px 16px",
                        borderRadius: "14px",
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "10px",
                          background: isRepayment ? "rgba(16, 185, 129, 0.15)" : h.type === "lent" ? "rgba(6, 182, 212, 0.15)" : "rgba(244, 63, 94, 0.15)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: isRepayment ? "#34D399" : h.type === "lent" ? "#22D3EE" : "#FDA4AF",
                        }}>
                          {isRepayment ? <Check size={16} /> : <Clock size={16} />}
                        </div>
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: "#F8FAFC", textTransform: "capitalize" }}>
                            {h.type}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                            {formatShortDate(h.date)} {h.notes ? `· ${h.notes}` : ""}
                          </div>
                        </div>
                      </div>

                      <div style={{
                        fontSize: "16px",
                        fontWeight: 900,
                        color: isRepayment ? "#34D399" : h.type === "lent" ? "#22D3EE" : "#FDA4AF",
                      }}>
                        {isRepayment ? `-${formatCurrency(h.amount)}` : `+${formatCurrency(h.amount)}`}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ marginTop: "22px" }}>
              <button
                onClick={() => setHistoryModalLoan(null)}
                className="pill-btn pill-btn-ghost"
                style={{ width: "100%" }}
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
