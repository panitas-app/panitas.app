# Omnichannel — Centro Unificado de Conversaciones (FASE 7A)

> Arquitectura del Centro de Conversaciones omnicanal de Panitas.
> Multi-canal **sin proveedores reales conectados todavía** (fase preparada:
> WhatsApp/Instagram/Messenger/webchat/email están modelados, pero no hay webhooks
> ni envío real hacia las plataformas). El asistente IA **solo sugiere**, nunca
> responde automáticamente al cliente.

## 1. Visión

Una sola pantalla (3 columnas) donde el negocio atiende todas las conversaciones
de sus clientes, sin importar el canal de origen. Cada conversación se
**etiqueta**, se **prioriza**, se **asigna** a un colaborador, y el asistente IA
aporta contexto (resumen, intención, borrador de respuesta, historial relevante)
para que el humano decida.

```
Cliente (WhatsApp/IG/Messenger/webchat/email)
        │  (futuro: webhooks del proveedor)
        ▼
┌────────────────────────────────────────────────────┐
│  API /api/inbox/**   (multi-tenant, feature gate)   │
│  └─ conversation-service ─ message-service          │
│       └─ eventos {domain:"inbox"} + auditoría       │
├────────────────────────────────────────────────────┤
│  Business Memory  bm.preference.inbox.*             │
│  └─ canales favoritos, etiquetas, orden, import.    │
├────────────────────────────────────────────────────┤
│  IA heurística (HeuristicInboxAiProvider)           │
│  └─ resumen / intención / borrador / historial      │
│  └─ contexto cliente (CRM + recomendaciones)        │
├────────────────────────────────────────────────────┤
│  UI /dashboard/conversaciones (3 columnas)          │
│  Lista │ Conversación │ Contexto del cliente         │
└────────────────────────────────────────────────────┘
```

## 2. Modelo de datos (Prisma, FASE 7A)

| Modelo | Propósito |
|---|---|
| `InboxChannel` | Canal habilitado/deshabilitado por tienda (whatsapp, instagram, messenger, webchat, email, other). |
| `InboxConversation` | Hilo por `(store, externalId|phone, channel)`; estado, prioridad, título, delegado, cliente. |
| `InboxMessage` | Mensaje del hilo; `sender` (customer/agent/system), `status` (received/sent/read/failed), adjuntos JSON. |
| `InboxParticipant` | Colaborador que participa en la conversación. |
| `InboxTag` / `InboxConversationTag` | Etiquetas de la tienda y su relación N:M con conversaciones. |
| `InboxNote` | Notas internas del negocio sobre la conversación. |
| `InboxAiSummary` | Análisis IA persistido por tipo (`summary|intent|suggestion|relevant_history`) con `source` (`ai|heuristic`). |

Relaciones añadidas en `Store`, `Customer` y `User`.

## 3. Estados, etiquetas y canales

- **Estados:** `nueva`, `pendiente`, `en_atencion`, `resuelta`, `archivada`.
- **Prioridad:** `low | medium | high`.
- **Etiquetas:** `venta`, `soporte`, `cobranza`, `consulta`, `pedido`, `reclamo`, `otro`.
- **Canales:** `whatsapp`, `instagram`, `messenger`, `webchat`, `email`, `other`.

## 4. Núcleo (`src/lib/inbox/`)

- **`conversation-types.ts`** — constantes y DTOs **puros (sin Prisma)**.
  Se importa desde los componentes cliente para no inflar el bundle del navegador.
  Incluye `buildInboxRecommendations` (recomendaciones IA deterministas).
- **`channel-manager.ts`** — enable/disable/verificar canal con `ServiceError`.
- **`conversation-service.ts`** — CRUD de conversaciones, cambio de estado/
  prioridad/pin, asignación, etiquetas, notas. Cada mutación emite un evento
  `{ domain: "inbox", type: "conversation.*" }` **y** registra auditoría
  (`createAuditEntry`, entidad `InboxConversation`).
- **`message-service.ts`** — `addMessage` (valida sender/contenido, actualiza
  estado y `lastMessageAt`, emite `conversation.message.created`) y `markRead`.
- **`conversation-context.ts`** — agrega contexto CRM del cliente: últimos
  pedidos, órdenes totales, créditos (pendiente/vencido/próximo vencimiento),
  interacciones, notas y productos favoritos.
- **`conversation-ai.ts`** — `InboxAiProvider` (interfaz) +
  `InboxConversationAiService` (caché persistida en `InboxAiSummary`, fallback)
  + `HeuristicInboxAiProvider` (implementación determinista sin LLM, con
  normalización de tildes para detección robusta).
- **`index.ts`** — barrel de la fase.

## 5. IA: solo sugerir, nunca responder

Política de la fase: el agente IA produce **material de apoyo**, el humano
edita y envía. Cuatro acciones:

| Acción | Qué devuelve | Persistido |
|---|---|---|
| `summary` | Resumen de la conversación | `InboxAiSummary` |
| `intent` | Intención detectada + sentimiento + tópicos + confianza | `InboxAiSummary` |
| `suggestion` | Borrador de respuesta (sin enviarse) | `InboxAiSummary` |
| `relevant_history` | Historial relevante según `query` | `InboxAiSummary` |

`InboxConversationAiService` intenta el proveedor real y si lanza cae al
**heurístico determinista** marcando `source: "heuristic"`, garantizando que la
UI siempre tenga algo útil sin depender de la API de IA.

