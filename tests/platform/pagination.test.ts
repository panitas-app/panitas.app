import { describe, expect, it } from "vitest"
import { ApiError } from "@/lib/platform/errors"
import { encodeCursor, parseCursor, parseLimit, parseSort, paginate } from "@/lib/platform/public-api/pagination"

describe("Paginación pública (FASE 8D)", () => {
  it("parseLimit usa defaults y topes", () => {
    expect(parseLimit(null)).toBe(20)
    expect(parseLimit("")).toBe(20)
    expect(parseLimit("5")).toBe(5)
    expect(parseLimit("500")).toBe(100)
    expect(() => parseLimit("0")).toThrow(ApiError)
    expect(() => parseLimit("-1")).toThrow(ApiError)
    expect(() => parseLimit("abc")).toThrow(ApiError)
  })

  it("cursor es opaco y round-trip", () => {
    expect(parseCursor(null)).toBe(1)
    expect(parseCursor("")).toBe(1)
    const encoded = encodeCursor(7)
    expect(parseCursor(encoded)).toBe(7)
    // El cursor NO es legible directamente.
    expect(encoded).not.toContain("7")
  })

  it("cursor inválido se rechaza", () => {
    expect(() => parseCursor("not-base64!!")).toThrow(ApiError)
    expect(() => parseCursor(encodeCursor(0))).toThrow(ApiError)
  })

  it("parseSort respeta whitelist y prefijo '-'", () => {
    const whitelist = ["createdAt", "name"] as const
    expect(parseSort(null, whitelist)).toBeNull()
    expect(parseSort("createdAt", whitelist)).toEqual({ field: "createdAt", direction: "asc" })
    expect(parseSort("-name", whitelist)).toEqual({ field: "name", direction: "desc" })
    expect(() => parseSort("id", whitelist)).toThrow(ApiError)
    expect(() => parseSort("-password", whitelist)).toThrow(ApiError)
  })

  it("paginate pide take+1 y expone nextCursor solo si hay más", async () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({ id: `p${i}` }))
    const result = await paginate({ limit: 20, cursor: null }, ({ skip, take }) => {
      return Promise.resolve(rows.slice(skip, skip + take))
    })

    expect(result.items).toHaveLength(20)
    expect(result.pagination.hasMore).toBe(true)
    expect(result.pagination.nextCursor).not.toBeNull()
  })

  it("paginate en la última página no tiene hasMore ni nextCursor", async () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({ id: `p${i}` }))
    const result = await paginate({ limit: 20, cursor: encodeCursor(2) }, ({ skip, take }) => {
      return Promise.resolve(rows.slice(skip, skip + take))
    })
    expect(result.items).toHaveLength(5)
    expect(result.pagination.hasMore).toBe(false)
    expect(result.pagination.nextCursor).toBeNull()
  })
})
