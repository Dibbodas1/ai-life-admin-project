"use client";

import { useState, useEffect } from "react";
import { Search, Bell, Sparkles, Globe, ChevronDown, HardDrive } from "lucide-react";
import { getGreeting } from "@/lib/utils";

interface TopHeaderProps {
  userName?: string;
  onOpenAssistant?: () => void;
}

export default function TopHeader({ userName = "Alex", onOpenAssistant }: TopHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const greeting = getGreeting();

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("google_drive_token") : null;
    setIsConnected(!!(token && token !== "dummy_demo_token" && token !== "demo_token"));
  }, []);

  return (
    <header style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "28px",
      gap: "16px",
      flexWrap: "wrap",
    }}>
      {/* Greeting */}
      <div>
        <h1 style={{
            fontSize: "clamp(18px, 4vw, 24px)",
            fontWeight: 800,
            color: "var(--text-primary)",
            letterSpacing: "-0.5px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            margin: 0,
          }}>
            {isConnected ? `${greeting}, ${userName}!` : `${greeting}!`} <span style={{ fontSize: "20px" }}>👋</span>
          </h1>
          <p style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            fontWeight: 500,
            marginTop: "2px",
            margin: 0,
            lineHeight: 1.4,
          }}>
            {isConnected 
              ? "Your Google Drive is synced. Orchestrating your finances in real-time."
              : "Google Drive is disconnected. Connect Google Drive to load your live personal data."}
          </p>
        </div>

      {/* Right Controls: Search, Currency, Notifications, Profile */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flexWrap: "wrap",
      }}>
        {/* Search Bar (Frosted Dark Glass) */}
        <div style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          flex: "1 1 auto",
          minWidth: "160px",
          maxWidth: "280px",
        }}>
          <Search size={16} style={{
            position: "absolute",
            left: "14px",
            color: "var(--text-muted)",
            pointerEvents: "none",
          }} />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "9px 36px 9px 38px",
              background: "rgba(15, 23, 42, 0.72)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "9999px",
              fontSize: "13px",
              color: "#F8FAFC",
              outline: "none",
              width: "100%",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              transition: "all 0.2s ease",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#6366F1";
              e.currentTarget.style.background = "rgba(15, 23, 42, 0.9)";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.25)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
              e.currentTarget.style.background = "rgba(15, 23, 42, 0.72)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
            }}
          />
          <span style={{
            position: "absolute",
            right: "12px",
            fontSize: "10px",
            fontWeight: 700,
            color: "var(--text-muted)",
            background: "rgba(255, 255, 255, 0.06)",
            padding: "2px 6px",
            borderRadius: "6px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            pointerEvents: "none",
          }}>
            ⌘K
          </span>
        </div>

        {/* Currency Pill */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 14px",
          background: "rgba(15, 23, 42, 0.72)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "9999px",
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--text-secondary)",
          cursor: "pointer",
        }}>
          <Globe size={14} color="#818CF8" />
          <span style={{ color: "#F8FAFC" }}>USD ($)</span>
          <ChevronDown size={12} color="var(--text-muted)" />
        </div>

        {/* Notifications Icon Button */}
        <button style={{
          width: "40px",
          height: "40px",
          borderRadius: "9999px",
          background: "rgba(15, 23, 42, 0.72)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          position: "relative",
          color: "var(--text-secondary)",
          transition: "all 0.2s ease",
        }}>
          <Bell size={17} />
          <span style={{
            position: "absolute",
            top: "9px",
            right: "10px",
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background: "#F43F5E",
            border: "1.5px solid #0F172A",
          }} />
        </button>

        {/* AI Assistant Quick Pill Button */}
        <button
          onClick={() => {
            if (onOpenAssistant) {
              onOpenAssistant();
            } else {
              window.dispatchEvent(new CustomEvent("open-ai-assistant"));
            }
          }}
          className="pill-btn pill-btn-primary"
          style={{
            padding: "8px 16px",
            fontSize: "13px",
          }}
        >
          <Sparkles size={15} />
          <span>AI Copilot</span>
        </button>

        {/* User Connection Badge */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "5px 14px 5px 6px",
          background: "rgba(15, 23, 42, 0.72)",
          backdropFilter: "blur(16px)",
          border: `1px solid ${isConnected ? "rgba(16, 185, 129, 0.3)" : "rgba(255, 255, 255, 0.08)"}`,
          borderRadius: "9999px",
        }}>
          <div style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: isConnected 
              ? "linear-gradient(135deg, #10B981 0%, #059669 100%)"
              : "rgba(255, 255, 255, 0.08)",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "12px",
          }}>
            {isConnected ? "☁️" : "✕"}
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: isConnected ? "#34D399" : "#94A3B8", lineHeight: 1.1 }}>
              {isConnected ? "Drive Connected" : "Drive Disconnected"}
            </div>
            <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 500 }}>
              {isConnected ? "Google Drive Cloud" : "No Cloud Sync"}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
