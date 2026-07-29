import React, { useMemo, useState, useEffect } from 'react'
import Ico from '../../../core/icons/Ico'
import Pagination from '../../../core/components/Pagination'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import ThLabel from '../../../core/components/ThLabel'
import VccCard from '../../../core/components/VccCard'
import { SelectField, DatePickerField } from '../../../core/components/form'
import { useColFilters } from '../../../core/components/ColFilters'
import { toast } from '../../../core/components/Toast/useToast'
import './Commissioni.sass'

interface Props { navigate: (p: string) => void }

interface Row {
  to: string; struttura: string; cod: string; nome: string
  dataPren: string; checkin: string; persone: number
  prezzo: string; commissione: string; totale: string; vcc: boolean
}

const NAMES = ['Rossi Mario', 'Bianchi Anna', 'Verdi Luca', 'Esposito Sara', 'Romano Ivan', 'Greco Elsa']
const TOS = ['ITALCAMEL', 'Tui Italia', 'Hassab srl', 'Imperatore Travel', 'Debus snc']
const STRUTT = ['Hotel Roma', 'Resort Mare', 'Grand Hotel', 'Borgo Antico']
const AZIENDE = ['Sibylla', 'GAR S.R.L.', 'Reservation Hotel Italy']

const ROWS: Row[] = Array.from({ length: 24 }, (_, i) => ({
  to: TOS[i % TOS.length],
  struttura: STRUTT[i % STRUTT.length],
  cod: `PRN-${1000 + i}`,
  nome: NAMES[i % NAMES.length],
  dataPren: `2026-06-${String((i % 27) + 1).padStart(2, '0')}`,
  checkin: `2026-07-${String((i % 27) + 1).padStart(2, '0')}`,
  persone: (i % 4) + 1,
  prezzo: `${(i + 1) * 50},00`,
  commissione: `${(i + 1) * 5},00`,
  totale: `${(i + 1) * 55},00`,
  // true = VCC già generata (icona occhio), false = pronta da generare (icona carta)
  vcc: i % 3 === 0,
}))
const PAGE_SIZE = 10
const PERSONE_ALL = ['1', '2', '3', '4']
const VCC_GENERATA = 'Generata'
const VCC_DA_GENERARE = 'Da generare'
const VCC_ALL = [VCC_GENERATA, VCC_DA_GENERARE]

// Logo del cliente (tour operator) mostrato accanto alla carta: monogramma con
// una delle 5 tinte definite in Commissioni.sass, scelta in modo deterministico
// dal nome così che ogni cliente abbia sempre lo stesso marchio.
function logoOf(nome: string) {
  const parole = nome.trim().split(/\s+/)
  const sigla = (parole.length > 1
    ? parole[0][0] + parole[1][0]
    : nome.slice(0, 2)).toUpperCase()
  let h = 0
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0
  return { sigla, tinta: (h % 5) + 1 }
}

