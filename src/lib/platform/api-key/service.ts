/**
 * Platform (FASE 8D) — API Keys.
 *
 * Seguridad:
 *  - El secreto completo se muestra UNA vez en la creación.
 *  - Solo se persiste hashedSecret (SHA-256 hex). Nunca texto plano.
 *  - El lookup usa keyPrefix (primeros 12 chars del secreto), no sensible.
 *  - Comparación constante (timingSafeEqual) para evitar timing attacks.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto"
import type { PrismaClient } from "@prisma/client"
import type { Store } from "@prisma/client"
import { prisma as defaultPrisma } from "@/lib/prisma"
import { ApiError } from "@/lib/platform/errors"
import { normalizePermissions, type PublicApiPermission } from "@/lib/platform/permissions"

export const API_KEY_PREFIX = "pk_live_"
export const KEY_PREFIX_LENGTH = 12

export interface ApiKeyRow {
  id: string
  storeId: string
  name: string
  keyPrefix: string
  hashedSecret: string
  permissions: string
  status: string
  lastUsedAt: Date | null
  expiresAt: Date | null
  revokedAt: Date | null
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreatedApiKey {
  /** Metadata pública (nunca incluye el secreto). */
  apiKey: {
    id: string
    name: string
    keyPrefix: string
    permissions: PublicApiPermission[]
    status: string
    expiresAt: Date | null
    lastUsedAt: Date | null
    createdAt: Date
  }
  /** Secreto completo — SOLO visible una vez. */
  secret: string
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

/** Genera un secreto y su hash. El prefijo permite lookup sin exponer el secreto. */
export function generateApiKeySecret(): { secret: string; keyPrefix: string; hashedSecret: string } {
  const raw = randomBytes(32).toString("base64url")
  const secret = `${API_KEY_PREFIX}${raw}`
  return { secret, keyPrefix: secret.slice(0, KEY_PREFIX_LENGTH), hashedSecret: sha256(secret) }
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8")
  const bufB = Buffer.from(b, "utf8")
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

function parsePermissions(raw: string): PublicApiPermission[] {
  try {
    return normalizePermissions(JSON.parse(raw))
  } catch {
    return []
  }
}

export function publicKeyMetadata(row: Pick<ApiKeyRow, "id" | "name" | "keyPrefix" | "permissions" | "status" | "lastUsedAt" | "expiresAt" | "revokedAt" | "createdBy" | "createdAt">) {
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.keyPrefix,
    permissions: parsePermissions(row.permissions),
    status: row.status,
    lastUsedAt: row.lastUsedAt,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  }
}

export interface CreateApiKeyInput {
  storeId: string
  name: string
  permissions: unknown
  expiresAt?: Date | null
  createdBy?: string | null
}

export class ApiKeyService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async create(input: CreateApiKeyInput): Promise<CreatedApiKey> {
    const name = String(input.name || "").trim().slice(0, 80)
    if (!name) throw new ApiError("INVALID_REQUEST", "El nombre de la API key es obligatorio", 422)
    const permissions = normalizePermissions(input.permissions)
    if (permissions.length === 0) {
      throw new ApiError("INVALID_REQUEST", "Selecciona al menos un permiso", 422)
    }
    const { secret, keyPrefix, hashedSecret } = generateApiKeySecret()
    const row = await this.db.apiKey.create({
      data: {
        storeId: input.storeId,
        name,
        keyPrefix,
        hashedSecret,
        permissions: JSON.stringify(permissions),
        expiresAt: input.expiresAt ?? null,
        createdBy: input.createdBy ?? null,
      },
    })
    return { apiKey: publicKeyMetadata(row), secret }
  }

  /** Valida un secreto y devuelve la key + su store. Lanza ApiError público. */
  async validate(secret: string): Promise<{ key: ApiKeyRow; store: Store }> {
    if (typeof secret !== "string" || !secret.startsWith(API_KEY_PREFIX)) {
      throw new ApiError("INVALID_API_KEY", "API key inválida", 401)
    }
    const keyPrefix = secret.slice(0, KEY_PREFIX_LENGTH)
    const candidates = await this.db.apiKey.findMany({
      where: { keyPrefix },
      include: { store: true },
    })
    const match = candidates.find((c) => constantTimeEquals(c.hashedSecret, sha256(secret)))
    if (!match) throw new ApiError("INVALID_API_KEY", "API key inválida", 401)
    if (match.status !== "active") {
      throw new ApiError("API_KEY_REVOKED", "API key revocada", 401)
    }
    if (match.expiresAt && match.expiresAt.getTime() < Date.now()) {
      throw new ApiError("API_KEY_EXPIRED", "API key expirada", 401)
    }
    return { key: match, store: match.store }
  }

  async revoke(id: string, storeId: string): Promise<void> {
    await this.db.apiKey.updateMany({
      where: { id, storeId, status: "active" },
      data: { status: "revoked", revokedAt: new Date() },
    })
  }

  /** Rota el secreto: conserva id/permisos, genera un secreto nuevo. */
  async rotate(id: string, storeId: string): Promise<CreatedApiKey | null> {
    const row = await this.db.apiKey.findFirst({ where: { id, storeId, status: "active" } })
    if (!row) return null
    const { secret, keyPrefix, hashedSecret } = generateApiKeySecret()
    const updated = await this.db.apiKey.update({
      where: { id },
      data: { keyPrefix, hashedSecret },
    })
    return { apiKey: publicKeyMetadata(updated), secret }
  }

  async list(storeId: string): Promise<ReturnType<typeof publicKeyMetadata>[]> {
    const rows = await this.db.apiKey.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
    })
    return rows.map(publicKeyMetadata)
  }

  async hasPermission(key: ApiKeyRow, permission: PublicApiPermission): Promise<boolean> {
    return parsePermissions(key.permissions).includes(permission)
  }

  /** Registra lastUsedAt sin bloquear el request (fire-and-forget). */
  touch(id: string): void {
    void this.db.apiKey
      .updateMany({ where: { id }, data: { lastUsedAt: new Date() } })
      .catch(() => {})
  }
}
