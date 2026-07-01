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

const PROVINCE = ['AG', 'AL', 'AN', 'AO', 'BA', 'BO', 'BS', 'CA', 'CT', 'FI', 'GE', 'MI', 'NA', 'PA', 'RM', 'TO', 'VE', 'VR']

export default function CatalogoPagamento({ navigate }: { navigate: (p: string) => void }) {
  const { totale, acconto, accontoPct, metodo, items } = useCheckoutStore()
  const clearCart = useCartStore(s => s.clearCart)

  const daPagare = acconto ? totale * accontoPct : totale
  const saldoResiduo = totale - daPagare
  const subtotale = items.reduce((a, it) => a + it.prezzo, 0)

  const [metodoSel, setMetodoSel] = useState<MetodoPagamento>(metodo)
  const [numero, setNumero] = useState('')
  const [intestatario, setIntestatario] = useState('')
  const [scadenza, setScadenza] = useState('')
  const [cvv, setCvv] = useState('')
  const [salva, setSalva] = useState(false)
  const [focus, setFocus] = useState<Focus>(null)
  const [done, setDone] = useState<string | null>(null)

  // contatti + spedizione
  const [c, setC] = useState({ email: '', tel: '', nome: '', indirizzo: '', civico: '', citta: '', cap: '', prov: '', note: '' })
  const setField = (k: keyof typeof c, v: string) => setC(p => ({ ...p, [k]: v }))

  const brand = useMemo(() => brandOf(numero), [numero])
  const numeroOk = numero.replace(/\s/g, '').length === 16
  const scadenzaOk = /^\d{2}\/\d{2}$/.test(scadenza)
  const cvvOk = /^\d{3,4}$/.test(cvv)
  const cartaValida = metodoSel !== 'carta' || (numeroOk && intestatario.trim().length > 2 && scadenzaOk && cvvOk)
  const contattiOk = /.+@.+\..+/.test(c.email) && c.nome.trim() && c.indirizzo.trim() && c.citta.trim() && c.cap.trim()
  const canPay = cartaValida && !!contattiOk

  const conferma = () => {
    if (!canPay) { toast.warning('Completa i dati di contatto, spedizione e pagamento'); return }
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
          <p className="pay__success-code">Ordine <strong>{done}</strong> · spedizione a {c.citta || '—'}</p>
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

      <ol className="pay__steps">
        {STEPS.map((s, i) => (
          <li key={s} className={`pay__step ${i < 1 ? 'is-done' : ''} ${i === 1 ? 'is-active' : ''}`}>
            <span className="pay__step-dot">{i < 1 ? <i className="fa-solid fa-check" aria-hidden="true" /> : i + 1}</span>
            <span className="pay__step-label">{s}</span>
          </li>
        ))}
      </ol>

      <div className="pay__layout">
        {/* ── Colonna pagamento (stretta) ── */}
        <section className="pay__pay-col">
          <div className="pay__method-switch" role="tablist">
            <button role="tab" aria-selected={metodoSel === 'carta'} className={`pay__ms ${metodoSel === 'carta' ? 'is-on' : ''}`} onClick={() => setMetodoSel('carta')}>
              <i className="fa-duotone fa-credit-card" aria-hidden="true" /> Carta
            </button>
            <button role="tab" aria-selected={metodoSel === 'wallet'} className={`pay__ms ${metodoSel === 'wallet' ? 'is-on' : ''}`} onClick={() => setMetodoSel('wallet')}>
              <i className="fa-duotone fa-wallet" aria-hidden="true" /> Wallet
            </button>
          </div>

          <div className="pay__card-panel">
            {metodoSel === 'carta' ? (
              <>
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
                    <span>Salva questa carta</span>
                  </label>
                </div>
              </>
            ) : (
              <div className="pay__wallet">
                <span className="pay__wallet-ico"><i className="fa-duotone fa-wallet" aria-hidden="true" /></span>
                <h2>Sibylla wallet</h2>
                <p>Addebito sul credito del tuo wallet.</p>
                <div className="pay__wallet-balance"><span>Credito disponibile</span><strong>{eur(2500)}</strong></div>
              </div>
            )}
          </div>

          <button type="button" className="pay__confirm" disabled={!canPay} onClick={conferma}>
            <i className="fa-solid fa-lock" aria-hidden="true" /> Paga {eur(daPagare)}
          </button>
          <p className="pay__secure"><i className="fa-solid fa-shield-halved" aria-hidden="true" /> Transazione protetta · SSL 256-bit · 3D Secure</p>
        </section>

        {/* ── Colonna info (riepilogo + spedizione + contatti) ── */}
        <section className="pay__info-col">

          {/* Riepilogo acquisti */}
          <div className="pay__box">
            <h2 className="pay__box-title"><i className="fa-duotone fa-bag-shopping" aria-hidden="true" /> Riepilogo acquisti</h2>
            <ul className="pay__items">
              {items.length === 0 && <li className="pay__items-empty">Nessun articolo.</li>}
              {items.map(it => (
                <li key={it.id} className="pay__item">
                  <span className="pay__item-img" style={{ backgroundImage: `url(${it.img})` }} />
                  <span className="pay__item-name">{it.nome}</span>
                  <span className="pay__item-qty">×{it.qta}</span>
                  <span className="pay__item-price">{eur(it.prezzo)}</span>
                </li>
              ))}
            </ul>
            <div className="pay__totals">
              <div className="pay__t-row"><span>Subtotale</span><span>{eur(subtotale)}</span></div>
              <div className="pay__t-row"><span>Spedizione</span><span className="pay__free">Gratis</span></div>
              <div className="pay__t-row pay__t-row--tot"><span>Totale ordine</span><span>{eur(totale)}</span></div>
              {acconto && (
                <>
                  <div className="pay__t-row pay__t-row--acc"><span>Acconto ({Math.round(accontoPct * 100)}%)</span><span>{eur(daPagare)}</span></div>
                  <div className="pay__t-row"><span>Saldo residuo</span><span>{eur(saldoResiduo)}</span></div>
                </>
              )}
              <div className="pay__t-pay"><span>Ora paghi</span><strong>{eur(daPagare)}</strong></div>
            </div>
          </div>

          {/* Indirizzo di spedizione */}
          <div className="pay__box">
            <h2 className="pay__box-title"><i className="fa-duotone fa-truck" aria-hidden="true" /> Indirizzo di spedizione</h2>
            <div className="pay__grid">
              <label className="pay__field pay__field--full"><span>Destinatario</span>
                <div className="pay__input-wrap"><input placeholder="Nome e cognome / Azienda" value={c.nome} onChange={e => setField('nome', e.target.value)} /></div>
              </label>
              <label className="pay__field pay__field--wide"><span>Indirizzo</span>
                <div className="pay__input-wrap"><input placeholder="Via / Piazza" value={c.indirizzo} onChange={e => setField('indirizzo', e.target.value)} /></div>
              </label>
              <label className="pay__field"><span>Civico</span>
                <div className="pay__input-wrap"><input placeholder="N." value={c.civico} onChange={e => setField('civico', e.target.value)} /></div>
              </label>
              <label className="pay__field"><span>Città</span>
                <div className="pay__input-wrap"><input placeholder="Città" value={c.citta} onChange={e => setField('citta', e.target.value)} /></div>
              </label>
              <label className="pay__field"><span>CAP</span>
                <div className="pay__input-wrap"><input inputMode="numeric" placeholder="00000" value={c.cap} onChange={e => setField('cap', e.target.value.replace(/\D/g, '').slice(0, 5))} /></div>
              </label>
              <label className="pay__field"><span>Provincia</span>
                <div className="pay__input-wrap pay__input-wrap--select">
                  <select value={c.prov} onChange={e => setField('prov', e.target.value)}>
                    <option value="">—</option>
                    {PROVINCE.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </label>
              <label className="pay__field pay__field--full"><span>Note per il corriere (facoltativo)</span>
                <div className="pay__input-wrap"><input placeholder="Es. citofono, orari…" value={c.note} onChange={e => setField('note', e.target.value)} /></div>
              </label>
            </div>
          </div>

          {/* Recapiti di contatto */}
          <div className="pay__box">
            <h2 className="pay__box-title"><i className="fa-duotone fa-address-card" aria-hidden="true" /> Recapiti di contatto</h2>
            <div className="pay__grid">
              <label className="pay__field"><span>Email</span>
                <div className="pay__input-wrap"><i className="fa-light fa-envelope" aria-hidden="true" /><input type="email" placeholder="nome@dominio.it" value={c.email} onChange={e => setField('email', e.target.value)} /></div>
              </label>
              <label className="pay__field"><span>Telefono</span>
                <div className="pay__input-wrap"><i className="fa-light fa-phone" aria-hidden="true" /><input type="tel" placeholder="+39 ..." value={c.tel} onChange={e => setField('tel', e.target.value)} /></div>
              </label>
            </div>
            <p className="pay__hint"><i className="fa-solid fa-circle-info" aria-hidden="true" /> Useremo questi recapiti per conferma d'ordine e aggiornamenti sulla spedizione.</p>
          </div>

        </section>
      </div>
    </div>
  )
}
