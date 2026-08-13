# Auditoría UX — Módulos INVENTARIO y VENTAS

**App:** Panitas (Next.js 16 · App Router) — `C:\Users\Usuario\Desktop\PanitasApp\panitas`
**Alcance:** solo lectura / investigación (sin cambios de código)
**Objetivo:** mapa completo de pantallas, componentes, flujos, duplicaciones y problemas de UX para una propuesta de rediseño.

---

## 0. Lectura rápida del documento

- **INVENTARIO** = ruta `/dashboard/products` y sus 3 sub-rutas (`new`, `[id]/edit`, `import`).
- **VENTAS** = 3 rutas separadas y en competencia: `/dashboard/pos` (POS completo), `/dashboard/nueva-venta` (POS duplicado y minimalista), `/dashboard/orders` (listado de pedidos) + `/dashboard/orders/[id]` (detalle).
- La navegación está fragmentada y con etiquetas inconsistentes:
  - `sidebar.tsx:80` — `/dashboard/products` → **"Inventario"** (icono Package, `allRoles`).
  - `sidebar.tsx:83` — `/dashboard/pos` → **"Ventas"** (icono Banknote, admin/manager/seller).
  - `sidebar.tsx:98` — `/dashboard/orders` → **"Pedidos"** (icono ShoppingCart, `badge: true`).
  - `bottom-nav.tsx:28` — `/dashboard/products` → **"Productos"** (otra etiqueta que el sidebar).
- `/dashboard/nueva-venta` NO aparece en ninguna navegación; solo se alcanza por links generados por el asistente de IA (`src/lib/conversation-ai/conversation-types.ts:146-149`: `create_quote`, `create_order`, `register_sale`).
- Los 3 módulos están desarrollados como "solo frontend sobre APIs", con el dominio de negocio repartido en `src/services/*.service.ts` + `src/repositories/*.repository.ts`.

---

## MÓDULO 1 — INVENTARIO

### 1.1 Propósito
Gestionar el catálogo de productos del negocio: CRUD, precios (detalle y mayor), tallas, stock, histórico de movimientos, importación masiva (Excel y asistida por IA) y etiquetado por categorías. Es además la fuente de datos que consumen POS y tienda pública.

### 1.2 Pantallas / Listado

| Ruta | Archivo | Tipo | Rol |
|---|---|---|---|
| `/dashboard/products` | `src\app\dashboard\products\page.tsx` (123 líneas) | Server component | Listado + filtros |
| `/dashboard/products/new` | `src\app\dashboard\products\new\page.tsx` (33 líneas) | Server component | Formulario nuevo |
| `/dashboard/products/[id]/edit` | `src\app\dashboard\products\[id]\edit\page.tsx` (33 líneas) | Server component | Edición + histórico |
| `/dashboard/products/import` | `src\app\dashboard\products\import\page.tsx` (54 líneas) | Server component | Importador masivo |

**Listado (`products/page.tsx`):**
- Es un **server component** que consulta Prisma directo (`products/page.tsx:19-52`): `where: { storeId, name: { contains: q, mode: "insensitive" }, categoryId }`, `include: { category: true }`, `orderBy: { createdAt: "desc" }`.
- **Sin paginación**: trae TODOS los productos del store en una sola query.
- Cabecera (`products/page.tsx:56-74`): título **"Productos"** + botones `Importar Excel` (solo si plan comercio/mayorista, línea 25) y `Nuevo Producto`.
- Filtros (`products/page.tsx:76-102`): input `q` (busca por nombre solamente) en un `<form>` con GET, y `<select>` de categoría. **No hay búsqueda por SKU ni por código de barras.**
- Contenido (`products/page.tsx:104-120`): `<ProductsAccordion>` dentro de un `<Card>`. Estado vacío solo con texto "No hay productos aún" + botón "Crear primer producto".
- Estructura del listado (`products-accordion.tsx`): acordeón por categoría; cada categoría es una `<Table>` con columnas Imagen / Nombre / Precio / Stock / Estado / Acciones. Stock con semáforo implícito: rojo "Agotado" si `stock<=0`, ámbar si `stock<=5` (`products-accordion.tsx:95-103`). Acciones: enlace "Editar" + `DeleteProductButton`.
- El estado vacío está duplicado: una vez en `products/page.tsx:106-115` y otra vez dentro de `products-accordion.tsx:167-173`.

