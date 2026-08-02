# AGENT_TOOL_ARCHITECTURE — Arquitectura del Tool System

> FASE 3B · Panitas Agent Tool System. Documento de arquitectura.
> Rama: `develop-v2`.

---

## 1. Propósito

El agente de Panitas NO puede tocar la base de datos ni las APIs internas directamente. Todas sus acciones de negocio pasan por el **Tool System**: una capa de herramientas reales que encapsula operaciones de inventario, productos, ventas, clientes, pedidos, reportes y analítica.

Este documento describe el contrato, los componentes y las reglas del sistema.

## 2. Flujo de ejecución

```
Agente / Router
   │
   ▼
ToolExecutor.execute(ctx, "inventory.getStock", { id: "sku-1" })
   │  1. Resuelve la tool en el ToolRegistry
   │  2. Verifica aislamiento: ctx.storeId presente (nunca del input)
   │  3. Verifica permisos (FASE 1C: hasPermission)
   │  4. Valida input contra el inputSchema
   │  5. Ejecuta la tool
   ▼
Tool (dominio) ──► Service (FASE 1B) ──► Repository ──► Database
   │                                                          ▲
   └──► devuelve SIEMPRE ToolResponse { success, data, error, metadata }
```

**Regla de capas**: las tools importan SOLO `@/services/*` y `@/lib/analytics`. **Prohibido** importar `@/lib/prisma` o `@/repositories` desde las tools (verificado por tests).

## 3. Contratos (`src/lib/agent/tools/types.ts`)

```ts
interface AgentTool {
  name: string                 // "dominio.accion" (p.ej. inventory.getStock)
  domain: ToolDomain           // inventory | products | sales | customers | orders | reports | analytics | business
  description: string
  requiredPermissions: AgentPermission[]   // basta con UNO (criterio FASE 1C)
  inputSchema: { type: "object", properties: Record<string, ToolParameter> }
  execute(ctx: ToolExecutionContext, input: Record<string, unknown>): Promise<ToolResponse>
}

interface ToolExecutionContext {
  userId: string
  storeId: string              // SOLO del usuario autenticado
  negocioId?: string | null
  plan?: string
  role?: string
  permissions: AgentPermission[]
  metadata?: Record<string, unknown>
}

interface ToolResponse {
  success: boolean
  data: unknown
  error: string | null
  metadata: Record<string, unknown>   // tool + durationMs enriquecidos por el executor
}
```

## 4. Componentes

| Archivo | Responsabilidad |
|---|---|
| `types.ts` | Contratos `AgentTool`, `ToolExecutionContext`, `ToolResponse`, `ToolMetadata`. |
| `response.ts` | Helpers `toolOk` / `toolFail` / `isToolResponse` / `serializeToolResponse`. |
| `permissions.ts` | `toolAllowed` / `missingPermissions` sobre `hasPermission` de FASE 1C. |
| `registry.ts` | `ToolRegistry`: register / get / list / listByDomain / metadata / clear. |
| `executor.ts` | `ToolExecutor`: punto ÚNICO de ejecución (resolución, aislamiento, permisos, validación, logging, captura de errores). |
| `logging.ts` | `AuditToolLogger` (usa `agentAudit` 1C) y `NoopToolLogger`. Eventos `tool.called` / `tool.success` / `tool.failed`. |
| `validate.ts` | `validateToolInput`: valida el input contra el schema (requeridos y tipos). |
| `context.ts` | `buildServiceContext(ctx)` → `StoreServiceContext` (FASE 1B). |
| `deps.ts` | `ToolDeps`: servicios inyectables para tests. |
| `bridge.ts` | `toLegacyAgentTool`: convierte una Tool 3B al contrato 1C para integración futura. |
| `setup.ts` | `buildToolRegistry(deps)` + singleton `toolRegistry`. |
| `domains/*` | Fábricas de tools por dominio (`create*Tools(deps)`). |

## 5. Seguridad y aislamiento de negocio

1. **`storeId` nunca se lee del input**: el executor exige `ctx.storeId` y las tools reciben el contexto por separado del input. Las tools tampoco aceptan `storeId`/`negocioId` como parámetros (test automático).
2. **Permisos**: cada tool declara `requiredPermissions`; el executor usa `hasPermission` (FASE 1C) con la regla "al menos uno". Usuario sin permiso → `toolFail` con los permisos faltantes.
3. **Validación**: input validado contra `inputSchema` antes de ejecutar.
4. **Nunca lanza**: `ToolExecutor.execute` captura cualquier excepción y devuelve `toolFail`. Las tools devuelven SIEMPRE `ToolResponse`.
5. **Ley de capas**: tools → services/analytics → repositories → Prisma. El aislamiento por negocio lo aplican los services (`storeId` en el `where` + 403).
6. **Logging**: cada ejecución queda en la auditoría del agente (en memoria; persistencia opcional best-effort vía `AgentAuditService.enablePersistence`).

## 6. Cambios de servicio incluidos

- **`OrderService.updateStatus(ctx, id, status)`** (nuevo, `src/services/order.service.ts`): valida estado, pertenencia al negocio (404/403), al cancelar restaura stock + movimientos `return` y deshace totales del cliente, audita `order.status_changed` y emite `sale.cancelled` / `order.cancelled`. Usa repositorio, nunca Prisma directo.
- `VALID_ORDER_STATUSES`: `pending | confirmed | preparing | shipped | delivered | cancelled`.

## 7. Compatibilidad con FASE 1C/3A

- El barrel `src/lib/agent/tools/index.ts` ahora expone tanto el Tool System 3B como `availableTools` (herramientas flat 1C) **sin cambios** en el registro legacy ni en `setup.ts` de 1C.
- `toLegacyAgentTool` permite migrar gradualmente las tools flat hacia el nuevo contrato sin tocar el Agent Core (3A).

## 8. Futuras fases

- Reemplazar las 20 tools flat 1C por las del Tool System 3B (bridge).
- Integrar `toolRegistry` con el Agent Core (3A) para ejecución multi-herramienta.
- Gates por plan (p.ej. `analytics.businessSummary` solo en planes con analytics).
- Exportaciones CSV/Excel y tools de configuración de negocio.
