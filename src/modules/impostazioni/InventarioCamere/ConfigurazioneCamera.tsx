import React, { useRef, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Tooltip from '../../../core/components/Tooltip'
import { toast } from '../../../core/components/Toast/useToast'
import { InputField, SelectField, TextareaField } from '../../../core/components/form'
import type { TipologiaCamera } from '../../../store/useTipologieCamereStore'
import RoomIllustration from './RoomIllustration'
import { AMENITY_GROUPS, MAX_CAPACITA, MAX_DESCRIZIONE, MAX_GALLERY, MAX_LETTI_EXTRA, TIPI, lettiExtra, ospiti } from './catalogo'
import './ConfigurazioneCamera.sass'

// ─── Configurazione camera / Modifica camera ──────────────────────────────────
//  Scheda di creazione (da Allestisci, tipologia già scelta) e di modifica (dalla
//  matita) della camera. A sinistra l'anteprima viva e la completezza della
//  scheda, a destra le quattro sezioni; Salva in fondo, sempre a portata.

interface Props {
  tipologia: TipologiaCamera
  nuova: boolean
  pianiDisponibili: string[]
  onBack: () => void
  onSave: (t: TipologiaCamera) => void
}

const SEZIONI = [
  { id: 'dati', titolo: 'Dati camera', sotto: 'Tipologia, capienza e piani' },
  { id: 'presentazione', titolo: 'Presentazione', sotto: 'Come appare sui canali online' },
  { id: 'caratteristiche', titolo: 'Caratteristiche', sotto: 'Dotazioni e servizi della camera' },
  { id: 'immagini', titolo: 'Immagini', sotto: 'Foto principale e galleria' },
] as const

export default function ConfigurazioneCamera({ tipologia, nuova, pianiDisponibili, onBack, onSave }: Props) {
  const [t, setT] = useState<TipologiaCamera>(tipologia)
  const [errNome, setErrNome] = useState(false)
  const set = (patch: Partial<TipologiaCamera>) => setT((x) => ({ ...x, ...patch }))
  const dirty = JSON.stringify(t) !== JSON.stringify(tipologia)
  const piani = t.piani ?? []

  const completa: Record<(typeof SEZIONI)[number]['id'], boolean> = {
    dati: !!t.nome.trim() && t.numero > 0 && piani.length > 0,
    presentazione: !!t.descrizione.trim(),
    caratteristiche: t.amenities.length > 0,
    immagini: !!t.immagine,
  }
  const fatte = Object.values(completa).filter(Boolean).length

  const toggleAmenity = (a: string) => set({ amenities: t.amenities.includes(a) ? t.amenities.filter((x) => x !== a) : [...t.amenities, a] })
  const togglePiano = (pn: string) => set({ piani: pianiDisponibili.filter((x) => (x === pn ? !piani.includes(x) : piani.includes(x))) })
  const vaiA = (id: string) => document.getElementById(`ccam-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const salva = () => {
    if (!t.nome.trim()) {
      setErrNome(true)
      vaiA('dati')
      toast.error('Dai un nome alla camera.')
      return
    }
    onSave(t)
  }

  return (
    <div className="ccam">
      <PageHead title={nuova ? 'Configurazione camera' : 'Modifica camera'} onBack={onBack}
        subtitle={nuova ? 'Inserisci i dati della nuova camera: al salvataggio entra nell\'inventario' : `${tipologia.nome} · dati, presentazione, caratteristiche e immagini`} />

      <div className="ccam__layout">
        {/* ─── Anteprima + completezza ─────────────────────────────────────── */}
        <aside className="ccam__aside">
          <div className="ccam__preview">
            <div className="ccam__preview-media">
              {t.immagine ? <img src={t.immagine} alt={t.nome} /> : <RoomIllustration tipo={t.tipo} lettiExtra={t.lettiExtra} fill />}
              <span className="ccam__preview-badge">{t.tipo}</span>
              {nuova && <span className="ccam__preview-new">Nuova</span>}
            </div>
            <div className="ccam__preview-body">
              <h3 className="ccam__preview-title">{t.nome.trim() || 'Camera senza nome'}</h3>
              <p className="ccam__preview-sub">{t.nomeOnline.trim() ? <>Online come <strong>{t.nomeOnline}</strong></> : 'Nome online non impostato'}</p>
              <ul className="ccam__facts">
                <li><i className="fa-light fa-user-group" /> {ospiti(t.capacita)}</li>
                {t.lettiExtra > 0 && <li><i className="fa-light fa-bed" /> +{lettiExtra(t.lettiExtra)}</li>}
                <li><i className="fa-light fa-door-closed" /> {t.numero} {t.numero === 1 ? 'camera' : 'camere'}</li>
                {piani.length > 0 && <li><i className="fa-light fa-layer-group" /> {piani.length} {piani.length === 1 ? 'piano' : 'piani'}</li>}
              </ul>
            </div>
          </div>

          <div className="ccam__progress">
            <div className="ccam__progress-head">
              <span>Completezza scheda</span>
              <strong>{fatte}/{SEZIONI.length}</strong>
            </div>
            <progress className="ccam__bar" value={fatte} max={SEZIONI.length} />
            <ol className="ccam__steps">
              {SEZIONI.map((s, i) => (
                <li key={s.id}>
                  <button type="button" className={'ccam__step' + (completa[s.id] ? ' is-done' : '')} onClick={() => vaiA(s.id)}>
                    <span className="ccam__step-dot">{completa[s.id] ? <i className="fa-solid fa-check" /> : i + 1}</span>
                    {s.titolo}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </aside>

        {/* ─── Sezioni ─────────────────────────────────────────────────────── */}
        <div className="ccam__main">
          <Sezione n={1} {...SEZIONI[0]} done={completa.dati}>
            <div className="ccam__label">Tipologia</div>
            <div className="ccam__tipi" role="radiogroup" aria-label="Tipologia">
              {TIPI.map((tipo) => (
                <button key={tipo} type="button" role="radio" aria-checked={t.tipo === tipo}
                  className={'ccam__tipo' + (t.tipo === tipo ? ' is-on' : '')} onClick={() => set({ tipo })}>
                  <RoomIllustration tipo={tipo} className="ccam__tipo-ill" />
                  <span>{tipo}</span>
                  {t.tipo === tipo && <i className="fa-solid fa-circle-check ccam__tipo-check" />}
                </button>
              ))}
            </div>

            <div className="ccam__grid">
              <InputField name="nome" label="Nome camera" required className="ccam__span-2" placeholder="Es. Doppia vista mare"
                value={t.nome} error={errNome ? 'Obbligatorio' : undefined}
                onChange={(e) => { set({ nome: e.target.value }); if (e.target.value.trim()) setErrNome(false) }} />
              <InputField name="numero" label="N. camere" type="number" min={0} value={t.numero}
                onChange={(e) => set({ numero: Math.max(0, Number(e.target.value) || 0) })} />
              <SelectField name="capacita" label="Capacità" value={t.capacita}
                options={Array.from({ length: MAX_CAPACITA }, (_, i) => ({ value: i + 1, label: ospiti(i + 1) }))}
                onChange={(e) => set({ capacita: Number(e.target.value) })} />
              <SelectField name="lettiExtra" label="Letti extra" value={t.lettiExtra}
                options={Array.from({ length: MAX_LETTI_EXTRA + 1 }, (_, i) => ({ value: i, label: i === 0 ? 'Nessuno' : String(i) }))}
                onChange={(e) => set({ lettiExtra: Number(e.target.value) })} />
            </div>

            <div className="ccam__label">Piani <span className="ccam__label-hint">dove si trovano le camere di questa tipologia</span></div>
            <div className="ccam__chips">
              {pianiDisponibili.map((pn) => {
                const on = piani.includes(pn)
                return (
                  <button key={pn} type="button" aria-pressed={on} className={'ccam__chip' + (on ? ' is-on' : '')} onClick={() => togglePiano(pn)}>
                    <i className={on ? 'fa-solid fa-check' : 'fa-light fa-plus'} /> {pn}
                  </button>
                )
              })}
            </div>
          </Sezione>

          <Sezione n={2} {...SEZIONI[1]} done={completa.presentazione}>
            <div className="ccam__grid ccam__grid--2">
              <InputField name="nomeOnline" label="Nome sui canali online" placeholder="Es. Deluxe Sea View"
                hint="Se vuoto, sui canali si usa il nome della camera" value={t.nomeOnline} onChange={(e) => set({ nomeOnline: e.target.value })} />
              <TextareaField name="descrizione" label="Descrizione" rows={4} placeholder="Comfort, vista, dotazioni…"
                hint={`${t.descrizione.length}/${MAX_DESCRIZIONE} caratteri`} value={t.descrizione}
                onChange={(e) => set({ descrizione: e.target.value.slice(0, MAX_DESCRIZIONE) })} />
            </div>
          </Sezione>

          <Sezione n={3} {...SEZIONI[2]} done={completa.caratteristiche}
            extra={<span className="ccam__count">{t.amenities.length} selezionate</span>}>
            <div className="ccam__groups">
              {AMENITY_GROUPS.map((g) => (
                <div key={g.titolo} className="ccam__group">
                  <div className="ccam__group-title"><i className={`fa-light ${g.icona}`} /> {g.titolo}</div>
                  <div className="ccam__chips">
                    {g.voci.map(([a, ico]) => {
                      const on = t.amenities.includes(a)
                      return (
                        <button key={a} type="button" aria-pressed={on} className={'ccam__chip' + (on ? ' is-on' : '')} onClick={() => toggleAmenity(a)}>
                          <i className={`${on ? 'fa-solid' : 'fa-light'} ${ico}`} /> {a}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Sezione>

          <Sezione n={4} {...SEZIONI[3]} done={completa.immagini}>
            <div className="ccam__media">
              <div>
                <div className="ccam__label">Immagine principale <span className="ccam__label-hint">copertina sui canali online</span></div>
                <ImageDropzone value={t.immagine} onPick={(src) => set({ immagine: src })} onClear={() => set({ immagine: null })} />
              </div>
              <div>
                <div className="ccam__label">Galleria <span className="ccam__label-hint">{t.gallery.length}/{MAX_GALLERY}</span></div>
                <GalleryGrid images={t.gallery} max={MAX_GALLERY}
                  onAdd={(srcs) => set({ gallery: [...t.gallery, ...srcs].slice(0, MAX_GALLERY) })}
                  onRemove={(i) => set({ gallery: t.gallery.filter((_, idx) => idx !== i) })} />
              </div>
            </div>
          </Sezione>
        </div>
      </div>

      {/* ─── Barra di salvataggio ──────────────────────────────────────────── */}
      <div className="ccam__savebar">
        <span className={'ccam__savebar-state' + (nuova || dirty ? ' is-pending' : '')}>
          <i className={`fa-solid ${nuova || dirty ? 'fa-circle-dot' : 'fa-circle-check'}`} />
          {nuova ? 'Nuova camera, non ancora salvata' : dirty ? 'Modifiche non salvate' : 'Nessuna modifica'}
        </span>
        <span className="ccam__savebar-acts">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={onBack}>Annulla</button>
          <button type="button" className="sib-btn sib-btn--primary" disabled={!nuova && !dirty} onClick={salva}>
            <i className="fa-light fa-floppy-disk" /> {nuova ? 'Salva camera' : 'Salva modifiche'}
          </button>
        </span>
      </div>
    </div>
  )
}

function Sezione({ n, id, titolo, sotto, done, extra, children }: {
  n: number; id: string; titolo: string; sotto: string; done: boolean; extra?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <section id={`ccam-${id}`} className="ccam__card">
      <header className="ccam__card-head">
        <span className={'ccam__num' + (done ? ' is-done' : '')}>{done ? <i className="fa-solid fa-check" /> : n}</span>
        <span className="ccam__card-titles">
          <h3>{titolo}</h3>
          <span>{sotto}</span>
        </span>
        {extra}
      </header>
      <div className="ccam__card-body">{children}</div>
    </section>
  )
}

// ─── Immagini ─────────────────────────────────────────────────────────────────

const files = (e: React.ChangeEvent<HTMLInputElement>) => {
  const out = Array.from(e.target.files ?? []).map((f) => URL.createObjectURL(f))
  e.target.value = ''
  return out
}

function ImageDropzone({ value, onPick, onClear }: { value: string | null; onPick: (src: string) => void; onClear: () => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const input = <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { const [src] = files(e); if (src) onPick(src) }} />
  if (value) {
    return (
      <div className="ccam__dz ccam__dz--filled">
        <img src={value} alt="Immagine principale" />
        <span className="ccam__dz-acts">
          <Tooltip text="Sostituisci immagine">
            <button type="button" className="ccam__dz-btn" aria-label="Sostituisci" onClick={() => ref.current?.click()}><i className="fa-solid fa-arrows-rotate" /></button>
          </Tooltip>
          <Tooltip text="Rimuovi immagine">
            <button type="button" className="ccam__dz-btn" aria-label="Rimuovi" onClick={onClear}><i className="fa-solid fa-trash-can" /></button>
          </Tooltip>
        </span>
        {input}
      </div>
    )
  }
  return (
    <button type="button" className="ccam__dz" onClick={() => ref.current?.click()}>
      <span className="ccam__dz-ico"><i className="fa-light fa-cloud-arrow-up" /></span>
      <span className="ccam__dz-title">Trascina qui o <u>scegli un file</u></span>
      <span className="ccam__dz-hint">JPG, PNG o WEBP</span>
      {input}
    </button>
  )
}

function GalleryGrid({ images, max, onAdd, onRemove }: { images: string[]; max: number; onAdd: (srcs: string[]) => void; onRemove: (i: number) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="ccam__gallery">
      {images.map((src, i) => (
        <div key={i} className="ccam__gallery-item">
          <img src={src} alt={`Immagine ${i + 1}`} />
          <button type="button" className="ccam__gallery-rm" aria-label="Rimuovi" onClick={() => onRemove(i)}><i className="fa-solid fa-xmark" /></button>
        </div>
      ))}
      {images.length < max && (
        <button type="button" className="ccam__gallery-add" onClick={() => ref.current?.click()}>
          <i className="fa-light fa-plus" /><span>Aggiungi</span>
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" multiple hidden onChange={(e) => { const srcs = files(e); if (srcs.length) onAdd(srcs) }} />
    </div>
  )
}
