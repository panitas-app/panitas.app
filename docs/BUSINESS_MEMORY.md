# Business Memory — Memoria estable del negocio

## Qué es

La **Business Memory (FASE 5G)** es la memoria **permanente y estable** del
negocio: el conjunto de cosas que Panitas aprende de cómo trabaja cada negocio
y que aplica **antes de responder** para personalizar vocabulario, ejemplos,
sugerencias y valores por defecto.

Está **separada del historial conversacional** (FASE 3D / 5C): la memoria
conversacional recuerda la sesión; la Business Memory recuerda **la empresa**.

## Tipos de memoria

| Tipo | Qué recuerda | Ejemplo | ¿Explícita? |
|------|--------------|---------|-------------|
| `terminology` | Cómo nombra el negocio sus conceptos | "usas *pacientes* para referirte a *clientes*" | Sí |
| `preference` | Preferencias y valores por defecto | "moneda principal: USD" | Sí |
| `operational_rule` | Reglas operativas que respetar | "no vender sin stock", "confirmar antes de eliminar" | Sí |
| `usage_pattern` | Consultas/reportes frecuentes | "consultas frecuentes: ventas" | No (repetición) |

## Aprendizaje

Regla de oro: **NUNCA se consolida una preferencia con una sola acción**.

- **Explícito** (el usuario enseña): se confirma de inmediato.
  - "yo llamo pacientes a mis clientes" → `terminology` confirmado.
  - "prefiero trabajar en dólares" → `preference` moneda.
  - "nunca vender sin stock" → `operational_rule`.
- **Implícito / repetitivo**: acumula fuerza (`strength`) y queda como
  **candidato** con TTL (7 días). Al cruzar el umbral configurable por tipo
  (terminología/preferencias: 3, reglas: 2, patrones de uso: 4) se confirma.
- **Desactivación**: se puede apagar el aprendizaje por negocio (el ajuste se
  persiste y **sobrevive al reset**).

Umbrales y límites por defecto (`LearningConfig`):

| Parámetro | Valor |
|-----------|-------|
| `thresholds.terminology` | 3 |
| `thresholds.preference` | 3 |
| `thresholds.operational_rule` | 2 |
| `thresholds.usage_pattern` | 4 |
| `candidateTtlMs` | 7 días |
| `maxCandidates` | 50 |
| `maxMemories` | 200 |

## Consulta por intención (optimización)

Antes de responder, el agente **NO recibe toda la memoria**: solo los recuerdos
**confirmados y relevantes** para la consulta actual (por defecto hasta 5), y en
un fragmento compacto para el system prompt.

El ranking es determinista (`relevanceScore`):

1. coincidencia de tokens del mensaje con etiquetas / label / valor
2. dominio detectado en el mensaje o por la capa de inteligencia (4A)
3. importancia del recuerdo (`CRITICAL > HIGH > MEDIUM > LOW`)
4. frecuencia de acceso (`log1p(accessCount)`) y recencia

Al consultar se actualiza `accessCount` / `lastAccessAt` (frecuencia, sin tocar
`updatedAt`).

## Aislamiento y privacidad

- Toda operación lleva `storeId` en el `where` (**frontera por tenant**).
- La memoria pertenece al negocio: **nunca se comparte entre negocios**.
- La capa es independiente del `MemoryManager` 3D pero comparte la misma tabla
  `BusinessMemory` con claves prefijadas `bm.` (no colisionan) y `scope="store"`.

## Expiración

- Candidatos no consolidados: expiran según `candidateTtlMs`.
- Recuerdos confirmados explícitos: **no expiran** (salvo que el usuario los
  elimine o restablezca la memoria).
- El panel puede eliminar/restablecer en cualquier momento.

## Panel de gestión

Ruta **`/dashboard/memoria`** (entrada en el sidebar, sección Panitas IA):

- Ver lo aprendido agrupado por tipo (terminología / preferencias / reglas /
  patrones), con estado y fuerza (`3/3`).
- **Editar** recuerdos (etiqueta y valor JSON).
- **Eliminar** recuerdos.
- **Activar/desactivar** el aprendizaje automático.
- **Restablecer** toda la memoria del negocio (conserva el ajuste de
  aprendizaje; solo admin).

## APIs

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/business-memory` | Lista + estadísticas + estado del aprendizaje |
| PATCH | `/api/business-memory` | Edita un recuerdo `{ key, label?, value?, importance? }` |
| DELETE | `/api/business-memory?key=` | Elimina un recuerdo |
| POST | `/api/business-memory/learning` | `{ enabled: boolean }` activa/desactiva el aprendizaje |
| POST | `/api/business-memory/reset` | Restablece la memoria (admin) |

Todas con rate-limit, `requireRole` y feature `basic_ai` (patrón 5F).

## Integración con el asistente

En `src/lib/conversation/engine.ts`:

1. **Antes de responder**: `queryForIntent({ message })` inyecta la memoria
   relevante en el `memoryContext` del `AgentRequest` (best-effort, nunca rompe
   el turno).
2. **Tras el turno**: `learnFromTurn({ message, intent, domains })` aprende de
   lo dicho (best-effort, en segundo plano, nunca bloquea).

Con el tiempo el asistente usa automáticamente la terminología del negocio, sus
preferencias, respeta sus reglas y prioriza lo que más consultan.

## Archivos

```
src/lib/business-memory/
├── memory-types.ts      # contratos (kind, source, status, LearningConfig, store)
├── memory-rules.ts      # umbrales por defecto, dominios, extracción de señales
├── memory-store.ts      # InMemoryStore (tests) + PrismaStore (prod) + aislación
├── memory-learning.ts   # learner: explícito→confirmado, repetición→candidato→umbral
├── memory-query.ts      # ranking por intención + fragmento compacto + touch
├── memory-engine.ts     # fachada (query, learn, admin, reset, stats)
├── memory-ui.ts         # presentación del panel (grupos, etiquetas)
├── factory.ts / index.ts
src/components/business-memory/memory-panel.tsx
src/app/dashboard/memoria/page.tsx
src/app/api/business-memory/{route,learning/route,reset/route}.ts
```
