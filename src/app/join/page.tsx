import { auth } from "@/lib/auth"
import { JoinContent } from "./join-content"

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const session = await auth()
  const { token } = await searchParams

  return <JoinContent token={token || ""} isLoggedIn={!!session?.user?.id} />
}
