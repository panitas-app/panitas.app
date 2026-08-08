import { describe, expect, it } from "vitest"
import {
  applyTurnToContext,
  createInitialContext,
  detectDomain,
  detectTopicChange,
  extractEntity,
  extractParams,
  isContextStale,
  resolveReferences,
  DEFAULT_CONTEXT_LIFECYCLE,
} from "@/lib/conversations/conversation-context"
import type { TurnOutcome } from "@/lib/conversations/conversation-types"

const NOW = "2026-08-04T12:00:00.000Z"

function outcome(userMessage: string, toolNames: string[] = [], intent?: string, confirmed = false): TurnOutcome {
  return { userMessage, assistantMessage: "ok", toolNames, intent, confirmed }
}

describe("detectDomain", () => {
  it("detecta dominios por palabras clave", () => {
    expect(detectDomain("crea un producto")).toBe("inventario")
    expect(detectDomain("¿cómo van las ventas?")).toBe("ventas")
    expect(detectDomain("muéstrame los pedidos")).toBe("pedidos")
    expect(detectDomain("busca al cliente María")).toBe("clientes")
    expect(detectDomain("registra un gasto")).toBe("gastos")
    expect(detectDomain("agenda una cita")).toBe("agenda")
    expect(detectDomain("hola que tal")).toBe("general")
  })
})

describe("extractEntity", () => {
  it("extrae producto por nombre explícito", () => {
    expect(extractEntity("Crea un producto llamado Zapato Deportivo con precio 35", "inventario")).toMatchObject({
      type: "product",
      name: "Zapato Deportivo",
    })
  })

  it("extrae producto al final de la frase", () => {
    expect(extractEntity("Elimina el producto Zapato X", "inventario")).toMatchObject({
      type: "product",
      name: "Zapato X",
    })
  })

  it("extrae número de pedido", () => {
    expect(extractEntity("muéstrame el pedido 42", "pedidos")).toMatchObject({ type: "order", id: "42" })
  })

  it("no extrae entidad en dominios sin entidad (gastos)", () => {
    expect(extractEntity("Registra un gasto en Categoría A por 50", "gastos")).toBeNull()
  })
})

describe("extractParams", () => {
  it("extrae cantidad y precio", () => {
    expect(extractParams("Ponle 15 unidades", "inventario")).toEqual({ cantidad: "15" })
    expect(extractParams("Crea un producto llamado X con precio 35", "inventario")).toEqual({ precio: "35" })
  })

  it("extrae monto y categoría de un gasto", () => {
    expect(extractParams("Registra un gasto en Categoría A por 50", "gastos")).toEqual({
      categoria: "A",
      monto: "50",
    })
  })

  it("extrae descripción", () => {
    expect(extractParams("la descripción es materiales de oficina", "gastos")).toEqual({
      descripcion: "materiales de oficina",
    })
  })

  it("extrae fecha de alcance", () => {
    expect(extractParams("solo las de ayer", "ventas")).toMatchObject({ fecha: "ayer" })
  })

  it("extrae orden por fecha", () => {
    expect(extractParams("ordénalos por fecha", "pedidos")).toMatchObject({ orden: "fecha" })
  })

  it("no confunde 'por fecha' con precio", () => {
    expect(extractParams("ordénalos por fecha", "pedidos").precio).toBeUndefined()
  })
})

