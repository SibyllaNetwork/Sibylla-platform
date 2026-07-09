import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import PageHead from '../../../../core/components/PageHead'
import { SelectField, DatePickerField } from '../../../../core/components/form'
import { exportTableToXls, exportElementToPdf } from '../GrigliaDisponibilita/exportGriglia'
import './GrigliaDisponibilitaEstesa.sass'

// ── Tipi ─────────────────────────────────────────────────────────────────────
interface Tipo { tipo: string; tot: number }
interface StrutturaDef { nome: string; tipi: Tipo[]; busy?: boolean }
interface Metrics { totale: number; vendute: number; impegnate: number; disponibili: number; prenotate: number; opzionate: number; occupate: number; manutenzione: number }

const STRUTTURE_DEF: StrutturaDef[] = [
  { nome: "Grim's Hotel", tipi: [{ tipo: 'Doppia Classic', tot: 3 }, { tipo: 'Matrimoniale Convertibile in Tripla', tot: 5 }, { tipo: 'Singola Classic', tot: 3 }] },
  { nome: 'Hotel Azzurro Mare', tipi: [{ tipo: 'Singola Classic', tot: 1 }] },
  { nome: 'HOTEL DEI MILLE', tipi: [{ tipo: 'Doppia Classic', tot: 2 }] },
  { nome: 'Hotel Tempio di Pallade', tipi: [{ tipo: 'Doppia Classic', tot: 1 }] },
  { nome: 'Hotel Tutorial', busy: true, tipi: [{ tipo: 'Doppia Classic', tot: 53 }, { tipo: 'Singola Classic', tot: 12 }, { tipo: 'Tripla Classic', tot: 1 }] },
]

const STRUTTURE_OPTS = ['Tutte', ...STRUTTURE_DEF.map((s) => s.nome)]
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
const GIORNI_W = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
const PERIODI_GIORNI = [5, 10, 15, 20, 30]

const SUB: { k: keyof Metrics; label: string }[] = [
  { k: 'totale', label: 'Tot.' }, { k: 'vendute', label: 'Ven.' }, { k: 'impegnate', label: 'Imp.' }, { k: 'disponibili', label: 'Disp.' },
  { k: 'prenotate', label: 'Pren.' }, { k: 'opzionate', label: 'Opz.' }, { k: 'occupate', label: 'Occ.' }, { k: 'manutenzione', label: 'Man.' },
]

const hashStr = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h }

function cell(struct: StrutturaDef, t: Tipo, dayIdx: number): Metrics {
  if (!struct.busy) return { totale: t.tot, vendute: 0, impegnate: 0, disponibili: t.tot, prenotate: 0, opzionate: 0, occupate: 0, manutenzione: 0 }
  const r = (hashStr(struct.nome + t.tipo) + dayIdx * 13) % 7
  const ven = Math.min(t.tot, Math.round(t.tot * 0.28) + (r % 4))
  return { totale: t.tot, vendute: ven, impegnate: ven, disponibili: t.tot - ven, prenotate: ven, opzionate: 0, occupate: 0, manutenzione: 0 }
}
function sumMetrics(struct: StrutturaDef, dayIdx: number): Metrics {
  return struct.tipi.reduce((acc, t) => {
    const c = cell(struct, t, dayIdx)
    return { totale: acc.totale + c.totale, vendute: acc.vendute + c.vendute, impegnate: acc.impegnate + c.impegnate, disponibili: acc.disponibili + c.disponibili, prenotate: acc.prenotate + c.prenotate, opzionate: acc.opzionate + c.opzionate, occupate: acc.occupate + c.occupate, manutenzione: acc.manutenzione + c.manutenzione }
  }, { totale: 0, vendute: 0, impegnate: 0, disponibili: 0, prenotate: 0, opzionate: 0, occupate: 0, manutenzione: 0 })
}

function genGiorni(start: Date, n: number) { return Array.from({ length: n }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d }) }
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const dayLabel = (d: Date) => `${GIORNI_W[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]}`

