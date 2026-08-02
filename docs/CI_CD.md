# PANITAS — Flujo de CI/CD

> **Fase 1A** — Documentación del pipeline de verificación automática.

---

## 1. Workflow: `verify.yml`

**Archivo:** `.github/workflows/verify.yml`

Se ejecuta en:
- **Pull Requests** hacia `main` o `develop-v2`
- **Pushes** a `develop-v2` (rama de integración)

### Jobs

| Job | Comando | Qué valida |
|---|---|---|
| `lint` | `npm run lint` | Reglas de ESLint (Next.js) |
| `typecheck` | `npm run typecheck` (`tsc --noEmit`) | Tipos TypeScript estrictos |
| `build` | `npm run build` (`prisma generate && next build`) | Compilación de producción completa |

`build` depende de `lint` y `typecheck` (no compila si fallan). Se usa `concurrency` para cancelar ejecuciones obsoletas en el mismo PR.

### Variables de entorno del CI

El job `build` usa valores **placeholder** (nunca secretos reales):

```yaml
DATABASE_URL: "postgresql://dummy:dummy@localhost:5432/ci?schema=public"
DIRECT_URL: "postgresql://dummy:dummy@localhost:5432/ci?schema=public"
NEXTAUTH_SECRET: "ci-secret-placeholder"
```

> Las páginas SSG del proyecto (blog, landings) **no consultan la base de datos** en build, por lo que no se requiere una BD real. Si en el futuro una página prerenderizada requiere datos de BD, se deberá añadir un servicio PostgreSQL al workflow.

---

## 2. Flujo objetivo

```
feature/* ──PR──► develop-v2 ──(verify.yml: lint + typecheck + build)──► merge
                                        │
                                        ▼
                                 release/* (QA)
                                        │
                                        ▼
                                   main (producción) ──► Vercel (deploy)
```

- **Cada PR** a `develop-v2` pasa verificación automática → evita que código roto avance.
- **`main` solo recibe** merges de `release/*` validados; el CI protege esa puerta.
- Vercel se encarga del **deploy** (integrado con GitHub); el CI previo evita deploys rotos.

---

## 3. Comandos locales equivalentes

Ejecuta localmente lo mismo que el CI antes de abrir un PR:

```bash
npm run lint        # lint
npm run typecheck   # typecheck
npm run build       # build de producción
```

---

## 4. Próximos pasos (recomendados, fuera de FASE 1A)

- Añadir **GitHub branch protection** en `develop-v2` y `main`: requerir el job `build` verde + 1 review.
- Añadir job de **tests** cuando exista cobertura (`npm run test`).
- Añadir **lint para commits** (conventional commits) o validación del mensaje.
- Integrar **scan de secretos** en CI (gitleaks) para impedir nuevas fugas automáticamente.
