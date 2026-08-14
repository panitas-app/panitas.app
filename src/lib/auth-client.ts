import { signIn as naSignIn, signOut as naSignOut } from "next-auth/react"

export const signInWithCredentials = async (email: string, password: string) => {
  return naSignIn("credentials", { email, password, redirect: false })
}

export const signOut = async (options?: { redirectTo?: string }) => {
  if (typeof window !== "undefined") {
    const { default: posthog } = await import("posthog-js")
    posthog.reset()
  }
  const callbackUrl = options?.redirectTo || "/"
  return naSignOut({ callbackUrl })
}


