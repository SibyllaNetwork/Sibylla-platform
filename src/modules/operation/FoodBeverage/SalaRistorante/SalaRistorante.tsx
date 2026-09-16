// ─── Sala ristorante ──────────────────────────────────────────────────────────
//  Plancia di servizio del capo sala, disegnata per il touch (tablet o monitor
//  in sala): bersagli ≥ 48px, nessuno stato legato all'hover, azioni sempre
//  visibili nella colonna di destra invece che in menu contestuali.
//
//  Due viste sugli stessi tavoli:
//   • Griglia — una card per tavolo con la toque colorata, i coperti, il conto
//     in corso, il cameriere, da quanto è aperto e a che punto è la comanda.
//   • Planimetria — la disposizione reale della sala, per chi guarda da lontano.
//
//  A destra: giornata di servizio, turni, contatori di stato (che funzionano da
//  filtro), azioni sul tavolo scelto e prenotazioni in arrivo.
import React, { useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import Modal from '../../../../core/components/Modal'
import Tooltip from '../../../../core/components/Tooltip'
import TruncatedText from '../../../../core/components/TruncatedText'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import { toast } from '../../../../core/components/Toast/useToast'
import { useFbStore, totaleConto, OUTLETS, SALE, TURNI } from '../../../../store/useFbStore'
import { useSaleStore, SALA_EL_META } from '../../../../store/useSaleStore'
import ChefHat from '../ChefHat'
import {
  CAMERIERI, CATEGORIE_CLIENTE, PORTATE, STATI_TAVOLO, STATO_TAVOLO,
  type Servizio, type StatoTavolo, type Tavolo,
} from '../fb.model'
import './SalaRistorante.sass'

const euro = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
const SERVIZI: Servizio[] = ['Colazione', 'Pranzo', 'Cena']
const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Sedie attorno al tavolo, in percentuale del suo ingombro: i rettangolari
// hanno due file (sopra e sotto), gli altri le sedie in cerchio. Stesso criterio
// del disegno di "Sale e tavoli", qui espresso in % per scalare col contenitore.
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

/** Iniziali del cameriere per il badge sul tavolo. */
const iniziali = (nome: string | null) =>
  !nome ? '' : nome.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()

/** Da quanto è aperto il tavolo, in minuti, a partire dall'ora di apertura. */
const daQuanto = (ora: string | null) => {
  if (!ora) return null
  const [h, m] = ora.split(':').map(Number)
  const now = new Date()
  const min = now.getHours() * 60 + now.getMinutes() - (h * 60 + m)
  return min < 0 ? min + 24 * 60 : min
}

const durata = (min: number | null) =>
  min === null ? '' : min < 60 ? `${min}′` : `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}′`

export default function SalaRistorante({ navigate }: { navigate?: (p: string) => void }) {
  const contesto     = useFbStore(s => s.contesto)
  const setContesto  = useFbStore(s => s.setContesto)
  const tavoli       = useFbStore(s => s.tavoli)
  const comande      = useFbStore(s => s.comande)
  const prenotazioni = useFbStore(s => s.prenotazioni)
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
  const [apertura, setApertura] = useState<Tavolo | null>(null)
  const [coperti, setCoperti]   = useState(2)
  const [cameriere, setCameriere] = useState(CAMERIERI[0])
  const [catCliente, setCatCliente] = useState(0)
  const [trasferimento, setTrasferimento] = useState<number | null>(null)

  const saleOutlet  = useMemo(() => SALE.filter(s => s.outletId === outletId), [outletId])
  const turniOutlet = useMemo(() => TURNI.filter(t => t.outletId === outletId), [outletId])
  const sala   = SALE.find(s => s.id === salaId)
  const turno  = TURNI.find(t => t.id === turnoId)
  const servizio = turno?.servizio ?? 'Cena'
  const turniServizio = turniOutlet.filter(t => t.servizio === servizio)

  const tavoliSala = useMemo(() => tavoli.filter(t => t.salaId === salaId), [tavoli, salaId])
  // Planimetria: geometria e sedie arrivano dalla sala disegnata in "Sale e tavoli"
  const salaCfg = useMemo(() => saleCfg.find(x => x.nome === sala?.nome), [saleCfg, sala])
  const inVista = useMemo(
    () => filtro ? tavoliSala.filter(t => t.stato === filtro) : tavoliSala,
    [tavoliSala, filtro],
  )

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

  // ── Calendario del mese ────────────────────────────────────────────────────
  const giorni = useMemo(() => {
    const primo = new Date(mese.getFullYear(), mese.getMonth(), 1)
    const offset = (primo.getDay() + 6) % 7 // lunedì = 0
    const ultimi = new Date(mese.getFullYear(), mese.getMonth() + 1, 0).getDate()
    const celle: Array<Date | null> = Array(offset).fill(null)
    for (let g = 1; g <= ultimi; g++) celle.push(new Date(mese.getFullYear(), mese.getMonth(), g))
    return celle
  }, [mese])

  const prenPerGiorno = useMemo(() => {
    const m = new Map<string, number>()
    prenotazioni.forEach(p => {
      if (p.outletId !== outletId || p.stato === 'annullata') return
      m.set(p.data, (m.get(p.data) ?? 0) + p.pax)
    })
    return m
  }, [prenotazioni, outletId])

  // ── Azioni ─────────────────────────────────────────────────────────────────
  const tocca = (t: Tavolo) => {
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

  const spunta = (id: number) =>
    setScelti(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id])

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
    const ok = await confirm({
      message: `Liberare il tavolo ${t.numero}? La comanda aperta resta in archivio.`,
      confirmLabel: 'Libera',
    })
    if (ok) { liberaTavolo(t.id); toast.info(`Tavolo ${t.numero} liberato`) }
  }

  const unisciScelti = () => {
    if (scelti.length < 2) { toast.warning('Scegli almeno due tavoli da unire'); return }
    const [capo, ...altri] = scelti
    altri.forEach(id => unisci(id, capo))
    const cap = tavoli.find(t => t.id === capo)
    toast.success(`${altri.length + 1} tavoli uniti su ${cap?.numero}`)
    setScelti([])
  }

  // ── Card di un tavolo ──────────────────────────────────────────────────────
  const Card = ({ t }: { t: Tavolo }) => {
    const meta = STATO_TAVOLO[t.stato]
    const c = comande.find(x => x.tavoloId === t.id && x.stato === 'aperta')
    const min = daQuanto(t.apertoAlle)
    const unito = t.unitoA ? tavoli.find(x => x.id === t.unitoA) : undefined
    const pren = prenTurno.find(p => p.tavoloId === t.id)
    // Avanzamento della comanda per portata: un pallino per ogni portata servita
    const portate = c
      ? PORTATE.filter(p => c.righe.some(r => r.portata === p.id)).map(p => {
          const righe = c.righe.filter(r => r.portata === p.id)
          const tutte = (st: string) => righe.every(r => r.stato === st)
          return {
            id: p.id,
            label: p.label,
            stato: tutte('servita') ? 'servita' : righe.some(r => r.stato === 'pronta') ? 'pronta' : 'attesa',
          }
        })
      : []

    return (
      <article
        className={[
          'fbsala__card',
          sel === t.id ? 'is-sel' : '',
          scelti.includes(t.id) ? 'is-scelto' : '',
          trasferimento === t.id ? 'is-src' : '',
        ].filter(Boolean).join(' ')}
        data-stato={t.stato}
        style={{ '--tav': t.colore } as React.CSSProperties}
      >
        <button
          type="button"
          className="fbsala__card-check"
          onClick={() => spunta(t.id)}
          aria-label={`Seleziona il tavolo ${t.numero}`}
          aria-pressed={scelti.includes(t.id)}
        >
          <i className={`fa-solid ${scelti.includes(t.id) ? 'fa-square-check' : 'fa-square'}`} aria-hidden="true" />
        </button>

        {!!pren && (
          <Tooltip text={`${pren.ospite} · ${pren.ora} · ${pren.pax} pax`}>
            <span className="fbsala__card-pren"><i className="fa-solid fa-bookmark" aria-hidden="true" /></span>
          </Tooltip>
        )}

        <button type="button" className="fbsala__card-body" onClick={() => tocca(t)}>
          <ChefHat color={t.colore} size={52} className="fbsala__card-hat" soft={t.stato === 'libero'} />
          <span className="fbsala__card-num">{t.numero}</span>

          <span className="fbsala__card-cop">Coperti {t.coperti} di {t.capienza}</span>
          <span
            className="fbsala__card-barra"
            style={{ '--pct': Math.min(100, Math.round((t.coperti / t.capienza) * 100)) } as React.CSSProperties}
            aria-hidden="true"
          ><span /></span>

          <span className="fbsala__card-imp">{c ? euro(totaleConto(c)) : euro(0)}</span>

          {!!portate.length && (
            <span className="fbsala__card-portate">
              {portate.map(p => (
                <Tooltip key={p.id} text={`${p.label}: ${p.stato === 'servita' ? 'servita' : p.stato === 'pronta' ? 'pronta' : 'in preparazione'}`}>
                  <i className="fbsala__card-dot" data-av={p.stato} />
                </Tooltip>
              ))}
            </span>
          )}

          <span className="fbsala__card-info">
            {t.cameriere && <span className="fbsala__card-cam">{iniziali(t.cameriere)}</span>}
            {min !== null && <span className="fbsala__card-time"><i className="fa-solid fa-clock" aria-hidden="true" /> {durata(min)}</span>}
          </span>

          {unito && <span className="fbsala__card-unito"><i className="fa-solid fa-link" aria-hidden="true" /> Unito con {unito.numero}</span>}
        </button>

        <span className="fbsala__card-stato">
          <i className={`fa-solid ${meta.ico}`} aria-hidden="true" />
          {meta.label}{t.stato === 'ordinato' && turno ? ` su ${turno.nome}` : ''}
        </span>
      </article>
    )
  }

  return (
    <div className="fbsala">
      <PageHead
        title="Sala ristorante"
        subtitle="Stato dei tavoli in tempo reale, apertura e passaggio alla comanda"
        actions={
          <div className="fbsala__head-acts">
            <button type="button" className="fbsala__head-btn" onClick={() => navigate?.('libro-prenotazioni')}>
              <i className="fa-solid fa-book" aria-hidden="true" /> Prenotazioni
            </button>
            <button type="button" className="fbsala__head-btn" onClick={() => toast.info('Sala aggiornata')}>
              <i className="fa-solid fa-rotate" aria-hidden="true" /> Aggiorna
            </button>
          </div>
        }
      />

      {/* Barra di servizio: outlet → sala → vista */}
      <div className="fbsala__bar">
        <div className="fbsala__pick">
          <span className="fbsala__pick-lab">I miei outlet</span>
          <div className="fbsala__chips">
            {OUTLETS.map(o => (
              <button
                key={o.id} type="button"
                className={`fbsala__chip ${o.id === outletId ? 'is-on' : ''}`}
                onClick={() => {
                  const prima = SALE.find(s => s.outletId === o.id)
                  const t = TURNI.find(x => x.outletId === o.id)
                  setContesto({ outletId: o.id, salaId: prima?.id ?? salaId, turnoId: t?.id ?? null })
                  setSel(null); setScelti([])
                }}
              >{o.nome}</button>
            ))}
          </div>
        </div>

        <div className="fbsala__pick">
          <span className="fbsala__pick-lab">Sala</span>
          <div className="fbsala__chips">
            {saleOutlet.map(s => (
              <button
                key={s.id} type="button"
                className={`fbsala__chip ${s.id === salaId ? 'is-on' : ''}`}
                onClick={() => { setContesto({ salaId: s.id }); setSel(null); setScelti([]) }}
              >{s.nome}</button>
            ))}
          </div>
        </div>

        <div className="fbsala__pick fbsala__pick--end">
          <span className="fbsala__pick-lab">Vista</span>
          <div className="fbsala__seg">
            <button
              type="button" className={vista === 'griglia' ? 'is-on' : ''}
              onClick={() => setVista('griglia')}
            >
              <i className="fa-solid fa-grid-2" aria-hidden="true" /> Card
            </button>
            <button
              type="button" className={vista === 'planimetria' ? 'is-on' : ''}
              onClick={() => setVista('planimetria')}
            >
              <i className="fa-solid fa-chair" aria-hidden="true" /> Planimetria
            </button>
          </div>
        </div>
      </div>

      <div className="fbsala__body">
        <section className="fbsala__main">
          <header className="fbsala__main-head">
            <div className="fbsala__main-tit">
              <i className="fa-solid fa-utensils" aria-hidden="true" />
              <span>{sala?.nome}</span>
              <em>{turno ? `${servizio} · ${turno.nome} · ${turno.oraInizio}–${turno.oraFine}` : 'Nessun turno attivo'}</em>
            </div>
            <div className="fbsala__main-kpi">
              <span><strong>{copertiInSala}</strong>/{sala?.capienzaMax} coperti</span>
              <span><strong>{euro(incassoSala)}</strong> in sala</span>
              {!!filtro && (
                <button type="button" className="fbsala__filtro-off" onClick={() => setFiltro(null)}>
                  <i className="fa-solid fa-filter-circle-xmark" aria-hidden="true" /> {STATO_TAVOLO[filtro].label}
                </button>
              )}
            </div>
          </header>

          {trasferimento !== null && (
            <div className="fbsala__hint">
              <i className="fa-solid fa-arrow-right-arrow-left" aria-hidden="true" />
              Tocca il tavolo libero di destinazione
              <button type="button" className="fbsala__hint-x" onClick={() => setTrasferimento(null)}>Annulla</button>
            </div>
          )}

          {scelti.length > 0 && (
            <div className="fbsala__multi">
              <span><strong>{scelti.length}</strong> {scelti.length === 1 ? 'tavolo scelto' : 'tavoli scelti'}</span>
              <button type="button" onClick={unisciScelti}><i className="fa-solid fa-link" aria-hidden="true" /> Unisci</button>
              <button type="button" onClick={() => { scelti.forEach(id => setStato(id, 'bloccato')); setScelti([]) }}>
                <i className="fa-solid fa-ban" aria-hidden="true" /> Fuori servizio
              </button>
              <button type="button" onClick={() => { scelti.forEach(id => setStato(id, 'libero')); setScelti([]) }}>
                <i className="fa-solid fa-broom" aria-hidden="true" /> Libera
              </button>
              <button type="button" className="fbsala__multi-x" onClick={() => setScelti([])}>Annulla</button>
            </div>
          )}

          {vista === 'griglia' ? (
            <div className="fbsala__grid">
              {inVista.map(t => <Card key={t.id} t={t} />)}
              {!inVista.length && <p className="fbsala__vuoto">Nessun tavolo da mostrare con questo filtro.</p>}
            </div>
          ) : (
            <div className="fbsala__plan-wrap">
              {!salaCfg && (
                <div className="fbsala__no-plan">
                  <i className="fa-solid fa-compass-drafting" aria-hidden="true" />
                  <p>Questa sala non ha ancora una planimetria.</p>
                  <button type="button" onClick={() => navigate?.('fb-sale-tavoli')}>
                    Disegnala in Sale e tavoli <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                  </button>
                </div>
              )}
              {salaCfg && (
                <div
                  className="fbsala__plan"
                  style={{ '--cols': salaCfg.cols, '--rows': salaCfg.rows } as React.CSSProperties}
                >
                  {salaCfg.elementi.map(el => (
                    <div
                      key={el.id}
                      className="fbsala__el"
                      style={{ '--gx': el.x + 1, '--gy': el.y + 1, '--gw': el.w, '--gh': el.h } as React.CSSProperties}
                    >
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
                      <div
                        key={cfg.id}
                        className={`fbsala__pt fbsala__pt--${cfg.forma} ${sel === t.id ? 'is-sel' : ''}`}
                        data-stato={t.stato}
                        style={{
                          '--gx': cfg.x + 1, '--gy': cfg.y + 1, '--gw': cfg.w, '--gh': cfg.h, '--tav': t.colore,
                        } as React.CSSProperties}
                      >
                        {sedie(cfg.capienza, cfg.forma).map((p, i) => (
                          <button
                            key={i}
                            type="button"
                            className={`fbsala__posto ${occupati.includes(i) ? 'is-on' : ''}`}
                            style={{ '--sx': p.x, '--sy': p.y } as React.CSSProperties}
                            onClick={() => {
                              occupaPosto(t.id, i)
                              if (t.stato === 'libero' && !occupati.includes(i)) setStato(t.id, 'occupato')
                            }}
                            aria-label={`Posto ${i + 1} del tavolo ${t.numero}`}
                            aria-pressed={occupati.includes(i)}
                          />
                        ))}

                        <button
                          type="button"
                          className="fbsala__pt-box"
                          onClick={() => tocca(t)}
                          aria-label={`Tavolo ${t.numero}, ${STATO_TAVOLO[t.stato].label}`}
                        >
                          <span className="fbsala__pt-num">{t.numero}</span>
                          <span className="fbsala__pt-cap">
                            <i className="fa-solid fa-user-group" aria-hidden="true" />
                            {occupati.length || t.coperti || 0}/{cfg.capienza}
                          </span>
                          {c && <span className="fbsala__pt-tot">{euro(totaleConto(c))}</span>}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Colonna di servizio ─────────────────────────────────────────── */}
        <aside className="fbsala__panel">
          {/* Giornata */}
          <section className="fbsala__blk">
            <header className="fbsala__blk-head">
              <button type="button" onClick={() => setMese(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} aria-label="Mese precedente">
                <i className="fa-solid fa-chevron-left" aria-hidden="true" />
              </button>
              <h3>{MESI[mese.getMonth()]} {mese.getFullYear()}</h3>
              <button type="button" onClick={() => setMese(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} aria-label="Mese successivo">
                <i className="fa-solid fa-chevron-right" aria-hidden="true" />
              </button>
            </header>
            <div className="fbsala__cal">
              {GIORNI.map(g => <span key={g} className="fbsala__cal-dow">{g}</span>)}
              {giorni.map((d, i) => {
                if (!d) return <span key={`v${i}`} className="fbsala__cal-vuoto" />
                const s = iso(d)
                const pax = prenPerGiorno.get(s) ?? 0
                return (
                  <button
                    key={s} type="button"
                    className={`fbsala__cal-g ${s === contesto.data ? 'is-on' : ''} ${d.getDay() === 0 || d.getDay() === 6 ? 'is-fest' : ''}`}
                    onClick={() => setContesto({ data: s })}
                  >
                    {d.getDate()}
                    {pax > 0 && <i className="fbsala__cal-pt" aria-hidden="true" />}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Turni e servizi */}
          <section className="fbsala__blk">
            <h3 className="fbsala__blk-tit">Turni e servizi</h3>
            <div className="fbsala__riga">
              <span className="fbsala__riga-lab">Servizio</span>
              <div className="fbsala__seg fbsala__seg--sm">
                {SERVIZI.map(sv => (
                  <button
                    key={sv} type="button"
                    className={sv === servizio ? 'is-on' : ''}
                    onClick={() => {
                      const t = turniOutlet.find(x => x.servizio === sv)
                      setContesto({ turnoId: t?.id ?? null })
                    }}
                  >{sv}</button>
                ))}
              </div>
            </div>
            <div className="fbsala__riga">
              <span className="fbsala__riga-lab">Turni</span>
              <div className="fbsala__chips">
                {turniServizio.map(t => (
                  <button
                    key={t.id} type="button"
                    className={`fbsala__chip fbsala__chip--sm ${t.id === turnoId ? 'is-on' : ''}`}
                    onClick={() => setContesto({ turnoId: t.id })}
                  >{t.nome}</button>
                ))}
                {!turniServizio.length && <span className="fbsala__nota">Nessun turno per {servizio}.</span>}
              </div>
            </div>
          </section>

          {/* Stato tavoli: contatori che filtrano la vista */}
          <section className="fbsala__blk">
            <h3 className="fbsala__blk-tit">Stato tavoli</h3>
            <div className="fbsala__stati">
              {STATI_TAVOLO.map(s => (
                <button
                  key={s} type="button"
                  className={`fbsala__stato ${filtro === s ? 'is-on' : ''}`}
                  onClick={() => setFiltro(f => f === s ? null : s)}
                  disabled={!conteggi[s]}
                >
                  <span className="fbsala__stato-n" data-stato={s}>{conteggi[s]}</span>
                  <span className="fbsala__stato-l">{STATO_TAVOLO[s].label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Tavolo scelto */}
          {tavolo && (
            <section className="fbsala__blk fbsala__blk--tav" style={{ '--tav': tavolo.colore } as React.CSSProperties}>
              <header className="fbsala__tav-head" data-stato={tavolo.stato}>
                <ChefHat color="#fff" size={34} />
                <div>
                  <span className="fbsala__tav-eyebrow">Tavolo</span>
                  <strong className="fbsala__tav-big">{tavolo.numero}</strong>
                </div>
                <span className="fbsala__tav-badge">
                  <i className={`fa-solid ${STATO_TAVOLO[tavolo.stato].ico}`} aria-hidden="true" />
                  {STATO_TAVOLO[tavolo.stato].label}
                </span>
              </header>

              <dl className="fbsala__dati">
                <div><dt>Capienza</dt><dd>{tavolo.capienza} posti</dd></div>
                <div><dt>Coperti</dt><dd>{tavolo.coperti || '—'}</dd></div>
                <div><dt>Cameriere</dt><dd><TruncatedText text={tavolo.cameriere || '—'} /></dd></div>
                <div><dt>Aperto da</dt><dd>{durata(daQuanto(tavolo.apertoAlle)) || '—'}</dd></div>
                {comanda && <div><dt>Comanda</dt><dd>n. {comanda.numero}</dd></div>}
                {comanda && <div className="fbsala__dati--tot"><dt>Conto</dt><dd>{euro(totaleConto(comanda))}</dd></div>}
              </dl>

              {prenDelTavolo && (
                <p className="fbsala__pren-tav">
                  <i className="fa-solid fa-bookmark" aria-hidden="true" />
                  <strong>{prenDelTavolo.ospite}</strong> · {prenDelTavolo.ora} · {prenDelTavolo.pax} pax
                </p>
              )}

              <div className="fbsala__actions">
                {(tavolo.stato === 'libero' || tavolo.stato === 'riservato') && (
                  <button
                    type="button" className="fbsala__act fbsala__act--go"
                    onClick={() => {
                      setApertura(tavolo)
                      setCoperti(prenDelTavolo?.pax || Math.min(2, tavolo.capienza))
                      setCameriere(CAMERIERI[0])
                      setCatCliente(prenDelTavolo?.categoriaClienteId ?? 0)
                    }}
                  >
                    <i className="fa-solid fa-play" aria-hidden="true" /> Apri tavolo
                  </button>
                )}
                {comanda && (
                  <button type="button" className="fbsala__act fbsala__act--go" onClick={() => vaiAllaComanda(tavolo)}>
                    <i className="fa-solid fa-receipt" aria-hidden="true" /> Gestisci comanda
                  </button>
                )}
                {comanda && tavolo.stato !== 'conto' && (
                  <button type="button" className="fbsala__act" onClick={() => { setStato(tavolo.id, 'conto'); toast.info(`Conto richiesto al tavolo ${tavolo.numero}`) }}>
                    <i className="fa-solid fa-hand" aria-hidden="true" /> Chiede il conto
                  </button>
                )}
                {tavolo.stato !== 'libero' && (
                  <button type="button" className="fbsala__act" onClick={() => setTrasferimento(tavolo.id)}>
                    <i className="fa-solid fa-arrow-right-arrow-left" aria-hidden="true" /> Trasferisci
                  </button>
                )}
                {tavolo.stato === 'pulizia' && (
                  <button type="button" className="fbsala__act fbsala__act--ok" onClick={() => { setStato(tavolo.id, 'libero'); toast.success(`Tavolo ${tavolo.numero} riapparecchiato`) }}>
                    <i className="fa-solid fa-check" aria-hidden="true" /> Riapparecchiato
                  </button>
                )}
                {tavolo.unitoA && (
                  <button type="button" className="fbsala__act" onClick={() => unisci(tavolo.id, null)}>
                    <i className="fa-solid fa-link-slash" aria-hidden="true" /> Separa
                  </button>
                )}
                {tavolo.stato !== 'bloccato' ? (
                  <button type="button" className="fbsala__act" onClick={() => setStato(tavolo.id, 'bloccato')}>
                    <i className="fa-solid fa-ban" aria-hidden="true" /> Fuori servizio
                  </button>
                ) : (
                  <button type="button" className="fbsala__act" onClick={() => setStato(tavolo.id, 'libero')}>
                    <i className="fa-solid fa-rotate-left" aria-hidden="true" /> In servizio
                  </button>
                )}
                {tavolo.stato !== 'libero' && (
                  <button type="button" className="fbsala__act fbsala__act--danger" onClick={() => chiediLibera(tavolo)}>
                    <i className="fa-solid fa-broom" aria-hidden="true" /> Libera
                  </button>
                )}
              </div>
            </section>
          )}

          {/* Prenotazioni in arrivo */}
          <section className="fbsala__blk">
            <header className="fbsala__blk-head fbsala__blk-head--plain">
              <h3>In arrivo</h3>
              <span>{prenTurno.length} prenotazioni</span>
            </header>
            <ul className="fbsala__pren-list">
              {prenTurno.slice(0, 6).map(p => {
                const tav = p.tavoloId ? tavoli.find(t => t.id === p.tavoloId) : undefined
                return (
                  <li key={p.id}>
                    <button type="button" className="fbsala__pren-row" onClick={() => { if (tav) setSel(tav.id) }}>
                      <span className="fbsala__pren-ora">{p.ora}</span>
                      <span className="fbsala__pren-nome"><TruncatedText text={p.ospite} /></span>
                      <span className="fbsala__pren-pax"><i className="fa-solid fa-user-group" aria-hidden="true" />{p.pax}</span>
                      <span className={`fbsala__pren-tav ${tav ? '' : 'is-none'}`}>{tav ? tav.numero : 'da assegnare'}</span>
                    </button>
                  </li>
                )
              })}
              {!prenTurno.length && <li className="fbsala__nota fbsala__nota--pad">Nessuna prenotazione per il turno.</li>}
            </ul>
            <button type="button" className="fbsala__pren-all" onClick={() => navigate?.('ospiti-giorno')}>
              Ospiti del giorno <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </button>
          </section>
        </aside>
      </div>

      {/* ── Apertura tavolo ────────────────────────────────────────────────── */}
      <Modal
        open={!!apertura}
        onClose={() => setApertura(null)}
        title={apertura ? `Apri il tavolo ${apertura.numero}` : ''}
        size="md"
      >
        {apertura && (
          <div className="fbsala-apri">
            <div className="fbsala-apri__blk">
              <span className="fbsala-apri__lab">Coperti</span>
              <div className="fbsala-apri__stepper">
                <button type="button" onClick={() => setCoperti(n => Math.max(1, n - 1))} aria-label="Meno coperti">
                  <i className="fa-solid fa-minus" aria-hidden="true" />
                </button>
                <span className="fbsala-apri__n">{coperti}</span>
                <button type="button" onClick={() => setCoperti(n => n + 1)} aria-label="Più coperti">
                  <i className="fa-solid fa-plus" aria-hidden="true" />
                </button>
              </div>
              {coperti > apertura.capienza && (
                <p className="fbsala-apri__warn">
                  <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                  Oltre la capienza del tavolo ({apertura.capienza} posti)
                </p>
              )}
            </div>

            <div className="fbsala-apri__blk">
              <span className="fbsala-apri__lab">Cameriere</span>
              <div className="fbsala-apri__chips">
                {CAMERIERI.map(c => (
                  <button key={c} type="button" className={`fbsala-apri__chip ${c === cameriere ? 'is-on' : ''}`} onClick={() => setCameriere(c)}>{c}</button>
                ))}
              </div>
            </div>

            <div className="fbsala-apri__blk">
              <span className="fbsala-apri__lab">Categoria cliente</span>
              <div className="fbsala-apri__chips">
                {CATEGORIE_CLIENTE.map(c => (
                  <button key={c.id} type="button" className={`fbsala-apri__chip ${c.id === catCliente ? 'is-on' : ''}`} onClick={() => setCatCliente(c.id)}>
                    {c.nome}{c.scontoPerc > 0 && <em> −{c.scontoPerc}%</em>}
                  </button>
                ))}
              </div>
            </div>

            <footer className="fbsala-apri__foot">
              <button type="button" className="fbsala-apri__annulla" onClick={() => setApertura(null)}>Annulla</button>
              <button type="button" className="fbsala-apri__ok" onClick={confermaApertura}>
                <i className="fa-solid fa-play" aria-hidden="true" /> Apri tavolo
              </button>
              <button
                type="button" className="fbsala-apri__ok fbsala-apri__ok--go"
                onClick={() => { const t = apertura; confermaApertura(); if (t) vaiAllaComanda(t) }}
              >
                <i className="fa-solid fa-receipt" aria-hidden="true" /> Apri e ordina
              </button>
            </footer>
          </div>
        )}
      </Modal>
    </div>
  )
}
