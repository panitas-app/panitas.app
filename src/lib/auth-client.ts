import { signIn as naSignIn, signOut as naSignOut } from "next-auth/react"

export const signInWithCredentials = async (email: string, password: string) => {
  return naSignIn("credentials", { email, password, redirect: false })
}

export const signOut = async (options?: { redirectTo?: string }) => {
  const callbackUrl = options?.redirectTo || "/login"
  return naSignOut({ callbackUrl })
}


