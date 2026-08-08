# Arquitectura de Proveedores de Comunicación

> Documento de diseño de la capa de proveedores de la FASE 7C. Describe el
> contrato `CommunicationProvider`, el ciclo de vida de conexión, el envío con
> middlewares, la entrada por webhook/pull y el camino concreto para sustituir
> los mocks por conectores reales (Twilio, Meta Graph API, SMTP, WebChat) **sin
> tocar el Inbox ni el Copiloto**.

## 1. Principios

1. **El Inbox no conoce proveedores.** Todo acceso pasa por el contrato
   `CommunicationProvider` (o la fachada `CommunicationService`).
2. **Desacoplo por contrato, no por implementación.** `MockCommunicationProvider`
   es una implementación de prueba; los reales deben implementar la misma
   interfaz.
3. **Transmisión pura.** La capa no escribe en BD; el estado es en memoria y
   sirve para salud/métricas/UI. La persistencia de conversaciones sigue siendo
   responsabilidad del Inbox (7A).
4. **Seguridad por defecto.** Firmas HMAC, bearer, sanitización y rotación de
   credenciales son parte del contrato de uso, no opcionales.
5. **Envío correcto ≠ conexión.** Un proveedor puede entregar mensajes sin
   requerir `connect`; `requireConnected: true` exige conexión (error 502
   `PROVIDER_NOT_CONNECTED`).

## 2. Contrato `CommunicationProvider`

```ts
interface CommunicationProvider {
  meta: ProviderMeta                                  // { id, name, channel, version }

  connect(config?: Record<string, unknown>): Promise<ProviderConnectionResult>
  disconnect(): Promise<void>

  sendMessage(input: ProviderOutboundInput, options?: ProviderSendOptions): Promise<ProviderSendResult>

  downloadMedia(mediaId: string): Promise<ProviderAttachment>
  uploadMedia(attachment: ProviderAttachment): Promise<ProviderAttachment>

  markAsRead(conversationId: string, messageId: string): Promise<void>
  typing(conversationId: string, typing: boolean): Promise<void>

  health(): Promise<ProviderHealth>
  webhook(payload: ProviderWebhookPayload): Promise<ProviderInboundEvent[]>

  receiveMessages?(limit?: number): Promise<ProviderInboundEvent[]>  // pull
  simulateIncoming?(input: { conversationId: string; text: string; sender?: ProviderSender }): Promise<ProviderInboundEvent>
}
```

### Ciclo de vida de conexión

- `connect(config)` → `ProviderConnectionResult` (`status: "connected"`,
  `connectedAt`, `info` sanitizada). El manager publica `channel.connected`.
- `disconnect()` → publica `channel.disconnected`.
- `health()` → estado + latencia + `lastSyncAt`; el monitor agrega la vista
  total.

### Entrada (inbound)

- **Webhook**: `provider.webhook(payload)` recibe headers + body, verifica la
  firma si el proveedor tiene `webhookSecret`, normaliza a
  `ProviderInboundEvent[]` (formato genérico o Meta `entry[].messaging` vía
  `parseWebhookPayload`) y los acumula en `pendingInbound`.
- **Pull**: `receiveMessages(limit?)` drena `pendingInbound` y actualiza
  `lastSyncAt`.
- **Simulación**: `simulateIncoming(...)` encola un evento marcado
  `metadata.simulated = true` (útil para demos y tests del Inbox).

Todas las vías publican `message.received` y alimentan las métricas
(`received`).

## 3. Pipeline de envío (`ProviderManager`)

```
sendMessage(input)
   │  1. providerIdFromChannel / provider registrado
   ▼
composeSendMiddlewares([validate, normalize, retry, rateLimit, logging])
   │  (la cadena se cachea por providerId)
   ▼
provider.sendMessage(input, { conversationId })
   │  éxito → message.sent + metrics.sent + avgLatencyMs
   │  error  → provider.error (agotado) / provider.retry (por intento)
   ▼
ProviderSendResult
```

- La **cadena se cachea por `providerId`**: no se recomponen middlewares por
  mensaje.
- El **retry** usa backoff exponencial con `shouldRetry` (444 y 4xx no se
  reintentan; 429 sí, respetando el rate limit).
- El **rate limit** aplica 429 por ventana deslizante con clave por canal
  (reemplazable por Redis en producción).
- La **latencia** y los reintentos se registran en `ProviderMetrics`.

## 4. Registro, fábrica y caché

| Componente | Responsabilidad |
|---|---|
| `ProviderRegistry` | Mapa id→provider y channel→providerId; `get` lanza 404 si el canal no tiene proveedor registrado. |
| `MockProviderFactory` | `get(channel)` devuelve (cachea) `mock-${channel}`; soporta overrides `perChannel` para inyectar config por canal. |
| `CommunicationService` | Fachada: `factory.get(channel)` → `registry.register` si falta → delega en el manager. |

## 5. Sustitución de mocks por conectores reales

Para integrar, por ejemplo, **Twilio WhatsApp**:

1. **Implementar el contrato** en `src/lib/communication/providers/twilio-provider.ts`:
   - `meta = { id: "twilio-whatsapp", channel: "whatsapp", ... }`.
   - `sendMessage` → `client.messages.create({ to, from: whatsappNumber, body })`.
   - `webhook` → verificar `X-Twilio-Signature` y mapear el body a
     `ProviderInboundEvent` (reusar `parseWebhookPayload` o un parser propio).
   - `receiveMessages`/`health` según corresponda.
2. **Registrarlo en la fábrica** por canal (overrides o un
   `RealProviderFactory` que lea env vars y devuelva `twilio-whatsapp` para
   `channel === "whatsapp"`).
3. **Secretos por env**: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
   `WHATSAPP_WEBHOOK_SECRET`…; la capa solo recibe config ya cargada.
4. **Configurar rate limit/retry/logging** en `ProviderManagerOptions` (los
   defaults aplican a cualquier proveedor).

El Inbox 7A y el Copiloto 7B no cambian: consumen `CommunicationService` por
canal. Los eventos `communication.*` y las métricas siguen igual.

## 6. Salud, métricas y eventos

- `ProviderHealthMonitor` agrega `health()` por proveedor + `healthSummary()`.
- `MetricsState` (interno al manager) acumula `sent`/`received`/`errors`/
  `retries`/`avgLatencyMs`/`avgResponseMs` desde `since`.
- Los 6 eventos `communication.*` alimentan el listener
  `communication.listener` (estado por proveedor + hook `onEvent` para la UI).

## 7. Garantías de seguridad en proveedores reales

- Toda credencial vive en env vars; `sanitizeProviderConfig` oculta secretos en
  `info`/logs.
- La verificación de firma es **timing-safe** (`safeEqualHex`) y falla cerrado
  (401) ante firma ausente o inválida.
- `rotateCredentials` permite migrar secretos con ventana de gracia.
- Los logs de envío nunca incluyen texto completo ni secretos.
