import type { PrismaClient } from "@prisma/client"

type Section = {
  nombre: string; descripcion: string; icono: string; orden: number; route: string; tipo: string;
  guiaVendedor?: string; questions: Question[]
}
type Question = {
  texto: string; tipo: string; opciones?: string; orden: number; requerida?: boolean;
  puntaje?: string; painDetected?: string | null; salesArgument?: string | null;
  placeholder?: string; subtexto?: string; condicionLogica?: string
}
type ScoringRule = { nombre: string; campo: string; valor: string; puntos: number; route: string }
type PlanRule = { plan: string; route: string; min: number; max: number; desc: string }

export const SECTIONS: Section[] = [
  {
    nombre: "Apertura", descripcion: "No empezar vendiendo el sistema", icono: "MessageCircle", orden: 0, route: "emprendedor_presencial", tipo: "info",
    guiaVendedor: "No empezar hablando del sistema.\n\nBuenos dias, estamos ayudando a negocios de la zona a organizar mejor sus ventas e inventario. Queria hacerle unas preguntas para conocer como manejan actualmente el negocio.",
    questions: [],
  },
  {
    nombre: "Diagnostico del Negocio", descripcion: "Como funciona el negocio actualmente", icono: "Building", orden: 1, route: "emprendedor_presencial", tipo: "questions",
    questions: [
      { texto: "Cuantos anos tiene funcionando el negocio?", tipo: "radio", opciones: '["Menos de 1 ano","1-3 anos","3-5 anos","Mas de 5 anos"]', orden: 0, painDetected: null, salesArgument: null },
      { texto: "Cuantos productos manejan aproximadamente?", tipo: "radio", opciones: '["Menos de 50","50-200","200-500","Mas de 500"]', orden: 1, puntaje: '{"200-500":20,"Mas de 500":20,"50-200":8,"Menos de 50":0}', painDetected: null, salesArgument: null },
      { texto: "Como registran actualmente sus ventas?", tipo: "radio", opciones: '["Sistema POS","Excel","Cuaderno","Calculadora","No registramos"]', orden: 2, puntaje: '{"No registramos":30,"Cuaderno":20,"Calculadora":15,"Excel":15,"Sistema POS":0}', painDetected: null, salesArgument: null },
      { texto: "Como controlan actualmente el inventario?", tipo: "radio", opciones: '["Sistema","Excel","Cuaderno","Memoria","No tenemos control"]', orden: 3, puntaje: '{"No tenemos control":35,"Memoria":30,"Cuaderno":20,"Excel":10,"Sistema":0}', painDetected: null, salesArgument: null },
      { texto: "Cuando un cliente pregunta por un producto, pueden saber inmediatamente si tienen disponibilidad?", tipo: "radio", opciones: '["Si siempre","Algunas veces","No"]', orden: 4, puntaje: '{"No":15,"Algunas veces":8,"Si siempre":0}', painDetected: '{"Algunas veces":"Inventario poco confiable","No":"Pierde ventas por falta de informacion"}', salesArgument: null },
      { texto: "Quien actualiza actualmente el inventario?", tipo: "radio", opciones: '["Dueno","Empleado","Varias personas","Nadie"]', orden: 5, painDetected: '{"Nadie":"Falta de control operativo"}', salesArgument: null, puntaje: '{}' },
      { texto: "Realizan cierre diario de caja?", tipo: "radio", opciones: '["Si","No"]', orden: 6, puntaje: '{"No":20,"Si":0}', painDetected: '{"No":"No tiene control diario del dinero"}', salesArgument: null },
      { texto: "Pueden saber cuanto vendieron ayer, esta semana o este mes?", tipo: "radio", opciones: '["Si facilmente","Tengo que revisar manualmente","No puedo saberlo"]', orden: 7, puntaje: '{"No puedo saberlo":30,"Tengo que revisar manualmente":10,"Si facilmente":0}', painDetected: null, salesArgument: null },
      { texto: "Saben cuales productos son los que mas venden?", tipo: "radio", opciones: '["Si","No"]', orden: 8, puntaje: '{"No":10,"Si":0}', painDetected: '{"No":"Falta de informacion comercial"}', salesArgument: null },
      { texto: "Tienen empleados que realizan ventas?", tipo: "radio", opciones: '["No","1 empleado","2-5 empleados","Mas de 5"]', orden: 9, puntaje: '{"Mas de 5":20,"2-5 empleados":20,"1 empleado":5,"No":0}', painDetected: null, salesArgument: null },
      { texto: "Han tenido problemas como?", tipo: "checklist", opciones: '["Diferencias de inventario","Productos perdidos","Errores al cobrar","No saber cuanto dinero hay","Empleados sin control","Mucho tiempo haciendo cuentas","Ninguno"]', orden: 10, requerida: false, puntaje: '{"Diferencias de inventario":10,"Productos perdidos":10,"Errores al cobrar":10,"No saber cuanto dinero hay":10,"Empleados sin control":10,"Mucho tiempo haciendo cuentas":10,"Ninguno":0}', painDetected: null, salesArgument: null },
      { texto: "Que le gustaria mejorar principalmente?", tipo: "radio", opciones: '["Controlar mejor el inventario","Saber cuanto vende","Evitar perdidas","Controlar empleados","Organizar mejor el negocio"]', orden: 11, puntaje: '{}', painDetected: null, salesArgument: null },
    ],
  },
  {
    nombre: "Presentacion de Panitas", descripcion: "Argumentos automaticos segun respuestas", icono: "Star", orden: 2, route: "emprendedor_presencial", tipo: "info",
    guiaVendedor: "Segun las respuestas, usa estos argumentos:\n\n- Si usa cuaderno: 'Muchos negocios comienzan asi, pero cuando aumentan las ventas se vuelve dificil mantener el control.'\n- Si tiene muchos productos (200+): 'Panitas permite saber que tienes disponible y que productos necesitan reposicion.'\n- Si tiene empleados (2+): 'Puedes saber que ventas realiza cada persona.'\n- Si no sabe ventas diarias: 'El dueno debe tener informacion del negocio aunque no este presente.'",
    questions: [],
  },
  {
    nombre: "Objeciones", descripcion: "Manejo de objeciones", icono: "ShieldAlert", orden: 3, route: "emprendedor_presencial", tipo: "info",
    guiaVendedor: "Si el prospecto expresa una objecion, usa la respuesta sugerida:\n\n- 'Estoy bien con mi metodo actual' → Perfecto, muchos negocios empiezan asi. La pregunta es si ese metodo seguira funcionando cuando el negocio siga creciendo.\n- 'Esta caro' → Entiendo. La pregunta importante es cuanto cuesta actualmente no tener control sobre inventario, ventas o perdidas.\n- 'No tengo tiempo' → Justamente la idea es ahorrar tiempo, no agregar mas trabajo.\n- 'Tengo que pensarlo' → Claro. Para ayudarte mejor, que parte necesitas evaluar: inversion, funcionamiento o necesidad?",
    questions: [],
  },
  {
    nombre: "Apertura", descripcion: "Apertura para venta online", icono: "MessageCircle", orden: 0, route: "emprendedor_online", tipo: "info",
    guiaVendedor: "Estamos ayudando a negocios que venden por redes sociales a organizar mejor sus productos y facilitar las compras de sus clientes. Queria hacerle unas preguntas para conocer como manejan actualmente las ventas online.",
    questions: [],
  },
  {
    nombre: "Diagnostico Digital", descripcion: "Como manejan sus ventas online actualmente", icono: "Globe", orden: 1, route: "emprendedor_online", tipo: "questions",
    questions: [
      { texto: "Actualmente vende por redes sociales?", tipo: "checklist", opciones: '["Instagram","WhatsApp","Facebook","No vendo online"]', orden: 0, requerida: false, puntaje: '{"Instagram":15,"WhatsApp":15,"Facebook":10,"No vendo online":5}', painDetected: null, salesArgument: null },
      { texto: "Como muestran actualmente sus productos a los clientes?", tipo: "radio", opciones: '["Fotos por WhatsApp","Catalogo PDF","Instagram","Pagina web","No tengo catalogo"]', orden: 1, puntaje: '{"No tengo catalogo":20,"Fotos por WhatsApp":15,"Catalogo PDF":5,"Instagram":5,"Pagina web":0}', painDetected: null, salesArgument: null },
      { texto: "Cuantos productos tiene aproximadamente?", tipo: "radio", opciones: '["Menos de 50","50-200","Mas de 200"]', orden: 2, puntaje: '{}', painDetected: null, salesArgument: null },
      { texto: "Cuando vende un producto, como actualiza la disponibilidad?", tipo: "radio", opciones: '["Manualmente","Revisando inventario","No actualizo"]', orden: 3, painDetected: '{"No actualizo":"Puede vender productos agotados"}', salesArgument: null, puntaje: '{}' },
      { texto: "Cuanto tiempo pasa respondiendo preguntas de clientes?", tipo: "radio", opciones: '["Poco","1 hora diaria","Varias horas diarias"]', orden: 4, puntaje: '{"Varias horas diarias":25,"1 hora diaria":10,"Poco":0}', painDetected: null, salesArgument: null },
      { texto: "Alguna vez perdio una venta porque tardo en responder?", tipo: "radio", opciones: '["Si","No"]', orden: 5, puntaje: '{"Si":25,"No":0}', painDetected: null, salesArgument: null },
      { texto: "Sus clientes pueden ver todos sus productos disponibles?", tipo: "radio", opciones: '["Si","No"]', orden: 6, painDetected: '{"No":"Clientes no conocen todo el catalogo"}', salesArgument: null, puntaje: '{}' },
      { texto: "Que le gustaria mejorar?", tipo: "radio", opciones: '["Vender mas","Organizar productos","Tener catalogo online","Ahorrar tiempo","Conectar tienda fisica y online"]', orden: 7, puntaje: '{}', painDetected: null, salesArgument: null },
    ],
  },
  {
    nombre: "Presentacion Automatica", descripcion: "Argumentos personalizados segun respuestas", icono: "Star", orden: 2, route: "emprendedor_online", tipo: "info",
    guiaVendedor: "Segun las respuestas, usa estos argumentos:\n\n- Si vende por Instagram: 'Puedes convertir tus redes sociales en un canal de ventas organizado.'\n- Si responde muchas preguntas: 'Una tienda online permite que el cliente vea productos sin depender siempre de una respuesta.'\n- Si tiene inventario: 'Cada venta actualiza la disponibilidad.'",
    questions: [],
  },
  {
    nombre: "Demo Recomendada", descripcion: "Pasos para la demostracion", icono: "Monitor", orden: 3, route: "emprendedor_online", tipo: "info",
    guiaVendedor: "Mostrar en este orden:\n\n1. Crear producto.\n2. Agregar imagen.\n3. Agregar precio.\n4. Mostrar tienda online.\n5. Cliente compra.\n6. Inventario se actualiza.",
    questions: [],
  },
  {
    nombre: "Objeciones", descripcion: "Manejo de objeciones online", icono: "ShieldAlert", orden: 4, route: "emprendedor_online", tipo: "info",
    guiaVendedor: "Si el prospecto expresa una objecion, usa la respuesta sugerida:\n\n- 'Mis clientes compran por WhatsApp' → Perfecto, WhatsApp seguira funcionando. La tienda online ayuda a organizar ese proceso y evita perder tiempo enviando informacion repetida.\n- 'No necesito una pagina' → No se trata solo de una pagina, sino de tener tus productos organizados y disponibles para tus clientes.\n- 'Esta caro' → Entiendo. La pregunta importante es cuanto cuesta actualmente no tener control sobre inventario, ventas o perdidas.\n- 'No tengo tiempo' → Justamente la idea es ahorrar tiempo, no agregar mas trabajo.\n- 'Tengo que pensarlo' → Claro. Para ayudarte mejor, que parte necesitas evaluar: inversion, funcionamiento o necesidad?",
    questions: [],
  },
  {
    nombre: "Apertura", descripcion: "Apertura para profesionales de la salud", icono: "MessageCircle", orden: 0, route: "agenda_salud", tipo: "info",
    guiaVendedor: "NO empezar hablando del sistema.\n\nBuenos dias, estamos ayudando a profesionales a organizar mejor sus citas y la atencion de sus pacientes. Queria hacerle unas preguntas para conocer como manejan actualmente su agenda.",
    questions: [],
  },
  {
    nombre: "Diagnostico", descripcion: "Como maneja actualmente sus consultas", icono: "Stethoscope", orden: 1, route: "agenda_salud", tipo: "questions",
    questions: [
      { texto: "Cual es tu especialidad?", tipo: "checklist", opciones: '["Medicina general","Odontologia","Psicologia","Nutricion","Fisioterapia","Veterinaria","Otra"]', orden: 0, requerida: false, painDetected: null, salesArgument: null },
      { texto: "Como gestionas actualmente las citas?", tipo: "radio", opciones: '["Agenda fisica en papel","WhatsApp","Llamadas telefonicas","Excel","Google Calendar","Sistema especializado"]', orden: 1, puntaje: '{"Agenda fisica en papel":20,"WhatsApp":15,"Excel":10,"Llamadas telefonicas":5,"Google Calendar":5,"Sistema especializado":0}', painDetected: null, salesArgument: null },
      { texto: "Quien se encarga actualmente de organizar las citas?", tipo: "radio", opciones: '["Yo personalmente","Secretaria","Asistente","Varias personas"]', orden: 2, painDetected: '{"Yo personalmente":"Profesional dedica tiempo administrativo"}', salesArgument: null },
      { texto: "Cuantos pacientes atiendes aproximadamente por semana?", tipo: "radio", opciones: '["Menos de 10","10-30","30-50","Mas de 50"]', orden: 3, puntaje: '{"Mas de 50":30,"30-50":20,"10-30":10,"Menos de 10":0}', painDetected: null, salesArgument: null },
      { texto: "Cuando un paciente quiere una cita, que debe hacer?", tipo: "radio", opciones: '["Escribir por WhatsApp","Llamar","Esperar confirmacion","Reservar desde un enlace"]', orden: 4, painDetected: '{"Escribir por WhatsApp":"Proceso manual de reserva","Llamar":"Proceso manual de reserva","Esperar confirmacion":"Proceso manual de reserva"}', salesArgument: '{"Reservar desde un enlace":"El paciente puede reservar directamente sin esperar respuesta"}', puntaje: '{"Escribir por WhatsApp":12,"Llamar":10,"Esperar confirmacion":15,"Reservar desde un enlace":0}' },
    ],
  },
  {
    nombre: "Detectar el Dolor", descripcion: "Profundizar en problemas de organizacion", icono: "AlertTriangle", orden: 2, route: "agenda_salud", tipo: "questions",
    questions: [
      { texto: "Cuanto tiempo al dia dedicas respondiendo mensajes de citas?", tipo: "radio", opciones: '["Menos de 15 minutos","15-30 minutos","30-60 minutos","Mas de una hora"]', orden: 0, puntaje: '{"30-60 minutos":20,"Mas de una hora":30,"15-30 minutos":8,"Menos de 15 minutos":0}', painDetected: null, salesArgument: null },
      { texto: "Alguna vez has tenido problemas con citas?", tipo: "checklist", opciones: '["Pacientes olvidan la cita","Cruce de horarios","Pacientes llegan sin confirmar","No encuentro disponibilidad rapidamente","Pierdo tiempo coordinando","Ninguno"]', orden: 1, requerida: false, puntaje: '{"Pacientes olvidan la cita":10,"Cruce de horarios":10,"Pacientes llegan sin confirmar":10,"No encuentro disponibilidad rapidamente":10,"Pierdo tiempo coordinando":10,"Ninguno":0}', painDetected: null, salesArgument: null },
      { texto: "Tienes historial organizado de tus pacientes?", tipo: "radio", opciones: '["Si","No"]', orden: 2, puntaje: '{"No":15,"Si":0}', painDetected: '{"No":"Falta de organizacion del paciente"}', salesArgument: null },
      { texto: "Puedes saber facilmente cuantas consultas realizaste este mes?", tipo: "radio", opciones: '["Si","No"]', orden: 3, puntaje: '{"No":10,"Si":0}', painDetected: '{"No":"Falta de estadisticas del negocio"}', salesArgument: null },
      { texto: "Que te gustaria mejorar principalmente?", tipo: "radio", opciones: '["Organizar mejor mi agenda","Ahorrar tiempo respondiendo mensajes","Que mis pacientes puedan reservar solos","Tener mas control de mis consultas","Mejorar la experiencia del paciente"]', orden: 4, puntaje: '{}', painDetected: null, salesArgument: null },
      { texto: "Crees que tus clientes podrian aprender a reservar mediante un enlace?", tipo: "radio", opciones: '["Si facilmente","Necesitarian ayuda al principio","Seria complicado"]', orden: 5, salesArgument: '{"Necesitarian ayuda al principio":"Al principio puedes ensenar a tus clientes frecuentes. Despues de usarlo una vez sera un proceso natural."}', painDetected: null },
    ],
  },
  {
    nombre: "Educacion del Vendedor", descripcion: "Preparar argumentos de valor", icono: "GraduationCap", orden: 3, route: "agenda_salud", tipo: "info",
    guiaVendedor: "NO vender una 'agenda online'. Vender:\n\n- Organizacion profesional.\n- Mejor experiencia del paciente.\n- Menos tiempo administrativo.\n- Menos errores de horarios.\n- Mayor control de consultas.\n\nMensaje central: 'Panitas ayuda a profesionales a organizar sus citas y permitir que sus pacientes puedan reservar de forma sencilla.'",
    questions: [],
  },
  {
    nombre: "Presentacion", descripcion: "Argumentos personalizados segun respuestas", icono: "Star", orden: 4, route: "agenda_salud", tipo: "info",
    guiaVendedor: "Segun las respuestas, enfocate en el argumento que mas conecte:\n\n- Si usa WhatsApp: 'Actualmente muchas consultas dependen de responder mensajes constantemente. Panitas permite organizar ese proceso.'\n- Si tiene asistente: 'Panitas ayuda a que todo el equipo pueda manejar las citas de manera ordenada.'\n- Si pierde citas: 'Una cita perdida representa tiempo que pudo convertirse en ingreso.'",
    questions: [],
  },
  {
    nombre: "Demostracion", descripcion: "Que mostrar durante la demo", icono: "Monitor", orden: 5, route: "agenda_salud", tipo: "info",
    guiaVendedor: "Mostrar en este orden:\n\n1. Perfil profesional del doctor.\n2. Servicios que ofrece.\n3. Horarios disponibles.\n4. Enlace de reserva.\n5. Como un paciente agenda cita.\n6. Calendario profesional.\n7. Estadisticas de consultas.",
    questions: [],
  },
  {
    nombre: "Cierre", descripcion: "Evaluar interes y definir proxima accion", icono: "Target", orden: 6, route: "agenda_salud", tipo: "questions",
    questions: [
      { texto: "Si sus pacientes pudieran solicitar una cita sin tener que esperar respuesta y usted tuviera toda su agenda organizada, crees que mejoraria su proceso?", tipo: "radio", opciones: '["Si","No","Necesito pensarlo"]', orden: 0, puntaje: '{"Si":20,"Necesito pensarlo":5,"No":0}' },
    ],
  },
  {
    nombre: "Objeciones", descripcion: "Manejo de objeciones — salud", icono: "ShieldAlert", orden: 7, route: "agenda_salud", tipo: "info",
    guiaVendedor: "Si el prospecto expresa una objecion, usa la respuesta sugerida:\n\n- 'Mis pacientes usan WhatsApp' → Perfecto, WhatsApp puede seguir funcionando. Panitas simplemente organiza el proceso para evitar perder tiempo coordinando horarios.\n- 'Tengo pocos pacientes' → Precisamente cuando se esta creciendo es el mejor momento para organizar la atencion.\n- 'No quiero complicar a mis pacientes' → La experiencia es muy sencilla: el paciente selecciona servicio, horario y confirma.\n- 'Esta caro' → Entiendo. La pregunta es cuantas horas al mes dedica a coordinar citas manualmente. Eso tiene un costo tambien.",
    questions: [],
  },
  {
    nombre: "Apertura", descripcion: "Apertura para negocios de belleza", icono: "MessageCircle", orden: 0, route: "agenda_belleza", tipo: "info",
    guiaVendedor: "Estamos ayudando a negocios de belleza a organizar sus reservas y aprovechar mejor sus horarios. Queria conocer como manejan actualmente las citas.",
    questions: [],
  },
  {
    nombre: "Diagnostico", descripcion: "Como manejan las reservas actualmente", icono: "Scissors", orden: 1, route: "agenda_belleza", tipo: "questions",
    questions: [
      { texto: "Cual es tu especialidad?", tipo: "checklist", opciones: '["Barberia","Salon de belleza","Spa","Uñas","Pestañas","Masajes","Estetica","Otro"]', orden: 0, requerida: false, painDetected: null, salesArgument: null },
      { texto: "Como gestionas actualmente las citas?", tipo: "radio", opciones: '["WhatsApp","Instagram","Llamadas","Llegan directamente","Agenda fisica en papel","Llamadas y WhatsApp"]', orden: 1, puntaje: '{"WhatsApp":12,"Instagram":10,"Llamadas":10,"Llegan directamente":15,"Agenda fisica en papel":15,"Llamadas y WhatsApp":12}', painDetected: null, salesArgument: null },
      { texto: "Quien se encarga de organizar las citas?", tipo: "radio", opciones: '["Yo personalmente","Una empleada","Varias personas","Cada quien sus clientes"]', orden: 2, painDetected: '{"Yo personalmente":"Dueño dedica tiempo administrativo","Varias personas":"Desorganizacion por multiples responsables"}', salesArgument: null },
      { texto: "Cuantos clientes atiendes aproximadamente por semana?", tipo: "radio", opciones: '["Menos de 20","20-50","50-100","Mas de 100"]', orden: 3, puntaje: '{"Mas de 100":30,"50-100":20,"20-50":10,"Menos de 20":0}', painDetected: null, salesArgument: null },
      { texto: "Como llegan principalmente tus clientes?", tipo: "radio", opciones: '["WhatsApp","Instagram/Facebook","Recomendacion","Pasaron a preguntar","Llamada"]', orden: 4, puntaje: '{}', painDetected: null, salesArgument: null },
      { texto: "Cuanto tiempo al dia dedicas a responder mensajes de reservas?", tipo: "radio", opciones: '["Menos de 15 minutos","15-30 minutos","30-60 minutos","Mas de una hora"]', orden: 5, puntaje: '{"30-60 minutos":20,"Mas de una hora":30,"15-30 minutos":8,"Menos de 15 minutos":0}', painDetected: null, salesArgument: null },
      { texto: "Alguna vez has tenido problemas con las citas?", tipo: "checklist", opciones: '["Clientes olvidan citas","Se acumula trabajo","Cruce de horarios","Pierdo clientes por demora","No tengo control","Ninguno"]', orden: 6, requerida: false, puntaje: '{"Clientes olvidan citas":10,"Se acumula trabajo":10,"Cruce de horarios":10,"Pierdo clientes por demora":15,"No tengo control":15,"Ninguno":0}', painDetected: null, salesArgument: null },
      { texto: "Que debe hacer un cliente para agendar contigo?", tipo: "radio", opciones: '["Escribirme por WhatsApp","Llamarme","Llegar al local","Reservar desde un enlace"]', orden: 7, puntaje: '{"Escribirme por WhatsApp":12,"Llamarme":10,"Llegar al local":15,"Reservar desde un enlace":0}', painDetected: '{"Escribirme por WhatsApp":"Proceso manual","Llamarme":"Proceso manual","Llegar al local":"Proceso manual"}', salesArgument: '{"Reservar desde un enlace":"El cliente puede ver disponibilidad y reservar sin esperar respuesta"}' },
      { texto: "Crees que tus clientes podrian aprender a reservar mediante un enlace?", tipo: "radio", opciones: '["Si facilmente","Necesitarian ayuda al principio","Seria complicado"]', orden: 8, salesArgument: '{"Si facilmente":"Excelente, podemos empezar de inmediato","Necesitarian ayuda al principio":"Al principio puedes guiarlos. Despues de usarlo una vez, el proceso es natural."}', painDetected: null },
    ],
  },
  {
    nombre: "Educacion del Cliente Final", descripcion: "Preparar al vendedor para explicar a clientes", icono: "GraduationCap", orden: 2, route: "agenda_belleza", tipo: "info",
    guiaVendedor: "Objetivo: Preparar al vendedor para explicar que los clientes aprenderan poco a poco.\n\nMensaje clave: 'Al principio tus clientes pueden seguir escribiendote por WhatsApp. La idea es ensenarles progresivamente a utilizar tu enlace de reservas.'\n\nEjemplo para el vendedor:\n'Cuando un cliente termine su servicio puedes decirle: Para tu proxima cita puedes entrar a este enlace, elegir tu servicio y escoger el horario que prefieras.'",
    questions: [],
  },
  {
    nombre: "Nuevas Preguntas", descripcion: "Profundizar en la experiencia de reserva", icono: "HelpCircle", orden: 3, route: "agenda_belleza", tipo: "questions",
    questions: [
      { texto: "Tienes historial organizado de tus clientes?", tipo: "radio", opciones: '["Si","No"]', orden: 0, puntaje: '{"No":10,"Si":0}', painDetected: '{"No":"Falta de informacion del cliente"}', salesArgument: null },
      { texto: "Sabes aproximadamente cuantos clientes tuviste y cuanto ingresaste este mes?", tipo: "radio", opciones: '["Si tengo claro","Mas o menos","No tengo idea"]', orden: 1, puntaje: '{"No tengo idea":15,"Mas o menos":8,"Si tengo claro":0}', painDetected: '{"No tengo idea":"Falta de control financiero","Mas o menos":"Falta de control financiero"}', salesArgument: null },
      { texto: "Que te gustaria mejorar principalmente?", tipo: "radio", opciones: '["Organizar mejor las citas","Dejar de perder clientes","Que los clientes reserven solos","Tener control del negocio","Ahorrar tiempo en mensajes","Mejorar la atencion"]', orden: 2, puntaje: '{}', painDetected: null, salesArgument: null },
    ],
  },
  {
    nombre: "Presentacion", descripcion: "Argumentos personalizados segun respuestas", icono: "Star", orden: 4, route: "agenda_belleza", tipo: "info",
    guiaVendedor: "Segun las respuestas, enfocate en el argumento que mas conecte:\n\n- Si pierde tiempo en WhatsApp: 'Panitas permite automatizar la parte repetitiva de coordinar horarios.'\n- Si tiene horarios vacios: 'Cada espacio libre representa una oportunidad de ingreso perdida.'\n- Si tiene clientes frecuentes: 'Puedes ensenarles a reservar directamente y ahorrar tiempo.'",
    questions: [],
  },
  {
    nombre: "Demostracion", descripcion: "Que mostrar durante la demo", icono: "Monitor", orden: 5, route: "agenda_belleza", tipo: "info",
    guiaVendedor: "Mostrar en este orden:\n\n1. Perfil del negocio.\n2. Servicios que ofrece.\n3. Precios visibles.\n4. Link de reserva.\n5. Cliente seleccionando servicio.\n6. Cliente seleccionando horario.\n7. Reserva confirmada.\n8. Agenda del negocio.\n9. Estadisticas de reservas.",
    questions: [],
  },
  {
    nombre: "Cierre", descripcion: "Evaluar interes y definir proxima accion", icono: "Target", orden: 6, route: "agenda_belleza", tipo: "questions",
    questions: [
      { texto: "Si tus clientes pudieran entrar desde tu WhatsApp, ver horarios disponibles y reservar sin esperar respuesta, crees que seria mas comodo para ellos y para ti?", tipo: "radio", opciones: '["Si","No","Necesito pensarlo"]', orden: 0, puntaje: '{"Si":20,"Necesito pensarlo":5,"No":0}' },
    ],
  },
  {
    nombre: "Objeciones", descripcion: "Manejo de objeciones — belleza", icono: "ShieldAlert", orden: 7, route: "agenda_belleza", tipo: "info",
    guiaVendedor: "Si el prospecto expresa una objecion, usa la respuesta sugerida:\n\n- 'Mis clientes no saben usar eso' → No necesitan aprender todo de golpe. Puedes empezar con clientes nuevos o frecuentes. Despues de usarlo una vez, el proceso es muy sencillo.\n- 'Mis clientes prefieren WhatsApp' → WhatsApp seguira funcionando. El enlace simplemente evita que tengas que responder siempre las mismas preguntas.\n- 'No quiero cambiar mi forma de trabajar' → La idea no es cambiar todo de golpe, sino ayudarte a organizar mejor el proceso.\n- 'Esta caro' → Entiendo. Piensa cuantas horas a la semana dedicas a responder mensajes de reservas. Ese tiempo tiene un costo.",
    questions: [],
  },
  {
    nombre: "Proximamente", descripcion: "Guion especializado en desarrollo", icono: "Clock", orden: 0, route: "empresarial_default", tipo: "info",
    guiaVendedor: "El guion de venta para Plan Empresarial esta en desarrollo proximamente. Por ahora, puedes usar el cuestionario general para evaluar al prospecto.",
    questions: [],
  },
]

