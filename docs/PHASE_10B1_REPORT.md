# PHASE_10B1_REPORT.md — Panitas Production Hardening (10B.1)

**FASE 10B.1 · 2026-08-14 · Branch: `develop-v2` · HEAD previo: `577c28c` · Deploy actual: `dpl_4UKi83drT9uN3jPsF6uwqtALLggV` (PostHog)**

Hardening de producción. 0 features nuevas. Cierres de los riesgos conocidos de prod: backup BD Neon, limpieza de datos QA, vulnerabilidad `xlsx`, caso IA "no hay productos", PostHog y WhatsApp/Meta.

---

## 1. Resumen ejecutivo

| Área | Estado |
|---|---|
| Backup BD producción (Neon) | ✅ **PASS** — `backups/panitas-2026-08-14T03-54-32.dump` (426,114 bytes) + restore de prueba PASS en entorno NO productivo |
| Retention backup | ⚠️ **NOT CONFIGURED** — backup manual, no automatizado |
| Limpieza datos QA | ✅ **PASS** — tenants A/B eliminados (alcance confirmado por usuario); 0 filas QA restantes |
| Tenants QA C/D/E (`prueba*`) | ✅ **INTACTOS** por decisión del usuario |
| `xlsx` (2 HIGH, sin fix npm) | ⚠️ **DOCUMENTADO** — decisión del usuario "Solo documentar"; NO actualizado |
| AI caso "no hay productos" | ✅ **FIXED** — causa raíz en `executor.ts` (`{products,total}` vs array); tests de regresión agregados (30/30 PASS) |
| PostHog | ✅ **ACTIVE** — deploy `dpl_4UKi83drT9uN3jPsF6uwqtALLggV` READY, init+identify+capture verificados, cero fugas de secrets |
| WhatsApp/Meta | ⏳ **MISSING → READY FOR CREDENTIALS** — envs `WHATSAPP_*`/`META_*` no presentes; usuario entregará |
| Typecheck / Lint / Build / Tests | ✅ validation PASS (1435 tests) |
| Smoke prod (liveness/readiness/login) | ✅ PASS |
| **VEREDICTO** | **PRODUCTION HARDENED** — riesgos conocidos cerrados o documentados; sin BLOCKERS nuevos |

## 2. FASE 1 — Backup BD Neon (PASS / PROTECTED)

- **Mecanismo**: `scripts/backup-prod-db.js` helper en temp → lee env reales vía `vercel env run -e production`, deriva host directo (sin pooler), `pg_dump -Fc --no-owner --no-privileges` en contenedor `postgres:18-alpine` (server Neon es **PostgreSQL 18.4**), escribe `.meta.json`, elimina env-file temporal de credenciales.
- **Backup**: `backups/panitas-2026-08-14T03-54-32.dump` (426,114 bytes) + `…dump.meta.json`. Contenido verificado con `pg_restore -l`: **106 tablas con datos, 3 secuencias, 156 FK constraints**.
- **Restore de prueba**: entorno NO productivo (contenedor local desechable `postgres:18-alpine`, puerto 5544, eliminado al terminar) → **PASS exit 0**. Conteos clave verificados: User 18, Negocio 17, Store 17, Product 299, Order 19, OrderItem 37, OrderPayment 19, Installment 10, Customer 3, Account 11.
- **Detalle**: `docs/DATABASE_BACKUP_STATUS.md`.
- **Nota**: los scripts heredados `scripts/backup-db.js` / `scripts/restore-db.js` apuntan a Docker local (`panitas-postgres`), **obsoletos para prod** — documentado.
- **Riesgo restante**: retention manual (sin cron/snapshot Neon). Los backups heredados en `backups/` (auto-dev-*, backup-*) no se tocaron.

## 3. FASE 2-5 — Limpieza de datos QA en producción (PASS)

