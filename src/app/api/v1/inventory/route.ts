import { NextRequest } from "next/server"
import { publicRoute } from "@/lib/platform/public-api/route"
import { listInventory } from "@/lib/platform/resources/inventory"

export const GET = (request: NextRequest) =>
  publicRoute("inventory:read", listInventory, { resource: "inventory" })(request)
