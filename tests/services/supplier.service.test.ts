import { describe, expect, it, vi, beforeEach } from "vitest"
import { SupplierService } from "@/services/supplier.service"
import { ServiceError } from "@/services/errors"
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

type SupplierFixture = {
  id: string
  storeId: string
  name: string
  ruc: string
  phone: string
  email: string
  address: string
  category: string
  notes: string | null
  isActive: boolean
  createdAt: Date
}

type SupplierInvoiceFixture = {
  id: string
  storeId: string
  supplierId: string
  number: string
  description: string
  amount: number
  date: Date
  dueDate: Date | null
  status: string
  paidAmount: number | null
  paymentMethod: string
  documentRef: string
  notes: string | null
  createdAt: Date
}

type SupplierPaymentFixture = {
  id: string
  storeId: string
  supplierId: string
  amount: number
  date: Date
  paymentMethod: string
  reference: string
  notes: string | null
  createdAt: Date
}

function makeSupplier(over: Partial<SupplierFixture> = {}): SupplierFixture {
  return {
    id: "s1",
    storeId: "store-1",
    name: "Mercantil",
    ruc: "",
    phone: "",
    email: "",
    address: "",
    category: "",
    notes: null,
    isActive: true,
    createdAt: new Date(),
    ...over,
  }
}

function makeInvoice(over: Partial<SupplierInvoiceFixture> = {}): SupplierInvoiceFixture {
  return {
    id: "inv1",
    storeId: "store-1",
    supplierId: "s1",
    number: "",
    description: "Compra de insumos",
    amount: 100,
    date: daysFromNow(-15),
    dueDate: daysFromNow(-10),
    status: "pending",
    paidAmount: 0,
    paymentMethod: "cash",
    documentRef: "",
    notes: null,
    createdAt: new Date(),
    ...over,
  }
}

function makePayment(over: Partial<SupplierPaymentFixture> = {}): SupplierPaymentFixture {
  return {
    id: "p1",
    storeId: "store-1",
    supplierId: "s1",
    amount: 50,
    date: daysFromNow(-5),
    paymentMethod: "cash",
    reference: "",
    notes: null,
    createdAt: new Date(),
    ...over,
  }
}

function matchesSupplier(row: SupplierFixture, where: Record<string, unknown>): boolean {
  if (where.storeId && row.storeId !== where.storeId) return false
  if (where.isActive !== undefined && row.isActive !== where.isActive) return false
  if (where.name) {
    const name = where.name as { equals?: string; mode?: string } | string
    if (typeof name === "string") {
      if (row.name !== name) return false
    } else if (name.equals) {
      if (name.mode === "insensitive") {
        if (row.name.toLowerCase() !== name.equals.toLowerCase()) return false
      } else if (row.name !== name.equals) return false
    }
  }
  if (where.id) {
    const id = where.id as { not?: string } | string
    if (typeof id === "string") {
      if (row.id !== id) return false
    } else if (id.not && row.id === id.not) return false
  }
  return true
}

function matchesInvoice(row: SupplierInvoiceFixture, where: Record<string, unknown>): boolean {
  if (where.storeId && row.storeId !== where.storeId) return false
  if (where.supplierId) {
    const sid = where.supplierId as { in?: string[] } | string
    if (typeof sid === "string") {
      if (row.supplierId !== sid) return false
    } else if (sid.in && !sid.in.includes(row.supplierId)) return false
  }
  if (where.status) {
    const status = where.status as { notIn?: string[] } | string
    if (typeof status === "string") {
      if (row.status !== status) return false
    } else if (status.notIn && status.notIn.includes(row.status)) return false
  }
  return true
}

function matchesPayment(row: SupplierPaymentFixture, where: Record<string, unknown>): boolean {
  if (where.storeId && row.storeId !== where.storeId) return false
  if (where.supplierId) {
    const sid = where.supplierId as { in?: string[] } | string
    if (typeof sid === "string") {
      if (row.supplierId !== sid) return false
    } else if (sid.in && !sid.in.includes(row.supplierId)) return false
  }
  return true
}

