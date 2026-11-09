// ─── Monitor di cucina · versione tablet ──────────────────────────────────────
//  A tutto schermo, come i KDS di cucina (Toast KDS, Lightspeed KDS, Square
//  KDS): si legge da due metri e si tocca con le mani occupate.
//    • tre colonne — da preparare, in preparazione, pronte al pass
//    • le righe dello stesso tavolo e della stessa portata stanno in un unico
//      TICKET, con un pulsante grande che lo fa avanzare tutto ("bump")
//    • ogni piatto si fa avanzare anche da solo, toccandolo
//    • il tempo d'attesa colora il ticket: verde, ambra, rosso oltre la soglia
//  Reparto e portata si scelgono con pulsanti in testata (niente menu).
import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from '../../../../core/components/Toast/useToast'
import { useFbStore, SALE } from '../../../../store/useFbStore'
import { PORTATE, type RigaComanda, type StatoRiga } from '../fb.model'
import '../GestioneComanda/GestioneComandaTablet.sass'
import './FbKdsTablet.sass'

const REPARTI = [
  { id: 'tutti',       label: 'Tutti',       ico: 'fa-layer-group' },
  { id: 'cucina',      label: 'Cucina',      ico: 'fa-kitchen-set' },
  { id: 'bar',         label: 'Bar',         ico: 'fa-martini-glass' },
  { id: 'pasticceria', label: 'Pasticceria', ico: 'fa-cake-candles' },
  { id: 'cantina',     label: 'Cantina',     ico: 'fa-wine-bottle' },
] as const

const COLONNE: Array<{ stato: StatoRiga; label: string; ico: string; azione: string; aIco: string }> = [
  { stato: 'inviata',         label: 'Da preparare',   ico: 'fa-inbox',          azione: 'Inizia',  aIco: 'fa-fire-burner' },
  { stato: 'in-preparazione', label: 'In preparazione', ico: 'fa-fire-burner',   azione: 'Pronto',  aIco: 'fa-bell-concierge' },
  { stato: 'pronta',          label: 'Pronte al pass',  ico: 'fa-bell-concierge', azione: 'Ritirato', aIco: 'fa-check' },
]

/** Minuti oltre i quali il ticket diventa rosso, per colonna (ambra dai 2/3). */
const SOGLIA: Record<string, number> = { inviata: 6, 'in-preparazione': 14, pronta: 5 }

const minutiDa = (ora: string, adesso: Date) => {
  const [h, m] = ora.split(':').map(Number)
  const t = new Date(adesso)
  t.setHours(h, m, 0, 0)
  return Math.max(0, Math.round((adesso.getTime() - t.getTime()) / 60000))
}

interface Riga { riga: RigaComanda; comandaId: number; numero: string; tavolo: string; reparto: string; cameriere: string; attesa: number }
interface Ticket { chiave: string; comandaId: number; numero: string; tavolo: string; cameriere: string; portata: number; attesa: number; righe: Riga[] }

