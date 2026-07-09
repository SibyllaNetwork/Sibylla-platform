import React, { useState } from 'react';
import { InputField } from '../../../core/components/form';
import AlertBanner from '../../../core/components/AlertBanner'
import PageHead from '../../../core/components/PageHead'
import Pagination from '../../../core/components/Pagination'
import Tabs from '../../../core/components/Tabs'
import Modal from '../../../core/components/Modal'
import VccCard from '../../../core/components/VccCard'
import BonificoIstruzioni, { genBonificoCode } from '../../../core/components/BonificoIstruzioni'
import GeneraVccModal from '../../../core/components/GeneraVccModal'
import VerificaCodiceModal from '../../../core/components/VerificaCodiceModal'
import './PortafoglioPersonale.sass'

// Data odierna in formato gg/mm/aaaa per il titolo della modale carta
const oggi = (() => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
})()

export default function PortafoglioPersonale({navigate}:{navigate:(p:string)=>void}) {
  const [taglio,       setTaglio]       = useState("20");
  const [altroImporto, setAltroImporto] = useState("");
  const [metodo,       setMetodo]       = useState("carta");
  const [pg,           setPg]           = useState(1);
  const [movTab,       setMovTab]       = useState("movimenti");
  const [cardSeed,     setCardSeed]     = useState<string|null>(null);
  const [seenVcc,      setSeenVcc]      = useState<Set<string>>(()=>new Set());
  const [verifyId,     setVerifyId]     = useState<string|null>(null);
  const [bonifico,     setBonifico]     = useState<{codice:string; importo:string}|null>(null);
  const [generaOpen,   setGeneraOpen]   = useState(false);
  const [vccDone,      setVccDone]      = useState(false);
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
    {id:"ORD-2188",data:"mer 05 nov 2025",    importo:-45.00,   acconto:"No",tipo:"prelievo vcc",  esito:"Pending"},
    {id:"ORD-2150",data:"lun 27 ott 2025",    importo:90.00,    acconto:"No",tipo:"Wallet Sibylla",esito:"OK"},
    {id:"ORD-2120",data:"gio 16 ott 2025",    importo:-310.00,  acconto:"No",tipo:"prelievo vcc",  esito:"OK"},
    {id:"ORD-2099",data:"mar 07 ott 2025",    importo:180.00,   acconto:"No",tipo:"Wallet Sibylla",esito:"Pending"},
    {id:"ORD-2070",data:"lun 29 set 2025",    importo:-18.50,   acconto:"No",tipo:"prelievo vcc",  esito:"OK"},
    {id:"ORD-2041",data:"mer 17 set 2025",    importo:500.00,   acconto:"No",tipo:"Wallet Sibylla",esito:"OK"},
    {id:"ORD-2010",data:"ven 05 set 2025",    importo:-60.00,   acconto:"No",tipo:"prelievo vcc",  esito:"Pending"},
    {id:"ORD-1988",data:"lun 25 ago 2025",    importo:35.00,    acconto:"No",tipo:"Wallet Sibylla",esito:"OK"},
    {id:"ORD-1955",data:"gio 14 ago 2025",    importo:-120.00,  acconto:"No",tipo:"prelievo vcc",  esito:"OK"},
    {id:"ORD-1920",data:"mar 05 ago 2025",    importo:220.00,   acconto:"No",tipo:"Wallet Sibylla",esito:"Pending"},
    {id:"ORD-1888",data:"lun 21 lug 2025",    importo:-9.90,    acconto:"No",tipo:"prelievo vcc",  esito:"OK"},
    {id:"ORD-1850",data:"mer 09 lug 2025",    importo:140.00,   acconto:"No",tipo:"Wallet Sibylla",esito:"OK"},
  ];

  const perPage    = 10;
  const totalPages = Math.ceil(movimenti.length/perPage);
  const paginated  = movimenti.slice((pg-1)*perPage, pg*perPage);

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

  const fmtEur = (n:number) => {
    const abs = Math.abs(n).toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2});
    return (n<0?"-":n>0?"+":"") + abs + " €";
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

  const esitoBadge = (esito:string) => (
    esito==="OK"
      ? <i className="fa-regular fa-circle-check paf__esito-ico paf__esito-ico--ok" title="OK" aria-label="OK"/>
      : <i className="fa-regular fa-hourglass-clock paf__esito-ico paf__esito-ico--pending" title="Pending" aria-label="Pending"/>
  );

  return (
    <div>
      <PageHead title="Portafoglio personale" subtitle="Dai valore al tuo lavoro: guadagna e utilizza il credito del tuo portafoglio" onBack={()=>navigate("portafoglio-aziendale")}/>

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
              <div className={`paf__saldo-amount ${saldo===0?'paf__saldo-amount--zero':''}`}>
                {saldo===0 ? "0 €" : fmtEur(saldo)}
              </div>
              <button className="paf__vcc-btn" onClick={()=>setGeneraOpen(true)}>Genera VCC</button>
            </div>
            {saldo===0 && <div className="paf__saldo-zero-hint">Nessun credito — effettua una ricarica</div>}
          </div>

          {/* Ricarica */}
          <div className="paf__card">
            <div className="paf__ricarica-head">
              <div className="paf__ricarica-title">Ricarica il tuo account</div>
              <div className="paf__ricarica-subtitle">sia personale che aziendale</div>
            </div>

            <div className="paf__ricarica-section">
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
            </div>

            <div className="paf__ricarica-section">
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
                <><i className="fa-duotone fa-spinner paf__spinner" aria-hidden="true"/>Elaborazione...</>
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
                {id:"portafoglio", label:"Portafoglio aziendale"},
              ]}
              active={movTab}
              onChange={(id)=> id==="portafoglio" ? navigate("portafoglio-aziendale") : setMovTab(id)}
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
                <Pagination page={pg} totalPages={totalPages} onPageChange={setPg} />
              </div>
            </>
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
