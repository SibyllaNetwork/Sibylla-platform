import React, { useRef } from 'react'
import clsx from 'clsx'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import { SlideView, durIngressoDi } from '../_shared/SpotPlayer'
import { TRANSIZIONI, durataProgetto, type Elemento, type Progetto } from '../../../store/useTotemStore'
import { TIPO_ICO, TIPO_LBL, r05, r1 } from './editorModel'
import './TimelineSpot.sass'

/**
 * Timeline dell'Editor palinsesti, su due scale:
 *  · in alto tutto lo spot: righello, slide in sequenza (trascina per riordinare,
 *    tira il bordo destro per cambiare la durata) e la testina di riproduzione;
 *  · sotto la slide aperta: una traccia per elemento con la barra "in scena"
 *    (trascina per spostarla, tira i bordi per l'ingresso e l'uscita).
 */

interface Props {
  progetto: Progetto
  slideId: string
  elId: string | null
  tempo: number
  playing: boolean
  onPlay: () => void
  onSeek: (t: number) => void
  onSeekEnd: () => void
  onSelSlide: (id: string) => void
  onSelEl: (id: string) => void
  onNuovaSlide: () => void
  onDuplicaSlide: (id: string) => void
  onEliminaSlide: (id: string) => void
  onSposta: (da: string, su: string) => void
  onDurata: (id: string, durata: number) => void
  onTempiEl: (id: string, patch: Partial<Pick<Elemento, 'inizio' | 'fine'>>) => void
}

export const fmtTempo = (t: number) => {
  const m = Math.floor(t / 60), s = t - m * 60
  return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0').replace('.', ',')}`
}

/** Trascinamento orizzontale su una corsia: restituisce i secondi di spostamento. */
function trascina(ev: React.PointerEvent, lane: HTMLElement | null, scala: number, onMove: (ds: number, abs: number) => void, onEnd?: () => void) {
  ev.preventDefault(); ev.stopPropagation()
  const rect = lane?.getBoundingClientRect()
  if (!rect) return
  const x0 = ev.clientX
  const move = (m: PointerEvent) => onMove(((m.clientX - x0) / rect.width) * scala, ((m.clientX - rect.left) / rect.width) * scala)
  const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); onEnd?.() }
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
}

