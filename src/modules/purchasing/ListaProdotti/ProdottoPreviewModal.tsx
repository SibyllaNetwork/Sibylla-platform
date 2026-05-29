import React from 'react'
import Modal from '../../../core/components/Modal'
import Ico from '../../../core/icons/Ico'
import { UNITA_MISURA_OPTIONS } from '../../../admin/SibyllaAdminPanel/catalogo/mockData'
import type { Categoria, Fornitore, Prodotto } from '../../../admin/SibyllaAdminPanel/catalogo/types'
import './ProdottoPreviewModal.sass'

interface Props {
  open: boolean
  prodotto: Prodotto | null
  categorie: Categoria[]
  fornitori: Fornitore[]
  onClose: () => void
}

export default function ProdottoPreviewModal({ open, prodotto, categorie, fornitori, onClose }: Props) {
  if (!prodotto) return null

  const cat  = categorie.find(c => c.id === prodotto.categoriaId)
  const forn = fornitori.find(f => f.id === prodotto.fornitoreId)
  const uMisura = UNITA_MISURA_OPTIONS.find(o => o.value === prodotto.unita)

  // Markup % rispetto al prezzo base, mostrato accanto ai prezzi di vendita
  const markup = (prezzoVendita: number) => {
    if (!prodotto.prezzoBase || prezzoVendita <= 0) return null
    const pct = ((prezzoVendita - prodotto.prezzoBase) / prodotto.prezzoBase) * 100
    return pct
  }

  return (
    <Modal open={open} onClose={onClose} title="Anteprima prodotto" size="lg">
      <div className="prod-prev">
        {/* ─── Hero ────────────────────────────────────────────────────── */}
        <div className="prod-prev__hero">
          <div className="prod-prev__image">
            {prodotto.immagineUrl
              ? <img src={prodotto.immagineUrl} alt={prodotto.nome} />
              : <div className="prod-prev__image-placeholder">
                  <Ico n="image" s={32} c="var(--color-text-disabled)" />
                  <span>Nessuna immagine</span>
                </div>}
          </div>
          <div className="prod-prev__hero-info">
            <h3 className="prod-prev__title">{prodotto.nome}</h3>
            <div className="prod-prev__sub">
              <code className="prod-prev__barcode">{prodotto.barcode || '— nessun barcode —'}</code>
              <span className="prod-prev__unit">
                {prodotto.quantitaUnita} {uMisura?.label.split(' ')[0].toLowerCase() ?? prodotto.unita}
              </span>
            </div>
            {prodotto.descrizione && (
              <p className="prod-prev__desc">{prodotto.descrizione}</p>
            )}
            <div className="prod-prev__status-row">
              <span className={`prod-prev__pill${prodotto.attivo ? ' prod-prev__pill--on' : ' prod-prev__pill--off'}`}>
                <span className="prod-prev__pill-dot" />
                {prodotto.attivo ? 'Attivo' : 'Disattivo'}
              </span>
              <span className={`prod-prev__pill${prodotto.pubblicato ? ' prod-prev__pill--on' : ' prod-prev__pill--off'}`}>
                <span className="prod-prev__pill-dot" />
                {prodotto.pubblicato ? 'Pubblicato' : 'Non pubblicato'}
              </span>
            </div>
          </div>
        </div>

        {/* ─── Anagrafica ──────────────────────────────────────────────── */}
        <section className="prod-prev__section">
          <h4 className="prod-prev__section-title">Anagrafica</h4>
          <dl className="prod-prev__meta">
            <div><dt>Categoria</dt><dd>{cat?.nome ?? '—'}</dd></div>
            <div><dt>Fornitore</dt><dd>{forn?.nome ?? '—'}</dd></div>
            <div><dt>Unità di misura</dt><dd>{uMisura?.label ?? prodotto.unita}</dd></div>
            <div><dt>Quantità per unità</dt><dd>{prodotto.quantitaUnita}</dd></div>
            <div><dt>Scorta minima</dt><dd>{prodotto.scortaMinima}</dd></div>
            <div><dt>ID prodotto</dt><dd><code>{prodotto.id}</code></dd></div>
          </dl>
        </section>

        {/* ─── Listini ────────────────────────────────────────────────── */}
        <section className="prod-prev__section">
          <h4 className="prod-prev__section-title">Listini</h4>
          <div className="prod-prev__prices">
            <div className="prod-prev__price-card prod-prev__price-card--base">
              <span className="prod-prev__price-label">Prezzo base (fornitore)</span>
              <span className="prod-prev__price-value">€ {prodotto.prezzoBase.toFixed(2)}</span>
              <span className="prod-prev__price-note">listino d'acquisto</span>
            </div>

            <div className={`prod-prev__price-card prod-prev__price-card--agora${!prodotto.mercati.agora.abilitato ? ' prod-prev__price-card--off' : ''}`}>
              <span className="prod-prev__price-label">Agorà</span>
              {prodotto.mercati.agora.abilitato
                ? <>
                    <span className="prod-prev__price-value">€ {prodotto.mercati.agora.prezzoVendita.toFixed(2)}</span>
                    {markup(prodotto.mercati.agora.prezzoVendita) !== null && (
                      <span className="prod-prev__price-markup">
                        {markup(prodotto.mercati.agora.prezzoVendita)! >= 0 ? '+' : ''}
                        {markup(prodotto.mercati.agora.prezzoVendita)!.toFixed(1)}% sul base
                      </span>
                    )}
                  </>
                : <span className="prod-prev__price-disabled">Non in vendita</span>}
            </div>

            <div className={`prod-prev__price-card prod-prev__price-card--network${!prodotto.mercati.network.abilitato ? ' prod-prev__price-card--off' : ''}`}>
              <span className="prod-prev__price-label">Network</span>
              {prodotto.mercati.network.abilitato
                ? <>
                    <span className="prod-prev__price-value">€ {prodotto.mercati.network.prezzoVendita.toFixed(2)}</span>
                    {markup(prodotto.mercati.network.prezzoVendita) !== null && (
                      <span className="prod-prev__price-markup">
                        {markup(prodotto.mercati.network.prezzoVendita)! >= 0 ? '+' : ''}
                        {markup(prodotto.mercati.network.prezzoVendita)!.toFixed(1)}% sul base
                      </span>
                    )}
                  </>
                : <span className="prod-prev__price-disabled">Non in vendita</span>}
            </div>
          </div>
        </section>

        {/* ─── Footer ─────────────────────────────────────────────────── */}
        <div className="prod-prev__footer">
          <button type="button" className="sib-btn sib-btn--ghost" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </Modal>
  )
}
