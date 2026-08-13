# Auditoría de Módulos de Negocio — COBRANZA y PROVEEDORES

> Fecha: 11/08/2026 · Alcance: código fuente de `C:\Users\Usuario\Desktop\PanitasApp\panitas` (Next.js 16, App Router)
> Método: revisión estática de UI, servicios y API REST; sin ejecución ni modificación de código.
> Rutas auditadas: `/dashboard/collection` (Cobranza IA) y `/dashboard/suppliers` (Proveedores), más los módulos con los que se solapan (`/dashboard/creditos`, `/dashboard/finanzas`).

---

## 1. MÓDULO COBRANZA (asistente de cobranza IA)

### 1.1 PROPÓSITO

El módulo prepara recordatorios de cobro para créditos atrasados, con plantillas por categoría/nivel, y lleva un historial de contacto por crédito. Intento documentado en `C:\Users\Usuario\Desktop\PanitasApp\panitas\docs\COLLECTION_AUTOMATION.md` (FASE 6B). **No es envío automático**: la garantía "Panitas nunca envía mensajes automáticamente; solo prepara recordatorios que el dueño revisa y envía" está repetida en 3 lugares:

- `C:\Users\Usuario\Desktop\PanitasApp\panitas\docs\COLLECTION_AUTOMATION.md` (sección de principios)
- `C:\Users\Usuario\Desktop\PanitasApp\panitas\src\services\collection.service.ts:4`
- `C:\Users\Usuario\Desktop\PanitasApp\panitas\src\app\dashboard\collection\page.tsx:21`

Flujo real (todo manual): el usuario selecciona un crédito → elige categoría/nivel/plantilla → pulsa "Preparar mensaje" (POST `/api/collection/prepare`, solo crea `CollectionContact` con status `pending`) → abre `whatsappUrl` en WhatsApp → pulsa "Marcar como enviado" (POST `/api/collection/contacts`). No existe ningún envío automático por cron ni integración WhatsApp Business API.

### 1.2 PANTALLAS / LISTADO

No existe una sub-ruta `/dashboard/collection/[id]`. El módulo es una sola página con 3 pestañas (`src\app\dashboard\collection\page.tsx`): **asistente** (SendAssistant), **plantillas** (TemplateEditor) y **métodos de pago** (PaymentMethodsManager).

La pestaña "asistente" (`src\components\dashboard\collection\send-assistant.tsx`) tiene dos columnas:

- **Columna izquierda — "¿A quién contactar hoy?"** (`send-assistant.tsx:207`): lista de recomendaciones de `GET /api/collection/recommendations?limit=20` (`send-assistant.tsx:76`). Cada fila muestra cliente, saldo, orden, nivel sugerido, días vencidos y "contactado hace Nd / sin contactar" (`send-assistant.tsx:214-253`). Debajo, bloque **"Buscar otro crédito"** (`send-assistant.tsx:258-288`) que llama `GET /api/creditos?status=all&search=...&limit=15` (`send-assistant.tsx:146`) y filtra en cliente los estados `paid`/`cancelled` (`send-assistant.tsx:150`).
- **Columna derecha — "Asistente de envío"** (`send-assistant.tsx:294`): form categoría + nivel + plantilla + mensaje editable con variables (`send-assistant.tsx:308-388`), botón "Preparar mensaje" (`send-assistant.tsx:390`), tarjeta "Mensaje preparado (no enviado)" con enlace "Abrir en WhatsApp" y "Marcar como enviado" (`send-assistant.tsx:396-437`), e "Historial de contacto" embebido (`send-assistant.tsx:439-441`).

**No hay paginación** en las recomendaciones (fijo 20, `send-assistant.tsx:76`), ni filtros por estado/antigüedad dentro del asistente (los consume ya ordenados por el servicio: vencidos primero, luego sin contactar, luego por días desde contacto — `collection.service.ts:580-594`).

### 1.3 PANTALLA DE DETALLE

