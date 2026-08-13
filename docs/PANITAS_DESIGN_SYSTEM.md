# PANITAS · Sistema de Diseño (Panitas 2.0 · v2)

> Fecha: 11/08/2026 · FASE 9A · Supersede al doc de FASE 2A (que quedó obsoleto: apuntaba a primario azul).
> Este documento es la **especificación** del sistema. La implementación física vive en `src/app/globals.css` + `src/components/ui/*` + `src/components/design-system/*` (ver `DESIGN_SYSTEM.md`).

---

## 1. Filosofía visual

Panitas es un **gerente virtual** para pequeños negocios: moderno, claro y controlado. NO es un ERP tradicional, ni un crypto dashboard, ni una app "neón IA".

- **Identidad**: naranja Panitas (`#F97316`) como color de acción. Blanco + negro-gris para superficies. Amarillo solo para acentos de IA.
- **Jerarquía**: una acción principal por pantalla; números grandes en métricas; todo lo demás secundario.
- **Temperatura**: profesional pero amigable; sin exceso de redondeo; sin ruido decorativo.
- **Rendimiento móvil primero**: cero backdrop-blur en touch (60 FPS), inputs ≥ 44px, texto ≥ 16px (anti-zoom iOS), tablas → cards.
- **Accesibilidad**: foco visible (`ring`), contraste ≥ 4.5:1 para texto, `prefers-reduced-motion` respetado.

## 2. Color — tokens semánticos

Definidos en `:root` (globals.css). `@theme inline` expone cada uno como utilidad Tailwind (`bg-primary`, `text-success`, etc.).

### Identidad
| Token | Valor | Uso |
|---|---|---|
| `--brand-primary` | `#F97316` | Naranja Panitas: marca, logo, gradientes |
| `--brand-secondary` | `#FB923C` | Naranja claro (gradiente) |
| `--brand-soft` | `#FFF4EC` | Superficie naranja suave (hover de marca, alerts IA) |
| `--accent` | `#FFD600` | **Solo acentos IA** (insights, recomendaciones, ofertas) |
| `--brand` | `#FFB92E` | Legacy 8G (migrar a `accent` en 9B) |

### Semánticos de acción
| Token | Valor | Uso |
|---|---|---|
| `--primary` | `#F97316` | Acción principal (botones, switch, focus, chat usuario) |
| `--primary-foreground` | `#FFFFFF` | Texto sobre primary |
| `--secondary` | `#FFF4EC` | Botones secundarios / superficies suaves |
| `--secondary-foreground` | `#7C2D12` | Texto sobre secondary |
| `--ring` | `#F97316` | Foco visible |
| `--destructive` | `#EF4444` | Eliminar / errores |
| `--destructive-soft` | `#FEF2F2` | Fondo de errores |

### Semánticos de estado (nuevos en 9A)
| Token | Valor | Uso |
|---|---|---|
| `--success` | `#16A34A` | Pagado, completado, stock OK |
| `--success-soft` | `#F0FDF4` | Fondo success |
| `--warning` | `#F59E0B` | Bajo stock, pendiente |
| `--warning-soft` | `#FFFBEB` | Fondo warning |
| `--info` | `#0EA5E9` | Datos, sugerencias |
| `--info-soft` | `#F0F9FF` | Fondo info |

### Neutros
| Token | Valor | Uso |
|---|---|---|
| `--background` / `--card` / `--popover` / `--sidebar` | `#FFFFFF` | Superficies |
| `--foreground` / `--card-foreground` / `--popover-foreground` / `--sidebar-foreground` | `#050505` | Texto primario |
| `--muted` | `#F5F5F5` | Fondo suave (hover, skeleton) |
| `--muted-foreground` | `#6B7280` | Texto secundario |
| `--border` / `--input` | `#E5E7EB` | Líneas |
| `--text-muted` | `#52525B` | Texto muted (FASE 4F) |

