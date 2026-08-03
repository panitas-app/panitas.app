/**
 * Factory de la Intelligence Layer (FASE 4A).
 *
 * Construye el orquestador con dependencias por defecto. Se usa en
 * `ConversationEngine` y en los tests para inyectar mocks por dependencia.
 */
import { IntelligenceLayer } from "./agent-intelligence"
import type { IntelligenceLayerDeps } from "./agent-intelligence"

export function createIntelligenceLayer(deps: IntelligenceLayerDeps = {}): IntelligenceLayer {
  return new IntelligenceLayer(deps)
}
