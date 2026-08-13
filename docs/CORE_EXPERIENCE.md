# Panitas Core Experience (FASE 9B)

> **Fase:** 9B — Panitas Core Experience Redesign
> **Principio rector:** Panitas es una experiencia **asistente-primero**: el chat es el centro, los módulos son destinos de gestión y el agente habla el lenguaje del negocio. Solo frontend; cero cambios a lógica de negocio, DB o contratos de API.

---

## 1. IA de navegación

El sidebar ya no es una lista interminable. Cuatro secciones (gating por plan/rol intacto):

```
PANITAS IA
  Asistente            /dashboard
  Conversaciones       /dashboard/conversaciones
  Centro de Atención   /dashboard/atencion          (badge: situaciones abiertas)

NEGOCIO  (módulos núcleo)
  Inventario           /dashboard/products
  Ventas               /dashboard/pos
  Clientes             /dashboard/customers
  Reportes             /dashboard/analytics
  Finanzas             /dashboard/finanzas         (planes negocio/empresa)

MÁS MÓDULOS  (acordeón colapsable, abierto por defecto)
  Pedidos, Cupones, Documentos, Créditos, Cobranza IA, Proveedores,
  Empleados, Vendedores, Comisiones, Agenda, Nueva cita, Horarios, Servicios

CONFIGURACIÓN
  Editar tienda / perfil · Configuración · Ver Planes
```

- **Colapsado (solo iconos):** las secciones primarias muestran iconos; "Más módulos" se despliega plano (iconos) para que ningún módulo quede inalcanzable.
- **Estado activo:** `bg-muted text-foreground` con borde `border-border/80` (tokens, no grays).
- **Preferencia de colapso unificada:** un solo hook `useSidebarCollapsed` (`panitas:sidebar:collapsed`) usado por `DashboardShell` y `ImmersiveChatShell`. Colapsar en el home se recuerda en el resto del dashboard y viceversa.

## 2. Home (asistente-primero)

- `/dashboard` = chat a pantalla completa (`AnimatedAIChat`): saludo, sugerencias, input con `/`, historial lateral.
- **Saludo contextual (FASE 22/23):**
  - Primera visita (sin historial): `Buenos días, {nombre} 👋` + copy de bienvenida.
  - Regreso (hay conversaciones): `¿Qué necesitas revisar hoy? 👋` + copy de continuidad.
- **Sugerencias compartidas (FASE 3):** `assistant-suggestions.tsx` es el único lugar que define las 4 preguntas de arranque; la usan home (`variant="home"`) y panel flotante (`variant="panel"`).

## 3. Attention Center ↔ agente

- Cabecera: botón **"Preguntar a Panitas"** → abre el chat con `¿Qué situaciones requieren mi atención ahora mismo?`
- Por situación: botón **"Preguntar"** → abre el chat con el título de la situación como pregunta contextual.
- Sin lenguaje alarmista: "Tu negocio tiene X situaciones que requieren atención." / "Panitas filtra el ruido por ti."

## 4. Business Monitor ↔ agente

- **Un solo lugar por información (FASE 14):** los hallazgos se muestran en las tarjetas inteligentes; `BusinessSummaryView` se renderiza con `hideInsights` para no repetir "Puntos para revisar". Métricas, resumen y recomendaciones siguen visibles.
- Fetch único en el montaje (se eliminó el efecto duplicado).
- **Acciones de las tarjetas → chat:** en el BIC, `onMonitorAction` abre el chat con la acción semántica (`Ver detalle` → `openAssistant(...)`).
- Botón "Preguntar a Panitas" en el área de acciones (ya existía, se conserva).

## 5. Deep links chat ↔ módulos (FASE 25)

`QuickAction` acepta `href` opcional. Si está definido, el botón navega al módulo en vez de reenviarse al chat:

| Tarjeta | Acción con deep link | Ruta |
|--------|---------------------|------|
| Producto | Editar / Agregar stock | `/dashboard/products` |
| Pedido | Ver detalle | `/dashboard/orders` |
| Cliente | Historial | `/dashboard/customers` |

Implementado en `lib/conversational/action-factories.ts` (server) + `assistant/actions/quick-actions.tsx` (client, `render={<Link/>}`).

## 6. Design system compliance (FASE 41)

Superficies migradas a tokens: `border-border`, `bg-background`, `bg-muted/40`, `text-foreground`, `text-muted-foreground`, `bg-primary`, `shadow-subtle`. Sin grays/azules hardcodeados en las superficies del core (queda deuda puntual en `CORE_UX_DEBT.md`).

## 7. Dead code (FASE 52)

Eliminados los 11 componentes legacy del dashboard sin referencias: `ControlCenter`, `BusinessOverview`, `RecentOrdersWidget`, `DashboardTienda/Negocio/Empresa/Agenda`, `metric-card` (duplicado de design-system), `quick-actions`, `assistant-hero`, `ask-panitas`.

---

## Archivos tocados

| Archivo | Cambio |
|---------|--------|
| `src/components/layout/sidebar.tsx` | Nueva IA (PANITAS/NEGOCIO/Más/CONFIG), acordeón, tokens activos |
| `src/hooks/use-sidebar-collapsed.ts` | NUEVO — preferencia de colapso compartida |
| `src/components/layout/dashboard-shell.tsx` | Usa hook unificado |
| `src/components/layout/immersive-chat-shell.tsx` | Usa hook unificado + tokens |
| `src/app/dashboard/layout.tsx` | `bg-muted/40` + fallback con tokens |
| `src/app/dashboard/loading.tsx` | `border-primary` |
| `src/components/ui/animated-ai-chat.tsx` | Saludo contextual + sugerencias compartidas + tokens |
| `src/components/assistant/assistant-suggestions.tsx` | NUEVO — fuente única de sugerencias |
| `src/components/assistant/assistant-chat-view.tsx` | Usa sugerencias compartidas |
| `src/components/assistant/chat-history-sidebar.tsx` | Estado activo con tokens |
| `src/components/attention/attention-center.tsx` | "Preguntar a Panitas" (cabecera + por situación) |
| `src/components/assistant/business-monitor-section.tsx` | Dedupe (`hideInsights`), fetch único, tokens |
| `src/components/business/business-summary.tsx` | Prop `hideInsights` |
| `src/components/business-intelligence-center/bic-monitor-area.tsx` | `onMonitorAction` → chat |
| `src/lib/conversational-actions/types.ts` | `QuickAction.href` |
| `src/components/assistant/actions/quick-actions.tsx` | Renderiza deep links |
| `src/lib/conversational/action-factories.ts` | Deep links producto/pedido/cliente |
