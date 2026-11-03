import React, { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import PageHead from '../../../core/components/PageHead'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import { SelectField, InputField, TextareaField, RadioGroup, SearchField } from '../../../core/components/form'
import { toast } from '../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../store/useConfirmStore'
import SpotPlayer, { ElementoView, SlideView, TotemFrame } from '../_shared/SpotPlayer'
import {
  useTotemStore, SFONDI, TRANSIZIONI, durataProgetto, eurT,
  type Elemento, type Progetto, type Slide, type TipoElemento,
} from '../../../store/useTotemStore'
import './EditorPalinsesti.sass'

/**
 * Editor palinsesti — Dispositivi › Totem.
 * Il cliente crea i suoi spot: un progetto è una sequenza di slide verticali con
 * durata e transizione (la timeline in basso), ogni slide ha elementi liberi
 * (testo, prezzo dinamico, icona, immagine, forma) da trascinare e ridimensionare.
 * I progetti salvati si pianificano poi sui totem in "Pianifica trasmissioni".
 */

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))
const FONTS: Elemento['font'][] = ['Poppins', 'Bebas Neue', 'Playfair Display', 'Montserrat']
const COLORI = ['#FFFFFF', '#1E293B', '#204769', '#A2864C', '#E9D7A8', '#FFD166', '#F39A5C', '#48C49A']
const ICONE = ['star', 'spa', 'utensils', 'wine-glass', 'champagne-glasses', 'sailboat', 'umbrella-beach', 'person-swimming', 'bell-concierge', 'bed', 'mug-hot', 'cake-candles', 'gift', 'ticket', 'qrcode', 'map-location-dot', 'sun', 'leaf', 'heart', 'percent']
const MAX_IMG = 1.5 * 1024 * 1024

const NUOVO: Record<TipoElemento, Partial<Elemento>> = {
  testo:    { testo: 'Nuovo testo', x: 10, y: 40, w: 80, h: 10, font: 'Poppins', size: 24, peso: 600, colore: '#FFFFFF', allinea: 'center' },
  prezzo:   { x: 20, y: 60, w: 60, h: 14, prezzoModo: 'dinamico', prezzo: 99, font: 'Bebas Neue', size: 56, colore: '#FFFFFF', allinea: 'center' },
  icona:    { icona: 'star', x: 38, y: 14, w: 24, h: 13, colore: '#FFFFFF', size: 16 },
  immagine: { x: 10, y: 10, w: 80, h: 34, raggio: 12 },
  forma:    { x: 20, y: 78, w: 60, h: 9, sfondo: '#A2864C', raggio: 40 },
}
const TIPO_LBL: Record<TipoElemento, string> = { testo: 'Testo', prezzo: 'Prezzo', icona: 'Icona', immagine: 'Immagine', forma: 'Forma' }
const TIPO_ICO: Record<TipoElemento, string> = { testo: 'font', prezzo: 'tag', icona: 'icons', immagine: 'image', forma: 'shapes' }

/** Controlli di qualità dello spot: leggibilità e tempi di lettura sul totem. */
function controlli(p: Progetto) {
  const out: { ok: boolean; txt: string }[] = []
  const tot = durataProgetto(p)
  out.push(tot <= 30 ? { ok: true, txt: `Durata totale ${tot} s: adatta a chi passa davanti allo schermo` } : { ok: false, txt: `Durata totale ${tot} s: oltre 30 s pochi la guardano fino in fondo` })
  p.slides.forEach((s, i) => {
    const parole = s.elementi.filter(e => e.tipo === 'testo').reduce((n, e) => n + (e.testo ?? '').split(/\s+/).filter(Boolean).length, 0)
    if (parole > s.durata * 3) out.push({ ok: false, txt: `Slide ${i + 1}: ${parole} parole in ${s.durata} s, allunga la durata o accorcia il testo` })
    if (s.elementi.some(e => e.tipo === 'testo' && (e.size ?? 16) < 12)) out.push({ ok: false, txt: `Slide ${i + 1}: testo sotto i 12 pt, illeggibile a distanza` })
    if (s.sfondo === 'bianco' && s.elementi.some(e => (e.tipo === 'testo' || e.tipo === 'prezzo') && (e.colore ?? '').toUpperCase() === '#FFFFFF')) out.push({ ok: false, txt: `Slide ${i + 1}: testo bianco su sfondo bianco` })
  })
  if (p.slides.some(s => s.elementi.some(e => e.tipo === 'prezzo' && e.prezzoModo === 'dinamico'))) out.push({ ok: true, txt: 'Il prezzo dinamico si aggiorna ogni mattina dalla Gestione del pricing' })
  if (out.every(x => x.ok)) out.push({ ok: true, txt: 'Testi leggibili e tempi di lettura corretti' })
  return out
}

