"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot, Send, Sparkles, Loader2, User, Copy, Check,
  Mic, MicOff, Trash2, RefreshCw, Download, Volume2, VolumeX,
  Wallet, CalendarClock, Receipt, HandCoins, LineChart, Zap,
  ShieldCheck, ArrowRight, CornerDownLeft, Brain
} from "lucide-react";
import FormattedChatMessage from "@/components/shared/FormattedChatMessage";
import { emitDataUpdated, apiFetch } from "@/lib/utils";
import MemoryPanel from "@/components/assistant/MemoryPanel";
import { ConversationState } from "@/lib/types";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

const DEFAULT_WELCOME_MESSAGE: Message = {
  role: "assistant",
  content: `Hello! 👋 I'm your **AI Life Admin Copilot**, connected live to your personal finance database.

I have zero-latency visibility into your **wallets, cash reserves, upcoming monthly plans, loans & debts, and spending logs**. You can talk to me in **English** or **Banglish**!

### What I Can Do For You:
- 💳 **Wallet & Cash Management**: *"amar bkash e 2500 tk add koro"* or *"Transfer $200 from Bank to Cash"*
- 🗓️ **Monthly Planning**: *"Add house rent ৳15,000 due on 28th to monthly planning"*
- 🧾 **Instant Expense Logging**: *"ami ajke 650 taka diye lunch khailam cash theke"*
- 🤝 **Loans & Debts**: *"Record that Tanvir owes me 2500 tk"*
- 📊 **Financial Diagnostics**: *"Analyze my current burn rate and runway"*

Click any prompt chip below or type/speak your command. Every action is synchronized in real-time. ⚡`,
  timestamp: "Just now"
};

const PROMPT_CATEGORIES = [
  {
    id: "wallets",
    label: "Wallets & Inflow",
    icon: Wallet,
    color: "#10B981",
    prompts: [
      "amar bkash e 2500 tk add koro",
      "Add BRAC Bank account with balance 50,000 tk",
      "Transfer $300 from Bank to Cash wallet",
      "What is my total net liquid balance across all wallets?"
    ]
  },
  {
    id: "planning",
    label: "Planning & Rent",
    icon: CalendarClock,
    color: "#F59E0B",
    prompts: [
      "Add house rent ৳15,000 due on 28th to monthly planning",
      "Add electricity bill $85 due next Monday",
      "What planned expenses are due this month?",
      "Show all upcoming commitments and deadlines"
    ]
  },
  {
    id: "expenses",
    label: "Outflows & Bills",
    icon: Receipt,
    color: "#F43F5E",
    prompts: [
      "ami ajke 650 taka diye lunch khailam cash theke",
      "Add expense $120 for groceries at Costco from Card",
      "How much have I spent on food this month?",
      "What subscriptions can I safely cancel?"
    ]
  },
  {
    id: "loans",
    label: "Loans & Debts",
    icon: HandCoins,
    color: "#8B5CF6",
    prompts: [
      "Record that Tanvir owes me 2500 tk",
      "Record that I borrowed 10,000 tk from Hasan bhai",
      "How much total money is currently owed to me?",
      "Who owes me money and when is it due?"
    ]
  },
  {
    id: "diagnostics",
    label: "Intelligence & Runway",
    icon: LineChart,
    color: "#06B6D4",
    prompts: [
      "Analyze my current financial runway and monthly burn rate",
      "Can I afford a $1,200 laptop purchase right now?",
      "Compare my spending this month vs last month",
      "Give me a detailed breakdown of my financial health"
    ]
  }
];

