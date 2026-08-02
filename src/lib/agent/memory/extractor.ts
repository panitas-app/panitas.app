/**
 * Memory Extractor (FASE 3D).
 *
 * Extrae candidatos de memoria de cada turno de conversación SIN usar el LLM:
 *
 *   - Mensaje del usuario → lo clasifica el `MemoryClassifier` (preferencias,
 *     identidad del negocio, clientes, productos, settings, eventos).
 *   - Resultados de tools → hechos compactos del negocio (analytics, inventario).
 *   - Respuesta del asistente → no se guarda (es texto generado).
 *
 * El `MemoryManager` guarda los candidatos (upsert por storeId+key).
 */
import type { MemoryClassifier } from "./classifier"
import { MemoryClassifier as DefaultClassifier } from "./classifier"
import type { MemoryItemInput, MemoryTurn } from "./types"

export const TOOL_MEMORY_RULES: Array<{
  prefix: string
  kind: MemoryItemInput["kind"]
  importance: MemoryItemInput["importance"]
  type: MemoryItemInput["type"]
  maxChars: number
}> = [
  { prefix: "analytics.", kind: "business_setting", importance: "HIGH", type: "business", maxChars: 1500 },
  { prefix: "inventory.", kind: "product", importance: "MEDIUM", type: "business", maxChars: 800 },
]

export interface MemoryExtractor {
  extract(turn: MemoryTurn): Promise<MemoryItemInput[]>
}

function trimOutput(output: string, maxChars: number): string {
  return output.length > maxChars ? `${output.slice(0, maxChars)}…` : output
}

export class DefaultMemoryExtractor implements MemoryExtractor {
  constructor(private readonly classifier: MemoryClassifier = new DefaultClassifier()) {}

  async extract(turn: MemoryTurn): Promise<MemoryItemInput[]> {
    const candidates: MemoryItemInput[] = []

    const userResult = this.classifier.classify({ content: turn.message, source: "user_message" })
    if (userResult.shouldStore && userResult.key) {
      candidates.push({
        scope: "store",
        type: userResult.type,
        kind: userResult.kind,
        importance: userResult.importance,
        key: userResult.key,
        value: userResult.value ?? turn.message,
        source: "user_message",
        expiresAt: userResult.expiresAt ?? null,
      })
    }

    for (const call of turn.toolCalls ?? []) {
      if (!call.ok || !call.output) continue
      const rule = TOOL_MEMORY_RULES.find((r) => call.name.startsWith(r.prefix))
      if (!rule) continue
      candidates.push({
        scope: "store",
        type: rule.type,
        kind: rule.kind,
        importance: rule.importance,
        key: `${call.name.replace(/\./g, ":")}:latest`,
        value: trimOutput(call.output, rule.maxChars),
        source: "tool",
      })
    }

    return candidates
  }
}
