import React from 'react'
import Modal from '../../../../core/components/Modal'
import Ico from '../../../../core/icons/Ico'
import type { MasterForm } from '../../types'
import './MasterUserModal.sass'

interface Props {
  open: boolean
  form: MasterForm
  setForm: (f: MasterForm) => void
  clienteName: string | undefined
  sending: boolean
  sent: boolean
  onClose: () => void
  onSend: () => void
}

export default function MasterUserModal({
  open, form, setForm, clienteName, sending, sent, onClose, onSend,
}: Props) {
  const submitDisabled = !form.nome.trim() || !form.email.trim() || sending

  return (
    <Modal open={open} onClose={() => { if (sent) onClose() }} size="md">
      {!sent ? (
        <div className="mum">
          <div className="mum__head">
            <div className="mum__head-ico">
              <Ico n="profile" s={22} c="var(--color-primary)" />
            </div>
            <div>
              <h2 className="mum__title">Crea utente Master</h2>
              <p className="mum__sub">
                Obbligatorio — questo utente sarà il super amministratore di <strong>{clienteName}</strong>.<br />
                Riceverà via email le istruzioni di accesso alla piattaforma.
              </p>
            </div>
          </div>

          <div className="mum__warning">
            <Ico n="medal" s={14} c="#F59E0B" />
            <span className="mum__warning-text">Utente Master · Accesso completo alla piattaforma</span>
          </div>

          <div className="mum__form">
            <div className="mum__row-2">
              <div>
                <label className="mum__label">Nome *</label>
                <input
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  placeholder="Mario"
                  className="sib-input"
                />
              </div>
              <div>
                <label className="mum__label">Cognome *</label>
                <input
                  value={form.cognome}
                  onChange={e => setForm({ ...form, cognome: e.target.value })}
                  placeholder="Rossi"
                  className="sib-input"
                />
              </div>
            </div>
            <div>
              <label className="mum__label">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="mario.rossi@hotel.it"
                className="sib-input"
              />
            </div>
            <div>
              <label className="mum__label">Telefono</label>
              <input
                value={form.telefono}
                onChange={e => setForm({ ...form, telefono: e.target.value })}
                placeholder="+39 000 000 0000"
                className="sib-input"
              />
            </div>
            <div>
              <label className="mum__label">Qualifica</label>
              <input
                value={form.ruolo}
                onChange={e => setForm({ ...form, ruolo: e.target.value })}
                placeholder="Es. Amministratore Unico, CEO, Direttore"
                className="sib-input"
              />
            </div>

            <div className="mum__preview">
              <div className="mum__preview-title">Anteprima email di benvenuto</div>
              <div className="mum__preview-body">
                <div><strong>A:</strong> {form.email || <span className="mum__placeholder">email@hotel.it</span>}</div>
                <div><strong>Oggetto:</strong> Benvenuto in Sibylla Platform — Accesso al tuo account</div>
                <div className="mum__email">
                  Gentile <strong>{form.nome || '[Nome]'} {form.cognome || '[Cognome]'}</strong>,<br />
                  il tuo account Master su <strong>Sibylla Platform</strong> per <strong>{clienteName || 'la struttura'}</strong> è stato attivato.<br /><br />
                  🔗 <strong>Accedi a:</strong> app.sibyllanetwork.com<br />
                  📧 <strong>Username:</strong> {form.email || '[email]'}<br />
                  🔑 <strong>Password temporanea:</strong> verrà generata automaticamente<br /><br />
                  Al primo accesso ti verrà chiesto di impostare una nuova password e completare la configurazione del tuo profilo.
                </div>
              </div>
            </div>

            <div className="mum__actions">
              <button
                className="sib-btn sib-btn--primary mum__send"
                disabled={submitDisabled}
                onClick={onSend}
              >
                {sending ? (
                  <>
                    <i className="fa-duotone fa-spinner mum__spinner" />
                    Invio in corso...
                  </>
                ) : (
                  <>
                    <Ico n="send" s={14} c="#fff" />
                    Crea e invia email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mum mum--success">
          <div className="mum__success-ico">
            <Ico n="check" s={28} c="var(--color-success)" />
          </div>
          <h2 className="mum__success-title">Account Master creato!</h2>
          <p className="mum__success-text">
            <strong>{form.nome} {form.cognome}</strong> è stato registrato come utente Master di<br />
            <strong>{clienteName}</strong>.
          </p>
          <p className="mum__success-mail">
            Un'email di benvenuto è stata inviata a <strong>{form.email}</strong>
          </p>
          <div className="mum__summary">
            <div className="mum__summary-title">Riepilogo</div>
            {[
              { label: 'Cliente',           value: clienteName },
              { label: 'Nome',              value: `${form.nome} ${form.cognome}` },
              { label: 'Email',             value: form.email },
              { label: 'Qualifica',         value: form.ruolo },
              { label: 'Ruolo piattaforma', value: 'Master · Super Admin' },
            ].map(row => (
              <div key={row.label} className="mum__summary-row">
                <span className="mum__summary-key">{row.label}</span>
                <span className="mum__summary-val">{row.value}</span>
              </div>
            ))}
          </div>
          <button className="sib-btn sib-btn--primary mum__cta" onClick={onClose}>
            Vai alla configurazione →
          </button>
        </div>
      )}
    </Modal>
  )
}
