/**
 * Preferencias de atención por negocio (FASE 8C).
 *
 * Cada tienda controla qué tipos generan items, la prioridad mínima para crearlos
 * y el horario de silencio para notificaciones externas (canales futuros).
 * Los valores se guardan en `AttentionSettings` (JSON para la lista de tipos).
 */
import type { PrismaClient } from "@prisma/client"
import { prisma as defaultPrisma } from "@/lib/prisma"
import {
  ATTENTION_TYPES,
  isAttentionType,
  type AttentionPriority,
  type AttentionType,
} from "./types"

export interface AttentionPreferences {
  enabledTypes: AttentionType[]
  minPriority: AttentionPriority
  quietHoursStart: string | null
  quietHoursEnd: string | null
}

export const DEFAULT_ATTENTION_PREFERENCES: AttentionPreferences = {
  enabledTypes: [...ATTENTION_TYPES],
  minPriority: "low",
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
}

export function parseJsonStringArray(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : []
  } catch {
    return []
  }
}

export function isPriorityInRange(value: string): value is AttentionPriority {
  return value === "critical" || value === "high" || value === "medium" || value === "low"
}

export class AttentionPreferencesService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async get(storeId: string): Promise<AttentionPreferences> {
    const settings = await this.db.attentionSettings.findUnique({ where: { storeId } })
    if (!settings) return { ...DEFAULT_ATTENTION_PREFERENCES }

    const rawTypes = parseJsonStringArray(settings.enabledTypes)
    const enabledTypes = rawTypes.filter(isAttentionType)

    return {
      enabledTypes: enabledTypes.length > 0 ? enabledTypes : [...DEFAULT_ATTENTION_PREFERENCES.enabledTypes],
      minPriority: isPriorityInRange(settings.minPriority) ? settings.minPriority : "low",
      quietHoursStart: settings.quietHoursStart,
      quietHoursEnd: settings.quietHoursEnd,
    }
  }

  async update(storeId: string, patch: Partial<AttentionPreferences>): Promise<AttentionPreferences> {
    const current = await this.get(storeId)
    const next: AttentionPreferences = { ...current, ...patch }
    // Guardas básicas: tipos válidos y prioridad en rango.
    const enabledTypes = next.enabledTypes.filter(isAttentionType)
    next.enabledTypes = enabledTypes.length > 0 ? enabledTypes : [...ATTENTION_TYPES]
    if (!isPriorityInRange(next.minPriority)) next.minPriority = "low"

    await this.db.attentionSettings.upsert({
      where: { storeId },
      create: {
        storeId,
        enabledTypes: JSON.stringify(next.enabledTypes),
        minPriority: next.minPriority,
        quietHoursStart: next.quietHoursStart,
        quietHoursEnd: next.quietHoursEnd,
      },
      update: {
        enabledTypes: JSON.stringify(next.enabledTypes),
        minPriority: next.minPriority,
        quietHoursStart: next.quietHoursStart,
        quietHoursEnd: next.quietHoursEnd,
      },
    })

    return next
  }
}
