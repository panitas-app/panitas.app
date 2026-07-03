import { NextRequest } from "next/server"
import { chatWithPana, buildErrorResponse, buildSuccessResponse, getErrorMessage } from "@/lib/ai"
import { auth } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return buildErrorResponse("No autorizado", 401)
    }

    const body = await req.json()
    const { message, businessName, storeType, context } = body

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return buildErrorResponse("El mensaje es requerido", 400)
    }

    if (!businessName) {
      return buildErrorResponse("El nombre del negocio es requerido", 400)
    }

    const result = await chatWithPana({
      message: message.trim(),
      businessName,
      storeType: storeType || "general",
      context: context || undefined,
    })

    if (!result) {
      return buildErrorResponse("Pana IA no pudo procesar tu mensaje en este momento. Inténtalo nuevamente.", 503)
    }

    return buildSuccessResponse(result)
  } catch (err) {
    console.error("[AI Chat API Error]", err)
    return buildErrorResponse(getErrorMessage(err))
  }
}
