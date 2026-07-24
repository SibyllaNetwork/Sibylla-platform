import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from './Layout';
import { PageHeader } from './PageHeader';
import { Icon } from '../ds/icon';
import { Button } from '../ds/button';
import { PageToolbar, type ViewMode } from './PageToolbar';
import { JoinGroupPurchaseModal } from './JoinGroupPurchaseModal';
import './groupPurchaseModals.css';
import './ActiveGroupsPage.css';
import {
  useGroupPurchasesStore,
  GROUP_PURCHASE_CATEGORIES,
  getProgressPercentage,
  getDaysRemaining,
  type GroupPurchase,
} from '../../../../store/useGroupPurchasesStore';

type SortKey = 'closing-first' | 'progress-desc' | 'discount-desc' | 'name-asc';
type StatusFilter = 'all' | 'active' | 'closing-soon';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'closing-first', label: 'In scadenza prima' },
  { value: 'progress-desc', label: 'Più vicini alla soglia' },
  { value: 'discount-desc', label: 'Sconto maggiore prima' },
  { value: 'name-asc',      label: 'Nome (A → Z)' },
];

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all',          label: 'Tutti' },
  { value: 'active',       label: 'Attivi' },
  { value: 'closing-soon', label: 'In chiusura' },
];

const DEFAULT_SORT: SortKey = 'closing-first';