- Inventario completo de 5 tenants QA: A y B (smoke 13/08, 100% QA), C/D/E (`prueba*`, julio). Detalle en `docs/QA_DATA_CLEANUP_PLAN.md`.
- **Alcance confirmado por el usuario: "Solo A/B (Recomendado)"** → C/D/E quedaron **intactos**.
- Mecanismo: `DELETE` por IDs explícitos en orden de dependencia (FK), en transacción `BEGIN/COMMIT`, ejecutado vía `vercel env run -e production` + psql Docker. **Sin `DROP DATABASE` / `TRUNCATE` / seed**.

### Filas eliminadas (tenants A+B)

| Tabla | Filas |
|---|---|
| OrderItem | 2 |
| OrderPayment | 2 |
| Installment | 3 |
| StockMovement | 2 |
| Order | 2 |
| Product | 2 |
| ConversationMessage | 14 |
| Conversation | 3 |
| BusinessMemory | 4 |
| AuditLog | 24 |
| StoreMember | 2 |
| Store | 2 |
| Negocio | 2 |
| User | 2 |
| Session / Account / SupportTicket | 0 |
| **Total** | **64** |

### Conteos globales antes → después

| Tabla | Antes | Después |
|---|---|---|
| User | 18 | 16 |
| Negocio | 17 | 15 |
| Store | 17 | 15 |
| Product | 299 | 297 |
| Order | 19 | 17 |
| OrderItem | 37 | 35 |
| OrderPayment | 19 | 17 |
| Installment | 10 | 7 |
| Customer | 3 | 3 (intacto) |
| Account | 11 | 11 (intacto) |

**Validación post-cleanup**: re-sweep por `storeId`/`negocioId`/`userId` → **0 filas QA A/B restantes** en todas las tablas.

## 4. FASE 6-7 — Vulnerabilidad `xlsx` (DOCUMENTADO, sin fix)

- `npm audit`: **2 HIGH** directas en `xlsx@0.18.5`:
  - `GHSA-4r6h-8v6p-xvw6` — Prototype Pollution (CVSS 7.8, corregida en ≥0.19.3)
  - `GHSA-5pgg-2g8v-p4x9` — Regex DoS (CVSS 7.5, corregida en ≥0.20.2)
- `fixAvailable: false` en npm → no hay fix automático.
- **Superficie de riesgo**: `src/lib/import-engine.ts` (parseo de archivos subidos vía `/api/products/import` **autenticado**) y `src/components/business-intelligence-center/bic-reports-area.tsx` (solo export/writeFile, riesgo bajo).
- **Mitigación disponible**: CDN oficial SheetJS `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (HTTP 200, 2.4MB) corregiría ambos advisories con la misma API.
- **Decisión del usuario: "Solo documentar"** → NO se actualizó la dependencia. Riesgo aceptado y registrado.

## 5. FASE 8 — AI caso "no hay productos" (FIXED)

- **Síntoma**: la IA respondía "No encontré productos para esa búsqueda" aunque el negocio tuviera productos.
- **Causa raíz**: `inventory.searchProduct` (tool) devuelve `productService.list()` → `{ products, total }` (objeto, no array). El case `"buscar_producto"` de `executor.ts` hacía `Array.isArray(products) ? products : []` → siempre lista vacía.
- **Fix** (`src/lib/conversational-actions/executor.ts:384-396`): se extrae `result.products` cuando el resultado es objeto con `.products`; se mantiene soporte a array directo.
- **Auditoría de shapes**: verificado que los demás consumidores de tools devuelven arrays (correctos): `orders.getPending` (`repo.pending` → `findMany`), `inventory.getLowStock` (`repo.lowStock` → `findMany`), `sales.getTopProducts` (`productsSold` → `[]`/array), `customers.getTopCustomers` (`frequentCustomers` → `[]`/array). **Solo `searchProduct` tenía el bug.**
- **Tests**: 3 tests de regresión agregados en `tests/conversational-actions/executor.test.ts` (shape `{products,total}`, array vacío, array directo). Suite del executor: **30/30 PASS**.
- **Estado**: fix en working tree (aún NO commiteado ni desplegado). Ver Sección 9.

## 6. FASE 9-10 — PostHog (ACTIVE)

- **Realidad vs prompt**: el prompt 10B.1 indicaba PostHog "inactivo", pero **ya estaba activo y desplegado** en la sesión anterior (commit `577c28c`).
- Env en Vercel Production: `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` (`phc_…`), `POSTHOG_PROJECT_SECRET_KEY` (`phs_…`), `POSTHOG_PERSONAL_API_KEY` (`phx_…`).
- Verificado en deploy `dpl_4UKi83drT9uN3jPsF6uwqtALLggV` READY (`panitas.app`): init protegido contra token ausente, identify por sesión, `capture` server-side de login, `reset` en signOut. **Cero fugas** de `phs_`/`phx_` en el bundle del navegador; `/ingest` rewrite a `us.i.posthog.com` funciona.

## 7. FASE 11-14 — WhatsApp / Meta (READY FOR CREDENTIALS)

- **MISSING en Vercel Production**: `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `META_APP_SECRET`, `META_VERIFY_TOKEN`.
- Sin credenciales no se puede conectar ni probar webhooks. **No se inventaron credenciales** (regla 10B.1).
- El resto de la plataforma funciona con enlace directo `wa.me` (FASE 22 documentado en 10B). El usuario deberá entregar credenciales para activar la integración completa.

