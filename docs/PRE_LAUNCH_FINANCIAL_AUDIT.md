# Panitas 2.0 — Pre-Launch Financial & Database Audit

Audit date: 2026-08-11 · Read-only review (no files modified).
Scope: commerce flows, credits, collections, suppliers, reports/analytics, cash register, currency, dates, transactions. All paths relative to `panitas/`. Line numbers match the current working tree.

## Severity legend
- **P0** — launch blocker: security hole or data destruction.
- **P1** — high: produces wrong money numbers or silent data loss.
- **P2** — medium: must fix soon (races, wrong windows, scalability).
- **P3** — low: cosmetic, maintainability, or edge case.

---

## 1. Sales / Orders consistency

- **Order creation is not atomic.** The whole flow is a sequence of standalone writes: order → items → payments → installments → stock decrement → seller commission → customer totals → coupon count → audit → events (`src/services/order.service.ts:430-668`). The code even documents why (`order.service.ts:430`), but there is **no compensating action** on failure. If `decrementStock` fails (concurrent sale drained stock), the order/items/payments already exist as orphans and the client still gets a 400 (`src/repositories/order.repository.ts:127-139`). **P1**
- `decrementStock` itself is correctly guarded (atomic `updateMany … stock >= quantity`, `src/repositories/order.repository.ts:123-126`); the pre-check at `order.service.ts:270` is redundant but harmless. The problem is only the lack of a transaction/rollback around the whole create.
- **Cancellation restores stock and reverses customer totals outside any transaction** (`order.service.ts:202-224`), and the `order.status === "cancelled"` re-entry guard at `order.service.ts:206` is read-then-write: two concurrent cancels of the same order can both pass it and double-restore stock / double-decrement customer totals. **P2**
- **Cancelling an order does not cancel its payments or installments.** `updateStatus` only flips status and emits events (`order.service.ts:110-199`). A cancelled order can keep `paymentStatus="paid"`, keep open `Installment` rows (credit remains "collectible"), and its payments still feed cash-register close totals and analytics revenue. **P1**
- `verify-payment` forces `paymentStatus="paid"` and `status=orderStatus` on **any** verified payment (`src/app/api/orders/[id]/verify-payment/route.ts:36-48`), including on a credit order whose installments are still pending — mislabels a partial/credit order as fully paid. Payment update and order update are separate writes (partial failure leaves payment verified / order pending). **P2**
- **Two different "revenue" definitions coexist and disagree:**
  - `SalesRepository.summary` → `sum(order.total)` where `paymentStatus in ["paid","verified"]` (accrual; only fully-paid orders) — `src/repositories/sales.repository.ts:20-27`.
  - `/api/analytics` → `sum(orderPayment.amount)` where `status="verified"` bucketed by `paidAt` (cash basis) — `src/app/api/analytics/route.ts:57-73`.
  The financial panel uses the first (`src/lib/financial-intelligence/financial-engine.ts:188`) while the dashboard uses the second; the same month renders different numbers. **P1**
- **Credit sales can be double-counted in analytics revenue.** `order.service.ts:493` stores any `method === "credit"` payment as `status="verified"` for the financed amount, and every abono also creates a verified `OrderPayment` (`src/services/credit.service.ts:263-274`). `/api/analytics` sums **all** verified payments (`analytics/route.ts:58-73`) → financed amount counted at sale and again when collected. **P1**
- Analytics `totalOrders` counts cancelled orders while `monthOrders` excludes them (`analytics/route.ts:78,92,156`); `averageTicketMonth = monthRevenue / monthOrders` mixes a cash-basis numerator with an order-count denominator (`analytics/route.ts:158`). **P2**
- `topProducts` revenue uses `orderItem.subtotal` (pre-discount, pre-shipping) so it never reconciles to `order.total` (`analytics/route.ts:79-85,127-131`). **P3**
- **Schema cascade risks on sales history:** `OrderItem.productId → onDelete: Cascade` deletes historical order items when a product is deleted (`prisma/schema.prisma:636`); `Store.userId` / `Negocio.userId` → Cascade wipes the whole tenant on user delete (`schema.prisma:286,112`); `CashRegisterSession.openedBy` → Cascade deletes cash history (`schema.prisma:783`). `Order.customerId`/`Order.userId` → SetNull are safe (`schema.prisma:575,578`). **P1**
- `Order.paymentStatus` comment lists `pending, paid, failed, refunded` (`schema.prisma:564`) but code writes `partial`/`credit` too (`order.service.ts:422-428`) — stale enum, consumers filter inconsistently. **P2**