describe("resolveReferences — referencias contextuales", () => {
  it("caso 1: 'Ponle 15 unidades' expande la entidad activa", () => {
    const context = {
      ...createInitialContext(NOW),
      domain: "inventario" as const,
      topic: "Inventario",
      turns: 1,
      activeEntity: { type: "product" as const, id: null, name: "Zapato Deportivo" },
      knownParams: { precio: "35" },
    }
    const result = resolveReferences("Ponle 15 unidades", context)
    expect(result.referenceResolved).toBe(true)
    expect(result.resolvedMessage).toContain("Zapato Deportivo")
    expect(result.resolvedMessage).toContain("15 unidades")
  })

  it("caso 5: 'cámbialo por Y' reemplaza la entidad activa", () => {
    const context = {
      ...createInitialContext(NOW),
      domain: "inventario" as const,
      turns: 1,
      activeEntity: { type: "product" as const, id: null, name: "Producto X" },
    }
    const result = resolveReferences("cámbialo por Y", context)
    expect(result.referenceResolved).toBe(true)
    expect(result.replacedEntity).toMatchObject({ type: "product", name: "Y" })
  })

  it("caso 4: 'la descripción es X' completa el parámetro pendiente", () => {
    const context = {
      ...createInitialContext(NOW),
      domain: "gastos" as const,
      topic: "Gastos",
      turns: 1,
      knownParams: { categoria: "A", monto: "50" },
      pendingParams: [{ key: "descripcion", label: "descripción", prompt: "¿Descripción?" }],
    }
    const result = resolveReferences("la descripción es materiales", context)
    expect(result.referenceResolved).toBe(true)
    expect(result.completedParamKey).toBe("descripcion")
    expect(result.filledValue).toBe("materiales")
  })

  it("caso 2: 'solo las de ayer' acota la consulta activa", () => {
    const context = { ...createInitialContext(NOW), domain: "ventas" as const, topic: "Ventas", turns: 2 }
    const result = resolveReferences("solo las de ayer", context)
    expect(result.referenceResolved).toBe(true)
    expect(result.scopeParams.fecha).toBe("ayer")
  })

  it("caso 3: 'ordénalos por fecha' añade orden a la consulta activa", () => {
    const context = { ...createInitialContext(NOW), domain: "pedidos" as const, topic: "Pedidos", turns: 2 }
    const result = resolveReferences("ordénalos por fecha", context)
    expect(result.referenceResolved).toBe(true)
    expect(result.scopeParams.orden).toBe("fecha")
  })

  it("'ahora' y 'también' continúan el tema sin romper el contexto", () => {
    const context = { ...createInitialContext(NOW), domain: "gastos" as const, topic: "Gastos", turns: 1 }
    expect(resolveReferences("ahora registra el monto", context).referenceResolved).toBe(true)
    expect(resolveReferences("también agrégalo", context).referenceResolved).toBe(true)
  })

  it("sin contexto previo no resuelve referencias", () => {
    const context = createInitialContext(NOW)
    expect(resolveReferences("Ponle 15 unidades", context).referenceResolved).toBe(false)
  })
})

describe("detectTopicChange y ciclo de vida", () => {
  it("cambio de dominio sin referencias = cambio de tema", () => {
    const context = { ...createInitialContext(NOW), domain: "ventas" as const, topic: "Ventas", turns: 2 }
    expect(detectTopicChange(context, "crea un producto nuevo", false, DEFAULT_CONTEXT_LIFECYCLE, NOW)).toBe(true)
  })

  it("mensaje con referencia no cambia el tema", () => {
    const context = { ...createInitialContext(NOW), domain: "ventas" as const, topic: "Ventas", turns: 2 }
    expect(detectTopicChange(context, "solo las de ayer", true, DEFAULT_CONTEXT_LIFECYCLE, NOW)).toBe(false)
  })

  it("primer turno nunca es cambio de tema", () => {
    expect(detectTopicChange(createInitialContext(NOW), "crea un producto", false, DEFAULT_CONTEXT_LIFECYCLE, NOW)).toBe(false)
  })

  it("inactividad prolongada reinicia el contexto", () => {
    const context = { ...createInitialContext("2026-08-04T11:00:00.000Z"), domain: "ventas" as const, turns: 3 }
    const later = "2026-08-04T12:31:00.000Z"
    expect(isContextStale(context, DEFAULT_CONTEXT_LIFECYCLE, later)).toBe(true)
    expect(detectTopicChange(context, "¿cómo van las ventas?", false, DEFAULT_CONTEXT_LIFECYCLE, later)).toBe(true)
  })

  it("dentro del margen no caduca", () => {
    const context = { ...createInitialContext("2026-08-04T12:00:00.000Z"), turns: 1 }
    expect(isContextStale(context, DEFAULT_CONTEXT_LIFECYCLE, "2026-08-04T12:20:00.000Z")).toBe(false)
  })
})

