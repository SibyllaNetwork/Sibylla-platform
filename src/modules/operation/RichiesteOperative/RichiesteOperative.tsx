import React, { useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import { SelectField, TextareaField, DateRangeField } from '../../../core/components/form'
import { PRENS, STRUTTURE as PLANNER_STRUTTURE } from '../planner/planner.data'
import {
  useRichiesteOperativeStore,
  STATO_RICHIESTA_META,
  type RichiestaOperativa,
  type ServizioSel,
} from '../../../store/useRichiesteOperativeStore'
import './RichiesteOperative.sass'

// ─── Catalogo extra (stile "pacchetti dinamici") ──────────────────────────────
//  Extra che il Tour Operator può far trovare in camera ai propri clienti.
interface ServiceSub { id: string; label: string; icon: string }
interface ServiceCategory { id: string; title: string; icon: string; accent: string; subs: ServiceSub[] }

const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: 'camera', title: 'Camera & Allestimenti', icon: 'bed', accent: 'sleep',
    subs: [
      { id: 'fiori',       label: 'Fiori freschi',         icon: 'flower' },
      { id: 'romantico',   label: 'Allestimento romantico', icon: 'heart' },
      { id: 'palloncini',  label: 'Palloncini',            icon: 'gift' },
      { id: 'biglietto',   label: 'Biglietto di benvenuto', icon: 'envelope-open-text' },
    ],
  },
  {
    id: 'fb', title: 'Food & Beverage', icon: 'champagne-glasses', accent: 'taste',
    subs: [
      { id: 'champagne', label: 'Champagne',          icon: 'champagne-glasses' },
      { id: 'vino',      label: 'Vino pregiato',      icon: 'wine-bottle' },
      { id: 'torta',     label: 'Torta',              icon: 'cake-candles' },
      { id: 'frutta',    label: 'Cesto di frutta',    icon: 'apple-whole' },
      { id: 'cesto',     label: 'Cesto di benvenuto', icon: 'basket-shopping' },
    ],
  },
  {
    id: 'benessere', title: 'Benessere', icon: 'spa', accent: 'services',
    subs: [
      { id: 'spa',       label: 'Accesso Spa',  icon: 'spa' },
      { id: 'massaggio', label: 'Massaggio',    icon: 'hand-sparkles' },
    ],
  },
  {
    id: 'trasporti', title: 'Trasporti', icon: 'car', accent: 'services',
    subs: [
      { id: 'transfer', label: 'Transfer aeroporto', icon: 'plane' },
      { id: 'ncc',      label: 'Auto con autista',   icon: 'car' },
    ],
  },
  {
    id: 'esperienze', title: 'Esperienze', icon: 'compass', accent: 'adventure',
    subs: [
      { id: 'tour',    label: 'Tour guidato',     icon: 'landmark' },
      { id: 'eventi',  label: 'Biglietti eventi', icon: 'ticket' },
    ],
  },
]

const SUB_INDEX: Record<string, { sub: ServiceSub; cat: ServiceCategory }> = {}
for (const cat of SERVICE_CATEGORIES) for (const sub of cat.subs) SUB_INDEX[sub.id] = { sub, cat }

// Prenotazioni del TO disponibili (dal planner), deduplicate per booking.
interface BookingOpt { booking: string; nominativo: string; checkIn: string; checkOut: string; numeroCamera: string }
const TO_BOOKINGS: BookingOpt[] = (() => {
  const seen = new Set<string>()
  const out: BookingOpt[] = []
  for (const p of PRENS) {
    if (p.nominativo !== 'Tour Operator Test' || seen.has(p.booking)) continue
    seen.add(p.booking)
    out.push({ booking: p.booking, nominativo: p.cliente || p.nominativo, checkIn: p.checkIn, checkOut: p.checkOut, numeroCamera: p.numeroCamera })
  }
  return out
})()

const CITTA = ['Roma', 'Milano', 'Firenze', 'Venezia']

const fmtIt = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const fmtShort = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) : '—'

