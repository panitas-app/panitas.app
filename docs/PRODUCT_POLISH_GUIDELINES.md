# Product Polish Guidelines — Panitas

*Guía operativa de pulido de producto (FASE 9E). Aplica a TODO desarrollo futuro de UI del dashboard y superficies de producto.*
*Principio raíz: **premium por claridad, no por decoración.***

---

## 1. Percepción de producto

- **Panitas es gerente, no chatbot.** Microcopy directo, profesional y útil.
- **Nunca mostrar "IA", "Beta" ni emojis** en la superficie visible de producto.
- **Una acción principal por contexto.** El resto son acciones secundarias de utilidad.
- No prometer funcionalidades inexistentes (si se promociona en pricing, debe existir).

## 2. Color

- **Usar únicamente tokens del Design System.** Prohibido hex hardcoded (`#102A43`, `#050505`, `text-slate-900`, etc.) en superficies de producto.
- **Color con propósito:**
  - `primary` (naranja) = acción / identidad.
  - `success` = positivo / saludable.
  - `warning` = requiere atención.
  - `info` = informativo / neutral.
  - `destructive` = negativo / peligro.
- **Amarillo `accent`**: SOLO números grandes destacados o estados especiales. **No** usar como color de títulos de página.
- Titulares (`h1`) siempre `text-foreground`; subtítulos `text-muted-foreground`.

## 3. Estados (loading / empty / error)

- **Loading:** skeletons o spinner (`Loader2`). Nada de texto plano tipo "Cargando…" si hay un patrón mejor.
- **Empty:** responde la pregunta implícita del usuario: *"¿Qué ocurre? ¿Qué puedo hacer?"* — título + explicación + (opcional) acción.
- **Error:** copy calmado y accionable. **NUNCA** exponer `error.message`, stack traces ni códigos internos al usuario. Botón "Intentar nuevamente" cuando haya recuperación posible.
- Reutilizar los primitivos `empty-state` / `loading-state` / `error-state` de `src/components/ui/`.

## 4. Animación

- **Sin animaciones automáticas no esenciales.** Nada de `animate-pulse` permanente, wobbles globales ni loops de atención.
- Respetar `prefers-reduced-motion` (el override global en `globals.css` cubre `animate-ping`/`animate-pulse`).
- Animaciones opt-in con propósito (spinners de trabajo, micro-interacciones de hover) están bien.
- `animate-pulse` solo en **skeletons** de carga.

## 5. Feedback

- Botones que procesan: deshabilitar + indicador (`Loader2` + `aria-busy`).
- Toast según importancia (FASE 12): acciones triviales no necesitan toast; cambios destructivos sí piden confirmación.
- Confirmar solo cuando hay riesgo real.

## 6. Accesibilidad

- `focus-visible` visible en todos los elementos interactivos (ej. `focus-visible:ring-2 ring-primary/60`).
- `aria-label` en iconos sin texto visible; `aria-busy` en áreas de carga.
- Contraste WCAG AA; no depender solo del color para transmitir estado.
- Aplicar a navegación colapsada y a todos los estados.

## 7. Lenguaje

- **Calmado y no dramático**: sin "ALERTA!", "PELIGRO", "CRÍTICO", "URGENTE!". Usar severidad serena (`warning`/`info`) con copy constructivo.
- Verbos de acción concretos ("Intentar nuevamente", "Volver al inicio", "Nueva").
- Consistencia de microcopy entre superficies equivalentes.

## 8. Consistencia visual

- Headers de página uniformes: mismo tamaño/estilo lógico de `h1`.
- Colores semánticos vía tokens en KPIs, gráficos, chips y deltas.
- Deuda legacy de colores hardcoded fuera de superficies de producto debe migrarse a tokens en cada oportunidad (sin regresiones masivas).

---

## Checklist rápida antes de mergear UI

- [ ] Sin `e.message`, stacks ni códigos internos al usuario.
- [ ] Sin "IA"/"Beta"/emojis en superficie visible.
- [ ] Tokens DS únicamente (sin hex hardcoded).
- [ ] Estados loading/empty/error presentes y con microcopy correcto.
- [ ] Sin animaciones automáticas no esenciales.
- [ ] `focus-visible` + `aria-label` donde aplique.
- [ ] Una acción principal por pantalla/contexto.
- [ ] Lenguaje calmado, profesional y consistente.
