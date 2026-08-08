/**
 * WhatsApp Cloud API (FASE 8A) — Conexiones por negocio (multi-tenant).
 *
 * Gestiona el modelo `ChannelConnection`: cada negocio guarda su propia conexión
 * real a WhatsApp (access token, phone number id de la WABA, verify token).
 *
 *  - `status`: pending → connected → disconnected | error | revoked.
 *  - Los secrets viven en `config` (JSON) y NUNCA salen en DTOs ni logs
 *    (`sanitizeProviderConfig`).
 *  - Desconectar NO borra datos ni credenciales; revocar sí las limpia.
 *  - Cada mutación emite eventos `whatsapp.*` y registra auditoría.
 */
import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@prisma/client"
import { serviceError } from "@/services/errors"
import { fireDomainEvent } from "@/lib/events"
import { createAuditEntry } from "@/lib/audit"
import { sanitizeProviderConfig } from "@/lib/communication"
import type { InboxContext } from "@/lib/inbox"
import { InboxChannelManager } from "@/lib/inbox"
import type { WhatsAppConnectionConfig } from "@/lib/communication"

export const WHATSAPP_CONNECTION_STATUSES = ["pending", "connected", "disconnected", "error", "revoked"] as const
export type WhatsAppConnectionStatus = (typeof WHATSAPP_CONNECTION_STATUSES)[number]

export interface WhatsAppConnectionInput {
  accessToken: string
  phoneNumberId: string
  wabaId?: string
  verifyToken?: string
  appSecret?: string
  displayPhoneNumber?: string
}

export interface WhatsAppConnectionDTO {
  id: string
  channelId: string
  provider: string
  status: WhatsAppConnectionStatus
  configured: boolean
  phoneNumberId: string
  wabaId?: string
  verifyTokenSet: boolean
  displayPhoneNumber?: string
  errorMessage: string | null
  connectedAt: string | null
  disconnectedAt: string | null
  lastHealthAt: string | null
  createdAt: string
  updatedAt: string
}