// ─── Pagina ───────────────────────────────────────────────────────────────────
export default function RichiesteOperative({ navigate }: { navigate: (p: string) => void }) {
  const richieste = useRichiesteOperativeStore((s) => s.richieste)
  const invia = useRichiesteOperativeStore((s) => s.invia)
  const remove = useRichiesteOperativeStore((s) => s.remove)

  // Stato del composer.
  const [citta, setCitta] = useState('Roma')
  const [struttura, setStruttura] = useState(PLANNER_STRUTTURE[0])
  const [bookingId, setBookingId] = useState('')
  const [dal, setDal] = useState('')
  const [al, setAl] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set([SERVICE_CATEGORIES[0].id]))
  const [selectedSubs, setSelectedSubs] = useState<Set<string>>(new Set())
  const [inviata, setInviata] = useState(false)
  const [errore, setErrore] = useState('')

  const bookingSel = TO_BOOKINGS.find((b) => b.booking === bookingId) || null

  const serviziScelti: ServizioSel[] = useMemo(
    () =>
      Array.from(selectedSubs)
        .map((id) => SUB_INDEX[id])
        .filter(Boolean)
        .map(({ sub, cat }) => ({
          id: sub.id, label: sub.label, icon: sub.icon, categoryId: cat.id, categoryLabel: cat.title,
        })),
    [selectedSubs],
  )

  const toggleCat = (id: string) =>
    setExpanded((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })

  const toggleSub = (id: string) => {
    setInviata(false)
    setSelectedSubs((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  // Selezionando la prenotazione si precompila il periodo dal planner.
  const handleBooking = (v: string) => {
    setBookingId(v)
    setInviata(false)
    const b = TO_BOOKINGS.find((x) => x.booking === v)
    if (b) { setDal(b.checkIn); setAl(b.checkOut) }
  }

  const reset = () => {
    setCitta('Roma')
    setStruttura(PLANNER_STRUTTURE[0])
    setBookingId('')
    setDal('')
    setAl('')
    setDescrizione('')
    setSelectedSubs(new Set())
    setExpanded(new Set([SERVICE_CATEGORIES[0].id]))
    setErrore('')
  }

  const handleInvia = () => {
    if (!bookingId || !descrizione.trim()) {
      setErrore('Seleziona una prenotazione e descrivi la richiesta prima di inviarla.')
      return
    }
    invia({
      bookingId,
      nominativo: bookingSel?.nominativo ?? '',
      strutturaNome: struttura,
      citta,
      dalISO: dal,
      alISO: al,
      descrizione: descrizione.trim(),
      servizi: serviziScelti,
    })
    reset()
    setInviata(true)
  }

  return (
    <div className="rich-op">
      <BtnBack />
      <PageHeader
        title="Richieste operative"
        subtitle="Invia alla struttura di destinazione gli extra da far trovare in camera ai tuoi clienti (fiori, champagne, allestimenti…)"
      />

      {/* ── Composer: form a sinistra, extra a destra ───────────────────────── */}
      <div className="rich-op__composer">
        <section className="rich-op__form">
          <header className="rich-op__form-head">
            <span className="rich-op__form-num">1</span>
            <div>
              <h2 className="rich-op__form-title">Nuova richiesta operativa</h2>
              <p className="rich-op__form-hint">Destinazione, prenotazione di riferimento e dettaglio della richiesta.</p>
            </div>
          </header>

          <div className="rich-op__grid">
            <SelectField
              label="Città"
              name="citta"
              value={citta}
              options={CITTA.map((c) => ({ value: c, label: c }))}
              onChange={(e) => { setCitta(e.target.value); setInviata(false) }}
            />
            <SelectField
              label="Struttura"
              name="struttura"
              value={struttura}
              options={PLANNER_STRUTTURE.map((s) => ({ value: s, label: s }))}
              onChange={(e) => { setStruttura(e.target.value); setInviata(false) }}
            />
            <SelectField
              label="Prenotazione"
              name="prenotazione"
              placeholder="Seleziona prenotazione"
              value={bookingId}
              options={TO_BOOKINGS.map((b) => ({
                value: b.booking,
                label: `#${b.booking} · ${b.nominativo} · ${fmtShort(b.checkIn)}→${fmtShort(b.checkOut)}`,
              }))}
              onChange={(e) => handleBooking(e.target.value)}
            />
            <DateRangeField
              label="Calendario"
              nameFrom="dal"
              nameTo="al"
              valueFrom={dal}
              valueTo={al}
              onChangeFrom={(e) => { setDal(e.target.value); setInviata(false) }}
              onChangeTo={(e) => { setAl(e.target.value); setInviata(false) }}
            />
          </div>

          <TextareaField
            label="Descrizione"
            name="descrizione"
            placeholder="Es. Far trovare in camera un mazzo di fiori e una bottiglia di champagne all'arrivo dei clienti…"
            rows={5}
            value={descrizione}
            onChange={(e) => { setDescrizione(e.target.value); setInviata(false) }}
          />

          {/* Recap extra scelti */}
          <div className="rich-op__chosen">
            <span className="rich-op__chosen-label">Extra richiesti</span>
            {serviziScelti.length === 0 ? (
              <span className="rich-op__chosen-empty">Nessun extra · aggiungili dal pannello a fianco</span>
            ) : (
              <div className="rich-op__chosen-tags">
                {serviziScelti.map((s) => (
                  <button key={s.id} type="button" className="rich-op__tag" title="Rimuovi" onClick={() => toggleSub(s.id)}>
                    <i className={`fa-light fa-${s.icon}`} aria-hidden="true" />
                    {s.label}
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {errore && (
            <p className="rich-op__error" role="alert">
              <i className="fa-light fa-circle-exclamation" aria-hidden="true" /> {errore}
            </p>
          )}
          {inviata && (
            <p className="rich-op__sent" role="status">
              <i className="fa-light fa-circle-check" aria-hidden="true" /> Richiesta inviata: la struttura la riceve nel Centro notifiche e nel Planner.
            </p>
          )}

          <div className="rich-op__actions">
            <button type="button" className="sib-btn sib-btn--ghost" onClick={reset}>
              <i className="fa-light fa-arrow-rotate-left" aria-hidden="true" /> Reset
            </button>
            <button type="button" className="sib-btn sib-btn--primary sib-btn--lg" onClick={handleInvia}>
              <i className="fa-light fa-paper-plane" aria-hidden="true" /> Invia richiesta
            </button>
          </div>
        </section>

        {/* ── Scegli gli extra (stile pacchetti dinamici) ─────────────────────── */}
        <aside className="rich-op__services">
          <header className="rich-op__form-head">
            <span className="rich-op__form-num">2</span>
            <div>
              <h2 className="rich-op__form-title">Scegli i servizi</h2>
              <p className="rich-op__form-hint">Espandi una categoria e aggiungi gli extra alla richiesta.</p>
            </div>
          </header>

          <div className="rich-op__cat-list">
            {SERVICE_CATEGORIES.map((cat) => {
              const isOpen = expanded.has(cat.id)
              const count = cat.subs.filter((s) => selectedSubs.has(s.id)).length
              return (
                <div
                  key={cat.id}
                  className={`rich-op__cat${isOpen ? ' rich-op__cat--open' : ''}${count > 0 ? ' rich-op__cat--active' : ''}`}
                  data-accent={cat.accent}
                >
                  <button type="button" className="rich-op__cat-head" onClick={() => toggleCat(cat.id)} aria-expanded={isOpen}>
                    <span className="rich-op__cat-icon"><i className={`fa-light fa-${cat.icon}`} aria-hidden="true" /></span>
                    <span className="rich-op__cat-title">{cat.title}</span>
                    {count > 0 && <span className="rich-op__cat-count">{count}</span>}
                    <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'} rich-op__cat-chev`} aria-hidden="true" />
                  </button>
                  {isOpen && (
                    <div className="rich-op__cat-body">
                      {cat.subs.map((sub) => {
                        const active = selectedSubs.has(sub.id)
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            className={`rich-op__chip${active ? ' rich-op__chip--active' : ''}`}
                            onClick={() => toggleSub(sub.id)}
                            aria-pressed={active}
                          >
                            <i className={`fa-light fa-${sub.icon}`} aria-hidden="true" />
                            <span>{sub.label}</span>
                            <i className={`fa-solid ${active ? 'fa-check' : 'fa-plus'} rich-op__chip-mark`} aria-hidden="true" />
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="rich-op__services-foot">
            <span>{serviziScelti.length} {serviziScelti.length === 1 ? 'extra aggiunto' : 'extra aggiunti'}</span>
            {serviziScelti.length > 0 && (
              <button type="button" className="rich-op__link" onClick={() => setSelectedSubs(new Set())}>Svuota</button>
            )}
          </div>
        </aside>
      </div>

      {/* ── Lista richieste inviate ─────────────────────────────────────────── */}
      <section className="rich-op__list">
        <header className="rich-op__list-head">
          <h2 className="rich-op__list-title">Le mie richieste operative</h2>
          <span className="rich-op__list-count">{richieste.length}</span>
        </header>

        {richieste.length === 0 ? (
          <p className="rich-op__list-empty">Nessuna richiesta inviata. Compila il modulo qui sopra per inviarne una.</p>
        ) : (
          <div className="rich-op__cards">
            {richieste.map((r) => (
              <RichiestaCard key={r.id} r={r} onRemove={() => remove(r.id)} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ─── Card singola richiesta (vista TO, sola lettura sullo stato) ───────────────
function RichiestaCard({ r, onRemove }: { r: RichiestaOperativa; onRemove: () => void }) {
  const meta = STATO_RICHIESTA_META[r.stato]
  return (
    <article className={`rich-op__card rich-op__card--${meta.tone}`}>
      <header className="rich-op__card-head">
        <div className="rich-op__card-title">
          <span className="rich-op__card-citta"><i className="fa-light fa-location-dot" aria-hidden="true" /> {r.citta} · {r.strutturaNome}</span>
          <h3>{r.nominativo}</h3>
        </div>
        <span className={`rich-op__badge rich-op__badge--${meta.tone}`}>
          <i className={`fa-solid fa-${meta.icon}`} aria-hidden="true" /> {meta.label}
        </span>
      </header>

      <div className="rich-op__card-meta">
        <span><i className="fa-light fa-hashtag" aria-hidden="true" /> Booking {r.bookingId}</span>
        <span><i className="fa-light fa-calendar" aria-hidden="true" /> {fmtIt(r.dalISO)} → {fmtIt(r.alISO)}</span>
      </div>

      {r.descrizione && <p className="rich-op__card-desc">{r.descrizione}</p>}

      {r.servizi.length > 0 && (
        <div className="rich-op__card-servizi">
          {r.servizi.map((s) => (
            <span key={s.id} className="rich-op__card-servizio">
              <i className={`fa-light fa-${s.icon}`} aria-hidden="true" /> {s.label}
            </span>
          ))}
        </div>
      )}

      <footer className="rich-op__card-foot">
        {r.stato === 'eseguita' ? (
          <span className="rich-op__done"><i className="fa-solid fa-circle-check" aria-hidden="true" /> Eseguita dalla struttura{r.eseguitaAt ? ` il ${fmtIt(new Date(r.eseguitaAt).toISOString())}` : ''}</span>
        ) : (
          <span className="rich-op__waiting"><i className="fa-light fa-clock" aria-hidden="true" /> In attesa di esecuzione dalla struttura</span>
        )}
        <button type="button" className="sib-btn sib-btn--icon sib-btn--sm" title="Elimina richiesta" onClick={onRemove}>
          <i className="fa-light fa-trash" aria-hidden="true" />
        </button>
      </footer>
    </article>
  )
}
