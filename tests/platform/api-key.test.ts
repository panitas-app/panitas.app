import { describe, expect, it } from "vitest"
import { ApiKeyService, generateApiKeySecret, API_KEY_PREFIX } from "@/lib/platform/api-key/service"
import { makeApiKeySecret, makeFakeDb, makeStore, sha256Hex } from "./helpers"

describe("API keys (FASE 8D)", () => {
  it("generateApiKeySecret produce secreto prefijado con hash y prefijo corto", () => {
    const { secret, keyPrefix, hashedSecret } = generateApiKeySecret()
    expect(secret.startsWith(API_KEY_PREFIX)).toBe(true)
    expect(secret.length).toBeGreaterThan(API_KEY_PREFIX.length + 40)
    expect(keyPrefix).toBe(secret.slice(0, 12))
    expect(hashedSecret).toBe(sha256Hex(secret))
    expect(hashedSecret).not.toContain(secret)
  })

  it("create persiste SOLO el hash, nunca el secreto", async () => {
    const db = makeFakeDb()
    const service = new ApiKeyService(db as never)
    const created = await service.create({
      storeId: "store-1",
      name: "Integración",
      permissions: ["products:read", "orders:write"],
      createdBy: "user-1",
    })

    expect(created.secret.startsWith(API_KEY_PREFIX)).toBe(true)
    expect(created.apiKey.keyPrefix).toBe(created.secret.slice(0, 12))
    expect(db._debug.apiKeys[0].hashedSecret).toBe(sha256Hex(created.secret))
    expect(db._debug.apiKeys[0].hashedSecret).not.toContain(created.secret.slice(API_KEY_PREFIX.length))
    expect(db._debug.apiKeys[0].permissions).toContain("products:read")
  })

  it("create valida nombre y al menos un permiso", async () => {
    const db = makeFakeDb()
    const service = new ApiKeyService(db as never)
    await expect(service.create({ storeId: "s", name: "", permissions: ["products:read"] })).rejects.toMatchObject({ code: "INVALID_REQUEST" })
    await expect(service.create({ storeId: "s", name: "X", permissions: [] })).rejects.toMatchObject({ code: "INVALID_REQUEST" })
  })

  it("validate resuelve la key por prefijo + hash (constante)", async () => {
    const { row, secret } = makeApiKeySecret()
    const db = makeFakeDb({ apiKeys: [row], stores: [makeStore()] })
    const service = new ApiKeyService(db as never)

    const { key, store } = await service.validate(secret)
    expect(key.id).toBe("key-1")
    expect(store.id).toBe("store-1")
  })

  it("validate rechaza secreto con prefijo correcto pero hash incorrecto", async () => {
    const { row, secret } = makeApiKeySecret()
    const db = makeFakeDb({ apiKeys: [row], stores: [makeStore()] })
    const service = new ApiKeyService(db as never)

    // Mismo prefijo, secreto distinto → mismo keyPrefix, hash no coincide.
    const tampered = `${API_KEY_PREFIX}${Buffer.from("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa").toString("base64url").slice(0, 43)}`
    await expect(service.validate(tampered)).rejects.toMatchObject({ code: "INVALID_API_KEY" })
    void secret
  })

  it("validate rechaza key revocada y expirada", async () => {
    const expired = makeApiKeySecret({ expiresAt: new Date(Date.now() - 60_000) })
    const revoked = makeApiKeySecret({ id: "key-2", status: "revoked", revokedAt: new Date() })
    const db = makeFakeDb({ apiKeys: [expired.row, revoked.row], stores: [makeStore()] })
    const service = new ApiKeyService(db as never)

    await expect(service.validate(expired.secret)).rejects.toMatchObject({ code: "API_KEY_EXPIRED" })
    await expect(service.validate(revoked.secret)).rejects.toMatchObject({ code: "API_KEY_REVOKED" })
  })

  it("validate rechaza secreto sin prefijo correcto", async () => {
    const db = makeFakeDb()
    const service = new ApiKeyService(db as never)
    await expect(service.validate("abc")).rejects.toMatchObject({ code: "INVALID_API_KEY" })
  })

  it("validate NO mezcla tenants: una key de otra tienda no autoriza", async () => {
    const { row, secret } = makeApiKeySecret({ storeId: "store-2", id: "key-other" })
    const db = makeFakeDb({ apiKeys: [row], stores: [makeStore({ id: "store-2" })] })
    const service = new ApiKeyService(db as never)

    const { store } = await service.validate(secret)
    expect(store.id).toBe("store-2")
  })

  it("revoke solo afecta keys activas de esa tienda", async () => {
    const { row, secret } = makeApiKeySecret()
    const db = makeFakeDb({ apiKeys: [row], stores: [makeStore()] })
    const service = new ApiKeyService(db as never)

    await service.revoke("key-1", "store-1")
    await expect(service.validate(secret)).rejects.toMatchObject({ code: "API_KEY_REVOKED" })

    // Revocar una key de otra tienda no la afecta.
    const { row: row2, secret: secret2 } = makeApiKeySecret({ id: "key-3" })
    const db2 = makeFakeDb({ apiKeys: [row2], stores: [makeStore()] })
    const service2 = new ApiKeyService(db2 as never)
    await service2.revoke("key-3", "store-999")
    await expect(service2.validate(secret2)).resolves.toBeDefined()
  })

  it("rotate conserva id y permisos y genera secreto nuevo", async () => {
    const { row, secret } = makeApiKeySecret()
    const db = makeFakeDb({ apiKeys: [row], stores: [makeStore()] })
    const service = new ApiKeyService(db as never)

    const rotated = await service.rotate("key-1", "store-1")
    expect(rotated).not.toBeNull()
    expect(rotated!.apiKey.id).toBe("key-1")
    expect(rotated!.secret).not.toBe(secret)

    // El secreto anterior deja de ser válido.
    await expect(service.validate(secret)).rejects.toMatchObject({ code: "INVALID_API_KEY" })
    await expect(service.validate(rotated!.secret)).resolves.toBeDefined()
  })

  it("rotate no rota keys de otra tienda", async () => {
    const { row } = makeApiKeySecret()
    const db = makeFakeDb({ apiKeys: [row], stores: [makeStore()] })
    const service = new ApiKeyService(db as never)
    await expect(service.rotate("key-1", "store-999")).resolves.toBeNull()
  })

  it("list devuelve metadata sin hashedSecret", async () => {
    const { row } = makeApiKeySecret()
    const db = makeFakeDb({ apiKeys: [row], stores: [makeStore()] })
    const service = new ApiKeyService(db as never)
    const keys = await service.list("store-1")
    expect(keys).toHaveLength(1)
    expect(keys[0]).not.toHaveProperty("hashedSecret")
    expect(keys[0].keyPrefix).toBe(row.keyPrefix)
  })
})
