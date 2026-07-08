// ─── Modello e builder del contratto "CONDIZIONI DI VENDITA — MERCATO GRUPPI" ──
// Deriva dai tre template .docx (contratti/): gruppi_adul, gruppi_stud,
// gruppi_adul_stud. Il segmento scelto nei parametri dell'annuncio determina
// quale variante viene generata (colonne/righe per Adulti, Studenti o entrambi).

export type Segmento = 'Adulti' | 'Studenti' | 'Adulti e studenti'
export const SEGMENTI: Segmento[] = ['Adulti', 'Studenti', 'Adulti e studenti']

export type TipoContratto = 'Vendita' | 'Acquisto'

// Righe delle tabelle editabili del documento
export interface StagioneRow    { id: number; nome: string; da: string; a: string }
export interface TariffaRow      { id: number; stagione: string; segmento: string; base: string; prezzo: string; suppl: string }
export interface MercatoRow      { id: number; nazionalita: string; segmento: string; scontistica: string; note: string }
export interface SupplementoRow  { id: number; segmento: string; categoria: string; voce: string; importo: string }
export interface LottoRow        { id: number; mese: string; anno: string; lotti: string; camereGiorno: string }

export interface Contratto {
  numero: string
  data: string
  tipo: TipoContratto
  segmento: Segmento
  struttura: string
  logo: string                  // logo struttura (data URL), '' se assente
  cliente: string
  tourOperator: string
  periodo: string
  pagamento: string
  annoStagione: string          // es. "2026/2027"
  distribuzione: string         // paragrafo DISTRIBUZIONE (editabile)
  stagioni: StagioneRow[]       // STAGIONALITÀ
  tariffe: TariffaRow[]         // TARIFFE
  mercato: MercatoRow[]         // MERCATO SPECIFICO
  supplementi: SupplementoRow[] // SUPPLEMENTI
  lotti: LottoRow[]             // CONTINGENTE CAMERE / LOTTI
  gratuita: string              // gratuità, tassa di soggiorno, iva (editabile)
  penali: string                // PENALI (editabile)
  luogo: string                 // Luogo e data
}

// Parametri dell'annuncio necessari a comporre il contratto.
export interface ContrattoInput {
  tipo: TipoContratto
  segmento: Segmento
  struttura: string
  cliente?: string
  tourOperator: string
  periodo: string
  pagamento: string
  quantita: number
  tipologiaBase: string
  dataDa: string
  dataA: string
  numero?: string   // in modifica: mantiene il numero esistente
  data?: string
}

// Le "parti" del segmento (una o entrambe le categorie di mercato).
export const segParts = (s: Segmento): ('Adulti' | 'Studenti')[] =>
  s === 'Adulti e studenti' ? ['Adulti', 'Studenti'] : [s]

// Etichetta del sottotitolo di distribuzione, come nei template.
const distribLabel = (s: Segmento) =>
  s === 'Adulti' ? 'GRUPPI adulti' : s === 'Studenti' ? 'GRUPPI studenti' : 'GRUPPI'

const anno = (iso: string) => (iso?.split('-')[0] || `${new Date().getFullYear()}`)

/** Numero di riga incrementale per una tabella del contratto. */
export const nextRowId = (rows: { id: number }[]) =>
  rows.reduce((m, r) => Math.max(m, r.id), 0) + 1

export const STAGIONI_DEF = ['Bassa stagione', 'Media stagione', 'Alta stagione']

/** Costruisce un contratto completo (con dati di partenza editabili) dai parametri. */
export function buildContratto(p: ContrattoInput): Contratto {
  const y1 = anno(p.dataDa)
  const y2 = String(Number(y1) + 1)
  const parti = segParts(p.segmento)

  const stagioni: StagioneRow[] = STAGIONI_DEF.map((nome, i) => ({
    id: i + 1, nome, da: '', a: '',
  }))

  const tariffe: TariffaRow[] = []
  let tId = 0
  for (const s of STAGIONI_DEF) {
    for (const seg of parti) {
      tariffe.push({
        id: ++tId, stagione: s, segmento: seg,
        base: p.tipologiaBase || 'Base doppia', prezzo: '', suppl: '',
      })
    }
  }

  const mercato: MercatoRow[] = parti.map((seg, i) => ({
    id: i + 1, nazionalita: '', segmento: seg, scontistica: '', note: '',
  }))

  const supplementi: SupplementoRow[] = parti.map((seg, i) => ({
    id: i + 1, segmento: seg, categoria: '3*', voce: 'Camere singole', importo: '',
  }))

  const lotti: LottoRow[] = [
    { id: 1, mese: '', anno: y1, lotti: String(p.quantita || 1), camereGiorno: '' },
  ]

  return {
    numero: p.numero ?? ('CTR/' + new Date().getFullYear() + '/' + String(Math.floor(Math.random() * 9000) + 1000)),
    data: p.data ?? new Date().toLocaleDateString('it-IT'),
    tipo: p.tipo,
    segmento: p.segmento,
    struttura: p.struttura,
    logo: '',
    cliente: p.cliente ?? '',
    tourOperator: p.tourOperator,
    periodo: p.periodo,
    pagamento: p.pagamento,
    annoStagione: `${y1}/${y2}`,
    distribuzione:
      `La struttura definisce le condizioni di distribuzione del segmento ${distribLabel(p.segmento)}: ` +
      `contingente camere, eventuale allotment e tempistiche di rilascio dei lotti, stagionalità e relativi listini riportati negli schemi seguenti.`,
    stagioni,
    tariffe,
    mercato,
    supplementi,
    lotti,
    gratuita:
      'Gratuità: 1 ogni tot. persone paganti. Tariffe comprensive di prima colazione e IVA. ' +
      'Tassa di soggiorno esclusa, a carico dell’ospite.',
    penali:
      'In caso di cancellazione, no-show o riduzione dei volumi concordati si applicano le penali secondo le tempistiche di rilascio dei lotti sopra indicate.',
    luogo: '',
  }
}
