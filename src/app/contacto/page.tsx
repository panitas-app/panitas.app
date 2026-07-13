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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-20">
        <div className="mb-12 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <Mail className="size-6 text-primary" />
          </div>
          <h1 className="font-heading text-3xl font-bold mb-2">Contacto</h1>
          <p className="text-sm text-muted-foreground">Estamos aquí para ayudarte.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {contactMethods.map((method) => {
            const MethodIcon = method.icon
            return (
              <div
                key={method.label}
                className={`rounded-2xl p-6 ring-1 ${
                  method.available
                    ? "bg-white/70 backdrop-blur-xl ring-border/20 shadow-sm"
                    : "bg-muted/30 ring-border/10"
                }`}
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 mb-4">
                  <MethodIcon className="size-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  {method.label}
                </h3>
                <p
                  className={`text-sm leading-relaxed mb-4 ${
                    method.available ? "text-foreground/80" : "text-muted-foreground italic"
                  }`}
                >
                  {method.value}
                </p>
                {"description" in method && method.description && (
                  <p className="text-xs text-muted-foreground mb-4">{method.description}</p>
                )}
                {method.available && method.href && (
                  <div className="flex gap-2">
                    <a
                      href={method.href}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary/15 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/25 transition-colors"
                    >
                      <method.actionIcon className="size-3.5" />
                      {method.action}
                    </a>
                    {method.label === "Correo Electrónico" && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(method.value)
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border/30 bg-background/70 backdrop-blur-xl px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border/60 transition-colors cursor-pointer"
                      >
                        <Copy className="size-3.5" />
                        Copiar
                      </button>
                    )}
                  </div>
                )}
                {!method.available && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
                    Próximo
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-12 rounded-2xl bg-white/70 backdrop-blur-xl p-8 ring-1 ring-border/20 shadow-sm text-center">
          <h2 className="font-heading text-lg font-bold text-foreground mb-5">Síguenos en redes</h2>
          <div className="flex justify-center gap-6">
            <a
              href="https://instagram.com/panitas.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 rounded-xl border border-border/30 bg-background/70 backdrop-blur-xl px-6 py-4 text-sm text-foreground/70 hover:border-primary/40 hover:text-foreground hover:bg-primary/10 transition-all group"
            >
              <Camera className="size-6 text-primary group-hover:scale-110 transition-transform" />
              <span className="font-medium">@panitas.app</span>
              <span className="text-xs text-muted-foreground">Instagram</span>
            </a>
            <a
              href="https://tiktok.com/@panitas.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 rounded-xl border border-border/30 bg-background/70 backdrop-blur-xl px-6 py-4 text-sm text-foreground/70 hover:border-primary/40 hover:text-foreground hover:bg-primary/10 transition-all group"
            >
              <Music2 className="size-6 text-primary group-hover:scale-110 transition-transform" />
              <span className="font-medium">@panitas.app</span>
              <span className="text-xs text-muted-foreground">TikTok</span>
            </a>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white/70 backdrop-blur-xl p-6 ring-1 ring-border/20 shadow-sm text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Antes de escribirnos, revisa nuestras{" "}
            <Link href="/faq" className="text-primary hover:text-primary/80 underline">
              Preguntas Frecuentes
            </Link>
            . Es probable que encuentres una respuesta inmediata.
          </p>
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
