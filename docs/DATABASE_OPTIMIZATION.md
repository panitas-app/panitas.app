# DATABASE OPTIMIZATION — FASE 3E

**Rama:** `develop-v2` · **Fecha:** 02/08/2026 · **BD:** `panitas-postgres` (puerto 5433)

---

## 1. Índices añadidos en 3E

Aplicados con `npm run db:push` (backup previo: `backup-2026-08-02T20-44-19-970Z.sql`, 458.6 KB).
`prisma validate` OK.

| Modelo | Índices añadidos | Queries que beneficia |
|---|---|---|
| `Product` | `@@index([storeId])`, `@@index([storeId, isActive])`, `@@index([sku])`, `@@index([barcode])` | listado/catálogo por tienda, SKU/barcode lookups |
| `OrderItem` | `@@index([orderId])`, `@@index([productId])` | detalle de órdenes, reportes por producto |
| `OrderPayment` | `@@index([orderId])`, `@@index([paymentAccountId])` | pagos por orden, reportes por cuenta |
| `Expense` | `@@index([storeId])`, `@@index([storeId, date])` | listado/filtros de gastos por tienda+fecha |
| `Collection` | `@@index([storeId])` | colecciones por tienda |

`PaymentAccount` ya tenía `@@index([storeId])` y `@@index([storeId, name])` — sin cambios.

---

## 2. Estado del modelo

- **74 modelos**, 4 migraciones (`init`, `plans_crm_automations`, `plans_agenda_negocio`,
  `cash_register_session`). El esquema se mantiene en sincronía vía `db:push` (regla del
  proyecto: `migrate dev/reset` bloqueados).
- `rls-policies.sql` y `seed.sql` existen en el repo pero **no se aplican** en `db:push`.

---

## 3. Observaciones

1. **Sequelize/Prisma + Neon HTTP**: varios servicios evitan `update + include` en el mismo
   query (interactive transactions) — patrón ya respetado en `order.service`, `verify-payment`.
2. **Upsert de memoria** `BusinessMemory @@unique([storeId, key])` ya indexado por la PK compuesta.
3. **Índice `Product.sku`/`barcode`**: son nullable; el índice solo cubre filas con valor
   (Postgres maneja NULLs en índices B-tree sin penalizar búsquedas `IS NOT NULL`).

## 4. Pendiente futuro (fuera de alcance 3E)
- Evaluar RLS en Postgres como segunda capa de aislamiento (el archivo `rls-policies.sql`
  está sin aplicar).
- Particionado de `Order`/`OrderItem` si el volumen crece (todas las queries ya van por `storeId`).
