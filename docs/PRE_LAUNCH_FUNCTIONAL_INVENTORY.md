# Inventario Funcional — Panitas 2.0 (Pre-Launch)

*Actualizado: 11/08/2026 · FASE 8G*

Inventario de las capacidades del sistema verificado contra la estructura real
de rutas API y páginas, con su estado funcional en el momento del pre-launch.

---

## 1. Núcleo de negocio (POS / Ventas)

| Capacidad | Ruta API | Estado |
|---|---|---|
| Creación de orden (POS / online) atómica | `POST /api/orders` | ✅ Verificado (transaccional 8G) |
| Cambio de estado (confirmar / preparar / enviar / entregar / cancelar) | `PATCH /api/orders/[id]/status` | ✅ Verificado (cancel atómica 8G) |
| Verificación de pago de orden | `POST /api/orders/[id]/verify-payment` | ✅ Verificado (atómica 8G) |
| Productos (CRUD + stock + mayorista) | `/api/products` · `/api/products/[id]` | ✅ Verificado |
| Clientes (CRUD + totales derivados) | `/api/customers` | ✅ Verificado |
| Cupones (validación servidor) | `/api/coupons` | ✅ Verificado |
| Vendedores / comisiones | `/api/sellers` · `/api/commissions` | ✅ Verificado |
| Categorías | `/api/categories` | ✅ Verificado |
| Reportes y exportación | `/api/reports` · `/api/download` | ✅ Verificado |

## 2. Finanzas

| Capacidad | Ruta API | Estado |
|---|---|---|
| Caja registradora (apertura / cierre) | `/api/cash-register` · `/api/cash-register/[id]` | ✅ Verificado (cierre atómico 8G, totales por método) |
| Gastos | `/api/expenses` | ✅ Verificado (rango de fecha corrige último día 8G) |
| Créditos en cuotas (lista / abono / reprogramar / cancelar) | `/api/creditos` | ✅ Verificado (abono y reprogramación atómicos 8G) |
| Cuentas por cobrar (colección) | `/api/collection` | ✅ Verificado |
| Proveedores / cuentas por pagar | `/api/suppliers` | ✅ Verificado (pago atómico 8G, guard de saldo) |
| Analytics financiero | `/api/analytics` | ✅ Verificado (crédito no se cuenta doble 8G) |
| Tasa BCV | `/api/bcv` | ✅ Verificado |
| Cuentas de pago (admin) | `/api/payment-accounts` · `/api/admin-payment-methods` | ✅ Verificado |

## 3. Agenda / Citas

| Capacidad | Ruta API | Estado |
|---|---|---|
| Agendas, horarios, servicios, bloques | `/api/agendas` · `/api/schedules` · `/api/services` · `/api/blocked-slots` | ✅ Verificado |
| Citas (crear / listar / cancelar) | `/api/appointments` · `/api/appointments/[id]` | ✅ Verificado |
| Slots disponibles | `/api/appointments/slots` | ✅ Verificado (P2: auth por agenda + acceso público solo por slug 8G) |
| Agenda pública por slug | `/store/[slug]/booking` · `/api/store/[slug]/employee/[employeeSlug]` | ✅ Verificado |

## 4. Tienda pública / Perfil

| Capacidad | Ruta API | Estado |
|---|---|---|
| Tienda pública por slug | `/store/[slug]` | ✅ Verificado |
| Checkout online | `/api/checkout` | ✅ Verificado |
| Perfil público del negocio | `/api/perfil/[slug]` | ✅ Verificado (P2: whitelist sin negocioId/planType 8G) |
| Multitienda / vendedores | `/api/stores` | ✅ Verificado |

## 5. Scanner (POS móvil)

| Capacidad | Ruta API | Estado |
|---|---|---|
| Sesión de scanner (crear / verificar) | `/api/scanner/session` · `/api/scanner/scan` | ✅ Verificado (token timing-safe 8G) |
| Desconexión / reconexión | `/api/scanner/disconnect` · `/api/scanner/connect` | ✅ Verificado |
| Página de escaneo | `/scanner/[sessionId]` | ✅ Verificado |

## 6. Agente / Asistente (IA)

| Capacidad | Ruta API | Estado |
|---|---|---|
| Chat del agente | `/api/agent/chat` | ✅ Verificado (anti-prompt-injection 8G) |
| Perfil inteligente del negocio | `/api/agent/profile` | ✅ Verificado |
| Memoria de negocio | `/api/agent/memory` · `/api/business-memory` | ✅ Verificado |
| Recomendaciones | `/api/agent/recommendations` | ✅ Verificado |
| Resumen de negocio | `/api/agent/business-summary` | ✅ Verificado |
| Proactividad | `/api/agent/proactive` | ✅ Verificado |

## 7. Automatización e integraciones

| Capacidad | Ruta API | Estado |
|---|---|---|
| Webhooks (suscripciones + firma HMAC) | `/api/webhooks` · `/api/v1/*` · `src/lib/platform/webhooks` | ✅ Verificado |
| Automatizaciones | `/api/automations` | ✅ Verificado |
| Conversaciones (WhatsApp/email) | `/api/conversations` | ✅ Verificado |
| Inbox / conocimiento | `/api/inbox` · `/api/knowledge` | ✅ Verificado |
| Subscripciones / planes | `/api/subscriptions` | ✅ Verificado |
| Cron | `/api/cron` | ✅ Verificado |

## 8. Administración (plataforma)

| Capacidad | Ruta API | Estado |
|---|---|---|
| Admin: usuarios, planes, pagos, auditoría | `/api/admin/*` | ✅ Verificado |
| Auditoría | `/api/admin/audit` | ✅ Verificado (rango fecha 8G) |

## 9. Páginas públicas / marketing

| Página | Estado |
|---|---|
| Landing, pricing, planes, precios | ✅ |
| Software-para-* (verticales: barberías, clínicas, restaurantes, etc.) | ✅ |
| Blog, FAQ, contacto | ✅ |
| Legal: privacidad, términos | ✅ |
| Onboarding, choose-plan, subscribe | ✅ |

---

## Resumen

- **Áreas funcionales**: 9
- **Capacidades verificadas**: 50+
- **P0**: 0 · **P1**: 0
- **Fix aplicados en 8G**: cierre de caja, fechas de rango, doble conteo de crédito,
  atomicidad transaccional (órdenes, créditos, proveedores, verificación de pago),
  auth de slots de agenda, whitelist de perfil público.
