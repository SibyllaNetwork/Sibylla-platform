import { useState, useEffect, useCallback, useRef } from "react";
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
const MONTHS_IT = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
                   "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const SERVIZI   = ["Colazione","Pranzo","Cena"];

export function LibroPrenotazioni({ initEditPren, initOutlet, initSala, initTurno, onClearCtx, onGoToSala }) {
  const [outlets, setOutlets]         = useState([]);
  const [selOutlet, setSelOutlet]     = useState(null);
  const [sale, setSale]               = useState([]);
  const [selSala, setSelSala]         = useState(null);
  const [turni, setTurni]             = useState([]);
  const [tavoli, setTavoli]           = useState([]);
  const [selDate, setSelDate]         = useState(new Date());
  const [selService, setSelService]   = useState("Pranzo");
  const [prenotazioni, setPren]       = useState([]);
  const [capacita, setCapacita]       = useState({});
  const [editPren, setEditPren]       = useState(null);
  const [showExport, setShowExport]   = useState(false);
  const [expLoading, setExpLoading]   = useState(false);
  const [allocModal, setAllocModal]   = useState(false);
  const [allocResult, setAllocResult] = useState(null);
  const [allocLoading, setAllocLoading] = useState(false);
  const { toast, ToastEl }            = useToast();

  const emptyForm = { nome:"", telefono:"", email:"", coperti:2, orario:"20:00",
                      note:"", turno_id:"", tavolo_id:"", is_vip:false };
  const [form, setForm] = useState(emptyForm);
  const ff = k => v => setForm(p => ({ ...p, [k]: v }));

  const fmtDate  = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const todayStr = fmtDate(selDate);
  const dayLabel = d => {
    const wd = ["Dom","Lun","Mar","Mer","Gio","Ven","Sab"][d.getDay()];
    return `${wd} ${d.getDate()} ${MONTHS_IT[d.getMonth()]} ${d.getFullYear()}`;
  };

  // -- Load -----------------------------------------------------------------
  useEffect(() => {
    api.getOutlets().then(d => {
      setOutlets(d);
      const pref = initOutlet ? d.find(o => o.id === initOutlet.id) : null;
      setSelOutlet(pref || (d.length ? d[0] : null));
    });
  }, []); // eslint-disable-line

  useEffect(() => {
    if(!selOutlet) return;
    Promise.all([api.getSale(selOutlet.id), api.getTurni(`?outlet_id=${selOutlet.id}`)]).then(([s,t]) => {
      setSale(s); setTurni(t);
      const prefSala = initSala ? s.find(x=>x.id===initSala.id) : null;
      const startSala = prefSala || (s.length?s[0]:null);
      if(startSala){ setSelSala(startSala); api.getTavoli(startSala.id).then(setTavoli); }
      // Auto-select service: prefer initTurno's service, else first available in turni
      if(initTurno) {
        const prefT = t.find(x=>x.id===initTurno.id);
        if(prefT&&prefT.servizio) setSelService(prefT.servizio);
      } else {
        // Use first service found in turni (respects outlet config)
        const services = [...new Set(t.map(x=>x.servizio).filter(Boolean))];
        if(services.length) setSelService(services[0]);
      }
    });
  }, [selOutlet]);

  useEffect(() => { if(selSala) api.getTavoli(selSala.id).then(setTavoli); }, [selSala]);

  const loadPren = useCallback(async () => {
    if(!selOutlet) return;
    // Filtra per sala se selezionata, altrimenti prende tutto l'outlet
    const salaParam = selSala ? `&sala_id=${selSala.id}` : "";
    setPren(await api.getPrenotazioni(`?outlet_id=${selOutlet.id}&data=${todayStr}${salaParam}`));
  }, [selOutlet, selSala, todayStr]);

  useEffect(() => { loadPren(); }, [loadPren]);

  // Open prenotazione in edit mode when navigated from SalaRistorante
  useEffect(() => {
    if(!initEditPren) return;
    // Wait for turni to be loaded before opening edit
    if(!turni.length) return;
    openEdit(initEditPren);
    if(onClearCtx) onClearCtx();
  }, [initEditPren, turni.length]); // eslint-disable-line

  const loadCapacita = useCallback(() => {
    const ts = turni.filter(t => t.servizio === selService);
    if(!ts.length) return;
    Promise.all(ts.map(t =>
      fetch(`/api/turni/${t.id}/capacita?data=${todayStr}${selSala?`&sala_id=${selSala.id}`:""}`, {
        headers:{ Authorization:`Bearer ${localStorage.getItem("outlet_token")||""}` }
      }).then(r => r.json()).catch(() => null)
    )).then(results => {
      const map = {};
      results.forEach((r,i) => { if(r && !r.error) map[ts[i].id] = r; });
      setCapacita(map);
    });
  }, [turni, selService, todayStr, selSala]);

  useEffect(() => { loadCapacita(); }, [loadCapacita, prenotazioni]);

  // -- Helpers ---------------------------------------------------------------
  const turniServizio = turni.filter(t => t.servizio === selService);
  const selTurnoId    = form.turno_id ? parseInt(form.turno_id) : null;

  const slotsTurno = t => {
    const slots = []; let [h,m] = t.ora_inizio.split(":").map(Number);
    const [eh,em] = t.ora_fine.split(":").map(Number);
    while(h*60+m <= eh*60+em) {
      slots.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);
      m+=30; if(m>=60){m-=60;h++;}
    }
    return slots;
  };

  const nearestSlot = (orario, slots) => {
    if(!orario || !slots.length) return slots[0]||"";
    const [h,m] = orario.split(":").map(Number); const mins=h*60+m;
    let best=slots[0], bestDiff=Infinity;
    slots.forEach(s=>{ const [sh,sm]=s.split(":").map(Number); const diff=Math.abs(sh*60+sm-mins); if(diff<bestDiff){bestDiff=diff;best=s;} });
    return best;
  };

  // Find the closest turno (across ALL services) for a given "HH:MM" time
  const findTurnoForOrario = (orario) => {
    if(!orario || !turni.length) return null;
    const [h,m] = orario.split(":").map(Number);
    const mins  = h*60+m;
    const toMin = s => { if(!s) return 0; const [sh,sm]=s.split(":").map(Number); return sh*60+sm; };
    // 1) exact match: orario inside turno range
    const exact = turni.find(t => t.ora_inizio && t.ora_fine &&
      mins >= toMin(t.ora_inizio) && mins <= toMin(t.ora_fine));
    if(exact) return exact;
    // 2) closest by start time distance
    const sorted = [...turni]
      .filter(t => t.ora_inizio)
      .sort((a,b) => Math.abs(toMin(a.ora_inizio)-mins) - Math.abs(toMin(b.ora_inizio)-mins));
    return sorted[0] || null;
  };

  const prenPerSlot = (turnoId, isFirst, slots) => {
    const pList = prenotazioni.filter(p => {
      const pid = p.turno_id!=null ? Number(p.turno_id) : null;
      const tid = turnoId!=null    ? Number(turnoId)    : null;
      if(pid===tid) return true;
      if(pid===null && isFirst) return true;
      return false;
    });
    const bySlot = {};
    slots.forEach(s => { bySlot[s]=[]; });
    pList.forEach(p => {
      const slot = slots.includes(p.orario) ? p.orario : nearestSlot(p.orario,slots);
      if(!bySlot[slot]) bySlot[slot]=[];
      bySlot[slot].push(p);
    });
    return { pList, bySlot };
  };

  // A tavolo is available for booking when:
  // 1. It has no other prenotazione for the same day+turno (or we're editing that pren)
  // 2. Its current status is "disponibile" OR it's just reserved (riservato)
  //    (occupato/attesa_ordine means it's being actively used)
  const tavoliLiberi = tavoli.filter(t => {
    const hasPren = prenotazioni.some(p =>
      p.tavolo_id === t.id &&
      (!editPren || p.id !== editPren.id) &&
      // Same turno (or both without turno)
      (form.turno_id === "" || !p.turno_id || String(p.turno_id) === form.turno_id)
    );
    if (hasPren) return false;
    // Only show physically available tables
    return ["disponibile","riservato"].includes(t.status);
  });

  // -- Form -----------------------------------------------------------------
  const openEdit = p => {
    setEditPren(p);
    // Switch to the service of the prenotazione being edited
    if(p.servizio && p.servizio !== selService) setSelService(p.servizio);
    // If no turno_id stored, try to find it from orario
    let turnoId = p.turno_id!=null ? String(p.turno_id) : "";
    if(!turnoId && p.orario) {
      const autoT = turni.find(t => {
        if(!t.ora_inizio || !t.ora_fine) return false;
        const toMin = s => { const [sh,sm]=s.split(":").map(Number); return sh*60+sm; };
        const [h,m] = p.orario.split(":").map(Number); const mins=h*60+m;
        return mins >= toMin(t.ora_inizio) && mins <= toMin(t.ora_fine);
      });
      if(autoT) turnoId = String(autoT.id);
    }
    setForm({ nome:p.nome, telefono:p.telefono||"", email:p.email||"",
      coperti:p.coperti, orario:p.orario, note:p.note||"",
      turno_id:turnoId,
      tavolo_id:p.tavolo_id!=null?String(p.tavolo_id):"",
      is_vip:p.is_vip||false });
  };
  const cancelEdit = () => { setEditPren(null); setForm(emptyForm); };

  const salva = async () => {
    if(!form.nome.trim()) { toast("Nome obbligatorio","error"); return; }
    if(form.turno_id) {
      const cap = capacita[parseInt(form.turno_id)];
      if(cap?.copertura_max>0) {
        const usati = editPren ? cap.prenotati-editPren.coperti : cap.prenotati;
        if(usati+parseInt(form.coperti||0)>cap.copertura_max) {
          toast(`Turno pieno! Solo ${cap.copertura_max-usati} posti liberi`,"error"); return;
        }
      }
    }
    try {
      // Auto-assign turno from orario if not manually set
      let finalTurnoId = form.turno_id ? parseInt(form.turno_id) : null;
      let finalServizio = selService;
      if(!finalTurnoId && form.orario) {
        const autoTurno = findTurnoForOrario(form.orario);
        if(autoTurno) {
          finalTurnoId = autoTurno.id;
          finalServizio = autoTurno.servizio || selService;
        }
      }
      const payload = { ...form, outlet_id:selOutlet.id, sala_id:selSala?.id||null,
        servizio:finalServizio, data:todayStr, coperti:parseInt(form.coperti)||2,
        turno_id:finalTurnoId,
        tavolo_id:form.tavolo_id?parseInt(form.tavolo_id):null,
        is_vip:form.is_vip||false };
      if(editPren) { await api.updatePrenotazione(editPren.id,payload); toast("✓ Aggiornata"); }
      else         { await api.createPrenotazione(payload);              toast("✓ Prenotazione salvata"); }
      cancelEdit(); 
      // Reload both prenotazioni AND tavoli to reflect new riservato status
      await loadPren();
      if(selSala) api.getTavoli(selSala.id).then(setTavoli);
    } catch(e) { toast(e.message,"error"); }
  };

  const elimina = async p => {
    if(!window.confirm(`Eliminare prenotazione di ${p.nome}?`)) return;
    try { await api.deletePrenotazione(p.id); toast("Eliminata"); cancelEdit(); loadPren(); }
    catch(e) { toast(e.message,"error"); }
  };

  // -- Ripristina tavoli (force-clear stale links) ---------------------------
  const ripristinaTavoli = async () => {
    if(!selSala) return;
    const token = localStorage.getItem("outlet_token")||"";
    try {
      const r = await fetch("/api/sale/"+selSala.id+"/ripristina-tavoli",{
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:"Bearer "+token}
      });
      const d = await r.json();
      toast((d.fixed||0)+" tavoli ripristinati");
      api.getTavoli(selSala.id).then(setTavoli);
    } catch(e){ toast("Errore","error"); }
  };

  // -- Allocazione automatica tavoli -----------------------------------------
  const avviaAllocazione = async () => {
    setAllocLoading(true);
    try {
      const token = localStorage.getItem("outlet_token")||"";
      // Alloca TUTTE le prenotazioni non assegnate per outlet+sala+data
      // Non filtriamo per turno: alloca tutti i turni in un colpo solo
      const body = {
        outlet_id: selOutlet.id,
        sala_id:   selSala?.id || null,
        data:      todayStr,
        turno_id:  null,
      };
      const r   = await fetch("/api/prenotazioni/alloca-tavoli", {
        method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body: JSON.stringify(body),
      });
      const res = await r.json();
      if(!r.ok) { toast(res.error||"Errore allocazione","error"); return; }
      setAllocResult(res);
      setAllocModal(true);
      loadPren();
    } catch(e) { toast(e.message,"error"); }
    finally { setAllocLoading(false); }
  };

  const resetAllocazione = async () => {
    if(!window.confirm("Rimuovere TUTTE le assegnazioni tavolo per questa data?")) return;
    try {
      const token = localStorage.getItem("outlet_token")||"";
      const r = await fetch("/api/prenotazioni/dealloca-tavoli", {
        method:"DELETE", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body: JSON.stringify({ outlet_id:selOutlet.id, data:todayStr }),
      });
      const res = await r.json();
      toast(`✓ Rimossi ${res.rimossi} assegnazioni`);
      loadPren();
    } catch(e) { toast(e.message,"error"); }
  };

  // -- Export PDF in nuova finestra ------------------------------------------
  const getToken = () => localStorage.getItem("outlet_token")||"";

  const doExportPDF = async (turnoId) => {
    setExpLoading(true);
    try {
      const p = new URLSearchParams({ outlet_id:selOutlet.id, data:todayStr, format:"json" });
      if(turnoId) p.set("turno_id", turnoId);
      const r   = await fetch(`/api/prenotazioni/export?${p}`, { headers:{ Authorization:`Bearer ${getToken()}` } });
      if(!r.ok) { toast("Errore export","error"); return; }
      const raw = await r.json();
      if(!raw.lista?.length) { toast("Nessun dato da stampare","error"); return; }

      const enrich = arr => arr.map(x=>({...x, tavolo_numero:tavoli.find(t=>t.id===x.tavolo_id)?.numero||null}));
      const ePO = {};
      Object.entries(raw.per_orario||{}).forEach(([o,ps])=>{ ePO[o]=enrich(ps); });

      const turnoObj = turnoId ? turniServizio.find(t=>t.id===parseInt(turnoId)) : null;
      const lista = enrich(raw.lista);
      const vip   = lista.filter(p=>p.is_vip).length;

      // Genera HTML completo e apri in nuova finestra
      const html = buildPrintHTML({
        lista, totale_pren:raw.totale_pren, totale_coperti:raw.totale_coperti,
        per_orario:ePO, turno:turnoObj, outlet:selOutlet,
        dataTesto:dayLabel(selDate), vip,
      });

      const win = window.open("","_blank","width=900,height=700");
      if(!win) { toast("Popup bloccato! Consenti i popup per questo sito","error"); return; }
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 800);
      setShowExport(false);
    } catch(e) { toast(e.message,"error"); }
    finally { setExpLoading(false); }
  };

  // -- Export XLSX -----------------------------------------------------------
  const doExportXLSX = async (turnoId) => {
    const p = new URLSearchParams({ outlet_id:selOutlet.id, data:todayStr, format:"xlsx" });
    if(turnoId) p.set("turno_id", turnoId);
    try {
      const r = await fetch(`/api/prenotazioni/export?${p}`, { headers:{ Authorization:`Bearer ${getToken()}` } });
      if(!r.ok) { toast("Errore export","error"); return; }
      const blob = await r.blob();
      if(blob.size<100) { toast("Nessun dato da esportare","error"); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href=url; a.download=`prenotazioni_${todayStr}.xlsx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast("✓ Excel scaricato");
    } catch(e) { toast(e.message,"error"); }
  };

  const totPax = prenotazioni.reduce((s,p)=>s+p.coperti,0);
  const totVip = prenotazioni.filter(p=>p.is_vip).length;

  // -- Render ----------------------------------------------------------------
  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",overflow:"hidden",background:"#f2f5f6"}}>
      <ToastEl/>

      {/* Sub-bar */}
      <div style={{background:"white",borderBottom:"1px solid #e2e8f0",padding:"8px 16px",
        display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",flexShrink:0}}>
        <select value={selOutlet?.id||""} onChange={e=>{const o=outlets.find(x=>x.id===parseInt(e.target.value));setSelOutlet(o);}} style={SS}>
          {outlets.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
        <div style={{display:"flex",gap:5}}>
          {sale.map(s=>(
            <button key={s.id} onClick={()=>setSelSala(s)}
              style={{padding:"5px 12px",borderRadius:7,fontWeight:600,fontSize:12,cursor:"pointer",
                border:"1.5px solid " + (selSala?.id===s.id ? ORANGE : "#DBDBDB"),
                background:selSala?.id===s.id?ORANGE:"white",color:selSala?.id===s.id?"white":"#475569"}}>
              {s.nome}
            </button>
          ))}
        </div>

        {/* Vai a Sala — naviga alla sala con servizio e turno correnti */}
        <button
          onClick={e=>{ e.stopPropagation(); if(onGoToSala) onGoToSala(selOutlet, selSala, turniServizio[0]||null); }}
          style={{height:30,padding:"0 14px",borderRadius:6,fontWeight:700,fontSize:12,
            border:"1.5px solid #204769",background:"#204769",cursor:"pointer",
            color:"white",display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap",
            transition:"all .15s",flexShrink:0,boxShadow:"0 1px 4px rgba(32,71,105,.25)"}}>
          🍽 Vai a Sala
        </button>

        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:7}}>
          {[...new Set(turni.map(t=>t.servizio).filter(Boolean))].map(sv=>(
              <PillBtn key={sv} label={sv} active={sv===selService} color={ORANGE}
                onClick={()=>setSelService(sv)}/>
            ))}

          {/* Allocazione automatica */}
          <button onClick={avviaAllocazione} disabled={allocLoading}
            title="Alloca tavoli automaticamente"
            style={{display:"flex",alignItems:"center",gap:5,padding:"5px 13px",borderRadius:7,
              border:"1.5px solid #204769",
              background:allocLoading?"#2d5f8a":"#204769",
              cursor:allocLoading?"not-allowed":"pointer",
              fontSize:11,fontWeight:700,color:"white",
              transition:"all .15s",boxShadow:"0 1px 4px rgba(32,71,105,.25)",
              opacity:allocLoading?.8:1}}
            onMouseEnter={e=>{if(!allocLoading)e.currentTarget.style.background="#2d5f8a";}}
            onMouseLeave={e=>{e.currentTarget.style.background=allocLoading?"#2d5f8a":"#204769";}}>
            {allocLoading?"⏳":"🪄"} {allocLoading?"Allocazione...":"Alloca Tavoli"}
          </button>
          {(()=>{
            const hasAlloc = prenotazioni.some(p=>p.tavolo_id!=null);
            return (
              <button
                onClick={hasAlloc?resetAllocazione:undefined}
                disabled={!hasAlloc}
                title={hasAlloc?"Annulla assegnazione tavoli":"Nessun tavolo da de-allocare"}
                style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:7,
                  border:"1.5px solid "+(hasAlloc?"#dc2626":"#d1d5db"),
                  background:hasAlloc?"#fef2f2":"#f9fafb",
                  cursor:hasAlloc?"pointer":"default",
                  fontSize:11,fontWeight:700,
                  color:hasAlloc?"#dc2626":"#9ca3af",
                  transition:"all .15s",
                  boxShadow:hasAlloc?"0 1px 4px rgba(220,38,38,.15)":"none"}}
                onMouseEnter={e=>{if(hasAlloc)e.currentTarget.style.background="#fee2e2";}}
                onMouseLeave={e=>{e.currentTarget.style.background=hasAlloc?"#fef2f2":"#f9fafb";}}>
                ✕ Reset
              </button>
            );
          })()}

          <button onClick={()=>setShowExport(true)}
            style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:7,
              border:"1.5px solid #e2e8f0",background:"white",cursor:"pointer",
              fontSize:11,fontWeight:700,color:"#475569",transition:"all .15s"}}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.22)';}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.12)';}}>
            ⬇ Esporta
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>

        {/* -- Form sx ----------------------------------------------------- */}
        <div style={{width:268,background:"white",borderRight:"1px solid #e2e8f0",
          display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"}}>

          <div style={{padding:"10px 12px 8px",borderBottom:"1px solid #f1f5f9",flexShrink:0}}>
            <MiniCalendar sel={selDate} onSel={d=>{setSelDate(d);cancelEdit();}}/>
          </div>

          <div style={{flex:1,padding:"8px 12px",display:"flex",flexDirection:"column",gap:6,minHeight:0}}>
            {editPren && (
              <div style={{background:"#fff7ed",border:`1px solid ${ORANGE}50`,borderRadius:7,
                padding:"5px 9px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
                <span style={{fontSize:11,fontWeight:700,color:"#92400e",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>✏️ {editPren.nome}</span>
                <button onClick={cancelEdit} style={{background:"none",border:"none",cursor:"pointer",color:"#92400e",fontSize:15,flexShrink:0}}>×</button>
              </div>
            )}

            <div style={{flexShrink:0}}>
              <FL>Turno</FL>
              <select value={form.turno_id} onChange={e=>{
                const newTurnoId = e.target.value;
                const t = turniServizio.find(x=>String(x.id)===newTurnoId);
                if(t) {
                  const slots = slotsTurno(t);
                  const firstSlot = slots[0]||form.orario;
                  // Keep existing orario if it fits, else use first slot
                  const currentOk = slots.includes(form.orario);
                  setForm(p=>({...p, turno_id:newTurnoId, orario:currentOk?p.orario:firstSlot}));
                } else {
                  ff("turno_id")(newTurnoId);
                }
              }} style={SS}>
                <option value="">— Nessun turno —</option>
                {turniServizio.map(t=>{
                  const cap=capacita[t.id]; const full=cap?.al_completo&&!editPren;
                  const lbl=cap?.copertura_max>0?`${t.nome} (${cap.prenotati}/${cap.copertura_max})`:t.nome;
                  return <option key={t.id} value={t.id} disabled={full}>{lbl}{full?" ✗":""}</option>;
                })}
              </select>
              {form.turno_id && capacita[parseInt(form.turno_id)]?.copertura_max>0 && (
                <CapBar cap={capacita[parseInt(form.turno_id)]} small/>
              )}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,flexShrink:0}}>
              <div><FL>Coperti *</FL><input type="number" value={form.coperti} min="1" onChange={e=>ff("coperti")(e.target.value)} style={IS}/></div>
              <div>
                <FL>Orario *</FL>
                {form.turno_id ? (
                  <select value={form.orario}
                    onChange={e=>ff("orario")(e.target.value)} style={SS}>
                    {(()=>{
                      const t=turniServizio.find(x=>String(x.id)===form.turno_id);
                      return t ? slotsTurno(t).map(s=>(
                        <option key={s} value={s}>{s}</option>
                      )) : <option value={form.orario}>{form.orario}</option>;
                    })()}
                  </select>
                ) : (
                  <input type="time" value={form.orario}
                    onChange={e=>{
                      const newOrario = e.target.value;
                      if(!form.turno_id) {
                        // Search across ALL services for best matching turno
                        const match = findTurnoForOrario(newOrario);
                        if(match) {
                          // Switch service display to match the found turno
                          if(match.servizio && match.servizio !== selService)
                            setSelService(match.servizio);
                          setForm(p=>({...p, orario:newOrario, turno_id:String(match.id)}));
                        } else {
                          ff("orario")(newOrario);
                        }
                      } else {
                        ff("orario")(newOrario);
                      }
                    }}
                    style={IS}/>
                )}
              </div>
            </div>

            <div style={{flexShrink:0}}>
              <FL>Tavolo</FL>
              <select value={form.tavolo_id} onChange={e=>ff("tavolo_id")(e.target.value)} style={SS}>
                <option value="">— Non assegnato —</option>
                {tavoliLiberi.map(t=>{
                  const over = parseInt(form.coperti)||0 > t.capienza;
                  return <option key={t.id} value={t.id} style={{color:over?"#b45309":"inherit"}}>
                    T.{t.numero} · {t.capienza} pax{over?" ⚠️":""}
                  </option>;
                })}
              </select>
              {form.tavolo_id && (() => {
                const selTav = tavoliLiberi.find(t=>String(t.id)===form.tavolo_id);
                const cop = parseInt(form.coperti)||0;
                if(selTav && cop > selTav.capienza) {
                  const extra = cop - selTav.capienza;
                  const complTavoli = tavoliLiberi.filter(t=>String(t.id)!==form.tavolo_id);
                  const sugg = complTavoli.find(t=>t.capienza>=extra);
                  return (
                    <div style={{background:"#fffbeb",border:"1px solid #F57D03",borderRadius:6,
                      padding:"6px 8px",marginTop:4,fontSize:10,color:"#b45309"}}>
                      ⚠️ Capienza {selTav.capienza} pax · servono {extra} posti in più
                      {sugg&&<span style={{fontWeight:700}}> → Unire con T.{sugg.numero} ({sugg.capienza} pax)</span>}
                      {!sugg&&<span> · Nessun tavolo complementare disponibile</span>}
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div style={{flexShrink:0}}>
              <FL>Nome *</FL>
              <div style={{display:"flex",gap:6}}>
                <input value={form.nome} onChange={e=>ff("nome")(e.target.value)}
                  placeholder="Cognome Nome" style={{...IS,flex:1}}/>
                <button type="button" onClick={()=>ff("is_vip")(!form.is_vip)}
                  title="Cliente VIP"
                  style={{width:32,flexShrink:0,border:"1.5px solid " + (form.is_vip ? "#f59e0b" : "#DBDBDB"),
                    borderRadius:7,background:form.is_vip?"#fffbeb":"white",cursor:"pointer",fontSize:16}}>
                  {form.is_vip?"⭐":"☆"}
                </button>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,flexShrink:0}}>
              <div><FL>Telefono</FL><input type="tel"   value={form.telefono} onChange={e=>ff("telefono")(e.target.value)} style={IS}/></div>
              <div><FL>Email</FL>   <input type="email" value={form.email}    onChange={e=>ff("email")(e.target.value)}    style={IS}/></div>
            </div>

            <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
              <FL>Note</FL>
              <textarea value={form.note} onChange={e=>ff("note")(e.target.value)}
                style={{...IS,resize:"none",flex:1,minHeight:32}}/>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:5,flexShrink:0,paddingBottom:4}}>
              <button onClick={salva}
                style={{background:editPren?"#5C9CD4":"#204769",color:"white",border:"none",
                  borderRadius:8,padding:"9px",fontWeight:700,fontSize:12,cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                {editPren?"✏ Aggiorna":<><BookOpen size={12}/>Prenota</>}
              </button>
              {editPren&&(
                <button onClick={()=>elimina(editPren)}
                  style={{background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5",
                    borderRadius:8,padding:"7px",fontWeight:700,fontSize:11,cursor:"pointer"}}>
                  🗑 Elimina prenotazione
                </button>
              )}
            </div>
          </div>
        </div>

        {/* -- Agenda ------------------------------------------------------ */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",padding:"10px 12px",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0,flexWrap:"wrap"}}>
            <span style={{fontWeight:700,fontSize:14,color:NAVY}}>{dayLabel(selDate)}</span>
            <span style={{fontSize:12,color:"#64748b",background:"white",border:"1px solid #e2e8f0",borderRadius:16,padding:"2px 10px"}}>
              {prenotazioni.length} pren. · {totPax} pax
            </span>
            {totVip>0&&(
              <span style={{fontSize:12,background:"#fffbeb",border:"1px solid #fde68a",borderRadius:16,padding:"2px 10px",color:"#92400e",fontWeight:600}}>
                ⭐ {totVip} VIP
              </span>
            )}

          </div>

          {turniServizio.length===0 ? (
            <div style={{background:"white",borderRadius:12,border:"1px solid #e2e8f0",flex:1,
              display:"flex",alignItems:"center",justifyContent:"center",color:"#94a3b8",fontSize:13}}>
              Nessun turno per <strong style={{margin:"0 4px"}}>{selService}</strong>
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(turniServizio.length,3)},1fr)`,gap:10,flex:1,minHeight:0}}>
              {turniServizio.map((turno,idx)=>{
                const cap   = capacita[turno.id];
                const slots = slotsTurno(turno);
                const {pList,bySlot} = prenPerSlot(turno.id,idx===0,slots);
                return (
                  <div key={turno.id} style={{display:"flex",flexDirection:"column",background:"white",
                    borderRadius:11,border:"1.5px solid " + (cap?.al_completo ? "#fca5a5" : "#DBDBDB"),
                    overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,.05)"}}>
                    <div style={{padding:"8px 12px",borderBottom:"1px solid #f1f5f9",background:"#f8fafc",flexShrink:0}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:cap?.copertura_max>0?5:0}}>
                        <span style={{fontWeight:700,fontSize:12,color:NAVY}}>{turno.nome}</span>
                        <span style={{fontSize:10,color:"#64748b"}}>{turno.ora_inizio}–{turno.ora_fine}</span>
                      </div>
                      {cap?.copertura_max>0&&<CapBar cap={cap} small/>}
                      {pList.length>0&&(
                        <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:10}}>
                          <span style={{color:"#64748b"}}>{pList.length} pren.</span>
                          <span style={{fontWeight:700,color:NAVY}}>{pList.reduce((s,p)=>s+p.coperti,0)} pax</span>
                        </div>
                      )}
                    </div>
                    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
                      {slots.map((slot,si)=>{
                        const ps=bySlot[slot]||[];
                        return (
                          <div key={slot}
                            style={{flex:1,borderBottom:si<slots.length-1?"1px solid #f5f7fa":"none",
                              minHeight:32,background:ps.length?"white":"#fafafa",
                              display:"flex",flexDirection:"column",padding:"3px 8px",gap:3}}>
                            <span style={{fontSize:9,fontWeight:700,color:ps.length?"#64748b":"#cbd5e1",flexShrink:0}}>{slot}</span>
                            <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                              {ps.map(p=>(
                                <PrenBadge key={p.id} p={p} tavoli={tavoli}
                                  isActive={editPren?.id===p.id}
                                  onClick={()=>editPren?.id===p.id?cancelEdit():openEdit(p)}/>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Export modal */}
      {showExport&&(
        <Modal title="📤 Esporta Lista Ospiti" onClose={()=>setShowExport(false)}>
          <div style={{marginBottom:12,padding:"10px 14px",background:"#f8fafc",borderRadius:8,
            border:"1px solid #e2e8f0",fontSize:13,color:"#475569"}}>
            <strong>{dayLabel(selDate)}</strong> · {selOutlet?.nome} · {selService}
            <span style={{marginLeft:8,fontWeight:700,color:NAVY}}>({prenotazioni.length} pren. · {totPax} pax)</span>
          </div>
          <div style={{fontSize:11,fontWeight:700,color:"#64748b",marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>Seleziona turno</div>
          {[{id:null,nome:"Tutti i turni",ora_inizio:"",ora_fine:""},...turniServizio].map(t=>{
            const cap=t.id?capacita[t.id]:null;
            return (
              <div key={t.id||"all"} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,
                padding:"10px 14px",border:"1px solid #e2e8f0",borderRadius:9,background:"white"}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:13,color:NAVY}}>{t.nome}</div>
                  {t.ora_inizio&&<div style={{fontSize:11,color:"#64748b"}}>{t.ora_inizio}–{t.ora_fine}{cap?.copertura_max>0?` · ${cap.prenotati}/${cap.copertura_max} pax`:""}</div>}
                </div>
                <button onClick={()=>doExportXLSX(t.id?String(t.id):"")}
                  style={{padding:"6px 12px",borderRadius:6,border:"1px solid #16a34a",background:"#f0fdf4",
                    color:"#16a34a",fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                  📊 Excel
                </button>
                <button onClick={()=>doExportPDF(t.id?String(t.id):"")} disabled={expLoading}
                  style={{padding:"6px 12px",borderRadius:6,border:`1px solid ${ORANGE}`,background:"#fff7ed",
                    color:"#c2410c",fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                  {expLoading?"⏳":"🖨️"} PDF
                </button>
              </div>
            );
          })}
          <div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>PDF: si apre in una nuova finestra, usa la stampa del browser</div>
        </Modal>
      )}

      {/* Risultato allocazione */}
      {allocModal&&allocResult&&(()=>{
        // API risponde con { data: { stats, allocazioni, non_allocate } }
        const ar = allocResult.data || allocResult;
        const st = ar.stats || {};
        const allocazioni   = ar.allocazioni   || [];
        const non_allocate  = ar.non_allocate  || [];
        return (
        <Modal wide title="🪄 Risultato Allocazione Automatica Tavoli" onClose={()=>{setAllocModal(false);setAllocResult(null);}}>
          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
            {[
              {v:st.totale   ||0, l:"Totale pren.", c:NAVY},
              {v:st.allocate ||0, l:"Allocate",     c:"#16a34a"},
              {v:st.singoli  ||0, l:"Tavolo singolo",c:"#2563eb"},
              {v:st.unioni   ||0, l:"Tavoli uniti", c:"#7c3aed"},
            ].map(s=>(
              <div key={s.l} style={{background:"#f8fafc",borderRadius:9,padding:"12px 14px",border:"1px solid #e2e8f0",textAlign:"center"}}>
                <div style={{fontSize:22,fontWeight:800,color:s.c}}>{s.v}</div>
                <div style={{fontSize:11,color:"#64748b",marginTop:2}}>{s.l}</div>
              </div>
            ))}
          </div>

          {allocazioni.length>0&&(
            <div style={{marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:700,color:NAVY,marginBottom:8}}>✅ Allocazioni effettuate</div>
              <div style={{maxHeight:240,overflowY:"auto",border:"1px solid #e2e8f0",borderRadius:8,overflow:"hidden"}} className="scrollbar-light">
                {allocazioni.map((a,i)=>(
                  <div key={i} style={{display:"grid",gridTemplateColumns:"1fr auto auto auto",gap:10,
                    alignItems:"center",padding:"8px 14px",
                    borderBottom:i<allocazioni.length-1?"1px solid #f1f5f9":"none",
                    background:i%2?"#fafafa":"white"}}>
                    <span style={{fontWeight:600,fontSize:12,color:NAVY}}>{a.nome}</span>
                    <span style={{fontSize:11,color:"#64748b"}}>{a.coperti} pax</span>
                    <span style={{fontSize:12,fontWeight:700,color:a.tipo==="unione"?"#7c3aed":"#2563eb",
                      background:a.tipo==="unione"?"#faf5ff":"#eff6ff",
                      borderRadius:6,padding:"2px 8px"}}>
                      {a.tipo==="unione"?"🔗":"🪑"} T.{a.tavolo}
                    </span>
                    <span style={{fontSize:10,color:a.spreco>0?"#94a3b8":"#16a34a"}}>
                      {a.spreco>0?`+${a.spreco} liberi`:"✓ perfetto"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {non_allocate.length>0&&(
            <div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:8,padding:"10px 14px"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#dc2626",marginBottom:6}}>⚠️ Non allocate ({non_allocate.length})</div>
              {non_allocate.map((a,i)=>(
                <div key={i} style={{fontSize:12,color:"#7f1d1d",marginBottom:2}}>
                  • {a.nome} ({a.coperti} pax) — {a.motivo}
                </div>
              ))}
            </div>
          )}

          <div style={{display:"flex",justifyContent:"flex-end",marginTop:14}}>
            <Btn onClick={()=>{setAllocModal(false);setAllocResult(null);}}>Chiudi</Btn>
          </div>
        </Modal>
        );
      })()}
    </div>
  );
}

// -- Style tokens -------------------------------------------------------------
const IS = {width:"100%",border:"1.5px solid #e2e8f0",borderRadius:6,padding:"6px 8px",fontSize:11,boxSizing:"border-box",outline:"none",background:"white"};
const SS = {width:"100%",border:"1.5px solid #e2e8f0",borderRadius:6,padding:"6px 8px",fontSize:11,boxSizing:"border-box",background:"white",cursor:"pointer"};
const FL = ({children})=><div style={{fontSize:10,color:"#64748b",fontWeight:700,marginBottom:3,textTransform:"uppercase",letterSpacing:.4}}>{children}</div>;

// -- CapBar --------------------------------------------------------------------
function CapBar({cap,small}){
  const perc=Math.min(100,Math.round((cap.prenotati/cap.copertura_max)*100));
  const color=perc>=100?"#dc2626":perc>=80?"#f59e0b":"#22c55e";
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#64748b",marginBottom:2}}>
        <span>{cap.prenotati} pren.</span>
        <span style={{fontWeight:700,color}}>{cap.copertura_max-cap.prenotati} liberi / {cap.copertura_max}</span>
      </div>
      <div style={{height:small?3:5,background:"#f2f5f6",borderRadius:3}}>
        <div style={{width:`${perc}%`,height:"100%",background:color,borderRadius:3,transition:"width .4s"}}/>
      </div>
    </div>
  );
}

// -- PrenBadge -----------------------------------------------------------------
function PrenBadge({p,tavoli,onClick,isActive}){
  const [tt,setTt]=useState(false);
  const ref=useRef(null);
  const [pos,setPos]=useState({top:0,left:0});
  const tavolo=tavoli.find(t=>t.id===p.tavolo_id);
  const PALETTE=[
    ["#fff7ed","#f97316"],["#eff6ff","#2563eb"],["#f0fdf4","#16a34a"],
    ["#faf5ff","#7c3aed"],["#fefce8","#ca8a04"],["#fff1f2","#e11d48"],
    ["#f0fdfa","#0d9488"],["#fdf4ff","#a21caf"],
  ];
  const [bg,accent]=PALETTE[(p.nome.charCodeAt(0)||65)%PALETTE.length];

  const enter=()=>{
    if(ref.current){
      const r=ref.current.getBoundingClientRect();
      const W=240;
      const spaceBelow=window.innerHeight-r.bottom;
      const top=spaceBelow>210?r.bottom+6:r.top-216;
      const left=Math.max(6,Math.min(r.left,window.innerWidth-W-6));
      setPos({top,left});
    }
    setTt(true);
  };

  return(
    <div ref={ref} style={{position:"relative",display:"inline-block"}}>
      <div onClick={onClick} onMouseEnter={enter} onMouseLeave={()=>setTt(false)}
        style={{background:isActive?accent:bg,border:"1.5px solid " + (isActive?accent:accent+"55"),
          borderRadius:6,padding:"3px 8px",cursor:"pointer",userSelect:"none",
          display:"flex",alignItems:"center",gap:4,fontSize:11,fontWeight:700,
          color:isActive?"white":"#0f172a",transition:"all .15s",whiteSpace:"nowrap",
          boxShadow:isActive?"0 2px 8px " + accent + "40":"none"}}>
        {p.is_vip&&<span style={{fontSize:11}}>⭐</span>}
        <span style={{width:5,height:5,borderRadius:"50%",background:isActive?"rgba(255,255,255,.7)":accent,flexShrink:0}}/>
        <span>{p.nome.split(" ")[0]}</span>
        <span style={{opacity:.7}}>×{p.coperti}</span>
        {tavolo&&<span style={{fontSize:9,background:"rgba(0,0,0,.08)",borderRadius:3,padding:"0 3px"}}>T{tavolo.numero}</span>}
        {p.tavolo_unito_id&&<span style={{fontSize:9,color:accent,opacity:.8}}>+</span>}
      </div>

      {tt&&(
        <div style={{position:"fixed",top:pos.top,left:pos.left,zIndex:9999,pointerEvents:"none",
          background:"#1c2e4a",color:"white",borderRadius:10,padding:"11px 13px",
          width:240,boxShadow:"0 12px 32px rgba(0,0,0,.35)",fontSize:11,lineHeight:1.7}}>
          <div style={{fontWeight:800,fontSize:13,marginBottom:6,display:"flex",alignItems:"center",gap:6,
            borderBottom:"1px solid rgba(255,255,255,.12)",paddingBottom:6}}>
            {p.is_vip&&<span>⭐</span>}
            {p.nome}
            {!p.confermata&&<span style={{marginLeft:"auto",fontSize:9,color:"#fbbf24",background:"rgba(251,191,36,.15)",borderRadius:4,padding:"1px 5px"}}>NON CONF.</span>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"16px 1fr",gap:"1px 8px"}}>
            <span style={{opacity:.5}}>👥</span><span><b>{p.coperti}</b> coperti</span>
            <span style={{opacity:.5}}>🕐</span><span>{p.orario}</span>
            {tavolo&&<><span style={{opacity:.5}}>🪑</span><span>Tavolo {tavolo.numero}{p.tavolo_unito_id?` + T${tavoli.find(t=>t.id===p.tavolo_unito_id)?.numero||"?"}`:""}</span></>}
            {p.telefono&&<><span style={{opacity:.5}}>📞</span><span>{p.telefono}</span></>}
            {p.email&&<><span style={{opacity:.5}}>✉️</span><span style={{wordBreak:"break-all",fontSize:10}}>{p.email}</span></>}
            {p.note&&<><span style={{opacity:.5}}>📝</span><span style={{opacity:.85}}>{p.note}</span></>}
          </div>
          <div style={{marginTop:7,fontSize:9,color:"rgba(255,255,255,.3)",textAlign:"center",borderTop:"1px solid rgba(255,255,255,.08)",paddingTop:5}}>
            Clicca per modificare
          </div>
        </div>
      )}
    </div>
  );
}

// -- buildPrintHTML — genera HTML completo per stampa in nuova finestra ---------
function buildPrintHTML({lista,totale_pren,totale_coperti,per_orario,turno,outlet,dataTesto,vip}){
  const rows = Object.entries(per_orario).map(([orario,ps])=>`
    <div class="slot-block">
      <div class="slot-header">
        <span>🕐 ${orario}</span>
        <span>${ps.length} pren. · ${ps.reduce((s,p)=>s+p.coperti,0)} pax</span>
      </div>
      <table>
        <thead><tr>
          <th style="width:28px"></th>
          <th>Nome</th><th>Pax</th><th>Tavolo</th>
          <th>Telefono</th><th>Email</th><th>Note</th><th>Conf.</th>
        </tr></thead>
        <tbody>
          ${ps.map((p,i)=>`<tr class="${p.is_vip?"vip":i%2?"alt":""}">
            <td style="text-align:center">${p.is_vip?"⭐":""}</td>
            <td><strong>${p.nome}</strong></td>
            <td style="text-align:center">${p.coperti}</td>
            <td style="text-align:center">${p.tavolo_numero||"—"}</td>
            <td>${p.telefono||"—"}</td>
            <td>${p.email||"—"}</td>
            <td>${p.note||"—"}</td>
            <td style="text-align:center">${p.confermata?"✓":"✗"}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>
  `).join("");

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8"/>
<title>Prenotazioni ${dataTesto}</title>
<style>
  @page { size: A4 portrait; margin: 16mm 14mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1e293b; }

  .header { border-bottom: 3px solid #1c2e4a; padding-bottom: 10px; margin-bottom: 14px; }
  .header h1 { font-size: 19px; color: #1c2e4a; margin-bottom: 2px; }
  .header h2 { font-size: 13px; font-weight: 400; color: #475569; margin-bottom: 6px; }
  .header-meta { display: flex; justify-content: space-between; align-items: flex-end; }
  .header-stats { display: flex; gap: 20px; font-size: 12px; font-weight: 700; margin-top: 8px; }
  .stamp { font-size: 10px; color: #64748b; }

  .slot-block { margin-bottom: 14px; page-break-inside: avoid; }
  .slot-header { background: #f1f5f9; padding: 5px 10px; font-weight: 700; font-size: 11px;
                 border-left: 4px solid #1c2e4a; margin-bottom: 4px;
                 display: flex; justify-content: space-between; }

  table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  thead tr { background: #f8fafc; }
  th { padding: 4px 7px; border: 1px solid #e2e8f0; text-align: left; font-weight: 700; font-size: 10px; color: #374151; }
  td { padding: 4px 7px; border: 1px solid #eef2f7; }
  tr.alt { background: #f8fafc; }
  tr.vip { background: #fffbeb; }
  tr.vip td:nth-child(2) { font-weight: 700; }

  .footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #e2e8f0;
            font-size: 10px; color: #94a3b8; text-align: center; }

  @media print {
    .no-print { display: none; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="header-meta">
      <div>
        <h1>${outlet?.nome||""}</h1>
        <h2>Lista Ospiti — ${dataTesto}${turno?" · "+turno.nome:""}</h2>
      </div>
      <div class="stamp">Stampato: ${new Date().toLocaleString("it-IT")}</div>
    </div>
    <div class="header-stats">
      <span>📋 ${totale_pren} prenotazioni</span>
      <span>👥 ${totale_coperti} coperti totali</span>
      ${vip>0?`<span>⭐ ${vip} VIP</span>`:""}
    </div>
  </div>

  ${rows||'<p style="color:#94a3b8;text-align:center;padding:30px">Nessuna prenotazione</p>'}

  <div class="footer">
    Lista generata automaticamente da Outlet Manager
  </div>

  <script>
    // Stampa automatica quando la pagina è pronta
    window.onload = function(){ setTimeout(function(){ window.print(); }, 300); };
  </script>
</body>
</html>`;
}

