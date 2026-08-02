# PANITAS — Estado Actual del Repositorio

> Documento generado el **02/08/2026** como parte de la preparación para la transición **Panitas 1.0 → Panitas 2.0**.
> Este snapshot describe el estado del sistema ANTES de cualquier trabajo de Panitas 2.0.

---

## 1. Identificación del proyecto

| Campo | Valor |
|---|---|
| **Nombre** | Panitas |
| **Versión en package.json** | `0.1.0` |
| **Etiqueta estable** | `v1.0-stable` (commit `477b657`) |
| **Rama principal** | `main` |
| **Rama de desarrollo** | `develop-v2` (creada en esta transición) |
| **Plataforma** | SaaS de gestión empresarial |
| **Módulos funcionales** | Inventario, POS, tienda virtual, agenda/reservas, clientes/CRM, ventas, reportes, suscripciones, vendedores, escáner |

---

## 2. Estructura del repositorio

```
panitas/
├── src/
│   ├── app/                    # Next.js App Router (rutas y páginas)
│   │   ├── api/                # 161 handlers de API (route.ts)
│   │   ├── dashboard/          # 20+ páginas del panel de gestión
│   │   ├── admin/              # Panel administrativo interno
│   │   ├── store/              # Tienda pública ([slug], booking, checkout)
│   │   ├── seller/             # Panel de vendedores
│   │   ├── scanner/            # Sesiones de escáner
│   │   ├── blog/               # Blog + SEO (SSG)
│   │   ├── software-*/         # 15+ landing pages verticales
│   │   └── (landing, auth)     # Landing principal + auth
│   ├── components/             # 125 componentes React
│   │   └── store/templates/    # 4 templates de tienda (modern, premium, delivery, express)
│   ├── lib/                    # Capa de lógica: prisma, auth, ai, bcv, email, twilio, pusher, csrf, rate-limit, etc.
│   ├── hooks/                  # Custom hooks
│   ├── styles/                 # Estilos globales
│   └── types/                  # Tipos compartidos
├── prisma/
│   ├── schema.prisma           # 71 modelos
│   ├── migrations/             # Migraciones SQL versionadas
│   ├── seed.ts / seed.sql
│   └── rls-policies.sql
├── public/                     # Estáticos, logos, imágenes
├── scripts/                    # Seguridad DB, backups, admin CLI
├── backups/                    # Backups automáticos de PostgreSQL
├── data/                       # Datos auxiliares (agencias Venezuela)
├── tests/                      # smoke.spec.ts (Playwright)
├── templates/                  # Plantillas de código
└── inventarios de prueba/      # Archivos de ejemplo para pruebas de import
```

---

## 3. Tecnologías utilizadas

### Frontend
- **Next.js 16.2.6** (App Router, Turbopack, build `output: standalone`)
- **React 19.2.4**
- **TypeScript 5** (strict mode activado)
- **Tailwind CSS 4** + PostCSS
- **shadcn/ui** + Base UI + `class-variance-authority`
- **Framer Motion 12**, GSAP, Lenis, Lottie (animaciones)
- **Lucide React** (iconografía)

### Backend / Datos
- **Next.js API Routes** — 161 handlers
- **Prisma 7.8.0** — ORM, 71 modelos
- **PostgreSQL** — producción vía **Neon** (`@prisma/adapter-neon`, `@neondatabase/serverless`) y local vía Docker (`@prisma/adapter-pg`)
- **Auth.js / next-auth 5 (beta)** con adapter Prisma + Google OAuth
- **bcryptjs** (hash de contraseñas)

