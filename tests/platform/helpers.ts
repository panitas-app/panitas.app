/**
 * Platform (FASE 8D) — fake in-memory de PrismaClient para tests.
 *
 * Implementa solo los modelos que usan los servicios de plataforma:
 * apiKey, apiIdempotency, webhookSubscription, webhookDelivery, extension, store.
 * No requiere conexión a BD.
 */
import { randomUUID } from "node:crypto"
import { sha256Hex } from "./crypto"

export interface ApiKeyRow {
  id: string
  storeId: string
  name: string
  keyPrefix: string
  hashedSecret: string
  permissions: string
  status: string
  lastUsedAt: Date | null
  expiresAt: Date | null
  revokedAt: Date | null
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
}

export interface WebhookSubscriptionRow {
  id: string
  storeId: string
  name: string
  endpoint: string
  events: string
  secret: string
  status: string
  failureCount: number
  lastDeliveryAt: Date | null
  lastDeliveryStatus: string | null
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
}

export interface WebhookDeliveryRow {
  id: string
  storeId: string
  subscriptionId: string
  eventId: string
  eventType: string
  status: string
  attempts: number
  lastAttemptAt: Date | null
  nextRetryAt: Date | null
  responseStatus: number | null
  responseBody: string | null
  error: string | null
  latencyMs: number | null
  payload: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ApiIdempotencyRow {
  id: string
  storeId: string
  apiKeyId: string | null
  key: string
  method: string
  path: string
  statusCode: number
  responseBody: string
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface StoreRow {
  id: string
  name: string
  plan: string
  planType: string
  email: string | null
  slug: string
}

function matches(where: Record<string, unknown> | undefined, row: Record<string, unknown>): boolean {
  if (!where) return true
  for (const [key, value] of Object.entries(where)) {
    if (key === "OR") {
      const clauses = value as Array<Record<string, unknown>>
      if (!clauses.some((c) => matches(c, row))) return false
      continue
    }
    if (key === "status" || key === "id" || key === "storeId" || key === "keyPrefix" || key === "eventId") {
      if (typeof value === "object" && value !== null && "in" in value) {
        if (!(value as { in: unknown[] }).in.includes(row[key])) return false
      } else if (row[key] !== value) return false
      continue
    }
    // Campos no soportados se ignoran (fail-safe).
  }
  return true
}

export function makeFakeDb(seed: {
  apiKeys?: ApiKeyRow[]
  stores?: StoreRow[]
  subscriptions?: WebhookSubscriptionRow[]
  deliveries?: WebhookDeliveryRow[]
  idempotency?: ApiIdempotencyRow[]
} = {}) {
  const apiKeys: ApiKeyRow[] = [...(seed.apiKeys ?? [])]
  const stores: StoreRow[] = [...(seed.stores ?? [])]
  const subscriptions: WebhookSubscriptionRow[] = [...(seed.subscriptions ?? [])]
  const deliveries: WebhookDeliveryRow[] = [...(seed.deliveries ?? [])]
  const idempotency: ApiIdempotencyRow[] = [...(seed.idempotency ?? [])]

  const apiKey = {
    create: viFn(async (args: { data: Partial<ApiKeyRow> }) => {
      const row: ApiKeyRow = {
        id: args.data.id ?? randomUUID(),
        storeId: args.data.storeId!,
        name: args.data.name ?? "",
        keyPrefix: args.data.keyPrefix!,
        hashedSecret: args.data.hashedSecret!,
        permissions: args.data.permissions ?? "[]",
        status: args.data.status ?? "active",
        lastUsedAt: null,
        expiresAt: args.data.expiresAt ?? null,
        revokedAt: null,
        createdBy: args.data.createdBy ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      apiKeys.push(row)
      return { ...row }
    }),
    findMany: viFn(async (args: { where?: Record<string, unknown>; include?: Record<string, boolean> }) => {
      const rows = apiKeys.filter((k) => matches(args.where, k as unknown as Record<string, unknown>))
      if (args.include?.store) {
        return rows.map((k) => ({ ...k, store: stores.find((s) => s.id === k.storeId) ?? null }))
      }
      return rows.map((k) => ({ ...k }))
    }),
    findFirst: viFn(async (args: { where?: Record<string, unknown> }) => {
      return apiKeys.find((k) => matches(args.where, k as unknown as Record<string, unknown>)) ?? null
    }),
    update: viFn(async (args: { where: { id: string }; data: Partial<ApiKeyRow> }) => {
      const row = apiKeys.find((k) => k.id === args.where.id)!
      Object.assign(row, args.data, { updatedAt: new Date() })
      return { ...row }
    }),
    updateMany: viFn(async (args: { where: Record<string, unknown>; data: Partial<ApiKeyRow> }) => {
      const rows = apiKeys.filter((k) => matches(args.where, k as unknown as Record<string, unknown>))
      for (const row of rows) Object.assign(row, args.data, { updatedAt: new Date() })
      return { count: rows.length }
    }),
  }

  const apiIdempotency = {
    findUnique: viFn(async (args: { where: { storeId_key: { storeId: string; key: string } } }) => {
      const row = idempotency.find(
        (r) => r.storeId === args.where.storeId_key.storeId && r.key === args.where.storeId_key.key
      )
      return row ? { ...row } : null
    }),
    create: viFn(async (args: { data: Partial<ApiIdempotencyRow> }) => {
      const row: ApiIdempotencyRow = {
        id: args.data.id ?? randomUUID(),
        storeId: args.data.storeId!,
        apiKeyId: args.data.apiKeyId ?? null,
        key: args.data.key!,
        method: args.data.method ?? "POST",
        path: args.data.path ?? "",
        statusCode: args.data.statusCode ?? 200,
        responseBody: args.data.responseBody ?? "{}",
        expiresAt: args.data.expiresAt ?? new Date(Date.now() + 86_400_000),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      idempotency.push(row)
      return { ...row }
    }),
    upsert: viFn(async (args: {
      where: { storeId_key: { storeId: string; key: string } }
      create: Partial<ApiIdempotencyRow>
      update: Record<string, unknown>
    }) => {
      const existing = idempotency.find(
        (r) => r.storeId === args.where.storeId_key.storeId && r.key === args.where.storeId_key.key
      )
      if (existing) {
        Object.assign(existing, args.update, { updatedAt: new Date() })
        return { ...existing }
      }
      const row: ApiIdempotencyRow = {
        id: randomUUID(),
        storeId: args.create.storeId ?? args.where.storeId_key.storeId,
        apiKeyId: args.create.apiKeyId ?? null,
        key: args.create.key ?? args.where.storeId_key.key,
        method: args.create.method ?? "POST",
        path: args.create.path ?? "",
        statusCode: args.create.statusCode ?? 200,
        responseBody: args.create.responseBody ?? "{}",
        expiresAt: args.create.expiresAt ?? new Date(Date.now() + 86_400_000),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      idempotency.push(row)
      return { ...row }
    }),
    delete: viFn(async (args: { where: { id: string } }) => {
      const idx = idempotency.findIndex((r) => r.id === args.where.id)
      if (idx >= 0) idempotency.splice(idx, 1)
      return {}
    }),
  }

  const webhookSubscription = {
    create: viFn(async (args: { data: Partial<WebhookSubscriptionRow> }) => {
      const row: WebhookSubscriptionRow = {
        id: args.data.id ?? randomUUID(),
        storeId: args.data.storeId!,
        name: args.data.name ?? "",
        endpoint: args.data.endpoint ?? "",
        events: args.data.events ?? "[]",
        secret: args.data.secret ?? "",
        status: args.data.status ?? "active",
        failureCount: args.data.failureCount ?? 0,
        lastDeliveryAt: null,
        lastDeliveryStatus: null,
        createdBy: args.data.createdBy ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      subscriptions.push(row)
      return { ...row }
    }),
    findMany: viFn(async (args: { where?: Record<string, unknown> }) => {
      return subscriptions.filter((s) => matches(args.where, s as unknown as Record<string, unknown>))
    }),
    findUnique: viFn(async (args: { where: { id: string } }) => {
      return subscriptions.find((s) => s.id === args.where.id) ?? null
    }),
    findFirst: viFn(async (args: { where?: Record<string, unknown> }) => {
      return subscriptions.find((s) => matches(args.where, s as unknown as Record<string, unknown>)) ?? null
    }),
    update: viFn(async (args: { where: { id: string }; data: Partial<WebhookSubscriptionRow> }) => {
      const row = subscriptions.find((s) => s.id === args.where.id)!
      Object.assign(row, args.data, { updatedAt: new Date() })
      return { ...row }
    }),
    deleteMany: viFn(async (args: { where: Record<string, unknown> }) => {
      const before = subscriptions.length
      const remaining = subscriptions.filter((s) => !matches(args.where, s as unknown as Record<string, unknown>))
      subscriptions.length = 0
      subscriptions.push(...remaining)
      return { count: before - remaining.length }
    }),
  }

  const webhookDelivery = {
    create: viFn(async (args: { data: Partial<WebhookDeliveryRow> }) => {
      const row: WebhookDeliveryRow = {
        id: args.data.id ?? randomUUID(),
        storeId: args.data.storeId!,
        subscriptionId: args.data.subscriptionId!,
        eventId: args.data.eventId!,
        eventType: args.data.eventType ?? "",
        status: args.data.status ?? "pending",
        attempts: args.data.attempts ?? 0,
        lastAttemptAt: null,
        nextRetryAt: null,
        responseStatus: null,
        responseBody: null,
        error: null,
        latencyMs: null,
        payload: args.data.payload ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      deliveries.push(row)
      return { ...row }
    }),
    findUnique: viFn(async (args: { where: { subscriptionId_eventId: { subscriptionId: string; eventId: string } } }) => {
      const row = deliveries.find(
        (d) => d.subscriptionId === args.where.subscriptionId_eventId.subscriptionId && d.eventId === args.where.subscriptionId_eventId.eventId
      )
      return row ? { ...row } : null
    }),
    findFirst: viFn(async (args: { where?: Record<string, unknown> }) => {
      return deliveries.find((d) => matches(args.where, d as unknown as Record<string, unknown>)) ?? null
    }),
    findMany: viFn(async (args: { where?: Record<string, unknown> }) => {
      return deliveries.filter((d) => matches(args.where, d as unknown as Record<string, unknown>))
    }),
    update: viFn(async (args: { where: { id: string }; data: Partial<WebhookDeliveryRow> }) => {
      const row = deliveries.find((d) => d.id === args.where.id)!
      Object.assign(row, args.data, { updatedAt: new Date() })
      return { ...row }
    }),
  }

  const store = {
    findMany: viFn(async () => stores.map((s) => ({ ...s }))),
    findUnique: viFn(async (args: { where: { id: string } }) => stores.find((s) => s.id === args.where.id) ?? null),
  }

  const extension = {
    create: viFn(async (args: { data: Record<string, unknown> }) => ({ id: randomUUID(), ...args.data })),
    findMany: viFn(async () => []),
    findUnique: viFn(async () => null),
    updateMany: viFn(async () => ({ count: 0 })),
    deleteMany: viFn(async () => ({ count: 0 })),
  }

  return {
    apiKey,
    apiIdempotency,
    webhookSubscription,
    webhookDelivery,
    store,
    extension,
    _debug: { apiKeys, stores, subscriptions, deliveries, idempotency },
  }
}

function viFn<T extends (...args: never[]) => unknown>(fn: T): T & { mock: { calls: unknown[][]; results: unknown[] } } {
  const calls: unknown[][] = []
  const results: unknown[] = []
  const wrapped = async (...args: Parameters<T>) => {
    calls.push(args)
    const result = await (fn as unknown as (...a: Parameters<T>) => ReturnType<T>)(...args)
    results.push(result)
    return result
  }
  return Object.assign(wrapped, { mock: { calls, results } }) as never
}

export { sha256Hex }
export type FakeDb = ReturnType<typeof makeFakeDb>

export function makeStore(over: Partial<StoreRow> = {}): StoreRow {
  return { id: "store-1", name: "Mi Tienda", plan: "mayorista", planType: "tienda", email: null, slug: "mi-tienda", ...over }
}

export function makeApiKeySecret(over: Partial<ApiKeyRow> = {}): { row: ApiKeyRow; secret: string } {
  const secret = `pk_live_${Buffer.from(randomUUID().replaceAll("-", ""), "hex").toString("base64url").slice(0, 32)}`
  return {
    row: {
      id: "key-1",
      storeId: "store-1",
      name: "Test",
      keyPrefix: secret.slice(0, 12),
      hashedSecret: sha256Hex(secret),
      permissions: JSON.stringify(["products:read"]),
      status: "active",
      lastUsedAt: null,
      expiresAt: null,
      revokedAt: null,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...over,
    },
    secret,
  }
}

export function makeSubscription(over: Partial<WebhookSubscriptionRow> = {}): WebhookSubscriptionRow {
  return {
    id: "sub-1",
    storeId: "store-1",
    name: "Mi webhook",
    endpoint: "https://8.8.8.8/hook",
    events: JSON.stringify(["order.created"]),
    secret: "0123456789abcdef0123456789abcdef",
    status: "active",
    failureCount: 0,
    lastDeliveryAt: null,
    lastDeliveryStatus: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }
}
