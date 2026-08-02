# PANITAS — Reporte de Estabilización FASE 3E

> Fecha: 2026-08-02 · Rama: `develop-v2` · Base: `4484b01` (FASE 3D)
> Alcance: auditoría, limpieza, optimización y aseguramiento. **Sin nuevas features, sin nuevas capacidades IA.**

---

## 1. Objetivo

Panitas 2.0 acumula las fases 3A (Agent Core), 3B (Tool System), 3C (Conversation Engine) y 3D (Business Context & Memory) sobre el legado 1.0. La FASE 3E no agrega funcionalidad: **revisa, limpia, optimiza y asegura** lo construido, dejando la base verificada antes de cualquier cableado IA futuro.

## 2. Criterios de finalización — Estado

| Criterio | Estado | Evidencia |
|---|---|---|
| Lint limpio en archivos tocados | ✅ | `eslint` 0 problemas en 6 archivos |
| Typecheck global | ✅ | `tsc --noEmit` sin errores |
| Tests verdes | ✅ | 273 tests / 44 archivos (`vitest run`) |
| Build de producción | ✅ | `next build` completa sin errores |
| Docs 3E publicadas | ✅ | 7 documentos (ver §7) |
| BD sincronizada con schema | ✅ | `prisma db push` + backup automático |
| Nada roto en 3A–3D | ✅ | Suite completa de agent-core/tools/conversation/memory en verde |

## 3. Cambios aplicados

### 3.1 Seguridad — aislamiento entre negocios (severidad alta)

| Archivo | Cambio |
|---|---|
| `src/services/order.service.ts` | `OrderService.create` deriva `storeId` **solo** del contexto autenticado; si `body.storeId` existe y difiere del contexto → `403 "No autorizado"`. Pasa `storeId` al scope de búsqueda de productos. |
| `src/repositories/product.repository.ts` | `findByIds(ids, storeId?)` filtra por `storeId` cuando se provee. |
| `tests/services/order.service.test.ts` | Test actualizado a la semántica 403 + test nuevo de scope (`findByIds` con storeId del contexto, orden creada con storeId autenticado). |

Semántica intencional: **404 → 403**. El 404 filtraba la existencia de tiendas ajenas al usuario autenticado; el 403 no revela existencia.

### 3.2 Planes y features — gate en el chat IA

| Archivo | Cambio |
|---|---|
| `src/app/api/agent/chat/route.ts` | Tras `requireRole(...)`, se valida `requireFeature(current.store.plan, "basic_ai")` → `403` si el plan no incluye la feature. |

El gate es una **red de seguridad**: hoy todos los planes reales incluyen `basic_ai`, por lo que no bloquea a nadie; protege el endpoint cuando evolucione el catálogo de planes (nuevo plan limitado sin IA).

### 3.3 Eliminación de código muerto (56 archivos)

`git rm` de 56 archivos trackeados: logs de desarrollo (`dev*.log`), `test-api.cjs`, `posthog-setup-report.md`, `instrumentation-client.ts` (PostHog sin `posthog.init`, no-op), imágenes y archivos de cliente (`*.xlsx`, `*.png`, `*.jpeg`, `eduvex_framer_website.html`), `temp-sources/*.mp4` (18), `temp-vp9/*.webm` (17) y `data/*` (`agencias_venezuela`, `resumen.md`).

Detalle completo y lo que se **conservó documentado** (no borrado): `docs/DEAD_CODE_REPORT.md`.

### 3.4 Rendimiento — índices de BD (11 índices en 5 modelos)

`prisma/schema.prisma`:

- `Product`: `@@index([storeId])`, `@@index([storeId, isActive])`, `@@index([sku])`, `@@index([barcode])`
- `OrderItem`: `@@index([orderId])`, `@@index([productId])`
- `OrderPayment`: `@@index([orderId])`, `@@index([paymentAccountId])`
- `Expense`: `@@index([storeId])`, `@@index([storeId, date])`
- `Collection`: `@@index([storeId])`

Aplicado con `npm run db:push` (backup previo `backups/backup-2026-08-02T20-44-19-970Z.sql`, 458.6 KB). `prisma validate` OK. Detalle: `docs/DATABASE_OPTIMIZATION.md`.

### 3.5 Next.js — verificación de carga y estados de error

