import React, { useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import Tooltip from '../../../../core/components/Tooltip'
import AlertBanner from '../../../../core/components/AlertBanner'
import Modal from '../../../../core/components/Modal'
import Tabs from '../../../../core/components/Tabs'
import { SelectField, DateRangeField, InputField } from '../../../../core/components/form'
import Ico from '../../../../core/icons/Ico'
import './TariffeDisponibilita.sass'
import { useStrutturaCorrente, useStrutturaPagina } from '../../../../hooks/useStrutturaCorrente'

// Date demo relative a oggi.
const isoFra = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

// ─── DATI DI ESEMPIO ──────────────────────────────────────────────────────────
const MONTHS_IT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']


const INTERVALLI = [
  { v: '14', label: '2 settimane', days: 14 },
  { v: '30', label: '1 mese',      days: 30 },
  { v: '90', label: '3 mesi',      days: 90 },
]

interface Camera { id: string; nome: string; unit: number; base: number; riferimento?: boolean }
const CAMERE: Camera[] = [
  { id: 'sng', nome: 'SINGOLA CLASSIC',        unit: 12, base: 140 },
  { id: 'dbl', nome: 'DOPPIA CLASSIC',         unit: 18, base: 165 },
  { id: 'tpl', nome: 'TRIPLA CLASSIC',         unit: 8,  base: 175, riferimento: true },
  { id: 'mat', nome: 'MATRIMONIALE SUPERIOR',  unit: 10, base: 160 },
  { id: 'qud', nome: 'QUADRUPLA',              unit: 6,  base: 250 },
]

const CANALI = ['Booking.com', 'Expedia', 'Airbnb', 'Sito diretto', 'Hotelbeds']
const PARTNER = ['TRAVCO', 'Hotelbeds', 'GTA', 'WebBeds', 'Restel']
const REF_ROOM = CAMERE.find(r => r.riferimento)
// Canali del Market Engine ("Tutti" è il selettore in blocco, non un canale).
const ME_CANALI: { id: string; sigla?: string; icon?: string; tone: string }[] = [
  { id: 'Booking.com',  sigla: 'B', tone: 'booking' },
  { id: 'Expedia',      sigla: 'E', tone: 'expedia' },
  { id: 'Sito diretto', icon: 'fa-globe', tone: 'diretto' },
]
const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())

// Finestra fissa di giorni visibili: cambiando intervallo NON si rimpiccioliscono
// le celle, ma si scorre il range con le frecce avanti/indietro.
const PAGE = 14

// ─── HELPER DETERMINISTICI ──────────────────────────────────────────────────────
function seedOf(id: string, n: number) {
  let h = 2166136261
  const s = id + '#' + n
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
function rnd(id: string, n: number) { return (seedOf(id, n) % 1000) / 1000 }
function priceOf(room: Camera, n: number) { return room.base + Math.round(rnd(room.id, n) * 60) - 12 }
function dispOf(room: Camera, n: number) { return Math.max(0, room.unit - Math.floor(rnd(room.id, n + 99) * (room.unit + 1))) }
function alloOf(room: Camera, n: number) { return 1 + (seedOf(room.id, n + 5) % 6) }
function isClosed(room: Camera, n: number) { return rnd(room.id, n + 7) > 0.93 }
function isPartial(room: Camera, n: number) { return !isClosed(room, n) && rnd(room.id, n + 31) > 0.87 }
function occDay(n: number) {
  let tot = 0, occ = 0
  CAMERE.forEach(r => { tot += r.unit; occ += (r.unit - dispOf(r, n)) })
  return tot ? (occ / tot) * 100 : 0
}
function occupateOf(room: Camera, n: number) { return seedOf(room.id, n + 17) % (room.unit + 1) }
function batteryFor(pct: number): { ico: string; col: string } {
  if (pct < 5)  return { ico: 'battery-empty', col: 'var(--color-error)' }
  if (pct < 30) return { ico: 'battery-low',   col: 'var(--color-error)' }
  if (pct < 55) return { ico: 'battery-mid',   col: 'var(--color-warning)' }
  if (pct < 80) return { ico: 'battery-high',  col: 'var(--color-success)' }
  return { ico: 'battery-full', col: 'var(--color-success)' }
}

function addDays(iso: string, d: number) {
  const dt = new Date(iso + 'T00:00:00')
  dt.setDate(dt.getDate() + d)
  return dt
}
const fmtPrice = (n: number) => n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

const UTENTI = ['Mario Rossi', 'Sistema', 'Anna Verdi', 'Luca Bianchi']
interface HistRow { tipo: string; valore: string; canale: string; data: string; utente: string; errore: string }
function histOf(room: Camera, n: number): HistRow[] {
  const s = seedOf(room.id, n)
  const gg = String(10 + (s % 18)).padStart(2, '0')
  const hh = String(8 + (s % 11)).padStart(2, '0')
  const mm = String(s % 60).padStart(2, '0')
  const rows: HistRow[] = [
    { tipo: 'tariffa', valore: priceOf(room, n).toFixed(2), canale: '', data: `${gg}/02 - ${hh}:${mm}`, utente: UTENTI[s % UTENTI.length], errore: '' },
  ]
  if (s % 2 === 0) {
    rows.push({ tipo: 'disponibilità', valore: String(alloOf(room, n)), canale: 'Booking.com', data: `${gg}/02 - 0${(s % 7)}:${mm}`, utente: UTENTI[(s + 1) % UTENTI.length], errore: '' })
  }
  return rows
}

// ─── CHECKBOX STILE VERCEL ──────────────────────────────────────────────────────
function VCheck({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="td-vcheck">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="td-vcheck__box">{checked && <Ico n="check" s={11} c="#fff" w="solid" />}</span>
      <span className="td-vcheck__label">{label}</span>
    </label>
  )
}

// ─── HELPER MARKET ENGINE ────────────────────────────────────────────────────────
type Sel = Record<string, boolean>
const allOn = (ids: string[]): Sel => Object.fromEntries(ids.map(i => [i, true]))
const contaSel = (s: Sel) => Object.values(s).filter(Boolean).length
const fmtGiorno = (iso: string) => { const [, m, d] = iso.split('-'); return `${Number(d)} ${MONTHS_IT[Number(m) - 1]}` }
const nottiTra = (dal: string, al: string) => Math.max(0, Math.round((new Date(al).getTime() - new Date(dal).getTime()) / 86400000))

// Chip selezionabile (camere, canali, strutture).
function MeChip({ on, onClick, children, sub, mark }: { on: boolean; onClick: () => void; children: React.ReactNode; sub?: string; mark?: React.ReactNode }) {
  return (
    <button type="button" className={`me3-chip${on ? ' me3-chip--on' : ''}`} onClick={onClick} aria-pressed={on}>
      {mark}
      <span className="me3-chip__txt">
        <span className="me3-chip__label">{children}</span>
        {sub && <span className="me3-chip__sub">{sub}</span>}
      </span>
      <span className="me3-chip__tick"><i className="fa-solid fa-check" /></span>
    </button>
  )
}

// Controllo segmentato (Apri/Chiudi, ambito canali…).
function MeSegmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { v: T; label: string; icon?: string }[] }) {
  return (
    <div className="me3-seg" role="radiogroup">
      {options.map(o => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v}
          className={`me3-seg__opt${value === o.v ? ' me3-seg__opt--on' : ''}`} onClick={() => onChange(o.v)}>
          {o.icon && <i className={`fa-solid ${o.icon}`} />}{o.label}
        </button>
      ))}
    </div>
  )
}

