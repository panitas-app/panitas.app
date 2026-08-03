# PANITAS — Estado Actual del Producto

> Documento vivo · Última actualización: 2026-08-03 (FASE 4A)
> Describe qué es Panitas hoy: producto estable 1.0 + capa IA 2.0 en desarrollo en `develop-v2`.

---

## 1. Resumen ejecutivo

Panitas es un software administrativo en la nube para negocios venezolanos (inventario, POS, tienda virtual, agenda, CRM, ventas, finanzas). La rama **`develop-v2`** aloja Panitas 2.0: el mismo producto con una capa de IA (agente, tools, conversación, memoria) construida en las fases 3A–3D, estabilizada en 3E y **razonada en la FASE 4A** (intención, plan, orquestación multi-tool y confirmación). La capa IA está construida, testeada y **cableada entre sí**; el transporte al runtime de las rutas de IA (`/api/agent/*`) sigue usando las herramientas legadas 1C.

## 2. Rama y versión

| | |
|---|---|
| Rama de trabajo | `develop-v2` (último: FASE 4A) |
| Producción estable | `main` / tag `v1.0-stable` (`477b657`) |
| Historial | Reescrito el 02/08/2026 (`git filter-repo`) — clones previos incompatibles |
| Framework | Next.js 16 (App Router) · React 19 · Prisma 7.8 · PostgreSQL |

## 3. Módulos activos (1.0 estable)

- **Inventario**: productos, categorías, presentaciones, stock, import Excel + IA, escáner de código de barras
- **POS**: punto de venta, caja registradora, escáner, QR
- **Tienda virtual**: templates públicos, carrito, checkout con comprobante, cupones, QR
- **Agenda y reservas**: agendas, servicios, horarios, citas, recordatorios
- **Clientes / CRM**: tags, notas, follow-ups, automatizaciones
- **Ventas**: órdenes, pagos, cuotas, comisiones, vendedores
- **Reportes**: analytics, finanzas, breakeven, cierres
- **Suscripciones y planes**: pagos manuales (comprobante + verificación admin), pricing
- **Panel admin interno**: usuarios, stores, prospects, soporte, auditoría, BVC
- **Escáner de inventario** (FASE 2B): sesiones, eventos, deducción con IA de audio

## 4. Capa IA 2.0 (estado 4A)

| Capa | Ruta | Estado | Uso real |
|---|---|---|---|
| Intelligence Layer | `src/lib/agent-intel/` (11 archivos) | Construido y testeado | Consume el Tool System 3B (plan + ejecución multi-tool) |
| Agent Core | `src/lib/agent-core/` | Construido y testeado | Rutas `/api/agent/chat`, `/api/scanner` |
| Tool System | `src/lib/agent/tools/` (27 archivos) | Construido y testeado | **Consumido por la capa 4A** (`ToolExecutor` + `toolRegistry`) |
| Conversation Engine | `src/lib/conversation/` | Construido y testeado | Integra la capa 4A antes de `agent.handle` |
| Memory | `src/lib/agent/memory/` | Construido y testeado | Contexto/memoria inyectados al request y a la síntesis 4A |
| Business Profile | `src/lib/agent/profile/` | Construido y testeado | Contexto de negocio en la síntesis 4A |
| Legado 1C | `src/lib/agent/` | Parcialmente usado | registry/router consumidos por ToolResolver |

**FASE 4A:** la Intelligence Layer convierte una solicitud en un turno razonado:
`intención → plan → confirmación (si aplica) → ejecución de varias tools → síntesis
→ traza`. Las acciones destructivas (eliminar, cancelar, ajustar stock) exigen
confirmación explícita; el razonamiento es determinista sin LLM y la respuesta
final es una sola llamada al modelo con evidencia consolidada.
Ver `docs/PHASE_4A_REPORT.md` y `docs/PHASE_4A_AUDIT.md`.

**Gap conocido (documentado):** el transporte al runtime de las rutas de IA sigue
usando las herramientas legadas 1C; la capa 4A (Agent Core 3A + Tool System 3B +
Conversation Engine 3C) está integrada y testeada entre sí pero no cableada a
`POST /api/agent/chat`. Ver `docs/PHASE_3E_STABILIZATION_REPORT.md` y `docs/PHASE_4A_REPORT.md`.

## 5. Seguridad (estado 4A)

- Aislamiento entre negocios corregido en `OrderService.create` (403 si `storeId` ajeno) y `ProductRepository.findByIds` (scope por `storeId`)
- Gate de plan `requireFeature(plan, "basic_ai")` en `POST /api/agent/chat`
- **Confirmación 4A**: acciones destructivas del agente (eliminar/cancelar/ajustar stock) NUNCA se ejecutan sin confirmación explícita (`confirmedStepIds`); cada turno queda trazado (`agent.trace`)
- Rate limiting en auth/upload/chat · CSRF en mutaciones · precios y cupones validados en servidor
- Riesgos latentes documentados (repositorios con métodos por-ID sin `storeId`): no explotables hoy vía API/tools
- RLS (`rls-policies.sql`) y `seed.sql` existentes pero no aplicados (pendiente decisión)

## 6. Calidad

| Métrica | Valor 4A |
|---|---|
| Tests | **330 verdes** / 51 archivos (273 previos + 57 4A) |
| Typecheck | `tsc --noEmit` OK |
| Lint (archivos 4A) | 0 problemas |
| Build | `next build` OK |
| Lint repo global | 2418 problemas preexistentes (417 errors) — ajenos a 4A, pendiente de limpieza |

## 7. Próximos pasos (ver `docs/PANITAS_ROADMAP.md`)

1. **Cablear la capa 4A al runtime**: hacer que `POST /api/agent/chat` use el `ConversationEngine` con la Intelligence Layer (hoy usa herramientas legadas 1C)
2. Persistir la confirmación en la conversación (segunda vuelta con `confirmedStepIds` desde el cliente)
3. Aplicar RLS (`rls-policies.sql`)
4. Convertir páginas de marketing (`/pricing`, `/faq`, `/contacto`) a Server Components
5. Decidir la inicialización de PostHog en cliente (hoy `capture` son no-op)

## 8. Referencias de fase

- FASE 4A (intelligence): `docs/PHASE_4A_REPORT.md` · `docs/PHASE_4A_AUDIT.md` · `docs/INTENT_ENGINE.md` · `docs/TASK_PLANNER.md` · `docs/TOOL_ORCHESTRATION.md` · `docs/CONFIRMATION_SYSTEM.md` · `docs/RESPONSE_SYNTHESIZER.md`
- FASE 3E (estabilización): `docs/PHASE_3E_STABILIZATION_REPORT.md` · `docs/PHASE_3E_FULL_AUDIT.md`
- FASE 3D: `docs/PHASE_3D_REPORT.md` · `docs/PHASE_3D_AUDIT.md` · `docs/MEMORY_SYSTEM.md`
- FASE 3C: `docs/PHASE_3C_REPORT.md` · `docs/CONVERSATION_ENGINE_ARCHITECTURE.md`
- FASE 3B: `docs/PHASE_3B_REPORT.md` · `docs/PHASE_3B_TOOL_AUDIT.md`
- FASE 3A: `docs/PHASE_3A_REPORT.md` · `docs/PHASE_3A_AUDIT.md`