- El layout raíz **es Server Component** (no `"use client"`).
- `loading.tsx`, `error.tsx` y `not-found.tsx` existen a nivel raíz y en rutas clave (dashboard, admin, scanner, store).
- La tienda pública `/store/[slug]` **es SSR** con `generateMetadata` (checksum SEO resuelto; supera el hallazgo #10 del checklist maestro).
- 59 páginas declaran `"use client"`; las de marketing públicas (`/pricing`, `/faq`, `/contacto`) son client components → **trabajo futuro documentado**, no se refactorizan en 3E por riesgo.

### 3.6 Tests críticos añadidos (+8 tests)

| Archivo | Qué cubre |
|---|---|
| `tests/agent-core/wiring.test.ts` (4) | El sistema de tools 3B **funciona cuando se cablea**: `buildToolRegistry` registra los 7 dominios; singleton `toolRegistry` poblado; `toLegacyAgentTool` adapta el contrato 3B→1C; el bridge ejecuta tools mapeando contexto legacy. Prueba que el gap (tools inertes) es de *cableado*, no de *funcionalidad*. |
| `tests/features/chat-gate.test.ts` (3) | Ruta `POST /api/agent/chat`: permite cuando el plan incluye `basic_ai`, devuelve `403` y no crea el engine cuando el gate deniega, y `400` con mensaje vacío. |
| `tests/services/order.service.test.ts` (+1) | Aislamiento: `findByIds` se llama con el storeId del contexto y la orden se crea con ese storeId. |

## 4. Hallazgos sin resolver (documentados, NO explotables hoy)

| Hallazgo | Severidad | Estado |
|---|---|---|
| Gap de cableado tools 3B → Agent Core 3A (tools construidas pero inertes) | Info | Documentado; cableado es fase futura. `docs/AI_ARCHITECTURE_REVIEW.md` |
| Repositorios con métodos por-ID sin `storeId` (product, order, customer, payment, agenda) | Media (latente) | Documentado; hoy la capa de servicios valida el contexto. `docs/SECURITY_AUDIT_REPORT.md` |
| Páginas públicas de marketing en `"use client"` | Media (SEO) | Documentado como trabajo futuro. |
| RLS (`rls-policies.sql`) y `seed.sql` existentes sin aplicar | Media | Pendiente de decisión. `docs/PHASE_3E_FULL_AUDIT.md` |
| PostHog cliente sin `posthog.init` (capture no-op) | Baja | Documentado; decisión de init en fase futura. `docs/DEAD_CODE_REPORT.md` |

## 5. Línea base de calidad

- **Lint repo**: 2418 problemas preexistentes (417 errors) **ajenos a 3E**; solo se exige lint limpio en archivos nuevos/modificados (✅).
- **Tests**: 273 verdes (265 previos + 8 de 3E).
- **Typecheck**: sin errores.
- **Build**: `next build` OK (Turbopack).

## 6. Recomendaciones para la siguiente fase

1. **Cablear tools**: invocar `setupAgentTools()`/`buildToolRegistry()` en el arranque del runtime 3A y conectar el `ToolExecutor` al `ToolResolver` (el `toolsProvider` del factory). El test `wiring.test.ts` garantiza que el puente funciona.
2. **RLS**: evaluar aplicar `rls-policies.sql` con la nueva estrategia de conexiones de Prisma.
3. **SSR marketing**: convertir `/pricing`, `/faq`, `/contacto` a Server Components.
4. **PostHog**: decidir e inicializar `posthog-js` en cliente o retirar los `capture` no-op.
5. **Métricas**: añadir index en `AuditLog(storeId)` si las consultas de auditoría por tienda crecen.

## 7. Documentación generada en 3E

| Documento | Contenido |
|---|---|
| `docs/PHASE_3E_FULL_AUDIT.md` | Auditoría maestro: hallazgos con evidencia de línea, matriz de decisiones, estado 3A–3D. |
| `docs/DEAD_CODE_REPORT.md` | Código muerto eliminado vs. documentado-conservado. |
| `docs/SECURITY_AUDIT_REPORT.md` | Vectores de aislamiento corregidos, riesgos latentes, verificado-correcto. |
| `docs/AI_ARCHITECTURE_REVIEW.md` | Mapa de capas IA, calificaciones, gap de cableado, recomendaciones. |
| `docs/DATABASE_OPTIMIZATION.md` | Índices, justificación de cardinalidad, backfill, riesgos de la app. |
| `docs/PANITAS_CURRENT_STATE.md` | Estado actual del producto (1.0 estable + 2.0 IA). |
| `docs/PHASE_3E_STABILIZATION_REPORT.md` | Este documento. |
