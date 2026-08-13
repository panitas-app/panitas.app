# PANITAS — Production Release Tracker (FASE 10B)

> *Última actualización: 13/08/2026 — FASE 10B.*
> *Documento vivo durante el controlled launch. Se actualiza en cada fase.*

---

## 1. Identificador del release

| Campo | Valor |
|---|---|
| Commit candidato | `aa61235` — "FASE 8F-10A: fixes de seguridad S-01/S-02/S-03, auditoria completa y readiness LAUNCH CANDIDATE" |
| Commit release (deploy) | *se define en FASE 11 (ver §5)* |
| Branch | `develop-v2` |
| Tag objetivo | `v2.0.0-rc.1` (solo si la validación da estable) |
| Vercel proyecto | `panitas-app` (org `supportpanitas-6127s-projects`) |
| Dominio | `https://panitas.app` (registrado en Vercel, expira 2027-07-13) |
| Pipeline de gates | `.github/workflows/ci.yml` (Node 22) + validación local FASE 3 |

## 2. Decisión de backup (FASE 8-10)

- `DATABASE_URL` de Producción es `sensitive` en Vercel → **no legible** por CLI/API (verificado). No se puede `pg_dump` local contra prod sin el valor.
- El usuario confirmó que **no hay clientes registrados** (pre-lanzamiento) y autorizó el deploy: *"haz deploy sin miedo, aún no hay clientes registrados"*.
- Decisión registrada: **no se exige snapshot previo a la primera migración** porque la BD está vacía de datos operativos de clientes. Antes de cualquier migración futura con datos reales, el backup pasa a ser **obligatorio** (Neon snapshot/branching o `pg_dump`).
- Las migraciones se aplican en el build de Vercel (`buildCommand: "prisma migrate deploy && npm run build"`), con el `DATABASE_URL` real inyectado por la plataforma. Fallo de migración ⇒ fallo de build (fail-closed, sin pérdida de datos).

## 3. Estado de variables de entorno — Producción (FASE 5)

> Tipo `sensitive` = cifradas en Vercel, no legibles por API/`env pull`. Verificado 13/08/2026 vía API (`/v9/projects/{id}/env`).

| Variable | Estado | Tipo |
|---|---|---|
| `DATABASE_URL` | PRESENT | sensitive |
| `DIRECT_URL` | PRESENT | sensitive |
| `AUTH_SECRET` | PRESENT | sensitive |
| `AUTH_URL` | PRESENT | sensitive |
| `NEXTAUTH_SECRET` | PRESENT (alias) | sensitive |
| `NEXTAUTH_URL` | PRESENT (alias) | sensitive |
| `ADMIN_SECRET` | PRESENT | sensitive |
| `CRON_SECRET` | PRESENT | sensitive |
| `CLOUDINARY_URL` | PRESENT | sensitive |
| `RESEND_API_KEY` | PRESENT | sensitive |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | PRESENT | sensitive |
| `TWILIO_ACCOUNT_SID` / `TWILIO_API_KEY_SID` / `TWILIO_API_KEY_SECRET` / `TWILIO_PHONE_NUMBER` | PRESENT | sensitive |
| `NVIDIA_NIM_API_KEY` | **AGREGADO (13/08/2026)** — desde `.env` local, vía stdin, sin imprimir | sensitive |
| `OPENROUTER_API_KEY` | **AGREGADO (13/08/2026)** — ídem | sensitive |
| `WHATSAPP_APP_SECRET` | **MISSING** — el usuario los entregará cuando los tenga | — |
| `WHATSAPP_VERIFY_TOKEN` | **MISSING** — ídem | — |
| `META_APP_SECRET` | **MISSING** — ídem | — |
| `META_VERIFY_TOKEN` | **MISSING** — ídem | — |
| `SELLER_JWT_SECRET` | MISSING (fallback a `NEXTAUTH_SECRET` ✓) | — |
| `NEXT_PUBLIC_POSTHOG_HOST` / `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | MISSING (observabilidad opcional) | public |
| `ADMIN_EMAIL` | MISSING (bootstrap admin; verificar si admin ya existe en prod) | — |

**Gates de readiness** (`src/app/api/health/readiness`): `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_SECRET`, `CRON_SECRET` → todos PRESENT.

## 4. Secuencia de fases 10B (log)

| Fase | Estado | Nota |
|---|---|---|
| 1 Read audit | ✅ | 10A = READY (LAUNCH CANDIDATE) |
| 2 Repo state | ✅ | Commit `aa61235`; working tree limpio; tag objetivo `v2.0.0-rc.1` |
| 3 Release candidate validation | ✅ | lint 0 errores (exit 0), typecheck ✓, build ✓, tests 1432/1432 (exit 0) |
| 4 Hosting | ✅ | Vercel `panitas-app`; `vercel` CLI 54.11.1 autenticado |
| 5 Env vars prod | ✅/⚠️ | PRESENT núcleo + AI keys; MISSING webhooks (pendiente usuario) |
| 6 Dominio | ✅ | `panitas.app` en Vercel; root responde 200 |
| 7 Security pre-deploy | ⏳ | HTTPS/TLS/headers a validar post-deploy |
| 8-10 BD | ✅/⚠️ | `DATABASE_URL` sensitive (no legible); migración en build de Vercel; backup eximido por decisión del usuario (BD sin clientes) |
| 11+ Deploy y validación | ⏳ | — |

## 5. Procedimiento de deploy y rollback

### Deploy
```bash
git add -A && git commit -m "release v2.0.0-rc.1 ..."   # commit identificable
npx vercel deploy --prod                                # sube el commit local
# Build de Vercel: prisma migrate deploy && npm run build
```

### Validación post-deploy
1. `GET /api/health/liveness` → 200
2. `GET /api/health/readiness` → 200 (DB + 4 env REQUIRED)
3. Smoke test flujo negocio (login → dashboard → venta → crédito → abono → finanzas → logout)

### Rollback
- Deploy anterior identificable con `vercel rollback <deployment-url>` (instantáneo, sin downtime).
- `DATABASE_URL` no cambia entre deploys; migraciones aplicadas en build son idempotentes a partir del estado commitado (`prisma migrate deploy` solo aplica pendientes).

## 6. Definición de GO (resumen FASE 10B)

Producción estable, critical flows pass, security/tenant isolation pass, BD estable, monitoring activo, backup verificado, rollback disponible. Veredicto final en `docs/PHASE_10B_REPORT.md` y checklist en `docs/PRODUCTION_LAUNCH_CHECKLIST.md`.
