# PANITAS — Arquitectura

> Documento vivo. Describe la arquitectura actual (1.0) y el destino (2.0). Actualizar conforme avance la transición.

---

## 1. Arquitectura actual (Panitas 1.0)

### 1.1 Vista general

```
[Cliente Web (Next.js App Router)]
        │
        ▼
[Server Actions / Route Handlers  (161 APIs)]
        │
        ├── Prisma ORM ─────────► PostgreSQL (Neon / Docker)
        ├── Auth.js (next-auth) ─ Google OAuth
        ├── Cloudinary ────────── uploads de media
        ├── Resend ────────────── email transaccional
        ├── Twilio ────────────── SMS
        ├── Pusher ────────────── realtime (POS, escáner)
        ├── PostHog ───────────── analítica
        └── OpenRouter ────────── IA (import de inventario)
```

### 1.2 Módulos del dominio (71 modelos Prisma)

| Dominio | Modelos clave |
|---|---|
| **Negocio/Usuarios** | `User`, `Negocio`, `Plan`, `Invitation`, `StoreMember`, `Branch` |
| **Store** | `Store`, `Category`, `Collection`, `Product`, `ProductPresentation`, `PaymentAccount` |
| **Inventario** | `StockMovement`, `Product` |
| **Ventas/Comercio** | `Order`, `OrderItem`, `OrderPayment`, `Installment`, `Coupon`, `CashRegisterSession` |
| **Agenda** | `Agenda`, `Service`, `ServiceCategory`, `Schedule`, `BlockedSlot`, `Appointment`, `Employee` |
| **CRM** | `Customer`, `CustomerNote`, `CustomerTag`, `CustomerFollowUp`, `Automation` |
| **Vendedores** | `Seller`, `SellerCommission`, `EmployeeCommission`, `EmployeePayment` |
| **Finanzas** | `Expense`, `ExpenseBudget`, `BcvRate`, `AgenciaEnvio` |
| **Suscripciones** | `StoreSubscription`, `PlanFeature`, `NegocioPlanHistory` |
| **Admin/Soporte** | `AuditLog`, `SupportTicket`, `AdminSetting`, `EmailLog`, `PotentialClient*`, `Sales*` |
| **Escáner** | `ScannerSession`, `ScannerEvent` |

### 1.3 Capas de código (`src/`)

- **`app/`** — rutas y páginas (App Router). UI + Server Components + API handlers.
- **`components/`** — 125 componentes React (ui, store, dashboard, admin, scanner, booking).
- **`lib/`** — lógica de negocio y servicios: `prisma.ts`, `auth.ts`, `ai.ts`, `bcv.ts`, `email.ts`, `twilio.ts`, `pusher.ts`, `csrf.ts`, `rate-limit.ts`, `permissions.ts`, `import-engine.ts`, `data-cache.ts`, `orders.ts`, `plans.ts`.
- **`services/`** — *(FASE 1B)* capa de servicios de negocio sobre repositorios. `errors.ts`, `context.ts`, `http.ts`, `product.service.ts`, `inventory.service.ts`, `customer.service.ts`, `agenda.service.ts`, `order.service.ts`.
- **`repositories/`** — *(FASE 1B)* acceso a datos puro (Prisma), sin lógica de negocio: `product`, `customer`, `inventory`, `agenda`, `order`, `sales`, `payment`.
- **`events/`** — *(FASE 1B)* bus de eventos tipado: `event.service.ts` (eventos `sale.created`, `product.low_stock`, `appointment.created`, `customer.created`).
- **`lib/agent/`** — *(FASE 1B)* esqueleto del agente: `types`, `registry`, `router`, `context`, `memory`, `permissions` + tools de ejemplo.
- **`types/`** — tipos compartidos entre tienda y template.
- **`hooks/`** — hooks de cliente.

### 1.4 Características técnicas

