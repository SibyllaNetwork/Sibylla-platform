import React, { useMemo, useState } from 'react'
import clsx from 'clsx'
import { CfgToolbar, CfgTable } from '../../../../../core/cfg'
import { SelectField, SearchField } from '../../../../../core/components/form'
import Modal from '../../../../../core/components/Modal'
import Tooltip from '../../../../../core/components/Tooltip'
import TruncatedText from '../../../../../core/components/TruncatedText'
import Pagination from '../../../../../core/components/Pagination'
import { toast } from '../../../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { useCategorieMenuStore } from '../../../../../store/useCategorieMenuStore'
import {
  useVociMenuStore,
  formattaPrezzo,
  allergeneLabel,
  categoriaNome,
  OUTLET_FB,
} from '../../../../../store/useVociMenuStore'
import {
  useMenuCartaStore,
  menuOrdinati,
  allergeniMenu,
  prezzoMenu,
  foodCostMenu,
  margineMenu,
  type MenuCarta,
} from '../../../../../store/useMenuCartaStore'
import type { CfgPaneComponentProps } from '../../Configuratore'
import './ListaMenu.sass'

// ─── LISTA MENU (F&B) ─────────────────────────────────────────────────────────
//  Elenco dei menu salvati. Rispetto alla pagina precedente:
//   • la colonna Allergeni non è più un pollice su/giù ma l'elenco reale delle
//     lettere degli allergeni presenti nel menu, con il nome nel tooltip:
//     al cliente e al servizio serve sapere *quali*, non se ce ne sono;
//   • le azioni sono quattro distinte e non ambigue — Modifica (riapre il menu
//     in «Crea menu»), Anteprima (il menu come lo legge l'ospite), Duplica
//     (base per il menu della settimana dopo) ed Elimina;
//   • prezzo e numero di voci sono in elenco: erano l'informazione che si
//     doveva aprire il menu per conoscere.

const TUTTI = 'tutti'
const PER_PAGINA = 8

/** ISO → gg/mm/aaaa: sulla piattaforma le date si leggono in italiano. */
const dataIt = (iso: string): string => {
  const [a, m, g] = iso.split('-')
  return g && m && a ? `${g}/${m}/${a}` : iso
}

