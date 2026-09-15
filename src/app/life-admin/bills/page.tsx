"use client";

import { useState, useEffect } from "react";
import { FileText, Plus, Loader2, AlertTriangle } from "lucide-react";
import { formatCurrency, formatShortDate } from "@/lib/utils";

interface Bill {
  _id: string; payee: string; amount: number; dueDate: string;
  category: string; isAutoPay: boolean; status: "pending" | "paid" | "overdue";
}

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    fetch("/api/bills")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setBills(data);
        else setBills([]);
      })
      .catch(() => setBills([]))
      .finally(() => setLoading(false));
  }, []);

  const totalDue = bills.filter(b => b.status !== "paid").reduce((s, b) => s + b.amount, 0);

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
      <Loader2 size={32} style={{ color: "var(--accent-emerald)", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
            <FileText size={24} style={{ color: "var(--accent-amber)" }} /> Bills
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>Manage and track your upcoming bills</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={16} /> Add Bill
        </button>
      </div>

      <div className="stat-card" style={{ marginBottom: 24, maxWidth: 300 }}>
        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Total Outstanding</div>
        <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, color: "var(--accent-rose)" }}>{formatCurrency(totalDue)}</div>
      </div>

      <div className="glass-card table-responsive-container" style={{ padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(0,0,0,0.2)" }}>
              <th style={{ padding: "14px 20px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: 12 }}>DUE DATE</th>
              <th style={{ padding: "14px 20px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: 12 }}>PAYEE</th>
              <th style={{ padding: "14px 20px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: 12 }}>STATUS</th>
              <th style={{ padding: "14px 20px", textAlign: "right", color: "var(--text-muted)", fontWeight: 600, fontSize: 12 }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {bills.map(bill => {
              const daysUntil = Math.ceil((new Date(bill.dueDate).getTime() - Date.now()) / 86400000);
              const isOverdue = daysUntil < 0 && bill.status !== "paid";
              return (
                <tr key={bill._id} style={{ borderBottom: "1px solid var(--border-subtle)", opacity: bill.status === "paid" ? 0.6 : 1 }}>
                  <td style={{ padding: "14px 20px", color: isOverdue ? "var(--accent-rose)" : "var(--text-secondary)", fontWeight: isOverdue ? 700 : 400 }}>
                    {formatShortDate(bill.dueDate)}
                    {isOverdue && <AlertTriangle size={12} style={{ display: "inline", marginLeft: 6, color: "var(--accent-rose)" }} />}
                  </td>
                  <td style={{ padding: "14px 20px", fontWeight: 500 }}>
                    {bill.payee}
                    {bill.isAutoPay && <span className="badge" style={{ marginLeft: 8, background: "rgba(255,255,255,0.1)", color: "var(--text-muted)" }}>Auto</span>}
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <span className={`badge ${bill.status === "paid" ? "badge-emerald" : isOverdue ? "badge-rose" : "badge-amber"}`}>
                      {bill.status}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px", textAlign: "right", fontWeight: 700 }}>
                    {formatCurrency(bill.amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