**Crear (`new/page.tsx`):** página centrada con título "Crear Producto" y subtítulo, `max-w-2xl`, monta `<ProductForm>`.

**Editar (`[id]/edit/page.tsx`):** misma página, monta `<ProductForm>` + `<ProductStockHistory>` (etiquetado `data-tour="stock-history"` para el onboarding). No valida en servidor que el producto exista antes de renderizar.

**Importar (`import/page.tsx`):** gated por plan en servidor (redirige a `/dashboard/products` si no es comercio/mayorista). Fondo decorativo con blobs `bg-[radial-gradient...]`/`blur-3xl` y monta `<ImportWizard>`.

### 1.3 Pantalla de detalle
No existe una pantalla de detalle de producto (solo edición + histórico en la misma página). El histórico (`product-stock-history.tsx`):
- Llama a `/api/products/stock?productId=X&limit=50` con **límite 50 hardcodeado** (`product-stock-history.tsx:24`), pese a que la API soporta paginación, `type`, `from`, `to` (`src\app\api\products\stock\route.ts:16-25`).
- `typeConfig` (`product-stock-history.tsx:35-43`): traduce `increase/decrease/adjustment/sale/purchase/return/transfer` → Entrada / Salida / Ajuste / Venta / Compra / Devolución / Transferencia.
- Sin filtros ni paginación en UI; tabla pequeña con columna Importe y badges por tipo.

### 1.4 Acciones
- **Crear/editar producto** → `ProductForm` (`product-form.tsx`, 1.545 líneas, el componente más grande del dashboard).
  - Campos: nombre, SKU (generador automático en `src\services\product.service.ts:20-30`), código de barras con flujo de escaneo por teléfono (Pusher + `MobileCameraScanner` + `html5-qrcode`; sesión de escáner con polling de respaldo en `product-form.tsx:415-443`), unidad base, `hasSizes` + constructor de tallas (`product-form.tsx:1200-1230`), `isWholesale` + escalas `PriceScale {quantity, price}` (`product-form.tsx:36-39`), precio/costo, descripción con mini editor (negrita, H3, H4, enlace), imágenes, categoría con **creación inline de categoría nueva**.
  - Validación de servidor en `product.service.ts:53-227` (create) y `:229-444` (update): límites de plan, límites por campo (`LIMITS.*`), validación de escalas y tallas, tipo digital (`productType === "digital"` con stock forzado 999999, línea 169).
  - Emite auditoría y eventos de dominio (`createAuditEntry`, `eventService.emit`, `fireDomainEvent`) en cada operación.
- **Eliminar** → `DeleteProductButton` (`products-table.tsx`): **doble confirmación defectuosa** — `confirm()` nativo (`products-table.tsx:25`) Y un `Dialog` con "¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer." (`products-table.tsx:41-51`).
- **Importar** → `ImportWizard` (`import-wizard.tsx`, 626 líneas): 3 pasos (`upload` → `mapping` → `result`) + paso `ai-confirm`. `REQUIRED_FIELDS = ["name","price"]` (`import-wizard.tsx:44`), `FIELD_LABELS` (`import-wizard.tsx:28-42`). Usa `parseFile`, `mapRows`, `parseInventoryWithAI` de `@/lib/import-engine` y `@/lib/ai`. La API `/api/products/import-ai` auto-crea categorías, genera SKUs si faltan y respeta el límite de plan (`src\app\api\products\import-ai\route.ts:56-93`).
- **Ajuste de stock** → solo por la API `POST /api/products/stock` (rol admin/manager); **no hay UI** en los módulos auditados que exponga "ajuste manual" (se hace indirectamente editando el campo stock del formulario).

