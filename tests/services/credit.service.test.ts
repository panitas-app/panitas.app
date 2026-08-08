import { describe, expect, it, vi, beforeEach } from "vitest"
import { CreditService } from "@/services/credit.service"
import type { StoreServiceContext } from "@/services/context"

vi.mock("@/lib/audit", () => ({
  createAuditEntry: vi.fn(),
}))

vi.mock("@/lib/events", () => ({
  fireDomainEvent: vi.fn(),
}))

import { createAuditEntry } from "@/lib/audit"
import { fireDomainEvent } from "@/lib/events"

const ctx: StoreServiceContext = { storeId: "store-1", userId: "user-1", plan: "free", storeName: "Mi Tienda", storeEmail: null }

function daysFromNow(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

type InstallmentFixture = {
  id: string
  orderId: string
  number: number
  amount: number
  paidAmount: number
  paidAt: Date | null
  dueDate: Date
  status: string
}

type OrderFixture = {
  id: string
  orderNumber: string
  storeId: string
  customerId: string
  customerName: string
  customerPhone: string
  createdAt: Date
  total: number
  downPayment: number | null
  totalCredito: number | null
  creditTerm: string | null
  creditStatus: string | null
  paymentStatus: string | null
}

type PaymentFixture = {
  id: string
  orderId: string
  amount: number
  method: string
  reference: string | null
  notes: string | null
  paidAt: Date
  createdAt: Date
  status: string
}

function makeOrder(over: Partial<OrderFixture> = {}): OrderFixture {
  return {
    id: "o1",
    orderNumber: "ORD-1001",
    storeId: "store-1",
    customerId: "c1",
    customerName: "Juan Pérez",
    customerPhone: "+584120000000",
    createdAt: daysFromNow(-30),
    total: 300,
    downPayment: 0,
    totalCredito: 300,
    creditTerm: "cuotas_3_30d",
    creditStatus: "active",
    paymentStatus: "pending",
    ...over,
  }
}

function makeInstallment(over: Partial<InstallmentFixture> = {}): InstallmentFixture {
  return {
    id: "i1",
    orderId: "o1",
    number: 1,
    amount: 100,
    paidAmount: 0,
    paidAt: null,
    dueDate: daysFromNow(-10),
    status: "pending",
    ...over,
  }
}

/** Crea un crédito con 3 cuotas de 100 (la 1ª vencida hace 10 días). */
function makeCreditFixtures(over: Partial<OrderFixture> = {}) {
  const order = makeOrder(over)
  const installments: InstallmentFixture[] = [
    makeInstallment({ id: "i1", orderId: order.id, number: 1, amount: 100, dueDate: daysFromNow(-10) }),
    makeInstallment({ id: "i2", orderId: order.id, number: 2, amount: 100, dueDate: daysFromNow(5) }),
    makeInstallment({ id: "i3", orderId: order.id, number: 3, amount: 100, dueDate: daysFromNow(35) }),
  ]
  return { order, installments }
}

function makeDb(initial: { orders: OrderFixture[]; installments: InstallmentFixture[]; payments?: PaymentFixture[]; contacts?: Array<{ id: string; orderId: string; level: number; templateName: string | null; status: string; sentAt: Date | null; respondedAt: Date | null; createdAt: Date }> }) {
  const orders = new Map(initial.orders.map((o) => [o.id, o]))
  const installments = [...initial.installments]
  const payments = [...(initial.payments ?? [])]
  const contacts = [...(initial.contacts ?? [])]

  const db = {
    order: {
      findMany: vi.fn(async ({ where, orderBy }: { where: Record<string, unknown>; orderBy?: unknown }) => {
        let list = [...orders.values()]
        if (where.storeId) list = list.filter((o) => o.storeId === where.storeId)
        if (where.customerId) list = list.filter((o) => o.customerId === where.customerId)
        if (where.creditStatus === "cancelled") list = list.filter((o) => o.creditStatus === "cancelled")
        if (where.creditStatus && where.creditStatus !== "cancelled") list = list.filter((o) => o.creditStatus !== "cancelled")
        if ((where.creditTerm as { not: null })?.not === null) list = list.filter((o) => o.creditTerm !== null)
        if (Array.isArray(where.OR)) {
          const ors = where.OR as Array<Record<string, { contains: string }>>
          list = list.filter((o) =>
            ors.some((cond) => {
              const field = Object.keys(cond)[0]
              const value = (cond[field] as { contains: string }).contains.toLowerCase()
              return String(o[field as keyof OrderFixture] ?? "").toLowerCase().includes(value)
            })
          )
        }
        return list.map((o) => ({ ...o, installments: installments.filter((i) => i.orderId === o.id) }))
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const o = orders.get(where.id)
        return o ? { ...o } : null
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<OrderFixture> }) => {
        const o = orders.get(where.id)!
        Object.assign(o, data)
        return { ...o }
      }),
    },
    installment: {
      findMany: vi.fn(async ({ where, select }: { where: Record<string, unknown>; select?: unknown }) => {
        let list = installments
        if (where.orderId) list = list.filter((i) => i.orderId === where.orderId)
        if ((where.status as { not?: string })?.not === "paid") list = list.filter((i) => i.status !== "paid")
        if (select) return list.map((i) => ({ amount: i.amount, paidAmount: i.paidAmount }))
        return list.map((i) => ({ ...i }))
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<InstallmentFixture> }) => {
        const inst = installments.find((i) => i.id === where.id)!
        Object.assign(inst, data)
        return { ...inst }
      }),
      create: vi.fn(async ({ data }: { data: InstallmentFixture }) => {
        installments.push(data)
        return { ...data }
      }),
      deleteMany: vi.fn(async () => {
        installments.length = 0
        return { count: 0 }
      }),
      count: vi.fn(async ({ where }: { where: { status: { not: string } } }) =>
        installments.filter((i) => where.status.not === "paid" && i.status !== "paid").length
      ),
    },
    orderPayment: {
      create: vi.fn(async ({ data }: { data: PaymentFixture }) => {
        const saved = { ...data, createdAt: data.createdAt ?? new Date() }
        payments.push(saved)
        return { ...saved }
      }),
      findMany: vi.fn(async ({ where }: { where: { orderId?: string; status?: string } }) => {
        let list = payments
        if (where.orderId) list = list.filter((p) => p.orderId === where.orderId)
        if (where.status) list = list.filter((p) => p.status === where.status)
        return list.map((p) => ({ ...p }))
      }),
      aggregate: vi.fn(async () => ({ _sum: { amount: null } })),
    },
    orderItem: {
      findMany: vi.fn(async () => [
        { productName: "Producto A", quantity: 2, price: 100, subtotal: 200 },
        { productName: "Producto B", quantity: 1, price: 100, subtotal: 100 },
      ]),
    },
    collectionContactLog: {
      findMany: vi.fn(async ({ where }: { where: { orderId: string } }) =>
        contacts.filter((c) => c.orderId === where.orderId).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      ),
    },
    auditLog: {
      findMany: vi.fn(async () => []),
    },
  }
  return { db, orders, installments, payments }
}

