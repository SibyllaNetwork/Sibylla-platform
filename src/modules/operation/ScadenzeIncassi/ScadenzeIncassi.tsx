import React, { useEffect, useMemo, useState } from 'react'
import EmptyState from '../../../core/components/EmptyState'
import PageHead from '../../../core/components/PageHead'
import Pagination from '../../../core/components/Pagination'
import { DateRangeField, RadioGroup, SelectField, InputField } from '../../../core/components/form'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import { toast } from '../../../core/components/Toast/useToast'
import { exportDocumentoIncassoPdf } from './documentoIncassoPdf'
import './ScadenzeIncassi.sass'

const PAGE_SIZE = 10
// Giorni entro i quali un incasso non ancora saldato è considerato "in scadenza".
const SOGLIA_SCADENZA = 7

// ─── TIPI ───────────────────────────────────────────────────────────────────────

type TipoIncasso = 'caparra' | 'acconto' | 'saldo' | 'rata'
/** Stato derivato dal saldo residuo e dalla scadenza rispetto ad oggi. */
type StatoDoc = 'pagato' | 'scaduto' | 'in-scadenza' | 'da-incassare'

interface Documento {
  id: number
  numero: string          // Numero documento (es. C-0001/MU 2026)
  tipologia: TipoIncasso  // Tipologia
  dataDocumento: string   // Data documento (ISO yyyy-MM-dd)
  emessoDa: string        // Emesso da
  riferimento: string     // Riferimento (ospite / prenotazione) — '-' se assente
  ragioneSociale: string  // Ragione sociale — '-' se assente
  email: string           // contatto per il sollecito
  importo: number         // Importo
  saldo: number           // Saldo residuo (0 = pagato)
  voceIncasso: string     // Voce incasso (canale)
  dataScadenza: string    // scadenza dell'incasso (guida stato e filtro)
  sollecitato?: boolean
  quietanzato?: boolean
}

// Metodi con cui si può registrare l'incasso dalla modale "Quietanza fattura".
type MetodoIncasso = 'bonifico' | 'carta' | 'contanti' | 'nexi' | 'paypal'
const METODI_INCASSO: { value: MetodoIncasso; label: string }[] = [
  { value: 'bonifico', label: 'Bonifico' },
  { value: 'carta', label: 'Carta di credito' },
  { value: 'contanti', label: 'Contanti' },
  { value: 'nexi', label: 'Nexi (POS)' },
  { value: 'paypal', label: 'PayPal' },
]
const CAUSALI_NC = ['Storno totale', 'Storno parziale', 'Reso / rimborso', 'Errore di fatturazione', 'Sconto riconosciuto']

const TIPO_LABEL: Record<TipoIncasso, string> = {
  caparra: 'Caparra',
  acconto: 'Acconto',
  saldo: 'Saldo',
  rata: 'Rata',
}
const TIPO_PREFIX: Record<TipoIncasso, string> = { caparra: 'C', acconto: 'A', saldo: 'S', rata: 'R' }

const STATO_META: Record<StatoDoc, { label: string; tone: 'ok' | 'warn' | 'ko' | 'muted' }> = {
  pagato: { label: 'Pagato', tone: 'ok' },
  scaduto: { label: 'Scaduto', tone: 'ko' },
  'in-scadenza': { label: 'In scadenza', tone: 'warn' },
  'da-incassare': { label: 'Da incassare', tone: 'muted' },
}

// ─── DATI MOCK ────────────────────────────────────────────────────────────────

