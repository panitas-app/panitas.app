export const runtime = "nodejs"

import { type NextRequest } from "next/server"
import { handlers } from "@/lib/auth"

const originalGET = handlers.GET

export async function GET(req: NextRequest) {
  // Log PKCE debug info on OAuth callback
  const url = new URL(req.url)
  if (url.pathname.includes("/callback/")) {
    const cookieHeader = req.headers.get("cookie") || ""
    const cookieNames = cookieHeader
      .split(";")
      .map((c) => c.trim().split("=")[0])
      .filter(Boolean)
    const hasPkce = cookieNames.some((n) => n.includes("pkce"))
    console.log("[AUTH CALLBACK DEBUG]", JSON.stringify({
      pathname: url.pathname,
      host: req.headers.get("host"),
      xForwardedHost: req.headers.get("x-forwarded-host"),
      xForwardedProto: req.headers.get("x-forwarded-proto"),
      origin: req.headers.get("origin"),
      hasPkceCookie: hasPkce,
      cookieNames,
      timestamp: new Date().toISOString(),
    }))
  }
  return originalGET(req)
}

export const { POST } = handlers
