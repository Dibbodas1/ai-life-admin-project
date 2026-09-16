"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Brain, Search, Plus, X, Edit2, Trash2, Tag,
  Sparkles, Check, Loader2, RefreshCw, AlertCircle,
  ShieldCheck, Activity, CheckCircle2
} from "lucide-react";
import { AgentMemoryEntry, AgentMemoryCategory } from "@/lib/types";
import { apiFetch } from "@/lib/utils";

interface MemoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onMemoryCountChange?: (count: number) => void;
}

const CATEGORY_META: Record<
  AgentMemoryCategory,
  { label: string; color: string; bg: string; border: string; desc: string }
> = {
  fact: {
    label: "Facts",
    color: "#06B6D4",
    bg: "rgba(6, 182, 212, 0.12)",
    border: "rgba(6, 182, 212, 0.3)",
    desc: "Concrete information about your accounts, relatives, or environment"
  },
  preference: {
    label: "Preferences",
    color: "#8B5CF6",
    bg: "rgba(139, 92, 246, 0.12)",
    border: "rgba(139, 92, 246, 0.3)",
    desc: "Your budgeting habits, favorite payment channels, or communication style"
  },
  pattern: {
    label: "Patterns",
    color: "#F59E0B",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.3)",
    desc: "Recurring financial habits, regular dates, and typical amounts observed"
  },
  rule: {
    label: "Rules",
    color: "#10B981",
    bg: "rgba(16, 185, 129, 0.12)",
    border: "rgba(16, 185, 129, 0.3)",
    desc: "Strict behavioral rules, confirmation requirements, or spending limits"
  }
};

