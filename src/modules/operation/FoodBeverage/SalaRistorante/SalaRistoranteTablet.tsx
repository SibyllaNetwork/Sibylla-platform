// ─── Sala ristorante · versione tablet ────────────────────────────────────────
//  La plancia del capo sala a tutto schermo, senza sidenav, con lo stesso
//  impianto della comanda tablet (testata scura, fogli dal basso, bersagli
//  ≥ 56px). Tutto quello che fa la pagina desktop, riorganizzato per il dito:
//    • sale, turno e giornata come pulsanti in alto (niente menu a tendina)
//    • tavoli a card grandi oppure planimetria (con i posti da toccare)
//    • a destra stato dei tavoli (filtri), il tavolo scelto con le sue azioni
//      grandi e le prenotazioni in arrivo
//    • tenendo premuta una card si entra nella selezione multipla (unisci,
//      fuori servizio, libera); "Trasferisci" chiede il tavolo di destinazione
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import { toast } from '../../../../core/components/Toast/useToast'
import { useFbStore, totaleConto, SALE } from '../../../../store/useFbStore'
import { useSaleStore, SALA_EL_META } from '../../../../store/useSaleStore'
import ChefHat from '../ChefHat'
import { Foglio } from '../GestioneComanda/GestioneComandaTablet'
import {
  CAMERIERI, PORTATE, STATI_TAVOLO, STATO_TAVOLO,
  type Servizio, type StatoTavolo, type Tavolo,
} from '../fb.model'
import { TabletMenu } from '../tablet/TabletShell'
import '../GestioneComanda/GestioneComandaTablet.sass'
import './SalaRistoranteTablet.sass'

const euro = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
const SERVIZI: Servizio[] = ['Colazione', 'Pranzo', 'Cena']
const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const sedie = (capienza: number, forma: string): Array<{ x: number; y: number }> => {
  const out: Array<{ x: number; y: number }> = []
  if (forma === 'rettangolare') {
    const sopra = Math.ceil(capienza / 2)
    const sotto = capienza - sopra
    for (let i = 0; i < sopra; i++) out.push({ x: ((i + 1) / (sopra + 1)) * 100, y: -16 })
    for (let i = 0; i < sotto; i++) out.push({ x: ((i + 1) / (sotto + 1)) * 100, y: 116 })
  } else {
    for (let i = 0; i < capienza; i++) {
      const a = (i / capienza) * Math.PI * 2 - Math.PI / 2
      out.push({ x: 50 + Math.cos(a) * 66, y: 50 + Math.sin(a) * 66 })
    }
  }
  return out
}
const daQuanto = (ora: string | null) => {
  if (!ora) return null
  const [h, m] = ora.split(':').map(Number)
  const now = new Date()
  const min = now.getHours() * 60 + now.getMinutes() - (h * 60 + m)
  return min < 0 ? min + 24 * 60 : min
}
const durata = (min: number | null) =>
  min === null ? '' : min < 60 ? `${min}′` : `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}′`

