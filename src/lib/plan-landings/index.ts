export interface PlanLandingContent {
  heroTitle: string
  heroSubtitle: string
  price: string
  priceYearly: string
  priceInstallment: string
  includes: { label: string; detail: string }[]
  excludes: { label: string; detail: string }[]
  useCases: { title: string; description: string; icon: string }[]
  faq: { question: string; answer: string }[]
  verticalLinks: { label: string; href: string }[]
  ctaText: string
  comparisonLabel: string
}

export const planAgendaContent: PlanLandingContent = {
  heroTitle: "Software de Agenda Online para tu Negocio en Venezuela",
  heroSubtitle:
    "Lleva el control de tus citas, reservas y profesionales con un sistema diseñado para barberías, clínicas, consultorios, spas y salones de belleza. Tus clientes reservan 24/7 desde su celular sin que tengas que contestar un solo mensaje.",
  price: "$14.99",
  priceYearly: "$149.90",
  priceInstallment: "$17.98",
  comparisonLabel: "Plan Agenda vs otras soluciones",
  includes: [
    {
      label: "Agenda de citas online",
      detail: "Tus clientes ven tu disponibilidad en tiempo real y reservan desde cualquier dispositivo, 24/7.",
    },
    {
      label: "Recordatorios automáticos",
      detail: "El sistema envía recordatorios a tus clientes antes de cada cita. Reduce no-shows hasta un 70%.",
    },
    {
      label: "Múltiples profesionales",
      detail: "Cada profesional tiene su propia agenda, servicios y horarios configurables.",
    },
    {
      label: "Servicios con precios y duración",
      detail: "Configura servicios como corte $15 (30 min), barba $10 (20 min), combo $22 (45 min).",
    },
    {
      label: "Perfil público para tu negocio",
      detail: "Página profesional con tus servicios, horarios y link directo para reservar. Aparece en búsquedas de Google.",
    },
    {
      label: "Dashboard de reservas",
      detail: "Ves en un vistazo tus próximas citas, cancelaciones, ingresos del día y tasa de ocupación.",
    },
    {
      label: "Múltiples sedes",
      detail: "Si tienes más de una ubicación, gestiona todas las agendas desde un solo panel.",
    },
    {
      label: "Acepta pagos con tu servicio",
      detail: "Registra pagos por cada cita. Pago móvil, transferencia, efectivo o divisas.",
    },
  ],
  excludes: [
    {
      label: "Punto de venta (POS)",
      detail: "Si necesitas vender productos, el Plan Emprendedor incluye POS integrado.",
    },
    {
      label: "Tienda online",
      detail: "El Plan Agenda no incluye tienda online. Si vendes productos, upgradea a Emprendedor.",
    },
    {
      label: "Control de inventario",
      detail: "Si tu negocio vende productos, necesitas el Plan Emprendedor o Mayorista.",
    },
    {
      label: "CRM avanzado",
      detail: "El Plan Agenda incluye gestión básica de clientes. Para CRM completo, usa Emprendedor.",
    },
  ],
  useCases: [
    {
      title: "Barberías y peluquerías",
      description:
        "Tus clientes eligen barbero, servicio y horario. Reservan desde Instagram o tu link de WhatsApp. Tú solo abres tu agenda y ves las citas confirmadas.",
      icon: "✂️",
    },
    {
      title: "Clínicas y consultorios",
      description:
        "Pacientes reservan consultas online con disponibilidad en tiempo real. Recordatorios automáticos reducen inasistencias. Ideal para odontólogos, psicólogos y médicos generales.",
      icon: "🏥",
    },
    {
      title: "Spas y centros de estética",
      description:
        "Maneja servicios de diferentes duraciones y precios. Paquetes de servicio, reservas recurrentes y calendario compartido entre profesionales.",
      icon: "🧖",
    },
    {
      title: "Estudios de tatuaje y piercing",
      description:
        "Cada artista con su agenda. Los clientes envían fotos de referencia y reservan su sesión. Control de depósitos y seguimiento de trabajos pendientes.",
      icon: "🎨",
    },
  ],
  faq: [
    {
      question: "¿Cuántos profesionales puedo agregar con el Plan Agenda?",
      answer:
        "El Plan Agenda incluye 1 miembro de equipo. Si necesitas múltiples profesionales con agenda independiente, el Plan Emprendedor permite hasta 3 miembros y el Mayorista hasta 10.",
    },
    {
      question: "¿Mis clientes pueden reservar desde el celular?",
      answer:
        "Sí. Tus clientes acceden a tu perfil profesional desde cualquier celular o computadora. No necesitan descargar una app ni crear una cuenta para reservar.",
    },
    {
      question: "¿Puedo configurar diferentes duraciones por servicio?",
      answer:
        "Sí. Puedes crear servicios con duraciones y precios diferentes. Por ejemplo: corte de cabello 30 min, barba 20 min, combo corte + barba 45 min. El sistema calcula la disponibilidad automáticamente.",
    },
    {
      question: "¿Qué pasa si un cliente no se presenta?",
      answer:
        "El sistema envía recordatorios automáticos 24 horas antes y 1 hora antes de la cita. Estos recordatorios reducen las inasistencias hasta un 70%. También puedes configurar políticas de cancelación.",
    },
    {
      question: "¿Puedo aceptar pagos por las citas?",
      answer:
        "Sí. Puedes registrar el método de pago de cada cita: pago móvil, transferencia bancaria, efectivo o divisas. El dashboard te muestra los ingresos del día y del período configurado.",
    },
    {
      question: "¿Necesito conocimientos técnicos para configurarlo?",
      answer:
        "No. La configuración toma menos de 10 minutos. Creas tu perfil, agregas tus servicios con precios y duración, configuras tus horarios y listo. Tu link de reservas queda activo al instante.",
    },
    {
      question: "¿Puedo tener más de una sucursal?",
      answer:
        "Sí. Panitas soporta gestión multisucursal. Puedes administrar la agenda de cada ubicación desde un solo panel centralizado, sin importar cuántas sedes tengas.",
    },
    {
      question: "¿Funciona para negocios que no son de citas?",
      answer:
        "El Plan Agenda está diseñado para negocios por cita (barberías, clínicas, spas). Si vendes productos o necesitas inventario y POS, el Plan Emprendedor ($19.99/mes) es mejor para ti.",
    },
    {
      question: "¿Puedo cancelar cuando quiera?",
      answer:
        "Sí. No hay contratos de permanencia. Puedes cancelar en cualquier momento y tu cuenta sigue activa hasta que termine el período pagado. Tus datos quedan disponibles 30 días después de la cancelación.",
    },
  ],
  verticalLinks: [
    { label: "Software para barberías", href: "/software-para-barberias" },
    { label: "Software para peluquerías", href: "/software-para-peluquerias" },
    { label: "Software para clínicas", href: "/software-para-clinicas" },
    { label: "Software para médicos", href: "/software-para-medicos" },
    { label: "Software para odontólogos", href: "/software-para-odontologos" },
    { label: "Software para psicólogos", href: "/software-para-psicologos" },
    { label: "Software para estéticas", href: "/software-para-esteticas" },
    { label: "Software para spa", href: "/software-para-spa" },
    { label: "Agenda online", href: "/agenda-online" },
    { label: "Agenda de citas", href: "/agenda-de-citas" },
    { label: "Agenda para profesionales", href: "/agenda-para-profesionales" },
  ],
  ctaText: "Comenzar prueba gratis",
}

