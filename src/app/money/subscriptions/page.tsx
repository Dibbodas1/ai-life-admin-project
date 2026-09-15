"use client";

import { useState, useEffect } from "react";
import { CreditCard, AlertTriangle, Sparkles, Loader2, TrendingUp } from "lucide-react";
import { formatCurrency, formatShortDate } from "@/lib/utils";

interface Sub {
  _id: string; name: string; amount: number; billingCycle: string;
  nextBillingDate: string; usageLevel: string; status: string;
  previousAmount?: number; category: string;
}

const USAGE_COLORS: Record<string, string> = {
  high: "var(--accent-emerald)", medium: "var(--accent-cyan)",
  low: "var(--accent-amber)", none: "var(--accent-rose)",
};

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subscriptions")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setSubs(data);
        else setSubs([]);
      })
      .catch(() => setSubs([]))
      .finally(() => setLoading(false));
  }, []);

  const active = subs.filter(s => s.status === "active");
  const monthlyTotal = active.reduce((s, sub) => s + sub.amount, 0);
  const annualTotal = monthlyTotal * 12;
  const lowUsage = active.filter(s => s.usageLevel === "low" || s.usageLevel === "none");
  const potentialSavings = lowUsage.reduce((s, sub) => s + sub.amount, 0) * 12;
  const priceChanges = active.filter(s => s.previousAmount && s.amount !== s.previousAmount);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <Loader2 size={32} style={{ color: "var(--accent-emerald)", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
          <CreditCard size={24} style={{ color: "var(--accent-violet)" }} /> Subscriptions
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>Manage and optimize your recurring subscriptions</p>
      </div>

      {/* Stats */}
      <div className="grid-responsive-kpi" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Monthly Total</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{formatCurrency(monthlyTotal)}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Annualized</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{formatCurrency(annualTotal)}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Active</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{active.length}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Low Usage</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "var(--accent-amber)" }}>{lowUsage.length}</div>
        </div>
      </div>

      {/* AI Insight */}
      {lowUsage.length > 0 && (
        <div className="glass-card animate-fade-in" style={{
          padding: 20, marginBottom: 20,
          background: "var(--accent-violet-glow)",
          borderColor: "rgba(139, 92, 246, 0.2)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <Sparkles size={18} style={{ color: "var(--accent-violet)" }} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>AI Insight</span>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)" }}>
            You have <strong style={{ color: "var(--text-primary)" }}>{lowUsage.length} subscription{lowUsage.length > 1 ? "s" : ""}</strong> with
            low or no recorded usage ({lowUsage.map(s => s.name).join(", ")}). 
            Potential annual savings: <strong style={{ color: "var(--accent-emerald)" }}>{formatCurrency(potentialSavings)}</strong>
          </p>
        </div>
      )}

      {/* Price Changes */}
      {priceChanges.length > 0 && (
        <div className="glass-card animate-fade-in" style={{
          padding: 20, marginBottom: 20,
          background: "var(--accent-amber-glow)",
          borderColor: "rgba(245, 158, 11, 0.2)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <TrendingUp size={18} style={{ color: "var(--accent-amber)" }} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Price Changes Detected</span>
          </div>
          {priceChanges.map(s => {
            const pctChange = Math.round(((s.amount - (s.previousAmount || 0)) / (s.previousAmount || 1)) * 100);
            return (
              <p key={s._id} style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>
                <strong>{s.name}</strong>: ${s.previousAmount}/mo → ${s.amount}/mo ({pctChange > 0 ? "+" : ""}{pctChange}%)
              </p>
            );
          })}
        </div>
      )}

      {/* Subscription Grid */}
      <div className="grid-responsive-cards">
        {active.map(sub => (
          <div key={sub._id} className="glass-card" style={{ padding: 20, cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{sub.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{sub.category}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{formatCurrency(sub.amount)}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>/{sub.billingCycle}</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: USAGE_COLORS[sub.usageLevel] || "var(--text-muted)" }} />
                <span style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "capitalize" }}>
                  {sub.usageLevel} usage
                </span>
              </div>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Next: {formatShortDate(sub.nextBillingDate)}
              </span>
            </div>
            {sub.usageLevel === "none" && (
              <div style={{
                marginTop: 12, padding: "8px 12px", borderRadius: 8,
                background: "var(--accent-rose-glow)", fontSize: 11,
                color: "var(--accent-rose)", display: "flex", alignItems: "center", gap: 6,
              }}>
                <AlertTriangle size={12} /> No recorded usage
              </div>
            )}
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
              Annualized: {formatCurrency(sub.amount * (sub.billingCycle === "annual" ? 1 : sub.billingCycle === "quarterly" ? 4 : 12))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
