# PANITAS 2.0 — Backlog de Desarrollo

> Fecha: 02/08/2026 · Rama: `develop-v2` · FASE 1D
> Clasificación del trabajo para construir **Panitas Negocios 2.0**.

---

## 1. Leyenda de prioridad

- 🔴 **Alta** — bloqueante para el MVP / valor central.
- 🟡 **Media** — mejora importante, post-MVP temprano.
- 🟢 **Baja** — mejora futura / nice-to-have.

---

## 2. MVP obligatorio

> Todo lo necesario para: registrar → importar/crear productos → vender (POS y tienda) → reportes básicos → agente consultivo. **Primera versión publicable.**

### 2.1 Fundamentos de producto
- [ ] 🔴 Migrar planes actuales a `negocios` / `negocios_plus` (mapear `planType`/`modalidad`, respetando `PLAN_LIMITS`).
- [ ] 🔴 Onboarding: registro → tipo de negocio → configuración → configuración inicial (4 opciones).
- [ ] 🔴 Importador de inventario Excel/CSV con mapeo y vista previa.
- [ ] 🔴 Dashboard "centro de control": saludo, 3 métricas, alertas, acción recomendada, accesos rápidos.
- [ ] 🟡 Tour guiado post-onboarding.

### 2.2 Gestión empresarial
- [ ] 🔴 Productos completos (categorías, variantes, código de barras, costo, precio, stock) — consolidar lo existente.
- [ ] 🔴 Alertas de stock bajo (evento `inventory.low_stock`) con umbral configurable.
- [ ] 🟡 Exportar catálogo CSV/Excel.
- [ ] 🟡 Badge "agotado" en tienda pública (stock 0).

### 2.3 POS
- [ ] 🔴 Flujo de venta rápido (1 producto en 3 clics).
- [ ] 🔴 Caja con apertura/cierre y arqueo.
- [ ] 🔴 Métodos de pago configurables.
- [ ] 🔴 Historial de ventas con detalle.
- [ ] 🟡 Ventas a crédito (días de crédito) + recordatorios de cobro.

### 2.4 CRM
- [ ] 🔴 Ficha de cliente (nombre, teléfono, documento, correo).
- [ ] 🔴 Historial de compras por cliente.
- [ ] 🟡 Segmentación básica (nuevos, recompra, inactivos).

### 2.5 Tienda online
- [ ] 🔴 Catálogo público con **SSR para SEO** (hoy es `"use client"` → no indexa).
- [ ] 🔴 Productos conectados al inventario (stock compartido).
- [ ] 🔴 Pedidos desde la tienda gestionados en Panitas.
- [ ] 🔴 Página 404 / error / loading para tienda pública.
- [ ] 🟡 Recuperación de carritos abandonados.
- [ ] 🟡 QR de tienda en dashboard y material imprimible.

### 2.6 Reportes (base)
- [ ] 🔴 Ventas (hoy/semana/mes/rango) — usar `SalesService`.
- [ ] 🔴 Productos vendidos (top/colas).
- [ ] 🔴 Ganancias (precio − costo).
- [ ] 🔴 Clientes (nuevos, recompra).
- [ ] 🟡 Exportar reportes a CSV/Excel (promesa actual del pricing).

### 2.7 Agente IA básico (NEGOCIOS)
- [ ] 🔴 Orquestador IA sobre la infraestructura FASE 1C (`listTools` + `executeTool` + `input_schema`).
- [ ] 🔴 Chat en dashboard: consultas de ventas, inventario, productos.
- [ ] 🔴 Confirmación de escrituras en 2 pasos (agente propone → dueño aprueba).
- [ ] 🔴 Auditoría de acciones del agente persistente (`agentAudit.enablePersistence`).
- [ ] 🔴 Límites de consumo IA por plan (medibles, no solo UI).
- [ ] 🟡 Resúmenes automáticos: ventas del día, stock bajo, citas de hoy.
- [ ] 🟡 Notificaciones proactivas (cron + eventos de dominio).

