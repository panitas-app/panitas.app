# Assistant Behavior — Arquitectura (FASE 5F)

## Propósito

La capa **`src/lib/assistant-behavior/`** convierte a Panitas en un **gerente
virtual proactivo**: analiza el Business Summary (FASE 4B) y, mediante **reglas
declarativas**, decide *si* conviene sugerir algo y *cómo* decirlo. La
proactividad **siempre sugiere, nunca ejecuta**: cada recomendación lleva una
acción rápida de texto semántico que el usuario decide pulsar.

## Reglas de seguridad del producto

| Regla | Implementación |
|------|----------------|
| **Nunca decidir por el usuario** | Todo es una sugerencia con `quickAction`; el motor no ejecuta nada |
| **Nunca inventar datos** | Cada `AssistantRecommendation` apunta a su `insightId` (4B); título y descripción provienen del insight |
| **Nunca interrumpir innecesariamente** | Sin hallazgos accionables → `hasFindings=false` y sin texto vacío |
| **Prohibido "tu negocio está bien"** | `FORBIDDEN_PHRASES` + sanitizador + guardia en tests |
| **Sin análisis por mensaje** | Caché por tienda con TTL (60s) sobre el resumen 4B |

## Módulos

```
src/lib/assistant-behavior/
├── types/index.ts                 Contratos (recomendación, saludo, resultado)
├── assistant-personality.ts       Personalidad de Panitas + frases prohibidas
├── recommendation-priority.ts     Orden determinista Alta → Media → Baja
├── proactive-rules.ts             Catálogo ruleId → categoría/prioridad/acción
├── business-events.ts             Insights 4B → recomendaciones (nunca inventa)
├── greeting-generator.ts          Saludo contextual variado sin repetición
├── behavior-engine.ts             Orquestación + caché + guardrails
├── factory.ts                     createBehaviorEngine()
└── index.ts                       API pública
```

## Flujo

```
Business Summary (4B) ──► business-events ──► recommendations (sin priorizar)
                                  │
                                  ├─ proactive-rules   (categoría/prioridad/acción)
                                  └─ insightId         (evidencia real)
priority → recommendation-priority → slice(maxRecommendations)
greeting-generator → AssistantGreeting (variado, sin repetición)
BehaviorEngine → AssistantBehaviorResult  (cacheado por tienda, TTL 60s)
```

## Contratos clave

```ts
type AssistantRecommendationCategory = "operacion" | "inventario" | "finanzas"
                                     | "clientes" | "proveedores"
type AssistantPriority = "alta" | "media" | "baja"

interface AssistantRecommendation {
  id: string            // reco:{ruleId} — estable y determinista
  ruleId: string
  insightId: string     // evidencia real (nunca inventada)
  category: AssistantRecommendationCategory
  priority: AssistantPriority
  title: string         // del insight
  description: string   // del insight
  quickAction: AssistantQuickAction  // texto semántico, regla 5D/5E
}

interface AssistantGreeting { text: string; hour: number; userName?: string }

interface AssistantBehaviorResult {
  storeId: string
  generatedAt: string
  greeting: AssistantGreeting
  recommendations: AssistantRecommendation[]
  hasFindings: boolean   // true solo con recomendaciones reales
}
```

## Personalidad

- Panitas habla como **gerente experimentado**: profesional, claro, amable.
- `FORBIDDEN_PHRASES`: `como ia`, `no puedo`, `procesando`,
  `tu negocio está bien`, `no encontramos nada`, `todo funciona correctamente`, …
- `sanitizeAssistantText` elimina esas frases; `assertPersonalitySafe` falla si
  aparecen (guardia en el engine y en tests).
- Variantes de saludo rotadas de forma determinista (`pickGreetingTemplateIndex`)
  sin repetir la usada antes; el saludo usa plural correcto ("1 punto" / "3 puntos").

## Caché

`BehaviorEngine.analyze` cachea el resultado por `storeId` durante
`cacheTtlMs` (default 60s). Solo se consulta el monitor 4B al expirar. No se
realizan análisis completos por cada mensaje.

## Consumo

- Endpoint `GET /api/agent/proactive` → `{ greeting, recommendations,
  hasFindings, generatedAt }` (ver `PROACTIVE_ASSISTANT.md`).
- Presentación: `src/lib/conversational/recommendations.ts`
  (`recommendationsToMonitorRich` → bloques `monitor` client-safe reutilizando
  el `ConversationRenderer` de 5E).
