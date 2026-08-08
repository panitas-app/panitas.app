"use client"

export type CollectionCategory =
  | "primer_recordatorio"
  | "segundo_recordatorio"
  | "ultimo_aviso"
  | "despues_abono"
  | "agradecimiento"

export type CollectionLevel = 1 | 2 | 3

export type ContactStatus = "pending" | "sent" | "responded"

export interface CollectionTemplate {
  id: string
  category: CollectionCategory
  name: string
  level: CollectionLevel
  body: string
  isBuiltIn: boolean
  isActive: boolean
}

export interface CollectionSettings {
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
  category: CollectionCategory
  templateName: string
  level: CollectionLevel
  suggestedLevel: CollectionLevel
  overdueDays: number
  dueDate: string | null
  pending: number
  message: string
  whatsappUrl: string
}

export interface ContactLog {
  id: string
  orderId: string
  orderNumber: string
  customerName: string
  customerPhone: string
  channel: string
  level: CollectionLevel
  templateName: string | null
  message: string | null
  status: ContactStatus
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
  suggestedCategory: CollectionCategory
}

export const CATEGORY_META: Record<CollectionCategory, { label: string; level: CollectionLevel; description: string }> = {
  primer_recordatorio: { label: "Primer recordatorio", level: 1, description: "Aviso amistoso antes o al vencerse la cuota." },
  segundo_recordatorio: { label: "Segundo recordatorio", level: 2, description: "Aviso formal tras unos días de atraso." },
  ultimo_aviso: { label: "Último aviso", level: 3, description: "Aviso firme con plazo límite." },
  despues_abono: { label: "Mensaje después de un abono", level: 1, description: "Confirma el abono y muestra el nuevo saldo." },
  agradecimiento: { label: "Agradecimiento por pago completo", level: 1, description: "Cierra el crédito con un agradecimiento." },
}

export const CATEGORY_ORDER: CollectionCategory[] = [
  "primer_recordatorio",
  "segundo_recordatorio",
  "ultimo_aviso",
  "despues_abono",
  "agradecimiento",
]

export const LEVEL_META: Record<CollectionLevel, { label: string; chip: string; dot: string }> = {
  1: { label: "Amistoso", chip: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400", dot: "bg-green-500" },
  2: { label: "Formal", chip: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400", dot: "bg-amber-500" },
  3: { label: "Último aviso", chip: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400", dot: "bg-red-500" },
}

export const STATUS_META: Record<ContactStatus, { label: string; chip: string }> = {
  pending: { label: "Pendiente", chip: "bg-slate-100 text-slate-600 dark:bg-slate-900/50 dark:text-slate-400" },
  sent: { label: "Enviado", chip: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
  responded: { label: "Respondido", chip: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" },
}

export const TEMPLATE_VARIABLES: Array<{ key: string; label: string; description: string }> = [
  { key: "cliente", label: "Nombre del cliente", description: "Nombre registrado del cliente." },
  { key: "saldo", label: "Saldo pendiente", description: "Saldo actual pendiente (formato $1.234,56)." },
  { key: "monto_abono", label: "Último abono", description: "Monto del último abono registrado." },
  { key: "fecha_vencimiento", label: "Próximo vencimiento", description: "Fecha de la próxima cuota pendiente." },
  { key: "dias_atraso", label: "Días de atraso", description: "Días de atraso de la cuota vencida más antigua." },
  { key: "metodos_pago", label: "Métodos de pago", description: "Métodos de pago configurados, separados por comas." },
  { key: "nombre_negocio", label: "Nombre del negocio", description: "Nombre de la tienda (o override en configuración)." },
]

export function money(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" })
}
