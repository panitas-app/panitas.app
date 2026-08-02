# PANITAS — Auditoría de Seguridad (SECURITY_AUDIT)

> **Fase 1A** — Seguridad y saneamiento del repositorio.
> Fecha: **02/08/2026** — Rama: `develop-v2` — Base: `v1.0-stable`
>
> **IMPORTANTE:** este documento describe los hallazgos con **nivel de riesgo y acción requerida**, sin reproducir valores de secretos.

---

## Resumen ejecutivo

Se detectaron **2 secretos críticos** y **1 archivo de datos sensible** presentes en el repositorio y/o su historial. El código fuente versionado **no contiene** claves hardcodeadas (los únicos patrones encontrados fueron falsos positivos). Las migraciones SQL son seguras (nombres de columnas). La documentación reciente solo referencia prefijos (`ghp_...`), nunca valores.

**Acción inmediata requerida:** quitar del tracking los archivos sensibles, rotar los secretos expuestos y (con confirmación) purgar el historial.

---

## 1. Hallazgos

### 🔴 CRÍTICO — H-01: `.env.production` versionado

| Campo | Valor |
|---|---|
| **Archivo afectado** | `.env.production` (commit que lo introdujo: `8985eaa`) |
| **Tipo de secreto** | `VERCEL_OIDC_TOKEN` (token JWT de ~1288 caracteres) y `NEXTAUTH_URL` (URL de auth) |
| **Nivel de riesgo** | 🔴 **Crítico** |
| **Impacto** | `VERCEL_OIDC_TOKEN` es una credencial de OpenID Connect de Vercel. Quien tenga acceso al repositorio (o un clon) puede autenticarse contra la cuenta de Vercel y **tomar control de los deployments**. `NEXTAUTH_URL` es información de infraestructura. |
| **Exposición** | En el historial de `main` desde `8985eaa`. Persiste aunque se elimine el archivo, **hasta que se purgue el historial** o se rote el token. |
| **Acción recomendada** | 1) `git rm --cached .env.production` (✅ hecho en FASE 1A) → 2) **Rotar `VERCEL_OIDC_TOKEN`** (⏳ pendiente) → 3) Purgar historial (✅ ejecutado el 02/08/2026, ver `docs/HISTORY_PURGE_REPORT.md`) |

### 🔴 CRÍTICO — H-02: Token GitHub embebido en la URL del remote

| Campo | Valor |
|---|---|
| **Archivo afectado** | `.git/config` (configuración local, **no versionada**) |
| **Tipo de secreto** | Token personal de GitHub (`ghp_...`) con permisos de **push** al repositorio |
| **Nivel de riesgo** | 🔴 **Crítico** |
| **Impacto** | Cualquier persona con acceso a la máquina, un respaldo de `.git/`, o un log de comandos puede extraer el token y hacer **push no autorizado** o acceder a otros recursos del owner de GitHub. |
| **Exposición** | No está en el historial de Git, pero es un riesgo operativo permanente en disco. |
| **Acción recomendada** | 1) **Revocar el token** en GitHub → 2) Reconfigurar remote sin credenciales embebidas: `gh auth` o URL limpia `https://github.com/panitas-app/panitas.app.git` |

### 🔴 ALTO — H-03: Base de datos local `dev.db` versionada

| Campo | Valor |
|---|---|
| **Archivo afectado** | `dev.db` (SQLite, ~647 KB — commit que lo introdujo: `a746ab7`) |
| **Tipo de secreto** | Datos de desarrollo (usuarios, negocios, productos, órdenes) |
| **Nivel de riesgo** | 🔴 **Alto** |
| **Impacto** | Exposición de datos de desarrollo; aunque sea un entorno local, contiene PII y datos operativos. Además es un artefacto residual de la etapa SQLite (el sistema ya usa PostgreSQL). |
| **Exposición** | En el historial de `main` desde `a746ab7`. |
| **Acción recomendada** | 1) `git rm --cached dev.db` (✅ hecho en FASE 1A) → 2) añadir `*.db`/`*.sqlite` a `.gitignore` (✅ hecho) → 3) purgar historial (✅ ejecutado el 02/08/2026) |

### 🟠 MEDIO — H-04: Múltiples archivos `.env` con claves duplicadas

| Campo | Valor |
|---|---|
| **Archivos afectados** | `.env`, `.env.local`, `.env.prod`, `.env.production`, `.env.vercel`, `.env.vercel-test` |
| **Tipo de secreto** | Varias claves duplicadas con valores posiblemente distintos (`AUTH_SECRET` vs `NEXTAUTH_SECRET`, `DATABASE_URL`, etc.) |
| **Nivel de riesgo** | 🟠 **Medio** (operativo) |
| **Impacto** | Confusión entre ambientes, claves fuera de sincronía, riesgo de apuntar a la DB equivocada. |
| **Acción recomendada** | Unificar a 3 archivos: `.env.local`, `.env.production`, `.env.example` (ver `ENVIRONMENT_SETUP.md`). |

