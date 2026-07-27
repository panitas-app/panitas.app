import type { Metadata } from "next"
import Link from "next/link"
import { FaqPageSchema, BreadcrumbSchema, WebPageSchema, PricingOfferSchema } from "@/lib/seo/schema"

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://panitas.app"

export const metadata: Metadata = {
  title: "Panitas | Planes y Precios del Software Administrativo — Desde $15/mes",
  description: "Conoce los planes de Panitas: Agenda ($15/mes) para profesionales de citas, Emprendedor ($25/mes) con tienda online y POS, y Mayorista ($45/mes) para distribución B2B. Sin comisiones por transacción.",
  alternates: { canonical: "/precios" },
  openGraph: {
    title: "Panitas | Planes y Precios del Software Administrativo — Desde $15/mes",
    description: "Conoce los planes de Panitas: Agenda ($15/mes), Emprendedor ($25/mes) y Mayorista ($45/mes). Sin comisiones por transacción.",
    url: `${baseUrl}/precios`,
    siteName: "Panitas",
    locale: "es_VE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Panitas | Planes y Precios del Software Administrativo — Desde $15/mes",
    description: "Conoce los planes de Panitas: Agenda ($15/mes), Emprendedor ($25/mes) y Mayorista ($45/mes). Sin comisiones por transacción.",
  },
}

const faqData = [
  {
    question: "¿Cuánto cuesta Panitas?",
    answer: "Panitas tiene tres planes: Agenda a $15/mes, Emprendedor a $25/mes y Mayorista a $45/mes. Todos incluyen 14 días de prueba gratuita sin tarjeta de crédito. También puedes pagar anualmente con descuento: $150/año, $250/año y $450/año respectivamente.",
  },
  {
    question: "¿Qué plan es mejor para una barbería o peluquería?",
    answer: "El Plan Agenda ($15/mes) es ideal para barberías y peluquerías. Incluye agenda de citas online, reservas 24/7, recordatorios automáticos y gestión de múltiples profesionales. Si además vendes productos, el Plan Emprendedor ($25/mes) agrega tienda online e inventario.",
  },
  {
    question: "¿Qué plan es mejor para una tienda o comercio?",
    answer: "El Plan Emprendedor ($25/mes) es ideal para tiendas y comercios. Incluye tienda online profesional, punto de venta (POS), control de inventario, CRM y reportes. Si necesitas vender al por mayor, el Plan Mayorista ($45/mes) agrega funcionalidades B2B.",
  },
  {
    question: "¿Qué plan es mejor para una distribuidora o mayorista?",
    answer: "El Plan Mayorista ($45/mes) está diseñado para distribuidoras y mayoristas. Incluye gestión B2B, precios por volumen, comisiones de vendedores, notas de entrega automatizadas e inventario ilimitado con hasta 10 miembros de equipo.",
  },
  {
    question: "¿Puedo cambiar de plan después de registrarme?",
    answer: "Sí. Puedes actualizar o cambiar de plan en cualquier momento desde tu panel de administración. El cambio se refleja inmediatamente y se ajusta el precio proporcionalmente.",
  },
  {
    question: "¿Hay comisiones por transacción?",
    answer: "No. Panitas no cobra comisiones por transacción. El 100% de lo que vendes es tuyo. Solo pagas una suscripción fija mensual según tu plan.",
  },
  {
    question: "¿Qué métodos de pago acepta Panitas?",
    answer: "Panitas acepta transferencia bancaria, pago móvil, punto de venta y dólares en efectivo. No necesitas tarjeta de crédito para pagar. Los planes se activan manualmente tras verificar el pago.",
  },
  {
    question: "¿Necesito conocimientos técnicos para usar Panitas?",
    answer: "No. Panitas es fácil de usar. La configuración toma menos de 15 minutos. No requiere instalación y funciona desde cualquier navegador web o celular. No necesitas saber de programación ni bases de datos.",
  },
]

