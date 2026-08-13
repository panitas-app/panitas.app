# Reporte FASE 8D — Public API, Webhooks & Platform Integrations

*Estado: implementación completa (backend + seguridad + tests + docs + UI admin
de Integraciones).*

## Resumen

Se construyó la **plataforma pública** de Panitas: una API REST v1 autenticada
con API keys, un sistema de **webhooks salientes** firmados que consume los
Business Events existentes, y un **registro de extensiones**. Todo bajo una capa
de seguridad explícita (keys con hash + comparación constante, aislamiento
multi-tenant estricto, SSRF, rate limiting, idempotencia, auditoría y errores
públicos sin filtraciones).

Alcance **NO** incluido en esta fase (por diseño): marketplace de apps, OAuth
complejo, SDKs, plugins con código arbitrario y acceso directo de terceros a la
BD.

## Decisiones de diseño

| Decisión | Opción tomada |
|---|---|
| Tenant | Siempre derivado de la API key (Bearer); nunca de IDs del cliente |
| API Keys | Secreto `pk_live_` de 32 bytes; solo se persiste SHA-256 hex + `keyPrefix`; comparación `timingSafeEqual`; crear/rotar/revocar/expiración |
| Permisos | `{recurso}:{read|write}` por key, validados en cada request |
| Feature gating | `public_api` (Plus) global + `RESOURCE_FEATURE_MAP` por recurso (conversations→unified_chat, attention→attention_center) |
| Rate limiting | 120 req/min por key, 600 por tienda, sobre `src/lib/rate-limit.ts` |
| Paginación | Cursor opaco (base64 de página), `limit` 1–100, `hasMore`/`nextCursor` |
| Ordenamiento | Whitelist por recurso (`sort` / `sort=-campo`) |
| Idempotencia | `Idempotency-Key` 8–128 `[A-Za-z0-9_-]`, ventana 24 h, replay con `X-Idempotent-Replay` |
| Webhooks | Consumen Business Events (sin segundo sistema); dedupe `[subscriptionId, eventId]`; firma HMAC-SHA256 con anti-replay 5 min; retries backoff máx 5; dead-letter a 10 fallos + reintento manual |
| SSRF | Bloqueo de localhost, `.local/.internal/.lan`, rangos IPv4/IPv6 privados/reservados; resolución DNS validando TODAS las direcciones (caché 60 s) |
| Errores | `{ error: { code, message, requestId } }`; nunca se exponen internals |
| Auditoría | `public_api.request` sin headers/secrets; operaciones admin auditadas |
| Extensiones | Solo registro (tipo, permisos, estado); **cero ejecución de código** |

## Lo implementado

### Núcleo (`src/lib/platform/`)
- `permissions.ts` — 9 recursos, 16 permisos, `RESOURCE_FEATURE_MAP`.
- `errors.ts` — códigos públicos + mapeo desde errores de servicio.
- `public-api/` — `route.ts` (pipeline: requestId → auth → feature gating →
  rate limit → permiso → idempotencia → handler → auditoría), `authenticate.ts`,
  `context.ts`, `response.ts`, `pagination.ts`, `idempotency.ts`, `rate-limit.ts`,
  `request-id.ts`.
- `api-key/service.ts` — `ApiKeyService` (create/validate/revoke/rotate/list/touch).
- `webhooks/` — `service.ts`, `signature.ts`, `ssrf.ts`, `deliver.ts`,
  `dispatcher.ts`, `app.ts` (singleton), `types.ts`.
- `extensions/service.ts` — `ExtensionService` (create/list/updateStatus/remove).
- `admin/guard.ts` — `requireIntegrationsAdmin()` (admin/manager).

### Recursos v1 (`src/lib/platform/resources/`)
- `helpers.ts`, `products.ts`, `customers.ts`, `orders.ts`, `inventory.ts`,
  `credits.ts`, `suppliers.ts`, `conversations.ts`, `events.ts`, `attention.ts`.
- Lecturas con queries Prisma scoped `storeId`; escrituras delegadas a los
  servicios de dominio existentes (`OrderService.create`,
  `CustomerService.findOrCreateByPhone`, `InventoryService.applyMovement`,
  `ProductService`, `CreditService`, `SupplierService`).

### Rutas `/api/v1/*`
- products, customers, orders, inventory, credits (+`/payments`), suppliers
  (+`/purchases`, `/payments`), conversations, events, attention
  (+acknowledge/resolve/dismiss/snooze). Todas las mutaciones idempotentes.

### Integraciones internas `/api/integrations/*`
- API keys (list/create con secret de una sola vista; revoke/rotate por id).
- Webhooks (list/create; get/patch/delete por id; deliveries; retry manual).
- Extensiones (list/create; update status/delete).

### UI Admin (Configuración → Integraciones)
- `IntegrationsSettings` (client component) con 3 pestañas:
  - **API Keys**: listado con estado/permisos, crear (picker de permisos
    agrupados por recurso), rotar y revocar; el secreto se muestra una vez en
    un diálogo con copiar.
  - **Webhooks**: listado con estado y nº de eventos, crear (eventos por grupo
    de negocio), pausar/activar, ver entregas y reintentar dead-letters.
  - **Extensiones**: registrar (nombre, descripción, tipo, permisos),
    activar/desactivar, eliminar.
- Visible solo para admin/manager (mismo criterio que `requireIntegrationsAdmin`).
- No importa barrels con servicios: solo tipos puros y componentes de UI.

### Integración con eventos
- `WebhookDispatcher` registrado en `getEventSystem`/`configureEventSystem`
  (`attachPlatformListeners`); se desregistra en `resetEventSystemForTest`.
- `retryDelivery` expuesto en el singleton para el endpoint de reintento.

### Features
- `public_api` añadida a `FeatureKey` y `PLUS_FEATURES` (catálogo: 16 features).

## Verificación

- `npm run typecheck` — ✅ verde.
- `npx eslint` — ✅ 0 errores/avisos en el código nuevo.
- `npx vitest run` — ✅ **1405 tests** (81 nuevos en `tests/platform/`).
- `npm run build` — ✅ exit 0 (aviso pre-existente en `src/lib/bcv/fetcher.ts`).
- Tests nuevos: permisos, API keys (9), paginación, firma (8), SSRF (10),
  entrega (4), idempotencia, service de webhooks (10), dispatcher (9, con fake
  timers: dedupe, backoff, dead-letter, reintento manual) y el pipeline de rutas
  (auth 401/403, feature gating, idempotencia, errores sin filtraciones).

### Bugs reales detectados y corregidos durante las pruebas
1. `authenticate.ts` pasaba la cadena JSON de permisos sin parsear → todas las
   keys quedaban con permisos vacíos (403 permanente). Se parsea con try/catch.
2. `dispatcher.ts` re-agendaba el snapshot previo al intento → `attempts` nunca
   acumulaba y no existía dead-letter real. Ahora agenda la fila actualizada.
3. `retryDelivery` rechazaba suscripciones `dead_letter`; ahora el reintento
   manual las reactiva (status `active`, `failureCount=0`).
4. Colisión del caché DNS de SSRF entre tests (host compartido) → hostnames
   distintos por test.

## Pendientes / siguientes

- `prisma db push` (o migrate) en `develop-v2` para crear las tablas de la
  plataforma (`ApiKey`, `ApiIdempotency`, `WebhookSubscription`,
  `WebhookDelivery`, `Extension`) — NO ejecutado por política de protección.
- Límites por plan aplicados a la Public API (volumen mensual, nº de keys/webhooks).
- Autenticación OAuth para partners (fase futura, sobre `api_integration`).
