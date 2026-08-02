# PHASE 3C — Auditoría del Conversation Engine

**Estado:** Auditoría completada · fecha de corte: 02/08/2026
**Objetivo:** Determinar qué existe, qué falta y qué se reutiliza para construir el sistema conversacional persistente (FASE 3C) sobre el Agent Core (3A) y el Tool System (3B).

---

## 1. Resumen ejecutivo

El **Agent Core 3A** ya implementa el ciclo completo de conversación *en memoria*: `PanitasAgent.handle` recibe un `AgentRequest`, asegura una sesión (`SessionManager` con `InMemorySessionStore`), ejecuta el `RequestPipeline` y devuelve un `AgentResponse` normalizado. El **Tool System 3B** ya aporta la ejecución segura de herramientas con permisos, validación, aislamiento por negocio y logging.

**Lo que falta para 3C es persistencia y coordinación de negocio:**

| Área | Estado 3A/3B | Necesidad 3C |
|---|---|---|
| Ciclo de conversación (pipeline) | ✅ `RequestPipeline` | Reutilizar tal cual |
| Ejecución de herramientas | ✅ `ToolResolver` + Tool System 3B | Reutilizar tal cual |
| Sesiones | ⚠️ `InMemorySessionStore` | Persistencia en BD (modelos `Conversation`/`Message`) |
| Contexto del agente | ⚠️ `ContextBuilder.buildBase` (historial completo) | Context Builder conversacional con límites (cantidad/tamaño/antigüedad) |
| Almacenamiento de mensajes | ❌ Ninguno | Modelos Prisma + repositorio + servicio |
| API pública | ❌ No existe `/api/agent/*` | `POST /api/agent/chat` + CRUD conversaciones |
| UI | ⚠️ Panel visual con estado `COMING_SOON` y mensajes locales | Conectar a la API con estados reales |
| Streaming | ❌ `stream: false` | Preparar contrato (token streaming / progress events) manteniendo respuesta completa inicial |

---

## 2. Lo que existe y se REUTILIZA (sin tocar)

### 2.1 Agent Core (`src/lib/agent-core/`)

| Archivo | Qué aporta | Uso en 3C |
|---|---|---|
| `types.ts` | `AgentRequest`, `AgentResponse`, `Message`, `AgentSession`, `ToolDescriptor`, `Conversation` | Contratos de entrada/salida |
| `agent-core.ts` | `PanitasAgent.handle(request)` → `ensureSession` → `pipeline.run` → `appendMessage` | Motor principal del chat |
| `pipeline.ts` | `RequestPipeline.run` (Context → Permissions → Tools → Provider → Format) | Orquestación del turno |
| `context-builder.ts` | `buildBase` + `withToolResults` (system prompt con tools y resultados) | Base del prompt |
| `tool-resolver.ts` | Detecta y ejecuta la tool del mensaje usando el registry + permisos | Ejecución de herramientas |
| `permission-checker.ts` | `checkRequest` (acceso al asistente) y verificación por tool | Control de acceso |
| `response-formatter.ts` | Normaliza la respuesta del proveedor (nunca raw) | Respuestas seguras al usuario |
| `session-manager.ts` | `SessionManager` + `SessionStore` (interfaz swapable) | **Base para persistencia** |
| `factory.ts` | `createDefaultAgentCore()` cablea config + router + providers | Punto único de wiring |
| `config.ts` | `loadAgentConfig()` (env, modelo free por defecto) | Configuración |
| `audit-logger.ts` | `AgentAuditLogger` (audita eventos del agente) | Telemetría |
| `metrics.ts` | `ProviderMetrics` (uso de tokens por proveedor) | Métricas |
| `providers/*` | `AIProviderManager` + `OpenRouterProvider` (`stream:false`) | Conector LLM |

**Decisión:** el Conversation Engine 3C **no crea** una nueva capa de IA. Reutiliza `createDefaultAgentCore()` o inyecta un `PanitasAgent` configurado.

