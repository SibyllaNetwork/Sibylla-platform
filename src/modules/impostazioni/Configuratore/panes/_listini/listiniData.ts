// ─── DATI CONDIVISI DEI LISTINI (Individuali + Gruppi) ───────────────────────
//  Anagrafiche mock e helper comuni ai due pane "Listini" del Configuratore.
//  Le camere portano il NOME LOCALE associato dalla struttura (requisito
//  §4.17: mai lo standard Sibylla); la tipologia standard serve SOLO al
//  riepilogo calendario (prezzo della stessa tipologia nelle diverse stagioni).

export interface LstStruttura  { id: string; nome: string; categoriaId: string }
export interface LstCategoria  { id: string; nome: string }
export interface LstTipologia  { id: string; nome: string }
export interface LstCamera     { id: string; nomeLocale: string; tipologiaId: string }
export interface LstStagione   { id: string; nome: string; periodo: string }

export const LST_CATEGORIE: LstCategoria[] = [
  { id: 'cat-3',      nome: 'Hotel 3 stelle' },
  { id: 'cat-4',      nome: 'Hotel 4 stelle' },
  { id: 'cat-resort', nome: 'Resort & villaggi' },
]

export const LST_STRUTTURE: LstStruttura[] = [
  { id: 'girasole', nome: 'Hotel Il Girasole',      categoriaId: 'cat-3' },
  { id: 'baia',     nome: "Resort Baia d'Argento",  categoriaId: 'cat-resort' },
  { id: 'querce',   nome: 'Villa delle Querce',     categoriaId: 'cat-4' },
]

export const LST_TIPOLOGIE: LstTipologia[] = [
  { id: 'singola', nome: 'Singola' },
  { id: 'doppia',  nome: 'Doppia' },
  { id: 'tripla',  nome: 'Tripla' },
  { id: 'suite',   nome: 'Suite' },
]

// Nomi camere COME LI HA ASSOCIATI LA STRUTTURA (mai lo standard Sibylla).
export const LST_CAMERE: Record<string, LstCamera[]> = {
  girasole: [
    { id: 'g1', nomeLocale: 'Il Girasole',        tipologiaId: 'singola' },
    { id: 'g2', nomeLocale: 'Camera del Sole',    tipologiaId: 'doppia' },
    { id: 'g3', nomeLocale: 'Camera della Luna',  tipologiaId: 'doppia' },
    { id: 'g4', nomeLocale: 'Terrazza Fiorita',   tipologiaId: 'tripla' },
    { id: 'g5', nomeLocale: 'Suite del Borgo',    tipologiaId: 'suite' },
  ],
  baia: [
    { id: 'b1', nomeLocale: 'Conchiglia',         tipologiaId: 'singola' },
    { id: 'b2', nomeLocale: 'Vista Mare',         tipologiaId: 'doppia' },
    { id: 'b3', nomeLocale: 'Brezza Marina',      tipologiaId: 'doppia' },
    { id: 'b4', nomeLocale: 'Onda Lunga',         tipologiaId: 'tripla' },
    { id: 'b5', nomeLocale: 'Suite del Faro',     tipologiaId: 'suite' },
    { id: 'b6', nomeLocale: 'Suite Corallo',      tipologiaId: 'suite' },
  ],
  querce: [
    { id: 'q1', nomeLocale: 'La Ghianda',         tipologiaId: 'singola' },
    { id: 'q2', nomeLocale: 'Quercia Antica',     tipologiaId: 'doppia' },
    { id: 'q3', nomeLocale: 'Il Nido',            tipologiaId: 'tripla' },
    { id: 'q4', nomeLocale: 'Suite del Parco',    tipologiaId: 'suite' },
  ],
}

// Le stagionalità NON sono un elenco di questi pane: arrivano dal configuratore
// Stagionalità (che li sblocca), tramite `stagioniDaPeriodi`. Qui viaggiano come
// parametro, così Listini e Stagionalità restano allineati per costruzione.
// Il moltiplicatore tariffario segue l'ordine di catalogo (low → peak).
const moltiplicatore = (index: number): number => 1 + index * 0.15

export const fmtEuro = (n: number): string =>
  `${n.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`

export const tipologiaNome = (id: string): string =>
  LST_TIPOLOGIE.find(t => t.id === id)?.nome ?? id

// ─── Prezzi listini individuali ──────────────────────────────────────────────
//  Prezzi per (struttura, stagione B2B, camera), chiave piatta `s|st|c`.

export const keyInd = (strutturaId: string, stagioneId: string, cameraId: string): string =>
  `${strutturaId}|${stagioneId}|${cameraId}`

