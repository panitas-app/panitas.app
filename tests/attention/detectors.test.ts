/**
 * Tests de los detectors de Atención (FASE 8C).
 *
 * Los detectors son funciones puras sobre datos tipados: no tocan BD ni
 * emiten eventos. Cada regla es determinista y se deriva de datos reales.
 */
import { describe, expect, it } from "vitest"
import { detectInventory } from "@/lib/attention/detectors/inventory"
import { detectCredits } from "@/lib/attention/detectors/credits"
import { detectSuppliers } from "@/lib/attention/detectors/suppliers"
import { detectOrders } from "@/lib/attention/detectors/orders"
import { detectConversations } from "@/lib/attention/detectors/conversations"
import { detectChannels } from "@/lib/attention/detectors/channels"

const NOW = new Date("2026-08-10T12:00:00Z")

describe("detectInventory (FASE 8C)", () => {
  it("producto agotado genera out_of_stock (alta) y excluye por agotarse", () => {
    const situations = detectInventory(
      {
        products: [
          { id: "p1", name: "Abrazadera", stock: 0, createdAt: new Date("2026-01-01") },
          { id: "p2", name: "Tornillo", stock: 2, createdAt: new Date("2026-01-01") },
          { id: "p3", name: "Nuevo", stock: 10, createdAt: NOW },
        ],
        activeProductIds: [],
      },
      NOW,
    )

    const out = situations.filter((s) => s.type === "inventory.out_of_stock")
    const low = situations.filter((s) => s.type === "inventory.low_stock")
    const noMovement = situations.filter((s) => s.type === "inventory.no_movement")

    expect(out).toHaveLength(1)
    expect(out[0].priority).toBe("high")
    expect(out[0].entityId).toBe("p1")

    expect(low).toHaveLength(1)
    expect(low[0].priority).toBe("medium")
    expect(low[0].entityId).toBe("p2")
    expect(low[0].title).toMatch(/por agotarse/)

    // p3 tiene stock y fue creado recientemente: sin movimiento no aplica.
    expect(noMovement).toHaveLength(0)
  })

  it("producto viejo sin movimientos genera no_movement (baja)", () => {
    const old = new Date("2026-01-01T00:00:00Z")
    const situations = detectInventory(
      {
        products: [{ id: "p9", name: "Viejo", stock: 50, createdAt: old }],
        activeProductIds: [],
      },
      NOW,
    )
    expect(situations).toHaveLength(1)
    expect(situations[0].type).toBe("inventory.no_movement")
    expect(situations[0].priority).toBe("low")
  })

  it("producto viejo con movimiento reciente NO genera no_movement", () => {
    const old = new Date("2026-01-01T00:00:00Z")
    const situations = detectInventory(
      {
        products: [{ id: "p9", name: "Activo", stock: 50, createdAt: old }],
        activeProductIds: ["p9"],
      },
      NOW,
    )
    expect(situations).toHaveLength(0)
  })
})

describe("detectCredits (FASE 8C)", () => {
  const base = {
    number: 1,
    amount: 100,
    status: "pending",
    orderId: "order-1",
    orderNumber: "O-001",
    customerName: "Ana",
  }

  it("cuota vencida genera credit.overdue (alta)", () => {
    const situations = detectCredits(
      {
        installments: [
          { ...base, id: "c1", dueDate: new Date("2026-08-01T00:00:00Z") },
        ],
      },
      NOW,
    )
    expect(situations).toHaveLength(1)
    expect(situations[0].type).toBe("credit.overdue")
    expect(situations[0].priority).toBe("high")
    expect(situations[0].entityId).toBe("c1")
  })

  it("cuota por vencer (dentro de 3 días) genera credit.upcoming (media)", () => {
    const situations = detectCredits(
      {
        installments: [
          { ...base, id: "c2", dueDate: new Date("2026-08-12T00:00:00Z") },
        ],
      },
      NOW,
    )
    expect(situations).toHaveLength(1)
    expect(situations[0].type).toBe("credit.upcoming")
    expect(situations[0].priority).toBe("medium")
  })

  it("cuota lejana NO genera item", () => {
    const situations = detectCredits(
      {
        installments: [
          { ...base, id: "c3", dueDate: new Date("2026-12-01T00:00:00Z") },
        ],
      },
      NOW,
    )
    expect(situations).toHaveLength(0)
  })
})

