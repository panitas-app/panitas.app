# BUSINESS MODULES AUDIT — CLIENTES + CRÉDITOS

> Research-only audit for a UX redesign of a Next.js 16 App Router app.
> App root: `C:\Users\Usuario\Desktop\PanitasApp\panitas`
> Date: 2026-08-11 · No source code was modified.

---

# MODULE 1 — CLIENTES

## Files inventoried

| File | Lines | Role |
|---|---|---|
| `C:\Users\Usuario\Desktop\PanitasApp\panitas\src\app\dashboard\customers\page.tsx` | 203 | List page (client component) |
| `C:\Users\Usuario\Desktop\PanitasApp\panitas\src\app\dashboard\customers\[id]\page.tsx` | 285 | Detail page (client component) |
| `C:\Users\Usuario\Desktop\PanitasApp\panitas\src\services\customer.service.ts` | 121 | Business service |
| `C:\Users\Usuario\Desktop\PanitasApp\panitas\src\repositories\customer.repository.ts` | 110 | Prisma repository |
| `C:\Users\Usuario\Desktop\PanitasApp\panitas\src\app\api\customers\route.ts` | 23 | GET list (paginated) |
| `C:\Users\Usuario\Desktop\PanitasApp\panitas\src\app\api\customers\[id]\route.ts` | 28 | GET detail (orders included) |

