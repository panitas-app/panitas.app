import { NextRequest } from "next/server"
import { publicRoute } from "@/lib/platform/public-api/route"
import { createProduct, listProducts } from "@/lib/platform/resources/products"

export const GET = (request: NextRequest) =>
  publicRoute("products:read", listProducts, { resource: "products" })(request)

export const POST = (request: NextRequest) =>
  publicRoute("products:write", createProduct, { resource: "products", idempotent: true })(request)
