import { NextRequest } from "next/server"
import { publicRoute } from "@/lib/platform/public-api/route"
import { createOrder, listOrders } from "@/lib/platform/resources/orders"

export const GET = (request: NextRequest) =>
  publicRoute("orders:read", listOrders, { resource: "orders" })(request)

export const POST = (request: NextRequest) =>
  publicRoute("orders:write", createOrder, { resource: "orders", idempotent: true })(request)
