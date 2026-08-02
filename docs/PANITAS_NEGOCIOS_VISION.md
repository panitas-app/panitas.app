# PANITAS NEGOCIOS — Visión del Producto

> Fecha: 02/08/2026 · Rama: `develop-v2` · FASE 1D
> Documento maestro de propuesta de valor para **Panitas Negocios 2.0**.

---

## 1. La nueva propuesta

### Antes (Panitas 1.x)
> "Software para administrar negocios."

### Ahora (Panitas Negocios 2.0)
> "Un asistente inteligente que ayuda a administrar, vender y hacer crecer tu negocio."

El producto deja de ser una **colección de herramientas** (inventario, POS, tienda, agenda) y se convierte en un **sistema único, conversacional y proactivo** que:
- administra el negocio por el dueño,
- responde sus preguntas,
- detecta oportunidades y
- le sugiere qué hacer a continuación.

---

## 2. Qué problema resuelve

| Problema del comerciante | Cómo lo resuelve Panitas |
|---|---|
| No sabe cuánto inventario tiene en realidad | Inventario en tiempo real, alertas de stock bajo |
| Pierde ventas por no saber precios/costos | Precios y costos centralizados, margen calculado |
| No sabe qué producto vende más ni cuál no se mueve | Reportes de ventas, productos, ganancias y clientes |
| Atiende clientes por WhatsApp/IG sin orden | **Centro de comunicación** (PLUS): todos los chats en un solo lugar |
| No sabe a quién venderle de nuevo | CRM con historial de compras y segmentación |
| No tiene tiempo de analizar sus números | **Agente IA**: responde preguntas y resume el negocio |
| El software tradicional es difícil de operar | Experiencia conversacional y "centro de control", no ERP |

El comerciante pequeño **no quiere aprender un ERP**: quiere saber si hoy vendió, qué le falta y qué vender mañana.

---

## 3. Diferencia frente a un software administrativo tradicional

| Aspecto | ERP / software tradicional | Panitas Negocios 2.0 |
|---|---|---|
| Interacción | Menús, formularios, pantallas | Chat, preguntas, sugerencias |
| Descubrimiento | El usuario busca la función | La función llega al usuario (proactivo) |
| Análisis | Reportes que hay que leer | Respuestas y resúmenes generados |
| Carga de datos | Manual, por módulo | Onboarding guiado + agente que pregunta lo que necesita |
| Trazabilidad | Parcial | Auditoría de cada acción (del usuario y del agente) |
| Curva de aprendizaje | Alta | Mínima ("le hablas y te responde") |
| Valor del dato | Histórico | **Acción**: qué hacer ahora mismo |

**Diferenciador central:** Panitas no reemplaza al admin del negocio, lo **asiste**. El dueño decide; el agente propone.

---

## 4. Cómo la IA cambia la experiencia

La IA aparece en tres niveles, progresivos por plan:

1. **IA consultiva (NEGOCIOS):**
   - El dueño pregunta: *"¿cuánto vendí esta semana?"*, *"¿qué producto tiene menos stock?"*
   - El agente consulta datos reales del negocio y responde.

2. **IA comercial (NEGOCIOS PLUS):**
   - Lee la bandeja de conversaciones (WhatsApp/Instagram/Messenger).
   - Sugiere respuestas al dueño (nunca responde solo).
   - Detecta intención de compra y recomienda seguimiento.

3. **IA proactiva (futuro):**
   - El agente avisa: *"Tienes 3 productos con poco inventario"*, *"Este cliente te escribió hace 3 días y no compró"*.

**Principio innegociable:** el agente **sugiere, nunca decide por el dueño**. Toda acción de escritura requiere confirmación humana.

---

## 5. Qué promete al usuario (promesa de marca)

1. **"Habla con tu negocio."** Pregunta y obtén respuesta con datos reales.
2. **"Todo en un solo lugar."** Inventario, ventas, clientes, tienda y chats integrados.
3. **"Vende más con los datos que ya tienes."** Recomendaciones basadas en tu propia operación.
4. **"Sin aprender sistemas complicados."** La curva de aprendizaje es conversacional.
5. **"Tu negocio crece contigo."** Del módulo básico al asistente comercial completo.

---

## 6. Perfil del cliente ideal

### Primario (foco NEGOCIOS)
- **Dueño de negocio físico** que vende productos (ropa, ferretería, repuestos, bodegón, supermercado, tecnología, distribuidor).
- 1 a 10 empleados. Sin equipo de IT ni contador dedicado.
- Vende presencial y empieza a vender en línea (WhatsApp/Instagram).
- Gestiona hoy con cuaderno, Excel o un software que no entiende.
- Valora: rapidez, no perder ventas, saber cuánto inventario tiene.

### Secundario (foco NEGOCIOS PLUS)
- Negocio que ya recibe pedidos por WhatsApp/Instagram y los anota a mano.
- Necesita responder rápido y no olvidar clientes que preguntaron.
- Está dispuesto a pagar por "vender más" (no por "tener un sistema").

### No es el cliente ideal
- Empresas con contabilidad compleja, multi-sede o procesos logísticos grandes (eso queda fuera del MVP).

---

## 7. Casos de uso principales

| # | Caso de uso | Plan |
|---|---|---|
| 1 | Registrar productos con costo, precio y stock | Negocios |
| 2 | Vender en caja (POS) y descontar inventario | Negocios |
| 3 | Crear pedido desde la tienda online conectada al inventario | Negocios |
| 4 | Ver ventas, productos vendidos, ganancias y clientes | Negocios |
| 5 | Preguntar al agente: "¿cuánto vendí hoy?" | Negocios |
| 6 | Atender WhatsApp/Instagram/Messenger desde Panitas | Negocios Plus |
| 7 | Que el agente sugiera respuestas a un cliente que pregunta disponibilidad | Negocios Plus |
| 8 | Detectar clientes interesados y recomendar seguimiento | Negocios Plus |
| 9 | Registrar una reparación como ticket (materiales + mano de obra) | Ambos (ticket) |
| 10 | Cierre de caja del día | Negocios |

---

## 8. Principios de producto (guía para todas las decisiones)

1. **El negocio se administra solo, el dueño decide.** El agente propone, nunca ejecuta sin confirmación.
2. **Menos pantallas, más respuestas.** El dashboard es un centro de control, no un ERP.
3. **Un solo dato, una sola fuente.** Inventario, precios y clientes viven en una fuente única.
4. **Onboarding = primera venta.** El producto debe llevar al usuario a su primer producto y primera venta en la primera sesión.
5. **La IA mejora el dato, no lo inventa.** Todo lo que responde el agente sale de datos reales del negocio.
6. **Suscripción = valor creciente.** El plan PLUS paga por vender más, no por más funciones de administración.
