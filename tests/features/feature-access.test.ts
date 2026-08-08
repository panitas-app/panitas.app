import { describe, expect, it } from "vitest"
import {
  getPlanFeatures,
  getPlanLimits,
  hasFeature,
  isBusiness,
  isBusinessPlus,
  requireFeature,
  tryHasFeature,
} from "@/lib/features"

describe("capa de features: hasFeature", () => {
  it("un plan BUSINESS puede usar features base", () => {
    for (const ref of ["comercio", "negocio", "tienda", "emprendedor", "free", "business"]) {
      expect(hasFeature(ref, "inventory")).toBe(true)
      expect(hasFeature(ref, "pos")).toBe(true)
      expect(hasFeature(ref, "crm")).toBe(true)
      expect(hasFeature(ref, "online_store")).toBe(true)
      expect(hasFeature(ref, "reports")).toBe(true)
      expect(hasFeature(ref, "basic_ai")).toBe(true)
    }
  })

  it("un plan BUSINESS NO accede a features de Plus", () => {
    const plusFeatures = [
      "unified_chat",
      "whatsapp_inbox",
      "instagram_inbox",
      "facebook_inbox",
      "ai_reply_suggestions",
      "customer_analysis",
      "sales_opportunities",
    ]
    for (const ref of ["comercio", "negocio", "tienda", "emprendedor", "free", "business"]) {
      for (const feature of plusFeatures) {
        expect(hasFeature(ref, feature), `${ref} debería no tener ${feature}`).toBe(false)
      }
    }
  })

  it("un plan BUSINESS_PLUS accede a todas las features", () => {
    const allFeatures = getPlanFeatures("business_plus")
    for (const ref of ["mayorista", "empresa", "empresarial", "advanced", "plus", "business_plus", "negocios_plus"]) {
      for (const feature of allFeatures) {
        expect(hasFeature(ref, feature), `${ref} debería tener ${feature}`).toBe(true)
      }
    }
  })

  it("acepta contexto con plan/planType/planId", () => {
    expect(hasFeature({ planType: "tienda" }, "unified_chat")).toBe(false)
    expect(hasFeature({ planType: "empresa" }, "unified_chat")).toBe(true)
    expect(hasFeature({ plan: "free", planType: "tienda" }, "crm")).toBe(true)
    expect(hasFeature({ planId: "mayorista" }, "sales_opportunities")).toBe(true)
    expect(hasFeature({ planSlug: "business_plus" }, "unified_chat")).toBe(true)
  })

  it("soporta los alias de FASE 2A (store, conversations, ai_sales)", () => {
    expect(hasFeature("business", "store")).toBe(true)
    expect(hasFeature("comercio", "conversations")).toBe(false)
    expect(hasFeature("mayorista", "conversations")).toBe(true)
    expect(hasFeature("mayorista", "ai_sales")).toBe(true)
  })

  it("lanza error si la feature no existe", () => {
    expect(() => hasFeature("comercio", "no_existe")).toThrow()
    expect(() => hasFeature("mayorista", "hologramas")).toThrow(/Feature desconocida/)
  })

  it("normaliza valores desconocidos a BUSINESS (nunca deniega un plan nuevo)", () => {
    expect(hasFeature("alguna_futura_edicion", "inventory")).toBe(true)
    expect(hasFeature(undefined, "crm")).toBe(true)
    expect(hasFeature(null, "crm")).toBe(true)
    expect(hasFeature(undefined, "unified_chat")).toBe(false)
  })
})

describe("capa de features: tryHasFeature", () => {
  it("devuelve FeatureAccess con allowed true/false sin lanzar", () => {
    expect(tryHasFeature("comercio", "unified_chat").allowed).toBe(false)
    expect(tryHasFeature("comercio", "unified_chat").requiredPlan).toBe("business_plus")
    expect(tryHasFeature("comercio", "unified_chat").reason).toBe("not_in_plan")
    expect(tryHasFeature("mayorista", "unified_chat").allowed).toBe(true)
  })

  it("marca feature desconocida como unknown_feature", () => {
    const access = tryHasFeature("comercio", "nope")
    expect(access.allowed).toBe(false)
    expect(access.reason).toBe("unknown_feature")
  })
})

describe("capa de features: requireFeature", () => {
  it("permite el acceso cuando el plan incluye la feature", () => {
    expect(requireFeature("mayorista", "unified_chat")).toEqual({ allowed: true })
    expect(requireFeature("comercio", "inventory")).toEqual({ allowed: true })
  })

  it("deniega con mensaje y plan requerido cuando no la incluye", () => {
    const result = requireFeature("comercio", "unified_chat")
    expect(result.allowed).toBe(false)
    expect(result.requiredPlan).toBe("business_plus")
    expect(result.error).toContain("Centro de chats")
  })
})

describe("capa de features: helpers de plan", () => {
  it("isBusinessPlus / isBusiness", () => {
    expect(isBusinessPlus("mayorista")).toBe(true)
    expect(isBusinessPlus("empresa")).toBe(true)
    expect(isBusinessPlus("comercio")).toBe(false)
    expect(isBusiness("comercio")).toBe(true)
    expect(isBusinessPlus(undefined)).toBe(false)
  })

  it("getPlanLimits devuelve los límites declarados por plan", () => {
    const business = getPlanLimits("comercio")
    expect(business.products).toBe(200)
    expect(business.allowedUsers).toBe(2)
    expect(business.chatChannels).toBe(0)

    const plus = getPlanLimits("mayorista")
    expect(plus.products).toBeNull()
    expect(plus.allowedUsers).toBe(5)
    expect(plus.chatChannels).toBe(3)
    expect(plus.aiRequestsPerMonth).toBe(500)
  })

  it("getPlanFeatures expone el catálogo correcto", () => {
    const business = getPlanFeatures("comercio")
    expect(business).toContain("inventory")
    expect(business).toContain("online_store")
    expect(business).not.toContain("unified_chat")

    const plus = getPlanFeatures("mayorista")
    expect(plus).toHaveLength(14)
    expect(plus).toContain("unified_chat")
    expect(plus).toContain("customer_analysis")
    expect(plus).toContain("knowledge_base")
  })
})
