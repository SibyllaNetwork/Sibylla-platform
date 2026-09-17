// ─── Monitor di cucina (Food & Beverage) ──────────────────────────────────────
//  Quello che la brigata vede davvero. Le righe inviate dalla sala arrivano qui
//  in tre colonne — da preparare, in preparazione, pronte — e si spostano con un
//  tocco solo, perché in cucina si lavora con le mani occupate e lo schermo si
//  guarda da due metri: tessere grandi, nessun menu, nessun hover.
//
//  Ogni tessera porta con sé quello che la cucina deve sapere e che di solito si
//  perde: i «senza», le aggiunte, la nota e da quanto tempo quella riga aspetta.
//  Oltre il tempo di attesa concordato la tessera si accende: è l'unico allarme,
//  e per questo si vede.
import React, { useEffect, useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import FilterToolbar from '../../../../core/components/FilterToolbar'
import TruncatedText from '../../../../core/components/TruncatedText'
import { SelectField } from '../../../../core/components/form'
import { toast } from '../../../../core/components/Toast/useToast'
import { useFbStore, SALE } from '../../../../store/useFbStore'
import { PORTATE, type RigaComanda, type StatoRiga } from '../fb.model'
import './FbKds.sass'

/** Reparti che hanno un monitor: sono quelli che preparano. */
const REPARTI = [
  { id: 'tutti',       label: 'Tutti i reparti', ico: 'fa-layer-group' },
  { id: 'cucina',      label: 'Cucina',          ico: 'fa-kitchen-set' },
  { id: 'bar',         label: 'Bar',             ico: 'fa-martini-glass' },
  { id: 'pasticceria', label: 'Pasticceria',     ico: 'fa-cake-candles' },
  { id: 'cantina',     label: 'Cantina',         ico: 'fa-wine-bottle' },
] as const

/** Le tre colonne del monitor, nell'ordine in cui una riga le attraversa. */
const COLONNE: Array<{ stato: StatoRiga; label: string; ico: string; azione: string }> = [
  { stato: 'inviata',         label: 'Da preparare',    ico: 'fa-inbox',        azione: 'Prendi in carico' },
  { stato: 'in-preparazione', label: 'In preparazione',  ico: 'fa-fire-burner',  azione: 'Pronta' },
  { stato: 'pronta',          label: 'Pronte al pass',   ico: 'fa-bell-concierge', azione: 'Ritirata' },
]

/** Minuti oltre i quali la tessera si accende, per colonna. */
const SOGLIA: Record<string, number> = { inviata: 6, 'in-preparazione': 14, pronta: 5 }

const minutiDa = (ora: string, adesso: Date) => {
  const [h, m] = ora.split(':').map(Number)
  const t = new Date(adesso)
  t.setHours(h, m, 0, 0)
  return Math.max(0, Math.round((adesso.getTime() - t.getTime()) / 60000))
}

export default function FbKds({ navigate }: { navigate?: (p: string) => void }) {
  const comande   = useFbStore(s => s.comande)
  const tavoli    = useFbStore(s => s.tavoli)
  const voci      = useFbStore(s => s.voci)
  const ingredienti = useFbStore(s => s.ingredienti)
  const contesto  = useFbStore(s => s.contesto)
  const avanzaRiga = useFbStore(s => s.avanzaRiga)

  const [reparto, setReparto] = useState<typeof REPARTI[number]['id']>('tutti')
  const [portata, setPortata] = useState<number | 'tutte'>('tutte')
  // L'orologio del monitor: i minuti di attesa devono scorrere da soli
  const [adesso, setAdesso] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setAdesso(new Date()), 20000)
    return () => clearInterval(t)
  }, [])

  const nomeIng = useMemo(() => new Map(ingredienti.map(i => [i.id, i.nome])), [ingredienti])

  /** Tutte le righe in lavorazione dell'outlet, appiattite e arricchite. */
  const righe = useMemo(() => {
    const idSale = SALE.filter(s => s.outletId === contesto.outletId).map(s => s.id)
    const out: Array<{
      riga: RigaComanda; comandaId: number; numero: string; tavolo: string
      reparto: string; cameriere: string; attesa: number
    }> = []
    comande
      .filter(c => c.stato === 'aperta' && idSale.includes(c.salaId))
      .forEach(c => c.righe.forEach(r => {
        if (r.stato === 'in-comanda' || r.stato === 'servita') return
        const v = voci.find(x => x.id === r.voceId)
        const t = tavoli.find(x => x.id === c.tavoloId)
        out.push({
          riga: r, comandaId: c.id, numero: c.numero,
          tavolo: t?.numero ?? '—', reparto: v?.reparto ?? 'cucina',
          // L'attesa si conta dall'invio, non dall'apertura del tavolo
          cameriere: c.cameriere, attesa: minutiDa(r.inviataAlle ?? c.apertaAlle, adesso),
        })
      }))
    return out
      .filter(x => (reparto === 'tutti' || x.reparto === reparto)
        && (portata === 'tutte' || x.riga.portata === portata))
      .sort((a, b) => b.attesa - a.attesa)
  }, [comande, tavoli, voci, contesto.outletId, reparto, portata, adesso])

  const perStato = (stato: StatoRiga) => righe.filter(r => r.riga.stato === stato)

  const avanza = (comandaId: number, r: RigaComanda, azione: string) => {
    avanzaRiga(comandaId, r.id)
    toast.success(`${r.nome} · ${azione.toLowerCase()}`)
  }

  const inRitardo = righe.filter(r => r.attesa > (SOGLIA[r.riga.stato] ?? 99)).length

  return (
    <div className="fbkds2">
      <PageHead
        title="Monitor di cucina"
        subtitle="Le righe inviate dalla sala, dal pass alla brigata"
        actions={
          <button type="button" className="fbkds2__head-btn" onClick={() => navigate?.('fb-service-monitor')}>
            <i className="fa-solid fa-display" aria-hidden="true" /> Configura i monitor
          </button>
        }
      />

      <FilterToolbar className="fbkds2__bar">
        <SelectField
          name="reparto" label="Reparto" className="fbkds2__f"
          value={reparto}
          options={REPARTI.map(r => ({ value: r.id, label: r.label }))}
          onChange={e => setReparto(e.target.value as typeof reparto)}
        />
        <SelectField
          name="portata" label="Portata" className="fbkds2__f"
          value={portata}
          options={[{ value: 'tutte', label: 'Tutte' }, ...PORTATE.map(p => ({ value: p.id, label: p.label }))]}
          onChange={e => setPortata(e.target.value === 'tutte' ? 'tutte' : +e.target.value)}
        />
        <p className="fbkds2__stato">
          {righe.length} {righe.length === 1 ? 'riga in lavorazione' : 'righe in lavorazione'}
          {!!inRitardo && (
            <span className="fbkds2__stato-ritardo">
              <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {inRitardo} oltre il tempo
            </span>
          )}
        </p>
      </FilterToolbar>

      <div className="fbkds2__colonne">
        {COLONNE.map(col => {
          const lista = perStato(col.stato)
          return (
            <section key={col.stato} className={`fbkds2__col fbkds2__col--${col.stato}`}>
              <header className="fbkds2__col-head">
                <i className={`fa-solid ${col.ico}`} aria-hidden="true" />
                <span className="fbkds2__col-lab">{col.label}</span>
                <span className="fbkds2__col-n">{lista.length}</span>
              </header>

              <ul className="fbkds2__lista">
                {lista.map(x => {
                  const meta = PORTATE.find(p => p.id === x.riga.portata)
                  const tardi = x.attesa > (SOGLIA[col.stato] ?? 99)
                  const senza = x.riga.senza ?? []
                  const extra = x.riga.extra ?? []
                  return (
                    <li key={x.riga.id} className={`fbkds2__card ${tardi ? 'is-tardi' : ''}`}>
                      <header className="fbkds2__card-head">
                        <span className="fbkds2__tav">Tav. {x.tavolo}</span>
                        <span className="fbkds2__portata">
                          <i className={`fa-solid ${meta?.ico}`} aria-hidden="true" /> {meta?.label}
                        </span>
                        <span className="fbkds2__attesa">
                          <i className="fa-regular fa-clock" aria-hidden="true" /> {x.attesa}′
                        </span>
                      </header>

                      <p className="fbkds2__voce">
                        <span className="fbkds2__qta">{x.riga.qta}×</span>
                        <TruncatedText text={x.riga.nome} />
                      </p>

                      {(!!senza.length || !!extra.length || !!x.riga.note) && (
                        <div className="fbkds2__varianti">
                          {senza.map(id => (
                            <span key={`s${id}`} className="fbkds2__var fbkds2__var--senza">
                              <i className="fa-solid fa-ban" aria-hidden="true" /> {nomeIng.get(id) ?? '—'}
                            </span>
                          ))}
                          {extra.map(e => (
                            <span key={`e${e.ingredienteId}`} className="fbkds2__var fbkds2__var--extra">
                              <i className="fa-solid fa-plus" aria-hidden="true" />
                              {e.qta > 1 ? `${e.qta}× ` : ''}{e.nome}
                            </span>
                          ))}
                          {!!x.riga.note && (
                            <span className="fbkds2__var fbkds2__var--nota">
                              <i className="fa-solid fa-comment" aria-hidden="true" /> {x.riga.note}
                            </span>
                          )}
                        </div>
                      )}

                      <footer className="fbkds2__card-foot">
                        <span className="fbkds2__cameriere">{x.numero} · {x.cameriere || 'senza cameriere'}</span>
                        <button
                          type="button" className="fbkds2__avanza"
                          onClick={() => avanza(x.comandaId, x.riga, col.azione)}
                        >
                          <i className="fa-solid fa-check" aria-hidden="true" /> {col.azione}
                        </button>
                      </footer>
                    </li>
                  )
                })}
                {!lista.length && (
                  <li className="fbkds2__vuoto">
                    <i className="fa-solid fa-utensils" aria-hidden="true" />
                    Niente in questa colonna.
                  </li>
                )}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
