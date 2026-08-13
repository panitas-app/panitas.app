# QA Frontend — Panitas

*FASE 9D / FASE 9E — Procedimiento de QA del frontend y criterios de aceptación*

---

## 1. Gates obligatorios (cada bloque de cambios)

| Check | Comando | Criterio |
|-------|---------|----------|
| Typecheck | `npm run typecheck` | 0 errores |
| Lint | `npm run lint` | 0 errores (warnings pre-existentes documentados y tolerados) |
| Tests | `npm test` | Todos PASS (baseline 1432 en 165 archivos) |
| Build | `npm run build` | Exit 0 |

Ejecutar desde `panitas/`. Si `tsc` falla por caché de rutas borradas: eliminar `.next` y reintentar.

## 2. Estados que toda pantalla debe tener

- **Loading**: `LoadingState` o skeleton con estructura aproximada. Nunca pantalla en blanco.
- **Error**: `ErrorState` o mensaje calmado + acción ("Volver a intentar"). Nunca stack traces ni `e.message`.
- **Empty**: responde "¿Qué ocurre? ¿Qué puedo hacer?" con acción relevante.
- **Busy (acción)**: botón con spinner/label "Guardando…", deshabilitado para evitar doble envío.

## 3. Feedback por importancia

- **Crítico** (pago, eliminación): modal de confirmación explícita.
- **Medio** (guardar, enviar): toast + estado del botón.
- **Bajo** (cambios triviales): estado visible en la UI sin toast redundante.
- Confirmar solo cuando hay riesgo real; no confirmar acciones triviales.

## 4. Checklist de pantalla

- [ ] Título H1 claro y consistente con la navegación.
- [ ] UNA acción principal por contexto.
- [ ] Tabla/lista: sorting, paginación, estados vacíos.
- [ ] Formulario: labels, validación cercana al campo, sin doble envío.
- [ ] Errores sin detalles técnicos.
- [ ] Responsive 320–1920 (ver `RESPONSIVE_GUIDELINES.md`).
- [ ] A11y básica (ver `ACCESSIBILITY_GUIDELINES.md`).
- [ ] Sin dead CSS/imports introducidos.

## 5. Flujos críticos a probar (regresión)

1. Login → Panitas → pregunta → respuesta.
2. Panitas → Inventario → editar producto → guardar.
3. Clientes → cliente → crédito → abono → saldo.
4. Cobranza → cliente → mensaje → registro de intento.
5. Proveedores → proveedor → saldo → pago.
6. Ventas → venta → cliente → finanzas.
7. Reportes → reporte → detalle → Panitas.

## 6. No mask (prohibido)

Prohibido resolver problemas ocultándolos: `overflow:hidden` para tapar roturas,
`display:none` para esconder elementos problemáticos, `z-index:99999` para forzar arquitectura,
`font-size` reducido para hacer caber contenido. **Resolver la causa.**
