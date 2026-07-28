import { Client } from "pg"

interface SeedQuestion {
  texto: string
  tipo: string
  opciones?: string
  orden: number
  requerida?: boolean
  puntaje?: string
  placeholder?: string
  subtexto?: string
  condicionLogica?: string
  metadata?: string
}

interface SeedSection {
  nombre: string
  descripcion: string
  icono: string
  orden: number
  route: string
  tipo: string
  guiaVendedor?: string
  questions: SeedQuestion[]
}

const SECTIONS: SeedSection[] = [
  // ═══════════════════════════════════════════════
  // RUTA A — EMPRENDEDOR PRESENCIAL
  // ═══════════════════════════════════════════════
  {
    nombre: "Apertura",
    descripcion: "Romper el hielo — no empezar vendiendo",
    icono: "MessageCircle",
    orden: 0,
    route: "emprendedor_presencial",
    tipo: "info",
    guiaVendedor: "No empezar vendiendo el sistema.\n\nBuenos dias, estamos ayudando a negocios de la zona a organizar mejor sus ventas e inventario. Queria hacerte unas preguntas para conocer como manejan actualmente el negocio.",
    questions: [],
  },
  {
    nombre: "Diagnostico del Negocio",
    descripcion: "Como funciona el negocio actualmente",
    icono: "Building",
    orden: 1,
    route: "emprendedor_presencial",
    tipo: "questions",
    questions: [
      {
        texto: "Como registran actualmente sus ventas?",
        tipo: "radio",
        opciones: JSON.stringify(["Sistema POS", "Excel", "Cuaderno", "Calculadora", "No registran"]),
        orden: 0,
        puntaje: JSON.stringify({ "No registran": 20, Cuaderno: 15, Calculadora: 15, Excel: 10, "Sistema POS": 0 }),
      },
      {
        texto: "Como controlan actualmente el inventario?",
        tipo: "radio",
        opciones: JSON.stringify(["Sistema", "Excel", "Cuaderno", "Memoria", "No llevan control"]),
        orden: 1,
        puntaje: JSON.stringify({ "No llevan control": 20, Memoria: 18, Cuaderno: 15, Excel: 10, Sistema: 0 }),
      },
      {
        texto: "Cuantos productos manejan aproximadamente?",
        tipo: "radio",
        opciones: JSON.stringify(["Menos de 50", "50 - 200", "200 - 500", "Mas de 500"]),
        orden: 2,
        puntaje: JSON.stringify({ "Mas de 500": 15, "200 - 500": 12, "50 - 200": 8, "Menos de 50": 0 }),
      },
      {
        texto: "Cuantas personas participan en las ventas?",
        tipo: "radio",
        opciones: JSON.stringify(["Solo el dueno", "1 empleado", "2-5 empleados", "Mas de 5 empleados"]),
        orden: 3,
        puntaje: JSON.stringify({ "Mas de 5 empleados": 15, "2-5 empleados": 12, "1 empleado": 5, "Solo el dueno": 0 }),
      },
      {
        texto: "Cuando un cliente pregunta por un producto, pueden saber inmediatamente si tienen disponibilidad?",
        tipo: "radio",
        opciones: JSON.stringify(["Siempre", "Algunas veces", "No"]),
        orden: 4,
        puntaje: JSON.stringify({ No: 15, "Algunas veces": 8, Siempre: 0 }),
      },
      {
        texto: "Cuando termina el dia, saben exactamente cuanto vendieron?",
        tipo: "radio",
        opciones: JSON.stringify(["Si", "No"]),
        orden: 5,
        puntaje: JSON.stringify({ No: 15, Si: 0 }),
      },
      {
        texto: "Pueden saber cuales productos generan mas ventas?",
        tipo: "radio",
        opciones: JSON.stringify(["Si", "No"]),
        orden: 6,
        puntaje: JSON.stringify({ No: 10, Si: 0 }),
      },
    ],
  },
  {
    nombre: "Descubrir el Dolor",
    descripcion: "Identificar problemas y necesidades",
    icono: "AlertTriangle",
    orden: 2,
    route: "emprendedor_presencial",
    tipo: "questions",
    questions: [
      {
        texto: "Han tenido alguno de estos problemas?",
        tipo: "checklist",
        opciones: JSON.stringify([
          "Perder ventas por no saber si habia inventario",
          "Diferencias entre inventario real y registrado",
          "No saber cuanto se vende diariamente",
          "Errores al registrar ventas",
          "Problemas con empleados",
          "Mucho tiempo haciendo cuentas manuales",
          "No saber cuales productos son mas rentables",
          "Otro",
        ]),
        orden: 0,
        requerida: false,
        puntaje: JSON.stringify({
          "Perder ventas por no saber si habia inventario": 15,
          "Diferencias entre inventario real y registrado": 12,
          "No saber cuanto se vende diariamente": 12,
          "Errores al registrar ventas": 10,
          "Problemas con empleados": 8,
          "Mucho tiempo haciendo cuentas manuales": 10,
          "No saber cuales productos son mas rentables": 8,
          Otro: 5,
        }),
      },
    ],
  },
  {
    nombre: "Presentacion de Panitas",
    descripcion: "Beneficios segun las respuestas del diagnostico",
    icono: "Star",
    orden: 3,
    route: "emprendedor_presencial",
    tipo: "info",
    guiaVendedor: "Segun las respuestas, enfocate en estos beneficios:\n\n- Si usa cuaderno: Control de ventas digitales.\n- Si usa Excel: Automatizacion e inventario conectado.\n- Si tiene empleados: Control de usuarios y vendedores.\n- Si tiene muchos productos: Gestion avanzada de inventario.",
    questions: [],
  },
  {
    nombre: "Cierre",
    descripcion: "Evaluar interes y definir proxima accion",
    icono: "Target",
    orden: 4,
    route: "emprendedor_presencial",
    tipo: "questions",
    questions: [
      {
        texto: "Si pudieras saber exactamente que vendes, cuanto tienes disponible y como funciona tu negocio desde tu telefono, crees que esto resolveria un problema importante?",
        tipo: "radio",
        opciones: JSON.stringify(["Si", "No", "Necesito pensarlo"]),
        orden: 0,
        puntaje: JSON.stringify({ Si: 20, "Necesito pensarlo": 5, No: 0 }),
      },
    ],
  },
  {
    nombre: "Objeciones",
    descripcion: "Manejo de objeciones del prospecto",
    icono: "ShieldAlert",
    orden: 5,
    route: "emprendedor_presencial",
    tipo: "info",
    guiaVendedor: "Si el prospecto expresa una objecion, usa la respuesta sugerida:\n\n- 'Estoy bien con mi metodo actual' → Perfecto, muchos negocios empiezan asi. La pregunta es si ese metodo seguira funcionando cuando el negocio siga creciendo.\n- 'Esta caro' → Entiendo. La pregunta importante es cuanto cuesta actualmente no tener control sobre inventario, ventas o perdidas.\n- 'No tengo tiempo' → Justamente la idea es ahorrar tiempo, no agregar mas trabajo.\n- 'Tengo que pensarlo' → Claro. Para ayudarte mejor, que parte necesitas evaluar: inversion, funcionamiento o necesidad?",
    questions: [],
  },

  // ═══════════════════════════════════════════════
  // RUTA B — EMPRENDEDOR ONLINE
  // ═══════════════════════════════════════════════
  {
    nombre: "Apertura",
    descripcion: "Apertura para negocios que venden por redes",
    icono: "MessageCircle",
    orden: 0,
    route: "emprendedor_online",
    tipo: "info",
    guiaVendedor: "Estamos ayudando a negocios que venden por redes sociales a organizar mejor sus productos y facilitar las compras de sus clientes.",
    questions: [],
  },
  {
    nombre: "Diagnostico Digital",
    descripcion: "Como manejan sus ventas online actualmente",
    icono: "Globe",
    orden: 1,
    route: "emprendedor_online",
    tipo: "questions",
    questions: [
      {
        texto: "Actualmente venden por internet o redes sociales?",
        tipo: "radio",
        opciones: JSON.stringify(["Instagram", "WhatsApp", "Pagina web", "No venden online"]),
        orden: 0,
        puntaje: JSON.stringify({ "No venden online": 15, WhatsApp: 8, Instagram: 5, "Pagina web": 0 }),
      },
      {
        texto: "Cuando un cliente pregunta por un producto, como le muestran lo que tienen disponible?",
        tipo: "radio",
        opciones: JSON.stringify(["Fotos enviadas manualmente", "Catalogo", "Pagina web", "No tienen catalogo"]),
        orden: 1,
        puntaje: JSON.stringify({ "No tienen catalogo": 20, "Fotos enviadas manualmente": 15, Catalogo: 5, "Pagina web": 0 }),
      },
      {
        texto: "Tienen un inventario actualizado conectado con sus ventas?",
        tipo: "radio",
        opciones: JSON.stringify(["Si", "No"]),
        orden: 2,
        puntaje: JSON.stringify({ No: 15, Si: 0 }),
      },
      {
        texto: "Cuanto tiempo pasan respondiendo preguntas de productos y precios?",
        tipo: "radio",
        opciones: JSON.stringify(["Poco", "Varias horas al dia", "Mucho tiempo"]),
        orden: 3,
        puntaje: JSON.stringify({ "Mucho tiempo": 15, "Varias horas al dia": 10, Poco: 0 }),
      },
      {
        texto: "Alguna vez un cliente quiso comprar algo y ya no tenian disponibilidad?",
        tipo: "radio",
        opciones: JSON.stringify(["Si", "No"]),
        orden: 4,
        puntaje: JSON.stringify({ Si: 15, No: 0 }),
      },
    ],
  },
  {
    nombre: "Descubrir el Dolor",
    descripcion: "Identificar problemas con ventas online",
    icono: "AlertTriangle",
    orden: 2,
    route: "emprendedor_online",
    tipo: "questions",
    questions: [
      {
        texto: "Cuales de estos problemas han tenido?",
        tipo: "checklist",
        opciones: JSON.stringify([
          "Muchas preguntas repetidas por WhatsApp",
          "No tienen catalogo organizado",
          "Pierden ventas fuera del horario",
          "No saben que productos tienen disponibles",
          "Publican productos que ya no tienen",
          "Les cuesta mostrar todos sus productos",
        ]),
        orden: 0,
        requerida: false,
        puntaje: JSON.stringify({
          "Muchas preguntas repetidas por WhatsApp": 12,
          "No tienen catalogo organizado": 15,
          "Pierden ventas fuera del horario": 15,
          "No saben que productos tienen disponibles": 12,
          "Publican productos que ya no tienen": 15,
          "Les cuesta mostrar todos sus productos": 10,
        }),
      },
    ],
  },
  {
    nombre: "Presentacion de Panitas",
    descripcion: "Beneficios segun las respuestas del diagnostico digital",
    icono: "Star",
    orden: 3,
    route: "emprendedor_online",
    tipo: "info",
    guiaVendedor: "Segun las respuestas, enfocate en estos beneficios:\n\n- Si vende por Instagram: Catalogo online.\n- Si tiene muchos productos: Inventario conectado.\n- Si pierde ventas: Compra disponible 24/7.",
    questions: [],
  },
  {
    nombre: "Cierre",
    descripcion: "Evaluar interes y definir proxima accion",
    icono: "Target",
    orden: 4,
    route: "emprendedor_online",
    tipo: "questions",
    questions: [
      {
        texto: "Si tus clientes pudieran ver tus productos disponibles y comprar sin tener que preguntarte todo por WhatsApp, crees que ayudaria a vender mas?",
        tipo: "radio",
        opciones: JSON.stringify(["Si", "No", "Quiero verlo"]),
        orden: 0,
        puntaje: JSON.stringify({ Si: 20, "Quiero verlo": 10, No: 0 }),
      },
    ],
  },
  {
    nombre: "Objeciones",
    descripcion: "Manejo de objeciones del prospecto online",
    icono: "ShieldAlert",
    orden: 5,
    route: "emprendedor_online",
    tipo: "info",
    guiaVendedor: "Si el prospecto expresa una objecion, usa la respuesta sugerida:\n\n- 'Mis clientes compran por WhatsApp' → Perfecto, WhatsApp seguira funcionando. La tienda online ayuda a organizar ese proceso y evita perder tiempo enviando informacion repetida.\n- 'No necesito una pagina' → No se trata solo de una pagina, sino de tener tus productos organizados y disponibles para tus clientes.\n- 'Esta caro' → Entiendo. La pregunta importante es cuanto cuesta actualmente no tener control sobre inventario, ventas o perdidas.\n- 'No tengo tiempo' → Justamente la idea es ahorrar tiempo, no agregar mas trabajo.\n- 'Tengo que pensarlo' → Claro. Para ayudarte mejor, que parte necesitas evaluar: inversion, funcionamiento o necesidad?",
    questions: [],
  },

  // ═══════════════════════════════════════════════
  // PLAN AGENDA — RUTA A: SALUD Y PROFESIONALES MEDICOS
  // ═══════════════════════════════════════════════
  {
    nombre: "Apertura",
    descripcion: "Apertura para profesionales de la salud",
    icono: "MessageCircle",
    orden: 0,
    route: "agenda_salud",
    tipo: "info",
    guiaVendedor: "NO empezar hablando del sistema.\n\nBuenos dias, estamos ayudando a profesionales a organizar mejor sus citas y la atencion de sus pacientes. Queria hacerle unas preguntas para conocer como manejan actualmente su agenda.",
    questions: [],
  },
  {
    nombre: "Diagnostico",
    descripcion: "Como maneja actualmente sus consultas",
    icono: "Stethoscope",
    orden: 1,
    route: "agenda_salud",
    tipo: "questions",
    questions: [
      {
        texto: "Como agenda actualmente sus consultas?",
        tipo: "radio",
        opciones: JSON.stringify(["Agenda fisica", "WhatsApp", "Llamadas telefonicas", "Excel", "Sistema especializado", "Otro"]),
        orden: 0,
        puntaje: JSON.stringify({ "Agenda fisica": 15, WhatsApp: 12, "Llamadas telefonicas": 12, Excel: 8, "Sistema especializado": 0, Otro: 10 }),
      },
      {
        texto: "Quien administra actualmente las citas?",
        tipo: "radio",
        opciones: JSON.stringify(["Yo personalmente", "Secretaria", "Asistente", "Varias personas"]),
        orden: 1,
        puntaje: JSON.stringify({ "Yo personalmente": 15, Secretaria: 8, Asistente: 8, "Varias personas": 0 }),
      },
      {
        texto: "Cuantas consultas realiza aproximadamente por semana?",
        tipo: "radio",
        opciones: JSON.stringify(["Menos de 10", "10-30", "30-50", "Mas de 50"]),
        orden: 2,
        puntaje: JSON.stringify({ "Mas de 50": 15, "30-50": 12, "10-30": 8, "Menos de 10": 0 }),
      },
      {
        texto: "Cuando un paciente quiere una cita, que debe hacer?",
        tipo: "radio",
        opciones: JSON.stringify(["Escribir por WhatsApp", "Llamar", "Esperar respuesta", "Reservar online"]),
        orden: 3,
        puntaje: JSON.stringify({ "Esperar respuesta": 15, "Escribir por WhatsApp": 12, Llamar: 10, "Reservar online": 0 }),
      },
      {
        texto: "Cuales problemas ha tenido con su agenda?",
        tipo: "checklist",
        opciones: JSON.stringify([
          "Pacientes olvidan citas",
          "Cruce de horarios",
          "Mucho tiempo respondiendo mensajes",
          "Dificultad organizando disponibilidad",
          "No tiene historial organizado",
          "Ninguno",
        ]),
        orden: 4,
        requerida: false,
        puntaje: JSON.stringify({
          "Pacientes olvidan citas": 12,
          "Cruce de horarios": 15,
          "Mucho tiempo respondiendo mensajes": 15,
          "Dificultad organizando disponibilidad": 12,
          "No tiene historial organizado": 10,
          Ninguno: 0,
        }),
      },
    ],
  },
  {
    nombre: "Detectar el Dolor",
    descripcion: "Profundizar en problemas de organizacion",
    icono: "AlertTriangle",
    orden: 2,
    route: "agenda_salud",
    tipo: "questions",
    questions: [
      {
        texto: "Cuanto tiempo dedica al dia coordinando citas?",
        tipo: "radio",
        opciones: JSON.stringify(["Menos de 15 minutos", "15-30 minutos", "Mas de 30 minutos", "Mas de una hora"]),
        orden: 0,
        puntaje: JSON.stringify({ "Mas de una hora": 20, "Mas de 30 minutos": 15, "15-30 minutos": 8, "Menos de 15 minutos": 0 }),
      },
      {
        texto: "Puede saber facilmente cuantas consultas realizo este mes?",
        tipo: "radio",
        opciones: JSON.stringify(["Si", "No"]),
        orden: 1,
        puntaje: JSON.stringify({ No: 15, Si: 0 }),
      },
      {
        texto: "Tiene informacion organizada de sus pacientes?",
        tipo: "radio",
        opciones: JSON.stringify(["Si", "No"]),
        orden: 2,
        puntaje: JSON.stringify({ No: 15, Si: 0 }),
      },
    ],
  },
  {
    nombre: "Educacion del Vendedor",
    descripcion: "Preparar argumentos de valor",
    icono: "GraduationCap",
    orden: 3,
    route: "agenda_salud",
    tipo: "info",
    guiaVendedor: "NO vender una 'agenda online'. Vender:\n\n- Organizacion profesional.\n- Mejor experiencia del paciente.\n- Menos tiempo administrativo.\n- Menos errores de horarios.\n- Mayor control de consultas.\n\nMensaje central: 'Panitas ayuda a profesionales a organizar sus citas y permitir que sus pacientes puedan reservar de forma sencilla.'",
    questions: [],
  },
  {
    nombre: "Presentacion",
    descripcion: "Argumentos personalizados segun respuestas",
    icono: "Star",
    orden: 4,
    route: "agenda_salud",
    tipo: "info",
    guiaVendedor: "Segun las respuestas, enfocate en el argumento que mas conecte:\n\n- Si usa WhatsApp: 'Actualmente muchas consultas dependen de responder mensajes constantemente. Panitas permite organizar ese proceso.'\n- Si tiene asistente: 'Panitas ayuda a que todo el equipo pueda manejar las citas de manera ordenada.'\n- Si pierde citas: 'Una cita perdida representa tiempo que pudo convertirse en ingreso.'",
    questions: [],
  },
  {
    nombre: "Demostracion",
    descripcion: "Que mostrar durante la demo",
    icono: "Monitor",
    orden: 5,
    route: "agenda_salud",
    tipo: "info",
    guiaVendedor: "Mostrar en este orden:\n\n1. Perfil profesional del doctor.\n2. Servicios que ofrece.\n3. Horarios disponibles.\n4. Enlace de reserva.\n5. Como un paciente agenda cita.\n6. Calendario profesional.\n7. Estadisticas de consultas.",
    questions: [],
  },
  {
    nombre: "Cierre",
    descripcion: "Evaluar interes y definir proxima accion",
    icono: "Target",
    orden: 6,
    route: "agenda_salud",
    tipo: "questions",
    questions: [
      {
        texto: "Si sus pacientes pudieran solicitar una cita sin tener que esperar respuesta y usted tuviera toda su agenda organizada, crees que mejoraria su proceso?",
        tipo: "radio",
        opciones: JSON.stringify(["Si", "No", "Necesito pensarlo"]),
        orden: 0,
        puntaje: JSON.stringify({ Si: 20, "Necesito pensarlo": 5, No: 0 }),
      },
    ],
  },
  {
    nombre: "Objeciones",
    descripcion: "Manejo de objeciones — salud",
    icono: "ShieldAlert",
    orden: 7,
    route: "agenda_salud",
    tipo: "info",
    guiaVendedor: "Si el prospecto expresa una objecion, usa la respuesta sugerida:\n\n- 'Mis pacientes usan WhatsApp' → Perfecto, WhatsApp puede seguir funcionando. Panitas simplemente organiza el proceso para evitar perder tiempo coordinando horarios.\n- 'Tengo pocos pacientes' → Precisamente cuando se esta creciendo es el mejor momento para organizar la atencion.\n- 'No quiero complicar a mis pacientes' → La experiencia es muy sencilla: el paciente selecciona servicio, horario y confirma.\n- 'Esta caro' → Entiendo. La pregunta es cuantas horas al mes dedica a coordinar citas manualmente. Eso tiene un costo tambien.",
    questions: [],
  },

  // ═══════════════════════════════════════════════
  // PLAN AGENDA — RUTA B: BARBERIAS, BELLEZA Y ESTETICA
  // ═══════════════════════════════════════════════
  {
    nombre: "Apertura",
    descripcion: "Apertura para negocios de belleza",
    icono: "MessageCircle",
    orden: 0,
    route: "agenda_belleza",
    tipo: "info",
    guiaVendedor: "Estamos ayudando a negocios de belleza a organizar sus reservas y aprovechar mejor sus horarios. Queria conocer como manejan actualmente las citas.",
    questions: [],
  },
  {
    nombre: "Diagnostico",
    descripcion: "Como manejan las reservas actualmente",
    icono: "Scissors",
    orden: 1,
    route: "agenda_belleza",
    tipo: "questions",
    questions: [
      {
        texto: "Que tipo de negocio tienes?",
        tipo: "radio",
        opciones: JSON.stringify(["Barberia", "Salon de belleza", "Spa", "Uñas", "Pestañas", "Masajes", "Estetica", "Otro"]),
        orden: 0,
        puntaje: JSON.stringify({ Barberia: 5, "Salon de belleza": 5, Spa: 5, "Uñas": 5, Pestañas: 5, Masajes: 5, Estetica: 5, Otro: 5 }),
      },
      {
        texto: "Como reservan actualmente tus clientes?",
        tipo: "radio",
        opciones: JSON.stringify(["WhatsApp", "Instagram", "Llamadas", "Llegan directamente", "Agenda fisica"]),
        orden: 1,
        puntaje: JSON.stringify({ WhatsApp: 12, Instagram: 10, Llamadas: 10, "Llegan directamente": 15, "Agenda fisica": 12 }),
      },
      {
        texto: "Cuantas personas atienden clientes?",
        tipo: "radio",
        opciones: JSON.stringify(["Solo yo", "2 personas", "3-5 personas", "Mas de 5"]),
        orden: 2,
        puntaje: JSON.stringify({ "Solo yo": 5, "2 personas": 8, "3-5 personas": 12, "Mas de 5": 15 }),
      },
      {
        texto: "Tienen horarios disponibles que quedan sin clientes?",
        tipo: "radio",
        opciones: JSON.stringify(["Nunca", "Algunas veces", "Frecuentemente"]),
        orden: 3,
        puntaje: JSON.stringify({ Frecuentemente: 15, "Algunas veces": 10, Nunca: 0 }),
      },
      {
        texto: "Han perdido clientes por tardar en responder mensajes?",
        tipo: "radio",
        opciones: JSON.stringify(["Si", "No"]),
        orden: 4,
        puntaje: JSON.stringify({ Si: 20, No: 0 }),
      },
    ],
  },
  {
    nombre: "Educacion del Cliente Final",
    descripcion: "Preparar al vendedor para explicar a clientes",
    icono: "GraduationCap",
    orden: 2,
    route: "agenda_belleza",
    tipo: "info",
    guiaVendedor: "Objetivo: Preparar al vendedor para explicar que los clientes aprenderan poco a poco.\n\nMensaje clave: 'Al principio tus clientes pueden seguir escribiendote por WhatsApp. La idea es ensenarles progresivamente a utilizar tu enlace de reservas.'\n\nEjemplo para el vendedor:\n'Cuando un cliente termine su servicio puedes decirle: Para tu proxima cita puedes entrar a este enlace, elegir tu servicio y escoger el horario que prefieras.'",
    questions: [],
  },
  {
    nombre: "Nuevas Preguntas",
    descripcion: "Profundizar en la experiencia de reserva",
    icono: "HelpCircle",
    orden: 3,
    route: "agenda_belleza",
    tipo: "questions",
    questions: [
      {
        texto: "Actualmente tus clientes deben preguntarte disponibilidad antes de reservar?",
        tipo: "radio",
        opciones: JSON.stringify(["Si siempre", "Algunas veces", "No"]),
        orden: 0,
        puntaje: JSON.stringify({ "Si siempre": 15, "Algunas veces": 8, No: 0 }),
      },
      {
        texto: "Tus clientes usan WhatsApp o redes sociales frecuentemente?",
        tipo: "radio",
        opciones: JSON.stringify(["Mucho", "Regular", "Poco"]),
        orden: 1,
        puntaje: JSON.stringify({ Mucho: 10, Regular: 5, Poco: 0 }),
      },
      {
        texto: "Te gustaria que tus clientes pudieran reservar directamente desde tu WhatsApp?",
        tipo: "radio",
        opciones: JSON.stringify(["Si", "No", "Quiero verlo"]),
        orden: 2,
        puntaje: JSON.stringify({ Si: 15, "Quiero verlo": 10, No: 0 }),
      },
    ],
  },
  {
    nombre: "Presentacion",
    descripcion: "Argumentos personalizados segun respuestas",
    icono: "Star",
    orden: 4,
    route: "agenda_belleza",
    tipo: "info",
    guiaVendedor: "Segun las respuestas, enfocate en el argumento que mas conecte:\n\n- Si pierde tiempo en WhatsApp: 'Panitas permite automatizar la parte repetitiva de coordinar horarios.'\n- Si tiene horarios vacios: 'Cada espacio libre representa una oportunidad de ingreso perdida.'\n- Si tiene clientes frecuentes: 'Puedes ensenarles a reservar directamente y ahorrar tiempo.'",
    questions: [],
  },
  {
    nombre: "Demostracion",
    descripcion: "Que mostrar durante la demo",
    icono: "Monitor",
    orden: 5,
    route: "agenda_belleza",
    tipo: "info",
    guiaVendedor: "Mostrar en este orden:\n\n1. Perfil del negocio.\n2. Servicios que ofrece.\n3. Precios visibles.\n4. Link de reserva.\n5. Cliente seleccionando servicio.\n6. Cliente seleccionando horario.\n7. Reserva confirmada.\n8. Agenda del negocio.\n9. Estadisticas de reservas.",
    questions: [],
  },
  {
    nombre: "Cierre",
    descripcion: "Evaluar interes y definir proxima accion",
    icono: "Target",
    orden: 6,
    route: "agenda_belleza",
    tipo: "questions",
    questions: [
      {
        texto: "Si tus clientes pudieran entrar desde tu WhatsApp, ver horarios disponibles y reservar sin esperar respuesta, crees que seria mas comodo para ellos y para ti?",
        tipo: "radio",
        opciones: JSON.stringify(["Si", "No", "Necesito pensarlo"]),
        orden: 0,
        puntaje: JSON.stringify({ Si: 20, "Necesito pensarlo": 5, No: 0 }),
      },
    ],
  },
  {
    nombre: "Objeciones",
    descripcion: "Manejo de objeciones — belleza",
    icono: "ShieldAlert",
    orden: 7,
    route: "agenda_belleza",
    tipo: "info",
    guiaVendedor: "Si el prospecto expresa una objecion, usa la respuesta sugerida:\n\n- 'Mis clientes no saben usar eso' → No necesitan aprender todo de golpe. Puedes empezar con clientes nuevos o frecuentes. Despues de usarlo una vez, el proceso es muy sencillo.\n- 'Mis clientes prefieren WhatsApp' → WhatsApp seguira funcionando. El enlace simplemente evita que tengas que responder siempre las mismas preguntas.\n- 'No quiero cambiar mi forma de trabajar' → La idea no es cambiar todo de golpe, sino ayudarte a organizar mejor el proceso.\n- 'Esta caro' → Entiendo. Piensa cuantas horas a la semana dedicas a responder mensajes de reservas. Ese tiempo tiene un costo.",
    questions: [],
  },

  // ═══════════════════════════════════════════════
  // PLAN EMPRESARIAL — PLACEHOLDER
  // ═══════════════════════════════════════════════
  {
    nombre: "Proximamente",
    descripcion: "Guion especializado en desarrollo",
    icono: "Clock",
    orden: 0,
    route: "empresarial_default",
    tipo: "info",
    guiaVendedor: "El guion de venta para Plan Empresarial esta en desarrollo proximamente. Por ahora, puedes usar el cuestionario general para evaluar al prospecto.",
    questions: [],
  },
]

