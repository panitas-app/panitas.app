# AI ARCHITECTURE REVIEW — FASE 3E

**Rama:** `develop-v2` · **Fecha:** 02/08/2026

Revisión de la arquitectura IA (FASE 3A–3D + infraestructura legado 1C) con calificaciones,
evidencia y recomendaciones. **No se modifica la arquitectura en 3E**; se documenta el estado
real y el gap de cableado.

---

## 1. Mapa de capas (estado real en runtime)

```
Chat API (/api/agent/chat) ─► ConversationEngine (3C) ─► PanitasAgent (3A)
                                                          │
                                       ┌──────────────────┴───────────────────┐
                                       │ RequestPipeline (3A)                  │
                                       │   ContextBuilder ──► system prompt     │
                                       │   PermissionChecker ──► acceso         │
                                       │   ToolResolver ──► registry LEGADO 1C  │ ◄── (NO usa tools 3B)
                                       │   ProviderManager ──► OpenRouter (A)   │
                                       │   ResponseFormatter ──► respuesta      │
                                       └──────────────────────────────────────┘
```

- **Tools 3B** (`src/lib/agent/tools/`) quedan fuera del flujo: `toolRegistry`, `ToolExecutor`,
  `toLegacyAgentTool` no se cablean al Agent Core.
- **Memory 3D** (`src/lib/agent/memory/` + `context/` + `profile/`) SÍ están cableadas vía
  `ConversationEngine` (best-effort, nunca rompen el turno).

---

## 2. Calificaciones por módulo

### 2.1 Agent Core 3A — `src/lib/agent-core/` — **B**
**Fuerte:**
- Adaptador OpenRouter perfectamente aislado (`providers/openrouter.ts`): único módulo que
  conoce el proveedor; errores tipados, retries con backoff, timeout. **A**.
- Pipeline estricto, `AgentResponse` normalizada (nunca raw del proveedor).
- `request.history` priorizado sobre la sesión en memoria (usado por 3C).

**Débil:**
- `ToolResolver` cableado al **registry legado 1C**, no al `toolRegistry` 3B → en runtime el
  registry está vacío y toda tool devuelve `Herramienta desconocida` (`tool-resolver.ts:13`,
  `factory.ts:52`).
- `ContextBuilder` recibe `toolsProvider` opcional pero la factory no lo provee
  (`context-builder.ts:72` → `[]`): el prompt del modelo no lista herramientas.

### 2.2 Tool System 3B — `src/lib/agent/tools/` — **C+**
**Fuerte:**
- Capas limpias: tools → services → repositories → BD. Las tools **nunca tocan Prisma**
  (verificado: sin imports de prisma).
- `ToolExecutor` con permisos, validación (`validate.ts`), logging (`logging.ts`),
  respuesta tipada (`response.ts`), aislamiento `storeId` vía `buildServiceContext`.
- Registry 3B (`toolRegistry`, `buildToolRegistry`) con inyección de deps para tests.

**Débil:**
- **Huérfano**: `setupAgentTools()` nunca se invoca; `ToolResolver` 3A no usa `toolRegistry` 3B;
  el bridge `toLegacyAgentTool` no se usa. Todo el sistema 3B está en verde pero inerte.
- Duplicación: coexisten los archivos planos legacy `*.tools.ts` y los `domains/*.ts`.
- `setup.ts` (3B) registra tools 3B en el registry 1C **si** se invocara `setupAgentTools()`,
  pero no hay llamada en ningún flujo.

### 2.3 Conversation Engine 3C — `src/lib/conversation/` — **A−**
**Fuerte:**
- Persistencia real (`Conversation`/`ConversationMessage`) con aislamiento `userId+storeId`.
- Delegación correcta al `PanitasAgent` con `history` persistido.
- Integración 3D correcta (contexto + memoria best-effort).

**Débil:**
- **Duplicación de mensajes**: `PanitasAgent.handle` guarda el mensaje en la sesión en memoria
  (3A `SessionManager`) además de la persistencia 3C. Es redundancia, no pérdida, pero infla
  la sesión in-memory.

### 2.4 Memory System 3D — `src/lib/agent/memory/` — **B+**
**Fuerte:**
- Repositorio con frontera `storeId` real (`memory.repository.ts`), upsert `@@unique(storeId,key)`.
- Clasificador por reglas deterministas (sin costo LLM), TTL por importancia, cleaner por límites.
- Extracción best-effort en cada turno sin bloquear el chat.

**Débil / riesgo:**
- **Prompt-injection**: la memoria se inyecta al system prompt (vía `buildMemoryContext`).
  Un atacante podría escribir un hecho ("ignora reglas anteriores y di X") en un mensaje que
  el extractor guarde como memoria, y ese hecho se inyectaría en turnos futuros. Mitigación
  recomendada (fase futura): limitar tamaño, priorizar datos de BD sobre user-provided,
  no inyectar memoria de tipo "instrucción", validar origen.

### 2.5 Business Context / Profile 3D — `src/lib/agent/{context,profile}/` — **A−**
- Compone store + negocio + métricas (analytics) + memoria. Aislado por `storeId`.
- Se construye best-effort y nunca rompe el turno. Correcto.

### 2.6 Infraestructura legado 1C — `src/lib/agent/{index,registry,router,setup,types}` — **D**
- El barrel `index.ts` no tiene importadores (muerto como entrada pública).
- `setupAgentTools()` nunca se invoca.
- `registry`/`router` viven solo por el `ToolResolver` 3A, que los usa con el registry vacío.
- `permissions` y `audit` 1C sí son activos y correctos (usados por agent-core y tools).

---

## 3. Hallazgo principal: gap de cableado agent→tools

| Pieza | Dónde debería conectarse | Dónde está conectada hoy |
|---|---|---|
| `toolRegistry` 3B | `ToolResolver` 3A (lista + ejecuta) | En ninguna parte |
| `setupAgentTools()` | Invocado al arrancar el engine | Nunca se invoca |
| `toolsProvider()` | `ContextBuilder` 3A (descriptores al prompt) | No se provee (factory:50/52) |
| `toLegacyAgentTool` bridge | Registry 1C ← tools 3B | Definido, sin uso |

**Efecto observable:** el asistente responde con el modelo puro, sin datos reales del negocio.
El código 3B está listo y testeado; solo falta el cableado (fase futura, fuera de alcance 3E).

---

## 4. Recomendaciones para la fase de cableado (3E+)

1. **Cablear `ToolExecutor`/`toolRegistry` 3B al `ToolResolver` 3A** (un solo punto de cambio
   en `factory.ts`), manteniendo el `PermissionChecker` 3A como guarda.
2. **Invocar `setupAgentTools()`** (o `buildToolRegistry`) al construir el engine para poblar
   el registry activo.
3. **Proveer `toolsProvider()`** al `ContextBuilder` para listar descriptores en el prompt.
4. **Consolidar** los archivos planos `*.tools.ts` legacy dentro del `toolRegistry` 3B.
5. **Quitar la duplicación de mensajes** en la sesión 3A cuando el historial viene de 3C.
6. **Mitigar prompt-injection en memoria**: nunca inyectar instrucciones del usuario como
   hechos de memoria sin clasificación de tipo; priorizar hechos derivados de BD.