No existe pantalla de detalle propia. El "detalle" del crédito cobrado vive en `/dashboard/creditos/[id]` (`src\app\dashboard\creditos\[id]\page.tsx`), que **embebe** `ContactHistory` para mostrar el historial de contacto de cobranza (`contact-history.tsx`). El asistente también muestra ese historial inline (`send-assistant.tsx:440`). Consecuencia: hay dos representaciones del mismo historial (asistente y detalle de crédito), y el asistente no muestra ni los abonos ni las cuotas del crédito que está cobrando, solo saldo y vencimiento.

### 1.4 ACCIONES

| Acción | Dónde | Endpoint |
|---|---|---|
| Ver recomendaciones | `send-assistant.tsx:74-85` | `GET /api/collection/recommendations?limit=20` |
| Buscar crédito | `send-assistant.tsx:142-156` | `GET /api/creditos?status=all&search=&limit=15` |
| Preparar mensaje | `send-assistant.tsx:171-199` | `POST /api/collection/prepare` (crea `CollectionContact` status `pending`) |
| Abrir en WhatsApp | `send-assistant.tsx:406-413` | `wa.me` link (`collection.service.ts:464`) |
| Marcar enviado/respondido | `send-assistant.tsx:417-433` | `POST /api/collection/contacts` (status `sent`/`responded`) |
| CRUD plantillas | `template-editor.tsx` | `GET/POST /api/collection/templates` |
| Restaurar plantillas por defecto | `template-editor.tsx` | `POST /api/collection/templates/restore` |
| CRUD métodos de pago + nivel por defecto | `payment-methods-manager.tsx` | `PUT /api/collection/settings` |

**Endpoint sin UI**: `DELETE /api/collection/templates/[id]` (que en realidad restaura la plantilla built-in en vez de borrar) **no tiene ningún llamador en el frontend** — verificado con grep: ningún `fetch` a `collection/templates/{id}` con método DELETE. Es una ruta muerta.

**Config muerta**: el setting `defaultLevel` (select "Nivel por defecto" en `payment-methods-manager.tsx:128-129`) se guarda en BD (`collection.service.ts:322-344`) y se devuelve por `getSettings` (`collection.service.ts:314`), pero **nunca se consume** ni en `recommendations` (`collection.service.ts:562` usa `suggestLevel`) ni en `prepare` (`collection.service.ts:390` usa `input.level ?? suggestLevel`). El asistente siempre usa el nivel sugerido por días de atraso. El usuario puede configurar un nivel por defecto que no tiene ningún efecto.

### 1.5 DUPLICACIONES

1. **`suggestLevel`/`suggestCategory` duplicados cliente/servidor**: `send-assistant.tsx:41-53` (cliente, para "sugerido N") y `collection.service.ts:609-613` + `:670` (servidor). Mismos umbrales (11/3 días), riesgo de desincronización.
2. **Construcción de enlace WhatsApp duplicada**: `normalizePhone` + `wa.me` en `collection.service.ts:464` y `:836-837` vs `whatsappLink` en `src\components\dashboard\credits\credit-types.ts:164-167`. Misma normalización +58 en dos sitios.
3. **WhatsApp "crudo" fuera del asistente**: la tarjeta de crédito (`src\components\dashboard\credits\credit-card.tsx:96`) y el detalle de crédito (`creditos\[id]\page.tsx:102-104` y `:131-133`) tienen botón WhatsApp con un mensaje hardcodeado que **no pasa por el asistente**: no usa plantilla, no crea `CollectionContact`, no queda en el historial de cobranza.
4. **Tarjetas locales**: `send-assistant.tsx:449-472` define un componente `Card` propio (`rounded-2xl border bg-card p-4`) en lugar de usar `@/components/ui/card`.
5. **Historias de contacto en dos lugares**: `contact-history.tsx` se renderiza en `send-assistant.tsx:440` y en `creditos/[id]`; misma llamada `GET /api/collection/contacts?orderId=`.
6. **KPIs duplicados entre módulos**: ver §3.3 (finanzas muestra "Por cobrar", "Por pagar", "Cuentas vencidas").
7. **Canal "whatsapp" fijo**: `COLLECTION_CHANNELS = ["whatsapp","call","sms","email","other"]` (`collection.service.ts:38`) y el prepare acepta `channel` (`collection.service.ts:421`), pero la UI del asistente siempre envía `whatsapp`; no hay selector de canal ni se muestra el canal en el historial.

