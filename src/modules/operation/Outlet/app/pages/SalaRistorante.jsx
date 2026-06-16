import { useState, useEffect, useCallback, useRef } from "react";
import { printEstrattoConto } from "../services/pdfUtils";
import { api } from "../services/api";
import { C, useToast, MiniCalendar, Btn, PillBtn, Modal, Field, Input, Select, FormRow, Badge } from "../components/UI";
import {
  ChevronLeft, ChevronRight, Minus, Plus, Trash2, Copy,
  StickyNote, Wine, Car, X as XIcon, Hotel, Scissors,
  Receipt, FileText, CreditCard, RefreshCw, Lock,
  GripVertical, AlignLeft, Send, CheckCircle,
  BookOpen
} from "lucide-react";

const ORANGE = "#204769";
const NAVY   = "#204769";
const SERVIZI   = ["Colazione","Pranzo","Cena"];

const STATUS_CFG = {
  disponibile:   { label:"Disponibile",      color:"#007035", bg:"white",   strip:"#E4F8EE", dot:"#00CF86" },
  attesa_ordine: { label:"In attesa ordine", color:"#5C9CD4", bg:"#f0f8ff", strip:"#dbeafe", dot:"#5C9CD4" },
  occupato:      { label:"Occupato",         color:"#D10011", bg:"#FFEAEF", strip:"#FFD0D5", dot:"#FF616E" },
  riservato:     { label:"Riservato",        color:"#204769", bg:"#e6eaee", strip:"#ccd5dd", dot:"#204769" },
  chiesto_conto: { label:"Chiesto conto",    color:"#F57D03", bg:"#FFF3E0", strip:"#FFE0B2", dot:"#F57D03" },
  uscita:        { label:"In uscita",        color:"#6E7175", bg:"#f2f5f6", strip:"#e6eaee", dot:"#A9AAAD" },
  bloccato:      { label:"Bloccato",         color:"#374151", bg:"#f1f5f9", strip:"#DBDBDB", dot:"#475569" },
  pagato:        { label:"Pagato",           color:"#007035", bg:"#E4F8EE", strip:"#b7f0d4", dot:"#00CF86" },
};

// Returns status label considering turno context
const TODAY_STR = (() => {
  const d = new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
})();

function getStatusLabel(t, selTurno, turni, prenOggi, dateStr, selService) {
  const isToday = !dateStr || dateStr === TODAY_STR;

  // For FUTURE/PAST dates: ignore physical status, compute from prenotazioni only
  if (!isToday) {
    const pren = prenOggi?.find(p =>
      (p.tavolo_id === t.id || p.tavolo_unito_id === t.id) &&
      (!selTurno || !p.turno_id || p.turno_id === selTurno.id)
    );
    // Bloccato for this specific date+turno?
    const isBlocked = t.bloccato &&
      t.bloccato_data === dateStr &&
      (!t.bloccato_turno_id || !selTurno || t.bloccato_turno_id === selTurno?.id);
    if (isBlocked) return STATUS_CFG.bloccato;
    if (pren) return STATUS_CFG.riservato;
    return STATUS_CFG.disponibile;
  }

  // TODAY: use real physical status
  if (t.pagato) return STATUS_CFG.pagato;

  // Bloccato: only effective for matching date+turno
  if (t.bloccato) {
    const bloccoMatch = (!t.bloccato_data || t.bloccato_data === TODAY_STR) &&
      (!t.bloccato_turno_id || !selTurno || t.bloccato_turno_id === selTurno?.id);
    if (!bloccoMatch) {
      // Blocco is for another date/turno, ignore it for display
      return STATUS_CFG[t.status] || STATUS_CFG.disponibile;
    }
    return STATUS_CFG.bloccato;
  }

  const cfg = STATUS_CFG[t.status] || STATUS_CFG.disponibile;

  // Riservato: show as riservato for the turno that reserved it
  if (t.status === "riservato" && prenOggi?.length) {
    // Check if this table has a pren (primary) or is secondary of a pren
    const myPren = prenOggi.find(p => p.tavolo_id === t.id || p.tavolo_unito_id === t.id);
    if (myPren) {
      // If turno filter active: check pren matches current turno
      if (selTurno?.id && myPren.turno_id && myPren.turno_id !== selTurno.id) {
        return STATUS_CFG.disponibile; // pren for different turno
      }
      return STATUS_CFG.riservato; // primary or secondary of a pren → riservato
    }
    // No pren found: keep physical status (could be union-linked without pren)
  }


  if (t.status === "riservato") {
    if (!prenOggi?.length) return cfg;
    // STATUS uses EXACT turno match only:
    // - same service + same turno → Riservato
    // - same service + different turno → Disponibile (different shift)
    // - different service → Disponibile
    const exactFilter = (p) => {
      if (selService && p.servizio && p.servizio !== selService) return false; // wrong service
      if (selTurno?.id && p.turno_id && p.turno_id !== selTurno.id) return false; // wrong turno
      return true;
    };
    const prenExact  = prenOggi.filter(exactFilter);
    const directPren = prenExact.find(p => p.tavolo_id === t.id || p.tavolo_unito_id === t.id);
    const primaryPren = !directPren && t.tavolo_unito_id
      ? prenExact.find(p => p.tavolo_id === t.tavolo_unito_id)
      : null;
    const anyPren = directPren || primaryPren;
    if (!anyPren) return STATUS_CFG.disponibile;
    return STATUS_CFG.riservato;
  }

  // Occupato/attesa_ordine from different turno
  if ((t.status === "occupato" || t.status === "attesa_ordine") &&
      t.turno_occupato_id && selTurno?.id &&
      t.turno_occupato_id !== selTurno.id) {
    const turnoOcc = turni.find(x => x.id === t.turno_occupato_id);
    const nomeT = turnoOcc ? turnoOcc.nome : ("Turno " + t.turno_occupato_id);
    return { ...cfg, label:"Occupato su " + nomeT,
      color:"#b45309", dot:"#d97706", strip:"#fef3c7", bg:"#fffbeb" };
  }
  return cfg;
}

const ChefHat = ({ color, size = 54 }) => (
  <svg width={size} height={size} viewBox="0 0 512 512" fill={color}>
    <path d="M256 32c-32.4 0-61.1 16.1-78.5 40.8-5 7-14.6 8.9-21.8 4.2-12.5-8.2-27.5-12.9-43.7-12.9-44.2 0-80 35.8-80 80 0 34.8 22.2 64.5 53.3 75.5 6.4 2.3 10.7 8.3 10.7 15.1l0 117.5 64 0 0-128c0-8.8 7.2-16 16-16s16 7.2 16 16l0 128 48 0 0-128c0-8.8 7.2-16 16-16s16 7.2 16 16l0 128 48 0 0-128c0-8.8 7.2-16 16-16s16 7.2 16 16l0 128 64 0 0-117.5c0-6.8 4.3-12.8 10.7-15.1 31.1-11 53.3-40.6 53.3-75.5 0-44.2-35.8-80-80-80-16.1 0-31.1 4.8-43.7 12.9-7.2 4.7-16.9 2.9-21.8-4.2-17.4-24.7-46.1-40.8-78.5-40.8zM416 384l-320 0 0 64c0 17.7 14.3 32 32 32l256 0c17.7 0 32-14.3 32-32l0-64zM160.3 42.9C183.8 16.6 217.9 0 256 0s72.2 16.6 95.7 42.9c14.6-7 31.1-10.9 48.3-10.9 61.9 0 112 50.1 112 112 0 44.7-26.2 83.2-64 101.2L448 448c0 35.3-28.7 64-64 64l-256 0c-35.3 0-64-28.7-64-64l0-202.8c-37.8-18-64-56.5-64-101.2 0-61.9 50.1-112 112-112 17.3 0 33.7 3.9 48.3 10.9z"/>
  </svg>
);

// -- Full calendar (big, like screenshot) -------------------------------------
const MESI_IT  = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
                   "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const GIORNI   = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];

