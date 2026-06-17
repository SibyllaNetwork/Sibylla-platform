import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../services/api";
import { C, useToast, MiniCalendar, Btn, PillBtn, Modal, Field, Input, Select, FormRow, Badge } from "../components/UI";
// Icone Font Awesome (kit FA globale della piattaforma), stessa API delle icone
// lucide usate qui (prop size/color). Allinea le icone allo stile Sibylla.
const faIcon = (cls) => function FaIcon({ size, color, className = "", style, strokeWidth, fill, absoluteStrokeWidth, ...p }) {
  return <i className={`fa-light ${cls} ${className}`.trim()} style={{ fontSize: size, color, ...style }} {...p} />;
};
const ChevronLeft = faIcon("fa-chevron-left");
const ChevronRight = faIcon("fa-chevron-right");
const Minus = faIcon("fa-minus");
const Plus = faIcon("fa-plus");
const Trash2 = faIcon("fa-trash-can");
const Copy = faIcon("fa-copy");
const StickyNote = faIcon("fa-note-sticky");
const Wine = faIcon("fa-wine-glass");
const Car = faIcon("fa-car");
const XIcon = faIcon("fa-xmark");
const Hotel = faIcon("fa-hotel");
const Scissors = faIcon("fa-scissors");
const Receipt = faIcon("fa-receipt");
const FileText = faIcon("fa-file-lines");
const CreditCard = faIcon("fa-credit-card");
const RefreshCw = faIcon("fa-arrows-rotate");
const Lock = faIcon("fa-lock");
const GripVertical = faIcon("fa-grip-vertical");
const AlignLeft = faIcon("fa-align-left");
const Send = faIcon("fa-paper-plane");
const CheckCircle = faIcon("fa-circle-check");
const BookOpen = faIcon("fa-book-open");


const ORANGE = "#204769";
const NAVY   = "#204769";
// -- Illustration components ---------------------------------------------------
const CatIllustration = ({ color, emoji }) => (
  <div style={{position:"relative",width:72,height:56,flexShrink:0,overflow:"hidden"}}>
    <div style={{position:"absolute",bottom:-18,right:-18,width:72,height:72,borderRadius:"50%",background:`${color}22`}}/>
    <div style={{position:"absolute",bottom:-8,right:-8,width:58,height:58,borderRadius:"50%",background:`${color}33`}}/>
    <span style={{position:"absolute",bottom:6,right:6,fontSize:22,lineHeight:1,opacity:.8}}>{emoji}</span>
  </div>
);

const VoceIllustration = ({ color, emoji }) => (
  <div style={{position:"relative",width:54,height:44,flexShrink:0,overflow:"hidden"}}>
    <div style={{position:"absolute",bottom:-10,right:-10,width:52,height:52,borderRadius:"50%",background:`${color}22`}}/>
    <div style={{position:"absolute",bottom:-4,right:-4,width:40,height:40,borderRadius:"50%",background:`${color}33`}}/>
    <span style={{position:"absolute",bottom:4,right:4,fontSize:17,lineHeight:1,opacity:.8}}>{emoji}</span>
  </div>
);

const DragHandle = () => (
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:2,width:10,cursor:"grab",flexShrink:0,opacity:.35}}>
    {[...Array(6)].map((_,i)=><div key={i} style={{width:3,height:3,borderRadius:"50%",background:NAVY}}/>)}
  </div>
);

const QtyBtn = ({ icon, onClick, color="#204769" }) => (
  <button onClick={onClick}
    style={{width:22,height:22,borderRadius:"50%",border:"none",background:color,color:"white",
      cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:15,fontWeight:700,lineHeight:1,flexShrink:0,transition:"transform .1s"}}
    onMouseEnter={e=>e.currentTarget.style.transform="scale(1.12)"}
    onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
    {icon}
  </button>
);

// -- Trova il turno corrente in base all'orario --------------------------------
function findCurrentTurno(turni) {
  if(!turni.length) return null;
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  const toMin = s => { if(!s) return 0; const [h,m]=s.split(":"); return parseInt(h)*60+parseInt(m); };
  const nowMin = toMin(hhmm);
  // Cerca turno che contiene l'orario attuale
  const match = turni.find(t => t.ora_inizio && t.ora_fine &&
    nowMin >= toMin(t.ora_inizio) && nowMin <= toMin(t.ora_fine));
  if(match) return match;
  // Altrimenti il prossimo turno futuro
  const future = turni.filter(t=>t.ora_inizio && toMin(t.ora_inizio)>nowMin)
    .sort((a,b)=>toMin(a.ora_inizio)-toMin(b.ora_inizio));
  if(future.length) return future[0];
  return turni[0];
}

// ------------------------------------------------------------------------------
// ── ModalPagamento: reusable payment collection modal ─────────────────────────
// QR Scanner widget using jsQR via CDN (loaded on demand)
function QrScannerWidget({ onScan }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const streamRef = useRef(null);
  const [err,     setErr]    = useState("");
  const [errType, setErrType]= useState(""); // "insecure"|"denied"|"busy"|"missing"|"other"
  const [loaded,  setLoaded] = useState(typeof window.jsQR === "function");

  // ── Controllo contesto sicuro ────────────────────────────────────────────
  // getUserMedia richiede HTTPS o localhost. Su HTTP plain fallisce silenziosamente.
  const isSecure = typeof window !== "undefined" &&
    (window.isSecureContext ||
     window.location.hostname === "localhost" ||
     window.location.hostname === "127.0.0.1");

  useEffect(() => {
    if (!isSecure) return; // non caricare nemmeno jsQR se il contesto è insicuro
    if (typeof window.jsQR !== "function") {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
      s.onload = () => setLoaded(true);
      s.onerror = () => { setErr("Impossibile caricare la libreria QR"); setErrType("other"); };
      document.head.appendChild(s);
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!loaded || !isSecure) return;
    if (!navigator?.mediaDevices?.getUserMedia) {
      setErr("Il browser non supporta l'accesso alla webcam"); setErrType("missing"); return;
    }
    let active = true;
    // Prova prima con constraint environment, poi fallback senza constraint
    const tryGetMedia = (constraints) =>
      navigator.mediaDevices.getUserMedia(constraints).catch(() =>
        navigator.mediaDevices.getUserMedia({ video: true })
      );
    tryGetMedia({ video: { facingMode: "environment" } })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
        const scan = () => {
          if (!active) return;
          const v = videoRef.current;
          const c = canvasRef.current;
          if (v && c && v.readyState === v.HAVE_ENOUGH_DATA) {
            const ctx = c.getContext("2d");
            c.width = v.videoWidth; c.height = v.videoHeight;
            ctx.drawImage(v, 0, 0);
            const img = ctx.getImageData(0, 0, c.width, c.height);
            const result = window.jsQR(img.data, img.width, img.height);
            if (result?.data) { active = false; onScan(result.data); return; }
          }
          rafRef.current = requestAnimationFrame(scan);
        };
        rafRef.current = requestAnimationFrame(scan);
      })
      .catch(e => {
        const name = e?.name || "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setErr("Accesso alla webcam negato dal browser"); setErrType("denied");
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setErr("Nessuna webcam trovata su questo dispositivo"); setErrType("missing");
        } else if (name === "NotReadableError" || name === "TrackStartError") {
          setErr("Webcam occupata da un'altra applicazione"); setErrType("busy");
        } else if (name === "SecurityError") {
          setErr("Contesto non sicuro (HTTP)"); setErrType("insecure");
        } else {
          setErr(`Webcam non disponibile (${name||"errore sconosciuto"})`); setErrType("other");
        }
      });
    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, [loaded, onScan, isSecure]); // eslint-disable-line

  // ── Contesto insicuro: mostra istruzioni ────────────────────────────────
  if (!isSecure) return (
    <div style={{background:"#1e1b4b",border:"1px solid #4338ca",borderRadius:8,padding:"12px 14px",marginBottom:8}}>
      <div style={{color:"#fbbf24",fontWeight:700,fontSize:12,marginBottom:6}}><i className="fa-light fa-lock"/> Webcam richiede HTTPS</div>
      <div style={{color:"rgba(255,255,255,.75)",fontSize:11,lineHeight:1.7,marginBottom:8}}>
        Il browser blocca l'accesso alla webcam su connessioni <b style={{color:"#fca5a5"}}>HTTP</b>.<br/>
        Funziona solo su <b style={{color:"#86efac"}}>HTTPS</b> o da <b style={{color:"#86efac"}}>localhost</b>.
      </div>
      <div style={{fontSize:10,color:"rgba(255,255,255,.5)",lineHeight:1.6,marginBottom:6}}>
        <b style={{color:"rgba(255,255,255,.7)"}}>Soluzione rapida (Chrome):</b><br/>
        1. Apri <code style={{background:"rgba(255,255,255,.1)",padding:"1px 4px",borderRadius:3}}>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code><br/>
        2. Aggiungi l'indirizzo del gestionale (es. <code style={{background:"rgba(255,255,255,.1)",padding:"1px 4px",borderRadius:3}}>http://192.168.x.x</code>)<br/>
        3. Riavvia Chrome
      </div>
      <div style={{fontSize:10,color:"rgba(255,255,255,.4)"}}>
        <b style={{color:"rgba(255,255,255,.55)"}}>Alternativa:</b> accedi via <code style={{background:"rgba(255,255,255,.1)",padding:"1px 4px",borderRadius:3}}>http://localhost</code> oppure configura HTTPS sul server nginx.
      </div>
    </div>
  );

  if (err) return (
    <div style={{background:"#1e1b4b",border:"1px solid #4338ca",borderRadius:8,padding:"12px 14px",marginBottom:8}}>
      <div style={{color:"#fbbf24",fontWeight:700,fontSize:12,marginBottom:4}}>
        {errType==="denied"?"Permesso negato":errType==="busy"?"Webcam occupata":errType==="missing"?"Webcam non trovata":"Errore webcam"}
      </div>
      <div style={{color:"#fca5a5",fontSize:11,marginBottom:8}}>{err}</div>
      {errType==="denied"&&<div style={{color:"rgba(255,255,255,.6)",fontSize:10,lineHeight:1.6}}>
        Clicca sull'icona <i className="fa-light fa-lock"/> / <i className="fa-light fa-camera"/> nella barra degli indirizzi del browser e consenti l'accesso alla fotocamera, poi riprova.
      </div>}
      {errType==="busy"&&<div style={{color:"rgba(255,255,255,.6)",fontSize:10}}>
        Chiudi le altre applicazioni che usano la webcam (videoconferenze, Teams, Zoom, ecc.) e riprova.
      </div>}
    </div>
  );
  if (!loaded) return <div style={{color:"rgba(255,255,255,.5)",fontSize:11,marginBottom:8}}><i className="fa-light fa-hourglass-half"/> Caricamento lettore QR...</div>;
  return (
    <div style={{position:"relative",borderRadius:8,overflow:"hidden",background:"#000",marginBottom:8}}>
      <video ref={videoRef} muted playsInline style={{width:"100%",maxHeight:180,display:"block",objectFit:"cover"}}/>
      <canvas ref={canvasRef} style={{display:"none"}}/>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
        <div style={{width:140,height:140,border:"3px solid #f59e0b",borderRadius:8,boxShadow:"0 0 0 1000px rgba(0,0,0,.45)",position:"relative"}}>
          <div style={{position:"absolute",top:-3,left:-3,width:20,height:20,borderTop:"4px solid #f59e0b",borderLeft:"4px solid #f59e0b",borderRadius:"2px 0 0 0"}}/>
          <div style={{position:"absolute",top:-3,right:-3,width:20,height:20,borderTop:"4px solid #f59e0b",borderRight:"4px solid #f59e0b",borderRadius:"0 2px 0 0"}}/>
          <div style={{position:"absolute",bottom:-3,left:-3,width:20,height:20,borderBottom:"4px solid #f59e0b",borderLeft:"4px solid #f59e0b",borderRadius:"0 0 0 2px"}}/>
          <div style={{position:"absolute",bottom:-3,right:-3,width:20,height:20,borderBottom:"4px solid #f59e0b",borderRight:"4px solid #f59e0b",borderRadius:"0 0 2px 0"}}/>
        </div>
      </div>
      <div style={{position:"absolute",bottom:4,width:"100%",textAlign:"center",color:"#f59e0b",fontSize:10,fontWeight:700}}>
        <i className="fa-light fa-play"/> Inquadra il QR code nel riquadro
      </div>
    </div>
  );
}


