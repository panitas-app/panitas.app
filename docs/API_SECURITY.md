# API Security — Modelo de seguridad de la Plataforma Pública

*FASE 8D — API Keys, aislamiento multi-tenant, SSRF, rate limiting y auditoría.*

## Principios

1. **El tenant se deriva SIEMPRE de la API key.** Nunca se confía en IDs enviados
   por el cliente para seleccionar datos.
2. **El secreto nunca se guarda ni se vuelve a mostrar.** Solo se persiste un hash.
3. **Todo lo que pueda apuntar a la red interna se valida** (SSRF).
4. **Los errores públicos no filtran internals.**
5. **Las operaciones sensibles son idempotentes** por diseño.

## API Keys

Ciclo de vida gestionado en **Configuración → Integraciones → API Keys**
(solo admin/manager).

### Generación

- Secreto: `pk_live_` + 32 bytes aleatorios base64url (≈40 caracteres).
- Solo se persiste `hashedSecret` (**SHA-256 hex**) y `keyPrefix`
  (primeros 12 caracteres del secreto).

### Validación en cada request

1. Extraer `Authorization: Bearer <secreto>`.
2. Lookup por `keyPrefix` (no sensible) → candidatas.
3. Comparación de hash con `timingSafeEqual` (constante en tiempo).
4. Verificar estado `active` (no revocada) y `expiresAt` (no vencida).
5. Derivar tenant del `storeId` de la key y verificar feature `public_api`
   (plan Plus).

### Rotación y revocación

- `POST /api/integrations/api-keys/{id}/rotate` → genera un secreto nuevo
  (se muestra una vez); invalida el anterior al instante.
- `DELETE /api/integrations/api-keys/{id}` → revoca (`status=revoked`,
  `revokedAt`). Las keys revocadas devuelven `401 API_KEY_REVOKED`.

### Buenas prácticas

- No exponer `pk_live_...` en frontends, logs, repos ni páginas.
- Crear una key por integración con **el mínimo de permisos** necesarios.
- Usar `expiresAt` para integraciones temporales.
- Rotar ante cualquier sospecha de fuga.

## Aislamiento multi-tenant

- Todas las consultas de recursos filtran por `ctx.storeId` (derivado de la key).
- Los `id` de la URL se usan solo como identificador del registro, siempre junto
  al filtro `storeId` (`findFirst({ where: { id, storeId } })`).
- Una key de la tienda A no puede leer/escribir datos de la tienda B aunque
  conozca sus IDs → `404 RESOURCE_NOT_FOUND`.

## Rate limiting

- `120 req/min` por API key y `600 req/min` por tienda (ventana de 1 minuto),
  sobre la infraestructura `src/lib/rate-limit.ts`.
- Respuesta `429 RATE_LIMITED` con `X-RateLimit-*` y `Retry-After`.
- Se aplica **antes** de la autorización por permiso (no regala trabajo de
  verificación) y después de la autenticación (para no cachear por IP compartida).

## SSRF (Webhooks)

Los endpoints de webhook son URLs provistas por usuarios. Panitas valida en
cada intento de entrega (`assertSafeEndpoint`):

- Protocolo **http/https** únicamente.
- Sin credenciales en la URL (`user:pass@`).
- **Bloqueo** de `localhost`, `.localhost`, `.local`, `.internal`, `.lan`.
- Bloqueo de rangos privados/reservados IPv4 (RFC1918, loopback, link-local
  incluido `169.254.169.254`, CGNAT, multicast, documentación, etc.) e IPv6
  (loopback, link-local, ULA, multicast, IPv4-mapeada).
- Resolución DNS y verificación de **todas** las direcciones (una privada
  invalida el endpoint); caché de 60 s.

## Idempotencia

- Cabecera `Idempotency-Key` (`[A-Za-z0-9_-]`, 8–128) en escrituras sensibles.
- Ventana de 24 h; reutilización devuelve la respuesta original con
  `X-Idempotent-Replay: true`.
- Evita duplicados ante reintentos o dobles envíos del cliente.

## Errores públicos

Contrato: `{ "error": { "code", "message", "requestId" } }`. Nunca se exponen
stack traces, SQL, estructura de la BD, secrets ni mensajes internos de
servicios. Cualquier error no clasificado se reporta como
`500 INTERNAL_ERROR "Error interno de Panitas"`.

## Auditoría

Cada request público autenticado registra una entrada de auditoría
(`public_api.request`) con requestId, método, ruta, status y latencia — **sin**
headers ni secrets. Las operaciones de administración de integraciones se
auditan igualmente sin exponer secretos.

## Resumen por capa

| Capa | Protege contra |
|---|---|
| Bearer + hash + `timingSafeEqual` | suplantación, fuga de secretos |
| `keyPrefix` lookup | enumeración de secretos |
| Estado + expiración | keys revocadas/vencidas |
| Feature gating | uso fuera de plan |
| Permisos por key | abuso de privilegios |
| Tenant derivado de key | acceso entre tiendas |
| Rate limit | abuso/DoS |
| SSRF | request a la red interna |
| Idempotencia | duplicados en escrituras |
| Errores públicos | fuga de internals |
| Auditoría | trazabilidad |

## Verificación

- `npx vitest run tests/platform` — 81 tests de plataforma (auth, permisos,
  SSRF, firma, entrega, dispatcher, idempotencia, paginación, API keys).
