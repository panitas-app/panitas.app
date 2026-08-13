import { describe, expect, it, vi, beforeEach } from "vitest"
import { CollectionService } from "@/services/collection.service"
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

type ContactFixture = {
  id: string
  storeId: string
  orderId: string
  customerId: string | null
  channel: string
  category: string | null
  level: number
  templateName: string | null
  message: string | null
  status: string
  userId: string | null
  sentAt: Date | null
  respondedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

type TemplateFixture = {
  id: string
  storeId: string
  category: string
  name: string
  level: number
  body: string
  isBuiltIn: boolean
  isActive: boolean
  createdAt: Date
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

/** Crédito con 3 cuotas de 100 (la 1ª vencida hace 10 días). */
function makeCreditFixtures(over: Partial<OrderFixture> = {}) {
  const order = makeOrder(over)
  const installments: InstallmentFixture[] = [
    makeInstallment({ id: "i1", orderId: order.id, number: 1, amount: 100, dueDate: daysFromNow(-10) }),
    makeInstallment({ id: "i2", orderId: order.id, number: 2, amount: 100, dueDate: daysFromNow(5) }),
    makeInstallment({ id: "i3", orderId: order.id, number: 3, amount: 100, dueDate: daysFromNow(35) }),
  ]
  return { order, installments }
}

function makeContact(over: Partial<ContactFixture> = {}): ContactFixture {
  return {
    id: "log1",
    storeId: "store-1",
    orderId: "o1",
    customerId: "c1",
    channel: "whatsapp",
    category: "primer_recordatorio",
    level: 1,
    templateName: "Recordatorio amistoso",
    message: "Hola Juan, su cuota vence el 01/01/2026.",
    status: "pending",
    userId: "user-1",
    sentAt: null,
    respondedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }
}

function makeTemplate(over: Partial<TemplateFixture> = {}): TemplateFixture {
  return {
    id: "t1",
    storeId: "store-1",
    category: "primer_recordatorio",
    name: "Recordatorio amistoso",
    level: 1,
    body: "Hola {{cliente}}, su cuota vence el {{fecha_vencimiento}}. Saldo: {{saldo}}.",
    isBuiltIn: true,
    isActive: true,
    createdAt: new Date(),
    ...over,
  }
}

function makeDb(initial: {
  orders: OrderFixture[]
  installments: InstallmentFixture[]
  contacts?: ContactFixture[]
  templates?: TemplateFixture[]
  settings?: { storeId: string; paymentMethods: string | null; defaultLevel: number | null; businessName: string | null }
}) {
  const orders = new Map(initial.orders.map((o) => [o.id, o]))
  const installments = [...initial.installments]
  const contacts = [...(initial.contacts ?? [])]
  const templates = [...(initial.templates ?? [])]
  let settings = initial.settings

  const db = {
    order: {
      findMany: vi.fn(async ({ where, include }: { where: Record<string, unknown>; include?: { collectionContacts?: boolean } }) => {
        let list = [...orders.values()]
        if (where.storeId) list = list.filter((o) => o.storeId === where.storeId)
        if (where.creditTerm !== undefined && (where.creditTerm as { not: null })?.not === null) list = list.filter((o) => o.creditTerm !== null)
        if (where.creditStatus !== undefined && (where.creditStatus as { not: string })?.not) list = list.filter((o) => o.creditStatus !== (where.creditStatus as { not: string }).not)
        return list.map((o) => ({
          ...o,
          installments: installments.filter((i) => i.orderId === o.id).sort((a, b) => a.number - b.number),
          collectionContacts: include?.collectionContacts
            ? contacts.filter((c) => c.orderId === o.id).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 50)
            : [],
        }))
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const o = orders.get(where.id)
        return o ? { ...o } : null
      }),
    },
    installment: {
      findMany: vi.fn(async ({ where }: { where: { orderId: string } }) =>
        installments.filter((i) => i.orderId === where.orderId).sort((a, b) => a.number - b.number)
      ),
    },
    orderPayment: {
      findMany: vi.fn(async () => []),
    },
    collectionTemplate: {
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
        templates
          .filter((t) => (where.storeId ? t.storeId === where.storeId : true))
          .filter((t) => (where.category ? t.category === where.category : true))
          .filter((t) => (where.isActive !== undefined ? t.isActive === where.isActive : true))
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      ),
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        let list = templates
        if (where.id) list = list.filter((t) => t.id === where.id)
        if (where.storeId) list = list.filter((t) => t.storeId === where.storeId)
        if (where.category) list = list.filter((t) => t.category === where.category)
        if (where.name) list = list.filter((t) => t.name === where.name)
        return list[0] ?? null
      }),
      create: vi.fn(async ({ data }: { data: Partial<TemplateFixture> }) => {
        const row: TemplateFixture = {
          id: data.id ?? `t-${templates.length + 1}`,
          storeId: data.storeId!,
          category: data.category!,
          name: data.name!,
          level: data.level ?? 1,
          body: data.body!,
          isBuiltIn: data.isBuiltIn ?? false,
          isActive: data.isActive ?? true,
          createdAt: new Date(),
        }
        templates.push(row)
        return { ...row }
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<TemplateFixture> }) => {
        const row = templates.find((t) => t.id === where.id)!
        Object.assign(row, data)
        return { ...row }
      }),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        const idx = templates.findIndex((t) => t.id === where.id)
        if (idx >= 0) templates.splice(idx, 1)
        return {}
      }),
    },
    collectionSettings: {
      findUnique: vi.fn(async ({ where }: { where: { storeId: string } }) =>
        settings && settings.storeId === where.storeId ? { ...settings } : null
      ),
      upsert: vi.fn(async ({ create }: { create: Partial<NonNullable<typeof settings>> }) => {
        settings = { storeId: create.storeId!, paymentMethods: create.paymentMethods ?? null, defaultLevel: create.defaultLevel ?? 1, businessName: create.businessName ?? null }
        return { ...settings }
      }),
    },
    store: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        where.id === "store-1" ? { id: "store-1", name: "Mi Tienda" } : null
      ),
    },
    collectionContactLog: {
      count: vi.fn(async ({ where }: { where: { orderId?: string; status?: { not: string } } }) =>
        contacts.filter((c) => (where.orderId ? c.orderId === where.orderId : true)).filter((c) => (where.status?.not ? c.status !== where.status.not : true)).length
      ),
      create: vi.fn(async ({ data }: { data: Partial<ContactFixture> }) => {
        const row: ContactFixture = {
          id: data.id ?? `log-${contacts.length + 1}`,
          storeId: data.storeId!,
          orderId: data.orderId!,
          customerId: data.customerId ?? null,
          channel: data.channel ?? "whatsapp",
          category: data.category ?? null,
          level: data.level ?? 1,
          templateName: data.templateName ?? null,
          message: data.message ?? null,
          status: data.status ?? "pending",
          userId: data.userId ?? null,
          sentAt: data.sentAt ?? null,
          respondedAt: data.respondedAt ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        contacts.push(row)
        return { ...row }
      }),
      findFirst: vi.fn(async ({ where }: { where: { id: string; storeId?: string } }) => {
        const row = contacts.find((c) => c.id === where.id && (where.storeId ? c.storeId === where.storeId : true))
        return row ? { ...row } : null
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<ContactFixture> }) => {
        const row = contacts.find((c) => c.id === where.id)!
        Object.assign(row, data)
        return { ...row }
      }),
      findMany: vi.fn(async ({ where, include }: { where: Record<string, unknown>; include?: { order?: boolean } }) => {
        let list = contacts
        if (where.storeId) list = list.filter((c) => c.storeId === where.storeId)
        if (where.orderId) list = list.filter((c) => c.orderId === where.orderId)
        if (where.customerId) list = list.filter((c) => c.customerId === where.customerId)
        return list
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .map((c) => {
            const order = include?.order ? orders.get(c.orderId) : undefined
            return {
              ...c,
              order: order ? { orderNumber: order.orderNumber, customerName: order.customerName, customerPhone: order.customerPhone } : undefined,
            }
          })
      }),
    },
  }
  return { db, orders, installments, contacts, templates }
}

