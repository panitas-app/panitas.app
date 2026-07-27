import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { BLOG_POSTS, getAllPostSlugs, getPostBySlug } from "@/lib/blog/posts"
import { ArticleSchema, BreadcrumbSchema } from "@/lib/seo/schema"
import { BlogTOC, BlogArticleContent, BlogArticleFAQ, BlogRelatedPosts, BlogArticleCTA } from "@/components/blog/blog-content"

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://panitas.app"

export async function generateStaticParams() {
  return getAllPostSlugs()
}

export async function generateMetadata({ params }: { params: Promise<{ category: string; postSlug: string }> }): Promise<Metadata> {
  const { postSlug } = await params
  const post = getPostBySlug(postSlug)
  if (!post) return { title: "Artículo no encontrado | Panitas" }

  return {
    title: post.title,
    description: post.metaDescription,
    alternates: { canonical: `/blog/${post.categorySlug}/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.metaDescription,
      url: `${baseUrl}/blog/${post.categorySlug}/${post.slug}`,
      siteName: "Panitas",
      locale: "es_VE",
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.dateModified,
      authors: [post.author],
      images: [{ url: `${baseUrl}${post.image}`, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.metaDescription,
      images: [`${baseUrl}${post.image}`],
    },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ category: string; postSlug: string }> }) {
  const { category, postSlug } = await params
  const post = getPostBySlug(postSlug)
  if (!post || post.categorySlug !== category) notFound()

  const breadcrumbs = [
    { name: "Inicio", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: post.category, path: `/blog/${post.categorySlug}` },
    { name: post.title, path: `/blog/${post.categorySlug}/${post.slug}` },
  ]

  return (
    <main className="min-h-screen bg-white">
      <ArticleSchema post={post} />
      <BreadcrumbSchema items={breadcrumbs} />

      <article className="max-w-7xl mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <Link
              href={`/blog/${post.categorySlug}`}
              className="text-sm font-semibold text-amber-600 hover:text-amber-700 uppercase tracking-wider"
            >
              {post.category}
            </Link>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mt-3 mb-4 leading-tight">
              {post.title}
            </h1>
            <p className="text-lg text-gray-600 mb-6">{post.metaDescription}</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs">
                  {post.author.charAt(0)}
                </div>
                <div>
                  <span className="font-medium text-gray-900">{post.author}</span>
                  <span className="text-gray-400 mx-1">·</span>
                  <span>{post.authorRole}</span>
                </div>
              </div>
              <span className="text-gray-300">|</span>
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString("es-VE", { year: "numeric", month: "long", day: "numeric" })}
              </time>
              <span className="text-gray-300">|</span>
              <span>{post.readingTime}</span>
            </div>
          </header>
        </div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1fr_280px] gap-12">
          <div className="max-w-4xl mx-auto lg:mx-0">
            <BlogArticleContent post={post} />
            <BlogArticleFAQ faq={post.faq} />
            <BlogRelatedPosts post={post} />
            <BlogArticleCTA post={post} />
          </div>

          <aside className="hidden lg:block">
            <BlogTOC sections={post.sections} />
          </aside>
        </div>
      </article>
    </main>
  )
}