export default function FbKdsTablet({ navigate }: { navigate?: (p: string) => void }) {
  const comande     = useFbStore(s => s.comande)
  const tavoli      = useFbStore(s => s.tavoli)
  const voci        = useFbStore(s => s.voci)
  const ingredienti = useFbStore(s => s.ingredienti)
  const contesto    = useFbStore(s => s.contesto)
  const outlets     = useFbStore(s => s.outlets)
  const avanzaRiga  = useFbStore(s => s.avanzaRiga)

  const [reparto, setReparto] = useState<typeof REPARTI[number]['id']>('tutti')
  const [portata, setPortata] = useState<number | 'tutte'>('tutte')
  const [adesso, setAdesso] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setAdesso(new Date()), 20000); return () => clearInterval(t) }, [])

  const nomeIng = useMemo(() => new Map(ingredienti.map(i => [i.id, i.nome])), [ingredienti])
  const outlet = outlets.find(o => o.id === contesto.outletId)

  // Tutte le righe in lavorazione dell'outlet (per i contatori), poi quelle filtrate
  const tutte = useMemo(() => {
    const idSale = SALE.filter(s => s.outletId === contesto.outletId).map(s => s.id)
    const out: Riga[] = []
    comande.filter(c => c.stato === 'aperta' && idSale.includes(c.salaId)).forEach(c => c.righe.forEach(r => {
      if (r.stato === 'in-comanda' || r.stato === 'servita') return
      const v = voci.find(x => x.id === r.voceId)
      out.push({
        riga: r, comandaId: c.id, numero: c.numero, tavolo: tavoli.find(x => x.id === c.tavoloId)?.numero ?? '—',
        reparto: v?.reparto ?? 'cucina', cameriere: c.cameriere, attesa: minutiDa(r.inviataAlle ?? c.apertaAlle, adesso),
      })
    }))
    return out
  }, [comande, tavoli, voci, contesto.outletId, adesso])
  const righe = useMemo(
    () => tutte.filter(x => (reparto === 'tutti' || x.reparto === reparto) && (portata === 'tutte' || x.riga.portata === portata)),
    [tutte, reparto, portata],
  )

  /** Ticket per colonna: tavolo + portata, il più vecchio in alto. */
  const ticketDi = (stato: StatoRiga): Ticket[] => {
    const m = new Map<string, Ticket>()
    righe.filter(r => r.riga.stato === stato).forEach(r => {
      const chiave = `${r.comandaId}-${r.riga.portata}`
      const t = m.get(chiave) ?? { chiave, comandaId: r.comandaId, numero: r.numero, tavolo: r.tavolo, cameriere: r.cameriere, portata: r.riga.portata, attesa: 0, righe: [] }
      t.righe.push(r)
      t.attesa = Math.max(t.attesa, r.attesa)
      m.set(chiave, t)
    })
    return Array.from(m.values()).sort((a, b) => b.attesa - a.attesa)
  }

  const contaReparto = (id: string) => tutte.filter(x => id === 'tutti' || x.reparto === id).length
  const inRitardo = righe.filter(r => r.attesa > (SOGLIA[r.riga.stato] ?? 99)).length

  const avanzaTicket = (t: Ticket, col: typeof COLONNE[number]) => {
    t.righe.forEach(r => avanzaRiga(r.comandaId, r.riga.id))
    toast.success(`Tavolo ${t.tavolo} · ${PORTATE.find(p => p.id === t.portata)?.label.toLowerCase()} · ${col.azione.toLowerCase()}`)
  }
  const avanzaUna = (r: Riga, col: typeof COLONNE[number]) => {
    avanzaRiga(r.comandaId, r.riga.id)
    toast.success(`${r.riga.nome} · ${col.azione.toLowerCase()}`)
  }

  const orario = adesso.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  const schermo = (
    <div className="gctab kdtab" role="application" aria-label="Monitor di cucina">
      <header className="gctab__head">
        <button type="button" className="gctab__head-btn" onClick={() => navigate?.('home')}>
          <i className="fa-solid fa-arrow-right-from-bracket fa-flip-horizontal" aria-hidden="true" /> Esci
        </button>
        <div className="gctab__head-centro">
          <span className="gctab__head-tavolo">Monitor di cucina</span>
          <span className="gctab__head-sep" />
          <span className="gctab__head-info">{outlet?.nome}</span>
        </div>
        <div className="gctab__head-dx">
          <span className="kdtab__conta"><strong>{righe.length}</strong> in lavorazione</span>
          {!!inRitardo && <span className="kdtab__ritardo"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {inRitardo} in ritardo</span>}
          <span className="gctab__head-ora">{orario}</span>
        </div>
      </header>

      <main className="kdtab__main">
        <div className="kdtab__barra">
          <div className="kdtab__gruppo" role="radiogroup" aria-label="Reparto">
            {REPARTI.map(r => (
              <button key={r.id} type="button" role="radio" aria-checked={reparto === r.id}
                className={`gctab__chip ${reparto === r.id ? 'is-on' : ''}`} onClick={() => setReparto(r.id)}>
                <i className={`fa-solid ${r.ico}`} aria-hidden="true" />{r.label}
                <em className="kdtab__n">{contaReparto(r.id)}</em>
              </button>
            ))}
          </div>
          <div className="kdtab__gruppo" role="radiogroup" aria-label="Portata">
            <button type="button" role="radio" aria-checked={portata === 'tutte'} className={`gctab__chip ${portata === 'tutte' ? 'is-on' : ''}`} onClick={() => setPortata('tutte')}>Tutte le uscite</button>
            {PORTATE.map(p => (
              <button key={p.id} type="button" role="radio" aria-checked={portata === p.id}
                className={`gctab__chip ${portata === p.id ? 'is-on' : ''}`} onClick={() => setPortata(p.id)}>
                <i className={`fa-solid ${p.ico}`} aria-hidden="true" />{p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="kdtab__colonne">
          {COLONNE.map(col => {
            const tickets = ticketDi(col.stato)
            return (
              <section key={col.stato} className={`kdtab__col kdtab__col--${col.stato}`}>
                <header className="kdtab__col-head">
                  <i className={`fa-solid ${col.ico}`} aria-hidden="true" />
                  <span>{col.label}</span>
                  <strong>{tickets.reduce((a, t) => a + t.righe.length, 0)}</strong>
                </header>
                <div className="kdtab__lista">
                  {tickets.map(t => {
                    const soglia = SOGLIA[col.stato] ?? 99
                    const livello = t.attesa > soglia ? 'rosso' : t.attesa > soglia * 0.66 ? 'ambra' : 'verde'
                    const meta = PORTATE.find(p => p.id === t.portata)
                    return (
                      <article key={t.chiave} className={`kdtab__ticket is-${livello}`}>
                        <header className="kdtab__ticket-head">
                          <span className="kdtab__tav">Tav. {t.tavolo}</span>
                          <span className="kdtab__portata"><i className={`fa-solid ${meta?.ico}`} aria-hidden="true" /> {meta?.label}</span>
                          <span className="kdtab__tempo"><i className="fa-regular fa-clock" aria-hidden="true" /> {t.attesa}′</span>
                        </header>
                        <ul className="kdtab__righe">
                          {t.righe.map(r => {
                            const senza = r.riga.senza ?? []
                            const extra = r.riga.extra ?? []
                            return (
                              <li key={r.riga.id}>
                                <button type="button" className="kdtab__riga" onClick={() => avanzaUna(r, col)} aria-label={`${r.riga.qta} ${r.riga.nome}: ${col.azione}`}>
                                  <span className="kdtab__qta">{r.riga.qta}</span>
                                  <span className="kdtab__nome">
                                    {r.riga.nome}
                                    {(senza.length > 0 || extra.length > 0 || !!r.riga.note) && (
                                      <span className="kdtab__var">
                                        {senza.map(id => <em key={`s${id}`} className="is-senza"><i className="fa-solid fa-ban" aria-hidden="true" /> {nomeIng.get(id) ?? '—'}</em>)}
                                        {extra.map(e => <em key={`e${e.ingredienteId}`} className="is-extra"><i className="fa-solid fa-plus" aria-hidden="true" /> {e.qta > 1 ? `${e.qta}× ` : ''}{e.nome}</em>)}
                                        {!!r.riga.note && <em className="is-nota"><i className="fa-solid fa-comment" aria-hidden="true" /> {r.riga.note}</em>}
                                      </span>
                                    )}
                                  </span>
                                  <i className={`fa-solid ${col.aIco} kdtab__riga-az`} aria-hidden="true" />
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                        <footer className="kdtab__ticket-foot">
                          <span>n. {t.numero} · {t.cameriere || 'senza cameriere'}</span>
                          <button type="button" className="kdtab__bump" onClick={() => avanzaTicket(t, col)}>
                            <i className={`fa-solid ${col.aIco}`} aria-hidden="true" /> {col.azione}{t.righe.length > 1 ? ' tutto' : ''}
                          </button>
                        </footer>
                      </article>
                    )
                  })}
                  {!tickets.length && (
                    <div className="kdtab__vuoto"><i className="fa-solid fa-utensils" aria-hidden="true" /> Niente in questa colonna</div>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      </main>
    </div>
  )

  return createPortal(schermo, document.body)
}
