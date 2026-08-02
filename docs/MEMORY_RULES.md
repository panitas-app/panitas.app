# Memory Rules — Reglas de guardado y clasificación (FASE 3D)

**Fuente de verdad:** `src/lib/agent/memory/classifier.ts`, `extractor.ts` y `manager.ts`.

---

## 1. Aislamiento (regla inamovible)

- **Todo ítem pertenece a un `storeId`** (frontera de negocio). El Negocio A jamás lee/escribe memoria del Negocio B.
- **Toda query** del repositorio incluye `storeId` en el `where`; los ítems `scope="user"` además exigen el `userId` del autor.
- El `userId` se registra como **autor** (auditoría), no como frontera por defecto → la memoria del chat es accesible a todo el negocio.

## 2. Tipos y scopes

| Campo | Valores | Significado |
|---|---|---|
| `scope` | `store` / `user` | Compartido por el negocio / privado del usuario |
| `type` | `short_term` / `long_term` / `business` | Eventos que expiran / hechos duraderos / config·clientes·productos del negocio |
| `kind` | `fact` · `preference` · `business_setting` · `customer` · `product` · `event` · `custom` | Naturaleza del hecho |
| `importance` | `LOW` · `MEDIUM` · `HIGH` · `CRITICAL` | Peso en el scoring y TTL |

## 3. Importancia → TTL

| Importancia | TTL | `type` resultante |
|---|---|---|
| `LOW` | 1 día | según kind |
| `MEDIUM` | 7 días | según kind |
| `HIGH` | 30 días | según kind |
| `CRITICAL` | sin expiración | `short_term` (evento) |

## 4. Señales del clasificador (deterministas, sin ML)

| Señal | `kind` | Importancia base | Ejemplos |
|---|---|---|---|
| `prefiero / me gusta / quiero / usamos / no me gusta` | `preference` | HIGH | "Prefiero cobrar en bolívares" |
| `mi negocio / mi tienda / vendemos / somos / nos dedicamos` | `fact` | HIGH | "Mi negocio es una panadería" |
| `cliente / contacto / teléfono / celular` | `customer` | HIGH | "El cliente María prefiere sábados" |
| `producto / artículo / sku / categoría` | `product` | MEDIUM | "El producto Pan de jamón se vende mucho" |
| `horario / precio / dirección / envío / whatsapp / instagram` | `business_setting` | HIGH | "Abrimos a las 8am" |
| `stock / agotado / vencido / pendiente / pedido` | `event` | HIGH | "Hay pedidos pendientes" |
| `agotado` o `stock 0` o `vencimiento mañana` | → `event` | **CRITICAL** | "El producto está agotado" |

**Desempate**: a igual importancia gana la **primera** señal (las más específicas van primero en la tabla).

## 5. Qué NO se guarda

- **Small talk y cortesía**: "hola", "gracias", "buenas tardes".
- **Preguntas operativas genéricas** sin señal: "¿cuánto vendimos esta semana?" (no menciona preferencia/cliente/producto/…).
- Textos de **menos de 8 caracteres** o **más de 600**.
- La **respuesta del asistente** (es texto generado, no un hecho del negocio).

## 6. Extracción de turnos (`extractor.ts`)

Por cada turno del chat se extraen **candidatos**:

1. **Mensaje del usuario** → se clasifica; si `shouldStore`, se genera un candidato con `key = kind + hash(contenido)`.
2. **Resultados de tools con regla** → hechos compactos del negocio:

| Prefijo de tool | `kind` | Importancia | `type` | Límite |
|---|---|---|---|---|
| `analytics.*` | `business_setting` | HIGH | `business` | 1500 chars |
| `inventory.*` | `product` | MEDIUM | `business` | 800 chars |

   Clave: `nombre.tool` → `analytics:salesSummary:latest` (se reescribe en cada turno).
3. Las tools **fallidas** o **sin regla** no generan memoria.

## 7. Upsert y ciclo de vida

- `key` única por `(storeId, key)` → `remember` reescribe el ítem existente (nunca duplica).
- `MemoryCleaner`:
  - Elimina ítems con `expiresAt` vencido.
  - **Cap por negocio** (500 por defecto): elimina primero lo de menor importancia y más antiguo; `CRITICAL` se conserva mientras haya otra opción.
- Los eventos `memory.created/updated/deleted` se emiten y se auditan.

## 8. Limpieza en el chat

- El recuperador aplica un `minImportance` opcional (la API puede pedir `?minImportance=MEDIUM`).
- El contexto de memoria se **trunca** (2.500 caracteres máx. en el prompt del agente) para controlar tokens.