### Charts
`--chart-1: #F97316` · `--chart-2: #050505` · `--chart-3: #FFD600` · `--chart-4: #6B7280` · `--chart-5: #FFF4EC`.

> **Contraste**: texto blanco sobre `#F97316` cumple 3:1 (UI components). Para texto AA normal usar `font-medium`/`semibold` (ya aplicado en Button).

## 3. Tipografía

| Rol | Fuente | Pesos |
|---|---|---|
| Body | **Systemia** (fallback Inter) | 400 / 500 / 700 |
| Heading / números destacados | **Polymath Display** | 700 |

- Escala fluida existente: `text-fluid-xs → text-fluid-2xl` (clamp).
- Escala estándar (playground): `text-4xl` (H1), `text-2xl` (H2), `text-xl` (H3), `text-base` (cuerpo), `text-sm` (UI), `text-xs` (auxiliar).
- Tabular nums para métricas: `tabular-nums`.

## 4. Espaciado, radius y sombras

- **Spacing base**: 4/8/12/16/24/32/48/64. Layout de página: `gap-4` entre cards, `my-10` entre secciones.
- **Radius**: derivados de `--radius: 0.75rem` (12px). Cards `rounded-xl`, inputs `rounded-xl`, botones `rounded-lg`, badges pill (`rounded-4xl`). **Sin exceso**.
- **Sombras (nuevas en 9A)**: `shadow-subtle` (cards), `shadow-medium` (popovers/drawers), `shadow-elevated` (modales), `shadow-glow` (glow naranja de marca).

## 5. Componentes

### Primitivas (`src/components/ui`)
Button, Input, Textarea, Select, Checkbox, RadioGroup, Switch, Label, Badge, Card, Table, Dialog, Sheet, DropdownMenu, Popover, Command, Tabs, Avatar, Separator, ScrollArea, Calendar, Pagination, **Skeleton**, **Alert**, **Tooltip** (+ loading/empty/error states, search-input, phone-input, stepper, filter-chip).

### Compuestos (`src/components/design-system`)
| Componente | Rol |
|---|---|
| `PageHeader` (+Title/Description/Actions) | Cabecera de página: título + descripción + acciones |
| `Section` (+Header/Title/Description) | Bloque de contenido con título |
| `MetricCard` | Métrica: label + número grande + delta + icono (usa `surface-card` + `shadow-subtle`) |
| `AICallout` (insight/recommendation/warning/success/data) | Lenguaje visual de Panitas IA |

### Patrones UX
- **1 CTA principal** por pantalla (naranja). Secundarias: outline/ghost.
- **Estado vacío**: `EmptyState` con CTA.
- **Carga**: `Skeleton` (no spinners gigantes).
- **Destructivo**: siempre `Dialog` de confirmación.
- **Errores**: `ErrorState` con reintentar + `Alert` inline.
- **Móvil**: inputs ≥ 44px, tablas → cards (`data-label`), drawer para nav.
- **IA**: `AICallout` para insights; el chat mantiene la asimetría usuario-burbuja / IA-libre (markdown).

## 6. Responsivo

- Breakpoints estándar Tailwind v4. Nav: sidebar 76px/256px (≥lg), drawer <lg, bottom nav móvil.
- Tablas se apilan en cards ≤768px (CSS global con `data-label`).
- `prefers-reduced-motion` y `prefers-color-scheme` documentados; **dark mode fuera de alcance** (FASE 35: no implementar aún).

## 7. Qué NO hacer

- No usar amarillo para acciones (solo acentos IA).
- No re-introducir azul `#0066FF` en UI nueva (legacy 8G se migra en 9B).
- No usar `text-[10px]`/`text-[11px]` arbitrarios en UI nueva → usar `text-xs`.
- No crear duplicados de primitivas: reutilizar `src/components/ui/*`.
- No añadir valores hardcodeados de color/radius/sombra en componentes nuevos → usar tokens.
