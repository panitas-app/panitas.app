# PANITAS NEGOCIOS — Dashboard Principal

> Fecha: 02/08/2026 · Rama: `develop-v2` · FASE 1D
> Diseño de la experiencia del centro de control. **No es un ERP.**

---

## 1. Principio de diseño

El dashboard es un **centro de control del día**, no un panel de métricas interminable. Responde a tres preguntas en menos de 5 segundos:

1. **¿Cómo va mi negocio hoy?**
2. **¿Qué necesita atención?**
3. **¿Qué hago ahora?**

Debe sentirse personal y conversacional, no como una tabla de datos.

---

## 2. Estructura del dashboard

```
┌──────────────────────────────────────────────────────┐
│ PANITAS        [Dashboard] [Ventas] [Inventario]     │  ← navegación
│                [Clientes] [Tienda] [Citas] ...  [💬] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Buenos días, Juan 👋                                │
│  Hoy es viernes. Tu negocio va así:                  │
│                                                      │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐       │
│  │ Ventas hoy │ │ Productos  │ │ Clientes   │       │
│  │   $350     │ │ vendidos 24│ │ nuevos   5 │       │
│  └────────────┘ └────────────┘ └────────────┘       │
│                                                      │
│  ⚠️ 3 productos con poco inventario                  │
│  ┌──────────────────────────────────────────────┐   │
│  │ ➜ "¿Quieres revisar tus productos bajos?"     │   │  ← acción recomendada
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  [Vender ahora]  [Crear producto]  [Ver tienda]      │  ← accesos rápidos
│                                                      │
│  [💬 Pregúntale a tu agente]                        │  ← interacción IA
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 3. Bloques del dashboard

### 3.1 Saludo contextual (arriba)
- Nombre del dueño + momento del día.
- Fecha y día de la semana.
- 1 frase de resumen: *"Hoy llevas $350 en ventas."*

### 3.2 Métricas principales (3 tarjetas)
| Tarjeta | Contenido | Fuente |
|---|---|---|
| Ventas hoy | monto del día (+% vs ayer) | `SalesService.summary` |
| Productos vendidos | unidades vendidas hoy | `sales` |
| Clientes nuevos | clientes creados hoy | `customer.created` |

> Solo 3 tarjetas. El detalle vive en los módulos, no en el dashboard.

### 3.3 Alertas (priorizadas)
- **Stock bajo** (umbral configurable) → evento `inventory.low_stock`.
- **Pedidos sin confirmar** (tienda online).
- **Citas de hoy** (agenda).
- **Suscripción** (plan, días restantes).
- **Clientes interesados sin seguimiento** (PLUS).

Regla: máximo 3 alertas visibles; la más urgente primero. Todas clicables.

### 3.4 Acción recomendada (1 sola, inteligente)
Una CTA por vista según contexto:
- Si hay stock bajo → *"¿Quieres revisar tus productos bajos?"*
- Si hay pedido sin confirmar → *"Hay 2 pedidos esperando confirmación."*
- Si no hay nada urgente → *"¿Quieres que te resuma la semana?"*

El agente decide la acción según el contexto del negocio (reglas + IA).

### 3.5 Accesos rápidos
- [Vender ahora] → POS.
- [Crear producto] → alta rápida con escáner.
- [Ver tienda] → vista pública.
- [Nuevo ticket] → órdenes de trabajo (si aplica).

### 3.6 Interacción con el agente
- **Campo siempre visible** *"Pregúntale a tu agente…"*.
- Ejemplos según rol/plan: *"¿Cuánto vendí esta semana?"*, *"¿Qué producto tengo que reabastecer?"*.
- Las respuestas del agente pueden abrir el módulo relevante ("ver producto").
- En PLUS, el botón **💬** abre el centro de comunicación.

---

## 4. Variante por rol (usa permisos de FASE 1C)

| Rol | Dashboard |
|---|---|
| Admin / Dueño | Completo: métricas, alertas, recomendación IA |
| Manager | Igual, sin datos sensibles de facturación |
| Vendedor (seller) | Solo POS + "vender ahora" + ventas del día |
| Asistente | Inventario + agenda + clientes |

---

## 5. Comportamiento (estados)

| Estado | Comportamiento |
|---|---|
| Carga | Skeleton del layout (no spinner gigante) |
| Sin datos | Mensaje + onboarding: "Crea tu primer producto" |
| Error | Bloque con reintentar (error boundary) |
| Vacío por módulo | Card "Empezar" con acceso directo |
| Fin de día | Saludo de resumen "Resumen del día" |

---

## 6. Fuentes de datos (infraestructura ya preparada)

| Bloque | Servicio / evento |
|---|---|
| Ventas hoy, productos, clientes | `SalesService.summary` / `SalesService.recent` |
| Stock bajo | evento `inventory.low_stock` + `InventoryService.list` |
| Clientes nuevos | evento `customer.created` |
| Ventas nuevas | evento `sale.created` |
| Pedidos tienda | evento `order.created` |
| Acción recomendada | reglas + agente (`router` → tool) |

---

## 7. Lo que NO debe aparecer

- Gráficos decorativos sin acción.
- Métricas en cascada sin jerarquía.
- Tablas del ERP (el detalle vive en los módulos).
- Más de 3 alertas a la vez.
- Opciones de administración para el rol vendedor.