### 2.2 Tool System (`src/lib/agent/tools/`)

- Registry 3B (`toolRegistry`/`buildToolRegistry`) con 24 tools de dominio + barrel `index.ts` que además re-exporta `availableTools` (1C, 20 tools planas).
- `ToolExecutor` aplica permisos por rol (admin/manager/assistant/seller), aislamiento `storeId`/`businessId` y logging `agent.tool.*` vía `createAuditEntry`.
- **Decisión:** el pipeline 3A ya enruta tools 1C por el `tool-resolver`; para 3C no se cambia. La herramienta ejecutada en el turno se registra en el mensaje persistido como `toolCalls`.

### 2.3 Auth, permisos y utilidades de la app

| Utilidad | Ruta | Uso en 3C |
|---|---|---|
| `getCurrentStore()` / `requireRole()` | `src/lib/permissions.ts` | Resolver `store.id`, `userId`, `role`, `plan` del usuario autenticado |
| `csrfGuard` | `src/lib/csrf.ts` | Protección CSRF en mutaciones |
| `rateLimit` | `src/lib/rate-limit.ts` | Rate limit en `/api/agent/chat` |
| `createAuditEntry` | `src/lib/audit.ts` | Logging de eventos de conversación |
| `serviceError` / `isServiceError` | `src/services/errors.ts` | Errores controlados (nunca internos al usuario) |
| `toServiceResponse` | `src/services/http.ts` | Respuesta HTTP normalizada |
| `eventService` | `src/events/event.service.ts` | Eventos `conversation.created`, `message.created`, etc. |
| Patrón repositorio+servicio | `src/repositories/*` + `src/services/*` | **Regla de oro:** agent/tools nunca tocan Prisma directo; todo vía repositorio |

---

## 3. Lo que FALTA (construir en 3C)

1. **Modelos Prisma** `Conversation` y `Message` (o `ConversationMessage`) con:
   - `Conversation`: `id`, `businessId`, `userId`, `storeId`, `title?`, `status`, timestamps.
   - `Message`: `id`, `conversationId`, `role`, `content`, `toolCalls` (JSON), timestamps.
   - Índices de aislamiento: `@@unique([businessId, id])` o `@@index([userId, businessId])`, `@@index([conversationId, createdAt])`.
   - **Importante:** `Message` NO debe tener `businessId` propio para que solo se acceda vía `conversationId` validado contra la conversación dueña.

2. **Repositorio conversacional** `src/repositories/conversation.repository.ts`:
   - `create`, `findById(scope)`, `listByUser(scope, pagination)`, `listMessages`, `saveMessage`, `touch`, `delete`.
   - **Todas las queries llevan `userId`+`businessId` (o `storeId`) en el `where`** → aislamiento garantizado a nivel BD.

3. **`ConversationService`** `src/services/conversation.service.ts`:
   - `createConversation`, `getConversation`, `list`, `getHistory`, `saveMessage`, `deleteConversation`.
   - Emite eventos (`conversation.created`, `message.created`, `conversation.deleted`) y audita vía `createAuditEntry`.
   - Mapea `Message` persistido ↔ `Message` de `agent-core/types.ts`.

4. **SessionManager persistente** (`PrismaSessionStore`):
   - Implementa `SessionStore` (3A) sobre el repositorio conversacional → las sesiones 3A pasan a ser conversaciones persistentes.
   - `getOrCreateSession` reutiliza o crea la conversación para el usuario+tienda.

5. **Context Builder conversacional**:
   - Nuevo builder (o opciones en el 3A) que limite el historial por **cantidad**, **tamaño** (chars) y **antigüedad** antes de construir `PipelineMessage[]`.
   - Prepara el terreno para resumen/compresión en fases futuras (sin implementarlo).