export default function EditorPalinsesti({ navigate }: { navigate: (p: string) => void }) {
  const { progetti, salvaProgetto, nuovoProgetto, duplicaProgetto, eliminaProgetto } = useTotemStore()
  const confirm = useConfirmStore(s => s.confirm)

  const [progId, setProgId] = useState(() => progetti[0]?.id ?? '')
  const salvato = progetti.find(p => p.id === progId) ?? null
  const [bozza, setBozza] = useState<Progetto | null>(() => salvato ? clone(salvato) : null)
  const [slideId, setSlideId] = useState(() => salvato?.slides[0]?.id ?? '')
  const [elId, setElId] = useState<string | null>(null)
  const [anteprima, setAnteprima] = useState(false)
  const [cerca, setCerca] = useState('')
  const [nuovo, setNuovo] = useState<{ nome: string; cartella: string } | null>(null)

  const sporco = !!bozza && !!salvato && JSON.stringify({ ...bozza, updatedAt: '' }) !== JSON.stringify({ ...salvato, updatedAt: '' })
  const slide = bozza?.slides.find(s => s.id === slideId) ?? bozza?.slides[0]
  const elemento = slide?.elementi.find(e => e.id === elId) ?? null

  const apri = async (id: string) => {
    if (id === progId) return
    if (sporco && !(await confirm({ title: 'Modifiche non salvate', message: <>Lo spot <strong>{bozza?.nome}</strong> ha modifiche non salvate: le perdi aprendo un altro progetto.</>, confirmLabel: 'Apri senza salvare' }))) return
    const p = progetti.find(x => x.id === id)
    if (!p) return
    setProgId(id); setBozza(clone(p)); setSlideId(p.slides[0]?.id ?? ''); setElId(null)
  }
  useEffect(() => {
    if (!bozza && progetti[0]) { setProgId(progetti[0].id); setBozza(clone(progetti[0])); setSlideId(progetti[0].slides[0]?.id ?? '') }
  }, [bozza, progetti])

  // ── Modifiche alla bozza ──
  const setSlides = (fn: (s: Slide[]) => Slide[]) => setBozza(b => b && ({ ...b, slides: fn(b.slides) }))
  const setSlide = (patch: Partial<Slide>) => slide && setSlides(ss => ss.map(s => s.id === slide.id ? { ...s, ...patch } : s))
  const setEl = (id: string, patch: Partial<Elemento>) => slide && setSlides(ss => ss.map(s => s.id === slide.id ? { ...s, elementi: s.elementi.map(e => e.id === id ? { ...e, ...patch } : e) } : s))
  const aggiungiEl = (tipo: TipoElemento, extra: Partial<Elemento> = {}) => {
    if (!slide) return
    const e = { id: uid('el'), tipo, ...NUOVO[tipo], ...extra } as Elemento
    setSlides(ss => ss.map(s => s.id === slide.id ? { ...s, elementi: [...s.elementi, e] } : s))
    setElId(e.id)
  }
  const togliEl = (id: string) => slide && (setSlides(ss => ss.map(s => s.id === slide.id ? { ...s, elementi: s.elementi.filter(e => e.id !== id) } : s)), setElId(null))
  const livello = (id: string, dir: 1 | -1) => slide && setSlides(ss => ss.map(s => {
    if (s.id !== slide.id) return s
    const i = s.elementi.findIndex(e => e.id === id), j = i + dir
    if (j < 0 || j >= s.elementi.length) return s
    const el = [...s.elementi]; [el[i], el[j]] = [el[j], el[i]]
    return { ...s, elementi: el }
  }))

  const fileRef = useRef<HTMLInputElement>(null)
  const caricaImmagine = (f: File | undefined) => {
    if (!f) return
    if (f.size > MAX_IMG) { toast.warning('Immagine troppo pesante: massimo 1,5 MB.', 'Editor palinsesti'); return }
    const r = new FileReader()
    r.onload = () => elemento?.tipo === 'immagine' ? setEl(elemento.id, { src: String(r.result) }) : aggiungiEl('immagine', { src: String(r.result) })
    r.readAsDataURL(f)
  }

  // ── Slide (timeline) ──
  const nuovaSlide = () => {
    const s: Slide = { id: uid('s'), durata: 5, sfondo: slide?.sfondo ?? 'oceano', transizione: 'dissolvenza', elementi: [] }
    setSlides(ss => { const i = ss.findIndex(x => x.id === slideId); const out = [...ss]; out.splice(i + 1, 0, s); return out })
    setSlideId(s.id); setElId(null)
  }
  const duplicaSlide = (id: string) => {
    const src = bozza?.slides.find(s => s.id === id)
    if (!src) return
    const s = { ...clone(src), id: uid('s'), elementi: src.elementi.map(e => ({ ...e, id: uid('el') })) }
    setSlides(ss => { const i = ss.findIndex(x => x.id === id); const out = [...ss]; out.splice(i + 1, 0, s); return out })
    setSlideId(s.id)
  }
  const eliminaSlide = async (id: string) => {
    if (!bozza || bozza.slides.length < 2) { toast.warning('Lo spot deve avere almeno una slide.', 'Editor palinsesti'); return }
    const n = bozza.slides.findIndex(s => s.id === id) + 1
    if (!(await confirm({ title: 'Elimina slide', message: <>Vuoi eliminare la <strong>slide {n}</strong> dallo spot?</>, confirmLabel: 'Elimina', danger: true }))) return
    setSlides(ss => ss.filter(s => s.id !== id))
    if (slideId === id) setSlideId(bozza.slides.find(s => s.id !== id)!.id)
  }
  const dragSlide = useRef<string | null>(null)
  const spostaSlide = (da: string, su: string) => setSlides(ss => {
    const out = [...ss]; const i = out.findIndex(s => s.id === da); const [m] = out.splice(i, 1)
    out.splice(out.findIndex(s => s.id === su), 0, m); return out
  })

  // ── Trascinamento e ridimensionamento sulla tela ──
  const stageRef = useRef<HTMLDivElement>(null)
  const startDrag = (ev: React.PointerEvent, e: Elemento, mode: 'move' | 'resize') => {
    ev.stopPropagation(); ev.preventDefault()
    setElId(e.id)
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect) return
    const sx = ev.clientX, sy = ev.clientY, o = { x: e.x, y: e.y, w: e.w, h: e.h }
    const move = (m: PointerEvent) => {
      const dx = ((m.clientX - sx) / rect.width) * 100, dy = ((m.clientY - sy) / rect.height) * 100
      const r = (v: number) => Math.round(v * 2) / 2
      if (mode === 'move') setEl(e.id, { x: r(Math.min(100 - o.w, Math.max(0, o.x + dx))), y: r(Math.min(100 - o.h, Math.max(0, o.y + dy))) })
      else setEl(e.id, { w: r(Math.max(6, Math.min(100 - o.x, o.w + dx))), h: r(Math.max(3, Math.min(100 - o.y, o.h + dy))) })
    }
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }
  useEffect(() => {
    const key = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement
      if (!elemento || /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return
      if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); togliEl(elemento.id) }
      const step = ev.shiftKey ? 5 : 1
      if (ev.key === 'ArrowLeft') setEl(elemento.id, { x: Math.max(0, elemento.x - step) })
      if (ev.key === 'ArrowRight') setEl(elemento.id, { x: Math.min(100 - elemento.w, elemento.x + step) })
      if (ev.key === 'ArrowUp') setEl(elemento.id, { y: Math.max(0, elemento.y - step) })
      if (ev.key === 'ArrowDown') setEl(elemento.id, { y: Math.min(100 - elemento.h, elemento.y + step) })
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })

  // ── Progetti ──
  const salva = () => { if (!bozza) return; salvaProgetto(bozza); toast.success(`Spot «${bozza.nome}» salvato: puoi pianificarlo sui totem.`, 'Editor palinsesti') }
  const creaProgetto = () => {
    if (!nuovo?.nome.trim()) return
    const p = nuovoProgetto(nuovo.nome.trim(), nuovo.cartella.trim() || 'Palinsesti')
    setProgId(p.id); setBozza(clone(p)); setSlideId(p.slides[0].id); setElId(null); setNuovo(null)
  }
  const elimina = async (p: Progetto) => {
    const tr = useTotemStore.getState().trasmissioni.filter(t => t.progettoId === p.id).length
    if (!(await confirm({ title: 'Elimina spot', message: <>Vuoi eliminare <strong>{p.nome}</strong>?{tr > 0 && <> Verranno tolte anche le sue <strong>{tr} trasmissioni</strong> pianificate.</>}</>, confirmLabel: 'Elimina', danger: true }))) return
    eliminaProgetto(p.id)
    if (p.id === progId) setBozza(null)
  }

  const cartelle = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    const m = new Map<string, Progetto[]>()
    progetti.filter(p => !q || p.nome.toLowerCase().includes(q)).forEach(p => m.set(p.cartella, [...(m.get(p.cartella) ?? []), p]))
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [progetti, cerca])

  const totale = bozza ? durataProgetto(bozza) : 0
  let cursore = 0

  return (
    <div className="edp">
      <PageHead
        title="Editor palinsesti"
        subtitle="Crea i tuoi spot: slide verticali con testi, prezzi dinamici e immagini, in sequenza sulla timeline"
        actions={
          <div className="edp__head-acts">
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setAnteprima(true)} disabled={!bozza}><i className="fa-solid fa-play" aria-hidden="true" /> Anteprima sul totem</button>
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => { if (sporco) salva(); navigate('gest-advertising') }} disabled={!bozza}><i className="fa-solid fa-calendar-plus" aria-hidden="true" /> Pianifica</button>
            <button type="button" className="sib-btn sib-btn--primary" onClick={salva} disabled={!sporco}><i className="fa-solid fa-floppy-disk" aria-hidden="true" /> {sporco ? 'Salva' : 'Salvato'}</button>
          </div>
        }
      />

      <div className="edp__layout">
        {/* ── Progetti ── */}
        <aside className="edp__panel edp__projects">
          <header className="edp__panel-head">
            <span className="edp__panel-title">I tuoi spot</span>
            <Tooltip text="Nuovo spot"><button type="button" className="edp__icon" aria-label="Nuovo spot" onClick={() => setNuovo({ nome: '', cartella: bozza?.cartella ?? 'Palinsesti' })}><i className="fa-solid fa-plus" aria-hidden="true" /></button></Tooltip>
          </header>
          <div className="edp__search"><SearchField name="cerca-spot" placeholder="Cerca spot…" value={cerca} onChange={e => setCerca(e.target.value)} onClear={() => setCerca('')} /></div>
          <div className="edp__tree">
            {cartelle.map(([c, ps]) => (
              <div key={c} className="edp__folder">
                <span className="edp__folder-name"><i className="fa-solid fa-folder-open" aria-hidden="true" />{c}</span>
                {ps.map(p => (
                  <div key={p.id} className={clsx('edp__proj', p.id === progId && 'edp__proj--on')} role="button" tabIndex={0}
                    onClick={() => apri(p.id)} onKeyDown={e => e.key === 'Enter' && apri(p.id)}>
                    <span className="edp__proj-thumb">{p.slides[0] && <SlideView slide={p.slides[0]} />}</span>
                    <span className="edp__proj-txt">
                      <TruncatedText text={p.nome} className="edp__proj-name" />
                      <span className="edp__proj-meta">{p.slides.length} slide · {durataProgetto(p)} s{p.id === progId && sporco ? ' · da salvare' : ''}</span>
                    </span>
                    <span className="edp__proj-acts" onClick={e => e.stopPropagation()}>
                      <Tooltip text="Duplica"><button type="button" className="edp__icon edp__icon--sm" aria-label="Duplica" onClick={() => duplicaProgetto(p.id)}><i className="fa-solid fa-clone" aria-hidden="true" /></button></Tooltip>
                      <Tooltip text="Elimina"><button type="button" className="edp__icon edp__icon--sm" aria-label="Elimina" onClick={() => elimina(p)}><i className="fa-solid fa-trash-can" aria-hidden="true" /></button></Tooltip>
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </aside>

        {/* ── Tela ── */}
        <section className="edp__canvas-col">
          {bozza && slide ? (
            <>
              <div className="edp__toolbar">
                <InputField name="nome-spot" ariaLabel="Nome dello spot" value={bozza.nome} onChange={e => setBozza({ ...bozza, nome: e.target.value })} className="edp__name" />
                <span className="edp__sep" />
                {(['testo', 'prezzo', 'icona', 'forma'] as TipoElemento[]).map(tp => (
                  <Tooltip key={tp} text={`Aggiungi ${TIPO_LBL[tp].toLowerCase()}`}>
                    <button type="button" className="edp__tool" onClick={() => aggiungiEl(tp)}><i className={`fa-solid fa-${TIPO_ICO[tp]}`} aria-hidden="true" /><span>{TIPO_LBL[tp]}</span></button>
                  </Tooltip>
                ))}
                <Tooltip text="Carica un'immagine (max 1,5 MB)">
                  <button type="button" className="edp__tool" onClick={() => fileRef.current?.click()}><i className="fa-solid fa-image" aria-hidden="true" /><span>Immagine</span></button>
                </Tooltip>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { caricaImmagine(e.target.files?.[0]); e.target.value = '' }} />
              </div>

              <div className="edp__stage-wrap" onPointerDown={() => setElId(null)}>
                <div className="edp__stage" ref={stageRef}>
                  <SlideView slide={{ ...slide, elementi: [] }}>
                    {slide.elementi.map(e => (
                      <div key={e.id} className={clsx('edp__el', e.id === elId && 'edp__el--sel')} onPointerDown={ev => startDrag(ev, e, 'move')}>
                        <ElementoView e={e} />
                        {e.id === elId && (
                          <>
                            <span className="edp__frame" style={{ '--x': `${e.x}%`, '--y': `${e.y}%`, '--w': `${e.w}%`, '--h': `${e.h}%` } as React.CSSProperties} />
                            <span className="edp__handle" style={{ '--x': `${e.x + e.w}%`, '--y': `${e.y + e.h}%` } as React.CSSProperties}
                              onPointerDown={ev => startDrag(ev, e, 'resize')} />
                          </>
                        )}
                      </div>
                    ))}
                  </SlideView>
                </div>
                <span className="edp__stage-hint">Trascina per spostare, l'angolo per ridimensionare · frecce per rifinire · Canc per eliminare</span>
              </div>
            </>
          ) : <div className="edp__empty">Crea il tuo primo spot con il pulsante +</div>}
        </section>

        {/* ── Proprietà ── */}
        <aside className="edp__panel edp__props">
          {bozza && slide && (elemento ? (
            <div className="edp__props-body">
              <header className="edp__panel-head">
                <span className="edp__panel-title"><i className={`fa-solid fa-${TIPO_ICO[elemento.tipo]}`} aria-hidden="true" /> {TIPO_LBL[elemento.tipo]}</span>
                <span className="edp__props-acts">
                  <Tooltip text="Porta avanti"><button type="button" className="edp__icon edp__icon--sm" aria-label="Porta avanti" onClick={() => livello(elemento.id, 1)}><i className="fa-solid fa-arrow-up" aria-hidden="true" /></button></Tooltip>
                  <Tooltip text="Porta indietro"><button type="button" className="edp__icon edp__icon--sm" aria-label="Porta indietro" onClick={() => livello(elemento.id, -1)}><i className="fa-solid fa-arrow-down" aria-hidden="true" /></button></Tooltip>
                  <Tooltip text="Elimina elemento"><button type="button" className="edp__icon edp__icon--sm" aria-label="Elimina elemento" onClick={() => togliEl(elemento.id)}><i className="fa-solid fa-trash-can" aria-hidden="true" /></button></Tooltip>
                </span>
              </header>

              {elemento.tipo === 'testo' && <TextareaField name="el-testo" label="Testo" rows={3} value={elemento.testo ?? ''} onChange={e => setEl(elemento.id, { testo: e.target.value })} />}

              {elemento.tipo === 'prezzo' && (
                <div className="edp__box">
                  <span className="edp__box-title"><i className="fa-solid fa-tag" aria-hidden="true" /> Prezzo dinamico</span>
                  <RadioGroup name="el-prezzo-modo" value={elemento.prezzoModo} onChange={v => setEl(elemento.id, { prezzoModo: v as Elemento['prezzoModo'] })}
                    options={[{ value: 'dinamico', label: 'Dinamico' }, { value: 'manuale', label: 'Manuale' }]} />
                  <InputField name="el-prezzo" type="number" label={elemento.prezzoModo === 'dinamico' ? 'Prezzo di partenza' : 'Prezzo'} min={0} iconLeft="fa-solid fa-euro-sign" value={elemento.prezzo ?? 0}
                    onChange={e => setEl(elemento.id, { prezzo: Number(e.target.value) || 0 })} />
                  {elemento.prezzoModo === 'dinamico' && <p className="edp__hint">Ogni mattina lo spot mostra la tariffa del giorno presa dalla Gestione del pricing (oggi {eurT(elemento.prezzo ?? 0)}).</p>}
                </div>
              )}

              {elemento.tipo === 'icona' && (
                <div className="edp__icons">
                  {ICONE.map(ic => (
                    <button key={ic} type="button" aria-label={ic} className={clsx('edp__ic', elemento.icona === ic && 'edp__ic--on')} onClick={() => setEl(elemento.id, { icona: ic })}>
                      <i className={`fa-solid fa-${ic}`} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}

              {elemento.tipo === 'immagine' && (
                <button type="button" className="sib-btn sib-btn--secondary" onClick={() => fileRef.current?.click()}><i className="fa-solid fa-upload" aria-hidden="true" /> {elemento.src ? 'Sostituisci immagine' : 'Carica immagine'}</button>
              )}

              {(elemento.tipo === 'testo' || elemento.tipo === 'prezzo') && (
                <>
                  <div className="edp__row2">
                    <SelectField name="el-font" label="Carattere" value={elemento.font} onChange={e => setEl(elemento.id, { font: e.target.value as Elemento['font'] })} options={FONTS.map(f => ({ value: f!, label: f! }))} />
                    <SelectField name="el-peso" label="Peso" value={elemento.peso ?? 400} onChange={e => setEl(elemento.id, { peso: Number(e.target.value) as Elemento['peso'] })}
                      options={[{ value: 400, label: 'Regular' }, { value: 600, label: 'Semibold' }, { value: 800, label: 'Bold' }]} />
                  </div>
                  <div className="edp__row2">
                    <InputField name="el-size" type="number" label="Dimensione (pt)" min={8} max={140} value={elemento.size ?? 16} onChange={e => setEl(elemento.id, { size: Number(e.target.value) || 16 })} />
                    <div className="edp__field">
                      <span className="edp__lbl">Allineamento</span>
                      <span className="edp__seg">
                        {(['left', 'center', 'right'] as const).map(a => (
                          <button key={a} type="button" aria-label={a} className={clsx('edp__seg-btn', elemento.allinea === a && 'edp__seg-btn--on')} onClick={() => setEl(elemento.id, { allinea: a })}>
                            <i className={`fa-solid fa-align-${a}`} aria-hidden="true" />
                          </button>
                        ))}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {elemento.tipo !== 'immagine' && (
                <div className="edp__field">
                  <span className="edp__lbl">{elemento.tipo === 'forma' ? 'Colore di riempimento' : 'Colore'}</span>
                  <span className="edp__swatches">
                    {COLORI.map(c => {
                      const on = (elemento.tipo === 'forma' ? elemento.sfondo : elemento.colore)?.toUpperCase() === c
                      return <button key={c} type="button" aria-label={c} className={clsx('edp__swatch', on && 'edp__swatch--on')} style={{ '--sw': c } as React.CSSProperties}
                        onClick={() => setEl(elemento.id, elemento.tipo === 'forma' ? { sfondo: c } : { colore: c })} />
                    })}
                  </span>
                </div>
              )}
              {(elemento.tipo === 'forma' || elemento.tipo === 'immagine') && (
                <InputField name="el-raggio" type="number" label="Arrotondamento (px)" min={0} max={80} value={elemento.raggio ?? 0} onChange={e => setEl(elemento.id, { raggio: Number(e.target.value) || 0 })} />
              )}
              <p className="edp__hint">Posizione {elemento.x}% · {elemento.y}% — dimensione {elemento.w}% × {elemento.h}%</p>
            </div>
          ) : (
            <div className="edp__props-body">
              <header className="edp__panel-head"><span className="edp__panel-title">Slide {bozza.slides.findIndex(s => s.id === slide.id) + 1}</span></header>
              <div className="edp__field">
                <span className="edp__lbl">Sfondo</span>
                <span className="edp__bgs">
                  {SFONDI.map(b => (
                    <Tooltip key={b.id} text={b.label}>
                      <button type="button" aria-label={b.label} className={clsx('edp__bg', `spot--${b.id}`, slide.sfondo === b.id && 'edp__bg--on')} onClick={() => setSlide({ sfondo: b.id })} />
                    </Tooltip>
                  ))}
                </span>
              </div>
              <div className="edp__row2">
                <InputField name="sl-durata" type="number" label="Durata (s)" min={2} max={30} value={slide.durata} onChange={e => setSlide({ durata: Math.max(2, Math.min(30, Number(e.target.value) || 2)) })} />
                <SelectField name="sl-trans" label="Transizione" value={slide.transizione} onChange={e => setSlide({ transizione: e.target.value as Slide['transizione'] })} options={TRANSIZIONI.map(x => ({ value: x.id, label: x.label }))} />
              </div>
              <div className="edp__box">
                <span className="edp__box-title"><i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Controllo di Sibylla</span>
                <ul className="edp__checks">
                  {controlli(bozza).map((c, i) => <li key={i} className={c.ok ? 'edp__check--ok' : 'edp__check--ko'}><i className={`fa-solid ${c.ok ? 'fa-circle-check' : 'fa-triangle-exclamation'}`} aria-hidden="true" />{c.txt}</li>)}
                </ul>
              </div>
              <p className="edp__hint">Clicca un elemento sulla slide per modificarlo.</p>
            </div>
          ))}
        </aside>
      </div>

      {/* ── Timeline ── */}
      {bozza && (
        <section className="edp__timeline">
          <header className="edp__tl-head">
            <span className="edp__panel-title">Timeline</span>
            <span className="edp__tl-tot">{bozza.slides.length} slide · <strong>{totale} s</strong></span>
            <button type="button" className="sib-btn sib-btn--secondary edp__tl-add" onClick={nuovaSlide}><i className="fa-solid fa-plus" aria-hidden="true" /> Aggiungi slide</button>
          </header>
          <div className="edp__ruler">
            {Array.from({ length: Math.ceil(totale / 5) + 1 }, (_, i) => <span key={i} className="edp__tick" style={{ '--pos': `${Math.min(100, (i * 5 / Math.max(1, totale)) * 100)}%` } as React.CSSProperties}>{i * 5}s</span>)}
          </div>
          <div className="edp__track">
            {bozza.slides.map((s, i) => {
              const da = cursore; cursore += s.durata
              return (
                <div key={s.id} draggable
                  onDragStart={() => { dragSlide.current = s.id }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => { if (dragSlide.current && dragSlide.current !== s.id) spostaSlide(dragSlide.current, s.id); dragSlide.current = null }}
                  className={clsx('edp__clip', s.id === slide?.id && 'edp__clip--on')}
                  style={{ '--grow': s.durata } as React.CSSProperties}
                  onClick={() => { setSlideId(s.id); setElId(null) }}>
                  <span className="edp__clip-thumb"><SlideView slide={s} /></span>
                  <span className="edp__clip-txt">
                    <strong>Slide {i + 1}</strong>
                    <span>{da}–{cursore} s · {TRANSIZIONI.find(x => x.id === s.transizione)?.label}</span>
                  </span>
                  <span className="edp__clip-acts" onClick={e => e.stopPropagation()}>
                    <Tooltip text="Duplica slide"><button type="button" className="edp__icon edp__icon--sm" aria-label="Duplica slide" onClick={() => duplicaSlide(s.id)}><i className="fa-solid fa-clone" aria-hidden="true" /></button></Tooltip>
                    <Tooltip text="Elimina slide"><button type="button" className="edp__icon edp__icon--sm" aria-label="Elimina slide" onClick={() => eliminaSlide(s.id)}><i className="fa-solid fa-trash-can" aria-hidden="true" /></button></Tooltip>
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <Modal open={anteprima} onClose={() => setAnteprima(false)} title={`Anteprima · ${bozza?.nome ?? ''}`} size="md">
        <div className="edp__preview">
          <TotemFrame caption={`${bozza?.slides.length ?? 0} slide · ${totale} secondi, poi riparte`}><SpotPlayer progetto={bozza} /></TotemFrame>
        </div>
      </Modal>

      <Modal open={!!nuovo} onClose={() => setNuovo(null)} title="Nuovo spot" size="sm">
        {nuovo && (
          <div className="edp__new">
            <InputField name="np-nome" label="Nome dello spot" required value={nuovo.nome} onChange={e => setNuovo({ ...nuovo, nome: e.target.value })} placeholder="Es. Brunch della domenica" />
            <InputField name="np-cartella" label="Cartella" value={nuovo.cartella} onChange={e => setNuovo({ ...nuovo, cartella: e.target.value })} hint="Raggruppa gli spot per stagione o campagna" />
            <div className="edp__new-acts">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setNuovo(null)}>Annulla</button>
              <button type="button" className="sib-btn sib-btn--primary" disabled={!nuovo.nome.trim()} onClick={creaProgetto}>Crea spot</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
