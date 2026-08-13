import { NextRequest } from "next/server"
import { publicRoute } from "@/lib/platform/public-api/route"
import { getSupplier, updateSupplier } from "@/lib/platform/resources/suppliers"

export const GET = (request: NextRequest, ctx: { params: Promise<{ id: string }> }) =>
  publicRoute("suppliers:read", getSupplier, { resource: "suppliers" })(request, ctx)

export const PATCH = (request: NextRequest, ctx: { params: Promise<{ id: string }> }) =>
  publicRoute("suppliers:write", updateSupplier, { resource: "suppliers", idempotent: true })(request, ctx)
