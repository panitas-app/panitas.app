# AGENT_DESIGN — Diseño del agente IA de Panitas 2.0

> Fecha: 02/08/2026 · Rama: `develop-v2` · FASE 1C
> Este documento explica cómo funcionará el agente IA futuro y qué infraestructura ya existe (sin IA, sin modelos, sin APIs externas).

---

## 1. Visión

Panitas 2.0 tendrá un asistente empresarial con IA capaz de conversar con los usuarios y ejecutar acciones reales dentro del sistema respetando permisos, validaciones de negocio y trazabilidad.

Ejemplo:

```
Usuario:  "¿Cuánto inventario tengo de abrazaderas AB12?"
Agente:   consulta inventario y responde.

Usuario:  "Agrega 50 unidades de este producto."
Agente:   ejecuta la acción mediante herramientas autorizadas.
```

---

## 2. Flujo general

```
Usuario
  ↓
Agente IA (orquestador LLM — FASE 2, aún NO implementado)
  ↓
Router (intención → tool)      src/lib/agent/router.ts
  ↓
Contexto (usuario + negocio)   src/lib/agent/context/
  ↓
Registry + permisos            src/lib/agent/registry.ts + permissions/
  ├── auditoría                 src/lib/agent/audit/
  └── memoria                   src/lib/agent/memory/
  ↓
Tools                           src/lib/agent/tools/
  ↓
Services                        src/services/
  ↓
Repositories                    src/repositories/
  ↓
Database (Prisma / Neon)
```

**Regla de capas inamovible:** `Tool → Service → Repository → DB`.
Las tools NO importan Prisma ni repositorios (verificado por test).

---

## 3. Capas

### 3.1 Router (`src/lib/agent/router.ts`)
- Traduce una frase en español a un nombre de tool (`routeAgentIntent`).
- Funciona sin IA (basado en palabras clave normalizadas sin acentos).
- En FASE 2 el LLM complementará (o reemplazará) este router para entradas complejas.

### 3.2 Contexto (`src/lib/agent/context/`)
- `business.context.ts` — datos de la empresa: nombre, país, moneda, zona horaria, industria, configuración.
- `user.context.ts` — datos del usuario: nombre, email, rol, permisos, preferencias.
- `conversation.context.ts` — conversación: mensajes recientes, intención, acciones realizadas.
- `session.context.ts` — `buildAgentContext()`: carga la sesión (NextAuth), el `StoreMember` y el `Negocio`, y arma el `AgentContext` completo.

### 3.3 Permisos y roles (`src/lib/agent/permissions/`)
- `permissions.ts` — 22 permisos granulares (`inventory.read`, `product.update`, `sales.refund`, `subscription.read`, ...).
- `agent.roles.ts` — roles `admin`, `manager`, `assistant`, `seller` con mapeo rol → permisos.
- El registry valida `ctx.permissions` contra `tool.permissions` antes de ejecutar.

### 3.4 Registry (`src/lib/agent/registry.ts`)
- Registro central (`registerTool`/`getTool`/`listTools`/`executeTool`).
- `executeTool`:
  1. Resuelve la tool (error si no existe).
  2. Valida permisos (audita el rechazo).
  3. Ejecuta `tool.execute` (audita el resultado o el error).

### 3.5 Memoria (`src/lib/agent/memory/`)
- `short-term-memory.ts` — memoria de conversación actual con TTL (`agentMemory`).
- `long-term-memory.ts` — interfaces para preferencias/facts del negocio. **Sin base vectorial conectada** (pendiente FASE 2).

### 3.6 Auditoría (`src/lib/agent/audit/`)
- `AgentAuditService` registra: usuario, tool, acción, input, resultado, error, fecha.
- Persistencia opcional a `AuditLog` (`createAuditEntry`) — se habilita con `enablePersistence()` cuando el agente escriba datos reales.

### 3.7 Tools (`src/lib/agent/tools/`)
- 20 tools en 7 archivos (inventory, product, sales, order, customer, agenda, report).
- Cada tool: `name`, `description`, `permissions[]`, `input_schema`, `execute`.
- Registro central: `tools/index.ts` → `availableTools`.

---

## 4. Seguridad y garantías

| Garantía | Cómo se cumple |
|---|---|
| No acceso directo a BD | Tools solo llaman services (test de capas) |
| No saltar reglas de negocio | Services validan precios/stock/planes/cupones |
| Acciones autorizadas | Permisos por rol validados en `executeTool` |
| Trazabilidad | `agentAudit` + `AuditLog` de servicios |
| Sin confirmaciones silenciosas | Escrituras exigirán confirmación en orquestador (FASE 2) |
| Reversibilidad | Eventos permiten reaccionar (alertas low_stock, reportes) |

---

## 5. Lo que NO existe todavía (FASE 2)

- Orquestador LLM (`orchestrator.ts`).
- Integración con proveedor de IA (OpenAI/Gemini/Claude o similar).
- Confirmación de escrituras en dos pasos.
- Persistencia de memoria a largo plazo / base vectorial.
- Rate limit de llamadas IA por plan.
- Interfaz de chat en la UI.

---

## 6. Cómo extender el agente (FASE 2)

1. Crear `src/lib/agent/orchestrator.ts`:
   - Recibe `(ctx, userMessage)`.
   - Usa `listTools()` (con `description` + `input_schema`) como contexto del prompt.
   - Genera `{ tool, input }` y ejecuta `executeTool(ctx, tool, input)`.
   - Acumula resultados en `conversation.context.ts` y responde.
2. Habilitar `agentAudit.enablePersistence()`.
3. Conectar `LongTermMemory` a un store.
4. Suscribirse a eventos (`EventService.on`) para proactividad (ej. `inventory.low_stock` → recomendar compra a proveedor).
