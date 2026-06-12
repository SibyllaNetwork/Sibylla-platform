// ─── Planner ──────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import BtnBack from '../../../core/components/BtnBack';

import { PlannerProps, Pren } from './planner.types';
import { CAM_CLR } from './planner.styles';
import { STRUTTURE, PIANI_DATA, PENDING_DA, PENDING_AL, parseDt, diffDays } from './planner.data';
import { usePlannerState } from './hooks/usePlannerState';
import { bookingComms } from './planner.layout';

import HotelVisualization from './components/HotelVisualization';
import Timeline           from './components/Timeline';
import Parcheggio         from './components/Parcheggio';
import InfoPanel          from './components/InfoPanel';
import ActionButtons      from './components/ActionButtons';
import LegendaModal       from './components/LegendaModal';
import PrenModal          from './components/PrenModal';
import './planner.sass';

const fmtDate = (s: string) =>
  parseDt(s).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

const Planner: React.FC<PlannerProps> = ({ navigate = () => {} }) => {
  const s = usePlannerState(navigate);
  const [barTip, setBarTip] = useState<{ pren: Pren; x: number; y: number } | null>(null);
  const onBarHover = (pren: Pren | null, x: number, y: number) => setBarTip(pren ? { pren, x, y } : null);

  return (
    <>
      <div className="planner">

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div className="planner__header">
          <BtnBack onClick={() => navigate('home')} />

          <h1 className="planner__title">Planner</h1>
          <p className="planner__subtitle">
            Gestione operativa in tempo reale delle prenotazioni e della disponibilità delle camere
          </p>

          {/* ── FILTRI ────────────────────────────────────────────────────── */}
          <div className="planner__filters">

            {/* Struttura */}
            <div className="planner__filter-group">
              <label className="planner__filter-label">Struttura</label>
              <select
                className="sib-select"
                value={s.struttura}
                onChange={e => s.setStruttura(e.target.value)}
              >
                {STRUTTURE.map(st => <option key={st}>{st}</option>)}
              </select>
            </div>

            {/* Cerca */}
            <div className="planner__filter-group">
              <label className="planner__filter-label">Cerca</label>
              <div className="planner__search-wrap">
                <input
                  className="sib-input w-[150px] pr-8"
                  value={s.cerca}
                  onChange={e => s.setCerca(e.target.value)}
                  placeholder="Cerca..."
                />
                <svg className="planner__search-icon"
                  viewBox="0 0 16 16" width={13} height={13} fill="currentColor">
                  <path d="M11.5 7A4.5 4.5 0 103 7a4.5 4.5 0 008.5 0zm1 3.4l3.1 3.1-1 1-3.1-3.1a5.9 5.9 0 11.9-.9z" />
                </svg>
              </div>
            </div>

            {/* Data inizio */}
            <div className="planner__filter-group">
              <label className="planner__filter-label">Da</label>
              <input
                className="sib-input"
                type="date"
                value={s.startDateStr}
                onChange={e => s.setStartDateStr(e.target.value)}
              />
            </div>

            {/* Intervallo */}
            <div className="planner__filter-group">
              <label className="planner__filter-label">Intervallo</label>
              <select
                className="sib-select"
                value={s.intervallo}
                onChange={e => s.setIntervallo(Number(e.target.value))}
              >
                {[7, 10, 14, 21, 30].map(n => <option key={n} value={n}>{n} gg</option>)}
              </select>
            </div>

            {/* Piani */}
            <div className="planner__filter-group">
              <label className="planner__filter-label">Piani</label>
              <div className="planner__floor-btns">
                {PIANI_DATA.filter(p => p.id !== 0).map(p => (
                  <button
                    key={p.id}
                    className={`planner__floor-btn${s.activePiani.includes(p.id) ? ' planner__floor-btn--active' : ''}`}
                    onClick={() => s.togglePiano(p.id)}
                  >
                    {p.id}
                  </button>
                ))}
              </div>
            </div>

            {/* Confermate / Opzionate */}
            <div className="planner__checkboxes">
              {([
                { label: 'Confermate', val: s.filtroConf, set: s.setFiltroConf, color: '#00CF86' },
                { label: 'Opzionate',  val: s.filtroOpz,  set: s.setFiltroOpz,  color: '#D10011' },
              ] as { label: string; val: boolean; set: (v: boolean) => void; color: string }[]).map(({ label, val, set, color }) => (
                <label
                  key={label}
                  className="planner__checkbox-label"
                  onClick={() => set(!val)}
                >
                  <div
                    className={`planner__checkbox-box${val ? ' planner__checkbox-box--on' : ''}`}
                    style={{ '--cb-color': color } as React.CSSProperties}
                  >
                    {val && (
                      <svg viewBox="0 0 10 10" width={9} height={9} fill="none" stroke="white" strokeWidth={1.8}>
                        <path d="M1.5 5l2.5 2.5 4.5-5" />
                      </svg>
                    )}
                  </div>
                  <span className="planner__checkbox-text" style={{ '--cb-color': color } as React.CSSProperties}>{label}</span>
                </label>
              ))}
            </div>

            <div className="planner__spacer" />

            <ActionButtons
              onGhost={() => {}}
              onParcheggio={s.toggleParcheggio}
              parcheggioActive={s.showParcheggio}
              parkedCount={s.parkedPrens.length}
              onNuova={() => navigate('nuova-prenotazione')}
              onArrivi={() => navigate('arrivi-partenze')}
              onOspiti={() => navigate('ospiti-in-casa')}
              onSchedine={() => navigate('schedine')}
              onRilevamento={() => navigate('rilevamento-presenze')}
              onLegenda={() => s.setShowLegenda(true)}
            />
          </div>

          <div className="planner__occupazione">
            Occupazione: {parseDt(s.startDateStr).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </div>
        </div>

        {/* ── BODY ────────────────────────────────────────────────────────── */}
        <div className="planner__body">
          <HotelVisualization piani={PIANI_DATA} activePiani={s.activePiani} />
          <div className="planner__center">
            {s.showParcheggio && (
              <Parcheggio
                parked={s.parkedPrens}
                startDate={s.startDate}
                numDays={s.intervallo}
                onClose={() => s.setShowParcheggio(false)}
                onParkDrop={s.parkBooking}
                onSelect={s.setSelectedBooking}
                selectedId={s.selectedBooking?.id ?? null}
                onBarHover={onBarHover}
              />
            )}
            <Timeline
              piani={PIANI_DATA}
              prenotazioni={s.filteredPrens}
              startDate={s.startDate}
              numDays={s.intervallo}
              filtroConf={s.filtroConf}
              filtroOpz={s.filtroOpz}
              activePiani={s.activePiani}
              onSelect={s.setSelectedBooking}
              selectedId={s.selectedBooking?.id ?? null}
              onEmpty={s.handleEmptyClick}
              onAssign={s.assignBookingToRoom}
              onMove={s.moveBooking}
              showRiepilogo={s.showRiepilogo}
              onToggleRiepilogo={s.toggleRiepilogo}
              onBarHover={onBarHover}
            />
          </div>
          <InfoPanel
            selected={s.selectedBooking}
            struttura={s.struttura}
            pendingDa={PENDING_DA}
            pendingAl={PENDING_AL}
            onOpenAssegnare={() => s.setShowAssegnare(true)}
            onOpenAllocare={() => s.setShowAllocare(true)}
            navigate={navigate}
          />
        </div>
      </div>

      {/* ── MODALI ──────────────────────────────────────────────────────────── */}
      {s.showLegenda   && <LegendaModal onClose={() => s.setShowLegenda(false)} />}
      {s.showAssegnare && (
        <PrenModal
          title="Prenotazioni da assegnare"
          subtitle="Prenotazioni in attesa di assegnazione definitiva"
          items={PENDING_DA}
          onClose={() => s.setShowAssegnare(false)}
          actionLabel="Assegna"
        />
      )}
      {s.showAllocare  && (
        <PrenModal
          title="Prenotazioni da allocare"
          subtitle="Prenotazioni non ancora associate a camere"
          items={PENDING_AL}
          onClose={() => s.setShowAllocare(false)}
          actionLabel="Alloca"
        />
      )}

      {/* ── Tooltip prenotazione (rollover) ──────────────────────────────────── */}
      {barTip && (
        <div className="planner__bar-tip" style={{ '--tip-left': `${barTip.x + 14}px`, '--tip-top': `${barTip.y + 14}px` } as React.CSSProperties}>
          <div className="planner__bar-tip-row">Agenzia: {barTip.pren.agenzia || '-'}</div>
          <div className="planner__bar-tip-row">Cliente: {barTip.pren.nominativo}</div>
          <div className="planner__bar-tip-row">Data In: {fmtDate(barTip.pren.checkIn)}</div>
          <div className="planner__bar-tip-row">Data Out: {fmtDate(barTip.pren.checkOut)}</div>
          <div className="planner__bar-tip-row">Giorni Prenotati: {diffDays(parseDt(barTip.pren.checkIn), parseDt(barTip.pren.checkOut))}</div>
          {bookingComms(barTip.pren).length > 0 && (
            <div className="planner__bar-tip-comms">
              {bookingComms(barTip.pren).map(c => (
                <div key={c.key} className="planner__bar-tip-comm">
                  <i className={`fa-light ${c.icon}`} aria-hidden="true" />
                  <span>{c.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default Planner;