## 2. Credits

- **`registerPayment` is not transactional.** Cascade loop of per-installment `UPDATE` (`src/services/credit.service.ts:243-261`) followed by `orderPayment.create` (`credit.service.ts:263-274`). A failure between the loop and the create leaves installments applied with **no payment record**; a replayed/concurrent POST can pass the `amount > pendingTotal` check (`credit.service.ts:237`) twice and over-apply. **P1**
- No idempotency key on abonos (the check at `credit.service.ts:237` is not a lock). Duplicate OrderPayment rows are possible under double-submit. **P2**
- **`reschedule` deletes ALL installments, including already-paid ones** (`deleteMany({ where: { orderId } })`, `credit.service.ts:355`) before recreating the plan — per-installment `paidAmount`/`paidAt` history is wiped (only `OrderPayment` survives). Delete + loop-create + order update are not one transaction (`credit.service.ts:355-367`). **P1**
- **KPIs are computed from an in-memory subset, not the whole store.** `list` fetches `take = limit` (default 100) or max 400 (`credit.service.ts:140,157`) and `computeKpis` runs over that array (`credit.service.ts:566-611`); the financial engine asks for `limit: 500` (`financial-engine.ts:198`). Beyond ~100–500 credit orders, `totalPending`/`overdueAmount`/`recoveryRate` are silently wrong. **P2**
- `dueNext7Days` window starts **tomorrow** at 00:00 (`credit.service.ts:573-579`) — installments due today are excluded from "next 7 days". **P2**
- Completing a credit flips `order.paymentStatus="paid"` (`credit.service.ts:281-284`), which makes `SalesRepository.summary` suddenly count the **full order.total** in that period even though the money arrived across many periods — accrual spikes when the last cuota is paid. **P2**
- **Credit via `creditDays` without cuotas creates no Installment rows** (`order.service.ts:388-391` vs `410-419`). Such orders then read as fully paid: `toSummary` treats zero installments as `paid` (`credit.service.ts:510`) and collection blocks reminders with "no saldo pendiente" (`src/services/collection.service.ts:398`). **P2**
- `getDetail` only shows payments with `status: "verified"` (`credit.service.ts:177`) — a "pending" abono is invisible in the credit timeline even though it exists. **P3**
- `normalizeStatus` maps any unknown value to `active` (`credit.service.ts:446-450`) — legacy null/other `creditStatus` misread. **P3**

## 3. Collections

- By design no automated send: `prepareReminder` only renders + logs a `pending` contact (`src/services/collection.service.ts:376-466`) and `markContact` moves `pending → sent → responded` (`collection.service.ts:472-512`). Design is sound.
- **`recommendations` only scans the 500 most recent credit orders** (`collection.service.ts:540-548`) — older overdue credits never surface in "¿a quién contactar hoy?". **P2**
- A `despues_abono`/`agradecimiento` reminder can be prepared for a credit with zero balance; the balance guard only applies to the three reminder categories (`collection.service.ts:392-401`). **P3**
- `markContact("responded")` silently sets `sentAt` without requiring a prior `sent` state (`collection.service.ts:483-486`). **P3**
- `CollectionContactLog` grows unbounded (every prepared reminder inserts a row, `collection.service.ts:416-429`); no retention/cleanup. **P3**
- `whatsappUrl` is the only delivery path (`collection.service.ts:464`) — fine for MVP, but if the roadmap expects auto-sends this is a product gap, not a bug. **P3**

