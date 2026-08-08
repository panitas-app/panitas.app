/**
 * Behavior Engine (FASE 5F) — el gerente virtual proactivo.
 *
 * Orquesta la capa assistant-behavior sobre el Business Summary (4B):
 *   1. obtiene el resumen real del negocio (reutilizando el Business Monitor),
 *   2. detecta eventos accionables (business-events) SIN inventar datos,
 *   3. prioriza (Alta → Media → Baja) y limita el volumen,
 *   4. compone el saludo contextual (greeting-generator),
 *   5. devuelve un resultado estable, client-safe y cacheable.
 *
 * Optimización: el análisis del negocio no se repite por mensaje. El resultado
 * se cachea por tienda durante `cacheTtlMs` y solo se recalcula al expirar.
 *
 * Guardrails: sin hallazgos accionables → `hasFindings=false` y NINGÚN texto
 * de "todo bien"; la personalidad sanitiza todo lo que sale.
 */
import { BusinessSummaryGenerator } from "@/lib/business-intelligence"
import { detectBusinessEvents } from "./business-events"
import { buildAssistantGreeting } from "./greeting-generator"
import { prioritizeAssistantRecommendations } from "./recommendation-priority"
import { assertPersonalitySafe, sanitizeAssistantText } from "./assistant-personality"
import type {
  AssistantBehaviorInput,
  AssistantBehaviorResult,
  BusinessSummarySource,
} from "./types"

export const DEFAULT_CACHE_TTL_MS = 60 * 1000
export const DEFAULT_MAX_RECOMMENDATIONS = 6

export interface BehaviorEngineDeps {
  /** Fuente de datos (inyectable en tests). Default: BusinessSummaryGenerator. */
  summarySource?: BusinessSummarySource
  /** TTL del caché por tienda. Default: 60s. */
  cacheTtlMs?: number
  /** Reloj inyectable (pruebas deterministas). */
  now?: () => Date
  /** Máximo de recomendaciones devueltas. Default: 6. */
  maxRecommendations?: number
}

interface CacheEntry {
  expiresAt: number
  result: AssistantBehaviorResult
}

export class BehaviorEngine {
  private readonly summarySource: BusinessSummarySource
  private readonly cacheTtlMs: number
  private readonly now: () => Date
  private readonly maxRecommendations: number
  private readonly cache = new Map<string, CacheEntry>()

  constructor(deps: BehaviorEngineDeps = {}) {
    const generator = new BusinessSummaryGenerator()
    this.summarySource =
      deps.summarySource ??
      (async (input: AssistantBehaviorInput) =>
        generator.generate({
          ctx: input.ctx ?? (throwMissingContext() as never),
          storeName: input.storeName,
          userName: input.userName,
        }))
    this.cacheTtlMs = deps.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS
    this.now = deps.now ?? (() => new Date())
    this.maxRecommendations = deps.maxRecommendations ?? DEFAULT_MAX_RECOMMENDATIONS
  }

  /** Analiza el comportamiento proactivo de la tienda (con caché). */
  async analyze(input: AssistantBehaviorInput): Promise<AssistantBehaviorResult> {
    const storeId = input.ctx?.storeId ?? input.storeId ?? "local"
    const cached = this.cache.get(storeId)
    if (cached && cached.expiresAt > this.now().getTime()) {
      return cached.result
    }

    const summary = await this.summarySource(input)

    const recommendations = prioritizeAssistantRecommendations(
      detectBusinessEvents(summary),
    ).slice(0, this.maxRecommendations)

    const greeting = buildAssistantGreeting({
      userName: input.userName,
      hour: this.now().getHours(),
      findingsCount: recommendations.length,
    })
    assertPersonalitySafe(greeting.text)

    const result: AssistantBehaviorResult = {
      storeId,
      generatedAt: this.now().toISOString(),
      greeting: { ...greeting, text: sanitizeAssistantText(greeting.text) },
      recommendations,
      hasFindings: recommendations.length > 0,
    }

    this.cache.set(storeId, { expiresAt: this.now().getTime() + this.cacheTtlMs, result })
    return result
  }

  /** Invalida el caché de una tienda (o todo si no se pasa storeId). */
  clearCache(storeId?: string): void {
    if (storeId) {
      this.cache.delete(storeId)
    } else {
      this.cache.clear()
    }
  }

  /** Tamaño actual del caché (diagnóstico/pruebas). */
  cacheSize(): number {
    return this.cache.size
  }
}

function throwMissingContext(): never {
  throw new Error("BehaviorEngine requiere un summarySource o un ctx de tienda")
}