export const SCORING_RULES: ScoringRule[] = [
  { nombre: "No registra ventas", campo: "registro_ventas", valor: "No registramos", puntos: 30, route: "emprendedor_presencial" },
  { nombre: "Registra en cuaderno", campo: "registro_ventas", valor: "Cuaderno", puntos: 20, route: "emprendedor_presencial" },
  { nombre: "Sin control inventario", campo: "control_inventario", valor: "No tenemos control", puntos: 35, route: "emprendedor_presencial" },
  { nombre: "Inventario en memoria", campo: "control_inventario", valor: "Memoria", puntos: 30, route: "emprendedor_presencial" },
  { nombre: "Muchos productos", campo: "cantidad_productos", valor: "200-500", puntos: 20, route: "emprendedor_presencial" },
  { nombre: "Muchisimos productos", campo: "cantidad_productos", valor: "Mas de 500", puntos: 20, route: "emprendedor_presencial" },
  { nombre: "No puede saber disponibilidad", campo: "disponibilidad", valor: "No", puntos: 15, route: "emprendedor_presencial" },
  { nombre: "No cierra caja", campo: "cierre_caja", valor: "No", puntos: 20, route: "emprendedor_presencial" },
  { nombre: "No sabe ventas", campo: "sabe_ventas", valor: "No puedo saberlo", puntos: 30, route: "emprendedor_presencial" },
  { nombre: "Revision manual ventas", campo: "sabe_ventas", valor: "Tengo que revisar manualmente", puntos: 10, route: "emprendedor_presencial" },
  { nombre: "Multiples empleados", campo: "empleados_ventas", valor: "2-5 empleados", puntos: 20, route: "emprendedor_presencial" },
  { nombre: "Muchos empleados", campo: "empleados_ventas", valor: "Mas de 5", puntos: 20, route: "emprendedor_presencial" },
  { nombre: "Diferencia inventario", campo: "problemas_checklist", valor: "Diferencias de inventario", puntos: 10, route: "emprendedor_presencial" },
  { nombre: "Productos perdidos", campo: "problemas_checklist", valor: "Productos perdidos", puntos: 10, route: "emprendedor_presencial" },
  { nombre: "Errores al cobrar", campo: "problemas_checklist", valor: "Errores al cobrar", puntos: 10, route: "emprendedor_presencial" },
  { nombre: "Sin control dinero", campo: "problemas_checklist", valor: "No saber cuanto dinero hay", puntos: 10, route: "emprendedor_presencial" },
  { nombre: "Empleados sin control", campo: "problemas_checklist", valor: "Empleados sin control", puntos: 10, route: "emprendedor_presencial" },
  { nombre: "Mucho tiempo cuentas", campo: "problemas_checklist", valor: "Mucho tiempo haciendo cuentas", puntos: 10, route: "emprendedor_presencial" },
  { nombre: "Vende por Instagram", campo: "ventas_redes", valor: "Instagram", puntos: 15, route: "emprendedor_online" },
  { nombre: "Vende por WhatsApp", campo: "ventas_redes", valor: "WhatsApp", puntos: 15, route: "emprendedor_online" },
  { nombre: "Sin catalogo", campo: "muestra_productos", valor: "No tengo catalogo", puntos: 20, route: "emprendedor_online" },
  { nombre: "Fotos manuales", campo: "muestra_productos", valor: "Fotos por WhatsApp", puntos: 15, route: "emprendedor_online" },
  { nombre: "Varias horas preguntas", campo: "tiempo_preguntas", valor: "Varias horas diarias", puntos: 25, route: "emprendedor_online" },
  { nombre: "Perdio venta por tardar", campo: "perdio_venta", valor: "Si", puntos: 25, route: "emprendedor_online" },
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

export const PLAN_RULES: PlanRule[] = [
  { plan: "agenda", route: "agenda_salud", min: 0, max: 100, desc: "Profesionales de salud que necesitan organizar citas y mejorar la experiencia del paciente" },
  { plan: "agenda", route: "agenda_belleza", min: 0, max: 100, desc: "Negocios de belleza que necesitan organizar reservas y aprovechar horarios" },
  { plan: "emprendedor", route: "emprendedor_presencial", min: 0, max: 30, desc: "Baja oportunidad — Negocio con poco potencial de venta" },
  { plan: "emprendedor", route: "emprendedor_presencial", min: 31, max: 70, desc: "Oportunidad media — Negocio con necesidades basicas de organizacion" },
  { plan: "emprendedor", route: "emprendedor_presencial", min: 71, max: 120, desc: "Alta oportunidad — Negocio con multiples necesidades detectadas" },
  { plan: "emprendedor", route: "emprendedor_presencial", min: 121, max: 999, desc: "Cliente prioritario — Necesidad urgente de solucion" },
  { plan: "emprendedor", route: "emprendedor_online", min: 0, max: 30, desc: "Baja oportunidad — Negocio con poco potencial de venta online" },
  { plan: "emprendedor", route: "emprendedor_online", min: 31, max: 70, desc: "Oportunidad media — Negocio vende online pero sin organizacion" },
  { plan: "emprendedor", route: "emprendedor_online", min: 71, max: 120, desc: "Alta oportunidad — Negocio con necesidad clara de tienda online" },
  { plan: "emprendedor", route: "emprendedor_online", min: 121, max: 999, desc: "Cliente prioritario — Perdidas activas por falta de canal online" },
  { plan: "empresarial", route: "empresarial_default", min: 56, max: 100, desc: "Negocios grandes con multi-sucursal y necesidades avanzadas" },
]

export async function seedSalesData(db: PrismaClient) {
  let sectionsCreated = 0
  let questionsCreated = 0
  let scoringRulesCreated = 0
  let planRulesCreated = 0

  for (const section of SECTIONS) {
    const sectionId = crypto.randomUUID()
    await db.$executeRawUnsafe(
      `INSERT INTO "SalesSection" (id, nombre, descripcion, icono, "route", tipo, "guiaVendedor", orden, activo, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())`,
      sectionId, section.nombre, section.descripcion, section.icono, section.route, section.tipo, section.guiaVendedor || null, section.orden
    )
    sectionsCreated++

    for (const q of section.questions) {
      const questionId = crypto.randomUUID()
      const qq = q as Required<Pick<Question, 'texto' | 'tipo' | 'orden'>> & Question
      await db.$executeRawUnsafe(
        `INSERT INTO "SalesQuestion" (id, texto, tipo, opciones, orden, requerida, puntaje, "painDetected", "salesArgument", placeholder, subtexto, "condicionLogica", metadata, "sectionId", activo, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5::int, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, NOW(), NOW())`,
        questionId, qq.texto, qq.tipo, qq.opciones || null, qq.orden, qq.requerida !== false, qq.puntaje || null, qq.painDetected || null, qq.salesArgument || null, qq.placeholder || null, qq.subtexto || null, qq.condicionLogica || null, null, sectionId
      )
      questionsCreated++
    }
  }

  for (const rule of SCORING_RULES) {
    const ruleId = crypto.randomUUID()
    await db.$executeRawUnsafe(
      `INSERT INTO "SalesScoringRule" (id, nombre, campo, valor, puntos, route, operador, activo, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5::int, $6, 'equals', true, NOW(), NOW())`,
      ruleId, rule.nombre, rule.campo, rule.valor, rule.puntos, rule.route
    )
    scoringRulesCreated++
  }

  for (const rule of PLAN_RULES) {
    const ruleId = crypto.randomUUID()
    await db.$executeRawUnsafe(
      `INSERT INTO "SalesPlanRecommendation" (id, plan, route, "minPuntuacion", "maxPuntuacion", descripcion, activo, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4::int, $5::int, $6, true, NOW(), NOW())`,
      ruleId, rule.plan, rule.route, rule.min, rule.max, rule.desc
    )
    planRulesCreated++
  }

  return { sectionsCreated, questionsCreated, scoringRulesCreated, planRulesCreated }
}
