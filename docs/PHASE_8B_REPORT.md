# Reporte FASE 8B — Instagram y Messenger

*Estado: implementación completa; integración externa pendiente de configuración.*

## Resumen

Se integraron **Instagram Direct Messages** y **Facebook Messenger** (Graph API
de Meta, formato `entry[].messaging`) como proveedores REALES de la
Communication Integration Layer (FASE 7C), compartiendo un base común
(`MetaMessagingProvider`) porque ambos canales usan el mismo formato de webhook,
los mismos endpoints de envío y los receipts de lectura/escritura. Todo el
flujo —conexión multi-tenant, webhook, ingesta al inbox, envío saliente y
media— pasa por la capa de comunicación; el Inbox no contiene lógica específica
de estos canales.

## Decisiones de diseño

| Decisión | Opción tomada |
|---|---|
| Arquitectura de los providers | Base abstracta `MetaMessagingProvider` en la capa de comunicación; `InstagramProvider`/`MessengerProvider` como subclases delgadas (canal, sendPath, healthPath) |
| Conexiones multi-tenant | `ChannelConnection` con unique `@@unique([storeId, channelId])`; secrets en `config`, nunca en DTOs/logs |
| Credenciales reales | **No** — implementación config-gated con fallback mock |
| Idempotencia de mensajes | Unique `InboxMessage.storeId_externalId` |
| Resolución de tenant en webhooks | `externalRef = accountId` (`entry[].id`: ig id / page id) |
| Estados de lectura | Meta lee por watermark de conversación → marca `sent`/`delivered`→`read`; delivered/failed por mid exacto |
| Respuesta a Meta | Siempre 200 (`status:"ignored"` en fallos) para cortar reintentos |
| Feature gating | `instagram_inbox` / `facebook_inbox` (Panitas Negocios Plus) en UI y API de conexión |

## Lo implementado

### Capa de comunicación (`src/lib/communication/`)
- `providers/meta-messaging-provider.ts` — base abstracta: HTTP con timeout,
  mapeo de errores 401/403/404/429/5xx a códigos de dominio
  (`INSTAGRAM_*`/`MESSENGER_*`), connect/disconnect, sendMessage (texto + media
  por URL), markAsRead (`mark_seen`), typing_on/off, health, webhook con firma
  `x-hub-signature-256`, cola de entrantes, `setConnectedForTest`.
- `providers/instagram-provider.ts` / `providers/messenger-provider.ts` — subclases.
- `providers/webhook-parser.ts` — `fromMetaMessaging` para el formato
  `entry[].messaging`: texto/adjuntos (con url, size, mediaId), salto de
  `is_echo`, `delivery`→delivered (mids), `read`→read (watermark); timestamps en
  ms.
- `providers/index.ts` / `index.ts` — exports de los nuevos providers.

### Dominio Meta (`src/lib/meta/`)
- `config.ts` — envs `META_*` compartidos (versión `v22.0`, base URL, App
  Secret, verify token), `externalRefPrefix` (`ig:`/`fb:`), nombre por defecto
  del cliente.
- `webhook.ts` — handshake GET + `extractMetaPageId`.
- `connection-service.ts` — `MetaConnectionService`: get/resolveByExternalRef/
  resolveByVerifyToken/connect/disconnect/revoke/markError/updateHealth, DTO
  sanitizado, auditoría + eventos.
- `communication-service.ts` — fachada por tienda+canal con cache (TTL 60s):
  provider REAL si hay conexión activa, MOCK si no; invalidación al mutar.
- `ingestion-service.ts` — dedup por `storeId_externalId`, upsert de conversación
  por `ig:<id>`/`fb:<id>`, delivered/failed por mid, read por watermark.
- `send-service.ts` — `sendMetaAgentMessage` (punto único de envío saliente).
- `media.ts` — `resolveMetaAttachmentUrl` por mediaId + proxy con access token +
  fallback SVG.
- `webhook-route.ts` — manejador GET/POST compartido para ambos canales.
- `channel-route.ts` — GET estado / POST connect|disconnect|revoke|health
  (gated por feature).
- `media-route.ts` — `metaMediaGet` para la ruta de media.
- `index.ts` — barrel público.

### Rutas API
- `api/webhooks/instagram/route.ts` y `api/webhooks/messenger/route.ts` — GET
  verify (token global o de conexión) + POST firmado + ingesta idempotente.
- `api/inbox/channels/instagram/route.ts` y `api/inbox/channels/messenger/route.ts`
  — estado y acciones de conexión (gated por `instagram_inbox`/`facebook_inbox`).
- `api/inbox/channels/instagram/media/[mediaId]/route.ts` y
  `api/inbox/channels/messenger/media/[mediaId]/route.ts` — proxy de media con
  fallback SVG.
- `api/inbox/[id]/messages/route.ts` — despacho por `conversation.channel.type`:
  `instagram`/`messenger` → `sendMetaAgentMessage`; resto → `sendAgentMessage`.

### Eventos (`src/lib/events/event-registry.ts`)
- `instagram.*` y `messenger.*`: `connection.created|connected|disconnected|
  error|revoked`, `webhook.received|invalid_signature|unresolved`,
  `message.incoming|sent|delivered|read|failed`, `conversation.upserted`,
  `media.downloaded`.

### UI
- `components/inbox/meta-channel-panel.tsx` — panel genérico Instagram/Messenger
  (conectar/desconectar/revocar/verificar salud, sin secrets).
- `app/dashboard/conversaciones/page.tsx` — botones Instagram y Messenger (solo Plus).

## Verificación

| Chequeo | Resultado |
|---|---|
| `tsc --noEmit` | OK |
| `vitest run` (suite completa) | 1267 tests OK (147 archivos) |
| `vitest run tests/meta` | 28 tests OK (nuevos) |
| `eslint` | Sin errores; sin warnings nuevos en módulos Meta/Instagram/Messenger |
| `npm run build` | OK |

## Pendiente

- Pruebas reales contra Meta (requiere credenciales de una Meta App con
  Instagram Messaging / Messenger Platform).
- Guardar el `mid` real al enviar y reflejar estados en la UI del hilo.
- Render inline de media recibida en el hilo del inbox.
- Reintento/backoff fino en el envío y cola de reintentos ante 429 de Meta.
