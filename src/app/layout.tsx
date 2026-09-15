import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import MobileHeader from "@/components/layout/MobileHeader";
import AIAssistantFloat from "@/components/shared/AIAssistantFloat";
import GoogleAuthProvider from "@/components/shared/GoogleAuthProvider";

export const metadata: Metadata = {
  title: "AI Life Admin — Personal Finance & Life Copilot",
  description: "AI-powered personal life administration and finance copilot that maintains persistent understanding of your money, obligations, documents, and commitments.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <GoogleAuthProvider>
          <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column" }}>
            <MobileHeader />
            <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
              <Sidebar />
              <main className="app-main-content">
                {children}
              </main>
            </div>
          </div>
          <AIAssistantFloat />
        </GoogleAuthProvider>
      </body>
    </html>
  );
}
