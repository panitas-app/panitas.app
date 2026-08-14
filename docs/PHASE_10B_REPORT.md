# PHASE_10B_REPORT.md — Panitas Production Deployment & Controlled Launch

**FASE 10B · 2026-08-13 · Branch: `develop-v2` · HEAD: `2a8a1e4` · Deploy prod: `dpl_AMpN73ZaogZF2ah7pL83qb8B3A7L`**

Despliegue a producción con lanzamiento controlado. 0 features nuevas. Regla 10B: `DEPLOY → VERIFY → SMOKE → MONITOR → CONFIRM → RELEASE`. Documentación del flujo completo en `docs/`.

---

## 1. Resumen ejecutivo

| Área | Estado |
|---|---|
| Deploy a producción | ✅ **EXITOSO** (`dpl_AMpN73ZaogZF2ah7pL83qb8B3A7L` READY) |
| Dominio canónico | ✅ `panitas.app` sirviendo el deploy prod (proxy custom domain) |
| Build / Typecheck / Lint / Tests | ✅ validation PASS (1432 tests) |
| Liveness / Readiness | ✅ `/api/health/liveness` 200 + `/api/health/readiness` 200 (DB + 5 secrets ok) |
| Páginas públicas | ✅ 200 |
| Endpoints autenticados sin sesión | ✅ 401 limpio |
| Smoke autenticado (POS/crédito/finanzas) | ✅ PASS |
| Aislamiento de tenants | ✅ PASS (403/404 cross-tenant) |
| IA (OpenRouter + deepseek) | ✅ PASS (sin fugas internas) |
| Schema drift prod | ✅ **Corregido** (migración idempotente) |
| Observabilidad 24-31 | ✅ PASS |
| Rollback readiness | ✅ PASS |
| Survive/hallazgos bloqueantes | **0 BLOCKERS / 0 HIGH** (`xlsx` heredado documentado) |
| Limpieza datos QA (FASE 45) | ⏳ **DIFERIDA** por decisión del usuario |
| **VEREDICTO** | **GO / RELEASE — CONDICIONAL** (cleanup L31-L34 pendiente) |

## 2. Deployments producción (más reciente → viejo)

| Deployment | Commit | Estado | Nota |
|---|---|---|---|
| `dpl_AMpN73ZaogZF2ah7pL83qb8B3A7L` | `2a8a1e4` | READY | **ACTUAL** — schema sync + deepseek + fixes |
| `dpl_8EkeVsNa2xutTYvuFwh72yv1abym` | `fe1c500` | READY | IA deepseek (key correcta) |
| `dpl_HvLfGhxbkztsjzhDUao8J87CrPdA` | env IA | READY | IA (key vieja → re-set) |
| `dpl_F7hRBji2UYUEbcDLv9ANxmpw7yNB` | `b9794b1` | READY | fix orders |
| `dpl_7ATgaFWMQeU77kU1qkwiYA9FbwWh` | `36083c4` | READY | fix auth login |
| previos | … | READY | línea 10A base `aa61235` |

## 3. Commits de la FASE 10B (release notes)

| Commit | Cambio |
|---|---|
| `b051925` | release v2.0.0-rc.1 prep: migrate deploy en build + `.vercelignore` + PRODUCTION_RELEASE.md |
| `4a05402` | fix(D-04): quitar fallback shadowDatabaseUrl a DATABASE_URL (rompía migrate en build) |
| `6eee7d9` | fix(prisma.config.ts): shadowDatabaseUrl condicional (P1013 no string vacío) |
| `fee7a43` | deploy(prisma): baselining de BD pre-existente (P3018 drift) en build Vercel |
| `19fdad6` | deploy(prisma): resolver P3009 (registros fallidos) con migrate resolve --rolled-back |
| `3eafe05` | build: quitar output standalone (rompía onBuildComplete Vercel, Next 16.3.0) |
| `1b954fe` | fix(crons): Vercel invoca crons vía GET — alias GET=POST en 7 rutas POST-only (no corrían en prod) |
| `4e85936` | fix(auth): log errores register/login (observabilidad 24-31) — daban 500 sin traza |
| `acbb993` | fix(auth): login 401 en vez de 500 con credenciales inválidas (AuthError v5) |
| `36083c4` | fix(auth): login devuelve success — Auth.js v5 beta retorna `string` (redirectUrl), no `{ok}` |
| `b9794b1` | fix(orders): default `customerPhone` vacío si no se envía (POS sin teléfono → 500 Prisma) |
| `fe1c500` | config: agente IA = OpenRouter + `deepseek/deepseek-v4-flash` por env |
| `87dc018` | chore: instalar skill find-skills |
| `2a8a1e4` | fix(db): migración idempotente sync schema↔BD prod (tablas/columnas faltantes) |

