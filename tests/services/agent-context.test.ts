import { describe, expect, it } from "vitest"
import { buildBusinessContext } from "@/lib/agent/context/business.context"
import { buildUserContext } from "@/lib/agent/context/user.context"
import {
  buildConversationContext,
  addMessage,
  lastMessages,
  recordAction,
} from "@/lib/agent/context/conversation.context"

describe("buildBusinessContext", () => {
  it("loads business info from store and negocio", () => {
    const bc = buildBusinessContext(
      { name: "Mi Tienda", slug: "mi-tienda", plan: "pro", showBolivares: true },
      { nombre: "Mi Negocio", pais: "VE", modalidad: "tienda", planEstado: "activo" }
    )
    expect(bc.name).toBe("Mi Tienda")
    expect(bc.currency).toBe("VES")
    expect(bc.timezone).toBe("America/Caracas")
    expect(bc.country).toBe("VE")
    expect(bc.plan).toBe("pro")
    expect(bc.planStatus).toBe("activo")
    expect(bc.modalidad).toBe("tienda")
    expect(bc.config?.showBolivares).toBe(true)
  })

  it("defaults currency to USD and handles missing store", () => {
    const bc = buildBusinessContext(null, { nombre: "Negocio X" })
    expect(bc.currency).toBe("USD")
    expect(bc.name).toBe("Negocio X")
  })
})

describe("buildUserContext", () => {
  it("loads user info, role and permissions", () => {
    const uc = buildUserContext({ name: "Juan", email: "juan@panitas.app" }, "manager", ["sales.read", "product.create"])
    expect(uc.name).toBe("Juan")
    expect(uc.email).toBe("juan@panitas.app")
    expect(uc.role).toBe("manager")
    expect(uc.permissions).toEqual(["sales.read", "product.create"])
    expect(uc.preferences).toEqual({})
  })
})

describe("conversation context", () => {
  it("builds, appends and reads messages", () => {
    let c = buildConversationContext("conv-1")
    c = addMessage(c, "user", "hola")
    c = addMessage(c, "assistant", "¿en qué te ayudo?")
    expect(c.id).toBe("conv-1")
    expect(c.messages).toHaveLength(2)
    expect(lastMessages(c, 1)).toEqual([c.messages[1]])
  })

  it("records performed actions", () => {
    let c = buildConversationContext("conv-1")
    c = recordAction(c, "inventory.check_stock", "success")
    expect(c.toolName).toBe("inventory.check_stock")
    expect(c.actionsPerformed).toHaveLength(1)
    expect(c.actionsPerformed[0].result).toBe("success")
  })
})
