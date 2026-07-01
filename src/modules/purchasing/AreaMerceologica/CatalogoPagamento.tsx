import React, { useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import { useCartStore } from '../../../store/useCartStore'
import { useCheckoutStore } from '../../../store/useCheckoutStore'
import { toast } from '../../../core/components/Toast/useToast'
import './CatalogoPagamento.sass'

const eur = (n: number) => `€ ${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// marchio carta dal primo/e cifre
function brandOf(num: string): { key: string; icon: string; label: string } {
  const n = num.replace(/\s/g, '')
  if (/^4/.test(n)) return { key: 'visa', icon: 'fa-cc-visa', label: 'Visa' }
  if (/^5[1-5]/.test(n) || /^2/.test(n)) return { key: 'mastercard', icon: 'fa-cc-mastercard', label: 'Mastercard' }
  if (/^3[47]/.test(n)) return { key: 'amex', icon: 'fa-cc-amex', label: 'American Express' }
  return { key: 'generic', icon: 'fa-credit-card', label: 'Carta' }
}

const fmtNumero = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
const fmtScadenza = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 4)
  return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`
}

export default function CatalogoPagamento({ navigate }: { navigate: (p: string) => void }) {
  const { totale, acconto, accontoPct, metodo } = useCheckoutStore()
  const clearCart = useCartStore(s => s.clearCart)

  const daPagare = acconto ? totale * accontoPct : totale
  const saldoResiduo = totale - daPagare

  const [numero, setNumero] = useState('')
  const [intestatario, setIntestatario] = useState('')
  const [scadenza, setScadenza] = useState('')
  const [cvv, setCvv] = useState('')
  const [salva, setSalva] = useState(false)
  const [done, setDone] = useState<string | null>(null)

  const brand = useMemo(() => brandOf(numero), [numero])
  const numeroOk = numero.replace(/\s/g, '').length === 16
  const scadenzaOk = /^\d{2}\/\d{2}$/.test(scadenza)
  const cvvOk = /^\d{3,4}$/.test(cvv)
  const cartaValida = metodo !== 'carta' || (numeroOk && intestatario.trim().length > 2 && scadenzaOk && cvvOk)

  const conferma = () => {
    if (!cartaValida) { toast.warning('Completa correttamente i dati della carta'); return }
    const code = 'ORD-' + (numero.slice(-4) || '0000') + '-' + scadenza.replace('/', '')
    clearCart()
    setDone(code)
    toast.success(`Pagamento di ${eur(daPagare)} completato`)
  }

  if (done) {
    return (
      <div className="pay">
        <div className="pay__success">
          <span className="pay__success-ico"><i className="fa-duotone fa-circle-check" aria-hidden="true" /></span>
          <h1>Pagamento completato</h1>
          <p>Grazie! Abbiamo registrato il pagamento di <strong>{eur(daPagare)}</strong>{acconto && <> a titolo di acconto</>}.</p>
          {acconto && saldoResiduo > 0 && (
            <p className="pay__success-note">Saldo residuo di <strong>{eur(saldoResiduo)}</strong> da versare entro la scadenza indicata nell'ordine.</p>
          )}
          <p className="pay__success-code">Ordine <strong>{done}</strong></p>
          <div className="pay__success-actions">
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate('catalogo-cart')}>I miei ordini</button>
            <button type="button" className="sib-btn sib-btn--primary" onClick={() => navigate('area-merceologica')}>Torna al catalogo</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pay">
      <BtnBack onClick={() => navigate('catalogo-cart')} />

      <header className="pay__head">
        <h1 className="pay__title"><i className="fa-duotone fa-lock" aria-hidden="true" /> Pagamento sicuro</h1>
        <p className="pay__subtitle">{acconto ? 'Stai versando un acconto sul tuo ordine' : 'Completa il pagamento del tuo ordine'}</p>
      </header>

      <div className="pay__layout">
        {/* Colonna form */}
        <section className="pay__form">
          {metodo === 'carta' ? (
            <>
              {/* Anteprima carta */}
              <div className={`pay-card pay-card--${brand.key}`}>
                <div className="pay-card__top">
                  <i className="fa-duotone fa-wifi pay-card__contactless" aria-hidden="true" />
                  <i className={`fa-brands ${brand.icon} pay-card__brand`} aria-hidden="true" />
                </div>
                <div className="pay-card__chip"><i className="fa-solid fa-sim-card" aria-hidden="true" /></div>
                <div className="pay-card__number">{numero || '•••• •••• •••• ••••'}</div>
                <div className="pay-card__row">
                  <div>
                    <span className="pay-card__label">Intestatario</span>
                    <span className="pay-card__value">{intestatario || 'NOME COGNOME'}</span>
                  </div>
                  <div>
                    <span className="pay-card__label">Scadenza</span>
                    <span className="pay-card__value">{scadenza || 'MM/AA'}</span>
                  </div>
                </div>
              </div>

              {/* Campi */}
              <div className="pay__fields">
                <label className="pay__field pay__field--full">
                  <span>Numero carta</span>
                  <div className="pay__input-wrap">
                    <i className="fa-light fa-credit-card" aria-hidden="true" />
                    <input inputMode="numeric" placeholder="0000 0000 0000 0000" value={numero} onChange={e => setNumero(fmtNumero(e.target.value))} />
                    <i className={`fa-brands ${brand.icon} pay__input-brand`} aria-hidden="true" />
                  </div>
                </label>
                <label className="pay__field pay__field--full">
                  <span>Intestatario</span>
                  <div className="pay__input-wrap">
                    <i className="fa-light fa-user" aria-hidden="true" />
                    <input placeholder="Nome e cognome" value={intestatario} onChange={e => setIntestatario(e.target.value.toUpperCase())} />
                  </div>
                </label>
                <label className="pay__field">
                  <span>Scadenza</span>
                  <div className="pay__input-wrap">
                    <i className="fa-light fa-calendar" aria-hidden="true" />
                    <input inputMode="numeric" placeholder="MM/AA" value={scadenza} onChange={e => setScadenza(fmtScadenza(e.target.value))} />
                  </div>
                </label>
                <label className="pay__field">
                  <span>CVV</span>
                  <div className="pay__input-wrap">
                    <i className="fa-light fa-lock" aria-hidden="true" />
                    <input inputMode="numeric" placeholder="123" value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} />
                  </div>
                </label>
                <label className="pay__save">
                  <input type="checkbox" checked={salva} onChange={e => setSalva(e.target.checked)} />
                  <span>Salva questa carta per i pagamenti futuri</span>
                </label>
              </div>
            </>
          ) : (
            <div className="pay__wallet">
              <i className="fa-duotone fa-wallet" aria-hidden="true" />
              <h2>Sibylla wallet</h2>
              <p>Il pagamento verrà addebitato sul tuo credito Sibylla wallet.</p>
            </div>
          )}
        </section>

        {/* Colonna riepilogo */}
        <aside className="pay__summary">
          <h2 className="pay__summary-title">Riepilogo pagamento</h2>
          <div className="pay__sum-row"><span>Totale ordine</span><span>{eur(totale)}</span></div>
          {acconto && (
            <>
              <div className="pay__sum-row pay__sum-row--acc"><span>Acconto ({Math.round(accontoPct * 100)}%)</span><span>{eur(daPagare)}</span></div>
              <div className="pay__sum-row"><span>Saldo residuo</span><span>{eur(saldoResiduo)}</span></div>
              <p className="pay__acc-note"><i className="fa-solid fa-circle-info" aria-hidden="true" /> Il saldo residuo sarà dovuto alla scadenza indicata nell'ordine.</p>
            </>
          )}
          <div className="pay__sum-pay">
            <span>Ora paghi</span>
            <strong>{eur(daPagare)}</strong>
          </div>

          <div className="pay__method">
            <i className={metodo === 'carta' ? `fa-brands ${brand.icon}` : 'fa-duotone fa-wallet'} aria-hidden="true" />
            {metodo === 'carta' ? brand.label : 'Sibylla wallet'}
          </div>

          <button type="button" className="pay__confirm" disabled={!cartaValida} onClick={conferma}>
            <i className="fa-solid fa-lock" aria-hidden="true" /> Paga {eur(daPagare)}
          </button>

          <p className="pay__secure"><i className="fa-solid fa-shield-halved" aria-hidden="true" /> Transazione protetta con crittografia SSL</p>
        </aside>
      </div>
    </div>
  )
}