const SEED: Documento[] = [
  { id: 1, numero: 'C-0001/MU 2026', tipologia: 'caparra', dataDocumento: '2026-06-26', emessoDa: 'Mario Rossi', riferimento: '-', ragioneSociale: '-', email: 'ospite1@email.it', importo: 88.44, saldo: 0, voceIncasso: 'Nexi', dataScadenza: '2026-06-26', quietanzato: true },
  { id: 2, numero: 'C-0002/MU 2026', tipologia: 'caparra', dataDocumento: '2026-06-26', emessoDa: 'Mario Rossi', riferimento: 'Melissa Barnat', ragioneSociale: '-', email: 'm.barnat@email.com', importo: 144.45, saldo: 0, voceIncasso: 'Nexi', dataScadenza: '2026-06-26', quietanzato: true },
  { id: 3, numero: 'A-0003/MU 2026', tipologia: 'acconto', dataDocumento: '2026-06-20', emessoDa: 'Reception', riferimento: 'Verdi Tour S.p.A.', ragioneSociale: 'Verdi Tour S.p.A.', email: 'contabilita@verditour.it', importo: 1200, saldo: 900, voceIncasso: 'Bonifico', dataScadenza: '2026-06-22' },
  { id: 4, numero: 'S-0004/MU 2026', tipologia: 'saldo', dataDocumento: '2026-06-01', emessoDa: 'Amministrazione', riferimento: 'Anna Esposito', ragioneSociale: '-', email: 'anna.esposito@email.it', importo: 600, saldo: 0, voceIncasso: 'Carta', dataScadenza: '2026-06-01', quietanzato: true },
  { id: 5, numero: 'A-0005/MU 2026', tipologia: 'acconto', dataDocumento: '2026-05-30', emessoDa: 'Reception', riferimento: 'Romano Tour Operator', ragioneSociale: 'Romano Tour Operator', email: 'ops@romanotour.com', importo: 980, saldo: 700, voceIncasso: 'Bonifico', dataScadenza: '2026-09-01' },
  { id: 6, numero: 'S-0006/MU 2026', tipologia: 'saldo', dataDocumento: '2026-06-05', emessoDa: 'Mario Rossi', riferimento: 'Sara Greco', ragioneSociale: '-', email: 'sara.greco@email.it', importo: 1060, saldo: 1060, voceIncasso: 'Nexi', dataScadenza: '2026-07-13' },
  { id: 7, numero: 'C-0007/MU 2026', tipologia: 'caparra', dataDocumento: '2026-06-01', emessoDa: 'Reception', riferimento: 'Conti & Partners', ragioneSociale: 'Conti & Partners', email: 'admin@contipartners.it', importo: 1020, saldo: 760, voceIncasso: 'Bonifico', dataScadenza: '2026-07-05' },
  { id: 8, numero: 'R-0008/MU 2026', tipologia: 'rata', dataDocumento: '2026-05-22', emessoDa: 'Amministrazione', riferimento: 'Giulia Ferrari', ragioneSociale: '-', email: 'giulia.ferrari@email.it', importo: 400, saldo: 0, voceIncasso: 'PayPal', dataScadenza: '2026-06-25', quietanzato: true },
  { id: 9, numero: 'S-0009/MU 2026', tipologia: 'saldo', dataDocumento: '2026-04-15', emessoDa: 'Mario Rossi', riferimento: 'Marino Congressi S.r.l.', ragioneSociale: 'Marino Congressi S.r.l.', email: 'eventi@marinocongressi.it', importo: 1160, saldo: 1160, voceIncasso: 'Bonifico', dataScadenza: '2026-06-05', sollecitato: true },
  { id: 10, numero: 'C-0010/MU 2026', tipologia: 'caparra', dataDocumento: '2026-06-03', emessoDa: 'Reception', riferimento: 'Paolo Marino', ragioneSociale: '-', email: 'paolo.marino@email.it', importo: 540, saldo: 300, voceIncasso: 'Contanti', dataScadenza: '2026-07-20' },
  { id: 11, numero: 'A-0011/MU 2026', tipologia: 'acconto', dataDocumento: '2026-06-10', emessoDa: 'Amministrazione', riferimento: 'Blue Sky Travel', ragioneSociale: 'Blue Sky Travel', email: 'booking@blueskytravel.com', importo: 2100, saldo: 2100, voceIncasso: 'Bonifico', dataScadenza: '2026-06-30' },
  { id: 12, numero: 'C-0012/MU 2026', tipologia: 'caparra', dataDocumento: '2026-06-12', emessoDa: 'Reception', riferimento: 'Elena Costa', ragioneSociale: '-', email: 'elena.costa@email.it', importo: 380, saldo: 380, voceIncasso: 'Carta', dataScadenza: '2026-07-28' },
  { id: 13, numero: 'S-0013/MU 2026', tipologia: 'saldo', dataDocumento: '2026-05-28', emessoDa: 'Mario Rossi', riferimento: 'Fontana Eventi', ragioneSociale: 'Fontana Eventi', email: 'info@fontanaeventi.it', importo: 1500, saldo: 1000, voceIncasso: 'Nexi', dataScadenza: '2026-06-08' },
]

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const fmtEur = (n: number) => n.toFixed(2).replace('.', ',') + ' €'

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Giorni interi tra oggi e la scadenza (negativo = già scaduta). */
function giorniAllaScadenza(iso: string, today: Date): number {
  const due = new Date(iso); due.setHours(0, 0, 0, 0)
  const t = new Date(today); t.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - t.getTime()) / 86_400_000)
}

function statoDoc(d: Documento, today: Date): StatoDoc {
  if (d.saldo <= 0) return 'pagato'
  const g = giorniAllaScadenza(d.dataScadenza, today)
  if (g < 0) return 'scaduto'
  if (g <= SOGLIA_SCADENZA) return 'in-scadenza'
  return 'da-incassare'
}

/** Etichetta relativa alla scadenza (es. "Scaduto da 6 g", "Tra 3 g"). */
function etichettaScadenza(d: Documento, today: Date): string {
  if (d.saldo <= 0) return 'Pagato'
  const g = giorniAllaScadenza(d.dataScadenza, today)
  if (g < 0) return `Scaduto da ${Math.abs(g)} g`
  if (g === 0) return 'Scade oggi'
  return `Tra ${g} g`
}

