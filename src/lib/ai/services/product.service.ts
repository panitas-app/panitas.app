import { generateJson } from "@/lib/ai/gemini"
import { PRODUCT_COMPLETION_SCHEMA } from "@/lib/ai/schemas"
import { buildProductPrompt } from "@/lib/ai/prompts"

export interface ProductCompletionInput {
  productName: string
  category?: string
}

export interface ProductCompletionResult {
  description: string
  shortDescription: string
  benefits: string[]
  features: string[]
  seoKeywords: string[]
  metaDescription: string
  suggestedCategory: string
  tags: string[]
  commercialRecommendations: string[]
  sellingTips: string[]
  callToAction: string
}

export async function completeProduct(input: ProductCompletionInput): Promise<ProductCompletionResult | null> {
  const prompt = buildProductPrompt(input.productName, input.category)
  const result = await generateJson<ProductCompletionResult>(prompt, PRODUCT_COMPLETION_SCHEMA, {
    temperature: 0.8,
    maxOutputTokens: 4096,
  })
  if (result.success && result.data) {
    return result.data
  }
  console.error("[AI Product] Completado falló:", result.error)
  return null
}

export async function completeProductWithRetry(input: ProductCompletionInput, maxRetries = 1): Promise<ProductCompletionResult | null> {
  for (let i = 0; i <= maxRetries; i++) {
    const result = await completeProduct(input)
    if (result) return result
  }
  return null
}
