import { generateAIResponse } from "./gemini";
import { FinancialContext } from "./context-builder";

export interface ReasoningMetric {
  label: string;
  value: string;
  delta?: string;
  status?: "positive" | "warning" | "danger" | "neutral";
}

export interface ReasoningStep {
  id: string;
  stepNumber: number;
  title: string;
  category: "solvency" | "commitments" | "runway" | "goals" | "verdict";
  verdict: "pass" | "caution" | "fail";
  summary: string;
  details: string;
  metrics: ReasoningMetric[];
}

export interface DetailedGoalImpact {
  name: string;
  target: number;
  current: number;
  needed: number;
  percentCapitalImpact: number;
  estimatedDelayDays: number;
  severe: boolean;
  delayNotice: string;
}

export interface AlternativeStrategy {
  title: string;
  tag: string;
  description: string;
  benefit: string;
  actionableText: string;
}

export interface PurchaseAnalysis {
  affordable: boolean;
  impact: "minimal" | "moderate" | "significant" | "critical";
  safetyScore: number; // 0 - 100
  verdictBadge: "SAFE TO BUY" | "BUY WITH CAUTION" | "NOT RECOMMENDED";
  currentAvailable: number;
  totalLiquidity: number;
  afterPurchase: number;
  upcomingCommitments: number;
  upcomingMonthlyPlansAmount: number;
  debtObligations: number;
  totalObligations: number;
  remainingAfterCommitments: number;
  remainingAfterAllObligations: number;
  liquidityBufferPercent: number;
  dailyBurnRate: number;
  runwayImpactDays: number;
  goalImpact: string[];
  detailedGoalImpact: DetailedGoalImpact[];
  reasoningSteps: ReasoningStep[];
  aiAnalysis: string;
  recommendation: string;
  bestFundingWallet?: {
    name: string;
    type: string;
    balance: number;
    canCover: boolean;
  };
  alternativeStrategies: AlternativeStrategy[];
}

