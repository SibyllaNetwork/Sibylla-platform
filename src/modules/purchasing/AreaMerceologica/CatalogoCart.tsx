import React, { useEffect, useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import { useCartStore, type CartItem } from '../../../store/useCartStore'
import { useConfirmStore } from '../../../store/useConfirmStore'
import { toast } from '../../../core/components/Toast/useToast'
import './CatalogoCart.sass'

/**
 * Il Mio Carrello — carrello unico della piattaforma.
 * Raccoglie tutti gli acquisti (prodotti, soggiorni, servizi) da useCartStore ed
 * è raggiungibile dall'icona carrello in Topbar. Tre viste: Aziendale, Personale
 * (contesto/wallet di pagamento) e I miei Ordini (storico).
 */

type Tab = 'aziendale' | 'personale' | 'ordini'
type SortKey = 'data' | 'prezzo-asc' | 'prezzo-desc' | 'nome'
type Metodo = 'wallet' | 'carta'

const IVA_PCT = 0.22
const ACCONTO_PCT = 0.30
const eur = (n: number) => `€ ${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const IMG = (id: string) => `https://images.unsplash.com/${id}?w=400&q=70&auto=format&fit=crop`

// ── Riga normalizzata (unifica product / stay / service) ─────────────────────
interface Row {
  id: string
  nome: string
  descrizione: string
  img: string
  prezzoUnitario: number
  prezzoOriginale?: number
  chip: string
  quantita: number
  qtaLabel: string
  contesto: Tab
  updateQty: (id: string, q: number) => void
}

// prezzo "di listino" per gli item dimostrativi (mostra sconto e risparmio)
const DEMO_ORIG: Record<string, number> = { d1: 89, d2: 52, d3: 35 }
const FREE_SHIP_THRESHOLD = 50

// ── Ordini (storico, mock in attesa API) ─────────────────────────────────────
interface Ordine {
  id: string
  numero: string
  nome: string
  descrizione: string
  img: string
  quantita: number
  prezzo: number
  data: string
}
const ORDINI: Ordine[] = [
  { id: 'o1', numero: '405-8705140-6281113', nome: 'Tour Roma',              descrizione: 'City tour panoramico di Roma con bus scoperto e guida multilingua.',  img: IMG('photo-1552832230-c0197dd311b5'), quantita: 2, prezzo: 185.93, data: '01/07/2026' },
  { id: 'o2', numero: '405-8703140-5281113', nome: 'Accesso Musei Vaticani', descrizione: 'Ingresso prioritario ai Musei Vaticani e Cappella Sistina.',           img: IMG('photo-1531572753322-ad063cecc140'), quantita: 2, prezzo: 165.93, data: '01/07/2026' },
  { id: 'o3', numero: '405-8702140-5281113', nome: 'Hidromania',             descrizione: 'Ingresso giornaliero al parco acquatico con lettino incluso.',          img: IMG('photo-1533760881669-80db4d7b341a'), quantita: 2, prezzo: 185.93, data: '01/07/2026' },
  { id: 'o4', numero: '405-8703140-5281113', nome: 'Colosseo Experience',    descrizione: 'Visita guidata del Colosseo, Foro Romano e Palatino con archeologo.',   img: IMG('photo-1552832230-c0197dd311b5'), quantita: 1, prezzo: 115.93, data: '01/07/2026' },
]

const SPEDIZIONI = [
  'Spedizione standard GRATIS · Arrivo in 4-7 giorni',
  'Spedizione express · Arrivo in 1-2 giorni (€ 9,90)',
  'Ritiro in sede · Gratuito',
]

// ── Seed dimostrativo del carrello unico (solo se vuoto) ─────────────────────
let seeded = false
function seedDemo(add: ReturnType<typeof useCartStore.getState>['addProduct']) {
  const base = {
    barcode: '', categoriaId: 'exp', unita: 'pz', quantitaUnita: 1,
    mercato: 'agora' as const, descrizione: '', immagineUrl: '',
  }
  add({ ...base, id: 'd1', prodottoId: 'd1', fornitoreId: 'f1', fornitoreNome: 'Sibylla Experience', nome: 'Tour Roma',              descrizione: 'City tour panoramico di Roma con bus scoperto e guida multilingua.', immagineUrl: IMG('photo-1552832230-c0197dd311b5'), prezzoUnitario: 72.5 }, 2)
  add({ ...base, id: 'd2', prodottoId: 'd2', fornitoreId: 'f2', fornitoreNome: 'Vatican Tickets',    nome: 'Accesso Musei Vaticani', descrizione: 'Ingresso prioritario ai Musei Vaticani e Cappella Sistina.',       immagineUrl: IMG('photo-1531572753322-ad063cecc140'), prezzoUnitario: 41 }, 2)
  add({ ...base, id: 'd3', prodottoId: 'd3', fornitoreId: 'f3', fornitoreNome: 'Aqua Park',          nome: 'Hidromania',             descrizione: 'Ingresso giornaliero al parco acquatico con lettino incluso.',      immagineUrl: IMG('photo-1533760881669-80db4d7b341a'), prezzoUnitario: 28 }, 1)
}

export default function CatalogoCart({ navigate }: { navigate: (p: string) => void }) {
  const items = useCartStore(s => s.items)
  const updateProduct = useCartStore(s => s.updateProductQuantita)
  const updateStay = useCartStore(s => s.updateStayNotti)
  const updateService = useCartStore(s => s.updateServiceQuantita)
  const removeItem = useCartStore(s => s.removeItem)
  const confirm = useConfirmStore(s => s.confirm)

  const [tab, setTab] = useState<Tab>('aziendale')
  const [sort, setSort] = useState<SortKey>('data')
  const [paga, setPaga] = useState<'intero' | 'acconto'>('intero')
  const [metodo, setMetodo] = useState<Metodo>('wallet')
  const [spedizione, setSpedizione] = useState(SPEDIZIONI[0])
  const [ordSearch, setOrdSearch] = useState('')
  const [coupon, setCoupon] = useState('')
  const [couponOk, setCouponOk] = useState(false)

  // Popola il carrello unico con contenuti dimostrativi al primo accesso
  useEffect(() => {
    if (!seeded && useCartStore.getState().items.length === 0) {
      seeded = true
      seedDemo(useCartStore.getState().addProduct)
    }
  }, [])

  const rows: Row[] = useMemo(() => items.map((it: CartItem): Row => {
    if (it.kind === 'stay') return { id: it.id, nome: it.nome, descrizione: `${it.camere} · ${it.adulti} adulti`, chip: it.location, img: it.immagineUrl, prezzoUnitario: it.prezzoPerNotte, quantita: it.notti, qtaLabel: 'notti', contesto: 'aziendale', updateQty: updateStay }
    if (it.kind === 'service') return { id: it.id, nome: it.nome, descrizione: it.durata, chip: it.citta, img: it.immagineUrl, prezzoUnitario: it.prezzoUnitario, quantita: it.quantita, qtaLabel: it.unitaPrezzo, contesto: 'personale', updateQty: updateService }
    return { id: it.id, nome: it.nome, descrizione: it.descrizione || 'Prodotto del catalogo', chip: it.fornitoreNome, img: it.immagineUrl, prezzoUnitario: it.prezzoUnitario, prezzoOriginale: DEMO_ORIG[it.id], quantita: it.quantita, qtaLabel: 'pz', contesto: 'aziendale', updateQty: updateProduct }
  }), [items, updateProduct, updateStay, updateService])

  const visible = useMemo(() => {
    const list = rows.filter(r => r.contesto === tab)
    const s = [...list]
    if (sort === 'prezzo-asc') s.sort((a, b) => a.prezzoUnitario * a.quantita - b.prezzoUnitario * b.quantita)
    else if (sort === 'prezzo-desc') s.sort((a, b) => b.prezzoUnitario * b.quantita - a.prezzoUnitario * a.quantita)
    else if (sort === 'nome') s.sort((a, b) => a.nome.localeCompare(b.nome))
    return s
  }, [rows, tab, sort])

  const subtotale = visible.reduce((acc, r) => acc + r.prezzoUnitario * r.quantita, 0)
  const risparmio = visible.reduce((acc, r) => acc + (r.prezzoOriginale ? (r.prezzoOriginale - r.prezzoUnitario) * r.quantita : 0), 0)
  const sconto = couponOk ? subtotale * 0.10 : 0
  const imponibile = subtotale - sconto
  const iva = imponibile * IVA_PCT
  const totale = imponibile + iva
  const daPagare = paga === 'acconto' ? totale * ACCONTO_PCT : totale
  const freeShipReached = subtotale >= FREE_SHIP_THRESHOLD
  const freeShipPct = Math.min(100, Math.round((subtotale / FREE_SHIP_THRESHOLD) * 100))

  const applyCoupon = () => {
    if (!coupon.trim()) return
    setCouponOk(true)
    toast.success(`Codice "${coupon.trim().toUpperCase()}" applicato · -10%`)
  }

  const remove = async (r: Row) => {
    const ok = await confirm({ title: 'Rimuovi dal carrello', message: `Rimuovere "${r.nome}" dal carrello?`, confirmLabel: 'Rimuovi', danger: true })
    if (ok) { removeItem(r.id); toast.success(`"${r.nome}" rimosso dal carrello`) }
  }

  const pagaOra = () => {
    if (visible.length === 0) { toast.warning('Il carrello è vuoto'); return }
    toast.success(`Pagamento di ${eur(daPagare)} avviato · ${metodo === 'wallet' ? 'Sibylla wallet' : 'Carta di credito'}`)
  }

  const ordiniFiltrati = ORDINI.filter(o => !ordSearch || o.nome.toLowerCase().includes(ordSearch.toLowerCase()) || o.numero.includes(ordSearch))

  return (
    <div className="cart">
      <BtnBack onClick={() => navigate('area-merceologica')} />

      <header className="cart__head">
        <h1 className="cart__title"><i className="fa-duotone fa-cart-shopping" aria-hidden="true" /> Il Mio Carrello</h1>
        <p className="cart__subtitle">Tutti i tuoi acquisti in un unico posto</p>
      </header>

      {/* Tabs */}
      <div className="cart__tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'aziendale'} className={`cart__tab ${tab === 'aziendale' ? 'is-active' : ''}`} onClick={() => setTab('aziendale')}>
          <i className="fa-duotone fa-briefcase" aria-hidden="true" /> Aziendale
          <span className="cart__tab-count">{rows.filter(r => r.contesto === 'aziendale').length}</span>
        </button>
        <button role="tab" aria-selected={tab === 'personale'} className={`cart__tab ${tab === 'personale' ? 'is-active' : ''}`} onClick={() => setTab('personale')}>
          <i className="fa-duotone fa-user" aria-hidden="true" /> Personale
          <span className="cart__tab-count">{rows.filter(r => r.contesto === 'personale').length}</span>
        </button>
        <button role="tab" aria-selected={tab === 'ordini'} className={`cart__tab ${tab === 'ordini' ? 'is-active' : ''}`} onClick={() => setTab('ordini')}>
          <i className="fa-duotone fa-box-open" aria-hidden="true" /> I miei Ordini
        </button>
      </div>

      {tab === 'ordini' ? (
        <section className="cart__orders">
          <div className="cart__orders-bar">
            <div className="cart__search">
              <i className="fa-light fa-magnifying-glass" aria-hidden="true" />
              <input type="search" placeholder="Cerca tra i tuoi ordini" value={ordSearch} onChange={e => setOrdSearch(e.target.value)} />
            </div>
            <span className="cart__orders-count">{ordiniFiltrati.length} ordini effettuati</span>
          </div>
          <div className="cart__orders-list">
            {ordiniFiltrati.map(o => (
              <article key={o.id} className="order-card">
                <div className="order-card__img" style={{ backgroundImage: `url(${o.img})` }} role="img" aria-label={o.nome} />
                <div className="order-card__body">
                  <h3 className="order-card__name">{o.nome}</h3>
                  <p className="order-card__desc">{o.descrizione}</p>
                  <span className="order-card__qty">Quantità: <strong>{o.quantita}</strong></span>
                </div>
                <div className="order-card__side">
                  <span className="order-card__num">Ordine # {o.numero}</span>
                  <span className="order-card__price">{eur(o.prezzo)}</span>
                  <span className="order-card__date">Acquistato il {o.data}</span>
                  <div className="order-card__actions">
                    <button type="button" className="order-card__link" onClick={() => toast.info(`Download fattura ordine ${o.numero}`)}>
                      <i className="fa-light fa-file-arrow-down" aria-hidden="true" /> Scarica Fattura/Ricevuta
                    </button>
                    <button type="button" className="sib-btn sib-btn--secondary order-card__buy" onClick={() => navigate('area-merceologica')}>
                      <i className="fa-light fa-rotate-right" aria-hidden="true" /> Compra di nuovo
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {ordiniFiltrati.length === 0 && <div className="cart__empty-inline">Nessun ordine trovato.</div>}
          </div>
        </section>
      ) : (
        <div className="cart__layout">
          {/* Colonna sinistra: item */}
          <section className="cart__items">
            <div className="cart__items-bar">
              <span className="cart__items-count">{visible.length} {visible.length === 1 ? 'articolo' : 'articoli'}</span>
              <label className="cart__sort">
                Ordina
                <select value={sort} onChange={e => setSort(e.target.value as SortKey)}>
                  <option value="data">Più recenti</option>
                  <option value="prezzo-asc">Prezzo crescente</option>
                  <option value="prezzo-desc">Prezzo decrescente</option>
                  <option value="nome">Nome</option>
                </select>
              </label>
            </div>

            {visible.length === 0 ? (
              <div className="cart__empty">
                <i className="fa-duotone fa-cart-shopping" aria-hidden="true" />
                <p>Il carrello {tab === 'aziendale' ? 'aziendale' : 'personale'} è vuoto.</p>
                <button type="button" className="sib-btn sib-btn--primary" onClick={() => navigate('area-merceologica')}>Esplora il catalogo</button>
              </div>
            ) : visible.map((r, i) => {
              const scontoPct = r.prezzoOriginale ? Math.round((1 - r.prezzoUnitario / r.prezzoOriginale) * 100) : 0
              return (
              <article key={r.id} className="cart-item" data-tone={i % 4}>
                <div className="cart-item__img" style={{ backgroundImage: `url(${r.img})` }} role="img" aria-label={r.nome}>
                  {!r.img && <i className="fa-light fa-image" aria-hidden="true" />}
                  {scontoPct > 0 && <span className="cart-item__badge">-{scontoPct}%</span>}
                </div>
                <div className="cart-item__info">
                  <span className="cart-item__chip"><i className="fa-solid fa-store" aria-hidden="true" />{r.chip}</span>
                  <h3 className="cart-item__name">{r.nome}</h3>
                  <p className="cart-item__desc">{r.descrizione}</p>
                  <div className="cart-item__qty" role="group" aria-label="Quantità">
                    <button type="button" onClick={() => r.updateQty(r.id, r.quantita - 1)} aria-label="Diminuisci"><i className="fa-light fa-minus" aria-hidden="true" /></button>
                    <span>{r.quantita}<em>{r.qtaLabel}</em></span>
                    <button type="button" onClick={() => r.updateQty(r.id, r.quantita + 1)} aria-label="Aumenta"><i className="fa-light fa-plus" aria-hidden="true" /></button>
                  </div>
                </div>
                <div className="cart-item__right">
                  {r.prezzoOriginale && <span className="cart-item__old">{eur(r.prezzoOriginale * r.quantita)}</span>}
                  <span className="cart-item__price">{eur(r.prezzoUnitario * r.quantita)}</span>
                  <span className="cart-item__unit">{eur(r.prezzoUnitario)} / {r.qtaLabel}</span>
                  <button type="button" className="cart-item__remove" onClick={() => remove(r)} aria-label="Rimuovi">
                    <i className="fa-light fa-trash-can" aria-hidden="true" />
                  </button>
                </div>
              </article>
              )
            })}
          </section>

          {/* Colonna destra: riepilogo */}
          <aside className="cart__summary">
            <h2 className="cart__summary-title">Riepilogo</h2>

            {/* Barra spedizione gratuita */}
            <div className="cart__ship-progress">
              <div className="cart__ship-progress-head">
                <span><i className="fa-solid fa-truck-fast" aria-hidden="true" /> {freeShipReached ? 'Spedizione gratuita sbloccata!' : `Ti mancano ${eur(FREE_SHIP_THRESHOLD - subtotale)} alla spedizione gratuita`}</span>
                {freeShipReached && <i className="fa-solid fa-circle-check" aria-hidden="true" />}
              </div>
              <div className="cart__ship-bar"><span style={{ width: `${freeShipPct}%` }} /></div>
            </div>

            <div className="cart__sum-row"><span>Subtotale</span><span>{eur(subtotale)}</span></div>
            {risparmio > 0 && <div className="cart__sum-row cart__sum-row--save"><span>Risparmi</span><span>− {eur(risparmio)}</span></div>}
            {sconto > 0 && <div className="cart__sum-row cart__sum-row--save"><span>Codice sconto</span><span>− {eur(sconto)}</span></div>}
            <div className="cart__sum-row"><span>Spedizione</span><span className="cart__free">Gratis</span></div>
            <label className="cart__ship-select">
              <select value={spedizione} onChange={e => setSpedizione(e.target.value)}>
                {SPEDIZIONI.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>

            {/* Codice sconto */}
            <div className="cart__coupon">
              <i className="fa-solid fa-tag" aria-hidden="true" />
              <input type="text" placeholder="Codice sconto" value={coupon} onChange={e => { setCoupon(e.target.value); setCouponOk(false) }} />
              <button type="button" onClick={applyCoupon} disabled={!coupon.trim()}>Applica</button>
            </div>

            <div className="cart__sum-row"><span>IVA ({Math.round(IVA_PCT * 100)}%)</span><span>{eur(iva)}</span></div>
            <div className="cart__sum-total"><span>Totale</span><span>{eur(totale)}</span></div>

            {/* Modalità di pagamento */}
            <div className="cart__pay-mode">
              <button type="button" className={`cart__pay-opt ${paga === 'intero' ? 'is-on' : ''}`} onClick={() => setPaga('intero')}>
                <span className="cart__radio" /> Paga per intero
              </button>
              <button type="button" className={`cart__pay-opt ${paga === 'acconto' ? 'is-on' : ''}`} onClick={() => setPaga('acconto')}>
                <span className="cart__radio" /> Paga acconto <em>({Math.round(ACCONTO_PCT * 100)}%)</em>
              </button>
            </div>

            {/* Metodo */}
            <div className="cart__methods">
              <button type="button" className={`cart__method ${metodo === 'wallet' ? 'is-on' : ''}`} onClick={() => setMetodo('wallet')}>
                <i className="fa-duotone fa-wallet" aria-hidden="true" />
                <span>Sibylla wallet</span>
              </button>
              <button type="button" className={`cart__method ${metodo === 'carta' ? 'is-on' : ''}`} onClick={() => setMetodo('carta')}>
                <i className="fa-duotone fa-credit-card" aria-hidden="true" />
                <span>Carta di credito</span>
              </button>
            </div>

            <button type="button" className="cart__pay-btn" onClick={pagaOra}>
              <i className="fa-solid fa-lock" aria-hidden="true" /> Paga ora · {eur(daPagare)}
            </button>

            <div className="cart__trust">
              <span><i className="fa-solid fa-shield-halved" aria-hidden="true" /> Pagamento sicuro</span>
              <span><i className="fa-solid fa-rotate-left" aria-hidden="true" /> Reso facile</span>
              <span><i className="fa-solid fa-headset" aria-hidden="true" /> Assistenza 24/7</span>
            </div>

            <div className="cart__cards">
              <i className="fa-brands fa-cc-visa" aria-hidden="true" />
              <i className="fa-brands fa-cc-mastercard" aria-hidden="true" />
              <i className="fa-brands fa-cc-amex" aria-hidden="true" />
              <i className="fa-brands fa-cc-paypal" aria-hidden="true" />
              <i className="fa-brands fa-cc-diners-club" aria-hidden="true" />
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
