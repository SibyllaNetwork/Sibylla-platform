// ─── Cashflow · modello dei dati (dimostrativo) ─────────────────────────────
//  La pagina è OPERATIVA e PREDITTIVA:
//    1. liquidità effettiva oggi su tutti i conti bancari collegati
//       (in produzione dai conti di Business Central);
//    2. termometro: quanto il sistema prevedeva di avere oggi vs quanto c'è,
//       con gli scostamenti che spiegano la differenza;
//    3. stima degli incassi dalle abitudini di pagamento di ogni cliente
//       (ricorrenza, puntualità, ritardo medio);
//    4. pianificazione delle uscite dello scadenzario: la data di uscita si
//       sceglie fra oggi e la scadenza.
//  Tutto è generato in modo deterministico per struttura (stesso seme → stessi
//  dati) e relativo a OGGI, così la demo è sempre "viva". Gli importi sono in €.

export const GIORNO = 86_400_000

export const oggi = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
export const iso = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
export const daIso = (s: string) => {
  const [y, m, g] = s.split('-').map(Number)
  return new Date(y, m - 1, g)
}
export const piuGiorni = (d: Date, n: number) => new Date(d.getTime() + n * GIORNO)
export const giorniTra = (a: string, b: string) => Math.round((daIso(b).getTime() - daIso(a).getTime()) / GIORNO)

const hash = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}
const rnd = (seme: number, k: number) => {
  const x = Math.sin(seme * 0.0007 + k * 12.9898) * 43758.5453
  return x - Math.floor(x)
}
const tondo = (v: number, a = 100) => Math.round(v / a) * a

// ── Tipi ─────────────────────────────────────────────────────────────────────
export interface ContoBancario {
  id: string
  banca: string
  sigla: string
  iban: string
  saldo: number
  /** Saldo degli ultimi 30 giorni (l'ultimo è oggi). */
  storico: number[]
}

export type StatoIncasso = 'incassato' | 'atteso' | 'in-ritardo'
export interface Incasso {
  id: string
  cliente: string
  tipo: 'Tour operator' | 'OTA' | 'Agenzia' | 'Corporate'
  descrizione: string
  /** Data in cui il cliente dovrebbe pagare (contratto). */
  scadenza: string
  /** Data stimata dal sistema in base al ritardo medio del cliente. */
  stimata: string
  importo: number
  ricorrenza: 'mensile' | 'quindicinale'
  /** Quota di pagamenti puntuali negli ultimi 12 mesi (0–1). */
  puntualita: number
  ritardoMedio: number
  stato: StatoIncasso
  incassatoIl?: string
}

export type CategoriaUscita = 'Fornitori' | 'Utenze' | 'Manutenzione' | 'Lavori' | 'Personale' | 'Fiscale' | 'Finanziamenti'
export interface Uscita {
  id: string
  fornitore: string
  categoria: CategoriaUscita
  descrizione: string
  fattura: string
  ricevuta: string
  scadenza: string
  importo: number
  /** Stipendi, F24 e rate hanno una data obbligata: non si spostano. */
  spostabile: boolean
}

export type TipoScostamento = 'incasso-mancato' | 'incasso-extra' | 'uscita-imprevista' | 'uscita-anticipata'
export interface Scostamento {
  id: string
  tipo: TipoScostamento
  descrizione: string
  data: string
  /** Effetto sulla cassa rispetto alla stima: negativo = meno liquidità del previsto. */
  effetto: number
}

export interface DatiCassa {
  conti: ContoBancario[]
  liquidita: number
  /** Liquidità che il sistema prevedeva per oggi. */
  attesa: number
  scostamenti: Scostamento[]
  incassi: Incasso[]
  uscite: Uscita[]
  /** Ultimi 30 giorni: liquidità reale e quella che il sistema aveva stimato. */
  storico: { data: string; reale: number; stimata: number }[]
  /** Soglia di liquidità sotto cui scatta l'allarme. */
  soglia: number
}

