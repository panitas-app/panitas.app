import { NextRequest } from "next/server"
import { publicRoute } from "@/lib/platform/public-api/route"
import { getAttentionItem } from "@/lib/platform/resources/attention"

export const GET = (request: NextRequest, ctx: { params: Promise<{ id: string }> }) =>
  publicRoute("attention:read", getAttentionItem, { resource: "attention" })(request, ctx)
