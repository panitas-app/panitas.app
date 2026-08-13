/**
 * Tests del servicio de Atención (FASE 8C).
 *
 * Cubren el ciclo de vida completo de los AttentionItem con un fake de la BD:
 * dedupe, resolución automática segura, reapertura de ocurrencias, dismiss
 * respetado, snooze, aislamiento multi-tenant y filtrado por preferencias.
 */
import { describe, expect, it, vi } from "vitest"
import { AttentionService } from "@/lib/attention/service"
import { AttentionPreferencesService } from "@/lib/attention/preferences"
import type { AttentionDataPort } from "@/lib/attention/queries"
import { makeFakeDb } from "./helpers"

const NOW = new Date("2026-08-10T12:00:00Z")

function makeDataPort(overrides: Partial<Record<keyof AttentionDataPort, unknown>> = {}) {
  const dataPort: AttentionDataPort = {
    fetchInventory: vi.fn().mockResolvedValue({ products: [], activeProductIds: [] }),
    fetchCredits: vi.fn().mockResolvedValue({ installments: [] }),
    fetchSuppliers: vi.fn().mockResolvedValue({ invoices: [] }),
    fetchOrders: vi.fn().mockResolvedValue({ orders: [] }),
    fetchConversations: vi.fn().mockResolvedValue({ conversations: [] }),
    fetchChannels: vi.fn().mockResolvedValue({ connections: [] }),
  }
  for (const [key, fn] of Object.entries(overrides)) {
    ;(dataPort as unknown as Record<string, unknown>)[key] = fn
  }
  return dataPort
}

function makeService(overrides: {
  db?: ReturnType<typeof makeFakeDb>
  dataPort?: AttentionDataPort
  onEvent?: ReturnType<typeof vi.fn>
  preferences?: AttentionPreferencesService
} = {}) {
  const db = overrides.db ?? makeFakeDb()
  const service = new AttentionService({
    db: db as never,
    dataPort: overrides.dataPort,
    preferences: overrides.preferences,
    onEvent: overrides.onEvent ?? vi.fn(),
  })
  return { service, db, onEvent: overrides.onEvent ?? vi.fn() }
}

const OUT_OF_STOCK_PRODUCT = {
  id: "p1",
  name: "Abrazadera",
  stock: 0,
  createdAt: new Date("2026-01-01T00:00:00Z"),
}