function BigCalendar({ sel, onSel }) {
  const [view, setView] = useState(new Date(sel || new Date()));
  const yr = view.getFullYear(), mo = view.getMonth();
  const firstWd = new Date(yr, mo, 1).getDay();
  const adj  = firstWd === 0 ? 6 : firstWd - 1;
  const dim  = new Date(yr, mo + 1, 0).getDate();
  const today = new Date();
  const selD  = sel || new Date();
  const isSel  = d => d && selD.getDate()===d && selD.getMonth()===mo && selD.getFullYear()===yr;
  const isToday= d => d && today.getDate()===d && today.getMonth()===mo && today.getFullYear()===yr;
  const days   = [...Array(adj).fill(null), ...Array.from({length:dim},(_,i)=>i+1)];

  return (
    <div style={{fontFamily:"'Open Sans',sans-serif"}}>
      {/* Nav */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <button onClick={()=>setView(new Date(yr,mo-1,1))}
          style={{background:"none",border:"none",cursor:"pointer",
            color:NAVY,fontSize:16,fontWeight:700,padding:"0 4px",lineHeight:1}}>«</button>
        <span style={{fontSize:15,fontWeight:700,color:NAVY,fontFamily:"'Poppins',sans-serif"}}>
          {MESI_IT[mo]} {yr}
        </span>
        <button onClick={()=>setView(new Date(yr,mo+1,1))}
          style={{background:"none",border:"none",cursor:"pointer",
            color:NAVY,fontSize:16,fontWeight:700,padding:"0 4px",lineHeight:1}}>»</button>
      </div>
      {/* Grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {GIORNI.map((d,i)=>(
          <div key={i} style={{textAlign:"center",fontSize:11,fontWeight:700,
            color:i>=5?"#5C9CD4":NAVY+"90",padding:"3px 0"}}>{d}</div>
        ))}
        {days.map((d,i)=>{
          const isWknd = i%7 >= 5;
          const sel_   = isSel(d);
          const tod    = isToday(d);
          return (
            <div key={i} onClick={()=>d&&onSel(new Date(yr,mo,d))}
              style={{textAlign:"center",fontSize:12,padding:"5px 2px",
                borderRadius:6,cursor:d?"pointer":"default",
                background: sel_?NAVY : tod?"#dbeafe" : "transparent",
                color: d ? (sel_?"white" : isWknd?"#5C9CD4" : NAVY) : "transparent",
                fontWeight: sel_||tod ? 700 : 400,
                transition:"background .1s"}}
              onMouseEnter={e=>{if(d&&!sel_)e.currentTarget.style.background="#e6eaee";}}
              onMouseLeave={e=>{if(d&&!sel_)e.currentTarget.style.background="transparent";}}>
              {d||""}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -- Table card (matches screenshot) ------------------------------------------
const HAT_COLORS = [
  "#FF6B6B","#22c55e","#f97316","#5C9CD4","#f59e0b",
  "#ec4899","#a855f7","#14b8a6","#84cc16","#fb923c",
  "#818cf8","#0d9488","#e879f9","#fbbf24","#34d399",
];

function TavoloCard({ t, prenOggi, ctxOpen, onCtxToggle, onOpen, setTooltip, setModalNota, setModalEditPren, selTurno, turni, dateStr, selService }) {
  // Pren: only use if it matches current turno (t._pren is already turno-filtered via enrichTavoli)
  const pren = t._pren || null;
  const cfg = getStatusLabel(t, selTurno, turni || [], prenOggi, dateStr, selService);
  const hColor = t.hat_color || HAT_COLORS[(parseInt(t.numero)||0) % HAT_COLORS.length];
  const canCheckin = t.status === "riservato" && pren;

  // Show time in status strip if reserved
  const statusLabel = (() => {
    const effStatus = cfg.label; // from getStatusLabel (already turno-aware)
    if(cfg === STATUS_CFG.riservato && pren?.orario) return "Riservato " + pren.orario;
    return effStatus;
  })();

  return (
    <div style={{
      background: t.is_secondary ? "#f1f5f9" : "white",
      border:"1px solid " + (ctxOpen ? "#5C9CD4" : t.is_secondary ? "#c8d0db" : "#DBDBDB"),
      borderRadius:12, width:148,
      cursor: t.is_secondary ? "default" : "pointer",
      opacity: t.is_secondary ? 0.55 : 1,
      display:"flex", flexDirection:"column", overflow:"hidden",
      boxShadow: ctxOpen
        ? "0 0 0 2px rgba(92,156,212,.3), 0 8px 24px rgba(32,71,105,.18)"
        : "0 2px 8px rgba(32,71,105,.09), 0 1px 2px rgba(32,71,105,.06)",
      transition:"box-shadow .15s, transform .15s",
      position:"relative",
    }}
    onMouseEnter={e=>{if(!ctxOpen&&!t.is_secondary){e.currentTarget.style.boxShadow="0 8px 24px rgba(32,71,105,.18)";e.currentTarget.style.transform="translateY(-3px)";}}}
    onMouseLeave={e=>{if(!ctxOpen&&!t.is_secondary){e.currentTarget.style.boxShadow="0 2px 8px rgba(32,71,105,.09)";e.currentTarget.style.transform="none";}}}
    onClick={()=>{ if(!ctxOpen&&!t.is_secondary) onOpen(t); }}>

      {/* Top row */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"7px 8px 0", minHeight:28}}>
        {/* Top-left: pren icon (note or guest) with floating tooltip */}
        <div style={{position:"relative",minWidth:22,height:22,
          display:"flex",alignItems:"center",justifyContent:"center"}}>
          {pren ? (
            <div
              style={{cursor:"pointer"}}
              onClick={e=>{e.stopPropagation();setTooltip&&setTooltip(null);setModalNota&&setModalNota(pren);}}
              onMouseEnter={e=>{
                const rect=e.currentTarget.getBoundingClientRect();
                setTooltip&&setTooltip({
                  x:Math.min(rect.left+24,window.innerWidth-210),
                  y:rect.bottom+6,
                  pren
                });
              }}
              onMouseLeave={()=>setTooltip&&setTooltip(null)}>
              <div style={{width:20,height:20,borderRadius:5,
                background:pren.note?"#FFF3E0":"#EFF6FF",
                border:"1.5px solid "+(pren.note?"#F57D03":"#5C9CD4"),
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:11,lineHeight:1}}>
                {pren.note?"📋":"👤"}
              </div>
            </div>
          ) : (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="14" height="14" rx="2" stroke="#CFCFCF" strokeWidth="1.5"/>
            </svg>
          )}
        </div>
        {/* Right: menu ≡ */}
        <button onClick={e=>{e.stopPropagation();onCtxToggle(t.id);}}
          style={{width:20,height:20,display:"flex",alignItems:"center",justifyContent:"center",
            borderRadius:4,border:"none",background:ctxOpen?"#e6eaee":"transparent",
            cursor:"pointer",color:"#A9AAAD",fontSize:14,transition:"background .1s"}}
          onMouseEnter={e=>e.currentTarget.style.background="#e6eaee"}
          onMouseLeave={e=>e.currentTarget.style.background=ctxOpen?"#e6eaee":"transparent"}>
          ≡
        </button>
      </div>

      {/* Chef hat or secondary overlay */}
      <div style={{position:"relative",display:"flex",justifyContent:"center",
        padding:"12px 0 8px", background:t.is_secondary?"#f1f5f9":"white"}}>
        <ChefHat color={t.is_secondary?"#c8d0db":hColor} size={56}/>
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:18,
          background:"linear-gradient(to top,"+(t.is_secondary?"#f1f5f9":"white")+" 0%, transparent 100%)",
          pointerEvents:"none"}}/>
      </div>

      {/* Info */}
      <div style={{textAlign:"center",padding:"0 8px 8px",flex:1,position:"relative"}}>
        <div style={{fontSize:20,fontWeight:700,color:NAVY,lineHeight:1.1,
          fontFamily:"'Poppins',sans-serif",marginBottom:3}}>{t.numero}</div>
        <div style={{fontSize:10,color:"#A9AAAD",marginBottom:2}}>
          Coperti {t.coperti_attuali||0} di {t.capienza||0}
        </div>
        <div style={{fontSize:11,fontWeight:600,color:"#6E7175",marginBottom:2}}>
          € {t.totale_oggi ? t.totale_oggi.toFixed(2) : "0,00"}
        </div>
        {/* Prenotazione: nome + orario — clickable link to edit */}
        {pren && (
          <div
            onClick={e=>{e.stopPropagation();setModalEditPren&&setModalEditPren(pren);}}
            style={{fontSize:9,color:"#5C9CD4",fontWeight:600,lineHeight:1.3,
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
              maxWidth:"100%",marginBottom:2,cursor:"pointer",
              textDecoration:"underline",textDecorationStyle:"dotted"}}>
            👤 {pren.nome} · {pren.orario}
          </div>
        )}
        {t.tavolo_unito_id && (() => {
          // For secondary tables, also show partner's prenotazione info
          const partnerPren = t.is_secondary
            ? prenOggi?.find(p => p.tavolo_id === t.tavolo_unito_id)
            : null;
          return (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <div style={{fontSize:9,color:t.is_secondary?"#64748b":"#5C9CD4",
                display:"flex",alignItems:"center",gap:2}}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                {t.is_secondary?"Unito a":"Unito con"} {t.tavolo_unito_label||("T."+String(t.tavolo_unito_id).padStart(3,"0"))}
              </div>
              {partnerPren&&(
                <div style={{fontSize:8,color:"#5C9CD4",fontWeight:600,
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:130}}>
                  👤 {partnerPren.nome} · {partnerPren.orario}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Status strip */}
      <div style={{background:cfg.strip, padding:"5px 6px",
        textAlign:"center", borderTop:"1px solid "+cfg.dot+"25",
        display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
        {t.pagato&&<span style={{fontSize:10}}>🧾</span>}
        <span style={{fontSize:10,fontWeight:700,color:cfg.color}}>
          {t.pagato ? "Pagato" : statusLabel}
        </span>
      </div>
    </div>
  );
}

// -- Context menu (floating dropdown) -----------------------------------------
function CtxMenu({ t, pren, onClose, turni }) {
  const isPagato   = t.pagato;
  const isBloccato = t.bloccato;
  const status     = t.status;
  let items = [];

  if (isPagato) {
    items = [
      {ic:"📄",lb:"Estratto conto",    act:"estratto",     sep:false},
      {ic:"🆓",lb:"Libera tavolo",     act:"libera",       sep:true},
    ];
  } else if (isBloccato) {
    items = [
      {ic:"🔓",lb:"Sblocca tavolo",    act:"disponibile",  sep:false},
    ];
  } else if (status === "disponibile") {
    items = [
      {ic:"🧾",lb:"Apri comanda",      act:"gestione",     sep:false},
      ...(pren?[{ic:"✅",lb:"Check-in ospite",act:"checkin",sep:false}]:[]),
      {ic:"🔒",lb:"Blocca tavolo",     act:"bloccato",     sep:true},
    ];
  } else if (status === "riservato") {
    items = [
      ...(pren?[{ic:"✅",lb:"Check-in ospite",act:"checkin",sep:false}]:[]),
      {ic:"🧾",lb:"Apri comanda",      act:"gestione",     sep:false},
      {ic:"🔀",lb:"Sposta tavolo",     act:"sposta",       sep:false},
      {ic:"🔗",lb:"Unisci tavolo",     act:"unisci",       sep:false},
      ...(t.tavolo_unito_id?[{ic:"✂️", lb:"Dividi tavolo",  act:"dividi",       sep:false}]:[]),
      {ic:"✔", lb:"Segna disponibile", act:"disponibile",  sep:true},
    ];
  } else if (status === "attesa_ordine") {
    items = [
      {ic:"🧾",lb:"Gestisci comanda",  act:"gestione",     sep:false},
      {ic:"🔀",lb:"Sposta tavolo",     act:"sposta",       sep:false},
      {ic:"🔗",lb:"Unisci tavolo",     act:"unisci",       sep:false},
      ...(t.tavolo_unito_id?[{ic:"✂️", lb:"Dividi tavolo",  act:"dividi",       sep:false}]:[]),
      {ic:"✔", lb:"Libera tavolo",     act:"disponibile",  sep:true},
    ];
  } else if (status === "occupato") {
    items = [
      {ic:"🧾",lb:"Gestisci comanda",  act:"gestione",     sep:false},
      {ic:"📄",lb:"Estratto conto",    act:"estratto",     sep:false},
      {ic:"🔀",lb:"Sposta tavolo",     act:"sposta",       sep:false},
      {ic:"🔗",lb:"Unisci tavolo",     act:"unisci",       sep:false},
      ...(t.tavolo_unito_id?[{ic:"✂️", lb:"Dividi tavolo",   act:"dividi",       sep:false}]:[]),
      {ic:"💳",lb:"Chiesto conto",     act:"chiesto_conto",sep:true},
      {ic:"🏁",lb:"Chiudi e paga",     act:"paga",         sep:false},
    ];
  } else if (status === "chiesto_conto") {
    items = [
      {ic:"🧾",lb:"Gestisci comanda",  act:"gestione",     sep:false},
      {ic:"📄",lb:"Estratto conto",    act:"estratto",     sep:false},
      {ic:"🏁",lb:"Chiudi e paga",     act:"paga",         sep:false},
    ];
  } else {
    items = [
      {ic:"✔", lb:"Segna disponibile", act:"disponibile",  sep:false},
    ];
  }

  const cfg = isPagato ? STATUS_CFG.pagato : (STATUS_CFG[status]||STATUS_CFG.disponibile);
  const uniq = items

  return (
    <>
      <div style={{position:"fixed",inset:0,zIndex:98}} onClick={()=>onClose(null)}/>
      <div style={{position:"absolute",top:0,right:-192,zIndex:99,
        background:"white",borderRadius:10,
        boxShadow:"0 8px 32px rgba(32,71,105,.18),0 0 0 1px rgba(32,71,105,.08)",
        padding:6,width:188,overflow:"hidden"}}
        onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{padding:"6px 10px 8px",borderBottom:"1px solid #f2f5f6",marginBottom:4}}>
          <div style={{fontSize:12,fontWeight:700,color:NAVY,fontFamily:"'Poppins',sans-serif"}}>
            Tavolo {t.numero}
            {isPagato&&<span style={{marginLeft:6,fontSize:10,background:"#E4F8EE",color:"#007035",borderRadius:4,padding:"1px 5px"}}>✓ pagato</span>}
          </div>
          <div style={{fontSize:10,color:"#6E7175"}}>{t.capienza} posti · {cfg.label}</div>
          {t.totale_oggi>0&&<div style={{fontSize:10,color:"#007035",fontWeight:700,marginTop:1}}>€ {t.totale_oggi.toFixed(2)}</div>}
          {pren&&<div style={{fontSize:10,color:"#5C9CD4",marginTop:2}}>📋 {pren.nome} · {pren.orario}</div>}
        </div>
        {uniq.map((item,i)=>(
          <span key={item.act}>
            {item.sep&&i>0&&<div style={{height:1,background:"#f2f5f6",margin:"3px 6px"}}/>}
            <button onClick={()=>onClose(item.act)}
              style={{width:"100%",display:"flex",alignItems:"center",gap:9,
                padding:"8px 10px",border:"none",borderRadius:7,cursor:"pointer",
                background:"transparent",fontSize:12,fontWeight:600,
                color:"#4A4D53",transition:"background .12s",textAlign:"left",
                fontFamily:"'Open Sans',sans-serif"}}
              onMouseEnter={e=>e.currentTarget.style.background="#f2f5f6"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span style={{fontSize:14,lineHeight:1,width:18,textAlign:"center"}}>{item.ic}</span>
              {item.lb}
            </button>
          </span>
        ))}
      </div>
    </>
  );
}

// -- Modal Nota prenotazione (mobile-friendly) --------------------------------
function ModalNota({ pren, onClose }) {
  if(!pren) return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(32,71,105,.5)",
      zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",
      padding:16}}
      onClick={onClose}>
      <div style={{background:"white",borderRadius:14,width:"100%",maxWidth:360,
        overflow:"hidden",boxShadow:"0 16px 48px rgba(32,71,105,.25)"}}
        onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{background:NAVY,padding:"12px 16px",display:"flex",
          alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{color:"white",fontWeight:700,fontSize:14,
              fontFamily:"'Poppins',sans-serif"}}>👤 {pren.nome}</div>
            <div style={{color:"rgba(255,255,255,.7)",fontSize:11,marginTop:2}}>
              🕐 {pren.orario} · {pren.coperti} pax
              {pren.is_vip&&<span style={{marginLeft:6}}>⭐ VIP</span>}
            </div>
          </div>
          <button onClick={onClose}
            style={{background:"rgba(255,255,255,.15)",border:"none",color:"white",
              cursor:"pointer",fontSize:18,width:28,height:28,borderRadius:6,
              display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        {/* Notes */}
        <div style={{padding:16}}>
          {pren.note ? (
            <>
              <div style={{fontSize:11,fontWeight:700,color:"#F57D03",
                marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>Note</div>
              {pren.note.split("\n").filter(Boolean).map((l,i)=>(
                <div key={i} style={{display:"flex",gap:8,marginBottom:6}}>
                  <span style={{color:"#F57D03",flexShrink:0}}>•</span>
                  <span style={{fontSize:13,color:"#4A4D53",lineHeight:1.5}}>{l}</span>
                </div>
              ))}
            </>
          ) : (
            <div style={{textAlign:"center",padding:"12px 0",color:"#A9AAAD",fontSize:13}}>
              Nessuna nota per questa prenotazione
            </div>
          )}
        </div>
        <div style={{padding:"0 16px 14px",display:"flex",justifyContent:"flex-end"}}>
          <button onClick={onClose}
            style={{padding:"8px 24px",borderRadius:6,border:"none",
              background:NAVY,color:"white",cursor:"pointer",
              fontSize:13,fontWeight:700}}>Chiudi</button>
        </div>
      </div>
    </div>
  );
}

// -- Modal Modifica Prenotazione (in-page) ------------------------------------
function ModalEditPren({ pren, turni, onClose, onSaved }) {
  const NAVY_LOCAL = "#204769";
  const [form, setForm] = useState({
    nome:     pren.nome     || "",
    telefono: pren.telefono || "",
    coperti:  pren.coperti  || 2,
    orario:   pren.orario   || "",
    note:     pren.note     || "",
    turno_id: pren.turno_id != null ? String(pren.turno_id) : "",
    is_vip:   pren.is_vip   || false,
  });
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast: ltoast, ToastEl: LToastEl } = useToast();

  const ff = k => v => setForm(p=>({...p,[k]:v}));

  const slotsTurno = t => {
    if(!t?.ora_inizio || !t?.ora_fine) return [];
    const slots = []; let [h,m] = t.ora_inizio.split(":").map(Number);
    const [eh,em] = t.ora_fine.split(":").map(Number);
    while(h*60+m <= eh*60+em) {
      slots.push(String(h).padStart(2,"0")+":"+String(m).padStart(2,"0"));
      m+=30; if(m>=60){m-=60;h++;}
    }
    return slots;
  };

  const selTurnoObj = turni.find(t=>String(t.id)===form.turno_id)||null;
  const slots       = selTurnoObj ? slotsTurno(selTurnoObj) : [];

  const handleSave = async () => {
    if(!form.nome.trim()){ltoast("Nome obbligatorio","error");return;}
    setSaving(true);
    try {
      const token = localStorage.getItem("outlet_token")||"";
      const r = await fetch("/api/prenotazioni/"+pren.id, {
        method:"PUT",
        headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
        body:JSON.stringify({
          nome:     form.nome,
          telefono: form.telefono,
          coperti:  parseInt(form.coperti)||2,
          orario:   form.orario,
          note:     form.note,
          turno_id: form.turno_id ? parseInt(form.turno_id) : null,
          is_vip:   form.is_vip,
        })
      });
      const d = await r.json();
      if(!r.ok){ltoast(d.error||"Errore","error");return;}
      onSaved();
      onClose();
    } catch(e){ltoast(e.message,"error");}
    finally{setSaving(false);}
  };

  const handleDelete = async () => {
    if(!window.confirm("Eliminare la prenotazione di "+pren.nome+"?")) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem("outlet_token")||"";
      const r = await fetch("/api/prenotazioni/"+pren.id,{
        method:"DELETE",headers:{Authorization:"Bearer "+token}
      });
      if(!r.ok){const d=await r.json();ltoast(d.error||"Errore","error");return;}
      onSaved(); onClose();
    } catch(e){ltoast(e.message,"error");}
    finally{setDeleting(false);}
  };

  const IS = {width:"100%",border:"1.5px solid #CFCFCF",borderRadius:7,
    padding:"7px 9px",fontSize:12,outline:"none",
    fontFamily:"'Open Sans',sans-serif",color:"#374151",boxSizing:"border-box"};
  const FL = ({children})=>(<div style={{fontSize:10,fontWeight:700,color:"#6E7175",
    textTransform:"uppercase",letterSpacing:.4,marginBottom:3}}>{children}</div>);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(32,71,105,.5)",
      zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",
      padding:16}}
      onClick={onClose}>
      <div style={{background:"white",borderRadius:14,width:"100%",maxWidth:400,
        overflow:"hidden",boxShadow:"0 16px 48px rgba(32,71,105,.25)"}}
        onClick={e=>e.stopPropagation()}>
        <LToastEl/>
        {/* Header */}
        <div style={{background:NAVY_LOCAL,padding:"12px 16px",display:"flex",
          alignItems:"center",justifyContent:"space-between"}}>
          <span style={{color:"white",fontWeight:700,fontSize:14,
            fontFamily:"'Poppins',sans-serif"}}>✏️ Modifica Prenotazione</span>
          <button onClick={onClose}
            style={{background:"rgba(255,255,255,.15)",border:"none",color:"white",
              cursor:"pointer",fontSize:18,width:28,height:28,borderRadius:6,
              display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        {/* Form */}
        <div style={{padding:16,display:"flex",flexDirection:"column",gap:10}}>
          {/* Nome + VIP */}
          <div>
            <FL>Nome *</FL>
            <div style={{display:"flex",gap:6}}>
              <input value={form.nome} onChange={e=>ff("nome")(e.target.value)}
                style={{...IS,flex:1}}/>
              <button type="button" onClick={()=>ff("is_vip")(!form.is_vip)}
                style={{width:34,flexShrink:0,border:"1.5px solid "+(form.is_vip?"#f59e0b":"#DBDBDB"),
                  borderRadius:7,background:form.is_vip?"#fffbeb":"white",
                  cursor:"pointer",fontSize:16}}>
                {form.is_vip?"⭐":"☆"}
              </button>
            </div>
          </div>
          {/* Telefono + Coperti */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div><FL>Telefono</FL>
              <input value={form.telefono} onChange={e=>ff("telefono")(e.target.value)} style={IS}/>
            </div>
            <div><FL>Coperti</FL>
              <input type="number" min="1" value={form.coperti}
                onChange={e=>ff("coperti")(e.target.value)} style={IS}/>
            </div>
          </div>
          {/* Turno + Orario */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div>
              <FL>Turno</FL>
              <select value={form.turno_id} onChange={e=>{
                const t=turni.find(x=>String(x.id)===e.target.value);
                if(t){const s=slotsTurno(t);setForm(p=>({...p,turno_id:e.target.value,orario:s.includes(p.orario)?p.orario:(s[0]||p.orario)}));}
                else ff("turno_id")(e.target.value);
              }} style={IS}>
                <option value="">— Nessuno —</option>
                {turni.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div>
              <FL>Orario</FL>
              {slots.length>0 ? (
                <select value={form.orario} onChange={e=>ff("orario")(e.target.value)} style={IS}>
                  {slots.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input type="time" value={form.orario}
                  onChange={e=>ff("orario")(e.target.value)} style={IS}/>
              )}
            </div>
          </div>
          {/* Note */}
          <div>
            <FL>Note</FL>
            <textarea value={form.note} onChange={e=>ff("note")(e.target.value)}
              rows={3} style={{...IS,resize:"none"}}/>
          </div>
          {/* Buttons */}
          <div style={{display:"flex",gap:8,paddingTop:4}}>
            <button onClick={handleDelete} disabled={deleting}
              style={{padding:"8px 14px",borderRadius:6,
                border:"1.5px solid #FF616E",background:"#FFF0F1",
                color:"#D10011",cursor:"pointer",fontSize:12,fontWeight:600,
                opacity:deleting?.7:1}}>
              {deleting?"...":"🗑 Elimina"}
            </button>
            <div style={{flex:1}}/>
            <button onClick={onClose}
              style={{padding:"8px 18px",borderRadius:6,border:"1.5px solid #CFCFCF",
                background:"white",cursor:"pointer",fontSize:12,fontWeight:600,color:"#6E7175"}}>
              Annulla
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{padding:"8px 22px",borderRadius:6,border:"none",
                background:NAVY_LOCAL,color:"white",cursor:"pointer",
                fontSize:12,fontWeight:700,opacity:saving?.7:1}}>
              {saving?"...":"Salva"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Modal Sposta Tavolo --------------------------------------------------------
function ModalSposta({ tavolo, onClose, onConfirm }) {
  const [outlets, setOutlets]   = useState([]);
  const [selOut,  setSelOut]    = useState(null);
  const [sale,    setSale]      = useState([]);
  const [selSala, setSelSala]   = useState(null);
  const [tavoli,  setTavoli]    = useState([]);
  const [selDest, setSelDest]   = useState(null);
  const [loading, setLoading]   = useState(false);

  useEffect(()=>{
    api.getOutlets().then(d=>{ setOutlets(d); if(d.length) setSelOut(d[0]); });
  },[]);

  useEffect(()=>{
    if(!selOut) return;
    api.getSale(selOut.id).then(d=>{ setSale(d); if(d.length) setSelSala(d[0]); });
  },[selOut?.id]);

  useEffect(()=>{
    if(!selSala) return;
    api.getTavoli(selSala.id, null, null).then(d=>setTavoli(d.filter(t=>t.status==="disponibile"&&t.id!==tavolo.id)));
  },[selSala?.id]);

  const handleConfirm = async () => {
    if(!selDest) return;
    setLoading(true);
    try { await onConfirm(selDest); }
    finally { setLoading(false); }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(32,71,105,.45)",zIndex:1000,
      display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"white",borderRadius:14,width:460,overflow:"hidden",
        boxShadow:"0 16px 48px rgba(32,71,105,.2)"}}>
        <div style={{background:NAVY,padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{color:"white",fontWeight:700,fontSize:15,fontFamily:"'Poppins',sans-serif"}}>🔀 Sposta Tavolo {tavolo.numero}</span>
          <button onClick={onClose} style={{background:"rgba(255,255,255,.15)",border:"none",color:"white",cursor:"pointer",fontSize:18,width:28,height:28,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        <div style={{padding:20}}>
          <p style={{fontSize:13,color:"#6E7175",marginBottom:16}}>Seleziona il tavolo destinazione (solo tavoli liberi):</p>
          {/* Outlet + Sala selectors */}
          <div style={{display:"flex",gap:10,marginBottom:12}}>
            <select value={selOut?.id||""} onChange={e=>setSelOut(outlets.find(x=>x.id===parseInt(e.target.value)))}
              style={{flex:1,height:34,border:"1.5px solid #CFCFCF",borderRadius:6,padding:"0 8px",fontSize:12,fontWeight:600,color:NAVY,outline:"none"}}>
              {outlets.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
            <select value={selSala?.id||""} onChange={e=>setSelSala(sale.find(x=>x.id===parseInt(e.target.value)))}
              style={{flex:1,height:34,border:"1.5px solid #CFCFCF",borderRadius:6,padding:"0 8px",fontSize:12,fontWeight:600,color:NAVY,outline:"none"}}>
              {sale.map(s=><option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          {/* Tavoli liberi grid */}
          {tavoli.length===0 ? (
            <div style={{textAlign:"center",padding:"20px",color:"#A9AAAD",fontSize:12}}>Nessun tavolo libero in questa sala</div>
          ) : (
            <div style={{display:"flex",flexWrap:"wrap",gap:8,maxHeight:200,overflowY:"auto",marginBottom:16}} className="scrollbar-light">
              {tavoli.map(t=>(
                <button key={t.id} onClick={()=>setSelDest(t)}
                  style={{width:70,padding:"8px 4px",borderRadius:8,border:"1.5px solid "+(selDest?.id===t.id?"#00CF86":"#DBDBDB"),
                    background:selDest?.id===t.id?"#E4F8EE":"white",cursor:"pointer",
                    fontSize:12,fontWeight:700,color:selDest?.id===t.id?"#007035":NAVY,
                    textAlign:"center",transition:"all .12s"}}>
                  {t.numero}<br/><span style={{fontSize:9,fontWeight:400,color:"#A9AAAD"}}>{t.capienza}p</span>
                </button>
              ))}
            </div>
          )}
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button onClick={onClose} style={{padding:"8px 20px",borderRadius:6,border:"1.5px solid #CFCFCF",background:"white",cursor:"pointer",fontSize:13,fontWeight:600,color:"#6E7175"}}>Annulla</button>
            <button onClick={handleConfirm} disabled={!selDest||loading}
              style={{padding:"8px 24px",borderRadius:6,border:"none",background:selDest?NAVY:"#A9AAAD",cursor:selDest?"pointer":"not-allowed",fontSize:13,fontWeight:700,color:"white"}}>
              {loading?"...":"Sposta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Modal Unisci Tavolo --------------------------------------------------------
function ModalUnisci({ tavolo, selSala, selTurno, onClose, onConfirm }) {
  const [tavoli,   setTavoli]   = useState([]);
  const [selDests, setSelDests] = useState([]); // multi-select
  const [loading,  setLoading]  = useState(false);

  useEffect(()=>{
    if(!selSala) return;
    // Show ALL tavoli in same sala except source (any status/state)
    api.getTavoli(selSala.id, null, null).then(d=>
      setTavoli(d.filter(t => t.id !== tavolo.id && !t.tavolo_unito_id))
    );
  },[selSala?.id]);

  const toggle = t => {
    setSelDests(prev => prev.some(x=>x.id===t.id) ? prev.filter(x=>x.id!==t.id) : [...prev,t]);
  };

  const handleConfirm = async () => {
    if(!selDests.length) return;
    setLoading(true);
    try {
      // Unisci one by one sequentially
      for(const dest of selDests) { await onConfirm(dest); }
    } finally { setLoading(false); }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(32,71,105,.45)",zIndex:1000,
      display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"white",borderRadius:14,width:460,overflow:"hidden",
        boxShadow:"0 16px 48px rgba(32,71,105,.2)"}}>
        <div style={{background:NAVY,padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{color:"white",fontWeight:700,fontSize:15,fontFamily:"'Poppins',sans-serif"}}>
            🔗 Unisci Tavolo {tavolo.numero}
          </span>
          <button onClick={onClose} style={{background:"rgba(255,255,255,.15)",border:"none",color:"white",cursor:"pointer",fontSize:18,width:28,height:28,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        <div style={{padding:20}}>
          <p style={{fontSize:13,color:"#6E7175",marginBottom:4}}>
            Seleziona uno o più tavoli da unire (stessa sala, qualsiasi stato):
          </p>
          <p style={{fontSize:11,color:"#A9AAAD",marginBottom:14}}>
            {selDests.length>0 ? selDests.map(t=>"T."+t.numero).join(" + ")+" selezionati" : "Nessun tavolo selezionato"}
          </p>
          {tavoli.length===0 ? (
            <div style={{textAlign:"center",padding:"20px",color:"#A9AAAD",fontSize:12}}>Nessun altro tavolo disponibile</div>
          ) : (
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16,maxHeight:200,overflowY:"auto"}} className="scrollbar-light">
              {tavoli.map(t=>{
                const isSel = selDests.some(x=>x.id===t.id);
                const statColor = t.status==="occupato"?"#FF616E":t.status==="attesa_ordine"?"#5C9CD4":"#00CF86";
                return (
                  <button key={t.id} onClick={()=>toggle(t)}
                    style={{width:80,padding:"8px 4px",borderRadius:8,
                      border:"1.5px solid "+(isSel?"#5C9CD4":"#DBDBDB"),
                      background:isSel?"#eff6ff":"white",cursor:"pointer",
                      fontSize:12,fontWeight:700,color:isSel?"#1d4ed8":NAVY,
                      textAlign:"center",transition:"all .12s",position:"relative"}}>
                    {isSel&&<span style={{position:"absolute",top:-5,right:-5,background:"#5C9CD4",color:"white",borderRadius:"50%",width:16,height:16,fontSize:9,display:"flex",alignItems:"center",justifyContent:"center"}}>✓</span>}
                    {t.numero}<br/>
                    <span style={{fontSize:9,color:statColor}}>
                      {t.totale_oggi>0?"€"+t.totale_oggi.toFixed(2):t.status==="disponibile"?"libero":t.status}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button onClick={onClose} style={{padding:"8px 20px",borderRadius:6,border:"1.5px solid #CFCFCF",background:"white",cursor:"pointer",fontSize:13,fontWeight:600,color:"#6E7175"}}>Annulla</button>
            <button onClick={handleConfirm} disabled={!selDests.length||loading}
              style={{padding:"8px 24px",borderRadius:6,border:"none",
                background:selDests.length&&!loading?NAVY:"#A9AAAD",
                cursor:selDests.length&&!loading?"pointer":"not-allowed",
                fontSize:13,fontWeight:700,color:"white"}}>
              {loading?"...":`Unisci ${selDests.length>0?"("+selDests.length+")":""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Modal Chiudi e Paga --------------------------------------------------------
function ModalPaga({ tavolo, comanda, onClose, onConfirm }) {
  const [tipo,    setTipo]    = useState("scontrino");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try { await onConfirm(tipo); }
    finally { setLoading(false); }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(32,71,105,.45)",zIndex:1000,
      display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"white",borderRadius:14,width:380,overflow:"hidden",
        boxShadow:"0 16px 48px rgba(32,71,105,.2)"}}>
        <div style={{background:NAVY,padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{color:"white",fontWeight:700,fontSize:15,fontFamily:"'Poppins',sans-serif"}}>🏁 Chiudi e Paga – T.{tavolo.numero}</span>
          <button onClick={onClose} style={{background:"rgba(255,255,255,.15)",border:"none",color:"white",cursor:"pointer",fontSize:18,width:28,height:28,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        <div style={{padding:20}}>
          <div style={{fontSize:14,color:"#4A4D53",marginBottom:16}}>
            Comanda n° <strong>{comanda?.numero||"—"}</strong> · Totale:
            <strong style={{fontSize:18,color:NAVY,marginLeft:8}}>€ {tavolo.totale_oggi?.toFixed(2)||"0.00"}</strong>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
            {[{v:"scontrino",l:"🖨️ Emetti scontrino"},{v:"fattura",l:"📄 Emetti fattura"},{v:"conto_camera",l:"🏨 Addebita camera"}].map(opt=>(
              <label key={opt.v} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
                borderRadius:8,border:"1.5px solid "+(tipo===opt.v?NAVY:"#DBDBDB"),
                background:tipo===opt.v?"#f2f5f6":"white",cursor:"pointer",fontSize:13,fontWeight:600,color:"#4A4D53"}}>
                <input type="radio" checked={tipo===opt.v} onChange={()=>setTipo(opt.v)} style={{accentColor:NAVY}}/>{opt.l}
              </label>
            ))}
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button onClick={onClose} style={{padding:"8px 20px",borderRadius:6,border:"1.5px solid #CFCFCF",background:"white",cursor:"pointer",fontSize:13,fontWeight:600,color:"#6E7175"}}>Annulla</button>
            <button onClick={handleConfirm} disabled={loading}
              style={{padding:"8px 24px",borderRadius:6,border:"none",background:NAVY,cursor:"pointer",fontSize:13,fontWeight:700,color:"white"}}>
              {loading?"...":"Conferma pagamento"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SalaRistorante({ onGestione, initSala, initOutlet, onGoPrenotazioni }) {
  const [outlets, setOutlets]       = useState([]);
  const [selOutlet, setSelOutlet]   = useState(null);
  const [sale, setSale]             = useState([]);
  const [selSala, setSelSala]       = useState(null);
  const [tavoli, setTavoli]         = useState([]);
  const [selDate, setSelDate]       = useState(new Date());
  const [selService, setSelService] = useState("Pranzo");
  const [turni, setTurni]           = useState([]);
  const [selTurno, setSelTurno]     = useState(null);
  const [stats, setStats]           = useState({});
  const [prenOggi, setPrenOggi]     = useState([]);
  const [pagina, setPagina]         = useState(0);
  const [tavoliPP, setTavoliPP]     = useState(20);
  const [ctxId, setCtxId]           = useState(null);
  const containerRef                = useRef(null);
  const { toast, ToastEl }          = useToast();
  const [tooltip, setTooltip]       = useState(null);   // {x,y,pren}
  const [modalNota,   setModalNota]   = useState(null); // pren obj for note display
  const [modalEditPren, setModalEditPren] = useState(null); // pren obj for edit
  const [modalSposta, setModalSposta] = useState(null);  // tavolo obj
  const [modalUnisci, setModalUnisci] = useState(null);  // tavolo obj
  const [modalPaga,   setModalPaga]   = useState(null);  // {tavolo, comanda}

  const dateStr = `${selDate.getFullYear()}-${String(selDate.getMonth()+1).padStart(2,"0")}-${String(selDate.getDate()).padStart(2,"0")}`;

  // Touch swipe
  const touchX = useRef(null);
  const onTS = e => { touchX.current = e.touches[0].clientX; };
  const onTE = e => {
    if(!touchX.current) return;
    const d = touchX.current - e.changedTouches[0].clientX;
    if(Math.abs(d)>50){ d>0?gotoNext():gotoPrev(); }
    touchX.current = null;
  };

  useEffect(()=>{
    // Only show outlets that have at least one sala with at least one tavolo
    api.getOutlets().then(async d=>{
      const withTavoli = [];
      for(const o of d){
        const sale=await api.getSale(o.id);
        let hasTavoli=false;
        for(const s of sale){
          const t=await api.getTavoli(s.id, selTurno?.id, dateStr);
          if(t.length){hasTavoli=true;break;}
        }
        if(hasTavoli) withTavoli.push(o);
      }
      setOutlets(withTavoli);
      // Prefer the outlet we came from (initOutlet), else first
      const preferred = initOutlet ? withTavoli.find(o=>o.id===initOutlet.id) : null;
      if(preferred) setSelOutlet(preferred);
      else if(withTavoli.length) setSelOutlet(withTavoli[0]);
    });
  },[]);

  useEffect(()=>{
    if(!selOutlet) return;
    api.getSale(selOutlet.id).then(d=>{
      setSale(d);
      // Prefer the sala we came from
      const preferred = initSala ? d.find(s=>s.id===initSala.id) : null;
      selectSala(preferred || (d.length ? d[0] : null));
    });
    api.getTurni(`?outlet_id=${selOutlet.id}`).then(d=>{
      setTurni(d);
      // Auto-select turno by current time
      const now = new Date();
      const nowMins = now.getHours()*60+now.getMinutes();
      const toMin = s => { if(!s) return 0; const [h,m]=s.split(":").map(Number); return h*60+m; };
      const current = d.find(t => t.ora_inizio && t.ora_fine &&
        nowMins >= toMin(t.ora_inizio) && nowMins <= toMin(t.ora_fine));
      const future = [...d].filter(t=>t.ora_inizio&&toMin(t.ora_inizio)>nowMins)
        .sort((a,b)=>toMin(a.ora_inizio)-toMin(b.ora_inizio));
      const auto = current || future[0] || (d.length?d[0]:null);
      if(auto) {
        setSelTurno(auto);
        if(auto.servizio) setSelService(auto.servizio);
      }
    });
  },[selOutlet]);

  // Reload tavoli display when turno or service changes (status depends on these)
  useEffect(()=>{
    if(!selSala) return;
    api.getTavoli(selSala.id, selTurno?.id, dateStr).then(ts=>setTavoli(enrichTavoli(ts,prenOggi))).catch(()=>{});
  },[selTurno?.id, selService]); // eslint-disable-line

  // Reload prenotazioni + tavoli + stats when date, sala, or outlet changes
  useEffect(()=>{
    if(!selOutlet || !selSala) return;
    Promise.all([
      api.getPrenotazioni("?outlet_id="+selOutlet.id+"&data="+dateStr+"&sala_id="+selSala.id),
      api.getTavoli(selSala.id, selTurno?.id, dateStr),
      api.getSalaStats(selSala.id, dateStr),
    ]).then(([ps, ts, st]) => {
      setPrenOggi(ps);
      setTavoli(enrichTavoli(ts, prenOggi, selTurno?.id, selService));
      setStats(st);
    }).catch(()=>{});
  },[selOutlet?.id, dateStr, selSala?.id]); // eslint-disable-line

  const enrichTavoli = (tavList, prenList, turnoId, service) => {
    const byId = Object.fromEntries(tavList.map(t => [t.id, t]));

    // For STATUS and badge: only exact turno match
    const prenThisTurno = turnoId
      ? (prenList||[]).filter(p => p.turno_id === turnoId)
      : (prenList||[]);

    // For UNION LINKS: same service (spans turni of same service, but NOT other services)
    const prenSameService = service
      ? (prenList||[]).filter(p => !p.servizio || p.servizio === service)
      : (prenList||[]);

    return tavList.map(t => {
      const partner = t.tavolo_unito_id ? byId[t.tavolo_unito_id] : null;

      // _pren for badge: exact turno only
      const prenBadge = prenThisTurno.find(p =>
        p.tavolo_id === t.id || p.tavolo_unito_id === t.id
      ) || (!prenThisTurno.find(p => p.tavolo_id === t.id) && partner
        ? prenThisTurno.find(p => p.tavolo_id === partner.id) : null) || null;

      // pren for union link: same service (any turno)
      const prenLink = prenSameService.find(p =>
        p.tavolo_id === t.id || p.tavolo_unito_id === t.id
      ) || (partner ? prenSameService.find(p => p.tavolo_id === partner.id) : null) || null;

      // Union link valid only if same-service pren exists
      const hasValidLink = !!(t.tavolo_unito_id && partner && prenLink);
      const label = hasValidLink ? ("T." + partner.numero) : null;

      let isSecondary = false;
      if (hasValidLink) {
        if (!partner.tavolo_unito_id) {
          isSecondary = true;
        } else if (partner.tavolo_unito_id === t.id) {
          isSecondary = (parseInt(t.numero)||0) > (parseInt(partner.numero)||0);
          if (t.status === "attesa_ordine" && partner.status === "occupato") isSecondary = true;
        }
      }

      const effectiveSecondary = isSecondary && prenLink !== null;
      const displayStatus = effectiveSecondary ? (partner.status || t.status) : t.status;

      return {
        ...t,
        status: displayStatus,
        tavolo_unito_label: label,
        is_secondary: effectiveSecondary,
        _pren: prenBadge,       // badge: only exact turno
        _prenLink: prenLink,    // union: same service
      };
    });
  };
  const selectSala = async s => {
    setSelSala(s); setPagina(0); setCtxId(null);
    const [t,st] = await Promise.all([api.getTavoli(s.id, selTurno?.id, dateStr), api.getSalaStats(s.id, dateStr)]);
    setTavoli(enrichTavoli(t, prenOggi, selTurno?.id, selService)); setStats(st);
  };

  const refresh = async () => {
    if(!selSala) return; setCtxId(null);
    const [t,st,ps] = await Promise.all([
      api.getTavoli(selSala.id, selTurno?.id, dateStr),
      api.getSalaStats(selSala.id, dateStr),
      selOutlet ? api.getPrenotazioni("?outlet_id="+selOutlet.id+"&data="+dateStr+"&sala_id="+selSala.id) : Promise.resolve([])
    ]);
    setPrenOggi(ps); setTavoli(enrichTavoli(t, ps, selTurno?.id, selService)); setStats(st);
  };

  // Calc page size
  useEffect(()=>{
    const calc=()=>{
      if(!containerRef.current) return;
      const {width,height}=containerRef.current.getBoundingClientRect();
      const cols=Math.max(1,Math.floor((width-16+12)/(148+12)));
      const rows=Math.max(1,Math.floor((height-16+12)/(210+12)));
      setTavoliPP(cols*rows);
    };
    calc();
    const ro=new ResizeObserver(calc);
    if(containerRef.current) ro.observe(containerRef.current);
    return()=>ro.disconnect();
  },[]);

  useEffect(()=>{setPagina(0);},[selSala?.id]);

  const totalePagine = Math.max(1,Math.ceil(tavoli.length/tavoliPP));
  const tavoliPagina = tavoli.slice(pagina*tavoliPP,(pagina+1)*tavoliPP);
  const gotoPrev = ()=>{setCtxId(null);setPagina(p=>Math.max(0,p-1));};
  const gotoNext = ()=>{setCtxId(null);setPagina(p=>Math.min(totalePagine-1,p+1));};

  const turniServizio = turni.filter(t=>t.servizio===selService);

  // Context menu action handler
  const handleCtxAction = async (t, action) => {
    const token = localStorage.getItem("outlet_token")||"";
    setCtxId(null);
    try {
      // --- Gestisci comanda ---
      if(action==="gestione"){
        await api.patchTavolo(t.id,{status:"attesa_ordine",turno_occupato_id:selTurno?.id||null});
        await refresh();
        onGestione&&onGestione(t,selSala,selOutlet,selTurno);
        return;
      }
      // --- Check-in ---
      if(action==="checkin"){
        const p=prenOggi.find(p=>p.tavolo_id===t.id);
        if(!p){toast("Nessuna prenotazione associata","error");return;}
        const r=await fetch("/api/prenotazioni/"+p.id+"/checkin",{
          method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token}
        });
        if(r.ok){toast("Check-in "+p.nome+" OK");await refresh();}
        else{const d=await r.json();toast(d.error||"Errore","error");}
        return;
      }
      // --- Estratto conto ---
      if(action==="estratto"){
        const comande=await api.getComande("?tavolo_id="+t.id+"&status=aperta");
        if(!comande.length){toast("Nessuna comanda aperta","error");return;}
        const r2=await fetch("/api/comande/"+comande[0].id+"/estratto-conto",{headers:{Authorization:"Bearer "+token}});
        const d2=await r2.json();
        printEstrattoConto(d2);
        return;
      }
      // --- Sposta tavolo ---
      if(action==="sposta"){ setModalSposta(t); return; }
      // --- Unisci tavolo ---
      if(action==="unisci"){ setModalUnisci(t); return; }
      // --- Chiudi e paga ---
      if(action==="paga"){
        const comande=await api.getComande("?tavolo_id="+t.id+"&status=aperta");
        setModalPaga({tavolo:t, comanda:comande.length?comande[0]:null});
        return;
      }
      // --- Libera tavolo (solo dopo pagamento) ---
      if(action==="libera"){
        const r=await fetch("/api/tavoli/"+t.id+"/libera",{
          method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token}
        });
        const d=await r.json();
        if(!r.ok){toast(d.error||"Errore","error");return;}
        toast("Tavolo "+t.numero+" liberato");
        await refresh();
        return;
      }
      // --- Chiesto conto ---
      if(action==="chiesto_conto"){
        await api.patchTavolo(t.id,{status:"chiesto_conto"});
        await refresh();
        return;
      }
      // --- Dividi tavolo ---
      if(action==="dividi") {
        const r = await fetch("/api/tavoli/"+t.id+"/dividi",{
          method:"POST",
          headers:{"Content-Type":"application/json",Authorization:"Bearer "+token}
        });
        const d = await r.json();
        if(!r.ok){toast(d.error||"Errore divisione","error");return;}
        toast("✂️ Tavolo "+t.numero+" separato");
        await refresh();
        return;
      }
      // --- Azioni generiche ---
      if(action==="bloccato") {
        // Block only for current date + turno
        await api.patchTavolo(t.id,{
          status:"bloccato",
          bloccato:true,
          bloccato_data:dateStr,
          bloccato_turno_id:selTurno?.id||null,
        });
      } else if(action==="disponibile") {
        await api.patchTavolo(t.id,{
          status:"disponibile",
          coperti_attuali:0,
          turno_occupato_id:null,
          pagato:false,
          bloccato:false,
          bloccato_data:null,
          bloccato_turno_id:null,
        });
      } else {
        await api.patchTavolo(t.id,{status:action});
      }
      await refresh();
    } catch(e){toast(e.message,"error");}
  };

  // -- Sposta tavolo handler ------------------------------------------------
  const handleSposta = async (nuovoTavolo) => {
    const token = localStorage.getItem("outlet_token")||"";
    try {
      let comande = await api.getComande("?tavolo_id="+modalSposta.id+"&status=aperta");
      // If attesa_ordine has no comanda yet, create an empty one to carry the table context
      if(!comande.length) {
        const newC = await api.createComanda({
          tavolo_id: modalSposta.id,
          turno_id: selTurno?.id||null,
          outlet_id: selOutlet?.id||null,
          numero: "000",
          coperti: modalSposta.capienza||2,
          note:"", righe:[]
        });
        comande = [newC];
      }
      const r = await fetch("/api/comande/"+comande[0].id+"/sposta",{
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
        body:JSON.stringify({nuovo_tavolo_id:nuovoTavolo.id})
      });
      const d = await r.json();
      if(!r.ok){toast(d.error||"Errore spostamento","error");return;}
      toast("Comanda spostata su T."+nuovoTavolo.numero);
      setModalSposta(null);
      await refresh();
    } catch(e){toast(e.message,"error");}
  };

  // -- Unisci tavolo handler ------------------------------------------------
  const handleUnisci = async (altroTavolo) => {
    const token = localStorage.getItem("outlet_token")||"";
    try {
      // Get or create comanda on source table
      let comande = await api.getComande("?tavolo_id="+modalUnisci.id+"&status=aperta");
      let comandaId;
      if(comande.length) {
        comandaId = comande[0].id;
      } else {
        // Create empty comanda to link the tables
        const newC = await api.createComanda({
          tavolo_id: modalUnisci.id,
          turno_id: selTurno?.id||null,
          outlet_id: selOutlet?.id||null,
          numero: "000",
          coperti: modalUnisci.capienza||2,
          note:"", righe:[]
        });
        comandaId = newC.id;
      }
      const r = await fetch("/api/comande/"+comandaId+"/unisci",{
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
        body:JSON.stringify({altro_tavolo_id:altroTavolo.id})
      });
      const d = await r.json();
      if(!r.ok){toast(d.error||"Errore unione","error");return;}
      toast("T."+modalUnisci.numero+" unito con T."+altroTavolo.numero);
      setModalUnisci(null);
      await refresh();
    } catch(e){toast(e.message,"error");}
  };

  // -- Paga handler ---------------------------------------------------------
  const handlePaga = async (tipo) => {
    const token = localStorage.getItem("outlet_token")||"";
    try {
      if(!modalPaga?.comanda){toast("Nessuna comanda aperta","error");setModalPaga(null);return;}
      const r = await fetch("/api/comande/"+modalPaga.comanda.id+"/paga",{
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
        body:JSON.stringify({tipo_chiusura:tipo})
      });
      const d = await r.json();
      if(!r.ok){toast(d.error||"Errore pagamento","error");return;}
      // Print PDF receipt
      const r2 = await fetch("/api/comande/"+modalPaga.comanda.id+"/estratto-conto",{
        headers:{Authorization:"Bearer "+token}
      });
      if(r2.ok){
        const dPdf = await r2.json();
        dPdf.status = "chiusa"; dPdf.tipo_chiusura = tipo;
        printEstrattoConto(dPdf);
      }
      toast("Conto chiuso - ricevuta generata");
      setModalPaga(null);
      await refresh();
    } catch(e){toast(e.message,"error");}
  };


  // Stats
  // Compute stats directly from tavoli (always in sync)
  const liberi    = tavoli.filter(t=>t.status==="disponibile").length;
  const attesa    = tavoli.filter(t=>t.status==="attesa_ordine").length;
  const occupati  = tavoli.filter(t=>t.status==="occupato").length;
  const conto     = tavoli.filter(t=>t.status==="chiesto_conto").length;
  const pagati    = tavoli.filter(t=>t.pagato).length;
  const riservati = tavoli.filter(t=>t.status==="riservato").length;
  const bloccati  = tavoli.filter(t=>t.status==="bloccato").length;
  const prenDaArr = prenOggi.filter(p=>p.tavolo_id&&tavoli.find(t=>t.id===p.tavolo_id&&t.status==="riservato"));

  const _pL = pagina > 0 ? "52px" : "16px";
  const _pR = pagina < totalePagine-1 ? "52px" : "16px";
  const paddingGrid = "14px " + _pR + " 14px " + _pL;
  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",overflow:"hidden",background:"#f2f5f6"}}>
      <ToastEl/>

      {/* -- Top bar ------------------------------------------------------- */}
      <div style={{background:NAVY,padding:"0 20px",height:60,display:"flex",
        alignItems:"center",gap:16,flexShrink:0,flexWrap:"nowrap"}}>

        {/* Outlet label + select inline, same height as sale buttons */}
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,color:"rgba(255,255,255,.55)",fontWeight:700,
            textTransform:"uppercase",letterSpacing:.7,whiteSpace:"nowrap"}}>I miei Outlet</span>
          <select value={selOutlet?.id||""} onChange={e=>{const o=outlets.find(x=>x.id===parseInt(e.target.value));setSelOutlet(o);}}
            style={{height:30,border:"1px solid rgba(255,255,255,.35)",borderRadius:6,
              padding:"0 26px 0 10px",fontSize:12,fontWeight:600,color:"white",
              background:"rgba(255,255,255,.1)",cursor:"pointer",outline:"none",
              appearance:"none",
              backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='white'/%3E%3C/svg%3E")`,
              backgroundRepeat:"no-repeat",backgroundPosition:"right 8px center"}}>
            {outlets.map(o=><option key={o.id} value={o.id} style={{background:NAVY}}>{o.nome}</option>)}
          </select>
        </div>

        <div style={{width:1,height:30,background:"rgba(255,255,255,.2)",flexShrink:0}}/>

        {/* Sale buttons — same height 30px */}
        <div style={{display:"flex",gap:6}}>
          {sale.map(s=>(
            <button key={s.id} onClick={()=>selectSala(s)}
              style={{height:30,padding:"0 14px",borderRadius:6,fontWeight:600,fontSize:12,cursor:"pointer",
                border:"1.5px solid " + (selSala?.id===s.id ? "white" : "rgba(255,255,255,.35)"),
                background:selSala?.id===s.id?"white":"transparent",
                color:selSala?.id===s.id?NAVY:"white",
                transition:"all .15s",whiteSpace:"nowrap"}}>
              {s.nome}
            </button>
          ))}
        </div>

        <div style={{flex:1}}/>

        {/* Action buttons */}
        <div style={{display:"flex",gap:8}}>
          <button style={{height:32,padding:"0 14px",borderRadius:6,fontWeight:700,fontSize:11,
            border:`1.5px solid rgba(255,255,255,.35)`,background:"transparent",
            color:"white",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.12)"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            Crea Ranghi
          </button>
          <button onClick={e=>{ e.stopPropagation(); onGoPrenotazioni&&onGoPrenotazioni(null,selOutlet,selSala,selTurno); }}
            style={{height:32,padding:"0 14px",borderRadius:6,fontWeight:700,fontSize:11,
              border:"1.5px solid rgba(255,255,255,.35)",background:"rgba(255,255,255,.08)",
              color:"white",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.2)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.08)"}>
            📋 Prenotazioni
          </button>
          <button onClick={refresh}
            style={{height:32,padding:"0 14px",borderRadius:6,fontWeight:700,fontSize:11,
              border:"1.5px solid rgba(255,255,255,.35)",background:"transparent",
              color:"white",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.12)"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <RefreshCw size={13}/>
            Aggiorna
          </button>
        </div>
      </div>

      {/* -- Body ----------------------------------------------------------- */}
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>

        {/* Griglia tavoli */}
        <div style={{flex:1,display:"flex",position:"relative",overflow:"hidden"}}>
          {/* Freccia SX */}
          {pagina>0&&(
            <div style={{position:"absolute",left:0,top:0,bottom:0,width:48,zIndex:10,
              pointerEvents:"none",background:"linear-gradient(to right,rgba(242,245,246,1) 40%,transparent)"}}>
              <button onClick={gotoPrev}
                style={{position:"absolute",left:6,top:"50%",transform:"translateY(-50%)",
                  width:34,height:56,borderRadius:8,background:"white",cursor:"pointer",pointerEvents:"all",
                  border:"1px solid #DBDBDB",boxShadow:"0 2px 8px rgba(32,71,105,.1)",
                  display:"flex",alignItems:"center",justifyContent:"center",color:NAVY}}
                onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 14px rgba(32,71,105,.18)"}
                onMouseLeave={e=>e.currentTarget.style.boxShadow="0 2px 8px rgba(32,71,105,.1)"}>
                <ChevronLeft size={20}/>
              </button>
            </div>
          )}

          {/* Cards area */}
          <div ref={containerRef}
            style={{flex:1,
              padding:paddingGrid,
              overflow:"hidden"}}
            onTouchStart={onTS} onTouchEnd={onTE}
            onClick={()=>ctxId&&setCtxId(null)}>

            {tavoli.length===0 ? (
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",
                justifyContent:"center",height:"100%",color:"#A9AAAD",gap:10}}>
                <span style={{fontSize:44}}>🪑</span>
                <span style={{fontSize:14,fontFamily:"'Open Sans',sans-serif"}}>Nessun tavolo configurato per questa sala</span>
              </div>
            ) : (
              <div style={{display:"flex",flexWrap:"wrap",gap:12,alignContent:"flex-start"}}>
                {tavoliPagina.map(t=>{
                  const isCtx = ctxId===t.id;
                  return (
                    <div key={t.id} style={{position:"relative"}}>
                      <TavoloCard t={t} prenOggi={prenOggi} ctxOpen={isCtx}
                        onCtxToggle={id=>setCtxId(ctxId===id?null:id)}
                        onOpen={tav=>onGestione&&onGestione(tav,selSala,selOutlet,selTurno)}
                        setTooltip={setTooltip}
                        setModalNota={setModalNota}
                        setModalEditPren={setModalEditPren}
                        selTurno={selTurno}
                        turni={turni}
                        dateStr={dateStr}
                        selService={selService}/>
                      {isCtx&&(
                        <CtxMenu t={t} pren={prenOggi.find(p=>p.tavolo_id===t.id)}
                          turni={turni}
                          onClose={(act)=>{ if(act) handleCtxAction(t,act); else setCtxId(null); }}/>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Freccia DX */}
          {pagina<totalePagine-1&&(
            <div style={{position:"absolute",right:0,top:0,bottom:0,width:48,zIndex:10,
              pointerEvents:"none",background:"linear-gradient(to left,rgba(242,245,246,1) 40%,transparent)"}}>
              <button onClick={gotoNext}
                style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",
                  width:34,height:56,borderRadius:8,background:"white",cursor:"pointer",pointerEvents:"all",
                  border:"1px solid #DBDBDB",boxShadow:"0 2px 8px rgba(32,71,105,.1)",
                  display:"flex",alignItems:"center",justifyContent:"center",color:NAVY}}
                onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 14px rgba(32,71,105,.18)"}
                onMouseLeave={e=>e.currentTarget.style.boxShadow="0 2px 8px rgba(32,71,105,.1)"}>
                <ChevronRight size={20}/>
              </button>
            </div>
          )}
        </div>

        {/* -- Right panel ----------------------------------------------- */}
        <div style={{width:260,background:"white",borderLeft:"1px solid #DBDBDB",
          display:"flex",flexDirection:"column",flexShrink:0,overflowY:"auto",
          padding:"16px 16px 20px"}} className="scrollbar-light">

          {/* Title: Servizio + Turno corrente */}
          <div style={{marginBottom:16}}>
            <h3 style={{fontSize:17,fontWeight:700,color:NAVY,fontFamily:"'Poppins',sans-serif",margin:0}}>
              {selService} {selTurno?`Turno ${turniServizio.indexOf(selTurno)+1}`:""}
            </h3>
          </div>

          {/* Calendar */}
          <div style={{marginBottom:16,paddingBottom:16,borderBottom:"1px solid #f2f5f6"}}>
            <BigCalendar sel={selDate} onSel={d=>{setSelDate(d);}}/>
          </div>

          {/* Turni e servizi */}
          <div style={{marginBottom:16,paddingBottom:16,borderBottom:"1px solid #f2f5f6"}}>
            <div style={{fontSize:12,fontWeight:700,color:NAVY,marginBottom:10,
              fontFamily:"'Poppins',sans-serif"}}>Turni e servizi</div>

            {/* Servizio */}
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
              <span style={{fontSize:11,color:"#6E7175",minWidth:54,fontWeight:600}}>Servizio:</span>
              <div style={{display:"flex",gap:4,flex:1}}>
                {SERVIZI.map(sv=>(
                  <button key={sv}
                    onClick={()=>{
                      setSelService(sv);
                      const ts=turni.filter(x=>x.servizio===sv);
                      setSelTurno(ts.length ? ts[0] : null);
                      // Clear stale display immediately
                      setTavoli([]); setPrenOggi([]);
                    }}
                    style={{flex:1,padding:"4px 2px",borderRadius:6,fontWeight:600,fontSize:10,cursor:"pointer",
                      border:"1.5px solid " + (sv===selService ? NAVY : "#DBDBDB"),
                      background:sv===selService?NAVY:"white",
                      color:sv===selService?"white":"#6E7175",transition:"all .15s"}}>
                    {sv}
                  </button>
                ))}
              </div>
            </div>

            {/* Turni */}
            {turniServizio.length>0&&(
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:11,color:"#6E7175",minWidth:54,fontWeight:600}}>Turni:</span>
                <div style={{display:"flex",gap:4,flex:1,flexWrap:"wrap"}}>
                  {turniServizio.map((t,i)=>(
                    <button key={t.id}
                      onClick={()=>{ if(selTurno?.id!==t.id) setSelTurno(t); }}
                      style={{padding:"4px 10px",borderRadius:6,fontWeight:700,fontSize:10,cursor:"pointer",
                        border:"1.5px solid " + (selTurno?.id===t.id ? NAVY : "#DBDBDB"),
                        background:selTurno?.id===t.id?NAVY:"white",
                        color:selTurno?.id===t.id?"white":"#6E7175",transition:"all .15s"}}>
                      Turno {i+1}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Stato tavoli */}
          <div style={{marginBottom:16,paddingBottom:16,borderBottom:"1px solid #f2f5f6"}}>
            <div style={{fontSize:12,fontWeight:700,color:NAVY,marginBottom:10,
              fontFamily:"'Poppins',sans-serif"}}>Stato tavoli</div>
            {[
              {color:"#00CF86", label:"Disponibili",      count:liberi},
              {color:"#5C9CD4", label:"Attesa ordine",    count:attesa},
              {color:"#FF616E", label:"Occupati",         count:occupati},
              {color:"#F57D03", label:"Chiesto conto",    count:conto},
              {color:"#00CF86", label:"Pagato",           count:pagati, striped:true},
              {color:"#204769", label:"Prenotati",        count:riservati},
              {color:"#6E7175", label:"Bloccati",         count:bloccati},
            ].filter(s=>s.count>0||["Disponibili","Occupati","Attesa ordine"].includes(s.label))
            .map(s=>(
              <div key={s.label} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <div style={{width:20,height:20,borderRadius:5,flexShrink:0,
                  background:s.striped
                    ? "repeating-linear-gradient(45deg,"+s.color+","+s.color+" 3px,white 3px,white 6px)"
                    : s.color,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  border:s.striped?"1px solid "+s.color:"none",
                  color:s.striped?s.color:"white",fontSize:10,fontWeight:800}}>{s.count}</div>
                <span style={{fontSize:11,color:"#4A4D53",fontFamily:"'Open Sans',sans-serif"}}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Gestione tavoli */}
          <div style={{marginBottom:prenDaArr.length>0?16:0,paddingBottom:prenDaArr.length>0?16:0,
            borderBottom:prenDaArr.length>0?"1px solid #f2f5f6":"none"}}>
            <div style={{fontSize:12,fontWeight:700,color:NAVY,marginBottom:10,
              fontFamily:"'Poppins',sans-serif"}}>Gestione tavoli</div>
            {[
              {ic:"➕",lb:"Aggiungi tavolo"},
              {ic:"📍",lb:"Trasferisci tavolo"},
              {ic:"🔔",lb:"Richiedi servizio al Tavolo"},
            ].map(a=>(
              <button key={a.lb}
                style={{width:"100%",display:"flex",alignItems:"center",gap:8,
                  padding:"6px 4px",border:"none",background:"transparent",cursor:"pointer",
                  fontSize:11,color:"#4A4D53",fontFamily:"'Open Sans',sans-serif",
                  borderRadius:6,transition:"background .12s",textAlign:"left"}}
                onMouseEnter={e=>e.currentTarget.style.background="#f2f5f6"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{fontSize:12}}>{a.ic}</span>{a.lb}
              </button>
            ))}
          </div>

          {/* Check-in attesi */}
          {prenDaArr.length>0&&(
            <div>
              <div style={{fontSize:12,fontWeight:700,color:NAVY,marginBottom:8,
                fontFamily:"'Poppins',sans-serif"}}>Check-in attesi ({prenDaArr.length})</div>
              {prenDaArr.map(p=>{
                const tav=tavoli.find(t=>t.id===p.tavolo_id);
                return(
                  <div key={p.id} style={{background:"#f0f8ff",border:"1px solid #5C9CD4",
                    borderRadius:8,padding:"7px 9px",display:"flex",alignItems:"center",
                    gap:7,marginBottom:6}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11,fontWeight:700,color:NAVY,overflow:"hidden",
                        textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.is_vip?"⭐ ":""}{p.nome}</div>
                      <div style={{fontSize:9,color:"#6E7175"}}>{p.orario} · {p.coperti}pax{tav?` · T${tav.numero}`:""}</div>
                    </div>
                    <button
                      style={{background:"#00CF86",color:"white",border:"none",borderRadius:6,
                        padding:"4px 8px",fontSize:9,fontWeight:700,cursor:"pointer"}}
                      onClick={async()=>{
                        const token=localStorage.getItem("outlet_token")||"";
                        const r=await fetch(`/api/prenotazioni/${p.id}/checkin`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`}});
                        if(r.ok){toast(`✓ Check-in ${p.nome}`);refresh();}
                        else{const d=await r.json();toast(d.error||"Errore","error");}
                      }}>✓</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Paginazione dots */}
          {totalePagine>1&&(
            <div style={{display:"flex",justifyContent:"center",gap:5,marginTop:12}}>
              {Array.from({length:totalePagine}).map((_,i)=>(
                <button key={i} onClick={()=>{setCtxId(null);setPagina(i);}}
                  style={{width:i===pagina?20:7,height:7,borderRadius:4,border:"none",
                    background:i===pagina?NAVY:"#DBDBDB",cursor:"pointer",
                    transition:"all .25s",padding:0}}/>
              ))}
            </div>
          )}

          {/* Fatturato */}
          {stats.fatturato_oggi>0&&(
            <div style={{marginTop:12,background:"#E4F8EE",border:"1px solid #00CF86",
              borderRadius:10,padding:"10px 13px"}}>
              <div style={{fontSize:9,color:"#007035",fontWeight:700,textTransform:"uppercase",
                letterSpacing:.5,marginBottom:2}}>{dateStr===TODAY_STR?"Fatturato oggi":"Fatturato "+dateStr}</div>
              <div style={{fontSize:17,fontWeight:700,color:"#007035",fontFamily:"'Poppins',sans-serif"}}>
                € {stats.fatturato_oggi.toFixed(2)}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Modal Nota prenotazione */}
      {modalNota&&<ModalNota pren={modalNota} onClose={()=>setModalNota(null)}/>}

      {/* Modal Modifica Prenotazione */}
      {modalEditPren&&(
        <ModalEditPren
          pren={modalEditPren}
          turni={turni}
          onClose={()=>setModalEditPren(null)}
          onSaved={()=>{refresh();setModalEditPren(null);}}
        />
      )}

      {/* Global pren tooltip */}
      {tooltip&&(
        <div style={{
          position:"fixed",left:tooltip.x,top:tooltip.y,
          background:"white",border:"1.5px solid #DBDBDB",
          borderRadius:10,padding:"10px 12px",width:200,
          zIndex:9999,textAlign:"left",
          boxShadow:"0 8px 24px rgba(32,71,105,.2)",
          pointerEvents:"none",
          fontFamily:"'Open Sans',sans-serif"}}>
          <div style={{fontSize:11,fontWeight:700,color:NAVY,
            marginBottom:4,fontFamily:"'Poppins',sans-serif"}}>
            👤 {tooltip.pren.nome}
          </div>
          <div style={{fontSize:10,color:"#5C9CD4",fontWeight:600,
            marginBottom:tooltip.pren.note?4:0}}>
            🕐 {tooltip.pren.orario} · {tooltip.pren.coperti} pax
          </div>
          {tooltip.pren.note&&(<>
            <div style={{height:1,background:"#f2f5f6",margin:"4px 0"}}/>
            <div style={{fontSize:10,fontWeight:700,color:"#F57D03",marginBottom:2}}>Note</div>
            {tooltip.pren.note.split("\n").filter(Boolean).map((l,i)=>(
              <div key={i} style={{fontSize:10,color:"#4A4D53",lineHeight:1.5}}>• {l}</div>
            ))}
          </>)}
        </div>
      )}

      {/* Modals */}
      {modalSposta&&<ModalSposta tavolo={modalSposta} onClose={()=>setModalSposta(null)} onConfirm={handleSposta}/>}
      {modalUnisci&&<ModalUnisci tavolo={modalUnisci} selSala={selSala} selTurno={selTurno} onClose={()=>setModalUnisci(null)} onConfirm={handleUnisci}/>}
      {modalPaga&&<ModalPaga tavolo={modalPaga.tavolo} comanda={modalPaga.comanda} onClose={()=>setModalPaga(null)} onConfirm={handlePaga}/>}
    </div>
  );
}
