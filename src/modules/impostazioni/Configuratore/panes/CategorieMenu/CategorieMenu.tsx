import React, { useMemo, useState } from 'react'
import { CfgToolbar, CfgTable } from '../../../../../core/cfg'
import { SelectField, InputField } from '../../../../../core/components/form'
import Modal from '../../../../../core/components/Modal'
import Tooltip from '../../../../../core/components/Tooltip'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { toast } from '../../../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import {
  useCategorieMenuStore,
  categorieOrdinate,
  categoriaOmonima,
  ordineOccupato,
  prossimoOrdine,
  tipoMenuMeta,
  TIPI_MENU,
  COLORI_CATEGORIA,
  EMOJI_CATEGORIA,
  type CategoriaMenu,
  type TipoMenu,
} from '../../../../../store/useCategorieMenuStore'
import './CategorieMenu.sass'

// ─── CATEGORIE MENU (F&B) ─────────────────────────────────────────────────────
//  Elenco delle categorie con cui sono raggruppate le voci di menu: ognuna ha
//  un tipo di menu (Bar / Cantina / Ristorante / Lounge), una posizione
//  (`ordine`), un'emoji e un colore. Il colore si sceglie SOLO tra i token della
//  palette validata (`var(--chart-1)` … `var(--chart-8)`): così la pastiglia
//  resta coerente col resto della piattaforma e funziona anche in dark mode.
//  Creazione e modifica passano dalla stessa modale.

const PANE_ID = 'fb-categorie'

const FILTRO_TUTTI = 'tutti'

interface CategoriaForm {
  nome: string
  tipo: TipoMenu
  ordine: string
  emoji: string
  colore: string
}

