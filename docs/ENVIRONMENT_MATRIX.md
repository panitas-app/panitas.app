# PANITAS — Matriz de Entornos y Variables (FASE 10A — FASE 2)

> *Última actualización: 13/08/2026 — FASE 10A, FASE 2 (Entornos) / FASE 3 (Auditoría de variables).*
> *Fuente de verdad de nombres: `.env.example` + referencias detectadas en `src/` (13/08/2026).*
> *Clasificación: `PUBLIC` (se incrusta en bundle) · `SERVER` (solo servidor) · `SECRET` (sensible).*

---

## 1. Entornos

| Entorno | Dominio | BD | Archivo env | Uso |
|---|---|---|---|---|
| development | `http://localhost:3000` | Docker PostgreSQL | `.env`, `.env.local` | Dev diario (`npm run dev`) |
| test | — | `panitas_test` (embebido) | `vitest.config.ts` (placeholders) | Vitest (174 archivos, 1432 tests) |
| staging | `staging-*.vercel.app` | Neon independiente | `.env.production` (Vercel Preview) | Validación pre-prod |
| production | `https://panitas.app` | Neon de producción | `.env.prod` / `.env.vercel` | Prod |
| (archivos de referencia) | — | — | `.env.production`, `.env.vercel-test` | Configs parciales/legacy |

**Reglas:**
- Nunca se comparten secrets entre entornos; cada entorno apunta a su propia BD.
- `readiness` requiere `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_SECRET`, `CRON_SECRET` (→ `503` si falta).
- `.env*` no se versiona (solo `.env.example`). CI usa placeholders.

---

## 2. Inventario completo de variables

> `Uso` = archivos donde se referencia. `Default` = valor si no está definido.
> Estado por archivo: `✓` presente / `—` ausente en cada `.env*`.

### 2.1 Públicas (`NEXT_PUBLIC_*` — se incrustan en el bundle, NO son secretos)

| Variable | Tipo | Requerida | Default | Uso | .env | .local | .prod | ejemplo |
|---|---|---|---|---|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | PUBLIC | Sí (links app) | — | POS, product-form | — | — | — | ✓ |
| `NEXT_PUBLIC_BASE_URL` | PUBLIC | Sí (SEO/sitemap) | — | layout, sitemap, landings, blog, store | — | — | — | ✓ |
| `NEXT_PUBLIC_POSTHOG_HOST` | PUBLIC | No | `https://us.i.posthog.com` | posthog-server | — | ✓ | — | ✓ |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | PUBLIC | No | — | posthog-server | — | ✓ | — | ✓ |
| `NEXT_PUBLIC_PUSHER_KEY` | PUBLIC | No | — | pos, product-form, scanner | — | — | — | ✓ |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | PUBLIC | No | `us2` | pos, product-form, scanner | — | — | — | ✓ |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | PUBLIC | No | — | **SIN USO en código** (H-03) | ✓ | — | — | ✓ |

### 2.2 Servidor — configuración (no secretos)

