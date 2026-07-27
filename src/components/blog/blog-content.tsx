import type { BlogSection, BlogPost } from "@/lib/blog/posts"
import { getRelatedPosts } from "@/lib/blog/posts"
import Link from "next/link"

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function SectionRenderer({ section }: { section: BlogSection }) {
  switch (section.type) {
    case "h2":
      return (
        <h2 id={slugify(section.content)} className="text-2xl font-bold text-gray-900 mt-10 mb-4 scroll-mt-24">
          {section.content}
        </h2>
      )
    case "paragraph":
      return <p className="text-gray-700 leading-relaxed mb-4">{section.content}</p>
    case "list":
      return (
        <div className="mb-4">
          {section.content && <p className="text-gray-700 leading-relaxed mb-2 font-medium">{section.content}</p>}
          <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
            {section.items?.map((item, i) => (
              <li key={i} className="leading-relaxed">{item}</li>
            ))}
          </ul>
        </div>
      )
    case "callout":
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 my-8">
          <p className="text-gray-900 font-medium leading-relaxed">{section.content}</p>
          <Link
            href="/register"
            className="inline-block mt-4 px-6 py-3 bg-amber-400 text-gray-900 font-semibold rounded-lg hover:bg-amber-500 transition-colors"
          >
            Prueba Panitas gratis
          </Link>
        </div>
      )
    default:
      return null
  }
}

export function BlogTOC({ sections }: { sections: BlogSection[] }) {
  const headings = sections.filter((s) => s.type === "h2")
  if (headings.length === 0) return null

  return (
    <nav className="hidden lg:block sticky top-24 self-start bg-gray-50 rounded-xl p-6 border border-gray-100">
      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">En este artículo</h3>
      <ul className="space-y-2">
        {headings.map((h, i) => (
          <li key={i}>
            <a
              href={`#${slugify(h.content)}`}
              className="text-sm text-gray-600 hover:text-amber-600 transition-colors line-clamp-2"
            >
              {h.content}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function BlogArticleContent({ post }: { post: BlogPost }) {
  return (
    <div className="max-w-none">
      {post.sections.map((section, i) => (
        <SectionRenderer key={i} section={section} />
      ))}
    </div>
  )
}

export function BlogArticleFAQ({ faq }: { faq: BlogPost["faq"] }) {
  if (faq.length === 0) return null

  return (
    <section className="mt-12 pt-8 border-t border-gray-200">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes</h2>
      <div className="space-y-4">
        {faq.map((item, i) => (
          <details key={i} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
            <summary className="font-semibold text-gray-900 cursor-pointer">{item.question}</summary>
            <p className="mt-2 text-gray-600">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

export function BlogRelatedPosts({ post }: { post: BlogPost }) {
  const related = getRelatedPosts(post)
  if (related.length === 0) return null

  return (
    <section className="mt-12 pt-8 border-t border-gray-200">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Artículos relacionados</h2>
      <div className="grid md:grid-cols-2 gap-6">
        {related.map((r) => (
          <Link
            key={r.slug}
            href={`/blog/${r.categorySlug}/${r.slug}`}
            className="block bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors"
          >
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">{r.category}</span>
            <h3 className="text-lg font-semibold text-gray-900 mt-1 mb-2">{r.title}</h3>
            <p className="text-sm text-gray-600 line-clamp-2">{r.metaDescription}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function BlogArticleCTA({ post }: { post: BlogPost }) {
  return (
    <section className="mt-12 bg-gradient-to-br from-amber-50 to-white rounded-xl p-8 text-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-3">{post.ctaText}</h2>
      <p className="text-gray-600 mb-6 max-w-lg mx-auto">
        Prueba Panitas gratis por 14 días. Sin tarjeta de crédito. Sin compromiso.
      </p>
      <Link
        href={post.ctaLink}
        className="inline-flex items-center px-8 py-4 bg-amber-400 text-gray-900 font-bold rounded-lg hover:bg-amber-500 transition-colors"
      >
        Comenzar prueba gratis
      </Link>
    </section>
  )
}
