# PANITAS — Sistema de Diseño (Panitas 2.0)

> Fecha: 02/08/2026 · Rama: `develop-v2` · FASE 2A
> Sistema visual para Panitas Negocios 2.0: moderno, profesional, accesible para pequeños negocios y con la sensación de "IA lista".

---

## 1. Filosofía visual

- **Profesional pero amigable**: ni corporativo frío ni lúdico infantil.
- **Claro y directo**: números grandes, jerarquía obvia, una acción por pantalla.
- **Sensación IA**: acentos de "sparkles", esquinas redondeadas, glass sutil, estados de asistente siempre accesibles.
- **Rendimiento móvil primero**: sin blur/sombras pesadas en touch (ya aplicado en globals.css).

## 2. Tokens de color (objetivo FASE 2A)

> Estado actual: 2 amarillos (`--accent:#FFD600` vs `#FFB92E`), 2 primarios (`#0066FF` dashboard vs `#FFB92E` tienda). Objetivo: **unificar en tokens**.

| Token | Valor objetivo | Uso |
|---|---|---|
| `--primary` | `#0066FF` | Acciones principales (dashboard/admin) |
| `--primary-foreground` | `#FFFFFF` | Texto sobre primary |
| `--brand` (nuevo) | `#FFB92E` | **Amarillo de marca** (logo, highlights, tienda) |
| `--accent` | `#FFD600` | Acentos secundarios (compat. con shadcn) |
| `--background` / `--card` | `#FFFFFF` | Fondos |
| `--foreground` | `#050505` | Texto |
| `--muted` / `--muted-foreground` | `#F5F5F5` / `#6B7280` | Suaves |
| `--sidebar-*` | `#FFFFFF` base | Sidebar |
| `--destructive` | `#EF4444` | Errores/destructivo |
| `--radius` | `0.75rem` | Redondeo base (escala existente) |

### Paleta completa propuesta
```
Primario:  #0066FF (blue)          Marca:  #FFB92E (amarillo)
Éxito:     #16A34A (green)         Info:   #0EA5E9 (sky)
Advertencia:#F59E0B (amber)        Error:  #EF4444 (red)
Neutros:   #050505 / #6B7280 / #F5F5F5 / #FFFFFF
Navy:      #071A33 (footer, pricing, fondo oscuro)
```

## 3. Tipografía

| Rol | Fuente | Uso |
|---|---|---|
| Body | **Systemia** (400/500/700), fallback Inter | Todo el texto |
| Heading | **Polymath Display** (700) | H1–H6, números destacados del dashboard |
| Mono (si aplica) | system mono | Códigos/referencias |

- Ya cargadas por `@font-face` en `globals.css` (`--font-body`, `--font-heading`). Sin `next/font` (self-hosted en `/fonts`).
- Tipografía fluida existente: `text-fluid-xs…2xl` (clamp).

## 4. Componentes principales

### Primitivas (shadcn v4 / base-ui — ya existen)
Button, Card, Input, Label, Textarea, Select, DropdownMenu, Popover, Dialog, Sheet, Tabs, Switch, Checkbox, RadioGroup, Badge, Avatar, Separator, ScrollArea, Table, Calendar, Command, Sonner.

### Nuevos componentes propuestos (FASE 2A)
| Componente | Rol |
|---|---|
| `MetricCard` | Tarjeta de métrica (número grande + Δ) |
| `AlertItem` / `AlertList` | Alertas priorizadas con ícono de severidad |
| `RecommendedAction` | CTA inteligente destacada |
| `AskPanitas` | Campo del asistente (placeholder visual) |
| `AssistantPanel` | Panel lateral del asistente (UI, sin IA) |
| `AssistantFab` | Botón flotante (móvil) |
| `PlanBadge` | Badge "PLUS" / "Negocios" con tooltip |
| `FeatureLock` | Card/CTA de upsell (función bloqueada por plan) |

## 5. Patrones UX

| Patrón | Regla |
|---|---|
| **Una acción por pantalla** | Los dashboards priorizan 1 CTA principal |
| **Estado vacío amigable** | Usar `EmptyState` con CTA ("Crea tu primer producto") |
| **Estados de carga** | Skeleton (no spinners gigantes) — crear `Skeleton` si falta |
| **Confirmación destructiva** | Siempre dialog de confirmación |
| **Errores** | `ErrorState` con reintentar |
| **Formularios** | Labels visibles, validación inline, botón primario fijo |
| **Móvil** | Inputs ≥ 44px, font-size 16px anti-zoom, tablas → cards |
| **Asistente** | Placeholder + estados "escribiendo"/"próximamente" visibles |

## 6. Modo oscuro (estado FASE 2A)

- **Problema**: `ThemeToggle` renderizado sin `<ThemeProvider>`; `globals.css` solo `:root`.
- **Acción FASE 2A (opción segura)**: no activar dark mode aún (evita romper el tema claro). Dejar el toggle **oculto** o neutralizado, y documentar que FASE 2B implementará `<ThemeProvider>` + bloque `.dark` completo.
- **Decisión**: mantener tema claro como única opción en 2A para no arriesgar la identidad; corregir en 2B.

## 7. Buenas prácticas a respetar

- Usar **tokens CSS** (`bg-primary`, `text-muted-foreground`) en código nuevo; prohibir hexes hardcodeados en componentes nuevos.
- Íconos: **lucide-react** (ya instalado).
- Redondeo: usar escala de `--radius`.
- No agregar emojis en la UI salvo los aprobados del diseño (👋, 🛒) por copy.
