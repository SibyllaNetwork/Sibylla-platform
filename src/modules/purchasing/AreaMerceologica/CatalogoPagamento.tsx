import React, { useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import { useCartStore } from '../../../store/useCartStore'
import { useCheckoutStore, type MetodoPagamento } from '../../../store/useCheckoutStore'
import { toast } from '../../../core/components/Toast/useToast'
import './CatalogoPagamento.sass'

const eur = (n: number) => `€ ${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

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
type Focus = 'num' | 'name' | 'exp' | 'cvv' | null

export default function CatalogoPagamento({ navigate }: { navigate: (p: string) => void }) {
  const { totale, acconto, accontoPct, metodo } = useCheckoutStore()
  const clearCart = useCartStore(s => s.clearCart)

  const daPagare = acconto ? totale * accontoPct : totale
  const saldoResiduo = totale - daPagare

  const [metodoSel, setMetodoSel] = useState<MetodoPagamento>(metodo)
  const [numero, setNumero] = useState('')
  const [intestatario, setIntestatario] = useState('')
  const [scadenza, setScadenza] = useState('')
  const [cvv, setCvv] = useState('')
  const [salva, setSalva] = useState(false)
  const [focus, setFocus] = useState<Focus>(null)
  const [done, setDone] = useState<string | null>(null)

  const brand = useMemo(() => brandOf(numero), [numero])
  const numeroOk = numero.replace(/\s/g, '').length === 16
  const scadenzaOk = /^\d{2}\/\d{2}$/.test(scadenza)
  const cvvOk = /^\d{3,4}$/.test(cvv)
  const cartaValida = metodoSel !== 'carta' || (numeroOk && intestatario.trim().length > 2 && scadenzaOk && cvvOk)

  const conferma = () => {
    if (!cartaValida) { toast.warning('Completa correttamente i dati della carta'); return }
    const code = 'ORD-' + (numero.slice(-4) || 'WLLT') + '-' + (scadenza.replace('/', '') || '00')
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
          <p>Grazie! Abbiamo registrato il pagamento di <strong>{eur(daPagare)}</strong>{acconto ? ' a titolo di acconto' : ''}.</p>
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

  const STEPS = ['Carrello', 'Pagamento', 'Conferma']

  return (
    <div className="pay">
      <BtnBack onClick={() => navigate('catalogo-cart')} />

      {/* Stepper */}
      <ol className="pay__steps">
        {STEPS.map((s, i) => (
          <li key={s} className={`pay__step ${i < 1 ? 'is-done' : ''} ${i === 1 ? 'is-active' : ''}`}>
            <span className="pay__step-dot">{i < 1 ? <i className="fa-solid fa-check" aria-hidden="true" /> : i + 1}</span>
            <span className="pay__step-label">{s}</span>
          </li>
        ))}
      </ol>

      <div className="pay__layout">
        {/* Colonna principale */}
        <section className="pay__main">
          <div className="pay__method-switch" role="tablist">
            <button role="tab" aria-selected={metodoSel === 'carta'} className={`pay__ms ${metodoSel === 'carta' ? 'is-on' : ''}`} onClick={() => setMetodoSel('carta')}>
              <i className="fa-duotone fa-credit-card" aria-hidden="true" /> Carta di credito
            </button>
            <button role="tab" aria-selected={metodoSel === 'wallet'} className={`pay__ms ${metodoSel === 'wallet' ? 'is-on' : ''}`} onClick={() => setMetodoSel('wallet')}>
              <i className="fa-duotone fa-wallet" aria-hidden="true" /> Sibylla wallet
            </button>
          </div>

          {metodoSel === 'carta' ? (
            <div className="pay__card-panel">
              {/* Carta 3D (si gira sul CVV) */}
              <div className={`pay-card pay-card--${brand.key} ${focus === 'cvv' ? 'is-flipped' : ''}`}>
                <div className="pay-card__inner">
                  <div className="pay-card__face pay-card__front">
                    <div className="pay-card__glare" />
                    <div className="pay-card__top">
                      <span className="pay-card__chip"><i className="fa-solid fa-sim-card" aria-hidden="true" /></span>
                      <i className={`fa-brands ${brand.icon} pay-card__brand`} aria-hidden="true" />
                    </div>
                    <div className={`pay-card__number ${focus === 'num' ? 'is-focus' : ''}`}>{numero || '•••• •••• •••• ••••'}</div>
                    <div className="pay-card__row">
                      <div className={focus === 'name' ? 'is-focus' : ''}>
                        <span className="pay-card__label">Intestatario</span>
                        <span className="pay-card__value">{intestatario || 'NOME COGNOME'}</span>
                      </div>
                      <div className={focus === 'exp' ? 'is-focus' : ''}>
                        <span className="pay-card__label">Scad.</span>
                        <span className="pay-card__value">{scadenza || 'MM/AA'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="pay-card__face pay-card__back">
                    <div className="pay-card__stripe" />
                    <div className="pay-card__cvv">
                      <span className="pay-card__label">CVV</span>
                      <span className="pay-card__cvv-box">{cvv || '•••'}</span>
                    </div>
                    <i className={`fa-brands ${brand.icon} pay-card__brand pay-card__brand--back`} aria-hidden="true" />
                  </div>
                </div>
              </div>

              {/* Campi */}
              <div className="pay__fields">
                <label className="pay__field pay__field--full">
                  <span>Numero carta</span>
                  <div className="pay__input-wrap">
                    <i className="fa-light fa-credit-card" aria-hidden="true" />
                    <input inputMode="numeric" placeholder="0000 0000 0000 0000" value={numero}
                      onChange={e => setNumero(fmtNumero(e.target.value))} onFocus={() => setFocus('num')} onBlur={() => setFocus(null)} />
                    <i className={`fa-brands ${brand.icon} pay__input-brand`} aria-hidden="true" />
                  </div>
                </label>
                <label className="pay__field pay__field--full">
                  <span>Intestatario</span>
                  <div className="pay__input-wrap">
                    <i className="fa-light fa-user" aria-hidden="true" />
                    <input placeholder="Nome e cognome" value={intestatario}
                      onChange={e => setIntestatario(e.target.value.toUpperCase())} onFocus={() => setFocus('name')} onBlur={() => setFocus(null)} />
                  </div>
                </label>
                <label className="pay__field">
                  <span>Scadenza</span>
                  <div className="pay__input-wrap">
                    <i className="fa-light fa-calendar" aria-hidden="true" />
                    <input inputMode="numeric" placeholder="MM/AA" value={scadenza}
                      onChange={e => setScadenza(fmtScadenza(e.target.value))} onFocus={() => setFocus('exp')} onBlur={() => setFocus(null)} />
                  </div>
                </label>
                <label className="pay__field">
                  <span>CVV</span>
                  <div className="pay__input-wrap">
                    <i className="fa-light fa-lock" aria-hidden="true" />
                    <input inputMode="numeric" placeholder="123" value={cvv}
                      onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} onFocus={() => setFocus('cvv')} onBlur={() => setFocus(null)} />
                  </div>
                </label>
                <label className="pay__save">
                  <input type="checkbox" checked={salva} onChange={e => setSalva(e.target.checked)} />
                  <span>Salva questa carta per i pagamenti futuri</span>
                </label>
              </div>
            </div>
          ) : (
            <div className="pay__card-panel pay__wallet">
              <span className="pay__wallet-ico"><i className="fa-duotone fa-wallet" aria-hidden="true" /></span>
              <h2>Sibylla wallet</h2>
              <p>Il pagamento verrà addebitato sul credito del tuo Sibylla wallet.</p>
              <div className="pay__wallet-balance">
                <span>Credito disponibile</span>
                <strong>{eur(2500)}</strong>
              </div>
            </div>
          )}
        </section>

        {/* Riepilogo */}
        <aside className="pay__summary">
          <h2 className="pay__summary-title">Riepilogo</h2>
          <div className="pay__sum-row"><span>Totale ordine</span><span>{eur(totale)}</span></div>
          {acconto && (
            <>
              <div className="pay__sum-row pay__sum-row--acc"><span>Acconto ({Math.round(accontoPct * 100)}%)</span><span>{eur(daPagare)}</span></div>
              <div className="pay__sum-row"><span>Saldo residuo</span><span>{eur(saldoResiduo)}</span></div>
            </>
          )}
          <div className="pay__sum-pay">
            <span>Ora paghi</span>
            <strong>{eur(daPagare)}</strong>
          </div>
          {acconto && (
            <p className="pay__acc-note"><i className="fa-solid fa-circle-info" aria-hidden="true" /> Il saldo residuo sarà dovuto alla scadenza indicata nell'ordine.</p>
          )}

          <button type="button" className="pay__confirm" disabled={!cartaValida} onClick={conferma}>
            <i className="fa-solid fa-lock" aria-hidden="true" /> Paga {eur(daPagare)}
          </button>

          <div className="pay__trust">
            <span><i className="fa-solid fa-shield-halved" aria-hidden="true" /> SSL 256-bit</span>
            <span><i className="fa-solid fa-building-columns" aria-hidden="true" /> 3D Secure</span>
            <span><i className="fa-solid fa-rotate-left" aria-hidden="true" /> Reso facile</span>
          </div>
          <div className="pay__accepted">
            <i className="fa-brands fa-cc-visa" aria-hidden="true" />
            <i className="fa-brands fa-cc-mastercard" aria-hidden="true" />
            <i className="fa-brands fa-cc-amex" aria-hidden="true" />
            <i className="fa-brands fa-cc-paypal" aria-hidden="true" />
          </div>
        </aside>
      </div>
    </div>
  )
}
