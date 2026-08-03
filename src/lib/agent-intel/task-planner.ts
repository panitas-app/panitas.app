/**
 * Task Planner (FASE 4A).
 *
 * A partir de la intención clasificada decide:
 *   - qué información necesita (entidades),
 *   - qué tools del Tool System 3B utilizar,
 *   - en qué orden (dependencias),
 *   - cuáles pueden ejecutarse en paralelo.
 *
 * Es determinista (sin LLM) para ser testeable; el plan que produce es
 * consumido por el Execution Planner y trazado por observabilidad.
 */
import { toolRegistry } from "@/lib/agent/tools"
import type { ToolMetadata } from "@/lib/agent/tools"
import type { ExecutionPlan, IntentClassification, PlannedStep } from "./types"

export interface TaskPlannerOptions {
  /** Catálogo de tools disponibles (por defecto el registro 3B). */
  catalog?: ToolMetadata[]
}

export class TaskPlanner {
  private readonly catalog: ToolMetadata[]

  constructor(options: TaskPlannerOptions = {}) {
    this.catalog = options.catalog ?? toolRegistry.metadata()
  }

  private hasTool(name: string): boolean {
    return this.catalog.some((t) => t.name === name)
  }

  /** True si el mensaje pregunta por el estado general del negocio/empresa. */
  private mentionsBusiness(intent: IntentClassification): boolean {
    return ["negocio", "negocios", "empresa"].some((keyword) => intent.message.includes(keyword))
  }

  private planBusinessMonitor(): PlannedStep[] {
    if (!this.hasTool("analytics.businessMonitor")) return []
    return [
      this.step("step-1", "analytics.businessMonitor", "analytics", {}, {
        parallel: true,
        rationale: "Monitor operativo del estado general del negocio.",
      }),
    ]
  }

  /** FASE 4D: recomendaciones operativas basadas en datos (con cooldown anti-spam). */
  private planRecommendations(): PlannedStep[] {
    if (!this.hasTool("recommendations.list")) return []
    return [
      this.step("step-1", "recommendations.list", "recommendations", {}, {
        parallel: true,
        rationale: "Recomendaciones operativas del negocio a partir de sus datos.",
      }),
    ]
  }

  private step(
    id: string,
    tool: string,
    domain: string,
    input: Record<string, unknown>,
    opts: Partial<PlannedStep> = {}
  ): PlannedStep {
    return {
      id,
      tool,
      domain,
      input,
      dependsOn: [],
      parallel: false,
      retryable: true,
      requiresConfirmation: false,
      rationale: "",
      ...opts,
    }
  }

  /** Decide el plan para una intención. */
  plan(intent: IntentClassification): ExecutionPlan {
    const steps: PlannedStep[] = []

    switch (intent.type) {
      case "ayuda":
      case "conversacion":
        break

      case "consulta":
        steps.push(...this.planQuery(intent))
        break

      case "analisis":
        steps.push(...this.planAnalysis(intent))
        break

      case "reporte":
        steps.push(...this.planReport(intent))
        break

      case "accion":
        steps.push(...this.planAction(intent))
        break

      case "configuracion":
        steps.push(...this.planConfig(intent))
        break
    }

    const requiresConfirmation = steps.some((s) => s.requiresConfirmation)

    return {
      id: `plan_${Date.now().toString(36)}`,
      intent,
      steps,
      requiresConfirmation,
      domains: [...new Set(steps.map((s) => s.domain))],
    }
  }

  private planQuery(intent: IntentClassification): PlannedStep[] {
    const q = intent.entities.producto || intent.message
    const steps: PlannedStep[] = []
    const domain = intent.domains[0] ?? "inventory"

    if (this.mentionsBusiness(intent)) {
      return this.planBusinessMonitor()
    }

    if (intent.domains.includes("recommendations")) {
      return this.planRecommendations()
    }

    if (intent.message.includes("bajo") && intent.domains.includes("inventory")) {
      if (this.hasTool("inventory.getLowStock")) {
        steps.push(
          this.step("step-1", "inventory.getLowStock", "inventory", {}, {
            parallel: true,
            rationale: "El usuario pregunta por niveles de stock bajos.",
          })
        )
      }
      return steps
    }

    switch (domain) {
      case "sales":
        if (this.hasTool("sales.getRecentSales")) {
          steps.push(
            this.step("step-1", "sales.getRecentSales", "sales", {}, {
              parallel: true,
              rationale: "Consulta de ventas recientes.",
            })
          )
        }
        break
      case "customers":
        if (this.hasTool("customers.search")) {
          steps.push(
            this.step("step-1", "customers.search", "customers", { q, take: 10 }, {
              parallel: true,
              rationale: "Búsqueda de clientes.",
            })
          )
        }
        break
      case "orders":
        if (this.hasTool("orders.getPending")) {
          steps.push(
            this.step("step-1", "orders.getPending", "orders", { take: 10 }, {
              parallel: true,
              rationale: "Listado de pedidos pendientes.",
            })
          )
        }
        break
      case "inventory":
      default:
        if (this.hasTool("inventory.searchProduct")) {
          steps.push(
            this.step("step-1", "inventory.searchProduct", "inventory", { q, take: 10 }, {
              parallel: true,
              rationale: `Búsqueda en inventario de: ${q}`,
            })
          )
        }
    }

    return steps
  }

