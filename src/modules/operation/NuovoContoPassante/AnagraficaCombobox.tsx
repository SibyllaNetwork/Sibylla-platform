import React, { useState, useRef, useMemo, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import './AnagraficaCombobox.sass'

export interface Anagrafica {
  id: string
  nome: string      // etichetta principale (nominativo / ragione sociale)
  sub?: string      // sottotitolo: segmento, città o P.IVA
}

interface Props {
  tipo: 'cliente' | 'agenzia'
  items: Anagrafica[]
  value: Anagrafica | null
  onSelect: (a: Anagrafica) => void
  onClear: () => void
  onCreate: () => void
  label?: string
}

// Combobox con ricerca live sulle anagrafiche. Quando la ricerca non trova
// corrispondenze mostra la voce "Crea anagrafica {tipo}" che apre la modale
// di creazione (onCreate). Il dropdown è reso in un portale (position:fixed)
// per non essere tagliato dall'overflow:hidden della card contenitrice.
export default function AnagraficaCombobox({
  tipo, items, value, onSelect, onClear, onCreate, label = 'Nominativo',
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const tipoLabel = tipo === 'agenzia' ? 'agenzia' : 'cliente'

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (a) => a.nome.toLowerCase().includes(q) || (a.sub?.toLowerCase().includes(q) ?? false),
    )
  }, [items, query])

  const reposition = useCallback(() => {
    const trig = wrapRef.current
    if (!trig) return
    const r = trig.getBoundingClientRect()
    const gap = 4
    const popH = popRef.current?.offsetHeight ?? 300
    const vh = window.innerHeight
    let top = r.bottom + gap
    if (top + popH > vh - 8 && r.top - gap - popH > 8) top = r.top - gap - popH
    setPos({ top, left: r.left, width: r.width })
  }, [])

  useLayoutEffect(() => {
    if (!open) { setPos(null); return }
    reposition()
    const onScroll = () => reposition()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open, matches.length, reposition])

  // Chiusura su click esterno. Niente overlay che copra l'input (altrimenti
  // non si potrebbe più digitare/cliccare nel campo di ricerca): si ascolta il
  // mousedown sul document e si ignora ciò che è dentro l'input o il dropdown.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (wrapRef.current?.contains(t) || popRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const handleSelect = (a: Anagrafica) => {
    onSelect(a)
    setQuery('')
    setOpen(false)
  }

  const handleCreate = () => {
    setOpen(false)
    onCreate()
  }

  return (
    <div className="anag-cb__field">
      <label className="anag-cb__label">{label}</label>

      {value ? (
        // Anagrafica selezionata: chip con nome + rimozione
        <div className="anag-cb__chip">
          <i className={`fa-light ${tipo === 'agenzia' ? 'fa-building' : 'fa-user'} anag-cb__chip-ico`} aria-hidden="true" />
          <span className="anag-cb__chip-text">
            <span className="anag-cb__chip-name">{value.nome}</span>
            {value.sub && <span className="anag-cb__chip-sub">{value.sub}</span>}
          </span>
          <button type="button" className="anag-cb__chip-x" aria-label="Rimuovi selezione" onClick={onClear}>
            <i className="fa-light fa-xmark" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div ref={wrapRef} className="anag-cb__control">
          <i className="fa-light fa-magnifying-glass anag-cb__search-ico" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            className="sib-input anag-cb__input"
            placeholder={tipo === 'agenzia' ? 'Cerca agenzia…' : 'Cerca cliente…'}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            autoComplete="off"
          />

          {open && createPortal(
            <>
              <div
                ref={popRef}
                className="anag-cb__pop"
                style={{
                  top: pos?.top ?? -9999,
                  left: pos?.left ?? -9999,
                  width: pos?.width,
                  visibility: pos ? 'visible' : 'hidden',
                }}
              >
                {matches.length > 0 ? (
                  <ul className="anag-cb__list" role="listbox">
                    {matches.map((a) => (
                      <li key={a.id}>
                        <button type="button" role="option" aria-selected={false} className="anag-cb__opt" onClick={() => handleSelect(a)}>
                          <i className={`fa-light ${tipo === 'agenzia' ? 'fa-building' : 'fa-user'} anag-cb__opt-ico`} aria-hidden="true" />
                          <span className="anag-cb__opt-text">
                            <span className="anag-cb__opt-name">{a.nome}</span>
                            {a.sub && <span className="anag-cb__opt-sub">{a.sub}</span>}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="anag-cb__empty">
                    <i className="fa-light fa-user-magnifying-glass anag-cb__empty-ico" aria-hidden="true" />
                    <p className="anag-cb__empty-txt">
                      Nessun{tipo === 'agenzia' ? "'agenzia" : ' cliente'} trovato{query.trim() ? <> per “<strong>{query.trim()}</strong>”</> : null}.
                    </p>
                  </div>
                )}

                {/* Voce SEMPRE presente in fondo alla select */}
                <button type="button" className="anag-cb__create" onClick={handleCreate}>
                  <i className="fa-light fa-circle-plus" aria-hidden="true" /> Crea anagrafica {tipoLabel}
                </button>
              </div>
            </>,
            document.body,
          )}
        </div>
      )}
    </div>
  )
}
