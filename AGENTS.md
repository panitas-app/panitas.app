<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:panitas-checklist -->
# PANITAS — Checklist Maestro Completo

*Última actualización: 31/05/2026*
*Basado en análisis profundo del código fuente*

---

## ✅ Completados (Resueltos)

### 🔴 Seguridad y bloqueantes
- [x] **#1 Precios desde BD** — Al crear orden, servidor busca precio real del producto en BD, ignora precio del cliente. Server-side validation completo.
- [x] **#2 Admin auth segura** — Reemplazado `Host` header por `ADMIN_SECRET` env var + cookie `admin_token` httpOnly, sameSite lax, 24h.
- [x] **#3 Eliminar auto-superadmin** — Eliminado auto-promotion de `local-only.ts`. Requiere `npm run admin -- --setup` manual.
- [x] **#4 Validar cupón en servidor** — Servidor re-valida cupón (activo, fechas, maxUses, minPurchase) y calcula descuento al crear orden.
- [x] **#5 Limitar por plan** — `PLAN_LIMITS` verificado en creación de productos via API.
- [x] **#6 Rate limiting** — Implementado en register (3/15min), login (5/1min), upload-receipt (5/30min). Limpieza de memoria cada 10min.
- [x] **#7 DB producción** — Migrado de SQLite a PostgreSQL vía Docker (`postgres:16-alpine`). Schema con `provider = "postgresql"`, datos migrados.

### 🔶 Funcionalidades nuevas (hoy 31/05)
- [x] **AdminPaymentAccount** — Nuevo modelo en schema + API CRUD + página admin `/admin/payment-methods` con formulario completo.
- [x] **Página `/subscribe`** — Flujo de pago para usuarios logueados: seleccionan plan, método de pago, suben comprobante, envían solicitud.
- [x] **Pricing page actualizada** — CTAs redirigen a `/subscribe?plan=X&period=Y` si hay sesión, a `/register` si no.
- [x] **Nav "Dashboard" en pricing** — Muestra "Ir al Dashboard" si hay sesión, "Registrarse"/"Iniciar sesión" si no.
- [x] **Fix scrollbar tabs** — Utility `scrollbar-none` en globals.css aplicado a TabsList de configuración.
- [x] **Build exitoso** — TypeScript + Next.js build pasan sin errores.

### 🔷 Infraestructura
- [x] **Docker PostgreSQL** — Contenedor `panitas-pg` corriendo en puerto 5432.
- [x] **Schema completo** — 22 modelos en Prisma con todas las relaciones.
- [x] **Seguridad HTTP** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc. configurados en `next.config.ts`.
- [x] **Rate limiter optimizado** — Sin memory leaks (GC cada 10min).

---

## ❌ Pendientes por resolver

### 🔴 Alto — Funcionalidades críticas faltantes

| # | Item | Prioridad | Descripción |
|---|------|-----------|-------------|
| **#8** | Pasarela de pago suscripciones | 🔴 Alta | Stripe/PayPal/Epayco para cobro automático. Hoy es manual (comprobante + verificación admin) |
| **#9** | Notificaciones email | 🔴 Alta | Confirmación de pedido, recibo, alertas de suscripción. Sin esto el negocio no escala |
| **#10** | SSR para SEO | 🔴 Alta | Tienda pública `"use client"` — Google NO indexa. Toda página pública debe ser server component |
| **#11** | Exportar CSV/Excel | 🔴 Alta | Promocionado en pricing pero no existe. Dashboard de analytics promete exportación |

### 🔴 Alto — Seguridad faltante

| # | Item | Prioridad | Descripción |
|---|------|-----------|-------------|
| **#15** | CSRF en APIs | 🔴 Alta | Ninguna API tiene token CSRF. Todas las mutaciones son vulnerables |
| **#21** | Auditoría de acciones | 🔴 Alta | Sin log de quién hizo qué (admin activa suscripción, elimina producto, etc.) |

### 🟡 Medio — UX/UI

| # | Item | Prioridad | Descripción |
|---|------|-----------|-------------|
| **#12** | Página 404 personalizada | 🟡 Media | No existe `not-found.tsx` en todo el proyecto |
| **#13** | Error boundaries | 🟡 Media | No existe `error.tsx` en todo el proyecto — errores no capturados |
| **#14** | Loading states | 🟡 Media | No existe `loading.tsx` en todo el proyecto — solo spinners inline |
| **#18** | Confirmación destructiva | 🟡 Media | Eliminar productos/órdenes/suscripciones no pide confirmación |
| **#19** | Modo oscuro | 🟡 Media | `next-themes` instalado pero no implementado |
| **#20** | Badge "Agotado" | 🟡 Media | Productos con stock 0 no muestran badge en tienda pública |
| **#24** | Alertas inventario bajo | 🟡 Media | No hay notificación cuando stock < umbral |
| **#25** | Variantes de producto | 🟡 Media | `hasSizes`/`sizes` existe en schema pero no hay UI funcional |

### 🟡 Medio — Calidad/DevOps

| # | Item | Prioridad | Descripción |
|---|------|-----------|-------------|
| **#16** | Límites tamaño inputs | 🟡 Media | No hay límite de tamaño en request body de APIs |
| **#17** | Validar contenido archivos | 🟡 Media | Solo se valida MIME type (falseable), no contenido real |
| **#30** | Tests automatizados | 🟡 Media | Playwright instalado, 0 tests en todo el proyecto |

