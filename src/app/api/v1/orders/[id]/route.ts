import { NextRequest } from "next/server"
import { publicRoute } from "@/lib/platform/public-api/route"
import { getOrder } from "@/lib/platform/resources/orders"

export const GET = (request: NextRequest, ctx: { params: Promise<{ id: string }> }) =>
  publicRoute("orders:read", getOrder, { resource: "orders" })(request, ctx)
