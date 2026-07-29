import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { parseFile, mapRows, extractRawRows, type DetectedColumn } from "@/lib/import-engine"
import { resolvePlanType } from "@/lib/plans"
import { parseInventoryWithAI, getDailyUsage } from "@/lib/ai"

const PLAN_LIMITS: Record<string, number> = {
  comercio: 500,
  mayorista: -1,
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
        { error: "La importación de productos no está disponible en tu plan. Actualiza a Emprendedor o Mayorista." },
        { status: 403 }
      )
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const columnsJson = formData.get("columns") as string | null
    const mode = formData.get("mode") as string | null // "preview", "import", or "ai-parse"

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó archivo" }, { status: 400 })
    }

    // Validate file type
    const ext = file.name.toLowerCase().split(".").pop()
    if (!["xlsx", "xls", "csv"].includes(ext || "")) {
      return NextResponse.json({ error: "Formato no soportado. Use .xlsx, .xls o .csv" }, { status: 400 })
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "El archivo excede 5MB" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Mode: AI parse
    if (mode === "ai-parse") {
      const rawRows = extractRawRows(buffer, file.name)
      if (rawRows.length === 0) {
        return NextResponse.json({ error: "El archivo no contiene datos" }, { status: 400 })
      }
      const result = await parseInventoryWithAI(rawRows)
      return NextResponse.json({
        aiProducts: result.products,
        aiErrors: result.errors,
        aiUsage: getDailyUsage(),
      })
    }

    const preview = parseFile(buffer, file.name)

    if (preview.errors.length > 0) {
      return NextResponse.json({ error: preview.errors[0] }, { status: 400 })
    }

    if (preview.totalRows === 0) {
      return NextResponse.json({ error: "El archivo no contiene datos" }, { status: 400 })
    }

    // Mode 1: Preview (no columns mapping provided)
    if (!columnsJson) {
      // Count auto-mapped required fields
      const requiredMapped = preview.columns.filter(
        (c) => c.mappedField === "name" || c.mappedField === "price"
      ).length

      return NextResponse.json({
        columns: preview.columns,
        rows: preview.rows.slice(0, 10),
        totalRows: preview.totalRows,
        categories: preview.categories,
        headerRowIndex: preview.headerRowIndex,
        requiredFieldsMapped: requiredMapped,
        aiUsage: getDailyUsage(),
      })
    }

    // Mode 2: Import (columns mapping provided)
    const userColumns: DetectedColumn[] = JSON.parse(columnsJson)
    const { mapped, errors: mapErrors } = mapRows(preview.rows, userColumns)

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

    const toImport = mapped.slice(0, Math.min(mapped.length, remaining))
    const skipped = mapped.length - toImport.length

    // Auto-create categories from file
    const categoryMap: Record<string, string> = {}
    const fileCategories = [...new Set(toImport.map((r) => r.category).filter(Boolean))] as string[]

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
        // If category creation fails, skip it — products will go to uncategorized
      }
    }

    // Batch create (no transactions on Neon HTTP, but sequential inserts are fine)
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
            barcode: row.barcode,
            stock: row.stock,
            unidadBase: row.unidadBase,
            description: row.description,
            isActive: row.isActive,
            featured: row.featured,
            isWholesale: row.isWholesale,
            wholesalePrice: row.wholesalePrice,
            wholesaleLabel: row.wholesaleLabel,
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
      totalErrors: mapErrors.length + importErrors.length,
      errors: [...mapErrors, ...importErrors].slice(0, 50),
    })
  } catch (err) {
    console.error("[IMPORT ERROR]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
