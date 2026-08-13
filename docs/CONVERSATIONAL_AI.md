# Conversational AI Copilot (FASE 7B)

> Copiloto de conversaciones del Inbox de Panitas. Analiza automáticamente cada
> conversación, detecta **multi-intención**, genera resumen incremental,
> **1–3 respuestas sugeridas ancladas en datos reales**, acciones inteligentes y
> responde **consultas en lenguaje natural** sobre el cliente. El copiloto
> **solo sugiere**: el humano decide y envía. Nunca responde automáticamente.

## 1. Visión

Sobre el Centro Unificado de Conversaciones (FASE 7A), el copiloto añade una
capa de inteligencia conversacional por conversación:

- **Análisis automático** al abrir un hilo: intención(es), sentimiento, resumen
  y contexto del cliente en una sola pasada.
- **Multi-intención**: un mensaje puede activar varias intenciones a la vez
  (ej. `consulta_producto` + `disponibilidad` + `precio`).
- **Resumen incremental**: solo se reanaliza si llegaron mensajes nuevos
  (caché por `lastMessageId`).
- **Respuestas sugeridas grounded**: basadas en inventario, CRM, créditos y
  pedidos reales. La heurística genera; el LLM (opcional) solo pule sin
  inventar datos (`source: "ai" | "heuristic"`).
- **Acciones inteligentes** con rutas reales del dashboard.
- **Consultas naturales**: "¿Qué ha comprado?", "¿Cuánto debe?", "¿Tiene
  pedidos pendientes?", "¿Qué productos suele comprar?", "¿Cuál fue su última
  compra?".
- **Memoria conversacional** (Business Memory): tono preferido del negocio,
  frases frecuentes y clientes frecuentes.
- **Eventos de dominio** `{ domain: "copilot", type: "conversation.*" }`.

```
Conversación del inbox
        │  (mensajes + contexto CRM)
        ▼
┌─────────────────────────────────────────────────────────┐
│  CopilotService.analyze()   (caché por lastMessageId)    │
│  ├─ intent-detector    → multi-intención top 3          │
│  ├─ conversation-summary → resumen + keyFacts (increm.) │
│  ├─ response-generator → 1-3 sugerencias grounded       │
│  ├─ action-suggestions → acciones + hrefs reales        │
│  ├─ customer-context   → CRM + créditos + pedidos       │
│  └─ copilot-llm (opcional) → pule conservando datos     │
├─────────────────────────────────────────────────────────┤
│  eventos conversation.intent/summary/response/action     │
│  memoria bm.preference.conversation.tono …               │
├─────────────────────────────────────────────────────────┤
│  UI /dashboard/conversaciones → panel Copiloto           │
│  POST /api/inbox/[id]/copilot?action=query (NL)          │
└─────────────────────────────────────────────────────────┘
```

## 2. Módulo (`src/lib/conversation-ai/`)

| Archivo | Rol |
|---|---|
| `conversation-types.ts` | **Tipos puros (sin Prisma)**: 12 intents, 10 acciones con `COPILOT_ACTION_HREFS`, 8 query-intents, `CopilotAnalysis`, `CopilotMemory`; re-exporta DTOs del inbox (`InboxSentiment`, `InboxOrderView`…). Consumible desde componentes cliente. |
| `intent-detector.ts` | Detección de intención sobre mensajes del cliente: top 3 multi-intención, sentimiento, tópicos, confianza y señales por keyword (normalización sin tildes). Incluye `detectQueryIntent` para consultas naturales. |
| `conversation-summary.ts` | Resumen incremental por `lastMessageId` + `keyFacts`. |
| `customer-context.ts` | `enrichContext` (pedidos pendientes, `totalDebt`, `lastConversation`) + `CopilotCustomerContextService` (build + `findProducts` real en inventario). |
| `response-generator.ts` | 1–3 sugerencias **grounded** (inventario, crédito, pedidos, favoritos) con `rationale`, `dataSources` y `grounded`. Tonos desde memoria (formal/amable/neutral). |
| `action-suggestions.ts` | Intenciones → acciones con `COPILOT_ACTION_HREFS` reales, dedupe y `tone` según urgencia. |
| `conversation-memory.ts` | Lectura/escritura de memoria: `bm.preference.conversation.tono`, `bm.usage.conversation.respuestas_frecuentes`, `bm.usage.conversation.clientes_frecuentes`. Separador de listas `||` (comas interiores de frases no rompen el parseo). |
| `copilot-llm.ts` | `CopilotLlmProvider` desacoplado: **heurística por defecto** (sin red) y `createAgentAiProvider` (OpenRouter) como proveedor opcional. |
| `query-answer.ts` | 8 intents de consulta natural **grounded**; honesto: sin datos responde "no tengo registro" con `dataSources: []`. |
| `copilot-service.ts` | Orquestador: `analyze(ctx, id, { force? })`, `query(ctx, id, question)`, `getCached`, `clearCache`; caché por `lastMessageId`, eventos y `learn` (solo de mensajes `agent` reales). |
| `index.ts` | Barrel de la fase. |

## 3. Taxonomía

**Intenciones (multi-intención, top 3):** `consulta_producto`, `disponibilidad`,
`precio`, `cotizacion`, `pedido`, `cobranza`, `soporte`, `garantia`, `reclamo`,
`agendar_visita`, `venta`, `otro`. Cada una mapea a una etiqueta del inbox 7A
(`COPILOT_INTENT_TAG`).

