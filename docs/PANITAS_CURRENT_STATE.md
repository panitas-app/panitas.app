# PANITAS — Estado Actual del Producto

> Documento vivo · Última actualización: 2026-08-02 (FASE 3E)
> Describe qué es Panitas hoy: producto estable 1.0 + capa IA 2.0 en desarrollo en `develop-v2`.

---

## 1. Resumen ejecutivo

Panitas es un software administrativo en la nube para negocios venezolanos (inventario, POS, tienda virtual, agenda, CRM, ventas, finanzas). La rama **`develop-v2`** aloja Panitas 2.0: el mismo producto con una capa de IA (agente, tools, conversación, memoria) construida en las fases 3A–3D y estabilizada en la FASE 3E. La capa IA está **construida y testeada pero sin cablear al runtime**: las rutas de IA existentes (`/api/agent/*`, `/api/scanner/*`) operan con herramientas legadas e introspección.

## 2. Rama y versión

| | |
|---|---|
| Rama de trabajo | `develop-v2` (último: FASE 3E, base `4484b01`) |
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

## 4. Capa IA 2.0 (estado 3E)

| Capa | Ruta | Estado | Uso real |
|---|---|---|---|
| Agent Core | `src/lib/agent-core/` | Construido y testeado | Rutas `/api/agent/chat`, `/api/scanner` |
| Tool System | `src/lib/agent/tools/` (27 archivos) | Construido y testeado | **Inerte** — no cableado al runtime |
| Conversation Engine | `src/lib/conversation/` | Construido y testeado | `POST /api/agent/chat` |
| Memory | `src/lib/agent/memory/` | Construido y testeado | Sin wiring al pipeline |
| Business Profile | `src/lib/agent/profile/` | Construido y testeado | Sin wiring al pipeline |
| Legado 1C | `src/lib/agent/` | Parcialmente usado | registry/router consumidos por ToolResolver |

**Gap conocido (documentado, intencional en 3E):** las tools 3B no se conectan al agente 3A. `setupAgentTools()` no se invoca; `ToolResolver` se crea sin `toolsProvider`. Ver `docs/AI_ARCHITECTURE_REVIEW.md` y `docs/PHASE_3E_STABILIZATION_REPORT.md`.

## 5. Seguridad (estado 3E)

- Aislamiento entre negocios corregido en `OrderService.create` (403 si `storeId` ajeno) y `ProductRepository.findByIds` (scope por `storeId`)
- Gate de plan `requireFeature(plan, "basic_ai")` en `POST /api/agent/chat`
- Rate limiting en auth/upload/chat · CSRF en mutaciones · precios y cupones validados en servidor
- Riesgos latentes documentados (repositorios con métodos por-ID sin `storeId`): no explotables hoy vía API/tools
- RLS (`rls-policies.sql`) y `seed.sql` existentes pero no aplicados (pendiente decisión)

## 6. Calidad

| Métrica | Valor 3E |
|---|---|
| Tests | 273 verdes / 44 archivos |
| Typecheck | `tsc --noEmit` OK |
| Lint (archivos 3E) | 0 problemas |
| Build | `next build` OK |
| Lint repo global | 2418 problemas preexistentes (417 errors) — ajenos a 3E, pendiente de limpieza |

## 7. Próximos pasos (ver `docs/PANITAS_ROADMAP.md`)

1. **Cablear el Tool System 3B** al Agent Core 3A (iniciar `setupAgentTools()` y conectar el `ToolExecutor` al `ToolResolver`)
2. Conectar Memory/Profile al pipeline de conversación
3. Aplicar RLS (`rls-policies.sql`)
4. Convertir páginas de marketing (`/pricing`, `/faq`, `/contacto`) a Server Components
5. Decidir la inicialización de PostHog en cliente (hoy `capture` son no-op)

## 8. Referencias de fase

- FASE 3E (estabilización): `docs/PHASE_3E_STABILIZATION_REPORT.md` · `docs/PHASE_3E_FULL_AUDIT.md`
- FASE 3D: `docs/PHASE_3D_REPORT.md` · `docs/PHASE_3D_AUDIT.md` · `docs/MEMORY_SYSTEM.md`
- FASE 3C: `docs/PHASE_3C_REPORT.md` · `docs/CONVERSATION_ENGINE_ARCHITECTURE.md`
- FASE 3B: `docs/PHASE_3B_REPORT.md` · `docs/PHASE_3B_TOOL_AUDIT.md`
- FASE 3A: `docs/PHASE_3A_REPORT.md` · `docs/PHASE_3A_AUDIT.md`
