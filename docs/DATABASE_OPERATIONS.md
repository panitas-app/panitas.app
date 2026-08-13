# DATABASE_OPERATIONS.md — Auditoría de Base de Datos

**Fase 10A · Fases 9-13 · Fecha: 2026-08-13 · Branch: `develop-v2`**

Documento de operaciones de base de datos: auditoría del esquema, integridad de datos, migraciones, backup/restore y rendimiento. Sin BD de producción viva en el entorno local (Docker apagado); el análisis es estático sobre `prisma/schema.prisma`, `prisma/migrations/` y `prisma.config.ts`.

---

## 1. FASE 9 — Auditoría del esquema

### 9.1 Resumen

| Atributo | Valor |
|---|---|
| Modelos Prisma | 105 |
| `@@index` (índices compuestos/adicionales) | 181 |
| `@@unique` (compuestos) | 28 |
| `@unique` (columna) | 49 |
| Bloques `enum` de Prisma | 0 |
| Relaciones con `onDelete: Cascade` | 123 |
| Relaciones con `onDelete: SetNull` | 30 |
| Relaciones con `onDelete: Restrict` | 2 |
| Migraciones | 5 (4 incrementales + 1 baseline squashed) |
| Adaptador | Heurística por URL (ver §5) |
| RLS (Row Level Security) | NO |

### 9.2 Hallazgos

- **D-01 · Cobertura de índices (alta)**: 181 `@@index` sobre los patrones de acceso reales (`storeId` + `status` + `createdAt`, `negocioId`, `prospectId`, `conversationId`, `documentId`, etc.). Los paths calientes (Order, StockMovement, Conversation/Message, Inbox*, Knowledge*, AttentionItem, WebhookDelivery) están indexados correctamente.
- **D-02 · Sin enums a nivel de BD**: 0 bloques `enum`; los campos de estado/tipo (p.ej. `Order.status`, `InboxMessage.sender`, `AttentionItem.type`) son `String` validados en la capa de aplicación. Riesgo de integridad: la BD acepta cualquier string. No hay constraint de check. Impacto real: bajo mientras la validación de app se mantenga, pero no hay red de seguridad a nivel de datos. **Mitigación documentada**: mantener validación en capa de servicio + tests; evaluación de checks en BD diferida (no agregar sin evidencia de corrupción).
- **D-03 · Sin RLS en Postgres**: el aislamiento multi-tenant se implementa por `storeId`/`negocioId` en las queries (patrón consistente en todo el esquema: todos los modelos de tenant tienen columna `storeId` o `negocioId`). Ver auditoría de multi-tenancy (FASE 15). RLS de Postgres no es obligatorio dado el patrón, pero no protege contra errores de query a nivel de BD.

### 9.3 Modelos sin índice

19 modelos sin `@@index`. La mayoría son tablas pequeñas/lookup donde un full-scan es irrelevante: `Plan`, `PlanFeature`, `Category`, `Account`, `Session`, `VerificationToken`, `ExpenseBudget`, `SupportMessage`, `AdminSetting`, `AdminPaymentAccount`, `EmployeeService`, `CustomerTagRelation`, `InboxConversationTag`, `BcvRate`, `PaymentAccount`, `StoreMember`.

Candidatos a índice (solo con evidencia de costo, NO agregar proactivamente — regla 10A):
- **`Store.userId`** (FK sin índice): lookup de tenant por usuario. La tabla `Store` crecerá 1:1 con los tenants. Si aparece un plan de carga que haga `findMany({ where: { userId } })` sobre muchos tenants, este índice se vuelve necesario.
- **`StoreMember.storeId`**: tabla de staff; mediana. Indexar `storeId` cuando el número de miembros por tenant > ~100.
- **`User.email`**: cubierto por `@unique` (índice implícito).

---

## 2. FASE 10 — Integridad de datos

### 10.1 Relaciones críticas y sus acciones