### 1.6 DATOS

- **Fuentes**: órdenes con crédito (`creditStatus`, `installments`) + `collectionContacts` (tabla `CollectionContact` con `status: pending|sent|responded`), agregadas en `computeCreditVars` (`collection.service.ts:552`).
- **Derivados (no persistidos)**: `suggestedLevel` y `suggestedCategory` calculados en `recommendations` (`collection.service.ts:562-575`), orden de prioridad `collection.service.ts:580-594`.
- **Plantillas**: 5 categorías/plantillas built-in sembradas en `ensureBuiltInTemplates` (`collection.service.ts:617-...`); 8 variables `{{cliente}}`, `{{saldo}}`, `{{monto_abono}}`, `{{fecha_vencimiento}}`, `{{dias_atraso}}`, `{{metodos_pago}}`, `{{nombre_negocio}}` (ver `template-editor.tsx`). El render usa `renderTemplate` (`collection.service.ts:600-606`).
- **Config**: `CollectionSettings` (paymentMethods, defaultLevel — muerto, businessName) vía `getSettings`/`saveSettings` (`collection.service.ts:308-366`).
- **Bug latente de datos**: al seleccionar un crédito por búsqueda, `attempts` se hardcodea en `0` (`send-assistant.tsx:167`), por lo que `suggestCategory` en cliente puede sugerir `ultimo_aviso` incorrectamente (o no sugerirlo) para clientes ya contactados varias veces.

### 1.7 COMPONENTES

