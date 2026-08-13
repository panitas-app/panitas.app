import { describe, expect, it } from "vitest"
import {
  createSellerToken,
  verifySellerToken,
} from "@/lib/seller-auth"

describe("seller-auth (FASE 8E)", () => {
  it("crea y verifica un token válido", () => {
    const token = createSellerToken("seller-1", "store-1")
    const result = verifySellerToken(token)
    expect(result).toEqual({ sellerId: "seller-1", storeId: "store-1" })
  })

  it("rechaza un token manipulado (firma inválida)", () => {
    const token = createSellerToken("seller-1", "store-1")
    const tampered = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A")
    expect(verifySellerToken(tampered)).toBeNull()
  })

  it("rechaza tokens con formato inválido", () => {
    expect(verifySellerToken("")).toBeNull()
    expect(verifySellerToken("abc")).toBeNull()
    expect(verifySellerToken("not-base64url!")).toBeNull()
  })

  it("no verifica tokens de otra tienda en el payload (binding sellerId:storeId)", () => {
    const token = createSellerToken("seller-1", "store-1")
    const decoded = Buffer.from(token, "base64url").toString()
    const tampered = Buffer.from(decoded.replace("store-1", "store-999")).toString("base64url")
    expect(verifySellerToken(tampered)).toBeNull()
  })
})
