import React, { useRef, useState } from 'react'
import { DatePickerField, InputField } from '../../../../../core/components/form'
import Tooltip from '../../../../../core/components/Tooltip'
import { GIORNI_SETTIMANA, minutiGiorno, type FasciaGiorno, type IntervalloOrario } from '../../../../../store/useHrConfigStore'
import './SettimanaOrario.sass'

// ─── EDITOR SETTIMANALE DELL'ORARIO ──────────────────────────────────────────
//  Una riga per giorno con la barra delle 24 ore: si TRASCINA sulla barra per
//  disegnare una fascia di lavoro (scatti di 15 minuti), si trascina la fascia
//  per spostarla e i suoi bordi per allungarla o accorciarla; più fasce nello
//  stesso giorno = giornata spezzata. Clic su una fascia → orari esatti, pausa
//  non retribuita ed eliminazione. «Copia su…» replica il giorno sugli altri.
//  Da tastiera: frecce ← → spostano la fascia selezionata, Maiusc + frecce ne
//  cambiano la fine, Canc la elimina.

const PASSO = 15
const GIORNO = 24 * 60
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return (h || 0) * 60 + (m || 0) }
const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const snap = (m: number) => Math.max(0, Math.min(GIORNO, Math.round(m / PASSO) * PASSO))
const fmtOre = (min: number) => { const h = Math.floor(min / 60), m = min % 60; return m ? `${h} h ${m}′` : `${h} h` }
const ordina = (f: IntervalloOrario[]) => [...f].sort((a, b) => toMin(a.inizio) - toMin(b.inizio))

// `ultimo` = posizione corrente durante il trascinamento: al rilascio si usa questa,
// perché l'ultimo pointermove può non essere ancora arrivato nel `value` del render.
type Drag = { giorno: number; idx: number; modo: 'crea' | 'sposta' | 'inizio' | 'fine'; x0: number; a0: number; b0: number; min: number; max: number; mosso: boolean; ultimo?: IntervalloOrario }

export const MODELLI: { label: string; giorni: () => FasciaGiorno[] }[] = [
  { label: 'Lun–Ven 9–13 · 14–18', giorni: () => GIORNI_SETTIMANA.map((_, i) => i < 5 ? { attivo: true, pausaMin: 0, fasce: [{ inizio: '09:00', fine: '13:00' }, { inizio: '14:00', fine: '18:00' }] } : { attivo: false, pausaMin: 0, fasce: [] }) },
  { label: 'Lun–Ven 8–16 continuato', giorni: () => GIORNI_SETTIMANA.map((_, i) => i < 5 ? { attivo: true, pausaMin: 0, fasce: [{ inizio: '08:00', fine: '16:00' }] } : { attivo: false, pausaMin: 0, fasce: [] }) },
  { label: 'Lun–Sab 8–14:40', giorni: () => GIORNI_SETTIMANA.map((_, i) => i < 6 ? { attivo: true, pausaMin: 0, fasce: [{ inizio: '08:00', fine: '14:40' }] } : { attivo: false, pausaMin: 0, fasce: [] }) },
  { label: 'Svuota', giorni: () => GIORNI_SETTIMANA.map(() => ({ attivo: false, pausaMin: 0, fasce: [] })) },
]

