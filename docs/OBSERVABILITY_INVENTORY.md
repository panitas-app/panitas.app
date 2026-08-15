# OBSERVABILITY_INVENTORY.md — Inventario de observabilidad

**FASE 10C · 2026-08-15 · Branch: `develop-v2`**

Auditoría de todas las fuentes de observabilidad disponibles y sus limitaciones.

---

## Fuentes disponibles

### 1. Vercel Runtime Logs

| Atributo | Valor |
|---|---|
| Propósito | Logs de ejecución de serverless functions (requests, status, console) |
| Datos disponibles | Request path + status + nivel (info/error/warn) + mensajes `console.log/error` de la app; filtros por status-code, query, time, source |
| Retención | Limitada (logs históricos de deployments anteriores se purgan; solo el deploy actual conserva visibilidad clara) |
| Acceso | `vercel logs <deployment> [flags]` (CLI), dashboard Vercel |
| Limitaciones | No agrega error rate ni latencia; sin trazado distribuido; logs de deployments previos desaparecen rápido; sin alertas |

### 2. Health Checks (código propio)

| Atributo | Valor |
|---|---|
| Propósito | Liveness (servicio vivo) y readiness (DB + envs requeridos) |
| Endpoints | `/api/health/liveness`, `/api/health/readiness` |
| Datos | `{status, checks:[{name,ok,detail}], ts}` |
| Retención | N/A (en tiempo real) |
| Acceso | HTTP público |
| Limitaciones | Solo on-demand; sin histórico ni alertas automáticas; readiness verifica 4 envs (`DATABASE_URL`, `AUTH_SECRET`, `ADMIN_SECRET`, `CRON_SECRET`) |

### 3. Database logs / telemetría (PostgreSQL / Neon)

| Atributo | Valor |
|---|---|
| Propósito | Estado y salud de la BD |
| Datos | `pg_stat_activity`, `pg_stat_user_tables`, `pg_stat_database`, `pg_locks`, tamaños de BD/tablas, extensiones, conexiones |
| Retención | La que mantenga Neon (snapshots/statistics); accesible en vivo |
| Acceso | SQL directo via `vercel env run -e production` + psql (helper Docker) |
| Limitaciones | `pg_stat_statements` NO habilitado → sin análisis de slow queries histórico; sin logs de consultas en vivo; capacidades del plan Neon no consultables (UNKNOWN) |

### 4. AuditLog (aplicación)

| Atributo | Valor |
|---|---|
| Propósito | Auditoría de acciones de negocio + trazas del agente (`agent.completed`, `agent.failed`, `agent.trace`) |
| Datos | `action`, `entity`, `entityId`, `userId`, `metadata` (JSON) |
| Retención | Ilimitada (tabla en BD prod) |
| Acceso | SQL / código |
| Limitaciones | Metadata de traza AI sin datos sensibles (por diseño); no hay UI de consulta agregada; no incluye latencia por turno completa |

### 5. EmailLog

| Atributo | Valor |
|---|---|
| Propósito | Rastreo de envíos de email (template, status, attempts, error) |
| Datos | `to`, `template`, `status` (sent/sending/failed), `attempts`, `error`, `createdAt`, `sentAt` |
| Retención | Ilimitada (tabla en BD prod) |
| Acceso | SQL |
| Limitaciones | Solo correo; `sending` puede quedar atascado sin retry visible |

### 6. PostHog (analytics producto)

| Atributo | Valor |
|---|---|
| Propósito | Captura de eventos de usuario (pageview, login, identify, reset) |
| Datos | Eventos client-side via `/ingest` (rewrite a `us.i.posthog.com`); capture server-side de login |
| Retención | Plan PostHog Cloud (no consultado) |
| Acceso | Dashboard PostHog (credenciales del usuario) |
| Limitaciones | **2 keys server-side aparecen vacías** bajo `vercel env run` (`POSTHOG_PROJECT_SECRET_KEY`, `POSTHOG_PERSONAL_API_KEY`) — captura client-side funciona con token público; dashboard no accesible desde este entorno de trabajo (401 sin key) |

### 7. Vercel Web Analytics / Speed Insights

| Atributo | Valor |
|---|---|
| Propósito | Métricas de rendimiento frontend (Web Vitals) y analytics de página |
| Datos | — |
| Retención | — |
| Acceso | — |
| Limitaciones | **NO habilitados** (flags `webAnalytics`/`speedInsights` sin activar en el proyecto) → Web Vitals NOT MEASURED |

### 8. Error tracking (Sentry/otro)

**NO CONFIGURADO.** No hay Sentry, Datadog, Logtail, etc. Errores solo visibles via `console.error` → Vercel logs.

### 9. AI provider telemetry

| Proveedor | Telemetría |
|---|---|
| NVIDIA NIM | Dashboard/telemetría del proveedor NO accesible desde este entorno (sin credenciales de portal) |
| OpenRouter | NO accesible (key inválida 401, no usada) |
| Interna | `agent.trace` (intención, plan, tools, tiempo por tool, errores) persiste best-effort a AuditLog + `agent.completed/failed` — sin export a métricas |

### 10. External provider dashboards

| Proveedor | Estado |
|---|---|
| Neon (DB) | Dashboard no accesible desde este entorno (sin credenciales de portal); estado consultable vía SQL |
| Cloudinary (uploads) | Env `CLOUDINARY_URL` existe; sin telemetría consultada |
| Vercel | Dashboard CLI accesible (logs, deployments, env) |

### 11. Crons (Vercel)

| Atributo | Valor |
|---|---|
| Propósito | 8 crons: `update-bcv` (04:00), `expire-plans` (00:00), `reservation-reminders` (08:00), `post-purchase` (10:00), `inactive-clients` (06:00 lun), `low-stock` (09:00), `subscription-second-payment` (07:00), `installment-reminders` (12:00) |
| Datos de evidencia | `EmailLog` (low_stock, payment_pending, order_confirmation…), `BcvRate`, `AuditLog` |
| Retención | Vercel Cron mantiene histórico de invocaciones en dashboard |
| Limitaciones | Sin dashboard consultado; evidencia indirecta por tablas de efecto; `reservation-reminders`/`post-purchase`/`inactive-clients`/`installment-reminders`/`subscription-second-payment` sin datos de efecto visibles en esta ventana (bajo uso real) |

---

## Resumen de brechas de observabilidad

| Brecha | Impacto | Acción sugerida |
|---|---|---|
| Sin error tracking (Sentry) | Errores frontend ciegos | Instrumentar si se requiere |
| Web Analytics/Speed Insights desactivados | Web Vitals no medidos | Activarlos en Vercel (0 código) |
| `pg_stat_statements` ausente | Sin slow query history | Habilitar en Neon (requiere decisión) |
| Sin agregación de logs (solo CLI) | No hay alertas/paneles | Considerar Logtail/otro si se requiere |
| PostHog server keys vacías | Captura server-side limitada | Re-setear/verificar con el usuario |
| Sin dashboard Neon/OpenRouter | Capacidad/telemetría de proveedores UNKNOWN | Credenciales de portal del usuario |
