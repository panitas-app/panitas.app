# PANITAS — Reglas de Desarrollo

> Normas obligatorias para todo el equipo durante la transición **Panitas 1.0 → 2.0**.
> Incumplir estas reglas puede romper producción o comprometer datos.

---

## 1. Flujo de trabajo

1. **No modificar producción directamente.** `main` está congelado; solo recibe merges de `release/*` o `hotfix/*` aprobados.
2. **Todos los cambios pasan por `develop-v2`.**
   - Trabajo puntual → rama `feature/<nombre>` desde `develop-v2`.
   - Al terminar → PR a `develop-v2` (build + lint verdes obligatorios).
3. **Nunca** hacer merge de `develop-v2` → `main` sin pasar por release y QA.
4. **Hotfixes urgentes**: se ramifican desde `main`, se validan, y se fusionan de vuelta a `develop-v2`.

## 2. Documentación

1. **Todo cambio relevante** actualiza `docs/CHANGELOG.md`.
2. **Cambios de arquitectura o decisiones clave** actualizan `docs/ARCHITECTURE.md`.
3. **Nuevas funcionalidades de agente/IA** se registran en `docs/PANITAS_ROADMAP.md`.
4. Los PRs deben describir qué se cambió, por qué, y cómo se validó.

## 3. Compatibilidad

1. **Panitas 1.0 sigue funcionando** durante toda la transición: no romper módulos existentes.
2. Toda función nueva de IA debe tener **fallback al comportamiento actual** si el proveedor falla o no hay crédito.
3. No renombrar columnas/modelos Prisma sin migración + script de datos.
4. El agente **nunca escribe en BD directamente**: solo vía servicios existentes con las mismas validaciones de servidor (precios desde BD, cupones, límites por plan, permisos).

## 4. Escalabilidad y calidad

1. **Leer antes que escribir**: el agente primero consulta; las acciones de escritura requieren confirmación y auditoría.
2. **Costo de IA controlado**: toda llamada a LLM debe tener límite (por usuario, por día, por plan) y registrarse.
3. Código TypeScript strict, sin `any` innecesarios, sin `console.log` en producción.
4. Ejecutar `npm run lint` y `npm run build` antes de cada push.
5. Preferir abstracciones reutilizables (`src/lib/agent/`, tool registry) sobre lógica duplicada.

## 5. Seguridad

1. **Prohibido subir secretos al repositorio** (tokens, claves API, `.env*`).
2. No commitear `dev.db`, `backups/`, `public/uploads/` ni archivos binarios grandes (usar LFS si es necesario).
3. Los archivos `.env` locales **nunca** se agregan a Git (`.env*` ya está en `.gitignore`).
4. No loguear valores sensibles (passwords, tokens, datos personales).
5. Cambios en auth/permisos/validación de pagos → revisión extra y documentación.

## 6. Base de datos

1. Solo se modifica el schema mediante **`npm run db:push`** (hace backup automático previo).
2. **Prohibido** `npx prisma migrate dev`, `migrate reset` o comandos destructivos (bloqueados por `scripts/safe-prisma.js`).
3. Respaldar antes de cualquier operación manual de datos.

## 7. Pruebas

1. No degradar los tests existentes (`tests/`).
2. Toda funcionalidad de agente nueva debe incluir prueba mínima de regresión.
3. El CI (cuando exista) debe ejecutar build + lint + tests en cada PR.

---

## Resumen rápido

```
main        ── congelado (producción)
develop-v2  ── TODOS los cambios
feature/*   ── trabajo por funcionalidad
release/*   ── freeze + QA + tag
hotfix/*    ── solo urgencias, se revierten a develop-v2

Antes de cada push:  npm run lint && npm run build
Nunca subir:        .env*, dev.db, secretos, uploads
DB:                 solo npm run db:push (con backup)
IA:                 costo controlado, lectura primero, escritura con confirmación y auditoría
```
