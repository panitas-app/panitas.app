import { describe, expect, it, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { ok, created } from "@/lib/platform/public-api/response"
import { IDEMPOTENCY_REPLAY_HEADER } from "@/lib/platform/public-api/idempotency"
import { ApiError } from "@/lib/platform/errors"
import { makeFakeDb, makeStore, makeApiKeySecret, type FakeDb } from "./helpers"

const holder = vi.hoisted(() => ({ db: null as unknown as FakeDb }))

vi.mock("@/lib/prisma", () => ({ get prisma() { return holder.db } }))
vi.mock("@/lib/audit", () => ({ createAuditEntry: vi.fn(async () => undefined) }))

let route: typeof import("@/lib/platform/public-api/route")
const init = (async () => {
  holder.db = makeFakeDb()
  route = await import("@/lib/platform/public-api/route")
})()

function seed(store = makeStore({ plan: "mayorista", planType: "mayorista" }), key = makeApiKeySecret()) {
  const db = holder.db
  db._debug.stores.length = 0
  db._debug.apiKeys.length = 0
  db._debug.subscriptions.length = 0
  db._debug.deliveries.length = 0
  db._debug.idempotency.length = 0
  db._debug.stores.push(store)
  db._debug.apiKeys.push(key.row)
  return { store, key }
}

function req(path: string, opts: { method?: string; auth?: string; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = {}
  if (opts.auth) headers.authorization = `Bearer ${opts.auth}`
  Object.assign(headers, opts.headers ?? {})
  return new NextRequest(`http://localhost${path}`, { method: opts.method ?? "GET", headers })
}

const echo = (ctx: unknown, request: NextRequest, params: Record<string, string>) => {
  const requestId = (ctx as { requestId: string }).requestId
  return ok({ params, requestId }, { requestId })
}

beforeEach(async () => {
  await init
})

describe("Public API — pipeline de rutas (FASE 8D)", () => {
  it("401 sin Authorization", async () => {
    seed()
    const res = await route.publicRoute("products:read", echo)(req("/api/v1/products"))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe("INVALID_API_KEY")
    expect(body.error.message).toBeTruthy()
    expect(body.error.requestId).toBeTruthy()
    expect(body).not.toHaveProperty("stack")
  })

  it("200 con API key válida y tenant derivado de la key", async () => {
    const { key } = seed(
      makeStore({ id: "store-ok", plan: "mayorista", planType: "mayorista" }),
      makeApiKeySecret({ id: "key-ok", storeId: "store-ok" })
    )
    const res = await route.publicRoute("products:read", echo)(req("/api/v1/products", { auth: key.secret }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.params).toEqual({})
    expect(body.meta.requestId).toBeTruthy()
  })

  it("propaga el requestId del cliente si lo envía", async () => {
    const { key } = seed()
    const res = await route.publicRoute("products:read", echo)(
      req("/api/v1/products", { auth: key.secret, headers: { "X-Request-Id": "req-trace-1" } })
    )
    const body = await res.json()
    expect(body.meta.requestId).toBe("req-trace-1")
  })

  it("403 si la key no tiene el permiso", async () => {
    const { key } = seed(
      makeStore({ plan: "mayorista", planType: "mayorista" }),
      makeApiKeySecret({ permissions: JSON.stringify(["orders:read"]) })
    )
    const res = await route.publicRoute("products:read", echo)(req("/api/v1/products", { auth: key.secret }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error.code).toBe("INSUFFICIENT_PERMISSION")
  })

  it("403 PLAN_REQUIRED si el plan no incluye public_api", async () => {
    const { key } = seed(
      makeStore({ id: "store-base", plan: "comercio", planType: "comercio" }),
      makeApiKeySecret({ id: "key-base", storeId: "store-base" })
    )
    const res = await route.publicRoute("products:read", echo)(req("/api/v1/products", { auth: key.secret }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error.code).toBe("PLAN_REQUIRED")
  })

  it("feature gating por recurso pasa con plan Plus (attention)", async () => {
    const { key } = seed(undefined, makeApiKeySecret({ permissions: JSON.stringify(["attention:read"]) }))
    const res = await route.publicRoute("attention:read", echo, { resource: "attention" })(
      req("/api/v1/attention", { auth: key.secret })
    )
    expect(res.status).toBe(200)
  })

  it("errores de handler se mapean sin filtrar internals", async () => {
    const { key } = seed()
    const boom = async () => {
      throw new Error("DETALLE_SECRETO_INTERNO")
    }
    const res = await route.publicRoute("products:read", boom)(req("/api/v1/products", { auth: key.secret }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error.code).toBe("INTERNAL_ERROR")
    expect(body.error.message).toBe("Error interno de Panitas")
    expect(JSON.stringify(body)).not.toContain("DETALLE_SECRETO_INTERNO")
  })

  it("ApiError del handler conserva código y status", async () => {
    const { key } = seed()
    const rejected = async () => {
      throw new ApiError("INVALID_REQUEST", "campo inválido", 422)
    }
    const res = await route.publicRoute("products:read", rejected)(req("/api/v1/products", { auth: key.secret }))
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error.code).toBe("INVALID_REQUEST")
    expect(body.error.message).toBe("campo inválido")
  })

  it("idempotencia: segunda request con misma key no re-ejecuta el handler", async () => {
    const { key } = seed(undefined, makeApiKeySecret({ permissions: JSON.stringify(["orders:write"]) }))
    let calls = 0
    const createOrder = async () => {
      calls += 1
      return created({ id: "order-1" })
    }
    const routeFn = route.publicRoute("orders:write", createOrder, { idempotent: true })
    const first = await routeFn(req("/api/v1/orders", { method: "POST", auth: key.secret, headers: { "Idempotency-Key": "clave-unica-1" } }))
    expect(first.status).toBe(201)
    expect(await first.json()).toMatchObject({ data: { id: "order-1" } })

    const second = await routeFn(req("/api/v1/orders", { method: "POST", auth: key.secret, headers: { "Idempotency-Key": "clave-unica-1" } }))
    expect(second.status).toBe(201)
    expect(second.headers.get(IDEMPOTENCY_REPLAY_HEADER)).toBe("true")
    expect(await second.json()).toMatchObject({ data: { id: "order-1" } })
    expect(calls).toBe(1)
  })

  it("rechaza Idempotency-Key con formato inválido", async () => {
    const { key } = seed(undefined, makeApiKeySecret({ permissions: JSON.stringify(["orders:write"]) }))
    const noop = async () => created({ id: "x" })
    const res = await route.publicRoute("orders:write", noop, { idempotent: true })(
      req("/api/v1/orders", { method: "POST", auth: key.secret, headers: { "Idempotency-Key": "corta" } })
    )
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error.code).toBe("INVALID_REQUEST")
  })
})