There are **no dedicated components** under `src\components\dashboard\` for customers (grep for `customer` in component names returns only consumers: `pos`, `seller`, `nueva-venta`, `crm`, `orders`). All customer UI lives inline in the two pages. `src\lib\analytics\customers.ts` (metrics, agent-facing only) and `src\lib\customer-context` (conversation-ai) exist but are not used by these pages.

## PURPOSE

User reviews their **customer base**: who they are, how much they spend, how often, when they last bought. Route label "Clientes" (`sidebar.tsx:85`). There is **no create flow** — the empty state explicitly says customers appear automatically when they receive orders (`customers\page.tsx:144`). Customers are created by the POS / sale flows via `customer.service.findOrCreateByPhone` (`customer.service.ts:42-80`).

## SCREENS / LIST

**Route:** `/dashboard/customers` — `customers\page.tsx`

- **KPIs (4 cards)** `customers\page.tsx:86-122`: Total (from `json.total`, correct), Órdenes / Gastado / Promedio — computed **client-side by reducing the current page array** (`:98`, `:107`, `:116`). These three are wrong at scale (only reflect page 1 / current search page).
- **Search** `customers\page.tsx:125-133`: single input, placeholder "Buscar por nombre, teléfono o email...", 300 ms debounce (`useDebounce`, `:46`), server-side via `q` param.
- **Filters**: **none** beyond search. No FilterChip, no status/date/location filter.
- **Sorting**: clickable column headers Nombre / Órdenes / Total gastado / Última compra (`:150-161`) with a tiny inline `SortIcon` (text ▲▼, `:75-79`). Not a11y-clean (no `aria-sort`, glyph-based).
- **Pagination**: shared `Pagination` component `customers\page.tsx:206-211` (`ui\pagination.tsx:6-75`); page reset on search/sort change (`:68`).
- **Columns** (`customers\page.tsx:147-204`):
  1. Nombre (+ documentId sub-line, `:170-175`)
  2. Contacto (phone + email stacked, `:177-188`)
  3. Órdenes (right, bold)
  4. Total gastado (right, bold)
  5. Última compra (right, `formatDate` or "—")
  6. Acción (ghost eye icon → `/dashboard/customers/{id}`)
- **Empty state** `customers\page.tsx:140-145`: icon + "No hay clientes registrados" + "Los clientes aparecerán automáticamente cuando reciban pedidos." — no CTA.
- **Loading** `customers\page.tsx:138-139`: inline "Cargando..."; no `loading.tsx` / skeleton.
- **Actions per row**: view only. **No new / edit / delete / export / contact.**

## DETAIL SCREEN

**Route:** `/dashboard/customers/[id]` — `customers\[id]\page.tsx`

Data loaded via `Promise.all` of 3 fetches (`:67-71`): `/api/customers/{id}`, `/api/crm/notes?customerId=`, `/api/crm/follow-ups?customerId=`.

Sections in order:

1. **Header + back** `customers\[id]\page.tsx:133-141`: ghost back arrow, `customer.name`, `documentId` sub-line. No state chip, no actions.
2. **Información card** `customers\[id]\page.tsx:144-169`: phone (tel: link, `:149`), email (mailto, `:154`), address/city/state joined (`:160`), `Separator`, "Cliente desde" (`:166`).
3. **3 KPI cards** `customers\[id]\page.tsx:171-195`: Órdenes, Gastado, Última compra.
4. **Notas (CRM)** `customers\[id]\page.tsx:199-229`: count header, inline add via `Textarea` + "Guardar"/"Cancelar" (`:209-217`), list with date only (`:222-226`). Empty: "Sin notas registradas."
5. **Seguimientos (CRM)** `customers\[id]\page.tsx:232-269`: create button always hardcodes `type: "call"` and `dueDate = now + 7 days` (`:101`), per-item "Completar" for pending (`:260-263`). Empty: "Sin seguimientos pendientes."
6. **Historial de órdenes** `customers\[id]\page.tsx:272-299`: rows link to `/dashboard/orders/{id}` (`:280`), show `orderNumber`, date, status `Badge` (`:287-289`), total. Empty: "Sin órdenes registradas."

Status badge map is **hardcoded** in-page (`customers\[id]\page.tsx:44-51`: pending/confirmed/preparing/shipped/delivered/cancelled) — must match the order schema's actual status values or badges render unstyled.

Not-found state `customers\[id]\page.tsx:124-129`: "Cliente no encontrado" + Volver (router.back).

## ACTIONS

| Action | Where | Notes |
|---|---|---|
| Ver detalle (eye) | list row `customers\page.tsx:195-199` | Only list action |
| Volver | detail `customers\[id]\page.tsx:134` | router.back |
| Llamar / escribir email | detail `:149,154` | tel:/mailto |
| Agregar nota | detail `:204-216` | |
| Crear seguimiento | detail `:237-239` | Hardcoded type + 7 days |
| Completar seguimiento | detail `:260-263` | |
| Ver orden | detail `:280` | Link |

**ONE primary action**: there is none today — the module is read-only. The natural primary action is **contact the customer (WhatsApp)** with context (balance from créditos), and/or "Registrar abono" if the customer has pending credit. No New/Edit/Delete/Export anywhere.

## DUPLICATIONS (cross-module)

- **Customer balance NOT shown in customer detail** — créditos (list + detail), Cobranza IA (`collection`), and Finanzas `TopCollectList`/`topDebtors` (`finanzas\page.tsx:203-229`) all render the same "pending balance" concept from `Order.installments`, but the customer detail page shows only orders — a dead end for debt collection. Data exists to show it: `CreditService.listByCustomer` (`credit.service.ts:161-169`) is already implemented but only used by the agent, not the UI.
- **Customer list duplicated** — `crm\page.tsx:20-126` re-implements a customer list (fetch `/api/customers`, local filter `:42-44`, own stats grid `:55-80`) instead of reusing the customers page.
- **Customer metrics logic duplicated** — `CustomerRepository.metrics` (`customer.repository.ts:84-115`) vs `lib\analytics\customers.ts` (agent) vs client-side reduce in list page.
- **Search input hand-rolled** — `customers\page.tsx:125-133` wraps `Input` + inline `Search` icon; shared `ui\search-input.tsx` exists and is unused.
- **Date formatting** — list uses `lib\utils.formatDate` (includes time, `utils.ts:12-21`); detail uses raw `toLocaleDateString("es-ES")`; credits use `es-VE dd/mm/yyyy` (`credit-types.ts:146-153`). Three different renderings of a date.
- **Order status badge map** duplicated conceptually with orders module.

## DATA (API vs UI)

- `GET /api/customers` (`api\customers\route.ts:8-28`): returns `paginatedResponse` → `{ data, total, page, totalPages, hasMore }` (`lib\pagination.ts:8-15`). Each record = full Prisma `Customer` (`customer.repository.ts:42`). Fields actually consumed: `id, name, phone, email, documentId, totalSpent, totalOrders, lastPurchaseAt, createdAt` (`customers\page.tsx:24-34`). API also supports `limit` up to 100 but the page doesn't use it.
- `GET /api/customers/[id]` (`api\customers\[id]\route.ts:5-32`): returns full Prisma customer + `orders` (desc) with `items.product.name` and `payments`. UI consumes `orders[].orderNumber, status, total, createdAt`; `payments` and `items` are fetched but **not rendered**.
- CRM notes/follow-ups come from separate APIs (`/api/crm/notes`, `/api/crm/follow-ups`) — they are not part of the customer payload, so three round-trips and two failure modes are silently ignored (`customers\[id]\page.tsx:72-74`).

## COMPONENTS USED

| Component | Source | Notes |
|---|---|---|
| `Table*` (7 exports) | `ui\table.tsx` (105) | Has `overflow-x-auto` wrapper `:9-11`. Reusable. |
| `Pagination` | `ui\pagination.tsx` (71) | Reusable. |
| `Card/CardContent` | `ui\card.tsx` (94) | Reusable. |
| `Button`, `Input`, `Badge`, `Separator`, `Textarea` | `ui\*` | Reusable. |
| inline `SortIcon` | `customers\page.tsx:75-79` | Not reusable. |
| inline empty state | `customers\page.tsx:141-145` | Should use `ui\empty-state.tsx`. |

## RESPONSIVE (<768px)

- KPI grid: `grid-cols-2` mobile → `sm:grid-cols-4` (`customers\page.tsx:86`). OK.
- Table: `overflow-x-auto` from `ui\table.tsx:11` gives horizontal scroll; cells use `whitespace-nowrap` (`table.tsx:86`) so **no card fallback** — 6 columns scroll sideways on phones. Usable but not a designed mobile experience.
- Search input full-width; fine.
- Detail page: `md:grid-cols-3` collapses to single column (`:143`) — OK; but KPI cards stay `grid-cols-3` (`:171`) → cramped text ("Última compra" date overflows, `:189-190`).

## UX ISSUES (specific, actionable)

1. **Misleading KPIs** — Órdenes/Gastado/Promedio computed from the *current page* only (`customers\page.tsx:98,107,116`). Must be server-computed (`CustomerService.metrics` already exists) or removed.
2. **No edit, no delete, no export, no create** — module is view-only. At minimum add Edit (name/phone/documentId correction) and Export CSV (promised in pricing per AGENTS.md #11).
3. **No filters** beyond search — no "solo con deuda", "nuevos este mes", "inactivos", etc.
4. **Cross-module dead end** — customer detail has no credit balance, no WhatsApp action, no link to Cobranza/Cobranza IA. "¿Cuánto me debe esta persona?" is unanswerable here.
5. **Hardcoded follow-up defaults** — every follow-up is `type:"call"` + 7 days (`customers\[id]\page.tsx:101`); user cannot choose type/date.
6. **Duplicated/divergent date + money formatting** (`lib\utils.ts:12` vs `credit-types.ts:146` vs `collection-types.ts:122`; money only in credits/collection).
7. **Inconsistent empty states** — list uses hand-rolled div, CRM uses another hand-rolled one (`crm\page.tsx:89-92`), credits use `EmptyState`. Inconsistent copy ("No hay clientes registrados" vs "Sin notas registradas.").
8. **No `aria-sort`**, glyph sort arrows (`customers\page.tsx:75-79`).
9. **Notes/follow-ups load independently** — silent failure if either CRM API errors (`customers\[id]\page.tsx:72-74`).
10. **Hardcoded order-status badges** risk mismatch with actual statuses (`customers\[id]\page.tsx:44-51`).

## REDESIGN PROPOSAL — CLIENTES

- **List** `/dashboard/customers`: header + one primary CTA ("+ Nuevo cliente", opens sheet/dialog since `ui\sheet.tsx` and `ui\dialog.tsx` exist); KPI strip (server-computed: total, nuevos este mes, inactivos 60d, total gastado); `SearchInput` + `FilterChip` row (status: Todos / Con deuda / Al día / Inactivos / Nuevos); responsive table that degrades to stacked cards under `sm` (no horizontal scroll); row action = Ver detalle.
- **Detail** `[id]`: **Detail Header** (name, phone, estado chip, back) → **Resumen** (Órdenes, Gastado, **Saldo pendiente de créditos** — live from `CreditService.listByCustomer`) → **Información** (contact/address, editable) → **Actividad** (tabs: Órdenes · Notas · Seguimientos · Créditos) → **Acciones** (contact WhatsApp with prefilled balance message; "Registrar abono" jumps to the credit).
- **Primary action**: "Preguntar a Panitas" contextual button in header + WhatsApp contact. Single primary CTA for list = Nuevo cliente.
- **"Preguntar a Panitas" plug-in**: reuse `useAssistant().openAssistant(...)` / `assistantHref()` (pattern at `bic-monitor-area.tsx:37-45`, `attention-center.tsx:226-228`, `financial-types.ts:203-205`). Prompts: list → "¿Qué clientes necesitan atención?", detail → "Resume el historial y saldo de {name}".
- **Cross-module links needed**: customer detail ↔ créditos (balance + list of credits), customer ↔ Cobranza IA (contact history), customer ↔ orders (already present), CRM page should deep-link to customers list with the search prefilled.

---

# MODULE 2 — CRÉDITOS

## Files inventoried

| File | Lines | Role |
|---|---|---|
| `C:\Users\Usuario\Desktop\PanitasApp\panitas\src\app\dashboard\creditos\page.tsx` | 165 | List page (client) |
| `C:\Users\Usuario\Desktop\PanitasApp\panitas\src\app\dashboard\creditos\[id]\page.tsx` | 276 | Detail page (client) |
| `C:\Users\Usuario\Desktop\PanitasApp\panitas\src\components\dashboard\credits\credit-card.tsx` | 101 | List card |
| `C:\Users\Usuario\Desktop\PanitasApp\panitas\src\components\dashboard\credits\kpi-grid.tsx` | 64 | KPI strip |
| `C:\Users\Usuario\Desktop\PanitasApp\panitas\src\components\dashboard\credits\payment-modal.tsx` | 124 | Abono dialog |
| `C:\Users\Usuario\Desktop\PanitasApp\panitas\src\components\dashboard\credits\reschedule-modal.tsx` | 116 | Recalculate dialog |
| `C:\Users\Usuario\Desktop\PanitasApp\panitas\src\components\dashboard\credits\timeline.tsx` | 45 | History timeline |
| `C:\Users\Usuario\Desktop\PanitasApp\panitas\src\components\dashboard\credits\credit-types.ts` | 154 | Types + helpers (client) |
| `C:\Users\Usuario\Desktop\PanitasApp\panitas\src\services\credit.service.ts` | 693 | Business service |
| `C:\Users\Usuario\Desktop\PanitasApp\panitas\src\app\api\creditos\route.ts` | 24 | GET list + KPIs |
| `C:\Users\Usuario\Desktop\PanitasApp\panitas\src\app\api\creditos\[id]\route.ts` | 50 | GET detail / PATCH (reschedule, cancel) |
| `C:\Users\Usuario\Desktop\PanitasApp\panitas\src\app\api\creditos\[id]\payments\route.ts` | 34 | POST abono |

Related but separate: `src\app\dashboard\collection\page.tsx` (39) + `components\dashboard\collection\*` (send-assistant 443, template-editor 229, payment-methods-manager 176, contact-history 113, collection-types 127) and `api\business-memory\creditos\preferences\route.ts`.

## PURPOSE

User **collects credit debt** ("Centro de Cobranza", `creditos\page.tsx:109`). Credits are sales made on installments at the POS; here the user tracks who owes what, registers abonos (partial payments), recalculates installment plans, cancels credits, and reminds customers via WhatsApp. Copy: "Cobra tus créditos a tiempo, prioriza vencidos y lleva el control de cada cartera" (`creditos\page.tsx:111-113`).

## SCREENS / LIST

**Route:** `/dashboard/creditos` — `creditos\page.tsx`

- **KPIs (6)** via `KpiGrid` (`creditos\page.tsx:116`, `kpi-grid.tsx:30-65`): Total por cobrar, Créditos activos, Vencidos (count + amount), Vencen en 7 días, Cobrado este mes, % recuperación.
- **Search** `creditos\page.tsx:119-127`: "Buscar cliente, teléfono u orden...", manual debounce 350 ms (`:93-99`).
- **Filters** `creditos\page.tsx:17-24,128-143`: 6 hand-rolled pill buttons with colored dots — Todos, Al día (on_time), Próximos (upcoming), Vencidos (overdue), Pagados (paid), Cancelados (cancelled). **FilterChip component exists but is not used.**
- **List**: stacked `CreditCard` cards (`:155-165`), not a table.
- **No pagination** — API caps at `limit` (default 100, `credit.service.ts:127`); footer shows "Mostrando N créditos · Total pendiente $X" (`creditos\page.tsx:167-172`).
- **Persistence**: filter + search saved via `/api/business-memory/creditos/preferences` (`:37-71`).
- **Empty state** via shared `EmptyState` (`:149-153`) — good, and filter-aware.
- **Loading** via shared `LoadingState` (`:147`).

`CreditCard` content (`credit-card.tsx:28-108`): header (name + state chip + icon), `customerPhone · #orderNumber`, pending amount, `paidInstallments/totalInstallments` + `paidPercent`, progress bar, next-due or overdue line, and action row: **Ver detalle · Registrar abono · Recalcular (only when overdue) · WhatsApp · Historial (#anchor)**.

