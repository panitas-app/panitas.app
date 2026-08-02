# RESPONSE_STANDARD — Formato estándar de respuestas del Agent Core (FASE 3A)

## 1. Garantía fundamental

> **Ninguna respuesta que sale del Agent Core es la respuesta cruda de un proveedor.**

Toda respuesta pasa por `ResponseFormatter` (`response-formatter.ts`), que normaliza a `AgentResponse`.

## 2. `AgentResponse` (contrato)

```ts
interface AgentResponse {
  id: string
  sessionId: string
  userId: string
  storeId: string
  reply: string          // texto al usuario (trim)
  taskType: AgentTaskType
  provider: string
  model: string
  usage?: UsageInfo      // tokens (normalizados)
  toolCalls: ResolvedToolCall[]
  structured?: unknown   // solo en formatStructured
  ok: boolean
  error?: string
  createdAt: string
}
```

## 3. Métodos del formatter

| Método | Uso | Campos relevantes |
|---|---|---|
| `format(provider, request, opts)` | Éxito estándar | `reply` = `content.trim()`, `ok:true`, `usage` normalizado |
| `formatStructured(data, provider, request, opts)` | Salida JSON | `{...format, structured: data}` |
| `formatError(error, request, opts)` | Cualquier fallo | `ok:false`, `error`/`reply` = mensaje legible, `provider`/`model` = `"unknown"` |

`opts` = `{ sessionId, taskType, toolCalls, id?, now? }`. El id se auto-genera (`agent_<ts>_<rand>`) o se inyecta.

## 4. Reglas

- **Siempre** `ok: true|false`; nunca respuestas ambiguas.
- `toolCalls` siempre presente (array, quizá vacío): cada entrada es `ResolvedToolCall { name, input, ok, output?|error? }`.
- Los errores son mensajes legibles (`error.message` o texto conocido), nunca bodies/internals del proveedor.
- `taskType` proviene de `opts.taskType` → `request.taskType` → `"chat"`.
- El uso de tokens es opcional y se filtra (solo campos definidos).

## 5. Ejemplos

### Éxito
```json
{ "ok": true, "reply": "Hola, ¿en qué te ayudo?", "taskType": "chat",
  "provider": "openrouter", "model": "nvidia/...:free", "toolCalls": [] }
```

### Con herramienta ejecutada
```json
{ "ok": true, "reply": "...", "toolCalls": [
  { "name": "inventory.check_stock", "input": {"q":"..."}, "ok": true, "output": "{\"total\":3}" }
]}
```

### Error (proveedor caído)
```json
{ "ok": false, "reply": "El proveedor no respondió a tiempo",
  "provider": "unknown", "model": "unknown", "error": "El proveedor no respondió a tiempo" }
```

## 6. Por qué es importante

- La UI/página puede renderizar cualquier `AgentResponse` sin conocer proveedores.
- Los errores se muestran al usuario de forma segura.
- El formato habilita persistir respuestas, auditar y medir uso/costos de forma consistente.
