# PHASE_10C_REPORT.md — Post-Launch Stability & Observability

**Fecha:** 2026-08-15 · **Branch:** `develop-v2` · **Producción:** `panitas.app` (deploy `dpl_2TP7CoTuQeMXMw21ioWaMgeetJB9`)
**Fases 1-50 del prompt 10C — ver fases individuales en cada documento de esta fase.**

---

## 1. Resumen ejecutivo

Panitas 2.0 está en producción con **cero fallos abiertos de severidad P0/P1**. La plataforma responde correctamente en rutas públicas y autenticadas (auth 401/CSRF correctos), la base de datos está saludable (0 locks, 0 queries largas, autovacuum activo), el proveedor de IA NVIDIA opera (200, 0 fallos de agente en 24 h), el correo funciona (0 failed) y los datos son consistentes (16 chequeos, 1 falso positivo analizado). Durante esta fase se desplegó a producción el **fix del bug AI "no hay productos"** (commit `69a8df1`), verificado por tests y smoke post-deploy.

Las observaciones pendientes son de severidad P2/P3/P4 no bloqueantes, en su mayoría de **configuración/instrumentación de observabilidad** (ver Sección 5).

## 2. Veredicto de estabilidad

### **PRODUCTION STABLE WITH OBSERVATIONS**

- Estable: no hay incidentes P0/P1 abiertos; datos consistentes; IA/correo/BD operativos; ~48 h de ventana sin fallos.
- Con observaciones: 1 riesgo aceptado por decisión del usuario (xlsx), 6 hallazgos P3 y 3 P4 documentados y sin impacto en la operación actual.

## 3. Evidencia clave

| Área | Resultado | Fuente |
|---|---|---|
| Deploy fix AI | `69a8df1` → `dpl_2TP7CoTuQeMXMw21ioWaMgeetJB9` READY, smoke 200 | Vercel CLI + HTTP |
| Latencia warm | home 213-233 ms, readiness 115-203 ms, login 132 ms | mediciones HTTP |
| BD | PG 18.4, 4 conexiones, 0 locks, 0 queries largas, autovacuum OK | SQL |
| Consistencia de datos | 16/16 checks (1 falso positivo analizado y descartado) | SQL |
| AI | NVIDIA 200; `agent.completed` 7 / `agent.failed` 0 en 24 h | AuditLog + HTTP |
| Correo | 59 registros: 55 sent, 4 sending, 0 failed | EmailLog |
| Crons | `low_stock` diario 09:59:46 (08-14 y 08-15) | EmailLog |
| Auth | 401 en protegidas, 403 CSRF en chat cross-origin | HTTP |
| Navegador real | Chromium 390×844: 3 páginas públicas 200, render OK; **GA bloqueado por CSP** | Playwright |
| Tests | executor 30/30; suite AI 449 PASS; suite global 1435 PASS (10B.1) | vitest |

## 4. Incidentes (FASE 5)

Registro completo: `docs/PRODUCTION_INCIDENT_REGISTER.md`. Resumen:

| ID | Sev | Estado |
|---|---|---|
| 10C-01 Fallos de agente pre-config | P1 | FIXED (config) |
| 10C-02 Bug AI "no hay productos" | P1 | VERIFIED (deploy 08-15) |
| 10C-03 xlsx (2 HIGH, sin fix npm) | P2 | ACCEPTED RISK (decisión usuario) |
| 10C-04 OpenRouter key 401 | P3 | MONITORING |
| 10C-05 PostHog server keys vacías | P3 | OPEN/INVESTIGATING |
| 10C-06 Rate limit in-memory | P3 | ACCEPTED RISK |
| 10C-07 BCV sin update 08-15 | P4 | MONITORING |
| 10C-08 4 emails "sending" | P4 | MONITORING |
| 10C-09 Web Analytics/Speed Insights off | P3 | ACCEPTED RISK |
| 10C-10 Backup no automatizado | P3 | ACCEPTED RISK |
| 10C-11 payments_sum (falso positivo) | P4 | CLOSED |
| 10C-12 AttentionItem sin resolver | P4 | MONITORING |
| **10C-13 GA4/GTM bloqueados por CSP** | **P3** | **OPEN — decisión requerida** |

