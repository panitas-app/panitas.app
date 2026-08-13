# FASE 9A · Panitas Design System — Reporte Final

> Fecha: 11/08/2026 · Rama: develop-v2 · Estado: **GO**
> Contexto: FASE 8G cerrada (GO, 1427/1427 tests). Esta fase crea el **sistema de diseño oficial** (tokens, primitivas, compuestos, playground y documentación) **sin rediseñar páginas** y **sin tocar lógica de negocio**.

---

## 1. Objetivo cumplido

Establecer las reglas visuales de Panitas 2.0 con **identidad naranja** única, expuestas como tokens CSS-first (Tailwind v4), primitivas reutilizables y patrones de producto — con un playground interno que las valida con componentes reales.

## 2. Entregables

### Documentación
| Archivo | Contenido |
|---|---|
| `docs/DESIGN_AUDIT.md` | Inventario FASE 1+40: stack, tokens, 41 primitivas, nav/chat, 155+ colores hardcodeados, clasificación legacy |
| `docs/PANITAS_DESIGN_SYSTEM.md` | Spec oficial (reescrita; la v2A quedaba obsoleta con azul) |
| `docs/DESIGN_SYSTEM.md` | Referencia de implementación + guías de uso |
| `docs/PHASE_9A_REPORT.md` | Este reporte |

### Implementación
| Área | Detalle |
|---|---|
| Tokens (`src/app/globals.css`) | `--primary/ring/secondary/sidebar-*/chart-*` re-anclados a naranja `#F97316`; estados `success/warning/info` + softs; `--destructive-soft`; sombras `shadow-subtle/medium/elevated/glow`; glows legacy azul→naranja; `surface-card` usa `--shadow-subtle` |
| Primitivas nuevas (`src/components/ui`) | `skeleton.tsx`, `alert.tsx` (5 variantes), `tooltip.tsx` (Base UI) |
| Compuestos (`src/components/design-system`) | `page-header.tsx`, `section.tsx`, `metric-card.tsx`, `ai-callout.tsx` (lenguaje visual IA) |
| Botón | Variante `success` (aditiva) |
| Root layout | body `bg-white text-[#050505]` → `bg-background text-foreground` |
| Playground | `/design-system` — ruta interna con componentes reales |

## 3. Verificación (regresión completa)

| Chequeo | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ PASS |
| `npm run lint` | ✅ 0 errores (422 warnings pre-existentes, ninguno nuevo) |
| `npx vitest run` | ✅ **1427/1427 PASS** (164 archivos) — línea base 8G intacta |
| `npm run build` | ✅ PASS (incluye `/design-system` estático) |

## 4. Checklist (criterios FASE 56/57)

- [x] Auditoría previa real (no asumida) con inventario documentado
- [x] Tokens de color semánticos implementados en la capa única (`globals.css`)
- [x] Identidad única: naranja de acción + amarillo solo como acento IA
- [x] Escala de tipografía, spacing, radius y sombras documentadas
- [x] Primitivas completas (Skeleton/Alert/Tooltip creados, resto ya existía)
- [x] Compuestos del producto: PageHeader, Section, MetricCard, AICallout
- [x] Playground `/design-system` con **solo componentes reales**
- [x] Sin dark mode nuevo (documentado, fuera de alcance)
- [x] Sin cambios de lógica de negocio / ventas / créditos / inventario / IA
- [x] Sin rediseño de páginas (los estilos cambian solo vía tokens)
- [x] Regresión completa verde
- [x] **NO se inició FASE 9B**

## 5. Decisiones clave

1. `--primary` ahora es `#F97316` (antes azul `#0066FF`). Esto recolorea automáticamente botones/focus de toda la app (251 usos de `bg-primary`): es el objetivo de identidad de FASE 4F/9A. Contraste blanco/naranja = 3:1 (UI component, aceptable; botones usan `font-medium`).
2. Los tokens FASE 4F/8G (`--brand`, `--swatch--*`) se conservan intactos; su migración es trabajo de 9B.
3. Se reutilizaron las primitivas existentes (Base UI + shadcn-style) en vez de duplicar.
4. La chat foundation se audita como limpia (tokens semánticos); la deuda de estilo está en `sidebar.tsx` y `immersive-chat-shell.tsx` (grises crudos) → **REFACTOR en 9B**.

## 6. Archivos tocados

**Nuevos (7)**: `src/components/ui/{skeleton,alert,tooltip}.tsx` · `src/components/design-system/{page-header,section,metric-card,ai-callout}.tsx` · `src/app/design-system/page.tsx`

**Modificados (3)**: `src/app/globals.css` · `src/app/layout.tsx` · `src/components/ui/button.tsx`

**Docs (4)**: `DESIGN_AUDIT.md` · `PANITAS_DESIGN_SYSTEM.md` (reescrito) · `DESIGN_SYSTEM.md` · `PHASE_9A_REPORT.md`

## 7. Recomendaciones para 9B (próxima)

1. Migrar `sidebar.tsx` a tokens (`--sidebar-*` ya listos) y unificar persistencia del colapso.
2. Reemplazar grises crudos de `immersive-chat-shell.tsx` por `surface`/`surface-card`.
3. Migrar los 155 `text-[#…]` + 474 tamaños arbitrarios a la escala tipográfica.
4. Deprecar `--brand: #FFB92E` (46 usos) hacia `accent`.
