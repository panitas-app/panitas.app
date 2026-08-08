/**
 * Renderizado enriquecido (FASE 5D).
 *
 * Construye respuestas estructuradas para el cliente (tarjetas, tablas,
 * resúmenes) a partir de los resultados de las acciones. TODO en lenguaje
 * natural: nunca expone nombres de tools, IDs internos ni JSON crudo.
 */
import type { RichResponse, RichBlock } from "./types"

export function card(
  title: string,
  fields: Array<{ label: string; value: string | number; tone?: import("./types").BlockTone }>,
  opts: { subtitle?: string; badge?: string; tone?: import("./types").BlockTone; actions?: import("./types").QuickAction[] } = {},
): RichResponse {
  return { kind: "card", title, subtitle: opts.subtitle, blocks: [cardBlock(title, fields, { subtitle: opts.subtitle, badge: opts.badge, tone: opts.tone, actions: opts.actions })] }
}

export function summary(title: string, items: Array<{ label: string; value: string | number; emphasis?: "normal" | "strong" | "muted" }>): RichResponse {
  return { kind: "summary", title, blocks: [{ kind: "summary", title, items }] }
}

export function table(title: string, headers: string[], rows: Array<Array<string | number>>, opts: { sortable?: boolean; searchable?: boolean; filterable?: boolean; paginated?: boolean; pageSize?: number; expandable?: boolean; expandRows?: Array<Array<{ label: string; value: string | number }>> } = {}): RichResponse {
  return { kind: "table", title, blocks: [tableBlock(title, headers, rows, opts)] }
}

export function textBlock(text: string): RichBlock {
  return { kind: "text", text }
}

/** Formatea un número como moneda (USD por defecto). */
export function money(value: number | null | undefined): string {
  if (value === null || value === undefined) return "$0.00"
  return `$${Number(value).toFixed(2)}`
}

// ─── Bloques FASE 5E ─────────────────────────────────────────────────────────
// Builders semánticos que el executor usa para emitir bloques que el
// ConversationRenderer convierte en componentes (kpi, chart, monitor, list,
// quick-actions, financial). Nunca exponen tool names ni IDs internos.

/** Grilla de KPIs (métricas con delta opcional). */
export function kpiBlock(
  title: string,
  items: Array<{ label: string; value: string | number; delta?: number; deltaLabel?: string; emphasis?: "normal" | "strong" | "muted" }>,
): RichBlock {
  return { kind: "kpi", title, items }
}

/** Gráfico condicional: el renderer decide si dibuja según `minPoints`. */
export function chartBlock(
  title: string,
  type: "bar" | "line" | "donut" | "sparkline",
  data: Array<{ label: string; value: number; color?: string }>,
  opts: { subtitle?: string; minPoints?: number; currency?: boolean; percent?: boolean } = {},
): RichBlock {
  return { kind: "chart", title, type, data, ...opts }
}

/** Lista simple de entidades (icono + título + metadatos). */
export function listBlock(
  items: Array<{ title: string; subtitle?: string; icon?: string; metadata?: string[]; badge?: string; tone?: import("./types").BlockTone }>,
  opts: { title?: string; icon?: string; tone?: import("./types").BlockTone } = {},
): RichBlock {
  return { kind: "list", title: opts.title, icon: opts.icon, tone: opts.tone, items }
}

/** Tarjeta de monitor inteligente (alerta + acciones opcionales). */
export function monitorBlock(
  tone: import("./types").BlockTone,
  title: string,
  opts: { icon?: string; description?: string; severity?: "info" | "warning" | "critical"; actions?: import("./types").QuickAction[] } = {},
): RichBlock {
  return { kind: "monitor", tone, title, icon: opts.icon, description: opts.description, severity: opts.severity, actions: opts.actions }
}

/** Fila de acciones rápidas (se reenvían al asistente). */
export function quickActionsBlock(items: import("./types").QuickAction[], opts: { title?: string } = {}): RichBlock {
  return { kind: "quick-actions", title: opts.title, items }
}

/** Componente financiero (punto de equilibrio, utilidad, margen, flujo). */
export function financialBlock(
  title: string,
  metrics: Array<{ label: string; value: string | number; tone?: import("./types").BlockTone; icon?: string }>,
  opts: { breakEven?: { revenue: number; units?: number; margin: number }; expenseBreakdown?: Array<{ label: string; value: number; percentage: number }> } = {},
): RichBlock {
  return { kind: "financial", title, metrics, breakEven: opts.breakEven, expenseBreakdown: opts.expenseBreakdown }
}

