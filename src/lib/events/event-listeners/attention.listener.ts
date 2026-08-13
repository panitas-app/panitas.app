/**
 * Listener: Atención (FASE 8C).
 *
 * En eventos de negocio que invalidan reglas de atención (ventas, stock,
 * créditos, proveedores, pedidos, conversaciones, canales), agenda un re-sync
 * throttled del negocio para que el Centro de Atención refleje situaciones
 * reales. El listener NO inventa items: solo re-evalúa reglas deterministas.
 */
export { registerAttentionListener, attentionTriggerEvents, type AttentionListenerOptions } from "@/lib/attention/engine"
