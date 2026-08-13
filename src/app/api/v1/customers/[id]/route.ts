import { NextRequest } from "next/server"
import { publicRoute } from "@/lib/platform/public-api/route"
import { getCustomer } from "@/lib/platform/resources/customers"

export const GET = (request: NextRequest, ctx: { params: Promise<{ id: string }> }) =>
  publicRoute("customers:read", getCustomer, { resource: "customers" })(request, ctx)
