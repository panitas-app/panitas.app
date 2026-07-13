import Link from "next/link"
import { FileText } from "lucide-react"

const sections = [
  {
    number: "1",
    title: "Registro, Cuentas de Usuario y Edad Mínima",
    content: (
      <>
        <p className="mb-3">
          <strong>Edad Mínima:</strong> Para registrarte y activar una tienda o agenda en Panitas,
          debes ser mayor de edad (18 años o más) o un menor emancipado con capacidad legal para
          ejercer actividades comerciales según el Código de Comercio de la República Bolivariana
          de Venezuela.
        </p>
        <p>
          <strong>Verificación de la Cuenta:</strong> Al registrarte, recopilaremos datos básicos y
          verificaremos tu identidad mediante el envío de un correo electrónico de confirmación y
          la validación de tu número telefónico. Eres el único responsable de mantener la
          confidencialidad de tus credenciales de acceso.
        </p>
      </>
    ),
  },
  {
    number: "2",
    title: "Pagos, Planes de Suscripción y Días de Gracia",
    content: (
      <>
        <p className="mb-3">
          <strong>Métodos de Pago:</strong> Para acceder y mantener activos los servicios de
          Panitas, debes abonar la tarifa correspondiente a tu plan seleccionado. Aceptamos
          exclusivamente los siguientes métodos de pago para tu comodidad: Pago Móvil y
          Transferencias Bancarias en Bolívares (Bs).
        </p>
        <p className="mb-3">
          <strong>Moneda de Cuenta:</strong> De conformidad con la legislación venezolana, las
          tarifas se fijan referencialmente en divisas pero su equivalente podrá ser liquidado en
          la moneda de curso legal (Bolívares), según la tasa oficial vigente y los acuerdos de
          pago establecidos.
        </p>
        <p className="mb-3">
          <strong>Política de No Devolución:</strong> Panitas opera bajo un modelo de suscripción
          de servicio activo. No realizamos reembolsos ni devoluciones de dinero bajo ninguna
          circunstancia una vez cobrado el periodo correspondiente.
        </p>
        <p>
          <strong>Suspensión por Impago (7 Días de Gracia):</strong> Si la fecha de tu pago
          expira, Panitas te otorgará un lapso de gracia de siete (7) días continuos para que te
          pongas al día. Si transcurrido ese tiempo el pago no se ha reportado y verificado con
          nuestro sistema, tu tienda, agenda y visibilidad pública serán suspendidas
          automáticamente hasta que regularices tu situación.
        </p>
      </>
    ),
  },
  {
    number: "3",
    title: "Exoneración Total de Responsabilidad Comercial y Logística",
    content: (
      <>
        <p className="mb-4 text-[#0066FF] font-semibold">
          Este es el núcleo de nuestra relación: Panitas es una herramienta tecnológica, no un
          intermediario comercial.
        </p>
        <p className="mb-3">
          <strong>Transacciones Directas:</strong> Cuando un cliente final realiza una compra en tu
          tienda de Panitas, el dinero va 100% directo a tus cuentas bancarias o pasarelas
          personales. Panitas jamás retiene, intermedia ni toca los fondos de tus ventas. Por lo
          tanto, no intervenimos en disputas financieras entre tú y tus compradores.
        </p>
        <p className="mb-3">
          <strong>Responsabilidad Logística y Entregas:</strong> Panitas facilita una base de datos
          con las agencias nacionales de Zoom, MRW, Tealca y Liberty Express para que configures
          tus envíos, además de darte opciones de retiro en agencia o delivery local. Sin embargo,
          el manejo físico, los costos, los tiempos y los riesgos del envío corren por tu cuenta o
          la de tu comprador. Panitas no se hace responsable bajo ningún concepto por pedidos
          retrasados, dañados o que jamás se hayan entregado. Los &quot;Envíos Gratis&quot; que ofrezcas
          salen exclusivamente de tu bolsillo.
        </p>
        <p>
          <strong>Obligaciones Fiscales y Legales:</strong> Cada usuario es independiente y
          responsable de cumplir con las leyes fiscales de Venezuela (declaración de IVA, ISLR,
          emisión de facturas legales según las providencias del SENIAT, cumplimiento de precios y
          normativas de la SUNDDE). Panitas no se hace responsable por las ventas que realicen los
          usuarios. Si no declaras tus ventas, no emites factura o no cumples con la ley, es tu
          exclusiva responsabilidad legal y penal; Panitas queda totalmente exenta de cualquier
          reclamo o sanción de organismos públicos.
        </p>
      </>
    ),
  },
  {
    number: "4",
    title: "Políticas de Uso Aceptable (Productos Prohibidos)",
    content: (
      <>
        <p className="mb-4">
          Para mantener a Panitas como un espacio seguro, está estrictamente prohibido utilizar la
          plataforma para promocionar, agendar o vender:
        </p>
        <ul className="space-y-3 mb-4">
          {[
            {
              title: "Sustancias Ilícitas y Medicamentos",
              desc: "Drogas, estupefacientes, químicos controlados o medicamentos de cualquier tipo (especialmente los que requieran prescripción médica).",
            },
            {
              title: "Armas y Explosivos",
              desc: "Armas de fuego, municiones, material táctico militar/policial o fuegos artificiales de alta peligrosidad.",
            },
            {
              title: "Contenido para Adultos",
              desc: "Material pornográfico, servicios de acompañantes o cualquier contenido que vulnere la Ley Orgánica para la Protección de Niños, Niñas y Adolescentes (LOPNNA).",
            },
            {
              title: "Esquemas Financieros Ilegales",
              desc: "Promoción de pirámides financieras, captación ilegal de dinero o servicios de intermediación financiera no autorizados por la SUDEBAN.",
            },
            {
              title: "Fauna Silvestre",
              desc: "Venta de animales exóticos o protegidos por la Ley de Diversidad Biológica de Venezuela.",
            },
          ].map((item) => (
            <li key={item.title} className="border-l-2 border-[#0066FF]/30 pl-4">
              <strong className="text-[#0066FF]">{item.title}:</strong>{" "}
              <span>{item.desc}</span>
            </li>
          ))}
        </ul>
        <p className="mb-3">
          <strong>Exoneración de Autenticidad (Réplicas de Ropa y Calzado):</strong> Panitas no
          actúa como policía de propiedad intelectual ni verifica la autenticidad de la
          indumentaria, calzado o accesorios que decidas vender. Tú eres el único responsable de
          garantizar que tus productos no violen derechos de terceros. No obstante, en caso de
          recibir una orden judicial formal de un tribunal venezolano o un reclamo fundamentado de
          una marca registrada, Panitas se reserva el derecho de suspender la tienda involucrada de
          forma inmediata, sin que esto genere derecho a indemnización o devolución de tu
          suscripción.
        </p>
      </>
    ),
  },
  {
    number: "5",
    title: "Soporte Técnico y Fallas de la Plataforma",
    content: (
      <p>
        Si experimentas problemas técnicos, caídas del sistema o errores en tu panel de
        administración, nuestro canal oficial y exclusivo de atención es:{": "}
        <a href="mailto:supportpanitas@gmail.com" className="text-primary hover:text-primary/80 underline">
          supportpanitas@gmail.com
        </a>
        . No atendemos disputas comerciales de tus clientes finales, solo soporte técnico directo
        al dueño de la cuenta.
      </p>
    ),
  },
]

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-20">
        <div className="mb-12 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <FileText className="size-6 text-primary" />
          </div>
          <h1 className="font-heading text-3xl font-bold mb-2">
            Términos y Condiciones de Uso
          </h1>
          <p className="text-sm text-muted-foreground">Última actualización: Julio de 2026</p>
        </div>

        <div className="mb-10 rounded-2xl bg-white/70 backdrop-blur-xl p-6 md:p-8 ring-1 ring-border/20 shadow-sm">
          <p className="text-sm text-muted-foreground leading-relaxed">
            ¡Te damos la bienvenida a Panitas! Antes de que empieces a crear tu tienda online o a
            gestionar tu agenda con nosotros, es fundamental que leas y comprendas estos Términos
            y Condiciones de Uso. Al registrarte y utilizar nuestra plataforma, estás aceptando
            este acuerdo legal de manera automática.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            Panitas es una plataforma SaaS (Software como Servicio) que pone a tu disposición las
            herramientas tecnológicas necesarias para que diseñes, gestiones y publiques tu propia
            tienda virtual y sistema de agendas. Nosotros te damos la infraestructura, pero tú
            manejas el negocio.
          </p>
        </div>

        <div className="space-y-6">
          {sections.map((section) => (
            <div
              key={section.number}
              className="rounded-2xl bg-white/70 backdrop-blur-xl p-6 md:p-8 ring-1 ring-border/20 shadow-sm transition-all hover:shadow-md hover:ring-border/30"
            >
              <div className="flex items-start gap-4 mb-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm ring-1 ring-primary/20">
                  {section.number}
                </span>
                <h2 className="font-heading text-lg font-bold text-foreground pt-0.5">
                  {section.title}
                </h2>
              </div>
              <div className="text-sm text-muted-foreground leading-relaxed ml-[3.25rem]">
                {section.content}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}