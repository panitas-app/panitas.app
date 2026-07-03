"use client"

import Link from "next/link"
import { Mail, Phone, Clock, Copy, ExternalLink, MessageCircle, Music2, Camera } from "lucide-react"

const contactMethods = [
  {
    icon: Mail,
    label: "Correo Electrónico",
    value: "supportpanitas@gmail.com",
    href: "mailto:supportpanitas@gmail.com",
    action: "Enviar correo",
    actionIcon: ExternalLink,
    available: true,
  },
  {
    icon: Phone,
    label: "Teléfono",
    value: "Próximamente disponible",
    action: "Notificar cuando esté listo",
    actionIcon: MessageCircle,
    available: false,
  },
  {
    icon: Clock,
    label: "Horario de Soporte",
    value: "Lunes a viernes, 9:00 AM – 6:00 PM (VET)",
    description: "Respuesta en menos de 24 horas hábiles",
    available: true,
  },
]

export default function ContactoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1628] via-[#0F2240] to-[#102A43] text-white">
      <div className="mx-auto max-w-4xl px-4 py-20">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-3">Contacto</h1>
          <p className="text-slate-400">Estamos aquí para ayudarte.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {contactMethods.map((method) => (
            <div
              key={method.label}
              className={`rounded-2xl border p-6 ${
                method.available
                  ? "bg-white/5 border-white/10"
                  : "bg-white/[0.02] border-white/5"
              }`}
            >
              <div className="flex size-12 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 mb-4">
                <method.icon className="size-5" />
              </div>
              <h3 className="text-sm font-semibold text-amber-300 mb-1">
                {method.label}
              </h3>
              <p
                className={`text-sm leading-relaxed mb-4 ${
                  method.available ? "text-white" : "text-slate-500 italic"
                }`}
              >
                {method.value}
              </p>
              {"description" in method && method.description && (
                <p className="text-xs text-slate-500 mb-4">{method.description}</p>
              )}
              {method.available && method.href && (
                <div className="flex gap-2">
                  <a
                    href={method.href}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary/20 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/30 transition-colors"
                  >
                    <method.actionIcon className="size-3.5" />
                    {method.action}
                  </a>
                  {method.label === "Correo Electrónico" && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(method.value)
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:border-white/20 transition-colors"
                    >
                      <Copy className="size-3.5" />
                      Copiar
                    </button>
                  )}
                </div>
              )}
              {!method.available && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-500/10 px-3 py-2 text-xs font-medium text-slate-500">
                  Próximo
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <h2 className="text-lg font-bold text-amber-300 mb-5">Síguenos en redes</h2>
          <div className="flex justify-center gap-6">
            <a
              href="https://instagram.com/panitas.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-sm text-slate-300 hover:border-amber-500/40 hover:text-white hover:bg-amber-500/10 transition-all group"
            >
              <Camera className="size-6 text-amber-300 group-hover:scale-110 transition-transform" />
              <span className="font-medium">@panitas.app</span>
              <span className="text-xs text-slate-500">Instagram</span>
            </a>
            <a
              href="https://tiktok.com/@panitas.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-sm text-slate-300 hover:border-amber-500/40 hover:text-white hover:bg-amber-500/10 transition-all group"
            >
              <Music2 className="size-6 text-amber-300 group-hover:scale-110 transition-transform" />
              <span className="font-medium">@panitas.app</span>
              <span className="text-xs text-slate-500">TikTok</span>
            </a>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-sm text-slate-400 leading-relaxed">
            Antes de escribirnos, revisa nuestras{" "}
            <Link href="/faq" className="text-amber-300 hover:text-amber-200 underline">
              Preguntas Frecuentes
            </Link>
            . Es probable que encuentres una respuesta inmediata.
          </p>
        </div>

        <div className="mt-12 text-center">
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
