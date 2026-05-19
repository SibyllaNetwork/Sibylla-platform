import './TopMeta.css';

/**
 * Barra in alto. Per ora vuota (solo il pulse decorativo a sinistra),
 * pronta per essere popolata con eventuali utility (utente, lingua, ecc.).
 */
export function TopMeta() {
  return (
    <div className="landing-top-meta">
      <div className="landing-top-meta__left">
        <span className="landing-top-meta__pulse" aria-hidden="true" />
      </div>
      <div className="landing-top-meta__right" />
    </div>
  );
}
