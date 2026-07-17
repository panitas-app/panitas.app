import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { parseFile, mapRows, type DetectedColumn, type MappedRow } from "@/lib/import-engine"
import { resolvePlanType } from "@/lib/plans"

const PLAN_LIMITS: Record<string, number> = {
  comercio: 200,
  mayorista: 500,
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
    const preview = parseFile(buffer, file.name)

    if (preview.errors.length > 0) {
      return NextResponse.json({ error: preview.errors[0] }, { status: 400 })
    }

    if (preview.totalRows === 0) {
      return NextResponse.json({ error: "El archivo no contiene datos" }, { status: 400 })
    }

    // Mode 1: Preview (no columns mapping provided)
    if (!columnsJson) {
      return NextResponse.json({
        columns: preview.columns,
        rows: preview.rows.slice(0, 10), // First 10 rows for preview
        totalRows: preview.totalRows,
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

    // Batch create (no transactions on Neon HTTP, but sequential inserts are fine)
    let created = 0
    const importErrors: string[] = []

    for (const row of toImport) {
      try {
        // Auto-generate SKU if missing
        const sku = row.sku || `${row.name.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, "X")}-${String(Math.floor(Math.random() * 9000) + 1000)}`

        await prisma.product.create({
          data: {
            name: row.name,
            price: row.price,
            costPrice: row.costPrice,
            sku,
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
      totalErrors: mapErrors.length + importErrors.length,
      errors: [...mapErrors, ...importErrors].slice(0, 50),
    })
  } catch (err) {
    console.error("[IMPORT ERROR]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
