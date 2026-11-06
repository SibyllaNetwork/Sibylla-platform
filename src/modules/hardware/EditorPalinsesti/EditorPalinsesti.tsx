import React, { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import PageHead from '../../../core/components/PageHead'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import { SelectField, SearchField } from '../../../core/components/form'
import { toast } from '../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../store/useConfirmStore'
import SpotPlayer, { ElementoView, SlideView, TotemFrame, posizioneTempo, durIngressoDi } from '../_shared/SpotPlayer'
import {
  useTotemStore, TRANSIZIONI, TRACCE_AUDIO, durataProgetto, etichettaTotem,
  type Elemento, type Progetto, type Slide, type TipoElemento, type FormaTipo, type WidgetTipo,
} from '../../../store/useTotemStore'
import {
  uid, clone, r05, NUOVO, TIPO_ICO, TIPO_LBL, PRESET_TESTO, FORME, WIDGETS, CATEGORIE_ICONE, TUTTE_ICONE, MAX_IMG,
  hQuadrata, controlli, punteggio, type Controllo,
} from './editorModel'
import PannelloProprieta, { type TabSlide } from './PannelloProprieta'
import TimelineSpot, { fmtTempo } from './TimelineSpot'
import ModaleNuovoSpot from './ModaleNuovoSpot'
import './EditorPalinsesti.sass'

/**
 * Editor palinsesti — Dispositivi › Totem.
 * Il cliente crea i suoi spot: un progetto è una sequenza di slide (9:16 o 16:9) con
 * durata e transizione; ogni slide ha elementi liberi (testi, prezzi dal listino,
 * icone, immagini, forme, QR, widget ora/data/meteo/countdown) con stile, tempi
 * d'ingresso/uscita, animazioni e azioni al tocco. La timeline mostra lo spot intero
 * e le tracce degli elementi della slide aperta; la testina riproduce lo spot dentro
 * l'editor. Annulla/ripeti, livelli, aggancio alle guide, modelli, versioni salvate,
 * storyboard in PDF e il Controllo di Sibylla (leggibilità, contrasto, area sicura).
 */

type TabSx = 'spot' | 'aggiungi' | 'livelli'
type Maniglia = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'rot'
const ZOOM = [0.75, 1, 1.25, 1.5]
const SOGLIA_AGGANCIO = 1.2
let appunti: Elemento | null = null

const SCORCIATOIE: [string, string][] = [
  ['Spazio', 'Riproduci / metti in pausa'], ['Ctrl + Z', 'Annulla'], ['Ctrl + Maiusc + Z', 'Ripeti'], ['Ctrl + S', 'Salva'],
  ['Ctrl + D', 'Duplica l\'elemento'], ['Ctrl + C / V', 'Copia e incolla (anche su un\'altra slide)'], ['Canc', 'Elimina l\'elemento'],
  ['Frecce', 'Sposta di 1% (con Maiusc 5%)'], ['[ / ]', 'Porta indietro / avanti'], ['Esc', 'Deseleziona'],
  ['Maiusc mentre ridimensioni', 'Mantieni le proporzioni'], ['Alt mentre trascini', 'Senza aggancio alle guide'],
]

/** Istante della slide in cui tutti gli elementi sono già entrati: è il fotogramma da modificare. */
const tempoChiave = (s: Slide) => Math.min(s.durata - 0.05, Math.max(0, ...s.elementi.filter(e => !e.nascosto).map(e => (e.inizio ?? 0) + (e.ingresso && e.ingresso !== 'nessuna' ? durIngressoDi(e) : 0))))
const inizioDi = (p: Progetto, id: string) => { let a = 0; for (const s of p.slides) { if (s.id === id) return a; a += s.durata } return 0 }

/**
 * `progettoIniziale`: spot da aprire (o 'nuovo' per partire dalla scelta del modello);
 * `ritorno = 'acquista'`: aperto da Acquista spazi, il pulsante di uscita torna alla campagna.
 */
export default function EditorPalinsesti({ navigate, progettoIniziale, ritorno }: { navigate: (p: string) => void; progettoIniziale?: string; ritorno?: string }) {
  const { progetti, totem, salvaProgetto, nuovoProgetto, duplicaProgetto, eliminaProgetto, ripristinaVersione } = useTotemStore()
  const confirm = useConfirmStore(s => s.confirm)

  const [progId, setProgId] = useState(() => progetti.find(p => p.id === progettoIniziale)?.id ?? progetti[0]?.id ?? '')
  const salvato = progetti.find(p => p.id === progId) ?? null
  const [bozza, setBozzaRaw] = useState<Progetto | null>(() => salvato ? clone(salvato) : null)
  const [slideId, setSlideId] = useState(() => salvato?.slides[0]?.id ?? '')
  const [elId, setElId] = useState<string | null>(null)
  const [tabSx, setTabSx] = useState<TabSx>('spot')
  const [tabSlide, setTabSlide] = useState<TabSlide>('slide')
  const [cerca, setCerca] = useState('')
  const [cercaIco, setCercaIco] = useState('')
  const [modale, setModale] = useState<null | 'nuovo' | 'anteprima' | 'versioni' | 'scorciatoie'>(() => progettoIniziale === 'nuovo' ? 'nuovo' : null)
  const [totemAnteprima, setTotemAnteprima] = useState(() => totem[0]?.id ?? '')
  const [zoom, setZoom] = useState(1)
  const [griglia, setGriglia] = useState(false)
  const [areaSicura, setAreaSicura] = useState(true)
  const [aggancio, setAggancio] = useState(true)
  const [guide, setGuide] = useState<{ v: number[]; h: number[] } | null>(null)
  const [tempo, setTempo] = useState(() => salvato?.slides[0] ? tempoChiave(salvato.slides[0]) : 0)
  const [playing, setPlaying] = useState(false)
  const [scrub, setScrub] = useState(false)
  const [pdf, setPdf] = useState(false)
  const [menuAll, setMenuAll] = useState(false)

  // ── Bozza con annulla/ripeti ──
  const bozzaRef = useRef(bozza)
  bozzaRef.current = bozza
  const [storia, setStoria] = useState<{ passato: Progetto[]; futuro: Progetto[] }>({ passato: [], futuro: [] })
  const ultimo = useRef<{ k?: string; t: number }>({ t: 0 })
  const modifica = (fn: (p: Progetto) => Progetto, k?: string) => {
    const b = bozzaRef.current
    if (!b) return
    const n = fn(b)
    const now = Date.now()
    const unisci = !!k && ultimo.current.k === k && now - ultimo.current.t < 900
    ultimo.current = { k, t: now }
    if (!unisci) setStoria(s => ({ passato: [...s.passato.slice(-79), b], futuro: [] }))
    bozzaRef.current = n
    setBozzaRaw(n)
  }
  const carica = (p: Progetto | null) => {
    setBozzaRaw(p ? clone(p) : null); setStoria({ passato: [], futuro: [] }); ultimo.current = { t: 0 }
    setSlideId(p?.slides[0]?.id ?? ''); setElId(null); setPlaying(false)
    setTempo(p?.slides[0] ? tempoChiave(p.slides[0]) : 0)
  }
  const annulla = () => {
    const prev = storia.passato[storia.passato.length - 1], cur = bozzaRef.current
    if (!prev || !cur) return
    bozzaRef.current = prev; setBozzaRaw(prev); ultimo.current = { t: 0 }
    setStoria({ passato: storia.passato.slice(0, -1), futuro: [cur, ...storia.futuro] })
    if (!prev.slides.some(x => x.id === slideId)) setSlideId(prev.slides[0]?.id ?? '')
  }
  const ripeti = () => {
    const next = storia.futuro[0], cur = bozzaRef.current
    if (!next || !cur) return
    bozzaRef.current = next; setBozzaRaw(next); ultimo.current = { t: 0 }
    setStoria({ passato: [...storia.passato, cur], futuro: storia.futuro.slice(1) })
    if (!next.slides.some(x => x.id === slideId)) setSlideId(next.slides[0]?.id ?? '')
  }

  const sporco = !!bozza && !!salvato && JSON.stringify({ ...bozza, updatedAt: '', versioni: [] }) !== JSON.stringify({ ...salvato, updatedAt: '', versioni: [] })
  const slide = bozza?.slides.find(s => s.id === slideId) ?? bozza?.slides[0]
  const elemento = slide?.elementi.find(e => e.id === elId) ?? null
  const formato = bozza?.formato ?? 'verticale'
  const tot = bozza ? durataProgetto(bozza) : 0
  const inizioSlide = bozza && slide ? inizioDi(bozza, slide.id) : 0
  const locale = Math.max(0, Math.min(slide?.durata ?? 0, tempo - inizioSlide))
  const inRegia = playing || scrub

  useEffect(() => { if (!bozza && progetti[0]) { setProgId(progetti[0].id); carica(progetti[0]) } })  // eslint-disable-line react-hooks/exhaustive-deps

  const apri = async (id: string) => {
    if (id === progId) return
    if (sporco && !(await confirm({ title: 'Modifiche non salvate', message: <>Lo spot <strong>{bozza?.nome}</strong> ha modifiche non salvate: le perdi aprendo un altro progetto.</>, confirmLabel: 'Apri senza salvare' }))) return
    const p = progetti.find(x => x.id === id)
    if (!p) return
    setProgId(id); carica(p)
  }

  // ── Riproduzione nell'editor ──
  useEffect(() => {
    if (!playing || !tot) return
    let raf = 0, last = performance.now()
    const tick = (now: number) => { const dt = (now - last) / 1000; last = now; setTempo(t => (t + dt) % tot); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, tot])
  useEffect(() => {
    if (!inRegia || !bozza) return
    const id = bozza.slides[posizioneTempo(bozza.slides, tempo).i]?.id
    if (id && id !== slideId) setSlideId(id)
  }, [tempo, inRegia, bozza, slideId])
  /** Seleziona un elemento portando la testina a un istante in cui è in scena. */
  const selEl = (id: string) => {
    setPlaying(false); setElId(id)
    const e = slide?.elementi.find(x => x.id === id)
    if (!e || !slide) return
    const ini = e.inizio ?? 0, fin = Math.min(e.fine ?? slide.durata, slide.durata)
    const dIn = e.ingresso && e.ingresso !== 'nessuna' ? durIngressoDi(e) : 0
    if (locale < ini + dIn || locale >= fin) setTempo(inizioSlide + Math.max(ini, Math.min(fin - 0.05, ini + dIn)))
  }
  const play = () => { if (!playing) setElId(null); setPlaying(p => !p) }
  const vaiSlide = (id: string, sel: string | null = null) => {
    if (!bozza) return
    const s = bozza.slides.find(x => x.id === id)
    setPlaying(false); setSlideId(id); setElId(sel)
    if (s) setTempo(inizioDi(bozza, id) + tempoChiave(s))
  }

  // ── Modifiche ──
  const setSlides = (fn: (s: Slide[]) => Slide[], k?: string) => modifica(b => ({ ...b, slides: fn(b.slides) }), k)
  const setSlide = (patch: Partial<Slide>, k?: string) => slide && setSlides(ss => ss.map(s => s.id === slide.id ? { ...s, ...patch } : s), k)
  const setEl = (id: string, patch: Partial<Elemento>, k?: string) => slide && setSlides(ss => ss.map(s => s.id === slide.id ? { ...s, elementi: s.elementi.map(e => e.id === id ? { ...e, ...patch } : e) } : s), k ? `${id}:${k}` : undefined)
  const setProgetto = (patch: Partial<Progetto>, k?: string) => modifica(b => ({ ...b, ...patch }), k)

  const aggiungiEl = (tipo: TipoElemento, extra: Partial<Elemento> = {}) => {
    if (!slide) return
    const base = { ...NUOVO[tipo], ...extra }
    const w = base.w ?? 40
    const h = tipo === 'qr' || (tipo === 'forma' && base.forma === 'cerchio') ? hQuadrata(w, formato) : base.h ?? 10
    let x = base.x ?? (100 - w) / 2, y = base.y ?? 40
    const occupato = (px: number, py: number) => slide.elementi.some(o => Math.abs(o.x - px) < 0.5 && Math.abs(o.y - py) < 0.5)
    for (let k = 0; k < 8 && occupato(x, y); k++) { x = Math.min(100 - w, x + 3); y = Math.min(100 - h, y + 3) }
    const nomi = slide.elementi.filter(o => o.tipo === tipo).length
    const e = { id: uid('el'), tipo, nome: `${TIPO_LBL[tipo]}${nomi ? ` ${nomi + 1}` : ''}`, ...base, w, h, x, y } as Elemento
    setSlides(ss => ss.map(s => s.id === slide.id ? { ...s, elementi: [...s.elementi, e] } : s))
    setElId(e.id); setPlaying(false)
    setTempo(inizioSlide + Math.max(locale, (e.inizio ?? 0) + 0.7))
  }
  const togliEl = (id: string) => { if (slide) { setSlides(ss => ss.map(s => s.id === slide.id ? { ...s, elementi: s.elementi.filter(e => e.id !== id) } : s)); setElId(null) } }
  const duplicaEl = (src: Elemento | null = elemento) => {
    if (!slide || !src) return
    const e = { ...clone(src), id: uid('el'), nome: `${src.nome ?? TIPO_LBL[src.tipo]} (copia)`, x: Math.min(100 - src.w, src.x + 3), y: Math.min(100 - src.h, src.y + 3), bloccato: false }
    setSlides(ss => ss.map(s => s.id === slide.id ? { ...s, elementi: [...s.elementi, e] } : s))
    setElId(e.id)
  }
  const livello = (id: string, dir: 1 | -1) => slide && setSlides(ss => ss.map(s => {
    if (s.id !== slide.id) return s
    const i = s.elementi.findIndex(e => e.id === id), j = i + dir
    if (j < 0 || j >= s.elementi.length) return s
    const el = [...s.elementi]; [el[i], el[j]] = [el[j], el[i]]
    return { ...s, elementi: el }
  }))
  const spostaEl = (da: string, su: string) => slide && setSlides(ss => ss.map(s => {
    if (s.id !== slide.id) return s
    const el = [...s.elementi]; const i = el.findIndex(e => e.id === da); const [m] = el.splice(i, 1)
    el.splice(el.findIndex(e => e.id === su) + (i > el.findIndex(e => e.id === su) ? 1 : 0), 0, m)
    return { ...s, elementi: el }
  }))
  const allinea = (dove: 'l' | 'c' | 'r' | 't' | 'm' | 'b') => {
    if (!elemento || elemento.bloccato) return
    const e = elemento
    const patch: Partial<Elemento> = dove === 'l' ? { x: 0 } : dove === 'c' ? { x: r05((100 - e.w) / 2) } : dove === 'r' ? { x: r05(100 - e.w) }
      : dove === 't' ? { y: 0 } : dove === 'm' ? { y: r05((100 - e.h) / 2) } : { y: r05(100 - e.h) }
    setEl(e.id, patch)
  }

  // ── Immagini ──
  const fileRef = useRef<HTMLInputElement>(null)
  const fileDove = useRef<'el' | 'bg' | 'nuova'>('nuova')
  const scegliFile = (dove: 'el' | 'bg' | 'nuova') => { fileDove.current = dove; fileRef.current?.click() }
  const caricaImmagine = (f: File | undefined) => {
    if (!f) return
    if (f.size > MAX_IMG) { toast.warning('Immagine troppo pesante: massimo 1,5 MB.', 'Editor palinsesti'); return }
    const r = new FileReader()
    r.onload = () => {
      const src = String(r.result)
      if (fileDove.current === 'bg' && slide) setSlide({ bg: { ...(slide.bg ?? { c1: '#204769', c2: '#A2864C', angolo: 160, velatura: 30 }), modo: 'immagine', src } })
      else if (fileDove.current === 'el' && elemento?.tipo === 'immagine') setEl(elemento.id, { src })
      else aggiungiEl('immagine', { src })
    }
    r.readAsDataURL(f)
  }

  // ── Slide ──
  const nuovaSlide = () => {
    const s: Slide = { id: uid('s'), durata: 5, sfondo: slide?.sfondo ?? 'oceano', bg: slide?.bg ? clone(slide.bg) : undefined, transizione: slide?.transizione ?? 'dissolvenza', elementi: [] }
    setSlides(ss => { const i = ss.findIndex(x => x.id === slideId); const out = [...ss]; out.splice(i + 1, 0, s); return out })
    setSlideId(s.id); setElId(null); setPlaying(false)
    setTempo(inizioSlide + (slide?.durata ?? 0))
  }
  const duplicaSlide = (id: string) => {
    const src = bozza?.slides.find(s => s.id === id)
    if (!src) return
    const s = { ...clone(src), id: uid('s'), nome: src.nome ? `${src.nome} (copia)` : undefined, elementi: src.elementi.map(e => ({ ...clone(e), id: uid('el') })) }
    setSlides(ss => { const i = ss.findIndex(x => x.id === id); const out = [...ss]; out.splice(i + 1, 0, s); return out })
    setSlideId(s.id); setElId(null)
  }
  const eliminaSlide = async (id: string) => {
    if (!bozza || bozza.slides.length < 2) { toast.warning('Lo spot deve avere almeno una slide.', 'Editor palinsesti'); return }
    const i = bozza.slides.findIndex(s => s.id === id)
    if (!(await confirm({ title: 'Elimina slide', message: <>Vuoi eliminare la <strong>slide {i + 1}{bozza.slides[i].nome ? ` «${bozza.slides[i].nome}»` : ''}</strong> dallo spot? Puoi recuperarla con Annulla.</>, confirmLabel: 'Elimina', danger: true }))) return
    setSlides(ss => ss.filter(s => s.id !== id))
    if (slideId === id) vaiSlide(bozza.slides.find(s => s.id !== id)!.id)
  }
  const spostaSlide = (da: string, su: string) => setSlides(ss => {
    const out = [...ss]; const i = out.findIndex(s => s.id === da); const [m] = out.splice(i, 1)
    out.splice(out.findIndex(s => s.id === su) + (i > out.findIndex(s => s.id === su) ? 0 : 1), 0, m); return out
  })

  // ── Trascinamento, ridimensionamento, rotazione con aggancio ──
  const stageRef = useRef<HTMLDivElement>(null)
  const startDrag = (ev: React.PointerEvent, e: Elemento, mode: Maniglia) => {
    ev.stopPropagation(); ev.preventDefault()
    setElId(e.id)
    if (e.bloccato || !slide) return
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect) return
    const sx = ev.clientX, sy = ev.clientY, o = { ...e }
    const k = `${e.id}:drag:${Date.now()}`
    const altri = slide.elementi.filter(x => x.id !== e.id && !x.nascosto)
    const lineeV = [0, 50, 100, ...altri.flatMap(a => [a.x, a.x + a.w / 2, a.x + a.w])]
    const lineeH = [0, 50, 100, ...altri.flatMap(a => [a.y, a.y + a.h / 2, a.y + a.h])]
    const quadrato = e.tipo === 'qr' || e.forma === 'cerchio'
    const aggancia = (pos: number, size: number, linee: number[]) => {
      let best: { d: number; v: number; at: number } | null = null
      for (const off of [0, size / 2, size]) for (const l of linee) {
        const d = Math.abs(pos + off - l)
        if (d < SOGLIA_AGGANCIO && (!best || d < best.d)) best = { d, v: l - off, at: l }
      }
      return best
    }
    const move = (m: PointerEvent) => {
      const dx = ((m.clientX - sx) / rect.width) * 100, dy = ((m.clientY - sy) / rect.height) * 100
      if (mode === 'move') {
        let x = o.x + dx, y = o.y + dy
        const gv: number[] = [], gh: number[] = []
        if (aggancio && !m.altKey) {
          const bx = aggancia(x, o.w, lineeV); if (bx) { x = bx.v; gv.push(bx.at) }
          const by = aggancia(y, o.h, lineeH); if (by) { y = by.v; gh.push(by.at) }
        }
        setGuide(gv.length || gh.length ? { v: gv, h: gh } : null)
        setEl(e.id, { x: r05(Math.min(100 - o.w, Math.max(-o.w / 2, x))), y: r05(Math.min(100 - o.h / 2, Math.max(-o.h / 2, y))) }, k)
      } else if (mode === 'rot') {
        const cx = rect.left + ((o.x + o.w / 2) / 100) * rect.width, cy = rect.top + ((o.y + o.h / 2) / 100) * rect.height
        let a = (Math.atan2(m.clientY - cy, m.clientX - cx) * 180) / Math.PI + 90
        if (a > 180) a -= 360
        a = m.shiftKey ? Math.round(a / 15) * 15 : Math.abs(a % 45) < 4 || Math.abs(a % 45) > 41 ? Math.round(a / 45) * 45 : Math.round(a)
        setEl(e.id, { rot: a }, k)
      } else {
        const sxs = mode.includes('w') ? -1 : 1, sys = mode.includes('n') ? -1 : 1
        let w = Math.max(4, o.w + sxs * dx), h = Math.max(quadrato ? 2 : 0.5, o.h + sys * dy)
        if (quadrato) h = hQuadrata(w, formato)
        else if (m.shiftKey) h = (w / o.w) * o.h
        const x = sxs < 0 ? o.x + o.w - w : o.x, y = sys < 0 ? o.y + o.h - h : o.y
        setEl(e.id, { w: r05(w), h: r05(h), x: r05(x), y: r05(y) }, k)
      }
    }
    const up = () => { setGuide(null); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }

  // ── Tastiera ──
  useEffect(() => {
    const key = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement
      const mod = ev.metaKey || ev.ctrlKey
      const k = ev.key.toLowerCase()
      if (mod && k === 's' && !modale) { ev.preventDefault(); salva(); return }
      if (modale || /INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable) return
      if (mod && k === 'z') { ev.preventDefault(); if (ev.shiftKey) ripeti(); else annulla(); return }
      if (mod && k === 'y') { ev.preventDefault(); ripeti(); return }
      if (ev.key === ' ') { ev.preventDefault(); play(); return }
      if (mod && k === 'v' && appunti) { ev.preventDefault(); duplicaEl(appunti); return }
      if (!elemento) return
      if (mod && k === 'd') { ev.preventDefault(); duplicaEl(); return }
      if (mod && k === 'c') { appunti = clone(elemento); toast.info('Elemento copiato: incollalo con Ctrl+V, anche su un\'altra slide.', 'Editor palinsesti'); return }
      if (ev.key === 'Escape') { setElId(null); return }
      if (ev.key === ']') { livello(elemento.id, 1); return }
      if (ev.key === '[') { livello(elemento.id, -1); return }
      if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); togliEl(elemento.id); return }
      if (elemento.bloccato) return
      const step = ev.shiftKey ? 5 : 1, kk = `${elemento.id}:frecce`
      if (ev.key === 'ArrowLeft') { ev.preventDefault(); setEl(elemento.id, { x: elemento.x - step }, kk) }
      if (ev.key === 'ArrowRight') { ev.preventDefault(); setEl(elemento.id, { x: elemento.x + step }, kk) }
      if (ev.key === 'ArrowUp') { ev.preventDefault(); setEl(elemento.id, { y: elemento.y - step }, kk) }
      if (ev.key === 'ArrowDown') { ev.preventDefault(); setEl(elemento.id, { y: elemento.y + step }, kk) }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })

  // ── Progetti ──
  const salva = () => {
    if (!bozza || !sporco) return
    salvaProgetto(bozza)
    toast.success(`Spot «${bozza.nome}» salvato: puoi pianificarlo sui totem. La versione precedente resta in Versioni.`, 'Editor palinsesti')
  }
  const creaProgetto = (nome: string, cartella: string, base: Pick<Progetto, 'slides' | 'formato'>) => {
    const p = nuovoProgetto(nome, cartella, base)
    setProgId(p.id); carica(p); setModale(null); setTabSx('aggiungi')
  }
  const elimina = async (p: Progetto) => {
    const tr = useTotemStore.getState().trasmissioni.filter(t => t.progettoId === p.id).length
    if (!(await confirm({ title: 'Elimina spot', message: <>Vuoi eliminare <strong>{p.nome}</strong>?{tr > 0 && <> Verranno tolte anche le sue <strong>{tr} trasmissioni</strong> pianificate.</>}</>, confirmLabel: 'Elimina', danger: true }))) return
    eliminaProgetto(p.id)
    if (p.id === progId) { const altro = progetti.find(x => x.id !== p.id) ?? null; setProgId(altro?.id ?? ''); carica(altro) }
  }
  const ripristina = async (at: string) => {
    if (!salvato) return
    if (!(await confirm({ title: 'Ripristina versione', message: <>Lo spot torna com'era il <strong>{new Date(at).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</strong>. La versione attuale resta tra le versioni{sporco ? <>; le modifiche non salvate si perdono</> : null}.</>, confirmLabel: 'Ripristina' }))) return
    ripristinaVersione(salvato.id, at)
    const p = useTotemStore.getState().progetti.find(x => x.id === salvato.id)
    if (p) carica(p)
    setModale(null)
    toast.success('Versione ripristinata.', 'Editor palinsesti')
  }

  // ── Controllo di Sibylla ──
  const totemTouch = totem.filter(t => t.config.touch).length
  const checks = useMemo(() => bozza ? controlli(bozza, totemTouch, totem.length) : [], [bozza, totemTouch, totem.length])
  const score = punteggio(checks)
  const vaiCheck = (c: Controllo) => { if (c.slideId) vaiSlide(c.slideId, c.elId ?? null) }
  const fixCheck = (c: Controllo) => { if (c.fix) { modifica(c.fix); toast.success('Corretto. Puoi tornare indietro con Annulla.', 'Controllo di Sibylla') } }
  const fixAll = () => { const fx = checks.filter(c => !c.ok && c.fix); modifica(p => fx.reduce((q, c) => c.fix!(q), p)); toast.success(`${fx.length} correzioni applicate.`, 'Controllo di Sibylla') }

  // ── Storyboard PDF ──
  const storyRef = useRef<HTMLDivElement>(null)
  const esportaPdf = async () => {
    if (!bozza || pdf) return
    setPdf(true)
    try {
      await new Promise(r => setTimeout(r, 500))
      const nodi = Array.from(storyRef.current?.querySelectorAll<HTMLElement>('.edp__story-slide') ?? [])
      const [{ toJpeg }, { jsPDF }, { logoPng }] = await Promise.all([import('html-to-image'), import('jspdf'), import('../../notifiche/CentroNotifiche/reportPickupPdf')])
      const imgs = await Promise.all(nodi.map(n => toJpeg(n, { pixelRatio: 2, quality: 0.88, cacheBust: true, backgroundColor: '#0b1622' })))
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const logo = await logoPng()
      const oriz = formato === 'orizzontale'
      const cols = oriz ? 2 : 4, perPag = oriz ? 4 : 4
      const w = oriz ? 128 : 58, h = oriz ? w * 9 / 16 : w * 16 / 9
      const testata = (n: number) => {
        if (logo) doc.addImage(logo.data, 'PNG', 12, 9, 10 * logo.ratio, 10, 'logo', 'FAST')
        doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(32, 71, 105)
        doc.text(`Storyboard · ${bozza.nome}`, logo ? 16 + 10 * logo.ratio : 12, 16)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 116, 139)
        doc.text(`${bozza.slides.length} slide · ${tot} s · ${oriz ? 'orizzontale 16:9' : 'verticale 9:16'}${bozza.audio?.traccia ? ` · musica: ${TRACCE_AUDIO.find(t => t.id === bozza.audio!.traccia)?.label}` : ''} · pagina ${n}`, 285, 16, { align: 'right' })
      }
      bozza.slides.forEach((s, i) => {
        if (i % perPag === 0) { if (i) doc.addPage(); testata(i / perPag + 1) }
        const k = i % perPag, c = k % cols, rr = Math.floor(k / cols)
        const gap = oriz ? 17 : 13
        const x = 12 + c * (w + gap), y = 26 + rr * (h + 22)
        doc.addImage(imgs[i], 'JPEG', x, y, w, h)
        doc.setDrawColor(226, 232, 240); doc.rect(x, y, w, h)
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(30, 41, 59)
        doc.text(`${i + 1}. ${s.nome ?? `Slide ${i + 1}`}`, x, y + h + 5)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 116, 139)
        doc.text(`${s.durata} s · ${TRANSIZIONI.find(t => t.id === s.transizione)?.label} · ${s.elementi.length} elementi`, x, y + h + 9)
        if (s.note) doc.text(doc.splitTextToSize(s.note, w).slice(0, 2), x, y + h + 13)
      })
      doc.save(`storyboard-${bozza.nome.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`)
    } catch {
      toast.error('Non sono riuscito a creare lo storyboard.', 'Editor palinsesti')
    } finally {
      setPdf(false)
    }
  }

  const cartelle = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    const m = new Map<string, Progetto[]>()
    progetti.filter(p => !q || p.nome.toLowerCase().includes(q)).forEach(p => m.set(p.cartella, [...(m.get(p.cartella) ?? []), p]))
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [progetti, cerca])

  const totemPrev = totem.find(t => t.id === totemAnteprima)
  const dragLiv = useRef<string | null>(null)
  const icone = cercaIco.trim() ? TUTTE_ICONE.filter(i => i.includes(cercaIco.trim().toLowerCase())) : null
  const versioni = salvato?.versioni ?? []

  const strumento = (ico: string, tip: string, fn: () => void, opts: { on?: boolean; disabled?: boolean } = {}) => (
    <Tooltip text={tip}>
      <button type="button" className={clsx('edp__tb', opts.on && 'edp__tb--on')} aria-label={tip} aria-pressed={opts.on} disabled={opts.disabled} onClick={fn}><i className={`fa-solid fa-${ico}`} aria-hidden="true" /></button>
    </Tooltip>
  )

  return (
    <div className="edp">
      <PageHead
        title="Editor palinsesti"
        subtitle="Crea i tuoi spot: slide con testi, prezzi dal listino, QR e widget, animati sulla timeline"
        actions={
          <div className="edp__head-acts">
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setModale('anteprima')} disabled={!bozza}><i className="fa-solid fa-tv" aria-hidden="true" /> Anteprima</button>
            {ritorno === 'acquista'
              ? <button type="button" className="sib-btn sib-btn--secondary" onClick={() => { if (sporco) salva(); navigate(`acquista-spazi:campagna${bozza ? `:${bozza.id}` : ''}`) }}><i className="fa-solid fa-cart-shopping" aria-hidden="true" /> Torna all'acquisto</button>
              : <button type="button" className="sib-btn sib-btn--secondary" onClick={() => { if (sporco) salva(); navigate('gest-advertising') }} disabled={!bozza}><i className="fa-solid fa-calendar-plus" aria-hidden="true" /> Pianifica</button>}
            <button type="button" className="sib-btn sib-btn--primary" onClick={salva} disabled={!sporco}><i className="fa-solid fa-floppy-disk" aria-hidden="true" /> {sporco ? 'Salva' : 'Salvato'}</button>
          </div>
        }
      />

      <div className="edp__layout">
        {/* ── Pannello sinistro: Spot / Aggiungi / Livelli ── */}
        <aside className="edp__panel">
          <nav className="edp__tabs">
            {([['spot', 'folder-open', 'Spot'], ['aggiungi', 'plus', 'Aggiungi'], ['livelli', 'layer-group', 'Livelli']] as const).map(([k, ico, l]) => (
              <button key={k} type="button" className={clsx('edp__tab', tabSx === k && 'edp__tab--on')} onClick={() => setTabSx(k)}><i className={`fa-solid fa-${ico}`} aria-hidden="true" /><span>{l}</span></button>
            ))}
          </nav>

          {tabSx === 'spot' && (
            <>
              <div className="edp__search">
                <SearchField name="cerca-spot" placeholder="Cerca spot…" value={cerca} onChange={e => setCerca(e.target.value)} onClear={() => setCerca('')} />
                <Tooltip text="Nuovo spot"><button type="button" className="edp__icon" aria-label="Nuovo spot" onClick={() => setModale('nuovo')}><i className="fa-solid fa-plus" aria-hidden="true" /></button></Tooltip>
              </div>
              <div className="edp__scroll">
                {cartelle.map(([c, ps]) => (
                  <div key={c} className="edp__folder">
                    <span className="edp__folder-name"><i className="fa-solid fa-folder-open" aria-hidden="true" />{c}<small>{ps.length}</small></span>
                    {ps.map(p => (
                      <div key={p.id} className={clsx('edp__proj', p.id === progId && 'edp__proj--on')} role="button" tabIndex={0}
                        onClick={() => apri(p.id)} onKeyDown={e => e.key === 'Enter' && apri(p.id)}>
                        <span className={clsx('edp__proj-thumb', p.formato === 'orizzontale' && 'edp__proj-thumb--oriz')}>{p.slides[0] && <SlideView slide={p.slides[0]} formato={p.formato} />}</span>
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
                {!cartelle.length && <p className="edp__none">Nessuno spot trovato.</p>}
              </div>
            </>
          )}

          {tabSx === 'aggiungi' && slide && (
            <div className="edp__scroll edp__lib">
              <span className="edp__lib-title">Testo</span>
              <div className="edp__presets">
                {PRESET_TESTO.map(pt => (
                  <button key={pt.id} type="button" className="edp__preset" onClick={() => aggiungiEl('testo', { ...pt.e, nome: pt.label })}
                    style={{ '--pf': `'${pt.e.font}'`, '--pw': pt.e.peso ?? 400 } as React.CSSProperties}>
                    <span className={clsx('edp__preset-demo', pt.e.maiuscolo && 'edp__preset-demo--up')}>{pt.demo}</span>
                    <small>{pt.label}</small>
                  </button>
                ))}
              </div>
              <span className="edp__lib-title">Elementi</span>
              <div className="edp__lib-grid">
                <button type="button" className="edp__lib-btn" onClick={() => aggiungiEl('prezzo')}><i className="fa-solid fa-tag" aria-hidden="true" />Prezzo</button>
                <button type="button" className="edp__lib-btn" onClick={() => scegliFile('nuova')}><i className="fa-solid fa-image" aria-hidden="true" />Immagine</button>
                <button type="button" className="edp__lib-btn" onClick={() => aggiungiEl('qr')}><i className="fa-solid fa-qrcode" aria-hidden="true" />QR code</button>
              </div>
              <span className="edp__lib-title">Forme</span>
              <div className="edp__lib-grid edp__lib-grid--5">
                {FORME.map(f => (
                  <Tooltip key={f.id} text={f.label}>
                    <button type="button" className="edp__lib-btn edp__lib-btn--ico" aria-label={f.label} onClick={() => aggiungiEl('forma', { forma: f.id as FormaTipo, ...(f.id === 'linea' ? { h: 0.6, y: 50 } : f.id === 'cerchio' ? { w: 30, x: 35 } : f.id === 'triangolo' ? { w: 24, x: 38, h: 12 } : f.id === 'pillola' ? { raggio: 40 } : {}) })}>
                      <i className={`fa-solid fa-${f.ico}`} aria-hidden="true" />
                    </button>
                  </Tooltip>
                ))}
              </div>
              <span className="edp__lib-title">Widget dinamici</span>
              <div className="edp__lib-grid edp__lib-grid--2">
                {WIDGETS.map(w => (
                  <Tooltip key={w.id} text={w.hint}>
                    <button type="button" className="edp__lib-btn edp__lib-btn--row" onClick={() => aggiungiEl('widget', { widget: w.id as WidgetTipo, nome: w.label, ...(w.id === 'countdown' ? { countdownA: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16) } : {}) })}>
                      <i className={`fa-solid fa-${w.ico}`} aria-hidden="true" />{w.label}
                    </button>
                  </Tooltip>
                ))}
              </div>
              <span className="edp__lib-title">Icone</span>
              <SearchField name="lib-ico" placeholder="Cerca icona (in inglese)…" value={cercaIco} onChange={e => setCercaIco(e.target.value)} onClear={() => setCercaIco('')} />
              {(icone ? [{ id: 'ris', label: `${icone.length} risultati`, icone }] : CATEGORIE_ICONE).map(c => (
                <div key={c.id} className="edp__icocat">
                  <small>{c.label}</small>
                  <div className="edp__icons">
                    {c.icone.map(ic => (
                      <button key={ic} type="button" aria-label={ic} className="edp__ic" onClick={() => aggiungiEl('icona', { icona: ic, nome: `Icona ${ic}` })}><i className={`fa-solid fa-${ic}`} aria-hidden="true" /></button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tabSx === 'livelli' && slide && (
            <div className="edp__scroll">
              <p className="edp__lib-hint">In alto i livelli in primo piano. Trascina per riordinare.</p>
              <ul className="edp__layers">
                {[...slide.elementi].reverse().map(e => (
                  <li key={e.id} draggable className={clsx('edp__layer', e.id === elId && 'edp__layer--on', e.nascosto && 'edp__layer--off')}
                    onDragStart={() => { dragLiv.current = e.id }} onDragOver={ev => ev.preventDefault()}
                    onDrop={() => { if (dragLiv.current && dragLiv.current !== e.id) spostaEl(dragLiv.current, e.id); dragLiv.current = null }}
                    onClick={() => selEl(e.id)}>
                    <i className="fa-solid fa-grip-vertical edp__layer-grip" aria-hidden="true" />
                    <i className={`fa-solid fa-${TIPO_ICO[e.tipo]} edp__layer-ico`} aria-hidden="true" />
                    <span className="edp__layer-txt">
                      <TruncatedText text={e.nome || (e.tipo === 'testo' ? e.testo ?? '' : TIPO_LBL[e.tipo])} className="edp__layer-name" />
                      <small>{(e.inizio ?? 0).toLocaleString('it-IT')}–{Math.min(e.fine ?? slide.durata, slide.durata).toLocaleString('it-IT')} s{e.azione && e.azione !== 'nessuna' ? ' · al tocco' : ''}</small>
                    </span>
                    <span className="edp__layer-acts" onClick={ev => ev.stopPropagation()}>
                      <Tooltip text={e.nascosto ? 'Mostra' : 'Nascondi'}><button type="button" className="edp__icon edp__icon--sm" aria-label={e.nascosto ? 'Mostra' : 'Nascondi'} onClick={() => setEl(e.id, { nascosto: !e.nascosto })}><i className={`fa-solid fa-${e.nascosto ? 'eye-slash' : 'eye'}`} aria-hidden="true" /></button></Tooltip>
                      <Tooltip text={e.bloccato ? 'Sblocca' : 'Blocca'}><button type="button" className="edp__icon edp__icon--sm" aria-label={e.bloccato ? 'Sblocca' : 'Blocca'} onClick={() => setEl(e.id, { bloccato: !e.bloccato })}><i className={`fa-solid fa-${e.bloccato ? 'lock' : 'lock-open'}`} aria-hidden="true" /></button></Tooltip>
                    </span>
                  </li>
                ))}
              </ul>
              {!slide.elementi.length && <p className="edp__none">La slide non ha ancora elementi.</p>}
            </div>
          )}
        </aside>

        {/* ── Tela ── */}
        <section className="edp__canvas-col">
          {bozza && slide ? (
            <>
              <div className="edp__toolbar">
                {strumento('rotate-left', 'Annulla (Ctrl+Z)', annulla, { disabled: !storia.passato.length })}
                {strumento('rotate-right', 'Ripeti (Ctrl+Maiusc+Z)', ripeti, { disabled: !storia.futuro.length })}
                <span className="edp__sep" />
                <span className="edp__menu-wrap">
                  {strumento('objects-align-center-horizontal', 'Allinea alla slide', () => setMenuAll(v => !v), { disabled: !elemento || elemento.bloccato, on: menuAll })}
                  {menuAll && elemento && (
                    <span className="edp__menu" onMouseLeave={() => setMenuAll(false)}>
                      {([['l', 'objects-align-left', 'A sinistra'], ['c', 'objects-align-center-horizontal', 'Al centro'], ['r', 'objects-align-right', 'A destra'],
                        ['t', 'objects-align-top', 'In alto'], ['m', 'objects-align-center-vertical', 'In mezzo'], ['b', 'objects-align-bottom', 'In basso']] as const).map(([k, ico, l]) => (
                        <button key={k} type="button" className="edp__menu-item" onClick={() => { allinea(k); setMenuAll(false) }}><i className={`fa-solid fa-${ico}`} aria-hidden="true" />{l}</button>
                      ))}
                    </span>
                  )}
                </span>
                {strumento('clone', 'Duplica (Ctrl+D)', () => duplicaEl(), { disabled: !elemento })}
                {strumento('trash-can', 'Elimina (Canc)', () => elemento && togliEl(elemento.id), { disabled: !elemento })}
                <span className="edp__sep" />
                {strumento('magnet', 'Aggancio alle guide', () => setAggancio(v => !v), { on: aggancio })}
                {strumento('border-all', 'Griglia', () => setGriglia(v => !v), { on: griglia })}
                {strumento('expand', 'Area sicura (margini del totem)', () => setAreaSicura(v => !v), { on: areaSicura })}
                <span className="edp__sep" />
                {strumento('magnifying-glass-minus', 'Riduci', () => setZoom(z => ZOOM[Math.max(0, ZOOM.indexOf(z) - 1)]), { disabled: zoom === ZOOM[0] })}
                <span className="edp__zoom">{Math.round(zoom * 100)}%</span>
                {strumento('magnifying-glass-plus', 'Ingrandisci', () => setZoom(z => ZOOM[Math.min(ZOOM.length - 1, ZOOM.indexOf(z) + 1)]), { disabled: zoom === ZOOM[ZOOM.length - 1] })}
                <span className="edp__tb-end">
                  <Tooltip text="Apri il Controllo di Sibylla">
                    <button type="button" className={clsx('edp__score', score >= 85 ? 'edp__score--ok' : score >= 60 ? 'edp__score--mid' : 'edp__score--ko')} onClick={() => { setElId(null); setTabSlide('controllo') }}>
                      <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> {score}
                    </button>
                  </Tooltip>
                  {strumento('clock-rotate-left', `Versioni salvate (${versioni.length})`, () => setModale('versioni'))}
                  {strumento(pdf ? 'spinner fa-spin' : 'file-pdf', 'Scarica lo storyboard in PDF per farlo approvare', esportaPdf, { disabled: pdf })}
                  {strumento('keyboard', 'Scorciatoie da tastiera', () => setModale('scorciatoie'))}
                </span>
              </div>

              <div className="edp__stage-wrap" onPointerDown={() => !inRegia && setElId(null)}>
                <div className="edp__crumb">
                  <span>{bozza.cartella} › <strong>{bozza.nome}</strong></span>
                  <span>Slide {bozza.slides.indexOf(slide) + 1} di {bozza.slides.length} · {fmtTempo(locale)} · {formato === 'orizzontale' ? '16:9' : '9:16'}</span>
                </div>
                <div className={clsx('edp__stage', formato === 'orizzontale' && 'edp__stage--oriz')} ref={stageRef} style={{ '--zoom': zoom } as React.CSSProperties}>
                  {inRegia ? (
                    <SlideView slide={slide} formato={formato} t={locale} ctx={{ citta: totemPrev?.citta }} />
                  ) : (
                    <SlideView slide={slide} formato={formato} senzaElementi>
                      <div className="edp__layer-stage">
                        {slide.elementi.map(e => (
                          <div key={e.id} className={clsx('edp__el', e.id === elId && 'edp__el--sel', e.bloccato && 'edp__el--lock')} onPointerDown={ev => startDrag(ev, e, 'move')}
                            onDoubleClick={() => e.tipo === 'testo' && document.querySelector<HTMLTextAreaElement>('textarea[name="el-testo"]')?.focus()}>
                            <ElementoView e={e} t={locale} durata={slide.durata} statico ctx={{ citta: totemPrev?.citta }} />
                          </div>
                        ))}
                      </div>
                    </SlideView>
                  )}
                  {!inRegia && (
                    <>
                      {griglia && <span className="edp__grid" />}
                      {areaSicura && <span className="edp__safe" />}
                      {guide?.v.map(v => <span key={`v${v}`} className="edp__guide edp__guide--v" style={{ '--pos': `${v}%` } as React.CSSProperties} />)}
                      {guide?.h.map(h => <span key={`h${h}`} className="edp__guide edp__guide--h" style={{ '--pos': `${h}%` } as React.CSSProperties} />)}
                      {elemento && !elemento.nascosto && (
                        <span className={clsx('edp__frame', elemento.bloccato && 'edp__frame--lock')}
                          style={{ '--x': `${elemento.x}%`, '--y': `${elemento.y}%`, '--w': `${elemento.w}%`, '--h': `${elemento.h}%`, '--rot': `${elemento.rot ?? 0}deg` } as React.CSSProperties}>
                          {!elemento.bloccato && (
                            <>
                              {(['nw', 'ne', 'sw', 'se'] as const).map(m => <span key={m} className={`edp__handle edp__handle--${m}`} onPointerDown={ev => startDrag(ev, elemento, m)} />)}
                              <span className="edp__rot" onPointerDown={ev => startDrag(ev, elemento, 'rot')}><i className="fa-solid fa-rotate" aria-hidden="true" /></span>
                            </>
                          )}
                          {elemento.bloccato && <span className="edp__lock-badge"><i className="fa-solid fa-lock" aria-hidden="true" /></span>}
                          {elemento.azione && elemento.azione !== 'nessuna' && <span className="edp__touch-badge"><i className="fa-solid fa-hand-pointer" aria-hidden="true" /></span>}
                        </span>
                      )}
                    </>
                  )}
                </div>
                <span className="edp__stage-hint">
                  {inRegia ? 'Riproduzione in corso: metti in pausa per modificare'
                    : 'Trascina per spostare · angoli per ridimensionare · cerchietto per ruotare · doppio clic sul testo per scriverlo · gli elementi chiari non sono ancora in scena a questo istante'}
                </span>
              </div>
            </>
          ) : <div className="edp__empty">Crea il tuo primo spot con il pulsante +</div>}
        </section>

        {/* ── Proprietà ── */}
        <aside className="edp__panel">
          {bozza && slide && (
            <PannelloProprieta
              progetto={bozza} slide={slide} elemento={elemento}
              setEl={setEl} setSlide={setSlide} setProgetto={setProgetto}
              onLivello={d => elemento && livello(elemento.id, d)} onDuplica={() => duplicaEl()} onElimina={() => elemento && togliEl(elemento.id)}
              onCaricaImg={d => scegliFile(d)}
              onAnteprimaEl={() => { setTempo(inizioSlide); setElId(null); setPlaying(true) }}
              tabSlide={tabSlide} setTabSlide={setTabSlide}
              checks={checks} onVai={vaiCheck} onFix={fixCheck} onFixAll={fixAll} totemTouch={totemTouch}
            />
          )}
        </aside>
      </div>

      {bozza && slide && (
        <TimelineSpot
          progetto={bozza} slideId={slide.id} elId={elId} tempo={tempo} playing={playing}
          onPlay={play}
          onSeek={t => { setPlaying(false); setScrub(true); setElId(null); setTempo(t) }}
          onSeekEnd={() => setScrub(false)}
          onSelSlide={id => vaiSlide(id)}
          onSelEl={selEl}
          onNuovaSlide={nuovaSlide} onDuplicaSlide={duplicaSlide} onEliminaSlide={eliminaSlide}
          onSposta={spostaSlide}
          onDurata={(id, durata) => setSlides(ss => ss.map(s => s.id === id ? { ...s, durata } : s), `dur:${id}`)}
          onTempiEl={(id, patch) => setSlides(ss => ss.map(s => s.id !== slide.id ? s : { ...s, elementi: s.elementi.map(e => e.id === id ? { ...e, ...patch } : e) }), `tempi:${id}`)}
        />
      )}

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { caricaImmagine(e.target.files?.[0]); e.target.value = '' }} />

      {/* Storyboard: slide complete fuori schermo, fotografate per il PDF */}
      {pdf && bozza && (
        <div className="edp__story" ref={storyRef} aria-hidden="true">
          {bozza.slides.map(s => <div key={s.id} className={clsx('edp__story-slide', formato === 'orizzontale' && 'edp__story-slide--oriz')}><SlideView slide={{ ...s, transizione: 'nessuna' }} formato={formato} ctx={{ citta: totemPrev?.citta }} /></div>)}
        </div>
      )}

      <Modal open={modale === 'anteprima'} onClose={() => setModale(null)} title={`Anteprima · ${bozza?.nome ?? ''}`} size={formato === 'orizzontale' ? 'lg' : 'md'}>
        <div className="edp__preview">
          <SelectField name="prev-totem" label="Simula sul totem" value={totemAnteprima} onChange={e => setTotemAnteprima(e.target.value)}
            options={totem.map(t => ({ value: t.id, label: `${etichettaTotem(t)} · ${t.citta}` }))} />
          <div className={clsx('edp__preview-frame', formato === 'orizzontale' && 'edp__preview-frame--oriz')}>
            <TotemFrame orizzontale={formato === 'orizzontale'} caption={<>
              {bozza?.slides.length ?? 0} slide · {tot} secondi, poi riparte
              {bozza?.audio?.traccia && <> · <i className="fa-solid fa-music" aria-hidden="true" /> {TRACCE_AUDIO.find(t => t.id === bozza.audio!.traccia)?.label}</>}
              {totemPrev && totemPrev.config.orientamento !== formato && <><br /><span className="edp__warn"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> Questo totem è {totemPrev.config.orientamento}: lo spot non andrà in onda qui</span></>}
            </>}>
              <SpotPlayer progetto={bozza} ctx={{ citta: totemPrev?.citta }} />
            </TotemFrame>
          </div>
        </div>
      </Modal>

      <Modal open={modale === 'versioni'} onClose={() => setModale(null)} title={`Versioni · ${bozza?.nome ?? ''}`} size="md">
        <div className="edp__vers">
          {salvato && (
            <div className="edp__ver edp__ver--cur">
              <span className={clsx('edp__ver-thumb', formato === 'orizzontale' && 'edp__ver-thumb--oriz')}>{salvato.slides[0] && <SlideView slide={salvato.slides[0]} formato={salvato.formato} />}</span>
              <span className="edp__ver-txt"><strong>Versione salvata attuale</strong><small>{new Date(salvato.updatedAt).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' })} · {salvato.slides.length} slide · {durataProgetto(salvato)} s</small></span>
              <span className="edp__ver-tag">In uso</span>
            </div>
          )}
          {versioni.map(v => (
            <div key={v.at} className="edp__ver">
              <span className={clsx('edp__ver-thumb', formato === 'orizzontale' && 'edp__ver-thumb--oriz')}>{v.slides[0] && <SlideView slide={v.slides[0]} formato={formato} />}</span>
              <span className="edp__ver-txt"><strong>{new Date(v.at).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' })}</strong><small>{v.nota}</small></span>
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => ripristina(v.at)}><i className="fa-solid fa-clock-rotate-left" aria-hidden="true" /> Ripristina</button>
            </div>
          ))}
          {!versioni.length && <p className="edp__none">Ogni volta che salvi, la versione precedente resta qui (fino a 10).</p>}
        </div>
      </Modal>

      <Modal open={modale === 'scorciatoie'} onClose={() => setModale(null)} title="Scorciatoie da tastiera" size="sm">
        <dl className="edp__keys">
          {SCORCIATOIE.map(([k, d]) => <div key={k}><dt><kbd>{k}</kbd></dt><dd>{d}</dd></div>)}
        </dl>
      </Modal>

      <ModaleNuovoSpot open={modale === 'nuovo'} cartella={ritorno === 'acquista' ? 'Campagne sulla rete' : bozza?.cartella ?? 'Palinsesti'} onClose={() => setModale(null)} onCrea={creaProgetto} />
    </div>
  )
}
