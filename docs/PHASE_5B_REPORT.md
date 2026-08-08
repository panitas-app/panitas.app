# FASE 5B — Experiencia Conversacional — Reporte

## Resumen ejecutivo

Se rediseñó por completo la experiencia conversacional de Panitas para que el
usuario solo interactúe con un **gerente virtual en lenguaje natural**: nunca ve
JSON, llamadas a herramientas, prompts, proveedores ni errores técnicos. El chat
adopta una **sensación ChatGPT**: el asistente responde sin burbuja en markdown
enriquecido, el usuario usa burbujas pequeñas, el input permite adjuntar
archivos y grabar audio, y los estados de espera son contextuales en lugar de un
spinner genérico.

**Verificación:** `tsc --noEmit` OK · 460 tests verdes (18 nuevos) · lint limpio
en todos los archivos tocados · `next build` OK (solo warning pre-existente de
Edge https en `src/lib/bcv/fetcher.ts`).

## Qué se implementó

### 1. Capa de saneamiento de respuestas (nueva librería `src/lib/conversational/`)
- `sanitize.ts`: `sanitizeAssistantReply()` elimina bloques JSON (anidados),
  tool names (`dominio.accion`), referencias a `openrouter`, modelos, prompts y
  errores técnicos; `hasLeaks()` detecta cualquier residuo interno.
- `errors.ts`: `humanizeError()` traduce errores técnicos, de red, timeout y
  rate-limit a mensajes naturales en español; conserva mensajes ya amigables.
- `thinking.ts`: `inferThinkingLabel()` genera estados contextuales
  ("Creando producto...", "Consultando inventario...", "Analizando tu
  negocio...") según el último mensaje del usuario.
- `client-view.ts`: `toClientChatView()` es la vista segura que devuelve la API:
  solo `conversationId`, `message`, `response.{ok,reply}` y `metadata`. Se
  descartan `provider`, `model`, `toolCalls`, `trace` y `tool` de las
  confirmaciones.

### 2. Eliminación de fugas
- **API `POST /api/agent/chat`**: ya no devuelve el resultado interno del
  engine; responde con `toClientChatView(result)`. Los errores del catch se
  humanizan (antes se exponía `error.message` crudo vía `toServiceResponse`).
- **Confirmaciones**: `ConfirmationCard` ya no muestra el badge mono con el tool
  name; `confirmation-system.ts` describe cada acción en lenguaje natural
  ("Reducir el stock en N unidades", "Marcar el pedido como cancelado") y el
  fallback genérico dejó de interpolar el nombre de la herramienta.
- **Fallback determinista**: `ResponseSynthesizer.buildFallbackReply()` genera
  texto natural sin tool names y describe resultados amigables ("Ventas: 1200",
  "No se encontraron resultados para tu consulta.").
- **Cliente**: el hook re-sanea contenido e historial y humaniza errores de red.

### 3. UI estilo ChatGPT
- `ChatMessage`: usuario en burbuja pequeña (`max-w-[90%] md:max-w-[70%]
  lg:max-w-[45%]`, a la derecha); asistente en texto libre sin burbuja.
- `ChatMarkdown`: markdown enriquecido (react-markdown + remark-gfm): títulos,
  listas, tablas, negritas.
- `ChatThinking`: estado contextual animado, nunca spinner genérico.
- `ChatInput`: contenedor redondeado, textarea auto-ajustable, botón adjuntar
  (imágenes/audio/PDF), drag & drop, grabación de audio con micrófono y paleta
  de comandos `/` (solo chat a pantalla completa). Placeholder:
  **"Pregúntale cualquier cosa a Panitas..."**.
- `AttachmentPreview`: previsualización de archivos adjuntos (imágenes en
  miniatura).
- Placeholders actualizados en `assistant-hero.tsx` y `ask-panitas.tsx`.

### 4. Pruebas
- `tests/conversational/conversational-experience.test.ts` (18 tests):
  saneamiento de JSON/tools/providers, detección de fugas, estados contextuales,
  humanización de errores y vista cliente.
- Tests actualizados para el nuevo contrato: `response-synthesizer.test.ts`,
  `intelligence-layer.test.ts`, `confirmation-system.test.ts` y
  `chat-gate.test.ts` (la API ya no expone `provider`/`model`/`toolCalls`).

## Criterios de finalización
- [x] El usuario nunca ve código interno (JSON, tools, prompts, proveedores).
- [x] Respuestas 100 % en lenguaje natural, con tarjetas para acciones
      importantes (confirmación, resumen de negocio).
- [x] Sensación ChatGPT: sin burbujas del asistente, burbujas pequeñas de
      usuario (45/70/90 %), input con adjuntos y estados contextuales.
- [x] Errores naturales, nunca técnicos.

## Limitaciones conocidas
- Los adjuntos se seleccionan y previsualizan en el cliente, pero no se envían a
  un backend (no existe endpoint de upload). El estado `attachments` del hook
  queda preparado para una fase futura.
- La paleta de comandos `/` vive solo en el chat a pantalla completa; la vista
  del panel usa sugerencias.
