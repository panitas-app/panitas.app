# Historial de Conversaciones — Guía (FASE 5C)

## Qué es

El chat del asistente ahora mantiene **conversaciones independientes estilo
ChatGPT**: el usuario puede abrir varias, reanudarlas al volver, renombrarlas,
buscarlas y eliminarlas. El contexto de cada una se restaura al reabrirla, por lo
que el asistente retoma sin repetir preguntas.

La ubicación es una **sidebar dentro del chat** (escritorio fija `lg:w-64` y
overlay en móvil). El inbox de clientes `/dashboard/conversaciones` no se toca.

## Funcionalidades

- **Nueva conversación**: botón "Nueva conversación" en la sidebar.
- **Títulos automáticos**: `generateTitle` usa las primeras 6 palabras (máx 40
  caracteres) del primer mensaje, capitalizado. Nunca queda "Nueva conversación".
  `autoTitle` solo renombra si el título sigue siendo el por defecto.
- **Renombrar**: lápiz por conversación → edición inline (Enter/Esc/blur).
- **Eliminar**: icono de papelera con `window.confirm`.
- **Buscar**: caja con debounce de 250 ms (`GET /api/conversations?q=...`),
  busca por título y contenido.
- **Tiempo relativo**: "hace 5 min", "hace 3 h", "hace 2 d", fecha corta en
  Español Venezuela para más de 30 días.
- **Restauración**: al abrir una conversación se cargan historial + contexto +
  resumen (`restoreSession`).

## API

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/conversations` | Lista paginada (+ `?q=` búsqueda, `status`, `updatedAfter/Before`) |
| `POST` | `/api/conversations` | Crea conversación |
| `GET` | `/api/conversations/:id` | Detalle |
| `PATCH` | `/api/conversations/:id` | Renombra (`{ title }`, máx 60) |
| `DELETE` | `/api/conversations/:id` | Elimina |

`PATCH` requiere `csrfGuard` y rol `OWNER|ADMIN|SUPERVISOR|MANAGER`. El título
vacío → 400; conversación ajena/inexistente → 404.

## Componentes

- `src/components/assistant/chat-history-sidebar.tsx` — sidebar de historial
  (nueva conversación, búsqueda, lista, renombrar, eliminar).
- Integrada en `assistant-chat-view.tsx` y `ui/animated-ai-chat.tsx` con botón
  "Historial" en el header y overlay móvil con backdrop.
- `use-assistant-chat.ts` expone `conversations`, `openConversation`,
  `startNewConversation`, `deleteConversation`, `renameConversation`,
  `searchConversations`, `loadConversations`.

## Sesiones

`ConversationSession` (`src/lib/conversations/conversation-session.ts`):

- `create(ctx, title?)` — conversación nueva.
- `restore(ctx, id)` — historial + `contextState` + `summary`. Para conversaciones
  previas a 5C sin resumen, `buildInitialSummary` lo construye bajo demanda.
- `rename(ctx, id, title)` / `delete(ctx, id)` / `list(ctx, opts)`.

## Aislamiento

Toda operación fuerza `userId` + `storeId` (scope por negocio): una tienda nunca
ve ni puede restaurar conversaciones de otra, aunque pertenezcan al mismo usuario.

## Búsqueda

`ConversationRepository.search` (repo) hace match de título (insensitive) o de
cualquier mensaje (`some contains`) y devuelve `_count.messages` + primer mensaje
de usuario para el snippet. Filtros: `status`, `updatedAfter`, `updatedBefore`.

## Límites

- Título manual: 60 caracteres.
- Título automático: 6 palabras / 40 caracteres.
- Snippet de búsqueda: 120 caracteres.
