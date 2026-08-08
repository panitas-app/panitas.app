# Conversational Actions Engine (FASE 5D)

Motor **determinista (sin LLM)** que convierte solicitudes en lenguaje natural en
operaciones de negocio ejecutadas sobre las tools 3B existentes y los services 1B.
Introduce la **acción conversacional** (nivel de usuario), el **completado de
parámetros en varios turnos**, la **confirmación** de acciones sensibles y las
**respuestas enriquecidas** (tarjetas, tablas, resúmenes).

Regla de capas: este módulo **no conoce** proveedores LLM ni Prisma. Coordina
Tool System (3B) + Services (1B) + Contexto conversacional (5C).

## Arquitectura

```
mensaje ──► detectAction ──► estado 5C ──► completar params ──► confirmar ──► ejecutar ──► rich
            (detector)      (previous)    (params)            (engine)      (executor)   (rich)
```

Módulo: `src/lib/conversational-actions/`

| Archivo | Responsabilidad |
|---|---|
| `types.ts` | Contratos: `ConversationalAction`, `ActionParam`, `KnownParams`, `RichResponse`, `ActionsTurnResult`, `ActionDeps`. |
| `catalog.ts` | Catálogo declarativo de 24 acciones + `getAction(id)`. |
| `detector.ts` | `detectAction(actions, message)`: normaliza NFD, hace scoring por señales. Primera señal con score gana. |
| `params.ts` | Extracción determinista de parámetros (monto, cantidad, teléfono, items, método de pago, crédito, término…) + `missingParams` + `isShortAnswer`. |
| `executor.ts` | Ejecuta la acción con las tools 3B / services 1B y devuelve `ActionResultData`. |
| `engine.ts` | Máquina de estados del turno: detectar → completar → confirmar → ejecutar. |
| `rich.ts` | Construye respuestas enriquecidas client-safe (`RichBlock[]`). |
| `index.ts` | Barrel público. |

## Ciclo de vida del turno

Estado del contexto 5C persistido por el `ConversationManager`:

1. **No hay acción** → `no_action` (el flujo cae al LLM 4B).
2. **Acción detectada** → se extraen parámetros conocidos del mensaje.
3. **Faltan datos** → `awaiting_details` con `pendingParams` (pregunta natural por
   el primero que falta). En el siguiente turno se reanuda la misma acción **sin
   reiniciar el flujo**.
4. **Respuesta corta** (`isShortAnswer`) → rellena la entidad activa o el primer
   parámetro faltante (`refillItemValue`, `cleanRefill`).
5. **Acción crítica/destructiva** → `awaiting_confirmation` con `ConfirmationRequest`
   (códigos de confirmación). `si/confirmo` ejecuta; `mejor no/cancelar` aborta.
6. **Ejecución** → tool 3B o service 1B (nunca tool names/IDs en la respuesta) →
   `completed` con `reply` enriquecida.
7. **Entidad no resuelta** (`ActionInputError`) → `awaiting_retry` con pregunta para
   reintentar; si el reintento falla de nuevo, el turno se cierra con mensaje amigable.

## Niveles de confirmación

| Nivel | Acciones | Comportamiento |
|---|---|---|
| `destructive` | `eliminar_producto`, `cancelar_pedido` | Confirmación obligatoria. |
| `critical` | `cambiar_precio`, `ajustar_stock` | Confirmación obligatoria. |
| `bulk` | — (ninguna hoy) | Nivel soportado por el tipo para operaciones masivas futuras. |
| `none` | el resto (24 − 4) | Ejecuta directo. |

`confirmationWhen(known)` permite nivel dinámico: p. ej. `ajustar_stock` con
`tipo = increase` no confirma; con disminución/ajuste sí.

## Catálogo de acciones (24)

Inventario: `crear_producto`, `editar_producto`, `cambiar_precio`, `ajustar_stock`,
`eliminar_producto`, `buscar_producto`.
Ventas: `registrar_venta`, `ver_ventas`, `registrar_credito`, `cancelar_pedido`.
Clientes: `crear_cliente`, `buscar_cliente`, `ver_historial_cliente`.
Gastos/Proveedores: `registrar_gasto`, `editar_gasto`, `consultar_gastos`,
`registrar_compra_proveedor`.
Pedidos: `ver_pedidos`, `ver_pedido`, `cancelar_pedido`.
Reportes: `reporte_ventas`, `reporte_stock_bajo`, `reporte_clientes`,
`reporte_productos`, `resumen_negocio`.

## Ejecución (executor)

- **Ventas**: `OrderService.create()` directo (source `pos`, items `{productId, quantity, price?}`, payments, creditTerm). Sin tool intermedia.
- **Gastos/Proveedores**: `ExpenseService` + `ExpenseRepository` reales; proveedores = gasto con campo `vendor`.
- **Resto**: tools 3B vía `ToolExecutor.execute` (nunca lanza; fallo → `ActionExecutionError` con mensaje amigable).
- Resolución de entidades: `productService.list({q, take})`, `customerService.list`, `expenseService.list({search, take})`.

## Respuestas enriquecidas

Bloques `text | table | card | summary` → `RichResponse` con `kind`
(`card | summary | table | confirmation`) y `blocks` client-safe. El cliente los
renderiza en `ClientChatView.rich` sin exponer detalles internos.

## Integración

- `src/lib/conversation/engine.ts`: bloque FASE 5D entre `finalize` y la capa de
  inteligencia; expone `ChatTurnResult.rich`.
- `src/lib/conversation/factory.ts`: `createActionsEngine` inyecta todos los
  services + `ToolExecutor`/`buildToolRegistry`.
- `src/lib/conversations/conversation-types.ts`: estados `awaiting_confirmation` /
  `awaiting_retry`, `actionId?`, `TurnOutcome`.
- `src/lib/conversations/conversation-context.ts`: `applyTurnToContext` persiste
  los overrides 5D (`actionId`, `knownParams`, `pendingParams`, `status`).

## Tests

`tests/conversational-actions/` — 68 tests:
`detector.test.ts` (13), `executor.test.ts` (11), `params.test.ts` (27), `engine.test.ts` (17).

## Regla 5B (nunca exponer)

Las respuestas del motor **no** muestran nombres de tools, IDs internos ni JSON
crudo. Todo lo que llega al cliente pasa por `rich.ts` (bloques renderizables) o
por el `reply` en lenguaje natural.