export function ActiveGroupsPage() {
  const navigate = useNavigate();
  const purchases = useGroupPurchasesStore((s) => s.purchases);
  const joinedIds = useGroupPurchasesStore((s) => s.joinedIds);
  const joinPurchase = useGroupPurchasesStore((s) => s.joinPurchase);
  const leavePurchase = useGroupPurchasesStore((s) => s.leavePurchase);

  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('grid');
  const [category, setCategory] = useState('Tutti');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>(DEFAULT_SORT);
  const [joinTarget, setJoinTarget] = useState<GroupPurchase | null>(null);
  const [pulse, setPulse] = useState<{ id: string; delta: number } | null>(null);
  const pulseTimer = useRef<number>(0);

  const triggerPulse = (id: string, delta: number) => {
    if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    setPulse({ id, delta });
    pulseTimer.current = window.setTimeout(() => setPulse(null), 1800);
  };

  const activeGroups = useMemo(
    () => purchases.filter((g) => g.status === 'active' || g.status === 'closing-soon'),
    [purchases],
  );

  const visibleGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = activeGroups.filter((g) => {
      const matchesCategory = category === 'Tutti' || g.category === category;
      const matchesStatus = statusFilter === 'all' || g.status === statusFilter;
      const matchesSearch =
        q === '' ||
        g.productName.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.supplier.toLowerCase().includes(q);
      return matchesCategory && matchesStatus && matchesSearch;
    });
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'closing-first':
          return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
        case 'progress-desc':
          return getProgressPercentage(b.currentParticipants, b.minQuantity)
            - getProgressPercentage(a.currentParticipants, a.minQuantity);
        case 'discount-desc':
          return b.discount - a.discount;
        case 'name-asc':
          return a.productName.localeCompare(b.productName);
      }
    });
  }, [activeGroups, search, category, statusFilter, sortBy]);

  const filtersDirty = category !== 'Tutti' || statusFilter !== 'all' || sortBy !== DEFAULT_SORT;
  const resetFilters = () => {
    setCategory('Tutti');
    setStatusFilter('all');
    setSortBy(DEFAULT_SORT);
  };

  const handleJoin = (id: string) => {
    joinPurchase(id);
    setJoinTarget(null);
    triggerPulse(id, 1);
  };

  const handleLeave = (id: string) => {
    leavePurchase(id);
    triggerPulse(id, -1);
  };

  return (
    <Layout>
      <div className="active-groups-page">
        <PageHeader
          title="Gruppi attivi"
          subtitle="Gruppi d'acquisto già avviati: sottoscrivi per aggiungerti alla lista dei partecipanti"
          backLabel="Acquisti condivisi"
          onBack={() => navigate('/group-purchases')}
        />

        {joinTarget && (
          <JoinGroupPurchaseModal
            purchase={joinTarget}
            onClose={() => setJoinTarget(null)}
            onConfirm={() => handleJoin(joinTarget.id)}
          />
        )}

        <PageToolbar
          search={{
            value: search,
            onChange: setSearch,
            placeholder: 'Cerca prodotto, descrizione o fornitore…',
          }}
          view={view}
          onViewChange={setView}
          filtersDirty={filtersDirty}
          onResetFilters={resetFilters}
          filterPanel={
            <>
              <fieldset className="page-toolbar__filter-section">
                <legend className="page-toolbar__filter-label">Categoria</legend>
                <div className="page-toolbar__filter-options">
                  {GROUP_PURCHASE_CATEGORIES.map((c) => (
                    <label key={c} className="page-toolbar__filter-option">
                      <input
                        type="radio"
                        name="active-groups-category"
                        value={c}
                        checked={category === c}
                        onChange={() => setCategory(c)}
                      />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="page-toolbar__filter-section">
                <legend className="page-toolbar__filter-label">Stato</legend>
                <div className="page-toolbar__filter-options">
                  {STATUS_OPTIONS.map((opt) => (
                    <label key={opt.value} className="page-toolbar__filter-option">
                      <input
                        type="radio"
                        name="active-groups-status"
                        value={opt.value}
                        checked={statusFilter === opt.value}
                        onChange={() => setStatusFilter(opt.value)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="page-toolbar__filter-section">
                <legend className="page-toolbar__filter-label">Ordina per</legend>
                <div className="page-toolbar__filter-options">
                  {SORT_OPTIONS.map((opt) => (
                    <label key={opt.value} className="page-toolbar__filter-option">
                      <input
                        type="radio"
                        name="active-groups-sort"
                        value={opt.value}
                        checked={sortBy === opt.value}
                        onChange={() => setSortBy(opt.value)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          }
        />

        <p className="active-groups__count">
          {visibleGroups.length} {visibleGroups.length === 1 ? 'gruppo attivo' : 'gruppi attivi'}
        </p>

        {visibleGroups.length === 0 ? (
          <p className="active-groups__empty">
            Nessun gruppo attivo corrisponde ai filtri selezionati.
          </p>
        ) : view === 'grid' ? (
          <div className="active-groups__grid">
            {visibleGroups.map((group) => (
              <ActiveGroupBox
                key={group.id}
                group={group}
                joined={joinedIds.includes(group.id)}
                pulse={pulse?.id === group.id ? pulse.delta : null}
                onSubscribe={() => setJoinTarget(group)}
                onLeave={() => handleLeave(group.id)}
              />
            ))}
          </div>
        ) : (
          <ul className="active-groups__list">
            {visibleGroups.map((group) => (
              <ActiveGroupRow
                key={group.id}
                group={group}
                joined={joinedIds.includes(group.id)}
                pulse={pulse?.id === group.id ? pulse.delta : null}
                onSubscribe={() => setJoinTarget(group)}
                onLeave={() => handleLeave(group.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}

/* ── Sotto-componenti di rendering (box / riga) ────────────────────────────── */

interface GroupItemProps {
  group: GroupPurchase;
  joined: boolean;
  /** +1 / −1 se l'elemento sta pulsando dopo un'adesione/recesso, altrimenti null. */
  pulse: number | null;
  onSubscribe: () => void;
  onLeave: () => void;
}

function ParticipantsBlock({ group, pulse }: { group: GroupPurchase; pulse: number | null }) {
  const { missing, progressWidthClass } = useGroupDerived(group);
  return (
    <div className="active-group__participants">
      <div className="active-group__participants-head">
        <Icon family="regular" name="users" />
        <strong className={pulse != null ? 'gp-count-bump' : undefined}>{group.currentParticipants}</strong>
        <span>/ {group.minQuantity} partecipanti</span>
        {pulse != null && (
          <span className={`gp-plus-one${pulse < 0 ? ' gp-plus-one--minus' : ''}`}>
            {pulse > 0 ? '+1' : '−1'}
          </span>
        )}
      </div>
      <div className="active-group__progress">
        <div className={`active-group__progress-bar ${progressWidthClass}`} />
      </div>
      <span className="active-group__participants-note">
        {missing > 0 ? `Mancano ${missing} adesioni` : 'Soglia raggiunta'}
      </span>
    </div>
  );
}

function SubscribeCta({ joined, onSubscribe, onLeave, className }: {
  joined: boolean;
  onSubscribe: () => void;
  onLeave: () => void;
  className: string;
}) {
  return joined ? (
    <Button variant="reject-tertiary" size="md" className={className} onClick={onLeave}>
      <Icon family="regular" name="user-xmark" data-slot="icon" />
      Recedi
    </Button>
  ) : (
    <Button variant="primary" size="md" className={className} onClick={onSubscribe}>
      <Icon family="solid" name="user-plus" data-slot="icon" />
      Sottoscrivi
    </Button>
  );
}

function useGroupDerived(group: GroupPurchase) {
  const progress = getProgressPercentage(group.currentParticipants, group.minQuantity);
  return {
    progress,
    daysRemaining: getDaysRemaining(group.endDate),
    missing: Math.max(group.minQuantity - group.currentParticipants, 0),
    progressWidthClass: `gp-progress-${Math.round(progress / 5) * 5}`,
  };
}

function ClosingFlag() {
  return (
    <span className="active-group__flag">
      <Icon family="regular" name="triangle-exclamation" />
      In chiusura
    </span>
  );
}

function ActiveGroupBox({ group, joined, pulse, onSubscribe, onLeave }: GroupItemProps) {
  const { daysRemaining } = useGroupDerived(group);
  return (
    <article className={`ag-box${pulse != null ? ' gp-pulse' : ''}${joined ? ' ag-box--joined' : ''}`}>
      <div className="ag-box__image-wrap">
        <img src={group.image} alt={group.productName} className="ag-box__image" />
        <span className="ag-box__discount">-{group.discount}%</span>
        {group.status === 'closing-soon' && (
          <span className="ag-box__flag"><ClosingFlag /></span>
        )}
        {joined && (
          <span className="ag-box__joined"><Icon family="solid" name="circle-check" /> Iscritto</span>
        )}
      </div>
      <div className="ag-box__body">
        <h3 className="active-group__product">{group.productName}</h3>
        <p className="active-group__supplier">{group.supplier} · {group.category}</p>

        <div className="active-group__meta">
          <span className="active-group__price">€{group.groupPrice.toFixed(2)}</span>
          <span className="active-group__price-regular">€{group.regularPrice.toFixed(2)}</span>
          <span className="active-group__days">
            <Icon family="regular" name="clock" /> {daysRemaining} giorni
          </span>
        </div>

        <ParticipantsBlock group={group} pulse={pulse} />

        <SubscribeCta joined={joined} onSubscribe={onSubscribe} onLeave={onLeave} className="ag-box__cta" />
      </div>
    </article>
  );
}

function ActiveGroupRow({ group, joined, pulse, onSubscribe, onLeave }: GroupItemProps) {
  const { daysRemaining } = useGroupDerived(group);
  return (
    <li className={`active-group${pulse != null ? ' gp-pulse' : ''}${joined ? ' active-group--joined' : ''}`}>
      <img src={group.image} alt={group.productName} className="active-group__image" />

      <div className="active-group__detail">
        <div className="active-group__detail-head">
          <h3 className="active-group__product">{group.productName}</h3>
          {group.status === 'closing-soon' && <ClosingFlag />}
          {joined && (
            <span className="active-group__joined"><Icon family="solid" name="circle-check" /> Iscritto</span>
          )}
        </div>
        <p className="active-group__supplier">{group.supplier} · {group.category}</p>
        <div className="active-group__meta">
          <span className="active-group__price">€{group.groupPrice.toFixed(2)}</span>
          <span className="active-group__price-regular">€{group.regularPrice.toFixed(2)}</span>
          <span className="active-group__discount">-{group.discount}%</span>
          <span className="active-group__days">
            <Icon family="regular" name="clock" /> {daysRemaining} giorni
          </span>
        </div>
      </div>

      <ParticipantsBlock group={group} pulse={pulse} />

      <SubscribeCta joined={joined} onSubscribe={onSubscribe} onLeave={onLeave} className="active-group__cta" />
    </li>
  );
}
