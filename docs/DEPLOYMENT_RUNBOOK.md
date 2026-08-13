# DEPLOYMENT_RUNBOOK.md — Despliegue, CI/CD y Rollback

**Fase 10A · Fases 44-55 · Fecha: 2026-08-13 · Branch: `develop-v2`**

Runbook de despliegue para producción. Complementa `CI_CD.md` (8F) y `PRODUCTION_ARCHITECTURE.md` (10A). Contiene el estado verificado a 10A y los procedimientos.

---

## 1. Entornos

| Entorno | Plataforma | Uso |
|---|---|---|
| **Production** | Vercel (dominio principal panitas.app) | Tráfico real de tenants |
| Preview/PR | Vercel Preview | Cada PR genera deploy de preview |
| Local/Dev | `npm run dev` + Docker Postgres | Desarrollo |

> **Staging**: no existe un entorno separado de staging (8F). El deploy a producción es el único entorno serverless. **Recomendación 10A**: crear `staging.` en Vercel apuntando a una BD Neon independiente (mismo esquema) para probar migraciones y smoke tests antes de tocar prod. Riesgo si se omite: migraciones/features se validan solo en preview (sin BD real completa) o directamente en prod.

## 2. CI/CD — pipeline verificado (FASE 48)

### ci.yml (primario — `develop-v2`, `main`)
- **jobs.ci**: `npm ci` → `prisma generate` → `typecheck` → `lint` → `tests` → `build` (Node 22, Ubuntu).
- **jobs.security**: `npm audit --omit=dev --audit-level=high || true` (informativo, no rompe build) + **gitleaks** (secret scan, gate real).

### verify.yml (LEGACY — hallazgo H-05)
- Duplica lint/typecheck/build con **Node 20 (EOL 2026)** y sin tests ni security.
- **Hallazgo H-05**: workflow redundante; duplica coste de CI y mantiene Node 20 fuera de soporte.
- **Recomendación**: eliminar `verify.yml` y conservar solo `ci.yml`, o actualizarlo a Node 22 con los mismos pasos. Decisión del equipo (cambia comportamiento de PRs); no se modificó en 10A por regla de estabilidad.

### Cobertura verificada
- ✅ Typecheck, lint, tests (1432), build, audit de deps (1 high: xlsx sin fix, documentado), gitleaks.
- ❌ No hay job de **migraciones** en CI (`prisma migrate diff --exit-code` para detectar drift del schema).
- ❌ No hay **smoke tests** post-deploy automatizados (FASE 56-61).
- ❌ No hay deploy automático documentado en los workflows (Vercel despliega por su integración).

## 3. Despliegue (Vercel)

### Procedimiento estándar (push a `main`)
1. Merge de `develop-v2` → `main`.
2. Vercel detecta el push y dispara build de producción (`npm run build`).
3. **Antes de cualquier migración de BD** se ejecuta el paso de §4.
4. Verificación post-deploy con el checklist de §6.

### Comandos locales de referencia
- `npm run build` → valida build completo (standalone en `.next/standalone`).
- `npm run typecheck`, `npm run lint`, `npm test` → gates locales pre-PR.

### Configuración requerida en Vercel (env)
- **65 variables** inventariadas en `ENVIRONMENT_MATRIX.md`. Mínimas críticas para `readiness`: `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_SECRET`, `CRON_SECRET` (falla 503 si faltan).
- 8 cron jobs en `vercel.json` (requieren `CRON_SECRET` como header `x-cron-secret`).

## 4. Migraciones de BD (FASE 51 — migration safety)

### Regla inviolable
- **Solo `prisma migrate deploy`** en producción. NUNCA `db push`, `migrate reset`, `prisma migrate dev` en prod (bloqueado por `scripts/safe-prisma.js`).
- El pipeline usa 5 migraciones (4 incrementales + baseline `20260811000000`). El deploy aplica solo las pendientes.

### Secuencia segura para deploy con migración
1. **Antes del push a `main`**: validar migración en local contra una copia del esquema (`prisma migrate dev` en dev, no prod).
2. **Pre-deploy**: ejecutar `npx prisma migrate deploy` contra producción **después** del backup validado (DATABASE_OPERATIONS §4).
3. **Ordering con Vercel**: Vercel no ejecuta migraciones automáticamente. Opciones:
   - **a)** Ejecutar `migrate deploy` manualmente justo antes del push a `main` (downtime mínimo; la app tolera el delta breve).
   - **b)** Si la migración es aditiva (recomendado), puede correr después del deploy (la nueva code convive con el schema).
4. **Zero downtime**: en Vercel el deploy es instantáneo (instancias nuevas); para cambios destructivos en BD, hacer primero el deploy de código (backward-compatible) y la migración en una segunda ventana.

### Migraciones destructivas
- Requieren aprobación previa y ejecución fuera de horario.
- Backup validado antes; rollback por restauración (§5).

## 5. Rollback (FASE 52)

### Aplicación (Vercel)
- **Instant Rollback**: en el dashboard de Vercel, seleccionar el deploy anterior y "Rollback". Sin rebuild.
- Tiempo: segundos. No afecta la BD.

### Base de datos
- Rollback de **datos**: restaurar desde el dump previo (`backups/backup-*.sql`) o PITR de Neon (DATABASE_OPERATIONS §4). Procedimiento de restore documentado (8F) — revalidar trimestralmente.
- Rollback de **schema**: las migraciones no se "revierte" automáticamente. Estrategias:
  1. Migración aditiva → el rollback de app basta (el schema nuevo convive).
  2. Migración destructiva → restaurar BD desde backup (ventana definida).
- **Regla 10A**: un rollback que depende de un backup no validado NO es un rollback. Mantener el último backup probado accesible.

### Detección de la necesidad de rollback
- `readiness` en 503 (DB o env crítico).
- Errores 5xx elevados post-deploy.
- Smoke tests de §6 fallidos.

## 6. Smoke tests post-deploy (FASE 56-61)

Ejecutar después de cada deploy a producción:

1. **Auth**: login con credenciales, registro nuevo, login Google.
2. **Tenant**: dashboard carga, datos de la tienda del tenant, logout/login mantiene sesión.
3. **Venta**: crear pedido → inventario descuenta → pago registrado → email de confirmación.
4. **Agenda**: crear cita → confirmación → recordatorio (cron).
5. **IA**: consulta al asistente con contexto del tenant; verificar que no cruza datos de otro tenant.
6. **Public API**: llamada con API key (webhook de prueba firmado).
7. **Health**: `GET /api/health/readiness` → 200; `liveness` → 200.
8. **Crons**: disparar manualmente `update-bcv` con `x-cron-secret` → 200 y tasa BCV actualizada.

> Los smoke tests manuales son el gate mínimo. Automatizar (Playwright + integración) es mejora post-launch recomendada.

## 7. Checklist pre-launch de deploy (FASE 77-79 enlazado)

- [ ] `npm run build` ✅ / typecheck ✅ / lint 0 errores / tests ✅ (verificado 2026-08-13, post bump de auth)
- [ ] `npm audit --omit=dev --audit-level=high` → 1 high (xlsx, sin fix) documentado
- [ ] Migraciones: 5 aplicables vía `migrate deploy`; baseline consolidada
- [ ] Backup reciente validado disponible
- [ ] `verify.yml` legacy eliminado o actualizado (H-05) — pendiente decisión
- [ ] Job de CI para drift de schema (`prisma migrate diff --exit-code`) — recomendado
- [ ] Staging creado (recomendado) o procedimiento de validación en preview aprobado
- [ ] Crons verificados (8 en vercel.json)
- [ ] Smoke tests §6 ejecutados y registrados
