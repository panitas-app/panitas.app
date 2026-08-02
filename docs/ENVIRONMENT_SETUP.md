# PANITAS — Configuración de Entorno (ENVIRONMENT_SETUP)

> **Fase 1A** — Documento de referencia para configurar Panitas desde cero.
> Reemplaza la documentación fragmentada de los múltiples `.env`.

---

## 1. Estructura recomendada de archivos

| Archivo | ¿Versionado? | Ambiente | Propósito |
|---|---|---|---|
| `.env.example` | ✅ Sí | Todos | Plantilla pública con TODAS las variables y comentarios |
| `.env.local` | ❌ No | Local | Desarrollo en tu máquina (overrides locales) |
| `.env.production` | ❌ No | Producción | Solo para despliegues (Vercel gestiona estas vars en su dashboard) |
| `.env` | ❌ No | — | **Evitar.** Next.js prioriza `.env.local`; la duplicación genera conflictos |
| `.env.prod`, `.env.vercel`, etc. | ❌ No | — | **Eliminar.** Restos de migraciones de entorno; causan confusión |

> ⚠️ **Regla:** existe **una sola fuente de verdad** por ambiente. Para producción, las variables se configuran en el **dashboard de Vercel** (Settings → Environment Variables), no en archivos locales.

---

## 2. Configuración desde cero (para un desarrollador nuevo)

### Requisitos previos
- Node.js 20+ y npm
- PostgreSQL local (Docker): `docker start panitas-pg` (o Neon si es producción)
- Cuentas en los servicios externos que vayas a usar (Google OAuth, Cloudinary, Resend, etc.)

### Pasos

```bash
# 1. Instalar dependencias
npm install

# 2. Crear tu entorno local a partir de la plantilla
cp .env.example .env.local

# 3. Completar .env.local con tus valores (ver sección 3)

# 4. Sincronizar schema de base de datos (hace backup automático)
npm run db:push

# 5. Crear superadmin
npm run admin -- --setup

# 6. Levantar el servidor
npm run dev   # http://localhost:3000
```

---

## 3. Referencia de variables

> **R = Requerida** | **O = Opcional** | **P = Pública** (se incrusta en el bundle cliente)

### Base de datos
| Variable | R/O | Ambiente | Propósito |
|---|---|---|---|
| `DATABASE_URL` | **R** | local + prod | Cadena de conexión principal de Prisma |
| `DIRECT_URL` | **R** | local + prod | Conexión directa (sin pooler) para migraciones |

### URLs
| Variable | R/O | Ambiente | Propósito |
|---|---|---|---|
| `NEXT_PUBLIC_BASE_URL` | **R** | P | Sitemap, SEO, JSON-LD |
| `NEXT_PUBLIC_APP_URL` | **R** | P | Enlaces canónicos de la aplicación |

### Autenticación (Auth.js v5)
| Variable | R/O | Ambiente | Propósito |
|---|---|---|---|
| `AUTH_SECRET` | **R** | local + prod | Firma de sesiones (primaria en v5) |
| `AUTH_URL` | **R** | local + prod | URL base de Auth.js |
| `AUTH_TRUST_HOST` | O | prod | Confía en el Host header (necesario en Vercel) |
| `NEXTAUTH_SECRET` | O | legacy | Alias legacy de `AUTH_SECRET` |
| `NEXTAUTH_URL` | O | legacy | Alias legacy de `AUTH_URL` |

> ⚠️ `AUTH_SECRET` y `NEXTAUTH_SECRET` deben tener **el mismo valor** si ambos se definen. En Auth.js v5, `AUTH_*` es la fuente primaria.

### Google OAuth
| Variable | R/O | Ambiente | Propósito |
|---|---|---|---|
| `GOOGLE_CLIENT_ID` | O | local + prod | Login con Google |
| `GOOGLE_CLIENT_SECRET` | O | local + prod | Login con Google (secreto) |

### Admin
| Variable | R/O | Ambiente | Propósito |
|---|---|---|---|
| `ADMIN_SECRET` | **R** | prod | Autenticación del panel `/admin` |
| `ADMIN_EMAIL` | O | prod | Email del superadmin inicial |

### Cron
| Variable | R/O | Ambiente | Propósito |
|---|---|---|---|
| `CRON_SECRET` | **R** | prod | Protege los endpoints `/api/cron/*` |

### Cloudinary
| Variable | R/O | Ambiente | Propósito |
|---|---|---|---|
| `CLOUDINARY_URL` | **R** | prod | Uploads de imágenes/videos |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | **R** | P | Nombre del cloud (público) |

