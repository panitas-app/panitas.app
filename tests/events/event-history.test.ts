import { describe, expect, it, vi } from "vitest"
import { InMemoryEventHistoryStore, buildEventHistoryRecord } from "@/lib/events"
import type { DispatchReport } from "@/lib/events"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/prisma"
import { PrismaEventHistoryStore, toAuditLogInput } from "@/lib/events/event-history/prisma"

const auditLog = prisma.auditLog as unknown as {
  create: ReturnType<typeof vi.fn>
  findMany: ReturnType<typeof vi.fn>
  count: ReturnType<typeof vi.fn>
}

function report(over: Partial<DispatchReport> = {}): DispatchReport {
  return {
    event: {
      id: "evt_1",
      type: "sale.created",
      data: { total: 100 },
      tenantId: "store-1",
      source: "test",
      occurredAt: "2026-01-01T00:00:00.000Z",
      aggregateId: "o1",
      aggregateType: "Order",
      actorId: "u1",
    },
    startedAt: "2026-01-01T00:00:01.000Z",
    durationMs: 3,
    results: [{ listenerId: "l1", eventType: "sale.created", ok: true, durationMs: 1, retries: 0 }],
    ok: true,
    attempts: 1,
    ...over,
  }
}

describe("InMemoryEventHistoryStore", () => {
  it("registra y lista por tenant con orden descendente", async () => {
    const store = new InMemoryEventHistoryStore()
    await store.record({ ...buildEventHistoryRecord(report()), dispatchedAt: "2026-01-01T00:00:02.000Z" })
    await store.record({ ...buildEventHistoryRecord(report()), dispatchedAt: "2026-01-01T00:00:03.000Z" })
    const all = await store.list()
    expect(all).toHaveLength(2)
    expect(all[0].dispatchedAt > all[1].dispatchedAt).toBe(true)
  })

  it("filtra por tenantId y eventType", async () => {
    const store = new InMemoryEventHistoryStore()
    await store.record({ ...buildEventHistoryRecord(report()), tenantId: "store-1", eventType: "sale.created" })
    await store.record({ ...buildEventHistoryRecord(report()), tenantId: "store-2", eventType: "sale.created" })
    await store.record({ ...buildEventHistoryRecord(report()), tenantId: "store-1", eventType: "product.created" })
    expect(await store.count()).toBe(3)
    expect(await store.count({ tenantId: "store-1" })).toBe(2)
    expect(await store.list({ tenantId: "store-1", eventType: "product.created" })).toHaveLength(1)
  })

  it("soporta limit y offset", async () => {
    const store = new InMemoryEventHistoryStore()
    for (let i = 0; i < 10; i++) {
      await store.record(buildEventHistoryRecord(report()))
    }
    const page = await store.list({ limit: 4, offset: 0 })
    expect(page).toHaveLength(4)
    const next = await store.list({ limit: 4, offset: 4 })
    expect(next).toHaveLength(4)
    expect(page[0].id).not.toBe(next[0].id)
  })

  it("recorta cuando supera el máximo", async () => {
    const store = new InMemoryEventHistoryStore()
    for (let i = 0; i < 10_100; i++) {
      await store.record(buildEventHistoryRecord(report()))
    }
    expect(await store.count()).toBeLessThanOrEqual(10_000)
  })
})

describe("buildEventHistoryRecord", () => {
  it("construye un registro de auditoría con resultado ok", () => {
    const record = buildEventHistoryRecord(report())
    expect(record.result).toBe("ok")
    expect(record.status).toBe("delivered")
    expect(record.eventType).toBe("sale.created")
    expect(record.category).toBe("sales")
    expect(record.tenantId).toBe("store-1")
    expect(record.actorId).toBe("u1")
    expect(record.durationMs).toBe(3)
    expect(record.listeners).toHaveLength(1)
  })

  it("marca error cuando algún listener falló", () => {
    const record = buildEventHistoryRecord(
      report({ results: [{ listenerId: "l1", eventType: "sale.created", ok: false, durationMs: 1, retries: 1, error: "boom" }] }),
    )
    expect(record.result).toBe("error")
    expect(record.status).toBe("failed")
  })

  it("marca rejected cuando el middleware cortó el flujo", () => {
    const record = buildEventHistoryRecord(report({ rejected: "rechazado por middleware" }))
    expect(record.result).toBe("rejected")
    expect(record.status).toBe("rejected")
    expect(record.error).toBe("rechazado por middleware")
  })
})

describe("toAuditLogInput", () => {
  it("mapea el registro al formato AuditLog", () => {
    const input = toAuditLogInput(buildEventHistoryRecord(report()))
    expect(input.action).toBe("event.sale.created")
    expect(input.entity).toBe("Event")
    expect(input.entityId).toBe("o1")
    expect(input.userId).toBe("u1")
    expect(input.storeId).toBe("store-1")
    expect(JSON.parse(input.metadata ?? "{}").status).toBe("delivered")
  })
})

describe("PrismaEventHistoryStore (AuditLog)", () => {
  it("persiste el registro en AuditLog", async () => {
    auditLog.create.mockResolvedValueOnce({})
    const store = new PrismaEventHistoryStore()
    await store.record(buildEventHistoryRecord(report()))
    expect(auditLog.create).toHaveBeenCalledTimes(1)
    expect(auditLog.create.mock.calls[0][0].data.action).toBe("event.sale.created")
  })

  it("no lanza si la escritura de auditoría falla", async () => {
    auditLog.create.mockRejectedValueOnce(new Error("db down"))
    const store = new PrismaEventHistoryStore()
    await expect(store.record(buildEventHistoryRecord(report()))).resolves.toBeUndefined()
  })

  it("recupera registros desde filas de AuditLog", async () => {
    auditLog.findMany.mockResolvedValueOnce([
      {
        id: "audit_1",
        action: "event.sale.created",
        entityId: "o1",
        metadata: JSON.stringify({ eventId: "evt_1", status: "delivered", result: "ok", source: "test", durationMs: 3 }),
        userId: "u1",
        storeId: "store-1",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ])
    const store = new PrismaEventHistoryStore()
    const rows = await store.list({ tenantId: "store-1", eventType: "sale.created" })
    expect(rows).toHaveLength(1)
    expect(rows[0].eventType).toBe("sale.created")
    expect(rows[0].tenantId).toBe("store-1")
    expect(rows[0].status).toBe("delivered")
  })

  it("cuenta registros filtrados por tenant", async () => {
    auditLog.count.mockResolvedValueOnce(3)
    const store = new PrismaEventHistoryStore()
    expect(await store.count({ tenantId: "store-1" })).toBe(3)
    expect(auditLog.count).toHaveBeenCalledWith({
      where: { action: { startsWith: "event." }, storeId: "store-1" },
    })
  })
})
