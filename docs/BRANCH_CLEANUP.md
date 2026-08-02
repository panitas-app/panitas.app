# PANITAS — Auditoría y Limpieza de Ramas (BRANCH_CLEANUP)

> **Fase 1A** — Estado de ramas y recomendaciones.
> **No se eliminan ramas remotas sin confirmación explícita.**

---

## 1. Ramas existentes

### Locales
| Rama | HEAD | Último commit | Estado |
|---|---|---|---|
| `main` | `836792f` | scanner móvil | ✅ **Producción estable** (congelada) |
| `develop-v2` | `22e8647` | docs(phase-1a) | ✅ **Desarrollo activo Panitas 2.0** |
| `develop` | `e407e55` | "chore: track MP4 with Git LFS" (13/07/2026) | ⚠️ **Obsoleta** |

> ⚠️ **Actualizado tras la purga de historial (02/08/2026):** todos los SHAs fueron reescritos (`git filter-repo`). Los SHAs de este documento corresponden a la historia reescrita (ver `HISTORY_PURGE_REPORT.md`).

### Remotas (`origin/`)
| Rama | Estado |
|---|---|
| `origin/main` | ✅ Sincronizada con local `main` |
| `origin/develop-v2` | ✅ Sincronizada (HEAD = `22e8647`) |
| `origin/develop` | ⚠️ **Obsoleta** (misma `e407e55`) |

---

## 2. Análisis de la rama `develop`

- **Diferencia con `main`:** `git rev-list --left-right --count main...develop` → `228  0`
  → `main` contiene **todos** los commits de `develop` + 228 adicionales. `develop` está **totalmente absorbida** por `main`.
- **Último commit:** 13/07/2026 (hace ~3 semanas al momento de la auditoría).
- **Riesgo si se conserva:** confusión (parece activa), merges accidentales hacia la rama equivocada, o trabajo nuevo basado en código obsoleto.

## 3. Recomendación

| Rama | Acción | Riesgo de eliminarla |
|---|---|---|
| `develop` (local + remota) | **Eliminar** | Mínimo: su contenido está 100% en `main` |

Comandos (cuando se confirme):
```bash
git branch -d develop                       # elimina la rama local
git push origin --delete develop            # elimina la rama remota
```

---

## 4. Ramas PostHog eliminadas (02/08/2026)

Durante la purga del historial se detectaron **2 ramas remotas** de instrumentación automática de PostHog con historial **no reescrito** (conservaban `dev.db`):

| Rama | PR | Acción |
|---|---|---|
| `posthog/instrumentation-3d96cc` | #1 | ✅ Eliminada + PR cerrado |
| `posthog/instrumentation-ef9de2` | #2 | ✅ Eliminada + PR cerrado |

> **Residual:** GitHub conserva `refs/pull/1/head` y `refs/pull/2/head` (PRs cerrados). Solo soporte de GitHub puede eliminarlos por completo (opcional).

---

## 5. Riesgos asociados

- Si alguien tiene clones con `develop` en uso, el borrado remoto romperá su checkout → coordinar antes.
- Verificar que ningún pipeline/hook apunte a `develop` (no existe CI todavía).
- El tag `v1.0.0` (antiguo) y `v1.0-stable` no se ven afectados por la eliminación de ramas.

---

## 6. Decisiones

| # | Decisión | Estado |
|---|---|---|
| 1 | Eliminar `develop` local | ⏳ **Requiere confirmación** |
| 2 | Eliminar `origin/develop` | ⏳ **Requiere confirmación** |
| 3 | Mantener `main` congelada | ✅ Aprobado (regla FASE 1A) |
| 4 | `develop-v2` como única rama de integración | ✅ Aprobado |
