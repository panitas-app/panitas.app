# Integración de Messenger (FASE 8B)

> Guía técnica de la integración de **Facebook Messenger (Meta Graph API
> Messaging API)** como proveedor real de la Communication Integration Layer
> (FASE 7C). Reutiliza el mismo base compartido que Instagram (`MetaMessagingProvider`)
> porque ambos usan el formato `entry[].messaging`, los mismos endpoints de envío
> y los receipts de lectura/escritura.

## 1. Estado de la integración

**Config-gated.** No hay credenciales reales de Meta en el repositorio. La
integración queda lista para activarse con las credenciales de cada negocio.
Sin conexión activa, el sistema funciona con el proveedor mock (config-gated).

| Pieza | Estado |
|---|---|
| Provider real `MessengerProvider` (Graph API v22.0) | Implementado |
| Conexiones multi-tenant (`ChannelConnection`) | Implementado |
| Webhook (GET verify + POST firmado) | Implementado |
| Ingesta de mensajes/estados al inbox | Implementado |
| Envío saliente desde el inbox | Implementado |
| Media (proxy de URL + fallback SVG) | Implementado |
| UI de configuración (conectar/desconectar/revocar) | Implementado |
| Feature gating Panitas Plus (`facebook_inbox`) | Implementado |
| Pruebas con credenciales reales | Pendiente de configuración |

## 2. Cómo se activa

La integración es multi-tenant: **cada negocio guarda su propia conexión**.

1. En el plan Panitas Negocios Plus, abre **Conversaciones** → botón **Messenger**.
2. Pega los datos de tu Meta App / Página:
   - **Access token** (Page access token de la Página de Facebook con permisos
     `pages_messaging`).
   - **Account id (page id)** — id numérico de la Página, ej. `123456789012345`.
   - Opcionalmente: nombre de la Página, verify token y app secret del webhook.
3. Guarda y conecta. El sistema verifica la salud contra la Graph API.

### Credenciales de la app (fallback global)

Valores por defecto en `.env.local` (usados si una conexión no trae secretos):

```
META_APP_SECRET=...
META_VERIFY_TOKEN=...
META_API_VERSION=v22.0
META_BASE_URL=https://graph.facebook.com
META_TIMEOUT_MS=15000
```

> Los secretos NUNCA salen en respuestas, DTOs ni logs (`sanitizeProviderConfig`).

## 3. Webhook

Meta se suscribe a la URL pública:

```
GET  https://<tu-dominio>/api/webhooks/messenger
     ?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<challenge>
POST https://<tu-dominio>/api/webhooks/messenger
```

- **GET** valida `hub.verify_token` (token global **o** el verify token de la
  conexión) y responde con el challenge.
- **POST** exige firma `x-hub-signature-256` (HMAC-SHA256 con el App Secret de
  la conexión o el global). Con firma inválida o sin negocio resuelto se
  registra `messenger.webhook.*` y se responde 200 (`status: "ignored"`) para
  cortar los reintentos de Meta.
- El negocio se resuelve por el account id (`entry[].id`, page id; guardado en
  `externalRef` de `ChannelConnection`).
- La idempotencia la garantiza el unique `InboxMessage.storeId_externalId`.

### Payload soportado (Meta Messaging)

- `messaging[].message` de texto y adjuntos (la URL del media llega dentro del
  webhook; se guarda con el mensaje y se proxy con el access token).
- `messaging[].delivery` → delivered por cada mid.
- `messaging[].read` → read por watermark de conversación.
- Los eventos `is_echo` del propio negocio se ignoran.

## 4. Arquitectura

