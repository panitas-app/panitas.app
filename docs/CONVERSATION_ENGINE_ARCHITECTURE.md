# Conversation Engine — Arquitectura (FASE 3C)

**Estado:** Implementado y verificado · rama `develop-v2`
**Componentes:** `src/lib/conversation/`, `src/services/conversation.service.ts`, `src/repositories/conversation.repository.ts`, API `/api/agent/chat`, `/api/conversations`.

---

## 1. Visión general

El Conversation Engine convierte el Agent Core (3A, in-memory) y el Tool System (3B)
en un **sistema conversacional persistente**: cada conversación y mensaje se guarda en
BD, el historial se reinyecta al agente en cada turno y el usuario reanuda conversaciones
desde la UI.

El agente **nunca accede a la BD**: recibe el historial vía `AgentRequest.history` y
devuelve `AgentResponse`; la persistencia la hace el engine.

```
Usuario → POST /api/agent/chat (auth + CSRF + rate limit)
        → ConversationEngine.chat(ctx, { conversationId?, message })
            ├─ ensureConversation (reutiliza o crea)      → ConversationService
            ├─ saveMessage user                            → ConversationService
            ├─ buildConversationalHistory (límites)        → src/lib/conversation/context-builder.ts
            ├─ PanitasAgent.handle (Pipeline 3A + Tools 3B)
            ├─ saveMessage assistant (+ toolCalls, metadata)
            └─ { conversationId, message, response, metadata }
```

---

## 2. Capas y responsabilidades

| Capa | Archivo | Responsabilidad |
|---|---|---|
| **Repositorio** | `src/repositories/conversation.repository.ts` | Único punto de acceso a Prisma para `Conversation`/`ConversationMessage`. **Toda query incluye `userId`+`storeId` en el `where`** (aislamiento a nivel BD). |
| **Servicio** | `src/services/conversation.service.ts` | Orquestación de negocio: crea/lista/borra conversaciones, guarda mensajes, mapea `Date`→`timestamp` ISO, emite eventos y audita. |
| **Context Builder** | `src/lib/conversation/context-builder.ts` | Limita el historial por cantidad, tamaño y antigüedad. Puerta preparada para resumen/compresión futura. |
| **Engine** | `src/lib/conversation/engine.ts` | Coordina el turno completo (persistencia + agente). |
| **Factory** | `src/lib/conversation/factory.ts` | Cablea `createDefaultAgentCore()` + `ConversationService`. |
| **API** | `src/app/api/agent/chat/route.ts`, `src/app/api/conversations/(route.ts | [id]/route.ts)` | HTTP: auth, CSRF, rate limit, validación de entrada, errores controlados. |
| **UI** | `src/components/assistant/assistant-panel.tsx` | Consumo del API con estados `sending/thinking/completed/error`, lista de conversaciones, nueva/borrar. |

---

## 3. Modelos de datos

```prisma
model Conversation {
  id        String   @id @default(cuid())
  title     String   @default("Nueva conversación")
  status    String   @default("active") // active | archived
  userId    String
  storeId   String
  negocioId String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user     User                   @relation(fields: [userId], references: [id], onDelete: Cascade)
  store    Store                  @relation(fields: [storeId], references: [id], onDelete: Cascade)
  negocio  Negocio?               @relation(fields: [negocioId], references: [id], onDelete: SetNull)
  messages ConversationMessage[]

  @@index([userId, storeId, updatedAt])
  @@index([storeId, updatedAt])
  @@index([negocioId])
  @@index([updatedAt])
}

model ConversationMessage {
  id             String   @id @default(cuid())
  conversationId String
  role           String   // user | assistant | system | tool
  content        String
  toolCalls      String?  // JSON
  metadata       String?  // JSON (provider, model, usage, estado)
  createdAt      DateTime @default(now())

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId, createdAt])
}
```

**Regla de aislamiento:**
- `Conversation` se filtra por `userId` + `storeId` (nunca por `id` a secas).
- `ConversationMessage` **no tiene `businessId`/`storeId` propios**: solo se accede vía
  `conversationId` con un filtro de relación que valida la propiedad de la conversación
  (`conversation: { userId, storeId }`). Un mensaje nunca se puede leer sin pertenecer
  a la conversación dueña.

---

## 4. Flujo de un turno (engine)

1. **Asegurar conversación** — si `conversationId` viene y pertenece al usuario, se reutiliza; si no, se crea (`ConversationService.ensureConversation`).
2. **Persistir mensaje del usuario** (`role: "user"`).
3. **Cargar historial** (todos los mensajes de la conversación) y **limitar** con `buildConversationalHistory`.
4. **Construir `AgentRequest`** con `sessionId = conversation.id`, `history` limitado, permisos del rol (`permissionsForRole`) y metadatos del negocio.
5. **`PanitasAgent.handle`** — ejecuta el pipeline 3A completo (contexto → permisos → tools → proveedor → formatter). El historial persistido se usa porque el `RequestPipeline` ahora prioriza `request.history` sobre `session.messages`.
6. **Persistir respuesta del asistente** (`role: "assistant"`, `toolCalls`, `metadata` con provider/model/usage).
7. **Devolver** `{ conversationId, message, response, metadata }`.

Si el agente falla (`response.ok === false`), la respuesta controlada del formatter también se persiste y el metadata refleja `status: "error"`.

---

## 5. Reutilización de 3A/3B (sin duplicar IA)

| Componente | Origen | Uso |
|---|---|---|
| `PanitasAgent.handle` | 3A | Motor del turno |
| `RequestPipeline` | 3A | Orquestación (Context → Permissions → Tools → Provider → Format) |
| `ContextBuilder` | 3A | Construcción del prompt base (con tools disponibles y resultados) |
| `ToolResolver` + Tool System 3B | 3A/3B | Ejecución segura de herramientas con permisos/aislamiento/logging |
| `permissionsForRole` | 1C | Permisos por rol para `AgentRequest.permissions` |
| `createDefaultAgentCore` | 3A | Wiring del proveedor OpenRouter |

**Cambio mínimo a 3A:** `RequestPipeline.run` usa `request.history` cuando se provee
(en vez de solo `session.messages`). Es retrocompatible: los llamadores que no pasan
`history` siguen usando la sesión en memoria. Tests 3A intactos (213/213).

---

## 6. Seguridad

- **Aislamiento por negocio/usuario** en repositorio y servicio (ver §3).
- **La API nunca acepta `storeId`/`userId`/`negocioId` del cliente**: se resuelven desde
  la sesión (`getCurrentStore` / `requireRole`).
- **CSRF** (`csrfGuard`) en mutaciones y **rate limit** (`agent-chat`, 30 req/min).
- **Errores controlados**: los mensajes de error mostrados al usuario son controlados
  (`ServiceError`, plan pendiente, sin permisos); los internos quedan en logs/auditoría.

---

## 7. Streaming (preparado, no activo)

El contrato del turno ya separa `message` (persistido) de `response` (resultado del agente)
y `metadata` (estado), lo que permite migrar a SSE sin cambiar el modelo de datos:

```
POST /api/agent/chat (futuro, Accept: text/event-stream)
event: turn_start      data: { conversationId }
event: tool_executing  data: { tool: "inventory.check_stock" }
event: progress        data: { messageId, partial }
event: complete        data: { reply, toolCalls, usage }
event: error           data: { message }
```

Hoy el endpoint devuelve JSON completo (streaming opcional de OpenRouter: `stream: false`).

---

*Ver también: `docs/CONTEXT_MANAGEMENT.md`, `docs/CHAT_API_REFERENCE.md`, `docs/PHASE_3C_REPORT.md`.*
