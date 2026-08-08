import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { registerComponent, renderBlock, getComponent, DEFAULT_COMPONENTS, componentRegistry } from "@/components/assistant/renderers/component-registry"
import { ConversationRenderer } from "@/components/assistant/renderers/conversation-renderer"
import type { RichBlock, RichResponse } from "@/lib/conversational-actions"

function markup(node: React.ReactNode): string {
  return renderToStaticMarkup(React.createElement(React.Fragment, null, node))
}

describe("ConversationRenderer + registro central (FASE 5E)", () => {
  it("registra los 8 bloques por defecto (sin quick-actions duplicado)", () => {
    const kinds = DEFAULT_COMPONENTS.map((c) => c.kind)
    expect(kinds).toEqual(expect.arrayContaining(["card", "kpi", "summary", "list", "monitor", "financial", "table", "chart", "quick-actions"]))
  })

  it("getComponent resuelve bloques y renderBlock devuelve null para desconocidos", () => {
    expect(getComponent("table")).toBeTruthy()
    expect(renderBlock({ kind: "text", text: "hola" })).toBeNull()
  })

  it("renderiza una tarjeta (card) con campos y acciones", () => {
    const block: RichBlock = {
      kind: "card",
      title: "Café",
      badge: "Stock bajo",
      tone: "warning",
      fields: [
        { label: "Precio", value: "$2.00" },
        { label: "Stock", value: 3, tone: "danger" },
      ],
      actions: [{ label: "Eliminar", action: "eliminar producto café", variant: "destructive", confirm: true }],
    }
    const html = markup(renderBlock(block)!)
    expect(html).toContain('data-slot="assistant-card"')
    expect(html).toContain("Café")
    expect(html).toContain("Stock bajo")
    expect(html).toContain("Eliminar")
  })

  it("renderiza una tabla con cabeceras y filas", () => {
    const block: RichBlock = {
      kind: "table",
      title: "Productos",
      headers: ["Nombre", "Stock"],
      rows: [["Café", 12], ["Pan", 3]],
      sortable: true,
      paginated: true,
    }
    const html = markup(renderBlock(block)!)
    expect(html).toContain('data-slot="assistant-table"')
    expect(html).toContain("Nombre")
    expect(html).toContain("Café")
    expect(html).toContain("Pan")
  })

  it("muestra aviso (no gráfico) cuando hay pocos datos y gráfico cuando hay suficientes", () => {
    const few: RichBlock = { kind: "chart", title: "Ventas", type: "bar", data: [{ label: "A", value: 1 }] }
    const htmlFew = markup(renderBlock(few)!)
    expect(htmlFew).toContain("pocos datos")

    const enough: RichBlock = {
      kind: "chart",
      title: "Ventas",
      type: "bar",
      data: [
        { label: "A", value: 3 },
        { label: "B", value: 7 },
      ],
    }
    const htmlEnough = markup(renderBlock(enough)!)
    expect(htmlEnough).toContain('data-slot="assistant-chart"')
    expect(htmlEnough).toContain('aria-label="Gráfico de barras')
  })

  it("renderiza donut con segmentos y leyenda", () => {
    const donut: RichBlock = {
      kind: "chart",
      title: "Gastos por categoría",
      type: "donut",
      data: [
        { label: "Alquiler", value: 50 },
        { label: "Nómina", value: 30 },
        { label: "Otros", value: 20 },
      ],
      currency: true,
    }
    const html = markup(renderBlock(donut)!)
    expect(html).toContain("circle")
    expect(html).toContain("Alquiler")
  })

  it("renderiza KPIs con delta", () => {
    const kpi: RichBlock = {
      kind: "kpi",
      title: "Métricas",
      items: [
        { label: "Ventas", value: 1200, delta: 12, icon: "trending-up", tone: "success" },
        { label: "Pedidos", value: 34, icon: "package-check" },
      ],
    }
    const html = markup(renderBlock(kpi)!)
    expect(html).toContain("assistant-kpis")
    expect(html).toContain("Ventas")
    expect(html).toContain("12")
  })

  it("renderiza monitor inteligente con severidad y acción", () => {
    const monitor: RichBlock = {
      kind: "monitor",
      title: "3 productos requieren reposición",
      description: "Café y Pan están bajo el umbral.",
      tone: "warning",
      severity: "warning",
      icon: "package",
      actions: [{ label: "Ver productos", action: "muéstrame los productos con stock bajo" }],
    }
    const html = markup(renderBlock(monitor)!)
    expect(html).toContain("Atención")
    expect(html).toContain("Ver productos")
    expect(html).toContain("3 productos requieren reposición")
  })

  it("renderiza componente financiero con punto de equilibrio", () => {
    const financial: RichBlock = {
      kind: "financial",
      title: "Finanzas",
      metrics: [
        { label: "Utilidad", value: 500, tone: "success", icon: "trending-up" },
        { label: "Margen", value: "30%", tone: "info", icon: "banknote" },
      ],
      breakEven: { revenue: 2000, units: 80, margin: 0.25 },
      expenseBreakdown: [{ label: "Nómina", value: 400, percentage: 0.4 }],
    }
    const html = markup(renderBlock(financial)!)
    expect(html).toContain("Utilidad")
    expect(html).toContain("Punto de equilibrio")
    expect(html).toContain("80 unidades")
  })

  it("renderiza lista de entidades", () => {
    const list: RichBlock = {
      kind: "list",
      title: "Mejores clientes",
      items: [
        { title: "Ana", subtitle: "ana@correo.com", badge: "VIP", tone: "success", metadata: ["$500"] },
      ],
    }
    const html = markup(renderBlock(list)!)
    expect(html).toContain("Ana")
    expect(html).toContain("VIP")
  })

  it("ConversationRenderer renderiza todos los bloques de una RichResponse", () => {
    const rich: RichResponse = {
      kind: "summary",
      title: "Resumen",
      blocks: [
        { kind: "kpi", title: "KPIs", items: [{ label: "Ventas", value: 100 }] },
        { kind: "table", title: "Productos", headers: ["N"], rows: [["Café"]] },
        { kind: "monitor", title: "Alerta", tone: "warning", severity: "warning", actions: [{ label: "Ver", action: "ver" }] },
      ],
    }
    const html = markup(React.createElement(ConversationRenderer, { rich }))
    expect(html).toContain("assistant-kpis")
    expect(html).toContain("assistant-table")
    expect(html).toContain("Alerta")
  })

  it("registerComponent permite extender el registro sin tocar el motor", () => {
    const before = componentRegistry.size
    registerComponent({ kind: "text", render: (block) => React.createElement("p", { "data-slot": "custom-text" }, (block as { text: string }).text) })
    expect(componentRegistry.size).toBe(before + 1)
    const html = markup(renderBlock({ kind: "text", text: "hola" })!)
    expect(html).toContain('data-slot="custom-text"')
    expect(html).toContain("hola")
  })

  it("las acciones rápidas se reenvían sin tool names ni JSON", () => {
    const quick: RichBlock = { kind: "quick-actions", items: [{ label: "Registrar venta", action: "registrar una venta de 3 cafés", icon: "shopping-cart" }] }
    const html = markup(renderBlock(quick)!)
    expect(html).toContain("Registrar venta")
    expect(html).not.toMatch(/orders\.create|"actionId"|tool/i)
  })
})
