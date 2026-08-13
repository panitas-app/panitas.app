# PANITAS — Arquitectura de Producción (FASE 10A)

> *Última actualización: 13/08/2026 — FASE 10A (Production Engineering & Launch Candidate), FASE 1: reconocimiento.*
> *Este documento reemplaza a la versión de FASE 8F y es la fuente de verdad de la arquitectura para la auditoría 10A.*
> *Documento vivo: actualizar cuando cambie el stack, se añadan integraciones o se modifiquen entornos.*

---

## 1. Objetivo

Describir la **arquitectura real detectada** en el código de la plataforma Panitas
(no preferencias teóricas) para que cualquier operador entienda: piezas y conexiones,
variables de entorno y su clasificación, gestión de datos/migraciones/jobs/backups,
cómo se despliega y cómo se observa en producción. Regla transversal:
**reproducibilidad** — cualquier entorno nuevo debe levantarse de forma automatizada
desde el repositorio.

> Estado del reconocimiento (FASE 1): verificado contra el código fuente el 13/08/2026.
> Los hallazgos abiertos de 10A se registran en la §13 y se auditan en las fases siguientes.

---

## 2. Vista general del stack

| Capa | Tecnología | Notas |
|---|---|---|
| Framework | **Next.js 16.2.6** (App Router) + React 19.2.4 + TypeScript | `output: "standalone"`, `reactStrictMode`, `poweredByHeader: false` |
| Hosting | **Vercel** (serverless + edge/cron) | Dominio canónico: `https://panitas.app` (www → apex en prod) |
| Base de datos | **PostgreSQL** — Neon (prod) / Docker (local) | Adapter por heurística URL (`localhost/127.0.0.1` → `PrismaPg`, resto → `PrismaNeon`) en `src/lib/prisma.ts` |
| ORM | **Prisma 7.8.0** | `prisma.config.ts`; **105 modelos**; 5 migraciones |
| Autenticación | **Auth.js v5** (JWT) + Google OAuth | `AUTH_SECRET`; vendedores con JWT propio (`SELLER_JWT_SECRET`) |
| Autorización admin | Cookie httpOnly `admin_token` firmada con `ADMIN_SECRET` | `/api/admin/auth`; `npm run admin -- --setup` |
| Archivos | **Cloudinary** | Imágenes/videos (productos, tienda, media inbox) |
| Email | **Resend** | Transaccionales + resumen |
| SMS | **Twilio** (opcional) | Verificación por teléfono |
| Realtime | **Pusher** | POS, escáner, sincronización |
| Inbox omnicanal | **WhatsApp Cloud API + Meta (Instagram/Messenger)** | Multi-tenant: token por negocio en `ChannelConnection` |
| IA | **Agent Core** con model-router | NVIDIA NIM (activo) + OpenRouter (respaldo); `AI_TIMEOUT_MS`/`AI_RETRIES` |
| Analítica | **PostHog** | Proxy `/ingest/*` vía rewrites |
| BCV | Scheduler interno + cron | Tasa de cambio Venezuela; backoff |
| Rate limiting | **Upstash Redis** (opcional) + fallback en memoria | `src/lib/rate-limit.ts` |
| Eventos | **Event bus en proceso** | NO es cola externa durable (ver §8) |
| Pagos | **MANUAL** (comprobante + verificación admin) | Sin pasarela automatizada — ver §12 y `PAYMENT_SEND_REVIEW.md` |

### Flujo de una petición web

```
Cliente ── HTTPS ──► Vercel (panitas.app)
                        │  (www → apex redirect; HSTS/CSP headers)
                        ▼
              Next.js App Router
        ├─ Páginas públicas (SSG/SSR): /, landings, /pricing, /store/[slug]
        ├─ API routes (/api/*): auth, pedidos, inventario, inbox, agent, v1...
        └─ Webhooks entrantes (/api/webhooks/whatsapp|instagram|messenger)
                        │
                        ▼
        PostgreSQL (Neon) ◄── Prisma 7 ──┐
        Cloudinary / Resend / Twilio / Pusher / PostHog / NVIDIA-NIM / OpenRouter
```

---

## 3. Entornos

Cada entorno tiene configuración y datos **independientes**; nunca se comparten
secrets ni se apunta una app a la BD de otro entorno.