function serviceFor(db: ReturnType<typeof makeDb>["db"]) {
  return new CreditService(db as never)
}

describe("CreditService.list", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("deriva el estado overdue cuando hay una cuota vencida", async () => {
    const { order, installments } = makeCreditFixtures()
    const { db } = makeDb({ orders: [order], installments })
    const service = serviceFor(db)
    const { kpis, credits } = await service.list(ctx)
    expect(credits).toHaveLength(1)
    expect(credits[0]).toMatchObject({ orderId: "o1", state: "overdue", pending: 300, overdueDays: 10 })
    expect(kpis).toMatchObject({ activeCredits: 1, overdueCredits: 1, overdueAmount: 300, totalPending: 300 })
  })

  it("deriva el estado upcoming cuando la próxima cuota vence en ≤7 días", async () => {
    const { order, installments } = makeCreditFixtures({ id: "o2" })
    installments.forEach((i) => {
      i.orderId = "o2"
      i.dueDate = daysFromNow(3)
    })
    const { db } = makeDb({ orders: [order], installments })
    const { credits } = await serviceFor(db).list(ctx)
    expect(credits[0].state).toBe("upcoming")
  })

  it("deriva el estado on_time cuando no hay cuotas vencidas ni próximas", async () => {
    const { order, installments } = makeCreditFixtures({ id: "o3" })
    installments.forEach((i) => {
      i.orderId = "o3"
      i.dueDate = daysFromNow(20)
    })
    const { db } = makeDb({ orders: [order], installments })
    const { credits } = await serviceFor(db).list(ctx)
    expect(credits[0].state).toBe("on_time")
  })

  it("marca paid cuando creditStatus es completed", async () => {
    const { order, installments } = makeCreditFixtures({ id: "o4", creditStatus: "completed" })
    installments.forEach((i) => {
      i.orderId = "o4"
      i.status = "paid"
      i.paidAmount = i.amount
      i.paidAt = daysFromNow(-1)
    })
    const { db } = makeDb({ orders: [order], installments })
    const { credits } = await serviceFor(db).list(ctx)
    expect(credits[0].state).toBe("paid")
  })

  it("filtra por estado overdue", async () => {
    const a = makeCreditFixtures()
    const b = makeCreditFixtures({ id: "o5", orderNumber: "ORD-1002" })
    b.installments.forEach((i) => {
      i.orderId = "o5"
      i.dueDate = daysFromNow(20)
    })
    const { db } = makeDb({ orders: [a.order, b.order], installments: [...a.installments, ...b.installments] })
    const { credits } = await serviceFor(db).list(ctx, { status: "overdue" })
    expect(credits).toHaveLength(1)
    expect(credits[0].orderId).toBe("o1")
  })

  it("filtra por búsqueda de nombre de cliente", async () => {
    const a = makeCreditFixtures()
    const b = makeCreditFixtures({ id: "o6", orderNumber: "ORD-1003", customerName: "María López" })
    b.installments.forEach((i) => (i.orderId = "o6"))
    const { db } = makeDb({ orders: [a.order, b.order], installments: [...a.installments, ...b.installments] })
    const { credits } = await serviceFor(db).list(ctx, { search: "maría" })
    expect(credits).toHaveLength(1)
    expect(credits[0].customerName).toBe("María López")
  })
})

