"use client";

import { useState, useRef, useEffect } from "react";
import { Send, X, Sparkles, Maximize2, Mic, MicOff, Copy, Check, Trash2, Loader2, Bot, User } from "lucide-react";
import Link from "next/link";
import FormattedChatMessage from "@/components/shared/FormattedChatMessage";
import { emitDataUpdated, apiFetch } from "@/lib/utils";
import { ConversationState } from "@/lib/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const DEFAULT_FLOAT_MESSAGE: Message = {
  role: "assistant",
  content: "Hey Alex! 👋 I'm your **AI Life Admin Copilot**.\n\nYou can talk to me in **English** or **Banglish** to log transactions, add wallets, or schedule plans!\n\n• *\"5 tarikhe bashar bhara 15000 tk dite hobe planning e add koro\"*\n• *\"amar bkash e 2500 tk add koro\"*\n• *\"Log $65 expense for dinner from Cash\"*\n• *\"Analyze my financial situation\"*"
};

export default function AIAssistantFloat() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([DEFAULT_FLOAT_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [conversationState, setConversationState] = useState<ConversationState | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-ai-assistant", handleOpen);
    return () => window.removeEventListener("open-ai-assistant", handleOpen);
  }, []);

  // Web Speech API
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setMessage(transcript);
        };

        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice dictation is not supported by your current browser.");
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

  const sendMessage = async (textToSend?: string) => {
    const msg = (textToSend || message).trim();
    if (!msg || isLoading) return;

    setMessage("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setIsLoading(true);

    try {
      const res = await apiFetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          history: messages,
          conversationState: conversationState
        }),
      });
      const data = await res.json();
      if (data.conversationState) {
        setConversationState(data.conversationState);
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.response || "Sorry, I couldn't process that." }]);
      emitDataUpdated();
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "I'm having trouble connecting right now. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyMessage = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const clearChat = () => {
    setMessages([DEFAULT_FLOAT_MESSAGE]);
    setConversationState(null);
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
            width: 58,
            height: 58,
            borderRadius: 18,
            background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 28px rgba(99, 102, 241, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.3)",
            zIndex: 100,
            transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          className="ai-pulse-glow"
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08) translateY(-2px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1) translateY(0)"; }}
          title="Open AI Life Admin Copilot"
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
          width: "min(440px, calc(100vw - 20px))",
          height: "min(620px, calc(100vh - 40px))",
          maxHeight: "88vh",
          background: "rgba(11, 15, 28, 0.94)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 24,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          zIndex: 100,
          boxShadow: "0 28px 70px -10px rgba(0, 0, 0, 0.85), 0 0 30px rgba(99, 102, 241, 0.15)",
          animation: "bubbleFadeIn 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
          {/* Header */}
          <div style={{
            padding: "16px 18px",
            background: "linear-gradient(135deg, #0B0F1C 0%, #1E1A48 100%)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#FFFFFF",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(99, 102, 241, 0.35)",
              }}>
                <Bot size={20} color="#FFFFFF" />
              </div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: "#FFFFFF", display: "flex", alignItems: "center", gap: 6 }}>
                  AI Copilot
                  <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "9999px", background: "rgba(16, 185, 129, 0.15)", color: "#34D399", border: "1px solid rgba(16, 185, 129, 0.3)", fontWeight: 700 }}>
                    LIVE
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#94A3B8", display: "flex", alignItems: "center", gap: 6, marginTop: 1 }}>
                  <span>Gemini 3.5 Flash</span>
                  <span>•</span>
                  <span style={{ color: "#A5B4FC" }}>EN / Banglish</span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {/* Expand to Full Page */}
              <Link
                href="/assistant"
                onClick={() => setIsOpen(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.07)",
                  border: "none",
                  borderRadius: "8px",
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  color: "#94A3B8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
                title="Expand to Full Command Center (/assistant)"
              >
                <Maximize2 size={15} />
              </Link>

              {/* Clear History */}
              <button
                onClick={clearChat}
                style={{
                  background: "rgba(255, 255, 255, 0.07)",
                  border: "none",
                  borderRadius: "8px",
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  color: "#94A3B8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
                title="Clear current thread"
              >
                <Trash2 size={15} />
              </button>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.07)",
                  border: "none",
                  borderRadius: "8px",
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  color: "#94A3B8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
                title="Close window"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            background: "rgba(9, 13, 22, 0.6)",
          }}>
            {messages.map((msg, i) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignSelf: isUser ? "flex-end" : "flex-start",
                    maxWidth: "88%",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      padding: "12px 16px",
                      fontSize: 13.5,
                      lineHeight: 1.55,
                      borderRadius: isUser ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                      background: isUser
                        ? "linear-gradient(135deg, #4338CA 0%, #6366F1 100%)"
                        : "rgba(20, 28, 48, 0.8)",
                      color: "#FFFFFF",
                      border: isUser ? "none" : "1px solid rgba(255, 255, 255, 0.09)",
                      boxShadow: isUser
                        ? "0 4px 14px rgba(99, 102, 241, 0.3)"
                        : "0 4px 14px rgba(0, 0, 0, 0.35)",
                    }}
                  >
                    {isUser ? (
                      <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
                    ) : (
                      <FormattedChatMessage content={msg.content} />
                    )}
                  </div>

                  {!isUser && (
                    <div style={{ display: "flex", alignItems: "center", paddingLeft: 4 }}>
                      <button
                        onClick={() => copyMessage(msg.content, i)}
                        style={{
                          background: "none",
                          border: "none",
                          color: copiedIndex === i ? "#34D399" : "#64748B",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                          fontSize: "10.5px",
                          fontWeight: 600,
                          padding: "1px 6px",
                        }}
                      >
                        {copiedIndex === i ? <Check size={11} /> : <Copy size={11} />}
                        {copiedIndex === i ? "Copied" : "Copy"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div style={{
                padding: "12px 16px",
                alignSelf: "flex-start",
                borderRadius: "4px 18px 18px 18px",
                background: "rgba(20, 28, 48, 0.8)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#818CF8",
                fontSize: 12.5,
                fontWeight: 600,
              }}>
                <Loader2 size={15} className="animate-spin" />
                <span>AI Financial Engine Analyzing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Pills Rail */}
          <div className="mobile-scroll-x" style={{
            padding: "8px 14px",
            gap: "8px",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            background: "rgba(11, 15, 28, 0.95)",
          }}>
            <button
              onClick={() => sendMessage("5 tarikhe bashar bhara 15000 tk dite hobe planning e add koro")}
              style={{
                padding: "4px 10px",
                borderRadius: "9999px",
                background: "rgba(99, 102, 241, 0.12)",
                color: "#A5B4FC",
                fontSize: "11px",
                fontWeight: 600,
                border: "1px solid rgba(99, 102, 241, 0.3)",
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >
              + Add Rent 15k
            </button>
            <button
              onClick={() => sendMessage("amar bkash wallet e 2500 tk add koro")}
              style={{
                padding: "4px 10px",
                borderRadius: "9999px",
                background: "rgba(16, 185, 129, 0.12)",
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
            <button
              onClick={() => sendMessage("Analyze my financial situation and burn rate")}
              style={{
                padding: "4px 10px",
                borderRadius: "9999px",
                background: "rgba(6, 182, 212, 0.12)",
                color: "#22D3EE",
                fontSize: "11px",
                fontWeight: 600,
                border: "1px solid rgba(6, 182, 212, 0.3)",
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >
              + Financial Audit
            </button>
          </div>

          {/* Input Box */}
          <div style={{
            padding: "12px 14px",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(11, 15, 28, 0.98)",
          }}>
            {/* Voice Dictation */}
            <button
              onClick={toggleListening}
              style={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                border: isListening ? "1px solid #F43F5E" : "1px solid rgba(255, 255, 255, 0.1)",
                background: isListening ? "rgba(244, 63, 94, 0.2)" : "rgba(255, 255, 255, 0.05)",
                color: isListening ? "#FB7185" : "#94A3B8",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
              title={isListening ? "Stop listening" : "Voice dictation"}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            <input
              className="modern-input"
              placeholder={isListening ? "Listening..." : "Ask or log command in EN / Banglish..."}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              style={{
                flex: 1,
                borderRadius: "12px",
                padding: "8px 14px",
                fontSize: "13px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            />

            <button
              onClick={() => sendMessage()}
              style={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                background: (!message.trim() || isLoading)
                  ? "rgba(255, 255, 255, 0.06)"
                  : "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
                border: "none",
                color: (!message.trim() || isLoading) ? "#64748B" : "#FFFFFF",
                cursor: (!message.trim() || isLoading) ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.2s ease",
              }}
              disabled={isLoading || !message.trim()}
              title="Send message"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
