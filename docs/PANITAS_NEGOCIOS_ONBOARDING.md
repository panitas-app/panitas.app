# PANITAS NEGOCIOS — Sistema de Onboarding

> Fecha: 02/08/2026 · Rama: `develop-v2` · FASE 1D
> Experiencia desde el registro hasta la primera venta.

---

## 1. Objetivo

Que un usuario nuevo llegue a su **primer producto creado** y su **primera venta (o pedido de prueba)** en la **primera sesión**. El onboarding debe durar menos de 10 minutos y sentirse como "le estoy enseñando a Panitas mi negocio", no como "llenar un ERP".

---

## 2. Flujo completo

```
Usuario entra
      ↓
[1] Registro (email/cuenta)
      ↓
[2] Selección de tipo de negocio
      "Tengo un negocio que vende productos"   ← (foco Panitas Negocios)
      ↓
[3] Configuración del negocio
      nombre · categoría · moneda · país · cantidad de productos · método de venta actual
      ↓
[4] Configuración inicial (el usuario elige)
      ☐ importar inventario (Excel/CSV)
      ☐ crear productos
      ☐ crear tienda online
      ☐ configurar POS
      ↓
[5] Primer producto (creado o importado)
      ↓
[6] Primer paso de venta (demo/real)
      ↓
[7] Dashboard activo + agente IA conociendo el negocio
```

---

## 3. Detalle de cada paso

### 3.1 Registro
- Email + contraseña (o Google OAuth, ya existente).
- Sin tarjeta para probar (acceso al plan NEGOCIOS; el PLUS requiere upgrade posterior).

### 3.2 Tipo de negocio
- Opciones: **"Tengo un negocio que vende productos"** (foco), "Vendo servicios", "Tienda digital".
- La selección configura los módulos visibles. Panitas Negocios 2.0 arranca con el foco productos.

### 3.3 Configuración del negocio
Formulario mínimo (guardado en `Store` + `Negocio`):

| Campo | Por qué | Fuente de datos |
|---|---|---|
| Nombre del negocio | Identidad, tienda, tickets | `Store.name` / `Negocio.nombre` |
| Categoría | Personalizar sugerencias del agente | nueva: `negocio.categoria` |
| Moneda | Precios y reportes | `Store.showBolivares` (VES/USD) |
| País | Moneda, idioma, impuestos | `Negocio.pais` |
| Cantidad de productos | Elegir importar vs crear | informativo |
| Método de venta actual | Recomendar flujo (presencial → POS; redes → PLUS) | nuevo: `negocio.metodoVenta` |

### 3.4 Configuración inicial (elección guiada)
- **Importar inventario** (Excel/CSV) → importador con mapeo de columnas.
- **Crear productos** → formulario rápido (nombre + precio + stock) con opción de detalle.
- **Crear tienda online** → slug de tienda + tema.
- **Configurar POS** → métodos de pago + caja.

> Recomendación por perfil: si elige "importar", saltar directo a importador. Si dice que vende por redes, ofrecer el PLAN PLUS (centro de comunicación) al final del onboarding.

### 3.5 Primer producto
- Con botón **"Guardar y crear otro"** para masificar.
- Con escáner de código de barras opcional.

### 3.6 Primer paso de venta
- **Venta real** (si ya vende) o **pedido de prueba** con productos ficticios.
- El objetivo es que vea el inventario descontarse y el reporte de ventas actualizarse (la "magia").

### 3.7 Dashboard activo + agente
- El dashboard saluda al dueño por su nombre con datos reales.
- El agente IA pregunta lo que necesita conocer (ver §5).

---

## 4. Información que el agente IA necesita para conocer el negocio

Recolectada durante el onboarding y enriquecida luego:

### 4.1 Datos duros (ya disponibles en el sistema)
- **Negocio:** nombre, país, moneda, modalidad.
- **Catálogo:** productos, categorías, precios, costos, stock.
- **Clientes:** ficha, historial de compras.
- **Ventas:** montos, fechas, métodos de pago, tickets.
- **Operación:** caja, agenda, tickets de servicio.

### 4.2 Datos nuevos a capturar (nuevos campos propuestos)
| Campo | Dónde | Uso del agente |
|---|---|---|
| Categoría del negocio | onboarding | personalizar lenguaje y sugerencias |
| Método de venta actual | onboarding | recomendar flujo/plan correcto |
| Horario de atención | configuración | sugerencias de seguimiento a clientes |
| Días de crédito | configuración | recordatorios de cobro |
| Objetivo principal (crecer/vender/ordenar) | onboarding | prioridad de sugerencias del agente |

### 4.3 Preferencias aprendidas (memoria largo plazo)
- Productos que más menciona, clientes favoritos, categorías prioritarias.
- Se almacenan en la infraestructura `LongTermMemory` ya diseñada (FASE 1C).

---

## 5. Onboarding inteligente (paso 7)

El agente, en los primeros 3 días, hace **1 pregunta por día** (no más) para afinar el modelo del negocio:

> Día 1: "¿Cuál es tu producto más vendido?"
> Día 2: "¿Cuántos días de crédito le das a tus clientes?"
> Día 3: "¿Quieres que te avise cuando el inventario esté bajo?"

Cada respuesta alimenta el contexto del negocio y mejora sus recomendaciones.

---

## 6. Métricas de éxito del onboarding

| Métrica | Meta |
|---|---|
| Tiempo hasta primer producto | < 10 min |
| % que llega a primera venta/pedido | > 60 % en la primera sesión |
| % que activa tienda online | > 40 % |
| % que completa el importador sin error | > 70 % |
| Churn de los primeros 7 días | lo más bajo posible (norte: < 8 %) |

---

## 7. No incluido en el MVP de onboarding

- Encuestas largas.
- Requerir tarjeta antes de probar.
- Onboarding multi-paso obligatorio (toda sección es saltable).
- Tutorial en video (se añade como mejora futura).
