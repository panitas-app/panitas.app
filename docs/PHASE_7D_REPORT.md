# FASE 7D — Business Knowledge Base — Reporte

## Resumen ejecutivo

Se construyó el **Centro de Documentos multi-tenant** del negocio: políticas,
garantías, procedimientos y manuales que Panitas consulta **antes** de
responder, con citas discretas y sin inventar. El módulo `src/lib/knowledge/`
incluye parser de archivos sin dependencias (PDF/DOCX/TXT), indexación por
chunks con solapamiento (RAG-ready), motor de **búsqueda híbrida** (keywords
ILIKE + fuzzy fuse.js + recencia + popularidad), respuestas **grounded con
citas**, versionado con snapshots, auditoría (`KnowledgeHistory`), eventos de
dominio `knowledge.*` con listener, integración KB-first en el Copiloto y en
el Agente (tools `knowledge.search`/`knowledge.list`), API `/api/knowledge/*`
completa y UI en `/dashboard/knowledge` con subida de archivos, filtros,
versiones e historial.

**Verificación:** `tsc --noEmit` OK · `eslint` repo 0 errores · **80 tests
nuevos** en `tests/knowledge/` en verde · suite completa **1212 tests en
verde** · `npm run build` OK (Compiled successfully).

## Qué se implementó

### 1. Schema Prisma (`P0`)
- 7 modelos nuevos: `KnowledgeDocument`, `KnowledgeCategory`,
  `KnowledgeTag`, `KnowledgeDocumentCategory`, `KnowledgeDocumentTag`,
  `KnowledgeVersion` (snapshot), `KnowledgeHistory` (auditoría),
  `KnowledgeEmbedding` (chunks + `vector` **placeholder null** para RAG
  futuro). Todos multi-tenant (`storeId`) con `@@unique` compuestos.
- Aplicado con `npm run db:push` (backup previo automático) + `prisma generate`.

### 2. Módulo `src/lib/knowledge/` (`P1`–`P4`)
- **`knowledge-types.ts`** — tipos puros sin Prisma (vista, búsqueda, citas).
- **`knowledge-categories.ts`** — 10 categorías del sistema + `slugify`.
- **`knowledge-events.ts`** — 5 eventos `knowledge.*` con `domain === "knowledge"`.
- **`knowledge-parser.ts`** — extracción TXT/PDF/DOCX **sin dependencias**,
  best-effort, nunca lanza.
- **`knowledge-index.ts`** — `chunkText` (1200 chars, solape 120),
  `tokenCount`, `indexDocument` con plano de embeddings.
- **`knowledge-search.ts`** — motor híbrido con `KnowledgeSearchStore`
  inyectable (Prisma: ILIKE sobre título/resumen/categorías/etiquetas/
  contenido), fuzzy (threshold 0.4), bonos recencia/popularidad que **nunca**
  convierten irrelevantes en hits (`_match: keywordHits > 0 || fuseScore != null`).
- **`knowledge-service.ts`** — fachada CRUD por tienda: permisos por rol,
  categorías/etiquetas, versionado con snapshot + `changeNote`, historial,
  restaurar versión, archivar/restaurar, vista, publicación de eventos.
- **`knowledge-answer.ts`** — respuesta grounded con cita discreta
  («Según la política que registró tu negocio ("Título"): …») + `dataSources`.

### 3. Eventos, Copiloto y Agente (`P5`–`P6`)
- **`knowledge.listener.ts`** nuevo (estado por tenant + hook `onEvent`),
  exportado por `@/lib/events` y registrado en el bundle.
- `conversation-history.listener` excluye `domain === "knowledge"` (junto a
  `inbox`/`copilot`).
- **Business Memory** observa `knowledge.search.executed` y
  `knowledge.document.created` (`bm.usage_pattern.knowledge.*`).
- **Copiloto**: intent `otro` consulta la KB primero; si hay match responde
  grounded en lugar del borrador.
- **Agente**: tools `knowledge.search` y `knowledge.list` (solo lectura).

### 4. API HTTP + feature (`P7`)
- Rutas `/api/knowledge/*`: CRUD de documentos/categorías/etiquetas,
  búsqueda híbrida, archivar/restaurar, versiones, historial, `view`,
  `upload` (PDF/DOCX/TXT ≤ 10MB). Mutaciones con `csrfGuard` y
  `requireKnowledgeStore` (sesión + tenant + feature).
- Feature `knowledge_base` en `BASE_FEATURES`; `src/lib/file-validate.ts`
  valida firma real (DOCX por `word/document.xml`). Sidebar **Documentos**.

### 5. UI (`P8`)
- `/dashboard/knowledge` (server component, `FeatureLockScreen` si el plan no
  incluye `knowledge_base`).
- `src/components/knowledge/`: `knowledge-client.tsx` (lista, búsqueda
  híbrida, filtros estado/categoría, archivar/eliminar),
  `knowledge-form-modal.tsx` (crear/editar + versionado + etiquetas inline),
  `knowledge-upload-modal.tsx` (subida con validación y categorías),
  `knowledge-detail-modal.tsx` (pestañas Contenido / Versiones con restaurar /
  Historial de auditoría), `knowledge-types.ts` (UI types + constantes).

### 6. Tests (`P9`)
- **80 tests en `tests/knowledge/`** (6 archivos): parser (17 — TXT UTF-8,
  PDF streams, DOCX ZIP stored sintético), índice (13 — chunking, tokens,
  embeddings placeholder), búsqueda (13 — ranking, typos, bonos, snippet,
  `matchedOn`), answer (7 — grounded/no-grounding/citas), service (24 —
  permisos por rol, CRUD, versionado snapshot, tenant isolation 404, eventos)
  y listener (6 — eventos por dominio/tenant).
- Los tests encontraron y el código corrigió 4 bugs reales: bonos de
  relevancia, `tokenCount` de espacios, normalización del texto extraído y
  concordancia gramatical de la cita.

## Decisiones clave

- **Store inyectable** (`KnowledgeSearchStore`): el motor se prueba sin BD; la
  implementación Prisma hace los ILIKE reales en base.
- **Bonos ≠ relevancia**: recencia/popularidad solo suman cuando ya hay match
  keyword o fuzzy (un documento irrelevante nunca aparece).
- **RAG-ready desde el día 1**: chunks + `KnowledgeEmbedding.vector` null; el
  vector store futuro no cambia la API pública.
- **Parser sin dependencias**: best-effort y no bloqueante; archivo inválido se
  registra con metadatos en vez de fallar.
- **Versionado por snapshot** con `documentId_version` único y `changeNote`;
  restaurar crea una versión nueva (historial inmutable).
- **Cita discreta y gramatical**: «Según {artículo+tipo} que registró tu
  negocio ("Título")» — la IA nunca inventa (grounding si hay match).
- **Eventos `{ domain: "knowledge" }`** excluidos del historial de
  conversaciones; Business Memory los observa para detectar patrones.

## Verificación final (`P11`)

| Chequeo | Resultado |
|---|---|
| `npx tsc --noEmit` | OK |
| `npx eslint` (repo) | 0 errores |
| `npx vitest run` (suite completa) | 144 archivos / **1212 tests** en verde |
| `npx vitest run tests/knowledge` | **80 tests** en verde |
| `npm run build` | ✓ Compiled successfully |
| `db:push` + `prisma generate` | Aplicado sin error |

## Pendientes (fuera de alcance)

1. **RAG**: conectar un vector store real (schema e índice ya emiten
   `model/dimensions/vector`).
2. UI de gestión de categorías personalizadas (API ya la soporta).
3. Vista previa de PDF/DOCX en navegador (hoy se descarga el original).
