// ─── ModificaPrenModal ────────────────────────────────────────────────────────
import React, { useState } from 'react';
import Modal from '../../../../core/components/Modal';
import { InputField } from '../../../../core/components/form';
import { Pren, RoomDetail } from '../planner.types';
import { fmtDate, parseDt } from '../planner.data';

interface Props {
  open    : boolean;
  pren    : Pren | null;
  onClose : () => void;
}

const ARRANG = ['RO', 'BB', 'HB', 'FB', 'AI'];
const EXTRA = ['Test Tour Ali Aslan', 'Transfer', 'Sconto', 'Pet Sitting'];

const ModificaPrenModal: React.FC<Props> = ({ open, pren, onClose }) => {
  const [tab, setTab] = useState<'gruppo' | 'individuale'>('gruppo');
  if (!pren) return null;

  const rooms: RoomDetail[] = pren.dettaglioCamere ?? [
    { numero: pren.numeroCamera, piano: '—', nome: 'Camera', tipoAssegnato: 'Singola', tipoRichiesto: 'Singola', statoCheckIn: 'In attesa' },
  ];
  const dateLabel = `${fmtDate(parseDt(pren.checkIn))} - ${fmtDate(parseDt(pren.checkOut))}`;

  return (
    <Modal open={open} onClose={onClose} title={`Modifica prenotazione N.${pren.booking}`} size="xl">
      <div className="mod-pren">
        {/* Tab header */}
        <div className="mod-pren__tabs">
          <button className={`mod-pren__tab${tab === 'gruppo' ? ' is-active' : ''}`} onClick={() => setTab('gruppo')}>Gruppo</button>
          <button className={`mod-pren__tab${tab === 'individuale' ? ' is-active' : ''}`} onClick={() => setTab('individuale')}>Individuale</button>
          <div className="mod-pren__tabs-icons">
            <button className="sib-btn sib-btn--icon sib-btn--sm"><i className="fa-light fa-circle-info" /></button>
            <button className="sib-btn sib-btn--icon sib-btn--sm"><i className="fa-light fa-credit-card" /></button>
            <button className="sib-btn sib-btn--icon sib-btn--sm"><i className="fa-light fa-user-group" /></button>
          </div>
        </div>

        {/* Top: date/camere/persone + tipologie */}
        <div className="mod-pren__top">
          <div className="mod-pren__box mod-pren__box--left">
            <div className="mod-pren__date">Date: {dateLabel}</div>
            <div className="mod-pren__grid2">
              <label className="mod-pren__field"><span>Camere:</span><input className="sib-input sib-input--dense" defaultValue={pren.camere ?? rooms.length} /></label>
              <label className="mod-pren__field"><span>Persone:</span><input className="sib-input sib-input--dense" defaultValue={pren.persone ?? 2} /></label>
            </div>
            <div className="mod-pren__btns">
              <button className="sib-btn sib-btn--secondary sib-btn--sm"><i className="fa-light fa-gear" /> Alloca</button>
              <button className="sib-btn sib-btn--secondary sib-btn--sm"><i className="fa-light fa-user-check" /> Assegna</button>
            </div>
            <div className="mod-pren__radios">
              <label><input type="radio" name="tipoOspite" defaultChecked /> Adulti</label>
              <label><input type="radio" name="tipoOspite" /> Studenti</label>
            </div>
          </div>

          <div className="mod-pren__box mod-pren__box--right">
            <div className="mod-pren__hotel-tag">Hotel Tutorial</div>
            <div className="mod-pren__types-head">
              <span>Tipologie camere disponibili</span><span>Persone</span><span>N. Camera</span>
            </div>
            {rooms.map((r, i) => (
              <div key={i} className="mod-pren__type-row">
                <i className="fa-light fa-bed" />
                <select className="sib-select sib-select--dense"><option>{`${10 + i} | ${r.tipoAssegnato} Classic`}</option></select>
                <input className="sib-input sib-input--dense" defaultValue={2} />
                <select className="sib-select sib-select--dense"><option>{r.numero}</option></select>
              </div>
            ))}
          </div>
        </div>

        {/* Agenzia / stato / arrangiamento */}
        <div className="mod-pren__box">
          <div className="mod-pren__grid-ag">
            <InputField
              className="mod-pren__field-col"
              name="agenzia"
              label="Agenzia"
              defaultValue={pren.agenzia ?? ''}
            />
            <div className="mod-pren__stato-arr">
              <div className="mod-pren__stato">
                <label><input type="checkbox" defaultChecked={pren.stato === 'confermata'} /> <span className="mod-pren__dot mod-pren__dot--green" /> Confermata</label>
                <label><input type="checkbox" defaultChecked={pren.stato === 'opzione'} /> <span className="mod-pren__dot mod-pren__dot--red" /> Opzione</label>
              </div>
              <label className="mod-pren__field-inline"><span>Arrangiamento</span>
                <select className="sib-select sib-select--dense" defaultValue={pren.arrangiamento ?? 'RO'}>{ARRANG.map(a => <option key={a}>{a}</option>)}</select>
              </label>
              <label className="mod-pren__field-inline"><span>Credit</span>
                <select className="sib-select sib-select--dense"><option>NC</option></select>
              </label>
            </div>
          </div>
          <InputField className="mod-pren__field-col" name="nomeGruppo" label="Nome Gruppo" />
          <InputField className="mod-pren__field-col" name="capoGruppo" label="Nome Capo Gruppo" placeholder="Cerca capo gruppo (min. 3 caratteri)" />
          <InputField className="mod-pren__field-col" name="emailCapoGruppo" label="E-mail Capo Gruppo" />
        </div>

        {/* Extra inclusi */}
        <div className="mod-pren__box">
          <div className="mod-pren__extra-head"><span>Extra inclusi</span><span>Quantità</span><span>Totale</span></div>
          {EXTRA.map(e => (
            <div key={e} className="mod-pren__extra-row">
              <span><i className="fa-light fa-circle-plus" /> {e}</span>
            </div>
          ))}
          <div className="mod-pren__extra-tot">Totale servizi: <b>0,00 €</b></div>
        </div>

        {/* Nazionalità + note */}
        <div className="mod-pren__naz">
          <label className="mod-pren__field-inline"><span>Nazionalità</span>
            <select className="sib-select sib-select--dense"><option>🇮🇹 ITALIA</option></select>
          </label>
          <InputField
            className="mod-pren__field-grow"
            name="notePrenotazione"
            label="Note prenotazione"
            defaultValue={pren.note ?? ''}
          />
        </div>

        {/* Totali */}
        <div className="mod-pren__totals">
          {[['Soggiorno', '1.975.095,36 €'], ['Servizi', '0,00 €'], ['Anticipo', '0,00 €'], ['Da pagare', '1.975.095,36 €'], ['Totale', '1.975.095,36 €']].map(([k, v]) => (
            <div key={k} className="mod-pren__total"><span>{k}:</span><b>{v}</b></div>
          ))}
        </div>

        {/* Footer */}
        <div className="mod-pren__footer">
          <button className="sib-btn sib-btn--danger-outline" onClick={onClose}>Annulla prenotazione</button>
          <div className="mod-pren__footer-right">
            <button className="sib-btn sib-btn--secondary" onClick={onClose}>Salva e continua</button>
            <button className="sib-btn sib-btn--primary" onClick={onClose}>Salva</button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ModificaPrenModal;
