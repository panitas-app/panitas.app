/**
 * SupplierService (FASE 6C) — Centro de Proveedores / Cuentas por pagar.
 *
 * Convierte la capa delgada de `Expense.vendor` en un módulo real de
 * cuentas por pagar: proveedores con saldo, facturas (compras), pagos y
 * abonos con saldos automáticos, timeline cronológico y KPIs.
 *
 * Capacidades:
 *   - list / getDetail → KPIs superiores, tarjetas de proveedor con saldo,
 *     estado derivado y timeline.
 *   - recordPurchase    → registra una factura/compra que incrementa el saldo.
 *   - registerPayment   → pago o abono de monto arbitrario aplicado en cascada
 *     a las facturas pendientes más antiguas (oldest-first), actualizando el
 *     porcentaje pagado de cada factura y cerrando las que cubra.
 *   - create / update   → administración básica del proveedor.
 *
 * Estados derivados del proveedor (espec 6C):
 *   🟢 saldado   → sin facturas pendientes
 *   🔵 al_dia    → con deuda, nada vencido ni por vencer
 *   🟡 por_vencer→ con deuda que vence en los próximos 7 días
 *   🔴 vencido   → con al menos una factura vencida con saldo
 *   ⚪ inactivo  → proveedor desactivado
 *
 * Emite los eventos de dominio supplier.* y audita cada mutación.
 */
