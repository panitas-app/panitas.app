# Business Context & Profile — Arquitectura (FASE 3D)

**Rama:** `develop-v2` · **Estado:** Implementado · **Fecha:** 02/08/2026

---

## 1. Propósito

Dar al agente un **contexto empresarial rico y compacto** por turno: qué es el negocio,
su configuración, su plan, quién habla, sus permisos, sus métricas principales, sus
productos/clientes más valiosos y la **memoria relevante** recuperada para la pregunta.
Todo **derivado en el momento** (sin tabla de perfil cacheada) y **aislado por negocio**.

## 2. Business Profile — `src/lib/agent/profile/`

El **perfil inteligente del negocio** es una vista derivada a partir de `Store` + `Negocio`
+ Analytics + ventas.

| Sección | Contenido | Fuente |
|---|---|---|
| `general` | nombre, slug, descripción, país, teléfono, email, dirección, dueño (`owner`), redes | `Store` / `Negocio` / `User` |
| `category` | planType, template, modalidad | `Store` / `Negocio` |
| `config` | horario, costo de envío, envío gratis (activo + mínimo), bolívares, días de crédito | `Store` |
| `plan` | plan, estado, vencimiento | `Store` / `Negocio` |
| `metrics` | ventas hoy/mes, stock bajo, unidades, clientes totales y gasto total | `getSalesMetrics`, `getInventoryHealth`, `getCustomerMetrics` |
| `topProducts` | top N productos vendidos (30 días) | `SalesRepository.topProducts` + `productsByIds` |
| `topCustomers` | clientes más valiosos (órdenes + total) | `SalesRepository.frequentCustomers` + `customersByIds` |
| `builtAt` | marca de tiempo del cálculo | — |

- `BusinessProfileBuilder.build(ctx)` — el `storeId` viene del contexto autenticado (jamás del input).
- `profileToPromptFragment(profile)` — texto compacto para el system prompt (se trunca a 1.200 chars en el builder).

## 3. Business Context — `src/lib/agent/context/business-context-builder.ts`

Componedor que produce un **bundle** por turno:

```
BusinessContextBundle = {
  business, user, plan, permissions, metrics, profile, memory, builtAt
}
```

- `build(ctx, query?)` → perfil (si hay provider) + **memoria recuperada para `query`** (si hay provider).
- `permissions` derivados del rol (`permissionsForRole`).
- Fragmentos para el prompt:
  - `toBusinessFragment(bundle)` → perfil / info básica del negocio (máx. 1.200 chars).
  - `toMemoryFragment(bundle)` → memoria relevante con `[IMPORTANCE]` (máx. 1.800 chars).
  - `toPromptFragment(bundle)` → ambos combinados.
  - `toAgentMemoryContext(bundle)` → lista plana para `AgentRequest.memoryContext` (sin datos sensibles de BD).

**Límites de tokens**: los fragmentos se truncan por caracteres; el `MemoryManager.buildMemoryContext`
limita a 2.500 chars.

## 4. Integración con el Agent Core (aditiva, retrocompatible)

- `AgentRequest` gana dos campos **opcionales**: `businessContext?: string` y `memoryContext?: string`.
- `ContextBuilder.buildSystemPrompt` (3A) los inyecta al system prompt **solo si vienen**.
  - Sin ellos, el comportamiento es idéntico a 3A → los tests de 3A pasan intactos.
- El Agent Core **no conoce** la memoria: recibe texto plano (fragmentos).

## 5. Flujo en el turno (`ConversationEngine.chat`)

```
1. Guardar mensaje usuario + historial limitado
2. try { bundle = context.build(ctx, message) } catch → seguir sin contexto
3. request.businessContext = context.toBusinessFragment(bundle)
   request.memoryContext    = context.toMemoryFragment(bundle)
4. agent.handle(request) → respuesta
5. void memory.saveTurn(turn)  (best-effort)
```

- Si no hay `BusinessContextBuilder`, el engine usa solo `MemoryManager.buildMemoryContext`.
- Cualquier fallo de contexto/memoria **nunca rompe el turno** (se loguea y se responde sin contexto).

## 6. API

| Ruta | Método | Qué hace | Auth |
|---|---|---|---|
| `/api/agent/profile` | GET | Perfil inteligente del negocio | admin/manager/seller/viewer + rate limit |
| `/api/agent/memory` | GET | Lista o búsqueda de memoria (`?query=&limit=&minImportance=`) | admin/manager/seller/viewer + rate limit |
| `/api/agent/memory?key=...` | DELETE | Elimina un ítem de memoria | admin/manager + CSRF |

## 7. Fuentes de datos (reutilizadas, no modificadas)

- `src/lib/analytics/{sales,inventory,customers}.ts`
- `src/repositories/sales.repository.ts` (`topProducts`, `frequentCustomers`, `productsByIds`, `customersByIds`)
- `src/repositories/business.repository.ts` (nuevo: `Store`/`Negocio`/`User` de solo lectura)
