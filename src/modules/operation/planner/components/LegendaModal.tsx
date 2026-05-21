// ─── LegendaModal ─────────────────────────────────────────────────────────────
import React from 'react';
import Modal from '../../../../core/components/Modal';

interface Props { onClose: () => void }

const ITEMS = [
  { bg: 'transparent', border: '#CFCFCF', label: 'Non esistente' },
  { bg: '#B8B8B8',     border: '',        label: 'Manutenzione' },
  { bg: '#9DD7E8',     border: '',        label: 'Pulizia in corso' },
  { bg: '#00CF86',     border: '',        label: 'Confermata' },
  { bg: '#D10011',     border: '',        label: 'In opzione' },
  { bg: '#7B5EA7',     border: '',        label: 'No-show' },
  { bg: '#1A6B3C',     border: '',        label: 'Check-In completo' },
  { bg: '#2E9959',     border: '',        label: 'Check-In parziale' },
  { bg: '#CFCFCF',     border: '',        label: 'Check-Out' },
];

const LegendaModal: React.FC<Props> = ({ onClose }) => (
  <Modal open={true} onClose={onClose} title="Legenda">
    <div className="legenda-modal">
      {ITEMS.map((it, i) => (
        <div key={i} className="legenda-modal__item">
          <div
            className="legenda-modal__dot"
            style={{
              background: it.bg,
              border: it.border ? `1px solid ${it.border}` : 'none',
            }}
          />
          <span className="legenda-modal__label">{it.label}</span>
        </div>
      ))}
    </div>
  </Modal>
);

export default LegendaModal;
