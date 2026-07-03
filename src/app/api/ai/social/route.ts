import { NextRequest } from "next/server"
import { generateSocialPost, buildErrorResponse, buildSuccessResponse, getErrorMessage } from "@/lib/ai"
import type { SocialPlatform, SocialContentType } from "@/lib/ai"
import { auth } from "@/lib/auth"

const VALID_PLATFORMS: SocialPlatform[] = ["instagram", "facebook", "whatsapp", "tiktok"]
const VALID_CONTENT_TYPES: SocialContentType[] = ["promocion", "nuevo_producto", "oferta", "evento", "temporada"]

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return buildErrorResponse("No autorizado", 401)
    }

    const body = await req.json()
    const { businessName, platform, contentType, productName, description } = body

    if (!businessName || !platform || !contentType) {
      return buildErrorResponse("Faltan datos requeridos (businessName, platform, contentType)", 400)
    }

    if (!VALID_PLATFORMS.includes(platform)) {
      return buildErrorResponse(`Plataforma no válida. Usa: ${VALID_PLATFORMS.join(", ")}`, 400)
    }

    if (!VALID_CONTENT_TYPES.includes(contentType)) {
      return buildErrorResponse(`Tipo de contenido no válido. Usa: ${VALID_CONTENT_TYPES.join(", ")}`, 400)
    }

    const result = await generateSocialPost({
      businessName,
      platform,
      contentType,
      productName,
      description,
    })

    if (!result) {
      return buildErrorResponse("No pudimos generar la publicación en este momento. Inténtalo nuevamente.", 503)
    }

    return buildSuccessResponse(result)
  } catch (err) {
    console.error("[AI Social API Error]", err)
    return buildErrorResponse(getErrorMessage(err))
  }
}
