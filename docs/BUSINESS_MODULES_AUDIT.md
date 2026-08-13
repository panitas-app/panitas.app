# BUSINESS MODULES AUDIT — FASE 1 de 9C

> **Fecha:** 2026-08-11 · **Alcance:** solo lectura / investigación (no se modificó código).
> **Objetivo:** mapa completo de los 8 módulos operativos (Clientes, Inventario, Ventas, Créditos, Cobranza, Proveedores, Finanzas, Reportes) para guiar el rediseño de UI de la FASE 9C.
> **App root:** `C:\Users\Usuario\Desktop\PanitasApp\panitas` (Next.js 16 · App Router · React 19 · Tailwind v4 · Base UI).
> **Documento consolidador.** Los 4 reportes de detalle (con file:line completos) viven en:
> - `docs\BUSINESS_MODULES_AUDIT-clientes-creditos.md`
> - `docs\BUSINESS_MODULES_AUDIT-inventario-ventas.md`
> - `docs\BUSINESS_MODULES_AUDIT-cobranza-proveedores.md`
> - `docs\BUSINESS_MODULES_AUDIT-finanzas-reportes.md`

---

## 0. Resumen ejecutivo

| Módulo | Rutas | Estado actual | Problema #1 | Acción primaria hoy |
|---|---|---|---|---|
| **Clientes** | `/dashboard/customers`, `/[id]` | Listado con KPIs engañosos; detalle read-only | KPIs calculados sobre la página actual (`customers/page.tsx:98-116`) | Ninguna (solo ver) |
| **Inventario** | `/dashboard/products` + `new`, `[id]/edit`, `import` | Listado server sin paginación; sin detalle; form monstruo (1.545) | Sin paginación, sin SKU en búsqueda, sin ajuste de stock en UI | Nuevo Producto |
| **Ventas** | `/dashboard/pos`, `/dashboard/nueva-venta`, `/dashboard/orders`, `orders/[id]` | POS monolito (1.564) + POS paralelo obsoleto; listado excluye créditos | DOS POS en competencia (`nueva-venta` solo via IA) | Cobrar en mostrador |
| **Créditos** | `/dashboard/creditos`, `/[id]` | Listado en cards sin paginación; KPIs por ventana | Confusión con Cobranza IA; KPIs aproximados (`credit.service.ts:140-155`) | Registrar abono |
| **Cobranza** | `/dashboard/collection` | 1 página 3 tabs; envío 100% manual confirmado | Flujo partido: recomendaciones aquí, abonos en créditos | Preparar mensaje |
| **Proveedores** | `/dashboard/suppliers`, `/[id]` | Página espejo de créditos (~80%) | Duplicación estructural créditos↔proveedores; sin paginación | Registrar abono |
| **Finanzas** | `/dashboard/finanzas` | Panel 20 KPIs con caché+eventos; 3 vistas | 2 sistemas paralelos de insights (financiero vs monitor) | Cambiar período |
| **Reportes** | `/dashboard/analytics` (BIC), `/dashboard/reports` (redirect muerto) | BIC sólido con 5 áreas; ruta zombie | `/reports` zombie; equilibrio enterrado en BIC | Navegar área |

**Deuda transversal estimada:** ~1.500-2.000 líneas de UI duplicada consolidable sin tocar el modelo de datos.

---

## 1. Hallazgos transversales (aplican a todos los módulos)

### T1. Tres formateadores de fecha + tres de moneda
`lib\utils.ts:12` (fecha con hora), `credit-types.ts:142-153` (es-VE dd/mm/yyyy), `collection-types.ts:118-127`, `financial-types.ts:173` (`$` fijo), `bic-shared.tsx:159` (USD+Bs), y `$X.toFixed(2)` suelto en gastos/equilibrio/cierres.
→ **Acción:** extraer `lib\format.ts` único (fecha + moneda con toggle Bs opcional), migrar progresivamente.

