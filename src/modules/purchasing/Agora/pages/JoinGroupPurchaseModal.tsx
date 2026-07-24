import { useState } from 'react';
import Modal from '../../../../core/components/Modal';
import { Icon } from '../ds/icon';
import { Button } from '../ds/button';
import { getDaysRemaining, type GroupPurchase } from '../../../../store/useGroupPurchasesStore';
import './groupPurchaseModals.css';

/* ============================================================
   JoinGroupPurchaseModal — dettaglio del gruppo d'acquisto con
   scelta del quantitativo. Usa la modale STANDARD di piattaforma
   (core/components/Modal). Il gruppo si crea al raggiungimento
   del quantitativo minimo di partecipanti.
   ============================================================ */

interface JoinModalProps {
  purchase: GroupPurchase;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
}

export function JoinGroupPurchaseModal({ purchase, onClose, onConfirm }: JoinModalProps) {
  const [quantity, setQuantity] = useState(purchase.quantityPerPerson);
  const daysRemaining = getDaysRemaining(purchase.endDate);

  const missing = Math.max(purchase.minQuantity - purchase.currentParticipants, 0);
  const willComplete = purchase.currentParticipants + 1 >= purchase.minQuantity;
  const total = purchase.groupPrice * quantity;
  const saving = (purchase.regularPrice - purchase.groupPrice) * quantity;

  const step = (delta: number) =>
    setQuantity((q) => Math.max(purchase.quantityPerPerson, q + delta));

  return (
    <Modal open onClose={onClose} title="Partecipa al gruppo" size="lg" className="gp-join">
      <div className="gp-join__body">
        <div className="gp-join__detail">
          <img src={purchase.image} alt={purchase.productName} className="gp-join__image" />
          <div className="gp-join__detail-info">
            <span className="gp-join__discount">-{purchase.discount}%</span>
            <h3 className="gp-join__product">{purchase.productName}</h3>
            <p className="gp-join__supplier">{purchase.supplier}</p>
            <p className="gp-join__desc">{purchase.description}</p>
            <div className="gp-join__prices">
              <span className="gp-join__price-regular">€{purchase.regularPrice.toFixed(2)}</span>
              <span className="gp-join__price-group">€{purchase.groupPrice.toFixed(2)}</span>
              <span className="gp-join__price-unit">/ {purchase.unit}</span>
            </div>
          </div>
        </div>

        <div className="gp-join__notice">
          <Icon family="regular" name="circle-info" className="gp-join__notice-icon" />
          <div>
            <p className="gp-join__notice-title">
              Al raggiungimento del quantitativo minimo il gruppo verrà creato.
            </p>
            <p className="gp-join__notice-text">
              Servono <strong>{purchase.minQuantity}</strong> partecipanti: al momento sono{' '}
              <strong>{purchase.currentParticipants}</strong>
              {missing > 0
                ? `, ne mancano ancora ${missing}.`
                : ' — soglia raggiunta.'}
              {' '}Scadenza tra {daysRemaining} giorni.
            </p>
          </div>
        </div>

        <div className="gp-join__qty">
          <span className="gp-join__qty-label">Quantitativo desiderato</span>
          <div className="gp-join__qty-control">
            <button
              type="button"
              className="gp-join__qty-btn"
              onClick={() => step(-1)}
              disabled={quantity <= purchase.quantityPerPerson}
              aria-label="Diminuisci"
            >
              <Icon family="regular" name="minus" />
            </button>
            <input
              type="number"
              min={purchase.quantityPerPerson}
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.max(purchase.quantityPerPerson, Math.floor(Number(e.target.value) || purchase.quantityPerPerson)))
              }
            />
            <button
              type="button"
              className="gp-join__qty-btn"
              onClick={() => step(1)}
              aria-label="Aumenta"
            >
              <Icon family="regular" name="plus" />
            </button>
          </div>
          <span className="gp-join__qty-unit">
            {purchase.unit} · min. {purchase.quantityPerPerson}
          </span>
        </div>

        <div className="gp-join__summary">
          <div className="gp-join__summary-row">
            <span>Totale stimato</span>
            <strong>€{total.toFixed(2)}</strong>
          </div>
          <div className="gp-join__summary-row gp-join__summary-row--saving">
            <span>Risparmio rispetto al listino</span>
            <strong>€{saving.toFixed(2)}</strong>
          </div>
        </div>
      </div>

      <footer className="gp-modal__actions">
        <Button variant="tertiary" onClick={onClose} type="button">Annulla</Button>
        <Button variant="primary" type="button" onClick={() => onConfirm(quantity)}>
          <Icon family="solid" name="cart-shopping" data-slot="icon" />
          {willComplete ? 'Partecipa e attiva il gruppo' : 'Conferma partecipazione'}
        </Button>
      </footer>
    </Modal>
  );
}
