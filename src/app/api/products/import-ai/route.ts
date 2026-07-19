import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolvePlanType } from "@/lib/plans"

const PLAN_LIMITS: Record<string, number> = {
  comercio: 500,
  mayorista: -1,
}

interface AIProduct {
  name: string
  price: number
  costPrice: number | null
  stock: number
  sku: string | null
  description: string | null
  category: string | null
  unidadBase: string
  isActive: boolean
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const member = await prisma.storeMember.findFirst({
      where: { userId: session.user.id },
      select: { store: { select: { id: true, planType: true } } },
    })
    const store = member?.store ?? await prisma.store.findUnique({
      where: { userId: session.user.id },
      select: { id: true, planType: true },
    })

    if (!store) {
      return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 })
    }

    const resolvedPlan = resolvePlanType(store.planType || "comercio")
    if (resolvedPlan !== "comercio" && resolvedPlan !== "mayorista") {
      return NextResponse.json(
        { error: "La importación de productos no está disponible en tu plan." },
        { status: 403 }
      )
    }

    const formData = await req.formData()
    const aiProductsJson = formData.get("aiProducts") as string | null

    if (!aiProductsJson) {
      return NextResponse.json({ error: "No se proporcionaron productos" }, { status: 400 })
    }

    const aiProducts: AIProduct[] = JSON.parse(aiProductsJson)

    // Check product limit
    const currentCount = await prisma.product.count({ where: { storeId: store.id } })
    const planLimit = PLAN_LIMITS[resolvedPlan] ?? 200
    const remaining = planLimit === -1 ? Infinity : planLimit - currentCount

    if (remaining <= 0) {
      return NextResponse.json(
        { error: `Límite de productos alcanzado (${planLimit}). Mejora tu plan para importar más.` },
        { status: 403 }
      )
    }

    const toImport = aiProducts.slice(0, Math.min(aiProducts.length, remaining))
    const skipped = aiProducts.length - toImport.length

    // Auto-create categories
    const categoryMap: Record<string, string> = {}
    const fileCategories = [...new Set(toImport.map((p) => p.category).filter(Boolean))] as string[]

    for (const catName of fileCategories) {
      try {
        const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
        const existing = await prisma.category.findFirst({
          where: { storeId: store.id, name: { equals: catName, mode: "insensitive" } },
        })
        if (existing) {
          categoryMap[catName] = existing.id
        } else {
          const created = await prisma.category.create({
            data: { name: catName, slug, storeId: store.id },
          })
          categoryMap[catName] = created.id
        }
      } catch {
        // Skip — products will be uncategorized
      }
    }

    let created = 0
    const importErrors: string[] = []

    for (const row of toImport) {
      try {
        const sku = row.sku || `${row.name.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, "X")}-${String(Math.floor(Math.random() * 9000) + 1000)}`
        const categoryId = row.category ? (categoryMap[row.category] ?? null) : null

        await prisma.product.create({
          data: {
            name: row.name,
            price: row.price,
            costPrice: row.costPrice,
            sku,
            stock: row.stock,
            unidadBase: row.unidadBase || "Unidad",
            description: row.description,
            isActive: row.isActive ?? true,
            featured: false,
            isWholesale: false,
            wholesalePrice: null,
            wholesaleLabel: null,
            images: "[]",
            wholesaleScales: "[]",
            sizes: "[]",
            storeId: store.id,
            ...(categoryId ? { categoryId } : {}),
          },
        })
        created++
      } catch (err) {
        importErrors.push(`Error al crear "${row.name}": ${err instanceof Error ? err.message : "Error desconocido"}`)
      }
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      categoriesCreated: Object.keys(categoryMap).length,
      errors: importErrors.slice(0, 50),
    })
  } catch (err) {
    console.error("[IMPORT-AI ERROR]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
