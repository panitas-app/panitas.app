import crypto from "crypto"
import { cookies } from "next/headers"

const SELLER_SECRET = process.env.SELLER_JWT_SECRET || process.env.NEXTAUTH_SECRET || "seller-default-secret"
const COOKIE_NAME = "seller_token"

export function createSellerToken(sellerId: string, storeId: string): string {
  const payload = `${sellerId}:${storeId}:${Date.now()}`
  const hmac = crypto.createHmac("sha256", SELLER_SECRET).update(payload).digest("hex")
  return Buffer.from(`${payload}:${hmac}`).toString("base64url")
}

export function verifySellerToken(token: string): { sellerId: string; storeId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString()
    const sepIndex = decoded.lastIndexOf(":")
    if (sepIndex < 0) return null
    const hmac = decoded.slice(sepIndex + 1)
    const payload = decoded.slice(0, sepIndex)
    const expected = crypto.createHmac("sha256", SELLER_SECRET).update(payload).digest("hex")
    if (hmac !== expected) return null
    const parts = payload.split(":")
    return { sellerId: parts[0], storeId: parts[1] }
  } catch {
    return null
  }
}

export async function getSellerFromCookies(): Promise<{ sellerId: string; storeId: string } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySellerToken(token)
}

export function setSellerCookie(token: string) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
}
