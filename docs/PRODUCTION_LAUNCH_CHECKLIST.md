# PRODUCTION_LAUNCH_CHECKLIST.md — Panitas Controlled Launch (FASE 10B)

Checklist binario del lanzamiento controlado a producción del 2026-08-13. Cada ítem requiere verificación real (no asunción). Última actualización: 2026-08-13.

---

## Fase 1 — Deployment

- [x] **L01** Deploy produccional READY (`dpl_AMpN73ZaogZF2ah7pL83qb8B3A7L`)
- [x] **L02** Dominio `panitas.app` sirve el deploy produccional más reciente
- [x] **L03** Migración sincronizada con BD prod en build Vercel (`migrate deploy`)
- [x] **L04** Schema drifteado corregido (tablas faltantes recreadas, runtime verificado)

## Fase 2 — Liveness / Readiness

- [x] **L05** `/api/health/liveness` → 200 (ok)
- [x] **L06** `/api/health/readiness` → 200 (database + DATABASE_URL + AUTH_SECRET + ADMIN_SECRET + CRON_SECRET ok)
- [x] **L07** Páginas públicas 200 (raíz, rutas de marketing)
- [x] **L08** Endpoints autenticados → 401 limpio sin sesión

## Fase 3 — Smoke autenticado

- [x] **L09** Login credenciales válidas → 200 (no 401/500)
- [x] **L10** Login credenciales inválidas → 401 limpio
- [x] **L11** POS: crear orden sin teléfono → 201 (no 500)
- [x] **L12** Crédito: crear con down payment + cuotas → 201
- [x] **L13** Abono/cuota pagada → estado `on_time`
- [x] **L14** Finanzas (`/api/analytics/finanzas`) → 200 con cost/profit/margen correctos

## Fase 4 — Aislamiento de tenants

- [x] **L15** Tenant B no ve items del tenant A
- [x] **L16** Cross-tenant GET/DELETE producto → 403
- [x] **L17** Cross-tenant crédito GET/POST → 404

## Fase 5 — IA

- [x] **L18** `/api/agent/chat` responde con datos del negocio
- [x] **L19** IA usa OpenRouter + `deepseek/deepseek-v4-flash` (logs confirman provider/model)
- [x] **L20** Leak check: sin provider/model/toolCalls/prompts al cliente

## Fase 6 — Observabilidad

- [x] **L21** Headers de seguridad completos (CSP, HSTS, XFO, nosniff, referrer)
- [x] **L22** Assets `_next/static` inmutables (`max-age=31536000,immutable`)
- [x] **L23** TTFB raíz pública < 1s (~0.31s)
- [x] **L24** TTFB dashboard autenticado warm < 1s (~0.36s; cold ~3.1s aceptable)
- [x] **L25** Rutas públicas 200
- [x] **L26** Logs runtime sin errores de tablas faltantes

## Fase 7 — Rollback readiness

- [x] **L27** `vercel rollback <deploymentId>` disponible
- [x] **L28** Deployment target de rollback identificado (`dpl_8EkeVsNa2xutTYvuFwh72yv1abym`, AI correcta)
- [x] **L29** 10+ deployments previos READY disponibles como candidatos
- [x] **L30** Backup BD: aceptado por decisión (sin clientes reales)

## Fase 8 — Limpieza de datos de prueba

> **DIFERIDO por decisión del usuario (2026-08-13): "no borrar nada ahora".** Los ativos QA (productos, órdenes, créditos, tenants A/B) quedan en prod a la espera de una fecha de limpieza pactada. No son datos de clientes reales.

- [ ] **L31** Borrado datos de tenant A (productos, órdenes, créditos, tenant) — DIFERIDO
- [ ] **L32** Borrado datos de tenant B (negocio/tenant) — DIFERIDO
- [ ] **L33** Confirmado que no queda data QA residual en prod — DIFERIDO
- [ ] **L34** Credenciales QA documentadas invalidadas/eliminadas — DIFERIDO

## Fase 9 — Security final

- [x] **L35** Scanning de dependencias: 1 HIGH heredado (`xlsx`, sin fix; documentado en 10A, no es regresión)
- [x] **L36** Revisión final headers completos + sin fuga de `err.message` en rutas clave (agent/chat)

## Fase 10 — Documentación

- [x] **L37** `PHASE_10B_REPORT.md`
- [x] **L38** Este checklist (`PRODUCTION_LAUNCH_CHECKLIST.md`)
- [x] **L39** Commit de reportes (ver git log tras HEAD)

## Veredicto

- [x] **L40** **RELEASE / GO — CONDICIONAL**
  - GO a producción por: deploy exitoso, smoke autenticado PASS, aislamiento de tenants verificado, IA (OpenRouter+deepseek) operativa, misión de schema drift resuelta, observabilidad/rollback readiness PASS, sin nuevos HIGH de seguridad (solo `xlsx` heredado documentado).
  - **Condición vigente**: limpieza de datos QA en prod (tenants A/B, productos, órdenes, créditos) **DIFERIDA por decisión del usuario** — debe ejecutarse en una fecha pactada (FASE 45, items L31-L34). Se mantendrán activos hasta entonces (son datos de prueba, no clientes reales).
  - NO-GO no procede: no hay blockers ni HIGH nuevos.