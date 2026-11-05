// ─── TEAMSYSTEM — TRACCIATO RECORD RILPRE ─────────────────────────────────────
//  File presenze per le paghe TeamSystem (docs/integrazione paghe/Tracciato_RILPRE.pdf).
//  File binario senza fine riga: un record di 1707 caratteri per dipendente.
//    · testata (posizioni 1–95): azienda, filiale, dipendente, cognome, nome,
//      data inizio e fine mese (GGMMAA);
//    · 31 blocchi giornalieri da 52 caratteri dalla posizione 96: ore di
//      ordinario e fino a 6 giustificativi (codice + ore), ore in hhcc
//      (ore e centesimi: 7,5 h → 0750).
//  Numerici non valorizzati a zero, alfanumerici a spazio.
//  Due varianti:
//    · standard: codice dipendente di 9 cifre (pos. 7), giustificativi con
//      codice di 4 caratteri;
//    · RP / Teamtime: sigla «RP » (pos. 7) + codice dipendente di 6 cifre
//      (pos. 10), giustificativi con sigla di 2 caratteri (tabella TB1103),
//      flag «somma all'ordinario» e «stampa descrizione».

import { giorniDelMese, oreGiorno, type GiornataRegistro, type GiornoMese } from './presenze.model'

export type VarianteRilpre = 'standard' | 'rp'

export const LUNGHEZZA_RECORD = 1707
const LUNGHEZZA_TESTATA = 95
const LUNGHEZZA_GIORNO = 52
const GIUSTIFICATIVI_MAX = 6

/** Voci del registro che diventano giustificativi, nell'ordine in cui si scrivono nel giorno. */
export const VOCI_GIUSTIFICATIVO = ['Straordinario', 'Festive', 'Permessi', 'Ferie', 'Malattia', 'Infortunio', 'Trasferta', 'Assenza'] as const

export interface DipendenteRilpre { id: number; nome: string; cognome: string }

export interface OpzioniRilpre {
  anno: number
  /** Mese 0-based. */
  mese: number
  dipendenti: DipendenteRilpre[]
  giornata: (dipId: number, iso: string) => GiornataRegistro
  codiceAzienda: string
  codiceFiliale: string
  /** Codice del dipendente nel software paghe. */
  codiceDipendente: (dipId: number) => string
  /** Codice giustificativo per voce (Straordinario, Ferie, …). */
  codici: Record<string, string>
  variante: VarianteRilpre
  /** Voci da sommare all'ordinario (solo variante RP). */
  sommaOrdinario?: string[]
}

export interface RisultatoRilpre {
  testo: string
  record: number
  /** Problemi da sistemare prima dell'invio (campi obbligatori, codici troppo lunghi…). */
  errori: string[]
  /** Segnalazioni che non bloccano l'invio. */
  avvisi: string[]
}

/** Solo caratteri ASCII stampabili: un carattere = un byte, le posizioni non slittano. */
const ascii = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7E]/g, ' ')
/** Alfanumerico: allineato a sinistra, completato con spazi, troncato alla lunghezza. */
const alfa = (s: string, n: number) => ascii(s).slice(0, n).padEnd(n, ' ')
/** Numerico: solo cifre, allineato a destra, completato con zeri. */
const num = (v: string | number, n: number) => String(v).replace(/\D/g, '').slice(-n).padStart(n, '0')
/** Ore decimali in hhcc (ore e centesimi). */
export const hhcc = (ore: number) => {
  const tot = Math.min(9999, Math.round(Math.max(0, ore) * 100))
  return String(tot).padStart(4, '0')
}
const ggmmaa = (d: Date) => `${String(d.getDate()).padStart(2, '0')}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getFullYear()).slice(-2)}`

/** Ore di ciascuna voce nel giorno, assenza ingiustificata compresa. */
function oreVoci(x: GiornoMese): Record<string, number> {
  const o = oreGiorno(x)
  return { ...o, Assenza: x.g.codice === 'ASS' ? 8 : 0 }
}

