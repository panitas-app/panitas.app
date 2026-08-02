# Arquitectura lista para IA (AI-Ready)

> Documento guía: cómo el agente IA de Panitas 2.0 consumirá la capa de servicios. Sin IA implementada aún — solo infraestructura (FASE 1B + FASE 1C).

---

## 1. Contratos del agente

### 1.1 `AgentContext` (`src/lib/agent/types.ts`)

```ts
type AgentContext = {
  userId: string
  storeId: string
  negocioId: string | null
  plan: string
  role: string
  permissions: AgentPermission[]
  user?: UserContext            // nombre, email, preferencias
  business?: BusinessContext    // nombre, país, moneda, timezone, industria, config
  conversation?: ConversationContext  // mensajes, intención, acciones
}
```

Se construye con `buildAgentContext()` desde la sesión (`src/lib/agent/context/session.context.ts`). Cada tool recibe este contexto; **ninguna tool llama `getCurrentStore()` por su cuenta**.

### 1.2 `AgentTool` (`src/lib/agent/types.ts`)

```ts
type AgentTool = {
  name: string
  description: string
  permissions: AgentPermission[]   // una o más (basta con una)
  input_schema?: AgentToolInputSchema  // JSON Schema simplificado (prompt para el LLM)
  execute: (ctx: AgentContext, input: AgentToolInput) => Promise<AgentToolResult>
}

type AgentToolResult = { ok: boolean; data?: unknown; error?: string }
```

- `executeTool(ctx, name, input)` (`registry.ts`) valida existencia del tool, permisos **y audita** antes/durante la ejecución.
- Cualquier error del servicio se convierte en `{ ok: false, error }`.
- **Ley de capas**: Tool → Service → Repository → DB. Las tools jamás importan `@/lib/prisma` ni `@/repositories` (verificado por test).

### 1.3 Permisos por rol (`src/lib/agent/permissions/`)

| Rol | Permisos |
|---|---|
| `admin` | todos (22 permisos granulares) |
| `manager` | todo excepto `inventory.delete`, `product.delete`, `sales.refund`, `order.cancel` |
| `assistant` | solo lectura + `customer.create`, `agenda.create` |
| `seller` | lectura + ventas (`sales.create`, `order.create`, `customer.create`) |
| desconocido | solo lectura (`READ_ONLY_PERMISSIONS`) |

Permisos granulares por módulo: `inventory.*`, `product.*`, `sales.*`, `order.*`, `customer.*`, `agenda.*`, `report.read`, `subscription.read`.

---

## 2. Reglas inmutables para el agente

1. **Nunca tocar la BD directo** → siempre `executeTool()` → servicio → repositorio.
2. **Los servicios son la única fuente de validación de negocio** (precios desde BD, stock, cupones, límites por plan). El agente no puede "saltarse" reglas.
3. **Escrituras controladas**: las tools de escritura deben exigir confirmación explícita del usuario en la capa de orquestación (futura).
4. **Todo queda auditado**: los servicios ya escriben `AuditLog`; además `executeTool` registra cada invocación en `agentAudit` (usuario, tool, input, resultado, error).
5. **Eventos como señales**: el agente puede suscribirse a `EventService` para reaccionar (alertas, reportes) sin acoplarse a las rutas. Catálogo en `docs/EVENT_CATALOG.md`.

---

## 3. Cómo se construye la orquestación (futuro)

```
Usuario
  ↓
Agente IA (orquestador LLM, FASE 2)
  ↓
routeAgentIntent(text) → tool name   (router sin IA, ya disponible)
  ↓
buildAgentContext() → ctx (usuario + negocio + permisos + conversación)
  ↓
executeTool(ctx, name, input)
  ├─ registra en agentAudit (audit/audit.service.ts)
  ├─ valida permisos (permissions/)
  └─ ejecuta tool → service → repository → DB
  ↓
resultado { ok, data | error } → respuesta al usuario
```

- `routeAgentIntent` (`router.ts`) mapea frases en español a tools (ej. "¿cuánto inventario tengo de abrazaderas AB12?" → `inventory.check_stock`).
- Para inputs complejos, la futura capa LLM generará tool calls contra `listTools()`/`executeTool()`, reutilizando permisos, validación y auditoría.

---

## 4. Catálogo de tools (FASE 1C)

| Tool | Permiso | Descripción |
|---|---|---|
| `inventory.check_stock` | `inventory.read` | Stock por nombre/SKU/palabra clave |
| `inventory.adjust_stock` | `inventory.update` | increase / decrease / adjustment |
| `inventory.movements` | `inventory.read` | Historial de movimientos |
| `product.list` | `product.read` | Catálogo con búsqueda |
| `product.get` | `product.read` | Detalle de producto |
| `product.create` | `product.create` | Crear producto |
| `product.update` | `product.update` | Actualizar producto |
| `product.delete` | `product.delete` | Eliminar producto |
| `sales.summary` | `sales.read` | Resumen de ventas (período) |
| `sales.create_order` | `sales.create` | Venta POS completa |
| `order.list` | `order.read` | Órdenes por estado |
| `order.get` | `order.read` | Detalle de orden |
| `order.create` | `order.create` | Crear orden/pedido |
| `customers.list` | `customer.read` | Listado con búsqueda |
| `customers.create` | `customer.create` | Registrar/find-or-create cliente |
| `agenda.list` | `agenda.read` | Citas con filtros |
| `agenda.create` | `agenda.create` | Nueva cita |
| `agenda.cancel` | `agenda.cancel` | Cancelar cita |
| `report.sales` | `report.read` | Reporte de ventas por rango |
| `report.today` | `report.read` | Resumen de ventas de hoy |

Registro central: `src/lib/agent/tools/index.ts` (`availableTools`). `setupAgentTools()` los registra en el registry al importar `@/lib/agent`.

---

## 5. Contexto, memoria y auditoría (FASE 1C)

- **Contexto** (`src/lib/agent/context/`): `business.context.ts`, `user.context.ts`, `conversation.context.ts`, `session.context.ts`.
- **Memoria** (`src/lib/agent/memory/`): `short-term-memory.ts` (TTL en memoria, `agentMemory`) y `long-term-memory.ts` (solo interfaces, sin base vectorial aún).
- **Auditoría** (`src/lib/agent/audit/`): `AgentAuditService` (in-memory + persistencia opcional a `AuditLog` vía `createAuditEntry`), integrado en `executeTool`.

---

## 6. Próximos pasos sugeridos (FASE 2)

1. **Orquestador LLM** (`src/lib/agent/orchestrator.ts`) que use `listTools()`/`executeTool()` y traduzca intención → tool calls (con `description` + `input_schema` como prompt).
2. **Confirmación de escrituras**: flujo de dos pasos para tools de escritura.
3. **Habilitar persistencia** de `agentAudit` (`enablePersistence()`) o modelo dedicado `AgentLog`.
4. **Rate limit / presupuesto por plan** para llamadas LLM.
5. **Migración del resto de handlers** (155) hacia servicios para darle al agente el catálogo completo.
6. **Conectar `LongTermMemory`** a un store real (vectorial o relacional) cuando se defina.
