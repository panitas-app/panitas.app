/**
 * Omnichannel Inbox — Gestor de canales (FASE 7A).
 *
 * Prepara la arquitectura multi-canal del Centro de Conversaciones. Sin
 * conexiones externas reales aún: cada tienda tiene un catálogo de canales
 * (`whatsapp`, `instagram`, `messenger`, `webchat`, `email`, `other`) listo
 * para conectarse con proveedores futuros (Twilio, Meta, SMTP...).
 */
import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@prisma/client"
import {
  INBOX_CHANNEL_META,
  INBOX_CHANNEL_TYPES,
  type InboxChannelDTO,
  type InboxChannelType,
  type InboxContext,
} from "./conversation-types"

export const DEFAULT_CHANNEL_TYPES = INBOX_CHANNEL_TYPES

type PrismaChannel = {
  id: string
  type: string
  name: string
  provider: string
  config: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

function parseConfig(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function toDTO(channel: PrismaChannel): InboxChannelDTO {
  return {
    id: channel.id,
    type: (INBOX_CHANNEL_TYPES as readonly string[]).includes(channel.type)
      ? (channel.type as InboxChannelType)
      : "other",
    name: channel.name,
    provider: channel.provider,
    config: parseConfig(channel.config),
    isActive: channel.isActive,
    createdAt: channel.createdAt.toISOString(),
    updatedAt: channel.updatedAt.toISOString(),
  }
}

export class InboxChannelManager {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  /** Garantiza que exista el canal de un tipo (upsert por tienda+tipo). */
  async ensureChannel(ctx: InboxContext, type: InboxChannelType): Promise<InboxChannelDTO> {
    const meta = INBOX_CHANNEL_META[type]
    const raw = await this.db.inboxChannel.upsert({
      where: { storeId_type: { storeId: ctx.storeId, type } },
      create: {
        storeId: ctx.storeId,
        type,
        name: meta.name,
        provider: "",
        config: "{}",
        isActive: true,
      },
      update: { name: meta.name },
    })
    return toDTO(raw)
  }

  /** Garantiza los canales por defecto de la tienda. */
  async ensureDefaults(ctx: InboxContext): Promise<InboxChannelDTO[]> {
    return Promise.all(DEFAULT_CHANNEL_TYPES.map((type) => this.ensureChannel(ctx, type)))
  }

  /** Lista los canales registrados de la tienda. */
  async list(ctx: InboxContext): Promise<InboxChannelDTO[]> {
    const rows = await this.db.inboxChannel.findMany({
      where: { storeId: ctx.storeId },
      orderBy: { createdAt: "asc" },
    })
    return rows.map(toDTO)
  }

  /** Activa un canal. */
  async enable(ctx: InboxContext, type: InboxChannelType): Promise<InboxChannelDTO> {
    const channel = await this.ensureChannel(ctx, type)
    if (channel.isActive) return channel
    const raw = await this.db.inboxChannel.update({
      where: { id: channel.id },
      data: { isActive: true },
    })
    return toDTO(raw)
  }

  /** Desactiva un canal (no borra conversaciones). */
  async disable(ctx: InboxContext, type: InboxChannelType): Promise<InboxChannelDTO> {
    const channel = await this.ensureChannel(ctx, type)
    if (!channel.isActive) return channel
    const raw = await this.db.inboxChannel.update({
      where: { id: channel.id },
      data: { isActive: false },
    })
    return toDTO(raw)
  }
}