// ── Generazione ──────────────────────────────────────────────────────────────
const BANCHE = [
  { banca: 'Intesa Sanpaolo', sigla: 'ISP', quota: 0.34 },
  { banca: 'UniCredit', sigla: 'UCG', quota: 0.27 },
  { banca: 'Monte dei Paschi di Siena', sigla: 'MPS', quota: 0.18 },
  { banca: 'Banco BPM', sigla: 'BPM', quota: 0.13 },
  { banca: 'BPER Banca', sigla: 'BPER', quota: 0.08 },
]

const CLIENTI: Omit<Incasso, 'id' | 'scadenza' | 'stimata' | 'stato' | 'incassatoIl' | 'importo' | 'descrizione'>[] & { base: number; giorno: number }[] = [
  { cliente: 'RHI', tipo: 'Tour operator', ricorrenza: 'mensile', puntualita: 0.96, ritardoMedio: 1, base: 100_000, giorno: 1 },
  { cliente: 'Stop in Italy', tipo: 'Tour operator', ricorrenza: 'mensile', puntualita: 0.78, ritardoMedio: 6, base: 62_000, giorno: 10 },
  { cliente: 'Booking.com', tipo: 'OTA', ricorrenza: 'quindicinale', puntualita: 0.99, ritardoMedio: 0, base: 41_000, giorno: 7 },
  { cliente: 'Expedia', tipo: 'OTA', ricorrenza: 'mensile', puntualita: 0.97, ritardoMedio: 1, base: 36_000, giorno: 15 },
  { cliente: 'Hotelbeds', tipo: 'Agenzia', ricorrenza: 'mensile', puntualita: 0.88, ritardoMedio: 4, base: 48_000, giorno: 20 },
  { cliente: 'Etna Meccanica S.p.A.', tipo: 'Corporate', ricorrenza: 'mensile', puntualita: 0.82, ritardoMedio: 5, base: 22_000, giorno: 5 },
  { cliente: 'Viaggi del Sole', tipo: 'Agenzia', ricorrenza: 'mensile', puntualita: 0.9, ritardoMedio: 3, base: 18_000, giorno: 25 },
] as never

const FORNITORI: { fornitore: string; categoria: CategoriaUscita; descrizione: string; base: number; termini: number; ogni: number; spostabile: boolean; giorno?: number }[] = [
  { fornitore: 'Celestino Forniture', categoria: 'Fornitori', descrizione: 'Generi alimentari ristorante', base: 18_500, termini: 30, ogni: 10, spostabile: true },
  { fornitore: 'Lavanderia Etna', categoria: 'Fornitori', descrizione: 'Biancheria e lavaggio', base: 9_200, termini: 30, ogni: 15, spostabile: true },
  { fornitore: 'Enel Energia', categoria: 'Utenze', descrizione: 'Energia elettrica', base: 14_800, termini: 45, ogni: 30, spostabile: true },
  { fornitore: 'Acquedotto comunale', categoria: 'Utenze', descrizione: 'Servizio idrico', base: 3_900, termini: 45, ogni: 30, spostabile: true },
  { fornitore: 'Idraulica Russo', categoria: 'Manutenzione', descrizione: 'Manutenzione impianti', base: 6_400, termini: 60, ogni: 30, spostabile: true },
  { fornitore: 'Edil Sud Costruzioni', categoria: 'Lavori', descrizione: 'Ristrutturazione secondo piano (SAL)', base: 68_000, termini: 60, ogni: 30, spostabile: true },
  { fornitore: 'Cantina Valle dell\'Etna', categoria: 'Fornitori', descrizione: 'Vini e bevande', base: 11_300, termini: 60, ogni: 20, spostabile: true },
  { fornitore: 'Personale', categoria: 'Personale', descrizione: 'Stipendi del mese', base: 185_000, termini: 0, ogni: 30, spostabile: false, giorno: 27 },
  { fornitore: 'Agenzia delle Entrate', categoria: 'Fiscale', descrizione: 'F24: contributi e ritenute', base: 72_000, termini: 0, ogni: 30, spostabile: false, giorno: 16 },
  { fornitore: 'Intesa Sanpaolo', categoria: 'Finanziamenti', descrizione: 'Rata mutuo ristrutturazione', base: 24_500, termini: 0, ogni: 30, spostabile: false, giorno: 30 },
]

