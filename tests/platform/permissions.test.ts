import { describe, expect, it } from "vitest"
import { ApiError, apiError, httpStatusToApiErrorCode } from "@/lib/platform/errors"
import {
  normalizePermissions,
  isPublicApiPermission,
  PUBLIC_API_PERMISSIONS,
  RESOURCE_FEATURE_MAP,
} from "@/lib/platform/permissions"

describe("Platform errors (FASE 8D)", () => {
  it("ApiError expone code, message y status", () => {
    const error = new ApiError("INVALID_API_KEY", "API key inválida", 401)
    expect(error.code).toBe("INVALID_API_KEY")
    expect(error.status).toBe(401)
    expect(error.message).toBe("API key inválida")
    expect(error).toBeInstanceOf(Error)
  })

  it("apiError es un helper de construcción", () => {
    const error = apiError("RESOURCE_NOT_FOUND", "No encontrado", 404)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(404)
  })

  it("httpStatusToApiErrorCode mapea códigos HTTP públicos sin exponer internos", () => {
    expect(httpStatusToApiErrorCode(401)).toBe("INVALID_API_KEY")
    expect(httpStatusToApiErrorCode(403)).toBe("INSUFFICIENT_PERMISSION")
    expect(httpStatusToApiErrorCode(404)).toBe("RESOURCE_NOT_FOUND")
    expect(httpStatusToApiErrorCode(409)).toBe("DUPLICATE_REQUEST")
    expect(httpStatusToApiErrorCode(422)).toBe("INVALID_REQUEST")
    expect(httpStatusToApiErrorCode(429)).toBe("RATE_LIMITED")
    expect(httpStatusToApiErrorCode(500)).toBe("INVALID_REQUEST")
    expect(httpStatusToApiErrorCode(302)).toBe("INVALID_REQUEST")
  })
})

describe("Platform permissions (FASE 8D)", () => {
  it("catálogo expone read y write para cada recurso", () => {
    for (const resource of ["products", "customers", "orders", "inventory", "credits", "suppliers", "conversations", "events", "attention"]) {
      expect(PUBLIC_API_PERMISSIONS).toContain(`${resource}:read`)
    }
    for (const resource of ["products", "customers", "orders", "inventory", "credits", "suppliers", "attention"]) {
      expect(PUBLIC_API_PERMISSIONS).toContain(`${resource}:write`)
    }
    // Solo lectura para eventos y conversaciones en v1.
    expect(PUBLIC_API_PERMISSIONS).not.toContain("events:write")
    expect(PUBLIC_API_PERMISSIONS).not.toContain("conversations:write")
  })

  it("isPublicApiPermission rechaza permisos inventados", () => {
    expect(isPublicApiPermission("products:read")).toBe(true)
    expect(isPublicApiPermission("products:delete")).toBe(false)
    expect(isPublicApiPermission("admin:read")).toBe(false)
    expect(isPublicApiPermission("products:READ")).toBe(false)
  })

  it("normalizePermissions filtra inválidos y deduplica", () => {
    const raw = ["products:read", "products:read", "products:delete", "orders:write", 42, null]
    expect(normalizePermissions(raw)).toEqual(["products:read", "orders:write"])
  })

  it("normalizePermissions rechaza entradas no array", () => {
    expect(normalizePermissions("products:read")).toEqual([])
    expect(normalizePermissions(undefined)).toEqual([])
    expect(normalizePermissions({})).toEqual([])
  })

  it("feature gating por recurso mapea conversaciones y attention", () => {
    expect(RESOURCE_FEATURE_MAP.conversations).toBe("unified_chat")
    expect(RESOURCE_FEATURE_MAP.attention).toBe("attention_center")
    expect(RESOURCE_FEATURE_MAP.products).toBeUndefined()
  })
})
