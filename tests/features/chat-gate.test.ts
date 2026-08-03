import { describe, expect, it, vi, beforeEach } from "vitest"

const { json } = vi.hoisted(() => ({
  json: vi.fn((body: unknown, init?: { status?: number }) => ({ body, init })),
}))

vi.mock("next/server", () => ({
  NextRequest: class NextRequest {
    json = vi.fn()
  },
  NextResponse: { json },
}))

vi.mock("@/lib/csrf", () => ({ csrfGuard: vi.fn().mockReturnValue(null) }))
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn().mockResolvedValue({ success: true }) }))
vi.mock("@/lib/permissions", () => ({ requireRole: vi.fn() }))
vi.mock("@/lib/features", () => ({ requireFeature: vi.fn() }))
vi.mock("@/lib/conversation", () => ({ createConversationEngine: vi.fn() }))
vi.mock("@/lib/audit", () => ({ createAuditEntry: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/services/http", () => ({ toServiceResponse: (e: Error) => ({ error: e.message }) }))

import { requireRole } from "@/lib/permissions"
import { requireFeature } from "@/lib/features"
import { createConversationEngine } from "@/lib/conversation"

let POST: (req: unknown) => Promise<unknown>

const current = {
  userId: "user-1",
  role: "admin",
  store: { id: "store-1", name: "Mi Tienda", plan: "comercio", negocioId: null },
}

function makeRequest(message: string, extra: Record<string, unknown> = {}) {
  return { json: vi.fn().mockResolvedValue({ message, ...extra }) } as never
}

const chatResult = {
  response: { ok: true, provider: "openrouter", model: "gpt-4o-mini", toolCalls: [], content: "hola" },
  conversationId: "conv-1",
  metadata: { status: "completed" },
}

describe("POST /api/agent/chat — gate de plan (basic_ai)", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.mocked(requireRole).mockResolvedValue(current as never)
    // El route cachea el engine a nivel de módulo: recargamos el módulo por test
    // para que cada test arranque con su propio engine mock.
    vi.resetModules()
    ;({ POST } = await import("@/app/api/agent/chat/route"))
  })

  it("permite el chat cuando el plan incluye basic_ai", async () => {
    vi.mocked(requireFeature).mockReturnValue({ allowed: true })
    const chat = vi.fn().mockResolvedValue(chatResult)
    vi.mocked(createConversationEngine).mockReturnValue({ chat } as never)

    await POST(makeRequest("¿cuánto stock tengo?"))

    expect(requireFeature).toHaveBeenCalledWith("comercio", "basic_ai")
    expect(chat).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: "store-1", userId: "user-1", plan: "comercio" }),
      expect.objectContaining({ message: "¿cuánto stock tengo?" })
    )
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ conversationId: "conv-1" }))
  })

  it("devuelve 403 y no crea el engine cuando el plan no incluye basic_ai", async () => {
    const denied = {
      allowed: false,
      requiredPlan: "business_plus",
      error: 'La función "Asistente IA" no está incluida en tu plan actual.',
    }
    vi.mocked(requireFeature).mockReturnValue(denied)

    await POST(makeRequest("hola"))

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'La función "Asistente IA" no está incluida en tu plan actual.' }),
      expect.objectContaining({ status: 403 })
    )
    expect(createConversationEngine).not.toHaveBeenCalled()
  })

  it("rechaza mensaje vacío con 400 sin tocar el engine", async () => {
    vi.mocked(requireFeature).mockReturnValue({ allowed: true })

    await POST(makeRequest("   "))

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "El mensaje no puede estar vacío" }),
      expect.objectContaining({ status: 400 })
    )
    expect(createConversationEngine).not.toHaveBeenCalled()
  })

  it("reenvía confirmedStepIds al engine en la segunda vuelta de confirmación", async () => {
    vi.mocked(requireFeature).mockReturnValue({ allowed: true })
    const chat = vi.fn().mockResolvedValue({
      ...chatResult,
      confirmation: {
        actions: [{ stepId: "step-1", tool: "products.delete", description: "Eliminar", impact: "No recuperable" }],
        confirmCodes: ["confirm:step-1"],
        message: "Necesito tu confirmación.",
        requestedAt: "2026-01-01T00:00:00.000Z",
      },
    })
    vi.mocked(createConversationEngine).mockReturnValue({ chat } as never)

    await POST(makeRequest("elimina el producto", { confirmedStepIds: ["step-1"] }))

    expect(chat).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: "store-1" }),
      expect.objectContaining({ message: "elimina el producto", confirmedStepIds: ["step-1"] })
    )
  })

  it("filtra IDs no string de confirmedStepIds y valida el límite", async () => {
    vi.mocked(requireFeature).mockReturnValue({ allowed: true })
    const chat = vi.fn().mockResolvedValue(chatResult)
    vi.mocked(createConversationEngine).mockReturnValue({ chat } as never)

    await POST(makeRequest("ejecuta", { confirmedStepIds: ["step-1", 123, "", "step-2"] }))
    expect(chat).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ confirmedStepIds: ["step-1", "step-2"] })
    )

    await POST(makeRequest("ejecuta", { confirmedStepIds: Array.from({ length: 11 }, (_, i) => `s${i}`) }))
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Demasiadas confirmaciones en la solicitud" }),
      expect.objectContaining({ status: 400 })
    )
  })
})
