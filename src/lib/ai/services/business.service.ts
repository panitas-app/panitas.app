import { generateJson } from "@/lib/ai/gemini"
import { BUSINESS_ONBOARDING_SCHEMA, BUSINESS_IMPROVEMENT_SCHEMA, SEOSCHEMA, MARKETING_SCHEMA } from "@/lib/ai/schemas"
import { buildOnboardingPrompt, buildBusinessImprovementPrompt, buildSeoPrompt, buildMarketingPrompt } from "@/lib/ai/prompts"
export interface OnboardingInput {
  businessName: string
  businessType: string
  storeType: string
  description?: string
  location?: string
}

export interface OnboardingResult {
  shortDescription: string
  longDescription: string
  slogan: string
  categories: string[]
  suggestedServices: string[]
  tags: string[]
  suggestedSchedule: { day: string; open: string; close: string }[]
  recommendedColors: { primary: string; secondary: string }
  recommendations: string[]
}

export async function generateOnboardingContent(input: OnboardingInput): Promise<OnboardingResult | null> {
  const prompt = buildOnboardingPrompt(input)
  const result = await generateJson<OnboardingResult>(prompt, BUSINESS_ONBOARDING_SCHEMA, {
    temperature: 0.7,
    maxOutputTokens: 4096,
  })
  if (result.success && result.data) {
    return result.data
  }
  console.error("[AI Business] Onboarding falló:", result.error)
  return null
}

export interface BusinessImprovementInput {
  name: string
  description?: string
  slogan?: string
  categories?: string[]
  schedule?: string
  colors?: string
}

export interface BusinessImprovementResult {
  improvedDescription: string
  slogan: string
  suggestedCategories: string[]
  suggestedSchedule: { day: string; open: string; close: string }[]
  recommendedColors: { primary: string; secondary: string }
  profileTips: string[]
}

export async function improveBusiness(input: BusinessImprovementInput): Promise<BusinessImprovementResult | null> {
  const prompt = buildBusinessImprovementPrompt(input)
  const result = await generateJson<BusinessImprovementResult>(prompt, BUSINESS_IMPROVEMENT_SCHEMA, {
    temperature: 0.8,
    maxOutputTokens: 4096,
  })
  if (result.success && result.data) {
    return result.data
  }
  console.error("[AI Business] Mejora falló:", result.error)
  return null
}

export interface SeoInput {
  businessName: string
  description: string
  categories: string[]
  location?: string
}

export interface SeoResult {
  metaTitle: string
  metaDescription: string
  keywords: string[]
  suggestedSlug: string
  optimizedDescription: string
}

export async function generateSeo(input: SeoInput): Promise<SeoResult | null> {
  const prompt = buildSeoPrompt(input)
  const result = await generateJson<SeoResult>(prompt, SEOSCHEMA, {
    temperature: 0.6,
    maxOutputTokens: 2048,
  })
  if (result.success && result.data) {
    return result.data
  }
  console.error("[AI Business] SEO falló:", result.error)
  return null
}

export interface MarketingInput {
  businessName: string
  goal: "campana" | "descuento" | "promocion" | "ideas" | "copys" | "recuperacion" | "reinactivacion"
  description: string
  productName?: string
}

export interface MarketingResult {
  campaignName: string
  campaignDescription: string
  discountIdeas: string[]
  promotionalText: string
  targetAudience: string
  channels: string[]
  callToAction: string
  recoveryMessage: string
  inactiveClientMessage: string
}

export async function generateMarketing(input: MarketingInput): Promise<MarketingResult | null> {
  const prompt = buildMarketingPrompt(input)
  const result = await generateJson<MarketingResult>(prompt, MARKETING_SCHEMA, {
    temperature: 0.8,
    maxOutputTokens: 4096,
  })
  if (result.success && result.data) {
    return result.data
  }
  console.error("[AI Business] Marketing falló:", result.error)
  return null
}
