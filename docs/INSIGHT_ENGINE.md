# Insight Engine — Diseño (FASE 4B)

> Convierte hallazgos crudos de los analizadores en insights priorizados,
> sin modificar la importancia del catálogo de reglas.

## Pipeline

```
Observation { ruleId, category, importance, title, description, dataSource, action?, metricValue?, entityId? }
   │  (producidas por los analizadores)
   ▼
InsightEngine.build(observations)
   1. Asigna id  = `insight:{ruleId}`
   2. Asigna createdAt (ISO, mismo instante para toda la ejecución)
   3. Dedupe por (categoría + título)
   4. Ordena: importancia → categoría → título
   5. Limita a `maxInsights` (por defecto 12)
   ▼
Insight[]
```

## Priorización

```
IMPORTANCE_PRIORITY = [important, warning, info]
CATEGORY_PRIORITY   = [orders, inventory, sales, customers, activity, general]
```

Prioridad del cliente: **1) operaciones pendientes, 2) inventario, 3) ventas,
4) clientes, 5) actividad/general.** El desempate dentro de la misma
importancia+categoría es alfabético por título (`compareInsights`), garantizando
orden estable y determinista.

## Catálogo de reglas (15)

| Regla | Categoría | Importancia | Fuente | Acción sugerida |
|-------|-----------|-------------|--------|-----------------|
| `inventory.low_stock` | inventory | important | inventory.overview | Reponer existencias |
| `inventory.out_of_stock` | inventory | important | inventory.lowStock | Reponer agotados |
| `inventory.no_movement` | inventory | info | inventory.noMovement | Promoción o reposición |
| `inventory.high_rotation` | inventory | info | inventory.bestSellers | Verificar stock de los más vendidos |
| `sales.no_sales_today` | sales | info | sales.today | Verificar operatividad |
| `sales.week_comparison` | sales | info | sales.week | Revisar factores de la semana |
| `sales.month_comparison` | sales | info | sales.month | Comparar avance mensual |
| `sales.top_products` | sales | info | sales.productsSold | Mantener inventario disponible |
| `orders.pending` | orders | important | orders.pending | Atender pendientes |
| `orders.delayed` | orders | warning | orders.list | Confirmar estado/fecha |
| `customers.active` | customers | info | sales.frequentCustomers | — |
| `customers.new` | customers | info | customers.metrics | — |
| `customers.outstanding` | customers | warning | orders.creditOutstanding | Seguimiento de pagos |
| `customers.inactive` | customers | info | customers.metrics | Contacto de seguimiento |
| `activity.overview` | activity | info | monitor.snapshot | — |

## Garantías

- **Sin predicciones**: ninguna descripción afirma que algo "se agotará" o
  sucederá en X días; solo describen lo que los datos ya muestran.
- **Sin decisiones automáticas**: `action` es una sugerencia de revisión; el
  usuario decide.
- **Respeto del catálogo**: el engine no sube ni baja la importancia declarada
  por la regla.
- **Volumen acotado**: máximo 12 insights por ejecución para no saturar la
  respuesta del chat/dashboard.

## Implementación

- `src/lib/business-intelligence/rules/index.ts` — catálogo `RULES` + `rule(id)`.
- `src/lib/business-intelligence/insights/insight-engine.ts` — `InsightEngine`.
- `src/lib/business-intelligence/insights/prioritization.ts` —
  `prioritize`, `compareInsights`, `importanceRank`, `categoryRank`.

## Tests

`tests/business-intelligence/insight-engine.test.ts` (8) cubre: generación de
`id`/`createdAt`, dedupe por categoría+título, orden por importancia,
prioridad de categorías, límite de volumen, no-mutación y desempate por título.
