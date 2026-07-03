import { generateJson } from "@/lib/ai/gemini"
import { SOCIAL_POST_SCHEMA } from "@/lib/ai/schemas"
import { buildSocialPrompt } from "@/lib/ai/prompts"

export type SocialPlatform = "instagram" | "facebook" | "whatsapp" | "tiktok"
export type SocialContentType = "promocion" | "nuevo_producto" | "oferta" | "evento" | "temporada"

export interface SocialPostInput {
  businessName: string
  platform: SocialPlatform
  contentType: SocialContentType
  productName?: string
  description?: string
}

export interface SocialPostResult {
  instagram: { text: string; hashtags: string[]; callToAction: string; emojis: string[] }
  facebook: { text: string; hashtags: string[]; callToAction: string; emojis: string[] }
  whatsapp: { message: string; callToAction: string; emojis: string[] }
  tiktok: { script: string; hashtags: string[]; trendingSound: string | null }
}

export async function generateSocialPost(input: SocialPostInput): Promise<SocialPostResult | null> {
  const prompt = buildSocialPrompt(input)
  const result = await generateJson<SocialPostResult>(prompt, SOCIAL_POST_SCHEMA, {
    temperature: 0.9,
    maxOutputTokens: 4096,
  })
  if (result.success && result.data) {
    return result.data
  }
  console.error("[AI Social] Generación falló:", result.error)
  return null
}

export async function generateSocialPostForPlatform(
  input: SocialPostInput,
  platform: SocialPlatform
): Promise<SocialPostResult[SocialPlatform] | null> {
  const full = await generateSocialPost(input)
  if (!full) return null
  return full[platform]
}
