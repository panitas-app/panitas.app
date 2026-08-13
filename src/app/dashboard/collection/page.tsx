"use client"

import { useState } from "react"
import Link from "next/link"
import { Megaphone, MessageCircleQuestion } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { SendAssistant } from "@/components/dashboard/collection/send-assistant"
import { TemplateEditor } from "@/components/dashboard/collection/template-editor"
import { PaymentMethodsManager } from "@/components/dashboard/collection/payment-methods-manager"

export default function CollectionPage() {
  const [tab, setTab] = useState("asistente")

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-xl font-black flex items-center gap-2">
            <Megaphone className="size-6 text-violet-500" /> Cobranza
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Prepara recordatorios con plantillas inteligentes, revisa cada mensaje y registra tus contactos.
            Panitas nunca envía mensajes automáticamente.
          </p>
        </div>
        <Link href={`/dashboard/assistant?q=${encodeURIComponent("¿A quién debo contactar hoy y qué les digo?")}`}>
          <Button variant="outline" className="gap-1.5">
            <MessageCircleQuestion className="size-4" /> Preguntar a Panitas
          </Button>
        </Link>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start flex-nowrap overflow-x-auto scrollbar-none -mx-3 px-3">
          <TabsTrigger value="asistente" className="shrink-0">Asistente de envío</TabsTrigger>
          <TabsTrigger value="plantillas" className="shrink-0">Plantillas</TabsTrigger>
          <TabsTrigger value="metodos" className="shrink-0">Métodos de pago</TabsTrigger>
        </TabsList>

        <TabsContent value="asistente" className="mt-5">
          <SendAssistant />
        </TabsContent>

        <TabsContent value="plantillas" className="mt-5">
          <TemplateEditor />
        </TabsContent>

        <TabsContent value="metodos" className="mt-5">
          <PaymentMethodsManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}