## 4. Suppliers

- **`registerPayment` is not transactional** — per-invoice `UPDATE` loop + `supplierPayment.create` (`src/services/supplier.service.ts:419-447`), same partial-failure and double-submit exposure as credits (guard at `supplier.service.ts:412` is not a lock). **P1**
- **Deleting a supplier silently destroys the accounts-payable record.** `SupplierInvoice.supplierId` and `SupplierPayment.supplierId` are `onDelete: Cascade` (`prisma/schema.prisma:914,939`) and `remove()` has no outstanding-balance check (`supplier.service.ts:300-323`). **P1**
- `list` loads invoices/payments for up to 500 suppliers (`supplier.service.ts:173-183`); beyond that, per-supplier balance/top lists silently truncate (KPIs are computed store-wide separately, `supplier.service.ts:537-582`). **P3**
- `SupplierInvoice.number` is not unique (`schema.prisma:898`) — duplicate invoice numbers allowed; report reconcilers can't rely on it. **P3**
- Cascade payment allocation uses `dueDate ?? invoice.date` (`supplier.service.ts:407-409`) — invoices without a due date are treated as due on creation date; acceptable but undocumented. **P3**
- `SupplierPayment.invoiceId → onDelete: SetNull` (`schema.prisma:942`) means payments detach from invoices when an invoice disappears (only reachable via the supplier cascade). **P3**

## 5. Reports / analytics

- **"Week" is defined differently per module:** `/api/analytics` starts weeks on Sunday (`weekStart.setDate(getDate() - getDay())`, `src/app/api/analytics/route.ts:31`), while `sales.ts` and `sales.service.ts` start on Monday (`(getDay() + 6) % 7`, `src/lib/analytics/sales.ts:29`, `src/services/sales.service.ts:33`) and the financial engine uses Monday too (`financial-engine.ts:51`). Same label, different windows. **P1**
- Revenue definition divergence (accrual vs cash) and credit double-count — see §1.6/§1.5; `monthlySeries` inherits the double-count because it sums verified payments (`analytics/route.ts:93-115`). **P1**
- Breakeven uses verified-payment cash basis for `ventasMes` (`src/app/api/analytics/breakeven/route.ts:56-67`) but `puntoEquilibrio` only sums `isRecurring` expenses (`breakeven/route.ts:34-43`); `porcentaje = ventasMes / puntoEquilibrio` (`breakeven/route.ts:71`) can exceed 100% and mix bases. **P2**
- `finanzas` computes "profit" as current-inventory margin **plus all-time expenses** (`src/app/api/analytics/finanzas/route.ts:23-26`) — conflates stock valuation with P&L; `totalExpenses` ignores the date range and `profitMargin` uses the sell value of remaining stock, not of goods sold. **P2**
- Financial cache is in-memory with 60s TTL (`financial-engine.ts:41,110-145`) and a **module-level engine instance** (`src/app/api/financial/route.ts:6`); under serverless cold starts each process starts its own cache, so invalidation via event listeners (`financial-engine.ts:275-277`) only works within one process → stale panels across instances. **P2**
- `getEffectiveRate()` returns `0` when no rate exists or on error (`src/lib/bcv/index.ts:15-23`); the frontend hides Bs totals whenever `bcvRate === 0` (e.g. `src/app/store/[slug]/checkout/page.tsx:503`) — silent absence of conversion, no warning. **P2**
- Customer metrics: `recurrent` = `totalOrders > 1` (`src/repositories/customer.repository.ts:95`); `lastPurchaseAt` is only refreshed inside `findOrCreateByPhone` (`src/services/customer.service.ts:45`), so POS orders that don't resolve a phone → customer are invisible to the `inactive` metric. **P3**
- `topProducts` name fallback is `"Producto eliminado"` (`analytics/route.ts:128`) — direct consequence of the product cascade in §1. **P3**

## 6. Cash register

