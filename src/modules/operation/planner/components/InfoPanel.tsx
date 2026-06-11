// ─── InfoPanel ────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { Pren, PrenPendente } from '../planner.types';
import { STATO_CLR } from '../planner.styles';
import { fmtDate, parseDt, MO } from '../planner.data';
import DettaglioCamereModal from './DettaglioCamereModal';
import ModificaPrenModal from './ModificaPrenModal';
import GestisciDateModal from './GestisciDateModal';
import SpostaPrenModal from './SpostaPrenModal';
import Modal from '../../../../core/components/Modal';
import { bookingStore } from '../../../../core/bookingStore';

interface Props {
  selected        : Pren | null;
  struttura       : string;
  pendingDa       : PrenPendente[];
  pendingAl       : PrenPendente[];
  onOpenAssegnare : () => void;
  onOpenAllocare  : () => void;
  navigate?       : (page: string) => void;
}

const STATO_LABEL: Record<string, string> = {
  confermata: 'Confermato', opzione: 'Opzione', noshow: 'No show',
  checkin: 'Check-in', checkin_p: 'Check-in parziale', checkout: 'Check-out',
  manutenzione: 'Manutenzione', pulizia: 'Pulizia',
};

const dm = (s: string) => { const d = parseDt(s); return `${d.getDate()} ${MO[d.getMonth()].toLowerCase()}`; };

type ModalKey = null | 'dettaglio' | 'modifica' | 'date' | 'sposta' | 'annulla';

const PendCard: React.FC<{ title: string; count: number; items: PrenPendente[]; onOpen: () => void }> = ({ title, count, items, onOpen }) => (
  <div className="info-panel__card">
    <button className="info-panel__pend-header" onClick={onOpen}>
      <span>{title}</span>
      <svg viewBox="0 0 16 16" width={10} height={10} fill="currentColor"><path d="M8 5l5 5H3z" /></svg>
    </button>
    <div className="info-panel__pend-body">
      <div className="info-panel__pend-count">{title.includes('assegna') ? 'Da assegnare' : 'Da allocare'}: <b>{count}</b></div>
      {items.map((p, i) => (
        <div key={i} className="info-panel__pend-row">
          <span className="info-panel__pend-num">{p.booking}</span>
          <span className="info-panel__pend-seg">{p.segmento}</span>
        </div>
      ))}
    </div>
  </div>
);

const ACT = [
  { key: 'note',     icon: 'fa-cloud-arrow-up',         label: 'Note prenotazione' },
  { key: 'modifica', icon: 'fa-pen',                    label: 'Modifica prenotazione' },
  { key: 'date',     icon: 'fa-calendar',               label: 'Gestisci date' },
  { key: 'sposta',   icon: 'fa-arrow-right-arrow-left', label: 'Sposta prenotazione' },
  { key: 'annulla',  icon: 'fa-trash',                  label: 'Annulla prenotazione' },
] as const;

const Field: React.FC<{ k: string; children: React.ReactNode }> = ({ k, children }) => (
  <div className="info-panel__f">
    <span className="info-panel__f-k">{k}</span>
    <span className="info-panel__f-v">{children}</span>
  </div>
);

