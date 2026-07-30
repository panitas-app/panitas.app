import Link from "next/link"
import { getPlanLandingContent, type PlanLandingContent } from "@/lib/plan-landings"
import { ProductSchema, FaqPageSchema, BreadcrumbSchema, WebPageSchema } from "@/lib/seo/schema"
import { BASE_URL, PAGE_META } from "@/lib/seo/constants"

const PLAN_IDS = ["agenda", "emprendedor", "mayorista"] as const
type PlanId = (typeof PLAN_IDS)[number]

const PLAN_SCHEMA_MAP: Record<PlanId, { name: string; description: string; price: string; route: string; planParam: string }> = {
  agenda: {
    name: "Plan Agenda",
    description: "Software de agenda online para profesionales con reservas, recordatorios y calendario.",
    price: "14.99",
    route: "/plan-agenda",
    planParam: "agenda",
  },
  emprendedor: {
    name: "Plan Emprendedor",
    description: "Software administrativo todo-en-uno con inventario, ventas, tienda online, POS y CRM.",
    price: "19.99",
    route: "/plan-emprendedor",
    planParam: "emprendedor",
  },
  mayorista: {
    name: "Plan Mayorista",
    description: "Sistema B2B completo para distribuidoras y mayoristas con comisiones y notas de entrega.",
    price: "49.99",
    route: "/plan-mayorista",
    planParam: "mayorista",
  },
}

function HeroSection({ plan, data }: { plan: PlanId; data: PlanLandingContent }) {
  const info = PLAN_SCHEMA_MAP[plan]
  return (
    <section className="bg-gradient-to-br from-amber-50 to-white py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <span className="inline-block px-4 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-semibold mb-6">
          {info.name} — {data.price}/mes
        </span>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">{data.heroTitle}</h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">{data.heroSubtitle}</p>
        <div className="flex gap-4 justify-center flex-wrap mb-6">
          <Link
            href={`/register?plan=${info.planParam}&utm_source=landing&utm_medium=organic&utm_campaign=plan-${info.planParam}`}
            className="inline-flex items-center px-8 py-4 bg-amber-400 text-gray-900 font-bold rounded-lg hover:bg-amber-500 transition-colors text-lg"
          >
            {data.ctaText}
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center px-6 py-4 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Ver todos los planes
          </Link>
        </div>
        <p className="text-sm text-gray-500">
          {data.price}/mes o {data.priceYearly}/año · 14 días gratis · Sin tarjeta de crédito
        </p>
      </div>
    </section>
  )
}

function IncludesExcludesSection({ data }: { data: PlanLandingContent }) {
  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">{data.comparisonLabel}</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-green-50 rounded-xl p-8 border border-green-100">
            <h3 className="text-xl font-bold text-green-800 mb-6 flex items-center gap-2">
              <span className="text-2xl">✓</span> Qué incluye
            </h3>
            <ul className="space-y-4">
              {data.includes.map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-green-600 font-bold mt-0.5 shrink-0">✓</span>
                  <div>
                    <p className="font-semibold text-gray-900">{item.label}</p>
                    <p className="text-sm text-gray-600">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          {data.excludes.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-8 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-500 mb-6 flex items-center gap-2">
                <span className="text-2xl">✗</span> No incluye
              </h3>
              <ul className="space-y-4">
                {data.excludes.map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-gray-400 font-bold mt-0.5 shrink-0">✗</span>
                    <div>
                      <p className="font-semibold text-gray-700">{item.label}</p>
                      <p className="text-sm text-gray-500">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function UseCasesSection({ data }: { data: PlanLandingContent }) {
  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Casos de uso reales</h2>
        <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
          Negocios como el tuyo ya están usando Panitas para crecer. Estos son algunos ejemplos.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          {data.useCases.map((uc, i) => (
            <div key={i} className="bg-white rounded-xl p-6 border border-gray-100">
              <span className="text-3xl mb-3 block">{uc.icon}</span>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{uc.title}</h3>
              <p className="text-gray-600 leading-relaxed">{uc.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function VerticalLinksSection({ data }: { data: PlanLandingContent }) {
  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">Conoce Panitas para tu tipo de negocio</h2>
        <div className="flex flex-wrap gap-3 justify-center">
          {data.verticalLinks.map((link, i) => (
            <Link
              key={i}
              href={link.href}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-800 transition-colors text-sm font-medium"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function FAQSection({ data }: { data: PlanLandingContent }) {
  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Preguntas frecuentes</h2>
        <div className="space-y-4">
          {data.faq.map((item, i) => (
            <details key={i} className="bg-white rounded-lg border border-gray-200 p-5">
              <summary className="font-semibold text-gray-900 cursor-pointer">{item.question}</summary>
              <p className="mt-3 text-gray-600 leading-relaxed">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function BottomCTA({ plan, data }: { plan: PlanId; data: PlanLandingContent }) {
  const info = PLAN_SCHEMA_MAP[plan]
  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">¿Listo para empezar?</h2>
        <p className="text-xl text-gray-600 mb-8">
          Prueba Panitas gratis por 14 días. Sin tarjeta de crédito. Sin compromiso.
        </p>
        <Link
          href={`/register?plan=${info.planParam}&utm_source=landing&utm_medium=organic&utm_campaign=plan-${info.planParam}`}
          className="inline-flex items-center px-8 py-4 bg-amber-400 text-gray-900 font-bold rounded-lg hover:bg-amber-500 transition-colors text-lg"
        >
          {data.ctaText}
        </Link>
        <p className="text-sm text-gray-500 mt-4">
          {info.name} — {data.price}/mes o {data.priceYearly}/año
        </p>
      </div>
    </section>
  )
}

export default function PlanLandingPage({ plan }: { plan: PlanId }) {
  const data = getPlanLandingContent(plan)
  const info = PLAN_SCHEMA_MAP[plan]
  const meta = PAGE_META[info.route]

  const breadcrumbs = [
    { name: "Inicio", path: "/" },
    { name: "Planes", path: "/pricing" },
    { name: info.name, path: info.route },
  ]

  return (
    <main className="min-h-screen bg-white">
      <WebPageSchema title={meta?.title || ""} description={meta?.description || ""} path={info.route} />
      <BreadcrumbSchema items={breadcrumbs} />
      <ProductSchema
        name={info.name}
        description={info.description}
        price={info.price}
        url={`${BASE_URL}${info.route}`}
        image={`${BASE_URL}/og-image.jpg`}
        brand="Panitas"
      />
      <FaqPageSchema
        questions={data.faq.map((item) => ({ question: item.question, answer: item.answer }))}
      />

      <HeroSection plan={plan} data={data} />
      <IncludesExcludesSection data={data} />
      <UseCasesSection data={data} />
      <VerticalLinksSection data={data} />
      <FAQSection data={data} />
      <BottomCTA plan={plan} data={data} />
    </main>
  )
}
