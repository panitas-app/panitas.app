# PANITAS — Runbooks Operativos (FASE 8F)

> *Última actualización: 11/08/2026.*
> Procedimientos **paso a paso** para operar Panitas en producción. Comandos
> probados en este repositorio (entorno local Docker `panitas-postgres`, puerto 5433).

---

## 1. Verificación rápida de salud

```bash
curl -s https://panitas.app/api/health/liveness    # esperado: {"status":"ok",...}
curl -s https://panitas.app/api/health/readiness   # esperado: 200 {"status":"ready",...}
```

- `503` con `database:false` → BD no alcanzable.
- `503` con `AUTH_SECRET:false`/`ADMIN_SECRET:false`/`CRON_SECRET:false` → falta
  una variable crítica en el entorno de Vercel.

Local (con el servidor de producción levantado):

```bash
npm run build
node node_modules/next/dist/bin/next start -p 3100
node scripts/load-test.mjs http://localhost:3100 4000 10,50
```

---

## 2. Deploy (staging → producción)

1. Verificar CI verde localmente:
   ```bash
   npm run lint && npm run typecheck && npm test && npm run build
   ```
2. Push a `develop-v2` → deploy automático a **staging** (proyecto Vercel de staging).
3. Validar en staging:
   - `curl <staging-url>/api/health/readiness` → `200`.
   - Probar una compra/inicio de sesión con datos de staging.
   - Revisar logs de función y crons.
4. Merge a `main` (vía `release/*`) → deploy a **producción**.
5. Post-deploy:
   - `curl https://panitas.app/api/health/readiness` → `200`.
   - Vercel → **Crons**: confirmar los 8 jobs con status correcto.
   - Prueba manual: `https://panitas.app/store/[slug]` de un negocio real.

### Variables de entorno por entorno
Definir en Vercel (Project Settings → Environment Variables) **por entorno**
(Production / Preview / Development). Nunca commitear `.env` con valores.

---

## 3. Cambios de schema (migraciones)

> Regla: en Neon **nunca** `db push`/`migrate dev`/`migrate reset`.

### En local (desarrollo)
```bash
# Editar prisma/schema.prisma y luego:
npm run prisma -- migrate dev --name nombre_migracion     # genera y aplica en local
```
Si `migrate dev` se bloquea por `safe-prisma.js`, usar el flujo alternativo:
1. `npm run db:push` (aplica a la BD local con backup automático).
2. Generar la migración sin aplicarla a prod:
   ```bash
   npx prisma migrate diff --from-schema prisma/schema.prisma \
     --to-empty --script
   ```
   (para emitir el SQL del cambio como nueva migración, usar
   `--from-migrations prisma/migrations --to-schema prisma/schema.prisma`).

### Validar desde cero (reproducibilidad)
```bash
# BD limpia local
docker exec panitas-postgres psql -U panitas_user -d postgres \
  -c "DROP DATABASE IF EXISTS panitas_ci;" -c "CREATE DATABASE panitas_ci;"
# deploy de TODAS las migraciones (incluida la baseline 8F) a una BD vacía:
$env:DATABASE_URL="postgresql://panitas_user:***@localhost:5433/panitas_ci?schema=public"
$env:SHADOW_DATABASE_URL="postgresql://panitas_user:***@localhost:5433/panitas_shadow?schema=public"
npx prisma migrate deploy
# Resultado esperado: 5 migraciones aplicadas, 106 tablas.
```

### En staging
```bash
npx prisma migrate deploy   # con DATABASE_URL de staging (BD recién creada)
```

### En producción (BD existente con schema previo)
El esquema existente en Neon se creó con `db push` y la **baseline 8F** ya refleja
el estado completo del schema. Para que Prisma no intente recrear tablas ya
existentes, marcar la baseline como aplicada **solo tras verificar paridad**:
1. Verificar que el schema de Neon coincide con `prisma/schema.prisma`
   (comparar tablas; referencia local: 106 tablas esperadas).
2. Si coincide:
   ```bash
   npx prisma migrate resolve --applied 20260811000000_baseline_to_current_schema
   ```
3. Si **no** coincide (faltan tablas), aplicar primero las tablas faltantes con el
   SQL de la baseline o `db push` puntual, y después resolver.
4. Confirmar `npx prisma migrate status` → "Database schema is up to date".

> Nota: `safe-prisma.js` bloquea `migrate resolve`; en un entorno controlado se
> desbloquea temporalmente comentando la línea correspondiente, **con backup previo**.

---

## 4. Backup y restore

