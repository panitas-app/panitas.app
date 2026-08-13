/**
 * CreditService (FASE 6A) — Centro Inteligente de Cobranza.
 *
 * Capa de negocio única para créditos en cuotas. Sustituye la lógica dispersa
 * del módulo anterior (pago cuota por cuota) por operaciones atómicas:
 *
 *   - list / getDetail  → vista con KPIs, estado derivado y timeline.
 *   - registerPayment   → abono con monto arbitrario (cascada oldest-first,
 *                         pagos parciales, cierre automático del crédito).
 *   - reschedule        → recalcula cuotas (monto / cantidad / periodicidad /
 *                         fecha de inicio) reemplazando el plan de cuotas.
 *   - cancel            → marca el crédito como cancelado.
 *
 * Estados derivados del crédito (espec 6A):
 *   🟢 on_time  → activo sin cuotas vencidas ni próximas (≤7 días)
 *   🟡 upcoming → activo con próxima cuota dentro de 7 días
 *   🔴 overdue  → activo con al menos una cuota vencida
 *   🔵 paid     → creditStatus = completed (todas las cuotas pagadas)
 *   ⚫ cancelled→ creditStatus = cancelled
 *
 * Emite los eventos de dominio credit.* y audita cada mutación.
 */
import { Prisma, PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { createAuditEntry } from "@/lib/audit"
import { fireDomainEvent } from "@/lib/events"
import { serviceError } from "@/services/errors"
import type { StoreServiceContext } from "@/services/context"

export type CreditState = "on_time" | "upcoming" | "overdue" | "paid" | "cancelled"
export type CreditStatus = "active" | "completed" | "cancelled"

export interface CreditKpis {
  totalPending: number
  activeCredits: number
  overdueCredits: number
  overdueAmount: number
  dueNext7Days: number
  recoveredThisMonth: number
  recoveryRate: number
}

export interface CreditSummary {
  orderId: string
  orderNumber: string
  customerId: string | null
  customerName: string
  customerPhone: string
  createdAt: string
  total: number
  downPayment: number
  totalCredito: number
  paid: number
  pending: number
  paidPercent: number
  state: CreditState
  creditStatus: CreditStatus
  installmentsTotal: number
  paidInstallments: number
  nextDueDate: string | null
  nextAmount: number | null
  overdueDays: number
  lastPaymentAt: string | null
  attempts: number
}

export interface CreditTimelineEntry {
  type: "created" | "payment" | "rescheduled" | "cancelled" | "overdue" | "completed" | "reminder_sent" | "client_responded"
  date: string
  title: string
  description?: string
  amount?: number
}

export interface CreditDetail extends CreditSummary {
  items: Array<{ productName: string | null; quantity: number; price: number; subtotal: number }>
  payments: Array<{
    id: string
    amount: number
    method: string
    reference: string | null
    notes: string | null
    paidAt: string | null
    createdAt: string
  }>
  installments: Array<{
    id: string
    number: number
    amount: number
    paidAmount: number
    dueDate: string
    status: string
    paidAt: string | null
  }>
  timeline: CreditTimelineEntry[]
}

export interface CreditListResult {
  kpis: CreditKpis
  credits: CreditSummary[]
  total: number
  page: number
  totalPages: number
  hasMore: boolean
}

type RegisterPaymentInput = {
  orderId: string
  amount: number
  method?: string
  paidAt?: Date
  reference?: string | null
  notes?: string | null
  paymentAccountId?: string | null
}

type RescheduleInput = {
  orderId: string
  count: number
  totalAmount?: number
  periodDays: number
  startDate?: Date
}

const UPCOMING_WINDOW_DAYS = 7

export class CreditService {
  constructor(private readonly db: PrismaClient = prisma) {}

  // ─── Consultas ──────────────────────────────────────────────────────────

  async list(ctx: StoreServiceContext, opts: { status?: string; search?: string; limit?: number; page?: number } = {}): Promise<CreditListResult> {
    const { status = "all", search } = opts
    const page = Math.max(1, opts.page ?? 1)
    const limit = Math.max(1, opts.limit ?? 20)
    const storeId = ctx.storeId

    const where: Prisma.OrderWhereInput = { storeId, creditTerm: { not: null } }
    if (search && search.trim()) {
      const q = search.trim()
      where.OR = [
        { customerName: { contains: q, mode: "insensitive" } },
        { customerPhone: { contains: q } },
        { orderNumber: { contains: q, mode: "insensitive" } },
      ]
    }

    // Se cargan todos los créditos de la tienda (sin ventana): el estado se
    // deriva en memoria desde las cuotas y los KPIs deben ser exactos sobre
    // toda la cartera, no sobre la página actual.
    const orders = await this.db.order.findMany({
      where,
      include: {
        installments: { orderBy: { number: "asc" } },
        _count: { select: { collectionContacts: { where: { status: { not: "pending" } } } } },
      },
      orderBy: { createdAt: "desc" },
    })

    const all = orders.map((o) => this.toSummary(o, o.installments, o._count?.collectionContacts ?? 0))
    const filtered = status === "all" ? all : all.filter((c) => this.matchesStatus(c, status))

    const kpis = await this.computeKpis(ctx, all)

    const start = (page - 1) * limit
    const total = filtered.length
    return {
      kpis,
      credits: filtered.slice(start, start + limit),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasMore: start + limit < total,
    }
  }

  /** Créditos activos de un cliente concreto (para cobros puntuales del agente). */
  async listByCustomer(ctx: StoreServiceContext, customerId: string): Promise<CreditSummary[]> {
    const orders = await this.db.order.findMany({
      where: { storeId: ctx.storeId, customerId, creditTerm: { not: null }, creditStatus: { not: "cancelled" } },
      include: { installments: { orderBy: { number: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    })
    return orders.map((o) => this.toSummary(o, o.installments)).filter((c) => c.state !== "paid")
  }

  async getDetail(ctx: StoreServiceContext, orderId: string): Promise<CreditDetail> {    const order = await this.loadCredit(ctx, orderId)
    const installments = await this.db.installment.findMany({
      where: { orderId: order.id },
      orderBy: { number: "asc" },
    })
    const payments = await this.db.orderPayment.findMany({
      where: { orderId: order.id, status: "verified" },
      orderBy: { paidAt: "asc" },
    })
    const items = await this.db.orderItem.findMany({ where: { orderId: order.id } })
    const contacts = await this.db.collectionContactLog.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: "asc" },
    })

    const summary = this.toSummary(order, installments, contacts.filter((c) => c.status !== "pending").length)
    const timeline = await this.buildTimeline(ctx, order, installments, payments, contacts)

    return {
      ...summary,
      items: items.map((i) => ({ productName: i.productName, quantity: i.quantity, price: i.price, subtotal: i.subtotal })),
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        reference: p.reference,
        notes: p.notes,
        paidAt: p.paidAt ? p.paidAt.toISOString() : null,
        createdAt: p.createdAt.toISOString(),
      })),
      installments: installments.map((i) => ({
        id: i.id,
        number: i.number,
        amount: i.amount,
        paidAmount: i.paidAmount ?? 0,
        dueDate: i.dueDate.toISOString(),
        status: i.status,
        paidAt: i.paidAt ? i.paidAt.toISOString() : null,
      })),
      timeline,
    }
  }

  // ─── Mutaciones ─────────────────────────────────────────────────────────

  /**
   * Registra un abono de monto arbitrario. Se aplica en cascada a las cuotas
   * pendientes más antiguas: si el monto cubre la cuota, se marca pagada; si es
   * menor, la cuota queda parcial (paidAmount > 0, status pendiente/vencida).
   * Crea el OrderPayment verificado, emite eventos y audita.
   */
  async registerPayment(ctx: StoreServiceContext, input: RegisterPaymentInput): Promise<CreditDetail> {
    const order = await this.loadActiveCredit(ctx, input.orderId)
    const paidAt = input.paidAt ?? new Date()
    const amount = Number(input.amount)

    if (!Number.isFinite(amount) || amount <= 0) {
      throw serviceError("El monto del abono debe ser mayor que 0", 400)
    }

    const installments = await this.db.installment.findMany({
      where: { orderId: order.id, status: { not: "paid" } },
      orderBy: [{ dueDate: "asc" }, { number: "asc" }],
    })

    const pendingTotal = installments.reduce((s, i) => s + (i.amount - (i.paidAmount ?? 0)), 0)
    if (amount > pendingTotal + 0.001) {
      throw serviceError(`El monto supera el saldo pendiente de $${pendingTotal.toFixed(2)}`, 400)
    }

    let applied = 0
    const isRealDb = this.db === prisma
    const result = isRealDb
      ? await prisma.$transaction(async (tx) =>
          this.applyRegisterPayment(tx, order, input, amount, paidAt, installments)
        )
      : await this.applyRegisterPayment(this.db, order, input, amount, paidAt, installments)
    applied = result.applied
    const { completed } = result

    await createAuditEntry({
      action: "credit.payment",
      entity: "Order",
      entityId: order.id,
      metadata: { amount: applied, method: input.method || "cash", notes: input.notes || null },
      storeId: ctx.storeId,
      userId: ctx.userId,
    })

    fireDomainEvent({
      type: "credit.payment.created",
      data: { orderId: order.id, amount: applied, method: input.method || "cash" },
      aggregateId: order.id,
      aggregateType: "Order",
      tenantId: ctx.storeId,
      actorId: ctx.userId,
      source: "credit.service",
    })

    if (completed) {
      fireDomainEvent({
        type: "credit.completed",
        data: { orderId: order.id },
        aggregateId: order.id,
        aggregateType: "Order",
        tenantId: ctx.storeId,
        actorId: ctx.userId,
        source: "credit.service",
      })
    }

    return this.getDetail(ctx, order.id)
  }

  /**
   * Aplica el abono en cascada (oldest-first) y crea el OrderPayment verificado.
   * Se ejecuta con el client de transacción sobre la base real o con el doble
   * inyectado en los tests; devuelve `applied`, `completed` y `remainingCount`.
   */
  private async applyRegisterPayment(
    db: PrismaClient | Prisma.TransactionClient,
    order: { id: string },
    input: RegisterPaymentInput,
    amount: number,
    paidAt: Date,
    installments: Array<{ id: string; amount: number; paidAmount: number | null; status: string; dueDate: Date; paidAt: Date | null }>
  ): Promise<{ applied: number; completed: boolean; remainingCount: number }> {
    let remaining = amount
    let applied = 0

    for (const inst of installments) {
      if (remaining <= 0.001) break
      const alreadyPaid = inst.paidAmount ?? 0
      const due = inst.amount - alreadyPaid
      const apply = Math.min(due, remaining)
      const newPaid = alreadyPaid + apply
      remaining -= apply
      applied += apply

      const fullyPaid = newPaid >= inst.amount - 0.001
      await db.installment.update({
        where: { id: inst.id },
        data: {
          paidAmount: newPaid,
          status: fullyPaid ? "paid" : inst.status === "paid" ? "paid" : inst.dueDate < paidAt ? "late" : "pending",
          ...(fullyPaid && !inst.paidAt ? { paidAt } : {}),
        },
      })
    }

    await db.orderPayment.create({
      data: {
        orderId: order.id,
        method: input.method || "cash",
        amount: applied,
        reference: input.reference || null,
        notes: input.notes || null,
        paymentAccountId: input.paymentAccountId || null,
        paidAt,
        status: "verified",
      },
    })

    const remainingCount = await db.installment.count({
      where: { orderId: order.id, status: { not: "paid" } },
    })
    let completed = false
    if (remainingCount === 0) {
      await db.order.update({
        where: { id: order.id },
        data: { creditStatus: "completed", paymentStatus: "paid" },
      })
      completed = true
    }

    return { applied, completed, remainingCount }
  }

  /**
   * Reemplaza el plan de cuotas del crédito: elimina las cuotas NO pagadas y crea
   * las nuevas. Recibe el client de transacción (base real) o el doble de prueba.
   */
  private async applyReschedule(
    db: PrismaClient | Prisma.TransactionClient,
    order: { id: string },
    count: number,
    periodDays: number,
    totalAmount: number,
    start: Date,
    each: number
  ): Promise<void> {
    await db.installment.deleteMany({
      where: { orderId: order.id, status: { not: "paid" } },
    })
    for (let i = 0; i < count; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i * periodDays)
      await db.installment.create({
        data: { orderId: order.id, number: i + 1, amount: each, dueDate: d, status: "pending" },
      })
    }

    await db.order.update({
      where: { id: order.id },
      data: { totalCredito: totalAmount, creditStatus: "active" },
    })
  }

  /**
   * Recalcula el plan de cuotas: reemplaza las cuotas existentes por un nuevo
   * esquema de `count` cuotas de `totalAmount / count` separadas por
   * `periodDays` desde `startDate`. El saldo pendiente (o `totalAmount` si se
   * pasa) es la base del nuevo plan. Emite `credit.updated`.
   */
  async reschedule(ctx: StoreServiceContext, input: RescheduleInput): Promise<CreditDetail> {
    const order = await this.loadActiveCredit(ctx, input.orderId)
    const count = Math.round(Number(input.count))
    const periodDays = Math.round(Number(input.periodDays))

    if (!Number.isFinite(count) || count < 1 || count > 24) {
      throw serviceError("La cantidad de cuotas debe estar entre 1 y 24", 400)
    }
    if (!Number.isFinite(periodDays) || periodDays < 1 || periodDays > 120) {
      throw serviceError("La periodicidad debe estar entre 1 y 120 días", 400)
    }

    const installments = await this.db.installment.findMany({
      where: { orderId: order.id, status: { not: "paid" } },
    })
    const pendingTotal = installments.reduce((s, i) => s + (i.amount - (i.paidAmount ?? 0)), 0)

    const totalAmount = input.totalAmount !== undefined && input.totalAmount !== null
      ? Number(input.totalAmount)
      : pendingTotal
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      throw serviceError("El crédito no tiene saldo pendiente para recalcular", 400)
    }

    const start = input.startDate ?? new Date()
    const each = totalAmount / count

    // FASE 8G: reemplazo atómico del plan de cuotas sobre la base real. Solo se
    // eliminan las cuotas NO pagadas; el historial ya pagado se preserva.
    const isRealDb = this.db === prisma
    if (isRealDb) {
      await prisma.$transaction((tx) => this.applyReschedule(tx, order, count, periodDays, totalAmount, start, each))
    } else {
      await this.applyReschedule(this.db, order, count, periodDays, totalAmount, start, each)
    }

    await createAuditEntry({
      action: "credit.rescheduled",
      entity: "Order",
      entityId: order.id,
      metadata: { count, periodDays, totalAmount, startDate: start.toISOString() },
      storeId: ctx.storeId,
      userId: ctx.userId,
    })

    fireDomainEvent({
      type: "credit.updated",
      data: { orderId: order.id, action: "rescheduled", count, periodDays, totalAmount },
      aggregateId: order.id,
      aggregateType: "Order",
      tenantId: ctx.storeId,
      actorId: ctx.userId,
      source: "credit.service:reschedule",
    })

    return this.getDetail(ctx, order.id)
  }

  async cancel(ctx: StoreServiceContext, orderId: string, reason?: string | null): Promise<CreditDetail> {
    await this.loadActiveCredit(ctx, orderId)

    await this.db.order.update({
      where: { id: orderId },
      data: { creditStatus: "cancelled" },
    })

    await createAuditEntry({
      action: "credit.cancelled",
      entity: "Order",
      entityId: orderId,
      metadata: { reason: reason || null },
      storeId: ctx.storeId,
      userId: ctx.userId,
    })

    fireDomainEvent({
      type: "credit.updated",
      data: { orderId, action: "cancelled", reason: reason || null },
      aggregateId: orderId,
      aggregateType: "Order",
      tenantId: ctx.storeId,
      actorId: ctx.userId,
      source: "credit.service:cancel",
    })

    return this.getDetail(ctx, orderId)
  }

  // ─── Internos ───────────────────────────────────────────────────────────

  private async loadCredit(ctx: StoreServiceContext, orderId: string) {
    const order = await this.db.order.findUnique({ where: { id: orderId } })
    if (!order || order.storeId !== ctx.storeId) {
      throw serviceError("Crédito no encontrado", 404)
    }
    if (!order.creditTerm) {
      throw serviceError("La orden no es un crédito", 400)
    }
    return order
  }

  private async loadActiveCredit(ctx: StoreServiceContext, orderId: string) {
    const order = await this.loadCredit(ctx, orderId)
    const effective = this.normalizeStatus(order.creditStatus)
    if (effective === "cancelled") {
      throw serviceError("El crédito está cancelado", 400)
    }
    if (effective === "completed") {
      throw serviceError("El crédito ya está saldado", 400)
    }
    return order
  }

  private normalizeStatus(raw: string | null | undefined): CreditStatus {
    if (raw === "cancelled") return "cancelled"
    if (raw === "completed") return "completed"
    return "active"
  }

  private toSummary(
    order: {
      id: string
      orderNumber: string
      customerId: string | null
      customerName: string
      customerPhone: string
      createdAt: Date
      total: number
      downPayment: number | null
      totalCredito: number | null
      creditStatus: string | null
    },
    installments: Array<{
      number: number
      amount: number
      paidAmount: number | null
      paidAt: Date | null
      dueDate: Date
      status: string
    }>,
    attempts = 0
  ): CreditSummary {
    const totalCredito = order.totalCredito ?? order.total
    let paid = 0
    let pending = 0
    let paidInstallments = 0
    let nextDueDate: Date | null = null
    let nextAmount: number | null = null
    let lastPaymentAt: Date | null = null
    let hasOverdue = false
    let overdueDays = 0

    for (const inst of installments) {
      const paidAmount = inst.paidAmount ?? 0
      if (inst.status === "paid" || paidAmount >= inst.amount - 0.001) {
        paid += inst.amount
        paidInstallments++
        if (inst.paidAt && (!lastPaymentAt || inst.paidAt > lastPaymentAt)) {
          lastPaymentAt = inst.paidAt
        }
        continue
      }
      paid += paidAmount
      const due = inst.amount - paidAmount
      pending += due
      if (inst.dueDate < new Date()) {
        hasOverdue = true
        overdueDays = Math.max(overdueDays, Math.floor((Date.now() - inst.dueDate.getTime()) / 86400000))
      }
      if (!nextDueDate || inst.dueDate < nextDueDate) {
        nextDueDate = inst.dueDate
        nextAmount = due
      }
    }

    const creditStatus = this.normalizeStatus(order.creditStatus)
    let state: CreditState
    if (creditStatus === "cancelled") {
      state = "cancelled"
    } else if (creditStatus === "completed" || installments.length > 0 && paidInstallments === installments.length) {
      state = "paid"
    } else if (hasOverdue) {
      state = "overdue"
    } else if (nextDueDate && nextDueDate.getTime() - Date.now() <= UPCOMING_WINDOW_DAYS * 86400000) {
      state = "upcoming"
    } else {
      state = "on_time"
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      createdAt: order.createdAt.toISOString(),
      total: order.total,
      downPayment: order.downPayment ?? 0,
      totalCredito,
      paid,
      pending,
      paidPercent: totalCredito > 0 ? Math.min(100, Math.round((paid / totalCredito) * 100)) : 100,
      state,
      creditStatus: state === "cancelled" ? "cancelled" : state === "paid" ? "completed" : "active",
      installmentsTotal: installments.length,
      paidInstallments,
      nextDueDate: nextDueDate ? nextDueDate.toISOString() : null,
      nextAmount: nextAmount,
      overdueDays,
      lastPaymentAt: lastPaymentAt ? lastPaymentAt.toISOString() : null,
      attempts,
    }
  }

  private matchesStatus(c: CreditSummary, status: string): boolean {
    switch (status) {
      case "pending":
      case "active":
        return c.state !== "paid" && c.state !== "cancelled"
      case "late":
        return c.state === "overdue"
      case "paid":
      case "completed":
        return c.state === "paid"
      case "cancelled":
        return c.state === "cancelled"
      case "upcoming":
        return c.state === "upcoming"
      case "overdue":
        return c.state === "overdue"
      case "on_time":
        return c.state === "on_time"
      default:
        return true
    }
  }

  private async computeKpis(ctx: StoreServiceContext, credits: CreditSummary[]): Promise<CreditKpis> {
    const active = credits.filter((c) => c.state !== "paid" && c.state !== "cancelled")
    const overdue = active.filter((c) => c.state === "overdue")

    const totalPending = active.reduce((s, c) => s + c.pending, 0)
    const overdueAmount = overdue.reduce((s, c) => s + c.pending, 0)

    const now = new Date()
    const start = new Date(now)
    start.setDate(start.getDate() + 1)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    end.setHours(23, 59, 59, 999)

    const dueRows = await this.db.installment.findMany({
      where: {
        order: { storeId: ctx.storeId, creditTerm: { not: null }, creditStatus: { not: "cancelled" } },
        status: { not: "paid" },
        dueDate: { gte: start, lte: end },
      },
      select: { amount: true, paidAmount: true },
    })
    const dueNext7Days = dueRows.reduce((s, r) => s + (r.amount - (r.paidAmount ?? 0)), 0)

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const recovered = await this.db.orderPayment.aggregate({
      where: {
        status: "verified",
        paidAt: { gte: monthStart },
        order: { storeId: ctx.storeId, creditTerm: { not: null }, creditStatus: { not: "cancelled" } },
      },
      _sum: { amount: true },
    })
    const recoveredThisMonth = recovered._sum.amount ?? 0

    return {
      totalPending,
      activeCredits: active.length,
      overdueCredits: overdue.length,
      overdueAmount,
      dueNext7Days,
      recoveredThisMonth,
      recoveryRate: recoveredThisMonth + totalPending > 0 ? recoveredThisMonth / (recoveredThisMonth + totalPending) : 0,
    }
  }

  private async buildTimeline(
    ctx: StoreServiceContext,
    order: { id: string; orderNumber: string; totalCredito: number | null; createdAt: Date; creditStatus: string | null },
    installments: Array<{ id: string; number: number; amount: number; paidAmount: number | null; dueDate: Date; status: string; paidAt: Date | null }>,
    payments: Array<{ id: string; amount: number; method: string; reference: string | null; notes: string | null; paidAt: Date | null; createdAt: Date }>,
    contacts: Array<{ id: string; level: number; templateName: string | null; status: string; sentAt: Date | null; respondedAt: Date | null; createdAt: Date }> = []
  ): Promise<CreditTimelineEntry[]> {
    const entries: CreditTimelineEntry[] = []

    entries.push({
      type: "created",
      date: order.createdAt.toISOString(),
      title: "Crédito otorgado",
      description: `Orden #${order.orderNumber} · $${(order.totalCredito ?? 0).toFixed(2)} diferidos`,
      amount: order.totalCredito ?? 0,
    })

    for (const p of payments) {
      entries.push({
        type: "payment",
        date: (p.paidAt ?? p.createdAt).toISOString(),
        title: `Abono de $${p.amount.toFixed(2)}`,
        description: [p.method, p.reference, p.notes].filter(Boolean).join(" · "),
        amount: p.amount,
      })
    }

    for (const c of contacts) {
      if (c.status === "sent" || c.status === "responded") {
        entries.push({
          type: "reminder_sent",
          date: (c.sentAt ?? c.createdAt).toISOString(),
          title: `Aviso de cobranza enviado (nivel ${c.level})`,
          description: c.templateName ?? undefined,
        })
      }
      if (c.status === "responded") {
        entries.push({
          type: "client_responded",
          date: (c.respondedAt ?? c.createdAt).toISOString(),
          title: "El cliente respondió",
          description: c.templateName ?? undefined,
        })
      }
    }

    const audits = await this.db.auditLog.findMany({
      where: { storeId: ctx.storeId, entityId: order.id, action: { in: ["credit.rescheduled", "credit.cancelled"] } },
      orderBy: { createdAt: "asc" },
    })
    for (const a of audits) {
      if (a.action === "credit.rescheduled") {
        const meta = this.safeParseMeta(a.metadata)
        entries.push({
          type: "rescheduled",
          date: a.createdAt.toISOString(),
          title: "Cuotas recalculadas",
          description: `${meta.count ?? "?"} cuotas · periodicidad ${meta.periodDays ?? "?"} días · total $${Number(meta.totalAmount ?? 0).toFixed(2)}`,
        })
      } else {
        const meta = this.safeParseMeta(a.metadata)
        entries.push({
          type: "cancelled",
          date: a.createdAt.toISOString(),
          title: "Crédito cancelado",
          description: typeof meta.reason === "string" && meta.reason ? meta.reason : undefined,
        })
      }
    }

    for (const inst of installments) {
      if (inst.status !== "paid" && (inst.paidAmount ?? 0) < inst.amount - 0.001 && inst.dueDate < new Date()) {
        entries.push({
          type: "overdue",
          date: inst.dueDate.toISOString(),
          title: `Cuota #${inst.number} vencida`,
          description: `Pendiente $${(inst.amount - (inst.paidAmount ?? 0)).toFixed(2)}`,
        })
      }
    }

    const creditStatus = this.normalizeStatus(order.creditStatus)
    if (creditStatus === "completed") {
      const lastPaid = payments.length > 0
        ? payments[payments.length - 1].paidAt ?? payments[payments.length - 1].createdAt
        : new Date()
      entries.push({
        type: "completed",
        date: lastPaid.toISOString(),
        title: "Crédito saldado",
        description: "Todas las cuotas fueron pagadas",
      })
    }

    return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  private safeParseMeta(metadata: string | null): Record<string, unknown> {
    if (!metadata) return {}
    try {
      const parsed = JSON.parse(metadata)
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {}
    } catch {
      return {}
    }
  }
}
