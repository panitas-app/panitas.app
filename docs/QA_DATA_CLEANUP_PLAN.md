# QA_DATA_CLEANUP_PLAN.md — Plan de Limpieza de Datos QA en Producción

**FASE 10B.1 · 2026-08-14 · Branch: `develop-v2` · HEAD: `577c28c`**

## 1. Alcance y reglas

- **NO** se borran datos reales (negocios, clientes, ventas, suscripciones legítimas)
- **SOLO** tenants identificados como QA/prueba
- Mecanismo: `DELETE` por IDs explícitos en orden de dependencia (FK), **NUNCA** `DROP DATABASE`/`TRUNCATE`
- Backup de seguridad previo: `backups/panitas-2026-08-14T03-54-32.dump` (✅ verificado, ver `DATABASE_BACKUP_STATUS.md`)

## 2. Tenants QA identificados (5)

| # | Email | User ID | Negocio ID | Store ID | Clasificación |
|---|-------|---------|------------|----------|---------------|
| A | `qa.prod.0813184553@nowhere.invalid` | `cmss3x7fq000004kzbmqj97y1` | `cmss3x8u4000304kzlr4k8h2f` | `cmss3x98o000404kzze23q5mx` | **100% QA** (creado 13/08 para smoke) |
| B | `qa.tenantb.0813185036@nowhere.invalid` | `cmss438zs000004jsffqjbpqt` | `cmss439zf000304jsaiezgjg2` | `cmss43ae4000404jsym2q52mh` | **100% QA** (creado 13/08 para aislamiento) |
| C | `prueba@panitas.app` | `cms0mzqwz000304lav7y8d8b6` | `cms0mzqxw000404laorcc2sr2` | `cms0mzqza000604lajxy5k97n` | Cuenta de prueba (julio) |
| D | `pruebamanual@panitas.app` | `cms0s06sz000004kzyw3e7g6z` | `cms0s0hz8000004l9t5xa4mq2` | `cms0s0i0j000104l981umgkuy` | Cuenta de prueba (julio) |
| E | `prueba29@panitas.app` | `cms68cvp4000004l563ec129h` | `cms68d8r7000004l1aqq1hnt5` | `cms68d8rt000104l1zmq2ofip` | Cuenta de prueba (julio) |

## 3. Inventario de filas QA por tabla

### Tenant A (qa.prod…)

| Tabla | Filas | Notas |
|---|---|---|
| User | 1 | propietario |
| Negocio | 1 | |
| Store | 1 | |
| StoreMember | 1 | |
| Product | 2 | `Producto QA Aislamiento…`, `Producto Verif Mig QA` |
| Order | 2 | `ORD-20260813-3HE4`, `ORD-20260813-XODM` |
| OrderItem | 2 | |
| OrderPayment | 2 | |
| Installment | 3 | |
| StockMovement | 2 | por productos QA |
| Conversation | 3 | |
| ConversationMessage | 14 | |
| BusinessMemory | 4 | |
| AuditLog | 24 | por storeId / 23 por userId (actividad QA) |
| **Total filas aprox** | **~60** | |

### Tenant B (qa.tenantb…)

| Tabla | Filas |
|---|---|
| User | 1 |
| Negocio | 1 |
| Store | 1 |
| StoreMember | 1 |
| (resto) | 0 |
| **Total filas aprox** | **4** |

### Tenant C (prueba@…)

| Tabla | Filas |
|---|---|
| User | 1 |
| Negocio | 1 |
| Store | 1 |
| StoreMember | 1 |
| Agenda | 1 |
| (resto) | 0 |
| **Total filas aprox** | **5** |

### Tenant D (pruebamanual@…)

| Tabla | Filas |
|---|---|
| User | 1 |
| Negocio | 1 |
| Store | 1 |
| StoreMember | 1 |
| Agenda | 1 |
| Appointment | 1 |
| Service | 3 |
| (resto) | 0 |
| **Total filas aprox** | **9** |

### Tenant E (prueba29@…)

| Tabla | Filas |
|---|---|
| User | 1 |
| Negocio | 1 |
| Store | 1 |
| StoreMember | 1 |
| Agenda | 1 |
| (resto) | 0 |
| **Total filas aprox** | **5** |

