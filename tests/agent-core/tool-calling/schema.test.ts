import { describe, expect, it } from "vitest"
import { toProviderTools, toJsonSchema } from "@/lib/agent-core/tool-calling/schema"
import type { ToolMetadata } from "@/lib/agent/tools"

function tool(overrides: Partial<ToolMetadata> = {}): ToolMetadata {
  return {
    name: "sales.create",
    domain: "sales",
    description: "Registra una venta",
    requiredPermissions: ["sales.create"],
    inputSchema: { type: "object", properties: {} },
    ...overrides,
  }
}

describe("tool-calling/schema", () => {
  it("toJsonSchema convierte properties y required", () => {
    const schema = toJsonSchema({
      type: "object",
      properties: {
        items: { type: "array", description: "Ítems de la venta", required: true },
        customerPhone: { type: "string", description: "Teléfono del cliente" },
      },
    })
    expect(schema).toEqual({
      type: "object",
      properties: {
        items: { type: "array", description: "Ítems de la venta" },
        customerPhone: { type: "string", description: "Teléfono del cliente" },
      },
      required: ["items"],
    })
  })

  it("omite required cuando no hay parámetros obligatorios", () => {
    const schema = toJsonSchema({ type: "object", properties: { q: { type: "string" } } })
    expect(schema.required).toBeUndefined()
  })

  it("toProviderTools genera definiciones OpenAI-compatibles", () => {
    const defs = toProviderTools([
      tool(),
      tool({ name: "inventory.getStock", domain: "inventory", description: "Stock", inputSchema: { type: "object", properties: { productId: { type: "string", required: true } } } }),
    ])
    expect(defs).toEqual([
      {
        type: "function",
        function: {
          name: "sales.create",
          description: "Registra una venta",
          parameters: { type: "object", properties: {} },
        },
      },
      {
        type: "function",
        function: {
          name: "inventory.getStock",
          description: "Stock",
          parameters: { type: "object", properties: { productId: { type: "string", description: "" } }, required: ["productId"] },
        },
      },
    ])
  })
})
