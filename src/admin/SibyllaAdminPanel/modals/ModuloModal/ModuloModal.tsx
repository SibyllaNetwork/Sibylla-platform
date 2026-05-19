import React from 'react'
import Modal from '../../../../core/components/Modal'
import Ico from '../../../../core/icons/Ico'
import MENU from '../../../../navigation/menu'
import MenuTree from '../../MenuTree/MenuTree'
import { ALL_PAGES } from '../../constants'
import { getAllPages } from '../../helpers'
import type { Modulo, ModuloForm } from '../../types'
import './ModuloModal.sass'

interface Props {
  open: boolean
  editing: Modulo | null
  form: ModuloForm
  setForm: (f: ModuloForm) => void
  onClose: () => void
  onConfirm: () => void
}

export default function ModuloModal({ open, editing, form, setForm, onClose, onConfirm }: Props) {
  const disabled = !form.nome.trim() || form.pagesSet.size === 0

  const togglePage = (pageId: string) => {
    const s = new Set(form.pagesSet)
    s.has(pageId) ? s.delete(pageId) : s.add(pageId)
    setForm({ ...form, pagesSet: s })
  }
  const toggleGroup = (children: any[]) => {
    const pages = getAllPages(children)
    const s = new Set(form.pagesSet)
    const allOn = pages.every(pg => s.has(pg))
    pages.forEach(pg => allOn ? s.delete(pg) : s.add(pg))
    setForm({ ...form, pagesSet: s })
  }

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="mod-modal">
        <div className="mod-modal__head">
          <div>
            <h2 className="mod-modal__title">{editing ? 'Modifica modulo' : 'Nuovo modulo'}</h2>
            <p className="mod-modal__sub">Configura nome, descrizione e seleziona le pagine da includere</p>
          </div>
          <button className="mod-modal__close" onClick={onClose} aria-label="Chiudi">
            <Ico n="x" s={18} c="var(--color-text-disabled)" />
          </button>
        </div>

        <div className="mod-modal__row">
          <div>
            <label className="mod-modal__label">Nome modulo *</label>
            <input
              value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
              placeholder="Es. Sales Base"
              className="sib-input"
            />
          </div>
          <div>
            <label className="mod-modal__label">Descrizione</label>
            <input
              value={form.desc}
              onChange={e => setForm({ ...form, desc: e.target.value })}
              placeholder="Breve descrizione"
              className="sib-input"
            />
          </div>
        </div>

        <div className="mod-modal__pages-head">
          <div className="mod-modal__pages-title">
            Seleziona pagine <span className="mod-modal__pages-count">({form.pagesSet.size} selezionate)</span>
          </div>
          <div className="mod-modal__pages-actions">
            <button
              className="mod-modal__sel-btn mod-modal__sel-btn--all"
              onClick={() => setForm({ ...form, pagesSet: new Set(ALL_PAGES) })}
            >
              Seleziona tutto
            </button>
            <button
              className="mod-modal__sel-btn"
              onClick={() => setForm({ ...form, pagesSet: new Set() })}
            >
              Deseleziona tutto
            </button>
          </div>
        </div>

        <div className="mod-modal__tree-wrap">
          <MenuTree
            items={MENU as any[]}
            selected={form.pagesSet}
            onTogglePage={togglePage}
            onToggleGroup={toggleGroup}
          />
        </div>

        <div className="mod-modal__actions">
          <button className="sib-btn sib-btn--toolbar" onClick={onClose}>Annulla</button>
          <button className="sib-btn sib-btn--primary" disabled={disabled} onClick={onConfirm}>
            {editing ? 'Aggiorna modulo' : 'Crea modulo'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
