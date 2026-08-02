# Chat API — Referencia (FASE 3C)

**Estado:** Implementado · autenticación requerida (NextAuth) · base: `/api`

---

## 1. `POST /api/agent/chat` — Enviar un turno de chat

Envía un mensaje a Panitas IA. Crea la conversación si no existe o reutiliza la indicada.

### Request
```json
{
  "conversationId": "cm...",   // opcional; si se omite, se crea una conversación nueva
  "message": "¿Cuánto stock queda de Producto A?"
}
```

### Response `200`
```json
{
  "conversationId": "cm...",
  "message": {
    "id": "cm...",
    "role": "user",
    "content": "¿Cuánto stock queda de Producto A?",
    "timestamp": "2026-08-02T19:30:00.000Z"
  },
  "response": {
    "reply": "Quedan 12 unidades de Producto A.",
    "provider": "openrouter",
    "model": "nvidia/nemotron-3-ultra-550b-a55b:free",
    "toolCalls": [{ "name": "inventory.check_stock", "ok": true }],
    "usage": { "promptTokens": 320, "completionTokens": 40, "totalTokens": 360 },
    "ok": true
  },
  "metadata": {
    "taskType": "chat",
    "status": "completed"
  }
}
```

### Errores
| Código | Caso |
|---|---|
| `400` | `message` vacío o mayor a 4000 caracteres |
| `401` | Sin sesión |
| `403` | Sin permisos / plan pendiente de pago |
| `429` | Rate limit (30 req/min) |

### Seguridad
- `csrfGuard` obligatorio (cookie de sesión).
- `storeId`, `userId`, `negocioId`, `role` y `plan` se resuelven del usuario autenticado, **nunca del body**.
- El agente usa el historial persistido y limitado (ver `docs/CONTEXT_MANAGEMENT.md`).

---

## 2. `GET /api/conversations` — Listar conversaciones

Paginado (`page`, `limit`, opcional `status`).

```json
{
  "data": [{ "id": "cm...", "title": "Nueva conversación", "status": "active", "createdAt": "...", "updatedAt": "...", "messageCount": 2 }],
  "total": 1,
  "page": 1,
  "totalPages": 1,
  "hasMore": false
}
```

`401` sin sesión.

---

## 3. `GET /api/conversations/[id]` — Historial de una conversación

```json
{
  "conversation": { "id": "cm...", "title": "...", "status": "active", "messageCount": 2 },
  "messages": [
    { "id": "cm...", "role": "user", "content": "¿Cuánto stock?", "timestamp": "...", "toolCalls": null },
    { "id": "cm...", "role": "assistant", "content": "Quedan 12 unidades.", "timestamp": "..." }
  ]
}
```

`404` si la conversación no existe o no pertenece al usuario.

---

## 4. `DELETE /api/conversations/[id]` — Eliminar conversación

```json
{ "deleted": true }
```

`404` si no pertenece al usuario. Requiere `csrfGuard`. `401`/`403` sin permisos.

---

## 5. Streaming (futuro, contrato preparado)

Con `Accept: text/event-stream`, el turno emitirá:

```
event: turn_start      data: { conversationId }
event: tool_executing  data: { tool: "inventory.check_stock" }
event: progress        data: { messageId, partial }
event: complete        data: { reply, toolCalls, usage }
event: error           data: { message }
```

Hoy el endpoint devuelve JSON completo (respuesta única por turno).
