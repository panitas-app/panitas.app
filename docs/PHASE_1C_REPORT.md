# FASE 1C — Reporte

> Fecha: 02/08/2026 · Rama: `develop-v2` · Base: FASE 1B (services/repositories/events/estructura agente)
> Objetivo: preparar tools, contexto, memoria, eventos y auditoría para el futuro agente IA. **Sin IA, sin proveedores, sin chatbot.**

---

## 1. Resumen

Se construyó la infraestructura interna que usará el agente IA de Panitas 2.0: sistema de tools con contrato formal, registro central, permisos granulares por rol, contexto empresarial/usuario/conversación, memoria (corto/largo plazo), catálogo de eventos y auditoría de acciones del agente. No se tocó `main`, no se modificaron rutas de FASE 1B y no se conectó ningún proveedor de IA.

## 2. Arquitectura creada

```
src/lib/agent/
├── types.ts                      ← contrato AgentTool { permissions[], input_schema, execute }
├── registry.ts                   ← registro + validación de permisos + auditoría en executeTool
├── router.ts                     ← intención (español) → tool, sin IA
├── setup.ts                      ← registra availableTools al importar @/lib/agent
├── index.ts                      ← barrel público
├── permissions/
│   ├── permissions.ts            ← 22 permisos granulares + hasPermission/isAgentPermission
│   └── agent.roles.ts            ← admin / manager / assistant / seller
├── context/
│   ├── business.context.ts       ← empresa (nombre, país, moneda, timezone, config)
│   ├── user.context.ts           ← usuario (rol, permisos, preferencias)
│   ├── conversation.context.ts   ← mensajes, intención, acciones
│   └── session.context.ts        ← buildAgentContext() (NextAuth + StoreMember + Negocio)
├── memory/
│   ├── short-term-memory.ts      ← memoria TTL (agentMemory)
│   └── long-term-memory.ts       ← interfaces (sin base vectorial)
├── audit/
│   └── audit.service.ts          ← AgentAuditService + InMemoryAgentAuditStore + persistencia opcional
└── tools/
    ├── inventory.tools.ts        ← check_stock, adjust_stock, movements
    ├── product.tools.ts          ← list, get, create, update, delete
    ├── sales.tools.ts            ← summary, create_order
    ├── order.tools.ts            ← list, get, create
    ├── customer.tools.ts         ← list, create
    ├── agenda.tools.ts           ← list, create, cancel
    ├── report.tools.ts           ← sales, today
    └── index.ts                  ← availableTools (registro central)
```

## 3. Tools disponibles (20)

| Tool | Permiso | Tool | Permiso |
|---|---|---|---|
| `inventory.check_stock` | inventory.read | `order.get` | order.read |
| `inventory.adjust_stock` | inventory.update | `order.create` | order.create |
| `inventory.movements` | inventory.read | `customers.list` | customer.read |
| `product.list` | product.read | `customers.create` | customer.create |
| `product.get` | product.read | `agenda.list` | agenda.read |
| `product.create` | product.create | `agenda.create` | agenda.create |
| `product.update` | product.update | `agenda.cancel` | agenda.cancel |
| `product.delete` | product.delete | `report.sales` | report.read |
| `sales.summary` | sales.read | `report.today` | report.read |
| `sales.create_order` | sales.create | — | — |

**Todas pasan por Services** (ninguna importa Prisma/repositorios — verificado por test).

## 4. Permisos creados (22)

`inventory.{read,create,update,delete}`, `product.{read,create,update,delete}`, `sales.{read,create,refund}`, `order.{read,create,update,cancel}`, `customer.{read,create}`, `agenda.{read,create,cancel}`, `report.read`, `subscription.read`.

Roles: `admin` (todos), `manager` (todo salvo `inventory.delete`, `product.delete`, `sales.refund`, `order.cancel`), `assistant` (lectura + `customer.create`, `agenda.create`), `seller` (lectura + ventas). Rol desconocido → solo lectura.

## 5. Contexto preparado

- `AgentContext` extendido: `user` (rol, permisos, preferencias), `business` (nombre, país, moneda, timezone, industria, config), `conversation` (mensajes, intención, acciones).
- `buildAgentContext()` carga sesión → `StoreMember` → `Store` + `Negocio` → contexto completo.

## 6. Memoria

- Corto plazo: `ShortTermMemory` (TTL 1h) + singleton `agentMemory`.
- Largo plazo: interfaces `LongTermMemory`/`LongTermMemoryStore` (sin vector DB, pendiente FASE 2).

## 7. Eventos disponibles (catálogo: `docs/EVENT_CATALOG.md`)