export default function SettimanaOrario({ value, onChange }: { value: FasciaGiorno[]; onChange: (v: FasciaGiorno[]) => void }) {
  const [sel, setSel] = useState<{ giorno: number; idx: number } | null>(null)
  const [copia, setCopia] = useState<{ da: number; a: number[] } | null>(null)
  const drag = useRef<Drag | null>(null)
  const [, forza] = useState(0)

  // Finestra visibile della barra: 06–24, allargata se qualche fascia inizia prima delle 6
  const primo = Math.min(360, ...value.flatMap(g => g.fasce.map(f => Math.floor(toMin(f.inizio) / 120) * 120)))
  const DA = Math.max(0, primo)
  const SPAN = GIORNO - DA
  const pct = (m: number) => `${((m - DA) / SPAN) * 100}%`
  const pctW = (len: number) => `${(len / SPAN) * 100}%`

  const setGiorno = (i: number, g: FasciaGiorno) => onChange(value.map((x, k) => (k === i ? g : x)))
  const limiti = (fasce: IntervalloOrario[], escludi: number) => {
    // spazio libero attorno alla fascia `escludi` (le fasce non si sovrappongono)
    const altre = fasce.filter((_, k) => k !== escludi)
    return altre
  }

  const minDaEvento = (e: React.PointerEvent | PointerEvent, track: HTMLElement) => {
    const r = track.getBoundingClientRect()
    return DA + ((e.clientX - r.left) / r.width) * SPAN
  }

  const startCrea = (e: React.PointerEvent<HTMLDivElement>, giorno: number) => {
    if ((e.target as HTMLElement).closest('.sett-ora__block')) return
    const track = e.currentTarget
    const m = snap(minDaEvento(e, track))
    const fasce = value[giorno].fasce
    // limiti: tra la fascia precedente e la successiva
    const prima = fasce.map(f => toMin(f.fine)).filter(x => x <= m)
    const dopo = fasce.map(f => toMin(f.inizio)).filter(x => x >= m)
    const min = Math.max(DA, prima.length ? Math.max(...prima) : 0)
    const max = dopo.length ? Math.min(...dopo) : GIORNO
    if (max - min < PASSO) return
    track.setPointerCapture(e.pointerId)
    drag.current = { giorno, idx: -1, modo: 'crea', x0: m, a0: m, b0: m, min, max, mosso: false }
    forza(n => n + 1)
  }

  const startBlocco = (e: React.PointerEvent<HTMLElement>, giorno: number, idx: number, modo: Drag['modo']) => {
    e.stopPropagation()
    const track = (e.currentTarget.closest('.sett-ora__track') as HTMLElement)
    const fasce = value[giorno].fasce
    const f = fasce[idx]
    const a = toMin(f.inizio), b = toMin(f.fine)
    const altre = limiti(fasce, idx)
    const prima = altre.map(x => toMin(x.fine)).filter(x => x <= a)
    const dopo = altre.map(x => toMin(x.inizio)).filter(x => x >= b)
    track.setPointerCapture(e.pointerId)
    drag.current = { giorno, idx, modo, x0: minDaEvento(e, track), a0: a, b0: b, min: prima.length ? Math.max(...prima) : 0, max: dopo.length ? Math.min(...dopo) : GIORNO, mosso: false }
    setSel({ giorno, idx })
  }

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const m = minDaEvento(e, e.currentTarget)
    // scostamento a scatti di 15′ (non limitato: i limiti si applicano alla fascia)
    const delta = Math.round((m - d.x0) / PASSO) * PASSO
    if (Math.abs(m - d.x0) > 4) d.mosso = true
    const fasce = [...value[d.giorno].fasce]
    if (d.modo === 'crea') {
      const x = Math.max(d.min, Math.min(d.max, snap(m)))
      d.a0 = Math.min(d.x0, x); d.b0 = Math.max(d.x0, x)
      forza(n => n + 1)
      return
    }
    let a = d.a0, b = d.b0
    if (d.modo === 'sposta') { const len = b - a; a = Math.max(d.min, Math.min(d.max - len, d.a0 + delta)); b = a + len }
    if (d.modo === 'inizio') a = Math.max(d.min, Math.min(b - PASSO, d.a0 + delta))
    if (d.modo === 'fine') b = Math.min(d.max, Math.max(a + PASSO, d.b0 + delta))
    d.ultimo = { inizio: toHHMM(a), fine: toHHMM(b) }
    fasce[d.idx] = d.ultimo
    setGiorno(d.giorno, { ...value[d.giorno], fasce })
  }

  const onUp = () => {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (d.modo === 'crea') {
      // Clic senza trascinare = fascia di 1 ora (nello spazio libero)
      let a = d.a0, b = d.b0
      if (!d.mosso || b - a < PASSO) { a = Math.max(d.min, Math.min(d.x0, d.max - 60)); b = Math.min(d.max, a + 60) }
      if (b - a < PASSO) { forza(n => n + 1); return }
      const g = value[d.giorno]
      const fasce = ordina([...g.fasce, { inizio: toHHMM(a), fine: toHHMM(b) }])
      setGiorno(d.giorno, { ...g, attivo: true, fasce })
      setSel({ giorno: d.giorno, idx: fasce.findIndex(f => f.inizio === toHHMM(a)) })
    } else {
      const g = value[d.giorno]
      const corrente = d.ultimo ?? g.fasce[d.idx]
      const fasce = ordina(g.fasce.map((f, k) => (k === d.idx ? corrente : f)))
      setGiorno(d.giorno, { ...g, fasce })
      setSel({ giorno: d.giorno, idx: fasce.findIndex(f => f.inizio === corrente.inizio) })
    }
    forza(n => n + 1)
  }

  const elimina = (giorno: number, idx: number) => {
    const g = value[giorno]
    const fasce = g.fasce.filter((_, k) => k !== idx)
    setGiorno(giorno, { ...g, fasce, attivo: fasce.length > 0 && g.attivo })
    setSel(null)
  }

  const onKey = (e: React.KeyboardEvent, giorno: number, idx: number) => {
    const g = value[giorno]
    const f = g.fasce[idx]
    let a = toMin(f.inizio), b = toMin(f.fine)
    const altre = g.fasce.filter((_, k) => k !== idx)
    const min = Math.max(0, ...altre.map(x => toMin(x.fine)).filter(x => x <= a))
    const max = Math.min(GIORNO, ...altre.map(x => toMin(x.inizio)).filter(x => x >= b))
    const passo = e.key === 'ArrowRight' ? PASSO : e.key === 'ArrowLeft' ? -PASSO : 0
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); elimina(giorno, idx); return }
    if (!passo) return
    e.preventDefault()
    if (e.shiftKey) b = Math.min(max, Math.max(a + PASSO, b + passo))
    else { const len = b - a; a = Math.max(min, Math.min(max - len, a + passo)); b = a + len }
    const fasce = [...g.fasce]; fasce[idx] = { inizio: toHHMM(a), fine: toHHMM(b) }
    setGiorno(giorno, { ...g, fasce })
  }

  const applicaCopia = () => {
    if (!copia) return
    const src = value[copia.da]
    onChange(value.map((g, i) => (copia.a.includes(i) ? { attivo: src.attivo, pausaMin: src.pausaMin, fasce: src.fasce.map(f => ({ ...f })) } : g)))
    setCopia(null)
  }

  const totale = value.reduce((a, g) => a + minutiGiorno(g), 0)
  const s = sel && value[sel.giorno]?.fasce[sel.idx] ? sel : null
  const fasciaSel = s ? value[s.giorno].fasce[s.idx] : null
  const d = drag.current

  return (
    <div className="sett-ora">
      <div className="sett-ora__toolbar">
        <span className="sett-ora__label">Modelli rapidi</span>
        {MODELLI.map(m => (
          <button key={m.label} type="button" className="sett-ora__chip" onClick={() => { onChange(m.giorni()); setSel(null) }}>{m.label}</button>
        ))}
      </div>

      <div className="sett-ora__grid" role="group" aria-label="Orario settimanale">
        <div className="sett-ora__scale" aria-hidden="true">
          <span />
          <div className="sett-ora__ticks">
            {Array.from({ length: SPAN / 120 + 1 }, (_, i) => DA + i * 120).map(m => (
              <span key={m} style={{ ['--x' as any]: pct(m) }}>{String(m / 60).padStart(2, '0')}</span>
            ))}
          </div>
          <span />
        </div>

        {value.map((g, i) => {
          const min = minutiGiorno(g)
          return (
            <div key={GIORNI_SETTIMANA[i]} className={`sett-ora__row${g.attivo ? '' : ' is-off'}`}>
              <button type="button" className={`sett-ora__day${g.attivo ? ' is-on' : ''}`} aria-pressed={g.attivo}
                onClick={() => setGiorno(i, g.attivo ? { ...g, attivo: false } : { ...g, attivo: true, fasce: g.fasce.length ? g.fasce : [{ inizio: '09:00', fine: '13:00' }, { inizio: '14:00', fine: '18:00' }] })}>
                {GIORNI_SETTIMANA[i]}
              </button>

              <div className="sett-ora__track" style={{ ['--ore' as any]: SPAN / 60, ['--notte-a' as any]: pctW(Math.max(0, 360 - DA)), ['--notte-b' as any]: pctW(120) }} onPointerDown={(e) => startCrea(e, i)} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
                <div className="sett-ora__notte sett-ora__notte--a" aria-hidden="true" />
                <div className="sett-ora__notte sett-ora__notte--b" aria-hidden="true" />
                {g.fasce.map((f, k) => {
                  const a = toMin(f.inizio), b = toMin(f.fine)
                  const attiva = s?.giorno === i && s.idx === k
                  return (
                    <div key={k} role="button" tabIndex={0}
                      className={`sett-ora__block${attiva ? ' is-sel' : ''}${g.attivo ? '' : ' is-muted'}`}
                      style={{ ['--a' as any]: pct(a), ['--w' as any]: pctW(b - a) }}
                      aria-label={`${GIORNI_SETTIMANA[i]} dalle ${f.inizio} alle ${f.fine}`}
                      onPointerDown={(e) => startBlocco(e, i, k, 'sposta')}
                      onKeyDown={(e) => onKey(e, i, k)}
                      onFocus={() => setSel({ giorno: i, idx: k })}>
                      <span className="sett-ora__handle sett-ora__handle--a" onPointerDown={(e) => startBlocco(e, i, k, 'inizio')} />
                      {/* fasce strette: solo l'inizio, o niente (l'orario completo è nel dettaglio) */}
                      {b - a >= 75 && <span className="sett-ora__block-txt">{b - a >= 180 ? `${f.inizio}–${f.fine}` : f.inizio}</span>}
                      <span className="sett-ora__handle sett-ora__handle--b" onPointerDown={(e) => startBlocco(e, i, k, 'fine')} />
                    </div>
                  )
                })}
                {d && d.modo === 'crea' && d.giorno === i && d.b0 > d.a0 && (
                  <div className="sett-ora__block is-ghost" style={{ ['--a' as any]: pct(d.a0), ['--w' as any]: pctW(d.b0 - d.a0) }}>
                    <span className="sett-ora__block-txt">{toHHMM(d.a0)}–{toHHMM(d.b0)}</span>
                  </div>
                )}
              </div>

              <span className="sett-ora__ore">{g.attivo && min ? fmtOre(min) : '—'}</span>

              <span className="sett-ora__acts">
                <Tooltip text={`Copia ${GIORNI_SETTIMANA[i]} su altri giorni`}>
                  <button type="button" className="sib-btn sib-btn--icon" aria-label={`Copia ${GIORNI_SETTIMANA[i]}`}
                    onClick={() => setCopia(copia?.da === i ? null : { da: i, a: [] })}>
                    <i className="fa-solid fa-copy" aria-hidden="true" />
                  </button>
                </Tooltip>
              </span>

              {copia?.da === i && (
                <div className="sett-ora__copy">
                  <span>Copia {GIORNI_SETTIMANA[i]} su</span>
                  {GIORNI_SETTIMANA.map((nome, k) => k !== i && (
                    <label key={nome} className={`sett-ora__copy-day${copia.a.includes(k) ? ' is-on' : ''}`}>
                      <input type="checkbox" checked={copia.a.includes(k)}
                        onChange={(e) => setCopia({ ...copia, a: e.target.checked ? [...copia.a, k] : copia.a.filter(x => x !== k) })} />
                      {nome}
                    </label>
                  ))}
                  <button type="button" className="sett-ora__chip" onClick={() => setCopia({ ...copia, a: [0, 1, 2, 3, 4].filter(k => k !== i) })}>Lun–Ven</button>
                  <button type="button" className="sett-ora__chip" onClick={() => setCopia({ ...copia, a: [0, 1, 2, 3, 4, 5, 6].filter(k => k !== i) })}>Tutti</button>
                  <button type="button" className="sib-btn sib-btn--primary sib-btn--sm" disabled={!copia.a.length} onClick={applicaCopia}>Applica</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Dettaglio della fascia selezionata */}
      {s && fasciaSel ? (
        <div className="sett-ora__detail">
          <span className="sett-ora__detail-title"><i className="fa-light fa-clock" aria-hidden="true" /> {GIORNI_SETTIMANA[s.giorno]} · fascia {s.idx + 1} di {value[s.giorno].fasce.length}</span>
          <DatePickerField name="so-in" label="Dalle" type="time" value={fasciaSel.inizio}
            onChange={(e) => { const fasce = [...value[s.giorno].fasce]; fasce[s.idx] = { ...fasciaSel, inizio: e.target.value }; setGiorno(s.giorno, { ...value[s.giorno], fasce }) }} />
          <DatePickerField name="so-out" label="Alle" type="time" value={fasciaSel.fine}
            error={toMin(fasciaSel.fine) <= toMin(fasciaSel.inizio) ? 'Deve finire dopo l’inizio' : undefined}
            onChange={(e) => { const fasce = [...value[s.giorno].fasce]; fasce[s.idx] = { ...fasciaSel, fine: e.target.value }; setGiorno(s.giorno, { ...value[s.giorno], fasce }) }} />
          <InputField name="so-pausa" label={`Pausa non retribuita ${GIORNI_SETTIMANA[s.giorno]} (min)`} type="number" min={0} step={5} value={value[s.giorno].pausaMin}
            onChange={(e) => setGiorno(s.giorno, { ...value[s.giorno], pausaMin: Number(e.target.value) || 0 })} />
          <button type="button" className="sib-btn sib-btn--ghost sett-ora__del" onClick={() => elimina(s.giorno, s.idx)}>
            <i className="fa-light fa-trash-can" aria-hidden="true" /> Elimina fascia
          </button>
        </div>
      ) : (
        <p className="sett-ora__hint">
          <i className="fa-light fa-hand-pointer" aria-hidden="true" /> Trascina sulla barra di un giorno per disegnare una fascia; trascina la fascia o i suoi bordi per modificarla, cliccala per gli orari esatti.
        </p>
      )}

      <div className="sett-ora__total">
        Totale settimanale <strong>{fmtOre(totale)}</strong> su {value.filter(g => g.attivo && minutiGiorno(g) > 0).length} giorni
      </div>
    </div>
  )
}
