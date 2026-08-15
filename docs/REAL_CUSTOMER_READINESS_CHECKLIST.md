# REAL CUSTOMER READINESS CHECKLIST — Panitas 2.0

*Documento de FASE 35-36 del REAL CUSTOMER READINESS AUDIT — fuente de verdad para el veredicto final (FASE 42)*
*Fecha: 2026-08-15 — Validación en producción (panitas.app) con tenants de prueba A y B*

## Cómo usar esta checklist

Cada ítem tiene un criterio objetivo validado en producción. El resultado global determina el veredicto único de la FASE 42:
- **CUSTOMER READY**: todas las columnas críticas PASS sin hallazgos BLOCKER/HIGH sin mitigar.
- **CUSTOMER READY WITH RESTRICTIONS**: crítico PASS, con hallazgos HIGH mitigables por procedimiento/operador.
- **NOT CUSTOMER READY**: cualquier fallo crítico (pérdida de datos/dinero, acceso cross-tenant, incapacidad de operar, info financiera incorrecta, cuenta inutilizable).

## 1. Aislamiento multi-tenant (crítico)

| # | Criterio | Resultado | Evidencia |
|---|---|---|---|
| C1 | Cada tenant solo ve sus datos | ✅ PASS | FASE 9-10: 2 productos por tienda, sin fuga; GET cross-store → 403 |
| C2 | Roles respetan jerarquía | ✅ PASS | FASE 8: seller no puede invitar en tienda donde no es admin |
| C3 | Agente IA usa contexto del tenant logueado | ✅ PASS | FASE 21-22: PROD-AGENTE-TEST solo en tienda A, 0 en B |
| C4 | Cliente auto-creado pertenece a la tienda correcta | ✅ PASS | FASE 11-13: customers con storeId correcto (SQL) |
| C5 | Sin IDs "calientes"/predictables | ⚠️ OBSERVATION | IDs CUID predecibles no son problema; contexto multi-tienda frágil (11A-04) |

## 2. Integridad financiera (crítico)

| # | Criterio | Resultado | Evidencia |
|---|---|---|---|
| F1 | Cierre diario refleja pagos cobrados | ✅ PASS (UI real) | Reporte 47.5 = 17.5 abono + 30 efectivo verified |
| F2 | Pagos POS cash quedan `verified` | ✅ PASS (UI real) | POS page.tsx:361 envía `status:"verified"` |
| F3 | API rechaza pagos inconsistentes | ✅ PASS (FASE 37) | Hardening: pago sin `status: "verified"` → orden `pending`, pago `pending`, sin paidAt (verificado en prod + BD) |
| F4 | Créditos: cuotas/abonos/estado correctos | ✅ PASS | FASE 11: abono 17.5 → `on_time`, pending 35, BD consistente |
| F5 | Proveedores: compra→pago→estado correcto | ✅ PASS | FASE 14-16: pago 150 → `saldado`, balance 0 |
| F6 | Agente IA reporta ingresos/ticket correctos | ✅ PASS (FASE 37) | "$302.50 con 9 órdenes"; ticket $33.61 = 302.5/9 exacto |
| F7 | Agente IA detecta inventario | ✅ PASS (FASE 37) | Agente lista los productos reales (antes "0 productos") |

## 3. Operación del negocio (crítico)

| # | Criterio | Resultado | Evidencia |
|---|---|---|---|
| O1 | Crear productos/ventas/créditos/gastos/proveedores | ✅ PASS | FASE 11-16 todas las operaciones 201/200 |
| O2 | Stock se descuenta/suma correctamente | ✅ PASS | ALFA 50→48→41; ajuste +10 → balance 51 |
| O3 | Tienda pública visible al activar plan | ✅ PASS | Placeholder correcto en plan pendiente; catálogo con plan activo |
| O4 | Checkout público funciona | ✅ PASS | Orden online 21 creada + cliente auto-creado |
| O5 | Reportes y analytics disponibles | ⚠️ PARCIAL | daily exacto (UI real); analytics = valorización inventario correcta |

## 4. Soporte al cliente (crítico para operar)

| # | Criterio | Resultado | Evidencia |
|---|---|---|---|
| S1 | Cliente puede reportar problemas | ❌ FAIL (11A-13) | `SupportTicket` solo admin; sin ruta cliente ni página de ayuda |
| S2 | Operador puede diagnosticar | ⚠️ PARCIAL | BD + logs Vercel manual; sin health-check interno (11A-14) |
| S3 | Canal de soporte documentado | ❌ FAIL | Sin email de soporte centralizado en la app |

## 5. Suscripción y cobro

| # | Criterio | Resultado | Evidencia |
|---|---|---|---|
| B1 | Cliente puede pagar | ⚠️ PARCIAL | Manual: comprobante + activación admin (sin pasarela, 11A-16) |
| B2 | Cliente puede cancelar | ❌ FAIL (11A-15) | Solo admin puede desactivar; sin self-service |
| B3 | Cliente puede borrar/exportar sus datos | ❌ FAIL (11A-15) | Sin DELETE de cuenta ni export (GDPR) |
| B4 | Renovación automática | ❌ FAIL (11A-16) | Cron solo para installment; sin pasarela |

## 6. Seguridad (crítico)

