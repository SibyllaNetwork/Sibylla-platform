import React, { useEffect, useState } from 'react'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import { CheckboxField, InputField, SelectField } from '../../../core/components/form'
import { useConfirmStore } from '../../../store/useConfirmStore'
import type { ElementoLetto, LayoutCamera, PersonalizzazioneCamera, TipologiaCamera } from '../../../store/useTipologieCamereStore'
import { ELEMENTI_LETTO, descriviLetti, elementoLetto, layoutsDi, postiLetto } from './personalizzazione'
import { lettiExtra as lettiExtraTxt, ospiti } from './catalogo'
import './LayoutTipologia.sass'

// ─── Layout della tipologia ───────────────────────────────────────────────────
//  Blocco del pannello Personalizza: elenco di TUTTE le camere della tipologia
//  (numerazione del gestionale), ognuna col suo layout di configurazione
//  (disposizione dei letti) scelto dalla libreria o personalizzato solo per lei;
//  le camere senza assegnazione usano il layout predefinito. La libreria dei
//  layout si crea, modifica, duplica ed elimina dall'editor in modale.

const MAX_QUANTITA = 6
const posti = (n: number) => `${n} ${n === 1 ? 'posto letto' : 'posti letto'}`
let _seq = 0
const nuovoLayoutId = () => `lay-${Date.now()}-${++_seq}`
/** Piano dal numero di camera (101 → 1; numerazioni semplici 1, 2, … → 1° piano). */
const pianoDi = (n: string) => Math.floor(Number(n) / 100) || 1

interface Props {
  t: TipologiaCamera
  numeri: string[]
  pers: PersonalizzazioneCamera
  disabled: boolean
  onChange: (p: PersonalizzazioneCamera) => void
}

