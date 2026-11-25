// ─── Decision tree · interprete AI (funzione serverless Vercel) ──────────────
//  POST /api/decision-tree  { domanda, strutture }  →  { piano }
//
//  Claude (Haiku 5.5) traduce la domanda in un PIANO di analisi: metrica,
//  livelli dell'albero, filtri, anno, confronto. Non risponde alla domanda e
//  non vede numeri: la BI la calcola la pagina dai dati di Sibylla. Ad
//  Anthropic arrivano solo la domanda e i nomi di strutture, camere e segmenti.
//
//  La chiave sta SOLO qui, nella variabile d'ambiente ANTHROPIC_API_KEY del
//  progetto Vercel (mai REACT_APP_*, finirebbe nel bundle del browser). Senza
//  chiave risponde 503 e la pagina usa l'interprete locale.
//  Test del 25/11/2026 su 20 domande: ~0,00024 $ a domanda, ~1,4 s; gli errori
//  meccanici residui di Haiku li corregge `sanifica` in dtMotore.ts.

import Anthropic from '@anthropic-ai/sdk'

const MODELLO = 'claude-haiku-5-5'

// Catalogo fisso (stesso di src/modules/finance/MarginWaterfall/mwfData.ts)
const CAMERE = { sgl: 'Singola', dbl: 'Doppia', dsup: 'Doppia superior', fam: 'Family', jsu: 'Junior suite', su: 'Suite' }
const SEGMENTI = {
  b2b: 'B2B (tour operator, agenzie)',
  b2c: 'B2C (OTA, online, Booking)',
  dir: 'Dirette (sito, telefono, walk-in)',
  grp: 'Gruppi',
  corp: 'Corporate (aziende)',
}

const prompt = (strutture) => `Sei l'interprete delle domande della pagina Decision tree di Sibylla, gestionale alberghiero.
Traduci la domanda dell'utente in un piano di analisi. NON rispondi alla domanda e NON inventi numeri: i dati li calcola Sibylla dal piano.

Dati disponibili (solo questi, su base annua, per gli anni 2024-2026):
- metriche: ricavi (vendite, fatturato, incassi), margine (margine di contribuzione), utile, notti (pernottamenti venduti), adr (prezzo medio per notte), costi (costi variabili + fissi)
- dimensioni: struttura, camera (tipologia), segmento (canale di vendita)
- strutture: ${strutture.join(', ')}
- tipologie di camera (id: nome): ${Object.entries(CAMERE).map(([k, v]) => `${k}: ${v}`).join('; ')}
- segmenti (id: nome): ${Object.entries(SEGMENTI).map(([k, v]) => `${k}: ${v}`).join('; ')}

Regole:
- dimensioni: i livelli dell'albero, dal più generale al più specifico (massimo 2). Metti per ultima la dimensione su cui verte la domanda ("quale camera" → camera). Non usare come livello una dimensione già fissata da un solo filtro.
- filtri (strutture, camere, segmenti): solo i valori nominati nella domanda; vuoti = tutti. Abbina i nomi anche se scritti parzialmente ("il Siracusa" → Hotel Siracusa, "tour operator" → b2b).
- ordine: "asc" se la domanda cerca il peggiore/meno, altrimenti "desc".
- confronto: true se chiede andamento ("come sta andando"), crescita, miglioramento o un confronto con un altro anno.
- anno: l'anno da analizzare se la domanda lo cita come periodo dell'analisi; un anno citato solo come termine di paragone ("rispetto al 2025") NON è l'anno da analizzare: in quel caso anno = 0 e confronto = true. Senza anno: 0.
- comprensibile: false se la domanda chiede dati non disponibili (mesi o giorni, personale, acquisti, fornitori, meteo, altro) o non è una domanda sui dati; in quel caso spiega in nota, in italiano e in una frase, cosa non è disponibile.
- nota: altrimenti una frase breve in italiano che dice come hai interpretato la domanda.`

const schema = (strutture) => ({
  type: 'object',
  additionalProperties: false,
  required: ['comprensibile', 'metrica', 'ordine', 'dimensioni', 'strutture', 'camere', 'segmenti', 'anno', 'confronto', 'nota'],
  properties: {
    comprensibile: { type: 'boolean' },
    metrica: { type: 'string', enum: ['ricavi', 'margine', 'utile', 'notti', 'adr', 'costi'] },
    ordine: { type: 'string', enum: ['desc', 'asc'] },
    dimensioni: { type: 'array', items: { type: 'string', enum: ['struttura', 'camera', 'segmento'] } },
    strutture: { type: 'array', items: { type: 'string', enum: strutture } },
    camere: { type: 'array', items: { type: 'string', enum: Object.keys(CAMERE) } },
    segmenti: { type: 'array', items: { type: 'string', enum: Object.keys(SEGMENTI) } },
    anno: { type: 'integer' },
    confronto: { type: 'boolean' },
    nota: { type: 'string' },
  },
})

// Freno contro l'abuso della demo pubblica (per istanza; il tetto vero è il
// limite di spesa del workspace Anthropic della chiave).
const LIMITE_MINUTO = 20
const richieste = new Map()
function troppe(ip) {
  const ora = Date.now()
  const recenti = (richieste.get(ip) ?? []).filter(t => ora - t < 60_000)
  recenti.push(ora)
  richieste.set(ip, recenti)
  if (richieste.size > 5000) richieste.clear()
  return recenti.length > LIMITE_MINUTO
}

const testoValido = (s, max) => typeof s === 'string' && s.trim().length > 0 && s.length <= max

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ errore: 'Solo POST.' })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ errore: 'Interprete AI non configurato.' })
  }
  const ip = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || 'sconosciuto'
  if (troppe(ip)) return res.status(429).json({ errore: 'Troppe domande in poco tempo: riprova fra un minuto.' })

  const { domanda, strutture } = req.body ?? {}
  if (!testoValido(domanda, 300)) return res.status(400).json({ errore: 'Domanda mancante o troppo lunga.' })
  const elenco = Array.isArray(strutture)
    ? [...new Set(strutture.filter(s => testoValido(s, 80)).map(s => s.trim()))].slice(0, 30)
    : []
  if (!elenco.length) return res.status(400).json({ errore: 'Elenco strutture mancante.' })

  const client = new Anthropic({ timeout: 20_000, maxRetries: 1 })
  try {
    const r = await client.messages.create({
      model: MODELLO,
      max_tokens: 2000,
      system: prompt(elenco),
      output_config: { effort: 'low', format: { type: 'json_schema', schema: schema(elenco) } },
      messages: [{ role: 'user', content: domanda.trim() }],
    })
    if (r.stop_reason !== 'end_turn') {
      return res.status(422).json({ errore: `Interpretazione non completata (${r.stop_reason}).` })
    }
    const testo = r.content.filter(b => b.type === 'text').map(b => b.text).join('')
    return res.status(200).json({ piano: JSON.parse(testo), modello: MODELLO })
  } catch (e) {
    if (e instanceof SyntaxError) return res.status(502).json({ errore: 'Risposta AI non leggibile.' })
    if (e instanceof Anthropic.AuthenticationError) return res.status(503).json({ errore: 'Chiave AI non valida.' })
    if (e instanceof Anthropic.RateLimitError) return res.status(429).json({ errore: 'Servizio AI occupato: riprova fra poco.' })
    if (e instanceof Anthropic.APIError) return res.status(502).json({ errore: `Servizio AI non disponibile (${e.status ?? 'rete'}).` })
    return res.status(500).json({ errore: 'Errore inatteso dell\'interprete.' })
  }
}