| # | Criterio | Resultado | Evidencia |
|---|---|---|---|
| SE1 | Sesión segura | ✅ PASS | Cookie `__Secure-` httpOnly/sameSite lax/secure prod |
| SE2 | CSRF protegido | ✅ PASS | Mutación sin Origin → 403 (verificado en prod) |
| SE3 | Rate limiting | ✅ PASS | register 3/15min, login 5/1min, upload-receipt 5/30min |
| SE4 | Email link dangerous (Google) | ⚠️ MEDIUM (11A-10) | `allowDangerousEmailAccountLinking: true` |
| SE5 | Límite de body | ✅ PASS | 1MB via csrfGuard |
| SE6 | Precios validados server-side | ✅ PASS | Servidor ignora precio del cliente |
| SE7 | Datos de prueba aislados | ✅ PASS | Solo datos ficticios en tenants A/B (555, .invalid) |

## 7. UI/UX (calidad)

| # | Criterio | Resultado | Evidencia |
|---|---|---|---|
| U1 | Onboarding persiste datos | ❌ FAIL (11A-01) | Wizard captura y descarta; intent nunca leído |
| U2 | Registro por UI | ⚠️ PARCIAL | Checkbox base-ui no automatizable (11A-03); clic humano OK |
| U3 | Móvil | ✅ PASS | Dashboard + tienda pública responsive (FASE 26-27) |
| U4 | Cookie banner no bloquea | ⚠️ PARCIAL | Intercepta primeros clics en móvil (11A-02) |
| U5 | Analytics/GA4 | ❌ P3 (10C-13) | Beacons bloqueados por CSP |

## Resumen ejecutivo

| Categoría | PASS | PARCIAL | FAIL |
|---|---|---|---|
| Aislamiento | 4 | 1 | 0 |
| Financiero | 7 | 0 | 0 |
| Operación | 5 | 1 | 0 |
| Soporte | 0 | 1 | 2 |
| Suscripción/cobro | 0 | 1 | 3 |
| Seguridad | 6 | 1 | 0 |
| UI/UX | 1 | 2 | 2 |
| **TOTAL** | **23** | **7** | **7** |

## Estado tras FASE 37-40 (fix loop)

Los 3 hallazgos de integridad financiera (11A-05/07/08) y el falso negativo de inventario (11A-09) fueron **corregidos, desplegados y verificados en producción** (deploy `dpl_B1B9DMyCrtK7JQWRNMLzirdApxMp`):

- **11A-08** → F6 PASS: el agente reporta "$302.50 con 9 órdenes" y ticket $33.61 (= 302.5/9, exacto).
- **11A-09** → F7 PASS: el agente lista los productos reales (antes "0 productos").
- **11A-05** → F3 PASS: pago sin `status: "verified"` queda `pending` (orden + pago + sin paidAt); pago con status queda `paid` (orden + pago verified + paidAt). La UI POS y el agente no se ven afectados (normalizan status).
- Regresión completa: 165 archivos de test / 1435 tests PASS; build exitoso (262 páginas); crédito → `partial`, efectivo verified → `paid`.

**FAIL restantes (ninguno es integridad financiera, aislamiento o operación):** 11A-13 (S1/S3 soporte), 11A-15 (B2/B3 offboarding/export), 11A-16 (B4 renovación automática), 11A-01 (U1 onboarding descarta datos), 10C-13 (U5 GA4 CSP). Todos mitigables por procedimiento/operador (runbook + offboarding audit) o de calidad, no bloqueantes de operación.

## Hallazgos vigentes (clasificación final)

- **11A-01** OBSERVATION UX — wizard descarta datos.
- **11A-02/03** OBSERVATION UX — cookie banner y checkbox base-ui (flujo manual OK).
- **11A-04** OBSERVATION arquitectura — multi-tienda frágil.
- **11A-06** OBSERVATION — checkout sin validar plan activo.
- **11A-10** MEDIUM security — Google `allowDangerousEmailAccountLinking`.
- **11A-11/12/14** OBSERVATION — emailVerified correcto; CSRF Host fallback (mitigado Vercel); diagnóstico manual.
- **11A-13** HIGH — sin canal de soporte para el cliente (S1/S3).
- **11A-15** HIGH — sin offboarding self-service / export GDPR (B2/B3).
- **11A-16** OBSERVATION — billing manual sin pasarela (B4, backlog #8).
- **10C-13** P3 — GA4 bloqueado por CSP (U5).

## Resuelto en FASE 37 (antes bloqueantes)

1. ~~**11A-08**~~ → RESUELTO (F6 PASS) — verificado en prod.
2. ~~**11A-09**~~ → RESUELTO (F7 PASS) — verificado en prod.
3. ~~**11A-05/07**~~ → RESUELTO (F3 PASS) — hardening verificado en prod + BD.
4. **11A-13** (sin canal de soporte para el cliente) — mitigado por procedimiento: operador vía admin `POST /admin/support` + runbook; sigue pendiente ruta cliente.
5. **11A-15** (sin offboarding/borrado de datos self-service) — mitigado por procedimiento: admin puede desactivar plan; sigue pendiente self-service + export (GDPR).
6. **11A-16** (billing manual) — viable para primeros clientes (runbook), no escala (backlog #8).
7. **11A-10** (Google email linking) — MEDIUM clasificado; no es bloqueante de operación.

## Relación con otros documentos

- `FIRST_VALUE_FLOW.md` — evidencia completa de cada flujo.
- `CUSTOMER_SUPPORT_DIAGNOSTICS.md` — detalle de soporte (11A-13/14).
- `CUSTOMER_ONBOARDING_RUNBOOK.md` — procedimiento operativo.
- `OFFBOARDING_BILLING_AUDIT.md` — detalle offboarding/billing (11A-15/16).
- `CUSTOMER_READINESS_SCORECARD.md` — puntuación numérica final.
- `PHASE_11A_REPORT.md` — veredicto único obligatorio.