/** Tarjeta genérica extendida con tono y acciones (FASE 5E). */
export function cardBlock(
  title: string,
  fields: Array<{ label: string; value: string | number; tone?: import("./types").BlockTone }>,
  opts: { subtitle?: string; badge?: string; tone?: import("./types").BlockTone; actions?: import("./types").QuickAction[] } = {},
): RichBlock {
  return { kind: "card", title, subtitle: opts.subtitle, badge: opts.badge, tone: opts.tone, fields, actions: opts.actions }
}

/** Tabla extendida con orden/búsqueda/filtro/expansión (FASE 5E). */
export function tableBlock(
  title: string,
  headers: string[],
  rows: Array<Array<string | number>>,
  opts: { sortable?: boolean; searchable?: boolean; filterable?: boolean; paginated?: boolean; pageSize?: number; expandable?: boolean; expandRows?: Array<Array<{ label: string; value: string | number }>> } = {},
): RichBlock {
  return { kind: "table", title, headers, rows, ...opts }
}

/** Normaliza un objeto de producto para una tarjeta. */
export function productCard(
  product: {
    name?: string | null
    price?: number | null
    stock?: number | null
    sku?: string | null
    description?: string | null
  },
  opts: { actions?: import("./types").QuickAction[]; lowStock?: boolean } = {},
): RichResponse {
  const fields: Array<{ label: string; value: string | number; tone?: import("./types").BlockTone }> = [
    { label: "Precio", value: money(product.price ?? 0) },
    { label: "Stock", value: product.stock ?? 0, tone: opts.lowStock ? "danger" : "success" },
  ]
  if (product.sku) fields.push({ label: "SKU", value: product.sku })
  if (product.description) fields.push({ label: "Descripción", value: product.description })
  const badge = opts.lowStock ? "Stock bajo" : undefined
  return card(product.name ?? "Producto", fields, { badge, actions: opts.actions })
}

/** Resumen de una venta registrada. */
export function saleSummary(order: {
  orderNumber?: string | null
  total?: number | null
  subtotal?: number | null
  discount?: number | null
  paymentStatus?: string | null
  customerName?: string | null
  items?: Array<{ productName?: string | null; quantity?: number | null; price?: number | null }>
}): RichResponse {
  const blocks: RichBlock[] = []
  if (Array.isArray(order.items) && order.items.length > 0) {
    const rows = order.items.map((i) => [i.productName ?? "Producto", i.quantity ?? 0, money(i.price ?? 0)] as Array<string | number>)
    blocks.push({ kind: "table", title: "Productos", headers: ["Producto", "Cant.", "Precio"], rows })
  }
  const items: Array<{ label: string; value: string | number; emphasis?: "normal" | "strong" | "muted" }> = [
    { label: "Subtotal", value: money(order.subtotal ?? 0) },
  ]
  if (order.discount) items.push({ label: "Descuento", value: `-${money(order.discount)}` })
  items.push({ label: "Total", value: money(order.total ?? 0), emphasis: "strong" })
  const block: RichBlock = { kind: "summary", title: "Resumen de la venta", items }
  blocks.push(block)
  return { kind: "card", title: `Venta #${order.orderNumber ?? ""} registrada`, subtitle: order.customerName ?? undefined, blocks }
}

/** Tabla de productos para búsqueda. */
export function productsTable(products: Array<{ name?: string | null; price?: number | null; stock?: number | null }>): RichResponse {
  const rows = products.map((p) => [p.name ?? "Producto", money(p.price ?? 0), p.stock ?? 0] as Array<string | number>)
  return table("Productos encontrados", ["Producto", "Precio", "Stock"], rows, { sortable: true, searchable: true })
}

/** Tarjeta de gasto registrado. */
export function expenseCard(
  expense: { description?: string | null; amount?: number | null; category?: string | null; date?: Date | string | null; paymentMethod?: string | null; vendor?: string | null },
  opts: { actions?: import("./types").QuickAction[] } = {},
): RichResponse {
  const fields: Array<{ label: string; value: string | number; tone?: import("./types").BlockTone }> = [
    { label: "Monto", value: money(expense.amount ?? 0) },
    { label: "Categoría", value: expense.category ?? "otros" },
  ]
  if (expense.vendor) fields.push({ label: "Proveedor", value: expense.vendor })
  if (expense.date) fields.push({ label: "Fecha", value: new Date(expense.date).toLocaleDateString("es-VE") })
  if (expense.paymentMethod) fields.push({ label: "Pago", value: expense.paymentMethod.replace(/_/g, " ") })
  return card(expense.description ?? "Gasto registrado", fields, { actions: opts.actions })
}

