# PRODUCTION_STABILITY_SCORECARD.md — Scorecard de estabilidad de producción

**FASE 10C · 2026-08-15 · Deploy evaluado: `dpl_2TP7CoTuQeMXMw21ioWaMgeetJB9` (panitas.app)**

Evaluación de estabilidad post-lanzamiento. Regla: todo con evidencia; `NOT CURRENTLY MEASURED` donde no exista métrica (no se inventan números).

---

## Stability Window (FASE 41)

- **Ventana de estabilidad propuesta**: **2026-08-13 → 2026-08-15 (~48 h)** con evidencia de mayor alcance:
  - Deploys en ventana: 2 (`dpl_4UKi83drT9uN3jPsF6uwqtALLggV` PostHog ~08-13/14, `dpl_2TP7CoTuQeMXMw21ioWaMgeetJB9` fix AI 08-15).
  - Trazas AI en `AuditLog` desde 2026-08-03 (12 días de histórico, 29 `agent.completed`).
  - Crons: `low_stock` ejecutado 08-14 y 08-15 a las 09:59:46 (diario OK); `update-bcv` sin dato 08-15 (P4, ventana/feriado probable).
  - Correos: 59 registros (55 sent, 4 sending, 0 failed), último 08-15 09:59.
- **Estado**: ventana corta pero con señales consistentes; la ventana exacta queda a criterio del usuario.

---

## Scorecard por categoría

| # | Categoría (FASE) | Métrica | Estado | Evidencia |
|---|---|---|---|---|
| 1 | Availability (41) | Liveness/Readiness/home/login | ✅ 200 | smoke directo múltiples veces |
| 2 | Availability (41) | Uptime % / SLO formal | ⚪ NOT CURRENTLY MEASURED | sin Uptime Monitor |
| 3 | Error rate (42) | 500s en ventana | ✅ 0 | `vercel logs` deploy actual |
| 4 | Error rate (42) | Error tracking (Sentry) | ⚪ NO CONFIGURADO | inventario observabilidad |
| 5 | Latencia (13) | Home warm / readiness warm | ✅ FAST-ACCEPTABLE | 213-233 ms / 115-203 ms |
| 6 | Latencia (13) | Cold start | ✅ ACCEPTABLE | readiness ~2 s, documentado |
| 7 | BD (11-12) | Locks, queries largas, fallos | ✅ 0/0/1 | `pg_stat_*` |
| 8 | BD (11-12) | Conexiones, autovacuum, dead tuples | ✅ saludable | 4 conexiones, autovacuum activo, ≤55 dead tuples |
| 9 | BD (11-12) | Slow query histórico | ⚪ NO MEDIDO | falta `pg_stat_statements` |
| 10 | AI (14-15) | Fallos agente 24h | ✅ 0 | `AuditLog` |
| 11 | AI (14-15) | Liveness proveedor NVIDIA | ✅ 200 | prueba HTTP |
| 12 | AI (14-15) | Latencia/calidad por turno | ⚪ PARCIAL | traces existen, sin export a métricas |
| 13 | AI (15) | Fallback OpenRouter | ⚠️ Key 401 inválida | no usada (AI_PROVIDER=nvidia) |
| 14 | Auth (19) | 401 en protegidas sin sesión | ✅ correcto | smoke |
| 15 | Auth (19) | CSRF | ✅ correcto | 403 en chat cross-origin |
| 16 | Tenant isolation (20) | Aislamiento | ✅ PASS | 10B (verificado) |
| 17 | Integraciones (21-24) | Email | ✅ 0 failed | EmailLog |
| 18 | Integraciones (21-24) | Webhooks/WhatsApp | ⚪ DEFERRED (0 filas, envs MISSING) | BD + env |
| 19 | Jobs/Crons (25) | low_stock / BCV | ✅ / ⚠️ P4 | EmailLog 09:59:46; BcvRate sin update 08-15 |
| 20 | Rate limits (26) | Distribuido | ⚠️ fallback in-memory | Upstash MISSING |
| 21 | Datos (28-32) | Consistencia de datos | ✅ 16 checks, 1 falso positivo | chequeos no destructivos |
| 22 | Datos (28-32) | Financiero/crédito | ✅ correcto | ORD-20260723-CAOY analizado legítimo |
| 23 | Frontend (9,34) | Errores de consola/pageError | ⚠️ GA bloqueado por CSP (P3) | navegador real |
| 24 | Navegador (34) | Chromium real, vistas públicas | ✅ 200, render OK | Playwright |
| 25 | Móvil (33) | Layout 390px | ✅ sin break visual | viewport 390×844 |
| 26 | Accesibilidad (35) | Auditoría formal | ⚪ NO EJECUTADA | sin tooling automatizado (axe no presente) |
| 27 | Seguridad (36) | Headers | ✅ CSP/HSTS/nosniff/DENY | smoke |
| 28 | Seguridad (36) | `npm audit` | ⚠️ 2 HIGH `xlsx` (ACCEPTED) | 10B.1 |
| 29 | Deploy/fix (37-40) | Fix AI en prod | ✅ VERIFIED | deploy READY + smoke + tests 30/30 + 449 AI |
| 30 | Release health (42) | Releases en ventana | ✅ sin regresión tras fixes | suite 1435 PASS |

## Resumen de puntuación

- ✅ **Verde (medido, saludable): 18**
- ⚠️ **Ámbar (medido, con observación no bloqueante): 5** — OpenRouter key, BCV 08-15, rate-limit in-memory, GA/CSP, npm audit
- ⚪ **Gris (no medido / no instrumentado): 7** — uptime formal, error tracking, slow query, latencia AI, accesibilidad, Web Vitals, logs agregados
- ❌ **Rojo (fallo en producción): 0**

## Umbrales de estabilidad (FASE 47)

| Umbral | Regla | Estado |
|---|---|---|
| ¿P0 o P1 abiertos sin fix? | No → estable | ✅ 0 abiertos |
| ¿Pérdida/corrupción de datos? | No → estable | ✅ 0 |
| ¿Fallos de aislamiento entre negocios? | No → estable | ✅ 0 |
| ¿Redes de producción degradada? | No → estable | ✅ 0 |
| ¿Incidentes P2+ no mitigados? | Requiere observación | ⚠️ 1 P2 ACCEPTED (xlsx, decisión usuario 10B.1) |
| Ventana de estabilidad de 24-72 h sin incidentes | → STABLE | ✅ ~48 h sin P0-P1 |

## Veredicto

**PRODUCTION STABLE WITH OBSERVATIONS** — no hay fallos en producción (0 P0/P1 abiertos), datos consistentes, IA y correo operando; quedan observaciones no bloqueantes documentadas (P2 xlsx aceptado por decisión del usuario; P3: GA/CSP, OpenRouter key, rate-limit in-memory, PostHog server keys; P4: BCV 08-15, emails "sending") y brechas de instrumentación de observabilidad.