| Entorno | Dominio | BD | Notas |
|---|---|---|---|
| **development** (local) | `http://localhost:3000` | Docker PostgreSQL (ver hallazgo H-01) | `.env.local`; schema vía `db:push` o migraciones |
| **test** | — | `panitas_test` (vitest, embed en `vitest.config.ts`) | Placeholders, nunca secrets |
| **staging** | subdominio Vercel | **Neon independiente** | Proyecto Vercel separado; migraciones validadas aquí primero |
| **production** | `https://panitas.app` | **Neon de producción** | Crons, aliases y dominios en este proyecto |

> **Regla**: toda migración se valida primero en staging sobre BD recién creada
> (`prisma migrate deploy`). Nunca `prisma db push` contra Neon (wrapper `safe-prisma.js`).

---

## 4. Variables de entorno

Fuente única de nombres: **`.env.example`** (versionado, sin valores). El inventario
completo, clasificación y estado por entorno vive en **`docs/ENVIRONMENT_MATRIX.md`**
(creado en 10A FASE 2). Total detectado en código: **~65 nombres** (47 con
`process.env.X` + ~18 leídos vía helpers `env()`/`env[...]` en configs de WhatsApp/Meta/Agent-Core).

Resumen por categoría:

### Públicas (se incrustan en el bundle — NO son secretos)
`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_POSTHOG_HOST`,
`NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `NEXT_PUBLIC_PUSHER_KEY`,
`NEXT_PUBLIC_PUSHER_CLUSTER`.

### Servidor (no exponer al cliente)
`DATABASE_URL`, `SHADOW_DATABASE_URL`, `AUTH_URL`, `AUTH_TRUST_HOST`,
`NEXTAUTH_URL`, `ADMIN_EMAIL`, `BCV_MONITOR_*`, `BCV_TIMEZONE`, `AI_PROVIDER`,
`AI_TIMEOUT_MS`, `AI_RETRIES`, `*_MODEL` (CHAT/BUSINESS/JSON/CLASSIFICATION/
SUMMARIZATION/REPLY_SUGGESTION/AI_INVENTORY) y sus `*_PROVIDER/_TEMPERATURE/
_MAX_TOKENS`, `OPENROUTER_BASE_URL/APP_TITLE/HTTP_REFERER`, `NVIDIA_NIM_BASE_URL`,
`PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_CLUSTER`, `WHATSAPP_*` (config de app),
`META_*` (config de app), `NEXT_RUNTIME`, `NODE_ENV`, `VERCEL`.

### Secretos (rotar si se filtran; jamás en Git)
`AUTH_SECRET` / `NEXTAUTH_SECRET`, `ADMIN_SECRET`, `CRON_SECRET`,
`SELLER_JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CLOUDINARY_URL`,
`RESEND_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`,
`TWILIO_PHONE_NUMBER`, `OPENROUTER_API_KEY`, `NVIDIA_NIM_API_KEY` (`NVIDIA_API_KEY`
alias), `WHATSAPP_APP_SECRET`, `WHATSAPP_DEFAULT_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`,
`META_APP_SECRET`, `META_VERIFY_TOKEN`, `PUSHER_SECRET`, `UPSTASH_REDIS_REST_TOKEN`,
`UPSTASH_REDIS_REST_URL`.

---

## 5. Datos y migraciones

- **BD**: PostgreSQL. Producción: **Neon** (adapter `PrismaNeon`). Local: Docker
  (`PrismaPg`). Heurística en `src/lib/prisma.ts:19`.
- **Modelos**: **105 modelos Prisma**.
- **Migraciones**: `prisma/migrations/` con **5** migraciones, incluida la baseline
  `20260811000000_baseline_to_current_schema` (8F) que refleja el schema completo.
- **Flujo de cambio de schema** (detalle en `docs/DATABASE_OPERATIONS.md` 10A y RUNBOOKS):
  1. editar `prisma/schema.prisma`,
  2. generar migración en local y validar `migrate deploy` sobre BD limpia,
  3. desplegar en staging (BD nueva) y luego producción.
- **Shadow DB**: `SHADOW_DATABASE_URL` exigida distinta de `DATABASE_URL`.
- **Regla crítica**: nunca `db push --force-reset` / `migrate reset` / `migrate dev`
  contra Neon. `scripts/safe-prisma.js` los bloquea.

---

## 6. Integraciones externas y resiliencia

| Integración | Cómo se usa | Timeout / retries |
|---|---|---|
| WhatsApp Cloud API | Webhooks HMAC + envío (`src/lib/whatsapp/`, `communication/providers`) | `WHATSAPP_TIMEOUT_MS` (15 s) |
| Meta Instagram/Messenger | Webhooks firmados + Graph API | `META_TIMEOUT_MS` (15 s) |
| Cloudinary | Subida de media | SDK; tamaños validados (`file-validate.ts`) |
| Resend | Emails | SDK; fallos no bloquean flujos |
| Twilio | SMS | SDK |
| NVIDIA NIM / OpenRouter | IA | `AI_TIMEOUT_MS` (30 s) + `AI_RETRIES` (2) |
| PostHog | Analítica | No bloqueante |
| Pusher | Realtime | No bloqueante |
| BCV | Tasa | 1 intento con backoff (300 ms) |

Principio: toda llamada externa tiene timeout y no rompe el flujo principal; los
webhooks responden rápido (200) y procesan asíncronamente.

---

## 7. Jobs programados (Vercel Cron)

Definidos en `vercel.json` (8 crons). Todas las rutas verifican `CRON_SECRET`
(Bearer) y responden `401` si falta/falla.

| Cron | Schedule (UTC) | Función |
|---|---|---|
| `/api/cron/update-bcv` | `0 4 * * *` | Tasa BCV |
| `/api/cron/expire-plans` | `0 0 * * *` | Expira planes vencidos |
| `/api/cron/reservation-reminders` | `0 8 * * *` | Recordatorios de reservas |
| `/api/cron/post-purchase` | `0 10 * * *` | Emails post-compra |
| `/api/cron/inactive-clients` | `0 6 * * 1` | Clientes inactivos (lunes) |
| `/api/cron/low-stock` | `0 9 * * *` | Alerta stock bajo |
| `/api/cron/subscription-second-payment` | `0 7 * * *` | Segundo pago de suscripciones |
| `/api/cron/installment-reminders` | `0 12 * * *` | Recordatorio de cuotas |

> En Vercel los crons se invocan con `Authorization: Bearer $CRON_SECRET`. Verificar
> en el dashboard de Crons tras cada deploy (acciones pendientes en `PRODUCTION_CHECKLIST`).

---

## 8. Eventos y trabajo asíncrono

- `src/lib/events/` es un **event bus en proceso** (registry con prioridad,
  middlewares, retries, aislamiento por listener). Historial en `EventHistory` o memoria.
- **Limitación conocida**: no hay cola externa durable (SQS/RabbitMQ). Eventos en
  vuelo pueden perderse ante cold-start/reinicio. Los webhooks externos y crons son la
  fuente autoritativa de reproceso; los webhooks de plataforma tienen retries y
  dead-letter (`WebhookDelivery`).

---

## 9. Seguridad

- **Headers HTTP**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
  Permissions-Policy en `next.config.ts`.
- **CSRF**: `csrfGuard` (origen/referer + tamaño máx 1 MB) aplicado en **94 rutas** API.
  → Cobertura completa a auditar en FASE 17 (puede haber mutaciones sin guard).
- **Rate limiting**: 37 archivos usan `rateLimit()` (login 5/1min, register 3/15min,
  upload-receipt 5/30min, visitas 60/min, Public API 120/min/key, etc.). Fallback a
  memoria si no hay Upstash; GC cada 10 min.
- **SSRF**: `assertSafeEndpoint` / `isAllowedMetaMediaUrl` bloquean localhost/rangos
  privados y validan resolución DNS (fetch de media de Meta/WhatsApp + webhooks).
- **Comparaciones**: `timingSafeEqual` en tokens (cron, webhooks, seller auth, API keys).
- **Errores**: respuestas `500` genéricas sin `error.message` interno; contrato
  `{ error: { code, message, requestId } }` en Public API.
- **Secrets**: `.env*` en `.gitignore` (excepto `.env.example`); CI con gitleaks.
- **Admin**: cookie httpOnly sameSite lax 24h; comparación `timingSafeEqual`.

---

## 10. Observabilidad

- `GET /api/health/liveness` — proceso vivo.
- `GET /api/health/readiness` — `SELECT 1` + vars críticas (`DATABASE_URL`,
  `AUTH_SECRET`, `ADMIN_SECRET`, `CRON_SECRET`); `200` ready / `503` degraded. Sin valores.
- **Logging**: `console.*` distribuido + middlewares de eventos con correlación.
  Logger estructurado con requestId pendiente (ver `INCIDENT_RESPONSE`).

---

## 11. Despliegue (Vercel)

1. `git push` → CI (`ci.yml`: typecheck, lint, tests, build + `npm audit` + gitleaks).
   Existe además `verify.yml` (legacy, Node 20) — ver hallazgo H-05.
2. `develop-v2` → preview/staging (proyecto Vercel de staging).
3. `main` → producción (`panitas.app`).
4. En Vercel: variables por entorno (nunca en el repo), aliases/dominios, **Crons**,
   **Project Settings → Output (`standalone`)**.
5. Post-deploy: `curl https://panitas.app/api/health/readiness` → `200`.