/** Tabla de gastos. */
export function expensesTable(expenses: Array<{ description?: string | null; amount?: number | null; category?: string | null; date?: Date | string | null; vendor?: string | null }>): RichResponse {
  const rows = expenses.map((e) => [e.description ?? "Gasto", e.category ?? "otros", e.vendor || "—", money(e.amount ?? 0)] as Array<string | number>)
  return table("Gastos", ["Descripción", "Categoría", "Proveedor", "Monto"], rows, { searchable: true, sortable: true, paginated: true })
}

/** Tarjeta de cliente. */
export function customerCard(
  customer: { name?: string | null; phone?: string | null; totalSpent?: number | null; totalOrders?: number | null },
  opts: { actions?: import("./types").QuickAction[] } = {},
): RichResponse {
  const fields: Array<{ label: string; value: string | number; tone?: import("./types").BlockTone }> = []
  if (customer.phone) fields.push({ label: "Teléfono", value: customer.phone })
  fields.push({ label: "Total comprado", value: money(customer.totalSpent ?? 0) })
  fields.push({ label: "Pedidos", value: customer.totalOrders ?? 0 })
  return card(customer.name ?? "Cliente", fields, { actions: opts.actions })
}

/** Tabla de clientes. */
export function customersTable(customers: Array<{ name?: string | null; phone?: string | null; totalSpent?: number | null; totalOrders?: number | null }>): RichResponse {
  const rows = customers.map((c) => [c.name ?? "Cliente", c.phone ?? "—", c.totalOrders ?? 0, money(c.totalSpent ?? 0)] as Array<string | number>)
  return table("Clientes", ["Nombre", "Teléfono", "Pedidos", "Total"], rows, { searchable: true, sortable: true, paginated: true })
}

/** Historial de compras de un cliente. */
export function customerHistory(customer: { name?: string | null }, orders: Array<{ orderNumber?: string | null; createdAt?: Date | string | null; total?: number | null; status?: string | null }>): RichResponse {
  const rows = orders.map((o) => [o.orderNumber ?? "—", new Date(o.createdAt ?? "").toLocaleDateString("es-VE"), o.status ?? "—", money(o.total ?? 0)] as Array<string | number>)
  return table(`Historial de ${customer.name ?? "cliente"}`, ["Pedido", "Fecha", "Estado", "Total"], rows)
}

/** Tabla de pedidos pendientes. */
export function ordersTable(orders: Array<{ orderNumber?: string | null; customerName?: string | null; total?: number | null; status?: string | null; createdAt?: Date | string | null }>): RichResponse {
  const rows = orders.map((o) => [o.orderNumber ?? "—", o.customerName ?? "—", o.status ?? "—", money(o.total ?? 0)] as Array<string | number>)
  return table("Pedidos pendientes", ["N°", "Cliente", "Estado", "Total"], rows, { sortable: true, searchable: true })
}

/** Detalle de un pedido. */
export function orderCard(
  order: {
    orderNumber?: string | null
    customerName?: string | null
    status?: string | null
    total?: number | null
    paymentStatus?: string | null
    createdAt?: Date | string | null
    items?: Array<{ productName?: string | null; quantity?: number | null; price?: number | null }>
  },
  opts: { actions?: import("./types").QuickAction[] } = {},
): RichResponse {
  const blocks: RichBlock[] = []
  if (Array.isArray(order.items) && order.items.length > 0) {
    const rows = order.items.map((i) => [i.productName ?? "Producto", i.quantity ?? 0, money(i.price ?? 0)] as Array<string | number>)
    blocks.push({ kind: "table", title: "Productos", headers: ["Producto", "Cant.", "Precio"], rows })
  }
  blocks.push({
    kind: "summary",
    title: "Resumen",
    items: [
      { label: "Estado", value: order.status ?? "—" },
      { label: "Pago", value: order.paymentStatus ?? "—" },
      { label: "Fecha", value: order.createdAt ? new Date(order.createdAt).toLocaleDateString("es-VE") : "—" },
      { label: "Total", value: money(order.total ?? 0), emphasis: "strong" },
    ],
  })
  if (opts.actions?.length) blocks.push(quickActionsBlock(opts.actions))
  return { kind: "card", title: `Pedido #${order.orderNumber ?? ""}`, subtitle: order.customerName ?? undefined, blocks }
}

