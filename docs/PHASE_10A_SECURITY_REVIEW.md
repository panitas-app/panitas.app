# PHASE_10A_SECURITY_REVIEW.md — Revisión de Seguridad

**Fase 10A · Fases 14-23 · Fecha: 2026-08-13 · Branch: `develop-v2`**

Revisión de seguridad basada en evidencia sobre el código actual (`develop-v2`). Complementa los documentos 8F (`API_SECURITY.md`, `SECURITY_AUDIT.md`, `SECURITY_ROTATION_CHECKLIST.md`, `PRODUCTION_CHECKLIST.md`) que ya fueron verificados; este documento registra el estado a 10A y los hallazgos nuevos.

---

## 1. FASE 14 — Autenticación

### Estado
- **NextAuth v5 (beta.32) + @auth/core 0.41.3 + @auth/prisma-adapter 2.11.3** tras el bump de FASE 6. Cierra 3 CVEs críticos (`GHSA-7rqj-j65f-68wh` homoglyph `@`, `GHSA-xmf8-cvqr-rfgj` getToken malformed Bearer, `GHSA-x445-f3h2-j279` OAuth state/nonce/PKCE cookies).
- Sesión **JWT** (`auth.config.ts:6`), sin adapter para sesiones (Credenciales + Google). `trustHost: true`.
- Credenciales: `bcrypt.compare` con hash bcrypt de `User.password` (`auth.ts:51`); usuarios sin `password` no pueden entrar por credenciales (`auth.ts:49`).
- Cookies de sesión: `__Secure-` en producción, httpOnly, sameSite lax, secure en prod (`auth.ts:14-32`).
- **Google OAuth**: login manual con resolución del `User` de BD por email (JWT callback, `auth.config.ts:47-57`) y creación de `Account` por email.

### Hallazgos
- **S-04 (Riesgo documentado, Bajo)**: `allowDangerousEmailAccountLinking: true` (`auth.ts:37`) es necesario para el flujo de vincular Google a cuentas Credentials existentes (manejo manual en `auth.ts:60-120`). El riesgo de bypass homoglyph/Unicode quedó cubierto por `@auth/core 0.41.3` (normalización interna de emails). Se mantiene con documentación; NO eliminar sin rediseñar el flujo de vinculación.

## 2. FASE 15 — Autorización y multi-tenancy

### Estado
- **Tenant 1:1 reforzado en BD**: `Store.userId @unique` (schema), `Negocio.userId` (único). El aislamiento no depende solo del código.
- `getCurrentStore()` resuelve el tenant vía `StoreMember.findFirst({ where: { userId } })` (`permissions.ts:225`); `requireRole(["admin","manager",...])` para acciones restringidas.
- **Bootstrap automático** `autoCreateStore` (permissions.ts:82): crea Negocio + Store + StoreMember con manejo de `P2002` y fallback de slug con entropía. Solo para el usuario autenticado (no paramétrico por terceros).
- **Event bus multi-tenant**: `tenantIsolationMiddleware` corta cualquier evento sin `tenantId` antes de llegar a listeners (`event-middlewares/tenant-isolation.middleware.ts`).
- **Guard admin platform**: `requireIntegrationsAdmin` → `requireRole(["admin","manager"])` (`platform/admin/guard.ts`).
- **Admin interno**: cookie `admin_token` (HttpOnly, Secure en prod, SameSite Lax, 24h) comparada en tiempo constante contra `ADMIN_SECRET` + existencia de usuario `superadmin` (`local-only.ts`). No hay auto-promoción (fix 9E).
- Sin RLS Postgres (D-03); aislamiento por `storeId`/`negocioId` consistente en todos los modelos de tenant.

### Veredicto FASE 15
Sin fallo de tenants en el análisis estático. La frontera storeId + unicidad `Store.userId` + aislamiento de eventos es sólida.

## 3. FASE 16-18 — API security, validación de input, output security

### Estado
- **259 rutas API** (`route.ts`), 181 mutantes (POST/PUT/PATCH/DELETE).
- **CSRF**: `csrfGuard` con allowlist de origen (`NEXTAUTH_URL` + localhost dev), fallback referer same-origin, límite de body 1MB (`csrf.ts`). Importado en **94 rutas**.
  - Las 87 rutas mutantes restantes sin import de `csrf` caen en categorías defendibles: `admin/*` (cookie admin_token, guard 9E), `cron/*` (CRON_SECRET header), `webhooks/*` (HMAC de proveedor), `auth/*` (públicas, sin estado autenticado), `seller/*` (HMAC propio) y rutas de sesión cubiertas por **SameSite=Lax** (el navegador no envía la cookie en POST cross-site). La verificación de origen es defensa en profundidad; la primaria es SameSite.
