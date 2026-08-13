# FASE 9E — Auditoría de Pulido de Producto (Polish Audit)

*Estado: COMPLETADA — auditados A01–A19; 14 corregidos, 5 mantener (decisión registrada), 0 pendientes*
*Alcance: refinamiento transversal de UX/UI/microinteracciones/microcopy/estados/percepción del producto*
*NO agrega funcionalidades nuevas. Preserva decisiones 9A–9D.*

---

## 1. Método

1. **Walkthrough del producto** (FASE 1): recorrido de rutas del dashboard, componentes chrome (sidebar/topbar/layout), primitivos de estado y chat IA.
2. Registro de hallazgos por severidad **P0–P4** con evidencia `archivo:línea`.
3. Correcciones por **lotes (Batches)** con regresión completa al cierre de cada lote (typecheck + lint + vitest + build).
4. Puntuación final 1–5 (product feel) y reporte `PHASE_9E_REPORT.md`.

**Inventario revisado:**
- Rutas dashboard: `agenda, analytics, assistant, atencion, automations, collection, commissions, conversaciones, coupons, creditos, crm, customers, edit-profile, employees, finanzas, horarios, knowledge, memoria, orders, pos, products, reports, sellers, servicios, settings, suppliers`
- Primitivos de estado: `src/components/ui/{empty-state,loading-state,error-state}.tsx`
- Primitivos UI: `button.tsx`, `card.tsx`, `animated-ai-chat.tsx`
- Chrome: `src/app/dashboard/layout.tsx`, `src/app/dashboard/dashboard-chrome.tsx`, `src/components/layout/{sidebar,topbar}.tsx`
- Chat: `src/components/assistant/{chat-input,chat-message,chat-thinking,assistant-suggestions,chat-history-sidebar}.tsx`
- Estilos globales: `src/app/globals.css`

---

## 2. Hallazgos

> Severidad: **P0** bloquea percepción/correctez → **P1** alto impacto → **P2** medio → **P3** menor → **P4** informativo.
> Estado: `abierto` → `corregido` → `mantener` (decisión registrada) → `pendiente`.

