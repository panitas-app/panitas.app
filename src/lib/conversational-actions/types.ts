/**
 * Contratos del Conversational Actions Engine (FASE 5D).
 *
 * Capa de orquestación que convierte solicitudes en lenguaje natural en
 * operaciones de negocio ejecutadas sobre las tools 3B existentes y los
 * services 1B. Introduce la acción conversacional (nivel de usuario), el
 * completado de parámetros en varios turnos, la confirmación y las respuestas
 * enriquecidas (tarjetas, tablas, resúmenes).
 *
 * Regla de capas: este módulo NO conoce proveedores LLM ni Prisma. Coordina
 * Tool System (3B) + Services (1B) + Contexto conversacional (5C).
 */
import type { ConfirmationRequest, ExecutionPlan, StepExecutionResult } from "@/lib/agent-intel/types"
import type { PendingParameter } from "@/lib/conversations/conversation-types"
import type { StoreServiceContext } from "@/services/context"

/** Dominios de negocio que orquesta el motor de acciones. */
export const ACTION_DOMAINS = [
  "inventario",
  "ventas",
  "clientes",
  "gastos",
  "proveedores",
  "pedidos",
  "reportes",
  "cobranza",
  "finanzas",
] as const

export type ActionDomain = (typeof ACTION_DOMAINS)[number]

/** Nivel de confirmación que exige una acción. */
export type ConfirmationLevel = "none" | "destructive" | "critical" | "bulk"

/** Un parámetro que una acción necesita para ejecutarse. */
export interface ActionParam {
  key: string
  /** Etiqueta humana (para pedirlo). */
  label: string
  /** Pregunta natural para solicitar el dato. */
  prompt: string
  /** true si se puede omitir. */
  optional?: boolean
  /** Valida un valor ya completado; devuelve mensaje de error o null. */
  validate?: (value: string, known: Record<string, string>) => string | null
}

/** Definición declarativa de una acción conversacional. */
export interface ConversationalAction {
  id: string
  /** Etiqueta humana corta (p.ej. "registrar gasto"). */
  label: string
  domain: ActionDomain
  /** Señales (verbos + palabras) que disparan la detección. */
  signals: string[]
  /** Parámetros que la acción puede consumir. */
  params: ActionParam[]
  /** Claves de parámetros obligatorias (sin ellas no se ejecuta). */
  required: string[]
  confirmation: ConfirmationLevel
  /** Permite decidir el nivel de confirmación según los parámetros ya conocidos. */
  confirmationWhen?: (known: KnownParams) => ConfirmationLevel
  /** Texto de la solicitud de confirmación (lenguaje natural). */
  confirmDescription?: string
  /** Impacto de la acción (lenguaje natural). */
  confirmImpact?: string
}

/** Valores de parámetros ya resueltos (strings normalizados). */
export type KnownParams = Record<string, string>

/** Resultado de la ejecución de una acción. */
export interface ActionResultData {
  /** Título del resultado para la respuesta. */
  title: string
  subtitle?: string
  /** Datos crudos del handler (service o tool), para renderizar. */
  payload: unknown
}

/** Tono semántico de un bloque/campo (colores consistentes en toda la UI). */
export type BlockTone = "default" | "success" | "warning" | "danger" | "info"

/** Acción rápida que un bloque puede exponer (FASE 5E). */
export interface QuickAction {
  label: string
  /** Acción semántica: se reenvía al asistente como texto (nunca tool names). */
  action: string
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost"
  /** true para acciones destructivas (requiere confirmación del usuario). */
  confirm?: boolean
  /** Nombre de un icono de lucide-react (ej: "pencil", "trash-2"). */
  icon?: string
  /** Deep link interno (FASE 9B): si existe, la acción abre el módulo en vez de reenviarse al chat. */
  href?: string
}

/**
 * Bloques visuales de una respuesta enriquecida (client-safe).
 *
 * FASE 5E: los bloques son semánticos y se renderizan mediante el
 * ConversationRenderer y su registro central de componentes. El motor
 * conversacional NO conoce estos componentes: solo emite bloques.
 */