### 🟡 BAJO — H-05: Videos binarios grandes versionados

| Campo | Valor |
|---|---|
| **Archivos afectados** | `temp-sources/*.mp4` (16 archivos) y `temp-vp9/*.webm` (16 archivos) — **31,8 MB** |
| **Tipo de secreto** | No es secreto; es **bloat** del repositorio |
| **Nivel de riesgo** | 🟡 **Bajo** (higiene) |
| **Impacto** | Repositorio pesado, clones lentos, historial inflado. |
| **Acción recomendada** | Mover a Git LFS o servir desde Cloudinary; no bloquea la FASE 1A. |

---

## 2. Resultado de escaneos (limpios)

| Escaneo | Resultado |
|---|---|
| Claves hardcodeadas en `*.ts` / `*.tsx` | ✅ Limpio (solo referencias `process.env.*`, correcto) |
| Tokens tipo `ghp_`, `gho_`, `sk-`, `AKIA`, `AIza` en código | ✅ Limpio (falso positivo: `sk-position` es CSS) |
| Migraciones SQL | ✅ Limpio (`password`/`token` son nombres de columnas) |
| `.env.example` | ⚠️ **No versionado** → se agrega como plantilla pública en esta fase |
| Documentación (`.md`) | ✅ Limpio (solo prefijo `ghp_...` de referencia) |

---

## 3. Historial de Git — análisis de exposición

### Secretos introducidos en el historial

| Secreto | Commit de introducción | Rama afectada | ¿Sigue en HEAD? |
|---|---|---|---|
| `VERCEL_OIDC_TOKEN` + `NEXTAUTH_URL` | `8985eaa` | `main` (y derivadas) | Sí (archivo trackeado) |
| `dev.db` (datos) | `a746ab7` | `main` (y derivadas) | Sí (archivo trackeado) |

### Consecuencias

- Aunque quitemos los archivos del tracking (sección 4), **cualquier clon del repositorio** seguirá teniendo los valores en su historial.
- La **única** solución definitiva es **rotar los secretos** (invalida su uso) y **purgar el historial** con `git filter-repo` (elimina los valores de futuros clones).
- Un rewrite de historial **cambia todos los SHAs posteriores** a los commits afectados → requiere force-push y re-crear tags. **Ejecutado el 02/08/2026** (ver `docs/HISTORY_PURGE_REPORT.md`).

---

## 4. Acciones ejecutadas en esta fase (seguras, no destructivas)

| # | Acción | Comando | Estado |
|---|---|---|---|
| 1 | Quitar `.env.production` del tracking (mantener en disco) | `git rm --cached .env.production` | ✅ Ejecutado |
| 2 | Quitar `dev.db` del tracking (mantener en disco) | `git rm --cached dev.db` | ✅ Ejecutado |
| 3 | Actualizar `.gitignore` (`!.env.example`, `*.db`, `*.sqlite`) | edición `.gitignore` | ✅ Ejecutado |
| 4 | Agregar `.env.example` como plantilla pública | `git add .env.example` | ✅ Ejecutado |
| 5 | Commit en `develop-v2` | `git commit` | ✅ Ejecutado |

---

## 5. Acciones PENDIENTES (requieren confirmación o acción manual)

| # | Acción | Quién | Riesgo si no se hace |
|---|---|---|---|
| 1 | **Rotar `VERCEL_OIDC_TOKEN`** en Vercel | Dueño (manual) | Control de deployments por terceros |
| 2 | **Revocar token GitHub** del remote y configurar URL limpia | Dueño (manual) | Push no autorizado |
| 3 | ~~Purgar historial~~ | ✅ **Ejecutado 02/08/2026** (ver `docs/HISTORY_PURGE_REPORT.md`) | — |
| 4 | **Rotar credenciales potencialmente expuestas**: `AUTH_SECRET`/`NEXTAUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, `CLOUDINARY_URL`, `RESEND_API_KEY`, `TWILIO_*`, `OPENROUTER_API_KEY` | Dueño (ver checklist) | Uso indebido de servicios |

---

## 6. Conclusión

El repositorio tiene **2 vulnerabilidades críticas** (H-01, H-02) y **1 alta** (H-03). El código en sí es limpio. La FASE 1A corrigió la exposición presente (`git rm` + `.gitignore`) y el **historial fue purgado el 02/08/2026** (`docs/HISTORY_PURGE_REPORT.md`). Pendiente: la rotación de credenciales (medida definitiva) y los pasos opcionales de higiene.
