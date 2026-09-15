import { NextRequest, NextResponse } from "next/server";
import { getDriveData } from "@/lib/drive-db";
import { generateAIResponse } from "@/lib/ai/gemini";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") || "demo_token";
    const { data } = await getDriveData(token);

    const wallets = data.wallets || [];
    const totalLiquidity = wallets.reduce((s, w) => s + (Number(w.balance) || 0), 0);

    const totalIncome = (data.income || []).reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const totalExpenses = (data.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const activeLoans = (data.loans || []).filter((l) => l.status === "active" && l.amount > 0);
    const totalLent = activeLoans.filter((l) => l.type === "lent").reduce((s, l) => s + l.amount, 0);
    const totalBorrowed = activeLoans.filter((l) => l.type === "borrowed").reduce((s, l) => s + l.amount, 0);

    // Baseline Metrics
    const savingsRatePct = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0;
    const monthlyBurn = totalExpenses > 0 ? totalExpenses : 1000;
    const runwayMonths = monthlyBurn > 0 ? Number((totalLiquidity / monthlyBurn).toFixed(1)) : 12;
    const debtToLiquidityPct = totalLiquidity > 0 ? Math.round((totalBorrowed / totalLiquidity) * 100) : 0;

    const dataSummary = `
FINANCIAL SNAPSHOT:
- Total Liquid Net Worth Across Wallets: $${totalLiquidity}
- Wallets: ${wallets.map((w) => `${w.name} (${w.type}): $${w.balance}`).join(", ") || "None"}
- Total Monthly Income: $${totalIncome}
- Total Monthly Expenses: $${totalExpenses}
- Net Cash Flow: $${totalIncome - totalExpenses} (Savings Rate: ${savingsRatePct}%)
- Money Lent (People Owe You): $${totalLent}
- Money Borrowed (You Owe People): $${totalBorrowed}
- Outstanding Contacts: ${activeLoans.map((l) => `${l.personName} (${l.type === "lent" ? "owes you" : "you owe"}: $${l.amount})`).join(", ") || "None"}
`;

    const prompt = `Analyze this person's financial situation based ONLY on the verified data above:
${dataSummary}

Provide an in-depth financial diagnosis returned STRICTLY as valid JSON with NO markdown formatting, backticks, or other text:
{
  "healthScore": <integer between 40 and 98 based on liquidity, debt, and cash flow>,
  "verdict": "<2 punchy sentences summarizing overall financial health and immediate outlook>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "vulnerabilities": ["<vulnerability or risk 1>", "<vulnerability or risk 2>"],
  "metrics": {
    "burnRate": ${monthlyBurn},
    "runwayMonths": ${runwayMonths},
    "savingsRatePct": ${savingsRatePct},
    "debtToLiquidityPct": ${debtToLiquidityPct}
  },
  "recommendations": [
    {
      "priority": "high",
      "title": "<Concise action title>",
      "description": "<Direct, actionable advice based on their data>"
    },
    {
      "priority": "medium",
      "title": "<Concise action title>",
      "description": "<Direct, actionable advice based on their data>"
    },
    {
      "priority": "low",
      "title": "<Concise action title>",
      "description": "<Direct, actionable advice based on their data>"
    }
  ]
}`;

    const sysInstruction = "You are an elite quantitative financial analyst. Return strictly valid raw JSON without code blocks, markdown asterisks, or formatting.";

    let report: any = null;

    try {
      const aiText = await generateAIResponse(prompt, sysInstruction);
      const cleanJson = aiText.replace(/```json/gi, "").replace(/```/gi, "").trim();
      report = JSON.parse(cleanJson);
    } catch (err) {
      console.warn("AI parse failed, utilizing computed fallback diagnosis:", err);
    }

    // High quality deterministic fallback if AI is slow or rate-limited
    if (!report || !report.healthScore) {
      let score = 70;
      if (savingsRatePct >= 30) score += 15;
      else if (savingsRatePct < 0) score -= 20;
      if (runwayMonths >= 3) score += 10;
      if (debtToLiquidityPct > 40) score -= 15;
      score = Math.max(30, Math.min(95, score));

      report = {
        healthScore: score,
        verdict: `You currently maintain a liquid reserve of $${totalLiquidity.toLocaleString()} across ${wallets.length} active wallets with a ${savingsRatePct}% savings rate. Your financial foundation is ${score > 75 ? "robust and healthy" : "moderately leveraged with room for optimization"}.`,
        strengths: [
          `Solid cash liquidity of $${totalLiquidity.toLocaleString()} across diversified accounts`,
          savingsRatePct > 0 ? `Positive net cash flow retaining ${savingsRatePct}% of monthly income` : "Active peer debt monitoring and tracking",
          totalLent > 0 ? `$${totalLent.toLocaleString()} in recoverable peer receivables` : "Low external personal liabilities"
        ],
        vulnerabilities: [
          totalBorrowed > 0 ? `Outstanding debt obligations of $${totalBorrowed.toLocaleString()} require scheduled repayment` : "Emergency reserve could be diversified into higher-yield savings",
          savingsRatePct <= 0 ? "Monthly burn rate currently exceeds or matches active income" : "Monitor high-frequency digital wallet transfers"
        ],
        metrics: {
          burnRate: monthlyBurn,
          runwayMonths,
          savingsRatePct,
          debtToLiquidityPct
        },
        recommendations: [
          {
            priority: totalBorrowed > 0 ? "high" : "medium",
            title: totalBorrowed > 0 ? "Settle High-Priority Peer Debt" : "Optimize Emergency Savings Reserve",
            description: totalBorrowed > 0 
              ? `Prioritize settling the $${totalBorrowed.toLocaleString()} owed to contacts to eliminate personal debt liabilities.`
              : `Allocate a portion of your liquid balance into a designated Emergency Savings wallet.`
          },
          {
            priority: "medium",
            title: "Rebalance Liquid Wallet Distribution",
            description: "Maintain 15-20% in mobile MFS for daily spending and keep primary reserves in your main bank account."
          },
          {
            priority: "low",
            title: "Track Cash-Flow Projections Weekly",
            description: "Use your AI assistant to log small daily expenses right from chat to maintain audit precision."
          }
        ]
      };
    }

    return NextResponse.json({ success: true, report }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      }
    });
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