export default function PreciosPage() {
  return (
    <main className="min-h-screen bg-white">
      <WebPageSchema title={metadata.title as string} description={metadata.description as string} path="/precios" />
      <BreadcrumbSchema items={[{ name: "Inicio", path: "/" }, { name: "Precios", path: "/precios" }]} />
      <FaqPageSchema questions={faqData} />
      <PricingOfferSchema />

      <section className="bg-gradient-to-br from-amber-50 to-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Planes y precios de Panitas
          </h1>
          <p className="text-xl text-gray-700 mb-4 max-w-3xl mx-auto font-medium">
            Panitas ofrece tres planes de software administrativo para negocios en Venezuela: desde $15/mes para profesionales de citas hasta $45/mes para distribuidoras y mayoristas. Sin comisiones por transacción, sin tarjeta de crédito.
          </p>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Todos los planes incluyen 14 días de prueba gratuita. Paga por transferencia o pago móvil.
          </p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Comparativa de planes</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200 text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-3 text-left font-bold text-gray-900">Característica</th>
                  <th className="border border-gray-200 px-4 py-3 text-center font-bold text-gray-700">Agenda</th>
                  <th className="border border-gray-200 px-4 py-3 text-center font-bold text-amber-700 bg-amber-50">Emprendedor</th>
                  <th className="border border-gray-200 px-4 py-3 text-center font-bold text-gray-700">Mayorista</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Precio mensual</td>
                  <td className="border border-gray-200 px-4 py-3 text-center font-bold text-gray-900">$15/mes</td>
                  <td className="border border-gray-200 px-4 py-3 text-center font-bold text-amber-700 bg-amber-50">$25/mes</td>
                  <td className="border border-gray-200 px-4 py-3 text-center font-bold text-gray-900">$45/mes</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Precio anual</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-gray-600">$150/año</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-amber-700 bg-amber-50">$250/año</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-gray-600">$450/año</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Cuota (2 pagos)</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-gray-600">$9 × 2</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-amber-700 bg-amber-50">$14 × 2</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-gray-600">$25 × 2</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Miembros de equipo</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-gray-600">1</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-amber-700 bg-amber-50">3</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-gray-600">10</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Ideal para</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-gray-600">Barberías, clínicas, spas</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-amber-700 bg-amber-50">Tiendas, comercios, emprendedores</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-gray-600">Distribuidoras, mayoristas</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Agenda de citas online</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700">✓</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700 bg-green-50">✓</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700">✓</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Tienda online</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-red-600">✗</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700 bg-green-50">✓</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700">✓</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Punto de venta (POS)</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-red-600">✗</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700 bg-green-50">✓</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700">✓</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Control de inventario</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-red-600">✗</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700 bg-green-50">✓</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700">✓</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">CRM</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-red-600">✗</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700 bg-green-50">✓</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700">✓</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Módulo B2B</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-red-600">✗</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-red-600">✗</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700">✓</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Comisiones de vendedores</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-red-600">✗</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-red-600">✗</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700">✓</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Notas de entrega</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-red-600">✗</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-red-600">✗</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700">✓</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Reportes y dashboard</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700">✓</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700 bg-green-50">✓</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700">✓</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Pago Móvil y transferencia</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700">✓</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700 bg-green-50">✓</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700">✓</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Tasa BCV automática</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700">✓</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700 bg-green-50">✓</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700">✓</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Comisiones por transacción</td>
                  <td className="border border-gray-200 px-4 py-3 text-center font-bold text-green-700">$0</td>
                  <td className="border border-gray-200 px-4 py-3 text-center font-bold text-green-700 bg-green-50">$0</td>
                  <td className="border border-gray-200 px-4 py-3 text-center font-bold text-green-700">$0</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">Prueba gratuita</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700">14 días</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700 bg-green-50">14 días</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-green-700">14 días</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">¿Qué plan es para ti?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <span className="text-3xl mb-3 block">✂️</span>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Eres profesional de servicios</h3>
              <p className="text-gray-600 mb-4">Barbería, peluquería, clínica, consultorio, spa. Necesitas agenda de citas online, recordatorios y gestión de profesionales.</p>
              <p className="text-2xl font-bold text-gray-900 mb-4">$15/mes</p>
              <Link
                href="/register?plan=agenda&utm_source=landing&utm_medium=organic&utm_campaign=precios"
                className="block text-center px-6 py-3 bg-amber-400 text-gray-900 font-semibold rounded-lg hover:bg-amber-500 transition-colors"
              >
                Plan Agenda
              </Link>
            </div>
            <div className="bg-white rounded-xl p-6 border-2 border-amber-300 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-400 text-gray-900 text-xs font-bold rounded-full">Más popular</span>
              <span className="text-3xl mb-3 block">🏪</span>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Eres dueño de tienda o comercio</h3>
              <p className="text-gray-600 mb-4">Tienda online, POS, inventario, CRM y reportes. Todo lo que necesitas para vender online y en local.</p>
              <p className="text-2xl font-bold text-gray-900 mb-4">$25/mes</p>
              <Link
                href="/register?plan=emprendedor&utm_source=landing&utm_medium=organic&utm_campaign=precios"
                className="block text-center px-6 py-3 bg-amber-400 text-gray-900 font-semibold rounded-lg hover:bg-amber-500 transition-colors"
              >
                Plan Emprendedor
              </Link>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <span className="text-3xl mb-3 block">📦</span>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Eres distribuidor o mayorista</h3>
              <p className="text-gray-600 mb-4">Gestión B2B, precios por volumen, comisiones de vendedores, notas de entrega e inventario ilimitado.</p>
              <p className="text-2xl font-bold text-gray-900 mb-4">$45/mes</p>
              <Link
                href="/register?plan=mayorista&utm_source=landing&utm_medium=organic&utm_campaign=precios"
                className="block text-center px-6 py-3 bg-amber-400 text-gray-900 font-semibold rounded-lg hover:bg-amber-500 transition-colors"
              >
                Plan Mayorista
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Preguntas frecuentes sobre precios</h2>
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
          <h2 className="text-3xl font-bold text-gray-900 mb-4">¿Listo para empezar?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Prueba Panitas gratis por 14 días. Sin tarjeta de crédito. Sin compromiso.
          </p>
          <Link
            href="/register?utm_source=landing&utm_medium=organic&utm_campaign=precios"
            className="inline-flex items-center px-8 py-4 bg-amber-400 text-gray-900 font-bold rounded-lg hover:bg-amber-500 transition-colors text-lg"
          >
            Comenzar prueba gratis
          </Link>
        </div>
      </section>
    </main>
  )
}
