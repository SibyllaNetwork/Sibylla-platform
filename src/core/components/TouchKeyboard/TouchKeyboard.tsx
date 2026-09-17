// ─── Tastiera virtuale ────────────────────────────────────────────────────────
//  Le pagine operative (comanda, sala) girano su tablet e totem touch, dove la
//  tastiera di sistema non c'è o copre mezza schermata senza preavviso. Questa
//  compare da sé quando si tocca un campo di testo dentro il sotto-albero
//  indicato da `within`, scrive nel campo vero (evento `input` nativo, così i
//  controlli React si aggiornano) e resta chiusa altrove.
//
//  Il campo a fuoco non perde mai il fuoco: i tasti annullano il pointerdown,
//  perciò il cursore resta dov'è e la selezione si rispetta.
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import './TouchKeyboard.sass'

type Campo = HTMLInputElement | HTMLTextAreaElement

interface Props {
  /** Selettore del contenitore in cui la tastiera vale. Assente = tutta la pagina. */
  within?: string
}

/** Tipi di input che si scrivono a tastiera (gli altri — date, check — no). */
const TIPI_TESTO = ['text', 'search', 'tel', 'email', 'url', 'password', 'number', '']

const LETTERE: string[][] = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ò'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', 'à', 'è', 'ù'],
]

const SIMBOLI: string[][] = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['@', '#', '€', '%', '&', '*', '(', ')', '-', '+'],
  ['/', '=', '_', '"', '\'', ':', ';', '!', '?', '§'],
  ['.', ',', '<', '>', '[', ']', '{', '}', '°', '~'],
]

const NUMERI: string[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  [',', '0', '.'],
]

const isCampo = (el: Element | null): el is Campo => {
  if (!el) return false
  if (el.tagName === 'TEXTAREA') return true
  if (el.tagName !== 'INPUT') return false
  const t = (el as HTMLInputElement).type
  return TIPI_TESTO.includes(t)
}

/** Campo da tastierino: quantità, prezzi, numeri di camera. */
const soloNumeri = (el: Campo) =>
  el.tagName === 'INPUT'
  && ((el as HTMLInputElement).type === 'number'
    || el.inputMode === 'numeric' || el.inputMode === 'decimal')

