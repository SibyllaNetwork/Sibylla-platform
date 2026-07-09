import React, { useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import { Icon } from '../_shared/Icon'
import { InputField, TextareaField } from '../../../core/components/form'
import { useCartStore, type ProductCartItem } from '../../../store/useCartStore'
import './CatalogoCheckout.sass'

type Pagamento = 'bonifico' | 'carta' | 'wallet-aziendale' | 'wallet-personale'

const PAGAMENTI: Array<{ id: Pagamento; label: string; desc: string; icon: string }> = [
  { id: 'bonifico',         label: 'Bonifico bancario',  desc: 'IBAN inviato via email',          icon: 'building-columns' },
  { id: 'carta',            label: 'Carta di credito',   desc: 'Visa, Mastercard, AMEX',          icon: 'credit-card' },
  { id: 'wallet-aziendale', label: 'Wallet aziendale',   desc: 'Credito della struttura',         icon: 'wallet' },
  { id: 'wallet-personale', label: 'Wallet personale',   desc: 'Credito personale',               icon: 'user' },
]

export default function CatalogoCheckout({ navigate }: { navigate: (p: string) => void }) {
  const items = useCartStore(s => s.items)
  const clearCart = useCartStore(s => s.clearCart)

  const prodotti = items.filter((i): i is ProductCartItem => i.kind === 'product')
  const totale = prodotti.reduce((acc, p) => acc + p.prezzoUnitario * p.quantita, 0)

  const [pagamento, setPagamento] = useState<Pagamento>('bonifico')
  const [done, setDone] = useState<string | null>(null)
  const [form, setForm] = useState({ nome: '', email: '', telefono: '', indirizzo: '', citta: '', cap: '', note: '' })
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const valid = form.nome.trim() && form.email.trim() && form.indirizzo.trim() && form.citta.trim() && form.cap.trim()

  const handleConfirm = () => {
    if (!valid || prodotti.length === 0) return
    const code = 'ORD-' + Math.random().toString(36).slice(2, 9).toUpperCase()
    clearCart()
    setDone(code)
  }

  if (done) {
    return (
      <div className="catalogo-checkout">
        <div className="ck__success">
          <span className="ck__success-ico"><Icon family="regular" name="circle-check" /></span>
          <h1 className="ck__success-title">Ordine confermato</h1>
          <p className="ck__success-sub">Grazie! Il tuo ordine <strong>{done}</strong> è stato registrato.</p>
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => navigate('area-merceologica')}>
            Torna al catalogo
          </button>
        </div>
      </div>
    )
  }

  if (prodotti.length === 0) {
    return (
      <div className="catalogo-checkout">
        <PageHead title="Checkout" subtitle="Il carrello è vuoto." onBack={() => navigate('catalogo-cart')} />
        <button type="button" className="sib-btn sib-btn--primary" onClick={() => navigate('area-merceologica')}>
          Esplora il catalogo
        </button>
      </div>
    )
  }

  return (
    <div className="catalogo-checkout">
      <PageHead title="Checkout" subtitle="Completa i dati e conferma l'acquisto" onBack={() => navigate('catalogo-cart')} />

      <div className="ck__layout">
        <div className="ck__form">
          <section className="ck__section">
            <h2 className="ck__section-title">Dati di consegna</h2>
            <div className="ck__grid">
              <InputField
                name="nome"
                label="Nome completo"
                required
                className="ck__field ck__field--full"
                value={form.nome}
                onChange={e => set('nome', e.target.value)}
                placeholder="Mario Rossi"
              />
              <InputField
                name="email"
                label="Email"
                required
                type="email"
                className="ck__field"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="mario@struttura.it"
              />
              <InputField
                name="telefono"
                label="Telefono"
                className="ck__field"
                value={form.telefono}
                onChange={e => set('telefono', e.target.value)}
                placeholder="+39 ..."
              />
              <InputField
                name="indirizzo"
                label="Indirizzo"
                required
                className="ck__field ck__field--full"
                value={form.indirizzo}
                onChange={e => set('indirizzo', e.target.value)}
                placeholder="Via, civico"
              />
              <InputField
                name="citta"
                label="Città"
                required
                className="ck__field"
                value={form.citta}
                onChange={e => set('citta', e.target.value)}
                placeholder="Città"
              />
              <InputField
                name="cap"
                label="CAP"
                required
                className="ck__field"
                value={form.cap}
                onChange={e => set('cap', e.target.value)}
                placeholder="00000"
              />
              <TextareaField
                name="note"
                label="Note"
                rows={2}
                className="ck__field ck__field--full ck__textarea"
                value={form.note}
                onChange={e => set('note', e.target.value)}
                placeholder="Note per la consegna (facoltativo)"
              />
            </div>
          </section>

          <section className="ck__section">
            <h2 className="ck__section-title">Metodo di pagamento</h2>
            <div className="ck__pay">
              {PAGAMENTI.map(m => (
                <label key={m.id} className={`ck-pay${pagamento === m.id ? ' ck-pay--on' : ''}`}>
                  <input type="radio" name="ck-pay" value={m.id} checked={pagamento === m.id} onChange={() => setPagamento(m.id)} />
                  <span className="ck-pay__ico"><Icon family="regular" name={m.icon} /></span>
                  <span className="ck-pay__text">
                    <span className="ck-pay__label">{m.label}</span>
                    <span className="ck-pay__desc">{m.desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <aside className="ck__summary">
          <h3 className="ck__summary-title">Riepilogo ordine</h3>
          <ul className="ck__lines">
            {prodotti.map(p => (
              <li key={p.id} className="ck__line">
                <span className="ck__line-name">{p.nome} <em>×{p.quantita}</em></span>
                <span className="ck__line-price">€ {(p.prezzoUnitario * p.quantita).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div className="ck__summary-row">
            <span>Spedizione</span>
            <span className="ck__free">Gratis</span>
          </div>
          <div className="ck__summary-total">
            <span>Totale</span>
            <span>€ {totale.toFixed(2)}</span>
          </div>
          <button type="button" className="sib-btn sib-btn--primary ck__confirm" onClick={handleConfirm} disabled={!valid}>
            <Icon family="regular" name="lock" /> Conferma e acquista
          </button>
          {!valid && <p className="ck__hint">Compila i campi obbligatori (*) per confermare.</p>}
        </aside>
      </div>
    </div>
  )
}
