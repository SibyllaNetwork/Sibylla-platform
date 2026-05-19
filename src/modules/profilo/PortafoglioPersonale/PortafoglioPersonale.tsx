import React, { useState } from 'react';
import Ico from '../../../core/icons/Ico';
import BtnBack from '../../../core/components/BtnBack';
import { InputField } from '../../../core/components/form';
import AlertBanner from '../../../core/components/AlertBanner'
import PageHeader from '../../../core/components/PageHeader'
import './PortafoglioPersonale.sass'

export default function PortafoglioPersonale({navigate}:{navigate:(p:string)=>void}) {
  const [taglio,       setTaglio]       = useState("20");
  const [altroImporto, setAltroImporto] = useState("");
  const [metodo,       setMetodo]       = useState("carta");
  const [pg,           setPg]           = useState(1);
  const [recharging,   setRecharging]   = useState(false);
  const [recharged,    setRecharged]    = useState(false);
  const [saldo,        setSaldo]        = useState(0);

  const tagli = ["10","20","50","100","150","altro"];

  const movimenti = [
    {id:"ORD-2870",data:"lun 23 marzo 2026",  importo:100.00,   acconto:"No",tipo:"Wallet Sibylla",esito:"Pending"},
    {id:"ORD-2869",data:"lun 23 marzo 2026",  importo:150.00,   acconto:"No",tipo:"Wallet Sibylla",esito:"Pending"},
    {id:"ORD-2855",data:"gio 19 marzo 2026",  importo:-0.57,    acconto:"No",tipo:"prelievo vcc",  esito:"Pending"},
    {id:"ORD-2802",data:"lun 16 marzo 2026",  importo:-256.00,  acconto:"No",tipo:"prelievo vcc",  esito:"Pending"},
    {id:"ORD-2801",data:"lun 16 marzo 2026",  importo:-10.00,   acconto:"No",tipo:"prelievo vcc",  esito:"Pending"},
    {id:"ORD-2799",data:"lun 16 marzo 2026",  importo:100000.00,acconto:"No",tipo:"Wallet Sibylla",esito:"Pending"},
    {id:"ORD-2640",data:"mer 11 feb 2026",    importo:-790.00,  acconto:"No",tipo:"Wallet Sibylla",esito:"Pending"},
    {id:"ORD-2501",data:"lun 12 gen 2026",    importo:20.00,    acconto:"No",tipo:"Wallet Sibylla",esito:"Pending"},
    {id:"ORD-2301",data:"lun 1 dic 2025",     importo:75.00,    acconto:"No",tipo:"Wallet Sibylla",esito:"OK"},
    {id:"ORD-2200",data:"lun 10 nov 2025",    importo:250.00,   acconto:"No",tipo:"Wallet Sibylla",esito:"OK"},
  ];

  const perPage    = 6;
  const totalPages = Math.ceil(movimenti.length/perPage);
  const paginated  = movimenti.slice((pg-1)*perPage, pg*perPage);

  const handleRicarica = () => {
    setRecharging(true);
    setTimeout(() => {
      const amt = taglio==="altro" ? parseFloat(altroImporto)||0 : parseFloat(taglio);
      setSaldo(s => Math.round((s+amt)*100)/100);
      setRecharging(false); setRecharged(true);
      setTimeout(() => setRecharged(false), 3000);
    }, 1200);
  };

  const fmtEur = (n:number) => {
    const abs = Math.abs(n).toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2});
    return (n<0?"-":n>0?"+":"") + abs + " €";
  };

  const esitoBadge = (esito:string) => (
    <span className={`paf__badge ${esito==="OK"?'paf__badge--ok':'paf__badge--pending'}`}>{esito}</span>
  );

  const getPages = ():((number|'...')[]) => {
    if(totalPages<=5) return Array.from({length:totalPages},(_,i)=>i+1);
    if(pg<=3)          return [1,2,3,'...',totalPages];
    if(pg>=totalPages-2) return [1,'...',totalPages-2,totalPages-1,totalPages];
    return [1,'...',pg-1,pg,pg+1,'...',totalPages];
  };

  return (
    <div>
      <BtnBack onClick={()=>navigate("portafoglio-aziendale")}/>

      <PageHeader title="Portafoglio personale" subtitle="Dai valore al tuo lavoro: guadagna e utilizza il credito del tuo portafoglio"/>

      {/* ── Back to aziendale ────────────────────────────────────────── */}
      <div className="paf__top-actions">
        <button onClick={()=>navigate("portafoglio-aziendale")}
          className="sib-btn sib-btn--toolbar paf__action-btn">
          <Ico n="user" s={14} c="currentColor"/> Portafoglio aziendale
        </button>
      </div>

      {/* ── Success banner ───────────────────────────────────────────── */}
      {recharged && <AlertBanner type="success" className="paf__success-banner">Ricarica effettuata con successo</AlertBanner>}

      {/* ── Main grid ────────────────────────────────────────────────── */}
      <div className="paf__grid">

        {/* Left column */}
        <div className="paf__left-col">

          {/* Saldo */}
          <div className="paf__card">
            <div className="paf__saldo-label">Saldo disponibile</div>
            <div className="paf__saldo-row">
              <div className={`paf__saldo-amount ${saldo===0?'paf__saldo-amount--zero':''}`}>
                {saldo===0 ? "0 €" : fmtEur(saldo)}
              </div>
              <button className="paf__vcc-btn">Genera VCC</button>
            </div>
            {saldo===0 && <div className="paf__saldo-zero-hint">Nessun credito — effettua una ricarica</div>}
          </div>

          {/* Ricarica */}
          <div className="paf__card">
            <div className="paf__ricarica-title">Ricarica il tuo account</div>
            <div className="paf__ricarica-subtitle">sia personale che aziendale</div>

            <div className="paf__tagli-grid">
              {tagli.map(t=>(
                <label key={t} className={`paf__taglio-label ${taglio===t?'paf__taglio-label--active':''}`}>
                  <input type="radio" name="taglio-pers" value={t} checked={taglio===t} onChange={()=>setTaglio(t)} className="hidden"/>
                  {t==="altro" ? "Altro" : `${t} €`}
                </label>
              ))}
            </div>

            {taglio==="altro" && (
              <div className="paf__altro-wrap">
                <InputField
                  name="altroImporto"
                  type="number"
                  placeholder="Importo (€)"
                  value={altroImporto}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAltroImporto(e.target.value)}
                />
              </div>
            )}

            <div className="paf__metodi-grid">
              {[
                {val:"carta",   label:"Carta di credito", icon:"fa-credit-card"},
                {val:"bonifico",label:"Bonifico",          icon:"fa-building-columns"},
              ].map(m=>(
                <label key={m.val} className={`paf__metodo-label ${metodo===m.val?'paf__metodo-label--active':''}`}>
                  <input type="radio" name="metodo-pers" value={m.val} checked={metodo===m.val} onChange={()=>setMetodo(m.val)} className="hidden"/>
                  <i className={`fa-duotone ${m.icon} paf__metodo-ico`} aria-hidden="true"/>
                  {m.label}
                </label>
              ))}
            </div>

            <button onClick={handleRicarica} disabled={recharging} className={`paf__ricarica-btn ${recharging?'paf__ricarica-btn--loading':''}`}>
              {recharging ? (
                <><i className="fa-duotone fa-spinner paf__spinner" aria-hidden="true"/>Elaborazione...</>
              ) : 'Ricarica'}
            </button>
          </div>
        </div>

        {/* Movimenti */}
        <div className="paf__card paf__movimenti-card">
          <div className="paf__movimenti-header">
            <div className="paf__movimenti-title">Storico movimenti</div>
            <div className="paf__movimenti-actions">
              {["Aggiorna","Esporta"].map(l=>(
                <button key={l} className="paf__movimenti-btn">{l}</button>
              ))}
            </div>
          </div>

          <div className="paf__mov-head paf__mov-head--pers">
            {["Ordine N°","Data","Importo","Acconto","Tipo","Esito"].map((h,i)=>(
              <div key={i} className="paf__mov-head-cell">{h}</div>
            ))}
          </div>

          <div className="paf__mov-body">
            {paginated.map((m,i)=>(
              <div key={i}
                className={`paf__mov-row paf__mov-row--pers ${i<paginated.length-1?'paf__mov-row--border':''}`}>
                <div className="paf__mov-id">{m.id}</div>
                <div className="paf__mov-data">{m.data}</div>
                <div className={`paf__mov-importo ${m.importo<0?'paf__mov-importo--neg':'paf__mov-importo--pos'}`}>
                  {fmtEur(m.importo)}
                </div>
                <div className="paf__mov-cell">{m.acconto}</div>
                <div className="paf__mov-cell">{m.tipo}</div>
                <div>{esitoBadge(m.esito)}</div>
              </div>
            ))}
          </div>

          <div className="paf__pagination">
            <button onClick={()=>setPg(p=>Math.max(1,p-1))} disabled={pg===1}
              className={`paf__pag-nav ${pg===1?'paf__pag-nav--disabled':''}`}>
              <Ico n="back" s={12} c="currentColor"/> Indietro
            </button>
            {getPages().map((n,i)=>
              n==="..."
                ? <span key={`e${i}`} className="paf__pag-ellipsis">…</span>
                : <button key={n} onClick={()=>setPg(n as number)}
                    className={`paf__pag-btn ${pg===n?'paf__pag-btn--active':''}`}>
                    {n}
                  </button>
            )}
            <button onClick={()=>setPg(p=>Math.min(totalPages,p+1))} disabled={pg===totalPages}
              className={`paf__pag-nav ${pg===totalPages?'paf__pag-nav--disabled':''}`}>
              Avanti <Ico n="chevr" s={12} c="currentColor"/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