### 🟢 Bajo — Features adicionales

| # | Item | Prioridad | Descripción |
|---|------|-----------|-------------|
| **#22** | Dominio personalizado | 🟢 Baja | `domain` existe en schema Store, sin UI/lógica |
| **#23** | WhatsApp Business API | 🟢 Baja | Solo enlace directo, no API |
| **#26** | PWA / Instalable | 🟢 Baja | Service worker + manifest no existen |
| **#27** | Carritos abandonados | 🟢 Baja | No hay recuperación de carritos |
| **#28** | Código QR para tienda | 🟢 Baja | Componente `qr-modal.tsx` existe, no implementado en tienda pública |
| **#29** | Multi-idioma (EN/ES) | 🟢 Baja | Toda la UI en español solamente |
| **#31** | Multi-tienda por usuario | 🟢 Baja | Schema soporta, UI no |
| **#32** | Menú digital / QR mesas | 🟢 Baja | Feature no iniciada |
| **#33** | Analytics / monitoreo | 🟢 Baja | Solo dashboard básico, sin monitoreo |

---

## 📊 Resumen

| Categoría | Total | Hechos | Pendientes | % |
|-----------|-------|--------|------------|---|
| 🔴 Seguridad/bloqueantes | 7 | 7 | 0 | **100%** |
| 🔴 Funcionalidades críticas | 4 | 0 | 4 | **0%** |
| 🔴 Seguridad faltante | 2 | 0 | 2 | **0%** |
| 🟡 Medio (UX/UI) | 9 | 2 | 7 | **22%** |
| 🟡 Medio (Calidad) | 3 | 0 | 3 | **0%** |
| 🟢 Bajo (Features) | 8 | 0 | 8 | **0%** |
| **TOTAL** | **33** | **9** | **24** | **27%** |

---

## 📝 Notas de infraestructura

- **PostgreSQL** corre en Docker (`panitas-pg`) — `postgres:16-alpine`, puerto `5432`
- Para iniciar DB sin Docker Desktop: `docker start panitas-pg`
- Credenciales: `panitas / panitas123`, DB: `panitas`
- `.env` apunta a `localhost:5432` — cambiar para producción
- SQLite backup: línea comentada en `.env`
- Servidor corre en `http://localhost:3000` via `npm run dev` o `admin.bat`
- Google OAuth redirect URI: `http://localhost:3000/api/auth/callback/google`

---

## ⛑️ PROTECCIÓN DE DATOS — SISTEMA DE SEGURIDAD MULTICAPA

### 🚫 Capa 1: Prisma Safety Wrapper (BLOQUEO TOTAL)

Cualquier intento de ejecutar `prisma migrate dev`, `prisma migrate reset` o comandos destructivos es **BLOQUEADO AUTOMÁTICAMENTE** por `scripts/safe-prisma.js`.

El wrapper muestra un mensaje de error y termina el proceso. No se puede eludir a menos que se edite manualmente el script.

Se accede via:
- `npm run prisma -- <args>` — pasa por el wrapper de seguridad
- `npx prisma <args>` — pasa por el wrapper solo si `prisma.cmd` está en PATH
- **`npm run db:push`** — ÚNICA forma permitida de cambiar schema (hace backup automático antes)

### 📦 Capa 2: Backup automático diario

- **Cada vez que ejecutas `npm run dev`**, se hace un backup automático (máximo 1 vez por día)
- Los backups se guardan en `backups/backup-{fecha}.sql`
- Para instalar backup programado diario a las 4:00 AM:
  ```
  scripts\install-scheduled-backup.bat  (ejecutar como Administrador)
  ```

### 🛡️ Capa 3: Backup antes de cualquier cambio

- `npm run db:push` → backup automático + `prisma db push`
- `npm run build` → backup automático
- Todos los scripts seguros usan `scripts/backup-db.js` que hace pg_dump

### 📋 Capa 4: Comandos seguros (USA SOLO ESTOS)

| Comando | Qué hace | ¿Destruye datos? |
|---------|----------|-----------------|
| `npm run dev` | Inicia servidor + backup diario | ❌ No |
| `npm run db:push` | Aplica cambios de schema + backup previo | ❌ No (seguro) |
| `npm run db:backup` | Backup manual inmediato | ❌ No |
| `npm run db:restore` | Restaura desde backup | ⚠️ Sí, pero de backup |
| `npm run db:status` | Verifica conexión BD | ❌ No |
| `npm run prisma -- <cmd>` | Ejecuta prisma con protección | ❌ No (si cmd seguro) |

### 🔴 NUNCA USAR (BLOQUEADOS):

| Comando | Motivo |
|---------|--------|
| `npx prisma migrate dev` | BLOQUEADO — resetea BD si hay drift |
| `npx prisma migrate reset` | BLOQUEADO — borra todos los datos |
| `npm run dev:fast` | Solo si sabes lo que haces (sin backup) |

### 💾 Restaurar desde backup

```bash
npm run db:restore          # lista backups disponibles
npm run db:restore 2        # restaura el #2 de la lista
```

Los backups están en `backups/` — NUNCA los borres manualmente.

<!-- END:panitas-checklist -->
