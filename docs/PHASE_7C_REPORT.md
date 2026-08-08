# FASE 7C — Communication Integration Layer — Reporte

## Resumen ejecutivo

Se construyó la **capa de integración de mensajería** sobre el Inbox (7A) y el
Copiloto (7B): un contrato `CommunicationProvider` desacoplado de los
proveedores concretos, con modelo de mensaje unificado, middlewares de envío
(validación, normalización, retry, rate limit, logging), seguridad de webhooks
(HMAC timing-safe, bearer, sanitización, rotación de credenciales), proveedores
**mock por canal** (sin conexiones reales), salud/métricas por proveedor,
eventos de dominio `communication.*` y su listener. El Inbox **no depende de
ningún proveedor concreto**: los conectores reales (Twilio/Meta/SMTP) se
sustituyen implementando la misma interfaz.

**Verificación:** `tsc --noEmit` OK · eslint (módulos de la fase) 0 errores ·
**60 tests nuevos** en `tests/communication/` en verde · suite completa en
verde · build OK. **Sin cambios de schema** (no requiere `db:push`).

## Qué se implementó

### 1. Módulo `src/lib/communication/` (`P0`–`P6`)
- **`provider-types.ts`** — tipos **puros sin Prisma**: 5 canales con
  `PROVIDER_CHANNEL_META[channel].defaultProviderId` (`mock-${channel}`),
  estados, `ProviderMessage` unificado, `ProviderSendResult`, `ProviderHealth`,
  `ProviderMetrics`, `ProviderRuntimeView`, `ProviderInboundEvent` y el catálogo
  `COMMUNICATION_EVENTS` + `COMMUNICATION_EVENT_DOMAIN`.
- **`interfaces/communication-provider.ts`** — contrato `CommunicationProvider`
  (`connect`, `disconnect`, `sendMessage`, `downloadMedia`, `uploadMedia`,
  `markAsRead`, `typing`, `health`, `webhook`, `receiveMessages?`,
  `simulateIncoming?`).
- **`middlewares/`** — `composeSendMiddlewares` con `next(input?)`
  transformador; validación (±4096 chars), normalización (trim + arrays/obj
  garantizados), retry (backoff exp; 444/4xx no reintenta), rate limit (429 por
  ventana deslizante, clave por canal) y logging sin secretos
  (`defaultLog`/`noopLog`).
- **`security.ts`** — `createSignature`, `safeEqualHex` (timing-safe),
  `verifyWebhookSignature`, `verifyBearerToken`, `sanitizeProviderConfig`,
  `generateSecret`, `rotateCredentials` (tolera vigente+anterior) y
  `requireWebhookSecret`.
- **`providers/mock-provider.ts`** + **`webhook-parser.ts`** — mock con
  `latencyMs`/`failRate`/`webhookSecret`/`requireConnected` y parseo genérico +
  Meta `entry[].messaging`.
- **`provider-registry.ts`** — registro/consulta por id y canal (404 si no).
- **`provider-factory.ts`** — `MockProviderFactory` con caché por canal y
  overrides `perChannel`.
- **`provider-health.ts`** — `ProviderHealthMonitor` + `healthSummary`.
- **`provider-manager.ts`** — conexiones, cadena de middlewares **cacheada por
  providerId**, webhook/pull/simulate, health, `MetricsState` y publicación de
  eventos (con `fireEvents: false` + hook `onEvent` para aislar tests).
- **`communication-service.ts`** — fachada por tienda: crea proveedor por
  canal, **lo registra** (`ensureProvider`) y delega en el manager.
- **`index.ts`** — barrel público de la fase.

### 2. Eventos (`P5`)
- 6 eventos nuevos en `event-registry.ts` (categoría `conversations`,
  aggregate `channel`/`provider`): `channel.connected`,
  `channel.disconnected`, `message.received`, `message.sent`,
  `provider.error`, `provider.retry` — todos `data.domain === "communication"`.
- **`event-listeners/communication.listener.ts`** nuevo (`registerCommunicationListener`
  con estado por proveedor + contadores + hook `onEvent`), exportado por
  `@/lib/events` y registrado en el bundle.
- `conversation-history.listener` excluye `domain === "communication"`
  (junto a `inbox` y `copilot`).

### 3. Tests (`P7`)
- **60 tests en `tests/communication/`** (9 archivos): tipos/constantes;
  middlewares (validación, normalización con transformación vía `next`,
  retry con `shouldRetry` 444/4xx, rate limit 429, logging, composición);
  seguridad (firma válida/inválida, timing-safe con no-hex, bearer,
  sanitización conservando `clientId`, rotación con vigente+anterior,
  `requireWebhookSecret`); registro (404); fábrica (caché/overrides); salud;
  manager (conexión+eventos, envío, retry, webhook firma válida/inválida,
  pull+simulate, markAsRead/typing, validación previa, rate limit por canal,
  media, **envío correcto sin conexión** y 502 con `requireConnected`); y
  servicio (fachada por canal, proveedor por defecto registrado, webhook+pull).

## Decisiones clave

- **Contrato desacoplado**: el Inbox/Copiloto solo conocen
  `CommunicationService`/`CommunicationProvider`; los reales se sustituyen por
  implementación (ver `PROVIDER_ARCHITECTURE.md`).
- **Proveedores mock por canal** (`mock-${channel}`) con caché en la fábrica:
  punto único de sustitución futura.
- **Envío correcto no exige conexión** cuando el mock no lo requiere; opcional
  `requireConnected` lanza 502 `PROVIDER_NOT_CONNECTED`.
- **`next(input?)` transformador**: la normalización puede reemplazar el input
  antes del proveedor.
- **Cadena de middlewares cacheada por providerId**; `MetricsState` interno
  (no `emptyMetrics` muerto ni parseo de ids).
- **Eventos `{ domain: "communication" }`** excluidos del historial junto a
  `inbox`/`copilot`; `fireEvents: false` en tests con hook `onEvent`.
- **Seguridad por defecto**: firma timing-safe, fallo cerrado 401, config
  siempre sanitizada, rotación con ventana de gracia, rate limit 429.
- **Sin persistencia en BD**: transporte puro con estado en memoria (salud,
  métricas, UI). Sin cambios de schema.

## Pendientes (fuera de alcance)

1. Conectores reales (Twilio, Meta Graph API, SMTP, WebChat) — interfaz lista.
2. Persistencia de conversaciones de canales externos en la BD del Inbox
   (mapeo `ProviderMessage` → esquema 7A).
3. Rate limit/estado distribuido (Redis) y cola de mensajes.
4. UI del estado de canales en el dashboard (los eventos y `ProviderRuntimeView`
   ya la exponen).
