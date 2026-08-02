/**
 * Model Router (FASE 3A).
 *
 * Resuelve qué proveedor + modelo se usa para cada tipo de tarea, leyendo la
 * configuración central. El Agent Core NUNCA escribe nombres de modelo en su código:
 * solo pide "resolver la tarea X".
 */
import type { AgentTaskType } from "./types"
import type { ModelTaskConfig } from "./config"

export interface ModelRoute extends ModelTaskConfig {
  task: AgentTaskType
}

export class ModelRouter {
  constructor(private readonly routes: Record<AgentTaskType, ModelTaskConfig>) {}

  /** Resuelve la ruta para una tarea. Fallback: `chat`. */
  resolve(task: AgentTaskType): ModelRoute {
    const cfg = this.routes[task] ?? this.routes.chat
    return { task, ...cfg }
  }

  /** Lista todas las rutas configuradas. */
  list(): ModelRoute[] {
    return (Object.keys(this.routes) as AgentTaskType[]).map((task) => ({ task, ...this.routes[task] }))
  }

  /** Actualiza la configuración de una tarea en runtime (preparado para cambio sin deploy). */
  update(task: AgentTaskType, patch: Partial<ModelTaskConfig>): ModelRoute {
    this.routes[task] = { ...this.routes[task], ...patch }
    return this.resolve(task)
  }
}