| Variable | Tipo | Requerida | Default | Uso | .env | .local | .prod | ejemplo |
|---|---|---|---|---|---|---|---|---|
| `DATABASE_URL` | SERVER | **SÍ** (readiness) | — | prisma.ts, readiness, todo el stack | ✓ | ✓ | ✓ | ✓ |
| `DIRECT_URL` | SERVER | No (H-02) | — | Sin ref. directa en `src/` (driver Neon) | ✓ | ✓ | ✓ | ✓ |
| `SHADOW_DATABASE_URL` | SERVER | Solo migraciones | — | prisma.config.ts | ✓ | — | ✓ | ✓ |
| `AUTH_URL` | SERVER | Sí (prod) | — | rutas auth, csrf, email | ✓ | — | ✓ | ✓ |
| `AUTH_TRUST_HOST` | SERVER | Sí | — | debug (Auth.js) | — | — | — | ✓ |
| `NEXTAUTH_URL` | SERVER | Legacy (alias) | — | rutas auth, csrf, email | ✓ | — | ✓ | ✓ |
| `ADMIN_EMAIL` | SERVER | Sí (bootstrap) | — | /api/admin/auth | ✓ | — | — | ✓ |
| `BCV_MONITOR_START_HOUR` | SERVER | No | `8` | bcv monitor | — | — | — | ✓ |
| `BCV_MONITOR_END_HOUR` | SERVER | No | `18` | bcv monitor | — | — | — | ✓ |
| `BCV_QUERY_INTERVAL_HOURS` | SERVER | No | `6` | bcv monitor | — | — | — | ✓ |
| `BCV_TIMEZONE` | SERVER | No | `America/Caracas` | bcv monitor | — | — | — | ✓ |
| `AI_PROVIDER` | SERVER | No | `nvidia` | agent-core config | ✓ | — | — | ✓ |
| `AI_TIMEOUT_MS` | SERVER | No | `30000` | agent-core config | ✓ | — | — | ✓ |
| `AI_RETRIES` | SERVER | No | `2` | agent-core config | ✓ | — | — | ✓ |
| `CHAT_MODEL` | SERVER | No | modelo gratuito | agent-core config | ✓ | — | — | ✓ |
| `BUSINESS_MODEL` | SERVER | No | idem | agent-core config | ✓ | — | — | ✓ |
| `JSON_MODEL` | SERVER | No | idem | agent-core config | ✓ | — | — | ✓ |
| `CLASSIFICATION_MODEL` | SERVER | No | idem | agent-core config | ✓ | — | — | ✓ |
| `SUMMARIZATION_MODEL` | SERVER | No | idem | agent-core config | ✓ | — | — | ✓ |
| `REPLY_SUGGESTION_MODEL` | SERVER | No | idem | agent-core config | ✓ | — | — | ✓ |
| `AI_INVENTORY_MODEL` | SERVER | No | idem | lib/ai.ts | — | — | — | ✓ |
| `{MODEL}_PROVIDER/_TEMPERATURE/_MAX_TOKENS` | SERVER | No | por tarea | agent-core config (dinámico) | — | — | — | ✓ |
| `OPENROUTER_BASE_URL` | SERVER | No | `https://openrouter.ai/api/v1` | agent-core config | — | — | — | ✓ |
| `OPENROUTER_APP_TITLE` | SERVER | No | `Panitas` | agent-core config | — | — | — | ✓ |
| `OPENROUTER_HTTP_REFERER` | SERVER | No | `https://panitas.app` | agent-core config | — | — | — | ✓ |
| `NVIDIA_NIM_BASE_URL` | SERVER | No | `https://integrate.api.nvidia.com/v1` | agent-core config | ✓ | — | — | ✓ |
| `NVIDIA_BASE_URL` | SERVER | Legacy alias | — | agent-core config/index | — | — | — | **falta en ejemplo** |
| `PUSHER_APP_ID` | SERVER | No (si se usa realtime) | — | lib/pusher.ts | — | — | — | ✓ |
| `PUSHER_KEY` | SERVER | No | — | lib/pusher.ts | — | — | — | ✓ |
| `PUSHER_CLUSTER` | SERVER | No | `us2` | lib/pusher.ts | — | — | — | ✓ |
| `WHATSAPP_API_VERSION` | SERVER | No | `v22.0` | whatsapp/config.ts | — | — | — | ✓ |
| `WHATSAPP_BASE_URL` | SERVER | No | `https://graph.facebook.com` | whatsapp/config.ts | — | — | — | ✓ |
| `WHATSAPP_TIMEOUT_MS` | SERVER | No | `15000` | whatsapp/config.ts | — | — | — | ✓ |
| `WHATSAPP_DEFAULT_PHONE_NUMBER_ID` | SERVER | No | — | whatsapp/config.ts | — | — | — | ✓ |
| `META_API_VERSION` | SERVER | No | `v22.0` | meta/config.ts | — | — | — | ✓ |
| `META_BASE_URL` | SERVER | No | `https://graph.facebook.com` | meta/config.ts | — | — | — | ✓ |
| `META_TIMEOUT_MS` | SERVER | No | `15000` | meta/config.ts | — | — | — | ✓ |
| `UPSTASH_REDIS_REST_URL` | SERVER | No | — | rate-limit.ts | — | — | — | ✓ |
| `NODE_ENV` | PLATFORM | — | — | runtime | — | — | — | — |
| `NEXT_RUNTIME` | PLATFORM | — | — | runtime | — | — | — | — |
| `VERCEL` | PLATFORM | — | — | runtime | — | — | ✓ | — |

### 2.3 Secretos (nunca en Git; rotar si se filtran)

