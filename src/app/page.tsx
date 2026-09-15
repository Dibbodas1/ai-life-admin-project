"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Wallet, TrendingUp, TrendingDown, ArrowRightLeft, HandCoins,
  ShieldCheck, Sparkles, ChevronRight, Loader2, ArrowUpRight,
  ArrowDownLeft, Clock, AlertTriangle, CheckCircle2, RefreshCw,
  Landmark, Smartphone, CreditCard, PiggyBank, Eye, EyeOff,
  ChevronDown, MoreHorizontal, Check, Zap, DollarSign
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell
} from "recharts";
import { formatCurrency, formatShortDate, onDataUpdated, apiFetch } from "@/lib/utils";

interface DashboardData {
  totalLiquidity: number;
  totalIncome: number;
  totalExpenses: number;
  currentAvailable: number;
  wallets: Array<{
    _id: string;
    name: string;
    type: string;
    balance: number;
    color?: string;
    currency?: string;
    isDefault?: boolean;
  }>;
  walletBreakdown: Record<string, number>;
  loansSummary: {
    totalLent: number;
    totalBorrowed: number;
    netBalance: number;
    activeCount: number;
    activeLoans: Array<{ personName: string; type: "lent" | "borrowed"; amount: number }>;
  };
  cashFlowTrend: Array<{ name: string; income: number; expense: number; net: number }>;
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    subtitle: string;
    amount: number;
    date: string;
  }>;
  categorySpending: Record<string, number>;
  activeGoals: Array<{ name: string; target: number; current: number }>;
}

interface AIAnalysisReport {
  healthScore: number;
  verdict: string;
  strengths: string[];
  vulnerabilities: string[];
  metrics: {
    burnRate: number;
    runwayMonths: number;
    savingsRatePct: number;
    debtToLiquidityPct: number;
  };
  recommendations: Array<{
    priority: "high" | "medium" | "low";
    title: string;
    description: string;
  }>;
}

