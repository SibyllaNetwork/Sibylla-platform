import React, { useState } from 'react';
import T from '../../../core/tokens';
import Ico from '../../../core/icons/Ico';
import BtnBack from '../../../core/components/BtnBack';
import { InputField } from '../../../core/components/form';
import AlertBanner from '../../../core/components/AlertBanner'
import PageHeader from '../../../core/components/PageHeader'
import Pagination from '../../../core/components/Pagination'
import './PortafoglioAziendale.sass'

export default function PortafoglioAziendale({navigate}:{navigate:(p:string)=>void}) {
  const [taglio,       setTaglio]       = useState("20");
  const [altroImporto, setAltroImporto] = useState("");
  const [metodo,       setMetodo]       = useState("carta");
  const [page,         setPage]         = useState(1);
  const [recharging,   setRecharging]   = useState(false);
  const [recharged,    setRecharged]    = useState(false);
  const [saldo,        setSaldo]        = useState(20.00);

  const tagli = ["10","20","50","100","150","altro"];

  const movimenti = [
    {id:"ORD-2841",data:"mer 25 marzo 2026",  importo:-5.00,  acconto:"No",tipo:"prelievo vcc",   esito:"OK"},
    {id:"ORD-2840",data:"mer 25 marzo 2026",  importo:50.00,  acconto:"No",tipo:"wallet sibylla", esito:"OK"},
    {id:"ORD-2839",data:"mer 25 marzo 2026",  importo:50.00,  acconto:"No",tipo:"wallet sibylla", esito:"Pending"},
    {id:"ORD-2801",data:"lun 16 marzo 2026",  importo:-100.00,acconto:"No",tipo:"prelievo vcc",   esito:"OK"},
    {id:"ORD-2800",data:"lun 16 marzo 2026",  importo:-25.00, acconto:"No",tipo:"prelievo vcc",   esito:"OK"},
    {id:"ORD-2799",data:"lun 16 marzo 2026",  importo:150.00, acconto:"No",tipo:"wallet sibylla", esito:"Pending"},
    {id:"ORD-2750",data:"lun 02 marzo 2026",  importo:-50.00, acconto:"No",tipo:"prelievo vcc",   esito:"OK"},
    {id:"ORD-2680",data:"gio 12 feb 2026",    importo:200.00, acconto:"No",tipo:"wallet sibylla", esito:"Pending"},
    {id:"ORD-2601",data:"mer 26 nov 2025",    importo:10.00,  acconto:"No",tipo:"wallet sibylla", esito:"Pending"},
    {id:"ORD-2580",data:"ven 21 nov 2025",    importo:150.00, acconto:"No",tipo:"wallet sibylla", esito:"OK"},
  ];

  const perPage    = 6;
  const totalPages = Math.ceil(movimenti.length/perPage);
  const paginated  = movimenti.slice((page-1)*perPage, page*perPage);

  const handleRicarica = () => {
    setRecharging(true);
    setTimeout(() => {
      const amt = taglio==="altro" ? parseFloat(altroImporto)||0 : parseFloat(taglio);
      setSaldo(s => Math.round((s+amt)*100)/100);
      setRecharging(false); setRecharged(true);
      setTimeout(() => setRecharged(false), 3000);
    }, 1200);
  };

  const esitoBadge = (esito:string) => {
    const isOk = esito === "OK";
    return (
      <span className={`paf__badge ${isOk ? 'paf__badge--ok' : 'paf__badge--pending'}`}>{esito}</span>
    );
  };

  return (
    <div>
      <BtnBack onClick={()=>navigate("home")}/>

      <PageHeader title="Portafoglio aziendale" subtitle="Monitoraggio centralizzato per operazioni vantaggiose, sicure, rapide e connesse al mercato in tempo reale"/>

      {/* ── Top action buttons ───────────────────────────────────────── */}
      <div className="paf__top-actions">
        {[
          {label:"Portafoglio personale", icon:"user",    page:"portafoglio-personale"},
          {label:"Transazioni",           icon:"refresh", page:null},
          {label:"Crediti penali",        icon:"alert",   page:null},
        ].map((btn,i)=>(
          <button key={i} onClick={()=>btn.page&&navigate(btn.page)}
            className="paf__action-btn"
            onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor=T.primary;(e.currentTarget as HTMLButtonElement).style.color=T.primary;}}
            onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor=T.border;(e.currentTarget as HTMLButtonElement).style.color=T.textActive;}}>
            <Ico n={btn.icon} s={14} c="currentColor"/>{btn.label}
          </button>
        ))}
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
              <div className="paf__saldo-amount">{saldo.toFixed(2).replace(".",",")} €</div>
              <button className="paf__vcc-btn">Genera VCC</button>
            </div>
          </div>

          {/* Ricarica */}
          <div className="paf__card">
            <div className="paf__ricarica-title">Ricarica il tuo account</div>
            <div className="paf__ricarica-subtitle">sia personale che aziendale</div>

            <div className="paf__section-label">Scegli il taglio:</div>
            <div className="paf__tagli-grid">
              {tagli.map(t=>(
                <label key={t} className={`paf__taglio-label ${taglio===t?'paf__taglio-label--active':''}`}>
                  <input type="radio" name="taglio" value={t} checked={taglio===t} onChange={()=>setTaglio(t)} className="hidden"/>
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

            <div className="paf__section-label">Metodo di pagamento:</div>
            <div className="paf__metodi-grid">
              {[
                {val:"carta",   label:"Carta di credito", icon:"fa-credit-card"},
                {val:"bonifico",label:"Bonifico",          icon:"fa-building-columns"},
              ].map(m=>(
                <label key={m.val} className={`paf__metodo-label ${metodo===m.val?'paf__metodo-label--active':''}`}>
                  <input type="radio" name="metodo" value={m.val} checked={metodo===m.val} onChange={()=>setMetodo(m.val)} className="hidden"/>
                  <i className={`fa-duotone ${m.icon} paf__metodo-ico`} aria-hidden="true"/>
                  {m.label}
                </label>
              ))}
            </div>

            <button onClick={handleRicarica} disabled={recharging} className={`paf__ricarica-btn ${recharging?'paf__ricarica-btn--loading':''}`}>
              {recharging ? (
                <>
                  <i className="fa-duotone fa-spinner paf__spinner" aria-hidden="true"/>
                  Elaborazione...
                </>
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

          <div className="paf__mov-head">
            {["Ordine N°","Data","Importo","Acconto","Tipo","Esito"].map((h,i)=>(
              <div key={i} className="paf__mov-head-cell">{h}</div>
            ))}
          </div>

          <div className="paf__mov-body">
            {paginated.map((m,i)=>(
              <div key={i}
                className={`paf__mov-row ${i<paginated.length-1?'paf__mov-row--border':''}`}
                onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background="#F8FCFF"}
                onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background="transparent"}>
                <div className="paf__mov-id">{m.id}</div>
                <div className="paf__mov-data">{m.data}</div>
                <div className={`paf__mov-importo ${m.importo<0?'paf__mov-importo--neg':'paf__mov-importo--pos'}`}>
                  {m.importo>0?"+":""}{m.importo.toFixed(2).replace(".",",")} €
                </div>
                <div className="paf__mov-cell">{m.acconto}</div>
                <div className="paf__mov-cell">{m.tipo}</div>
                <div>{esitoBadge(m.esito)}</div>
              </div>
            ))}
          </div>

          <div className="paf__pagination">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      </div>
    </div>
  );
}