### 1.5 Duplicaciones
- **Doble confirmación de borrado** (`confirm()` + Dialog) en `products-table.tsx:25` y `:41-51`.
- **Estado vacío duplicado** (`products/page.tsx:106-115` y `products-accordion.tsx:167-173`).
- **Gating de importación duplicado**: en la página (`products/import/page.tsx` redirige) y en las APIs `/api/products/import` y `/api/products/import-ai` (ambas rechazan con 403).
- **Listado duplicado en el dominio**: el listado server (`products/page.tsx`) consulta Prisma directo, mientras POS consume `GET /api/products?limit=200` y re-deriva categorías en cliente (`pos/page.tsx:140-150`). No hay un único componente de lista reutilizable.
- **Componentes UI casi idénticos para construir catálogo**: `ProductsAccordion` (dashboard) vs el grid de productos de POS (`pos/page.tsx:745-828`) vs el grid de `nueva-venta` (`nueva-venta/page.tsx:257-312`). Tres implementaciones del mismo patrón "agrupar por categoría + chevron".

### 1.6 Datos
- **Server (Prisma, Product model)**: id, name, description, price, costPrice, sku, barcode, stock, unidadBase, productType (physical/digital), images (JSON string), isActive, categoryId, isWholesale, wholesaleLabel, wholesalePrice, wholesaleScales (JSON), hasSizes, sizes (JSON), featured, storeId, timestamps. Digital: relación `digitalProduct` (fileUrl, fileType, downloadLimit, expirationDays, instructions, purchaseMessage).
- **Lo que el listado muestra vs lo que existe**: la UI lista solo Imagen/Nombre/Precio/Stock/Estado; el modelo tiene muchísimo más (barcode, tallas, escalas mayoristas, tipo digital, descripción) que no aparece en ninguna lista. No hay columna de SKU en el listado del dashboard (el SKU sí se muestra en POS).
- **Histórico de movimientos**: `InventoryMovement` vía `/api/products/stock` (productId, type, from, to, paginado). La UI solo usa `productId` + `limit=50`.
- **Límites por plan**: `PLAN_LIMITS[planKey].products` en `product.service.ts:55` y en `import-ai/route.ts:59`.

### 1.7 Componentes (INVENTARIO)
- `src\components\dashboard\product-form.tsx` (1.545 líneas) — form monstruo (crear + editar + categorías + tallas + mayor).
- `src\components\dashboard\import-wizard.tsx` (626 líneas) — wizard de 3+1 pasos.
- `src\components\dashboard\products-accordion.tsx` (183 líneas) — acordeón por categoría + tablas.
- `src\components\dashboard\products-table.tsx` (51 líneas) — solo `DeleteProductButton`.
- `src\components\dashboard\product-stock-history.tsx` — histórico de stock (sin paginación/filtros).

### 1.8 Responsive
- Header del listado: `flex-col` → `sm:flex-row` (`products/page.tsx:56`). Filtros `flex-col gap-4 sm:flex-row` (`:76`).
- Tabla de productos: sin scroll horizontal; las `<Table>` de `products-accordion` usan `data-label` por columna pero sin CSS móvil definido en el componente (el patrón "responsive table" está presente pero no estilizado — verificar `globals.css`). Riesgo de overflow en móvil con 6 columnas.
- Form: `max-w-2xl` centrado, diseño de una columna; `ProductForm` usa grids internos `sm:grid-cols-2`.

