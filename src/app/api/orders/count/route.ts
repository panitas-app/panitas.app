import { prisma } from "@/lib/prisma"
import { getCurrentStore } from "@/lib/permissions"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ total: 0 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const after = searchParams.get("after")

  const where: Record<string, unknown> = { storeId: current.store.id }
  if (status) where.status = status
  if (after) where.createdAt = { gt: new Date(after) }
  const excludePos = searchParams.get("excludePos") === "true"
  if (excludePos) where.posPin = false

  const total = await prisma.order.count({ where })
  if (status || after) {
    return NextResponse.json({ count: total })
  }
  return NextResponse.json({ total })
}
