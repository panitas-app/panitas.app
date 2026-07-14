import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { neonConfig } from "@neondatabase/serverless"
import { PrismaAdapter } from "@auth/prisma-adapter"

export async function GET() {
  const results: Record<string, unknown> = {}

  // 1. Check env vars
  results.NEXTAUTH_URL = process.env.NEXTAUTH_URL
  results.AUTH_URL = process.env.AUTH_URL
  results.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ? "✓" : "✗"
  results.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ? "✓" : "✗"
  results.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ? "✓" : "✗"
  results.ADMIN_SECRET = process.env.ADMIN_SECRET ? "✓" : "✗"
  results.NODE_ENV = process.env.NODE_ENV
  results.VERCEL = process.env.VERCEL
  results.AUTH_TRUST_HOST = process.env.AUTH_TRUST_HOST

  // 2. Test DB connection
  try {
    const count = await prisma.user.count()
    results.db = `OK (${count} users)`
  } catch (e) {
    results.db = `FAIL: ${e instanceof Error ? e.message : "unknown error"}`
  }

  // 3. Test the auth module
  try {
    const { auth } = await import("@/lib/auth")
    const session = await auth()
    results.auth = session ? "session exists" : "no session (expected for unauthenticated)"
  } catch (e) {
    results.auth = `FAIL: ${e instanceof Error ? e.message : "unknown error"}`
  }

  // 4. Test neonConfig
  results.neonWsConfigured = typeof neonConfig.webSocketConstructor !== "undefined" ? "✓" : "✗"

  // 5. Test adapter methods (same methods called during Google OAuth callback)
  try {
    const adapter = PrismaAdapter(prisma)
    const methods = ["createUser", "getUser", "getUserByEmail", "getUserByAccount", "updateUser", "linkAccount"]
    const available = methods.filter(m => typeof adapter[m as keyof typeof adapter] === "function")
    results.adapterMethods = `${available.length}/${methods.length} available: [${available.join(", ")}]`
  } catch (e) {
    results.adapterMethods = `FAIL: ${e instanceof Error ? e.message : "unknown error"}`
  }

  // 6. Test getUserByAccount (no-op: returns null for nonexistent account)
  try {
    const adapter = PrismaAdapter(prisma)
    const result = await adapter.getUserByAccount!({
      provider: "google",
      providerAccountId: "debug-test-nonexistent",
    })
    results.getUserByAccount = result === null ? "OK (null for nonexistent)" : "unexpected"
  } catch (e) {
    results.getUserByAccount = `FAIL: ${e instanceof Error ? e.message : "unknown error"}`
  }

  // 7. Test that NextAuth config loads and trustHost is set
  try {
    const NextAuth = (await import("next-auth")).default
    const googleProvider = (await import("next-auth/providers/google")).default
    const cfg = NextAuth({
      providers: [googleProvider({ clientId: "test", clientSecret: "test" })],
      secret: "test-secret",
      trustHost: true,
    })
    results.nextAuthConfig = typeof cfg.handlers === "object" ? "✓" : "FAIL"
  } catch (e) {
    results.nextAuthConfig = `FAIL: ${e instanceof Error ? e.message : "unknown error"}`
  }

  // 8. Test all Google OAuth callback adapter operations in sequence
  try {
    const adapter = PrismaAdapter(prisma)
    // Simulate getUserByAccount (step 1)
    const acct = await adapter.getUserByAccount!({
      provider: "google",
      providerAccountId: "debug-test-nonexistent",
    })
    // Simulate getUserByEmail (step 2)
    const userByEmail = await adapter.getUserByEmail!("debug@test.nonexistent")
    results.simulatedOAuthFlow = {
      getUserByAccount: acct === null ? "OK" : "unexpected",
      getUserByEmail: userByEmail === null ? "OK" : "unexpected",
    }
  } catch (e) {
    results.simulatedOAuthFlow = `FAIL: ${e instanceof Error ? e.message : "unknown error"}`
  }

  return NextResponse.json(results)
}
