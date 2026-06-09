import React from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import { Icon } from '../_shared/Icon'
import { useCartStore, type ProductCartItem } from '../../../store/useCartStore'
import './CatalogoCart.sass'

export default function CatalogoCart({ navigate }: { navigate: (p: string) => void }) {
  const items = useCartStore(s => s.items)
  const updateQty = useCartStore(s => s.updateProductQuantita)
  const removeItem = useCartStore(s => s.removeItem)

  const prodotti = items.filter((i): i is ProductCartItem => i.kind === 'product')
  const totale = prodotti.reduce((acc, p) => acc + p.prezzoUnitario * p.quantita, 0)
  const totaleQta = prodotti.reduce((acc, p) => acc + p.quantita, 0)

  return (
    <div className="catalogo-cart">
      <BtnBack onClick={() => navigate('area-merceologica')} />
      <PageHeader title="Carrello" subtitle="Rivedi i prodotti selezionati prima di procedere all'acquisto" />

      {prodotti.length === 0 ? (
        <div className="cc__empty">
          <Icon family="light" name="cart-shopping" />
          <p>Il carrello è vuoto.</p>
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => navigate('area-merceologica')}>
            Esplora il catalogo
          </button>
        </div>
      ) : (
        <div className="cc__layout">
          <div className="cc__items">
            {prodotti.map(p => (
              <article key={p.id} className="cc-row">
                <div className="cc-row__image">
                  {p.immagineUrl
                    ? <img src={p.immagineUrl} alt={p.nome} />
                    : <span className="cc-row__image-ph"><Icon family="light" name="image" /></span>}
                </div>
                <div className="cc-row__info">
                  <h3 className="cc-row__title">{p.nome}</h3>
                  <p className="cc-row__sub">{p.fornitoreNome}</p>
                  <p className="cc-row__unit">€ {p.prezzoUnitario.toFixed(2)} / pz</p>
                </div>
                <div className="cc-row__qty" role="group" aria-label="Quantità">
                  <button type="button" className="cc-row__qty-btn" onClick={() => updateQty(p.id, p.quantita - 1)} aria-label="Diminuisci">
                    <Icon family="regular" name="minus" />
                  </button>
                  <span className="cc-row__qty-val">{p.quantita}</span>
                  <button type="button" className="cc-row__qty-btn" onClick={() => updateQty(p.id, p.quantita + 1)} aria-label="Aumenta">
                    <Icon family="regular" name="plus" />
                  </button>
                </div>
                <div className="cc-row__line">€ {(p.prezzoUnitario * p.quantita).toFixed(2)}</div>
                <button type="button" className="cc-row__remove" onClick={() => removeItem(p.id)} aria-label="Rimuovi">
                  <Icon family="regular" name="trash-can" />
                </button>
              </article>
            ))}
          </div>

          <aside className="cc__summary">
            <h3 className="cc__summary-title">Riepilogo</h3>
            <div className="cc__summary-row">
              <span>Prodotti ({totaleQta})</span>
              <span>€ {totale.toFixed(2)}</span>
            </div>
            <div className="cc__summary-row">
              <span>Spedizione</span>
              <span className="cc__free">Gratis</span>
            </div>
            <div className="cc__summary-total">
              <span>Totale</span>
              <span>€ {totale.toFixed(2)}</span>
            </div>
            <button type="button" className="sib-btn sib-btn--primary cc__checkout" onClick={() => navigate('catalogo-checkout')}>
              <Icon family="regular" name="lock" /> Procedi all'acquisto
            </button>
            <button type="button" className="cc__continue" onClick={() => navigate('area-merceologica')}>
              Continua lo shopping
            </button>
          </aside>
        </div>
      )}
    </div>
  )
}
