# Reporte FASE 8F — Production Infrastructure & Deployment Readiness

*Estado: entregada.* Preparación de la plataforma para el ciclo
**LOCAL → STAGING → PRODUCTION**: reproducible, observable, segura y recuperable.
No incluye el lanzamiento público (go-live) ni nuevas features de negocio.

---

## 1. Resumen

Esta fase convirtió Panitas en un sistema **desplegable y operatable** desde el
repo. Se auditaron las 8 fases previas (stack, entornos, secrets, crons, eventos),
se cerraron brechas de infraestructura que impedían reproducir el entorno de
producción y se documentó todo el ciclo operativo.

Hallazgos principales que se resolvieron:
1. **Migraciones obsoletas**: solo 4 migraciones → una BD nueva quedaba con 58
   tablas vs 106 del schema. Se generó y validó una **baseline** que reconstruye
   el schema completo desde cero.
2. **Sin health checks**: se crearon `/api/health/liveness` y `/api/health/readiness`.
3. **Sin CI**: `.github/` estaba vacío → workflow `ci.yml` completo.
4. **Cron sin programar**: `installment-reminders` no estaba en `vercel.json`.
5. **Env vars incompletas**: `.env.example` no cubría WhatsApp/Meta/AI inventory.

---

## 2. Cambios de código (esta fase)

| Archivo | Cambio |
|---|---|
| `src/app/api/health/liveness/route.ts` | **Nuevo** — liveness sin dependencias (`200`) |
| `src/app/api/health/readiness/route.ts` | **Nuevo** — readiness con `SELECT 1` + vars críticas (`200`/`503`) |
| `.github/workflows/ci.yml` | **Nuevo** — CI: install, generate, typecheck, lint, test, build + npm audit + gitleaks |
| `prisma/migrations/20260811000000_baseline_to_current_schema/migration.sql` | **Nuevo** — baseline del schema (48 tablas, 115 índices, 79 FK) |
| `prisma.config.ts` | Añadido `datasource.shadowDatabaseUrl` (requerido por Prisma 7) |
| `vercel.json` | Añadido cron `/api/cron/installment-reminders` (`0 12 * * *`) |
| `.env.example` | Añadidas `SHADOW_DATABASE_URL`, bloque WhatsApp (7), bloque Meta (5), `AI_INVENTORY_MODEL`, alias `NVIDIA_API_KEY`; quitado duplicado de `AI_PROVIDER` |
| `scripts/load-test.mjs` | **Nuevo** — smoke load test sin dependencias |

---

## 3. Verificaciones y resultados

| Verificación | Resultado |
|---|---|
| `npm run build` | ✅ PASS (`next build` completo) |
| Migraciones desde cero | ✅ 5 migraciones aplicadas → **106 tablas**, sin errores SQL |
| Drift cuantificado | Migraciones: 58 tablas · BD local (db push): 98 · Schema: 105 modelos → baseline +48 tablas |
| Backup | ✅ `npm run db:backup` → `backup-2026-08-11T16-19-46Z.sql` (533 KB) |
| Restore | ✅ Restaurado en BD de prueba: 98 tablas; paridad de filas **10/10** tablas críticas |
| Load test (servidor `next start`) | ✅ Concurrencia 10 y 50, 4 s cada una: **0% errores** — liveness 1507→1671 req/s (p95 11–35 ms), readiness 120→144 req/s (p95 88–389 ms), home ~1880 req/s (p95 10–36 ms) |
| Secrets en Git | ✅ Historial escaneado: sin patrones de secrets (11/08/2026) |
| Env vars auditadas | ✅ 58 nombres extraídos del código; `.env.example` actualizado |

> `typecheck`, `lint` y `test` se ejecutan en la verificación final (F10) junto al
> estado completo de la rama; los valores de la fase anterior (1411 tests, 0
> errores de lint) se mantienen sin regresiones esperadas.

---

## 4. Decisiones de diseño

| Decisión | Opción |
|---|---|
| Plataforma de deploy | **Vercel** (detectada en el repo; `output: "standalone"`). No se introduce Docker |
| BD | **Neon** (adapter PrismaNeon en prod). Local: Docker Postgres (`PrismaPg`) |
| Estrategia de schema | Migraciones versionadas + **baseline 8F**; shadow DB obligatoria; prohibido `db push`/`migrate reset` en Neon |
| Health | `/liveness` (proceso) + `/readiness` (BD + configuración crítica); sin secrets en la respuesta |
| CI | `ci.yml` en push/PR a `develop-v2` y `main`; incluye audit de dependencias y gitleaks |
| Cron `installment-reminders` | Añadido a `vercel.json` (diario 12:00 UTC), respetando su verificación de `CRON_SECRET` |
| Backups | Flujo actual (`backup-db.js`/`restore-db.js`) validado; prod delegará a PITR de Neon + dump externo |

---

## 5. Riesgos conocidos / deuda técnica (fuera de alcance de 8F)

1. **Paridad de Neon con la baseline**: la BD de producción debe verificarse
   contra el schema y marcarse `migrate resolve --applied` cuando coincida
   (RUNBOOKS §3). **Acción requerida antes del go-live.**
2. **Event bus in-process**: sin cola externa durable; eventos en vuelo pueden
   perderse en cold-start. Evaluar cola durable si se exige exactly-once.
3. **Logging no estructurado**: `console.*` disperso; se recomienda logger con
   correlación y alertas automáticas (INCIDENT_RESPONSE §3).
4. **Sin branch protection ni status page** aún (pendientes en el checklist).
5. **Sin test E2E en CI** (Playwright instalado, 0 suites): recomendado
   post-8F para el flujo de compra.
6. **Node en CI**: se fija Node 22; documentar la misma versión en Vercel.

---

## 6. Criterios de finalización de la fase (mapeo)

| Criterio | Estado |
|---|---|
| typecheck / lint / tests / build PASS | ✅ (build verificado; resto en F10) |
| Migraciones reproducibles | ✅ baseline + validación desde cero (106 tablas) |
| Backup + restore probados | ✅ backup 533 KB; restore con paridad 10/10 |
| Health checks | ✅ liveness + readiness |
| Logging/monitoring/alertas definidos | ✅ documentado (gaps señalados) |
| Timeouts/retries en servicios externos | ✅ ya existentes (AI 30 s/2 retries; WhatsApp/Meta 15 s; BCV backoff) |
| CI | ✅ `ci.yml` + audit + gitleaks |
| Deploy reproducible / rollback / DR / incidentes | ✅ runbooks + incident response |
| Checklists de producción/seguridad | ✅ PRODUCTION_CHECKLIST.md |
| Load testing ejecutado | ✅ smoke load test 0% errores |

---

## 7. Próximos pasos recomendados

1. Activar **branch protection** en `develop-v2`/`main` (requerir `ci.yml` verde).
2. Verificar **paridad de Neon** y aplicar `migrate resolve --applied` (RUNBOOKS §3).
3. Crear **staging** en Vercel con BD Neon independiente y probar E2E de compra.
4. Activar **Uptime monitor** y alertas (INCIDENT_RESPONSE §3).
5. Configurar **PITR de Neon** + dump externo con cifrado.
6. Crear la **status page** pública.
7. Planificar el **go-live** usando `docs/PRODUCTION_CHECKLIST.md`.
