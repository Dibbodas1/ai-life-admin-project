"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, Sparkles, Loader2, User } from "lucide-react";
import FormattedChatMessage from "@/components/shared/FormattedChatMessage";
import { emitDataUpdated, apiFetch } from "@/lib/utils";

interface Message { role: "user" | "assistant"; content: string; }

export default function AssistantPage() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello Alex! 👋 I'm your AI Life Admin copilot, powered by Gemini. I have access to your complete financial data — 12 months of transactions, subscriptions, bills, goals, and life admin tasks.\n\nHere are things you can ask me:\n\n💰 **Financial Questions**\n• \"How much did I spend on food this month?\"\n• \"What are my top spending categories?\"\n• \"Compare my spending this month vs last month\"\n\n📊 **Insights & Analysis**\n• \"What subscriptions can I cut?\"\n• \"Am I on track for my savings goals?\"\n• \"What's my monthly baseline cost?\"\n\n🛒 **Purchase Decisions**\n• \"Can I afford a $500 purchase?\"\n• \"Should I buy a new laptop?\"\n\n📋 **Life Admin**\n• \"What bills are due this week?\"\n• \"What tasks are overdue?\"\n• \"What deadlines are coming up?\"\n\nEvery answer is based on your actual data. I never make up numbers. 🎯" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!message.trim() || isLoading) return;
    const userMsg = message.trim();
    setMessage("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, history: messages }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.response || "Sorry, I couldn't process that." }]);
      emitDataUpdated();
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "I'm having trouble connecting right now. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    "How much did I spend on food this month?",
    "What subscriptions can I cut?",
    "Can I afford a $1,200 laptop?",
    "What bills are due this week?",
    "What changed this month vs last month?",
    "What tasks are overdue?",
  ];

  return (
    <div style={{ minHeight: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
          <Bot size={24} style={{ color: "var(--accent-emerald)" }} /> AI Assistant
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>Ask anything about your finances, bills, and life admin</p>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, paddingBottom: 16 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "start", maxWidth: "min(92%, 680px)", alignSelf: msg.role === "user" ? "flex-end" : "flex-start" }}>
            {msg.role === "assistant" && (
              <div style={{
                width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                background: "var(--gradient-primary)", display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>
                <Sparkles size={16} color="white" />
              </div>
            )}
            <div className={msg.role === "user" ? "chat-user" : "chat-ai"} style={{
              padding: "14px 18px", fontSize: 14, lineHeight: 1.6,
            }}>
              <FormattedChatMessage content={msg.content} />
            </div>
            {msg.role === "user" && (
              <div style={{
                width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                background: "var(--gradient-secondary)", display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>
                <User size={16} color="white" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: "var(--gradient-primary)", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <Sparkles size={16} color="white" />
            </div>
            <div className="chat-ai" style={{ padding: "14px 18px" }}>
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite", color: "var(--accent-emerald)" }} />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="mobile-scroll-x" style={{ gap: 8, marginBottom: 12, maxWidth: "100%" }}>
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => { setMessage(s); }} className="btn-ghost" style={{ fontSize: 12, padding: "6px 14px" }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ display: "flex", gap: 10, padding: "12px 0" }}>
        <input
          className="input-field"
          placeholder="Ask about your finances, bills, subscriptions..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          style={{ flex: 1, fontSize: 14 }}
        />
        <button onClick={send} className="btn-primary" disabled={isLoading} style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 6 }}>
          <Send size={16} /> Send
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
