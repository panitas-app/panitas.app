import { NextRequest } from "next/server"
import { generateOnboardingContent, improveBusiness, generateSeo, generateMarketing, buildErrorResponse, buildSuccessResponse, getErrorMessage } from "@/lib/ai"
import { auth } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return buildErrorResponse("No autorizado", 401)
    }

    const body = await req.json()
    const { action } = body

    switch (action) {
      case "onboarding": {
        const { businessName, businessType, storeType, description, location } = body
        if (!businessName || !businessType || !storeType) {
          return buildErrorResponse("Faltan datos requeridos (businessName, businessType, storeType)", 400)
        }
        const result = await generateOnboardingContent({ businessName, businessType, storeType, description, location })
        if (!result) {
          return buildErrorResponse("No pudimos generar el contenido en este momento. Inténtalo nuevamente.", 503)
        }
        return buildSuccessResponse(result)
      }

      case "improve": {
        const { name, description, slogan, categories, schedule, colors } = body
        if (!name) {
          return buildErrorResponse("El nombre del negocio es requerido", 400)
        }
        const result = await improveBusiness({ name, description, slogan, categories, schedule, colors })
        if (!result) {
          return buildErrorResponse("No pudimos mejorar el negocio en este momento.", 503)
        }
        return buildSuccessResponse(result)
      }

      case "seo": {
        const { businessName, description, categories, location } = body
        if (!businessName || !description) {
          return buildErrorResponse("Faltan datos requeridos", 400)
        }
        const result = await generateSeo({ businessName, description, categories: categories || [], location })
        if (!result) {
          return buildErrorResponse("No pudimos generar el SEO en este momento.", 503)
        }
        return buildSuccessResponse(result)
      }

      case "marketing": {
        const { businessName, goal, description, productName } = body
        if (!businessName || !goal || !description) {
          return buildErrorResponse("Faltan datos requeridos", 400)
        }
        const result = await generateMarketing({ businessName, goal, description, productName })
        if (!result) {
          return buildErrorResponse("No pudimos generar la estrategia en este momento.", 503)
        }
        return buildSuccessResponse(result)
      }

      default:
        return buildErrorResponse(`Acción no válida: ${action}`, 400)
    }
  } catch (err) {
    console.error("[AI Business API Error]", err)
    return buildErrorResponse(getErrorMessage(err))
  }
}
