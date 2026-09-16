import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// Key helpers
export const TELEGRAM_LINK_KEY = (telegramId: number) =>
  `tg:link:${telegramId}`;
export const PENDING_LINK_KEY = (code: string) => `tg:pending:${code}`;
export const USER_TELEGRAM_KEY = (googleToken: string) =>
  `tg:user:${googleToken}`;

export interface TelegramLink {
  telegramId: number;
  telegramUsername?: string;
  googleAccessToken: string;
  linkedAt: string;
}