### Backup manual (local/dev)
```bash
npm run db:backup          # pg_dump del contenedor → backups/backup-<ts>.sql
```
Backup programado diario (Windows): `scripts\install-scheduled-backup.bat` (como Admin).

### Backup en producción (Neon)
- **PITR nativo** de Neon (restauración a punto en el tiempo) — primera línea.
- Exportación periódica (cron externo o job de mantenimiento):
  ```bash
  pg_dump "$DATABASE_URL" --no-owner --no-privileges > backup-prod-<ts>.sql
  ```
  Guardar fuera de la cuenta (S3/GCS) con cifrado. Objetivo RPO ≤ 24 h, RTO ≤ 4 h.

### Restore (local/dev) — probado en 8F
`npm run db:restore [n]` lista y restaura un backup al contenedor local
(borra y recrea `public`). Para restaurar a una BD de **prueba** sin tocar la
principal:

```bash
docker exec panitas-postgres psql -U panitas_user -d postgres \
  -c "DROP DATABASE IF EXISTS panitas_restore_test;" \
  -c "CREATE DATABASE panitas_restore_test;"
Get-Content backups\backup-<ts>.sql -Raw |
  docker exec -i panitas-postgres psql -U panitas_user -d panitas_restore_test
# Verificar paridad:
docker exec panitas-postgres psql -U panitas_user -d panitas_restore_test -t \
  -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
```

### Restore en producción (solo si es necesario)
1. Restaurar primero en una BD de prueba y validar.
2. Abrir ventana de mantenimiento.
3. Restaurar sobre la BD de producción con el dump validado.
4. Verificar conteos críticos y readiness antes de reabrir tráfico.

---

## 5. Rotación de secrets

| Secret | Dónde se usa | Pasos |
|---|---|---|
| `AUTH_SECRET` / `NEXTAUTH_SECRET` | Sesiones Auth.js | Generar (`crypto.randomBytes(32).toString('hex')`), actualizar en Vercel, invalidar sesiones si hace falta |
| `CRON_SECRET` | Autorización de crons | Generar nuevo, actualizar en Vercel **y** en el dashboard de Crons (las llamadas llevan este valor como Bearer) |
| `SELLER_JWT_SECRET` | Tokens de vendedores | Generar nuevo → todos los vendedores vuelven a loguearse |
| `ADMIN_SECRET` | Panel admin | Generar nuevo; cookies `admin_token` expiran |
| `RESEND_API_KEY`, `CLOUDINARY_URL`, `TWILIO_*` | Emails/archivos/SMS | Regenerar en el panel del proveedor |
| `OPENROUTER_API_KEY`, `NVIDIA_NIM_API_KEY` | IA | Regenerar en el proveedor |
| WhatsApp/Meta | Webhooks + envío | Rotar tokens en Meta Developers y re-verificar `WHATSAPP_VERIFY_TOKEN`/`META_VERIFY_TOKEN` para que los webhooks sigan conectados |

Tras cualquier rotación: `curl /api/health/readiness` y prueba de un cron + un webhook.

---

## 6. Load test (smoke)

```bash
node scripts/load-test.mjs http://localhost:3100 4000 10,50,100
# umbrales del script: error <= 1% y p95 <= 1500 ms por endpoint
```
Referencia medida en 8F (servidor `next start`, local):
`liveness` 1500–1670 req/s, `readiness` 120–145 req/s, home ~1880 req/s, 0% error.

---

## 7. CI / verificación local

```bash
npm run lint          # ESLint (0 errores esperados)
npm run typecheck     # tsc --noEmit
npm test              # vitest run (1411 tests)
npm run build         # prisma generate && next build
```
El workflow `.github/workflows/ci.yml` ejecuta exactamente esto + `npm audit` +
gitleaks en cada push/PR a `develop-v2` y `main`.

---

## 8. Revisar y reprocesar webhooks/eventos

- Webhooks de la plataforma (8D): reintentos automáticos (máx 5, backoff) y
  dead-letter tras 10 fallos. Reintento manual desde la UI de Integraciones o
  directo a la tabla `WebhookDelivery`.
- Eventos en proceso (in-process bus): si un listener falla, aislado y registrado;
  el historial persiste en `EventHistory` (o memoria). Reproceso: re-disparar el
  evento vía la función `fireDomainEvent` correspondiente.

---

## 9. Apagado de servicios para mantenimiento

1. Vercel → Deployments → poner **pasarela de mantenimiento** (o `vercel rollback`).
2. Anunciar en status page.
3. Ejecutar el procedimiento (migración/restore/rotación).
4. Verificar readiness y reabrir tráfico.
5. Actualizar status page.
