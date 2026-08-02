export type BusinessConfig = Record<string, unknown>

export type BusinessContext = {
  name: string
  slug?: string | null
  country?: string | null
  currency: string
  timezone: string
  industry?: string | null
  plan?: string | null
  planStatus?: string | null
  modalidad?: string | null
  config?: BusinessConfig
}

export type BusinessSource = {
  name?: string | null
  slug?: string | null
  plan?: string | null
  planStatus?: string | null
  planType?: string | null
  template?: string | null
  storeHours?: string | null
  creditDays?: string | null
  showBolivares?: boolean | null
}

export type NegocioSource = {
  nombre?: string | null
  pais?: string | null
  modalidad?: string | null
  planEstado?: string | null
}

export function buildBusinessContext(
  store: BusinessSource | null | undefined,
  negocio: NegocioSource | null | undefined
): BusinessContext {
  return {
    name: store?.name || negocio?.nombre || "",
    slug: store?.slug ?? null,
    country: negocio?.pais ?? null,
    currency: store?.showBolivares ? "VES" : "USD",
    timezone: "America/Caracas",
    industry: null,
    plan: store?.plan ?? null,
    planStatus: store?.planStatus ?? negocio?.planEstado ?? null,
    modalidad: negocio?.modalidad ?? store?.planType ?? null,
    config: {
      template: store?.template ?? null,
      storeHours: store?.storeHours ?? null,
      creditDays: store?.creditDays ?? null,
      showBolivares: store?.showBolivares ?? null,
    },
  }
}
