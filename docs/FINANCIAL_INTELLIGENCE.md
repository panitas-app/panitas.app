# Inteligencia Financiera (FASE 6D)

Guía funcional y técnica del panel ejecutivo financiero: un motor que combina
**ventas, gastos, créditos/cobranza y proveedores** para dar al dueño una vista
única de su salud financiera con KPIs, un resumen en lenguaje natural e
insights accionables priorizados.

---

## 1. Visión

La FASE 6D **no es contabilidad**: es inteligencia útil y accionable. El motor
cruza lo que el negocio ya registra (ventas, gastos, créditos y pagos de
proveedores) y responde preguntas como *"¿estoy ganando o perdiendo?"*,
*"¿qué debo revisar hoy?"* o *"¿tengo más por cobrar que por pagar?"*.

Principios de diseño:

- **Nunca inventar análisis**: cada cifra y cada recomendación vienen de datos
  reales de los repositorios. No hay porcentajes fabricados.
- **Insights accionables**: cada insight va acompañado de acciones rápidas
  (navegar a la sección o preguntarle a Panitas).
- **Desacoplado y testeable**: lógica pura en `src/lib/financial-intelligence/`
  con dependencias inyectables.
- **Rápido**: caché en memoria con TTL + invalidación por eventos relevantes.

## 2. Períodos

El panel compara siempre el período actual contra el **período anterior**:

| Período | Valor | Rango actual | Comparación |
|---|---|---|---|
| Hoy | `today` | Desde las 00:00 de hoy | El día anterior |
| Esta semana | `week` | Desde el lunes de esta semana | La semana anterior (7 días atrás) |
| Este mes | `month` | Desde el 1º del mes | El mes calendario anterior |

## 3. Motor (`FinancialEngine`)

`src/lib/financial-intelligence/financial-engine.ts` orquesta los datos:

| Dato | Fuente |
|---|---|
| Ingresos del período | `SalesService.summary` (accrual, órdenes pagadas/verificadas) |
| Gastos del período | `prisma.expense.aggregate` |
| Por cobrar / vencidos / recuperación | `CreditService.list` + KPIs |
| Recuperado en el período | `prisma.orderPayment.aggregate` (verified, con `creditTerm`) |
| Por pagar / facturas vencidas | `SupplierService.list` + KPIs |
| Pagado a proveedores | `prisma.supplierPayment.aggregate` |

API pública:

- `getIndicators(ctx, period)` → indicadores (con caché por tienda+período).
- `computeIndicators(ctx, range)` → cálculo completo sin caché.
- `getSummary(ctx, period)` → resumen ejecutivo en lenguaje natural.
- `getInsights(ctx, period)` → insights priorizados.
- `getPanel(ctx, period)` → indicadores + resumen + insights.
- `invalidateStore(storeId)` → invalida la caché de una tienda.

### Caché

- Clave: `financial:indicators:{storeId}:{period}:{fromISO}`.
- TTL: 60 s por defecto (`FinancialCache`).
- Invalidación selectiva por tienda en eventos financieros (ver §7).

## 4. Indicadores

`FinancialIndicators` agrupa (montos en la moneda local del negocio):

- **Ingresos / gastos**: `revenue`, `previousRevenue`, `revenueDeltaPct`,
  `expenses`, `previousExpenses`, `expensesDeltaPct`, `netFlow`.
- **Por cobrar**: `totalPending`, `recoveredInPeriod`, `recoveryRate` (%),
  `overdueCredits`, `overdueCreditAmount`, `dueNext7DaysCollect`,
  `topDebtors` (máx. 3).
- **Por pagar**: `totalPayable`, `paidToSuppliersInPeriod`,
  `overdueSupplierInvoices`, `overdueSupplierAmount`, `dueNext7DaysPay`,
  `topPayableSuppliers` (máx. 3).

La **tasa de recuperación** se calcula en el servicio como
`recuperado / (recuperado + pendiente)`; el motor la normaliza a **porcentaje**.

## 5. Resumen ejecutivo

`financial-summary.ts` genera párrafos en lenguaje natural, p. ej.:

> En esta semana tus ingresos ($1.500,00) superaron tus gastos ($900,00).
> Sin embargo, tienes un crédito vencido por $120,00 y $300,00 por cobrar en
> los próximos 7 días.
> Por el lado de proveedores, tienes $200,00 por pagar en los próximos 7 días.
> Tienes más por cobrar ($800,00) que por pagar ($400,00).

El **tono** se deriva de la situación real:

| Tono | Condición |
|---|---|
| `warning` | Flujo negativo, créditos vencidos, facturas vencidas o por pagar > por cobrar |
| `positive` | Flujo positivo sin alertas |
| `neutral` | Flujo en cero |

## 6. Insights accionables

`financial-insights.ts` solo emite insights respaldados por datos. Cada uno
incluye: título, descripción, **prioridad** (impacto) y **acciones rápidas**.

### Prioridad

`financial-priority.ts` — base por categoría y escalado por datos:

