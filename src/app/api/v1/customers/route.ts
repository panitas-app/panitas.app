import { NextRequest } from "next/server"
import { publicRoute } from "@/lib/platform/public-api/route"
import { createCustomer, listCustomers } from "@/lib/platform/resources/customers"

export const GET = (request: NextRequest) =>
  publicRoute("customers:read", listCustomers, { resource: "customers" })(request)

export const POST = (request: NextRequest) =>
  publicRoute("customers:write", createCustomer, { resource: "customers", idempotent: true })(request)
