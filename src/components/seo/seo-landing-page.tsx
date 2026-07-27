import Link from "next/link"
import { PAGE_META } from "@/lib/seo/constants"
import { getSeoLandingData, type SeoLandingData } from "./landing-content"
import { WebPageSchema, BreadcrumbSchema } from "@/lib/seo/schema"

function LandingPageContent({ data, route }: { data: SeoLandingData; route: string }) {
  const meta = PAGE_META[route]
  const breadcrumbs = [
    { name: "Inicio", path: "/" },
    { name: meta?.title?.replace("Panitas | ", "") || route.replace("/", "").replace(/-/g, " "), path: route },
  ]

  return (
    <main className="min-h-screen bg-white">
      <WebPageSchema title={meta?.title || ""} description={meta?.description || ""} path={route} />
      <BreadcrumbSchema items={breadcrumbs} />
      <section className="bg-gradient-to-br from-amber-50 to-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">{data.heroTitle}</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">{data.heroSubtitle}</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/register"
              className="inline-flex items-center px-6 py-3 bg-amber-400 text-gray-900 font-semibold rounded-lg hover:bg-amber-500 transition-colors"
            >
              {data.ctaText}
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Ver planes
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Todo lo que incluye</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {data.features.map((f, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Preguntas frecuentes</h2>
          <div className="space-y-4">
            {data.faqs.map((faq, i) => (
              <details key={i} className="bg-white rounded-lg border border-gray-200 p-4">
                <summary className="font-semibold text-gray-900 cursor-pointer">{faq.q}</summary>
                <p className="mt-2 text-gray-600">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">¿Listo para empezar?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Prueba Panitas gratis por 14 días. Sin tarjeta de crédito. Sin compromiso.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center px-8 py-4 bg-amber-400 text-gray-900 font-bold rounded-lg hover:bg-amber-500 transition-colors text-lg"
          >
            Comenzar prueba gratis
          </Link>
        </div>
      </section>
    </main>
  )
}

export default function SeoLandingPage({ route }: { route: string }) {
  const meta = PAGE_META[route]
  if (!meta) return null
  const data = getSeoLandingData(route)
  return <LandingPageContent data={data} route={route} />
}