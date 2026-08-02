# PANITAS — Sistema de Tickets / Órdenes de Trabajo

> Fecha: 02/08/2026 · Rama: `develop-v2` · FASE 1D
> Módulo para negocios que venden **productos + servicios** (reparación celular, talleres, técnicos, mantenimiento).

---

## 1. Qué es un ticket de trabajo

Un **ticket (orden de trabajo)** registra un servicio que se le realiza a un cliente y que **consume materiales y mano de obra**. Permite a negocios mixtos (que venden productos Y prestan servicios) rastrear el ciclo completo: de que el cliente deja el equipo hasta que lo retira pagando.

**Ejemplos de negocio objetivo:**
- Reparación de celulares / laptops.
- Talleres mecánicos.
- Técnicos de aires acondicionados, refrigeración, electrodomésticos.
- Servicio técnico de mantenimiento.

---

## 2. Flujo del ticket

```
Cliente llega
      ↓
[1] Crear ticket
      Cliente (existente o nuevo)
      Servicio (qué se hace)
      Materiales usados (se descuentan del inventario)
      Costo / mano de obra
      Total
      ↓
[2] Estado: RECIBIDO
      ↓
[3] Estado: EN PROCESO
      ↓
[4] Estado: TERMINADO
      ↓
[5] Entrega + cobro → Estado: ENTREGADO
```

---

## 3. Estructura del ticket

### Datos de identificación
- Número de ticket (secuencial por negocio).
- Fecha de creación.
- Cliente (relación con CRM; se crea si no existe).

### Datos del servicio
- Tipo de servicio (reparación, mantenimiento, instalación).
- Descripción / diagnóstico.
- Técnico asignado.

### Materiales
- Líneas de material: producto + cantidad → **descuenta inventario**.
- Costo por material (costo real del producto).

### Mano de obra
- Monto de mano de obra (tarifa o libre).
- Horas si aplica.

### Totales
| Concepto | Cálculo |
|---|---|
| Costo materiales | Σ (materiales) |
| Mano de obra | monto/horas |
| **Total ticket** | materiales + mano de obra |

### Estados (esquema de ciclo)
| Estado | Significado |
|---|---|
| `recibido` | El cliente dejó el equipo / se abrió el ticket |
| `en_proceso` | Se está trabajando (diagnóstico y reparación) |
| `terminado` | Trabajo listo, pendiente de entrega/cobro |
| `entregado` | Entregado y cobrado → cierra el ticket |

### Datos opcionales (mejoras futuras)
- Fotos del estado del equipo.
- Garantía del trabajo.
- Notas internas.

---

## 4. Cómo convive con el POS

### Regla de convivencia
1. **El ticket gestiona el ciclo del servicio.** El POS gestiona el cobro y descuenta inventario en ventas de mostrador.
2. Cuando un ticket pasa a **ENTREGADO**, se genera la **venta en el POS** automáticamente (la orden une materiales + mano de obra) y queda como venta normal con su ticket asociado.
3. Los **materiales** se descuentan del inventario en el momento de cobro (no al recibir el equipo), para no tocar stock antes de que la venta se cierre.
4. En el **historial de ventas**, el ticket aparece como venta con referencia al número de ticket.
5. En el **reporte de ventas/ganancias**, los tickets ENTREGADOS cuentan como ventas (materiales + mano de obra).

### Flujo de cobro
```
Ticket TERMINADO
      ↓
"Cobrar ticket" → abre POS precargado
      materiales (del inventario)
    + mano de obra
      ↓
Venta registrada + stock descontado
      ↓
Ticket → ENTREGADO (vinculado a la venta)
```

### Diferencia con el POS de mostrador
| Aspecto | Venta POS directa | Ticket de trabajo |
|---|---|---|
| Origen | Cliente compra ya | Servicio pendiente |
| Inventario | Se descuenta al cobrar | Se descuenta al cobrar (materiales) |
| Ciclo | Cerrado al instante | Recibido → Proceso → Terminado → Entregado |
| Mano de obra | No aplica | Sí (costo del servicio) |
| Reportes | Cuenta como venta | Cuenta como venta al entregar |

---

## 5. Reportes del módulo

- Tickets por estado (recibidos / en proceso / terminados / entregados).
- Tickets pendientes de entrega (los que quedaron "terminados" sin cobrar).
- Mano de obra vs materiales (margen por ticket).
- Técnico con más trabajos terminados.
- Tiempo promedio de reparación (días entre recibido y entregado) — mejora futura.

---

## 6. Integración con eventos (infraestructura lista)

| Evento | Cuándo |
|---|---|
| `order.created` | Al cobrar un ticket en POS (entregado) |
| `sale.created` | Al registrar la venta del ticket |
| `inventory.low_stock` | Si un material usado deja stock bajo |
| `customer.created` | Si el cliente del ticket era nuevo |

---

## 7. Qué NO está en el MVP

- Facturación/impuestos por ticket.
- Fotos del equipo.
- Garantía con tracking.
- Multi-técnico con asignación compleja.
- Presupuesto previo (cotización) — se marca como mejora futura.
