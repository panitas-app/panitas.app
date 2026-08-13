# PRODUCTION_RUNBOOK.md — Operación de Producción

**Fase 10A · Fases 63-76 · Fecha: 2026-08-13 · Branch: `develop-v2`**

Runbook operativo de producción: monitoreo, alertas, privacidad, auditoría, config, reproducción, incidentes y DR. Complementa `RUNBOOKS.md` e `INCIDENT_RESPONSE.md` (8F) con el estado verificado a 10A.

---

## 1. Monitoreo y observabilidad (FASE 63)

### Verificado en código
| Capa | Mecanismo | Estado |
|---|---|---|
| Health | `GET /api/health/liveness` (200) + `readiness` (200/503 con checks DB + 4 env críticos) | ✅ |
| Eventos | Bus de eventos con middlewares `correlation`, `logger`, `dedupe`, `tenant-isolation` | ✅ |
| Auditoría | `AuditLog` (modelo) + `createAuditEntry` en **124 archivos** | ✅ |
| Analytics | PostHog (posthog-js front + posthog-node server) | ✅ |
| Errores | `console.error` en paths críticos; mensajes sanitizados al cliente (S-03 corregido) | ✅ |

### Brechas documentadas (no bloqueantes)
- Sin **request-id** global en respuestas HTTP (la correlación existe en el bus de eventos, no a nivel HTTP).
- Sin **alertas automatizadas** (no hay PagerDuty/notificación; Vercel tiene alertas de deploy/funciones nativas — configurar).
- Sin **métricas de negocio exportadas** (MRR, LTV, churn) a un dashboard externo; derivables de `AuditLog`/`StoreSubscription`.

## 2. Alertas recomendadas (FASE 63)

Definir al menos (proveedor: Vercel native + Slack/email; no implementado en repo):
1. `readiness` 503 > 5 min → DB o env crítico caído.
2. Error rate 5xx > umbral (verificar Vercel Functions) en rutas calientes.
3. Cron fallido (`update-bcv`, `expire-plans`) — logs de Vercel Crons.
4. Deploy a producción completado (Vercel nativo).
5. Restore de backup trimestral (recordatorio operativo).

## 3. Privacidad y borrado de datos (FASE 64-65)

- **Borrado de cuenta**: existe `POST /api/admin/users/[id]/delete` (solo admin). **No hay auto-borrado self-service** para el usuario final.
  - **Hallazgo P-01 (Medio)**: el derecho al olvido (RGPD/ARTICULO "erasure") no está disponible como self-service; además el borrado de `User` **cascadea todo el tenant** (D-06, DATABASE_OPERATIONS). Antes de exponer auto-borrado, definir política: confirmación, retención mínima de datos fiscales (órdenes/pagos), y backup previo.
- **Audit trail**: `AuditLog` captura `action`, `entity`, `userId`, `storeId`, `metadata`, `createdAt` (indexado). Buen coverage (124 usos).
- **Feature flags por plan**: `src/lib/features/` (catálogo + `hasFeature`/`requireFeature` server-side). Sin flags de operación (kill-switch) global — solo por plan. Si se requiere kill-switch global, es mejora post-launch.

## 4. Configuración y arranque (FASE 70-71)

- Env leído directo desde `process.env` (no hay esquema zod de validación en startup).
- **Validación de arranque**: `readiness` verifica en runtime 4 vars críticas (`DATABASE_URL`, `AUTH_SECRET`, `ADMIN_SECRET`, `CRON_SECRET`) → 503 si faltan. El resto de vars (61) NO tiene validación de presencia en arranque.
  - **Hallazgo C-01 (Bajo)**: un typo en una var no crítica (p.ej. `RESEND_API_KEY`) degrada en silencio (email mock, SMS mock). Para launch: revisar `ENVIRONMENT_MATRIX.md` y llenar todas las vars en Vercel.
- **Config de IA**: Model Router centralizado (`agent-core/config.ts`), proveedor/modelo por tarea editable por env. Modo free (NVIDIA NIM `:free`).

## 5. Reproducibilidad (FASE 72)

- `npm ci` (lockfile) — instalaciones reproducibles.
- Migraciones versionadas (5, baseline `20260811000000`).
- CI: Node 22 + Ubuntu; build determinista (Vercel).
- Datos: seed solo para dev (`prisma/seed.ts`); backups versionados por timestamp.

## 6. Incidentes (FASE 73-74)

Procedimiento (resumen — detalle en `INCIDENT_RESPONSE.md` 8F):
1. **Detectar**: readiness 503, 5xx, cron fallido, alerta de los §2.
2. **Triage**: ¿app, BD, proveedor (Meta/Resend/Twilio/Neon), crons?
3. **Mitigar**: rollback Vercel (instantáneo) o deploy de hotfix; restaurar BD solo si hay pérdida (backup validado).
4. **Comunicar**: mensajes internos calmados; no exponer detalles técnicos al usuario.
5. **Post-incidente**: entrada en `AuditLog`, revisión del playbook.

Severidades: **BLOCKER** (pérdida de datos, auth/authz roto, secretos expuestos) → congelar deploys; **HIGH** → resolver; **MEDIUM** → ventana programada.

## 7. DR — Recuperación ante desastres (FASE 75)

| Escenario | Recuperación | RPO/RTO |
|---|---|---|
| Pérdida de app (Vercel) | Redeploy del último commit `main` (instantáneo) | NOT DEFINED |
| Pérdida de BD | PITR Neon +/ restore de `backups/` (restore validado en 8F) | NOT DEFINED |
| Proveedor caído (Meta/Resend/Twilio) | Degradación controlada (mock/log + reintentos); no bloquea POS | automático |
| Compromiso de secretos | `SECURITY_ROTATION_CHECKLIST.md` (8F) — rotación de AUTH_SECRET/ADMIN_SECRET/CRON_SECRET y tokens de proveedor | inmediato |

**Pendiente 10A (documentado)**: RPO/RTO objetivo sin definir (D-07 en DATABASE_OPERATIONS). Definir y validar trimestralmente con un restore real.

## 8. Checklist operativo continuo

- [ ] Alerta de readiness (503) configurada en el proveedor de notificación
- [ ] RPO/RTO definidos y registro de restore trimestral
- [ ] Todas las vars de `ENVIRONMENT_MATRIX.md` presentes en Vercel (C-01)
- [ ] Política de borrado de cuenta (self-service + retención fiscal) definida (P-01)
- [ ] Rotación de secretos según `SECURITY_ROTATION_CHECKLIST.md`
- [ ] Crons monitoreados; logs revisados post-deploy
- [ ] Revisar plan de billing de todos los proveedores (PRODUCTION_COST_MODEL §2)