## 8. FASE 15-17 — Quality gates (PASS)

| Gate | Resultado |
|---|---|
| Typecheck (`tsc --noEmit`) | ✅ 0 errores |
| Lint (`npm run lint`) | ✅ 0 errores (406 warnings pre-existentes, sin nuevos) |
| Tests (`vitest run`) | ✅ **1435 PASS** (165 files) |
| Build (`npm run build`) | ✅ PASS |
| Smoke prod | ✅ `/api/health/liveness` 200 · `/api/health/readiness` 200 · `/login` 200 |

## 9. Pendientes / próximos pasos

| Item | Estado |
|---|---|
| Commit del fix AI + tests + docs | Pendiente (working tree) |
| Deploy del fix AI a prod | Pendiente (requiere decisión del usuario) |
| Verificación IA end-to-end en prod con tenant real | Pendiente (tras deploy, requiere tenant con datos) |
| Credenciales WhatsApp/Meta | A cargo del usuario |
| Automatización de backup (cron/snapshot Neon) | Recomendado (retention) |
| Upgrade `xlsx` a 0.20.3 (CDN) | Recomendado cuando el usuario lo autorice |

## 10. Hallazgos abiertos

| ID | Severidad | Nota |
|---|---|---|
| 10B1-01 | ⚠️ Medium | `xlsx@0.18.5` con 2 HIGH sin fix npm; decisión del usuario "documentar" (mitigación 0.20.3 disponible) |
| 10B1-02 | ⚠️ Medium | Backup de BD manual, sin automatización/retention (Neon snapshot recomendado) |
| 10B1-03 | ℹ️ Info | WhatsApp/Meta envs MISSING → READY FOR CREDENTIALS (usuario entregará) |
| 10B1-04 | ℹ️ Info | Tenants QA C/D/E (`prueba*`) conservados por decisión del usuario |

## 11. Veredicto (FASE final 10B.1)

| Item | Resultado |
|---|---|
| Backup + restore | ✅ PASS |
| Limpieza datos QA (A/B) | ✅ PASS (C/D/E intactos) |
| Vulnerabilidad `xlsx` | ⚠️ Documentada (sin fix, riesgo aceptado) |
| AI "no hay productos" | ✅ FIXED (pendiente commit + deploy) |
| PostHog | ✅ ACTIVE |
| WhatsApp/Meta | ⏳ READY FOR CREDENTIALS |
| Quality gates | ✅ ALL PASS (1435 tests) |
| BLOCKERS / HIGH nuevos | 0 |
| **VEREDICTO** | **PRODUCTION HARDENED** — riesgos conocidos cerrados o documentados; requerimiento pendiente: commit + deploy del fix AI |