function serviceFor(db: ReturnType<typeof makeDb>["db"]) {
  return new CollectionService(db as never)
}

describe("CollectionService.renderTemplate", () => {
  it("reemplaza variables conocidas y deja desconocidas intactas", () => {
    const service = serviceFor({} as never)
    const out = service.renderTemplate("Hola {{cliente}}, saldo {{saldo}} y {{desconocida}}.", {
      cliente: "María",
      saldo: "$100,00",
    })
    expect(out).toBe("Hola María, saldo $100,00 y {{desconocida}}.")
  })

  it("tolera espacios dentro de la variable", () => {
    const service = serviceFor({} as never)
    expect(service.renderTemplate("Hola {{ cliente }}", { cliente: "Ana" })).toBe("Hola Ana")
  })
})

describe("CollectionService.listTemplates", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("siembra las 5 plantillas por defecto cuando no existen", async () => {
    const { db, templates } = makeDb({ orders: [], installments: [], templates: [] })
    const rows = await serviceFor(db).listTemplates(ctx)
    expect(rows).toHaveLength(5)
    expect(templates).toHaveLength(5)
    expect(rows.every((r) => r.isBuiltIn)).toBe(true)
  })

  it("no duplica plantillas si ya existen", async () => {
    const { db, templates } = makeDb({
      orders: [],
      installments: [],
      templates: [makeTemplate()],
    })
    const rows = await serviceFor(db).listTemplates(ctx)
    expect(rows.length).toBeGreaterThanOrEqual(5)
    expect(templates.filter((t) => t.category === "primer_recordatorio")).toHaveLength(1)
  })
})

