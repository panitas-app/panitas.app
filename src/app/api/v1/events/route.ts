import { NextRequest } from "next/server"
import { publicRoute } from "@/lib/platform/public-api/route"
import { listEventCatalog } from "@/lib/platform/resources/events"

export const GET = (request: NextRequest) =>
  publicRoute("events:read", listEventCatalog, { resource: "events" })(request)
