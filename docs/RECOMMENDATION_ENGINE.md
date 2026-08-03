# RECOMMENDATION ENGINE — FASE 4D

> Motor de recomendaciones operativas de Panitas. Determinista, sin predicciones,
> sin lenguaje alarmista y sin decisiones automáticas: solo sugiere "podría ser
> conveniente revisar", basándose en datos reales del negocio.

## Flujo de capas

```
Usuario → Assistant Interface → Agent System (tool recommendations.list)
       → RecommendationEngine → BusinessHealthMonitor (4B) → Services (1B) → Repositories
```

- El **engine** NO consulta la BD ni servicios: consume SOLO el `MonitorReport`
  que produce `BusinessHealthMonitor.monitor(input)` (FASE 4B).
- Los **analizadores 4D** mapean observaciones 4B (`Observation`) a candidatos
  (`RecommendationCandidate`) usando el catálogo declarativo de reglas.
- El **servicio** (capa 1B) persiste el historial vía `RecommendationRepository`,
  con cooldown anti-spam por regla y estado persistente.

## Catálogo de reglas (`src/lib/recommendations/rules/index.ts`)

| Regla | Categoría | Prioridad | Cooldown |
|-------|-----------|-----------|----------|
| `inventory.low_stock` | INVENTORY | HIGH | 7 días |
| `inventory.out_of_stock` | INVENTORY | HIGH | 3 días |
| `inventory.no_movement` | INVENTORY | LOW | 15 días |
| `inventory.high_rotation` | INVENTORY | MEDIUM | 7 días |
| `sales.week_comparison` | SALES | MEDIUM | 7 días |
| `sales.month_comparison` | SALES | MEDIUM | 7 días |
| `sales.top_products` | SALES | MEDIUM | 7 días |
| `customers.outstanding` | CUSTOMERS | MEDIUM | 7 días |
| `customers.inactive` | CUSTOMERS | LOW | 30 días |
| `orders.pending` | OPERATIONS | HIGH | 1 día |
| `orders.delayed` | OPERATIONS | MEDIUM | 3 días |
| `pricing.review_rotation` | PRICING | MEDIUM | 15 días (derivada) |

Cada regla define: `id`, `category`, `priority`, `dataSource`, `suggestedAction`
(nunca una decisión automática), `cooldownDays` y `reason` basada en datos.

## Reglas del producto (no negociables)

1. **NUNCA predecir** ("se agotarán en 4 días", "crecerás X%") ni prometer
   crecimiento.
2. **NUNCA** recomendar marketing, estrategias comerciales ni modificaciones de
   precio: la regla `pricing.review_rotation` solo sugiere "revisar si sigue
   siendo conveniente".
3. **NUNCA** decir "debes hacer esto": siempre "podría ser conveniente revisar".
4. Sin palabras urgentes/alarmistas: no "urgente", "crítico", "inmediatamente".
5. Máximo **3–5 recomendaciones** activas por ejecución (por defecto 5).

## Anti-spam y estado persistente

- **Cooldown**: una regla no se vuelve a recomendar dentro de su período
  (`findRecentByRule` con `createdAt >= now - cooldownDays`).
- **Estado**: `active | viewed | dismissed`. La UI los marca vía PATCH.
- **Supersession**: al renovar una regla, las activas anteriores de esa misma
  regla pasan a `viewed` (nunca hay dos activas de la misma regla).

## Módulos

| Módulo | Archivo |
|--------|---------|
| Tipos | `src/lib/recommendations/types/index.ts` |
| Catálogo | `src/lib/recommendations/rules/index.ts` |
| Analizadores | `src/lib/recommendations/analyzers/*.ts` (+ `mapper.ts`) |
| Motor | `src/lib/recommendations/engine/recommendation-engine.ts` |
| Priorización | `src/lib/recommendations/engine/prioritization.ts` |
| Resumen NL | `src/lib/recommendations/generators/summary-generator.ts` |
| Servicio 1B | `src/lib/recommendations/services/recommendation.service.ts` |
| Repositorio | `src/repositories/recommendation.repository.ts` |
| Factories | `src/lib/recommendations/factory.ts` · barrel `index.ts` |

## Priorización

Orden determinista: **prioridad** (HIGH → MEDIUM → LOW), luego **categoría**
(OPERATIONS → INVENTORY → SALES → CUSTOMERS → PRICING), luego **título**
alfabético. `prioritizeRecommendations` nunca muta el arreglo original.

## Puntos de entrada

- **Tool del agente**: `recommendations.list` (dominio `recommendations`,
  permiso `report.read`, sin `storeId` en el schema — viene del contexto).
- **API**: `GET /api/agent/recommendations` (genera con cooldown + lista activa)
  y `PATCH /api/agent/recommendations` (`{id, action: "view"|"dismiss"}`).
- **UI**: `src/components/recommendations/` — `RecommendationCard`, `List`,
  `Badge`, `Detail`, `RecommendationsSection` (dashboard); sugerencia del
  asistente "¿Qué me recomiendas revisar?".

## Testing

50 tests en `tests/recommendations/` (rules, analyzers, engine, service, tool,
summary-generator, integración agent-intel). `npx vitest run`.
