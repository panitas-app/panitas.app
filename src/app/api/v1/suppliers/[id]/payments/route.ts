import { NextRequest } from "next/server"
import { publicRoute } from "@/lib/platform/public-api/route"
import { registerSupplierPayment } from "@/lib/platform/resources/suppliers"

export const POST = (request: NextRequest, ctx: { params: Promise<{ id: string }> }) =>
  publicRoute("suppliers:write", registerSupplierPayment, { resource: "suppliers", idempotent: true })(request, ctx)
