import { NextRequest } from "next/server"
import { publicRoute } from "@/lib/platform/public-api/route"
import { getConversation } from "@/lib/platform/resources/conversations"

export const GET = (request: NextRequest, ctx: { params: Promise<{ id: string }> }) =>
  publicRoute("conversations:read", getConversation, { resource: "conversations" })(request, ctx)
