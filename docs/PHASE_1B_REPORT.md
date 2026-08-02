# FASE 1B — Reporte

> Fecha: 02/08/2026 · Rama: `develop-v2` · Base: commit de purga `b10c45e`
> Objetivo: capa Service/Repository sobre Prisma + preparación de arquitectura para agente IA (sin IA).

---

## 1. Resumen

Se transformó la arquitectura de los route handlers "gordos" hacia una capa de servicios y repositorios, se creó un bus de eventos tipado y un esqueleto de agente (tools, permisos, routing, memoria) reutilizable por una futura IA. **No se introdujo IA**, no se cambiaron funcionalidades visibles, y no se tocaron los ~155 handlers restantes.

## 2. Lo que se construyó

### Capa de repositorios (`src/repositories/`) — solo Prisma
- `product.repository.ts`, `customer.repository.ts`, `inventory.repository.ts`, `agenda.repository.ts`, `order.repository.ts`, `sales.repository.ts`, `payment.repository.ts`
- Sin lógica de negocio; aceptan `PrismaClient` inyectable (testeable).

### Capa de servicios (`src/services/`)
- `errors.ts` (ServiceError), `context.ts`, `http.ts` (mapeo de respuestas)
- `product.service.ts` (list/getById/create/update/remove + `generateSku` unificado)
- `inventory.service.ts` (list/applyMovement)
- `customer.service.ts` (list/findOrCreateByPhone/updateTotals)
- `agenda.service.ts` (list/create con reserva autenticada y pública)
- `order.service.ts` (list/create completo: precios desde BD, cupón, cuotas, stock, comisiones, emails)
- Barrel `src/services/index.ts`

### Eventos (`src/events/`)
- `event.service.ts`: bus tipado (`on`/`emit`/`emitAsync`); eventos `sale.created`, `product.low_stock`, `appointment.created`, `customer.created`.
- Emisores: `order.service`, `customer.service`, `agenda.service`.

### Esqueleto del agente (`src/lib/agent/`) — infraestructura, sin IA
- `types.ts`, `permissions.ts` (permisos granulares por rol), `context.ts` (construye contexto desde sesión), `memory.ts` (memoria con TTL), `registry.ts` (registro + ejecución con chequeo de permisos), `router.ts` (intención → tool), `setup.ts`, `index.ts`.
- Tools de ejemplo: `inventory.tools.ts` (get_stock, adjust_stock), `sales.tools.ts` (summary, create_order), `customer.tools.ts` (list), `agenda.tools.ts` (create, list).

### Rutas migradas (6, quirúrgicas)
| Ruta | Antes | Ahora |
|---|---|---|
| `GET/POST /api/products` | 207 líneas, lógica inline | thin handler → `ProductService` |
| `GET/PUT/DELETE /api/products/[id]` | 215 líneas | thin handler → `ProductService` |
| `GET/POST /api/products/stock` | 95 líneas | thin handler → `InventoryService` |
| `GET /api/customers` | 43 líneas | thin handler → `CustomerService` |
| `GET/POST /api/appointments` | 172 líneas | thin handler → `AgendaService` |
| `GET/POST /api/orders` | 470 líneas | thin handler → `OrderService` |

Comportamiento preservado: códigos de estado, mensajes de error, validaciones, auditoría (`AuditLog`), emails, rate limits, CSRF, orden de operaciones (secuencial por Neon HTTP).

### Testing
- `vitest` agregado como devDependency + `vitest.config.ts` (alias `@`, env mínimo).
- **40 tests** en `tests/services/`: errores, permisos, memoria, router de intención, `ProductService` (10), `InventoryService` (6), `OrderService` (6) con repositorios mockeados.
- `npm test` → ✅ 40/40.

## 3. Documentación
- `docs/ARCHITECTURE_AUDIT_PHASE_1B.md` (nuevo): auditoría (161 handlers, ~607 llamadas prisma directas, tenant dual, Neon sin transacciones, duplicación detectada, plan de migración).
- `docs/AI_READY_ARCHITECTURE.md` (nuevo): contratos del agente, reglas inmutables, catálogo de tools, próximos pasos.
- `docs/ARCHITECTURE.md` (actualizado): nuevas capas `services/`, `repositories/`, `events/`, `lib/agent/` + sección 2.0 FASE 1B.

## 4. Verificación
- `npm run typecheck` → ✅ sin errores.
- `npm run test` → ✅ 40/40.
- `npm run lint` y `npm run build` → ver verificación final.

## 5. Deuda detectada (no resuelta en esta fase)
- ~155 route handlers con Prisma directo pendientes de migrar (fases siguientes).
- Duplicación de creación de órdenes (×3: orders/checkout/seller) y validación de cupón (×3) — la migración de `checkout`/`seller` consolidará en `OrderService`.
- Sin runner de e2e (Playwright CLI instalado, `@playwright/test` no). `tests/smoke.spec.ts` no es ejecutable aún.

## 6. Próximos pasos sugeridos (FASE 1C / FASE 2)
1. Migrar `checkout`, `seller` y el resto de handlers de pedidos a `OrderService`.
2. Migrar el resto de dominios (CRM, finanzas, vendedores) a repositorios/servicios.
3. Orquestador LLM sobre `executeTool` + confirmación de escrituras + `AgentLog` persistido.
4. Rate limit / presupuesto de IA por plan.
