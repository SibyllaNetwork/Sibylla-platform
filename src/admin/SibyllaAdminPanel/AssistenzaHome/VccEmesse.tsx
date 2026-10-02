import React, { useMemo, useState, useEffect } from 'react'
import Ico from '../../../core/icons/Ico'
import Pagination from '../../../core/components/Pagination'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import ThLabel from '../../../core/components/ThLabel'
import VccCard from '../../../core/components/VccCard'
import { SelectField, DateRangeField } from '../../../core/components/form'
import { useColFilters } from '../../../core/components/ColFilters'
import { toast } from '../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../store/useConfirmStore'
import {
  useVccEmesseStore, useVccRows, deltaOf, statoLavorazioneOf, isDaMonitorare, isScaduta,
  todayIso, STATUS_PRENOTAZIONE, STATI_LAVORAZIONE, AZIENDE_VCC, type VccEmessa,
} from '../../../store/useVccEmesseStore'
import './VccEmesse.sass'

interface Props { navigate: (p: string) => void }

// ─── GESTIONE VCC EMESSE ─────────────────────────────────────────────────────
// Monitoraggio delle VCC incassate dalle strutture PRIMA della data di check-in
// (requisito in docs/Requisito Gestione VCC Emesse.docx). Stessa impostazione
// grafica di Amministrazione → Commissioni.

const PAGE_SIZE = 10

const VISTA_MONITORARE = 'monitorare'
const VISTA_TUTTE = 'tutte'

// Valori dei filtri a imbuto delle colonne senza un dominio "naturale".
const DATA_FUTURA = 'Da oggi in poi'
const DATA_PASSATA = 'Passata'
const AZ_GENERA = 'Genera VCC integrativa'
const AZ_RISOLVI = 'Conferma risoluzione'
const AZ_NESSUNA = 'Nessuna azione'

// Formato manuale: in it-IT toLocaleString non raggruppa le migliaia sotto
// le 5 cifre (1200,00 invece di 1.200,00).
const eur = (n: number) => {
  const [int, dec] = Math.abs(n).toFixed(2).split('.')
  return `${n < 0 ? '-' : ''}${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec} €`
}
const eurDelta = (n: number) => (n > 0 ? `+${eur(n)}` : eur(n))
const fmtData = (iso: string) => iso.split('-').reverse().join('/')

/** Azione attesa sulla riga (guida il filtro della colonna Azioni). */
function azioneOf(v: VccEmessa) {
  const d = deltaOf(v)
  if (d === 0 || v.risolto) return AZ_NESSUNA
  return d > 0 && !v.integrativa ? AZ_GENERA : AZ_RISOLVI
}

// Monogramma della struttura nella modale della carta (5 tinte deterministiche).
function logoOf(nome: string) {
  const parole = nome.trim().split(/\s+/)
  const sigla = (parole.length > 1 ? parole[0][0] + parole[1][0] : nome.slice(0, 2)).toUpperCase()
  let h = 0
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0
  return { sigla, tinta: (h % 5) + 1 }
}

/** Carta mostrata in modale: quella incassata o l'integrativa del delta. */
interface CardView { row: VccEmessa; integrativa: boolean }