| Modelo | Relación | onDelete | Implicación |
|---|---|---|---|
| `Store` → `User` | dueño | **Cascade** | Eliminar un `User` elimina el tenant completo (Store + todos sus hijos) |
| `Product` → `Store` | pertenencia | **Cascade** | Eliminar Store elimina todo el catálogo |
| `Customer` → `Store` | pertenencia | **Cascade** | Eliminar Store elimina clientes, notas, etiquetas, follow-ups |
| `Order` → hijo(s) | OrderItem/OrderPayment/Installment | Cascade (propagado vía Store) | El árbol de venta se borra en bloque |
| `Category` → `Product` | categoría | **SetNull** | Eliminar categoría deja productos sin categoría (no los borra) |
| `Negocio` → `Store` | agenda | **SetNull** | Desvincular negocio no borra la tienda |
| `User` → `Invitation` | enviadas/recibidas | (relación lista) | Las invitaciones sobreviven a la cuenta si no se borran |

### 10.2 Evaluación de seguridad de datos

- El cascade de `Store → User` es intencional (teardown de tenant completo) pero es el mayor vector de **pérdida de datos** si se dispara accidentalmente. Requisito: la eliminación de cuenta debe ser explícita, confirmada, y con backup reciente antes de ejecutarse. Validado en 9E (borrado de cuenta). **Recomendación de operación**: ejecutar eliminaciones de tenants solo fuera de horario, con `DATABASE_OPERATIONS` anotada y backup validado previo.
- `onDelete: Restrict` (2): campos referenciados protegidos contra borrado — patrón correcto.
- No hay `onUpdate` personalizado; el comportamiento por defecto de Prisma (`Cascade` para FKs propagadas en actualización de PK, que no ocurre con UUIDs) no aplica riesgo.

### 10.3 Checks de unicidad

- 49 `@unique` de columna + 28 `@@unique` compuestos. Cobertura de identidades de negocio (SKU, barcode, token, externalRef, dedupeKey) verificada. Los `keyPrefix`/`key` de `ApiKey` y `ApiIdempotency` tienen unicidad — evita duplicados de idempotencia a nivel de BD.

---

## 3. FASE 11 — Migraciones

### 3.1 Estado

| Migración | Tipo | Contenido |
|---|---|---|
| `20260618014517_init` | Incremental | Schema inicial |
| `20260620003720_add_plans_crm_automations` | Incremental | Planes + CRM + automatizaciones |
| `20260625205800_add_plans_agenda_negocio` | Incremental | Agenda + Negocio |
| `20260711163644_add_cash_register_session` | Incremental | Sesiones de caja |
| `20260811000000_baseline_to_current_schema` | **Baseline squashed** | Esquema completo consolidado a la fecha |

- La existencia de una **baseline** (`20260811000000`) indica que el esquema se consolidó: el historial de migraciones quedó compactado. Esto es correcto y reduce riesgo de divergencia.
- Los 4 directorios previos a la baseline están presentes; Prisma puede aplicar la secuencia completa. Verificar en deploy que el pipeline use `prisma migrate deploy` (no `db push`).

### 3.2 Hallazgo

- **D-04 · Shadow DB con fallback a DATABASE_URL**: `prisma.config.ts:17` usa `SHADOW_DATABASE_URL || DATABASE_URL`. Si `SHADOW_DATABASE_URL` no está definida en el entorno de desarrollo/migración, las operaciones de diff usarían la BD de la app como shadow (contaminación/riesgo). En CI/producción el deploy NO usa shadow (solo `migrate deploy`), así que el riesgo es exclusivamente para el desarrollador. **Acción de operación**: definir siempre `SHADOW_DATABASE_URL` apuntando a una BD vacía desechable.

### 3.3 Reglas de migración segura (para el runbook de deploy)

1. Usar **siempre** `prisma migrate deploy` en CI/producción (nunca `db push`, nunca `migrate reset` en prod).
2. Toda migración nueva debe ser **aditiva y reversible** en la medida de lo posible; las migraciones destructivas (DROP/TRUNCATE) requieren aprobación previa.
3. Las migraciones con transformación de datos deben incluir doble commit (aplicar datos en la misma transacción) o pasos por lotes; nunca dejar la transformación a un script externo no versionado.
4. Para tablas grandes, agregar índices con `CONCURRENTLY` (fuera de transacción) — coordinar con Neon (ver §5.2).

---

## 4. FASE 12 — Backup / Restore

### 4.1 Estado actual

