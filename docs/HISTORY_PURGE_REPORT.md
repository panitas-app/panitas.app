# PANITAS — Reporte de Purga de Historial (HISTORY_PURGE_REPORT)

> **Fecha:** 02/08/2026
> **Herramienta:** `git filter-repo` 2.47.0 (instalado vía pip)
> **Alcance:** eliminar `.env.production` y `dev.db` de **todos** los commits y ramas del repositorio remoto.

---

## 1. Objetivo

El historial contenía secretos introducidos antes de la FASE 1A:

| Secreto | Commit de introducción (original) | Riesgo |
|---|---|---|
| `.env.production` (`VERCEL_OIDC_TOKEN`, `NEXTAUTH_URL`) | `8985eaa` | 🔴 Crítico |
| `dev.db` (SQLite de desarrollo) | `a746ab7` | 🔴 Alto |

La FASE 1A los sacó del tracking, pero **persistían en el historial de Git** (accesibles en cualquier clon). La purga los elimina definitivamente.

---

## 2. Procedimiento ejecutado

1. **Respaldo de seguridad** — bundle completo del repositorio (`git bundle create --all`). *(Eliminado al terminar: contenía los secretos).*
2. **Clon limpio** con `git clone --no-local` (evita el rechazo de `filter-repo` por hardlinks de clones locales).
3. **Reescritura del historial**:
   ```
   git filter-repo --path .env.production --path dev.db --invert-paths
   ```
   → 239 commits reescritos. Nuevos SHAs en todas las ramas y tags.
4. **Verificación post-purga** (pickaxe `git log -S`):
   - `.env.production` → 0 commits ✅
   - `dev.db` → 0 commits ✅
   - Token GitHub real (`ghp_syCr...`) → no existe en ningún commit ✅
   - Únicos restos: placeholders textuales `ghp_...` en documentación (inofensivos) y el nombre de variable `VERCEL_OIDC_TOKEN` (no es un secreto).
5. **Force-push** de todas las ramas y tags a `origin`.
6. **Sincronización del repositorio local** (working tree en `develop-v2`): fetch forzado, re-apuntado de ramas y tags, `reflog expire --expire=now --all` + `git gc --prune=now` para eliminar los objetos antiguos con secretos del disco local.

---

## 3. Nuevos SHAs (tras la reescritura)

| Ref | SHA original | SHA nuevo |
|---|---|---|
| `main` | `477b657` | `836792f` |
| `develop-v2` | `de9203a` | `22e8647` |
| `develop` | `9284fb3` | `e407e55` |
| `v1.0-stable` (tag anotado) | tag `798e19d` → `477b657` | tag `cb5fee0` → `836792f` |
| `v1.0.0` (tag ligero) | `5034eaa` | `a146a17` |

> ⚠️ Cualquier clon local anterior a esta purga tiene **historial incompatible**. Si alguien clonó antes del 02/08/2026, debe re-clonar o hacer `git fetch --force` + `git reset --hard` (y borrar el clon viejo: contiene los secretos).

---

## 4. Hallazgo adicional: ramas PostHog

Durante el `ls-remote` posterior a la purga aparecieron **2 ramas remotas no consideradas**:
- `posthog/instrumentation-3d96cc` (→ `f71f78b`) — PR #1
- `posthog/instrumentation-ef9de2` (→ `d4e51a5`) — PR #2

Eran ramas automáticas de la herramienta de instrumentación de PostHog ("feat: add PostHog analytics integration"), con historial **no reescrito** que aún contenía `dev.db`.

**Acción ejecutada** (con confirmación del dueño):
- `git push origin --delete posthog/instrumentation-3d96cc posthog/instrumentation-ef9de2`
- Cierre de los PRs #1 y #2 vía GitHub API (`PATCH /pulls/{n} {"state":"closed"}`).

**Residual:** GitHub conserva las refs `refs/pull/1/head` y `refs/pull/2/head` de los PRs cerrados. Solo soporte de GitHub puede eliminarlas por completo. El impacto es mínimo (requiere conocer la existencia de esos PRs y hacer un fetch explícito de `refs/pull/N/head`). **Acción opcional:** solicitar a GitHub Support la eliminación permanente de los PRs #1 y #2.

---

## 5. Estado final verificado

- ✅ Remoto: solo `main`, `develop-v2`, `develop` + tags `v1.0-stable` y `v1.0.0`.
- ✅ `ls-remote`: sin ramas `posthog/*`, sin refs `refs/pull/N/merge`.
- ✅ `.env.production` y `dev.db` siguen **en disco** (no trackeados), intactos.
- ✅ Working tree limpio en `develop-v2`.
- ✅ Objetos antiguos con secretos purgados del repositorio local (`git cat-file -t 477b657` → "not a valid object name").

---

## 6. Pendientes asociados (no bloqueantes)

| # | Ítem | Estado |
|---|---|---|
| 1 | Rotar `VERCEL_OIDC_TOKEN` y demás credenciales | ⏳ Manual (ver `SECURITY_ROTATION_CHECKLIST.md`) |
| 2 | Eliminar PRs #1/#2 por completo (GitHub Support) | ⏳ Opcional |
| 3 | Activar branch protection en `main` y `develop-v2` | ⏳ Opcional |
| 4 | Eliminar rama `develop` | ⏳ Manual |