## 4. Bugs encontrados y corregidos durante smoke en prod

| Bug | Deploy | Síntoma | Fix |
|---|---|---|---|
| Login 500 | `acbb993` | 500 con credenciales inválidas | `AuthError` de Auth.js v5 capturado → 401 |
| Login 401 | `36083c4` | Login válido siempre 401 | `signIn({redirect:false})` retorna `string`, no `{ok}`; check eliminado |
| POS 500 | `b9794b1` | Orden sin teléfono → PrismaValidationError | `customerPhone` default `(customerPhone \|\| "")` |
| Crons no corren | `1b954fe` | Ningún cron en prod | Vercel usa GET → alias GET=POST en 7 rutas |
| IA key vieja | `dpl_8EkeVs…` | OpenRouter 401 | Re-set de `OPENROUTER_API_KEY` correcta |
| Schema drift | `2a8a1e4` | `Webhook*`, `Attention*`, `Api*`, `Extension`, `Memory`, `Knowledge*` sin tabla → ruido en logs | Migración idempotente aditiva validada en scratch |

## 5. Schema drift: causa raíz y solución

- **Causa**: la BD prod pre-existente se baselined (`P3018`) como "applied" sin ejecutar el SQL completo; tablas añadidas en el schema no existían. Solo ruido en logs por `.catch()` (no rompía requests), salvo tablas consultadas por features activas.
- **Solución**: `prisma/migrations/20260814000000_sync_schema_to_prod/migration.sql` — idempotente y aditiva: 48 `CREATE TABLE IF NOT EXISTS`, 19 `CREATE UNIQUE INDEX IF NOT EXISTS`, 115 `CREATE INDEX IF NOT EXISTS`, 71 FKs envueltos en `DO $$…pg_constraint…END $$;`, 8 `ALTER ADD COLUMN IF NOT EXISTS`. **Cero DROPs / zero plain CREATE.**
- **Validación** (scratch PostgreSQL `panitas-migtest`, port 5433): (1) apply limpio → OK; (2) path aditivo: se dropearon las tablas platform → re-apply las recreó (confirmado con `\dt`); (3) idempotente → sin error. Después se aplicó por `prisma migrate deploy` en el build de Vercel. **Runtime verificado**: crear producto (201) ya no genera errores `WebhookSubscription`/`attention*` (0 coincidencias en logs).

## 6. IA (OpenRouter + DeepSeek)

- `AI_PROVIDER=openrouter`, `*_MODEL=deepseek/deepseek-v4-flash` (7 vars) vía env Vercel (`Encrypted`), `OPENROUTER_API_KEY` validada 200 contra `https://openrouter.ai/api/v1/auth/key`.
- `/api/agent/chat` probado con 3 preguntas: estado del negocio, productos/margen, ventas. Respuestas útiles; con deepseek desaparece el `reply:""` vacío visto en el proveedor previo.
- **Leak check limpio**: el `toClientChatView` oculta provider/model/toolCalls/prompts al cliente (verificado empíricamente, sin fuga).
- Hallazgo menor documentado: conjuntual deepseek dijo "no hay productos" teniendo 1 (inexactitud de contexto, no funcional).

## 7. Smoke autenticado en prod (tenants A/B)

| Item | Resultado |
|---|---|
| Tenants creados | A (`comercio`/tienda, plan basic) y B (`agenda`) |
| Producto A | `cmss44tnv…` "Producto QA Aislamiento" ($15.75, costo $8, stock 10→5) |
| Órdenes A | POS `ORD-…3HE4` (2×$15.75, efectivo, paid) + crédito `ORD-…XODM` (3×$15.75, down $10, 3 cuotas; cuota 1 pagada $12.42; on_time; pending $24.83) |
| Finanzas A | `/api/analytics/finanzas` 200 — costValue $40, sellValue $78.75, profit $38.75, margen 49.2% |
| **Aislamiento** | B lista 0 items de A; cross GET/DELETE → 403; cross GET/POST crédito → 404; A ve solo sus productos |