## 5. Observaciones a resolver (decisión requerida)

| # | Observación | Opciones | Recomendación |
|---|---|---|---|
| A | **GA4/GTM inoperante por CSP** (10C-13) | (1) añadir `https://www.google-analytics.com https://www.google.com` a `connect-src` en `next.config.ts`; (2) retirar GA de `layout.tsx` y usar solo PostHog | Evaluar si Google Analytics es necesario; si no, opción 2 (menos superficie). Es un cambio de una línea con re-deploy |
| B | PostHog server keys (10C-05) | Re-setear `POSTHOG_PROJECT_SECRET_KEY`/`POSTHOG_PERSONAL_API_KEY` en Vercel | Verificar con credenciales del usuario si se quiere consulta server-side/dashboard |
| C | OpenRouter key inválida (10C-04) | Rotar key o retirar | Rotar si se desea usar OpenRouter como backup de NVIDIA |
| D | Backup automatizado (10C-10) | Cron/snapshot Neon | Implementar automatización (recomendado antes de escala real) |
| E | Web Analytics/Speed Insights (10C-09) | Activar en dashboard Vercel (0 código) | Activar para medir Web Vitals |
| F | Accesibilidad (FASE 35) | Auditoría con axe/audit formal | Programar en fase de producto |

## 6. Riesgos aceptados (FASE 43)

- **xlsx 2 HIGH** (P2, sin fix npm): aceptado por decisión del usuario (10B.1).
- **Rate limit in-memory** (P3): aceptado para la escala actual; configurar Upstash al escalar.
- **Web Analytics/Speed Insights desactivados** (P3): aceptado mientras no se requiera Web Vitals.
- **Backup manual** (P3): backup reciente existe; riesgo de no automatización aceptado temporalmente.
- **Sin error tracking** (P3): aceptado a corto plazo; logs Vercel disponibles.

## 7. Deuda técnica y mejoras (FASE 44)

- Habilitar `pg_stat_statements` (slow query histórico).
- Instrumentar latencia/calidad de turnos AI (los traces existen, falta export agregado).
- Persistir intentos de login fallidos.
- Automatizar backup.
- Tests e2e de navegador (Playwright instalado, sin suites).
- Decidir el destino de GA/GTM.

## 8. Recomendación final (FASE 50)

**READY TO CONTINUE PRODUCT DEVELOPMENT.**

La producción es estable para continuar el ciclo de desarrollo del producto. Antes de escalar (más usuarios/trafico real), se recomienda resolver en orden: **D (backup automatizado) → A (GA/CSP) → E (Web Analytics) → B/C (keys)**, todos cambios menores fuera del flujo crítico de la app. No se requiere ventana de estabilidad adicional para el estado actual.

## 9. Resolución del prompt 10C (FASE 48-49)

- **Status:** PRODUCTION STABLE WITH OBSERVATIONS
- **Recommendation:** READY TO CONTINUE PRODUCT DEVELOPMENT
- **Stability window propuesta:** 2026-08-13 → 2026-08-15 (~48 h) + histórico AI 12 días (08-03 → 08-15).
- Documentos de la fase: `PRODUCTION_BASELINE.md`, `OBSERVABILITY_INVENTORY.md`, `INCIDENT_SEVERITY.md`, `PRODUCTION_INCIDENT_REGISTER.md`, `PRODUCTION_STABILITY_SCORECARD.md`, `PHASE_10C_REPORT.md`.
- **Entregable operativo:** fix AI desplegado a producción (commit `69a8df1`).

---

*Fin de FASE 10C. Se detiene la ejecución esperando decisión del usuario sobre las observaciones de la Sección 5 y la siguiente fase.*
