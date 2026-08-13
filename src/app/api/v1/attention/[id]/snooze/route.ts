import { NextRequest } from "next/server"
import { publicRoute } from "@/lib/platform/public-api/route"
import { snoozeAttention } from "@/lib/platform/resources/attention"

export const POST = (request: NextRequest, ctx: { params: Promise<{ id: string }> }) =>
  publicRoute("attention:write", snoozeAttention, { resource: "attention", idempotent: true })(request, ctx)
