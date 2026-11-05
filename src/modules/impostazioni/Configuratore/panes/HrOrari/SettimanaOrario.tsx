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
  const d = drag.current

  // ── Inserimento manuale ──────────────────────────────────────────────────
  const setFascia = (i: number, k: number, p: Partial<IntervalloOrario>) => {
    const g = value[i]
    setGiorno(i, { ...g, fasce: g.fasce.map((f, x) => (x === k ? { ...f, ...p } : f)) })
  }
  const aggiungiFascia = (i: number) => {
    const g = value[i]
    const fine = g.fasce.length ? Math.max(...g.fasce.map(f => toMin(f.fine))) : 0
    let a = g.fasce.length ? Math.min(fine + 60, GIORNO - 60) : 9 * 60
    let b = Math.min(GIORNO, a + 4 * 60)
    if (b - a < PASSO) { a = GIORNO - 60; b = GIORNO }
    setGiorno(i, { ...g, attivo: true, fasce: [...g.fasce, { inizio: toHHMM(a), fine: toHHMM(b) }] })
  }
  const attivaGiorno = (i: number, on: boolean) => {
    const g = value[i]
    setGiorno(i, on ? { ...g, attivo: true, fasce: g.fasce.length ? g.fasce : [{ inizio: '09:00', fine: '13:00' }, { inizio: '14:00', fine: '18:00' }] } : { ...g, attivo: false })
  }
  /** Fascia non valida: fine non successiva all'inizio o sovrapposta a un'altra dello stesso giorno. */
  const erroreFascia = (g: FasciaGiorno, k: number) => {
    const f = g.fasce[k]
    const a = toMin(f.inizio), b = toMin(f.fine)
    if (!f.inizio || !f.fine || b <= a) return 'L’orario di fine deve essere dopo l’inizio'
    if (g.fasce.some((x, j) => j !== k && toMin(x.inizio) < b && toMin(x.fine) > a)) return 'Si sovrappone a un’altra fascia'
    return ''
  }

  return (
    <div className="sett-ora">
      <div className="sett-ora__toolbar">
        <span className="sett-ora__label">Modelli rapidi</span>
        {MODELLI.map(m => (
          <button key={m.label} type="button" className="sett-ora__chip" onClick={() => { onChange(m.giorni()); setSel(null) }}>{m.label}</button>
        ))}
      </div>

      <div className="sett-ora__grid" role="group" aria-label="Orario settimanale">
        <div className="sett-ora__head" aria-hidden="true">
          <span>Giorno</span><span>Fasce di lavoro (dalle – alle)</span><span>Pausa</span><span>Ore</span><span />
        </div>

        {value.map((g, i) => {
          const min = minutiGiorno(g)
          return (
            <div key={GIORNI_SETTIMANA[i]} className={`sett-ora__row${g.attivo ? '' : ' is-off'}`}>
              <Tooltip text={g.attivo ? `Segna ${GIORNI_SETTIMANA[i]} come riposo` : `Imposta l’orario di ${GIORNI_SETTIMANA[i]}`}>
                <button type="button" className={`sett-ora__day${g.attivo ? ' is-on' : ''}`} aria-pressed={g.attivo}
                  aria-label={g.attivo ? `Segna ${GIORNI_SETTIMANA[i]} come riposo` : `Imposta l’orario di ${GIORNI_SETTIMANA[i]}`}
                  onClick={() => attivaGiorno(i, !g.attivo)}>
                  {GIORNI_SETTIMANA[i]}
                </button>
              </Tooltip>

              <div className="sett-ora__fasce">
                {!g.attivo ? (
                  <span className="sett-ora__riposo">
                    Riposo
                    <button type="button" className="sib-btn sib-btn--ghost sib-btn--sm" onClick={() => attivaGiorno(i, true)}>
                      <i className="fa-light fa-circle-plus" aria-hidden="true" /> Imposta orario
                    </button>
                  </span>
                ) : (
                  <>
                    {g.fasce.map((f, k) => {
                      const err = erroreFascia(g, k)
                      return (
                        <span key={k} className={`sett-ora__fascia${err ? ' is-err' : ''}${s?.giorno === i && s.idx === k ? ' is-sel' : ''}`}>
                          <DatePickerField name={`so-${i}-${k}-in`} type="time" value={f.inizio} className="sett-ora__time"
                            onChange={(e) => setFascia(i, k, { inizio: e.target.value })} />
                          <span className="sett-ora__dash">–</span>
                          <DatePickerField name={`so-${i}-${k}-out`} type="time" value={f.fine} className="sett-ora__time"
                            onChange={(e) => setFascia(i, k, { fine: e.target.value })} />
                          {err && (
                            <Tooltip text={err}>
                              <i className="fa-solid fa-circle-exclamation sett-ora__err" role="img" aria-label={err} />
                            </Tooltip>
                          )}
                          <Tooltip text="Togli questa fascia">
                            <button type="button" className="sett-ora__x" aria-label={`Togli la fascia ${f.inizio}–${f.fine} di ${GIORNI_SETTIMANA[i]}`} onClick={() => elimina(i, k)}>
                              <i className="fa-solid fa-xmark" aria-hidden="true" />
                            </button>
                          </Tooltip>
                        </span>
                      )
                    })}
                    {g.fasce.length < 4 && (
                      <button type="button" className="sett-ora__add" onClick={() => aggiungiFascia(i)}>
                        <i className="fa-light fa-plus" aria-hidden="true" /> fascia
                      </button>
                    )}
                  </>
                )}
              </div>

              <span className="sett-ora__pausa">
                {g.attivo && (
                  <InputField name={`so-${i}-pausa`} type="number" min={0} step={5} value={g.pausaMin || ''} placeholder="0" dense
                    ariaLabel={`Pausa non retribuita di ${GIORNI_SETTIMANA[i]} in minuti`}
                    onChange={(e) => setGiorno(i, { ...g, pausaMin: Number(e.target.value) || 0 })} />
                )}
                {g.attivo && <span className="sett-ora__unit">min</span>}
              </span>

              <span className="sett-ora__ore">{g.attivo && min ? fmtOre(min) : '—'}</span>

              <span className="sett-ora__acts">
                <Tooltip text={`Copia ${GIORNI_SETTIMANA[i]} su altri giorni`}>
                  <button type="button" className="sib-btn sib-btn--icon" aria-label={`Copia ${GIORNI_SETTIMANA[i]}`}
                    onClick={() => setCopia(copia?.da === i ? null : { da: i, a: [] })}>
                    <i className="fa-solid fa-copy" aria-hidden="true" />
                  </button>
                </Tooltip>
              </span>

              {/* Barra grafica del giorno: riflette le fasce e si può trascinare */}
              <div className="sett-ora__track" style={{ ['--ore' as any]: SPAN / 60, ['--notte-a' as any]: pctW(Math.max(0, 360 - DA)), ['--notte-b' as any]: pctW(120) }}
                onPointerDown={(e) => startCrea(e, i)} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
                <div className="sett-ora__notte sett-ora__notte--a" aria-hidden="true" />
                <div className="sett-ora__notte sett-ora__notte--b" aria-hidden="true" />
                {Array.from({ length: SPAN / 120 + 1 }, (_, x) => DA + x * 120).map(m => (
                  <span key={m} className="sett-ora__tick" style={{ ['--x' as any]: pct(m) }} aria-hidden="true">{String(m / 60).padStart(2, '0')}</span>
                ))}
                {g.fasce.map((f, k) => {
                  const a = toMin(f.inizio), b = toMin(f.fine)
                  if (!(b > a)) return null
                  const attiva = s?.giorno === i && s.idx === k
                  return (
                    <div key={k} role="button" tabIndex={0}
                      className={`sett-ora__block${attiva ? ' is-sel' : ''}${g.attivo ? '' : ' is-muted'}`}
                      style={{ ['--a' as any]: pct(Math.max(DA, a)), ['--w' as any]: pctW(b - Math.max(DA, a)) }}
                      aria-label={`${GIORNI_SETTIMANA[i]} dalle ${f.inizio} alle ${f.fine}`}
                      onPointerDown={(e) => startBlocco(e, i, k, 'sposta')}
                      onKeyDown={(e) => onKey(e, i, k)}
                      onFocus={() => setSel({ giorno: i, idx: k })}>
                      <span className="sett-ora__handle sett-ora__handle--a" onPointerDown={(e) => startBlocco(e, i, k, 'inizio')} />
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

      <div className="sett-ora__foot">
        <p className="sett-ora__hint">
          <i className="fa-light fa-keyboard" aria-hidden="true" /> Scrivi gli orari di ogni fascia, oppure trascina sulla barra del giorno: si disegna una fascia, si sposta, se ne allungano i bordi. Clic sul giorno = lavorativo / riposo.
        </p>
        <span className="sett-ora__total">Totale settimanale <strong>{fmtOre(totale)}</strong> su {value.filter(g => g.attivo && minutiGiorno(g) > 0).length} giorni</span>
      </div>
    </div>
  )
}
