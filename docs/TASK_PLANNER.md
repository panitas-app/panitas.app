# Task Planner (FASE 4A)

Convierte una intención clasificada en un **plan de ejecución** de tools del
Tool System 3B. Es determinista y usa `toolRegistry.metadata()` como catálogo
(`src/lib/agent-intel/task-planner.ts:13,26`) — o un catálogo inyectado en tests.

## Entrada → Salida

- Entrada: `IntentClassification` (`types.ts:31-47`).
- Salida: `ExecutionPlan { id, intent, steps, requiresConfirmation, domains }`
  (`types.ts:70-78`).

Cada `PlannedStep` declara `tool`, `domain`, `input`, `dependsOn`, `parallel`,
`retryable`, `requiresConfirmation` y `rationale` (`types.ts:50-67`).

## Planes por intención

| Intención | Pasos típicos |
|-----------|---------------|
| `consulta` inventario | `inventory.searchProduct` / `inventory.getLowStock` si "stock bajo" (`task-planner.ts:95-156`) |
| `consulta` ventas | `sales.getRecentSales` |
| `consulta` clientes | `customers.search` |
| `consulta` pedidos | `orders.getPending` |
| `analisis` | `analytics.businessSummary` + `analytics.businessAlerts` + `inventory.getLowStock` en paralelo (`task-planner.ts:158-185`) |
| `reporte` | `reports.sales` / `reports.today`, o `inventory.getLowStock` si es de inventario |
| `accion` destructiva | `orders.updateStatus` (cancelled), `products.delete`, o `customers.search` — **con confirmación** (`task-planner.ts:221-262`) |
| `accion` stock | `inventory.updateStock` (increase **sin** confirmación / adjustment **con**) (`task-planner.ts:276-292`) |
| `accion` creación | `products.create` / `customers.create` |
| `configuracion` | `products.update` o `inventory.updateStock` con confirmación (`task-planner.ts:309-343`) |

## Reglas clave

- `requiresConfirmation` se propaga al plan (`task-planner.ts:84`).
- Los pasos de un análisis se marcan `parallel: true`; el Execution Planner los
  ejecuta en paralelo.
- Los pasos llevan `rationale` (por qué se eligieron) para trazabilidad.
- Dominios deduplicados en `plan.domains` (`task-planner.ts:91`).

## Archivos

- Implementación: `src/lib/agent-intel/task-planner.ts`
- Tests: `tests/agent-intel/task-planner.test.ts` (10 casos)