```
Meta Graph API
      │  (Graph API v22.0)
      ▼
MetaMessagingProvider (base abstracta) ── src/lib/communication/providers/meta-messaging-provider.ts
      ├─ MessengerProvider  (sendPath: me/messages + messaging_type=RESPONSE, health: me?fields=id,name)
      └─ InstagramProvider  (sendPath: {accountId}/messages, health: {accountId}?fields=...)

  src/lib/meta/ │
  ├─ config.ts               (lee envs de la app)
  ├─ webhook.ts              (handshake GET + extracción del account id)
  ├─ connection-service.ts   (ChannelConnection multi-tenant + eventos + auditoría)
  ├─ communication-service.ts(fachada por tienda+canal: provider REAL si hay conexión, MOCK si no)
  ├─ ingestion-service.ts    (ingesta al inbox: dedup, conversación, cliente, estados)
  ├─ send-service.ts         (envío saliente desde el inbox)
  ├─ webhook-route.ts        (manejador GET/POST compartido instagram|messenger)
  ├─ channel-route.ts        (GET estado / POST connect|disconnect|revoke|health)
  └─ media.ts                (resolución de URL por mediaId + proxy + fallback)
      │
      ▼
Inbox 7A (conversaciones, mensajes, clientes) — sin lógica Messenger
```

- El **Inbox** recibe/emite solo mensajes normalizados (`ProviderInboundEvent`).
- El despacho de envío en `POST /api/inbox/[id]/messages` elige por
  `conversation.channel.type`: `instagram`/`messenger` → `sendMetaAgentMessage`;
  `whatsapp` y otros → `sendAgentMessage`.
- Copiloto IA: solo sugiere respuestas; **nunca envía automáticamente**.

## 5. Multi-tenant y estados

Modelo `ChannelConnection` (`prisma/schema.prisma`):

| Campo | Rol |
|---|---|
| `storeId + channelId` (unique) | una conexión por negocio y canal |
| `channelId @unique` | un `InboxChannel` por tienda |
| `config` (JSON) | accessToken, accountId, verifyToken, appSecret, username |
| `externalRef` | page id → resuelve el negocio en webhooks |
| `status` | pending → connected → disconnected / error / revoked |

- **Desconectar** no borra credenciales ni datos.
- **Revocar** limpia `config` y deja la conexión inactiva.
- Cada mutación emite `messenger.connection.*` y registra auditoría.

## 6. Eventos

Registrados en `src/lib/events/event-registry.ts`:

- `messenger.connection.created|connected|disconnected|error|revoked`
- `messenger.webhook.received|invalid_signature|unresolved`
- `messenger.message.incoming|sent|delivered|read|failed`
- `messenger.conversation.upserted`
- `messenger.media.downloaded`

## 7. Envío de mensajes

`POST /api/inbox/[id]/messages` con `sender: "agent"` en una conversación de
canal `messenger`:

1. Guarda el mensaje (`status: sent`).
2. Resuelve la fachada de comunicación de la tienda+canal.
3. Si hay conexión activa → `MessengerProvider.sendMessage` (envía con
   `messaging_type: RESPONSE` y guarda el `mid` real como `externalId`); si no →
   mock (config-gated).
4. Los webhooks `delivery`/`read` actualizan el estado a delivered/read.

## 8. Media

`GET /api/inbox/channels/messenger/media/[mediaId]` localiza la URL del adjunto
guardada con el mensaje y la proxy con el access token del negocio (nunca
expuesto). Si no se encuentra o la descarga falla, responde un **placeholder SVG
amigable** en vez de un error seco.

## 9. Feature gating

- `facebook_inbox` (Panitas Negocios Plus) protege la UI y la API de conexión.
- `unified_chat` (Panitas Negocios Plus) protege el centro de conversaciones.
- El webhook de ingesta NO se gatea por feature: se configura desde la UI (ya
  gated) y debe poder recibir mensajes de Meta.

## 10. Tests

- `tests/meta/meta.test.ts` — handshake, parser Meta, proveedores (payload de
  envío, firma, errores HTTP, health), DTO (sin secrets), ingesta (dedup +
  estados + read por watermark), media, envío saliente y gating (28 tests).

Verificación:

```
npm run typecheck
npm run test
npm run lint
npm run build
```

## 11. Pendiente (integración externa)

1. Crear la Meta App, añadir el producto Messenger y vincular una Página.
2. Configurar el webhook en Meta hacia `/api/webhooks/messenger`.
3. Conectar desde la UI y verificar salud real.
4. Probar envío/ingesta/media con la Página de prueba.