### Servicios externos
| Servicio | Uso | Env var (referencia) |
|---|---|---|
| Cloudinary | Uploads de imágenes/videos | `CLOUDINARY_URL`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` |
| Resend | Correos transaccionales | `RESEND_API_KEY` |
| Twilio | SMS / verificación | `TWILIO_*` |
| Pusher | Realtime (POS/escáner) | variables de Pusher en `.env.local` |
| PostHog | Analítica de producto | `NEXT_PUBLIC_POSTHOG_*` |
| OpenRouter | IA (import de inventario) | `OPENROUTER_API_KEY` |
| Google OAuth | Autenticación | `GOOGLE_CLIENT_ID/SECRET` |
| BCV / dolarapi | Tasa de cambio | — |

---

## 4. Estado de Git

### Ramas
| Rama | Estado |
|---|---|
| `main` | ✅ Rama de producción. HEAD en `477b657`. Working tree limpio. |
| `develop` | ⚠️ **DESACTUALIZADA** — quedó 228 commits atrás de `main` (merge-base = su propio HEAD `9284fb3`). No usar. |
| `develop-v2` | 🆕 Creada en esta transición para Panitas 2.0. |
| `origin/main`, `origin/develop` | Remotas sincronizadas. |

### Tags
| Tag | Commit | Nota |
|---|---|---|
| `v1.0.0` | `5034eaa` | Tag antiguo, anterior al HEAD actual. |
| `v1.0-stable` | `477b657` | 🆕 **Punto de restauración oficial de Panitas 1.0 Stable.** |

### Historial reciente (main)
Trabajo enfocado en escáner de códigos de barras, diseño de tienda, importación Excel y precios. Últimos commits (desde `a1301b1`):
- `477b657` feat(scanner): escáner directo de cámara en Crear Producto y POS
- `b81502e` feat(store): banner sin gradiente, productos por categoría, QR logo nuevo
- `a1301b1` fix: import Excel extrae categorías desde columna mapeada
- `f085a10` fix: eliminar paginación en /dashboard/products

---

## 5. Dependencias

### Scripts principales (`package.json`)
| Script | Función |
|---|---|
| `npm run dev` | Dev server con backup automático de DB |
| `npm run build` | `prisma generate && next build` |
| `npm run lint` | ESLint |
| `npm run db:push` | Backup + `prisma db push` (única vía de cambio de schema) |
| `npm run db:backup` / `db:restore` | Backup/restauración PostgreSQL |
| `npm run admin -- --setup` | Crear superadmin |

### Seguridad de DB
Proyecto protegido con **wrapper `scripts/safe-prisma.js`**: bloquea `prisma migrate dev` / `migrate reset` / comandos destructivos. Solo `npm run db:push` (con backup previo) está permitido.

---

## 6. Configuración y variables de entorno

### Archivos `.env` presentes (7)
| Archivo | ¿Git-tracked? | Contenido |
|---|---|---|
| `.env` | ❌ | Runtime local (DB, auth, servicios) |
| `.env.example` | ✅ | Plantilla de variables documentadas |
| `.env.local` | ❌ | Overrides locales (PostHog, DB) |
| `.env.prod` | ❌ | Variables Vercel exportadas |
| `.env.production` | ⚠️ **SÍ (RIESGO)** | `NEXTAUTH_URL`, `VERCEL_OIDC_TOKEN` |
| `.env.vercel` | ❌ | — |
| `.env.vercel-test` | ❌ | — |

> ⚠️ **Hallazgo de seguridad:** `.env.production` está versionado en Git. Ver sección 8.

### Variables clave (nombres, sin valores)
`DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`/`NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID/SECRET`, `ADMIN_SECRET`, `CRON_SECRET`, `CLOUDINARY_URL`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `RESEND_API_KEY`, `TWILIO_*`, `OPENROUTER_API_KEY`, `NEXT_PUBLIC_POSTHOG_*`.

---

## 7. Módulos funcionales actuales

| Módulo | Estado | Descripción |
|---|---|---|
| **Inventario** | ✅ | Productos, categorías, presentaciones, stock, importación Excel + IA, escáner |
| **POS** | ✅ | Punto de venta, caja registradora, escáner, generación de QR |
| **Tienda virtual** | ✅ | 4 templates públicos, carrito, checkout con comprobante, cupones, QR de tienda |
| **Agenda/Reservas** | ✅ | Agendas, servicios, horarios, bloques, citas, recordatorios |
| **Clientes/CRM** | ✅ | Customers, tags, notas, follow-ups, automatizaciones |
| **Ventas** | ✅ | Órdenes, pagos, cuotas, comisiones, vendedores |
| **Reportes** | ✅ | Analytics, finanzas, breakeven, cierres, daily |
| **Suscripciones/Planes** | ✅ | Planes, suscripciones, expiración, pagos manuales (comprobante) |
| **Admin interno** | ✅ | Users, stores, prospects (ventas), soporte, auditoría, BCV |
| **IA (parcial)** | 🟡 | Solo `parseInventoryWithAI()` en `src/lib/ai.ts` (OpenRouter, modelo free) para importar inventario |

### Métricas del código
- 161 API route handlers
- 109 archivos `page.tsx` (~210 rutas generadas en build)
- 71 modelos Prisma
- 125 componentes React
- 4 templates de tienda pública
- 7 cron jobs en `vercel.json`

---

## 8. Riesgos encontrados

| # | Severidad | Riesgo | Detalle |
|---|---|---|---|
| 1 | 🔴 **Crítico** | **Secretos en Git** | `.env.production` está versionado (`VERCEL_OIDC_TOKEN`, `NEXTAUTH_URL`). Requiere rotación + purga de historial. |
| 2 | 🔴 **Crítico** | **Token en remote URL** | La URL del remote `origin` contiene un **token personal de GitHub embebido** (`https://ghp_...@github.com/...`). Cualquiera con acceso al repo puede extraerlo. |
| 3 | 🔴 **Alto** | **`dev.db` versionado** | Archivo SQLite (`dev.db`, 647 KB) está en Git. No debería existir en un proyecto PostgreSQL. |
| 4 | 🟠 **Medio** | **Rama `develop` obsoleta** | 228 commits detrás de `main`. Riesgo de merges erróneos si se reutiliza por error. |
| 5 | 🟠 **Medio** | **Sin CI/CD** | No existe `.github/`. No hay verificación automática de build/lint/tests antes de desplegar. |
| 6 | 🟠 **Medio** | **Entorno fragmentado** | 7 archivos `.env` con claves duplicadas/conflictivas (`AUTH_SECRET` vs `NEXTAUTH_SECRET`, etc.). |
| 7 | 🟠 **Medio** | **Tests inexistentes** | Playwright instalado pero solo 1 smoke test. Cobertura ~0%. Riesgo alto para refactors de Panitas 2.0. |
| 8 | 🟡 **Bajo** | **README por defecto** | README.md sigue siendo el de `create-next-app`; no documenta el proyecto real. |
| 9 | 🟡 **Bajo** | **Tag `v1.0.0` desactualizado** | No coincide con el HEAD actual; puede confundir sobre cuál es la versión estable. |

---

## 9. Notas de infraestructura

- **Producción**: Vercel (`vercel.json` con 7 cron jobs, output standalone, CSP/HSTS configurado en `next.config.ts`).
- **Base de datos**: PostgreSQL en Neon (producción) + PostgreSQL Docker `panitas-pg` (local, puerto 5432). SQLite solo como reliquia (`dev.db`).
- **Backups**: automáticos en `backups/` vía `npm run dev` y antes de `db:push`/`build`.
- **LFS**: `git lfs` instalado (v3.7.1), mencionado en historial de `develop`, pero **sin reglas LFS en `.gitattributes`**.

---

## 10. Conclusión

Panitas 1.0 es un SaaS **funcional y en producción** con arquitectura monolítica Next.js (App Router) + PostgreSQL, bien protegido a nivel de operación de BD. La base para construir el asistente IA de Panitas 2.0 está madura, pero **deben resolverse los riesgos 1–3 (seguridad) antes de la FASE 1**.

- ✅ Punto de restauración: `v1.0-stable` → `477b657`
- ✅ Rama de desarrollo: `develop-v2`
- 🔴 Pendiente crítico: limpieza de secretos, CI/CD, y estrategia de pruebas.
