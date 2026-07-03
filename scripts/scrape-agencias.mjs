import { chromium } from "playwright"
import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, "..", "data")

const ESTADOS_NORM = [
  "Amazonas", "Anzoátegui", "Apure", "Aragua", "Barinas", "Bolívar", "Carabobo", "Cojedes",
  "Delta Amacuro", "Distrito Capital", "Falcón", "Guárico", "Lara", "Mérida", "Miranda",
  "Monagas", "Nueva Esparta", "Portuguesa", "Sucre", "Táchira", "Trujillo", "La Guaira (Vargas)",
  "Yaracuy", "Zulia",
]

const MAPA_ESTADOS = {
  "vargas": "La Guaira (Vargas)", "la guaira": "La Guaira (Vargas)", "la guaira (vargas)": "La Guaira (Vargas)",
  "dependencias federales": "Distrito Capital", "districto capital": "Distrito Capital",
  "nva esparta": "Nueva Esparta", "nueva esparta": "Nueva Esparta",
  "d.capital": "Distrito Capital", "d capital": "Distrito Capital",
  "gran caracas": "Distrito Capital", "caracas": "Distrito Capital",
}

function normEst(raw) {
  if (!raw) return ""
  const s = raw.trim()
  const low = s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  if (MAPA_ESTADOS[low]) return MAPA_ESTADOS[low]
  for (const e of ESTADOS_NORM) {
    const el = e.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    if (el === low || el.includes(low) || low.includes(el)) return e
  }
  return s
}

function cleanPhone(raw) {
  if (!raw) return ""
  return raw.replace(/[^\d+\s\-()]/g, "").replace(/\s+/g, " ").trim()
}

function normName(raw) {
  if (!raw) return ""
  return raw.replace(/^Agencia\s+/i, "").replace(/^Sucursal\s+/i, "").trim()
}

function extractPhones(text) {
  if (!text) return ["", ""]
  const nums = text.match(/(?:\+?\d[\d\s\-().]{7,15})/g) || []
  const clean = nums
    .map((n) => cleanPhone(n))
    .filter((n) => n.replace(/\D/g, "").length >= 7 && !/^\d{4}$/.test(n.replace(/\D/g, "")))
  return [clean[0] || "", clean[1] || ""]
}

function extractWA(text) {
  if (!text) return ""
  const m = text.match(/(?:whatsapp|wsp|wa)\s*[:\-]?\s*(\+?\d[\d\s\-().]{7,15})/i)
  return m ? cleanPhone(m[1]) : ""
}

function extractEmail(text) {
  if (!text) return ""
  const m = text.match(/[\w.-]+@[\w.-]+\.\w+/)
  return m ? m[0].toLowerCase() : ""
}

const allAgencies = []
const seenKeys = new Set()

function add(a) {
  const key = `${a.empresa}|${a.agencia}|${a.estado}|${a.direccion}`
  if (seenKeys.has(key)) return false
  seenKeys.add(key)
  a.telefono_1 ||= ""
  a.telefono_2 ||= ""
  a.whatsapp ||= ""
  a.email ||= ""
  a.horario ||= ""
  a.latitud ||= ""
  a.longitud ||= ""
  allAgencies.push(a)
  return true
}

async function savePartial() {
  const p = path.join(DATA_DIR, "agencias_venezuela.json")
  fs.writeFileSync(p, JSON.stringify(allAgencies, null, 2), "utf-8")
  console.log(`  [save] ${allAgencies.length} agencias → ${p}`)
}

