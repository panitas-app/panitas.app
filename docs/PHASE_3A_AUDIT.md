# PHASE_3A_AUDIT — Auditoría de la arquitectura existente (base del Agent Core)

> FASE 3A · Panitas Agent Core. Documento previo a la construcción del núcleo del asistente.
> Rama: `develop-v2`. Nada de este documento modifica código; solo audita.

---

## 1. Estado del proyecto al iniciar FASE 3A

| Fase | Estado |
|---|---|
| 0 · Visión | ✅ |
| 0.5 · Versionado | ✅ (`develop-v2`, `main` congelada) |
| 1A · Seguridad | ✅ |
| 1B · Arquitectura | ✅ `src/services` + `src/repositories` + event bus |
| 1C · Preparación IA | ✅ infraestructura de agente (`src/lib/agent/`) |
| 1D · Blueprint | ✅ |
| 2A · UX/UI | ✅ |
| 2B · Planes | ✅ capa `src/lib/features` |
| 2C · Optimización módulos | ✅ eventos de negocio + consultas analíticas |

---

## 2. Hallazgos por módulo

### 2.1 Infraestructura de agente (FASE 1C) — `src/lib/agent/`
- **26 archivos** con contratos, registry de tools, permisos, contexto, memoria, auditoría y router heurístico.
- **Tools**: 20 registradas (`availableTools`) en `tools/index.ts` (inventory 3, product 5, sales 2, customer 2, agenda 3, order 3, report 2). Registradas por side-effect al importar `@/lib/agent`.
- **Registry** (`registry.ts`): `registerTool`, `getTool`, `listTools`, `executeTool(ctx, name, input)`. `executeTool` verifica permisos (`canUse`: basta UNA de las requeridas) y audita en `agentAudit`.
- **Permisos** (`permissions/permissions.ts`): 22 granulares (`inventory.*`, `product.*`, `sales.*`, `order.*`, `customer.*`, `agenda.*`, `report.read`, `subscription.read`). 4 roles en `agent.roles.ts` (admin/manager/assistant/seller).
- **Contexto** (`context/`): `buildAgentContext()` (NextAuth + Prisma) construye `AgentContext` con `user` y `business` pero **NO construye `conversation`** (queda para el orquestador).
- **Memoria** (`memory/`): `ShortTermMemory` real (TTL in-memory); `LongTermMemory` **solo interfaces** (sin store conectado).
- **Auditoría** (`audit/`): `AgentAuditService` + `InMemoryAgentAuditStore` (máx 500), persistencia a `AuditLog` desactivada por defecto.
- **Router** (`router.ts`): `routeAgentIntent(text)` heurístico sin IA; cubre 18/20 tools (faltan `product.delete`, `order.get`).
- **Ley de capas verificada por test**: las tools solo importan `@/services/*`, nunca `@/lib/prisma` ni `@/repositories`.

### 2.2 Integración real
- **`@/lib/agent` NO se importa en ninguna página/ruta API/componente.** El agente está "listo pero huérfano": todo es infraestructura sin consumo.
- La UI del asistente (`src/components/assistant/assistant-panel.tsx`) es un **mock** que responde texto fijo "Funcionalidad completa disponible pronto".
- Feature gating disponible: `src/lib/features` define `basic_ai`, `unified_chat` y `aiRequestsPerMonth` (100 base / 500 plus), aún sin aplicar.

### 2.3 LLM / OpenRouter
- **No hay SDK LLM** instalado (sin `openai`, `ai`, `@ai-sdk/*`, `langchain`, `openrouter`, `zod`).
- Único precedente: `src/lib/ai.ts` — `fetch` directo a `https://openrouter.ai/api/v1/chat/completions` (modelo `nvidia/nemotron-3-ultra-550b-a55b:free`), rate-limit diario in-memory, para importación de inventarios. **Es el único lugar que conoce OpenRouter hoy.**
- `OPENROUTER_API_KEY` ya está en `.env` (sección IA — importación de inventarios).
- CSP de `next.config.ts` no incluye `openrouter.ai` en `connect-src` (relevante solo si el cliente llama directo; el agente corre en servidor).