- **Close totals include cancelled orders and unverified payments.** `totalSales += order.total` and the payment switch run over **all** linked orders with **no `order.status` or `payment.status` filter** (`src/app/api/cash-register/[id]/route.ts:54-66`). A pending transfer is counted as collected; a cancelled sale inflates the close. **P1**
- `totalCredit` sums the **full** `inst.amount` for `status: "pending"` only (`route.ts:63-65`) — partially-paid installments (now `late`/`pending` with `paidAmount > 0`) are overcounted or excluded entirely, and credit orders without cuotas (§2.8) contribute nothing. **P1**
- **Read-then-update close is not transactional** (`route.ts:45-78`): orders created between the `findMany` and the `update` are lost from the totals; two concurrent `close` PATCHes both see `status: "open"` and double-close. **P1**
- **`closingBalance`, `totalDivisas`, `totalCard` are never written by the close route** (schema columns at `prisma/schema.prisma:764,773-774`) — the cashier's physically counted cash is never reconciled, and divisas/card totals are always 0. **P2**
- Payment methods not in the switch (`binancepay`, `zelle`, …) are silently dropped from close totals (`route.ts:57-61`); these methods exist in the UI (`src/app/dashboard/pos/page.tsx:1390`). **P1**
- Open flow is read-then-create (`src/app/api/cash-register/route.ts:33-44`): two concurrent opens both pass the `findFirst` and create two open sessions. **P2**
- **Orders can be attached to an already-closed session:** `order.service.ts:449` accepts `cashRegisterSessionId` without checking the session status, so post-close orders are excluded from that session's totals forever. **P1**
- `closedBy` is a free string, not a validated user (`schema.prisma:766`). **P3**
- `GET` returns the full session with nested orders/payments unpaginated (`route.ts:11-24`). **P3**

## 7. Currency

- **All commerce money is `Float` (DOUBLE PRECISION):** `Order.subtotal/discount/shippingCost/total` (`schema.prisma:557-560`), `OrderItem.price/subtotal` (`schema:629`), `OrderPayment.amount` (`schema:651`), `Installment.amount/paidAmount` (`schema:675,679`), `CashRegisterSession` totals (`schema:762-777`), `Expense/SupplierInvoice/SupplierPayment` amounts (`schema:831,900,928`). Decimal is reserved for employee commissions/payments. Float money → rounding drift in totals/reconciliation. **P1**
- Order default currency is `"USD"` (`order.service.ts:440`; `schema:561`) but the shared helper `formatPrice` defaults to `"Bs"` (`src/lib/utils.ts:8-9`) — display mismatch and no single source of truth. **P2**
- **No shared currency formatter:** ad-hoc `$...toFixed(2)` (`credit.service.ts:634`, `supplier.service.ts:764`), `Intl.NumberFormat("es-EC", {currency:"USD"})` (`src/lib/financial-intelligence/financial-summary.ts:10`, `financial-insights.ts:17`), `es-VE` (`utils.ts:9`), `en-US` (`collection.service.ts:196`). Same figure renders differently across screens. **P3**
- `bcvRateAtOrder` is correctly frozen at order time (`order.service.ts:356,439`; `schema:567`), but `BcvRate` has **no index on `date`** (`schema.prisma:794-801`) and `getEffectiveRate` falls back to 0 (§5.6). **P2**
- `OrderPayment.method` is a free-form string (`schema:650`); the POS writes `binancepay` (`pos/page.tsx:1390`) yet cash close and cash-register totals only handle `cash/bank_transfer/pago_movil` (§6.4). **P1**
- Bs conversions happen only at render time with the **live** rate, not the frozen `bcvRateAtOrder` (`checkout/page.tsx:503,1152`), so historical Bs views shift as the rate moves. **P3**

## 8. Dates

