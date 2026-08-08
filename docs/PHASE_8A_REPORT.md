# Reporte FASE 8A — WhatsApp Cloud API

*Estado: implementación completa; integración externa pendiente de configuración.*

## Resumen

Se integró **WhatsApp Business (Meta Cloud API)** como primer proveedor REAL de
la Communication Integration Layer (FASE 7C). Todo el flujo —conexión multi-
tenant, webhook, ingesta al inbox, envío saliente y media— pasa por la capa de
comunicación; el Inbox no contiene lógica específica de WhatsApp.

## Decisiones de diseño

| Decisión | Opción tomada |
|---|---|
| Conexiones multi-tenant | Nuevo modelo Prisma `ChannelConnection` (secrets en `config`, nunca en DTOs) |
| Credenciales reales | **No** — implementación config-gated con fallback mock |
| Idempotencia de mensajes | Unique `InboxMessage.storeId_externalId` |
| Resolución de tenant en webhooks | `externalRef = phoneNumberId` |
| Feature gating | `whatsapp_inbox` (Panitas Negocios Plus) en UI y API de conexión |

## Lo implementado

### Esquema (aplicado a Neon con `prisma db push` + `prisma generate`)
- `model ChannelConnection`: `channelId @unique`, `@@unique([storeId, channelId])`,
  índices por `[storeId, status]` y `[externalRef]`, relation con `Store` e `InboxChannel`.
- `InboxMessage @@unique([storeId, externalId])`; índice `InboxConversation.storeId_externalRef`.

### Capa de comunicación (`src/lib/communication/`)
- `providers/whatsapp-provider.ts` — `WhatsAppProvider` real (Graph API v22.0):
  connect/disconnect, sendMessage (texto + media), downloadMedia/uploadMedia,
  markAsRead, health, webhook con firma `x-hub-signature-256`, retry/429.
- `provider-types.ts` — `ProviderStatusUpdate` (delivered/read/failed).
- `middlewares/normalization.ts` — propaga `statusUpdate`.
- `providers/webhook-parser.ts` — `parseWhatsAppCloudValue` / `parseWebhookPayload`
  para el formato WhatsApp Cloud (`entry[].changes[].value.messages[]/statuses[]`).
- `provider-factory.ts` — `MockProviderFactory` acepta `realProviders`.
- `event-registry.ts` — eventos `whatsapp.*` registrados.

### Dominio WhatsApp (`src/lib/whatsapp/`)
- `config.ts` — envs de la app (`WHATSAPP_*`), versión default `v22.0`.
- `connection-service.ts` — `ChannelConnectionService`: connect/disconnect/revoke/
  markError/updateHealth, DTO sanitizado, `resolveByPhoneNumberId`,
  `resolveByVerifyToken`, auditoría + eventos.
- `communication-service.ts` — fachada por tienda con cache (TTL): provider REAL
  si hay conexión activa, MOCK si no.
- `ingestion-service.ts` — ingesta al inbox: dedup, upsert de conversación por
  `wa:<waId>`, matching de cliente por teléfono, estados delivered/read/failed.
- `send-service.ts` — envío saliente del inbox (punto único).
- `webhook.ts` — handshake GET + extracción de `phone_number_id`.
- `index.ts` — barrel público.

### Rutas API
- `api/webhooks/whatsapp/route.ts` — GET verify + POST firmado + ingesta.
- `api/inbox/channels/whatsapp/route.ts` — GET estado / POST connect/disconnect/
  revoke/health (gated por `whatsapp_inbox`).
- `api/inbox/channels/whatsapp/media/[mediaId]/route.ts` — descarga segura con
  fallback SVG amigable.
- `api/inbox/[id]/messages/route.ts` — envío saliente conectado a la capa.

### UI
- `components/inbox/whatsapp-channel-panel.tsx` — panel de configuración
  (conectar/desconectar/revocar/verificar salud, sin secrets).
- `app/dashboard/conversaciones/page.tsx` — botón WhatsApp (solo Plus).

## Verificación

| Chequeo | Resultado |
|---|---|
| `tsc --noEmit` | OK |
| `vitest run` (suite completa) | 1221 tests OK |
| `vitest run tests/whatsapp` | 18 tests OK (nuevos) |
| `vitest run tests/communication` | 60 tests OK |
| `eslint` | Sin errores; sin warnings nuevos en módulo WhatsApp |

## Pendiente

- Pruebas reales contra Meta (requiere credenciales de una Meta App + WABA).
- Guardar el `wamid` real al enviar y reflejar estados en la UI del hilo.
- Render inline de media recibida en el hilo del inbox.