import { Prisma, PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { createAuditEntry } from "@/lib/audit"
import { fireDomainEvent } from "@/lib/events"
import { serviceError } from "@/services/errors"
import type { StoreServiceContext } from "@/services/context"

export type SupplierState = "saldado" | "al_dia" | "por_vencer" | "vencido" | "inactivo"

export interface SupplierKpis {
  totalPayable: number
  pendingInvoices: number
  overdueInvoices: number
  overdueAmount: number
  dueNext7Days: number
  paidThisMonth: number
  activeSuppliers: number
}

export interface SupplierSummary {
  id: string
  name: string
  ruc: string
  phone: string
  email: string
  category: string
  isActive: boolean
  balance: number
  totalPurchased: number
  totalPaid: number
  pendingInvoices: number
  overdueInvoices: number
  nextDueDate: string | null
  lastPurchaseAt: string | null
  lastPaymentAt: string | null
  state: SupplierState
  createdAt: string
}

export interface SupplierInvoiceDTO {
  id: string
  number: string
  description: string
  amount: number
  date: string
  dueDate: string | null
  status: "pending" | "partial" | "paid" | "cancelled"
  paidAmount: number
  paidPercent: number
  paymentMethod: string
  documentRef: string
  notes: string | null
  createdAt: string
}

export interface SupplierPaymentDTO {
  id: string
  amount: number
  date: string
  paymentMethod: string
  reference: string
  notes: string | null
  createdAt: string
}

export interface SupplierTimelineEntry {
  type: "created" | "invoice" | "payment"
  date: string
  title: string
  description?: string
  amount?: number
}

export interface SupplierDetail extends SupplierSummary {
  address: string
  notes: string | null
  invoices: SupplierInvoiceDTO[]
  payments: SupplierPaymentDTO[]
  timeline: SupplierTimelineEntry[]
}

export interface SupplierListResult {
  kpis: SupplierKpis
  suppliers: SupplierSummary[]
}

export type SupplierCreateInput = {
  name: string
  ruc?: string
  phone?: string
  email?: string
  address?: string
  category?: string
  notes?: string | null
}

export type SupplierUpdateInput = Partial<SupplierCreateInput> & { isActive?: boolean }

export type SupplierPurchaseInput = {
  supplierId?: string
  supplierName?: string
  description: string
  amount: number
  number?: string
  date?: Date
  dueDate?: Date | null
  paymentMethod?: string
  documentRef?: string
  notes?: string | null
}

export type SupplierPaymentInput = {
  supplierId: string
  amount: number
  date?: Date
  paymentMethod?: string
  reference?: string
  notes?: string | null
}

const UPCOMING_WINDOW_DAYS = 7

function toDateString(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null
}

export class SupplierService {
  constructor(private readonly db: PrismaClient = prisma) {}

  // ─── Consultas ──────────────────────────────────────────────────────────

  async list(ctx: StoreServiceContext, opts: { status?: string; search?: string; limit?: number } = {}): Promise<SupplierListResult> {
    const { status = "all", search, limit = 100 } = opts
    const storeId = ctx.storeId

    const where: Prisma.SupplierWhereInput = { storeId }
    if (search && search.trim()) {
      const q = search.trim()
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { ruc: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { email: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
      ]
    }

    const suppliers = await this.db.supplier.findMany({ where, orderBy: { name: "asc" }, take: Math.min(limit, 500) })
    const ids = suppliers.map((s) => s.id)

    const [invoices, payments] = await Promise.all([
      ids.length > 0
        ? this.db.supplierInvoice.findMany({ where: { storeId, supplierId: { in: ids } }, orderBy: { date: "asc" } })
        : [],
      ids.length > 0
        ? this.db.supplierPayment.findMany({ where: { storeId, supplierId: { in: ids } }, orderBy: { date: "asc" } })
        : [],
    ])

    let summaries = suppliers.map((s) =>
      this.toSummary(
        s,
        invoices.filter((i) => i.supplierId === s.id),
        payments.filter((p) => p.supplierId === s.id)
      )
    )
    if (status !== "all") {
      summaries = summaries.filter((s) => s.state === status)
    }

    const kpis = await this.computeKpis(ctx)
    return { kpis, suppliers: summaries.slice(0, limit) }
  }

  async getDetail(ctx: StoreServiceContext, id: string): Promise<SupplierDetail> {
    const supplier = await this.loadSupplier(ctx, id)
    const [invoices, payments] = await Promise.all([
      this.db.supplierInvoice.findMany({ where: { supplierId: supplier.id }, orderBy: { date: "asc" } }),
      this.db.supplierPayment.findMany({ where: { supplierId: supplier.id }, orderBy: { date: "asc" } }),
    ])
    return this.toDetail(supplier, invoices, payments)
  }

  // ─── Mutaciones ─────────────────────────────────────────────────────────

  async create(ctx: StoreServiceContext, input: SupplierCreateInput) {
    const name = input.name?.trim()
    if (!name) throw serviceError("El nombre del proveedor es obligatorio", 400)
    if (name.length > 100) throw serviceError("El nombre no puede superar 100 caracteres", 400)

    const existing = await this.db.supplier.findFirst({
      where: { storeId: ctx.storeId, name: { equals: name, mode: "insensitive" } },
    })
    if (existing) throw serviceError(`Ya existe un proveedor llamado "${existing.name}"`, 409)

    const supplier = await this.db.supplier.create({
      data: {
        storeId: ctx.storeId,
        name,
        ruc: (input.ruc ?? "").trim().slice(0, 30),
        phone: (input.phone ?? "").trim().slice(0, 30),
        email: (input.email ?? "").trim().slice(0, 120),
        address: (input.address ?? "").trim().slice(0, 200),
        category: (input.category ?? "").trim().slice(0, 40),
        notes: input.notes?.trim() ? input.notes.trim().slice(0, 1000) : null,
      },
    })

    await createAuditEntry({
      action: "supplier.created",
      entity: "Supplier",
      entityId: supplier.id,
      metadata: { name: supplier.name, category: supplier.category },
      storeId: ctx.storeId,
      userId: ctx.userId,
    })
    fireDomainEvent({
      type: "supplier.created",
      data: { supplierId: supplier.id, name: supplier.name, category: supplier.category },
      aggregateId: supplier.id,
      aggregateType: "Supplier",
      tenantId: ctx.storeId,
      actorId: ctx.userId,
      source: "supplier.service:create",
    })

    return this.getDetail(ctx, supplier.id)
  }

  async update(ctx: StoreServiceContext, id: string, input: SupplierUpdateInput) {
    await this.loadSupplier(ctx, id)

    const data: Prisma.SupplierUncheckedUpdateInput = {}
    if (input.name !== undefined) {
      const name = input.name.trim()
      if (!name) throw serviceError("El nombre del proveedor es obligatorio", 400)
      if (name.length > 100) throw serviceError("El nombre no puede superar 100 caracteres", 400)
      const dup = await this.db.supplier.findFirst({
        where: { storeId: ctx.storeId, name: { equals: name, mode: "insensitive" }, id: { not: id } },
      })
      if (dup) throw serviceError(`Ya existe un proveedor llamado "${dup.name}"`, 409)
      data.name = name
    }
    if (input.ruc !== undefined) data.ruc = input.ruc.trim().slice(0, 30)
    if (input.phone !== undefined) data.phone = input.phone.trim().slice(0, 30)
    if (input.email !== undefined) data.email = input.email.trim().slice(0, 120)
    if (input.address !== undefined) data.address = input.address.trim().slice(0, 200)
    if (input.category !== undefined) data.category = input.category.trim().slice(0, 40)
    if (input.notes !== undefined) data.notes = input.notes?.trim() ? input.notes.trim().slice(0, 1000) : null
    if (input.isActive !== undefined) data.isActive = input.isActive

    const updated = await this.db.supplier.update({ where: { id }, data })

    await createAuditEntry({
      action: "supplier.updated",
      entity: "Supplier",
      entityId: updated.id,
      metadata: { name: updated.name },
      storeId: ctx.storeId,
      userId: ctx.userId,
    })
    fireDomainEvent({
      type: "supplier.updated",
      data: { supplierId: updated.id, name: updated.name, isActive: updated.isActive },
      aggregateId: updated.id,
      aggregateType: "Supplier",
      tenantId: ctx.storeId,
      actorId: ctx.userId,
      source: "supplier.service:update",
    })

    return this.getDetail(ctx, updated.id)
  }

  async remove(ctx: StoreServiceContext, id: string) {
    const supplier = await this.loadSupplier(ctx, id)
    await this.db.supplier.delete({ where: { id } })

    await createAuditEntry({
      action: "supplier.deleted",
      entity: "Supplier",
      entityId: id,
      metadata: { name: supplier.name },
      storeId: ctx.storeId,
      userId: ctx.userId,
    })
    fireDomainEvent({
      type: "supplier.deleted",
      data: { supplierId: id, name: supplier.name },
      aggregateId: id,
      aggregateType: "Supplier",
      tenantId: ctx.storeId,
      actorId: ctx.userId,
      source: "supplier.service:remove",
    })

    return { removed: true, id }
  }

  /**
   * Registra una compra/factura a un proveedor. Acepta `supplierId` o
   * `supplierName` (si el proveedor no existe, lo crea automáticamente).
   * La factura incrementa el saldo pendiente del proveedor.
   */
  async recordPurchase(ctx: StoreServiceContext, input: SupplierPurchaseInput) {
    const description = input.description?.trim()
    if (!description) throw serviceError("La descripción de la compra es obligatoria", 400)
    const amount = Number(input.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      throw serviceError("El monto de la compra debe ser un número positivo", 400)
    }

    const supplier = input.supplierId
      ? await this.loadSupplier(ctx, input.supplierId)
      : await this.ensureSupplier(ctx, input.supplierName)

    const invoice = await this.db.supplierInvoice.create({
      data: {
        storeId: ctx.storeId,
        supplierId: supplier.id,
        number: (input.number ?? "").trim().slice(0, 60),
        description,
        amount,
        date: input.date ?? new Date(),
        dueDate: input.dueDate ?? null,
        status: "pending",
        paidAmount: 0,
        paymentMethod: input.paymentMethod || "cash",
        documentRef: (input.documentRef ?? "").trim().slice(0, 60),
        notes: input.notes?.trim() ? input.notes.trim().slice(0, 1000) : null,
      },
    })

    await createAuditEntry({
      action: "supplier.purchase",
      entity: "SupplierInvoice",
      entityId: invoice.id,
      metadata: { supplierId: supplier.id, amount, description },
      storeId: ctx.storeId,
      userId: ctx.userId,
    })
    fireDomainEvent({
      type: "supplier.invoice.created",
      data: { supplierId: supplier.id, invoiceId: invoice.id, amount, description, dueDate: toDateString(input.dueDate) },
      aggregateId: supplier.id,
      aggregateType: "Supplier",
      tenantId: ctx.storeId,
      actorId: ctx.userId,
      source: "supplier.service:recordPurchase",
    })

    const balance = await this.balanceOf(ctx, supplier.id)
    fireDomainEvent({
      type: "supplier.balance.updated",
      data: { supplierId: supplier.id, balance, action: "purchase", amount },
      aggregateId: supplier.id,
      aggregateType: "Supplier",
      tenantId: ctx.storeId,
      actorId: ctx.userId,
      source: "supplier.service:recordPurchase",
    })

    return this.invoiceToDTO(invoice)
  }

  /**
   * Registra un pago o abono a un proveedor. El monto se aplica en cascada a
   * las facturas pendientes más antiguas (oldest-first): cada factura acumula
   * `paidAmount` y pasa a `paid` cuando queda cubierta o `partial` si solo se
   * abonó parte. El saldo del proveedor se recalcula automáticamente.
   */
  async registerPayment(ctx: StoreServiceContext, input: SupplierPaymentInput) {
    const supplier = await this.loadSupplier(ctx, input.supplierId)
    const amount = Number(input.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      throw serviceError("El monto del pago debe ser un número positivo", 400)
    }

    const invoices = await this.db.supplierInvoice.findMany({
      where: { supplierId: supplier.id, status: { notIn: ["paid", "cancelled"] } },
    })
    const open = invoices
      .map((inv) => ({ ...inv, effectiveDue: (inv.dueDate ?? inv.date).getTime() }))
      .sort((a, b) => a.effectiveDue - b.effectiveDue || a.date.getTime() - b.date.getTime())

    const totalOutstanding = open.reduce((s, inv) => s + Math.max(0, inv.amount - (inv.paidAmount ?? 0)), 0)
    if (amount > totalOutstanding + 0.001) {
      throw serviceError(`El monto supera el saldo pendiente de $${totalOutstanding.toFixed(2)}`, 400)
    }

    const paidAt = input.date ?? new Date()
    let remaining = amount
    let applied = 0
    for (const inv of open) {
      if (remaining <= 0.001) break
      const due = inv.amount - (inv.paidAmount ?? 0)
      const apply = Math.min(due, remaining)
      const newPaid = (inv.paidAmount ?? 0) + apply
      remaining -= apply
      applied += apply

      const fullyPaid = newPaid >= inv.amount - 0.001
      await this.db.supplierInvoice.update({
        where: { id: inv.id },
        data: {
          paidAmount: newPaid,
          status: fullyPaid ? "paid" : inv.status === "pending" ? "partial" : inv.status,
        },
      })
    }

    await this.db.supplierPayment.create({
      data: {
        storeId: ctx.storeId,
        supplierId: supplier.id,
        amount: applied,
        date: paidAt,
        paymentMethod: input.paymentMethod || "cash",
        reference: (input.reference ?? "").trim().slice(0, 120),
        notes: input.notes?.trim() ? input.notes.trim().slice(0, 1000) : null,
      },
    })

    const newBalance = Math.max(0, totalOutstanding - applied)
    const isPartial = newBalance > 0.001

    await createAuditEntry({
      action: isPartial ? "supplier.payment.partial" : "supplier.payment",
      entity: "Supplier",
      entityId: supplier.id,
      metadata: { amount: applied, method: input.paymentMethod || "cash", notes: input.notes || null },
      storeId: ctx.storeId,
      userId: ctx.userId,
    })
    fireDomainEvent({
      type: "supplier.payment.created",
      data: { supplierId: supplier.id, amount: applied, method: input.paymentMethod || "cash" },
      aggregateId: supplier.id,
      aggregateType: "Supplier",
      tenantId: ctx.storeId,
      actorId: ctx.userId,
      source: "supplier.service:registerPayment",
    })
    if (isPartial) {
      fireDomainEvent({
        type: "supplier.payment.partial",
        data: { supplierId: supplier.id, amount: applied, remainingBalance: newBalance },
        aggregateId: supplier.id,
        aggregateType: "Supplier",
        tenantId: ctx.storeId,
        actorId: ctx.userId,
        source: "supplier.service:registerPayment",
      })
    }
    fireDomainEvent({
      type: "supplier.balance.updated",
      data: { supplierId: supplier.id, balance: newBalance, action: "payment", amount: applied },
      aggregateId: supplier.id,
      aggregateType: "Supplier",
      tenantId: ctx.storeId,
      actorId: ctx.userId,
      source: "supplier.service:registerPayment",
    })

    return this.getDetail(ctx, supplier.id)
  }

  // ─── Internos ───────────────────────────────────────────────────────────

  private async loadSupplier(ctx: StoreServiceContext, id: string) {
    const supplier = await this.db.supplier.findUnique({ where: { id } })
    if (!supplier || supplier.storeId !== ctx.storeId) {
      throw serviceError("Proveedor no encontrado", 404)
    }
    return supplier
  }

  /** Busca un proveedor por nombre (case-insensitive) o lo crea. */
  private async ensureSupplier(ctx: StoreServiceContext, name?: string) {
    const clean = (name ?? "").trim()
    if (!clean) throw serviceError("Indica a qué proveedor corresponde la compra", 400)

    const existing = await this.db.supplier.findFirst({
      where: { storeId: ctx.storeId, name: { equals: clean, mode: "insensitive" } },
    })
    if (existing) return existing

    const supplier = await this.db.supplier.create({
      data: { storeId: ctx.storeId, name: clean.slice(0, 100) },
    })
    fireDomainEvent({
      type: "supplier.created",
      data: { supplierId: supplier.id, name: supplier.name, category: "" },
      aggregateId: supplier.id,
      aggregateType: "Supplier",
      tenantId: ctx.storeId,
      actorId: ctx.userId,
      source: "supplier.service:ensureSupplier",
    })
    return supplier
  }

  /** Saldo pendiente (suma de `amount - paidAmount`) de las facturas abiertas. */
  private async balanceOf(ctx: StoreServiceContext, supplierId: string): Promise<number> {
    const rows = await this.db.supplierInvoice.findMany({
      where: { storeId: ctx.storeId, supplierId, status: { notIn: ["paid", "cancelled"] } },
      select: { amount: true, paidAmount: true },
    })
    return rows.reduce((s, r) => s + Math.max(0, r.amount - (r.paidAmount ?? 0)), 0)
  }

  private async computeKpis(ctx: StoreServiceContext): Promise<SupplierKpis> {
    const now = Date.now()

    const open = await this.db.supplierInvoice.findMany({
      where: { storeId: ctx.storeId, status: { notIn: ["paid", "cancelled"] } },
      select: { amount: true, paidAmount: true, dueDate: true },
    })

    let totalPayable = 0
    let pendingInvoices = 0
    let overdueInvoices = 0
    let overdueAmount = 0
    let dueNext7Days = 0
    for (const inv of open) {
      const outstanding = Math.max(0, inv.amount - (inv.paidAmount ?? 0))
      totalPayable += outstanding
      pendingInvoices += 1
      if (inv.dueDate && inv.dueDate.getTime() < now) {
        overdueInvoices += 1
        overdueAmount += outstanding
      }
      if (inv.dueDate) {
        const diff = inv.dueDate.getTime() - now
        if (diff >= 0 && diff <= UPCOMING_WINDOW_DAYS * 86400000) {
          dueNext7Days += outstanding
        }
      }
    }

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const paid = await this.db.supplierPayment.aggregate({
      where: { storeId: ctx.storeId, date: { gte: monthStart } },
      _sum: { amount: true },
    })
    const activeSuppliers = await this.db.supplier.count({ where: { storeId: ctx.storeId, isActive: true } })

    return {
      totalPayable,
      pendingInvoices,
      overdueInvoices,
      overdueAmount,
      dueNext7Days,
      paidThisMonth: paid._sum.amount ?? 0,
      activeSuppliers,
    }
  }

  private toSummary(
    supplier: {
      id: string
      name: string
      ruc: string
      phone: string
      email: string
      category: string
      isActive: boolean
      createdAt: Date
    },
    invoices: Array<{ amount: number; paidAmount: number | null; dueDate: Date | null; date: Date }>,
    payments: Array<{ amount: number; date: Date }>
  ): SupplierSummary {
    let totalPurchased = 0
    let balance = 0
    let pendingInvoices = 0
    let overdueInvoices = 0
    let nextDueDate: Date | null = null
    let lastPurchaseAt: Date | null = null
    const now = Date.now()

    for (const inv of invoices) {
      totalPurchased += inv.amount
      if (inv.date && (!lastPurchaseAt || inv.date > lastPurchaseAt)) lastPurchaseAt = inv.date
      const outstanding = Math.max(0, inv.amount - (inv.paidAmount ?? 0))
      if (outstanding <= 0.001) continue
      balance += outstanding
      pendingInvoices += 1
      if (inv.dueDate && inv.dueDate.getTime() < now) overdueInvoices += 1
      if (!nextDueDate && inv.dueDate) nextDueDate = inv.dueDate
      else if (inv.dueDate && nextDueDate !== null && inv.dueDate < nextDueDate) nextDueDate = inv.dueDate
    }

    let totalPaid = 0
    let lastPaymentAt: Date | null = null
    for (const p of payments) {
      totalPaid += p.amount
      if (!lastPaymentAt || p.date > lastPaymentAt) lastPaymentAt = p.date
    }

    return {
      id: supplier.id,
      name: supplier.name,
      ruc: supplier.ruc,
      phone: supplier.phone,
      email: supplier.email,
      category: supplier.category,
      isActive: supplier.isActive,
      balance,
      totalPurchased,
      totalPaid,
      pendingInvoices,
      overdueInvoices,
      nextDueDate: toDateString(nextDueDate),
      lastPurchaseAt: toDateString(lastPurchaseAt),
      lastPaymentAt: toDateString(lastPaymentAt),
      state: this.stateOf(supplier.isActive, balance, overdueInvoices, nextDueDate),
      createdAt: supplier.createdAt.toISOString(),
    }
  }

  private stateOf(isActive: boolean, balance: number, overdueInvoices: number, nextDueDate: Date | null): SupplierState {
    if (!isActive) return "inactivo"
    if (balance <= 0.001) return "saldado"
    if (overdueInvoices > 0) return "vencido"
    if (nextDueDate && nextDueDate.getTime() - Date.now() <= UPCOMING_WINDOW_DAYS * 86400000) return "por_vencer"
    return "al_dia"
  }

  private toDetail(
    supplier: {
      id: string
      name: string
      ruc: string
      phone: string
      email: string
      category: string
      address: string
      notes: string | null
      isActive: boolean
      createdAt: Date
    },
    invoices: Array<{
      id: string
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
    }>,
    payments: Array<{ id: string; amount: number; date: Date; paymentMethod: string; reference: string; notes: string | null; createdAt: Date }>
  ): SupplierDetail {
    const summary = this.toSummary(supplier, invoices, payments)
    return {
      ...summary,
      address: supplier.address,
      notes: supplier.notes,
      invoices: invoices.map((inv) => this.invoiceToDTO(inv)),
      payments: payments.map((p) => this.paymentToDTO(p)),
      timeline: this.buildTimeline(supplier, invoices, payments),
    }
  }

  private invoiceToDTO(invoice: {
    id: string
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
  }): SupplierInvoiceDTO {
    const paidAmount = invoice.paidAmount ?? 0
    const status = this.normalizeInvoiceStatus(invoice.status)
    return {
      id: invoice.id,
      number: invoice.number,
      description: invoice.description,
      amount: invoice.amount,
      date: invoice.date.toISOString(),
      dueDate: toDateString(invoice.dueDate),
      status,
      paidAmount,
      paidPercent: invoice.amount > 0 ? Math.min(100, Math.round((paidAmount / invoice.amount) * 100)) : 100,
      paymentMethod: invoice.paymentMethod,
      documentRef: invoice.documentRef,
      notes: invoice.notes,
      createdAt: invoice.createdAt.toISOString(),
    }
  }

  private paymentToDTO(payment: { id: string; amount: number; date: Date; paymentMethod: string; reference: string; notes: string | null; createdAt: Date }): SupplierPaymentDTO {
    return {
      id: payment.id,
      amount: payment.amount,
      date: payment.date.toISOString(),
      paymentMethod: payment.paymentMethod,
      reference: payment.reference,
      notes: payment.notes,
      createdAt: payment.createdAt.toISOString(),
    }
  }

  private normalizeInvoiceStatus(status: string): SupplierInvoiceDTO["status"] {
    if (status === "paid" || status === "partial" || status === "cancelled") return status
    return "pending"
  }

  private buildTimeline(
    supplier: { id: string; name: string; createdAt: Date },
    invoices: Array<{ id: string; number: string; description: string; amount: number; date: Date; dueDate: Date | null; documentRef: string; notes: string | null }>,
    payments: Array<{ id: string; amount: number; date: Date; paymentMethod: string; reference: string; notes: string | null }>
  ): SupplierTimelineEntry[] {
    const entries: SupplierTimelineEntry[] = [
      {
        type: "created",
        date: supplier.createdAt.toISOString(),
        title: "Proveedor registrado",
        description: supplier.name,
      },
    ]

    for (const inv of invoices) {
      const parts = [inv.number, inv.documentRef].filter(Boolean)
      if (inv.dueDate) parts.push(`Vence ${inv.dueDate.toLocaleDateString("es-VE")}`)
      entries.push({
        type: "invoice",
        date: inv.date.toISOString(),
        title: `Compra registrada por $${inv.amount.toFixed(2)}`,
        description: [inv.description, ...parts].filter(Boolean).join(" · "),
        amount: inv.amount,
      })
    }

    for (const p of payments) {
      entries.push({
        type: "payment",
        date: p.date.toISOString(),
        title: `Pago de $${p.amount.toFixed(2)}`,
        description: [p.paymentMethod.replace(/_/g, " "), p.reference, p.notes].filter(Boolean).join(" · "),
        amount: p.amount,
      })
    }

    return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }
}
