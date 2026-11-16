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
//  Blocco del pannello Personalizza: si sceglie una camera della tipologia (per
//  numero) e le si associa un layout di configurazione (disposizione dei letti);
//  le camere senza assegnazione usano il layout predefinito. La libreria dei
//  layout si crea, modifica, duplica ed elimina dall'editor in modale.

const MAX_QUANTITA = 6
const posti = (n: number) => `${n} ${n === 1 ? 'posto letto' : 'posti letto'}`
let _seq = 0
const nuovoLayoutId = () => `lay-${Date.now()}-${++_seq}`

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

  const [camera, setCamera] = useState(numeri[0] ?? '')
  useEffect(() => { if (!numeri.includes(camera)) setCamera(numeri[0] ?? '') }, [numeri, camera])
  const [editor, setEditor] = useState<{ layout: LayoutCamera; nuovo: boolean } | null>(null)

  const layoutCamera = camera ? effettivo(camera) : undefined
  const specifiche = numeri.filter((n) => layouts.some((x) => x.id === assegnati[n]))

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

  const nuovo = () => setEditor({ nuovo: true, layout: { id: nuovoLayoutId(), nome: '', letti: [{ tipo: 'matrimoniale', quantita: 1 }] } })
  const duplica = (l: LayoutCamera) => setEditor({ nuovo: true, layout: { ...l, id: nuovoLayoutId(), nome: `${l.nome} (copia)`, letti: l.letti.map((x) => ({ ...x })) } })

  return (
    <section className="pcam__block laycam">
      <header className="pcam__block-head">
        <span className="pcam__block-ico"><i className="fa-solid fa-ruler-combined" /></span>
        <span className="pcam__block-titles">
          <h4>Layout</h4>
          <span>Disposizione dei letti camera per camera: senza un layout specifico la camera usa il predefinito</span>
        </span>
        <button type="button" className="sib-btn sib-btn--secondary laycam__new" disabled={disabled} onClick={nuovo}>
          <i className="fa-light fa-plus" /> Nuovo layout
        </button>
      </header>

      {numeri.length === 0 ? (
        <p className="laycam__empty"><i className="fa-light fa-door-closed" /> Nessuna camera in questa tipologia: imposta il numero di camere per assegnare i layout.</p>
      ) : (
        <div className="laycam__assign">
          <SelectField name={`laycam-cam-${t.id}`} label="Camera" className="laycam__f-cam" value={camera}
            options={numeri.map((n) => ({ value: n, label: assegnati[n] && layouts.some((x) => x.id === assegnati[n]) ? `Camera ${n} · specifico` : `Camera ${n}` }))}
            onChange={(e) => setCamera(e.target.value)} />
          <SelectField name={`laycam-lay-${t.id}`} label="Layout della camera" className="laycam__f-lay" disabled={disabled}
            value={layouts.some((x) => x.id === assegnati[camera]) ? assegnati[camera] : ''}
            options={[
              { value: '', label: `Predefinito della tipologia (${predefinito?.nome ?? 'nessuno'})` },
              ...layouts.map((x) => ({ value: x.id, label: `${x.nome} · ${posti(postiLetto(x.letti))}` })),
            ]}
            onChange={(e) => assegna(camera, e.target.value)} />
          {layoutCamera && (
            <div className="laycam__current" aria-live="polite">
              <Letti letti={layoutCamera.letti} />
              <span className="laycam__current-txt">
                <strong>Camera {camera} · {layoutCamera.nome}</strong>
                <span>{descriviLetti(layoutCamera.letti)} · {posti(postiLetto(layoutCamera.letti))}</span>
              </span>
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
              <li key={l.id} className={'laycam__card' + (layoutCamera?.id === l.id ? ' is-current' : '')}>
                <div className="laycam__card-head">
                  <TruncatedText text={l.nome} className="laycam__card-name" />
                  <span className="laycam__card-acts">
                    <Tooltip text="Modifica layout">
                      <button type="button" className="laycam__ico-btn" aria-label={`Modifica ${l.nome}`} disabled={disabled}
                        onClick={() => setEditor({ nuovo: false, layout: l })}><i className="fa-solid fa-pen" /></button>
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
        {numeri.length > 0 && (
          <span className="laycam__sum">
            {specifiche.length === 0 ? 'Tutte le camere usano il layout predefinito.'
              : `${specifiche.length} ${specifiche.length === 1 ? 'camera' : 'camere'} su ${numeri.length} con un layout specifico: ${specifiche.join(', ')}.`}
          </span>
        )}
      </div>

      {editor && (
        <LayoutEditor key={editor.layout.id} iniziale={editor.layout} nuovo={editor.nuovo} camera={camera || null}
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
