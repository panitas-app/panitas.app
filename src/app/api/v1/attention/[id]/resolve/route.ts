import { NextRequest } from "next/server"
import { publicRoute } from "@/lib/platform/public-api/route"
import { resolveAttention } from "@/lib/platform/resources/attention"

export const POST = (request: NextRequest, ctx: { params: Promise<{ id: string }> }) =>
  publicRoute("attention:write", resolveAttention, { resource: "attention", idempotent: true })(request, ctx)