export default function VccEmesse({ navigate }: Props) {
  const all = useVccRows()
  const generaIntegrativa = useVccEmesseStore(s => s.generaIntegrativa)
  const risolvi = useVccEmesseStore(s => s.risolvi)
  const confirm = useConfirmStore(s => s.confirm)

  const [vista, setVista] = useState(VISTA_MONITORARE)
  const [azienda, setAzienda] = useState('')
  // Periodo sulla Data in (aaaa-mm-gg): vuoto = nessun limite.
  const [dataDa, setDataDa] = useState('')
  const [dataA, setDataA] = useState('')
  const [page, setPage] = useState(1)
  const [card, setCard] = useState<CardView | null>(null)
  const cf = useColFilters()
  const oggi = todayIso()

  // Righe con i campi derivati già calcolati: servono a filtri e ordinamento
  // (sortRows ordina per chiave della riga).
  const rows = useMemo(() => all
    .filter(v => vista === VISTA_TUTTE || isDaMonitorare(v, oggi))
    .filter(v => !azienda || v.azienda === azienda)
    .filter(v => (!dataDa || v.dataIn >= dataDa) && (!dataA || v.dataIn <= dataA))
    .map(v => ({
      ...v,
      delta: deltaOf(v),
      stato: statoLavorazioneOf(v),
      azione: azioneOf(v),
      scaduta: isScaduta(v, oggi),
    })), [all, vista, azienda, dataDa, dataA, oggi])

  const strutture = useMemo(() => Array.from(new Set(all
    .filter(v => !azienda || v.azienda === azienda)
    .map(v => v.struttura))).sort(), [all, azienda])
  const scaduteTot = useMemo(() => all.filter(v => isScaduta(v, oggi)).length, [all, oggi])

  const filtered = useMemo(() => rows.filter(r =>
    cf.matchMulti(r.struttura, 'struttura') &&
    cf.matchText(r.bookingId, 'bookingId') &&
    cf.matchText(eur(r.importoStruttura), 'importoStruttura') &&
    cf.matchMulti(r.status, 'status') &&
    cf.matchMulti(r.dataIn >= oggi ? DATA_FUTURA : DATA_PASSATA, 'dataIn') &&
    cf.matchText(eur(r.importoDataIn), 'importoDataIn') &&
    cf.matchText(eurDelta(r.delta), 'delta') &&
    cf.matchMulti(r.stato, 'stato') &&
    cf.matchMulti(r.azione, 'azione')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [rows, cf.text, cf.multi, oggi])

  // Ordinamento di default: Data in crescente (finché l'utente non ne sceglie un altro).
  const sorted = useMemo(() => cf.sort
    ? cf.sortRows(filtered)
    : [...filtered].sort((a, b) => a.dataIn.localeCompare(b.dataIn)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [filtered, cf.sort])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [cf.text, cf.multi, vista, azienda, dataDa, dataA])
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Flusso modifica positiva: VCC integrativa pari al delta. Da qui in avanti
  // la carta lascia il posto all'occhio per consultarla.
  const genera = (r: VccEmessa) => {
    generaIntegrativa(r.id)
    toast.success(`VCC integrativa di ${eur(deltaOf(r))} generata per ${r.bookingId} (${r.struttura}).`, 'VCC creata')
  }

  // Conferma della risoluzione (entrambi i flussi): registra "Risolto" e
  // aggiorna i dati collegati (Wallet Sibylla, Commissioni, Crea Deposito,
  // Prenotazioni IDS) — l'aggiornamento è a carico del back end.
  const conferma = async (r: VccEmessa) => {
    const d = deltaOf(r)
    const ok = await confirm({
      title: 'Conferma risoluzione',
      message: d > 0
        ? `Confermi la risoluzione della prenotazione ${r.bookingId} (${r.struttura})? La VCC integrativa di ${eur(d)} verrà registrata e saranno aggiornati Wallet Sibylla, Commissioni, Crea Deposito e Prenotazioni IDS.`
        : `Confermi di aver ricevuto dalla struttura ${r.struttura} il bonifico di ${eur(Math.abs(d))} sul conto Pliant di Sibylla per la prenotazione ${r.bookingId}? Saranno aggiornati Wallet Sibylla, Commissioni, Crea Deposito e Prenotazioni IDS.`,
      confirmLabel: 'Conferma',
      cancelLabel: 'Annulla',
      danger: false,
    })
    if (!ok) return
    risolvi(r.id)
    toast.success(`Lavorazione della prenotazione ${r.bookingId} risolta.`, 'Risolto')
  }

  // Esporta le righe filtrate in un file .xls (apribile da Excel).
  const exportExcel = () => {
    const cols = ['Azienda', 'Struttura', 'Booking ID', 'Importo struttura', 'VCC integrativa', 'Status prenotazione', 'Data in', 'Importo data in', 'Delta importi', 'Stato lavorazione']
    const head = cols.map(c => `<th>${c}</th>`).join('')
    const body = sorted.map(r =>
      `<tr><td>${r.azienda}</td><td>${r.struttura}</td><td>${r.bookingId}</td><td>${eur(r.importoStruttura)}</td><td>${r.integrativa ? 'Sì' : 'No'}</td><td>${r.status}</td><td>${fmtData(r.dataIn)}</td><td>${eur(r.importoDataIn)}</td><td>${eurDelta(r.delta)}</td><td>${r.stato}</td></tr>`
    ).join('')
    const html = `<html><head><meta charset="utf-8"></head><body><table border="1" cellspacing="0" cellpadding="4"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`
    const url = URL.createObjectURL(new Blob([html], { type: 'application/vnd.ms-excel' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'vcc-emesse.xls'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast.success(`${sorted.length} righe esportate in Excel.`, 'Esportazione completata')
  }

  const actBtn = (tip: string, ico: string, onClick: () => void) => (
    <Tooltip text={tip}>
      <button type="button" className="vcce__act" onClick={onClick} aria-label={tip}>
        <Ico n={ico} w="solid" s={16} c="var(--color-primary)" />
      </button>
    </Tooltip>
  )

  const renderAzioni = (r: VccEmessa & { delta: number }) => {
    if (r.delta === 0) return <span className="vcce__dash">-</span>
    if (r.risolto) {
      return r.integrativa
        ? actBtn('Visualizza VCC integrativa', 'eye', () => setCard({ row: r, integrativa: true }))
        : <span className="vcce__dash">-</span>
    }
    if (r.delta > 0 && !r.integrativa) {
      return actBtn(`Genera VCC integrativa (${eur(r.delta)})`, 'credit-card', () => genera(r))
    }
    return (
      <span className="vcce__acts">
        {r.integrativa && actBtn('Visualizza VCC integrativa', 'eye', () => setCard({ row: r, integrativa: true }))}
        {actBtn('Conferma risoluzione', 'circle-check', () => conferma(r))}
      </span>
    )
  }

  const cardImporto = card ? (card.integrativa ? deltaOf(card.row) : card.row.importoStruttura) : 0

  return (
    <div className="vcce">
      <button type="button" className="vcce__back" onClick={() => navigate('sibylla-admin')}>
        <Ico n="back" s={13} c="var(--color-primary)" /> Indietro
      </button>
      <div className="vcce__head">
        <h1 className="vcce__title">VCC emesse</h1>
        <p className="vcce__sub">Monitora le VCC incassate dalle strutture prima del check-in e lavora i disallineamenti di importo.</p>
      </div>

      <div className="vcce__toolbar">
        <SelectField
          name="vista"
          label="Vista"
          className="vcce__field"
          value={vista}
          onChange={e => setVista(e.target.value)}
          options={[
            { value: VISTA_MONITORARE, label: 'Da monitorare' },
            { value: VISTA_TUTTE, label: 'Tutte (incluse passate e risolte)' },
          ]}
        />
        <SelectField
          name="azienda"
          label="Azienda"
          className="vcce__field vcce__field--azienda"
          value={azienda}
          onChange={e => setAzienda(e.target.value)}
          options={[{ value: '', label: 'Tutte le aziende' }, ...AZIENDE_VCC.map(a => ({ value: a, label: a }))]}
        />
        <DateRangeField
          label="Data in"
          nameFrom="data-in-da"
          nameTo="data-in-a"
          className="vcce__field vcce__field--periodo"
          valueFrom={dataDa}
          valueTo={dataA}
          onChangeFrom={e => setDataDa(e.target.value)}
          onChangeTo={e => setDataA(e.target.value)}
        />
        {scaduteTot > 0 && (
          <div className="vcce__alert-wrap">
          <Tooltip text="Data in passata, delta importi diverso da zero e lavorazione non risolta">
            <span className="vcce__alert">
              <Ico n="alert" w="solid" s={13} c="currentColor" />
              <span className="vcce__alert-full">{scaduteTot === 1 ? '1 casistica scaduta da lavorare' : `${scaduteTot} casistiche scadute da lavorare`}</span>
              <span className="vcce__alert-short">{scaduteTot === 1 ? '1 scaduta' : `${scaduteTot} scadute`}</span>
            </span>
          </Tooltip>
          </div>
        )}
        {/* Export in alto a destra: il wrapper prende il margin-left auto e
            allinea il pulsante al bordo destro della tabella (sopra Azioni). */}
        <div className="vcce__push">
          <Tooltip text="Esporta in Excel">
            <button type="button" className="vcce__icon-btn" onClick={exportExcel} aria-label="Esporta in Excel">
              <Ico n="excel" w="regular" s={16} c="#fff" />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="sib-table-wrap vcce__wrap">
        <table className="sib-table vcce__table">
          {/* Larghezze in percentuale + table-layout fixed: la tabella si adatta
              sempre allo spazio disponibile, senza mai scrollare in orizzontale. */}
          <colgroup>
            <col className="vcce__col-struttura" />
            <col className="vcce__col-booking" />
            <col className="vcce__col-importo" />
            <col className="vcce__col-vcc" />
            <col className="vcce__col-status" />
            <col className="vcce__col-data" />
            <col className="vcce__col-importo" />
            <col className="vcce__col-delta" />
            <col className="vcce__col-stato" />
            <col className="vcce__col-azioni" />
          </colgroup>
          <thead>
            <tr>
              <th><span className="sib-colf-head"><ThLabel full="Struttura" />{cf.th('struttura', 'struttura', { options: strutture })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Booking ID" />{cf.th('bookingId', 'booking ID', { search: true })}</span></th>
              <th className="vcce__r"><span className="sib-colf-head"><ThLabel full="Importo struttura" short="Imp. strutt." />{cf.th('importoStruttura', 'importo struttura', { search: true, sort: true })}</span></th>
              <th className="vcce__c"><ThLabel full="VCC" /></th>
              <th><span className="sib-colf-head"><ThLabel full="Status prenotazione" short="Status pren." />{cf.th('status', 'status prenotazione', { options: STATUS_PRENOTAZIONE })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Data in" />{cf.th('dataIn', 'data in', { sort: true, options: [DATA_FUTURA, DATA_PASSATA] })}</span></th>
              <th className="vcce__r"><span className="sib-colf-head"><ThLabel full="Importo data in" short="Imp. data in" />{cf.th('importoDataIn', 'importo data in', { search: true, sort: true })}</span></th>
              <th className="vcce__r"><span className="sib-colf-head"><ThLabel full="Delta importi" short="Delta" />{cf.th('delta', 'delta importi', { search: true, sort: true })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Stato lavorazione" short="Stato lav." />{cf.th('stato', 'stato lavorazione', { options: STATI_LAVORAZIONE })}</span></th>
              <th className="vcce__c"><span className="sib-colf-head"><ThLabel full="Azioni" />{cf.th('azione', 'azioni', { options: [AZ_GENERA, AZ_RISOLVI, AZ_NESSUNA] })}</span></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map(r => (
              <tr key={r.id} className={r.scaduta ? 'vcce__row--scaduta' : undefined}>
                <td className="vcce__strong"><TruncatedText text={r.struttura} /></td>
                <td><TruncatedText text={r.bookingId} /></td>
                <td className="vcce__r"><TruncatedText text={eur(r.importoStruttura)} /></td>
                <td className="vcce__c">
                  {actBtn('Visualizza VCC incassata', 'eye', () => setCard({ row: r, integrativa: false }))}
                </td>
                <td><TruncatedText text={r.status} /></td>
                <td>
                  <span className="vcce__data">
                    <TruncatedText text={fmtData(r.dataIn)} />
                    {r.scaduta && (
                      <Tooltip text="Casistica scaduta: check-in passato con lavorazione aperta">
                        <span className="vcce__scaduta"><Ico n="alert" w="solid" s={12} c="currentColor" /></span>
                      </Tooltip>
                    )}
                  </span>
                </td>
                <td className="vcce__r"><TruncatedText text={eur(r.importoDataIn)} /></td>
                <td className="vcce__r vcce__delta">
                  <TruncatedText text={eurDelta(r.delta)} />
                </td>
                <td>
                  <span className={`vcce__stato vcce__stato--${r.stato === 'Risolto' ? 'ok' : r.stato === 'Da lavorare' ? 'todo' : 'none'}`}>
                    <TruncatedText text={r.stato} />
                  </span>
                </td>
                <td className="vcce__c">{renderAzioni(r)}</td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={10} className="vcce__empty">Nessuna VCC corrisponde ai filtri impostati.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="vcce__pag"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} /></div>

      <Modal open={card !== null} onClose={() => setCard(null)} title={card?.integrativa ? 'VCC integrativa' : 'VCC incassata'} size="xl">
        {card && (
          <div className="vcce-card">
            <div className="vcce-card__card">
              <VccCard seed={card.integrativa ? `${card.row.bookingId}-INT` : card.row.bookingId} />
            </div>
            <aside className="vcce-card__client">
              <span className="vcce-card__label">{card.integrativa ? 'Integrativa per' : 'Incassata da'}</span>
              <div className={`vcce-card__mark vcce-card__mark--c${logoOf(card.row.struttura).tinta}`}>
                <span className="vcce-card__sigla">{logoOf(card.row.struttura).sigla}</span>
              </div>
              <span className="vcce-card__name">{card.row.struttura}</span>
              <dl className="vcce-card__meta">
                <dt>Booking ID</dt><dd>{card.row.bookingId}</dd>
                <dt>Data in</dt><dd>{fmtData(card.row.dataIn)}</dd>
                <dt>Importo</dt><dd>{eur(cardImporto)}</dd>
              </dl>
            </aside>
          </div>
        )}
      </Modal>
    </div>
  )
}
