"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Sparkles, Loader2, ShoppingCart, ShieldCheck, AlertTriangle, XCircle,
  TrendingDown, Calendar, Wallet as WalletIcon, ArrowRight, CheckCircle2,
  ChevronDown, ChevronUp, Layers, HelpCircle, ArrowUpRight, Gauge,
  RefreshCw, Sliders, History, DollarSign, Target, Zap, Clock, Info
} from "lucide-react";
import { formatCurrency, onDataUpdated, apiFetch } from "@/lib/utils";

interface ReasoningMetric {
  label: string;
  value: string;
  delta?: string;
  status?: "positive" | "warning" | "danger" | "neutral";
}

interface ReasoningStep {
  id: string;
  stepNumber: number;
  title: string;
  category: "solvency" | "commitments" | "runway" | "goals" | "verdict";
  verdict: "pass" | "caution" | "fail";
  summary: string;
  details: string;
  metrics: ReasoningMetric[];
}

interface DetailedGoalImpact {
  name: string;
  target: number;
  current: number;
  needed: number;
  percentCapitalImpact: number;
  estimatedDelayDays: number;
  severe: boolean;
  delayNotice: string;
}

interface AlternativeStrategy {
  title: string;
  tag: string;
  description: string;
  benefit: string;
  actionableText: string;
}

interface AnalysisResult {
  affordable: boolean;
  impact: "minimal" | "moderate" | "significant" | "critical";
  safetyScore: number;
  verdictBadge: "SAFE TO BUY" | "BUY WITH CAUTION" | "NOT RECOMMENDED";
  currentAvailable: number;
  totalLiquidity: number;
  afterPurchase: number;
  upcomingCommitments: number;
  upcomingMonthlyPlansAmount: number;
  debtObligations: number;
  totalObligations: number;
  remainingAfterCommitments: number;
  remainingAfterAllObligations: number;
  liquidityBufferPercent: number;
  dailyBurnRate: number;
  runwayImpactDays: number;
  goalImpact: string[];
  detailedGoalImpact: DetailedGoalImpact[];
  reasoningSteps: ReasoningStep[];
  aiAnalysis: string;
  recommendation: string;
  bestFundingWallet?: {
    name: string;
    type: string;
    balance: number;
    canCover: boolean;
  };
  alternativeStrategies: AlternativeStrategy[];
}

interface LiveContextSummary {
  totalWalletLiquidity: number;
  currentAvailable: number;
  upcomingCommitments: number;
  currentMonthSpend: number;
  activeGoalsCount: number;
  wallets: Array<{ name: string; type: string; balance: number }>;
}

interface HistoryItem {
  id: string;
  description: string;
  amount: number;
  date: string;
  safetyScore: number;
  verdictBadge: "SAFE TO BUY" | "BUY WITH CAUTION" | "NOT RECOMMENDED";
}

const PRESET_IDEAS = [
  { label: "💻 MacBook Pro M3", desc: "Apple MacBook Pro M3 (16GB/512GB)", amount: 1800, category: "Tech & Gadgets" },
  { label: "🎮 PS5 Pro", desc: "Sony PlayStation 5 Pro Console", amount: 700, category: "Entertainment" },
  { label: "📱 iPhone 16 Pro", desc: "Apple iPhone 16 Pro 256GB", amount: 1199, category: "Tech & Gadgets" },
  { label: "✈️ Tokyo Flight", desc: "Roundtrip Flight Tickets to Tokyo", amount: 1250, category: "Travel & Leisure" },
  { label: "🎧 Sony WH-1000XM5", desc: "Sony Noise Canceling Headphones", amount: 350, category: "Electronics" },
  { label: "🛋️ Ergonomic Chair", desc: "Herman Miller Ergonomic Task Chair", amount: 650, category: "Home & Work" },
];

