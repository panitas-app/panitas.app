"use server"

import { signIn } from "@/lib/auth"

export async function loginWithGoogle(redirectTo: string = "/dashboard") {
  await signIn("google", { redirectTo })
}
