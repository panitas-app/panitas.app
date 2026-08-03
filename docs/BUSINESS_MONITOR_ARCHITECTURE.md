# Business Monitor — Arquitectura (FASE 4B)

> Capa que responde **"¿cómo está mi negocio?"** con datos reales y sin alarmismo:
> monitor de salud, analizadores por módulo, Insight Engine priorizado y
> Business Summary API. Sin predicciones, sin decisiones por el usuario.

## Propósito

La capa `src/lib/business-intelligence/` consume los servicios existentes
(FASE 1B) y produce un **resumen operativo** del negocio: ventas, inventario,
pedidos, clientes y actividad del día, priorizados por importancia
(INFO / WARNING / IMPORTANT) y por categoría (operaciones → inventario →
ventas → clientes → general).

## Flujo de capas (obligatorio)

```
Agente (tool analytics.businessMonitor)
   │  StoreServiceContext autenticado
   ▼
BusinessSummaryGenerator (generators/)
   │  BusinessMonitorInput { ctx, storeName?, userName? }
   ▼
BusinessHealthMonitor (monitors/)
   │  ejecuta en paralelo
   ├── InventoryAnalyzer ─► InventoryService ─► InventoryRepository
   ├── SalesAnalyzer     ─► SalesService     ─► SalesRepository
   ├── OrderAnalyzer     ─► OrderService     ─► OrderRepository
   ├── CustomerAnalyzer  ─► CustomerService  ─► CustomerRepository
   └── ActivityAnalyzer  ─► (solo snapshot, sin consultas)
   ▼
InsightEngine (insights/) — dedupe + priorización + límite de volumen
   ▼
BusinessSummary { greeting, summary, overview, insights, metrics, recommendations }
```

Regla de capas: **Agente → Intelligence → Business Monitor → Services →
Repositories**. Los componentes UI y la API reciben el payload ya tipado y no
contienen lógica de negocio.

## Módulos

| Módulo | Archivo | Responsabilidad |
|--------|---------|-----------------|
| Tipos | `src/lib/business-intelligence/types/index.ts` | Contratos (`Insight`, `BusinessSummary`, `MonitorReport`, datos de analizadores) |
| Formato | `format.ts` | `money()`, `pct()`, `startOfDay/startOfWeek/startOfMonth` |
| Reglas | `rules/index.ts` | Catálogo declarativo de 15 reglas (id, categoría, importancia, dataSource, acción sugerida) |
| Analizadores | `analyzers/{inventory,sales,order,customer,activity}-analyzer.ts` | Detectan situaciones por módulo |
| Insight Engine | `insights/insight-engine.ts` | Observación → insight final (dedupe, prioridad, límite) |
| Priorización | `insights/prioritization.ts` | `important > warning > info`; `orders > inventory > sales > customers > activity > general` |
| Monitor | `monitors/business-health-monitor.ts` | Orquesta analizadores en paralelo, arma `ActivitySnapshot` + 10 métricas |
| Generador | `generators/business-summary-generator.ts` | Compone el resumen final (saludo, salud, insights, recomendaciones) |
| Factory | `factory.ts` | Instancias por defecto con dependencias reales |
| Barrel | `index.ts` | API pública de la capa |

## Estado de salud

| Estado | Condición | Mensaje |
|--------|-----------|---------|
| `estable` | 0 importantes y 0 warnings | "El negocio se encuentra en un estado estable." |
| `atencion` | solo warnings (>0) | "N puntos merecen seguimiento." |
| `revision` | ≥1 importante | "N puntos importantes requieren tu atención." |

La severidad **no usa lenguaje alarmista**: no existe "critical", no hay
predicciones ("se agotarán en X días") ni decisiones automáticas. Las acciones
sugeridas son de **revisión** y quedan en `recommendations`.

## Aislamiento de negocio

- Toda consulta parte del `StoreServiceContext` autenticado; el `storeId`/`userId`
  NUNCA provienen del input del usuario.
- La tool `analytics.businessMonitor` construye el contexto con
  `buildServiceContext(ctx)` (`src/lib/agent/tools/context.ts`).
- `OrderService.creditOutstanding(ctx)` usa `ctx.storeId` (nueva consulta 1B:
  `OrderRepository.creditOutstanding`, count de clientes con
  `paymentStatus in [credit, partial]` y `status != cancelled`).

## Customer Analyzer — regla de grupos

El analizador de clientes opera **solo por grupos**: activos, nuevos, con saldo
pendiente e inactivos. **Nunca** genera insights individuales del tipo
"Pedro no compra hace 50 días"; profundizar en un cliente concreto queda bajo
solicitud explícita.

## Consumo

- **Tool del agente**: `analytics.businessMonitor` (`src/lib/agent/tools/domains/analytics.ts`),
  permisos `report.read`, devuelve el `BusinessSummary` completo.
- **Task Planner**: cuando el mensaje menciona "negocio/negocios/empresa" o
  "cómo está/va el negocio", planifica la tool `analytics.businessMonitor`
  (`src/lib/agent-intel/task-planner.ts`).
- **API**: `GET /api/agent/business-summary` (rate limit 30/60s, roles
  `admin|manager|seller|viewer`, gate `basic_ai`).
- **UI**: componentes puros en `src/components/business/` (`BusinessSummary`,
  `BusinessHealthCard`, `InsightList`, `InsightCard`).

## Verificación

- Lint limpio en archivos nuevos/modificados.
- `tsc --noEmit` OK.
- **368 tests verdes** (330 previos + 38 nuevos 4B).
- `next build` OK.