| Prioridad | Categorías |
|---|---|
| 🔴 Alta | `flujo_negativo`, `creditos_vencidos`, `facturas_vencidas`, `por_pagar_mayor` |
| 🟡 Media | `ventas_cayeron`, `gastos_aumentaron`, `cobrar_esta_semana`, `pagar_esta_semana`, `deuda_concentrada` |
| 🟢 Baja | `recuperacion_creditos`, `ventas_crecieron`, `flujo_positivo` |

Reglas de escalado (solo si el dato lo justifica):

- `ventas_cayeron` → **alta** si la caída es ≥ 25 % (`VENTAS_CAIDA_ALTA`).
- `gastos_aumentaron` → **alta** si el aumento es ≥ 50 % (`GASTOS_AUMENTO_ALTA`).

### Reglas de emisión (umbrales)

- `ventas_crecieron` / `ventas_cayeron` → variación ≥ 10 % vs. período anterior.
- `deuda_concentrada` → el principal deudor concentra ≥ 60 % del por cobrar.
- `recuperacion_creditos` → recuperación < 50 % con montos recuperados.

### Acciones rápidas

`financial-actions.ts` — cada categoría expone una acción de **navegación**
(rutas reales: `/dashboard/creditos`, `/dashboard/suppliers`,
`/dashboard/reports`, `/dashboard/finanzas`) y una de **asistente**
(`/dashboard/assistant?q=…`).

## 7. Eventos e invalidación

`registerFinancialListener` (event-listeners) invalida la caché del motor
cuando llegan eventos que cambian los datos financieros:

`sale.*`, `order.*`, `expense.*`, `credit.*`, `supplier.payment.*`,
`supplier.invoice.created`, `supplier.purchase.created`,
`supplier.balance.updated`.

- **Throttle** por tienda (5 s por defecto) para no saturar con ráfagas.
- El listener **no calcula nada**: solo avisa al callback de invalidación
  inyectable (por defecto limpia `defaultFinancialCache`).

## 8. IA (asistente)

Seis acciones nuevas en el catálogo conversacional (dominio `finanzas`):

| Acción | Pregunta soportada |
|---|---|
| `salud_financiera` | ¿Cómo está la salud financiera de mi negocio? |
| `que_revisar_hoy` | ¿Qué debo revisar hoy? |
| `por_cobrar_vs_pagar` | ¿Tengo más por cobrar que por pagar? |
| `principales_gastos` | ¿Cuáles son mis principales gastos? |
| `clientes_mayor_deuda` | ¿Qué clientes me deben más? |
| `proveedores_pagar_primero` | ¿A qué proveedores debo pagar primero? |

Los `executor` inyectan `FinancialEngine` (con la caché compartida) vía
`src/lib/conversation/factory.ts`. El renderizado usa builders de `rich.ts`
(`financialHealthBlocks`, `financialReviewBlocks`,
`financialCobrarVsPagarBlocks`, `financialTopDebtorsBlock`,
`financialTopPayablesBlock`, `financialGastosBlocks`).

## 9. Business Memory

`financial-preferences.ts` aprende del uso del panel:

- Período favorito — `bm.preference.finanzas.periodo` (repetición, umbral 3).
- Indicadores más consultados — `bm.preference.finanzas.indicadores`.
- Visualización preferida — `bm.preference.finanzas.visualizacion`
  (`resumen` | `indicadores` | `insights`, explícito con `importance: LOW`).

API: `GET|POST /api/business-memory/finanzas/preferences`.

## 10. API

### `GET /api/financial`

Panel ejecutivo (requiere sesión).

| Query | Valores |
|---|---|
| `period` | `today` \| `week` (default) \| `month` |
| `view` | `summary` \| `insights` (omite para el panel completo) |

- `view=summary` → `{ summary, period }`
- `view=insights` → `{ insights, period }`
- sin `view` → `{ panel }` con `indicators`, `summary` e `insights`.

## 11. UI

- **`/dashboard/finanzas`** — períodos (Hoy/Esta semana/Este mes), vistas
  (Todo/Resumen/Indicadores/Insights), resumen ejecutivo con tono, 6 KPI cards,
  lista de "Qué revisar hoy" priorizada, top deudores y top proveedores.
  La vista y el período favorito se persisten en Business Memory.
- Componentes: `kpi-grid`, `executive-summary`, `insights-list` y tipos
  compartidos (`financial-types.ts`).
- El asistente soporta **deep-links** `?q=` que abren la consulta directamente.

## 12. Tests

- `tests/financial-intelligence/` — engine (agregación, caché, invalidation,
  `periodRange`), summary (tono y párrafos), insights (umbrales), priority
  (escalado), actions (rutas reales).
- `tests/business-memory/financial-preferences.test.ts` — aprendizaje.
- `tests/events/financial-listener.test.ts` — invalidación + throttle.
- `tests/conversational-actions/financial-executor.test.ts` — 6 acciones.
- `tests/conversational-actions/detector.test.ts` — detección de las 6 frases.

Reporte de la fase: [`docs/PHASE_6D_REPORT.md`](./PHASE_6D_REPORT.md).
