# PRODUCTION_READINESS_CHECKLIST.md — Checklist de Lanzamiento

**Fase 10A · Fases 77-79 · Fecha: 2026-08-13 · Branch: `develop-v2`**

Checklist binario de preparación para producción. Cada ítem con estado verificado a 10A. El veredicto final está en `PHASE_10A_REPORT.md`.

**Leyenda**: ✅ = verificado/OK · ⚠️ = hallazgo no bloqueante documentado · ❌ = no verificado/falla.

---

## A. Construcción y calidad (gates de CI)

| # | Ítem | Estado | Evidencia |
|---|---|---|---|
| A1 | Build de producción | ✅ | `npm run build` exit 0 (2026-08-13, next 16.3.0 + auth 0.41.3/beta.32; `.next/standalone` generado) |
| A2 | Typecheck | ✅ | `tsc --noEmit` exit 0 |
| A3 | Lint | ✅ | 0 errores (warnings preexistentes `any` no bloqueantes) |
| A4 | Tests | ✅ | vitest 1432/1432 (165 archivos) |
| A5 | Audit de dependencias | ⚠️ | 1 high en scope prod: `xlsx` (ReDoS, **sin fix disponible**); documentado y mitigado (imports limitados, archivos confiables) |
| A6 | CI workflow | ✅ | `ci.yml`: typecheck/lint/tests/build + gitleaks + npm audit |

## B. Seguridad

| # | Ítem | Estado | Evidencia |
|---|---|---|---|
| B1 | Secretos expuestos en repo | ✅ | FASE 4-5: 0 `.env*` con secretos; gitleaks en CI; `.gitignore` correcto |
| B2 | Auth (3 CVEs críticos) | ✅ | bump `@auth/core 0.41.3` + `next-auth beta.32` (GHSA homoglyph/getToken/OAuth cookies cerrados) |
| B3 | Autorización y multi-tenancy | ✅ | `Store.userId @unique` en BD; `requireRole`; eventos con `tenantIsolation` |
| B4 | CSRF | ✅ | `csrfGuard` origin/referer + 1MB; cobertura justificada por categoría (94 rutas + SameSite=Lax para el resto) |
| B5 | Rate limiting | ✅ | 71 archivos; auth (login/register/upload) con límites estrictos |
| B6 | Errores sanitizados | ✅ | S-03 corregido (8 rutas); solo mensajes curados al cliente |
| B7 | XSS (JSON-LD) | ✅ | S-02 **corregido** (escapado `\u003c` en `store/[slug]` y `[slug]`; typecheck/lint/build ✅) |
| B8 | Seller auth token | ✅ | S-01 **corregido** (`expiresAt` 7d + `Secure` en prod; typecheck/lint/build ✅) |
| B9 | Uploads | ✅ | magic bytes + rate limit + carpetas por usuario |
| B10 | Webhooks | ✅ | HMAC outbound + provider HMAC + SSRF guards |
| B11 | IA no autoriza | ✅ | agente aislado por tenant; acciones validan contra APIs normales |

## C. Base de datos y datos

| # | Ítem | Estado | Evidencia |
|---|---|---|---|
| C1 | Migraciones | ✅ | 5 versionadas (baseline `20260811000000`); deploy con `migrate deploy` |
| C2 | Backup/Restore | ✅ | 31 dumps; restore validado en 8F; backups excluidos de git |
| C3 | RPO/RTO | ⚠️ | Sin definir (D-07); definir y validar restore trimestral |
| C4 | Shadow DB | ⚠️ | D-04: definir `SHADOW_DATABASE_URL` siempre (fallback a DATABASE_URL es riesgo de dev) |
| C5 | Integridad | ✅ | FKs/índices sólidos (181); cascada Store→User intencional (D-06) con flujo admin confirmado |
| C6 | Índices | ✅ | paths calientes cubiertos; candidatos `Store.userId`/`StoreMember.storeId` documentados |

## D. Despliegue y operación

| # | Ítem | Estado | Evidencia |
|---|---|---|---|
| D1 | Pipeline CI/CD | ⚠️ | `verify.yml` legacy (Node 20 EOL) duplicado — H-05; recomendado eliminar/actualizar |
| D2 | Deploy a producción | ✅ | Vercel (instantáneo); rollback instantáneo disponible |
| D3 | Zero downtime | ✅ | Vercel; migraciones aditivas; orden documentado (DEPLOYMENT_RUNBOOK §4) |
| D4 | Staging | ⚠️ | No existe; recomendado antes del launch (DEPLOYMENT_RUNBOOK §1) |
| D5 | Smoke tests post-deploy | ⚠️ | Procedimiento manual definido (8 pasos); automatización post-launch |
| D6 | Health | ✅ | `liveness` 200 + `readiness` 200/503 (DB + 4 env) |
| D7 | Crons | ✅ | 8 configurados en vercel.json, protegidos por CRON_SECRET |
| D8 | Monitoreo/alertas | ⚠️ | PostHog + AuditLog (124 usos); alertas automatizadas por configurar (RUNBOOK §2) |
| D9 | Config de entorno | ⚠️ | C-01: 61 vars sin validación de presencia en arranque; llenar matriz en Vercel |
| D10 | Privacidad (borrado) | ⚠️ | P-01: sin auto-borrado self-service; solo admin; definir política |
| D11 | Costos | ⚠️ | Modelo estructurado; tiers de billing `NOT DEFINED`; registrar antes del launch |

## E. Reglas de decisión (aplicadas)

Decidir **READY** solo si: sin secreto expuesto ✅ · sin fallo auth/authz/tenants ✅ · sin pérdida de datos ✅ · sin migración insegura ✅ · sin build roto ✅ · sin P0 ✅.

**BLOCKERS**: 0. **HIGH pendientes**: 0.

**Condiciones abiertas (Medio, no bloqueantes)**: P-01 (borrado self-service), H-05 (verify.yml), D-04/D-07/C-01/D8/D9/D11/D4/D5 (operaciones recomendadas).

**Nota (fiabilidad CI)**: `npm test` presenta un flake intermitente de vitest (`EnvironmentTeardownError: Closing rpc while "onUserConsoleLog" was pending`, originado en `tests/tools/order-update-status.test.ts`). No falla tests (1432/1432 ✅) y es un race del worker RPC, preexistente y no relacionado con cambios de 10A (verificado por aislamiento). Riesgo: `npm test` puede salir con código 1 intermitente en CI. Recomendación: monitorizar; si es frecuente, bump menor de vitest en cambio dedicado.

---

**Resultado**: ver veredicto binario en `PHASE_10A_REPORT.md` (§Veredicto).
