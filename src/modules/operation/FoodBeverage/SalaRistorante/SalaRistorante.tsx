// ─── Sala ristorante ──────────────────────────────────────────────────────────
//  Plancia di servizio del capo sala, pensata PRIMA per il touch (tablet o
//  monitor in sala): niente interazioni legate all'hover, bersagli ≥ 48px,
//  azioni sempre visibili in un pannello laterale invece che in menu contestuali.
//
//  Struttura: barra di servizio (outlet → sala → turno) · planimetria dei tavoli
//  con lo stato a colpo d'occhio · pannello con il dettaglio del tavolo scelto,
//  le sue azioni e le prenotazioni in arrivo per il turno.
import React, { useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import Modal from '../../../../core/components/Modal'
import Tooltip from '../../../../core/components/Tooltip'
import TruncatedText from '../../../../core/components/TruncatedText'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import { toast } from '../../../../core/components/Toast/useToast'
import { useFbStore, totaleConto, OUTLETS, SALE, TURNI } from '../../../../store/useFbStore'
import {
  CAMERIERI, CATEGORIE_CLIENTE, STATI_TAVOLO, STATO_TAVOLO,
  type StatoTavolo, type Tavolo,
} from '../fb.model'
import './SalaRistorante.sass'

const euro = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })

/** Iniziali del cameriere per il badge sul tavolo. */
const iniziali = (nome: string | null) =>
  !nome ? '' : nome.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()

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
  const confirm      = useConfirmStore(s => s.confirm)

  const { outletId, salaId, turnoId } = contesto

  // Filtro per stato: si tocca un contatore della legenda e la mappa evidenzia
  const [filtro, setFiltro] = useState<StatoTavolo | null>(null)
  const [sel, setSel] = useState<number | null>(null)
  // Modale di apertura tavolo (coperti, cameriere, categoria cliente)
  const [apertura, setApertura] = useState<Tavolo | null>(null)
  const [coperti, setCoperti] = useState(2)
  const [cameriere, setCameriere] = useState(CAMERIERI[0])
  const [catCliente, setCatCliente] = useState(0)
  // Trasferimento: si sceglie il tavolo di destinazione toccandolo sulla mappa
  const [trasferimento, setTrasferimento] = useState<number | null>(null)

  const saleOutlet = useMemo(() => SALE.filter(s => s.outletId === outletId), [outletId])
  const turniOutlet = useMemo(() => TURNI.filter(t => t.outletId === outletId), [outletId])
  const tavoliSala  = useMemo(() => tavoli.filter(t => t.salaId === salaId), [tavoli, salaId])
  const sala        = SALE.find(s => s.id === salaId)
  const turno       = TURNI.find(t => t.id === turnoId)

  const conteggi = useMemo(() => {
    const c = Object.fromEntries(STATI_TAVOLO.map(s => [s, 0])) as Record<StatoTavolo, number>
    tavoliSala.forEach(t => { c[t.stato]++ })
    return c
  }, [tavoliSala])

  const copertiInSala = tavoliSala.reduce((a, t) => a + t.coperti, 0)
  const incassoSala = useMemo(
    () => comande.filter(c => c.salaId === salaId).reduce((a, c) => a + totaleConto(c), 0),
    [comande, salaId],
  )

  const tavolo   = sel === null ? undefined : tavoli.find(t => t.id === sel)
  const comanda  = tavolo ? comande.find(c => c.tavoloId === tavolo.id && c.stato === 'aperta') : undefined
  const prenTurno = useMemo(
    () => prenotazioni
      .filter(p => p.data === contesto.data && p.outletId === outletId && (p.turnoId === turnoId || turnoId === null))
      .filter(p => p.stato !== 'annullata')
      .sort((a, b) => a.ora.localeCompare(b.ora)),
    [prenotazioni, contesto.data, outletId, turnoId],
  )
  const prenDelTavolo = tavolo ? prenTurno.find(p => p.tavoloId === tavolo.id) : undefined

  // ── Azioni ─────────────────────────────────────────────────────────────────
  const tocca = (t: Tavolo) => {
    // Trasferimento in corso: il tocco successivo sceglie la destinazione
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

  const confermaApertura = () => {
    if (!apertura) return
    const comandaId = apriTavolo(apertura.id, coperti, cameriere, turnoId, catCliente)
    setContesto({ tavoloId: apertura.id, salaId: apertura.salaId })
    setApertura(null)
    setSel(apertura.id)
    toast.success(`Tavolo ${apertura.numero} aperto · ${coperti} coperti`)
    return comandaId
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

  return (
    <div className="fbsala">
      <PageHead
        title="Sala ristorante"
        subtitle="Stato dei tavoli in tempo reale, apertura e passaggio alla comanda"
        actions={
          <button type="button" className="fbsala__head-btn" onClick={() => navigate?.('libro-prenotazioni')}>
            <i className="fa-solid fa-book" aria-hidden="true" /> Libro prenotazioni
          </button>
        }
      />

      {/* Barra di servizio: outlet → sala → turno, tutto a bersagli grandi */}
      <div className="fbsala__bar">
        <div className="fbsala__pick">
          <span className="fbsala__pick-lab">Outlet</span>
          <div className="fbsala__chips">
            {OUTLETS.map(o => (
              <button
                key={o.id} type="button"
                className={`fbsala__chip ${o.id === outletId ? 'is-on' : ''}`}
                onClick={() => {
                  const prima = SALE.find(s => s.outletId === o.id)
                  const t = TURNI.find(x => x.outletId === o.id)
                  setContesto({ outletId: o.id, salaId: prima?.id ?? salaId, turnoId: t?.id ?? null })
                  setSel(null)
                }}
              >
                {o.nome}
              </button>
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
                onClick={() => { setContesto({ salaId: s.id }); setSel(null) }}
              >
                {s.nome}
              </button>
            ))}
          </div>
        </div>

        <div className="fbsala__pick">
          <span className="fbsala__pick-lab">Turno</span>
          <div className="fbsala__chips">
            {turniOutlet.map(t => (
              <button
                key={t.id} type="button"
                className={`fbsala__chip ${t.id === turnoId ? 'is-on' : ''}`}
                onClick={() => setContesto({ turnoId: t.id })}
              >
                {t.servizio} · {t.oraInizio}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="fbsala__body">
        {/* ── Planimetria ─────────────────────────────────────────────────── */}
        <section className="fbsala__mappa-wrap">
          <header className="fbsala__mappa-head">
            <div className="fbsala__mappa-tit">
              <i className="fa-solid fa-utensils" aria-hidden="true" />
              <span>{sala?.nome}</span>
              <em>{turno ? `${turno.nome} · ${turno.oraInizio}–${turno.oraFine}` : 'Nessun turno'}</em>
            </div>
            <div className="fbsala__mappa-kpi">
              <span><strong>{copertiInSala}</strong>/{sala?.capienzaMax} coperti</span>
              <span><strong>{euro(incassoSala)}</strong> in sala</span>
            </div>
          </header>

          {trasferimento !== null && (
            <div className="fbsala__hint">
              <i className="fa-solid fa-arrow-right-arrow-left" aria-hidden="true" />
              Tocca il tavolo libero di destinazione
              <button type="button" className="fbsala__hint-x" onClick={() => setTrasferimento(null)}>Annulla</button>
            </div>
          )}

          <div className="fbsala__mappa">
            {tavoliSala.map(t => {
              const meta = STATO_TAVOLO[t.stato]
              const c = comande.find(x => x.tavoloId === t.id && x.stato === 'aperta')
              const spento = filtro !== null && t.stato !== filtro
              return (
                <button
                  key={t.id}
                  type="button"
                  className={[
                    'fbsala__tav',
                    `fbsala__tav--${t.stato}`,
                    `fbsala__tav--${t.forma}`,
                    sel === t.id ? 'is-sel' : '',
                    spento ? 'is-off' : '',
                    trasferimento === t.id ? 'is-src' : '',
                  ].filter(Boolean).join(' ')}
                  style={{ '--x': t.x, '--y': t.y } as React.CSSProperties}
                  onClick={() => tocca(t)}
                  aria-label={`Tavolo ${t.numero}, ${meta.label}`}
                >
                  <span className="fbsala__tav-num">{t.numero}</span>
                  <span className="fbsala__tav-cap">
                    <i className="fa-solid fa-user-group" aria-hidden="true" />
                    {t.coperti || t.capienza}
                  </span>
                  {c && <span className="fbsala__tav-tot">{euro(totaleConto(c))}</span>}
                  {t.cameriere && <span className="fbsala__tav-cam">{iniziali(t.cameriere)}</span>}
                </button>
              )
            })}
            {!tavoliSala.length && (
              <p className="fbsala__vuoto">Nessun tavolo configurato per questa sala.</p>
            )}
          </div>

          {/* Legenda = filtro: tocco su uno stato, la mappa isola quei tavoli */}
          <div className="fbsala__legenda">
            {STATI_TAVOLO.map(s => (
              <button
                key={s} type="button"
                className={`fbsala__lg ${filtro === s ? 'is-on' : ''}`}
                onClick={() => setFiltro(f => f === s ? null : s)}
              >
                <span className="fbsala__lg-dot" data-stato={s} />
                <span className="fbsala__lg-n">{conteggi[s]}</span>
                <span className="fbsala__lg-l">{STATO_TAVOLO[s].label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Pannello: dettaglio tavolo + prenotazioni del turno ──────────── */}
        <aside className="fbsala__panel">
          {!tavolo && (
            <div className="fbsala__empty">
              <i className="fa-solid fa-hand-pointer" aria-hidden="true" />
              <p>Tocca un tavolo per aprirlo, gestirne la comanda o chiudere il conto.</p>
            </div>
          )}

          {tavolo && (
            <div className="fbsala__card">
              <header className="fbsala__card-head" data-stato={tavolo.stato}>
                <div>
                  <span className="fbsala__card-eyebrow">Tavolo</span>
                  <h3 className="fbsala__card-num">{tavolo.numero}</h3>
                </div>
                <span className="fbsala__card-stato">
                  <i className={`fa-solid ${STATO_TAVOLO[tavolo.stato].ico}`} aria-hidden="true" />
                  {STATO_TAVOLO[tavolo.stato].label}
                </span>
              </header>

              <dl className="fbsala__dati">
                <div><dt>Capienza</dt><dd>{tavolo.capienza} posti</dd></div>
                <div><dt>Coperti</dt><dd>{tavolo.coperti || '—'}</dd></div>
                <div><dt>Cameriere</dt><dd><TruncatedText text={tavolo.cameriere || '—'} /></dd></div>
                <div><dt>Aperto alle</dt><dd>{tavolo.apertoAlle || '—'}</dd></div>
                {comanda && <div><dt>Comanda</dt><dd>n. {comanda.numero} · {comanda.righe.length} righe</dd></div>}
                {comanda && <div className="fbsala__dati--tot"><dt>Conto</dt><dd>{euro(totaleConto(comanda))}</dd></div>}
              </dl>

              {prenDelTavolo && (
                <div className="fbsala__pren-tav">
                  <i className="fa-solid fa-bookmark" aria-hidden="true" />
                  <span><strong>{prenDelTavolo.ospite}</strong> · {prenDelTavolo.ora} · {prenDelTavolo.pax} pax</span>
                </div>
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

                {tavolo.stato !== 'bloccato' ? (
                  <button type="button" className="fbsala__act" onClick={() => setStato(tavolo.id, 'bloccato')}>
                    <i className="fa-solid fa-ban" aria-hidden="true" /> Fuori servizio
                  </button>
                ) : (
                  <button type="button" className="fbsala__act" onClick={() => setStato(tavolo.id, 'libero')}>
                    <i className="fa-solid fa-rotate-left" aria-hidden="true" /> Rimetti in servizio
                  </button>
                )}

                {tavolo.stato !== 'libero' && (
                  <button type="button" className="fbsala__act fbsala__act--danger" onClick={() => chiediLibera(tavolo)}>
                    <i className="fa-solid fa-broom" aria-hidden="true" /> Libera
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="fbsala__pren">
            <header className="fbsala__pren-head">
              <h3>In arrivo</h3>
              <span>{prenTurno.length} prenotazioni</span>
            </header>
            <ul className="fbsala__pren-list">
              {prenTurno.slice(0, 8).map(p => {
                const tav = p.tavoloId ? tavoli.find(t => t.id === p.tavoloId) : undefined
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="fbsala__pren-row"
                      onClick={() => { if (tav) setSel(tav.id) }}
                    >
                      <span className="fbsala__pren-ora">{p.ora}</span>
                      <span className="fbsala__pren-nome"><TruncatedText text={p.ospite} /></span>
                      <span className="fbsala__pren-pax"><i className="fa-solid fa-user-group" aria-hidden="true" />{p.pax}</span>
                      <span className={`fbsala__pren-tav ${tav ? '' : 'is-none'}`}>{tav ? tav.numero : 'da assegnare'}</span>
                    </button>
                  </li>
                )
              })}
              {!prenTurno.length && <li className="fbsala__pren-vuoto">Nessuna prenotazione per il turno.</li>}
            </ul>
            <button type="button" className="fbsala__pren-all" onClick={() => navigate?.('ospiti-giorno')}>
              Ospiti del giorno <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </button>
          </div>
        </aside>
      </div>

      {/* ── Apertura tavolo: stepper e chip, tutto a misura di dito ────────── */}
      <Modal
        open={!!apertura}
        onClose={() => setApertura(null)}
        title={apertura ? `Apri il tavolo ${apertura.numero}` : ''}
        size="md"
        className="fbsala-modal"
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
                  <button
                    key={c} type="button"
                    className={`fbsala-apri__chip ${c === cameriere ? 'is-on' : ''}`}
                    onClick={() => setCameriere(c)}
                  >{c}</button>
                ))}
              </div>
            </div>

            <div className="fbsala-apri__blk">
              <span className="fbsala-apri__lab">Categoria cliente</span>
              <div className="fbsala-apri__chips">
                {CATEGORIE_CLIENTE.map(c => (
                  <button
                    key={c.id} type="button"
                    className={`fbsala-apri__chip ${c.id === catCliente ? 'is-on' : ''}`}
                    onClick={() => setCatCliente(c.id)}
                  >
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
                onClick={() => {
                  const t = apertura
                  confermaApertura()
                  if (t) vaiAllaComanda(t)
                }}
              >
                <Tooltip text="Apre il tavolo e passa subito alla comanda">
                  <span><i className="fa-solid fa-receipt" aria-hidden="true" /> Apri e ordina</span>
                </Tooltip>
              </button>
            </footer>
          </div>
        )}
      </Modal>
    </div>
  )
}