| ID | Sev | Fase / Área | Hallazgo | Evidencia | Acción | Estado |
|----|-----|-------------|----------|-----------|--------|--------|
| A01 | P0 | FASE 22 — Errores | El fallback del layout de dashboard fuga `e.message` crudo (posible stack/internals) al usuario. | `src/app/dashboard/layout.tsx` | Copy calmado + accionable, sin `e.message`; botón "Volver a intentar" (reload) + "Volver al inicio". | `corregido` |
| A02 | P1 | Percepción producto | Badge **"Beta"** en el home del chat: comunica producto inacabado. | `src/components/ui/animated-ai-chat.tsx` | Eliminar badge. | `corregido` |
| A03 | P1 | Microcopy / Marca | Emojis 👋 en saludo del chat: tono genérico de chatbot, no gerente empresarial. | `src/components/ui/animated-ai-chat.tsx` | Eliminar emojis; saludo limpio "Buenos días, [nombre]". | `corregido` |
| A04 | P1 | Marca / Consistencia | "Panitas IA" como nombre visible (h1 chat, botón topbar, sección sidebar). Panitas es asistente/gerente, no "IA genérica". | `animated-ai-chat.tsx`, `topbar.tsx`, `sidebar.tsx`, `assistant/page.tsx`, `assistant-panel.tsx`, `inbox/*`, `design-system/page.tsx` | Renombrar toda la superficie visible a "Panitas" (incluye inbox, panel, design-system). 0 referencias restantes. | `corregido` |
| A05 | P2 | Botones / Feedback | Botón enviar del chat se deshabilita sin indicador mientras procesa (no comunica "estoy trabajando"). | `src/components/assistant/chat-input.tsx` | Mostrar spinner (`Loader2`) en estado busy. | `corregido` |
| A06 | P2 | Animaciones | Wobble de icono aplicado globalmente a **todos** los iconos en hover (`icon-wobble`). Ruido; no "premium por claridad". | `src/app/globals.css` | Eliminar el bloque universal; mantener clases opt-in (`icon-hover-spin/bounce/pulse`). | `corregido` |
| A07 | P3 | Alertas / Lenguaje | Botón de plan usa `animate-pulse` permanente (renovar/activar): parpadeo dramático continuo. | `topbar.tsx` | Quitar `animate-pulse`; mantener color primario llamativo (color con propósito, sin animación continua). | `corregido` |
| A08 | P3 | Decoración | Orbes de blur decorativos en el fondo del chat. Sutiles, sin animación; respetan `prefers-reduced-motion`. | `animated-ai-chat.tsx:73-77` | Mantener (decisión: espacio vacío + blur sutil = claridad; sin animación). | `mantener` |
| A09 | P3 | Estados loading | "Cargando conversación…" es texto plano; puede ser skeleton sutil. | `animated-ai-chat.tsx`, `chat-history-sidebar.tsx` | Skeleton de mensajes (`animate-pulse` con `prefers-reduced-motion` cubierto) en historial y carga de conversación. | `corregido` |
| A10 | P3 | Toasts | ~454 usos de `toast` en el codebase. No es problema en sí; auditar duplicación/ambigüedad y patrón según importancia (FASE 12). | global | Auditoría puntual en módulos clave; no sustituir masivamente. Patrón actual aceptable (toasts transitorios con copy controlado en módulos 9C). | `mantener` |
| A11 | P4 | Chat a11y | `animate-ping` en dot de tasa BCV y `ChatThinking` respetan reduced-motion vía override global. | `topbar.tsx`, `chat-thinking.tsx` | Mantener. | `mantener` |
| A12 | P3 | Microcopy estados | Revisar que todos los módulos usen primitivos de estado (`empty-state`/`loading-state`/`error-state`) con microcopy "¿Qué ocurre? ¿Qué puedo hacer?". | módulos dashboard | Verificados estados/empty/loading en módulos clave (atencion, conversaciones, knowledge, finanzas); primitivos reutilizados donde aplica; error boundaries unificados (A15). | `corregido` |
| A13 | P2 | Chat home | Encabezado con dos botones secundarios (Historial + Nueva) — acciones de utilidad, no competidoras. Correcto según "una acción principal". | `animated-ai-chat.tsx` | Mantener. | `mantener` |
| A14 | P4 | Navegación | Sidebar sin sobrecarga (sin badges innecesarios); colapso unificado 9B. Foco visible presente. | `sidebar.tsx` | Añadido `focus-visible:ring-2 ring-primary/60` a items de navegación (aplica a estado colapsado). Contraste verificado. | `corregido` |
| A15 | P0 | FASE 22 — Errores | Los 4 `error.tsx` (root, dashboard, store, admin) fugaban `error.message` crudo al usuario y usaban colores hardcoded. | `src/app/{error,dashboard/error,store/error,admin/error}.tsx` | Reutilizar `ErrorState` con copy calmado, sin `e.message`, botón "Intentar nuevamente". | `corregido` |
| A16 | P2 | Tokens | Headings/páginas legacy con hex hardcoded (`#102A43`, `slate-900`, `#050505`, `#184BBF`) y `text-accent` (amarillo) como color de H1. | `servicios, crm, agenda, agenda/nueva, automations, horarios, products/new, products/[id]/edit, sellers, employees, commissions` | Migrar a tokens `text-foreground`/`text-primary`. Resto del codebase (~850 clases de color legacy en storefront/superficies públicas) documentado como deuda P4, fuera del alcance de pulido. | `corregido` |
| A17 | P1 | Marca / Consistencia | `/dashboard/assistant` mostraba "Panitas IA" como h1 (quedaba una superficie visible sin renombrar). | `src/app/dashboard/assistant/page.tsx:41` | Renombrar a "Panitas". | `corregido` |
| A18 | P2 | Tokens | Colores semánticos raw de paleta (`text-emerald-600`, `text-rose-600`, `text-sky-600`, `bg-red-100`, etc.) en BIC y finanzas (KPIs, gráficos, chips de prioridad/tone, barras, deltas). | `bic-financial-area.tsx`, `bic-analysis-area.tsx`, `bic-shared.tsx`, `financial/{kpi-grid,executive-summary,financial-types}.tsx`, `finanzas/page.tsx` | Migrar a tokens `success` / `destructive` / `warning` / `info` (semántica DS). | `corregido` |
| A19 | P3 | Estados | `analytics-content.tsx` muestra error de carga con copy calmado sin botón de reintento. Navegación disponible como recurso; carga principal no bloquea. | `src/app/dashboard/analytics/analytics-content.tsx:79-85` | Mantener (copy calmo y no-técnico aceptable para fallo de carga full-page). | `mantener` |

---

## 3. Decisión de producto (guía aplicada)

- **Premium por claridad, no por decoración**: menos animaciones automáticas, más estados claros.
- **Color con propósito**: naranja = acción/identidad; verde/ámbar solo para estados que lo ameriten.
- **Panitas es gerente, no chatbot**: microcopy directo y profesional; sin "IA" en superficie visible.
- **Confirmar solo cuando hay riesgo real**: no confirmar acciones triviales; no usar toast para todo.
- **Errores calmados y accionables**: nunca códigos internos ni stack traces.
- **Tokens únicamente**: sin hex hardcoded en superficies de producto; deuda legacy documentada, no migrada masivamente.

---

## 4. Progreso de lotes

| Lote | Alcance | Estado |
|------|---------|--------|
| A | A01–A06 (P0/P1/P2 percepción + microinteracción) | ✅ COMPLETADO (regresión PASS: typecheck, lint 0 errores, 1432 tests, build) |
| B | A07–A17 (microcopy estados, topbar, módulos, tokens, error boundaries) | ✅ COMPLETADO (regresión PASS: typecheck, lint 0 errores, 1432 tests, build) |
| C | Fases 36–41 (home, monitor, reports/finanzas, navegación) | ✅ COMPLETADO (regresión PASS: typecheck, lint 0 errores, 1432 tests, build; home=chat pulido A–B, monitor lenguaje calmado, finanzas/reports tokens semánticos, navegación A14) |
| D | Regresión final + docs + scoring | ✅ COMPLETADO — 9E cerrada. Ver `PHASE_9E_REPORT.md` (scoring global 4.8/5). |
