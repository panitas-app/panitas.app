import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { timingSafeEqual } from "crypto"

const COOKIE_NAME = "admin_token"

function constantTimeEquals(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8")
  const bBuf = Buffer.from(b, "utf8")
  if (aBuf.length !== bBuf.length) {
    // Still do a comparison to keep timing close
    timingSafeEqual(aBuf, aBuf)
    return false
  }
  return timingSafeEqual(aBuf, bBuf)
}

export function validateAdminSecret(secret: string): boolean {
  const expected = process.env.ADMIN_SECRET
  if (!expected) return false
  if (typeof secret !== "string" || secret.length === 0 || secret.length > 1024) return false
  return constantTimeEquals(secret, expected)
}

export async function getAdminToken(): Promise<string | undefined> {
  try {
    const store = await cookies()
    return store.get(COOKIE_NAME)?.value
  } catch {
    return undefined
  }
}

export async function getLocalSuperadmin() {
  const token = await getAdminToken()
  if (!token || !validateAdminSecret(token)) return null

  return prisma.user.findFirst({ where: { role: "superadmin" } })
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24
export function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  }
}
