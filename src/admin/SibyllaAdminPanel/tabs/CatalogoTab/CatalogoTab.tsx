import React from 'react'
import Ico from '../../../../core/icons/Ico'
import CategorieView from './CategorieView/CategorieView'
import FornitoriView from './FornitoriView/FornitoriView'
import ProdottiView from './ProdottiView/ProdottiView'
import type { Categoria, CatalogoSubTab, Fornitore, Prodotto } from '../../catalogo/types'
import './CatalogoTab.sass'

interface Props {
  subTab: CatalogoSubTab
  setSubTab: (t: CatalogoSubTab) => void

  categorie: Categoria[]
  fornitori: Fornitore[]
  prodotti: Prodotto[]

  onCreateCategoria: () => void
  onEditCategoria: (c: Categoria) => void
  onDeleteCategoria: (id: string) => void

  onCreateFornitore: () => void
  onEditFornitore: (f: Fornitore) => void
  onDeleteFornitore: (id: string) => void
  onToggleFornitorePubblicato: (id: string) => void

  onCreateProdotto: () => void
  onEditProdotto: (p: Prodotto) => void
  onDeleteProdotto: (id: string) => void
  onToggleProdottoAttivo: (id: string) => void
  onToggleProdottoPubblicato: (id: string) => void
}

const SUB_TABS: ReadonlyArray<readonly [CatalogoSubTab, string, string]> = [
  ['categorie', 'Categorie', 'fa-layer-group'],
  ['fornitori', 'Fornitori', 'fa-building'],
  ['prodotti',  'Prodotti',  'fa-barcode'],
] as const

export default function CatalogoTab(props: Props) {
  const { subTab, setSubTab, categorie, fornitori, prodotti } = props

  const countByCategoria = (catId: string) =>
    prodotti.filter(p => p.categoriaId === catId).length
  const countByFornitore = (fornId: string) =>
    prodotti.filter(p => p.fornitoreId === fornId).length

  return (
    <div className="cat-tab">
      <div className="cat-tab__banner">
        <Ico n="info" s={14} c="var(--color-primary)" />
        <div className="cat-tab__banner-text">
          <strong>Catalogo Sibylla globale</strong> — i dati inseriti qui alimentano le pagine
          <em> Forniture</em>, <em>Area Merceologica</em> e <em>Acquisti di rete</em> di tutti i clienti.
          I prodotti con barcode entrano nella gestione del magazzino.
        </div>
      </div>

      <nav className="cat-tab__subtabs" role="tablist">
        {SUB_TABS.map(([id, label, ic]) => {
          const active = subTab === id
          const cls = `cat-tab__subtab${active ? ' cat-tab__subtab--active' : ''}`
          return (
            <button key={id} role="tab" aria-selected={active} className={cls} onClick={() => setSubTab(id)}>
              <i className={`fa-duotone ${ic} cat-tab__subtab-ico`} />
              {label}
            </button>
          )
        })}
      </nav>

      <div className="cat-tab__panel">
        {subTab === 'categorie' && (
          <CategorieView
            categorie={categorie}
            countByCategoria={countByCategoria}
            onCreate={props.onCreateCategoria}
            onEdit={props.onEditCategoria}
            onDelete={props.onDeleteCategoria}
          />
        )}
        {subTab === 'fornitori' && (
          <FornitoriView
            fornitori={fornitori}
            categorie={categorie}
            countByFornitore={countByFornitore}
            onCreate={props.onCreateFornitore}
            onEdit={props.onEditFornitore}
            onDelete={props.onDeleteFornitore}
            onTogglePubblicato={props.onToggleFornitorePubblicato}
          />
        )}
        {subTab === 'prodotti' && (
          <ProdottiView
            prodotti={prodotti}
            categorie={categorie}
            fornitori={fornitori}
            onCreate={props.onCreateProdotto}
            onEdit={props.onEditProdotto}
            onDelete={props.onDeleteProdotto}
            onToggleAttivo={props.onToggleProdottoAttivo}
            onTogglePubblicato={props.onToggleProdottoPubblicato}
          />
        )}
      </div>
    </div>
  )
}
