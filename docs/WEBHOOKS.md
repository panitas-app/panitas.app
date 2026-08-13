# Webhooks salientes — Referencia

*FASE 8D — Eventos en tiempo real hacia tu servidor, firmados y entregados
desde el bus de Business Events de Panitas.*

## Concepto

Los webhooks reutilizan los **Business Events** existentes de Panitas (no existe
un segundo sistema de eventos). Cuando ocurre algo relevante
(`order.created`, `credit.payment_registered`, `attention.item.created`, ...),
el `WebhookDispatcher` entrega un `POST` firmado a cada suscripción que lo
escucha.

- Catálogo completo: `GET /api/v1/events` o [`EVENT_CATALOG.md`](EVENT_CATALOG.md).
- Gestión: **Configuración → Integraciones → Webhooks** (solo admin/manager).

## Crear una suscripción

Se define:

- **Nombre** identificador.
- **Endpoint**: URL `http(s)://...` que recibe el `POST`. Se valida **SSRF**:
  sin localhost, IPs privadas, metadata, `.local`/`.internal`/`.lan`.
- **Eventos**: lista de `event.type` a suscribir.
- **Secreto**: cadena aleatoria generada por Panitas, mostrada **una vez** al
  crear. Sirve para verificar la firma del lado del receptor.

## Formato del payload

```
POST <endpoint>
Content-Type: application/json
User-Agent: Panitas-Webhook/1.0
X-Panitas-Signature: t=<timestamp>,v1=<hmac-sha256 hex>
X-Panitas-Event-Id: evt_...
X-Panitas-Delivery-Id: del_...
```

```json
{
  "eventId": "evt_...",
  "type": "order.created",
  "tenantId": "store_...",
  "aggregateId": "order_...",
  "aggregateType": "Order",
  "actorId": null,
  "occurredAt": "2026-08-10T12:00:00.000Z",
  "data": { "orderId": "order_...", "total": 25000, "status": "pending" },
  "timestamp": 1730000000000
}
```

- `tenantId` identifica la tienda propietaria del evento.
- `data` es el payload específico del tipo de evento.
- `timestamp` es el momento del envío (generado al construir el payload).

## Verificar la firma (receptor)

La firma es **HMAC-SHA256** del string `<timestamp>.<cuerpo-JSON-exacto>` con el
secreto de la suscripción.

```
X-Panitas-Signature: t=1730000000000,v1=<hex>
expected = HMAC_SHA256(secreto, "1730000000000.<payload>")
```

Recomendaciones:

1. Rechazar si falta `t` o `v1`.
2. Rechazar si `|ahora - t| > 5 min` (anti-replay).
3. Comparar el HMAC con `timingSafeEqual`.
4. Responder `2xx` lo antes posible; procesar en segundo plano.

Al responder con error (o no responder a tiempo), Panitas reintenta (ver abajo).
Responder `2xx` confirma la recepción; no es necesario re-enviar confirmaciones.

## Entrega y reintentos

- **Timeout** de entrega: 10 s.
- **Reintentos**: máximo **5 intentos** con backoff
  `0s → 10s → 30s → 2min → 10min`.
- Se reintenta en fallos de red/timeout y `5xx`/`429`.
- **No** se reintenta `4xx` (el receptor rechazó el evento; no recuperable).
- Cada intento re-valida SSRF del endpoint.
- La entrega **nunca bloquea** el request principal (fire-and-forget + timers).

## Deduplicación

Cada evento se encola **una única vez por suscripción** (índice
`[subscriptionId, eventId]`). Re-envíos del mismo evento no crean entregas
duplicadas. El receptor igualmente debe ser idempotente usando `eventId`.

## Dead-letter y reintento manual

- Tras **10 fallos consecutivos**, la suscripción pasa a `dead_letter` y deja de
  recibir eventos (se evita el spam de reintentos).
- Todas las entregas quedan registradas: `status`
  (`pending|success|failed|dead`), `attempts`, `responseStatus`, `responseBody`,
  `error`, `latencyMs`, `nextRetryAt`.
- En la UI de Integraciones (o vía `POST /api/integrations/webhooks/deliveries/{id}/retry`)
  se puede **reintentar manualmente** una entrega en dead-letter: la reactiva
  (estado `active`, `failureCount=0`) y re-encola el evento.

## Estado de una suscripción

| Estado | Significado |
|---|---|
| `active` | Recibe eventos |
| `paused` | Pausada por el admin; no recibe eventos |
| `dead_letter` | Desactivada por fallos repetidos; requiere reintento manual |
| `revoked` | Eliminada |

## Endpoints internos (admin/manager)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/integrations/webhooks` | Lista suscripciones |
| POST | `/api/integrations/webhooks` | Crea (devuelve secreto una vez) |
| GET/PATCH | `/api/integrations/webhooks/{id}` | Ver/editar |
| DELETE | `/api/integrations/webhooks/{id}` | Revoca |
| GET | `/api/integrations/webhooks/{id}/deliveries` | Historial de entregas |
| POST | `/api/integrations/webhooks/deliveries/{deliveryId}/retry` | Reintento manual |

## Ejemplo de verificación (Node.js)

```ts
import { createHmac, timingSafeEqual } from "node:crypto"

function verificarFirma(rawBody: string, header: string, secreto: string): boolean {
  const parts = new Map(
    header.split(",").map((p) => {
      const i = p.indexOf("=")
      return [p.slice(0, i), p.slice(i + 1)]
    })
  )
  const t = Number(parts.get("t"))
  const v1 = parts.get("v1")
  if (!Number.isFinite(t) || !v1) return false
  if (Math.abs(Date.now() - t) > 5 * 60 * 1000) return false
  const expected = createHmac("sha256", secreto).update(`${t}.${rawBody}`).digest("hex")
  const a = Buffer.from(v1)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}
```

> El payload firmado es el **cuerpo crudo exacto** que llega (`rawBody`), no un
> re-serializado.

## Nota sobre webhooks entrantes

Panitas también recibe webhooks **entrantes** de canales (Instagram, Messenger,
WhatsApp) en `/api/webhooks/*`. Esos son inbound de integraciones; los de esta
referencia son **outbound** de la plataforma hacia tu servidor.
