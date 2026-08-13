# PANITAS — Flujo de CI/CD

> **Fase 1A (actualizado en 8F)** — Documentación del pipeline de verificación automática.

---

## 1. Workflow: `ci.yml`

**Archivo:** `.github/workflows/ci.yml` (creado en 8F; sustituye al `verify.yml`
documentado originalmente, que no llegó a existir).

Se ejecuta en:
- **Pull Requests** hacia `main` o `develop-v2`
- **Pushes** a `develop-v2` o `main`

### Jobs

| Job | Comando | Qué valida |
|---|---|---|
| `ci` | `npm ci` → `prisma generate` → `npm run typecheck` → `npm run lint` → `npm test` → `npm run build` | Tipos, ESLint, tests (vitest), build de producción completo |
| `security` | `npm audit --omit=dev` + gitleaks | Vulnerabilidades de dependencias y fugas de secrets |

`ci` ejecuta en orden (fail-fast): si falla typecheck, no llega a build.
Se recomienda `concurrency` para cancelar ejecuciones obsoletas del mismo PR.

### Variables de entorno del CI

El job `ci` usa valores **placeholder** (nunca secretos reales):

```yaml
DATABASE_URL: "postgresql://ci:ci@localhost:5432/ci?schema=public"
SELLER_JWT_SECRET: "ci-test-secret-clave-para-hmac"
```

> Las páginas SSG del proyecto (blog, landings) **no consultan la base de datos**
> en build, por lo que no se requiere una BD real. Si en el futuro una página
> prerenderizada requiere datos de BD, se deberá añadir un servicio PostgreSQL al workflow.

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

- [x] Añadir job de **tests** (`npm test`) — incluido en `ci.yml` (8F).
- [x] Añadir **scan de secretos** en CI (gitleaks) — incluido en `ci.yml` (8F).
- [ ] Añadir **GitHub branch protection** en `develop-v2` y `main`: requerir el job `ci` verde + 1 review.
- [ ] Añadir **lint para commits** (conventional commits) o validación del mensaje.
- [ ] Añadir tests **E2E** (Playwright) para el flujo de compra.
