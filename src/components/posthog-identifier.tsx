"use client"

import { useSession } from "next-auth/react"
import { useEffect } from "react"
import posthog from "posthog-js"

export function PostHogIdentifier() {
  const { data: session } = useSession()

  useEffect(() => {
    if (session?.user?.id) {
      posthog.identify(session.user.id, {
        name: session.user.name ?? undefined,
      })
    }
  }, [session?.user?.id])

  return null
}