describe("applyTurnToContext — flujo completo", () => {
  it("caso 1: crea entidad + precio y luego 'ponle 15 unidades'", () => {
    const initial = createInitialContext(NOW)
    const turn1 = applyTurnToContext(
      initial,
      resolveReferences("Crea un producto llamado Zapato Deportivo con precio 35", initial),
      outcome("Crea un producto llamado Zapato Deportivo con precio 35", ["inventory.create_product"], "inventario"),
      NOW,
    )
    expect(turn1.domain).toBe("inventario")
    expect(turn1.activeEntity).toMatchObject({ name: "Zapato Deportivo" })
    expect(turn1.knownParams.precio).toBe("35")
    expect(turn1.turns).toBe(1)
    expect(turn1.status).toBe("active")

    const ref = resolveReferences("Ponle 15 unidades", turn1)
    const turn2 = applyTurnToContext(turn1, ref, outcome("Ponle 15 unidades", ["inventory.update_stock"], "inventario"), NOW)
    expect(ref.referenceResolved).toBe(true)
    expect(turn2.activeEntity).toMatchObject({ name: "Zapato Deportivo" })
    expect(turn2.knownParams).toMatchObject({ precio: "35", cantidad: "15" })
    expect(turn2.turns).toBe(2)
  })

  it("caso 4: gasto con descripción pendiente que se completa", () => {
    const initial = createInitialContext(NOW)
    const turn1 = applyTurnToContext(
      initial,
      resolveReferences("Registra un gasto en Categoría A por 50", initial),
      outcome("Registra un gasto en Categoría A por 50", [], "gastos"),
      NOW,
    )
    expect(turn1.domain).toBe("gastos")
    expect(turn1.knownParams).toMatchObject({ categoria: "A", monto: "50" })
    expect(turn1.pendingParams).toHaveLength(1)
    expect(turn1.status).toBe("awaiting_details")

    const ref = resolveReferences("la descripción es materiales", turn1)
    const turn2 = applyTurnToContext(turn1, ref, outcome("la descripción es materiales", ["expenses.create_expense"], "gastos"), NOW)
    expect(ref.completedParamKey).toBe("descripcion")
    expect(turn2.pendingParams).toHaveLength(0)
    expect(turn2.knownParams.descripcion).toBe("materiales")
    expect(turn2.status).toBe("active")
  })

  it("caso 5: 'cámbialo por Y' sustituye la entidad activa", () => {
    const initial = createInitialContext(NOW)
    const turn1 = applyTurnToContext(
      initial,
      resolveReferences("Elimina el producto X", initial),
      outcome("Elimina el producto X", [], "inventario"),
      NOW,
    )
    expect(turn1.activeEntity).toMatchObject({ name: "X" })

    const ref = resolveReferences("cámbialo por Y", turn1)
    const turn2 = applyTurnToContext(turn1, ref, outcome("cámbialo por Y", [], "inventario"), NOW)
    expect(turn2.activeEntity).toMatchObject({ name: "Y" })
  })

  it("caso 2 y 3: la consulta continúa acumulando alcance", () => {
    const initial = createInitialContext(NOW)
    const turn1 = applyTurnToContext(initial, resolveReferences("¿Cómo van las ventas?", initial), outcome("¿Cómo van las ventas?", [], "ventas"), NOW)
    const ref = resolveReferences("solo las de ayer", turn1)
    const turn2 = applyTurnToContext(turn1, ref, outcome("solo las de ayer", [], "ventas"), NOW)
    expect(turn2.knownParams.fecha).toBe("ayer")

    const initialOrders = createInitialContext(NOW)
    const o1 = applyTurnToContext(initialOrders, resolveReferences("Muéstrame los pedidos", initialOrders), outcome("Muéstrame los pedidos", [], "pedidos"), NOW)
    const ref2 = resolveReferences("ordénalos por fecha", o1)
    const o2 = applyTurnToContext(o1, ref2, outcome("ordénalos por fecha", [], "pedidos"), NOW)
    expect(o2.knownParams.orden).toBe("fecha")
  })

  it("ejecutar la acción limpia los parámetros pendientes", () => {
    const context = {
      ...createInitialContext(NOW),
      domain: "gastos" as const,
      turns: 2,
      pendingParams: [{ key: "descripcion", label: "descripción", prompt: "¿?" }],
      knownParams: { categoria: "A", monto: "50", descripcion: "materiales" },
    }
    const next = applyTurnToContext(context, { resolvedMessage: "ok", referenceResolved: true, scopeParams: {} }, outcome("ok", ["expenses.create_expense"], "gastos"), NOW)
    expect(next.pendingParams).toHaveLength(0)
    expect(next.status).toBe("active")
  })

  it("conversaciones largas: el contexto sobrevive turnos acumulados", () => {
    let context = createInitialContext(NOW)
    for (let i = 0; i < 40; i++) {
      const message = i % 2 === 0 ? `crea un producto llamado Producto ${i} con precio ${i}` : `ponle ${i} unidades`
      const resolution = resolveReferences(message, context)
      const domain = resolution.referenceResolved ? context.domain : detectDomain(message)
      context = applyTurnToContext(context, resolution, outcome(message, ["inventory.update_stock"], domain), NOW)
    }
    expect(context.turns).toBe(40)
    expect(context.updatedAt).toBe(NOW)
    expect(context.activeEntity).toBeDefined()
  })
})
