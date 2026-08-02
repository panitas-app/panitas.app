import { describe, expect, it } from "vitest"
import { ServiceError, isServiceError, serviceError } from "@/services/errors"

describe("ServiceError", () => {
  it("creates a service error with message and status", () => {
    const err = new ServiceError("Not found", 404, "NOT_FOUND", { id: "x" })
    expect(err.message).toBe("Not found")
    expect(err.status).toBe(404)
    expect(err.code).toBe("NOT_FOUND")
    expect(err.details).toEqual({ id: "x" })
    expect(err).toBeInstanceOf(Error)
  })

  it("defaults status to 400 and omits optional fields", () => {
    const err = new ServiceError("Cuerpo inválido")
    expect(err.status).toBe(400)
    expect(err.code).toBeUndefined()
    expect(err.details).toBeUndefined()
  })
})

describe("serviceError helper", () => {
  it("returns a ServiceError instance", () => {
    const err = serviceError("Producto no encontrado", 404, "PRODUCT_NOT_FOUND")
    expect(err).toBeInstanceOf(ServiceError)
    expect(isServiceError(err)).toBe(true)
  })
})

describe("isServiceError", () => {
  it("returns true only for ServiceError instances", () => {
    expect(isServiceError(serviceError("x", 400))).toBe(true)
    expect(isServiceError(new Error("x"))).toBe(false)
    expect(isServiceError("string")).toBe(false)
    expect(isServiceError(undefined)).toBe(false)
    expect(isServiceError({ status: 500, message: "x" })).toBe(false)
  })
})
