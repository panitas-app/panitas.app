import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getEffectiveRate } from "@/lib/bcv"

function parseImages(value: string): string[] {
  try { return JSON.parse(value) } catch { return [] }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const store = await prisma.store.findUnique({
    where: { slug, isActive: true },
    include: {
      categories: { orderBy: { order: "asc" } },
      products: {
        where: { isActive: true },
        include: { category: true },
        orderBy: { createdAt: "desc" },
      },
      paymentAccounts: { where: { isActive: true } },
    },
  })
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 })

  const bcvRate = await getEffectiveRate()

  // ─── Whitelist: nunca exponer datos internos (userId, negocioId, posPin,
  //     planStatus, costPrice, digitalProduct, stockMovements, etc.) ───
  const safeStore = {
    id: store.id,
    name: store.name,
    slug: store.slug,
    description: store.description,
    logo: store.logo,
    banner: store.banner,
    primaryColor: store.primaryColor,
    whatsapp: store.whatsapp,
    email: store.email,
    phone: store.phone,
    address: store.address,
    instagram: store.instagram,
    facebook: store.facebook,
    tiktok: store.tiktok,
    twitter: store.twitter,
    youtube: store.youtube,
    linkedin: store.linkedin,
    plan: store.plan,
    planType: store.planType,
    storeHours: store.storeHours,
    template: store.template,
    shippingCost: store.shippingCost,
    freeShippingActive: store.freeShippingActive,
    freeShippingMinAmount: store.freeShippingMinAmount,
    showBolivares: store.showBolivares,
    categories: store.categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      order: c.order,
    })),
    paymentAccounts: store.paymentAccounts,
    products: store.products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      images: parseImages(p.images),
      stock: p.stock,
      productType: p.productType,
      unidadBase: p.unidadBase,
      isWholesale: p.isWholesale,
      wholesalePrice: p.wholesalePrice,
      wholesaleScales: p.wholesaleScales,
      featured: p.featured,
      categoryId: p.categoryId,
      category: p.category ? {
        id: p.category.id,
        name: p.category.name,
        slug: p.category.slug,
      } : null,
    })),
  }

  return NextResponse.json({ ...safeStore, bcvRate })
}
