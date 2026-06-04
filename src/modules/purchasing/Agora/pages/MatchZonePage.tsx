import { useEffect, useMemo, useRef, useState } from 'react';
import { Layout } from './Layout';
import { PageHeader } from './PageHeader';
import { Icon } from '../ds/icon';
import {
  CATEGORY_HERO,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  COMMUNITY,
  MY_LISTINGS,
  compatibility,
  periodLabel,
  type MzListing,
} from '../data/matchzone';
import './MatchZonePage.css';

const TYPE_META = {
  vendita: { label: 'Vendita', icon: 'tag' },
  acquisto: { label: 'Acquisto', icon: 'magnifying-glass' },
} as const;

function scoreTier(score: number): 'high' | 'mid' | 'low' {
  return score >= 70 ? 'high' : score >= 40 ? 'mid' : 'low';
}

type Phase = 'idle' | 'searching' | 'matched';
const ANIM_MS = 3000;

export function MatchZonePage() {
  const [myId, setMyId] = useState<string>(MY_LISTINGS[0]?.id ?? '');
  const [counterpartId, setCounterpartId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [myMenuOpen, setMyMenuOpen] = useState(false);
  const [contacted, setContacted] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [flickIndex, setFlickIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const mine = useMemo(() => MY_LISTINGS.find((l) => l.id === myId) ?? null, [myId]);
  const oppositeType = mine?.type === 'vendita' ? 'acquisto' : 'vendita';

  /* Controparti compatibili: tipo opposto, ordinate per affinità. */
  const candidates = useMemo(() => {
    if (!mine) return [];
    const q = search.trim().toLowerCase();
    return COMMUNITY.filter((c) => c.type === oppositeType)
      .map((c) => ({ listing: c, match: compatibility(mine, c) }))
      .filter(({ listing }) =>
        !q
          ? true
          : `${listing.ditta} ${listing.title} ${CATEGORY_LABELS[listing.category]}`
              .toLowerCase()
              .includes(q),
      )
      .sort((a, b) => b.match.score - a.match.score);
  }, [mine, oppositeType, search]);

  const counterpart = useMemo(
    () => COMMUNITY.find((c) => c.id === counterpartId) ?? null,
    [counterpartId],
  );
  const match = mine && counterpart ? compatibility(mine, counterpart) : null;

  /* Card mostrata nello slot controparte: durante la ricerca scorre i
     candidati, altrimenti mostra la controparte selezionata. */
  const displayCounterpart =
    phase === 'searching' && candidates.length > 0
      ? candidates[flickIndex % candidates.length].listing
      : counterpart;

  const stopAnim = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  /* Avvia l'animazione "carte che scorrono" e si ferma sul match migliore. */
  const runMatch = () => {
    if (!mine || candidates.length === 0) return;
    stopAnim();
    setContacted(false);
    setCounterpartId(null);
    setPhase('searching');

    const best = candidates[0].listing; // già ordinati per affinità desc
    const start = performance.now();
    let last = 0;

    const tick = (now: number) => {
      const t = Math.min((now - start) / ANIM_MS, 1);
      const eased = 1 - (1 - t) * (1 - t);
      const interval = 55 + 300 * eased; // rallenta verso la fine
      if (now - last >= interval) {
        setFlickIndex((p) => p + 1);
        last = now;
      }
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
        setCounterpartId(best.id);
        setPhase('matched');
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const pickCounterpart = (id: string) => {
    stopAnim();
    setCounterpartId(id);
    setPhase('matched');
  };

  /* Reset al cambio del mio annuncio. */
  useEffect(() => {
    stopAnim();
    setCounterpartId(null);
    setContacted(false);
    setPhase('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId]);
  useEffect(() => {
    setContacted(false);
  }, [counterpartId]);
  useEffect(() => () => stopAnim(), []);

  /* Chiusura menu "I miei annunci" al click esterno. */
  useEffect(() => {
    if (!myMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMyMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [myMenuOpen]);

  return (
    <Layout>
      <PageHeader
        title="Match Zone"
        subtitle="Seleziona un tuo annuncio e trova la controparte più affine"
      />

      <div className="mz-layout">
        {/* ---------- Colonna sinistra: ricerca + coppia di match ---------- */}
        <aside className="mz-side">
          <div className="mz-search">
            <Icon family="light" name="magnifying-glass" className="mz-search__icon" aria-hidden="true" />
            <input
              type="text"
              className="mz-search__input"
              placeholder="Cerca per ditta, categoria…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="mz-pair">
            {mine ? (
              <MzCard listing={mine} role="mine" />
            ) : (
              <MzPlaceholder text="Nessun annuncio selezionato" />
            )}

            <div
              className={`mz-connector mz-connector--${
                phase === 'matched' && match ? scoreTier(match.score) : 'idle'
              }${phase === 'searching' ? ' mz-connector--searching' : ''}`}
            >
              <span className="mz-connector__line" />
              <button
                type="button"
                className="mz-connector__badge"
                onClick={runMatch}
                disabled={phase === 'searching' || !mine || candidates.length === 0}
                title={phase === 'matched' ? 'Cerca di nuovo' : 'Trova il match migliore'}
              >
                {phase === 'searching' ? (
                  <Icon family="light" name="arrows-rotate" spin />
                ) : phase === 'matched' && match ? (
                  <>
                    <strong>{match.score}%</strong>
                    <span>affinità</span>
                  </>
                ) : (
                  <>
                    <Icon family="light" name="bolt" />
                    <span>Trova</span>
                  </>
                )}
              </button>
              <span className="mz-connector__line" />
            </div>

            {displayCounterpart ? (
              <MzCard
                key={phase === 'searching' ? `flick-${flickIndex}` : displayCounterpart.id}
                listing={displayCounterpart}
                role="counterpart"
                match={phase === 'matched' ? match : null}
                flick={phase === 'searching'}
              />
            ) : (
              <MzPlaceholder text="Premi «Trova» o scegli un annuncio dalla tabella" />
            )}
          </div>

          {counterpart && mine && (
            <div className="mz-actions">
              {contacted ? (
                <p className="mz-contacted" role="status">
                  <Icon family="solid" name="circle-check" /> Richiesta inviata a{' '}
                  <strong>{counterpart.ditta}</strong> ({counterpart.contactEmail})
                </p>
              ) : (
                <button type="button" className="sib-btn sib-btn--primary" onClick={() => setContacted(true)}>
                  <Icon family="light" name="paper-plane" />
                  Contatta {counterpart.ditta}
                </button>
              )}
            </div>
          )}
        </aside>

        {/* ---------- Colonna destra: tabella annunci ---------- */}
        <section className="mz-main">
          <div className="mz-main__head">
            <div className="mz-main__title">
              <h2>Annunci compatibili</h2>
              <span className="mz-main__count">
                {candidates.length} {candidates.length === 1 ? 'opportunità' : 'opportunità'} ·{' '}
                {mine ? TYPE_META[oppositeType].label : '—'}
              </span>
            </div>

            <div className="mz-mymenu" ref={menuRef}>
              <button
                type="button"
                className="sib-btn sib-btn--secondary"
                aria-expanded={myMenuOpen}
                onClick={() => setMyMenuOpen((o) => !o)}
              >
                <Icon family="light" name="bullhorn" />
                I miei annunci
                <Icon family="light" name="chevron-down" />
              </button>
              {myMenuOpen && (
                <div className="mz-mymenu__pop" role="listbox">
                  {MY_LISTINGS.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      role="option"
                      aria-selected={l.id === myId}
                      className={`mz-mymenu__item${l.id === myId ? ' is-active' : ''}`}
                      onClick={() => {
                        setMyId(l.id);
                        setMyMenuOpen(false);
                      }}
                    >
                      <span className={`mz-tag mz-tag--${l.type}`}>{TYPE_META[l.type].label}</span>
                      <span className="mz-mymenu__item-title">{l.title}</span>
                      <Icon family="light" name={CATEGORY_ICONS[l.category]} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="sib-table-wrap">
            <table className="sib-table mz-table">
              <thead>
                <tr>
                  <th>Ditta</th>
                  <th className="mz-table__center">Tipologia</th>
                  <th className="mz-table__center">Categoria</th>
                  <th>Periodo</th>
                  <th className="mz-table__center">Quantità</th>
                  <th className="mz-table__center">Azione</th>
                </tr>
              </thead>
              <tbody>
                {candidates.length === 0 && (
                  <tr>
                    <td colSpan={6} className="mz-table__empty">
                      Nessun annuncio compatibile con i criteri attuali.
                    </td>
                  </tr>
                )}
                {candidates.map(({ listing, match: m }) => {
                  const open = expandedId === listing.id;
                  const selected = counterpartId === listing.id;
                  return (
                    <RowGroup
                      key={listing.id}
                      listing={listing}
                      score={m.score}
                      open={open}
                      selected={selected}
                      onToggle={() => setExpandedId(open ? null : listing.id)}
                      onPick={() => pickCounterpart(listing.id)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Layout>
  );
}

/* ============================================================
   Subcomponents
   ============================================================ */

function MzPlaceholder({ text }: { text: string }) {
  return (
    <div className="mz-card mz-card--placeholder">
      <Icon family="light" name="circle-question" className="mz-card__ph-icon" />
      <p className="mz-card__ph-text">{text}</p>
    </div>
  );
}

function MzCard({
  listing,
  role,
  match,
  flick,
}: {
  listing: MzListing;
  role: 'mine' | 'counterpart';
  match?: { score: number } | null;
  flick?: boolean;
}) {
  return (
    <div className={`mz-card mz-card--${role}${flick ? ' mz-card--flick' : ''}`}>
      {role === 'mine' && <span className="mz-card__corner mz-card__corner--mine">Il tuo annuncio</span>}
      {role === 'counterpart' && match && (
        <span className={`mz-card__corner mz-card__corner--score mz-card__corner--${scoreTier(match.score)}`}>
          {match.score}% affinità
        </span>
      )}

      <div
        className={`mz-card__hero mz-card__hero--${listing.category}`}
        style={{ '--hero': `url(${CATEGORY_HERO[listing.category]})` } as React.CSSProperties}
      >
        <span className={`mz-tag mz-tag--${listing.type} mz-card__hero-tag`}>
          <Icon family="light" name={TYPE_META[listing.type].icon} />
          {TYPE_META[listing.type].label}
        </span>
      </div>

      <div className="mz-card__body">
        <div className="mz-card__head">
          <span className="mz-card__logo">{listing.initials}</span>
          <span className="mz-card__ditta">{listing.ditta}</span>
        </div>

        <h3 className="mz-card__title">{listing.title}</h3>
        <p className="mz-card__desc">{listing.description}</p>

        <ul className="mz-card__meta">
        <li>
          <Icon family="light" name={CATEGORY_ICONS[listing.category]} />
          {CATEGORY_LABELS[listing.category]}
        </li>
        <li>
          <Icon family="light" name="location-dot" />
          {listing.location}
        </li>
        <li>
          <Icon family="light" name="calendar-day" />
          {periodLabel(listing.periodFrom, listing.periodTo)}
        </li>
        <li>
          <Icon family="light" name="layer-group" />
          {listing.quantity} lotti × {listing.roomsPerLot}
        </li>
        </ul>
      </div>
    </div>
  );
}

function RowGroup({
  listing,
  score,
  open,
  selected,
  onToggle,
  onPick,
}: {
  listing: MzListing;
  score: number;
  open: boolean;
  selected: boolean;
  onToggle: () => void;
  onPick: () => void;
}) {
  return (
    <>
      <tr className={`mz-row${selected ? ' mz-row--selected' : ''}`}>
        <td>
          <button type="button" className="mz-row__ditta" onClick={onToggle} aria-expanded={open}>
            <Icon family="light" name={open ? 'chevron-up' : 'chevron-down'} />
            <span>{listing.ditta}</span>
          </button>
        </td>
        <td className="mz-table__center">
          <span className="mz-icocell" title={TYPE_META[listing.type].label}>
            <Icon family="light" name={TYPE_META[listing.type].icon} />
          </span>
        </td>
        <td className="mz-table__center">
          <span className="mz-icocell" title={CATEGORY_LABELS[listing.category]}>
            <Icon family="light" name={CATEGORY_ICONS[listing.category]} />
          </span>
        </td>
        <td className="mz-row__period">{periodLabel(listing.periodFrom, listing.periodTo)}</td>
        <td className="mz-table__center mz-row__qty">{listing.quantity}</td>
        <td className="mz-table__center">
          <button
            type="button"
            className={`mz-action${selected ? ' is-selected' : ''}`}
            title={selected ? 'Match selezionato' : 'Proponi match'}
            onClick={onPick}
          >
            <Icon family="light" name={selected ? 'circle-check' : 'gavel'} />
          </button>
        </td>
      </tr>
      {open && (
        <tr className="mz-row__detail-row">
          <td colSpan={6}>
            <div className="mz-detail">
              <p className="mz-detail__title">{listing.title}</p>
              <p className="mz-detail__desc">{listing.description}</p>
              <div className="mz-detail__facts">
                <span><Icon family="light" name="location-dot" /> {listing.location}</span>
                <span><Icon family="light" name="layer-group" /> {listing.quantity} lotti × {listing.roomsPerLot} camere</span>
                <span className={`mz-detail__score mz-detail__score--${scoreTier(score)}`}>
                  <Icon family="solid" name="bolt" /> Affinità {score}%
                </span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