// Canali selezionati: "Tutti" accende/spegne in blocco, e si riaccende da solo quando
// tutti i singoli canali sono attivi.
function CanaliSelezionati({ value, onChange }: { value: Sel; onChange: (v: Sel) => void }) {
  const ids = ME_CANALI.map(c => c.id)
  const tutti = ids.every(i => value[i])
  return (
    <div className="me3-field me3-field--full">
      <span className="me3-field__label">Canali selezionati <span className="me3-field__count">{tutti ? 'tutti' : `${contaSel(value)} di ${ids.length}`}</span></span>
      <div className="me3-chips me3-chips--canali">
        <MeChip on={tutti} onClick={() => onChange(tutti ? {} : allOn(ids))}
          mark={<span className="me3-chip__mark me3-chip__mark--all"><i className="fa-solid fa-layer-group" /></span>}>
          Tutti
        </MeChip>
        {ME_CANALI.map(c => (
          <MeChip key={c.id} on={!!value[c.id]} onClick={() => onChange({ ...value, [c.id]: !value[c.id] })}
            mark={<span className={`me3-chip__mark me3-chip__mark--${c.tone}`}>{c.icon ? <i className={`fa-solid ${c.icon}`} /> : c.sigla}</span>}>
            {c.id}
          </MeChip>
        ))}
      </div>
    </div>
  )
}

// Riquadro operazione con interruttore: il corpo si apre quando è attiva.
function MeOp({ icon, title, desc, on, onToggle, children }: { icon: string; title: string; desc: string; on: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <section className={`me3-op${on ? ' me3-op--on' : ''}`}>
      <button type="button" className="me3-op__head" onClick={onToggle} aria-expanded={on}>
        <span className="me3-op__ico"><i className={`fa-solid ${icon}`} /></span>
        <span className="me3-op__txt">
          <span className="me3-op__title">{title}</span>
          <span className="me3-op__desc">{desc}</span>
        </span>
        <span className={`me3-switch${on ? ' me3-switch--on' : ''}`} role="switch" aria-checked={on}><span /></span>
      </button>
      {on && <div className="me3-op__body">{children}</div>}
    </section>
  )
}