// ── Componente ────────────────────────────────────────────────────────────────
export default function GrigliaDisponibilitaEstesa(_props: { navigate?: (p: string) => void } = {}) {
  const [categoria, setCategoria] = useState('Tutte')
  const [struttura, setStruttura] = useState('Tutte')
  const [periodo, setPeriodo] = useState('2026-06-30')
  const [nGiorni, setNGiorni] = useState(5)

  const giorni = useMemo(() => genGiorni(new Date(periodo), nGiorni), [periodo, nGiorni])
  const strutture = struttura === 'Tutte' ? STRUTTURE_DEF : STRUTTURE_DEF.filter((s) => s.nome === struttura)

  // scroll orizzontale + frecce (come Griglia disponibilità)
  const wrapRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const [nav, setNav] = useState({ prev: false, next: false })
  const updateNav = useCallback(() => {
    const el = wrapRef.current; if (!el) return
    setNav({ prev: el.scrollLeft > 4, next: el.scrollLeft < el.scrollWidth - el.clientWidth - 4 })
  }, [])
  useEffect(() => { updateNav(); window.addEventListener('resize', updateNav); return () => window.removeEventListener('resize', updateNav) }, [nGiorni, struttura, updateNav])
  const scrollDays = (dir: number) => { const el = wrapRef.current; if (!el) return; el.scrollBy({ left: dir * Math.max(320, el.clientWidth * 0.8), behavior: 'smooth' }) }
  useEffect(() => {
    const el = wrapRef.current; if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (!delta) return
      const atStart = el.scrollLeft <= 0, atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 1
      if ((delta > 0 && !atEnd) || (delta < 0 && !atStart)) { el.scrollLeft += delta; e.preventDefault(); updateNav() }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [updateNav])

  // export
  const buildExport = () => {
    const header = ['Struttura', 'Tipologia camera', ...giorni.flatMap((g) => SUB.map((s) => `${g.getDate()}/${g.getMonth() + 1} ${s.label}`))]
    const rows: (string | number)[][] = []
    strutture.forEach((st) => {
      st.tipi.forEach((t, ti) => rows.push([ti === 0 ? st.nome : '', t.tipo, ...giorni.flatMap((_g, gi) => SUB.map((s) => cell(st, t, gi)[s.k]))]))
      rows.push(['', 'TOTALE', ...giorni.flatMap((_g, gi) => SUB.map((s) => sumMetrics(st, gi)[s.k]))])
    })
    return { header, rows }
  }
  const fileBase = `griglia-disponibilita-estesa_${periodo}`
  const handleXls = () => { const { header, rows } = buildExport(); exportTableToXls(`${fileBase}.xls`, header, rows, 'Griglia disponibilità estesa') }
  const handlePdf = () => exportElementToPdf(tableRef.current, `${fileBase}.pdf`, 'Griglia disponibilità estesa')

  return (
    <div className="gde">
      <PageHead title="Griglia disponibilità estesa" subtitle="Stato delle prenotazioni per categoria, struttura, tipo di camera e periodo" />

      {/* ── Toolbar ── */}
      <div className="gde__toolbar">
        <div className="gde__filters">
          <SelectField label="Categoria" name="categoria" className="w-[130px]" value={categoria} onChange={(e) => setCategoria(e.target.value)}
            options={['Tutte', 'Standard', 'Superior', 'Suite'].map((c) => ({ value: c, label: c }))} />
          <SelectField label="Struttura" name="struttura" className="w-[200px]" value={struttura} onChange={(e) => setStruttura(e.target.value)}
            options={STRUTTURE_OPTS.map((s) => ({ value: s, label: s }))} />
          <DatePickerField label="Periodo" name="periodo" className="w-[150px]" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
          <div className="gde__period">
            <label className="gde__period-label">Giorni</label>
            <div className="gde__seg" role="group" aria-label="Giorni">
              {PERIODI_GIORNI.map((n) => (
                <button key={n} type="button" className={`gde__seg-btn ${nGiorni === n ? 'is-active' : ''}`} aria-pressed={nGiorni === n} onClick={() => setNGiorni(n)}>{n}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="gde__export">
          <button type="button" className="sib-btn sib-btn--icon" title="Esporta XLS" aria-label="Esporta XLS" onClick={handleXls}><i className="fa-light fa-file-excel" /></button>
          <button type="button" className="sib-btn sib-btn--icon" title="Esporta PDF" aria-label="Esporta PDF" onClick={handlePdf}><i className="fa-light fa-file-pdf" /></button>
        </div>
      </div>

      {/* ── Tabella ── */}
      <div className="gde__timeline">
        {nav.prev && <button type="button" className="gde__nav gde__nav--prev" onClick={() => scrollDays(-1)} aria-label="Giorni precedenti"><i className="fa-light fa-chevron-left" /></button>}
        {nav.next && <button type="button" className="gde__nav gde__nav--next" onClick={() => scrollDays(1)} aria-label="Giorni successivi"><i className="fa-light fa-chevron-right" /></button>}
        <div className="gde__wrap" ref={wrapRef} onScroll={updateNav}>
          <table className="gde__table" ref={tableRef}>
            <thead>
              <tr>
                <th className="gde__th gde__th--struct" rowSpan={2}>Struttura</th>
                <th className="gde__th gde__th--tipo" rowSpan={2}>Tipologia camera</th>
                {giorni.map((g, i) => {
                  const weekend = g.getDay() === 0 || g.getDay() === 6
                  return <th key={i} className={`gde__th gde__th--day ${weekend ? 'is-weekend' : ''}`} colSpan={SUB.length}>{cap(dayLabel(g))}</th>
                })}
              </tr>
              <tr>
                {giorni.map((_g, i) => SUB.map((s, si) => (
                  <th key={`${i}-${s.k}`} className={`gde__th gde__th--sub ${si === 0 ? 'gde__th--day-start' : ''} ${s.k === 'disponibili' ? 'gde__th--disp' : ''}`}>{s.label}</th>
                )))}
              </tr>
            </thead>
            <tbody>
              {strutture.map((st) => (
                <React.Fragment key={st.nome}>
                  {st.tipi.map((t, ti) => (
                    <tr key={t.tipo} className="gde__tr">
                      {ti === 0 && <td className="gde__td gde__td--struct" rowSpan={st.tipi.length + 1}>{st.nome}</td>}
                      <td className="gde__td gde__td--tipo">{t.tipo}</td>
                      {giorni.map((_g, gi) => {
                        const c = cell(st, t, gi)
                        return SUB.map((s, si) => (
                          <td key={`${gi}-${s.k}`} className={`gde__td gde__td--num ${si === 0 ? 'gde__td--day-start' : ''} ${s.k === 'disponibili' ? 'gde__td--disp' : ''}`}>
                            {c[s.k] === 0 ? <span className="gde__zero">0</span> : c[s.k]}
                          </td>
                        ))
                      })}
                    </tr>
                  ))}
                  <tr className="gde__tr gde__tr--total">
                    <td className="gde__td gde__td--tipo">TOTALE</td>
                    {giorni.map((_g, gi) => {
                      const tot = sumMetrics(st, gi)
                      return SUB.map((s, si) => (
                        <td key={`${gi}-${s.k}`} className={`gde__td gde__td--num ${si === 0 ? 'gde__td--day-start' : ''} ${s.k === 'disponibili' ? 'gde__td--disp' : ''}`}><strong>{tot[s.k]}</strong></td>
                      ))
                    })}
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
