import type { Metadata } from "next"
import Link from "next/link"
import { BLOG_CATEGORIES, BLOG_POSTS } from "@/lib/blog/posts"
import { BlogCard, BlogFeaturedCard } from "@/components/blog/blog-card"

export const metadata: Metadata = {
  title: "Panitas | Blog de Software Administrativo para Negocios",
  description: "Artículos sobre software administrativo, control de inventario, punto de venta, agenda de citas, marketing digital y consejos para hacer crecer tu negocio en Venezuela.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Panitas | Blog de Software Administrativo para Negocios",
    description: "Artículos y guías sobre software administrativo, control de inventario, punto de venta y agenda de citas para negocios en Venezuela.",
    url: "/blog",
    siteName: "Panitas",
    locale: "es_VE",
  },
}

const sortedPosts = [...BLOG_POSTS].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

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

      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Categorías</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {BLOG_CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/blog/${cat.slug}`}
                className="bg-gray-50 rounded-xl p-5 hover:bg-gray-100 transition-colors"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{cat.name}</h3>
                <p className="text-sm text-gray-600">{cat.description}</p>
                <span className="text-xs text-amber-600 font-medium mt-2 inline-block">{cat.postCount} artículos</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Últimos artículos</h2>
          {sortedPosts.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedPosts.map((post, i) =>
                i === 0 ? (
                  <div key={post.slug} className="md:col-span-2 lg:col-span-3">
                    <BlogFeaturedCard post={post} />
                  </div>
                ) : (
                  <BlogCard key={post.slug} post={post} />
                )
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-6">Estamos preparando contenido nuevo para ti.</p>
              <Link
                href="/register"
                className="inline-flex items-center px-6 py-3 bg-amber-400 text-gray-900 font-semibold rounded-lg hover:bg-amber-500 transition-colors"
              >
                Prueba Panitas gratis
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="bg-gray-50 py-12 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">¿Quieres aprender más?</h2>
          <p className="text-lg text-gray-600 mb-6">
            Descubre cómo Panitas puede ayudarte a administrar tu inventario, ventas y agenda en un solo lugar.
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