describe("detectSuppliers (FASE 8C)", () => {
  const base = {
    number: "F-100",
    description: "Mercancía",
    amount: 500,
    paidAmount: 0,
    status: "pending",
    supplierName: "Distribuidora X",
  }

  it("factura vencida con saldo genera supplier.overdue (alta)", () => {
    const situations = detectSuppliers(
      {
        invoices: [{ ...base, id: "s1", dueDate: new Date("2026-07-01T00:00:00Z") }],
      },
      NOW,
    )
    expect(situations).toHaveLength(1)
    expect(situations[0].type).toBe("supplier.overdue")
    expect(situations[0].priority).toBe("high")
  })

  it("factura con saldo pendiente (futura/sin vencimiento) genera pending_balance (media)", () => {
    const future = detectSuppliers(
      { invoices: [{ ...base, id: "s2", dueDate: new Date("2026-09-01T00:00:00Z") }] },
      NOW,
    )
    const noDate = detectSuppliers(
      { invoices: [{ ...base, id: "s3", dueDate: null }] },
      NOW,
    )
    expect(future[0].type).toBe("supplier.pending_balance")
    expect(noDate[0].type).toBe("supplier.pending_balance")
    expect(future[0].priority).toBe("medium")
  })

  it("factura pagada en su totalidad NO genera item", () => {
    const situations = detectSuppliers(
      {
        invoices: [
          { ...base, id: "s4", paidAmount: 500, dueDate: new Date("2026-07-01T00:00:00Z") },
        ],
      },
      NOW,
    )
    expect(situations).toHaveLength(0)
  })
})

describe("detectOrders (FASE 8C)", () => {
  const base = {
    orderNumber: "P-100",
    status: "confirmed",
    paymentStatus: "paid",
    posPin: false,
    customerName: "Carlos",
  }

  it("pedido en flujo sin avance > 48h genera order.delayed", () => {
    const situations = detectOrders(
      {
        orders: [
          {
            ...base,
            id: "o1",
            createdAt: new Date("2026-08-01T00:00:00Z"),
            updatedAt: new Date("2026-08-06T00:00:00Z"),
          },
        ],
      },
      NOW,
    )
    expect(situations).toHaveLength(1)
    expect(situations[0].type).toBe("order.delayed")
    expect(situations[0].priority).toBe("medium")
  })

  it("pedido enviado retrasado usa días de envío (5 días)", () => {
    const situations = detectOrders(
      {
        orders: [
          {
            ...base,
            id: "o2",
            status: "shipped",
            createdAt: new Date("2026-08-01T00:00:00Z"),
            updatedAt: new Date("2026-08-04T00:00:00Z"),
          },
        ],
      },
      NOW,
    )
    expect(situations).toHaveLength(1)
    expect(situations[0].type).toBe("order.delayed")
  })

  it("pedido pendiente sin confirmar > 24h genera order.pending (baja)", () => {
    const situations = detectOrders(
      {
        orders: [
          {
            ...base,
            id: "o3",
            status: "pending",
            paymentStatus: "pending",
            createdAt: new Date("2026-08-08T00:00:00Z"),
            updatedAt: new Date("2026-08-08T00:00:00Z"),
          },
        ],
      },
      NOW,
    )
    expect(situations).toHaveLength(1)
    expect(situations[0].type).toBe("order.pending")
    expect(situations[0].priority).toBe("low")
  })

  it("pedido POS NO genera item", () => {
    const situations = detectOrders(
      {
        orders: [
          {
            ...base,
            id: "o4",
            posPin: true,
            status: "pending",
            paymentStatus: "pending",
            createdAt: new Date("2026-08-01T00:00:00Z"),
            updatedAt: new Date("2026-08-01T00:00:00Z"),
          },
        ],
      },
      NOW,
    )
    expect(situations).toHaveLength(0)
  })

  it("pedido entregado o reciente NO genera item", () => {
    const situations = detectOrders(
      {
        orders: [
          {
            ...base,
            id: "o5",
            status: "delivered",
            updatedAt: new Date("2026-08-06T00:00:00Z"),
            createdAt: new Date("2026-08-01T00:00:00Z"),
          },
          {
            ...base,
            id: "o6",
            status: "confirmed",
            updatedAt: new Date("2026-08-10T06:00:00Z"),
            createdAt: new Date("2026-08-09T00:00:00Z"),
          },
        ],
      },
      NOW,
    )
    expect(situations).toHaveLength(0)
  })
})

