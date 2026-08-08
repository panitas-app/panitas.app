/**
 * FASE 6D — Acciones rápidas por insight.
 *
 * Cada insight accionable expone acciones concretas: navegar a la sección
 * correspondiente o consultar al asistente (Panitas). Todas apuntan a rutas
 * reales del dashboard y a preguntas soportadas por el catálogo de acciones.
 */
import type { FinancialAction, FinancialInsightCategory } from "./financial-types"

export function linkAction(label: string, href: string): FinancialAction {
  return { label, type: "link", href }
}

export function askAction(label: string, prompt: string): FinancialAction {
  return { label, type: "assistant", prompt }
}

const CREDITOS_LINK = "/dashboard/creditos"
const PROVEEDORES_LINK = "/dashboard/suppliers"
const REPORTS_LINK = "/dashboard/reports"
const FINANZAS_LINK = "/dashboard/finanzas"

const DEFAULT_ACTION = askAction(
  "Consultar con Panitas",
  "cómo está la salud financiera de mi negocio",
)

const ACTIONS: Partial<Record<FinancialInsightCategory, FinancialAction[]>> = {
  flujo_negativo: [
    linkAction("Abrir reporte financiero", REPORTS_LINK),
    askAction("Consultar con Panitas", "cómo está la salud financiera de mi negocio"),
  ],
  flujo_positivo: [
    linkAction("Ver panel financiero", FINANZAS_LINK),
    askAction("Consultar con Panitas", "cómo está la salud financiera de mi negocio"),
  ],
  creditos_vencidos: [
    linkAction("Ver créditos", CREDITOS_LINK),
    askAction("Consultar con Panitas", "qué clientes me deben más"),
  ],
  cobrar_esta_semana: [
    linkAction("Ver créditos", CREDITOS_LINK),
    askAction("Consultar con Panitas", "cuánto tengo por cobrar esta semana"),
  ],
  deuda_concentrada: [
    linkAction("Ver créditos", CREDITOS_LINK),
    askAction("Consultar con Panitas", "qué clientes concentran mi deuda"),
  ],
  recuperacion_creditos: [
    linkAction("Ver créditos", CREDITOS_LINK),
    askAction("Consultar con Panitas", "cómo va la recuperación de mis créditos"),
  ],
  facturas_vencidas: [
    linkAction("Ver proveedores", PROVEEDORES_LINK),
    askAction("Registrar pago", "quiero registrar un pago a un proveedor"),
  ],
  pagar_esta_semana: [
    linkAction("Ver proveedores", PROVEEDORES_LINK),
    askAction("Consultar con Panitas", "a qué proveedores debo pagar primero"),
  ],
  por_pagar_mayor: [
    linkAction("Ver proveedores", PROVEEDORES_LINK),
    askAction("Consultar con Panitas", "a qué proveedores debo pagar primero"),
  ],
  ventas_crecieron: [
    linkAction("Ver ventas", REPORTS_LINK),
    askAction("Consultar con Panitas", "cómo van mis ventas"),
  ],
  ventas_cayeron: [
    linkAction("Ver ventas", REPORTS_LINK),
    askAction("Consultar con Panitas", "por qué bajaron mis ventas"),
  ],
  gastos_aumentaron: [
    linkAction("Ver gastos", REPORTS_LINK),
    askAction("Consultar con Panitas", "cuáles son mis principales gastos"),
  ],
}

/** Acciones rápidas para una categoría de insight. */
export function actionsFor(category: FinancialInsightCategory): FinancialAction[] {
  return ACTIONS[category] ?? [DEFAULT_ACTION]
}
