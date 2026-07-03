import { generateJson } from "@/lib/ai/gemini"
import { ANALYTICS_INSIGHTS_SCHEMA } from "@/lib/ai/schemas"
import { buildAnalyticsPrompt } from "@/lib/ai/prompts"

export interface AnalyticsInsightsInput {
  businessName: string
  period: string
  totalSales: number
  totalRevenue: number
  topProducts: { name: string; sold: number }[]
  ordersByDay: Record<string, number>
  orderStatusBreakdown: Record<string, number>
  previousPeriodRevenue: number
  previousPeriodSales: number
  averageOrderValue: number
}

export interface AnalyticsInsightsResult {
  summary: string
  highlights: string[]
  trends: { metric: string; change: string; direction: "up" | "down" | "stable"; insight: string }[]
  recommendations: string[]
  opportunities: string[]
  alertas: { type: "positive" | "negative" | "info"; message: string }[]
}

export async function generateAnalyticsInsights(input: AnalyticsInsightsInput): Promise<AnalyticsInsightsResult | null> {
  const prompt = buildAnalyticsPrompt(input)
  const result = await generateJson<AnalyticsInsightsResult>(prompt, ANALYTICS_INSIGHTS_SCHEMA, {
    temperature: 0.6,
    maxOutputTokens: 4096,
  })
  if (result.success && result.data) {
    return result.data
  }
  console.error("[AI Analytics] Insights falló:", result.error)
  return null
}
