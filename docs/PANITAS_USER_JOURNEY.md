# PANITAS NEGOCIOS — Experiencia de Usuario (User Journey)

> Fecha: 02/08/2026 · Rama: `develop-v2` · FASE 1D
> Recorrido completo del cliente ideal, de registro a uso diario, con momentos importantes.

---

## 1. El usuario tipo

**Juan**, 35 años, dueño de "Ferremax" (ferretería pequeña). Vende en mostrador y recibe pedidos por WhatsApp. Hoy usa cuaderno y Excel. Quiere "no perder ventas" y "saber cuánto inventario tiene".

---

## 2. Etapas del journey

### Etapa A — Descubrimiento y registro
| Paso | Acción | Emoción | Momento importante |
|---|---|---|---|
| 1 | Escucha de un amigo / anuncio: "asistente que administra y vende" | Interés | **Propuesta clara** (no es un ERP) |
| 2 | Entra a la página: "Habla con tu negocio" | Curiosidad | Demo/antes-después visible |
| 3 | Se registra (email o Google) | Rápido | Sin tarjeta ni compromiso |

> **Momento importante:** promesa clara en la landing. El registro es sin fricción.

### Etapa B — Onboarding
| Paso | Acción | Emoción | Momento importante |
|---|---|---|---|
| 4 | Elige "Tengo un negocio que vende productos" | Validado | Producto habla su idioma |
| 5 | Configura nombre, categoría, moneda, país | Simple | 6 campos máximo |
| 6 | Elige "importar inventario" (Excel) | Cautela → alivio | Importador con mapeo y vista previa |
| 7 | Sus productos aparecen con stock | **WOW** | **Primer momento de valor real** |
| 8 | Crea su primer producto (o completa uno) | Empoderado | Botón "guardar y crear otro" |

> **Momento importante:** la importación funciona a la primera y se ven sus datos. Si falla, se pierde la confianza (proteger con validación robusta).

### Etapa C — Primera venta
| Paso | Acción | Emoción | Momento importante |
|---|---|---|---|
| 9 | Abre el POS "Vender ahora" | Curioso | Flujo con 1 producto en 3 clics |
| 10 | Registra una venta de prueba o real | Satisfecho | **El inventario se descuenta solo** |
| 11 | Ve "Ventas hoy: $X" en el dashboard | **Aha** | **La magia: datos conectados** |

> **Momento importante:** la primera venta. El stock bajó, el reporte subió, el cliente quedó registrado. Es la prueba de que "todo está conectado".

### Etapa D — Primer análisis IA
| Paso | Acción | Emoción | Momento importante |
|---|---|---|---|
| 12 | Ve el campo "Pregúntale a tu agente" | Dudoso | El campo siempre visible |
| 13 | Escribe "¿cuánto vendí esta semana?" | Expectativa | Responde con números reales |
| 14 | Pregunta "¿qué producto tengo que reabastecer?" | **Confianza** | Respuesta útil y accionable |

> **Momento importante:** la primera respuesta IA correcta. Es el momento en que Panitas deja de ser "otro sistema" y pasa a ser "asistente".

### Etapa E — Primer alerta / acción proactiva
| Paso | Acción | Emoción | Momento importante |
|---|---|---|---|
| 15 | Recibe alerta: "3 productos con poco inventario" | Sorpresa agradable | El sistema lo cuida |
| 16 | Clic → lista de productos bajos | Proactivo | Reabastece o crea orden |
| 17 | "¿Quieres revisar tus productos bajos?" | Involucrado | CTA contextual |

> **Momento importante:** la proactividad. El sistema le avisa antes de quedarse sin stock. Es el diferenciador vs. software que espera a que el usuario busque.

### Etapa F — Upgrade a PLUS (si aplica)
| Paso | Acción | Emoción | Momento importante |
|---|---|---|---|
| 18 | Recibe pedidos por WhatsApp y los anota a mano | Agobio | El dolor es visible |
| 19 | Ve la propuesta: centro de comunicación + sugerencias | Interés | Demo del copiloto |
| 20 | Se suscribe a PLUS | Expectativa | Conexión de WhatsApp en 5 min |

> **Momento importante:** el upgrade se ofrece en el momento del dolor (más clientes por WhatsApp), no en una página de precios genérica.

### Etapa G — Uso diario
| Paso | Acción | Emoción | Momento importante |
|---|---|---|---|
| 21 | Abre el dashboard al llegar | Familiar | Saludo + 3 métricas + alerta clave |
| 22 | Vende en el día (POS), atiende chats | Productivo | Todo conectado |
| 23 | Pregunta al agente cuando duda | Resuelto | Respuesta inmediata |
| 24 | Cierra caja | Ordenado | Cierre en 2 minutos |
| 25 | Recibe resumen del día | Tranquilo | "Tu negocio va así" |

---

## 3. Momentos importantes (resumen)

| # | Momento | Etapa | Por qué importa |
|---|---|---|---|
| 1 | Datos importados y visibles | B | Prueba de que "se puede" |
| 2 | Primera venta conectada | C | La magia de datos conectados |
| 3 | Primera respuesta IA correcta | D | Panitas = asistente, no sistema |
| 4 | Alerta proactiva de stock | E | El sistema cuida al negocio |
| 5 | Upgrade en el momento del dolor | F | Monetización natural |
| 6 | Resumen diario | G | Hábito + retención |

---

## 4. Fricciones a evitar

- Onboarding de más de 10 minutos.
- Importación que falla sin mensaje claro.
- Agente que responde datos erróneos (dañar la confianza es caro).
- Alertas que no llevan a una acción.
- Pedir tarjeta antes de mostrar valor.

---

## 5. Métricas de cada etapa

| Etapa | Métrica | Meta |
|---|---|---|
| Registro | % a onboarding | > 70 % |
| Onboarding | % primer producto | > 60 % |
| Primera venta | % primera venta en 24h | > 50 % |
| Primer análisis IA | % usa el agente en 7 días | > 40 % |
| Proactividad | % interactúa con alerta | > 50 % |
| Retención | Activos a los 30 días | > 40 % |
| Monetización | % PLUS entre activos | > 10 % |
