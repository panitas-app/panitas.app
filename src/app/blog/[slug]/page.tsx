import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"

const categories = ["inventario", "ventas-pos", "agenda-citas", "negocios", "tienda-online", "tutoriales"]

const categoryNames: Record<string, string> = {
  "inventario": "Inventario",
  "ventas-pos": "Ventas y POS",
  "agenda-citas": "Agenda de Citas",
  "negocios": "Negocios",
  "tienda-online": "Tienda Online",
  "tutoriales": "Tutoriales",
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const name = categoryNames[slug]
  if (!name) return { title: "Categoría no encontrada | Panitas" }
  return {
    title: `${name} | Blog de Panitas`,
    description: `Artículos sobre ${name.toLowerCase()} para tu negocio. Guías, consejos y tutoriales sobre software administrativo en Venezuela.`,
    alternates: { canonical: `/blog/${slug}` },
  }
}

export default async function BlogCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!categories.includes(slug)) notFound()
  const name = categoryNames[slug]

  return (
    <main className="min-h-screen bg-white">
      <section className="bg-gradient-to-br from-amber-50 to-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Link href="/blog" className="text-amber-600 hover:text-amber-700 mb-4 inline-block">&larr; Volver al blog</Link>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">{name}</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Artículos sobre {name.toLowerCase()} para ayudarte a gestionar tu negocio con Panitas.
          </p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-500 text-lg mb-8">No hay artículos publicados aún. Estamos trabajando en contenido nuevo.</p>
          <Link
            href="/register"
            className="inline-flex items-center px-6 py-3 bg-amber-400 text-gray-900 font-semibold rounded-lg hover:bg-amber-500 transition-colors"
          >
            Prueba Panitas gratis
          </Link>
        </div>
      </section>
    </main>
  )
}