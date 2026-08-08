# Memoria Conversacional — Arquitectura (FASE 5C)

## Objetivo

Que el asistente recuerde **qué se estaba haciendo** en cada conversación (intención,
entidad activa, datos ya conocidos y datos pendientes) y resuma **qué se ha hecho**,
sin enviar el historial completo al LLM ni duplicar la memoria de largo plazo de la
FASE 3D. Cada negocio y usuario solo ve sus propias conversaciones.

## Principio de diseño

- **Optimización por contrato**: al LLM solo llega un fragmento compacto
  (≤ 1200 caracteres) con tema, intención, entidad, datos y estado. El historial
  completo sigue controlado por `buildConversationalHistory` (FASE 3C), no por 5C.
- **Determinista y sin LLM**: títulos, dominios, entidades, referencias, resúmenes y
  cambios de tema se resuelven con reglas puras. Sin costos, sin latencia, sin
  alucinación. Un LLM ya cubre el razonamiento por turno (FASE 4A).
- **Best-effort**: la memoria nunca rompe el turno de chat. Si `completeTurn` o
  `prepareTurn` fallan, se registra y la conversación continúa normal.
- **Aislamiento por tenant**: toda operación pasa por `ConversationStorage` →
  `ConversationService` → repositorio, que fuerza `userId` + `storeId` en BD.

## Módulos (`src/lib/conversations/`)

| Módulo | Responsabilidad | I/O |
|---|---|---|
| `conversation-types.ts` | Contratos (contexto, resumen, sesión, turno, lifecycle) | — |
| `conversation-context.ts` | Motor puro: dominio, entidad, parámetros, referencias, cambio de tema | — |
| `conversation-summary.ts` | Resumen estructurado (temas, hechos, resultados) con límites | — |
| `conversation-memory.ts` | Compresión contexto+resumen → texto para el LLM | — |
| `conversation-storage.ts` | Fachada de persistencia sobre `ConversationService` | Prisma |
| `conversation-search.ts` | Búsqueda por título/contenido/fecha | Prisma |
| `conversation-session.ts` | Crear/restaurar/renombrar/eliminar/listar sesiones | storage |
| `conversation-manager.ts` | Orquestador: `prepareTurn`, `completeTurn`, `autoTitle`, sesiones | storage |
| `index.ts` | Barrel | — |

## Estado persistido

Dos columnas nuevas en `Conversation` (`prisma/schema.prisma`), JSON serializado
(`String?`), mismas reglas que `BusinessMemory.value` — no `Json` type:

- **`contextState`** — memoria corta del turno:
  `intent`, `action`, `domain`, `topic`, `activeEntity`, `knownParams`,
  `pendingParams`, `status` (`active|awaiting_details|ready`), `turns`, `updatedAt`,
  `lastTopicChangeAt`.
- **`summary`** — memoria de trabajo:
  `topics[]` (nombre, menciones, último uso), `keyFacts[]` (≤ 12), `outcomes[]` (≤ 8),
  `messageCount`, `updatedAt`.

## Ciclo de vida del contexto

El contexto se **reinicia** cuando:

1. Se **ejecuta la acción** (`confirmed` o hay `toolNames`): se limpian pendientes.
2. Cambia el **tema**: `detectTopicChange` detecta un dominio nuevo sin referencias.
3. Hay **inactividad** > 30 min (`ContextLifecycleOptions.inactivityMs`).
4. El usuario inicia una **conversación nueva**.

## Referencias contextuales resueltas

| Patrón | Ejemplo | Resultado |
|---|---|---|
| Demostrativo + entidad activa | "Ponle 15 unidades" | "al producto X ponle 15 unidades" |
| Reemplazo | "Cámbialo por Botas" | entidad activa → "Botas" |
| Completar pendiente | "la descripción es materiales" | llena `descripcion`, quita pendiente |
| Acotar consulta | "solo las de ayer" | `fecha=ayer` sin cambiar tema |
| Orden | "ordénalos por fecha" | `orden=fecha` sin cambiar tema |
| Continuación | "ahora", "también", "eso mismo" | mantiene el tema |

## Flujo en `engine.ts`

1. `ensureConversation` → `autoTitle` si es el primer mensaje (`messageCount === 0`).
2. `prepareTurn(conversationId, message)`: resuelve referencias, detecta cambio de
   tema/inactividad, construye la memoria optimizada y la antepone al contexto.
   `request.message = resolvedMessage`.
3. Agente (Agent Core + Intelligence Layer + memoria 3D) genera la respuesta.
4. `finalize` → `completeTurn` en los 3 retornos (confirmación requerida,
   fallback determinista, retorno normal) con `confirmed = Boolean(confirmedStepIds)`.

La FASE 3D (`MemoryManager`) sigue intacta: guarda memorias de largo plazo por
entidad. 5C no la reemplaza, la complementa.

## Límites configurables

```
inactivityMs: 30 * 60 * 1000   // contexto caduca por inactividad
maxKeyFacts: 12                // hechos del resumen
maxOutcomes: 8                 // acciones ejecutadas
maxTopics: 10                  // temas registrados
maxChars (memoria LLM): 1200   // fragmento optimizado
```

## Regla de seguridad

La API nunca expone `contextState`/`summary` crudos: la búsqueda devuelve un
`snippet` del primer mensaje y el estado de sesión se sirve ya estructurado al
cliente interno. El contrato 5B (`conversationId`, `message`, `response`, 
`metadata`, `confirmation`) no cambia.

## Tests

- `tests/conversations/conversation-context.test.ts` (29) — dominio, entidad,
  parámetros, referencias, cambio de tema, ciclo de vida.
- `tests/conversations/conversation-summary.test.ts` (7) — resumen, límites,
  `buildInitialSummary`.
- `tests/conversations/conversation-memory.test.ts` (7) — formato compacto, nunca
  historial crudo.
- `tests/conversations/conversation-session.test.ts` (9) — sesiones y aislamiento
  por negocio.
- `tests/conversations/conversation-manager.test.ts` (10) — turnos, títulos,
  búsqueda, eliminación.
