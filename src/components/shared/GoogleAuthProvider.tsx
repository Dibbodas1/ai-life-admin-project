"use client";
import { GoogleOAuthProvider } from "@react-oauth/google";

declare global {
  interface Window {
    __fetchPatched?: boolean;
  }
}

if (typeof window !== "undefined" && !window.__fetchPatched) {
  window.__fetchPatched = true;
  const originalFetch = window.fetch;
  window.fetch = async (input, init) => {
    const token = localStorage.getItem("google_drive_token");
    if (token && typeof input === "string" && input.startsWith("/api/")) {
      init = init || {};
      init.headers = { ...init.headers, Authorization: `Bearer ${token}` };
    }
    return originalFetch(input, init);
  };
}

export default function GoogleAuthProvider({ children }: { children: React.ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  console.log("USING GOOGLE CLIENT ID:", clientId);

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {children}
    </GoogleOAuthProvider>
  );
}
