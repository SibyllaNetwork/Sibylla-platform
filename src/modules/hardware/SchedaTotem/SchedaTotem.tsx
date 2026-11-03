import React, { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import PageHead from '../../../core/components/PageHead'
import Tabs from '../../../core/components/Tabs'
import Tooltip from '../../../core/components/Tooltip'
import { SelectField, InputField, ToggleSwitch, RangeField, RadioGroup } from '../../../core/components/form'
import { toast } from '../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../store/useConfirmStore'
import SpotPlayer, { CreativitaView, TotemFrame } from '../_shared/SpotPlayer'
import {
  useTotemStore, FASCE, QUOTA_PROPRIETARIO, fasciaOra, oggiT, giornoT, isoT, fmtT, eurT, etichettaTotem,
  trasmissioniDi, inserzioniDi, saturazione, type ConfigTotem, type Fascia, type Totem,
} from '../../../store/useTotemStore'
import './SchedaTotem.sass'

/**
 * Scheda totem — amministrazione e configurazione di un singolo totem della rete:
 * diagnostica in tempo reale, impostazioni dello schermo, palinsesto della
 * settimana (spot propri e di terzi per fascia) e calendario degli spazi in vendita.
 */

const ORARI = Array.from({ length: 49 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`)
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
const GG = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
const SPECS: Record<string, { schermo: string; risoluzione: string; cpu: string; touch: string }> = {
  'Sibylla Vertical 55" 4K':  { schermo: '55" verticale, 700 nit', risoluzione: '2160 × 3840 (4K)', cpu: 'Intel i5 12ª gen · 16 GB', touch: 'No' },
  'Sibylla Vertical 43" FHD': { schermo: '43" verticale, 500 nit', risoluzione: '1080 × 1920 (Full HD)', cpu: 'Intel i3 12ª gen · 8 GB', touch: 'No' },
  'Sibylla Kiosk 32" touch':  { schermo: '32" touch capacitivo', risoluzione: '1080 × 1920 (Full HD)', cpu: 'Intel i5 12ª gen · 16 GB', touch: 'Sì, 10 punti' },
}

type Tab = 'panoramica' | 'configurazione' | 'palinsesto' | 'spazi'

export default function SchedaTotem({ navigate, totemId, tabIniziale }: { navigate: (p: string) => void; totemId: string; tabIniziale?: string }) {
  const { totem, progetti, trasmissioni, inserzioni, aggiornaTotem, aggiornaConfig, setCalendario, riavvia } = useTotemStore()
  const confirm = useConfirmStore(s => s.confirm)
  const t = totem.find(x => x.id === totemId)
  const [tab, setTab] = useState<Tab>(() => (['panoramica', 'configurazione', 'palinsesto', 'spazi'].includes(tabIniziale ?? '') ? tabIniziale as Tab : 'panoramica'))

  if (!t) {
    return (
      <div className="stm">
        <PageHead title="Totem non trovato" back onBack={() => navigate('i-miei-totem')} />
        <p className="stm__muted">Il totem non è più nella rete.</p>
      </div>
    )
  }

  const oggi = oggiT()
  const fascia = fasciaOra()
  const ins = t.stato === 'online' ? inserzioniDi(inserzioni, t.id, oggi, fascia)[0] : undefined
  const tr = trasmissioniDi(trasmissioni, t.id, oggi, fascia)
  const prog = progetti.find(p => p.id === (tr[0]?.progettoId ?? t.config.progettoRiempimento))

  const riavviaTotem = async () => {
    const ok = await confirm({ title: 'Riavvia totem', message: <>Il totem <strong>{etichettaTotem(t)}</strong> si spegnerà per circa un minuto e riprenderà il palinsesto.</>, confirmLabel: 'Riavvia', danger: false })
    if (!ok) return
    riavvia(t.id)
    toast.success(`${etichettaTotem(t)} riavviato: è di nuovo online.`, 'Totem')
  }

  return (
    <div className="stm">
      <PageHead
        back onBack={() => navigate('i-miei-totem')}
        title={etichettaTotem(t)}
        subtitle={`${t.indirizzo}, ${t.citta} · ${t.modello} · n. di serie ${t.seriale}`}
        actions={
          <div className="stm__head-acts">
            <button type="button" className="sib-btn sib-btn--secondary" onClick={riavviaTotem}><i className="fa-solid fa-power-off" aria-hidden="true" /> Riavvia</button>
            <button type="button" className="sib-btn sib-btn--primary" onClick={() => navigate(`gest-advertising:${t.id}`)}><i className="fa-solid fa-calendar-plus" aria-hidden="true" /> Pianifica qui</button>
          </div>
        }
      />

      <div className="stm__layout">
        <div className="stm__main">
          <Tabs active={tab} onChange={id => setTab(id as Tab)} tabs={[
            { id: 'panoramica', label: 'Panoramica e diagnostica' },
            { id: 'configurazione', label: 'Configurazione' },
            { id: 'palinsesto', label: 'Palinsesto' },
            { id: 'spazi', label: 'Spazi in vendita' },
          ]} />
          {tab === 'panoramica' && <Panoramica t={t} />}
          {tab === 'configurazione' && <Configurazione t={t} onSave={c => { aggiornaConfig(t.id, c); toast.success('Configurazione inviata al totem: attiva entro pochi secondi.', 'Totem') }} />}
          {tab === 'palinsesto' && <Palinsesto t={t} navigate={navigate} />}
          {tab === 'spazi' && <Spazi t={t} onToggle={v => aggiornaTotem(t.id, { inVendita: v })}
            onPrezzi={prezzi => { aggiornaTotem(t.id, { prezzi }); toast.success('Prezzi degli spazi aggiornati.', 'Spazi in vendita') }}
            onCalendario={(f, g) => setCalendario(t.id, f, g)} />}
        </div>

        <aside className="stm__aside">
          <TotemFrame spento={t.stato !== 'online'} caption={
            <span className="stm__cap">
              <span className={clsx('stm__live', t.stato !== 'online' && 'stm__live--off')}>{t.stato === 'online' ? 'LIVE' : 'OFF'}</span>
              {ins ? <>Inserzione di <strong>{ins.inserzionista}</strong></> : prog ? <><strong>{prog.nome}</strong>{!tr.length && ' · riempimento'}</> : 'Nessuno spot'}
            </span>
          }>
            {ins ? <CreativitaView c={ins.creativita} /> : <SpotPlayer progetto={prog} play={t.stato === 'online'} />}
          </TotemFrame>
        </aside>
      </div>
    </div>
  )
}

// ─── Panoramica e diagnostica ────────────────────────────────────────────────
function Panoramica({ t }: { t: Totem }) {
  const s = SPECS[t.modello] ?? SPECS['Sibylla Vertical 55" 4K']
  const online = t.stato === 'online'
  // Passaggi stimati per fascia (curva tipica di una hall: picco serale).
  const curva: Record<Fascia, number> = { mattina: .28, pomeriggio: .3, sera: .34, notte: .08 }
  const max = Math.max(...Object.values(curva))
  const meter = (lbl: string, val: number, unit: string, soglia: number, hint: string) => (
    <div className="stm-meter">
      <div className="stm-meter__top"><span>{lbl}</span><strong className={clsx(val >= soglia && 'stm__warn')}>{val}{unit}</strong></div>
      <span className="stm-meter__bar"><span className={clsx('stm-meter__fill', val >= soglia && 'stm-meter__fill--warn')} data-v={Math.min(100, Math.round(val / 5) * 5)} /></span>
      <span className="stm-meter__hint">{hint}</span>
    </div>
  )
  const eventi = [
    { ico: 'arrows-rotate', txt: 'Palinsesto sincronizzato', quando: '2 min fa' },
    { ico: 'cloud-arrow-down', txt: 'Scaricato lo spot «Cena gourmet in terrazza»', quando: '1 h fa' },
    { ico: 'sun', txt: 'Luminosità adattata alla luce ambiente (78%)', quando: '3 h fa' },
    { ico: 'shield-halved', txt: 'Aggiornamento di sicurezza installato', quando: 'ieri' },
  ]
  return (
    <div className="stm__grid">
      <section className="stm__card">
        <h3 className="stm__card-title">Diagnostica</h3>
        <div className={clsx('stm__health', !online && 'stm__health--ko')}>
          <i className={`fa-solid ${online ? 'fa-circle-check' : t.stato === 'offline' ? 'fa-plug-circle-xmark' : 'fa-screwdriver-wrench'}`} aria-hidden="true" />
          <span>
            <strong>{online ? 'Tutto funziona' : t.stato === 'offline' ? 'Totem non raggiungibile' : 'In manutenzione'}</strong>
            <span>{online ? `Connessione ${t.connessione}, ultimo contatto pochi secondi fa` : 'Prova a riavviarlo da remoto o richiedi assistenza'}</span>
          </span>
        </div>
        <button type="button" className="sib-btn sib-btn--secondary stm__assist" onClick={() => toast.info('Richiesta inviata al supporto tecnico Sibylla: ti contatteremo entro 4 ore lavorative.', 'Assistenza')}>
          <i className="fa-solid fa-screwdriver-wrench" aria-hidden="true" /> Richiedi assistenza
        </button>
        {meter('Temperatura', t.temperatura, ' °C', 55, 'Oltre 55 °C lo schermo riduce la luminosità')}
        {meter('Memoria usata', t.spazioDisco, '%', 85, `${Math.round((100 - t.spazioDisco) * 1.28)} GB liberi per gli spot`)}
        {meter('Luminosità', t.config.luminosita, '%', 101, t.config.autoLuminosita ? 'Automatica in base alla luce ambiente' : 'Impostata a mano')}
      </section>

      <section className="stm__card">
        <h3 className="stm__card-title">Pubblico davanti allo schermo</h3>
        <p className="stm__big"><strong>{t.passaggiGiorno.toLocaleString('it-IT')}</strong> passaggi al giorno stimati dal sensore</p>
        <div className="stm-curve">
          {FASCE.map(f => (
            <div key={f.id} className="stm-curve__col">
              <span className="stm-curve__bar"><span className={clsx('stm-curve__fill', curva[f.id] === max && 'stm-curve__fill--top')} data-v={Math.round((curva[f.id] / max) * 20) * 5} /></span>
              <span className="stm-curve__lbl">{f.label}</span>
              <span className="stm-curve__n">{Math.round(t.passaggiGiorno * curva[f.id]).toLocaleString('it-IT')}</span>
            </div>
          ))}
        </div>
        <p className="stm__tip"><i className="fa-solid fa-lightbulb" aria-hidden="true" /> La sera è la fascia più vista: è lì che conviene mettere le offerte del ristorante e il prezzo più alto agli spazi in vendita.</p>
      </section>

      <section className="stm__card">
        <h3 className="stm__card-title">Scheda tecnica</h3>
        <dl className="stm__dl">
          <div><dt>Modello</dt><dd>{t.modello}</dd></div>
          <div><dt>Schermo</dt><dd>{s.schermo}</dd></div>
          <div><dt>Risoluzione</dt><dd>{s.risoluzione}</dd></div>
          <div><dt>Processore</dt><dd>{s.cpu}</dd></div>
          <div><dt>Touch</dt><dd>{s.touch}</dd></div>
          <div><dt>Connessione</dt><dd>{t.connessione}{t.connessione !== '4G' ? ' + 4G di riserva' : ''}</dd></div>
          <div><dt>N. di serie</dt><dd>{t.seriale}</dd></div>
        </dl>
      </section>

      <section className="stm__card">
        <h3 className="stm__card-title">Attività recente</h3>
        <ul className="stm__log">
          {eventi.map((e, i) => (
            <li key={i}><i className={`fa-solid fa-${e.ico}`} aria-hidden="true" /><span>{e.txt}</span><span className="stm__muted">{e.quando}</span></li>
          ))}
        </ul>
      </section>
    </div>
  )
}

// ─── Configurazione ──────────────────────────────────────────────────────────
function Configurazione({ t, onSave }: { t: Totem; onSave: (c: ConfigTotem) => void }) {
  const progetti = useTotemStore(s => s.progetti)
  const [c, setC] = useState<ConfigTotem>(t.config)
  useEffect(() => { setC(t.config) }, [t.config])
  const cambiato = JSON.stringify(c) !== JSON.stringify(t.config)
  const orari = ORARI.map(o => ({ value: o, label: o }))
  return (
    <section className="stm__card stm__form">
      <div className="stm__form-grid">
        <div className="stm__group">
          <h3 className="stm__card-title">Orari dello schermo</h3>
          <div className="stm__row2">
            <SelectField name="accensione" label="Accensione" value={c.accensione} onChange={e => setC({ ...c, accensione: e.target.value })} options={orari} />
            <SelectField name="spegnimento" label="Spegnimento" value={c.spegnimento} onChange={e => setC({ ...c, spegnimento: e.target.value })} options={orari} />
          </div>
          <p className="stm__hint">Fuori orario lo schermo resta spento: le fasce non coperte non si possono vendere a terzi.</p>
        </div>
        <div className="stm__group">
          <h3 className="stm__card-title">Schermo e audio</h3>
          <ToggleSwitch label="Luminosità automatica" description="Si adatta alla luce dell'ambiente" checked={c.autoLuminosita} onChange={v => setC({ ...c, autoLuminosita: v })} />
          <RangeField name="luminosita" label="Luminosità" value={c.luminosita} min={10} max={100} step={5} valueLabel={`${c.luminosita}%`} hideReset onChange={v => setC({ ...c, luminosita: v })} />
          <RangeField name="volume" label="Volume" value={c.volume} min={0} max={100} step={5} valueLabel={`${c.volume}%`} hideReset onChange={v => setC({ ...c, volume: v })} />
        </div>
        <div className="stm__group">
          <h3 className="stm__card-title">Contenuti</h3>
          <RadioGroup name="orientamento" label="Orientamento" value={c.orientamento} onChange={v => setC({ ...c, orientamento: v as ConfigTotem['orientamento'] })}
            options={[{ value: 'verticale', label: 'Verticale' }, { value: 'orizzontale', label: 'Orizzontale' }]} />
          <SelectField name="riempimento" label="Spot di riempimento" hint="Va in onda quando non c'è nulla in programma" value={c.progettoRiempimento ?? ''}
            onChange={e => setC({ ...c, progettoRiempimento: e.target.value || undefined })}
            options={[{ value: '', label: 'Nessuno (schermo nero)' }, ...progetti.map(p => ({ value: p.id, label: p.nome }))]} />
          <ToggleSwitch label="Interazione touch" description="Gli ospiti toccano lo schermo per info e prenotazioni" checked={c.touch} onChange={v => setC({ ...c, touch: v })} />
        </div>
      </div>
      <div className="stm__save">
        {cambiato && <span className="stm__muted">Modifiche non ancora inviate al totem</span>}
        <button type="button" className="sib-btn sib-btn--secondary" disabled={!cambiato} onClick={() => setC(t.config)}>Annulla</button>
        <button type="button" className="sib-btn sib-btn--primary" disabled={!cambiato} onClick={() => onSave(c)}><i className="fa-solid fa-paper-plane" aria-hidden="true" /> Invia al totem</button>
      </div>
    </section>
  )
}

// ─── Palinsesto della settimana ──────────────────────────────────────────────
function Palinsesto({ t, navigate }: { t: Totem; navigate: (p: string) => void }) {
  const { progetti, trasmissioni, inserzioni } = useTotemStore()
  const giorni = Array.from({ length: 7 }, (_, i) => giornoT(i))
  return (
    <section className="stm__card">
      <div className="stm__card-row">
        <h3 className="stm__card-title">Prossimi 7 giorni</h3>
        <span className="stm__legend"><span className="stm__sw stm__sw--own" />Spot tuoi <span className="stm__sw stm__sw--terzi" />Inserzioni di terzi</span>
      </div>
      <div className="stm-pal">
        <span />
        {FASCE.map(f => <span key={f.id} className="stm-pal__h">{f.label}<small>{f.orario}</small></span>)}
        {giorni.map(g => {
          const d = new Date(`${g}T12:00:00`)
          return (
            <React.Fragment key={g}>
              <span className={clsx('stm-pal__day', g === oggiT() && 'stm-pal__day--today')}>{GG[d.getDay()]}<small>{d.getDate()}/{d.getMonth() + 1}</small></span>
              {FASCE.map(f => {
                const own = trasmissioniDi(trasmissioni, t.id, g, f.id)
                const ter = inserzioniDi(inserzioni, t.id, g, f.id)
                const sat = saturazione(trasmissioni, inserzioni, progetti, t.id, g, f.id)
                return (
                  <div key={f.id} className="stm-pal__cell">
                    {own.map(x => <span key={x.id} className="stm-pal__chip stm-pal__chip--own">{progetti.find(p => p.id === x.progettoId)?.nome}</span>)}
                    {ter.map(x => <span key={x.id} className="stm-pal__chip stm-pal__chip--terzi">{x.inserzionista}</span>)}
                    {!own.length && !ter.length && <span className="stm-pal__free">{t.inVendita && t.calendario[f.id].includes(g) ? 'Libero · in vendita' : 'Libero'}</span>}
                    <Tooltip text={`Occupato il ${sat}% del tempo di trasmissione`}>
                      <span className="stm-pal__sat"><span className={clsx('stm-pal__sat-fill', sat >= 80 && 'stm-pal__sat-fill--hi')} data-v={Math.round(sat / 5) * 5} /></span>
                    </Tooltip>
                  </div>
                )
              })}
            </React.Fragment>
          )
        })}
      </div>
      <div className="stm__save">
        <button type="button" className="sib-btn sib-btn--primary" onClick={() => navigate(`gest-advertising:${t.id}`)}><i className="fa-solid fa-calendar-plus" aria-hidden="true" /> Pianifica una trasmissione</button>
      </div>
    </section>
  )
}

// ─── Spazi in vendita (calendario per fascia) ────────────────────────────────
function Spazi({ t, onToggle, onPrezzi, onCalendario }: {
  t: Totem; onToggle: (v: boolean) => void; onPrezzi: (p: Totem['prezzi']) => void; onCalendario: (f: Fascia, g: string[]) => void
}) {
  const inserzioni = useTotemStore(s => s.inserzioni)
  const [fascia, setFascia] = useState<Fascia>('sera')
  const [modo, setModo] = useState<'seleziona' | 'deseleziona'>('seleziona')
  const [prezzi, setPrezzi] = useState(t.prezzi)
  useEffect(() => { setPrezzi(t.prezzi) }, [t.prezzi])
  const drag = useRef(false)
  useEffect(() => { const up = () => { drag.current = false }; window.addEventListener('mouseup', up); return () => window.removeEventListener('mouseup', up) }, [])

  const mesi = useMemo(() => Array.from({ length: 6 }, (_, k) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + k); return { y: d.getFullYear(), m: d.getMonth() } }), [])
  const oggi = oggiT()
  const inVendita = new Set(t.calendario[fascia])
  const venduti = new Set(inserzioni.filter(x => x.totemId === t.id && x.stato === 'Approvata' && x.fascia === fascia)
    .flatMap(x => { const out: string[] = []; for (let d = new Date(`${x.dal}T12:00:00`); isoT(d) <= x.al; d.setDate(d.getDate() + 1)) out.push(isoT(d)); return out }))

  const applica = (g: string) => {
    if (g < oggi || venduti.has(g)) return
    const has = inVendita.has(g)
    if (modo === 'seleziona' && !has) onCalendario(fascia, [...t.calendario[fascia], g].sort())
    if (modo === 'deseleziona' && has) onCalendario(fascia, t.calendario[fascia].filter(x => x !== g))
  }
  const giorniLiberi = t.calendario[fascia].filter(g => g >= oggi && !venduti.has(g)).length
  const potenziale = giorniLiberi * t.prezzi[fascia] * QUOTA_PROPRIETARIO

  return (
    <section className="stm__card">
      <div className="stm__card-row">
        <ToggleSwitch label="Metti in vendita gli spazi di questo totem" description="Gli inserzionisti del circuito Sibylla potranno acquistare i giorni e le fasce che scegli" checked={t.inVendita} onChange={onToggle} />
      </div>
      <div className={clsx('stm-spazi', !t.inVendita && 'stm-spazi--off')}>
        <div className="stm-spazi__prezzi">
          {FASCE.map(f => (
            <InputField key={f.id} name={`prezzo-${f.id}`} type="number" label={`${f.label} (${f.orario})`} value={prezzi[f.id]} min={0} iconLeft="fa-solid fa-euro-sign"
              onChange={e => setPrezzi({ ...prezzi, [f.id]: Number(e.target.value) || 0 })} />
          ))}
          <button type="button" className="sib-btn sib-btn--secondary stm-spazi__save" disabled={JSON.stringify(prezzi) === JSON.stringify(t.prezzi)} onClick={() => onPrezzi(prezzi)}>Salva prezzi</button>
        </div>
        <p className="stm__hint">Prezzo al giorno per uno spot di 15 secondi fino a 6 passaggi l'ora. Ti spetta l'{Math.round(QUOTA_PROPRIETARIO * 100)}% di ogni vendita.</p>

        <div className="stm-spazi__bar">
          <div className="stm__tabs-mini" role="tablist">
            {FASCE.map(f => (
              <button key={f.id} type="button" role="tab" aria-selected={fascia === f.id} className={clsx('stm__tab-mini', fascia === f.id && 'stm__tab-mini--on')} onClick={() => setFascia(f.id)}>
                {f.label}<span>{t.calendario[f.id].filter(g => g >= oggi).length}</span>
              </button>
            ))}
          </div>
          <div className="stm__tools">
            <button type="button" className={clsx('stm__tool', modo === 'seleziona' && 'stm__tool--on')} onClick={() => setModo('seleziona')}><i className="fa-solid fa-paintbrush" aria-hidden="true" /> Metti in vendita</button>
            <button type="button" className={clsx('stm__tool', modo === 'deseleziona' && 'stm__tool--on')} onClick={() => setModo('deseleziona')}><i className="fa-solid fa-eraser" aria-hidden="true" /> Ritira</button>
          </div>
        </div>

        <div className="stm-cal" onMouseLeave={() => { drag.current = false }}>
          <span className="stm-cal__corner" />
          {Array.from({ length: 31 }, (_, i) => <span key={i} className="stm-cal__n">{i + 1}</span>)}
          {mesi.map(({ y, m }) => {
            const dim = new Date(y, m + 1, 0).getDate()
            return (
              <React.Fragment key={`${y}-${m}`}>
                <span className="stm-cal__mese">{MESI[m].slice(0, 3)} <small>{y}</small></span>
                {Array.from({ length: 31 }, (_, i) => {
                  if (i >= dim) return <span key={i} className="stm-cal__x" />
                  const g = `${y}-${String(m + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
                  const passato = g < oggi
                  const st = venduti.has(g) ? 'venduto' : inVendita.has(g) ? 'vendita' : 'no'
                  return (
                    <button key={i} type="button" disabled={passato || !t.inVendita}
                      className={clsx('stm-cal__d', `stm-cal__d--${st}`, passato && 'stm-cal__d--past', g === oggi && 'stm-cal__d--today')}
                      aria-label={`${fmtT(g)}: ${st === 'venduto' ? 'venduto' : st === 'vendita' ? 'in vendita' : 'non in vendita'}`}
                      onMouseDown={() => { drag.current = true; applica(g) }}
                      onMouseEnter={() => { if (drag.current) applica(g) }} />
                  )
                })}
              </React.Fragment>
            )
          })}
        </div>
        <div className="stm-spazi__foot">
          <span className="stm__legend"><span className="stm-cal__d stm-cal__d--vendita stm-cal__d--leg" />In vendita <span className="stm-cal__d stm-cal__d--venduto stm-cal__d--leg" />Venduto <span className="stm-cal__d stm-cal__d--no stm-cal__d--leg" />Non in vendita</span>
          <span>Fascia {FASCE.find(f => f.id === fascia)!.label.toLowerCase()}: <strong>{giorniLiberi}</strong> giorni ancora da vendere · ricavo potenziale <strong>{eurT(potenziale)}</strong></span>
        </div>
      </div>
    </section>
  )
}
