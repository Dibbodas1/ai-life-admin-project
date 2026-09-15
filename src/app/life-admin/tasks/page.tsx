"use client";

import { useState, useEffect } from "react";
import { ClipboardList, Plus, Loader2, CalendarClock } from "lucide-react";
import { formatShortDate } from "@/lib/utils";

interface Task {
  _id: string; title: string; description?: string; category: string;
  deadline?: string; priority: string; status: "pending" | "in_progress" | "completed" | "overdue";
  relatedTo: { model: string; id: string };
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tasks")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setTasks(data);
        else setTasks([]);
      })
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
      <Loader2 size={32} style={{ color: "var(--accent-emerald)", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>;
  }

  const pending = tasks.filter(t => t.status !== "completed");
  const completed = tasks.filter(t => t.status === "completed");

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
            <ClipboardList size={24} style={{ color: "var(--accent-violet)" }} /> Life Admin Tasks
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>Stay on top of obligations, renewals, and errands</p>
        </div>
        <button className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={16} /> New Task
        </button>
      </div>

      <div className="grid-responsive-split">
        
        {/* Pending Tasks */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Pending ({pending.length})</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pending.map(task => {
              const isHigh = task.priority === "high";
              return (
                <div key={task._id} className="glass-card" style={{ padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600 }}>{task.title}</h3>
                    <span className={`badge ${isHigh ? "badge-rose" : task.priority === "medium" ? "badge-amber" : "badge-cyan"}`}>
                      {task.priority}
                    </span>
                  </div>
                  {task.description && (
                    <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12, lineHeight: 1.5 }}>
                      {task.description}
                    </p>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--text-muted)" }}>
                    <span className="badge badge-amber">{task.category}</span>
                    {task.deadline && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, color: task.status === "overdue" ? "var(--accent-rose)" : "inherit" }}>
                        <CalendarClock size={14} /> {formatShortDate(task.deadline)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Completed Tasks */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "var(--text-secondary)" }}>Completed ({completed.length})</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, opacity: 0.7 }}>
            {completed.map(task => (
              <div key={task._id} className="glass-card" style={{ padding: 16, background: "rgba(255,255,255,0.02)" }}>
                <h3 style={{ fontSize: 15, fontWeight: 500, textDecoration: "line-through", color: "var(--text-secondary)" }}>{task.title}</h3>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
