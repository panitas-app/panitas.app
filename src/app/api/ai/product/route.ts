import { NextRequest } from "next/server"
import { completeProductWithRetry, buildErrorResponse, buildSuccessResponse, getErrorMessage } from "@/lib/ai"
import { auth } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return buildErrorResponse("No autorizado", 401)
    }

    const body = await req.json()
    const { productName, category } = body

    if (!productName || typeof productName !== "string" || productName.trim().length === 0) {
      return buildErrorResponse("El nombre del producto es requerido", 400)
    }

    const result = await completeProductWithRetry({ productName: productName.trim(), category })
    if (!result) {
      return buildErrorResponse("No pudimos generar el contenido del producto en este momento. Inténtalo nuevamente.", 503)
    }

    return buildSuccessResponse(result)
  } catch (err) {
    console.error("[AI Product API Error]", err)
    return buildErrorResponse(getErrorMessage(err))
  }
}
