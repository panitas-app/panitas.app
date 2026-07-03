"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"

interface FAQItem {
  q: string
  a: string
}

interface FAQCategory {
  icon: string
  title: string
  items: FAQItem[]
}

const categories: FAQCategory[] = [
  {
    icon: "💡",
    title: "Sobre Panitas (General)",
    items: [
      {
        q: "¿Qué es Panitas?",
        a: "Panitas es una plataforma tecnológica que te permite crear tu propia tienda online y gestionar tu sistema de agendas de forma rápida y sencilla. Nosotros te damos las herramientas y la infraestructura en la web, pero tú mantienes el control total de tu negocio.",
      },
      {
        q: "¿Panitas se queda con alguna comisión de mis ventas?",
        a: "No, absolutamente nada. El 100% de lo que vendes es tuyo. Panitas no es un intermediario de pagos; solo cobramos una suscripción fija para mantener tu tienda y agenda activas en internet.",
      },
      {
        q: "¿Necesito tener conocimientos técnicos o de programación?",
        a: "Para nada. Panitas está diseñado específicamente para que cualquier emprendedor pueda crear y gestionar su tienda en línea desde su celular en cuestión de minutos, sin escribir una sola línea de código.",
      },
    ],
  },
  {
    icon: "💳",
    title: "Pagos y Suscripción",
    items: [
      {
        q: "¿Qué métodos de pago aceptan para la suscripción?",
        a: "Para tu comodidad, aceptamos exclusivamente Pago Móvil y Transferencias Bancarias en Bolívares (Bs).",
      },
      {
        q: "¿Qué pasa si me retraso en el pago de mi suscripción?",
        a: "¡Tranquilo, a todos nos puede pasar! Con nuestro sistema tienes un lapso de gracia de siete (7) días continuos desde tu fecha de vencimiento para ponerte al día. Si dejas pasar esos 7 días sin reportar tu pago, tu tienda y agenda se pausarán automáticamente y perderán visibilidad pública hasta que te pongas al día.",
      },
      {
        q: "¿Hacen devoluciones de dinero si cancelo mi plan?",
        a: "No. Al ser un software de servicio activo, no realizamos reembolsos ni devoluciones de dinero bajo ninguna circunstancia una vez cobrado el periodo correspondiente.",
      },
    ],
  },
  {
    icon: "📦",
    title: "Envíos, Ventas y Responsabilidad",
    items: [
      {
        q: "¿Cómo funcionan los envíos en Panitas?",
        a: "Para facilitarte la vida, integramos en nuestro sistema una base de datos con todas las agencias nacionales de Zoom, MRW, Tealca y Liberty Express. Puedes configurar tu tienda para que tus clientes elijan envío a oficina, delivery local o retiro en tu sede física.",
      },
      {
        q: "¿Quién paga los costos de envío o delivery?",
        a: "Los costos de envío corren por cuenta del comprador o de la tienda, según cómo lo configures. Si decides activar \"Envíos Gratis\", ese costo sale exclusivamente de tu bolsillo; Panitas no cubre gastos logísticos.",
      },
      {
        q: "Tuve un problema con un pedido retrasado o perdido, ¿Panitas me puede ayudar?",
        a: "Lamentamos el inconveniente, pero Panitas no se hace responsable por pedidos dañados, retrasados o que jamás se hayan entregado. La gestión del empaque, el envío y el reclamo ante la agencia de encomiendas es responsabilidad única y directa de cada comercio.",
      },
      {
        q: "¿Panitas se encarga de la facturación o los impuestos de mi tienda?",
        a: "No. Cada usuario es legal y fiscalmente independiente. Declarar tus ventas ante el SENIAT, cumplir con las normativas de la SUNDDE o emitir facturas legales es tu responsabilidad como comerciante. Panitas no tiene acceso ni responsabilidad sobre tus declaraciones fiscales.",
      },
    ],
  },
  {
    icon: "🔒",
    title: "Privacidad y Visibilidad",
    items: [
      {
        q: "¿Mis clientes pueden encontrarme en buscadores como Google?",
        a: "¡Sí, totalmente! Toda la información pública de tu negocio (nombre, catálogo, dirección o cobertura) es indexada automáticamente por nuestro sistema para que aparezcas en motores de búsqueda como Google y modelos de inteligencia artificial como ChatGPT. Diseñamos esto a propósito para que consigas más clientes en todo internet.",
      },
      {
        q: "¿Qué pasa si veo una tienda vendiendo productos ilegales?",
        a: "En Panitas tenemos una política estricta de cero tolerancia con la venta de armas, drogas, medicamentos regulados, contenido para adultos o esquemas financieros fraudulentos. Si detectas algo sospechoso, repórtalo de inmediato a nuestro correo oficial de soporte: supportpanitas@gmail.com y nuestro equipo dará de baja la cuenta tras verificarlo.",
      },
    ],
  },
  {
    icon: "💰",
    title: "Sobre tus Ventas",
    items: [
      {
        q: "¿Cómo recibo el dinero de las ventas?",
        a: "El dinero va directamente a tus cuentas bancarias. Panitas no intermedia ni retiene tus fondos. Configuras tu Pago Móvil y cuentas de transferencia bancaria, y tus clientes te pagarán directamente a ti.",
      },
      {
        q: "¿Cómo funciona la tasa de cambio BCV automática?",
        a: "Nuestra plataforma se conecta con los datos oficiales del Banco Central de Venezuela. Si fijas tus precios en dólares, el sistema calculará automáticamente el monto exacto en bolívares para tus clientes basándose en la tasa oficial del día.",
      },
      {
        q: "¿Puedo usar mi propio dominio personalizado?",
        a: "Sí, por supuesto. En el plan Avanzado puedes conectar tu propio dominio (ej. mitienda.com) para darle una presencia aún más profesional a tu marca. En los demás planes dispones de un subdominio gratuito tipo panitas.app/mitienda.",
      },
    ],
  },
]

function AccordionItem({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-white hover:bg-white/5 transition-colors"
      >
        <span>{item.q}</span>
        <ChevronDown
          className={`size-4 shrink-0 text-slate-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/10 px-5 py-4 text-xs leading-relaxed text-slate-400">
              {item.a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1628] via-[#0F2240] to-[#102A43] text-white">
      <div className="mx-auto max-w-4xl px-4 py-20">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Preguntas Frecuentes
          </h1>
          <p className="text-sm text-slate-400">
            Todo lo que necesitas saber sobre Panitas, en un solo lugar.
          </p>
        </div>

        <div className="space-y-10">
          {categories.map((category) => (
            <div key={category.title} className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <span className="text-2xl">{category.icon}</span>
                <h2 className="text-lg font-bold text-amber-300">
                  {category.title}
                </h2>
              </div>
              <div className="space-y-3">
                {category.items.map((item) => (
                  <AccordionItem key={item.q} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-slate-400 mb-4">
            ¿No encuentras lo que buscas? Escríbenos a{" "}
            <a
              href="mailto:supportpanitas@gmail.com"
              className="text-amber-300 hover:text-amber-200 underline"
            >
              supportpanitas@gmail.com
            </a>
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
