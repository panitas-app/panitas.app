import { NextResponse } from "next/server"

/**
 * Temporary diagnostic endpoint to verify PKCE cookie configuration.
 * DELETE THIS after confirming Google OAuth works correctly.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const cookieHeader = req.headers.get("cookie") || ""
  const cookieNames = cookieHeader
    .split(";")
    .map((c) => c.trim().split("=")[0])
    .filter(Boolean)

  const hasPkce = cookieNames.some((n) => n.includes("pkce"))
  const hasState = cookieNames.some((n) => n.includes("state"))
  const hasSession = cookieNames.some((n) => n.includes("session"))

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    request: {
      host: req.headers.get("host"),
      xForwardedHost: req.headers.get("x-forwarded-host"),
      xForwardedProto: req.headers.get("x-forwarded-proto"),
      origin: req.headers.get("origin"),
      referer: req.headers.get("referer"),
      userAgent: req.headers.get("user-agent")?.substring(0, 100),
      urlOrigin: url.origin,
      urlProtocol: url.protocol,
    },
    cookies: {
      total: cookieNames.length,
      names: cookieNames,
      hasPkceCookie: hasPkce,
      hasStateCookie: hasState,
      hasSessionCookie: hasSession,
    },
    env: {
      hasAuthSecret: !!process.env.AUTH_SECRET,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      authUrl: process.env.AUTH_URL || null,
      nextAuthUrl: process.env.NEXTAUTH_URL || null,
      isVercel: !!process.env.VERCEL,
      vercelUrl: process.env.VERCEL_URL || null,
      nodeEnv: process.env.NODE_ENV,
    },
  })
}
