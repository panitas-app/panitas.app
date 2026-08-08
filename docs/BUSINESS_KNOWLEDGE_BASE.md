# Business Knowledge Base — Arquitectura

> FASE 7D — Centro de Documentos multi-tenant del negocio: políticas,
> garantías, procedimientos y manuales que Panitas consulta **antes** de
> responder, con citas discretas y sin inventar.

## Objetivo

Darle al negocio una base de conocimiento centralizada que la IA (Copiloto y
Agente) usa como fuente de verdad para responder con precisión. Un documento
registrado una vez responde **siempre** igual, con cita al documento que
respalda la respuesta.

## Modelo de datos (Prisma)

Modelos nuevos (todos multi-tenant vía `storeId`):

| Modelo | Propósito |
|---|---|
| `KnowledgeDocument` | Documento (`title`, `content`, `summary`, `type`, `status`, `source`, archivo original `fileName/fileUrl/fileType/fileSize`, `version`, `viewCount`) |
| `KnowledgeCategory` | Categorías (10 del sistema + personalizadas), `@@unique([storeId, slug])` |
| `KnowledgeTag` | Etiquetas libres, `@@unique([storeId, slug])` |
| `KnowledgeDocumentCategory` / `KnowledgeDocumentTag` | Relaciones N:M |
| `KnowledgeVersion` | Snapshots de cada versión (`documentId_version` único) |
| `KnowledgeHistory` | Auditoría (crear/actualizar/eliminar/indexar/ver/restaurar/categorías/etiquetas) |
| `KnowledgeEmbedding` | Chunks indexados; `vector` **reservado** para RAG futuro (hoy `null`) |

**Indexación en 4 planos** (separados desde el inicio para el RAG futuro):

1. **Original** → `fileName / fileUrl / fileType / fileSize`.
2. **Contenido** → `content` + `chunks` (troceado con solapamiento) en
   `KnowledgeEmbedding`.
3. **Metadatos** → tipo, estado, categorías, etiquetas, autor.
4. **Embeddings** → `model/dimensions/vector` siempre `null` hoy; el vector
   store se conectará sin cambiar la API (`indexDocument` ya los emite).

## Estructura del módulo `src/lib/knowledge/`

| Archivo | Responsabilidad |
|---|---|
| `knowledge-types.ts` | Tipos **puros sin Prisma**: `KnowledgeDocumentView`, búsqueda, citas, indexado |
| `knowledge-categories.ts` | 10 categorías del sistema + `slugify` + validación de nombres |
| `knowledge-events.ts` | 5 eventos `knowledge.*`, dominio `knowledge` |
| `knowledge-parser.ts` | Extracción TXT/PDF/DOCX **sin dependencias** (UTF-8, streams PDF, lector ZIP mínimo) |
| `knowledge-index.ts` | `chunkText` (1200 chars, solape 120), `tokenCount`, `indexDocument` |
| `knowledge-search.ts` | Motor híbrido con `KnowledgeSearchStore` inyectable (Prisma = ILIKE) |
| `knowledge-service.ts` | Fachada CRUD multi-tenant, permisos, versionado, historial, eventos |
| `knowledge-answer.ts` | Respuesta grounded con cita discreta |
| `index.ts` | Barrel público (un solo punto de import) |

## Búsqueda híbrida

`KnowledgeSearchEngine` combina (pesos por defecto):

- **Keywords** (0.65): ILIKE sobre título (x4), resumen (x2.5), categorías
  (x3), etiquetas (x2) y contenido (x1.5).
- **Fuzzy** (0.35): `fuse.js` con `threshold: 0.4` (tolerancia a typos).
- **Recencia** (hasta +0.06): ventana de 30 días.
- **Popularidad** (hasta +0.04): según `viewCount`.

Los bonos **nunca** convierten un documento irrelevante en resultado: solo se
incluye si hubo match real por keyword o fuzzy. El store es una interfaz pura
(`KnowledgeSearchStore`) para probar el motor sin BD; la implementación Prisma
filtra por tenant y ejecuta los ILIKE en la base.