export async function analyzePurchase(
  amount: number,
  description: string,
  context: FinancialContext
): Promise<PurchaseAnalysis> {
  // 1. Effective Liquidity & Primary Deterministic Math
  const totalWalletLiquidity = context.totalWalletLiquidity || 0;
  const effectiveLiquidity = totalWalletLiquidity > 0 ? totalWalletLiquidity : Math.max(0, context.currentAvailable);
  const afterPurchase = effectiveLiquidity - amount;

  // Imminent Liabilities breakdown
  const upcomingBillsAndSubs = context.upcomingCommitments || 0;
  const upcomingMonthlyPlansAmount = context.totalPlannedUpcoming || 0;
  const debtObligations = context.totalYouOwe || 0;
  const totalObligations = upcomingBillsAndSubs + upcomingMonthlyPlansAmount;
  
  const remainingAfterCommitments = afterPurchase - upcomingBillsAndSubs;
  const remainingAfterAllObligations = afterPurchase - totalObligations;
  const affordable = remainingAfterCommitments > 0 && afterPurchase > 0;

  // 2. Liquidity Buffer & Safety Score Calculation
  const liquidityBufferPercent = effectiveLiquidity > 0 
    ? Math.round((remainingAfterAllObligations / effectiveLiquidity) * 100)
    : 0;

  let safetyScore = 50;
  let verdictBadge: PurchaseAnalysis["verdictBadge"] = "BUY WITH CAUTION";
  let impact: PurchaseAnalysis["impact"] = "minimal";

  const ratioOfLiquidity = amount / Math.max(1, effectiveLiquidity);
  const ratioOfIncome = amount / Math.max(1, context.totalIncome || effectiveLiquidity);

  if (ratioOfLiquidity > 0.6 || ratioOfIncome > 0.5) impact = "critical";
  else if (ratioOfLiquidity > 0.35 || ratioOfIncome > 0.25) impact = "significant";
  else if (ratioOfLiquidity > 0.15 || ratioOfIncome > 0.12) impact = "moderate";
  else impact = "minimal";

  if (afterPurchase < 0) {
    safetyScore = Math.max(8, Math.min(30, Math.round(30 + (afterPurchase / Math.max(1, amount)) * 25)));
    verdictBadge = "NOT RECOMMENDED";
  } else if (remainingAfterAllObligations < 0) {
    safetyScore = Math.max(25, Math.min(48, Math.round(48 + (remainingAfterAllObligations / Math.max(1, totalObligations)) * 25)));
    verdictBadge = "NOT RECOMMENDED";
  } else if (remainingAfterAllObligations < effectiveLiquidity * 0.25 || ratioOfLiquidity > 0.4) {
    safetyScore = Math.max(50, Math.min(76, Math.round(52 + (remainingAfterAllObligations / Math.max(1, effectiveLiquidity * 0.25)) * 24)));
    verdictBadge = "BUY WITH CAUTION";
  } else {
    safetyScore = Math.min(98, Math.max(78, Math.round(78 + (remainingAfterAllObligations / Math.max(1, effectiveLiquidity)) * 20)));
    verdictBadge = "SAFE TO BUY";
  }

  // 3. Daily Burn & Living Runway Degradation
  const currentDay = Math.max(1, new Date().getDate());
  const dailyBurnRate = context.currentMonthSpend > 0 
    ? Math.round(context.currentMonthSpend / currentDay)
    : (context.totalExpenses > 0 ? Math.round(context.totalExpenses / 30) : 65);
  const runwayImpactDays = Math.max(1, Math.round(amount / Math.max(1, dailyBurnRate)));

  // 4. Wallet Selection
  const sortedWallets = [...(context.wallets || [])].sort((a, b) => (b.balance || 0) - (a.balance || 0));
  const coveringWallet = sortedWallets.find(w => w.balance >= amount);
  const bestFundingWallet = coveringWallet 
    ? { name: coveringWallet.name, type: coveringWallet.type, balance: coveringWallet.balance, canCover: true }
    : (sortedWallets[0] ? { name: sortedWallets[0].name, type: sortedWallets[0].type, balance: sortedWallets[0].balance, canCover: false } : undefined);

  // 5. Detailed Goal Cannibalization Assessment
  const detailedGoalImpact: DetailedGoalImpact[] = (context.activeGoals || []).map((g) => {
    const needed = Math.max(0, g.target - g.current);
    const percentCapitalImpact = needed > 0 ? Math.min(100, Math.round((amount / needed) * 100)) : 0;
    const estimatedDelayDays = Math.max(4, Math.round(amount / Math.max(15, dailyBurnRate * 0.4)));
    const severe = percentCapitalImpact > 25 || (needed > 0 && amount > needed * 0.5);
    const delayNotice = needed === 0 
      ? "Goal target already achieved."
      : `Absorbs ~${percentCapitalImpact}% of needed capital; delays target timeline by approx. ${estimatedDelayDays} days.`;
    return {
      name: g.name,
      target: g.target,
      current: g.current,
      needed,
      percentCapitalImpact,
      estimatedDelayDays,
      severe,
      delayNotice,
    };
  });

  const legacyGoalImpact = detailedGoalImpact
    .filter(g => g.needed > 0 && g.percentCapitalImpact > 10)
    .map(g => `May delay "${g.name}" goal (need $${g.needed.toFixed(0)} more, consumes ~${g.percentCapitalImpact}%)`);

  // 6. Structured 5-Step AI Reasoning Chain
  const step1Verdict = afterPurchase > 0 ? (ratioOfLiquidity > 0.4 ? "caution" : "pass") : "fail";
  const step2Verdict = remainingAfterAllObligations > 0 ? (remainingAfterAllObligations < totalObligations * 0.5 ? "caution" : "pass") : "fail";
  const step3Verdict = runwayImpactDays <= 7 ? "pass" : (runwayImpactDays <= 21 ? "caution" : "fail");
  const step4Verdict = detailedGoalImpact.some(g => g.severe) ? "caution" : "pass";
  const step5Verdict = verdictBadge === "SAFE TO BUY" ? "pass" : (verdictBadge === "BUY WITH CAUTION" ? "caution" : "fail");

  const reasoningSteps: ReasoningStep[] = [
    {
      id: "step-solvency",
      stepNumber: 1,
      title: "Immediate Liquidity & Reserve Stress Test",
      category: "solvency",
      verdict: step1Verdict,
      summary: afterPurchase > 0 
        ? `Preserves $${Math.round(afterPurchase).toLocaleString()} in liquid cash (${Math.max(0, 100 - Math.round(ratioOfLiquidity * 100))}% liquidity retained).`
        : `Overdraws current wallet liquidity by $${Math.abs(Math.round(afterPurchase)).toLocaleString()}. Immediate cash deficit.`,
      details: `Evaluated planned spend of $${amount.toLocaleString()} against verified total liquid funds of $${Math.round(effectiveLiquidity).toLocaleString()}. ` +
        (coveringWallet 
          ? `Your "${coveringWallet.name}" wallet has $${Math.round(coveringWallet.balance).toLocaleString()} and can self-fund this transaction without inter-account transfers.`
          : `No single wallet holds enough balance to cover this purchase outright. Liquidity would require pulling from multiple sources.`),
      metrics: [
        { label: "Total Liquidity", value: `$${Math.round(effectiveLiquidity).toLocaleString()}`, status: "neutral" },
        { label: "Purchase Amount", value: `-$${Math.round(amount).toLocaleString()}`, status: "warning" },
        { label: "Post-Purchase Cash", value: `$${Math.round(afterPurchase).toLocaleString()}`, status: afterPurchase > 0 ? "positive" : "danger" },
        { label: "Liquidity Depleted", value: `${Math.round(ratioOfLiquidity * 100)}%`, status: ratioOfLiquidity > 0.4 ? "warning" : "positive" },
      ],
    },
    {
      id: "step-commitments",
      stepNumber: 2,
      title: "14-Day Obligation & Cash Flow Clash Matrix",
      category: "commitments",
      verdict: step2Verdict,
      summary: remainingAfterAllObligations > 0
        ? `Guarantees all $${Math.round(totalObligations).toLocaleString()} in upcoming commitments are 100% shielded with $${Math.round(remainingAfterAllObligations).toLocaleString()} surplus.`
        : `Threatens upcoming obligations. Shortfall of $${Math.abs(Math.round(remainingAfterAllObligations)).toLocaleString()} against scheduled commitments.`,
      details: `Audited mandatory liabilities over the next 14–30 days: ` +
        `Upcoming recurring bills & subscriptions ($${Math.round(upcomingBillsAndSubs).toLocaleString()}) and planned monthly commitments ($${Math.round(upcomingMonthlyPlansAmount).toLocaleString()}). ` +
        (remainingAfterAllObligations > 0 
          ? `After this purchase, your safety buffer stays solvent and bills will not bounce.`
          : `Spending this capital risks defaulting on scheduled payments or incurring overdraft fees unless deferred.`),
      metrics: [
        { label: "Upcoming Commitments", value: `$${Math.round(totalObligations).toLocaleString()}`, status: "neutral" },
        { label: "Post-Bill Cushion", value: `$${Math.round(remainingAfterAllObligations).toLocaleString()}`, status: remainingAfterAllObligations > 0 ? "positive" : "danger" },
        { label: "Coverage Ratio", value: totalObligations > 0 ? `${Math.round((afterPurchase / totalObligations) * 100)}%` : "100%", status: remainingAfterAllObligations > 0 ? "positive" : "danger" },
      ],
    },
    {
      id: "step-runway",
      stepNumber: 3,
      title: "Burn Rate & Living Runway Consumption",
      category: "runway",
      verdict: step3Verdict,
      summary: `Consumes approximately ${runwayImpactDays} full days of baseline living expenses based on current burn rate ($${dailyBurnRate}/day).`,
      details: `Your current burn rate averages $${dailyBurnRate} per active day. This single transaction accelerates monthly cash outflow by ` +
        `${context.totalExpenses > 0 ? Math.round((amount / context.totalExpenses) * 100) : 25}% of your typical monthly baseline spend.`,
      metrics: [
        { label: "Daily Average Burn", value: `$${dailyBurnRate}/day`, status: "neutral" },
        { label: "Runway Consumed", value: `${runwayImpactDays} days`, status: runwayImpactDays > 15 ? "warning" : "positive" },
        { label: "Monthly Outflow Shift", value: `+${context.totalExpenses > 0 ? Math.round((amount / context.totalExpenses) * 100) : 25}%`, status: "neutral" },
      ],
    },
    {
      id: "step-goals",
      stepNumber: 4,
      title: "Goal Cannibalization & Savings Timeline Shift",
      category: "goals",
      verdict: step4Verdict,
      summary: detailedGoalImpact.length > 0 
        ? `${detailedGoalImpact.filter(g => g.severe).length > 0 ? "Delays high-priority savings targets" : "Minor impact on active financial targets"}.`
        : "No active savings goals detected; no timeline disruption.",
      details: detailedGoalImpact.length > 0
        ? `Cross-referenced against ${detailedGoalImpact.length} active savings goals. ` +
          detailedGoalImpact.map(g => `"${g.name}" requires $${g.needed.toLocaleString()}; this purchase equals ${g.percentCapitalImpact}% of that target.`).join(" ")
        : "You currently have no active targets set in Goals & Runway, meaning this transaction does not directly compete with dedicated goal milestones.",
      metrics: [
        { label: "Active Goals Audited", value: `${detailedGoalImpact.length}`, status: "neutral" },
        { label: "Goals Heavily Impacted", value: `${detailedGoalImpact.filter(g => g.severe).length}`, status: detailedGoalImpact.some(g => g.severe) ? "warning" : "positive" },
        { label: "Max Timeline Delay", value: detailedGoalImpact.length > 0 ? `~${Math.max(...detailedGoalImpact.map(g => g.estimatedDelayDays))} days` : "0 days", status: "neutral" },
      ],
    },
    {
      id: "step-verdict",
      stepNumber: 5,
      title: "Executive Synthesis & Strategic Prescriptions",
      category: "verdict",
      verdict: step5Verdict,
      summary: verdictBadge === "SAFE TO BUY" 
        ? "All solvency criteria satisfied with strong safety buffer. Cleared for acquisition."
        : (verdictBadge === "BUY WITH CAUTION" 
            ? "Affordable but tightens short-term flexibility. Consider installment or postponement."
            : "High financial stress risk. Exceeds recommended reserve thresholds."),
      details: `Deterministic assessment score: ${safetyScore}/100. ` +
        `Remaining buffer after all 14-day obligations represents ${liquidityBufferPercent}% of your starting capital. ` +
        (verdictBadge === "SAFE TO BUY"
          ? "You can proceed without jeopardizing bills or active debt payments."
          : "We strongly advise reviewing the alternate strategies below before executing."),
      metrics: [
        { label: "Safety Solvency Score", value: `${safetyScore}/100`, status: safetyScore >= 75 ? "positive" : (safetyScore >= 50 ? "warning" : "danger") },
        { label: "Verdict Level", value: verdictBadge, status: verdictBadge === "SAFE TO BUY" ? "positive" : (verdictBadge === "BUY WITH CAUTION" ? "warning" : "danger") },
        { label: "Net Safety Margin", value: `${liquidityBufferPercent}%`, status: liquidityBufferPercent >= 20 ? "positive" : "danger" },
      ],
    },
  ];

  // 7. Alternative Strategic Prescriptions
  const installment3m = Math.round(amount / 3);
  const alternativeStrategies: AlternativeStrategy[] = [
    {
      title: "3-Month Split Installment",
      tag: "Preserve Liquidity",
      description: `Split into 3 monthly payments of $${installment3m.toLocaleString()}/mo instead of lump sum.`,
      benefit: `Reduces immediate cash burn by 67%, preserving $${Math.round(amount - installment3m).toLocaleString()} in your reserve today.`,
      actionableText: "Simulate Installment Plan",
    },
    {
      title: "Postpone to Next Inflow Cycle",
      tag: "Zero Risk",
      description: "Wait 2–3 weeks until next anticipated salary or freelance deposit hits.",
      benefit: `Allows your current cash cushion ($${Math.round(effectiveLiquidity).toLocaleString()}) to safely digest upcoming bills before committing.`,
      actionableText: "Add Reminder to Monthly Planning",
    },
    {
      title: "Discretionary Spending Offset",
      tag: "Self-Funded",
      description: `Trim non-essential dining and entertainment expenses by $${Math.round(amount * 0.4).toLocaleString()} this month.`,
      benefit: "Neutralizes nearly half of the capital impact without tapping emergency reserves.",
      actionableText: "Adjust Monthly Budget",
    },
  ];

  // 8. Natural Language AI Reasoning Synthesis
  const prompt = `You are a high-level executive personal finance AI copilot. Analyze this planned purchase based on verified deterministic financial data:

PURCHASE: ${description} — $${amount.toLocaleString()}

FINANCIAL POSITION (VERIFIED):
- Total Liquid Cash: $${effectiveLiquidity.toFixed(2)}
- Cash After Purchase: $${afterPurchase.toFixed(2)}
- 14-Day Mandatory Obligations: $${totalObligations.toFixed(2)}
- Net Safety Buffer After All Obligations: $${remainingAfterAllObligations.toFixed(2)}
- Safety Score: ${safetyScore}/100 (${verdictBadge})
- Daily Burn Rate: $${dailyBurnRate.toFixed(2)}/day (Runway Consumed: ${runwayImpactDays} days)
- Best Funding Wallet: ${bestFundingWallet?.name || "None"} (Balance: $${bestFundingWallet?.balance.toFixed(2) || "0"})
- Goals Impacted: ${detailedGoalImpact.map(g => `${g.name} (${g.delayNotice})`).join("; ") || "None"}

Provide:
1. AI Analysis: A concise, insightful 2-3 sentence executive breakdown of liquidity impact, cash flow safety, and trade-offs.
2. Recommendation: A direct, actionable 1-2 sentence recommendation on whether to buy, wait, split payments, or fund from a specific wallet.`;

  let aiAnalysis = "";
  let recommendation = "";

  try {
    const response = await generateAIResponse(
      prompt,
      "You are a sophisticated personal finance strategist. Be direct, mathematically grounded, and transparent. Do not invent numbers."
    );
    const parts = response.split(/recommendation:?/i);
    aiAnalysis = parts[0]?.replace(/analysis:?/i, "").trim() || response;
    recommendation = parts[1]?.trim() || (
      verdictBadge === "SAFE TO BUY"
        ? `Clear to purchase. Recommend funding from "${bestFundingWallet?.name || 'main wallet'}" to maintain operational simplicity.`
        : `Consider splitting this purchase into installments or waiting for next month's cash injection to safeguard your safety buffer.`
    );
  } catch {
    aiAnalysis = affordable
      ? `Allocating $${amount.toLocaleString()} leaves $${Math.round(afterPurchase).toLocaleString()} in liquid capital. After accounting for all upcoming 14-day obligations of $${Math.round(totalObligations).toLocaleString()}, you retain a secure net cushion of $${Math.round(remainingAfterAllObligations).toLocaleString()} (${liquidityBufferPercent}% of starting liquidity).`
      : `This $${amount.toLocaleString()} purchase significantly strains your financial position. It either overdraws your available cash or jeopardizes $${Math.round(totalObligations).toLocaleString()} in scheduled upcoming commitments.`;
    recommendation = verdictBadge === "SAFE TO BUY"
      ? `Feasible to buy today. We suggest paying from ${bestFundingWallet?.name || "your primary wallet"}.`
      : (verdictBadge === "BUY WITH CAUTION"
          ? "Proceed with caution. Consider a 3-month installment plan to prevent sudden cash-flow stress."
          : "Not recommended at this time. Postpone until the next cash inflow or after major bills clear.");
  }

  return {
    affordable,
    impact,
    safetyScore,
    verdictBadge,
    currentAvailable: context.currentAvailable,
    totalLiquidity: effectiveLiquidity,
    afterPurchase,
    upcomingCommitments: upcomingBillsAndSubs,
    upcomingMonthlyPlansAmount,
    debtObligations,
    totalObligations,
    remainingAfterCommitments,
    remainingAfterAllObligations,
    liquidityBufferPercent,
    dailyBurnRate,
    runwayImpactDays,
    goalImpact: legacyGoalImpact,
    detailedGoalImpact,
    reasoningSteps,
    aiAnalysis,
    recommendation,
    bestFundingWallet,
    alternativeStrategies,
  };
}
