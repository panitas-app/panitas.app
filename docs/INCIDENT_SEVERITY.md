# INCIDENT_SEVERITY.md — Clasificación uniforme de severidad

**FASE 10C · 2026-08-15 · Branch: `develop-v2`**

Clasificación única para todos los incidentes y observaciones de producción.

---

## Clasificación

| Severidad | Definición | Ejemplos |
|---|---|---|
| **P0** | Sistema completamente inutilizable, pérdida o corrupción de datos, vulnerabilidad crítica, fallo de aislamiento entre negocios | Pérdida de datos, cross-tenant leak, RCE, BD caída total |
| **P1** | Flujo crítico roto, fallo grave de producción, operación empresarial importante no disponible | No se puede registrar venta, login roto, IA caída para todos, integración crítica fuera |
| **P2** | Problema importante, pero existe alternativa o workaround | Feature degradada con vía manual, timeout recurrente con retry |
| **P3** | Problema menor, no bloquea operación | Config de respaldo inválida, datos inconsistentes menores, métrica ausente |
| **P4** | Problema cosmético, observación o mejora futura | Texto, formato, observaciones de mejora |

## Reglas

- **Problema financiero → mínimo P1** hasta evaluar impacto real (FASE 30).
- **Fallo de aislamiento entre negocios → P0** inmediato.
- Un 403/401 correcto (acceso legítimamente denegado) **NO es un incidente** (FASE 19).
- No agrupar 100 errores iguales como 100 problemas (FASE 6): se agrupan por causa raíz.

## Estados de incidente

| Estado | Significado |
|---|---|
| OPEN | Detectado, sin análisis |
| INVESTIGATING | En análisis de causa raíz |
| FIXED | Fix aplicado (código/config) |
| VERIFIED | Fix verificado en producción |
| MONITORING | Fix aplicado, en observación post-fix |
| ACCEPTED RISK | Riesgo documentado y aceptado por decisión explícita |
