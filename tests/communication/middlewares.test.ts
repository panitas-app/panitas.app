import { describe, expect, it, vi } from "vitest"
import {
  composeSendMiddlewares,
  MAX_TEXT_LENGTH,
  normalizeInboundEvent,
  normalizeOutboundMiddleware,
  rateLimitMiddleware,
  retryMiddleware,
  validateOutboundMiddleware,
  type ProviderOutboundInput,
  type ProviderSendResult,
} from "@/lib/communication"
import { isServiceError } from "@/services/errors"

const okSend = async (input: ProviderOutboundInput): Promise<ProviderSendResult> => ({
  providerId: "mock-whatsapp",
  channel: input.channel,
  externalMessageId: "ext-1",
  status: "sent",
  latencyMs: 5,
  retries: 0,
})

function base(input: Partial<ProviderOutboundInput>): ProviderOutboundInput {
  return { channel: "whatsapp", conversationId: "conv-1", recipient: "+593991234567", text: "Hola", ...input }
}

describe("middlewares de envío (FASE 7C)", () => {
  it("valida que exista destinatario, conversación y contenido", async () => {
    const send = composeSendMiddlewares([validateOutboundMiddleware], okSend)
    await expect(send(base({ recipient: "" }))).rejects.toSatisfy((e) => isServiceError(e) && (e as { status: number }).status === 400)
    await expect(send(base({ conversationId: "" }))).rejects.toSatisfy((e) => isServiceError(e) && (e as { status: number }).status === 400)
    await expect(send(base({ text: "", attachments: [] }))).rejects.toSatisfy(
      (e) => isServiceError(e) && (e as { status: number }).status === 400,
    )
    await expect(send(base({ channel: "telegram" as never }))).rejects.toSatisfy(
      (e) => isServiceError(e) && (e as { status: number }).status === 400,
    )
  })

  it("rechaza mensajes que exceden el límite de caracteres", async () => {
    const send = composeSendMiddlewares([validateOutboundMiddleware], okSend)
    await expect(send(base({ text: "a".repeat(MAX_TEXT_LENGTH + 1) }))).rejects.toSatisfy(
      (e) => isServiceError(e) && (e as { status: number }).status === 400,
    )
  })

  it("normaliza el texto antes de enviar (recorta espacios)", async () => {
    const spy = vi.fn(okSend)
    const send = composeSendMiddlewares([normalizeOutboundMiddleware], spy)
    await send(base({ text: "  Hola María  " }))
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ text: "Hola María", attachments: [], metadata: {} }))
  })

  it("aplica rate limit por ventana deslizante (429 al superar)", async () => {
    const send = composeSendMiddlewares([rateLimitMiddleware({ limit: 2, windowMs: 5_000 })], okSend)
    await send(base({}))
    await send(base({}))
    await expect(send(base({}))).rejects.toSatisfy((e) => isServiceError(e) && (e as { status: number }).status === 429)
  })

  it("reintenta envíos fallidos y reporta los reintentos en el resultado", async () => {
    const onRetry = vi.fn()
    let calls = 0
    const flakySend = async (input: ProviderOutboundInput): Promise<ProviderSendResult> => {
      calls += 1
      if (calls < 3) throw new Error("red caída")
      return { ...(await okSend(input)), retries: 0 }
    }
    const send = composeSendMiddlewares(
      [retryMiddleware({ attempts: 3, baseDelayMs: 0, maxDelayMs: 0, onRetry })],
      flakySend,
    )
    const result = await send(base({}))
    expect(calls).toBe(3)
    expect(result.retries).toBe(2)
    expect(onRetry).toHaveBeenCalledTimes(2)
  })

  it("agota los reintentos y lanza el último error", async () => {
    let calls = 0
    const alwaysFail = async (): Promise<ProviderSendResult> => {
      calls += 1
      throw new Error("siempre falla")
    }
    const send = composeSendMiddlewares([retryMiddleware({ attempts: 2, baseDelayMs: 0, maxDelayMs: 0 })], alwaysFail)
    await expect(send(base({}))).rejects.toThrow("siempre falla")
    expect(calls).toBe(2)
  })

  it("no reintenta errores de validación 4xx", async () => {
    let calls = 0
    const bad = async (): Promise<ProviderSendResult> => {
      calls += 1
      throw Object.assign(new Error("límite"), { status: 429 })
    }
    const send = composeSendMiddlewares([retryMiddleware({ attempts: 3, baseDelayMs: 0, maxDelayMs: 0 })], bad)
    await expect(send(base({}))).rejects.toThrow("límite")
    expect(calls).toBe(1)
  })

  it("normaliza eventos entrantes al modelo unificado", () => {
    const event = normalizeInboundEvent({
      providerId: "mock-whatsapp",
      channel: "whatsapp",
      conversationId: "conv-1",
      recipient: "cid:conv-1",
      text: "  ¿Tienen stock?  ",
      externalMessageId: "mid-1",
      metadata: { webhook: "generic" },
    })
    expect(event.message).toMatchObject({
      id: "mid-1",
      channel: "whatsapp",
      conversationId: "conv-1",
      sender: "customer",
      text: "¿Tienen stock?",
      status: "received",
      attachments: [],
    })
    expect(event.message.timestamp).toEqual(expect.any(String))
  })
})