const BASE_TIPOLOGIA: Record<string, number> = { singola: 68, doppia: 96, tripla: 122, suite: 184 }
const OFFSET_STRUTTURA: Record<string, number> = { girasole: 0, baia: 14, querce: 6 }

export function seedPrezziIndividuali(stagioni: LstStagione[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const s of LST_STRUTTURE) {
    stagioni.forEach((stag, i) => {
      for (const cam of LST_CAMERE[s.id] ?? []) {
        const base = BASE_TIPOLOGIA[cam.tipologiaId] ?? 90
        out[keyInd(s.id, stag.id, cam.id)] =
          Math.round((base + (OFFSET_STRUTTURA[s.id] ?? 0)) * moltiplicatore(i))
      }
    })
  }
  return out
}

// ─── Lotti e tariffe gruppi ──────────────────────────────────────────────────
//  Contesto della configurazione gruppi: una struttura O una categoria
//  (selezione alternativa), chiave `s:<id>` / `c:<id>`.

export type TipoLotto = 'Standard' | 'Serie' | 'Allotment'
export const TIPI_LOTTO: TipoLotto[] = ['Standard', 'Serie', 'Allotment']

export type DistribuzioneGruppi = 'camera' | 'persona'

export interface TariffeLotto {
  tariffaAdulti: number
  supplAdulti: number
  tariffaStudenti: number
  supplStudenti: number
}

export interface LottoRiga {
  id: string
  nome: string
  tipo: TipoLotto
  /** Tariffe per stagione gruppi (id stagione → tariffe). */
  tariffe: Record<string, TariffeLotto>
}

export interface GruppiConfig {
  lotti: Record<string, LottoRiga[]>
  distribuzione: Record<string, DistribuzioneGruppi>
}

export const contestoStruttura = (id: string): string => `s:${id}`
export const contestoCategoria = (id: string): string => `c:${id}`

export function contestoLabel(contesto: string): string {
  const [kind, id] = contesto.split(':')
  return kind === 's'
    ? LST_STRUTTURE.find(s => s.id === id)?.nome ?? id
    : LST_CATEGORIE.find(c => c.id === id)?.nome ?? id
}

const LOTTI_BASE: { nome: string; tipo: TipoLotto; adulti: number; studenti: number }[] = [
  { nome: 'Lotto 20+1', tipo: 'Standard',  adulti: 62, studenti: 46 },
  { nome: 'Lotto 25+2', tipo: 'Standard',  adulti: 58, studenti: 43 },
  { nome: 'Lotto 40+4', tipo: 'Serie',     adulti: 52, studenti: 38 },
  { nome: 'Lotto 15+1', tipo: 'Allotment', adulti: 66, studenti: 49 },
]

function seedLotti(contesto: string, offset: number, stagioni: LstStagione[]): LottoRiga[] {
  return LOTTI_BASE.map((l, i) => {
    const tariffe: Record<string, TariffeLotto> = {}
    stagioni.forEach((stag, si) => {
      const m = moltiplicatore(si)
      tariffe[stag.id] = {
        tariffaAdulti:   Math.round((l.adulti + offset) * m),
        supplAdulti:     Math.round(10 * m),
        tariffaStudenti: Math.round((l.studenti + offset) * m),
        supplStudenti:   Math.round(7 * m),
      }
    })
    return { id: `${contesto}-${i}`, nome: l.nome, tipo: l.tipo, tariffe }
  })
}

export function seedGruppiConfig(stagioni: LstStagione[]): GruppiConfig {
  const lotti: Record<string, LottoRiga[]> = {}
  const distribuzione: Record<string, DistribuzioneGruppi> = {}
  LST_STRUTTURE.forEach((s, i) => {
    const k = contestoStruttura(s.id)
    lotti[k] = seedLotti(k, i * 3, stagioni)
    distribuzione[k] = 'persona'
  })
  LST_CATEGORIE.forEach((c, i) => {
    const k = contestoCategoria(c.id)
    lotti[k] = seedLotti(k, i * 2, stagioni)
    distribuzione[k] = 'camera'
  })
  return { lotti, distribuzione }
}

/** Tariffe vuote per un lotto nuovo (tutte le stagionalità configurate a zero). */
export function tariffeVuote(stagioni: LstStagione[]): Record<string, TariffeLotto> {
  const out: Record<string, TariffeLotto> = {}
  for (const stag of stagioni) {
    out[stag.id] = { tariffaAdulti: 0, supplAdulti: 0, tariffaStudenti: 0, supplStudenti: 0 }
  }
  return out
}
