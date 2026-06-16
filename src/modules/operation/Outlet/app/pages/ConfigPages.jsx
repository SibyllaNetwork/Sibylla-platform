import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import { C, Modal, Field, Input, Textarea, Select, Btn, DataTable,
  PageHeader, useConfirm, useToast, Badge, FormRow } from "../components/UI";

const TIPI_OUTLET = ["ristorante","bar","centro_benessere","boutique","altro"];
const SERVIZI = ["Colazione","Pranzo","Cena"];
const COLORI = ["#ec4899","#22c55e","#f97316","#3b82f6","#eab308","#a855f7","#06b6d4","#dc2626","#84cc16","#fb923c","#818cf8","#14b8a6"];
const EMOJIS = ["🧀","🍝","🥩","🥦","🍇","⭐","🍸","🍷","🍔","🥗","🫕","🍣","🍕","☕","🍰","🥐","🫙","🥘","🍤","🧁"];

function useCrud(loader) {
  const [data, setData]   = useState([]);
  const [loading, setL]   = useState(true);
  const load = useCallback(async()=>{
    setL(true);
    try { setData(await loader()); } catch(e){ console.error(e); }
    finally { setL(false); }
  },[]);
  useEffect(()=>{ load(); },[load]);
  return { data, loading, reload: load };
}