/** Resumen de ventas (período). */
export function salesSummary(data: {
  revenue?: number | null
  totalOrders?: number | null
  totalItems?: number | null
  averageTicket?: number | null
}): RichResponse {
  return summary("Resumen de ventas", [
    { label: "Ingresos", value: money(data.revenue ?? 0), emphasis: "strong" },
    { label: "Pedidos", value: data.totalOrders ?? 0 },
    { label: "Artículos", value: data.totalItems ?? 0 },
    { label: "Ticket promedio", value: money(data.averageTicket ?? 0) },
  ])
}

/** Resumen de ventas diario/semanal/mensual (sales.getTodaySummary). */
export function salesOverviewSummary(data: Record<string, unknown>): RichResponse {
  const period = (key: string, label: string): Array<{ label: string; value: string | number; emphasis?: "normal" | "strong" | "muted" }> => {
    const p = (data[key] ?? {}) as Record<string, unknown>
    return [
      { label, value: money(typeof p.revenue === "number" ? p.revenue : 0), emphasis: "strong" },
      { label: "Pedidos", value: typeof p.totalOrders === "number" ? p.totalOrders : 0 },
    ]
  }
  const blocks: RichBlock[] = []
  const top = (data.topProducts ?? []) as Array<{ name?: string; quantity?: number }>
  if (Array.isArray(top) && top.length >= 2) {
    blocks.push(chartBlock("Productos más vendidos", "bar", top.map((p) => ({ label: p.name ?? "Producto", value: p.quantity ?? 0 })), { minPoints: 2 }))
  }
  blocks.push({ kind: "summary", title: "Resumen de ventas", items: [...period("today", "Hoy"), ...period("week", "Semana"), ...period("month", "Mes"), { label: "Ticket promedio", value: money(typeof data.averageTicket === "number" ? data.averageTicket : 0) }] })
  return { kind: "summary", title: "Resumen de ventas", blocks }
}

/** Resumen de gastos con total por categoría. */
export function expensesSummary(total: number, count: number, byCategory: Array<{ category: string; total: number }>): RichResponse {
  const blocks: RichBlock[] = [
    {
      kind: "summary",
      title: "Resumen de gastos",
      items: [
        { label: "Total de gastos", value: money(total), emphasis: "strong" },
        { label: "Registros", value: count },
      ],
    },
  ]
  if (byCategory.length > 0) {
    blocks.push({
      kind: "table",
      title: "Por categoría",
      headers: ["Categoría", "Total"],
      rows: byCategory.map((c) => [c.category, money(c.total)] as Array<string | number>),
    })
  }
  return { kind: "summary", title: "Resumen de gastos", blocks }
}

// ─── Cobranza (FASE 6A) ──────────────────────────────────────────────────────

const CREDIT_STATE_LABEL: Record<string, string> = {
  on_time: "Al día",
  upcoming: "Próximo a vencer",
  overdue: "Vencido",
  paid: "Pagado",
  cancelled: "Cancelado",
}

export type RichCredit = {
  customerName: string
  orderNumber: string
  pending: number
  paidPercent: number
  state: string
  nextDueDate?: string | null
  overdueDays?: number
}

function creditDate(d: string | null | undefined): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" })
}

/** Resumen KPI de cobranza (total pendiente, vencidos, próximo vencimiento). */
export function creditsSummary(
  kpis: { totalPending: number; activeCredits: number; overdueCredits: number; overdueAmount: number; dueNext7Days: number; recoveredThisMonth: number; recoveryRate: number },
): RichResponse {
  const blocks: RichBlock[] = [
    kpiBlock("Cobranza", [
      { label: "Total por cobrar", value: money(kpis.totalPending), emphasis: "strong" },
      { label: "Créditos activos", value: kpis.activeCredits },
      { label: "Vencidos", value: kpis.overdueCredits, emphasis: kpis.overdueCredits > 0 ? "strong" : "normal" },
      { label: "Monto vencido", value: money(kpis.overdueAmount), emphasis: kpis.overdueAmount > 0 ? "strong" : "normal" },
      { label: "Vence en 7 días", value: money(kpis.dueNext7Days) },
      { label: "Cobrado este mes", value: money(kpis.recoveredThisMonth) },
      { label: "% recuperación", value: `${Math.round(kpis.recoveryRate * 100)}%` },
    ]),
  ]
  return { kind: "summary", title: "Resumen de cobranza", blocks }
}

