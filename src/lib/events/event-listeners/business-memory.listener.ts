/**
 * Listener: Business Memory (FASE 5H).
 *
 * Conecta los eventos de dominio con la memoria estable 5G SIN acoplar módulos:
 * ante ciertos eventos (cambios de precio, créditos otorgados, cancelaciones)
 * el listener registra observaciones. El learner 5G consolida SOLO por
 * repetición (umbral) o enseñanza explícita; una sola observación nunca crea
 * un recuerdo confirmado.
 *
 * La memoria es opcional (`memory` inyectable): sin engine no hace nada.
 */
import type { EventBus } from "../event-bus"
import type { DomainEvent } from "../event-types"
import type { BusinessMemoryEngine } from "@/lib/business-memory"
import type { MemoryContext } from "@/lib/agent/memory"

export interface BusinessMemoryListenerOptions {
  memory?: BusinessMemoryEngine
}

type MemoryObservationInput = {
  kind: "terminology" | "preference" | "operational_rule" | "usage_pattern"
  key: string
  label: string
  value: unknown
  tags?: string[]
  domain?: string
}

export function registerBusinessMemoryListener(bus: EventBus, options: BusinessMemoryListenerOptions = {}) {
  const memory = options.memory

  const ctxOf = (event: DomainEvent): MemoryContext => ({
    userId: event.actorId ?? "system",
    storeId: event.tenantId,
    negocioId: (event.metadata?.negocioId as string | undefined) ?? undefined,
  })

  const observe = (event: DomainEvent, observation: MemoryObservationInput): void => {
    if (!memory) return
    void memory
      .observe(ctxOf(event), { ...observation, ctx: ctxOf(event) })
      .catch((error: unknown) =>
        console.error("[events] la memoria del negocio no aprendió:", String(error)),
      )
  }

  return bus.subscribeAll((event) => {
    const data = event.data as Record<string, unknown> | undefined
    const productName = typeof data?.name === "string" ? data.name : typeof data?.productName === "string" ? data.productName : undefined
    const productId = typeof data?.productId === "string" ? data.productId : undefined

    switch (event.type) {
      case "product.price.changed": {
        if (!productId) return
        observe(event, {
          kind: "operational_rule",
          key: `bm.operational_rule.price.${productId}`,
          label: `Precio de "${productName ?? "producto"}" actualizado`,
          value: {
            productId,
            productName,
            oldPrice: data?.oldPrice,
            newPrice: data?.newPrice,
          },
          tags: ["precio", "producto"],
          domain: "inventory",
        })
        return
      }
      case "credit.created":
      case "customer.credit.created": {
        const customerId = typeof data?.customerId === "string" ? data.customerId : event.aggregateId
        observe(event, {
          kind: "usage_pattern",
          key: "bm.usage_pattern.credito.otorgado",
          label: "Crédito otorgado a cliente",
          value: { customerId, creditId: data?.creditId },
          tags: ["credito", "clientes"],
          domain: "customers",
        })
        return
      }
      case "credit.overdue": {
        observe(event, {
          kind: "usage_pattern",
          key: "bm.usage_pattern.credito.vencido",
          label: "Crédito vencido",
          value: { creditId: data?.creditId, customerId: data?.customerId },
          tags: ["credito", "cobranza"],
          domain: "customers",
        })
        return
      }
      case "order.cancelled": {
        observe(event, {
          kind: "usage_pattern",
          key: "bm.usage_pattern.pedido.cancelado",
          label: "Pedido cancelado",
          value: { orderId: data?.orderId },
          tags: ["pedidos", "cancelacion"],
          domain: "orders",
        })
        return
      }
      // Business Knowledge Base (FASE 7D): el uso de la Base de Conocimiento
      // (búsquedas y documentos creados) alimenta la memoria del negocio.
      case "knowledge.search.executed": {
        const query = typeof data?.query === "string" ? data.query : undefined
        if (!query) return
        observe(event, {
          kind: "usage_pattern",
          key: "bm.usage_pattern.knowledge.busqueda",
          label: `Búsqueda en la Base de Conocimiento: "${query}"`,
          value: { query, hits: data?.hits },
          tags: ["knowledge", "busqueda"],
          domain: "knowledge",
        })
        return
      }
      case "knowledge.document.created": {
        const title = typeof data?.title === "string" ? data.title : undefined
        observe(event, {
          kind: "usage_pattern",
          key: "bm.usage_pattern.knowledge.documento_creado",
          label: `Documento añadido a la Base de Conocimiento: "${title ?? "sin título"}"`,
          value: { documentId: data?.documentId, title },
          tags: ["knowledge", "documentos"],
          domain: "knowledge",
        })
        return
      }
    }
  })
}