// ─── COMPONENTE ─────────────────────────────────────────────────────────────────

/** Colonne su cui è disponibile il filtro multi-scelta nell'header. */
type ColFilterKey = 'tipologia' | 'emessoDa' | 'riferimento' | 'stato'

const TIPO_VALUES = Object.values(TIPO_LABEL)
const STATO_VALUES: string[] = ['Pagato', 'Scaduto', 'In scadenza', 'Da incassare']

export default function ScadenzeIncassi({ navigate }: { navigate: (p: string) => void }) {
  const today = useMemo(() => new Date(), [])
  const [documenti, setDocumenti] = useState<Documento[]>(SEED)
  const [search, setSearch] = useState('')
  const [scadDa, setScadDa] = useState('')
  const [scadA, setScadA] = useState('')
  const [openFilter, setOpenFilter] = useState<ColFilterKey | null>(null)
  const [colFilters, setColFilters] = useState<Record<ColFilterKey, string[]>>({ tipologia: [], emessoDa: [], riferimento: [], stato: [] })
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<number | null>(null)
  // Modale "Dettaglio documento" (icona occhio).
  const [dettaglioTarget, setDettaglioTarget] = useState<number | null>(null)
  // Modale "Quietanza fattura".
  const [quietanzaTarget, setQuietanzaTarget] = useState<number | null>(null)
  const [qMetodo, setQMetodo] = useState<MetodoIncasso>('bonifico')
  const [qData, setQData] = useState(() => new Date().toISOString().slice(0, 10))
  // Modale "Nota di credito".
  const [notaTarget, setNotaTarget] = useState<number | null>(null)
  const [ncCausale, setNcCausale] = useState(CAUSALI_NC[0])
  const [ncImporto, setNcImporto] = useState(0)
  // Modale "Invia sollecito".
  const [sollecitoTarget, setSollecitoTarget] = useState<number | null>(null)

  // Valori distinti per i filtri "a lista" (Emesso da, Riferimento).
  const EMESSO_VALUES = useMemo(() => Array.from(new Set(documenti.map((d) => d.emessoDa))).sort(), [documenti])
  const RIF_VALUES = useMemo(() => Array.from(new Set(documenti.map((d) => d.riferimento))).sort(), [documenti])

  const toggleExpanded = (id: number) => setExpanded((cur) => (cur === id ? null : id))

  const toggleColFilter = (key: ColFilterKey, value: string) =>
    setColFilters((p) => {
      const cur = p[key]
      return { ...p, [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] }
    })
  const setAllColFilter = (key: ColFilterKey, all: string[], select: boolean) =>
    setColFilters((p) => ({ ...p, [key]: select ? [...all] : [] }))

  // ── Azioni sui documenti ────────────────────────────────────────────────────
  // Quietanza fattura → modale dedicata (emette il documento e registra l'incasso).
  const qDoc = quietanzaTarget != null ? documenti.find((d) => d.id === quietanzaTarget) : undefined
  const openQuietanza = (id: number) => {
    const d = documenti.find((x) => x.id === id)
    if (!d) return
    const guess = METODI_INCASSO.find((m) => m.label.toLowerCase().startsWith(d.voceIncasso.toLowerCase()))?.value
    setQMetodo(guess ?? 'bonifico')
    setQData(new Date().toISOString().slice(0, 10))
    setQuietanzaTarget(id)
  }
  const confermaQuietanza = () => {
    if (quietanzaTarget == null || !qDoc) return
    const residuo = qDoc.saldo
    setDocumenti((prev) => prev.map((x) => (x.id === quietanzaTarget ? { ...x, saldo: 0, quietanzato: true } : x)))
    const metodo = METODI_INCASSO.find((m) => m.value === qMetodo)?.label ?? ''
    toast.success(
      residuo > 0
        ? `Quietanza/Fattura emessa e incasso di ${fmtEur(residuo)} registrato (${metodo}).`
        : `Quietanza/Fattura emessa per il documento ${qDoc.numero}.`,
      'Quietanza fattura emessa',
    )
    setQuietanzaTarget(null)
  }

  // Nota di credito → modale dedicata.
  const ncDoc = notaTarget != null ? documenti.find((d) => d.id === notaTarget) : undefined
  const openNota = (id: number) => {
    const d = documenti.find((x) => x.id === id)
    if (!d) return
    setNcCausale(CAUSALI_NC[0])
    setNcImporto(d.importo)
    setNotaTarget(id)
  }
  const confermaNota = () => {
    if (notaTarget == null || !ncDoc) return
    toast.success(`Nota di credito di ${fmtEur(ncImporto)} emessa per il documento ${ncDoc.numero} (${ncCausale.toLowerCase()}).`, 'Nota di credito emessa')
    setNotaTarget(null)
  }

  const esportaPdf = (id: number) => {
    const d = documenti.find((x) => x.id === id)
    if (!d) return
    void exportDocumentoIncassoPdf({
      numero: d.numero,
      tipologia: TIPO_LABEL[d.tipologia],
      dataDocumento: d.dataDocumento,
      emessoDa: d.emessoDa,
      riferimento: d.riferimento,
      ragioneSociale: d.ragioneSociale,
      importo: d.importo,
      saldo: d.saldo,
      voceIncasso: d.voceIncasso,
      dataScadenza: d.dataScadenza,
      stato: STATO_META[statoDoc(d, today)].label,
      gruppo: 'Hotel Noto',
    })
    toast.success(`Documento ${d.numero} esportato in PDF.`, 'Esportazione PDF')
  }

  // Apre la modale con l'anteprima della mail di sollecito.
  const richiediSollecito = (id: number) => {
    const d = documenti.find((x) => x.id === id)
    if (!d || d.saldo <= 0) return
    setSollecitoTarget(id)
  }
  const sollDoc = sollecitoTarget != null ? documenti.find((d) => d.id === sollecitoTarget) : undefined

  const confermaSollecito = () => {
    if (sollecitoTarget == null || !sollDoc) return
    setDocumenti((prev) => prev.map((d) => (d.id === sollecitoTarget ? { ...d, sollecitato: true } : d)))
    toast.success(`Sollecito di pagamento inviato a ${sollDoc.email}.`, 'Sollecito inviato')
    setSollecitoTarget(null)
  }

  // ── Conteggi per banner / footer ──────────────────────────────────────────
  const counts = useMemo(() => {
    let scaduti = 0, inScadenza = 0, importoScaduto = 0, importoInScadenza = 0
    documenti.forEach((d) => {
      const st = statoDoc(d, today)
      if (st === 'scaduto') { scaduti++; importoScaduto += d.saldo }
      else if (st === 'in-scadenza') { inScadenza++; importoInScadenza += d.saldo }
    })
    return { scaduti, inScadenza, importoScaduto, importoInScadenza }
  }, [documenti, today])

  // ── Filtro + ricerca ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return documenti.filter((d) => {
      if (q && !(
        d.numero.toLowerCase().includes(q) ||
        d.ragioneSociale.toLowerCase().includes(q) ||
        d.riferimento.toLowerCase().includes(q)
      )) return false
      if (colFilters.tipologia.length && !colFilters.tipologia.includes(TIPO_LABEL[d.tipologia])) return false
      if (colFilters.emessoDa.length && !colFilters.emessoDa.includes(d.emessoDa)) return false
      if (colFilters.riferimento.length && !colFilters.riferimento.includes(d.riferimento)) return false
      if (colFilters.stato.length && !colFilters.stato.includes(STATO_META[statoDoc(d, today)].label)) return false
      if (scadDa && d.dataScadenza < scadDa) return false
      if (scadA && d.dataScadenza > scadA) return false
      return true
    })
  }, [documenti, search, colFilters, scadDa, scadA, today])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [search, colFilters, scadDa, scadA])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])
  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  // ── Stats footer ──────────────────────────────────────────────────────────
  const totImporto = documenti.reduce((s, d) => s + d.importo, 0)
  const totDaIncassare = documenti.reduce((s, d) => s + d.saldo, 0)
  const totIncassato = totImporto - totDaIncassare

  const filtriAttivi = search !== '' || colFilters.tipologia.length > 0 || colFilters.emessoDa.length > 0 || colFilters.riferimento.length > 0 || colFilters.stato.length > 0 || scadDa !== '' || scadA !== ''
  const azzeraFiltri = () => {
    setSearch(''); setColFilters({ tipologia: [], emessoDa: [], riferimento: [], stato: [] }); setScadDa(''); setScadA('')
  }

  return (
    <div className="scad-inc">
      <PageHead
        title="Scadenze incassi"
        subtitle="Monitora acconti, rate e saldi delle prenotazioni: evidenzia i pagamenti in scadenza o scaduti, invia solleciti e registra gli incassi"
      />

      {(counts.scaduti > 0 || counts.inScadenza > 0) && (
        <div className="scad-inc__alert">
          <i className="fa-duotone fa-triangle-exclamation" />
          <span>
            {counts.scaduti > 0 && (
              <><strong>{counts.scaduti}</strong> {counts.scaduti === 1 ? 'documento' : 'documenti'} con incassi scaduti ({fmtEur(counts.importoScaduto)})</>
            )}
            {counts.scaduti > 0 && counts.inScadenza > 0 && ' · '}
            {counts.inScadenza > 0 && (
              <><strong>{counts.inScadenza}</strong> in scadenza entro {SOGLIA_SCADENZA} giorni ({fmtEur(counts.importoInScadenza)})</>
            )}
          </span>
        </div>
      )}

      <div className="scad-inc__bar">
        <div className="scad-inc__field scad-inc__field-raw scad-inc__field--grow">
          <label>Cerca</label>
          <div className="scad-inc__search">
            <input
              type="search"
              className="sib-input"
              placeholder="N. documento, ragione sociale o riferimento"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <i className="fa-light fa-magnifying-glass scad-inc__search-ico" />
          </div>
        </div>
        <DateRangeField
          label="Scadenza tra"
          nameFrom="scadDa"
          nameTo="scadA"
          valueFrom={scadDa}
          valueTo={scadA}
          onChangeFrom={(e) => setScadDa(e.target.value)}
          onChangeTo={(e) => setScadA(e.target.value)}
        />
        {filtriAttivi && (
          <button type="button" className="scad-inc__reset" onClick={azzeraFiltri}>
            <i className="fa-light fa-xmark" /> Azzera filtri
          </button>
        )}
      </div>

      <div className="sib-table-wrap">
        <table className="sib-table scad-inc__table">
          <thead>
            <tr>
              <th className="scad-inc__c-chev" aria-label="Espandi" />
              <th className="scad-inc__c-num">Numero documento</th>
              <th className="scad-inc__c-tipo">
                <ColFilterHeader label="Tipologia" options={TIPO_VALUES} selected={colFilters.tipologia}
                  open={openFilter === 'tipologia'} onToggleOpen={() => setOpenFilter(openFilter === 'tipologia' ? null : 'tipologia')}
                  onToggle={(v) => toggleColFilter('tipologia', v)} onSelectAll={(s) => setAllColFilter('tipologia', TIPO_VALUES, s)} />
              </th>
              <th className="scad-inc__c-data">Data documento</th>
              <th className="scad-inc__c-emessoda">
                <ColFilterHeader label="Emesso da" options={EMESSO_VALUES} selected={colFilters.emessoDa}
                  open={openFilter === 'emessoDa'} onToggleOpen={() => setOpenFilter(openFilter === 'emessoDa' ? null : 'emessoDa')}
                  onToggle={(v) => toggleColFilter('emessoDa', v)} onSelectAll={(s) => setAllColFilter('emessoDa', EMESSO_VALUES, s)} />
              </th>
              <th className="scad-inc__c-rif">
                <ColFilterHeader label="Riferimento" options={RIF_VALUES} selected={colFilters.riferimento}
                  open={openFilter === 'riferimento'} onToggleOpen={() => setOpenFilter(openFilter === 'riferimento' ? null : 'riferimento')}
                  onToggle={(v) => toggleColFilter('riferimento', v)} onSelectAll={(s) => setAllColFilter('riferimento', RIF_VALUES, s)} />
              </th>
              <th className="scad-inc__c-ragione">Ragione sociale</th>
              <th className="scad-inc__th-num">Importo</th>
              <th className="scad-inc__th-num">Saldo</th>
              <th className="scad-inc__c-voce">Voce incasso</th>
              <th className="scad-inc__c-stato">
                <ColFilterHeader label="Stato" options={STATO_VALUES} selected={colFilters.stato}
                  open={openFilter === 'stato'} onToggleOpen={() => setOpenFilter(openFilter === 'stato' ? null : 'stato')}
                  onToggle={(v) => toggleColFilter('stato', v)} onSelectAll={(s) => setAllColFilter('stato', STATO_VALUES, s)} />
              </th>
              <th className="scad-inc__th-azioni">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan={12}>
                <EmptyState
                  icon="calendar-check"
                  title="Nessuna scadenza trovata"
                  subtitle="Non ci sono documenti per i criteri selezionati. Modifica la ricerca o i filtri."
                />
              </td></tr>
            ) : pageRows.map((d) => {
              const st = statoDoc(d, today)
              const meta = STATO_META[st]
              const isOpen = expanded === d.id
              const pagato = d.saldo <= 0
              return (
                <React.Fragment key={d.id}>
                  <tr className={`scad-inc__row${st === 'scaduto' ? ' scad-inc__row--scaduto' : st === 'in-scadenza' ? ' scad-inc__row--scadenza' : ''}${isOpen ? ' scad-inc__row--open' : ''}`}>
                    <td className="scad-inc__td-center">
                      <button type="button" className={'scad-inc__chev-btn' + (isOpen ? ' is-open' : '')} aria-label={isOpen ? 'Comprimi' : 'Espandi'} onClick={() => toggleExpanded(d.id)}>
                        <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`} />
                      </button>
                    </td>
                    <td className="scad-inc__td-strong scad-inc__td-nowrap">{d.numero}</td>
                    <td>{TIPO_LABEL[d.tipologia]}</td>
                    <td className="scad-inc__td-nowrap">{fmtDate(d.dataDocumento)}</td>
                    <td><TruncatedText className="scad-inc__cell-clip" text={d.emessoDa} /></td>
                    <td><TruncatedText className="scad-inc__cell-clip" text={d.riferimento} /></td>
                    <td><TruncatedText className="scad-inc__cell-clip" text={d.ragioneSociale} /></td>
                    <td className="scad-inc__td-num">{fmtEur(d.importo)}</td>
                    <td className="scad-inc__td-num">{fmtEur(d.saldo)}</td>
                    <td><TruncatedText className="scad-inc__cell-clip" text={d.voceIncasso} /></td>
                    <td>
                      <span className={`scad-inc__stato-txt scad-inc__stato-txt--${meta.tone}`}>{meta.label}</span>
                    </td>
                    <td className="scad-inc__td-azioni">
                      <div className="scad-inc__actions">
                        <Tooltip text="Dettaglio completo">
                          <button type="button" className="sib-btn sib-btn--icon" aria-label="Dettaglio completo" onClick={() => setDettaglioTarget(d.id)}>
                            <i className="fa-solid fa-eye" />
                          </button>
                        </Tooltip>
                        <Tooltip text="Esporta PDF">
                          <button type="button" className="sib-btn sib-btn--icon" aria-label="Esporta PDF" onClick={() => esportaPdf(d.id)}>
                            <i className="fa-solid fa-file-pdf" />
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="scad-inc__expand-row">
                      <td colSpan={12} className="scad-inc__expand-cell">
                        <div className="scad-inc__panel">
                          <div className="scad-inc__panel-info">
                            <span className="scad-inc__panel-item"><span className="scad-inc__panel-lbl">Scadenza</span>{fmtDate(d.dataScadenza)}</span>
                            <span className={`scad-inc__when scad-inc__when--${st}`}>{etichettaScadenza(d, today)}</span>
                            <span className="scad-inc__panel-item"><span className="scad-inc__panel-lbl">Voce incasso</span>{d.voceIncasso}</span>
                            <span className="scad-inc__panel-item"><span className="scad-inc__panel-lbl">Importo</span>{fmtEur(d.importo)}</span>
                            <span className="scad-inc__panel-item"><span className="scad-inc__panel-lbl">Saldo</span><strong>{pagato ? 'Pagato' : fmtEur(d.saldo)}</strong></span>
                            {d.quietanzato && <span className="scad-inc__panel-flag"><i className="fa-light fa-circle-check" /> Quietanza emessa</span>}
                          </div>
                          <div className="scad-inc__panel-actions">
                            <button type="button" className="sib-btn sib-btn--primary" onClick={() => openQuietanza(d.id)}>
                              <i className="fa-light fa-file-circle-check" /> Quietanza fattura
                            </button>
                            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => openNota(d.id)}>
                              <i className="fa-light fa-file-invoice-dollar" /> Nota di credito
                            </button>
                            {d.sollecitato ? (
                              <span className="scad-inc__sollecitato"><i className="fa-light fa-paper-plane" /> Sollecitato</span>
                            ) : (
                              <button type="button" className="sib-btn sib-btn--secondary" disabled={pagato} onClick={() => richiediSollecito(d.id)}>
                                <i className="fa-light fa-paper-plane" /> Sollecita
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="scad-inc__footer">
        <div className="scad-inc__stats">
          <span>Totale documenti: <strong>{fmtEur(totImporto)}</strong></span>
          <span>Incassato: <strong className="scad-inc__stat-ok">{fmtEur(totIncassato)}</strong></span>
          <span>Da incassare: <strong className="scad-inc__stat-due">{fmtEur(totDaIncassare)}</strong></span>
          {counts.importoScaduto > 0 && (
            <span>di cui scaduto: <strong className="scad-inc__stat-ko">{fmtEur(counts.importoScaduto)}</strong></span>
          )}
        </div>
      </div>

      <div className="scad-inc__pagination">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* Modale: Dettaglio documento (icona occhio) */}
      <Modal
        open={dettaglioTarget != null}
        onClose={() => setDettaglioTarget(null)}
        title="Dettaglio documento"
        size="md"
      >
        {(() => {
          const det = dettaglioTarget != null ? documenti.find((d) => d.id === dettaglioTarget) : undefined
          if (!det) return null
          const st = statoDoc(det, today)
          const meta = STATO_META[st]
          return (
            <>
              <div className="scad-inc__modal-body">
                <div className="scad-inc__det-head">
                  <span className="scad-inc__det-num">{det.numero}</span>
                  <span className={`scad-inc__stato-txt scad-inc__stato-txt--${meta.tone}`}>{meta.label}</span>
                </div>
                <dl className="scad-inc__det-grid">
                  <div><dt>Tipologia</dt><dd>{TIPO_LABEL[det.tipologia]}</dd></div>
                  <div><dt>Data documento</dt><dd>{fmtDate(det.dataDocumento)}</dd></div>
                  <div><dt>Scadenza</dt><dd>{fmtDate(det.dataScadenza)}</dd></div>
                  <div><dt>Emesso da</dt><dd>{det.emessoDa}</dd></div>
                  <div><dt>Riferimento</dt><dd>{det.riferimento !== '-' ? det.riferimento : '—'}</dd></div>
                  <div><dt>Ragione sociale</dt><dd>{det.ragioneSociale !== '-' ? det.ragioneSociale : '—'}</dd></div>
                  <div><dt>Voce incasso</dt><dd>{det.voceIncasso}</dd></div>
                  <div><dt>Importo</dt><dd>{fmtEur(det.importo)}</dd></div>
                  <div><dt>Incassato</dt><dd>{fmtEur(det.importo - det.saldo)}</dd></div>
                  <div><dt>Saldo residuo</dt><dd>{det.saldo > 0 ? fmtEur(det.saldo) : 'Pagato'}</dd></div>
                </dl>
              </div>
              <div className="scad-inc__modal-actions">
                <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setDettaglioTarget(null)}>Chiudi</button>
                <button type="button" className="sib-btn sib-btn--primary" onClick={() => esportaPdf(det.id)}>
                  <i className="fa-light fa-file-pdf" /> Esporta PDF
                </button>
              </div>
            </>
          )
        })()}
      </Modal>

      {/* Modale: Quietanza fattura */}
      <Modal
        open={quietanzaTarget != null}
        onClose={() => setQuietanzaTarget(null)}
        title="Emetti quietanza / fattura"
        size="md"
      >
        {qDoc && (
          <>
            <div className="scad-inc__modal-body">
              <p className="scad-inc__modal-lead">
                Verrà emessa la quietanza/fattura per il documento <strong>{qDoc.numero}</strong>
                {qDoc.saldo > 0 && <> e registrato l'incasso del saldo residuo di <strong>{fmtEur(qDoc.saldo)}</strong></>}.
              </p>
              <dl className="scad-inc__modal-meta">
                <div><dt>Documento</dt><dd>{qDoc.numero} · {TIPO_LABEL[qDoc.tipologia]}</dd></div>
                <div><dt>Riferimento</dt><dd>{qDoc.riferimento !== '-' ? qDoc.riferimento : qDoc.ragioneSociale !== '-' ? qDoc.ragioneSociale : '—'}</dd></div>
                <div><dt>Importo</dt><dd>{fmtEur(qDoc.importo)}</dd></div>
                <div><dt>Saldo residuo</dt><dd>{qDoc.saldo > 0 ? fmtEur(qDoc.saldo) : 'Nessuno (già pagato)'}</dd></div>
                <div><dt>Data emissione</dt><dd>{fmtDate(qData)}</dd></div>
              </dl>
              {qDoc.saldo > 0 && (
                <RadioGroup
                  label="Metodo di incasso"
                  name="q-metodo"
                  options={METODI_INCASSO}
                  value={qMetodo}
                  onChange={(v) => setQMetodo(v as MetodoIncasso)}
                />
              )}
            </div>
            <div className="scad-inc__modal-actions">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setQuietanzaTarget(null)}>Annulla</button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={confermaQuietanza}>
                <i className="fa-light fa-file-circle-check" /> Emetti documento
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Modale: Nota di credito */}
      <Modal
        open={notaTarget != null}
        onClose={() => setNotaTarget(null)}
        title="Emetti nota di credito"
        size="md"
      >
        {ncDoc && (
          <>
            <div className="scad-inc__modal-body">
              <p className="scad-inc__modal-lead">
                Emetti una nota di credito a storno del documento <strong>{ncDoc.numero}</strong>.
              </p>
              <dl className="scad-inc__modal-meta">
                <div><dt>Documento</dt><dd>{ncDoc.numero} · {TIPO_LABEL[ncDoc.tipologia]}</dd></div>
                <div><dt>Ragione sociale</dt><dd>{ncDoc.ragioneSociale !== '-' ? ncDoc.ragioneSociale : ncDoc.riferimento !== '-' ? ncDoc.riferimento : '—'}</dd></div>
                <div><dt>Importo documento</dt><dd>{fmtEur(ncDoc.importo)}</dd></div>
              </dl>
              <SelectField
                label="Causale"
                name="nc-causale"
                value={ncCausale}
                onChange={(e) => setNcCausale(e.target.value)}
                options={CAUSALI_NC.map((c) => ({ value: c, label: c }))}
              />
              <InputField
                label="Importo nota di credito"
                name="nc-importo"
                type="number"
                min={0}
                max={ncDoc.importo}
                value={ncImporto}
                onChange={(e) => setNcImporto(Math.min(ncDoc.importo, Math.max(0, Number(e.target.value) || 0)))}
              />
            </div>
            <div className="scad-inc__modal-actions">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setNotaTarget(null)}>Annulla</button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={confermaNota}>
                <i className="fa-light fa-file-invoice-dollar" /> Emetti nota di credito
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Modale: Sollecito */}
      <Modal
        open={sollecitoTarget != null}
        onClose={() => setSollecitoTarget(null)}
        title="Invia sollecito di pagamento"
        size="md"
      >
        {sollDoc && (() => {
          const g = giorniAllaScadenza(sollDoc.dataScadenza, today)
          const scaduto = g < 0
          const dest = sollDoc.ragioneSociale !== '-' ? sollDoc.ragioneSociale : sollDoc.riferimento !== '-' ? sollDoc.riferimento : 'Gentile cliente'
          return (
            <>
              <div className="scad-inc__modal-body">
                <p className="scad-inc__modal-lead">
                  Verrà inviata la seguente email di sollecito. Controlla i dati prima di inviare.
                </p>
                <div className="scad-inc__mail">
                  <div className="scad-inc__mail-head">
                    <div><span className="scad-inc__mail-lbl">A</span><span className="scad-inc__mail-val">{sollDoc.email}</span></div>
                    <div><span className="scad-inc__mail-lbl">Oggetto</span><span className="scad-inc__mail-val">Promemoria pagamento · Documento {sollDoc.numero}</span></div>
                  </div>
                  <div className="scad-inc__mail-body">
                    <p>{dest},</p>
                    <p>
                      le ricordiamo che per il documento <strong>{sollDoc.numero}</strong> ({TIPO_LABEL[sollDoc.tipologia]})
                      risulta {scaduto ? 'scaduto' : 'in scadenza'} l'incasso relativo a «{sollDoc.voceIncasso}».
                    </p>
                    <ul>
                      <li>Saldo residuo: <strong>{fmtEur(sollDoc.saldo)}</strong></li>
                      <li>Scadenza: <strong>{fmtDate(sollDoc.dataScadenza)}</strong> {scaduto ? `(scaduto da ${Math.abs(g)} g)` : g === 0 ? '(scade oggi)' : `(tra ${g} g)`}</li>
                    </ul>
                    <p>La preghiamo di provvedere al saldo quanto prima. Cordiali saluti.</p>
                  </div>
                </div>
                {sollDoc.sollecitato && (
                  <p className="scad-inc__mail-note"><i className="fa-light fa-circle-info" /> Un sollecito è già stato inviato per questo documento.</p>
                )}
              </div>
              <div className="scad-inc__modal-actions">
                <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setSollecitoTarget(null)}>
                  Annulla
                </button>
                <button type="button" className="sib-btn sib-btn--primary" onClick={confermaSollecito}>
                  <i className="fa-light fa-paper-plane" /> Invia sollecito
                </button>
              </div>
            </>
          )
        })()}
      </Modal>
    </div>
  )
}

// ─── COL FILTER HEADER ──────────────────────────────────────────────────────────

interface ColFilterHeaderProps {
  label: string
  options: string[]
  selected: string[]
  open: boolean
  onToggleOpen: () => void
  onToggle: (value: string) => void
  onSelectAll: (select: boolean) => void
}

function ColFilterHeader({ label, options, selected, open, onToggleOpen, onToggle, onSelectAll }: ColFilterHeaderProps) {
  const allSelected = options.length > 0 && options.every((o) => selected.includes(o))
  const hasFilter = selected.length > 0
  return (
    <div className="scad-inc__colfilter">
      <span>{label}</span>
      <button
        type="button"
        className={'scad-inc__colfilter-btn' + (hasFilter ? ' scad-inc__colfilter-btn--active' : '')}
        onClick={onToggleOpen}
        aria-label={`Filtra per ${label}`}
      >
        <i className="fa-solid fa-filter" />
      </button>
      {open && (
        <>
          <div className="scad-inc__colfilter-overlay" onClick={onToggleOpen} />
          <div className="scad-inc__colfilter-popup" onClick={(e) => e.stopPropagation()}>
            <div className="scad-inc__colfilter-title">{label}</div>
            <label className="scad-inc__colfilter-option">
              <input type="checkbox" className="sib-checkbox" checked={allSelected} onChange={(e) => onSelectAll(e.target.checked)} />
              <span>Tutti</span>
            </label>
            {options.map((opt) => (
              <label key={opt} className="scad-inc__colfilter-option">
                <input type="checkbox" className="sib-checkbox" checked={selected.includes(opt)} onChange={() => onToggle(opt)} />
                <span>{opt === '-' ? '(vuoto)' : opt}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