// ─── MARKET ENGINE MODAL ──────────────────────────────────────────────────────
function MarketEngineModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState('disp')
  const [dal, setDal] = useState(() => isoFra(0))
  const [al, setAl]   = useState(() => isoFra(7))
  const notti = nottiTra(dal, al)
  const preset = (da: number, n: number) => { setDal(isoFra(da)); setAl(isoFra(da + n)) }
  // Strutture del cliente corrente.
  const { elenco: STRUTTURE } = useStrutturaCorrente()

  // Tipo camera
  const [selRooms, setSelRooms] = useState<Sel>({})
  const nRooms = CAMERE.filter(r => selRooms[r.id]).length
  const allRooms = nRooms === CAMERE.length
  const toggleAllRooms = () => setSelRooms(allRooms ? {} : allOn(CAMERE.map(r => r.id)))
  const toggleRoom = (id: string) => setSelRooms(s => ({ ...s, [id]: !s[id] }))

  // Operazioni — Disponibilità
  const [impDisp, setImpDisp] = useState(true)
  const [mercato, setMercato] = useState('')
  const [dispCanali, setDispCanali] = useState<Sel>(() => allOn(ME_CANALI.map(c => c.id)))
  // Restrizioni
  const [impRestr, setImpRestr] = useState(true)
  const [restrAz, setRestrAz] = useState<'apri' | 'chiudi'>('chiudi')
  const [checkIn, setCheckIn] = useState(false)
  const [checkOut, setCheckOut] = useState(false)
  const [strutture, setStrutture] = useState<Sel>({})
  // Minimum-LOS
  const [impLos, setImpLos] = useState(false)
  const [losScope, setLosScope] = useState<'tutti' | 'sel'>('tutti')
  const [losCanali, setLosCanali] = useState<Sel>(() => allOn(ME_CANALI.map(c => c.id)))
  const [losVal, setLosVal] = useState(1)

  // Tariffe
  const [tariffeCanali, setTariffeCanali] = useState<Sel>(() => allOn(ME_CANALI.map(c => c.id)))
  const barOptions = useMemo(
    () => (REF_ROOM ? Array.from(new Set(Array.from({ length: 30 }, (_, i) => priceOf(REF_ROOM, i)))).sort((a, b) => a - b) : []),
    [])
  const [prezzi, setPrezzi] = useState<Record<string, number>>({})
  const tariffeRooms = nRooms ? CAMERE.filter(r => selRooms[r.id]) : CAMERE

  // Riepilogo per il footer e abilitazione di "Applica".
  const nOps = [impDisp, impRestr, impLos].filter(Boolean).length
  const pronto = tab === 'disp' ? nRooms > 0 && nOps > 0 : contaSel(tariffeCanali) > 0
  const riepilogo = tab === 'disp'
    ? (nRooms === 0 ? 'Seleziona almeno una camera' : nOps === 0 ? 'Attiva almeno un\'operazione'
      : `${nOps} ${nOps === 1 ? 'operazione' : 'operazioni'} su ${nRooms} ${nRooms === 1 ? 'camera' : 'camere'}`)
    : `${tariffeRooms.length} tariffe su ${contaSel(tariffeCanali)} ${contaSel(tariffeCanali) === 1 ? 'canale' : 'canali'}`

  return (
    <Modal open={open} onClose={onClose} title="Market Engine" size="lg" className="me-modal me3-modal">
      <Tabs
        tabs={[{ id: 'disp', label: 'Disponibilità' }, { id: 'tariffe', label: 'Tariffe' }]}
        active={tab}
        onChange={setTab}
        className="me-modal__tabs"
      />

      <div className="me-modal__body me3">
        {/* 1 · Periodo */}
        <section className="me3-step">
          <header className="me3-step__head">
            <span className="me3-step__n">1</span>
            <h4 className="me3-step__title">Periodo</h4>
            <span className="me3-step__aside"><i className="fa-solid fa-moon" /> {notti} {notti === 1 ? 'notte' : 'notti'}</span>
          </header>
          <div className="me3-period">
            <DateRangeField nameFrom="me-dal" nameTo="me-al" valueFrom={dal} valueTo={al}
              onChangeFrom={e => setDal(e.target.value)} onChangeTo={e => setAl(e.target.value)} className="me3-period__range" />
            <div className="me3-presets">
              <button type="button" className="me3-preset" onClick={() => preset(0, 1)}>Oggi</button>
              <button type="button" className="me3-preset" onClick={() => preset(0, 7)}>7 giorni</button>
              <button type="button" className="me3-preset" onClick={() => preset(0, 30)}>30 giorni</button>
              <button type="button" className="me3-preset" onClick={() => preset(0, 90)}>3 mesi</button>
            </div>
          </div>
        </section>

        {/* 2 · Tipo camera */}
        <section className="me3-step">
          <header className="me3-step__head">
            <span className="me3-step__n">2</span>
            <h4 className="me3-step__title">Tipo camera</h4>
            <span className="me3-step__aside">{nRooms} di {CAMERE.length}</span>
            <button type="button" className="me3-link" onClick={toggleAllRooms}>{allRooms ? 'Deseleziona tutte' : 'Seleziona tutte'}</button>
          </header>
          <div className="me3-chips me3-chips--rooms">
            {CAMERE.map(r => (
              <MeChip key={r.id} on={!!selRooms[r.id]} onClick={() => toggleRoom(r.id)} sub={`${r.unit} unità · da ${fmtPrice(r.base)}`}>
                {titleCase(r.nome)}{r.riferimento && <span className="me3-ref">BAR</span>}
              </MeChip>
            ))}
          </div>
          <p className="me3-warn"><i className="fa-solid fa-triangle-exclamation" /> Codice canale mancante per alcune camere: verifica la mappatura prima di applicare.</p>
        </section>

        {tab === 'disp' ? (
          /* 3 · Operazioni */
          <section className="me3-step">
            <header className="me3-step__head">
              <span className="me3-step__n">3</span>
              <h4 className="me3-step__title">Operazioni</h4>
              <span className="me3-step__aside">{nOps} attive</span>
            </header>

            <div className="me3-ops">
              <MeOp icon="fa-bed" title="Imposta Disponibilità" desc="Allotment da pubblicare sui canali scelti"
                on={impDisp} onToggle={() => setImpDisp(v => !v)}>
                <InputField name="me-mercato" label="Mercato" placeholder="Es. IT, DE, UK" value={mercato}
                  onChange={e => setMercato(e.target.value)} className="me3-mercato" />
                <CanaliSelezionati value={dispCanali} onChange={setDispCanali} />
              </MeOp>

              <MeOp icon="fa-lock" title="Imposta Restrizioni" desc="Apri o chiudi la vendita, anche solo in arrivo o partenza"
                on={impRestr} onToggle={() => setImpRestr(v => !v)}>
                <div className="me3-field">
                  <span className="me3-field__label">Vendita</span>
                  <MeSegmented value={restrAz} onChange={setRestrAz}
                    options={[{ v: 'apri', label: 'Apri', icon: 'fa-lock-open' }, { v: 'chiudi', label: 'Chiudi', icon: 'fa-lock' }]} />
                </div>
                <div className="me3-field">
                  <span className="me3-field__label">Chiudi anche</span>
                  <div className="me3-chips">
                    <MeChip on={checkIn} onClick={() => setCheckIn(v => !v)}>Check-in</MeChip>
                    <MeChip on={checkOut} onClick={() => setCheckOut(v => !v)}>Check-out</MeChip>
                  </div>
                </div>
                <div className="me3-field me3-field--full">
                  <span className="me3-field__label">Strutture <span className="me3-field__count">{contaSel(strutture) || 'nessuna'}</span></span>
                  <div className="me3-chips me3-chips--grid">
                    {STRUTTURE.map(s => <MeChip key={s} on={!!strutture[s]} onClick={() => setStrutture(p => ({ ...p, [s]: !p[s] }))}>{s}</MeChip>)}
                  </div>
                </div>
              </MeOp>

              <MeOp icon="fa-calendar-days" title="Imposta Minimum-LOS" desc="Soggiorno minimo richiesto per prenotare"
                on={impLos} onToggle={() => setImpLos(v => !v)}>
                <div className="me3-field">
                  <span className="me3-field__label">Notti minime</span>
                  <div className="me3-stepper">
                    <button type="button" onClick={() => setLosVal(v => Math.max(1, v - 1))} disabled={losVal <= 1} aria-label="Diminuisci"><i className="fa-solid fa-minus" /></button>
                    <span className="me3-stepper__val">{losVal}</span>
                    <button type="button" onClick={() => setLosVal(v => Math.min(30, v + 1))} disabled={losVal >= 30} aria-label="Aumenta"><i className="fa-solid fa-plus" /></button>
                  </div>
                </div>
                <div className="me3-field">
                  <span className="me3-field__label">Applica a</span>
                  <MeSegmented value={losScope} onChange={setLosScope}
                    options={[{ v: 'tutti', label: 'Tutti i canali' }, { v: 'sel', label: 'Canali selezionati' }]} />
                </div>
                {losScope === 'sel' && <CanaliSelezionati value={losCanali} onChange={setLosCanali} />}
              </MeOp>
            </div>
          </section>
        ) : (
          <>
            {/* 3 · Tariffe per camera (BAR di riferimento) */}
            <section className="me3-step">
              <header className="me3-step__head">
                <span className="me3-step__n">3</span>
                <h4 className="me3-step__title">Tariffe per tipo camera</h4>
              </header>
              <div className="me3-rates">
                {tariffeRooms.map(r => {
                  const cur = prezzi[r.id] ?? priceOf(r, 0)
                  const opts = barOptions.includes(cur) ? barOptions : [cur, ...barOptions].sort((a, b) => a - b)
                  const delta = cur - r.base
                  return (
                    <div key={r.id} className="me3-rate">
                      <span className="me3-rate__room">{titleCase(r.nome)}{r.riferimento && <span className="me3-ref">BAR</span>}</span>
                      <span className={`me3-rate__delta${delta > 0 ? ' me3-rate__delta--up' : delta < 0 ? ' me3-rate__delta--down' : ''}`}>
                        {delta === 0 ? 'base' : `${delta > 0 ? '+' : '−'}${fmtPrice(Math.abs(delta))}`}
                      </span>
                      <SelectField name={`me-prezzo-${r.id}`} ariaLabel={`Tariffa ${titleCase(r.nome)}`} value={cur}
                        options={opts.map(p => ({ value: p, label: fmtPrice(p) }))}
                        onChange={e => setPrezzi(p => ({ ...p, [r.id]: Number(e.target.value) }))} className="me3-rate__select" />
                    </div>
                  )
                })}
              </div>
            </section>

            {/* 4 · Canali */}
            <section className="me3-step">
              <header className="me3-step__head">
                <span className="me3-step__n">4</span>
                <h4 className="me3-step__title">Canali</h4>
              </header>
              <CanaliSelezionati value={tariffeCanali} onChange={setTariffeCanali} />
            </section>
          </>
        )}
      </div>

      <div className="me-modal__footer me3-footer">
        <span className={`me3-footer__sum${pronto ? '' : ' me3-footer__sum--warn'}`}>
          <i className={`fa-solid ${pronto ? 'fa-circle-check' : 'fa-circle-info'}`} />
          {riepilogo}{pronto && <> · {fmtGiorno(dal)} → {fmtGiorno(al)}</>}
        </span>
        <button className="sib-btn sib-btn--ghost" onClick={onClose}>Annulla</button>
        <button className="sib-btn sib-btn--primary" onClick={onClose} disabled={!pronto}>Applica modifiche</button>
      </div>
    </Modal>
  )
}

