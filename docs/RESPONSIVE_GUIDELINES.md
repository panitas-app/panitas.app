# Guías Responsive — Panitas

*FASE 9D / FASE 9E — Normativa oficial de comportamiento responsive*
*Válida para todo desarrollo frontend del producto.*

---

## 1. Estrategia oficial

| Segmento | Ancho (px) | Estrategia |
|----------|-----------|------------|
| Mobile small | < 360 | Una columna; sin truncar acciones; inputs full-width |
| Mobile | 360–767 | Una columna; drawer para navegación; bottom padding seguro |
| Tablet | 768–1023 | Dos columnas; sidebar colapsable en pantallas < lg |
| Desktop | 1024–1439 | Layout completo; sidebar expandible/colapsable |
| Large desktop | ≥ 1440 | Máximo contenido; tablas densas permitidas |

**Breakpoints:** usar únicamente los tokens del Design System (Tailwind `sm`/`md`/`lg`/`xl`/`2xl`).
NO crear breakpoints arbitrarios por componente.

## 2. Reglas obligatorias

1. **Sin overflow horizontal accidental.** `overflow-x-hidden` solo como guardia de último recurso; la causa debe resolverse.
2. **Mobile-first**: diseña primero la versión de 1 columna y escala hacia arriba.
3. **Ocultar antes que romper**: si un control no cabe, se oculta con `hidden sm:flex` — nunca encoger a ilegible.
4. **Tablas**: usar stacking responsive vía `data-label` (`globals.css:315-349`) o cards según el tipo de información. NO convertir todas las tablas en cards automáticamente.
5. **Formularios**: grids con `grid-cols-1 sm:grid-cols-2`; nunca inputs fuera de pantalla.
6. **Modales**: Base UI Dialog en todas las resoluciones; en mobile considerar ancho máximo del viewport con scroll interno.
7. **Drawers**: ancho `w-72 max-w-[85vw]` como tope; scroll propio.
8. **Touch targets**: controles principales ≥ 36px (`size-9`); ideal 40–44px (`h-10`).
9. **Chat**: `max-w-3xl` centrado; burbujas de usuario limitadas (90% mobile / 70% tablet / 45% escritorio); input siempre en el flujo, nunca detrás del teclado/sidebar.
10. **Safe areas**: aplicar `safe-top` / padding extra en elementos `fixed`/`sticky` para notchs e iOS.
11. **Scroll**: un solo scroll por contexto (página O contenedor O modal), nunca doble scroll innecesario.
12. **Sin zoom necesario**: el texto y controles del chat deben ser legibles sin zoom a 320px.

## 3. Resoluciones de prueba obligatorias

320 · 360 · 375 · 390 · 414 · 430 · 768 · 834 · 1024 · 1280 · 1440 · 1920

## 4. Validación

Antes de cerrar cualquier pantalla:
- [ ] ¿Hay overflow horizontal?
- [ ] ¿Hay texto cortado o elementos fuera de pantalla?
- [ ] ¿Los headers/sticky no se superponen?
- [ ] ¿El teclado virtual no tapa el input del chat?
- [ ] ¿Las tablas son legibles en el patrón elegido?