**Acciones inteligentes (10):** `create_quote`, `create_order`,
`register_customer`, `register_sale`, `check_credit`, `register_payment`,
`check_inventory`, `open_customer_profile`, `check_orders`, `follow_up` — con
href real a `/dashboard/pos`, `/dashboard/creditos`,
`/dashboard/products`, `/dashboard/crm`, `/dashboard/orders`,
`/dashboard/conversaciones`.

**Consultas naturales (8):** `compras`, `deuda`, `ultima_compra`,
`pedidos_pendientes`, `productos_frecuentes`, `inventario`, `cliente`, `otro`.

## 4. Respuestas ancladas en datos (grounded)

La heurística construye sugerencias **solo** con señales reales:

- Hit de producto en el inventario → precio + stock reales
  (`dataSources: ["inventario:producto", …]`).
- Crédito activo → montos pendiente/vencido (`crm:creditos`).
- Pedido pendiente/ultimo pedido → número y estado (`crm:pedidos`).
- Producto favorito del cliente (`crm:favoritos`).
- Sin señales → sugerencia genérica con `grounded: false` (nunca inventa).

El LLM recibe un **contexto compacto y real** (`buildGroundedContext`) y solo
pule la redacción conservando los datos. Si el proveedor lanza o no hay key, el
resultado final es la heurística (`source: "heuristic"`).

## 5. Caché e incremento

`analyze` calcula `lastMessageId`; si la caché coincide y `force` no está
activo, devuelve el análisis previo con `fresh: false`. Los cambios en la
conversación (nuevo mensaje) invalidan el id y se reanaliza **solo** el contexto
afectado. `POST .../copilot?action=analyze&force=1` fuerza el reanálisis.

## 6. Memoria conversacional (`conversation-memory.ts`)

| Clave | Aprende |
|---|---|
| `bm.preference.conversation.tono` | tono preferido del negocio (`formal\|amable\|neutral`), detectado de respuestas reales del agente |
| `bm.usage.conversation.respuestas_frecuentes` | frases frecuentes del agente (lista hasta 20, sin duplicados, separador `\|\|`) |
| `bm.usage.conversation.clientes_frecuentes` | nombres de clientes atendidos frecuentemente |

`learn` solo se alimenta del **contenido real de mensajes `agent`**
(`lastAgentContent`), nunca de sugerencias no enviadas. Escritura
best-effort con `Promise.allSettled`.

## 7. Eventos (`{ domain: "copilot" }`)

`src/lib/events/event-listeners/copilot.listener.ts` escucha:

| Evento | Se dispara cuando… |
|---|---|
| `conversation.intent.detected` | `analyze` detecta intención(es) |
| `conversation.summary.updated` | se genera/actualiza el resumen |
| `conversation.response.generated` | se generan sugerencias de respuesta |
| `conversation.action.suggested` | se sugieren acciones |

Registrado vía `registerCopilotListener` (exportado por `@/lib/events`). El
listener de `conversation-history` excluye también `domain === "copilot"`.

## 8. API

`POST /api/inbox/[id]/copilot` — `csrfGuard` + `requireInboxStore` (gate
`unified_chat`, 401 sin sesión/feature). Errores vía `inboxErrorResponse`.

| Uso | Payload |
|---|---|
| Reanálisis forzado | `{ "action": "analyze", "force": true }` |
| Consulta natural | `{ "action": "query", "question": "¿Cuánto debe este cliente?" }` |
| `GET` | Análisis en caché (`copilot.analyze` con caché) |

## 9. UI (`/dashboard/conversaciones`)

- **`copilot-panel.tsx`** (nuevo): resumen + `keyFacts`, badges de intención,
  respuestas sugeridas con "Usar como borrador", acciones con href real y badge
  de tono, consulta natural, estados loading/error, badge de fuente
  `ai|heuristic`, botón de reanálisis.
- **`conversation-thread.tsx`**: botón "Copiloto" (toggle) abre el panel;
  `useCopilotSuggestion(text)` rellena el compositor.
- **`api.ts`**: `getCopilotAnalysis`, `refreshCopilotAnalysis`,
  `askCopilot` — importan **tipos puros** de
  `@/lib/conversation-ai/conversation-types`.

## 10. Proveedores LLM (desacoplados)

`CopilotLlmProvider` (`copilot-llm.ts`) abstrae la mejora de sugerencias y
respuestas de consultas. La implementación por defecto es **heurística** (sin
red, determinista). Con API key, `createAgentAiProvider` (desde agent-core,
OpenRouter) refina; el fallback mantiene siempre un resultado grounded.
Modelos premium se preparan manteniendo la misma interfaz.

## 11. Seguridad

- Multi-tenant estricto (`storeId` en caché y en `load` → 404 si no coincide).
- Feature gate `unified_chat` en UI y API; CSRF en mutaciones.
- Respuestas nunca enviadas automáticamente: el copiloto produce texto que el
  humano edita/envía.
- No se exponen datos internos al cliente; solo DTOs puros.

## 12. Fuera de alcance

1. Envío automático de sugerencias (prohibido por diseño).
2. Conectores reales de canales (FASE 7C).
3. Modelos LLM premium (interfaz lista en `copilot-llm.ts`).
4. Entrenamiento del tono por feedback explícito del usuario.
