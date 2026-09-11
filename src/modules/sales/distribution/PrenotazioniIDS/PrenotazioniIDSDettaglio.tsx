import React, { useEffect, useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import Pagination from '../../../../core/components/Pagination'
import Tooltip from '../../../../core/components/Tooltip'
import ThLabel from '../../../../core/components/ThLabel'
import TruncatedText from '../../../../core/components/TruncatedText'
import { useColFilters } from '../../../../core/components/ColFilters'
import { SelectField, DatePickerField, InputField, DateRangeField } from '../../../../core/components/form'
import { toast } from '../../../../core/components/Toast/useToast'
import {
  HOTELS, ORIGINI, PIANI_TARIFFARI, ARRANGIAMENTI,
  prenotazioniDelGiorno, prenotazioniDelGiornoTutte, fmtIsoIt, type PrenotazioneIDS,
} from './idsData'
import './PrenotazioniIDSDettaglio.sass'

interface Props {
  navigate: (p: string) => void
  /** Giornata di inserimento da cui si è arrivati (ISO). */
  iso?: string
  /** Struttura preselezionata; vuoto = tutte le strutture. */
  struttura?: string
}

const TUTTE = 'Tutte le strutture'
const VCC_SI = 'Emessa', VCC_NO = 'Non emessa'
const PAGE_SIZES = [25, 50, 100]

const euroIt = (n: number) => n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function PrenotazioniIDSDettaglio({ navigate, iso, struttura }: Props) {
  const [dataPre, setDataPre] = useState(iso ?? new Date().toISOString().slice(0, 10))
  const [hotel, setHotel] = useState(struttura || TUTTE)
  const [cerca, setCerca] = useState('')
  // Intervallo sulla data di arrivo: vuoto = nessun filtro.
  const [inDa, setInDa] = useState('')
  const [inA, setInA] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])
  // Contatore di refresh: serve solo a rigenerare l'elenco su richiesta.
  const [refresh, setRefresh] = useState(0)

  const cf = useColFilters()

  const all: PrenotazioneIDS[] = useMemo(
    () => (hotel === TUTTE ? prenotazioniDelGiornoTutte(dataPre) : prenotazioniDelGiorno(hotel, dataPre)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hotel, dataPre, refresh],
  )

  const filtered = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    return all.filter(r =>
      (!q || [String(r.nPre), r.bookingId, r.cliente, r.origine, r.piano, String(r.idLog), r.struttura]
        .some(v => v.toLowerCase().includes(q))) &&
      (!inDa || r.dataIn >= inDa) &&
      (!inA || r.dataIn <= inA) &&
      cf.matchMulti(r.struttura, 'struttura') &&
      cf.matchMulti(r.piano, 'piano') &&
      cf.matchMulti(r.arrangiamento || '—', 'arrangiamento') &&
      cf.matchMulti(r.origine, 'origine') &&
      cf.matchMulti(r.vcc ? VCC_SI : VCC_NO, 'vcc') &&
      cf.matchText(r.bookingId, 'bookingId') &&
      cf.matchText(r.cliente, 'cliente')
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, cerca, inDa, inA, cf.text, cf.multi])

  // Ordinamento di base: log più recente in testa (come l'arrivo dei messaggi IDS).
  const sorted = useMemo(
    () => (cf.sort ? cf.sortRows(filtered) : [...filtered].sort((a, b) => b.idLog - a.idLog)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, cf.sort],
  )

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  useEffect(() => { setPage(1) }, [hotel, dataPre, cerca, inDa, inA, pageSize, cf.text, cf.multi])
  const start = (page - 1) * pageSize
  const rows = sorted.slice(start, start + pageSize)

  const totale = useMemo(() => sorted.reduce((s, r) => s + r.euro, 0), [sorted])

  // Esporta in Excel tutte le righe filtrate (non solo la pagina corrente).
  const exportExcel = () => {
    const cols = ['N. pre.', 'Struttura', 'Data pre.', 'Booking-id', 'Data in', 'Data out', 'Persone', 'Camere', 'Piani tariffari', 'Cod. arrangiamento', 'Origine', 'Cliente', 'Id log', 'VCC', 'Euro']
    const head = cols.map(c => `<th>${c}</th>`).join('')
    const body = sorted.map(r =>
      `<tr><td>${r.nPre}</td><td>${r.struttura}</td><td>${fmtIsoIt(r.dataPre)}</td><td>${r.bookingId}</td><td>${fmtIsoIt(r.dataIn)}</td><td>${fmtIsoIt(r.dataOut)}</td><td>${r.persone}</td><td>${r.camere}</td><td>${r.piano}</td><td>${r.arrangiamento}</td><td>${r.origine}</td><td>${r.cliente}</td><td>${r.idLog}</td><td>${r.vcc ? VCC_SI : VCC_NO}</td><td>${euroIt(r.euro)}</td></tr>`
    ).join('')
    const html = `<html><head><meta charset="utf-8"></head><body><table border="1" cellspacing="0" cellpadding="4"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prenotazioni-ids-${dataPre}.xls`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast.success(`${sorted.length} prenotazioni esportate in Excel.`, 'Esportazione completata')
  }

  const ricarica = () => {
    setRefresh(n => n + 1)
    toast.info('Elenco aggiornato con le ultime prenotazioni ricevute dai canali.', 'Prenotazioni IDS')
  }

  const STRUTTURE_IN_ELENCO = useMemo(() => Array.from(new Set(all.map(r => r.struttura))).sort(), [all])

  return (
    <div className="idsd">
      <PageHead
        title="Prenotazioni IDS"
        subtitle="Importazione e aggiornamento automatico delle prenotazioni dai diversi canali di distribuzione online per singola struttura"
        onBack={() => navigate('prenotazioni-ids')}
      />

      {/* ─── Filtri ─────────────────────────────────────────────────────────── */}
      <div className="idsd__toolbar">
        <SelectField
          name="struttura"
          label="Struttura"
          className="idsd__field idsd__field--struttura"
          value={hotel}
          onChange={e => setHotel(e.target.value)}
          options={[{ value: TUTTE, label: TUTTE }, ...HOTELS.map(h => ({ value: h, label: h }))]}
        />
        <DatePickerField
          name="data-inserimento"
          label="Data inserimento"
          className="idsd__field idsd__field--data"
          value={dataPre}
          onChange={e => setDataPre(e.target.value)}
        />
        <InputField
          name="cerca"
          label="Cerca"
          className="idsd__field idsd__field--cerca"
          placeholder="Cerca"
          iconRight="fa-light fa-magnifying-glass"
          value={cerca}
          onChange={e => setCerca(e.target.value)}
        />
        <DateRangeField
          nameFrom="inDa"
          nameTo="inA"
          label="Data in"
          className="idsd__field idsd__field--range"
          valueFrom={inDa}
          valueTo={inA}
          onChangeFrom={e => setInDa(e.target.value)}
          onChangeTo={e => setInA(e.target.value)}
        />
        <div className="idsd__actions">
          <Tooltip text="Aggiorna l'elenco" variant="dark">
            <button type="button" className="idsd__icon-btn" aria-label="Aggiorna l'elenco" onClick={ricarica}>
              <i className="fa-solid fa-rotate-right" aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip text="Esporta in Excel" variant="dark">
            <button type="button" className="idsd__icon-btn" aria-label="Esporta in Excel" onClick={exportExcel}>
              <i className="fa-regular fa-file-xls" aria-hidden="true" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* ─── Elenco prenotazioni ────────────────────────────────────────────── */}
      <div className="sib-table-wrap idsd__wrap">
        <table className="sib-table idsd__table">
          {/* Larghezze in percentuale + table-layout fixed: 16 colonne senza
              mai scrollare in orizzontale, a nessuna larghezza. */}
          <colgroup>
            <col className="idsd__col-idx" />
            <col className="idsd__col-npre" />
            <col className="idsd__col-struttura" />
            <col className="idsd__col-datapre" />
            <col className="idsd__col-booking" />
            <col className="idsd__col-data" />
            <col className="idsd__col-data" />
            <col className="idsd__col-persone" />
            <col className="idsd__col-camere" />
            <col className="idsd__col-piano" />
            <col className="idsd__col-arr" />
            <col className="idsd__col-origine" />
            <col className="idsd__col-cliente" />
            <col className="idsd__col-log" />
            <col className="idsd__col-vcc" />
            <col className="idsd__col-euro" />
          </colgroup>
          <thead>
            <tr>
              <th className="idsd__c" aria-label="Numero di riga" />
              <th><span className="sib-colf-head"><ThLabel full="N. pre." /></span></th>
              <th><span className="sib-colf-head"><ThLabel full="Struttura" short="Strutt." />{cf.th('struttura', 'struttura', { options: STRUTTURE_IN_ELENCO })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Data pre." /></span></th>
              <th><span className="sib-colf-head"><ThLabel full="Booking-id" short="Book-id" />{cf.th('bookingId', 'booking-id', { search: true })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Data in" />{cf.th('dataIn', 'data in', { sort: true })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Data out" />{cf.th('dataOut', 'data out', { sort: true })}</span></th>
              <th className="idsd__c"><span className="sib-colf-head"><ThLabel full="Persone" short="Pers." /></span></th>
              <th className="idsd__c"><span className="sib-colf-head"><ThLabel full="Camere" short="Cam." /></span></th>
              <th><span className="sib-colf-head"><ThLabel full="Piani tariffari" short="Piani tar." />{cf.th('piano', 'piani tariffari', { options: PIANI_TARIFFARI })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Cod. arrangiamento" short="C. arr." />{cf.th('arrangiamento', 'cod. arrangiamento', { options: [...ARRANGIAMENTI, '—'] })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Origine" short="Orig." />{cf.th('origine', 'origine', { options: ORIGINI })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Cliente" />{cf.th('cliente', 'cliente', { search: true })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Id log" />{cf.th('idLog', 'id log', { sort: true })}</span></th>
              <th className="idsd__c"><span className="sib-colf-head"><ThLabel full="VCC" />{cf.th('vcc', 'VCC', { options: [VCC_SI, VCC_NO] })}</span></th>
              <th className="idsd__r"><span className="sib-colf-head"><ThLabel full="Euro" />{cf.th('euro', 'euro', { sort: true })}</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.key}>
                <td className="idsd__c idsd__idx">{start + i + 1}</td>
                <td><TruncatedText text={String(r.nPre)} /></td>
                <td><TruncatedText text={r.struttura} /></td>
                <td><TruncatedText text={fmtIsoIt(r.dataPre)} /></td>
                <td><TruncatedText text={r.bookingId} /></td>
                <td><TruncatedText text={fmtIsoIt(r.dataIn)} /></td>
                <td><TruncatedText text={fmtIsoIt(r.dataOut)} /></td>
                <td className="idsd__c idsd__num">{r.persone}</td>
                <td className="idsd__c idsd__num">{r.camere}</td>
                <td><TruncatedText text={r.piano} /></td>
                <td><TruncatedText text={r.arrangiamento || '—'} /></td>
                <td><TruncatedText text={r.origine} /></td>
                <td><TruncatedText text={r.cliente} /></td>
                <td className="idsd__num"><TruncatedText text={String(r.idLog)} /></td>
                <td className="idsd__c">
                  {r.vcc && (
                    <Tooltip text="Carta virtuale emessa" variant="dark">
                      <i className="fa-solid fa-credit-card idsd__vcc" aria-label="Carta virtuale emessa" />
                    </Tooltip>
                  )}
                </td>
                <td className="idsd__r"><TruncatedText text={euroIt(r.euro)} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={16} className="sib-empty">Nessuna prenotazione per i criteri selezionati.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totale delle righe filtrate, sotto la tabella (non in testa alla pagina). */}
      <div className="idsd__foot">
        <span className="idsd__foot-count">{sorted.length.toLocaleString('it-IT')} prenotazioni</span>
        <span className="idsd__total"><span className="idsd__total-label">Totale</span> {euroIt(totale)} €</span>
      </div>

      <div className="idsd__pag">
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
