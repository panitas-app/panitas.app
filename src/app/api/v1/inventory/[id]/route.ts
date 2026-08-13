import { NextRequest } from "next/server"
import { publicRoute } from "@/lib/platform/public-api/route"
import { adjustInventory, getInventoryItem } from "@/lib/platform/resources/inventory"

export const GET = (request: NextRequest, ctx: { params: Promise<{ id: string }> }) =>
  publicRoute("inventory:read", getInventoryItem, { resource: "inventory" })(request, ctx)

export const PATCH = (request: NextRequest, ctx: { params: Promise<{ id: string }> }) =>
  publicRoute("inventory:write", adjustInventory, { resource: "inventory", idempotent: true })(request, ctx)
