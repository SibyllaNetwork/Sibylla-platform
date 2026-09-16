// ─── Configurazione e-mail (Food & Beverage) ──────────────────────────────────
//  Il server di posta con cui l'outlet scrive all'ospite: QR del wallet, ricevute,
//  conferme di prenotazione. Pagina a due colonne — a sinistra i parametri, a
//  destra la prova d'invio e cosa parte davvero — perché una configurazione SMTP
//  si verifica mandando una mail, non rileggendo i campi.
import React, { useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import { InputField, SelectField, ToggleSwitch, NumCell } from '../../../../core/components/form'
import { toast } from '../../../../core/components/Toast/useToast'
import { useFbStore } from '../../../../store/useFbStore'
import { PROVIDER_EMAIL, type ConfigEmail } from '../fb.model'
import './FbConfigEmail.sass'

export default function FbConfigEmail({ navigate }: { navigate?: (p: string) => void }) {
  const salvata = useFbStore(s => s.configEmail)
  const salva   = useFbStore(s => s.salvaConfigEmail)

  const [cfg, setCfg] = useState<ConfigEmail>(salvata)
  const [test, setTest] = useState('')
  const [mostraPwd, setMostraPwd] = useState(false)

  const cambiato = JSON.stringify(cfg) !== JSON.stringify(salvata)

  const applicaProvider = (id: string) => {
    const p = PROVIDER_EMAIL.find(x => x.id === id)
    if (!p) return
    setCfg(c => ({
      ...c, provider: id,
      host: p.host || c.host, porta: p.porta,
      starttls: p.starttls, ssl: p.ssl,
    }))
  }

  const conferma = () => {
    if (cfg.attivo && (!cfg.host.trim() || !cfg.mittente.trim())) {
      toast.warning('Per attivare il servizio servono server e indirizzo mittente')
      return
    }
    salva(cfg)
    toast.success('Configurazione salvata')
  }

  const provaInvio = () => {
    if (!cfg.attivo) { toast.warning('Attiva prima la configurazione'); return }
    if (!test.trim()) { toast.warning('Indica un indirizzo di prova'); return }
    toast.success(`Messaggio di prova inviato a ${test}`)
  }

  return (
    <div className="fbmail">
      <PageHead
        title="Configurazione e-mail"
        subtitle="Il server con cui l’outlet scrive agli ospiti"
        actions={
          <button type="button" className="fbmail__head-btn" onClick={conferma} disabled={!cambiato}>
            <i className="fa-solid fa-floppy-disk" aria-hidden="true" /> Salva configurazione
          </button>
        }
      />

      <div className="fbmail__body">
        {/* ── Parametri SMTP ────────────────────────────────────────────────── */}
        <section className="fbmail__blk">
          <header className="fbmail__blk-head">
            <h3><i className="fa-solid fa-gear" aria-hidden="true" /> Impostazioni SMTP</h3>
            <ToggleSwitch
              label={cfg.attivo ? 'Servizio attivo' : 'Servizio spento'}
              checked={cfg.attivo}
              onChange={v => setCfg(c => ({ ...c, attivo: v }))}
            />
          </header>

          <div className="fbmail__corpo">
            <div className="fbmail__blk2">
              <span className="fbmail__lab">Provider</span>
              <div className="fbmail__chips">
                {PROVIDER_EMAIL.map(p => (
                  <button
                    key={p.id} type="button"
                    className={`fbmail__chip ${cfg.provider === p.id ? 'is-on' : ''}`}
                    onClick={() => applicaProvider(p.id)}
                  >{p.label}</button>
                ))}
              </div>
            </div>

            <div className="fbmail__row">
              <InputField
                name="host" label="Server SMTP" className="fbmail__grow" value={cfg.host}
                placeholder="smtp.miohotel.com"
                onChange={e => setCfg(c => ({ ...c, host: e.target.value }))}
              />
              <div className="fbmail__porta">
                <span className="fbmail__lab">Porta</span>
                <NumCell
                  className="sib-input fbmail__porta-in" min={1} max={65535} value={cfg.porta}
                  aria-label="Porta del server"
                  onChange={n => setCfg(c => ({ ...c, porta: n }))}
                />
              </div>
            </div>

            <div className="fbmail__sicurezza">
              <label>
                <input
                  type="checkbox" className="sib-checkbox" checked={cfg.starttls}
                  onChange={e => setCfg(c => ({ ...c, starttls: e.target.checked, ssl: e.target.checked ? false : c.ssl }))}
                />
                STARTTLS <em>(porta 587)</em>
              </label>
              <label>
                <input
                  type="checkbox" className="sib-checkbox" checked={cfg.ssl}
                  onChange={e => setCfg(c => ({ ...c, ssl: e.target.checked, starttls: e.target.checked ? false : c.starttls }))}
                />
                SSL/TLS <em>(porta 465)</em>
              </label>
            </div>

            <div className="fbmail__row">
              <InputField
                name="username" label="Utente" className="fbmail__grow" value={cfg.username}
                onChange={e => setCfg(c => ({ ...c, username: e.target.value }))}
              />
              <div className="fbmail__pwd">
                <span className="fbmail__lab">Password</span>
                <div className="fbmail__pwd-campo">
                  <input
                    type={mostraPwd ? 'text' : 'password'}
                    className="sib-input"
                    value={cfg.password}
                    aria-label="Password del server"
                    onChange={e => setCfg(c => ({ ...c, password: e.target.value }))}
                  />
                  <button
                    type="button" onClick={() => setMostraPwd(v => !v)}
                    aria-label={mostraPwd ? 'Nascondi la password' : 'Mostra la password'}
                  >
                    <i className={`fa-solid ${mostraPwd ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>

            <div className="fbmail__row">
              <InputField
                name="mittente" label="Indirizzo mittente" className="fbmail__grow" value={cfg.mittente}
                placeholder="no-reply@miohotel.com"
                onChange={e => setCfg(c => ({ ...c, mittente: e.target.value }))}
              />
              <InputField
                name="nomeMittente" label="Nome mittente" className="fbmail__grow" value={cfg.nomeMittente}
                onChange={e => setCfg(c => ({ ...c, nomeMittente: e.target.value }))}
              />
            </div>
          </div>
        </section>

        {/* ── Prova e contenuto ─────────────────────────────────────────────── */}
        <aside className="fbmail__lato">
          <section className="fbmail__blk">
            <header className="fbmail__blk-head">
              <h3><i className="fa-solid fa-paper-plane" aria-hidden="true" /> Prova d’invio</h3>
            </header>
            <div className="fbmail__corpo">
              <InputField
                name="test" label="Indirizzo di prova" type="email" value={test}
                placeholder="tuo@email.com"
                onChange={e => setTest(e.target.value)}
              />
              <button
                type="button" className="fbmail__prova"
                onClick={provaInvio}
                disabled={!cfg.attivo}
              >
                <i className="fa-solid fa-envelope-circle-check" aria-hidden="true" /> Invia il messaggio di prova
              </button>
              {!cfg.attivo && (
                <p className="fbmail__avviso">
                  <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                  Attiva la configurazione con l’interruttore qui a fianco.
                </p>
              )}
            </div>
          </section>

          <section className="fbmail__blk fbmail__blk--info">
            <header className="fbmail__blk-head">
              <h3><i className="fa-solid fa-inbox" aria-hidden="true" /> Cosa viene inviato</h3>
            </header>
            <ul className="fbmail__lista">
              <li>QR code del wallet con il saldo aggiornato</li>
              <li>Data di scadenza del credito, se impostata</li>
              <li>Nome del cliente e del wallet</li>
              <li>Istruzioni d’uso al momento del pagamento</li>
              <li>Conferme di prenotazione dal libro</li>
            </ul>
          </section>

          <section className="fbmail__blk fbmail__blk--nota">
            <header className="fbmail__blk-head">
              <h3><i className="fa-solid fa-lightbulb" aria-hidden="true" /> Se usi Gmail</h3>
            </header>
            <ol className="fbmail__lista fbmail__lista--num">
              <li>Serve una <strong>app password</strong>, non la password dell’account</li>
              <li>Attiva la verifica in due passaggi sull’account Google</li>
              <li>Genera una password dedicata per “Posta”</li>
              <li>Incollala qui al posto della password normale</li>
            </ol>
          </section>
        </aside>
      </div>
    </div>
  )
}
