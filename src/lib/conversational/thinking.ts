/**
 * Estados contextuales del chat (FASE 5B).
 *
 * En lugar de un spinner genérico, Panitas muestra una acción específica según
 * lo que pidió el usuario: "Creando producto...", "Consultando inventario...",
 * etc. La etiqueta se infiere del último mensaje del usuario.
 */

const DEFAULT_LABEL = "Pensando..."

const CREATION_VERBS = /\b(crear|creando|crea|creó|creo|registrar|registrando|nuevo)\b/i

/** Etiqueta contextual para el indicador de "pensando" según el mensaje. */
export function inferThinkingLabel(message: string): string {
  const m = (message ?? "").toLowerCase()

  if (CREATION_VERBS.test(m) && /\bproducto\w*\b/i.test(m)) {
    return "Creando producto..."
  }
  if (CREATION_VERBS.test(m) && /\bcliente\w*\b/i.test(m)) {
    return "Registrando cliente..."
  }
  if (/\b(inventario|stock|existencias|agot)\w*/i.test(m)) {
    return "Consultando inventario..."
  }
  if (/\b(venta|ventas|vendi|pedido|pedidos|orden|ordenes)\b/i.test(m)) {
    return "Analizando tus ventas..."
  }
  if (/\b(cliente|clientes|recomendaci|recomendar|recomienda)\b/i.test(m)) {
    return "Revisando clientes y recomendaciones..."
  }
  if (/\b(resumen|negocio|empresa|salud|estado)\b|(cómo|como)\s+est/i.test(m)) {
    return "Analizando tu negocio..."
  }

  return DEFAULT_LABEL
}

export { DEFAULT_LABEL }