6. **Conversation Engine** `src/lib/conversation/engine.ts`:
   - Pasos por turno: (1) validar/crear conversación → (2) guardar mensaje del usuario → (3) construir contexto limitado → (4) `PanitasAgent.handle` → (5) guardar respuesta como mensaje assistant (+toolCalls) → (6) devolver `{ conversationId, message, response, metadata }`.
   - Errores controlados: si el proveedor falla, el turno devuelve error al usuario **sin** exponer detalles internos y guarda el fallo en el mensaje (opcional).

7. **API**:
   - `POST /api/agent/chat` — body `{ conversationId?, message }` → auth + CSRF + rate limit → `{ conversationId, message, response, metadata }`.
   - `GET /api/conversations` — listar conversaciones del usuario (paginado).
   - `GET /api/conversations/[id]` — historial de mensajes.
   - `DELETE /api/conversations/[id]` — borrar conversación (solo dueña).
   - *Preparación streaming:* contrato para SSE con `message_id` y eventos `thinking/tool/progress/complete/error` aunque v1 responda completo.

8. **UI** (`src/components/assistant/assistant-panel.tsx`):
   - Estados por mensaje: `sending`, `thinking`, `executing-tool`, `completed`, `error`.
   - Persistencia de conversaciones listadas; "Nueva conversación".
   - Borrar conversación con confirmación.

9. **Tests** `tests/conversation/`:
   - Repositorio (con mocks), servicio (con repos mockeados), engine (con agente mockeado), contexto limitado, aislamiento de usuario, API route (con auth mockeada).
   - Patrón válido ya probado: `tests/services/agent-tools.test.ts` mockea `@/lib/agent/audit`.

---

## 4. Riesgos y decisiones

| Riesgo | Mitigación |
|---|---|
| **No existe `/api/agent/chat`** — hay que crear directorio nuevo | Seguir el patrón de `src/app/api/orders/route.ts` (auth + CSRF + rate limit + `toServiceResponse`) |
| **SessionManager 3A es in-memory** — se pierde contexto al reiniciar servidor | Implementar `PrismaSessionStore` que respalde la interfaz `SessionStore` (no romper tests 3A existentes) |
| **Modelo en memoria vs BD** — `Message` 3A tiene `timestamp: string`; Prisma devuelve `Date` | Mapear en el servicio (`toISOString`) para mantener el contrato 3A |
| **`prisma migrate` está bloqueado** por `safe-prisma.js` | Usar **`npm run db:push`** (única vía permitida; hace backup previo) |
| **Aislamiento** | Todo `where` del repositorio incluye `userId`+`businessId` (o `storeId`); la API nunca acepta `businessId` del cliente |
| **Tokens/conversación larga** | Context Builder limita historial (cantidad/tamaño/antigüedad) antes de llamar al proveedor |
| **Rol/permisos** | `requireRole(["admin","manager","assistant","seller"])` en la API; el pipeline 3A ya verifica permisos por tool |
| **Ruptura de tests 3A** | No modificar contratos existentes; añadir opciones nuevas opcionales |

---

## 5. Decisión de arquitectura

```
Usuario → POST /api/agent/chat (auth+csrf+rate limit)
        → ConversationService (aislamiento, eventos, auditoría)
        → ConversationEngine
            ├─ guardar mensaje usuario (Message persistido)
            ├─ ContextBuilder conversacional (historial limitado)
            ├─ PanitasAgent.handle (Pipeline 3A + Tool System 3B)
            ├─ guardar respuesta assistant (+ toolCalls)
            └─ devolver { conversationId, message, response, metadata }
```

- El **agent nunca accede a Prisma**: recibe historial vía `AgentRequest.history` y devuelve respuesta; la persistencia la hace el engine.
- La **API resuelve `storeId`/`businessId` desde la sesión** (`getCurrentStore`), nunca desde el body.
- **Errores al usuario**: mensaje controlado en español; errores internos solo en logs/auditoría.

---

*Documento de auditoría — siguiente paso: definir modelos Prisma y ejecutar `npm run db:push`.*