El heurístico usa `INTENT_KEYWORDS`/`NEGATIVE_WORDS`/`POSITIVE_WORDS` con
`normalize()` (minúsculas + sin tildes), contando coincidencias por intención
(desempate por orden de relevancia del array) y detección de sentimiento por
proporción.

## 6. Contexto del cliente + recomendaciones

`GET /api/inbox/[id]/context` devuelve:

- Datos del cliente (nombre, teléfono, documento).
- Métricas de compra (total gastado, nº de pedidos, última compra).
- Créditos vigentes (pendiente, vencido, próximo vencimiento).
- Últimos pedidos y productos favoritos.
- Interacciones recientes y notas internas.
- **Recomendaciones IA** (`buildInboxRecommendations`) generadas solo con
  señales reales: `cobranza_vencida`, `cobranza_pendiente`, `reactivacion`,
  `venta_repetida`, `seguimiento_ultima_compra` — con tono según urgencia.

## 7. Eventos (`{ domain: "inbox" }`)

`src/lib/events/event-listeners/inbox.listener.ts` escucha:

| Evento | Se dispara cuando… |
|---|---|
| `conversation.created` | se crea la conversación |
| `conversation.updated` | se actualiza (estado/prioridad/pin/título) |
| `conversation.message.created` | llega/emite un mensaje |
| `conversation.assigned` | se delega a un colaborador |
| `conversation.completed` | se resuelve |
| `conversation.tagged` | se etiqueta |

El `domain: "inbox"` evita colisiones con el dominio `assistant` (FASE 3C).
El listener tiene **throttle por tienda (5 s)** y falla silencioso: un error en
el callback no rompe la publicación (`report.ok`). El listener de
`conversation-history` fue filtrado por dominio para ignorar eventos inbox.

## 8. Business Memory (`bm.preference.inbox.*`)

`src/lib/business-memory/inbox-preferences.ts`:

| Clave | Aprende |
|---|---|
| `bm.preference.inbox.canales` | canales usados frecuentemente (list, sin duplicados) |
| `bm.preference.inbox.etiquetas` | etiquetas aplicadas frecuentemente |
| `bm.preference.inbox.importantes` | conversaciones marcadas importantes |
| `bm.preference.inbox.orden` | orden de lista elegido explícitamente (importance LOW) |

## 9. API (`/api/inbox/**`)

Todas las rutas exigen sesión + feature `unified_chat` (`requireInboxStore` →
401 si falta). Errores de dominio mapeados por `ServiceError`
(404 no encontrado / 400 inválido / 500 fallback).

| Ruta | Métodos | Uso |
|---|---|---|
| `/api/inbox` | GET/POST | Listar (filtros status/channel/tag/search/assigned/limit) / crear |
| `/api/inbox/channels` | GET/POST | Listar canales / enable-disable |
| `/api/inbox/tags` | GET | Etiquetas de la tienda |
| `/api/inbox/[id]` | GET/PATCH | Detalle / actualizar estado, prioridad, pin, título, delegación |
| `/api/inbox/[id]/messages` | GET/POST | Mensajes / enviar mensaje |
| `/api/inbox/[id]/read` | POST | Marcar leído |
| `/api/inbox/[id]/assign` | POST | Asignar colaborador |
| `/api/inbox/[id]/tags` | GET/POST | Etiquetas de la conversación / añadir |
| `/api/inbox/[id]/tags/[tagId]` | DELETE | Quitar etiqueta |
| `/api/inbox/[id]/notes` | POST | Añadir nota interna |
| `/api/inbox/[id]/context` | GET | Contexto CRM + recomendaciones |
| `/api/inbox/[id]/ai` | GET/POST | Listar análisis / ejecutar `summary|intent|suggestion|relevant_history` |
| `/api/business-memory/inbox/preferences` | GET/POST | Preferencias aprendidas |

## 10. UI (`/dashboard/conversaciones`)

- **`inbox-client.tsx`** — grid de 3 columnas en desktop; en móvil navegación
  por pantallas (lista → hilo → contexto) con `hidden lg:block`.
- **`conversation-list.tsx`** — búsqueda debounced, chips de estado, filtros de
  canal/etiqueta, contador no leídos, formulario "Nuevo chat".
- **`conversation-thread.tsx`** — burbujas por sender, botones de IA con panel
  de resultado y "Usar como borrador", estado/prioridad, resolver, etiquetas
  con entrada, adjuntos, compositor Enter-para-enviar.
- **`customer-context.tsx`** — ficha del cliente, créditos, órdenes, favoritos,
  interacciones, notas con añadir.
- Los componentes cliente importan **solo** `@/lib/inbox/conversation-types`
  (tipos puros) vía `src/components/inbox/api.ts`.

## 11. Seguridad

- Multi-tenant estricto: todo pasa por `getCurrentStore()`.
- Feature gate `unified_chat` en UI y API (401).
- Auditoría en cada mutación (`createAuditEntry`).
- No se expone información de sesión al cliente; el API devuelve DTOs.

## 12. Próximos pasos (fuera del alcance de la fase)

1. **Conectores reales**: webhooks de WhatsApp Business / Instagram / Messenger
   → `InboxMessage` con `sender: "customer"`; envío → `sender: "agent"` con
   `status` real del proveedor.
2. **LLM real**: implementar `InboxAiProvider` con el proveedor de IA de Panitas
   (el servicio ya lo soporta con fallback).
3. **Notificaciones en vivo**: WebSocket/polling para mensajes entrantes.
4. **Plantillas de respuesta** y **macros** por etiqueta.
5. **Encuestas de satisfacción** al resolver.
