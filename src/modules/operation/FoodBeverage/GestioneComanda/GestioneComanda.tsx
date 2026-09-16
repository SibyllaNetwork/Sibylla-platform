// ─── Gestione comanda ─────────────────────────────────────────────────────────
//  Il POS di sala, disegnato per il dito prima che per il mouse: categorie a
//  tessere, voci a card, quantità con due bersagli da 48px e le azioni pesanti
//  (invio in cucina, divisione e chiusura del conto) in una barra in basso,
//  sempre raggiungibile col pollice.
//
//  Il tavolo su cui si lavora arriva dal contesto di servizio condiviso con la
//  Sala; se manca, la pagina chiede di sceglierlo fra i tavoli aperti. Sullo
//  stesso tavolo possono convivere più comande (conti separati).
import React, { useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import Modal from '../../../../core/components/Modal'
import TruncatedText from '../../../../core/components/TruncatedText'
import Tooltip from '../../../../core/components/Tooltip'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import { toast } from '../../../../core/components/Toast/useToast'
import {
  useFbStore, totaleRiga, totaleComanda, scontoComanda, totaleConto, SALE,
} from '../../../../store/useFbStore'
import {
  CATEGORIE_CLIENTE, CATEGORIE_MENU, PORTATE, STATO_RIGA, TIPI_MENU, VOCI_MENU,
  type Comanda, type RigaComanda,
} from '../fb.model'
import './GestioneComanda.sass'

const euro = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })

/** Note ricorrenti: si aggiungono con un tocco invece di scriverle ogni volta. */
const NOTE_RAPIDE = [
  'Senza glutine', 'Senza lattosio', 'Ben cotto', 'Al sangue', 'Poco piccante',
  'Senza cipolla', 'Porzione bambino', 'A parte', 'Prima delle altre',
]

const PAGAMENTI: Array<{ id: NonNullable<Comanda['pagamento']>; label: string; ico: string }> = [
  { id: 'contanti', label: 'Contanti',        ico: 'fa-money-bill-wave' },
  { id: 'carta',    label: 'Carta',           ico: 'fa-credit-card' },
  { id: 'camera',   label: 'Addebito camera', ico: 'fa-bed' },
  { id: 'wallet',   label: 'Wallet Sibylla',  ico: 'fa-wallet' },
]