// ── ColorPicker inline ──────────────────────────────────────────────────────
function ColorPicker({ value, onChange }) {
  return (
    <div style={{display:"flex",flexWrap:"wrap",gap:7,marginTop:4}}>
      {COLORI.map(c=>(
        <div key={c} onClick={()=>onChange(c)}
          style={{width:28,height:28,borderRadius:7,background:c,cursor:"pointer",
            border:value===c?`3px solid ${C.navy}`:"2px solid transparent",
            transition:"transform .1s,border .1s"}}
          onMouseEnter={e=>e.currentTarget.style.transform="scale(1.18)"}
          onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}/>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// OUTLET
// ═══════════════════════════════════════════════════════════════════════════
export function OutletPage() {
  const { data, loading, reload } = useCrud(api.getOutlets);
  const { toast, ToastEl } = useToast();
  const { confirm, Dialog } = useConfirm();
  const [modal, setModal] = useState(null);
  const empty = { nome:"", tipo:"ristorante", struttura:"", indirizzo:"", telefono:"", email:"", attivo:true };
  const [form, setForm] = useState(empty);
  const f = k=>v=>setForm(p=>({...p,[k]:v}));

  const save = async()=>{
    try {
      if(modal==="new") await api.createOutlet(form); else await api.updateOutlet(modal.id,form);
      toast(modal==="new"?"Outlet creato":"Aggiornato"); setModal(null); reload();
    } catch(e){ toast(e.message,"error"); }
  };
  const remove = row=>confirm(`Eliminare "${row.nome}"?`,async()=>{
    try { await api.deleteOutlet(row.id); toast("Eliminato"); reload(); } catch(e){ toast(e.message,"error"); }
  });

  return (
    <div><ToastEl/><Dialog/>
      <PageHeader title="Outlet" subtitle="Punti vendita: ristoranti, bar, boutique..."
        action={<Btn onClick={()=>{setForm(empty);setModal("new");}}>+ Nuovo Outlet</Btn>}/>
      <DataTable loading={loading} rows={data} onEdit={r=>{setForm({...r});setModal(r);}} onDelete={remove}
        cols={[
          {key:"nome",     label:"Nome"},
          {key:"tipo",     label:"Tipo",       render:v=><Badge label={v} color={C.navy}/>},
          {key:"struttura",label:"Struttura"},
          {key:"telefono", label:"Telefono"},
          {key:"attivo",   label:"Stato",      render:v=><Badge label={v?"Attivo":"Inattivo"} color={v?C.green:"#94a3b8"} dot/>},
        ]}/>
      {modal&&(
        <Modal title={modal==="new"?"Nuovo Outlet":"Modifica Outlet"} onClose={()=>setModal(null)}>
          <Field label="Nome" required><Input value={form.nome} onChange={f("nome")} placeholder="Ristorante Hotel Cristallo"/></Field>
          <FormRow>
            <Field label="Tipo" half>
              <Select value={form.tipo} onChange={f("tipo")}>{TIPI_OUTLET.map(t=><option key={t}>{t}</option>)}</Select>
            </Field>
            <Field label="Struttura" half><Input value={form.struttura} onChange={f("struttura")}/></Field>
          </FormRow>
          <Field label="Indirizzo"><Input value={form.indirizzo} onChange={f("indirizzo")}/></Field>
          <FormRow>
            <Field label="Telefono" half><Input value={form.telefono} onChange={f("telefono")} type="tel"/></Field>
            <Field label="Email" half><Input value={form.email} onChange={f("email")} type="email"/></Field>
          </FormRow>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:4}}>
            <Btn variant="secondary" onClick={()=>setModal(null)}>Annulla</Btn>
            <Btn onClick={save}>Salva</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SALE & TAVOLI
// ═══════════════════════════════════════════════════════════════════════════
export function SalePage() {
  const { data: outlets } = useCrud(api.getOutlets);
  const [selOutlet, setSelOutlet] = useState("");
  const [sale, setSale]   = useState([]);
  const [selSala, setSelSala] = useState(null);
  const [tavoli, setTavoli]   = useState([]);
  const [loadingSale, setLS]  = useState(false);
  const [loadingTav, setLT]   = useState(false);
  const { toast, ToastEl } = useToast();
  const { confirm, Dialog } = useConfirm();
  const [modalSala, setModalSala] = useState(null);
  const [modalTav, setModalTav]   = useState(null);
  const [formSala, setFormSala] = useState({ nome:"", num_tavoli:0, capienza_max:0, capienza_tavolo:4 });
  const [formTav, setFormTav]   = useState({ numero:"", capienza:4, hat_color:"#3b82f6" });

  const loadSale = async(oid)=>{ setLS(true); try{ setSale(await api.getSale(oid)); setSelSala(null); setTavoli([]); }finally{ setLS(false); } };
  const loadTavoli = async(sid)=>{ setLT(true); try{ setTavoli(await api.getTavoli(sid)); }finally{ setLT(false); } };
  useEffect(()=>{ if(outlets.length&&!selOutlet){ const id=String(outlets[0].id); setSelOutlet(id); loadSale(id); } },[outlets]);

  const saveSala = async()=>{
    try {
      if(modalSala==="new") await api.createSala(selOutlet,formSala); else await api.updateSala(modalSala.id,formSala);
      toast("Sala salvata"); setModalSala(null); loadSale(selOutlet);
    } catch(e){ toast(e.message,"error"); }
  };
  const deleteSala = s=>confirm(`Eliminare sala "${s.nome}"?`,async()=>{
    try { await api.deleteSala(s.id); toast("Eliminata"); loadSale(selOutlet); if(selSala?.id===s.id){setSelSala(null);setTavoli([]);} } catch(e){ toast(e.message,"error"); }
  });
  const saveTav = async()=>{
    try {
      if(modalTav==="new") await api.createTavolo(selSala.id,formTav); else await api.updateTavolo(modalTav.id,formTav);
      toast("Tavolo salvato"); setModalTav(null); loadTavoli(selSala.id);
    } catch(e){ toast(e.message,"error"); }
  };
  const deleteTav = t=>confirm(`Eliminare tavolo ${t.numero}?`,async()=>{
    try { await api.deleteTavolo(t.id); toast("Eliminato"); loadTavoli(selSala.id); } catch(e){ toast(e.message,"error"); }
  });

  return (
    <div><ToastEl/><Dialog/>
      <PageHeader title="Sale e Tavoli" subtitle="Configura le sale con i relativi tavoli"/>
      <div style={{marginBottom:14}}>
        <label style={{fontSize:12,fontWeight:600,color:C.text,marginRight:8}}>Outlet:</label>
        <select value={selOutlet} onChange={e=>{setSelOutlet(e.target.value);loadSale(e.target.value);}}
          style={{border:`1.5px solid ${C.border}`,borderRadius:8,padding:"6px 10px",fontSize:12,fontWeight:600}}>
          {outlets.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"280px 1fr",gap:14}}>
        {/* Sale list */}
        <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,boxShadow:"0 1px 4px rgba(0,0,0,.06)",overflow:"hidden"}}>
          <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",background:"#f8fafc"}}>
            <span style={{fontWeight:700,fontSize:13,color:C.navy}}>Sale</span>
            <Btn small onClick={()=>{setFormSala({nome:"",num_tavoli:0,capienza_max:0,capienza_tavolo:4});setModalSala("new");}}>+</Btn>
          </div>
          {loadingSale?<div style={{padding:20,textAlign:"center",color:C.muted,fontSize:12}}>Caricamento...</div>:
          sale.length===0?<div style={{padding:20,textAlign:"center",color:C.muted,fontSize:12}}>Nessuna sala</div>:
          sale.map(s=>(
            <div key={s.id} onClick={()=>{setSelSala(s);loadTavoli(s.id);}}
              style={{padding:"11px 14px",borderBottom:`1px solid ${C.border}`,cursor:"pointer",
                background:selSala?.id===s.id?"#eff6ff":C.white,transition:"background .1s"}}
              onMouseEnter={e=>{if(selSala?.id!==s.id)e.currentTarget.style.background="#f8fafc";}}
              onMouseLeave={e=>{if(selSala?.id!==s.id)e.currentTarget.style.background=C.white;}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontWeight:700,fontSize:13,color:C.navy}}>{s.nome}</div>
                  <div style={{fontSize:11,color:C.muted}}>Tavoli: {s.num_tavoli} · Capienza: {s.capienza_max}</div>
                </div>
                <div style={{display:"flex",gap:3}}>
                  <Btn small variant="ghost" onClick={e=>{e.stopPropagation();setFormSala({...s});setModalSala(s);}}>✏</Btn>
                  <Btn small variant="ghost" onClick={e=>{e.stopPropagation();deleteSala(s);}}>🗑</Btn>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Tavoli */}
        <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,boxShadow:"0 1px 4px rgba(0,0,0,.06)",overflow:"hidden"}}>
          <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",background:"#f8fafc"}}>
            <span style={{fontWeight:700,fontSize:13,color:C.navy}}>{selSala?`Tavoli — ${selSala.nome}`:"Seleziona una sala"}</span>
            {selSala&&<Btn small onClick={()=>{setFormTav({numero:"",capienza:4,hat_color:C.blue});setModalTav("new");}}>+ Tavolo</Btn>}
          </div>
          {!selSala?<div style={{padding:40,textAlign:"center",color:C.muted,fontSize:13}}>← Seleziona una sala</div>:
          loadingTav?<div style={{padding:20,textAlign:"center",color:C.muted,fontSize:12}}>Caricamento...</div>:
          <DataTable rows={tavoli} loading={false} onEdit={t=>{setFormTav({...t});setModalTav(t);}} onDelete={deleteTav}
            cols={[
              {key:"numero",  label:"N°"},
              {key:"capienza",label:"Capienza"},
              {key:"hat_color",label:"Colore",render:v=><div style={{width:22,height:22,borderRadius:5,background:v,border:"1px solid rgba(0,0,0,.1)"}}/>},
              {key:"status",  label:"Stato",render:v=>{
                const cfg={disponibile:C.green,occupato:C.red,riservato:C.blue,uscita:"#94a3b8",chiesto_conto:C.amber};
                return <Badge label={v} color={cfg[v]||"#94a3b8"} dot/>;
              }},
            ]}/>}
        </div>
      </div>
      {modalSala&&(
        <Modal title={modalSala==="new"?"Nuova Sala":"Modifica Sala"} onClose={()=>setModalSala(null)}>
          <Field label="Nome sala" required><Input value={formSala.nome} onChange={v=>setFormSala(p=>({...p,nome:v}))} placeholder="es. Sala Melissa"/></Field>
          <FormRow>
            <Field label="Numero tavoli" half><Input value={formSala.num_tavoli} onChange={v=>setFormSala(p=>({...p,num_tavoli:parseInt(v)||0}))} type="number" min="0"/></Field>
            <Field label="Capienza max (pax)" half><Input value={formSala.capienza_max} onChange={v=>setFormSala(p=>({...p,capienza_max:parseInt(v)||0}))} type="number" min="0"/></Field>
          </FormRow>
          {modalSala==="new"&&<Field label="Capienza per tavolo (default)"><Input value={formSala.capienza_tavolo} onChange={v=>setFormSala(p=>({...p,capienza_tavolo:parseInt(v)||4}))} type="number" min="1"/></Field>}
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:4}}><Btn variant="secondary" onClick={()=>setModalSala(null)}>Annulla</Btn><Btn onClick={saveSala}>Salva</Btn></div>
        </Modal>
      )}
      {modalTav&&(
        <Modal title={modalTav==="new"?"Nuovo Tavolo":"Modifica Tavolo"} onClose={()=>setModalTav(null)}>
          <FormRow>
            <Field label="Numero tavolo" required half><Input value={formTav.numero} onChange={v=>setFormTav(p=>({...p,numero:v}))} placeholder="001"/></Field>
            <Field label="Capienza (pax)" half><Input value={formTav.capienza} onChange={v=>setFormTav(p=>({...p,capienza:parseInt(v)||1}))} type="number" min="1"/></Field>
          </FormRow>
          <Field label="Colore rango"><ColorPicker value={formTav.hat_color} onChange={v=>setFormTav(p=>({...p,hat_color:v}))}/></Field>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:8}}><Btn variant="secondary" onClick={()=>setModalTav(null)}>Annulla</Btn><Btn onClick={saveTav}>Salva</Btn></div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TURNI
// ═══════════════════════════════════════════════════════════════════════════
export function TurniPage() {
  const { data: outlets } = useCrud(api.getOutlets);
  const [selOutlet, setSelOutlet] = useState("");
  const [turni, setTurni]   = useState([]);
  const [sale, setSale]     = useState([]);
  const { toast, ToastEl } = useToast();
  const { confirm, Dialog } = useConfirm();
  const [modal, setModal]   = useState(null);
  const emptyT = { outlet_id:"", sala_id:"", servizio:"Pranzo", nome:"Turno 1", ora_inizio:"12:00", ora_fine:"15:00", copertura_max:0 };
  const [form, setForm] = useState(emptyT);
  const f = k=>v=>setForm(p=>({...p,[k]:v}));

  const load = async(oid)=>{ const [t,s]=await Promise.all([api.getTurni(`?outlet_id=${oid}`),api.getSale(oid)]); setTurni(t); setSale(s); };
  useEffect(()=>{ if(outlets.length&&!selOutlet){ const id=String(outlets[0].id); setSelOutlet(id); load(id); } },[outlets]);

  const save = async()=>{
    try {
      const d={...form,outlet_id:parseInt(selOutlet),sala_id:form.sala_id?parseInt(form.sala_id):null,copertura_max:parseInt(form.copertura_max)||0};
      if(modal==="new") await api.createTurno(d); else await api.updateTurno(modal.id,d);
      toast("Turno salvato"); setModal(null); load(selOutlet);
    } catch(e){ toast(e.message,"error"); }
  };
  const remove = row=>confirm(`Eliminare turno "${row.nome}"?`,async()=>{
    try { await api.deleteTurno(row.id); toast("Eliminato"); load(selOutlet); } catch(e){ toast(e.message,"error"); }
  });
  const svcColor={Colazione:C.amber,Pranzo:C.green,Cena:C.blue};

  return (
    <div><ToastEl/><Dialog/>
      <PageHeader title="Turni di servizio" subtitle="Orari e copertura per Colazione, Pranzo e Cena"
        action={<Btn onClick={()=>{setForm({...emptyT,outlet_id:selOutlet});setModal("new");}}>+ Nuovo Turno</Btn>}/>
      <div style={{marginBottom:14}}>
        <label style={{fontSize:12,fontWeight:600,color:C.text,marginRight:8}}>Outlet:</label>
        <select value={selOutlet} onChange={e=>{setSelOutlet(e.target.value);load(e.target.value);}}
          style={{border:`1.5px solid ${C.border}`,borderRadius:8,padding:"6px 10px",fontSize:12}}>
          {outlets.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
      </div>
      <DataTable loading={false} rows={turni} onEdit={r=>{setForm({...r,sala_id:r.sala_id??""});setModal(r);}} onDelete={remove}
        cols={[
          {key:"servizio",  label:"Servizio",   render:v=><Badge label={v} color={svcColor[v]||C.muted} dot/>},
          {key:"nome",      label:"Nome"},
          {key:"sala_id",   label:"Sala",       render:(v,r)=>{ const s=sale.find(x=>x.id===v); return s?s.nome:"Tutte"; }},
          {key:"ora_inizio",label:"Inizio"},
          {key:"ora_fine",  label:"Fine"},
          {key:"copertura_max",label:"Max pax",render:v=>v||"—"},
          {key:"attivo",    label:"Stato",      render:v=><Badge label={v?"Attivo":"Inattivo"} color={v?C.green:"#94a3b8"} dot/>},
        ]}/>
      {modal&&(
        <Modal title={modal==="new"?"Nuovo Turno":"Modifica Turno"} onClose={()=>setModal(null)}>
          <FormRow>
            <Field label="Servizio" half><Select value={form.servizio} onChange={f("servizio")}>{SERVIZI.map(s=><option key={s}>{s}</option>)}</Select></Field>
            <Field label="Nome turno" half><Input value={form.nome} onChange={f("nome")} placeholder="Turno 1"/></Field>
          </FormRow>
          <Field label="Sala (vuoto = tutte)"><Select value={form.sala_id??""} onChange={f("sala_id")} placeholder="— Tutte le sale —">{sale.map(s=><option key={s.id} value={s.id}>{s.nome}</option>)}</Select></Field>
          <FormRow>
            <Field label="Ora inizio" half><Input value={form.ora_inizio} onChange={f("ora_inizio")} type="time"/></Field>
            <Field label="Ora fine" half><Input value={form.ora_fine} onChange={f("ora_fine")} type="time"/></Field>
          </FormRow>
          <Field label="Copertura max (0 = illimitata)"><Input value={form.copertura_max} onChange={f("copertura_max")} type="number" min="0"/></Field>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:4}}><Btn variant="secondary" onClick={()=>setModal(null)}>Annulla</Btn><Btn onClick={save}>Salva</Btn></div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ALLERGENI
// ═══════════════════════════════════════════════════════════════════════════
export function AllergeniPage() {
  const { data, loading, reload } = useCrud(api.getAllergeni);
  const { toast, ToastEl } = useToast();
  const { confirm, Dialog } = useConfirm();
  const [modal, setModal] = useState(null);
  const empty = { codice:"", nome:"", descrizione:"", attivo:true };
  const [form, setForm] = useState(empty);
  const f = k=>v=>setForm(p=>({...p,[k]:v}));
  const save = async()=>{ try{ if(modal==="new") await api.createAllergene(form); else await api.updateAllergene(modal.id,form); toast("Salvato"); setModal(null); reload(); }catch(e){ toast(e.message,"error"); } };
  const remove = row=>confirm(`Eliminare "${row.nome}"?`,async()=>{ try{ await api.deleteAllergene(row.id); toast("Eliminato"); reload(); }catch(e){ toast(e.message,"error"); } });

  return (
    <div><ToastEl/><Dialog/>
      <PageHeader title="Allergeni" subtitle="14 allergeni standard EU — obbligatori per legge"
        action={<Btn onClick={()=>{setForm(empty);setModal("new");}}>+ Nuovo</Btn>}/>
      <DataTable loading={loading} rows={data} onEdit={r=>{setForm({...r});setModal(r);}} onDelete={remove}
        cols={[
          {key:"codice",     label:"Cod.",    render:v=><Badge label={v||"—"} color={C.navy}/>},
          {key:"nome",       label:"Nome"},
          {key:"descrizione",label:"Descrizione",render:v=>v?v.substring(0,70)+(v.length>70?"…":""):"—"},
          {key:"attivo",     label:"Stato",   render:v=><Badge label={v?"Attivo":"Inattivo"} color={v?C.green:"#94a3b8"} dot/>},
        ]}/>
      {modal&&(
        <Modal title={modal==="new"?"Nuovo Allergene":"Modifica Allergene"} onClose={()=>setModal(null)}>
          <FormRow>
            <Field label="Codice EU" half><Input value={form.codice} onChange={f("codice")} placeholder="A"/></Field>
            <Field label="Nome" required half><Input value={form.nome} onChange={f("nome")} placeholder="Glutine"/></Field>
          </FormRow>
          <Field label="Descrizione"><Textarea value={form.descrizione} onChange={f("descrizione")} placeholder="Cereali contenenti glutine..."/></Field>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:4}}><Btn variant="secondary" onClick={()=>setModal(null)}>Annulla</Btn><Btn onClick={save}>Salva</Btn></div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TIPI MENU
// ═══════════════════════════════════════════════════════════════════════════
export function TipiMenuPage() {
  const { data, loading, reload } = useCrud(api.getTipiMenu);
  const { toast, ToastEl } = useToast();
  const { confirm, Dialog } = useConfirm();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ nome:"", colore:"#64748b", ordine:0 });
  const f = k=>v=>setForm(p=>({...p,[k]:v}));
  const save = async()=>{ try{ if(modal==="new") await api.createTipoMenu(form); else await api.updateTipoMenu(modal.id,form); toast("Salvato"); setModal(null); reload(); }catch(e){ toast(e.message,"error"); } };
  const remove = row=>confirm(`Eliminare "${row.nome}"?`,async()=>{ try{ await api.deleteTipoMenu(row.id); toast("Eliminato"); reload(); }catch(e){ toast(e.message,"error"); } });

  return (
    <div><ToastEl/><Dialog/>
      <PageHeader title="Tipi Menu" subtitle="Categorizzazione macro: Food, Beverage, Cantina..."
        action={<Btn onClick={()=>{setForm({nome:"",colore:"#64748b",ordine:0});setModal("new");}}>+ Nuovo Tipo</Btn>}/>
      <DataTable loading={loading} rows={data} onEdit={r=>{setForm({...r});setModal(r);}} onDelete={remove}
        cols={[
          {key:"nome",  label:"Nome", render:(v,r)=><Badge label={v} color={r.colore}/>},
          {key:"ordine",label:"Ordine"},
        ]}/>
      {modal&&(
        <Modal title={modal==="new"?"Nuovo Tipo":"Modifica Tipo"} onClose={()=>setModal(null)}>
          <Field label="Nome" required><Input value={form.nome} onChange={f("nome")} placeholder="Food"/></Field>
          <FormRow>
            <Field label="Colore" half>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <input type="color" value={form.colore} onChange={e=>f("colore")(e.target.value)}
                  style={{width:38,height:32,border:`1px solid ${C.border}`,borderRadius:6,cursor:"pointer",padding:2}}/>
                <Input value={form.colore} onChange={f("colore")} placeholder="#64748b"/>
              </div>
            </Field>
            <Field label="Ordine" half><Input value={form.ordine} onChange={f("ordine")} type="number" min="0"/></Field>
          </FormRow>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:4}}><Btn variant="secondary" onClick={()=>setModal(null)}>Annulla</Btn><Btn onClick={save}>Salva</Btn></div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORIE MENU
// ═══════════════════════════════════════════════════════════════════════════
export function CategorieMenuPage() {
  const { data, loading, reload } = useCrud(api.getCategorieMenu);
  const { data: tipi } = useCrud(api.getTipiMenu);
  const { toast, ToastEl } = useToast();
  const { confirm, Dialog } = useConfirm();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ nome:"", tipo_id:"", colore:C.blue, emoji:"🍽️", ordine:0 });
  const f = k=>v=>setForm(p=>({...p,[k]:v}));

  const save = async()=>{
    try {
      const d={...form,tipo_id:form.tipo_id?parseInt(form.tipo_id):null,ordine:parseInt(form.ordine)||0};
      if(modal==="new") await api.createCategoriaMenu(d); else await api.updateCategoriaMenu(modal.id,d);
      toast("Salvato"); setModal(null); reload();
    } catch(e){ toast(e.message,"error"); }
  };
  const remove = row=>confirm(`Eliminare "${row.nome}"?`,async()=>{ try{ await api.deleteCategoriaMenu(row.id); toast("Eliminata"); reload(); }catch(e){ toast(e.message,"error"); } });

  return (
    <div><ToastEl/><Dialog/>
      <PageHeader title="Categorie Menu" subtitle="Antipasti, Primi, Secondi, Dolci, Vini..."
        action={<Btn onClick={()=>{setForm({nome:"",tipo_id:"",colore:C.blue,emoji:"🍽️",ordine:0});setModal("new");}}>+ Nuova Categoria</Btn>}/>
      <DataTable loading={loading} rows={data} onEdit={r=>{setForm({...r,tipo_id:r.tipo_id??""});setModal(r);}} onDelete={remove}
        cols={[
          {key:"emoji", label:"",    render:v=><span style={{fontSize:20}}>{v}</span>},
          {key:"nome",  label:"Nome",render:(v,r)=><Badge label={v} color={r.colore}/>},
          {key:"tipo_nome",label:"Tipo"},
          {key:"ordine",label:"Ordine"},
        ]}/>
      {modal&&(
        <Modal title={modal==="new"?"Nuova Categoria":"Modifica Categoria"} onClose={()=>setModal(null)}>
          <Field label="Nome" required><Input value={form.nome} onChange={f("nome")} placeholder="Antipasti"/></Field>
          <FormRow>
            <Field label="Tipo menu" half><Select value={form.tipo_id} onChange={f("tipo_id")} placeholder="— Seleziona —">{tipi.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}</Select></Field>
            <Field label="Ordine" half><Input value={form.ordine} onChange={f("ordine")} type="number" min="0"/></Field>
          </FormRow>
          <Field label="Icona emoji">
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:4}}>
              {EMOJIS.map(e=>(
                <div key={e} onClick={()=>f("emoji")(e)}
                  style={{width:36,height:36,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:19,cursor:"pointer",border:form.emoji===e?`2px solid ${C.navy}`:`1px solid ${C.border}`,
                    background:form.emoji===e?"#eff6ff":C.white,transition:"all .1s"}}>
                  {e}
                </div>
              ))}
            </div>
          </Field>
          <Field label="Colore"><ColorPicker value={form.colore} onChange={f("colore")}/></Field>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:8}}><Btn variant="secondary" onClick={()=>setModal(null)}>Annulla</Btn><Btn onClick={save}>Salva</Btn></div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORIE CLIENTE
// ═══════════════════════════════════════════════════════════════════════════
export function CategorieClientePage() {
  const { data, loading, reload } = useCrud(api.getCategorieCliente);
  const { toast, ToastEl } = useToast();
  const { confirm, Dialog } = useConfirm();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ nome:"", descrizione:"", sconto_perc:0 });
  const f = k=>v=>setForm(p=>({...p,[k]:v}));
  const save = async()=>{ try{ const d={...form,sconto_perc:parseFloat(form.sconto_perc)||0}; if(modal==="new") await api.createCategoriaCliente(d); else await api.updateCategoriaCliente(modal.id,d); toast("Salvato"); setModal(null); reload(); }catch(e){ toast(e.message,"error"); } };
  const remove = row=>confirm(`Eliminare "${row.nome}"?`,async()=>{ try{ await api.deleteCategoriaCliente(row.id); toast("Eliminata"); reload(); }catch(e){ toast(e.message,"error"); } });

  return (
    <div><ToastEl/><Dialog/>
      <PageHeader title="Categorie Cliente" subtitle="Ospiti hotel, esterni, VIP — con prezzi differenziati"
        action={<Btn onClick={()=>{setForm({nome:"",descrizione:"",sconto_perc:0});setModal("new");}}>+ Nuova Categoria</Btn>}/>
      <DataTable loading={loading} rows={data} onEdit={r=>{setForm({...r});setModal(r);}} onDelete={remove}
        cols={[
          {key:"nome",        label:"Nome"},
          {key:"descrizione", label:"Descrizione"},
          {key:"sconto_perc", label:"Sconto %",render:v=>v?<Badge label={`${v}%`} color={C.green}/>:"—"},
        ]}/>
      {modal&&(
        <Modal title={modal==="new"?"Nuova Categoria":"Modifica Categoria"} onClose={()=>setModal(null)}>
          <Field label="Nome" required><Input value={form.nome} onChange={f("nome")} placeholder="Ospiti Hotel"/></Field>
          <Field label="Descrizione"><Textarea value={form.descrizione} onChange={f("descrizione")} rows={2}/></Field>
          <Field label="Sconto % di default"><Input value={form.sconto_perc} onChange={f("sconto_perc")} type="number" min="0" step="0.5" placeholder="0"/></Field>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:4}}><Btn variant="secondary" onClick={()=>setModal(null)}>Annulla</Btn><Btn onClick={save}>Salva</Btn></div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// VOCI MENU
// ═══════════════════════════════════════════════════════════════════════════
export function VociMenuPage() {
  const { data, loading, reload } = useCrud(()=>api.getVociMenu("?solo_attivi=0"));
  const { data: categorie }       = useCrud(api.getCategorieMenu);
  const { data: allergeni }       = useCrud(api.getAllergeni);
  const { data: catClienti }      = useCrud(api.getCategorieCliente);
  const { data: outlets }         = useCrud(api.getOutlets);
  const { data: stampanti }       = useCrud(()=>api.getStampanti());
  const { data: monitors }        = useCrud(()=>api.getMonitor());
  const { toast, ToastEl } = useToast();
  const { confirm, Dialog } = useConfirm();
  const [modal, setModal]   = useState(null);
  const [filterCat, setFilterCat] = useState("");
  const empty = { categoria_id:"", nome_it:"", nome_en:"", nome_de:"", nome_fr:"", descrizione:"", prezzo:0, attivo:true, allergeni_ids:[], outlet_ids:[], prezzi_speciali:[], stampanti_config:[], monitor_config:[], nel_web_menu:false };
  const [form, setForm] = useState(empty);
  const f = k=>v=>setForm(p=>({...p,[k]:v}));

  const toggleAllergene = id=>setForm(p=>({...p,allergeni_ids:p.allergeni_ids.includes(id)?p.allergeni_ids.filter(x=>x!==id):[...p.allergeni_ids,id]}));
  const updatePrezzo = (idx,field,val)=>setForm(p=>({...p,prezzi_speciali:p.prezzi_speciali.map((x,i)=>i===idx?{...x,[field]:val}:x)}));

  const open = async row=>{
    if(!row){ setForm(empty); setModal("new"); return; }
    const full=await api.getVoce(row.id);
    setForm({
      ...full,
      categoria_id:   String(full.categoria_id),
      allergeni_ids:  full.allergeni.map(a=>a.id),
      outlet_ids:     (full.outlet_ids||[]).map(Number),
      stampanti_config: (full.stampanti_config||[]),
      monitor_config:   (full.monitor_config||[]),
      nel_web_menu:     !!full.nel_web_menu,
      prezzi_speciali: (full.prezzi_spec||[]).map(p=>({
        categoria_cliente_id: p.categoria_cliente_id ? String(p.categoria_cliente_id) : "",
        outlet_id:            p.outlet_id            ? String(p.outlet_id)            : "",
        prezzo_override:      p.prezzo_override
      }))
    });
    setModal(row);
  };

  const save = async()=>{
    try {
      const d={
        ...form,
        categoria_id:  parseInt(form.categoria_id),
        nel_web_menu:  !!form.nel_web_menu,
        prezzo:        parseFloat(form.prezzo)||0,
        outlet_ids:    form.outlet_ids.map(Number),
        prezzi_speciali: form.prezzi_speciali
          .filter(p=>(p.categoria_cliente_id||p.outlet_id) && p.prezzo_override!=="")
          .map(p=>({
            categoria_cliente_id: p.categoria_cliente_id ? parseInt(p.categoria_cliente_id) : null,
            outlet_id:            p.outlet_id            ? parseInt(p.outlet_id)            : null,
            prezzo_override:      parseFloat(p.prezzo_override)
          }))
      };
      const savedId = modal==="new" 
        ? (await api.createVoce(d)).id 
        : (await api.updateVoce(modal.id,d), modal.id);
      // Save stampanti config
      const stampCfg = (form.stampanti_config||[])
        .filter(s=>s.stampante_id && s.outlet_id)
        .map(s=>({stampante_id:parseInt(s.stampante_id), outlet_id:parseInt(s.outlet_id), contesto:s.contesto||"reparto_produzione"}));
      await api.setVoceStampanti(savedId, stampCfg);
      // Save monitor config
      const monCfg = (form.monitor_config||[])
        .filter(m=>m.monitor_id||m.tutti_monitor)
        .map(m=>({monitor_id:m.monitor_id?parseInt(m.monitor_id):null, tutti_monitor:!!m.tutti_monitor}));
      await api.setVoceMonitor(savedId, monCfg);
      toast("Salvato"); setModal(null); reload();
    } catch(e){ toast(e.message,"error"); }
  };
  const remove = row=>confirm(`Eliminare "${row.nome_it}"?`,async()=>{ try{ await api.deleteVoce(row.id); toast("Eliminata"); reload(); }catch(e){ toast(e.message,"error"); } });

  const filtered = filterCat?data.filter(v=>v.categoria_id===parseInt(filterCat)):data;

  return (
    <div><ToastEl/><Dialog/>
      <PageHeader title="Voci Menu" subtitle="Tutti i piatti, bevande e articoli — multilingua"
        action={<Btn onClick={()=>open(null)}>+ Nuova Voce</Btn>}/>
      <div style={{marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
        <label style={{fontSize:12,fontWeight:600,color:C.text}}>Categoria:</label>
        <select value={filterCat} onChange={e=>setFilterCat(e.target.value)}
          style={{border:`1.5px solid ${C.border}`,borderRadius:8,padding:"6px 10px",fontSize:12}}>
          <option value="">Tutte le categorie</option>
          {categorie.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.nome}</option>)}
        </select>
        <span style={{fontSize:12,color:C.muted,background:C.white,border:`1px solid ${C.border}`,borderRadius:20,padding:"2px 10px"}}>{filtered.length} voci</span>
      </div>
      <DataTable loading={loading} rows={filtered} onEdit={open} onDelete={remove}
        cols={[
          {key:"nome_it",      label:"Nome IT"},
          {key:"categoria_nome",label:"Categoria"},
          {key:"prezzo",       label:"Prezzo",   render:v=><strong>€ {parseFloat(v).toFixed(2)}</strong>},
          {key:"allergeni",    label:"Allergeni",render:v=>v?.length?<div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{v.map(a=><Badge key={a.id} label={a.codice} color={C.amber}/>)}</div>:"—"},
          {key:"attivo",       label:"Stato",    render:v=><Badge label={v?"Attivo":"Disattivo"} color={v?C.green:"#94a3b8"} dot/>},
        ]}/>
      {modal&&(
        <Modal wide title={modal==="new"?"Nuova Voce Menu":"Modifica Voce Menu"} onClose={()=>setModal(null)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Field label="Nome italiano" required><Input value={form.nome_it} onChange={f("nome_it")} placeholder="Spaghetti al Pomodoro"/></Field>
            <Field label="Nome inglese"><Input value={form.nome_en} onChange={f("nome_en")} placeholder="Spaghetti with Tomato Sauce"/></Field>
            <Field label="Nome tedesco"><Input value={form.nome_de} onChange={f("nome_de")}/></Field>
            <Field label="Nome francese"><Input value={form.nome_fr} onChange={f("nome_fr")}/></Field>
          </div>
          <Field label="Descrizione"><Textarea value={form.descrizione} onChange={f("descrizione")} rows={2}/></Field>
          <FormRow>
            <Field label="Categoria" required half><Select value={form.categoria_id} onChange={f("categoria_id")} placeholder="— Seleziona —">{categorie.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.nome}</option>)}</Select></Field>
            <Field label="Prezzo base (€)" required half><Input value={form.prezzo} onChange={f("prezzo")} type="number" min="0" step="0.50"/></Field>
          </FormRow>
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:12,fontWeight:600,color:C.text,marginBottom:7}}>Allergeni presenti</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {allergeni.map(a=>(
                <div key={a.id} onClick={()=>toggleAllergene(a.id)}
                  style={{padding:"4px 11px",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700,transition:"all .12s",
                    background:form.allergeni_ids.includes(a.id)?C.navy:`${C.navy}0d`,
                    color:form.allergeni_ids.includes(a.id)?"white":C.text,
                    border:`1px solid ${form.allergeni_ids.includes(a.id)?C.navy:C.border}`}}>
                  {a.codice} — {a.nome}
                </div>
              ))}
            </div>
          </div>
          {/* Outlet attivi per questa voce */}
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:12,fontWeight:600,color:C.text,marginBottom:7}}>
              Outlet attivi <span style={{fontWeight:400,color:"#6b7280"}}>(vuoto = tutti gli outlet)</span>
            </label>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {(outlets||[]).map(o=>{
                const sel = form.outlet_ids.includes(o.id)||form.outlet_ids.includes(Number(o.id));
                return (
                  <div key={o.id}
                    onClick={()=>setForm(p=>({...p,outlet_ids:sel?p.outlet_ids.filter(x=>x!==o.id&&x!==Number(o.id)):[...p.outlet_ids,Number(o.id)]}))}
                    style={{padding:"4px 11px",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700,transition:"all .12s",
                      background:sel?C.navy:`${C.navy}0d`,
                      color:sel?"white":C.text,
                      border:`1px solid ${sel?C.navy:C.border}`}}>
                    {o.nome}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stampanti associazione */}
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <label style={{fontSize:12,fontWeight:600,color:C.text}}>
                🖨️ Stampanti <span style={{fontWeight:400,color:"#6b7280"}}>(per outlet e contesto)</span>
              </label>
              <Btn small variant="secondary" onClick={()=>setForm(p=>({...p,stampanti_config:[...p.stampanti_config,{stampante_id:"",outlet_id:"",contesto:"reparto_produzione"}]}))}>
                + Aggiungi
              </Btn>
            </div>
            {form.stampanti_config.length===0&&(
              <div style={{fontSize:12,color:"#9ca3af",padding:"8px 0"}}>Nessuna stampante associata</div>
            )}
            {form.stampanti_config.map((sc,i)=>(
              <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
                <select value={sc.outlet_id||""} onChange={e=>setForm(p=>({...p,stampanti_config:p.stampanti_config.map((x,j)=>j===i?{...x,outlet_id:e.target.value}:x)}))}
                  style={{flex:2,border:`1.5px solid ${C.border}`,borderRadius:7,padding:"5px 8px",fontSize:12,background:"white"}}>
                  <option value="">— Outlet —</option>
                  {(outlets||[]).map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}
                </select>
                <select value={sc.stampante_id||""} onChange={e=>setForm(p=>({...p,stampanti_config:p.stampanti_config.map((x,j)=>j===i?{...x,stampante_id:e.target.value}:x)}))}
                  style={{flex:2,border:`1.5px solid ${C.border}`,borderRadius:7,padding:"5px 8px",fontSize:12,background:"white"}}>
                  <option value="">— Stampante —</option>
                  {(stampanti||[]).filter(s=>!sc.outlet_id||String(s.outlet_id)===String(sc.outlet_id)||!s.outlet_id).map(s=>(
                    <option key={s.id} value={s.id}>{s.nome} ({s.tipo})</option>
                  ))}
                </select>
                <select value={sc.contesto||"reparto_produzione"} onChange={e=>setForm(p=>({...p,stampanti_config:p.stampanti_config.map((x,j)=>j===i?{...x,contesto:e.target.value}:x)}))}
                  style={{flex:2,border:`1.5px solid ${C.border}`,borderRadius:7,padding:"5px 8px",fontSize:12,background:"white"}}>
                  <option value="reparto_produzione">🍳 Reparto produzione</option>
                  <option value="chiusura_comanda">🏁 Chiusura comanda</option>
                </select>
                <Btn small variant="danger" onClick={()=>setForm(p=>({...p,stampanti_config:p.stampanti_config.filter((_,j)=>j!==i)}))}>×</Btn>
              </div>
            ))}
          </div>

          {/* Monitor associazione */}
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <label style={{fontSize:12,fontWeight:600,color:C.text}}>
                📺 Service Monitor <span style={{fontWeight:400,color:"#6b7280"}}>(reparti di destinazione)</span>
              </label>
              <div style={{display:"flex",gap:6}}>
                <Btn small variant="secondary" onClick={()=>setForm(p=>({...p,monitor_config:[...p.monitor_config,{monitor_id:"",tutti_monitor:false}]}))}>
                  + Specifico
                </Btn>
                <Btn small variant="secondary" onClick={()=>{
                  if(!form.monitor_config.some(m=>m.tutti_monitor))
                    setForm(p=>({...p,monitor_config:[...p.monitor_config,{monitor_id:null,tutti_monitor:true}]}));
                }}>
                  ✦ Tutti
                </Btn>
              </div>
            </div>
            {form.monitor_config.length===0&&(
              <div style={{fontSize:12,color:"#9ca3af",padding:"6px 0"}}>
                Nessun monitor — la voce non comparirà su alcun KDS
              </div>
            )}
            {form.monitor_config.map((mc,i)=>(
              <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
                {mc.tutti_monitor ? (
                  <div style={{flex:1,padding:"6px 10px",borderRadius:7,border:"1px solid #2d5a7b",
                    background:"#eff6ff",fontSize:12,color:"#1d4ed8",fontWeight:600,display:"flex",
                    alignItems:"center",gap:6}}>
                    ✦ Tutti i monitor (show ovunque)
                  </div>
                ) : (
                  <select value={mc.monitor_id||""} onChange={e=>setForm(p=>({...p,monitor_config:p.monitor_config.map((x,j)=>j===i?{...x,monitor_id:e.target.value}:x)}))}
                    style={{flex:1,border:`1.5px solid ${C.border}`,borderRadius:7,padding:"5px 8px",fontSize:12,background:"white"}}>
                    <option value="">— Seleziona monitor —</option>
                    {(monitors||[]).map(m=>{
                      const rLabel={cucina:"🍳",bar:"🍹",pasticceria:"🎂",gelateria:"🍦",pizzeria:"🍕",griglia:"🔥",custom:"⚙️"}[m.reparto]||"📺";
                      return <option key={m.id} value={m.id}>{rLabel} {m.nome}</option>;
                    })}
                  </select>
                )}
                <Btn small variant="danger" onClick={()=>setForm(p=>({...p,monitor_config:p.monitor_config.filter((_,j)=>j!==i)}))}>✕</Btn>
              </div>
            ))}
          </div>

          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}>
              <label style={{fontSize:12,fontWeight:600,color:C.text}}>
                Prezzi speciali <span style={{fontWeight:400,color:"#6b7280"}}>(per outlet e/o categoria cliente)</span>
              </label>
              <Btn small variant="secondary" onClick={()=>setForm(p=>({...p,prezzi_speciali:[...p.prezzi_speciali,{categoria_cliente_id:"",outlet_id:"",prezzo_override:""}]}))}>+ Aggiungi</Btn>
            </div>
            {form.prezzi_speciali.map((ps,i)=>(
              <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:6,flexWrap:"wrap"}}>
                <select value={ps.outlet_id||""} onChange={e=>updatePrezzo(i,"outlet_id",e.target.value)}
                  style={{flex:2,border:`1.5px solid ${C.border}`,borderRadius:7,padding:"6px 8px",fontSize:12}}>
                  <option value="">— Outlet (tutti) —</option>
                  {(outlets||[]).map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}
                </select>
                <select value={ps.categoria_cliente_id||""} onChange={e=>updatePrezzo(i,"categoria_cliente_id",e.target.value)}
                  style={{flex:2,border:`1.5px solid ${C.border}`,borderRadius:7,padding:"6px 8px",fontSize:12}}>
                  <option value="">— Cat. Cliente (tutti) —</option>
                  {catClienti.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                <input type="number" value={ps.prezzo_override} onChange={e=>updatePrezzo(i,"prezzo_override",e.target.value)}
                  min="0" step="0.50" placeholder="€"
                  style={{flex:1,border:`1.5px solid ${C.border}`,borderRadius:7,padding:"6px 8px",fontSize:12}}/>
                <Btn small variant="danger" onClick={()=>setForm(p=>({...p,prezzi_speciali:p.prezzi_speciali.filter((_,j)=>j!==i)}))}>×</Btn>
              </div>
            ))}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
            <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,cursor:"pointer",color:C.text}}>
              <input type="checkbox" checked={form.nel_web_menu} onChange={e=>f("nel_web_menu")(e.target.checked)}
                style={{width:15,height:15}}/> 🌐 Includi nel Web Menu
            </label>
            <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,cursor:"pointer",color:C.text}}>
              <input type="checkbox" checked={form.attivo} onChange={e=>f("attivo")(e.target.checked)} style={{accentColor:C.navy}}/>
              Voce attiva nel menu
            </label>
            <div style={{display:"flex",gap:8}}><Btn variant="secondary" onClick={()=>setModal(null)}>Annulla</Btn><Btn onClick={save}>Salva</Btn></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MENU DEL GIORNO
// ═══════════════════════════════════════════════════════════════════════════
export function MenuDelGiornoPage() {
  const { data: outlets } = useCrud(api.getOutlets);
  const [selOutlet, setSelOutlet] = useState("");
  const [menus, setMenus]   = useState([]);
  const [loadingM, setLM]   = useState(false);
  const { data: voci }      = useCrud(()=>api.getVociMenu(""));
  const { data: categorie } = useCrud(api.getCategorieMenu);
  const { toast, ToastEl } = useToast();
  const { confirm, Dialog } = useConfirm();
  const [modal, setModal]   = useState(null);
  const [filterCat, setFilterCat] = useState("");
  const empty = { nome:"", data:new Date().toISOString().split("T")[0], prezzo_fisso:"", note:"", voci_ids:[] };
  const [form, setForm] = useState(empty);
  const f = k=>v=>setForm(p=>({...p,[k]:v}));

  const loadMenus = async(oid)=>{ setLM(true); try{ setMenus(await api.getMenuDelGiorno(`?outlet_id=${oid}`)); }finally{ setLM(false); } };
  useEffect(()=>{ if(outlets.length&&!selOutlet){ const id=String(outlets[0].id); setSelOutlet(id); loadMenus(id); } },[outlets]);

  const toggleVoce = id=>setForm(p=>({...p,voci_ids:p.voci_ids.includes(id)?p.voci_ids.filter(x=>x!==id):[...p.voci_ids,id]}));
  const totalCalc  = form.voci_ids.reduce((s,id)=>{ const v=voci.find(x=>x.id===id); return s+(v?v.prezzo:0); },0);

  const save = async()=>{
    try {
      const d={...form,outlet_id:parseInt(selOutlet),prezzo_fisso:form.prezzo_fisso?parseFloat(form.prezzo_fisso):null,voci_ids:form.voci_ids};
      if(modal==="new") await api.createMenuDelGiorno(d); else await api.updateMenuDelGiorno(modal.id,d);
      toast("Menu salvato"); setModal(null); loadMenus(selOutlet);
    } catch(e){ toast(e.message,"error"); }
  };
  const remove = row=>confirm(`Eliminare menu "${row.nome}"?`,async()=>{ try{ await api.deleteMenuDelGiorno(row.id); toast("Eliminato"); loadMenus(selOutlet); }catch(e){ toast(e.message,"error"); } });

  const filteredVoci = filterCat?voci.filter(v=>v.categoria_id===parseInt(filterCat)):voci;

  return (
    <div><ToastEl/><Dialog/>
      <PageHeader title="Menu del Giorno" subtitle="Componi il menu giornaliero selezionando le voci"
        action={<Btn onClick={()=>{setForm({...empty,outlet_id:selOutlet});setModal("new");}}>+ Nuovo Menu</Btn>}/>
      <div style={{marginBottom:14}}>
        <label style={{fontSize:12,fontWeight:600,color:C.text,marginRight:8}}>Outlet:</label>
        <select value={selOutlet} onChange={e=>{setSelOutlet(e.target.value);loadMenus(e.target.value);}}
          style={{border:`1.5px solid ${C.border}`,borderRadius:8,padding:"6px 10px",fontSize:12}}>
          {outlets.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
      </div>
      <DataTable loading={loadingM} rows={menus} onEdit={r=>{setForm({...r,voci_ids:r.voci.map(v=>v.id),prezzo_fisso:r.prezzo_fisso??""});setModal(r);}} onDelete={remove}
        cols={[
          {key:"data",        label:"Data"},
          {key:"nome",        label:"Nome menu"},
          {key:"voci",        label:"Voci",      render:v=><Badge label={`${v?.length||0} piatti`} color={C.blue}/>},
          {key:"prezzo_fisso",label:"Prezzo",    render:v=>v?`€ ${parseFloat(v).toFixed(2)}`:"Somma voci"},
          {key:"attivo",      label:"Stato",     render:v=><Badge label={v?"Attivo":"Inattivo"} color={v?C.green:"#94a3b8"} dot/>},
        ]}/>
      {modal&&(
        <Modal wide title={modal==="new"?"Nuovo Menu del Giorno":"Modifica Menu"} onClose={()=>setModal(null)}>
          <FormRow>
            <Field label="Nome menu" required half><Input value={form.nome} onChange={f("nome")} placeholder="Menu di Pasqua"/></Field>
            <Field label="Data" half><Input value={form.data} onChange={f("data")} type="date"/></Field>
          </FormRow>
          <FormRow>
            <Field label="Prezzo fisso € (vuoto = somma voci)" half><Input value={form.prezzo_fisso} onChange={f("prezzo_fisso")} type="number" min="0" step="0.50" placeholder="es. 40.00"/></Field>
            <Field label="Note" half><Input value={form.note} onChange={f("note")}/></Field>
          </FormRow>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <label style={{fontSize:12,fontWeight:600,color:C.text}}>Seleziona voci da includere</label>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <select value={filterCat} onChange={e=>setFilterCat(e.target.value)}
                style={{border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 8px",fontSize:11}}>
                <option value="">Tutte le categorie</option>
                {categorie.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.nome}</option>)}
              </select>
              <Badge label={`${form.voci_ids.length} sel.`} color={C.blue}/>
              {!form.prezzo_fisso&&<Badge label={`€ ${totalCalc.toFixed(2)}`} color={C.green}/>}
            </div>
          </div>
          <div style={{maxHeight:280,overflowY:"auto",border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
            {filteredVoci.map(v=>(
              <div key={v.id} onClick={()=>toggleVoce(v.id)}
                style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",
                  borderBottom:`1px solid ${C.border}`,cursor:"pointer",
                  background:form.voci_ids.includes(v.id)?"#eff6ff":C.white,transition:"background .1s"}}
                onMouseEnter={e=>{if(!form.voci_ids.includes(v.id))e.currentTarget.style.background="#f8fafc";}}
                onMouseLeave={e=>{if(!form.voci_ids.includes(v.id))e.currentTarget.style.background=C.white;}}>
                <input type="checkbox" checked={form.voci_ids.includes(v.id)} readOnly style={{accentColor:C.navy,flexShrink:0}}/>
                <span style={{flex:1,fontSize:12,color:C.text,fontWeight:form.voci_ids.includes(v.id)?600:400}}>{v.nome_it}</span>
                <span style={{fontSize:11,color:C.muted}}>{v.categoria_nome}</span>
                <span style={{fontSize:12,fontWeight:700,color:C.navy,minWidth:60,textAlign:"right"}}>€ {parseFloat(v.prezzo).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:14}}><Btn variant="secondary" onClick={()=>setModal(null)}>Annulla</Btn><Btn onClick={save}>Salva Menu</Btn></div>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STAMPANTI PAGE
// ══════════════════════════════════════════════════════════════════════════════
export function StampantiPage() {
  const { data: rawStampanti, loading, reload } = useCrud(()=>api.getStampanti());
  const stampanti = (rawStampanti||[]).filter(Boolean);
  const { data: outlets } = useCrud(api.getOutlets);
  const { toast, ToastEl } = useToast();
  const { confirm, Dialog } = useConfirm();
  const [modal, setModal] = useState(null);
  const empty = { nome:"", ip_address:"", protocollo:"epson", tipo:"produzione", outlet_id:"", attiva:true };
  const [form, setForm] = useState(empty);
  const f = k => v => setForm(p=>({...p,[k]:v}));

  const PROTOCOLLI = [
    ["epson",   "Epson (ESC/POS)"],
    ["star",    "Star Micronics"],
    ["generic", "Generic ESC/POS"],
    ["bixolon", "Bixolon"],
    ["custom",  "Custom/Altro"],
  ];
  const TIPI = [
    ["produzione", "🍳 Reparto Produzione (cucina/bar)"],
    ["fiscale",    "🖨️ Fiscale (scontrino/fattura)"],
    ["preconto",   "📋 Pre-conto / Estratto conto"],
  ];

  const open = row => {
    if (!row) { setForm(empty); setModal("new"); return; }
    setForm({...row, outlet_id: row.outlet_id ? String(row.outlet_id) : ""});
    setModal("edit");
  };

  const save = async () => {
    if (!form.nome.trim()) { toast("Nome obbligatorio","error"); return; }
    const payload = {
      ...form,
      outlet_id: form.outlet_id ? parseInt(form.outlet_id) : null,
    };
    try {
      if (modal==="new") await api.createStampante(payload);
      else               await api.updateStampante(form.id, payload);
      toast("✓ Salvato"); reload(); setModal(null);
    } catch(e) { toast(e.message,"error"); }
  };

  const remove = row => {
    confirm(`Eliminare "${row?.nome}"?`, async () => {
      try { await api.deleteStampante(row.id); toast("✓ Eliminata"); reload(); }
      catch(e) { toast(e.message,"error"); }
    });
  };

  const TIPO_COLORS = {
    produzione: { bg:"#eff6ff", color:"#1d4ed8", border:"#bfdbfe" },
    fiscale:    { bg:"#f0fdf4", color:"#15803d", border:"#bbf7d0" },
    preconto:   { bg:"#fef9c3", color:"#854d0e", border:"#fde68a" },
  };

  const cols = [
    { key:"nome",       label:"Nome",         render: (_, r) => <strong>{r?.nome||"—"}</strong> },
    { key:"tipo",       label:"Tipo",         render: (_, r) => {
        const s = TIPO_COLORS[r?.tipo]||{bg:"#f9fafb",color:"#6b7280",border:"#e5e7eb"};
        return <span style={{padding:"2px 10px",borderRadius:10,fontSize:11,fontWeight:700,
          background:s.bg,color:s.color,border:`1px solid ${s.border}`}}>
          {TIPI.find(([k])=>k===r?.tipo)?.[1]||r?.tipo||"—"}
        </span>;
    }},
    { key:"ip_address", label:"Indirizzo IP", render: (val) => <code style={{fontSize:12}}>{val||"—"}</code> },
    { key:"protocollo", label:"Protocollo",   render: (val) => val||"—" },
    { key:"outlet_id",  label:"Outlet",       render: (val) => val
        ? (outlets.find(o=>o.id===val)?.nome||"—")
        : <span style={{color:"#9ca3af"}}>Tutti</span> },
    { key:"attiva",     label:"Stato",        render: (val) => <span style={{color:val?"#16a34a":"#9ca3af",fontWeight:600}}>{val?"Attiva":"Inattiva"}</span> },
    { key:"id",         label:"",             render: (_, r) => (
      <div style={{display:"flex",gap:6}}>
        <Btn size="sm" onClick={()=>open(r)}>✏️ Modifica</Btn>
        <Btn size="sm" variant="danger" onClick={()=>remove(r)}>🗑</Btn>
      </div>
    )},
  ];

  return (
    <div style={{padding:24,maxWidth:1100,margin:"0 auto"}}>
      <ToastEl/><Dialog/>
      <PageHeader title="🖨️ Stampanti" subtitle="Gestione stampanti di produzione, fiscali e pre-conto"
        action={<Btn onClick={()=>open(null)}>+ Nuova stampante</Btn>}/>

      {/* Legend */}
      <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
        {TIPI.map(([k,lab])=>{
          const s=TIPO_COLORS[k]||{bg:"#f9fafb",color:"#6b7280",border:"#e5e7eb"};
          return <span key={k} style={{fontSize:12,padding:"3px 12px",borderRadius:12,
            background:s.bg,color:s.color,border:`1px solid ${s.border}`,fontWeight:600}}>{lab}</span>;
        })}
      </div>

      <DataTable cols={cols} rows={stampanti} loading={loading} emptyMsg="Nessuna stampante configurata"/>

      {/* Modal */}
      {modal&&(
        <Modal title={modal==="new"?"Nuova stampante":"Modifica stampante"} onClose={()=>setModal(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Field label="Nome stampante *">
              <Input value={form.nome} onChange={f("nome")} placeholder="Es. Cucina principale"/>
            </Field>
            <Field label="Tipo *">
              <Select value={form.tipo} onChange={f("tipo")}>
                {TIPI.map(([k,lab])=><option key={k} value={k}>{lab}</option>)}
              </Select>
            </Field>
            <Field label="Protocollo">
              <Select value={form.protocollo} onChange={f("protocollo")}>
                {PROTOCOLLI.map(([k,lab])=><option key={k} value={k}>{lab}</option>)}
              </Select>
            </Field>
            <Field label="Indirizzo IP">
              <Input value={form.ip_address} onChange={f("ip_address")} placeholder="Es. 192.168.1.100"/>
            </Field>
            <Field label="Outlet associato">
              <Select value={form.outlet_id} onChange={f("outlet_id")}>
                <option value="">— Tutti gli outlet —</option>
                {(outlets||[]).map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}
              </Select>
            </Field>
            <Field label="Stato">
              <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                <input type="checkbox" checked={form.attiva}
                  onChange={e=>setForm(p=>({...p,attiva:e.target.checked}))}
                  style={{width:16,height:16}}/>
                <span style={{fontSize:13}}>Stampante attiva</span>
              </label>
            </Field>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
              <Btn variant="secondary" onClick={()=>setModal(null)}>Annulla</Btn>
              <Btn onClick={save}>✓ Salva</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// SERVICE MONITOR PAGE
// ══════════════════════════════════════════════════════════════════════════════
const REPARTI = [
  ["cucina",      "🍳 Cucina"],
  ["bar",         "🍹 Bar"],
  ["pasticceria", "🎂 Pasticceria"],
  ["gelateria",   "🍦 Gelateria"],
  ["pizzeria",    "🍕 Pizzeria"],
  ["griglia",     "🔥 Griglia"],
  ["custom",      "⚙️ Custom"],
];
const PRESET_COLORS = [
  {sfondo:"#1a1a2e",griglia:"#2a2a3e",testo:"#ffffff",header:"#ffffff",label:"Notte"},
  {sfondo:"#0f3460",griglia:"#1a4a78",testo:"#e0f7fa",header:"#e0f7fa",label:"Oceano"},
  {sfondo:"#16213e",griglia:"#243448",testo:"#f5a623",header:"#f5a623",label:"Ambra"},
  {sfondo:"#1b4332",griglia:"#2d6a4f",testo:"#d8f3dc",header:"#d8f3dc",label:"Bosco"},
  {sfondo:"#3d0000",griglia:"#5c1010",testo:"#ffd6d6",header:"#ffd6d6",label:"Fuoco"},
  {sfondo:"#ffffff",griglia:"#f8fafc",testo:"#1a1a2e",header:"#1a1a2e",label:"Bianco"},
];

export function ServiceMonitorPage() {
  const { data: monitors, loading, reload } = useCrud(()=>api.getMonitor());
  const { data: outlets }  = useCrud(api.getOutlets);
  const { toast, ToastEl } = useToast();
  const { confirm, Dialog } = useConfirm();
  const [modal, setModal]  = useState(null);
  const empty = { nome:"", reparto:"cucina", outlet_id:"",
                  colore_sfondo:"#1a1a2e", colore_testo:"#ffffff", colore_griglia:"#2a2a3e", colore_header:"#ffffff", attivo:true };
  const [form, setForm]    = useState(empty);
  const f = k=>v=>setForm(p=>({...p,[k]:v}));
  const [copiedId, setCopied] = useState(null);

  const baseUrl = typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:3000";

  const monitorUrl = slug => `${baseUrl}/monitor/${slug}`;

  const copyUrl = (slug, id) => {
    navigator.clipboard.writeText(monitorUrl(slug));
    setCopied(id); setTimeout(()=>setCopied(null), 2000);
  };

  const save = async () => {
    if (!form.nome.trim()) { toast("Nome obbligatorio","error"); return; }
    try {
      const payload = {...form, outlet_id: form.outlet_id ? parseInt(form.outlet_id) : null};
      if (modal==="new") await api.createMonitor(payload);
      else               await api.updateMonitor(modal.id, payload);
      toast("✓ Monitor salvato"); setModal(null); reload();
    } catch(e) { toast(e.message,"error"); }
  };

  const remove = row => confirm(`Eliminare monitor "${row.nome}"?`, async()=>{
    try { await api.deleteMonitor(row.id); toast("✓ Eliminato"); reload(); }
    catch(e) { toast(e.message,"error"); }
  });

  return (
    <div><ToastEl/><Dialog/>
      <PageHeader title="📺 Service Monitor" subtitle="Monitor KDS per reparti di produzione — cucina, bar, pasticceria"
        action={<Btn onClick={()=>{setForm(empty);setModal("new");}}>+ Nuovo Monitor</Btn>}/>

      {/* Info banner */}
      <div style={{marginBottom:20,padding:"12px 16px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,fontSize:12,color:"#1e40af",display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:20}}>ℹ️</span>
        <div>
          <strong>Come funziona:</strong> ogni monitor genera un URL univoco da impostare su un display/tablet in reparto.
          La pagina si aggiorna automaticamente ogni 15 secondi mostrando le comande attive per quell'outlet.
        </div>
      </div>

      {/* Monitor cards grid */}
      {loading && <div style={{textAlign:"center",padding:40,color:"#94a3b8"}}>Caricamento...</div>}
      {!loading && monitors?.length===0 && (
        <div style={{textAlign:"center",padding:60,color:"#94a3b8",fontSize:13}}>
          <div style={{fontSize:48,marginBottom:12}}>📺</div>
          <div>Nessun monitor configurato</div>
          <div style={{fontSize:11,marginTop:4}}>Crea il primo monitor con il pulsante in alto a destra</div>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:16}}>
        {(monitors||[]).map(m => {
          const outletNome = outlets.find(o=>o.id===m.outlet_id)?.nome || "Tutti";
          const repartoLabel = REPARTI.find(([k])=>k===m.reparto)?.[1] || m.reparto;
          const url = monitorUrl(m.slug);
          return (
            <div key={m.id} style={{background:"white",border:"1px solid #e2e8f0",borderRadius:12,
              overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
              {/* Preview header */}
              <div style={{background:m.colore_sfondo,padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div style={{color:m.colore_testo,fontWeight:800,fontSize:15,fontFamily:"monospace"}}>{m.nome}</div>
                  <div style={{color:m.colore_testo,opacity:.7,fontSize:11,marginTop:2}}>{repartoLabel} · {outletNome}</div>
                </div>
                <div style={{width:36,height:36,borderRadius:8,border:`2px solid ${m.colore_testo}33`,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
                  {REPARTI.find(([k])=>k===m.reparto)?.[1]?.[0] || "📺"}
                </div>
              </div>
              {/* Body */}
              <div style={{padding:"12px 16px"}}>
                {/* Status + edit row */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <span style={{fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:10,
                    background:m.attivo?"#f0fdf4":"#f9fafb",
                    color:m.attivo?"#16a34a":"#94a3b8",
                    border:`1px solid ${m.attivo?"#bbf7d0":"#e2e8f0"}`}}>
                    {m.attivo?"● Attivo":"○ Inattivo"}
                  </span>
                  <div style={{display:"flex",gap:6}}>
                    <Btn size="sm" onClick={()=>{setForm({...m,outlet_id:m.outlet_id?String(m.outlet_id):""});setModal(m);}}>✏️ Modifica</Btn>
                    <Btn size="sm" variant="danger" onClick={()=>remove(m)}>🗑</Btn>
                  </div>
                </div>
                {/* URL box */}
                <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:8,padding:"8px 10px"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#94a3b8",marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>URL Monitor</div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <code style={{flex:1,fontSize:11,color:"#1e40af",wordBreak:"break-all",lineHeight:1.4}}>{url}</code>
                    <button onClick={()=>copyUrl(m.slug, m.id)}
                      style={{flexShrink:0,padding:"5px 10px",borderRadius:6,border:"1px solid #2d5a7b",
                        background:copiedId===m.id?"#2d5a7b":"white",
                        color:copiedId===m.id?"white":"#2d5a7b",
                        cursor:"pointer",fontSize:11,fontWeight:700,whiteSpace:"nowrap",transition:"all .2s"}}>
                      {copiedId===m.id?"✓ Copiato!":"📋 Copia"}
                    </button>
                    <button onClick={()=>window.open(url,"_blank")}
                      style={{flexShrink:0,padding:"5px 10px",borderRadius:6,border:"1px solid #e2e8f0",
                        background:"white",color:"#64748b",cursor:"pointer",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>
                      🔗 Apri
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create/Edit Modal */}
      {modal&&(
        <Modal title={modal==="new"?"Nuovo Monitor KDS":"Modifica Monitor"} onClose={()=>setModal(null)}>
          <Field label="Nome monitor *">
            <Input value={form.nome} onChange={f("nome")} placeholder="Es. Monitor Cucina Principale"/>
          </Field>
          <FormRow>
            <Field label="Reparto" half>
              <Select value={form.reparto} onChange={f("reparto")}>
                {REPARTI.map(([k,lab])=><option key={k} value={k}>{lab}</option>)}
              </Select>
            </Field>
            <Field label="Outlet" half>
              <Select value={form.outlet_id} onChange={f("outlet_id")}>
                <option value="">— Tutti —</option>
                {outlets.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}
              </Select>
            </Field>
          </FormRow>
          {/* Color presets */}
          <Field label="Tema colori">
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
              {PRESET_COLORS.map(p=>(
                <button key={p.label} onClick={()=>setForm(prev=>({...prev,colore_sfondo:p.sfondo,colore_testo:p.testo,colore_griglia:p.griglia||p.sfondo,colore_header:p.header||p.testo}))}
                  title={p.label}
                  style={{width:32,height:32,borderRadius:8,background:p.sfondo,border:`2px solid ${
                    form.colore_sfondo===p.sfondo?"#f59e0b":"transparent"}`,cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:p.testo,fontWeight:700}}>
                  A
                </button>
              ))}
            </div>
            <FormRow>
              <Field label="Sfondo" half>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <input type="color" value={form.colore_sfondo} onChange={e=>f("colore_sfondo")(e.target.value)}
                    style={{width:34,height:32,border:"1px solid #e2e8f0",borderRadius:6,cursor:"pointer",padding:2}}/>
                  <Input value={form.colore_sfondo} onChange={f("colore_sfondo")}/>
                </div>
              </Field>
              <Field label="Testo" half>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <input type="color" value={form.colore_testo} onChange={e=>f("colore_testo")(e.target.value)}
                    style={{width:34,height:32,border:"1px solid #e2e8f0",borderRadius:6,cursor:"pointer",padding:2}}/>
                  <Input value={form.colore_testo} onChange={f("colore_testo")}/>
                </div>
              </Field>
            </FormRow>
            <FormRow>
              <Field label="Colore griglia (card interne)" half>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <input type="color" value={form.colore_griglia||"#2a2a3e"} onChange={e=>f("colore_griglia")(e.target.value)}
                    style={{width:34,height:32,border:"1px solid #e2e8f0",borderRadius:6,cursor:"pointer",padding:2}}/>
                  <Input value={form.colore_griglia||"#2a2a3e"} onChange={f("colore_griglia")}/>
                </div>
              </Field>
              <Field label="Anteprima griglia" half>
                <div style={{borderRadius:6,padding:"8px 10px",background:form.colore_griglia||"#2a2a3e",
                  border:`1px solid ${form.colore_testo}22`,display:"flex",gap:6,alignItems:"center"}}>
                  <div style={{width:10,height:10,borderRadius:2,background:`${form.colore_testo}44`}}/>
                  <span style={{fontSize:10,color:form.colore_testo,fontWeight:700,opacity:.8}}>Card comanda</span>
                </div>
              </Field>
            </FormRow>
            <FormRow>
              <Field label="Scritta top bar (nome/orario)" half>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <input type="color" value={form.colore_header||"#ffffff"} onChange={e=>f("colore_header")(e.target.value)}
                    style={{width:34,height:32,border:"1px solid #e2e8f0",borderRadius:6,cursor:"pointer",padding:2}}/>
                  <Input value={form.colore_header||"#ffffff"} onChange={f("colore_header")}/>
                </div>
              </Field>
              <Field label="Anteprima top bar" half>
                <div style={{borderRadius:6,padding:"6px 10px",background:form.colore_sfondo,
                  display:"flex",alignItems:"center",justifyContent:"space-between",gap:6}}>
                  <span style={{fontSize:11,color:form.colore_header||"#fff",fontWeight:900,fontFamily:"monospace",letterSpacing:1}}>
                    {(form.nome||"MONITOR").toUpperCase()}
                  </span>
                  <span style={{fontSize:11,color:form.colore_header||"#fff",opacity:.7,fontFamily:"monospace"}}>00:00</span>
                </div>
              </Field>
            </FormRow>
            {/* Preview */}
            <div style={{borderRadius:8,padding:"10px 14px",background:form.colore_sfondo,textAlign:"center",marginTop:6}}>
              <div style={{color:form.colore_testo,fontWeight:800,fontSize:14,fontFamily:"monospace"}}>{form.nome||"Nome Monitor"}</div>
              <div style={{color:form.colore_testo,opacity:.7,fontSize:11,marginTop:3}}>Anteprima • {REPARTI.find(([k])=>k===form.reparto)?.[1]}</div>
            </div>
          </Field>
          <Field label="Stato">
            <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
              <input type="checkbox" checked={form.attivo} onChange={e=>setForm(p=>({...p,attivo:e.target.checked}))}
                style={{width:16,height:16}}/>
              <span style={{fontSize:13}}>Monitor attivo</span>
            </label>
          </Field>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
            <Btn variant="secondary" onClick={()=>setModal(null)}>Annulla</Btn>
            <Btn onClick={save}>✓ Salva</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
// ══════════════════════════════════════════════════════════════════════════════
// WEB MENU PAGE
// ══════════════════════════════════════════════════════════════════════════════
const WM_FONTS = [
  ["'Inter','Segoe UI',sans-serif",          "Inter (moderno)"],
  ["'Playfair Display',Georgia,serif",        "Playfair Display (elegante)"],
  ["'Lato',Helvetica,sans-serif",            "Lato (pulito)"],
  ["'Montserrat','Helvetica Neue',sans-serif","Montserrat (bold)"],
  ["'Georgia',serif",                         "Georgia (classico)"],
  ["'Courier New',monospace",                 "Courier (rustico)"],
];
const WM_THEMES = [
  {label:"Classico",       cp:"#204769",sf:"#f8f9fa",ct:"#1a1a2a",cc:"#ffffff"},
  {label:"Scuro Elegante", cp:"#c9a96e",sf:"#1a1a1a",ct:"#f0ece4",cc:"#2a2a2a"},
  {label:"Verde Natura",   cp:"#2d6a4f",sf:"#f0f7f4",ct:"#1b4332",cc:"#ffffff"},
  {label:"Rosso Caldo",    cp:"#c0392b",sf:"#fdf8f6",ct:"#2c1010",cc:"#ffffff"},
  {label:"Blu Oceano",     cp:"#0f3460",sf:"#e8f4fd",ct:"#0d1b2a",cc:"#ffffff"},
  {label:"Minimalista",    cp:"#2d2d2d",sf:"#fafafa",ct:"#1a1a1a",cc:"#ffffff"},
];

const emptyVoce = { categoria:"", nome:"", descrizione:"", prezzo:"", allergeni:"", etichette:"", immagine_url:"", voce_menu_id:"" };

export function WebMenuPage() {
  const { data: rawMenus, loading, reload } = useCrud(()=>api.getWebMenus());
  const menus = (rawMenus||[]).filter(Boolean);
  const { data: outlets } = useCrud(api.getOutlets);
  const { data: vociMenu } = useCrud(()=>api.getVociMenu(""));
  const { data: categorie } = useCrud(api.getCategorieMenu);
  const { toast, ToastEl } = useToast();
  const { confirm, Dialog } = useConfirm();
  const [modal, setModal] = useState(null);  // null | "new" | menu object
  const [tab, setTab] = useState("info");    // "info" | "design" | "voci"
  const [copiedId, setCopied] = useState(null);
  const [preview, setPreview] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const menuUrl = slug => `${baseUrl}/menu/${slug}`;

  const emptyForm = {
    nome:"", outlet_id:"", titolo:"", sottotitolo:"", logo_url:"",
    colore_primario:"#204769", colore_sfondo:"#f8f9fa", colore_testo:"#1a1a2a", colore_card:"#ffffff",
    font_famiglia:"'Inter','Segoe UI',sans-serif",
    mostra_prezzi:true, mostra_allergeni:true, nota_piede:"", attivo:true,
    data_dal:"", data_al:"", servizio:"Tutti",
    voci:[]
  };
  const [form, setForm] = useState(emptyForm);
  const f = k => v => setForm(p=>({...p,[k]:v}));

  const applyTheme = t => setForm(p=>({...p, colore_primario:t.cp, colore_sfondo:t.sf, colore_testo:t.ct, colore_card:t.cc}));

  const openModal = (m) => {
    if(!m) { setForm(emptyForm); setTab("info"); setModal("new"); return; }
    setForm({...emptyForm, ...m, outlet_id:m.outlet_id?String(m.outlet_id):"", voci:(m.voci||[]).map(v=>({...v,prezzo:v.prezzo!=null?String(v.prezzo):""}))});
    setTab("info"); setModal(m);
  };

  const save = async () => {
    if (!form.nome.trim()) { toast("Nome obbligatorio","error"); return; }
    try {
      const payload = {
        ...form,
        outlet_id: form.outlet_id ? parseInt(form.outlet_id) : null,
        voci: form.voci.map((v,i) => ({...v, prezzo:v.prezzo!==""?parseFloat(v.prezzo):null, ordine:i, voce_menu_id:v.voce_menu_id||null}))
      };
      if (modal==="new") await api.createWebMenu(payload);
      else await api.updateWebMenu(modal.id, payload);
      toast("✓ Salvato"); setModal(null); reload();
    } catch(e) { toast(e.message,"error"); }
  };

  const remove = row => confirm(`Eliminare menu "${row.nome}"?`, async()=>{
    try { await api.deleteWebMenu(row.id); toast("✓ Eliminato"); reload(); }
    catch(e) { toast(e.message,"error"); }
  });

  const copyUrl = (slug, id) => {
    navigator.clipboard.writeText(menuUrl(slug));
    setCopied(id); setTimeout(()=>setCopied(null), 2000);
  };

  // QR code via Google Charts API (no npm needed)
  const qrUrl = slug => `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(menuUrl(slug))}&choe=UTF-8`;

  // Voce helpers
  const addVoce = () => setForm(p=>({...p, voci:[...p.voci, {...emptyVoce}]}));
  
  // Convert file to base64 data URL for image upload
  const fileToBase64 = (file) => new Promise((res,rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

  // Import all voci with nel_web_menu=true from catalog
  const importDaCatalogo = () => {
    const autoVoci = vociMenu.filter(v=>v.nel_web_menu);
    if(!autoVoci.length){ toast("Nessuna voce con 'Includi nel Web Menu' attivo","error"); return; }
    const nuove = autoVoci.map(v=>{
      const cat = categorie.find(c=>c.id===v.categoria_id);
      const codici = v.allergeni?.length
        ? v.allergeni.map(a=>a.codice||a.nome).filter(Boolean).join(", ")
        : "";
      return { ...emptyVoce, voce_menu_id:String(v.id), nome:v.nome_it||v.nome,
        descrizione:v.descrizione||"", prezzo:v.prezzo!=null?String(v.prezzo):"",
        categoria:cat?.nome||"", allergeni:codici, etichette:"", immagine_url:"" };
    });
    setForm(p=>({...p, voci:[...p.voci, ...nuove]}));
    toast(`✓ ${nuove.length} voci importate`);
  };
  const updateVoce = (i,k,v) => setForm(p=>({...p, voci:p.voci.map((x,j)=>j===i?{...x,[k]:v}:x)}));
  const removeVoce = i => setForm(p=>({...p, voci:p.voci.filter((_,j)=>j!==i)}));
  const importVoce = (i, vid) => {
    const v = vociMenu.find(x=>x.id===parseInt(vid));
    if(!v) return;
    const cat = categorie.find(c=>c.id===v.categoria_id);
    updateVoce(i,"nome",v.nome_it||v.nome);
    updateVoce(i,"voce_menu_id",String(v.id));
    updateVoce(i,"prezzo",v.prezzo!=null?String(v.prezzo):"");
    updateVoce(i,"descrizione",v.descrizione||"");
    if(cat) updateVoce(i,"categoria",cat.nome);
    // Allergeni: join codici EU (A, B, G...) from the voce's allergeni array
    if(v.allergeni?.length) {
      const codici = v.allergeni.map(a=>a.codice||a.nome).filter(Boolean).join(", ");
      updateVoce(i,"allergeni",codici);
    }
  };
  const moveVoce = (i, dir) => setForm(p=>{
    const v=[...p.voci]; const j=i+dir;
    if(j<0||j>=v.length) return p;
    [v[i],v[j]]=[v[j],v[i]]; return {...p,voci:v};
  });

  const tabBtn = (id, label) => (
    <button onClick={()=>setTab(id)}
      style={{padding:"6px 16px",borderRadius:6,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,
        background:tab===id?C.navy:"transparent",color:tab===id?"white":C.muted}}>
      {label}
    </button>
  );

  return (
    <div><ToastEl/><Dialog/>
      <PageHeader title="🌐 Web Menu" subtitle="Menu digitale accessibile via URL e QR code — personalizzabile"
        action={<Btn onClick={()=>openModal(null)}>+ Nuovo Menu</Btn>}/>

      {/* Info banner */}
      <div style={{marginBottom:20,padding:"12px 16px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,fontSize:12,color:"#1e40af",display:"flex",gap:10}}>
        <span style={{fontSize:20}}>📱</span>
        <div>I menu web sono accessibili via link diretto o QR code da qualsiasi dispositivo, senza app.
        L'URL viene generato automaticamente: <strong>{baseUrl}/menu/nome-slug</strong></div>
      </div>

      {/* Menu cards */}
      {loading&&<div style={{textAlign:"center",padding:60,color:"#94a3b8"}}>Caricamento...</div>}
      {!loading&&menus.length===0&&(
        <div style={{textAlign:"center",padding:60,color:"#94a3b8"}}>
          <div style={{fontSize:48,marginBottom:12}}>🌐</div>
          <div>Nessun web menu — crea il primo con il pulsante in alto a destra</div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(360px,1fr))",gap:16}}>
        {menus.map(m=>{
          const outletNome = outlets.find(o=>o.id===m.outlet_id)?.nome||"Tutti gli outlet";
          const url = menuUrl(m.slug);
          return (
            <div key={m.id} style={{background:"white",border:"1px solid #e2e8f0",borderRadius:12,
              overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
              {/* Preview header with real colors */}
              <div style={{background:m.colore_primario,padding:"14px 16px",position:"relative"}}>
                <div style={{color:"white",fontWeight:900,fontSize:16,marginBottom:2}}>
                  {m.titolo||m.nome}
                </div>
                {m.sottotitolo&&<div style={{color:"white",opacity:.75,fontSize:11}}>{m.sottotitolo}</div>}
                <div style={{position:"absolute",top:10,right:12,
                  background:"rgba(255,255,255,.15)",borderRadius:6,padding:"2px 8px",
                  fontSize:10,fontWeight:700,color:"white"}}>
                  {m.voci?.length||0} voci
                </div>
              </div>
              <div style={{padding:"12px 14px"}}>
                {/* Status + outlet */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <span style={{fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:10,
                    background:m.attivo?"#f0fdf4":"#f9fafb",
                    color:m.attivo?"#16a34a":"#94a3b8",
                    border:`1px solid ${m.attivo?"#bbf7d0":"#e2e8f0"}`}}>
                    {m.attivo?"● Attivo":"○ Inattivo"}
                  </span>
                  <span style={{fontSize:11,color:"#64748b"}}>{outletNome}</span>
                  <div style={{display:"flex",gap:5}}>
                    <Btn size="sm" onClick={()=>openModal(m)}>✏️</Btn>
                    <Btn size="sm" variant="danger" onClick={()=>remove(m)}>🗑</Btn>
                  </div>
                </div>
                {/* URL + QR */}
                <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:8,padding:"8px 10px",marginBottom:10}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#94a3b8",marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>URL Web Menu</div>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                    <code style={{flex:1,fontSize:11,color:"#1e40af",wordBreak:"break-all"}}>{url}</code>
                    <button onClick={()=>copyUrl(m.slug,m.id)}
                      style={{padding:"4px 8px",borderRadius:5,border:"1px solid #2d5a7b",
                        background:copiedId===m.id?"#2d5a7b":"white",
                        color:copiedId===m.id?"white":"#2d5a7b",cursor:"pointer",fontSize:10,fontWeight:700}}>
                      {copiedId===m.id?"✓":"📋"}
                    </button>
                    <button onClick={()=>window.open(url,"_blank")}
                      style={{padding:"4px 8px",borderRadius:5,border:"1px solid #e2e8f0",
                        background:"white",color:"#64748b",cursor:"pointer",fontSize:10}}>🔗</button>
                  </div>
                </div>
                {/* QR Code + validity */}
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:"#f8fafc",borderRadius:8,border:"1px solid #e2e8f0"}}>
                  <div style={{flexShrink:0}}>
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=64x64&data=${encodeURIComponent(menuUrl(m.slug))}&bgcolor=f8fafc`}
                      alt="QR" style={{width:64,height:64,borderRadius:4,border:"1px solid #e2e8f0"}}
                      onError={e=>{e.target.style.display="none";}}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#0f172a",marginBottom:2}}>📱 QR Code</div>
                    {m.servizio&&m.servizio!=="Tutti"&&<div style={{fontSize:10,color:"#2d5a7b",fontWeight:600}}>🍽️ {m.servizio}</div>}
                    {(m.data_dal||m.data_al)&&<div style={{fontSize:10,color:"#64748b"}}>
                      📅 {m.data_dal||"—"} → {m.data_al||"—"}
                    </div>}
                    <div style={{display:"flex",gap:4,marginTop:4}}>
                      <button onClick={()=>window.open(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(menuUrl(m.slug))}`, "_blank")}
                        style={{padding:"2px 7px",borderRadius:4,border:"1px solid #e2e8f0",background:"white",color:"#64748b",cursor:"pointer",fontSize:10}}>
                        Scarica QR
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create/Edit Modal */}
      {modal&&(
        <Modal wide title={modal==="new"?"Nuovo Web Menu":"Modifica Web Menu"} onClose={()=>setModal(null)}>
          {/* Tabs */}
          <div style={{display:"flex",gap:4,marginBottom:16,padding:"4px",background:"#f1f5f9",borderRadius:8,width:"fit-content"}}>
            {tabBtn("info","📋 Informazioni")}
            {tabBtn("design","🎨 Design")}
            {tabBtn("voci","🍽️ Voci Menu")}
          </div>

          {/* Tab: Informazioni */}
          {tab==="info"&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <FormRow>
                <Field label="Nome interno *" half><Input value={form.nome} onChange={f("nome")} placeholder="Menu Pranzo Estate"/></Field>
                <Field label="Outlet" half>
                  <Select value={form.outlet_id} onChange={f("outlet_id")}>
                    <option value="">— Tutti —</option>
                    {outlets.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}
                  </Select>
                </Field>
              </FormRow>
              <FormRow>
                <Field label="Titolo visibile" half><Input value={form.titolo} onChange={f("titolo")} placeholder="Il Nostro Menu"/></Field>
                <Field label="Sottotitolo / tagline" half><Input value={form.sottotitolo} onChange={f("sottotitolo")} placeholder="Cucina tipica dal 1980"/></Field>
              </FormRow>
              <Field label="Logo (carica da file o URL)">
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
                  <Input value={form.logo_url} onChange={f("logo_url")} placeholder="https://... oppure carica sotto"/>
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <label style={{padding:"5px 12px",borderRadius:6,border:"1.5px solid #2d5a7b",background:"#eff6ff",
                    color:"#2d5a7b",cursor:"pointer",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>
                    📁 Carica immagine
                    <input type="file" accept="image/*" style={{display:"none"}}
                      onChange={async e=>{
                        const file=e.target.files?.[0]; if(!file) return;
                        const b64=await fileToBase64(file); f("logo_url")(b64);
                      }}/>
                  </label>
                  {form.logo_url&&<img src={form.logo_url} alt="logo" style={{maxHeight:50,borderRadius:4,border:"1px solid #e2e8f0"}}/>}
                  {form.logo_url&&<button onClick={()=>f("logo_url")("")} style={{border:"none",background:"none",cursor:"pointer",color:"#dc2626",fontSize:18}}>×</button>}
                </div>
              </Field>
              <Field label="Note a piede pagina (allergeni, info legali, ecc.)">
                <Textarea value={form.nota_piede} onChange={f("nota_piede")} placeholder="* Allergeni disponibili su richiesta. Prezzi IVA inclusa."/>
              </Field>
              <FormRow>
                <Field label="Valido dal" half><Input type="date" value={form.data_dal||""} onChange={f("data_dal")}/></Field>
                <Field label="Valido al" half><Input type="date" value={form.data_al||""} onChange={f("data_al")}/></Field>
              </FormRow>
              <Field label="Servizio">
                <Select value={form.servizio||"Tutti"} onChange={f("servizio")}>
                  {["Tutti","Colazione","Pranzo","Cena","Pranzo e Cena"].map(s=><option key={s}>{s}</option>)}
                </Select>
              </Field>
              <FormRow>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <input type="checkbox" checked={form.mostra_prezzi} onChange={e=>setForm(p=>({...p,mostra_prezzi:e.target.checked}))} style={{width:16,height:16}}/>
                  <span style={{fontSize:13}}>Mostra prezzi</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <input type="checkbox" checked={form.mostra_allergeni} onChange={e=>setForm(p=>({...p,mostra_allergeni:e.target.checked}))} style={{width:16,height:16}}/>
                  <span style={{fontSize:13}}>Mostra allergeni</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <input type="checkbox" checked={form.attivo} onChange={e=>setForm(p=>({...p,attivo:e.target.checked}))} style={{width:16,height:16}}/>
                  <span style={{fontSize:13}}>Menu attivo</span>
                </div>
              </FormRow>
            </div>
          )}

          {/* Tab: Design */}
          {tab==="design"&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {/* Theme presets */}
              <Field label="Temi predefiniti">
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {WM_THEMES.map(t=>(
                    <button key={t.label} onClick={()=>applyTheme(t)}
                      style={{padding:"4px 12px",borderRadius:6,border:"2px solid",
                        borderColor:form.colore_primario===t.cp&&form.colore_sfondo===t.sf?"#f59e0b":"#e2e8f0",
                        background:t.sf,color:t.ct,cursor:"pointer",fontSize:11,fontWeight:700}}>
                      <span style={{color:t.cp}}>◆</span> {t.label}
                    </button>
                  ))}
                </div>
              </Field>
              <FormRow>
                <Field label="Colore primario (header, prezzi, categorie)" half>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <input type="color" value={form.colore_primario} onChange={e=>f("colore_primario")(e.target.value)} style={{width:34,height:32,border:"1px solid #e2e8f0",borderRadius:6,padding:2}}/>
                    <Input value={form.colore_primario} onChange={f("colore_primario")}/>
                  </div>
                </Field>
                <Field label="Sfondo pagina" half>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <input type="color" value={form.colore_sfondo} onChange={e=>f("colore_sfondo")(e.target.value)} style={{width:34,height:32,border:"1px solid #e2e8f0",borderRadius:6,padding:2}}/>
                    <Input value={form.colore_sfondo} onChange={f("colore_sfondo")}/>
                  </div>
                </Field>
              </FormRow>
              <FormRow>
                <Field label="Colore testo" half>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <input type="color" value={form.colore_testo} onChange={e=>f("colore_testo")(e.target.value)} style={{width:34,height:32,border:"1px solid #e2e8f0",borderRadius:6,padding:2}}/>
                    <Input value={form.colore_testo} onChange={f("colore_testo")}/>
                  </div>
                </Field>
                <Field label="Sfondo card voci" half>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <input type="color" value={form.colore_card} onChange={e=>f("colore_card")(e.target.value)} style={{width:34,height:32,border:"1px solid #e2e8f0",borderRadius:6,padding:2}}/>
                    <Input value={form.colore_card} onChange={f("colore_card")}/>
                  </div>
                </Field>
              </FormRow>
              <Field label="Font">
                <Select value={form.font_famiglia} onChange={f("font_famiglia")}>
                  {WM_FONTS.map(([val,lab])=><option key={val} value={val}>{lab}</option>)}
                </Select>
              </Field>
              {/* Live preview */}
              <Field label="Anteprima">
                <div style={{borderRadius:10,overflow:"hidden",border:"1px solid #e2e8f0",boxShadow:"0 2px 8px rgba(0,0,0,.08)"}}>
                  <div style={{background:form.colore_primario,padding:"14px 16px",textAlign:"center"}}>
                    {form.logo_url&&<img src={form.logo_url} alt="logo" style={{maxHeight:40,marginBottom:8,borderRadius:4}}/>}
                    <div style={{color:"white",fontWeight:900,fontSize:16}}>{form.titolo||form.nome||"Il Nostro Menu"}</div>
                    {form.sottotitolo&&<div style={{color:"rgba(255,255,255,.8)",fontSize:12,marginTop:3}}>{form.sottotitolo}</div>}
                  </div>
                  <div style={{background:form.colore_sfondo,padding:"14px 16px",fontFamily:form.font_famiglia}}>
                    <div style={{fontSize:13,fontWeight:800,color:form.colore_primario,borderBottom:`2px solid ${form.colore_primario}33`,paddingBottom:4,marginBottom:10,textTransform:"uppercase",letterSpacing:.5}}>Antipasti</div>
                    <div style={{background:form.colore_card,borderRadius:10,padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:"0 1px 4px rgba(0,0,0,.06)",border:"1px solid rgba(0,0,0,.05)"}}>
                      <div>
                        <div style={{fontWeight:700,color:form.colore_testo,fontSize:13}}>Bruschetta al pomodoro</div>
                        <div style={{fontSize:11,color:form.colore_testo,opacity:.6,marginTop:2}}>Pane tostato, pomodoro fresco, basilico</div>
                      </div>
                      <div style={{fontWeight:900,color:form.colore_primario,fontSize:15,marginLeft:10}}>€ 7,50</div>
                    </div>
                  </div>
                </div>
              </Field>
            </div>
          )}

          {/* Tab: Voci Menu */}
          {tab==="voci"&&(
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:6}}>
                <span style={{fontSize:12,color:"#64748b"}}>{form.voci.length} voci totali</span>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <Btn small variant="secondary" onClick={importDaCatalogo}>⭐ Import. da catalogo</Btn>
                  <Btn small onClick={addVoce}>+ Aggiungi voce</Btn>
                </div>
              </div>
              {form.voci.length===0&&(
                <div style={{textAlign:"center",padding:"30px 0",color:"#94a3b8",fontSize:13}}>
                  Nessuna voce — clicca "+ Aggiungi voce" o importa dal catalogo
                </div>
              )}
              <div style={{display:"flex",flexDirection:"column",gap:10,maxHeight:420,overflowY:"auto",paddingRight:4}}>
                {form.voci.map((v,i)=>(
                  <div key={i} style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:"10px 12px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <span style={{fontSize:12,fontWeight:700,color:"#94a3b8"}}>#{i+1}</span>
                      {/* Import from catalog */}
                      <select value={v.voce_menu_id||""} onChange={e=>{if(e.target.value)importVoce(i,e.target.value);}}
                        style={{flex:1,border:"1.5px solid #dbeafe",borderRadius:6,padding:"3px 6px",fontSize:11,background:"#eff6ff",color:"#1e40af"}}>
                        <option value="">📥 Importa da catalogo...</option>
                        {vociMenu.map(vm=><option key={vm.id} value={vm.id}>{vm.nome_it||vm.nome}</option>)}
                      </select>
                      <button onClick={()=>moveVoce(i,-1)} style={{border:"none",background:"none",cursor:"pointer",fontSize:14,opacity:i===0?.3:1}}>↑</button>
                      <button onClick={()=>moveVoce(i,1)} style={{border:"none",background:"none",cursor:"pointer",fontSize:14,opacity:i===form.voci.length-1?.3:1}}>↓</button>
                      <Btn small variant="danger" onClick={()=>removeVoce(i)}>✕</Btn>
                    </div>
                    <FormRow>
                      <Field label="Categoria *" half>
                        <Input value={v.categoria} onChange={val=>updateVoce(i,"categoria",val)} placeholder="Antipasti"/>
                      </Field>
                      <Field label="Nome voce *" half>
                        <Input value={v.nome} onChange={val=>updateVoce(i,"nome",val)} placeholder="Bruschetta"/>
                      </Field>
                    </FormRow>
                    <FormRow>
                      <Field label="Descrizione" half>
                        <Input value={v.descrizione||""} onChange={val=>updateVoce(i,"descrizione",val)} placeholder="Ingredienti, note..."/>
                      </Field>
                      <Field label="Prezzo (€)" half>
                        <Input value={v.prezzo||""} type="number" min="0" step="0.5" onChange={val=>updateVoce(i,"prezzo",val)} placeholder="12.50"/>
                      </Field>
                    </FormRow>
                    <FormRow>
                      <Field label="Etichette (virgola)" half>
                        <Input value={v.etichette||""} onChange={val=>updateVoce(i,"etichette",val)} placeholder="Vegano, Senza glutine"/>
                      </Field>
                      <Field label="Allergeni (codici EU)" half>
                        <div style={{display:"flex",gap:6,alignItems:"center"}}>
                          <Input value={v.allergeni||""} onChange={val=>updateVoce(i,"allergeni",val)} placeholder="A, B, G..."/>
                          {v.voce_menu_id&&(
                            <button onClick={()=>{
                              const vm=vociMenu.find(x=>x.id===parseInt(v.voce_menu_id));
                              if(vm?.allergeni?.length){
                                const c=vm.allergeni.map(a=>a.codice||a.nome).filter(Boolean).join(", ");
                                updateVoce(i,"allergeni",c);
                              }
                            }} title="Sincronizza allergeni dal catalogo"
                              style={{flexShrink:0,padding:"4px 8px",borderRadius:6,border:"1px solid #2d5a7b",
                                background:"#eff6ff",color:"#2d5a7b",cursor:"pointer",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>
                              🔄 Sync
                            </button>
                          )}
                        </div>
                      </Field>
                    </FormRow>
                    <Field label="Immagine voce (carica file o URL)">
                      <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4}}>
                        <Input value={v.immagine_url||""} onChange={val=>updateVoce(i,"immagine_url",val)} placeholder="https://..."/>
                      </div>
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        <label style={{padding:"4px 10px",borderRadius:6,border:"1.5px solid #2d5a7b",background:"#eff6ff",
                          color:"#2d5a7b",cursor:"pointer",fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>
                          📁 Carica foto
                          <input type="file" accept="image/*" style={{display:"none"}}
                            onChange={async e=>{
                              const file=e.target.files?.[0]; if(!file) return;
                              const b64=await fileToBase64(file); updateVoce(i,"immagine_url",b64);
                            }}/>
                        </label>
                        {v.immagine_url&&<img src={v.immagine_url} alt="prev" style={{maxHeight:36,borderRadius:4,border:"1px solid #e2e8f0"}}/>}
                        {v.immagine_url&&<button onClick={()=>updateVoce(i,"immagine_url","")} style={{border:"none",background:"none",cursor:"pointer",color:"#dc2626",fontSize:16}}>×</button>}
                      </div>
                    </Field>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16,borderTop:"1px solid #f1f5f9",paddingTop:12}}>
            <Btn variant="secondary" onClick={()=>setModal(null)}>Annulla</Btn>
            {modal!=="new"&&(
              <Btn variant="secondary" onClick={()=>window.open(menuUrl(modal.slug),"_blank")}>🌐 Apri menu</Btn>
            )}
            <Btn onClick={save}>✓ Salva</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WALLET CLIENTI PAGE — redesigned
// ══════════════════════════════════════════════════════════════════════════════
const qrWalletUrl = (token, size=200) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(token)}&bgcolor=ffffff`;

const sendEmailWallet = async (cliente, wallet, toast) => {
  try {
    await api.sendWalletEmail({wallet_id: wallet.id});
    if (toast) toast(`✓ Email inviata a ${cliente.email}`);
  } catch(e) {
    // Fallback a mailto: se SMTP non configurato
    const subject = encodeURIComponent("Il tuo Wallet " + wallet.etichetta);
    const bd = encodeURIComponent(
      "Gentile " + cliente.nome + " " + (cliente.cognome||"") + ",\n\n" +
      "Il tuo wallet \"" + wallet.etichetta + "\" e attivo.\n" +
      "Saldo: EUR " + wallet.saldo.toFixed(2) + "\n" +
      (wallet.data_scadenza ? "Scadenza: " + wallet.data_scadenza + "\n" : "") +
      "\nToken QR: " + wallet.token
    );
    window.open("mailto:" + cliente.email + "?subject=" + subject + "&body=" + bd);
    if (toast) toast("Aperto client email (SMTP non configurato)","error");
  }
};

const sendWhatsAppWallet = (cliente, wallet) => {
  const saldo    = wallet.saldo.toFixed(2);
  const scad     = wallet.data_scadenza ? "\nScadenza: " + wallet.data_scadenza : "";
  // Include direct QR image URL — WhatsApp auto-previews/downloads image links
  const qrImgUrl = "https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=" + encodeURIComponent(wallet.token) + "&bgcolor=ffffff&margin=10";
  const text = encodeURIComponent(
    "Ciao " + cliente.nome + "! 👋\n\n" +
    "💳 Il tuo wallet *" + wallet.etichetta + "* è attivo.\n" +
    "💶 Saldo: *EUR " + saldo + "*" + scad + "\n\n" +
    "📱 *Scarica e mostra questo QR code al momento del pagamento:*\n" +
    qrImgUrl + "\n\n" +
    "_Tieni lo schermo pulito e ben illuminato durante la scansione._"
  );
  const tel = (cliente.telefono||"").replace(/[^0-9+]/g,"");
  const waUrl = tel
    ? "https://wa.me/" + tel + "?text=" + text
    : "https://wa.me/?text=" + text;   // fallback: apre WA senza numero preimpostato
  window.open(waUrl, "_blank");
};

const METODI_PAGAMENTO_W = [
  ["contanti","💵 Contanti"],["pos","💳 POS/Carta"],["bonifico","🏦 Bonifico"],
  ["amex","🔵 Amex"],["visa","💙 Visa"],["mastercard","🔴 Mastercard"],["altro","📋 Altro"],
];

export function WalletPage() {
  const { data: catClienti } = useCrud(api.getCategorieCliente);
  const { data: outlets }    = useCrud(api.getOutlets);
  const { toast, ToastEl }   = useToast();
  const { confirm, Dialog }  = useConfirm();

  const [clienti,      setClienti]     = useState([]);
  const [searchQ,      setSearchQ]     = useState("");
  const [selCliente,   setSelCliente]  = useState(null);
  const [modalCliente, setModalCliente]= useState(null);
  const [formC, setFormC] = useState({nome:"",cognome:"",email:"",telefono:"",note:"",categoria_cliente_id:""});
  const fC = k => v => setFormC(p=>({...p,[k]:v}));

  const [wallets,      setWallets]     = useState([]);
  const [modalWallet,  setModalWallet] = useState(null);
  const [formW, setFormW] = useState({etichetta:"Wallet",saldo_iniziale:"",metodo_pagamento:"contanti",outlet_id:"",data_scadenza:"",attivo:true});
  const fW = k => v => setFormW(p=>({...p,[k]:v}));

  const [modalRicarica, setModalRicarica] = useState(null);
  const [importoRic,    setImportoRic]    = useState("");
  const [noteRic,       setNoteRic]       = useState("");
  const [metodoRic,     setMetodoRic]     = useState("contanti");

  const [movimenti,  setMovimenti]  = useState([]);
  const [selWallet,  setSelWallet]  = useState(null);
  const [qrModal,    setQrModal]    = useState(null);
  const [mobileWalletCfg, setMobileWalletCfg] = useState(null);

  useEffect(()=>{
    api.getMobileWalletConfig().then(d=>setMobileWalletCfg(d)).catch(()=>{});
  },[]);

  const loadClienti = async (q="") => {
    try { setClienti(await api.getClienti(q?`?q=${encodeURIComponent(q)}`:"")); } catch {}
  };
  const loadWallets = async (cid) => {
    try { setWallets(await api.getWallets(`?cliente_id=${cid}`)); setMovimenti([]); setSelWallet(null); } catch {}
  };
  const loadMovimenti = async (wid) => {
    try { setMovimenti(await api.getMovimentiWallet(wid)); } catch {}
  };

  useEffect(()=>{ loadClienti(); }, []); // eslint-disable-line
  // Refresh wallets whenever selCliente changes (e.g. after payment elsewhere)
  useEffect(()=>{ if(selCliente) loadWallets(selCliente.id); }, [selCliente?.id]); // eslint-disable-line

  const saveCliente = async () => {
    if(!formC.nome.trim()){ toast("Nome obbligatorio","error"); return; }
    try {
      const payload = {...formC, categoria_cliente_id:formC.categoria_cliente_id||null};
      if(modalCliente==="new") {
        const c = await api.createCliente(payload);
        setSelCliente(c); loadWallets(c.id);
      } else {
        await api.updateCliente(modalCliente.id, payload);
        if(selCliente?.id===modalCliente.id) setSelCliente(prev=>({...prev,...payload}));
      }
      toast("✓ Salvato"); setModalCliente(null); loadClienti(searchQ);
    } catch(e){ toast(e.message,"error"); }
  };

  const deleteCliente = c => confirm(`Eliminare "${c.nome} ${c.cognome}"? Tutti i wallet saranno eliminati.`, async()=>{
    try { await api.deleteCliente(c.id); toast("✓ Eliminato"); loadClienti(searchQ); if(selCliente?.id===c.id){setSelCliente(null);setWallets([]);} }
    catch(e){ toast(e.message,"error"); }
  });

  const saveWallet = async () => {
    if(!selCliente){ toast("Seleziona un cliente","error"); return; }
    try {
      const payload = {...formW, cliente_id:selCliente.id, outlet_id:formW.outlet_id||null,
                       saldo_iniziale:parseFloat(formW.saldo_iniziale)||0};
      if(modalWallet==="new") await api.createWallet(payload);
      else await api.updateWallet(modalWallet.id, payload);
      toast("✓ Wallet salvato"); setModalWallet(null); loadWallets(selCliente.id);
    } catch(e){ toast(e.message,"error"); }
  };

  const deleteWallet = w => confirm(`Eliminare wallet "${w.etichetta}"?`, async()=>{
    try { await api.deleteWallet(w.id); toast("✓ Eliminato"); loadWallets(selCliente.id); if(selWallet?.id===w.id) setSelWallet(null); }
    catch(e){ toast(e.message,"error"); }
  });

  const doRicarica = async () => {
    const imp = parseFloat(importoRic);
    if(!imp||imp<=0){ toast("Importo non valido","error"); return; }
    try {
      const nota = `${METODI_PAGAMENTO_W.find(([k])=>k===metodoRic)?.[1]||metodoRic}${noteRic?` — ${noteRic}`:""}`;
      await api.ricaricaWallet(modalRicarica.id, {importo:imp, note:nota});
      toast(`✓ Ricarica €${imp.toFixed(2)} effettuata`);
      setModalRicarica(null); setImportoRic(""); setNoteRic(""); setMetodoRic("contanti");
      loadWallets(selCliente.id);
    } catch(e){ toast(e.message,"error"); }
  };

  const toggleWallet = async (w) => {
    try { await api.updateWallet(w.id,{attivo:!w.attivo}); loadWallets(selCliente.id); }
    catch(e){ toast(e.message,"error"); }
  };

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",gap:0}}><ToastEl/><Dialog/>
      <PageHeader title="💳 Wallet Clienti" subtitle="Carta monetica virtuale nominativa — ricaricabile con QR code"/>

      {/* ── LAYOUT 3 COLONNE: clienti | wallet-badge | movimenti ── */}
      <div style={{display:"grid",gridTemplateColumns:"260px 310px 1fr",gap:14,flex:1,overflow:"hidden",padding:"0 0 8px"}}>

        {/* ── COL 1: lista clienti ── */}
        <div style={{display:"flex",flexDirection:"column",gap:8,overflow:"hidden",
          background:"white",border:"1px solid #e2e8f0",borderRadius:12,padding:12}}>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <input value={searchQ} onChange={e=>{setSearchQ(e.target.value);loadClienti(e.target.value);}}
              placeholder="🔍 Cerca cliente..."
              style={{flex:1,border:"1px solid #e2e8f0",borderRadius:8,padding:"7px 10px",fontSize:12,outline:"none"}}/>
            <button onClick={()=>{setFormC({nome:"",cognome:"",email:"",telefono:"",note:"",categoria_cliente_id:""});setModalCliente("new");}}
              style={{flexShrink:0,padding:"7px 12px",borderRadius:8,border:"none",background:"#2d5a7b",color:"white",cursor:"pointer",fontSize:12,fontWeight:700}}>
              + Nuovo
            </button>
          </div>
          <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>
            {clienti.length===0&&<div style={{textAlign:"center",color:"#94a3b8",padding:24,fontSize:12}}>Nessun cliente</div>}
            {clienti.map(c=>{
              const cat = catClienti.find(x=>x.id===c.categoria_cliente_id);
              const sel = selCliente?.id===c.id;
              return (
                <div key={c.id} onClick={()=>{setSelCliente(c);loadWallets(c.id);setSelWallet(null);setMovimenti([]);}}
                  style={{background:sel?"#eff6ff":"#f8fafc",border:`1.5px solid ${sel?"#2d5a7b":"#e2e8f0"}`,
                    borderRadius:8,padding:"8px 10px",cursor:"pointer",transition:"all .1s"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:4}}>
                    <div style={{minWidth:0,flex:1}}>
                      <div style={{fontWeight:700,fontSize:12,color:"#0f172a",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                        {c.cognome?`${c.cognome} ${c.nome}`:c.nome}
                      </div>
                      {c.email&&<div style={{fontSize:10,color:"#64748b",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.email}</div>}
                      {cat&&<span style={{fontSize:9,fontWeight:700,background:"#eff6ff",color:"#2d5a7b",padding:"1px 5px",borderRadius:6,display:"inline-block",marginTop:2}}>
                        {cat.nome}{cat.sconto_perc?` −${cat.sconto_perc}%`:""}
                      </span>}
                    </div>
                    <div style={{display:"flex",gap:3,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>{setFormC({...c,categoria_cliente_id:c.categoria_cliente_id||""});setModalCliente(c);}}
                        style={{width:24,height:24,borderRadius:5,border:"1px solid #e2e8f0",background:"white",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center"}}>✏️</button>
                      <button onClick={()=>deleteCliente(c)}
                        style={{width:24,height:24,borderRadius:5,border:"1px solid #fecaca",background:"#fef2f2",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center"}}>🗑</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── COL 2: wallet badge-cards ── */}
        <div style={{display:"flex",flexDirection:"column",gap:10,overflow:"hidden"}}>
          {!selCliente?(
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
              color:"#94a3b8",background:"white",border:"1px solid #e2e8f0",borderRadius:12,gap:10}}>
              <div style={{fontSize:40}}>💳</div>
              <div style={{fontSize:12}}>Seleziona un cliente</div>
            </div>
          ):(
            <>
              {/* Header cliente */}
              <div style={{background:"linear-gradient(135deg,#2d5a7b,#1e3f58)",borderRadius:12,padding:"10px 14px",
                display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexShrink:0,
                boxShadow:"0 2px 10px rgba(45,90,123,.3)"}}>
                <div style={{minWidth:0,flex:1}}>
                  <div style={{color:"white",fontWeight:800,fontSize:13,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                    {selCliente.cognome?`${selCliente.cognome} ${selCliente.nome}`:selCliente.nome}
                  </div>
                  {(()=>{
                    const cat=catClienti.find(x=>x.id===selCliente.categoria_cliente_id);
                    return cat&&<div style={{color:"rgba(255,255,255,.7)",fontSize:10,marginTop:1,display:"flex",alignItems:"center",gap:4}}>
                      <span style={{background:"rgba(255,255,255,.15)",padding:"1px 6px",borderRadius:8}}>
                        {cat.nome}{cat.sconto_perc?` · −${cat.sconto_perc}%`:""}
                      </span>
                    </div>;
                  })()}
                  <div style={{color:"rgba(255,255,255,.5)",fontSize:10,marginTop:2}}>
                    {[selCliente.email,selCliente.telefono].filter(Boolean).join(" · ")||""}
                  </div>
                </div>
                <button onClick={()=>{setFormW({etichetta:"Wallet",saldo_iniziale:"",metodo_pagamento:"contanti",outlet_id:"",data_scadenza:"",attivo:true});setModalWallet("new");}}
                  style={{flexShrink:0,padding:"6px 12px",borderRadius:8,border:"1.5px solid rgba(255,255,255,.4)",background:"rgba(255,255,255,.1)",
                    color:"white",cursor:"pointer",fontWeight:700,fontSize:11,display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
                  <span style={{fontSize:14}}>+</span> Wallet
                </button>
              </div>

              {/* Wallet badge cards */}
              {wallets.length===0&&(
                <div style={{textAlign:"center",color:"#94a3b8",padding:24,background:"white",border:"1px dashed #e2e8f0",borderRadius:12,fontSize:12}}>
                  Nessun wallet — creane uno con il pulsante in alto
                </div>
              )}
              <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:14}}>
                {wallets.map(w=>{
                  const isSel = selWallet?.id===w.id;
                  const outletNome = outlets.find(o=>o.id===w.outlet_id)?.nome;
                  return (
                    <div key={w.id} style={{cursor:"pointer",transition:"transform .15s, opacity .15s",
                      transform:isSel?"scale(1.02)":"scale(1)",opacity:w.attivo?1:.7}}
                      onClick={()=>{if(isSel){setSelWallet(null);setMovimenti([]);}else{setSelWallet(w);loadMovimenti(w.id);}}}>

                      {/* ── Badge credit-card style ── */}
                      <div style={{
                        background: w.attivo
                          ? "linear-gradient(135deg,#1e3f58 0%,#2d5a7b 45%,#3a7ca5 100%)"
                          : "linear-gradient(135deg,#6b7280 0%,#9ca3af 100%)",
                        borderRadius:16,
                        padding:"16px 18px 14px",
                        color:"white",
                        boxShadow: isSel
                          ? "0 8px 28px rgba(45,90,123,.6), 0 0 0 3px #2d5a7b"
                          : "0 4px 14px rgba(0,0,0,.2)",
                        position:"relative",
                        overflow:"hidden",
                        minHeight:120,
                        border: isSel?"2px solid #2d5a7b":"2px solid transparent",
                      }}>
                        {/* Decorative circles */}
                        <div style={{position:"absolute",right:-30,top:-30,width:130,height:130,borderRadius:"50%",background:"rgba(255,255,255,.05)",pointerEvents:"none"}}/>
                        <div style={{position:"absolute",right:30,bottom:-20,width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,.04)",pointerEvents:"none"}}/>

                        {/* Top row */}
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,position:"relative"}}>
                          <div>
                            <div style={{fontSize:9,opacity:.55,letterSpacing:.8,textTransform:"uppercase",marginBottom:3}}>Wallet</div>
                            <div style={{fontWeight:800,fontSize:14,lineHeight:1.2,textShadow:"0 1px 2px rgba(0,0,0,.2)"}}>{w.etichetta}</div>
                            {outletNome&&<div style={{fontSize:9,opacity:.5,marginTop:2}}>{outletNome}</div>}
                          </div>
                          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                            <span style={{fontSize:8,fontWeight:700,padding:"2px 8px",borderRadius:10,letterSpacing:.4,
                              background:w.attivo?"rgba(34,197,94,.2)":"rgba(255,255,255,.1)",
                              border:`1px solid ${w.attivo?"rgba(34,197,94,.45)":"rgba(255,255,255,.2)"}`,
                              color:w.attivo?"#86efac":"rgba(255,255,255,.45)"}}>
                              {w.attivo?"● ATTIVO":"○ INATTIVO"}
                            </span>
                            {/* EMV chip */}
                            <div style={{width:28,height:20,borderRadius:4,
                              background:"linear-gradient(135deg,rgba(255,215,0,.4),rgba(255,215,0,.2))",
                              border:"1px solid rgba(255,215,0,.45)",
                              display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gridTemplateRows:"1fr 1fr",gap:2,padding:3}}>
                              {[...Array(6)].map((_,i)=><div key={i} style={{background:"rgba(255,215,0,.35)",borderRadius:1}}/>)}
                            </div>
                          </div>
                        </div>

                        {/* Balance */}
                        <div style={{position:"relative",marginBottom:8}}>
                          <div style={{fontSize:9,opacity:.5,letterSpacing:.6,textTransform:"uppercase",marginBottom:2}}>Saldo disponibile</div>
                          <div style={{fontWeight:900,fontSize:28,lineHeight:1,letterSpacing:-1,textShadow:"0 2px 4px rgba(0,0,0,.15)"}}>
                            €{w.saldo.toFixed(2)}
                          </div>
                        </div>

                        {/* Bottom */}
                        {w.data_scadenza&&(
                          <div style={{fontSize:9,opacity:.45,position:"relative",letterSpacing:.3}}>
                            Scade: {w.data_scadenza}
                          </div>
                        )}
                      </div>

                      {/* Action bar below the card */}
                      <div style={{background:"white",
                        border:`1.5px solid ${isSel?"#2d5a7b":"#e2e8f0"}`,
                        borderTop:"none",borderRadius:"0 0 12px 12px",
                        padding:"8px 12px"}}>
                        <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
                          {[
                            ["💰 Ricarica","#16a34a","#f0fdf4","#bbf7d0",()=>{setModalRicarica(w);setImportoRic("");setNoteRic("");setMetodoRic("contanti");}],
                            ["📱 QR","#2d5a7b","#eff6ff","#bfdbfe",()=>setQrModal(w)],
                            ...(selCliente.email?[["📧 Email","#7c3aed","#f5f3ff","#ddd6fe",()=>sendEmailWallet(selCliente,w,toast)]]:[][Symbol.iterator]?[]:[]),
                            ...(selCliente.telefono?[["📱 WhatsApp","#16a34a","#f0fdf4","#bbf7d0",()=>sendWhatsAppWallet(selCliente,w)]]:[][Symbol.iterator]?[]:[]),
                            [w.attivo?"⏸ Disattiva":"▶ Attiva","#64748b","#f8fafc","#e2e8f0",()=>toggleWallet(w)],
                            ["✏️ Modifica","#374151","white","#e2e8f0",()=>{setFormW({etichetta:w.etichetta,data_scadenza:w.data_scadenza||"",outlet_id:w.outlet_id||"",attivo:w.attivo,metodo_pagamento:"contanti"});setModalWallet(w);}],
                            ["🗑","#dc2626","#fef2f2","#fecaca",()=>deleteWallet(w)],
                          ].map(([label,tc,bg,bc,fn])=>(
                            <button key={label} onClick={e=>{e.stopPropagation();fn();}}
                              style={{padding:"4px 9px",borderRadius:6,border:`1px solid ${bc}`,background:bg,
                                color:tc,cursor:"pointer",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",gap:3}}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── COL 3: Storico movimenti — sempre visibile ── */}
        <div style={{display:"flex",flexDirection:"column",background:"white",border:"1px solid #e2e8f0",borderRadius:12,overflow:"hidden"}}>

          {/* Pannello header */}
          <div style={{background:"#f8fafc",borderBottom:"1px solid #e2e8f0",padding:"12px 16px",
            display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
            <div>
              <div style={{fontWeight:800,fontSize:13,color:"#0f172a"}}>📊 Storico dei tuoi movimenti</div>
              {selWallet?(
                <div style={{fontSize:11,color:"#64748b",marginTop:2}}>
                  {selWallet.etichetta}
                  {" · "}Saldo attuale: <b style={{color:"#2d5a7b"}}>€{selWallet.saldo.toFixed(2)}</b>
                </div>
              ):(
                <div style={{fontSize:11,color:"#94a3b8",marginTop:1}}>Seleziona un wallet per visualizzare i movimenti</div>
              )}
            </div>
            {selWallet&&(
              <button onClick={()=>loadMovimenti(selWallet.id)}
                style={{padding:"5px 12px",borderRadius:7,border:"1px solid #e2e8f0",background:"white",
                  color:"#64748b",cursor:"pointer",fontSize:11,fontWeight:600,display:"flex",alignItems:"center",gap:4}}>
                ↻ Aggiorna
              </button>
            )}
          </div>

          {!selWallet?(
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
              color:"#94a3b8",gap:12}}>
              <div style={{fontSize:48,opacity:.3}}>📋</div>
              <div style={{fontSize:12}}>Seleziona un wallet per visualizzare i movimenti</div>
            </div>
          ):(
            <>
              {/* Intestazioni colonne */}
              <div style={{display:"grid",gridTemplateColumns:"44px 1fr 100px 90px 100px",
                background:"#f1f5f9",borderBottom:"1px solid #e2e8f0",padding:"6px 14px",flexShrink:0}}>
                {[["Ordine N°","left"],["Data","left"],["Tipo","left"],["Esito","center"],["Importo","right"]].map(([h,align])=>(
                  <div key={h} style={{fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",
                    letterSpacing:.4,textAlign:align}}>{h}</div>
                ))}
              </div>

              {/* Righe movimenti */}
              <div style={{flex:1,overflowY:"auto"}}>
                {movimenti.length===0&&(
                  <div style={{textAlign:"center",color:"#94a3b8",padding:40,fontSize:12}}>
                    <div style={{fontSize:32,marginBottom:8,opacity:.4}}>📭</div>
                    Nessun movimento registrato per questo wallet
                  </div>
                )}
                {movimenti.map((m,i)=>{
                  const isPos = m.importo>0;
                  const dataObj = m.created_at ? new Date(m.created_at) : null;
                  return (
                    <div key={m.id} style={{display:"grid",gridTemplateColumns:"44px 1fr 100px 90px 100px",
                      padding:"8px 14px",borderBottom:"1px solid #f1f5f9",
                      background:i%2===0?"white":"#fafbfc",alignItems:"center",
                      transition:"background .1s"}}
                      onMouseEnter={e=>e.currentTarget.style.background="#f0f7ff"}
                      onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"white":"#fafbfc"}>

                      {/* N° */}
                      <div style={{fontSize:10,color:"#94a3b8",fontFamily:"monospace",fontWeight:600}}>#{m.id}</div>

                      {/* Data */}
                      <div style={{fontSize:11,color:"#374151"}}>
                        {dataObj?(
                          <>
                            <div style={{fontWeight:600}}>{dataObj.toLocaleDateString("it-IT",{weekday:"short",day:"2-digit",month:"short",year:"numeric"})}</div>
                            <div style={{color:"#94a3b8",fontSize:10,marginTop:1}}>
                              {dataObj.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}
                              {m.note&&<span style={{marginLeft:6}}>{m.note}</span>}
                            </div>
                          </>
                        ):"—"}
                      </div>

                      {/* Tipo movimento */}
                      <div style={{fontSize:11}}>
                        <span style={{fontWeight:700,color:isPos?"#16a34a":"#dc2626",
                          display:"inline-flex",alignItems:"center",gap:3}}>
                          {isPos?"▲":"▼"} {m.tipo||"—"}
                        </span>
                      </div>

                      {/* Esito */}
                      <div style={{textAlign:"center"}}>
                        <span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:10,
                          background:"#f0fdf4",color:"#16a34a",border:"1px solid #bbf7d0"}}>
                          Completato
                        </span>
                      </div>

                      {/* Importo */}
                      <div style={{fontSize:13,fontWeight:800,color:isPos?"#16a34a":"#dc2626",textAlign:"right",
                        display:"flex",alignItems:"center",justifyContent:"flex-end",gap:2}}>
                        <span>{isPos?"+":""}{m.importo.toFixed(2)} €</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

      </div>

      {/* Modal: Nuovo/Modifica cliente */}
      {modalCliente&&(
        <Modal title={modalCliente==="new"?"👤 Nuovo Cliente":"✏️ Modifica Cliente"} onClose={()=>setModalCliente(null)}>
          <FormRow>
            <Field label="Nome *" half><Input value={formC.nome} onChange={fC("nome")} placeholder="Mario"/></Field>
            <Field label="Cognome" half><Input value={formC.cognome} onChange={fC("cognome")} placeholder="Rossi"/></Field>
          </FormRow>
          <FormRow>
            <Field label="Email" half><Input value={formC.email} onChange={fC("email")} type="email" placeholder="mario@email.it"/></Field>
            <Field label="Telefono" half><Input value={formC.telefono} onChange={fC("telefono")} placeholder="+39..."/></Field>
          </FormRow>
          <Field label="Categoria cliente">
            <Select value={formC.categoria_cliente_id||""} onChange={fC("categoria_cliente_id")}>
              <option value="">— Nessuna —</option>
              {catClienti.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
          </Field>
          <Field label="Note"><Textarea value={formC.note||""} onChange={fC("note")} placeholder="Annotazioni..."/></Field>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12,paddingTop:10,borderTop:"1px solid #f1f5f9"}}>
            <Btn variant="secondary" onClick={()=>setModalCliente(null)}>Annulla</Btn>
            <Btn onClick={saveCliente}>✓ Salva cliente</Btn>
          </div>
        </Modal>
      )}

      {/* Modal: Nuovo/Modifica wallet */}
      {modalWallet&&(
        <Modal title={modalWallet==="new"?"💳 Nuovo Wallet":"✏️ Modifica Wallet"} onClose={()=>setModalWallet(null)}>
          <FormRow>
            <Field label="Etichetta" half><Input value={formW.etichetta} onChange={fW("etichetta")} placeholder="Soggiorno Luglio"/></Field>
            <Field label="Outlet" half>
              <Select value={formW.outlet_id||""} onChange={fW("outlet_id")}>
                <option value="">— Tutti —</option>
                {outlets.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}
              </Select>
            </Field>
          </FormRow>
          {modalWallet==="new"&&(<>
            <FormRow>
              <Field label="Saldo iniziale (€)" half>
                <Input value={formW.saldo_iniziale} onChange={fW("saldo_iniziale")} type="number" min="0" step="0.5" placeholder="0.00"/>
              </Field>
              <Field label="Metodo incasso" half>
                <Select value={formW.metodo_pagamento} onChange={fW("metodo_pagamento")}>
                  {METODI_PAGAMENTO_W.map(([k,l])=><option key={k} value={k}>{l}</option>)}
                </Select>
              </Field>
            </FormRow>
          </>)}
          <FormRow>
            <Field label="Scadenza (opzionale)" half><Input value={formW.data_scadenza||""} onChange={fW("data_scadenza")} type="date"/></Field>
            <Field label="Stato" half>
              <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginTop:8,fontSize:13}}>
                <input type="checkbox" checked={formW.attivo} onChange={e=>setFormW(p=>({...p,attivo:e.target.checked}))} style={{width:16,height:16}}/>
                Wallet attivo
              </label>
            </Field>
          </FormRow>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12,paddingTop:10,borderTop:"1px solid #f1f5f9"}}>
            <Btn variant="secondary" onClick={()=>setModalWallet(null)}>Annulla</Btn>
            <Btn onClick={saveWallet}>✓ Salva</Btn>
          </div>
        </Modal>
      )}

      {/* Modal: Ricarica */}
      {modalRicarica&&(
        <Modal title={`💰 Ricarica — ${modalRicarica.etichetta}`} onClose={()=>setModalRicarica(null)}>
          <div style={{textAlign:"center",background:"linear-gradient(135deg,#2d5a7b,#1e3f58)",borderRadius:10,padding:"16px 0",marginBottom:16}}>
            <div style={{fontSize:12,color:"rgba(255,255,255,.6)",marginBottom:4}}>Saldo attuale</div>
            <div style={{fontSize:36,fontWeight:900,color:"white"}}>€{modalRicarica.saldo.toFixed(2)}</div>
          </div>
          <Field label="Importo da ricaricare (€) *">
            <Input value={importoRic} onChange={setImportoRic} type="number" min="0.5" step="0.5" placeholder="50.00"/>
          </Field>
          <Field label="Metodo di pagamento *">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:4}}>
              {METODI_PAGAMENTO_W.map(([k,label])=>(
                <button key={k} onClick={()=>setMetodoRic(k)}
                  style={{padding:"7px 6px",borderRadius:8,border:`2px solid ${metodoRic===k?"#2d5a7b":"#e2e8f0"}`,
                    background:metodoRic===k?"#eff6ff":"white",color:metodoRic===k?"#2d5a7b":"#374151",
                    cursor:"pointer",fontSize:11,fontWeight:700,textAlign:"left"}}>
                  {label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Note (opzionale)">
            <Input value={noteRic} onChange={setNoteRic} placeholder="es. Caparra soggiorno"/>
          </Field>
          {importoRic&&parseFloat(importoRic)>0&&(
            <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"10px 14px",marginTop:8,
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:12,color:"#16a34a",fontWeight:600}}>Nuovo saldo dopo ricarica:</span>
              <span style={{fontSize:18,fontWeight:900,color:"#16a34a"}}>€{((modalRicarica.saldo||0)+parseFloat(importoRic||0)).toFixed(2)}</span>
            </div>
          )}
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12,paddingTop:10,borderTop:"1px solid #f1f5f9"}}>
            <Btn variant="secondary" onClick={()=>setModalRicarica(null)}>Annulla</Btn>
            <Btn onClick={doRicarica}>✓ Esegui ricarica</Btn>
          </div>
        </Modal>
      )}

      {/* Modal: QR Code */}
      {qrModal&&(
        <Modal title={`📱 QR Code — ${qrModal.etichetta}`} onClose={()=>setQrModal(null)}>
          <div style={{textAlign:"center",padding:"8px 0"}}>
            <img src={qrWalletUrl(qrModal.token,220)} alt="QR"
              style={{width:220,height:220,border:"1px solid #e2e8f0",borderRadius:10,margin:"0 auto 14px",display:"block"}}/>
            <div style={{fontWeight:800,fontSize:16,color:"#0f172a",marginBottom:2}}>
              {selCliente?.cognome?`${selCliente.cognome} ${selCliente.nome}`:selCliente?.nome}
            </div>
            <div style={{fontSize:28,fontWeight:900,color:"#2d5a7b",marginBottom:4}}>€{qrModal.saldo.toFixed(2)}</div>
            {qrModal.data_scadenza&&<div style={{fontSize:11,color:"#64748b",marginBottom:10}}>📅 Scade: {qrModal.data_scadenza}</div>}
            <div style={{background:"#f8fafc",borderRadius:8,padding:"8px 12px",
              fontSize:9,color:"#94a3b8",fontFamily:"monospace",wordBreak:"break-all",marginBottom:14,textAlign:"left"}}>
              {qrModal.token}
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
              <button onClick={()=>window.open(qrWalletUrl(qrModal.token,300),"_blank")}
                style={{padding:"8px 16px",borderRadius:8,border:"1px solid #2d5a7b",background:"#eff6ff",color:"#2d5a7b",cursor:"pointer",fontWeight:700,fontSize:12}}>
                📥 Scarica QR
              </button>
              {selCliente?.email&&(
                <button onClick={()=>sendEmailWallet(selCliente,qrModal,toast)}
                  style={{padding:"8px 16px",borderRadius:8,border:"1px solid #7c3aed",background:"#f5f3ff",color:"#7c3aed",cursor:"pointer",fontWeight:700,fontSize:12}}>
                  📧 Invia via Email
                </button>
              )}
              {selCliente?.telefono&&(
                <button onClick={()=>sendWhatsAppWallet(selCliente,qrModal)}
                  style={{padding:"8px 16px",borderRadius:8,border:"1px solid #16a34a",background:"#f0fdf4",color:"#16a34a",cursor:"pointer",fontWeight:700,fontSize:12}}>
                  📱 Invia WhatsApp
                </button>
              )}
              {mobileWalletCfg?.apple_enabled&&(
                <a href={api.getApplePass(qrModal.id)} download
                  style={{padding:"8px 16px",borderRadius:8,border:"1px solid #1a1a1a",background:"#1a1a1a",color:"white",cursor:"pointer",fontWeight:700,fontSize:12,textDecoration:"none",display:"inline-block"}}>
                  🍎 Apple Wallet
                </a>
              )}
              {mobileWalletCfg?.google_enabled&&(
                <button onClick={async()=>{
                  try{
                    const r = await api.getGoogleWalletUrl(qrModal.id);
                    window.open(r.url,"_blank");
                  }catch(e){toast(e.message,"error");}
                }} style={{padding:"8px 16px",borderRadius:8,border:"1px solid #1a73e8",background:"#1a73e8",color:"white",cursor:"pointer",fontWeight:700,fontSize:12}}>
                  🔵 Google Wallet
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURAZIONE EMAIL PAGE
// ══════════════════════════════════════════════════════════════════════════════
export function ConfigEmailPage() {
  const { toast, ToastEl } = useToast();
  const [form, setForm] = useState({
    smtp_host:"", smtp_port:587, smtp_user:"", smtp_password:"",
    smtp_from_email:"", smtp_from_name:"Outlet Manager",
    use_tls:true, use_ssl:false, attivo:false
  });
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [testing,     setTesting]     = useState(false);
  const [testEmail,   setTestEmail]   = useState("");
  const [showPwd,     setShowPwd]     = useState(false);
  const [pwdSaved,    setPwdSaved]    = useState(false); // true if DB has a password
  const f = k => v => setForm(p=>({...p,[k]:v}));

  // Presets comuni
  const PRESETS = [
    {label:"Gmail",          host:"smtp.gmail.com",    port:587, tls:true,  ssl:false},
    {label:"Outlook/Office", host:"smtp.office365.com",port:587, tls:true,  ssl:false},
    {label:"Outlook.com",    host:"smtp-mail.outlook.com",port:587,tls:true,ssl:false},
    {label:"Yahoo",          host:"smtp.mail.yahoo.com",port:587, tls:true, ssl:false},
    {label:"Aruba",          host:"smtps.aruba.it",    port:465, tls:false, ssl:true},
    {label:"Libero",         host:"smtp.libero.it",    port:587, tls:true,  ssl:false},
    {label:"TIM",            host:"smtp.tim.it",       port:587, tls:true,  ssl:false},
    {label:"Custom",         host:"",                  port:587, tls:true,  ssl:false},
  ];

  useEffect(()=>{
    api.getEmailConfig()
      .then(d=>{
        setPwdSaved(d.smtp_password === "***");  // "***" means a password is saved
        setForm(prev=>({...prev,...d, smtp_password:""}));  // never show real password
        setLoading(false);
      })
      .catch(()=>setLoading(false));
  }, []);

  const applyPreset = p => setForm(prev=>({...prev,
    smtp_host:p.host, smtp_port:p.port, use_tls:p.tls, use_ssl:p.ssl}));

  const save = async () => {
    setSaving(true);
    try {
      await api.updateEmailConfig({...form, smtp_port:parseInt(form.smtp_port)||587});
      if (form.smtp_password) setPwdSaved(true);  // new password was sent
      toast("✓ Configurazione salvata");
    } catch(e){ toast(e.message,"error"); }
    finally { setSaving(false); }
  };

  const sendTest = async () => {
    if(!testEmail.trim()){ toast("Inserisci un indirizzo email di test","error"); return; }
    setTesting(true);
    try {
      await api.testEmail({to_email:testEmail});
      toast(`✓ Email di test inviata a ${testEmail}`);
    } catch(e){ toast("Errore invio: "+e.message,"error"); }
    finally { setTesting(false); }
  };

  if(loading) return <div style={{padding:40,textAlign:"center",color:"#94a3b8"}}>Caricamento...</div>;

  return (
    <div><ToastEl/>
      <PageHeader title="📧 Configurazione Email" subtitle="Servizio SMTP per invio QR code wallet e notifiche"/>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,maxWidth:960}}>
        {/* ── COLONNA SX: Configurazione SMTP ── */}
        <div style={{background:"white",border:"1px solid #e2e8f0",borderRadius:12,padding:20}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <h3 style={{margin:0,fontSize:15,fontWeight:800,color:"#0f172a"}}>⚙️ Impostazioni SMTP</h3>
            <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:12}}>
              <input type="checkbox" checked={form.attivo} onChange={e=>setForm(p=>({...p,attivo:e.target.checked}))} style={{width:16,height:16}}/>
              <span style={{fontWeight:700,color:form.attivo?"#16a34a":"#94a3b8"}}>{form.attivo?"✅ Attivo":"○ Inattivo"}</span>
            </label>
          </div>

          {/* Presets */}
          <Field label="Provider rapido">
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:2}}>
              {PRESETS.map(p=>(
                <button key={p.label} onClick={()=>applyPreset(p)}
                  style={{padding:"4px 10px",borderRadius:6,border:"1px solid #e2e8f0",
                    background:form.smtp_host===p.host?"#eff6ff":"white",
                    color:form.smtp_host===p.host?"#2d5a7b":"#374151",
                    cursor:"pointer",fontSize:11,fontWeight:600}}>
                  {p.label}
                </button>
              ))}
            </div>
          </Field>

          <FormRow>
            <Field label="Server SMTP (host)" half>
              <Input value={form.smtp_host} onChange={f("smtp_host")} placeholder="smtp.gmail.com"/>
            </Field>
            <Field label="Porta" half>
              <Input value={form.smtp_port} onChange={f("smtp_port")} type="number" placeholder="587"/>
            </Field>
          </FormRow>

          <FormRow>
            <div style={{display:"flex",gap:12,alignItems:"center",marginTop:4}}>
              <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:12}}>
                <input type="checkbox" checked={form.use_tls} onChange={e=>setForm(p=>({...p,use_tls:e.target.checked,use_ssl:e.target.checked?false:p.use_ssl}))} style={{width:15,height:15}}/>
                STARTTLS (porta 587)
              </label>
              <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:12}}>
                <input type="checkbox" checked={form.use_ssl} onChange={e=>setForm(p=>({...p,use_ssl:e.target.checked,use_tls:e.target.checked?false:p.use_tls}))} style={{width:15,height:15}}/>
                SSL/TLS (porta 465)
              </label>
            </div>
          </FormRow>

          <FormRow>
            <Field label="Username / Email accesso" half>
              <Input value={form.smtp_user} onChange={f("smtp_user")} placeholder="nome@gmail.com"/>
            </Field>
            <Field label="Password / App Password" half>
              <div style={{position:"relative"}}>
                <input value={form.smtp_password} onChange={e=>setForm(p=>({...p,smtp_password:e.target.value}))}
                  type={showPwd?"text":"password"}
                  placeholder={pwdSaved?"★★★★★★★★ (salvata — lascia vuoto per non cambiare)":"Password account email"}
                  style={{width:"100%",border:`1.5px solid ${pwdSaved&&!form.smtp_password?"#22c55e":"#e2e8f0"}`,
                    borderRadius:8,padding:"7px 36px 7px 10px",fontSize:13,outline:"none"}}/>
                <button onClick={()=>setShowPwd(s=>!s)}
                  style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",border:"none",background:"none",cursor:"pointer",fontSize:14,color:"#94a3b8"}}>
                  {showPwd?"🙈":"👁"}
                </button>
              </div>
              {pwdSaved&&!form.smtp_password&&(
                <div style={{fontSize:10,color:"#16a34a",marginTop:3,display:"flex",alignItems:"center",gap:4}}>
                  ✅ Password salvata nel database — lascia il campo vuoto per mantenerla
                </div>
              )}
              {!pwdSaved&&!form.smtp_password&&(
                <div style={{fontSize:10,color:"#f59e0b",marginTop:3}}>
                  ⚠️ Nessuna password salvata
                </div>
              )}
            </Field>
          </FormRow>

          <FormRow>
            <Field label="Email mittente (From)" half>
              <Input value={form.smtp_from_email} onChange={f("smtp_from_email")} placeholder="no-reply@miohotel.com"/>
            </Field>
            <Field label="Nome mittente" half>
              <Input value={form.smtp_from_name} onChange={f("smtp_from_name")} placeholder="Outlet Manager"/>
            </Field>
          </FormRow>

          <div style={{borderTop:"1px solid #f1f5f9",paddingTop:14,marginTop:10,display:"flex",justifyContent:"flex-end"}}>
            <Btn onClick={save} disabled={saving}>{saving?"⏳ Salvataggio...":"💾 Salva configurazione"}</Btn>
          </div>
        </div>

        {/* ── COLONNA DX: Info + Test ── */}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* Test email */}
          <div style={{background:"white",border:"1px solid #e2e8f0",borderRadius:12,padding:20}}>
            <h3 style={{margin:"0 0 14px",fontSize:14,fontWeight:800,color:"#0f172a"}}>🧪 Test invio</h3>
            <Field label="Indirizzo email di test">
              <Input value={testEmail} onChange={setTestEmail} type="email" placeholder="tuo@email.com"/>
            </Field>
            <div style={{marginTop:10}}>
              <Btn onClick={sendTest} disabled={testing||!form.attivo}>
                {testing?"⏳ Invio...":form.attivo?"📤 Invia email di test":"⚠️ Attiva prima la configurazione"}
              </Btn>
            </div>
            {!form.attivo&&<p style={{fontSize:11,color:"#f59e0b",marginTop:8}}>⚠️ Attiva la configurazione con il toggle in alto a destra.</p>}
          </div>

          {/* Note provider */}
          <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:12,padding:16}}>
            <h4 style={{margin:"0 0 10px",fontSize:12,fontWeight:800,color:"#92400e"}}>💡 Note per Gmail</h4>
            <p style={{fontSize:11,color:"#78350f",lineHeight:1.7,margin:0}}>
              Gmail richiede una <b>App Password</b> (non la password normale).<br/>
              1. Vai su <b>myaccount.google.com/security</b><br/>
              2. Attiva <b>Verifica in 2 passaggi</b><br/>
              3. Cerca <b>Password per le app</b><br/>
              4. Genera una password per "Posta" e usala qui
            </p>
          </div>

          {/* Cosa invia */}
          <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:12,padding:16}}>
            <h4 style={{margin:"0 0 10px",fontSize:12,fontWeight:800,color:"#1e40af"}}>📬 Cosa viene inviato</h4>
            <ul style={{fontSize:11,color:"#1e3a8a",lineHeight:2,margin:0,paddingLeft:16}}>
              <li>QR code del wallet con saldo attuale</li>
              <li>Data di scadenza (se impostata)</li>
              <li>Nome del cliente e nome del wallet</li>
              <li>Istruzioni per l'uso al momento del pagamento</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MOBILE WALLET CONFIG PAGE (Apple Wallet + Google Wallet)
// ══════════════════════════════════════════════════════════════════════════════
export function MobileWalletPage() {
  const { toast, ToastEl } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [tab,     setTab]     = useState("apple");
  const [form, setForm] = useState({
    apple_enabled:false, apple_team_id:"", apple_pass_type_id:"",
    apple_org_name:"", apple_cert_pem:"", apple_key_pem:"",
    apple_key_password:"", apple_wwdr_pem:"",
    google_enabled:false, google_issuer_id:"", google_class_id:"",
    google_service_account:"",
  });
  const [savedFields, setSavedFields] = useState({});
  const f = k => v => setForm(p=>({...p,[k]:v}));

  useEffect(()=>{
    api.getMobileWalletConfig().then(d=>{
      const saved = {};
      ["apple_cert_pem","apple_key_pem","apple_wwdr_pem","apple_key_password","google_service_account"].forEach(k=>{
        if(d[k]==="***") saved[k]=true;
      });
      setSavedFields(saved);
      setForm(prev=>({...prev,...d,
        apple_cert_pem:"", apple_key_pem:"", apple_wwdr_pem:"",
        apple_key_password:"", google_service_account:""
      }));
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);

  const save = async () => {
    setSaving(true);
    try {
      await api.updateMobileWalletConfig(form);
      // Refresh to know what's saved
      const d = await api.getMobileWalletConfig();
      const saved = {};
      ["apple_cert_pem","apple_key_pem","apple_wwdr_pem","apple_key_password","google_service_account"].forEach(k=>{
        if(d[k]==="***") saved[k]=true;
      });
      setSavedFields(saved);
      setForm(prev=>({...prev, apple_cert_pem:"",apple_key_pem:"",apple_wwdr_pem:"",apple_key_password:"",google_service_account:""}));
      toast("✓ Configurazione salvata");
    } catch(e){ toast(e.message,"error"); }
    setSaving(false);
  };

  const FileField = ({label, fieldKey, accept=".pem,.key,.p12"}) => (
    <Field label={label}>
      {savedFields[fieldKey]&&!form[fieldKey]&&(
        <div style={{fontSize:10,color:"#16a34a",marginBottom:4,display:"flex",alignItems:"center",gap:4}}>
          ✅ File salvato nel database — carica un nuovo file per sostituirlo
        </div>
      )}
      <div style={{display:"flex",gap:6,alignItems:"center"}}>
        <label style={{padding:"5px 12px",borderRadius:6,border:"1.5px solid #2d5a7b",background:"#eff6ff",
          color:"#2d5a7b",cursor:"pointer",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>
          📂 Carica file
          <input type="file" accept={accept} style={{display:"none"}} onChange={e=>{
            const file=e.target.files?.[0]; if(!file) return;
            const reader=new FileReader();
            reader.onload=ev=>setForm(p=>({...p,[fieldKey]:ev.target.result}));
            reader.readAsText(file);
          }}/>
        </label>
        {form[fieldKey]&&<span style={{fontSize:10,color:"#16a34a"}}>✓ File caricato ({form[fieldKey].length} chars)</span>}
        {!form[fieldKey]&&!savedFields[fieldKey]&&<span style={{fontSize:10,color:"#f59e0b"}}>⚠️ Nessun file</span>}
      </div>
    </Field>
  );

  const tabBtn = (id, icon, label) => (
    <button onClick={()=>setTab(id)}
      style={{padding:"8px 20px",borderRadius:8,border:"2px solid",fontWeight:700,fontSize:13,cursor:"pointer",
        borderColor:tab===id?"#2d5a7b":"#e2e8f0",
        background:tab===id?"#2d5a7b":"white",
        color:tab===id?"white":"#374151"}}>
      {icon} {label}
    </button>
  );

  if(loading) return <div style={{padding:40,textAlign:"center",color:"#94a3b8"}}>Caricamento...</div>;

  return (
    <div style={{maxWidth:900}}><ToastEl/>
      <PageHeader title="📱 Mobile Wallet" subtitle="Configura Apple Wallet e Google Wallet per i QR code dei wallet clienti"/>

      {/* Prerequisiti banner */}
      <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:"12px 16px",marginBottom:20,fontSize:12,color:"#78350f"}}>
        <b>⚠️ Prerequisiti obbligatori prima della configurazione:</b><br/>
        <b>Apple:</b> Account Apple Developer (99$/anno) → <a href="https://developer.apple.com" target="_blank" rel="noreferrer" style={{color:"#2d5a7b"}}>developer.apple.com</a> → Identifiers → Pass Type IDs<br/>
        <b>Google:</b> Google Cloud Console (gratuito) → Wallet API → Service Account → <a href="https://pay.google.com/business/console" target="_blank" rel="noreferrer" style={{color:"#2d5a7b"}}>Google Pay & Wallet Console</a>
      </div>

      {/* Tab selector */}
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        {tabBtn("apple","🍎","Apple Wallet")}
        {tabBtn("google","🔵","Google Wallet")}
      </div>

      {/* ── Apple Wallet ── */}
      {tab==="apple"&&(
        <div style={{background:"white",border:"1px solid #e2e8f0",borderRadius:12,padding:20}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <h3 style={{margin:0,fontSize:15,fontWeight:800,display:"flex",alignItems:"center",gap:8}}>
              🍎 Apple Wallet — Configurazione
            </h3>
            <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:12}}>
              <input type="checkbox" checked={form.apple_enabled} onChange={e=>setForm(p=>({...p,apple_enabled:e.target.checked}))} style={{width:16,height:16}}/>
              <span style={{fontWeight:700,color:form.apple_enabled?"#16a34a":"#94a3b8"}}>{form.apple_enabled?"✅ Abilitato":"○ Disabilitato"}</span>
            </label>
          </div>

          <div style={{background:"#f8fafc",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:11,color:"#475569",lineHeight:1.8}}>
            <b>Guida setup:</b><br/>
            1. Vai su <a href="https://developer.apple.com/account/resources/identifiers/list/passTypeId" target="_blank" rel="noreferrer" style={{color:"#2d5a7b"}}>Apple Developer → Identifiers → Pass Type IDs</a><br/>
            2. Crea un nuovo Pass Type ID (es: <code>pass.com.tuohotel.wallet</code>)<br/>
            3. Genera il certificato e scarica <code>certificate.p12</code><br/>
            4. Converti con OpenSSL: <code>openssl pkcs12 -in Certificates.p12 -clcerts -nokeys -out certificate.pem</code><br/>
            5. Chiave: <code>openssl pkcs12 -in Certificates.p12 -nocerts -out key.pem</code><br/>
            6. WWDR: scarica da <a href="https://www.apple.com/certificateauthority/" target="_blank" rel="noreferrer" style={{color:"#2d5a7b"}}>apple.com/certificateauthority</a> → "Apple Worldwide Developer Relations"
          </div>

          <FormRow>
            <Field label="Team ID (es: ABCDE12345)" half>
              <Input value={form.apple_team_id} onChange={f("apple_team_id")} placeholder="ABCDE12345"/>
            </Field>
            <Field label="Pass Type ID (es: pass.com.hotel.wallet)" half>
              <Input value={form.apple_pass_type_id} onChange={f("apple_pass_type_id")} placeholder="pass.com.tuohotel.wallet"/>
            </Field>
          </FormRow>

          <Field label="Nome organizzazione (appare nel pass)">
            <Input value={form.apple_org_name} onChange={f("apple_org_name")} placeholder="Hotel La Terrazza"/>
          </Field>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:12}}>
            <FileField label="Certificate PEM (certificate.pem)" fieldKey="apple_cert_pem"/>
            <FileField label="Private Key PEM (key.pem)" fieldKey="apple_key_pem"/>
            <FileField label="WWDR Certificate (wwdr.pem)" fieldKey="apple_wwdr_pem"/>
            <Field label="Password chiave PEM">
              <div style={{position:"relative"}}>
                {savedFields.apple_key_password&&!form.apple_key_password&&(
                  <div style={{fontSize:10,color:"#16a34a",marginBottom:4}}>✅ Password salvata</div>
                )}
                <Input value={form.apple_key_password} onChange={f("apple_key_password")}
                  placeholder={savedFields.apple_key_password?"★★★ (lascia vuoto per mantenere)":"Password usata durante l'export .p12"}/>
              </div>
            </Field>
          </div>

          <div style={{marginTop:16,padding:"10px 14px",background:"#eff6ff",borderRadius:8,fontSize:11,color:"#1e40af"}}>
            💡 <b>Installa dipendenza:</b> <code>pip install cryptography</code> nella cartella backend
          </div>
        </div>
      )}

      {/* ── Google Wallet ── */}
      {tab==="google"&&(
        <div style={{background:"white",border:"1px solid #e2e8f0",borderRadius:12,padding:20}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <h3 style={{margin:0,fontSize:15,fontWeight:800,display:"flex",alignItems:"center",gap:8}}>
              🔵 Google Wallet — Configurazione
            </h3>
            <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:12}}>
              <input type="checkbox" checked={form.google_enabled} onChange={e=>setForm(p=>({...p,google_enabled:e.target.checked}))} style={{width:16,height:16}}/>
              <span style={{fontWeight:700,color:form.google_enabled?"#16a34a":"#94a3b8"}}>{form.google_enabled?"✅ Abilitato":"○ Disabilitato"}</span>
            </label>
          </div>

          <div style={{background:"#f8fafc",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:11,color:"#475569",lineHeight:1.8}}>
            <b>Guida setup:</b><br/>
            1. Vai su <a href="https://pay.google.com/business/console" target="_blank" rel="noreferrer" style={{color:"#2d5a7b"}}>Google Pay & Wallet Console</a> e attiva le API<br/>
            2. Vai su <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" style={{color:"#2d5a7b"}}>Google Cloud Console</a> → IAM → Service Accounts<br/>
            3. Crea un Service Account, abilita Google Wallet API<br/>
            4. Scarica la chiave JSON del service account<br/>
            5. Nel Wallet Console: Business → Nuova classe Generic Pass → prendi l'Issuer ID<br/>
            6. Autorizza il service account email nella Wallet Console
          </div>

          <FormRow>
            <Field label="Issuer ID (da Google Pay Console)" half>
              <Input value={form.google_issuer_id} onChange={f("google_issuer_id")} placeholder="3388000000012345678"/>
            </Field>
            <Field label="Class ID (opzionale, auto se vuoto)" half>
              <Input value={form.google_class_id} onChange={f("google_class_id")} placeholder="auto"/>
            </Field>
          </FormRow>

          <Field label="Service Account JSON (carica il file .json scaricato da Google Cloud)">
            {savedFields.google_service_account&&!form.google_service_account&&(
              <div style={{fontSize:10,color:"#16a34a",marginBottom:4}}>✅ Service account JSON salvato nel database</div>
            )}
            <label style={{padding:"5px 12px",borderRadius:6,border:"1.5px solid #2d5a7b",background:"#eff6ff",
              color:"#2d5a7b",cursor:"pointer",fontSize:11,fontWeight:700,display:"inline-block"}}>
              📂 Carica service-account.json
              <input type="file" accept=".json" style={{display:"none"}} onChange={e=>{
                const file=e.target.files?.[0]; if(!file) return;
                const reader=new FileReader();
                reader.onload=ev=>setForm(p=>({...p,google_service_account:ev.target.result}));
                reader.readAsText(file);
              }}/>
            </label>
            {form.google_service_account&&<span style={{fontSize:10,color:"#16a34a",marginLeft:8}}>✓ File caricato</span>}
          </Field>

          <div style={{marginTop:16,padding:"10px 14px",background:"#eff6ff",borderRadius:8,fontSize:11,color:"#1e40af"}}>
            💡 <b>Installa dipendenza:</b> <code>pip install PyJWT</code> nella cartella backend
          </div>
        </div>
      )}

      <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}>
        <Btn onClick={save} disabled={saving}>{saving?"⏳ Salvataggio...":"💾 Salva configurazione"}</Btn>
      </div>
    </div>
  );
}
