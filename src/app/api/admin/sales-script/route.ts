import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"

export async function GET(req: NextRequest) {
  try {
    const admin = await getLocalSuperadmin()
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const route = searchParams.get("route") || undefined

    const sectionWhere: Record<string, unknown> = {}
    if (route) sectionWhere.route = route

    const [sections, scoringRules, planRules] = await Promise.all([
      prisma.salesSection.findMany({
        where: sectionWhere,
        include: {
          questions: {
            where: { activo: true },
            orderBy: { orden: "asc" },
          },
        },
        orderBy: { orden: "asc" },
      }),
      prisma.salesScoringRule.findMany({
        orderBy: { createdAt: "desc" },
      }),
      prisma.salesPlanRecommendation.findMany({
        orderBy: { minPuntuacion: "asc" },
      }),
    ])

    return NextResponse.json({ sections, scoringRules, planRules })
  } catch (error) {
    console.error("[admin sales-script GET]", error)
    return NextResponse.json({ error: "Error al cargar guion" }, { status: 500 })
  }
}
