# FASE 4C — Panitas Main Assistant Interface · Reporte

## Resumen ejecutivo

Se construyó la **interfaz principal del asistente IA** sobre el stack de chat
existente (FASE 3C/4A/4B). Dos superficies comparten una sola lógica de chat:

1. **Sheet mejorado** (flotante, disponible en todo el dashboard) — ahora con
   prefill desde "Pregúntale a Panitas…", tarjetas de confirmación de acciones
   destructivas y resumen de negocio inline (4B).
2. **Página dedicada `/dashboard/assistant`** — chat a ancho completo con
   historial + **monitor de negocio 4B lateral** siempre visible en escritorio.

Además se **completó el flujo de confirmación** de FASE 4A en la API: el
endpoint de chat acepta `confirmedStepIds` y expone `confirmation.actions`, que
era el eslabón faltante para que la UI pudiera confirmar o cancelar acciones
destructivas sin texto libre.

**Verificación:** lint limpio en archivos nuevos/4C · `tsc --noEmit` OK ·
**371 tests verdes** (368 preexistentes + **3 nuevos 4C**) · `next build` OK
(219 páginas; solo warning Edge preexistente de `bcv/fetcher.ts`).

## Qué se implementó

| Módulo | Archivo | Responsabilidad |
|--------|---------|-----------------|
| Hook compartido | `src/hooks/use-assistant-chat.ts` | Estado de chat: mensajes (text/confirmation/summary), conversaciones, confirmación pendiente, resumen de negocio, envío con `confirmedStepIds` |
| Tarjeta de confirmación | `src/components/assistant/assistant-confirmation.tsx` | Renderiza `confirmation.actions` (descripción, impacto, tool) + Confirmar/Cancelar |
| Vista de chat | `src/components/assistant/assistant-chat-view.tsx` | Burbujas, tarjetas de confirmación, resumen 4B, sugerencias (incluye "¿Cómo está mi negocio?"), compositor |
| Sheet mejorado | `src/components/assistant/assistant-panel.tsx` | Header (Nueva/Borrar/pills) + `AssistantChatView` + consumo de prefill al abrir |
| Prefill | `src/components/assistant/assistant-provider.tsx` | `openAssistant(message?)` + `prefill`/`consumePrefill` |
| Página dedicada | `src/app/dashboard/assistant/page.tsx` | Chat a ancho completo + monitor 4B lateral (solo desktop) |
| Monitor lateral | `src/components/assistant/business-monitor-panel.tsx` | Consume `GET /api/agent/business-summary`, reutiliza `BusinessSummaryView` |
| Ocultar chrome | `src/components/assistant/assistant-dashboard-chrome.tsx` | Oculta FAB/Sheet en `/dashboard/assistant` (`usePathname`) |
| Engine | `src/lib/conversation/engine.ts` | `ChatTurnResult.confirmation?: ConfirmationRequest` en `confirmation_required` |
| Route | `src/app/api/agent/chat/route.ts` | Acepta `confirmedStepIds` (filtra no-string, máx. 10) y lo reenvía |
| Nav | `src/components/dashboard/sidebar.tsx` | Ítem "Asistente IA" (grupo Panitas IA) |

## Flujo de confirmación (antes → después)

**Antes (4A)**: el engine y la Intelligence Layer ya soportaban `confirmedStepIds`
y producían `ConfirmationRequest`, pero `POST /api/agent/chat` no leía
`confirmedStepIds` ni exponía las `actions` → el cliente no podía completar la
segunda vuelta (solo texto libre "confirmar").

**Después (4C)**:

1. El usuario pide una acción destructiva → la capa 4A responde
   `confirmation_required` (sin LLM) y el engine incluye
   `confirmation.actions` (stepId, tool, description, impact) en la respuesta.
2. La UI renderiza una **tarjeta de confirmación** por acción.
3. **Confirmar** → reenvía el mismo `message` con `confirmedStepIds` (los
   `stepId` aprobados). `ConfirmationSystem.isFullyConfirmed` exige TODOS los
   pasos requeridos; los no confirmados jamás se ejecutan.
4. **Cancelar** → descarta la tarjeta; no se envía nada y no hay cambios.

Reglas aplicables hoy: `products.delete`, `orders.updateStatus` (cancelled),
`inventory.updateStock` (decrease/adjustment) — `ConfirmationSystem`.

## Prefill ("Pregúntale a Panitas…")

`AskPanitas` (ControlCenter) enviaba `openAssistant()` y descartaba el texto.
Ahora `openAssistant(value)` guarda un prefill que el Sheet consume al abrirse:
el mensaje tipeado se envía automáticamente. Si se cierra sin consumir, el
prefill se limpia (nunca se auto-envía una conversación posterior).

## Superficies y consistencia

- **Sheet** (toda página del dashboard): misma `AssistantChatView`; ideal para
  preguntas rápidas sin salir del contexto.
- **Página `/dashboard/assistant`**: chat grande + monitor 4B lateral (≥ `lg`);
  en móvil el monitor queda disponible vía la sugerencia "¿Cómo está mi negocio?"
  (resumen inline en el chat). FAB/Sheet se ocultan en esta ruta para evitar
  superposición.
- Un único hook por instancia: sin doble fetch de `/api/conversations`.

## Calidad

- `test(api)` `tests/features/chat-gate.test.ts` (2 nuevos): reenvío de
  `confirmedStepIds` al engine y filtrado/validación de IDs (máx. 10). Para
  evitar el cacheo del engine a nivel de módulo del route, cada test recarga el
  módulo vía `vi.resetModules()` + import dinámico.
- `test(intel)` `tests/agent-intel/conversation-intelligence.test.ts` (1 nuevo):
  el engine expone `confirmation` en `confirmation_required` y reenvía
  `confirmedStepIds` a la capa de inteligencia.
- Nota de lint: `sidebar.tsx`, `topbar.tsx` y `dashboard/layout.tsx` conservan
  errores de lint **pre-existentes** (react-hooks/refs, `any`, `<a>`); los
  archivos nuevos/modificados por 4C están lint-clean.

## Reglas de capas respetadas

- La UI **no contiene lógica de negocio**: la confirmación y el resumen vienen
  del backend; el hook solo orquesta peticiones.
- El `storeId` nunca viaja en el body: proviene de la sesión autenticada.
- Se reutilizan los componentes puros 4B (`BusinessSummaryView`) sin duplicar
  presentación.
- El gate `requireFeature(plan, "basic_ai")` y el rate limit se mantienen en la
  ruta; la página y el monitor consumen las APIs ya protegidas.

## Archivos de la fase

- Nuevos: `src/hooks/use-assistant-chat.ts`, `assistant-confirmation.tsx`,
  `assistant-chat-view.tsx`, `business-monitor-panel.tsx`,
  `assistant-dashboard-chrome.tsx`, `src/app/dashboard/assistant/page.tsx`
- Modificados: `assistant-panel.tsx`, `assistant-provider.tsx`,
  `assistant-fab.tsx`, `ask-panitas.tsx`, `topbar.tsx`, `sidebar.tsx`,
  `dashboard/layout.tsx`, `src/lib/conversation/engine.ts`,
  `src/app/api/agent/chat/route.ts`, tests, docs.