describe("CollectionService.upsertTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("crea una plantilla custom nueva", async () => {
    const { db } = makeDb({ orders: [], installments: [], templates: [] })
    const row = await serviceFor(db).upsertTemplate(ctx, {
      category: "primer_recordatorio",
      name: "Mi recordatorio",
      body: "Hola {{cliente}}, págame {{saldo}}.",
    })
    expect(row).toMatchObject({ category: "primer_recordatorio", name: "Mi recordatorio", isBuiltIn: false })
    expect(fireDomainEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "collection.reminder.edited" }))
    expect(createAuditEntry).toHaveBeenCalled()
  })

  it("rechaza nombre vacío y cuerpo vacío", async () => {
    const { db } = makeDb({ orders: [], installments: [], templates: [] })
    const service = serviceFor(db)
    await expect(
      service.upsertTemplate(ctx, { category: "primer_recordatorio", name: "  ", body: "x" })
    ).rejects.toMatchObject({ message: "El nombre de la plantilla es obligatorio" })
    await expect(
      service.upsertTemplate(ctx, { category: "primer_recordatorio", name: "x", body: "  " })
    ).rejects.toMatchObject({ message: "El cuerpo de la plantilla es obligatorio" })
  })
})

describe("CollectionService.getSettings / saveSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("devuelve métodos por defecto si no hay configuración", async () => {
    const { db } = makeDb({ orders: [], installments: [], settings: undefined })
    const settings = await serviceFor(db).getSettings(ctx)
    expect(settings.paymentMethods.length).toBeGreaterThan(0)
    expect(settings.businessName).toBe("Mi Tienda")
  })

  it("guarda métodos normalizados (dedupe exacto) y emite evento", async () => {
    const { db } = makeDb({ orders: [], installments: [] })
    const settings = await serviceFor(db).saveSettings(ctx, {
      paymentMethods: ["Zelle", "zelle", "Pago Móvil", "Pago Móvil"],
      defaultLevel: 2,
      businessName: "Panitas",
    })
    expect(settings.paymentMethods).toEqual(["Zelle", "zelle", "Pago Móvil"])
    expect(settings.businessName).toBe("Panitas")
    expect(fireDomainEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "collection.settings.updated" }))
  })

  it("rechaza más de 15 métodos", async () => {
    const { db } = makeDb({ orders: [], installments: [] })
    const tooMany = Array.from({ length: 16 }, (_, i) => `Método ${i}`)
    await expect(serviceFor(db).saveSettings(ctx, { paymentMethods: tooMany })).rejects.toMatchObject({
      message: expect.stringContaining("15"),
    })
  })
})

