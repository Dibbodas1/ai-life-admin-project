import { DriveAppData, Insight } from "../types";
import { generateAIResponse } from "./gemini";

// In-memory simplistic insight generation for Drive
export async function generateAllInsights(data: DriveAppData): Promise<Insight[]> {
  const insights: Insight[] = [];

  // Look for unused subscriptions
  const activeSubs = data.subscriptions.filter(s => s.status === "active");
  const lowUsageSubs = activeSubs.filter(s => s.usageLevel === "none" || s.usageLevel === "low");
  if (lowUsageSubs.length > 0) {
    const totalWasted = lowUsageSubs.reduce((s, sub) => s + sub.amount, 0);
    insights.push({
      _id: crypto.randomUUID(),
      userId: "demo_user_alex",
      type: "subscription_warning",
      title: "Underutilized Subscriptions Detected",
      description: `You are paying for ${lowUsageSubs.length} subscriptions with little to no usage. Cancelling them could save you $${totalWasted}/month.`,
      severity: "high",
      actionable: true,
      relatedEntities: lowUsageSubs.map(s => ({ model: "Subscription", id: s._id })),
      createdAt: new Date()
    });
  }

  // Use Gemini to generate qualitative insights
  if (data.expenses.length > 0) {
    const prompt = `Analyze this user's top expenses and provide ONE profound financial insight.
    Expenses: ${JSON.stringify(data.expenses.slice(0, 50).map(e => ({ cat: e.category, amt: e.amount, date: e.date })))}
    Respond ONLY with the insight description text, no markdown.`;
    
    try {
      const aiInsight = await generateAIResponse(prompt);
      insights.push({
        _id: crypto.randomUUID(),
        userId: "demo_user_alex",
        type: "general_advice",
        title: "AI Spending Analysis",
        description: aiInsight,
        severity: "low",
        actionable: false,
        relatedEntities: [],
        createdAt: new Date()
      });
    } catch (e) {
      console.error(e);
    }
  }

  return insights;
}