async function scrapeAgenciasComVe(browser, empresa) {
  console.log(`\n=== ${empresa.nombre} (agencias.com.ve) ===`)
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  page.setDefaultTimeout(15000)

  try {
    await page.goto(empresa.url, { waitUntil: "domcontentloaded" })
    await page.waitForSelector("a.list-group-item-action", { timeout: 10000 })
    await page.waitForTimeout(1000)
  } catch (e) {
    console.error(`Error inicio ${empresa.nombre}: ${e.message}`)
    await ctx.close()
    return
  }

  const stateLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a.list-group-item-action.text-center"))
      .filter((a) => !a.classList.contains("disabled"))
      .map((a) => ({
        name: a.textContent.trim().replace(/\s*\d+\s*Agencias?\s*Disponibles?\s*/i, "").trim(),
        href: a.getAttribute("href") || "",
      }))
  })

  console.log(`  Estados: ${stateLinks.length}`)

  for (const st of stateLinks) {
    const estado = normEst(st.name)
    if (!estado) { console.log(`  ⏭ "${st.name}"`); continue }

    try {
      await page.goto(new URL(st.href, empresa.url).href, { waitUntil: "domcontentloaded", timeout: 20000 })
      await page.waitForTimeout(1500)
    } catch (e) {
      console.log(`  ⚠ Zulia timeout, continuando...`)
      continue
    }

    const agencies = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("li.agencyItemList.agency-active")).map((li) => {
        const nameEl = li.querySelector("h3 a")
        const addrEl = li.querySelector("p.lead")
        const mapBtn = li.querySelector("button.showInMap")
        const cityEl = li.closest(".agencylist")?.querySelector("h2.cityNameh2 a.citytag")
        return {
          name: nameEl ? nameEl.textContent.trim() : "",
          address: addrEl ? addrEl.textContent.trim() : "",
          lat: mapBtn ? mapBtn.getAttribute("data-latitud") || "" : "",
          lng: mapBtn ? mapBtn.getAttribute("data-longitud") || "" : "",
          city: cityEl ? cityEl.textContent.trim() : "",
        }
      })
    })

    for (const a of agencies) {
      add({
        empresa: empresa.nombre,
        estado,
        ciudad: a.city,
        agencia: normName(a.name),
        direccion: a.address,
        telefono_1: "", telefono_2: "", whatsapp: "", email: "", horario: "",
        latitud: a.lat, longitud: a.lng,
        url_fuente: page.url(),
      })
    }
    console.log(`  ${estado}: ${agencies.length}`)
  }

  await ctx.close()
  await savePartial()
}

async function scrapeTealca(browser) {
  console.log(`\n=== Tealca (REST API) ===`)
  const page = await browser.newPage()

  try {
    const resp = await page.request.get("https://www.tealca.com/wp-json/tealca-oficinas/v1/offices")
    const data = await resp.json()
    if (!data.success || !Array.isArray(data.data)) {
      console.error("  Error API Tealca"); await page.close(); return
    }
    console.log(`  Oficinas: ${data.data.length}`)

    for (const item of data.data) {
      const f = item.fields || {}
      const html = f.acerca_de || ""
      const text = html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
      const [t1, t2] = extractPhones(text)
      const wa = extractWA(text)
      const email = extractEmail(text)
      let lat = "", lng = ""
      if (f.url_google_map) {
        const c = f.url_google_map.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
        if (c) { lat = c[1]; lng = c[2] }
      }
      const ciudad = item.city || ""
      const nombre = item.post?.name || ""
      add({
        empresa: "Tealca",
        estado: normEst(item.state || ""),
        ciudad,
        agencia: ciudad ? `${ciudad} - ${nombre}` : nombre,
        direccion: text,
        telefono_1: t1, telefono_2: t2, whatsapp: wa, email, horario: "",
        latitud: lat, longitud: lng,
        url_fuente: "https://www.tealca.com/wp-json/tealca-oficinas/v1/offices",
      })
    }
  } catch (e) { console.error(`  Error Tealca: ${e.message}`) }

  await page.close()
  await savePartial()
}

