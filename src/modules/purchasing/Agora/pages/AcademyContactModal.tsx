import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Icon } from '../ds/icon';
import './AcademyContactModal.css';

export type AcademyContactVariant = 'invia-cv' | 'richiedi-colloquio' | 'richiedi-info';

interface AcademyContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant: AcademyContactVariant;
  /** Titolo dell'item su cui si sta agendo (offerta, candidato, corso) */
  itemTitle: string;
  /** Riga secondaria sotto al titolo (azienda/candidato/istruttore) */
  itemSubtitle: string;
  /** Sezione informativa dell'item da mostrare in header */
  itemDetails?: ReactNode;
}

const VARIANT_CONFIG: Record<
  AcademyContactVariant,
  { heading: string; intro: string; cta: string; requireCv: boolean; cvOptional?: boolean }
> = {
  'invia-cv': {
    heading: 'Invia il tuo CV',
    intro:
      'Compila il modulo per candidarti a questa posizione. Il tuo CV sarà inviato direttamente al referente della selezione.',
    cta: 'Invia candidatura',
    requireCv: true,
  },
  'richiedi-colloquio': {
    heading: 'Richiedi un colloquio',
    intro:
      'Compila il modulo per richiedere un colloquio con questo professionista. Puoi allegare il tuo CV o profilo aziendale per presentarti.',
    cta: 'Invia richiesta',
    requireCv: false,
    cvOptional: true,
  },
  'richiedi-info': {
    heading: 'Richiedi informazioni',
    intro:
      'Compila il modulo per ricevere maggiori informazioni sul corso (programma dettagliato, modalità di pagamento, requisiti).',
    cta: 'Invia richiesta',
    requireCv: false,
  },
};

export function AcademyContactModal({
  isOpen,
  onClose,
  variant,
  itemTitle,
  itemSubtitle,
  itemDetails,
}: AcademyContactModalProps) {
  const config = VARIANT_CONFIG[variant];

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
      setCvFileName(null);
      setSubmitted(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    /* in mock: niente backend, solo conferma visiva */
    setSubmitted(true);
  };

  return (
    <div className="academy-modal" role="dialog" aria-modal="true" aria-labelledby="academy-modal-title">
      <div className="academy-modal__backdrop" onClick={onClose} aria-hidden="true" />

      <div className="academy-modal__dialog">
        <header className="academy-modal__head">
          <div>
            <p className="academy-modal__eyebrow">{config.heading}</p>
            <h2 id="academy-modal-title" className="academy-modal__title">
              {itemTitle}
            </h2>
            <p className="academy-modal__subtitle">{itemSubtitle}</p>
          </div>
          <button
            type="button"
            className="academy-modal__close"
            onClick={onClose}
            aria-label="Chiudi"
          >
            <Icon family="regular" name="xmark" />
          </button>
        </header>

        {itemDetails && <div className="academy-modal__details">{itemDetails}</div>}

        {submitted ? (
          <div className="academy-modal__success">
            <Icon family="regular" name="circle-check" className="academy-modal__success-icon" />
            <h3 className="academy-modal__success-title">Richiesta inviata</h3>
            <p className="academy-modal__success-text">
              Grazie {name.trim() || 'per averci contattato'}, abbiamo inoltrato la tua richiesta.
              Riceverai una risposta entro 48 ore alla mail <strong>{email}</strong>.
            </p>
            <button type="button" className="academy-modal__cta" onClick={onClose}>
              Chiudi
            </button>
          </div>
        ) : (
          <form className="academy-modal__form" onSubmit={handleSubmit}>
            <p className="academy-modal__intro">{config.intro}</p>

            <div className="academy-modal__row">
              <label className="academy-modal__field">
                <span className="academy-modal__label">Nome e cognome</span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="academy-modal__input"
                />
              </label>

              <label className="academy-modal__field">
                <span className="academy-modal__label">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="academy-modal__input"
                />
              </label>
            </div>

            <label className="academy-modal__field">
              <span className="academy-modal__label">Telefono (opzionale)</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="academy-modal__input"
              />
            </label>

            <label className="academy-modal__field">
              <span className="academy-modal__label">
                Messaggio
                {variant === 'richiedi-colloquio' && (
                  <span className="academy-modal__hint">
                    {' '}
                    — Indica disponibilità e dettagli del ruolo offerto
                  </span>
                )}
              </span>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="academy-modal__textarea"
              />
            </label>

            {(config.requireCv || config.cvOptional) && (
              <label className="academy-modal__field academy-modal__field--file">
                <span className="academy-modal__label">
                  Curriculum Vitae
                  {config.cvOptional && (
                    <span className="academy-modal__hint"> (opzionale)</span>
                  )}
                </span>
                <div className="academy-modal__file-row">
                  <input
                    type="file"
                    id="academy-modal-cv"
                    required={config.requireCv}
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setCvFileName(e.target.files?.[0]?.name ?? null)}
                    className="academy-modal__file-input"
                  />
                  <label htmlFor="academy-modal-cv" className="academy-modal__file-btn">
                    <Icon family="regular" name="paperclip" />
                    {cvFileName ? 'Cambia file' : 'Allega file'}
                  </label>
                  <span className="academy-modal__file-name">
                    {cvFileName ?? 'PDF, DOC o DOCX (max 5MB)'}
                  </span>
                </div>
              </label>
            )}

            <div className="academy-modal__actions">
              <button type="button" className="academy-modal__cancel" onClick={onClose}>
                Annulla
              </button>
              <button type="submit" className="academy-modal__cta">
                {config.cta}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
