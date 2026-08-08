/**
 * Factory del Assistant Behavior (FASE 5F).
 *
 * Instancia el BehaviorEngine con dependencias reales: el Business Summary
 * Generator (4B) como fuente de datos. Las rutas API y la UI consumen esta
 * factory; los tests inyectan `summarySource` directamente.
 */
import { BehaviorEngine } from "./behavior-engine"
import type { BehaviorEngineDeps } from "./behavior-engine"

export function createBehaviorEngine(deps: BehaviorEngineDeps = {}): BehaviorEngine {
  return new BehaviorEngine(deps)
}
