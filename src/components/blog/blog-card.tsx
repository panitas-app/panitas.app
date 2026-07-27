import Link from "next/link"
import type { BlogPost } from "@/lib/blog/posts"

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.categorySlug}/${post.slug}`}
      className="block bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-amber-200 transition-all group"
    >
      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-full uppercase tracking-wider">
            {post.category}
          </span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-500">{post.readingTime}</span>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-amber-600 transition-colors line-clamp-2">
          {post.title}
        </h3>
        <p className="text-sm text-gray-600 line-clamp-2 mb-4">{post.metaDescription}</p>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{post.author}</span>
          <time dateTime={post.date}>{new Date(post.date).toLocaleDateString("es-VE", { year: "numeric", month: "long", day: "numeric" })}</time>
        </div>
      </div>
    </Link>
  )
}

export function BlogFeaturedCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.categorySlug}/${post.slug}`}
      className="block bg-gradient-to-br from-amber-50 to-white rounded-xl border border-amber-100 overflow-hidden hover:shadow-lg transition-all group"
    >
      <div className="p-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-1 rounded-full uppercase tracking-wider">
            {post.category}
          </span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-500">{post.readingTime}</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 group-hover:text-amber-600 transition-colors">
          {post.title}
        </h2>
        <p className="text-gray-600 mb-4 line-clamp-3">{post.metaDescription}</p>
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>{post.author}</span>
          <time dateTime={post.date}>{new Date(post.date).toLocaleDateString("es-VE", { year: "numeric", month: "long", day: "numeric" })}</time>
        </div>
      </div>
    </Link>
  )
}