- **Monolito Next.js** `output: standalone` desplegado en **Vercel**.
- **Turbopack** como bundler (dev y build).
- **TypeScript strict** + ESLint (`eslint-config-next`).
- **PostgreSQL** vía **Prisma 7** con adapter Neon (serverless) y adapter PG (local).
- **Seguridad de BD**: wrapper `safe-prisma` que bloquea migraciones destructivas; backups automáticos.
- **Seguridad HTTP**: CSP, HSTS, X-Frame-Options, etc. en `next.config.ts`.
- **CSPE**: rate limiting en auth/upload; validación CSRF en mutaciones.

---

## 2. Arquitectura destino (Panitas 2.0)

### 2.0. FASE 1B — Capa Service/Repository (en curso)

La migración de los route handlers "gordos" hacia una capa de servicios es progresiva y quirúrgica: se migran rutas preservando exactamente códigos de estado, mensajes y validaciones. Las rutas migradas hoy delegan en los servicios y pierden lógica inline.

**Flujo de una petición migrada:**

```
Route handler (thin) → auth/csrf/rate-limit/parseo → Service (validación + lógica + eventos)
                                                     → Repository (solo Prisma)
                                                     → AuditLog + EventService
```

**Rutas migradas en FASE 1B:** `GET/POST /api/products`, `GET/PUT/DELETE /api/products/[id]`, `GET/POST /api/products/stock`, `GET /api/customers`, `GET/POST /api/appointments`, `GET/POST /api/orders`. El resto de handlers (~155) conservan acceso directo a Prisma hasta su migración incremental.

### 2.1 Visión: Agente Empresarial

```
[Usuarios: Dashboard / Tienda / POS / Agenda]
                      │
                      ▼
           ┌──────────────────────┐
           │   AGENT CORE (capa)  │  ← nueva capa de IA
           │  src/lib/agent/      │
           └──────────┬───────────┘
                      │
        ┌─────────────┼────────────────┐
        ▼             ▼                ▼
 [Tool Registry]  [Memory/Context]  [Orchestrator]
        │
        ├── read:  inventario, ventas, clientes, agenda, reportes
        ├── write: (con confirmación) productos, gastos, citas, órdenes
        └── act:   notificaciones, crones, reportes generados
                      │
                      ▼
              [Módulos 1.0 intactos]
```

### 2.2 Reglas de integración

1. El agente **nunca accede a la BD directamente**: siempre vía el **tool registry** que envuelve servicios existentes (`lib/`).
2. Las herramientas de escritura exigen **confirmación** y pasan por las **mismas validaciones de servidor** de hoy (precios desde BD, cupones, límites por plan).
3. Toda acción del agente se **audita** (extender `AuditLog` o nuevo `AgentLog`).
4. El agente respeta **permisos y roles** (`permissions.ts`, `roles.ts`).
5. Los crones de `vercel.json` migran a "tareas del agente" sin perder las garantías actuales.

### 2.3 Estado de la transición IA (FASE 3A–3E)

Capas IA construidas sobre el legado 1.0, con calificación de `docs/AI_ARCHITECTURE_REVIEW.md`:

```
├─ src/components/assistant/ + src/hooks/use-assistant-chat.ts (4C)  Main Assistant UI — Sheet + página dedicada [N]
└─ src/lib/business-intelligence/ (4B)  Business Monitor — salud, analizadores, insights, resumen     [N]
├─ src/lib/agent-intel/   (4A)  Intelligence Layer — intención, plan, orquestación, confirmación, síntesis, traza
├─ src/lib/agent-core/   (3A)  Agent Core — pipeline, tool-resolver, router, permissions  [B]
├─ src/lib/agent/tools/  (3B)  Tool System — 7 dominios, registry, executor, bridge       [C+]
├─ src/lib/conversation/ (3C)  Conversation Engine — chat con contexto y tools            [A−]
├─ src/lib/agent/memory/ (3D)  Memory — extracción, clasificación, retención de contexto  [B+]
├─ src/lib/agent/profile/(3D)  Business Context Profile — análisis de negocio             [A−]
└─ src/lib/agent/        (1C)  Legado — registry/router/types (parcialmente usado)       [D]
```

