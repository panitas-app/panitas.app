import { describe, expect, it, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { verifyScannerToken } from "@/lib/scanner/session-token"

type PostHandler = (request: NextRequest) => Promise<Response>
let scanPOST: PostHandler
let disconnectPOST: PostHandler
let connectPOST: PostHandler

const init = (async () => {
  scanPOST = (await import("@/app/api/scanner/scan/route")).POST
  disconnectPOST = (await import("@/app/api/scanner/disconnect/route")).POST
  connectPOST = (await import("@/app/api/scanner/connect/route")).POST
})()

const holder = vi.hoisted(() => ({
  session: null as any,
  prisma: null as any,
}))

vi.mock("@/lib/prisma", () => ({
  get prisma() {
    return holder.prisma
  },
}))

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ success: true, remaining: 59, resetIn: 60000 })),
}))

vi.mock("@/lib/pusher", () => ({
  triggerSessionEvent: vi.fn(async () => {}),
}))

import { rateLimit } from "@/lib/rate-limit"
import { triggerSessionEvent } from "@/lib/pusher"

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/scanner", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "sess-1",
    storeId: "store-1",
    negocioId: "negocio-1",
    userId: "user-1",
    status: "connected",
    token: "token-secreto-1",
    expiresAt: new Date(Date.now() + 60 * 1000),
    createdAt: new Date(),
    lastActivity: new Date(),
    deviceName: "Teléfono",
    ...overrides,
  }
}

beforeEach(async () => {
  await init
  vi.clearAllMocks()
  holder.session = makeSession()
  holder.prisma = {
    scannerSession: {
      findUnique: vi.fn(async () => holder.session),
      update: vi.fn(async (args: any) => args.data),
    },
    scannerEvent: {
      create: vi.fn(async () => ({})),
    },
  }
  ;(rateLimit as any).mockResolvedValue({ success: true, remaining: 59, resetIn: 60000 })
  ;(triggerSessionEvent as any).mockResolvedValue(undefined)
})

describe("verifyScannerToken (FASE 8G — fix P1 scanner)", () => {
  it("true para token exacto", () => {
    expect(verifyScannerToken("abc-123", "abc-123")).toBe(true)
  })

  it("false para token distinto", () => {
    expect(verifyScannerToken("abc-123", "abc-124")).toBe(false)
  })

  it("false si las longitudes difieren", () => {
    expect(verifyScannerToken("abc-123", "abc-12345")).toBe(false)
  })

  it("false si el token recibido es null/undefined/vacío", () => {
    expect(verifyScannerToken("abc-123", null)).toBe(false)
    expect(verifyScannerToken("abc-123", undefined)).toBe(false)
    expect(verifyScannerToken("abc-123", "")).toBe(false)
  })
})

describe("POST /api/scanner/scan (FASE 8G — fix P1 scanner)", () => {
  it("400 si falta el token", async () => {
    const res = await scanPOST(makeRequest({ sessionId: "sess-1", barcode: "123" }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/token/i)
    expect(holder.prisma.scannerEvent.create).not.toHaveBeenCalled()
  })

  it("403 si el token no coincide con la sesión", async () => {
    const res = await scanPOST(makeRequest({ sessionId: "sess-1", token: "token-incorrecto", barcode: "123" }))
    expect(res.status).toBe(403)
    expect(holder.prisma.scannerEvent.create).not.toHaveBeenCalled()
  })

  it("404 si la sesión no existe", async () => {
    holder.session = null
    const res = await scanPOST(makeRequest({ sessionId: "sess-x", token: "token-secreto-1", barcode: "123" }))
    expect(res.status).toBe(404)
  })

  it("200 y crea evento con token válido", async () => {
    const res = await scanPOST(makeRequest({ sessionId: "sess-1", token: "token-secreto-1", barcode: "  750123  " }))
    expect(res.status).toBe(200)
    expect(holder.prisma.scannerEvent.create).toHaveBeenCalledWith({
      data: { sessionId: "sess-1", type: "barcode_scanned", payload: JSON.stringify({ barcode: "750123" }) },
    })
    expect(triggerSessionEvent).toHaveBeenCalled()
  })

  it("410 si la sesión expiró", async () => {
    holder.session = makeSession({ expiresAt: new Date(Date.now() - 1000) })
    const res = await scanPOST(makeRequest({ sessionId: "sess-1", token: "token-secreto-1", barcode: "123" }))
    expect(res.status).toBe(410)
    expect(holder.prisma.scannerEvent.create).not.toHaveBeenCalled()
  })
})

describe("POST /api/scanner/disconnect (FASE 8G — fix P1 scanner)", () => {
  it("400 si falta el token", async () => {
    const res = await disconnectPOST(makeRequest({ sessionId: "sess-1" }))
    expect(res.status).toBe(400)
    expect(holder.prisma.scannerSession.update).not.toHaveBeenCalled()
  })

  it("403 si el token no coincide con la sesión", async () => {
    const res = await disconnectPOST(makeRequest({ sessionId: "sess-1", token: "token-incorrecto" }))
    expect(res.status).toBe(403)
    expect(holder.prisma.scannerSession.update).not.toHaveBeenCalled()
  })

  it("200 y desconecta con token válido", async () => {
    const res = await disconnectPOST(makeRequest({ sessionId: "sess-1", token: "token-secreto-1" }))
    expect(res.status).toBe(200)
    expect(holder.prisma.scannerSession.update).toHaveBeenCalledWith({
      where: { id: "sess-1" },
      data: { status: "disconnected", lastActivity: expect.any(Date) },
    })
  })
})

describe("POST /api/scanner/connect (FASE 8G — consistencia de token)", () => {
  it("403 si el token no coincide", async () => {
    const res = await connectPOST(makeRequest({ sessionId: "sess-1", token: "token-incorrecto", deviceName: "Teléfono" }))
    expect(res.status).toBe(403)
  })

  it("200 con token válido y registra conexión", async () => {
    const res = await connectPOST(makeRequest({ sessionId: "sess-1", token: "token-secreto-1", deviceName: "Android" }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(holder.prisma.scannerSession.update).toHaveBeenCalledWith({
      where: { id: "sess-1" },
      data: { status: "connected", deviceName: "Android", lastActivity: expect.any(Date) },
    })
  })
})