describe("CreditService.listByCustomer", () => {
  it("solo devuelve créditos activos con saldo pendiente del cliente", async () => {
    const a = makeCreditFixtures()
    const paid = makeCreditFixtures({ id: "o7", orderNumber: "ORD-1004", creditStatus: "completed" })
    paid.installments.forEach((i) => {
      i.orderId = "o7"
      i.status = "paid"
      i.paidAmount = i.amount
    })
    const { db } = makeDb({ orders: [a.order, paid.order], installments: [...a.installments, ...paid.installments] })
    const credits = await serviceFor(db).listByCustomer(ctx, "c1")
    expect(credits).toHaveLength(1)
    expect(credits[0].orderId).toBe("o1")
  })
})

describe("CreditService.registerPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("aplica un abono parcial en cascada dejando la cuota como parcial", async () => {
    const { order, installments } = makeCreditFixtures()
    const { db, installments: state } = makeDb({ orders: [order], installments })
    const service = serviceFor(db)

    const detail = await service.registerPayment(ctx, { orderId: "o1", amount: 40 })

    expect(detail.installments[0]).toMatchObject({ number: 1, paidAmount: 40, status: "late" })
    expect(detail.payments).toHaveLength(1)
    expect(detail.payments[0]).toMatchObject({ amount: 40, method: "cash" })
    expect(db.installment.update).toHaveBeenCalled()
    expect(state.find((i) => i.id === "i1")!.paidAmount).toBe(40)
    expect(fireDomainEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "credit.payment.created" }))
    expect(createAuditEntry).toHaveBeenCalled()
  })

  it("aplica el abono en cascada oldest-first sobre varias cuotas", async () => {
    const { order, installments } = makeCreditFixtures()
    const { db } = makeDb({ orders: [order], installments })
    const detail = await serviceFor(db).registerPayment(ctx, { orderId: "o1", amount: 150 })

    expect(detail.installments.map((i) => ({ n: i.number, paid: i.paidAmount, st: i.status }))).toEqual([
      { n: 1, paid: 100, st: "paid" },
      { n: 2, paid: 50, st: "pending" },
      { n: 3, paid: 0, st: "pending" },
    ])
  })

  it("cierra el crédito cuando el abono salda todas las cuotas", async () => {
    const { order, installments } = makeCreditFixtures()
    const { db } = makeDb({ orders: [order], installments })
    const service = serviceFor(db)

    await service.registerPayment(ctx, { orderId: "o1", amount: 300 })

    expect(db.order.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "o1" },
      data: expect.objectContaining({ creditStatus: "completed", paymentStatus: "paid" }),
    }))
    expect(fireDomainEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "credit.payment.created" }))
    expect(fireDomainEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "credit.completed" }))
  })

  it("rechaza un abono mayor al saldo pendiente", async () => {
    const { order, installments } = makeCreditFixtures()
    const { db } = makeDb({ orders: [order], installments })
    await expect(serviceFor(db).registerPayment(ctx, { orderId: "o1", amount: 301 })).rejects.toMatchObject({
      message: /supera el saldo pendiente/,
      status: 400,
    })
  })

  it("rechaza un abono en un crédito cancelado", async () => {
    const { order, installments } = makeCreditFixtures({ creditStatus: "cancelled" })
    const { db } = makeDb({ orders: [order], installments })
    await expect(serviceFor(db).registerPayment(ctx, { orderId: "o1", amount: 100 })).rejects.toMatchObject({
      message: "El crédito está cancelado",
      status: 400,
    })
  })

  it("rechaza un abono en un crédito saldado", async () => {
    const { order, installments } = makeCreditFixtures({ creditStatus: "completed" })
    const { db } = makeDb({ orders: [order], installments })
    await expect(serviceFor(db).registerPayment(ctx, { orderId: "o1", amount: 100 })).rejects.toMatchObject({
      message: "El crédito ya está saldado",
      status: 400,
    })
  })
})

