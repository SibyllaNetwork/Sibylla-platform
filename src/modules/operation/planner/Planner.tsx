// ─── Planner ──────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import PageHead from '../../../core/components/PageHead';
import { SelectField } from '../../../core/components/form';

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
import RichiesteOperativeModal from './components/RichiesteOperativeModal';
import BloccoFantasmaModal from './components/BloccoFantasmaModal';
import PrenContextMenu     from './components/PrenContextMenu';
import {
  useRichiesteOperativeStore,
  richiestePendingCount,
  bookingsConRichiestaEseguita,
  bookingsConRichiestaInAttesa,
  richiesteByBooking,
  STATO_RICHIESTA_META,
} from '../../../store/useRichiesteOperativeStore';
import './planner.sass';

const fmtDate = (s: string) =>
  parseDt(s).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

const Planner: React.FC<PlannerProps> = ({ navigate = () => {} }) => {
  const s = usePlannerState(navigate);
  const [barTip, setBarTip] = useState<{ pren: Pren; x: number; y: number } | null>(null);
  const onBarHover = (pren: Pren | null, x: number, y: number) => setBarTip(pren ? { pren, x, y } : null);
  const [ghostTip, setGhostTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ pren: Pren; x: number; y: number } | null>(null);
  const onGhostHover = (b: { motivazione: string } | null, x: number, y: number) =>
    setGhostTip(b ? { text: b.motivazione, x, y } : null);

  // ── Richieste operative dei Tour Operator ──────────────────────────────────
  const [showRichieste, setShowRichieste] = useState(false);
  const richieste = useRichiesteOperativeStore((r) => r.richieste);
  const richiesteEseguite = bookingsConRichiestaEseguita(richieste);
  const richiesteInAttesa = bookingsConRichiestaInAttesa(richieste);
  const richiestePending = richiestePendingCount(richieste);

  return (
    <>
      <div className="planner">

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div className="planner__header">
          <PageHead title="Planner" subtitle="Gestione operativa in tempo reale delle prenotazioni e della disponibilità delle camere" />

          {/* ── FILTRI ────────────────────────────────────────────────────── */}
          <div className="planner__filters">

            {/* Struttura */}
            <div className="planner__filter-group">
              <SelectField
                name="struttura"
                label="Struttura"
                value={s.struttura}
                onChange={e => s.setStruttura(e.target.value)}
                options={STRUTTURE.map(st => ({ value: st, label: st }))}
              />
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
              <SelectField
                name="intervallo"
                label="Intervallo"
                value={s.intervallo}
                onChange={e => s.setIntervallo(Number(e.target.value))}
                options={[7, 10, 14, 21, 30].map(n => ({ value: n, label: `${n} gg` }))}
              />
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
              onGhost={s.toggleGhost}
              ghostActive={s.ghostMode}
              onParcheggio={s.toggleParcheggio}
              parcheggioActive={s.showParcheggio}
              parkedCount={s.parkedPrens.length}
              onNuova={() => navigate('nuova-prenotazione')}
              onArrivi={() => navigate('arrivi-partenze')}
              onOspiti={() => navigate('ospiti-in-casa')}
              onSchedine={() => navigate('schedine')}
              onRilevamento={() => navigate('rilevamento-presenze')}
              onRichieste={() => setShowRichieste(true)}
              richiesteCount={richiestePending}
              onLegenda={() => s.setShowLegenda(true)}
            />
          </div>

          <div className="planner__occupazione">
            Occupazione: {parseDt(s.startDateStr).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </div>
        </div>

        {/* ── BODY ────────────────────────────────────────────────────────── */}
        <div className="planner__body">
          <HotelVisualization
            piani={PIANI_DATA}
            activePiani={s.activePiani}
            struttura={s.struttura}
            navigate={navigate}
            onRoomClick={(numero) => {
              const pren = s.filteredPrens.find(p => p.numeroCamera === numero);
              if (pren) s.setSelectedBooking(pren);
            }}
          />
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
              onSelectPeriod={s.handleSelectPeriod}
              onAssign={s.assignBookingToRoom}
              onMove={s.moveBooking}
              showRiepilogo={s.showRiepilogo}
              onToggleRiepilogo={s.toggleRiepilogo}
              onBarHover={onBarHover}
              onBarContext={(pren, x, y) => { setBarTip(null); s.setSelectedBooking(pren); setCtxMenu({ pren, x, y }); }}
              richiesteEseguite={richiesteEseguite}
              richiesteInAttesa={richiesteInAttesa}
              ghostMode={s.ghostMode}
              blocchi={s.blocchi}
              onGhostSelect={s.handleGhostSelect}
              onGhostClick={s.openGhostEdit}
              onGhostHover={onGhostHover}
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
      {showRichieste   && <RichiesteOperativeModal onClose={() => setShowRichieste(false)} />}
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
      {s.ghostDraft && (
        <BloccoFantasmaModal
          open
          onClose={s.closeGhostModal}
          initial={s.ghostDraft}
          editing={s.ghostEditing}
          onSave={s.saveBlocco}
          onDelete={s.removeBlocco}
        />
      )}

      {/* ── Menu contestuale prenotazione (tasto destro) ─────────────────────── */}
      {ctxMenu && (
        <PrenContextMenu
          pren={ctxMenu.pren}
          x={ctxMenu.x}
          y={ctxMenu.y}
          struttura={s.struttura}
          navigate={navigate}
          onParcheggio={s.parkBooking}
          onClona={s.cloneBooking}
          onCheckIn={s.checkInBooking}
          onClose={() => setCtxMenu(null)}
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
          {richiesteByBooking(richieste, barTip.pren.booking).map(req => (
            <div key={req.id} className="planner__bar-tip-richiesta">
              <div className="planner__bar-tip-richiesta-head">
                <i className="fa-solid fa-bell-concierge" aria-hidden="true" />
                <span>Richiesta operativa · {STATO_RICHIESTA_META[req.stato].label}</span>
              </div>
              <div className="planner__bar-tip-richiesta-desc">{req.descrizione}</div>
              {req.servizi.length > 0 && (
                <div className="planner__bar-tip-richiesta-svc">{req.servizi.map(sv => sv.label).join(' · ')}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tooltip blocco fantasma (rollover) — stile scuro standard */}
      {ghostTip && (
        <div className="planner__bar-tip planner__bar-tip--ghost" style={{ '--tip-left': `${ghostTip.x + 14}px`, '--tip-top': `${ghostTip.y + 14}px` } as React.CSSProperties}>
          <div className="planner__bar-tip-row"><i className="fa-solid fa-ghost" aria-hidden="true" /> Blocco fantasma</div>
          <div className="planner__bar-tip-row planner__bar-tip-row--muted">{ghostTip.text}</div>
        </div>
      )}
    </>
  );
};

export default Planner;