describe("AttentionService.sync (FASE 8C)", () => {
  it("escenario 1: producto agotado crea un item out_of_stock", async () => {
    const { service } = makeService({
      dataPort: makeDataPort({
        fetchInventory: vi.fn().mockResolvedValue({
          products: [OUT_OF_STOCK_PRODUCT],
          activeProductIds: [],
        }),
      }),
    })
    const result = await service.sync("store-1", NOW)
    expect(result.created).toBe(1)

    const items = await service.list("store-1", { status: "open" })
    expect(items).toHaveLength(1)
    expect(items[0].type).toBe("inventory.out_of_stock")
    expect(items[0].status).toBe("new")
    expect(items[0].action?.href).toContain("p1")
  })

  it("escenario 2: venta con stock normal NO genera alerta", async () => {
    const { service } = makeService({
      dataPort: makeDataPort({
        fetchInventory: vi.fn().mockResolvedValue({
          products: [{ id: "p2", name: "Tornillo", stock: 20, createdAt: new Date("2026-08-01T00:00:00Z") }],
          activeProductIds: ["p2"],
        }),
      }),
    })
    const result = await service.sync("store-1", NOW)
    expect(result.created).toBe(0)
    const items = await service.list("store-1", { status: "open" })
    expect(items).toHaveLength(0)
  })

  it("escenario 3: cuota vencida crea un item credit.overdue", async () => {
    const { service } = makeService({
      dataPort: makeDataPort({
        fetchCredits: vi.fn().mockResolvedValue({
          installments: [
            {
              id: "c1",
              number: 1,
              amount: 100,
              dueDate: new Date("2026-08-01T00:00:00Z"),
              status: "pending",
              orderId: "order-1",
              orderNumber: "O-001",
              customerName: "Ana",
            },
          ],
        }),
      }),
    })
    const result = await service.sync("store-1", NOW)
    expect(result.created).toBe(1)
    const items = await service.list("store-1", { type: "credit.overdue" })
    expect(items).toHaveLength(1)
  })

  it("escenario 4: pago de cuota resuelve el item automáticamente", async () => {
    const db = makeFakeDb()
    const dataPort = makeDataPort()
    const { service } = makeService({ db, dataPort })

    // Primero: cuota vencida → se crea el item.
    ;(dataPort.fetchCredits as ReturnType<typeof vi.fn>).mockResolvedValue({
      installments: [
        {
          id: "c1",
          number: 1,
          amount: 100,
          dueDate: new Date("2026-08-01T00:00:00Z"),
          status: "pending",
          orderId: "order-1",
          orderNumber: "O-001",
          customerName: "Ana",
        },
      ],
    })
    await service.sync("store-1", NOW)
    let items = await service.list("store-1", { status: "open" })
    expect(items).toHaveLength(1)

    // Después: la cuota está pagada → ya no existe la situación → resolved.
    ;(dataPort.fetchCredits as ReturnType<typeof vi.fn>).mockResolvedValue({ installments: [] })
    const result = await service.sync("store-1", NOW)
    expect(result.resolved).toBe(1)

    items = await service.list("store-1", { status: "resolved" })
    expect(items).toHaveLength(1)
    expect(items[0].resolvedAt).not.toBeNull()
  })

  it("escenario 5: 5 productos por agotarse se agrupan en UN grupo", async () => {
    const products = Array.from({ length: 5 }).map((_, i) => ({
      id: `p${i}`,
      name: `Producto ${i}`,
      stock: i + 1,
      createdAt: new Date("2026-08-01T00:00:00Z"),
    }))
    const { service } = makeService({
      dataPort: makeDataPort({
        fetchInventory: vi.fn().mockResolvedValue({ products, activeProductIds: [] }),
      }),
    })
    await service.sync("store-1", NOW)

    const groups = await service.group("store-1", {})
    const lowStock = groups.find((g) => g.type === "inventory.low_stock")
    expect(lowStock).toBeDefined()
    expect(lowStock!.count).toBe(5)
    expect(lowStock!.total).toBe(5)
    expect(lowStock!.label).toMatch(/productos/i)
  })

  it("escenario 6: una conversación pendiente genera UN item, no uno por mensaje", async () => {
    const { service } = makeService({
      dataPort: makeDataPort({
        fetchConversations: vi.fn().mockResolvedValue({
          conversations: [
            {
              id: "conv-1",
              title: "Pedido #1",
              status: "pendiente",
              priority: "medium",
              channelName: "WhatsApp",
              customerName: "Luisa",
              lastMessageAt: new Date("2026-08-10T00:00:00Z"),
              unreadCount: 3,
            },
          ],
        }),
      }),
    })
    await service.sync("store-1", NOW)
    const items = await service.list("store-1", { type: "conversation.pending" })
    expect(items).toHaveLength(1)

    // Un segundo sync no duplica mientras siga abierta.
    await service.sync("store-1", NOW)
    const again = await service.list("store-1", { type: "conversation.pending" })
    expect(again).toHaveLength(1)
  })

  it("escenario 7: conversación respondida se resuelve automáticamente", async () => {
    const db = makeFakeDb()
    const dataPort = makeDataPort()
    const { service } = makeService({ db, dataPort })

    ;(dataPort.fetchConversations as ReturnType<typeof vi.fn>).mockResolvedValue({
      conversations: [
        {
          id: "conv-1",
          title: "Pedido #1",
          status: "pendiente",
          priority: "medium",
          channelName: "WhatsApp",
          customerName: "Luisa",
          lastMessageAt: new Date("2026-08-10T00:00:00Z"),
          unreadCount: 1,
        },
      ],
    })
    await service.sync("store-1", NOW)

    ;(dataPort.fetchConversations as ReturnType<typeof vi.fn>).mockResolvedValue({
      conversations: [],
    })
    const result = await service.sync("store-1", NOW)
    expect(result.resolved).toBe(1)
    const resolved = await service.list("store-1", { status: "resolved" })
    expect(resolved).toHaveLength(1)
  })

  it("escenario 8: snooze oculta el item hasta la fecha elegida", async () => {
    const { service } = makeService({
      dataPort: makeDataPort({
        fetchInventory: vi.fn().mockResolvedValue({
          products: [OUT_OF_STOCK_PRODUCT],
          activeProductIds: [],
        }),
      }),
    })
    await service.sync("store-1", NOW)
    const items = await service.list("store-1", { status: "open" })
    expect(items).toHaveLength(1)

    const until = new Date("2026-08-11T12:00:00Z")
    const snoozed = await service.snooze("store-1", items[0].id, until)
    expect(snoozed!.status).toBe("snoozed")
    expect(snoozed!.snoozedUntil).toBe(until.toISOString())

    // Antes de la fecha sigue oculto en "pendientes" pero cuenta como abierto.
    const before = await service.list("store-1", { status: "new" })
    expect(before).toHaveLength(0)
    const open = await service.list("store-1", { status: "open" })
    expect(open).toHaveLength(1)

    // Cuando vence el snooze y la situación persiste, vuelve a new.
    await service.sync("store-1", new Date("2026-08-11T13:00:00Z"))
    const reopened = await service.list("store-1", { status: "new" })
    expect(reopened).toHaveLength(1)
  })
})

