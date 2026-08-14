# DATABASE_BACKUP_STATUS.md — Estado del Backup de Producción

**FASE 10B.1 · 2026-08-13 · Branch: `develop-v2` · HEAD: `577c28c`**

## Veredicto

| Métrica | Estado |
|---|---|
| **Backup** | ✅ **PASS** |
| **Restore** | ✅ **PASS** (entorno de prueba local, NO productivo) |
| **Retention** | ⚠️ **NOT CONFIGURED** (manual, sin retención automática) |
| **Production database** | ✅ **PROTECTED** (backup manual verificado creado) |

## 1. Backup real de producción (Neon)

Se creó el primer backup de la BD de **producción (Neon)** descargado con las env reales de Vercel Production:

- **Archivo**: `backups/panitas-2026-08-14T03-54-32.dump` (426,114 bytes)
- **Metadata**: `backups/panitas-2026-08-14T03-54-32.dump.meta.json`
- **Host**: `ep-hidden-bar-aitroqdz.c-4.us-east-1.aws.neon.tech` (conexión directa, sin `-pooler`)
- **Database**: `neondb`
- **Formato**: custom (`pg_dump -Fc --no-owner --no-privileges`)
- **Herramienta**: `pg_dump` v18 (imagen `postgres:18-alpine` en Docker) — el server es **PostgreSQL 18.4**
- **Fecha**: 2026-08-14T03:54:32 (UTC)
- **Contenido**: 106 tablas con datos, 3 secuencias, 156 FK constraints

## 2. Restore de prueba (PASS)

El dump se restauró en un contenedor PostgreSQL 18 local (entorno **NO productivo**, `panitas-restore-test`) con `pg_restore --no-owner --no-privileges`:

- ✅ Restore exitoso (exit 0)
- ✅ 106 tablas creadas
- ✅ Conteos verificados (consistencia con los datos de prod):

| Tabla | Filas |
|---|---|
| User | 18 |
| Negocio | 17 |
| Store | 17 |
| Product | 299 |
| Order | 19 |
| OrderItem | 37 |
| OrderPayment | 19 |
| Installment | 10 |
| Customer | 3 |
| Account | 11 |

El contenedor de prueba fue eliminado después de la verificación.

## 3. Cómo se ejecutó

El backup usa las env reales de Vercel Production vía `vercel env run -e production` (no expone secretos):

```bash
vercel env run -e production -- node <script>
```

El script (`C:\Users\Usuario\AppData\Local\Temp\opencode\posthog-verify\backup-prod-db.js`, temporal):
1. Lee `DIRECT_URL`/`DATABASE_URL` de las env de producción
2. Deriva la conexión directa de Neon (quita el sufijo `-pooler`)
3. Probó conectividad con `pg_isready` (contenedor `postgres:18-alpine`)
4. Ejecuta `pg_dump -Fc --no-owner --no-privileges` escribiendo al volumen `backups/`
5. Escribe `.meta.json` y elimina el env-file temporal de credenciales

## 4. Scripts heredados (obsoletos para prod)

- `scripts/backup-db.js` / `scripts/restore-db.js`: apuntan a **Docker local** (`panitas-postgres`), NO a Neon → **no sirven para producción**. Siguen válidos solo para el entorno local de desarrollo.
- `scripts/install-scheduled-backup.bat`: backup diario local (Windows), no aplica a Neon/Vercel.

## 5. Retention — NO CONFIGURADO

⚠️ No existe retención automática de backups de Neon. Recomendación para FASE 10B.1 final:

- **Recomendado**: habilitar **Neon "Branching" automático** o usar `neonctl branches create` (time-travel de Neon) como capa de continuidad
- Backups manuales en `backups/` no están versionados ni fuera del repo
- Documentar una política de retención (p.ej. daily x N días) si se automatiza vía cron

## 6. Riesgos restantes

- Retention sin automatizar (⚠️)
- El backup manual no sustituye un mecanismo automático (cron de Vercel + Neon branch, o `neonctl`)
- `backups/` contiene muchos dumps locales antiguos de Docker (SQL) — candidatos a limpieza en otra fase
