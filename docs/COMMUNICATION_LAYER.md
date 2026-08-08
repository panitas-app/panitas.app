# Communication Integration Layer (FASE 7C)

> Capa de integración de mensajería del Inbox de Panitas. Desacopla el Centro
> Unificado de Conversaciones (FASE 7A) y el Copiloto (FASE 7B) de los
> proveedores concretos (WhatsApp, Instagram, Messenger, Email, WebChat) a
> través de un contrato `CommunicationProvider` con middlewares de envío,
> seguridad de webhooks, proveedores mock por canal, salud/métricas y eventos de
> dominio `communication.*`. El Inbox **no depende de ningún proveedor real**.

## 1. Visión

Las fases 7A y 7B consumen conversaciones desde la BD (canal `store`). La capa
de comunicación añade el **plano de integración** con canales externos de forma
desacoplada:

- **Modelo de mensaje unificado** `ProviderMessage` (independiente del
  proveedor) listo para mapear a la BD del Inbox.
- **Contrato `CommunicationProvider`**: `connect`, `disconnect`, `sendMessage`,
  `downloadMedia`, `uploadMedia`, `markAsRead`, `typing`, `health`, `webhook`,
  `receiveMessages?`, `simulateIncoming?`.
- **Proveedores mock por canal** (`mock-whatsapp`, `mock-instagram`,
  `mock-messenger`, `mock-webchat`, `mock-email`) sin conexiones reales; punto
  único de sustitución futura por conectores Twilio/Meta/SMTP.
- **Middlewares de envío** encadenables: validación, normalización, retry con
  backoff, rate limit por canal y logging sin secretos.
- **Seguridad**: firmas HMAC con comparación timing-safe, verificación Bearer,
  sanitización de configuración, rotación de credenciales y webhook secret por
  proveedor.
- **Salud y métricas** por proveedor (`ProviderHealth`, `ProviderMetrics`) y
  vista de runtime (`ProviderRuntimeView`) para la UI.
- **Eventos de dominio** `{ domain: "communication" }`:
  `channel.connected`, `channel.disconnected`, `message.received`,
  `message.sent`, `provider.error`, `provider.retry`. Excluidos del historial de
  chat junto con `inbox` y `copilot`.

```
Inbox 7A / Copiloto 7B
        │   (usa solo el contrato CommunicationProvider)
        ▼
┌──────────────────────────────────────────────────────────────┐
│  CommunicationService  (fachada por tienda)                  │
│  ProviderManager  (conexiones + middlewares + webhook/pull)  │
│  ProviderRegistry (registro) · MockProviderFactory (caché)   │
│  ProviderHealthMonitor (salud) · MetricsState (métricas)     │
├──────────────────────────────────────────────────────────────┤
│  Middlewares: validación → normalización → retry → rateLimit │
│               → logging → provider.sendMessage               │
│  Seguridad: createSignature / verifyWebhookSignature /       │
│             sanitizeProviderConfig / rotateCredentials       │
├──────────────────────────────────────────────────────────────┤
│  Providers mock por canal  →  conectores reales (futuro)     │
│  eventos communication.* → listeners + UI del estado         │
└──────────────────────────────────────────────────────────────┘
```

## 2. Módulo (`src/lib/communication/`)

| Archivo | Rol |
|---|---|
| `provider-types.ts` | **Tipos puros (sin Prisma)**: canales (`PROVIDER_CHANNEL_TYPES`), `ProviderChannelMeta` (`PROVIDER_CHANNEL_META` con `defaultProviderId`), estados, `ProviderMessage`, `ProviderSendResult`, `ProviderHealth`, `ProviderMetrics`, `ProviderRuntimeView`, `ProviderInboundEvent` y catálogo de eventos `COMMUNICATION_EVENTS` + `COMMUNICATION_EVENT_DOMAIN`. |
| `interfaces/communication-provider.ts` | Contrato `CommunicationProvider` + `ProviderSendOptions`. |
| `middlewares/` | `middleware-types.ts` (`SendMiddleware` + `composeSendMiddlewares` con `next(input?)` transformador), `validation.ts` (±4096 chars), `normalization.ts` (trim, arrays/objetos garantizados), `retry.ts` (backoff exp + `shouldRetry`: 444/4xx no reintenta), `rate-limit.ts` (429 por ventana deslizante, clave por canal), `logging.ts` (`defaultLog`/`noopLog`, sin secretos ni contenido completo) e `index.ts`. |
| `security.ts` | `createSignature` (HMAC-SHA256), `safeEqualHex` (timing-safe), `verifyWebhookSignature`, `verifyBearerToken`, `sanitizeProviderConfig` (nunca expone secretos), `generateSecret`, `rotateCredentials` (tolera vigente+anterior) y `requireWebhookSecret`. |
| `providers/mock-provider.ts` | `MockCommunicationProvider` con `latencyMs`/`failRate`/`webhookSecret`/`requireConnected` + estado interno (`pendingInbound`, contadores). |
| `providers/webhook-parser.ts` | `parseWebhookPayload`: formato genérico (`conversationId`/`text` en body) + Meta (`entry[].messaging`). |
| `provider-registry.ts` | `ProviderRegistry`: registro/consulta por id y por canal. |
| `provider-factory.ts` | `MockProviderFactory`: caché por canal (`mock-${channel}`) con overrides `perChannel`. |
| `provider-health.ts` | `ProviderHealthMonitor`: salud agregada + resumen. |
| `provider-manager.ts` | `ProviderManager`: conexiones, cadena de middlewares cacheada por provider, webhook/pull/simulate, health, `MetricsState` y publicación de eventos. |
| `communication-service.ts` | `CommunicationService`: fachada por tienda que crea proveedor por canal, lo registra y delega en el manager. |
| `index.ts` | Barrel público de la fase (tipos, middlewares, seguridad, providers, registry, factory, health, manager, service). |

