import { generateJson } from "@/lib/ai/gemini"
import { CHAT_RESPONSE_SCHEMA } from "@/lib/ai/schemas"
import { buildChatPrompt } from "@/lib/ai/prompts"

export interface ChatInput {
  businessName: string
  storeType: string
  message: string
  context?: {
    totalProducts?: number
    totalOrders?: number
    totalRevenue?: number
    recentActivity?: string
  }
}

export interface ChatResult {
  answer: string
  suggestions: string[]
  actions?: { label: string; type: "link" | "button"; url?: string }[]
}

export async function chatWithPana(input: ChatInput): Promise<ChatResult | null> {
  const prompt = buildChatPrompt(input)
  const result = await generateJson<ChatResult>(prompt, CHAT_RESPONSE_SCHEMA, {
    temperature: 0.8,
    maxOutputTokens: 2048,
  })
  if (result.success && result.data) {
    return result.data
  }
  console.error("[AI Chat] Respuesta falló:", result.error)
  return null
}

export async function chatWithRetry(input: ChatInput, maxRetries = 1): Promise<ChatResult | null> {
  for (let i = 0; i <= maxRetries; i++) {
    const result = await chatWithPana(input)
    if (result) return result
  }
  return null
}