export default function AssistantPage() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([DEFAULT_WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [reasoningStep, setReasoningStep] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string>("wallets");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

  // Intelligent Memory & Context State
  const [conversationState, setConversationState] = useState<ConversationState | null>(null);
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);
  const [memoryCount, setMemoryCount] = useState(0);

  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Load initial memory count on mount
  useEffect(() => {
    const fetchMemoryCount = async () => {
      try {
        const res = await apiFetch("/api/memory");
        if (res.ok) {
          const data = await res.json();
          const active = (data.memories || []).filter((m: any) => m.status === "active").length;
          setMemoryCount(active);
        }
      } catch {}
    };
    fetchMemoryCount();
  }, []);

  // Load chat history from localStorage on initial render
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ai_copilot_chat_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {}
  }, []);

  // Save chat history to localStorage
  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem("ai_copilot_chat_history", JSON.stringify(messages));
      }
    } catch {}
  }, [messages]);

  // Auto-scroll on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Reasoning steps timer animation
  useEffect(() => {
    let interval: any;
    if (isLoading) {
      setReasoningStep(0);
      interval = setInterval(() => {
        setReasoningStep((prev) => (prev < 2 ? prev + 1 : prev));
      }, 1200);
    } else {
      setReasoningStep(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Speech Recognition Setup (Web Speech API)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-US"; // also accepts Bengali/Banglish phonetics smoothly

        recognition.onresult = (event: any) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setMessage(transcript);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice dictation is not supported by your current browser. You can type directly in the input box.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  const getFormattedTime = () => {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleSend = async (textToSend?: string) => {
    const msg = (textToSend || message).trim();
    if (!msg || isLoading) return;

    setMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const userMessage: Message = {
      role: "user",
      content: msg,
      timestamp: getFormattedTime()
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Build history for backend
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content
      }));

      const res = await apiFetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          history: historyPayload,
          conversationState: conversationState
        }),
      });

      const data = await res.json();
      if (data.conversationState) {
        setConversationState(data.conversationState);
      }
      if (typeof data.memoryCount === "number") {
        setMemoryCount(data.memoryCount);
      }

      const assistantReply: Message = {
        role: "assistant",
        content: data.response || "I received your request but couldn't parse the final output. Please verify your data.",
        timestamp: getFormattedTime()
      };

      setMessages((prev) => [...prev, assistantReply]);
      emitDataUpdated();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm having trouble communicating with the intelligence service right now. Please check your network connection and try again.",
          timestamp: getFormattedTime()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const speakMessage = (text: string, index: number) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean markdown symbols for cleaner audio narration
    const cleanText = text.replace(/[*#`_>-]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);

    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  const clearChat = () => {
    if (window.confirm("Start a brand new session and reset the conversation?")) {
      setMessages([DEFAULT_WELCOME_MESSAGE]);
      setConversationState(null);
      localStorage.removeItem("ai_copilot_chat_history");
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setSpeakingIndex(null);
    }
  };

  const exportChat = () => {
    const transcript = messages
      .map((m) => `[${m.timestamp || "Time"}] ${m.role.toUpperCase()}:\n${m.content}\n`)
      .join("\n----------------------------------------\n\n");

    const blob = new Blob([transcript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AI-Life-Admin-Chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reasoningMessages = [
    "Reading live financial state & wallet balances...",
    "Evaluating commitments, monthly plans & categories...",
    "Synthesizing executive recommendation & database updates..."
  ];

  return (
    <div style={{
      maxWidth: "1180px",
      margin: "0 auto",
      minHeight: "calc(100vh - 100px)",
      display: "flex",
      flexDirection: "column",
      gap: 16,
      padding: "8px 4px 20px 4px"
    }}>
      {/* 1. TOP TELEMETRY COCKPIT HEADER */}
      <div
        className="glass-card"
        style={{
          padding: "20px 24px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 27, 75, 0.5) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.5)",
          borderRadius: "20px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            className="ai-pulse-glow"
            style={{
              width: 48,
              height: 48,
              borderRadius: "16px",
              background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              flexShrink: 0,
            }}
          >
            <Bot size={26} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#F8FAFC", letterSpacing: "-0.02em" }}>
                AI Executive Copilot
              </h1>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "3px 10px",
                  borderRadius: "9999px",
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  color: "#34D399",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.02em"
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} />
                GEMINI 3.5 FLASH ACTIVE
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", marginTop: 4 }}>
              <span style={{ fontSize: "12px", color: "#94A3B8", display: "flex", alignItems: "center", gap: 5 }}>
                <ShieldCheck size={14} color="#06B6D4" /> Zero Data Hallucination
              </span>
              <span style={{ fontSize: "12px", color: "#94A3B8" }}>•</span>
              <span style={{ fontSize: "12px", color: "#94A3B8", display: "flex", alignItems: "center", gap: 5 }}>
                <Zap size={14} color="#818CF8" /> Full CRUD Tool Execution
              </span>
              <span style={{ fontSize: "12px", color: "#94A3B8" }}>•</span>
              <span style={{ fontSize: "12px", color: "#A5B4FC" }}>
                🇧🇩 Bilingual (English &amp; Banglish)
              </span>
              <span style={{ fontSize: "12px", color: "#94A3B8" }}>•</span>
              <button
                onClick={() => setShowMemoryPanel(true)}
                style={{
                  background: "rgba(99, 102, 241, 0.12)",
                  border: "1px solid rgba(99, 102, 241, 0.35)",
                  borderRadius: "9999px",
                  padding: "2px 10px",
                  fontSize: "12px",
                  color: "#A5B4FC",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(99, 102, 241, 0.25)";
                  e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.6)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(99, 102, 241, 0.12)";
                  e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.35)";
                }}
                title="Manage Agent Memory"
              >
                <Brain size={13} color="#818CF8" />
                <span>{memoryCount} Memories</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Agent Memory Panel Toggle Button */}
          <button
            onClick={() => setShowMemoryPanel(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontSize: "12px",
              fontWeight: 700,
              padding: "7px 14px",
              borderRadius: "10px",
              color: "#FFFFFF",
              background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
              border: "1px solid rgba(165, 180, 252, 0.4)",
              boxShadow: "0 2px 12px rgba(99, 102, 241, 0.4)",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 18px rgba(99, 102, 241, 0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 12px rgba(99, 102, 241, 0.4)";
            }}
            title="Open Agent Memory Manager"
          >
            <Brain size={15} />
            <span>Agent Memory</span>
            <span
              style={{
                fontSize: "10px",
                padding: "1px 6px",
                borderRadius: "9999px",
                background: "rgba(255, 255, 255, 0.25)",
                fontWeight: 800
              }}
            >
              {memoryCount}
            </span>
          </button>

          <button
            onClick={exportChat}
            className="btn-ghost"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: "12px",
              padding: "7px 12px",
              borderRadius: "10px",
              color: "#94A3B8"
            }}
            title="Export conversation to text file"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={clearChat}
            className="btn-ghost"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: "12px",
              padding: "7px 12px",
              borderRadius: "10px",
              color: "#F87171"
            }}
            title="Reset conversation"
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">New Session</span>
          </button>
        </div>
      </div>

      {/* 2. CATEGORIZED PROMPT CAPABILITY DECK */}
      <div
        className="glass-card"
        style={{
          padding: "16px 20px",
          borderRadius: "18px",
          background: "rgba(15, 23, 42, 0.65)",
          border: "1px solid rgba(255, 255, 255, 0.07)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 6 }}>
            <Sparkles size={14} color="#818CF8" /> Quick Command Presets &amp; Templates
          </div>
          <span style={{ fontSize: "11px", color: "#64748B" }}>Click any prompt to run immediately</span>
        </div>

        {/* Category Tabs */}
        <div className="mobile-scroll-x" style={{ gap: 8, marginBottom: 12 }}>
          {PROMPT_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "6px 14px",
                  borderRadius: "9999px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: isSelected ? `1px solid ${cat.color}` : "1px solid rgba(255, 255, 255, 0.08)",
                  background: isSelected ? `rgba(255, 255, 255, 0.1)` : "rgba(15, 23, 42, 0.5)",
                  color: isSelected ? "#F8FAFC" : "#94A3B8",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s ease"
                }}
              >
                <Icon size={14} style={{ color: cat.color }} />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Active Category Prompt Chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {PROMPT_CATEGORIES.find((c) => c.id === activeCategory)?.prompts.map((promptText, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(promptText)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "#E2E8F0",
                fontSize: "12.5px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(99, 102, 241, 0.15)";
                e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.4)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <ArrowRight size={12} color="#818CF8" style={{ flexShrink: 0 }} />
              <span>{promptText}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. CONVERSATION THREAD CONTAINER */}
      <div
        className="glass-card"
        style={{
          flex: 1,
          minHeight: "420px",
          maxHeight: "calc(100vh - 360px)",
          overflowY: "auto",
          padding: "24px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          background: "rgba(9, 13, 22, 0.75)",
          borderRadius: "22px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        {messages.map((msg, idx) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={idx}
              className="ai-bubble-anim"
              style={{
                display: "flex",
                gap: 14,
                maxWidth: isUser ? "min(88%, 680px)" : "min(92%, 820px)",
                alignSelf: isUser ? "flex-end" : "flex-start",
                flexDirection: isUser ? "row-reverse" : "row",
              }}
            >
              {/* Avatar Icon */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "12px",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isUser
                    ? "linear-gradient(135deg, #4338CA 0%, #6366F1 100%)"
                    : "linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%)",
                  border: isUser ? "none" : "1px solid rgba(99, 102, 241, 0.3)",
                  boxShadow: isUser
                    ? "0 4px 12px rgba(99, 102, 241, 0.3)"
                    : "0 4px 12px rgba(0, 0, 0, 0.3)",
                  marginTop: 2,
                }}
              >
                {isUser ? (
                  <User size={18} color="#FFFFFF" />
                ) : (
                  <Sparkles size={18} color="#818CF8" />
                )}
              </div>

              {/* Message Body & Metadata */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: "11px",
                    color: "#94A3B8",
                    justifyContent: isUser ? "flex-end" : "flex-start",
                    paddingLeft: isUser ? 0 : 4,
                    paddingRight: isUser ? 4 : 0,
                  }}
                >
                  <span style={{ fontWeight: 700, color: isUser ? "#A5B4FC" : "#F8FAFC" }}>
                    {isUser ? "You" : "AI Copilot"}
                  </span>
                  <span>•</span>
                  <span>{msg.timestamp || "Recorded"}</span>
                </div>

                {/* The Bubble Card */}
                <div
                  style={{
                    padding: "16px 20px",
                    borderRadius: isUser ? "20px 4px 20px 20px" : "4px 20px 20px 20px",
                    background: isUser
                      ? "linear-gradient(135deg, #4338CA 0%, #6366F1 100%)"
                      : "rgba(15, 23, 42, 0.85)",
                    border: isUser ? "none" : "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#F8FAFC",
                    fontSize: "14px",
                    lineHeight: 1.6,
                    boxShadow: isUser
                      ? "0 8px 24px rgba(79, 70, 229, 0.3)"
                      : "0 10px 25px rgba(0, 0, 0, 0.4)",
                    wordBreak: "break-word",
                  }}
                >
                  {isUser ? (
                    <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
                  ) : (
                    <FormattedChatMessage content={msg.content} />
                  )}
                </div>

                {/* Actions Bar for Assistant Response */}
                {!isUser && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      paddingLeft: 4,
                      marginTop: 2,
                    }}
                  >
                    <button
                      onClick={() => copyToClipboard(msg.content, idx)}
                      style={{
                        background: "none",
                        border: "none",
                        color: copiedIndex === idx ? "#34D399" : "#64748B",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: "6px",
                        transition: "color 0.2s ease"
                      }}
                      title="Copy response"
                    >
                      {copiedIndex === idx ? <Check size={13} /> : <Copy size={13} />}
                      {copiedIndex === idx ? "Copied!" : "Copy"}
                    </button>

                    <button
                      onClick={() => speakMessage(msg.content, idx)}
                      style={{
                        background: "none",
                        border: "none",
                        color: speakingIndex === idx ? "#818CF8" : "#64748B",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: "6px",
                        transition: "color 0.2s ease"
                      }}
                      title="Read response aloud"
                    >
                      {speakingIndex === idx ? <VolumeX size={13} /> : <Volume2 size={13} />}
                      {speakingIndex === idx ? "Stop Audio" : "Listen"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Dynamic Multi-Stage Reasoning Indicator */}
        {isLoading && (
          <div
            className="ai-bubble-anim"
            style={{
              display: "flex",
              gap: 14,
              maxWidth: "min(92%, 700px)",
              alignSelf: "flex-start",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "12px",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%)",
                border: "1px solid rgba(99, 102, 241, 0.4)",
              }}
            >
              <Sparkles size={18} className="animate-spin" color="#818CF8" />
            </div>

            <div
              style={{
                padding: "16px 20px",
                borderRadius: "4px 20px 20px 20px",
                background: "rgba(15, 23, 42, 0.85)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                minWidth: "280px",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.4)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Loader2 size={16} className="animate-spin" style={{ color: "#818CF8" }} />
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#F8FAFC" }}>
                  AI Financial Engine Thinking...
                </span>
              </div>

              {/* Shimmer reasoning step */}
              <div
                style={{
                  fontSize: "12px",
                  color: "#A5B4FC",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#818CF8" }} />
                <span>{reasoningMessages[reasoningStep]}</span>
              </div>

              <div
                className="reasoning-shimmer-bar"
                style={{
                  height: "3px",
                  borderRadius: "9999px",
                  width: "100%",
                }}
              />
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* 4. ERGONOMIC COMMAND INPUT BAR */}
      <div
        className="glass-card"
        style={{
          padding: "12px 16px",
          borderRadius: "20px",
          background: "rgba(15, 23, 42, 0.95)",
          border: isListening ? "1px solid #F43F5E" : "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: isListening ? "0 0 25px rgba(244, 63, 94, 0.25)" : "0 12px 36px rgba(0, 0, 0, 0.6)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          transition: "all 0.25s ease",
        }}
      >
        {/* Listening Indicator Bar */}
        {isListening && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 8px",
              background: "rgba(244, 63, 94, 0.1)",
              borderRadius: "8px",
              color: "#FB7185",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            <span
              className="voice-listening-active"
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#F43F5E",
                display: "inline-block",
              }}
            />
            <span>Listening to your voice... Speak your financial command in English or Bengali</span>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
          {/* Voice Dictation Button */}
          <button
            onClick={toggleListening}
            style={{
              width: 44,
              height: 44,
              borderRadius: "14px",
              border: isListening ? "1px solid #F43F5E" : "1px solid rgba(255, 255, 255, 0.1)",
              background: isListening
                ? "rgba(244, 63, 94, 0.2)"
                : "rgba(255, 255, 255, 0.05)",
              color: isListening ? "#FB7185" : "#94A3B8",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "all 0.2s ease",
            }}
            title={isListening ? "Stop listening" : "Voice dictation (English/Bengali)"}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Multiline Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              // Auto expand height
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? "Listening... speak now"
                : "Ask anything, log expenses, add wallets, or schedule plans (e.g. 'amar bkash e 2500 tk add koro')..."
            }
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#F8FAFC",
              fontSize: "14px",
              lineHeight: 1.5,
              resize: "none",
              maxHeight: "140px",
              padding: "10px 4px",
              fontFamily: "inherit",
            }}
          />

          {/* Send Button */}
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !message.trim()}
            style={{
              width: 44,
              height: 44,
              borderRadius: "14px",
              border: "none",
              background: (!message.trim() || isLoading)
                ? "rgba(255, 255, 255, 0.06)"
                : "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
              color: (!message.trim() || isLoading) ? "#64748B" : "#FFFFFF",
              cursor: (!message.trim() || isLoading) ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: (!message.trim() || isLoading)
                ? "none"
                : "0 4px 16px rgba(99, 102, 241, 0.4)",
              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onMouseEnter={(e) => {
              if (message.trim() && !isLoading) {
                e.currentTarget.style.transform = "scale(1.05)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
            title="Send command (Enter)"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>

        {/* Input Footer Helper Shortcuts */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 4px",
            fontSize: "11px",
            color: "#64748B",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CornerDownLeft size={12} />
            <span>Press <strong>Enter</strong> to send • <strong>Shift + Enter</strong> for new line</span>
          </div>
          <span style={{ color: "#94A3B8" }}>
            {message.length > 0 ? `${message.length} characters` : "Bilingual AI"}
          </span>
        </div>
      </div>

      {/* 5. AGENT MEMORY ENGINE DRAWER */}
      <MemoryPanel
        isOpen={showMemoryPanel}
        onClose={() => setShowMemoryPanel(false)}
        onMemoryCountChange={(count) => setMemoryCount(count)}
      />
    </div>
  );
}

