"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import GoogleLoginButton from "@/components/shared/GoogleLoginButton";
import {
  LayoutDashboard, Wallet, TrendingUp, Receipt,
  HandCoins, Sparkles, Target, Bot, CalendarClock,
  X, MessageCircle
} from "lucide-react";

const GithubIcon = ({ size = 24, color = "currentColor", ...props }: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3-.3 6-1.5 6-6.5a5.5 5.5 0 0 0-1.5-3.8 5.2 5.2 0 0 0-.1-3.8s-1.2-.4-3.9 1.4a13.3 13.3 0 0 0-7 0C6.2 3.4 5 3.8 5 3.8a5.2 5.2 0 0 0-.1 3.8 5.5 5.5 0 0 0-1.5 3.8c0 5 3 6.2 6 6.5a4.8 4.8 0 0 0-1 3.2v4" />
    <path d="M9 18c-4.5 1.5-5-2.5-7-3" />
  </svg>
);

const LinkedinIcon = ({ size = 24, color = "currentColor", ...props }: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const navSections = [
  {
    title: "MENU",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Wallets", href: "/money/wallets", icon: Wallet },
      { label: "Monthly Planning", href: "/money/planning", icon: CalendarClock },
      { label: "Expenses", href: "/money/expenses", icon: Receipt },
      { label: "Income", href: "/money/income", icon: TrendingUp },
      { label: "Loans & Debts", href: "/money/loans", icon: HandCoins },
    ],
  },
  {
    title: "INTELLIGENCE",
    items: [
      { label: "Purchase AI Engine", href: "/insights/recommendations", icon: Sparkles },
      { label: "Goals & Runway", href: "/goals", icon: Target },
      { label: "AI Assistant", href: "/assistant", icon: Bot },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      { label: "Telegram Bot", href: "/settings/telegram", icon: MessageCircle },
    ],
  },
  {
    title: "CONNECT",
    items: [
      { label: "LinkedIn", href: "https://www.linkedin.com/in/dibbodas/", icon: LinkedinIcon, external: true },
      { label: "GitHub", href: "https://github.com/Dibbodas1", icon: GithubIcon, external: true },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setIsMobileOpen(prev => !prev);
    const handleOpen = () => setIsMobileOpen(true);
    const handleClose = () => setIsMobileOpen(false);

    window.addEventListener("toggle-mobile-sidebar", handleToggle);
    window.addEventListener("open-mobile-sidebar", handleOpen);
    window.addEventListener("close-mobile-sidebar", handleClose);

    return () => {
      window.removeEventListener("toggle-mobile-sidebar", handleToggle);
      window.removeEventListener("open-mobile-sidebar", handleOpen);
      window.removeEventListener("close-mobile-sidebar", handleClose);
    };
  }, []);

  // Auto-close on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            zIndex: 55,
          }}
          className="lg:hidden animate-fade-in"
        />
      )}

      <aside
        style={{
          width: "260px",
          height: "100vh",
          position: "fixed",
          top: 0,
          left: 0,
          background: "linear-gradient(180deg, #0B0F1C 0%, #080B14 100%)",
          borderRight: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          zIndex: 60,
          padding: "24px 18px",
          boxShadow: "4px 0 24px rgba(0, 0, 0, 0.5)",
          transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className={`sidebar-drawer ${isMobileOpen ? "mobile-drawer-open" : "mobile-drawer-closed"}`}
      >
        {/* Brand / Logo + Mobile Close Button */}
        <div style={{
          marginBottom: "28px",
          paddingLeft: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <Link href="/" style={{ textDecoration: "none" }} onClick={() => setIsMobileOpen(false)}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
              width: "42px",
              height: "42px",
              borderRadius: "14px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 24px -2px rgba(0, 0, 0, 0.4)",
            }}>
              <div style={{
                width: "26px",
                height: "26px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Sparkles size={15} color="#FFFFFF" />
              </div>
            </div>
            <div>
              <div style={{
                fontSize: "17px",
                fontWeight: 800,
                color: "#F8FAFC",
                letterSpacing: "-0.3px",
                lineHeight: 1.1,
              }}>
                AI Life Admin
              </div>
              <div style={{
                fontSize: "11px",
                color: "#818CF8",
                fontWeight: 600,
                marginTop: "2px",
              }}>
                Finance &amp; Life Copilot
              </div>
            </div>
          </div>
        </Link>
        <button
          onClick={() => setIsMobileOpen(false)}
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "10px",
            width: "34px",
            height: "34px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#94A3B8",
            cursor: "pointer",
          }}
          className="lg:hidden"
          title="Close Navigation Menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation Sections */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
        {navSections.map((section) => (
          <div key={section.title}>
            <div style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "#64748B",
              textTransform: "uppercase",
              letterSpacing: "1.2px",
              padding: "0 14px 8px",
            }}>
              {section.title}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                if ("external" in item && item.external) {
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`sidebar-link`}
                    >
                      <Icon size={18} />
                      <span style={{ fontSize: "13.5px" }}>{item.label}</span>
                    </a>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-link ${isActive ? "active" : ""}`}
                  >
                    <Icon size={18} />
                    <span style={{ fontSize: "13.5px" }}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User & Auth */}
      <div style={{
        marginTop: "auto",
        paddingTop: "16px",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <GoogleLoginButton />
      </div>
    </aside>
  </>
  );
}