export default function LayoutTipologia({ t, numeri, pers, disabled, onChange }: Props) {
  const confirm = useConfirmStore((s) => s.confirm)
  const layouts = layoutsDi(t)
  const predefinito = layouts.find((x) => x.id === pers.layoutPredefinito) ?? layouts[0]
  const assegnati = pers.layoutCamere ?? {}
  const effettivo = (n: string) => layouts.find((x) => x.id === assegnati[n]) ?? predefinito

  const [editor, setEditor] = useState<{ layout: LayoutCamera; nuovo: boolean; camera: string | null } | null>(null)
  // Mostra: '' = tutte le camere (tabella), altrimenti il numero della camera scelta.
  const [mostra, setMostra] = useState('')

  const specifico = (n: string) => layouts.some((x) => x.id === assegnati[n])
  const specifiche = numeri.filter(specifico)
  useEffect(() => { if (mostra && !numeri.includes(mostra)) setMostra('') }, [numeri, mostra])
  const opzioniLayout = [
    { value: '', label: `Predefinito (${predefinito?.nome ?? 'nessuno'})` },
    ...layouts.map((x) => ({ value: x.id, label: `${x.nome} · ${posti(postiLetto(x.letti))}` })),
  ]
  // Nuovo layout per la camera: parte dai letti del layout attuale e le viene assegnato.
  const nuovoPerCamera = (n: string) => {
    const l = effettivo(n)
    setEditor({ nuovo: true, camera: n, layout: { id: nuovoLayoutId(), nome: '', letti: l ? l.letti.map((x) => ({ ...x })) : [{ tipo: 'matrimoniale', quantita: 1 }] } })
  }

  // Personalizza la singola camera: se il suo layout è già solo suo (e non è il
  // predefinito) si modifica quello, altrimenti si parte da una copia dedicata.
  const personalizzaCamera = (n: string) => {
    const l = effettivo(n)
    if (!l) return
    const soloSuo = specifico(n) && l.id !== predefinito?.id && numeri.every((m) => m === n || effettivo(m)?.id !== l.id)
    setEditor(soloSuo ? { nuovo: false, layout: l, camera: n }
      : { nuovo: true, camera: n, layout: { ...l, id: nuovoLayoutId(), nome: `Camera ${n}`, letti: l.letti.map((x) => ({ ...x })) } })
  }

  const assegna = (n: string, id: string) => {
    const lc = { ...assegnati }
    if (id) lc[n] = id
    else delete lc[n]
    onChange({ ...pers, layouts, layoutCamere: lc })
  }

  const salvaLayout = (l: LayoutCamera, nuovo: boolean, assegnaA: string | null) => {
    const ls = nuovo ? [...layouts, l] : layouts.map((x) => (x.id === l.id ? l : x))
    onChange({ ...pers, layouts: ls, layoutCamere: assegnaA ? { ...assegnati, [assegnaA]: l.id } : assegnati })
    setEditor(null)
  }

  const elimina = async (l: LayoutCamera) => {
    const coinvolte = numeri.filter((n) => assegnati[n] === l.id)
    const ok = await confirm({
      title: 'Elimina layout',
      danger: true,
      confirmLabel: 'Elimina',
      message: <>Eliminare il layout <strong>{l.nome}</strong>?{coinvolte.length > 0 && <> {coinvolte.length === 1 ? `La camera ${coinvolte[0]} tornerà` : `Le camere ${coinvolte.join(', ')} torneranno`} al layout predefinito.</>}</>,
    })
    if (!ok) return
    const ls = layouts.filter((x) => x.id !== l.id)
    const lc = Object.fromEntries(Object.entries(assegnati).filter(([, id]) => id !== l.id))
    onChange({ ...pers, layouts: ls, layoutCamere: lc, layoutPredefinito: predefinito?.id === l.id ? ls[0]?.id : pers.layoutPredefinito })
  }

  const nuovo = () => setEditor({ nuovo: true, camera: null, layout: { id: nuovoLayoutId(), nome: '', letti: [{ tipo: 'matrimoniale', quantita: 1 }] } })
  const duplica = (l: LayoutCamera) => setEditor({ nuovo: true, camera: null, layout: { ...l, id: nuovoLayoutId(), nome: `${l.nome} (copia)`, letti: l.letti.map((x) => ({ ...x })) } })

  return (
    <section className="pcam__block laycam">
      <header className="pcam__block-head">
        <span className="pcam__block-ico"><i className="fa-solid fa-ruler-combined" /></span>
        <span className="pcam__block-titles">
          <h4>Layout</h4>
          <span>Tutte le camere della tipologia, ognuna col suo layout: senza un layout specifico la camera usa il predefinito</span>
        </span>
        <button type="button" className="sib-btn sib-btn--secondary laycam__new" disabled={disabled} onClick={nuovo}>
          <i className="fa-light fa-plus" /> Nuovo layout
        </button>
      </header>

      {numeri.length === 0 ? (
        <p className="laycam__empty"><i className="fa-light fa-door-closed" /> Nessuna camera in questa tipologia: imposta il numero di camere per assegnare i layout.</p>
      ) : (
        <div className="laycam__rooms-box">
          <div className="laycam__toolbar">
            <SelectField name={`laycam-mostra-${t.id}`} label="Mostra" className="laycam__f-mostra" value={mostra}
              options={[{ value: '', label: 'Tutte le camere' }, ...numeri.map((n) => ({ value: n, label: n }))]}
              onChange={(e) => setMostra(e.target.value)} />
            <span className="laycam__count">
              {numeri.length} {numeri.length === 1 ? 'camera' : 'camere'} {t.nome || 'della tipologia'}
              {specifiche.length > 0 && <> · {specifiche.length} con layout specifico</>}
            </span>
          </div>

          {mostra ? (() => {
            const l = effettivo(mostra)
            const spec = specifico(mostra)
            return (
              <div className={'laycam__focus' + (spec ? ' is-spec' : '')}>
                <div className="laycam__focus-head">
                  <span className="laycam__focus-num">Camera {mostra}</span>
                  <span className="laycam__focus-sub">{pianoDi(mostra)}° piano · {spec ? 'layout specifico' : 'layout predefinito della tipologia'}</span>
                </div>
                <div className="laycam__focus-row">
                  <SelectField name={`laycam-lay-${t.id}-focus`} label="Layout della camera" className="laycam__f-lay" disabled={disabled}
                    value={spec ? assegnati[mostra] : ''} options={opzioniLayout} onChange={(e) => assegna(mostra, e.target.value)} />
                  <button type="button" className="sib-btn sib-btn--secondary laycam__focus-btn" disabled={disabled} onClick={() => nuovoPerCamera(mostra)}>
                    <i className="fa-light fa-plus" /> Crea nuovo layout
                  </button>
                  {spec && (
                    <button type="button" className="laycam__link" disabled={disabled} onClick={() => assegna(mostra, '')}>
                      <i className="fa-light fa-arrow-rotate-left" /> Torna al predefinito
                    </button>
                  )}
                </div>
                {l && (
                  <div className="laycam__focus-prev">
                    <Letti letti={l.letti} />
                    <span>
                      <strong>{l.nome}</strong> · {descriviLetti(l.letti)} · {posti(postiLetto(l.letti))}
                      {l.note && <em> — {l.note}</em>}
                    </span>
                  </div>
                )}
              </div>
            )
          })() : (
          <div className="sib-table-wrap laycam__rooms">
            <table className="sib-table laycam__table">
              <colgroup>
                <col className="laycam__c-num" />
                <col className="laycam__c-piano" />
                <col className="laycam__c-lay" />
                <col className="laycam__c-letti" />
                <col className="laycam__c-act" />
              </colgroup>
              <thead>
                <tr><th>Camera</th><th>Piano</th><th>Layout</th><th>Letti</th><th className="laycam__th-act">Azioni</th></tr>
              </thead>
              <tbody>
                {numeri.map((n) => {
                  const l = effettivo(n)
                  const spec = specifico(n)
                  return (
                    <tr key={n} className={spec ? 'is-spec' : undefined}>
                      <td><strong className="laycam__num">{n}</strong></td>
                      <td>{pianoDi(n)}°</td>
                      <td>
                        <SelectField name={`laycam-lay-${t.id}-${n}`} ariaLabel={`Layout della camera ${n}`} disabled={disabled}
                          value={spec ? assegnati[n] : ''} options={opzioniLayout}
                          onChange={(e) => assegna(n, e.target.value)} />
                      </td>
                      <td>
                        {l && (
                          <span className="laycam__cell-letti">
                            <Letti letti={l.letti} />
                            <TruncatedText text={`${descriviLetti(l.letti)} · ${posti(postiLetto(l.letti))}`}
                              full={`${descriviLetti(l.letti)} · ${posti(postiLetto(l.letti))}${l.note ? ` — ${l.note}` : ''}`} />
                          </span>
                        )}
                      </td>
                      <td className="laycam__td-act">
                        <Tooltip text={`Personalizza il layout della camera ${n}`}>
                          <button type="button" className="laycam__ico-btn" aria-label={`Personalizza il layout della camera ${n}`} disabled={disabled}
                            onClick={() => personalizzaCamera(n)}><i className="fa-solid fa-pen-ruler" /></button>
                        </Tooltip>
                        {spec && (
                          <Tooltip text="Torna al layout predefinito">
                            <button type="button" className="laycam__ico-btn" aria-label={`Riporta la camera ${n} al layout predefinito`} disabled={disabled}
                              onClick={() => assegna(n, '')}><i className="fa-solid fa-arrow-rotate-left" /></button>
                          </Tooltip>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      <div className="laycam__lib">
        <span className="laycam__lib-title">Layout della tipologia ({layouts.length})</span>
        <ul className="laycam__grid">
          {layouts.map((l) => {
            const pred = l.id === predefinito?.id
            const usano = numeri.filter((n) => effettivo(n)?.id === l.id)
            return (
              <li key={l.id} className="laycam__card">
                <div className="laycam__card-head">
                  <TruncatedText text={l.nome} className="laycam__card-name" />
                  <span className="laycam__card-acts">
                    <Tooltip text="Modifica layout">
                      <button type="button" className="laycam__ico-btn" aria-label={`Modifica ${l.nome}`} disabled={disabled}
                        onClick={() => setEditor({ nuovo: false, layout: l, camera: null })}><i className="fa-solid fa-pen" /></button>
                    </Tooltip>
                    <Tooltip text="Duplica layout">
                      <button type="button" className="laycam__ico-btn" aria-label={`Duplica ${l.nome}`} disabled={disabled}
                        onClick={() => duplica(l)}><i className="fa-solid fa-copy" /></button>
                    </Tooltip>
                    <Tooltip text={layouts.length === 1 ? 'Serve almeno un layout' : 'Elimina layout'}>
                      <button type="button" className="laycam__ico-btn" aria-label={`Elimina ${l.nome}`} disabled={disabled || layouts.length === 1}
                        onClick={() => elimina(l)}><i className="fa-solid fa-trash" /></button>
                    </Tooltip>
                  </span>
                </div>
                <Letti letti={l.letti} />
                <span className="laycam__card-desc">{descriviLetti(l.letti)} · {posti(postiLetto(l.letti))}</span>
                {l.note && <span className="laycam__card-note"><i className="fa-light fa-note-sticky" /> {l.note}</span>}
                <div className="laycam__card-foot">
                  {pred ? (
                    <span className="laycam__pred"><i className="fa-solid fa-star" /> Predefinito</span>
                  ) : (
                    <button type="button" className="laycam__link" disabled={disabled}
                      onClick={() => onChange({ ...pers, layouts, layoutPredefinito: l.id })}>Rendi predefinito</button>
                  )}
                  {usano.length > 0 ? (
                    <Tooltip text={`Camere: ${usano.join(', ')}`}>
                      <span className="laycam__uso"><i className="fa-light fa-door-closed" /> {usano.length} {usano.length === 1 ? 'camera' : 'camere'}</span>
                    </Tooltip>
                  ) : <span className="laycam__uso laycam__uso--none">Nessuna camera</span>}
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {editor && (
        <LayoutEditor key={editor.layout.id} iniziale={editor.layout} nuovo={editor.nuovo} camera={editor.camera}
          nomiUsati={layouts.filter((x) => x.id !== editor.layout.id).map((x) => x.nome.trim().toLowerCase())}
          capacita={t.capacita} lettiExtra={t.lettiExtra}
          onClose={() => setEditor(null)} onSave={salvaLayout} />
      )}
    </section>
  )
}

// Icone dei letti del layout (una per pezzo), con tooltip sul tipo.
function Letti({ letti }: { letti: LayoutCamera['letti'] }) {
  return (
    <span className="laycam__beds">
      {letti.flatMap((x, i) => Array.from({ length: x.quantita }, (_, k) => (
        <Tooltip key={`${i}-${k}`} text={elementoLetto(x.tipo).label}>
          <i className={`fa-solid ${elementoLetto(x.tipo).icona}`} aria-label={elementoLetto(x.tipo).label} />
        </Tooltip>
      )))}
    </span>
  )
}

// ─── Editor layout (crea / modifica) ──────────────────────────────────────────

interface EditorProps {
  iniziale: LayoutCamera
  nuovo: boolean
  camera: string | null
  nomiUsati: string[]
  capacita: number
  lettiExtra: number
  onClose: () => void
  onSave: (l: LayoutCamera, nuovo: boolean, assegnaA: string | null) => void
}

function LayoutEditor({ iniziale, nuovo, camera, nomiUsati, capacita, lettiExtra, onClose, onSave }: EditorProps) {
  const [l, setL] = useState<LayoutCamera>(iniziale)
  const [assegna, setAssegna] = useState(nuovo && !!camera)
  const [tentato, setTentato] = useState(false)
  const nome = l.nome.trim()
  const errNome = !nome ? 'Obbligatorio' : nomiUsati.includes(nome.toLowerCase()) ? 'Esiste già un layout con questo nome' : undefined
  const tot = postiLetto(l.letti)
  const avviso = tot < capacita ? `Meno posti letto della capacità della tipologia (${ospiti(capacita)})`
    : tot > capacita + lettiExtra ? `Più posti letto di quelli previsti dalla tipologia (${ospiti(capacita)}${lettiExtra ? ` + ${lettiExtraTxt(lettiExtra)}` : ''})`
    : null

  const setLetto = (i: number, patch: Partial<LayoutCamera['letti'][number]>) =>
    setL((x) => ({ ...x, letti: x.letti.map((y, j) => (j === i ? { ...y, ...patch } : y)) }))
  const salva = () => {
    setTentato(true)
    if (errNome) return
    onSave({ ...l, nome, note: l.note?.trim() || undefined }, nuovo, assegna && camera ? camera : null)
  }

  return (
    <Modal open onClose={onClose} title={nuovo ? 'Nuovo layout' : 'Modifica layout'} size="md" className="laycam-ed">
      <div className="laycam-ed__body">
        <InputField name="laycam-ed-nome" label="Nome del layout" placeholder="Es. Letti separati" maxLength={60}
          value={l.nome} error={tentato ? errNome : undefined} onChange={(e) => setL({ ...l, nome: e.target.value })} />

        <div className="laycam-ed__letti">
          <span className="laycam-ed__label">Letti</span>
          {l.letti.map((x, i) => (
            <div key={i} className="laycam-ed__row">
              <span className="laycam-ed__row-ico"><i className={`fa-solid ${elementoLetto(x.tipo).icona}`} /></span>
              <SelectField name={`laycam-ed-tipo-${i}`} ariaLabel={`Tipo letto ${i + 1}`} className="laycam-ed__tipo" value={x.tipo}
                options={ELEMENTI_LETTO.map((e) => ({ value: e.id, label: e.posti ? `${e.label} (${posti(e.posti)})` : e.label }))}
                onChange={(e) => setLetto(i, { tipo: e.target.value as ElementoLetto })} />
              <InputField name={`laycam-ed-qta-${i}`} ariaLabel={`Quantità letto ${i + 1}`} type="number" min={1} max={MAX_QUANTITA}
                className="laycam-ed__qta" value={x.quantita}
                onChange={(e) => setLetto(i, { quantita: Math.min(MAX_QUANTITA, Math.max(1, Number(e.target.value) || 1)) })} />
              <Tooltip text={l.letti.length === 1 ? 'Serve almeno un letto' : 'Rimuovi letto'}>
                <button type="button" className="laycam__ico-btn" aria-label="Rimuovi letto" disabled={l.letti.length === 1}
                  onClick={() => setL({ ...l, letti: l.letti.filter((_, j) => j !== i) })}><i className="fa-solid fa-trash" /></button>
              </Tooltip>
            </div>
          ))}
          <button type="button" className="sib-btn sib-btn--ghost laycam-ed__add"
            onClick={() => setL({ ...l, letti: [...l.letti, { tipo: 'singolo', quantita: 1 }] })}>
            <i className="fa-light fa-plus" /> Aggiungi letto
          </button>
        </div>

        <div className="laycam-ed__tot">
          <Letti letti={l.letti} />
          <span><strong>{posti(tot)}</strong> · tipologia per {ospiti(capacita)}{lettiExtra ? ` + ${lettiExtraTxt(lettiExtra)}` : ''}</span>
        </div>
        {avviso && <p className="laycam-ed__warn"><i className="fa-solid fa-triangle-exclamation" /> {avviso}</p>}

        <InputField name="laycam-ed-note" label="Note per l'housekeeping" placeholder="Es. letti uniti verso la finestra, culla a richiesta"
          maxLength={140} value={l.note ?? ''} onChange={(e) => setL({ ...l, note: e.target.value })} />

        {nuovo && camera && (
          <CheckboxField name="laycam-ed-assegna" label={`Assegna subito alla camera ${camera}`} checked={assegna}
            onChange={(e) => setAssegna(e.target.checked)} />
        )}
      </div>
      <div className="laycam-ed__actions">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
        <button type="button" className="sib-btn sib-btn--primary" onClick={salva}>{nuovo ? 'Crea layout' : 'Salva layout'}</button>
      </div>
    </Modal>
  )
}
