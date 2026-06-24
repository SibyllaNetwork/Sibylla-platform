import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import { SelectField, DatePickerField } from '../../../../core/components/form'
import ConfigurazioneSuggerimentiModal from './ConfigurazioneSuggerimentiModal'
import DettaglioPrenotazioniModal from './DettaglioPrenotazioniModal'
import AttenzioneCapienzaModal from './AttenzioneCapienzaModal'
import { openGuestRoomChartPdf } from './openGuestRoomChartPdf'
import { exportTableToXls, exportElementToPdf } from './exportGriglia'
import './GrigliaDisponibilita.sass'

// ─── Mock data ────────────────────────────────────────────────────────────────
type StrutturaRow = {
  id: string
  nome: string
  stanze: number
  licenza: number
  buffer: number
  stopSales: boolean
  giorniDefault: number
}

const STRUTTURE: StrutturaRow[] = [
  { id: 'archimede', nome: 'Hotel Archimede', stanze: 155, licenza: 219, buffer: 21, stopSales: false, giorniDefault: 2 },
  { id: 'lazio',     nome: 'Hotel Lazio',     stanze: 58,  licenza: 77,  buffer: 8,  stopSales: false, giorniDefault: 7 },
  { id: 'siracusa',  nome: 'Hotel Siracusa',  stanze: 137, licenza: 197, buffer: 18, stopSales: false, giorniDefault: 13 },
  { id: 'floridia',  nome: 'Hotel Floridia',  stanze: 42,  licenza: 75,  buffer: 5,  stopSales: false, giorniDefault: 7 },
  { id: 'luce',      nome: 'Hotel Luce',      stanze: 66,  licenza: 114, buffer: 5,  stopSales: false, giorniDefault: 7 },
  { id: 'lux',       nome: 'Hotel Lux',       stanze: 83,  licenza: 146, buffer: 14, stopSales: false, giorniDefault: 5 },
  { id: 'noto',      nome: 'Hotel Noto',      stanze: 130, licenza: 193, buffer: 22, stopSales: false, giorniDefault: 5 },
  { id: 'regio',     nome: 'Hotel Regio',     stanze: 75,  licenza: 151, buffer: 19, stopSales: false, giorniDefault: 5 },
]

const ALERT_STRUTTURE = [
  { nome: "Grim's Hotel",  licenza: 59,  inventario: 91 },
  { nome: 'Hotel Tutorial', licenza: 120, inventario: 133 },
]

const MESI_IT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']
const WEEKDAY_SHORT = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab']

function genGiorni(startDate: Date, nGiorni: number) {
  return Array.from({ length: nGiorni }, (_, i) => {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    return d
  })
}

// Mock deterministico
function mockStanze(seed: number, gi: number, lic: number) {
  const v = ((seed * 31 + gi * 17) % 100) / 100
  return Math.round(lic * (0.18 + v * 0.35))
}
function mockPersone(seed: number, gi: number, stanze: number) {
  const v = ((seed * 53 + gi * 11) % 100) / 100
  return Math.round(stanze * (1.2 + v * 1.1))
}
function mockNegative(struttura: StrutturaRow, gi: number) {
  if (struttura.id === 'luce' && gi === 4) return { stanze: -1, persone: 15 }
  if (struttura.id === 'noto' && gi === 2) return { stanze: -11, persone: 37 }
  return null
}