export default function PurchaseDecisionPage() {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Tech & Gadgets");
  const [selectedWallet, setSelectedWallet] = useState<string>("auto");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [contextSummary, setContextSummary] = useState<LiveContextSummary | null>(null);
  const [expandedStep, setExpandedStep] = useState<string | null>("step-solvency");
  const [activeScenario, setActiveScenario] = useState<"lump" | "installment" | "postpone" | "discount">("lump");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load Financial Context
  const fetchContext = async () => {
    try {
      const res = await apiFetch("/api/purchase-analysis");
      if (res.ok) {
        const data = await res.json();
        setContextSummary(data);
      }
    } catch (err) {
      console.error("Failed to load context:", err);
    }
  };

  useEffect(() => {
    fetchContext();
    const unsubscribe = onDataUpdated(() => {
      fetchContext();
    });

    // Load evaluation history from localStorage
    try {
      const saved = localStorage.getItem("ai_purchase_history");
      if (saved) setHistory(JSON.parse(saved));
    } catch {}

    return () => unsubscribe();
  }, []);

  const analyze = async (targetDesc?: string, targetAmount?: number) => {
    const d = targetDesc || description;
    const a = targetAmount !== undefined ? targetAmount : parseFloat(amount);
    if (!d || isNaN(a) || a <= 0) return;

    setLoading(true);
    try {
      const res = await apiFetch("/api/purchase-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: d, amount: a }),
      });
      if (res.ok) {
        const data: AnalysisResult = await res.json();
        setResult(data);
        setActiveScenario("lump");
        setExpandedStep(data.reasoningSteps[0]?.id || "step-solvency");

        // Save to evaluation history
        const newHistoryItem: HistoryItem = {
          id: crypto.randomUUID(),
          description: d,
          amount: a,
          date: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
          safetyScore: data.safetyScore,
          verdictBadge: data.verdictBadge,
        };
        setHistory(prev => {
          const updated = [newHistoryItem, ...prev.filter(item => item.description !== d)].slice(0, 8);
          try { localStorage.setItem("ai_purchase_history", JSON.stringify(updated)); } catch {}
          return updated;
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectPreset = (preset: typeof PRESET_IDEAS[0]) => {
    setDescription(preset.desc);
    setAmount(preset.amount.toString());
    setCategory(preset.category);
    analyze(preset.desc, preset.amount);
  };

  // Verdict Colors & Icons
  const getVerdictStyle = (badge?: string) => {
    switch (badge) {
      case "SAFE TO BUY":
        return {
          bg: "rgba(16, 185, 129, 0.12)",
          border: "rgba(16, 185, 129, 0.35)",
          text: "#34D399",
          glow: "rgba(16, 185, 129, 0.25)",
          icon: ShieldCheck,
          label: "Safe to Acquire",
        };
      case "BUY WITH CAUTION":
        return {
          bg: "rgba(245, 158, 11, 0.12)",
          border: "rgba(245, 158, 11, 0.35)",
          text: "#FBBF24",
          glow: "rgba(245, 158, 11, 0.25)",
          icon: AlertTriangle,
          label: "Exercise Prudence",
        };
      case "NOT RECOMMENDED":
      default:
        return {
          bg: "rgba(244, 63, 94, 0.12)",
          border: "rgba(244, 63, 94, 0.35)",
          text: "#FB7185",
          glow: "rgba(244, 63, 94, 0.25)",
          icon: XCircle,
          label: "High Financial Stress",
        };
    }
  };

  const vStyle = getVerdictStyle(result?.verdictBadge);
  const VerdictIcon = vStyle.icon;

  return (
    <div style={{ paddingBottom: "80px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Page Header with Glowing Indigo/Cyan Accent */}
      <div style={{
        marginBottom: "28px",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "16px",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)",
              border: "1px solid rgba(6, 182, 212, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 15px rgba(6, 182, 212, 0.25)",
            }}>
              <Sparkles size={20} color="#22D3EE" />
            </div>
            <h1 style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "#F8FAFC",
              letterSpacing: "-0.5px",
              margin: 0,
            }}>
              Purchase AI Decision Engine
            </h1>
          </div>
          <p style={{ color: "#94A3B8", fontSize: "14px", margin: 0, maxWidth: "680px", lineHeight: 1.5 }}>
            Real-time multi-dimensional financial stress testing. Audits wallet reserves, 14-day obligations, 
            burn rate degradation, and savings goal cannibalization before you spend.
          </p>
        </div>

        {/* Action Header Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {history.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 16px",
                borderRadius: "12px",
                background: showHistory ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#F8FAFC",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <History size={16} color="#818CF8" />
              <span>History ({history.length})</span>
            </button>
          )}

          <button
            onClick={fetchContext}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 14px",
              borderRadius: "12px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#94A3B8",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} />
            <span>Refresh Context</span>
          </button>
        </div>
      </div>

      {/* Live Financial Context Bar */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
        gap: "14px",
        marginBottom: "28px",
      }}>
        <div style={{
          padding: "16px 20px",
          borderRadius: "16px",
          background: "rgba(255, 255, 255, 0.03)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.07)",
          display: "flex",
          alignItems: "center",
          gap: "14px",
        }}>
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            background: "rgba(6, 182, 212, 0.12)",
            border: "1px solid rgba(6, 182, 212, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#06B6D4",
          }}>
            <WalletIcon size={20} />
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Total Liquid Funds
            </div>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#F8FAFC", marginTop: "2px" }}>
              {contextSummary ? formatCurrency(contextSummary.totalWalletLiquidity || contextSummary.currentAvailable) : "..."}
            </div>
          </div>
        </div>

        <div style={{
          padding: "16px 20px",
          borderRadius: "16px",
          background: "rgba(255, 255, 255, 0.03)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.07)",
          display: "flex",
          alignItems: "center",
          gap: "14px",
        }}>
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            background: "rgba(245, 158, 11, 0.12)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#F59E0B",
          }}>
            <Calendar size={20} />
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              14-Day Obligations
            </div>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#FBBF24", marginTop: "2px" }}>
              {contextSummary ? formatCurrency(contextSummary.upcomingCommitments) : "..."}
            </div>
          </div>
        </div>

        <div style={{
          padding: "16px 20px",
          borderRadius: "16px",
          background: "rgba(255, 255, 255, 0.03)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.07)",
          display: "flex",
          alignItems: "center",
          gap: "14px",
        }}>
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            background: "rgba(244, 63, 94, 0.12)",
            border: "1px solid rgba(244, 63, 94, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#F43F5E",
          }}>
            <TrendingDown size={20} />
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Current Month Spent
            </div>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#FB7185", marginTop: "2px" }}>
              {contextSummary ? formatCurrency(contextSummary.currentMonthSpend) : "..."}
            </div>
          </div>
        </div>

        <div style={{
          padding: "16px 20px",
          borderRadius: "16px",
          background: "rgba(255, 255, 255, 0.03)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.07)",
          display: "flex",
          alignItems: "center",
          gap: "14px",
        }}>
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            background: "rgba(99, 102, 241, 0.12)",
            border: "1px solid rgba(99, 102, 241, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#818CF8",
          }}>
            <Target size={20} />
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Active Goals Audited
            </div>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#A5B4FC", marginTop: "2px" }}>
              {contextSummary ? `${contextSummary.activeGoalsCount} Targets` : "..."}
            </div>
          </div>
        </div>
      </div>

      {/* History Drawer / Banner if open */}
      {showHistory && history.length > 0 && (
        <div style={{
          marginBottom: "24px",
          padding: "20px",
          borderRadius: "18px",
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(14px)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#F8FAFC", display: "flex", alignItems: "center", gap: "8px" }}>
              <History size={15} color="#818CF8" />
              <span>Recent Purchase Evaluations</span>
            </div>
            <button
              onClick={() => {
                setHistory([]);
                localStorage.removeItem("ai_purchase_history");
              }}
              style={{ background: "none", border: "none", color: "#64748B", fontSize: "12px", cursor: "pointer" }}
            >
              Clear History
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "10px" }}>
            {history.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setDescription(item.description);
                  setAmount(item.amount.toString());
                  analyze(item.description, item.amount);
                }}
                style={{
                  padding: "12px 14px",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  transition: "all 0.15s ease",
                }}
              >
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#F8FAFC" }}>{item.description}</div>
                  <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>{item.date}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#F8FAFC" }}>{formatCurrency(item.amount)}</div>
                  <div style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    marginTop: "2px",
                    color: item.safetyScore >= 75 ? "#34D399" : (item.safetyScore >= 50 ? "#FBBF24" : "#FB7185"),
                  }}>
                    {item.safetyScore}/100
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Input Form & Reasoning Output */}
      <div className={result ? "grid-responsive-purchase" : ""}>
        
        {/* Left Column: Input Form & Presets */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Input Glass Card */}
          <div style={{
            padding: "28px",
            borderRadius: "20px",
            background: "rgba(255, 255, 255, 0.03)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(99, 102, 241, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#818CF8",
              }}>
                <ShoppingCart size={17} />
              </div>
              <div>
                <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#F8FAFC", margin: 0 }}>
                  Evaluate Planned Purchase
                </h2>
                <div style={{ fontSize: "12px", color: "#64748B" }}>
                  Run comprehensive liquidity &amp; timeline stress test
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Description Input */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#94A3B8", marginBottom: "6px" }}>
                  Item or Experience Description *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apple MacBook Pro M3, Tokyo Flights"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") analyze(); }}
                  style={{
                    width: "100%",
                    padding: "13px 16px",
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#F8FAFC",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Amount Input */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#94A3B8", marginBottom: "6px" }}>
                  Estimated Cost ($) *
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{
                    position: "absolute",
                    left: "16px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#64748B",
                    fontSize: "16px",
                    fontWeight: 700,
                  }}>
                    $
                  </span>
                  <input
                    type="number"
                    step="any"
                    placeholder="1200.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") analyze(); }}
                    style={{
                      width: "100%",
                      padding: "13px 16px 13px 36px",
                      borderRadius: "12px",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#F8FAFC",
                      fontSize: "16px",
                      fontWeight: 700,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Category & Wallet Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#94A3B8", marginBottom: "6px" }}>
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "11px 12px",
                      borderRadius: "10px",
                      background: "#0F1424",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#F8FAFC",
                      fontSize: "13px",
                      outline: "none",
                    }}
                  >
                    <option value="Tech & Gadgets">Tech &amp; Gadgets</option>
                    <option value="Travel & Leisure">Travel &amp; Leisure</option>
                    <option value="Home & Work">Home &amp; Work</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Vehicle & Transport">Vehicle &amp; Transport</option>
                    <option value="Education & Courses">Education &amp; Courses</option>
                    <option value="Luxury & Fashion">Luxury &amp; Fashion</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#94A3B8", marginBottom: "6px" }}>
                    Funding Source
                  </label>
                  <select
                    value={selectedWallet}
                    onChange={(e) => setSelectedWallet(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "11px 12px",
                      borderRadius: "10px",
                      background: "#0F1424",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#F8FAFC",
                      fontSize: "13px",
                      outline: "none",
                    }}
                  >
                    <option value="auto">Auto (Best Liquid Wallet)</option>
                    {contextSummary?.wallets?.map((w, idx) => (
                      <option key={idx} value={w.name}>
                        {w.name} ({formatCurrency(w.balance)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                onClick={() => analyze()}
                disabled={loading || !description || !amount}
                style={{
                  marginTop: "8px",
                  padding: "15px",
                  borderRadius: "14px",
                  background: (!description || !amount)
                    ? "rgba(255, 255, 255, 0.08)"
                    : "linear-gradient(135deg, #06B6D4 0%, #6366F1 50%, #4F46E5 100%)",
                  border: "none",
                  color: "#FFFFFF",
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: (loading || !description || !amount) ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  boxShadow: (!description || !amount) ? "none" : "0 8px 25px rgba(99, 102, 241, 0.4)",
                  transition: "all 0.2s ease",
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                    <span>Orchestrating Reasoning Engine...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>Run AI Reasoning Audit</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick-Test Presets */}
          <div style={{
            padding: "22px",
            borderRadius: "20px",
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "14px" }}>
              Quick-Test Presets
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {PRESET_IDEAS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => selectPreset(preset)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "10px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    color: "#CBD5E1",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.15s ease",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "rgba(99, 102, 241, 0.12)";
                    e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.3)";
                    e.currentTarget.style.color = "#FFFFFF";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                    e.currentTarget.style.color = "#CBD5E1";
                  }}
                >
                  <span>{preset.label}</span>
                  <span style={{ color: "#64748B", fontSize: "11px" }}>${preset.amount}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Reasoning Representation */}
        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }} className="animate-fade-in">
            
            {/* 1. Executive Verdict & Solvency Gauge Banner */}
            <div style={{
              padding: "26px",
              borderRadius: "22px",
              background: `linear-gradient(135deg, ${vStyle.bg} 0%, rgba(11, 15, 28, 0.9) 100%)`,
              backdropFilter: "blur(20px)",
              border: `1px solid ${vStyle.border}`,
              boxShadow: `0 12px 35px ${vStyle.glow}`,
              position: "relative",
              overflow: "hidden",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "20px" }}>
                
                {/* Left: Verdict & Title */}
                <div style={{ flex: 1, minWidth: "260px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                    <div style={{
                      padding: "6px 14px",
                      borderRadius: "9999px",
                      background: vStyle.border,
                      color: vStyle.text,
                      fontSize: "12px",
                      fontWeight: 800,
                      letterSpacing: "0.5px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}>
                      <VerdictIcon size={14} />
                      <span>{result.verdictBadge}</span>
                    </div>

                    <div style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#94A3B8",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}>
                      Impact: <span style={{ color: "#F8FAFC" }}>{result.impact}</span>
                    </div>
                  </div>

                  <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#F8FAFC", margin: "0 0 10px 0" }}>
                    {description} — {formatCurrency(parseFloat(amount))}
                  </h3>

                  <p style={{ fontSize: "14px", color: "#CBD5E1", lineHeight: 1.6, margin: "0 0 16px 0" }}>
                    {result.aiAnalysis}
                  </p>

                  <div style={{
                    padding: "12px 16px",
                    borderRadius: "12px",
                    background: "rgba(0, 0, 0, 0.35)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}>
                    <Zap size={16} color="#F59E0B" />
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#F8FAFC" }}>
                      {result.recommendation}
                    </div>
                  </div>
                </div>

                {/* Right: Solvency Score Dial */}
                <div style={{
                  padding: "18px 24px",
                  borderRadius: "18px",
                  background: "rgba(0, 0, 0, 0.4)",
                  border: `1px solid ${vStyle.border}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: "150px",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
                    Safety Index
                  </div>
                  <div style={{
                    fontSize: "44px",
                    fontWeight: 900,
                    color: vStyle.text,
                    lineHeight: 1,
                    letterSpacing: "-1px",
                  }}>
                    {result.safetyScore}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748B", fontWeight: 600, marginTop: "4px" }}>
                    out of 100
                  </div>
                  <div style={{
                    marginTop: "10px",
                    width: "100%",
                    height: "4px",
                    background: "rgba(255, 255, 255, 0.1)",
                    borderRadius: "999px",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${result.safetyScore}%`,
                      height: "100%",
                      background: vStyle.text,
                      borderRadius: "999px",
                    }} />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Visual Cash-Flow Waterfall Simulator */}
            <div style={{
              padding: "24px",
              borderRadius: "20px",
              background: "rgba(255, 255, 255, 0.03)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <div>
                  <h4 style={{ fontSize: "15px", fontWeight: 700, color: "#F8FAFC", margin: 0 }}>
                    Deterministic Cash-Flow Waterfall
                  </h4>
                  <div style={{ fontSize: "12px", color: "#64748B" }}>
                    Step-by-step capital transition after deductions &amp; obligations
                  </div>
                </div>
                <div style={{
                  padding: "4px 10px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.06)",
                  fontSize: "11px",
                  color: "#94A3B8",
                  fontWeight: 600,
                }}>
                  Live Simulation
                </div>
              </div>

              {/* Waterfall Steps Bar */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: "10px",
              }}>
                <div style={{
                  padding: "12px",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}>
                  <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 600 }}>1. Start Liquidity</div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "#F8FAFC", marginTop: "4px" }}>
                    {formatCurrency(result.totalLiquidity)}
                  </div>
                </div>

                <div style={{
                  padding: "12px",
                  borderRadius: "12px",
                  background: "rgba(244, 63, 94, 0.08)",
                  border: "1px solid rgba(244, 63, 94, 0.2)",
                }}>
                  <div style={{ fontSize: "11px", color: "#FB7185", fontWeight: 600 }}>2. Planned Purchase</div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "#FB7185", marginTop: "4px" }}>
                    -{formatCurrency(parseFloat(amount))}
                  </div>
                </div>

                <div style={{
                  padding: "12px",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}>
                  <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 600 }}>3. Cash Residual</div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: result.afterPurchase > 0 ? "#F8FAFC" : "#FB7185", marginTop: "4px" }}>
                    {formatCurrency(result.afterPurchase)}
                  </div>
                </div>

                <div style={{
                  padding: "12px",
                  borderRadius: "12px",
                  background: "rgba(245, 158, 11, 0.08)",
                  border: "1px solid rgba(245, 158, 11, 0.2)",
                }}>
                  <div style={{ fontSize: "11px", color: "#FBBF24", fontWeight: 600 }}>4. 14d Obligations</div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "#FBBF24", marginTop: "4px" }}>
                    -{formatCurrency(result.totalObligations)}
                  </div>
                </div>

                <div style={{
                  padding: "12px",
                  borderRadius: "12px",
                  background: result.remainingAfterAllObligations > 0 ? "rgba(16, 185, 129, 0.12)" : "rgba(244, 63, 94, 0.15)",
                  border: `1px solid ${result.remainingAfterAllObligations > 0 ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.35)"}`,
                }}>
                  <div style={{ fontSize: "11px", color: result.remainingAfterAllObligations > 0 ? "#34D399" : "#FB7185", fontWeight: 700 }}>
                    5. Net Safety Buffer
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 900, color: result.remainingAfterAllObligations > 0 ? "#34D399" : "#FB7185", marginTop: "4px" }}>
                    {formatCurrency(result.remainingAfterAllObligations)}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Chain-of-Thought AI Reasoning Stepper */}
            <div style={{
              padding: "24px",
              borderRadius: "20px",
              background: "rgba(255, 255, 255, 0.03)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <div>
                  <h4 style={{ fontSize: "16px", fontWeight: 800, color: "#F8FAFC", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                    <Layers size={18} color="#818CF8" />
                    <span>5-Step AI Reasoning Chain &amp; Stress Tests</span>
                  </h4>
                  <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                    Click any step to inspect deterministic rationale and micro-metrics
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {result.reasoningSteps.map((step) => {
                  const isExpanded = expandedStep === step.id;
                  const stepStatusColor = step.verdict === "pass" ? "#34D399" : (step.verdict === "caution" ? "#FBBF24" : "#FB7185");
                  const StepIcon = step.verdict === "pass" ? CheckCircle2 : (step.verdict === "caution" ? AlertTriangle : XCircle);

                  return (
                    <div
                      key={step.id}
                      style={{
                        borderRadius: "14px",
                        background: isExpanded ? "rgba(255, 255, 255, 0.04)" : "rgba(255, 255, 255, 0.02)",
                        border: `1px solid ${isExpanded ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.05)"}`,
                        overflow: "hidden",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {/* Step Header Accordion Toggle */}
                      <div
                        onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                        style={{
                          padding: "16px 20px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "pointer",
                          userSelect: "none",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                          <div style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "8px",
                            background: `rgba(${step.verdict === "pass" ? "16, 185, 129" : (step.verdict === "caution" ? "245, 158, 11" : "244, 63, 94")}, 0.15)`,
                            border: `1px solid ${stepStatusColor}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: stepStatusColor,
                            fontSize: "12px",
                            fontWeight: 800,
                          }}>
                            {step.stepNumber}
                          </div>
                          <div>
                            <div style={{ fontSize: "14px", fontWeight: 700, color: "#F8FAFC" }}>
                              {step.title}
                            </div>
                            <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "2px" }}>
                              {step.summary}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{
                            padding: "4px 10px",
                            borderRadius: "999px",
                            background: `rgba(${step.verdict === "pass" ? "16, 185, 129" : (step.verdict === "caution" ? "245, 158, 11" : "244, 63, 94")}, 0.15)`,
                            color: stepStatusColor,
                            fontSize: "11px",
                            fontWeight: 800,
                            textTransform: "uppercase",
                          }}>
                            {step.verdict}
                          </div>
                          {isExpanded ? <ChevronUp size={16} color="#64748B" /> : <ChevronDown size={16} color="#64748B" />}
                        </div>
                      </div>

                      {/* Step Detailed Drawer */}
                      {isExpanded && (
                        <div style={{
                          padding: "0 20px 18px 20px",
                          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                          marginTop: "2px",
                          paddingTop: "14px",
                        }}>
                          <p style={{ fontSize: "13px", color: "#CBD5E1", lineHeight: 1.6, margin: "0 0 14px 0" }}>
                            {step.details}
                          </p>

                          {/* Micro-Metrics Bar */}
                          {step.metrics && step.metrics.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                              {step.metrics.map((m, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    padding: "8px 14px",
                                    borderRadius: "10px",
                                    background: "rgba(0, 0, 0, 0.3)",
                                    border: "1px solid rgba(255, 255, 255, 0.06)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                  }}
                                >
                                  <span style={{ fontSize: "11px", color: "#94A3B8" }}>{m.label}:</span>
                                  <span style={{
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    color: m.status === "positive" ? "#34D399" : (m.status === "warning" ? "#FBBF24" : (m.status === "danger" ? "#FB7185" : "#F8FAFC")),
                                  }}>
                                    {m.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Goal Cannibalization Breakdown (if goals exist) */}
            {result.detailedGoalImpact && result.detailedGoalImpact.length > 0 && (
              <div style={{
                padding: "24px",
                borderRadius: "20px",
                background: "rgba(255, 255, 255, 0.03)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                  <Target size={18} color="#818CF8" />
                  <h4 style={{ fontSize: "15px", fontWeight: 700, color: "#F8FAFC", margin: 0 }}>
                    Savings Goal Cannibalization Matrix
                  </h4>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))", gap: "12px" }}>
                  {result.detailedGoalImpact.map((goal, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "16px",
                        borderRadius: "14px",
                        background: goal.severe ? "rgba(244, 63, 94, 0.08)" : "rgba(255, 255, 255, 0.02)",
                        border: `1px solid ${goal.severe ? "rgba(244, 63, 94, 0.25)" : "rgba(255, 255, 255, 0.06)"}`,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#F8FAFC" }}>{goal.name}</span>
                        <span style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "6px",
                          background: goal.severe ? "rgba(244, 63, 94, 0.2)" : "rgba(255, 255, 255, 0.1)",
                          color: goal.severe ? "#FB7185" : "#94A3B8",
                        }}>
                          {goal.severe ? "High Delay Risk" : "Minor Shift"}
                        </span>
                      </div>

                      <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "8px" }}>
                        Current: <strong style={{ color: "#F8FAFC" }}>{formatCurrency(goal.current)}</strong> of {formatCurrency(goal.target)}
                      </div>

                      <div style={{
                        height: "6px",
                        background: "rgba(255, 255, 255, 0.08)",
                        borderRadius: "999px",
                        overflow: "hidden",
                        marginBottom: "10px",
                      }}>
                        <div style={{
                          width: `${Math.min(100, Math.round((goal.current / goal.target) * 100))}%`,
                          height: "100%",
                          background: "linear-gradient(90deg, #6366F1 0%, #06B6D4 100%)",
                          borderRadius: "999px",
                        }} />
                      </div>

                      <div style={{ fontSize: "11px", color: goal.severe ? "#FB7185" : "#94A3B8", lineHeight: 1.4 }}>
                        {goal.delayNotice}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. "What-If" Strategic Scenarios & Alternatives */}
            <div style={{
              padding: "24px",
              borderRadius: "20px",
              background: "rgba(255, 255, 255, 0.03)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <Sliders size={18} color="#F59E0B" />
                <h4 style={{ fontSize: "15px", fontWeight: 700, color: "#F8FAFC", margin: 0 }}>
                  Strategic Scenario Sandbox &amp; Alternatives
                </h4>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: "12px" }}>
                {result.alternativeStrategies.map((strat, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "16px",
                      borderRadius: "14px",
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#F8FAFC" }}>{strat.title}</span>
                        <span style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: "6px",
                          background: "rgba(245, 158, 11, 0.15)",
                          color: "#FBBF24",
                        }}>
                          {strat.tag}
                        </span>
                      </div>
                      <p style={{ fontSize: "12px", color: "#CBD5E1", lineHeight: 1.5, margin: "0 0 10px 0" }}>
                        {strat.description}
                      </p>
                      <div style={{ fontSize: "11px", color: "#34D399", fontWeight: 600, marginBottom: "14px" }}>
                        ✓ {strat.benefit}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (strat.title.includes("Installment")) {
                          const third = Math.round(parseFloat(amount) / 3);
                          setAmount(third.toString());
                          setDescription(`${description} (1/3 Installment)`);
                          analyze(`${description} (1/3 Installment)`, third);
                        } else if (strat.title.includes("Postpone")) {
                          window.location.href = "/money/planning";
                        }
                      }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "#F8FAFC",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <span>{strat.actionableText}</span>
                      <ArrowUpRight size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
