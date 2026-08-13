import { NextRequest } from "next/server"
import { publicRoute } from "@/lib/platform/public-api/route"
import { getCredit } from "@/lib/platform/resources/credits"

export const GET = (request: NextRequest, ctx: { params: Promise<{ orderId: string }> }) =>
  publicRoute("credits:read", getCredit, { resource: "credits" })(request, ctx)
