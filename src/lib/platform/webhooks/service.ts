/**
 * Platform (FASE 8D) — WebhookService.
 * CRUD de suscripciones, log de entregas, dead-letter y reintento manual.
 */
import { randomBytes } from "node:crypto"
import type { PrismaClient } from "@prisma/client"
import { prisma as defaultPrisma } from "@/lib/prisma"
import { ApiError } from "@/lib/platform/errors"
import { assertSafeEndpoint } from "./ssrf"
import type { WebhookDeliveryRow, WebhookSubscriptionRow } from "./types"

export const DEAD_LETTER_FAILURE_THRESHOLD = 10

export function generateWebhookSecret(): string {
  return randomBytes(32).toString("hex")
}

export function parseEvents(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return [...new Set(parsed.filter((e): e is string => typeof e === "string" && e.length > 0))]
    }
  } catch {
    // fallthrough
  }
  return []
}

export interface CreateWebhookInput {
  storeId: string
  name: string
  endpoint: string
  events: unknown
  createdBy?: string | null
}

export class WebhookService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async create(input: CreateWebhookInput): Promise<{ subscription: WebhookSubscriptionRow; secret: string }> {
    const name = String(input.name || "").trim().slice(0, 80)
    if (!name) throw new ApiError("INVALID_REQUEST", "El nombre del webhook es obligatorio", 422)
    const endpoint = await assertSafeEndpoint(input.endpoint)
    const events = parseEvents(JSON.stringify(input.events))
    if (events.length === 0) {
      throw new ApiError("INVALID_REQUEST", "Selecciona al menos un evento", 422)
    }
    const secret = generateWebhookSecret()
    const row = await this.db.webhookSubscription.create({
      data: {
        storeId: input.storeId,
        name,
        endpoint,
        events: JSON.stringify(events),
        secret,
        createdBy: input.createdBy ?? null,
      },
    })
    return { subscription: row, secret }
  }

  async list(storeId: string): Promise<WebhookSubscriptionRow[]> {
    return this.db.webhookSubscription.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
    })
  }

  async getById(id: string, storeId: string): Promise<WebhookSubscriptionRow | null> {
    return this.db.webhookSubscription.findFirst({ where: { id, storeId } })
  }

  async update(
    id: string,
    storeId: string,
    patch: { name?: string; endpoint?: string; events?: unknown; status?: string }
  ): Promise<WebhookSubscriptionRow | null> {
    const existing = await this.getById(id, storeId)
    if (!existing) return null

    const data: Record<string, unknown> = {}
    if (patch.name !== undefined) {
      const name = String(patch.name).trim().slice(0, 80)
      if (!name) throw new ApiError("INVALID_REQUEST", "El nombre es obligatorio", 422)
      data.name = name
    }
    if (patch.endpoint !== undefined) {
      data.endpoint = await assertSafeEndpoint(patch.endpoint)
    }
    if (patch.events !== undefined) {
      const events = normalizeEventsInput(patch.events)
      if (events.length === 0) throw new ApiError("INVALID_REQUEST", "Selecciona al menos un evento", 422)
      data.events = JSON.stringify(events)
    }
    if (patch.status !== undefined) {
      if (!["active", "paused", "dead_letter"].includes(patch.status)) {
        throw new ApiError("INVALID_REQUEST", "Estado inválido", 422)
      }
      data.status = patch.status
      // Reactivar resetea el contador de fallos para permitir reintentos.
      if (patch.status === "active") data.failureCount = 0
    }

    return this.db.webhookSubscription.update({ where: { id }, data })
  }

  async remove(id: string, storeId: string): Promise<boolean> {
    const result = await this.db.webhookSubscription.deleteMany({ where: { id, storeId } })
    return result.count > 0
  }

  async listDeliveries(storeId: string, subscriptionId: string, limit = 50): Promise<WebhookDeliveryRow[]> {
    return this.db.webhookDelivery.findMany({
      where: { storeId, subscriptionId },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 200),
    })
  }

  /** Marca una suscripción como dead-letter cuando supera el umbral de fallos. */
  async markDeadLetter(storeId: string, subscriptionId: string): Promise<void> {
    const sub = await this.getById(subscriptionId, storeId)
    if (!sub) return
    if (sub.failureCount + 1 >= DEAD_LETTER_FAILURE_THRESHOLD) {
      await this.db.webhookSubscription.update({
        where: { id: subscriptionId },
        data: { status: "dead_letter" },
      })
    }
  }
}

function normalizeEventsInput(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.filter((e): e is string => typeof e === "string" && e.length > 0))]
}
