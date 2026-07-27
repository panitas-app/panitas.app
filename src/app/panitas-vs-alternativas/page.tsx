import type { Metadata } from "next"
import Link from "next/link"
import { FaqPageSchema, BreadcrumbSchema, WebPageSchema } from "@/lib/seo/schema"

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://panitas.app"

export const metadata: Metadata = {
  title: "Panitas | Comparativa de Software Administrativo para Negocios en Venezuela",
  description: "Compara funcionalidades, precios y diferenciadores de software administrativo para negocios en Venezuela. Tabla comparativa objetiva de inventario, POS, agenda, CRM y métodos de pago locales.",
  alternates: { canonical: "/panitas-vs-alternativas" },
  openGraph: {
    title: "Panitas | Comparativa de Software Administrativo para Negocios en Venezuela",
    description: "Compara funcionalidades, precios y diferenciadores de software administrativo para negocios en Venezuela.",
    url: `${baseUrl}/panitas-vs-alternativas`,
    siteName: "Panitas",
    locale: "es_VE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Panitas | Comparativa de Software Administrativo para Negocios en Venezuela",
    description: "Compara funcionalidades, precios y diferenciadores de software administrativo para negocios en Venezuela.",
  },
}

const faqData = [
  {
    question: "¿Cuánto cuesta un software administrativo para negocios en Venezuela?",
    answer: "Panitas ofrece tres planes: Agenda desde $15/mes, Emprendedor desde $25/mes y Mayorista desde $45/mes. Todos incluyen 14 días de prueba gratuita sin tarjeta de crédito. No hay comisiones por transacción ni costos ocultos.",
  },
  {
    question: "¿Qué software administrativo acepta pago móvil en Venezuela?",
    answer: "Panitas acepta pago móvil, transferencias bancarias, dólares en efectivo y punto de venta. Es uno de los pocos software administrativos diseñados específicamente para el mercado venezolano con soporte nativo para pagos locales.",
  },
  {
    question: "¿Cuál es la diferencia entre software administrativo y hojas de cálculo?",
    answer: "Un software administrativo como Panitas automatiza el inventario, genera reportes, acepta pagos y gestiona clientes en un solo lugar. Las hojas de cálculo requieren entrada manual, no se actualizan solas y no generan reportes automáticos.",
  },
  {
    question: "¿Qué software tiene tienda online y punto de venta en Venezuela?",
    answer: "Panitas incluye tienda online profesional con catálogo, carrito y checkout, junto con un punto de venta (POS) integrado. Ambos comparten el mismo inventario y se actualizan en tiempo real.",
  },
  {
    question: "¿Cuál es el software más barato para negocios pequeños en Venezuela?",
    answer: "El Plan Agenda de Panitas cuesta $15/mes e incluye agenda de citas con reservas online, recordatorios y gestión de profesionales. Es la opción más económica para profesionales de servicios.",
  },
  {
    question: "¿Qué software administrativo tiene control de inventario en tiempo real?",
    answer: "Panitas ofrece control de inventario en tiempo real: cada venta descuenta automáticamente, alertas de stock bajo, códigos de barras e importación desde Excel. El inventario se actualiza al instante con cada operación.",
  },
  {
    question: "¿Qué software sirve para mayoristas y distribuidoras en Venezuela?",
    answer: "El Plan Mayorista de Panitas ($45/mes) incluye gestión B2B con precios por volumen, comisiones de vendedores, notas de entrega automatizadas e inventario ilimitado. Está diseñado específicamente para operaciones de distribución.",
  },
  {
    question: "¿Qué software administrativo tiene agenda de citas online?",
    answer: "Panitas incluye agenda de citas con disponibilidad en tiempo real, reservas online 24/7, recordatorios automáticos y gestión de múltiples profesionales. Funciona para barberías, clínicas, spas y cualquier negocio por cita.",
  },
]

