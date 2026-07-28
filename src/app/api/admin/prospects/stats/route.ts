import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"

export async function GET() {
  try {
    const admin = await getLocalSuperadmin()
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const [
      totalProspects,
      newThisMonth,
      visitsToday,
      pendingFollowUps,
      converted,
      lost,
      monthConverted,
      monthTotal,
      yearConverted,
      yearTotal,
      funnel,
      todayContacts,
    ] = await Promise.all([
      prisma.potentialClient.count(),
      prisma.potentialClient.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.potentialClientActivity.count({
        where: {
          tipo: "visita",
          fecha: { gte: startOfDay },
        },
      }),
      prisma.potentialClientReminder.count({
        where: {
          completado: false,
          fecha: { lte: now },
        },
      }),
      prisma.potentialClient.count({ where: { estadoProspecto: "ganado" } }),
      prisma.potentialClient.count({ where: { estadoProspecto: "perdido" } }),
      prisma.potentialClient.count({
        where: {
          estadoProspecto: "ganado",
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.potentialClient.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.potentialClient.count({
        where: {
          estadoProspecto: "ganado",
          createdAt: { gte: startOfYear },
        },
      }),
      prisma.potentialClient.count({ where: { createdAt: { gte: startOfYear } } }),
      prisma.potentialClient.groupBy({
        by: ["estadoProspecto"],
        _count: true,
      }),
      (async () => {
        const prospectsWithActivityToday = await prisma.potentialClient.findMany({
          where: {
            OR: [
              { activities: { some: { fecha: { gte: startOfDay } } } },
              { reminders: { some: { fecha: { gte: startOfDay } } } },
            ],
          },
          select: { id: true },
        })
        return prospectsWithActivityToday.length
      })(),
    ])

    return NextResponse.json({
      totalProspects,
      newThisMonth,
      visitsToday,
      pendingFollowUps,
      converted,
      lost,
      monthlyConversion: monthTotal > 0 ? Math.round((monthConverted / monthTotal) * 100) : 0,
      yearlyConversion: yearTotal > 0 ? Math.round((yearConverted / yearTotal) * 100) : 0,
      funnel: funnel.map((f) => ({ status: f.estadoProspecto, count: f._count })),
      todayContacts,
    })
  } catch (error) {
    console.error("[admin prospect stats GET]", error)
    return NextResponse.json({ error: "Error al cargar estadísticas" }, { status: 500 })
  }
}
