# Tool Orchestration (FASE 4A)

El **Execution Planner** (`src/lib/agent-intel/execution-planner.ts`) ejecuta un
plan de varias tools sobre el `ToolExecutor` 3B, que ya fuerza aislamiento de
negocio, permisos y validación (`src/lib/agent/tools/executor.ts:39-93`).

## Mecánica de ejecución (`execution-planner.ts:59-117`)

1. **Confirmaciones**: un paso `requiresConfirmation` sin `confirmedStepIds`
   NUNCA se ejecuta; queda en `awaiting_confirmation` (`execution-planner.ts:75-80`).
2. **Oleadas**: en cada iteración se toman los pasos *ready* (sin dependencias
   pendientes) (`execution-planner.ts:82-95`).
3. **Paralelismo**: los pasos ready se ejecutan con `Promise.all`; las dependencias
   fuerzan la secuencia (`execution-planner.ts:97-99`).
4. **Reintentos**: solo para errores retryable (timeout, red, 429/503, econnreset)
   y cuando el paso es `retryable` (`execution-planner.ts:27-47,130-136`).
5. **Errores parciales**: un paso fallido NO aborta el plan; los hermanos
   independientes continúan y los dependientes del fallido se marcan `skipped`
   (`execution-planner.ts:88-94,104-106`).
6. **Consolidación**: `ExecutionOutcome { ok, partialFailures, results }`
   (`types.ts:95-101`).

## Resultado por paso (`StepExecutionResult`, `types.ts:83-93`)

`stepId`, `tool`, `status` (`ok | error | skipped | awaiting_confirmation`),
`input`, `output` (ToolResponse normalizada), `error`, `durationMs`, `attempts`.

## Garantías

- **Nunca lanza**: el `ToolExecutor` captura errores y devuelve `ToolResponse`
  con `success: false`; el planner convierte eso en `status: "error"`.
- **Sin doble ejecución**: cuando la capa 4A ejecutó las tools de un turno, el
  `ToolResolver` 3A devuelve `[]` (guard `metadata.intelligence`,
  `src/lib/agent-core/tool-resolver.ts:62-64`).
- **Observabilidad**: cada paso se registra en la traza
  (`src/lib/agent-intel/agent-intelligence.ts:118-124`).

## Archivos

- Implementación: `src/lib/agent-intel/execution-planner.ts`
- Tests: `tests/agent-intel/execution-planner.test.ts` (9 casos)
