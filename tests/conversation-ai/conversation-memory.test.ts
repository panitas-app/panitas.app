import { describe, expect, it, vi } from "vitest"
import {
  detectTone,
  readCopilotMemory,
  recordAgentMessage,
  recordCopilotCustomer,
  COPILOT_MEMORY_TONE_KEY,
  COPILOT_MEMORY_RESPONSES_KEY,
  COPILOT_MEMORY_CUSTOMERS_KEY,
} from "@/lib/conversation-ai/conversation-memory"

function fakeEngine() {
  const store = new Map<string, { value: unknown }>()
  return {
    get: vi.fn(async (_ctx: unknown, key: string) => store.get(key) ?? null),
    observe: vi.fn(async (_ctx: unknown, obs: { key: string; value: unknown }) => {
      store.set(obs.key, { value: obs.value })
      return null
    }),
  }
}

const ctx = { storeId: "store-1", userId: "user-1", negocioId: null }

describe("detectTone (FASE 7B)", () => {
  it("detecta tono amable", () => {
    expect(detectTone("¡Hola María! 😊 Con gusto te ayudo")).toBe("amable")
  })

  it("detecta tono formal", () => {
    expect(detectTone("Estimado, le informo atentamente los detalles")).toBe("formal")
  })

  it("devuelve neutral sin señales claras", () => {
    expect(detectTone("Hola, reviso y te confirmo")).toBe("neutral")
  })
})

describe("readCopilotMemory / recordCopilot (FASE 7B)", () => {
  it("lee tono, frases y clientes frecuentes de la memoria", async () => {
    const engine = fakeEngine()
    await engine.observe(ctx, { key: COPILOT_MEMORY_TONE_KEY, value: "amable" })
    await engine.observe(ctx, { key: COPILOT_MEMORY_RESPONSES_KEY, value: "Hola, ¿te ayudo?||Buenas tardes" })
    await engine.observe(ctx, { key: COPILOT_MEMORY_CUSTOMERS_KEY, value: "María||Juan" })

    const memory = await readCopilotMemory(engine as never, ctx)
    expect(memory.tone).toBe("amable")
    expect(memory.frequentResponses).toHaveLength(2)
    expect(memory.frequentCustomers).toContain("María")
  })

  it("registra el tono de un mensaje del negocio como preferencia", async () => {
    const engine = fakeEngine()
    await recordAgentMessage(engine as never, ctx, { content: "Estimado, le confirmo su pedido atentamente" })

    const tone = await engine.get(ctx, COPILOT_MEMORY_TONE_KEY)
    expect(tone?.value).toBe("formal")
  })

  it("acumula frases frecuentes sin duplicar", async () => {
    const engine = fakeEngine()
    await recordAgentMessage(engine as never, ctx, { content: "Hola María, con gusto" })
    await recordAgentMessage(engine as never, ctx, { content: "Hola María, con gusto" })

    const responses = await engine.get(ctx, COPILOT_MEMORY_RESPONSES_KEY)
    const list = (responses?.value as string).split("||")
    expect(list).toHaveLength(1)
  })

  it("ignora mensajes vacíos", async () => {
    const engine = fakeEngine()
    await recordAgentMessage(engine as never, ctx, { content: "   " })
    expect(engine.observe).not.toHaveBeenCalled()
  })

  it("registra clientes frecuentes", async () => {
    const engine = fakeEngine()
    await recordCopilotCustomer(engine as never, ctx, { customerId: "c-1", customerName: "María" })
    const customers = await engine.get(ctx, COPILOT_MEMORY_CUSTOMERS_KEY)
    expect((customers?.value as string).split(",")).toContain("María")
  })
})