export default function GestioneComanda({ navigate }: { navigate?: (p: string) => void }) {
  const TURNI   = useFbStore(s => s.turni)
  const contesto    = useFbStore(s => s.contesto)
  const setContesto = useFbStore(s => s.setContesto)
  const tavoli      = useFbStore(s => s.tavoli)
  const comande     = useFbStore(s => s.comande)
  const prenotazioni = useFbStore(s => s.prenotazioni)
  const aggiungiVoce = useFbStore(s => s.aggiungiVoce)
  const setQta      = useFbStore(s => s.setQta)
  const setNotaRiga = useFbStore(s => s.setNotaRiga)
  const setPortataRiga = useFbStore(s => s.setPortataRiga)
  const rimuoviRiga = useFbStore(s => s.rimuoviRiga)
  const inviaComanda = useFbStore(s => s.inviaComanda)
  const setCategoriaCliente = useFbStore(s => s.setCategoriaCliente)
  const setAddebitoCamera = useFbStore(s => s.setAddebitoCamera)
  const setNotaComanda = useFbStore(s => s.setNotaComanda)
  const chiudiConto = useFbStore(s => s.chiudiConto)
  const staccaConto = useFbStore(s => s.staccaConto)
  const nuovaComanda = useFbStore(s => s.nuovaComanda)
  const setCoperti  = useFbStore(s => s.setCoperti)
  const confirm     = useConfirmStore(s => s.confirm)

  // Tavolo di lavoro: quello del contesto oppure, entrando dal menu, il primo
  // tavolo aperto — la pagina non chiede un passaggio in più per iniziare
  const tavoloId = contesto.tavoloId ?? comande.find(c => c.stato === 'aperta')?.tavoloId ?? null

  // Comande aperte sul tavolo: di norma una, ma i conti separati ne creano altre
  const aperte = useMemo(
    () => comande.filter(c => c.tavoloId === tavoloId && c.stato === 'aperta'),
    [comande, tavoloId],
  )
  const [comandaId, setComandaId] = useState<number | null>(null)
  const comanda = aperte.find(c => c.id === comandaId) ?? aperte[0]

  const apriTavolo = useFbStore(s => s.apriTavolo)
  const tavolo = tavoli.find(t => t.id === tavoloId)
  const sala   = SALE.find(s => s.id === tavolo?.salaId)
  const tavoliSala = useMemo(
    () => tavoli.filter(t => t.salaId === (tavolo?.salaId ?? contesto.salaId) && t.stato !== 'bloccato'),
    [tavoli, tavolo, contesto.salaId],
  )
  const turno  = TURNI.find(t => t.id === comanda?.turnoId)
  const pren   = prenotazioni.find(p => p.tavoloId === tavolo?.id && p.data === contesto.data && p.stato !== 'annullata')

  // Catalogo: tipo menu → categoria → voci
  const [tipoId, setTipoId] = useState(1)
  const [catId, setCatId]   = useState<number | null>(null)
  const [portata, setPortata] = useState(1)
  const [cerca, setCerca]   = useState('')
  const [notaDi, setNotaDi] = useState<RigaComanda | null>(null)
  const [notaCom, setNotaCom] = useState(false)
  const [conto, setConto]   = useState(false)
  const [pagamento, setPagamento] = useState<Comanda['pagamento']>('carta')
  const [divisione, setDivisione] = useState<null | 'righe' | 'uguali'>(null)
  const [selRighe, setSelRighe] = useState<string[]>([])
  const [parti, setParti] = useState(2)
  const [archivio, setArchivio] = useState(false)

  const categorie = useMemo(
    () => CATEGORIE_MENU.filter(c => c.tipoId === tipoId).sort((a, b) => a.ordine - b.ordine),
    [tipoId],
  )
  const voci = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    if (q) return VOCI_MENU.filter(v => v.attiva && v.nome.toLowerCase().includes(q))
    const ids = catId ? [catId] : categorie.map(c => c.id)
    return VOCI_MENU.filter(v => v.attiva && ids.includes(v.categoriaId))
  }, [cerca, catId, categorie])

  const daInviare = comanda ? comanda.righe.filter(r => r.stato === 'in-comanda') : []
  const righeOrdinate = useMemo(
    () => comanda ? [...comanda.righe].sort((a, b) => a.portata - b.portata) : [],
    [comanda],
  )
  const catCliente = CATEGORIE_CLIENTE.find(c => c.id === comanda?.categoriaClienteId)
  const chiuseDelTavolo = useMemo(
    () => comande.filter(c => c.tavoloId === tavoloId && c.stato === 'chiusa'),
    [comande, tavoloId],
  )

  // ── Nessun tavolo aperto: si apre da qui, senza cambiare pagina ───────────
  if (!comanda || !tavolo) {
    const liberi = tavoli.filter(t => t.salaId === contesto.salaId && t.stato !== 'bloccato')
    return (
      <div className="fbcom">
        <PageHead
          title="Gestione comanda"
          subtitle="Apri un tavolo per cominciare la comanda"
          actions={
            <button type="button" className="fbcom__head-btn" onClick={() => navigate?.('sala-ristorante')}>
              <i className="fa-solid fa-utensils" aria-hidden="true" /> Vai in sala
            </button>
          }
        />
        <div className="fbcom__apri">
          <i className="fa-solid fa-chair" aria-hidden="true" />
          <p>Nessun tavolo aperto in {SALE.find(s => s.id === contesto.salaId)?.nome}.</p>
          <div className="fbcom__apri-tavoli">
            {liberi.map(t => (
              <button
                key={t.id} type="button" className="fbcom__apri-card"
                onClick={() => {
                  const id = apriTavolo(t.id, Math.max(1, t.capienza - 1), '', contesto.turnoId, 0)
                  setContesto({ tavoloId: t.id, salaId: t.salaId })
                  setComandaId(id)
                  toast.success(`Tavolo ${t.numero} aperto`)
                }}
              >
                <span className="fbcom__apri-num">{t.numero}</span>
                <span className="fbcom__apri-cap">{t.capienza} posti</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Azioni ────────────────────────────────────────────────────────────────
  const invia = () => {
    const n = inviaComanda(comanda.id)
    if (!n) { toast.info('Nessuna riga nuova da inviare'); return }
    toast.success(`${n} ${n === 1 ? 'riga inviata' : 'righe inviate'} in preparazione`)
  }

  const elimina = async (r: RigaComanda) => {
    const ok = await confirm({ message: `Togliere “${r.nome}” dalla comanda?`, confirmLabel: 'Togli' })
    if (ok) rimuoviRiga(comanda.id, r.id)
  }

  const confermaConto = () => {
    chiudiConto(comanda.id, pagamento)
    setConto(false)
    if (aperte.length <= 1) { setContesto({ tavoloId: null }); navigate?.('sala-ristorante') }
    else setComandaId(aperte.find(c => c.id !== comanda.id)?.id ?? null)
    toast.success(`Conto del tavolo ${tavolo.numero} chiuso · ${euro(totaleConto(comanda))}`)
  }

  const confermaStacco = () => {
    if (!selRighe.length) { toast.warning('Scegli le righe del conto da staccare'); return }
    const importo = comanda.righe.filter(r => selRighe.includes(r.id)).reduce((a, r) => a + totaleRiga(r), 0)
    staccaConto(comanda.id, selRighe, pagamento)
    setSelRighe([])
    setDivisione(null)
    toast.success(`Conto staccato e incassato · ${euro(importo)}`)
  }

  const quota = totaleConto(comanda) / Math.max(1, parti)

  return (
    <div className="fbcom">
      <PageHead
        title="Gestione comanda"
        subtitle={`${sala?.nome} · tavolo ${tavolo.numero}${turno ? ` · ${turno.nome} ${turno.oraInizio}–${turno.oraFine}` : ''}`}
        actions={
          <div className="fbcom__head-acts">
            <button type="button" className="fbcom__head-btn" onClick={() => setArchivio(true)}>
              <i className="fa-solid fa-box-archive" aria-hidden="true" /> Archivio
              {!!chiuseDelTavolo.length && <span className="fbcom__head-badge">{chiuseDelTavolo.length}</span>}
            </button>
            <button type="button" className="fbcom__head-btn" onClick={() => navigate?.('sala-ristorante')}>
              <i className="fa-solid fa-utensils" aria-hidden="true" /> Torna in sala
            </button>
          </div>
        }
      />

      {/* Intestazione della comanda: tutto ciò che identifica il servizio */}
      <div className="fbcom__top">
        {/* Il tavolo si cambia da qui, senza passare da un'altra schermata:
            se quello scelto non ha una comanda aperta, viene aperto ora */}
        <div className="fbcom__tavolo">
          <span className="fbcom__tavolo-lab">Tavolo n°</span>
          <select
            className="fbcom__tavolo-sel"
            value={tavolo.id}
            aria-label="Tavolo da servire"
            onChange={e => {
              const id = +e.target.value
              const t = tavoli.find(x => x.id === id)
              if (!t) return
              const aperta = comande.find(c => c.tavoloId === id && c.stato === 'aperta')
              const nuovoId = aperta ? aperta.id : apriTavolo(id, Math.max(1, t.capienza - 1), comanda.cameriere, comanda.turnoId, 0)
              setContesto({ tavoloId: id, salaId: t.salaId })
              setComandaId(nuovoId)
              if (!aperta) toast.success(`Tavolo ${t.numero} aperto`)
            }}
          >
            {tavoliSala.map(t => {
              const c = comande.find(x => x.tavoloId === t.id && x.stato === 'aperta')
              return (
                <option key={t.id} value={t.id}>
                  {t.numero}{c ? ` · ${euro(totaleConto(c))}` : ' · libero'}
                </option>
              )
            })}
          </select>
        </div>

        <div className="fbcom__meta">
          <span className="fbcom__meta-lab">Comande del tavolo</span>
          <div className="fbcom__chips">
            {aperte.map(c => (
              <button
                key={c.id} type="button"
                className={`fbcom__chip ${c.id === comanda.id ? 'is-on' : ''}`}
                onClick={() => setComandaId(c.id)}
              >
                n. {c.numero}<em> {euro(totaleConto(c))}</em>
              </button>
            ))}
            <Tooltip text="Apre un secondo conto sullo stesso tavolo">
              <button
                type="button" className="fbcom__chip fbcom__chip--add"
                onClick={() => { const id = nuovaComanda(tavolo.id); setComandaId(id); toast.success('Nuova comanda aperta sul tavolo') }}
              >
                <i className="fa-solid fa-plus" aria-hidden="true" /> Nuova
              </button>
            </Tooltip>
          </div>
        </div>

        <div className="fbcom__meta">
          <span className="fbcom__meta-lab">Coperti</span>
          <div className="fbcom__stepper fbcom__stepper--sm">
            <button type="button" onClick={() => setCoperti(tavolo.id, comanda.coperti - 1)} aria-label="Meno coperti">
              <i className="fa-solid fa-minus" aria-hidden="true" />
            </button>
            <span>{comanda.coperti}</span>
            <button type="button" onClick={() => setCoperti(tavolo.id, comanda.coperti + 1)} aria-label="Più coperti">
              <i className="fa-solid fa-plus" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="fbcom__meta">
          <span className="fbcom__meta-lab">Ospite</span>
          <span className="fbcom__meta-val">
            <TruncatedText text={pren?.ospite || 'Nessun nominativo'} />
          </span>
        </div>

        <div className="fbcom__meta fbcom__meta--grow">
          <span className="fbcom__meta-lab">Categoria cliente</span>
          <div className="fbcom__chips">
            {CATEGORIE_CLIENTE.map(c => (
              <button
                key={c.id} type="button"
                className={`fbcom__chip ${c.id === comanda.categoriaClienteId ? 'is-on' : ''}`}
                onClick={() => setCategoriaCliente(comanda.id, c.id)}
              >
                {c.nome}{c.scontoPerc > 0 && <em> −{c.scontoPerc}%</em>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="fbcom__body">
        {/* ── Catalogo ─────────────────────────────────────────────────────── */}
        <section className="fbcom__menu">
          <div className="fbcom__menu-bar">
            <div className="fbcom__tipi">
              {TIPI_MENU.map(t => (
                <button
                  key={t.id} type="button"
                  className={`fbcom__tipo ${t.id === tipoId ? 'is-on' : ''}`}
                  onClick={() => { setTipoId(t.id); setCatId(null); setCerca('') }}
                >
                  {t.nome}
                </button>
              ))}
            </div>
            <div className="fbcom__cerca">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input
                type="search" value={cerca} onChange={e => setCerca(e.target.value)}
                placeholder="Cerca una voce…" aria-label="Cerca una voce di menu"
              />
              {!!cerca && (
                <button type="button" onClick={() => setCerca('')} aria-label="Pulisci la ricerca">
                  <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {!cerca && (
            <div className="fbcom__cat">
              <button
                type="button"
                className={`fbcom__cat-btn ${catId === null ? 'is-on' : ''}`}
                onClick={() => setCatId(null)}
              >
                <span className="fbcom__cat-emoji">🍽️</span>
                <span className="fbcom__cat-nome">Tutte</span>
              </button>
              {categorie.map(c => (
                <button
                  key={c.id} type="button"
                  className={`fbcom__cat-btn fbcom__cat-btn--tinta ${c.id === catId ? 'is-on' : ''}`}
                  style={{ '--cat': c.colore } as React.CSSProperties}
                  onClick={() => setCatId(c.id)}
                >
                  <span className="fbcom__cat-nome"><TruncatedText text={c.nome} /></span>
                  <span className="fbcom__cat-emoji">{c.emoji}</span>
                </button>
              ))}
            </div>
          )}

          <div className="fbcom__voci">
            {voci.map(v => {
              const cat = CATEGORIE_MENU.find(c => c.id === v.categoriaId)
              const inComanda = comanda.righe.filter(r => r.voceId === v.id).reduce((a, r) => a + r.qta, 0)
              return (
                <button
                  key={v.id} type="button" className="fbcom__voce"
                  style={{ '--cat': cat?.colore ?? 'var(--color-primary)' } as React.CSSProperties}
                  onClick={() => { aggiungiVoce(comanda.id, v.id, portata); toast.info(`${v.nome} aggiunto`) }}
                >
                  <span className="fbcom__voce-nome"><TruncatedText text={v.nome} /></span>
                  <span className="fbcom__voce-desc">{v.descrizione}</span>
                  <span className="fbcom__voce-foot">
                    <span className="fbcom__voce-prezzo">{euro(v.prezzo)}</span>
                    {!!v.allergeni.length && (
                      <Tooltip text={`Allergeni: ${v.allergeni.join(', ')}`}>
                        <span className="fbcom__voce-all">{v.allergeni.join('')}</span>
                      </Tooltip>
                    )}
                  </span>
                  {inComanda > 0 && <span className="fbcom__voce-badge">{inComanda}</span>}
                </button>
              )
            })}
            {!voci.length && <p className="fbcom__voci-vuoto">Nessuna voce trovata.</p>}
          </div>

          {/* Portata di destinazione: si sceglie PRIMA di toccare le voci */}
          <div className="fbcom__portate">
            <span className="fbcom__portate-lab">Aggiungi a</span>
            {PORTATE.map(p => (
              <button
                key={p.id} type="button"
                className={`fbcom__portata ${p.id === portata ? 'is-on' : ''}`}
                onClick={() => setPortata(p.id)}
              >
                <i className={`fa-solid ${p.ico}`} aria-hidden="true" /> {p.label}
              </button>
            ))}
          </div>
        </section>

        {/* ── Comanda ──────────────────────────────────────────────────────── */}
        <aside className="fbcom__ordine">
          <header className="fbcom__ordine-head">
            <h3>Comanda {comanda.numero}</h3>
            <span>{comanda.righe.length} righe · {comanda.cameriere || 'senza cameriere'}</span>
          </header>

          {!!comanda.nota && (
            <p className="fbcom__nota-com">
              <i className="fa-solid fa-note-sticky" aria-hidden="true" /> {comanda.nota}
            </p>
          )}

          <ul className="fbcom__righe">
            {righeOrdinate.map((r, i) => {
              const prec = righeOrdinate[i - 1]
              const nuovaPortata = !prec || prec.portata !== r.portata
              const meta = PORTATE.find(p => p.id === r.portata)
              return (
                <React.Fragment key={r.id}>
                  {nuovaPortata && (
                    <li className="fbcom__riga-sep">
                      <i className={`fa-solid ${meta?.ico}`} aria-hidden="true" /> {meta?.label}
                    </li>
                  )}
                  <li className={`fbcom__riga ${r.stato === 'in-comanda' ? 'is-nuova' : ''}`}>
                    <div className="fbcom__riga-testa">
                      <span className="fbcom__riga-nome"><TruncatedText text={r.nome} /></span>
                      <span className="fbcom__riga-tot">{euro(totaleRiga(r))}</span>
                    </div>
                    <div className="fbcom__riga-sotto">
                      <div className="fbcom__stepper">
                        <button type="button" onClick={() => setQta(comanda.id, r.id, r.qta - 1)} aria-label={`Meno ${r.nome}`}>
                          <i className="fa-solid fa-minus" aria-hidden="true" />
                        </button>
                        <span>{r.qta}</span>
                        <button type="button" onClick={() => setQta(comanda.id, r.id, r.qta + 1)} aria-label={`Più ${r.nome}`}>
                          <i className="fa-solid fa-plus" aria-hidden="true" />
                        </button>
                      </div>
                      <span className="fbcom__riga-stato" data-stato={r.stato}>{STATO_RIGA[r.stato].label}</span>
                      <button type="button" className="fbcom__riga-act" onClick={() => setNotaDi(r)} aria-label="Nota di riga">
                        <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
                      </button>
                      <button type="button" className="fbcom__riga-act fbcom__riga-act--danger" onClick={() => elimina(r)} aria-label="Togli la riga">
                        <i className="fa-solid fa-trash" aria-hidden="true" />
                      </button>
                    </div>
                    {!!r.note && <p className="fbcom__riga-nota"><i className="fa-solid fa-comment" aria-hidden="true" /> {r.note}</p>}
                  </li>
                </React.Fragment>
              )
            })}
            {!comanda.righe.length && (
              <li className="fbcom__righe-vuoto">
                <i className="fa-solid fa-utensils" aria-hidden="true" />
                Tocca una voce di menu per iniziare la comanda.
              </li>
            )}
          </ul>

          <div className="fbcom__totali">
            <div className="fbcom__tot-row">
              <span>Imponibile</span><strong>{euro(totaleComanda(comanda))}</strong>
            </div>
            {!!scontoComanda(comanda) && (
              <div className="fbcom__tot-row fbcom__tot-row--sconto">
                <span>Sconto {catCliente?.nome} −{catCliente?.scontoPerc}%</span>
                <strong>−{euro(scontoComanda(comanda))}</strong>
              </div>
            )}
            <div className="fbcom__tot-row fbcom__tot-row--tot">
              <span>Totale</span><strong>{euro(totaleConto(comanda))}</strong>
            </div>
          </div>

          {/* Barra azioni: sempre a portata di pollice */}
          <div className="fbcom__azioni">
            <button
              type="button"
              className={`fbcom__azione fbcom__azione--invia ${daInviare.length ? 'is-pronta' : ''}`}
              onClick={invia}
            >
              <i className="fa-solid fa-paper-plane" aria-hidden="true" />
              Invia
              {!!daInviare.length && <span className="fbcom__azione-badge">{daInviare.length}</span>}
            </button>
            <button type="button" className="fbcom__azione" onClick={() => setNotaCom(true)} aria-label="Nota della comanda">
              <i className="fa-solid fa-note-sticky" aria-hidden="true" /> Nota
            </button>
            <button type="button" className="fbcom__azione" onClick={() => window.print()} aria-label="Stampa">
              <i className="fa-solid fa-print" aria-hidden="true" /> Stampa
            </button>
            <button
              type="button" className="fbcom__azione"
              disabled={!comanda.righe.length}
              onClick={() => { setDivisione('uguali'); setParti(Math.max(2, comanda.coperti)) }}
            >
              <i className="fa-solid fa-scissors" aria-hidden="true" /> Dividi
            </button>
            <button
              type="button" className="fbcom__azione fbcom__azione--conto"
              onClick={() => setConto(true)}
              disabled={!comanda.righe.length}
            >
              <i className="fa-solid fa-receipt" aria-hidden="true" /> Chiudi conto
            </button>
          </div>
        </aside>
      </div>

      {/* ── Nota di riga ──────────────────────────────────────────────────── */}
      <Modal open={!!notaDi} onClose={() => setNotaDi(null)} title={notaDi ? `Nota — ${notaDi.nome}` : ''} size="md">
        {notaDi && (
          <div className="fbcom-nota">
            <div className="fbcom-nota__chips">
              {NOTE_RAPIDE.map(n => (
                <button
                  key={n} type="button"
                  className={`fbcom-nota__chip ${notaDi.note.includes(n) ? 'is-on' : ''}`}
                  onClick={() => {
                    const parti = notaDi.note ? notaDi.note.split(' · ').filter(Boolean) : []
                    const nuove = parti.includes(n) ? parti.filter(x => x !== n) : [...parti, n]
                    const testo = nuove.join(' · ')
                    setNotaRiga(comanda.id, notaDi.id, testo)
                    setNotaDi({ ...notaDi, note: testo })
                  }}
                >{n}</button>
              ))}
            </div>

            <label className="fbcom-nota__libera">
              <span>Nota libera</span>
              <textarea
                rows={3} value={notaDi.note}
                onChange={e => { setNotaRiga(comanda.id, notaDi.id, e.target.value); setNotaDi({ ...notaDi, note: e.target.value }) }}
                placeholder="Indicazioni per la cucina…"
              />
            </label>

            <div className="fbcom-nota__portate">
              <span className="fbcom-nota__lab">Portata</span>
              <div className="fbcom__portate fbcom__portate--modale">
                {PORTATE.map(p => (
                  <button
                    key={p.id} type="button"
                    className={`fbcom__portata ${p.id === notaDi.portata ? 'is-on' : ''}`}
                    onClick={() => { setPortataRiga(comanda.id, notaDi.id, p.id); setNotaDi({ ...notaDi, portata: p.id }) }}
                  >
                    <i className={`fa-solid ${p.ico}`} aria-hidden="true" /> {p.label}
                  </button>
                ))}
              </div>
            </div>

            <footer className="fbcom-nota__foot">
              <button type="button" className="fbcom-nota__ok" onClick={() => setNotaDi(null)}>Fatto</button>
            </footer>
          </div>
        )}
      </Modal>

      {/* ── Nota della comanda ────────────────────────────────────────────── */}
      <Modal open={notaCom} onClose={() => setNotaCom(false)} title="Nota della comanda" size="md">
        <div className="fbcom-nota">
          <label className="fbcom-nota__libera">
            <span>Vale per tutto il tavolo</span>
            <textarea
              rows={4} value={comanda.nota}
              onChange={e => setNotaComanda(comanda.id, e.target.value)}
              placeholder="Es. compleanno, servizio lento, ospite di riguardo…"
            />
          </label>
          <footer className="fbcom-nota__foot">
            <button type="button" className="fbcom-nota__ok" onClick={() => setNotaCom(false)}>Fatto</button>
          </footer>
        </div>
      </Modal>

      {/* ── Divisione del conto ───────────────────────────────────────────── */}
      <Modal open={!!divisione} onClose={() => { setDivisione(null); setSelRighe([]) }} title="Dividi il conto" size="lg">
        <div className="fbcom-dividi">
          <div className="fbcom-dividi__seg">
            <button type="button" className={divisione === 'uguali' ? 'is-on' : ''} onClick={() => setDivisione('uguali')}>
              <i className="fa-solid fa-equals" aria-hidden="true" /> Parti uguali
            </button>
            <button type="button" className={divisione === 'righe' ? 'is-on' : ''} onClick={() => setDivisione('righe')}>
              <i className="fa-solid fa-list-check" aria-hidden="true" /> Per consumazione
            </button>
          </div>

          {divisione === 'uguali' && (
            <div className="fbcom-dividi__uguali">
              <span className="fbcom-dividi__lab">In quante parti</span>
              <div className="fbcom__stepper">
                <button type="button" onClick={() => setParti(n => Math.max(2, n - 1))} aria-label="Meno parti">
                  <i className="fa-solid fa-minus" aria-hidden="true" />
                </button>
                <span>{parti}</span>
                <button type="button" onClick={() => setParti(n => n + 1)} aria-label="Più parti">
                  <i className="fa-solid fa-plus" aria-hidden="true" />
                </button>
              </div>
              <div className="fbcom-dividi__quota">
                <span>Ognuno paga</span>
                <strong>{euro(quota)}</strong>
                <em>su un totale di {euro(totaleConto(comanda))}</em>
              </div>
            </div>
          )}

          {divisione === 'righe' && (
            <div className="fbcom-dividi__righe">
              <ul>
                {comanda.righe.map(r => (
                  <li key={r.id}>
                    <label>
                      <input
                        type="checkbox" className="sib-checkbox"
                        checked={selRighe.includes(r.id)}
                        onChange={() => setSelRighe(v => v.includes(r.id) ? v.filter(x => x !== r.id) : [...v, r.id])}
                      />
                      <span className="fbcom-dividi__nome"><TruncatedText text={`${r.qta}× ${r.nome}`} /></span>
                      <span className="fbcom-dividi__prezzo">{euro(totaleRiga(r))}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="fbcom-dividi__quota">
                <span>Conto da staccare</span>
                <strong>{euro(comanda.righe.filter(r => selRighe.includes(r.id)).reduce((a, r) => a + totaleRiga(r), 0))}</strong>
                <em>restano {euro(comanda.righe.filter(r => !selRighe.includes(r.id)).reduce((a, r) => a + totaleRiga(r), 0))} sul tavolo</em>
              </div>
            </div>
          )}

          <div className="fbcom-dividi__pag">
            {PAGAMENTI.filter(p => p.id !== 'camera').map(p => (
              <button
                key={p.id} type="button"
                className={`fbcom-dividi__pag-btn ${pagamento === p.id ? 'is-on' : ''}`}
                onClick={() => setPagamento(p.id)}
              >
                <i className={`fa-solid ${p.ico}`} aria-hidden="true" /> {p.label}
              </button>
            ))}
          </div>

          <footer className="fbcom-dividi__foot">
            <button type="button" className="fbcom-dividi__annulla" onClick={() => { setDivisione(null); setSelRighe([]) }}>Annulla</button>
            {divisione === 'uguali' ? (
              <button
                type="button" className="fbcom-dividi__ok"
                onClick={() => {
                  chiudiConto(comanda.id, pagamento)
                  setDivisione(null)
                  toast.success(`${parti} quote da ${euro(quota)} incassate`)
                  setContesto({ tavoloId: null })
                  navigate?.('sala-ristorante')
                }}
              >
                <i className="fa-solid fa-check" aria-hidden="true" /> Incassa {parti} quote
              </button>
            ) : (
              <button type="button" className="fbcom-dividi__ok" onClick={confermaStacco} disabled={!selRighe.length}>
                <i className="fa-solid fa-scissors" aria-hidden="true" /> Stacca e incassa
              </button>
            )}
          </footer>
        </div>
      </Modal>

      {/* ── Archivio comande del tavolo ───────────────────────────────────── */}
      <Modal open={archivio} onClose={() => setArchivio(false)} title={`Archivio del tavolo ${tavolo.numero}`} size="lg">
        <div className="fbcom-arch">
          {chiuseDelTavolo.map(c => (
            <article key={c.id} className="fbcom-arch__card">
              <header>
                <span className="fbcom-arch__num">n. {c.numero}</span>
                <span className="fbcom-arch__ore">{c.apertaAlle}–{c.chiusaAlle}</span>
                <span className="fbcom-arch__pag">{PAGAMENTI.find(p => p.id === c.pagamento)?.label ?? '—'}</span>
                <span className="fbcom-arch__tot">{euro(totaleConto(c))}</span>
              </header>
              <ul>
                {c.righe.map(r => (
                  <li key={r.id}>
                    <span>{r.qta}× {r.nome}</span>
                    <span>{euro(totaleRiga(r))}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
          {!chiuseDelTavolo.length && <p className="fbcom-arch__vuoto">Nessuna comanda chiusa su questo tavolo.</p>}
        </div>
      </Modal>

      {/* ── Chiusura conto ────────────────────────────────────────────────── */}
      <Modal open={conto} onClose={() => setConto(false)} title={`Conto tavolo ${tavolo.numero}`} size="md">
        <div className="fbcom-conto">
          <div className="fbcom-conto__tot">
            <span>Totale da incassare</span>
            <strong>{euro(totaleConto(comanda))}</strong>
            <em>{comanda.coperti} coperti · {euro(totaleConto(comanda) / Math.max(1, comanda.coperti))} a persona</em>
          </div>

          <div className="fbcom-conto__blk">
            <span className="fbcom-conto__lab">Pagamento</span>
            <div className="fbcom-conto__pag">
              {PAGAMENTI.map(p => (
                <button
                  key={p.id} type="button"
                  className={`fbcom-conto__pag-btn ${pagamento === p.id ? 'is-on' : ''}`}
                  onClick={() => setPagamento(p.id)}
                >
                  <i className={`fa-solid ${p.ico}`} aria-hidden="true" />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {pagamento === 'camera' && (
            <label className="fbcom-conto__camera">
              <span>Numero camera</span>
              <input
                type="text" inputMode="numeric"
                value={comanda.addebitoCamera}
                onChange={e => setAddebitoCamera(comanda.id, e.target.value)}
                placeholder={pren?.camera || 'es. 204'}
              />
            </label>
          )}

          <footer className="fbcom-conto__foot">
            <button type="button" className="fbcom-conto__annulla" onClick={() => setConto(false)}>Annulla</button>
            <button
              type="button" className="fbcom-conto__ok"
              onClick={confermaConto}
              disabled={pagamento === 'camera' && !comanda.addebitoCamera.trim()}
            >
              <i className="fa-solid fa-check" aria-hidden="true" /> Incassa e libera il tavolo
            </button>
          </footer>
        </div>
      </Modal>
    </div>
  )
}