## DETAIL SCREEN

**Route:** `/dashboard/creditos/[id]` — `creditos\[id]\page.tsx`

Sections in order:

1. **Back link** "Centro de Cobranza" (`:109-111`).
2. **Header** `:112-143`: `customerName` + state chip; action bar `:120-139`: **Registrar abono** (primary), **Recalcular** (outline), **WhatsApp** (outline, link built from `whatsappLink`, reminder text at `:102-104`), **Cancelar** (destructive). Sub-line: `customerPhone · Orden # · Creado el`.
3. **Saldo summary card** `:146-194`: big pending amount (red when overdue), mini-grid Total/Pagado/Inicial (`:155-168`), progress bar + `paidPercent` (`:171-176`), next installment ("Próxima cuota $X · en N días (date)") or "Vencido hace N días" (`:178-192`).
4. **Productos card** `:197-217`: `productName × qty` + subtotal, plus "Total de la venta".
5. **Cuotas card** `:219-250`: each installment row with number, due date, amount, and state Pagada / Vencida / Parcial / Pendiente (derived client-side `:224-244`).
6. **Abonos registrados card** `:253-276`: amount, method label + ref + notes, date. Empty: "Todavía no hay abonos registrados."
7. **Historial card** `:278-285` → `Timeline` (`timeline.tsx:18-49`): created / payment / rescheduled / cancelled / overdue / completed / reminder_sent / client_responded entries (`credit.service.ts:665-760`).