// ─── STOP SALES MODAL ───────────────────────────────────────────────────────────
function StopSalesModal({ open, onClose, struttura }: { open: boolean; onClose: () => void; struttura: string }) {
  const [allStrutture, setAllStrutture] = useState(false)
  const [sel, setSel] = useState<Record<string, boolean>>({})
  const [periodi, setPeriodi] = useState<string[]>([''])

  const allSel = PARTNER.every(p => sel[p])
  const toggleAll = () => { const v = !allSel; setSel(Object.fromEntries(PARTNER.map(p => [p, v]))) }
  const togglePartner = (p: string) => setSel(s => ({ ...s, [p]: !s[p] }))
  const setPeriodo = (i: number, v: string) => setPeriodi(arr => arr.map((d, k) => (k === i ? v : d)))
  const addPeriodo = () => setPeriodi(arr => [...arr, ''])

  return (
    <Modal open={open} onClose={onClose} title="Stop sales" size="md" className="me-modal">
      <div className="me-modal__body td-stop">
        <p className="td-stop__sub">Seleziona i partner a cui notificare lo stop vendite per il periodo selezionato</p>

        <div className="td-stop__ref">
          <span className="td-stop__ref-lbl">Struttura di riferimento</span>
          <span className="td-stop__ref-val">{struttura}</span>
        </div>

        <VCheck label="Stop a tutte le strutture" checked={allStrutture} onChange={() => setAllStrutture(v => !v)} />

        <div className="td-stop__box">
          <div className="td-stop__box-head">
            <VCheck label="Seleziona tutti" checked={allSel} onChange={toggleAll} />
          </div>
          <div className="td-stop__partners">
            {PARTNER.map(p => (
              <VCheck key={p} label={p} checked={!!sel[p]} onChange={() => togglePartner(p)} />
            ))}
          </div>
        </div>

        <div className="td-stop__blackout">
          <span className="td-stop__lbl">Seleziona periodo Black-out date</span>
          <div className="td-stop__periodi">
            {periodi.map((d, i) => (
              <input
                key={i}
                type="date"
                className="sib-input td-stop__date"
                value={d}
                onChange={e => setPeriodo(i, e.target.value)}
                aria-label={`Black-out date ${i + 1}`}
              />
            ))}
            <button className="td-stop__add" onClick={addPeriodo}>
              <Ico n="plus" s={14} c="var(--color-primary)" w="regular" /> Aggiungi periodo
            </button>
          </div>
        </div>
      </div>

      <div className="me-modal__footer">
        <button className="sib-btn sib-btn--ghost" onClick={onClose}>Annulla</button>
        <button className="sib-btn sib-btn--primary" onClick={onClose}>Invia</button>
      </div>
    </Modal>
  )
}

