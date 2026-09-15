import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatShortDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function daysUntil(date: Date | string): number {
  const target = new Date(date);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const DATA_UPDATED_EVENT = "ai-life-admin-data-updated";

let globalBroadcastChannel: BroadcastChannel | null = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    globalBroadcastChannel = new BroadcastChannel("ai-life-admin-sync");
  } catch {}
}

export function emitDataUpdated() {
  if (typeof window !== "undefined") {
    // 1. Same-window custom event (immediate)
    window.dispatchEvent(new CustomEvent(DATA_UPDATED_EVENT, { detail: { time: Date.now() } }));

    // 2. BroadcastChannel for zero-latency multi-tab sync
    try {
      globalBroadcastChannel?.postMessage({ type: DATA_UPDATED_EVENT, time: Date.now() });
    } catch {}

    // 3. localStorage for fallback cross-tab storage event
    try {
      localStorage.setItem("ai_last_mutation", Date.now().toString());
    } catch {}

    // 4. Staggered secondary dispatch to catch any microsecond filesystem/database flush delays
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent(DATA_UPDATED_EVENT, { detail: { time: Date.now() } }));
      try {
        globalBroadcastChannel?.postMessage({ type: DATA_UPDATED_EVENT, time: Date.now() });
      } catch {}
    }, 250);
  }
}

/**
 * Subscribes to real-time data updates across the current window, other tabs,
 * window focus, and document visibility changes.
 */
export function onDataUpdated(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  let lastTrigger = 0;
  const throttledCallback = () => {
    const now = Date.now();
    // Prevent double execution within 80ms while maintaining instantaneous response
    if (now - lastTrigger > 80) {
      lastTrigger = now;
      callback();
    }
  };

  const handleCustomEvent = () => throttledCallback();
  const handleStorage = (e: StorageEvent) => {
    if (e.key === "ai_last_mutation") throttledCallback();
  };
  const handleVisibilityOrFocus = () => {
    if (document.visibilityState === "visible") throttledCallback();
  };

  window.addEventListener(DATA_UPDATED_EVENT, handleCustomEvent);
  window.addEventListener("storage", handleStorage);
  window.addEventListener("focus", handleVisibilityOrFocus);
  document.addEventListener("visibilitychange", handleVisibilityOrFocus);

  let bc: BroadcastChannel | null = null;
  if ("BroadcastChannel" in window) {
    try {
      bc = new BroadcastChannel("ai-life-admin-sync");
      bc.onmessage = (event) => {
        if (event.data?.type === DATA_UPDATED_EVENT) {
          throttledCallback();
        }
      };
    } catch {}
  }

  // Periodic heartbeat sync (every 6 seconds if document is visible)
  const intervalId = setInterval(() => {
    if (document.visibilityState === "visible") {
      throttledCallback();
    }
  }, 6000);

  return () => {
    window.removeEventListener(DATA_UPDATED_EVENT, handleCustomEvent);
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("focus", handleVisibilityOrFocus);
    document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    clearInterval(intervalId);
    if (bc) {
      try { bc.close(); } catch {}
    }
  };
}

/**
 * Robust fetch wrapper that forces no-cache, appends cache-buster timestamp,
 * and attaches Authorization header so data is ALWAYS fresh in real-time.
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = typeof window !== "undefined"
    ? localStorage.getItem("google_drive_token") || "demo_token"
    : "demo_token";

  const separator = url.includes("?") ? "&" : "?";
  const cacheBustedUrl = `${url}${separator}_t=${Date.now()}`;

  const headers: Record<string, string> = {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((val, key) => { headers[key] = val; });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, val]) => { headers[key] = val; });
    } else {
      Object.assign(headers, options.headers);
    }
  }

  return fetch(cacheBustedUrl, {
    ...options,
    cache: "no-store",
    headers,
  });
}