## ACTIONS

| Action | Where | Endpoint |
|---|---|---|
| Registrar abono | card `credit-card.tsx:86-89` + detail `creditos\[id]\page.tsx:122-124` | POST `/api/creditos/{id}/payments` |
| Recalcular | card (only overdue) `credit-card.tsx:90-94` + detail `:127-129` | PATCH `/api/creditos/{id}` `{action:"reschedule"}` |
| Cancelar crédito | detail `:135-137` | PATCH `{action:"cancel"}` via `window.prompt` reason (`:59`) |
| WhatsApp recordatorio | card + detail | `wa.me` link (template string duplicated) |
| Ver detalle / Historial | card `:82-83,103-104` | nav |
| Filter / search persistence | list | business-memory prefs |

**ONE primary action**: **Registrar abono** — it is the revenue-generating action and is already visually primary (solid button) in both card and detail. Keep it as the single primary CTA.

## DUPLICATIONS

- **Customer balance rendered in 4 places**: créditos (this module), Finanzas `TopCollectList` (`finanzas\page.tsx:203-229`), Cobranza IA recommendations (`send-assistant.tsx:214-255`), and (missing) customer detail. All derive from `Order.installments`.
- **Type duplication**: `CreditSummary/CreditKpis/CreditDetail/CreditTimelineEntry` defined in `credit.service.ts:33-99` AND re-declared in `credit-types.ts:14-75` (client). Must be single-source.
- **`money` + `formatDate`**: three near-identical implementations — `credit-types.ts:142-153`, `collection-types.ts:118-127`, `lib\utils.ts:12-21` — with different decimal/locale behavior.
- **WhatsApp reminder template** duplicated verbatim in `credit-card.tsx:23-25` and `creditos\[id]\page.tsx:102-104` (and again conceptually in collection templates).
- **Payment method list**: hardcoded `PAYMENT_METHODS` (`credit-types.ts:135-140`) while Cobranza IA has *configurable* methods (`payment-methods-manager.tsx`, `collection-types.ts:24-28`). `PaymentModal` ignores configured methods and `paymentAccountId`.
- **Hand-rolled filter pills** (`creditos\page.tsx:133-141`) vs available `ui\filter-chip.tsx`.
- **Hand-rolled search** (`creditos\page.tsx:119-127`) vs `ui\search-input.tsx`.
- **Local `Card` component** in `send-assistant.tsx:449-472` duplicates `ui\card.tsx`.
- **State/status meta maps** duplicated across `credit-types.ts:87-133`, `collection-types.ts:80-106`, and order status maps in customers detail.

