# Asistente Proactivo (FASE 5F)

## Qué es

El asistente deja de esperar preguntas: al iniciar un chat, **Panitas revisa el
negocio** (vía el Business Monitor 4B) y saluda de forma contextual con las
recomendaciones reales del momento, priorizadas. Nunca decide por el usuario y
nunca interrumpe con mensajes vacíos.

## Endpoint

```
GET /api/agent/proactive
```

Respuesta (client-safe):

```json
{
  "greeting": { "text": "Buenos días, Juan. Encontré 3 puntos que vale la pena revisar hoy.", "hour": 9, "userName": "Juan" },
  "recommendations": [
    {
      "id": "reco:inventory.low_stock",
      "ruleId": "inventory.low_stock",
      "insightId": "insight:inventory.low_stock",
      "category": "inventario",
      "priority": "alta",
      "title": "3 productos requieren reposición",
      "description": "Café, Pan y Jugo están por debajo del umbral de stock.",
      "quickAction": { "label": "Revisar inventario", "action": "revisar inventario", "variant": "outline", "icon": "package" }
    }
  ],
  "hasFindings": true,
  "generatedAt": "2026-08-04T10:00:00.000Z",
  "storeId": "store_1"
}
```

Seguridad: rate-limit (`agent-proactive`, 30/60s), `requireRole` (admin, manager,
seller, viewer), `requireFeature(plan, "basic_ai")` y `storeId` siempre de la
sesión (mismo patrón que `business-summary`).

## Reglas proactivas (catálogo)

El catálogo `PROACTIVE_RULES` mapea cada situación detectable por 4B a
**categoría, prioridad y acción rápida** (texto semántico, regla 5D/5E):

| Situación (ruleId 4B) | Categoría | Prioridad | Acción rápida |
|---|---|---|---|
| `inventory.low_stock` | inventario | alta | Revisar inventario |
| `inventory.out_of_stock` | inventario | alta | Revisar inventario |
| `inventory.high_rotation` | inventario | media | Revisar inventario |
| `inventory.no_movement` | inventario | baja | Revisar inventario |
| `orders.pending` | operacion | alta | Ver pedidos |
| `orders.delayed` | operacion | media | Ver pedidos |
| `sales.no_sales_today` | finanzas | media | Ver ventas |
| `sales.week_comparison` | finanzas | media | Ver ventas |
| `sales.month_comparison` | finanzas | media | Ver ventas |
| `sales.top_products` | inventario | media | Revisar inventario |
| `customers.outstanding` | clientes | alta | Cobrar clientes |
| `customers.inactive` | clientes | baja | Ver clientes |

Las reglas **se disparan solo cuando el monitor produce la observación**: si no
hay datos, no hay recomendación. Los insights puramente informativos (sin
`action`) se omiten para no interrumpir.

## Integración con el chat

En `use-assistant-chat.ts`:

- `startNewConversation` ya no muestra el saludo estático: consulta
  `/api/agent/proactive` y compone la bienvenida contextual
  (`loadProactiveWelcome`).
- Si hay hallazgos, además del texto del saludo se agrega un mensaje `rich`
  con las tarjetas `monitor` (`recommendationsToMonitorRich`) y sus acciones
  rápidas, reutilizando el `ConversationRenderer` de 5E.
- Si la consulta falla o no hay bienvenida, se cae al `WELCOME` estático.

## Guardrails verificados en tests

- Sin hallazgos → `hasFindings=false`, saludo neutro, **nunca** "tu negocio está bien".
- Toda recomendación tiene `insightId` real (evidencia, nunca inventada).
- Las acciones rápidas son texto semántico (sin tool names ni IDs).
- Caché por tienda: no se re-consulta el monitor por mensaje.