const InfoPanel: React.FC<Props> = ({ selected, struttura, pendingDa, pendingAl, onOpenAssegnare, onOpenAllocare, navigate }) => {
  const [modal, setModal] = useState<ModalKey>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => { setNoteOpen(false); setNote(selected?.note ?? ''); setModal(null); }, [selected]);

  const clr = selected ? STATO_CLR[selected.stato] : null;

  const handleAct = (key: string) => {
    if (key === 'note') setNoteOpen(v => !v);
    // "Modifica": apre la pagina prenotazione in modalità modifica (campi precompilati)
    else if (key === 'modifica' && navigate && selected) {
      bookingStore.editing = selected;
      navigate('nuova-prenotazione');
    }
    else setModal(key as ModalKey);
  };

  return (
    <div className="info-panel">
      <div className="info-panel__card">
        <div className="info-panel__card-header">Info</div>
        <div className="info-panel__card-body">
          {!selected ? (
            <p className="info-panel__empty">Seleziona una prenotazione dal planner per ottenere le informazioni.</p>
          ) : (
            <>
              <Field k="Prenotazione"><b>{selected.booking}</b> del {fmtDate(parseDt(selected.checkIn))}</Field>

              <div className="info-panel__grid2">
                <Field k="Stato">
                  <span className="info-panel__stato"><span className="info-panel__stato-dot" style={{ '--dot-bg': clr!.bg } as React.CSSProperties} />{STATO_LABEL[selected.stato] ?? selected.stato}</span>
                </Field>
                <Field k="Cliente">{selected.cliente || '—'}</Field>
                <Field k="In/Out"><b>{dm(selected.checkIn)} / {dm(selected.checkOut)}</b></Field>
                <Field k="Stato Check In"><i className="fa-light fa-id-card" /> {selected.statoCheckIn ?? 'In attesa'}</Field>
              </div>

              <Field k="Persone">
                <span className="info-panel__people">
                  <b>{selected.persone ?? 2}</b>
                  <span className="info-panel__people-sub"><i className="fa-light fa-person" />{selected.adulti ?? 0}</span>
                  <span className="info-panel__people-sub"><i className="fa-light fa-child" />{selected.bambini ?? 0}</span>
                  <span className="info-panel__people-sub"><i className="fa-light fa-baby" />{selected.neonati ?? 0}</span>
                  <span className="info-panel__people-sub"><i className="fa-light fa-paw" />{selected.animali ?? 0}</span>
                </span>
              </Field>

              <div className="info-panel__grid2">
                <Field k="Agenzia">{selected.agenzia ?? '—'}</Field>
                <Field k="Segmento"><i className="fa-light fa-user-group" /> {selected.segmento ?? '—'}</Field>
                <Field k="Camere">{selected.camere ?? selected.dettaglioCamere?.length ?? 1}</Field>
                <Field k="Arrangiamento">{selected.arrangiamento ?? 'RO'}</Field>
              </div>

              <button className="info-panel__dettaglio" onClick={() => setModal('dettaglio')}>
                <i className="fa-light fa-circle-info" /> Dettaglio
              </button>

              <div className="info-panel__actions">
                {ACT.map(a => (
                  <div key={a.key} className="action-buttons__item">
                    <button className="info-panel__act-btn" onClick={() => handleAct(a.key)} aria-label={a.label}>
                      <i className={`fa-light ${a.icon}`} aria-hidden="true" />
                    </button>
                    <div className="action-buttons__tooltip">{a.label}</div>
                  </div>
                ))}
              </div>

              {noteOpen && (
                <div className="info-panel__note">
                  <textarea className="info-panel__note-area" value={note} onChange={e => setNote(e.target.value)} placeholder="Inserisci un commento…" />
                  <button className="sib-btn sib-btn--primary sib-btn--sm" onClick={() => setNoteOpen(false)}>Salva</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <PendCard title="Prenotazioni da assegnare" count={pendingDa.length} items={pendingDa} onOpen={onOpenAssegnare} />
      <PendCard title="Prenotazioni da allocare"  count={pendingAl.length} items={pendingAl} onOpen={onOpenAllocare} />

      {/* ── Modali ── */}
      <DettaglioCamereModal open={modal === 'dettaglio'} pren={selected} struttura={struttura} onClose={() => setModal(null)} />
      <ModificaPrenModal   open={modal === 'modifica'}  pren={selected} onClose={() => setModal(null)} />
      <GestisciDateModal   open={modal === 'date'}      pren={selected} onClose={() => setModal(null)} onConfirm={() => {}} />
      <SpostaPrenModal     open={modal === 'sposta'}    pren={selected} onClose={() => setModal(null)} onConfirm={() => {}} />
      {modal === 'annulla' && selected && (
        <Modal open onClose={() => setModal(null)} title={`Annulla prenotazione N.${selected.booking}`} size="sm">
          <div className="annulla-pren">
            <p>Vuoi davvero annullare questa prenotazione? L'operazione non è reversibile.</p>
            <div className="annulla-pren__actions">
              <button className="sib-btn sib-btn--secondary" onClick={() => setModal(null)}>Indietro</button>
              <button className="sib-btn sib-btn--danger" onClick={() => setModal(null)}>Annulla prenotazione</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default InfoPanel;
