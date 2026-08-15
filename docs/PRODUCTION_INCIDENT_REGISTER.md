# PRODUCTION_INCIDENT_REGISTER.md — Registro de incidentes de producción

**FASE 10C · 2026-08-15 · Branch: `develop-v2`**

Registro de incidentes y observaciones, incluyendo hallazgos heredados de 10B/10B.1 y los nuevos de esta fase.

---

## Registro

| ID | Fecha | Severidad | Área | Descripción | Detección | Impacto | Reproducible | Causa raíz | Fix | Estado |
|---|---|---|---|---|---|---|---|---|---|---|
| 10C-01 | 2026-08-07 | P1 | AI | Fallos de agente (`agent.failed` ×4) con `provider: "unknown"` | `AuditLog` | 1 usuario afectado, operaciones AI no disponibles | Sí (config) | **Proveedor IA no configurado en ese período** (antes del deploy OpenRouter/NVIDIA del 08-11) | Config de proveedor IA en envs Vercel (10B) | FIXED (config) — verificado: 0 `agent.failed` en últimas 24h |
| 10C-02 | 2026-08-14 | P1 | AI | IA respondía "No encontré productos para esa búsqueda" aunque existieran productos | Triage 10B.1 | Usuario IA consultando inventario | Sí (unit test) | `inventory.searchProduct` devuelve `{products,total}` (objeto), `executor.ts` `buscar_producto` esperaba array → lista siempre vacía | Fix en `executor.ts` (commit `69a8df1`) + 3 tests de regresión + **deploy `dpl_2TP7CoTuQeMXMw21ioWaMgeetJB9` (2026-08-15)** | VERIFIED (deploy READY, smoke 200) |
| 10C-03 | 2026-08-14 | P2 | Seguridad | `xlsx@0.18.5`: Prototype Pollution (GHSA-4r6h-8v6p-xvw6, CVSS 7.8) + ReDoS (GHSA-5pgg-2g8v-p4x9, CVSS 7.5); sin fix npm | `npm audit` | Parseo de import de productos autenticado | N/A | Dependencia desactualizada sin fix disponible en registry | Documentado; mitigación 0.20.3 disponible pero NO aplicada | **ACCEPTED RISK** (decisión usuario 10B.1 "Solo documentar") |
| 10C-04 | 2026-08-15 | P3 | IA config | `OPENROUTER_API_KEY` devuelve **401 inválida**; `AI_PROVIDER=nvidia` activo (key NVIDIA válida 200) | Liveness check esta fase | Ninguno (OpenRouter es backup no usado) | Sí | Key OpenRouter vieja/expirada, no rotada | No requerido (no se usa); recomendar rotar si se re-activa | MONITORING |
| 10C-05 | 2026-08-15 | P3 | Config | `POSTHOG_PROJECT_SECRET_KEY` y `POSTHOG_PERSONAL_API_KEY` **vacías** bajo `vercel env run -e production` (token público `phc_…` presente y capture OK) | Inventario env esta fase | Captura server-side/login limitada; client-side funciona | Verificación adicional | Posible valor vacío/borrado en Vercel o limitación de descifrado CLI | Re-set con el usuario | OPEN (INVESTIGATING) |
| 10C-06 | 2026-08-15 | P3 | Rate limit | `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` MISSING → rate limiter cae a **in-memory por instancia serverless** | Inventario env esta fase | Rate limiting distribuido débil (por lambda); sigue GC'd (sin OOM) | Sí | Upstash no configurado en prod | No requerido (fallback funciona, GC cada 10min); documentado | ACCEPTED RISK (para escala real, configurar Upstash) |
| 10C-07 | 2026-08-15 | P4 | Cron | `BcvRate` sin actualización el 2026-08-15 (última: 08-14 04:24) | Query esta fase | Tasa USD de ayer visible | Indeterminado | Fuente BCV fuera de ventana/feriado o fuente no disponible | No requerido (comportamiento esperado fuera de ventana 4-8pm VET) | MONITORING |
| 10C-08 | 2026-08-15 | P4 | Email | `EmailLog` con 4 registros `sending` (de 59) | Query esta fase | 4 correos sin confirmación de envío | Indeterminado | Envío async sin callback persistido o destinatario no verificado | No requerido; 0 `failed` | MONITORING |
| 10C-09 | 2026-08-15 | P3 | Observabilidad | Vercel Web Analytics / Speed Insights **deshabilitados** → Web Vitals y analytics de página NO medidos | Inventario API Vercel | Sin métricas de rendimiento frontend | N/A | No activado | Documentado; activar en Vercel cuando se requiera | ACCEPTED RISK |
| 10C-10 | 2026-08-14 | P3 | BD | **Retention de backup NO automatizado** (backup manual 10B.1 PASS, sin cron/snapshot Neon) | 10B.1 | Pérdida de datos en desastre sin backup reciente | N/A | Sin automatización | Documentado en DATABASE_BACKUP_STATUS.md | ACCEPTED RISK (backup manual reciente existe: `panitas-2026-08-14T03-54-32.dump`) |
| 10C-11 | 2026-08-15 | P4 | Consistencia | Chequeo `payments_sum` señaló 1 orden (`ORD-20260723-CAOY`) con suma pagos ≠ total — **analizado como falso positivo** | Chequeo no destructivo | Ninguno | No | Crédito parcial legítimo: downPayment 20 + cuota1 14.5 + cuota2 14.5 pagados = 49; cuota3 14.5 pendiente → total 63.5 ✓ | N/A (esperado) | CLOSED (no incidente) |
| 10C-12 | 2026-08-15 | P4 | Consistencia | `AttentionItem`: 80 ítems generados, 0 `resolved` | Chequeo BD | Alertas no resueltas visibles en Centro de Atención | N/A | Ítems de atención generados por eventos reales sin resolución manual | N/A | MONITORING |
| 10C-13 | 2026-08-15 | P3 | Analytics | **GA4/GTM inoperantes en prod**: scripts cargan (GTM-TDP569Q9, G-MFZ0PXLDRY en `layout.tsx`) pero la CSP `connect-src` de `next.config.ts` no incluye `google-analytics.com`/`google.com` → beacons bloqueados + `pageError` "Cannot set properties of null (setting 'src')" en home/login | Validación navegador real (Playwright/Chromium) esta fase | Analytics de Google no reciben eventos; PostHog sí funciona (us.posthog.com sí está en CSP) | Sí | Mismatch CSP vs endpoints GA (GTM gtag.js sí permitido por `script-src`, pero `connect-src` de beacon collection falta) | No aplicado (fuera de alcance de estabilización; 2 opciones: añadir `https://www.google-analytics.com https://www.google.com` a `connect-src`, o retirar GA si PostHog es la fuente única) | OPEN — recomendar decisión usuario |

---

## Resumen por severidad

| Severidad | Cantidad | Estado |
|---|---|---|
| P0 | 0 | — |
| P1 | 2 | ambos FIXED/VERIFIED (10C-01 config, 10C-02 deploy) |
| P2 | 1 | ACCEPTED RISK (xlsx) |
| P3 | 7 | MONITORING/OPEN/ACCEPTED |
| P4 | 3 | MONITORING/CLOSED |
| **Total** | **13** | — |

## Grupos de errores (FASE 6 — triage)

- **4 fallos `agent.failed`** → 1 causa raíz (proveedor IA no configurado) → 1 incidente (10C-01). No son 4 problemas.
- **2 vulnerabilidades `xlsx`** → misma dependencia → 1 incidente (10C-03).
- **Endpoints protegidos sin sesión** (401 en products/orders/admin) → comportamiento correcto, no incidente.
- **Sin errores 500 en logs** en la ventana observada → sin grupo de errores backend.
