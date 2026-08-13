import { describe, expect, it } from "vitest"
import { WebhookService, generateWebhookSecret, parseEvents, DEAD_LETTER_FAILURE_THRESHOLD } from "@/lib/platform/webhooks/service"
import { makeFakeDb, makeSubscription } from "./helpers"

describe("WebhookService (FASE 8D)", () => {
  it("create valida nombre, endpoint (SSRF) y eventos", async () => {
    const db = makeFakeDb()
    const service = new WebhookService(db as never)

    await expect(service.create({ storeId: "s", name: "", endpoint: "https://8.8.8.8/hook", events: ["order.created"] })).rejects.toMatchObject({ code: "INVALID_REQUEST" })
    await expect(service.create({ storeId: "s", name: "X", endpoint: "http://localhost/hook", events: ["order.created"] })).rejects.toMatchObject({ code: "WEBHOOK_INVALID_ENDPOINT" })
    await expect(service.create({ storeId: "s", name: "X", endpoint: "https://8.8.8.8/hook", events: [] })).rejects.toMatchObject({ code: "INVALID_REQUEST" })
  })

  it("create persiste la suscripción y devuelve el secreto una vez", async () => {
    const db = makeFakeDb()
    const service = new WebhookService(db as never)
    const result = await service.create({
      storeId: "store-1",
      name: "Mi webhook",
      endpoint: "https://8.8.8.8/hook",
      events: ["order.created", "order.created"],
      createdBy: "user-1",
    })

    expect(result.secret).toMatch(/^[0-9a-f]{64}$/)
    expect(db._debug.subscriptions).toHaveLength(1)
    expect(db._debug.subscriptions[0].endpoint).toBe("https://8.8.8.8/hook")
    expect(db._debug.subscriptions[0].events).toContain("order.created")
    expect(db._debug.subscriptions[0].createdBy).toBe("user-1")
  })

  it("generateWebhookSecret produce 64 hex chars", () => {
    expect(generateWebhookSecret()).toMatch(/^[0-9a-f]{64}$/)
  })

  it("parseEvents deduplica y filtra no strings", () => {
    expect(parseEvents(JSON.stringify(["a", "a", "b", 1, null]))).toEqual(["a", "b"])
    expect(parseEvents("no-json")).toEqual([])
  })

  it("update valida endpoint y reactivar resetea failureCount", async () => {
    const sub = makeSubscription()
    const db = makeFakeDb({ subscriptions: [sub] })
    const service = new WebhookService(db as never)

    const paused = await service.update("sub-1", "store-1", { status: "paused" })
    expect(paused?.status).toBe("paused")

    await service.update("sub-1", "store-1", { status: "active" })
    expect(db._debug.subscriptions[0].status).toBe("active")
    expect(db._debug.subscriptions[0].failureCount).toBe(0)

    // Endpoint privado → rechazado con código SSRF.
    await expect(service.update("sub-1", "store-1", { endpoint: "http://169.254.169.254/" })).rejects.toMatchObject({ code: "WEBHOOK_INVALID_ENDPOINT" })
  })

  it("update no toca suscripciones de otra tienda", async () => {
    const db = makeFakeDb({ subscriptions: [makeSubscription()] })
    const service = new WebhookService(db as never)
    await expect(service.update("sub-1", "store-999", { status: "paused" })).resolves.toBeNull()
  })

  it("remove es scoped por tienda", async () => {
    const db = makeFakeDb({ subscriptions: [makeSubscription()] })
    const service = new WebhookService(db as never)
    expect(await service.remove("sub-1", "store-999")).toBe(false)
    expect(await service.remove("sub-1", "store-1")).toBe(true)
  })

  it("listDeliveries está acotado y scoped", async () => {
    const db = makeFakeDb({ subscriptions: [makeSubscription()] })
    const service = new WebhookService(db as never)
    await expect(service.listDeliveries("store-1", "sub-1", 999)).resolves.toEqual([])
  })

  it("markDeadLetter marca dead_letter al superar el umbral", async () => {
    const sub = makeSubscription({ failureCount: DEAD_LETTER_FAILURE_THRESHOLD - 1 })
    const db = makeFakeDb({ subscriptions: [sub] })
    const service = new WebhookService(db as never)

    await service.markDeadLetter("store-1", "sub-1")
    expect(db._debug.subscriptions[0].status).toBe("dead_letter")
  })

  it("markDeadLetter no marca bajo el umbral", async () => {
    const sub = makeSubscription({ failureCount: 1 })
    const db = makeFakeDb({ subscriptions: [sub] })
    const service = new WebhookService(db as never)

    await service.markDeadLetter("store-1", "sub-1")
    expect(db._debug.subscriptions[0].status).toBe("active")
  })
})
