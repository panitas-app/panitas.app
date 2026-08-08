# Integración de WhatsApp Cloud API (FASE 8A)

> Guía técnica de la integración de **WhatsApp Business (Meta Cloud API)** como
> primer proveedor real de la Communication Integration Layer (FASE 7C). La
> integración respeta la arquitectura multi-canal: todo pasa por la capa de
> comunicación y el Inbox no conoce lógica específica de WhatsApp.

## 1. Estado de la integración

**Config-gated.** No hay credenciales reales de Meta en el repositorio. La
integración queda lista para activarse con las credenciales de cada negocio.
Sin conexión activa, el sistema funciona con el proveedor mock y muestra
"Integración externa pendiente de configuración" en la UI y en la doc.

| Pieza | Estado |
|---|---|
| Provider real `WhatsAppProvider` (Graph API v22.0) | Implementado |
| Conexiones multi-tenant (`ChannelConnection`) | Implementado |
| Webhook (GET verify + POST firmado) | Implementado |
| Ingesta de mensajes/estados al inbox | Implementado |
| Envío saliente desde el inbox | Implementado |
| Media (descarga segura + fallback) | Implementado |
| UI de configuración (conectar/desconectar/revocar) | Implementado |
| Feature gating Panitas Plus | Implementado |
| Pruebas con credenciales reales | Pendiente de configuración |

## 2. Cómo se activa

La integración es multi-tenant: **cada negocio guarda su propia conexión**.

1. En el plan Panitas Negocios Plus, abre **Conversaciones** → botón **WhatsApp**.
2. Pega los datos de tu Meta App / WABA:
   - **Access token** (token de la Meta App con permisos `whatsapp_business_messaging`).
   - **Phone number id** (número de la WABA, ej. `101234567890123`).
   - Opcionalmente: WABA id, verify token y app secret del webhook.
3. Guarda y conecta. El sistema verifica la salud contra la Graph API.

### Credenciales de la app (fallback global)

También puedes definir valores por defecto en `.env.local` (usados si una
conexión no trae sus propios secretos):

```
WHATSAPP_APP_SECRET=...
WHATSAPP_VERIFY_TOKEN=...
WHATSAPP_DEFAULT_ACCESS_TOKEN=...
WHATSAPP_DEFAULT_PHONE_NUMBER_ID=...
WHATSAPP_API_VERSION=v22.0
WHATSAPP_BASE_URL=https://graph.facebook.com
WHATSAPP_TIMEOUT_MS=15000
```

> Los secretos NUNCA salen en respuestas, DTOs ni logs (`sanitizeProviderConfig`).

## 3. Webhook

Meta se suscribe a la URL pública:

```
GET  https://<tu-dominio>/api/webhooks/whatsapp
     ?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<challenge>
POST https://<tu-dominio>/api/webhooks/whatsapp
```

- **GET** valida `hub.verify_token` (token global **o** el verify token de la
  conexión) y responde con el challenge.
- **POST** exige firma `x-hub-signature-256` (HMAC-SHA256 con el App Secret de
  la conexión o el global). Con firma inválida o sin negocio resuelto se
  registra el evento `whatsapp.webhook.*` y se responde 200 para cortar
  reintentos.
- El negocio se resuelve por `phone_number_id` (guardado en `externalRef` de
  `ChannelConnection`).
- La idempotencia la garantiza el unique `InboxMessage.storeId_externalId`.

### Payload soportado (WhatsApp Cloud API)

- `messages[]` de texto y media (image, audio, video, document, sticker).
- `statuses[]` → delivered / read / failed sobre mensajes enviados.

## 4. Arquitectura

```
Meta Graph API
      │  (Graph API v22.0)
      ▼
WhatsAppProvider  ──┐  src/lib/communication/providers/whatsapp-provider.ts
                    │
  src/lib/whatsapp/ │
  ├─ config.ts               (lee envs de la app)
  ├─ connection-service.ts   (ChannelConnection multi-tenant + eventos + auditoría)
  ├─ communication-service.ts(fachada por tienda: provider REAL si hay conexión, MOCK si no)
  ├─ ingestion-service.ts    (ingesta al inbox: dedup, conversación, cliente, estados)
  ├─ send-service.ts         (envío saliente desde el inbox)
  └─ webhook.ts              (handshake GET + extracción de phone_number_id)
      │
      ▼
Inbox 7A (conversaciones, mensajes, clientes) — sin lógica WhatsApp
```

- El **Inbox** recibe/emite solo mensajes normalizados (`ProviderInboundEvent`).
- **Ningún `if (channel === "whatsapp")`** repartido por la app: el envío pasa
  por el punto único `sendAgentMessage` y el webhook por la ruta dedicada.
- Copiloto IA: solo sugiere respuestas; **nunca envía automáticamente**.

## 5. Multi-tenant y estados

Modelo `ChannelConnection` (`prisma/schema.prisma`):

| Campo | Rol |
|---|---|
| `storeId + channelId` (unique) | una conexión por negocio y canal |
| `channelId @unique` | un `InboxChannel` "whatsapp" por tienda |
| `config` (JSON) | accessToken, phoneNumberId, wabaId, verifyToken, appSecret |
| `externalRef` | `phoneNumberId` → resuelve el negocio en webhooks |
| `status` | pending → connected → disconnected / error / revoked |

- **Desconectar** no borra credenciales ni datos.
- **Revocar** limpia `config` y deja la conexión inactiva.
- Cada mutación emite `whatsapp.connection.*` y registra auditoría.

## 6. Eventos

Registrados en `src/lib/events/event-registry.ts`:

- `whatsapp.connection.created|connected|disconnected|error|revoked`
- `whatsapp.webhook.received|invalid_signature|unresolved`
- `whatsapp.message.incoming|sent|delivered|read|failed`
- `whatsapp.conversation.upserted`

## 7. Envío de mensajes

`POST /api/inbox/[id]/messages` con `sender: "agent"` en una conversación de
canal `whatsapp`:

1. Guarda el mensaje (`status: sent`).
2. Resuelve la fachada de comunicación de la tienda.
3. Si hay conexión activa → `WhatsAppProvider.sendMessage` (guarda el `wamid`
   real como `externalId`); si no → mock (config-gated).
4. Los webhooks de `statuses[]` actualizan el estado a delivered/read/failed.

## 8. Media

`GET /api/inbox/channels/whatsapp/media/[mediaId]` descarga el media desde la
Graph API con el access token del negocio (nunca expuesto). Si la conexión no
está activa o la descarga falla, responde un **placeholder SVG amigable** en vez
de un error seco.

## 9. Feature gating

- `whatsapp_inbox` (Panitas Negocios Plus) protege la UI y la API de conexión.
- `unified_chat` (Panitas Negocios Plus) protege el centro de conversaciones.
- El webhook de ingesta NO se gatea por feature: se configura desde la UI (ya
  gated) y debe poder recibir mensajes de Meta.

## 10. Tests

- `tests/communication/` — capa de comunicación (60 tests).
- `tests/whatsapp/whatsapp.test.ts` — handshake, parser, firma, DTO (sin
  secrets), ingesta (dedup + estados) y gating (18 tests).

Verificación:

```
npm run typecheck
npm run test
npm run lint
npm run build
```

## 11. Pendiente (integración externa)

1. Crear la Meta App + WABA y conectar un número de prueba.
2. Configurar el webhook en Meta hacia `/api/webhooks/whatsapp`.
3. Conectar desde la UI y verificar salud real.
4. Probar envío/ingesta/media con número de prueba (WhatsApp Business).
