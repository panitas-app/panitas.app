import { NextRequest } from "next/server"
import { generateAnalyticsInsights, buildErrorResponse, buildSuccessResponse, getErrorMessage } from "@/lib/ai"
import { auth } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return buildErrorResponse("No autorizado", 401)
    }

    const body = await req.json()
    const {
      businessName,
      period,
      totalSales,
      totalRevenue,
      topProducts,
      ordersByDay,
      orderStatusBreakdown,
      previousPeriodRevenue,
      previousPeriodSales,
      averageOrderValue,
    } = body

    if (!businessName) {
      return buildErrorResponse("El nombre del negocio es requerido", 400)
    }

    const result = await generateAnalyticsInsights({
      businessName,
      period: period || "hoy",
      totalSales: totalSales || 0,
      totalRevenue: totalRevenue || 0,
      topProducts: topProducts || [],
      ordersByDay: ordersByDay || {},
      orderStatusBreakdown: orderStatusBreakdown || {},
      previousPeriodRevenue: previousPeriodRevenue || 0,
      previousPeriodSales: previousPeriodSales || 0,
      averageOrderValue: averageOrderValue || 0,
    })

    if (!result) {
      return buildErrorResponse("No pudimos analizar los datos en este momento. Inténtalo nuevamente.", 503)
    }

    return buildSuccessResponse(result)
  } catch (err) {
    console.error("[AI Analytics API Error]", err)
    return buildErrorResponse(getErrorMessage(err))
  }
}
