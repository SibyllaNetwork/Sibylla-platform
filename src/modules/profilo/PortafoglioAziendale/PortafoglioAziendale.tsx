import React, { useState } from 'react';
import { InputField } from '../../../core/components/form';
import AlertBanner from '../../../core/components/AlertBanner'
import PageHead from '../../../core/components/PageHead'
import Pagination from '../../../core/components/Pagination'
import Tabs from '../../../core/components/Tabs'
import EmptyState from '../../../core/components/EmptyState'
import Modal from '../../../core/components/Modal'
import VccCard from '../../../core/components/VccCard'
import BonificoIstruzioni, { genBonificoCode } from '../../../core/components/BonificoIstruzioni'
import GeneraVccModal from '../../../core/components/GeneraVccModal'
import VerificaCodiceModal from '../../../core/components/VerificaCodiceModal'
import './PortafoglioAziendale.sass'

// Data odierna in formato gg/mm/aaaa per il titolo della modale carta
const oggi = (() => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
})()

export default function PortafoglioAziendale({navigate}:{navigate:(p:string)=>void}) {
  const [taglio,       setTaglio]       = useState("20");
  const [altroImporto, setAltroImporto] = useState("");
  const [metodo,       setMetodo]       = useState("carta");
  const [page,         setPage]         = useState(1);
  const [movTab,       setMovTab]       = useState("movimenti");
  const [cardSeed,     setCardSeed]     = useState<string|null>(null);
  const [seenVcc,      setSeenVcc]      = useState<Set<string>>(()=>new Set());
  const [verifyId,     setVerifyId]     = useState<string|null>(null);
  const [bonifico,     setBonifico]     = useState<{codice:string; importo:string}|null>(null);
  const [generaOpen,   setGeneraOpen]   = useState(false);
  const [vccDone,      setVccDone]      = useState(false);
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
    {id:"ORD-2555",data:"lun 17 nov 2025",    importo:-30.00, acconto:"No",tipo:"prelievo vcc",   esito:"OK"},
    {id:"ORD-2540",data:"mer 12 nov 2025",    importo:75.00,  acconto:"No",tipo:"wallet sibylla", esito:"OK"},
    {id:"ORD-2521",data:"gio 06 nov 2025",    importo:-12.50, acconto:"No",tipo:"prelievo vcc",   esito:"Pending"},
    {id:"ORD-2498",data:"mar 28 ott 2025",    importo:300.00, acconto:"No",tipo:"wallet sibylla", esito:"OK"},
    {id:"ORD-2475",data:"lun 20 ott 2025",    importo:-85.00, acconto:"No",tipo:"prelievo vcc",   esito:"OK"},
    {id:"ORD-2460",data:"mer 15 ott 2025",    importo:60.00,  acconto:"No",tipo:"wallet sibylla", esito:"Pending"},
    {id:"ORD-2433",data:"ven 03 ott 2025",    importo:-40.00, acconto:"No",tipo:"prelievo vcc",   esito:"OK"},
    {id:"ORD-2410",data:"lun 22 set 2025",    importo:120.00, acconto:"No",tipo:"wallet sibylla", esito:"OK"},
    {id:"ORD-2388",data:"mer 10 set 2025",    importo:-15.00, acconto:"No",tipo:"prelievo vcc",   esito:"Pending"},
    {id:"ORD-2350",data:"lun 25 ago 2025",    importo:50.00,  acconto:"No",tipo:"wallet sibylla", esito:"OK"},
    {id:"ORD-2322",data:"gio 14 ago 2025",    importo:-22.00, acconto:"No",tipo:"prelievo vcc",   esito:"OK"},
    {id:"ORD-2300",data:"mar 05 ago 2025",    importo:200.00, acconto:"No",tipo:"wallet sibylla", esito:"Pending"},
  ];

  const perPage    = 10;
  const totalPages = Math.ceil(movimenti.length/perPage);
  const paginated  = movimenti.slice((page-1)*perPage, page*perPage);

  const handleRicarica = () => {
    // Pagamento con bonifico: niente accredito immediato, mostro le istruzioni
    if (metodo==="bonifico") {
      const amt = taglio==="altro" ? (parseFloat(altroImporto)||0) : parseFloat(taglio);
      const importo = amt.toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2}) + " €";
      setBonifico({ codice: genBonificoCode(), importo });
      return;
    }
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
    return isOk
      ? <i className="fa-regular fa-circle-check paf__esito-ico paf__esito-ico--ok" title="OK" aria-label="OK"/>
      : <i className="fa-regular fa-hourglass-clock paf__esito-ico paf__esito-ico--pending" title="Pending" aria-label="Pending"/>;
  };

  // Prima visualizzazione libera; dalle volte successive serve il codice via email
  const handleEye = (id:string) => {
    if (seenVcc.has(id)) {
      setVerifyId(id);
    } else {
      setSeenVcc(prev => new Set(prev).add(id));
      setCardSeed(id);
    }
  };

  return (
    <div>
      <PageHead title="Portafoglio aziendale" subtitle="Monitoraggio centralizzato per operazioni vantaggiose, sicure, rapide e connesse al mercato in tempo reale"/>

      {/* ── Success banner ───────────────────────────────────────────── */}
      {recharged && <AlertBanner type="success" className="paf__success-banner">Ricarica effettuata con successo</AlertBanner>}
      {vccDone && <AlertBanner type="success" className="paf__success-banner">Carta generata correttamente</AlertBanner>}

      {/* ── Main grid ────────────────────────────────────────────────── */}
      <div className="paf__grid">

        {/* Left column */}
        <div className="paf__left-col">

          {/* Saldo */}
          <div className="paf__card">
            <div className="paf__saldo-label">Saldo disponibile</div>
            <div className="paf__saldo-row">
              <div className="paf__saldo-amount">{saldo.toFixed(2).replace(".",",")} €</div>
              <button className="paf__vcc-btn" onClick={()=>setGeneraOpen(true)}>Genera VCC</button>
            </div>
          </div>

          {/* Ricarica */}
          <div className="paf__card">
            <div className="paf__ricarica-head">
              <div className="paf__ricarica-title">Ricarica il tuo account</div>
              <div className="paf__ricarica-subtitle">sia personale che aziendale</div>
            </div>

            <div className="paf__ricarica-section">
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
            </div>

            <div className="paf__ricarica-section">
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
            </div>

            <div className="paf__ricarica-recap">
              <div className="paf__recap-title">Riepilogo ricarica</div>
              <div className="paf__recap-row">
                <span>Importo</span>
                <strong>{taglio==="altro" ? (altroImporto ? `${altroImporto} €` : "—") : `${taglio} €`}</strong>
              </div>
              <div className="paf__recap-row">
                <span>Metodo</span>
                <strong>{metodo==="carta" ? "Carta di credito" : "Bonifico"}</strong>
              </div>
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

        {/* Box movimenti — tabs */}
        <div className="paf__card paf__movimenti-card">
          <div className="paf__mov-tabbar">
            <Tabs
              className="paf__mov-tabs"
              tabs={[
                {id:"movimenti",   label:"Transazioni"},
                {id:"penali",      label:"Crediti penali"},
                {id:"portafoglio", label:"Portafoglio personale"},
              ]}
              active={movTab}
              onChange={(id)=> id==="portafoglio" ? navigate("portafoglio-personale") : setMovTab(id)}
            />
            {movTab==="movimenti" && (
              <div className="paf__movimenti-actions">
                <button type="button" className="sib-btn sib-btn--icon" title="Aggiorna" aria-label="Aggiorna"><i className="fa-light fa-arrows-rotate"/></button>
                <button type="button" className="sib-btn sib-btn--icon" title="Esporta" aria-label="Esporta"><i className="fa-light fa-file-export"/></button>
              </div>
            )}
          </div>

          {movTab==="movimenti" && (
            <>
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
                    <div className="paf__mov-cell paf__mov-tipo">
                      {m.tipo}
                      {m.tipo.toLowerCase().includes("vcc") && (
                        <button type="button" className="paf__vcc-eye" title="Mostra carta" aria-label="Mostra carta" onClick={()=>handleEye(m.id)}>
                          <i className="fa-regular fa-eye"/>
                        </button>
                      )}
                    </div>
                    <div>{esitoBadge(m.esito)}</div>
                  </div>
                ))}
              </div>

              <div className="paf__pagination">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            </>
          )}

          {movTab==="penali" && (
            <EmptyState
              icon="triangle-exclamation"
              title="Nessun credito penale"
              subtitle="Non ci sono crediti penali registrati al momento."
            />
          )}
        </div>
      </div>

      <Modal
        open={cardSeed!==null}
        onClose={()=>setCardSeed(null)}
        title={`La tua carta di credito - generata in data ${oggi}`}
        size="xl"
      >
        {cardSeed && <VccCard seed={cardSeed}/>}
      </Modal>

      <VerificaCodiceModal
        open={verifyId!==null}
        onClose={()=>setVerifyId(null)}
        onConfirm={()=>{ if(verifyId) setCardSeed(verifyId); setVerifyId(null); }}
      />

      <Modal
        open={bonifico!==null}
        onClose={()=>setBonifico(null)}
        title="Ricarica con Bonifico"
        size="xl"
      >
        {bonifico && <BonificoIstruzioni codice={bonifico.codice} importo={bonifico.importo}/>}
      </Modal>

      <GeneraVccModal
        open={generaOpen}
        onClose={()=>setGeneraOpen(false)}
        creditoResiduo={saldo}
        onGenera={()=>{ setGeneraOpen(false); setVccDone(true); setTimeout(()=>setVccDone(false), 3500); }}
      />
    </div>
  );
}
