import { auth } from "@/lib/auth"
import RegisterContent from "@/components/auth/register-content"

export default async function RegisterPage() {
  const session = await auth()
  return <RegisterContent session={session} />
}
