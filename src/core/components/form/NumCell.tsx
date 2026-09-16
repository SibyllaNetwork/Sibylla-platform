import React, { useState } from 'react'

/**
 * Campo numerico per le celle di tabella.
 *
 * Il classico `<input type="number" value={n} onChange={e => set(+e.target.value || 0)}>`
 * rende la compilazione scomoda: il campo non si può mai svuotare (torna
 * subito a `0`) e digitando sopra lo zero si ottiene `05`. Qui il testo
 * digitato vive in una bozza locale finché il campo è a fuoco:
 * - al focus lo `0` sparisce (e il contenuto è comunque selezionato)
 * - il campo può restare vuoto mentre si scrive
 * - al blur si conferma il valore (vuoto → `min` o 0), con clamp e arrotondamento
 * - ↑/↓ incrementano di `step`, la rotellina non cambia più il valore per sbaglio
 */
export interface NumCellProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'min' | 'max' | 'step'> {
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  step?: number
  /** Decimali ammessi (0 = solo interi) */
  decimals?: number
}

const NumCell: React.FC<NumCellProps> = ({
  value, onChange, min, max, step = 1, decimals = 0,
  onFocus, onBlur, onKeyDown, onWheel, placeholder, ...rest
}) => {
  // Bozza locale: attiva solo mentre il campo è a fuoco
  const [draft, setDraft] = useState<string | null>(null)

  const clamp = (n: number) => {
    let v = n
    if (min !== undefined) v = Math.max(min, v)
    if (max !== undefined) v = Math.min(max, v)
    const f = 10 ** decimals
    return Math.round(v * f) / f
  }
  const parse = (s: string) => {
    const n = Number(s.replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }

  const testo = draft ?? (Number.isFinite(value) ? String(value) : '')

  return (
    <input
      {...rest}
      type="text"
      inputMode={decimals > 0 ? 'decimal' : 'numeric'}
      autoComplete="off"
      placeholder={placeholder ?? '0'}
      value={testo}
      onFocus={e => {
        // Lo 0 di partenza è solo rumore: si scrive direttamente il valore
        setDraft(value === 0 ? '' : String(value))
        e.target.select()
        onFocus?.(e)
      }}
      onChange={e => {
        const raw = e.target.value
        // Solo cifre (e separatore decimale dove ammesso), eventuale segno meno
        const ok = decimals > 0 ? /^-?\d*[.,]?\d*$/ : /^-?\d*$/
        if (!ok.test(raw)) return
        setDraft(raw)
        const n = raw === '' || raw === '-' ? null : parse(raw)
        if (n !== null) onChange(clamp(n))
      }}
      onKeyDown={e => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault()
          const base = parse(testo) ?? 0
          const n = clamp(base + (e.key === 'ArrowUp' ? step : -step))
          setDraft(String(n))
          onChange(n)
        }
        onKeyDown?.(e)
      }}
      // Rotellina sul campo a fuoco: non deve alterare il valore
      onWheel={e => { (e.target as HTMLInputElement).blur(); onWheel?.(e) }}
      onBlur={e => {
        const n = parse(e.target.value)
        onChange(clamp(n === null ? (min ?? 0) : n))
        setDraft(null)
        onBlur?.(e)
      }}
    />
  )
}

export default NumCell
