# PANITAS — Estructura de Navegación

> Fecha: 02/08/2026 · Rama: `develop-v2` · FASE 2A
> Nueva organización del sidebar para **Panitas Negocios 2.0**.

---

## 1. Principio

La navegación debe organizarse por **tareas del negocio**, no por `planType` técnico (tienda/agenda/negocio/empresa). Ítems agrupados en secciones lógicas con íconos claros.

## 2. Nueva estructura de navegación (dashboard)

| # | Ítem | Ruta | Ícono (lucide) | Visible |
|---|---|---|---|---|
| 1 | **Inicio** | `/dashboard` | `Home` | Todos |
| 2 | **Ventas** | `/dashboard/pos` | `ShoppingCart` | Productos |
| 3 | **Productos** | `/dashboard/products` | `Package` | Productos |
| 4 | **Clientes** | `/dashboard/customers` | `Users` | Todos |
| 5 | **Tienda** | `/dashboard/store` | `Store` | Productos |
| 6 | **Conversaciones** | `/dashboard/conversations` | `MessageCircle` | **Solo PLUS** (bloqueado con badge) |
| 7 | **Analítica** | `/dashboard/analytics` | `BarChart3` | Todos |
| 8 | **Panitas IA** | `/dashboard/assistant` | `Sparkles` | Todos (UI) |
| 9 | **Configuración** | `/dashboard/settings` | `Settings` | Todos |

### Secciones agrupadas (visual)
```
INICIO
  Inicio
OPERACIÓN
  Ventas
  Productos
  Clientes
  Tienda
CRECIMIENTO
  Conversaciones (PLUS)
  Analítica
ASISTENTE
  Panitas IA
SISTEMA
  Configuración
```

### Accesos secundarios (menú "Más" / perfil)
- Pedidos → `/dashboard/orders`.
- Créditos → `/dashboard/creditos`.
- Empleados → `/dashboard/employees`.
- Vendedores → `/dashboard/sellers`.
- Comisiones → `/dashboard/commissions`.
- Cupones → `/dashboard/coupons`.
- Tickets → `/dashboard/tickets`.
- Agenda / Citas → `/dashboard/agenda`.
- Finanzas → `/dashboard/finanzas`.

## 3. BottomNav móvil

| Posición | Ítem | Ruta |
|---|---|---|
| 1 | Inicio | `/dashboard` |
| 2 | Ventas | `/dashboard/pos` |
| 3 | Productos | `/dashboard/products` |
| 4 | Clientes | `/dashboard/customers` |
| 5 | Más | menú (resto) |

> "Panitas IA" queda como **botón flotante** (FAB) en móvil para acceso 1-tap.

## 4. Ítems PLUS (Conversaciones)

- Visible en el sidebar para todos, pero con **badge "PLUS"** y estado bloqueado si el plan no lo incluye.
- Al hacer clic sin PLUS → dialog de upsell ("Disponible en Panitas Negocios Plus").
- En FASE 2A es UI: no existe lógica comercial definitiva; el flag se lee de una constante `FEATURE_FLAGS`.

## 5. Guía de implementación

- Modificar `getNavItems(planType)` en `sidebar.tsx` → nueva función `getNavItems(plan, features)`.
- Mantener rutas existentes (no romper links).
- Ítems legacy (servicios, horarios, nueva cita) se agrupan bajo "Agenda" dentro de "Más" o se conservan según `planType`.
- `bottom-nav.tsx` alineado con las 5 posiciones.

## 6. Decisiones FASE 2A

1. Se implementa la **estructura nueva** en el sidebar manteniendo todas las rutas existentes.
2. **Conversaciones** se muestra con badge PLUS y sin lógica de negocio (solo flag visual).
3. El router del agente (`src/lib/agent/router.ts`) no se toca; la navegación es UI.
