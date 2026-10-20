import React, { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import PageHead from '../../../../core/components/PageHead'
import Pagination from '../../../../core/components/Pagination'
import Tooltip from '../../../../core/components/Tooltip'
import ThLabel from '../../../../core/components/ThLabel'
import TruncatedText from '../../../../core/components/TruncatedText'
import { useColFilters } from '../../../../core/components/ColFilters'
import { SelectField, DatePickerField, InputField, DateRangeField } from '../../../../core/components/form'
import { toast } from '../../../../core/components/Toast/useToast'
import {
  ORIGINI, PIANI_TARIFFARI, ARRANGIAMENTI, STATI, TIPI_CAMERA, GIORNI,
  dailyCount, prenotazioniDelGiorno, prenotazioniDelGiornoTutte, fmtIsoIt, parseIso, toIso,
  type PrenotazioneIDS,
} from './idsData'
import { useStruttureCliente } from '../../../../hooks/useStrutturaCorrente'
import './PrenotazioniIDS.sass'

// ─── PRENOTAZIONI IDS ─────────────────────────────────────────────────────────
// Pagina unica: l'elenco operativo delle prenotazioni arrivate dai canali IDS
// (come nel gestionale) con, sopra, l'andamento degli ultimi 30 giorni. Un
// clic su una giornata del grafico imposta la "Data prenotazione" della tabella.

interface Props {
  navigate?: (p: string) => void
  /** Giornata di inserimento preselezionata (ISO); default oggi. */
  iso?: string
  /** Struttura preselezionata; vuoto = tutte le strutture. */
  struttura?: string
}

const TUTTE = 'Tutte le strutture'
const VCC_SI = 'Emessa', VCC_NO = 'Non emessa'
const PAGE_SIZES = [25, 50, 100]
const GIORNI_TREND = 30

// Separatore delle migliaia anche sotto 10.000 (it-IT di default lo omette: 8493,63)
const euroIt = (n: number) => {
  const [int, dec] = Math.abs(n).toFixed(2).split('.')
  return `${n < 0 ? '-' : ''}${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`
}
const oggiIso = () => toIso(new Date())
const addDays = (iso: string, n: number) => { const d = parseIso(iso); d.setDate(d.getDate() + n); return toIso(d) }

const STATO_CLASS: Record<string, string> = { Confermata: 'is-ok', Modificata: 'is-mod', Cancellata: 'is-ko' }

export default function PrenotazioniIDS({ navigate, iso, struttura }: Props = {}) {
  const schedeCliente = useStruttureCliente()
  const HOTELS = useMemo(() => schedeCliente.filter(s => s.camere > 0).map(s => s.nome), [schedeCliente])

  const [dataPre, setDataPre] = useState(iso ?? oggiIso())
  const [hotel, setHotel] = useState(struttura || TUTTE)
  const [cerca, setCerca] = useState('')
  // Intervalli sulle date di arrivo/partenza: vuoti = nessun filtro.
  const [inDa, setInDa] = useState('')
  const [inA, setInA] = useState('')
  const [outDa, setOutDa] = useState('')
  const [outA, setOutA] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])
  const [trendOpen, setTrendOpen] = useState(true)
  // Contatore di refresh: serve solo a rigenerare l'elenco su richiesta.
  const [refresh, setRefresh] = useState(0)

  const cf = useColFilters()
  const hotelsSel = hotel === TUTTE ? HOTELS : [hotel]

  // ── Andamento: 30 giornate fino a oggi (o attorno alla data scelta, se più vecchia)
  const trend = useMemo(() => {
    const oggi = oggiIso()
    const fine = dataPre > addDays(oggi, -(GIORNI_TREND - 1)) ? oggi : addDays(dataPre, Math.floor(GIORNI_TREND / 2))
    const end = fine > oggi ? oggi : fine
    return Array.from({ length: GIORNI_TREND }, (_, i) => {
      const dIso = addDays(end, i - (GIORNI_TREND - 1))
      const d = parseIso(dIso)
      return { iso: dIso, day: d.getDate(), dow: GIORNI[d.getDay()], weekend: d.getDay() === 0 || d.getDay() === 6, count: hotelsSel.reduce((n, h) => n + dailyCount(h, d), 0) }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataPre, hotel, HOTELS])
  const maxTrend = Math.max(1, ...trend.map(d => d.count))
  const mediaTrend = Math.round(trend.reduce((n, d) => n + d.count, 0) / trend.length)
  const picco = trend.reduce((b, d) => (d.count > b.count ? d : b), trend[0])

  // ── Elenco
  const all: PrenotazioneIDS[] = useMemo(
    () => (hotel === TUTTE ? prenotazioniDelGiornoTutte(dataPre, HOTELS) : prenotazioniDelGiorno(hotel, dataPre)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hotel, dataPre, refresh, HOTELS],
  )

  const filtered = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    return all.filter(r =>
      (!q || [String(r.nPre), r.bookingId, r.cliente, r.origine, r.piano, r.camera, r.struttura]
        .some(v => v.toLowerCase().includes(q))) &&
      (!inDa || r.dataIn >= inDa) && (!inA || r.dataIn <= inA) &&
      (!outDa || r.dataOut >= outDa) && (!outA || r.dataOut <= outA) &&
      cf.matchMulti(r.stato, 'stato') &&
      cf.matchMulti(r.piano, 'piano') &&
      cf.matchMulti(r.arrangiamento || '—', 'arrangiamento') &&
      cf.matchMulti(r.origine, 'origine') &&
      cf.matchMulti(r.camera, 'camera') &&
      cf.matchMulti(r.vcc ? VCC_SI : VCC_NO, 'vcc') &&
      cf.matchText(r.bookingId, 'bookingId') &&
      cf.matchText(r.cliente, 'cliente')
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, cerca, inDa, inA, outDa, outA, cf.text, cf.multi])

  // Ordinamento di base: messaggio IDS più recente in testa.
  const sorted = useMemo(
    () => (cf.sort ? cf.sortRows(filtered) : [...filtered].sort((a, b) => b.idLog - a.idLog)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, cf.sort],
  )

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  useEffect(() => { setPage(1) }, [hotel, dataPre, cerca, inDa, inA, outDa, outA, pageSize, cf.text, cf.multi])
  const start = (page - 1) * pageSize
  const rows = sorted.slice(start, start + pageSize)
  const totale = useMemo(() => sorted.reduce((s, r) => s + r.euro, 0), [sorted])

  const filtriAttivi = !!(cerca || inDa || inA || outDa || outA || hotel !== TUTTE || dataPre !== oggiIso() || cf.hasActive)
  const azzeraFiltri = () => {
    setCerca(''); setInDa(''); setInA(''); setOutDa(''); setOutA('')
    setHotel(TUTTE); setDataPre(oggiIso()); cf.reset()
  }

  const ricarica = () => {
    setRefresh(n => n + 1)
    toast.info('Elenco aggiornato con le ultime prenotazioni ricevute dai canali.', 'Prenotazioni IDS')
  }

  // Esporta in Excel tutte le righe filtrate (non solo la pagina corrente).
  const exportExcel = () => {
    const cols = ['N. pre.', 'Struttura', 'Stato', 'Data prenotazione', 'Booking-id', 'Data in', 'Data out', 'Persone', 'Piani tariffari', 'Arrangiamento', 'Agenzia', 'Camera', 'Ospite', 'Importo', 'VCC']
    const head = cols.map(c => `<th>${c}</th>`).join('')
    const body = sorted.map(r =>
      `<tr><td>${r.nPre}</td><td>${r.struttura}</td><td>${r.stato}</td><td>${fmtIsoIt(r.dataPre)}</td><td>${r.bookingId}</td><td>${fmtIsoIt(r.dataIn)}</td><td>${fmtIsoIt(r.dataOut)}</td><td>${r.persone}</td><td>${r.piano}</td><td>${r.arrangiamento}</td><td>${r.origine}</td><td>${r.camera}</td><td>${r.cliente}</td><td>${euroIt(r.euro)}</td><td>${r.vcc ? VCC_SI : VCC_NO}</td></tr>`
    ).join('')
    const html = `<html><head><meta charset="utf-8"></head><body><table border="1" cellspacing="0" cellpadding="4"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`
    const url = URL.createObjectURL(new Blob([html], { type: 'application/vnd.ms-excel' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `prenotazioni-ids-${dataPre}.xls`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast.success(`${sorted.length} prenotazioni esportate in Excel.`, 'Esportazione completata')
  }

  const STRUTTURE_IN_ELENCO = useMemo(() => Array.from(new Set(all.map(r => r.struttura))).sort(), [all])
  const step5 = (n: number) => Math.max(1, Math.round((n / maxTrend) * 20)) * 5

  return (
    <div className="ids">
      <PageHead
        title="Prenotazioni IDS"
        subtitle="Importazione e aggiornamento automatico delle prenotazioni dai diversi canali di distribuzione online per singola struttura"
      />

      {/* ─── Filtri ─────────────────────────────────────────────────────────── */}
      <div className="ids__toolbar">
        <SelectField
          name="struttura"
          label="Struttura"
          className="ids__field ids__field--struttura"
          value={hotel}
          onChange={e => setHotel(e.target.value)}
          options={[{ value: TUTTE, label: TUTTE }, ...HOTELS.map(h => ({ value: h, label: h }))]}
        />
        <DatePickerField
          name="data-prenotazione"
          label="Data prenotazione"
          className="ids__field ids__field--data"
          value={dataPre}
          onChange={e => e.target.value && setDataPre(e.target.value)}
        />
        <InputField
          name="cerca"
          label="Cerca"
          className="ids__field ids__field--cerca"
          placeholder="N. pre., booking-id, ospite…"
          iconRight="fa-light fa-magnifying-glass"
          value={cerca}
          onChange={e => setCerca(e.target.value)}
        />
        <DateRangeField
          nameFrom="inDa" nameTo="inA" label="Data in"
          className="ids__field ids__field--range"
          valueFrom={inDa} valueTo={inA}
          onChangeFrom={e => setInDa(e.target.value)} onChangeTo={e => setInA(e.target.value)}
        />
        <DateRangeField
          nameFrom="outDa" nameTo="outA" label="Data out"
          className="ids__field ids__field--range"
          valueFrom={outDa} valueTo={outA}
          onChangeFrom={e => setOutDa(e.target.value)} onChangeTo={e => setOutA(e.target.value)}
        />
        <div className="ids__actions">
          <Tooltip text="Aggiorna l'elenco">
            <button type="button" className="ids__icon-btn" aria-label="Aggiorna l'elenco" onClick={ricarica}>
              <i className="fa-solid fa-rotate-right" aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip text="Esporta in Excel">
            <button type="button" className="ids__icon-btn" aria-label="Esporta in Excel" onClick={exportExcel}>
              <i className="fa-regular fa-file-xls" aria-hidden="true" />
            </button>
          </Tooltip>
          <button type="button" className="sib-btn sib-btn--toolbar" onClick={azzeraFiltri} disabled={!filtriAttivi}>
            <i className="fa-solid fa-filter-circle-xmark" aria-hidden="true" /> Azzera filtri
          </button>
        </div>
      </div>

      {/* ─── Andamento ultimi 30 giorni (clic = data prenotazione) ──────────── */}
      <section className={clsx('ids__trend', !trendOpen && 'is-closed')}>
        <button type="button" className="ids__trend-head" onClick={() => setTrendOpen(o => !o)} aria-expanded={trendOpen}>
          <span className="ids__trend-icon"><i className="fa-solid fa-chart-column" aria-hidden="true" /></span>
          <span className="ids__trend-title">Andamento prenotazioni</span>
          <span className="ids__trend-sub">
            {hotel === TUTTE ? 'tutte le strutture' : hotel} · ultimi {GIORNI_TREND} giorni · media {mediaTrend}/giorno · picco {picco.count} il {fmtIsoIt(picco.iso).slice(0, 5)}
          </span>
          <i className={clsx('fa-solid fa-chevron-down ids__trend-chev', trendOpen && 'is-open')} aria-hidden="true" />
        </button>
        {trendOpen && (
          <div className="ids__bars" role="list" aria-label="Prenotazioni per giornata">
            {trend.map(d => (
              <Tooltip key={d.iso} text={`${d.dow} ${fmtIsoIt(d.iso)} · ${d.count} prenotazioni`}>
                <button
                  type="button"
                  role="listitem"
                  className={clsx('ids__bar', d.weekend && 'is-weekend', d.iso === dataPre && 'is-sel')}
                  onClick={() => setDataPre(d.iso)}
                  aria-label={`${fmtIsoIt(d.iso)}: ${d.count} prenotazioni`}
                  aria-pressed={d.iso === dataPre}
                >
                  <span className="ids__bar-track">
                    <span className={`ids__bar-fill ids__h--p${step5(d.count)}`} />
                  </span>
                  <span className="ids__bar-day">{d.day}</span>
                </button>
              </Tooltip>
            ))}
          </div>
        )}
      </section>

      {/* ─── Elenco prenotazioni ────────────────────────────────────────────── */}
      <div className="sib-table-wrap ids__wrap">
        <table className="sib-table ids__table">
          {/* table-layout fixed + colonne in %: nessuno scroll orizzontale */}
          <colgroup>
            <col className="ids__col-idx" />
            <col className="ids__col-npre" />
            <col className="ids__col-struttura" />
            <col className="ids__col-stato" />
            <col className="ids__col-data" />
            <col className="ids__col-booking" />
            <col className="ids__col-data" />
            <col className="ids__col-data" />
            <col className="ids__col-persone" />
            <col className="ids__col-piano" />
            <col className="ids__col-arr" />
            <col className="ids__col-agenzia" />
            <col className="ids__col-camera" />
            <col className="ids__col-ospite" />
            <col className="ids__col-euro" />
            <col className="ids__col-vcc" />
          </colgroup>
          <thead>
            <tr className="ids__group-row">
              <th colSpan={12} aria-hidden="true" />
              <th colSpan={2} className="ids__group">Dettagli</th>
              <th colSpan={2} aria-hidden="true" />
            </tr>
            <tr>
              <th className="ids__c" aria-label="Numero di riga" />
              <th><span className="sib-colf-head"><ThLabel full="N. pre." /></span></th>
              <th><span className="sib-colf-head"><ThLabel full="Struttura" short="Strutt." />{cf.th('struttura', 'struttura', { options: STRUTTURE_IN_ELENCO })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Stato" />{cf.th('stato', 'stato', { options: [...STATI] })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Data prenotazione" short="Data pre." /></span></th>
              <th><span className="sib-colf-head"><ThLabel full="Booking-id" short="Book-id" />{cf.th('bookingId', 'booking-id', { search: true })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Data in" />{cf.th('dataIn', 'data in', { sort: true })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Data out" />{cf.th('dataOut', 'data out', { sort: true })}</span></th>
              <th className="ids__c"><span className="sib-colf-head"><ThLabel full="Persone" short="Pers." /></span></th>
              <th><span className="sib-colf-head"><ThLabel full="Piani tariffari" short="Piani tar." />{cf.th('piano', 'piani tariffari', { options: PIANI_TARIFFARI })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Arrangiamento" short="Arrang." />{cf.th('arrangiamento', 'arrangiamento', { options: [...ARRANGIAMENTI, '—'] })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Agenzia" />{cf.th('origine', 'agenzia', { options: ORIGINI })}</span></th>
              <th className="ids__in-group"><span className="sib-colf-head"><ThLabel full="Camera" />{cf.th('camera', 'camera', { options: TIPI_CAMERA })}</span></th>
              <th className="ids__in-group"><span className="sib-colf-head"><ThLabel full="Ospite" />{cf.th('cliente', 'ospite', { search: true })}</span></th>
              <th className="ids__r"><span className="sib-colf-head"><ThLabel full="Importo" />{cf.th('euro', 'importo', { sort: true })}</span></th>
              <th className="ids__c"><span className="sib-colf-head"><ThLabel full="VCC" />{cf.th('vcc', 'VCC', { options: [VCC_SI, VCC_NO] })}</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.key} className={clsx(r.stato === 'Cancellata' && 'is-cancelled')}>
                <td className="ids__c ids__idx">{start + i + 1}</td>
                <td className="ids__num"><TruncatedText text={String(r.nPre)} /></td>
                <td><TruncatedText text={r.struttura} /></td>
                <td><span className={clsx('ids__stato', STATO_CLASS[r.stato])}><TruncatedText text={r.stato} /></span></td>
                <td><TruncatedText text={fmtIsoIt(r.dataPre)} /></td>
                <td><TruncatedText text={r.bookingId} /></td>
                <td><TruncatedText text={fmtIsoIt(r.dataIn)} /></td>
                <td><TruncatedText text={fmtIsoIt(r.dataOut)} /></td>
                <td className="ids__c">{r.persone}</td>
                <td><TruncatedText text={r.piano} /></td>
                <td><TruncatedText text={r.arrangiamento || '—'} /></td>
                <td><TruncatedText text={r.origine} /></td>
                <td className="ids__in-group"><TruncatedText text={r.camera} /></td>
                <td><TruncatedText text={r.cliente} /></td>
                <td className="ids__r"><TruncatedText text={`${euroIt(r.euro)} €`} /></td>
                <td className="ids__c">
                  {r.vcc && (
                    <Tooltip text="Carta virtuale emessa">
                      <i className="fa-solid fa-credit-card ids__vcc" aria-label="Carta virtuale emessa" />
                    </Tooltip>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={16} className="sib-empty">Nessuna prenotazione per i criteri selezionati.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totale delle righe filtrate, sotto la tabella (non in testa alla pagina). */}
      <div className="ids__foot">
        <span className="ids__foot-count">
          {sorted.length.toLocaleString('it-IT')} prenotazioni del {fmtIsoIt(dataPre)}
          {hotel !== TUTTE && <> · {hotel}</>}
        </span>
        <span className="ids__total"><span className="ids__total-label">Totale</span> {euroIt(totale)} €</span>
      </div>

      <div className="ids__pag">
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          total={sorted.length}
          pageStart={start}
          pageEnd={Math.min(start + pageSize, sorted.length)}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZES}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  )
}
