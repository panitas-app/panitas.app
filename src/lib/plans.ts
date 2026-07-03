export type PlanId = "basico" | "negocio" | "empresarial"
export type PlanType = PlanId
export type Modalidad = "tienda" | "agenda"
export type PlanModule = "products" | "orders" | "appointments" | "crm" | "analytics" | "automations" | "b2b" | "reports" | "payments"

export interface PlanDefinition {
  id: PlanId
  label: string
  descripcion: string
  /** @deprecated Usa descripcion */
  description: string
  precioUsd: number
  /** @deprecated Usa precioUsd */
  priceMonthly: number
  precioUsdAnual: number
  /** @deprecated Usa precioUsdAnual */
  priceYearly: number
  modalidades: Modalidad[] // qué modalidades permite ("tienda" | "agenda" | ambas)
  requiresSelection: boolean // si requiere que el usuario elija modalidad al registrarse
  features: Record<string, boolean | number | string>
  activo: boolean
  sortOrder: number
  /** Lista de módulos habilitados (para pricing page) */
  modules: string[]
  limits: { products: number; teamMembers: number }
}

export const PLAN_DEFINITIONS: Record<PlanId, PlanDefinition> = {
  basico: {
    id: "basico",
    label: "Emprendedor",
    descripcion: "Elige Tienda o Reservas. Ideal para empezar tu negocio.",
    description: "Elige Tienda o Reservas. Ideal para empezar tu negocio.",
    precioUsd: 15,
    priceMonthly: 15,
    precioUsdAnual: 150,
    priceYearly: 150,
    modalidades: ["tienda", "agenda"],
    requiresSelection: true,
    features: {
      productos_ilimitados: false,
      crm: false,
      automations: false,
      dominio_propio: false,
      miembros_equipo: 1,
      almacenamiento_mb: 200,
    },
    activo: true,
    sortOrder: 1,
    modules: ["products", "orders", "payments", "whatsapp"],
    limits: { products: -1, teamMembers: 1 },
  },
  negocio: {
    id: "negocio",
    label: "Negocio",
    descripcion: "Sistema administrativo completo con empleados, sucursales, agenda multi-empleado, CRM, finanzas y reportes.",
    description: "Sistema administrativo completo con empleados, sucursales, agenda multi-empleado, CRM, finanzas y reportes.",
    precioUsd: 25,
    priceMonthly: 25,
    precioUsdAnual: 250,
    priceYearly: 250,
    modalidades: ["tienda", "agenda"],
    requiresSelection: false,
    features: {
      productos_ilimitados: true,
      empleados: true,
      agenda_multi_empleado: true,
      perfiles_publicos: true,
      comisiones: true,
      roles_personalizados: true,
      crm: true,
      automations: true,
      reportes: true,
      finanzas: true,
      dominio_propio: true,
      miembros_equipo: 10,
      almacenamiento_mb: 1000,
    },
    activo: true,
    sortOrder: 2,
    modules: ["products", "orders", "payments", "appointments", "whatsapp", "crm", "automations", "reports", "multiuser", "employees", "finances"],
    limits: { products: -1, teamMembers: 10 },
  },
  empresarial: {
    id: "empresarial",
    label: "Empresarial",
    descripcion: "Sistema B2B para mayoristas con clientes, precios por volumen y cotizaciones.",
    description: "Sistema B2B para mayoristas con clientes, precios por volumen y cotizaciones.",
    precioUsd: 35,
    priceMonthly: 35,
    precioUsdAnual: 350,
    priceYearly: 350,
    modalidades: [],
    requiresSelection: false,
    features: {
      b2b_clientes: true,
      precios_volumen: true,
      cotizaciones: true,
    },
    activo: true,
    sortOrder: 3,
    modules: ["products", "orders", "payments", "whatsapp", "crm", "reports", "multiuser"],
    limits: { products: -1, teamMembers: 10 },
  },
}

