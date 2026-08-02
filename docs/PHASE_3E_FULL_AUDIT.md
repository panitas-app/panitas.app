# FASE 3E — Auditoría Completa, Optimización y Estabilización

**Rama:** `develop-v2` · **Fecha:** 02/08/2026 · **Estado:** documento maestro de la fase

---

## 1. Alcance

Sin nuevas features, ni IA, ni tools, ni planes. Revisar, limpiar, optimizar y asegurar
todo lo construido en 3A–3D más el legado original (1C) para dejarlo estable.

Prioridades: **1. Seguridad → 2. Estabilidad → 3. Rendimiento → 4. Limpieza → 5. Mantenibilidad**.

---

## 2. Estado general del repositorio

| Área | Estado |
|---|---|
| Rama activa | `develop-v2` (HEAD `4484b01`, FASE 3D) |
| Archivos trackeados | 881 |
| Modelos Prisma | 74 |
| Migraciones | 4 (`init`, `plans_crm_automations`, `plans_agenda_negocio`, `cash_register_session`) |
| Tests | 46 archivos · 265 tests · verdes |
| Lint repo | ~2418 issues preexistentes (417 errors), ajenos a 3A–3D |
| Build / typecheck | OK |

### Estructura de capas IA
- `src/lib/agent-core/` — Agent Core (FASE 3A)
- `src/lib/agent/tools/` — Tool System (FASE 3B, 24+ tools, capa limpia sin Prisma)
- `src/lib/conversation/` — Conversation Engine (FASE 3C)
- `src/lib/agent/memory/` + `context/` + `profile/` — Memoria y contexto (FASE 3D)
- `src/lib/agent/{index,registry,router,setup,types}` — infraestructura legado 1C
- `src/lib/agent/{permissions,audit}` — activos (usados por el Agent Core)
- `src/repositories/` — repositorios de datos (frontera BD)
- `src/services/` — capa de servicios (validación + reglas de negocio)

---

## 3. Hallazgos verificados

### 🔴 3.1 CRÍTICO — El Tool System 3B está huérfano en runtime (arquitectura)

Evidencia verificada:
- `src/lib/agent-core/tool-resolver.ts:13` importa `@/lib/agent/registry` (registry **legado 1C**),
  NO el `toolRegistry` de 3B.
- `src/lib/agent-core/factory.ts:52` crea `new ToolResolver()` **sin** `toolsProvider` →
  `ContextBuilder` (factory:50) nunca recibe descriptores de tools (`context-builder.ts:72` devuelve `[]`).
- `setupAgentTools()` (`src/lib/agent/setup.ts:4`) registra las tools 3B en el registry legado,
  pero **nunca se invoca** en ninguna parte de `src/` (solo se exporta).
- El registry legado queda vacío en runtime → `ToolResolver.resolveAndExecute` responde
  `Herramienta desconocida` para cualquier tool.
- El `ToolExecutor`/`toolRegistry`/`bridge` de 3B no se usan en ningún flujo productivo.

**Impacto:** la capa de tools 3B es inerte: el asistente responde con modelo puro, sin
capacidad de ejecutar consultas/acciones reales. Todo el código 3B está "en verde" pero
desconectado.

**Tratamiento 3E (sin nueva funcionalidad):** documentar el gap (`AI_ARCHITECTURE_REVIEW.md`),
dejar el cableado pendiente para una fase futura y verificar que el estado actual es estable
y seguro (no hay fuga ni doble ejecución).

### 🔴 3.2 — Aislamiento multi-tenant: vectores confirmados en servicios/repositorios

**V1 — `OrderService.create` acepta `body.storeId` ajeno** (`src/services/order.service.ts:197-205`):
solo verifica que la tienda exista, no que pertenezca al contexto del usuario. Un usuario
autenticado puede crear órdenes atribuidas a otra tienda. Además `ProductRepository.findByIds`
(`product.repository.ts:37`) no filtra por `storeId`, así que los ítems pueden referenciar
productos de otra tienda.

**V2 — Repositorios con métodos por ID sin frontera de `storeId`** (defensa en profundidad).
Los servicios de lectura/escritura validan `storeId` tras el `findById`, pero la frontera
depende de que TODOS los callers pasen por el servicio:

| Repositorio | Métodos sin `storeId` |
|---|---|
| `product.repository.ts` | `findById`, `findByIdWithCategory`, `findByIds`, `update`, `delete`, `decrementStock`, `incrementStock`, `setStock`, `deleteDigitalProduct`, `upsertDigitalProduct` |
| `order.repository.ts` | `findById`, `findByNumber`, `update`, `updateStatus`, `markClientNotified`, `delete`, `findCouponById`, `findSellerById`, `updateCouponUsedCount`, `decrementStock`, `incrementStock` |
| `customer.repository.ts` | `findById`, `update`, `updateTotals`, `updateLastPurchase` |
| `payment.repository.ts` | `findAccountById`, `updateAccount`, `deleteAccount`, `findByOrderId` |
| `agenda.repository.ts` | `findById` (servicio valida `negocioId`) |

**V3 — `ProductRepository.findByIds` sin scope** (ver V1).