## DATA (API vs UI)

- `GET /api/creditos?status&search&limit` (`api\creditos\route.ts:8-28` → `credit.service.ts:126-158`): returns `{ kpis, credits }`.
  - `credits` = `CreditSummary[]` (fields at `credit.service.ts:43-63`).
  - **KPI caveat**: KPIs are computed from the **fetched window** (`credit.service.ts:155` computes over `credits` after a fetch of 100/400 rows), so "Total por cobrar", "Vencidos", etc. are **approximations at scale**, not exact aggregates. "Vencen en 7 días" is a *separate exact query* (`:633-641`), but "Cobrado este mes" and "recoveryRate" are exact (`:643-662`).
- `GET /api/creditos/[id]` → `CreditDetail` (`credit.service.ts:171-212`): items, payments (verified only), installments, timeline (built from payments + collection contacts + audit log + installments).
- `POST /api/creditos/[id]/payments` (`api\creditos\[id]\payments\route.ts:9-40`): arbitrary amount, cascade oldest-first (`credit.service.ts:290-347`), validation "monto supera saldo" (`:237-239`). **No `paymentAccountId` is sent by the UI** even though the API accepts it.
- `PATCH /api/creditos/[id]` (`api\creditos\[id]\route.ts:25-62`): `reschedule` (1-24 cuotas, 1-120 days, `credit.service.ts:385-441`) and `cancel` (`:443-471`).
- UI renders essentially everything the API returns — good parity.

