# FASE 9B — Panitas Core Experience Redesign · Reporte

> **Estado:** ✅ COMPLETADA · **Regresión:** PASS (tsc / lint / vitest / build)
> **Principio:** experiencia asistente-primero; SOLO frontend (UX, navegación, layout, composición). Cero cambios a lógica de negocio, DB o contratos de API.

---

## Qué se hizo

### 1. Sidebar con nueva IA (FASE 2/8/9)
- Estructura: **PANITAS IA** (Asistente · Conversaciones · Atención) → **NEGOCIO** (Inventario · Ventas · Clientes · Reportes · Finanzas) → **Más módulos** (acordeón colapsable, abierto por defecto) → **CONFIGURACIÓN**.
- "Más módulos" colapsado muestra iconos planos para no dejar módulos inalcanzables.
- Estado activo por tokens (`bg-muted`, `border-border/80`), sin grays.

### 2. Colapso del sidebar unificado
- Nuevo hook `useSidebarCollapsed` (`panitas:sidebar:collapsed`) compartido por `DashboardShell` y `ImmersiveChatShell`. Se eliminaron las dos claves separadas.

### 3. Home contextual (FASE 3/22/23)
- Saludo contextual: primera visita vs. regreso (`¿Qué necesitas revisar hoy? 👋`).
- Sugerencias compartidas en `assistant-suggestions.tsx` (único lugar) para home y panel.

### 4. Attention Center ↔ agente (FASE 10/13)
- "Preguntar a Panitas" en cabecera y por situación → abre el chat con contexto.

### 5. Business Monitor ↔ agente (FASE 12/13/14)
- `hideInsights` elimina la duplicación de hallazgos (cards inteligentes = lugar principal).
- Fetch único; `onMonitorAction` → chat en el BIC.

### 6. Deep links chat ↔ módulos (FASE 25/26)
- `QuickAction.href` opcional; producto/pedido/cliente navegan al módulo. `render={<Link/>}` (Base UI).

### 7. Design system compliance (FASE 41)
- `bg-[#F7F7F8]`→`bg-muted/40`, `#184BBF`→`border-primary`, grays→tokens en shells, layout, loading, home, historial y monitor.

### 8. Dead code (FASE 52)
- Eliminados 11 componentes legacy sin referencias (verificado por grep): `ControlCenter`, `BusinessOverview`, `RecentOrdersWidget`, `DashboardTienda/Negocio/Empresa/Agenda`, `metric-card`, `quick-actions`, `assistant-hero`, `ask-panitas`.

---

## Regresión

| Check | Comando | Resultado |
|-------|---------|-----------|
| Typecheck | `npm run typecheck` | ✅ 0 errores |
| Lint | `npm run lint` | ✅ 0 errores (410 warnings pre-existentes) |
| Tests | `npm test` | ✅ 1427/1427 (164 archivos) — baseline intacto |
| Build | `npm run build` | ✅ Compiled successfully (1 warning pre-existente: `bcv/fetcher.ts` edge runtime) |

> Nota: 2 `EnvironmentTeardownError` de vitest en `inventory.service.test.ts` al cerrar el runner: pre-existentes (baseline 1427), ajenos a los cambios 9B. Registrados en `CORE_UX_DEBT.md`.

---

## Docs creados/actualizados

- `docs/CORE_EXPERIENCE_AUDIT.md` — auditoría problema/actual/deseado por superficie.
- `docs/CORE_EXPERIENCE.md` — spec de la experiencia asistente-primero implementada + archivos tocados.
- `docs/CORE_UX_DEBT.md` — deuda UX residual (topbar, unificación de chat, dark mode, QA responsive/a11y).

## Sin cambios de lógica
No se modificó: business logic, schema Prisma, API routes, contratos de herramientas del agente ni motor conversacional. Los cambios son aditivos (props opcionales `href`, `hideInsights`) o de composición/superficie.

## Siguiente paso
FASE 9C (por definir). No comenzar hasta confirmar 9B estable en ejecución manual del dashboard (home, sidebar colapsado/móvil, Attention Center, Reportes → Monitor, chat flotante).