## 8. Observabilidad 24-31 — PASS

| Check | Resultado |
|---|---|
| Headers seguridad (root y assets) | CSP completo, HSTS 63072000 preload, X-FrameOptions DENY, nosniff, referrer strict |
| Assets estáticos `_next/static` | `Cache-Control: public,max-age=31536000,immutable` ✅ |
| TTFB root (público) | ~0.31s |
| TTFB `/dashboard` autenticado | cold 3.1s → warm **0.36s** (cold-start serverless normal) |
| Rutas públicas | 200 |
| Logs de runtime | sin errores de tablas faltantes tras migración |

## 9. Rollback readiness 35-37 — PASS

- `vercel rollback url|deploymentId` disponible; candidates pasados READY (10+ deployments).
- Deployment objetivo de rollback: `dpl_8EkeVsNa2xutTYvuFwh72yv1abym` (IA deepseek correcta) o `dpl_F7hRBji2UYUEbcDLv9ANxmpw7yNB` (fix orders).
- Backup BD: decisión del usuario — BD sin clientes reales, riesgo aceptado (sin formalización de backup).

## 10. Env variables prod (Vercel)

- **Set (Encrypted)**: `OPENROUTER_API_KEY` (73 chars, válida), `AI_PROVIDER=openrouter`, `CHAT_MODEL`, `BUSINESS_MODEL`, `JSON_MODEL`, `CLASSIFICATION_MODEL`, `SUMMARIZATION_MODEL`, `REPLY_SUGGESTION_MODEL`, `AI_INVENTORY_MODEL` = `deepseek/deepseek-v4-flash`; `NVIDIA_NIM_API_KEY` (respaldo).
- **MISSING (diferido)**: `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `META_APP_SECRET`, `META_VERIFY_TOKEN` (webhooks FASE 21-22), `SELLER_JWT_SECRET`, `NEXT_PUBLIC_POSTHOG_*`, `ADMIN_EMAIL`.

## 11. Hallazgos abiertos

| ID | Severidad | Nota |
|---|---|---|
| 10B-01 | Info | FAIL-22 webhooks WhatsApp/Meta con `*_VERIFY`/`META_*` MISSING — usuario los entregará (diferido) |
| 10B-02 | Info | asset regex en homepage no arroja `<script src>` directo (App Router inline RSC) — verificado vía chunk inmutable |
| 10B-03 | Info | hallazgo menor IA: inexactitud de contexto conjuntual (no funcional) |

## 12. Datos de prueba (limpieza FASE 45)

- Tenant A: `qa.prod.0813184553@nowhere.invalid` / negocio `cmss3x8u4000403…`
- Tenant B: `qa.tenantb.0813185036@nowhere.invalid` / negocio `cmss43ae4000404…`
- Producto verif mig: `cmssbpgbz000004jsxoa1vn1u`
- Productos/órdenes/créditos asociados.
- **Decisión (2026-08-13)**: usuario eligió **no borrar nada ahora** → limpieza **diferida** (L31-L34 pendientes, no bloquean GO condicional).

## 13. Seguridad final (FASE 46-50)

- Dependency scan (`npm audit --omit=dev`): **1 HIGH** heredado = `xlsx` (sin fix; CVE ReDoS remoto y Prototype Pollution, mismos reportados en 10A). **No es regresión.**
- Sin fugas de `err.message` en rutas clave (verificado en agent/chat).
- Headers de seguridad completos confirmados en FASE 24-31.

## 14. Veredicto (FASE 54)

| Item | Resultado |
|---|---|
| Deploy / smoke / aislamiento / IA / observabilidad / rollback | ✅ ALL PASS |
| BLOCKERS / HIGH nuevos | 0 |
| HIGH heredado | `xlsx` (documentado) |
| Limpieza datos QA | ⏳ DIFERIDA por decisión del usuario |
| **VEREDICTO** | **GO / RELEASE — CONDICIONAL** (cleanup FASE 45 pendiente) |