// ─── Categorie menu (Food & Beverage) ─────────────────────────────────────────
//  Il secondo livello del catalogo. L'ordine conta davvero: è la sequenza delle
//  tessere nel POS, e un cameriere che cerca "Dessert" in fondo perde secondi a
//  ogni tavolo. Per questo la pagina è un elenco riordinabile, con l'anteprima
//  della tessera così com'è in comanda.
import React, { useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import FilterToolbar from '../../../../core/components/FilterToolbar'
import Tooltip from '../../../../core/components/Tooltip'
import TruncatedText from '../../../../core/components/TruncatedText'
import Modal from '../../../../core/components/Modal'
import { InputField, SelectField } from '../../../../core/components/form'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import { toast } from '../../../../core/components/Toast/useToast'
import { useFbStore } from '../../../../store/useFbStore'
import type { CategoriaMenu } from '../fb.model'
import './FbCategorie.sass'

const COLORI = [
  '#D9822B', '#C4722A', '#B5522F', '#2E9E5B', '#B03A48', '#4E9BD1', '#2E86C1',
  '#1B4F72', '#7C4D9E', '#6C3483', '#922B21', '#B7950B', '#CD6155', '#D4AC0D',
]
const EMOJI = ['🥗', '🍝', '🥩', '🥦', '🍰', '🥤', '🍺', '🍷', '🍸', '🥃', '🥂', '🌸', '🍾', '🍕', '🐟', '☕️']

const vuoto = (tipoId: number): CategoriaMenu => ({
  id: 0, tipoId, nome: '', emoji: '🍽️', colore: COLORI[0], ordine: 0,
})

export default function FbCategorie({ navigate }: { navigate?: (p: string) => void }) {
  const tipi      = useFbStore(s => s.tipiMenu)
  const categorie = useFbStore(s => s.categorie)
  const voci      = useFbStore(s => s.voci)
  const salva     = useFbStore(s => s.salvaCategoria)
  const elimina   = useFbStore(s => s.eliminaCategoria)
  const ordina    = useFbStore(s => s.ordinaCategorie)
  const confirm   = useConfirmStore(s => s.confirm)

  const [tipoId, setTipoId] = useState<number | 'tutti'>('tutti')
  const [form, setForm] = useState<CategoriaMenu | null>(null)

  const righe = useMemo(
    () => categorie
      .filter(c => tipoId === 'tutti' || c.tipoId === tipoId)
      .slice()
      .sort((a, b) => a.ordine - b.ordine),
    [categorie, tipoId],
  )

  /** Sposta una categoria di un posto e riscrive la sequenza per intero. */
  const sposta = (id: number, verso: -1 | 1) => {
    const seq = categorie.slice().sort((a, b) => a.ordine - b.ordine).map(c => c.id)
    const i = seq.indexOf(id)
    const j = i + verso
    if (i < 0 || j < 0 || j >= seq.length) return
    seq.splice(j, 0, ...seq.splice(i, 1))
    ordina(seq)
  }

  const chiediElimina = async (c: CategoriaMenu) => {
    const dentro = voci.filter(v => v.categoriaId === c.id).length
    const ok = await confirm({
      message: dentro
        ? `Eliminare la categoria “${c.nome}”? Restano senza categoria ${dentro} ${dentro === 1 ? 'voce' : 'voci'} di menu.`
        : `Eliminare la categoria “${c.nome}”?`,
      confirmLabel: 'Elimina',
    })
    if (ok) { elimina(c.id); toast.info('Categoria eliminata') }
  }

  const conferma = () => {
    if (!form) return
    if (!form.nome.trim()) { toast.warning('Manca il nome della categoria'); return }
    salva(form)
    toast.success(form.id ? 'Categoria aggiornata' : `Categoria “${form.nome}” creata`)
    setForm(null)
  }

  return (
    <div className="fbcat">
      <PageHead
        title="Categorie menu"
        subtitle="Come è ordinato il catalogo nelle tessere della comanda"
        actions={
          <button
            type="button" className="fbcat__head-btn"
            onClick={() => setForm(vuoto(tipoId === 'tutti' ? (tipi[0]?.id ?? 1) : tipoId))}
          >
            <i className="fa-solid fa-plus" aria-hidden="true" /> Nuova categoria
          </button>
        }
      />

      <FilterToolbar className="fbcat__bar">
        <SelectField
          name="tipo" label="Tipo menu" className="fbcat__f"
          value={tipoId}
          options={[{ value: 'tutti', label: 'Tutti i tipi' }, ...tipi.map(t => ({ value: t.id, label: t.nome }))]}
          onChange={e => setTipoId(e.target.value === 'tutti' ? 'tutti' : +e.target.value)}
        />
        <button type="button" className="fbcat__link" onClick={() => navigate?.('fb-voci-menu')}>
          <i className="fa-solid fa-plate-utensils" aria-hidden="true" /> Vai alle voci di menu
        </button>
      </FilterToolbar>

      <div className="sib-table-wrap">
        <table className="sib-table fbcat__table">
          <colgroup>
            <col className="fbcat__c-ord" /><col className="fbcat__c-nome" />
            <col className="fbcat__c-tipo" /><col className="fbcat__c-voci" />
            <col className="fbcat__c-prev" /><col className="fbcat__c-act" />
          </colgroup>
          <thead>
            <tr>
              <th>Ordine</th>
              <th>Categoria</th>
              <th>Tipo menu</th>
              <th>Voci</th>
              <th>Come appare in comanda</th>
              <th className="fbcat__c-act" aria-label="Azioni" />
            </tr>
          </thead>
          <tbody>
            {righe.map((c, i) => {
              const tipo = tipi.find(t => t.id === c.tipoId)
              const n = voci.filter(v => v.categoriaId === c.id).length
              return (
                <tr key={c.id}>
                  <td>
                    <span className="fbcat__ord">
                      <button
                        type="button" aria-label="Sposta in su"
                        disabled={i === 0} onClick={() => sposta(c.id, -1)}
                      >
                        <i className="fa-solid fa-chevron-up" />
                      </button>
                      <span>{c.ordine}</span>
                      <button
                        type="button" aria-label="Sposta in giù"
                        disabled={i === righe.length - 1} onClick={() => sposta(c.id, 1)}
                      >
                        <i className="fa-solid fa-chevron-down" />
                      </button>
                    </span>
                  </td>
                  <td>
                    <span className="fbcat__nome">
                      <span className="fbcat__emoji">{c.emoji}</span>
                      <TruncatedText text={c.nome} />
                    </span>
                  </td>
                  <td><TruncatedText text={tipo?.nome ?? '—'} /></td>
                  <td className="fbcat__num">{n}</td>
                  <td>
                    <span className="fbcat__tessera" style={{ '--cat': c.colore } as React.CSSProperties}>
                      <TruncatedText text={c.nome} />
                      <em>{c.emoji}</em>
                    </span>
                  </td>
                  <td className="fbcat__act">
                    <button type="button" aria-label="Modifica la categoria" onClick={() => setForm({ ...c })}>
                      <Tooltip text="Modifica"><i className="fa-solid fa-pen" /></Tooltip>
                    </button>
                    <button type="button" aria-label="Elimina la categoria" onClick={() => chiediElimina(c)}>
                      <Tooltip text="Elimina"><i className="fa-solid fa-trash" /></Tooltip>
                    </button>
                  </td>
                </tr>
              )
            })}
            {!righe.length && (
              <tr><td colSpan={6} className="fbcat__vuoto">Nessuna categoria per questo tipo.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? `Categoria — ${form.nome}` : 'Nuova categoria'}
        size="md"
      >
        {form && (
          <div className="fbcat-form">
            <div className="fbcat-form__row">
              <InputField
                name="nome" label="Nome" className="fbcat-form__grow" value={form.nome}
                placeholder="es. Antipasti"
                onChange={e => setForm(f => f && ({ ...f, nome: e.target.value }))}
              />
              <SelectField
                name="tipo" label="Tipo menu" value={form.tipoId}
                options={tipi.map(t => ({ value: t.id, label: t.nome }))}
                onChange={e => setForm(f => f && ({ ...f, tipoId: +e.target.value }))}
              />
            </div>

            <div className="fbcat-form__blk">
              <span className="fbcat-form__lab">Icona</span>
              <div className="fbcat-form__emoji">
                {EMOJI.map(em => (
                  <button
                    key={em} type="button"
                    className={`fbcat-form__em ${em === form.emoji ? 'is-on' : ''}`}
                    onClick={() => setForm(f => f && ({ ...f, emoji: em }))}
                  >{em}</button>
                ))}
              </div>
            </div>

            <div className="fbcat-form__blk">
              <span className="fbcat-form__lab">Colore della tessera</span>
              <div className="fbcat-form__colori">
                {COLORI.map(c => (
                  <button
                    key={c} type="button"
                    className={`fbcat-form__colore ${c === form.colore ? 'is-on' : ''}`}
                    style={{ '--c': c } as React.CSSProperties}
                    aria-label={`Colore ${c}`}
                    onClick={() => setForm(f => f && ({ ...f, colore: c }))}
                  />
                ))}
              </div>
            </div>

            <div className="fbcat-form__anteprima">
              <span className="fbcat-form__lab">Anteprima</span>
              <span className="fbcat__tessera fbcat__tessera--grande" style={{ '--cat': form.colore } as React.CSSProperties}>
                {form.nome || 'Nome categoria'}
                <em>{form.emoji}</em>
              </span>
            </div>

            <footer className="fbcat-form__foot">
              <button type="button" className="fbcat-form__annulla" onClick={() => setForm(null)}>Annulla</button>
              <button type="button" className="fbcat-form__ok" onClick={conferma}>
                <i className="fa-solid fa-check" aria-hidden="true" /> {form.id ? 'Salva' : 'Crea la categoria'}
              </button>
            </footer>
          </div>
        )}
      </Modal>
    </div>
  )
}
