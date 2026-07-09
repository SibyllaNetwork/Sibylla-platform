import React, { useState, useRef } from 'react';
import Modal from '../../../core/components/Modal';
import Tooltip from '../../../core/components/Tooltip';
import AlertBanner from '../../../core/components/AlertBanner'
import PageHead from '../../../core/components/PageHead'
import './RuoliFunzioni.sass'
import { InputField, SelectField } from '../../../core/components/form'
import { useOrgStore } from '../../../store/useOrgStore'
import { useRuoliStore } from '../../../store/useRuoliStore'
import AvatarPicker from '../../../core/components/AvatarPicker'
import { avatarUrl } from '../../../core/avatar'

export default function RuoliFunzioni({navigate}:{navigate:(p:string)=>void}) {
  // Ruoli e profili sono condivisi (store) così l'Organigramma li importa come impostati qui
  const ruoli = useRuoliStore(s => s.ruoli);
  const setRuoli = useRuoliStore(s => s.setRuoli);
  const assoc = useRuoliStore(s => s.profili);
  const setAssoc = useRuoliStore(s => s.setProfili);
  const [showModal,setShowModal] = useState(false);
  const [newRuolo, setNewRuolo]  = useState("");
  const [iconPickerFor, setIconPickerFor] = useState<number|null>(null);
  const [saved,    setSaved]     = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [logoError,   setLogoError]   = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5 MB

  const funzioni  = ["Amministratore","Manager","Supervisore","Operatore","Viewer","Responsabile"];
  const contratti = ["Full-time","Part-time","Consulenza","Stagionale","Apprendistato"];

  // Tipologia cliente + strutture configurate (dallo store condiviso)
  const tipologia = useOrgStore(s => s.tipologia);
  const strutture = useOrgStore(s => s.strutture);
  const isMultistruttura = tipologia === "Multistruttura";

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset per permettere re-upload dello stesso file
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setLogoError("Il file selezionato non è un'immagine valida");
      setTimeout(() => setLogoError(null), 4000);
      return;
    }

    if (file.size > MAX_LOGO_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setLogoError(`Il file è troppo grande (${sizeMB} MB). Dimensione massima consentita: 5 MB`);
      setTimeout(() => setLogoError(null), 4000);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoDataUrl(ev.target?.result as string);
      setLogoError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    };
    reader.onerror = () => {
      setLogoError("Errore durante la lettura del file");
      setTimeout(() => setLogoError(null), 4000);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <PageHead title="Ruoli &amp; funzioni" subtitle="Configura ruoli aziendali e assegna le funzioni ai profili"/>

      {/* ── Banner ──────────────────────────────────────────────────── */}
      {saved && <AlertBanner type="success" className="go__banner">Modifiche salvate</AlertBanner>}
      {logoError && <AlertBanner type="error" className="go__banner">{logoError}</AlertBanner>}

      {/* ── Top actions ─────────────────────────────────────────────── */}
      <div className="go__top-actions">
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          onChange={handleLogoUpload}
          className="go__file-input"
          aria-hidden="true"
        />
        <button className="sib-btn sib-btn--toolbar go__action-btn"
          onClick={()=>logoInputRef.current?.click()}>
          <i className="fa-duotone fa-upload go__action-ico" aria-hidden="true"/> {logoDataUrl ? "Cambia logo organizzazione" : "Inserisci logo organizzazione"}
        </button>
        <button className="sib-btn sib-btn--toolbar go__action-btn"
          onClick={()=>navigate("organigramma")}>
          <i className="fa-duotone fa-sitemap go__action-ico" aria-hidden="true"/> Organigramma
        </button>
      </div>

      {/* ── Info table ──────────────────────────────────────────────── */}
      <div className="go__info-wrap">
        <div className="go__info-head">
          {["Profilo","Azienda","Tipologia","Partita IVA","Indirizzo","Email","Logo","Profilo amministratore"].map((h,i)=>(
            <div key={i} className={`go__info-hcell ${i<7?'go__info-hcell--border':''}`}>{h}</div>
          ))}
        </div>
        <div className="go__info-body">
          {[
            <span className="go__info-val--bold">Mario Rossi</span>,
            <span>Sibylla</span>,
            <span className="go__info-multistruttura">
              {tipologia}
              {isMultistruttura && (
                <Tooltip
                  position="top"
                  content={
                    <div className="go__strutture-tooltip">
                      <div className="go__strutture-tooltip-title">
                        Strutture configurate ({strutture.length})
                      </div>
                      <ul className="go__strutture-tooltip-list">
                        {strutture.map((s,i)=>(
                          <li key={i} className="go__strutture-tooltip-item">
                            <span className="go__strutture-tooltip-bullet"/>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  }
                >
                  <i
                    className="fa-duotone fa-circle-info go__multistruttura-ico"
                    aria-label={`${strutture.length} strutture configurate`}
                  />
                </Tooltip>
              )}
            </span>,
            <span>1333</span>,
            <span className="go__info-val--sm">Carrera 8, 110231, Bogotá, BANGLADESH</span>,
            <span className="go__info-val--link">test@sibyllanetwork.com</span>,
            <div className={`go__logo-placeholder${logoDataUrl ? ' go__logo-placeholder--filled' : ''}`}>
              {logoDataUrl
                ? <img src={logoDataUrl} alt="Logo organizzazione" className="go__logo-img"/>
                : <div className="go__logo-dot"/>}
            </div>,
            <span className="go__info-val--bold">Mario Rossi</span>,
          ].map((v,i)=>(
            <div key={i} className={`go__info-cell ${i<7?'go__info-cell--border':''}`}>{v}</div>
          ))}
        </div>
      </div>

      {/* ── Two-column grid ─────────────────────────────────────────── */}
      <div className="go__grid">

        {/* Gestione ruoli */}
        <div className="go__card">
          <div className="go__card-header">
            <span className="go__card-title">Gestione ruoli</span>
            <button onClick={()=>setShowModal(true)} className="go__add-role-btn">
              <i className="fa-duotone fa-plus go__add-role-ico" aria-hidden="true"/> Associazione ruolo
            </button>
          </div>
          <div className="go__ruoli-head">
            {["Ruolo","Ruolo - Funzione",""].map((h,i)=>(
              <div key={i} className="go__col-hcell">{h}</div>
            ))}
          </div>
          {ruoli.map((r,i)=>(
            <div key={i}
              className={`go__ruoli-row ${i<ruoli.length-1?'go__ruoli-row--border':''}`}>
              <span className="go__ruoli-name">{r.nome}</span>
             <SelectField
                name={`funzione-${i}`}
                placeholder="Seleziona funzione"
                value={r.funzione}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRuoli(ruoli.map((item,j) => j===i ? {...item, funzione: e.target.value} : item))}
                options={funzioni.map(f => ({ value: f, label: f }))}
              />
              <button onClick={()=>setRuoli(ruoli.filter((_,j)=>j!==i))}
                className="go__delete-btn">
                <i className="fa-duotone fa-trash go__delete-ico" aria-hidden="true"/>
              </button>
            </div>
          ))}
        </div>

        {/* Gestione associazioni */}
        <div className="go__card">
          <div className="go__card-header go__card-header--simple">
            <span className="go__card-title">Gestione associazioni</span>
          </div>
          <div className="go__assoc-head">
            {["Nome Utente","Utente - Ruolo","Utente - Contratto"].map((h,i)=>(
              <div key={i} className="go__col-hcell">{h}</div>
            ))}
          </div>
          {assoc.map((a,i)=>(
            <div key={i}
              className={`go__assoc-row ${i<assoc.length-1?'go__assoc-row--border':''}`}>
              <div className="go__assoc-user">
                <button type="button" className="go__avatar go__avatar--btn"
                  style={{'--avatar-color':a.color} as React.CSSProperties}
                  title="Scegli avatar" onClick={()=>setIconPickerFor(i)}>
                  <img className="go__avatar-img" src={avatarUrl(a.seed || a.nome)} alt={a.nome}/>
                </button>
                <span className="go__assoc-name">{a.nome}</span>
              </div>
              <SelectField
                name={`ruolo-${i}`}
                placeholder="Seleziona Ruolo"
                value={a.ruolo}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAssoc(assoc.map((item,j) => j===i ? {...item, ruolo: e.target.value} : item))}
                options={ruoli.map(r => ({ value: r.nome, label: r.nome }))}
              />
               <SelectField
                name={`contratto-${i}`}
                placeholder="Seleziona Contratto"
                value={a.contratto}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAssoc(assoc.map((item,j) => j===i ? {...item, contratto: e.target.value} : item))}
                options={contratti.map(c => ({ value: c, label: c }))}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <div className="go__footer">
        <button onClick={()=>navigate("home")} className="go__footer-cancel">Annulla</button>
        <button onClick={()=>{setSaved(true);setTimeout(()=>setSaved(false),2500);}} className="go__footer-save">Salva modifiche</button>
      </div>

      {/* ── Modal nuovo ruolo ────────────────────────────────────────── */}
      <Modal open={showModal} onClose={()=>{setShowModal(false);setNewRuolo("");}} title="Aggiungi ruolo" size="sm">
        <div className="go__modal-form">
          <InputField
            name="newRuolo"
            placeholder="Nome del ruolo..."
            value={newRuolo}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRuolo(e.target.value)}
          />
          <div className="go__modal-actions">
            <button onClick={()=>{setShowModal(false);setNewRuolo("");}} className="sib-btn sib-btn--secondary">Annulla</button>
            <button
              onClick={()=>{if(newRuolo.trim()){setRuoli([...ruoli,{nome:newRuolo.trim(),funzione:""}]);setNewRuolo("");setShowModal(false);}}}
              disabled={!newRuolo.trim()}
              className={`sib-btn sib-btn--primary ${!newRuolo.trim()?'go__modal-save--disabled':''}`}>
              Aggiungi
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Selettore avatar profilo ─────────────────────────────────── */}
      <AvatarPicker
        open={iconPickerFor !== null}
        value={iconPickerFor !== null ? assoc[iconPickerFor]?.seed : undefined}
        onClose={()=>setIconPickerFor(null)}
        onSelect={(seed)=>{ if(iconPickerFor !== null) setAssoc(assoc.map((a,j)=> j===iconPickerFor ? {...a, seed} : a)) }}
      />
    </div>
  );
}
