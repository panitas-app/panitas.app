export function buildOnboardingPrompt(data: {
  businessName: string
  businessType: string
  storeType: string
  description?: string
  location?: string
}): string {
  return `Eres un experto en crear negocios exitosos en PanitasApp, una plataforma para emprendedores latinoamericanos.

Genera la configuración inicial para el siguiente negocio:

Nombre: ${data.businessName}
Tipo de negocio: ${data.businessType}
Categoría: ${data.storeType}
${data.description ? `Descripción: ${data.description}` : ""}
${data.location ? `Ubicación: ${data.location}` : ""}

Debes generar contenido profesional, atractivo y optimizado para un negocio latinoamericano.
El tono debe ser cercano, profesional y motivador.
Los horarios deben ser realistas para Latinoamérica.
Los colores deben ser apropiados para el tipo de negocio.`
}

export function buildProductPrompt(productName: string, category?: string): string {
  return `Eres un experto en redacción comercial y marketing digital para negocios latinoamericanos.

Completa la información del siguiente producto:

Nombre del producto: "${productName}"
${category ? `Categoría: ${category}` : ""}

Genera contenido profesional, atractivo y persuasivo.
Usa un tono que conecte con el público latinoamericano.
Las palabras clave SEO deben estar en español latinoamericano.`
}

export function buildBusinessImprovementPrompt(businessData: {
  name: string
  description?: string
  slogan?: string
  categories?: string[]
  schedule?: string
  colors?: string
}): string {
  return `Eres un asesor de negocios experto en optimización de perfiles comerciales.

Mejora el perfil del siguiente negocio en PanitasApp:

Nombre: ${businessData.name}
${businessData.description ? `Descripción actual: ${businessData.description}` : ""}
${businessData.slogan ? `Slogan actual: ${businessData.slogan}` : ""}
${businessData.categories?.length ? `Categorías actuales: ${businessData.categories.join(", ")}` : ""}
${businessData.schedule ? `Horario actual: ${businessData.schedule}` : ""}
${businessData.colors ? `Colores actuales: ${businessData.colors}` : ""}

Analiza el negocio y sugiere mejoras significativas.
Las recomendaciones deben ser prácticas y aplicables.
Enfócate en el mercado latinoamericano.`
}

export function buildSocialPrompt(data: {
  businessName: string
  platform: "instagram" | "facebook" | "whatsapp" | "tiktok"
  contentType: "promocion" | "nuevo_producto" | "oferta" | "evento" | "temporada"
  productName?: string
  description?: string
}): string {
  return `Eres un community manager experto en marketing para redes sociales en Latinoamérica.

Crea una publicación para ${data.platform === "whatsapp" ? "WhatsApp (mensaje directo para clientes)" : data.platform === "tiktok" ? "TikTok (video corto)" : data.platform === "instagram" ? "Instagram" : "Facebook"}.

Negocio: ${data.businessName}
Tipo de contenido: ${data.contentType}
${data.productName ? `Producto: ${data.productName}` : ""}
${data.description ? `Descripción adicional: ${data.description}` : ""}

La publicación debe:
- Usar tono adecuado para la plataforma
- Incluir emojis apropiados
- Tener llamado a la acción claro
- Ser persuasiva para el público latinoamericano
- Incluir hashtags relevantes en español`
}

export function buildAnalyticsPrompt(data: {
  businessName: string
  period: string
  totalSales: number
  totalRevenue: number
  topProducts: { name: string; sold: number }[]
  ordersByDay: Record<string, number>
  orderStatusBreakdown: Record<string, number>
  previousPeriodRevenue: number
  previousPeriodSales: number
  averageOrderValue: number
}): string {
  return `Eres un analista de negocios experto en convertir datos en recomendaciones accionables para emprendedores latinoamericanos.

Analiza los siguientes datos del negocio "${data.businessName}" para el período ${data.period}:

Ventas totales: ${data.totalSales}
Ingresos totales: $${data.totalRevenue}
Periodo anterior ingresos: $${data.previousPeriodRevenue}
Periodo anterior ventas: ${data.previousPeriodSales}
Ticket promedio: $${data.averageOrderValue}

Productos más vendidos:
${data.topProducts.map((p, i) => `${i + 1}. ${p.name} (${p.sold} vendidos)`).join("\n")}

Ventas por día:
${Object.entries(data.ordersByDay).map(([d, c]) => `- ${d}: ${c} ventas`).join("\n")}

Estado de pedidos:
${Object.entries(data.orderStatusBreakdown).map(([s, c]) => `- ${s}: ${c}`).join("\n")}

Genera insights profundos y recomendaciones específicas y accionables.
No te limites a repetir los números. Encuentra patrones, oportunidades y riesgos.`
}

export function buildChatPrompt(data: {
  businessName: string
  storeType: string
  message: string
  context?: {
    totalProducts?: number
    totalOrders?: number
    totalRevenue?: number
    recentActivity?: string
  }
}): string {
  let contextBlock = ""
  if (data.context) {
    contextBlock = `\n\nContexto actual del negocio:\n- Productos: ${data.context.totalProducts ?? "N/A"}\n- Pedidos: ${data.context.totalOrders ?? "N/A"}\n- Ingresos totales: $${data.context.totalRevenue ?? "N/A"}\n${data.context.recentActivity ? `- Actividad reciente: ${data.context.recentActivity}` : ""}`
  }

  return `Eres Pana IA, el asistente inteligente de PanitasApp, una plataforma para emprendedores latinoamericanos.

Eres amigable, cercano y usas un tono cálido (como un "pana" venezolano).
Tu objetivo es ayudar al emprendedor a hacer crecer su negocio.
Siempre respondes en español.

Negocio: ${data.businessName}
Tipo: ${data.storeType}
${contextBlock}

Mensaje del usuario: "${data.message}"

Responde de manera útil, específica y accionable.`
}

export function buildSeoPrompt(data: {
  businessName: string
  description: string
  categories: string[]
  location?: string
}): string {
  return `Eres un especialista en SEO para negocios latinoamericanos.

Optimiza el SEO del siguiente negocio en PanitasApp:

Nombre: ${data.businessName}
Descripción: ${data.description}
Categorías: ${data.categories.join(", ")}
${data.location ? `Ubicación: ${data.location}` : ""}

Genera meta tags optimizados para buscadores en español latinoamericano.`
}

export function buildMarketingPrompt(data: {
  businessName: string
  goal: "campana" | "descuento" | "promocion" | "ideas" | "copys" | "recuperacion" | "reinactivacion"
  description: string
  productName?: string
}): string {
  return `Eres un experto en marketing digital para pequeños negocios latinoamericanos.

Crea una estrategia de marketing para "${data.businessName}".

Objetivo: ${data.goal}
${data.productName ? `Producto: ${data.productName}` : ""}
Descripción: ${data.description}

Las estrategias deben ser de bajo costo, fáciles de implementar y efectivas para el mercado latinoamericano.`
}
