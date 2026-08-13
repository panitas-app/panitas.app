/**
 * Umbrales y ventanas del motor de atención (FASE 8C).
 *
 * Valores deterministas y simples. Se usan únicamente para detectar
 * situaciones reales (stock 0, cuotas vencidas, etc.). NO se hacen
 * predicciones de días exactos: el inventario bajo se describe como
 * "está por agotarse", nunca "se agotará en N días".
 */
export const ATTENTION_CONFIG = {
  /** Stock igual o menor a este valor = "por agotarse" (no hay predicción). */
  lowStockThreshold: 5,

  /** Producto sin movimiento de stock en estos días = "sin movimiento". */
  noMovementDays: 30,

  /** Días de antelación para señalar una cuota próxima a vencer. */
  creditUpcomingDays: 3,

  /** Pedido confirmado/preparando sin avanzar después de estas horas. */
  orderDelayedHours: 48,

  /** Pedido enviado sin entregar después de estos días. */
  orderShippedDelayedDays: 5,

  /** Pedido pendiente sin confirmar después de estas horas. */
  orderPendingHours: 24,

  /** Minutos de gracia antes de señalar una conversación sin respuesta. */
  conversationGraceMinutes: 15,

  /** Conversación sin respuesta después de estas horas pasa a prioridad alta. */
  conversationUrgentHours: 48,
} as const