### 2.4 Servicios y eventos (FASE 1B/2C)
- `src/services/*.service.ts` (Product, Inventory, Sales, Order, Customer, Agenda) son la capa única de validación de negocio, con `ServiceError { message, status, code?, details? }`.
- `src/events/event.service.ts`: `EventService` singleton con `on/emit/emitAsync`, 13 eventos de dominio (`sale.*`, `order.*`, `inventory.*`, `product.*`, `customer.*`, `appointment.created`).
- `src/lib/analytics/` (FASE 2C): `getSalesMetrics`, `getInventoryHealth`, `getCustomerMetrics` — solo lectura.

### 2.5 Config / entorno
- **No existe módulo central de validación de env**; cada módulo lee `process.env.X` con defaults (patrón ad-hoc).
- Variables nuevas para el Agent Core: deben nombrarse y documentarse en `.env.example` (CHAT_MODEL, BUSINESS_MODEL, etc.).

---

## 3. Decisiones que impone la auditoría al diseño del Agent Core

1. **Carpeta nueva `src/lib/agent-core/`** separada de `src/lib/agent/` (que es la infraestructura de tools 1C). El Core *consume* el registry/permisos/router existentes a través de su `Tool Resolver`, sin acoplarse.
2. **AI Provider Manager** como capa intermedia obligatoria: el resto del sistema NUNCA ve OpenRouter. Único adaptador: `providers/openrouter.ts` (fuera del Core, inyectado).
3. **Model Router basado en configuración** (env por tarea), no nombres hardcodeados en el Core.
4. **Conversation no se construye en `buildAgentContext`** → el Session Manager la construye y el Context Builder la convierte en mensajes de proveedor.
5. **Sin SDK**: usar `fetch` nativo (patrón ya probado en `src/lib/ai.ts`), con timeout vía `AbortSignal`.
6. **Permisos**: el Permission Checker del Core reutiliza `@/lib/agent/permissions` (22 permisos, `hasPermission`); el Tool Resolver delega la ejecución a `registry.executeTool` (que ya audita).
7. **Gate por plan** (`basic_ai`) queda como hook opcional inyectable; no se acopla el Core a planes.
8. **Observabilidad**: registrar latencia, errores, proveedor, modelo, duración y reintentos (métricas nuevas del Core) + auditoría en `agentAudit` (1C).
9. **No romper `src/lib/ai.ts`**: queda como está; el OpenRouter Adapter del Core es una vía nueva (la migración se evalúa en fases futuras).
10. **CSP**: no se modifica en esta fase (todo el tráfico LLM es server-side).

---

## 4. Riesgos identificados

| Riesgo | Mitigación |
|---|---|
| Modelos `:free` de OpenRouter pueden fallar o devolver JSON inválido | `generateStructuredOutput` con parsing robusto (strip markdown + fallback) y errores tipados `invalid_response` |
| Tiempos de respuesta altos en modelos free | Timeout configurable por tarea (`AI_TIMEOUT_MS`), retries con backoff |
| Sin API key → el Core debe degradar con gracia | `ProviderError kind "missing_key"` → `AgentResponse { ok:false, error }` sin crash |
| Fuga de acoplamiento a OpenRouter | Regla de capas: solo `providers/openrouter.ts` conoce OpenRouter; test lo verifica |
| Duplicidad con `src/lib/ai.ts` | Documentado; migración futura |

---

## 5. Conclusión

La base FASE 1C es sólida y testeada (20 tools, 22 permisos, auditoría, memoria). El Agent Core de 3A se construye **sobre** esa base (sin tocarla), añadiendo la capa de proveedores desacoplada, el pipeline de requests, el session manager, el formatter y la observabilidad. No se conecta LLM real todavía: el Core queda listo y testeado con proveedores falsos.