describe("CollectionService.prepareReminder", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("prepara un recordatorio con variables renderizadas sin enviarlo", async () => {
    const { order, installments } = makeCreditFixtures()
    const { db, contacts } = makeDb({ orders: [order], installments, templates: [makeTemplate()] })
    const reminder = await serviceFor(db).prepareReminder(ctx, { orderId: order.id, category: "primer_recordatorio", level: 1 })

    expect(reminder.customerName).toBe("Juan Pérez")
    expect(reminder.pending).toBe(300)
    expect(reminder.overdueDays).toBe(10)
    expect(reminder.level).toBe(1)
    expect(reminder.message).toContain("Juan")
    expect(reminder.message).toContain("$300.00")
    expect(reminder.whatsappUrl).toContain("wa.me/584120000000")
    expect(contacts).toHaveLength(1)
    expect(contacts[0].status).toBe("pending")
    expect(fireDomainEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "collection.reminder.prepared" }))
  })

  it("sugiere nivel 2 para un crédito vencido hace 10 días", async () => {
    const { order, installments } = makeCreditFixtures()
    const { db } = makeDb({ orders: [order], installments, templates: [makeTemplate({ category: "segundo_recordatorio", id: "t2", level: 2, name: "Aviso formal" })] })
    const reminder = await serviceFor(db).prepareReminder(ctx, { orderId: order.id })
    expect(reminder.suggestedLevel).toBe(2)
    expect(reminder.category).toBe("segundo_recordatorio")
  })

  it("rechaza preparar recordatorio de un crédito saldado", async () => {
    const { order, installments } = makeCreditFixtures({ creditStatus: "completed" })
    installments.forEach((i) => {
      i.status = "paid"
      i.paidAmount = i.amount
    })
    const { db } = makeDb({ orders: [order], installments, templates: [makeTemplate()] })
    await expect(serviceFor(db).prepareReminder(ctx, { orderId: order.id })).rejects.toMatchObject({
      message: expect.stringContaining("saldado"),
    })
  })

  it("respeta un override de cuerpo sin crear plantilla", async () => {
    const { order, installments } = makeCreditFixtures()
    const { db, templates } = makeDb({ orders: [order], installments, templates: [] })
    const reminder = await serviceFor(db).prepareReminder(ctx, { orderId: order.id, bodyOverride: "Hola {{cliente}}, solo un aviso." })
    expect(reminder.message).toBe("Hola Juan Pérez, solo un aviso.")
    expect(templates).toHaveLength(0)
  })
})