### 2.8 Tickets / órdenes de trabajo
- [ ] 🔴 Crear ticket (cliente → servicio → materiales → mano de obra → total).
- [ ] 🔴 Estados: recibido / en proceso / terminado / entregado.
- [ ] 🔴 Cobro del ticket → venta en POS (materiales descuentan inventario).
- [ ] 🟡 Reporte de tickets por estado y margen.

### 2.9 Calidad y seguridad (deuda heredada)
- [ ] 🔴 CSRF en APIs mutantes (pendiente del checklist maestro #15).
- [ ] 🔴 SSR para SEO en páginas públicas (#10).
- [ ] 🟡 Página 404, error boundaries, loading states (#12-14).
- [ ] 🟡 Confirmación destructiva en eliminaciones (#18).
- [ ] 🟡 Límites de tamaño de inputs y validación de contenido (#16-17).
- [ ] 🟡 Más tests automatizados (#30).

---

## 3. Mejoras futuras (post-MVP, base)

- 🟡 **Notificaciones por email** (#9): confirmación de pedido, recibo, alertas de suscripción.
- 🟡 **Pasarela de pago** para suscripciones (#8) — hoy manual (comprobante + admin).
- 🟡 **Ventas a crédito** con control de cartera y recordatorios.
- 🟡 **Historial de stock** con movimientos y motivo (reposición, venta, ajuste).
- 🟡 **Multi-tienda por usuario** (schema lo soporta, UI no — #31).
- 🟡 **Reportes avanzados**: márgenes por categoría, estacionalidad.
- 🟡 **Menú digital / QR mesas** (#32).
- 🟢 **PWA / instalable** (#26).
- 🟢 **Modo oscuro** (#19).
- 🟢 **Multi-idioma EN/ES** (#29).
- 🟢 **Dominio personalizado** (#22).
- 🟢 **Analytics / monitoreo** (#33).

---

## 4. Funciones PLUS (requieren NEGOCIOS PLUS)

- 🔴 **Centro de comunicación**: bandeja unificada WhatsApp + Instagram + Messenger.
- 🔴 **Sugerencias de respuesta IA** (copiloto, nunca automático).
- 🔴 **Detección de intención** del cliente (compra/precio/reclamo/seguimiento).
- 🔴 **Clientes interesados** (intención de compra sin conversión) + recomendación de seguimiento.
- 🟡 **Reportes comerciales PLUS**: conversaciones, seguimiento, conversión.
- 🟡 **Sugerencia de reabastecimiento** basada en ventas.
- 🟡 **Integración con APIs de mensajería** (WhatsApp Business API, Instagram/Messenger Graph).
- 🟢 **Responder desde Panitas** a más canales (Telegram, correo).

---

## 5. Dependencias y secuencia sugerida

```
1. Deuda técnica crítica (CSRF, SSR tienda)      ← precondición
2. Onboarding + planes nuevos                    ← entrada
3. Importador + productos                        ← catálogo
4. POS + venta + stock descontado                ← transacción
5. Reportes base                                 ← visibilidad
6. Tickets + cobro con POS                       ← servicios
7. Agente IA básico sobre FASE 1C                ← diferenciador
8. Centro de comunicación + copiloto PLUS        ← monetización
```

---

## 6. Estimación gruesa (para planificar, no compromiso)

| Bloque | Semanas (grueso) |
|---|---|
| Onboarding + planes | 2–3 |
| Importador + catálogo | 2–3 |
| POS + caja | 2–3 |
| Tienda SSR + pedidos | 3–4 |
| Reportes | 2 |
| Tickets | 2–3 |
| Agente IA básico | 4–6 |
| Centro comunicación + copiloto PLUS | 6–8 |
| **Total aproximado** | **23–32 semanas** (6–8 meses) |
