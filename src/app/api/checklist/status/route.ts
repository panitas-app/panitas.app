import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const DEFAULT_ITEMS = [
  { id: "profile", label: "Completa tu perfil de tienda" },
  { id: "product", label: "Agrega tu primer producto" },
  { id: "share", label: "Comparte tu enlace público" },
  { id: "order", label: "Recibe tu primera orden" },
]

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ items: DEFAULT_ITEMS.map((i) => ({ ...i, completed: false })) })

  const store = await prisma.store.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      whatsapp: true,
      address: true,
      description: true,
      logo: true,
      _count: { select: { products: true, orders: true } },
    },
  })

  if (!store) return NextResponse.json({ items: DEFAULT_ITEMS.map((i) => ({ ...i, completed: false })) })

  const hasProfile = !!(store.name && (store.whatsapp || store.address || store.description || store.logo))
  const hasProduct = store._count.products > 0
  const hasOrder = store._count.orders > 0

  // "share" is considered complete once they have at least a product and the store is active
  const hasShared = hasProduct

  const items = [
    { id: "profile", label: "Completa tu perfil de tienda", completed: hasProfile },
    { id: "product", label: "Agrega tu primer producto", completed: hasProduct },
    { id: "share", label: "Comparte tu enlace público", completed: hasShared },
    { id: "order", label: "Recibe tu primera orden", completed: hasOrder },
  ]

  return NextResponse.json({ items })
}