describe("Dedupe, dismiss y reapertura (FASE 8C)", () => {
  it("un item abierto impide duplicados mientras la situación persiste", async () => {
    const { service } = makeService({
      dataPort: makeDataPort({
        fetchInventory: vi.fn().mockResolvedValue({
          products: [OUT_OF_STOCK_PRODUCT],
          activeProductIds: [],
        }),
      }),
    })
    await service.sync("store-1", NOW)
    await service.sync("store-1", NOW)
    await service.sync("store-1", NOW)
    const items = await service.list("store-1", { status: "open" })
    expect(items).toHaveLength(1)
  })

  it("dismiss respeta la decisión del usuario mientras la situación persista", async () => {
    const db = makeFakeDb()
    const dataPort = makeDataPort()
    const { service } = makeService({ db, dataPort })

    ;(dataPort.fetchInventory as ReturnType<typeof vi.fn>).mockResolvedValue({
      products: [OUT_OF_STOCK_PRODUCT],
      activeProductIds: [],
    })
    await service.sync("store-1", NOW)
    const item = (await service.list("store-1", { status: "open" }))[0]

    const dismissed = await service.dismiss("store-1", item.id)
    expect(dismissed!.status).toBe("dismissed")

    // La situación sigue existiendo en los datos: el sync NO la recrea.
    const result = await service.sync("store-1", NOW)
    expect(result.created).toBe(0)
    const open = await service.list("store-1", { status: "open" })
    expect(open).toHaveLength(0)
    const dismissedItems = await service.list("store-1", { status: "dismissed" })
    expect(dismissedItems).toHaveLength(1)
  })

  it("resolved libera la key: nueva ocurrencia vuelve a crear el item", async () => {
    const db = makeFakeDb()
    const dataPort = makeDataPort()
    const { service } = makeService({ db, dataPort })

    // Ocurrencia 1: producto agotado → item.
    ;(dataPort.fetchInventory as ReturnType<typeof vi.fn>).mockResolvedValue({
      products: [OUT_OF_STOCK_PRODUCT],
      activeProductIds: [],
    })
    await service.sync("store-1", NOW)
    const item = (await service.list("store-1", { status: "open" }))[0]
    await service.resolve("store-1", item.id)

    // Ocurrencia 2: vuelve a agotarse → nuevo item.
    await service.sync("store-1", NOW)
    const open = await service.list("store-1", { status: "open" })
    expect(open).toHaveLength(1)
    expect(open[0].id).not.toBe(item.id)
  })

  it("resolución automática solo cuando la situación desaparece de los datos", async () => {
    const db = makeFakeDb()
    const dataPort = makeDataPort()
    const { service } = makeService({ db, dataPort })

    ;(dataPort.fetchInventory as ReturnType<typeof vi.fn>).mockResolvedValue({
      products: [OUT_OF_STOCK_PRODUCT],
      activeProductIds: [],
    })
    await service.sync("store-1", NOW)
    let open = await service.list("store-1", { status: "open" })
    expect(open).toHaveLength(1)

    // Mismo stock agotado: sigue abierto, no se resuelve por opinión.
    await service.sync("store-1", NOW)
    open = await service.list("store-1", { status: "open" })
    expect(open).toHaveLength(1)
    expect(open[0].status).toBe("new")
  })
})

