import { NextRequest } from "next/server"
import { publicRoute } from "@/lib/platform/public-api/route"
import { getProduct, updateProduct } from "@/lib/platform/resources/products"

export const GET = (request: NextRequest, ctx: { params: Promise<{ id: string }> }) =>
  publicRoute("products:read", getProduct, { resource: "products" })(request, ctx)

export const PATCH = (request: NextRequest, ctx: { params: Promise<{ id: string }> }) =>
  publicRoute("products:write", updateProduct, { resource: "products", idempotent: true })(request, ctx)
