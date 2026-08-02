# PANITAS — Auditoría y Limpieza de Ramas (BRANCH_CLEANUP)

> **Fase 1A** — Estado de ramas y recomendaciones.
> **No se eliminan ramas remotas sin confirmación explícita.**

---

## 1. Ramas existentes

### Locales
| Rama | HEAD | Último commit | Estado |
|---|---|---|---|
| `main` | `477b657` | scanner móvil | ✅ **Producción estable** (congelada) |
| `develop-v2` | `4e5197b` | security(phase-1a) | ✅ **Desarrollo activo Panitas 2.0** |
| `develop` | `9284fb3` | "chore: track MP4 with Git LFS" (13/07/2026) | ⚠️ **Obsoleta** |

### Remotas (`origin/`)
| Rama | Estado |
|---|---|
| `origin/main` | ✅ Sincronizada con local `main` |
| `origin/develop-v2` | 🟡 Atrás de local (falta push de FASE 1A) |
| `origin/develop` | ⚠️ **Obsoleta** (misma `9284fb3`) |

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

## 4. Riesgos asociados

- Si alguien tiene clones con `develop` en uso, el borrado remoto romperá su checkout → coordinar antes.
- Verificar que ningún pipeline/hook apunte a `develop` (no existe CI todavía).
- El tag `v1.0.0` (antiguo) y `v1.0-stable` no se ven afectados por la eliminación de ramas.

---

## 5. Decisiones

| # | Decisión | Estado |
|---|---|---|
| 1 | Eliminar `develop` local | ⏳ **Requiere confirmación** |
| 2 | Eliminar `origin/develop` | ⏳ **Requiere confirmación** |
| 3 | Mantener `main` congelada | ✅ Aprobado (regla FASE 1A) |
| 4 | `develop-v2` como única rama de integración | ✅ Aprobado |
