"use server"

import { signIn } from "@/lib/auth"

export async function loginWithGoogle(redirectTo: string = "/choose-plan") {
  await signIn("google", { redirectTo })
}