function makeDb(initial: {
  suppliers?: SupplierFixture[]
  invoices?: SupplierInvoiceFixture[]
  payments?: SupplierPaymentFixture[]
}) {
  const suppliers = [...(initial.suppliers ?? [])]
  const invoices = [...(initial.invoices ?? [])]
  const payments = [...(initial.payments ?? [])]

  const db = {
    supplier: {
      findMany: vi.fn(async ({ where, take }: { where: Record<string, unknown>; take?: number }) => {
        let list = suppliers.filter((s) => matchesSupplier(s, where ?? {}))
        if (where?.OR) {
          const ors = (where.OR as Array<Record<string, unknown>>).filter((o) =>
            suppliers.some((s) => {
              const key = Object.keys(o)[0]
              const inner = (o as Record<string, Record<string, string>>)[key]
              return inner?.contains ? s[key as keyof SupplierFixture].toString().toLowerCase().includes(inner.contains.toLowerCase()) : false
            })
          )
          if (ors.length > 0) list = suppliers.filter((s) => ors.some((o) => matchesSupplier(s, o)))
        }
        list = [...list].sort((a, b) => a.name.localeCompare(b.name))
        return take !== undefined ? list.slice(0, take) : list
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const row = suppliers.find((s) => s.id === where.id)
        return row ? { ...row } : null
      }),
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const row = suppliers.find((s) => matchesSupplier(s, where))
        return row ? { ...row } : null
      }),
      create: vi.fn(async ({ data }: { data: Partial<SupplierFixture> }) => {
        const row: SupplierFixture = {
          id: data.id ?? `s-${suppliers.length + 1}`,
          storeId: data.storeId!,
          name: data.name!,
          ruc: data.ruc ?? "",
          phone: data.phone ?? "",
          email: data.email ?? "",
          address: data.address ?? "",
          category: data.category ?? "",
          notes: data.notes ?? null,
          isActive: data.isActive ?? true,
          createdAt: new Date(),
        }
        suppliers.push(row)
        return { ...row }
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<SupplierFixture> }) => {
        const row = suppliers.find((s) => s.id === where.id)!
        Object.assign(row, data)
        return { ...row }
      }),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        const idx = suppliers.findIndex((s) => s.id === where.id)
        if (idx >= 0) suppliers.splice(idx, 1)
        return {}
      }),
      count: vi.fn(async ({ where }: { where: { storeId: string; isActive?: boolean } }) =>
        suppliers.filter((s) => s.storeId === where.storeId && (where.isActive === undefined || s.isActive === where.isActive)).length
      ),
    },
    supplierInvoice: {
      findMany: vi.fn(async ({ where, orderBy, select }: { where: Record<string, unknown>; orderBy?: { date?: string }; select?: unknown }) => {
        let list = invoices.filter((i) => matchesInvoice(i, where ?? {}))
        if (orderBy?.date === "asc") list = [...list].sort((a, b) => a.date.getTime() - b.date.getTime())
        if (select) return list.map((i) => ({ amount: i.amount, paidAmount: i.paidAmount, dueDate: i.dueDate }))
        return list
      }),
      create: vi.fn(async ({ data }: { data: Partial<SupplierInvoiceFixture> }) => {
        const row: SupplierInvoiceFixture = {
          id: data.id ?? `inv-${invoices.length + 1}`,
          storeId: data.storeId!,
          supplierId: data.supplierId!,
          number: data.number ?? "",
          description: data.description!,
          amount: data.amount!,
          date: data.date ?? new Date(),
          dueDate: data.dueDate ?? null,
          status: data.status ?? "pending",
          paidAmount: data.paidAmount ?? 0,
          paymentMethod: data.paymentMethod ?? "cash",
          documentRef: data.documentRef ?? "",
          notes: data.notes ?? null,
          createdAt: new Date(),
        }
        invoices.push(row)
        return { ...row }
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<SupplierInvoiceFixture> }) => {
        const row = invoices.find((i) => i.id === where.id)!
        Object.assign(row, data)
        return { ...row }
      }),
    },
    supplierPayment: {
      findMany: vi.fn(async ({ where, orderBy }: { where: Record<string, unknown>; orderBy?: { date?: string } }) => {
        let list = payments.filter((p) => matchesPayment(p, where ?? {}))
        if (orderBy?.date === "asc") list = [...list].sort((a, b) => a.date.getTime() - b.date.getTime())
        return list
      }),
      create: vi.fn(async ({ data }: { data: Partial<SupplierPaymentFixture> }) => {
        const row: SupplierPaymentFixture = {
          id: data.id ?? `p-${payments.length + 1}`,
          storeId: data.storeId!,
          supplierId: data.supplierId!,
          amount: data.amount!,
          date: data.date ?? new Date(),
          paymentMethod: data.paymentMethod ?? "cash",
          reference: data.reference ?? "",
          notes: data.notes ?? null,
          createdAt: new Date(),
        }
        payments.push(row)
        return { ...row }
      }),
      aggregate: vi.fn(async ({ where }: { where: { storeId: string; date?: { gte: Date } } }) => {
        let list = payments.filter((p) => p.storeId === where.storeId)
        if (where.date?.gte) list = list.filter((p) => p.date >= where.date.gte)
        const total = list.reduce((s, p) => s + p.amount, 0)
        return { _sum: { amount: total > 0 ? total : null } }
      }),
    },
  }
  return { db, suppliers, invoices, payments }
}