export default function Commissioni({ navigate }: Props) {
  const [page, setPage] = useState(1)
  const [sel, setSel] = useState<Set<string>>(new Set())
  // Stato VCC per prenotazione: generata (occhio) oppure da generare (carta).
  const [generate, setGenerate] = useState<Record<string, boolean>>(
    () => Object.fromEntries(ROWS.map(r => [r.cod, r.vcc]))
  )
  // Prenotazione di cui si sta visualizzando la carta nella modale.
  const [cardRow, setCardRow] = useState<Row | null>(null)
  // Filtri per colonna: imbuto (scelte multiple), lente (testo), ordinamento.
  const cf = useColFilters()

  const filtered = useMemo(() => ROWS.filter(r =>
    cf.matchMulti(r.to, 'to') &&
    cf.matchMulti(r.struttura, 'struttura') &&
    cf.matchMulti(String(r.persone), 'persone') &&
    cf.matchMulti(generate[r.cod] ? VCC_GENERATA : VCC_DA_GENERARE, 'vcc') &&
    cf.matchText(r.cod, 'cod') &&
    cf.matchText(r.nome, 'nome') &&
    cf.matchText(r.prezzo, 'prezzo') &&
    cf.matchText(r.commissione, 'commissione') &&
    cf.matchText(r.totale, 'totale')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [cf.text, cf.multi, generate])

  const sorted = useMemo(() => cf.sortRows(filtered),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, cf.sort])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [cf.text, cf.multi])
  const rows = sorted.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE)

  const allOnPage = rows.length > 0 && rows.every(r => sel.has(r.cod))
  const toggleAll = () => setSel(prev => {
    const n = new Set(prev)
    if (allOnPage) rows.forEach(r => n.delete(r.cod))
    else rows.forEach(r => n.add(r.cod))
    return n
  })
  const toggleOne = (cod: string) => setSel(prev => {
    const n = new Set(prev); n.has(cod) ? n.delete(cod) : n.add(cod); return n
  })

  // Genera la VCC di una singola prenotazione: da quel momento la riga mostra
  // l'occhio e la carta è consultabile in modale.
  const generaVcc = (r: Row) => {
    setGenerate(prev => ({ ...prev, [r.cod]: true }))
    toast.success(`VCC generata per la prenotazione ${r.cod} (${r.to}).`, 'VCC creata')
  }

  // Sblocca una nuova visualizzazione della carta per il cliente (la VCC è
  // consultabile una volta sola: il refresh ne concede un'altra).
  const nuovaVisione = (r: Row) => {
    toast.success(`Nuova visualizzazione abilitata per la prenotazione ${r.cod}.`, 'Visione abilitata')
  }

  // Genera in blocco le VCC delle righe selezionate non ancora emesse.
  const generaSelezionate = () => {
    const da = ROWS.filter(r => sel.has(r.cod) && !generate[r.cod])
    if (da.length === 0) {
      toast.info('Le prenotazioni selezionate hanno già una VCC.', 'VCC')
      return
    }
    setGenerate(prev => ({ ...prev, ...Object.fromEntries(da.map(r => [r.cod, true])) }))
    toast.success(`${da.length} VCC generate.`, 'VCC create')
  }

  // Esporta TUTTE le righe del documento in un file .xls (apribile da Excel).
  const exportExcel = () => {
    const cols = ['Tour operator', 'Struttura', 'Cod. Prenotazione', 'Nome e Cognome', 'Data prenotazione', 'Data check-in', 'N. Persone', 'Prezzo di vendita', 'Commissione', 'Totale', 'VCC']
    const head = cols.map(c => `<th>${c}</th>`).join('')
    const body = sorted.map(r =>
      `<tr><td>${r.to}</td><td>${r.struttura}</td><td>${r.cod}</td><td>${r.nome}</td><td>${r.dataPren}</td><td>${r.checkin}</td><td>${r.persone}</td><td>${r.prezzo} €</td><td>${r.commissione} €</td><td>${r.totale} €</td><td>${generate[r.cod] ? VCC_GENERATA : VCC_DA_GENERARE}</td></tr>`
    ).join('')
    const html = `<html><head><meta charset="utf-8"></head><body><table border="1" cellspacing="0" cellpadding="4"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'commissioni.xls'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast.success(`${sorted.length} righe esportate in Excel.`, 'Esportazione completata')
  }

  return (
    <div className="cms">
      <button type="button" className="cms__back" onClick={() => navigate('sibylla-admin')}>
        <Ico n="back" s={13} c="var(--color-primary)" /> Indietro
      </button>
      <div className="cms__head">
        <h1 className="cms__title">Commissioni</h1>
        <p className="cms__sub">Consulta le commissioni delle prenotazioni e gestisci i VCC.</p>
      </div>

      <div className="cms__toolbar">
        <SelectField
          name="azienda"
          label="Azienda"
          className="cms__field"
          options={[{ value: 'Tutte le aziende', label: 'Tutte le aziende' }, ...AZIENDE.map(a => ({ value: a, label: a }))]}
        />
        <SelectField
          name="struttura"
          label="Struttura"
          className="cms__field"
          disabled
          placeholder="Tutte le strutture"
          options={[]}
        />
        <DatePickerField
          name="data-prenotazione"
          label="Data prenotazione"
          className="cms__field"
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
        <DatePickerField
          name="data-checkin"
          label="Data check-in"
          className="cms__field"
        />
        <button type="button" className="cms__btn cms__btn--apply" onClick={() => toast.info('Filtri applicati.', 'Commissioni')}>Applica</button>
        <button type="button" className="cms__btn cms__btn--ghost cms__push" disabled={sel.size === 0} onClick={generaSelezionate}>Attiva VCC selezionate</button>
        <select className="sib-select cms__vcc"><option>VCC check-in 24H</option><option>VCC check-in 48H</option><option>VCC immediato</option></select>
        <button type="button" className="cms__icon-btn" title="Esporta in Excel" onClick={exportExcel}><Ico n="excel" s={16} c="#fff" /></button>
      </div>

      <div className="sib-table-wrap cms__wrap">
        <table className="sib-table cms__table">
          {/* Larghezze in percentuale + table-layout fixed: la tabella si adatta
              sempre allo spazio disponibile, senza mai scrollare in orizzontale. */}
          <colgroup>
            <col className="cms__col-check" />
            <col className="cms__col-to" />
            <col className="cms__col-struttura" />
            <col className="cms__col-cod" />
            <col className="cms__col-nome" />
            <col className="cms__col-data" />
            <col className="cms__col-data" />
            <col className="cms__col-persone" />
            <col className="cms__col-prezzo" />
            <col className="cms__col-comm" />
            <col className="cms__col-totale" />
            <col className="cms__col-vcc" />
            <col className="cms__col-visione" />
          </colgroup>
          <thead>
            <tr>
              <th className="cms__c"><input type="checkbox" checked={allOnPage} onChange={toggleAll} /></th>
              <th><span className="sib-colf-head"><ThLabel full="Tour operator" short="Tour op." />{cf.th('to', 'tour operator', { options: TOS })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Struttura" />{cf.th('struttura', 'struttura', { options: STRUTT })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Cod. Prenotazione" short="Cod. pren." />{cf.th('cod', 'codice prenotazione', { search: true })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Nome e Cognome" short="Nome e cogn." />{cf.th('nome', 'nome e cognome', { search: true })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Data prenotazione" short="Data pren." />{cf.th('dataPren', 'data prenotazione', { sort: true })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Data check-in" short="Check-in" />{cf.th('checkin', 'data check-in', { sort: true })}</span></th>
              <th className="cms__c"><span className="sib-colf-head"><ThLabel full="N. Persone" short="N. pers." />{cf.th('persone', 'n. persone', { options: PERSONE_ALL })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Prezzo di vendita" short="Prezzo vend." />{cf.th('prezzo', 'prezzo di vendita', { search: true })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Commissione" short="Comm." />{cf.th('commissione', 'commissione', { search: true })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Totale" />{cf.th('totale', 'totale', { search: true })}</span></th>
              <th className="cms__c"><span className="sib-colf-head"><ThLabel full="VCC" />{cf.th('vcc', 'VCC', { options: VCC_ALL })}</span></th>
              <th className="cms__c"><ThLabel full="Abilita visione" short="Ab. visione" /></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.cod}>
                <td className="cms__c"><input type="checkbox" checked={sel.has(r.cod)} onChange={() => toggleOne(r.cod)} /></td>
                <td className="cms__strong"><TruncatedText text={r.to} /></td>
                <td><TruncatedText text={r.struttura} /></td>
                <td><TruncatedText text={r.cod} /></td>
                <td><TruncatedText text={r.nome} /></td>
                <td><TruncatedText text={r.dataPren} /></td>
                <td><TruncatedText text={r.checkin} /></td>
                <td className="cms__c">{r.persone}</td>
                <td><TruncatedText text={`${r.prezzo} €`} /></td>
                <td><TruncatedText text={`${r.commissione} €`} /></td>
                <td><TruncatedText text={`${r.totale} €`} /></td>
                <td className="cms__c">
                  {generate[r.cod] ? (
                    <Tooltip text="Visualizza VCC">
                      <button type="button" className="cms__vcc-act" onClick={() => setCardRow(r)} aria-label="Visualizza VCC">
                        <Ico n="eye" w="solid" s={16} c="var(--color-primary)" />
                      </button>
                    </Tooltip>
                  ) : (
                    <Tooltip text="Genera VCC">
                      <button type="button" className="cms__vcc-act" onClick={() => generaVcc(r)} aria-label="Genera VCC">
                        <Ico n="credit-card" w="solid" s={16} c="var(--color-primary)" />
                      </button>
                    </Tooltip>
                  )}
                </td>
                <td className="cms__c">
                  <Tooltip text="Abilita una nuova visualizzazione">
                    <button type="button" className="cms__vcc-act" onClick={() => nuovaVisione(r)} aria-label="Abilita una nuova visualizzazione">
                      <Ico n="refresh" w="solid" s={16} c="var(--color-primary)" />
                    </button>
                  </Tooltip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cms__pag"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} /></div>

      <Modal open={cardRow !== null} onClose={() => setCardRow(null)} title="VCC card" size="xl">
        {cardRow && (
          <div className="cms-vcc">
            <div className="cms-vcc__card">
              <VccCard seed={cardRow.cod} />
            </div>
            <aside className="cms-vcc__client">
              <span className="cms-vcc__client-label">Generata per</span>
              <div className={`cms-vcc__mark cms-vcc__mark--c${logoOf(cardRow.to).tinta}`}>
                <span className="cms-vcc__mark-sigla">{logoOf(cardRow.to).sigla}</span>
              </div>
              <span className="cms-vcc__client-name">{cardRow.to}</span>
              <dl className="cms-vcc__meta">
                <dt>Prenotazione</dt><dd>{cardRow.cod}</dd>
                <dt>Struttura</dt><dd>{cardRow.struttura}</dd>
                <dt>Importo</dt><dd>{cardRow.totale} €</dd>
              </dl>
            </aside>
          </div>
        )}
      </Modal>
    </div>
  )
}
