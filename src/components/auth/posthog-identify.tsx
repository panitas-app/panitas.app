"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import posthog from "posthog-js"

export function PostHogIdentify() {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.email) return
    const { email, name, id } = session.user
    posthog.identify(email, { name: name || "", user_id: id || "" })
  }, [status, session])

  return null
}
