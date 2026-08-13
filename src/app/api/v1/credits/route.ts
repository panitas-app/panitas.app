import { NextRequest } from "next/server"
import { publicRoute } from "@/lib/platform/public-api/route"
import { listCredits } from "@/lib/platform/resources/credits"

export const GET = (request: NextRequest) =>
  publicRoute("credits:read", listCredits, { resource: "credits" })(request)
