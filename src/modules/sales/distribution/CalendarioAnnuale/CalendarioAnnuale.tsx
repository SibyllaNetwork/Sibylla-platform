import React, { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import PageHead from '../../../../core/components/PageHead'
import { SelectField, DateRangeField, RadioGroup } from '../../../../core/components/form'
import Modal from '../../../../core/components/Modal'
import { useAccessStore } from '../../../../store/useAccessStore'
import PianificazioneAnnualeTO from './PianificazioneAnnualeTO'
import './CalendarioAnnuale.sass'

const MONTH_NAMES = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const MONTH_ABBR  = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC']
const WD_ABBR     = ['DOM','LUN','MAR','MER','GIO','VEN','SAB']
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

const STRUTTURE = ["Grim's Hotel", 'Hotel Noto', 'Grand Hotel Roma', 'Villa Bellini']
const LISTINI = ['Listino diretto', 'Listino OTA', 'Listino corporate', 'Listino agenzie']

const pad = (n: number) => String(n).padStart(2, '0')
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate()
const eur = (n: number) => n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

type Tipo = 'bar' | 'fit'
interface Rate { id: number; prezzo: number }

const BAR_INIT: Rate[] = [{ id: 1, prezzo: 147.40 }, { id: 5, prezzo: 326.48 }, { id: 9, prezzo: 399.56 }]
const FIT_INIT: Rate[] = [{ id: 3, prezzo: 122.00 }, { id: 7, prezzo: 168.50 }]

function defaultRange(): { from: string; to: string } {
  const t = new Date()
  const from = new Date(t.getFullYear(), t.getMonth(), 1)
  const to = new Date(t.getFullYear() + 2, t.getMonth(), 0)
  return { from: `${from.getFullYear()}-${pad(from.getMonth() + 1)}-01`, to: `${to.getFullYear()}-${pad(to.getMonth() + 1)}-${pad(to.getDate())}` }
}

function seedBar(y: number): Record<string, number> {
  const a: Record<string, number> = {}
  for (let d = 1; d <= 9; d++)   a[`${y}-6-${d}`]  = 1   // Lug 1-9 → B.A.R. 1
  for (let d = 12; d <= 19; d++) a[`${y}-8-${d}`]  = 5   // Set 12-19 → B.A.R. 5
  for (let d = 25; d <= 28; d++) a[`${y}-5-${d}`]  = 9   // Giu 25-28 → B.A.R. 9
  return a
}
function seedFit(y: number): Record<string, number> {
  const a: Record<string, number> = {}
  // Febbraio dell'anno successivo (dentro il range di default) → F.I.T. 3 (122,00)
  for (const d of [8, 17, 18, 19, 21]) a[`${y + 1}-1-${d}`] = 3
  a[`${y + 1}-0-17`] = 3 // Gen 17
  return a
}

type TipState = { text: string; x: number; y: number } | null

export default function CalendarioAnnuale({ navigate }: { navigate: (p: string) => void }) {
  // Pagina condivisa: i Tour Operator vedono "Pianificazione annuale" (markup
  // dinamici); gli altri moduli il "Calendario annuale" standard (tariffe).
  const currentProfileId = useAccessStore(s => s.currentProfileId)
  const assist           = useAccessStore(s => s.assist)
  const profiles         = useAccessStore(s => s.profiles)
  const moduli = assist ? assist.moduli : (currentProfileId ? profiles.find(p => p.id === currentProfileId)?.moduli : undefined)
  const isTO = moduli?.includes('tour-operator')

  const initRange = useMemo(defaultRange, [])
  const initYear = new Date(initRange.from).getFullYear()
  const [dateFrom, setDateFrom] = useState(initRange.from)
  const [dateTo,   setDateTo]   = useState(initRange.to)
  const [struttura, setStruttura] = useState(STRUTTURE[0])
  const [tipo, setTipo] = useState<Tipo>('bar')
  const [listino, setListino] = useState('')
  const [bars, setBars] = useState<Rate[]>(BAR_INIT)
  const [fits, setFits] = useState<Rate[]>(FIT_INIT)
  const [selBar, setSelBar] = useState<number | null>(null)
  const [selFit, setSelFit] = useState<number | null>(null)
  const [erase, setErase] = useState(false)
  const [assignBar, setAssignBar] = useState<Record<string, number>>(() => seedBar(initYear))
  const [assignFit, setAssignFit] = useState<Record<string, number>>(() => seedFit(initYear))
  const [painting, setPainting] = useState(false)
  const [tip, setTip] = useState<TipState>(null)
  const [salvato, setSalvato] = useState(false)
  const [creaOpen, setCreaOpen] = useState(false)
  const [nuovoPrezzo, setNuovoPrezzo] = useState('')

  const isBar = tipo === 'bar'
  const rateLabel = isBar ? 'B.A.R.' : 'F.I.T.'
  const rates = isBar ? bars : fits
  const selected = isBar ? selBar : selFit
  const assign = isBar ? assignBar : assignFit
  const setAssign = isBar ? setAssignBar : setAssignFit
  const rateById = useMemo(() => Object.fromEntries(rates.map(r => [r.id, r])), [rates])

  const months = useMemo(() => {
    const s = new Date(dateFrom + 'T00:00:00'); const e = new Date(dateTo + 'T00:00:00')
    const out: Array<{ year: number; month: number }> = []
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return out
    let cur = new Date(s.getFullYear(), s.getMonth(), 1)
    while (cur <= e && out.length < 48) { out.push({ year: cur.getFullYear(), month: cur.getMonth() }); cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1) }
    return out
  }, [dateFrom, dateTo])

  useEffect(() => {
    const up = () => setPainting(false)
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  const applyCell = (key: string) => {
    if (erase) { setAssign(p => { const n = { ...p }; delete n[key]; return n }); return }
    if (selected == null) return
    setAssign(p => ({ ...p, [key]: selected }))
  }

  const setSelected = (id: number | null) => { (isBar ? setSelBar : setSelFit)(id); setErase(false) }

  const showTip = (e: React.MouseEvent<HTMLElement>, text: string) => {
    const r = e.currentTarget.getBoundingClientRect()
    setTip({ text, x: r.left + r.width / 2, y: r.top })
  }

  const creaRate = () => {
    const prezzo = parseFloat(nuovoPrezzo.replace(',', '.'))
    if (!prezzo || prezzo <= 0) return
    const list = isBar ? bars : fits
    const id = (list.reduce((m, r) => Math.max(m, r.id), 0) || 0) + 1
    ;(isBar ? setBars : setFits)(p => [...p, { id, prezzo }])
    setSelected(id)
    setNuovoPrezzo(''); setCreaOpen(false)
  }

  const salva = () => { setSalvato(true); window.setTimeout(() => setSalvato(false), 2500) }

  if (isTO) return <PianificazioneAnnualeTO navigate={navigate} />

  return (
    <div className="ca">
      <PageHead
        title="Calendario annuale"
        subtitle="Organizza in anticipo le politiche di prezzo per garantire stabilità e visione a lungo termine"
      />

      {/* ── Filtri ──────────────────────────────────────────────────── */}
      <div className="ca__filters">
        <DateRangeField
          nameFrom="dateFrom" nameTo="dateTo" label="Periodo"
          valueFrom={dateFrom} valueTo={dateTo}
          onChangeFrom={e => setDateFrom(e.target.value)} onChangeTo={e => setDateTo(e.target.value)}
        />
        <SelectField
          name="struttura" label="Struttura" value={struttura}
          onChange={e => setStruttura(e.target.value)}
          options={STRUTTURE.map(s => ({ value: s, label: s }))}
          className="ca__filter-struttura"
        />
        <RadioGroup
          name="ca-tipo" label="Tipo tariffa" value={tipo}
          onChange={v => { setTipo(v as Tipo); setErase(false) }}
          options={[{ value: 'bar', label: 'B.A.R.' }, { value: 'fit', label: 'F.I.T.' }]}
          className="ca__field"
        />

        {/* Listino: solo in modalità F.I.T. */}
        {!isBar && (
          <SelectField
            name="listino" label="Listino" value={listino}
            onChange={e => setListino(e.target.value)}
            options={[{ value: '', label: 'Seleziona' }, ...LISTINI.map(l => ({ value: l, label: l }))]}
            className="ca__filter-listino"
          />
        )}

        <SelectField
          name="rate" label={rateLabel} value={selected ?? ''}
          onChange={e => setSelected(e.target.value ? Number(e.target.value) : null)}
          options={[{ value: '', label: 'Seleziona' }, ...rates.map(r => ({ value: String(r.id), label: `${rateLabel} ${r.id} · ${eur(r.prezzo)} €` }))]}
          className="ca__filter-rate"
        />
        <button
          type="button"
          className={clsx('ca__eraser', erase && 'ca__eraser--on')}
          onClick={() => { setErase(v => !v); setSelBar(null); setSelFit(null) }}
          title="Gomma — rimuovi tariffe dai giorni"
          aria-pressed={erase}
        >
          <i className="fa-light fa-eraser" aria-hidden="true" />
        </button>

        <div className="ca__filters-spacer" aria-hidden="true" />

        {salvato && <span className="ca__saved"><i className="fa-light fa-circle-check" aria-hidden="true" /> Salvato</span>}
        <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setCreaOpen(true)}>
          <i className="fa-light fa-plus" aria-hidden="true" /> Crea {rateLabel}
        </button>
        <button type="button" className="sib-btn sib-btn--primary" onClick={salva}>
          <i className="fa-light fa-floppy-disk" aria-hidden="true" /> Salva
        </button>
      </div>

      {/* ── Matrice mese × giorni ───────────────────────────────────── */}
      {months.length > 0 ? (
        <div className="ca__table-wrap">
          <div className="ca__table" onMouseLeave={() => setTip(null)}>
            <div className="ca__head">
              <span className="ca__head-gutter" aria-hidden="true" />
              <div className="ca__head-days">
                {DAYS.map(d => <span key={d} className="ca__head-day">{d}</span>)}
              </div>
            </div>

            {months.map(({ year, month }) => {
              const dim = daysInMonth(year, month)
              return (
                <div className="ca__month" key={`${year}-${month}`}>
                  <button
                    type="button" className="ca__badge"
                    onMouseEnter={e => showTip(e, MONTH_NAMES[month])} onMouseLeave={() => setTip(null)}
                  >
                    <span className="ca__badge-year">{year}</span>
                    <span className="ca__badge-month">{MONTH_ABBR[month]}</span>
                  </button>
                  <div className="ca__dots">
                    {DAYS.map(day => {
                      if (day > dim) return <span key={day} className="ca__cell ca__cell--void" aria-hidden="true" />
                      const key = `${year}-${month}-${day}`
                      const rid = assign[key]
                      const rate = rid != null ? rateById[rid] : undefined
                      const wd = WD_ABBR[new Date(year, month, day).getDay()]
                      const tipText = rate ? `${rateLabel} ${rate.id} – ${eur(rate.prezzo)}€` : `${day} ${MONTH_NAMES[month]} · ${wd}`
                      return (
                        <span key={day} className="ca__cell">
                          <span
                            className={clsx('ca__dot', rate && (isBar ? 'ca__dot--bar' : 'ca__dot--fit'))}
                            role="button" tabIndex={0} aria-label={tipText}
                            onMouseDown={() => { setPainting(true); applyCell(key) }}
                            onMouseEnter={e => { if (painting) applyCell(key); showTip(e, tipText) }}
                            onMouseLeave={() => setTip(null)}
                          >
                            {rate ? eur(rate.prezzo) : wd}
                          </span>
                        </span>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="ca__empty">Periodo non valido — controlla le date selezionate.</div>
      )}

      {tip && <div className="ca__tip" style={{ left: tip.x, top: tip.y }} role="tooltip">{tip.text}</div>}

      {/* ── Modale Crea B.A.R./F.I.T. ───────────────────────────────── */}
      <Modal open={creaOpen} onClose={() => setCreaOpen(false)} size="sm" title={`Crea ${rateLabel}`}>
        <div className="ca__crea">
          <label className="ca__field ca__field-raw">
            <span className="ca__field-label">Prezzo {rateLabel} (€)</span>
            <input
              className="sib-input" type="text" inputMode="decimal" placeholder="es. 149,90"
              value={nuovoPrezzo} onChange={e => setNuovoPrezzo(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') creaRate() }} autoFocus
            />
          </label>
          <div className="ca__crea-actions">
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setCreaOpen(false)}>Annulla</button>
            <button type="button" className="sib-btn sib-btn--primary" onClick={creaRate}>Crea</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