async function seedSalesQuestions() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  })

  await client.connect()
  console.log("Connected to database")

  // Clean existing data
  console.log("Cleaning existing sales script data...")
  await client.query('DELETE FROM "SalesAnswer"')
  await client.query('DELETE FROM "SalesSession"')
  await client.query('DELETE FROM "SalesScoringRule"')
  await client.query('DELETE FROM "SalesPlanRecommendation"')
  await client.query('DELETE FROM "SalesQuestion"')
  await client.query('DELETE FROM "SalesSection"')
  console.log("  Cleaned all sales script data")

  // Seed sections and questions
  console.log("\nSeeding sections and questions...")
  for (const sectionData of SECTIONS) {
    const sectionResult = await client.query(
      `INSERT INTO "SalesSection" (id, nombre, descripcion, icono, "route", tipo, "guiaVendedor", orden, activo, "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
       RETURNING id`,
      [sectionData.nombre, sectionData.descripcion, sectionData.icono, sectionData.route, sectionData.tipo, sectionData.guiaVendedor || null, sectionData.orden]
    )
    const sectionId = sectionResult.rows[0].id

    for (const qData of sectionData.questions) {
      await client.query(
        `INSERT INTO "SalesQuestion" (id, texto, tipo, opciones, orden, requerida, puntaje, placeholder, subtexto, "condicionLogica", metadata, "sectionId", activo, "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4::int, $5, $6, $7, $8, $9, $10, $11, true, NOW(), NOW())`,
        [
          qData.texto,
          qData.tipo,
          qData.opciones || null,
          qData.orden,
          qData.requerida !== false,
          qData.puntaje || null,
          qData.placeholder || null,
          qData.subtexto || null,
          qData.condicionLogica || null,
          qData.metadata || null,
          sectionId,
        ]
      )
    }
    console.log(`  [${sectionData.route}] ${sectionData.nombre} (${sectionData.questions.length} questions, ${sectionData.tipo})`)
  }

  // Seed scoring rules — all routes
  const scoringRules = [
    // Route A — Emprendedor Presencial
    { nombre: "Sin sistema administrativo", campo: "ventas_registro", valor: "No registran", puntos: 20, route: "emprendedor_presencial" },
    { nombre: "Usa Excel para ventas", campo: "ventas_registro", valor: "Excel", puntos: 10, route: "emprendedor_presencial" },
    { nombre: "Sin control de inventario", campo: "inventario", valor: "No llevan control", puntos: 20, route: "emprendedor_presencial" },
    { nombre: "Inventario en memoria", campo: "inventario", valor: "Memoria", puntos: 18, route: "emprendedor_presencial" },
    { nombre: "No puede verificar disponibilidad", campo: "disponibilidad", valor: "No", puntos: 15, route: "emprendedor_presencial" },
    { nombre: "No sabe cuanto vende al dia", campo: "ventas_diarias", valor: "No", puntos: 15, route: "emprendedor_presencial" },
    { nombre: "Perdio ventas por falta de inventario", campo: "dolor_checklist", valor: "Perder ventas por no saber si habia inventario", puntos: 15, route: "emprendedor_presencial" },
    { nombre: "Diferencias en inventario", campo: "dolor_checklist", valor: "Diferencias entre inventario real y registrado", puntos: 12, route: "emprendedor_presencial" },
    { nombre: "Quiere solucion", campo: "cierre", valor: "Si", puntos: 20, route: "emprendedor_presencial" },

    // Route B — Emprendedor Online
    { nombre: "No venden online", campo: "ventas_online", valor: "No venden online", puntos: 15, route: "emprendedor_online" },
    { nombre: "No tiene catalogo", campo: "catalogo", valor: "No tienen catalogo", puntos: 20, route: "emprendedor_online" },
    { nombre: "Fotos manuales", campo: "catalogo", valor: "Fotos enviadas manualmente", puntos: 15, route: "emprendedor_online" },
    { nombre: "Sin inventario conectado", campo: "inventario_online", valor: "No", puntos: 15, route: "emprendedor_online" },
    { nombre: "Mucho tiempo respondiendo", campo: "tiempo_respuestas", valor: "Mucho tiempo", puntos: 15, route: "emprendedor_online" },
    { nombre: "Preguntas repetidas WhatsApp", campo: "dolor_online_checklist", valor: "Muchas preguntas repetidas por WhatsApp", puntos: 12, route: "emprendedor_online" },
    { nombre: "Sin catalogo organizado", campo: "dolor_online_checklist", valor: "No tienen catalogo organizado", puntos: 15, route: "emprendedor_online" },
    { nombre: "Pierde ventas fuera horario", campo: "dolor_online_checklist", valor: "Pierden ventas fuera del horario", puntos: 15, route: "emprendedor_online" },
    { nombre: "Quiere vender mas", campo: "cierre_online", valor: "Si", puntos: 20, route: "emprendedor_online" },

    // Route C — Agenda Salud
    { nombre: "Agenda fisica", campo: "agenda_actual", valor: "Agenda fisica", puntos: 15, route: "agenda_salud" },
    { nombre: "WhatsApp para citas", campo: "agenda_actual", valor: "WhatsApp", puntos: 12, route: "agenda_salud" },
    { nombre: "Llamadas para citas", campo: "agenda_actual", valor: "Llamadas telefonicas", puntos: 12, route: "agenda_salud" },
    { nombre: "El dueno administra citas", campo: "administra_citas", valor: "Yo personalmente", puntos: 15, route: "agenda_salud" },
    { nombre: "Paciente debe escribir", campo: "reserva_paciente", valor: "Escribir por WhatsApp", puntos: 12, route: "agenda_salud" },
    { nombre: "Paciente debe esperar", campo: "reserva_paciente", valor: "Esperar respuesta", puntos: 15, route: "agenda_salud" },
    { nombre: "Pierde tiempo coordinando", campo: "tiempo_coordinacion", valor: "Mas de una hora", puntos: 20, route: "agenda_salud" },
    { nombre: "Mucho tiempo coordinando", campo: "tiempo_coordinacion", valor: "Mas de 30 minutos", puntos: 15, route: "agenda_salud" },
    { nombre: "No sabe consultas del mes", campo: "info_organizada", valor: "No", puntos: 15, route: "agenda_salud" },
    { nombre: "Sin info de pacientes", campo: "info_pacientes", valor: "No", puntos: 15, route: "agenda_salud" },
    { nombre: "Pacientes olvidan citas", campo: "dolor_agenda_checklist", valor: "Pacientes olvidan citas", puntos: 12, route: "agenda_salud" },
    { nombre: "Cruce de horarios", campo: "dolor_agenda_checklist", valor: "Cruce de horarios", puntos: 15, route: "agenda_salud" },
    { nombre: "Mucho tiempo mensajes", campo: "dolor_agenda_checklist", valor: "Mucho tiempo respondiendo mensajes", puntos: 15, route: "agenda_salud" },
    { nombre: "Quiere mejorar proceso", campo: "cierre_agenda_salud", valor: "Si", puntos: 20, route: "agenda_salud" },

    // Route D — Agenda Belleza
    { nombre: "Reservan por WhatsApp", campo: "metodo_reserva", valor: "WhatsApp", puntos: 12, route: "agenda_belleza" },
    { nombre: "Llegan directamente", campo: "metodo_reserva", valor: "Llegan directamente", puntos: 15, route: "agenda_belleza" },
    { nombre: "Llaman para reservar", campo: "metodo_reserva", valor: "Llamadas", puntos: 10, route: "agenda_belleza" },
    { nombre: "Horarios sin clientes", campo: "horarios_vacios", valor: "Frecuentemente", puntos: 15, route: "agenda_belleza" },
    { nombre: "Algunos horarios vacios", campo: "horarios_vacios", valor: "Algunas veces", puntos: 10, route: "agenda_belleza" },
    { nombre: "Perdieron clientes", campo: "clientes_perdidos", valor: "Si", puntos: 20, route: "agenda_belleza" },
    { nombre: "Clientes preguntan disponibilidad", campo: "disponibilidad_cliente", valor: "Si siempre", puntos: 15, route: "agenda_belleza" },
    { nombre: "Clientes usan WhatsApp mucho", campo: "redes_clientes", valor: "Mucho", puntos: 10, route: "agenda_belleza" },
    { nombre: "Quiere reservas directas", campo: "reservas_directas", valor: "Si", puntos: 15, route: "agenda_belleza" },
    { nombre: "Quiere ver demo", campo: "reservas_directas", valor: "Quiero verlo", puntos: 10, route: "agenda_belleza" },
    { nombre: "Quiere organizar belleza", campo: "cierre_agenda_belleza", valor: "Si", puntos: 20, route: "agenda_belleza" },
  ]

  for (const rule of scoringRules) {
    await client.query(
      `INSERT INTO "SalesScoringRule" (id, nombre, campo, valor, puntos, route, operador, activo, "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4::int, $5, 'equals', true, NOW(), NOW())`,
      [rule.nombre, rule.campo, rule.valor, rule.puntos, rule.route]
    )
  }
  console.log(`\n  ${scoringRules.length} scoring rules seeded`)

  // Seed plan recommendation rules
  const planRules = [
    { plan: "agenda", route: "agenda_salud", min: 0, max: 100, desc: "Profesionales de salud que necesitan organizar citas y mejorar la experiencia del paciente" },
    { plan: "agenda", route: "agenda_belleza", min: 0, max: 100, desc: "Negocios de belleza que necesitan organizar reservas y aprovechar horarios" },
    { plan: "emprendedor", route: "emprendedor_presencial", min: 26, max: 55, desc: "Negocios presenciales que necesitan control de inventario y ventas" },
    { plan: "emprendedor", route: "emprendedor_online", min: 26, max: 55, desc: "Negocios online que necesitan catalogo e inventario conectado" },
    { plan: "empresarial", route: "empresarial_default", min: 56, max: 100, desc: "Negocios grandes con multi-sucursal y necesidades avanzadas" },
  ]

  for (const rule of planRules) {
    await client.query(
      `INSERT INTO "SalesPlanRecommendation" (id, plan, route, "minPuntuacion", "maxPuntuacion", descripcion, activo, "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3::int, $4::int, $5, true, NOW(), NOW())`,
      [rule.plan, rule.route, rule.min, rule.max, rule.desc]
    )
  }
  console.log(`  ${planRules.length} plan recommendation rules seeded`)

  await client.end()
  console.log("\nDone! Sales script seeded successfully.")
}

seedSalesQuestions().catch((e) => {
  console.error("Seed failed:", e)
  process.exit(1)
})