export const planEmprendedorContent: PlanLandingContent = {
  heroTitle: "Software Todo en Uno para Emprendedores en Venezuela",
  heroSubtitle:
    "Vende online con tienda profesional, gestiona inventario en tiempo real, cobra con POS integrado y conoce a tus clientes con CRM. Todo desde un solo lugar, sin instalar nada en tu computadora.",
  price: "$19.99",
  priceYearly: "$199.90",
  priceInstallment: "$25.98",
  comparisonLabel: "Plan Emprendedor vs Excel y cuadernos",
  includes: [
    {
      label: "Tienda online profesional",
      detail: "Catálogo de productos, carrito de compras, pasarela de pago y dominio personalizado. Tus clientes compran 24/7.",
    },
    {
      label: "Punto de venta (POS) integrado",
      detail: "Registra ventas rápidas con código de barras o búsqueda. Acepta pago móvil, transferencias y dólares.",
    },
    {
      label: "Control de inventario en tiempo real",
      detail: "Cada venta descuenta automáticamente. Alertas de stock bajo, códigos de barras e importación desde Excel.",
    },
    {
      label: "CRM con historial de clientes",
      detail: "Registro de compras, notas, seguimiento, etiquetas y gestión de cobros. Todo vinculado a ventas.",
    },
    {
      label: "Reportes y dashboard",
      detail: "Ventas diarias, semanales y mensuales con gráficos. Sabes qué vende, cuándo y a quién.",
    },
    {
      label: "Agenda de citas online",
      detail: "Incluye sistema de reservas para servicios. Funciona junto con ventas e inventario.",
    },
    {
      label: "WhatsApp Business integrado",
      detail: "Envía confirmaciones, recordatorios y follow-ups directamente desde el sistema.",
    },
    {
      label: "Hasta 3 miembros de equipo",
      detail: "Tu equipo puede trabajar al mismo tiempo con permisos configurables por rol.",
    },
  ],
  excludes: [
    {
      label: "Gestión B2B para mayoristas",
      detail: "Si vendes al por mayor y necesitas comisiones y notas de entrega, el Plan Mayorista ($49.99/mes) es mejor.",
    },
    {
      label: "Inventario ilimitado",
      detail: "El Plan Emprendedor soporta inventario completo. Para operaciones de gran escala, usa Mayorista.",
    },
    {
      label: "Multiusuario avanzado",
      detail: "Emprendedor incluye 3 miembros. Si necesitas 10 o más, upgradea a Mayorista.",
    },
  ],
  useCases: [
    {
      title: "Tiendas de ropa y calzado",
      description:
        "Tu tienda online muestra tu catálogo completo con tallas y colores. Los clientes compran por internet o en tu local con el mismo inventario. Control de stock por variante sin complicaciones.",
      icon: "👗",
    },
    {
      title: "Ferreterías y bodegones",
      description:
        "Miles de productos con código de barras. El POS escanea rápido, el inventario se actualiza solo y las alertas te avisan cuando algo está por acabarse. Sin excusas para perder mercancía.",
      icon: "🔧",
    },
    {
      title: "Farmacias y licorerías",
      description:
        "Control de vencimientos, precios por presentación y stock mínimo. El sistema te alerta antes de que un producto se venza o se agote. Ventas rápidas con código de barras.",
      icon: "💊",
    },
    {
      title: "Restaurantes y cafeterías",
      description:
        "Menú digital con pedidos online, control de insumos en tiempo real y reportes de ventas diarias. Sabes exactamente cuánto vendes por plato y por horario.",
      icon: "🍽️",
    },
  ],
  faq: [
    {
      question: "¿Puedo crear mi tienda online con el Plan Emprendedor?",
      answer:
        "Sí. El Plan Emprendedor incluye tienda online profesional con catálogo de productos, carrito de compras, pasarela de pago y dominio personalizado. Tus clientes pueden comprar 24/7 desde cualquier dispositivo.",
    },
    {
      question: "¿Cuántos productos puedo tener en mi inventario?",
      answer:
        "El Plan Emprendedor soporta productos ilimitados. Puedes importar tu inventario completo desde Excel sin límite de cantidad.",
    },
    {
      question: "¿Acepta pagos en dólares y bolívares?",
      answer:
        "Sí. Panitas maneja múltiples monedas. La tasa del BCV se actualiza automáticamente. Puedes registrar ventas en ambas monedas y el sistema las diferencia en los reportes.",
    },
    {
      question: "¿Necesito equipo especial para el POS?",
      answer:
        "No. El POS funciona desde cualquier computadora o celular con navegador web. Si quieres escanear códigos de barras, puedes usar un lector USB básico que cuesta menos de $10.",
    },
    {
      question: "¿Mis clientes pueden comprar por internet?",
      answer:
        "Sí. Tu tienda online se crea automáticamente con tu inventario. Los pedidos que llegan por internet se registran en tu inventario como cualquier otra venta. No necesitas actualizar nada manualmente.",
    },
    {
      question: "¿Puedo importar mi inventario desde Excel?",
      answer:
        "Sí. Subes tu hoja de cálculo y el sistema detecta automáticamente las columnas de nombre, precio y cantidad. En minutos tienes tu inventario completo sin digitación manual.",
    },
    {
      question: "¿Qué reportes puedo generar?",
      answer:
        "Ventas diarias, semanales y mensuales. Productos más vendidos, márgenes de ganancia, clientes frecuentes, métodos de pago y tendencias. Todo con gráficos fáciles de entender.",
    },
    {
      question: "¿Puedo tener agenda de citas junto con ventas?",
      answer:
        "Sí. El Plan Emprendedor incluye agenda de citas online además de tienda, POS e inventario. Si ofreces servicios y vendes productos, todo funciona integrado.",
    },
    {
      question: "¿Cuánto tiempo toma configurar todo?",
      answer:
        "La configuración básica (perfil, productos, horarios) toma entre 15 y 30 minutos. Si importas desde Excel, es aún más rápido. No necesitas conocimientos técnicos ni instalar software.",
    },
  ],
  verticalLinks: [
    { label: "Software para tiendas", href: "/software-para-tiendas" },
    { label: "Software para minimarket", href: "/software-para-minimarket" },
    { label: "Software para restaurantes", href: "/software-para-restaurantes" },
    { label: "Software para ferreterías", href: "/software-para-ferreterias" },
    { label: "Software de inventario", href: "/software-inventario" },
    { label: "Punto de venta (POS)", href: "/software-pos" },
    { label: "Tienda online", href: "/tienda-online" },
  ],
  ctaText: "Comenzar prueba gratis",
}