| Componente | Ruta | Notas |
|---|---|---|
| `SendAssistant` | `src\components\dashboard\collection\send-assistant.tsx` (472 líneas) | Mono-componente: lista + form + preview + historial. Su propio `Card`. |
| `ContactHistory` | `src\components\dashboard\collection\contact-history.tsx` (113 líneas) | Reutilizado en detalle de crédito. |
| `TemplateEditor` | `src\components\dashboard\collection\template-editor.tsx` (247 líneas) | Preview con `SAMPLE_VALUES`, restaurar defaults. |
| `PaymentMethodsManager` | `src\components\dashboard\collection\payment-methods-manager.tsx` (192 líneas) | Reordenar métodos, nivel por defecto (muerto). |
| `collection-types.ts` | `src\components\dashboard\collection\collection-types.ts` (127 líneas) | Tipos + `CATEGORY_META/ORDER`, `LEVEL_META`, `STATUS_META`. |
| Servicio | `src\services\collection.service.ts` (839 líneas) | Lógica de negocio, eventos `collection.*`. |
| API | `src\app\api\collection\` — `recommendations`, `prepare`, `contacts`, `settings`, `templates`, `templates\restore`, `templates\[id]` | 7 rutas; una muerta (ver §1.4). |

Patrón UI: no usa los componentes compartidos de búsqueda/filtro (`SearchInput`, `FilterChip`, `Pagination`) — usa `Input` + botón "Buscar" manual (`send-assistant.tsx:258-269`).

### 1.8 RESPONSIVE

- Layout principal: `grid gap-5 lg:grid-cols-2` (`send-assistant.tsx:204`) → en móvil apila las columnas (bien).
- La página contenedora usa `Tabs` estándar (`page.tsx`); el `TabsList` no tiene scroll en móvil (mismo issue conocido de tabs en configuración, aunque con solo 3 pestañas es tolerable).
- Los inputs de `grid sm:grid-cols-2` (`send-assistant.tsx:308`) apilan bien.
- No hay problema grave de responsive detectado en este módulo, pero el historial de contacto en columna estrecha puede quedar apretado (`contact-history.tsx`).

### 1.9 PROBLEMAS DE UX

1. **Nombre inconsistente**: la barra lateral dice "Cobranza IA" (`src\components\layout\sidebar.tsx:108`), la página dice "Cobranza Inteligente" (`page.tsx`), y el módulo de créditos (que es donde se hace el cobro real) dice "Centro de Cobranza" (`creditos\page.tsx` H1 y `creditos\[id]\page.tsx:110`) y en el sidebar "Créditos" (`sidebar.tsx:105`). El usuario no sabe si cobranza está en "Cobranza IA" o en "Créditos".
2. **Flujo partido en dos módulos**: las recomendaciones de cobranza viven en `/dashboard/collection`, pero los abonos/cuotas/cancelación viven en `/dashboard/creditos`. No hay navegación cruzada entre la recomendación y el detalle del crédito.
3. **Búsqueda sin debounce y sin `SearchInput` compartido** (`send-assistant.tsx:260-269`): requiere Enter o clic; inconsistente con créditos/proveedores que usan debounce 350ms (`suppliers\page.tsx:96`).
4. **`attempts: 0` en búsquedas** (`send-assistant.tsx:167`): sugerencia de categoría incorrecta para créditos encontrados por búsqueda.
5. **Sin persistencia de preferencias**: el módulo de cobranza no guarda la pestaña activa ni la selección (a diferencia de créditos y proveedores que usan business-memory).
6. **Nivel por defecto configurable pero inerte** (ver §1.4): confusión garantizada.
7. **El historial de contacto no muestra el canal** (siempre whatsapp) ni distingue visualmente "preparado" vs "enviado" vs "respondido" con la fuerza que debería para una herramienta de seguimiento.
8. **No hay "Preguntar a Panitas"** en este módulo (el patrón existe en finanzas/atención vía `assistantHref`, `src\components\dashboard\financial\financial-types.ts:203`).
9. **Rutas API sin control de rol**: los endpoints de collection usan `getCurrentStore()` y no `requireRole(...)` (existe en `src\lib\permissions.ts:289`); el gating es solo de navegación en el sidebar.

### 1.10 PROPUESTA DE REDISEÑO

- **Unificar nombre y ruta**: un solo "Centro de Cobranza" que integre créditos + asistente IA, o enlace cruzado bidireccional claro entre "Cobranza IA" y cada crédito.
- **Estructura Lista → Detalle**: `/dashboard/collection` como lista de recomendaciones con filtros (estado, categoría, nivel sugerido) + paginación (`Pagination`/`PaginationLinks` de `src\components\ui\`) y búsqueda con `SearchInput` debounced. Al seleccionar, abrir `/dashboard/creditos/[id]?modo=cobranza` donde el panel de mensaje (categoría/nivel/plantilla/preview) viva como sección "Contactar" dentro del detalle, junto a abonos/cuotas/historial. Así desaparece el split de flujo.
- **Una sola fuente de lógica**: mover `suggestLevel`/`suggestCategory` y `whatsappLink` a un módulo compartido (`src\lib\collection.ts`) usado por cliente y servidor.
- **Eliminar la config muerta**: quitar `defaultLevel` del settings o consumirlo en `recommendations`/`prepare`.
- **Sacar el WhatsApp "crudo"**: los botones WhatsApp de `credit-card.tsx:96` y `creditos\[id]\page.tsx:131` deben pasar por el asistente (crear `CollectionContact`) o al menos abrir el panel de cobranza con la plantilla sugerida.
- **Quitar `DELETE /api/collection/templates/[id]`** si no va a tener UI, o exponer "Restaurar" per-plantilla.

---

## 2. MÓDULO PROVEEDORES

### 2.1 PROPÓSITO

Registrar proveedores, compras (facturas) y pagos/abonos sobre cuentas por pagar, con saldo automático y estado derivado. Intento documentado en `C:\Users\Usuario\Desktop\PanitasApp\panitas\docs\SUPPLIER_CENTER.md` (FASE 6C). La página H1 se llama "Centro de Proveedores" (`src\app\dashboard\suppliers\page.tsx:110`).

### 2.2 PANTALLAS / LISTADO

Lista en `src\app\dashboard\suppliers\page.tsx` (194 líneas):

- **Filtros**: chips Todos/Al día/Por vencer/Vencidos/Saldados/Inactivos (`page.tsx:19-26`, render en `:130`).
- **Búsqueda**: `Input` con debounce 350ms (`page.tsx:94-100`), misma firma que créditos.
- **KPIs**: `KpiGrid` con 6 tarjetas (Total por pagar, Facturas abiertas, Vencidas + monto, Por vencer 7 días, Pagado este mes, Recuperación) — `src\components\dashboard\suppliers\kpi-grid.tsx`.
- **Lista**: tarjetas apiladas full-width `space-y-3` (`page.tsx:166-168`) con `SupplierCard` (avatar iniciales, nombre + chip de estado, saldo, barra % pagado, badge vencido, próxima fecha, RIF, botones "Registrar abono", "Registrar compra") — `src\components\dashboard\suppliers\supplier-card.tsx`.
- **Persistencia de preferencias**: guarda solo el filtro (NO la búsqueda) en business-memory (`page.tsx:40-72`), a diferencia de créditos que guarda filtro + búsqueda (`creditos\page.tsx:58-71`).

### 2.3 PANTALLA DE DETALLE

`src\app\dashboard\suppliers\[id]\page.tsx` (316 líneas), estructura casi idéntica a `creditos\[id]`:

- Header con back-link, nombre + chip estado (`:130-137`), y acciones: **Registrar pago** (HandCoins), **Registrar compra** (PackagePlus), **Editar** (Pencil), **Desactivar/Activar** (Power), **Eliminar** (Trash2, `:138-158`).
- Tarjeta saldo: saldo pendiente + 3 mini-estadísticas (Compras/Pagado/Facturas, `:176-189`), barra % pagado (`:192-197`), fila vencimiento (`:199-216`).
- **Facturas** (lista, `:220-269`): estado por chip, barra de abono parcial.
- Grid `lg:grid-cols-2` (`:271`): **Pagos registrados** (`:272-295`) + **Historial** con `Timeline` (`:297-304`).
- Modales: `PaymentModal`, `PurchaseModal`, `SupplierFormModal` (`:307-313`).

La eliminación está protegida en el servicio: FASE 8G bloquea borrar proveedores con cuentas por pagar abiertas (`src\services\supplier.service.ts:303-309`).

### 2.4 ACCIONES

| Acción | Dónde | Endpoint |
|---|---|---|
| Listar (filtro + búsqueda) | `suppliers\page.tsx:74-88` | `GET /api/suppliers?status=&search=` |
| Crear proveedor | `supplier-form-modal.tsx` | `POST /api/suppliers` |
| Detalle | `[id]\page.tsx` | `GET /api/suppliers/[id]` |
| Editar / activar-desactivar | `[id]\page.tsx:149-154` | `PATCH /api/suppliers/[id]` |
| Eliminar (bloqueado si cuentas abiertas) | `[id]\page.tsx:88` | `DELETE /api/suppliers/[id]` |
| Registrar compra/factura | `purchase-modal.tsx` | `POST /api/suppliers/[id]/purchases` |
| Registrar pago/abono (cascada oldest-first) | `payment-modal.tsx` | `POST /api/suppliers/[id]/payments` |

Cascada de pagos: el monto se aplica a las facturas pendientes más antiguas por fecha de vencimiento (oldest-first) (`supplier.service.ts:410-427`, `:494`). `recordPurchase` acepta `supplierId` o `supplierName` con auto-creación del proveedor (`supplier.service.ts` — FASE 6C).

### 2.5 DUPLICACIONES

1. **Página espejo de créditos**: `suppliers\[id]\page.tsx` y `creditos\[id]\page.tsx` comparten ~80% de estructura (header + chip, tarjeta saldo + 3 mini-stats `grid-cols-3`, barra %, fila vencimiento, grid 2 columnas, tarjeta pagos, tarjeta historial). Idénticas en `max-w-4xl space-y-5`, back-link, `grid gap-5 lg:grid-cols-2`.
2. **`KpiGrid` copiado**: `suppliers\kpi-grid.tsx:29` y `credits\kpi-grid.tsx:29` tienen exactamente el mismo layout `grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6`.
3. **`PaymentModal` casi idéntico**: `suppliers\payment-modal.tsx` vs `credits\payment-modal.tsx` (mismo form: monto ≤ saldo, fecha default hoy, método, referencia, notas; `grid grid-cols-2 gap-2` en `:103` ambas).
4. **`Timeline` duplicado**: `src\components\dashboard\suppliers\timeline.tsx` (3 tipos: created/invoice/payment) vs `src\components\dashboard\credits\timeline.tsx` (8 tipos incl. `reminder_sent`/`client_responded`, alimentado desde `credit.service.ts:684-703`). Mismo patrón visual (línea + iconos de color) en dos implementaciones separadas.
5. **KPIs cruzados con finanzas**: `src\components\dashboard\financial\kpi-grid.tsx:88-103` muestra "Por cobrar", "Por pagar" y "Cuentas vencidas" (`overdueCredits + overdueSupplierInvoices`) — duplica en el panel ejecutivo los totales que cobranza y proveedores ya muestran por separado.
6. **Estados derivados duplicados**: `stateOf` en `supplier.service.ts:696` y `toSummary` en `credit.service.ts:504-590` implementan la misma lógica de "estado por fechas/saldo" para dos dominios paralelos.
7. **Sin `EmptyState` consistente en detalle**: los listados vacíos usan `<p className="text-xs ...">` inline (`[id]\page.tsx:226`, `:278`) en vez del componente compartido `EmptyState`.

### 2.6 DATOS

- **Modelo**: `Supplier` + `SupplierInvoice` (facturas/ordenes de compra con `amount`, `paidAmount`, `dueDate`, `status`) + `SupplierPayment` (método, referencia, notas). El saldo es automático (`totalPurchased - totalPaid`).
- **Estados** (derivados, no persistidos): `saldado | al_dia | por_vencer | vencido | inactivo` (`supplier-types.ts` / `stateOf` en `supplier.service.ts:696`).
- **KPIs** calculados por listado (`supplier.service.ts:173-...`), no persistidos.
- **Consistencia con gastos**: el registro de compras a proveedor convive con el módulo de gastos (`finanzas`); `recordPurchase` con `supplierName` puede crear proveedor on-the-fly. Riesgo de doble registro (compra en proveedores + gasto manual en finanzas) que el módulo no previene.

### 2.7 COMPONENTES

| Componente | Ruta | Notas |
|---|---|---|
| `SupplierCard` | `src\components\dashboard\suppliers\supplier-card.tsx` (108 líneas) | Avatar, chip, saldo, barra, badge vencido, 2 CTAs. |
| `KpiGrid` | `src\components\dashboard\suppliers\kpi-grid.tsx` (68 líneas) | 6 tarjetas; copia literal de créditos. |
| `PaymentModal` | `src\components\dashboard\suppliers\payment-modal.tsx` (137 líneas) | Casi copia de créditos. |
| `PurchaseModal` | `src\components\dashboard\suppliers\purchase-modal.tsx` (156 líneas) | Compra/factura. |
| `SupplierFormModal` | `src\components\dashboard\suppliers\supplier-form-modal.tsx` (159 líneas) | Crear/editar. |
| `Timeline` | `src\components\dashboard\suppliers\timeline.tsx` (52 líneas) | Duplicado de créditos. |
| `supplier-types.ts` | `src\components\dashboard\suppliers\supplier-types.ts` (223 líneas) | Tipos + `STATE_META`, `PAYMENT_METHODS`, `SUPPLIER_CATEGORIES`, helpers. |
| Servicio | `src\services\supplier.service.ts` (832 líneas) | `stateOf`, cascada oldest-first, eventos `supplier.*`. |
| API | `src\app\api\suppliers\` — `route.ts`, `[id]\route.ts`, `[id]\purchases`, `[id]\payments` | 5 archivos. |

### 2.8 RESPONSIVE

- KPIs: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` (`kpi-grid.tsx:29`) → bien.
- Tarjetas de lista: apiladas full-width (`page.tsx:166`) → en desktop desperdician ancho horizontal frente a un grid `sm:grid-cols-2 lg:grid-cols-3`.
- Header del detalle: `flex-col sm:flex-row` (`[id]\page.tsx:130`) → en móvil el botón "Eliminar" (destructivo) queda junto a los demás sin más peso visual que "Registrar pago".
- Mini-stats del detalle: `grid-cols-3 gap-4` fijo (`[id]\page.tsx:176`) → apretado en pantallas ≤360px con montos largos (BS/bolívares).
- Modales: usan `Dialog` estándar (`payment-modal.tsx`, `purchase-modal.tsx`, `supplier-form-modal.tsx`); en móvil los `grid-cols-2` internos (`purchase-modal.tsx:108`) pueden quedar estrechos.

