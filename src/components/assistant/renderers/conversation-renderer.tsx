"use client"

import * as React from "react"

import type { QuickAction, RichBlock, RichResponse } from "@/lib/conversational-actions"
import { renderBlock } from "@/components/assistant/renderers/component-registry"

export interface ConversationRendererProps {
  rich?: RichResponse | null
  onSend?: (action: QuickAction) => void
  className?: string
}

/**
 * ConversationRenderer (FASE 5E): selecciona y renderiza los componentes
 * visuales según la respuesta estructurada. Es agnóstico del motor: consume
 * bloques semánticos y delega cada uno al registro central.
 */
export function ConversationRenderer({ rich, onSend, className }: ConversationRendererProps) {
  const nodes = React.useMemo(() => {
    if (!rich) return []
    const blocks: RichBlock[] = Array.isArray(rich.blocks) ? rich.blocks : []
    if (!blocks.length) return []
    return blocks.map((block, i) => ({ node: renderBlock(block, onSend), key: `${block.kind}-${i}` }))
  }, [rich, onSend])

  if (!rich || !nodes.length) return null

  return (
    <div data-slot="conversation-renderer" className={className ?? "space-y-3"}>
      {nodes.map(({ node, key }) => (
        <React.Fragment key={key}>{node}</React.Fragment>
      ))}
    </div>
  )
}
