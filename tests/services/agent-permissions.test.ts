import { describe, expect, it } from "vitest"
import {
  permissionsForRole,
  hasPermission,
  AGENT_ROLES,
  AGENT_PERMISSIONS,
} from "@/lib/agent/permissions"

describe("permissionsForRole", () => {
  it("gives admin all permissions", () => {
    const perms = permissionsForRole("admin")
    for (const p of AGENT_PERMISSIONS) {
      expect(perms).toContain(p)
    }
  })

  it("gives manager full permissions except critical actions", () => {
    const perms = permissionsForRole("manager")
    expect(perms).toContain("inventory.read")
    expect(perms).toContain("inventory.update")
    expect(perms).toContain("product.create")
    expect(perms).toContain("sales.create")
    expect(perms).toContain("agenda.create")
    expect(perms).not.toContain("inventory.delete")
    expect(perms).not.toContain("product.delete")
    expect(perms).not.toContain("sales.refund")
    expect(perms).not.toContain("order.cancel")
  })

  it("gives assistant read access and safe actions", () => {
    const perms = permissionsForRole("assistant")
    expect(perms).toContain("inventory.read")
    expect(perms).toContain("sales.read")
    expect(perms).toContain("customer.read")
    expect(perms).toContain("customer.create")
    expect(perms).toContain("agenda.read")
    expect(perms).toContain("report.read")
    expect(perms).not.toContain("inventory.update")
    expect(perms).not.toContain("sales.create")
    expect(perms).not.toContain("agenda.cancel")
  })

  it("gives seller limited read/write sales permissions", () => {
    const perms = permissionsForRole("seller")
    expect(perms).toContain("inventory.read")
    expect(perms).toContain("sales.create")
    expect(perms).toContain("customer.read")
    expect(perms).not.toContain("inventory.update")
    expect(perms).not.toContain("agenda.create")
  })

  it("falls back to read-only for unknown roles", () => {
    const perms = permissionsForRole("viewer")
    expect(perms).toContain("inventory.read")
    expect(perms).toContain("sales.read")
    expect(perms).toContain("customer.read")
    expect(perms).not.toContain("inventory.update")
    expect(perms).not.toContain("sales.create")
  })
})

describe("AGENT_ROLES", () => {
  it("exposes the role ids", () => {
    expect(AGENT_ROLES).toEqual(["admin", "manager", "assistant", "seller"])
  })
})

describe("hasPermission", () => {
  it("checks membership", () => {
    expect(hasPermission(["sales.read"], "sales.read")).toBe(true)
    expect(hasPermission(["sales.read"], "sales.create")).toBe(false)
  })
})
