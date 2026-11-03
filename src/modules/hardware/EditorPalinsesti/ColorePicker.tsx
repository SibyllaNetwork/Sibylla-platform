import React, { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { HexColorInput, HexColorPicker } from 'react-colorful'
import Tooltip from '../../../core/components/Tooltip'
import { COLORI_BASE } from './editorModel'
import './ColorePicker.sass'

/**
 * Selettore colore dell'Editor palinsesti: prima i colori del marchio dello spot,
 * poi quelli di base, e un colore libero (ruota + codice esadecimale).
 */
interface Props {
  label: string
  value?: string
  onChange: (v: string | undefined) => void
  palette?: string[]
  /** Mostra l'opzione "nessuno" (trasparente). */
  nessuno?: boolean
}

/** Palette del marchio: quadratini da cliccare per cambiarli, + per aggiungerne. */
export function PaletteMarchio({ colori, onChange }: { colori: string[]; onChange: (c: string[]) => void }) {
  const [aperto, setAperto] = useState<number | null>(null)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (aperto == null) return
    const fuori = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setAperto(null) }
    document.addEventListener('mousedown', fuori)
    return () => document.removeEventListener('mousedown', fuori)
  }, [aperto])
  const set = (i: number, c: string) => onChange(colori.map((x, k) => k === i ? c.toUpperCase() : x))
  return (
    <div className="cpk" ref={box}>
      <div className="cpk__row">
        {colori.map((c, i) => (
          <Tooltip key={i} text={`${c.toUpperCase()} · clicca per cambiarlo`}>
            <button type="button" aria-label={`Colore ${i + 1}`} className={clsx('cpk__sw cpk__sw--brand cpk__sw--lg', aperto === i && 'cpk__sw--on')}
              style={{ '--sw': c } as React.CSSProperties} onClick={() => setAperto(aperto === i ? null : i)} />
          </Tooltip>
        ))}
        {colori.length < 8 && (
          <Tooltip text="Aggiungi un colore">
            <button type="button" aria-label="Aggiungi colore" className="cpk__sw cpk__sw--brand cpk__sw--lg cpk__sw--add" onClick={() => { onChange([...colori, '#204769']); setAperto(colori.length) }}><i className="fa-solid fa-plus" aria-hidden="true" /></button>
          </Tooltip>
        )}
      </div>
      {aperto != null && colori[aperto] && (
        <div className="cpk__pop">
          <HexColorPicker color={colori[aperto]} onChange={c => set(aperto, c)} />
          <HexColorInput color={colori[aperto]} onChange={c => set(aperto, c)} prefixed className="cpk__hex" aria-label={`Codice del colore ${aperto + 1}`} />
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => { onChange(colori.filter((_, k) => k !== aperto)); setAperto(null) }}><i className="fa-solid fa-trash-can" aria-hidden="true" /> Togli dalla palette</button>
        </div>
      )}
    </div>
  )
}

export default function ColorePicker({ label, value, onChange, palette = [], nessuno }: Props) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const fuori = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', fuori)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fuori); document.removeEventListener('keydown', esc) }
  }, [open])

  const v = value?.toUpperCase()
  const marchio = Array.from(new Set(palette.map(c => c.toUpperCase())))
  const base = COLORI_BASE.filter(c => !marchio.includes(c)).slice(0, Math.max(4, 11 - marchio.length))
  const libero = !!v && v.startsWith('#') && !marchio.includes(v) && !base.includes(v)

  const sw = (c: string, tipo: 'marchio' | 'base') => (
    <Tooltip key={`${tipo}-${c}`} text={tipo === 'marchio' ? `${c} · colore del marchio` : c}>
      <button type="button" aria-label={c} className={clsx('cpk__sw', tipo === 'marchio' && 'cpk__sw--brand', v === c && 'cpk__sw--on')}
        style={{ '--sw': c } as React.CSSProperties} onClick={() => onChange(c)} />
    </Tooltip>
  )

  return (
    <div className="cpk" ref={box}>
      <span className="cpk__lbl">{label}</span>
      <div className="cpk__row">
        {nessuno && (
          <Tooltip text="Nessuno">
            <button type="button" aria-label="Nessuno" className={clsx('cpk__sw cpk__sw--none', !value && 'cpk__sw--on')} onClick={() => onChange(undefined)} />
          </Tooltip>
        )}
        {marchio.map(c => sw(c, 'marchio'))}
        {marchio.length > 0 && <span className="cpk__sep" />}
        {base.map(c => sw(c, 'base'))}
        <Tooltip text="Colore libero">
          <button type="button" aria-label="Colore libero" aria-expanded={open} className={clsx('cpk__sw cpk__sw--custom', libero && 'cpk__sw--on')}
            style={libero ? { '--sw': v } as React.CSSProperties : undefined} onClick={() => setOpen(o => !o)}>
            {!libero && <i className="fa-solid fa-plus" aria-hidden="true" />}
          </button>
        </Tooltip>
      </div>
      {open && (
        <div className="cpk__pop">
          <HexColorPicker color={value && value.startsWith('#') ? value : '#FFFFFF'} onChange={c => onChange(c.toUpperCase())} />
          <HexColorInput color={value && value.startsWith('#') ? value : '#FFFFFF'} onChange={c => onChange(c.toUpperCase())} prefixed className="cpk__hex" aria-label={`Codice colore ${label}`} />
        </div>
      )}
    </div>
  )
}
