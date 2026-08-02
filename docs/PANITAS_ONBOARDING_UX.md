# PANITAS — Onboarding UX (Nuevo)

> Fecha: 02/08/2026 · Rama: `develop-v2` · FASE 2A
> Diseño de la nueva experiencia inicial de **Panitas Negocios 2.0**.

---

## 1. Objetivo

Llevar al usuario de **cero a su primer valor** (primer producto o importación) en **menos de 10 minutos**, con una sola lógica: *"le estoy presentando Panitas a mi negocio"*. El onboarding debe sentirse conversacional, no como un formulario de ERP.

## 2. Flujo nuevo

```
Usuario llega
      ↓
Registro (email / Google)          ← se mantiene register-content.tsx
      ↓
[PASO 1] Tipo de negocio
      🛒 Tarjeta 1: "Tengo una tienda o negocio que vende productos"
      (Tarjeta 2 reservada: "Soy profesional y vendo servicios" — futuro)
      ↓
[PASO 2] Información del negocio
      nombre · categoría · país · moneda · tipo de venta · cantidad aprox. de productos · ¿ya tiene inventario?
      ↓
[PASO 3] Activación — "¿Cómo quieres comenzar?"
      1) Importar inventario
      2) Crear primeros productos
      3) Configurar tienda online
      4) Explorar Panitas
      ↓
[PASO 4] Según elección → acción concreta
      ↓
[PASO 5] Dashboard (centro de control) + tour guiado
```

---

## 3. Detalle de pasos

### PASO 1 — Tipo de negocio (pantalla nueva)

Dos tarjetas grandes, seleccionables:

| Tarjeta | Ícono | Título | Estado |
|---|---|---|---|
| 1 | 🛒 | "Tengo una tienda o negocio que vende productos" | **Implementado en FASE 2A** |
| 2 | (reservado) | "Soy profesional y vendo servicios" | Futuro (deshabilitada/oculta con tooltip "Próximamente") |

Regla:
- La tarjeta 1 es la seleccionada por defecto en esta fase (Panitas Negocios 2.0 foco productos).
- Si el usuario no puede seleccionar, la UI aún debe sentirse completa (botón continuar activo).

### PASO 2 — Información del negocio (formulario)

| Campo | Control | Notas |
|---|---|---|
| Nombre del negocio | Input | requerido |
| Categoría | Select | tienda de ropa, ferretería, repuestos, bodegón, supermercado, tecnología, distribuidor, otro |
| País | Select | (reusar lista de `register-content`) |
| Moneda | Select | USD / VES (según país) |
| Tipo de venta | Select | presencial, online, mixto, por catálogo/WhatsApp |
| Cantidad aprox. de productos | Select | 0, 1-10, 11-50, 51-200, +200 |
| ¿Ya tiene inventario? | Select/switch | Sí (→ sugerir importar), No (→ sugerir crear) |

Estos datos se guardan en `Store`/`Negocio` (campos existentes donde aplique; si un campo no existe en el modelo, se guarda como pendiente en FASE 2B — no se cambia el schema en 2A).

### PASO 3 — Activación: "¿Cómo quieres comenzar?"

Cuatro opciones en tarjetas:

| Opción | Ícono | Descripción | Destino |
|---|---|---|---|
| 1. Importar inventario | 📥 | Sube tu Excel/CSV actual | `ImportWizard` (existe) |
| 2. Crear primeros productos | ➕ | Alta rápida con escáner | `products/new` |
| 3. Configurar tienda online | 🌐 | Slug + tema + catálogo público | `edit-profile` / wizard tienda |
| 4. Explorar Panitas | 👀 | Ir directo al dashboard | `/dashboard` |

Regla: **multi-selección permitida**; se ejecuta en orden de prioridad del usuario, y al final siempre termina en el dashboard con el tour guiado.

### PASO 4 — Acción concreta

- Si eligió importar → modal/wizard de importación (reutiliza `ImportWizard`).
- Si eligió crear → formulario rápido con "Guardar y crear otro".
- Si eligió tienda → mini-wizard de tienda (slug + tema + primera preview).
- Si eligió explorar → salta al dashboard.

### PASO 5 — Dashboard + tour

- Aterriza en el **centro de control** nuevo.
- Se dispara `TourProvider` con pasos cortos (productos, venta, tienda, agente).

---

## 4. Estados del onboarding

| Estado | Comportamiento |
|---|---|
| Usuario ya tiene store (vuelve) | Saltar onboarding → dashboard |
| Sin sesión | Redirigir a `/register` |
| Error de guardado | Toast + mantener datos del formulario |
| Selección previa (cookie) | Recordar tipo de negocio y saltar PASO 1 |

---

## 5. Componentes propuestos

| Componente | Ruta sugerida | Rol |
|---|---|---|
| `OnboardingWizard` | `components/onboarding/onboarding-wizard.tsx` | Orquestador client de pasos |
| `BusinessTypeStep` | `components/onboarding/business-type-step.tsx` | PASO 1 (tarjetas) |
| `BusinessInfoStep` | `components/onboarding/business-info-step.tsx` | PASO 2 (form) |
| `ActivationStep` | `components/onboarding/activation-step.tsx` | PASO 3 (tarjetas) |
| `OnboardingLayout` | `components/onboarding/layout.tsx` | Shell visual (sin sidebar) |

> En FASE 2A: construir el wizard visual y la UI de pasos con **persistencia mínima** (a dónde guardar se define en 2B con el mapeo de planes). La UI debe funcionar y navegar; la escritura a BD se limita a lo que ya existe (`applyPlanSelection`).

---

## 6. Decisiones FASE 2A

1. Implementar **solo la tarjeta de negocio de productos** (la otra queda reservada/oculta).
2. El onboarding nuevo es **independiente y no rompe** el flujo actual (choose-plan sigue existiendo como respaldo).
3. No se cambia el schema (no hay `negocio.categoria` ni `metodoVenta` en esta fase); los campos se recolectan en la UI y se persisten cuando el mapeo esté listo (2B).
4. Reutilizar al máximo: `Stepper`, `Card`, `Select`, `EmptyState`, `ImportWizard`, `TourProvider`.
