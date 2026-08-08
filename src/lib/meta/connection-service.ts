/**
 * Instagram + Messenger (FASE 8B) — Conexiones por negocio (multi-tenant).
 *
 * Gestiona el modelo `ChannelConnection` de los canales Meta messaging
 * (`instagram` y `messenger`): cada negocio guarda su propia conexión real
 * (access token, account id del canal, verify token, app secret).
 *
 *  - `status`: pending → connected → disconnected | error | revoked.
 *  - Los secrets viven en `config` (JSON) y NUNCA salen en DTOs ni logs
 *    (`sanitizeProviderConfig`).
 *  - Desconectar NO borra datos ni credenciales; revocar sí las limpia.
 *  - Cada mutación emite eventos `instagram.*` / `messenger.*` y auditoría.
 */
import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@prisma/client"
import { serviceError } from "@/services/errors"
import { fireDomainEvent } from "@/lib/events"
import { createAuditEntry } from "@/lib/audit"
import { sanitizeProviderConfig } from "@/lib/communication"
import type { InboxContext } from "@/lib/inbox"
import { InboxChannelManager } from "@/lib/inbox"
import type { MetaChannel } from "./config"
import type { MetaMessagingConfig } from "@/lib/communication"

export const META_CONNECTION_CHANNELS = ["instagram", "messenger"] as const
export const META_CONNECTION_STATUSES = ["pending", "connected", "disconnected", "error", "revoked"] as const
export type MetaConnectionStatus = (typeof META_CONNECTION_STATUSES)[number]

export interface MetaConnectionInput {
  accessToken: string
  accountId: string
  appSecret?: string
  verifyToken?: string
  username?: string
}

export interface MetaConnectionDTO {
  id: string
  channelId: string
  channel: MetaChannel
  provider: string
  status: MetaConnectionStatus
  configured: boolean
  accountId: string
  username?: string
  verifyTokenSet: boolean
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

export class MetaConnectionService {
  private readonly channels: InboxChannelManager

  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.channels = new InboxChannelManager(db)
  }

  // ── Helpers de parseo / DTO ──────────────────────────────────────────────

  /** Parsea el `config` JSON de una conexión a credenciales tipadas. */
  parseConfig(connection: { config: string }): MetaMessagingConfig {
    try {
      const parsed = JSON.parse(connection.config) as Record<string, unknown>
      return {
        accessToken: typeof parsed.accessToken === "string" ? parsed.accessToken : "",
        accountId: typeof parsed.accountId === "string" ? parsed.accountId : "",
        verifyToken: typeof parsed.verifyToken === "string" ? parsed.verifyToken : undefined,
        appSecret: typeof parsed.appSecret === "string" ? parsed.appSecret : undefined,
        username: typeof parsed.username === "string" ? parsed.username : undefined,
      }
    } catch {
      return { accessToken: "", accountId: "" }
    }
  }

