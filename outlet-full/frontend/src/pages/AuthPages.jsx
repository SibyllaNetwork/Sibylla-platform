import { useState, useEffect, useCallback } from "react";
import { authApi } from "../services/authApi";
import { useAuth } from "../hooks/useAuth";
import {
  C, Modal, Field, Input, Select, Btn, DataTable,
  PageHeader, useConfirm, useToast, Badge, FormRow
} from "../components/UI";
import {
  Shield, ShieldCheck, Eye, Edit3, EyeOff,
  Lock, Unlock, Key, Users, User, Check, X,
  ChevronDown, ChevronRight
} from "lucide-react";

const ORANGE = "#f97316";
const ACCESSO_CFG = {
  nascosta: { label:"Nascosta",    color:"#94a3b8", icon:EyeOff,  bg:"#f8fafc" },
  lettura:  { label:"Solo lettura",color:"#2563eb", icon:Eye,     bg:"#eff6ff" },
  completa: { label:"Completa",    color:"#16a34a", icon:Edit3,   bg:"#f0fdf4" },
};
const ACCESSO_CYCLE = ["nascosta","lettura","completa"];

// ── Sezione permessi per la pagina Ruoli ─────────────────────────────────────
function PermessiGrid({ permessi, onChange, readOnly }) {
  const [pagine, setPagine] = useState([]);
  const [openSezioni, setOpenSezioni] = useState({});

  useEffect(() => {
    authApi.getPagine().then(d => {
      setPagine(d);
      const sezioni = [...new Set(d.map(p => p.sezione))];
      setOpenSezioni(Object.fromEntries(sezioni.map(s => [s, true])));
    });
  }, []);

  const grouped = pagine.reduce((acc, p) => {
    (acc[p.sezione] = acc[p.sezione]||[]).push(p);
    return acc;
  }, {});

  const cycleAccesso = (pagina) => {
    if (readOnly) return;
    const cur = permessi[pagina] || "nascosta";
    const next = ACCESSO_CYCLE[(ACCESSO_CYCLE.indexOf(cur)+1) % ACCESSO_CYCLE.length];
    onChange({ ...permessi, [pagina]: next });
  };

  const setAll = (accesso) => {
    if (readOnly) return;
    const all = {};
    pagine.forEach(p => all[p.id] = accesso);
    onChange(all);
  };

  return (
    <div>
      {/* Quick set buttons */}
      {!readOnly && (
        <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
          <span style={{fontSize:12,color:C.muted,fontWeight:600,alignSelf:"center"}}>Imposta tutto:</span>
          {ACCESSO_CYCLE.map(acc => {
            const cfg = ACCESSO_CFG[acc];
            return (
              <button key={acc} onClick={() => setAll(acc)}
                style={{padding:"4px 12px",borderRadius:7,border:`1px solid ${cfg.color}40`,
                  background:cfg.bg,color:cfg.color,fontSize:11,fontWeight:700,cursor:"pointer",
                  display:"flex",alignItems:"center",gap:5}}>
                <cfg.icon size={11}/>{cfg.label}
              </button>
            );
          })}
        </div>
      )}

      {Object.entries(grouped).map(([sezione, items]) => (
        <div key={sezione} style={{marginBottom:12,borderRadius:10,border:`1px solid ${C.border}`,overflow:"hidden"}}>
          {/* Sezione header */}
          <button onClick={() => setOpenSezioni(s => ({...s,[sezione]:!s[sezione]}))}
            style={{width:"100%",padding:"9px 14px",background:"#f8fafc",border:"none",
              display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",
              borderBottom:`1px solid ${C.border}`}}>
            <span style={{fontSize:12,fontWeight:700,color:C.navy,textTransform:"uppercase",letterSpacing:.5}}>{sezione}</span>
            {openSezioni[sezione] ? <ChevronDown size={14} color={C.muted}/> : <ChevronRight size={14} color={C.muted}/>}
          </button>

          {openSezioni[sezione] && (
            <div style={{background:"white"}}>
              {items.map((pagina, i) => {
                const acc = permessi[pagina.id] || "nascosta";
                const cfg = ACCESSO_CFG[acc];
                return (
                  <div key={pagina.id}
                    style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                      padding:"9px 14px",borderBottom:i<items.length-1?`1px solid ${C.border}`:"none",
                      transition:"background .1s"}}
                    onMouseEnter={e => !readOnly&&(e.currentTarget.style.background="#f8fafc")}
                    onMouseLeave={e => e.currentTarget.style.background="white"}>
                    <span style={{fontSize:13,color:C.text,fontWeight:500}}>{pagina.label}</span>

                    {/* Accesso toggle */}
                    <button onClick={() => cycleAccesso(pagina.id)}
                      disabled={readOnly}
                      style={{padding:"5px 12px",borderRadius:7,border:`1.5px solid ${cfg.color}50`,
                        background:cfg.bg,color:cfg.color,fontSize:11,fontWeight:700,
                        cursor:readOnly?"default":"pointer",display:"flex",alignItems:"center",gap:6,
                        transition:"all .15s",minWidth:130}}>
                      <cfg.icon size={12}/>
                      {cfg.label}
                      {!readOnly && <span style={{marginLeft:"auto",fontSize:10,color:cfg.color,opacity:.6}}>▸</span>}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// RUOLI E PERMESSI
// ══════════════════════════════════════════════════════════════════════════════
export function RuoliPage() {
  const [ruoli, setRuoli] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selRuolo, setSelRuolo] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ nome:"", descrizione:"", is_admin:false, permessi:{} });
  const { toast, ToastEl } = useToast();
  const { confirm, Dialog } = useConfirm();
  const { isAdmin } = useAuth();

  const loadRuoli = useCallback(async () => {
    setLoading(true);
    try { const d = await authApi.getRuoli(); setRuoli(d); } catch(e) { toast(e.message,"error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRuoli(); }, [loadRuoli]);

  const openNew = () => {
    authApi.getPagine().then(pagine => {
      const permessi = Object.fromEntries(pagine.map(p => [p.id, "nascosta"]));
      setForm({ nome:"", descrizione:"", is_admin:false, permessi });
      setModal("new");
    });
  };

  const openEdit = async (r) => {
    const full = await authApi.getRuolo(r.id);
    setForm({ nome:full.nome, descrizione:full.descrizione||"", is_admin:full.is_admin, permessi:{...full.permessi} });
    setModal(r);
  };

  const save = async () => {
    try {
      if (modal==="new") await authApi.createRuolo(form);
      else await authApi.updateRuolo(modal.id, form);
      toast(modal==="new"?"Ruolo creato":"Ruolo aggiornato");
      setModal(null); loadRuoli();
    } catch(e) { toast(e.message,"error"); }
  };

  const remove = (r) => confirm(`Eliminare ruolo "${r.nome}"?`, async () => {
    try { await authApi.deleteRuolo(r.id); toast("Eliminato"); loadRuoli(); if(selRuolo?.id===r.id) setSelRuolo(null); }
    catch(e) { toast(e.message,"error"); }
  });

  return (
    <div><ToastEl/><Dialog/>
      <PageHeader title="Ruoli e Permessi"
        subtitle="Definisci i ruoli e le pagine accessibili per ogni ruolo"
        action={isAdmin && <Btn onClick={openNew} icon={<Shield size={14}/>}>+ Nuovo Ruolo</Btn>}/>

      <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:16}}>
        {/* Lista ruoli */}
        <div style={{background:"white",borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden",
          boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
          <div style={{padding:"11px 14px",borderBottom:`1px solid ${C.border}`,background:"#f8fafc"}}>
            <span style={{fontWeight:700,fontSize:13,color:C.navy}}>Ruoli configurati</span>
          </div>
          {loading ? <div style={{padding:20,textAlign:"center",color:C.muted,fontSize:12}}>Caricamento...</div> :
          ruoli.length===0 ? <div style={{padding:20,textAlign:"center",color:C.muted,fontSize:12}}>Nessun ruolo</div> :
          ruoli.map(r => (
            <div key={r.id} onClick={() => setSelRuolo(r)}
              style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`,cursor:"pointer",
                background:selRuolo?.id===r.id?"#fff7ed":"white",transition:"background .1s"}}
              onMouseEnter={e=>{if(selRuolo?.id!==r.id)e.currentTarget.style.background="#f8fafc";}}
              onMouseLeave={e=>{if(selRuolo?.id!==r.id)e.currentTarget.style.background="white";}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  {r.is_admin
                    ? <ShieldCheck size={16} color={ORANGE}/>
                    : <Shield size={16} color={C.muted}/>}
                  <div>
                    <div style={{fontWeight:700,fontSize:13,color:C.navy}}>{r.nome}</div>
                    {r.is_admin && <div style={{fontSize:10,color:ORANGE,fontWeight:600}}>Accesso completo</div>}
                    {!r.is_admin && r.descrizione && <div style={{fontSize:11,color:C.muted}}>{r.descrizione.substring(0,40)}</div>}
                  </div>
                </div>
                {isAdmin && (
                  <div style={{display:"flex",gap:3}}>
                    <Btn small variant="ghost" onClick={e=>{e.stopPropagation();openEdit(r);}}>✏</Btn>
                    {!r.is_admin && <Btn small variant="ghost" onClick={e=>{e.stopPropagation();remove(r);}}>🗑</Btn>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Dettaglio permessi */}
        <div style={{background:"white",borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden",
          boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
          <div style={{padding:"11px 14px",borderBottom:`1px solid ${C.border}`,background:"#f8fafc",
            display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontWeight:700,fontSize:13,color:C.navy}}>
              {selRuolo ? `Permessi — ${selRuolo.nome}` : "Seleziona un ruolo"}
            </span>
            {selRuolo && isAdmin && !selRuolo.is_admin && (
              <Btn small onClick={() => openEdit(selRuolo)}>Modifica permessi</Btn>
            )}
          </div>
          {!selRuolo ? (
            <div style={{padding:40,textAlign:"center",color:C.muted,fontSize:13}}>← Seleziona un ruolo dalla lista</div>
          ) : selRuolo.is_admin ? (
            <div style={{padding:32,textAlign:"center"}}>
              <ShieldCheck size={48} color={ORANGE} style={{margin:"0 auto 12px"}}/>
              <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:6}}>Ruolo Amministratore</div>
              <div style={{fontSize:13,color:C.muted}}>Questo ruolo ha accesso completo a tutte le funzionalità del sistema.<br/>I permessi non possono essere modificati.</div>
            </div>
          ) : (
            <div style={{padding:16,overflowY:"auto",maxHeight:"calc(100vh - 240px)"}} className="scrollbar-light">
              <PermessiGrid
                permessi={selRuolo.permessi||{}}
                onChange={() => {}}
                readOnly={true}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal crea/modifica ruolo */}
      {modal && (
        <Modal wide title={modal==="new"?"Nuovo Ruolo":"Modifica Ruolo — "+modal.nome} onClose={() => setModal(null)}>
          <FormRow>
            <Field label="Nome ruolo" required half>
              <Input value={form.nome} onChange={v => setForm(p=>({...p,nome:v}))} placeholder="es. Cameriere"/>
            </Field>
            <Field label="Descrizione" half>
              <Input value={form.descrizione} onChange={v => setForm(p=>({...p,descrizione:v}))}/>
            </Field>
          </FormRow>

          {modal==="new" && (
            <div style={{marginBottom:14}}>
              <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:C.text}}>
                <input type="checkbox" checked={form.is_admin} onChange={e => setForm(p=>({...p,is_admin:e.target.checked}))}
                  style={{accentColor:ORANGE,width:15,height:15}}/>
                <div>
                  <strong>Ruolo amministratore</strong>
                  <span style={{color:C.muted,fontSize:12}}> — accesso completo a tutto, i permessi sotto verranno ignorati</span>
                </div>
              </label>
            </div>
          )}

          {!form.is_admin && (
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${C.border}`}}>
                🔒 Permessi pagine — clicca per passare da Nascosta → Solo lettura → Completa
              </div>
              <div style={{maxHeight:380,overflowY:"auto",paddingRight:4}} className="scrollbar-light">
                <PermessiGrid
                  permessi={form.permessi}
                  onChange={p => setForm(prev=>({...prev,permessi:p}))}
                  readOnly={false}
                />
              </div>
            </div>
          )}

          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16,paddingTop:14,borderTop:`1px solid ${C.border}`}}>
            <Btn variant="secondary" onClick={() => setModal(null)}>Annulla</Btn>
            <Btn onClick={save}><Shield size={13}/> Salva Ruolo</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// UTENTI
// ══════════════════════════════════════════════════════════════════════════════
export function UtentiPage() {
  const [utenti, setUtenti]   = useState([]);
  const [ruoli, setRuoli]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);    // null | "new" | row
  const [pwdModal, setPwdModal] = useState(null);  // utente per reset pwd
  const [newPwd, setNewPwd]   = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const { toast, ToastEl } = useToast();
  const { confirm, Dialog } = useConfirm();
  const { user: me } = useAuth();

  const empty = { username:"", email:"", full_name:"", ruolo_id:"", password:"", attivo:true };
  const [form, setForm] = useState(empty);
  const f = k => v => setForm(p => ({...p,[k]:v}));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([authApi.getUtenti(), authApi.getRuoli()]);
      setUtenti(u); setRuoli(r);
    } catch(e) { toast(e.message,"error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try {
      if (modal==="new") await authApi.createUtente({...form,ruolo_id:form.ruolo_id?parseInt(form.ruolo_id):null});
      else await authApi.updateUtente(modal.id, {
        username:form.username, email:form.email, full_name:form.full_name,
        ruolo_id:form.ruolo_id?parseInt(form.ruolo_id):null, attivo:form.attivo,
      });
      toast(modal==="new"?"Utente creato":"Utente aggiornato");
      setModal(null); load();
    } catch(e) { toast(e.message,"error"); }
  };

  const resetPwd = async () => {
    if (!newPwd || newPwd.length < 4) { toast("Password troppo corta (min. 4 caratteri)","error"); return; }
    try { await authApi.resetPassword(pwdModal.id, newPwd); toast("Password aggiornata ✓"); setPwdModal(null); setNewPwd(""); }
    catch(e) { toast(e.message,"error"); }
  };

  const toggleAttivo = async (u) => {
    try { await authApi.updateUtente(u.id, {attivo: !u.attivo}); toast(u.attivo?"Utente disattivato":"Utente riattivato"); load(); }
    catch(e) { toast(e.message,"error"); }
  };

  const remove = (u) => confirm(`Eliminare utente "${u.username}"?`, async () => {
    try { await authApi.deleteUtente(u.id); toast("Eliminato"); load(); }
    catch(e) { toast(e.message,"error"); }
  });

  return (
    <div><ToastEl/><Dialog/>
      <PageHeader title="Gestione Utenti"
        subtitle="Crea e gestisci gli account di accesso al sistema"
        action={<Btn onClick={() => { setForm(empty); setModal("new"); }} icon={<User size={14}/>}>+ Nuovo Utente</Btn>}/>

      <DataTable loading={loading} rows={utenti}
        onEdit={u => { setForm({...u,ruolo_id:String(u.ruolo_id||""),password:""}); setModal(u); }}
        onDelete={u => u.id !== me?.id && remove(u)}
        cols={[
          { key:"full_name", label:"Nome completo",
            render:(v,r) => (
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:32,height:32,borderRadius:"50%",flexShrink:0,
                  background:`linear-gradient(135deg, ${ORANGE}, #c2410c)`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  color:"white",fontSize:11,fontWeight:700}}>
                  {(v||r.username||"?").slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div style={{fontWeight:600,fontSize:13,color:C.navy}}>{v||"—"}</div>
                  <div style={{fontSize:11,color:C.muted}}>@{r.username}</div>
                </div>
              </div>
            )},
          { key:"email",      label:"Email",    render:v=>v||"—" },
          { key:"ruolo_nome", label:"Ruolo",
            render:(v,r) => v ? <Badge label={v} color={r.is_admin?ORANGE:C.blue} dot/> : <span style={{color:C.muted,fontSize:12}}>Nessun ruolo</span> },
          { key:"attivo",     label:"Stato",
            render:(v,r) => (
              <button onClick={() => r.id!==me?.id && toggleAttivo(r)}
                style={{background:"none",border:"none",cursor:r.id===me?.id?"default":"pointer",padding:0}}>
                <Badge label={v?"Attivo":"Inattivo"} color={v?"#16a34a":"#94a3b8"} dot/>
              </button>
            )},
          { key:"last_login", label:"Ultimo accesso",
            render:v => v&&v!=="None" ? new Date(v).toLocaleString("it-IT",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "Mai" },
        ]}
        emptyMsg="Nessun utente configurato"
      />

      {/* Extra actions in table — reset password */}
      {!loading && utenti.length>0 && (
        <div style={{marginTop:8,fontSize:12,color:C.muted}}>
          💡 Clicca sul badge Attivo/Inattivo per abilitare/disabilitare rapidamente un utente.
          Per resettare la password usa il pulsante ✏ e il campo password nel form.
        </div>
      )}

      {/* Modal crea / modifica utente */}
      {modal && (
        <Modal title={modal==="new"?"Nuovo Utente":"Modifica Utente — "+modal.username} onClose={() => setModal(null)}>
          <FormRow>
            <Field label="Nome completo" half>
              <Input value={form.full_name} onChange={f("full_name")} placeholder="Mario Rossi"/>
            </Field>
            <Field label="Username" required half>
              <Input value={form.username} onChange={f("username")} placeholder="mario.rossi"/>
            </Field>
          </FormRow>
          <Field label="Email">
            <Input value={form.email} onChange={f("email")} type="email" placeholder="mario@hotel.it"/>
          </Field>
          <Field label="Ruolo">
            <Select value={form.ruolo_id} onChange={f("ruolo_id")} placeholder="— Nessun ruolo —">
              {ruoli.map(r => <option key={r.id} value={r.id}>{r.is_admin?"⭐ ":""}{r.nome}</option>)}
            </Select>
          </Field>

          {modal==="new" && (
            <Field label="Password" required>
              <div style={{position:"relative"}}>
                <Input value={form.password} onChange={f("password")}
                  type={showPwd?"text":"password"} placeholder="Min. 4 caratteri"/>
                <button type="button" onClick={() => setShowPwd(v=>!v)}
                  style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",
                    background:"none",border:"none",cursor:"pointer",color:C.muted}}>
                  {showPwd ? <EyeOff size={14}/> : <Eye size={14}/>}
                </button>
              </div>
            </Field>
          )}

          {modal!=="new" && (
            <div style={{marginBottom:14,padding:"10px 14px",background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,fontSize:12,color:"#92400e"}}>
              🔑 Per cambiare la password usa il pulsante <strong>"Reset Password"</strong> dopo aver salvato.
            </div>
          )}

          {modal!=="new" && (
            <div style={{marginBottom:14}}>
              <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:C.text}}>
                <input type="checkbox" checked={form.attivo} onChange={e=>f("attivo")(e.target.checked)}
                  style={{accentColor:ORANGE,width:15,height:15}}/>
                Utente attivo
              </label>
            </div>
          )}

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
            {modal!=="new" && (
              <Btn variant="secondary" icon={<Key size={13}/>}
                onClick={() => { setModal(null); setPwdModal(modal); }}>
                Reset Password
              </Btn>
            )}
            <div style={{display:"flex",gap:8,marginLeft:"auto"}}>
              <Btn variant="secondary" onClick={() => setModal(null)}>Annulla</Btn>
              <Btn onClick={save}><User size={13}/> {modal==="new"?"Crea Utente":"Salva"}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal reset password */}
      {pwdModal && (
        <Modal title={`🔑 Reset Password — ${pwdModal.full_name||pwdModal.username}`} onClose={() => { setPwdModal(null); setNewPwd(""); }}>
          <div style={{marginBottom:16,padding:"12px 14px",background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,fontSize:12,color:"#92400e"}}>
            ⚠️ La nuova password sostituirà immediatamente quella attuale. L'utente dovrà usarla al prossimo accesso.
          </div>
          <Field label="Nuova password" required>
            <div style={{position:"relative"}}>
              <Input value={newPwd} onChange={setNewPwd}
                type={showPwd?"text":"password"} placeholder="Min. 4 caratteri"/>
              <button type="button" onClick={() => setShowPwd(v=>!v)}
                style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",
                  background:"none",border:"none",cursor:"pointer",color:C.muted}}>
                {showPwd ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            </div>
          </Field>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:4}}>
            <Btn variant="secondary" onClick={() => { setPwdModal(null); setNewPwd(""); }}>Annulla</Btn>
            <Btn onClick={resetPwd}><Key size={13}/> Aggiorna Password</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
