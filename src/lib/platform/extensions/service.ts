/**
 * Platform (FASE 8D) — modelo de Extensiones.
 *
 * FASE 8D NO construye marketplace ni ejecución de código arbitrario. Solo
 * prepara la abstracción: tipo, permisos declarados y ciclo de vida.
 *
 * NUNCA se ejecuta código de terceros dentro del servidor de Panitas.
 */
import type { PrismaClient } from "@prisma/client"
import { prisma as defaultPrisma } from "@/lib/prisma"
import { ApiError } from "@/lib/platform/errors"
import { normalizePermissions } from "@/lib/platform/permissions"

export const EXTENSION_TYPES = [
  "webhook_integration",
  "api_integration",
  "channel_integration",
  "automation_integration",
] as const

export type ExtensionType = (typeof EXTENSION_TYPES)[number]

export const EXTENSION_STATUSES = ["draft", "active", "disabled", "revoked"] as const
export type ExtensionStatus = (typeof EXTENSION_STATUSES)[number]

export interface ExtensionRow {
  id: string
  storeId: string
  name: string
  description: string | null
  type: string
  status: string
  permissions: string
  configuration: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateExtensionInput {
  storeId: string
  name: string
  description?: string
  type?: string
  permissions?: unknown
}

export class ExtensionService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async create(input: CreateExtensionInput): Promise<ExtensionRow> {
    const name = String(input.name || "").trim().slice(0, 80)
    if (!name) throw new ApiError("INVALID_REQUEST", "El nombre de la extensión es obligatorio", 422)
    const type = String(input.type ?? "api_integration")
    if (!EXTENSION_TYPES.includes(type as ExtensionType)) {
      throw new ApiError("INVALID_REQUEST", "Tipo de extensión inválido", 422)
    }
    const permissions = normalizePermissions(input.permissions)
    return this.db.extension.create({
      data: {
        storeId: input.storeId,
        name,
        description: input.description ? String(input.description).slice(0, 300) : null,
        type,
        permissions: JSON.stringify(permissions),
      },
    })
  }

  async list(storeId: string): Promise<ExtensionRow[]> {
    return this.db.extension.findMany({ where: { storeId }, orderBy: { createdAt: "desc" } })
  }

  async updateStatus(id: string, storeId: string, status: string): Promise<ExtensionRow | null> {
    if (!EXTENSION_STATUSES.includes(status as ExtensionStatus)) {
      throw new ApiError("INVALID_REQUEST", "Estado de extensión inválido", 422)
    }
    const result = await this.db.extension.updateMany({
      where: { id, storeId },
      data: { status },
    })
    if (result.count === 0) return null
    return this.db.extension.findUnique({ where: { id } })
  }

  async remove(id: string, storeId: string): Promise<boolean> {
    const result = await this.db.extension.deleteMany({ where: { id, storeId } })
    return result.count > 0
  }
}