const ORIZZONTE = 60

export function generaCassa(struttura: string): DatiCassa {
  const seme = hash(struttura)
  const fattore = 0.65 + (seme % 70) / 100
  const t = oggi()
  let k = 0

  // Incassi: occorrenze da 30 giorni fa a 60 giorni avanti
  const incassi: Incasso[] = []
  CLIENTI.forEach((c: any, ci: number) => {
    const passo = c.ricorrenza === 'quindicinale' ? 15 : 30
    for (let d = -40; d <= ORIZZONTE; d++) {
      const data = piuGiorni(t, d)
      const ok = c.ricorrenza === 'quindicinale' ? data.getDate() === c.giorno || data.getDate() === c.giorno + 15 : data.getDate() === Math.min(c.giorno, 28)
      if (!ok) continue
      const importo = tondo(c.base * fattore * (0.85 + 0.3 * rnd(seme, k++)))
      const stimata = iso(piuGiorni(data, c.ritardoMedio))
      const scad = iso(data)
      let stato: StatoIncasso = 'atteso'
      let incassatoIl: string | undefined
      if (d + c.ritardoMedio < 0) {
        // Passato: pagato, salvo i clienti poco puntuali sulla scadenza più recente
        const recente = d > -passo
        const buca = recente && (c.puntualita < 0.85 || (ci === 1 && d > -12))
        if (buca) stato = 'in-ritardo'
        else { stato = 'incassato'; incassatoIl = stimata }
      }
      incassi.push({
        id: `inc-${ci}-${scad}`, cliente: c.cliente, tipo: c.tipo, ricorrenza: c.ricorrenza,
        descrizione: c.tipo === 'OTA' ? 'Rimessa prenotazioni' : c.tipo === 'Corporate' ? 'Fattura convenzione' : 'Saldo allotment',
        scadenza: scad, stimata, importo, puntualita: c.puntualita, ritardoMedio: c.ritardoMedio, stato, incassatoIl,
      })
    }
    void passo
  })

  // Uscite: fatture già ricevute (scadenze da oggi a 60 giorni) + scadenze fisse
  const uscite: Uscita[] = []
  FORNITORI.forEach((f, fi) => {
    for (let d = -60; d <= ORIZZONTE; d++) {
      const data = piuGiorni(t, d)
      if (f.giorno !== undefined) {
        if (data.getDate() !== Math.min(f.giorno, 28) || d < 0) continue
        uscite.push({
          id: `usc-${fi}-${iso(data)}`, fornitore: f.fornitore, categoria: f.categoria, descrizione: f.descrizione,
          fattura: f.categoria === 'Personale' ? 'Cedolini' : f.categoria === 'Fiscale' ? 'Modello F24' : 'Piano di ammortamento',
          ricevuta: iso(piuGiorni(data, -20)), scadenza: iso(data), importo: tondo(f.base * fattore * (0.95 + 0.1 * rnd(seme, k++))), spostabile: false,
        })
        continue
      }
      // fatture ricevute ogni `ogni` giorni, a partire da un giorno sfasato
      if ((d + fi * 3 + 60) % f.ogni !== 0) continue
      const scadenza = piuGiorni(data, f.termini)
      const ds = Math.round((scadenza.getTime() - t.getTime()) / GIORNO)
      if (d > 0 || ds < 0 || ds > ORIZZONTE) continue
      uscite.push({
        id: `usc-${fi}-${iso(data)}`, fornitore: f.fornitore, categoria: f.categoria, descrizione: f.descrizione,
        fattura: `FT ${String(100 + ((seme + k) % 800)).padStart(3, '0')}/${data.getFullYear()}`,
        ricevuta: iso(data), scadenza: iso(scadenza), importo: tondo(f.base * fattore * (0.8 + 0.4 * rnd(seme, k++))), spostabile: true,
      })
    }
  })
  uscite.sort((a, b) => a.scadenza.localeCompare(b.scadenza))

  // Conti e liquidità di oggi
  const liquidita = tondo(2_200_000 * fattore, 1000)
  const conti: ContoBancario[] = BANCHE.map((b, i) => {
    const saldo = tondo(liquidita * b.quota * (0.9 + 0.2 * rnd(seme, 200 + i)), 100)
    return { id: b.sigla, banca: b.banca, sigla: b.sigla, iban: `IT•• •••• •••• ${String(1000 + ((seme >> i) % 9000))}`, saldo, storico: [] }
  })
  const scarto = liquidita - conti.reduce((a, c) => a + c.saldo, 0)
  conti[0].saldo += scarto

  // Scostamenti fra la stima e la realtà (spiegano il termometro)
  const scostamenti: Scostamento[] = incassi
    .filter(i => i.stato === 'in-ritardo')
    .map(i => ({ id: `s-${i.id}`, tipo: 'incasso-mancato' as const, descrizione: `${i.cliente}: ${i.descrizione.toLowerCase()} non ancora incassato`, data: i.stimata, effetto: -i.importo }))
  scostamenti.push(
    { id: 's-imprevisto', tipo: 'uscita-imprevista', descrizione: 'Riparazione urgente impianto idraulico (non pianificata)', data: iso(piuGiorni(t, -3)), effetto: -tondo(45_000 * fattore) },
    { id: 's-anticipo', tipo: 'uscita-anticipata', descrizione: 'Celestino Forniture pagato prima della scadenza', data: iso(piuGiorni(t, -6)), effetto: -tondo(12_000 * fattore) },
    { id: 's-extra', tipo: 'incasso-extra', descrizione: 'Gruppo walk-in saldato in contanti e POS', data: iso(piuGiorni(t, -9)), effetto: tondo(9_500 * fattore) },
  )
  scostamenti.sort((a, b) => b.data.localeCompare(a.data))
  const attesa = liquidita - scostamenti.reduce((a, s) => a + s.effetto, 0)

  // Storico 30 giorni: la stima si allontana dalla realtà a ogni scostamento
  const storico: DatiCassa['storico'] = []
  let reale = liquidita
  const reali: number[] = []
  for (let d = 0; d < 30; d++) {
    reali.unshift(reale)
    // a ritroso: si tolgono gli incassi e si rimettono le uscite del giorno
    const giorno = iso(piuGiorni(t, -d))
    const inc = incassi.filter(i => i.incassatoIl === giorno).reduce((a, i) => a + i.importo, 0)
    const out = tondo(liquidita * 0.012 * (0.6 + rnd(seme, 300 + d)))
    reale = reale - inc + out
  }
  for (let d = 29; d >= 0; d--) {
    const giorno = iso(piuGiorni(t, -d))
    const r = reali[29 - d]
    const scostCumulato = scostamenti.filter(s => s.data <= giorno).reduce((a, s) => a + s.effetto, 0)
    storico.push({ data: giorno, reale: r, stimata: r - scostCumulato })
  }
  // Storico per conto, proporzionale al saldo di oggi
  conti.forEach(c => { c.storico = storico.map(s => tondo(s.reale * (c.saldo / liquidita), 100)) })

  const soglia = tondo(liquidita * 0.22, 10_000)
  return { conti, liquidita, attesa, scostamenti, incassi, uscite, storico, soglia }
}