`sale.created`, `order.created`, `product.created`, `product.updated`, `inventory.low_stock`, `customer.created`, `appointment.created`.
Cambios: renombrado `product.low_stock` → `inventory.low_stock`; añadidos `product.created`, `product.updated`, `order.created` (emitidos por los services).

## 8. Auditoría implementada

- `AgentAuditService`: registra usuario, tool, acción, input, resultado, error, fecha.
- Integrada en `executeTool` (éxitos, rechazos por permisos y errores).
- Persistencia opcional a `AuditLog` (`enablePersistence()`) para cuando el agente escriba datos reales.

## 9. Services añadidos

- `src/services/sales.service.ts` (`SalesService.summary/recent`) — Tool → Service → Repository.
- `OrderService.getById` y `AgendaService.cancel` añadidos para soportar los tools nuevos.

## 10. Tests (65, 11 archivos)

| Archivo | Tests | Cubre |
|---|---|---|
| `agent-tools.test.ts` | 8 | catálogo, registro, permisos, rechazos, auditoría, capas |
| `agent-permissions.test.ts` | 7 | roles y `hasPermission` |
| `agent-context.test.ts` | 4 | business/user/conversation context |
| `agent-audit.test.ts` | 5 | registro, errores, clear, store custom |
| `agent-events.test.ts` | 4 | suscripción, payload, unsubscribe, emitAsync |
| `agent-router.test.ts` | 5 | enrutamiento español → tool |
| `agent-memory.test.ts` | 5 | memoria TTL |
| services (product/inventory/order/errors) | 27 | capa de servicios FASE 1B |

Verificación: `npm run typecheck` ✅ · `npm test` ✅ 65/65 · `npm run lint` ✅ (0 errores en módulos del agente/servicios nuevos).

## 11. Archivos modificados/creados

**Creados (src)**: `lib/agent/permissions/{permissions,agent.roles,index}.ts`, `lib/agent/context/{business,user,conversation,session,index}.context|.ts`, `lib/agent/memory/{short-term-memory,long-term-memory,index}.ts`, `lib/agent/audit/{audit.service,index}.ts`, `lib/agent/tools/{product,order,report}.tools.ts`, `lib/agent/tools/index.ts`, `services/sales.service.ts`.
**Modificados (src)**: `lib/agent/{types,registry,router,setup,index}.ts`, `lib/agent/tools/{inventory,sales,customer,agenda}.tools.ts`, `services/{order,agenda,product,index}.service|.ts`, `events/event.service.ts`.
**Eliminados (src)**: `lib/agent/{permissions,context,memory}.ts` (movidos a subcarpetas).
**Tests**: actualizados 3, nuevos 5 (`agent-tools`, `agent-context`, `agent-audit`, `agent-events`).
**Docs**: `EVENT_CATALOG.md` (nuevo), `AGENT_DESIGN.md` (nuevo), `AI_READY_ARCHITECTURE.md` (actualizado), `PHASE_1C_REPORT.md` (este).

## 12. Riesgos encontrados

- **next-auth en tests**: `buildAgentContext` importa `@/lib/auth` (next-auth) que rompe vitest (resolve `next/server`) → se aisló en `context/session.context.ts`; las funciones puras de contexto son testables sin sesión.
- **Cambio de contrato `permission` → `permissions[]` / `run` → `execute`**: rompe cualquier consumidor futuro que use la API vieja; mitigado con barrel único (`@/lib/agent`) y sin usos externos fuera del módulo.
- **Renombrado de permisos** (`inventory.write` → `inventory.update`, `customers.read` → `customer.read`): require actualizar consultas/tests de agente (ya hechos).
- **Auditoría en memoria**: se pierde al reiniciar el proceso; la persistencia a `AuditLog` se habilita en FASE 2 (decisión consciente).
- **Deuda pendiente (no resuelta)**: ~155 handlers con Prisma directo; `sales.create_order` y `order.create` duplican la creación de órdenes (misma capa Service, distinto tool); eventos `sale.created` + `order.created` se emiten juntos (documentado).

## 13. Recomendaciones para FASE 2

1. Implementar `orchestrator.ts` sobre `listTools()`/`executeTool()` con `input_schema` como prompt.
2. Flujo de confirmación de escrituras (dos pasos) antes de ejecutar tools de escritura.
3. Habilitar `agentAudit.enablePersistence()` y/o modelo `AgentLog`.
4. Conectar `LongTermMemory` a un store real (vectorial o relacional).
5. Rate limit / presupuesto de llamadas IA por plan.
6. Migrar el resto de handlers a servicios para ampliar el catálogo de tools.
7. Suscripciones proactivas a eventos (`inventory.low_stock` → recomendar compra).
