import React, { useEffect, useMemo, useRef, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import { Icon } from '../_shared/Icon'
import {
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  MOCK_ANNOUNCEMENTS,
  convertManagementToAnnouncement,
  formatDateIT,
  useManagementAnnouncements,
  type Announcement,
  type AnnouncementType,
} from '../_shared/announcementsData'
import './Matchzone.css'

type Phase = 'idle' | 'searching' | 'matched' | 'no-match'

const ANIM_DURATION_MS = 3200

export default function Matchzone({ navigate }: { navigate: (p: string) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [poolIndex, setPoolIndex] = useState(0)
  const [matched, setMatched] = useState<Announcement | null>(null)
  const rafRef = useRef<number | null>(null)

  const managementAnnouncements = useManagementAnnouncements()
  const myAnnouncements = useMemo<Announcement[]>(
    () => managementAnnouncements.map(convertManagementToAnnouncement),
    [managementAnnouncements],
  )

  const selected = useMemo(
    () => myAnnouncements.find((a) => a.id === selectedId) ?? null,
    [myAnnouncements, selectedId],
  )

  const pool = useMemo(() => MOCK_ANNOUNCEMENTS, [])

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const startMatchFor = (listing: Announcement) => {
    const oppositeType: AnnouncementType = listing.type === 'vendita' ? 'acquisto' : 'vendita'
    const candidates = pool.filter((p) => p.type === oppositeType && p.category === listing.category)

    if (candidates.length === 0) {
      setPhase('no-match')
      setMatched(null)
      return
    }

    const winning = candidates[Math.floor(Math.random() * candidates.length)]
    const targetIdx = pool.findIndex((p) => p.id === winning.id)

    setMatched(winning)
    setPhase('searching')

    const startTime = performance.now()
    let lastCycle = 0

    const tick = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(elapsed / ANIM_DURATION_MS, 1)
      const easedT = 1 - (1 - t) * (1 - t)
      const interval = 60 + 260 * easedT

      if (now - lastCycle >= interval) {
        setPoolIndex((prev) => (prev + 1) % pool.length)
        lastCycle = now
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setPoolIndex(targetIdx)
        setPhase('matched')
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }

  const reset = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    setPhase('idle')
    setMatched(null)
    setPoolIndex(0)
  }

  useEffect(() => {
    if (phase !== 'idle') reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const startMatch = () => {
    if (!selected) return
    startMatchFor(selected)
  }

  const isVendita = selected?.type === 'vendita'

  const animatedCard =
    phase === 'matched' && matched
      ? matched
      : pool.length > 0
        ? pool[poolIndex % pool.length]
        : null

  const showAnimatedCol = phase !== 'idle' && phase !== 'no-match'

  const leftCard = selected
    ? isVendita
      ? selected
      : showAnimatedCol
        ? animatedCard
        : null
    : null

  const rightCard = selected
    ? isVendita
      ? showAnimatedCol
        ? animatedCard
        : null
      : selected
    : null

  const isMatched = phase === 'matched'
  const isSearching = phase === 'searching'
  const isNoMatch = phase === 'no-match'

  return (
    <div className="match-zone">
      <PageHead
        title="Match Zone"
        subtitle="Seleziona un tuo annuncio e lascia che il sistema trovi la controparte"
      />

      <section className="match-zone__my-listings">
        <div className="match-zone__my-head">
          <div>
            <h2 className="match-zone__my-title">I miei annunci</h2>
            <p className="match-zone__my-subtitle">
              Solo annunci pubblicati da te. Selezionane uno per cercare un match.
            </p>
          </div>
          <button
            type="button"
            className="match-zone__btn-secondary"
            onClick={() => navigate('gestione-annunci')}
          >
            <Icon family="regular" name="plus" />
            Gestisci annunci
          </button>
        </div>

        {myAnnouncements.length === 0 ? (
          <div className="match-zone__my-empty">
            <p>Non hai ancora pubblicato annunci.</p>
            <button
              type="button"
              className="match-zone__btn-primary"
              onClick={() => navigate('gestione-annunci')}
            >
              <Icon family="regular" name="plus" />
              Crea il primo annuncio
            </button>
          </div>
        ) : (
          <div className="match-zone__my-grid">
            {myAnnouncements.map((a) => {
              const isSelected = a.id === selectedId
              return (
                <button
                  key={a.id}
                  type="button"
                  className={`my-listing-card my-listing-card__select${isSelected ? ' my-listing-card--selected' : ''}`}
                  onClick={() => setSelectedId(a.id)}
                  aria-pressed={isSelected}
                >
                  <div className="my-listing-card__head">
                    <span
                      className={`my-listing-card__kind my-listing-card__kind--${a.type === 'vendita' ? 'offerta' : 'richiesta'}`}
                    >
                      {a.type === 'vendita' ? 'Vendita' : 'Acquisto'}
                    </span>
                    <span className="my-listing-card__category">
                      <Icon family="regular" name={CATEGORY_ICONS[a.category]} />
                      {CATEGORY_LABELS[a.category]}
                    </span>
                  </div>
                  <p className="my-listing-card__title">{a.title}</p>
                  <p className="my-listing-card__meta">
                    {a.lots} lotti · {a.nights} {a.nights === 1 ? 'notte' : 'notti'}
                  </p>
                  {isSelected && (
                    <span className="my-listing-card__check">
                      <Icon family="regular" name="circle-check" /> Selezionato
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </section>

      <div className={`match-zone__board${isMatched ? ' match-zone__board--matched' : ''}`}>
        <div className="match-zone__column">
          <div className="match-zone__column-head">
            <Icon family="regular" name="arrow-trend-up" />
            <span>Vendita</span>
          </div>
          {leftCard ? (
            <AnnouncementCardSlot
              listing={leftCard}
              highlighted={isMatched}
              spinning={isSearching && !isVendita}
              ownership={isVendita ? 'mine' : 'pool'}
              side="left"
            />
          ) : (
            <PlaceholderCard
              text={
                !selected
                  ? 'Seleziona un tuo annuncio per iniziare'
                  : isVendita
                    ? 'Il tuo annuncio'
                    : 'In attesa del match'
              }
            />
          )}
        </div>

        <div className="match-zone__bridge" aria-hidden="true">
          <div className="match-zone__bridge-line" />
          <div
            className={`match-zone__bridge-icon${isMatched ? ' match-zone__bridge-icon--matched' : ''}${isNoMatch ? ' match-zone__bridge-icon--no-match' : ''}`}
          >
            <Icon
              family="regular"
              name={
                isMatched
                  ? 'circle-check'
                  : isSearching
                    ? 'arrows-rotate'
                    : isNoMatch
                      ? 'circle-xmark'
                      : 'arrow-right-arrow-left'
              }
            />
          </div>
          <div className="match-zone__bridge-line" />
        </div>

        <div className="match-zone__column">
          <div className="match-zone__column-head">
            <Icon family="regular" name="arrow-trend-down" />
            <span>Acquisto</span>
          </div>
          {rightCard ? (
            <AnnouncementCardSlot
              listing={rightCard}
              highlighted={isMatched}
              spinning={isSearching && !!isVendita}
              ownership={!isVendita ? 'mine' : 'pool'}
              side="right"
            />
          ) : (
            <PlaceholderCard
              text={
                !selected
                  ? 'Seleziona un tuo annuncio per iniziare'
                  : !isVendita
                    ? 'Il tuo annuncio'
                    : 'In attesa del match'
              }
            />
          )}
        </div>
      </div>

      {isMatched && matched && selected && (
        <div className="match-zone__result match-zone__result--success" role="status">
          <div className="match-zone__result-banner">
            <Icon family="regular" name="bolt" />
            Match trovato!
          </div>
          <p className="match-zone__result-text">
            <strong>{matched.publisher}</strong>{' '}
            {selected.type === 'vendita'
              ? 'sta cercando esattamente quello che offri'
              : 'offre esattamente quello che stai cercando'}{' '}
            nella categoria <em>{CATEGORY_LABELS[selected.category]}</em>.
          </p>
          <div className="match-zone__result-actions">
            <button type="button" onClick={reset} className="match-zone__btn-secondary">
              <Icon family="regular" name="arrows-rotate" />
              Riprova
            </button>
            <button
              type="button"
              onClick={() => {
                alert(`Richiesta di contatto inviata a:\n• ${matched.publisher} (${matched.contactEmail})`)
              }}
              className="match-zone__btn-primary"
            >
              <Icon family="regular" name="paper-plane" />
              Contatta
            </button>
          </div>
        </div>
      )}

      {isNoMatch && selected && (
        <div className="match-zone__result match-zone__result--empty" role="status">
          <div className="match-zone__result-banner match-zone__result-banner--empty">
            <Icon family="regular" name="circle-info" />
            Nessun match al momento
          </div>
          <p className="match-zone__result-text">
            Al momento non ci sono{' '}
            <strong>{selected.type === 'vendita' ? 'richieste (acquisto)' : 'offerte (vendita)'}</strong>{' '}
            disponibili nella categoria <em>{CATEGORY_LABELS[selected.category]}</em> per fare match con la tua{' '}
            <strong>{selected.type === 'vendita' ? 'vendita' : 'richiesta di acquisto'}</strong>.
            Riprova più tardi o seleziona un altro annuncio.
          </p>
          <div className="match-zone__result-actions">
            <button type="button" onClick={reset} className="match-zone__btn-secondary">Chiudi</button>
          </div>
        </div>
      )}

      {phase === 'idle' && (
        <div className="match-zone__cta-wrap">
          <button
            type="button"
            onClick={startMatch}
            disabled={!selected}
            className="match-zone__btn-primary match-zone__btn-primary--lg"
          >
            <Icon family="regular" name="bolt" />
            {selected ? 'Avvia ricerca match' : 'Seleziona prima un annuncio'}
          </button>
        </div>
      )}

      {isSearching && (
        <div className="match-zone__searching">
          <span className="match-zone__searching-dots" aria-hidden="true">
            <span /><span /><span />
          </span>
          Analisi annunci compatibili in corso…
        </div>
      )}
    </div>
  )
}

function PlaceholderCard({ text }: { text: string }) {
  return (
    <div className="match-card match-card--placeholder">
      <Icon family="light" name="circle-question" className="match-card__placeholder-icon" />
      <p className="match-card__placeholder-text">{text}</p>
    </div>
  )
}

function AnnouncementCardSlot({
  listing,
  highlighted,
  spinning,
  ownership,
  side,
}: {
  listing: Announcement
  highlighted: boolean
  spinning: boolean
  ownership: 'mine' | 'pool'
  side: 'left' | 'right'
}) {
  return (
    <div
      className={[
        'match-card',
        highlighted ? 'match-card--matched' : '',
        spinning ? 'match-card--spinning' : '',
        ownership === 'mine' ? 'match-card--mine' : '',
        `match-card--${side}`,
      ].join(' ')}
    >
      {ownership === 'mine' && (
        <div className="match-card__mine-badge">
          <Icon family="regular" name="user" />
          Il tuo annuncio
        </div>
      )}

      <div className="match-card__category">
        <Icon family="regular" name={CATEGORY_ICONS[listing.category]} />
        <span>{CATEGORY_LABELS[listing.category]}</span>
      </div>

      <h3 className="match-card__title">{listing.title}</h3>

      <p className="match-card__org">
        <Icon family="regular" name="building" /> {listing.publisher}
      </p>
      <p className="match-card__location">
        <Icon family="regular" name="location-dot" /> {listing.location}
      </p>

      <p className="match-card__details">{listing.description}</p>

      <div className="match-card__footer">
        <div className="match-card__quantity">
          <span className="match-card__field-label">Lotti × camere</span>
          <span className="match-card__field-value">
            {listing.lots} × {listing.roomsPerLot}
          </span>
        </div>
        <div className="match-card__price">
          <span className="match-card__field-label">Periodo</span>
          <span className="match-card__field-value match-card__field-value--strong">
            {formatDateIT(listing.checkInDate, false)} → {formatDateIT(listing.checkOutDate, false)}
          </span>
        </div>
      </div>
    </div>
  )
}
