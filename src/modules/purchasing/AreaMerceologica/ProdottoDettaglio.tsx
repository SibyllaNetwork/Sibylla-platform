import React, { useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import { Icon } from '../_shared/Icon'
import { Breadcrumb } from '../_shared/Breadcrumb'
import { getCategoria, classeSlug } from '../../../admin/SibyllaAdminPanel/catalogo/classificazione'
import { UNITA_MISURA_OPTIONS } from '../../../admin/SibyllaAdminPanel/catalogo/mockData'
import { useCatalogoStore } from '../../../store/useCatalogoStore'
import { useCartStore } from '../../../store/useCartStore'
import './ProdottoDettaglio.sass'

interface Props {
  navigate: (p: string) => void
  prodottoId: string
}

export default function ProdottoDettaglio({ navigate, prodottoId }: Props) {
  const prodotti  = useCatalogoStore(s => s.prodotti)
  const fornitori = useCatalogoStore(s => s.fornitori)
  const addProduct  = useCartStore(s => s.addProduct)
  const totaleItems = useCartStore(s => s.totaleItems())

  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  const p = prodotti.find(x => x.id === prodottoId)
  const fornitore = p ? fornitori.find(f => f.id === p.fornitoreId) : undefined
  const categoria = p ? getCategoria(p.categoriaId) : undefined
  const unitaLabel = (u: string) => UNITA_MISURA_OPTIONS.find(o => o.value === u)?.label || u

  if (!p) {
    return (
      <div className="prodotto-dettaglio">
        <BtnBack onClick={() => navigate('area-merceologica')} />
        <div className="pd__missing">Prodotto non trovato.</div>
      </div>
    )
  }

  const prezzo = p.mercati.agora.prezzoVendita
  const backTo = categoria
    ? `prodotti-classe:${p.categoriaId}__${classeSlug(p.classe)}`
    : 'area-merceologica'

  const buildItem = () => ({
    id: p.id,
    prodottoId: p.id,
    barcode: p.barcode,
    categoriaId: p.categoriaId,
    fornitoreId: p.fornitoreId,
    fornitoreNome: fornitore?.nome ?? '—',
    nome: p.nome,
    descrizione: p.descrizione,
    immagineUrl: p.immagineUrl,
    unita: p.unita,
    quantitaUnita: p.quantitaUnita,
    prezzoUnitario: prezzo,
    mercato: 'agora' as const,
  })

  const handleAdd = () => {
    if (qty <= 0) return
    addProduct(buildItem(), qty)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1800)
  }

  const handleBuy = () => {
    if (qty <= 0) return
    addProduct(buildItem(), qty)
    navigate('catalogo-cart')
  }

  const caratteristiche: Array<{ label: string; value: React.ReactNode }> = [
    { label: 'Categoria', value: categoria?.nome ?? p.categoriaId },
    { label: 'Classe', value: p.classe },
    ...(p.tipologia ? [{ label: 'Tipologia', value: p.tipologia }] : []),
    { label: 'Fornitore', value: fornitore?.nome ?? '—' },
    { label: 'Formato', value: `${p.quantitaUnita} ${unitaLabel(p.unita).toLowerCase()}` },
    { label: 'Barcode', value: <code>{p.barcode}</code> },
    { label: 'Scorta minima', value: `${p.scortaMinima} ${p.unita}` },
  ]

  return (
    <div className="prodotto-dettaglio">
      <BtnBack onClick={() => navigate(backTo)} />
      <Breadcrumb
        navigate={navigate}
        items={[
          { label: 'Area merceologica', page: 'area-merceologica' },
          ...(categoria ? [{ label: categoria.nome, page: `dettaglio-area-merceologica:${p.categoriaId}` }] : []),
          { label: p.classe, page: backTo },
          { label: p.nome },
        ]}
      />

      <div className="pd__top">
        <div className="pd__image">
          {p.immagineUrl
            ? <img src={p.immagineUrl} alt={p.nome} />
            : <span className="pd__image-ph"><Icon family="light" name="image" /></span>}
        </div>

        <div className="pd__info">
          <div className="pd__crumb">
            {categoria?.nome} · {p.classe}{p.tipologia ? ` · ${p.tipologia}` : ''}
          </div>
          <h1 className="pd__title">{p.nome}</h1>
          <p className="pd__desc">{p.descrizione}</p>

          <div className="pd__price-row">
            <span className="pd__price">€ {prezzo.toFixed(2)}</span>
            <span className="pd__price-note">prezzo Agorà · IVA esclusa</span>
          </div>

          <div className="pd__buy">
            <div className="pd__qty" role="group" aria-label="Quantità">
              <button type="button" className="pd__qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Diminuisci">
                <Icon family="regular" name="minus" />
              </button>
              <span className="pd__qty-val">{qty}</span>
              <button type="button" className="pd__qty-btn" onClick={() => setQty(q => q + 1)} aria-label="Aumenta">
                <Icon family="regular" name="plus" />
              </button>
            </div>

            <button type="button" className={`sib-btn sib-btn--secondary pd__add${added ? ' pd__add--ok' : ''}`} onClick={handleAdd}>
              {added
                ? <><Icon family="regular" name="check" /> Aggiunto al carrello</>
                : <><Icon family="regular" name="cart-plus" /> Aggiungi al carrello</>}
            </button>
            <button type="button" className="sib-btn sib-btn--primary pd__buy-now" onClick={handleBuy}>
              <Icon family="regular" name="bolt" /> Acquista ora
            </button>
          </div>

          <button type="button" className="pd__cart-link" onClick={() => navigate('catalogo-cart')}>
            <Icon family="regular" name="cart-shopping" /> Vai al carrello{totaleItems > 0 ? ` (${totaleItems})` : ''}
          </button>
        </div>
      </div>

      <section className="pd__section">
        <h2 className="pd__section-title">Caratteristiche</h2>
        <dl className="pd__specs">
          {caratteristiche.map(c => (
            <div key={c.label} className="pd__spec">
              <dt>{c.label}</dt>
              <dd>{c.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
