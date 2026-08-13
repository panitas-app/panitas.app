import { NextRequest } from "next/server"
import { publicRoute } from "@/lib/platform/public-api/route"
import { listConversations } from "@/lib/platform/resources/conversations"

export const GET = (request: NextRequest) =>
  publicRoute("conversations:read", listConversations, { resource: "conversations" })(request)