describe("detectConversations (FASE 8C)", () => {
  const base = {
    title: "Pedido #1",
    status: "pendiente",
    priority: "medium",
    channelName: "WhatsApp",
    customerName: "Luisa",
    unreadCount: 3,
  }

  it("conversación sin respuesta genera UN item (no uno por mensaje)", () => {
    const situations = detectConversations(
      {
        conversations: [
          { ...base, id: "conv-1", lastMessageAt: new Date("2026-08-10T00:00:00Z") },
        ],
      },
      NOW,
    )
    expect(situations).toHaveLength(1)
    expect(situations[0].type).toBe("conversation.pending")
    expect(situations[0].entityId).toBe("conv-1")
    // Aunque haya 3 mensajes (unreadCount=3), el item es uno solo.
    expect(situations[0].metadata?.unreadCount).toBe(3)
  })

  it("conversación urgente (>48h) sube a prioridad alta", () => {
    const situations = detectConversations(
      {
        conversations: [
          { ...base, id: "conv-2", lastMessageAt: new Date("2026-08-01T00:00:00Z") },
        ],
      },
      NOW,
    )
    expect(situations).toHaveLength(1)
    expect(situations[0].priority).toBe("high")
    expect(situations[0].title).toMatch(/urgente/i)
  })

  it("conversación dentro del tiempo de gracia (15 min) NO genera item", () => {
    const situations = detectConversations(
      {
        conversations: [
          { ...base, id: "conv-3", lastMessageAt: new Date("2026-08-10T11:50:00Z") },
        ],
      },
      NOW,
    )
    expect(situations).toHaveLength(0)
  })
})

describe("detectChannels (FASE 8C)", () => {
  it("canal desconectado genera channel.disconnected (crítico)", () => {
    const situations = detectChannels({
      connections: [
        {
          id: "conn-1",
          channelId: "whatsapp",
          channelName: "WhatsApp",
          provider: "whatsapp",
          status: "disconnected",
          errorMessage: null,
        },
      ],
    })
    expect(situations).toHaveLength(1)
    expect(situations[0].type).toBe("channel.disconnected")
    expect(situations[0].priority).toBe("critical")
  })

  it("canal con error genera channel.error (alta)", () => {
    const situations = detectChannels({
      connections: [
        {
          id: "conn-2",
          channelId: "instagram",
          channelName: "Instagram",
          provider: "instagram",
          status: "error",
          errorMessage: "Token expirado",
        },
      ],
    })
    expect(situations).toHaveLength(1)
    expect(situations[0].type).toBe("channel.error")
    expect(situations[0].priority).toBe("high")
  })

  it("canal conectado no genera item", () => {
    const situations = detectChannels({
      connections: [
        {
          id: "conn-3",
          channelId: "messenger",
          channelName: "Messenger",
          provider: "messenger",
          status: "connected",
          errorMessage: null,
        },
      ],
    })
    expect(situations).toHaveLength(0)
  })
})