## COMPONENTS USED

| Component | Source | Reusable? |
|---|---|---|
| `CreditCard` | `credits\credit-card.tsx` (101) | Yes — module-scoped |
| `KpiGrid` | `credits\kpi-grid.tsx` (64) | Generic-ish; hardcodes 6 KPIs |
| `PaymentModal` | `credits\payment-modal.tsx` (124) | Yes |
| `RescheduleModal` | `credits\reschedule-modal.tsx` (116) | Yes |
| `Timeline` | `credits\timeline.tsx` (45) | **High** — generic activity timeline, reusable for customer/order detail |
| `credit-types.ts` | 154 | Duplicates server types |
| `EmptyState`, `LoadingState`, `Dialog`, `Button`, `Input`, `Textarea`, `Label`, `Card` | `ui\*` | Reusable (used) |
| `Tabs`, `Sheet`, `FilterChip`, `SearchInput`, `Pagination` | `ui\*` | Available but **unused** here |

## RESPONSIVE (<768px)

- List: cards stack naturally (`space-y-3`, `:155`); KpiGrid 2 cols → 3 sm → 6 lg (`kpi-grid.tsx:29`); search + filters go vertical (`:118`); card action row wraps (`credit-card.tsx:81`). **Good mobile behavior**.
- Detail: action bar wraps (`:120`); summary mini-grid stays `grid-cols-3` (`:155`) — "Total / Pagado / Inicial" cramped on phones; products/cuotas become single column (`lg:grid-cols-2`, `:196`) — OK; timeline and abonos fine.
- No table anywhere in this module — no horizontal-scroll problem.