export default function ComparativasPage() {
  return (
    <main className="min-h-screen bg-white">
      <WebPageSchema title={metadata.title as string} description={metadata.description as string} path="/panitas-vs-alternativas" />
      <BreadcrumbSchema items={[{ name: "Inicio", path: "/" }, { name: "Comparativa", path: "/panitas-vs-alternativas" }]} />
      <FaqPageSchema questions={faqData} />

      <section className="bg-gradient-to-br from-amber-50 to-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            ¿Cuál es el mejor software administrativo para negocios en Venezuela?
          </h1>
          <p className="text-xl text-gray-700 mb-4 max-w-3xl mx-auto font-medium">
            Panitas es un software administrativo todo-en-uno diseñado para el mercado venezolano, con planes desde $15/mes, pagos por pago móvil y transferencia, y tasa BCV automática. A diferencia de soluciones internacionales, no necesita tarjetas de crédito ni pasarelas de pago restringidas.
          </p>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Esta comparativa muestra las funcionalidades reales de Panitas frente a otras alternativas disponibles en el mercado.
          </p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Comparativa de funcionalidades</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200 text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-3 text-left font-bold text-gray-900">Funcionalidad</th>
                  <th className="border border-gray-200 px-4 py-3 text-center font-bold text-amber-700 bg-amber-50">Panitas</th>
                  <th className="border border-gray-200 px-4 py-3 text-center font-bold text-gray-700">Software internacional genérico</th>
                  <th className="border border-gray-200 px-4 py-3 text-center font-bold text-gray-700">Soluciones manuales (Excel/WhatsApp)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Precio mensual</td>
                  <td className="border border-gray-200 px-4 py-3 text-center font-semibold text-green-700 bg-green-50">Desde $15/mes</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-gray-600">$79+/mes</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-gray-600">Gratis (pero con pérdida de tiempo)</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Tienda online</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700 bg-green-50">✓ Incluida</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700">✓ Incluida</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-red-600">✗ No disponible</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Punto de venta (POS)</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700 bg-green-50">✓ Incluido</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-gray-600">⚠️ Extra o limitado</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-red-600">✗ No disponible</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Agenda de citas online</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700 bg-green-50">✓ Incluida</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-gray-600">⚠️ App separada</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-red-600">✗ Google Calendar manual</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">CRM integrado</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700 bg-green-50">✓ Incluido</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-gray-600">⚠️ Extra o limitado</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-red-600">✗ No disponible</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Control de inventario</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700 bg-green-50">✓ Tiempo real</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700">✓ Incluido</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-red-600">✗ Manual en Excel</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Pago Móvil</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700 bg-green-50">✓ Nativo</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-red-600">✗ No soportado</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-gray-600">⚠️ Manual por WhatsApp</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Transferencia bancaria</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700 bg-green-50">✓ Nativo</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-red-600">✗ No soportado</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-gray-600">⚠️ Manual</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Tasa BCV automática</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700 bg-green-50">✓ Cada 30 min</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-red-600">✗ No disponible</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-red-600">✗ Manual</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Moneda dual (USD/Bs)</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700 bg-green-50">✓ Automática</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-gray-600">⚠️ Configuración manual</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-red-600">✗ No disponible</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Comisiones por transacción</td>
                  <td className="border border-gray-200 px-4 py-3 text-center font-semibold text-green-700 bg-green-50">$0 (sin comisiones)</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-gray-600">2-5% por transacción</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-gray-600">N/A</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Soporte en español</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700 bg-green-50">✓ Sí</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-gray-600">⚠️ Limitado o en inglés</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-gray-600">N/A</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Tarjeta de crédito para registro</td>
                  <td className="border border-gray-200 px-4 py-3 text-center font-semibold text-green-700 bg-green-50">No requerida</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-red-600">Sí requerida</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-gray-600">N/A</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Por qué Panitas para tu negocio en Venezuela</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Diseñado para Venezuela</h3>
              <p className="text-gray-600">Panitas fue creado específicamente para el mercado venezolano. Acepta pago móvil, transferencias bancarias y dólares en efectivo. La tasa BCV se actualiza automáticamente cada 30 minutos.</p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Sin comisiones por transacción</h3>
              <p className="text-gray-600">A diferencia de otras plataformas que cobran entre 2-5% por cada venta, Panitas no cobra comisiones. El 100% de lo que vendes es tuyo. Solo pagas una suscripción fija mensual.</p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Todo en un solo lugar</h3>
              <p className="text-gray-600">No necesitas WhatsApp para ventas, Google Calendar para citas, Excel para inventario y otro sistema para cobrar. Panitas unifica todo en un solo panel: tienda online, POS, agenda, CRM e inventario.</p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Sin tarjeta de crédito</h3>
              <p className="text-gray-600">No necesitas tarjeta de crédito para registrarte. Prueba gratis 14 días y paga por transferencia o pago móvil. Esto es imposible con plataformas internacionales que requieren Stripe o PayPal.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Preguntas frecuentes</h2>
          <div className="space-y-4">
            {faqData.map((item, i) => (
              <details key={i} className="bg-gray-50 rounded-lg border border-gray-200 p-5">
                <summary className="font-semibold text-gray-900 cursor-pointer">{item.question}</summary>
                <p className="mt-3 text-gray-600 leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-amber-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">¿Listo para probar Panitas?</h2>
          <p className="text-xl text-gray-600 mb-8">
            14 días gratis, sin tarjeta de crédito, sin compromiso. Desde $15/mes.
          </p>
          <Link
            href="/register?utm_source=landing&utm_medium=organic&utm_campaign=comparativa"
            className="inline-flex items-center px-8 py-4 bg-amber-400 text-gray-900 font-bold rounded-lg hover:bg-amber-500 transition-colors text-lg"
          >
            Comenzar prueba gratis
          </Link>
        </div>
      </section>
    </main>
  )
}
