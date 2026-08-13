import { NextRequest } from "next/server"
import { publicRoute } from "@/lib/platform/public-api/route"
import { listAttention } from "@/lib/platform/resources/attention"

export const GET = (request: NextRequest) =>
  publicRoute("attention:read", listAttention, { resource: "attention" })(request)
