# FASE 5F — Proactive Business Assistant — Reporte

## Resumen ejecutivo

Se construyó la capa **`src/lib/assistant-behavior/`** que convierte a Panitas
en un **gerente virtual proactivo**: revisa el negocio (reutilizando el Business
Monitor 4B), detecta eventos accionables con reglas declarativas y decide
**si** sugerir y **cómo** decirlo. El asistente ahora **saluda de forma
contextual** ("Buenos días, Juan. Revisé tu negocio y encontré 3 puntos para
revisar.") y acompaña la bienvenida con **recomendaciones reales priorizadas**
(Alta → Media → Baja) con **acciones rápidas** de texto semántico.

Garantías de producto: **siempre sugiere, nunca ejecuta**; **nunca inventa
datos** (cada recomendación apunta a su insight 4B); **nunca interrumpe con
mensajes vacíos** (sin hallazgos no se sugiere nada); personalidad consistente
(frases prohibidas bloqueadas y sanitizadas); caché por tienda (sin análisis
completo por mensaje).

**Verificación:** `tsc --noEmit` OK · **670 tests verdes** (40 nuevos en
`tests/assistant-behavior/*`) · `next build` OK (solo warning pre-existente de
Edge https en `src/lib/bcv/fetcher.ts`).

## Qué se implementó

### 1. Capa `src/lib/assistant-behavior/` (lógica pura, sin React)
- **`types/index.ts`**: `AssistantRecommendationCategory`
  (`operacion | inventario | finanzas | clientes | proveedores`),
  `AssistantPriority` (`alta | media | baja`), `AssistantQuickAction`,
  `AssistantRecommendation` (con `insightId` = evidencia real),
  `AssistantGreeting`, `AssistantBehaviorResult`, `AssistantBehaviorInput`.
- **`assistant-personality.ts`**: frases prohibidas (`como ia`, `no puedo`,
  `procesando`, `tu negocio está bien`, `no encontramos nada`,
  `todo funciona correctamente`, …), `sanitizeAssistantText`,
  `assertPersonalitySafe`, plantillas de saludo con variedad sin repetición.
- **`recommendation-priority.ts`**: orden determinista
  Alta → Media → Baja, luego categoría (operacion → inventario → finanzas →
  clientes → proveedores), luego título.
- **`proactive-rules.ts`**: catálogo declarativo `PROACTIVE_RULES` que mapea
  cada situación 4B (stock crítico, pedidos pendientes/retrasados, comparativas
  de ventas, créditos pendientes, clientes inactivos) a categoría, prioridad y
  **acción rápida** (Revisar inventario, Ver pedidos, Ver ventas, Cobrar
  clientes, Registrar compra).
- **`business-events.ts`**: `detectBusinessEvents` convierte los insights 4B
  en recomendaciones **sin inventar**; omite insights informativos sin `action`;
  deduplica por regla.
- **`greeting-generator.ts`**: `buildAssistantGreeting` compone el saludo según
  la hora y el conteo real de hallazgos, rotando plantillas deterministas sin
  repetir; sin hallazgos usa cierre neutro (nunca "todo bien").
- **`behavior-engine.ts`**: orquestación con **caché por tienda (TTL 60s)**,
  priorización, límite de recomendaciones y guardrails de personalidad.
- **`factory.ts` + `index.ts`**: `createBehaviorEngine` y API pública.

### 2. Presentación (reutiliza 5E)
- **`lib/conversational/recommendations.ts`**: `recommendationToMonitorBlock` /
  `recommendationsToMonitorRich` (máx 4 tarjetas `monitor` con acción rápida)
  para el `ConversationRenderer`.

### 3. Integración
- **`GET /api/agent/proactive`**: endpoint client-safe (rate-limit, roles,
  feature `basic_ai`, `storeId` de sesión) que expone
  `{ greeting, recommendations, hasFindings, generatedAt }`.
- **`use-assistant-chat.ts`**: `loadProactiveWelcome` consulta el endpoint al
  iniciar conversación; `startNewConversation` y la apertura sin historial usan
  la bienvenida contextual con fallback al `WELCOME` estático.

## Criterios de finalización (spec 5F)
- [x] Capa `src/lib/assistant-behavior/` con los 6 módulos del spec.
- [x] Proactividad por **reglas** (stock crítico, pedidos pendientes, gastos
      elevados, créditos vencidos, proveedores, ventas inusuales): **siempre
      sugerir, nunca ejecutar**; sin automatizaciones que actúen solas.
- [x] Sin interrupciones innecesarias: sin hallazgos no hay recomendación;
      prohibido "Tu negocio está bien" / "No encontramos nada".
- [x] Toda recomendación respaldada por datos reales (`insightId`, título y
      descripción del insight 4B).
- [x] Cada recomendación con **acción rápida** (Ver pedidos, Revisar
      inventario, Cobrar clientes, Registrar pago, Registrar compra) con texto
      semántico (sin tool names ni IDs).
- [x] Priorización automática Alta / Media / Baja.
- [x] Personalidad Panitas: profesional, clara, amable; frases prohibidas
      bloqueadas; "habla como gerente experimentado".
- [x] Optimización: caché por tienda sobre el Business Summary; sin análisis
      completo por mensaje; sin llamadas extra al modelo.
- [x] Bienvenida inteligente: saludo contextual variado sin repetición.
- [x] Monitor del Negocio como centro (reutiliza insights priorizados 4B).
- [x] Tipos de recomendación: Operación, Inventario, Finanzas, Clientes,
      Proveedores.
- [x] Tests 5F: saludos, priorización, recomendaciones, **ausencia de
      recomendaciones falsas**, personalidad, acciones rápidas y caché.
- [x] Typecheck, tests (670) y build verdes.
- [x] Docs: `ASSISTANT_BEHAVIOR.md`, `PROACTIVE_ASSISTANT.md`,
      `PHASE_5F_REPORT.md`.

## Nota sobre alcance (gastos / proveedores)

El catálogo `PROACTIVE_RULES` declara las situaciones del spec, pero una regla
solo se dispara cuando el Business Monitor (4B) produce la observación
correspondiente (nunca se inventa). Hoy 4B cubre inventario, ventas, pedidos,
clientes y actividad; las situaciones de gastos elevados y proveedores
pendientes se activarán automáticamente cuando la capa BI añada esos analizadores
(business-events ya las soporta por ruleId sin cambios).

## Archivos clave
- **Nuevos**: `src/lib/assistant-behavior/{types,assistant-personality,
  recommendation-priority,proactive-rules,business-events,greeting-generator,
  behavior-engine,factory,index}.ts`,
  `src/lib/conversational/recommendations.ts`,
  `src/app/api/agent/proactive/route.ts`.
- **Modificados**: `src/hooks/use-assistant-chat.ts`.
- **Tests**: `tests/assistant-behavior/{greeting-generator,personality,
  prioritization,business-events,behavior-engine,presenter}.test.ts`
  (6 archivos, 40 tests).
- **Docs**: `ASSISTANT_BEHAVIOR.md`, `PROACTIVE_ASSISTANT.md`,
  `PHASE_5F_REPORT.md`.
