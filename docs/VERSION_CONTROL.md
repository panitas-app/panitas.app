# PANITAS — Version Control (Control de Versiones)

> Política de control de versiones y flujo de ramas para Panitas 1.0 → 2.0.

---

## 1. Estrategia de ramas

### Modelo (Git Flow simplificado)

| Rama | Propósito | Origen | Destino |
|---|---|---|---|
| `main` | **Producción estable.** Solo se recibe por merge desde `release/*` o hotfix validado. | — | — |
| `develop-v2` | **Integración de Panitas 2.0.** Todo el trabajo de desarrollo. | `v1.0-stable` | `main` (en release) |
| `feature/*` | Funcionalidades puntuales (`feature/agente-chat`, `feature/tool-registry`). | `develop-v2` | `develop-v2` |
| `release/*` | Preparación de versión (freeze, QA, versionado). | `develop-v2` | `main` |
| `hotfix/*` | Correcciones urgentes de producción. | `main` | `main` y `develop-v2` |

### Reglas
1. **Nunca** se commitea directamente a `main` (excepto merges de release/hotfix aprobados).
2. Todo cambio de código pasa por `develop-v2`.
3. Cada `feature/*` sale de `develop-v2` y vuelve a `develop-v2`.
4. Los hotfixes se aplican en `main` y **se fusionan de vuelta** a `develop-v2` para no perder la corrección.
5. La rama `develop` antigua (obsoleta) **no se usa** y debe eliminarse eventualmente.

---

## 2. Versionado semántico

Formato: **`vX.Y.Z`**

| Componente | Regla |
|---|---|
| `X` (MAJOR) | Cambios incompatibles o grandes productos (ej. `v2.0.0` = Panitas 2.0) |
| `Y` (MINOR) | Nuevas funcionalidades compatibles (ej. `v2.1.0` = asistente chat) |
| `Z` (PATCH) | Correcciones de errores compatibles (ej. `v2.1.1`) |

### Etiquetas (tags)

| Tag | Significado |
|---|---|
| `v1.0-stable` | ✅ Restauración oficial de Panitas 1.0 (punto de partida) |
| `v1.0.0` | Tag histórico (anterior al HEAD actual) |
| `v2.0.0` | 🎯 Próxima versión mayor (Panitas 2.0) |

### Cómo crear un release

```bash
git switch develop-v2
git checkout -b release/v2.0.0
# freeze: QA, ajustes, bump de versión en package.json
git tag -a v2.0.0 -m "Panitas 2.0"
git switch main
git merge release/v2.0.0 --no-ff
git push origin main --tags
git switch develop-v2
git merge release/v2.0.0 --no-ff   # devuelve cambios a develop
git branch -d release/v2.0.0
```

---

## 3. Convención de commits

`tipo(scope): descripción en minúsculas (imperativo, sin punto final)`

| Tipo | Uso |
|---|---|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `security` | Corrección/mejora de seguridad |
| `refactor` | Cambio de estructura sin cambio de comportamiento |
| `docs` | Documentación |
| `chore` | Tareas de mantenimiento (deps, config) |
| `perf` | Optimización de rendimiento |
| `test` | Pruebas |

Ejemplos:
- `feat(agent): crear motor de orquestación del agente`
- `fix(store): corregir cálculo de envío en checkout`
- `security(env): purgar secretos del historial`

---

## 4. Punto de restauración

El tag **`v1.0-stable`** apunta a `477b657` y representa el estado funcional completo de Panitas 1.0.

**Cómo restaurar si algo sale mal:**

```bash
# Volver a la base 1.0 en una rama nueva
git switch -c restore-1.0 v1.0-stable

# O forzar la rama develop-v2 al punto base (¡con cuidado!)
git branch -f develop-v2 v1.0-stable
```

**Backups de base de datos:** `npm run db:restore` (listado en `backups/`).

---

## 5. Buenas prácticas

- Commits pequeños y atómicos (una idea = un commit).
- No subir secretos nunca (ver `DEVELOPMENT_RULES.md`, sección Seguridad).
- Actualizar `docs/CHANGELOG.md` en cada cambio relevante.
- Ejecutar `npm run build` y `npm run lint` antes de cada push.
- Marcar los releases con tag **anotado** (`git tag -a`) para conservar autor/fecha/mensaje.