export default function MemoryPanel({
  isOpen,
  onClose,
  onMemoryCountChange
}: MemoryPanelProps) {
  const [memories, setMemories] = useState<AgentMemoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Add Memory Modal/Form state
  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState<AgentMemoryCategory>("fact");
  const [newTags, setNewTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Memory Modal/Form state
  const [editingMemory, setEditingMemory] = useState<AgentMemoryEntry | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState<AgentMemoryCategory>("fact");
  const [editTags, setEditTags] = useState("");
  const [editConfidence, setEditConfidence] = useState(0.9);
  const [isUpdating, setIsUpdating] = useState(false);

  // Deleting state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchMemories = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiFetch("/api/memory");
      if (!res.ok) throw new Error("Failed to fetch memories");
      const data = await res.json();
      const list: AgentMemoryEntry[] = data.memories || [];
      setMemories(list);
      const activeCount = list.filter((m) => m.status === "active").length;
      if (onMemoryCountChange) {
        onMemoryCountChange(activeCount);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Could not load memories from Google Drive.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMemories();
    }
  }, [isOpen]);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
    } else {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const parsedTags = newTags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const res = await apiFetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newContent.trim(),
          category: newCategory,
          tags: parsedTags
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save memory");
      }

      setNewContent("");
      setNewTags("");
      setNewCategory("fact");
      setIsAdding(false);
      showNotification("Memory successfully recorded in agent memory!");
      await fetchMemories();
    } catch (err: any) {
      showNotification(err.message || "Failed to create memory", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (mem: AgentMemoryEntry) => {
    setEditingMemory(mem);
    setEditContent(mem.content);
    setEditCategory(mem.category);
    setEditTags(mem.tags ? mem.tags.join(", ") : "");
    setEditConfidence(mem.confidence || 0.9);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMemory || !editContent.trim() || isUpdating) return;

    setIsUpdating(true);
    try {
      const parsedTags = editTags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const res = await apiFetch("/api/memory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingMemory._id,
          changes: {
            content: editContent.trim(),
            category: editCategory,
            confidence: editConfidence,
            tags: parsedTags
          }
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update memory");
      }

      setEditingMemory(null);
      showNotification("Memory updated successfully!");
      await fetchMemories();
    } catch (err: any) {
      showNotification(err.message || "Failed to update memory", true);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently erase this memory from the agent?")) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await apiFetch(`/api/memory?id=${id}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to delete memory");
      }

      showNotification("Memory removed from agent memory.");
      await fetchMemories();
    } catch (err: any) {
      showNotification(err.message || "Failed to delete memory", true);
    } finally {
      setDeletingId(null);
    }
  };

  // Filter memories by Category and Search query
  const filteredMemories = useMemo(() => {
    return memories.filter((mem) => {
      const matchesCategory =
        selectedCategory === "all" || mem.category === selectedCategory;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        mem.content.toLowerCase().includes(q) ||
        (mem.tags && mem.tags.some((t) => t.toLowerCase().includes(q))) ||
        mem.category.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [memories, selectedCategory, searchQuery]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: memories.length };
    for (const mem of memories) {
      counts[mem.category] = (counts[mem.category] || 0) + 1;
    }
    return counts;
  }, [memories]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        justifyContent: "flex-end",
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        animation: "fadeIn 0.2s ease-out"
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Sliding Drawer Container */}
      <div
        style={{
          width: "100%",
          maxWidth: "680px",
          height: "100%",
          backgroundColor: "rgba(13, 18, 30, 0.96)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderLeft: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "-12px 0 40px rgba(0, 0, 0, 0.75)",
          display: "flex",
          flexDirection: "column",
          color: "#F8FAFC",
          overflow: "hidden"
        }}
      >
        {/* TOP HEADER */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(180deg, rgba(30, 27, 75, 0.4) 0%, rgba(15, 23, 42, 0.2) 100%)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "14px",
                background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 20px rgba(99, 102, 241, 0.4)",
                color: "#FFFFFF"
              }}
            >
              <Brain size={24} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h2 style={{ fontSize: "18px", fontWeight: 800, letterSpacing: "-0.01em" }}>
                  Agent Memory Engine
                </h2>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    background: "rgba(99, 102, 241, 0.2)",
                    border: "1px solid rgba(99, 102, 241, 0.4)",
                    color: "#A5B4FC"
                  }}
                >
                  {memories.filter((m) => m.status === "active").length} ACTIVE
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "#94A3B8", marginTop: 2 }}>
                Long-term recall for pronouns, financial habits, preferences &amp; rules
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={fetchMemories}
              disabled={isLoading}
              className="btn-ghost"
              style={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#94A3B8",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                cursor: "pointer",
                background: "rgba(255, 255, 255, 0.03)"
              }}
              title="Refresh memories"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={onClose}
              className="btn-ghost"
              style={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#94A3B8",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                cursor: "pointer",
                background: "rgba(255, 255, 255, 0.03)"
              }}
              title="Close panel"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* NOTIFICATIONS BANNER */}
        {errorMessage && (
          <div
            style={{
              padding: "10px 20px",
              background: "rgba(244, 63, 94, 0.15)",
              borderBottom: "1px solid rgba(244, 63, 94, 0.3)",
              color: "#FDA4AF",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: 8
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div
            style={{
              padding: "10px 20px",
              background: "rgba(16, 185, 129, 0.15)",
              borderBottom: "1px solid rgba(16, 185, 129, 0.3)",
              color: "#6EE7B7",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: 8
            }}
          >
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* SEARCH, CATEGORY TABS & ADD BUTTON TOOLBAR */}
        <div
          style={{
            padding: "16px 24px 12px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
            display: "flex",
            flexDirection: "column",
            gap: 12
          }}
        >
          {/* Search bar + Add Button */}
          <div style={{ display: "flex", gap: 10 }}>
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                padding: "0 12px",
                height: 40
              }}
            >
              <Search size={16} color="#94A3B8" />
              <input
                type="text"
                placeholder="Search memories by keyword or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#F8FAFC",
                  fontSize: "13px",
                  width: "100%"
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#64748B",
                    cursor: "pointer"
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              onClick={() => {
                setIsAdding(!isAdding);
                setEditingMemory(null);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "0 16px",
                height: 40,
                borderRadius: "12px",
                border: "none",
                background: isAdding
                  ? "rgba(255, 255, 255, 0.1)"
                  : "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: isAdding ? "none" : "0 4px 14px rgba(99, 102, 241, 0.35)",
                whiteSpace: "nowrap"
              }}
            >
              {isAdding ? <X size={16} /> : <Plus size={16} />}
              <span>{isAdding ? "Cancel" : "New Memory"}</span>
            </button>
          </div>

          {/* Category Filter Pills */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              overflowX: "auto",
              paddingBottom: 4
            }}
          >
            <button
              onClick={() => setSelectedCategory("all")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: "9999px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                border:
                  selectedCategory === "all"
                    ? "1px solid #818CF8"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                background:
                  selectedCategory === "all"
                    ? "rgba(99, 102, 241, 0.2)"
                    : "rgba(255, 255, 255, 0.03)",
                color: selectedCategory === "all" ? "#F8FAFC" : "#94A3B8",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap"
              }}
            >
              <span>All Memories</span>
              <span
                style={{
                  fontSize: "10px",
                  padding: "1px 6px",
                  borderRadius: "9999px",
                  background: "rgba(255, 255, 255, 0.1)"
                }}
              >
                {categoryCounts.all || 0}
              </span>
            </button>

            {(["fact", "preference", "pattern", "rule"] as AgentMemoryCategory[]).map(
              (cat) => {
                const meta = CATEGORY_META[cat];
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 12px",
                      borderRadius: "9999px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: isSelected
                        ? `1px solid ${meta.color}`
                        : "1px solid rgba(255, 255, 255, 0.08)",
                      background: isSelected ? meta.bg : "rgba(255, 255, 255, 0.03)",
                      color: isSelected ? "#F8FAFC" : "#94A3B8",
                      transition: "all 0.15s ease",
                      whiteSpace: "nowrap"
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: meta.color
                      }}
                    />
                    <span>{meta.label}</span>
                    <span
                      style={{
                        fontSize: "10px",
                        padding: "1px 6px",
                        borderRadius: "9999px",
                        background: "rgba(255, 255, 255, 0.1)"
                      }}
                    >
                      {categoryCounts[cat] || 0}
                    </span>
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* ADD MEMORY DRAWER FORM (IF EXPANDED) */}
        {isAdding && (
          <form
            onSubmit={handleCreateMemory}
            style={{
              padding: "18px 24px",
              background: "rgba(30, 27, 75, 0.3)",
              borderBottom: "1px solid rgba(99, 102, 241, 0.3)",
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#A5B4FC", display: "flex", alignItems: "center", gap: 6 }}>
                <Sparkles size={15} color="#818CF8" /> Add Custom Agent Memory
              </div>
              <span style={{ fontSize: "11px", color: "#94A3B8" }}>
                Source: <strong>User Explicit</strong> (100% confidence)
              </span>
            </div>

            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", marginBottom: 4, display: "block" }}>
                Memory Content
              </label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="e.g. 'User receives salary into BRAC Bank on the 1st of every month', or 'User prefers bKash for grocery payments'"
                rows={2}
                required
                style={{
                  width: "100%",
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  color: "#F8FAFC",
                  fontSize: "13px",
                  lineHeight: 1.5,
                  outline: "none",
                  resize: "none"
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", marginBottom: 4, display: "block" }}>
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as AgentMemoryCategory)}
                  style={{
                    width: "100%",
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "10px",
                    padding: "8px 10px",
                    color: "#F8FAFC",
                    fontSize: "13px",
                    outline: "none"
                  }}
                >
                  <option value="fact">Fact (Entity/State)</option>
                  <option value="preference">Preference (Choices/Style)</option>
                  <option value="pattern">Pattern (Habits/Cycles)</option>
                  <option value="rule">Rule (Strict Policy)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", marginBottom: 4, display: "block" }}>
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="e.g. salary, bkash, monthly"
                  style={{
                    width: "100%",
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "10px",
                    padding: "8px 10px",
                    color: "#F8FAFC",
                    fontSize: "13px",
                    outline: "none"
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                style={{
                  padding: "7px 14px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  background: "transparent",
                  color: "#94A3B8",
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !newContent.trim()}
                style={{
                  padding: "7px 18px",
                  borderRadius: "10px",
                  border: "none",
                  background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                  color: "#FFFFFF",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                <span>Save to Memory</span>
              </button>
            </div>
          </form>
        )}

        {/* EDIT MEMORY MODAL / FORM */}
        {editingMemory && (
          <form
            onSubmit={handleSaveEdit}
            style={{
              padding: "18px 24px",
              background: "rgba(30, 41, 59, 0.5)",
              borderBottom: "1px solid rgba(245, 158, 11, 0.3)",
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#FCD34D", display: "flex", alignItems: "center", gap: 6 }}>
                <Edit2 size={15} color="#F59E0B" /> Edit Agent Memory
              </div>
              <span style={{ fontSize: "11px", color: "#94A3B8" }}>
                ID: {editingMemory._id.slice(0, 8)}...
              </span>
            </div>

            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", marginBottom: 4, display: "block" }}>
                Memory Content
              </label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={2}
                required
                style={{
                  width: "100%",
                  background: "rgba(15, 23, 42, 0.9)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  color: "#F8FAFC",
                  fontSize: "13px",
                  lineHeight: 1.5,
                  outline: "none",
                  resize: "none"
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", marginBottom: 4, display: "block" }}>
                  Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as AgentMemoryCategory)}
                  style={{
                    width: "100%",
                    background: "rgba(15, 23, 42, 0.9)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "10px",
                    padding: "8px 10px",
                    color: "#F8FAFC",
                    fontSize: "12px",
                    outline: "none"
                  }}
                >
                  <option value="fact">Fact</option>
                  <option value="preference">Preference</option>
                  <option value="pattern">Pattern</option>
                  <option value="rule">Rule</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", marginBottom: 4, display: "block" }}>
                  Confidence ({Math.round(editConfidence * 100)}%)
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1.0"
                  step="0.05"
                  value={editConfidence}
                  onChange={(e) => setEditConfidence(parseFloat(e.target.value))}
                  style={{ width: "100%", marginTop: 8 }}
                />
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", marginBottom: 4, display: "block" }}>
                  Tags
                </label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="tag1, tag2"
                  style={{
                    width: "100%",
                    background: "rgba(15, 23, 42, 0.9)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "10px",
                    padding: "8px 10px",
                    color: "#F8FAFC",
                    fontSize: "12px",
                    outline: "none"
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setEditingMemory(null)}
                style={{
                  padding: "7px 14px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  background: "transparent",
                  color: "#94A3B8",
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdating || !editContent.trim()}
                style={{
                  padding: "7px 18px",
                  borderRadius: "10px",
                  border: "none",
                  background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                  color: "#FFFFFF",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: isUpdating ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        )}

        {/* MEMORY LIST CONTAINER */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 14
          }}
        >
          {isLoading && memories.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "60px 20px",
                color: "#94A3B8",
                gap: 12
              }}
            >
              <Loader2 size={32} className="animate-spin" color="#818CF8" />
              <span style={{ fontSize: "14px" }}>Loading memories from Google Drive...</span>
            </div>
          ) : filteredMemories.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "60px 20px",
                textAlign: "center",
                gap: 14,
                background: "rgba(255, 255, 255, 0.02)",
                borderRadius: "18px",
                border: "1px dashed rgba(255, 255, 255, 0.1)"
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: "16px",
                  background: "rgba(99, 102, 241, 0.1)",
                  border: "1px solid rgba(99, 102, 241, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#818CF8"
                }}
              >
                <Brain size={28} />
              </div>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#F8FAFC" }}>
                  {searchQuery || selectedCategory !== "all"
                    ? "No matching memories found"
                    : "No memories saved yet"}
                </h3>
                <p style={{ fontSize: "12.5px", color: "#94A3B8", maxWidth: "380px", marginTop: 4 }}>
                  {searchQuery || selectedCategory !== "all"
                    ? "Try adjusting your search terms or selecting 'All Memories'."
                    : "As you chat, the agent automatically captures your financial habits, preferred accounts, and rules. You can also click '+ New Memory' to add them manually."}
                </p>
              </div>
              {!searchQuery && selectedCategory === "all" && (
                <button
                  onClick={() => setIsAdding(true)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    borderRadius: "10px",
                    border: "none",
                    background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
                    color: "#FFFFFF",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  <Plus size={15} /> Add First Memory
                </button>
              )}
            </div>
          ) : (
            filteredMemories.map((mem) => {
              const meta = CATEGORY_META[mem.category] || CATEGORY_META.fact;
              const isDeleting = deletingId === mem._id;

              return (
                <div
                  key={mem._id}
                  style={{
                    background: "rgba(15, 23, 42, 0.75)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "16px",
                    padding: "16px 18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    transition: "all 0.2s ease",
                    position: "relative",
                    opacity: isDeleting ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.35)";
                    e.currentTarget.style.background = "rgba(20, 29, 50, 0.85)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                    e.currentTarget.style.background = "rgba(15, 23, 42, 0.75)";
                  }}
                >
                  {/* Card Header Badges & Actions */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                      {/* Category Badge */}
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "9999px",
                          background: meta.bg,
                          border: `1px solid ${meta.border}`,
                          color: meta.color,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4
                        }}
                      >
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: meta.color
                          }}
                        />
                        {meta.label}
                      </span>

                      {/* Source Badge */}
                      <span
                        style={{
                          fontSize: "10.5px",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: "9999px",
                          background:
                            mem.source === "user"
                              ? "rgba(59, 130, 246, 0.15)"
                              : "rgba(99, 102, 241, 0.15)",
                          border:
                            mem.source === "user"
                              ? "1px solid rgba(59, 130, 246, 0.3)"
                              : "1px solid rgba(99, 102, 241, 0.3)",
                          color:
                            mem.source === "user"
                              ? "#93C5FD"
                              : "#C7D2FE"
                        }}
                      >
                        {mem.source === "user" ? "Explicit" : "Learned"}
                      </span>

                      {/* Usage Count */}
                      {mem.usageCount > 0 && (
                        <span
                          style={{
                            fontSize: "10.5px",
                            fontWeight: 600,
                            padding: "2px 7px",
                            borderRadius: "9999px",
                            background: "rgba(255, 255, 255, 0.06)",
                            color: "#CBD5E1",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3
                          }}
                        >
                          <Activity size={10} color="#818CF8" />
                          Used {mem.usageCount}x
                        </span>
                      )}
                    </div>

                    {/* Edit & Delete Action Buttons */}
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <button
                        onClick={() => handleStartEdit(mem)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#94A3B8",
                          cursor: "pointer",
                          padding: "4px 6px",
                          borderRadius: "6px",
                          display: "flex",
                          alignItems: "center"
                        }}
                        title="Edit memory"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(mem._id)}
                        disabled={isDeleting}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#F87171",
                          cursor: isDeleting ? "not-allowed" : "pointer",
                          padding: "4px 6px",
                          borderRadius: "6px",
                          display: "flex",
                          alignItems: "center"
                        }}
                        title="Permanently remove memory"
                      >
                        {isDeleting ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Main Content */}
                  <div
                    style={{
                      fontSize: "13.5px",
                      lineHeight: 1.5,
                      color: "#F1F5F9",
                      wordBreak: "break-word"
                    }}
                  >
                    {mem.content}
                  </div>

                  {/* Tags and Confidence Bar */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 8,
                      paddingTop: 4,
                      borderTop: "1px solid rgba(255, 255, 255, 0.04)"
                    }}
                  >
                    {/* Tags */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {mem.tags && mem.tags.length > 0 ? (
                        mem.tags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            style={{
                              fontSize: "10.5px",
                              color: "#94A3B8",
                              background: "rgba(255, 255, 255, 0.04)",
                              padding: "1px 6px",
                              borderRadius: "4px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3
                            }}
                          >
                            <Tag size={9} color="#64748B" />
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: "10.5px", color: "#64748B" }}>No tags</span>
                      )}
                    </div>

                    {/* Confidence Indicator */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: "10.5px", color: "#64748B" }}>
                        Confidence:
                      </span>
                      <div
                        style={{
                          width: 44,
                          height: 4,
                          borderRadius: "9999px",
                          background: "rgba(255, 255, 255, 0.1)",
                          overflow: "hidden"
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.round(mem.confidence * 100)}%`,
                            height: "100%",
                            background:
                              mem.confidence >= 0.8
                                ? "#10B981"
                                : mem.confidence >= 0.6
                                ? "#F59E0B"
                                : "#F43F5E"
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: "10.5px",
                          fontWeight: 700,
                          color:
                            mem.confidence >= 0.8
                              ? "#34D399"
                              : mem.confidence >= 0.6
                              ? "#FCD34D"
                              : "#FDA4AF"
                        }}
                      >
                        {Math.round(mem.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* BOTTOM INFORMATIONAL FOOTER */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            background: "rgba(10, 14, 24, 0.9)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: "11.5px",
            color: "#64748B"
          }}
        >
          <ShieldCheck size={16} color="#06B6D4" style={{ flexShrink: 0 }} />
          <span>
            <strong>Deterministic Override:</strong> Live database balances and monthly planning records always supersede stale memories.
          </span>
        </div>
      </div>
    </div>
  );
}