// ── Termometro delle aspettative ─────────────────────────────────────────────
export interface Livello { chiave: string; nome: string; icona: string; frase: string }
export function livelloTermometro(reale: number, attesa: number): Livello & { scarto: number } {
  const scarto = attesa ? (reale - attesa) / Math.abs(attesa) : 0
  const p = scarto * 100
  const l: Livello =
    Math.abs(p) <= 2 ? { chiave: 'campione', nome: 'In linea con le stime', icona: 'fa-trophy', frase: 'La cassa è dove il sistema la prevedeva: attendibilità massima.' }
    : p > 2 ? { chiave: 'ottimo', nome: 'Sopra le attese', icona: 'fa-star', frase: 'Stai incassando più del previsto.' }
    : p >= -5 ? { chiave: 'buono', nome: 'Buono', icona: 'fa-thumbs-up', frase: 'Poco sotto le stime.' }
    : p >= -10 ? { chiave: 'sufficiente', nome: 'Sufficiente', icona: 'fa-circle-half-stroke', frase: 'Sotto le stime: controlla incassi e imprevisti.' }
    : p >= -20 ? { chiave: 'mediocre', nome: 'Mediocre', icona: 'fa-triangle-exclamation', frase: 'Molto sotto le stime.' }
    : { chiave: 'scarso', nome: 'Scarso', icona: 'fa-circle-exclamation', frase: 'Lontano dalle stime: serve intervenire.' }
  return { ...l, scarto }
}

