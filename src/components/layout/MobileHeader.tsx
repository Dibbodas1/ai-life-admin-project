"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, Sparkles, HardDrive } from "lucide-react";

export default function MobileHeader() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const checkSync = () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("google_drive_token") : null;
      setIsConnected(!!(token && token !== "dummy_demo_token" && token !== "demo_token"));
    };
    checkSync();
    window.addEventListener("storage", checkSync);
    return () => window.removeEventListener("storage", checkSync);
  }, []);

  return (
    <header
      className="mobile-top-navbar"
      style={{
        width: "100%",
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(11, 15, 28, 0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        padding: "10px 16px",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
      }}
    >
      {/* Left: Hamburger + Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("toggle-mobile-sidebar"))}
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#F8FAFC",
            cursor: "pointer",
            flexShrink: 0,
            transition: "background 0.2s ease",
          }}
          aria-label="Open Navigation Drawer"
          title="Open Menu"
        >
          <Menu size={20} />
        </button>

        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(99, 102, 241, 0.4)",
            }}
          >
            <Sparkles size={14} color="#FFFFFF" />
          </div>
          <div>
            <div
              style={{
                fontSize: "14.5px",
                fontWeight: 800,
                color: "#F8FAFC",
                letterSpacing: "-0.3px",
                lineHeight: 1.1,
              }}
            >
              AI Life Admin
            </div>
            <div
              style={{
                fontSize: "10px",
                color: "#818CF8",
                fontWeight: 600,
              }}
            >
              Finance Copilot
            </div>
          </div>
        </Link>
      </div>

      {/* Right: Cloud Sync Pill & Fast AI Trigger */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div
          title={isConnected ? "Google Drive Synced" : "Google Drive Disconnected"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "4px 8px",
            background: "rgba(255, 255, 255, 0.05)",
            border: `1px solid ${isConnected ? "rgba(16, 185, 129, 0.3)" : "rgba(255, 255, 255, 0.08)"}`,
            borderRadius: "9999px",
            fontSize: "11px",
            color: isConnected ? "#34D399" : "#94A3B8",
            fontWeight: 600,
          }}
        >
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: isConnected ? "#10B981" : "#64748B",
              boxShadow: isConnected ? "0 0 6px #10B981" : "none",
            }}
          />
          <HardDrive size={12} />
        </div>

        <button
          onClick={() => window.dispatchEvent(new CustomEvent("open-ai-assistant"))}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "6px 12px",
            borderRadius: "9999px",
            background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
            border: "none",
            color: "#FFFFFF",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 2px 10px rgba(99, 102, 241, 0.35)",
          }}
          aria-label="Ask AI Copilot"
        >
          <Sparkles size={13} />
          <span>Copilot</span>
        </button>
      </div>
    </header>
  );
}
