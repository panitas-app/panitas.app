import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"
import { seedSalesData } from "@/lib/crm/seed-data"

export async function POST(req: NextRequest) {
  try {
    const admin = await getLocalSuperadmin()
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    await prisma.$executeRawUnsafe(`DELETE FROM "SalesAnswer"`)
    await prisma.$executeRawUnsafe(`DELETE FROM "SalesQuestion"`)
    await prisma.$executeRawUnsafe(`DELETE FROM "SalesSection"`)
    await prisma.$executeRawUnsafe(`DELETE FROM "SalesScoringRule"`)
    await prisma.$executeRawUnsafe(`DELETE FROM "SalesPlanRecommendation"`)
    await prisma.$executeRawUnsafe(`DELETE FROM "SalesSession"`)

    const result = await seedSalesData(prisma)

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("[admin seed POST]", error)
    return NextResponse.json({ error: "Error al sembrar datos" }, { status: 500 })
  }
}