### Email
| Variable | R/O | Ambiente | Propósito |
|---|---|---|---|
| `RESEND_API_KEY` | **R** | prod | Envío de correos transaccionales |

### SMS (Twilio)
| Variable | R/O | Ambiente | Propósito |
|---|---|---|---|
| `TWILIO_ACCOUNT_SID` | O | prod | Verificación por SMS |
| `TWILIO_API_KEY_SID` | O | prod | API key (SID) |
| `TWILIO_API_KEY_SECRET` | O | prod | API key (secreto) |
| `TWILIO_PHONE_NUMBER` | O | prod | Número emisor |

### Pusher (realtime)
| Variable | R/O | Ambiente | Propósito |
|---|---|---|---|
| `PUSHER_APP_ID` | **R** | prod | Sincronización realtime POS/escáner |
| `PUSHER_KEY` | **R** | prod | Clave pública de la app |
| `PUSHER_SECRET` | **R** | prod | Secreto del servidor |
| `PUSHER_CLUSTER` | **R** | prod | Cluster (ej. `us2`) |
| `NEXT_PUBLIC_PUSHER_KEY` | **R** | P | Clave pública para el cliente |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | **R** | P | Cluster para el cliente |

### Vendedores
| Variable | R/O | Ambiente | Propósito |
|---|---|---|---|
| `SELLER_JWT_SECRET` | **R** | prod | Firma de JWT del panel de vendedores |

### IA
| Variable | R/O | Ambiente | Propósito |
|---|---|---|---|
| `OPENROUTER_API_KEY` | O | prod | IA para importación de inventarios (Fase 1B ampliará su uso) |

### Analítica
| Variable | R/O | Ambiente | Propósito |
|---|---|---|---|
| `NEXT_PUBLIC_POSTHOG_HOST` | O | P | Host de PostHog |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | O | P | Token del proyecto (public_* seguro) |

### BCV (tasa de cambio)
| Variable | R/O | Ambiente | Propósito |
|---|---|---|---|
| `BCV_MONITOR_START_HOUR` | O | prod | Hora inicio del scheduler |
| `BCV_MONITOR_END_HOUR` | O | prod | Hora fin del scheduler |
| `BCV_QUERY_INTERVAL_HOURS` | O | prod | Intervalo de consulta |
| `BCV_TIMEZONE` | O | prod | Zona horaria (default `America/Caracas`) |

### Rate limiting (opcional)
| Variable | R/O | Ambiente | Propósito |
|---|---|---|---|
| `UPSTASH_REDIS_REST_URL` | O | prod | Rate limiting distribuido |
| `UPSTASH_REDIS_REST_TOKEN` | O | prod | Token de Upstash |

---

## 4. Variables por ambiente (resumen rápido)

### `.env.local` (desarrollo)
```ini
DATABASE_URL=...        # Docker local
DIRECT_URL=...
AUTH_SECRET=...         # mismo valor que NEXTAUTH_SECRET
AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
# Google OAuth, Cloudinary, etc. según lo que pruebes
```

### `.env.production` / Vercel (dashboard)
```ini
DATABASE_URL=...        # Neon
DIRECT_URL=...
AUTH_SECRET=...
AUTH_URL=https://panitas.app
AUTH_TRUST_HOST=true
NEXT_PUBLIC_BASE_URL=https://panitas.app
NEXT_PUBLIC_APP_URL=https://panitas.app
ADMIN_SECRET=...
ADMIN_EMAIL=...
CRON_SECRET=...
CLOUDINARY_URL=...
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...
RESEND_API_KEY=...
PUSHER_APP_ID=...  PUSHER_KEY=...  PUSHER_SECRET=...  PUSHER_CLUSTER=us2
NEXT_PUBLIC_PUSHER_KEY=...  NEXT_PUBLIC_PUSHER_CLUSTER=us2
SELLER_JWT_SECRET=...
OPENROUTER_API_KEY=...      # opcional
NEXT_PUBLIC_POSTHOG_HOST=...  NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=...   # opcional
```

---

## 5. Migración desde el esquema actual (7 archivos → 3)

| Actual (eliminar) | Reemplazo | Motivo |
|---|---|---|
| `.env` | `.env.local` | Next.js carga `.env.local` con mayor prioridad y claridad |
| `.env.prod` | Vercel dashboard | Export de Vercel obsoleto |
| `.env.production` (local) | Vercel dashboard | Los despliegues no leen este archivo local |
| `.env.vercel`, `.env.vercel-test` | Vercel dashboard | Restos de prueba |

> ⚠️ Antes de eliminar archivos, **respaldar los valores** en un gestor de secretos (Vercel ya los tiene para producción). Los archivos en disco no se borran en esta fase; solo se documenta la estructura objetivo.