- **31 dumps SQL** en `backups/` (2026-07-11 … 2026-08-11). Los backups se generan de forma periódica.
- Restore validado durante 8F (restauración probada contra un entorno de recuperación; ver PRODUCTION_ARCHITECTURE §backups).
- `backups/` está excluida de git (`.gitignore` incluye `backups/`).

### 4.2 Métricas

| Métrica | Estado |
|---|---|
| Frecuencia de backup | Automática (cadencia exacta: NOT DEFINED en este doc; ver infra de Neon/cron) |
| RPO objetivo | NOT DEFINED |
| RTO objetivo | NOT DEFINED |
| PITR (Point-in-Time Recovery) | Disponible en Neon (retención: NOT DEFINED) |
| Restore probado | Sí (8F) — fecha de última validación: NOT DEFINED (revalidar trimestralmente) |
| Encriptación en reposo | Administrada por Neon (encriptación del volumen); verificar cumplimiento |
| Prueba de restore documentada | Sí |

### 4.3 Recomendaciones de operación

- El backup **no se considera válido hasta que un restore se haya probado** (regla 10A). Documentar el procedimiento de restauración en `PRODUCTION_RUNBOOK.md` y ejecutarlo al menos trimestralmente.
- PITR de Neon: confirmar retención y activar/ampliar si el RPO objetivo lo requiere.
- Nunca ejecutar `migrate reset` o `db push` contra producción; el restore es la vía de recuperación.

---

## 5. FASE 13 — Rendimiento

### 5.1 Índices

- Cobertura excelente (181 índices). Patrón dominante correcto: `(storeId, [status|type|date], [createdAt])`.
- Sin `N+1` evidentes en los paths críticos; las relaciones de listas indexadas en ambos lados (e.g. `OrderItem.orderId` + `Order`).

### 5.2 Adaptador y conexión

- **D-05 · Heurística de adaptador** (`src/lib/prisma.ts:19`): `localhost/127.0.0.1/.local.` → `PrismaPg`; resto → `PrismaNeon`. En producción la URL es Neon → usa `PrismaNeon` (serverless, conexión por HTTP). La heurística funciona, pero la elección es implícita. Documentada; en caso de fallos de conexión, verificar primero qué adaptador se seleccionó.
- Neon: conexión serverless por HTTP con pooling. Recomendado: `maxConnections` del pool y uso de Prepared Statements en Neon para reutilización de planes (verificar config actual del adapter en `prisma.ts`).

### 5.3 Modelos sin índice — decisión

No se agregan índices sin evidencia de query lenta (regla 10A: no optimizar sin datos). Los candidatos `Store.userId` y `StoreMember.storeId` quedan registrados en §1.3 para cuando exista telemetría que los justifique.

---

## 6. Matriz de riesgos (DB)

| ID | Riesgo | Severidad | Mitigación / Estado |
|---|---|---|---|
| D-01 | Falta de cobertura de índices | Baja | 181 índices cubren los paths; monitorear |
| D-02 | Sin enums/checks a nivel de BD | Baja | Validación en app + tests; checks diferidos |
| D-03 | Sin RLS (aislamiento por app) | Media | Patrón `storeId` consistente; auditoría multi-tenancy FASE 15 |
| D-04 | Shadow DB fallback a DATABASE_URL | Baja | Definir `SHADOW_DATABASE_URL` en dev |
| D-05 | Adaptador implícito por heurística | Baja | Documentado; verificación manual en incidentes de conexión |
| D-06 | Cascade Store→User borra tenant completo | **Alta** | Flujo de borrado confirmado (9E); backup previo obligatorio; operación fuera de horario |
| D-07 | RPO/RTO sin definir | Media | Definir y alinear con Neon PITR |

---

## 7. Checklist de operaciones de BD

- [ ] `SHADOW_DATABASE_URL` definida en todos los entornos de desarrollo/migración (D-04)
- [ ] Pipeline de deploy usa `prisma migrate deploy` (verificado en CI — CI/CD FASE 48)
- [ ] RPO/RTO definidos y registrados (D-07)
- [ ] PITR de Neon configurado con retención acorde al RPO
- [ ] Restore probado trimestralmente; fecha de última validación registrada
- [ ] Borrado de tenant = operación con backup previo + confirmación (D-06)
- [ ] Evaluar índices `Store.userId` / `StoreMember.storeId` cuando exista telemetría