> Detalle en `docs/RUNBOOKS.md` y `docs/DEPLOYMENT_RUNBOOK.md` (10A FASE 51).

---

## 12. Estado de pagos (gap detectado en 9D → auditar en 10A)

- **No existe pasarela de pago automatizada** (backlog #8). El flujo de suscripción
  es manual: selección de plan → subida de comprobante → verificación del admin.
- `AdminPaymentAccount` + `/api/payment-accounts` gestionan métodos de pago mostrados
  al cliente; **no** hay cobro automático ni webhook de pasarela.
- Auditoría de pago/envío documentada en **`docs/PAYMENT_SEND_REVIEW.md`** (7 hallazgos
  PS-1…PS-7) vinculada a los entregables 10A y al backlog (#8 pasarela, #23 WhatsApp
  Business API). Los hallazgos de código de esa revisión quedaron **solo documentados**
  (regla 10A: sin features nuevas), con 0 pendientes de código.

---

## 13. Hallazgos del reconocimiento (FASE 1)

Registrados para las fases de auditoría siguientes. Código `H-xx`.

| ID | Hallazgo | Detalle | Fase 10A destino |
|---|---|---|---|
| H-01 | **Nombre/puerto del contenedor local ambiguo** | RUNBOOKS 8F dice `panitas-postgres:5433`; AGENTS.md dice `panitas-pg:5432`; `docker ps` no muestra contenedor activo al momento de la auditoría | FASE 9/13 (DATABASE_OPERATIONS) |
| H-02 | **`DIRECT_URL` sin referencia en código fuente** | Solo aparece en `.env*` y en artefactos de build (`.next/`); sin uso directo en `src/` | FASE 3/9 (ENVIRONMENT_MATRIX) |
| H-03 | **`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` sin uso en código** | Definida en `.env.example` pero sin referencias en `src/`; uploads van por servidor (`CLOUDINARY_URL`) | FASE 3 (ENVIRONMENT_MATRIX) |
| H-04 | **Tests**: 8F documentaba 1411; baseline 10A real = **1432/1432** (174 archivos) | Actualizar métricas en reportes | FASE 8 |
| H-05 | **`verify.yml` duplicado/legacy** | Existe junto a `ci.yml` (Node 20, sin tests ni audit) — redundante | FASE 48 (CI/CD) |
| H-06 | **Middleware edge inexistente** | No hay `src/middleware.ts`/`middleware.ts`; la protección es por-ruta (layout/server actions) | FASE 14/17 |
| H-07 | **CSRF/rate-limit no universales** | 94 rutas con `csrfGuard`, 37 con `rateLimit`; auditar cobertura en todas las mutaciones | FASE 17/24 |
| H-08 | **Vars críticas sin default** | `AUTH_SECRET`/`ADMIN_SECRET`/`CRON_SECRET` son REQUIRED en readiness pero `OPTIONAL` en `.env.example` | FASE 3 |
| H-09 | **Modelos vs tablas** | 105 modelos Prisma; 8F reportaba "106 tablas" (nivel BD, incluye tablas implícitas de relaciones) | FASE 9 |

---

## 14. Referencias

- Inventario de variables: `docs/ENVIRONMENT_MATRIX.md` (10A FASE 2)
- Operaciones DB: `docs/DATABASE_OPERATIONS.md` (10A FASE 11)
- Deploy: `docs/DEPLOYMENT_RUNBOOK.md` (10A FASE 51)
- Operación/drilling: `docs/RUNBOOKS.md`, `docs/PRODUCTION_RUNBOOK.md` (10A FASE 74)
- Incidentes: `docs/INCIDENT_RESPONSE.md`
- Seguridad API/Public API: `docs/API_SECURITY.md`, `docs/WEBHOOKS.md`
- Checklist pre-launch: `docs/PRODUCTION_READINESS_CHECKLIST.md` (10A FASE 78)
- Auditoría de pagos: `docs/PAYMENT_SEND_REVIEW.md`