  toDTO(row: ConnectionRow & { channel?: { type: string; name: string } | null }): MetaConnectionDTO {
    const config = this.parseConfig(row)
    const channel = (META_CONNECTION_CHANNELS as readonly string[]).includes(row.channel?.type ?? "")
      ? (row.channel!.type as MetaChannel)
      : "instagram"
    return {
      id: row.id,
      channelId: row.channelId,
      channel,
      provider: row.provider,
      status: (META_CONNECTION_STATUSES as readonly string[]).includes(row.status)
        ? (row.status as MetaConnectionStatus)
        : "error",
      configured: Boolean(config.accessToken && config.accountId),
      accountId: config.accountId,
      username: config.username,
      verifyTokenSet: Boolean(config.verifyToken),
      errorMessage: row.errorMessage,
      connectedAt: row.connectedAt?.toISOString() ?? null,
      disconnectedAt: row.disconnectedAt?.toISOString() ?? null,
      lastHealthAt: row.lastHealthAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  // ── Consultas ─────────────────────────────────────────────────────────────

  /** Devuelve la conexión del canal (instagram|messenger) del negocio. */
  async get(
    ctx: Pick<InboxContext, "storeId">,
    channel: MetaChannel,
  ): Promise<(ConnectionRow & { channel: { type: string; name: string } }) | null> {
    const row = await this.db.channelConnection.findFirst({
      where: { storeId: ctx.storeId, channel: { type: channel } },
      include: { channel: { select: { type: true, name: true } } },
    })
    return row
  }

  /** Resuelve la conexión del canal por account id (page id / ig id). */
  async resolveByExternalRef(
    channel: MetaChannel,
    accountId: string,
  ): Promise<(ConnectionRow & { storeId: string }) | null> {
    if (!accountId) return null
    const row = await this.db.channelConnection.findFirst({
      where: { externalRef: accountId, channel: { type: channel } },
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
   * Resuelve la conexión del canal cuyo verify token (en `config`) coincide con
   * el del handshake GET de suscripción.
   */
  async resolveByVerifyToken(
    channel: MetaChannel,
    verifyToken: string,
  ): Promise<(ConnectionRow & { storeId: string }) | null> {
    if (!verifyToken) return null
    const rows = await this.db.channelConnection.findMany({
      where: {
        status: { not: "revoked" },
        channel: { type: channel },
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

  /** Crea o actualiza la conexión del canal y la deja conectada. */
  async connect(ctx: InboxContext, channel: MetaChannel, input: MetaConnectionInput): Promise<MetaConnectionDTO> {
    const accessToken = input.accessToken.trim()
    const accountId = input.accountId.trim()
    if (!accessToken || !accountId) {
      throw serviceError(
        `Faltan credenciales de ${channel} (access token y account id son obligatorios)`,
        400,
        "META_INVALID_CONFIG",
      )
    }
    const inboxChannel = await this.channels.ensureChannel(ctx, channel)
    const existing = await this.get(ctx, channel)
    const now = new Date()
    const config: MetaMessagingConfig = {
      accessToken,
      accountId,
      verifyToken: input.verifyToken?.trim() || undefined,
      appSecret: input.appSecret?.trim() || undefined,
      username: input.username?.trim() || undefined,
    }
    const row = await this.db.channelConnection.upsert({
      where: { storeId_channelId: { storeId: ctx.storeId, channelId: inboxChannel.id } },
      create: {
        storeId: ctx.storeId,
        channelId: inboxChannel.id,
        provider: "meta",
        status: "connected",
        config: JSON.stringify(config),
        externalRef: accountId,
        connectedAt: now,
      },
      update: {
        provider: "meta",
        status: "connected",
        config: JSON.stringify(config),
        externalRef: accountId,
        errorMessage: null,
        connectedAt: now,
        disconnectedAt: null,
      },
    })

    const isNew = !existing
    this.emit(ctx, channel, isNew ? `${channel}.connection.created` : `${channel}.connection.connected`, row.id, {
      accountId,
      provider: "meta",
    })
    void createAuditEntry({
      action: isNew ? `${channel}.connection.created` : `${channel}.connection.connected`,
      entity: "ChannelConnection",
      entityId: row.id,
      metadata: sanitizeProviderConfig(config),
      userId: ctx.userId,
      storeId: ctx.storeId,
    })

    return this.toDTO(row as unknown as ConnectionRow)
  }

  /** Desconecta sin borrar credenciales ni datos. */
  async disconnect(ctx: Pick<InboxContext, "storeId">, channel: MetaChannel): Promise<MetaConnectionDTO | null> {
    const row = await this.get(ctx, channel)
    if (!row) return null
    const updated = await this.db.channelConnection.update({
      where: { id: row.id },
      data: { status: "disconnected", disconnectedAt: new Date() },
    })
    this.emit(ctx, channel, `${channel}.connection.disconnected`, updated.id)
    void createAuditEntry({
      action: `${channel}.connection.disconnected`,
      entity: "ChannelConnection",
      entityId: updated.id,
      userId: (ctx as InboxContext).userId,
      storeId: ctx.storeId,
    })
    return this.toDTO(updated as unknown as ConnectionRow)
  }

  /** Revoca la conexión: limpia credenciales y la deja inactiva. */
  async revoke(ctx: Pick<InboxContext, "storeId">, channel: MetaChannel): Promise<MetaConnectionDTO | null> {
    const row = await this.get(ctx, channel)
    if (!row) return null
    const updated = await this.db.channelConnection.update({
      where: { id: row.id },
      data: { status: "revoked", config: "{}", disconnectedAt: new Date() },
    })
    this.emit(ctx, channel, `${channel}.connection.revoked`, updated.id)
    void createAuditEntry({
      action: `${channel}.connection.revoked`,
      entity: "ChannelConnection",
      entityId: updated.id,
      userId: (ctx as InboxContext).userId,
      storeId: ctx.storeId,
    })
    return this.toDTO(updated as unknown as ConnectionRow)
  }

  /** Marca error transitorio (p. ej. fallo de salud). */
  async markError(ctx: Pick<InboxContext, "storeId">, channel: MetaChannel, message: string): Promise<void> {
    const row = await this.get(ctx, channel)
    if (!row) return
    await this.db.channelConnection.update({
      where: { id: row.id },
      data: { status: "error", errorMessage: message.slice(0, 500) },
    })
    this.emit(ctx, channel, `${channel}.connection.error`, row.id, { error: message.slice(0, 500) })
  }

  /** Actualiza el estado según la última salud real del proveedor. */
  async updateHealth(
    ctx: Pick<InboxContext, "storeId">,
    channel: MetaChannel,
    healthy: boolean,
    error?: string,
  ): Promise<void> {
    const row = await this.get(ctx, channel)
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

  private emit(
    ctx: Pick<InboxContext, "storeId">,
    channel: MetaChannel,
    type: string,
    connectionId: string,
    data: Record<string, unknown> = {},
  ): void {
    fireDomainEvent({
      type,
      data: { domain: channel, connectionId, ...data },
      aggregateId: connectionId,
      aggregateType: "ChannelConnection",
      tenantId: ctx.storeId,
      actorId: (ctx as InboxContext).userId,
      source: "meta.connection-service",
    })
  }
}
