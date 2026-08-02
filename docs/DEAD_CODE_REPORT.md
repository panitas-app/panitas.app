# DEAD CODE REPORT — FASE 3E

**Rama:** `develop-v2` · **Fecha:** 02/08/2026

Regla de la fase: se elimina solo lo **claramente muerto** (sin referencias, sin uso, sin
valor documental). El código del flujo IA sin conectar se **documenta** y se conserva para
el cableado futuro.

---

## 1. Eliminado (git rm)

Verificado sin referencias en `src/`, `tests/`, scripts ni docs.

| Archivo | Motivo |
|---|---|
| `dev.log`, `dev-err.log`, `dev-output.log` | Logs de desarrollo trackeados |
| `test-api.cjs` | Script de pruebas manuales (además tenía lint errors) |
| `posthog-setup-report.md` | Reporte de configuración puntual |
| `instrumentation-client.ts` | NO es convención de Next.js (solo `instrumentation.ts`); sin imports; `posthog.init` no se llama en ningún lado |
| `hero fondo.png`, `newfondo.jpeg` | Assets sueltos en raíz sin uso |
| `Inventario Mobel Inversiones 20-04-26.xlsx` | Datos de cliente en raíz |
| `inventarios de prueba/*.xlsx` (5) | Datos de prueba |
| `temp-sources/*.mp4` (18) | Videos fuente temporales (los usados están en `public/`) |
| `temp-vp9/*.webm` (17) | Videos VP9 temporales |
| `eduvex_framer_website.html` | Página HTML ajena suelta |
| `data/agencias_venezuela.{csv,json}`, `data/resumen.md` | Datos sin consumidor en `src/` |

**Total: 56 archivos.**

---

## 2. Documentado, NO eliminado (flujo IA futuro)

### 2.1 `src/lib/agent/index.ts` (barrel legado 1C) — **sin importadores**
- Ningún archivo hace `import ... from "@/lib/agent"`.
- Se conserva como punto de entrada público del legado 1C (registry/router/memory/audit/
  permissions). El cableado futuro (3E+) puede usarlo.
- Sus módulos internos sí son consumidos directamente:
  - `registry.ts` → `agent-core/tool-resolver.ts:13`
  - `router.ts` → `agent-core/tool-resolver.ts:14`
  - `permissions.ts` → agent-core + tools (activo)
  - `audit.ts` → agent-core + tools (activo)

### 2.2 `src/lib/agent/setup.ts` — **nunca invocada**
- `setupAgentTools()` registra las tools 3B en el registry legado 1C.
- Se conserva: es el hook previsto para el cableado agent→tools (ver `AI_ARCHITECTURE_REVIEW.md`).

### 2.3 `src/lib/agent/tools/{bridge,setup,registry,executor,index}.ts` (3B)
- `toolRegistry`, `ToolExecutor`, `toLegacyAgentTool`, `buildToolRegistry` no se usan en
  ningún flujo productivo (el Agent Core usa el registry 1C).
- Se conservan: son la capa de tools 3B completa, solo falta conectarla.

### 2.4 `src/lib/agent/tools/*.tools.ts` (archivos planos legacy, p.ej. `product.tools.ts`)
- Implementan tools vía services pero no forman parte del `toolRegistry` 3B actual.
- Se conservan (código funcional duplicado pendiente de consolidación).

### 2.5 `src/lib/agent/memory/` legado 1C (`ShortTermMemory`, `LongTermMemory`)
- Interfaz `LongTermMemory` sin implementación persistente; `agentMemory` legacy.
- El MemorySystem 3D (`src/lib/agent/memory/`) es el vigente. El legado se conserva por
  compatibilidad (lo exporta el barrel).

### 2.6 PostHog cliente sin inicializar
- `posthog-js` importado en 5 componentes pero `posthog.init()` nunca se llama → los
  `posthog.capture(...)` son no-ops. El server-side (`src/lib/posthog-server.ts`) sí funciona.
- Pendiente de fase futura: inicializar el cliente o retirar los `capture`.

---

## 3. Lo que NO se tocó (a propósito)

- `src/lib/scanner/*` — tiene lint errors preexistentes pero es funcional y de negocio.
- `test-api.cjs` ya no existe; otros scripts en `scripts/` se conservan.
- `backups/` — protegida por reglas del proyecto (nunca borrar).
- `templates/` y `.backup_scanner/` — NO están trackeados (no son basura git).
