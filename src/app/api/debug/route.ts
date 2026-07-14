import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { neonConfig } from "@neondatabase/serverless"

export async function GET() {
  const results: Record<string, unknown> = {}

  // 1. Check env vars
  results.NEXTAUTH_URL = process.env.NEXTAUTH_URL
  results.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ? "✓" : "✗"
  results.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ? "✓" : "✗"
  results.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ? "✓" : "✗"
  results.ADMIN_SECRET = process.env.ADMIN_SECRET ? "✓" : "✗"
  results.NODE_ENV = process.env.NODE_ENV
  results.VERCEL = process.env.VERCEL

  // 2. Test DB connection
  try {
    const count = await prisma.user.count()
    results.db = `OK (${count} users)`
  } catch (e) {
    results.db = `FAIL: ${e instanceof Error ? e.message : "unknown error"}`
  }

  // 3. Test the auth route by checking if NextAuth config is valid
  try {
    const { auth } = await import("@/lib/auth")
    const session = await auth()
    results.auth = session ? "session exists" : "no session (expected for unauthenticated)"
  } catch (e) {
    results.auth = `FAIL: ${e instanceof Error ? e.message : "unknown error"}`
  }

  // 4. Test neonConfig
  results.neonWsConfigured = typeof neonConfig.webSocketConstructor !== "undefined" ? "✓" : "✗"

  return NextResponse.json(results)
}
