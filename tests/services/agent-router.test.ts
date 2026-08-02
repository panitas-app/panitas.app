import { describe, expect, it } from "vitest"
import { routeAgentIntent } from "@/lib/agent/router"

describe("routeAgentIntent", () => {
  it("routes stock queries to inventory.check_stock", () => {
    expect(routeAgentIntent("¿cuánto stock hay del producto X?")).toBe("inventory.check_stock")
    expect(routeAgentIntent("consulta la existencia de zapatos")).toBe("inventory.check_stock")
    expect(routeAgentIntent("¿cuánto inventario tengo de abrazaderas AB12?")).toBe("inventory.check_stock")
  })

  it("routes increase/decrease to inventory.adjust_stock", () => {
    expect(routeAgentIntent("aumenta el stock del producto 5")).toBe("inventory.adjust_stock")
    expect(routeAgentIntent("descontar 3 de inventario")).toBe("inventory.adjust_stock")
    expect(routeAgentIntent("agrega 50 unidades de este producto")).toBe("inventory.adjust_stock")
  })

  it("routes sales summaries and creation", () => {
    expect(routeAgentIntent("resumen de ventas de hoy")).toBe("sales.summary")
    expect(routeAgentIntent("total de ingresos del día")).toBe("sales.summary")
    expect(routeAgentIntent("crear una venta en el pos")).toBe("sales.create_order")
    expect(routeAgentIntent("registra un pedido")).toBe("order.create")
  })

  it("routes customer, agenda and report intents", () => {
    expect(routeAgentIntent("lista mis clientes")).toBe("customers.list")
    expect(routeAgentIntent("buscar cliente por teléfono")).toBe("customers.list")
    expect(routeAgentIntent("registrar un nuevo cliente")).toBe("customers.create")
    expect(routeAgentIntent("agendar una cita para mañana")).toBe("agenda.create")
    expect(routeAgentIntent("ver las citas de hoy")).toBe("agenda.list")
    expect(routeAgentIntent("cancelar la cita del lunes")).toBe("agenda.cancel")
    expect(routeAgentIntent("reporte de ventas de la semana")).toBe("report.sales")
  })

  it("returns null for unrecognized input", () => {
    expect(routeAgentIntent("hola")).toBeNull()
  })
})