export type RichBlock =
  | { kind: "text"; text: string }
  | {
      kind: "table"
      title: string
      headers: string[]
      rows: Array<Array<string | number>>
      /** Habilita ordenar por columna al hacer clic en el encabezado. */
      sortable?: boolean
      /** Habilita el buscador interno (filtra filas). */
      searchable?: boolean
      /** Habilita filtros por columna (mapa índice de columna → valor exacto). */
      filterable?: boolean
      filters?: Record<number, string>
      /** Habilita paginación local. */
      paginated?: boolean
      /** Filas por página cuando `paginated` está activo (default 8). */
      pageSize?: number
      /** Habilita expandir filas para ver más detalle. */
      expandable?: boolean
      /** Detalle por fila (paralelo a `rows`). */
      expandRows?: Array<Array<{ label: string; value: string | number }>>
      /** Icono lucide (nombre) en la cabecera. */
      icon?: string
      /** Badge de estado en la cabecera. */
      badge?: string
      /** Tono por fila (paralelo a `rows`). */
      rowTone?: BlockTone[]
    }
  | {
      kind: "card"
      title: string
      subtitle?: string
      badge?: string
      tone?: BlockTone
      icon?: string
      fields: Array<{ label: string; value: string | number; tone?: BlockTone }>
      /** Acciones rápidas que se renderizan al pie de la tarjeta. */
      actions?: QuickAction[]
    }
  | {
      kind: "summary"
      title: string
      icon?: string
      tone?: BlockTone
      items: Array<{ label: string; value: string | number; emphasis?: "normal" | "strong" | "muted"; tone?: BlockTone }>
    }
  | {
      kind: "kpi"
      title: string
      items: Array<{ label: string; value: string | number; delta?: number; deltaLabel?: string; emphasis?: "normal" | "strong" | "muted"; icon?: string; tone?: BlockTone }>
    }
  | {
      kind: "chart"
      title: string
      subtitle?: string
      icon?: string
      badge?: string
      unit?: string
      type: "bar" | "line" | "donut" | "sparkline"
      data: Array<{ label: string; value: number; color?: string }>
      /** Mínimo de puntos para dibujar el gráfico (si hay menos, se muestra lista). */
      minPoints?: number
      currency?: boolean
      percent?: boolean
    }
  | {
      kind: "list"
      title?: string
      icon?: string
      tone?: BlockTone
      items: Array<{ title: string; subtitle?: string; icon?: string; metadata?: string[]; badge?: string; tone?: BlockTone }>
    }
  | {
      kind: "monitor"
      title: string
      description?: string
      icon?: string
      tone: BlockTone
      severity?: "info" | "warning" | "critical"
      actions?: QuickAction[]
    }
  | { kind: "quick-actions"; title?: string; items: QuickAction[] }
  | {
      kind: "financial"
      title: string
      metrics: Array<{ label: string; value: string | number; tone?: BlockTone; icon?: string }>
      breakEven?: { revenue: number; units?: number; margin: number }
      expenseBreakdown?: Array<{ label: string; value: number; percentage: number }>
    }

/** Bloques con nombre propio, para que los componentes usen tipos explícitos. */
export type TextBlock = Extract<RichBlock, { kind: "text" }>
export type TableBlock = Extract<RichBlock, { kind: "table" }>
export type CardBlock = Extract<RichBlock, { kind: "card" }>
export type SummaryBlock = Extract<RichBlock, { kind: "summary" }>
export type KpiBlock = Extract<RichBlock, { kind: "kpi" }>
export type ChartBlock = Extract<RichBlock, { kind: "chart" }>
export type ListBlock = Extract<RichBlock, { kind: "list" }>
export type MonitorBlock = Extract<RichBlock, { kind: "monitor" }>
export type QuickActionsBlock = Extract<RichBlock, { kind: "quick-actions" }>
export type FinancialBlock = Extract<RichBlock, { kind: "financial" }>

/** Respuesta enriquecida de una acción. */
export interface RichResponse {
  kind: "card" | "summary" | "table" | "confirmation"
  title: string
  subtitle?: string
  blocks: RichBlock[]
}

/** Resultado del motor de acciones por turno. */
export interface ActionsTurnResult {
  status: "no_action" | "completed" | "awaiting_details" | "confirmation_required" | "awaiting_retry"
  /** Respuesta en lenguaje natural (prompt o resumen). */
  reply: string
  /** Id de la acción detectada/pendiente. */
  actionId?: string
  /** Parámetros que faltan por completar (persistir en el contexto 5C). */
  pendingParams?: PendingParameter[]
  /** Estado del contexto conversacional tras el turno. */
  contextStatus?: "active" | "awaiting_details" | "awaiting_confirmation" | "awaiting_retry" | "ready"
  /** Respuesta enriquecida para el cliente (si aplica). */
  rich?: RichResponse
  /** Confirmación pendiente (si aplica). */
  confirmation?: ConfirmationRequest
  /** Resultados de herramientas ejecutadas (traza). */
  toolResults?: StepExecutionResult[]
  /** Parámetros conocidos tras el turno (para persistir en 5C). */
  knownParams?: KnownParams
}

/** Dependencias del motor de acciones (inyectables en tests). */
export interface ActionDeps {
  productService?: import("@/services/product.service").ProductService
  inventoryService?: import("@/services/inventory.service").InventoryService
  customerService?: import("@/services/customer.service").CustomerService
  orderService?: import("@/services/order.service").OrderService
  expenseService?: import("@/services/expense.service").ExpenseService
  salesService?: import("@/services/sales.service").SalesService
  toolExecutor?: import("@/lib/agent/tools").ToolExecutor
  executionPlanner?: import("@/lib/agent-intel/execution-planner").ExecutionPlanner
  confirmationSystem?: import("@/lib/agent-intel/confirmation-system").ConfirmationSystem
}

/** Contexto de negocio del turno para ejecutar acciones. */
export interface ActionRuntimeContext {
  userId: string
  storeId: string
  negocioId?: string | null
  plan: string
  role: string
  permissions: string[]
}

export type { ExecutionPlan, StepExecutionResult, StoreServiceContext }
