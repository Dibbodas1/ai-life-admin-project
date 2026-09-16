import { DriveAppData } from "./types";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { google } from "googleapis";

const DATA_DIR = path.join(process.cwd(), "data");
const DRIVE_FILE_NAME = "ai_life_admin_db.json";

export const DEFAULT_DATA: DriveAppData = {
  users: [],
  expenses: [],
  income: [],
  categories: [],
  budgets: [],
  subscriptions: [],
  bills: [],
  financialGoals: [],
  lifeAdminTasks: [],
  documents: [],
  insights: [],
  alerts: [],
  loans: [],
  wallets: [],
  walletTransfers: [],
  monthlyPlans: [],
  agentMemory: [],
};

function ensureArrays(data: any): DriveAppData {
  if (!data || typeof data !== "object") data = {};
  return {
    users: Array.isArray(data.users) ? data.users : [],
    expenses: Array.isArray(data.expenses) ? data.expenses : [],
    income: Array.isArray(data.income) ? data.income : [],
    categories: Array.isArray(data.categories) ? data.categories : [],
    budgets: Array.isArray(data.budgets) ? data.budgets : [],
    subscriptions: Array.isArray(data.subscriptions) ? data.subscriptions : [],
    bills: Array.isArray(data.bills) ? data.bills : [],
    financialGoals: Array.isArray(data.financialGoals) ? data.financialGoals : [],
    lifeAdminTasks: Array.isArray(data.lifeAdminTasks) ? data.lifeAdminTasks : [],
    documents: Array.isArray(data.documents) ? data.documents : [],
    insights: Array.isArray(data.insights) ? data.insights : [],
    alerts: Array.isArray(data.alerts) ? data.alerts : [],
    loans: Array.isArray(data.loans) ? data.loans : [],
    wallets: Array.isArray(data.wallets) ? data.wallets : [],
    walletTransfers: Array.isArray(data.walletTransfers) ? data.walletTransfers : [],
    monthlyPlans: Array.isArray(data.monthlyPlans) ? data.monthlyPlans : [],
    agentMemory: Array.isArray(data.agentMemory) ? data.agentMemory : [],
  };
}

export function isDemoToken(token?: string | null): boolean {
  return !token || token === "demo_token" || token === "dummy_demo_token";
}

function getTokenHash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex").slice(0, 16);
}

function getUserCachePath(token: string): string {
  return path.join(DATA_DIR, `user-cache-${getTokenHash(token)}.json`);
}

function getUserCache(token: string): DriveAppData | null {
  try {
    const cacheFile = getUserCachePath(token);
    if (fs.existsSync(cacheFile)) {
      const content = fs.readFileSync(cacheFile, "utf-8");
      return ensureArrays(JSON.parse(content));
    }
  } catch (error) {
    console.error("Error reading user drive cache:", error);
  }
  return null;
}

function saveUserCache(token: string, data: DriveAppData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const cacheFile = getUserCachePath(token);
    fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing user drive cache:", error);
  }
}

export function clearUserCache(token: string): void {
  try {
    if (isDemoToken(token)) return;
    const cacheFile = getUserCachePath(token);
    if (fs.existsSync(cacheFile)) {
      fs.unlinkSync(cacheFile);
    }
  } catch (error) {
    console.error("Error clearing user drive cache:", error);
  }
}

export async function getDriveData(accessToken: string): Promise<{ data: DriveAppData; fileId: string | null }> {
  // If not logged into Google Drive, return 100% empty data (NO DEMO DATA)
  if (isDemoToken(accessToken)) {
    return { data: { ...DEFAULT_DATA }, fileId: null };
  }

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: "v3", auth });

    // Look for existing app database file in the user's personal Google Drive
    const listRes = await drive.files.list({
      q: `name = '${DRIVE_FILE_NAME}' and trashed = false`,
      fields: "files(id, name)",
      spaces: "drive",
    });

    if (listRes.data.files && listRes.data.files.length > 0) {
      const fileId = listRes.data.files[0].id!;
      const fileRes = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "text" }
      );

      let data: any;
      if (typeof fileRes.data === "string") {
        data = JSON.parse(fileRes.data);
      } else {
        data = fileRes.data;
      }
      const verifiedData = ensureArrays(data);

      // Cache strictly isolated to this active token session
      saveUserCache(accessToken, verifiedData);
      return { data: verifiedData, fileId };
    } else {
      // First-time connection for this Google account:
      // Initialize an empty database on their Google Drive (NO DEMO DATA)
      const initialData: DriveAppData = {
        users: [
          {
            _id: "user_" + Date.now(),
            name: "Account Holder",
            email: "",
            image: "",
            currency: "USD",
            preferences: {
              budgetingStyle: "monthly",
              reminderDays: 3,
              theme: "dark",
            },
          },
        ],
        expenses: [],
        income: [],
        categories: [],
        budgets: [],
        subscriptions: [],
        bills: [],
        financialGoals: [],
        lifeAdminTasks: [],
        documents: [],
        insights: [],
        alerts: [],
        loans: [],
        wallets: [],
        walletTransfers: [],
        monthlyPlans: [],
        agentMemory: [],
      };

      const createRes = await drive.files.create({
        requestBody: {
          name: DRIVE_FILE_NAME,
          mimeType: "application/json",
        },
        media: {
          mimeType: "application/json",
          body: JSON.stringify(initialData, null, 2),
        },
        fields: "id",
      });

      saveUserCache(accessToken, initialData);
      return { data: initialData, fileId: createRes.data.id || null };
    }
  } catch (error) {
    console.error("Google Drive fetch error (falling back to user cache if available):", error);
    const cached = getUserCache(accessToken);
    if (cached) {
      return { data: cached, fileId: "cached-offline" };
    }
    // Return empty dataset so no other data is ever exposed
    return { data: { ...DEFAULT_DATA }, fileId: null };
  }
}

export async function saveDriveData(accessToken: string, data: DriveAppData): Promise<void> {
  // If not logged into Google Drive, do not save
  if (isDemoToken(accessToken)) {
    throw new Error("Google Drive not connected. Please login with Google Drive to save data.");
  }

  // Update isolated user cache
  saveUserCache(accessToken, data);

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: "v3", auth });

    const listRes = await drive.files.list({
      q: `name = '${DRIVE_FILE_NAME}' and trashed = false`,
      fields: "files(id, name)",
      spaces: "drive",
    });

    if (listRes.data.files && listRes.data.files.length > 0) {
      const fileId = listRes.data.files[0].id!;
      await drive.files.update({
        fileId,
        media: {
          mimeType: "application/json",
          body: JSON.stringify(data, null, 2),
        },
      });
    } else {
      await drive.files.create({
        requestBody: {
          name: DRIVE_FILE_NAME,
          mimeType: "application/json",
        },
        media: {
          mimeType: "application/json",
          body: JSON.stringify(data, null, 2),
        },
      });
    }
  } catch (error) {
    console.error("Google Drive save error (safely retained in user cache):", error);
    throw error;
  }
}
