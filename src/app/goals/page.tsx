"use client";

import { useState, useEffect } from "react";
import { Target, Loader2, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Goal {
  _id: string; name: string; targetAmount: number; currentAmount: number;
  deadline: string; monthlyContribution: number; priority: string;
  status: string; icon?: string;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/goals")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setGoals(data);
        else setGoals([]);
      })
      .catch(() => setGoals([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
      <Loader2 size={32} style={{ color: "var(--accent-emerald)", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
          <Target size={24} style={{ color: "var(--accent-emerald)" }} /> Financial Goals
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>Track progress toward your savings targets</p>
      </div>

      <div className="grid-responsive-cards">
        {goals.map(goal => {
          const currentAmount = goal.currentAmount || 0;
          const targetAmount = goal.targetAmount || 1; // Prevent division by zero
          const pct = Math.min(Math.round((currentAmount / targetAmount) * 100), 100);
          const remaining = targetAmount - currentAmount;
          const deadlineDate = goal.deadline ? new Date(goal.deadline) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
          const monthsLeft = Math.max(1, Math.ceil((deadlineDate.getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)));
          const neededPerMonth = remaining / monthsLeft;
          const contribution = goal.monthlyContribution || 0;
          const onTrack = contribution >= neededPerMonth;

          return (
            <div key={goal._id} className="glass-card" style={{ padding: 28, position: "relative", overflow: "hidden" }}>
              {/* Glow background */}
              <div style={{
                position: "absolute", top: -20, right: -20, width: 100, height: 100,
                borderRadius: "50%", background: onTrack ? "var(--accent-emerald-glow)" : "var(--accent-amber-glow)",
                filter: "blur(40px)",
              }} />

              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{goal.icon || "🎯"}</div>
                    <h3 style={{ fontSize: 18, fontWeight: 700 }}>{goal.name}</h3>
                    <span className={`badge ${goal.priority === "high" ? "badge-rose" : goal.priority === "medium" ? "badge-amber" : "badge-cyan"}`} style={{ marginTop: 6 }}>
                      {goal.priority} priority
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 24, fontWeight: 800 }}>{pct}%</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>complete</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: 10, borderRadius: 5, background: "var(--bg-primary)", marginBottom: 16, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 5,
                    width: `${pct}%`,
                    background: pct > 66 ? "var(--gradient-primary)" : pct > 33 ? "var(--accent-cyan)" : "var(--accent-violet)",
                    transition: "width 1.5s ease",
                  }} />
                </div>

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                  <div style={{ background: "var(--bg-card)", padding: "10px 14px", borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Saved</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--accent-emerald)" }}>{formatCurrency(goal.currentAmount)}</div>
                  </div>
                  <div style={{ background: "var(--bg-card)", padding: "10px 14px", borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Target</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{formatCurrency(goal.targetAmount)}</div>
                  </div>
                </div>

                {/* Timeline */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 14px", background: "var(--bg-card)", borderRadius: 10, marginBottom: 12,
                }}>
                  <Calendar size={14} style={{ color: "var(--text-muted)" }} />
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {monthsLeft} month{monthsLeft !== 1 ? "s" : ""} remaining · Need {formatCurrency(neededPerMonth)}/mo
                  </span>
                </div>

                {/* AI Feasibility */}
                <div style={{
                  padding: "10px 14px", borderRadius: 10, fontSize: 12, lineHeight: 1.5,
                  background: onTrack ? "var(--accent-emerald-glow)" : "var(--accent-amber-glow)",
                  color: onTrack ? "var(--accent-emerald)" : "var(--accent-amber)",
                  border: `1px solid ${onTrack ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
                }}>
                  {onTrack
                    ? `✓ On track — your ${formatCurrency(contribution)}/mo contribution meets the target.`
                    : `⚠ At your current ${formatCurrency(contribution)}/mo, you'd need ~${formatCurrency(neededPerMonth - contribution)} more per month to hit the deadline.`
                  }
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
