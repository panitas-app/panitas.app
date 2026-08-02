# SESSION_SYSTEM — Sistema de sesiones y conversación (FASE 3A)

## 1. Propósito

Contenedor básico de conversación entre usuario y agente, desacoplado del almacenamiento. **No es memoria inteligente** (eso es fases futuras): guarda mensajes, metadatos y estado.

## 2. Modelo de datos (`AgentSession`)

```
id, userId, storeId, negocioId, plan, status (active|closed),
messages: Message[], metadata, createdAt, updatedAt
```

`Message` = `{ id, role (user|assistant|system|tool), content, timestamp, toolCalls? }`.

## 3. Almacenamiento (`SessionStore`)

Interfaz inyectable: `create`, `get`, `update`, `listByUser`, `delete`, `clear`.

- `InMemorySessionStore` (default): Map in-process, sin persistencia.
- Futuro: store en BD (Prisma) que implemente la misma interfaz sin tocar el manager.

## 4. `SessionManager` — API

| Método | Comportamiento |
|---|---|
| `createSession(input)` | Nueva sesión activa con ids/fechas |
| `getSession(id)` | Lectura |
| `getOrCreateSession(sessionId, input)` | Reutiliza si existe y **pertenece al mismo usuario+tienda**; si no, crea otra |
| `appendMessage(sessionId, {role, content, toolCalls?})` | Agrega mensaje con id y timestamp |
| `closeSession(id)` | Estado `closed` |
| `getHistory(id)` | Mensajes de la sesión |
| `listSessions(userId)` | Sesiones por usuario |
| `deleteSession(id)` | Borra |
| `toConversation(session)` | Expone `Conversation { id, createdAt, updatedAt, messages, metadata }` |

## 5. Uso en el Agent Core

`PanitasAgent.ensureSession` usa `getOrCreateSession(request.sessionId, { userId, storeId, negocioId, plan, metadata })`. Al procesar un `handle`:
1. Se garantiza una sesión (reutiliza la del request si corresponde).
2. Se persisten el mensaje del usuario y la respuesta del asistente (con sus `toolCalls`).

Esto hace que **cada conversación sea reanudable** pasando `sessionId` en el siguiente request.

## 6. Seguridad

`getOrCreateSession` valida que la sesión solicitada pertenezca al `userId` + `storeId` del request; si no, crea una nueva (evita acceder a conversaciones ajenas).

## 7. Próximos pasos

- Persistencia en BD (interfaz `SessionStore` ya lista).
- Resumen/compactación de historial largo (hook del Context Builder).
- Memoria long-term conectada (interfaces FASE 1C ya disponibles en `@/lib/agent/memory`).