function ModalPagamento({ importo, righe, tipoPreselezionato, titolo, comanda, outletNome, onConfirm, onClose,
  catClienti, categoriaManuale }) {
  const [tipo,     setTipo]     = useState(tipoPreselezionato || null);
  const [step,     setStep]     = useState(tipoPreselezionato ? 1 : 0);
  // Camera fields
  const [numCam,   setNumCam]   = useState("");
  const [numPers,  setNumPers]  = useState("");
  const [nomCam,   setNomCam]   = useState("");
  const [arrangio, setArrangio] = useState("");
  // Passanti field
  const [nomPass,  setNomPass]  = useState("");
  // Split payments for scontrino/fattura
  const [splits,   setSplits]   = useState([{metodo:"contanti", importo: importo||0}]);
  // Wallet payment state
  const [walletScan,  setWalletScan]  = useState(null);
  const [walletErr,   setWalletErr]   = useState("");
  const [manualToken, setManualToken] = useState("");

  // ── Scontistica per categoria cliente ──────────────────────────────────────
  // Priorità: categoria del cliente wallet (scansionato) > categoria manuale da sala
  const walletCatId  = walletScan?.cliente?.categoria_cliente_id ?? null;
  const walletCat    = walletCatId ? (catClienti||[]).find(x=>x.id===walletCatId) : null;
  const scontoWallet = walletCat?.sconto_perc || 0;
  const scontoManSel = categoriaManuale?.sconto_perc || 0;
  // Usa la categoria wallet se disponibile (ha priorità sul manuale)
  const scontoPerc   = walletCat ? scontoWallet : scontoManSel;
  const catNomeLabel = walletCat ? walletCat.nome : (categoriaManuale?.nome||"");
  const importoLordo = importo || 0;
  const scontoAbs    = scontoPerc > 0 ? parseFloat((importoLordo * scontoPerc / 100).toFixed(2)) : 0;
  const importoEff   = scontoPerc > 0 ? parseFloat((importoLordo - scontoAbs).toFixed(2)) : importoLordo;
  // ───────────────────────────────────────────────────────────────────────────

  const METODI = [["carta","fa-light fa-credit-card","Carta Credito"],["contanti","fa-light fa-money-bill","Contanti"],["bancomat","fa-light fa-money-bill-transfer","Bancomat"]];
  const splitsTotal = splits.reduce((s,p)=>s+parseFloat(p.importo||0),0);
  const splitsResto = importoEff - splitsTotal;
  const canConfirm = step===1 && (
    (tipo==="camera" && numCam && nomCam) ||
    (tipo==="passanti") ||
    ((tipo==="scontrino"||tipo==="fattura") && Math.abs(splitsResto)<0.01) ||
    (tipo==="wallet" && walletScan && !walletErr && (walletScan.saldo>=importoEff))
  );

  const handleConfirm = () => {
    const details = { tipo, importo: importoEff, importoOriginale: importoLordo,
      sconto: scontoPerc>0 ? {perc:scontoPerc, abs:scontoAbs, categoria:catNomeLabel} : null };
    if (tipo==="wallet" && walletScan) {
      details.wallet = walletScan;
      // Incasso wallet: una riga con metodo "wallet" per l'importo effettivo
      details.splits = [{metodo:"wallet", importo: importoEff}];
    }
    if (tipo==="camera")    details.camera = {numeroCam:numCam, numPersone:numPers, nominativo:nomCam, arrangiamento:arrangio};
    if (tipo==="passanti")  details.passanti = {nominativo:nomPass};
    if (tipo==="scontrino"||tipo==="fattura") details.splits = splits;
    printRicevuta(details);  // stampa ricevuta prima di chiudere
    onConfirm(details);
  };

  const printRicevuta = (details) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("it-IT")+" "+now.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});
    const tipoLabel = {camera:"Conto Camera",passanti:"Conto Passanti",scontrino:"Scontrino",fattura:"Fattura",wallet:"Wallet Cliente"}[details.tipo]||details.tipo;
    const righeHtml = (righe||[]).map(r=>{
      const qty = r.qty||r.quantita||1;
      const prc = r.prezzo||r.prezzo_snapshot||0;
      const nome = r.nome||r.nome_snapshot||"";
      const qtyFmt = Number.isInteger(qty)?qty:qty.toFixed(2).replace(/\.?0+$/,"");
      return `<tr><td>${qtyFmt}× ${nome}</td><td style="text-align:right">€${(prc*qty).toFixed(2)}</td></tr>`;
    }).join("");
    const splitsHtml = (details.splits||[]).map(s=>`<tr><td>${{"carta":"&#128179; Carta Credito","contanti":"&#128181; Contanti","bancomat":"&#127975; Bancomat","wallet":"&#128179; Wallet Cliente"}[s.metodo]||s.metodo}</td><td style="text-align:right">&#8364;${parseFloat(s.importo).toFixed(2)}</td></tr>`).join("");
    let extraHtml = "";
    if (details.camera) extraHtml = `<table style="width:100%;font-size:12px;margin:8px 0"><tr><td><b>Camera n&#176;</b></td><td>${details.camera.numeroCam}</td></tr><tr><td><b>Persone</b></td><td>${details.camera.numPersone||"-"}</td></tr><tr><td><b>Nominativo</b></td><td>${details.camera.nominativo}</td></tr><tr><td><b>Arrangiamento</b></td><td>${details.camera.arrangiamento||"-"}</td></tr></table>`;
    if (details.passanti) extraHtml = `<table style="width:100%;font-size:12px;margin:8px 0"><tr><td><b>Nominativo</b></td><td>${details.passanti.nominativo||"&#8212;"}</td></tr></table>`;
    if (details.wallet) {
      const wCli = details.wallet.cliente;
      const wNome = [wCli?.cognome, wCli?.nome].filter(Boolean).join(" ")||details.wallet.etichetta||"&#8212;";
      const wSaldo = typeof details.wallet.saldo === "number" ? `&#8364;${details.wallet.saldo.toFixed(2)}` : "&#8212;";
      extraHtml = `<table style="width:100%;font-size:12px;margin:8px 0"><tr><td><b>Cliente Wallet</b></td><td>${wNome}</td></tr><tr><td><b>Saldo precedente</b></td><td>${wSaldo}</td></tr></table>`;
    }
    const scontoHtml = details.sconto
      ? `<tr><td colspan="2"><div class="line"></div></td></tr><tr><td>Subtotale</td><td style="text-align:right">&#8364;${details.importoOriginale?.toFixed(2)||""}</td></tr><tr><td>Sconto ${details.sconto.perc}% (${details.sconto.categoria})</td><td style="text-align:right">-&#8364;${details.sconto.abs?.toFixed(2)||""}</td></tr>`
      : "";
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ricevuta #${comanda?.numero||""}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:monospace;font-size:13px;padding:16px;max-width:380px}h1{font-size:15px;font-weight:bold;margin-bottom:4px}.sub{font-size:11px;color:#666;margin-bottom:8px}table{width:100%}td{padding:2px 0}.line{border-top:1px dashed #999;margin:8px 0}.total td{font-weight:bold;font-size:14px;padding-top:4px}@media print{.noprint{display:none}}</style></head><body><h1>${outletNome||"Outlet Manager"}</h1><div class="sub">${dateStr}</div><div class="sub">Comanda #${comanda?.numero||""} &#8212; ${tipoLabel} &#8212; ${comanda?.coperti||""} pax</div>${extraHtml}<div class="line"></div><table>${righeHtml}</table><div class="line"></div><table class="total">${scontoHtml}<tr><td>TOTALE</td><td style="text-align:right">&#8364;${importoEff.toFixed(2)}</td></tr></table>${splitsHtml?"<div class=\'line\'></div><table>"+splitsHtml+"</table>":""}<div style="margin-top:20px;text-align:center;font-size:11px">Grazie e arrivederci!</div><br class="noprint"/><button class="noprint" onclick="window.print();setTimeout(()=>window.close(),500)" style="width:100%;padding:10px;cursor:pointer;margin-top:8px;font-size:14px">Stampa</button><script>window.onload=()=>setTimeout(()=>window.print(),300);<\/script></body></html>`;
    // Use Blob URL to avoid about:blank popup-blocked issue — charset=utf-8 obbligatorio
    const blob = new Blob([html], {type:"text/html;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const w = window.open(url,"_blank","width=420,height=640");
    if(w) setTimeout(()=>URL.revokeObjectURL(url), 10000);
    else { /* fallback: open in same tab as data URI */
      const a = document.createElement("a"); a.href=url; a.target="_blank"; a.click();
      setTimeout(()=>URL.revokeObjectURL(url),5000);
    }
  };

  const TIPI = [["camera","fa-light fa-hotel","Conto Camera"],["passanti","fa-light fa-person-walking","Conto Passanti"],["scontrino","fa-light fa-print","Emetti Scontrino"],["fattura","fa-light fa-file-lines","Emetti Fattura"],["wallet","fa-light fa-credit-card","Wallet Cliente"]];

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:1100,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div style={{background:"white",borderRadius:12,width:"100%",maxWidth:480,
        boxShadow:"0 16px 48px rgba(0,0,0,.22)",maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{background:"#2d5a7b",padding:"12px 16px",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{color:"white",fontWeight:700,fontSize:14}}>{titolo||"Chiudi comanda"}</div>
              {/* Mostra scontistica se presente */}
              {scontoPerc>0?(
                <div style={{marginTop:4}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                    <span style={{color:"rgba(255,255,255,.6)",fontSize:11,textDecoration:"line-through"}}>
                      €{importoLordo.toFixed(2)}
                    </span>
                    <span style={{background:"#f59e0b",color:"#1a1a1a",fontWeight:800,fontSize:10,
                      padding:"2px 7px",borderRadius:8,letterSpacing:.3}}>
                      −{scontoPerc}% {catNomeLabel}
                    </span>
                    <span style={{color:"#86efac",fontSize:11,fontWeight:600}}>
                      Sconto: −€{scontoAbs.toFixed(2)}
                    </span>
                  </div>
                  <div style={{color:"white",fontWeight:800,fontSize:16,marginTop:2}}>
                    Totale da incassare: <span style={{color:"#86efac"}}>€{importoEff.toFixed(2)}</span>
                  </div>
                </div>
              ):(
                <div style={{color:"rgba(255,255,255,.75)",fontSize:12,marginTop:2}}>
                  Totale da incassare: <b>€{importoEff.toFixed(2)}</b>
                  {(categoriaManuale?.nome)&&<span style={{marginLeft:6,fontSize:10,opacity:.7}}>({categoriaManuale.nome})</span>}
                </div>
              )}
            </div>
            <button onClick={onClose} style={{background:"rgba(255,255,255,.2)",border:"none",color:"white",cursor:"pointer",fontSize:18,width:28,height:28,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginLeft:10}}>×</button>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:16}}>
          {/* Step 0: choose type */}
          {step===0&&(
            <>
              <p style={{fontSize:13,color:"#6b7280",marginBottom:12}}>Seleziona modalità di chiusura:</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {TIPI.map(([k,ico,lab])=>(
                  <button key={k} onClick={()=>{setTipo(k);setStep(1);if(k==="scontrino"||k==="fattura")setSplits([{metodo:"contanti",importo:importoEff}]);}}
                    style={{height:68,borderRadius:10,border:"1.5px solid #e5e7eb",background:"white",
                      cursor:"pointer",fontSize:12,fontWeight:600,color:"#374151",
                      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:5,transition:"all .15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="#2d5a7b";e.currentTarget.style.background="#eff6ff";e.currentTarget.style.color="#2d5a7b";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="#e5e7eb";e.currentTarget.style.background="white";e.currentTarget.style.color="#374151";}}>
                    <span style={{fontSize:26}}><i className={ico}/></span>{lab}
                  </button>
                ))}
              </div>
            </>
          )}
          {/* Step 1: details */}
          {step===1&&(
            <>
              {/* Type badge + change */}
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,padding:"7px 12px",background:"#eff6ff",borderRadius:8}}>
                <span style={{fontSize:18}}><i className={TIPI.find(([k])=>k===tipo)?.[1]}/></span>
                <span style={{fontSize:13,fontWeight:600,color:"#2d5a7b"}}>{TIPI.find(([k])=>k===tipo)?.[2]}</span>
                {!tipoPreselezionato&&<button onClick={()=>{setTipo(null);setStep(0);}} style={{marginLeft:"auto",fontSize:11,color:"#2d5a7b",background:"transparent",border:"none",cursor:"pointer",textDecoration:"underline"}}>cambia</button>}
              </div>

              {/* Camera fields */}
              {tipo==="camera"&&(
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <div>
                      <label style={{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:4}}>N° Camera *</label>
                      <input value={numCam} onChange={e=>setNumCam(e.target.value)} placeholder="Es. 204"
                        style={{width:"100%",border:"1.5px solid "+(numCam?"#d1d5db":"#fca5a5"),borderRadius:6,padding:"7px 10px",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                    </div>
                    <div>
                      <label style={{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:4}}>N° Persone</label>
                      <input value={numPers} onChange={e=>setNumPers(e.target.value)} placeholder="Es. 2" type="number" min="1"
                        style={{width:"100%",border:"1px solid #d1d5db",borderRadius:6,padding:"7px 10px",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                    </div>
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:4}}>Nominativo *</label>
                    <input value={nomCam} onChange={e=>setNomCam(e.target.value)} placeholder="Cognome Nome"
                      style={{width:"100%",border:"1.5px solid "+(nomCam?"#d1d5db":"#fca5a5"),borderRadius:6,padding:"7px 10px",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:4}}>Arrangiamento</label>
                    <select value={arrangio} onChange={e=>setArrangio(e.target.value)}
                      style={{width:"100%",border:"1px solid #d1d5db",borderRadius:6,padding:"7px 10px",fontSize:13,outline:"none",background:"white",boxSizing:"border-box"}}>
                      <option value="">— seleziona —</option>
                      {["Room Only","Bed & Breakfast","Mezza Pensione","Pensione Completa","All Inclusive"].map(a=>(
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Passanti field */}
              {tipo==="passanti"&&(
                <div>
                  <label style={{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:4}}>Nominativo (opzionale)</label>
                  <input value={nomPass} onChange={e=>setNomPass(e.target.value)} placeholder="Cognome Nome"
                    style={{width:"100%",border:"1px solid #d1d5db",borderRadius:6,padding:"7px 10px",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                </div>
              )}

              {/* Wallet — QR scanner + manual token */}
              {tipo==="wallet"&&(
                <div>
                  {/* Importo con eventuale sconto */}
                  <div style={{textAlign:"center",marginBottom:12,padding:"12px 10px",background:"linear-gradient(135deg,#2d5a7b,#1e3f58)",borderRadius:8}}>
                    <div style={{fontSize:11,color:"rgba(255,255,255,.65)",marginBottom:2}}>Importo da addebitare</div>
                    {scontoPerc>0?(
                      <>
                        <div style={{fontSize:14,color:"rgba(255,255,255,.45)",textDecoration:"line-through",marginBottom:2}}>€{importoLordo.toFixed(2)}</div>
                        <div style={{display:"inline-flex",alignItems:"center",gap:6,marginBottom:4}}>
                          <span style={{background:"#f59e0b",color:"#1a1a1a",fontWeight:800,fontSize:10,padding:"2px 8px",borderRadius:8}}>
                            −{scontoPerc}% {catNomeLabel}
                          </span>
                        </div>
                        <div style={{fontSize:30,fontWeight:900,color:"#86efac"}}>€{importoEff.toFixed(2)}</div>
                      </>
                    ):(
                      <div style={{fontSize:28,fontWeight:900,color:"white"}}>€{importoEff.toFixed(2)}</div>
                    )}
                  </div>

                  {/* Scan / manual switch */}
                  {!walletScan&&(<>
                    {/* Webcam button */}
                    <button onClick={()=>setManualToken("__SCAN__")}
                      style={{width:"100%",padding:"10px",borderRadius:8,border:"2px solid #2d5a7b",
                        background:"#eff6ff",color:"#2d5a7b",cursor:"pointer",fontSize:13,fontWeight:700,
                        display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:8}}>
                      <i className="fa-light fa-camera"/> Scansiona QR con Webcam
                    </button>

                    {/* Manual token */}
                    <div style={{marginBottom:8}}>
                      <label style={{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:4}}>
                        Oppure incolla il token manualmente:
                      </label>
                      <div style={{display:"flex",gap:6}}>
                        <input value={manualToken==="__SCAN__"?"":manualToken}
                          onChange={e=>setManualToken(e.target.value)}
                          placeholder="Token dal QR code..."
                          style={{flex:1,border:"1px solid #d1d5db",borderRadius:6,padding:"7px 10px",fontSize:12,outline:"none"}}/>
                        <button onClick={async()=>{
                          const tok=(manualToken==="__SCAN__"?"":manualToken).trim();
                          if(!tok){setWalletErr("Inserisci un token");return;}
                          setWalletErr(""); setWalletScan(null);
                          try{
                            const t=localStorage.getItem("outlet_token")||"";
                            const r=await fetch(`/api/wallets/scan/${tok}`,{headers:{Authorization:`Bearer ${t}`}});
                            const d=await r.json();
                            if(!r.ok){setWalletErr(d.error||"Errore");return;}
                            // Verifica saldo contro importo effettivo (già scontato)
                            if((d.saldo||0)<importoEff){setWalletErr(`Credito insufficiente (disponibile: €${d.saldo.toFixed(2)})`);return;}
                            setWalletScan(d); setManualToken("");
                          }catch(e){setWalletErr("Errore di connessione");}
                        }} style={{padding:"7px 12px",borderRadius:6,border:"none",background:"#2d5a7b",color:"white",cursor:"pointer",fontWeight:700,fontSize:12}}>
                          <i className="fa-light fa-magnifying-glass"/> Verifica
                        </button>
                      </div>
                    </div>

                    {/* Webcam modal hint */}
                    {manualToken==="__SCAN__"&&(
                      <div style={{background:"#1a1a2e",borderRadius:10,padding:16,textAlign:"center",marginBottom:8}}>
                        <div style={{fontSize:32,marginBottom:8}}><i className="fa-light fa-camera"/></div>
                        <div style={{color:"white",fontWeight:700,fontSize:13,marginBottom:6}}>Scansione QR Webcam</div>
                        <div style={{color:"rgba(255,255,255,.7)",fontSize:11,lineHeight:1.6,marginBottom:12}}>
                          1. Inquadra il QR code nella zona centrale<br/>
                          2. Tieni il QR a 15–25 cm dalla camera<br/>
                          3. Assicurati di avere buona illuminazione<br/>
                          4. Il token verrà letto automaticamente
                        </div>
                        <QrScannerWidget onScan={token=>{
                          setManualToken(token);
                          // Auto-verify
                          const t=localStorage.getItem("outlet_token")||"";
                          setWalletErr(""); setWalletScan(null);
                          fetch(`/api/wallets/scan/${token}`,{headers:{Authorization:`Bearer ${t}`}})
                            .then(r=>r.json()).then(d=>{
                              if(d.error){setWalletErr(d.error);}
                              else if((d.saldo||0)<importoEff){setWalletErr(`Credito insufficiente (€${d.saldo.toFixed(2)})`);}
                              else{setWalletScan(d); setManualToken("");}
                            }).catch(()=>setWalletErr("Errore connessione"));
                        }}/>
                        <button onClick={()=>setManualToken("")}
                          style={{marginTop:10,padding:"5px 14px",borderRadius:6,border:"1px solid rgba(255,255,255,.2)",background:"transparent",color:"rgba(255,255,255,.6)",cursor:"pointer",fontSize:11}}>
                          Annulla webcam
                        </button>
                      </div>
                    )}
                  </>)}

                  {walletErr&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:6,padding:"8px 12px",fontSize:12,color:"#dc2626",marginBottom:8}}>
                    <i className="fa-light fa-triangle-exclamation"/> {walletErr} <button onClick={()=>{setWalletErr("");setWalletScan(null);setManualToken("");}} style={{marginLeft:8,border:"none",background:"none",cursor:"pointer",color:"#dc2626",fontSize:11}}>✕</button>
                  </div>}

                  {walletScan&&(
                    <div style={{background:"#f0fdf4",border:"2px solid #22c55e",borderRadius:8,padding:"12px 14px"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                        <div>
                          <div style={{fontWeight:800,fontSize:14,color:"#0f172a"}}><i className="fa-light fa-circle-check"/> {walletScan.cliente?.cognome||""} {walletScan.cliente?.nome||""}</div>
                          <div style={{fontSize:11,color:"#64748b"}}>{walletScan.etichetta}</div>
                          {walletCat&&<div style={{fontSize:10,color:"#2d5a7b",marginTop:2,fontWeight:600}}><i className="fa-light fa-tag"/> {walletCat.nome}{walletCat.sconto_perc?` · Sconto ${walletCat.sconto_perc}%`:""}</div>}
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:20,fontWeight:900,color:"#16a34a"}}>€{walletScan.saldo.toFixed(2)}</div>
                          <div style={{fontSize:10,color:"#64748b"}}>disponibile</div>
                        </div>
                      </div>
                      {scontoPerc>0&&(
                        <div style={{background:"#fef9c3",border:"1px solid #fde68a",borderRadius:6,padding:"6px 10px",marginBottom:8,fontSize:11,color:"#78350f"}}>
                          <i className="fa-light fa-tag"/> Sconto applicato: −{scontoPerc}% ({catNomeLabel}) = <b>−€{scontoAbs.toFixed(2)}</b>
                          {" · "}Da addebitare: <b style={{color:"#16a34a"}}>€{importoEff.toFixed(2)}</b>
                        </div>
                      )}
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                        borderTop:"1px solid #bbf7d0",paddingTop:6,marginTop:4}}>
                        <span style={{fontSize:11,color:"#16a34a",fontWeight:600}}>Residuo dopo pagamento:</span>
                        <span style={{fontSize:16,fontWeight:900,color:"#16a34a"}}>€{((walletScan.saldo||0)-importoEff).toFixed(2)}</span>
                      </div>
                      <button onClick={()=>{setWalletScan(null);setManualToken("");}}
                        style={{marginTop:8,padding:"4px 10px",borderRadius:5,border:"1px solid #bbf7d0",background:"white",color:"#64748b",cursor:"pointer",fontSize:11}}>
                        ↺ Cambia wallet
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Scontrino / Fattura: split payments */}
              {(tipo==="scontrino"||tipo==="fattura")&&(
                <div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <span style={{fontSize:12,fontWeight:600,color:"#374151"}}>Modalità di pagamento</span>
                    <button onClick={()=>setSplits(s=>[...s,{metodo:"carta",importo:Math.max(0,splitsResto).toFixed(2)}])}
                      style={{fontSize:11,color:"#2d5a7b",background:"transparent",border:"1px solid #2d5a7b",borderRadius:5,padding:"3px 8px",cursor:"pointer",fontWeight:600}}>
                      + Aggiungi metodo
                    </button>
                  </div>
                  {splits.map((sp,i)=>(
                    <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                      <select value={sp.metodo} onChange={e=>setSplits(s=>s.map((x,j)=>j===i?{...x,metodo:e.target.value}:x))}
                        style={{flex:2,border:"1px solid #d1d5db",borderRadius:6,padding:"7px 10px",fontSize:13,background:"white",outline:"none"}}>
                        {METODI.map(([k,ico,lab])=><option key={k} value={k}>{lab}</option>)}
                      </select>
                      <input type="number" value={sp.importo} onChange={e=>setSplits(s=>s.map((x,j)=>j===i?{...x,importo:e.target.value}:x))}
                        min="0" step="0.01"
                        style={{flex:1,border:"1px solid #d1d5db",borderRadius:6,padding:"7px 10px",fontSize:13,outline:"none",textAlign:"right"}}/>
                      <span style={{fontSize:12,color:"#6b7280",flexShrink:0}}>€</span>
                      {splits.length>1&&<button onClick={()=>setSplits(s=>s.filter((_,j)=>j!==i))}
                        style={{border:"none",background:"transparent",cursor:"pointer",color:"#9ca3af",fontSize:16,padding:"0 4px"}}>×</button>}
                    </div>
                  ))}
                  {/* Remainder indicator */}
                  <div style={{display:"flex",justifyContent:"space-between",padding:"8px 10px",borderRadius:6,
                    background:Math.abs(splitsResto)<0.01?"#f0fdf4":"#fef2f2",
                    border:"1px solid "+(Math.abs(splitsResto)<0.01?"#bbf7d0":"#fca5a5"),marginTop:6}}>
                    <span style={{fontSize:12,fontWeight:600,color:Math.abs(splitsResto)<0.01?"#16a34a":"#dc2626"}}>
                      {Math.abs(splitsResto)<0.01?"✓ Totale coperto":"Rimanente"}
                    </span>
                    {Math.abs(splitsResto)>=0.01&&<span style={{fontSize:12,fontWeight:700,color:"#dc2626"}}>€{splitsResto.toFixed(2)}</span>}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        {/* Footer */}
        {step===1&&(
          <div style={{padding:"10px 16px",borderTop:"1px solid #e5e7eb",display:"flex",gap:8,flexShrink:0}}>
            <button onClick={onClose}
              style={{flex:1,height:42,borderRadius:8,border:"1px solid #e5e7eb",background:"white",cursor:"pointer",fontSize:12,fontWeight:600,color:"#6b7280"}}>
              Annulla
            </button>
            <button onClick={handleConfirm}
              disabled={!canConfirm}
              style={{flex:2,height:42,borderRadius:8,border:"none",
                background:canConfirm?"#2d5a7b":"#e5e7eb",
                color:canConfirm?"white":"#9ca3af",
                cursor:canConfirm?"pointer":"not-allowed",fontSize:13,fontWeight:700}}>
              ✓ Conferma e stampa ricevuta
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


// ── Selezione Rapida: mostra tavoli e comande attive ─────────────────────────
function ModalSelRapida({ tavoli, turni, selTurno, noTavoli, selOutlet, onSelect, onClose, hasSale }) {
  const NAVY = "#204769";
  const allTabs = [
    !noTavoli && hasSale !== false ? ["tavoli","Tavoli"] : null,
    turni?.length > 0              ? ["turni", "Turni"]  : null,
    ["comande","Comande"],
  ].filter(Boolean);
  const tabs = allTabs;
  const defaultTab = noTavoli ? (turni?.length>0 ? "turni" : "comande") : "tavoli";
  const [tab, setTab] = useState(defaultTab || "comande");

  const [comande, setComande] = useState([]);

  useEffect(()=>{
    if(tab !== "comande") return;
    // noTavoli: load comande by outlet
    if(noTavoli || !tavoli?.length){
      if(selOutlet?.id){
        api.getComande(`?outlet_id=${selOutlet.id}&status=aperta`).then(setComande).catch(()=>{});
      } else {
        setComande([]);
      }
      return;
    }
    const ids = tavoli.filter(t=>t.status!=="disponibile").map(t=>t.id);
    if(!ids.length){ setComande([]); return; }
    Promise.all(ids.map(id=>
      api.getComande("?tavolo_id="+id+"&status=aperta")
    )).then(results=>{ setComande(results.flat().filter(Boolean)); }).catch(()=>{});
  },[tab, tavoli, noTavoli]);

  const statusColor = s=>({
    disponibile:"#A9AAAD", attesa_ordine:"#5C9CD4",
    occupato:"#FF616E",    riservato:NAVY, chiesto_conto:"#F57D03"
  }[s]||"#A9AAAD");

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(32,71,105,.5)",zIndex:2000,
      display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:"white",borderRadius:14,width:600,maxHeight:"80vh",
        overflow:"hidden",display:"flex",flexDirection:"column",
        boxShadow:"0 16px 48px rgba(32,71,105,.2)"}} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{background:NAVY,padding:"14px 20px",display:"flex",
          alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <span style={{color:"white",fontWeight:700,fontSize:15,fontFamily:"'Poppins',sans-serif"}}>
            <i className="fa-light fa-bolt"/> Selezione Rapida
          </span>
          <button onClick={onClose} style={{background:"rgba(255,255,255,.15)",border:"none",
            color:"white",cursor:"pointer",fontSize:18,width:28,height:28,borderRadius:6,
            display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>

        {/* Tab buttons */}
        <div style={{display:"flex",borderBottom:"1px solid #DBDBDB",flexShrink:0}}>
          {tabs.map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)}
              style={{flex:1,padding:"10px",border:"none",cursor:"pointer",
                background:tab===k?"white":"#f2f5f6",
                borderBottom:tab===k?"2px solid "+NAVY:"2px solid transparent",
                fontSize:13,fontWeight:700,color:tab===k?NAVY:"#6E7175",
                transition:"all .15s"}}>
              {l}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{flex:1,overflowY:"auto",padding:16}}>

          {/* ── TAVOLI ── */}
          {tab==="tavoli"&&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {tavoli.map(t=>(
                <button key={t.id} onClick={()=>onSelect("tavolo",t)}
                  style={{padding:"12px 8px",borderRadius:10,border:"1.5px solid #DBDBDB",
                    background:"white",cursor:"pointer",textAlign:"center",
                    transition:"all .15s",boxShadow:"0 1px 4px rgba(32,71,105,.06)"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=NAVY;e.currentTarget.style.boxShadow="0 3px 12px rgba(32,71,105,.14)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#DBDBDB";e.currentTarget.style.boxShadow="0 1px 4px rgba(32,71,105,.06)";}}>
                  <div style={{width:8,height:8,borderRadius:"50%",
                    background:statusColor(t.status),margin:"0 auto 6px"}}/>
                  <div style={{fontSize:14,fontWeight:800,color:NAVY,fontFamily:"'Poppins',sans-serif"}}>
                    {t.numero}
                  </div>
                  <div style={{fontSize:9,color:"#6E7175",marginTop:2}}>{t.capienza} posti</div>
                  {t.totale_oggi>0&&(
                    <div style={{fontSize:10,fontWeight:700,color:"#059669",marginTop:3}}>
                      €{t.totale_oggi.toFixed(2)}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* ── TURNI ── */}
          {tab==="turni"&&(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {turni.length===0 && (
                <div style={{textAlign:"center",color:"#9ca3af",padding:32,fontSize:13}}>
                  Nessun turno configurato
                </div>
              )}
              {turni.map(t=>{
                const isActive = selTurno?.id===t.id;
                return (
                  <button key={t.id} onClick={()=>onSelect("turno",t)}
                    style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                      padding:"14px 18px",borderRadius:10,cursor:"pointer",textAlign:"left",
                      border:"1.5px solid "+(isActive?NAVY:"#DBDBDB"),
                      background:isActive?"#EBF3FD":"white",
                      boxShadow:"0 1px 4px rgba(32,71,105,.06)",transition:"all .15s"}}
                    onMouseEnter={e=>{if(!isActive){e.currentTarget.style.borderColor=NAVY;e.currentTarget.style.background="#f8fbff";}}}
                    onMouseLeave={e=>{if(!isActive){e.currentTarget.style.borderColor="#DBDBDB";e.currentTarget.style.background="white";}}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:NAVY}}>{t.nome}</div>
                      {t.ora_inizio&&<div style={{fontSize:11,color:"#6E7175",marginTop:2}}>{t.ora_inizio} – {t.ora_fine}</div>}
                      {t.servizio&&<div style={{fontSize:11,color:"#5C9CD4",marginTop:2}}>{t.servizio}</div>}
                    </div>
                    {isActive&&(
                      <span style={{background:NAVY,color:"white",fontSize:10,fontWeight:700,
                        padding:"2px 8px",borderRadius:10}}>ATTIVO</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── COMANDE ATTIVE ── */}
          {tab==="comande"&&(
            comande.length===0 ? (
              <div style={{textAlign:"center",color:"#9ca3af",padding:32,fontSize:13}}>
                Nessuna comanda attiva
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {comande.map(c=>(
                  <button key={c.id} onClick={()=>onSelect("comanda",c)}
                    style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                      padding:"12px 16px",borderRadius:10,border:"1.5px solid #DBDBDB",
                      background:"white",cursor:"pointer",textAlign:"left",
                      boxShadow:"0 1px 4px rgba(32,71,105,.06)",transition:"all .15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=NAVY;e.currentTarget.style.boxShadow="0 3px 12px rgba(32,71,105,.14)";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="#DBDBDB";e.currentTarget.style.boxShadow="0 1px 4px rgba(32,71,105,.06)";}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:NAVY}}>#{c.numero}</div>
                      <div style={{fontSize:11,color:"#6E7175",marginTop:2}}>
                        Tavolo {c.tavolo_id} · {c.coperti} pax
                      </div>
                    </div>
                    <div style={{fontSize:16,fontWeight:800,color:NAVY,fontFamily:"'Poppins',sans-serif",flexShrink:0}}>
                      €{(c.totale||0).toFixed(2)}
                    </div>
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      </div>

    </div>
  );
}


export function GestioneSala({ tavolo:initTavolo, sala:initSala, outlet:initOutlet, turno:initTurno, onGoToSala }) {

  // -- UI state ----------------------------------------------------------------
  const [categorie, setCategorie]   = useState([]);
  const [selCat,    setSelCat]      = useState(null);
  const [vociCat,   setVociCat]     = useState([]);
  const [catPage,   setCatPage]     = useState(0);
  const [vociPage,  setVociPage]    = useState(0);
  const CAT_PER_PAGE  = 15;
  const VOCI_PER_PAGE = 16;

  const [order,     setOrder]       = useState([]);
  const [comanda,   setComanda]     = useState(null);
  const [note,      setNote]        = useState("");
  const [showNote,     setShowNote]     = useState(false);
  const [showSelRapida,setShowSelRapida]= useState(false); // rapid selection modal
  const [tipo,      setTipo]        = useState("scontrino");
  // -- Categoria cliente + prezzi --
  const [catClienti,   setCatClienti]   = useState([]);
  const [selCatCliente,setSelCatCliente]= useState(null); // {id, nome}
  // -- Outlet senza tavoli (comanda diretta) --
  const [noTavoli,     setNoTavoli]     = useState(false); // outlet con 0 sale/tavoli
  // -- Drag & drop reorder state ---
  const [dragSrcCat,   setDragSrcCat]   = useState(null);
  // -- Annulla comanda state ---
  const [showAnnulla,    setShowAnnulla]    = useState(false);
  const [motivoAnnulla,  setMotivoAnnulla]  = useState("");
  // -- Sezione comanda (portate separator) ---
  const [inviatoReparti, setInviatoReparti] = useState(false); // traccia se comanda già inviata
  const [turnoCorrente,  setTurnoCorrente]  = useState(0);     // which turno is currently called
  const [copertiComanda, setCopertiComanda] = useState(1);      // pax for current comanda (editable)
  // -- DnD for order items (reorder between turni) ---
  const [dragItemIdx,   setDragItemIdx]    = useState(null);  // index in order[] being dragged
  const [dragOverSep,   setDragOverSep]    = useState(null);  // separator idx being hovered
  const [turnoPortata,   setTurnoPortata]   = useState(1);     // counter for "Turno N" separators
  // -- Chiudi / Dividi conto modals ---
  const [showChiudi,       setShowChiudi]      = useState(false);
  const [showPagamento,    setShowPagamento]   = useState(false);
  const [pagConfig,        setPagConfig]       = useState(null); // {importo, righe, titolo, tipo, onConfirm}
  const [chiudiTipo,       setChiudiTipo]      = useState(null); // null=choose | 'camera'|'passanti'|'scontrino'|'fattura'
  const [chiudiParte,      setChiudiParte]     = useState(null); // which partial comanda to close
  const [showDividi,       setShowDividi]      = useState(false);   // dividi conto (select items)
  const [dividiItems,      setDividiItems]     = useState([]);      // selected item ids for dividi
  const [showDividiParti,  setShowDividiParti] = useState(false);   // dividi in parti uguali
  const [numParti,         setNumParti]        = useState(2);       // how many equal parts
  // -- Partial close tracking ---
  const [closedItems,      setClosedItems]     = useState([]);      // voce_ids partially closed
  const [partiChiuse,      setPartiChiuse]     = useState([]);      // [{tipo, importo}] for dividi parti
  // -- Lista comande chiuse ---
  const [showComandeChiuse,setShowComandeChiuse]=useState(false);
  const [comandeChiuse,    setComandeChiuse]   = useState([]);
  const [loadingChiuse,    setLoadingChiuse]   = useState(false);  // dragged category id
  const [dragOverCat,  setDragOverCat]  = useState(null);  // hovered category id
  const [dragSrcVoce,  setDragSrcVoce]  = useState(null);  // dragged voce id
  const [dragOverVoce, setDragOverVoce] = useState(null);  // hovered voce id
  const [reorderMode,  setReorderMode]  = useState(false); // toggle on/off
  // -- Multi-comanda: lista comande aperte per questo tavolo/outlet --
  const [comandeAperte,setComandeAperte]= useState([]);
  const { toast, ToastEl }          = useToast();

  // -- Navigation state --------------------------------------------------------
  const [outlets,   setOutlets]     = useState([]);
  const [selOutlet, setSelOutlet]   = useState(initOutlet || null);
  const [sale,      setSale]        = useState([]);
  const [selSala,   setSelSala]     = useState(initSala || null);
  const [tavoli,    setTavoli]      = useState([]);
  const [selTavId,  setSelTavId]    = useState(initTavolo?.id || null); // track by id only
  const [turni,     setTurni]       = useState([]);
  const [selTurno,  setSelTurno]    = useState(initTurno||null);
  const [cmdNum,    setCmdNum]      = useState("001");

  // -- Derived: current tavolo from list ---------------------------------------
  const tavolo = tavoli.find(t => t.id === selTavId) || null;

  // -- Fetch helpers ------------------------------------------------------------
  const fetchNextNum = async (outletId) => {
    try {
      const token = (await import("../services/authApi")).authStorage.getToken();
      const r = await fetch(`/api/outlets/${outletId}/next-comanda-numero`,
        { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const d = await r.json();
        if (d?.numero) { setCmdNum(d.numero); return; }
      }
    } catch {}
    // Fallback: increment current number
    setCmdNum(prev => String(parseInt(prev||0)+1).padStart(3,"0"));
  };

  // -- Sync pax count to comanda when changed --------------------------------------
  useEffect(() => {
    if (!comanda?.id) return;
    const id = comanda.id;
    const t = setTimeout(() => {
      api.updateComanda(id, { coperti: copertiComanda }).catch(()=>{});
    }, 400);
    return () => clearTimeout(t);
  }, [copertiComanda, comanda?.id]); // eslint-disable-line

  // -- Auto-save: persist order when it changes and comanda is open -------------
  const _saveTimerRef = useRef(null);
  useEffect(() => {
    if (!comanda?.id) return;
    const comandaId = comanda.id;
    const currentNote = note;
    // Snapshot order at effect time to avoid stale closure
    const currentOrder = order;
    clearTimeout(_saveTimerRef.current);
    _saveTimerRef.current = setTimeout(async () => {
      try {
        // Build righe WITH turno_idx from separator positions
        let turno = 0;
        const righe = [];
        for (const x of currentOrder) {
          if (x.isSeparatore) { turno++; continue; }
          righe.push({ voce_id:x.voce_id, nome_snapshot:x.nome,
            prezzo_snapshot:x.prezzo, quantita:x.qty,
            note:null, turno_idx:turno });
        }
        await api.updateComanda(comandaId, { righe, note: currentNote });
        if (selSala?.id) api.getTavoli(selSala.id).then(setTavoli).catch(()=>{});
      } catch(e) { /* silent */ }
    }, 500);
    return () => clearTimeout(_saveTimerRef.current);
  }, [order, comanda?.id, note]); // eslint-disable-line

  // -- Helper: reconstruct order array with separators from righe.turno_idx --------
  const ricostruisciOrdine = (righe) => {
    const out = [];
    let lastTurno = -1, sepCnt = 0;
    for (const r of (righe||[])) {
      const ti = r.turno_idx || 0;
      if (ti > lastTurno && lastTurno >= 0) {
        sepCnt++;
        out.push({voce_id:`sep_${Date.now()}_${sepCnt}`,
          nome:`— Turno ${sepCnt+1} —`, prezzo:0, qty:0, isSeparatore:true});
      }
      lastTurno = ti;
      out.push({voce_id:r.voce_id, nome:r.nome_snapshot,
        prezzo:r.prezzo_snapshot, qty:r.quantita, turno_idx:ti});
    }
    return out;
  };

  const loadComanda = async (tavoloId) => {
    if (!tavoloId && !selOutlet?.id) return;
    const params = tavoloId
      ? `?tavolo_id=${tavoloId}&status=aperta`
      : `?outlet_id=${selOutlet.id}&status=aperta`;
    const lista = await api.getComande(params);
    setComandeAperte(lista);
    if (lista.length) {
      const c = lista[0];
      setComanda(c);
      const rebuilt = ricostruisciOrdine(c.righe);
      setOrder(rebuilt);
      setTurnoPortata(rebuilt.filter(x=>x.isSeparatore).length+1);
      setNote(c.note || "");
      setCopertiComanda(c.coperti||1);
      // Ripristina voci parzialmente chiuse
      try {
        const _ci = localStorage.getItem("ci_"+c.id);
        const _pc = localStorage.getItem("pc_"+c.id);
        if (_ci) setClosedItems(JSON.parse(_ci));
        if (_pc) setPartiChiuse(JSON.parse(_pc));
      } catch {}
    } else {
      setComanda(null); setOrder([]); setNote("");
    }
  };

  const refreshTavoli = async (salaId) => {
    if (!salaId) return;
    const data = await api.getTavoli(salaId);
    setTavoli(data);
    return data;
  };

  // -- Init: load outlets + categorie -----------------------------------------
  useEffect(() => {
    api.getOutlets().then(d => {
      setOutlets(d);
      if (!initOutlet && d.length) setSelOutlet(d[0]);
    });
    api.getCategorieMenu(true).then(setCategorie);
    api.getCategorieCliente().then(setCatClienti);
  }, []); // eslint-disable-line

  // -- When outlet changes: load sale + turni + comanda number -----------------
  useEffect(() => {
    if (!selOutlet?.id) return;
    // Reset all tavolo/comanda state when outlet changes
    setSelTavId(null);
    setSelSala(null);
    setComanda(null);
    setOrder([]);
    setNote("");
    setTavoli([]);
    api.getSale(selOutlet.id).then(d => {
      setSale(d);
      if (d.length) {
        setSelSala(d[0]);
        setNoTavoli(false);
      } else {
        setNoTavoli(true); // outlet without rooms - direct order mode
      }
    });
    api.getTurni(`?outlet_id=${selOutlet.id}`).then(d => {
      setTurni(d);
      // Also refresh next comanda number for this outlet
      fetchNextNum(selOutlet.id);
      // Only auto-detect turno if none provided from context
      if (!initTurno) setSelTurno(findCurrentTurno(d));
    });
    fetchNextNum(selOutlet.id);
  }, [selOutlet?.id]); // eslint-disable-line

  // -- When sala changes: load tavoli ------------------------------------------
  useEffect(() => {
    if (!selSala?.id) return;
    api.getTavoli(selSala.id).then(d => {
      setTavoli(d);
      // Auto-select initTavolo or first
      if (initTavolo) {
        const found = d.find(t => t.id === initTavolo.id);
        if (found && !selTavId) setSelTavId(found.id);
      } else if (!selTavId && d.length) {
        setSelTavId(d[0].id);
      }
    });
  }, [selSala?.id]); // eslint-disable-line

  // -- When selTavId changes: load comanda --------------------------------------
  useEffect(() => {
    if (!selTavId) return;
    setComanda(null); setOrder([]); setNote(""); setTurnoPortata(1); // reset immediately
    loadComanda(selTavId);
  }, [selTavId]); // eslint-disable-line

  // -- On first mount with initTavolo: force immediate comanda load -------------
  const didInitLoad = useRef(false);
  useEffect(() => {
    if (didInitLoad.current) return;
    if (!initTavolo?.id) return;
    didInitLoad.current = true;
    setSelTavId(initTavolo.id); // sets the id, which triggers the above effect
  }, []); // eslint-disable-line

  // -- Cambio tavolo ------------------------------------------------------------
  const handleChangeTavolo = async (newId) => {
    if (newId === selTavId) {
      // Same tavolo: force reload
      await loadComanda(newId);
      return;
    }
    const t = tavoli.find(x => x.id === newId);
    if (!t) return;
    // Mark new tavolo as attesa_ordine if disponibile
    if (t.status === "disponibile") {
      await api.patchTavolo(t.id, { status: "attesa_ordine" });
      setTavoli(prev => prev.map(x => x.id === t.id ? { ...x, status:"attesa_ordine" } : x));
    }
    setSelTavId(newId); // triggers useEffect → resets order + loads comanda
  };

  // -- Ricarica lista comande aperte per outlet (no-tavolo) -------------------
  const refreshComandeAperte = async () => {
    if (!selOutlet?.id) return;
    const params = selTavId
      ? `?tavolo_id=${selTavId}&status=aperta`
      : `?outlet_id=${selOutlet.id}&status=aperta`;
    const lista = await api.getComande(params);
    setComandeAperte(lista);
    // Keep comanda in sync
    if (comanda) {
      const updated = lista.find(c => c.id === comanda.id);
      if (updated) setComanda(updated);
    }
  };

  // -- Seleziona comanda dalla lista -------------------------------------------
  const selectComanda = async (c) => {
    // Fetch fresh comanda to get latest righe
    try {
      const token = localStorage.getItem("outlet_token")||"";
      const r = await fetch(`/api/comande/${c.id}`,{headers:{Authorization:`Bearer ${token}`}});
      if (r.ok) {
        const fresh = await r.json();
        setComanda(fresh);
        setNote(fresh.note||"");
        setCopertiComanda(fresh.coperti||1);
        // Ripristina voci parzialmente chiuse da localStorage
        try {
          const _ci = localStorage.getItem("ci_"+fresh.id);
          const _pc = localStorage.getItem("pc_"+fresh.id);
          if (_ci) setClosedItems(JSON.parse(_ci));
          if (_pc) setPartiChiuse(JSON.parse(_pc));
        } catch {}
        const rebuilt = ricostruisciOrdine(fresh.righe);
        setOrder(rebuilt);
        setTurnoPortata(rebuilt.filter(x=>x.isSeparatore).length+1);
        // Sync tavolo selection to this comanda's tavolo
        if (fresh.tavolo_id && fresh.tavolo_id !== selTavId) setSelTavId(fresh.tavolo_id);
        else if (!fresh.tavolo_id) setSelTavId(null);
        return;
      }
    } catch {}
    // Fallback to cached
    setComanda(c);
    setNote(c.note||"");
    const rebuiltF = ricostruisciOrdine(c.righe);
    setOrder(rebuiltF);
    setTurnoPortata(rebuiltF.filter(x=>x.isSeparatore).length+1);
    // Sync tavolo selection
    if (c.tavolo_id && c.tavolo_id !== selTavId) setSelTavId(c.tavolo_id);
  };

  // -- Apri comanda (esplicito) -------------------------------------------------
  const apriComanda = async () => {
    // noTavoli outlet: just clear state and create new comanda immediately
    if (noTavoli) {
      setComanda(null); setOrder([]); setNote(""); setTurnoPortata(1); setInviatoReparti(false); setClosedItems([]); setPartiChiuse([]); setTurnoCorrente(0); setCopertiComanda(1);
      setComandeAperte(prev => comanda ? prev : prev); // keep list for reference
      // Fall through to create new comanda below
    } else if (comanda) {
      // Non-noTavoli with open comanda: clear and let user pick free tavolo
      setComanda(null); setOrder([]); setNote(""); setTurnoPortata(1); setInviatoReparti(false); setClosedItems([]); setPartiChiuse([]); setTurnoCorrente(0); setCopertiComanda(1);
      setSelTavId(null);
      toast("Seleziona un tavolo libero per la nuova comanda");
      if (selOutlet?.id) fetchNextNum(selOutlet.id);
      return;
    } else if (!tavolo) {
      toast("Seleziona un tavolo libero","error"); return;
    }
    try {
      const c = await api.createComanda({
        tavolo_id:      noTavoli ? null : tavolo.id,
        turno_id:       selTurno?.id || null,
        outlet_id:      selOutlet?.id || null,
        cat_cliente_id: selCatCliente?.id || null,
        numero:         cmdNum,
        coperti:        copertiComanda,
        note: "", righe: []
      });
      setComanda(c);
      setInviatoReparti(false);
      if (tavolo) {
        await api.patchTavolo(tavolo.id, { status:"attesa_ordine", turno_occupato_id:selTurno?.id||null });
      }
      if (selSala?.id) await refreshTavoli(selSala.id);
      if (selOutlet?.id) fetchNextNum(selOutlet.id);
      toast(`✓ Comanda n° ${c.numero} aperta`);
    } catch(e) { toast(e.message,"error"); }
  };

  // -- Voci menu ----------------------------------------------------------------
  const loadVoci = async cat => {
    setSelCat(cat); setVociPage(0);
    const params = `?categoria_id=${cat.id}${selOutlet ? "&outlet_id="+selOutlet.id : ""}`;
    setVociCat(await api.getVociMenu(params));
  };

  // Resolve best price: outlet-specific > cat_cliente-specific > base
  // -- Aggiungi separatore portata -----------------------------------------------
  const addSeparatore = () => {
    const label = `— Turno ${turnoPortata} —`;
    setTurnoPortata(n => n+1);
    const sep = { voce_id:`sep_${Date.now()}`, nome:label, prezzo:0, qty:0, isSeparatore:true };
    setOrder(o => {
      const newOrder = [...o, sep];
      if (comanda) {
        // Compute turno_idx correctly from newOrder with separators
        let t=0; const righe=[];
        for(const x of newOrder){ if(x.isSeparatore){t++;continue;} righe.push({voce_id:x.voce_id,nome_snapshot:x.nome,prezzo_snapshot:x.prezzo,quantita:x.qty,turno_idx:t}); }
        api.updateComanda(comanda.id, { righe, note }).catch(()=>{});
      }
      return newOrder;
    });
  };

  // -- Open payment collection modal -------------------------------------------
  const openPagamento = (importo, righe, titolo, tipo, onConfirm) => {
    setPagConfig({ importo, righe, titolo, tipo: tipo||null, onConfirm });
    setShowPagamento(true);
  };

  // -- Helper: close comanda after payment confirmed --------------------------
  const doCloseComanda = async (isFull) => {
    const token = localStorage.getItem("outlet_token")||"";
    await fetch(`/api/comande/${comanda.id}/chiudi?tipo_chiusura=pagato`,
      {method:"POST", headers:{Authorization:`Bearer ${token}`}});
    if (tavolo) await api.patchTavolo(tavolo.id,{status:"disponibile",coperti_attuali:0,turno_occupato_id:null});
    if (selSala?.id) await refreshTavoli(selSala.id);
    // Pulisci stato pagamento parziale da localStorage
    const _closeId = comanda?.id;
    if (_closeId) { localStorage.removeItem("ci_"+_closeId); localStorage.removeItem("pc_"+_closeId); }
    setComanda(null); setOrder([]); setNote(""); setTurnoPortata(1);
    setInviatoReparti(false); setClosedItems([]); setPartiChiuse([]);
    setComandeAperte(prev=>prev.filter(c=>c.id!==comanda.id));
    if (selOutlet?.id) fetchNextNum(selOutlet.id);
  };

  // -- Stampa comanda su stampante reparto (browser print window) ────────────
  const stampaComandaReparto = (group, cmd) => {
    const { stampante, voci } = group;
    const now = new Date();
    const dateStr = now.toLocaleDateString("it-IT") + " " + now.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});
    const tavInfo = tavolo ? `Tavolo ${tavolo.numero}` : (noTavoli?"Asporto/Bar":"—");
    const righeHtml = voci.map(v =>
      `<tr><td style="font-size:16px;font-weight:bold;padding:4px 0">${v.qty}×</td>`+
      `<td style="font-size:16px;font-weight:bold;padding:4px 8px">${v.nome}</td>`+
      `${v.note?`<td style="font-size:12px;color:#666;font-style:italic">(${v.note})</td>`:"<td></td>"}</tr>`
    ).join("");
    // Build HTML and open via Blob URL (avoids about:blank/popup-blocker issues)
    const _html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Comanda #${cmd?.numero||""} &#8212; ${stampante.nome}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:monospace;font-size:14px;padding:12px;max-width:360px}
h1{font-size:16px;font-weight:bold;margin-bottom:2px;text-transform:uppercase}
.sub{font-size:11px;color:#555;margin-bottom:10px}
.line{border-top:1px dashed #999;margin:8px 0}
table{width:100%;border-collapse:collapse}
.cmd{font-size:20px;font-weight:bold;text-align:center;margin:8px 0;letter-spacing:2px}
@media print{button{display:none}}
</style></head><body>
<h1>${stampante.nome}</h1>
<div class="sub">${dateStr}</div>
<div class="line"></div>
<div class="cmd">◆ Comanda #${cmd?.numero||""} ◆</div>
<div class="sub">${tavInfo} ${selTurno?.nome||""} — ${copertiComanda} pax</div>
<div class="line"></div>
<table>${righeHtml}</table>
<div class="line"></div>
<div style="text-align:center;font-size:11px;margin-top:8px">${selOutlet?.nome||""}</div>
<br/>
<button onclick="window.print();setTimeout(()=>window.close(),500)" style="width:100%;padding:8px;cursor:pointer">
  <i className="fa-light fa-print"/> Stampa e chiudi
</button>
<script>window.onload=()=>setTimeout(()=>window.print(),300);<\/script>
</body></html>`;
    const _blob = new Blob([_html], {type:"text/html;charset=utf-8"});
    const _url = URL.createObjectURL(_blob);
    const _w = window.open(_url, "_blank", "width=400,height=520");
    if (_w) setTimeout(() => URL.revokeObjectURL(_url), 10000);
  };

  // -- Stampa pre-conto / estratto conto ----------------------------------------
  const printPreConto = async () => {
    if (!comanda) return;
    // Cerca stampante pre-conto configurata per questo outlet
    let stampante = null;
    try {
      const allStampanti = await api.getStampanti();
      stampante = (allStampanti||[]).find(s =>
        s.tipo === "preconto" && s.attiva !== false &&
        (!s.outlet_id || s.outlet_id === selOutlet?.id)
      );
    } catch(e) { /* stampa comunque anche senza stampante configurata */ }

    const now = new Date();
    const dateStr = now.toLocaleDateString("it-IT") + " " + now.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});
    const tavInfo = tavolo ? `Tavolo ${tavolo.numero}` : (noTavoli ? "Asporto/Bar" : "&#8212;");

    // Calcola totali con eventuale sconto categoria
    const vociOrd = order.filter(x => !x.isSeparatore);
    const subtotale = vociOrd.reduce((s,v) => s + (v.prezzo||0)*(v.qty||1), 0);
    const scontoPerc = selCatCliente?.sconto_perc || 0;
    const scontoAbs  = scontoPerc > 0 ? parseFloat((subtotale * scontoPerc / 100).toFixed(2)) : 0;
    const totale     = scontoPerc > 0 ? parseFloat((subtotale - scontoAbs).toFixed(2)) : subtotale;

    // Righe articoli (i separatori diventano intestazioni di sezione)
    const righeHtml = order.map(v => {
      if (v.isSeparatore) {
        return `<tr><td colspan="3" style="padding:6px 0 2px;font-size:11px;color:#888;font-weight:bold;border-top:1px dashed #ccc;letter-spacing:1px;text-transform:uppercase">${v.nome||"&mdash;"}</td></tr>`;
      }
      const lineTot = ((v.prezzo||0)*(v.qty||1)).toFixed(2);
      return `<tr>
        <td style="padding:3px 0;font-size:13px;font-weight:600">${v.qty||1}&#215;</td>
        <td style="padding:3px 8px;font-size:13px">${v.nome}${v.note?`<br/><span style="font-size:10px;color:#888;font-style:italic">${v.note}</span>`:""}</td>
        <td style="padding:3px 0;font-size:13px;text-align:right">&#8364;${lineTot}</td>
      </tr>`;
    }).join("");

    const scontoRow = scontoPerc > 0 ? `
      <tr><td colspan="2" style="padding:3px 0;font-size:12px;color:#b45309">Sconto ${scontoPerc}% (${selCatCliente?.nome||""})</td>
      <td style="text-align:right;font-size:12px;color:#b45309">&#8722;&#8364;${scontoAbs.toFixed(2)}</td></tr>` : "";

    const _html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Pre-conto #${comanda?.numero||""}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:monospace;font-size:13px;padding:14px;max-width:360px}
h1{font-size:15px;font-weight:bold;margin-bottom:2px;text-transform:uppercase}
.sub{font-size:11px;color:#555;margin-bottom:6px}
.line{border-top:1px dashed #999;margin:7px 0}
table{width:100%;border-collapse:collapse}
.tot{font-size:16px;font-weight:bold}
.nc{font-size:10px;color:#aaa;text-align:center;margin-top:8px}
@media print{button{display:none}}
</style></head><body>
<h1>${selOutlet?.nome||"Pre-conto"}</h1>
<div class="sub">${dateStr}</div>
<div class="line"></div>
<div style="font-size:13px;font-weight:bold;text-align:center;margin:5px 0">ESTRATTO CONTO &#8212; #${comanda?.numero||""}</div>
<div class="sub" style="text-align:center">${tavInfo}${selTurno?.nome?" &#8212; "+selTurno.nome:""} &#8212; ${copertiComanda} pax</div>
<div class="line"></div>
<table>${righeHtml}</table>
<div class="line"></div>
<table>
  <tr><td style="padding:3px 0;font-size:13px">Subtotale</td><td style="text-align:right;font-size:13px">&#8364;${subtotale.toFixed(2)}</td></tr>
  ${scontoRow}
  <tr><td colspan="2" style="border-top:2px solid #333;padding-top:2px"></td></tr>
  <tr><td class="tot">TOTALE</td><td class="tot" style="text-align:right">&#8364;${totale.toFixed(2)}</td></tr>
</table>
<div class="line"></div>
<div class="nc">Questo non &#232; un documento fiscale</div>
<br/>
<button onclick="window.print();setTimeout(()=>window.close(),500)" style="width:100%;padding:8px;cursor:pointer">
  &#128424; Stampa e chiudi
</button>
<script>window.onload=()=>setTimeout(()=>window.print(),300);<\/script>
</body></html>`;

    const _blob = new Blob([_html], {type:"text/html;charset=utf-8"});
    const _url  = URL.createObjectURL(_blob);
    const _w    = window.open(_url, "_blank", "width=400,height=620");
    if (_w) setTimeout(() => URL.revokeObjectURL(_url), 10000);

    if (stampante) {
      toast(`&#128203; Pre-conto su: ${stampante.nome}`);
    } else {
      toast("&#128203; Pre-conto aperto (nessuna stampante pre-conto configurata)");
    }
  };

  // -- Avanza turno sul monitor ------------------------------------------------
  const avanzaTurno = async () => {
    if (!comanda) return;
    try {
      const token = localStorage.getItem("outlet_token")||"";
      const r = await fetch(`/api/comande/${comanda.id}/avanza-turno`,
        {method:"PATCH", headers:{Authorization:`Bearer ${token}`}});
      if (r.ok) {
        const d = await r.json();
        setTurnoCorrente(d.turno_corrente);
        setComanda(prev=>({...prev, turno_corrente:d.turno_corrente}));
        toast(`✓ Turno ${d.turno_corrente+1} segnalato al monitor`);
      }
    } catch(e) { toast(e.message,"error"); }
  };

  // -- Carica comande chiuse per outlet -------------------------------------------
  const loadComandeChiuse = async () => {
    if (!selOutlet?.id) return;
    setLoadingChiuse(true);
    try {
      const d = await api.getComande(`?outlet_id=${selOutlet.id}&status=chiusa`);
      setComandeChiuse(d);
    } catch(e) { toast(e.message,"error"); }
    finally { setLoadingChiuse(false); }
  };

  // -- Riapri comanda chiusa --------------------------------------------------
  const riapriComanda = async (c) => {
    try {
      const token = localStorage.getItem("outlet_token")||"";
      const r = await fetch(`/api/comande/${c.id}/riapri`, {method:"POST", headers:{Authorization:`Bearer ${token}`}});
      if (!r.ok) { const d=await r.json().catch(()=>({})); toast(d.error||"Errore","error"); return; }
      const fresh = await r.json();
      toast(`✓ Comanda #${c.numero} riaperta`);
      loadComandeChiuse();
      // Optionally load the reopened comanda
      selectComanda(fresh);
      setShowComandeChiuse(false);
    } catch(e) { toast(e.message,"error"); }
  };

  // -- Save new order to backend -------------------------------------------
  const saveCatOrder = async (newList) => {
    try {
      await api.reorderCategorie(newList.map((c,i)=>({id:c.id, ordine:i})));
    } catch(e) { toast("Errore salvataggio ordine categorie","error"); }
  };

  const saveVoceOrder = async (newList) => {
    try {
      await api.reorderVoci(newList.map((v,i)=>({id:v.id, ordine:i})));
    } catch(e) { toast("Errore salvataggio ordine voci","error"); }
  };

  // -- Drag handlers: categorie ------------------------------------------------
  const onCatDragStart = (e, catId) => {
    if(!reorderMode) return;
    setDragSrcCat(catId);
    e.dataTransfer.effectAllowed = "move";
  };
  const onCatDragOver = (e, catId) => {
    if(!reorderMode || !dragSrcCat || dragSrcCat===catId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCat(catId);
  };
  const onCatDrop = (e, targetId) => {
    if(!reorderMode || !dragSrcCat || dragSrcCat===targetId) return;
    e.preventDefault();
    const newList = [...categorie];
    const fromIdx = newList.findIndex(c=>c.id===dragSrcCat);
    const toIdx   = newList.findIndex(c=>c.id===targetId);
    const [moved] = newList.splice(fromIdx, 1);
    newList.splice(toIdx, 0, moved);
    setCategorie(newList);
    setDragSrcCat(null); setDragOverCat(null);
    saveCatOrder(newList);
  };
  const onCatDragEnd = () => { setDragSrcCat(null); setDragOverCat(null); };

  // -- Drag handlers: voci -----------------------------------------------------
  const onVoceDragStart = (e, voceId) => {
    if(!reorderMode) return;
    setDragSrcVoce(voceId);
    e.dataTransfer.effectAllowed = "move";
  };
  const onVoceDragOver = (e, voceId) => {
    if(!reorderMode || !dragSrcVoce || dragSrcVoce===voceId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverVoce(voceId);
  };
  const onVoceDrop = (e, targetId) => {
    if(!reorderMode || !dragSrcVoce || dragSrcVoce===targetId) return;
    e.preventDefault();
    const newList = [...vociCat];
    const fromIdx = newList.findIndex(v=>v.id===dragSrcVoce);
    const toIdx   = newList.findIndex(v=>v.id===targetId);
    const [moved] = newList.splice(fromIdx, 1);
    newList.splice(toIdx, 0, moved);
    setVociCat(newList);
    setDragSrcVoce(null); setDragOverVoce(null);
    saveVoceOrder(newList);
  };
  const onVoceDragEnd = () => { setDragSrcVoce(null); setDragOverVoce(null); };

  const resolvePrezzo = (v) => {
    const ps = v.prezzi_speciali || v.prezzi_spec || [];
    if(!ps.length) return parseFloat(v.prezzo)||0;
    const outletId  = selOutlet?.id       || null;
    const catCId    = selCatCliente?.id   || null;
    // Priority: outlet+cat_cliente > outlet-only > cat_cliente-only > base
    const match =
      ps.find(p => p.outlet_id===outletId && p.categoria_cliente_id===catCId && outletId && catCId) ||
      ps.find(p => p.outlet_id===outletId && !p.categoria_cliente_id && outletId) ||
      ps.find(p => !p.outlet_id && p.categoria_cliente_id===catCId && catCId) ||
      null;
    return match ? parseFloat(match.prezzo_override) : parseFloat(v.prezzo)||0;
  };

  const addItem = async (v) => {
    // Auto-open comanda if none exists
    let activeComanda = comanda;
    if (!activeComanda) {
      try {
        activeComanda = await api.createComanda({
          tavolo_id:      noTavoli ? null : tavolo?.id || null,
          turno_id:       selTurno?.id || null,
          outlet_id:      selOutlet?.id || null,
          cat_cliente_id: selCatCliente?.id || null,
          numero:         cmdNum,
          coperti:        copertiComanda,
          note: "", righe: []
        });
        setComanda(activeComanda);
        setInviatoReparti(false);
        setTurnoPortata(1);
        if (tavolo) api.patchTavolo(tavolo.id, { status:"attesa_ordine", turno_occupato_id:selTurno?.id||null }).catch(()=>{});
        if (selOutlet?.id) fetchNextNum(selOutlet.id);
      } catch(e) { toast(e.message,"error"); return; }
    }
    const prezzo = resolvePrezzo(v);
    setOrder(prev => {
      const ex = prev.find(x => x.voce_id === v.id);
      return ex
        ? prev.map(x => x.voce_id === v.id ? { ...x, qty: x.qty+1 } : x)
        : [...prev, { voce_id:v.id, nome:v.nome_it||v.nome, prezzo, qty:1 }];
    });
    // Auto-save runs in useEffect watching [order, comanda]
  };

  const chgQty = (vid, delta) => {
    setOrder(o => {
      return o.map(x => x.voce_id===vid ? { ...x, qty:Math.max(0, x.qty+delta) } : x).filter(x => x.qty > 0 || x.isSeparatore);
    });
  };

  const total  = order.reduce((s,x) => s + x.prezzo*x.qty, 0);
  const pieces = order.reduce((s,x) => s + x.qty, 0);
  const buildRighe = () => {
    let turno = 0;
    const out = [];
    for (const x of order) {
      if (x.isSeparatore) { turno++; continue; }
      out.push({ voce_id:x.voce_id, nome_snapshot:x.nome,
                 prezzo_snapshot:x.prezzo, quantita:x.qty,
                 note:null, turno_idx:turno });
    }
    return out;
  };

  // -- Invia comanda ------------------------------------------------------------
  const invia = async () => {
    if (!noTavoli && !tavolo) { toast("Seleziona un tavolo","error"); return; }
    if (order.length === 0) { toast("Aggiungi almeno una voce","error"); return; }
    try {
      const righe = buildRighe();
      let savedComanda = comanda;

      if (comanda) {
        // Aggiorna comanda esistente
        savedComanda = await api.updateComanda(comanda.id, { righe, note });
        setComanda(savedComanda);
        toast("Comanda aggiornata ✓");
      } else {
        // Crea nuova comanda con le righe
        savedComanda = await api.createComanda({
          tavolo_id:  tavolo?.id || null,
          turno_id:   selTurno?.id || null,
          outlet_id:  selOutlet?.id || null,
          numero:     cmdNum,
          coperti:    copertiComanda,
          note, righe
        });
        setComanda(savedComanda);
        toast(`✓ Comanda n° ${savedComanda.numero} inviata`);
        if (selOutlet?.id) fetchNextNum(selOutlet.id);
      }

      setInviatoReparti(true);
      setTurnoCorrente(0);
      // Send turno_corrente to backend
      const token2 = localStorage.getItem("outlet_token")||"";
      await fetch(`/api/comande/${savedComanda.id}`,{method:"PATCH",
        headers:{"Content-Type":"application/json",Authorization:`Bearer ${token2}`},
        body:JSON.stringify({inviato_monitor:true,turno_corrente:0})});
      // Aggiorna stato tavolo (solo se presente)
      if (tavolo) {
        const newStatus = righe.length > 0 ? "occupato" : "attesa_ordine";
        await api.patchTavolo(tavolo.id, { status: newStatus, turno_occupato_id:selTurno?.id||null });
      }
      // Refresh lista tavoli (aggiorna badge totale)
      if (selSala?.id) await refreshTavoli(selSala.id);
      // ── Stampa per reparti ──────────────────────────────────────────────
      if (selOutlet?.id && righe.length > 0) {
        try {
          const printGroups = await api.stampaReparti({
            outlet_id: selOutlet.id,
            contesto:  "reparto_produzione",
            righe: righe.map(r => ({
              voce_id: r.voce_id,
              nome:    r.nome_snapshot,
              qty:     r.quantita,
              prezzo:  r.prezzo_snapshot,
              note:    r.note||"",
            })),
          });
          if (printGroups && printGroups.length > 0) {
            printGroups.forEach(group => stampaComandaReparto(group, savedComanda));
            toast(`✓ Stampa inviata a ${printGroups.length} stampante${printGroups.length>1?"e":""}`);
          } else {
            toast("Comanda aggiornata ✓ (nessuna stampante configurata per questo outlet)");
          }
        } catch(pe) {
          toast("Comanda salvata ma errore stampa: "+pe.message, "error");
        }
      }
    } catch(e) { toast(e.message,"error"); }
  };

  // -- Annulla comanda ----------------------------------------------------------
  const annullaComanda = async (motivo) => {
    if (!comanda) return;
    try {
      const token = localStorage.getItem("outlet_token")||"";
      const r = await fetch(`/api/comande/${comanda.id}`, {
        method:"DELETE",
        headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body: JSON.stringify({ motivo }),
      });
      if (!r.ok) { const d = await r.json().catch(()=>({})); toast(d.error||"Errore annullamento","error"); return; }
      if (tavolo) await api.patchTavolo(tavolo.id, { status:"disponibile", coperti_attuali:0, turno_occupato_id:null });
      if (selSala?.id) await refreshTavoli(selSala.id);
      setComanda(null); setOrder([]); setNote(""); setInviatoReparti(false); setTurnoPortata(1);
      setComandeAperte(prev=>prev.filter(c=>c.id!==comanda.id));
      if (selOutlet?.id) fetchNextNum(selOutlet.id);
      toast("Comanda annullata");
    } catch(e){ toast(e.message,"error"); }
  };

  // -- Chiudi conto -------------------------------------------------------------
  const chiudi = async () => {
    if (!comanda) { toast("Nessuna comanda aperta","error"); return; }
    try {
      await api.chiudiComanda(comanda.id, tipo);
      setOrder([]); setComanda(null); setNote("");
      await api.patchTavolo(tavolo.id, { status:"disponibile", coperti_attuali:0, turno_occupato_id:null });
      await refreshTavoli(selSala.id);
      toast("Conto chiuso ✓");
    } catch(e) { toast(e.message,"error"); }
  };

  // -- Paginate ------------------------------------------------------------------
  const catSlice  = reorderMode ? categorie : categorie.slice(catPage*CAT_PER_PAGE,  (catPage+1)*CAT_PER_PAGE);
  const vociSlice = reorderMode ? vociCat : vociCat.slice(vociPage*VOCI_PER_PAGE, (vociPage+1)*VOCI_PER_PAGE);
  const catTotalPages  = Math.ceil(categorie.length / CAT_PER_PAGE);
  const vociTotalPages = Math.ceil(vociCat.length  / VOCI_PER_PAGE);

  const cameriere = tavolo?.cameriere || "Non assegnato";

  // -- Rapid selection handler ---------------------------------------------
  const handleSelRapida = (type, item, tav) => {
    setShowSelRapida(false);
    if(type==="tavolo") {
      handleChangeTavolo(item.id);
    } else if(type==="comanda") {
      // Select the tavolo of this comanda
      if(tav) handleChangeTavolo(tav.id);
    }
  };

  const toolbar = [
    {icon:"fa-light fa-clipboard-list",label:"Note",             action:()=>setShowNote(true)},
    {icon:"fa-light fa-wine-glass",label:"Carta vini",       action:()=>{}},
    {icon:"fa-light fa-taxi",label:"Taxi",             action:()=>{}},
    {icon:"fa-light fa-lock",label:"Chiudi cassa",     action:()=>setShowChiudi(true)},
    {icon:"fa-light fa-hotel",label:"Conto camera",     action:()=>{setTipo("conto_camera");setShowChiudi(true);}},
    {icon:"fa-light fa-scissors", label:"Dividi conto",    action:()=>{}},
    {icon:"fa-light fa-file-lines",label:"Emetti fattura",   action:()=>{setTipo("fattura");setShowChiudi(true);}},
    {icon:"fa-light fa-print",label:"Emetti scontrino", action:()=>{setTipo("scontrino");setShowChiudi(true);}},
  ];

  const tavoloColor = s => ({
    disponibile:"#A9AAAD", attesa_ordine:"#5C9CD4",
    occupato:"#FF616E",    riservato:NAVY, chiesto_conto:"#F57D03"
  }[s]||"#A9AAAD");

  const chiudiOptions = [
    {icon:"fa-light fa-print", label:"Scontrino",    action:()=>{setTipo("scontrino");   setShowChiudi(true);}},
    {icon:"fa-light fa-credit-card",  label:"POS / Carta",  action:()=>{setTipo("pos");          setShowChiudi(true);}},
    {icon:"fa-light fa-money-bill",  label:"Contanti",     action:()=>{setTipo("contanti");     setShowChiudi(true);}},
    {icon:"fa-light fa-hotel",  label:"Camera",       action:()=>{setTipo("conto_camera"); setShowChiudi(true);}},
    {icon:"fa-light fa-file-lines",  label:"Fattura",      action:()=>{setTipo("fattura");      setShowChiudi(true);}},
    {icon:"fa-light fa-lock",  label:"Chiudi cassa", action:()=>setShowChiudi(true)},
  ];

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",overflow:"hidden",
      background:"white",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"}}>
      <ToastEl/>

      {/* ── HEADER ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        borderBottom:"1px solid #e5e7eb",background:"white",padding:"10px 16px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {/* Outlet */}
          <select value={selOutlet?.id||""} onChange={e=>{
            const o=outlets.find(x=>x.id===parseInt(e.target.value));
            setSelOutlet(o);setSelSala(null);setSelTavId(null);
          }} style={{border:"1px solid #d1d5db",borderRadius:6,padding:"4px 8px",
            fontSize:13,fontWeight:600,color:"#374151",background:"white",cursor:"pointer",outline:"none"}}>
            {outlets.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
          <h1 style={{fontSize:16,fontWeight:600,color:"#1f2937",margin:0}}>
            {selOutlet?.nome||"Gestione Sala"}
          </h1>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <p style={{fontSize:13,color:"#6b7280",margin:0}}>
            <span>Cameriere: </span>
            <strong style={{color:"#374151"}}>{cameriere||"—"}</strong>
          </p>
          <button onClick={()=>onGoToSala&&onGoToSala(selSala,selOutlet)}
            style={{padding:"5px 12px",borderRadius:6,border:"1px solid #2d5a7b",
              background:"transparent",color:"#2d5a7b",cursor:"pointer",fontSize:12,fontWeight:600}}>
            ← Sala
          </button>
        </div>
      </div>

      {/* ── TABS BAR ── */}
      <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:8,
        borderBottom:"1px solid #e5e7eb",background:"#f9fafb",padding:"8px 16px",flexShrink:0}}>
        {/* Sale tabs */}
        {sale.map(s=>(
          <button key={s.id} onClick={()=>{setSelSala(s);setSelTavId(null);}}
            style={{borderRadius:6,padding:"5px 14px",fontSize:13,cursor:"pointer",fontWeight:500,
              background:selSala?.id===s.id?"#2d5a7b":"white",
              color:selSala?.id===s.id?"white":"#374151",
              border:selSala?.id===s.id?"none":"1px solid #d1d5db",
              transition:"all .15s"}}>
            {s.nome}
          </button>
        ))}
        <div style={{width:1,height:20,background:"#d1d5db",margin:"0 4px"}}/>
        {/* Turno */}
        <div style={{fontSize:13,color:"#374151",display:"flex",alignItems:"center",gap:5}}>
          <span style={{color:"#6b7280"}}>Turno</span>
          <select value={selTurno?.id||""} onChange={e=>{const t=turni.find(x=>x.id===parseInt(e.target.value));setSelTurno(t);}}
            style={{border:"1px solid #d1d5db",borderRadius:5,padding:"2px 6px",fontSize:13,fontWeight:600,color:"#374151",background:"white",cursor:"pointer",outline:"none"}}>
            <option value="">—</option>
            {turni.map(t=><option key={t.id} value={t.id}>{t.nome.replace("Turno ","")}</option>)}
          </select>
        </div>
        {/* Lista comande chiuse button */}
        <button onClick={()=>{ loadComandeChiuse(); setShowComandeChiuse(true); }}
          title="Visualizza e riapri comande chiuse"
          style={{height:28,padding:"0 10px",borderRadius:5,border:"1px solid #d1d5db",
            background:"white",color:"#6b7280",cursor:"pointer",fontSize:11,fontWeight:600,
            display:"flex",alignItems:"center",gap:4}}>
          <i className="fa-light fa-box-archive"/> Archivio
        </button>
        {/* Comanda n° - selezionabile se più comande aperte */}
        <div style={{fontSize:13,color:"#374151",display:"flex",alignItems:"center",gap:5}}>
          <span style={{color:"#6b7280",fontSize:12,fontWeight:600}}>Comanda</span>
          {comandeAperte.length > 1 ? (
            <select value={comanda?.id||""} onChange={e=>{
              const c=comandeAperte.find(x=>x.id===parseInt(e.target.value));
              if(c) selectComanda(c);
            }} style={{border:"1px solid #86efac",borderRadius:5,padding:"2px 6px",fontSize:12,fontWeight:700,
              color:"#16a34a",background:"#dcfce7",cursor:"pointer",outline:"none"}}>
              {comandeAperte.map(c=><option key={c.id} value={c.id}>#{c.numero}</option>)}
            </select>
          ) : (
            <span style={{fontWeight:700,background:comanda?"#dcfce7":"#f3f4f6",
              padding:"2px 10px",borderRadius:5,color:comanda?"#16a34a":"#374151",
              border:"1px solid "+(comanda?"#86efac":"#e5e7eb"),cursor:comandeAperte.length?"pointer":"default"}}
              onClick={()=>{ if(comandeAperte.length===1&&!comanda) selectComanda(comandeAperte[0]); }}>
              {comanda?"#"+comanda.numero:cmdNum}
            </span>
          )}
        </div>
        {/* Categoria Cliente → prezzo differenziato */}
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <span style={{color:"#6b7280",fontSize:12,fontWeight:600}}>Ospite</span>
          <select value={selCatCliente?.id||""} onChange={e=>{
            const c=catClienti.find(x=>x.id===parseInt(e.target.value));
            setSelCatCliente(c||null);
          }} style={{border:"1px solid #d1d5db",borderRadius:5,padding:"2px 6px",fontSize:12,color:"#374151",background:"white",cursor:"pointer",outline:"none",maxWidth:120}}>
            <option value="">Standard</option>
            {catClienti.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        {/* Tavolo — nascosto per outlet senza sale/tavoli */}
        {!noTavoli&&<div style={{fontSize:13,color:"#374151",display:"flex",alignItems:"center",gap:5}}>
          <span style={{color:"#6b7280"}}>Tavolo n°</span>
          <select value={selTavId||""} onChange={e=>handleChangeTavolo(parseInt(e.target.value))}
            style={{border:"1px solid #d1d5db",borderRadius:5,padding:"2px 6px",fontSize:13,fontWeight:600,
              color:"#374151",background:"white",cursor:"pointer",outline:"none",minWidth:80}}>
            <option value="">—</option>
            {(comanda ? tavoli : tavoli.filter(t=>t.status==="disponibile")).map(t=>(
              <option key={t.id} value={t.id}>
                {t.numero}{t.status==="occupato"?" ●":t.status==="attesa_ordine"?" ◌":t.status==="riservato"?" ⬥":""}{t.totale_oggi>0?` €${t.totale_oggi.toFixed(2)}`:""}</option>
            ))}
          </select>
        </div>}
        {/* Pax — tablet-friendly big buttons */}
        <div style={{display:"flex",alignItems:"center",gap:3}}>
          <span style={{color:"#6b7280",fontSize:12,fontWeight:600,marginRight:2}}>Pax</span>
          <button onClick={()=>setCopertiComanda(n=>Math.max(1,n-1))}
            style={{width:32,height:32,borderRadius:8,border:"1.5px solid #d1d5db",
              background:"white",cursor:"pointer",fontSize:20,fontWeight:700,color:"#374151",
              display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
              lineHeight:1,userSelect:"none",WebkitUserSelect:"none"}}>
            −
          </button>
          <span style={{minWidth:28,textAlign:"center",fontSize:16,fontWeight:900,color:"#374151",
            background:"#f3f4f6",borderRadius:6,padding:"3px 6px",border:"1px solid #e5e7eb"}}>
            {copertiComanda}
          </span>
          <button onClick={()=>setCopertiComanda(n=>n+1)}
            style={{width:32,height:32,borderRadius:8,border:"1.5px solid #d1d5db",
              background:"white",cursor:"pointer",fontSize:20,fontWeight:700,color:"#374151",
              display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
              lineHeight:1,userSelect:"none",WebkitUserSelect:"none"}}>
            +
          </button>
        </div>
        {/* Selezione rapida — sempre visibile */}
        <button onClick={()=>setShowSelRapida(true)} title="Selezione rapida (Tavoli / Turni / Comande)"
          style={{width:28,height:28,borderRadius:6,border:"1px solid #d1d5db",
            background:"white",color:"#6b7280",cursor:"pointer",fontSize:14,
            display:"flex",alignItems:"center",justifyContent:"center"}}>
          <i className="fa-light fa-bolt"/>
        </button>
        {/* Apri comanda — sempre visibile, crea nuova comanda aggiuntiva */}
        <button onClick={apriComanda} disabled={!noTavoli&&!tavolo}
          title={comanda?"Apri una nuova comanda aggiuntiva":noTavoli?"Apri comanda":"Apri comanda per questo tavolo"}
          style={{padding:"5px 14px",borderRadius:6,border:"none",fontSize:13,fontWeight:600,
            background:tavolo||noTavoli?"#2d5a7b":"#e5e7eb",color:tavolo||noTavoli?"white":"#9ca3af",
            cursor:tavolo||noTavoli?"pointer":"not-allowed",whiteSpace:"nowrap"}}>
          + {comanda?"Nuova comanda":"Apri comanda"}
        </button>
      </div>

      {/* ── MAIN BODY ── */}
      <div style={{display:"flex",flex:1,gap:16,overflow:"hidden",padding:16}}>

        {/* LEFT: categorie + voci */}
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:12,overflow:"hidden",minWidth:0}}>

          {/* Categorie */}
          <div style={{flexShrink:0}}>
            {/* Label + toggle riordino */}
            <div style={{display:"flex",alignItems:"center",marginBottom:6}}>
              <span style={{fontSize:11,fontWeight:700,color:"#6b7280",
                textTransform:"uppercase",letterSpacing:.6}}>Categorie</span>
              <button onClick={()=>setReorderMode(r=>!r)}
                title={reorderMode?"Esci dalla modalità riordino":"Trascina i tasti per riordinarli"}
                style={{marginLeft:"auto",padding:"2px 10px",borderRadius:5,fontSize:10,fontWeight:700,
                  cursor:"pointer",transition:"all .15s",
                  border:"1.5px solid "+(reorderMode?"#f59e0b":"#d1d5db"),
                  background:reorderMode?"#fffbeb":"white",
                  color:reorderMode?"#92400e":"#6b7280"}}>
                {reorderMode?"✓ Fine riordino":"⇅ Riordina"}
              </button>
            </div>
            <div style={{position:"relative",border:"1px solid "+(reorderMode?"#fde68a":"#e5e7eb"),
              background:reorderMode?"#fffbeb":"#f9fafb",borderRadius:8,
              padding:reorderMode?"8px":"8px 36px",transition:"background .2s,border-color .2s",
              maxHeight:reorderMode?"240px":"auto",overflowY:reorderMode?"auto":"visible"}}>
            {!reorderMode&&catPage>0&&(
              <button onClick={()=>setCatPage(p=>p-1)}
                style={{position:"absolute",left:6,top:"50%",transform:"translateY(-50%)",
                  background:"white",border:"1px solid #e5e7eb",borderRadius:6,
                  padding:4,cursor:"pointer",boxShadow:"0 1px 4px rgba(0,0,0,.08)",
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                <ChevronLeft size={18}/>
              </button>
            )}
            {!reorderMode&&catPage<Math.ceil(categorie.length/CAT_PER_PAGE)-1&&(
              <button onClick={()=>setCatPage(p=>p+1)}
                style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",
                  background:"white",border:"1px solid #e5e7eb",borderRadius:6,
                  padding:4,cursor:"pointer",boxShadow:"0 1px 4px rgba(0,0,0,.08)",
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                <ChevronRight size={18}/>
              </button>
            )}
            <div style={{display:"grid",
              gridTemplateColumns:"repeat(5,1fr)",
              gap:6}}>
              {catSlice.map(cat=>{
                const isA = selCat?.id===cat.id;
                const col  = cat.colore||"#a78bfa";
                return (
                  <button key={cat.id}
                    draggable={reorderMode}
                    onDragStart={e=>onCatDragStart(e,cat.id)}
                    onDragOver={e=>onCatDragOver(e,cat.id)}
                    onDrop={e=>onCatDrop(e,cat.id)}
                    onDragEnd={onCatDragEnd}
                    onClick={()=>{ if(!reorderMode) loadVoci(cat); }}
                    style={{position:"relative",height:60,borderRadius:8,
                      border:"2px solid "+(dragOverCat===cat.id?"#f59e0b":isA?"#2d5a7b":"#d1d5db"),
                      background:isA?cat.colore||"#ddd6fe":cat.colore||"#ddd6fe",
                      cursor:reorderMode?"grab":"pointer",overflow:"hidden",
                      transition:"transform .15s, opacity .15s, border-color .1s",
                      boxShadow:dragOverCat===cat.id?"0 0 0 3px #f59e0b44":isA?"0 0 0 3px rgba(45,90,123,.25)":"none",
                      opacity:dragSrcCat===cat.id?0.4:1,touchAction:reorderMode?"none":"auto"}}
                    onMouseEnter={e=>{if(!reorderMode)e.currentTarget.style.transform="scale(1.04)";}}
                    onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
                    {reorderMode&&(
                      <div style={{position:"absolute",top:4,right:4,fontSize:11,color:"rgba(0,0,0,.4)",pointerEvents:"none",userSelect:"none"}}>⠿</div>
                    )}
                    <span style={{fontSize:12,fontWeight:700,color:"#1f2937",textAlign:"center",
                      padding:"0 8px",wordBreak:"break-word",lineHeight:1.3}}>
                      {cat.nome}
                    </span>
                    {cat.emoji&&(
                      <span style={{position:"absolute",bottom:6,right:8,fontSize:18,opacity:.6}}>{cat.emoji}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          </div>

          {/* Voci / piatti */}
          <div style={{position:"relative",flex:1,overflow:"hidden",border:"1px solid #e5e7eb",
            background:"#f9fafb",borderRadius:8,padding:"10px 36px"}}>
            {vociPage>0&&(
              <button onClick={()=>setVociPage(p=>p-1)}
                style={{position:"absolute",left:6,top:"50%",transform:"translateY(-50%)",
                  background:"white",border:"1px solid #e5e7eb",borderRadius:6,
                  padding:4,cursor:"pointer",boxShadow:"0 1px 4px rgba(0,0,0,.08)",
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                <ChevronLeft size={18}/>
              </button>
            )}
            {vociPage<Math.ceil(vociCat.length/VOCI_PER_PAGE)-1&&(
              <button onClick={()=>setVociPage(p=>p+1)}
                style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",
                  background:"white",border:"1px solid #e5e7eb",borderRadius:6,
                  padding:4,cursor:"pointer",boxShadow:"0 1px 4px rgba(0,0,0,.08)",
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                <ChevronRight size={18}/>
              </button>
            )}
            <div style={{height:reorderMode?"auto":"100%",maxHeight:reorderMode?"none":"100%",overflowY:reorderMode?"visible":"auto",display:"grid",
              gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10,alignContent:"start",padding:reorderMode?"0 0 12px":"0"}}>
              {!selCat?(
                <div style={{gridColumn:"1/-1",display:"flex",alignItems:"center",
                  justifyContent:"center",height:120,color:"#9ca3af",fontSize:13}}>
                  Seleziona una categoria
                </div>
              ):vociSlice.length===0?(
                <div style={{gridColumn:"1/-1",display:"flex",alignItems:"center",
                  justifyContent:"center",height:120,color:"#9ca3af",fontSize:13}}>
                  Nessuna voce
                </div>
              ):vociSlice.map(v=>(
                <button key={v.id}
                  draggable={reorderMode}
                  onDragStart={e=>onVoceDragStart(e,v.id)}
                  onDragOver={e=>onVoceDragOver(e,v.id)}
                  onDrop={e=>onVoceDrop(e,v.id)}
                  onDragEnd={onVoceDragEnd}
                  onClick={()=>{ if(!reorderMode && (comanda||tavolo||noTavoli)) addItem(v); }}
                  disabled={!reorderMode && !comanda && !tavolo && !noTavoli}
                  style={{minHeight:88,borderRadius:8,
                    border:"1.5px solid "+(dragOverVoce===v.id?"#f59e0b":"#d1d5db"),
                    background:reorderMode?"#fafafa":"linear-gradient(135deg,white,#f0fdfa)",
                    cursor:reorderMode?"grab":comanda||tavolo||noTavoli?"pointer":"not-allowed",
                    position:"relative",display:"flex",flexDirection:"column",alignItems:"center",
                    justifyContent:"space-between",padding:"10px 8px",
                    transition:"all .15s",
                    opacity:dragSrcVoce===v.id?0.4:reorderMode?1:comanda||tavolo||noTavoli?1:.5,
                    boxShadow:dragOverVoce===v.id?"0 0 0 3px #f59e0b44":"none",touchAction:reorderMode?"none":"auto"}}
                  onMouseEnter={e=>{if(!reorderMode&&(comanda||tavolo||noTavoli)){e.currentTarget.style.borderColor="#2d5a7b";e.currentTarget.style.boxShadow="0 2px 8px rgba(45,90,123,.2)";e.currentTarget.style.transform="scale(1.03)";}}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=dragOverVoce===v.id?"#f59e0b":"#d1d5db";e.currentTarget.style.boxShadow=dragOverVoce===v.id?"0 0 0 3px #f59e0b44":"none";e.currentTarget.style.transform="scale(1)";}}>
                  {reorderMode&&(
                    <div style={{position:"absolute",top:4,right:4,fontSize:11,color:"rgba(0,0,0,.3)",pointerEvents:"none",userSelect:"none"}}>⠿</div>
                  )}
                  <span style={{fontSize:12,fontWeight:600,color:"#374151",textAlign:"center",
                    lineHeight:1.4,wordBreak:"break-word",width:"100%"}}>
                    {v.nome_it||v.nome}
                  </span>
                  <span style={{fontSize:13,fontWeight:700,color:"#059669",flexShrink:0}}>
                    €{parseFloat(v.prezzo||0).toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Sidebar comanda */}
        <div style={{width:360,display:"flex",flexDirection:"column",gap:10,overflow:"hidden"}}>

          {/* Sezione comanda header */}
          {/* Sezione comanda header — redesigned */}
          <div style={{borderRadius:8,background:"#2d5a7b",padding:"10px 16px",flexShrink:0}}>
            {/* Row 1: Tavolo grande + n. comanda */}
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:4}}>
              <div>
                <div style={{fontSize:26,fontWeight:900,color:"white",lineHeight:1,letterSpacing:1,fontFamily:"'Poppins',sans-serif"}}>
                  {tavolo?`T.${tavolo.numero}`:(noTavoli?"Asporto":"—")}
                </div>
                {tavolo&&(
                  <div style={{fontSize:12,color:"rgba(255,255,255,.65)",marginTop:3}}>
                    {tavolo.capienza} posti disponibili
                  </div>
                )}
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{color:"rgba(255,255,255,.85)",fontSize:12,fontWeight:700}}>
                  {comanda?`#${comanda.numero}`:"—"}
                </div>
                <div style={{color:"rgba(255,255,255,.5)",fontSize:10,marginTop:2}}>
                  {comanda?.created_at?new Date(comanda.created_at).toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"}):""}
                </div>
              </div>
            </div>
            {/* Row 2: nominativo prenotante + pax occupati */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
              borderTop:"1px solid rgba(255,255,255,.2)",paddingTop:5,marginTop:5}}>
              <div style={{fontSize:11,color:"rgba(255,255,255,.75)",fontStyle:(tavolo?.nome_pren||comanda?.nome_pren)?"normal":"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:190}}>
                {(tavolo?.nome_pren||comanda?.nome_pren)?`${tavolo?.nome_pren||comanda?.nome_pren}`:"Nessun nominativo"}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0,
                background:"rgba(255,255,255,.18)",borderRadius:6,padding:"2px 10px"}}>
                <span style={{fontSize:14}}><i className="fa-light fa-users"/></span>
                <span style={{fontSize:16,fontWeight:900,color:"white"}}>{copertiComanda}</span>
                <span style={{fontSize:10,color:"rgba(255,255,255,.6)"}}>pax</span>
              </div>
            </div>
          </div>
          {/* Note allergie */}
          {note&&(
            <div style={{borderRadius:8,border:"1px solid #fca5a5",background:"#fef2f2",
              padding:"10px 14px",flexShrink:0}}>
              <p style={{fontSize:12,fontWeight:700,color:"#991b1b",marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>NOTE</p>
              <div style={{fontSize:12,color:"#b91c1c",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{note}</div>
            </div>
          )}

          {/* Order items - scrollable */}
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:10,overflowY:"auto",minHeight:0}}>

            {/* Active comanda */}
            {order.length>0&&(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{borderRadius:8,border:"2px solid #2d5a7b",background:"white",overflow:"hidden"}}>
                  {/* Drop zone for TURNO 0 — before any separator */}
                  {order.some(x=>x.isSeparatore)&&dragItemIdx!==null&&(
                    <div
                      onDragOver={e=>{e.preventDefault();setDragOverSep(-1);}}
                      onDragLeave={()=>setDragOverSep(null)}
                      onDrop={e=>{
                        e.preventDefault();
                        if(dragItemIdx===null) return;
                        setOrder(prev=>{
                          const next=[...prev];
                          const [moved]=next.splice(dragItemIdx,1);
                          // Insert at position 0 (before everything)
                          next.unshift(moved);
                          if(comanda){
                            let t=0; const righe=[];
                            for(const x of next){ if(x.isSeparatore){t++;continue;} righe.push({voce_id:x.voce_id,nome_snapshot:x.nome,prezzo_snapshot:x.prezzo,quantita:x.qty,turno_idx:t}); }
                            api.updateComanda(comanda.id,{righe,note}).catch(()=>{});
                          }
                          return next;
                        });
                        setDragItemIdx(null); setDragOverSep(null);
                      }}
                      style={{
                        height:dragOverSep===-1?32:8, transition:"height .15s",
                        background:dragOverSep===-1?"#fffbeb":"transparent",
                        borderBottom:dragOverSep===-1?"2px dashed #f59e0b":"none",
                        display:"flex",alignItems:"center",justifyContent:"center",
                      }}>
                      {dragOverSep===-1&&<span style={{fontSize:10,fontWeight:700,color:"#92400e"}}><i className="fa-light fa-arrow-up"/> Sposta a Turno 1</span>}
                    </div>
                  )}
                  {order.map((item, idx)=>(
                    item.isSeparatore ? (
                      <div key={item.voce_id}
                        onDragOver={e=>{if(dragItemIdx!==null){e.preventDefault();setDragOverSep(idx);}}}
                        onDragLeave={()=>setDragOverSep(null)}
                        onDrop={e=>{
                          e.preventDefault();
                          if(dragItemIdx===null||dragItemIdx===idx) return;
                          setOrder(prev=>{
                            const next=[...prev];
                            const [moved]=next.splice(dragItemIdx,1);
                            const targetIdx=idx-(dragItemIdx<idx?1:0);
                            next.splice(targetIdx+1,0,moved);
                            // Auto-save with correct turno_idx
                            if(comanda){
                              let t=0; const righe=[];
                              for(const x of next){ if(x.isSeparatore){t++;continue;} righe.push({voce_id:x.voce_id,nome_snapshot:x.nome,prezzo_snapshot:x.prezzo,quantita:x.qty,turno_idx:t}); }
                              api.updateComanda(comanda.id,{righe,note}).catch(()=>{});
                            }
                            return next;
                          });
                          setDragItemIdx(null); setDragOverSep(null);
                        }}
                        style={{display:"flex",alignItems:"center",gap:8,padding:"4px 12px",
                          transition:"all .15s",
                          background:dragOverSep===idx?"#fffbeb":"transparent",
                          borderRadius:4,
                          outline:dragOverSep===idx?"2px dashed #f59e0b":"none"}}>
                        <div style={{flex:1,borderTop:`2px dashed ${dragOverSep===idx?"#f59e0b":"#d1d5db"}`}}/>
                        <span style={{fontSize:10,color:dragOverSep===idx?"#92400e":"#9ca3af",fontWeight:600,whiteSpace:"nowrap"}}>{item.nome}</span>
                        <div style={{flex:1,borderTop:`2px dashed ${dragOverSep===idx?"#f59e0b":"#d1d5db"}`}}/>
                        <button onClick={()=>setOrder(o=>o.filter((_,i)=>i!==idx))}
                          style={{border:"none",background:"transparent",cursor:"pointer",color:"#9ca3af",padding:2,lineHeight:1}}>
                          ×
                        </button>
                      </div>
                    ) : (()=>{
                      const isClosed = closedItems.includes(item.voce_id);
                      return (
                    <div key={item.voce_id}
                      draggable={!isClosed}
                      onDragStart={()=>setDragItemIdx(idx)}
                      onDragEnd={()=>{setDragItemIdx(null);setDragOverSep(null);}}
                      style={{display:"flex",alignItems:"center",gap:8,
                        padding:"10px 12px",borderBottom:"1px solid #f3f4f6",
                        transition:"background .1s",
                        opacity:dragItemIdx===idx?0.4:isClosed?0.45:1,
                        background:isClosed?"#f9fafb":"white",
                        cursor:isClosed?"default":dragItemIdx===null?"grab":"grabbing",
                        pointerEvents:isClosed?"none":"auto"}}
                      onMouseEnter={e=>{if(!isClosed)e.currentTarget.style.background="#f9fafb";}}
                      onMouseLeave={e=>{if(!isClosed)e.currentTarget.style.background=isClosed?"#f9fafb":"white";}}>
                      {!isClosed&&<span title="Trascina per cambiare turno" style={{color:"#d1d5db",fontSize:11,flexShrink:0,cursor:"grab",userSelect:"none",paddingRight:2}}>⠿</span>}
                      {isClosed&&<span style={{position:"absolute",left:12,fontSize:9,color:"#16a34a",fontWeight:700,textTransform:"uppercase",letterSpacing:.5}}>✓ chiuso</span>}
                      {/* Qty controls */}
                      <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                        <button onClick={()=>chgQty(item.voce_id,-1)}
                          style={{width:24,height:24,borderRadius:"50%",border:"none",
                            background:"#2d5a7b",color:"white",cursor:"pointer",
                            display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <Minus size={12}/>
                        </button>
                        <span style={{width:24,textAlign:"center",fontSize:14,fontWeight:700,color:"#1f2937"}}>
                          {item.qty}
                        </span>
                        <button onClick={()=>chgQty(item.voce_id,1)}
                          style={{width:24,height:24,borderRadius:"50%",border:"none",
                            background:"#2d5a7b",color:"white",cursor:"pointer",
                            display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <Plus size={12}/>
                        </button>
                      </div>
                      {/* Nome */}
                      <div style={{flex:1,fontSize:13,color:"#374151",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {item.nome}
                      </div>
                      {/* Prezzo */}
                      <div style={{fontSize:13,fontWeight:600,color:"#374151",flexShrink:0}}>
                        {(item.prezzo*item.qty).toFixed(2)}€
                      </div>
                      {/* Actions */}
                      <div style={{display:"flex",gap:2,flexShrink:0}}>
                        <button onClick={()=>chgQty(item.voce_id,-item.qty)}
                          style={{padding:4,borderRadius:4,border:"none",background:"transparent",
                            cursor:"pointer",color:"#9ca3af"}}
                          onMouseEnter={e=>e.currentTarget.style.background="#fee2e2"}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </div>
                      );
                    })()
                  ))}
                </div>

                {/* Totali */}
                {(()=>{
                  const totGross   = order.filter(x=>!x.isSeparatore).reduce((s,x)=>s+x.prezzo*x.qty,0);
                  const totClosed  = order.filter(x=>!x.isSeparatore&&closedItems.includes(x.voce_id)).reduce((s,x)=>s+x.prezzo*x.qty,0);
                  const totParti   = partiChiuse.filter(p=>p._dividi).reduce((s,p)=>s+p.importo,0);
                  const totPaid    = totClosed + totParti;
                  const totDovuto  = Math.max(0, totGross - totPaid);
                  return (
                <div style={{borderRadius:8,background:"#f3f4f6",padding:"12px 14px"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div>
                      <p style={{fontSize:15,fontWeight:600,color:"#1f2937",margin:0}}>Totali</p>
                      <p style={{fontSize:12,color:"#6b7280",margin:"3px 0 0"}}>
                        Pezzi: {order.filter(x=>!x.isSeparatore).reduce((s,x)=>s+x.qty,0)}
                      </p>
                      {totPaid>0&&<p style={{fontSize:11,color:"#16a34a",margin:"2px 0 0"}}>
                        ✓ Già incassato: €{totPaid.toFixed(2)}
                        {partiChiuse.filter(p=>p._dividi).length>0&&<span style={{color:"#9ca3af"}}> ({partiChiuse.filter(p=>p._dividi).length} parti)</span>}
                      </p>}
                    </div>
                    <div style={{textAlign:"right"}}>
                      {totPaid>0&&<p style={{fontSize:11,color:"#9ca3af",margin:"0 0 2px",textDecoration:"line-through"}}>
                        €{totGross.toFixed(2)}
                      </p>}
                      <p style={{fontSize:11,color:"#6b7280",margin:0}}>Da pagare:</p>
                      <p style={{fontSize:22,fontWeight:700,color:"#1f2937",margin:0}}>
                        {totDovuto.toFixed(2)} €
                      </p>
                    </div>
                  </div>
                </div>
                  );
                })()}

                {/* Invia comanda + Vai a successivo */}
                {(()=>{
                  const numTurni = order.filter(x=>x.isSeparatore).length;
                  const canAdvance = inviatoReparti && comanda && turnoCorrente < numTurni;
                  const canInvia = order.filter(x=>!x.isSeparatore).length>0&&(tavolo||noTavoli);
                  return (
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      <button onClick={invia} disabled={!canInvia}
                        style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                          borderRadius:8,border:"none",
                          background:canInvia?"#2d5a7b":"#e5e7eb",
                          color:canInvia?"white":"#9ca3af",
                          cursor:canInvia?"pointer":"not-allowed",
                          padding:"11px 0",fontSize:15,fontWeight:600,transition:"background .15s"}}
                        onMouseEnter={e=>{if(canInvia)e.currentTarget.style.background="#1e3a52";}}
                        onMouseLeave={e=>{if(canInvia)e.currentTarget.style.background="#2d5a7b";}}>
                        <Send size={15}/>
                        {inviatoReparti?"Aggiorna comanda":"Invia comanda in cucina"}
                      </button>
                      {inviatoReparti&&comanda&&(
                        <button onClick={avanzaTurno} disabled={!canAdvance}
                          style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                            borderRadius:8,border:`2px solid ${canAdvance?"#f59e0b":"#e5e7eb"}`,
                            background:canAdvance?"#fffbeb":"#f9fafb",
                            color:canAdvance?"#92400e":"#9ca3af",
                            cursor:canAdvance?"pointer":"not-allowed",
                            padding:"9px 0",fontSize:13,fontWeight:700,transition:"all .15s"}}
                          onMouseEnter={e=>{if(canAdvance)e.currentTarget.style.background="#fef3c7";}}
                          onMouseLeave={e=>{if(canAdvance)e.currentTarget.style.background=canAdvance?"#fffbeb":"#f9fafb";}}>
                          <i className="fa-light fa-bell"/> {canAdvance?`Chiama Turno ${turnoCorrente+2}`:"✓ Tutti i turni chiamati"}
                        </button>
                      )}
                      {inviatoReparti&&comanda&&numTurni>0&&(
                        <div style={{textAlign:"center",fontSize:10,color:"#92400e",
                          background:"#fffbeb",border:"1px solid #fde68a",borderRadius:6,padding:"3px 8px"}}>
                          <i className="fa-light fa-bell"/> Monitor: Turno {turnoCorrente+1}/{numTurni+1}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Empty state */}
            {order.length===0&&(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                flex:1,gap:8,color:"#9ca3af",minHeight:100}}>
                <div style={{fontSize:36,opacity:.3}}><i className="fa-light fa-cart-shopping"/></div>
                <div style={{fontSize:12}}>Nessuna voce aggiunta</div>
              </div>
            )}
          </div>

          {/* Bottom: azione comanda — riga unica su tutta la larghezza */}
          <div style={{flexShrink:0,display:"flex",flexDirection:"column",gap:6}}>
            {/* Note + Annulla — compact top row */}
            <div style={{display:"flex",gap:5}}>
              <button onClick={()=>setShowNote(true)}
                style={{flex:1,padding:"5px 8px",borderRadius:6,border:"1px solid #e5e7eb",
                  background:"white",color:"#6b7280",cursor:"pointer",fontSize:10,fontWeight:600,
                  display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                <i className="fa-light fa-pen-to-square"/> Note
              </button>
              {comanda&&(
                <button onClick={()=>setShowAnnulla(true)}
                  style={{flex:1,padding:"5px 8px",borderRadius:6,border:"1px solid #fca5a5",
                    background:"#fef2f2",color:"#dc2626",cursor:"pointer",fontSize:10,fontWeight:600,
                    display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                  <i className="fa-light fa-xmark"/> Annulla
                </button>
              )}
            </div>
            {/* Sezione portata + Pre-conto — riga a 2 colonne */}
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:5}}>
              <button onClick={addSeparatore}
                style={{padding:"10px 0",borderRadius:8,
                  border:"2px solid #2d5a7b",
                  background:"#eff6ff",color:"#2d5a7b",cursor:"pointer",
                  fontSize:13,fontWeight:800,
                  display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                  letterSpacing:.3}}>
                <span style={{fontSize:18,lineHeight:1}}>≡</span>
                Aggiungi Sezione Portata
              </button>
              <button onClick={printPreConto}
                disabled={!comanda}
                title="Stampa estratto conto / pre-conto"
                style={{padding:"10px 14px",borderRadius:8,
                  border:"2px solid #854d0e",
                  background:comanda?"#fef9c3":"#f9fafb",
                  color:comanda?"#854d0e":"#9ca3af",
                  cursor:comanda?"pointer":"not-allowed",
                  fontSize:13,fontWeight:800,
                  display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                  whiteSpace:"nowrap",transition:"all .15s"}}
                onMouseEnter={e=>{if(comanda)e.currentTarget.style.background="#fde68a";}}
                onMouseLeave={e=>{if(comanda)e.currentTarget.style.background="#fef9c3";}}>
                <span style={{fontSize:16,lineHeight:1}}><i className="fa-light fa-clipboard-list"/></span>
                Pre-conto
              </button>
            </div>
            {/* Riga principale azioni conto — tutta la larghezza */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5}}>
              {/* Chiudi comanda */}
              <button onClick={()=>{ setChiudiTipo(null); setChiudiParte(null); setShowChiudi(true); }}
                disabled={!comanda}
                style={{padding:"10px 4px",borderRadius:7,border:"none",
                  background:comanda?"#2d5a7b":"#e5e7eb",color:comanda?"white":"#9ca3af",
                  cursor:comanda?"pointer":"not-allowed",fontSize:10,fontWeight:700,
                  display:"flex",flexDirection:"column",alignItems:"center",gap:3,transition:"all .15s"}}
                onMouseEnter={e=>{if(comanda)e.currentTarget.style.background="#1e3a52";}}
                onMouseLeave={e=>{if(comanda)e.currentTarget.style.background="#2d5a7b";}}>
                <span style={{fontSize:18}}><i className="fa-light fa-flag-checkered"/></span>Chiudi comanda
              </button>
              {/* Dividi conto — inibito se parti uguali già in corso */}
              {(()=>{
                const hasPartiUguali = partiChiuse.some(p=>p._dividi);
                const canDividi = comanda && order.filter(x=>!x.isSeparatore&&!closedItems.includes(x.voce_id)).length>0 && !hasPartiUguali;
                return (
                  <button onClick={()=>{ if(canDividi){setDividiItems([]);setShowDividi(true);}else if(hasPartiUguali){toast("Dividi conto non disponibile: stai usando la divisione in parti uguali","error");}}}
                    disabled={!canDividi}
                    title={hasPartiUguali?"Non disponibile: divisione in parti uguali in corso":undefined}
                    style={{padding:"10px 4px",borderRadius:7,border:"1px solid #d1d5db",
                      background:hasPartiUguali?"#f9fafb":"white",
                      color:canDividi?"#374151":"#9ca3af",
                      cursor:canDividi?"pointer":"not-allowed",
                      fontSize:10,fontWeight:700,
                      display:"flex",flexDirection:"column",alignItems:"center",gap:3,transition:"all .15s",
                      opacity:hasPartiUguali?0.5:1}}
                    onMouseEnter={e=>{if(canDividi)e.currentTarget.style.background="#f9fafb";}}
                    onMouseLeave={e=>{e.currentTarget.style.background=hasPartiUguali?"#f9fafb":"white";}}>
                    <span style={{fontSize:18}}><i className="fa-light fa-scissors"/></span>Dividi conto
                  </button>
                );
              })()}
              {/* Dividi in parti uguali */}
              <button onClick={()=>{ setNumParti(2); setShowDividiParti(true); }}
                disabled={!comanda||order.filter(x=>!x.isSeparatore).length===0}
                style={{padding:"10px 4px",borderRadius:7,border:"1px solid #d1d5db",
                  background:"white",color:comanda&&order.filter(x=>!x.isSeparatore).length>0?"#374151":"#9ca3af",
                  cursor:comanda&&order.filter(x=>!x.isSeparatore).length>0?"pointer":"not-allowed",
                  fontSize:10,fontWeight:700,
                  display:"flex",flexDirection:"column",alignItems:"center",gap:3,transition:"all .15s"}}
                onMouseEnter={e=>{if(comanda)e.currentTarget.style.background="#f9fafb";}}
                onMouseLeave={e=>{e.currentTarget.style.background="white";}}>
                <span style={{fontSize:18}}><i className="fa-light fa-list-ol"/></span>Dividi parti uguali
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
      {showSelRapida&&(
        <ModalSelRapida
          tavoli={tavoli} turni={turni} selTurno={selTurno} noTavoli={noTavoli}
          selOutlet={selOutlet} hasSale={sale.length>0}
          onSelect={(type,item)=>{
            setShowSelRapida(false);
            if(type==="tavolo")  handleChangeTavolo(item.id);
            else if(type==="turno")   setSelTurno(item);
            else if(type==="comanda") {
              // Always load the specific comanda directly
              selectComanda(item);
            }
          }}
          onClose={()=>setShowSelRapida(false)}/>
      )}
      {showNote&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:1000,
          display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"white",borderRadius:12,width:"100%",maxWidth:420,overflow:"hidden",
            boxShadow:"0 16px 48px rgba(0,0,0,.18)"}}>
            <div style={{background:"#2d5a7b",padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{color:"white",fontWeight:700,fontSize:14}}><i className="fa-light fa-pen-to-square"/> Note comanda</span>
              <button onClick={()=>setShowNote(false)} style={{background:"rgba(255,255,255,.2)",border:"none",color:"white",cursor:"pointer",fontSize:18,width:28,height:28,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>
            <div style={{padding:16}}>
              <p style={{fontSize:12,color:"#6b7280",marginBottom:10}}>Allergie, preferenze, richieste speciali</p>
              <textarea value={note} onChange={e=>setNote(e.target.value)} rows={4}
                placeholder="Es. Allergia arachidi, niente glutine, tavolo romantico..."
                style={{width:"100%",border:"1px solid #d1d5db",borderRadius:8,padding:10,
                  fontSize:13,resize:"none",outline:"none",boxSizing:"border-box",lineHeight:1.5}}/>
              <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:10}}>
                <button onClick={()=>setShowNote(false)} style={{padding:"8px 18px",borderRadius:7,border:"1px solid #d1d5db",background:"white",cursor:"pointer",fontSize:12,fontWeight:600,color:"#6b7280"}}>Annulla</button>
                <button onClick={()=>setShowNote(false)} style={{padding:"8px 22px",borderRadius:7,border:"none",background:"#2d5a7b",color:"white",cursor:"pointer",fontSize:12,fontWeight:700}}>Salva</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Annulla comanda modal */}
      {showAnnulla&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:1000,
          display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>setShowAnnulla(false)}>
          <div style={{background:"white",borderRadius:12,width:"100%",maxWidth:420,overflow:"hidden",
            boxShadow:"0 16px 48px rgba(0,0,0,.18)"}} onClick={e=>e.stopPropagation()}>
            <div style={{background:"#dc2626",padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{color:"white",fontWeight:700,fontSize:14}}>✕ Annulla comanda #{comanda?.numero}</span>
              <button onClick={()=>setShowAnnulla(false)} style={{background:"rgba(255,255,255,.2)",border:"none",color:"white",cursor:"pointer",fontSize:18,width:28,height:28,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>
            <div style={{padding:16}}>
              {inviatoReparti&&(
                <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,padding:"10px 14px",marginBottom:14}}>
                  <p style={{fontSize:12,fontWeight:700,color:"#92400e",margin:"0 0 6px"}}><i className="fa-light fa-triangle-exclamation"/> Comanda già inviata ai reparti di produzione</p>
                  <p style={{fontSize:12,color:"#78350f",margin:0}}>Inserisci il motivo di annullamento</p>
                </div>
              )}
              {!inviatoReparti&&(
                <p style={{fontSize:13,color:"#6b7280",marginBottom:14}}>Confermi l'annullamento della comanda?</p>
              )}
              {inviatoReparti&&(
                <textarea value={motivoAnnulla} onChange={e=>setMotivoAnnulla(e.target.value)}
                  placeholder="Es. Cliente ha cambiato idea, errore di inserimento..."
                  rows={3} style={{width:"100%",border:"1px solid #d1d5db",borderRadius:8,padding:10,
                    fontSize:13,resize:"none",outline:"none",boxSizing:"border-box",lineHeight:1.5,marginBottom:14}}/>
              )}
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{setShowAnnulla(false);setMotivoAnnulla("");}}
                  style={{flex:1,height:42,borderRadius:8,border:"1px solid #d1d5db",background:"white",cursor:"pointer",fontSize:12,fontWeight:600,color:"#6b7280"}}>Annulla</button>
                <button
                  onClick={()=>{
                    if(inviatoReparti&&!motivoAnnulla.trim()){toast("Inserisci il motivo","error");return;}
                    annullaComanda(motivoAnnulla);
                    setShowAnnulla(false); setMotivoAnnulla("");
                  }}
                  disabled={inviatoReparti&&!motivoAnnulla.trim()}
                  style={{flex:2,height:42,borderRadius:8,border:"none",
                    background:inviatoReparti&&!motivoAnnulla.trim()?"#e5e7eb":"#dc2626",
                    color:inviatoReparti&&!motivoAnnulla.trim()?"#9ca3af":"white",
                    cursor:inviatoReparti&&!motivoAnnulla.trim()?"not-allowed":"pointer",
                    fontSize:13,fontWeight:700}}>
                  <i className="fa-light fa-xmark"/> Conferma annullamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CHIUDI COMANDA: now uses ModalPagamento directly ── */}
      {showChiudi&&(()=>{
        const importoParte = chiudiParte ? chiudiParte.reduce((s,x)=>s+x.prezzo*x.qty,0)
          : order.filter(x=>!x.isSeparatore&&!closedItems.includes(x.voce_id)).reduce((s,x)=>s+x.prezzo*x.qty,0);
        const righePerRicevuta = chiudiParte || order.filter(x=>!x.isSeparatore&&!closedItems.includes(x.voce_id));
        return (
          <ModalPagamento
            importo={importoParte}
            righe={righePerRicevuta}
            titolo={`Chiudi comanda #${comanda?.numero}${chiudiParte?" — Parte selezionata":""}`}
            comanda={comanda}
            outletNome={selOutlet?.nome}
            catClienti={catClienti}
            categoriaManuale={selCatCliente}
            onClose={()=>{setShowChiudi(false);setChiudiParte(null);}}
            onConfirm={async(details)=>{
              try {
                // Wallet payment: deduct from wallet before closing
                // details.importo is already the discounted amount
                if (details.tipo==="wallet" && details.wallet) {
                  const wId = details.wallet.id;
                  const imp = details.importo || 0; // usa importo effettivo (già scontato)
                  if (imp > 0) {
                    const wRes = await api.pagaWallet(wId, {
                      importo: imp,
                      note: `Comanda #${comanda?.numero||""}`,
                      comanda_id: comanda?.id || null
                    });
                    // wRes is the updated wallet — log for debugging
                    console.log("[Wallet paga] OK, nuovo saldo:", wRes?.saldo);
                  } else {
                    console.warn("[Wallet paga] imp=0, pagamento saltato", {details, pagConfig});
                  }
                }
                if (chiudiParte) {
                  const parteTot = chiudiParte.reduce((s,x)=>s+x.prezzo*x.qty,0);
                  setClosedItems(prev=>{
                    const next=[...prev,...chiudiParte.map(x=>x.voce_id)];
                    if(comanda?.id) localStorage.setItem("ci_"+comanda.id, JSON.stringify(next));
                    return next;
                  });
                  setPartiChiuse(prev=>{
                    const next=[...prev,{tipo:details.tipo,importo:parteTot}];
                    if(comanda?.id) localStorage.setItem("pc_"+comanda.id, JSON.stringify(next));
                    return next;
                  });
                  const allClosed = order.filter(x=>!x.isSeparatore).every(x=>
                    [...closedItems,...chiudiParte.map(p=>p.voce_id)].includes(x.voce_id));
                  if (allClosed) { await doCloseComanda(true); toast("✓ Comanda completamente chiusa"); }
                  else toast(`✓ Parte incassata — €${parteTot.toFixed(2)}`);
                } else {
                  await doCloseComanda(true); toast("✓ Comanda chiusa");
                }
                setShowChiudi(false); setChiudiParte(null); setShowPagamento(false);
              } catch(e){ toast(e.message,"error"); }
            }}
          />
        );
      })()}

      {/* ── DIVIDI CONTO MODAL ── */}
      {showDividi&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:1000,
          display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setShowDividi(false)}>
          <div style={{background:"white",borderRadius:12,width:"100%",maxWidth:500,overflow:"hidden",
            boxShadow:"0 16px 48px rgba(0,0,0,.18)",maxHeight:"85vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
            <div style={{background:"#2d5a7b",padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
              <span style={{color:"white",fontWeight:700,fontSize:14}}><i className="fa-light fa-scissors"/> Dividi conto — seleziona portate</span>
              <button onClick={()=>setShowDividi(false)} style={{background:"rgba(255,255,255,.2)",border:"none",color:"white",cursor:"pointer",fontSize:18,width:28,height:28,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:14}}>
              <p style={{fontSize:12,color:"#6b7280",marginBottom:10}}>Seleziona le portate da addebitare separatamente:</p>
              {order.filter(x=>!x.isSeparatore&&!closedItems.includes(x.voce_id)).map(item=>{
                const sel = dividiItems.includes(item.voce_id);
                return (
                  <div key={item.voce_id} onClick={()=>setDividiItems(prev=>sel?prev.filter(id=>id!==item.voce_id):[...prev,item.voce_id])}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",marginBottom:6,
                      borderRadius:8,border:"1.5px solid "+(sel?"#2d5a7b":"#e5e7eb"),
                      background:sel?"#eff6ff":"white",cursor:"pointer",transition:"all .15s"}}>
                    <div style={{width:18,height:18,borderRadius:4,border:"2px solid "+(sel?"#2d5a7b":"#d1d5db"),
                      background:sel?"#2d5a7b":"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {sel&&<span style={{color:"white",fontSize:12,lineHeight:1}}>✓</span>}
                    </div>
                    <span style={{flex:1,fontSize:13,color:"#374151"}}>{item.qty}× {item.nome}</span>
                    <span style={{fontSize:13,fontWeight:600,color:"#374151"}}>{(item.prezzo*item.qty).toFixed(2)}€</span>
                  </div>
                );
              })}
            </div>
            <div style={{padding:"10px 14px",borderTop:"1px solid #e5e7eb",flexShrink:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <span style={{fontSize:12,color:"#6b7280"}}>Selezionati:</span>
                <strong style={{fontSize:14,color:"#2d5a7b"}}>
                  €{order.filter(x=>dividiItems.includes(x.voce_id)).reduce((s,x)=>s+x.prezzo*x.qty,0).toFixed(2)}
                </strong>
              </div>
              <button onClick={()=>{
                if(dividiItems.length===0){toast("Seleziona almeno una portata","error");return;}
                const parte = order.filter(x=>dividiItems.includes(x.voce_id));
                const imp = parte.reduce((s,x)=>s+x.prezzo*x.qty,0);
                setShowDividi(false);
                setChiudiParte(parte);
                setShowChiudi(true); // opens ModalPagamento via showChiudi
              }}
                disabled={dividiItems.length===0}
                style={{width:"100%",height:42,borderRadius:8,border:"none",
                  background:dividiItems.length>0?"#2d5a7b":"#e5e7eb",
                  color:dividiItems.length>0?"white":"#9ca3af",
                  cursor:dividiItems.length>0?"pointer":"not-allowed",fontSize:13,fontWeight:700}}>
                Incassa questa parte →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DIVIDI IN PARTI UGUALI MODAL ── */}
      {showDividiParti&&(()=>{
        const totale = order.filter(x=>!x.isSeparatore&&!closedItems.includes(x.voce_id)).reduce((s,x)=>s+x.prezzo*x.qty,0);
        const quota  = numParti>0 ? totale/numParti : 0;
        const parti  = Array.from({length:numParti},(_,i)=>i);
        const partiPagate = partiChiuse.filter(p=>p._dividi).length;
        return (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:1000,
          display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setShowDividiParti(false)}>
          <div style={{background:"white",borderRadius:12,width:"100%",maxWidth:460,overflow:"hidden",
            boxShadow:"0 16px 48px rgba(0,0,0,.18)",maxHeight:"85vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
            <div style={{background:"#2d5a7b",padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
              <span style={{color:"white",fontWeight:700,fontSize:14}}><i className="fa-light fa-list-ol"/> Dividi in parti uguali</span>
              <button onClick={()=>setShowDividiParti(false)} style={{background:"rgba(255,255,255,.2)",border:"none",color:"white",cursor:"pointer",fontSize:18,width:28,height:28,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:16}}>
              {/* Step 1: choose N */}
              {partiPagate===0&&(
                <div style={{marginBottom:16}}>
                  <p style={{fontSize:13,color:"#6b7280",marginBottom:12}}>
                    Totale: <strong style={{color:"#374151"}}>€{totale.toFixed(2)}</strong>
                  </p>
                  <div style={{display:"flex",alignItems:"center",gap:12,justifyContent:"center",marginBottom:12}}>
                    <button onClick={()=>setNumParti(n=>Math.max(2,n-1))}
                      style={{width:36,height:36,borderRadius:"50%",border:"none",background:"#2d5a7b",color:"white",cursor:"pointer",fontSize:22,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                    <span style={{fontSize:36,fontWeight:800,color:"#2d5a7b",minWidth:44,textAlign:"center"}}>{numParti}</span>
                    <button onClick={()=>setNumParti(n=>n+1)}
                      style={{width:36,height:36,borderRadius:"50%",border:"none",background:"#2d5a7b",color:"white",cursor:"pointer",fontSize:22,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                  </div>
                  <div style={{background:"#eff6ff",borderRadius:8,padding:"10px 16px",textAlign:"center"}}>
                    <div style={{fontSize:11,color:"#6b7280",marginBottom:2}}>Quota per persona</div>
                    <div style={{fontSize:28,fontWeight:800,color:"#2d5a7b"}}>€{quota.toFixed(2)}</div>
                  </div>
                </div>
              )}
              {/* Step 2: close each part */}
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {parti.map(i=>{
                  const paid = partiChiuse.filter(p=>p._dividi&&p._parte===i)[0];
                  return (
                    <div key={i} style={{borderRadius:8,border:"1.5px solid "+(paid?"#16a34a":"#e5e7eb"),
                      background:paid?"#f0fdf4":"white",padding:"10px 14px",
                      display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:paid?"#16a34a":"#374151"}}>
                          Parte {i+1} — €{quota.toFixed(2)}
                        </div>
                        {paid&&<div style={{fontSize:11,color:"#16a34a",marginTop:2}}>
                          ✓ {[["camera","Conto Camera"],["passanti","Conto Passanti"],["scontrino","Scontrino"],["fattura","Fattura"]].find(([k])=>k===paid.tipo)?.[1]||paid.tipo}
                        </div>}
                      </div>
                      {!paid&&(
                        <button onClick={()=>{
                          // Open ModalPagamento for this part
                          // Scale quantities proportionally (e.g. 2 parts → 0.5× each item)
                          const partRighe = order.filter(x=>!x.isSeparatore).map(x=>({
                            ...x, qty: Math.round((x.qty/numParti)*100)/100,
                            prezzo: x.prezzo,
                            nome: x.nome,
                          }));
                          openPagamento(quota, partRighe, `Parte ${i+1} di ${numParti}`, null, async(details)=>{
                            const newParte = {tipo:details.tipo, importo:quota, _dividi:true, _parte:i};
                            const newParti = [...partiChiuse, newParte];
                            setPartiChiuse(newParti);
                            // Persisti in localStorage
                            if(comanda?.id) localStorage.setItem("pc_"+comanda.id, JSON.stringify(newParti));
                            setShowPagamento(false);
                            if(newParti.filter(p=>p._dividi).length >= numParti){
                              try {
                                await doCloseComanda(true);
                                setShowDividiParti(false);
                                toast(`✓ Tutte le ${numParti} parti incassate — comanda chiusa`);
                              } catch(e){ toast(e.message,"error"); }
                            } else {
                              toast(`✓ Parte ${i+1} incassata`);
                            }
                          });
                        }}
                          style={{padding:"5px 12px",borderRadius:6,border:"1.5px solid #2d5a7b",background:"white",color:"#2d5a7b",cursor:"pointer",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}
                          onMouseEnter={e=>{e.currentTarget.style.background="#2d5a7b";e.currentTarget.style.color="white";}}
                          onMouseLeave={e=>{e.currentTarget.style.background="white";e.currentTarget.style.color="#2d5a7b";}}>
                          Incassa →
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{padding:"10px 14px",borderTop:"1px solid #e5e7eb",flexShrink:0,display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:11,color:"#6b7280"}}>{partiPagate}/{numParti} parti incassate</span>
              {partiPagate>0&&partiPagate<numParti&&(
                <button onClick={()=>setShowDividiParti(false)}
                  style={{marginLeft:"auto",padding:"5px 12px",borderRadius:6,border:"1.5px solid #d1d5db",
                    background:"white",color:"#6b7280",cursor:"pointer",fontSize:11,fontWeight:700}}>
                  Chiudi in seguito ×
                </button>
              )}
            </div>
          </div>
        </div>
        );
      })()}
      {/* ── PAGAMENTO MODAL (shared) ── */}
      {showPagamento&&pagConfig&&(
        <ModalPagamento
          importo={pagConfig.importo}
          righe={pagConfig.righe}
          titolo={pagConfig.titolo}
          tipoPreselezionato={pagConfig.tipo}
          comanda={comanda}
          outletNome={selOutlet?.nome}
          catClienti={catClienti}
          categoriaManuale={selCatCliente}
          onClose={()=>setShowPagamento(false)}
          onConfirm={pagConfig.onConfirm}
        />
      )}

      {/* ── LISTA COMANDE CHIUSE MODAL ── */}
      {showComandeChiuse&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:1000,
          display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setShowComandeChiuse(false)}>
          <div style={{background:"white",borderRadius:12,width:"100%",maxWidth:600,overflow:"hidden",
            boxShadow:"0 16px 48px rgba(0,0,0,.18)",maxHeight:"85vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
            <div style={{background:"#2d5a7b",padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
              <span style={{color:"white",fontWeight:700,fontSize:14}}><i className="fa-light fa-box-archive"/> Archivio comande chiuse — {selOutlet?.nome}</span>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <button onClick={loadComandeChiuse} style={{background:"rgba(255,255,255,.2)",border:"none",color:"white",cursor:"pointer",fontSize:13,padding:"3px 8px",borderRadius:5,fontWeight:600}}>↻</button>
                <button onClick={()=>setShowComandeChiuse(false)} style={{background:"rgba(255,255,255,.2)",border:"none",color:"white",cursor:"pointer",fontSize:18,width:28,height:28,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
              </div>
            </div>
            <div style={{flex:1,overflowY:"auto"}}>
              {loadingChiuse&&<div style={{padding:32,textAlign:"center",color:"#9ca3af",fontSize:13}}>Caricamento...</div>}
              {!loadingChiuse&&comandeChiuse.length===0&&(
                <div style={{padding:40,textAlign:"center",color:"#9ca3af",fontSize:13}}>
                  <div style={{fontSize:36,marginBottom:8}}><i className="fa-light fa-box-archive"/></div>
                  Nessuna comanda chiusa per questo outlet
                </div>
              )}
              {!loadingChiuse&&comandeChiuse.map(c=>{
                const closedAt = c.closed_at ? new Date(c.closed_at) : null;
                const createdAt = c.created_at ? new Date(c.created_at) : null;
                const totale = (c.righe||[]).reduce((s,r)=>s+r.prezzo_snapshot*r.quantita,0);
                return (
                  <div key={c.id} style={{display:"flex",alignItems:"center",padding:"12px 16px",
                    borderBottom:"1px solid #f1f5f9",gap:12,transition:"background .1s"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#f9fafb"}
                    onMouseLeave={e=>e.currentTarget.style.background="white"}>
                    {/* Info */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                        <span style={{fontSize:14,fontWeight:700,color:"#2d5a7b"}}>#{c.numero}</span>
                        {c.tipo_chiusura&&<span style={{fontSize:10,fontWeight:600,color:"#16a34a",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"1px 8px"}}>
                          {[["camera","Camera"],["passanti","Passanti"],["scontrino","Scontrino"],["fattura","Fattura"],["diviso","Diviso"]].find(([k])=>k===c.tipo_chiusura)?.[1]||c.tipo_chiusura}
                        </span>}
                        <span style={{fontSize:13,fontWeight:700,color:"#374151",marginLeft:"auto"}}>€{totale.toFixed(2)}</span>
                      </div>
                      <div style={{fontSize:11,color:"#6b7280",display:"flex",gap:12}}>
                        {c.tavolo_id&&<span>Tavolo {c.tavolo_id}</span>}
                        {c.coperti>0&&<span>{c.coperti} pax</span>}
                        {createdAt&&<span>Aperta: {createdAt.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}</span>}
                        {closedAt&&<span>Chiusa: {closedAt.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}</span>}
                      </div>
                      {/* Righe preview */}
                      {(c.righe||[]).length>0&&(
                        <div style={{fontSize:11,color:"#9ca3af",marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {(c.righe||[]).map(r=>`${r.quantita}× ${r.nome_snapshot}`).join(" · ")}
                        </div>
                      )}
                    </div>
                    {/* Actions */}
                    <button onClick={()=>riapriComanda(c)}
                      title="Riapri questa comanda"
                      style={{flexShrink:0,padding:"6px 12px",borderRadius:6,border:"1.5px solid #2d5a7b",
                        background:"white",color:"#2d5a7b",cursor:"pointer",fontSize:11,fontWeight:700,
                        transition:"all .15s"}}
                      onMouseEnter={e=>{e.currentTarget.style.background="#2d5a7b";e.currentTarget.style.color="white";}}
                      onMouseLeave={e=>{e.currentTarget.style.background="white";e.currentTarget.style.color="#2d5a7b";}}>
                      ↺ Riapri
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}