#!/usr/bin/env node
/**
 * Riempie le traduzioni mancanti in src/locales/copy.json.
 *
 * Uso:   npm run i18n:translate            (traduce ciò che manca)
 *        npm run i18n:translate -- --dry   (mostra soltanto cosa manca)
 *
 * Vincoli: passo di BUILD/DEV, non runtime. Non usa DB né storage: legge e
 * riscrive solo il JSON versionato nel repo (poi commit + deploy).
 *
 * Motore di traduzione — GRATUITO e pluggable:
 *   • default: MyMemory (https://api.mymemory.translated.net) — free, senza chiave.
 *   • override: LibreTranslate via env LIBRETRANSLATE_URL (es. self-hosted).
 * Se il servizio non risponde, la chiave resta da compilare a mano nel clone.
 *
 * Glossario: i termini in GLOSSARY non vengono tradotti (protetti con placeholder
 * e ripristinati dopo).
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const COPY_PATH = join(__dirname, '..', 'src', 'locales', 'copy.json')

const SOURCE_LANG = 'it'
const TARGET_LANGS = ['en', 'de', 'fr', 'es']
const DRY = process.argv.includes('--dry')
const LIBRE_URL = process.env.LIBRETRANSLATE_URL || ''

// Termini da NON tradurre (nomi prodotto/brand).
const GLOSSARY = ['Sibylla', 'Agorà', 'Agora', 'Tableau', 'Match Zone', 'Live Display']

// ─── Protezione glossario ────────────────────────────────────────────────────
function protect(text) {
  const tokens = []
  let out = text
  GLOSSARY.forEach((term, i) => {
    const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    out = out.replace(re, () => {
      const ph = `⁣${i}⁣` // invisible separator come placeholder
      tokens.push({ ph, term })
      return ph
    })
  })
  return { out, tokens }
}
function restore(text, tokens) {
  let out = text
  for (const { ph, term } of tokens) out = out.split(ph).join(term)
  return out
}

// ─── Provider di traduzione ──────────────────────────────────────────────────
async function translateLibre(text, from, to) {
  const res = await fetch(LIBRE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: from, target: to, format: 'text' }),
  })
  if (!res.ok) throw new Error(`LibreTranslate ${res.status}`)
  const data = await res.json()
  return data.translatedText
}
async function translateMyMemory(text, from, to) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`MyMemory ${res.status}`)
  const data = await res.json()
  const t = data?.responseData?.translatedText
  if (!t || /MYMEMORY WARNING|INVALID/i.test(t)) throw new Error('MyMemory: risposta non valida (rate limit?)')
  return t
}
async function translate(text, from, to) {
  const { out, tokens } = protect(text)
  const raw = LIBRE_URL ? await translateLibre(out, from, to) : await translateMyMemory(out, from, to)
  return restore(raw, tokens)
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const copy = JSON.parse(await readFile(COPY_PATH, 'utf8'))
  let missing = 0
  let filled = 0
  let failed = 0

  for (const clientKey of Object.keys(copy)) {
    const client = copy[clientKey]
    const source = client[SOURCE_LANG] || {}
    for (const key of Object.keys(source)) {
      const srcText = source[key]
      for (const lang of TARGET_LANGS) {
        client[lang] = client[lang] || {}
        if (client[lang][key] !== undefined) continue // già presente
        missing++
        if (DRY) {
          console.log(`  manca  [${clientKey}] ${lang}  ${key}`)
          continue
        }
        try {
          client[lang][key] = await translate(srcText, SOURCE_LANG, lang)
          filled++
          console.log(`  ✓ [${clientKey}] ${lang}  ${key}`)
        } catch (err) {
          failed++
          console.warn(`  ✗ [${clientKey}] ${lang}  ${key} — ${err.message}`)
        }
      }
    }
  }

  if (DRY) {
    console.log(`\n${missing} traduzioni mancanti (dry-run, nessuna scrittura).`)
    return
  }

  if (filled > 0) {
    await writeFile(COPY_PATH, JSON.stringify(copy, null, 2) + '\n', 'utf8')
  }
  console.log(`\nFatte ${filled} traduzioni, ${failed} fallite su ${missing} mancanti.`)
  if (filled > 0) console.log('→ Rivedi copy.json, poi commit + deploy per pubblicare.')
  if (failed > 0) console.log('→ Le fallite restano compilabili a mano nel clone (editor testi).')
}

main().catch((e) => { console.error(e); process.exit(1) })
