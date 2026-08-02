import { describe, expect, it } from "vitest"
import { ResponseFormatter } from "@/lib/agent-core/response-formatter"
import type { AgentRequest } from "@/lib/agent-core"

const request: AgentRequest = {
  userId: "u1",
  storeId: "s1",
  role: "admin",
  permissions: ["report.read"],
  message: "hola",
}

const opts = { sessionId: "sess-1", taskType: "chat" as const, toolCalls: [] }

describe("ResponseFormatter", () => {
  it("normaliza la respuesta del proveedor (nunca raw)", () => {
    const formatter = new ResponseFormatter(() => "id-1")
    const response = formatter.format(
      { provider: "openrouter", model: "m-free", content: "  Hola mundo  ", usage: { promptTokens: 5, totalTokens: 9 } },
      request,
      opts
    )
    expect(response.id).toBe("id-1")
    expect(response.reply).toBe("Hola mundo")
    expect(response.provider).toBe("openrouter")
    expect(response.model).toBe("m-free")
    expect(response.usage).toEqual({ promptTokens: 5, totalTokens: 9 })
    expect(response.ok).toBe(true)
    expect(response.error).toBeUndefined()
    expect(response.createdAt).toBeDefined()
  })

  it("no expone campo raw del proveedor", () => {
    const formatter = new ResponseFormatter()
    const response = formatter.format({ provider: "openrouter", model: "m", content: "x" }, request, opts)
    expect(response).not.toHaveProperty("raw")
  })

  it("adhiere salida estructurada sin perder el formato", () => {
    const formatter = new ResponseFormatter()
    const response = formatter.formatStructured({ ok: true }, { provider: "openrouter", model: "m-json", content: "" }, request, opts)
    expect(response.structured).toEqual({ ok: true })
    expect(response.ok).toBe(true)
  })

  it("formatea errores sin exponer detalles crudos del proveedor", () => {
    const formatter = new ResponseFormatter()
    const response = formatter.formatError(new Error("rate limited"), request, { ...opts, taskType: "chat" })
    expect(response.ok).toBe(false)
    expect(response.error).toBe("rate limited")
    expect(response.reply).toBe("rate limited")
    expect(response.provider).toBe("unknown")
  })

  it("usa taskType del request si no se pasa", () => {
    const formatter = new ResponseFormatter()
    const response = formatter.formatError("boom", { ...request, taskType: "json" }, { sessionId: "s", toolCalls: [] })
    expect(response.taskType).toBe("json")
  })
})
