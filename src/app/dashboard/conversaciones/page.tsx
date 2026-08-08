import { getCurrentStore } from "@/lib/permissions"
import { redirect } from "next/navigation"
import { MessageCircle } from "lucide-react"

import { FeatureLockScreen } from "@/components/ui/feature-lock-screen"
import { InboxClient } from "@/components/inbox/inbox-client"
import { MetaChannelPanel } from "@/components/inbox/meta-channel-panel"
import { WhatsAppChannelPanel } from "@/components/inbox/whatsapp-channel-panel"
import { hasFeature } from "@/lib/features"

export const metadata = {
  title: "Conversaciones — Panitas",
}

export default async function ConversacionesPage() {
  const current = await getCurrentStore()
  if (!current) redirect("/choose-plan")

  const planRef = { plan: current.store.plan, planType: current.store.planType }
  const canUseChat = hasFeature(planRef, "unified_chat")
  const canUseWhatsApp = hasFeature(planRef, "whatsapp_inbox")
  const canUseInstagram = hasFeature(planRef, "instagram_inbox")
  const canUseMessenger = hasFeature(planRef, "facebook_inbox")

  if (!canUseChat) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-bold text-foreground">Conversaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Centraliza el chat con tus clientes desde un solo lugar.
          </p>
        </div>
        <FeatureLockScreen feature="unified_chat" />
      </div>
    )
  }

  return (
    <div className="h-full min-h-[calc(100vh-9rem)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-foreground">
            <MessageCircle className="size-6 text-primary" />
            Conversaciones
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bandeja unificada de clientes. Panitas sugiere respuestas, nunca las envía por ti.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canUseWhatsApp ? <WhatsAppChannelPanel /> : null}
          {canUseInstagram ? <MetaChannelPanel channel="instagram" /> : null}
          {canUseMessenger ? <MetaChannelPanel channel="messenger" /> : null}
        </div>
      </div>
      <InboxClient />
    </div>
  )
}