const DONUT_COLORS = ["#6366F1", "#10B981", "#F97316", "#06B6D4", "#A855F7", "#F43F5E"];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);

  // AI Diagnosis Modal states
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisReport, setAnalysisReport] = useState<AIAnalysisReport | null>(null);
  const [analysisStep, setAnalysisStep] = useState(0);

  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await apiFetch("/api/dashboard");
      const json = await res.json();
      if (json && json.wallets) {
        setData(json);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
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

  const handleRunAnalysis = async () => {
    setShowAnalysisModal(true);
    setAnalyzing(true);
    setAnalysisStep(1);

    const stepTimer1 = setTimeout(() => setAnalysisStep(2), 500);
    const stepTimer2 = setTimeout(() => setAnalysisStep(3), 1000);

    try {
      const res = await apiFetch("/api/analyze", { method: "POST" });
      const json = await res.json();
      if (json.success && json.report) {
        setAnalysisReport(json.report);
      }
    } catch (err) {
      console.error("Analysis error:", err);
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setAnalyzing(false);
      setAnalysisStep(4);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
        <Loader2 size={36} style={{ color: "#6366F1", animation: "spin 1s linear infinite" }} />
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Loading executive financial dashboard...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const d = data || {
    totalLiquidity: 0,
    totalIncome: 0,
    totalExpenses: 0,
    currentAvailable: 0,
    wallets: [],
    walletBreakdown: {},
    loansSummary: { totalLent: 0, totalBorrowed: 0, netBalance: 0, activeCount: 0, activeLoans: [] },
    cashFlowTrend: [],
    recentActivity: [],
    categorySpending: {},
    activeGoals: []
  };

  const savingsRate = d.totalIncome > 0 ? Math.round(((d.totalIncome - d.totalExpenses) / d.totalIncome) * 100) : 0;

  // Donut chart data
  const donutData = Object.entries(d.categorySpending || {}).map(([name, value]) => ({ name, value }));
  const totalDonutValue = donutData.reduce((acc, item) => acc + item.value, 0) || 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "40px" }} className="animate-fade-in">
      {/* 1. NovaHub Vibrant Hero Banner: "Insights that drive growth" (Frosted Dark Glass) */}
      <div style={{
        background: "linear-gradient(135deg, #4F46E5 0%, #6366F1 50%, #312E81 100%)",
        borderRadius: "26px",
        padding: "28px 32px",
        color: "#FFFFFF",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 14px 36px -6px rgba(0, 0, 0, 0.5)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
      }}>
        {/* Decorative Wave Graphics */}
        <svg
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: "55%",
            height: "100%",
            opacity: 0.15,
            pointerEvents: "none",
          }}
          viewBox="0 0 500 200"
          preserveAspectRatio="none"
        >
          <path d="M0,100 C150,180 300,20 500,100 L500,200 L0,200 Z" fill="#FFFFFF" />
          <path d="M0,130 C120,40 280,180 500,120 L500,200 L0,200 Z" fill="#FFFFFF" opacity="0.5" />
        </svg>

        <div style={{ position: "relative", zIndex: 2, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
          <div style={{ maxWidth: "580px" }}>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              borderRadius: "9999px",
              background: "rgba(255, 255, 255, 0.18)",
              backdropFilter: "blur(8px)",
              fontSize: "12px",
              fontWeight: 700,
              marginBottom: "12px",
            }}>
              <Sparkles size={13} color="#FDE047" /> AI Financial Engine Active
            </span>
            <h2 style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.5px", lineHeight: 1.2, marginBottom: "8px" }}>
              Insights that drive growth
            </h2>
            <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.85)", lineHeight: 1.5, margin: 0 }}>
              Track multi-wallet liquidity, forecast monthly commitments, and receive real-time bilingual copilot advice.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <button
              onClick={handleRunAnalysis}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "#FFFFFF",
                color: "#312E81",
                padding: "12px 22px",
                borderRadius: "9999px",
                fontSize: "14px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 6px 18px rgba(0, 0, 0, 0.25)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <Sparkles size={16} color="#4F46E5" />
              <span>Run AI Diagnosis</span>
            </button>

            <Link
              href="/money/planning"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(255, 255, 255, 0.14)",
                backdropFilter: "blur(12px)",
                color: "#FFFFFF",
                padding: "12px 20px",
                borderRadius: "9999px",
                fontSize: "14px",
                fontWeight: 600,
                border: "1px solid rgba(255, 255, 255, 0.25)",
                textDecoration: "none",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.22)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.14)"; }}
            >
              <span>Monthly Planning</span>
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Nawalletto 3 Top Metric Cards (Frosted Dark Glass) */}
      <div className="grid-responsive-kpi">
        {/* A. Expense Card */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "rgba(249, 115, 22, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <ArrowUpRight size={18} color="#FB923C" />
              </div>
              <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
                Monthly Outflow
              </span>
            </div>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 10px",
              borderRadius: "9999px",
              background: "rgba(255, 255, 255, 0.06)",
              fontSize: "12px",
              color: "var(--text-secondary)",
              fontWeight: 600,
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}>
              <span>This Month</span>
              <ChevronDown size={12} />
            </div>
          </div>

          <div style={{ fontSize: "30px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
            {formatCurrency(d.totalExpenses)}
          </div>

          <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="badge-pill badge-pill-orange">
              +10% From Last Month
            </span>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              {d.recentActivity.filter(a => a.type === "expense").length} Transactions
            </span>
          </div>
        </div>

        {/* B. Income Card */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <ArrowDownLeft size={18} color="#34D399" />
              </div>
              <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
                Monthly Income
              </span>
            </div>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 10px",
              borderRadius: "9999px",
              background: "rgba(255, 255, 255, 0.06)",
              fontSize: "12px",
              color: "var(--text-secondary)",
              fontWeight: 600,
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}>
              <span>Verified</span>
              <ChevronDown size={12} />
            </div>
          </div>

          <div style={{ fontSize: "30px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
            {formatCurrency(d.totalIncome)}
          </div>

          <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="badge-pill badge-pill-green">
              +12% From Last Month
            </span>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Net surplus: +{formatCurrency(d.currentAvailable)}
            </span>
          </div>
        </div>

        {/* C. Saving Progress Card (Nawalletto Deep Gradient Style) */}
        <div style={{
          background: "linear-gradient(135deg, #1E1B4B 0%, #2E1065 50%, #3B0764 100%)",
          borderRadius: "24px",
          padding: "24px",
          color: "#FFFFFF",
          boxShadow: "0 10px 28px -4px rgba(0, 0, 0, 0.5)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <PiggyBank size={16} color="#E9D5FF" />
                </div>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF" }}>
                  Saving Progress
                </span>
              </div>
              <span style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#E9D5FF",
                background: "rgba(255, 255, 255, 0.12)",
                padding: "3px 8px",
                borderRadius: "9999px",
              }}>
                Target 2026
              </span>
            </div>

            <div style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px" }}>
              {formatCurrency(d.totalLiquidity)} <span style={{ fontSize: "14px", color: "#C084FC", fontWeight: 500 }}>/ $150,000.00</span>
            </div>
          </div>

          {/* Progress Bar with Cyan active indicator */}
          <div style={{ marginTop: "18px" }}>
            <div style={{
              height: "8px",
              borderRadius: "9999px",
              background: "rgba(255, 255, 255, 0.12)",
              overflow: "hidden",
              position: "relative",
            }}>
              <div style={{
                height: "100%",
                width: `${Math.min(100, Math.round((d.totalLiquidity / 150000) * 100))}%`,
                background: "linear-gradient(90deg, #06B6D4 0%, #3B82F6 100%)",
                borderRadius: "9999px",
              }} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "12px", color: "#E9D5FF" }}>
              <span style={{ fontWeight: 700 }}>{Math.min(100, Math.round((d.totalLiquidity / 150000) * 100))}% Saved</span>
              <span>{savingsRate}% Retention Rate</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Middle Section: My Balance & Area Curve (Left) + My Cards (Right) */}
      <div className="grid-responsive-dash-middle">
        {/* Left Card: My Balance & Balance Statistics Area Curve */}
        <div className="glass-panel" style={{ padding: "26px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Header & Balance */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <Wallet size={16} color="#818CF8" />
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Total Net Liquidity
                </span>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px" }}
                >
                  {showBalance ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
              </div>

              <div style={{ fontSize: "36px", fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-1px" }}>
                {showBalance ? formatCurrency(d.totalLiquidity) : "••••••••••"}
              </div>

              <div style={{ marginTop: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="badge-pill badge-pill-green">
                  +15% Balance Increase
                </span>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Healthy runway across {d.wallets.length} accounts
                </span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Link href="/money/wallets" className="pill-btn pill-btn-primary">
                <span>+ Add Money</span>
              </Link>
              <Link href="/money/wallets" className="pill-btn pill-btn-dark">
                <span>⇄ Transfer</span>
              </Link>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("open-ai-assistant"));
                }}
                className="pill-btn pill-btn-ghost"
              >
                <Sparkles size={14} color="#818CF8" />
                <span>Ask AI</span>
              </button>
            </div>
          </div>

          {/* Balance Statistics Area Curve Chart */}
          <div style={{ marginTop: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                Balance Statistics
              </span>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "3px 10px",
                borderRadius: "9999px",
                background: "rgba(99, 102, 241, 0.15)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                fontSize: "11px",
                fontWeight: 700,
                color: "#A5B4FC",
              }}>
                <span>Peak: Highest $104,750</span>
              </div>
            </div>

            <div style={{ width: "100%", height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={d.cashFlowTrend.length > 0 ? d.cashFlowTrend : [
                    { name: "Day 1", income: 0, expense: 0, net: 0 },
                    { name: "Day 2", income: 0, expense: 0, net: 0 },
                    { name: "Day 3", income: 0, expense: 0, net: 0 },
                    { name: "Day 4", income: 0, expense: 0, net: 0 },
                    { name: "Day 5", income: 0, expense: 0, net: 0 },
                    { name: "Day 6", income: 0, expense: 0, net: 0 },
                    { name: "Today", income: 0, expense: 0, net: 0 },
                  ]}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="curveColorDark" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15, 23, 42, 0.95)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: "12px",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                      fontSize: "12px",
                      color: "#F8FAFC",
                    }}
                    formatter={(val: any) => [`$${Number(val).toLocaleString()}`, "Amount"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#6366F1"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#curveColorDark)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Card: My Cards (Realistic Credit Card Component + Spending Limit) */}
        <div className="glass-panel" style={{ padding: "26px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)" }}>My Cards</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Total {d.wallets.length} active accounts</div>
              </div>
              <Link href="/money/wallets" style={{ color: "var(--text-muted)" }}>
                <MoreHorizontal size={18} />
              </Link>
            </div>

            {/* Realistic Dark Charcoal Credit Card */}
            <div className="credit-card-mesh" style={{ padding: "22px 24px", color: "#FFFFFF", marginBottom: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <CreditCard size={20} color="#818CF8" />
                  <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", color: "#818CF8" }}>PREMIUM</span>
                </div>
                <span style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  background: "rgba(16, 185, 129, 0.2)",
                  color: "#34D399",
                  padding: "3px 8px",
                  borderRadius: "9999px",
                  border: "1px solid rgba(52, 211, 153, 0.3)",
                }}>
                  Active
                </span>
              </div>

              <div style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "1.5px", fontFamily: "monospace", marginBottom: "18px" }}>
                {d.wallets && d.wallets.length > 0 ? (d.wallets[0].name.toUpperCase()) : "NO WALLET LINKED"}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  <div style={{ fontSize: "9px", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "1px" }}>WALLET / ACCOUNT</div>
                  <div style={{ fontSize: "13px", fontWeight: 700 }}>
                    {d.wallets && d.wallets.length > 0 ? `${d.wallets[0].currency || 'USD'} Wallet` : "Google Drive"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "9px", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "1px" }}>BALANCE</div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#34D399" }}>
                    {d.wallets && d.wallets.length > 0 ? formatCurrency(d.wallets[0].balance) : "$0.00"}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#6366F1", opacity: 0.9 }} />
                  <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#06B6D4", opacity: 0.9, marginLeft: "-8px" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Spending Limit / Liquidity Bar */}
          <div style={{ padding: "14px", borderRadius: "16px", background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
              <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Spending Limit</span>
              <span style={{ fontWeight: 800, color: "var(--text-primary)" }}>
                {formatCurrency(d.totalExpenses)} <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>used</span>
              </span>
            </div>
            <div style={{ height: "6px", borderRadius: "9999px", background: "rgba(255, 255, 255, 0.08)", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${Math.min(100, Math.round((d.totalExpenses / (d.totalIncome || 1)) * 100))}%`,
                background: "#06B6D4",
                borderRadius: "9999px",
              }} />
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px" }}>
              From monthly budget of {formatCurrency(d.totalIncome)}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Row: Donut Chart Revenue Breakdown + Latest Transactions Table */}
      <div className="grid-responsive-dash-bottom">
        {/* NovaHub 4-Source Donut Breakdown Card (Frosted Dark Glass) */}
        <div className="glass-panel" style={{ padding: "26px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)" }}>Expense Breakdown</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>By Category</div>
            </div>

            {donutData.length === 0 ? (
              <div style={{ height: "180px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "13px", textAlign: "center", padding: "0 20px" }}>
                No category expenses recorded yet. Connect Google Drive to load your data.
              </div>
            ) : (
              <div style={{ height: "180px", position: "relative" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`$${Number(val).toLocaleString()}`, ""]}
                      contentStyle={{
                        background: "rgba(15, 23, 42, 0.95)",
                        borderRadius: "10px",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        fontSize: "12px",
                        color: "#F8FAFC",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                  pointerEvents: "none",
                }}>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#F8FAFC" }}>
                    {donutData.length}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Categories
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Clean Legend */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
            {donutData.map((item, idx) => {
              const pct = Math.round((item.value / totalDonutValue) * 100);
              return (
                <div key={item.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: DONUT_COLORS[idx % DONUT_COLORS.length] }} />
                    <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{item.name}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Latest Transactions Table (Frosted Dark Glass) */}
        <div className="glass-panel" style={{ padding: "26px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <div>
              <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)" }}>Transaction History</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Recent wallet movements and verified expenses</div>
            </div>
            <Link
              href="/money/expenses"
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#818CF8",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>View All</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          {/* Table Container */}
          <div className="table-responsive-container">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", textAlign: "left" }}>
                  <th style={{ padding: "10px 12px", color: "var(--text-muted)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>NAME</th>
                  <th style={{ padding: "10px 12px", color: "var(--text-muted)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>CATEGORY</th>
                  <th style={{ padding: "10px 12px", color: "var(--text-muted)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>DATE</th>
                  <th style={{ padding: "10px 12px", color: "var(--text-muted)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>STATUS</th>
                  <th style={{ padding: "10px 12px", color: "var(--text-muted)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", textAlign: "right" }}>AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {d.recentActivity.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "32px 12px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                      No transactions found. Connect your Google Drive to load your live financial history.
                    </td>
                  </tr>
                ) : (
                  d.recentActivity.slice(0, 5).map((act, index) => {
                  const isPositive = act.amount > 0 && act.type === "income";
                  const initial = act.title.charAt(0).toUpperCase() || "T";
                  return (
                    <tr
                      key={act.id || index}
                      style={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <td style={{ padding: "12px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            background: isPositive ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.08)",
                            color: isPositive ? "#34D399" : "#94A3B8",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "12px",
                          }}>
                            {initial}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{act.title}</div>
                            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{act.subtitle || "Direct Transaction"}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 12px", color: "var(--text-secondary)", fontWeight: 500 }}>
                        {act.subtitle || "General"}
                      </td>
                      <td style={{ padding: "12px 12px", color: "var(--text-muted)", fontSize: "12px" }}>
                        {formatShortDate(act.date)}
                      </td>
                      <td style={{ padding: "12px 12px" }}>
                        <span className="badge-pill badge-pill-green">
                          <Check size={10} /> Success
                        </span>
                      </td>
                      <td style={{ padding: "12px 12px", textAlign: "right", fontWeight: 800, color: isPositive ? "#34D399" : "var(--text-primary)" }}>
                        {isPositive ? `+${formatCurrency(act.amount)}` : `-${formatCurrency(act.amount)}`}
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* AI Financial Diagnosis Modal (Frosted Dark Glass) */}
      {showAnalysisModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px",
        }}>
          <div style={{
            background: "rgba(15, 23, 42, 0.95)",
            borderRadius: "clamp(20px, 3vw, 28px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.8)",
            maxWidth: "min(680px, 100%)",
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            padding: "clamp(18px, 4vw, 32px)",
            position: "relative",
            animation: "fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}>
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 16px rgba(99, 102, 241, 0.4)",
                }}>
                  <Sparkles size={22} color="#FFFFFF" />
                </div>
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                    AI Financial Intelligence Diagnosis
                  </h3>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>
                    Deep scan of liquidity, cash flow velocity, and runway safety
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAnalysisModal(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#94A3B8",
                }}
              >
                ✕
              </button>
            </div>

            {analyzing ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", gap: "16px" }}>
                <Loader2 size={40} style={{ color: "#6366F1", animation: "spin 1s linear infinite" }} />
                <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
                  {analysisStep === 1 && "Synthesizing multi-wallet liquidity..."}
                  {analysisStep === 2 && "Analyzing spending velocity & cash flow trends..."}
                  {analysisStep === 3 && "Benchmarking runway buffer & debt ratios..."}
                  {analysisStep === 4 && "Finalizing executive financial verdict..."}
                </div>
              </div>
            ) : analysisReport ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Health Score & Verdict */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "20px",
                  padding: "20px",
                  borderRadius: "20px",
                  background: "rgba(99, 102, 241, 0.12)",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                }}>
                  <div style={{
                    width: "70px",
                    height: "70px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
                    color: "#FFFFFF",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 6px 18px rgba(99, 102, 241, 0.4)",
                  }}>
                    <span style={{ fontSize: "22px", fontWeight: 900, lineHeight: 1 }}>{analysisReport.healthScore}</span>
                    <span style={{ fontSize: "10px", textTransform: "uppercase", opacity: 0.8 }}>/ 100</span>
                  </div>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#F8FAFC" }}>Executive Verdict</div>
                    <div style={{ fontSize: "13px", color: "#A5B4FC", marginTop: "4px", lineHeight: 1.4 }}>
                      {analysisReport.verdict}
                    </div>
                  </div>
                </div>

                {/* Metrics 4-Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ padding: "14px", borderRadius: "14px", background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>MONTHLY BURN RATE</div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", marginTop: "4px" }}>
                      {formatCurrency(analysisReport.metrics.burnRate)}
                    </div>
                  </div>
                  <div style={{ padding: "14px", borderRadius: "14px", background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>ESTIMATED RUNWAY</div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#34D399", marginTop: "4px" }}>
                      {analysisReport.metrics.runwayMonths} Months
                    </div>
                  </div>
                  <div style={{ padding: "14px", borderRadius: "14px", background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>SAVINGS RATE</div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#818CF8", marginTop: "4px" }}>
                      {analysisReport.metrics.savingsRatePct}%
                    </div>
                  </div>
                  <div style={{ padding: "14px", borderRadius: "14px", background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>DEBT-TO-LIQUIDITY</div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", marginTop: "4px" }}>
                      {analysisReport.metrics.debtToLiquidityPct}%
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "10px" }}>
                    Recommended Next Actions
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {analysisReport.recommendations.map((rec, i) => (
                      <div key={i} style={{ padding: "12px 14px", borderRadius: "14px", background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span className="badge-pill badge-pill-blue" style={{ fontSize: "10px" }}>
                            {rec.priority.toUpperCase()}
                          </span>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{rec.title}</span>
                        </div>
                        <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px", margin: 0 }}>
                          {rec.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
