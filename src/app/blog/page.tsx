import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Blog de Software Administrativo para Negocios | Panitas",
  description: "Artículos sobre software administrativo, control de inventario, punto de venta, agenda de citas y consejos para hacer crecer tu negocio en Venezuela.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Panitas | Blog de Software Administrativo para Negocios",
    description: "Artículos y guías sobre software administrativo, control de inventario, punto de venta y agenda de citas para negocios en Venezuela.",
    url: "/blog",
    siteName: "Panitas",
    locale: "es_VE",
  },
}

const categories = [
  { name: "Inventario", slug: "inventario", desc: "Control de stock, códigos de barras y gestión de productos" },
  { name: "Ventas y POS", slug: "ventas-pos", desc: "Punto de venta, facturación y métodos de pago" },
  { name: "Agenda de citas", slug: "agenda-citas", desc: "Reservas online, recordatorios y calendario" },
  { name: "Negocios", slug: "negocios", desc: "Emprendimiento, administración y crecimiento empresarial" },
  { name: "Tienda online", slug: "tienda-online", desc: "E-commerce, catálogo digital y ventas por internet" },
  { name: "Tutoriales", slug: "tutoriales", desc: "Guías paso a paso para usar Panitas" },
]

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="bg-gradient-to-br from-amber-50 to-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Blog de Panitas</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Aprende a gestionar tu negocio con artículos sobre inventario, ventas, agenda de citas, marketing digital y más.
          </p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Categorías</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/blog/${cat.slug}`}
                className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{cat.name}</h3>
                <p className="text-gray-600">{cat.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-16 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Próximamente</h2>
          <p className="text-xl text-gray-600 mb-8">
            Estamos preparando artículos detallados para ayudarte a sacar el máximo provecho de Panitas.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center px-8 py-4 bg-amber-400 text-gray-900 font-bold rounded-lg hover:bg-amber-500 transition-colors"
          >
            Prueba Panitas gratis
          </Link>
        </div>
      </section>
    </main>
  )
}