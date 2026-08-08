"use client"

import * as React from "react"

import type { QuickAction, RichBlock } from "@/lib/conversational-actions"
import { QuickActions } from "@/components/assistant/actions/quick-actions"
import { RichCard } from "@/components/assistant/cards/rich-card"
import { KpiGrid } from "@/components/assistant/cards/kpi-grid"
import { RichSummary } from "@/components/assistant/cards/rich-summary"
import { ListCard } from "@/components/assistant/cards/list-card"
import { MonitorCard } from "@/components/assistant/cards/monitor-card"
import { FinancialCard } from "@/components/assistant/cards/financial-card"
import { RichTable } from "@/components/assistant/tables/rich-table"
import { RichChart } from "@/components/assistant/charts/rich-chart"

/** Función que renderiza un bloque tipado. */
export type BlockRenderer = (block: RichBlock, onSend?: (action: QuickAction) => void) => React.ReactNode

export interface RegisteredComponent {
  readonly kind: RichBlock["kind"]
  render: BlockRenderer
}

/**
 * Registro central de componentes (FASE 5E). Mapea cada `RichBlockKind` a su
 * componente. Extensible: para añadir un bloque nuevo solo se registra aquí,
 * sin tocar el motor conversacional.
 */
const componentRegistry = new Map<RichBlock["kind"], RegisteredComponent>()

export { componentRegistry }

export function registerComponent(component: RegisteredComponent): void {
  componentRegistry.set(component.kind, component)
}

const byKind = <K extends RichBlock["kind"]>(kind: K) => (block: RichBlock): block is Extract<RichBlock, { kind: K }> => block.kind === kind

export const DEFAULT_COMPONENTS: RegisteredComponent[] = [
  { kind: "card", render: (block) => <RichCard block={block as Extract<RichBlock, { kind: "card" }>} /> },
  { kind: "kpi", render: (block) => <KpiGrid block={block as Extract<RichBlock, { kind: "kpi" }>} /> },
  { kind: "summary", render: (block) => <RichSummary block={block as Extract<RichBlock, { kind: "summary" }>} /> },
  { kind: "list", render: (block) => <ListCard block={block as Extract<RichBlock, { kind: "list" }>} /> },
  { kind: "monitor", render: (block) => <MonitorCard block={block as Extract<RichBlock, { kind: "monitor" }>} /> },
  { kind: "financial", render: (block) => <FinancialCard block={block as Extract<RichBlock, { kind: "financial" }>} /> },
  { kind: "table", render: (block) => <RichTable block={block as Extract<RichBlock, { kind: "table" }>} /> },
  { kind: "chart", render: (block) => <RichChart block={block as Extract<RichBlock, { kind: "chart" }>} /> },
  {
    kind: "quick-actions",
    render: (block, onSend) => <QuickActionsWidget block={block as Extract<RichBlock, { kind: "quick-actions" }>} onSend={onSend} />,
  },
]

function QuickActionsWidget({ block, onSend }: { block: Extract<RichBlock, { kind: "quick-actions" }>; onSend?: (action: QuickAction) => void }) {
  return <QuickActions actions={block.items} onSend={onSend} />
}

for (const component of DEFAULT_COMPONENTS) registerComponent(component)

export function getComponent(kind: RichBlock["kind"]): RegisteredComponent | undefined {
  return componentRegistry.get(kind)
}

/** Renderiza un bloque tipado usando el registro; devuelve null si no hay componente. */
export function renderBlock(block: RichBlock, onSend?: (action: QuickAction) => void): React.ReactNode {
  const component = componentRegistry.get(block.kind)
  if (!component) return null
  return component.render(block, onSend)
}

export { byKind }
