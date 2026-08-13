import { NextRequest } from "next/server"
import { publicRoute } from "@/lib/platform/public-api/route"
import { createSupplier, listSuppliers } from "@/lib/platform/resources/suppliers"

export const GET = (request: NextRequest) =>
  publicRoute("suppliers:read", listSuppliers, { resource: "suppliers" })(request)

export const POST = (request: NextRequest) =>
  publicRoute("suppliers:write", createSupplier, { resource: "suppliers", idempotent: true })(request)
