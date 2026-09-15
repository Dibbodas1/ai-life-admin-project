# AI Life Admin — Comprehensive Project & State Context

> **Quick Start for New Chat**: This document contains the full architecture, design system guidelines, completed features, data flow, and user preferences for the **AI Life Admin** application. Read this file first to resume work seamlessly with complete context.

---

## 1. Project Overview & Tech Stack

* **Application**: **AI Life Admin** — Personal Finance & Life Copilot
* **Workspace Paths**:
  * Root: `d:\coding\serious_projects\AI Life Admin`
  * Next.js Project: `d:\coding\serious_projects\AI Life Admin\ai-life-admin`
* **Core Technologies**:
  * **Framework**: Next.js 16 (App Router with Turbopack), React 19, TypeScript
  * **Styling**: Tailored Dark Frosted Glassmorphism (Vanilla CSS tokens + inline design tokens, Lucide icons, Inter/Outfit typography)
  * **Data Persistence & Isolation**: Google Drive DB engine (`src/lib/drive-db.ts`) with isolated caching per user token (`data/user-cache-[hash].json`) and dedicated demo mode (`data/mock-db.json`). Google accounts never contaminate demo data, and logging out cleanly unlinks user data.
  * **AI Intelligence**: Google Gemini API integration (`src/lib/ai/gemini.ts`) supporting bilingual commands (**Banglish** and **English**).
  * **Real-Time Synchronization**: Multi-layer zero-latency event system (`BroadcastChannel` + CustomEvents + StorageEvents + `apiFetch`).
  * **Logout & Disconnect**: `/api/auth/disconnect` purges cached token files and localStorage tokens, cleanly reverting UI to demo state without data leakage.

---

## 2. User Preferences & Strict Design Guidelines

1. **Aesthetic Direction: Executive Dark Frosted Glassmorphism**
   * **Canvas**: Deep midnight obsidian `#090D16` (no light mode).
   * **Cards & Slates**: Layered frosted glass `rgba(255, 255, 255, 0.03)` with `backdrop-filter: blur(20px)`, `border: 1px solid rgba(255, 255, 255, 0.08)`, and smooth 16–22px border radius.
   * **Curated Glowing Accents**:
     * **Emerald** (`#10B981` / `#34D399`): Income, inflows, safe verdicts, positive cash flow.
     * **Rose / Crimson** (`#F43F5E` / `#FB7185`): Outflows, expenses, critical stress alerts, high risk.
     * **Cyan / Aqua** (`#06B6D4` / `#22D3EE`): Liquid wallet balances, solvency metrics, intelligence features.
     * **Indigo / Purple** (`#6366F1` / `#818CF8`): AI Copilot, reasoning chains, brand logo, accents.
     * **Amber / Gold** (`#F59E0B` / `#FBBF24`): 14-day upcoming commitments, warning thresholds, loans.

2. **Crucial Modal Centering Pattern (Avoid CSS Transform Trap)**:
   * All popups and modals **must** be rendered at the root React fragment level:
     ```tsx
     <>
       {/* Page content */}
       {showModal && (
         <div style={{
           position: "fixed",
           top: 0,
           left: 0,
           width: "100vw",
           height: "100vh",
           display: "flex",
           alignItems: "center",
           justifyContent: "center",
           background: "rgba(0, 0, 0, 0.75)",
           backdropFilter: "blur(12px)",
           zIndex: 9999,
         }}>
           {/* Centered Modal Card */}
         </div>
       )}
     </>
     ```
   * Never render fixed modals inside parent containers that have CSS `transform`, `filter`, or `perspective`, as this causes the modal to center relative to the parent rather than the viewport.

3. **Zero-Reload Real-Time Sync**:
   * Every mutation (AI prompt, modal submission, or deletion) calls `emitDataUpdated()` from `@/lib/utils`.
   * All pages subscribe with `onDataUpdated(() => { fetchFreshData(); })`.
   * All network requests use `apiFetch(url, options)` from `@/lib/utils` which appends cache-buster timestamps and no-cache headers.