export default function SalaRistoranteTablet({ navigate }: { navigate?: (p: string) => void }) {
  const outlets      = useFbStore(s => s.outlets)
  const TURNI        = useFbStore(s => s.turni)
  const contesto     = useFbStore(s => s.contesto)
  const setContesto  = useFbStore(s => s.setContesto)
  const tavoli       = useFbStore(s => s.tavoli)
  const comande      = useFbStore(s => s.comande)
  const prenotazioni = useFbStore(s => s.prenotazioni)
  const categorieCliente = useFbStore(s => s.categorieCliente)
  const apriTavolo   = useFbStore(s => s.apriTavolo)
  const liberaTavolo = useFbStore(s => s.liberaTavolo)
  const setStato     = useFbStore(s => s.setStatoTavolo)
  const trasferisci  = useFbStore(s => s.trasferisci)
  const unisci       = useFbStore(s => s.unisci)
  const posti        = useFbStore(s => s.posti)
  const occupaPosto  = useFbStore(s => s.occupaPosto)
  const saleCfg      = useSaleStore(s => s.sale)
  const confirm      = useConfirmStore(s => s.confirm)

  const { outletId, salaId, turnoId } = contesto
  const [vista, setVista]   = useState<'griglia' | 'planimetria'>('griglia')
  const [filtro, setFiltro] = useState<StatoTavolo | null>(null)
  const [sel, setSel]       = useState<number | null>(null)
  const [scelti, setScelti] = useState<number[]>([])
  const [mese, setMese]     = useState(() => new Date(contesto.data + 'T12:00:00'))
  const [calendario, setCalendario] = useState(false)
  const [sceltaOutlet, setSceltaOutlet] = useState(false)
  const [apertura, setApertura] = useState<Tavolo | null>(null)
  const [coperti, setCoperti]   = useState(2)
  const [cameriere, setCameriere] = useState(CAMERIERI[0])
  const [catCliente, setCatCliente] = useState(0)
  const [trasferimento, setTrasferimento] = useState<number | null>(null)
  const [ora, setOra] = useState(() => new Date())
  useEffect(() => { const id = window.setInterval(() => setOra(new Date()), 30000); return () => window.clearInterval(id) }, [])

  const outlet      = outlets.find(o => o.id === outletId)
  const saleOutlet  = useMemo(() => SALE.filter(s => s.outletId === outletId), [outletId, outlets])
  const turniOutlet = useMemo(() => TURNI.filter(t => t.outletId === outletId), [outletId, TURNI])
  const sala   = SALE.find(s => s.id === salaId)
  const turno  = TURNI.find(t => t.id === turnoId)
  const servizio = turno?.servizio ?? 'Cena'
  const serviziOutlet = SERVIZI.filter(sv => turniOutlet.some(t => t.servizio === sv))
  const turniServizio = turniOutlet.filter(t => t.servizio === servizio)

  const tavoliSala = useMemo(() => tavoli.filter(t => t.salaId === salaId), [tavoli, salaId])
  const salaCfg = useMemo(() => saleCfg.find(x => x.nome === sala?.nome), [saleCfg, sala])
  const inVista = useMemo(() => (filtro ? tavoliSala.filter(t => t.stato === filtro) : tavoliSala), [tavoliSala, filtro])
  const conteggi = useMemo(() => {
    const c = Object.fromEntries(STATI_TAVOLO.map(s => [s, 0])) as Record<StatoTavolo, number>
    tavoliSala.forEach(t => { c[t.stato]++ })
    return c
  }, [tavoliSala])
  const copertiInSala = tavoliSala.reduce((a, t) => a + t.coperti, 0)
  const incassoSala = useMemo(
    () => comande.filter(c => c.salaId === salaId && c.stato === 'aperta').reduce((a, c) => a + totaleConto(c), 0),
    [comande, salaId],
  )

  const tavolo  = sel === null ? undefined : tavoli.find(t => t.id === sel)
  const comanda = tavolo ? comande.find(c => c.tavoloId === tavolo.id && c.stato === 'aperta') : undefined
  const prenTurno = useMemo(
    () => prenotazioni
      .filter(p => p.data === contesto.data && p.outletId === outletId && (turnoId === null || p.turnoId === turnoId))
      .filter(p => p.stato !== 'annullata')
      .sort((a, b) => a.ora.localeCompare(b.ora)),
    [prenotazioni, contesto.data, outletId, turnoId],
  )
  const prenDelTavolo = tavolo ? prenTurno.find(p => p.tavoloId === tavolo.id) : undefined

  const giorni = useMemo(() => {
    const primo = new Date(mese.getFullYear(), mese.getMonth(), 1)
    const offset = (primo.getDay() + 6) % 7
    const ultimi = new Date(mese.getFullYear(), mese.getMonth() + 1, 0).getDate()
    const celle: Array<Date | null> = Array(offset).fill(null)
    for (let g = 1; g <= ultimi; g++) celle.push(new Date(mese.getFullYear(), mese.getMonth(), g))
    return celle
  }, [mese])
  const prenPerGiorno = useMemo(() => {
    const m = new Map<string, number>()
    prenotazioni.forEach(p => { if (p.outletId === outletId && p.stato !== 'annullata') m.set(p.data, (m.get(p.data) ?? 0) + p.pax) })
    return m
  }, [prenotazioni, outletId])

  // ── Azioni ─────────────────────────────────────────────────────────────────
  const pressione = useRef<number | null>(null)
  const lungo = useRef(false)
  const spunta = (id: number) => setScelti(v => (v.includes(id) ? v.filter(x => x !== id) : [...v, id]))

  const tocca = (t: Tavolo) => {
    if (scelti.length) { spunta(t.id); return }
    if (trasferimento !== null) {
      if (t.id === trasferimento) { setTrasferimento(null); return }
      if (t.stato !== 'libero') { toast.warning('Scegli un tavolo libero come destinazione'); return }
      const da = tavoli.find(x => x.id === trasferimento)
      trasferisci(trasferimento, t.id)
      setTrasferimento(null)
      setSel(t.id)
      toast.success(`Tavolo ${da?.numero} trasferito su ${t.numero}`)
      return
    }
    setSel(t.id)
  }
  const premiInizio = (t: Tavolo) => {
    lungo.current = false
    pressione.current = window.setTimeout(() => { lungo.current = true; spunta(t.id) }, 520)
  }
  const premiFine = (t: Tavolo) => {
    if (pressione.current) window.clearTimeout(pressione.current)
    pressione.current = null
    if (!lungo.current) tocca(t)
  }

  const chiediApertura = (t: Tavolo) => {
    const p = prenTurno.find(x => x.tavoloId === t.id)
    setApertura(t)
    setCoperti(p?.pax || Math.min(2, t.capienza))
    setCameriere(CAMERIERI[0])
    setCatCliente(p?.categoriaClienteId ?? 0)
  }
  const confermaApertura = () => {
    if (!apertura) return
    apriTavolo(apertura.id, coperti, cameriere, turnoId, catCliente)
    setContesto({ tavoloId: apertura.id, salaId: apertura.salaId })
    setSel(apertura.id)
    setApertura(null)
    toast.success(`Tavolo ${apertura.numero} aperto · ${coperti} coperti`)
  }
  const vaiAllaComanda = (t: Tavolo) => {
    setContesto({ tavoloId: t.id, salaId: t.salaId, outletId, turnoId })
    navigate?.('gest-comanda')
  }
  const chiediLibera = async (t: Tavolo) => {
    const ok = await confirm({ message: `Liberare il tavolo ${t.numero}? La comanda aperta resta in archivio.`, confirmLabel: 'Libera' })
    if (ok) { liberaTavolo(t.id); toast.info(`Tavolo ${t.numero} liberato`) }
  }
  const unisciScelti = () => {
    if (scelti.length < 2) { toast.warning('Scegli almeno due tavoli da unire'); return }
    const [capo, ...altri] = scelti
    altri.forEach(id => unisci(id, capo))
    toast.success(`${altri.length + 1} tavoli uniti su ${tavoli.find(t => t.id === capo)?.numero}`)
    setScelti([])
  }
  const cambiaOutlet = (id: number) => {
    const prima = SALE.find(x => x.outletId === id)
    const t = TURNI.find(x => x.outletId === id)
    setContesto({ outletId: id, salaId: prima?.id ?? salaId, turnoId: t?.id ?? null })
    setSel(null); setScelti([]); setSceltaOutlet(false)
  }

  const orario = ora.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  const dataLabel = new Date(contesto.data + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })

  // ── Card di un tavolo ──────────────────────────────────────────────────────
  const card = (t: Tavolo) => {
    const meta = STATO_TAVOLO[t.stato]
    const c = comande.find(x => x.tavoloId === t.id && x.stato === 'aperta')
    const min = daQuanto(t.apertoAlle)
    const unito = t.unitoA ? tavoli.find(x => x.id === t.unitoA) : undefined
    const pren = prenTurno.find(p => p.tavoloId === t.id)
    const portate = c
      ? PORTATE.filter(p => c.righe.some(r => r.portata === p.id)).map(p => {
          const righe = c.righe.filter(r => r.portata === p.id)
          return { id: p.id, stato: righe.every(r => r.stato === 'servita') ? 'servita' : righe.some(r => r.stato === 'pronta') ? 'pronta' : 'attesa' }
        })
      : []
    return (
      <button
        key={t.id} type="button"
        className={['gstab__card', sel === t.id ? 'is-sel' : '', scelti.includes(t.id) ? 'is-scelto' : '', trasferimento === t.id ? 'is-src' : ''].filter(Boolean).join(' ')}
        data-stato={t.stato}
        style={{ '--st': meta.color, '--tav': t.colore } as React.CSSProperties}
        onPointerDown={() => premiInizio(t)}
        onPointerUp={() => premiFine(t)}
        onPointerLeave={() => { if (pressione.current) window.clearTimeout(pressione.current); pressione.current = null }}
        onContextMenu={e => e.preventDefault()}
        aria-label={`Tavolo ${t.numero}, ${meta.label}`}
      >
        {scelti.length > 0 && (
          <i className={`gstab__card-check fa-solid ${scelti.includes(t.id) ? 'fa-square-check' : 'fa-square'}`} aria-hidden="true" />
        )}
        <span className="gstab__card-top">
          <ChefHat color={t.colore} size={34} soft={t.stato === 'libero'} />
          <span className="gstab__card-num">{t.numero}</span>
          {pren && <i className="fa-solid fa-bookmark gstab__card-pren" aria-hidden="true" />}
        </span>
        <span className="gstab__card-stato"><i aria-hidden="true" />{meta.label}</span>
        <span className="gstab__card-riga">
          <span><i className="fa-solid fa-user-group" aria-hidden="true" /> {t.coperti}/{t.capienza}</span>
          {c ? <strong>{euro(totaleConto(c))}</strong> : pren ? <em>{pren.ora} · {pren.ospite}</em> : null}
        </span>
        <span className="gstab__card-info">
          {t.cameriere && <span>{t.cameriere}</span>}
          {min !== null && <span><i className="fa-regular fa-clock" aria-hidden="true" /> {durata(min)}</span>}
          {unito && <span><i className="fa-solid fa-link" aria-hidden="true" /> {unito.numero}</span>}
          {!!portate.length && (
            <span className="gstab__card-portate" aria-label="Avanzamento portate">
              {portate.map(p => <i key={p.id} data-av={p.stato} />)}
            </span>
          )}
        </span>
      </button>
    )
  }

  const schermo = (
    <div className="gctab gstab" role="application" aria-label="Sala ristorante">
      <header className="gctab__head">
        <div className="gctab__head-sx">
          <TabletMenu pagina="sala-ristorante" navigate={navigate} />
          <button type="button" className="gctab__head-btn" onClick={() => navigate?.('home')}>
            <i className="fa-solid fa-arrow-right-from-bracket fa-flip-horizontal" aria-hidden="true" /> Esci
          </button>
        </div>
        <div className="gctab__head-centro">
          <button type="button" className="gstab__outlet" onClick={() => setSceltaOutlet(true)}>
            {outlet?.nome ?? 'Sala'} {outlets.length > 1 && <i className="fa-solid fa-chevron-down" aria-hidden="true" />}
          </button>
          <span className="gctab__head-sep" />
          <div className="gstab__vista" role="radiogroup" aria-label="Vista">
            <button type="button" role="radio" aria-checked={vista === 'griglia'} className={vista === 'griglia' ? 'is-on' : ''} onClick={() => setVista('griglia')}>
              <i className="fa-solid fa-grid-2" aria-hidden="true" /> Card
            </button>
            <button type="button" role="radio" aria-checked={vista === 'planimetria'} className={vista === 'planimetria' ? 'is-on' : ''} onClick={() => setVista('planimetria')}>
              <i className="fa-solid fa-chair" aria-hidden="true" /> Planimetria
            </button>
          </div>
        </div>
        <div className="gctab__head-dx">
          <button type="button" className="gctab__head-btn" onClick={() => navigate?.('gest-comanda')}>
            <i className="fa-solid fa-receipt" aria-hidden="true" /> Comande
          </button>
          <span className="gctab__head-ora">{orario}</span>
        </div>
      </header>

      <main className="gstab__main">
        {/* Barra di servizio: sala, servizio, turno, giornata — tutto a pulsanti */}
        <div className="gstab__barra">
          <div className="gstab__gruppo">
            {saleOutlet.map(s => (
              <button key={s.id} type="button" className={`gctab__sala ${salaId === s.id ? 'is-on' : ''}`}
                onClick={() => { setContesto({ salaId: s.id }); setSel(null); setScelti([]) }}>{s.nome}</button>
            ))}
          </div>
          <div className="gstab__gruppo">
            {serviziOutlet.map(sv => (
              <button key={sv} type="button" className={`gctab__chip ${servizio === sv ? 'is-on' : ''}`}
                onClick={() => setContesto({ turnoId: turniOutlet.find(x => x.servizio === sv)?.id ?? null })}>{sv}</button>
            ))}
            {turniServizio.length > 1 && turniServizio.map(t => (
              <button key={t.id} type="button" className={`gctab__chip ${turnoId === t.id ? 'is-on' : ''}`} onClick={() => setContesto({ turnoId: t.id })}>
                {t.nome} <em className="gstab__orario">{t.oraInizio}–{t.oraFine}</em>
              </button>
            ))}
          </div>
          <button type="button" className="gctab__chip gstab__data" onClick={() => setCalendario(true)}>
            <i className="fa-regular fa-calendar" aria-hidden="true" /> {dataLabel}
          </button>
          <div className="gstab__kpi">
            <span><strong>{copertiInSala}</strong>/{sala?.capienzaMax} coperti</span>
            <span><strong>{euro(incassoSala)}</strong> in sala</span>
          </div>
        </div>

        <div className="gstab__corpo">
          <section className="gstab__tavoli">
            {trasferimento !== null && (
              <div className="gstab__avviso">
                <i className="fa-solid fa-arrow-right-arrow-left" aria-hidden="true" /> Tocca il tavolo libero di destinazione
                <button type="button" onClick={() => setTrasferimento(null)}>Annulla</button>
              </div>
            )}
            {scelti.length > 0 && (
              <div className="gstab__multi">
                <span><strong>{scelti.length}</strong> {scelti.length === 1 ? 'tavolo scelto' : 'tavoli scelti'}</span>
                <button type="button" onClick={unisciScelti}><i className="fa-solid fa-link" aria-hidden="true" /> Unisci</button>
                <button type="button" onClick={() => { scelti.forEach(id => setStato(id, 'bloccato')); setScelti([]) }}><i className="fa-solid fa-ban" aria-hidden="true" /> Fuori servizio</button>
                <button type="button" onClick={() => { scelti.forEach(id => setStato(id, 'libero')); setScelti([]) }}><i className="fa-solid fa-broom" aria-hidden="true" /> Libera</button>
                <button type="button" className="gstab__multi-x" onClick={() => setScelti([])}>Annulla</button>
              </div>
            )}

            {vista === 'griglia' ? (
              <div className="gstab__griglia">
                {inVista.map(card)}
                {!inVista.length && <p className="gctab__nessuno">Nessun tavolo da mostrare con questo filtro.</p>}
              </div>
            ) : (
              // Planimetria: lo stesso disegno della pagina desktop (classi .fbsala), dentro lo schermo tablet
              <div className="fbsala gstab__plan-host">
                <div className="fbsala__plan-wrap">
                  {!salaCfg ? (
                    <div className="fbsala__no-plan">
                      <i className="fa-solid fa-compass-drafting" aria-hidden="true" />
                      <p>Questa sala non ha ancora una planimetria.</p>
                    </div>
                  ) : (
                    <div className="fbsala__plan" style={{ '--cols': salaCfg.cols, '--rows': salaCfg.rows } as React.CSSProperties}>
                      {salaCfg.elementi.map(el => (
                        <div key={el.id} className="fbsala__el" style={{ '--gx': el.x + 1, '--gy': el.y + 1, '--gw': el.w, '--gh': el.h } as React.CSSProperties}>
                          <i className={`fa-solid ${SALA_EL_META[el.kind]?.icon ?? 'fa-square'}`} aria-hidden="true" />
                          <span>{el.label ?? SALA_EL_META[el.kind]?.label}</span>
                        </div>
                      ))}
                      {salaCfg.tavoli.map(cfg => {
                        const t = tavoliSala.find(x => x.numero === cfg.numero)
                        if (!t || (filtro && t.stato !== filtro)) return null
                        const occupati = posti[t.id] ?? []
                        const c = comande.find(x => x.tavoloId === t.id && x.stato === 'aperta')
                        return (
                          <div key={cfg.id} className={`fbsala__pt fbsala__pt--${cfg.forma} ${sel === t.id ? 'is-sel' : ''}`} data-stato={t.stato}
                            style={{ '--gx': cfg.x + 1, '--gy': cfg.y + 1, '--gw': cfg.w, '--gh': cfg.h, '--tav': t.colore } as React.CSSProperties}>
                            {sedie(cfg.capienza, cfg.forma).map((p, i) => (
                              <button key={i} type="button" className={`fbsala__posto ${occupati.includes(i) ? 'is-on' : ''}`}
                                style={{ '--sx': p.x, '--sy': p.y } as React.CSSProperties}
                                onClick={() => { occupaPosto(t.id, i); if (t.stato === 'libero' && !occupati.includes(i)) setStato(t.id, 'occupato') }}
                                aria-label={`Posto ${i + 1} del tavolo ${t.numero}`} aria-pressed={occupati.includes(i)} />
                            ))}
                            <button type="button" className="fbsala__pt-box" onClick={() => tocca(t)} aria-label={`Tavolo ${t.numero}, ${STATO_TAVOLO[t.stato].label}`}>
                              <span className="fbsala__pt-num">{t.numero}</span>
                              <span className="fbsala__pt-cap"><i className="fa-solid fa-user-group" aria-hidden="true" />{occupati.length || t.coperti || 0}/{cfg.capienza}</span>
                              {c && <span className="fbsala__pt-tot">{euro(totaleConto(c))}</span>}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
            <p className="gctab__suggerimento"><i className="fa-regular fa-hand-pointer" aria-hidden="true" /> Tocca un tavolo per le azioni · tieni premuto per sceglierne più di uno</p>
          </section>

          {/* ── Colonna di servizio ─────────────────────────────────────── */}
          <aside className="gstab__pannello">
            <div className="gstab__stati">
              {STATI_TAVOLO.map(s => (
                <button key={s} type="button" className={`gstab__stato ${filtro === s ? 'is-on' : ''}`}
                  style={{ '--st': STATO_TAVOLO[s].color } as React.CSSProperties}
                  onClick={() => setFiltro(f => (f === s ? null : s))} disabled={!conteggi[s]}>
                  <strong>{conteggi[s]}</strong><span>{STATO_TAVOLO[s].label}</span>
                </button>
              ))}
            </div>

            {tavolo ? (
              <section className="gstab__tav" style={{ '--st': STATO_TAVOLO[tavolo.stato].color, '--tav': tavolo.colore } as React.CSSProperties}>
                <header>
                  <ChefHat color={tavolo.colore} size={36} />
                  <div>
                    <span>Tavolo</span>
                    <strong>{tavolo.numero}</strong>
                  </div>
                  <em><i aria-hidden="true" />{STATO_TAVOLO[tavolo.stato].label}</em>
                  <button type="button" className="gstab__tav-x" onClick={() => setSel(null)} aria-label="Chiudi"><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
                </header>
                <dl>
                  <div><dt>Posti</dt><dd>{tavolo.capienza}</dd></div>
                  <div><dt>Coperti</dt><dd>{tavolo.coperti || '—'}</dd></div>
                  <div><dt>Cameriere</dt><dd>{tavolo.cameriere || '—'}</dd></div>
                  <div><dt>Aperto da</dt><dd>{durata(daQuanto(tavolo.apertoAlle)) || '—'}</dd></div>
                  {comanda && <div><dt>Comanda</dt><dd>n. {comanda.numero}</dd></div>}
                  {comanda && <div><dt>Conto</dt><dd className="gstab__tav-conto">{euro(totaleConto(comanda))}</dd></div>}
                </dl>
                {prenDelTavolo && (
                  <p className="gstab__tav-pren"><i className="fa-solid fa-bookmark" aria-hidden="true" /> <strong>{prenDelTavolo.ospite}</strong> · {prenDelTavolo.ora} · {prenDelTavolo.pax} pax{prenDelTavolo.note ? ` · ${prenDelTavolo.note}` : ''}</p>
                )}
                <div className="gstab__azioni">
                  {(tavolo.stato === 'libero' || tavolo.stato === 'riservato') && (
                    <button type="button" className="gstab__az gstab__az--go" onClick={() => chiediApertura(tavolo)}><i className="fa-solid fa-play" aria-hidden="true" /> Apri tavolo</button>
                  )}
                  {comanda && (
                    <button type="button" className="gstab__az gstab__az--go" onClick={() => vaiAllaComanda(tavolo)}><i className="fa-solid fa-receipt" aria-hidden="true" /> Comanda</button>
                  )}
                  {comanda && tavolo.stato !== 'conto' && (
                    <button type="button" className="gstab__az" onClick={() => { setStato(tavolo.id, 'conto'); toast.info(`Conto richiesto al tavolo ${tavolo.numero}`) }}><i className="fa-solid fa-hand" aria-hidden="true" /> Chiede il conto</button>
                  )}
                  {tavolo.stato !== 'libero' && (
                    <button type="button" className="gstab__az" onClick={() => setTrasferimento(tavolo.id)}><i className="fa-solid fa-arrow-right-arrow-left" aria-hidden="true" /> Trasferisci</button>
                  )}
                  {tavolo.stato === 'pulizia' && (
                    <button type="button" className="gstab__az gstab__az--ok" onClick={() => { setStato(tavolo.id, 'libero'); toast.success(`Tavolo ${tavolo.numero} riapparecchiato`) }}><i className="fa-solid fa-check" aria-hidden="true" /> Riapparecchiato</button>
                  )}
                  {tavolo.unitoA && (
                    <button type="button" className="gstab__az" onClick={() => unisci(tavolo.id, null)}><i className="fa-solid fa-link-slash" aria-hidden="true" /> Separa</button>
                  )}
                  {tavolo.stato !== 'bloccato' ? (
                    <button type="button" className="gstab__az" onClick={() => setStato(tavolo.id, 'bloccato')}><i className="fa-solid fa-ban" aria-hidden="true" /> Fuori servizio</button>
                  ) : (
                    <button type="button" className="gstab__az" onClick={() => setStato(tavolo.id, 'libero')}><i className="fa-solid fa-rotate-left" aria-hidden="true" /> In servizio</button>
                  )}
                  {tavolo.stato !== 'libero' && (
                    <button type="button" className="gstab__az gstab__az--danger" onClick={() => chiediLibera(tavolo)}><i className="fa-solid fa-broom" aria-hidden="true" /> Libera</button>
                  )}
                </div>
              </section>
            ) : (
              <section className="gstab__arrivi">
                <header><h3>In arrivo</h3><span>{prenTurno.length} prenotazioni</span></header>
                <ul>
                  {prenTurno.slice(0, 8).map(p => {
                    const tav = p.tavoloId ? tavoli.find(t => t.id === p.tavoloId) : undefined
                    return (
                      <li key={p.id}>
                        <button type="button" onClick={() => { if (tav) setSel(tav.id) }}>
                          <strong>{p.ora}</strong>
                          <span>{p.ospite}</span>
                          <em><i className="fa-solid fa-user-group" aria-hidden="true" /> {p.pax}</em>
                          <b className={tav ? '' : 'is-none'}>{tav ? tav.numero : 'da assegnare'}</b>
                        </button>
                      </li>
                    )
                  })}
                  {!prenTurno.length && <li className="gctab__nessuno">Nessuna prenotazione per il turno.</li>}
                </ul>
                <div className="gstab__link">
                  <button type="button" onClick={() => navigate?.('ospiti-giorno')}>Ospiti del giorno <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button>
                  <button type="button" onClick={() => navigate?.('libro-prenotazioni')}>Prenotazioni <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button>
                </div>
              </section>
            )}
          </aside>
        </div>
      </main>

      {/* ── Apertura del tavolo ─────────────────────────────────────────── */}
      {apertura && (
        <Foglio titolo={`Apri il tavolo ${apertura.numero}`} sotto={`${apertura.capienza} posti`} onChiudi={() => setApertura(null)}>
          <h5 className="gctab__foglio-lab">Coperti</h5>
          <div className="gctab__numeri">
            {Array.from({ length: Math.max(8, apertura.capienza + 2) }, (_, i) => i + 1).map(n => (
              <button key={n} type="button" className={`gctab__numero ${n === coperti ? 'is-sugg' : ''}`} onClick={() => setCoperti(n)}>{n}</button>
            ))}
          </div>
          {coperti > apertura.capienza && (
            <p className="gctab__foglio-info gctab__foglio-info--warn"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> Oltre la capienza del tavolo ({apertura.capienza} posti)</p>
          )}
          <h5 className="gctab__foglio-lab">Cameriere</h5>
          <div className="gctab__chips">
            {CAMERIERI.map(c => <button key={c} type="button" className={`gctab__chip ${c === cameriere ? 'is-on' : ''}`} onClick={() => setCameriere(c)}>{c}</button>)}
          </div>
          <h5 className="gctab__foglio-lab">Categoria cliente</h5>
          <div className="gctab__chips">
            {categorieCliente.map(c => (
              <button key={c.id} type="button" className={`gctab__chip ${c.id === catCliente ? 'is-on' : ''}`} onClick={() => setCatCliente(c.id)}>
                {c.nome}{c.scontoPerc > 0 && <em className="gctab__chip-sconto">−{c.scontoPerc}%</em>}
              </button>
            ))}
          </div>
          <div className="gctab__foglio-azioni">
            <button type="button" className="gctab__conto" onClick={confermaApertura}><i className="fa-solid fa-play" aria-hidden="true" /> Apri tavolo</button>
            <button type="button" className="gctab__invia" onClick={() => { const t = apertura; confermaApertura(); if (t) vaiAllaComanda(t) }}>
              <i className="fa-solid fa-receipt" aria-hidden="true" /> Apri e ordina
            </button>
          </div>
        </Foglio>
      )}

      {/* ── Giornata di servizio ────────────────────────────────────────── */}
      {calendario && (
        <Foglio titolo="Giornata di servizio" onChiudi={() => setCalendario(false)}>
          <div className="gstab__mese">
            <button type="button" onClick={() => setMese(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} aria-label="Mese precedente"><i className="fa-solid fa-chevron-left" aria-hidden="true" /></button>
            <h4>{MESI[mese.getMonth()]} {mese.getFullYear()}</h4>
            <button type="button" onClick={() => setMese(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} aria-label="Mese successivo"><i className="fa-solid fa-chevron-right" aria-hidden="true" /></button>
          </div>
          <div className="gstab__cal">
            {GIORNI.map(g => <span key={g} className="gstab__cal-dow">{g}</span>)}
            {giorni.map((d, i) => {
              if (!d) return <span key={`v${i}`} />
              const s = iso(d)
              const pax = prenPerGiorno.get(s) ?? 0
              return (
                <button key={s} type="button" className={`gstab__cal-g ${s === contesto.data ? 'is-on' : ''}`} onClick={() => { setContesto({ data: s }); setCalendario(false) }}>
                  {d.getDate()}{pax > 0 && <em>{pax} pax</em>}
                </button>
              )
            })}
          </div>
        </Foglio>
      )}

      {/* ── Outlet ──────────────────────────────────────────────────────── */}
      {sceltaOutlet && outlets.length > 1 && (
        <Foglio titolo="Outlet" onChiudi={() => setSceltaOutlet(false)}>
          <div className="gctab__camerieri">
            {outlets.map(o => (
              <button key={o.id} type="button" className={`gctab__cam-btn ${o.id === outletId ? 'is-on' : ''}`} onClick={() => cambiaOutlet(o.id)}>{o.nome}</button>
            ))}
          </div>
        </Foglio>
      )}
    </div>
  )

  return createPortal(schermo, document.body)
}