/** Tarjeta de un crédito con su estado. */
export function creditCard(
  credit: RichCredit,
  opts: { subtitle?: string; badge?: string; actions?: import("./types").QuickAction[] } = {},
): RichResponse {
  const fields: Array<{ label: string; value: string | number; tone?: import("./types").BlockTone }> = [
    { label: "Saldo pendiente", value: money(credit.pending), tone: credit.state === "overdue" ? "warning" : undefined },
    { label: "Avance", value: `${credit.paidPercent}%` },
  ]
  if (credit.state === "overdue") {
    fields.push({ label: "Vencido", value: `${credit.overdueDays ?? 0} días`, tone: "danger" })
  } else if (credit.nextDueDate) {
    fields.push({ label: "Próxima cuota", value: creditDate(credit.nextDueDate) })
  }
  return {
    kind: "card",
    title: credit.customerName,
    subtitle: opts.subtitle ?? `Orden #${credit.orderNumber}`,
    blocks: [cardBlock(credit.customerName, fields, { subtitle: opts.subtitle ?? `Orden #${credit.orderNumber}`, badge: opts.badge ?? CREDIT_STATE_LABEL[credit.state] ?? credit.state, actions: opts.actions })],
  }
}

/** Lista de créditos para respuestas de cobranza. */
export function creditsList(
  credits: RichCredit[],
  opts: { title?: string; tone?: import("./types").BlockTone } = {},
): RichBlock {
  return listBlock(
    credits.map((c) => ({
      title: c.customerName,
      subtitle: `Orden #${c.orderNumber} · ${money(c.pending)}`,
      icon: c.state === "overdue" ? "alert-triangle" : "calendar-check",
      badge: CREDIT_STATE_LABEL[c.state] ?? c.state,
      metadata: [c.state === "overdue" ? `Vencido ${c.overdueDays ?? 0} días` : creditDate(c.nextDueDate)],
      tone: c.state === "overdue" ? "warning" : undefined,
    })),
    { title: opts.title ?? "Créditos", icon: "wallet", tone: opts.tone },
  )
}

/** Tabla de créditos para reportes de cobranza. */
export function creditsTable(
  credits: RichCredit[],
  opts: { title?: string } = {},
): RichResponse {
  return table(opts.title ?? "Créditos", ["Cliente", "Orden", "Pendiente", "Estado", "Próxima cuota"], credits.map((c) => [
    c.customerName,
    `#${c.orderNumber}`,
    money(c.pending),
    CREDIT_STATE_LABEL[c.state] ?? c.state,
    creditDate(c.nextDueDate),
  ]))
}

// ─── Cobranza Inteligente (FASE 6B) ─────────────────────────────────────────

/** Lista de recomendaciones de contacto ("¿a quién contactar hoy?"). */
export function collectionRecommendationsList(
  recommendations: Array<{
    orderNumber: string
    customerName: string
    pending: number
    overdueDays: number
    nextDueDate?: string | null
    daysSinceLastContact?: number | null
    attempts: number
    suggestedLevel: number
  }>,
  opts: { title?: string; tone?: import("./types").BlockTone } = {},
): RichBlock {
  return listBlock(
    recommendations.map((r) => {
      const metadata: string[] = [`Orden #${r.orderNumber}`, money(r.pending)]
      if (r.overdueDays > 0) metadata.push(`Vencido ${r.overdueDays} días`)
      else if (r.nextDueDate) metadata.push(`Vence ${creditDate(r.nextDueDate)}`)
      metadata.push(
        r.daysSinceLastContact === null
          ? "Sin contactar"
          : r.daysSinceLastContact === 0
            ? "Contactado hoy"
            : `Contactado hace ${r.daysSinceLastContact}d`
      )
      if (r.attempts > 0) metadata.push(`${r.attempts} intento(s)`)
      return {
        title: r.customerName,
        subtitle: metadata.join(" · "),
        icon: r.overdueDays > 0 ? "alert-triangle" : "megaphone",
        badge: `Nivel ${r.suggestedLevel}`,
        tone: r.overdueDays > 0 ? "warning" : undefined,
      }
    }),
    { title: opts.title ?? "Contactos sugeridos hoy", icon: "megaphone", tone: opts.tone },
  )
}

/** Tarjeta de recordatorio preparado (nunca enviado automáticamente). */
export function preparedReminderCard(
  reminder: {
    orderNumber: string
    customerName: string
    level: number
    category: string
    message: string
    whatsappUrl: string
    pending: number
  },
): RichResponse {
  return {
    kind: "card",
    title: `Mensaje preparado para ${reminder.customerName}`,
    subtitle: `Orden #${reminder.orderNumber} · Nivel ${reminder.level}`,
    blocks: [
      {
        kind: "card",
        title: "Recordatorio listo para revisar",
        subtitle: `Categoría: ${reminder.category}`,
        fields: [
          { label: "Mensaje", value: reminder.message },
          { label: "Saldo pendiente", value: money(reminder.pending) },
        ],
      },
      quickActionsBlock([{ label: "Abrir mensaje en WhatsApp", action: "abre el asistente de cobranza" }]),
    ],
  }
}

