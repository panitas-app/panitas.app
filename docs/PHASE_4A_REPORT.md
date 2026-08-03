# FASE 4A — Agent Intelligence Layer · Reporte

## Resumen ejecutivo

Se construyó la **capa de inteligencia del agente** (`src/lib/agent-intel/`):
clasifica la intención, planifica, orquesta **varias** Tools del Tool System 3B
(secuencial/paralelo), exige **confirmación** para acciones destructivas,
consolida resultados y explica su razonamiento — manteniendo una **sola llamada
al LLM** y cero acceso directo a Prisma desde el agente.

La capa es **determinista sin LLM** en todo el razonamiento (intención, plan,
confirmación, ejecución, explicación); el LLM del Agent Core solo sintetiza la
respuesta final con evidencia. Resultado: testeable, barato (compatible con
OpenRouter Free) y listo para modelos premium.

**Verificación:** lint limpio en archivos tocados · `tsc --noEmit` OK ·
**330 tests verdes** (273 preexistentes + **57 nuevos 4A**) · `next build` OK.

## Qué se implementó

| Módulo | Archivo | Responsabilidad |
|--------|---------|-----------------|
| Tipos | `src/lib/agent-intel/types.ts` | Contratos de toda la capa |
| Intent Engine | `intent-engine.ts` | Clasifica intención (7 categorías) + entidades + destructivas |
| Task Planner | `task-planner.ts` | Plan de tools por intención (orden, paralelo, confirmación, rationale) |
| Confirmation System | `confirmation-system.ts` | Reglas y flujo de confirmación de acciones críticas |
| Execution Planner | `execution-planner.ts` | Ejecuta planes multi-tool con reintentos y errores parciales |
| Response Synthesizer | `response-synthesizer.ts` | Contexto para el LLM + fallback determinista |
| Explanation Engine | `explanation-engine.ts` | Explica hallazgos (alertas, bajo stock) en español |
| Observabilidad | `trace.ts` | Traza del turno (intención, plan, steps, tiempos, errores) |
| Orquestador | `agent-intelligence.ts` | Flujo intent→plan→confirmación/ejecución→síntesis→traza |
| Factory / Barrel | `factory.ts`, `index.ts` | Punto de wiring y exports |

## Integración

- **ConversationEngine** (`src/lib/conversation/engine.ts`) invoca la capa antes
  de `agent.handle`:
  - `confirmation_required` → responde SIN LLM pidiendo confirmación
    (`engine.ts:153-186`).
  - `completed` con resultados → inyecta `request.intelligenceContext` y el LLM
    sintetiza (`engine.ts:188-193`).
  - `completed` sin resultados → fallback determinista (`engine.ts:194-217`).
  - `no_tools` → delega directo al LLM (conversación/ayuda).
- **ConversationFactory** cablea `createIntelligenceLayer()` por defecto
  (`src/lib/conversation/factory.ts:9,26`).
- **Guard anti doble-ejecución**: cuando la capa ejecutó las tools del turno,
  el `ToolResolver` 3A devuelve `[]` (`src/lib/agent-core/tool-resolver.ts:62-64`).
- **AgentRequest** gana `intelligenceContext` (`types.ts:117`) inyectado en el
  system prompt (`context-builder.ts:72-73`).

## Flujo de un turno razonado

```
usuario → ConversationEngine.chat
        → IntelligenceLayer.run
            → IntentEngine.classify (sin LLM)
            → TaskPlanner.plan
            → ¿requiere confirmación?
                → sí, no confirmada → ConfirmationRequest (sin LLM, sin tools)
                → sí, confirmada / no  → ExecutionPlanner.execute
                    → ToolExecutor 3B (permisos + aislamiento + validación)
                    → reintentos / errores parciales
            → ExplanationEngine (evidencia)
            → ResponseSynthesizer
                → hay resultados → synthesizedContext → LLM → respuesta final
                → no hay        → reply determinista
            → TraceRecorder (observabilidad + auditoría best-effort)
```

## Decisiones clave

1. **Razonamiento sin LLM**: determinista, testeable, sin costo de tokens.
2. **Una sola llamada al LLM** con evidencia consolidada.
3. **Confirmación de paso único**: primera vuelta pide, segunda ejecuta
   (`confirmedStepIds`).
4. **Paralelismo por oleadas** con dependencias; error parcial no aborta.
5. **Las 24 tools 3B inertes se consumen por primera vez**: la capa usa
   `toolRegistry.metadata()` para planificar y `ToolExecutor` para ejecutar.

## Tests nuevos (57)

- `tests/agent-intel/intent-engine.test.ts` (14)
- `tests/agent-intel/task-planner.test.ts` (10)
- `tests/agent-intel/execution-planner.test.ts` (9)
- `tests/agent-intel/confirmation-system.test.ts` (7)
- `tests/agent-intel/response-synthesizer.test.ts` (7)
- `tests/agent-intel/intelligence-layer.test.ts` (6)
- `tests/agent-intel/conversation-intelligence.test.ts` (4)

## Límites y trabajo futuro

- **Transporte de confirmación por API**: el cliente debe reenviar el turno con
  `confirmedStepIds` (`POST /api/agent/chat`). No hay UI de botones aún.
- **Entidades incompletas para crear/editar**: pasos como `products.create`
  reciben placeholders (`name: "pendiente"`); falta extracción semántica fina.
- **Modelos premium**: la arquitectura ya permite delegar intención/plan al LLM
  (inyectando `IntelligenceLayerDeps`) sin tocar el resto.
- **Rutas de guardado de conversación para la segunda vuelta**: `confirmedStepIds`
  viaja por input del turno; se puede persistir en metadata de la conversación.
- **El transporte 3A→runtime** sigue documentado como pendiente (la capa 4A
  consume el Tool System directamente; el `ToolResolver` 3A legacy permanece).

## Docs relacionados

- `docs/PHASE_4A_AUDIT.md` · `INTENT_ENGINE.md` · `TASK_PLANNER.md`
- `docs/TOOL_ORCHESTRATION.md` · `CONFIRMATION_SYSTEM.md` · `RESPONSE_SYNTHESIZER.md`
