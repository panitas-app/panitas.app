# Auditoría de la Experiencia Core (FASE 9B · Etapa 1)

> **Fase:** 9B — Panitas Core Experience Redesign
> **Alcance:** Experiencia "asistente-primero" — chat como centro, sidebar con nueva IA, historial integrado, Attention Center y Business Monitor conectados al agente, deep links bidireccionales chat↔módulos.
> **Regla:** SOLO frontend (UX, navegación, interacción, layout, composición). Sin cambios a business logic, DB ni contratos de API.

---

## 1. Superficies evaluadas

| # | Superficie | Archivos núcleo |
|---|-----------|-----------------|
| 1 | Home del dashboard | `src/app/dashboard/page.tsx`, `ui/animated-ai-chat.tsx` |
| 2 | Panel flotante del asistente | `assistant/assistant-chat-view.tsx`, `assistant-provider.tsx` |
| 3 | Sidebar / navegación | `layout/sidebar.tsx`, `layout/dashboard-shell.tsx`, `layout/immersive-chat-shell.tsx` |
| 4 | Conversation History | `assistant/chat-history-sidebar.tsx`, `hooks/use-assistant-chat.ts` |
| 5 | Attention Center | `attention/attention-center.tsx`, `attention/attention-monitor-card.tsx` |
| 6 | Business Monitor | `assistant/business-monitor-section.tsx`, `business/business-summary.tsx` |
| 7 | AI cards / quick actions | `assistant/actions/quick-actions.tsx`, `lib/conversational/action-factories.ts` |
| 8 | Topbar | `layout/topbar.tsx` |

---

## 2. Hallazgos por superficie

### 2.1 Home — YA es chat-first ✅
- `/dashboard` renderiza `AnimatedAIChat` (saludo por hora + nombre, 4 sugerencias, input con `/`, historial lateral). El objetivo FASE 3 ya está cumplido en estructura.
- **Problemas:** grays hardcodeados (`border-gray-200`, `text-gray-900`, `bg-white`) fuera de tokens; copy de saludo no distingue primera visita vs. regreso; sugerencias duplicadas entre home y panel flotante.

### 2.2 Panel flotante del asistente
- `AssistantChatView` duplica la lista de sugerencias y el layout del historial (idéntico al home). Mismo problema de grays en estado activo del historial.

### 2.3 Sidebar / navegación
- Estructura legacy `Módulos` con ~16 items → contradice FASE 9 ("No convertir el sidebar en una lista interminable").
- Estado activo con `bg-gray-100 text-gray-900` (gris, fuera de tokens).
- **Colapso duplicado:** `DashboardShell` persiste `panitas:sidebar:collapsed`; `ImmersiveChatShell` persiste `panitas:immersive:collapsed`. Colapsar en un lugar no se recuerda en el otro.
- `ImmersiveChatShell` y `dashboard/layout.tsx` usan `bg-[#F7F7F8]` hardcodeado.
- `loading.tsx` usa `#184BBF` (azul legacy).

### 2.4 Conversation History
- Funcionalidad completa (crear, abrir, buscar, renombrar, eliminar). Estado activo con gray hardcodeado.

### 2.5 Attention Center
- Feature completo y bien estructurado (tabs, grupos, acciones resolver/posponer/visto/descartar, dialogs).
- **Falta la conexión con el agente:** ningún punto "Preguntar a Panitas" por situación ni en cabecera → la situación no llega al chat.
- Lenguaje de estado ya es calmado (no alarmista). ✅

### 2.6 Business Monitor
- **Duplicación de información (FASE 14):** las tarjetas inteligentes (`summaryToMonitorCards`) y `BusinessSummaryView` muestran los mismos hallazgos ("Puntos para revisar") dos veces.
- Fetch montado + `load()` duplicados en efectos.
- Grays hardcodeados en sección.
- Las acciones de las tarjetas (`Ver detalle`) NO llegan al chat en el BIC (`onMonitorAction` no conectado).

### 2.7 AI cards / quick actions
- `QuickAction` no soporta deep links: todas las acciones reenvían texto al chat, ninguna abre el módulo referenciado (FASE 25).

### 2.8 Topbar
- No auditada en profundidad; se conserva. Se registra pendiente en `CORE_UX_DEBT.md`.

### 2.9 Dead code
- Componentes legacy del dashboard sin imports: `ControlCenter`, `BusinessOverview`, `RecentOrdersWidget`, `DashboardTienda/Negocio/Empresa/Agenda`, `metric-card` (duplica el de design-system), `quick-actions`, `assistant-hero`, `ask-panitas`. Verificados sin referencias externas.

---

## 3. Problema → Estado actual → Estado deseado

| Superficie | Problema | Actual | Deseado (FASE) |
|-----------|----------|--------|----------------|
| Sidebar | Lista interminable + IA desordenada | 3 grupos: Panitas IA / Módulos(16) / Config | PANITAS · NEGOCIO · Más módulos · CONFIG (F2/8/9) |
| Colapso | Dos claves de persistencia | `panitas:sidebar` vs `panitas:immersive` | Una sola preferencia compartida (F8/9) |
| Home | Copy no contextual + duplicación | Saludo fijo, sugerencias x2 | Saludo primera-visita/regreso + sugerencias compartidas (F3/22/23) |
| Tokens | Grays y azul legacy | `gray-*`, `#F7F7F8`, `#184BBF` | `border-border`, `bg-background`, `bg-primary` (F41) |
| Attention | No conectado al chat | Acciones locales | "Preguntar a Panitas" por situación + cabecera (F10/13) |
| Monitor | Hallazgos duplicados + sin chat | Cards + lista dos veces | Un solo lugar + `onMonitorAction`→chat (F12-14) |
| Quick actions | Sin deep links | Todo reenvía texto | `href` opcional → módulo (F25) |
| Dead code | Confusión + duplicados | 11 archivos legacy | Eliminados (F52) |

---

## 4. Verificación de la auditoría

- Grep de imports de componentes legacy: solo auto-referencias (`control-center` ← `metric-card`/`ask-panitas`). Cero imports externos → seguros de eliminar.
- `AssistantProvider` envuelve todo `/dashboard` (`layout.tsx`) → `useAssistant()` disponible en Attention Center y Monitor.
- `Button` de Base UI usa `render` (no `asChild`) → los deep links de `QuickActions` usan `render={<Link/>}`.

---

## 5. Resultado

El núcleo ya era 60% "asistente-primero" (home = chat). La FASE 9B consistió en: consolidar la IA del sidebar, unificar preferencias de colapso, conectar Attention Center y Business Monitor al chat, habilitar deep links, eliminar duplicación y migrar superficies a tokens. Detalle de implementación en `CORE_EXPERIENCE.md`.