### 2.9 PROBLEMAS DE UX

1. **Página espejo de créditos** mantiene la complejidad duplicada (ver §2.5.1): cualquier mejora de UX al detalle de crédito hay que replicarla aquí.
2. **No hay paginación**: `list` limita a `Math.min(limit, 500)` (`supplier.service.ts:173`) y el front hace `limit` fijo; con muchos proveedores la lista degrada (misma crítica que cobranza).
3. **Preferencias guardadas incompletas**: solo filtro, no búsqueda (`page.tsx:59-72`), mientras créditos guarda ambas.
4. **Botón "Eliminar" siempre visible** en el header (`[id]\page.tsx:155-157`): sin confirmación adicional visible en el flujo (el `handleDelete` confirmaría en la práctica, pero compite visualmente con las acciones primarias).
5. **Búsqueda sin coincidencia con la búsqueda de facturas**: buscar por "número de factura" o "RIF" requiere leer la lógica del endpoint (busca por `name|ruc`); el placeholder no lo aclara.
6. **Sin atajos a cobranza**: un proveedor vencido no ofrece "contactar/avisar" (patrón WhatsApp no existe en proveedores, a diferencia de créditos).
7. **Fricción de doble registro gasto vs compra** (ver §2.6): el usuario puede registrar una compra en proveedores y además el gasto en finanzas, duplicando la salida de dinero.
8. **Sin "Preguntar a Panitas"** ni en lista ni en detalle (mismo hueco que cobranza).