  private planAnalysis(intent: IntentClassification): PlannedStep[] {
    if (this.mentionsBusiness(intent)) {
      return this.planBusinessMonitor()
    }

    if (intent.domains.includes("recommendations")) {
      return this.planRecommendations()
    }

    const steps: PlannedStep[] = []
    if (this.hasTool("analytics.businessSummary")) {
      steps.push(
        this.step("step-1", "analytics.businessSummary", "analytics", {}, {
          parallel: true,
          rationale: "Resumen de métricas del negocio para el análisis.",
        })
      )
    }
    if (this.hasTool("analytics.businessAlerts")) {
      steps.push(
        this.step("step-2", "analytics.businessAlerts", "analytics", {}, {
          parallel: true,
          rationale: "Alertas del negocio como evidencia del análisis.",
        })
      )
    }
    if (intent.domains.includes("inventory") && this.hasTool("inventory.getLowStock")) {
      steps.push(
        this.step("step-3", "inventory.getLowStock", "inventory", { threshold: 5 }, {
          parallel: true,
          rationale: "Salud de inventario dentro del análisis.",
        })
      )
    }
    return steps
  }

  private planReport(intent: IntentClassification): PlannedStep[] {
    const steps: PlannedStep[] = []
    const hasDate = Boolean(intent.entities.fecha || intent.entities.periodo)

    if (intent.domains.includes("inventory") && this.hasTool("inventory.getLowStock")) {
      steps.push(
        this.step("step-1", "inventory.getLowStock", "inventory", { threshold: 5 }, {
          parallel: true,
          rationale: "Reporte de inventario bajo.",
        })
      )
      return steps
    }

    if (this.hasTool("reports.sales")) {
      const input: Record<string, unknown> = {}
      if (hasDate) input.from = intent.entities.fecha
      steps.push(
        this.step("step-1", "reports.sales", "reports", input, {
          parallel: true,
          rationale: "Reporte de ventas" + (hasDate ? " para el periodo indicado" : " general"),
        })
      )
    } else if (this.hasTool("reports.today")) {
      steps.push(
        this.step("step-1", "reports.today", "reports", {}, {
          parallel: true,
          rationale: "Reporte de ventas del día.",
        })
      )
    }
    return steps
  }

  private planAction(intent: IntentClassification): PlannedStep[] {
    const steps: PlannedStep[] = []
    const normalized = intent.message

    if (intent.destructive) {
      if (normalized.includes("pedido") || normalized.includes("orden")) {
        if (this.hasTool("orders.updateStatus")) {
          steps.push(
            this.step("step-1", "orders.updateStatus", "orders", { status: "cancelled" }, {
              parallel: true,
              requiresConfirmation: true,
              rationale: "Cancelación de un pedido: requiere confirmación explícita.",
            })
          )
        }
        return steps
      }
      if (normalized.includes("producto") || normalized.includes("articulo") || intent.domains.includes("inventory")) {
        if (this.hasTool("products.delete")) {
          steps.push(
            this.step("step-1", "products.delete", "products", {}, {
              parallel: true,
              requiresConfirmation: true,
              rationale: "Eliminación de un producto: requiere confirmación explícita.",
            })
          )
        }
        return steps
      }
      if (normalized.includes("cliente")) {
        if (this.hasTool("customers.create")) {
          steps.push(
            this.step("step-1", "customers.search", "customers", { q: normalized, take: 5 }, {
              parallel: true,
              requiresConfirmation: true,
              rationale: "El borrado de clientes exige localizar al cliente y confirmar.",
            })
          )
        }
        return steps
      }
    }

    if (normalized.includes("cliente")) {
      if (this.hasTool("customers.create")) {
        steps.push(
          this.step("step-1", "customers.create", "customers", { phone: "pendiente" }, {
            parallel: true,
            rationale: "Creación de un cliente: requiere el teléfono.",
          })
        )
      }
      return steps
    }

    if (normalized.includes("stock") || normalized.includes("inventario")) {
      if (this.hasTool("inventory.updateStock")) {
        const type = normalized.includes("agregar") || normalized.includes("subir") || normalized.includes("aumentar") || normalized.includes("reponer")
          ? "increase"
          : "adjustment"
        steps.push(
          this.step("step-1", "inventory.updateStock", "inventory", { type, quantity: 0, concept: "ajuste desde asistente" }, {
            parallel: true,
            requiresConfirmation: type !== "increase",
            rationale: type === "increase"
              ? "Incremento de stock."
              : "Ajuste de stock (posible reducción): requiere confirmación explícita.",
          })
        )
      }
      return steps
    }

    if (normalized.includes("producto") || normalized.includes("articulo")) {
      if (this.hasTool("products.create")) {
        steps.push(
          this.step("step-1", "products.create", "products", { name: "pendiente", price: 0 }, {
            parallel: true,
            rationale: "Creación de un producto: requiere nombre y precio.",
          })
        )
      }
      return steps
    }

    return steps
  }

  private planConfig(intent: IntentClassification): PlannedStep[] {
    const steps: PlannedStep[] = []
    const normalized = intent.message

    if (normalized.includes("precio")) {
      if (this.hasTool("products.update")) {
        steps.push(
          this.step("step-1", "products.update", "products", {}, {
            parallel: true,
            rationale: "Actualización de configuración de producto.",
          })
        )
      }
    } else if (normalized.includes("stock") || normalized.includes("inventario")) {
      if (this.hasTool("inventory.updateStock")) {
        steps.push(
          this.step("step-1", "inventory.updateStock", "inventory", { type: "adjustment", quantity: 0, concept: "cambio de configuración" }, {
            parallel: true,
            requiresConfirmation: true,
            rationale: "Cambio de stock como configuración crítica: requiere confirmación.",
          })
        )
      }
    } else if (normalized.includes("producto")) {
      if (this.hasTool("products.update")) {
        steps.push(
          this.step("step-1", "products.update", "products", {}, {
            parallel: true,
            rationale: "Edición de producto.",
          })
        )
      }
    }
    return steps
  }
}