export const planMayoristaContent: PlanLandingContent = {
  heroTitle: "Sistema B2B para Mayoristas y Distribuidoras en Venezuela",
  heroSubtitle:
    "Controla pedidos al mayor, gestiona comisiones de vendedores, genera notas de entrega automatizadas y maneja precios por volumen. Todo lo que una distribuidora necesita para operar sin caos.",
  price: "$49.99",
  priceYearly: "$499.90",
  priceInstallment: "$55.98",
  comparisonLabel: "Plan Mayorista vs sistemas genéricos",
  includes: [
    {
      label: "Gestión B2B completa",
      detail: "Catálogo de precios mayoristas, pedidos al por mayor, clientes B2B con precios diferenciados y crédito.",
    },
    {
      label: "Comisiones de vendedores",
      detail: "Configura comisiones por vendedor, por producto o por categoría. El sistema calcula automáticamente lo que le corresponde a cada uno.",
    },
    {
      label: "Notas de entrega automatizadas",
      detail: "Genera notas de venta y notas de entrega con un clic. Datos del cliente, productos, cantidades y firma de recibido.",
    },
    {
      label: "Precios por volumen",
      detail: "Configura descuentos por cantidad: 1-10 unidades precio A, 11-50 precio B, 50+ precio C. El sistema aplica automáticamente.",
    },
    {
      label: "Inventario ilimitado",
      detail: "Sin límite de productos. Control completo con códigos de barras, entradas, salidas, alertas de stock y reportes de rotación.",
    },
    {
      label: "Tienda online B2B",
      detail: "Catálogo privado para clientes mayoristas con precios diferenciados. Tus clientes hacen pedidos online según su nivel de precios.",
    },
    {
      label: "Reportes de ventas y comisiones",
      detail: "Dashboard de ventas por vendedor, por cliente, por producto y por período. Cálculo automático de comisiones.",
    },
    {
      label: "Hasta 10 miembros de equipo",
      detail: "Tu fuerza de ventas, bodega y administración trabajan desde el mismo sistema con permisos por rol.",
    },
    {
      label: "WhatsApp Business integrado",
      detail: "Envía notas de venta, confirmaciones de pedido y recordatorios de pago directamente por WhatsApp.",
    },
  ],
  excludes: [],
  useCases: [
    {
      title: "Distribuidoras de alimentos",
      description:
        "Controla pedidos de múltiples vendedores, precios por volumen por cliente, comisiones automáticas y notas de entrega para cada ruta. Sin hojas de cálculo ni WhatsApp para tomar pedidos.",
      icon: "📦",
    },
    {
      title: "Importadoras y mayoristas",
      description:
        "Maneja catálogos grandes con cientos de productos. Cada vendedor tiene su lista de clientes con precios negociados. El sistema genera las notas de venta y calcula comisiones automáticamente.",
      icon: "🏭",
    },
    {
      title: "Ferreterías mayoristas",
      description:
        "Precios diferentes para cada ferretería cliente. Pedidos recurrentes, control de crédito y seguimiento de pagos. Tus vendedores toman pedidos desde el celular en cada visita.",
      icon: "🔩",
    },
    {
      title: "Distribuidoras de bebidas",
      description:
        "Control de inventario por presentación, precios por volumen, comisiones por ruta y notas de entrega automatizadas. Sabes exactamente cuánto vendió cada vendedor en el día.",
      icon: "🍺",
    },
  ],
  faq: [
    {
      question: "¿Cómo funcionan las comisiones de vendedores?",
      answer:
        "Configuras un porcentaje o monto fijo por venta, por producto o por categoría. El sistema registra cada venta del vendedor y calcula automáticamente cuánto le corresponde. Puedes generar reportes de comisiones por período.",
    },
    {
      question: "¿Puedo tener precios diferentes para cada cliente?",
      answer:
        "Sí. Cada cliente mayorista puede tener su lista de precios. También puedes configurar precios por volumen: el precio baja automáticamente cuando el cliente compra más unidades del mismo producto.",
    },
    {
      question: "¿Las notas de venta se generan automáticamente?",
      answer:
        "Sí. Cuando un vendedor registra un pedido, el sistema genera la nota de venta con todos los datos: cliente, productos, cantidades, precios, descuentos y totales. También genera la nota de entrega para el envío.",
    },
    {
      question: "¿Mis vendedores pueden tomar pedidos desde el celular?",
      answer:
        "Sí. Cada vendedor accede al sistema desde su celular, busca productos, selecciona el cliente y registra el pedido. El pedido llega al sistema central en tiempo real.",
    },
    {
      question: "¿Puedo controlar el crédito de mis clientes?",
      answer:
        "Sí. Puedes establecer un límite de crédito por cliente. El sistema valida si el cliente tiene saldo disponible antes de permitir un nuevo pedido a crédito. También puedes registrar pagos y seguir el saldo pendiente.",
    },
    {
      question: "¿Soporta inventario grande con muchos productos?",
      answer:
        "Sí. El Plan Mayorista soporta inventario ilimitado. Miles de productos con código de barras, entradas, salidas, alertas de stock bajo y reportes de rotación por producto.",
    },
    {
      question: "¿Puedo tener tienda online para clientes mayoristas?",
      answer:
        "Sí. La tienda online muestra tu catálogo con los precios específicos de cada cliente. Tus clientes mayoristas pueden hacer pedidos online según su nivel de precios, sin llamar ni escribir por WhatsApp.",
    },
    {
      question: "¿Cuántos miembros de equipo puedo tener?",
      answer:
        "El Plan Mayorista permite hasta 10 miembros de equipo. Cada uno con permisos configurables: vendedores, bodega, administración. Si necesitas más, contáctanos para un plan personalizado.",
    },
    {
      question: "¿Qué reportes puedo generar?",
      answer:
        "Ventas por vendedor, por cliente, por producto, por período. Comisiones calculadas automáticamente. Inventario con rotación y stock. Cuentas por cobrar y pagos recibidos. Todo exportable a Excel.",
    },
  ],
  verticalLinks: [
    { label: "Software para negocios", href: "/software-para-negocios" },
    { label: "Software para ferreterías", href: "/software-para-ferreterias" },
    { label: "Software para tiendas", href: "/software-para-tiendas" },
    { label: "Software administrativo", href: "/software-administrativo" },
    { label: "Control de inventario", href: "/software-inventario" },
  ],
  ctaText: "Comenzar prueba gratis",
}

export function getPlanLandingContent(plan: "agenda" | "emprendedor" | "mayorista"): PlanLandingContent {
  switch (plan) {
    case "agenda":
      return planAgendaContent
    case "emprendedor":
      return planEmprendedorContent
    case "mayorista":
      return planMayoristaContent
  }
}
