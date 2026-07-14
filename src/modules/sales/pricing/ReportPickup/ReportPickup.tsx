import React, { useMemo, useRef, useState, useEffect } from 'react'
import PageHead from '../../../../core/components/PageHead'
import { DateRangeField, SelectField } from '../../../../core/components/form'
import './ReportPickup.sass'

// ─── Pick-Up Camere Vendute (OTB) ────────────────────────────────────────────────
// Matrice: righe = Data Arrivo (data di soggiorno), colonne = Data Osservazione
// (snapshot giornalieri OTB). Ogni cella = camere OTB per quell'arrivo rilevate
// nello snapshot. Colori: verde = incremento vs snapshot precedente, rosso =
// decremento, giallo = data osservazione corrente, rosa = snapshot futuro (dato
// non disponibile). Dati mock deterministici (On The Books).

interface Hotel { id: string; nome: string; camere: number }
const HOTELS: Hotel[] = [
  { id: 'resort',   nome: 'Sibylla Resort',   camere: 120 },
  { id: 'city',     nome: 'Sibylla City',     camere: 90 },
  { id: 'bay',      nome: 'Sibylla Bay',      camere: 70 },
  { id: 'mountain', nome: 'Sibylla Mountain', camere: 45 },
]

const SEGMENTI  = ['Tutti', 'Leisure', 'Business', 'Gruppi', 'MICE']
const CANALI    = ['Tutti', 'Diretto', 'OTA', 'Tour Operator', 'GDS']
const MERCATI   = ['Tutti', 'Italia', 'Germania', 'UK', 'Francia', 'USA']
const TIPO_CAM  = ['Tutte', 'Classic', 'Superior', 'Deluxe', 'Suite']
const PIANI     = ['Tutti', 'BAR', 'Non rimborsabile', 'Semiflex', 'Corporate']

const WD = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']
const DAY = 86400000
const OGGI = new Date(2026, 6, 8) // 08/07/2026 (data osservazione corrente)

