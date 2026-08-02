# PANITAS — Changelog

> Registro cronológico de versiones y cambios significativos.
> Formato inspirado en [Keep a Changelog](https://keepachangelog.com/). Semver: `MAJOR.MINOR.PATCH`.
> Convención de commits: `feat(scope)`, `fix(scope)`, `security(scope)`, `chore(scope)`, `refactor(scope)`, `docs(scope)`.

---

## [1.0-stable] — 2026-08-02

**Panitas 1.0 Stable.** Punto de restauración oficial (tag `v1.0-stable`, commit `477b657`) antes de la transición a Panitas 2.0.

### Módulos activos
- Inventario (productos, categorías, presentaciones, stock, import Excel + IA, escáner de códigos de barras)
- POS (punto de venta, caja registradora, escáner, QR)
- Tienda virtual (4 templates públicos, carrito, checkout con comprobante, cupones, QR)
- Agenda y reservas (agendas, servicios, horarios, citas, recordatorios)
- Clientes / CRM (tags, notas, follow-ups, automatizaciones)
- Ventas (órdenes, pagos, cuotas, comisiones, vendedores)
- Reportes (analytics, finanzas, breakeven, cierres)
- Suscripciones y planes
- Panel admin interno (usuarios, stores, prospects, soporte, auditoría)

### Correcciones recientes (previas al corte)
- `fix`: escáner directo de cámara en Crear Producto y POS (commit `477b657`)
- `feat(store)`: banner sin gradiente, productos por categoría Z-A, QR con logo nuevo (`b81502e`)
- `fix`: import Excel extrae categorías desde columna mapeada (`a1301b1`)
- `fix`: eliminar paginación en `/dashboard/products` (`f085a10`)

### Infraestructura
- PostgreSQL (Neon en producción, Docker local) vía Prisma 7
- Deploy en Vercel (standalone) con 7 cron jobs
- Seguridad HTTP (CSP, HSTS) y protección de BD (`safe-prisma`, backups)

---

## [Unreleased] — Panitas 2.0 (rama `develop-v2`)

### Documentación y fundaciones (2026-08-02)
- Añadidos `PANITAS_CURRENT_STATE.md`, `DEVELOPMENT_RULES.md` y documentación en `/docs`
- Creada rama `develop-v2` para el desarrollo de Panitas 2.0

### Próximos hitos (ver `docs/PANITAS_ROADMAP.md`)
- Fase 1: Fundaciones de IA (capa de agente, tool registry, sandbox de lectura)
- Fase 2: Asistente conversacional
- Fase 3: Automatización inteligente
- Fase 4: Escalamiento y producto

---

## Historial previo (resumen)

> Registro informal reconstruido desde `git log` de la rama `main`.

### Julio 2026
- Escáner: arquitectura de state machine, soporte móvil, zoom hardware, QR en POS
- Store: QR modal con logo, templates de tienda
- Import Excel: parsing robusto con categorías

### Junio 2026
- Migración a PostgreSQL (Docker + Neon), schema con 71 modelos
- Pagos de suscripción, pricing 14.99/19.99/49.99
- Módulos de CRM, agenda, vendedores, prospectos (admin)
- Página `/subscribe`, métodos de pago admin

### Antes (legado)
- SQLite → migración a PostgreSQL
- Seguridad: auth admin, rate limiting, CSRF, validación de precios/cupones en servidor
