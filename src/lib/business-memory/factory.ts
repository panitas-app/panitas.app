/**
 * Factory del Business Memory Engine (FASE 5G).
 *
 * Cablea el engine con su store por defecto (Prisma sobre la tabla
 * `BusinessMemory`). Único punto de wiring para producción; los tests inyectan
 * un store en memoria directamente.
 */
import { BusinessMemoryEngine } from "./memory-engine"
import { createDefaultBusinessMemoryStore } from "./memory-store"
import type { LearningConfig } from "./memory-types"

export function createBusinessMemoryEngine(config?: Partial<LearningConfig>): BusinessMemoryEngine {
  return new BusinessMemoryEngine({ store: createDefaultBusinessMemoryStore(), config })
}
