# FASE 6B — Smart Collection Automation — Reporte

## Resumen ejecutivo

Se construyó el **asistente de cobranza inteligente** sobre el Centro de
Cobranza (6A): plantillas editables por categoría con variables dinámicas,
métodos de pago configurables, niveles sugeridos por atraso (editables),
historial de contacto integrado al timeline, 4 acciones nuevas de IA y
preferencias aprendidas en Business Memory. **Panitas nunca envía mensajes
automáticamente**: el servicio prepara recordatorios y el dueño los revisa,
envía y confirma.

**Verificación:** `tsc --noEmit` OK · **41 tests nuevos** (26 `CollectionService`
+ 7 `collection-preferences` + 7 ejecutor 6B + 1 timeline) · suite completa
**856 tests en verde** · `db:push` aplicado (2 backups automáticos).

## Qué se implementó

### 1. Schema y dominio (`P1`)
- **`prisma/schema.prisma`** — tres modelos nuevos:
  - `CollectionSettings` (métodos de pago JSON, nivel por defecto, nombre).
  - `CollectionTemplate` (categoría, nombre, nivel, cuerpo, `isBuiltIn`,
    `@@unique([storeId, category, name])`).
  - `CollectionContactLog` (canal, categoría, nivel, plantilla, mensaje,
    estado `pending|sent|responded`, fechas; relación con Order/Customer).
  - Columna `category` añadida a `CollectionContactLog` en esta fase.
- Aplicado con `npm run db:push` (backups `backup-2026-08-06T01-23-34-896Z.sql`
  y `backup-2026-08-06T01-39-02-025Z.sql`) y `npx prisma generate` (v7.8.0).

### 2. `CollectionService` (`P2`)
- Plantillas: `listTemplates` (siembra built-ins), `upsertTemplate` (editar
  built-in → custom), `restoreDefaultTemplates`, `deleteTemplate` (built-in se
  restaura, no se borra).
- Configuración: `getSettings` / `saveSettings` (métodos ≤ 15, nivel, nombre).
- `prepareReminder`: renderiza variables, crea log `pending`, emite
  `collection.reminder.prepared`, devuelve mensaje + `whatsappUrl` (teléfono
  normalizado a prefijo 58). **No envía.**
- `markContact` (`sent`/`responded`), `listHistory`, `recommendations`
  (vencidos → atraso → sin contacto → último contacto → próxima cuota).
- `renderTemplate`, `suggestLevel` (≤2→1, 3–10→2, ≥11→3), validaciones.

### 3. APIs (`P3`)
- `/api/collection/{templates, templates/restore, templates/[id], settings,
  prepare, contacts, recommendations}` y
  `/api/business-memory/collection/preferences`. Mutaciones con `csrfGuard`.

### 4. Timeline + eventos (`P5`)
- Categoría `collection` en `event-types.ts` y 5 eventos en `event-registry.ts`.
- `CreditService.getDetail` carga contactos y `buildTimeline` añade entradas
  `reminder_sent` (violeta, BellRing) y `client_responded` (azul,
  MessageCircleReply) en `timeline.tsx`.

### 5. UI (`P4`)
- `src/components/dashboard/collection/`: `collection-types.ts`,
  `template-editor.tsx` (vista previa en vivo + paleta de variables),
  `payment-methods-manager.tsx`, `contact-history.tsx`, `send-assistant.tsx`.
- Página `/dashboard/collection` con tabs Asistente / Plantillas / Métodos.
- Sidebar: "Cobranza IA" (Megaphone) en roles admin/manager, oculta en agenda.

### 6. IA (`P6`)
- Catálogo: `contactar_hoy`, `sin_recordatorio`, `creditos_dos_intentos`,
  `preparar_aviso` (param `cliente` requerido, `tipo` opcional → categoría).
- `executor.ts`: 4 casos nuevos usando `CollectionService`;
  `ExecutorDeps.collectionService` inyectado en `conversation/factory.ts`.
- `rich.ts`: `collectionRecommendationsList` y `preparedReminderCard`.

### 7. Business Memory (`P7`)
- `src/lib/business-memory/collection-preferences.ts`: claves
  `bm.preference.collection.{plantilla,metodo,nivel,orden}`; aprendizaje por
  repetición (umbral 3) + orden explícito.
- API `GET|POST /api/business-memory/collection/preferences`; el POST de
  `/api/collection/contacts` aprende categoría/método/nivel al marcar `sent`.

## Tests (41 nuevos)

- **`tests/services/collection.service.test.ts` (26)**: render de variables,
  niveles sugeridos, siembra/restauración/borrado de plantillas, settings,
  preparación (nunca envía), marcar sent/responded, aislamiento por tenant,
  historial y recomendaciones. Con mock de BD en memoria.
- **`tests/conversational-actions/executor.test.ts` (+7)**: `contactar_hoy`,
  `sin_recordatorio`, `creditos_dos_intentos`, `preparar_aviso` (incl. mapeo de
  `tipo`, errores sin cliente y cliente inexistente).
- **`tests/business-memory/collection-preferences.test.ts` (7)**: defaults,
  umbral de repetición (candidato → confirmado), método/nivel, claves,
  aislamiento por store y no-escritura redundante.
- **`tests/services/credit.service.test.ts` (+1)**: timeline con
  `reminder_sent` / `client_responded`.

## Verificación

- `npx tsc --noEmit` → OK
- `npx vitest run` → **856 passed** (109 archivos)
- `npm run build` → paso final (pendiente en el checklist)

## Notas

- `prepareReminder` siempre crea un log `pending`: la confirmación del envío es
  un paso explícito del usuario.
- El nivel y la categoría son sugerencias editables; el orden de
  `recommendations` prioriza vencidos y nunca-contactados.
- `normalizeMethods` deduplica por coincidencia exacta (sensible a mayúsculas).
- Guía funcional: [`docs/COLLECTION_AUTOMATION.md`](./COLLECTION_AUTOMATION.md).
