# Experiencia Conversacional (FASE 5B) — Guía

> Panitas es un gerente virtual. El usuario jamás debe ver JSON, llamadas a
> herramientas, prompts, proveedores, modelos ni errores técnicos.

## Principios

1. **Todo lo interno queda oculto.** El usuario habla con Panitas en lenguaje
   natural; la decisión de qué herramienta usar, su ejecución y el resultado
   ocurren detrás de escena.
2. **Respuestas en lenguaje natural.** Panitas interpreta, decide, ejecuta y
   responde como un gerente: "Listo, preparé el producto 'X' con precio Bs. Y.
   ¿Deseas guardarlo ahora?"
3. **Tarjetas visuales** para acciones importantes: producto preparado, cliente
   creado, venta registrada, pedido actualizado.
4. **Sensación ChatGPT:** el asistente no usa burbujas; el usuario usa burbujas
   pequeñas (45 % escritorio / 70 % tablet / 90 % móvil).

## Reglas de la experiencia

### Mensajes del usuario
- Única burbuja de la conversación, alineada a la derecha.
- Ancho máximo: `90%` móvil, `70%` tablet, `45%` escritorio.
- Salto de línea automático; nunca ocupa todo el ancho.

### Mensajes del asistente
- Sin burbuja, sin fondo, texto libre bajo el mensaje del usuario.
- Markdown enriquecido: títulos, listas, tablas, negritas, enlaces.
- Nunca mostrar JSON crudo, tool names, `provider`, `model`, prompts ni errores
  de sistema.

### Input estilo ChatGPT
- Placeholder: **"Pregúntale cualquier cosa a Panitas..."**
- Adjuntar imágenes, audios y PDFs (botón clip + arrastrar y soltar).
- Grabación de audio por micrófono.
- Textarea auto-ajustable, Enter para enviar, Shift+Enter para salto de línea.

### Estados contextuales (nunca un spinner genérico)
- "Pensando..."
- "Analizando tu negocio..."
- "Creando producto..."
- "Consultando inventario..."
- "Analizando tus ventas..."
- "Registrando cliente..."

### Errores
- Nunca técnicos. Siempre naturales:
  - Correcto: "No pude completar esa acción. ¿Quieres intentarlo nuevamente?"
  - Prohibido: "Tool execution failed", "timeout", stack traces, nombres de archivos.

## Arquitectura de saneamiento

Existen dos capas de protección contra fugas:

### 1. Servidor (`src/lib/conversational/`)
| Módulo | Responsabilidad |
|--------|-----------------|
| `sanitize.ts` | `sanitizeAssistantReply()` elimina bloques JSON, tool names (`dominio.accion`), nombres de providers/modelos y errores técnicos. `hasLeaks()` detecta residuos (útil en tests). |
| `errors.ts` | `humanizeError()` traduce cualquier error a un mensaje natural en español. |
| `thinking.ts` | `inferThinkingLabel()` infiere el estado contextual a partir del último mensaje del usuario. |
| `client-view.ts` | `toClientChatView()` construye la respuesta de la API solo con lo necesario: `conversationId`, `message`, `response.{ok,reply}` y `metadata`. Descarta `provider`, `model`, `toolCalls` y `trace`, y quita `tool` de las confirmaciones. |

### 2. Cliente (`src/hooks/use-assistant-chat.ts` + componentes)
- El hook vuelve a aplicar `sanitizeAssistantReply()` al contenido antes de
  mostrarlo y `humanizeError()` a cualquier error, incluso de red.
- `ChatMessage` no renderiza ningún campo interno.
- `ConfirmationCard` muestra solo descripción e impacto en lenguaje natural.

### Eliminación de tool names en confirmaciones
`DEFAULT_CONFIRMATION_RULES` en `confirmation-system.ts` describe cada acción
en lenguaje natural ("Eliminar el producto permanentemente", "Reducir el stock
en N unidades"). El `tool` interno se descarta antes de llegar al cliente.

### Respuestas deterministas
`ResponseSynthesizer.buildFallbackReply()` genera respuestas en español sin
nombres de herramientas ("No pude completar la acción. Tardé demasiado en
obtener la información.").

## Componentes

| Componente | Rol |
|------------|-----|
| `assistant-chat-view.tsx` | Vista principal de chat (página y panel). |
| `ui/animated-ai-chat.tsx` | Chat a pantalla completa del dashboard (misma experiencia). |
| `assistant/chat-message.tsx` | Render de un mensaje (burbuja usuario / texto libre asistente / tarjetas). |
| `assistant/chat-markdown.tsx` | Markdown enriquecido (react-markdown + remark-gfm). |
| `assistant/chat-thinking.tsx` | Estado contextual de "pensando". |
| `assistant/chat-input.tsx` | Input estilo ChatGPT con adjuntos, audio y paleta de comandos. |
| `assistant/attachment-preview.tsx` | Previsualización de archivos adjuntos. |
| `assistant/assistant-confirmation.tsx` | Tarjeta de confirmación (sin tool names). |

## Alcance y limitaciones conocidas
- Los adjuntos (imagen/audio/PDF) se seleccionan y previsualizan en el cliente,
  pero aún no se envían a un backend (no existe endpoint de upload). El estado
  `attachments` del hook queda listo para conectarlo en una fase futura.
- La paleta de comandos `/` (ventas, resumen, stock, recomendar) se conserva
  solo en el chat a pantalla completa.
