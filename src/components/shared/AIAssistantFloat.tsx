"use client";

import { useState, useRef, useEffect } from "react";
import { Send, X, Sparkles } from "lucide-react";
import FormattedChatMessage from "@/components/shared/FormattedChatMessage";
import { emitDataUpdated, apiFetch } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AIAssistantFloat() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hey Alex! 👋 I'm your AI Life Admin copilot. Ask me anything in English or Banglish about your wallets, planned expenses, loans, or transactions. For example:\n\n• *\"5 tarikhe bashar bhara 15000 tk dite hobe planning e add koro\"*\n• *\"amar bkash e 2500 tk add koro\"*\n• *\"Plan upcoming expense Semester Fee $25000 due Oct 15th\"*\n• *\"Analyze my financial situation\"*"
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-ai-assistant", handleOpen);
    return () => window.removeEventListener("open-ai-assistant", handleOpen);
  }, []);

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMsg = message.trim();
    setMessage("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const res = await apiFetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, history: messages }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.response || "Sorry, I couldn't process that." }]);
      emitDataUpdated();
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "I'm having trouble connecting. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button (Glowing Indigo) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: "fixed",
            bottom: "clamp(16px, 3vw, 28px)",
            right: "clamp(16px, 3vw, 28px)",
            width: 56,
            height: 56,
            borderRadius: 18,
            background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 24px rgba(99, 102, 241, 0.45)",
            zIndex: 100,
            transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08) translateY(-2px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1) translateY(0)"; }}
          title="Open AI Assistant"
        >
          <Sparkles size={24} color="#FFFFFF" />
        </button>
      )}

      {/* Modern Frosted Dark Chat Panel */}
      {isOpen && (
        <div style={{
          position: "fixed",
          bottom: "clamp(10px, 2vw, 28px)",
          right: "clamp(10px, 2vw, 28px)",
          width: "min(420px, calc(100vw - 20px))",
          height: "min(600px, calc(100vh - 40px))",
          maxHeight: "88vh",
          background: "rgba(15, 23, 42, 0.95)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 24,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          zIndex: 100,
          boxShadow: "0 24px 60px -12px rgba(0, 0, 0, 0.8)",
          animation: "fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
          {/* Header */}
          <div style={{
            padding: "18px 20px",
            background: "linear-gradient(135deg, #0B0F1C 0%, #1E1A48 100%)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#FFFFFF",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: "rgba(255, 255, 255, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Sparkles size={18} color="#818CF8" />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#FFFFFF" }}>AI Life Admin Copilot</div>
                <div style={{ fontSize: 11, color: "#94A3B8", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} />
                  Bilingual English &amp; Banglish
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "none",
                borderRadius: "50%",
                width: 30,
                height: 30,
                cursor: "pointer",
                color: "#94A3B8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#94A3B8"; }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages Container */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "18px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            background: "rgba(9, 13, 22, 0.6)",
          }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  padding: "12px 16px",
                  maxWidth: "88%",
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: msg.role === "user" ? "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)" : "rgba(30, 41, 59, 0.7)",
                  color: "#FFFFFF",
                  border: msg.role === "user" ? "none" : "1px solid rgba(255, 255, 255, 0.08)",
                  boxShadow: msg.role === "user"
                    ? "0 4px 14px rgba(99, 102, 241, 0.3)"
                    : "0 2px 8px rgba(0, 0, 0, 0.3)",
                }}
              >
                <FormattedChatMessage content={msg.content} />
              </div>
            ))}
            {isLoading && (
              <div style={{
                padding: "12px 16px",
                alignSelf: "flex-start",
                borderRadius: "18px 18px 18px 4px",
                background: "rgba(30, 41, 59, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "#818CF8",
                fontSize: 12,
                fontWeight: 600,
              }}>
                <Sparkles size={14} className="animate-spin" />
                <span>Thinking &amp; analyzing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Suggestions Pills */}
          <div style={{
            padding: "8px 16px",
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            background: "rgba(15, 23, 42, 0.95)",
          }}>
            <button
              onClick={() => setMessage("5 tarikhe bashar bhara 15000 tk dite hobe planning e add koro")}
              style={{
                padding: "4px 10px",
                borderRadius: "9999px",
                background: "rgba(99, 102, 241, 0.15)",
                color: "#A5B4FC",
                fontSize: "11px",
                fontWeight: 600,
                border: "1px solid rgba(99, 102, 241, 0.3)",
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >
              + Add Bashar Bhara
            </button>
            <button
              onClick={() => setMessage("amar bkash wallet e 2500 tk add koro")}
              style={{
                padding: "4px 10px",
                borderRadius: "9999px",
                background: "rgba(16, 185, 129, 0.15)",
                color: "#34D399",
                fontSize: "11px",
                fontWeight: 600,
                border: "1px solid rgba(16, 185, 129, 0.3)",
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >
              + Add bKash Funds
            </button>
          </div>

          {/* Input Box */}
          <div style={{
            padding: "14px 16px",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            display: "flex",
            gap: 10,
            background: "rgba(15, 23, 42, 0.95)",
          }}>
            <input
              className="modern-input"
              placeholder="Ask anything or add an expense/plan..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              style={{ flex: 1, borderRadius: "9999px", paddingLeft: "18px" }}
            />
            <button
              onClick={sendMessage}
              className="pill-btn pill-btn-primary"
              style={{ padding: "10px 18px", borderRadius: "9999px" }}
              disabled={isLoading || !message.trim()}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
