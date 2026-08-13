# Reporte FASE 8C — Smart Notifications & Attention Center

*Estado: implementación completa (motor + API + UI + integraciones + tests).*

## Resumen

Se construyó el **Centro de Atención**: un sistema que convierte los datos
reales del negocio en **situaciones que requieren acción** (no eventos),
deduplicadas, priorizadas y agrupadas. El motor es 100% determinista: los
items se generan por reglas sobre datos reales, los eventos de negocio solo
disparan un re-sync throttled, y la IA solo lee/explícita — jamás inventa ni
muta alertas.

## Decisiones de diseño

| Decisión | Opción tomada |
|---|---|
| Qué es un item | Situación que requiere acción (agotado, cuota vencida, canal caído). Un evento NO crea alerta |
| Modelo | `AttentionItem` propio en Prisma (no reutiliza `Insight` del BI: otro propósito) |
| Cómo se crean | Solo detectors puros sobre datos reales; el bus de eventos dispara re-sync (throttle 30 s/tienda) |
| Dedupe | `dedupeKey = ${type}:${entityId}` persistente; `resolved` libera la key, `dismissed` respeta la decisión |
| Resolución automática | Solo cuando la situación desaparece de los datos (seguro), nunca por opinión |
| Prioridades | Escala única `critical/high/medium/low`; `critical` solo para acción inmediata (canal caído) |
| Agrupación | Por tipo en la UI ("5 productos por agotarse"), con expandir |
| Deep links | Catálogo `rules.ts`; aplicados automáticamente si el detector no define uno |
| Notificaciones externas | Interfaz preparada (`ExternalAttentionChannel`), **cero envíos automáticos en v1** (noop) |
| Preferencias | Por negocio: tipos habilitados + prioridad mínima + quiet hours (22:00–08:00) |
| Multi-tenant | Todas las consultas/acciones filtran por `storeId`; roles read/write como el resto del sistema |
| Feature gating | `attention_center` (Panitas Negocios Plus) con `FeatureLockScreen` |

## Lo implementado

### Motor (`src/lib/attention/`)
- `types.ts` — estados, prioridades, 12 tipos, `Situation`, DTO, grupos, overview, helpers.
- `config.ts` — umbrales deterministas (stock bajo 5, sin movimiento 30 días, cuota por vencer 3 días, pedido retrasado 48 h, enviado 5 días, pendiente 24 h, gracia conversación 15 min, urgente 48 h).
- `rules.ts` — catálogo de reglas (label, plural, grupo, prioridad, triggers de eventos, factory de deep link).
- `detectors/` — puros: inventory, credits, suppliers, orders, conversations, channels.
- `queries.ts` — `AttentionDataPort` (única capa Prisma que alimenta los detectors).
- `preferences.ts` — `AttentionPreferencesService` con defaults y guardas.
- `notifier.ts` — `FilteredAttentionNotifier` + `NoopExternalAttentionChannel` + `isWithinQuietHours`.
- `service.ts` — `AttentionService`: sync, dedupe, reconciliación, list/group/overview, acciones, preferencias, eventos.
- `engine.ts` — triggers, listener del bus (throttled), `syncIfStale` (throttle 10 s para la API).
- `app.ts` — singleton con notificador noop y sink de eventos → `fireDomainEvent`.

### Persistencia
- Prisma: `AttentionItem` (con `dedupeKey`, índices compuestos) y
  `AttentionSettings` (unique por store). Relaciones en `Store`. `prisma generate` OK (no se corrió `db push`).

### Integración
- Eventos: 5 nuevos `attention.item.*` en `event-registry.ts`; listener registrado en `event-listeners`.
- Features: `attention_center` en `PLUS_FEATURES` y `FeatureKey`.
- Agente: `attention.summary` y `attention.getPending` (solo lectura, `report.read`).

### API
- `GET /api/attention?grouped=true&status=...` → grupos o items + overview (re-sync si stale).
- `PATCH /api/attention { action, itemId, snoozeUntil? }` → acknowledge/resolve/dismiss/snooze (admin/manager).
- `GET /api/attention/overview` → conteos para badge y monitor.
- `GET|PUT /api/attention/settings` → preferencias (PUT admin/manager).

### UI
- Página `/dashboard/atencion` (server) con gating de feature.
- `AttentionCenter` (client): tabs pendientes/importantes/pospuestas/resueltas,
  grupos expandibles, acciones, dialogs de snooze (1 h / mañana / semana) y
  confirmación de dismiss, deep links.
- `AttentionSettingsDialog`: tipos por dominio, prioridad mínima, quiet hours.
- Sidebar: item con `plusBadge` y badge del conteo abierto (polling 60 s).
- `AttentionMonitorCard` en el área Monitor del BIC (solo si hay abiertos).

## Verificación

- `npm run typecheck` — ✅ verde.
- `npm run lint` — ✅ 0 errores.
- `npx vitest run` — ✅ **1324 tests** (57 nuevos en `tests/attention/`).
- Tests nuevos: detectors, service (dedupe/resolución/reapertura/snooze/dismiss),
  tenant isolation, preferencias, quiet hours, listener throttled, tools y los
  8 escenarios del spec (agotado→item; stock normal→sin alerta; cuota
  vencida→item; pago→resolved; 5 productos→1 grupo; 3 mensajes→1 item;
  conversación respondida→resolved; snooze→oculto hasta fecha).
- Se actualizaron 2 tests pre-existentes por cambios intencionales:
  `feature-access` (catálogo Plus ahora 15 features) y `domain-tools` (capa de
  servicio `@/lib/attention` permitida).

## Pendientes / siguientes

- `prisma db push` (o migrate) en `develop-v2` para crear las tablas (NO se
  ejecutó por política de protección de la BD).
- Canales externos reales (email/WhatsApp/push) sobre la interfaz preparada.
- Notificaciones in-app (toast/feed) para `critical` y confirmaciones.
- Cierre del ciclo de vida de resoluciones en el Business Summary (mención del
  conteo de atención en el resumen conversacional).