export default function TimelineSpot(p: Props) {
  const { progetto } = p
  const tot = Math.max(0.1, durataProgetto(progetto))
  const slide = progetto.slides.find(s => s.id === p.slideId) ?? progetto.slides[0]
  const inizioSlide = progetto.slides.slice(0, progetto.slides.indexOf(slide)).reduce((s, x) => s + x.durata, 0)
  const locale = p.tempo - inizioSlide
  const laneTot = useRef<HTMLDivElement>(null)
  const laneEl = useRef<HTMLDivElement>(null)
  const dragSlide = useRef<string | null>(null)

  const passo = tot <= 12 ? 1 : tot <= 30 ? 2 : 5
  const ticks = Array.from({ length: Math.floor(tot / passo) + 1 }, (_, i) => i * passo)
  const ticksLoc = Array.from({ length: Math.floor(slide.durata) + 1 }, (_, i) => i)

  const seekDa = (ev: React.PointerEvent, lane: HTMLDivElement | null, base: number, scala: number) => {
    const rect = lane?.getBoundingClientRect()
    if (!rect) return
    const at = (x: number) => Math.max(0, Math.min(tot - 0.01, base + ((x - rect.left) / rect.width) * scala))
    p.onSeek(at(ev.clientX))
    trascina(ev, lane, scala, (_, abs) => p.onSeek(Math.max(0, Math.min(tot - 0.01, base + abs))), p.onSeekEnd)
  }

  let cursore = 0
  return (
    <section className="tls">
      <header className="tls__head">
        <Tooltip text={p.playing ? 'Pausa (spazio)' : 'Riproduci (spazio)'}>
          <button type="button" className="tls__play" aria-label={p.playing ? 'Pausa' : 'Riproduci'} onClick={p.onPlay}><i className={`fa-solid fa-${p.playing ? 'pause' : 'play'}`} aria-hidden="true" /></button>
        </Tooltip>
        <Tooltip text="Torna all'inizio">
          <button type="button" className="tls__btn" aria-label="Torna all'inizio" onClick={() => { p.onSeek(0); p.onSeekEnd() }}><i className="fa-solid fa-backward-step" aria-hidden="true" /></button>
        </Tooltip>
        <span className="tls__time"><strong>{fmtTempo(p.tempo)}</strong> / {fmtTempo(tot)}</span>
        <span className="tls__meta">{progetto.slides.length} slide</span>
        <button type="button" className="sib-btn sib-btn--secondary tls__add" onClick={p.onNuovaSlide}><i className="fa-solid fa-plus" aria-hidden="true" /> Aggiungi slide</button>
      </header>

      <div className="tls__grid">
        <span className="tls__lbl" />
        <div className="tls__ruler" ref={laneTot} onPointerDown={ev => seekDa(ev, laneTot.current, 0, tot)}>
          {ticks.map(t => <span key={t} className="tls__tick" style={{ '--pos': `${(t / tot) * 100}%` } as React.CSSProperties}>{t}s</span>)}
          <span className="tls__head-pin" style={{ '--pos': `${(p.tempo / tot) * 100}%` } as React.CSSProperties} />
        </div>

        <span className="tls__lbl"><i className="fa-solid fa-film" aria-hidden="true" /> Slide</span>
        <div className="tls__track">
          {progetto.slides.map((s, i) => {
            const da = cursore; cursore += s.durata
            return (
              <div key={s.id} draggable
                onDragStart={() => { dragSlide.current = s.id }}
                onDragOver={e => e.preventDefault()}
                onDrop={() => { if (dragSlide.current && dragSlide.current !== s.id) p.onSposta(dragSlide.current, s.id); dragSlide.current = null }}
                className={clsx('tls__clip', s.id === slide.id && 'tls__clip--on')}
                style={{ '--a': `${(da / tot) * 100}%`, '--w': `${(s.durata / tot) * 100}%` } as React.CSSProperties}
                onClick={() => p.onSelSlide(s.id)}>
                <span className="tls__clip-thumb"><SlideView slide={s} formato={progetto.formato} /></span>
                <span className="tls__clip-txt">
                  <TruncatedText text={s.nome ? `${i + 1}. ${s.nome}` : `Slide ${i + 1}`} className="tls__clip-name" />
                  <span>{s.durata} s · {TRANSIZIONI.find(x => x.id === s.transizione)?.label}</span>
                </span>
                <span className="tls__clip-acts" onClick={e => e.stopPropagation()}>
                  <Tooltip text="Duplica slide"><button type="button" className="tls__btn tls__btn--sm" aria-label="Duplica slide" onClick={() => p.onDuplicaSlide(s.id)}><i className="fa-solid fa-clone" aria-hidden="true" /></button></Tooltip>
                  <Tooltip text="Elimina slide"><button type="button" className="tls__btn tls__btn--sm" aria-label="Elimina slide" onClick={() => p.onEliminaSlide(s.id)}><i className="fa-solid fa-trash-can" aria-hidden="true" /></button></Tooltip>
                </span>
                <Tooltip text="Trascina per cambiare la durata">
                  <span className="tls__clip-resize" role="separator" aria-label="Durata della slide"
                    onMouseDown={e => e.preventDefault()}
                    onPointerDown={ev => { const d0 = s.durata; trascina(ev, laneTot.current, tot, ds => p.onDurata(s.id, Math.max(2, Math.min(30, r05(d0 + ds))))) }} />
                </Tooltip>
              </div>
            )
          })}
          <span className="tls__playhead" style={{ '--pos': `${(p.tempo / tot) * 100}%` } as React.CSSProperties} />
        </div>
      </div>

      <div className="tls__sub">
        <span className="tls__sub-title">Elementi di «{slide.nome ?? `Slide ${progetto.slides.indexOf(slide) + 1}`}» · {slide.durata} s</span>
        <span className="tls__sub-hint">Trascina le barre per decidere quando entrano ed escono</span>
      </div>
      <div className="tls__grid tls__grid--el">
        <span className="tls__lbl" />
        <div className="tls__ruler tls__ruler--loc" ref={laneEl} onPointerDown={ev => seekDa(ev, laneEl.current, inizioSlide, slide.durata)}>
          {ticksLoc.map(t => <span key={t} className="tls__tick" style={{ '--pos': `${(t / slide.durata) * 100}%` } as React.CSSProperties}>{t}s</span>)}
        </div>
        {[...slide.elementi].reverse().map(e => {
          const ini = e.inizio ?? 0, fin = Math.min(e.fine ?? slide.durata, slide.durata)
          const dIn = e.ingresso && e.ingresso !== 'nessuna' ? Math.min(durIngressoDi(e), fin - ini) : 0
          const vai = (ev: React.PointerEvent, modo: 'body' | 'a' | 'b') => {
            p.onSelEl(e.id)
            const i0 = ini, f0 = fin, len = fin - ini
            trascina(ev, laneEl.current, slide.durata, ds => {
              if (modo === 'body') {
                const a = Math.max(0, Math.min(slide.durata - len, r1(i0 + ds)))
                const b = r1(a + len)
                p.onTempiEl(e.id, { inizio: a, fine: b >= slide.durata - 0.05 ? undefined : b })
              } else if (modo === 'a') p.onTempiEl(e.id, { inizio: Math.max(0, Math.min(f0 - 0.5, r1(i0 + ds))) })
              else { const b = Math.max(i0 + 0.5, Math.min(slide.durata, r1(f0 + ds))); p.onTempiEl(e.id, { fine: b >= slide.durata - 0.05 ? undefined : b }) }
            })
          }
          return (
            <React.Fragment key={e.id}>
              <button type="button" className={clsx('tls__lbl tls__lbl--el', e.id === p.elId && 'tls__lbl--on', e.nascosto && 'tls__lbl--off')} onClick={() => p.onSelEl(e.id)}>
                <i className={`fa-solid fa-${TIPO_ICO[e.tipo]}`} aria-hidden="true" />
                <TruncatedText text={e.nome || (e.tipo === 'testo' ? e.testo ?? '' : TIPO_LBL[e.tipo])} className="tls__lbl-txt" />
              </button>
              <div className="tls__lane">
                <span className={clsx('tls__bar', e.id === p.elId && 'tls__bar--on', e.nascosto && 'tls__bar--off')}
                  style={{ '--a': `${(ini / slide.durata) * 100}%`, '--w': `${((fin - ini) / slide.durata) * 100}%`, '--in': `${fin > ini ? (dIn / (fin - ini)) * 100 : 0}%` } as React.CSSProperties}
                  onPointerDown={ev => vai(ev, 'body')}>
                  <span className="tls__bar-in" />
                  <span className="tls__bar-h tls__bar-h--a" onPointerDown={ev => vai(ev, 'a')} />
                  <span className="tls__bar-h tls__bar-h--b" onPointerDown={ev => vai(ev, 'b')} />
                  <span className="tls__bar-lbl">{ini.toLocaleString('it-IT')}–{fin.toLocaleString('it-IT')} s</span>
                </span>
              </div>
            </React.Fragment>
          )
        })}
        {slide.elementi.length === 0 && <span className="tls__empty">La slide è vuota: aggiungi un elemento dalla scheda Aggiungi.</span>}
        {locale >= 0 && locale <= slide.durata && <span className="tls__playhead tls__playhead--loc" style={{ '--f': locale / slide.durata } as React.CSSProperties} />}
      </div>
    </section>
  )
}
