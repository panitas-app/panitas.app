# Intent Engine (FASE 4A)

Clasificador determinista de la intención del usuario. Sin LLM ni costo de tokens:
asigna una categoría tipada, confianza, dominios de negocio y entidades extraídas.

## Categorías (`INTENT_TYPES`, `src/lib/agent-intel/types.ts:15-25`)

| Intención | Ejemplo |
|-----------|---------|
| `consulta` | "¿cuánto stock hay de abrazadera?" |
| `accion` | "agregar 10 unidades de abrazadera al stock" |
| `analisis` | "analiza por qué bajaron mis ventas" |
| `configuracion` | "cambiar el precio del producto" |
| `conversacion` | "hola, ¿cómo estás?" |
| `ayuda` | "¿qué puedes hacer por mí?" |
| `reporte` | "dame el reporte de ventas del mes" |

## Estrategia

1. **Normalización NFD** sin tildes y en minúsculas (`intent-engine.ts:52-58`).
2. **Scoring por señales regex** sobre el texto normalizado (`countMatches`, `intent-engine.ts:60-71`).
3. **Prioridad de desempate** `PRIORITY` (`intent-engine.ts:74`):
   `ayuda > configuracion > accion > analisis > reporte > consulta > conversacion`.
4. **Confianza** = `min(0.5 + 0.12 * señales, 0.98)` (`intent-engine.ts:139`).
5. **Dominios** por señales del catálogo (`DOMAIN_SIGNALS`, `intent-engine.ts:15-23`).
6. **Entidades**: fecha, periodo, cantidad, producto (`extractEntities`, `intent-engine.ts:77-95`).
7. **Acciones destructivas**: señales propias; si ninguna categoría gana pero hay señal
   destructiva, se fuerza `accion` para que la capa planifique y exija confirmación
   (`intent-engine.ts:136-139`).

## Reglas clave

- `needsTools = type !== "conversacion" && type !== "ayuda"` (`intent-engine.ts:141`).
  Solo esas dos delegan directo al LLM sin ejecutar herramientas.
- `destructive` se marca aparte y habilita la confirmación en el Task Planner.

## Archivos

- Implementación: `src/lib/agent-intel/intent-engine.ts`
- Contratos: `src/lib/agent-intel/types.ts`
- Tests: `tests/agent-intel/intent-engine.test.ts` (14 casos)