## UX ISSUES (specific, actionable)

1. **Name collision / confusing IA**: sidebar label "Créditos" (`sidebar.tsx:105`) vs page title "Centro de Cobranza" (`creditos\page.tsx:109`) vs a *separate* "Cobranza IA" module (`collection`). Users cannot tell Cobranza (send reminders) from Créditos (register abonos) apart.
2. **No pagination on the list** — up to 100 cards rendered; no virtualization, no page 2. At 400+ credits the list is unusable and the "Mostrando N" line under-communicates.
3. **KPIs are window-based, not exact** (`credit.service.ts:140,155`) — "Total por cobrar" silently under-reports once >100 (or >400 on a filter) credits exist.
4. **Cancelar uses `window.prompt`** for the reason (`creditos\[id]\page.tsx:59`) — native prompt breaks the design language; and cancel is destructive with no confirm dialog and no undo.
5. **"Recalcular" is ambiguous copy** — it rewrites the whole installment plan (deletes unpaid installments, `credit.service.ts:362-364`); better label: "Replanificar" / "Nuevo plan". It also appears in list only for overdue but in detail for all `canPay` states (inconsistent).
6. **Payment methods hardcoded** in the abono modal (`payment-modal.tsx:102-115`) while Cobranza lets the user configure methods — mismatch; `paymentAccountId` never sent.
7. **Duplicate reminder/message logic** across `credit-card.tsx`, detail page, and collection templates — one edit point would be better.
8. **`money()` lacks thousands grouping** (`credit-types.ts:143`) vs `collection-types.ts:119` which groups — inconsistent amounts displayed between modules.
9. **Detail has no link to the customer** (customerName is plain text, `creditos\[id]\page.tsx:114`) and **no link to the order** — cross-module dead ends.
10. **No export** of cartera or abonos (feature promised in pricing, AGENTS.md #11).
11. **Preferences written on every change** with no error handling (`creditos\page.tsx:58-71`) — minor network chatter.
12. **`window.prompt` cancel path** leaves a cancelled credit with no UI trace in the list beyond the chip; no restore action.

## REDESIGN PROPOSAL — CRÉDITOS

- **List** `/dashboard/creditos`: header + primary CTA **"Registrar abono"** opens an inline "quick abono" flow (pick credit → amount → method → confirm); KPI strip (exact, server-computed aggregates); `SearchInput` + `FilterChip` row (reuse existing states); **paginated** list; replace card action row with a compact row: state chip · pending · next due · [Abono][Ver]; keep the footer total but computed server-side.
- **Detail** `[id]`: **Detail Header** (customer name — now a **link to `/dashboard/customers/{id}`** —, state chip, back) → **Resumen** (pending + progress + next due) → **Información** (order nº, customer phone, created, products) → **Actividad** (Cuotas · Abonos · Historial timeline as sub-sections or `Tabs`) → **Acciones** (Registrar abono primary; Replanificar; WhatsApp; Cancelar via proper `Dialog` confirm, not `window.prompt`).
- **Primary action**: **Registrar abono** (both list and detail). One primary CTA only; move WhatsApp/Recalcular/Cancelar to secondary/ghost/more-menu.
- **"Preguntar a Panitas" plug-in**: contextual prompt in header — "¿Cuál es mi cartera vencida y qué debería cobrar hoy?" (list) and "Resume el estado de la orden #X para {name}" (detail), using the existing `useAssistant`/`assistantHref` pattern; plus a "dejar que Panitas cobre" entry point bridging to Cobranza IA.
- **Cross-module links needed**: crédito ↔ customer detail (name link + balance shown there), crédito ↔ order detail (`/dashboard/orders/{id}`), créditos ↔ Cobranza IA (button "Preparar recordatorio" opens collection with the credit preselected), shared `paymentMethods` from collection settings in the abono modal.

---

# SHARED LIST/DETAIL PATTERNS AVAILABLE (reuse inventory)

| Capability | Component | Status |
|---|---|---|
| Table | `ui\table.tsx` (105) | Used by customers; horizontal scroll built-in |
| Pagination | `ui\pagination.tsx` (71) | Used by customers |
| EmptyState | `ui\empty-state.tsx` (23) | Used by créditos |
| LoadingState | `ui\loading-state.tsx` (14) | Used by créditos |
| SearchInput | `ui\search-input.tsx` (69) | **Unused by both** |
| FilterChip | `ui\filter-chip.tsx` (31) | **Unused by both** |
| Card + sub-parts | `ui\card.tsx` (94) | Used by both |
| Tabs | `ui\tabs.tsx` (74) | Used by collection only |
| Sheet / Drawer | `ui\sheet.tsx` (125) | Unused by both |
| Dialog | `ui\dialog.tsx` (147) | Used by créditos modals |
| Badge / Button / Input / Select / Label / Textarea / Separator | `ui\*` | Used |
| Activity Timeline | `credits\timeline.tsx` (45) | Generic — candidate to extract to `ui\` |

Also available: `useAssistant()`/`openAssistant` provider (`components\assistant\assistant-provider.tsx`), `assistantHref()` (`dashboard\financial\financial-types.ts:203-205`), `LoadingState`/`EmptyState`/`ErrorState` trio.

---

## CROSS-CUTTING FINDINGS (both modules)

1. **Three date formatters + two money formatters** with divergent output (`lib\utils.ts:12`, `credit-types.ts:142`, `collection-types.ts:118`). Extract one `lib\format.ts`.
2. **Duplicate type definitions** server vs client (`credit.service.ts` vs `credit-types.ts`). Generate/shared package.
3. **Same filter+search pattern implemented 3 different ways** (customers `useDebounce`, créditos ref-based debounce, CRM local filter). Consolidate on `SearchInput` + `FilterChip` + one list-fetch hook.
4. **"Preguntar a Panitas" pattern** is established (topbar FAB + `openAssistant` + `assistantHref`); both modules should expose contextual prompts.
5. **KPIs are computed where they shouldn't be** (client reduce in customers; window-based in créditos). Move to server service/metrics.