type ConnectionRow = {
  id: string
  channelId: string
  provider: string
  status: string
  config: string
  externalRef: string | null
  errorMessage: string | null
  connectedAt: Date | null
  disconnectedAt: Date | null
  lastHealthAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export class ChannelConnectionService {
  private readonly channels: InboxChannelManager

  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.channels = new InboxChannelManager(db)
  }

  // ── Helpers de parseo / DTO ──────────────────────────────────────────────

  /** Parsea el `config` JSON de una conexión a credenciales tipadas. */
  parseConfig(connection: { config: string }): WhatsAppConnectionConfig {
    try {
      const parsed = JSON.parse(connection.config) as Record<string, unknown>
      return {
        accessToken: typeof parsed.accessToken === "string" ? parsed.accessToken : "",
        phoneNumberId: typeof parsed.phoneNumberId === "string" ? parsed.phoneNumberId : "",
        wabaId: typeof parsed.wabaId === "string" ? parsed.wabaId : undefined,
        verifyToken: typeof parsed.verifyToken === "string" ? parsed.verifyToken : undefined,
        appSecret: typeof parsed.appSecret === "string" ? parsed.appSecret : undefined,
      }
    } catch {
      return { accessToken: "", phoneNumberId: "" }
    }
  }

  toDTO(row: ConnectionRow & { channel?: { type: string; name: string } | null }): WhatsAppConnectionDTO {
    const config = this.parseConfig(row)
    return {
      id: row.id,
      channelId: row.channelId,
      provider: row.provider,
      status: (WHATSAPP_CONNECTION_STATUSES as readonly string[]).includes(row.status)
        ? (row.status as WhatsAppConnectionStatus)
        : "error",
      configured: Boolean(config.accessToken && config.phoneNumberId),
      phoneNumberId: config.phoneNumberId,
      wabaId: config.wabaId,
      verifyTokenSet: Boolean(config.verifyToken),
      displayPhoneNumber: row.externalRef || undefined,
      errorMessage: row.errorMessage,
      connectedAt: row.connectedAt?.toISOString() ?? null,
      disconnectedAt: row.disconnectedAt?.toISOString() ?? null,
      lastHealthAt: row.lastHealthAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  // ── Consultas ─────────────────────────────────────────────────────────────

  /** Devuelve la conexión de WhatsApp del negocio (si existe). */
  async get(ctx: Pick<InboxContext, "storeId">): Promise<(ConnectionRow & { channel: { type: string; name: string } }) | null> {
    const row = await this.db.channelConnection.findFirst({
      where: { storeId: ctx.storeId, channel: { type: "whatsapp" } },
      include: { channel: { select: { type: true, name: true } } },
    })
    return row
  }

  /** Resuelve la conexión de una WABA (phone number id) llegada por webhook. */
  async resolveByPhoneNumberId(
    phoneNumberId: string,
  ): Promise<(ConnectionRow & { storeId: string }) | null> {
    if (!phoneNumberId) return null
    const row = await this.db.channelConnection.findFirst({
      where: { externalRef: phoneNumberId },
      select: {
        id: true,
        channelId: true,
        provider: true,
        status: true,
        config: true,
        externalRef: true,
        errorMessage: true,
        connectedAt: true,
        disconnectedAt: true,
        lastHealthAt: true,
        createdAt: true,
        updatedAt: true,
        storeId: true,
      },
    })
    return row
  }

  /**
   * Resuelve la conexión cuyo verify token (en `config`) coincide con el del
   * handshake GET de suscripción. Soporta un verify token por negocio.
   */
  async resolveByVerifyToken(
    verifyToken: string,
  ): Promise<(ConnectionRow & { storeId: string }) | null> {
    if (!verifyToken) return null
    const rows = await this.db.channelConnection.findMany({
      where: {
        status: { not: "revoked" },
        config: { contains: `"verifyToken":"${verifyToken}"` },
      },
      select: {
        id: true,
        channelId: true,
        provider: true,
        status: true,
        config: true,
        externalRef: true,
        errorMessage: true,
        connectedAt: true,
        disconnectedAt: true,
        lastHealthAt: true,
        createdAt: true,
        updatedAt: true,
        storeId: true,
      },
      take: 1,
    })
    return rows[0] ?? null
  }

  // ── Mutaciones ────────────────────────────────────────────────────────────

  /** Crea o actualiza la conexión de WhatsApp del negocio y la deja conectada. */
  async connect(ctx: InboxContext, input: WhatsAppConnectionInput): Promise<WhatsAppConnectionDTO> {
    const accessToken = input.accessToken.trim()
    const phoneNumberId = input.phoneNumberId.trim()
    if (!accessToken || !phoneNumberId) {
      throw serviceError(
        "Faltan credenciales de WhatsApp (access token y phone number id son obligatorios)",
        400,
        "WHATSAPP_INVALID_CONFIG",
      )
    }
    const channel = await this.channels.ensureChannel(ctx, "whatsapp")
    const existing = await this.get(ctx)
    const now = new Date()
    const config: WhatsAppConnectionConfig = {
      accessToken,
      phoneNumberId,
      wabaId: input.wabaId?.trim() || undefined,
      verifyToken: input.verifyToken?.trim() || undefined,
      appSecret: input.appSecret?.trim() || undefined,
    }
    const row = await this.db.channelConnection.upsert({
      where: { storeId_channelId: { storeId: ctx.storeId, channelId: channel.id } },
      create: {
        storeId: ctx.storeId,
        channelId: channel.id,
        provider: "meta",
        status: "connected",
        config: JSON.stringify(config),
        externalRef: phoneNumberId,
        connectedAt: now,
      },
      update: {
        provider: "meta",
        status: "connected",
        config: JSON.stringify(config),
        externalRef: phoneNumberId,
        errorMessage: null,
        connectedAt: now,
        disconnectedAt: null,
      },
    })

    const isNew = !existing
    this.emit(ctx, isNew ? "whatsapp.connection.created" : "whatsapp.connection.connected", row.id, {
      phoneNumberId,
      provider: "meta",
    })
    void createAuditEntry({
      action: isNew ? "whatsapp.connection.created" : "whatsapp.connection.connected",
      entity: "ChannelConnection",
      entityId: row.id,
      metadata: sanitizeProviderConfig(config),
      userId: ctx.userId,
      storeId: ctx.storeId,
    })

    return this.toDTO(row as unknown as ConnectionRow)
  }

  /** Desconecta sin borrar credenciales ni datos. */
  async disconnect(ctx: Pick<InboxContext, "storeId">): Promise<WhatsAppConnectionDTO | null> {
    const row = await this.get(ctx)
    if (!row) return null
    const updated = await this.db.channelConnection.update({
      where: { id: row.id },
      data: { status: "disconnected", disconnectedAt: new Date() },
    })
    this.emit(ctx, "whatsapp.connection.disconnected", updated.id)
    void createAuditEntry({
      action: "whatsapp.connection.disconnected",
      entity: "ChannelConnection",
      entityId: updated.id,
      userId: (ctx as InboxContext).userId,
      storeId: ctx.storeId,
    })
    return this.toDTO(updated as unknown as ConnectionRow)
  }

  /** Revoca la conexión: limpia credenciales y la deja inactiva. */
  async revoke(ctx: Pick<InboxContext, "storeId">): Promise<WhatsAppConnectionDTO | null> {
    const row = await this.get(ctx)
    if (!row) return null
    const updated = await this.db.channelConnection.update({
      where: { id: row.id },
      data: { status: "revoked", config: "{}", disconnectedAt: new Date() },
    })
    this.emit(ctx, "whatsapp.connection.revoked", updated.id)
    void createAuditEntry({
      action: "whatsapp.connection.revoked",
      entity: "ChannelConnection",
      entityId: updated.id,
      userId: (ctx as InboxContext).userId,
      storeId: ctx.storeId,
    })
    return this.toDTO(updated as unknown as ConnectionRow)
  }

  /** Marca error transitorio (p. ej. fallo de salud). */
  async markError(ctx: Pick<InboxContext, "storeId">, message: string): Promise<void> {
    const row = await this.get(ctx)
    if (!row) return
    await this.db.channelConnection.update({
      where: { id: row.id },
      data: { status: "error", errorMessage: message.slice(0, 500) },
    })
    this.emit(ctx, "whatsapp.connection.error", row.id, { error: message.slice(0, 500) })
  }

  /** Actualiza el estado según la última salud real del proveedor. */
  async updateHealth(ctx: Pick<InboxContext, "storeId">, healthy: boolean, error?: string): Promise<void> {
    const row = await this.get(ctx)
    if (!row) return
    await this.db.channelConnection.update({
      where: { id: row.id },
      data: {
        lastHealthAt: new Date(),
        status: healthy ? "connected" : "error",
        errorMessage: healthy ? null : error?.slice(0, 500) ?? row.errorMessage,
      },
    })
  }

  private emit(ctx: Pick<InboxContext, "storeId">, type: string, connectionId: string, data: Record<string, unknown> = {}): void {
    fireDomainEvent({
      type,
      data: { domain: "whatsapp", connectionId, ...data },
      aggregateId: connectionId,
      aggregateType: "ChannelConnection",
      tenantId: ctx.storeId,
      actorId: (ctx as InboxContext).userId,
      source: "whatsapp.connection-service",
    })
  }
}