describe("Multi-tenant y permisos (FASE 8C)", () => {
  it("aislamiento: los items de una tienda no son visibles en otra", async () => {
    const db = makeFakeDb()
    const dataPort = makeDataPort()
    const { service } = makeService({ db, dataPort })

    ;(dataPort.fetchInventory as ReturnType<typeof vi.fn>).mockResolvedValue({
      products: [OUT_OF_STOCK_PRODUCT],
      activeProductIds: [],
    })
    await service.sync("store-1", NOW)

    const other = await service.list("store-2", { status: "open" })
    expect(other).toHaveLength(0)

    // Las acciones de estado en otro tenant no afectan el item.
    const item = (await service.list("store-1", { status: "open" }))[0]
    const result = await service.resolve("store-2", item.id)
    expect(result).toBeNull()
    const stillOpen = await service.list("store-1", { status: "open" })
    expect(stillOpen).toHaveLength(1)
  })

  it("preferencias: tipos deshabilitados no generan items", async () => {
    const db = makeFakeDb()
    const prefs = new AttentionPreferencesService(db as never)
    const dataPort = makeDataPort({
      fetchInventory: vi.fn().mockResolvedValue({
        products: [OUT_OF_STOCK_PRODUCT],
        activeProductIds: [],
      }),
    })
    const { service } = makeService({ db, dataPort, preferences: prefs })

    // Deshabilitar inventario → no se crea out_of_stock.
    await prefs.update("store-1", { enabledTypes: ["credit.overdue", "credit.upcoming"] })
    const result = await service.sync("store-1", NOW)
    expect(result.created).toBe(0)
  })

  it("preferencias: prioridad mínima filtra situaciones de baja prioridad", async () => {
    const db = makeFakeDb()
    const prefs = new AttentionPreferencesService(db as never)
    const dataPort = makeDataPort({
      fetchInventory: vi.fn().mockResolvedValue({
        products: [OUT_OF_STOCK_PRODUCT, { id: "p2", name: "Tornillo", stock: 3, createdAt: new Date("2026-08-01T00:00:00Z") }],
        activeProductIds: [],
      }),
    })
    const { service } = makeService({ db, dataPort, preferences: prefs })

    // Mínimo "high": solo se crea out_of_stock (high), no low_stock (medium).
    await prefs.update("store-1", { minPriority: "high" })
    await service.sync("store-1", NOW)
    const items = await service.list("store-1", { status: "open" })
    expect(items).toHaveLength(1)
    expect(items[0].type).toBe("inventory.out_of_stock")
  })

  it("notifica eventos de dominio por cada item creado", async () => {
    const onEvent = vi.fn()
    const { service } = makeService({
      onEvent,
      dataPort: makeDataPort({
        fetchInventory: vi.fn().mockResolvedValue({
          products: [OUT_OF_STOCK_PRODUCT],
          activeProductIds: [],
        }),
      }),
    })
    await service.sync("store-1", NOW)
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "attention.item.created", storeId: "store-1", itemType: "inventory.out_of_stock" }),
    )
  })
})