describe("CreditService.reschedule", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("reemplaza las cuotas y emite credit.updated", async () => {
    const { order, installments } = makeCreditFixtures()
    const { db } = makeDb({ orders: [order], installments })
    const service = serviceFor(db)

    const detail = await service.reschedule(ctx, { orderId: "o1", count: 2, periodDays: 30 })

    expect(detail.installments).toHaveLength(2)
    expect(detail.installments[0].amount).toBeCloseTo(150, 2)
    expect(detail.installments[1].amount).toBeCloseTo(150, 2)
    expect(db.order.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ totalCredito: 300, creditStatus: "active" }),
    }))
    expect(fireDomainEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "credit.updated", data: expect.objectContaining({ action: "rescheduled" }) }))
  })

  it("rechaza una cantidad de cuotas inválida", async () => {
    const { order, installments } = makeCreditFixtures()
    const { db } = makeDb({ orders: [order], installments })
    await expect(serviceFor(db).reschedule(ctx, { orderId: "o1", count: 0, periodDays: 30 })).rejects.toMatchObject({ status: 400 })
  })

  it("rechaza recalcular un crédito sin saldo pendiente", async () => {
    const { order, installments } = makeCreditFixtures({ creditStatus: "completed" })
    const { db } = makeDb({ orders: [order], installments })
    await expect(serviceFor(db).reschedule(ctx, { orderId: "o1", count: 2, periodDays: 30 })).rejects.toMatchObject({ status: 400 })
  })
})

describe("CreditService.cancel", () => {
  it("marca el crédito como cancelado y bloquea abonos posteriores", async () => {
    const { order, installments } = makeCreditFixtures()
    const { db } = makeDb({ orders: [order], installments })
    const service = serviceFor(db)

    await service.cancel(ctx, "o1", "No pagó")
    expect(db.order.update).toHaveBeenCalledWith(expect.objectContaining({ data: { creditStatus: "cancelled" } }))
    expect(fireDomainEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "credit.updated", data: expect.objectContaining({ action: "cancelled" }) }))

    await expect(service.registerPayment(ctx, { orderId: "o1", amount: 100 })).rejects.toMatchObject({
      message: "El crédito está cancelado",
      status: 400,
    })
  })
})

describe("CreditService aislamiento por tenant", () => {
  it("rechaza un crédito de otra tienda", async () => {
    const { order, installments } = makeCreditFixtures()
    const { db } = makeDb({ orders: [order], installments })
    const other: StoreServiceContext = { ...ctx, storeId: "store-2" }
    await expect(serviceFor(db).getDetail(other, "o1")).rejects.toMatchObject({ message: "Crédito no encontrado", status: 404 })
  })
})

describe("CreditService.getDetail", () => {
  it("arma items, abonos, cuotas y timeline", async () => {
    const { order, installments } = makeCreditFixtures()
    const { db } = makeDb({
      orders: [order],
      installments,
      payments: [
        {
          id: "p1",
          orderId: "o1",
          amount: 30,
          method: "cash",
          reference: null,
          notes: "Primer abono",
          paidAt: daysFromNow(-2),
          createdAt: daysFromNow(-2),
          status: "verified",
        },
      ],
    })
    const detail = await serviceFor(db).getDetail(ctx, "o1")

    expect(detail.items).toHaveLength(2)
    expect(detail.payments).toHaveLength(1)
    expect(detail.installments).toHaveLength(3)
    const types = detail.timeline.map((t) => t.type)
    expect(types).toContain("created")
    expect(types).toContain("payment")
    expect(types).toContain("overdue")
  })

  it("incluye en el timeline los avisos de cobranza y respuestas del cliente (FASE 6B)", async () => {
    const { order, installments } = makeCreditFixtures()
    const { db } = makeDb({
      orders: [order],
      installments,
      contacts: [
        {
          id: "log1",
          orderId: "o1",
          level: 1,
          templateName: "Recordatorio amistoso",
          status: "sent",
          sentAt: daysFromNow(-4),
          respondedAt: null,
          createdAt: daysFromNow(-4),
        },
        {
          id: "log2",
          orderId: "o1",
          level: 2,
          templateName: "Aviso formal",
          status: "responded",
          sentAt: daysFromNow(-2),
          respondedAt: daysFromNow(-1),
          createdAt: daysFromNow(-2),
        },
      ],
    })
    const detail = await serviceFor(db).getDetail(ctx, "o1")

    const sent = detail.timeline.filter((t) => t.type === "reminder_sent")
    expect(sent).toHaveLength(2)
    expect(sent[0].title).toContain("nivel 1")
    const responded = detail.timeline.filter((t) => t.type === "client_responded")
    expect(responded).toHaveLength(1)
    expect(responded[0].title).toBe("El cliente respondió")
  })
})
