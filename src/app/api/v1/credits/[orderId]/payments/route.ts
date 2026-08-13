import { NextRequest } from "next/server"
import { publicRoute } from "@/lib/platform/public-api/route"
import { registerPayment } from "@/lib/platform/resources/credits"

export const POST = (request: NextRequest, ctx: { params: Promise<{ orderId: string }> }) =>
  publicRoute("credits:write", registerPayment, { resource: "credits", idempotent: true })(request, ctx)
