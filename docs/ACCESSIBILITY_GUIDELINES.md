# Guías de Accesibilidad — Panitas

*FASE 9D / FASE 9E — Normativa oficial de accesibilidad (a11y)*

---

## 1. Principios

Panitas es una herramienta de trabajo: accesible por defecto, sin sacrificar claridad.
Cumple como mínimo WCAG 2.1 AA en los flujos principales.

## 2. Reglas obligatorias

### Semántica y estructura
- Usar headings jerárquicos (`h1` → `h2` → `h3`) por pantalla; un solo `h1`.
- Botones reales `<button>` para acciones; `<a>`/`Link` para navegación.
- Formularios con `<label>` asociado a cada campo; nunca placeholder como único label.

### Nombres accesibles
- Botones de solo icono: siempre `aria-label` descriptivo (ej. "Adjuntar archivo").
- Iconos decorativos: `aria-hidden` (lucide por defecto) o `decorative`.
- Elementos con estado: comunicarlo vía `aria-busy`, `aria-expanded`, `aria-selected`, `role="alert"` cuando corresponda.

### Foco y teclado
- Foco visible SIEMPRE: `focus-visible` con anillo del DS (nunca `outline-none` sin reemplazo).
- Modales/drawers: focus trap y retorno del foco al abrir/cerrar (gestionado por Base UI).
- Navegación completa por teclado: TAB, SHIFT+TAB, ENTER, SPACE, ESC, flechas donde aplique.
- Sin focus traps accidentales.

### Contraste
- Texto normal ≥ 4.5:1; texto grande/bold ≥ 3:1.
- Respetar tokens del DS. NO "arreglar" contraste con negro/blanco arbitrarios.
- Placeholders y `muted-foreground` con opacidad ≥ 60% para mantener contraste sobre `background`.

### Color
- No usar color como único canal de información (acompañar con icono/texto).
- Semántica estricta: `success` ≠ `info`; `warning` ≠ `danger`.
- Sobre naranja/amarillo (`--primary`, `--warning`): texto oscuro con contraste suficiente.

### Reduced motion
- `@media (prefers-reduced-motion: reduce)` global ya activo (`globals.css:608`).
- No introducir animaciones automáticas no esenciales (pulsos, wobbles, parallax).
- Preferir animaciones opt-in (clases `icon-hover-*`) sobre comportamientos universales.

### Screen readers
- Alerts de acción (éxito/error) anunciables (`role="status"`/`role="alert"`).
- Tablas con `<th>` y `scope`; en stacking responsive mantener el nombre de columna visible.
- Chat: el estado "escribiendo" debe anunciarse con texto (`ChatThinking`) y `aria-busy` en el input.

## 3. Validación

- [ ] TAB recorre en orden lógico y el foco es visible.
- [ ] ESC cierra el componente abierto y devuelve el foco.
- [ ] Todos los controles de icono tienen `aria-label`.
- [ ] Contraste de textos secundarios y badges cumple.
- [ ] Con `prefers-reduced-motion: reduce` no hay animaciones esenciales.
- [ ] Errores cercanos al campo, claros y accionables (sin stack traces).