### T2. Tipos duplicados servidor/cliente
`CreditSummary/Detail/Kpis` en `credit.service.ts:33-99` y de nuevo en `credit-types.ts:14-75`; tipos financieros en `components\dashboard\financial\` y `lib\financial-intelligence\` (casi idénticos).
→ **Acción:** una sola fuente de verdad por dominio (re-export o shared types).

### T3. Patrón lista (búsqueda+filtro+pag) implementado 3 veces distinto
`useDebounce` en customers, debounce manual en créditos/proveedores, `Input`+botón en cobranza. `SearchInput` y `FilterChip` existen (`ui\search-input.tsx`, `ui\filter-chip.tsx`) y **no se usan** en la mayoría.
→ **Acción:** consolidar en `SearchInput` + `FilterChip` + un hook `useEntityListPreferences` (persistencia unificada).

### T4. `confirm()` nativo (pendiente #18 del checklist maestro)
En `products-table.tsx:25`, `orders/[id]/page.tsx:527`, `order-actions.tsx`, y `window.prompt` para cancelar crédito (`creditos/[id]/page.tsx:59`).
→ **Acción:** reemplazar por `Dialog`/`AlertDialog` del design system.

### T5. KPIs calculados donde no deberían
Client-side reduce sobre página actual (customers), KPIs por ventana de 100/400 (créditos), triple cómputo de ingresos (`/api/analytics`, `FinancialEngine`, `/api/analytics/breakeven`) con reglas distintas (exclusión de crédito solo en analytics).
→ **Acción:** KPIs exactos desde servicio/API; unificar regla de ingresos.

### T6. Dos sistemas paralelos de insights/alertas
`FinancialInsight` (12 categorías, prioridades Alta/Media/Baja) vs `Insight` del monitor 4B (6 categorías, IMPORTANTE/WARNING/INFO). Componentes distintos (InsightsList vs InsightCard). Mismo "crédito vencido" puede verse en un lugar y no en otro.
→ **Acción (cross-cutting, no por módulo):** capa que unifique o al menos unifique prioridad/terminología.

### T7. "Preguntar a Panitas" inconsistente
Presente en finanzas (`executive-summary.tsx:32-38`), atención (`attention-center.tsx:227`), BIC monitor (`bic-monitor-area.tsx:37-45`). **Ausente** en clientes, inventario, ventas, créditos, cobranza, proveedores. Mecanismo listo: `useAssistant().openAssistant(prefill)` + `assistantHref()`.
→ **Acción:** incorporar contextualmente por módulo.

### T8. Nombres de módulos inconsistentes
sidebar "Inventario" vs bottom-nav "Productos" vs H1 "Productos" vs "Nuevo Producto"; sidebar "Ventas" vs "Pedidos"; sidebar "Créditos" vs H1 "Centro de Cobranza" vs módulo "Cobranza IA"/"Cobranza Inteligente".
→ **Acción:** unificar etiquetas de navegación por dominio.

### T9. Rutas muertas / enlaces indirectos
`/dashboard/reports` es solo `redirect` a `/dashboard/analytics` (sidebar + `financial-actions.ts:20` la enlazan). `DELETE /api/collection/templates/[id]` sin UI. Setting `defaultLevel` se guarda pero nunca se consume.
→ **Acción:** eliminar rutas zombie o redirigir enlaces directos; quitar config/endpoints muertos o darles UI.

### T10. Patrón de detalle deseado (FASE 9C)
**Header → Resumen → Información → Actividad → Acciones**, con `Timeline` genérico (extraer de `credits\timeline.tsx`, 45 líneas, al compartido) y balance/saldo SIEMPRE del backend (nunca recálculo visual).

---

## 2. CLIENTES

**Fuente de detalle:** `BUSINESS_MODULES_AUDIT-clientes-creditos.md` §Módulo 1.

**Files:** `src\app\dashboard\customers\page.tsx` (203), `customers\[id]\page.tsx` (285), `services\customer.service.ts` (121), `repositories\customer.repository.ts` (110), `api\customers\{route,[id]\route}`. Sin componentes propios (todo inline).

**Propósito:** revisar la base de clientes (quiénes, cuánto gastan, cuándo). No hay creación manual — aparecen automáticamente con pedidos (`customer.service.findOrCreateByPhone`).

**Listado:** 4 KPIs (Total correcto; Órdenes/Gastado/Promedio **erróneos a escala**, reducen la página actual `:98,107,116`), búsqueda por nombre/teléfono/email con debounce 300ms, **sin filtros**, orden por columnas (a11y pobre), paginación compartida OK, columnas Nombre+documentId/Contacto/Órdenes/Gastado/Última compra, empty state sin CTA, loading inline.

**Detalle:** 3 fetches paralelos (customer + notes + follow-ups, fallos silenciosos). Header → Información (tel/mail/address) → 3 KPIs → Notas CRM → Seguimientos (hardcodea `type:"call"` + 7 días, `:101`) → Historial de órdenes. Badges de estado hardcodeados (`:44-51`).

**Acciones:** ver, volver, llamar, mailto, nota, seguimiento (hardcoded), completar seguimiento. **Sin New/Edit/Delete/Export. Sin saldo de créditos.**

**Duplicaciones:** balance del cliente en 4 lugares (créditos, finanzas `TopCollectList`, cobranza, y FALTA aquí); lista de clientes re-implementada en `crm\page.tsx`; 3 formatters; `SearchInput` sin usar; mapa de status de orden duplicado.

**UX issues clave:** KPIs engañosos; módulo read-only; sin filtros ("con deuda", "nuevos"); dead-end cross-module (no responde "¿cuánto me debe?"); seguimientos hardcodeados; 3 formatos de fecha.

**Propuesta rediseño:**
- **Lista:** +Nuevo cliente (Sheet/Dialog); KPI strip server-computed (total, nuevos, inactivos 60d, gastado); `SearchInput` + `FilterChip` (Todos/Con deuda/Al día/Inactivos/Nuevos); tabla responsive→cards en móvil.
- **Detalle:** Header (nombre, estado, back) → Resumen (Órdenes, Gastado, **Saldo pendiente** vía `CreditService.listByCustomer`) → Información (editable) → Actividad (tabs Órdenes·Notas·Seguimientos·Créditos) → Acciones (WhatsApp con saldo prefilled; "Registrar abono" salta al crédito).
- **Panitas:** lista → "¿Qué clientes necesitan atención?"; detalle → "Resume historial y saldo de {name}".
- **Cross-links:** customer↔créditos, customer↔cobranza (historial), customer↔orders (ya), CRM→lista con búsqueda pre-fill.

---

## 3. INVENTARIO

**Fuente de detalle:** `BUSINESS_MODULES_AUDIT-inventario-ventas.md` §Módulo 1.

**Files:** `products\page.tsx` (123, server), `products\new\page.tsx` (33), `products\[id]\edit\page.tsx` (33), `products\import\page.tsx` (54), `components\dashboard\product-form.tsx` (**1.545**), `import-wizard.tsx` (**626**), `products-accordion.tsx` (183), `products-table.tsx` (51), `product-stock-history.tsx`. APIs: `/api/products{,_stock,import,import-ai}`.

**Propósito:** CRUD de productos (precios, tallas, mayor, stock, histórico, importación), fuente de datos de POS y tienda.

**Listado:** server component sin paginación (trae TODOS), búsqueda **solo por nombre** (no SKU/barcode), filtro categoría, acordeón por categoría con tablas, stock semáforo (0→rojo, ≤5→ámbar), acciones Editar+Eliminar. Empty state duplicado.

**Detalle:** **no existe** — solo edición + histórico al pie (límite 50 hardcodeado, `product-stock-history.tsx:24`).

**Acciones:** crear/editar (form monstruo: SKU, barcode+escáner, tallas, mayor, imágenes, categoría inline), eliminar (**doble confirmación** `confirm()` + Dialog), importar (wizard 3+1 pasos), **ajuste de stock solo por API, sin UI**.

**Duplicaciones:** doble confirmación; empty state duplicado; gating de plan duplicado; 3 grids de catálogo (dashboard/POS/nueva-venta); lista server directa vs POS via API.

**UX issues clave:** sin paginación/virtualización; sin SKU/barcode en búsqueda; sin detalle de producto; sin ajuste de stock en UI; doble confirmación; histórico limitado sin filtros; naming inconsistente; sin export CSV (#11 checklist).

**Propuesta rediseño:**
- **Listado gestión:** KPI chips (Total/Stock bajo/Agotados/Valor inventario), búsqueda con SKU+barcode, filtro categoría, orden, **paginación** (`ui\pagination.tsx`).
- **Detalle `/dashboard/products/[id]`** separado de edición: galería, precios, tallas/mayor read-only, histórico de movimientos con filtros+pag (API ya lo soporta).
- **"Ajustar stock"** modal → `POST /api/products/stock` (tipo correcto de `InventoryMovement`).
- **Unificar** `ProductsAccordion` + grids POS (prop `mode: "dashboard"|"pos"`).
- **Quitar doble confirmación** (solo Dialog; ideal: `isActive=false` en vez de borrado físico).
- **Naming:** una etiqueta ("Inventario") en sidebar + bottom-nav; H1 "Inventario".
- **Export CSV** con la query del listado.

---

## 4. VENTAS

**Fuente de detalle:** `BUSINESS_MODULES_AUDIT-inventario-ventas.md` §Módulo 2.

**Files:** `pos\page.tsx` (**1.564**), `nueva-venta\page.tsx` (439), `orders\page.tsx` (190, server), `orders\[id]\page.tsx` (721), `components\dashboard\order-actions.tsx`, `components\seller\purchase-order.tsx`. APIs: `/api/orders*`, `/api/agencias`, `/api/reports/daily`, `/api/orders/count`.

**Propósito:** POS de mostrador (carrito, escáner, clientes, envíos, cupones, pagos divididos, crédito, recibo), listado y gestión de pedidos, y flujo "venta rápida" via IA.

**POS:** monolito ~50 estados. Catálogo con búsqueda nombre/SKU/barcode + autodetección escáner + "Lector" (teléfono). Carrito con precio por línea (clamp), mayorista por cantidad, descuento, cupón, cliente con creación inline, envío (agencia/courier/estado/oficinas), totales USD+Bs (BCV). Modal de cobro: crédito (2-12 cuotas/15d), pagos divididos, cambio. Recibo 80mm imprimible/PDF. Reporte del día modal. Ventas de hoy con `limit=100` + filtro cliente.

**`nueva-venta`:** POS minimalista obsoleto (solo crédito, `creditDays` de `/api/stores`), **solo alcanzable via IA** (`conversation-types.ts:146-149`).

**Listado pedidos:** único uso de `PaginationLinks`. Query `creditTerm: null` → **excluye créditos**. Solo filtro por status, **sin búsqueda**.

**Detalle pedido:** WhatsApp flotante, Verificar pago, Notificar, Estado (pills→`PATCH /api/orders/[id]/status`), Cancelar con `confirm()`, info completa. Carga `/api/agencias` completo para emparejar una dirección.

**Duplicaciones:** DOS POS; dos endpoints de estado (`PUT /api/orders/[id]` order-actions vs `PATCH .../status`); grid de catálogo x3; búsqueda de cliente x2; "ventas de hoy" duplicada; `confirm()` x2.

**UX issues clave:** monolito; POS paralelo inferior al que enlaza la IA; listado excluye créditos y no filtra pagos pendientes; sin búsqueda en pedidos; doble vía de estado; ventas de hoy/reporte solo en POS; cobro a crédito puede dejar diferencia sin resaltar; etiquetas inconsistentes (Ventas/Pedidos).

**Propuesta rediseño:**
- **Consolidar en UN solo POS:** absorber `nueva-venta` como modo "Crédito rápido"; actualizar `conversation-types.ts` a `/dashboard/pos` con contexto.
- **Extraer sub-componentes del POS** (patrón suppliers): `PosCatalog`, `PosCart`, `PaymentModal`, `ReceiptModal`, `CustomerPicker`, `ShippingFields`, `DailyReportModal` — el monolito queda como orquestador.
- **Unificar estado de pedido:** un solo endpoint (`PATCH /api/orders/[id]/status`) con `validStatuses` + restauración de stock; actualizar `order-actions.tsx`.
- **Listado = central de ventas:** tabs (Todas/Pendientes pago/Crédito/Envío), buscador (cliente/teléfono/número), filtros estado+método+fechas, KPIs (ventas del día, por cobrar). Reusar `PaginationLinks` + `EmptyState` + `SearchInput` + `FilterChip`.
- **Detalle con timeline** (reemplaza 3 cards) y panel de acciones por rol; mantener WhatsApp.
- **Recibo compartido** `TicketReceipt` (POS + detalle pedido).
- **Exponer** ventas hoy + ticket promedio como KPIs (data ya existe en `sales.service.ts`).

---

## 5. CRÉDITOS

**Fuente de detalle:** `BUSINESS_MODULES_AUDIT-clientes-creditos.md` §Módulo 2.

**Files:** `creditos\page.tsx` (165), `creditos\[id]\page.tsx` (276), `components\dashboard\credits\{credit-card,kpi-grid,payment-modal,reschedule-modal,timeline,credit-types}` , `services\credit.service.ts` (**693**), APIs `api\creditos\{route,[id]\route,[id]\payments\route}`.

**Propósito:** cobrar la cartera de créditos (abonos, replanificar, cancelar, recordatorios). H1 "Centro de Cobranza".

**Listado:** 6 KPIs (Total por cobrar, Activos, Vencidos count+monto, Vencen 7d, Cobrado mes, % recuperación) — **KPIs por ventana, aproximados a escala** (`credit.service.ts:140-155`); búsqueda debounce 350ms; 6 filtros pill manuales (FilterChip sin usar); cards apiladas; **sin paginación** (cap 100/400); persistencia filtro+búsqueda vía business-memory.

**Detalle:** Header (cliente, chip, acciones: Registrar abono/Recalcular/WhatsApp/Cancelar) → Saldo (monto, Total/Pagado/Inicial, barra, próxima cuota o vencido) → Productos → Cuotas (estados derivados) → Abonos → Historial (Timeline).

**Acciones:** abono (POST payments), recalcular (PATCH reschedule — **borra cuotas impagas**), cancelar (**`window.prompt`** PATCH cancel), WhatsApp (template duplicado), navegar.

**Duplicaciones:** balance en 4 lugares; tipos servidor/cliente; `money`/`formatDate` x3; template WhatsApp x2; métodos de pago hardcodeados vs configurable en cobranza; `paymentAccountId` nunca enviado; pills manuales; timeline candidato a genérico.

**UX issues clave:** colisión de nombres (Créditos vs Centro de Cobranza vs Cobranza IA); sin paginación; KPIs aproximados; `window.prompt` para cancelar (destructivo, sin confirm/undo); "Recalcular" ambiguo (mejor "Replanificar"); métodos hardcodeados; sin link al cliente ni a la orden; sin export; `money()` sin agrupador de miles.

**Propuesta rediseño:**
- **Lista:** primaria "Registrar abono" (quick-abono inline: crédito→monto→método→confirm); KPIs exactos server-side; `SearchInput`+`FilterChip`; **paginado**; fila compacta (chip·pendiente·próxima·[Abono][Ver]).
- **Detalle:** Header con **link al cliente** (`/dashboard/customers/{id}`) y a la orden; Resumen → Información → Actividad (Cuotas·Abonos·Historial) → Acciones (Abono primario; Replanificar; WhatsApp; Cancelar con Dialog confirm, NO prompt).
- **Panitas:** "¿Cuál es mi cartera vencida y qué debería cobrar hoy?" / "Resume la orden #X de {name}".
- **Cross-links:** crédito↔customer, crédito↔order, créditos↔cobranza ("Preparar recordatorio" preselecciona), `paymentMethods` compartido del settings de cobranza.

---

## 6. COBRANZA

**Fuente de detalle:** `BUSINESS_MODULES_AUDIT-cobranza-proveedores.md` §1.

**Files:** `collection\page.tsx` (39), `components\dashboard\collection\{send-assistant (472), template-editor (247), payment-methods-manager (192), contact-history (113), collection-types (127)}`, `services\collection.service.ts` (**839**), APIs `api\collection\*` (7 rutas).

**Propósito:** preparar recordatorios de cobro con plantillas por categoría/nivel + historial de contacto. **Envío 100% manual confirmado** (garantía repetida en 3 lugares: docs, `service:4`, `page.tsx:21`). No hay cron ni WhatsApp Business API.

**Flujo:** seleccionar crédito → categoría/nivel/plantilla → "Preparar mensaje" (solo crea `CollectionContact` `pending`) → abrir `wa.me` → "Marcar como enviado".

**Pantallas:** 1 página, 3 tabs (Asistente, Plantillas, Métodos). Asistente 2 columnas: recomendaciones ("¿A quién contactar hoy?", fijo 20, orden prioridad vencidos→sin-contactar→días) + buscador de crédito (sin debounce, `Input`+botón, `attempts:0` hardcodeado) ; derecha: form categoría/nivel/plantilla + mensaje editable + preview "no enviado" + historial embebido. **No hay sub-ruta `[id]`.**

**Duplicaciones/lógica:** `suggestLevel/suggestCategory` cliente y servidor (`send-assistant.tsx:41-53` vs `collection.service.ts:609-670`); `wa.me` en 2 sitios; WhatsApp "crudo" fuera del asistente en `credit-card.tsx:96` y `creditos/[id].tsx:131` (no crea CollectionContact); `Card` local; ContactHistory en 2 lugares; KPIs cruzados con finanzas; canal siempre "whatsapp" pese a soportar call/sms/email/other.

**Muerto:** `DELETE /api/collection/templates/[id]` sin UI; `defaultLevel` se guarda pero nunca se consume (`payment-methods-manager.tsx:128`).

**UX issues clave:** nombre inconsistente; flujo partido (recomendaciones aquí, abonos en créditos, sin nav cruzada); sin debounce/SearchInput; `attempts:0`; sin persistencia de prefs; nivel por defecto inerte; historial sin distinción fuerte preparado/enviado/respondido; sin Panitas; APIs sin `requireRole`.

**Propuesta rediseño:**
- **Unificar nombre/ruta** o enlace cruzado bidireccional "Cobranza IA" ↔ créditos.
- **Lista→Detalle:** `/dashboard/collection` = lista recomendaciones con filtros (estado/categoría/nivel) + pag + `SearchInput` debounced; seleccionar abre `/dashboard/creditos/[id]?modo=cobranza` con panel "Contactar" (categoría/nivel/plantilla/preview) junto a abonos/cuotas/historial. Desaparece el split.
- **Fuente única:** mover `suggestLevel/suggestCategory` + builder `wa.me` a `src\lib\collection.ts` (cliente+servidor).
- **Eliminar config muerta** (`defaultLevel`) o consumirla.
- **Saque el WhatsApp crudo** de tarjetas de crédito: pasar por el asistente (crea CollectionContact).
- **Panitas:** contextual ("¿A quién debería cobrar hoy?").

---

## 7. PROVEEDORES

**Fuente de detalle:** `BUSINESS_MODULES_AUDIT-cobranza-proveedores.md` §2.

**Files:** `suppliers\page.tsx` (194), `suppliers\[id]\page.tsx` (316), `components\dashboard\suppliers\{supplier-card (108), kpi-grid (68), payment-modal (137), purchase-modal (156), supplier-form-modal (159), timeline (52), supplier-types (223)}`, `services\supplier.service.ts` (**832**), APIs `api\suppliers\*`.

**Propósito:** proveedores, compras (facturas), pagos/abonos con saldo automático y estado derivado. H1 "Centro de Proveedores". FASE 8G bloquea eliminar con cuentas abiertas.

**Listado:** 6 KPIs (Total por pagar, Facturas abiertas, Vencidas, Por vencer 7d, Pagado mes, Recuperación); chips de estado; búsqueda debounce 350ms (solo filtro persistido, no búsqueda); cards full-width (desperdician desktop); "Registrar abono" + "Registrar compra" por card. **Sin paginación** (cap 500).

**Detalle:** espejo de créditos (~80% igual): Header (nombre+chip, acciones: Registrar pago/compra, Editar, Activar/Desactivar, **Eliminar siempre visible**) → Saldo (pendiente + Compras/Pagado/Facturas + barra + vencimiento) → Facturas (chip + barra) → grid 2 col (Pagos + Historial/Timeline). Modales: Payment/Purchase/SupplierForm.

**Duplicaciones:** página espejo de créditos; `KpiGrid` copiado literal (`grid-cols-2 sm:3 lg:6`); `PaymentModal` casi idéntico; `Timeline` duplicado; KPIs cruzados con finanzas (`financial/kpi-grid.tsx:88-103` repite "Por cobrar/Por pagar/Cuentas vencidas"); `stateOf` (supplier) vs `toSummary` (credit) misma lógica; empty states inline.

**UX issues clave:** espejo de créditos (cambio se replica x2); sin paginación; prefs incompletas; Eliminar sin peso/confirmación clara; búsqueda no cubre número de factura; sin contacto/aviso WhatsApp para vencidos; riesgo doble registro gasto vs compra.

**Propuesta rediseño:**
- **Compartidos:** crear `src\components\dashboard\shared\{EntityHeader,BalanceCard,PaymentsCard,EntityTimeline}` usados por créditos+proveedores (elimina espejo, ~600 líneas).
- **Lista:** `SearchInput`+`FilterChip`+`Pagination`; grid de cards `sm:grid-cols-2 lg:grid-cols-3`.
- **Detalle:** acciones primarias (pago/compra) y Editar/Desactivar/Eliminar a menú contextual.
- **Prevención doble registro:** al crear gasto con categoría compra, ofrecer vincular a proveedor.
- **Contacto:** botón "Avisar por WhatsApp" en vencidos (reutiliza flujo manual de cobranza).

---

## 8. FINANZAS

**Fuente de detalle:** `BUSINESS_MODULES_AUDIT-finanzas-reportes.md` §Módulo 1.

**Files:** `finanzas\page.tsx` (268, client), `components\dashboard\financial\{kpi-grid, executive-summary, insights-list, financial-types}`, `lib\financial-intelligence\*` (engine, insights, summary, priority, types, financial-actions), APIs `api\financial`, `api\business-memory\finanzas\preferences`.

**Propósito:** panel ejecutivo "¿cómo está el dinero?" en 3 períodos (hoy/semana/mes). Roles admin/manager/accountant. Caché 60s + invalidación por 20 eventos.

**Vistas:** Todo / Resumen (`ExecutiveSummary`) / Indicadores (`KpiGrid` 6 KPIs con delta) / Insights (`InsightsList`, 12 categorías). Sub-listados TopCollectList/TopPayList (top-3, sin nav a detalle). Persistencia de período/vista.

**Duplicaciones:** tipos financieros x2 (components vs lib); `money()` `$` fijo vs `BicMoney` (USD+Bs) vs `toFixed(2)`; KpiGrid vs créditos; ExecutiveSummary vs BusinessSummaryGenerator (2 narrativas); ingresos en 3 motores con reglas distintas (exclusión crédito solo en analytics); prefs duales (page + financial-preferences).

**UX issues clave:** narrativa duplicada con monitor/BIC; insights no enlazan al detalle filtrado (lista genérica); links a `/dashboard/reports` zombie; sin toggle Bs; sin acceso a punto de equilibrio; loading genérico; prefs silenciosas.

**Propuesta rediseño:**
- **Unificar tipado** (re-export de `lib\financial-intelligence\`).
- **Moneda centralizada** (helper compartido con toggle Bs).
- **KpiGrid compartido** con props (fix duplicación créditos).
- **Insights → acción real:** enlazar a `/dashboard/creditos?filter=overdue` (o recursos concretos), no listas genéricas ni chat.
- **Corregir rutas:** `REPORTS_LINK` → `/dashboard/analytics` directo; retirar `/reports`.
- **Punto de equilibrio accesible** desde finanzas (enlace directo al área Salud Financiera del BIC).
- **Skeleton** que refleje estructura real.

---

## 9. REPORTES / BIC

**Fuente de detalle:** `BUSINESS_MODULES_AUDIT-finanzas-reportes.md` §Módulo 2.

**Files:** `analytics\page.tsx` (37, server) + `analytics-content.tsx` (108), `reports\page.tsx` (4, redirect), `components\business-intelligence-center\*` (bic-shared, bic-monitor-area, bic-operation-area, bic-financial-area, bic-analysis-area, bic-reports-area), `components\dashboard\{punto-equilibrio-tab, gastos-page, sales-chart (461 SVG), cierres-tab}`, `lib\business-intelligence-center\*` (helpers puros cubiertos por tests), `lib\business-intelligence\*` (insight-engine).

**Propósito:** BIC con 5 áreas, cada una responde una pregunta: Monitor (¿cómo está mi negocio?), Operación (¿qué pasó hoy/semana/mes?), Salud Financiera (¿gano o pierdo? → utilidad/margen/**punto de equilibrio**), Análisis (¿cómo evoluciona X?), Reportes (exportar). No duplica lógica de negocio.

**Pantallas:** una página, nav `BicAreaNav` (pills con scroll-x). 4 fetches paralelos. `/dashboard/reports` = redirect puro.

**Duplicaciones:** GastosPage embebido solo en BIC (`bic-financial-area.tsx:124`) — es el único lugar para registrar gastos; `interpretBreakEven` (helper) vs texto del tab; métricas clientes/inventario en múltiples áreas; `aggregateOrdersByStatus` x2; monitor duplica al home del dashboard; 2 insight engines.

**UX issues clave:** `/reports` zombie (sidebar + insights); BIC no es home (chat es home); gastos enterrados (no accesibles desde finanzas ni home); insights del monitor no navegan a la acción (van al chat); 3 estilos de narrativa "Panitas"; equilibrio no cruza con presupuestos; export depende de datos ya cargados.

**Propuesta rediseño:**
- **Eliminar `/reports`** de sidebar e internos (mantener redirect 301 por compatibilidad).
- **Consolidar insights** (un motor o capa de fusión; Monitor como superficie principal, Finanzas consume mismo stream filtrado).
- **Reusar primitivas** (Table/Pagination/SearchInput/FilterChip/EmptyState) en historial de gastos y cierres si crece.
- **Centralizar gráficos** en componente `LineChart`/`BarChart` del DS (o librería) — eliminar SVG duplicado y barras CSS dispersas.
- **Enlazar acciones a módulos reales** (no solo chat).
- **Exponer gastos + equilibrio en Finanzas** o accesos directos desde home.
- **Unificar formato monetario** con toggle Bs.
- **Home como landing del BIC** (monitor como primer bloque o botón "Ver reportes").

---

## 10. Inventario de componentes compartidos (reuso obligatorio)

| Primitiva | Ruta | Notas |
|---|---|---|
| `Table*` (7) | `ui\table.tsx` (105) | overflow-x-auto incluido |
| `Pagination` | `ui\pagination.tsx` (71) | customers |
| `PaginationLinks` | `ui\pagination-links.tsx` | solo orders hoy |
| `SearchInput` | `ui\search-input.tsx` (69) | **casi sin uso** |
| `FilterChip` | `ui\filter-chip.tsx` (31) | **casi sin uso** |
| `EmptyState` | `ui\empty-state.tsx` (23) | créditos; demás usan divs |
| `LoadingState` | `ui\loading-state.tsx` (14) | |
| `Card` | `ui\card.tsx` (94) | hay `Card` local en send-assistant |
| `Tabs` | `ui\tabs.tsx` (74) | collection, config |
| `Sheet` | `ui\sheet.tsx` (125) | sin uso masivo |
| `Dialog` | `ui\dialog.tsx` (147) | modales créditos/proveedores |
| `Timeline` | `credits\timeline.tsx` (45) | **extraer a compartido** |
| `Button` | `ui\button.tsx` | polimórfico con `render` (Base UI) |
| Asistente | `useAssistant().openAssistant` / `assistantHref()` | patrón instalado |
| `BicMoney` | `bic-shared.tsx:159` | USD+Bs — candidato a centralizar |

**No existen:** `Drawer` como primitiva, `DataTable`, librería de gráficos (solo SVG/CSS artesanal + `xlsx/jspdf/jspdf-autotable`).

---

## 11. Orden de implementación y gate por módulo

Orden fijo, con **regresión completa después de cada uno** (typecheck → lint → tests 1427/1427 → build):

1. **Clientes** — KPI server, filtros, detalle con saldo de créditos, Panitas contextual.
2. **Inventario** — paginación + SKU, detalle `[id]`, ajuste de stock modal, unificar catálogo.
3. **Ventas** — consolidar POS (absorber nueva-venta), central de pedidos, timeline detalle, un solo endpoint de estado.
4. **Créditos** — KPIs exactos + paginación, `SearchInput`/`FilterChip`, Dialog en vez de prompt, links cliente/orden, métodos compartidos.
5. **Cobranza** — unificar nombres, flujo lista→detalle, fuente única `src\lib\collection.ts`, eliminar config muerta.
6. **Proveedores** — compartidos `shared\{EntityHeader,BalanceCard,PaymentsCard,Timeline}`, menú contextual, paginación, grid cards.
7. **Finanzas** — tipado unificado, moneda centralizada, KpiGrid compartido, insights→acciones reales, rutas corregidas.
8. **Reportes** — eliminar `/reports`, consolidar insights, primitivas en gastos, gráficos centralizados, acciones a módulos reales.
9. **Cross-cutting** — navegación cross-module, empty/error/loading consistentes, mobile QA, a11y, permission gating, redundancia KEEP/MOVE/MERGE/REMOVE.
10. **Docs finales** — `BUSINESS_MODULES.md`, `BUSINESS_MODULES_UX.md`, `PHASE_9C_REPORT.md`.

**Restricciones invariantes (de FASE 9C):**
- NO agregar funcionalidad nueva; NO tocar business logic/DB/API contracts (solo ocultar por rol).
- UNA acción primaria por pantalla.
- Sin predicciones inventadas; KPIs exactos server-side.
- Balance/saldo siempre del backend (single source of truth), nunca recálculo visual.
- Envío de cobranza sigue siendo 100% manual.
- Punto de Equilibrio y Gastos se conservan; equilibrio contextual, no protagonista permanente.
- Design System 9A: tokens, sin estilos paralelos, sin componentes duplicados.