export default function TouchKeyboard({ within }: Props) {
  const [campo, setCampo] = useState<Campo | null>(null)
  const [numerica, setNumerica] = useState(false)
  const [maiuscolo, setMaiuscolo] = useState(false)
  const [simboli, setSimboli] = useState(false)
  // inputMode originale del campo: si rimette all'uscita, perché nel frattempo
  // lo forziamo a 'none' per non far salire anche la tastiera di sistema.
  const modoPrec = useRef<string | null>(null)
  const pannello = useRef<HTMLDivElement>(null)

  const chiudi = useCallback(() => {
    if (campo && modoPrec.current !== null) campo.inputMode = modoPrec.current
    modoPrec.current = null
    setCampo(null)
    setMaiuscolo(false)
    setSimboli(false)
  }, [campo])

  // Aggancio: un campo dentro `within` prende il fuoco → la tastiera si apre
  useEffect(() => {
    const onFocus = (e: FocusEvent) => {
      const el = e.target as Element | null
      if (!isCampo(el) || el.readOnly || el.disabled) return
      if (within && !el.closest(within)) return
      // Letto prima di forzare 'none', altrimenti si perde il tipo del campo
      setNumerica(soloNumeri(el))
      modoPrec.current = el.inputMode || ''
      el.inputMode = 'none'
      setCampo(el)
      setMaiuscolo(false)
      setSimboli(false)
    }
    document.addEventListener('focusin', onFocus)
    return () => document.removeEventListener('focusin', onFocus)
  }, [within])

  // Il fuoco che se ne va (o l'Esc) chiude: i tasti non tolgono il fuoco al campo
  useEffect(() => {
    if (!campo) return
    const onBlur = () => { if (document.activeElement !== campo) chiudi() }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') chiudi() }
    campo.addEventListener('blur', onBlur)
    window.addEventListener('keydown', onEsc)
    return () => {
      campo.removeEventListener('blur', onBlur)
      window.removeEventListener('keydown', onEsc)
    }
  }, [campo, chiudi])

  // Quanto spazio toglie la tastiera: le modali si accorciano di conseguenza,
  // così il loro piede resta raggiungibile mentre si scrive.
  useLayoutEffect(() => {
    const b = document.body
    if (!campo) { b.classList.remove('has-tkb'); return }
    b.classList.add('has-tkb')
    const h = pannello.current?.offsetHeight ?? 0
    document.documentElement.style.setProperty('--tkb-h', `${h}px`)
    // Solo ora il contenitore ha l'altezza definitiva: il campo si rimette in vista
    requestAnimationFrame(() => campo.scrollIntoView({ block: 'center', behavior: 'smooth' }))
    return () => { b.classList.remove('has-tkb') }
  }, [campo])

  if (!campo) return null

  /** Scrive nel campo vero: setter nativo + evento `input`, così React se ne accorge. */
  const scrivi = (valore: string, cursore: number) => {
    const proto = campo.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(campo, valore)
    campo.dispatchEvent(new Event('input', { bubbles: true }))
    requestAnimationFrame(() => {
      campo.focus()
      try { campo.setSelectionRange(cursore, cursore) } catch { /* number input: niente cursore */ }
    })
  }

  const selezione = () => {
    const v = campo.value ?? ''
    let da = campo.selectionStart, a = campo.selectionEnd
    if (da == null || a == null) { da = v.length; a = v.length }   // input number
    return { v, da, a }
  }

  const digita = (t: string) => {
    const { v, da, a } = selezione()
    scrivi(v.slice(0, da) + t + v.slice(a), da + t.length)
    if (maiuscolo) setMaiuscolo(false)
  }

  const cancella = () => {
    const { v, da, a } = selezione()
    if (da !== a) { scrivi(v.slice(0, da) + v.slice(a), da); return }
    if (!da) return
    scrivi(v.slice(0, da - 1) + v.slice(da), da - 1)
  }

  const svuota = () => scrivi('', 0)

  const invio = () => {
    if (campo.tagName === 'TEXTAREA') { digita('\n'); return }
    campo.form?.requestSubmit?.()
    chiudi()
    campo.blur()
  }

  const righe = numerica ? NUMERI : simboli ? SIMBOLI : LETTERE
  const etichetta = campo.getAttribute('aria-label')
    || campo.getAttribute('placeholder')
    || campo.labels?.[0]?.textContent
    || 'Campo di testo'

  // I tasti non devono rubare il fuoco: senza questo il campo si chiuderebbe
  const tieniFuoco = (e: React.PointerEvent) => e.preventDefault()

  return (
    <div ref={pannello} className={`tkb ${numerica ? 'tkb--num' : ''}`} role="group" aria-label="Tastiera virtuale">
      {/* Se la tastiera copre il campo, qui si legge comunque cosa si sta scrivendo */}
      <div className="tkb__testa">
        <span className="tkb__campo">{etichetta}</span>
        <span className="tkb__valore">{campo.value || <em>vuoto</em>}</span>
        <button type="button" className="tkb__chiudi" onPointerDown={tieniFuoco} onClick={() => { chiudi(); campo.blur() }}>
          <i className="fa-solid fa-angles-down" aria-hidden="true" /> Chiudi
        </button>
      </div>

      <div className="tkb__righe">
        {righe.map((riga, i) => (
          <div className="tkb__riga" key={i}>
            {/* Maiuscolo sulla riga delle lettere basse, com'è su ogni tastiera */}
            {!numerica && !simboli && i === 3 && (
              <button
                type="button" className={`tkb__tasto tkb__tasto--mod ${maiuscolo ? 'is-on' : ''}`}
                onPointerDown={tieniFuoco} onClick={() => setMaiuscolo(m => !m)}
                aria-label="Maiuscolo" aria-pressed={maiuscolo}
              >
                <i className="fa-solid fa-up-long" aria-hidden="true" />
              </button>
            )}
            {riga.map(t => (
              <button
                key={t} type="button" className="tkb__tasto"
                onPointerDown={tieniFuoco}
                onClick={() => digita(maiuscolo ? t.toUpperCase() : t)}
              >{maiuscolo ? t.toUpperCase() : t}</button>
            ))}
            {i === 3 && (
              <button
                type="button" className="tkb__tasto tkb__tasto--mod"
                onPointerDown={tieniFuoco} onClick={cancella} aria-label="Cancella"
              >
                <i className="fa-solid fa-delete-left" aria-hidden="true" />
              </button>
            )}
          </div>
        ))}

        <div className="tkb__riga tkb__riga--fondo">
          {!numerica && (
            <button
              type="button" className={`tkb__tasto tkb__tasto--mod ${simboli ? 'is-on' : ''}`}
              onPointerDown={tieniFuoco} onClick={() => setSimboli(s => !s)}
            >{simboli ? 'abc' : '123'}</button>
          )}
          <button
            type="button" className="tkb__tasto tkb__tasto--mod"
            onPointerDown={tieniFuoco} onClick={svuota} aria-label="Svuota il campo"
          >
            <i className="fa-solid fa-eraser" aria-hidden="true" />
          </button>
          {!numerica && (
            <button
              type="button" className="tkb__tasto tkb__tasto--spazio"
              onPointerDown={tieniFuoco} onClick={() => digita(' ')} aria-label="Spazio"
            >spazio</button>
          )}
          <button
            type="button" className="tkb__tasto tkb__tasto--invio"
            onPointerDown={tieniFuoco} onClick={invio}
          >
            <i className="fa-solid fa-turn-down-left" aria-hidden="true" />
            {campo.tagName === 'TEXTAREA' ? 'A capo' : 'Fine'}
          </button>
        </div>
      </div>
    </div>
  )
}
