import React, { useEffect, useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import EmptyState from '../../../core/components/EmptyState'
import PageHeader from '../../../core/components/PageHeader'
import Pagination from '../../../core/components/Pagination'
import { DateRangeField, RadioGroup } from '../../../core/components/form'
import Modal from '../../../core/components/Modal'
import { toast } from '../../../core/components/Toast/useToast'
import './ScadenzeIncassi.sass'

const PAGE_SIZE = 10
// Giorni entro i quali un pagamento non ricevuto è considerato "in scadenza".
const SOGLIA_SCADENZA = 7

// ─── TIPI ───────────────────────────────────────────────────────────────────────

type MetodoPagamento = 'bonifico' | 'carta' | 'contanti' | 'paypal'
type TipoPagamento = 'caparra' | 'acconto' | 'rata' | 'saldo'
type StatoPagamento = 'pagato' | 'da-pagare'
/** Stato derivato (calcolato rispetto alla data odierna). */
type StatoDerivato = 'pagato' | 'scaduto' | 'in-scadenza' | 'pianificato'
type StatoPrenotazione = 'saldato' | StatoDerivato

interface Pagamento {
  id: number
  descrizione: string
  tipo: TipoPagamento
  dataScadenza: string // ISO yyyy-MM-dd
  importo: number
  stato: StatoPagamento
  dataPagamento?: string
  metodoSaldo?: MetodoPagamento
  sollecitato?: boolean
}

interface Prenotazione {
  id: number
  numero: string
  cliente: string
  email: string
  dataPrenotazione: string // ISO
  checkIn: string // ISO
  checkOut: string // ISO
  metodo: MetodoPagamento
  pagamenti: Pagamento[]
}

const METODO_META: Record<MetodoPagamento, { label: string; icon: string }> = {
  bonifico: { label: 'Bonifico', icon: 'building-columns' },
  carta: { label: 'Carta', icon: 'credit-card' },
  contanti: { label: 'Contanti', icon: 'money-bill-wave' },
  paypal: { label: 'PayPal', icon: 'wallet' },
}

// Metodi con cui si può registrare un incasso dalla modale di conferma.
const METODI_SALDO: { value: MetodoPagamento; label: string }[] = [
  { value: 'bonifico', label: 'Bonifico' },
  { value: 'carta', label: 'Carta di credito' },
  { value: 'contanti', label: 'Contanti' },
]

const STATO_META: Record<StatoPrenotazione, { label: string; tone: 'ok' | 'warn' | 'ko' | 'muted' }> = {
  saldato: { label: 'Saldato', tone: 'ok' },
  pagato: { label: 'Pagato', tone: 'ok' },
  scaduto: { label: 'Scaduto', tone: 'ko' },
  'in-scadenza': { label: 'In scadenza', tone: 'warn' },
  pianificato: { label: 'Pianificato', tone: 'muted' },
}

// ─── DATI MOCK ────────────────────────────────────────────────────────────────

const SEED: Prenotazione[] = [
  { id: 1, numero: '14620', cliente: 'Marco Rossi', email: 'marco.rossi@email.it', dataPrenotazione: '2026-05-02', checkIn: '2026-06-28', checkOut: '2026-07-03', metodo: 'bonifico', pagamenti: [
    { id: 101, descrizione: 'Caparra confirmatoria', tipo: 'caparra', dataScadenza: '2026-05-10', importo: 240, stato: 'pagato', dataPagamento: '2026-05-08' },
    { id: 102, descrizione: 'Saldo soggiorno', tipo: 'saldo', dataScadenza: '2026-06-12', importo: 560, stato: 'da-pagare' },
  ]},
  { id: 2, numero: '14625', cliente: 'Laura Bianchi', email: 'l.bianchi@email.it', dataPrenotazione: '2026-05-18', checkIn: '2026-07-12', checkOut: '2026-07-19', metodo: 'carta', pagamenti: [
    { id: 201, descrizione: 'Acconto 30%', tipo: 'acconto', dataScadenza: '2026-06-20', importo: 360, stato: 'da-pagare' },
    { id: 202, descrizione: 'Saldo soggiorno', tipo: 'saldo', dataScadenza: '2026-07-05', importo: 840, stato: 'da-pagare' },
  ]},
  { id: 3, numero: '14631', cliente: 'Giuseppe Verdi', email: 'g.verdi@email.it', dataPrenotazione: '2026-04-29', checkIn: '2026-08-02', checkOut: '2026-08-09', metodo: 'contanti', pagamenti: [
    { id: 301, descrizione: 'Caparra confirmatoria', tipo: 'caparra', dataScadenza: '2026-05-15', importo: 300, stato: 'pagato', dataPagamento: '2026-05-14' },
    { id: 302, descrizione: '1ª rata', tipo: 'rata', dataScadenza: '2026-06-22', importo: 450, stato: 'da-pagare' },
    { id: 303, descrizione: 'Saldo soggiorno', tipo: 'saldo', dataScadenza: '2026-07-25', importo: 450, stato: 'da-pagare' },
  ]},
  { id: 4, numero: '14640', cliente: 'Anna Esposito', email: 'anna.esposito@email.it', dataPrenotazione: '2026-03-11', checkIn: '2026-06-25', checkOut: '2026-06-28', metodo: 'bonifico', pagamenti: [
    { id: 401, descrizione: 'Caparra confirmatoria', tipo: 'caparra', dataScadenza: '2026-03-20', importo: 180, stato: 'pagato', dataPagamento: '2026-03-19' },
    { id: 402, descrizione: 'Saldo soggiorno', tipo: 'saldo', dataScadenza: '2026-06-01', importo: 420, stato: 'pagato', dataPagamento: '2026-05-30' },
  ]},
  { id: 5, numero: '14644', cliente: 'Luca Romano', email: 'luca.romano@email.it', dataPrenotazione: '2026-05-30', checkIn: '2026-09-14', checkOut: '2026-09-21', metodo: 'paypal', pagamenti: [
    { id: 501, descrizione: 'Caparra confirmatoria', tipo: 'caparra', dataScadenza: '2026-06-08', importo: 280, stato: 'pagato', dataPagamento: '2026-06-07' },
    { id: 502, descrizione: 'Saldo soggiorno', tipo: 'saldo', dataScadenza: '2026-09-01', importo: 700, stato: 'da-pagare' },
  ]},
  { id: 6, numero: '14650', cliente: 'Sara Greco', email: 'sara.greco@email.it', dataPrenotazione: '2026-05-05', checkIn: '2026-07-20', checkOut: '2026-07-27', metodo: 'bonifico', pagamenti: [
    { id: 601, descrizione: 'Caparra confirmatoria', tipo: 'caparra', dataScadenza: '2026-06-10', importo: 320, stato: 'da-pagare' },
    { id: 602, descrizione: 'Saldo soggiorno', tipo: 'saldo', dataScadenza: '2026-07-13', importo: 740, stato: 'da-pagare' },
  ]},
  { id: 7, numero: '14655', cliente: 'Davide Conti', email: 'd.conti@email.it', dataPrenotazione: '2026-06-01', checkIn: '2026-08-16', checkOut: '2026-08-23', metodo: 'carta', pagamenti: [
    { id: 701, descrizione: 'Caparra confirmatoria', tipo: 'caparra', dataScadenza: '2026-06-10', importo: 260, stato: 'pagato', dataPagamento: '2026-06-09' },
    { id: 702, descrizione: '1ª rata', tipo: 'rata', dataScadenza: '2026-07-05', importo: 380, stato: 'da-pagare' },
    { id: 703, descrizione: 'Saldo soggiorno', tipo: 'saldo', dataScadenza: '2026-08-05', importo: 380, stato: 'da-pagare' },
  ]},
  { id: 8, numero: '14660', cliente: 'Giulia Ferrari', email: 'giulia.ferrari@email.it', dataPrenotazione: '2026-05-22', checkIn: '2026-07-04', checkOut: '2026-07-08', metodo: 'contanti', pagamenti: [
    { id: 801, descrizione: 'Caparra confirmatoria', tipo: 'caparra', dataScadenza: '2026-05-28', importo: 200, stato: 'pagato', dataPagamento: '2026-05-27' },
    { id: 802, descrizione: 'Saldo soggiorno', tipo: 'saldo', dataScadenza: '2026-06-25', importo: 500, stato: 'da-pagare' },
  ]},
  { id: 9, numero: '14668', cliente: 'Paolo Marino', email: 'paolo.marino@email.it', dataPrenotazione: '2026-04-15', checkIn: '2026-07-30', checkOut: '2026-08-04', metodo: 'bonifico', pagamenti: [
    { id: 901, descrizione: 'Caparra confirmatoria', tipo: 'caparra', dataScadenza: '2026-06-05', importo: 350, stato: 'da-pagare', sollecitato: true },
    { id: 902, descrizione: 'Saldo soggiorno', tipo: 'saldo', dataScadenza: '2026-07-28', importo: 810, stato: 'da-pagare' },
  ]},
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

function statoPagamento(p: Pagamento, today: Date): StatoDerivato {
  if (p.stato === 'pagato') return 'pagato'
  const g = giorniAllaScadenza(p.dataScadenza, today)
  if (g < 0) return 'scaduto'
  if (g <= SOGLIA_SCADENZA) return 'in-scadenza'
  return 'pianificato'
}

function statoPrenotazione(p: Prenotazione, today: Date): StatoPrenotazione {
  const nonPagati = p.pagamenti.filter((x) => x.stato !== 'pagato')
  if (nonPagati.length === 0) return 'saldato'
  const stati = nonPagati.map((x) => statoPagamento(x, today))
  if (stati.includes('scaduto')) return 'scaduto'
  if (stati.includes('in-scadenza')) return 'in-scadenza'
  return 'pianificato'
}

/** Etichetta relativa alla scadenza (es. "Scaduto da 6 g", "Tra 3 g"). */
function etichettaScadenza(p: Pagamento, today: Date): string {
  if (p.stato === 'pagato') return p.dataPagamento ? `Saldato il ${fmtDate(p.dataPagamento)}` : 'Saldato'
  const g = giorniAllaScadenza(p.dataScadenza, today)
  if (g < 0) return `Scaduto da ${Math.abs(g)} g`
  if (g === 0) return 'Scade oggi'
  return `Tra ${g} g`
}

const acconto = (p: Prenotazione) => p.pagamenti.find((x) => x.tipo === 'caparra' || x.tipo === 'acconto')
const saldoResiduo = (p: Prenotazione) =>
  p.pagamenti.filter((x) => x.stato !== 'pagato').reduce((s, x) => s + x.importo, 0)

// ─── COMPONENTE ─────────────────────────────────────────────────────────────────

type FiltroStato = 'tutti' | 'scaduto' | 'in-scadenza' | 'saldato'

export default function ScadenzeIncassi({ navigate }: { navigate: (p: string) => void }) {
  const today = useMemo(() => new Date(), [])
  const [prenotazioni, setPrenotazioni] = useState<Prenotazione[]>(SEED)
  const [search, setSearch] = useState('')
  const [scadDa, setScadDa] = useState('')
  const [scadA, setScadA] = useState('')
  const [filtro, setFiltro] = useState<FiltroStato>('tutti')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  // Target della modale "Registra incasso": prenotazione + pagamento da saldare.
  const [saldoTarget, setSaldoTarget] = useState<{ prenId: number; pagId: number } | null>(null)
  const [metodoSaldo, setMetodoSaldo] = useState<MetodoPagamento>('bonifico')
  // Target della modale "Invia sollecito": prenotazione + pagamento da sollecitare.
  const [sollecitoTarget, setSollecitoTarget] = useState<{ prenId: number; pagId: number } | null>(null)

  // Espande di default le prenotazioni con pagamenti scaduti.
  useEffect(() => {
    setExpanded(new Set(
      SEED.filter((p) => statoPrenotazione(p, today) === 'scaduto').map((p) => p.id),
    ))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleExpanded = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })

  // ── Azioni ──────────────────────────────────────────────────────────────
  // Apre la modale di conferma: pre-seleziona il metodo preferito della prenotazione.
  const richiediSaldo = (prenId: number, pagId: number) => {
    const pren = prenotazioni.find((p) => p.id === prenId)
    const pag = pren?.pagamenti.find((x) => x.id === pagId)
    if (!pren || !pag || pag.stato === 'pagato') return
    const preferito = METODI_SALDO.some((m) => m.value === pren.metodo) ? pren.metodo : 'bonifico'
    setMetodoSaldo(preferito)
    setSaldoTarget({ prenId, pagId })
  }

  const saldoPren = saldoTarget ? prenotazioni.find((p) => p.id === saldoTarget.prenId) : undefined
  const saldoPag = saldoPren?.pagamenti.find((x) => x.id === saldoTarget?.pagId)

  // Registra l'incasso col metodo scelto nella modale.
  const confermaSaldo = () => {
    if (!saldoTarget || !saldoPren || !saldoPag) return
    const { prenId, pagId } = saldoTarget
    const oggi = new Date().toISOString().slice(0, 10)
    setPrenotazioni((prev) =>
      prev.map((p) =>
        p.id !== prenId ? p : {
          ...p,
          pagamenti: p.pagamenti.map((x) =>
            x.id === pagId ? { ...x, stato: 'pagato' as StatoPagamento, dataPagamento: oggi, metodoSaldo } : x),
        }),
    )
    const metodoLabel = METODI_SALDO.find((m) => m.value === metodoSaldo)?.label ?? ''
    toast.success(`Incasso di ${fmtEur(saldoPag.importo)} registrato per ${saldoPren.cliente} (${metodoLabel}).`, 'Pagamento saldato')
    setSaldoTarget(null)
  }

  // Apre la modale con l'anteprima della mail di sollecito.
  const richiediSollecito = (prenId: number, pagId: number) => {
    const pren = prenotazioni.find((p) => p.id === prenId)
    const pag = pren?.pagamenti.find((x) => x.id === pagId)
    if (!pren || !pag || pag.stato === 'pagato') return
    setSollecitoTarget({ prenId, pagId })
  }

  const sollPren = sollecitoTarget ? prenotazioni.find((p) => p.id === sollecitoTarget.prenId) : undefined
  const sollPag = sollPren?.pagamenti.find((x) => x.id === sollecitoTarget?.pagId)

  const confermaSollecito = () => {
    if (!sollecitoTarget || !sollPren || !sollPag) return
    const { prenId, pagId } = sollecitoTarget
    setPrenotazioni((prev) =>
      prev.map((p) =>
        p.id !== prenId ? p : {
          ...p,
          pagamenti: p.pagamenti.map((x) => (x.id === pagId ? { ...x, sollecitato: true } : x)),
        }),
    )
    toast.success(`Sollecito di pagamento inviato a ${sollPren.cliente} (${sollPren.email}).`, 'Sollecito inviato')
    setSollecitoTarget(null)
  }

  // ── Conteggi per i filtri / banner ────────────────────────────────────────
  const counts = useMemo(() => {
    let scaduti = 0, inScadenza = 0, saldati = 0, importoScaduto = 0, importoInScadenza = 0
    prenotazioni.forEach((p) => {
      const st = statoPrenotazione(p, today)
      if (st === 'scaduto') scaduti++
      else if (st === 'in-scadenza') inScadenza++
      else if (st === 'saldato') saldati++
      p.pagamenti.forEach((x) => {
        const sx = statoPagamento(x, today)
        if (sx === 'scaduto') importoScaduto += x.importo
        else if (sx === 'in-scadenza') importoInScadenza += x.importo
      })
    })
    return { scaduti, inScadenza, saldati, importoScaduto, importoInScadenza }
  }, [prenotazioni, today])

  // ── Filtro + ricerca ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return prenotazioni.filter((p) => {
      if (q && !(p.numero.includes(q) || p.cliente.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)))
        return false
      if (filtro !== 'tutti' && statoPrenotazione(p, today) !== filtro) return false
      if (scadDa || scadA) {
        // mantieni le prenotazioni con almeno una scadenza nell'intervallo
        const inRange = p.pagamenti.some((x) =>
          (!scadDa || x.dataScadenza >= scadDa) && (!scadA || x.dataScadenza <= scadA))
        if (!inRange) return false
      }
      return true
    })
  }, [prenotazioni, search, filtro, scadDa, scadA, today])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [search, filtro, scadDa, scadA])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])
  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  // ── Stats footer ──────────────────────────────────────────────────────────
  const tutti = prenotazioni.flatMap((p) => p.pagamenti)
  const totPianificato = tutti.reduce((s, x) => s + x.importo, 0)
  const totIncassato = tutti.filter((x) => x.stato === 'pagato').reduce((s, x) => s + x.importo, 0)
  const totDaIncassare = totPianificato - totIncassato

  const CHIPS: { key: FiltroStato; label: string; count?: number }[] = [
    { key: 'tutti', label: 'Tutte', count: prenotazioni.length },
    { key: 'scaduto', label: 'Scaduti', count: counts.scaduti },
    { key: 'in-scadenza', label: 'In scadenza', count: counts.inScadenza },
    { key: 'saldato', label: 'Saldati', count: counts.saldati },
  ]

  return (
    <div className="scad-inc">
      <BtnBack />
      <PageHeader
        title="Scadenze incassi"
        subtitle="Monitora acconti, rate e saldi delle prenotazioni: evidenzia i pagamenti in scadenza o scaduti, invia solleciti e registra gli incassi"
      />

      {(counts.scaduti > 0 || counts.inScadenza > 0) && (
        <div className="scad-inc__alert">
          <i className="fa-duotone fa-triangle-exclamation" />
          <span>
            {counts.scaduti > 0 && (
              <><strong>{counts.scaduti}</strong> {counts.scaduti === 1 ? 'prenotazione' : 'prenotazioni'} con pagamenti scaduti ({fmtEur(counts.importoScaduto)})</>
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
              placeholder="N. prenotazione, cliente o email"
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
      </div>

      <div className="scad-inc__chips">
        {CHIPS.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`scad-inc__chip${filtro === c.key ? ' scad-inc__chip--active' : ''}${c.key === 'scaduto' && (c.count ?? 0) > 0 ? ' scad-inc__chip--alarm' : ''}`}
            onClick={() => setFiltro(c.key)}
          >
            {c.label}
            {c.count != null && <span className="scad-inc__chip-count">{c.count}</span>}
          </button>
        ))}
      </div>

      <div className="sib-table-wrap">
        <table className="sib-table scad-inc__table">
          <thead>
            <tr>
              <th className="scad-inc__th-chev" />
              <th>N. prenotazione</th>
              <th>Cliente</th>
              <th>Data prenotazione</th>
              <th>Soggiorno</th>
              <th>Metodo</th>
              <th className="scad-inc__th-num">Acconto / caparra</th>
              <th className="scad-inc__th-num">Saldo residuo</th>
              <th>Stato</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan={9}>
                <EmptyState
                  icon="calendar-check"
                  title="Nessuna scadenza trovata"
                  subtitle="Non ci sono prenotazioni per i criteri selezionati. Modifica la ricerca o i filtri."
                />
              </td></tr>
            ) : pageRows.map((p) => {
              const st = statoPrenotazione(p, today)
              const meta = STATO_META[st]
              const dep = acconto(p)
              const residuo = saldoResiduo(p)
              const metodo = METODO_META[p.metodo]
              const isOpen = expanded.has(p.id)
              return (
                <React.Fragment key={p.id}>
                  <tr className={`scad-inc__row${st === 'scaduto' ? ' scad-inc__row--scaduto' : st === 'in-scadenza' ? ' scad-inc__row--scadenza' : ''}`}>
                    <td className="scad-inc__td-center">
                      <button type="button" className="scad-inc__chev-btn" aria-label={isOpen ? 'Comprimi' : 'Espandi'} onClick={() => toggleExpanded(p.id)}>
                        <i className={`fa-light fa-chevron-${isOpen ? 'up' : 'down'}`} />
                      </button>
                    </td>
                    <td className="scad-inc__td-strong">{p.numero}</td>
                    <td>{p.cliente}</td>
                    <td>{fmtDate(p.dataPrenotazione)}</td>
                    <td className="scad-inc__td-nowrap">{fmtDate(p.checkIn)} → {fmtDate(p.checkOut)}</td>
                    <td>
                      <span className="scad-inc__pay">
                        <i className={`fa-light fa-${metodo.icon}`} /> {metodo.label}
                      </span>
                    </td>
                    <td className="scad-inc__td-num">{dep ? fmtEur(dep.importo) : '—'}</td>
                    <td className="scad-inc__td-num scad-inc__td-residuo">{residuo > 0 ? fmtEur(residuo) : '—'}</td>
                    <td>
                      <span className={`scad-inc__status scad-inc__status--${meta.tone}`}>
                        <i className={`fa-solid fa-${st === 'saldato' ? 'circle-check' : st === 'scaduto' ? 'circle-exclamation' : st === 'in-scadenza' ? 'clock' : 'calendar'}`} />
                        {meta.label}
                      </span>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="scad-inc__expand-row">
                      <td colSpan={9} className="scad-inc__expand-cell">
                        <table className="scad-inc__sub-table">
                          <thead>
                            <tr>
                              <th>Pagamento</th>
                              <th>Scadenza</th>
                              <th className="scad-inc__th-num">Importo</th>
                              <th>Stato</th>
                              <th className="scad-inc__th-actions">Azioni</th>
                            </tr>
                          </thead>
                          <tbody>
                            {p.pagamenti.map((x) => {
                              const sx = statoPagamento(x, today)
                              const sm = STATO_META[sx]
                              const pagabile = x.stato !== 'pagato'
                              return (
                                <tr
                                  key={x.id}
                                  className={`scad-inc__sub-row${pagabile ? ' scad-inc__sub-row--pagabile' : ''}`}
                                  onClick={pagabile ? () => richiediSaldo(p.id, x.id) : undefined}
                                  title={pagabile ? 'Clicca per registrare l’incasso' : undefined}
                                >
                                  <td>
                                    <span className="scad-inc__pag-desc">{x.descrizione}</span>
                                    <span className="scad-inc__pag-tipo">{x.tipo}</span>
                                  </td>
                                  <td className="scad-inc__td-nowrap">
                                    {fmtDate(x.dataScadenza)}
                                    <span className={`scad-inc__when scad-inc__when--${sx}`}>{etichettaScadenza(x, today)}</span>
                                  </td>
                                  <td className="scad-inc__td-num scad-inc__td-strong">{fmtEur(x.importo)}</td>
                                  <td>
                                    <span className={`scad-inc__status scad-inc__status--${sm.tone}`}>
                                      <i className={`fa-solid fa-${sx === 'pagato' ? 'circle-check' : sx === 'scaduto' ? 'circle-exclamation' : sx === 'in-scadenza' ? 'clock' : 'calendar'}`} />
                                      {sm.label}
                                    </span>
                                  </td>
                                  <td className="scad-inc__td-actions" onClick={(e) => e.stopPropagation()}>
                                    {pagabile ? (
                                      <>
                                        <button type="button" className="sib-btn sib-btn--primary sib-btn--sm" onClick={() => richiediSaldo(p.id, x.id)}>
                                          <i className="fa-light fa-circle-check" /> Salda
                                        </button>
                                        {(sx === 'scaduto' || sx === 'in-scadenza') && (
                                          x.sollecitato ? (
                                            <span className="scad-inc__sollecitato"><i className="fa-light fa-paper-plane" /> Sollecitato</span>
                                          ) : (
                                            <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={() => richiediSollecito(p.id, x.id)}>
                                              <i className="fa-light fa-paper-plane" /> Sollecita
                                            </button>
                                          )
                                        )}
                                      </>
                                    ) : (
                                      <span className="scad-inc__saldato-il">{x.dataPagamento ? `Saldato il ${fmtDate(x.dataPagamento)}` : 'Saldato'}</span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
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
          <span>Pianificato: <strong>{fmtEur(totPianificato)}</strong></span>
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

      <Modal
        open={saldoTarget != null}
        onClose={() => setSaldoTarget(null)}
        title="Registra incasso"
        size="md"
      >
        {saldoPren && saldoPag && (
          <>
            <div className="scad-inc__modal-body">
              <p className="scad-inc__modal-lead">
                Confermi di aver incassato <strong>{fmtEur(saldoPag.importo)}</strong> per <em>{saldoPag.descrizione}</em>?
              </p>
              <dl className="scad-inc__modal-meta">
                <div><dt>Prenotazione</dt><dd>{saldoPren.numero}</dd></div>
                <div><dt>Cliente</dt><dd>{saldoPren.cliente}</dd></div>
                <div><dt>Scadenza</dt><dd>{fmtDate(saldoPag.dataScadenza)}</dd></div>
              </dl>
              <RadioGroup
                label="Come è stato saldato?"
                name="metodo-saldo"
                options={METODI_SALDO}
                value={metodoSaldo}
                onChange={(v) => setMetodoSaldo(v as MetodoPagamento)}
              />
            </div>
            <div className="scad-inc__modal-actions">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setSaldoTarget(null)}>
                Annulla
              </button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={confermaSaldo}>
                <i className="fa-light fa-circle-check" /> Registra incasso
              </button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={sollecitoTarget != null}
        onClose={() => setSollecitoTarget(null)}
        title="Invia sollecito di pagamento"
        size="md"
      >
        {sollPren && sollPag && (() => {
          const g = giorniAllaScadenza(sollPag.dataScadenza, today)
          const scaduto = g < 0
          return (
            <>
              <div className="scad-inc__modal-body">
                <p className="scad-inc__modal-lead">
                  Verrà inviata la seguente email di sollecito. Controlla i dati prima di inviare.
                </p>
                <div className="scad-inc__mail">
                  <div className="scad-inc__mail-head">
                    <div><span className="scad-inc__mail-lbl">A</span><span className="scad-inc__mail-val">{sollPren.email}</span></div>
                    <div><span className="scad-inc__mail-lbl">Oggetto</span><span className="scad-inc__mail-val">Promemoria pagamento · Prenotazione {sollPren.numero}</span></div>
                  </div>
                  <div className="scad-inc__mail-body">
                    <p>Gentile {sollPren.cliente},</p>
                    <p>
                      le ricordiamo che per la prenotazione <strong>n. {sollPren.numero}</strong> (soggiorno {fmtDate(sollPren.checkIn)} → {fmtDate(sollPren.checkOut)})
                      risulta {scaduto ? 'scaduto' : 'in scadenza'} il pagamento «{sollPag.descrizione}».
                    </p>
                    <ul>
                      <li>Importo: <strong>{fmtEur(sollPag.importo)}</strong></li>
                      <li>Scadenza: <strong>{fmtDate(sollPag.dataScadenza)}</strong> {scaduto ? `(scaduto da ${Math.abs(g)} g)` : g === 0 ? '(scade oggi)' : `(tra ${g} g)`}</li>
                      <li>Metodo di pagamento: <strong>{METODO_META[sollPren.metodo].label}</strong></li>
                    </ul>
                    <p>La preghiamo di provvedere al saldo quanto prima. Cordiali saluti.</p>
                  </div>
                </div>
                {sollPag.sollecitato && (
                  <p className="scad-inc__mail-note"><i className="fa-light fa-circle-info" /> Un sollecito è già stato inviato per questo pagamento.</p>
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
