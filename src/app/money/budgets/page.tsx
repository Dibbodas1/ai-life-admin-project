"use client";

import { useState, useEffect } from "react";
import { BarChart3, Plus, Loader2, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Budget {
  _id: string; category: string; amount: number; period: "monthly" | "weekly";
  spent: number; remaining: number; percentUsed: number;
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/budgets")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setBudgets(data);
        else setBudgets([]);
      })
      .catch(() => setBudgets([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
      <Loader2 size={32} style={{ color: "var(--accent-emerald)", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>;
  }

  const totalBudgeted = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const totalPercent = Math.min(Math.round((totalSpent / (totalBudgeted || 1)) * 100), 100);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
            <BarChart3 size={24} style={{ color: "var(--accent-cyan)" }} /> Budgets
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>Monitor your category spending limits</p>
        </div>
        <button className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={16} /> New Budget
        </button>
      </div>

      <div className="glass-card" style={{ padding: 24, marginBottom: 24, background: "rgba(6, 182, 212, 0.05)" }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase" }}>Total Monthly Budget</h2>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 36, fontWeight: 800, color: totalSpent > totalBudgeted ? "var(--accent-rose)" : "var(--text-primary)" }}>
              {formatCurrency(totalSpent)}
            </div>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>
              of {formatCurrency(totalBudgeted)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent-cyan)" }}>{totalPercent}%</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Used</div>
          </div>
        </div>
        <div style={{ height: 12, borderRadius: 6, background: "var(--bg-primary)", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 6,
            width: `${totalPercent}%`,
            background: totalSpent > totalBudgeted ? "var(--accent-rose)" : "var(--gradient-primary)",
            transition: "width 1s ease",
          }} />
        </div>
      </div>

      <div className="grid-responsive-cards">
        {budgets.map(b => {
          const isOver = b.spent > b.amount;
          return (
            <div key={b._id} className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>{b.category}</h3>
                <span className="badge" style={{ background: "var(--bg-primary)", color: "var(--text-secondary)" }}>{b.period}</span>
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 12 }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: isOver ? "var(--accent-rose)" : "var(--text-primary)" }}>
                  {formatCurrency(b.spent)}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  / {formatCurrency(b.amount)}
                </div>
              </div>

              <div style={{ height: 8, borderRadius: 4, background: "var(--bg-primary)", overflow: "hidden", marginBottom: 12 }}>
                <div style={{
                  height: "100%", borderRadius: 4,
                  width: `${b.percentUsed}%`,
                  background: isOver ? "var(--accent-rose)" : b.percentUsed > 85 ? "var(--accent-amber)" : "var(--accent-emerald)",
                  transition: "width 1s ease",
                }} />
              </div>

              {isOver ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--accent-rose)", fontSize: 12, fontWeight: 600 }}>
                  <AlertTriangle size={14} /> Over budget by {formatCurrency(b.spent - b.amount)}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {formatCurrency(b.remaining)} remaining
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