export function getPlan(id: string): PlanDefinition {
  return PLAN_DEFINITIONS[id as PlanId] || PLAN_DEFINITIONS.basico
}

export function getPlanLabel(id: string): string {
  return getPlan(id).label
}

export function getPlanPrice(id: string, period: "monthly" | "yearly"): number {
  const p = getPlan(id)
  return period === "monthly" ? p.precioUsd : p.precioUsdAnual
}

export function modalidadPermitida(planId: string, modalidad: string): boolean {
  const plan = getPlan(planId)
  return plan.modalidades.includes(modalidad as Modalidad)
}

export function planesActivos(): PlanDefinition[] {
  return Object.values(PLAN_DEFINITIONS).filter((p) => p.activo)
}

// ─── Validación de módulo contra plan+modalidad ───

/**
 * Verifica si un negocio con cierto plan y modalidad puede acceder a un módulo.
 * - Básico-Tienda: solo módulos de tienda
 * - Básico-Agenda: solo módulos de agenda
 * - Negocio: ambos
 * - Empresarial: depende de sus propias reglas (B2B)
 */
export function puedeAccederModulo(
  planId: string,
  modalidad: string | null,
  modulo: "tienda" | "agenda" | "b2b"
): boolean {
  const plan = getPlan(planId)

  if (modulo === "b2b") {
    return planId === "empresarial"
  }

  // Empresarial no usa tienda/agenda
  if (planId === "empresarial") return false

  // Negocio: ambos habilitados
  if (planId === "negocio") return true

  // Básico: depende de la modalidad elegida
  return modalidad === modulo
}

export function requireAccesoModulo(
  planId: string,
  modalidad: string | null,
  modulo: "tienda" | "agenda" | "b2b",
  featureName?: string
): { allowed: boolean; error?: string } {
  const allowed = puedeAccederModulo(planId, modalidad, modulo)
  if (!allowed) {
    const plan = getPlan(planId)
    const name = featureName || `Módulo ${modulo}`
    return {
      allowed: false,
      error: `"${name}" no está disponible en tu plan ${plan.label}. ${
        planId === "basico"
          ? `Elegiste modalidad "${modalidad}". Para acceder a ${modulo} debes migrar al plan Negocio.`
          : planId === "empresarial"
          ? "El plan Empresarial es un sistema B2B separado."
          : "Actualiza a un plan superior."
      }`,
    }
  }
  return { allowed: true }
}

// ─── Backward-compatible aliases ───

export const PLANS = PLAN_DEFINITIONS

const legacyPlanMap: Record<string, string> = {
  free: "basico",
  tienda: "basico",
  agenda: "basico",
  advanced: "negocio",
  empresa: "empresarial",
}

/** @deprecated Use puedeAccederModulo */
export function hasModule(planId: string, module: PlanModule): boolean {
  const resolved = legacyPlanMap[planId] || planId
  const plan = getPlan(resolved)
  if (module === "products" || module === "orders") return resolved === "negocio" || resolved === "basico" || resolved === "empresarial"
  if (module === "appointments") return resolved === "negocio" || resolved === "basico" || resolved === "empresarial"
  if (module === "crm") return resolved === "negocio" || resolved === "empresarial"
  if (module === "automations") return resolved === "negocio"
  if (module === "analytics") return resolved !== "basico"
  if (module === "b2b") return resolved === "empresarial"
  if (module === "reports") return resolved === "negocio" || resolved === "empresarial"
  return true
}

/** @deprecated Use puedeAccederModulo */
export function requireAppointmentFeature(negocioId: string) {
  return { allowed: true }
}

export function getPlanModules(planId: string): PlanModule[] {
  const modules: PlanModule[] = []
  const plan = getPlan(planId)
  if (plan.id === "basico" || plan.id === "negocio") {
    modules.push("products", "orders", "appointments")
  }
  if (plan.id === "negocio") {
    modules.push("crm", "automations", "analytics")
  }
  if (plan.id === "empresarial") {
    modules.push("b2b")
  }
  return modules
}