function serviceFor(db: ReturnType<typeof makeDb>["db"]) {
  return new SupplierService(db as never)
}

describe("SupplierService (FASE 6C)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("create", () => {
    it("crea un proveedor, audita y emite supplier.created", async () => {
      const { db } = makeDb({})
      const service = serviceFor(db)
      const detail = await service.create(ctx, { name: "  Mercantil  ", category: "abarrotes", ruc: "J-123" })
      expect(detail.name).toBe("Mercantil")
      expect(detail.category).toBe("abarrotes")
      expect(detail.state).toBe("saldado")
      expect(createAuditEntry).toHaveBeenCalledWith(expect.objectContaining({ action: "supplier.created", entity: "Supplier" }))
      expect(fireDomainEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "supplier.created", tenantId: "store-1" }))
    })

    it("rechaza crear sin nombre", async () => {
      const { db } = makeDb({})
      await expect(serviceFor(db).create(ctx, { name: "  " })).rejects.toThrow("obligatorio")
    })

    it("rechaza un nombre duplicado (case-insensitive)", async () => {
      const { db } = makeDb({ suppliers: [makeSupplier({ name: "Mercantil" })] })
      await expect(serviceFor(db).create(ctx, { name: "mercantil" })).rejects.toThrow(ServiceError)
      await expect(serviceFor(db).create(ctx, { name: "mercantil" })).rejects.toThrow(/Ya existe/)
    })
  })

  describe("update / remove", () => {
    it("renombra y emite supplier.updated", async () => {
      const { db } = makeDb({ suppliers: [makeSupplier()] })
      const detail = await serviceFor(db).update(ctx, "s1", { name: "Mercantil C.A.", isActive: false })
      expect(detail.name).toBe("Mercantil C.A.")
      expect(detail.state).toBe("inactivo")
      expect(fireDomainEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "supplier.updated", data: expect.objectContaining({ isActive: false }) }))
    })

    it("rechaza renombrar a un nombre que ya usa otro proveedor", async () => {
      const { db } = makeDb({ suppliers: [makeSupplier({ id: "s1" }), makeSupplier({ id: "s2", name: "Mercantil" })] })
      await expect(serviceFor(db).update(ctx, "s1", { name: "Mercantil" })).rejects.toThrow(ServiceError)
    })

    it("elimina y emite supplier.deleted", async () => {
      const { db } = makeDb({ suppliers: [makeSupplier()] })
      const res = await serviceFor(db).remove(ctx, "s1")
      expect(res).toEqual({ removed: true, id: "s1" })
      expect(fireDomainEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "supplier.deleted" }))
    })

    it("lanza 404 si el proveedor no existe", async () => {
      const { db } = makeDb({})
      await expect(serviceFor(db).getDetail(ctx, "nope")).rejects.toThrow("Proveedor no encontrado")
    })

    it("lanza 404 si el proveedor pertenece a otra tienda", async () => {
      const { db } = makeDb({ suppliers: [makeSupplier({ storeId: "store-2" })] })
      await expect(serviceFor(db).getDetail(ctx, "s1")).rejects.toThrow("Proveedor no encontrado")
    })
  })

  describe("recordPurchase", () => {
    it("registra una factura pendiente, audita y emite invoice + balance", async () => {
      const { db } = makeDb({ suppliers: [makeSupplier()] })
      const dto = await serviceFor(db).recordPurchase(ctx, { supplierId: "s1", description: "Compra de harina", amount: 250, number: "F-001" })
      expect(dto).toMatchObject({ number: "F-001", description: "Compra de harina", amount: 250, status: "pending", paidAmount: 0 })
      expect(createAuditEntry).toHaveBeenCalledWith(expect.objectContaining({ action: "supplier.purchase" }))
      expect(fireDomainEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "supplier.invoice.created" }))
      expect(fireDomainEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "supplier.balance.updated", data: expect.objectContaining({ balance: 250 }) }))
    })

    it("auto-crea el proveedor cuando solo llega supplierName", async () => {
      const { db } = makeDb({})
      const dto = await serviceFor(db).recordPurchase(ctx, { supplierName: "Distribuidora XYZ", description: "Bebidas", amount: 80 })
      expect(dto.status).toBe("pending")
      expect(db.supplier.create).toHaveBeenCalled()
      expect(fireDomainEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "supplier.created" }))
      expect(fireDomainEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "supplier.invoice.created" }))
    })

    it("reutiliza el proveedor existente por nombre (case-insensitive)", async () => {
      const { db } = makeDb({ suppliers: [makeSupplier({ name: "Mercantil" })] })
      await serviceFor(db).recordPurchase(ctx, { supplierName: "mercantil", description: "Repuesto", amount: 40 })
      expect(db.supplier.create).not.toHaveBeenCalled()
    })

    it("rechaza compras sin descripción o con monto no positivo", async () => {
      const { db } = makeDb({ suppliers: [makeSupplier()] })
      const service = serviceFor(db)
      await expect(service.recordPurchase(ctx, { supplierId: "s1", description: "", amount: 10 })).rejects.toThrow("obligatoria")
      await expect(service.recordPurchase(ctx, { supplierId: "s1", description: "X", amount: 0 })).rejects.toThrow("positivo")
    })
  })

  describe("registerPayment (cascada oldest-first)", () => {
    const openInvoices = () => [
      makeInvoice({ id: "i1", amount: 100, dueDate: daysFromNow(-10) }),
      makeInvoice({ id: "i2", amount: 100, dueDate: daysFromNow(5) }),
      makeInvoice({ id: "i3", amount: 100, dueDate: daysFromNow(35) }),
    ]

    it("aplica el pago a las facturas más antiguas y marca partial", async () => {
      const { db, invoices } = makeDb({ suppliers: [makeSupplier()], invoices: openInvoices() })
      const detail = await serviceFor(db).registerPayment(ctx, { supplierId: "s1", amount: 150, paymentMethod: "transfer" })
      expect(detail.balance).toBe(150)

      const byId = new Map(invoices.map((i) => [i.id, i]))
      expect(byId.get("i1")).toMatchObject({ paidAmount: 100, status: "paid" })
      expect(byId.get("i2")).toMatchObject({ paidAmount: 50, status: "partial" })
      expect(byId.get("i3")).toMatchObject({ paidAmount: 0, status: "pending" })

      expect(db.supplierPayment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ amount: 150, paymentMethod: "transfer" }) })
      )
      expect(fireDomainEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "supplier.payment.created", data: expect.objectContaining({ amount: 150 }) }))
      expect(fireDomainEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "supplier.payment.partial" }))
      expect(fireDomainEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "supplier.balance.updated", data: expect.objectContaining({ balance: 150, action: "payment" }) }))
    })

    it("cierra todas las facturas y no emite partial al pagar el saldo exacto", async () => {
      const { db, invoices } = makeDb({ suppliers: [makeSupplier()], invoices: openInvoices() })
      const detail = await serviceFor(db).registerPayment(ctx, { supplierId: "s1", amount: 300 })
      expect(detail.balance).toBe(0)
      expect(detail.state).toBe("saldado")
      for (const i of invoices) expect(i.status).toBe("paid")
      expect(fireDomainEvent).not.toHaveBeenCalledWith(expect.objectContaining({ type: "supplier.payment.partial" }))
    })

    it("rechaza montos que superan el saldo pendiente", async () => {
      const { db } = makeDb({ suppliers: [makeSupplier()], invoices: openInvoices() })
      await expect(serviceFor(db).registerPayment(ctx, { supplierId: "s1", amount: 301 })).rejects.toThrow(/supera el saldo/)
    })

    it("aplica abono sobre factura parcial existente y deja saldo exacto", async () => {
      const { db, invoices } = makeDb({
        suppliers: [makeSupplier()],
        invoices: [makeInvoice({ id: "i1", amount: 100, dueDate: daysFromNow(-10), paidAmount: 30, status: "partial" })],
      })
      const detail = await serviceFor(db).registerPayment(ctx, { supplierId: "s1", amount: 70 })
      expect(detail.balance).toBe(0)
      expect(invoices[0]).toMatchObject({ paidAmount: 100, status: "paid" })
    })
  })

  describe("list / estado derivado", () => {
    it("calcula KPIs y resume proveedores", async () => {
      const { db } = makeDb({
        suppliers: [makeSupplier()],
        invoices: [makeInvoice({ amount: 100, dueDate: daysFromNow(-2) })],
        payments: [makePayment({ amount: 30, date: daysFromNow(0) })],
      })
      const res = await serviceFor(db).list(ctx)
      expect(res.kpis).toMatchObject({ totalPayable: 100, pendingInvoices: 1, overdueInvoices: 1, overdueAmount: 100, paidThisMonth: 30, activeSuppliers: 1 })
      expect(res.suppliers[0]).toMatchObject({ name: "Mercantil", balance: 100, pendingInvoices: 1, overdueInvoices: 1, totalPaid: 30 })
      expect(res.suppliers[0].state).toBe("vencido")
    })

    it("filtra por estado derivado", async () => {
      const { db } = makeDb({
        suppliers: [makeSupplier({ id: "s1", name: "Mercantil" }), makeSupplier({ id: "s2", name: "Acme" })],
        invoices: [makeInvoice({ supplierId: "s1", dueDate: daysFromNow(-2) })],
      })
      const res = await serviceFor(db).list(ctx, { status: "vencido" })
      expect(res.suppliers).toHaveLength(1)
      expect(res.suppliers[0].name).toBe("Mercantil")
    })

    it("marca al_dia sin facturas vencidas ni por vencer", async () => {
      const { db } = makeDb({
        suppliers: [makeSupplier()],
        invoices: [makeInvoice({ dueDate: daysFromNow(30) })],
      })
      const res = await serviceFor(db).list(ctx)
      expect(res.suppliers[0].state).toBe("al_dia")
    })

    it("marca por_vencer dentro de la ventana de 7 días", async () => {
      const { db } = makeDb({
        suppliers: [makeSupplier()],
        invoices: [makeInvoice({ dueDate: daysFromNow(4) })],
      })
      const res = await serviceFor(db).list(ctx)
      expect(res.suppliers[0].state).toBe("por_vencer")
    })

    it("marca inactivo cuando el proveedor está desactivado", async () => {
      const { db } = makeDb({ suppliers: [makeSupplier({ isActive: false })] })
      const res = await serviceFor(db).list(ctx)
      expect(res.suppliers[0].state).toBe("inactivo")
    })
  })

  describe("getDetail", () => {
    it("devuelve facturas, pagos y timeline ordenados cronológicamente", async () => {
      const supplier = makeSupplier({ createdAt: daysFromNow(-20) })
      const { db } = makeDb({
        suppliers: [supplier],
        invoices: [makeInvoice({ date: daysFromNow(-15), amount: 200 })],
        payments: [makePayment({ date: daysFromNow(-5), amount: 50 })],
      })
      const detail = await serviceFor(db).getDetail(ctx, "s1")
      expect(detail.invoices).toHaveLength(1)
      expect(detail.invoices[0].paidPercent).toBe(0)
      expect(detail.payments).toHaveLength(1)
      expect(detail.timeline.map((t) => t.type)).toEqual(["created", "invoice", "payment"])
    })

    it("expone saldo y estado correctos tras abonos parciales", async () => {
      const { db } = makeDb({
        suppliers: [makeSupplier()],
        invoices: [makeInvoice({ id: "i1", amount: 100, dueDate: daysFromNow(-10), paidAmount: 40, status: "partial" })],
      })
      const detail = await serviceFor(db).getDetail(ctx, "s1")
      expect(detail.balance).toBe(60)
      expect(detail.pendingInvoices).toBe(1)
      expect(detail.overdueInvoices).toBe(1)
    })
  })
})
