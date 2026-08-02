# PANITAS — Dashboard UX (Centro de Control)

> Fecha: 02/08/2026 · Rama: `develop-v2` · FASE 2A
> Rediseño del dashboard: de ERP a **CENTRO DE CONTROL DEL NEGOCIO**.

---

## 1. Principio

El dashboard debe responder en 5 segundos: **¿cómo va mi negocio hoy? ¿qué necesita atención? ¿qué hago ahora?**
No es un ERP: no hay tablas densas ni 20 KPIs. Hay 3 métricas, 1 alerta priorizada, 1 acción recomendada y un lugar para hablar con Panitas.

## 2. Estructura (desktop)

```
┌──────────────────────────────────────────────────────────────┐
│ Header:  Buenos días, Juan 👋   [fecha]  [Panitas IA] [💬]    │
├──────────────────────────────────────────────────────────────┤
│  RESUMEN                                                     │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐       │
│  │  Ventas hoy   │ │  Productos    │ │  Clientes     │       │
│  │     $350      │ │  vendidos 25  │ │  nuevos 8     │       │
│  └───────────────┘ └───────────────┘ └───────────────┘       │
│                                                              │
│  ⚠️ ALERTAS: 5 productos con bajo inventario                 │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  ➜ "¿Quieres revisar tus productos bajos?"           │    │  ← acción recomendada
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ASISTENTE                                                   │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  [ ¿Qué quieres saber de tu negocio?            ] ✨  │    │  ← "Pregúntale a Panitas"
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ACCESOS RÁPIDOS                                             │
│  [Vender ahora] [Crear producto] [Ver tienda] [Nuevo ticket] │
└──────────────────────────────────────────────────────────────┘
```

## 3. Bloques

### 3.1 Header contextual
- Saludo por hora: "Buenos días / Buenas tardes / Buenas noches, {nombre} 👋"
- Fecha legible (ej. "Viernes, 2 de agosto").
- Botón **Panitas IA** (abre asistente lateral/flotante) y acceso a plan.

### 3.2 Resumen (3 tarjetas)
| Tarjeta | Dato | Fuente de datos |
|---|---|---|
| Ventas hoy | monto del día (+Δ% vs ayer) | `SalesService.summary` |
| Productos vendidos | unidades hoy | `SalesService.recent` / orders |
| Clientes nuevos | creados hoy | evento `customer.created` |

Diseño: número grande + label + mini indicador (↑/↓). Sin gráfico pesado.

### 3.3 Alertas (máx. 3, priorizadas)
- Stock bajo → `inventory.low_stock`.
- Pedidos sin confirmar → `order.created`.
- Citas de hoy → `appointment.created`.
- Clientes interesados sin seguimiento (PLUS).
- Suscripción próxima a vencer.

### 3.4 Acción recomendada (1 sola)
CTA inteligente según contexto:
- Stock bajo → "¿Quieres revisar tus productos bajos?" → `/dashboard/products`.
- Pedido pendiente → "Hay 2 pedidos esperando" → `/dashboard/orders`.
- Día normal → "¿Quieres que te resuma tu semana?" → abre asistente.

### 3.5 Pregúntale a Panitas (componente visual)
Campo siempre visible con placeholder **"¿Qué quieres saber de tu negocio?"**.
- **En FASE 2A es UI preparada** (placeholder + ícono + "próximamente" si no hay agente conectado). No ejecuta IA.
- Estado futuro: al enviar, abre el panel del asistente (FASE 2B).

### 3.6 Accesos rápidos
- Vender ahora → `/dashboard/pos`.
- Crear producto → `/dashboard/products/new`.
- Ver tienda → `/{slug}`.
- Nuevo ticket → `/dashboard/tickets` (si aplica).

---

## 4. Estructura (móvil)

- Tarjetas de métricas apiladas (full-width, tocables).
- Alertas como filas deslizables.
- "Pregúntale a Panitas" anclado arriba (sticky) para acceso 1-tap.
- BottomNav con: Inicio · Ventas · Productos · Clientes · Más.

## 5. Variantes por rol (basado en permisos FASE 1C)

| Rol | Visibilidad |
|---|---|
| Admin / Dueño | Completo |
| Manager | Completo salvo facturación |
| Vendedor | POS + ventas del día + "Vender ahora" |
| Asistente | Inventario + agenda + clientes |

## 6. Componentes propuestos

| Componente | Ruta | Rol |
|---|---|---|
| `ControlCenter` | `components/dashboard/control-center.tsx` | Wrapper del centro de control |
| `GreetingHeader` | `components/dashboard/greeting-header.tsx` | Saludo + fecha + accesos IA/plan |
| `MetricCard` | `components/dashboard/metric-card.tsx` | Tarjeta métrica (número + Δ) |
| `AlertList` | `components/dashboard/alert-list.tsx` | Alertas priorizadas |
| `RecommendedAction` | `components/dashboard/recommended-action.tsx` | CTA inteligente |
| `AskPanitas` | `components/dashboard/ask-panitas.tsx` | Campo "Pregúntale a Panitas" (UI) |
| `AssistantPanel` | `components/assistant/assistant-panel.tsx` | Panel lateral del asistente (UI) |

## 7. Decisiones FASE 2A

1. El centro de control se construye **encima** del dashboard actual sin eliminar módulos (los 4 dashboards legacy se consolidan en FASE 2B; en 2A se introduce el wrapper visual).
2. "Pregúntale a Panitas" y el panel del asistente son **100% visuales** (sin llamadas IA).
3. Las métricas reutilizan `SalesService` y eventos ya existentes.