| Variable | Requerida | Uso | .env | .local | .prod | ejemplo |
|---|---|---|---|---|---|---|
| `AUTH_SECRET` | **SÍ** (readiness) | Auth.js (JWT sesión) | ✓ | — | — | ✓ |
| `NEXTAUTH_SECRET` | Legacy (alias) | Auth.js legacy | ✓ | — | ✓ | ✓ |
| `ADMIN_SECRET` | **SÍ** (readiness) | Panel admin (cookie `admin_token`) | ✓ | — | ✓ | ✓ |
| `CRON_SECRET` | **SÍ** (readiness) | Autorización crons (Bearer) | ✓ | — | ✓ | ✓ |
| `SELLER_JWT_SECRET` | Sí (si se usa vendedores) | Tokens de vendedores | — | — | — | ✓ |
| `GOOGLE_CLIENT_ID` | Opcional (OAuth Google) | auth.ts | ✓ | — | ✓ | ✓ |
| `GOOGLE_CLIENT_SECRET` | Opcional | auth.ts | ✓ | — | ✓ | ✓ |
| `CLOUDINARY_URL` | Sí (uploads) | cloudinary.ts | ✓ | — | ✓ | ✓ |
| `RESEND_API_KEY` | Opcional (email) | email.ts | ✓ | — | ✓ | ✓ |
| `TWILIO_ACCOUNT_SID` | Opcional (SMS) | twilio.ts | ✓ | — | ✓ | ✓ |
| `TWILIO_API_KEY_SID` | Opcional | twilio.ts | ✓ | — | ✓ | ✓ |
| `TWILIO_API_KEY_SECRET` | Opcional | twilio.ts | ✓ | — | ✓ | ✓ |
| `TWILIO_PHONE_NUMBER` | Opcional | twilio.ts | ✓ | — | ✓ | ✓ |
| `OPENROUTER_API_KEY` | Respaldo IA | agent-core | ✓ | — | — | ✓ |
| `NVIDIA_NIM_API_KEY` | Sí (IA activa) | agent-core | ✓ | — | — | ✓ |
| `NVIDIA_API_KEY` | Legacy alias | agent-core | — | — | — | ✓ |
| `WHATSAPP_APP_SECRET` | Sí (inbox) | whatsapp HMAC | — | — | — | ✓ |
| `WHATSAPP_VERIFY_TOKEN` | Sí (inbox) | whatsapp webhook | — | — | — | ✓ |
| `WHATSAPP_DEFAULT_ACCESS_TOKEN` | Opcional | whatsapp envío default | — | — | — | ✓ |
| `META_APP_SECRET` | Sí (IG/Messenger) | meta HMAC | — | — | — | ✓ |
| `META_VERIFY_TOKEN` | Sí (IG/Messenger) | meta webhook | — | — | — | ✓ |
| `PUSHER_SECRET` | Sí (realtime) | lib/pusher.ts | — | — | — | ✓ |
| `UPSTASH_REDIS_REST_TOKEN` | No (sin Redis) | rate-limit.ts | — | — | — | ✓ |

---

## 3. Hallazgos de la auditoría de variables (FASE 3)

| ID | Hallazgo | Impacto | Acción recomendada |
|---|---|---|---|
| E-01 | `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` sin uso en código | Limpieza | Eliminar de `.env.example` o documentar como reservada |
| E-02 | `DIRECT_URL` sin referencia directa en `src/` (solo driver/adapter) | Limpieza/documentación | Mantener para Neon driver; documentar como dependencia de plataforma |
| E-03 | `NVIDIA_BASE_URL` (alias legacy) referenciado en código pero **ausente en `.env.example`** | Gap documental | Añadir a `.env.example` |
| E-04 | `AUTH_SECRET`/`ADMIN_SECRET`/`CRON_SECRET` son REQUIRED (readiness) pero `OPTIONAL` en `.env.example` | Confusión | Marcar como REQUIRED en `.env.example` con comentario |
| E-05 | `.env.production` solo contiene `NEXTAUTH_URL` | Config incompleta | Verificar/limpiar: debe reflejar el entorno o eliminarse |
| E-06 | `.env.prod`/`.env.vercel` contienen vars de plataforma (TURBO_*, NX_DAEMON, VERCEL_GIT_*) | Ruido | No versionar; son inyectadas por Vercel — limpiar de archivos locales |
| E-07 | `NEXTAUTH_SECRET` y `AUTH_SECRET` ambos presentes | Duplicación legacy | Usar `AUTH_SECRET`; mantener alias solo para compatibilidad |
| E-08 | Vars dinámicas `{MODEL}_PROVIDER/_TEMPERATURE/_MAX_TOKENS` documentadas por patrón, no por nombre | Documentación | Mantener patrón en `.env.example` (ya presente) |
| E-09 | `AUTH_TRUST_HOST` sin valor en `.env` (no detectado en archivos) | Riesgo dev | Confirmar valor `true` en Vercel (Auth.js lo necesita con proxy) |

**Total variables inventariadas: 65** (47 con `process.env.X` directo + 18 leídas vía helpers en configs de WhatsApp/Meta/Agent-Core).

---

## 4. Variables inyectadas por plataforma (no declarar)

`NODE_ENV`, `NEXT_RUNTIME`, `VERCEL`, `VERCEL_*`, `VERCEL_GIT_*`, `VERCEL_OIDC_TOKEN`,
`VERCEL_TARGET_ENV`, `VERCEL_URL`, `TURBO_*`, `NX_DAEMON` — inyectadas por Vercel/CI.
`VERCEL_OIDC_TOKEN` es un secret efímero del OIDC de Vercel (no usarlo como auth propia).

---

## 5. Referencias

- Arquitectura: `docs/PRODUCTION_ARCHITECTURE.md` (10A FASE 1)
- Rotación de secrets: `docs/RUNBOOKS.md §5` y `SECURITY_ROTATION_CHECKLIST.md`
- Readiness/health: `src/app/api/health/readiness/route.ts` (`REQUIRED_ENV`)