- **Rate limiting**: `rate-limit.ts` (Upstash fetch pipeline con AbortSignal 2s + fallback en memoria con GC 10 min). Usado en **71 archivos** (register 3/15min, login 5/1min, upload 20/min, etc.).
- **Salida**: React escapa por defecto; `dangerouslySetInnerHTML` solo en 16 sitios JSON-LD (ver S-02). Sin `eval()` en `src`.
- **Input**: servidor re-valida precios, cupones y límites de plan (fixes 9E #1/#4/#5); validación de archivos por contenido (magic bytes, FASE 19).

### Hallazgos
- **S-02 (Medio) · JSON-LD sin escapar `</script>` — CORREGIDO (2026-08-13)**: `src/app/store/[slug]/page.tsx:222` y `src/app/[slug]/page.tsx:221` ahora escapan `<` como `\u003c` en `JSON.stringify(jsonLd).replace(/</g, "\\u003c")`, cerrando el vector de stored XSS en las páginas públicas de tienda (datos del dueño + nombres de producto). Validado: typecheck ✅, lint 0 errores ✅, build ✅.
- **S-03 (Medio) · Fuga de `err.message` en rutas API — CORREGIDO (2026-08-13)**: de las 23 rutas detectadas, la mayoría usaba patrones controlados (`isServiceError(error)` devuelve solo errores de dominio curados; `includes("No tienes")` filtra mensajes de autorización intencionales). Se corrigieron las fugas incondicionales/semáforo en 8 archivos: `upload/route.ts`, `installments/route.ts`, `sellers/route.ts`, `orders/[id]/verify-payment/route.ts` (rama 500), `cash-register/[id]/route.ts`, `analytics/finanzas/route.ts`, `analytics/route.ts`, `stores/route.ts`. Los mensajes internos se reemplazan por texto estático ("Intenta nuevamente") y se añade `console.error` para conservar observabilidad. Validado: typecheck ✅, lint 0 errores ✅, build ✅. Patrones controlados restantes: 21 usos (todos curados).

## 4. FASE 19 — Uploads

### Estado
- `/api/upload`: requiere sesión (`auth()`), rate limit 20/min por usuario+IP, `validateFileUpload({name,type,size}, buffer)` **valida por contenido (magic bytes)**, no solo MIME; detecta videos (`isVideoMime`) y sube a Cloudinary en carpeta por usuario (`upload/route.ts`). Cumple el checklist #17 (validación de contenido). Excepción: línea 48 filtra `err.message` (ver S-03).

## 5. FASE 20 — Webhooks

### Estado
- **Outbound (Panitas → suscriptor)**: `X-Panitas-Signature: t=<ts>,v1=<hmac sha256>` sobre `<timestamp>.<body>`; tolerancia de 5 min anti-replay; comparación `timingSafeEqual`; IDs de evento/delivery (`signature.ts`).
- **Inbound (proveedores → Panitas)**: verificación HMAC por proveedor (WhatsApp, Instagram, Messenger) verificada en 8F; guards SSRF con range checks en `platform/webhooks/ssrf.ts` (sin dep extra).

### Veredicto FASE 20
Sin hallazgos.

## 6. FASE 21 — Seguridad IA

### Estado
- El bus de eventos exige `tenantId` (corta flujos sin tenant).
- La IA **no es capa de autorización**: el retriever de memoria usa `getToken()` server-side; las acciones del agente se validan contra las APIs con guards normales. No hay endpoint que confíe en la salida del modelo como autorización.
- Config del agente centralizada (`agent-core/config.ts`); memoria y documentos con scope por tienda (`BusinessMemory`, `KnowledgeDocument` indexados por storeId).

### Veredicto FASE 21
Sin hallazgos de inyección transversal de tenant.

## 7. FASE 22 — Rate limiting / abuso

### Estado
- Cobertura: 71 archivos con `rateLimit` (frente a 37 contados en H-07 — cobertura ampliada). Endpoints de riesgo (auth, upload, checkout) protegidos.
- `csrfGuard` con límite de 1MB en body para rutas que lo aplican.

### Hallazgo (hereda H-07)
- No hay **middleware edge global** que imponga CSRF/rate-limit de forma universal; la protección es por ruta. Las categorías sin CSRF están justificadas (§16-18). Cobertura documentada, no bloqueante.

## 8. FASE 23 — Otros

- **POS PIN**: `Store.posPin` hasheado con bcrypt.
- **Debug route**: `/api/debug` protegido por cookie admin + `getLocalSuperadmin` (FASE 3).
- **No middleware edge** (H-06): sin `middleware.ts` de borde; las rutas públicas no tienen headers/geofencing en edge. No bloqueante.

---

## 9. Matriz de hallazgos de seguridad (10A)

| ID | Severidad | Área | Descripción | Acción recomendada | Bloquea lanzamiento |
|---|---|---|---|---|---|
| S-01 | **Medio** | Seller auth | Token sin expiración + cookie sin `Secure` | **CORREGIDO** (`expiresAt` 7d embebido + `Secure` en prod) | No |
| S-02 | **Medio** | XSS stored (JSON-LD) | JSON-LD de tienda sin escapar `<` | **CORREGIDO** (`\u003c` en `store/[slug]` y `[slug]`) | No |
| S-03 | **Medio** | Info disclosure | Fuga de `err.message` al cliente | **CORREGIDO** (8 archivos; mensajes estáticos + console.error) | No |
| S-04 | Bajo | Auth OAuth | `allowDangerousEmailAccountLinking: true` | Documentado; mitigado por bump; no tocar sin rediseño | No |

## 10. Controles verificados OK (sin hallazgo)

- Contraseñas bcrypt; cookies de sesión con `__Secure-`/HttpOnly/SameSite/secure
- Tenant 1:1 en BD (`Store.userId @unique`); aislamiento de eventos por `tenantId`
- CSRF por origin+referer con límite de body; HMAC webhooks con anti-replay
- Upload con validación de contenido (magic bytes) y rate limit
- Admin interno con comparación en tiempo constante + doble requisito (secret + superadmin)
- Sin `eval()`; `dangerouslySetInnerHTML` solo en JSON-LD
- Sin secretos en repositorio (FASE 4-5)