describe("CollectionService.markContact", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("marca como enviado (sent) un contacto pendiente", async () => {
    const contact = makeContact()
    const { db, contacts } = makeDb({ orders: [], installments: [], contacts: [contact] })
    const updated = await serviceFor(db).markContact(ctx, contact.id, "sent")
    expect(updated.status).toBe("sent")
    expect(updated.sentAt).not.toBeNull()
    expect(contacts.find((c) => c.id === contact.id)!.status).toBe("sent")
    expect(fireDomainEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "collection.reminder.sent" }))
  })

  it("marca como respondido (responded)", async () => {
    const contact = makeContact()
    const { db } = makeDb({ orders: [], installments: [], contacts: [contact] })
    const updated = await serviceFor(db).markContact(ctx, contact.id, "responded")
    expect(updated.status).toBe("responded")
    expect(updated.respondedAt).not.toBeNull()
    expect(fireDomainEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "collection.contact.logged" }))
  })

  it("no reescribe un contacto ya enviado", async () => {
    const contact = makeContact({ status: "sent", sentAt: daysFromNow(-1) })
    const { db } = makeDb({ orders: [], installments: [], contacts: [contact] })
    const updated = await serviceFor(db).markContact(ctx, contact.id, "sent")
    expect(updated.sentAt).toEqual(contact.sentAt.toISOString())
  })

  it("rechaza un contacto de otro store", async () => {
    const contact = makeContact({ storeId: "store-otro" })
    const { db } = makeDb({ orders: [], installments: [], contacts: [contact] })
    await expect(serviceFor(db).markContact(ctx, contact.id, "sent")).rejects.toMatchObject({
      message: "Contacto no encontrado",
    })
  })
})

describe("CollectionService.recommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("ordena vencidos primero y sin contacto primero", async () => {
    const a = makeCreditFixtures({ id: "oA", orderNumber: "ORD-A", customerName: "Vencido Sin Contacto" })
    const b = makeCreditFixtures({ id: "oB", orderNumber: "ORD-B", customerName: "Vencido Contactado" })
    b.installments.forEach((i) => (i.orderId = "oB"))
    const contactado = makeContact({ id: "logB", orderId: "oB", status: "sent", sentAt: daysFromNow(-3), createdAt: daysFromNow(-3) })

    const { db } = makeDb({
      orders: [a.order, b.order],
      installments: [...a.installments, ...b.installments],
      contacts: [contactado],
      templates: [makeTemplate()],
    })
    const recs = await serviceFor(db).recommendations(ctx)

    expect(recs).toHaveLength(2)
    expect(recs[0].customerName).toBe("Vencido Sin Contacto")
    expect(recs[0].daysSinceLastContact).toBeNull()
    expect(recs[1].customerName).toBe("Vencido Contactado")
    expect(recs[1].attempts).toBe(1)
    expect(recs[0].overdueDays).toBeGreaterThan(0)
  })

  it("excluye créditos saldados", async () => {
    const paid = makeCreditFixtures({ id: "oP", orderNumber: "ORD-P", creditStatus: "completed" })
    paid.installments.forEach((i) => {
      i.orderId = "oP"
      i.status = "paid"
      i.paidAmount = i.amount
    })
    const { db } = makeDb({ orders: [paid.order], installments: paid.installments })
    const recs = await serviceFor(db).recommendations(ctx)
    expect(recs).toHaveLength(0)
  })

  it("respeta el límite", async () => {
    const orders: OrderFixture[] = []
    const installments: InstallmentFixture[] = []
    for (let i = 0; i < 5; i++) {
      const f = makeCreditFixtures({ id: `o${i}`, orderNumber: `ORD-${i}` })
      orders.push(f.order)
      installments.push(...f.installments)
    }
    const { db } = makeDb({ orders, installments })
    const recs = await serviceFor(db).recommendations(ctx, { limit: 2 })
    expect(recs).toHaveLength(2)
  })
})

describe("CollectionService.listHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("devuelve el historial en orden descendente", async () => {
    const order = makeOrder()
    const c1 = makeContact({ id: "log1", createdAt: daysFromNow(-2) })
    const c2 = makeContact({ id: "log2", createdAt: daysFromNow(-1) })
    const { db } = makeDb({ orders: [order], installments: [], contacts: [c1, c2] })
    const history = await serviceFor(db).listHistory(ctx, { orderId: order.id })
    expect(history).toHaveLength(2)
    expect(history[0].id).toBe("log2")
    expect(history[1].id).toBe("log1")
    expect(history[0].customerName).toBe("Juan Pérez")
  })
})
