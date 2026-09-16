// ─── Mobile wallet (Food & Beverage) ──────────────────────────────────────────
//  La tessera del cliente su Apple Wallet e Google Wallet: è il QR che al tavolo
//  vale come credito. La configurazione richiede certificati rilasciati dai due
//  fornitori, quindi la pagina mette i prerequisiti in testa — è lì che ci si
//  blocca — e poi i campi, uno per fornitore.
import React, { useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import Tooltip from '../../../../core/components/Tooltip'
import { InputField, ToggleSwitch } from '../../../../core/components/form'
import { toast } from '../../../../core/components/Toast/useToast'
import { useFbStore } from '../../../../store/useFbStore'
import type { ConfigWallet } from '../fb.model'
import './FbMobileWallet.sass'

type Scheda = 'apple' | 'google'

export default function FbMobileWallet({ navigate }: { navigate?: (p: string) => void }) {
  const salvata = useFbStore(s => s.configWallet)
  const salva   = useFbStore(s => s.salvaConfigWallet)

  const [cfg, setCfg] = useState<ConfigWallet>(salvata)
  const [scheda, setScheda] = useState<Scheda>('apple')

  const cambiato = JSON.stringify(cfg) !== JSON.stringify(salvata)

  const conferma = () => {
    if (cfg.apple.attivo && (!cfg.apple.teamId.trim() || !cfg.apple.passTypeId.trim())) {
      toast.warning('Per Apple Wallet servono Team ID e Pass Type ID')
      return
    }
    if (cfg.google.attivo && !cfg.google.issuerId.trim()) {
      toast.warning('Per Google Wallet serve l’Issuer ID')
      return
    }
    salva(cfg)
    toast.success('Configurazione wallet salvata')
  }

  /** Il caricamento dei certificati passa dal backend: qui si annota il nome. */
  const carica = (campo: 'certificato' | 'chiave' | 'wwdr' | 'serviceAccount') => {
    const nome = campo === 'serviceAccount' ? 'service-account.json'
      : campo === 'certificato' ? 'certificate.pem'
      : campo === 'chiave' ? 'key.pem' : 'wwdr.pem'
    if (campo === 'serviceAccount') setCfg(c => ({ ...c, google: { ...c.google, serviceAccount: nome } }))
    else setCfg(c => ({ ...c, apple: { ...c.apple, [campo]: nome } }))
    toast.success(`${nome} caricato`)
  }

  return (
    <div className="fbwal">
      <PageHead
        title="Mobile wallet"
        subtitle="Le tessere digitali Apple e Google per il credito dei clienti"
        actions={
          <button type="button" className="fbwal__head-btn" onClick={conferma} disabled={!cambiato}>
            <i className="fa-solid fa-floppy-disk" aria-hidden="true" /> Salva configurazione
          </button>
        }
      />

      <p className="fbwal__prereq">
        <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
        <span>
          <strong>Prerequisiti.</strong> Apple: account Apple Developer (99 $/anno) →
          Identifiers → Pass Type ID. Google: Google Cloud Console → Wallet API →
          service account abilitato su Google Pay &amp; Wallet Console.
        </span>
      </p>

      <div className="fbwal__tabs">
        <button type="button" className={scheda === 'apple' ? 'is-on' : ''} onClick={() => setScheda('apple')}>
          <i className="fa-brands fa-apple" aria-hidden="true" /> Apple Wallet
          <span className={`fbwal__pallino ${cfg.apple.attivo ? 'is-on' : ''}`} />
        </button>
        <button type="button" className={scheda === 'google' ? 'is-on' : ''} onClick={() => setScheda('google')}>
          <i className="fa-brands fa-google" aria-hidden="true" /> Google Wallet
          <span className={`fbwal__pallino ${cfg.google.attivo ? 'is-on' : ''}`} />
        </button>
      </div>

      {scheda === 'apple' && (
        <section className="fbwal__blk">
          <header className="fbwal__blk-head">
            <h3>Apple Wallet</h3>
            <ToggleSwitch
              label={cfg.apple.attivo ? 'Attivo' : 'Disattivato'}
              checked={cfg.apple.attivo}
              onChange={v => setCfg(c => ({ ...c, apple: { ...c.apple, attivo: v } }))}
            />
          </header>

          <div className="fbwal__corpo">
            <ol className="fbwal__guida">
              <li>Apple Developer → Identifiers → Pass Type IDs</li>
              <li>Crea un Pass Type ID, per esempio <code>pass.com.tuohotel.wallet</code></li>
              <li>Genera il certificato e scarica <code>Certificates.p12</code></li>
              <li>Converti in PEM e carica certificato, chiave e WWDR qui sotto</li>
            </ol>

            <div className="fbwal__row">
              <InputField
                name="teamId" label="Team ID" value={cfg.apple.teamId}
                placeholder="ABCDE12345"
                onChange={e => setCfg(c => ({ ...c, apple: { ...c.apple, teamId: e.target.value } }))}
              />
              <InputField
                name="passTypeId" label="Pass Type ID" className="fbwal__grow" value={cfg.apple.passTypeId}
                placeholder="pass.com.tuohotel.wallet"
                onChange={e => setCfg(c => ({ ...c, apple: { ...c.apple, passTypeId: e.target.value } }))}
              />
            </div>

            <InputField
              name="organizzazione" label="Nome organizzazione (appare sul pass)" value={cfg.apple.organizzazione}
              placeholder="Hotel La Terrazza"
              onChange={e => setCfg(c => ({ ...c, apple: { ...c.apple, organizzazione: e.target.value } }))}
            />

            <div className="fbwal__file-riga">
              {([
                ['certificato', 'Certificate PEM', cfg.apple.certificato],
                ['chiave', 'Private key PEM', cfg.apple.chiave],
                ['wwdr', 'WWDR certificate', cfg.apple.wwdr],
              ] as const).map(([campo, label, valore]) => (
                <div key={campo} className="fbwal__file">
                  <span className="fbwal__lab">{label}</span>
                  <div className="fbwal__file-box">
                    <button type="button" onClick={() => carica(campo)}>
                      <i className="fa-solid fa-upload" aria-hidden="true" /> Carica
                    </button>
                    <span className={valore ? 'fbwal__file-ok' : 'fbwal__file-no'}>
                      {valore || 'nessun file'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <InputField
              name="pwd" label="Password della chiave PEM" value={cfg.apple.password}
              placeholder="usata durante l’export del .p12"
              onChange={e => setCfg(c => ({ ...c, apple: { ...c.apple, password: e.target.value } }))}
            />
          </div>
        </section>
      )}

      {scheda === 'google' && (
        <section className="fbwal__blk">
          <header className="fbwal__blk-head">
            <h3>Google Wallet</h3>
            <ToggleSwitch
              label={cfg.google.attivo ? 'Attivo' : 'Disattivato'}
              checked={cfg.google.attivo}
              onChange={v => setCfg(c => ({ ...c, google: { ...c.google, attivo: v } }))}
            />
          </header>

          <div className="fbwal__corpo">
            <ol className="fbwal__guida">
              <li>Google Cloud Console → abilita la Wallet API</li>
              <li>Crea un service account e scarica la chiave JSON</li>
              <li>Autorizza il service account su Google Pay &amp; Wallet Console</li>
              <li>Copia qui l’Issuer ID e crea la classe del pass</li>
            </ol>

            <div className="fbwal__row">
              <InputField
                name="issuer" label="Issuer ID" value={cfg.google.issuerId}
                placeholder="3388000000022…"
                onChange={e => setCfg(c => ({ ...c, google: { ...c.google, issuerId: e.target.value } }))}
              />
              <InputField
                name="classe" label="ID della classe" className="fbwal__grow" value={cfg.google.classeId}
                placeholder="issuerId.wallet_outlet"
                onChange={e => setCfg(c => ({ ...c, google: { ...c.google, classeId: e.target.value } }))}
              />
            </div>

            <div className="fbwal__file">
              <span className="fbwal__lab">Chiave del service account (JSON)</span>
              <div className="fbwal__file-box">
                <button type="button" onClick={() => carica('serviceAccount')}>
                  <i className="fa-solid fa-upload" aria-hidden="true" /> Carica
                </button>
                <span className={cfg.google.serviceAccount ? 'fbwal__file-ok' : 'fbwal__file-no'}>
                  {cfg.google.serviceAccount || 'nessun file'}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      <p className="fbwal__nota">
        <Tooltip text="Il credito resta sul wallet del cliente: la tessera è solo il modo di presentarlo al tavolo">
          <span>
            <i className="fa-solid fa-circle-info" aria-hidden="true" />
            La tessera porta il QR del wallet e il saldo: al tavolo si inquadra e il
            conto si scala dal credito. I wallet dei clienti si gestiscono in
            Amministrazione → Wallet clienti.
          </span>
        </Tooltip>
      </p>
    </div>
  )
}