4. **Bilingual AI Copilot Support**:
   * The AI Assistant understands both **English** (*"Add $50 expense for dinner"*) and **Banglish** (*"ami ajke 500 taka diye kachchi khasi khailam"* or *"amake 2000 taka dia dilo"* or *"agami 25 tarikh bari bhara 12000 taka dite hobe"*).

---

## 3. Detailed Status of All Application Pages

### 1. Dashboard (`/`)
* **Features**: Executive dark frosted overview, net worth ticker, liquid cash vs debt summary, AI financial health diagnosis, quick transaction actions.
* **File**: `src/app/page.tsx`.

### 2. Wallets & Cash Reserves (`/money/wallets`)
* **Features**:
  * Interactive wallet cards with glowing gradients according to wallet type (Bank, Mobile Money, Cash, Crypto, Credit).
  * Net liquidity ticker, wallet breakdown, and recent inter-wallet transfer ledger.
  * **Viewport-Centered Modals**: "Add New Wallet" and "Transfer Funds Between Wallets".
* **Files**: `src/app/money/wallets/page.tsx`, `src/app/api/wallets/route.ts`.

### 3. Monthly Planning & Upcoming Expenses (`/money/planning`)
* **Features**:
  * Full interactive monthly calendar with color-coded date markers for planned commitments.
  * Planned items listing with priority tags (High, Medium, Low), category badges, and wallet assignment.
  * Actions: Quick mark as paid (automatically creates an expense and marks plan paid), delete plan.
  * Full AI Copilot control in English and Banglish (*e.g., "Add house rent ৳15,000 on 28th September"*).
* **Files**: `src/app/money/planning/page.tsx`, `src/app/api/planning/route.ts`.

### 4. Expenses & Cash Outflow (`/money/expenses`)
* **Features**:
  * 4-Metric Burn Rate Cockpit: Total Spent This Month, Daily Average Burn, Top Expense Area, AI Copilot Categorization Rate.
  * Multi-segment Spending Allocation Bar across all expense categories.
  * Dual View Toggle: **Expense Cards** (rich cards with merchant logos) vs **Expense Sheet** (dense financial table with category filter and search).
  * **Viewport-Centered "Record Expense" Modal**: Merchant, amount, real-time AI category auto-classification, funding wallet selector (with balance check), transaction date, and notes.
* **Files**: `src/app/money/expenses/page.tsx`, `src/app/api/expenses/route.ts`.

### 5. Income & Cash Inflow (`/money/income`)
* **Features**:
  * 4-Metric Inflow Cockpit: Earned This Month, All-Time Accumulated Inflow, Top Inflow Stream, Active Inflow Sources.
  * Multi-segment Inflow Distribution Bar (Salary, Freelance, Investments, Consulting, etc.).
  * Dual View Toggle: **Inflow Cards** vs **Inflow Sheet** table with recurring filter and category filter.
  * **Viewport-Centered "Record Income" Modal**: Source/payer, amount, category, destination wallet selector (auto-credits balance), deposit date, recurring monthly toggle, and memo.
* **Files**: `src/app/money/income/page.tsx`, `src/app/api/income/route.ts`.

### 6. Loans & Debts (`/money/loans`)
* **Features**:
  * Executive slates for **Money Lent to Others** (assets to collect) vs **Money Borrowed from Others** (liabilities to repay).
  * Redesigned person cards with settlement progress dials, contact avatars, due dates, and status pills.
  * Slide-over Repayment / Settlement History Drawer.
  * **Viewport-Centered Modal**: Record New Loan / Debt with person name, type, amount, due date, and wallet link.
* **Files**: `src/app/money/loans/page.tsx`, `src/app/api/loans/route.ts`.