async function scrapeLiberty(browser) {
  console.log(`\n=== Liberty Express (SSR) ===`)
  const page = await browser.newPage()
  page.setDefaultTimeout(15000)

  try {
    await page.goto("https://libertyexpress.com/es-ve/sucursales/", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(2000)
  } catch (e) {
    console.error(`Error Liberty: ${e.message}`); await page.close(); return
  }

  const cards = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".kon.sucursal")).map((c) => ({
      state: c.getAttribute("state") || "",
      city: c.querySelector("small")?.textContent?.trim() || "",
      name: c.querySelector("h6")?.textContent?.trim() || "",
      slug: c.getAttribute("for") || "",
    }))
  })

  console.log(`  Sucursales: ${cards.length}`)

  for (const c of cards) {
    const estado = normEst(c.state)
    if (!estado) { console.log(`  ⏭ "${c.state}"`); continue }

    let dir = "", t1 = "", t2 = "", horario = "", email = ""

    if (c.slug) {
      const detail = await page.evaluate((slug) => {
        const panel = document.querySelector(`.kon.view .sucursal#${CSS.escape(slug)}`)
        if (!panel) return null
        const text = panel.textContent?.trim() || ""
        const links = Array.from(panel.querySelectorAll("a")).map((a) => ({
          href: a.getAttribute("href") || "", text: a.textContent?.trim() || "",
        }))
        return { text, links }
      }, c.slug)

      if (detail) {
        dir = detail.text
        const pm = detail.text.match(/[Tt]el[ée]fonos?[:\s]+([\d\s\-().+]{7,30})/i)
        if (pm) {
          const parts = pm[1].split(/[/,]/).map((p) => cleanPhone(p))
          t1 = parts[0] || ""; t2 = parts[1] || ""
        }
        const em = detail.text.match(/[\w.-]+@[\w.-]+\.\w+/)
        if (em) email = em[0].toLowerCase()
        const hm = detail.text.match(/[Hh]orario[:\s]+([^\n]+)/i)
        if (hm) horario = hm[1].trim()
        for (const l of detail.links) {
          if (!email && l.href.startsWith("mailto:")) email = l.href.replace("mailto:", "").toLowerCase()
        }
      }
    }

    add({
      empresa: "Liberty Express",
      estado, ciudad: c.city, agencia: c.name,
      direccion: dir, telefono_1: t1, telefono_2: t2, whatsapp: "", email, horario,
      latitud: "", longitud: "",
      url_fuente: "https://libertyexpress.com/es-ve/sucursales/",
    })
  }

  await page.close()
  await savePartial()
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })

  console.log("=".repeat(60))
  console.log("SCRAPER AGENCIAS VENEZUELA")
  console.log("=".repeat(60))

  try {
    await scrapeTealca(browser)
    await scrapeLiberty(browser)

    for (const emp of [
      { nombre: "MRW", slug: "MRW", url: "https://www.agencias.com.ve/Sucursales/MRW/" },
      { nombre: "Zoom", slug: "ZOOM", url: "https://www.agencias.com.ve/Sucursales/ZOOM/" },
      { nombre: "Domesa", slug: "DOMESA", url: "https://www.agencias.com.ve/Sucursales/DOMESA/" },
    ]) {
      await scrapeAgenciasComVe(browser, emp)
    }
  } catch (e) {
    console.error("Error:", e.message)
  }

  await browser.close()

  // ─── FINAL ───────────────────────
  console.log(`\n${"=".repeat(60)}`)
  console.log(`Total: ${allAgencies.length}`)

  const jsonPath = path.join(DATA_DIR, "agencias_venezuela.json")
  fs.writeFileSync(jsonPath, JSON.stringify(allAgencies, null, 2), "utf-8")

  const heads = ["empresa","estado","ciudad","agencia","direccion","telefono_1","telefono_2","whatsapp","email","horario","latitud","longitud","url_fuente"]
  const esc = (v) => {
    const s = (v||"").replace(/"/g, '""')
    return /[,"\n]/.test(s) ? `"${s}"` : s
  }
  const csvLines = [heads.join(",")]
  for (const a of allAgencies) csvLines.push(heads.map((k) => esc(a[k])).join(","))
  fs.writeFileSync(path.join(DATA_DIR, "agencias_venezuela.csv"), csvLines.join("\n"), "utf-8")

  // Summary
  const byEmp = {}, byEst = {}
  let noTel = 0, noDir = 0
  for (const a of allAgencies) {
    byEmp[a.empresa] = (byEmp[a.empresa]||0) + 1
    byEst[a.estado] = (byEst[a.estado]||0) + 1
    if (!a.telefono_1 && !a.telefono_2) noTel++
    if (!a.direccion) noDir++
  }

  let md = `# Resumen - Agencias de Envío Venezuela\n\n`
  md += `**Fecha:** ${new Date().toISOString().split("T")[0]}\n\n`
  md += `## Total\n- Agencias: **${allAgencies.length}**\n- Sin teléfono: ${noTel}\n- Sin dirección: ${noDir}\n\n`
  md += `## Por empresa\n| Empresa | Agencias |\n|---------|----------|\n`
  for (const [k,v] of Object.entries(byEmp).sort((a,b)=>b[1]-a[1])) md += `| ${k} | ${v} |\n`
  md += `\n## Por estado\n| Estado | Agencias |\n|--------|----------|\n`
  for (const [k,v] of Object.entries(byEst).sort((a,b)=>b[1]-a[1])) md += `| ${k} | ${v} |\n`
  fs.writeFileSync(path.join(DATA_DIR, "resumen.md"), md, "utf-8")

  console.log(`Archivos en: ${DATA_DIR}`)
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1) })