### 1.9 Problemas de UX (INVENTARIO)
1. **Listado sin paginación ni virtualización** (`products/page.tsx`): con cientos de productos, la query y el render son pesados; no hay `Pagination`/`PaginationLinks` (estos primitivos solo se usan en `orders`, `customers` y `gastos`).
2. **Búsqueda solo por nombre**: no cubre SKU ni código de barras, casos de uso reales de inventario (y contradice a POS, que sí busca por SKU/barcode, `pos/page.tsx:286`).
3. **Sin detalle de producto**: no hay vista de producto individual (galería, tallas, mayor, movimientos, QR). El histórico está escondido al pie del formulario de edición.
4. **Sin acceso a ajuste de stock en UI**: la acción "ajuste/entrada/salida" existe en la API pero no hay botón "Ajustar stock" en la pantalla (los comercios quieren registrar entradas de mercancía sin editar precio).
5. **`DeleteProductButton` pide confirmación DOS veces** (`products-table.tsx:25` + Dialog `:41-51`).
6. **Histórico de movimientos con límite 50 fijo y sin filtros** pese a que la API los soporta (`product-stock-history.tsx:24`).
7. **Etiqueta inconsistente**: sidebar "Inventario" vs bottom-nav "Productos" vs H1 "Productos" vs botón "Nuevo Producto" vs subpáginas "Crear Producto".
8. **Creación de categoría dentro del form**: utilidad buena, pero sin feedback claro si la categoría ya existe (la API usa `equals insensitive`, `import-ai/route.ts:80`).
9. **`import/page.tsx` es una página "decorativa"**: fondo con blobs + gating de plan; el wizard real no tiene reintento de errores por fila visibles en la UI (los errores se limitan a 50 y se devuelven como JSON, `import-ai/route.ts:135`).
10. **No existe exportar CSV/Excel** (pendiente #11 del checklist maestro en `AGENTS.md`), a pesar de que el pricing lo promete.

### 1.10 Propuesta de rediseño (INVENTARIO)
1. **Listado como tabla de gestión** (referencia: `suppliers/page.tsx`): KPI chips arriba (Total productos / Con stock bajo / Agotados / Valor inventario), buscador que incluya SKU y barcode, filtro de categoría, ordenación, y **paginación** con el primitivo `Pagination` existente (`src\components\ui\pagination.tsx`).
2. **Nueva pantalla de detalle `/dashboard/products/[id]`** (separada de edición): galería, precio/descuento, tallas y escalas mayor en read-only, histórico de movimientos con filtros (tipo, rango de fechas) y paginación usando la API existente de `/api/products/stock`.
3. **Acción "Ajustar stock"** (entrada/salida/ajuste) como modal reutilizable → `POST /api/products/stock`, registrando el tipo correcto de `InventoryMovement`.
4. **Unificar `ProductsAccordion` + grid de POS** en un solo componente de catálogo reutilizable (con prop `mode: "dashboard" | "pos"`).
5. **Eliminar la doble confirmación** de borrado (usar solo el Dialog; o mejor: desactivación lógica `isActive=false` en vez de borrado físico).
6. **Consistencia de naming**: una sola etiqueta para la navegación (recomendado: "Inventario" en sidebar y bottom-nav), H1 "Inventario".
7. **Exportar CSV** aprovechando la misma query del listado (pendiente #11).

---

## MÓDULO 2 — VENTAS

### 2.1 Propósito
Registrar ventas/órdenes: POS de mostrador con carrito, escáner, clientes, envíos, cupones, pagos divididos, crédito y recibo imprimible; listado y gestión de pedidos; y un flujo "venta rápida" (crédito) accesible desde el asistente IA.

### 2.2 Pantallas / Listado

| Ruta | Archivo | Tipo | Rol |
|---|---|---|---|
| `/dashboard/pos` | `src\app\dashboard\pos\page.tsx` (1.564 líneas) | Client | POS completo (mostrador) |
| `/dashboard/nueva-venta` | `src\app\dashboard\nueva-venta\page.tsx` (439 líneas) | Client | POS minimalista (solo crédito), accesible vía IA |
| `/dashboard/orders` | `src\app\dashboard\orders\page.tsx` (190 líneas) | Server | Listado de pedidos |
| `/dashboard/orders/[id]` | `src\app\dashboard\orders\[id]\page.tsx` (721 líneas) | Client | Detalle / gestión de pedido |

**POS (`pos/page.tsx`, client monolith 1.564 líneas):**
- Layout `flex flex-col lg:flex-row` (`:696`): izquierda catálogo, derecha carrito (columna fija `lg:w-[380px]`).
- Catálogo: búsqueda por nombre/SKU/barcode con autodetección de escáner (Enter rápido, `handleScanInput :166-175`), filtro de categoría, botón "Refrescar", botón "Lector" (teléfono como lector: Pusher + QR + polling `/api/scanner/session/[id]/events` cada 1s, `:540-600`; en móvil abre `MobileCameraScanner`, `:728-736`).
- Grid de productos por categoría colapsable, badges `$ MAYOR` (si aplica escala mayor con qty=2, `:754`) y `AGOTADO` (`:767-769`).
- Carrito: cantidad, edición de precio por línea con clamp `[max(costPrice, price*0.5), price]` (`setLinePrice :248-256`), precio mayorista automático por cantidad (`calcWholesalePrice :192-206`), descuento global, cupón (`/api/coupons/validate`).
- Cliente: búsqueda (`/api/customers?q&limit=10`, min 2 chars), creación inline (nombre/teléfono/cédula), selector "En tienda / Con envío", y para envío: dirección, ciudad, estado, método (`pickup_agency`/`delivery`), courier + estado + oficinas (`/api/agencias`), costo envío (`:1062-1117`).
- Resumen con totales USD + Bs (BCV, `useBcvRate`).
- Modal de cobro (`:1163-1311`): "Vender a crédito" (cuotas 2-12 cada 15 días, inicial opcional, fechas de vencimiento, `getCreditInstallments`), **pagos divididos** (efectivo/transferencia/pago móvil/binance), efectivo recibido + cambio (`getChangeAmount`).
- `processSale` (`:359-422`): valida cobertura del total, construye body (source:"pos", creditTerm `cuotas_{n}_15d`, payments con status verified/pending, shippingMethod/agency/address), `POST /api/orders`.
- Recibo (`:1313-1420`): modal 80mm imprimible (`handlePrint` / `handleDownloadPDF` con `window.open` + `document.write`), métodos de pago, crédito.
- Reporte del día (`loadDailyReport :126-138` → `GET /api/reports/daily`; modal `:1422-1485` con KPIs ventas/órdenes/tienda/POS y badges de método de pago).
- Ventas de hoy: `GET /api/orders?status=all&limit=100` y filtro en cliente por `createdAt >= hoy` (`:152-163`).
- ~50 estados de `useState` (`:40-122`) — todo el estado del flujo vive en un solo componente.

**`nueva-venta` (`nueva-venta/page.tsx`, 439 líneas):**
- Duplicado minimalista de POS: catálogo por categoría (sin colapsar, sin scanner, sin mayorista, sin envío, sin cupón, sin pagos divididos), carrito, cliente (nombre/teléfono), **días de crédito** desde `GET /api/stores` (`creditDays`, `:83-97`).
- `processSale` (`:177-229`): `POST /api/orders` con `payment: {method:"credit", amount, status:"pending"}`, `creditDays`. PostHog `pos_sale_completed`. Redirige a `/dashboard/orders/[id]`.
- Solo alcanzable desde el asistente IA (`conversation-types.ts:146-149`). **No está en el sidebar ni bottom-nav.**

**Listado de pedidos (`orders/page.tsx`, server):**
- `PER_PAGE = 20` (`:23`), **única pantalla del proyecto que usa `PaginationLinks`** (`:21`, `:179`).
- Query: `where: { storeId, creditTerm: null }` (`:62`) — **excluye ventas a crédito del listado de pedidos**.
- Filtro: solo por `status` (select). Sin búsqueda por cliente, sin rango de fechas, sin filtro por método de pago, sin "pagos pendientes".
- Badges: `statusColors`/`statusLabels` (`:25-41`: pending, confirmed, preparing, shipped, delivered, cancelled) y `paymentStatusLabels` (`:43-48`).
- Tabla con `data-label` responsive.

**Detalle (`orders/[id]/page.tsx`, client 721 líneas):**
- Carga `GET /api/orders/[id]` + `/api/agencias` (`:165-175`).
- Botón flotante WhatsApp (`:242-249`).
- Card "Verificar pago" (`:282-401`): solo si hay `firstPendingPayment`; muestra monto/referencia/banco/fecha/comprobante + datos del cliente + método de envío; botón "Pago verificado" → `POST /api/orders/[id]/verify-payment` con `orderStatus:"pending"`.
- Card "Notificar por WhatsApp" (`:403-488`): mensaje según método de envío (`getWhatsAppMessage :112-122`), abre `wa.me`, y botón "Ya notifiqué" → `PATCH /api/orders/[id]/notify` (marca `clientNotified`).
- Card "Estado del pedido" (`:490-539`): pills de estado (`statusOptions :106-110`: Pendiente/Empaquetado/Despachado) → `PATCH /api/orders/[id]/status`; botón "Cancelar pedido" con `confirm()` nativo + restaura stock.
- Información del pedido (subtotal/envío/total/Bs.), datos de la agencia si aplica (`matchedAgency` desde la lista completa de agencias, `:152-163`), cliente, productos, entregas digitales (tokens, descargas, expiración).
- `DownloadPurchaseOrder` (`src\components\seller\purchase-order.tsx`) para descargar orden de compra.

### 2.3 Acciones
- **Cobrar en mostrador** → POS `processSale` → `POST /api/orders` (server re-valida precios reales desde BD y stock, según checklist #1).
- **Cambiar estado de pedido** → DOS caminos duplicados:
  - `PUT /api/orders/[id]` (usado por `order-actions.tsx:28-32` — menú desplegable en el listado, permite pasar a "Pendiente/Preparando/Confirmado/Despachado").
  - `PATCH /api/orders/[id]/status` (usado por el detalle, `orders/[id]/page.tsx:205`; roles admin/manager; `validStatuses`; cancela y restaura stock).
- **Verificar pago** → `POST /api/orders/[id]/verify-payment` (transacción atómica, roles admin/manager).
- **Notificar cliente** → `PATCH /api/orders/[id]/notify` (marca `clientNotified=true`).
- **Venta a crédito** → `POST /api/orders` desde `nueva-venta` con `payment.status:"pending"` y `creditDays`.
- **Reporte del día** → `GET /api/reports/daily` (también usado por `cierres-tab.tsx:87`).

### 2.4 Duplicaciones (VENTAS)
1. **DOS puntos de venta que hacen lo mismo de forma distinta**: `pos/page.tsx` (1.564 líneas, completo) vs `nueva-venta/page.tsx` (439 líneas, minimal). Estado de la técnica: `nueva-venta` quedó obsoleta y solo el asistente IA la enlaza.
2. **Dos endpoints para cambiar estado de orden**: `PUT /api/orders/[id]` (order-actions) y `PATCH /api/orders/[id]/status`. Ambos actualizan status; el PATCH además valida transiciones y restaura stock.
3. **Grid de catálogo duplicado 3 veces** (POS, nueva-venta, dashboard inventory accordion).
4. **Derivación de categorías en cliente** duplicada en POS y nueva-venta (`pos/page.tsx:146-148` y `nueva-venta/page.tsx:73-77`).
5. **Búsqueda de cliente duplicada** (`pos/page.tsx:177-184` y `nueva-venta/page.tsx:99-112`).
6. **"Ventas de hoy"** en POS filtra en cliente con `limit=100` (`pos/page.tsx:156-159`) mientras existe `/api/orders/count` con filtros `status/after/excludePos` no usado por esta pantalla.
7. **Confirmación de cancelación**: `confirm()` nativo en `orders/[id]/page.tsx:527` y otro `confirm()` en `order-actions.tsx` — mientras el checklist dice que el patrón correcto es Dialog (#18).

### 2.5 Datos
- **Modelo `Order`** (via `GET /api/orders/[id]`, `orders/[id]/page.tsx:71-98`): orderNumber, status, subtotal, discount, shippingCost, total, bcvRateAtOrder, paymentStatus, customer*, shipping*, clientNotified, items[], payments[], digitalDeliveries[], store.
- **`VALID_ORDER_STATUSES`** (`src\services\order.service.ts`): `pending, confirmed, preparing, shipped, delivered, cancelled`.
- **Pagos**: `payments[]` con method (cash/bank_transfer/pago_movil/binancepay/credit), amount, reference, bankOrigin, paidAt, receiptImage, status (pending/verified).
- **Crédito**: `creditTerm` (`cuotas_{n}_15d`), `downPayment`, `installments`; `nueva-venta` usa además `creditDays` de `/api/stores`; hay APIs dedicadas `/api/installments`, `/api/creditos`, `/api/cron/installment-reminders`.
- **POS** vs **crédito**: el listado de pedidos excluye crédito (`creditTerm: null`, `orders/page.tsx:62`); los créditos se gestionan aparte (módulo no auditado aquí).
- **BCV**: `useBcvRate` + `formatBCV`; la orden guarda `bcvRateAtOrder`.
- **Métodos de pago aceptados**: efectivo, transferencia, pago móvil, Binance Pay (POS modal `:1230-1239`). No hay tarjeta.
- **Envíos**: `shippingMethod` ∈ pickup_agency / pickup_store / delivery; catálogo de agencias en `/api/agencias` (empresas/estados/oficinas).

### 2.6 Componentes (VENTAS)
- `pos/page.tsx` — todo el POS inline (modales incluidos), sin sub-componentes extraídos.
- `orders/page.tsx` + `order-actions.tsx` (dropdown de estados) — listado.
- `orders/[id]/page.tsx` — detalle completo inline.
- `src\components\seller\purchase-order.tsx` — `DownloadPurchaseOrder` (usado en detalle y en store público).
- Primitivos compartidos: `PaginationLinks` (solo aquí), `EmptyState` (NO usado en ventas), `SearchInput`, `FilterChip` (NO usados aquí).

### 2.7 Responsive
- POS: dos paneles apilados en móvil (`lg:flex-row`), pero la columna carrito en móvil queda debajo del catálogo — para vender en teléfono hay que bajar todo el catálogo. El selector de courier/estado/oficinas se apila con `flex gap-1.5` sin `flex-wrap` (`pos/page.tsx:1084-1088`), riesgo en pantallas angostas.
- Grid de productos: `grid-cols-3 md:4 lg:5 xl:6` (POS) — 3 columnas en móvil es apretado para tarjetas con stock/estado.
- Listado de pedidos: tabla con `data-label` (patrón responsive) y paginación.
- Detalle: `max-w-4xl`, cards en `grid md:grid-cols-2`.

### 2.8 Problemas de UX (VENTAS)
1. **`pos/page.tsx` es un monolito de 1.564 líneas** con ~50 estados: imposible de mantener y de probar; cualquier ajuste de UX toca el flujo completo.
2. **`nueva-venta` es un POS paralelo** obsoleto, solo accesible vía IA y con comportamiento distinto (crédito por defecto, sin recibo, sin validación de precio por línea, sin scanner). Riesgo: el asistente lleva a una experiencia inferior a la del POS.
3. **El listado de pedidos excluye créditos** (`orders/page.tsx:62`) y **no filtra por pagos pendientes**, así que "ventas por cobrar" no aparece donde un comerciante lo buscaría.
4. **Sin búsqueda en el listado de pedidos**: no se puede encontrar un pedido por nombre de cliente, teléfono, orderNumber ni método de pago.
5. **Doble vía de cambio de estado** (PUT y PATCH) con comportamientos distintos (uno valida/restaura stock, el otro no se sabe sin leer `order.service`). Confusión y riesgo de inconsistencias.
6. **Confirmaciones con `confirm()` nativo** (feo y bloqueante) en `orders/[id]/page.tsx:527` y `order-actions.tsx`.
7. **"Ventas de hoy" y "Reporte del día" viven solo dentro del POS**; no hay acceso desde el listado de pedidos ni desde analytics.
8. **Modal de cobro sin validación visual clara**: el total a pagar con crédito permite no cubrir el total (los pagos son `verified` solo si no hay crédito, `:396-404`) y la diferencia queda "prestada" sin resaltarse en la UI.
9. **Sin reintentos/estados vacíos en reporte**: `GET /api/reports/daily` no tiene UI de error si falla (`pos/page.tsx:136` solo loguea).
10. **Detalle de pedido recarga toda la lista de agencias** (`/api/agencias` completo) para emparejar una dirección (`orders/[id]/page.tsx:171-174`, `:152-163`) — datos pesados para un detalle.
11. **Inconsistencia de etiquetas**: sidebar "Ventas" (POS) vs "Pedidos" (orders) vs "Venta completada" (recibo) vs "Reporte del día".

### 2.9 Propuesta de rediseño (VENTAS)
1. **Consolidar en UN solo POS**: absorber `nueva-venta` dentro de `/dashboard/pos` como modo "Crédito rápido" (toggle contado/crédito), y eliminar la ruta paralela. Actualizar `conversation-types.ts:146-149` para que el asistente enlace a `/dashboard/pos` con un prefijo de contexto (`openAssistant`/deep-link con acción pre-rellenada).
2. **Extraer sub-componentes del POS** (referencia a la arquitectura de `suppliers/`): `PosCatalog`, `PosCart`, `PaymentModal`, `ReceiptModal`, `CustomerPicker`, `ShippingFields`, `DailyReportModal`. Cada uno con su propia lógica y props — el monolito de 1.564 líneas se reduce a un orquestador.
3. **Unificar la gestión de estado de pedido**: un solo endpoint (recomendado `PATCH /api/orders/[id]/status`) con `validStatuses` y restauración de stock centralizadas; actualizar `order-actions.tsx` para usarlo.
4. **Listado de pedidos como "central de ventas"**: tabs Todas / Pendientes de pago / Crédito / Envío; buscador (cliente, teléfono, número); filtros por estado, método de pago y rango de fechas; KPIs (ventas del día, por cobrar). Reutilizar `PaginationLinks` + `EmptyState` + `SearchInput` + `FilterChip` existentes.
5. **Detalle con timeline**: reemplazar la secuencia de 3 cards (verificar → notificar → estados) por un timeline de estados y un panel de acciones por rol. Mantener el flujo WhatsApp (es fuerte) pero integrarlo en el timeline.
6. **Tickets/recibos compartidos**: extraer el recibo POS a un componente reutilizable (`TicketReceipt`) con impresión/PDF, reutilizado en el detalle de pedido.
7. **Aprovechar la data de analytics**: `SalesOverview {today, week, month, averageTicket, topProducts, frequentCustomers}` de `sales.service.ts` existe para el módulo de analítica; exponer al menos "ventas hoy" y "ticket promedio" como KPIs en el listado de pedidos.

---

## 3. Hallazgos transversales
- **Sin paginación/virtualización** en inventario (sí hay primitivos `Pagination`/`PaginationLinks` reutilizables, usados en `customers/page.tsx:22`, `gastos-page.tsx:10`, `orders/page.tsx:21`).
- **`confirm()` nativo** en 3 lugares de estos módulos: `products-table.tsx:25`, `orders/[id]/page.tsx:527`, `order-actions.tsx` (pendiente #18 del checklist maestro).
- **Dos caminos de actualización de estado de orden** sin un solo "estado del negocio" documentado.
- **Navegación fragmentada** para el mismo dominio (Inventario/Ventas/Pedidos/nueva-venta) con etiquetas distintas en sidebar vs bottom-nav vs H1s.
- **Monolitos client-side** (POS 1.564, form 1.545, detalle 721) vs el patrón bien estructurado del módulo de proveedores (`suppliers/page.tsx` + sub-componentes con modales).
- **Oportunidad de IA** ya despejada: `openAssistant(prefill?)` (`src\components\assistant\assistant-provider.tsx`) y "Preguntar a Panitas" ya instalados en `attention-center.tsx:227`, `financial/executive-summary.tsx:37`, `bic-monitor-area.tsx:44` — se puede conectar el mismo patrón a inventario y ventas (p. ej. "¿Cuánto vendí hoy?", "muéstrame productos agotados").

## 4. Fuentes principales
- `src\app\dashboard\products\page.tsx`, `new\page.tsx`, `[id]\edit\page.tsx`, `import\page.tsx`
- `src\components\dashboard\product-form.tsx`, `import-wizard.tsx`, `products-accordion.tsx`, `products-table.tsx`, `product-stock-history.tsx`
- `src\app\dashboard\pos\page.tsx`, `nueva-venta\page.tsx`, `orders\page.tsx`, `orders\[id]\page.tsx`
- `src\components\dashboard\order-actions.tsx`, `src\components\seller\purchase-order.tsx`
- APIs: `src\app\api\products\{route,stock,import,import-ai}\*.ts`, `src\app\api\orders\{route,count,[id],verify-payment,status,notify}\*.ts`, `src\app\api\reports\daily\route.ts`, `src\app\api\agencias\route.ts`
- Servicios/repos: `src\services\{product,inventory,order,sales}.service.ts`, `src\repositories\product.repository.ts`
- Layout/nav: `src\components\layout\sidebar.tsx`, `bottom-nav.tsx`, `dashboard-chrome.tsx`, `src\components\assistant\*`
- Primitivos: `src\components\ui\{pagination,pagination-links,search-input,filter-chip,empty-state,sheet,tabs,card}.tsx`
