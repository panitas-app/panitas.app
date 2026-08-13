# Public API v1 — Referencia

*FASE 8D — Acceso programático a los datos de tu negocio.*

La Public API permite leer y escribir datos de Panitas (productos, clientes,
pedidos, inventario, créditos, proveedores, conversaciones, eventos y atención)
mediante una API REST autenticada con API keys. También es la puerta de entrada
a los webhooks salientes.

## Índice

- [Requisitos](#requisitos)
- [Autenticación](#autenticación)
- [Permisos](#permisos)
- [Formato de respuesta](#formato-de-respuesta)
- [Errores](#errores)
- [Rate limiting](#rate-limiting)
- [Paginación](#paginación)
- [Ordenamiento](#ordenamiento)
- [Idempotencia](#idempotencia)
- [Request ID](#request-id)
- [Recursos](#recursos)
- [Limits y sort por recurso](#limits-y-sort-por-recurso)

## Requisitos

- Plan **Panitas Negocios Plus** (feature `public_api`).
- Crear una API key en **Configuración → Integraciones → API Keys**.
- La key se muestra **una sola vez** al crearla. Guarda el valor
  (`pk_live_...`); no se puede recuperar después.

## Autenticación

Enviar la key como bearer token:

```
GET /api/v1/products
Authorization: Bearer pk_live_xxxxxxxxxxxxxxxxxxxxxxxx
```

La tenant se deriva **siempre** de la key. Cualquier `storeId`/`id` que envíes
es ignorado a la hora de seleccionar datos: todas las consultas se filtran por
la tienda dueña de la key.

## Permisos

Cada key declara un array de permisos `{recurso}:{read|write}`. Sin el permiso
del endpoint, la petición devuelve `403 INSUFFICIENT_PERMISSION`.

| Recurso | Lectura | Escritura |
|---|---|---|
| products | `products:read` | `products:write` |
| customers | `customers:read` | `customers:write` |
| orders | `orders:read` | `orders:write` |
| inventory | `inventory:read` | `inventory:write` |
| credits | `credits:read` | `credits:write` |
| suppliers | `suppliers:read` | `suppliers:write` |
| conversations | `conversations:read` | — |
| events | `events:read` | — |
| attention | `attention:read` | `attention:write` |

## Formato de respuesta

Éxito:

```json
{
  "data": [ ... ],
  "meta": { "requestId": "req_...", "pagination": { "limit": 20, "hasMore": true, "nextCursor": "Mg" } }
}
```

Error:

```json
{
  "error": { "code": "INVALID_API_KEY", "message": "API key inválida", "requestId": "req_..." }
}
```

Los mensajes de error nunca exponen stack traces, SQL, estructura interna ni
secrets.

## Errores

| Código | HTTP | Cuándo |
|---|---|---|
| `INVALID_API_KEY` | 401 | Token ausente, malformado o inválido |
| `API_KEY_REVOKED` | 401 | La key fue revocada |
| `API_KEY_EXPIRED` | 401 | La key expiró |
| `INSUFFICIENT_PERMISSION` | 403 | La key no tiene el permiso requerido |
| `PLAN_REQUIRED` | 403 | El plan no incluye la API pública |
| `FEATURE_NOT_ENABLED` | 403 | El plan no incluye el recurso (p.ej. `attention`) |
| `RESOURCE_NOT_FOUND` | 404 | Recurso no existe en esta tienda |
| `INVALID_REQUEST` | 422 | Parámetros o cuerpo inválidos |
| `DUPLICATE_REQUEST` | 409 | Conflicto detectado por el servicio |
| `RATE_LIMITED` | 429 | Límite de solicitudes superado |
| `INTERNAL_ERROR` | 500 | Error interno de Panitas |

## Rate limiting

- **120 solicitudes/min por API key** y **600 solicitudes/min por tienda**
  (ventana deslizante de 1 minuto).
- Al superarse, `429 RATE_LIMITED` con los headers `X-RateLimit-*` y
  `Retry-After`.

## Paginación

Todas las colecciones soportan:

```
GET /api/v1/products?limit=50&cursor=<opaco>
```

- `limit`: entero 1–100 (default 20, máx 100).
- `cursor`: valor opaco devuelto en `meta.pagination.nextCursor`. Omitir =
  primera página.

Meta de paginación: `{ "limit", "hasMore", "nextCursor" }`.

## Ordenamiento

```
GET /api/v1/orders?sort=-createdAt
```

- `sort=createdAt` → ascendente; `sort=-createdAt` → descendente.
- Solo se aceptan campos de una whitelist por recurso (ver tabla abajo).
- Cualquier otro valor → `422 INVALID_REQUEST`.

## Idempotencia

Las operaciones de escritura sensibles (creación de pedidos, pagos de créditos,
compras a proveedores, ajustes de inventario, etc.) aceptan la cabecera:

```
POST /api/v1/orders
Idempotency-Key: mi-clave-unica-001
```

- La key debe ser `[A-Za-z0-9_-]` de **8 a 128** caracteres.
- Dentro de la ventana de **24 h**, repetir el mismo `(tienda, key)` devuelve
  la respuesta almacenada **sin volver a ejecutar** la operación, con la
  cabecera `X-Idempotent-Replay: true`.
- Evita pedidos/pagos duplicados ante reintentos del cliente.

## Request ID

- Cada respuesta incluye el `requestId` en `meta` (y en el cuerpo de error).
- Puedes propagar el tuyo con `X-Request-Id: <8-64 [A-Za-z0-9_-]>`; si no, Panitas
  genera uno (`req_...`).

## Recursos

### Products

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/api/v1/products` | `products:read` |
| POST | `/api/v1/products` | `products:write` (idempotente) |
| GET | `/api/v1/products/{id}` | `products:read` |
| PATCH | `/api/v1/products/{id}` | `products:write` (idempotente) |

`GET /products` filtros: `search`, `isActive`, `categoryId`, `sort`.

### Customers

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/api/v1/customers` | `customers:read` |
| POST | `/api/v1/customers` | `customers:write` (idempotente) |
| GET | `/api/v1/customers/{id}` | `customers:read` |

`GET /customers` filtros: `search`, `phone`, `email`, `documentId`, `isActive`,
`sort`. `POST` requiere `phone` (422 si falta) y usa `findOrCreateByPhone`.

### Orders

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/api/v1/orders` | `orders:read` |
| POST | `/api/v1/orders` | `orders:write` (idempotente) |
| GET | `/api/v1/orders/{id}` | `orders:read` (incluye `items`) |

`GET /orders` filtros: `status` (pending|confirmed|preparing|shipped|delivered|cancelled),
`paymentStatus` (pending|paid|failed|refunded), `search`, `sort`.

> Seguridad de precios: al crear un pedido, Panitas toma el **precio real de la
> BD**, ignora cualquier precio enviado por el cliente.

### Inventory

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/api/v1/inventory` | `inventory:read` |
| GET | `/api/v1/inventory/{id}` | `inventory:read` |
| PATCH | `/api/v1/inventory/{id}` | `inventory:write` (idempotente) |

`GET /inventory` filtros: `lowStock`, `threshold`, `isActive`.
`PATCH /inventory/{id}` tipos: `increase` | `decrease` | `adjustment` con
`quantity` positivo. Usa `InventoryService.applyMovement`.

### Credits

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/api/v1/credits` | `credits:read` |
| GET | `/api/v1/credits/{orderId}` | `credits:read` |
| POST | `/api/v1/credits/{orderId}/payments` | `credits:write` (idempotente) |

`GET /credits` `status`: all|active|completed|cancelled|overdue|on_time|upcoming.
El pago acepta `amount` (obligatorio), `method`, `paidAt`, `reference`, `notes`,
`paymentAccountId`.

### Suppliers

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/api/v1/suppliers` | `suppliers:read` |
| POST | `/api/v1/suppliers` | `suppliers:write` (idempotente) |
| GET | `/api/v1/suppliers/{id}` | `suppliers:read` |
| PATCH | `/api/v1/suppliers/{id}` | `suppliers:write` (idempotente) |
| POST | `/api/v1/suppliers/{id}/purchases` | `suppliers:write` (idempotente) |
| POST | `/api/v1/suppliers/{id}/payments` | `suppliers:write` (idempotente) |

Una compra requiere `description` y `amount` positivo; un pago requiere `amount`
positivo y fechas opcionales.

### Conversations

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/api/v1/conversations` | `conversations:read` |
| GET | `/api/v1/conversations/{id}` | `conversations:read` |

`GET /conversations` filtros: `status` (nueva|pendiente|en_atencion|resuelta|archivada),
`channelId`, `search` (título/nombre/teléfono), `sort`
(`lastMessageAt`|`createdAt`|`updatedAt`).

### Events

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/api/v1/events` | `events:read` |

Devuelve el catálogo de Business Events suscribibles (`type`, `category`,
`description`). Filtro opcional `?category=`. Úsalo para configurar webhooks.

### Attention

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/api/v1/attention` | `attention:read` |
| GET | `/api/v1/attention/{id}` | `attention:read` |
| POST | `/api/v1/attention/{id}/acknowledge` | `attention:write` (idempotente) |
| POST | `/api/v1/attention/{id}/resolve` | `attention:write` (idempotente) |
| POST | `/api/v1/attention/{id}/dismiss` | `attention:write` (idempotente) |
| POST | `/api/v1/attention/{id}/snooze` | `attention:write` (idempotente) |

`GET /attention` `status`: new|acknowledged|snoozed|resolved|dismissed|open|active
(máx 200 ítems). `snooze` requiere `until` (fecha ISO futura).

## Ejemplo completo

```
curl -s https://<tu-dominio>/api/v1/orders \
  -H "Authorization: Bearer pk_live_xxx" \
  -H "X-Request-Id: rq-abc-123"

curl -s -X POST https://<tu-dominio>/api/v1/orders \
  -H "Authorization: Bearer pk_live_xxx" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: pedido-once-0001" \
  -d '{ "items": [{ "productId": "p_1", "quantity": 2 }], "customerPhone": "+573001112233" }'
```

## Documentación relacionada

- [API Security](API_SECURITY.md) — modelo de seguridad de la plataforma.
- [Webhooks](WEBHOOKS.md) — eventos en tiempo real hacia tu servidor.
- [Extensiones](EXTENSIONS.md) — registro de integraciones de terceros.
- [Catálogo de eventos](../docs/EVENT_CATALOG.md) — Business Events.
