export type PlanId = "agenda" | "comercio" | "mayorista"
export type PlanType = PlanId
export type Modalidad = "tienda" | "agenda"
export type PlanModule = "products" | "orders" | "appointments" | "crm" | "analytics" | "automations" | "b2b" | "reports" | "payments" | "pos"

export interface PlanDefinition {
  id: PlanId
  label: string
  descripcion: string
  description: string
  precioUsd: number
  priceMonthly: number
  precioUsdAnual: number
  priceYearly: number
  /** Precios para pago en 2 cuotas */
  installmentPrice: number
  installmentAmount: number
  modalidades: Modalidad[]
  requiresSelection: boolean
  features: Record<string, boolean | number | string>
  activo: boolean
  sortOrder: number
  modules: string[]
  limits: { products: number; teamMembers: number }
}

export const PLAN_DEFINITIONS: Record<string, PlanDefinition> = {
  agenda: {
    id: "agenda",
    label: "Agenda",
    descripcion: "Sistema de agendamiento inteligente para servicios por cita. Ideal para barberías, clínicas y consultorios.",
    description: "Sistema de agendamiento inteligente para servicios por cita.",
    precioUsd: 15,
    priceMonthly: 15,
    precioUsdAnual: 150,
    priceYearly: 150,
    installmentPrice: 18,
    installmentAmount: 9,
    modalidades: ["agenda"],
    requiresSelection: false,
    features: { miembros_equipo: 1, almacenamiento_mb: 200 },
    activo: true,
    sortOrder: 1,
    modules: ["appointments", "payments"],
    limits: { products: 0, teamMembers: 1 },
  },
  comercio: {
    id: "comercio",
    label: "Comercio",
    descripcion: "Tienda online + administración para minoristas, bodegones, ropa y calzado.",
    description: "Tienda online + administración para minoristas.",
    precioUsd: 25,
    priceMonthly: 25,
    precioUsdAnual: 250,
    priceYearly: 250,
    installmentPrice: 28,
    installmentAmount: 14,
    modalidades: ["tienda", "agenda"],
    requiresSelection: false,
    features: {
      productos_ilimitados: true,
      crm: true,
      miembros_equipo: 3,
      almacenamiento_mb: 500,
    },
    activo: true,
    sortOrder: 2,
    modules: ["products", "orders", "payments", "appointments", "whatsapp", "crm", "reports"],
    limits: { products: -1, teamMembers: 3 },
  },
  mayorista: {
    id: "mayorista",
    label: "Mayorista",
    descripcion: "Sistema B2B para distribuidoras, importadoras y negocios con fuerza de ventas en calle.",
    description: "Sistema B2B para distribuidoras y mayoristas.",
    precioUsd: 45,
    priceMonthly: 45,
    precioUsdAnual: 450,
    priceYearly: 450,
    installmentPrice: 50,
    installmentAmount: 25,
    modalidades: ["tienda", "agenda"],
    requiresSelection: false,
    features: {
      b2b_clientes: true,
      precios_volumen: true,
      comisiones: true,
      miembros_equipo: 10,
      almacenamiento_mb: 1000,
    },
    activo: true,
    sortOrder: 3,
    modules: ["products", "orders", "payments", "whatsapp", "crm", "reports", "multiuser", "b2b"],
    limits: { products: -1, teamMembers: 10 },
  },
}

export function getPlan(id: string): PlanDefinition | undefined {
  return PLAN_DEFINITIONS[id]
}

export function getPlanLabel(id: string): string {
  return getPlan(id)?.label || id
}

export function getPlanPrice(id: string, period: "monthly" | "yearly"): number {
  const p = getPlan(id)
  if (!p) return 0
  return period === "monthly" ? p.precioUsd : p.precioUsdAnual
}

export function getInstallmentAmount(id: string): number {
  return getPlan(id)?.installmentAmount || 0
}

export function getInstallmentTotal(id: string): number {
  return getPlan(id)?.installmentPrice || 0
}

export function modalidadPermitida(planId: string, modalidad: string): boolean {
  const plan = getPlan(planId)
  if (!plan) return false
  return plan.modalidades.includes(modalidad as Modalidad)
}

export function planesActivos(): PlanDefinition[] {
  return Object.values(PLAN_DEFINITIONS).filter((p) => p.activo)
}

const legacyPlanMap: Record<string, string> = {
  free: "agenda",
  tienda: "comercio",
  basico: "agenda",
  negocio: "comercio",
  empresarial: "mayorista",
  advanced: "comercio",
  empresa: "mayorista",
  emprendedor: "comercio",
  reservas: "agenda",
}

export function resolvePlanId(id: string): string {
  return legacyPlanMap[id] || id
}

export function puedeAccederModulo(planId: string, modalidad: string | null, modulo: "tienda" | "agenda" | "b2b"): boolean {
  const resolved = resolvePlanId(planId)
  const plan = getPlan(resolved)
  if (!plan) return false

  if (modulo === "b2b") return resolved === "mayorista"
  if (resolved === "agenda") return modalidad === "agenda"
  if (resolved === "comercio") return true
  if (resolved === "mayorista") return true
  return false
}

export function requireAccesoModulo(
  planId: string,
  modalidad: string | null,
  modulo: "tienda" | "agenda" | "b2b",
  featureName?: string
): { allowed: boolean; error?: string } {
  const resolved = resolvePlanId(planId)
  const allowed = puedeAccederModulo(resolved, modalidad, modulo)
  if (!allowed) {
    const plan = getPlan(resolved)
    const name = featureName || `Módulo ${modulo}`
    return {
      allowed: false,
      error: `"${name}" no está disponible en tu plan ${plan?.label || planId}. Actualiza a un plan superior.`,
    }
  }
  return { allowed: true }
}

export const PLANS = PLAN_DEFINITIONS

export function hasModule(planId: string, module: PlanModule): boolean {
  const resolved = resolvePlanId(planId)
  const plan = getPlan(resolved)
  if (!plan) return false
  return plan.modules.includes(module)
}

export function requireAppointmentFeature(negocioId: string) {
  return { allowed: true }
}

export function getPlanModules(planId: string): PlanModule[] {
  const resolved = resolvePlanId(planId)
  const plan = getPlan(resolved)
  return plan?.modules?.filter((m): m is PlanModule => true) || []
}