- **Estado de cableado (FASE 4A)**: la Intelligence Layer consume por primera vez el
  Tool System 3B (`toolRegistry.metadata()` para planificar y `ToolExecutor` para
  ejecutar). Se integra en el `ConversationEngine` entre el Context Builder y
  `agent.handle`: clasifica intención, planifica, ejecuta varias tools en
  paralelo/orden, exige confirmación para acciones destructivas y entrega la
  evidencia consolidada al LLM (una sola llamada). El `ToolResolver` 3A legacy
  sigue existiendo, ahora con guard anti doble-ejecución
  (`src/lib/agent-core/tool-resolver.ts`).
- **Business Monitor (FASE 4B)**: la capa `src/lib/business-intelligence/`
  responde "¿cómo está mi negocio?" con datos reales y sin predicciones.
  Flujo de capas obligatorio: **Agente → Intelligence → Business Monitor →
  Services → Repositories**. Se consume vía la tool `analytics.businessMonitor`
  (planificada por el `TaskPlanner` cuando se menciona el negocio), la API
  `GET /api/agent/business-summary` y componentes UI puros
  (`src/components/business/`). Los analizadores usan solo servicios 1B;
  el `storeId` siempre proviene del contexto autenticado.
- **Main Assistant Interface (FASE 4C)**: un solo hook de chat
  (`src/hooks/use-assistant-chat.ts`) alimenta dos superficies: el **Sheet**
  flotante del dashboard y la **página dedicada `/dashboard/assistant`** (chat
  a ancho completo + monitor de negocio 4B lateral). La API `POST /api/agent/chat`
  ahora acepta `confirmedStepIds` y expone `confirmation.actions`, cerrando el
  flujo de confirmación de 4A (las tarjetas "Confirmar/Cancelar" reenvían el
  turno con los pasos aprobados). `AskPanitas` hace prefill del texto tipeado al
  abrir el asistente. Reporte: `docs/PHASE_4C_REPORT.md`.
- **Aislamiento de negocio**: la capa de servicios valida que el `storeId` provenga siempre del contexto autenticado. `OrderService.create` y `ProductRepository.findByIds` fueron corregidos en 3E (`docs/SECURITY_AUDIT_REPORT.md`).
- **Gate de planes**: las rutas de IA validaan `requireFeature(plan, feature)` antes de operar (`basic_ai` en `POST /api/agent/chat`).
- **Memoria**: capa 3D con `MemoryManager` + `ProfileService`; el contexto/memoria se inyecta al request y la capa 4A la incluye en la síntesis (`engine.ts:72-82`).

---

## 3. Decisiones arquitectónicas clave

| Decisión | Estado |
|---|---|
| Monolito Next.js (no microservicios) | Mantener en 2.0 — simplifica deploy y contexto del agente |
| Prisma como única capa de datos | Mantener |
| Módulos 1.0 intactos durante transición | Regla obligatoria |
| Capa de agente aislada en `src/lib/agent/` | Nueva |
| LLM vía proveedor con fallback (OpenRouter primero) | Nueva |
| Costo/rate-limit por usuario y plan | Nueva |
| Lectura primero, escritura con confirmación | Nueva |

---

## 4. Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16.2.6 (App Router) |
| UI | React 19, Tailwind 4, shadcn/ui, Framer Motion |
| ORM | Prisma 7.8.0 |
| DB | PostgreSQL (Neon prod / Docker local) |
| Auth | Auth.js (next-auth 5 beta) + Google OAuth |
| Email | Resend |
| SMS | Twilio |
| Realtime | Pusher |
| Media | Cloudinary |
| Analítica | PostHog |
| IA | OpenRouter (modelo free actual) → proveedores múltiples en 2.0 |
| Deploy | Vercel (standalone, cron jobs) |
| Testing | Playwright (pendiente de implementar) |
