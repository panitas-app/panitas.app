import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { BLOG_CATEGORIES, getPostsByCategory } from "@/lib/blog/posts"
import { BlogCard } from "@/components/blog/blog-card"

export async function generateStaticParams() {
  return BLOG_CATEGORIES.map((cat) => ({ category: cat.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params
  const cat = BLOG_CATEGORIES.find((c) => c.slug === category)
  if (!cat) return { title: "Categoría no encontrada | Panitas" }
  return {
    title: `${cat.name} | Blog de Panitas`,
    description: `Artículos sobre ${cat.name.toLowerCase()} para tu negocio. Guías, consejos y tutoriales sobre software administrativo en Venezuela.`,
    alternates: { canonical: `/blog/${category}` },
  }
}

export default async function BlogCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  const cat = BLOG_CATEGORIES.find((c) => c.slug === category)
  if (!cat) notFound()

  const posts = getPostsByCategory(category)

  return (
    <main className="min-h-screen bg-white">
      <section className="bg-gradient-to-br from-amber-50 to-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Link href="/blog" className="text-amber-600 hover:text-amber-700 mb-4 inline-block">&larr; Volver al blog</Link>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">{cat.name}</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            {cat.description}
          </p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          {posts.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <BlogCard key={post.slug} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-8">No hay artículos publicados en esta categoría aún.</p>
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
    </main>
  )
}