// ─── Proveedores / Cuentas por pagar (FASE 6C) ─────────────────────────────

const SUPPLIER_STATE_LABEL: Record<string, string> = {
  saldado: "Saldado",
  al_dia: "Al día",
  por_vencer: "Por vencer",
  vencido: "Vencido",
  inactivo: "Inactivo",
}

export type RichSupplier = {
  name: string
  balance: number
  totalPurchased: number
  totalPaid: number
  pendingInvoices: number
  overdueInvoices: number
  nextDueDate?: string | null
  category?: string | null
  state: string
}

function supplierDate(d: string | null | undefined): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" })
}

/** Resumen KPI de proveedores (deuda total, vencidas, pagos del mes). */
export function suppliersSummary(
  kpis: { totalPayable: number; pendingInvoices: number; overdueInvoices: number; overdueAmount: number; dueNext7Days: number; paidThisMonth: number; activeSuppliers: number },
): RichResponse {
  const blocks: RichBlock[] = [
    kpiBlock("Proveedores", [
      { label: "Total por pagar", value: money(kpis.totalPayable), emphasis: "strong" },
      { label: "Facturas abiertas", value: kpis.pendingInvoices },
      { label: "Vencidas", value: kpis.overdueInvoices, emphasis: kpis.overdueInvoices > 0 ? "strong" : "normal" },
      { label: "Monto vencido", value: money(kpis.overdueAmount), emphasis: kpis.overdueAmount > 0 ? "strong" : "normal" },
      { label: "Vence en 7 días", value: money(kpis.dueNext7Days) },
      { label: "Pagado este mes", value: money(kpis.paidThisMonth) },
      { label: "Proveedores activos", value: kpis.activeSuppliers },
    ]),
  ]
  return { kind: "summary", title: "Resumen de cuentas por pagar", blocks }
}

/** Tarjeta de un proveedor con su estado. */
export function supplierCard(
  supplier: RichSupplier,
  opts: { subtitle?: string; badge?: string; actions?: import("./types").QuickAction[] } = {},
): RichResponse {
  const fields: Array<{ label: string; value: string | number; tone?: import("./types").BlockTone }> = [
    { label: "Saldo pendiente", value: money(supplier.balance), tone: supplier.state === "vencido" ? "warning" : undefined },
    { label: "Compras", value: money(supplier.totalPurchased) },
    { label: "Pagado", value: money(supplier.totalPaid) },
  ]
  if (supplier.state === "vencido") {
    fields.push({ label: "Vencidas", value: supplier.overdueInvoices, tone: "danger" })
  } else if (supplier.nextDueDate) {
    fields.push({ label: "Próximo vencimiento", value: supplierDate(supplier.nextDueDate) })
  }
  return {
    kind: "card",
    title: supplier.name,
    subtitle: opts.subtitle ?? supplier.category ?? undefined,
    blocks: [cardBlock(supplier.name, fields, { subtitle: opts.subtitle ?? supplier.category ?? undefined, badge: opts.badge ?? SUPPLIER_STATE_LABEL[supplier.state] ?? supplier.state, actions: opts.actions })],
  }
}

/** Lista de proveedores con saldo y estado. */
export function suppliersList(
  suppliers: RichSupplier[],
  opts: { title?: string; tone?: import("./types").BlockTone } = {},
): RichBlock {
  return listBlock(
    suppliers.map((s) => {
      const metadata: string[] = [money(s.balance)]
      if (s.overdueInvoices > 0) metadata.push(`${s.overdueInvoices} vencida(s)`)
      else if (s.nextDueDate) metadata.push(`Vence ${supplierDate(s.nextDueDate)}`)
      if (s.pendingInvoices > 0) metadata.push(`${s.pendingInvoices} factura(s)`)
      return {
        title: s.name,
        subtitle: metadata.join(" · "),
        icon: s.state === "vencido" ? "alert-triangle" : "truck",
        badge: SUPPLIER_STATE_LABEL[s.state] ?? s.state,
        tone: s.state === "vencido" ? "warning" : undefined,
      }
    }),
    { title: opts.title ?? "Proveedores", icon: "truck", tone: opts.tone },
  )
}

/** Tabla de proveedores para reportes de cuentas por pagar. */
export function suppliersTable(
  suppliers: RichSupplier[],
  opts: { title?: string } = {},
): RichResponse {
  return table(opts.title ?? "Proveedores", ["Proveedor", "Saldo", "Facturas", "Estado", "Próximo vencimiento"], suppliers.map((s) => [
    s.name,
    money(s.balance),
    s.pendingInvoices,
    SUPPLIER_STATE_LABEL[s.state] ?? s.state,
    supplierDate(s.nextDueDate),
  ]))
}

