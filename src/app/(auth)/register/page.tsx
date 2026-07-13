import { auth } from "@/lib/auth"
import RegisterContent from "@/components/auth/register-content"

export default async function RegisterPage(props: { searchParams: Promise<{ plan?: string }> }) {
  const searchParams = await props.searchParams
  const session = await auth()
  return <RegisterContent session={session} plan={searchParams.plan} />
}
