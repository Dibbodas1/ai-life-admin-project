"use client";

import { useGoogleLogin } from "@react-oauth/google";
import { useState, useEffect } from "react";
import { LogIn, LogOut, Loader2, HardDrive, CheckCircle2 } from "lucide-react";

export function useGoogleAuthToken() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("google_drive_token");
    if (stored) setToken(stored);
  }, []);

  const saveToken = (t: string) => {
    localStorage.setItem("google_drive_token", t);
    setToken(t);
  };

  const clearToken = () => {
    localStorage.removeItem("google_drive_token");
    setToken(null);
  };

  return { token, saveToken, clearToken };
}

export default function GoogleLoginButton() {
  const { token, saveToken, clearToken } = useGoogleAuthToken();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isRealGoogleUser = !!(token && token !== "dummy_demo_token" && token !== "demo_token");
  const isDemoUser = token === "dummy_demo_token" || token === "demo_token";

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      setErrorMsg(null);
      saveToken(tokenResponse.access_token);
      setLoading(false);
      window.location.reload(); // Reload to sync with Google Drive data
    },
    onError: (err) => {
      console.error("Google Login Failed:", err);
      setErrorMsg("Login cancelled or failed. Check console.");
      setLoading(false);
    },
    scope: "https://www.googleapis.com/auth/drive.file",
  });

  const handleConnect = () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      login();
    } catch (err: any) {
      console.error("Trigger login error:", err);
      setLoading(false);
      setErrorMsg("Failed to open login popup.");
    }
  };

  const handleDisconnect = async () => {
    try {
      if (token && token !== "dummy_demo_token" && token !== "demo_token") {
        await fetch("/api/auth/disconnect", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (e) {
      console.error("Disconnect error:", e);
    }
    clearToken();
    try {
      localStorage.removeItem("ai_purchase_history");
      localStorage.removeItem("ai_last_mutation");
    } catch {}
    window.location.reload();
  };

  const handleSetDemo = () => {
    saveToken("dummy_demo_token");
    window.location.reload();
  };

  // Connected to live Google Drive
  if (isRealGoogleUser) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        width: "100%",
        padding: "8px 10px",
        background: "rgba(16, 185, 129, 0.06)",
        border: "1px solid rgba(16, 185, 129, 0.25)",
        borderRadius: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--accent-emerald, #10B981)",
              boxShadow: "0 0 8px #10B981",
            }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "#34D399" }}>
              Drive Synced
            </span>
          </div>
          <button
            onClick={handleDisconnect}
            title="Disconnect Google Drive"
            style={{
              background: "none",
              border: "none",
              color: "rgba(255, 255, 255, 0.45)",
              cursor: "pointer",
              padding: 2,
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#FB7185")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.45)")}
          >
            <LogOut size={12} /> Disconnect
          </button>
        </div>
      </div>
    );
  }

  // Not connected to Google Drive
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "4px 8px",
        background: "rgba(255, 255, 255, 0.03)",
        borderRadius: 6,
        fontSize: 10,
        color: "rgba(255, 255, 255, 0.45)",
      }}>
        <span>Status: Disconnected</span>
      </div>

      <button
        onClick={handleConnect}
        disabled={loading}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)",
          border: "1px solid rgba(99, 102, 241, 0.4)",
          color: "#FFFFFF",
          padding: "8px 12px",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          cursor: loading ? "wait" : "pointer",
          transition: "all 0.2s ease",
          boxShadow: "0 2px 8px rgba(99, 102, 241, 0.2)",
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.8)";
            e.currentTarget.style.boxShadow = "0 0 14px rgba(99, 102, 241, 0.4)";
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
            e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.4)";
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(99, 102, 241, 0.2)";
          }
        }}
      >
        {loading ? (
          <>
            <Loader2 size={13} className="animate-spin" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            {/* Google G / Drive Icon */}
            <svg width="14" height="14" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Connect Google Drive</span>
          </>
        )}
      </button>

      {errorMsg && (
        <span style={{ fontSize: 10, color: "#FB7185", textAlign: "center" }}>
          {errorMsg}
        </span>
      )}
    </div>
  );
}
