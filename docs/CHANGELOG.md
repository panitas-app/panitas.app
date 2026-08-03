# PANITAS — Changelog

> Registro cronológico de versiones y cambios significativos.
> Formato inspirado en [Keep a Changelog](https://keepachangelog.com/). Semver: `MAJOR.MINOR.PATCH`.
> Convención de commits: `feat(scope)`, `fix(scope)`, `security(scope)`, `chore(scope)`, `refactor(scope)`, `docs(scope)`.

---

## [1.0-stable] — 2026-08-02

**Panitas 1.0 Stable.** Punto de restauración oficial (tag `v1.0-stable`, commit `477b657`) antes de la transición a Panitas 2.0.

### Módulos activos
- Inventario (productos, categorías, presentaciones, stock, import Excel + IA, escáner de códigos de barras)
- POS (punto de venta, caja registradora, escáner, QR)
- Tienda virtual (4 templates públicos, carrito, checkout con comprobante, cupones, QR)
- Agenda y reservas (agendas, servicios, horarios, citas, recordatorios)
- Clientes / CRM (tags, notas, follow-ups, automatizaciones)
- Ventas (órdenes, pagos, cuotas, comisiones, vendedores)
- Reportes (analytics, finanzas, breakeven, cierres)
- Suscripciones y planes
- Panel admin interno (usuarios, stores, prospects, soporte, auditoría)

### Correcciones recientes (previas al corte)
- `fix`: escáner directo de cámara en Crear Producto y POS (commit `477b657`)
- `feat(store)`: banner sin gradiente, productos por categoría Z-A, QR con logo nuevo (`b81502e`)
- `fix`: import Excel extrae categorías desde columna mapeada (`a1301b1`)
- `fix`: eliminar paginación en `/dashboard/products` (`f085a10`)

### Infraestructura
- PostgreSQL (Neon en producción, Docker local) vía Prisma 7
- Deploy en Vercel (standalone) con 7 cron jobs
- Seguridad HTTP (CSP, HSTS) y protección de BD (`safe-prisma`, backups)

---

## [Unreleased] — Panitas 2.0 (rama `develop-v2`)

### Seguridad y saneamiento — FASE 1A (2026-08-02)
- `security(phase-1a)`: sacar `.env.production` y `dev.db` del tracking de Git
- `.gitignore` endurecido (`!.env.example`, `*.db`, `*.sqlite`)
- `.env.example` versionado como plantilla pública completa
- Auditoría de secretos (`SECURITY_AUDIT.md`) y checklist de rotación (`SECURITY_ROTATION_CHECKLIST.md`)
- CI/CD: `.github/workflows/verify.yml` (lint + typecheck + build) + `docs/CI_CD.md`
- Script `typecheck` añadido a `package.json`
- Unificación de variables de entorno (`docs/ENVIRONMENT_SETUP.md`)
- Auditoría de ramas (`docs/BRANCH_CLEANUP.md`) y reporte de fase (`docs/PHASE_1A_REPORT.md`)

### Purga de historial — `security` (2026-08-02)
- `security`: reescritura del historial con `git filter-repo` — eliminados `.env.production` (`VERCEL_OIDC_TOKEN`) y `dev.db` de **todos** los commits (239 reescritos)
- Nuevos SHAs: `main` `836792f`, `develop-v2` `22e8647`, `develop` `e407e55`; tags `v1.0-stable` y `v1.0.0` re-creados
- Detectadas y eliminadas ramas `posthog/instrumentation-*` (PRs #1 y #2 cerrados) que conservaban `dev.db` sin purgar
- ⚠️ **Cualquier clon anterior al 02/08/2026 es incompatible** — re-clonar (`docs/HISTORY_PURGE_REPORT.md`)

### Documentación y fundaciones (2026-08-02)
- Añadidos `PANITAS_CURRENT_STATE.md`, `DEVELOPMENT_RULES.md` y documentación en `/docs`
- Creada rama `develop-v2` para el desarrollo de Panitas 2.0

### Próximos hitos (ver `docs/PANITAS_ROADMAP.md`)
- Fase 1: Fundaciones de IA (capa de agente, tool registry, sandbox de lectura)
- Fase 2: Asistente conversacional
- Fase 3: Automatización inteligente
- Fase 4: Escalamiento y producto

---

## FASE 4B — Business Monitor & Operational Intelligence (2026-08-03, `develop-v2`)

> Base `11fbbd8` (FASE 4A). Reporte completo: `docs/PHASE_4B_REPORT.md` · arquitectura: `docs/BUSINESS_MONITOR_ARCHITECTURE.md` · `docs/INSIGHT_ENGINE.md` · `docs/OPERATIONAL_INTELLIGENCE.md`.

### Nueva capa `src/lib/business-intelligence/`
- `feat(bi)`: `BusinessHealthMonitor` — orquesta 5 analizadores en paralelo (inventario, ventas, pedidos, clientes, actividad), arma `ActivitySnapshot` y 10 métricas planas para la UI
- `feat(bi)`: analizadores deterministas sobre servicios 1B — `InventoryAnalyzer` (agotados/stock bajo/sin movimiento/más vendidos), `SalesAnalyzer` (hoy/semana/mes + comparación ≥10% con período anterior), `OrderAnalyzer` (pendientes + posible demora >3 días), `CustomerAnalyzer` (solo por grupos: activos, nuevos, saldo pendiente, inactivos), `ActivityAnalyzer` (síntesis sin consultas)
- `feat(bi)`: `InsightEngine` + `prioritization` — observaciones → insights priorizados (important > warning > info; orders > inventory > sales > customers > activity > general), dedupe por categoría+título, máx. 12
- `feat(bi)`: `BusinessSummaryGenerator` — resumen final con saludo por hora, salud (estable/atención/revisión), insights, métricas y recomendaciones de revisión (sin decisiones)
- `feat(bi)`: catálogo declarativo de 15 reglas (`rules/`), factories, barrel e `index.ts`

### Reglas del cliente
- Sin predicciones ("se agotarán en 4 días"), sin decisiones por el usuario, sin marketing/estrategia, sin severidad "critical"
- Customer Analyzer **solo por grupos**; nunca insights individuales de clientes salvo solicitud explícita

### Integración
- `feat(tools)`: tool `analytics.businessMonitor` (permisos `report.read`) + dep `businessMonitor` inyectable en `ToolDeps`
- `feat(intel)`: `TaskPlanner.mentionsBusiness` → `planBusinessMonitor`; `IntentEngine` reconoce dominio `business` ("cómo está/va el negocio", "negocio/empresa"); `ExplanationEngine` y `agent-intelligence` incluyen el monitor en la evidencia
- `feat(services)`: nueva consulta 1B `OrderRepository.creditOutstanding` + `OrderService.creditOutstanding` (clientes con saldo credit/partial)
- `feat(api)`: `GET /api/agent/business-summary` (rate limit 30/60s, roles admin|manager|seller|viewer, gate `basic_ai`)
- `feat(ui)`: componentes puros en `src/components/business/` (BusinessSummary, BusinessHealthCard, InsightList, InsightCard)

### Calidad
- `fix(bi)`: `format.pct` convertía 1.0 → "1%" en lugar de "100%" (ratio→porcentaje)
- `fix(bi)`: `buildOverview` propagaba `counts.info: 0` hardcodeado
- `test(bi)`: 38 tests nuevos (analizadores 13, insight-engine 8, monitor 4, summary 5, tool 5, creditOutstanding 1, task-planner 2)
- Verificación final: lint limpio en tocados · `tsc --noEmit` OK · **368 tests verdes** (59 archivos) · `next build` OK

### Docs
- `docs/PHASE_4B_REPORT.md` · `docs/BUSINESS_MONITOR_ARCHITECTURE.md` · `docs/INSIGHT_ENGINE.md` · `docs/OPERATIONAL_INTELLIGENCE.md` · `docs/ARCHITECTURE.md` · `docs/CHANGELOG.md` · `PANITAS_CURRENT_STATE.md` actualizados

---

## FASE 4A — Agent Intelligence Layer (2026-08-03, `develop-v2`)

> Base `f7cddf4` (FASE 3E). Reporte completo: `docs/PHASE_4A_REPORT.md` · auditoría: `docs/PHASE_4A_AUDIT.md`.

### Nueva capa de razonamiento (`src/lib/agent-intel/`)
- `feat(intel)`: `IntentEngine` — clasifica la solicitud en 7 intenciones (consulta, acción, análisis, configuración, conversación, ayuda, reporte) con confianza, dominios y entidades; determinista sin LLM
- `feat(intel)`: `TaskPlanner` — convierte la intención en un plan de tools del Tool System 3B (orden, paralelismo, confirmación, rationale) usando `toolRegistry.metadata()`
- `feat(intel)`: `ExecutionPlanner` — orquesta varias tools (secuencial/paralelo) con dependencias, reintentos y errores parciales; NUNCA ejecuta pasos sin confirmación
- `feat(intel)`: `ConfirmationSystem` — reglas declarativas de confirmación (`products.delete`, `orders.updateStatus`=cancelled, `inventory.updateStock`=decrease/adjustment) y flujo `confirm:<stepId>`
- `feat(intel)`: `ResponseSynthesizer` + `ExplanationEngine` — sintetizan la evidencia para la respuesta final del LLM (una sola llamada) y explican hallazgos en español
- `feat(intel)`: `DefaultTraceRecorder` — observabilidad del turno (intención, plan, steps, tiempos, errores) con auditoría best-effort (`agent.trace`)
- `feat(intel)`: `IntelligenceLayer` — orquestador del flujo intención→plan→confirmación/ejecución→síntesis→traza

### Integración
- `feat(conversation)`: `ConversationEngine` invoca la capa 4A antes de `agent.handle`; `confirmation_required` responde SIN LLM; contexto sintetizado se inyecta vía `request.intelligenceContext`; fallback determinista sin LLM cuando no hay resultados
- `feat(agent-core)`: guard anti doble-ejecución en `ToolResolver` (si `metadata.intelligence`, no vuelve a ejecutar tools legacy)
- `feat(agent-core)`: `AgentRequest.intelligenceContext` inyectado al system prompt por el Context Builder

### Calidad
- `test(intel)`: 57 tests nuevos (intent-engine 14, task-planner 10, execution-planner 9, confirmation-system 7, response-synthesizer 7, intelligence-layer 6, conversation-intelligence 4)
- Verificación final: lint limpio en tocados · `tsc --noEmit` OK · **330 tests verdes** (51 archivos) · `next build` OK

### Docs
- `docs/PHASE_4A_AUDIT.md` (auditoría previa) · `docs/PHASE_4A_REPORT.md` · `docs/INTENT_ENGINE.md` · `docs/TASK_PLANNER.md` · `docs/TOOL_ORCHESTRATION.md` · `docs/CONFIRMATION_SYSTEM.md` · `docs/RESPONSE_SYNTHESIZER.md` · `ARCHITECTURE.md` · `PANITAS_CURRENT_STATE.md` actualizados

---

## FASE 3E — Auditoría, limpieza y estabilización (2026-08-02, `develop-v2`)

> Sin nuevas features ni capacidades IA. Base `4484b01` (FASE 3D). Reporte completo: `docs/PHASE_3E_STABILIZATION_REPORT.md`.

### Seguridad
- `security(orders)`: `OrderService.create` rechaza `403 "No autorizado"` si `body.storeId` difiere del contexto autenticado; `storeId` se deriva siempre del contexto
- `security(repository)`: `ProductRepository.findByIds(ids, storeId?)` filtra por `storeId`; `OrderService` lo usa con el storeId autenticado
- `security(agent)`: gate `requireFeature(plan, "basic_ai")` en `POST /api/agent/chat` → `403` si el plan no lo incluye (red de seguridad)

### Limpieza
- `chore(dead-code)`: eliminados 56 archivos trackeados (logs dev, `test-api.cjs`, `posthog-setup-report.md`, `instrumentation-client.ts`, imágenes/archivos de cliente, `temp-sources/*.mp4`, `temp-vp9/*.webm`, `data/*`)

### Rendimiento
- `perf(schema)`: 11 índices en 5 modelos (`Product`, `OrderItem`, `OrderPayment`, `Expense`, `Collection`) aplicados vía `db:push` con backup previo

### Calidad
- `test(agent)`: `tests/agent-core/wiring.test.ts` (4) — el Tool System 3B funciona cuando se cablea; `tests/features/chat-gate.test.ts` (3) — gate de plan en chat API; `test(orders)`: scope de `findByIds` al storeId autenticado
- Verificación final: lint limpio en tocados · `tsc --noEmit` OK · 273 tests verdes · `next build` OK

### Docs
- `docs/PHASE_3E_FULL_AUDIT.md`, `docs/DEAD_CODE_REPORT.md`, `docs/SECURITY_AUDIT_REPORT.md`, `docs/AI_ARCHITECTURE_REVIEW.md`, `docs/DATABASE_OPTIMIZATION.md`, `docs/PANITAS_CURRENT_STATE.md`, `docs/PHASE_3E_STABILIZATION_REPORT.md`

---

## Historial previo (resumen)

> Registro informal reconstruido desde `git log` de la rama `main`.

### Julio 2026
- Escáner: arquitectura de state machine, soporte móvil, zoom hardware, QR en POS
- Store: QR modal con logo, templates de tienda
- Import Excel: parsing robusto con categorías

### Junio 2026
- Migración a PostgreSQL (Docker + Neon), schema con 71 modelos
- Pagos de suscripción, pricing 14.99/19.99/49.99
- Módulos de CRM, agenda, vendedores, prospectos (admin)
- Página `/subscribe`, métodos de pago admin

### Antes (legado)
- SQLite → migración a PostgreSQL
- Seguridad: auth admin, rate limiting, CSRF, validación de precios/cupones en servidor