// ─── Componente ───────────────────────────────────────────────────────────────
export default function GrigliaDisponibilita({ navigate }: { navigate: (p: string) => void }) {
  const [categoria, setCategoria] = useState('Tutte')
  const [struttura, setStruttura] = useState('Tutte')
  const [periodo,   setPeriodo]   = useState('2026-05-22')
  const [nGiorni,   setNGiorni]   = useState(5)
  const [bufferOn,  setBufferOn]  = useState(true)
  const [suggerimentiOn, setSuggerimentiOn] = useState(true)

  // Periodi (giorni) applicabili alla timeline.
  const PERIODI_GIORNI = [5, 10, 15, 20, 30]

  const [showConfigSugg, setShowConfigSugg] = useState(false)
  const [dettaglio,      setDettaglio]      = useState<null | { data: Date; strutturaId: string }>(null)
  const [showCapienza,   setShowCapienza]   = useState(true)

  const startDate = new Date(periodo)
  const giorni    = genGiorni(startDate, nGiorni)

  const struttureFiltered = struttura === 'Tutte'
    ? STRUTTURE
    : STRUTTURE.filter(s => s.nome === struttura)

  const grid = struttureFiltered.map((s, si) => ({
    ...s,
    giorni: giorni.map((_g, gi) => {
      const neg = mockNegative(s, gi)
      if (neg) return neg
      const st = mockStanze(si + 1, gi, s.licenza)
      return { stanze: st, persone: mockPersone(si + 1, gi, st) }
    }),
  }))

  // Disponibilità stanze di un giorno: il buffer (overbooking) viene sommato solo
  // se attivo. Disattivandolo i valori si ricalcolano e riemergono gli scoperti.
  const effStanze = (rawStanze: number, buffer: number) => rawStanze + (bufferOn ? buffer : 0)

  // Totali per giorno (per la riga TOTALE)
  const totaliGiorno = useMemo(() => giorni.map((_, gi) => ({
    stanze:  grid.reduce((acc, r) => acc + effStanze(r.giorni[gi].stanze, r.buffer), 0),
    persone: grid.reduce((acc, r) => acc + r.giorni[gi].persone, 0),
  })), [grid, giorni, bufferOn])
  const totLic = grid.reduce((a, r) => a + r.licenza, 0)
  const totBuf = grid.reduce((a, r) => a + r.buffer, 0)
  const totSt  = grid.reduce((a, r) => a + r.stanze, 0)

  // ── Slider orizzontale: frecce in overlay quando i giorni non entrano ────────
  const tableWrapRef = useRef<HTMLDivElement>(null)
  const [nav, setNav] = useState({ prev: false, next: false })
  const updateNav = useCallback(() => {
    const el = tableWrapRef.current
    if (!el) return
    setNav({
      prev: el.scrollLeft > 4,
      next: el.scrollLeft < el.scrollWidth - el.clientWidth - 4,
    })
  }, [])
  // Ricontrolla l'overflow al cambio del numero di giorni / filtri e al resize.
  useEffect(() => {
    updateNav()
    window.addEventListener('resize', updateNav)
    return () => window.removeEventListener('resize', updateNav)
  }, [nGiorni, struttura, categoria, bufferOn, updateNav])
  const scrollDays = (dir: number) => {
    const el = tableWrapRef.current
    if (!el) return
    el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.8), behavior: 'smooth' })
  }

  // ── Rotella del mouse → scorrimento orizzontale dei giorni ───────────────────
  // Listener nativo non-passive (serve preventDefault). Quando c'è overflow e si
  // può ancora scorrere nella direzione richiesta, la rotella verticale muove i
  // giorni; ai bordi lascia scorrere la pagina normalmente.
  useEffect(() => {
    const el = tableWrapRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (!delta) return
      const atStart = el.scrollLeft <= 0
      const atEnd   = el.scrollLeft >= el.scrollWidth - el.clientWidth - 1
      if ((delta > 0 && !atEnd) || (delta < 0 && !atStart)) {
        el.scrollLeft += delta
        e.preventDefault()
        updateNav()
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [updateNav])

  // ── Export XLS / PDF della pagina ────────────────────────────────────────────
  const tableRef = useRef<HTMLTableElement>(null)
  const buildExportData = () => {
    const giorniLabels = giorni.map(g => `${g.getDate()} ${MESI_IT[g.getMonth()]}`)
    const header = [
      'Struttura', 'Stanze', 'Licenza', 'Buffer',
      ...giorniLabels.flatMap(l => [`${l} · Stanze`, `${l} · Persone`]),
    ]
    const rows: (string | number)[][] = grid.map(r => [
      r.nome, r.stanze, r.licenza, `+ ${r.buffer}`,
      ...r.giorni.flatMap(g => [effStanze(g.stanze, r.buffer), g.persone]),
    ])
    rows.push(['Totale', totSt, totLic, `+ ${totBuf}`, ...totaliGiorno.flatMap(t => [t.stanze, t.persone])])
    return { header, rows }
  }
  const fileBase = `griglia-disponibilita_${periodo}`
  const handleXls = () => {
    const { header, rows } = buildExportData()
    exportTableToXls(`${fileBase}.xls`, header, rows, 'Griglia disponibilità')
  }
  const handlePdf = () => exportElementToPdf(tableRef.current, `${fileBase}.pdf`, 'Griglia disponibilità')

  return (
    <div className="griglia-disp">
      <BtnBack onClick={() => navigate('home')} />

      <PageHeader
        title="Griglia disponibilità"
        subtitle="Stato delle prenotazioni per categoria, struttura, tipo di camera e periodo"
      />

      {/* ── Toolbar filtri ─────────────────────────────────────────────────── */}
      <div className="griglia-disp__toolbar">
        <div className="griglia-disp__filters">
          <SelectField
            label="Categoria" name="categoria"
            className="w-[130px]"
            value={categoria}
            onChange={e => setCategoria(e.target.value)}
            options={['Tutte','3 stelle','4 stelle','5 stelle'].map(c => ({ value: c, label: c }))}
          />
          <SelectField
            label="Struttura" name="struttura"
            className="w-[180px]"
            value={struttura}
            onChange={e => setStruttura(e.target.value)}
            options={[
              { value: 'Tutte', label: 'Tutte' },
              ...STRUTTURE.map(s => ({ value: s.nome, label: s.nome })),
            ]}
          />
          <DatePickerField
            label="Periodo" name="periodo"
            className="w-[150px]"
            value={periodo}
            onChange={e => setPeriodo(e.target.value)}
          />
          {/* Periodo timeline: 5/10/15/20/30 giorni (segmented) */}
          <div className="griglia-disp__period">
            <label className="griglia-disp__period-label">Giorni</label>
            <div className="griglia-disp__seg" role="group" aria-label="Giorni della timeline">
              {PERIODI_GIORNI.map(n => (
                <button
                  key={n}
                  type="button"
                  className={`griglia-disp__seg-btn ${nGiorni === n ? 'is-active' : ''}`}
                  onClick={() => setNGiorni(n)}
                  aria-pressed={nGiorni === n}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Suggerimenti toggle + gear */}
          <div className="griglia-disp__suggerimenti">
            <label className="griglia-disp__sugg-label">Suggerimenti</label>
            <div className="griglia-disp__sugg-row">
              <button
                type="button"
                role="switch"
                aria-checked={suggerimentiOn}
                className={`griglia-disp__switch ${suggerimentiOn ? 'is-on' : ''}`}
                onClick={() => setSuggerimentiOn(v => !v)}
              >
                <span className="griglia-disp__switch-thumb" />
              </button>
              <button
                type="button"
                className="griglia-disp__gear-btn"
                onClick={() => setShowConfigSugg(true)}
                title="Configura suggerimenti"
                disabled={!suggerimentiOn}
              >
                <i className="fa-light fa-gear" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="griglia-disp__pdf-btn"
                onClick={() => openGuestRoomChartPdf({
                  strutturaLabel: struttura,
                  periodoLabel:   `${new Date(periodo).toLocaleDateString('it-IT')} — ${new Date(new Date(periodo).getTime() + (nGiorni - 1) * 86400000).toLocaleDateString('it-IT')}`,
                })}
                title="Esporta grafico Guests & rooms analysis in PDF"
              >
                <i className="fa-light fa-chart-line" aria-hidden="true" />
                <span>PDF</span>
              </button>
            </div>
          </div>
        </div>

        <div className="griglia-disp__export">
          <button type="button" className="sib-btn sib-btn--icon" title="Esporta XLS" aria-label="Esporta XLS" onClick={handleXls}>
            <i className="fa-light fa-file-excel" aria-hidden="true" />
          </button>
          <button type="button" className="sib-btn sib-btn--icon" title="Esporta PDF" aria-label="Esporta PDF" onClick={handlePdf}>
            <i className="fa-light fa-file-pdf" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── Tabella ────────────────────────────────────────────────────────── */}
      <div className="griglia-disp__timeline">
        {nav.prev && (
          <button
            type="button"
            className="griglia-disp__nav griglia-disp__nav--prev"
            onClick={() => scrollDays(-1)}
            aria-label="Giorni precedenti"
          >
            <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {nav.next && (
          <button
            type="button"
            className="griglia-disp__nav griglia-disp__nav--next"
            onClick={() => scrollDays(1)}
            aria-label="Giorni successivi"
          >
            <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <div className="griglia-disp__table-wrap" ref={tableWrapRef} onScroll={updateNav}>
        <table className="griglia-disp__table" ref={tableRef}>
          <thead>
            <tr className="griglia-disp__th-row griglia-disp__th-row--days">
              <th className="griglia-disp__th griglia-disp__th--struct" rowSpan={2}>Struttura</th>
              <th className="griglia-disp__th griglia-disp__th--lead griglia-disp__th--stanze" rowSpan={2}>
                <span className="griglia-disp__th-stack">
                  <i className="fa-light fa-door-closed" aria-hidden="true" />
                  Stanze
                </span>
              </th>
              <th className="griglia-disp__th griglia-disp__th--lead griglia-disp__th--licenza" rowSpan={2}>
                <span className="griglia-disp__th-stack">
                  <i className="fa-light fa-id-card" aria-hidden="true" />
                  Licenza
                </span>
              </th>
              <th className="griglia-disp__th griglia-disp__th--buffer griglia-disp__th--lead" rowSpan={2}>
                <span className="griglia-disp__th-stack">
                  <i className="fa-light fa-layer-group" aria-hidden="true" />
                  Buffer
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={bufferOn}
                  className={`griglia-disp__switch griglia-disp__buffer-switch ${bufferOn ? 'is-on' : ''}`}
                  onClick={() => setBufferOn(v => !v)}
                  title={bufferOn ? 'Disabilita buffer' : 'Abilita buffer'}
                >
                  <span className="griglia-disp__switch-thumb" />
                </button>
              </th>
              {giorni.map((g, i) => {
                const wd = WEEKDAY_SHORT[g.getDay()]
                const isWeekend = g.getDay() === 0 || g.getDay() === 6
                return (
                  <th
                    key={i}
                    className={`griglia-disp__th griglia-disp__th--day ${isWeekend ? 'is-weekend' : ''}`}
                    colSpan={2}
                  >
                    <div className="griglia-disp__day-head">
                      <span className="griglia-disp__day-chip">{wd}</span>
                      <span className="griglia-disp__day-date">{g.getDate()} {MESI_IT[g.getMonth()]}</span>
                    </div>
                  </th>
                )
              })}
            </tr>
            <tr className="griglia-disp__th-row">
              {giorni.map((_g, i) => (
                <React.Fragment key={i}>
                  <th className="griglia-disp__th griglia-disp__th--sub griglia-disp__th--day-start">
                    <span className="griglia-disp__th-stack">
                      <i className="fa-light fa-door-closed" aria-hidden="true" />
                      Stanze
                    </span>
                  </th>
                  <th className="griglia-disp__th griglia-disp__th--sub">
                    <span className="griglia-disp__th-stack">
                      <i className="fa-light fa-user" aria-hidden="true" />
                      Persone
                    </span>
                  </th>
                </React.Fragment>
              ))}
            </tr>
          </thead>

          <tbody>
            {grid.map(row => (
              <tr key={row.id} className="griglia-disp__tr">
                <td className="griglia-disp__td griglia-disp__td--struct">
                  <div className="griglia-disp__hotel">
                    <i className="griglia-disp__hotel-ico fa-light fa-hotel" aria-hidden="true" />
                    <span className="griglia-disp__hotel-name">{row.nome}</span>
                  </div>
                </td>
                <td className="griglia-disp__td griglia-disp__td--stanze">{row.stanze}</td>
                <td className="griglia-disp__td griglia-disp__td--licenza">{row.licenza}</td>
                <td className={`griglia-disp__td griglia-disp__td--buffer ${bufferOn ? '' : 'griglia-disp__td--buffer-off'}`}>
                  {row.stopSales
                    ? <span className="griglia-disp__stop">
                        <i className="fa-light fa-minus" aria-hidden="true" />
                      </span>
                    : <span className="griglia-disp__buffer-plus">+ {row.buffer}</span>}
                </td>
                {row.giorni.map((g, i) => {
                  const eff = effStanze(g.stanze, row.buffer)
                  return (
                    <React.Fragment key={i}>
                      <td className={`griglia-disp__td griglia-disp__td--day-start ${eff < 0 ? 'is-negative' : ''}`}>
                        {eff < 0 && suggerimentiOn ? (
                          <button
                            type="button"
                            className="griglia-disp__neg-chip"
                            onClick={() => setDettaglio({ data: giorni[i], strutturaId: row.id })}
                            title="Apri dettaglio prenotazioni"
                          >
                            <span>{eff}</span>
                            <i className="fa-light fa-gear" aria-hidden="true" />
                          </button>
                        ) : (
                          <span>{eff}</span>
                        )}
                      </td>
                      <td className="griglia-disp__td">{g.persone}</td>
                    </React.Fragment>
                  )
                })}
              </tr>
            ))}

            {/* Riga totale */}
            <tr className="griglia-disp__tr griglia-disp__tr--total">
              <td className="griglia-disp__td griglia-disp__td--struct">
                <div className="griglia-disp__hotel griglia-disp__hotel--total">
                  <i className="griglia-disp__hotel-ico fa-light fa-calculator" aria-hidden="true" />
                  <span className="griglia-disp__hotel-name">Totale</span>
                </div>
              </td>
              <td className="griglia-disp__td griglia-disp__td--stanze">{totSt}</td>
              <td className="griglia-disp__td griglia-disp__td--licenza">{totLic}</td>
              <td className={`griglia-disp__td griglia-disp__td--buffer ${bufferOn ? '' : 'griglia-disp__td--buffer-off'}`}>
                <span className="griglia-disp__buffer-plus">+ {totBuf}</span>
              </td>
              {totaliGiorno.map((t, i) => (
                <React.Fragment key={i}>
                  <td className="griglia-disp__td griglia-disp__td--day-start">{t.stanze}</td>
                  <td className="griglia-disp__td">{t.persone}</td>
                </React.Fragment>
              ))}
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      {/* ── Modali ─────────────────────────────────────────────────────────── */}
      <ConfigurazioneSuggerimentiModal
        open={showConfigSugg}
        onClose={() => setShowConfigSugg(false)}
        strutture={STRUTTURE.map(s => ({ id: s.id, nome: s.nome, giorni: s.giorniDefault }))}
      />

      <DettaglioPrenotazioniModal
        open={dettaglio !== null}
        onClose={() => setDettaglio(null)}
        data={dettaglio?.data ?? null}
      />

      <AttenzioneCapienzaModal
        open={showCapienza}
        onClose={() => setShowCapienza(false)}
        strutture={ALERT_STRUTTURE}
      />
    </div>
  )
}