## 3. Modelo de mensaje unificado

```ts
interface ProviderMessage {
  id: string
  channel: "whatsapp" | "instagram" | "messenger" | "webchat" | "email"
  conversationId: string
  sender: "customer" | "agent" | "system"
  recipient: string
  text: string
  attachments: ProviderAttachment[]
  timestamp: string          // ISO
  metadata: Record<string, unknown>
  status: "received" | "delivered" | "read" | "sent" | "failed"
}
```

El Inbox 7A guarda las conversaciones en BD con canal `store`; cuando se
integren canales reales, los eventos `message.received`/`message.sent` de esta
capa serán la fuente que alimente el mapeo a la BD. La capa **no escribe en
BD**: es transporte puro con estado en memoria.

## 4. Middlewares de envío

Cadena ordenada en `ProviderManager.sendMessage`:

1. **Validación** — `text` requerido y ≤ `MAX_TEXT_LENGTH` (4096), `recipient`
   y `conversationId` requeridos, attachments en arreglo.
2. **Normalización** — `trim` del texto, `attachments` y `metadata` garantizados
   como arreglo/objeto (puede transformar el input antes del proveedor vía
   `next(normalized)`).
3. **Retry** — hasta `attempts` con backoff exponencial; `shouldRetry` rechaza
   códigos 444 y 4xx (errores del cliente no se reintentan).
4. **Rate limit** — 429 por ventana deslizante con clave por canal.
5. **Logging** — solo metadatos seguros (canal, proveedor, duración, resultado),
   nunca secretos ni texto completo.
6. **Proveedor** — `provider.sendMessage(input, options)`.

El resultado final es `ProviderSendResult` (proveedor, canal, id externo,
estado, latencia, reintentos). El rate limit por canal se configura en el
manager; en producción se puede persistir (Redis) sin cambiar el contrato.

## 5. Seguridad

- **Webhooks**: firma HMAC-SHA256 (`x-hub-signature-256`) verificada con
  `safeEqualHex` (comparación timing-safe) por proveedor que declare
  `webhookSecret`; falla con 401 `INVALID_WEBHOOK_SIGNATURE`.
- **Bearer**: `verifyBearerToken` para endpoints que lo requieran.
- **Config**: `sanitizeProviderConfig` elimina claves sensibles
  (`apiKey`, `token`, `password`, `webhookSecret`, `secret`, credenciales
  anidadas) antes de exponer la configuración; `clientId`/`displayName` se
  conservan.
- **Rotación**: `rotateCredentials` acepta vigente + anterior para evitar
  ventanas de indisponibilidad.
- **Mock seguro**: no hay conexiones de red reales; los fallos son simulados.

## 6. Eventos de dominio

Registrados en `event-registry.ts` (categoría `conversations`, aggregate
`channel`/`provider`):

| Evento | Cuándo |
|---|---|
| `channel.connected` | `manager.connect` exitoso |
| `channel.disconnected` | `manager.disconnect` |
| `message.received` | webhook válido, pull o `simulateIncoming` |
| `message.sent` | envío exitoso (post-middlewares) |
| `provider.error` | error de conexión o envío agotando reintentos |
| `provider.retry` | cada reintento de envío |

El listener `src/lib/events/event-listeners/communication.listener.ts` mantiene
estado por proveedor (conectado/desconectado, contadores
sent/received/errors/retries) y acepta el hook `onEvent` para la UI. El
historial de chat excluye `domain === "communication"` (igual que `inbox` y
`copilot`).

## 7. Salud y métricas

- `health()` → `ProviderHealth[]` (estado, `connected`, `latencyMs`,
  `lastSyncAt`, `checkedAt`).
- `healthSummary()` → resumen agregado (conectados/desconectados/total).
- `metrics(providerId?)` → `ProviderMetrics[]` (`sent`, `received`, `errors`,
  `retries`, `avgLatencyMs`, `avgResponseMs`, `since`).
- `list()` → `ProviderRuntimeView[]` para la UI del estado de canales.

## 8. Extensión a proveedores reales

Ver `PROVIDER_ARCHITECTURE.md`. Resumen: implementar el contrato
`CommunicationProvider` (por ej. `TwilioProvider` implementando la misma
interfaz), sustituirlo en `provider-factory` por canal y configurar secretos vía
variables de entorno. El resto de la capa no cambia.

## 9. Pruebas

60 tests en `tests/communication/` (9 archivos): tipos/constantes,
middlewares (validación, normalización, retry 444/4xx, rate limit, logging,
composición), seguridad (firma, timing-safe, bearer, sanitización, rotación,
`requireWebhookSecret`), registro, fábrica (caché/overrides), salud,
manager (conexión, eventos, webhooks, retry, rate limit, media, envío sin
conexión) y servicio (fachada por canal, proveedores por defecto, webhook+pull).
