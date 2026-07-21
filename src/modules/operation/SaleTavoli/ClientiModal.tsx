// ─── ClientiModal ─────────────────────────────────────────────────────────────
// Anagrafica clienti del ristorante: elenco a sinistra, scheda a destra.
import React, { useState } from 'react';
import Modal from '../../../core/components/Modal';
import { InputField, TextareaField } from '../../../core/components/form';
import { useConfirmStore } from '../../../store/useConfirmStore';
import { useClientiStore, Cliente } from '../../../store/useClientiStore';

const ClientiModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const clienti = useClientiStore(s => s.clienti);
  const addCliente = useClientiStore(s => s.addCliente);
  const updateCliente = useClientiStore(s => s.updateCliente);
  const removeCliente = useClientiStore(s => s.removeCliente);
  const confirm = useConfirmStore(s => s.confirm);

  const [selId, setSelId] = useState<string | null>(clienti[0]?.id ?? null);
  const sel = clienti.find(c => c.id === selId) ?? null;

  const add = () => { const id = addCliente({ nome: 'Nuovo cliente' }); setSelId(id); };
  const del = async (c: Cliente) => {
    const ok = await confirm({ title: 'Elimina cliente', message: `Eliminare "${c.nome}" dall'anagrafica?`, confirmLabel: 'Elimina', danger: true });
    if (!ok) return;
    removeCliente(c.id);
    setSelId(null);
  };

  return (
    <Modal open onClose={onClose} title="Anagrafica clienti" size="lg">
      <div className="clienti">
        <div className="clienti__list">
          <button type="button" className="clienti__add" onClick={add}>
            <i className="fa-solid fa-plus" /> Nuovo cliente
          </button>
          {clienti.map(c => (
            <button key={c.id} type="button"
              className={`clienti__item${selId === c.id ? ' is-sel' : ''}`} onClick={() => setSelId(c.id)}>
              <span className="clienti__item-nome">{c.nome}</span>
              <span className="clienti__item-sub">
                {c.telefono || '—'}{c.allergie ? ' · ⚠ allergie' : ''} · {c.visite ?? 0} visite
              </span>
            </button>
          ))}
          {clienti.length === 0 && <div className="clienti__empty">Nessun cliente in anagrafica</div>}
        </div>

        <div className="clienti__form">
          {sel ? (
            <>
              <InputField name="cli-nome" label="Nome" value={sel.nome} onChange={e => updateCliente(sel.id, { nome: e.target.value })} />
              <div className="clienti__row2">
                <InputField name="cli-tel" label="Telefono" value={sel.telefono ?? ''} onChange={e => updateCliente(sel.id, { telefono: e.target.value })} placeholder="+39…" />
                <InputField name="cli-mail" label="Email" value={sel.email ?? ''} onChange={e => updateCliente(sel.id, { email: e.target.value })} />
              </div>
              <InputField name="cli-all" label="Allergie / intolleranze" value={sel.allergie ?? ''} onChange={e => updateCliente(sel.id, { allergie: e.target.value })} placeholder="Es. glutine, lattosio…" />
              <TextareaField name="cli-note" label="Note & preferenze" rows={3} value={sel.note ?? ''} onChange={e => updateCliente(sel.id, { note: e.target.value })} placeholder="Tavolo preferito, occasioni, richieste ricorrenti…" />
              <div className="clienti__foot">
                <span className="clienti__visite"><i className="fa-regular fa-calendar-check" /> {sel.visite ?? 0} visite</span>
                <button type="button" className="sib-btn sib-btn--danger sib-btn--sm" onClick={() => del(sel)}>
                  <i className="fa-solid fa-trash" /> Elimina
                </button>
              </div>
            </>
          ) : (
            <div className="clienti__empty">Seleziona un cliente a sinistra, oppure aggiungine uno nuovo.</div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ClientiModal;