// ─── Inteligencia Financiera (FASE 6D) ──────────────────────────────────────

export type RichFinancialIndicators = {
  period: "today" | "week" | "month"
  label: string
  revenue: number
  previousRevenue: number
  revenueDeltaPct: number | null
  expenses: number
  previousExpenses: number
  expensesDeltaPct: number | null
  netFlow: number
  totalPending: number
  recoveredInPeriod: number
  recoveryRate: number
  overdueCredits: number
  overdueCreditAmount: number
  dueNext7DaysCollect: number
  topDebtors: Array<{ name: string; pending: number }>
  totalPayable: number
  paidToSuppliersInPeriod: number
  overdueSupplierInvoices: number
  overdueSupplierAmount: number
  dueNext7DaysPay: number
  topPayableSuppliers: Array<{ name: string; outstanding: number; dueDate: string | null }>
}

export type RichFinancialInsight = {
  id: string
  title: string
  description?: string
  category: string
  priority: "alta" | "media" | "baja"
  value?: number
}

/** Bloque KPI + alertas de la salud financiera (FASE 6D). */
export function financialHealthBlocks(indicators: RichFinancialIndicators): RichBlock[] {
  const blocks: RichBlock[] = [
    kpiBlock("Salud financiera", [
      { label: "Ingresos", value: money(indicators.revenue), emphasis: "strong" },
      { label: "Gastos", value: money(indicators.expenses) },
      { label: "Flujo neto", value: money(indicators.netFlow), emphasis: "strong" },
      { label: "Por cobrar", value: money(indicators.totalPending) },
      { label: "Por pagar", value: money(indicators.totalPayable) },
    ]),
  ]
  if (indicators.netFlow < 0) {
    blocks.push(monitorBlock("danger", `Tus gastos superaron tus ingresos en ${money(Math.abs(indicators.netFlow))} en ${indicators.label}.`, { icon: "trending-down", severity: "warning", actions: [{ label: "Ver panel financiero", action: "abre el panel financiero" }] }))
  }
  if (indicators.overdueCredits > 0) {
    blocks.push(monitorBlock("warning", `${indicators.overdueCredits} crédito(s) vencido(s) por ${money(indicators.overdueCreditAmount)}.`, { icon: "alert-triangle", severity: "warning", actions: [{ label: "Ver créditos vencidos", action: "muéstrame los créditos vencidos" }] }))
  }
  if (indicators.overdueSupplierInvoices > 0) {
    blocks.push(monitorBlock("warning", `${indicators.overdueSupplierInvoices} factura(s) de proveedores vencida(s) por ${money(indicators.overdueSupplierAmount)}.`, { icon: "alert-triangle", severity: "warning", actions: [{ label: "Ver facturas vencidas", action: "muéstrame las facturas vencidas de proveedores" }] }))
  }
  if (indicators.overdueCredits === 0 && indicators.overdueSupplierInvoices === 0 && indicators.netFlow >= 0) {
    blocks.push(monitorBlock("success", "Tus finanzas van bien: flujo positivo y sin cuentas vencidas.", { icon: "check-circle-2", severity: "info" }))
  }
  return blocks
}

/** Bloques de "qué revisar hoy": insights priorizados del motor 6D. */
export function financialReviewBlocks(indicators: RichFinancialIndicators, insights: RichFinancialInsight[]): RichBlock[] {
  const blocks: RichBlock[] = []
  if (insights.length === 0) {
    blocks.push(monitorBlock("success", "No hay alertas financieras que requieran tu atención.", { icon: "check-circle-2", severity: "info" }))
    return blocks
  }
  const top = insights.slice(0, 3)
  blocks.push(kpiBlock("Qué revisar hoy", [
    { label: "Alertas", value: insights.length, emphasis: "strong" },
    { label: "Vencidos", value: indicators.overdueCredits + indicators.overdueSupplierInvoices },
    { label: "Por cobrar 7 días", value: money(indicators.dueNext7DaysCollect) },
    { label: "Por pagar 7 días", value: money(indicators.dueNext7DaysPay) },
  ]))
  for (const insight of top) {
    const tone = insight.priority === "alta" ? "danger" : insight.priority === "media" ? "warning" : "info"
    const severity = insight.priority === "alta" ? "warning" : insight.priority === "media" ? "warning" : "info"
    blocks.push(monitorBlock(tone, insight.title, { icon: insight.priority === "alta" ? "alert-triangle" : "calendar-clock", description: insight.description, severity, actions: [{ label: "Ver en el panel financiero", action: "abre el panel financiero" }] }))
  }
  blocks.push(quickActionsBlock([
    { label: "Ver todos los insights", action: "abre el panel financiero" },
  ]))
  return blocks
}

