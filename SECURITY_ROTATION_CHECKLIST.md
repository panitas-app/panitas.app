# PANITAS — Checklist de Rotación de Credenciales

> **Fase 1A** — Documento operativo para el dueño del proyecto.
> Propósito: listar TODAS las credenciales que deben rotarse tras la auditoría de seguridad, con estado y acción.

---

## Por qué rotar

La auditoría (`SECURITY_AUDIT.md`) encontró secretos que **estuvieron o están en el historial de Git**:

- `VERCEL_OIDC_TOKEN` y `NEXTAUTH_URL` → commit `8985eaa`
- `dev.db` (datos de desarrollo) → commit `a746ab7`
- Token personal de GitHub embebido en la URL del remote (`.git/config`)

Cualquier clon del repositorio puede contener estos valores. **La única forma de anular el riesgo es rotar (revocar y regenerar) las credenciales.** La purga del historial (✅ ejecutada el 02/08/2026 — ver `docs/HISTORY_PURGE_REPORT.md`) eliminó los valores de futuros clones, pero la rotación sigue siendo la medida definitiva.

---

## Instrucciones

1. Procesa la tabla de arriba a abajo. Cada ítem debe quedar en **estado: ✅ ROTADO** o **📌 SIN ROTAR (motivo)**.
2. Después de cada rotación, **actualiza el archivo de entorno** correspondiente y el proveedor de secretos (Vercel dashboard).
3. Nunca compartas los valores nuevos en el repositorio.

---

## Tabla de rotación

| # | Servicio | Variable(s) | Motivo | Estado | Acción requerida |
|---|---|---|---|---|---|
| 1 | **GitHub (token remote)** | token `ghp_...` en `remote.origin.url` | Token personal con permisos push embebido en `.git/config` | ⏳ PENDIENTE | Revocar en GitHub → Settings → Developer settings → Tokens. Reconfigurar remote sin credenciales: `gh auth login` o `git remote set-url origin https://github.com/panitas-app/panitas.app.git` |
| 2 | **Vercel** | `VERCEL_OIDC_TOKEN` | Expuesto en `.env.production` (historial) | ⏳ PENDIENTE | Regenerar OIDC token en Vercel → Settings → Deploy Tokens. Actualizar en dashboard de Vercel, NO en archivos locales |
| 3 | **Auth (NextAuth/Auth.js)** | `AUTH_SECRET` / `NEXTAUTH_SECRET` | Posible exposición indirecta (mismo entorno que VERCEL_OIDC_TOKEN) | ⏳ RECOMENDADO | Generar nuevo secreto (`openssl rand -base64 32`). **Ojo:** invalidará sesiones activas de usuarios |
| 4 | **Google OAuth** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Posible exposición indirecta | ⏳ RECOMENDADO | Rotar secret en Google Cloud Console → APIs & Services → Credentials. Actualizar redirect URIs si cambió |
| 5 | **Cloudinary** | `CLOUDINARY_URL`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Posible exposición indirecta | ⏳ RECOMENDADO | Rotar API secret en Cloudinary dashboard. El cloud name público no es secreto |
| 6 | **Resend** | `RESEND_API_KEY` | Posible exposición indirecta | ⏳ RECOMENDADO | Regenerar API key en Resend. Nota: romperá colas de email en vuelo |
| 7 | **Twilio** | `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`, `TWILIO_PHONE_NUMBER` | Posible exposición indirecta | ⏳ RECOMENDADO | Rotar API key en Twilio Console. Verificar balance y números verificados |
| 8 | **OpenRouter** | `OPENROUTER_API_KEY` | Posible exposición indirecta | ⏳ RECOMENDADO | Regenerar key en OpenRouter. Revisar límites/costo acumulado |
| 9 | **PostHog** | `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST` | Token público por diseño (cliente), pero confirmar | 📌 NO CRÍTICO | Los tokens `public_*` de PostHog son seguros de exponer. Verificar que `NEXT_PUBLIC_*` no tengan permisos de escritura |
| 10 | **Base de datos** | `DATABASE_URL`, `DIRECT_URL` (Neon) | Posible exposición indirecta | 📌 VERIFICAR | Revisar Neon → project settings → connection string. Rotar si se usó en algún archivo expuesto |
| 11 | **Admin interno** | `ADMIN_SECRET` | Posible exposición indirecta | ⏳ RECOMENDADO | Regenerar en la app (dashboards admin usan este secreto para auth) |
| 12 | **Cron** | `CRON_SECRET` | Posible exposición indirecta | ⏳ RECOMENDADO | Regenerar y actualizar en Vercel cron headers |

---

## Orden recomendado de ejecución

```
1. GitHub token (crítico, desbloquea el remote)
2. VERCEL_OIDC_TOKEN (crítico, desbloquea deployments)
3. AUTH_SECRET / NEXTAUTH_SECRET (impacta sesiones — coordinar ventana de mantenimiento)
4. GOOGLE_CLIENT_SECRET
5. Servicios externos: Cloudinary, Resend, Twilio, OpenRouter
6. ADMIN_SECRET, CRON_SECRET
7. DATABASE_URL (solo si hubo exposición directa)
```

> ⚠️ **Regla:** después de cada rotación, actualizar `.env.local` y el dashboard de Vercel. **Nunca** agregar los valores nuevos a Git.
