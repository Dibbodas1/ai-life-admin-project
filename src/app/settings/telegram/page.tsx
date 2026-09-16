"use client";

import { useState, useEffect, useCallback } from "react";
import { useGoogleAuthToken } from "@/components/shared/GoogleLoginButton";
import {
  MessageCircle,
  Link,
  CheckCircle,
  Copy,
  RefreshCw,
  Unlink,
  Bot,
  Zap,
  Shield,
} from "lucide-react";

export default function TelegramSettingsPage() {
  const { token } = useGoogleAuthToken();
  const [linkStatus, setLinkStatus] = useState<{
    linked: boolean;
    telegramId?: number;
    username?: string;
  }>({ linked: false });
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [copied, setCopied] = useState(false);

  const checkLinkStatus = useCallback(async () => {
    if (!token || token === "demo_token" || token === "dummy_demo_token") {
      setCheckingStatus(false);
      return;
    }
    try {
      const res = await fetch(`/api/telegram/link?token=${token}`);
      const data = await res.json();
      setLinkStatus(data);
    } catch {
      /* ignore */
    } finally {
      setCheckingStatus(false);
    }
  }, [token]);

  useEffect(() => {
    checkLinkStatus();
  }, [checkLinkStatus]);

  const generateCode = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/telegram/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleAccessToken: token }),
      });
      const data = await res.json();
      if (data.code) {
        setLinkCode(data.code);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const copyCommand = () => {
    if (linkCode) {
      navigator.clipboard.writeText(`/link ${linkCode}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isConnected =
    token && token !== "demo_token" && token !== "dummy_demo_token";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary, #0b0f1c)",
        padding: "2rem 1rem",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "2.5rem", textAlign: "center" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, #229ED9 0%, #1a7fb5 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
              boxShadow: "0 8px 32px rgba(34,158,217,0.35)",
            }}
          >
            <MessageCircle size={36} color="#fff" />
          </div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "#e8eaf6",
              margin: 0,
            }}
          >
            Telegram Integration
          </h1>
          <p
            style={{
              color: "#7986a3",
              marginTop: "0.5rem",
              fontSize: "0.95rem",
            }}
          >
            Log expenses instantly from your Telegram chat
          </p>
        </div>

        {/* Features banner */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "0.75rem",
            marginBottom: "2rem",
          }}
        >
          {[
            { icon: <Zap size={18} />, label: "Instant Logging" },
            { icon: <Bot size={18} />, label: "AI Powered" },
            { icon: <Shield size={18} />, label: "Secure & Private" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "12px",
                padding: "0.875rem",
                textAlign: "center",
                color: "#a0aec0",
                fontSize: "0.8rem",
              }}
            >
              <div
                style={{
                  color: "#229ED9",
                  marginBottom: "0.4rem",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                {item.icon}
              </div>
              {item.label}
            </div>
          ))}
        </div>

        {!isConnected ? (
          /* Not logged into Google */
          <div
            style={{
              background: "rgba(255,193,7,0.08)",
              border: "1px solid rgba(255,193,7,0.25)",
              borderRadius: "16px",
              padding: "2rem",
              textAlign: "center",
            }}
          >
            <p style={{ color: "#ffc107", margin: 0, fontWeight: 600 }}>
              ⚠️ Google Drive Not Connected
            </p>
            <p
              style={{ color: "#7986a3", marginTop: "0.5rem", fontSize: "0.9rem" }}
            >
              Please connect your Google Drive account first to link Telegram.
            </p>
          </div>
        ) : checkingStatus ? (
          <div style={{ textAlign: "center", color: "#7986a3", padding: "3rem" }}>
            <RefreshCw
              size={24}
              style={{ animation: "spin 1s linear infinite" }}
            />
            <p style={{ marginTop: "1rem" }}>Checking link status...</p>
          </div>
        ) : linkStatus.linked ? (
          /* ── LINKED STATE ─────────────────────────────────────── */
          <div
            style={{
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              borderRadius: "16px",
              padding: "2rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <CheckCircle size={32} color="#10b981" />
              <div>
                <p
                  style={{
                    color: "#10b981",
                    fontWeight: 700,
                    fontSize: "1.1rem",
                    margin: 0,
                  }}
                >
                  Telegram Linked!
                </p>
                {linkStatus.username && (
                  <p style={{ color: "#7986a3", margin: "0.25rem 0 0", fontSize: "0.9rem" }}>
                    Connected as @{linkStatus.username}
                  </p>
                )}
              </div>
            </div>
            <div
              style={{
                background: "rgba(255,255,255,0.04)",
                borderRadius: "12px",
                padding: "1.25rem",
                marginBottom: "1.5rem",
              }}
            >
              <p
                style={{
                  color: "#a0aec0",
                  margin: 0,
                  fontSize: "0.9rem",
                  lineHeight: 1.7,
                }}
              >
                Your bot is active! Open{" "}
                <a
                  href="https://t.me/ai_life_admin_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#229ED9", textDecoration: "none" }}
                >
                  @ai_life_admin_bot
                </a>{" "}
                and try:
                <br />
                <br />
                <code
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "6px",
                    color: "#e8eaf6",
                    display: "block",
                    marginBottom: "0.5rem",
                  }}
                >
                  spent 50 tk on lunch
                </code>
                <code
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "6px",
                    color: "#e8eaf6",
                    display: "block",
                    marginBottom: "0.5rem",
                  }}
                >
                  add expense 200 groceries
                </code>
                <code
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "6px",
                    color: "#e8eaf6",
                    display: "block",
                  }}
                >
                  check balance
                </code>
              </p>
            </div>
            <a
              href="https://t.me/ai_life_admin_bot"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                background: "linear-gradient(135deg, #229ED9 0%, #1a7fb5 100%)",
                color: "#fff",
                textDecoration: "none",
                padding: "0.875rem 1.5rem",
                borderRadius: "10px",
                fontWeight: 600,
                fontSize: "0.95rem",
              }}
            >
              <MessageCircle size={18} />
              Open Telegram Bot
            </a>
          </div>
        ) : (
          /* ── UNLINKED STATE ───────────────────────────────────── */
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px",
              padding: "2rem",
            }}
          >
            <h2
              style={{
                color: "#e8eaf6",
                fontSize: "1.1rem",
                fontWeight: 600,
                margin: "0 0 1.5rem",
              }}
            >
              Link Your Telegram Account
            </h2>

            {/* Steps */}
            <div style={{ marginBottom: "1.75rem" }}>
              {[
                {
                  step: "1",
                  title: "Open your bot",
                  desc: (
                    <>
                      Go to{" "}
                      <a
                        href="https://t.me/ai_life_admin_bot"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#229ED9" }}
                      >
                        t.me/ai_life_admin_bot
                      </a>{" "}
                      on Telegram
                    </>
                  ),
                },
                {
                  step: "2",
                  title: "Generate a code",
                  desc: "Click the button below to get your 6-digit linking code",
                },
                {
                  step: "3",
                  title: "Send the command",
                  desc: "Send /link YOUR_CODE to the bot in Telegram",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  style={{
                    display: "flex",
                    gap: "1rem",
                    marginBottom: "1rem",
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #229ED9, #1a7fb5)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {item.step}
                  </div>
                  <div>
                    <p
                      style={{
                        color: "#e8eaf6",
                        fontWeight: 600,
                        margin: "0 0 0.2rem",
                        fontSize: "0.9rem",
                      }}
                    >
                      {item.title}
                    </p>
                    <p
                      style={{
                        color: "#7986a3",
                        margin: 0,
                        fontSize: "0.85rem",
                      }}
                    >
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Code display */}
            {linkCode && (
              <div
                style={{
                  background: "rgba(34,158,217,0.1)",
                  border: "1px solid rgba(34,158,217,0.3)",
                  borderRadius: "12px",
                  padding: "1.25rem",
                  marginBottom: "1.25rem",
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    color: "#7986a3",
                    margin: "0 0 0.5rem",
                    fontSize: "0.8rem",
                  }}
                >
                  Your linking command (expires in 10 min):
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.75rem",
                  }}
                >
                  <code
                    style={{
                      fontSize: "1.4rem",
                      fontWeight: 700,
                      color: "#229ED9",
                      letterSpacing: "0.15em",
                    }}
                  >
                    /link {linkCode}
                  </code>
                  <button
                    onClick={copyCommand}
                    style={{
                      background: copied
                        ? "rgba(16,185,129,0.15)"
                        : "rgba(255,255,255,0.08)",
                      border: "none",
                      borderRadius: "8px",
                      padding: "0.4rem",
                      cursor: "pointer",
                      color: copied ? "#10b981" : "#7986a3",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={generateCode}
                disabled={loading}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  background: loading
                    ? "rgba(34,158,217,0.3)"
                    : "linear-gradient(135deg, #229ED9 0%, #1a7fb5 100%)",
                  color: "#fff",
                  border: "none",
                  padding: "0.875rem",
                  borderRadius: "10px",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "opacity 0.2s",
                }}
              >
                {loading ? (
                  <RefreshCw size={18} style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <Link size={18} />
                )}
                {linkCode ? "Regenerate Code" : "Generate Linking Code"}
              </button>

              {linkCode && (
                <a
                  href={`https://t.me/ai_life_admin_bot?start=link`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#e8eaf6",
                    textDecoration: "none",
                    padding: "0.875rem 1rem",
                    borderRadius: "10px",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  <MessageCircle size={18} color="#229ED9" />
                  Open Bot
                </a>
              )}
            </div>

            {linkCode && (
              <button
                onClick={checkLinkStatus}
                style={{
                  width: "100%",
                  marginTop: "0.75rem",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#7986a3",
                  padding: "0.6rem",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
              >
                <RefreshCw size={14} />
                Check if linked
              </button>
            )}
          </div>
        )}

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
