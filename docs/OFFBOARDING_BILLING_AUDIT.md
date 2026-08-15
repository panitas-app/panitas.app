# OFFBOARDING & BILLING AUDIT — Panitas 2.0

*Documento de FASE 33-34 del REAL CUSTOMER READINESS AUDIT — auditoría de documentación, sin cambios de código*
*Fecha: 2026-08-15*

## 1. Alcance

FASE 33 (offboarding del cliente) y FASE 34 (billing/suscripciones) son **auditoría + documentación** únicamente. No se realizó ningún cambio destructivo ni de código.

## 2. Offboarding del cliente

### 2.1 Capacidades existentes (verificadas en código)

| Capacidad | Estado | Evidencia |
|---|---|---|
| Desactivar plan de un cliente | ✅ Admin `POST /api/admin/users/[id]/toggle-activation {active:false}` → `Store.planStatus="pendiente"`, `Negocio.planEstado="cancelado"` | src/app/api/admin/users/[id]/toggle-activation/route.ts |
| Re-activar plan | ✅ Admin `toggle-activation {active:true}` (+ trial opcional) | Ídem |
| Renovar suscripción | ✅ Admin `POST /api/admin/users/[id]/renew` | Ídem directorio |
| Cron de segundo pago de suscripción | ✅ `POST /api/cron/subscription-second-payment` | src/app/api/cron/subscription-second-payment/route.ts |
| Cancelar suscripción manualmente | ⚠️ Solo admin vía toggle-activation (no hay self-service del cliente) | — |
| **Cliente cancela su plan (self-service)** | ❌ **NO EXISTE** | Sin endpoint público de cancelación |
| **Cliente borra su cuenta / datos (self-service)** | ❌ **NO EXISTE** | Sin `DELETE /api/auth/account` ni equivalente; `getUserByAccount` es no-op en debug |
| **Cliente exporta sus datos (GDPR/portabilidad)** | ❌ **NO EXISTE** | Sin export de productos/ventas/clientes |
| Borrado lógico vs físico | ⚠️ Desactivación es lógica (plan pendiente); no hay purga física documentada | — |

**Hallazgo 11A-15 (HIGH)**: el offboarding de un cliente real **no existe como self-service**. Un cliente no puede cancelar su plan ni borrar sus datos; todo requiere intervención del admin. En un lanzamiento real esto genera fricción y riesgo de incumplimiento (GDPR/regulación local). El operador puede desactivar manualmente, pero el cliente queda con la cuenta y datos en la plataforma.

### 2.2 Procedimiento manual de offboarding (operador)

1. Admin: `toggle-activation` con `{active:false}` → tienda pasa a placeholder "en proceso de activación".
2. Verificar que ya no hay suscripción `status:"active"` (o dejarla expirar).
3. Acordar retención/purga de datos con el cliente (no hay proceso automático documentado).
4. Si se requiere borrado físico: operación manual en BD de producción (fuera de la app, sin herramienta propia).

## 3. Billing / suscripciones

### 3.1 Modelo de cobro actual (verificado)

| Aspecto | Estado | Evidencia |
|---|---|---|
| Precios por plan | ✅ Tabla en `src/app/api/subscriptions/route.ts:67-79` (comercio $25/mes, mayorista $45, etc.) | Precios hardcodeados en 2 lugares (subscriptions + plans) |
| Flujo de pago | ⚠️ **Manual**: el cliente sube comprobante (`receiptImage`), la suscripción nace `status:"pending"`, el admin verifica/activa | subscriptions route.ts:89-106 |
| Pasarela de pago automática | ❌ **NO EXISTE** (pendiente #8 de backlog: Stripe/PayPal/Epayco) | AGENTS.md checklist pendiente #8 |
| Renovación automática | ❌ **NO EXISTE** (cron de segundo pago solo para modalidad installment) | cron/subscription-second-payment |
| Emails de pago | ✅ Envío "Recibimos tu comprobante" (`templatePaymentPending`) al crear suscripción | subscriptions route.ts:108-113 |
| PostHog capture de suscripción | ✅ `subscription_created` | subscriptions route.ts:115-128 |
| Plan activo / trial | ✅ Admin activa con trial opcional (1-365 días) | toggle-activation route.ts |
| Tienda pública condicionada a plan | ✅ `[slug]` solo muestra catálogo con planStatus activo/trial | store page (verificado en prod: placeholder en plan pendiente) |

**Hallazgo 11A-16 (OBSERVACIÓN, bloqueante de escala)**: el billing es **manual** (comprobante + activación admin). Esto es viable para los primeros clientes pero **no escala**: sin pasarela automática no hay cobro recurrente, renovaciones ni cancelaciones self-service. Es el pendiente #8 del backlog maestro (AGENTS.md).

### 3.2 Riesgo operativo del billing manual

- Ingresos dependen de verificación manual del admin (el cliente podría cobrar y no pagar).
- La activación y desactivación dependen de disponibilidad del operador.
- No hay reconciliación automática de pagos (solo cron de segundo pago para installment).

## 4. Resumen de hallazgos de FASE 33-34

| ID | Severidad | Hallazgo | Estado |
|---|---|---|---|
| 11A-15 | **HIGH** | Sin offboarding self-service del cliente: no puede cancelar plan ni borrar/exportar sus datos (solo admin). Riesgo GDPR/fricción real | Documentado |
| 11A-16 | OBSERVACIÓN (bloqueante de escala) | Billing 100% manual (comprobante + activación admin), sin pasarela ni renovación automática (backlog #8) | Documentado |

## 5. Relación con la readiness

- 11A-15 y 11A-16 no impiden **operar** con los primeros clientes (el admin puede activar/desactivar), pero limitan el **escalado** y generan dependencia operativa.
- Para el veredicto final (FASE 42) se clasificarán según la checklist REAL_CUSTOMER_READINESS_CHECKLIST.md.
