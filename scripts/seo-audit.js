#!/usr/bin/env node
/**
 * Panitas SEO Audit Script
 * Ejecutar: node scripts/seo-audit.js [baseURL]
 * Default: http://localhost:3000
 */

const BASE = process.argv[2] || "http://localhost:3000"
const OK = "\x1b[32m✓\x1b[0m"
const FAIL = "\x1b[31m✗\x1b[0m"
const WARN = "\x1b[33m⚠\x1b[0m"
const INFO = "\x1b[36m→\x1b[0m"

let totalPass = 0
let totalFail = 0
let totalWarn = 0

function pass(msg) { totalPass++; console.log(`  ${OK} ${msg}`) }
function fail(msg) { totalFail++; console.log(`  ${FAIL} ${msg}`) }
function warn(msg) { totalWarn++; console.log(`  ${WARN} ${msg}`) }
function info(msg) { console.log(`  ${INFO} ${msg}`) }
function section(title) { console.log(`\n━━━ ${title} ━━━`) }

async function fetchText(path) {
  try {
    const res = await fetch(`${BASE}${path}`, { redirect: "follow" })
    if (!res.ok) return { status: res.status, text: null, headers: Object.fromEntries(res.headers) }
    const text = await res.text()
    return { status: res.status, text, headers: Object.fromEntries(res.headers) }
  } catch (e) {
    return { status: 0, text: null, error: e.message, headers: {} }
  }
}

async function auditRobotsTxt() {
  section("1. robots.txt")
  const { status, text } = await fetchText("/robots.txt")
  if (status !== 200) { fail(`robots.txt no accesible (HTTP ${status})`); return }
  if (!text) { fail("robots.txt vacío"); return }
  pass("robots.txt accesible")

  if (text.includes("User-agent: *") && text.includes("Allow: /")) pass("Permite rastreo general")
  else fail("No permite rastreo general")

  if (text.includes("Sitemap:")) pass("Sitemap declarado")
  else fail("Sin Sitemap declarado")

  const blockedBots = ["GPTBot", "ClaudeBot", "Bingbot", "Googlebot", "PerplexityBot", "Applebot", "DuckDuckBot", "CCBot", "ChatGPT-User", "OAI-SearchBot"]
  for (const bot of blockedBots) {
    const botSection = text.split(new RegExp(`User-agent:\\s*${bot}`, "i"))[1]
    if (botSection && botSection.split("User-agent:")[0].includes("Disallow: /")) {
      fail(`${bot} bloqueado`)
    } else {
      pass(`${bot} permitido`)
    }
  }

  if (text.includes("Disallow: /assets/")) warn("/assets/ bloqueado (puede afectar renderizado CSS/JS)")
  if (text.includes("Disallow: /_next/")) pass("/_next/ bloqueado (correcto)")
}