## Respuesta con citas

`buildKnowledgeAnswer` produce una `KnowledgeAnswer`:

- Con match → `grounded: true`, cita discreta:
  `Según la política que registró tu negocio ("Política de garantías"): …`
  + `citations` y `dataSources` (`knowledge:<id>`).
- Sin match → `grounded: false`; no inventa, sugiere registrar el documento.

## Permisos

| Acción | Rol |
|---|---|
| Leer / buscar (`read`) | admin, manager, seller, viewer y sin rol (IA interna) |
| Crear / actualizar / archivar (`write`) | admin, manager, seller |
| Eliminación definitiva (`manage`) | admin, manager |

## Eventos `knowledge.*`

Registrados en `event-registry.ts` (categoría `conversations`), todos con
`data.domain === "knowledge"`:

`knowledge.document.created` · `updated` · `deleted` · `indexed` ·
`knowledge.search.executed`

- **`knowledge.listener`** mantiene estado en memoria por tenant (contadores
  y último evento) y expone el hook `onEvent` para la UI.
- `conversation-history.listener` excluye `domain === "knowledge"` (junto a
  `inbox`/`copilot`).
- **Business Memory** observa `knowledge.search.executed` y
  `knowledge.document.created` (`bm.usage_pattern.knowledge.*`).

## Integración con IA

- **Copiloto** (`copilot-service.query`): para el intent `otro`, busca primero
  en la KB; si hay match usa la respuesta grounded (con citas en
  `dataSources`) en lugar del borrador.
- **Agente**: tools `knowledge.search` y `knowledge.list` (solo lectura, nunca
  editan). Permisos `knowledge.read`/`knowledge.write`.

## API HTTP (`/api/knowledge`)

| Ruta | Método | Función |
|---|---|---|
| `/` | GET/POST | Listar / crear documento |
| `/search` | GET/POST | Búsqueda híbrida |
| `/categories` · `/[id]` | GET/POST · PATCH/DELETE | Categorías |
| `/tags` · `/[id]` | GET/POST · DELETE | Etiquetas |
| `/documents/[id]` | GET/PATCH/DELETE | CRUD (delete = manage) |
| `/documents/[id]/archive` · `/restore` | POST | Archivar / restaurar |
| `/documents/[id]/versions` · `/history` | GET | Versiones / auditoría |
| `/documents/[id]/view` | POST | Incrementar vistas |
| `/upload` | POST | PDF/DOCX/TXT ≤ 10MB (extrae texto y crea) |

Todas las mutaciones pasan `csrfGuard`; `requireKnowledgeStore` valida sesión,
tenant y feature `knowledge_base`.

## Feature y UI

- Feature `knowledge_base` en `BASE_FEATURES` (disponible en el plan base).
- Página `/dashboard/knowledge` con `FeatureLockScreen` si el plan no la
  incluye. Sidebar: **Documentos** (icono `BookOpen`).
- Componentes: lista con búsqueda y filtros, modal crear/editar, modal de
  subida de archivos y detalle con pestañas Contenido / Versiones
  (restaurar) / Historial (auditoría).

## Parser de documentos (sin dependencias)

- **TXT/MD/CSV** → `TextDecoder` UTF-8.
- **PDF** → streams `FlateDecode` o planos, extracción `(...)` best-effort.
- **DOCX** → lector ZIP mínimo (stored/deflate) sobre `word/document.xml`.
- Nunca lanza: ante archivos inválidos registra el documento con metadatos y
  contenido vacío.
- Validación por firma real en `src/lib/file-validate.ts` (DOCX por
  `word/document.xml` dentro del ZIP; TXT por heurística sin chars de control).

## Pendientes (fuera de alcance)

1. **RAG / embeddings**: conectar un vector store real (los placeholders
   `model/dimensions/vector` ya existen en schema e índice).
2. UI de gestión de categorías personalizadas (la API ya soporta CRUD).
3. Vistas previas de PDF/DOCX en el navegador (hoy se descarga el original).
