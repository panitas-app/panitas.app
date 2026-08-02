# Gestión de Contexto Conversacional (FASE 3C)

**Estado:** Implementado · `src/lib/conversation/context-builder.ts`

---

## 1. Objetivo

Mantener el contexto que se envía al modelo acotado y predecible: cada turno reinyecta
el historial **persistido** de la conversación, pero limitado por tres criterios, de modo
que el costo de tokens no crezca sin límite y la calidad no se degrade con conversaciones
muy largas.

## 2. Criterios de límite

| Criterio | Constante | Valor por defecto | Efecto |
|---|---|---|---|
| Cantidad | `maxMessages` | 30 | Solo los últimos 30 mensajes entran al prompt. |
| Tamaño | `maxChars` | 8000 | Se corta desde el más antiguo hasta caber en ~8k caracteres. |
| Antigüedad | `maxAgeDays` | 30 | Mensajes más viejos de 30 días se descartan. |

Regla especial: **siempre se conserva el mensaje más reciente**, aunque supere el límite
de caracteres (nunca se devuelve un contexto vacío).

```ts
buildConversationalHistory(messages, { maxMessages: 10, maxChars: 2000, maxAgeDays: 7 })
```

## 3. Dónde se aplica

En `ConversationEngine.chat`:

```
getHistory(conversationId) → buildConversationalHistory(...) → AgentRequest.history → RequestPipeline (3A)
```

El `RequestPipeline` prioriza `request.history` sobre `session.messages`, de modo que el
historial persistido y limitado es el que ve el modelo.

## 4. Preparado para compresión/resumen (fase futura)

Este es el único punto de entrada del historial al agente. Una futura fase de memoria
(resúmenes, compresión, extracción de hechos) puede:

1. Reemplazar segmentos antiguos por un resumen generado (`role: "system"` o mensaje de resumen).
2. Insertar ese resumen antes de los mensajes recientes en `buildConversationalHistory`.
3. Sin tocar el pipeline, el engine ni la API.

La arquitectura ya separa: persistencia (mensajes crudos en BD) vs contexto (vista
limitada/procesada). Nunca se modifican los mensajes persistidos al acortar el contexto.

## 5. Costo por turno (referencia)

- Sistema: prompt base (~0.3k tokens) + herramientas disponibles (~1-2k) + resultados de tools.
- Historial: ≤ ~2-3k tokens con los límites por defecto.
- Respuesta: `maxTokens` del modelo de chat (1000 por defecto).
