import { NextResponse } from "next/server"
import { getCurrentStore } from "@/lib/permissions"
import { getPaginationParams, paginatedResponse } from "@/lib/pagination"
import { CustomerService } from "@/services/customer.service"

const customerService = new CustomerService()

export async function GET(req: Request) {
  try {
    const current = await getCurrentStore()
    if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const { skip, take, page } = getPaginationParams(searchParams)
    const q = searchParams.get("q") || ""
    const sort = searchParams.get("sort") || "name"
    const order = searchParams.get("order") || "asc"

    const ctx = { storeId: current.store.id, userId: current.userId }
    const [list, metrics] = await Promise.all([
      customerService.list(ctx, { q, sort, order, skip, take }),
      customerService.metrics(ctx),
    ])

    return NextResponse.json({ ...paginatedResponse(list.customers, list.total, page, take), metrics })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
