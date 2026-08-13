/**
 * CollectionService (FASE 6B) — Smart Collection Automation.
 *
 * Asistente de cobranza que NUNCA envía mensajes automáticamente: solo prepara
 * recordatorios que el usuario revisa y envía (p.ej. por WhatsApp), y registra
 * cada contacto en un historial para el timeline del crédito.
 *
 * Capacidades:
 *   - Plantillas editables por categoría con variables dinámicas y restauración
 *     de las 5 plantillas por defecto.
 *   - Métodos de pago configurables por tienda (se inyectan en {{metodos_pago}}).
 *   - Niveles de cobranza sugeridos por días de atraso (cambiables manualmente).
 *   - Preparación de recordatorios (evento collection.reminder.prepared) y
 *     marcado de estado (sent/responded → collection.reminder.sent).
 *   - Historial de contacto y recomendaciones diarias ("¿a quién contactar hoy?").
 *
 * Emite eventos de dominio `collection.*` y audita las mutaciones.
 */
import { Prisma, PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { createAuditEntry } from "@/lib/audit"
import { fireDomainEvent } from "@/lib/events"
import { serviceError } from "@/services/errors"
import type { StoreServiceContext } from "@/services/context"
import { buildWhatsAppUrl, suggestCategory, suggestLevel } from "@/lib/collection"

export const COLLECTION_TEMPLATE_CATEGORIES = [
  "primer_recordatorio",
  "segundo_recordatorio",
  "ultimo_aviso",
  "despues_abono",
  "agradecimiento",
] as const
export type CollectionTemplateCategory = (typeof COLLECTION_TEMPLATE_CATEGORIES)[number]

export const COLLECTION_LEVELS = [1, 2, 3] as const
export type CollectionLevel = (typeof COLLECTION_LEVELS)[number]

export const COLLECTION_CHANNELS = ["whatsapp", "call", "sms", "email", "other"] as const
export type CollectionChannel = (typeof COLLECTION_CHANNELS)[number]

export const COLLECTION_CONTACT_STATUSES = ["pending", "sent", "responded"] as const
export type CollectionContactStatus = (typeof COLLECTION_CONTACT_STATUSES)[number]

/** Categoría de plantilla → metadatos de UI. */
export const COLLECTION_CATEGORY_META: Record<CollectionTemplateCategory, { label: string; level: CollectionLevel; description: string }> = {
  primer_recordatorio: { label: "Primer recordatorio", level: 1, description: "Aviso amistoso antes o al vencerse la cuota." },
  segundo_recordatorio: { label: "Segundo recordatorio", level: 2, description: "Aviso formal tras unos días de atraso." },
  ultimo_aviso: { label: "Último aviso", level: 3, description: "Aviso firme con plazo límite." },
  despues_abono: { label: "Mensaje después de un abono", level: 1, description: "Confirma el abono y muestra el nuevo saldo." },
  agradecimiento: { label: "Agradecimiento por pago completo", level: 1, description: "Cierra el crédito con un agradecimiento." },
}

export const DEFAULT_PAYMENT_METHODS = [
  "Zelle",
  "Pago Móvil",
  "Banco Provincial",
  "Binance",
  "Efectivo",
  "Transferencia",
  "Otro",
]

/** Variables disponibles en las plantillas. */
export const COLLECTION_TEMPLATE_VARIABLES: Array<{ key: string; label: string; description: string }> = [
  { key: "cliente", label: "Nombre del cliente", description: "Nombre registrado del cliente." },
  { key: "saldo", label: "Saldo pendiente", description: "Saldo actual pendiente del crédito (formato $1.234,56)." },
  { key: "monto_abono", label: "Último abono", description: "Monto del último abono registrado." },
  { key: "fecha_vencimiento", label: "Próximo vencimiento", description: "Fecha de la próxima cuota pendiente." },
  { key: "dias_atraso", label: "Días de atraso", description: "Días de atraso de la cuota vencida más antigua." },
  { key: "metodos_pago", label: "Métodos de pago", description: "Métodos de pago configurados, separados por comas." },
  { key: "nombre_negocio", label: "Nombre del negocio", description: "Nombre de la tienda (o override en configuración)." },
]

export const BUILT_IN_TEMPLATES: Array<{ category: CollectionTemplateCategory; name: string; level: CollectionLevel; body: string }> = [
  {
    category: "primer_recordatorio",
    name: "Recordatorio amistoso",
    level: 1,
    body: "Hola {{cliente}}, le recordamos amablemente que su cuota vence el {{fecha_vencimiento}}. El saldo pendiente es de {{saldo}}. Si ya realizó su pago, ignore este mensaje. Gracias por su atención, {{nombre_negocio}}.",
  },
  {
    category: "segundo_recordatorio",
    name: "Aviso formal de vencimiento",
    level: 2,
    body: "Hola {{cliente}}, su cuota del {{fecha_vencimiento}} se encuentra vencida por {{dias_atraso}} día(s). Tiene un saldo pendiente de {{saldo}}. Le pedimos ponerse al día con su pago. Puede realizarlo por {{metodos_pago}}. Gracias, {{nombre_negocio}}.",
  },
  {
    category: "ultimo_aviso",
    name: "Último aviso antes de acciones",
    level: 3,
    body: "Hola {{cliente}}, este es nuestro último aviso sobre su saldo pendiente de {{saldo}}, vencido hace {{dias_atraso}} día(s). Si no recibimos su pago en los próximos días, lamentablemente tendremos que tomar acciones. Realice su pago por {{metodos_pago}} hoy mismo. {{nombre_negocio}}.",
  },
  {
    category: "despues_abono",
    name: "Confirmación de abono",
    level: 1,
    body: "Hola {{cliente}}, gracias por su abono de {{monto_abono}}. Su saldo pendiente ahora es de {{saldo}}. La próxima cuota vence el {{fecha_vencimiento}}. ¡Gracias por su compromiso, {{nombre_negocio}}!",
  },
  {
    category: "agradecimiento",
    name: "Agradecimiento por pago completo",
    level: 1,
    body: "Hola {{cliente}}, hemos recibido su pago y su crédito está saldado. ¡Gracias por su puntualidad y por su confianza en {{nombre_negocio}}! Si necesita algo más, aquí estamos.",
  },
]

export interface CollectionTemplateDTO {
  id: string
  category: CollectionTemplateCategory
  name: string
  level: CollectionLevel
  body: string
  isBuiltIn: boolean
  isActive: boolean
}

export interface CollectionSettingsDTO {
  paymentMethods: string[]
  defaultLevel: CollectionLevel
  businessName: string
}

export interface RenderedReminder {
  logId: string
  orderId: string
  orderNumber: string
  customerName: string
  customerPhone: string
  customerId: string | null
  category: CollectionTemplateCategory
  templateName: string
  level: CollectionLevel
  suggestedLevel: CollectionLevel
  overdueDays: number
  dueDate: string | null
  pending: number
  message: string
  whatsappUrl: string
}

export interface ContactLogDTO {
  id: string
  orderId: string
  orderNumber: string
  customerName: string
  customerPhone: string
  channel: string
  category: CollectionTemplateCategory | null
  level: CollectionLevel
  templateName: string | null
  message: string | null
  status: CollectionContactStatus
  userId: string | null
  sentAt: string | null
  respondedAt: string | null
  createdAt: string
}

export interface CollectionRecommendation {
  orderId: string
  orderNumber: string
  customerName: string
  customerPhone: string
  customerId: string | null
  pending: number
  overdueDays: number
  nextDueDate: string | null
  daysSinceLastContact: number | null
  attempts: number
  suggestedLevel: CollectionLevel
  suggestedCategory: CollectionTemplateCategory
}

type UpsertTemplateInput = {
  id?: string
  category: CollectionTemplateCategory
  name: string
  level?: CollectionLevel
  body: string
  isActive?: boolean
}

type PrepareInput = {
  orderId: string
  category?: CollectionTemplateCategory
  level?: CollectionLevel
  templateId?: string
  bodyOverride?: string
  channel?: CollectionChannel
}

const DEFAULT_TEMPLATE_LIMIT = 40
const MAX_PAYMENT_METHODS = 15

function formatMoney(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return ""
  const d = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export class CollectionService {
  constructor(private readonly db: PrismaClient = prisma) {}

  // ─── Plantillas ─────────────────────────────────────────────────────────

  /** Lista las plantillas del negocio, sembrando las 5 por defecto si faltan. */
  async listTemplates(ctx: StoreServiceContext): Promise<CollectionTemplateDTO[]> {
    await this.ensureBuiltInTemplates(ctx)
    const rows = await this.db.collectionTemplate.findMany({
      where: { storeId: ctx.storeId },
      orderBy: [{ category: "asc" }, { isBuiltIn: "desc" }, { createdAt: "asc" }],
      take: DEFAULT_TEMPLATE_LIMIT,
    })
    return rows.map((r) => this.toTemplate(r))
  }

  /**
   * Crea o actualiza una plantilla. Si `id` no existe, crea una nueva con la
   * categoría dada. Editar una plantilla por defecto la desconvierte en custom
   * (seguirá siendo restaurable). Emite `collection.reminder.edited`.
   */
  async upsertTemplate(ctx: StoreServiceContext, input: UpsertTemplateInput): Promise<CollectionTemplateDTO> {
    const category = this.parseCategory(input.category)
    const name = input.name.trim()
    if (!name) throw serviceError("El nombre de la plantilla es obligatorio", 400)
    if (name.length > 80) throw serviceError("El nombre no puede superar 80 caracteres", 400)

    const body = input.body.trim()
    if (!body) throw serviceError("El cuerpo de la plantilla es obligatorio", 400)
    if (body.length > 4000) throw serviceError("La plantilla no puede superar 4000 caracteres", 400)

    const level = this.parseLevel(input.level ?? COLLECTION_CATEGORY_META[category].level)

    let row
    if (input.id) {
      const existing = await this.db.collectionTemplate.findFirst({ where: { id: input.id, storeId: ctx.storeId } })
      if (!existing) throw serviceError("Plantilla no encontrada", 404)
      row = await this.db.collectionTemplate.update({
        where: { id: existing.id },
        data: { category, name, level, body, isBuiltIn: false, isActive: input.isActive ?? true },
      })
    } else {
      const existing = await this.db.collectionTemplate.findFirst({ where: { storeId: ctx.storeId, category, name } })
      if (existing) {
        row = await this.db.collectionTemplate.update({
          where: { id: existing.id },
          data: { level, body, isBuiltIn: existing.isBuiltIn, isActive: input.isActive ?? true },
        })
      } else {
        row = await this.db.collectionTemplate.create({
          data: { storeId: ctx.storeId, category, name, level, body, isActive: input.isActive ?? true, isBuiltIn: false },
        })
      }
    }

    await createAuditEntry({
      action: "collection.template.upsert",
      entity: "CollectionTemplate",
      entityId: row.id,
      metadata: { category, name, level },
      storeId: ctx.storeId,
      userId: ctx.userId,
    })
    fireDomainEvent({
      type: "collection.reminder.edited",
      data: { templateId: row.id, category, name, level },
      aggregateId: row.id,
      aggregateType: "CollectionTemplate",
      tenantId: ctx.storeId,
      actorId: ctx.userId,
      source: "collection.service:upsertTemplate",
    })

    return this.toTemplate(row)
  }

  /** Restaura las 5 plantillas por defecto (edita las existentes o crea faltantes). */
  async restoreDefaultTemplates(ctx: StoreServiceContext): Promise<CollectionTemplateDTO[]> {
    await this.ensureBuiltInTemplates(ctx, true)
    return this.listTemplates(ctx)
  }

  // ─── Configuración ──────────────────────────────────────────────────────

  async getSettings(ctx: StoreServiceContext): Promise<CollectionSettingsDTO> {
    const [settings, store] = await Promise.all([
      this.db.collectionSettings.findUnique({ where: { storeId: ctx.storeId } }),
      this.db.store.findUnique({ where: { id: ctx.storeId }, select: { name: true } }),
    ])
    const paymentMethods = this.parseMethods(settings?.paymentMethods)
    const defaultLevel = this.parseLevel(settings?.defaultLevel ?? COLLECTION_CATEGORY_META.segundo_recordatorio.level)
    return {
      paymentMethods,
      defaultLevel,
      businessName: settings?.businessName?.trim() || store?.name || "Mi negocio",
    }
  }

  async saveSettings(
    ctx: StoreServiceContext,
    input: Partial<Pick<CollectionSettingsDTO, "paymentMethods" | "defaultLevel" | "businessName">>
  ): Promise<CollectionSettingsDTO> {
    const current = await this.getSettings(ctx)

    const paymentMethods = input.paymentMethods !== undefined ? this.normalizeMethods(input.paymentMethods) : current.paymentMethods
    const defaultLevel = input.defaultLevel !== undefined ? this.parseLevel(input.defaultLevel) : current.defaultLevel
    const businessName =
      input.businessName !== undefined ? input.businessName.trim().slice(0, 80) : current.businessName

    await this.db.collectionSettings.upsert({
      where: { storeId: ctx.storeId },
      create: {
        storeId: ctx.storeId,
        paymentMethods: JSON.stringify(paymentMethods),
        defaultLevel,
        businessName: businessName || null,
      },
      update: {
        paymentMethods: JSON.stringify(paymentMethods),
        defaultLevel,
        businessName: businessName || null,
      },
    })

    await createAuditEntry({
      action: "collection.settings.updated",
      entity: "CollectionSettings",
      entityId: ctx.storeId,
      metadata: { paymentMethods, defaultLevel, businessName },
      storeId: ctx.storeId,
      userId: ctx.userId,
    })
    fireDomainEvent({
      type: "collection.settings.updated",
      data: { defaultLevel, paymentMethods },
      aggregateId: ctx.storeId,
      aggregateType: "Store",
      tenantId: ctx.storeId,
      actorId: ctx.userId,
      source: "collection.service:saveSettings",
    })

    return { paymentMethods, defaultLevel, businessName: businessName || "Mi negocio" }
  }

  // ─── Preparación de recordatorios (NUNCA envía) ─────────────────────────

  /**
   * Prepara un recordatorio: elige/valida la plantilla, renderiza las variables,
   * registra un contacto "pendiente" y devuelve el mensaje listo para revisar.
   * Panitas NO envía el mensaje: el usuario lo revisa y envía desde su canal.
   */
  async prepareReminder(ctx: StoreServiceContext, input: PrepareInput): Promise<RenderedReminder> {
    const order = await this.loadCredit(ctx, input.orderId)
    const [settings, installments, payments] = await Promise.all([
      this.getSettings(ctx),
      this.db.installment.findMany({ where: { orderId: order.id }, orderBy: { number: "asc" } }),
      this.db.orderPayment.findMany({ where: { orderId: order.id, status: "verified" }, orderBy: { paidAt: "asc" } }),
    ])

    const summary = this.computeCreditVars(order, installments, payments)
    const attempts = await this.db.collectionContactLog.count({
      where: { storeId: ctx.storeId, orderId: order.id, status: { not: "pending" } },
    })

    const category = input.category ? this.parseCategory(input.category) : suggestCategory(summary.overdueDays, attempts)
    const suggestedLevel = input.level ? this.parseLevel(input.level) : suggestLevel(summary.overdueDays)

    if (
      category === "primer_recordatorio" || category === "segundo_recordatorio" || category === "ultimo_aviso"
    ) {
      if (order.creditStatus === "completed") {
        throw serviceError("El crédito ya está saldado, no necesita recordatorio", 400)
      }
      if (summary.pending <= 0.001) {
        throw serviceError("El crédito no tiene saldo pendiente", 400)
      }
    }

    const template = await this.resolveTemplate(ctx, category, suggestedLevel, input.templateId)

    const values: Record<string, string | number> = {
      cliente: summary.customerName,
      saldo: formatMoney(summary.pending),
      monto_abono: formatMoney(summary.lastPaymentAmount),
      fecha_vencimiento: formatDate(summary.nextDueDate),
      dias_atraso: summary.overdueDays,
      metodos_pago: settings.paymentMethods.join(", "),
      nombre_negocio: settings.businessName,
    }
    const message = this.renderTemplate(input.bodyOverride?.trim() || template.body, values)

    const log = await this.db.collectionContactLog.create({
      data: {
        storeId: ctx.storeId,
        orderId: order.id,
        customerId: order.customerId,
        channel: input.channel ?? "whatsapp",
        category,
        level: suggestedLevel,
        templateName: template.name,
        message,
        status: "pending",
        userId: ctx.userId,
      },
    })

    await createAuditEntry({
      action: "collection.reminder.prepared",
      entity: "Order",
      entityId: order.id,
      metadata: { category, level: suggestedLevel, templateName: template.name },
      storeId: ctx.storeId,
      userId: ctx.userId,
    })
    fireDomainEvent({
      type: "collection.reminder.prepared",
      data: { orderId: order.id, logId: log.id, category, level: suggestedLevel, templateName: template.name },
      aggregateId: order.id,
      aggregateType: "Order",
      tenantId: ctx.storeId,
      actorId: ctx.userId,
      source: "collection.service:prepareReminder",
    })

    return {
      logId: log.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerId: order.customerId,
      category,
      templateName: template.name,
      level: suggestedLevel,
      suggestedLevel,
      overdueDays: summary.overdueDays,
      dueDate: summary.nextDueDate ? summary.nextDueDate.toISOString() : null,
      pending: summary.pending,
      message,
      whatsappUrl: buildWhatsAppUrl(order.customerPhone, message),
    }
  }

  /**
   * Marca el estado de un contacto registrado (sent / responded).
   * El usuario es quien confirma que envió el mensaje; Panitas nunca lo envía.
   */
  async markContact(ctx: StoreServiceContext, logId: string, status: CollectionContactStatus, at?: Date): Promise<ContactLogDTO> {
    const log = await this.db.collectionContactLog.findFirst({ where: { id: logId, storeId: ctx.storeId } })
    if (!log) throw serviceError("Contacto no encontrado", 404)

    const now = at ?? new Date()
    const data: Prisma.CollectionContactLogUpdateInput = {}
    if (status === "sent") {
      if (log.status === "pending") {
        data.status = "sent"
        data.sentAt = now
      }
    } else if (status === "responded") {
      data.status = "responded"
      data.respondedAt = now
      if (log.status === "pending") data.sentAt = data.sentAt ?? now
    } else {
      throw serviceError("Estado inválido", 400)
    }

    const updated = await this.db.collectionContactLog.update({ where: { id: log.id }, data })

    await createAuditEntry({
      action: `collection.contact.${status}`,
      entity: "Order",
      entityId: log.orderId,
      metadata: { logId: log.id, level: log.level, templateName: log.templateName },
      storeId: ctx.storeId,
      userId: ctx.userId,
    })
    fireDomainEvent({
      type: status === "sent" ? "collection.reminder.sent" : "collection.contact.logged",
      data: { orderId: log.orderId, logId: log.id, status, level: log.level },
      aggregateId: log.orderId,
      aggregateType: "Order",
      tenantId: ctx.storeId,
      actorId: ctx.userId,
      source: "collection.service:markContact",
    })

    return this.toContactLog(updated)
  }

  // ─── Historial ──────────────────────────────────────────────────────────

  async listHistory(ctx: StoreServiceContext, opts: { orderId?: string; customerId?: string; limit?: number } = {}): Promise<ContactLogDTO[]> {
    const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 100) : 50
    const where: Prisma.CollectionContactLogWhereInput = { storeId: ctx.storeId }
    if (opts.orderId) where.orderId = opts.orderId
    if (opts.customerId) where.customerId = opts.customerId

    const include = {
      order: { select: { orderNumber: true, customerName: true, customerPhone: true } },
    }
    const rows = await this.db.collectionContactLog.findMany({
      where,
      include,
      orderBy: { createdAt: "desc" },
      take: limit,
    })
    return rows.map((r) => this.toContactLog(r))
  }

  // ─── Recomendaciones diarias ────────────────────────────────────────────

  /** ¿A quién contactar hoy? Vencidos primero, luego próximos; sin contacto van primero. */
  async recommendations(ctx: StoreServiceContext, opts: { limit?: number } = {}): Promise<CollectionRecommendation[]> {
    const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 50) : 20

    const orders = await this.db.order.findMany({
      where: { storeId: ctx.storeId, creditTerm: { not: null }, creditStatus: { not: "cancelled" } },
      include: {
        installments: { orderBy: { number: "asc" } },
        collectionContacts: { orderBy: { createdAt: "desc" }, take: 50 },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    })

    const results: CollectionRecommendation[] = []
    for (const order of orders) {
      const summary = this.computeCreditVars(order, order.installments)
      if (order.creditStatus === "completed" && summary.pending <= 0.001) continue
      if (summary.pending <= 0.001) continue
      if (order.creditStatus === "completed") continue

      const lastContact = order.collectionContacts[0] ?? null
      const daysSinceLastContact =
        lastContact && lastContact.status !== "pending" ? Math.floor((Date.now() - lastContact.createdAt.getTime()) / 86400000) : null
      const attempts = order.collectionContacts.filter((c) => c.status !== "pending").length

      const suggestedLevel = suggestLevel(summary.overdueDays)
      results.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerId: order.customerId,
        pending: summary.pending,
        overdueDays: summary.overdueDays,
        nextDueDate: summary.nextDueDate ? summary.nextDueDate.toISOString() : null,
        daysSinceLastContact,
        attempts,
        suggestedLevel,
        suggestedCategory: suggestCategory(summary.overdueDays, attempts),
      })
    }

    return results
      .sort((a, b) => {
        const aOverdue = a.overdueDays > 0 ? 1 : 0
        const bOverdue = b.overdueDays > 0 ? 1 : 0
        if (aOverdue !== bOverdue) return bOverdue - aOverdue
        if (a.overdueDays !== b.overdueDays) return b.overdueDays - a.overdueDays
        const aNever = a.daysSinceLastContact === null ? 1 : 0
        const bNever = b.daysSinceLastContact === null ? 1 : 0
        if (aNever !== bNever) return bNever - aNever
        if (a.daysSinceLastContact !== null && b.daysSinceLastContact !== null) {
          return b.daysSinceLastContact - a.daysSinceLastContact
        }
        if (a.nextDueDate && b.nextDueDate) return new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime()
        return 0
      })
      .slice(0, limit)
  }

  // ─── Render de plantillas ───────────────────────────────────────────────

  /** Reemplaza las variables {{key}} del cuerpo con los valores dados. */
  renderTemplate(body: string, values: Record<string, string | number>): string {
    return body.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (match, key: string) => {
      const value = values[key]
      if (value === undefined || value === null) return match
      return String(value)
    })
  }

  // ─── Internos ───────────────────────────────────────────────────────────

  private async ensureBuiltInTemplates(ctx: StoreServiceContext, force = false): Promise<void> {
    const existing = await this.db.collectionTemplate.findMany({ where: { storeId: ctx.storeId } })
    const byKey = new Map(existing.map((t) => [`${t.category}:${t.name}`, t]))

    for (const builtIn of BUILT_IN_TEMPLATES) {
      const key = `${builtIn.category}:${builtIn.name}`
      const row = byKey.get(key)
      if (!row) {
        await this.db.collectionTemplate.create({
          data: {
            storeId: ctx.storeId,
            category: builtIn.category,
            name: builtIn.name,
            level: builtIn.level,
            body: builtIn.body,
            isBuiltIn: true,
            isActive: true,
          },
        })
      } else if (force) {
        await this.db.collectionTemplate.update({
          where: { id: row.id },
          data: { body: builtIn.body, level: builtIn.level, isActive: true },
        })
      }
    }
  }

  private async resolveTemplate(
    ctx: StoreServiceContext,
    category: CollectionTemplateCategory,
    level: CollectionLevel,
    templateId?: string
  ): Promise<{ name: string; body: string }> {
    if (templateId) {
      const template = await this.db.collectionTemplate.findFirst({ where: { id: templateId, storeId: ctx.storeId } })
      if (!template || !template.isActive) throw serviceError("Plantilla no encontrada", 404)
      return { name: template.name, body: template.body }
    }

    const rows = await this.db.collectionTemplate.findMany({
      where: { storeId: ctx.storeId, category, isActive: true },
      orderBy: [{ isBuiltIn: "asc" }, { createdAt: "asc" }],
    })
    const byLevel = rows.find((t) => t.level === level)
    if (byLevel) return { name: byLevel.name, body: byLevel.body }
    if (rows.length > 0) return { name: rows[0].name, body: rows[0].body }

    const builtIn = BUILT_IN_TEMPLATES.find((t) => t.category === category)
    if (builtIn) return { name: builtIn.name, body: builtIn.body }
    throw serviceError("No hay plantilla para esta categoría", 400)
  }

  private async loadCredit(ctx: StoreServiceContext, orderId: string) {
    const order = await this.db.order.findUnique({ where: { id: orderId } })
    if (!order || order.storeId !== ctx.storeId) throw serviceError("Crédito no encontrado", 404)
    if (!order.creditTerm) throw serviceError("La orden no es un crédito", 400)
    if (order.creditStatus === "cancelled") throw serviceError("El crédito está cancelado", 400)
    return order
  }

  private computeCreditVars(
    order: {
      id: string
      customerName: string
      customerPhone: string
      creditStatus: string | null
      totalCredito: number | null
    },
    installments: Array<{ number: number; amount: number; paidAmount: number | null; dueDate: Date; status: string; paidAt: Date | null }>,
    payments: Array<{ amount: number; paidAt: Date | null; createdAt: Date }> = []
  ): { customerName: string; customerPhone: string; pending: number; paid: number; overdueDays: number; nextDueDate: Date | null; lastPaymentAmount: number } {
    let pending = 0
    let paid = 0
    let hasOverdue = false
    let overdueDays = 0
    let nextDueDate: Date | null = null
    const now = Date.now()

    for (const inst of installments) {
      const paidAmount = inst.paidAmount ?? 0
      if (inst.status === "paid" || paidAmount >= inst.amount - 0.001) {
        paid += inst.amount
        continue
      }
      paid += paidAmount
      pending += inst.amount - paidAmount
      if (inst.dueDate.getTime() < now) {
        hasOverdue = true
        overdueDays = Math.max(overdueDays, Math.floor((now - inst.dueDate.getTime()) / 86400000))
      }
      if (!nextDueDate || inst.dueDate < nextDueDate) nextDueDate = inst.dueDate
    }

    const lastPayment = payments.length > 0 ? payments[payments.length - 1] : null
    return {
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      pending: Math.max(0, pending),
      paid,
      overdueDays: hasOverdue ? overdueDays : 0,
      nextDueDate,
      lastPaymentAmount: lastPayment ? lastPayment.amount : 0,
    }
  }

  private toTemplate(row: {
    id: string
    category: string
    name: string
    level: number
    body: string
    isBuiltIn: boolean
    isActive: boolean
  }): CollectionTemplateDTO {
    return {
      id: row.id,
      category: this.parseCategory(row.category),
      name: row.name,
      level: this.parseLevel(row.level),
      body: row.body,
      isBuiltIn: row.isBuiltIn,
      isActive: row.isActive,
    }
  }

  private toContactLog(
    row: {
      id: string
      orderId: string
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
      order?: { orderNumber: string; customerName: string; customerPhone: string }
    }
  ): ContactLogDTO {
    const status = this.parseStatus(row.status)
    return {
      id: row.id,
      orderId: row.orderId,
      orderNumber: row.order?.orderNumber ?? "",
      customerName: row.order?.customerName ?? "",
      customerPhone: row.order?.customerPhone ?? "",
      channel: row.channel,
      category: row.category ? this.parseCategory(row.category) : null,
      level: this.parseLevel(row.level),
      templateName: row.templateName,
      message: row.message,
      status,
      userId: row.userId,
      sentAt: row.sentAt ? row.sentAt.toISOString() : null,
      respondedAt: row.respondedAt ? row.respondedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
    }
  }

  private parseCategory(value: string): CollectionTemplateCategory {
    if (!COLLECTION_TEMPLATE_CATEGORIES.includes(value as CollectionTemplateCategory)) {
      throw serviceError(`Categoría inválida: ${value}`, 400)
    }
    return value as CollectionTemplateCategory
  }

  private parseLevel(value: number): CollectionLevel {
    const level = Number(value)
    if (!COLLECTION_LEVELS.includes(level as CollectionLevel)) {
      throw serviceError("Nivel inválido (debe ser 1, 2 o 3)", 400)
    }
    return level as CollectionLevel
  }

  private parseStatus(value: string): CollectionContactStatus {
    if (!COLLECTION_CONTACT_STATUSES.includes(value as CollectionContactStatus)) {
      return "pending"
    }
    return value as CollectionContactStatus
  }

  private parseMethods(raw: string | null | undefined): string[] {
    if (!raw) return [...DEFAULT_PAYMENT_METHODS]
    try {
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return [...DEFAULT_PAYMENT_METHODS]
      const methods = parsed.filter((m): m is string => typeof m === "string" && m.trim().length > 0).map((m) => m.trim())
      return methods.length > 0 ? methods.slice(0, MAX_PAYMENT_METHODS) : [...DEFAULT_PAYMENT_METHODS]
    } catch {
      return [...DEFAULT_PAYMENT_METHODS]
    }
  }

  private normalizeMethods(methods: string[]): string[] {
    if (!Array.isArray(methods)) throw serviceError("Métodos de pago inválidos", 400)
    const cleaned = methods
      .map((m) => (typeof m === "string" ? m.trim() : ""))
      .filter((m) => m.length > 0)
      .filter((m, i, arr) => arr.indexOf(m) === i)
    if (cleaned.length > MAX_PAYMENT_METHODS) {
      throw serviceError(`Máximo ${MAX_PAYMENT_METHODS} métodos de pago`, 400)
    }
    return cleaned
  }
}
