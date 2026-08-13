# FASE 9D — Auditoría Responsive, Accesibilidad y Visual QA

*Fecha: 13/08/2026 — Consolidado retrospectivo*
*Alcance: verificación transversal de todo el frontend construido hasta FASE 9C*
*Método: auditoría de código + walkthrough de rutas; sin funcionalidades nuevas*

---

## 1. Contexto

La FASE 9D fue definida como auditoría transversal (responsive, accesibilidad, consistencia
visual, performance y regresión). Parte de su trabajo técnico fue absorbido por 9A–9C y por la
auditoría de 9E (finalizada; los pendientes transferidos V04/V05/B01 fueron cerrados). Este
documento consolida los hallazgos con evidencia
`archivo:línea`, marca su estado y sirve de base a los guidelines y al reporte final.

**Leyenda de estado:** `corregido` · `aplicado` (ya presente en el código) · `pendiente` · `mantener` (decisión registrada) · `documentado` (limitación del entorno)

---

## 2. Hallazgos

| ID | Sev | Módulo | Pantalla | Problema | Causa | Solución | Estado |
|----|-----|--------|----------|----------|-------|----------|--------|
| R01 | P2 | Chrome | Fallback layout dashboard | El fallback muestra `e.message` crudo (detalles técnicos/stack) | `src/app/dashboard/layout.tsx:42` imprimía `{e?.message}` | Copy calmado + accionable, botón "Volver a intentar" (reload) y "Volver al inicio"; sin mensajes técnicos | `corregido` (9E A01) |
| R02 | P3 | Chrome | Topbar | Botones de acción ocultos en <sm/md (Panitas, Compartir, QR, Ver tienda, plan) | Estrategia de `hidden sm:flex / md:flex` | Correcto: ocultar antes que romper; las acciones clave (avatar, menú) permanecen en mobile | `mantener` |
| R03 | P2 | Chat | Chat input (mobile) | Riesgo de input tapado por teclado virtual / safe areas | Input dentro del flujo (no fixed); `safe-top` aplicado en topbar | Verificar en dispositivo real; el input usa `flex-1` y no queda tras el sidebar | `pendiente` (requiere dispositivo real — limitación de entorno) |
| R04 | P3 | Chat | Fondo del chat | Orbes de blur decorativos (`blur-[128px]`) | Decoración heredada de FASE 5C | Sutiles y sin animación; respetan `prefers-reduced-motion` | `mantener` |
| R05 | P2 | Tablas | Módulos legacy | Tablas no adaptadas con stacking podían quedar ilegibles | Patrón inconsistente antes de 9C | Stacking responsive vía `data-label` en `globals.css:315-349`; módulos 9C migrados a cards/responsive | `aplicado` |
| R06 | P3 | Navegación | Sidebar móvil | Drawer móvil (overlay) depende de gestión de estado local | `useSidebarCollapsed` unificado en 9B | Drawer con backdrop, cierre por click fuera y botón | `aplicado` |
| A01 | P1 | Accesibilidad | Estados de error | Errores técnicos visibles al usuario final | `e.message` en fallback (ver R01) | Sin detalles técnicos; mensajes calmados y accionables | `corregido` |
| A02 | P2 | Accesibilidad | Animaciones | Wobble automático en hover de **todos** los iconos (`icon-wobble`) | `globals.css:543-552` aplicaba animación universal | Eliminado el bloque universal; quedan clases opt-in (`icon-hover-spin/bounce/pulse`) | `corregido` (9E A06) |
| A03 | P2 | Accesibilidad | Alertas | `animate-pulse` permanente en botón de plan (parpadeo dramático) | `topbar.tsx:58,70,97` | Eliminado `animate-pulse`; color primario fuerte sin animación continua | `corregido` (9E A07) |
| A04 | P2 | Accesibilidad | Interacción | Botón enviar sin feedback mientras procesa | `chat-input.tsx:278-286` solo deshabilitaba | Spinner `Loader2` + `aria-busy` en estado busy | `corregido` (9E A05) |
| A05 | P3 | Accesibilidad | Focus | Foco visible en controles | Primitivo `button.tsx` con `focus-visible` | Verificado en primitivos base; reutilizado en módulos | `aplicado` |
| A06 | P2 | Accesibilidad | Reduced motion | Animaciones no esenciales en `prefers-reduced-motion` | `globals.css:608` override global `!important` | Desactiva duración/iteraciones de animaciones y transiciones | `aplicado` |
| A07 | P3 | Accesibilidad | Iconos | Botones de solo icono sin nombre accesible | Uso puntual sin `aria-label` | Chat input y controles clave ya tienen `aria-label`; verificar el resto | `aplicado` |
| V01 | P1 | Consistencia | Marca | "Panitas IA" como nombre visible (chat h1, topbar, sidebar) | Etiquetado heredado | Renombrado a "Panitas" (asistente/gerente, no chatbot genérico) | `corregido` (9E A04) |
| V02 | P1 | Percepción | Home chat | Badge "Beta" comunica producto inacabado | `animated-ai-chat.tsx:89-91` | Badge eliminado | `corregido` (9E A02) |
| V03 | P1 | Microcopy | Home chat | Emojis 👋 en saludo (tono chatbot) | `animated-ai-chat.tsx:142-143` | Saludo limpio y profesional | `corregido` (9E A03) |
| V04 | P2 | Estados | Loading | "Cargando conversación…" como texto plano | `animated-ai-chat.tsx` | Migrado a skeleton sutil (mensajes con `animate-pulse`, reduced-motion cubierto) | `corregido` (9E A09) |
| V05 | P2 | Estados | Módulos | Consistencia de empty/loading/error states | Primitivos `empty-state`/`loading-state`/`error-state` | Aplicado en módulos restantes; error boundaries unificados sin `e.message` | `corregido` (9E A12) |
| P01 | P3 | Performance | Global | 403 warnings de lint pre-existentes (0 errores) | `no-explicit-any`, `react-hooks/set-state-in-effect`, `no-img-element` | Documentado; no bloqueante | `documentado` |
| P02 | P3 | Performance | Imágenes | Varios `<img>` legacy (LCP/bandwidth) | Plantillas store y catálogos | Migración a `next/image` diferida (no bloqueante) | `pendiente` (deuda diferida a FASE 10A) |
| P03 | P3 | Performance | Build | Warning pre-existente Turbopack "Ecmascript file had an error" + `bcv/fetcher.ts` edge | — | Build exitoso (exit 0); documentado | `documentado` |
| B01 | P4 | Navegación | Sidebar | Foco/contraste en estado colapsado (solo iconos) | `sidebar.tsx` | `focus-visible:ring` añadido a items de navegación (aplica a colapsado); contraste verificado | `corregido` (9E A14) |
| B02 | P4 | Navegación | Drawers/Modales | Focus trap y retorno de foco en cierre | Base UI `Dialog`/`DropdownMenu` | Gestionado por Base UI; verificación manual puntual | `aplicado` |

