# Panitas Design System — Referencia de implementación (FASE 55)

> Fecha: 11/08/2026 · FASE 9A
> Documenta el sistema **implementado** en esta fase. La especificación de producto está en `PANITAS_DESIGN_SYSTEM.md`; el inventario previo en `DESIGN_AUDIT.md`.

---

## 1. Resumen de entregables

1. **Tokens físicos** en `src/app/globals.css` (color, sombras, estados) — capa única de verdad.
2. **3 primitivas nuevas** en `src/components/ui`: `skeleton.tsx`, `alert.tsx`, `tooltip.tsx`.
3. **4 compuestos** en `src/components/design-system`: `page-header.tsx`, `section.tsx`, `metric-card.tsx`, `ai-callout.tsx`.
4. **Playground interno** en `/design-system` (builds con componentes reales).
5. **Botón `success`** (variante aditiva) + fix de `layout.tsx` (body con tokens).
6. **Documentación**: `DESIGN_AUDIT.md`, `PANITAS_DESIGN_SYSTEM.md`, `DESIGN_SYSTEM.md`, `PHASE_9A_REPORT.md`.

## 2. Tokens implementados (`src/app/globals.css`)

### Re-anclaje a identidad naranja (`:root`)
```css
--primary: #F97316;            /* antes #0066FF */
--secondary: #FFF4EC;          /* antes #F0F4FF */
--secondary-foreground: #7C2D12;
--ring: #F97316;               /* antes #0066FF */
--sidebar-primary: #F97316;
--sidebar-accent: #FFF4EC;
--sidebar-accent-foreground: #7C2D12;
--sidebar-ring: #F97316;
--chart-1: #F97316;
--chart-5: #FFF4EC;
```

### Estados semánticos nuevos
```css
--destructive-soft: #FEF2F2;
--success: #16A34A;  --success-foreground: #FFFFFF;  --success-soft: #F0FDF4;
--warning: #F59E0B;  --warning-foreground: #FFFFFF;  --warning-soft: #FFFBEB;
--info: #0EA5E9;     --info-foreground: #FFFFFF;     --info-soft: #F0F9FF;
```
Exponer en `@theme inline`: `--color-success`, `--color-success-soft`, `--color-warning`, `--color-warning-soft`, `--color-info`, `--color-info-soft`, `--color-destructive-soft`.

### Sombras (nuevo `@theme` block)
```css
--shadow-subtle:  0 1px 2px rgba(10,10,10,.04), 0 8px 24px -12px rgba(10,10,10,.08);
--shadow-medium:  0 2px 4px rgba(10,10,10,.05), 0 12px 32px -12px rgba(10,10,10,.12);
--shadow-elevated:0 4px 8px rgba(10,10,10,.06), 0 20px 48px -16px rgba(10,10,10,.18);
--shadow-glow:    0 0 30px rgba(249,115,22,.12);
```
→ utilities `shadow-subtle|medium|elevated|glow`.

### Otros
- `surface-card` ahora referencia `var(--shadow-subtle)`.
- Glows legacy azules → naranja: `glass-glow`, `glass-glow-accent`, `text-glow`.
- Tokens previos FASE 4F/8G conservados (sin romper componentes existentes).

## 3. Primitivas nuevas (`src/components/ui`)

| Archivo | API | Notas |
|---|---|---|
| `skeleton.tsx` | `<Skeleton className>` | `animate-pulse bg-muted rounded-md`, `data-slot="skeleton"` |
| `alert.tsx` | `<Alert variant>` + `<AlertTitle/>` + `<AlertDescription/>` | variants: `default`, `info`, `success`, `warning`, `destructive`; usa `*-soft` tokens |
| `tooltip.tsx` | `<TooltipProvider>` + `<Tooltip>` + `<TooltipTrigger render={…}>` + `<TooltipContent>` | Base UI Tooltip; `sideOffset` default 6, bg `foreground`, texto `background` |

## 4. Compuestos (`src/components/design-system`)

| Archivo | API | Notas |
|---|---|---|
| `page-header.tsx` | `PageHeader` + `PageHeaderTitle` + `PageHeaderDescription` + `PageHeaderActions` | Header fluido; título `font-heading text-2xl` |
| `section.tsx` | `Section` + `SectionHeader` + `SectionTitle` + `SectionDescription` | Bloque con `gap-4` |
| `metric-card.tsx` | `MetricCard {label, value, delta?, icon?}` | Usa `surface-card` + `shadow-subtle` + `tabular-nums`; delta coloreado success/destructive |
| `ai-callout.tsx` | `AICallout {variant, title?}` | variants `insight`, `recommendation`, `warning`, `success`, `data`; íconos lucide + colores semánticos |

## 5. Playground `/design-system`

Ruta interna que renderiza con **componentes reales** (nada es mock):

- Tokens de color (swatches leídos de CSS vars), tipografía, botones (variantes/tamaños/estados/feedback con sonner), badges, formularios (Input, Select, Textarea, Switch, Checkbox, RadioGroup), Alertas + AICallouts, MetricCards y Cards, Tabs + Tabla (responsive con `data-label`), Dialog/Sheet/Tooltip, Skeleton/EmptyState/ErrorState, radius/sombras/spacing.

Acceso: `http://localhost:3000/design-system`.

## 6. Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/app/globals.css` | Tokens naranja, estados, sombras, glows |
| `src/app/layout.tsx` | body `bg-white text-[#050505]` → `bg-background text-foreground` |
| `src/components/ui/button.tsx` | Variante `success` (aditiva) |
| `src/components/ui/skeleton.tsx` | **nuevo** |
| `src/components/ui/alert.tsx` | **nuevo** |
| `src/components/ui/tooltip.tsx` | **nuevo** |
| `src/components/design-system/page-header.tsx` | **nuevo** |
| `src/components/design-system/section.tsx` | **nuevo** |
| `src/components/design-system/metric-card.tsx` | **nuevo** |
| `src/components/design-system/ai-callout.tsx` | **nuevo** |
| `src/app/design-system/page.tsx` | **nuevo** (playground) |

## 7. Uso rápido

```tsx
// Estados y alertas
<Alert variant="success"><AlertTitle>Pago verificado</AlertTitle></Alert>

// IA
<AICallout variant="recommendation" title="Panitas IA">
  Reabastece «Agua 5L» antes del jueves.
</AICallout>

// Métrica
<MetricCard label="Ventas de hoy" value="Bs 1.250" delta={12.4} icon={<Zap/>} />

// Carga
<Skeleton className="h-4 w-2/3" />

// Cabecera
<PageHeader>
  <PageHeaderTitle>Inventario</PageHeaderTitle>
  <PageHeaderActions><Button>Nuevo</Button></PageHeaderActions>
</PageHeader>
```

## 8. Verificación

- `npx tsc --noEmit` PASS
- `npm run lint` PASS
- `npx vitest run` PASS (1427/1427 — línea base 8G intacta)
- `npm run build` PASS