const ddmm = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
const parseISO = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1) }
const fmtEur = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
const fmtEur2 = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n)
const fmtNum = (n: number) => new Intl.NumberFormat('it-IT').format(Math.round(n))
const fmtPct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1).replace('.', ',')}%`

export default function ReportPickup({ navigate: _navigate }: { navigate: (p: string) => void }) {
  const [selHotels, setSelHotels] = useState<string[]>([])
  const [hotelOpen, setHotelOpen] = useState(false)
  const [da, setDa] = useState('2026-07-10')
  const [a, setA] = useState('2026-08-06')
  const [segmento, setSegmento] = useState('Tutti')
  const [canale, setCanale] = useState('Tutti')
  const [mercato, setMercato] = useState('Tutti')
  const [tipoCam, setTipoCam] = useState('Tutte')
  const [piano, setPiano] = useState('Tutti')
  const [hoverCol, setHoverCol] = useState<number | null>(null)
  const hotelRef = useRef<HTMLDivElement>(null)

  // Scorrimento orizzontale dei giorni (osservazioni) via slider + pulsanti.
  const wrapRef = useRef<HTMLDivElement>(null)
  const [scrollPct, setScrollPct] = useState(0)
  const applyScroll = (pct: number) => {
    const el = wrapRef.current; if (!el) return
    const max = el.scrollWidth - el.clientWidth
    const p = Math.min(1, Math.max(0, pct))
    if (max > 0) el.scrollLeft = max * p
    setScrollPct(p)
  }
  const onWrapScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const max = el.scrollWidth - el.clientWidth
    setScrollPct(max > 0 ? el.scrollLeft / max : 0)
  }
  const stepScroll = (dir: number) => {
    const el = wrapRef.current; if (!el) return
    const max = el.scrollWidth - el.clientWidth
    if (max <= 0) return
    el.scrollLeft = Math.min(max, Math.max(0, el.scrollLeft + dir * 260))
    setScrollPct(el.scrollLeft / max)
  }

  useEffect(() => {
    const h = (e: MouseEvent) => { if (hotelRef.current && !hotelRef.current.contains(e.target as Node)) setHotelOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const aggregata = selHotels.length === 0
  const camereDisp = (aggregata ? HOTELS : HOTELS.filter((h) => selHotels.includes(h.id))).reduce((s, h) => s + h.camere, 0)
  const hotelLabel = aggregata
    ? 'Tutte le strutture'
    : selHotels.length === 1 ? HOTELS.find((h) => h.id === selHotels[0])!.nome : `${selHotels.length} strutture`
  const toggleHotel = (id: string) => setSelHotels((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])

  // Ogni filtro specifico (≠ Tutti) restringe la domanda OTB.
  const segFactor = [segmento === 'Tutti', canale === 'Tutti', mercato === 'Tutti', tipoCam === 'Tutte', piano === 'Tutti']
    .reduce((f, isAll) => f * (isAll ? 1 : 0.82), 1)

  // Colonne = snapshot di osservazione giornalieri (storico ampio: 24 passati,
  // oggi, 4 futuri). Se superano lo spazio disponibile la matrice scorre.
  const SNAP_PAST = 24, SNAP_FUT = 4
  const snapshots = useMemo(() => Array.from({ length: SNAP_PAST + 1 + SNAP_FUT }, (_, i) => {
    const d = new Date(OGGI.getTime() + (i - SNAP_PAST) * DAY)
    return { date: d, label: ddmm(d), wd: WD[d.getDay()], futuro: d.getTime() > OGGI.getTime(), oggi: d.getTime() === OGGI.getTime() }
  }), [])
  const todayIdx = snapshots.findIndex((s) => s.oggi)

  // Righe = date di arrivo nel periodo selezionato (max 31).
  const arrivi = useMemo(() => {
    const start = parseISO(da), end = parseISO(a)
    const out: { date: Date; label: string; wd: string; finalOcc: number }[] = []
    let t = start.getTime(), guard = 0
    while (t <= end.getTime() && guard < 31) {
      const d = new Date(t)
      const dow = d.getDay()
      const weekend = dow === 5 || dow === 6
      const wave = 0.62 + 0.16 * Math.sin(guard / 3.1) + 0.08 * Math.cos(guard / 6.4) + (weekend ? 0.12 : 0)
      out.push({ date: d, label: ddmm(d), wd: WD[dow], finalOcc: Math.min(0.98, Math.max(0.35, wave)) })
      t += DAY; guard += 1
    }
    return out
  }, [da, a])

  // OTB(arrivo, snapshot): camere prenotate rilevate nello snapshot (curva di pace).
  const otb = (arrivoDate: Date, finalOcc: number, snapIdx: number): number | null => {
    const snap = snapshots[snapIdx]
    if (snap.futuro) return null
    const finalRooms = finalOcc * camereDisp * segFactor
    const daysBefore = Math.max(0, Math.round((arrivoDate.getTime() - snap.date.getTime()) / DAY))
    const pace = Math.min(1, Math.max(0.12, 1 - daysBefore / 55))
    return Math.min(camereDisp, Math.round(finalRooms * pace))
  }

  // ADR deterministico per arrivo.
  const adrOf = (r: { date: Date }, i: number) => 210 + (i % 9) * 8 + ((r.date.getDay() === 5 || r.date.getDay() === 6) ? 35 : 0)

  // KPI aggregati alla data di osservazione corrente (oggi vs snapshot precedente).
  const kpi = useMemo(() => {
    let occ = 0, occPrev = 0, ricavo = 0, lyOcc = 0, adrW = 0
    arrivi.forEach((r, i) => {
      const o = otb(r.date, r.finalOcc, todayIdx) ?? 0
      const p = otb(r.date, r.finalOcc, todayIdx - 1) ?? 0
      const adr = adrOf(r, i)
      occ += o; occPrev += p; ricavo += o * adr; adrW += adr
      lyOcc += Math.round(o * (0.88 + ((i * 7) % 20) / 100)) // LY OTB deterministico
    })
    const disp = camereDisp * arrivi.length
    const adr = arrivi.length ? adrW / arrivi.length : 0
    return {
      occ, disp,
      occPct: disp ? (occ / disp) * 100 : 0,
      pickupAbs: occ - occPrev,
      pickupPct: occPrev ? ((occ - occPrev) / occPrev) * 100 : 0,
      adr, ricavo,
      revpar: disp ? ricavo / disp : 0,
      lyOcc, tyVsLy: lyOcc ? ((occ - lyOcc) / lyOcc) * 100 : 0,
    }
  }, [arrivi, camereDisp, segFactor, todayIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  const KPI: { label: string; icon: string; value: string; delta?: number }[] = [
    { label: 'Camere occupate', icon: 'bed-front', value: fmtNum(kpi.occ) },
    { label: 'Occupazione %', icon: 'gauge-high', value: `${kpi.occPct.toFixed(1).replace('.', ',')}%` },
    { label: 'Pick-Up assoluto', icon: 'arrow-trend-up', value: `${kpi.pickupAbs > 0 ? '+' : ''}${fmtNum(kpi.pickupAbs)}`, delta: kpi.pickupPct },
    { label: 'ADR', icon: 'chart-line', value: fmtEur2(kpi.adr) },
    { label: 'Ricavo camere', icon: 'euro-sign', value: fmtEur(kpi.ricavo) },
    { label: 'RevPAR', icon: 'sack-dollar', value: fmtEur2(kpi.revpar) },
    { label: 'TY vs LY', icon: 'calendar-days', value: fmtPct(kpi.tyVsLy), delta: kpi.tyVsLy },
  ]

  const cellClass = (r: { date: Date; finalOcc: number }, i: number, snapIdx: number): string => {
    const snap = snapshots[snapIdx]
    if (snap.futuro) return 'rp-cell rp-cell--future'
    if (snap.oggi) return 'rp-cell rp-cell--today'
    const cur = otb(r.date, r.finalOcc, snapIdx)
    const prev = snapIdx > 0 ? otb(r.date, r.finalOcc, snapIdx - 1) : null
    if (cur == null || prev == null) return 'rp-cell'
    if (cur > prev) return 'rp-cell rp-cell--up'
    if (cur < prev) return 'rp-cell rp-cell--down'
    return 'rp-cell rp-cell--flat'
  }

  return (
    <div className="rp">
      <PageHead
        title="Report Pick-Up"
        subtitle="Evoluzione delle prenotazioni On The Books (OTB): camere vendute per data di arrivo confrontate tra le diverse date di osservazione."
      />

      {/* ── Filtri ──────────────────────────────────────────────────────────── */}
      <div className="rp__filters">
        <div className="rp__field" ref={hotelRef}>
          <label>Struttura</label>
          <button type="button" className={`rp__hotel-btn${hotelOpen ? ' is-open' : ''}`} onClick={() => setHotelOpen((v) => !v)}>
            <i className="fa-regular fa-hotel" />
            <span>{hotelLabel}</span>
            <i className={`fa-solid fa-chevron-${hotelOpen ? 'up' : 'down'} rp__hotel-chev`} />
          </button>
          {hotelOpen && (
            <div className="rp__hotel-pop">
              <label className="rp__hotel-opt">
                <input type="checkbox" className="sib-checkbox" checked={aggregata} onChange={() => setSelHotels([])} />
                <span>Tutte le strutture <em>(aggregata)</em></span>
              </label>
              <div className="rp__hotel-sep" />
              {HOTELS.map((h) => (
                <label key={h.id} className="rp__hotel-opt">
                  <input type="checkbox" className="sib-checkbox" checked={selHotels.includes(h.id)} onChange={() => toggleHotel(h.id)} />
                  <span>{h.nome} <em>({h.camere} cam.)</em></span>
                </label>
              ))}
            </div>
          )}
        </div>
        <DateRangeField label="Periodo (date di arrivo)" nameFrom="da" nameTo="a" valueFrom={da} valueTo={a}
          onChangeFrom={(e) => setDa(e.target.value)} onChangeTo={(e) => setA(e.target.value)} />
        <SelectField label="Segmento" name="segmento" value={segmento} onChange={(e) => setSegmento(e.target.value)} options={SEGMENTI.map((o) => ({ value: o, label: o }))} />
        <SelectField label="Canale" name="canale" value={canale} onChange={(e) => setCanale(e.target.value)} options={CANALI.map((o) => ({ value: o, label: o }))} />
        <SelectField label="Mercato" name="mercato" value={mercato} onChange={(e) => setMercato(e.target.value)} options={MERCATI.map((o) => ({ value: o, label: o }))} />
        <SelectField label="Tipologia camera" name="tipoCam" value={tipoCam} onChange={(e) => setTipoCam(e.target.value)} options={TIPO_CAM.map((o) => ({ value: o, label: o }))} />
        <SelectField label="Piano tariffario" name="piano" value={piano} onChange={(e) => setPiano(e.target.value)} options={PIANI.map((o) => ({ value: o, label: o }))} />
      </div>

      {/* ── Legenda colori ──────────────────────────────────────────────────── */}
      <div className="rp__legend">
        <span><i className="rp__sw rp__sw--up" /> Incremento OTB</span>
        <span><i className="rp__sw rp__sw--down" /> Decremento OTB</span>
        <span><i className="rp__sw rp__sw--today" /> Osservazione corrente</span>
        <span><i className="rp__sw rp__sw--future" /> Dato futuro / non disponibile</span>
      </div>

      {/* ── Matrice Pick-Up ─────────────────────────────────────────────────── */}
      <section className="rp__card rp__card--matrix">
        <div className="rp__matrix-head">
          <h2 className="rp__card-title">Matrice Pick-Up OTB · camere per data di arrivo × data di osservazione</h2>
          <div className="rp__daynav">
            <button type="button" className="rp__daynav-btn" onClick={() => stepScroll(-1)} aria-label="Giorni precedenti">
              <i className="fa-solid fa-chevron-left" aria-hidden="true" />
            </button>
            <input type="range" min={0} max={1000} step={1} value={Math.round(scrollPct * 1000)}
              onChange={(e) => applyScroll(Number(e.target.value) / 1000)} aria-label="Scorri i giorni di osservazione" />
            <button type="button" className="rp__daynav-btn" onClick={() => stepScroll(1)} aria-label="Giorni successivi">
              <i className="fa-solid fa-chevron-right" aria-hidden="true" />
            </button>
          </div>
        </div>
        <p className="rp__note">
          <i className="fa-light fa-circle-info" /> Camere Vendute = somma camere delle prenotazioni con Data Creazione ≤ Data Osservazione e non cancellate entro tale data, per la Data Arrivo. Fonte: prenotazioni On The Books. Le colonne Data arrivo / Cam. disp. e Occ. % / Pick-Up restano fisse; scorri i giorni con lo slider.
        </p>
        <div className="rp__matrix-wrap" ref={wrapRef} onScroll={onWrapScroll}>
          <table className="rp__matrix" onMouseLeave={() => setHoverCol(null)}>
            <thead>
              <tr>
                <th className="rp__sticky rp__sticky--arr">Data arrivo</th>
                <th className="rp__sticky rp__sticky--disp rp__num">Cam. disp.</th>
                {snapshots.map((s, i) => (
                  <th key={i}
                    className={`rp__num rp__obs-th${s.oggi ? ' is-today' : ''}${s.futuro ? ' is-future' : ''}${i === hoverCol ? ' is-hovercol' : ''}`}
                    onMouseEnter={() => setHoverCol(i)}>
                    <span className="rp__obs-wd">{s.wd}</span>{s.label}
                  </th>
                ))}
                <th className="rp__num rp__end-th rp__end--occ">Occ. %</th>
                <th className="rp__num rp__end-th rp__end--pu">Pick-Up</th>
              </tr>
            </thead>
            <tbody>
              {arrivi.map((r, i) => {
                const oOggi = otb(r.date, r.finalOcc, todayIdx) ?? 0
                const oPrev = otb(r.date, r.finalOcc, todayIdx - 1) ?? 0
                const pu = oOggi - oPrev
                const occPct = camereDisp ? (oOggi / camereDisp) * 100 : 0
                return (
                  <tr key={i}>
                    <td className="rp__sticky rp__sticky--arr" onMouseEnter={() => setHoverCol(null)}><span className="rp__arr-wd">{r.wd}</span>{r.label}</td>
                    <td className="rp__sticky rp__sticky--disp rp__num rp__muted" onMouseEnter={() => setHoverCol(null)}>{camereDisp}</td>
                    {snapshots.map((s, si) => {
                      const v = otb(r.date, r.finalOcc, si)
                      const prev = si > 0 && !s.futuro ? otb(r.date, r.finalOcc, si - 1) : null
                      const dir = (!s.futuro && !s.oggi && v != null && prev != null) ? (v > prev ? 'up' : v < prev ? 'down' : '') : ''
                      return (
                        <td key={si}
                          className={`${cellClass(r, i, si)} rp__num${si === hoverCol ? ' is-hovercol' : ''}`}
                          onMouseEnter={() => setHoverCol(si)}>
                          {v == null ? '—' : (
                            <span className="rp-cell__v">
                              {fmtNum(v)}
                              {dir && <i className={`fa-solid fa-caret-${dir === 'up' ? 'up' : 'down'} rp-cell__arw`} aria-hidden="true" />}
                            </span>
                          )}
                        </td>
                      )
                    })}
                    <td className="rp__num rp__end-td rp__end--occ" onMouseEnter={() => setHoverCol(null)}>
                      <span className="rp__occ">
                        <span className="rp__occ-bar"><span className="rp__occ-fill" style={{ width: `${Math.min(100, occPct)}%` }} /></span>
                        <span className="rp__occ-num">{occPct.toFixed(0)}%</span>
                      </span>
                    </td>
                    <td className={`rp__num rp__end-td rp__end--pu rp__pu rp__pu--${pu >= 0 ? 'up' : 'down'}`} onMouseEnter={() => setHoverCol(null)}>{pu > 0 ? '+' : ''}{fmtNum(pu)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── KPI (alla data di osservazione corrente) ────────────────────────── */}
      <section className="rp__card">
        <h2 className="rp__card-title">Indicatori chiave · osservazione {ddmm(OGGI)}</h2>
        <div className="rp__kpis">
          {KPI.map((k) => (
            <div key={k.label} className="sib-stat-card rp__kpi">
              <div className="rp__kpi-top">
                <span className="rp__kpi-ico"><i className={`fa-light fa-${k.icon}`} /></span>
                <span className="sib-stat-card__label">{k.label}</span>
              </div>
              <span className="sib-stat-card__value">{k.value}</span>
              {k.delta != null && (
                <span className={`rp__kpi-delta rp__pu--${k.delta >= 0 ? 'up' : 'down'}`}>
                  <i className={`fa-solid fa-arrow-${k.delta >= 0 ? 'up' : 'down'}`} /> {fmtPct(k.delta)}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