export default function CategorieMenu() {
  const categorie       = useCategorieMenuStore(s => s.categorie)
  const addCategoria    = useCategorieMenuStore(s => s.addCategoria)
  const updateCategoria = useCategorieMenuStore(s => s.updateCategoria)
  const removeCategoria = useCategorieMenuStore(s => s.removeCategoria)
  const confirm         = useConfirmStore(s => s.confirm)
  const setCompletion   = useConfiguratoreStore(s => s.setCompletion)

  const [filtroTipo, setFiltroTipo] = useState<TipoMenu | typeof FILTRO_TUTTI>(FILTRO_TUTTI)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<CategoriaForm>({
    nome: '', tipo: 'ristorante', ordine: '0', emoji: EMOJI_CATEGORIA[0], colore: COLORI_CATEGORIA[0],
  })

  const righe = useMemo(() => {
    const ordinate = categorieOrdinate(categorie)
    return filtroTipo === FILTRO_TUTTI ? ordinate : ordinate.filter(c => c.tipo === filtroTipo)
  }, [categorie, filtroTipo])

  const upd = <K extends keyof CategoriaForm>(k: K, v: CategoriaForm[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const apriNuovo = () => {
    setEditId(null)
    setForm({
      nome: '',
      tipo: filtroTipo === FILTRO_TUTTI ? 'ristorante' : filtroTipo,
      ordine: String(prossimoOrdine(categorie)),
      emoji: EMOJI_CATEGORIA[0],
      colore: COLORI_CATEGORIA[0],
    })
    setModalOpen(true)
  }

  const apriModifica = (c: CategoriaMenu) => {
    setEditId(c.id)
    setForm({
      nome: c.nome, tipo: c.tipo, ordine: String(c.ordine),
      emoji: c.emoji, colore: c.colore,
    })
    setModalOpen(true)
  }

  // Validazione: nome obbligatorio e non già usato da un'altra categoria.
  // L'ordine ripetuto è solo un avviso (l'elenco resta deterministico).
  const nome = form.nome.trim()
  const ordine = Math.max(0, parseInt(form.ordine, 10) || 0)
  const omonima  = categoriaOmonima(categorie, nome, editId)
  const stessoOrdine = ordineOccupato(categorie, form.tipo, ordine, editId)
  const salvabile = !!nome && !omonima

  const salva = () => {
    if (!salvabile) return
    const dati = { nome, tipo: form.tipo, ordine, emoji: form.emoji, colore: form.colore }
    if (editId) {
      updateCategoria(editId, dati)
      toast.success(`Categoria «${nome}» aggiornata`)
    } else {
      addCategoria(dati)
      toast.success(`Categoria «${nome}» creata`)
    }
    setCompletion(PANE_ID, 'configured')
    setModalOpen(false)
  }

  const elimina = async (c: CategoriaMenu) => {
    const ok = await confirm({
      title: 'Elimina categoria',
      message: `Eliminare la categoria «${c.nome}» del menu ${tipoMenuMeta(c.tipo).label}? Le voci di menu che la usano resteranno senza categoria.`,
      confirmLabel: 'Elimina', danger: true,
    })
    if (!ok) return
    removeCategoria(c.id)
    toast.success('Categoria eliminata')
  }

  return (
    <div className="categorie-menu">
      <CfgToolbar
        actions={(
          <button type="button" className="sib-btn sib-btn--primary" onClick={apriNuovo}>
            <i className="fa-solid fa-plus" aria-hidden="true" />
            Nuova categoria
          </button>
        )}
      >
        <SelectField
          name="filtro-tipo"
          label="Tipo menu"
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value as TipoMenu | typeof FILTRO_TUTTI)}
          options={[
            { value: FILTRO_TUTTI, label: 'Tutti i tipi' },
            ...TIPI_MENU.map(t => ({ value: t.id, label: t.label })),
          ]}
        />
      </CfgToolbar>

      <CfgTable
        columns={[
          { key: 'emoji',  label: <span className="sr-only">Icona</span>, width: '6%', align: 'center' },
          { key: 'nome',   label: 'Nome',   width: '42%' },
          { key: 'tipo',   label: 'Tipo',   width: '22%' },
          { key: 'ordine', label: 'Ordine', width: '14%', align: 'right' },
          { key: 'azioni', label: 'Azioni', width: '16%', align: 'right' },
        ]}
        empty={(
          <span>
            {filtroTipo === FILTRO_TUTTI
              ? 'Nessuna categoria configurata: creane una con «Nuova categoria».'
              : `Nessuna categoria per il menu ${tipoMenuMeta(filtroTipo as TipoMenu).label}.`}
          </span>
        )}
      >
        {righe.map(c => (
          <tr key={c.id}>
            <td className="categorie-menu__td-emoji">
              <span className="categorie-menu__emoji" role="img" aria-label={`Icona di ${c.nome}`}>
                {c.emoji}
              </span>
            </td>
            <td>
              {/* --cat-c: colore della categoria (token della palette validata),
                  passato come custom property e letto dal .sass */}
              <span
                className="categorie-menu__pill"
                style={{ ['--cat-c' as any]: c.colore }}
              >
                <span className="categorie-menu__pill-dot" aria-hidden="true" />
                <TruncatedText text={c.nome} className="categorie-menu__pill-text" />
              </span>
            </td>
            <td className="categorie-menu__td-tipo">{tipoMenuMeta(c.tipo).label}</td>
            <td className="categorie-menu__td-num">{c.ordine}</td>
            <td className="categorie-menu__td-azioni">
              <Tooltip content="Modifica categoria">
                <button
                  type="button"
                  className="sib-btn sib-btn--icon"
                  onClick={() => apriModifica(c)}
                  aria-label={`Modifica la categoria ${c.nome}`}
                >
                  <i className="fa-solid fa-pen" />
                </button>
              </Tooltip>
              <Tooltip content="Elimina categoria">
                <button
                  type="button"
                  className="sib-btn sib-btn--icon"
                  onClick={() => elimina(c)}
                  aria-label={`Elimina la categoria ${c.nome}`}
                >
                  <i className="fa-solid fa-trash" />
                </button>
              </Tooltip>
            </td>
          </tr>
        ))}
      </CfgTable>

      <p className="categorie-menu__nota">
        <i className="fa-light fa-circle-info" aria-hidden="true" />
        L'ordine è la posizione della categoria dentro il suo menu (0 = prima):
        vale per il menu stampato, per i monitor e per il web menu. I colori sono
        quelli della palette Sibylla, così le pastiglie restano leggibili in chiaro e in scuro.
      </p>

      {modalOpen && (
        <Modal
          open
          onClose={() => setModalOpen(false)}
          title={editId ? 'Modifica categoria' : 'Nuova categoria'}
          size="md"
        >
          <div className="categorie-menu__form">
            <div className="categorie-menu__form-grid">
              <InputField
                className="categorie-menu__form-full"
                name="nome"
                label="Nome categoria"
                required
                value={form.nome}
                placeholder="es. Antipasti"
                onChange={(e) => upd('nome', e.target.value)}
              />
              <SelectField
                name="tipo"
                label="Tipo menu"
                value={form.tipo}
                onChange={(e) => upd('tipo', e.target.value as TipoMenu)}
                options={TIPI_MENU.map(t => ({ value: t.id, label: t.label }))}
              />
              <InputField
                name="ordine"
                label="Ordine nel menu"
                type="number"
                min={0}
                value={form.ordine}
                onChange={(e) => upd('ordine', e.target.value)}
              />
            </div>

            <div className="categorie-menu__picker">
              <span className="categorie-menu__picker-label" id="cat-emoji-label">Icona emoji</span>
              <div className="categorie-menu__emoji-grid" role="group" aria-labelledby="cat-emoji-label">
                {EMOJI_CATEGORIA.map(e => (
                  <button
                    key={e}
                    type="button"
                    className="categorie-menu__emoji-btn"
                    aria-pressed={form.emoji === e}
                    aria-label={`Icona ${e}`}
                    onClick={() => upd('emoji', e)}
                  >
                    <span role="img" aria-hidden="true">{e}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="categorie-menu__picker">
              <span className="categorie-menu__picker-label" id="cat-colore-label">Colore</span>
              <div className="categorie-menu__color-grid" role="group" aria-labelledby="cat-colore-label">
                {COLORI_CATEGORIA.map((col, i) => (
                  <button
                    key={col}
                    type="button"
                    className="categorie-menu__color-btn"
                    /* --cat-c: swatch = token della palette validata */
                    style={{ ['--cat-c' as any]: col }}
                    aria-pressed={form.colore === col}
                    aria-label={`Colore ${i + 1} della palette`}
                    onClick={() => upd('colore', col)}
                  >
                    <i className="fa-solid fa-check" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>

            <div className="categorie-menu__preview">
              <span className="categorie-menu__picker-label">Anteprima</span>
              <span
                className="categorie-menu__pill"
                style={{ ['--cat-c' as any]: form.colore }}
              >
                <span className="categorie-menu__pill-dot" aria-hidden="true" />
                <span className="categorie-menu__pill-text">
                  {form.emoji} {nome || 'Nuova categoria'}
                </span>
              </span>
            </div>

            {omonima && (
              <p className="categorie-menu__errore">
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                Esiste già una categoria «{omonima.nome}» nel menu {tipoMenuMeta(omonima.tipo).label}:
                scegli un nome diverso.
              </p>
            )}
            {!omonima && stessoOrdine && (
              <p className="categorie-menu__avviso">
                <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
                La posizione {ordine} è già di «{stessoOrdine.nome}»: le due categorie
                si ordineranno per nome.
              </p>
            )}

            <div className="categorie-menu__form-foot">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setModalOpen(false)}>
                Annulla
              </button>
              <button type="button" className="sib-btn sib-btn--primary" disabled={!salvabile} onClick={salva}>
                Salva
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
