# CUSTOMER SUPPORT DIAGNOSTICS — Panitas 2.0

*Documento generado en FASE 11A (REAL CUSTOMER READINESS AUDIT) — basado en verificación real en producción (panitas.app)*
*Fecha: 2026-08-15*

## 1. Objetivo

Determinar qué capacidades de soporte y diagnóstico tiene Panitas para atender a clientes reales antes del lanzamiento. Este documento es la fuente de verdad para el veredicto de readiness.

## 2. Mecanismos de soporte existentes (verificados en código y prod)

### 2.1 Mesa de soporte interno (admin-only)

| Capacidad | Estado | Evidencia |
|---|---|---|
| Modelo `SupportTicket` + `SupportMessage` en BD | ✅ Existe | prisma/schema.prisma:1014 |
| API admin lista tickets | ✅ GET `/api/admin/support/tickets` (50 más recientes) | src/app/api/admin/support/tickets/route.ts |
| API admin detalle ticket | ✅ GET `/api/admin/support/tickets/[id]` (incluye user + messages) | src/app/api/admin/support/tickets/[id]/route.ts |
| API admin responder ticket | ✅ PATCH `/api/admin/support/tickets/[id]/reply` | src/app/api/admin/support/tickets/[id]/reply/route.ts |
| UI admin `/admin/support` | ✅ Lista + detalle + responder | src/app/admin/(dashboard)/support/* |
| Acceso restringido a superadmin local | ✅ `getLocalSuperadmin()` | src/lib/local-only.ts |

### 2.2 Soporte para el cliente real

| Capacidad | Estado | Evidencia |
|---|---|---|
| API cliente para crear ticket | ❌ **NO EXISTE** | Único `supportTicket.create`/`findMany` está en rutas admin |
| API cliente para listar sus tickets | ❌ **NO EXISTE** | Ídem |
| Página de ayuda/FAQ en la app | ❌ **NO EXISTE** | Sin ruta `/help`/`/support` en `src/app` |
| Email de soporte al que escribir | ⚠️ No centralizado | Sin constante/función `support@`; solo emails transaccionales |
| Chat de soporte (agente IA) | ⚠️ Parcial | Agente IA del dashboard responde preguntas del negocio, no canal de soporte |

**Diagnóstico 1 — GAP ALTO**: un cliente real **no tiene ningún canal funcional para reportar problemas** dentro de la app. El modelo `SupportTicket` está implementado solo para el lado admin. Cualquier problema de un cliente requiere contacto externo (email/WhatsApp manual del operador), que Panitas no documenta.

## 3. Diagnóstico disponible para el operador de Panitas

| Capacidad | Estado | Evidencia |
|---|---|---|
| Consulta directa a BD de producción | ✅ Vía `vercel env run` + helper SQL | Documentado en FIRST_VALUE_FLOW (aislamiento multi-tenant verificado) |
| Migraciones versionadas | ✅ Prisma migrations | prisma/migrations/* |
| Logs de Vercel (deploy/runtime) | ✅ Plataforma | dpl_2TP7CoTuQeMXMw21ioWaMgeetJB9 (deploy develop-v2) |
| Monitoreo APM (Sentry) | ⚠️ No verificado en este audit | Fuera de alcance |
| Rate limit metrics | ⚠️ Solo en memoria | `register` 3/15min, `login` 5/1min, `upload-receipt` 5/30min; limpieza cada 10min |
| Backup de BD | ⚠️ Solo dev (Docker local) | Scripts `backup-db.js`; producción depende de Neon/Vercel (no verificado en audit) |

**Diagnóstico 2 — OBSERVACIÓN**: el diagnóstico del operador depende de acceso directo a BD y logs de Vercel. No hay un panel de diagnóstico dentro de la app (health checks, estado de jobs, auditoría de acciones) accesible por el equipo.

## 4. Eventos que un cliente real reportaría (mapeo a diagnóstico)

| Escenario del cliente | Cómo se diagnostica hoy | Canal de reporte del cliente |
|---|---|---|
| "La tienda no me carga / veo el placeholder" | `planStatus` en BD (Store) | ❌ Ninguno (debe contactar fuera de la app) |
| "Mi venta no aparece en el reporte" | `Order` + `OrderPayment` en BD; `reports/daily` (ver 11A-07) | ❌ Ninguno |
| "El agente IA me da datos incorrectos" | Chat log + tools del agente (11A-08/09) | ❌ Ninguno |
| "No recibí el email de confirmación" | Email logs (si existen) / BD | ❌ Ninguno |
| "El pago del crédito no se registró" | `Installment` + `OrderPayment` en BD | ❌ Ninguno |

## 5. Hallazgos de soporte (FASE 30)

| ID | Severidad | Hallazgo | Estado |
|---|---|---|---|
| 11A-13 | **HIGH** | Un cliente real no tiene canal de soporte funcional: `SupportTicket` solo tiene API admin, sin ruta cliente para crear/ver tickets, sin página de ayuda/FAQ | Documentado (pendiente de clasificar como BLOCKER en checklist final) |
| 11A-14 | OBSERVATION | Diagnóstico del operador es manual (BD + logs Vercel); sin health-check interno ni auditoría de acciones en la app | Documentado |

## 6. Recomendaciones para readiness

1. **Bloqueante de soporte**: exponer API cliente de tickets (create/list) + página de soporte en dashboard del cliente, reutilizando el modelo `SupportTicket` ya existente.
2. Documentar el email oficial de soporte y mostrarlo en la app (footer, dashboard, error pages).
3. (Post-lanzamiento) Añadir health-check endpoint `/api/health` y registro de auditoría de acciones admin.

## 7. Relación con otros documentos

- `FIRST_VALUE_FLOW.md` — flujo del primer valor y hallazgos 11A-01…12.
- `REAL_CUSTOMER_READINESS_CHECKLIST.md` — checklist final (11A-13/14 alimentan la categoría Soporte).
- `CUSTOMER_ONBOARDING_RUNBOOK.md` — procedimiento operativo del primer cliente real.