async function auditSitemap() {
  section("2. sitemap.xml")
  const { status, text } = await fetchText("/sitemap.xml")
  if (status !== 200) { fail(`sitemap.xml no accesible (HTTP ${status})`); return }
  if (!text) { fail("sitemap.xml vacío"); return }
  pass("sitemap.xml accesible y válido (HTTP 200)")

  // Extraer todas las URLs del sitemap
  const urls = [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  pass(`${urls.length} URLs en el sitemap`)

  // Verificar que las URLs requeridas están presentes
  const requiredPages = ["/", "/pricing", "/faq", "/contacto", "/terminos", "/privacidad"]
  for (const page of requiredPages) {
    if (text.includes(`${BASE}${page}`)) pass(`${page} incluido con prioridad correcta`)
    else fail(`${page} NO incluido`)
  }

  // Verificar que NO hay URLs privadas/bloqueadas
  const blockedPatterns = ["/register", "/login", "/choose-plan", "/subscribe", "/join", "/restablecer", "/recuperar", "/perfil/", "/dashboard/", "/admin/", "/onboarding/", "/seller/", "/api/"]
  for (const pattern of blockedPatterns) {
    const found = urls.filter((u) => u.includes(pattern))
    if (found.length > 0) fail(`${found.length} URL(s) bloqueada(s) en sitemap: ${pattern}`)
    else {
      const label = pattern.endsWith("/") ? pattern.slice(0, -1) : pattern
      pass(`${label} excluido del sitemap`)
    }
  }

  // Verificar que no hay IDs internos (como /perfil/clusterid)
  const idPatterns = [/\/perfil\/cm[a-z0-9]{20,}/i]
  for (const regex of idPatterns) {
    const found = urls.filter((u) => regex.test(u))
    if (found.length > 0) fail(`${found.length} URL(s) con IDs internos en sitemap`)
  }

  // Verificar prioridades
  const priorityMatch = text.match(/<priority>([^<]+)<\/priority>/g)
  if (priorityMatch) {
    const priorities = priorityMatch.map((p) => parseFloat(p.replace(/<\/?priority>/g, "")))
    const maxP = Math.max(...priorities)
    const minP = Math.min(...priorities)
    if (maxP <= 1 && minP > 0) pass(`Prioridades válidas (${minP} – ${maxP})`)
    else fail(`Prioridades fuera de rango (${minP} – ${maxP})`)
  }

  // Verificar changefreq válidos
  const validFreqs = ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"]
  const freqMatch = text.match(/<changefreq>([^<]+)<\/changefreq>/g)
  if (freqMatch) {
    const freqs = freqMatch.map((f) => f.replace(/<\/?changefreq>/g, ""))
    const invalidFreqs = freqs.filter((f) => !validFreqs.includes(f))
    if (invalidFreqs.length === 0) pass(`Todos los changefreq son válidos`)
    else fail(`changefreq inválidos: ${invalidFreqs.join(", ")}`)
  }

  // Verificar formato XML
  if (text.includes("<urlset")) pass("Formato XML válido (urlset)")
  else fail("Formato XML inválido")

  // Verificar que el lastmod existe
  if (text.includes("<lastmod>")) pass("Elementos lastmod presentes")
  else fail("Sin elementos lastmod")
}

async function auditMetadata() {
  section("3. Metadata del Landing")
  const { text } = await fetchText("/")
  if (!text) { fail("No se pudo cargar landing"); return }

  const checks = [
    [/<title>/i, "Title tag"],
    [/meta\s+name="description"/i, "Meta description"],
    [/meta\s+name="robots".*content="index/i, "Meta robots (index)"],
    [/meta\s+name="viewport"/i, "Viewport"],
    [/meta\s+name="theme-color"/i, "Theme color"],
    [/meta\s+property="og:title"/i, "OG Title"],
    [/meta\s+property="og:description"/i, "OG Description"],
    [/meta\s+property="og:image"/i, "OG Image"],
    [/meta\s+property="og:type"/i, "OG Type"],
    [/meta\s+property="og:url"/i, "OG URL"],
    [/meta\s+name="twitter:card"/i, "Twitter Card"],
    [/meta\s+name="twitter:title"/i, "Twitter Title"],
    [/meta\s+name="twitter:image"/i, "Twitter Image"],
    [/rel="canonical"/i, "Canonical link"],
    [/lang="es"/i, "Language attribute"],
    [/meta\s+charset/i, "Charset"],
  ]

  for (const [regex, label] of checks) {
    if (regex.test(text)) pass(label)
    else fail(`Sin ${label}`)
  }

  if (/<h1[\s>]/i.test(text)) {
    const h1Count = (text.match(/<h1[\s>]/gi) || []).length
    if (h1Count === 1) pass("Exactamente 1 H1")
    else warn(`${h1Count} H1 encontrados (debería ser 1)`)
  } else {
    fail("Sin H1")
  }
}

async function auditSchema() {
  section("4. Structured Data")
  const { text } = await fetchText("/")
  if (!text) return

  const schemas = ["Organization", "SoftwareApplication", "WebSite", "FAQPage", "BreadcrumbList"]
  for (const schema of schemas) {
    if (text.includes(`"@type": "${schema}"`) || text.includes(`"@type":"${schema}"`)) pass(`Schema: ${schema}`)
    else warn(`Schema: ${schema} no encontrado en landing`)
  }

  const jsonLdBlocks = text.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi) || []
  pass(`${jsonLdBlocks.length} bloques JSON-LD encontrados`)

  for (const block of jsonLdBlocks) {
    const json = block.replace(/<script type="application\/ld\+json">/i, "").replace(/<\/script>/i, "").trim()
    try {
      JSON.parse(json)
      pass("JSON-LD válido")
    } catch {
      fail("JSON-LD con errores de sintaxis")
    }
  }
}

async function auditAccessibility() {
  section("5. Accesibilidad")
  const { text } = await fetchText("/")
  if (!text) return

  const imgs = text.match(/<img\s[^>]*>/gi) || []
  const imgsWithoutAlt = imgs.filter(i => !i.includes("alt="))
  if (imgsWithoutAlt.length === 0) pass(`Todas las ${imgs.length} imágenes tienen alt`)
  else fail(`${imgsWithoutAlt.length} imágenes sin alt`)

  const semanticTags = ["<header", "<main", "<section", "<footer", "<nav", "<article", "<aside"]
  for (const tag of semanticTags) {
    if (text.includes(tag)) pass(`Etiqueta semántica: ${tag}>`)
  }

  const dialogs = text.match(/<dialog[^>]*>/gi) || []
  const dialogsWithoutLabel = dialogs.filter(d => !d.includes("aria-label"))
  if (dialogsWithoutLabel.length === 0) pass(`Todos los ${dialogs.length} diálogos tienen aria-label`)
  else fail(`${dialogsWithoutLabel.length} diálogos sin aria-label`)

  const inputs = text.match(/<input[^>]*>/gi) || []
  const inputsWithLabel = inputs.filter(i => i.includes("aria-label") || i.includes("id="))
  if (inputsWithLabel.length === inputs.length) pass(`Todos los ${inputs.length} inputs accesibles`)
  else warn(`${inputs.length - inputsWithLabel.length} inputs sin aria-label`)
}

async function auditHeaders() {
  section("6. Headers HTTP")
  const { headers } = await fetchText("/")

  if (headers["content-type"]?.includes("text/html")) pass("Content-Type: text/html")
  else warn(`Content-Type inesperado: ${headers["content-type"]}`)

  if (!headers["x-robots-tag"]) pass("Sin X-Robots-Tag en landing (correcto)")
  else warn(`X-Robots-Tag en landing: ${headers["x-robots-tag"]}`)

  if (headers["strict-transport-security"]) pass("HSTS habilitado")
  else warn("Sin HSTS")

  if (headers["x-frame-options"]) pass("X-Frame-Options presente")
  else warn("Sin X-Frame-Options")

  if (headers["x-content-type-options"]) pass("X-Content-Type-Options presente")
  else warn("Sin X-Content-Type-Options")
}

async function auditPrivateRoutes() {
  section("7. Rutas privadas (noindex)")
  const privateRoutes = ["/login", "/register", "/choose-plan", "/subscribe", "/join", "/restablecer", "/recuperar"]
  for (const route of privateRoutes) {
    const { headers } = await fetchText(route)
    if (headers["x-robots-tag"]?.includes("noindex")) pass(`${route} → noindex`)
    else warn(`${route} → sin X-Robots-Tag noindex`)
  }
}

async function auditRendering() {
  section("8. Renderizado")
  const { text } = await fetchText("/")
  if (!text) return

  const hasContent = text.includes("Controla tu inventario") || text.includes("Panitas")
  if (hasContent) pass("Contenido visible en HTML (sin JS)")
  else fail("Contenido NO visible en HTML")

  const hasSSRContent = text.includes("<h1") && text.includes("<section")
  if (hasSSRContent) pass("HTML semántico presente en respuesta")
  else fail("HTML semántico ausente")
}

async function auditLlmsTxt() {
  section("9. llms.txt (AI Crawlers)")
  for (const file of ["/llms.txt", "/llms-full.txt"]) {
    const { status, text } = await fetchText(file)
    if (status === 200 && text) pass(`${file} accesible (${text.length} chars)`)
    else fail(`${file} no accesible (HTTP ${status})`)
  }
}

async function auditSeoPages() {
  section("10. SEO Landing Pages")
  const pages = [
    "/software-administrativo", "/software-inventario", "/software-pos",
    "/agenda-online", "/agenda-de-citas", "/agenda-para-profesionales",
    "/tienda-online", "/software-para-negocios",
    "/software-para-barberias", "/software-para-restaurantes",
    "/software-para-ferreterias", "/software-para-tiendas",
    "/software-para-minimarket", "/software-para-salones-de-belleza",
    "/software-para-peluquerias", "/software-para-clinicas",
    "/software-para-medicos", "/software-para-odontologos",
    "/software-para-psicologos", "/software-para-esteticas",
    "/software-para-spa", "/blog"
  ]
  for (const page of pages) {
    const { status, text, headers } = await fetchText(page)
    if (status === 200 && text) {
      pass(`${page} → HTTP 200 (${text.length} chars)`)
      if (text.includes("<h1")) pass(`${page} → H1 presente`)
      else warn(`${page} → Sin H1`)
      if (text.includes('rel="canonical"')) pass(`${page} → canonical presente`)
      else warn(`${page} → Sin canonical`)
      if (text.includes("Panitas |")) pass(`${page} → Title brand-first`)
      else warn(`${page} → Title no comienza con Panitas`)
    } else {
      fail(`${page} → HTTP ${status}`)
    }
  }
}

async function auditSitemapUrls() {
  section("11. Sitemap URLs")
  const { text } = await fetchText("/sitemap.xml")
  if (!text) return
  const urls = [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  
  const expectedPages = [
    "/", "/pricing", "/contacto", "/faq", "/terminos", "/privacidad",
    "/software-administrativo", "/software-inventario", "/software-pos",
    "/agenda-online", "/tienda-online", "/software-para-barberias",
    "/software-para-restaurantes", "/software-para-ferreterias",
    "/blog"
  ]
  for (const page of expectedPages) {
    const found = urls.some(u => u.includes(page === "/" ? "panitas.app</loc>" : `${page}</loc>`))
    if (found) pass(`Sitemap incluye ${page}`)
    else fail(`Sitemap NO incluye ${page}`)
  }
}

async function main() {
  console.log(`\n🔍 Panitas SEO Audit — ${BASE}\n`)

  await auditRobotsTxt()
  await auditSitemap()
  await auditMetadata()
  await auditSchema()
  await auditAccessibility()
  await auditHeaders()
  await auditPrivateRoutes()
  await auditRendering()
  await auditLlmsTxt()
  await auditSeoPages()
  await auditSitemapUrls()

  console.log(`\n━━━ RESUMEN ━━━`)
  console.log(`  ${OK} Pass: ${totalPass}`)
  console.log(`  ${FAIL} Fail: ${totalFail}`)
  console.log(`  ${WARN} Warn: ${totalWarn}`)
  console.log(`  Total: ${totalPass + totalFail + totalWarn}`)
  console.log()

  if (totalFail > 0) {
    console.log(`\x1b[31m❌ ${totalFail} problemas encontrados. Revisar arriba.\x1b[0m`)
    process.exit(1)
  } else if (totalWarn > 0) {
    console.log(`\x1b[33m⚠️  ${totalWarn} advertencias. ${totalPass} checks pasados.\x1b[0m`)
  } else {
    console.log(`\x1b[32m✅ Todos los checks pasados (${totalPass})\x1b[0m`)
  }
}

main().catch(e => { console.error("Audit error:", e); process.exit(1) })
