/**
 * Tests de las Tools de Atención para el agente (FASE 8C).
 *
 * Las tools SOLO leen AttentionItems generados por reglas: la IA explica y
 * resume, pero NUNCA crea, resuelve ni descarta alertas.
 */
import { describe, expect, it, vi } from "vitest"
import { createAttentionTools } from "@/lib/agent/tools/domains/attention"
import type { ToolExecutionContext } from "@/lib/agent/tools/types"

const CTX: ToolExecutionContext = {
  userId: "user-1",
  storeId: "store-1",
  permissions: ["report.read"],
}

describe("createAttentionTools (FASE 8C)", () => {
  it("expone attention.summary con permiso report.read", () => {
    const [summary, pending] = createAttentionTools()
    expect(summary.name).toBe("attention.summary")
    expect(summary.domain).toBe("attention")
    expect(summary.requiredPermissions).toContain("report.read")
    expect(pending.name).toBe("attention.getPending")
  })

  it("attention.summary resume las situaciones sin inventar nada", async () => {
    const service = {
      sync: vi.fn().mockResolvedValue({ created: 1 }),
      group: vi.fn().mockResolvedValue([
        {
          type: "inventory.out_of_stock",
          label: "Productos agotados",
          count: 1,
          total: 1,
          priority: "high",
          items: [
            {
              id: "item-1",
              type: "inventory.out_of_stock",
              priority: "high",
              status: "new",
              title: '"Abrazadera" agotado',
              description: "desc",
              recommendation: "recomendación",
              source: "detector",
              entityType: "product",
              entityId: "p1",
              action: { label: "Ver producto", href: "/dashboard/products?productId=p1" },
              metadata: {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              resolvedAt: null,
              snoozedUntil: null,
            },
          ],
        },
      ]),
      overview: vi.fn().mockResolvedValue({
        open: 1,
        critical: 0,
        high: 1,
        byStatus: { new: 1, acknowledged: 0, snoozed: 0, resolved: 0, dismissed: 0 },
        byPriority: { critical: 0, high: 1, medium: 0, low: 0 },
        byType: { "inventory.out_of_stock": 1 },
      }),
    } as never

    const [summary] = createAttentionTools({ attentionService: service })
    const response = await summary.execute(CTX, {})

    expect(response.success).toBe(true)
    const data = response.data as { total: number; situations: unknown[] }
    expect(data.total).toBe(1)
    expect(data.situations).toHaveLength(1)
    // La tool llama a sync (throttled) antes de leer.
    expect(service.sync).toHaveBeenCalledWith("store-1")
  })

  it("attention.getPending devuelve el detalle de las situaciones", async () => {
    const service = {
      sync: vi.fn().mockResolvedValue({ created: 0 }),
      list: vi.fn().mockResolvedValue([
        {
          id: "item-2",
          type: "credit.overdue",
          priority: "high",
          status: "new",
          title: "Cuota 1 de Ana vencida",
          description: "desc",
          recommendation: "Contacta al cliente",
          source: "detector",
          entityType: "installment",
          entityId: "c1",
          action: { label: "Ver crédito", href: "/dashboard/creditos?orderId=o1" },
          metadata: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          resolvedAt: null,
          snoozedUntil: null,
        },
      ]),
    } as never

    const [, pending] = createAttentionTools({ attentionService: service })
    const response = await pending.execute(CTX, { type: "credit.overdue", limit: 5 })

    expect(response.success).toBe(true)
    const data = response.data as { count: number; items: unknown[] }
    expect(data.count).toBe(1)
    expect(data.items[0]).toMatchObject({ type: "credit.overdue" })
    expect(service.list).toHaveBeenCalledWith(
      "store-1",
      expect.objectContaining({ status: "open", type: "credit.overdue", limit: 5 }),
    )
  })

  it("no existe tool de escritura: la IA no puede crear ni resolver alertas", () => {
    const tools = createAttentionTools()
    const names = tools.map((t) => t.name)
    expect(names).toContain("attention.summary")
    expect(names).toContain("attention.getPending")
    expect(names.some((n) => /create|resolve|dismiss|snooze|acknowledge/i.test(n))).toBe(false)
  })
})
