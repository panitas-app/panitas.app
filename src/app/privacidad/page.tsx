import Link from "next/link"

const sections = [
  {
    number: "1",
    title: "¿Qué datos recolectamos y para qué?",
    content: (
      <>
        <p className="mb-3">
          Cuando te registras para crear tu tienda o agenda en Panitas, recopilamos información muy
          básica pero necesaria:
        </p>
        <div className="space-y-3 mb-3">
          <div className="border-l-2 border-amber-500/40 pl-4">
            <strong className="text-amber-300">Datos de registro:</strong>{" "}
            <span>
              Correo electrónico y número de teléfono. Utilizamos estos datos exclusivamente para
              verificar tu identidad al registrarte, enviarte notificaciones importantes sobre tu
              cuenta (como confirmaciones o alertas de nuevos pedidos) y darte soporte técnico.
            </span>
          </div>
          <div className="border-l-2 border-amber-500/40 pl-4">
            <strong className="text-amber-300">Datos de tu negocio:</strong>{" "}
            <span>
              El nombre de tu tienda, horarios y la información que decidas mostrar públicamente
              para que tus clientes te contacten.
            </span>
          </div>
        </div>
        <p className="text-amber-300 font-semibold">
          Nota importante: Panitas no almacena tus datos bancarios ni los de tus clientes, ya que
          las transferencias y pagos móviles se realizan directamente de banco a banco entre tú y
          tus compradores.
        </p>
      </>
    ),
  },
  {
    number: "2",
    title: "Uso de Google Analytics",
    content: (
      <>
        <p className="mb-3">
          Para entender mejor cómo interactúan los usuarios con nuestra web y poder mejorar la
          plataforma continuamente, utilizamos Google Analytics, una herramienta de análisis web de
          terceros.
        </p>
        <p>
          Google Analytics recopila información anónima (como el número de visitas, el tiempo que
          pasas en la página o el tipo de dispositivo que usas). Estos datos nos sirven únicamente
          para estadísticas internas y optimización técnica de Panitas; no se asocian a tu
          identidad personal.
        </p>
      </>
    ),
  },
  {
    number: "3",
    title: "¿Qué son las Cookies y cómo las usamos?",
    content: (
      <>
        <p className="mb-3">
          Las cookies son pequeños archivos de texto que se guardan en tu navegador cuando visitas
          una página web. En Panitas las usamos para dos cosas fundamentales:
        </p>
        <div className="space-y-3 mb-3">
          <div className="border-l-2 border-amber-500/40 pl-4">
            <strong className="text-amber-300">Cookies Técnicas Obligatorias:</strong>{" "}
            <span>
              Son esenciales para que puedas iniciar sesión en tu cuenta de Panitas de forma segura
              y el sistema recuerde que estás dentro de tu panel de control mientras navegas por la
              web.
            </span>
          </div>
          <div className="border-l-2 border-amber-500/40 pl-4">
            <strong className="text-amber-300">Cookies de Rendimiento (Métricas):</strong>{" "}
            <span>
              Son las que utiliza Google Analytics para ayudarnos a medir el tráfico del sitio de
              manera totalmente anónima.
            </span>
          </div>
        </div>
        <p>
          Si lo deseas, puedes desactivar o borrar las cookies desde la configuración de tu
          navegador web en cualquier momento, aunque debes saber que si desactivas las cookies
          técnicas, no podrás iniciar sesión ni gestionar tu tienda de forma correcta.
        </p>
      </>
    ),
  },
  {
    number: "4",
    title: "Seguridad de los Datos",
    content: (
      <p>
        Implementamos medidas de seguridad técnicas para proteger tus datos de accesos no
        autorizados, pérdidas o filtraciones. Tus datos de contacto se guardan de forma
        confidencial y jamás los venderemos ni compartiremos con terceras empresas para fines
        publicitarios.
      </p>
    ),
  },
  {
    number: "5",
    title: "Tus Derechos y Contacto",
    content: (
      <p>
        Tienes derecho a revisar, actualizar o solicitar la eliminación de tus datos de registro
        cuando lo desees. Si tienes alguna duda sobre cómo manejamos tu privacidad o quieres
        solicitar la baja de tus datos, puedes escribirnos directamente a nuestro canal oficial de
        soporte:{": "}
        <a
          href="mailto:supportpanitas@gmail.com"
          className="text-amber-300 hover:text-amber-200 underline"
        >
          supportpanitas@gmail.com
        </a>
      </p>
    ),
  },
]

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1628] via-[#0F2240] to-[#102A43] text-white">
      <div className="mx-auto max-w-4xl px-4 py-20">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Política de Privacidad y Cookies
          </h1>
          <p className="text-sm text-slate-400">Última actualización: Julio de 2026</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-10">
          <p className="text-slate-300 leading-relaxed">
            En Panitas, nos tomamos muy en serio la seguridad y la privacidad de tus datos. Esta
            Política de Privacidad y Cookies te explica de manera sencilla qué información
            recolectamos, cómo la usamos para que la plataforma funcione perfectamente y cómo
            protegemos tu privacidad, de acuerdo con las normativas de protección de datos
            aplicables en Venezuela.
          </p>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <div
              key={section.number}
              className="bg-white/5 border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-start gap-4 mb-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 font-bold text-sm">
                  {section.number}
                </span>
                <h2 className="text-xl font-bold text-amber-300 pt-1">
                  {section.title}
                </h2>
              </div>
              <div className="text-slate-300 leading-relaxed text-[15px] ml-14">
                {section.content}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
