import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import { useToast } from "../components/UI";
import { Pencil, Eye, Trash2, FileText, ChevronLeft, ChevronRight, ArrowUpDown, Filter, X } from "lucide-react";

const NAVY   = "#204769";
const ACCENT = "#5C9CD4";
const PAGE_SIZE = 10;

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = d => {
  if(!d) return "";
  const [y,m,g] = d.split("-");
  return `${g}/${m}/${y}`;
};

// ── Modal modifica prenotazione ───────────────────────────────────────────────
function ModalEdit({ pren, turni, onClose, onSaved, toast }) {
  const [form, setForm] = useState({
    nome:     pren.nome||"",
    telefono: pren.telefono||"",
    email:    pren.email||"",
    coperti:  pren.coperti||2,
    orario:   pren.orario||"",
    note:     pren.note||"",
    turno_id: pren.turno_id!=null ? String(pren.turno_id) : "",
    is_vip:   pren.is_vip||false,
  });
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const ff = k => v => setForm(p=>({...p,[k]:v}));

  const slotsTurno = t => {
    if(!t?.ora_inizio||!t?.ora_fine) return [];
    const slots=[]; let [h,m]=t.ora_inizio.split(":").map(Number);
    const [eh,em]=t.ora_fine.split(":").map(Number);
    while(h*60+m<=eh*60+em){
      slots.push(String(h).padStart(2,"0")+":"+String(m).padStart(2,"0"));
      m+=30; if(m>=60){m-=60;h++;}
    }
    return slots;
  };
  const selT  = turni.find(t=>String(t.id)===form.turno_id)||null;
  const slots = selT ? slotsTurno(selT) : [];

  const save = async () => {
    if(!form.nome.trim()){toast("Nome obbligatorio","error");return;}
    setSaving(true);
    try {
      const token = localStorage.getItem("outlet_token")||"";
      const r = await fetch("/api/prenotazioni/"+pren.id, {
        method:"PUT",
        headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
        body:JSON.stringify({
          nome:form.nome, telefono:form.telefono, email:form.email,
          coperti:parseInt(form.coperti)||2, orario:form.orario, note:form.note,
          turno_id:form.turno_id?parseInt(form.turno_id):null, is_vip:form.is_vip
        })
      });
      if(!r.ok){const d=await r.json();toast(d.error||"Errore","error");return;}
      toast("✓ Aggiornata"); onSaved(); onClose();
    } catch(e){toast(e.message,"error");}
    finally{setSaving(false);}
  };

  const del = async () => {
    if(!window.confirm("Eliminare la prenotazione di "+pren.nome+"?")) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem("outlet_token")||"";
      const r = await fetch("/api/prenotazioni/"+pren.id,{method:"DELETE",headers:{Authorization:"Bearer "+token}});
      if(!r.ok){const d=await r.json();toast(d.error||"Errore","error");return;}
      toast("Eliminata"); onSaved(); onClose();
    } catch(e){toast(e.message,"error");}
    finally{setDeleting(false);}
  };

  const IS = {width:"100%",border:"1.5px solid #DBDBDB",borderRadius:7,
    padding:"6px 9px",fontSize:12,outline:"none",fontFamily:"'Open Sans',sans-serif",
    color:"#374151",boxSizing:"border-box"};
  const FL = ({children})=>(<div style={{fontSize:10,fontWeight:700,color:"#6E7175",
    textTransform:"uppercase",letterSpacing:.4,marginBottom:3}}>{children}</div>);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(32,71,105,.5)",zIndex:2000,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
      onClick={onClose}>
      <div style={{background:"white",borderRadius:14,width:"100%",maxWidth:460,
        overflow:"hidden",boxShadow:"0 16px 48px rgba(32,71,105,.25)"}}
        onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{background:NAVY,padding:"12px 16px",display:"flex",
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
          {/* Info sola lettura */}
          <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:8,
            padding:"8px 12px",fontSize:11,color:"#64748b"}}>
            📅 {fmtDate(pren.data)} · {pren.servizio} · {pren.outlet_nome||""}
          </div>
          <div>
            <FL>Nome *</FL>
            <div style={{display:"flex",gap:6}}>
              <input value={form.nome} onChange={e=>ff("nome")(e.target.value)} style={{...IS,flex:1}}/>
              <button type="button" onClick={()=>ff("is_vip")(!form.is_vip)}
                style={{width:34,flexShrink:0,border:"1.5px solid "+(form.is_vip?"#f59e0b":"#DBDBDB"),
                  borderRadius:7,background:form.is_vip?"#fffbeb":"white",cursor:"pointer",fontSize:16}}>
                {form.is_vip?"⭐":"☆"}
              </button>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div><FL>Telefono</FL><input value={form.telefono} onChange={e=>ff("telefono")(e.target.value)} style={IS}/></div>
            <div><FL>Coperti</FL><input type="number" min="1" value={form.coperti} onChange={e=>ff("coperti")(e.target.value)} style={IS}/></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div>
              <FL>Turno</FL>
              <select value={form.turno_id} style={IS} onChange={e=>{
                const t=turni.find(x=>String(x.id)===e.target.value);
                const s=t?slotsTurno(t):[];
                setForm(p=>({...p,turno_id:e.target.value,orario:s.includes(p.orario)?p.orario:(s[0]||p.orario)}));
              }}>
                <option value="">— Nessuno —</option>
                {turni.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div>
              <FL>Orario</FL>
              {slots.length>0
                ? <select value={form.orario} onChange={e=>ff("orario")(e.target.value)} style={IS}>
                    {slots.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                : <input type="time" value={form.orario} onChange={e=>ff("orario")(e.target.value)} style={IS}/>
              }
            </div>
          </div>
          <div><FL>Note</FL><textarea value={form.note} onChange={e=>ff("note")(e.target.value)} rows={2} style={{...IS,resize:"none"}}/></div>
          <div style={{display:"flex",gap:8,paddingTop:4}}>
            <button onClick={del} disabled={deleting}
              style={{padding:"8px 14px",borderRadius:6,border:"1.5px solid #FF616E",
                background:"#FFF0F1",color:"#D10011",cursor:"pointer",fontSize:12,fontWeight:600,
                opacity:deleting?.7:1}}>
              {deleting?"...":"🗑 Elimina"}
            </button>
            <div style={{flex:1}}/>
            <button onClick={onClose}
              style={{padding:"8px 18px",borderRadius:6,border:"1.5px solid #DBDBDB",
                background:"white",cursor:"pointer",fontSize:12,fontWeight:600,color:"#6E7175"}}>
              Annulla
            </button>
            <button onClick={save} disabled={saving}
              style={{padding:"8px 22px",borderRadius:6,border:"none",
                background:NAVY,color:"white",cursor:"pointer",fontSize:12,fontWeight:700,opacity:saving?.7:1}}>
              {saving?"...":"Salva"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal dettaglio ───────────────────────────────────────────────────────────
function ModalView({ pren, onClose, onEdit }) {
  const Row = ({label,val})=>val?(
    <div style={{display:"flex",borderBottom:"1px solid #f1f5f9",padding:"8px 0"}}>
      <div style={{width:120,fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:.3}}>{label}</div>
      <div style={{fontSize:13,color:"#1e293b",fontWeight:500}}>{val}</div>
    </div>
  ):null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(32,71,105,.5)",zIndex:2000,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div style={{background:"white",borderRadius:14,width:"100%",maxWidth:420,
        overflow:"hidden",boxShadow:"0 16px 48px rgba(32,71,105,.25)"}} onClick={e=>e.stopPropagation()}>
        <div style={{background:NAVY,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{color:"white",fontWeight:700,fontSize:14,fontFamily:"'Poppins',sans-serif"}}>
            👤 {pren.nome} {pren.is_vip?"⭐":""}
          </span>
          <button onClick={onClose} style={{background:"rgba(255,255,255,.15)",border:"none",color:"white",
            cursor:"pointer",fontSize:18,width:28,height:28,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        <div style={{padding:"4px 16px 16px"}}>
          <Row label="Data"     val={fmtDate(pren.data)}/>
          <Row label="Orario"   val={pren.orario}/>
          <Row label="Coperti"  val={pren.coperti+" pax"}/>
          <Row label="Servizio" val={pren.servizio}/>
          <Row label="Turno"    val={pren.turno_nome||"—"}/>
          <Row label="Sala"     val={pren.sala_nome||"—"}/>
          <Row label="Tavolo"   val={pren.tavolo_numero||"—"}/>
          <Row label="Telefono" val={pren.telefono}/>
          <Row label="Email"    val={pren.email}/>
          <Row label="Note"     val={pren.note}/>
          <Row label="Outlet"   val={pren.outlet_nome}/>
        </div>
        <div style={{padding:"0 16px 14px",display:"flex",justifyContent:"flex-end",gap:8}}>
          <button onClick={onClose} style={{padding:"8px 18px",borderRadius:6,border:"1.5px solid #DBDBDB",background:"white",cursor:"pointer",fontSize:12,fontWeight:600,color:"#6E7175"}}>Chiudi</button>
          <button onClick={()=>{onClose();onEdit(pren);}} style={{padding:"8px 18px",borderRadius:6,border:"none",background:NAVY,color:"white",cursor:"pointer",fontSize:12,fontWeight:700}}>✏️ Modifica</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function OspitiGiorno() {
  const { toast, ToastEl } = useToast();

  // Data
  const [outlets,  setOutlets]  = useState([]);
  const [sale,     setSale]     = useState([]);
  const [turni,    setTurni]    = useState([]);
  const [pren,     setPren]     = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [allocLoading, setAllocLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Filters
  const today = new Date().toISOString().split("T")[0];
  const [fData,     setFData]    = useState(today);
  const [fOutlet,   setFOutlet]  = useState("");
  const [fSala,     setFSala]    = useState("");
  const [fServizio, setFServizio]= useState("");
  const [fTurno,    setFTurno]   = useState("");
  const [fNome,     setFNome]    = useState("");

  // Sort
  const [sortKey,   setSortKey]  = useState("orario");
  const [sortDir,   setSortDir]  = useState("asc");

  // Pagination
  const [page, setPage] = useState(1);

  // Modals
  const [modalView, setModalView] = useState(null);
  const [modalEdit, setModalEdit] = useState(null);

  // Derived services from turni
  const servizi = [...new Set(turni.map(t=>t.servizio).filter(Boolean))];
  const turniFiltered = turni.filter(t => !fServizio || t.servizio===fServizio);

  // ── Load outlets ────────────────────────────────────────────────────────────
  useEffect(()=>{
    api.getOutlets().then(d=>{
      setOutlets(d);
      if(d.length) setFOutlet(String(d[0].id));
    });
  },[]);

  // ── Load sale + turni when outlet changes ───────────────────────────────────
  useEffect(()=>{
    if(!fOutlet) return;
    Promise.all([
      api.getSale(parseInt(fOutlet)),
      api.getTurni("?outlet_id="+fOutlet)
    ]).then(([s,t])=>{
      setSale(s); setTurni(t);
      setFSala(""); setFServizio(""); setFTurno("");
    });
  },[fOutlet]);

  // ── Load prenotazioni ───────────────────────────────────────────────────────
  const avviaAllocazione = async () => {
    if(!fOutlet){ toast("Seleziona un outlet","error"); return; }
    setAllocLoading(true);
    try {
      const token = localStorage.getItem("outlet_token")||"";
      const body  = {
        outlet_id: parseInt(fOutlet),
        sala_id:   fSala   ? parseInt(fSala)   : null,
        data:      fData,
        turno_id:  fTurno  ? parseInt(fTurno)  : null,
      };
      const r   = await fetch("/api/prenotazioni/alloca-tavoli", {
        method:"POST",
        headers:{"Content-Type":"application/json", Authorization:"Bearer "+token},
        body: JSON.stringify(body),
      });
      const res = await r.json();
      if(!r.ok){ toast(res.error||"Errore allocazione","error"); return; }
      const { allocazioni=[], non_allocate=[] } = res;
      const msg = allocazioni.length
        ? "✓ Allocati "+allocazioni.length+" tavoli"+(non_allocate.length?" · "+non_allocate.length+" non allocate":"")
        : "Nessuna prenotazione da allocare";
      toast(msg, allocazioni.length?"success":"error");
      load();
    } catch(e){ toast(e.message,"error"); }
    finally{ setAllocLoading(false); }
  };

  const resetAllocazione = async () => {
    if(!window.confirm("Rimuovere TUTTE le assegnazioni tavolo per i filtri selezionati?")) return;
    setResetLoading(true);
    try {
      const token = localStorage.getItem("outlet_token")||"";
      const body  = {
        outlet_id: parseInt(fOutlet),
        sala_id:   fSala  ? parseInt(fSala)  : null,
        data:      fData,
        turno_id:  fTurno ? parseInt(fTurno) : null,
      };
      const r   = await fetch("/api/prenotazioni/dealloca-tavoli", {
        method:"DELETE",
        headers:{"Content-Type":"application/json", Authorization:"Bearer "+token},
        body: JSON.stringify(body),
      });
      const res = await r.json();
      if(!r.ok){ toast(res.error||"Errore","error"); return; }
      toast("✓ Reset completato: "+res.rimossi+" de-allocate");
      load();
    } catch(e){ toast(e.message,"error"); }
    finally{ setResetLoading(false); }
  };

  const load = useCallback(async()=>{
    if(!fOutlet) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ outlet_id:fOutlet, data:fData });
      if(fSala)     params.set("sala_id",  fSala);
      if(fTurno)    params.set("turno_id", fTurno);
      const data = await api.getPrenotazioni("?"+params.toString());
      // Enrich with names
      const outletMap  = Object.fromEntries(outlets.map(o=>[o.id,o.nome]));
      const salaMap    = Object.fromEntries(sale.map(s=>[s.id,s.nome]));
      const turnoMap   = Object.fromEntries(turni.map(t=>[t.id,{nome:t.nome,servizio:t.servizio}]));
      const enriched   = data.map(p=>({
        ...p,
        outlet_nome: outletMap[p.outlet_id]||"",
        sala_nome:   salaMap[p.sala_id]||"",
        turno_nome:  turnoMap[p.turno_id]?.nome||"",
        turno_servizio: p.servizio||turnoMap[p.turno_id]?.servizio||"",
      }));
      // Fetch tavoli numeri if needed
      setPren(enriched);
    } catch(e){ toast(e.message,"error"); }
    finally{ setLoading(false); }
  },[fOutlet,fData,fSala,fTurno,outlets,sale,turni]);

  useEffect(()=>{ setPage(1); load(); },[fOutlet,fData,fSala,fServizio,fTurno]);

  // ── Client-side filters + sort ──────────────────────────────────────────────
  const filtered = pren
    .filter(p=>{
      if(fServizio && p.servizio !== fServizio) return false;
      if(fNome && !p.nome.toLowerCase().includes(fNome.toLowerCase())) return false;
      return true;
    })
    .sort((a,b)=>{
      const va = a[sortKey]||""; const vb = b[sortKey]||"";
      const cmp = String(va).localeCompare(String(vb),undefined,{numeric:true});
      return sortDir==="asc" ? cmp : -cmp;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length/PAGE_SIZE));
  const paginated  = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const sort = key => {
    if(sortKey===key) setSortDir(d=>d==="asc"?"desc":"asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  // ── Print PDF ───────────────────────────────────────────────────────────────
  const printPDF = () => {
    const rows = filtered.map(p=>`
      <tr>
        <td>${p.nome}${p.is_vip?' <span style="color:#f59e0b">⭐</span>':''}</td>
        <td>${fmtDate(p.data)}</td>
        <td>${p.orario}</td>
        <td>${p.coperti}</td>
        <td>${p.sala_nome||"—"}</td>
        <td>${p.tavolo_numero||"—"}</td>
        <td>${p.servizio||"—"}</td>
        <td>${p.turno_nome||"—"}</td>
        <td>${p.note||""}</td>
      </tr>`).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Ospiti del Giorno — ${fmtDate(fData)}</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:11px;margin:20px;color:#1e293b}
        h1{color:#204769;font-size:18px;margin-bottom:4px}
        .sub{color:#64748b;font-size:11px;margin-bottom:16px}
        table{width:100%;border-collapse:collapse}
        th{background:#204769;color:white;padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.5px}
        td{padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:11px}
        tr:nth-child(even) td{background:#f8fafc}
        .badge{display:inline-block;background:#eff6ff;color:#204769;border-radius:10px;padding:1px 7px;font-size:9px;font-weight:700;margin-left:4px}
        @media print{body{margin:0}}
      </style></head><body>
      <h1>Ospiti del Giorno</h1>
      <div class="sub">${fmtDate(fData)} · ${outlets.find(o=>String(o.id)===fOutlet)?.nome||""} · ${filtered.length} prenotazioni</div>
      <table>
        <thead><tr>
          <th>Ospite</th><th>Data</th><th>Orario</th><th>Pax</th>
          <th>Sala</th><th>Tavolo</th><th>Servizio</th><th>Turno</th><th>Note</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <script>window.onload=()=>{window.print();}<\/script>
      </body></html>`;
    const w = window.open("","_blank");
    w.document.write(html); w.document.close();
  };

  // ── Styles ──────────────────────────────────────────────────────────────────
  const SEL = {height:34,border:"1.5px solid #e2e8f0",borderRadius:8,
    padding:"0 10px",fontSize:12,color:"#374151",background:"white",outline:"none",cursor:"pointer"};
  const INP = {...SEL,padding:"0 10px"};

  const SortBtn = ({k,label})=>{
    const active = sortKey===k;
    return (
      <span onClick={()=>sort(k)} style={{cursor:"pointer",display:"inline-flex",alignItems:"center",
        gap:3,color:active?NAVY:"#64748b",fontWeight:active?700:600,userSelect:"none",
        fontSize:11,textTransform:"uppercase",letterSpacing:.5}}>
        {label}
        <ArrowUpDown size={10} style={{opacity:active?1:.4}}/>
      </span>
    );
  };

  const FilterIcon = ({active})=>(
    <Filter size={10} style={{marginLeft:3,opacity:active?1:.3,color:active?ACCENT:"#64748b"}}/>
  );

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",background:"#f2f5f6",overflow:"hidden"}}>
      <ToastEl/>
      {modalView&&<ModalView pren={modalView} onClose={()=>setModalView(null)} onEdit={p=>{setModalView(null);setModalEdit(p);}}/>}
      {modalEdit&&<ModalEdit pren={modalEdit} turni={turni} onClose={()=>setModalEdit(null)} onSaved={load} toast={toast}/>}

      {/* Header */}
      <div style={{background:NAVY,padding:"0 24px",height:56,display:"flex",
        alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <h1 style={{color:"white",fontSize:18,fontWeight:700,fontFamily:"'Poppins',sans-serif",margin:0}}>
          Ospiti del Giorno
        </h1>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {/* Alloca Tavoli */}
          <button onClick={avviaAllocazione} disabled={allocLoading}
            title="Alloca tavoli automaticamente per i filtri selezionati"
            style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:7,
              border:"1.5px solid rgba(255,255,255,.5)",background:"rgba(255,255,255,.18)",
              color:"white",cursor:allocLoading?"not-allowed":"pointer",fontSize:12,fontWeight:700,
              opacity:allocLoading?.7:1,transition:"all .15s"}}
            onMouseEnter={e=>{if(!allocLoading)e.currentTarget.style.background="rgba(255,255,255,.32)";}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.18)";}}>
            {allocLoading?"⏳":"🪄"} {allocLoading?"Allocazione...":"Alloca Tavoli"}
          </button>
          {/* Reset Allocazione */}
          {(()=>{
            const hasAlloc = pren.some(p=>p.tavolo_id!=null);
            return (
              <button onClick={hasAlloc?resetAllocazione:undefined} disabled={!hasAlloc||resetLoading}
                title={hasAlloc?"Annulla assegnazione tavoli per i filtri selezionati":"Nessun tavolo da de-allocare"}
                style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:7,
                  border:"1.5px solid "+(hasAlloc?"rgba(255,150,150,.8)":"rgba(255,255,255,.25)"),
                  background:hasAlloc?"rgba(255,80,80,.25)":"rgba(255,255,255,.06)",
                  color:hasAlloc?"#fecaca":"rgba(255,255,255,.3)",
                  cursor:hasAlloc?"pointer":"default",fontSize:12,fontWeight:700,transition:"all .15s"}}
                onMouseEnter={e=>{if(hasAlloc)e.currentTarget.style.background="rgba(255,80,80,.45)";}}
                onMouseLeave={e=>{e.currentTarget.style.background=hasAlloc?"rgba(255,80,80,.25)":"rgba(255,255,255,.06)";}}>
                {resetLoading?"⏳":"✕"} Reset
              </button>
            );
          })()}
          {/* Stampa PDF */}
          <button onClick={printPDF}
            style={{display:"flex",alignItems:"center",gap:6,padding:"6px 16px",borderRadius:7,
              border:"1.5px solid rgba(255,255,255,.5)",background:"rgba(255,255,255,.12)",
              color:"white",cursor:"pointer",fontSize:12,fontWeight:700}}>
            <FileText size={14}/> Stampa PDF
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div style={{background:"white",borderBottom:"1px solid #e2e8f0",padding:"12px 24px",
        display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",flexShrink:0}}>

        {/* Data */}
        <div style={{display:"flex",flexDirection:"column",gap:3}}>
          <label style={{fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:.5}}>Data</label>
          <input type="date" value={fData} onChange={e=>{setFData(e.target.value);setPage(1);}} style={INP}/>
        </div>

        {/* Outlet */}
        <div style={{display:"flex",flexDirection:"column",gap:3}}>
          <label style={{fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:.5}}>Outlet</label>
          <select value={fOutlet} onChange={e=>{setFOutlet(e.target.value);setPage(1);}} style={SEL}>
            {outlets.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        </div>

        {/* Sala */}
        <div style={{display:"flex",flexDirection:"column",gap:3}}>
          <label style={{fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:.5}}>Sala</label>
          <select value={fSala} onChange={e=>{setFSala(e.target.value);setPage(1);}} style={SEL}>
            <option value="">Tutte</option>
            {sale.map(s=><option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>

        {/* Servizio */}
        <div style={{display:"flex",flexDirection:"column",gap:3}}>
          <label style={{fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:.5}}>Servizio</label>
          <select value={fServizio} onChange={e=>{setFServizio(e.target.value);setFTurno("");setPage(1);}} style={SEL}>
            <option value="">Tutti</option>
            {servizi.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Turno */}
        <div style={{display:"flex",flexDirection:"column",gap:3}}>
          <label style={{fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:.5}}>Turno</label>
          <select value={fTurno} onChange={e=>{setFTurno(e.target.value);setPage(1);}} style={SEL}>
            <option value="">Tutti</option>
            {turniFiltered.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>

        {/* Nome search */}
        <div style={{display:"flex",flexDirection:"column",gap:3}}>
          <label style={{fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:.5}}>Cerca ospite</label>
          <div style={{position:"relative"}}>
            <input value={fNome} onChange={e=>{setFNome(e.target.value);setPage(1);}}
              placeholder="Nome..." style={{...INP,width:160,paddingRight:28}}/>
            {fNome&&<button onClick={()=>{setFNome("");setPage(1);}}
              style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",
                background:"none",border:"none",cursor:"pointer",color:"#94a3b8",padding:0}}>
              <X size={12}/>
            </button>}
          </div>
        </div>

        <div style={{marginLeft:"auto",display:"flex",alignItems:"flex-end",gap:8,paddingTop:18}}>
          <span style={{fontSize:12,color:"#64748b",fontWeight:500}}>
            {loading?"Caricamento...":(<><strong style={{color:NAVY}}>{filtered.length}</strong> prenotazioni</>)}
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={{flex:1,overflow:"auto",padding:"16px 24px"}}>
        <div style={{background:"white",borderRadius:12,border:"1px solid #e2e8f0",
          overflow:"hidden",boxShadow:"0 1px 4px rgba(32,71,105,.06)"}}>

          {/* Table header */}
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:"#f8fafc",borderBottom:"2px solid #e2e8f0"}}>
                {[
                  {k:"nome",    l:"Ospite"},
                  {k:"data",    l:"Data pren."},
                  {k:"orario",  l:"Orario"},
                  {k:"coperti", l:"Pax"},
                  {k:"sala_nome",l:"Sala"},
                  {k:null,      l:"Tavolo Assegnato"},
                  {k:"servizio",l:"Servizio"},
                  {k:"turno_nome",l:"Turno"},
                  {k:null,      l:"Note"},
                  {k:null,      l:"Azioni"},
                ].map(({k,l},i)=>(
                  <th key={i} style={{padding:"10px 14px",textAlign:"left",fontWeight:700,
                    fontSize:11,color:"#475569",whiteSpace:"nowrap",
                    borderRight:i<9?"1px solid #e2e8f0":"none"}}>
                    {k ? <SortBtn k={k} label={l}/> : <span style={{color:"#475569",fontSize:11,textTransform:"uppercase",letterSpacing:.5,fontWeight:600}}>{l}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length===0 ? (
                <tr><td colSpan={10} style={{padding:40,textAlign:"center",color:"#94a3b8",fontSize:13}}>
                  {loading?"Caricamento...":"Nessuna prenotazione trovata"}
                </td></tr>
              ) : paginated.map((p,i)=>(
                <tr key={p.id} style={{borderBottom:"1px solid #f1f5f9",
                  background:i%2===0?"white":"#fafafa",
                  transition:"background .1s"}}
                  onMouseEnter={e=>e.currentTarget.style.background="#eff6ff"}
                  onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"white":"#fafafa"}>
                  <td style={{padding:"10px 14px",fontSize:12,fontWeight:600,color:NAVY,borderRight:"1px solid #f1f5f9"}}>
                    {p.nome}{p.is_vip&&<span style={{marginLeft:5,color:"#f59e0b"}}>⭐</span>}
                  </td>
                  <td style={{padding:"10px 14px",fontSize:12,color:"#374151",borderRight:"1px solid #f1f5f9"}}>{fmtDate(p.data)}</td>
                  <td style={{padding:"10px 14px",fontSize:12,color:"#374151",borderRight:"1px solid #f1f5f9"}}>{p.orario}</td>
                  <td style={{padding:"10px 14px",fontSize:12,color:"#374151",borderRight:"1px solid #f1f5f9",textAlign:"center"}}>{p.coperti}</td>
                  <td style={{padding:"10px 14px",fontSize:12,color:"#374151",borderRight:"1px solid #f1f5f9"}}>{p.sala_nome||"—"}</td>
                  <td style={{padding:"10px 14px",fontSize:12,color:"#374151",borderRight:"1px solid #f1f5f9"}}>
                    {p.tavolo_id ? (
                      <span style={{background:"#eff6ff",color:NAVY,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600}}>
                        T.{String(p.tavolo_id).padStart(3,"0")}
                        {p.tavolo_unito_id&&<span style={{marginLeft:4,color:ACCENT}}>+T.{String(p.tavolo_unito_id).padStart(3,"0")}</span>}
                      </span>
                    ) : <span style={{color:"#94a3b8",fontSize:11}}>—</span>}
                  </td>
                  <td style={{padding:"10px 14px",fontSize:12,color:"#374151",borderRight:"1px solid #f1f5f9"}}>{p.servizio||"—"}</td>
                  <td style={{padding:"10px 14px",fontSize:12,color:"#374151",borderRight:"1px solid #f1f5f9"}}>{p.turno_nome||"—"}</td>
                  <td style={{padding:"10px 14px",fontSize:11,color:"#64748b",borderRight:"1px solid #f1f5f9",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}
                    title={p.note}>{p.note||""}</td>
                  <td style={{padding:"8px 14px",whiteSpace:"nowrap"}}>
                    <div style={{display:"flex",gap:4,justifyContent:"center"}}>
                      <button onClick={()=>setModalEdit(p)} title="Modifica"
                        style={{width:28,height:28,border:"1px solid #e2e8f0",borderRadius:6,
                          background:"white",cursor:"pointer",display:"flex",alignItems:"center",
                          justifyContent:"center",color:"#475569",transition:"all .1s"}}
                        onMouseEnter={e=>{e.currentTarget.style.background="#eff6ff";e.currentTarget.style.color=NAVY;}}
                        onMouseLeave={e=>{e.currentTarget.style.background="white";e.currentTarget.style.color="#475569";}}>
                        <Pencil size={13}/>
                      </button>
                      <button onClick={()=>setModalView(p)} title="Visualizza"
                        style={{width:28,height:28,border:"1px solid #e2e8f0",borderRadius:6,
                          background:"white",cursor:"pointer",display:"flex",alignItems:"center",
                          justifyContent:"center",color:"#475569",transition:"all .1s"}}
                        onMouseEnter={e=>{e.currentTarget.style.background="#f0fdf4";e.currentTarget.style.color="#16a34a";}}
                        onMouseLeave={e=>{e.currentTarget.style.background="white";e.currentTarget.style.color="#475569";}}>
                        <Eye size={13}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages>1&&(
        <div style={{background:"white",borderTop:"1px solid #e2e8f0",padding:"10px 24px",
          display:"flex",alignItems:"center",justifyContent:"center",gap:6,flexShrink:0}}>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
            style={{height:32,padding:"0 12px",borderRadius:7,border:"1.5px solid #e2e8f0",
              background:"white",cursor:page===1?"default":"pointer",
              color:page===1?"#cbd5e1":"#374151",display:"flex",alignItems:"center",gap:4,fontSize:12,fontWeight:600}}>
            <ChevronLeft size={14}/> Indietro
          </button>
          {Array.from({length:totalPages},((_,i)=>i+1)).filter(n=>
            n===1||n===totalPages||Math.abs(n-page)<=1
          ).reduce((acc,n,i,arr)=>{
            if(i>0&&n-arr[i-1]>1) acc.push("...");
            acc.push(n); return acc;
          },[]).map((n,i)=>
            n==="..." ? (
              <span key={i} style={{padding:"0 4px",color:"#94a3b8"}}>…</span>
            ) : (
              <button key={n} onClick={()=>setPage(n)}
                style={{width:32,height:32,borderRadius:7,border:"1.5px solid "+(page===n?NAVY:"#e2e8f0"),
                  background:page===n?NAVY:"white",color:page===n?"white":"#374151",
                  cursor:"pointer",fontSize:12,fontWeight:700}}>
                {n}
              </button>
            )
          )}
          <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
            style={{height:32,padding:"0 12px",borderRadius:7,border:"1.5px solid #e2e8f0",
              background:"white",cursor:page===totalPages?"default":"pointer",
              color:page===totalPages?"#cbd5e1":"#374151",display:"flex",alignItems:"center",gap:4,fontSize:12,fontWeight:600}}>
            Avanti <ChevronRight size={14}/>
          </button>
        </div>
      )}
    </div>
  );
}