---

## 3. Cobertura de fases 9D

| Fase 9D | Estado |
|---------|--------|
| F1 Auditoría global | ✅ consolidada en este documento |
| F2–F3 Responsive / Mobile-first | ✅ verificado en código (breakpoints DS; stacking `data-label`; sin overflow intencional) |
| F4 Chat responsive | ✅ layout fluido `max-w-3xl`, burbujas limitadas (45%/70%/90%); input en flujo |
| F5 Input mobile | 🟡 requiere dispositivo real (teclado virtual/safe areas) |
| F6 Sidebar | ✅ expandido/colapsado/drawer con backdrop |
| F7 Tablas | ✅ patrón `data-label` (sin convertir todo en cards) |
| F8 Forms responsive | ✅ grids de formularios 9C usan tokens y `flex-wrap`/`grid` responsive |
| F9 Modales | ✅ Base UI Dialog (ESC/backdrop/focus trap) |
| F10 Drawers | ✅ chat-history y drawer móvil con scroll propio |
| F11 Touch targets | ✅ controles `h-9/h-10` mínimos en chrome |
| F12–F15 A11y | ✅ semántica/labels/focus/keyboard por primitivos; faltan pruebas de screen reader reales |
| F16 Contraste | 🟡 contrastes con tokens DS (muted sobre white verificado); badges revisados |
| F17 Color semántico | ✅ `-soft` variants y colores semánticos por propósito |
| F18 Reduced motion | ✅ `globals.css:608` |
| F19 Tipografía | ✅ tokens tipográficos; jerarquía H1/body consistente |
| F20 Tokens | ✅ hardcoded residuals eliminados en 9A; clasificar resto en 9E |
| F21 Componentes | ✅ primitivos únicos (`ui/*`); 11 legacy eliminados en 9B |
| F22 Consistencia visual | 🟡 9E en curso |
| F23–F24 Height/scroll | ✅ `min-h-0 flex-1 overflow` en chat; sin scroll doble en módulos |
| F25 Z-index | ✅ jerarquía Base UI; sin `99999` generalizado |
| F26–F28 Loading/Error/Empty | ✅ primitivos + `loading.tsx`/`error.tsx`/`not-found.tsx` presentes |
| F29 Densidad | ✅ módulos 9C con tabs/paginación/filtros |
| F30–F35 Performance | 🟡 warnings documentados; sin optimización prematura |
| F36 Long content | ✅ truncation/`break-words` verificados en chat y tablas |
| F37 i18n safety | ✅ layouts sin anchos rígidos de texto |
| F38–F39 Navegadores | 🟡 Chrome/Chromium disponible; Safari/Firefox/iOS/Android no verificados en este entorno |
| F40 Flujos reales | ✅ FLOW 1 (chat) y FLOW 2 (inventario) verificados en 9C/9E; resto cubierto por tests de servicios |
| F41 Regresión | ✅ 4 checks PASS (ver reporte) |
| F42 No mask | ✅ sin `overflow:hidden` para ocultar roturas |
| F43 Visual regression | 🟡 sin infraestructura de screenshots (documentado) |
| F44–F46 Regresión UX/a11y/perf | ✅ sin regresiones en 9E Batch A |
| F47 Cleanup | ✅ dead CSS (`icon-wobble`) e imports eliminados en 9E A |
| F48 Documentación | ✅ este paquete (5 archivos) |
| F49 Matriz QA | ✅ en `PHASE_9D_REPORT.md` |

---

## 4. Criterio de finalización

- ✅ Typecheck PASS · ✅ Lint PASS (0 errores) · ✅ Tests PASS (1432/1432) · ✅ Build PASS (exit 0)
- ✅ Sin errores P0 · ✅ Sin errores P1 (los hallazgos P1 fueron corregidos en 9E Batch A)
- ✅ P2 transferidos a 9E cerrados: V04 (skeleton chat history, 9E A09), V05 (estados de módulos, 9E A12), B01 (foco sidebar, 9E A14)
- 🟡 P2 abierto (limitación de entorno): R03 — verificación de input chat en dispositivo real (teclado virtual/safe areas)
- 🟡 P3 abierto (deuda no bloqueante): P02 — migración de `<img>` legacy a `next/image` (diferida a FASE 10A)
- ⚠️ Limitaciones documentadas: pruebas de navegador real (Safari/Firefox/móviles) y screen reader no ejecutables en este entorno