**Correcto (verificado):** `MemoryRepository`, `ConversationRepository`, las rutas
`/api/agent/*`, `/api/orders/[id]/*`, `/api/scanner/*` y el checkout validan aislamiento
con `storeId`/`userId` en el `where` o tras el fetch.

### 🔴 3.3 — Índices faltantes en BD

Verificado contra `prisma/schema.prisma`:

| Modelo | Índices existentes | Faltantes |
|---|---|---|
| `Product` | — (ninguno) | `storeId`, `storeId`+`isActive`, `sku`, `barcode` |
| `OrderItem` | `employeeId` | `orderId`, `productId` |
| `OrderPayment` | — (ninguno) | `orderId`, `paymentAccountId` |
| `Expense` | — (ninguno) | `storeId`, `storeId`+`date` |
| `Collection` | — (ninguno) | `storeId` |
| `PaymentAccount` | `storeId`, `storeId+name` | OK |

**Impacto:** las queries más frecuentes (`product.findMany by storeId`, `orderItem by orderId`,
`orderPayment by orderId`) hacen full-scan a medida que crecen los datos.

### 🟡 3.4 — Basura trackeada en git (raíz)

Verificado con `git ls-files`:
- Logs: `dev.log`, `dev-err.log`, `dev-output.log`
- Scripts/archivos de desarrollo: `test-api.cjs`, `posthog-setup-report.md`,
  `instrumentation-client.ts` (NO es convención de Next.js; solo lo referencia el reporte;
  `posthog.init` **no se llama en ningún lado** → los `posthog.capture` son no-ops)
- Assets temporales: `hero fondo.png`, `newfondo.jpeg`,
  `Inventario Mobel Inversiones 20-04-26.xlsx`, `inventarios de prueba/*.xlsx` (5),
  `temp-sources/*.mp4` (18), `temp-vp9/*.webm` (17)
- HTML suelto: `eduvex_framer_website.html`
- Datos: `data/agencias_venezuela.{csv,json}`, `data/resumen.md`

`templates/` y `.backup_scanner/` existen en disco pero NO están trackeados (no son basura git).

### 🟡 3.5 — Features/planes inconsistentes

- `unified_chat`: la UI bloquea el acceso por plan, pero la API `/api/agent/chat` **no valida
  el plan** → gate incompleto.
- `whatsapp_inbox`, `instagram_inbox`, `facebook_inbox`: features declaradas sin implementación
  ni UI (huérfanas).
- Features base (`inventory`, `pos`, `crm`, `reports`) **sin gate** en sus rutas (la página
  `/planes` promete control de plan).

### 🟢 3.6 — PostHog cliente sin init

`posthog-js` se importa en 5 componentes + `instrumentation-client.ts` pero **nunca se llama
`posthog.init()`** → todo `posthog.capture(...)` es no-op. Hay `src/lib/posthog-server.ts`
(server-side) con `posthog.init` propio y `next.config.ts` con rewrites `/ingest`. La mitad
cliente está sin terminar.

---

## 4. Matriz de decisiones y acciones

| # | Hallazgo | Severidad | Acción 3E |
|---|---|---|---|
| 3.1 | Tools 3B huérfanas | Alta (arquitectura) | Documentar; NO cablear en esta fase |
| 3.2 V1 | `OrderService.create` con `body.storeId` ajeno | **Alta (seguridad)** | Corregir: ignorar `body.storeId` salvo `pos` verificando pertenencia |
| 3.2 V2/V3 | Repositorios sin frontera `storeId` | Media (defensa) | Añadir overrides `findById` con `storeId` en repositorios de tools; documentar |
| 3.3 | Índices faltantes | Media (rendimiento) | Añadir `@@index` + `npm run db:push` |
| 3.4 | Basura git | Baja (limpieza) | `git rm` de archivos confirmados muertos |
| 3.5 | Gate plan `unified_chat` incompleto | Media (negocio) | Añadir validación de plan en API chat |
| 3.6 | PostHog cliente sin init | Baja | Documentar; quitar imports muertos si procede |

---

## 5. Documentos de la fase

- `DEAD_CODE_REPORT.md` — código y archivos muertos confirmados
- `AI_ARCHITECTURE_REVIEW.md` — revisión de la arquitectura IA 3A–3D + legado 1C
- `DATABASE_OPTIMIZATION.md` — índices, modelo, observaciones
- `SECURITY_AUDIT_REPORT.md` — aislamiento multi-tenant y vectores
- `PHASE_3E_STABILIZATION_REPORT.md` — reporte final de la fase

---

## 6. Criterios de finalización

- [ ] Lint OK en archivos nuevos/modificados
- [ ] `npm run typecheck` limpio
- [ ] `npm test` verde (265 actuales + nuevos)
- [ ] `npm run build` OK
- [ ] Arquitectura IA revisada y documentada
- [ ] Código muerto importante eliminado
- [ ] Sin rutas rotas ni errores críticos
- [ ] Índices aplicados a BD
- [ ] Docs actualizadas (`ARCHITECTURE.md`, `CHANGELOG.md`, `PANITAS_CURRENT_STATE.md`)
