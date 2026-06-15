import React, { useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import { InputField } from '../../../core/components/form'
import './AcquistoServizi.sass'

// ── Tipi di pagamento ───────────────────────────────────────────────────────────
type Pagamento = 'carta' | 'personale' | 'aziendale'
const PAGAMENTI: Record<Pagamento, { label: string; icon: string }> = {
  carta:     { label: 'Carta di credito', icon: 'fa-credit-card'      },
  personale: { label: 'Wallet personale', icon: 'fa-wallet'           },
  aziendale: { label: 'Wallet aziendale', icon: 'fa-building-columns' },
}

interface Servizio {
  id: string
  nome: string
  descrizione: string
  img: string
  dataAcquisto: string
  cliente: string
  pagamento: Pagamento
  prezzo: number
}

// ── Dati di esempio (in attesa del cablaggio API) ───────────────────────────────
const IMG = (id: string) => `https://images.unsplash.com/${id}?w=600&q=70&auto=format&fit=crop`
const SERVIZI: Servizio[] = [
  { id: 's1',  nome: 'Spa & Wellness Day',  descrizione: 'Percorso benessere completo: sauna, bagno turco e massaggio rilassante da 50 minuti, con accesso alla zona relax e tisaneria.', img: IMG('photo-1540555700478-4be289fbecef'), dataAcquisto: '12/06/2026', cliente: 'Famiglia Conti',   pagamento: 'aziendale', prezzo: 180 },
  { id: 's2',  nome: 'Transfer Aeroporto',  descrizione: 'Navetta privata Mercedes da/per l\'aeroporto di Fiumicino, autista dedicato e attesa inclusa fino a 60 minuti.',          img: IMG('photo-1503376780353-7e6692767b70'), dataAcquisto: '11/06/2026', cliente: 'Dott. M. Ferrara', pagamento: 'carta',     prezzo: 75 },
  { id: 's3',  nome: 'Cena Degustazione',   descrizione: 'Menu degustazione di 5 portate con wine pairing al ristorante della struttura, tavolo riservato vista terrazza.',         img: IMG('photo-1414235077428-338989a2e8c0'), dataAcquisto: '10/06/2026', cliente: 'Gruppo Aurora',    pagamento: 'aziendale', prezzo: 320 },
  { id: 's4',  nome: 'Noleggio E-bike',     descrizione: 'Mezza giornata di noleggio: 2 biciclette elettriche con caschi, lucchetti e mappa dei percorsi consigliati.',           img: IMG('photo-1485965120184-e220f721d03e'), dataAcquisto: '09/06/2026', cliente: 'Sig.ra Bianchi',   pagamento: 'personale', prezzo: 45 },
  { id: 's5',  nome: 'Late Check-out',      descrizione: 'Check-out posticipato fino alle ore 18:00 con mantenimento della camera e dei servizi inclusi.',                       img: IMG('photo-1566073771259-6a8506099945'), dataAcquisto: '09/06/2026', cliente: 'Mr. J. Smith',     pagamento: 'carta',     prezzo: 40 },
  { id: 's6',  nome: 'Tour Guidato Città',  descrizione: 'Visita guidata di 3 ore del centro storico con guida abilitata in lingua inglese e ingressi prioritari.',             img: IMG('photo-1499678329028-101435549a4e'), dataAcquisto: '08/06/2026', cliente: 'Famiglia Rossi',   pagamento: 'personale', prezzo: 90 },
  { id: 's7',  nome: 'Colazione in Camera', descrizione: 'Breakfast gourmet servito in suite con prodotti freschi, spremuta di stagione e selezione di pasticceria.',          img: IMG('photo-1533089860892-a7c6f0a88666'), dataAcquisto: '08/06/2026', cliente: 'Dott.ssa Greco',   pagamento: 'carta',     prezzo: 35 },
  { id: 's8',  nome: 'Parcheggio Privato',  descrizione: 'Posto auto coperto e custodito all\'interno della struttura, disponibile per l\'intera durata del soggiorno (3 notti).', img: IMG('photo-1506521781263-d8422e82f27a'), dataAcquisto: '07/06/2026', cliente: 'Sig. Esposito',    pagamento: 'aziendale', prezzo: 60 },
]

const fmtEur = (n: number) => `€ ${n.toLocaleString('it-IT')}`

export default function AcquistoServizi({ navigate }: { navigate: (p: string) => void }) {
  const [search, setSearch] = useState('')
  const [filtroPag, setFiltroPag] = useState<Pagamento | 'tutti'>('tutti')
  const [selId, setSelId] = useState<string>(SERVIZI[0].id)

  const filtrati = useMemo(() => {
    const q = search.trim().toLowerCase()
    return SERVIZI.filter(s => {
      const matchSearch = !q || s.nome.toLowerCase().includes(q) || s.cliente.toLowerCase().includes(q)
      const matchPag = filtroPag === 'tutti' || s.pagamento === filtroPag
      return matchSearch && matchPag
    })
  }, [search, filtroPag])

  const totale = filtrati.reduce((sum, s) => sum + s.prezzo, 0)
  const selected = SERVIZI.find(s => s.id === selId) ?? null

  return (
    <div className="acq-serv">
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader title="Acquisto Servizi" subtitle="Servizi acquistati dalla struttura e dettagli di ogni acquisto" />

      {/* ── Toolbar: ricerca + filtro pagamento + totale ──────────────── */}
      <div className="acq-serv__toolbar">
        <div className="acq-serv__search">
          <InputField
            name="search"
            placeholder="Cerca per servizio o cliente"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            iconRight="fa-light fa-magnifying-glass"
          />
        </div>
        <div className="acq-serv__chips">
          <button className={`acq-serv__chip ${filtroPag === 'tutti' ? 'acq-serv__chip--active' : ''}`} onClick={() => setFiltroPag('tutti')}>
            <i className="fa-duotone fa-layer-group" aria-hidden="true" /> Tutti
          </button>
          {(Object.keys(PAGAMENTI) as Pagamento[]).map(p => (
            <button key={p} className={`acq-serv__chip ${filtroPag === p ? 'acq-serv__chip--active' : ''}`} onClick={() => setFiltroPag(p)}>
              <i className={`fa-duotone ${PAGAMENTI[p].icon}`} aria-hidden="true" /> {PAGAMENTI[p].label}
            </button>
          ))}
        </div>
        <div className="acq-serv__total">
          <span className="acq-serv__total-label">Totale</span>
          <span className="acq-serv__total-val">{fmtEur(totale)}</span>
        </div>
      </div>

      {/* ── Split: lista (sinistra) | dettaglio (destra) ──────────────── */}
      <div className="acq-serv__split">

        {/* Lista */}
        <section className="acq-serv__list" aria-label="Elenco servizi acquistati">
          {filtrati.map(s => {
            const pag = PAGAMENTI[s.pagamento]
            return (
              <div
                key={s.id}
                className={`acq-serv__item ${selId === s.id ? 'acq-serv__item--active' : ''}`}
                onClick={() => setSelId(s.id)}
              >
                <div className="acq-serv__item-img" style={{ backgroundImage: `url(${s.img})` }} role="img" aria-label={s.nome} />
                <div className="acq-serv__item-body">
                  <div className="acq-serv__item-top">
                    <span className="acq-serv__item-name">{s.nome}</span>
                    <span className="acq-serv__item-date"><i className="fa-duotone fa-calendar-day" aria-hidden="true" />{s.dataAcquisto}</span>
                  </div>
                  <p className="acq-serv__item-desc">{s.descrizione}</p>
                  <div className="acq-serv__item-foot">
                    <span className={`acq-serv__pay acq-serv__pay--${s.pagamento}`}>
                      <i className={`fa-duotone ${pag.icon}`} aria-hidden="true" />{pag.label}
                    </span>
                    <span className="acq-serv__item-price">{fmtEur(s.prezzo)}</span>
                  </div>
                </div>
              </div>
            )
          })}
          {filtrati.length === 0 && (
            <div className="acq-serv__empty">
              <i className="fa-light fa-cart-shopping acq-serv__empty-ico" aria-hidden="true" />
              <p>Nessun servizio trovato</p>
            </div>
          )}
        </section>

        {/* Dettaglio */}
        <aside className="acq-serv__detail" aria-label="Dettaglio servizio">
          {selected ? (
            <article className="acq-serv__detail-card" key={selected.id}>
              <div className="acq-serv__detail-hero" style={{ backgroundImage: `url(${selected.img})` }} role="img" aria-label={selected.nome}>
                <span className="acq-serv__detail-price">{fmtEur(selected.prezzo)}</span>
              </div>
              <div className="acq-serv__detail-body">
                <h2 className="acq-serv__detail-name">{selected.nome}</h2>
                <p className="acq-serv__detail-desc">{selected.descrizione}</p>

                <div className="acq-serv__detail-grid">
                  <div className="acq-serv__detail-item">
                    <span className="acq-serv__detail-label"><i className="fa-duotone fa-calendar-day" aria-hidden="true" />Data acquisto</span>
                    <span className="acq-serv__detail-value">{selected.dataAcquisto}</span>
                  </div>
                  <div className="acq-serv__detail-item">
                    <span className="acq-serv__detail-label"><i className="fa-duotone fa-user" aria-hidden="true" />Cliente assegnatario</span>
                    <span className="acq-serv__detail-value">{selected.cliente}</span>
                  </div>
                  <div className="acq-serv__detail-item">
                    <span className="acq-serv__detail-label"><i className="fa-duotone fa-money-check-dollar" aria-hidden="true" />Tipo di pagamento</span>
                    <span className="acq-serv__detail-value">
                      <span className={`acq-serv__pay acq-serv__pay--${selected.pagamento}`}>
                        <i className={`fa-duotone ${PAGAMENTI[selected.pagamento].icon}`} aria-hidden="true" />{PAGAMENTI[selected.pagamento].label}
                      </span>
                    </span>
                  </div>
                  <div className="acq-serv__detail-item">
                    <span className="acq-serv__detail-label"><i className="fa-duotone fa-tag" aria-hidden="true" />Prezzo</span>
                    <span className="acq-serv__detail-value acq-serv__detail-value--price">{fmtEur(selected.prezzo)}</span>
                  </div>
                </div>
              </div>
            </article>
          ) : (
            <div className="acq-serv__detail-empty">
              <i className="fa-light fa-hand-pointer acq-serv__detail-empty-ico" aria-hidden="true" />
              <p>Seleziona un servizio per visualizzarne il dettaglio</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