/** Posizione del cursore sul termometro (0–100): −30% … +10% di scarto. */
export const posizioneTermometro = (scarto: number) => Math.max(2, Math.min(98, ((scarto * 100 + 30) / 40) * 100))

// ── Proiezione della liquidità ───────────────────────────────────────────────
export interface PuntoProiezione {
  data: string
  incassi: number
  uscite: number
  saldo: number
}

/** Data in cui un incasso si stima arriverà: quelli in ritardo fra una settimana. */
export const dataIncasso = (i: Incasso, oggiIso: string) =>
  i.stato === 'in-ritardo' ? iso(piuGiorni(daIso(oggiIso), 7)) : i.stimata < oggiIso ? oggiIso : i.stimata

export function proietta(d: DatiCassa, piano: Record<string, string>, giorni = ORIZZONTE): PuntoProiezione[] {
  const t = iso(oggi())
  const punti: PuntoProiezione[] = []
  let saldo = d.liquidita
  for (let g = 0; g <= giorni; g++) {
    const giorno = iso(piuGiorni(oggi(), g))
    const incassi = d.incassi.filter(i => i.stato !== 'incassato' && dataIncasso(i, t) === giorno).reduce((a, i) => a + i.importo, 0)
    const uscite = d.uscite.filter(u => (piano[u.id] ?? u.scadenza) === giorno).reduce((a, u) => a + u.importo, 0)
    saldo += incassi - uscite
    punti.push({ data: giorno, incassi, uscite, saldo })
  }
  return punti
}

/**
 * Distribuzione uniforme: sposta i pagamenti spostabili fra oggi e la loro
 * scadenza per abbassare i picchi giornalieri di uscita (greedy: dal più
 * grande, nel giorno più "scarico" del suo intervallo; a parità il più tardi).
 */
export function distribuisci(d: DatiCassa, entro: number): Record<string, string> {
  const t = oggi()
  const limite = iso(piuGiorni(t, entro))
  const carico = new Map<string, number>()
  d.uscite.filter(u => !u.spostabile).forEach(u => carico.set(u.scadenza, (carico.get(u.scadenza) ?? 0) + u.importo))
  const piano: Record<string, string> = {}
  const mobili = d.uscite.filter(u => u.spostabile && u.scadenza <= limite).sort((a, b) => b.importo - a.importo)
  d.uscite.filter(u => u.spostabile && u.scadenza > limite).forEach(u => carico.set(u.scadenza, (carico.get(u.scadenza) ?? 0) + u.importo))
  mobili.forEach(u => {
    const giorni = giorniTra(iso(t), u.scadenza)
    let migliore = u.scadenza
    let min = Infinity
    for (let g = giorni; g >= 0; g--) {
      const giorno = iso(piuGiorni(t, g))
      const c = carico.get(giorno) ?? 0
      if (c < min) { min = c; migliore = giorno }
    }
    if (migliore !== u.scadenza) piano[u.id] = migliore
    carico.set(migliore, (carico.get(migliore) ?? 0) + u.importo)
  })
  return piano
}

// ── Formati ──────────────────────────────────────────────────────────────────
export function eur(n: number): string {
  const a = Math.abs(n)
  const s = n < 0 ? '−' : ''
  if (a >= 1e6) return `${s}${(a / 1e6).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mln €`
  if (a >= 1e4) return `${s}${Math.round(a / 1e3).toLocaleString('it-IT')}k €`
  return `${s}${Math.round(a).toLocaleString('it-IT')} €`
}
export const eurPieno = (n: number) => `${n < 0 ? '−' : ''}${Math.round(Math.abs(n)).toLocaleString('it-IT')} €`
export const dataBreve = (s: string) => daIso(s).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
export const dataLunga = (s: string) => daIso(s).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
