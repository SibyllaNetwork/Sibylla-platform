// ─── RichiesteOperativeModal ──────────────────────────────────────────────────
// Sezione "Richieste operative" del planner: l'operatore vede le richieste
// inviate dai Tour Operator per le prenotazioni della struttura e, una volta
// eseguita una richiesta (es. fiori/champagne in camera), conferma con un click.
// La conferma fa comparire l'icona sulla barra della prenotazione del TO.

import React from 'react';
import Modal from '../../../../core/components/Modal';
import {
  useRichiesteOperativeStore,
  STATO_RICHIESTA_META,
  type RichiestaOperativa,
} from '../../../../store/useRichiesteOperativeStore';

interface Props { onClose: () => void }

const fmtIt = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const RichiesteOperativeModal: React.FC<Props> = ({ onClose }) => {
  const richieste = useRichiesteOperativeStore((s) => s.richieste);
  const eseguita = useRichiesteOperativeStore((s) => s.eseguita);
  const annulla = useRichiesteOperativeStore((s) => s.annulla);

  // Da eseguire in cima, poi le eseguite.
  const ordinate = [...richieste].sort((a, b) => {
    if (a.stato !== b.stato) return a.stato === 'inviata' ? -1 : 1;
    return b.createdAt - a.createdAt;
  });

  return (
    <Modal open onClose={onClose} title="Richieste operative" size="lg">
      <div className="ro-modal">
        <p className="ro-modal__intro">
          Richieste inviate dai Tour Operator per le prenotazioni della struttura. Conferma quando la richiesta è stata eseguita.
        </p>

        {ordinate.length === 0 ? (
          <p className="ro-modal__empty">Nessuna richiesta operativa al momento.</p>
        ) : (
          <ul className="ro-modal__list">
            {ordinate.map((r) => (
              <RichiestaRow
                key={r.id}
                r={r}
                onEseguita={() => eseguita(r.id)}
                onAnnulla={() => annulla(r.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
};

function RichiestaRow({
  r,
  onEseguita,
  onAnnulla,
}: {
  r: RichiestaOperativa;
  onEseguita: () => void;
  onAnnulla: () => void;
}) {
  const meta = STATO_RICHIESTA_META[r.stato];
  return (
    <li className={`ro-modal__item ro-modal__item--${meta.tone}`}>
      <div className="ro-modal__item-main">
        <div className="ro-modal__item-head">
          <span className="ro-modal__booking">#{r.bookingId}</span>
          <span className="ro-modal__nome">{r.nominativo}</span>
          <span className={`ro-modal__badge ro-modal__badge--${meta.tone}`}>
            <i className={`fa-solid fa-${meta.icon}`} aria-hidden="true" /> {meta.label}
          </span>
        </div>
        <div className="ro-modal__period">
          <i className="fa-light fa-calendar" aria-hidden="true" /> {fmtIt(r.dalISO)} → {fmtIt(r.alISO)}
        </div>
        <p className="ro-modal__desc">{r.descrizione}</p>
        {r.servizi.length > 0 && (
          <div className="ro-modal__servizi">
            {r.servizi.map((s) => (
              <span key={s.id} className="ro-modal__servizio">
                <i className={`fa-light fa-${s.icon}`} aria-hidden="true" /> {s.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="ro-modal__item-actions">
        {r.stato === 'inviata' ? (
          <button type="button" className="sib-btn sib-btn--primary sib-btn--sm" onClick={onEseguita}>
            <i className="fa-light fa-circle-check" aria-hidden="true" /> Conferma eseguita
          </button>
        ) : (
          <button type="button" className="sib-btn sib-btn--ghost sib-btn--sm" onClick={onAnnulla}>
            <i className="fa-light fa-rotate-left" aria-hidden="true" /> Riapri
          </button>
        )}
      </div>
    </li>
  );
}

export default RichiesteOperativeModal;