// ─── PAGINA ─────────────────────────────────────────────────────────────────────
export default function TariffeDisponibilita({ navigate }: { navigate: (p: string) => void }) {
  // Struttura selezionata in alto, fra quelle del cliente.
  const [struttura, setStruttura, opzioniStrutture] = useStrutturaPagina()
  const [vista, setVista]         = useState<'singola' | 'multi'>('singola')
  const [da, setDa]               = useState(() => isoFra(0))
  const [a, setA]                 = useState(() => isoFra(13))
  const [interv, setInterv]       = useState('14')
  const [pageStart, setPageStart] = useState(0)
  const [dir, setDir]             = useState<'next' | 'prev'>('next')
  const [attive, setAttive]       = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CAMERE.map(c => [c.id, true])))
  const [meOpen, setMeOpen]       = useState(false)
  const [stopOpen, setStopOpen]   = useState(false)
  const [saved, setSaved]         = useState(false)
  const [pop, setPop]             = useState<{ kind: 'info' | 'hist'; x: number; y: number; room: Camera; n: number } | null>(null)
  const [allot, setAllot]         = useState<Record<string, number>>({})
  const [mprice, setMprice]       = useState<Record<string, number>>({})
  const [expanded, setExpanded]   = useState<Record<string, boolean>>({})
  const [mode, setMode]           = useState<null | 'chiudi' | 'apri'>(null)
  const [manual, setManual]       = useState<Record<string, boolean>>({})

  const toggleExpand = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }))
  const toggleMode = (m: 'chiudi' | 'apri') => setMode(cur => (cur === m ? null : m))
  // chiusura effettiva = override manuale, altrimenti valore deterministico
  const closedOf = (room: Camera, n: number) => {
    const k = `${room.id}-${n}`
    return k in manual ? manual[k] : isClosed(room, n)
  }
  const partialOf = (room: Camera, n: number) => !closedOf(room, n) && isPartial(room, n)
  const onCellClick = (room: Camera, n: number) => {
    if (!mode) return
    setManual(p => ({ ...p, [`${room.id}-${n}`]: mode === 'chiudi' }))
  }

  const allotVal = (room: Camera, n: number) => allot[`${room.id}-${n}`] ?? alloOf(room, n)
  const setAllotVal = (room: Camera, n: number, v: number) =>
    setAllot(p => ({ ...p, [`${room.id}-${n}`]: Math.max(0, v) }))
  const priceVal = (room: Camera, n: number) => mprice[`${room.id}-${n}`] ?? priceOf(room, n)
  const setPriceVal = (room: Camera, n: number, v: number) =>
    setMprice(p => ({ ...p, [`${room.id}-${n}`]: v }))

  const showPop = (kind: 'info' | 'hist', e: React.MouseEvent, room: Camera, n: number) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPop({ kind, x: r.left + r.width / 2, y: r.top, room, n })
  }
  const hidePop = () => setPop(null)

  const totalDays = INTERVALLI.find(i => i.v === interv)?.days ?? 14
  const maxStart  = Math.max(0, totalDays - PAGE)

  const cols = useMemo(() => {
    const size = Math.min(PAGE, totalDays)
    return Array.from({ length: size }, (_, k) => {
      const abs = pageStart + k
      const dt = addDays(da, abs)
      const dow = dt.getDay()
      return { i: abs, day: dt.getDate(), mon: MONTHS_IT[dt.getMonth()], weekend: dow === 0 || dow === 6 }
    })
  }, [da, totalDays, pageStart])

  // larghezza minima della tabella → sotto questa soglia il wrap scrolla,
  // sopra le colonne giorno si dividono lo spazio in parti uguali (full-width)
  const minW = 240 + cols.length * 64 + (vista === 'singola' ? 60 : 0)

  // Prezzi BAR di riferimento (camera di riferimento) sulla finestra visibile
  const barPrices = useMemo(() => {
    if (!REF_ROOM) return [] as number[]
    return Array.from(new Set(cols.map(c => priceOf(REF_ROOM, c.i)))).sort((a, b) => a - b)
  }, [cols])

  // passo di scorrimento (1 settimana) → movimenti più fluidi/granulari del range
  const STEP = 7
  const changeInterv = (v: string) => { setInterv(v); setPageStart(0) }
  const prevPage = () => { setDir('prev'); setPageStart(s => Math.max(0, s - STEP)) }
  const nextPage = () => { setDir('next'); setPageStart(s => Math.min(maxStart, s + STEP)) }


  const toggleCamera = (id: string) => setAttive(p => ({ ...p, [id]: !p[id] }))
  const salva = () => { setSaved(true); window.setTimeout(() => setSaved(false), 3000) }

  return (
    <div className="td">
      <PageHead
        title="Tariffe e disponibilità"
        subtitle="Controllo di tariffe e disponibilità in base alle strutture, giorni e intervalli settimanali"
      />

      {saved && <AlertBanner type="success">Modifiche salvate e inviate con successo</AlertBanner>}

      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div className="td__toolbar">
        <SelectField
          name="struttura"
          label="Struttura"
          value={struttura}
          onChange={e => setStruttura(e.target.value)}
          options={opzioniStrutture}
          className="td__f td__f--struttura"
        />

        {/* Vista: Singola struttura (default) / Multistruttura */}
        <SelectField
          name="vista"
          label="Vista"
          value={vista}
          onChange={e => setVista(e.target.value as 'singola' | 'multi')}
          options={[
            { value: 'singola', label: 'Singola struttura' },
            { value: 'multi',   label: 'Multistruttura' },
          ]}
          className="td__f td__f--vista"
        />

        <DateRangeField
          nameFrom="da"
          nameTo="a"
          label="Periodo"
          valueFrom={da}
          valueTo={a}
          onChangeFrom={e => setDa(e.target.value)}
          onChangeTo={e => setA(e.target.value)}
          onChange={() => setPageStart(0)}
          className="td__f"
        />

        <SelectField
          name="interv"
          label="Intervallo"
          value={interv}
          onChange={e => changeInterv(e.target.value)}
          options={INTERVALLI.map(it => ({ value: it.v, label: it.label }))}
          className="td__f td__f--interv"
        />

        {/* Azioni: sotto le larghezze da tablet le etichette si nascondono e restano
            le sole icone (il nome resta nella tooltip), altrimenti l'ultimo pulsante
            finiva tagliato fuori dalla toolbar. */}
        <div className="td__toolbar-actions">
          <Tooltip text="Apri le date selezionate">
            <button
              className={`sib-btn sib-btn--toolbar td__btn ${mode === 'apri' ? 'td__btn--mode-apri' : ''}`}
              onClick={() => toggleMode('apri')}
              aria-pressed={mode === 'apri'}
              aria-label="Apri"
            >
              <Ico n="unlock" s={13} c="currentColor" w="solid" /> <span className="td__btn-txt td__btn-txt--keep">Apri</span>
            </button>
          </Tooltip>
          <Tooltip text="Chiudi le date selezionate">
            <button
              className={`sib-btn sib-btn--toolbar td__btn ${mode === 'chiudi' ? 'td__btn--mode-chiudi' : ''}`}
              onClick={() => toggleMode('chiudi')}
              aria-pressed={mode === 'chiudi'}
              aria-label="Chiudi"
            >
              <Ico n="lock" s={13} c="currentColor" w="solid" /> <span className="td__btn-txt td__btn-txt--keep">Chiudi</span>
            </button>
          </Tooltip>
          <Tooltip text="Market Engine">
            <button className="sib-btn sib-btn--toolbar td__btn td__btn--me" onClick={() => setMeOpen(true)} aria-label="Market Engine">
              <Ico n="sliders" s={14} c="currentColor" w="solid" />
              <span className="td__btn-txt">Market Engine</span>
              <span className="td__btn-txt td__btn-txt--short">Market</span>
            </button>
          </Tooltip>
          <Tooltip text="Vista calendario">
            <button className="sib-btn sib-btn--toolbar td__btn" onClick={() => navigate('calendario-tariffe')} aria-label="Calendario">
              <Ico n="calendar" s={13} c="currentColor" /> <span className="td__btn-txt td__btn-txt--keep">Calendario</span>
            </button>
          </Tooltip>
          <Tooltip text="STOP sales">
            <button className="sib-btn sib-btn--danger-outline td__btn" onClick={() => setStopOpen(true)} aria-label="STOP sales">
              <Ico n="stop" s={12} c="currentColor" w="solid" />
              <span className="td__btn-txt">STOP sales</span>
              <span className="td__btn-txt td__btn-txt--short">STOP</span>
            </button>
          </Tooltip>
          <Tooltip text="Salva e invia">
            <button className="sib-btn sib-btn--primary td__btn" onClick={salva} aria-label="Salva e invia">
              <Ico n="send" s={13} c="currentColor" w="solid" />
              <span className="td__btn-txt">Salva e invia</span>
              <span className="td__btn-txt td__btn-txt--short">Salva</span>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* ── Griglia ──────────────────────────────────────────────────── */}
      <div className="td__grid-outer">
        {/* Frecce in overlay sui bordi della tabella — la disabilitata sparisce */}
        {pageStart > 0 && (
          <button className="td__nav-arrow td__nav-arrow--prev" onClick={prevPage} aria-label="Giorni precedenti">
            <Ico n="back" s={16} c="currentColor" w="solid" />
          </button>
        )}
        {pageStart < maxStart && (
          <button className="td__nav-arrow td__nav-arrow--next" onClick={nextPage} aria-label="Giorni successivi">
            <Ico n="chevr" s={16} c="currentColor" w="solid" />
          </button>
        )}

        <div className="td__grid-wrap">
          <div className="td__grid-anim" key={pageStart} data-dir={dir}>
            <table
              className={`td__grid ${vista === 'multi' ? 'td__grid--multi' : ''} ${mode ? `td__grid--mode td__grid--mode-${mode}` : ''}`}
              style={{ '--min-w': `${minW}px` } as React.CSSProperties}
            >
          <colgroup>
            <col className="td__col-room" />
            {cols.map(c => <col key={c.i} className="td__col-day" />)}
            {vista === 'singola' && <col className="td__col-exp" />}
          </colgroup>
          <thead>
            <tr>
              <th className="td__th td__th--room">Tipo camera</th>
              {cols.map(c => (
                <th key={c.i} className={`td__th td__th--day ${c.weekend ? 'td__th--weekend' : ''}`}>
                  <span className="td__th-day">{c.day}<small> {c.mon}</small></span>
                  <span className="td__th-occ"><Ico n="building" s={10} c="var(--color-text-inactive)" w="duotone" /> {occDay(c.i).toFixed(1)}%</span>
                </th>
              ))}
              {vista === 'singola' && <th className="td__th td__th--exp">Espandi</th>}
            </tr>
          </thead>

          {CAMERE.map(room => {
            const on = attive[room.id]
            const isExp = !!expanded[room.id]
            const cls = [
              'td__room',
              room.riferimento ? 'td__room--ref' : '',
              on ? '' : 'td__room--off',
              isExp ? 'td__room--exp' : '',
            ].join(' ')
            return (
              <tbody key={room.id} className={cls}>
                {vista === 'multi' ? (
                  /* ── Vista Multistruttura: cella unica colore-stato + prezzo centrato ── */
                  <tr className="td__r td__r--multi">
                    <td className="td__cl td__cl--multi">
                      <div className="td__mname">
                        <Ico n="bed" s={16} c="var(--color-text-inactive)" />
                        <span className="td__room-name">
                          {room.riferimento && <Ico n="star" s={12} c="var(--color-warning)" w="solid" />}
                          {room.nome}
                        </span>
                        <button
                          className={`td__toggle ${on ? 'td__toggle--on' : ''}`}
                          onClick={() => toggleCamera(room.id)}
                          role="switch"
                          aria-checked={on}
                          aria-label={on ? 'Disattiva camera' : 'Attiva camera'}
                        ><span className="td__toggle-knob" /></button>
                      </div>
                      <div className="td__minv">
                        Inventario <span className="td__unit">{room.unit} Unità</span>
                      </div>
                    </td>
                    {cols.map(c => {
                      const closed = closedOf(room, c.i)
                      const partial = partialOf(room, c.i)
                      const st = closed ? 'td__mcell--closed' : partial ? 'td__mcell--partial' : 'td__mcell--open'
                      const cur = priceVal(room, c.i)
                      const opts = barPrices.includes(cur) ? barPrices : [cur, ...barPrices].sort((a, b) => a - b)
                      return (
                        <td key={c.i} className={`td__mcell ${st}`} onClick={() => onCellClick(room, c.i)}>
                          {closed
                            ? <span className="td__mprice td__mprice--muted">{fmtPrice(cur)}</span>
                            : (
                              <select
                                className="td__mprice-select"
                                value={cur}
                                onChange={e => setPriceVal(room, c.i, Number(e.target.value))}
                                aria-label="Prezzo (BAR di riferimento)"
                              >
                                {opts.map(p => <option key={p} value={p}>{fmtPrice(p)}</option>)}
                              </select>
                            )}
                        </td>
                      )
                    })}
                  </tr>
                ) : (<>
                {/* Riga 1 — nome camera + box allotment */}
                <tr className="td__r td__r--allot">
                  <td className="td__cl td__cl--name">
                    <Ico n="bed" s={16} c="var(--color-text-inactive)" />
                    <span className="td__room-name">
                      {room.riferimento && <Ico n="star" s={12} c="var(--color-warning)" w="solid" />}
                      {room.nome}
                    </span>
                    <button
                      className={`td__toggle ${on ? 'td__toggle--on' : ''}`}
                      onClick={() => toggleCamera(room.id)}
                      role="switch"
                      aria-checked={on}
                      aria-label={on ? 'Disattiva camera' : 'Attiva camera'}
                    ><span className="td__toggle-knob" /></button>
                  </td>
                  {cols.map(c => {
                    const closed = closedOf(room, c.i)
                    const partial = partialOf(room, c.i)
                    return (
                      <td key={c.i} className={`td__cell td__cell--allot ${closed ? 'td__cell--closed' : ''} ${partial ? 'td__cell--partial' : ''}`} onClick={() => onCellClick(room, c.i)}>
                        {closed && <Ico n="lock" s={15} c="#fff" w="solid" />}
                        {!closed && (
                          <div className="td__cell-top">
                            <input
                              type="number"
                              className="td__allot"
                              value={allotVal(room, c.i)}
                              min={0}
                              onChange={e => setAllotVal(room, c.i, parseInt(e.target.value, 10) || 0)}
                              aria-label="Camere da inviare"
                            />
                            <span
                              className="td__info"
                              onMouseEnter={e => showPop('info', e, room, c.i)}
                              onMouseLeave={hidePop}
                            ><Ico n="info" s={12} c="var(--color-primary)" w="solid" /></span>
                            <button
                              className="td__hourglass"
                              aria-label="Storico modifiche"
                              onMouseEnter={e => showPop('hist', e, room, c.i)}
                              onMouseLeave={hidePop}
                            ><Ico n="hourglass" s={11} c="var(--chart-3)" w="solid" /></button>
                          </div>
                        )}
                      </td>
                    )
                  })}
                  {vista === 'singola' && (
                    <td className="td__cell-exp" rowSpan={isExp ? 5 : 3}>
                      <button
                        className="td__exp-btn"
                        aria-label={isExp ? 'Comprimi' : 'Espandi'}
                        aria-expanded={isExp}
                        onClick={() => toggleExpand(room.id)}
                      ><Ico n={isExp ? 'minus-circle' : 'plus'} s={26} c="var(--color-primary)" w="regular" /></button>
                    </td>
                  )}
                </tr>

                {/* Riga 2 — Inventario + prezzo */}
                <tr className="td__r td__r--inv">
                  <td className="td__cl td__cl--sub">
                    Inventario <span className="td__unit">{room.unit} Unità</span>
                  </td>
                  {cols.map(c => {
                    const closed = closedOf(room, c.i)
                    const partial = partialOf(room, c.i)
                    return (
                      <td key={c.i} className={`td__cell td__cell--price ${closed ? 'td__cell--closed td__cell--muted' : ''} ${partial ? 'td__cell--partial' : ''}`} onClick={() => onCellClick(room, c.i)}>
                        <span className="td__price">{fmtPrice(priceOf(room, c.i))}</span>
                      </td>
                    )
                  })}
                </tr>

                {/* Riga 3 — Disponibili alla vendita */}
                <tr className="td__r td__r--disp">
                  <td className="td__cl td__cl--sub">
                    <Ico n="send" s={11} c="var(--color-text-inactive)" w="light" /> Disponibili alla vendita
                  </td>
                  {cols.map(c => {
                    const closed = closedOf(room, c.i)
                    const d = closed ? 0 : dispOf(room, c.i)
                    return (
                      <td key={c.i} className="td__cell td__cell--disp" onClick={() => onCellClick(room, c.i)}>
                        <span className={d === 0 ? 'td__disp-zero' : ''}>{d}</span>
                      </td>
                    )
                  })}
                </tr>

                {/* Righe accordion (Espandi) ───────────────────────────── */}
                {isExp && (
                  <>
                    {/* Riga 4 — Occupate */}
                    <tr className="td__r td__r--occ">
                      <td className="td__cl td__cl--occ">Occupate</td>
                      {cols.map(c => {
                        const occ = occupateOf(room, c.i)
                        const pct = room.unit ? (occ / room.unit) * 100 : 0
                        const bat = batteryFor(pct)
                        return (
                          <td key={c.i} className="td__cell td__cell--occ">
                            <div className="td__occ">
                              <Ico n={bat.ico} s={16} c={bat.col} w="solid" />
                              <span className="td__occ-nums">
                                <span className="td__occ-o">{occ}</span>
                                <span className="td__occ-t">{room.unit}</span>
                              </span>
                              <span className="td__occ-pct">{pct.toFixed(2).replace('.', ',')}%</span>
                            </div>
                          </td>
                        )
                      })}
                    </tr>

                    {/* Riga 5 — Residuo sui canali */}
                    <tr className="td__r td__r--resid">
                      <td className="td__cl td__cl--sub">Residuo sui canali</td>
                      {cols.map(c => (
                        <td key={c.i} className="td__cell td__cell--resid">––</td>
                      ))}
                    </tr>
                  </>
                )}
                </>)}
              </tbody>
            )
          })}
            </table>
          </div>
        </div>
      </div>

      {/* ── Legenda dei colori ───────────────────────────────────────── */}
      {/* Sta sotto la griglia, accanto ai colori che spiega: prima era dietro un
          pulsante informativo in mezzo ai filtri. */}
      <div className="td__legend">
        <span className="td__leg-item"><span className="td__leg-swatch td__leg-swatch--closed" /> Chiusura totale</span>
        <span className="td__leg-item"><span className="td__leg-swatch td__leg-swatch--partial" /> Chiusura parziale</span>
        <span className="td__leg-item"><Ico n="star" s={12} c="var(--color-warning)" w="solid" /> Camera di riferimento</span>
      </div>

      {/* Popover info — disponibilità per verticale */}
      {pop?.kind === 'info' && (
        <div className="td__pop td__pop--info" style={{ '--x': `${pop.x}px`, '--y': `${pop.y}px` } as React.CSSProperties}>
          <span className="td__pop-row">
            <Ico n="infinity" s={14} c="var(--color-primary)" w="solid" />
            <span className="td__pop-lbl">Sibylla</span>
            <b>{allotVal(pop.room, pop.n)}</b>
          </span>
          <span className="td__pop-row">
            <Ico n="globe" s={14} c="var(--color-primary)" w="solid" />
            <span className="td__pop-lbl">Network (B2C)</span>
            <b>–</b>
          </span>
          <span className="td__pop-row">
            <Ico n="landmark" s={14} c="var(--color-primary)" w="solid" />
            <span className="td__pop-lbl">Agorà (B2B)</span>
            <b>–</b>
          </span>
        </div>
      )}

      {/* Popover clessidra — storico modifiche */}
      {pop?.kind === 'hist' && (
        <div className="td__pop td__pop--hist" style={{ '--x': `${pop.x}px`, '--y': `${pop.y}px` } as React.CSSProperties}>
          <table className="td__hist">
            <thead>
              <tr>
                <th>Tipo</th><th>Valore</th><th>Canale</th><th>Data modifica</th><th>Utente</th><th>Errore</th>
              </tr>
            </thead>
            <tbody>
              {histOf(pop.room, pop.n).map((r, i) => (
                <tr key={i}>
                  <td>{r.tipo}</td>
                  <td>{r.valore}</td>
                  <td>{r.canale || '—'}</td>
                  <td>{r.data}</td>
                  <td>{r.utente}</td>
                  <td>{r.errore || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MarketEngineModal open={meOpen} onClose={() => setMeOpen(false)} />
      <StopSalesModal open={stopOpen} onClose={() => setStopOpen(false)} struttura={struttura} />
    </div>
  )
}