export default function ListaMenu({ onGoTo }: CfgPaneComponentProps) {
  const menu        = useMenuCartaStore(s => s.menu)
  const removeMenu  = useMenuCartaStore(s => s.removeMenu)
  const duplicaMenu = useMenuCartaStore(s => s.duplicaMenu)
  const setMenuInModifica = useMenuCartaStore(s => s.setMenuInModifica)
  const voci      = useVociMenuStore(s => s.voci)
  const categorie = useCategorieMenuStore(s => s.categorie)
  const confirm   = useConfirmStore(s => s.confirm)

  const [outlet, setOutlet] = useState<number | typeof TUTTI>(TUTTI)
  const [query, setQuery] = useState('')
  const [pagina, setPagina] = useState(1)
  const [anteprima, setAnteprima] = useState<MenuCarta | null>(null)

  const filtrati = useMemo(() => {
    const q = query.trim().toLowerCase()
    return menuOrdinati(menu, outlet === TUTTI ? 'tutti' : outlet)
      .filter(m => !q
        || m.nome.toLowerCase().includes(q)
        || m.dettagli.toLowerCase().includes(q))
  }, [menu, outlet, query])

  const totalPages = Math.max(1, Math.ceil(filtrati.length / PER_PAGINA))
  const paginaSicura = Math.min(pagina, totalPages)
  const righe = filtrati.slice((paginaSicura - 1) * PER_PAGINA, paginaSicura * PER_PAGINA)

  const modifica = (m: MenuCarta) => {
    setMenuInModifica(m.id)
    onGoTo?.('fb-crea-menu')
  }

  const duplica = (m: MenuCarta) => {
    const copia = duplicaMenu(m.id)
    if (copia) toast.success(`Creata la copia «${copia.nome}»`)
  }

  const elimina = async (m: MenuCarta) => {
    const ok = await confirm({
      title: 'Elimina menu',
      message: `Eliminare il menu «${m.nome}»? Le voci di catalogo che lo compongono non vengono toccate.`,
      confirmLabel: 'Elimina', danger: true,
    })
    if (!ok) return
    removeMenu(m.id)
    toast.success('Menu eliminato')
  }

  /** Righe dell'anteprima raggruppate per categoria, nell'ordine di stampa. */
  const gruppiAnteprima = useMemo(() => {
    if (!anteprima) return []
    const perCat = new Map<string, Array<{ nome: string; descrizione: string; prezzo: number }>>()
    anteprima.righe.forEach(r => {
      const v = voci.find(x => x.id === r.voceId)
      if (!v) return
      const lista = perCat.get(v.categoriaId) ?? []
      lista.push({ nome: v.nomeIt, descrizione: r.descrizione || v.descrizione, prezzo: v.prezzo })
      perCat.set(v.categoriaId, lista)
    })
    return Array.from(perCat.entries())
      .map(([catId, voci_]) => ({
        catId,
        nome: categoriaNome(catId),
        emoji: categorie.find(c => c.id === catId)?.emoji ?? '',
        ordine: categorie.find(c => c.id === catId)?.ordine ?? 999,
        voci: voci_.sort((a, b) => a.nome.localeCompare(b.nome, 'it')),
      }))
      .sort((a, b) => a.ordine - b.ordine)
  }, [anteprima, voci, categorie])

  return (
    <div className="lista-menu">
      <CfgToolbar
        actions={(
          <button
            type="button"
            className="sib-btn sib-btn--primary"
            onClick={() => { setMenuInModifica(null); onGoTo?.('fb-crea-menu') }}
          >
            <i className="fa-solid fa-plus" aria-hidden="true" />
            Nuovo menu
          </button>
        )}
      >
        <SelectField
          name="outlet"
          label="Outlet"
          value={outlet}
          onChange={(e) => {
            setOutlet(e.target.value === TUTTI ? TUTTI : Number(e.target.value))
            setPagina(1)
          }}
          options={[
            { value: TUTTI, label: 'Tutti gli outlet' },
            ...OUTLET_FB.map(o => ({ value: o.id, label: `${o.id} - ${o.nome}` })),
          ]}
        />
        <SearchField
          className="lista-menu__search"
          name="cerca"
          value={query}
          placeholder="Nome o dettagli del menu…"
          onChange={(e) => { setQuery(e.target.value); setPagina(1) }}
          onClear={() => { setQuery(''); setPagina(1) }}
        />
      </CfgToolbar>

      <CfgTable
        columns={[
          { key: 'nome',   label: 'Nome',           width: '18%' },
          { key: 'data',   label: 'Data creazione', width: '12%' },
          { key: 'dett',   label: 'Dettagli',       width: '21%' },
          { key: 'voci',   label: 'Voci',           width: '7%',  align: 'right' },
          { key: 'prezzo', label: 'Prezzo',         width: '12%', align: 'right' },
          { key: 'all',    label: 'Allergeni',      width: '15%' },
          { key: 'azioni', label: 'Azioni',         width: '15%', align: 'right' },
        ]}
        empty={(
          <span>
            {menu.length === 0
              ? 'Nessun menu salvato: componine uno in «Crea menu».'
              : 'Nessun menu corrisponde ai filtri impostati.'}
          </span>
        )}
      >
        {righe.map(m => {
          const allergeni = allergeniMenu(m, voci)
          return (
            <tr key={m.id} className={clsx(!m.attivo && 'lista-menu__row--off')}>
              <td className="lista-menu__td-nome">
                <TruncatedText text={m.nome} />
              </td>
              <td className="lista-menu__td-data">{dataIt(m.dataCreazione)}</td>
              <td className="lista-menu__td-dett">
                <TruncatedText text={m.dettagli || '—'} />
              </td>
              <td className="lista-menu__td-num">{m.righe.length}</td>
              <td className="lista-menu__td-num">
                € {formattaPrezzo(prezzoMenu(m, voci))}
                {!m.fisso && (
                  <Tooltip content="Menu a la carte: prezzo = somma dei prezzi di carta">
                    <i className="fa-solid fa-calculator lista-menu__ico-somma" aria-hidden="true" />
                  </Tooltip>
                )}
              </td>
              <td>
                {allergeni.length === 0 ? (
                  <span className="lista-menu__no-all">nessuno</span>
                ) : (
                  <span className="lista-menu__all">
                    {allergeni.slice(0, 5).map(a => (
                      <Tooltip key={a} content={allergeneLabel(a)}>
                        <span className="lista-menu__all-badge">{a}</span>
                      </Tooltip>
                    ))}
                    {allergeni.length > 5 && (
                      <Tooltip content={allergeni.slice(5).map(allergeneLabel).join(' · ')}>
                        <span className="lista-menu__all-badge lista-menu__all-badge--altri">
                          +{allergeni.length - 5}
                        </span>
                      </Tooltip>
                    )}
                  </span>
                )}
              </td>
              <td className="lista-menu__td-azioni">
                <Tooltip content="Modifica il menu">
                  <button
                    type="button" className="sib-btn sib-btn--icon"
                    onClick={() => modifica(m)}
                    aria-label={`Modifica il menu ${m.nome}`}
                  >
                    <i className="fa-solid fa-pen" />
                  </button>
                </Tooltip>
                <Tooltip content="Anteprima del menu">
                  <button
                    type="button" className="sib-btn sib-btn--icon"
                    onClick={() => setAnteprima(m)}
                    aria-label={`Anteprima del menu ${m.nome}`}
                  >
                    <i className="fa-solid fa-eye" />
                  </button>
                </Tooltip>
                <Tooltip content="Duplica il menu">
                  <button
                    type="button" className="sib-btn sib-btn--icon"
                    onClick={() => duplica(m)}
                    aria-label={`Duplica il menu ${m.nome}`}
                  >
                    <i className="fa-solid fa-copy" />
                  </button>
                </Tooltip>
                <Tooltip content="Elimina il menu">
                  <button
                    type="button" className="sib-btn sib-btn--icon"
                    onClick={() => elimina(m)}
                    aria-label={`Elimina il menu ${m.nome}`}
                  >
                    <i className="fa-solid fa-trash" />
                  </button>
                </Tooltip>
              </td>
            </tr>
          )
        })}
      </CfgTable>

      {totalPages > 1 && (
        <div className="lista-menu__pager">
          <Pagination page={paginaSicura} totalPages={totalPages} onPageChange={setPagina} />
        </div>
      )}

      <p className="lista-menu__nota">
        <i className="fa-light fa-circle-info" aria-hidden="true" />
        Gli allergeni sono la somma di quelli dichiarati sulle voci in «Voci menu»:
        si correggono là e l'elenco si aggiorna su ogni menu che le contiene.
      </p>

      {anteprima && (
        <Modal
          open
          onClose={() => setAnteprima(null)}
          title={`Anteprima · ${anteprima.nome}`}
          size="md"
        >
          <div className="lista-menu__ant">
            <header className="lista-menu__ant-head">
              <h3>{anteprima.nome}</h3>
              {anteprima.dettagli && <p>{anteprima.dettagli}</p>}
              <p className="lista-menu__ant-meta">
                {OUTLET_FB.find(o => o.id === anteprima.outletId)?.nome}
                {' · '}
                {anteprima.fisso
                  ? `Menu fisso € ${formattaPrezzo(prezzoMenu(anteprima, voci))}`
                  : `A la carte · € ${formattaPrezzo(prezzoMenu(anteprima, voci))}`}
              </p>
            </header>

            {gruppiAnteprima.map(g => (
              <section key={g.catId} className="lista-menu__ant-gruppo">
                <h4>
                  {g.emoji && <span aria-hidden="true">{g.emoji} </span>}
                  {g.nome}
                </h4>
                <ul>
                  {g.voci.map(v => (
                    <li key={v.nome}>
                      <span className="lista-menu__ant-voce">
                        <strong>{v.nome}</strong>
                        {v.descrizione && <em>{v.descrizione}</em>}
                      </span>
                      {!anteprima.fisso && (
                        <span className="lista-menu__ant-prezzo">€ {formattaPrezzo(v.prezzo)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <footer className="lista-menu__ant-foot">
              <span>
                Allergeni:{' '}
                {allergeniMenu(anteprima, voci).length === 0
                  ? 'nessuno dichiarato'
                  : allergeniMenu(anteprima, voci).map(allergeneLabel).join(' · ')}
              </span>
              <span>
                Food cost € {formattaPrezzo(foodCostMenu(anteprima, voci))}
                {' · '}Margine {margineMenu(anteprima, voci)}%
              </span>
            </footer>
          </div>
        </Modal>
      )}
    </div>
  )
}