### 2.10 PROPUESTA DE REDISEÑO

- **Reutilizar el patrón de listas**: `SearchInput` debounced + `FilterChip` + `Pagination`/`PaginationLinks` (como `orders\page.tsx:179-185`), y grid de tarjetas `sm:grid-cols-2 lg:grid-cols-3` para no desperdiciar desktop.
- **Extraer componentes compartidos de saldo/actividad**: un `EntityHeader`, `BalanceCard`, `PaymentsCard` y `Timeline` genéricos en `src\components\dashboard\shared\`, usados por créditos y proveedores, eliminando la página espejo.
- **Detalle**: agrupar acciones primarias (Registrar pago/compra) y mover Editar/Desactivar/Eliminar a un menú contextual (`DropdownMenu`) para reducir el ruido del header en móvil.
- **Prevención de doble registro**: al crear un gasto en finanzas con categoría de compra, ofrecer "vincular a proveedor" o descontar la cuenta por pagar (integración con `recordPurchase`).
- **Notificaciones/contacto**: botón "Avisar por WhatsApp" en un proveedor vencido (reutilizando el flujo manual de cobranza, sin auto-envío).

---

## 3. PATRONES COMPARTIDOS Y HALLAZGOS TRANSVERSALES

### 3.1 Duplicación estructural de módulos "saldo + vencimiento"

Cobranza (créditos), proveedores y finanzas implementan cada uno su propio par "estado derivado + KPI grid + barra de pago + timeline". La base de datos y los eventos (`collection.*`, `supplier.*`) están limpios, pero la UI se copió en 3 lugares. El módulo de créditos es la "página espejo" de proveedores y viceversa.

### 3.2 Duplicación de lógica de negocio

- `suggestLevel`/`suggestCategory`: `send-assistant.tsx:41-53` y `collection.service.ts:609-613/670`.
- `whatsappLink` vs `normalizePhone`+`wa.me`: `credit-types.ts:164-167` y `collection.service.ts:464/836-837`.
- `stateOf`/`toSummary`: `supplier.service.ts:696` y `credit.service.ts:504-590`.
- Cascada de pagos: `supplier.service.ts:410-427` (oldest-first) — mismo concepto que la cascada de abonos en créditos (installments), implementado por separado.

### 3.3 KPIs duplicados en panel ejecutivo

`src\components\dashboard\financial\kpi-grid.tsx:88-103` ("Por cobrar", "Por pagar", "Cuentas vencidas") repite los KPIs de cobranza (`credits\kpi-grid.tsx`) y proveedores (`suppliers\kpi-grid.tsx`) con los mismos cálculos `totalPending`/`totalPayable`/`overdue`.

### 3.4 Inconsistencias de UX menores

- **Persistencia de preferencias** inconsistente: créditos guarda filtro + búsqueda (`creditos\page.tsx:58-71`); proveedores solo filtro (`suppliers\page.tsx:59-72`); cobranza no guarda nada.
- **Búsqueda** inconsistente: `SearchInput` debounced en créditos/proveedores vs `Input` + botón en el asistente de cobranza (`send-assistant.tsx:260-269`).
- **Nombres de módulos** inconsistentes (Créditos / Cobranza IA / Cobranza Inteligente / Centro de Cobranza / Centro de Proveedores) — `sidebar.tsx:105-111`.
- **"Preguntar a Panitas"** presente en finanzas (`financial\financial-types.ts:203`, `executive-summary.tsx`) y atención (`attention-center.tsx:227`), ausente en cobranza y proveedores. Mecanismo listo vía `assistantHref()` / `AssistantProvider.openAssistant()`.

### 3.5 Recomendaciones transversales priorizadas

1. Crear `src\components\dashboard\shared\` con `BalanceCard`, `PaymentsCard`, `EntityTimeline`, `EntityHeader` y consumirlos en créditos + proveedores (elimina la página espejo, ~600 líneas duplicadas).
2. Mover `suggestLevel`, `suggestCategory` y el builder de `wa.me` a `src\lib\collection.ts` compartido (cliente + servidor).
3. Unificar persistencia de preferencias y búsqueda en un hook `useEntityListPreferences`.
4. Integrar "Preguntar a Panitas" contextual en cobranza y proveedores.
5. Eliminar endpoints/config sin UI (`DELETE /api/collection/templates/[id]`, `defaultLevel`).

---

## 4. CONCLUSIÓN

Ambos módulos cumplen su función de negocio y están correctamente documentados (FASE 6B/6C), con la garantía de **envío manual** claramente respetada en cobranza. El principal riesgo no es funcional sino de **mantenimiento y coherencia de UX**: dos módulos que son espejo el uno del otro (créditos ↔ proveedores), lógica de negocio duplicada cliente/servidor, KPIs replicados en finanzas, config y endpoints muertos, y nombres/rutas inconsistentes. La deuda es ~1.500–2.000 líneas de UI duplicada que se puede consolidar sin tocar el modelo de datos.