- **`new Date("YYYY-MM-DD")` is parsed as UTC midnight** and then compared against local `timestamptz`, so `lte: new Date(to)` cuts off the final local day of any date-range filter: `src/repositories/order.repository.ts:33`, `src/app/api/expenses/route.ts:24`, `src/app/api/admin/audit/route.ts:26`, `src/app/api/commissions/route.ts:26`, `order.service.ts:230-231`, `sales.service.ts:114-142`. Range reports silently lose the last day. **P1**
- `dueNext7Days` window starts tomorrow, excludes today (§2.5, `credit.service.ts:573-579`). **P2**
- Week-start Sunday vs Monday mismatch (§5.1). **P1**
- `periodRange` previous-period math is internally consistent (`financial-engine.ts:63-84`); only the 31-day-month month-over-month `prevFrom` is approximate (prev period always defined as 1 month minus, `financial-engine.ts:77`). **P3**
- Overdue-day counts use `Date.now()` at render time in two different modules with slightly different formulas (`credit.service.ts:496-499` vs `collection.service.ts:711-714`). **P3**
- `toLocaleDateString("es-VE")` in server code (`collection.service.ts:203`, `supplier.service.ts:760`) depends on ICU availability in the runtime — may fall back to a default locale. **P3**
- **Migration/DB note (mojibake):** baseline migration `20260811000000_baseline_to_current_schema/migration.sql:397` writes the default `'Nueva conversaci├│n'` (bytes `E2 94 9C E2 94 82`) while `schema.prisma` declares `"Nueva conversación"` (`C3 B3`) — new conversations get corrupted default text. **P2**

## 9. Transactions

- **The entire app contains only two `$transaction` calls**, both in admin reorder helpers (`src/app/api/admin/sales-questions/reorder/route.ts:17`, `src/app/api/admin/sales-sections/reorder/route.ts:17`). Every money-moving flow is a sequence of independent statements:
  - Order create (order + items + payments + installments + stock + commission + customer totals + coupon) — `order.service.ts:430-668`
  - Credit abono — `credit.service.ts:243-274`
  - Credit reschedule — `credit.service.ts:355-367`
  - Supplier payment — `supplier.service.ts:419-447`
  - Cash close — `cash-register/[id]/route.ts:45-78`
  - Payment verify — `orders/[id]/verify-payment/route.ts:36-48`
  Each can leave partial rows (orphaned order, applied-but-unrecorded abono, verified-but-pending payment). **P1**
- The Neon-HTTP note at `order.service.ts:430` explains the constraint but there is **no compensating action/outbox** on failure. **P1**
- Customer totals (`totalSpent`/`totalOrders`) are incremented outside the order write (`order.service.ts:591-593`) and reversed outside the cancel write (`order.service.ts:222-223`) — drift on any mid-flow failure. **P1**
- **Audit double-write:** every mutation calls `createAuditEntry` (e.g. `order.service.ts:130-137,600-606`) and also persists a domain event via `fireDomainEvent` (`src/lib/events/event-history/prisma.ts:52`) — `AuditLog` grows unbounded with no retention job. **P2**
- Stock movements are written in a per-item loop with per-item events (`order.service.ts:512-567`); a mid-loop failure leaves partial movements/alerts. **P2**
- Cancel double-run race (§1.2) because `incrementStock` is unconditional (`order.repository.ts:141-146`). **P2**
- Low-stock threshold is a magic `5` in `order.service.ts:539` duplicated from `src/lib/analytics/inventory.ts:18`. **P3**
- Cron `expire-plans` iterates plans with **no `take`** (unbounded), while the other crons cap at 50 — see prior schema/cron audit. **P2**

---

## Quick P0/P1 summary (fix order)
1. No transactions anywhere money moves (§9) — orphaned orders, split abonos, non-atomic cash close.
2. Cash close counts cancelled + unverified + unsupported-method payments and drops post-close orders (§6).
3. Credit revenue double-count and two divergent "revenue" definitions (§1.5, §1.6).
4. Supplier delete wipes AP history via cascade (§4.2); product delete wipes order items via cascade (§1.10).
5. Date-range `lte` cutoff drops the last day of every filtered report (§8.1).
6. `reschedule` destroys paid-installment history (§2.3).
