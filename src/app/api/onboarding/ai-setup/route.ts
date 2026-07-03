import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { generateOnboardingContent } from "@/lib/ai"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado" }, { status: 401 })
  }

  const body = await req.json()
  const { storeType, businessName, description, location } = body

  if (!storeType || !businessName) {
    return Response.json({ error: "Faltan datos requeridos" }, { status: 400 })
  }

  try {
    const result = await generateOnboardingContent({
      businessName,
      businessType: storeType,
      storeType,
      description,
      location,
    })

    if (!result) {
      return Response.json({ error: "No pudimos generar el contenido" }, { status: 503 })
    }

    const store = await prisma.store.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    })

    if (store) {
      const updateData: Record<string, unknown> = {
        description: result.longDescription,
        slogan: result.slogan,
        colors: result.recommendedColors,
      }

      if (result.suggestedSchedule && result.suggestedSchedule.length > 0) {
        updateData.hours = result.suggestedSchedule
      }

      await prisma.store.update({
        where: { id: store.id },
        data: updateData as any,
      })

      for (const catName of result.categories) {
        const existing = await prisma.category.findFirst({
          where: { storeId: store.id, name: catName },
        })
        if (!existing) {
          const slug = catName
            .toLowerCase()
            .replace(/[^a-záéíóúñ0-9\s]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
          await prisma.category.create({
            data: { storeId: store.id, name: catName, slug },
          })
        }
      }
    }

    const initials = businessName
      ?.split(" ")
      .slice(0, 2)
      .map((w: string) => w[0])
      .join("")
      .toUpperCase() || "PN"

    return Response.json({ ...result, logoInitials: initials })
  } catch (err) {
    console.error("[AI Setup Error]", err)
    return Response.json(
      { error: "Error generando contenido con IA" },
      { status: 500 }
    )
  }
}
