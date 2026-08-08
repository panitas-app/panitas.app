# FASE 5D — Conversational Actions Engine — Reporte

## Resumen ejecutivo

Se construyó un **motor de acciones conversacionales determinista (sin LLM)**
(`src/lib/conversational-actions/`) que detecta la intención operativa de un
mensaje, completa los parámetros faltantes en **varios turnos**, confirma solo las
acciones críticas/destructivas/masivas y ejecuta sobre las **tools 3B existentes**
y los **services 1B** (nunca tools nuevas, según spec 5D). Responde con **texto
enriquecido** (tarjetas, tablas, resúmenes) client-safe y persiste el estado del
turno vía la memoria conversacional 5C para reanudar sin reiniciar el flujo.

**Verificación:** `tsc --noEmit` OK · **590 tests verdes** (68 nuevos en 4
archivos) · `next build` OK (solo warning pre-existente de Edge https en
`src/lib/bcv/fetcher.ts`).

## Qué se implementó

### 1. Nueva capa `src/lib/conversational-actions/`
- **`types.ts`**: contratos (`ConversationalAction`, `ActionParam`, `KnownParams`,
  `RichResponse`, `ActionsTurnResult`, `ActionDeps`).
- **`detector.ts`**: `detectAction(actions, message)` con normalización NFD y
  scoring por señales; la primera señal con score gana.
- **`params.ts`**: extracción determinista (monto tras `por`, cantidad con/sin
  unidades, teléfono, items de venta, método de pago, crédito/plazo, término de
  búsqueda, período) + `missingParams` + `isShortAnswer` + `inferStockType`.
- **`catalog.ts`**: catálogo declarativo de **24 acciones** en 7 dominios +
  `getAction(id)`.
- **`executor.ts`**: ejecuta cada acción con tools 3B / services 1B →
  `ActionResultData`.
- **`engine.ts`**: máquina de estados del turno (detectar → completar → confirmar
  → ejecutar → reintentar).
- **`rich.ts`**: respuestas enriquecidas (`text | table | card | summary`).

### 2. Services/repositorios reales
- `src/repositories/expense.repository.ts` + `src/services/expense.service.ts`:
  gastos persistentes; **proveedores = gastos con campo `vendor`** (sin modelo
  Prisma nuevo, según decisión). Eventos `expense.created` / `expense.updated` en
  `AppEvents`; exports en `repositories/index.ts` y `services/index.ts`.
- Ventas ejecutadas con `OrderService.create()` directo (sin tool `sales.create`).

### 3. Integración 5D → 5C/5B
- `conversation-types.ts`: estados `awaiting_confirmation` / `awaiting_retry`,
  `actionId?`, `TurnOutcome`.
- `conversation-context.ts`: `applyTurnToContext` aplica los overrides 5D.
- `conversation/engine.ts`: bloque FASE 5D entre `finalize` y la capa de
  inteligencia; `ChatTurnResult.rich`.
- `conversation/factory.ts`: `createActionsEngine` con todos los services +
  `ToolExecutor`/`buildToolRegistry`.
- `conversational/client-view.ts`: `ClientChatView.rich` renderiza bloques
  client-safe.

### 4. Refuerzos de extracción (esta fase)
- `extractAmount` prefiere el monto tras `por` sobre el primer número; las
  cantidades salen de `extractSaleItems` (separadas por `y`/`,` con lookahead
  segura para no cortar en "a" de "acolas").
- `extractQuantity` parado en `NUMBER.source` (no captura "media docena").
- `extractPhone` acepta espacios/guiones/prefijo `+` y números de 7+ dígitos.
- `extractPaymentMethod` → `bank_transfer` para transferencia/banco/zelle.
- STOPWORDS ampliado (llamado/soy/buscar/telefono/direccion/con/de…); `extractAfter`
  usa el marcador más a la derecha.
- Categoría implícita en gastos ("gasto de transporte 5" → categoría) y vendor
  implícito en proveedores ("compre a mercantil 100").
- `refillItemValue` parsea "2 cocacolas" con `extractSaleItems`; `cleanRefill` quita
  artículos/preposiciones iniciales.
- Resolución real por `productService.list({q})` para refs inexistentes en el
  reintento (`awaiting_retry`).

## Criterios de finalización
- [x] Detección de acción sin LLM (determinista, 24 acciones).
- [x] Completado multi-turno sin reiniciar flujo (`awaiting_details`).
- [x] Confirmación solo para acciones críticas/destructivas/masivas
      (`destructive`, `critical`, `bulk`; `confirmationWhen` dinámico).
- [x] Ejecución vía tools 3B existentes + services 1B directos; sin tools nuevas.
- [x] Respuestas enriquecidas client-safe; nunca se exponen tool names/IDs/JSON.
- [x] Reintento ante entidad no resuelta (`awaiting_retry`) sin bucles infinitos.
- [x] Typecheck, tests y build verdes.
- [x] Docs: `CONVERSATIONAL_ACTIONS.md` (este reporte).

## Limitaciones conocidas
- El catálogo es declarativo: las señales nuevas se agregan como strings; el orden
  del catálogo define la prioridad en empates.
- La resolución de entidades es por búsqueda (`list({q})`), no por ID exacto: el
  primer resultado más cercano gana.
- El historial guardado conserva el mensaje original del usuario; las respuestas
  cortas rellenan el contexto pero no reescriben el mensaje.
- `isShortAnswer` clasifica todo mensaje numérico corto como relleno de parámetro
  (comportamiento esperado para "10" → precio/cantidad).

## Archivos clave
- Nueva capa: `src/lib/conversational-actions/*.ts` (8 archivos).
- Nuevos: `src/repositories/expense.repository.ts`,
  `src/services/expense.service.ts`.
- Modificados: `src/lib/conversation/engine.ts`, `src/lib/conversation/factory.ts`,
  `src/lib/conversations/{conversation-types,conversation-context}.ts`,
  `src/lib/conversational/client-view.ts`, `src/events/event.service.ts`,
  `src/repositories/index.ts`, `src/services/index.ts`.
- Tests: `tests/conversational-actions/{detector,executor,params,engine}.test.ts`
  (4 archivos, 68 tests).
- Docs: `CONVERSATIONAL_ACTIONS.md`, `PHASE_5D_REPORT.md`.
