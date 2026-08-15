# PRODUCTION_BASELINE.md — Línea base de producción

**FASE 10C · 2026-08-15 · Branch: `develop-v2` · Deploy actual: `dpl_2TP7CoTuQeMXMw21ioWaMgeetJB9` (fix AI, `69a8df1`) · Alias: `panitas.app`**

Línea base del estado de producción observado de forma real. Regla: **no inventar números** — las métricas sin instrumentación se documentan como `NOT CURRENTLY MEASURED`.

---

## 1. Availability

| Métrica | Valor | Evidencia |
|---|---|---|
| Liveness `/api/health/liveness` | 200 | smoke directo (múltiples muestras) |
| Readiness `/api/health/readiness` | 200 (db + 4 envs) | smoke directo |
| Página home `/` | 200 | smoke directo |
| `/login` | 200 | smoke directo |
| Uptime % formal | NOT CURRENTLY MEASURED | no hay Uptime Monitor/SLA configurado |

## 2. Error rate

| Métrica | Valor | Evidencia |
|---|---|---|
| Error rate global | NOT CURRENTLY MEASURED | Vercel no expone % agregado; sin Sentry/error tracking |
| Logs de runtime con nivel error | **0 errores** en ventana observada (deploy `dpl_2TP7…`) | `vercel logs dpl_2TP7CoTuQeMXMw21ioWaMgeetJB9` |
| Errores HTTP 500 | 0 en logs del deploy actual | idem |
| Endpoints protegidos sin sesión | 401 limpio (`/api/products`, `/api/orders`, `/api/admin/stats`) | smoke HTTP |
| POST cross-origin a `/api/agent/chat` | 403 CSRF correcto | smoke HTTP |

## 3. Latency / API response times (mediciones warm del 2026-08-15)

| Ruta | P50 aprox (warm) | Cold start | Clasificación |
|---|---|---|---|
| `/` (home) | ~213-233 ms | — | ACCEPTABLE |
| `/login` | ~132 ms | — | FAST |
| `/api/health/readiness` | ~115-203 ms | ~1-2 s | ACCEPTABLE |
| `/api/auth/session` | ~236 ms | — | ACCEPTABLE |
| `/terminos` | ~238 ms | — | ACCEPTABLE |

## 4. Database performance

| Métrica | Valor | Evidencia |
|---|---|---|
| PostgreSQL version | 18.4 (Neon, aarch64) | `SELECT version()` |
| max_connections | 901 | `current_setting` |
| shared_buffers | 230 MB | `current_setting` |
| work_mem | 4 MB | `current_setting` |
| Conexiones activas al momento | 4 (1 active, 3 idle) | `pg_stat_activity` |
| Locks no concedidos | 0 | `pg_locks` |
| Queries largas activas | 0 | `pg_stat_activity` |
| Queries fallidas (7d) | 1 | `pg_stat_database` |
| Autovacuum/autoanalyze | ACTIVO (Product, Conversation, etc.) | `pg_stat_user_tables` |
| Dead tuples máximos | 55 (EmailLog), sin OOM | `pg_stat_user_tables` |
| Slow query log (pg_stat_statements) | NOT AVAILABLE | extensión no habilitada |

## 5. AI response times / failure rate

| Métrica | Valor | Evidencia |
|---|---|---|
| Proveedor activo | **NVIDIA NIM** (`AI_PROVIDER=nvidia`, model `nvidia/nemotron-3-ultra-550b-a55b`) | env Vercel + liveness 200 |
| Liveness proveedor | 200 (chat completions, ping 1 token) | prueba HTTP |
| Timeout configurado | 30 000 ms | `AI_TIMEOUT_MS` |
| Retries configurados | 2 | `AI_RETRIES` |
| Turnos agente completados (24h) | 7 | `AuditLog` `agent.completed` |
| Fallos de agente (24h) | 0 | `AuditLog` `agent.failed` |
| Fallos históricos de agente | 4 (2026-08-03 a 08-07, antes del proveedor configurado) | `AuditLog` `agent.failed` (provider: unknown) |
| Latencia por turno IA | NOT CURRENTLY MEASURED | traces existen (`agent.trace`) pero no se exportan a métricas |
| AI failure rate formal | NOT CURRENTLY MEASURED | sin agregación |

