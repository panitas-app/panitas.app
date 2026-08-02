import { describe, expect, it } from "vitest"
import { PermissionChecker } from "@/lib/agent-core/permission-checker"
import type { AgentRequest } from "@/lib/agent-core"

const adminRequest: AgentRequest = {
  userId: "u1",
  storeId: "s1",
  role: "admin",
  permissions: ["inventory.read", "inventory.update", "report.read"],
  message: "x",
}

const readOnlyRequest: AgentRequest = {
  userId: "u2",
  storeId: "s1",
  role: "assistant",
  permissions: ["inventory.read"],
  message: "x",
}

describe("PermissionChecker", () => {
  it("permite por defecto a cualquier usuario autenticado", () => {
    const checker = new PermissionChecker()
    expect(checker.checkRequest(readOnlyRequest).allowed).toBe(true)
  })

  it("exige permiso del asistente si se configura", () => {
    const checker = new PermissionChecker({ assistantPermission: "report.read" })
    expect(checker.checkRequest(adminRequest).allowed).toBe(true)
    expect(checker.checkRequest({ ...readOnlyRequest, permissions: ["inventory.read"] }).allowed).toBe(false)
  })

  it("permite herramienta si el usuario tiene al menos un permiso requerido", () => {
    const checker = new PermissionChecker()
    expect(checker.checkTool(adminRequest, "inventory.adjust_stock", ["inventory.update"]).allowed).toBe(true)
    expect(checker.checkTool(readOnlyRequest, "inventory.adjust_stock", ["inventory.update"]).allowed).toBe(false)
  })

  it("permite herramientas sin permisos requeridos", () => {
    const checker = new PermissionChecker()
    expect(checker.checkTool(readOnlyRequest, "sin_permisos", []).allowed).toBe(true)
  })

  it("devuelve el permiso requerido en la denegación", () => {
    const checker = new PermissionChecker()
    const decision = checker.checkTool(readOnlyRequest, "inventory.adjust_stock", ["inventory.update"])
    expect(decision.allowed).toBe(false)
    expect(decision.requiredPermission).toBe("inventory.update")
    expect(decision.reason).toContain("inventory.adjust_stock")
  })
})