/** Bloques de comparación por cobrar vs por pagar. */
export function financialCobrarVsPagarBlocks(indicators: RichFinancialIndicators): RichBlock[] {
  const blocks: RichBlock[] = [
    kpiBlock("Por cobrar vs por pagar", [
      { label: "Por cobrar", value: money(indicators.totalPending), emphasis: "strong" },
      { label: "Por pagar", value: money(indicators.totalPayable), emphasis: "strong" },
      { label: "Recuperado en el período", value: money(indicators.recoveredInPeriod) },
      { label: "Pagado a proveedores", value: money(indicators.paidToSuppliersInPeriod) },
    ]),
  ]
  if (indicators.totalPending > indicators.totalPayable) {
    blocks.push(monitorBlock("success", `Tienes más por cobrar (${money(indicators.totalPending)}) que por pagar (${money(indicators.totalPayable)}).`, { icon: "check-circle-2", severity: "info", actions: [{ label: "Ver créditos", action: "muéstrame mis créditos por cobrar" }] }))
  } else if (indicators.totalPayable > indicators.totalPending) {
    blocks.push(monitorBlock("warning", `Tienes más por pagar (${money(indicators.totalPayable)}) que por cobrar (${money(indicators.totalPending)}): conviene priorizar el cobro.`, { icon: "alert-triangle", severity: "warning", actions: [{ label: "Ver proveedores", action: "abre el centro de proveedores" }] }))
  } else if (indicators.totalPending > 0) {
    blocks.push(monitorBlock("info", `Tus cuentas por cobrar y por pagar están equilibradas (${money(indicators.totalPending)}).`, { icon: "scale", severity: "info" }))
  }
  return blocks
}

/** Lista de clientes con mayor deuda por cobrar. */
export function financialTopDebtorsBlock(debtors: Array<{ name: string; pending: number }>): RichBlock {
  if (debtors.length === 0) {
    return monitorBlock("success", "No tienes deudas pendientes por cobrar.", { icon: "check-circle-2", severity: "info" })
  }
  return listBlock(
    debtors.map((d) => ({
      title: d.name,
      subtitle: money(d.pending),
      icon: "users",
      tone: "warning",
    })),
    { title: "Clientes con mayor deuda", icon: "users", tone: "warning" },
  )
}

/** Lista de proveedores con mayor saldo por pagar. */
export function financialTopPayablesBlock(payables: Array<{ name: string; outstanding: number; dueDate: string | null }>): RichBlock {
  if (payables.length === 0) {
    return monitorBlock("success", "No tienes cuentas pendientes con proveedores.", { icon: "check-circle-2", severity: "info" })
  }
  return listBlock(
    payables.map((p) => {
      const metadata: string[] = [money(p.outstanding)]
      if (p.dueDate) metadata.push(`Vence ${supplierDate(p.dueDate)}`)
      return {
        title: p.name,
        subtitle: metadata.join(" · "),
        icon: "truck",
        tone: "info",
      }
    }),
    { title: "Proveedores a pagar primero", icon: "truck", tone: "info" },
  )
}

/** Bloques de principales gastos (por categoría). */
export function financialGastosBlocks(
  byCategory: Array<{ category: string; total: number }>,
  total: number,
): RichBlock[] {
  const blocks: RichBlock[] = [kpiBlock("Principales gastos", [{ label: "Total gastado", value: money(total), emphasis: "strong" }])]
  const withTotal = byCategory.map((c) => ({ ...c, pct: total > 0 ? (c.total / total) * 100 : 0 }))
  if (withTotal.length >= 2) {
    blocks.push(chartBlock("Gastos por categoría", "donut", withTotal.map((c) => ({ label: c.category, value: c.total })), { currency: true, minPoints: 2 }))
  }
  if (withTotal.length > 0) {
    blocks.push(listBlock(
      withTotal
        .sort((a, b) => b.total - a.total)
        .map((c) => ({ title: c.category, subtitle: `${money(c.total)} · ${c.pct.toFixed(0)}%`, icon: "receipt-text", tone: "info" })),
      { title: "Categorías con más gasto", icon: "receipt-text" },
    ))
  } else {
    blocks.push({ kind: "text", text: "No tienes gastos registrados en este período." })
  }
  return blocks
}