## 4. Grafo de dependencias (orden de eliminación)

Orden de borrado por FK (hijos → padres), para no depender solo del CASCADE:

1. `OrderItem`, `OrderPayment`, `Installment` — por `orderId` de las 2 órdenes QA
2. `StockMovement` — por `productId`/`storeId` QA
3. `Order` — por `storeId` QA
4. `Product` — por `storeId` QA
5. `ConversationMessage` — por `conversationId` QA
6. `Conversation` — por `storeId`/`userId` QA
7. `BusinessMemory` — por `storeId`/`userId` QA
8. `AuditLog` — por `storeId`/`userId` QA
9. `Appointment` — por `negocioId`/`serviceId` QA (tenants C/D/E)
10. `EmployeeService`, `Schedule`, `BlockedSlot` — por `agendaId`/`serviceId` QA
11. `Service` — por `negocioId`/`agendaId` QA
12. `Agenda` — por `negocioId` QA
13. `StoreMember` — por `storeId`/`userId` QA
14. `Store` — por `negocioId`/`userId` QA
15. `Negocio` — por `userId` QA
16. `Session`, `Account`, `SupportTicket` — por `userId` QA
17. `User` — IDs QA

## 5. FKs con CASCADE que ya cubren el borrado

- `Negocio.userId → User`: CASCADE (borra negocio al borrar user)
- `Store.userId → User`: CASCADE
- `Store.negocioId → Negocio`: **SET NULL** (relevante solo si se borra negocio antes que user)
- `Order.storeId → Store`: CASCADE
- `Product.storeId → Store`: CASCADE
- `Conversation.storeId → Store`: CASCADE
- Casi todo lo demás bajo Store: CASCADE

Conclusión: `DELETE FROM "User" WHERE id IN (A,B,C,D,E)` elimina por cascada toda la sub-gráfica de tenants. El orden explícito del §4 es la red de seguridad si algún CASCADE no estuviera presente.

## 6. Validación post-cleanup (FASE 5)

1. Re-ejecutar el sweep por `storeId`/`negocioId`/`userId` de los 5 tenants → todos 0
2. Verificar `AuditLog` QA → 0
3. Recontar totales globales (User 18 → 13, Negocio 17 → 12, Store 17 → 12) y comparar contra el backup
4. Smoke en prod: login de un tenant real, dashboard, listado de productos

## 7. Estado

- [x] FASE 3: verificar FKs/cascade (ver §4-5)
- [x] FASE 4: ejecutar DELETE por IDs — **alcance A/B confirmado por el usuario** (2026-08-14)
- [x] FASE 5: validación post-cleanup ✅

### Resultado del cleanup (tenants A y B)

| Tabla | DELETE |
|---|---|
| OrderItem | 2 |
| OrderPayment | 2 |
| Installment | 3 |
| StockMovement | 2 |
| Order | 2 |
| Product | 2 |
| ConversationMessage | 14 |
| Conversation | 3 |
| BusinessMemory | 4 |
| AuditLog | 24 |
| StoreMember | 2 |
| Store | 2 |
| Negocio | 2 |
| User | 2 |

### Validación post-cleanup (conteos globales)

| Tabla | Antes | Después |
|---|---|---|
| User | 18 | 16 |
| Negocio | 17 | 15 |
| Store | 17 | 15 |
| Product | 299 | 297 |
| Order | 19 | 17 |
| OrderItem | 37 | 35 |
| OrderPayment | 19 | 17 |
| Installment | 10 | 7 |
| Customer | 3 | 3 (intacto) |
| Account | 11 | 11 (intacto) |

✅ Sweep post-cleanup por `storeId`/`negocioId`/`userId` de A/B → **0 filas restantes**
✅ Sin huérfanos: los tenants C/D/E (`prueba*`) quedaron intactos por decisión del usuario

## 8. Riesgos

- Los tenants C/D/E (`prueba*`) son anteriores (julio) y podrían ser datos de demostración para clientes → **confirmar alcance antes de borrar**
- Cloudinary/uploads: archivos subidos por los tenants QA podrían quedar huérfanos en el bucket (no se borran archivos en este plan; solo filas)
- El `DELETE` es definitivo; el backup del 14/08 es la única red de seguridad