## 6. Authentication / Authorization failures

| Métrica | Valor | Evidencia |
|---|---|---|
| Logins fallidos (24h) | NOT CURRENTLY MEASURED | no hay log de intentos fallidos persistido (solo rate-limit in-memory) |
| 401 en rutas autenticadas sin sesión | Correcto | smoke: `/api/products` 401, `/api/orders` 401 |
| 403 autorización cross-tenant | Verificado en 10B (aislamiento PASS) | reporte 10B |
| Sesiones expiradas | NOT CURRENTLY MEASURED | — |

## 7. External integrations

| Integración | Estado | Evidencia |
|---|---|---|
| Email (confirmaciones, welcome, low-stock) | ACTIVO | `EmailLog`: 55 sent, 4 sending, 0 failed (último envío 2026-08-15 09:59) |
| NVIDIA NIM (IA) | ACTIVO | liveness 200 |
| OpenRouter (backup IA) | ⚠️ Key 401 inválida | `GET /api/v1/auth/key` → 401 (no usada, `AI_PROVIDER=nvidia`) |
| PostHog (analytics) | ACTIVO (captura client-side) | token público `phc_…` presente; 2 keys server-side vacías bajo `env run` |
| WhatsApp / Meta | DEFERRED (envs MISSING) | reporte 10B.1 |
| Upstash Redis (rate-limit) | NO configurado → fallback in-memory | `UPSTASH_REDIS_*` MISSING |
| BCV (tasa USD) | ACTIVO | `BcvRate` 75 filas; última 2026-08-14 04:24 (sin update 08-15 aún) |

## 8. Frontend errors

| Métrica | Valor | Evidencia |
|---|---|---|
| Hydration/runtime errors | NOT CURRENTLY MEASURED | sin error tracking frontend (Vercel Web Analytics/Speed Insights no habilitados) |
| Chunk load errors | NOT CURRENTLY MEASURED | — |
| Web Vitals | NOT CURRENTLY MEASURED | — |

## 9. Backend errors

| Métrica | Valor | Evidencia |
|---|---|---|
| 500 en rutas públicas | 0 en ventana | `vercel logs` |
| Excepciones no manejadas | NOT CURRENTLY MEASURED | logs no estructurados |
| Timeouts | NOT CURRENTLY MEASURED | — |

## 10. Seguridad (baseline)

| Check | Estado | Evidencia |
|---|---|---|
| CSP | presente | header de `/` |
| HSTS | `max-age=63072000; includeSubDomains; preload` | header de `/` |
| X-Frame-Options | DENY | header de `/` |
| X-Content-Type-Options | nosniff | header de `/` |
| Referrer-Policy | strict-origin-when-cross-origin | header de `/` |
| `npm audit` | 2 HIGH heredados `xlsx` (sin fix npm) | 10B.1 |

## 11. Métricas aún NO MEDIDAS (a instrumentar si se requiere)

- Uptime/SLO formal, error rate agregado, APM serverless (memoria/CPU/tiempo de ejecución)
- Web Vitals / Core Web Vitals
- Latencia de chat IA por turno (hay traces, falta export)
- Logins fallidos persistidos
- Slow query analysis (falta `pg_stat_statements`)
- Retention/capacidad real de Neon (plan no consultable)

## 12. Conclusión de baseline

La plataforma responde 200 en rutas públicas y críticas, BD saludable (0 locks, 0 long queries, autovacuum activo), IA activa con 0 fallos en 24h, emails 0 failed, auth/CSRF correctos. Las brechas son de **instrumentación de observabilidad** (métricas agregadas/APM/error tracking), no de fallos observados.