function bloccoGiorno(x: GiornoMese | undefined, o: OpzioniRilpre, avvisi: Set<string>): string {
  // Giorno senza dati (es. il 31 in un mese di 30): ordinario a zero, giustificativi a spazio e ore a zero.
  const vuoto = '0000' + '    0000'.repeat(GIUSTIFICATIVI_MAX)
  if (!x) return vuoto
  const ore = oreVoci(x)
  const giust = VOCI_GIUSTIFICATIVO.filter((v) => ore[v] > 0)
  if (giust.length > GIUSTIFICATIVI_MAX) avvisi.add(`Il ${x.n} ci sono più di ${GIUSTIFICATIVI_MAX} giustificativi: trasmessi i primi ${GIUSTIFICATIVI_MAX}.`)
  let out = hhcc(ore.Ordinarie)
  for (let i = 0; i < GIUSTIFICATIVI_MAX; i++) {
    const v = giust[i]
    if (!v) { out += '    0000'; continue }
    const codice = (o.codici[v] ?? '').trim().toUpperCase()
    if (o.variante === 'rp') {
      const somma = o.sommaOrdinario?.includes(v) ? 'S' : ' '
      out += alfa(codice, 2) + somma + 'S' + hhcc(ore[v])
    } else {
      out += alfa(codice, 4) + hhcc(ore[v])
    }
  }
  return out
}

export function generaRilpre(o: OpzioniRilpre): RisultatoRilpre {
  const errori: string[] = []
  const avvisi = new Set<string>()
  const lungCodice = o.variante === 'rp' ? 2 : 4
  if (!/^\d{1,4}$/.test(o.codiceAzienda.trim())) errori.push('Codice azienda: servono da 1 a 4 cifre.')
  if (!/^\d{0,3}$/.test(o.codiceFiliale.trim())) errori.push('Codice filiale: al massimo 3 cifre.')
  VOCI_GIUSTIFICATIVO.forEach((v) => {
    const c = (o.codici[v] ?? '').trim()
    if (!c) errori.push(`Manca il codice giustificativo di «${v}».`)
    else if (c.length > lungCodice) errori.push(`Il codice di «${v}» (${c}) supera i ${lungCodice} caratteri della variante ${o.variante === 'rp' ? 'RP / Teamtime' : 'standard'}.`)
  })

  const inizio = new Date(o.anno, o.mese, 1)
  const fine = new Date(o.anno, o.mese + 1, 0)
  const filiale = o.codiceFiliale.trim()
  const record = o.dipendenti.map((d) => {
    const cod = o.codiceDipendente(d.id).trim()
    const maxCod = o.variante === 'rp' ? 6 : 9
    if (!/^\d+$/.test(cod) || cod.length > maxCod) errori.push(`${d.nome} ${d.cognome}: il codice dipendente «${cod || 'vuoto'}» deve essere di ${maxCod} cifre al massimo.`)
    // Filiale di 3 cifre: il tracciato la vuole negli ultimi 3 caratteri del nome (posizioni 81–83).
    const nome = filiale.length === 3 ? alfa(d.nome, 31) + filiale : alfa(d.nome, 34)
    const testata =
      num(o.codiceAzienda, 4) +
      num(filiale.length === 3 ? '00' : filiale, 2) +
      (o.variante === 'rp' ? 'RP ' + num(cod, 6) : num(cod, 9)) +
      alfa(d.cognome.toUpperCase(), 34) +
      nome.toUpperCase() +
      ggmmaa(inizio) + ggmmaa(fine)
    const giorni = giorniDelMese(o.anno, o.mese, (iso) => o.giornata(d.id, iso))
    let corpo = ''
    for (let i = 0; i < 31; i++) corpo += bloccoGiorno(giorni[i], o, avvisi)
    const r = testata + corpo
    if (testata.length !== LUNGHEZZA_TESTATA || corpo.length !== 31 * LUNGHEZZA_GIORNO || r.length !== LUNGHEZZA_RECORD) {
      errori.push(`${d.nome} ${d.cognome}: record di ${r.length} caratteri invece di ${LUNGHEZZA_RECORD}.`)
    }
    return r
  })
  return { testo: record.join(''), record: record.length, errori: Array.from(new Set(errori)), avvisi: Array.from(avvisi) }
}

/** Nome del file come lo importa la procedura TeamSystem. */
export const NOME_FILE_RILPRE = 'RILPRE'

/** Contenuto in base64 (latin1: un carattere = un byte) per l'invio al connettore. */
export const rilpreBase64 = (testo: string) => btoa(testo)

/** Scarica il file RILPRE (binario, senza estensione né fine riga). */
export function scaricaRilpre(testo: string, nome = NOME_FILE_RILPRE) {
  const bytes = new Uint8Array(testo.length)
  for (let i = 0; i < testo.length; i++) bytes[i] = testo.charCodeAt(i) & 0xff
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
