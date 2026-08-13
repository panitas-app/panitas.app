import { NextRequest, NextResponse } from "next/server"
import { getCurrentStore } from "@/lib/permissions"
import { CreditService } from "@/services/credit.service"
import { isServiceError } from "@/services/errors"

const creditService = new CreditService()

export async function GET(request: NextRequest) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") || "all"
  const search = searchParams.get("search") || undefined
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined
  const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : undefined

  try {
    const result = await creditService.list(
      { storeId: current.store.id, userId: current.userId },
      { status, search, limit, page }
    )
    return NextResponse.json(result)
  } catch (error: unknown) {
    if (isServiceError(error)) return NextResponse.json({ error: error.message }, { status: error.status })
    const message = error instanceof Error ? error.message : "Error al cargar créditos"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