### 7. Purchase AI Decision Engine (`/insights/recommendations`)
* **Features**:
  * **Live Financial Context Bar**: Real-time ticker showing Total Liquid Funds, 14-Day Mandatory Obligations, Current Month Spent, and Active Savings Goals.
  * **Quick-Test Presets**: Clickable chips for instant stress-testing (*MacBook Pro M3, PS5 Pro, iPhone 16 Pro, Tokyo Flight, Sony Headphones, Herman Miller Chair*).
  * **Solvency Index Dial (0–100)**: Visual gauge with color-coded safety tiers:
    * `SAFE TO BUY` (Emerald)
    * `BUY WITH CAUTION` (Amber)
    * `NOT RECOMMENDED` (Rose)
  * **Deterministic Cash-Flow Waterfall**: Step-by-step capital transition:
    `1. Start Liquidity ➔ 2. Planned Purchase ➔ 3. Cash Residual ➔ 4. 14d Obligations ➔ 5. Net Safety Buffer`.
  * **5-Step Chain-of-Thought AI Reasoning Chain**:
    1. *Immediate Liquidity & Reserve Stress Test* (instant cash delta & wallet reserve impact).
    2. *14-Day Obligation & Cash Flow Clash Matrix* (audits upcoming bills, monthly plans & loan debt maturities).
    3. *Burn Rate & Living Runway Consumption* (converts cost into days of living expenses).
    4. *Savings Goal Cannibalization Matrix* (timeline shift & delay estimates on active savings goals).
    5. *Executive Synthesis & Strategic Prescriptions*.
  * **Goal Cannibalization Matrix**: Visual progress bars and delay warnings for active targets.
  * **"What-If" Scenario Sandbox**: Instant simulation for:
    * *3-Month Split Installment* (`$X/mo` preserving immediate liquidity)
    * *Postpone to Next Inflow Cycle*
    * *Discretionary Spending Offset*
  * **Evaluation History Drawer**: Persists recent evaluations in `localStorage` to compare purchases side-by-side.
* **Files**:
  * Page: `src/app/insights/recommendations/page.tsx`
  * Engine: `src/lib/ai/purchase-engine.ts`
  * API: `src/app/api/purchase-analysis/route.ts`

### 8. AI Copilot & Assistant (`/assistant` & global floating copilot)
* **Features**:
  * Global floating AI button (bottom right) accessible across all pages.
  * Direct natural language command execution: records expenses, logs income, schedules monthly plans, creates wallets, logs transfers, and updates loans without manual clicking.
  * Deep financial context builder (`src/lib/ai/context-builder.ts`).
* **Files**: `src/components/shared/AICopilotModal.tsx`, `src/app/api/assistant/route.ts`.

---

## 4. Database Schema & Mock Data (`src/lib/types.ts`)

The database `DriveAppData` contains:
```ts
interface DriveAppData {
  wallets: Wallet[];
  walletTransfers: WalletTransfer[];
  monthlyPlans: MonthlyPlanItem[];
  income: IncomeItem[];
  expenses: ExpenseItem[];
  bills: BillItem[];
  subscriptions: SubscriptionItem[];
  financialGoals: FinancialGoal[];
  loans: LoanDebt[];
  lifeAdminTasks: LifeAdminTask[];
  budgets: BudgetItem[];
}
```
* Default local fallback cache: `data/mock-db.json`.
* Live Google Drive cloud file: `ai_life_admin_db.json`.
* Both Google Drive OAuth tokens (`drive.file` scope) and local demo tokens (`demo_token` / `dummy_demo_token`) are fully supported by `getDriveData(token)` and `saveDriveData(token, data)` in `src/lib/drive-db.ts`. Real tokens synchronize directly with Google Drive via `googleapis`, with local caching for zero-latency fallback.

---

## 5. How to Run & Verify

1. **Dev Server**:
   ```bash
   cd "d:\coding\serious_projects\AI Life Admin\ai-life-admin"
   npm run dev
   ```
   Runs on `http://localhost:3000`.

2. **Production Build Verification**:
   ```bash
   npm run build
   ```
   Must pass with exit code 0 and zero TypeScript errors.

---

## 6. Next Recommended Areas of Work

1. **Goals & Runway (`/goals`)**:
   * Redesign to match the executive dark frosted theme with interactive progress rings and runway projection graphs.
2. **Life Admin & Bills (`/life-admin/bills` & `/life-admin/tasks`)**:
   * Modernize bills & subscriptions management with recurring calendar badges.
3. **Budget Planner (`/money/budgets`)**:
   * Add real-time category spending vs budget envelope visualization.
