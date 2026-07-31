import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "./services/api";
import { useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import { RuoliPage, UtentiPage } from "./pages/AuthPages";
import {
  OutletPage, SalePage, TurniPage, AllergeniPage,
  TipiMenuPage, CategorieMenuPage, CategorieClientePage,
  VociMenuPage, MenuDelGiornoPage, StampantiPage, ServiceMonitorPage, WebMenuPage, WalletPage, ConfigEmailPage, MobileWalletPage
} from "./pages/ConfigPages";
import { SalaRistorante }   from "./pages/SalaRistorante";
import { LibroPrenotazioni } from "./pages/LibroPrenotazioni";
import { OspitiGiorno }      from "./pages/OspitiGiorno";
import { GestioneSala }      from "./pages/GestioneSala";
import {
  LayoutDashboard, UtensilsCrossed, BookOpen, ClipboardList,
  Building2, DoorOpen, Clock, AlertTriangle, FolderOpen,
  Tag, Users, ChevronRight, ChevronsLeft, ChevronsRight,
  LogOut, Shield, ShieldCheck, Utensils, BookMarked, ChefHat,
  Lock, Eye, Printer, Monitor, Globe, Wallet, Mail
} from "lucide-react";

const SIDEBAR_BG = "#204769";  // Sibylla Primary
const PRIMARY    = "#204769";
const LINK       = "#5C9CD4";
const ORANGE     = "#204769";  // map ORANGE → PRIMARY for compatibility

const NAV = [
  { section:"Operativo", items:[
    { id:"sala",          label:"Sala Ristorante",  icon:UtensilsCrossed },
    { id:"prenotazioni",  label:"Prenotazioni",      icon:BookOpen },
    { id:"ospiti",        label:"Ospiti del Giorno", icon:Users },
    { id:"gestione",      label:"Gestione Sala",     icon:ClipboardList },
  ]},
  { section:"Struttura", items:[
    { id:"outlets",       label:"Outlet",            icon:Building2 },
    { id:"sale",          label:"Sale e Tavoli",     icon:DoorOpen },
    { id:"turni",         label:"Turni",             icon:Clock },
  ]},
  { section:"Menu", items:[
    { id:"tipi-menu",       label:"Tipi Menu",        icon:FolderOpen },
    { id:"categorie-menu",  label:"Categorie",        icon:Tag },
    { id:"voci-menu",       label:"Voci Menu",        icon:Utensils },
    { id:"menu-giorno",     label:"Menu del Giorno",  icon:BookMarked },
    { id:"web-menu",        label:"Web Menu",          icon:Globe },
  ]},
  { section:"Generali", items:[
    { id:"allergeni",     label:"Allergeni",          icon:AlertTriangle },
    { id:"cat-cliente",   label:"Cat. Cliente",       icon:Users },
    { id:"stampanti",     label:"Stampanti",          icon:Printer },
    { id:"monitor",        label:"Service Monitor",    icon:Monitor },
    { id:"config-email",   label:"Configurazione Email", icon:Mail },
    { id:"mobile-wallet",  label:"Mobile Wallet",        icon:Wallet },
  ]},
  { section:"Amministrazione", items:[
    { id:"utenti",        label:"Utenti",             icon:Users },
    { id:"wallets",       label:"Wallet Clienti",     icon:Wallet },
    { id:"ruoli",         label:"Ruoli e Permessi",   icon:Shield },
  ]},
];

const ALL_ITEMS = NAV.flatMap(s => s.items);

const PAGE_META = {
  dashboard:"Dashboard", sala:"Sala Ristorante", prenotazioni:"Prenotazioni",
  gestione:"Gestione Sala", outlets:"Outlet", sale:"Sale e Tavoli", turni:"Turni",
  "tipi-menu":"Tipi Menu", "categorie-menu":"Categorie Menu", "voci-menu":"Voci Menu",
  "menu-giorno":"Menu del Giorno", allergeni:"Allergeni", "cat-cliente":"Categorie Cliente",
  utenti:"Gestione Utenti", ruoli:"Ruoli e Permessi",
};

// -- Access indicator ----------------------------------------------------------
function AccessBadge({ access }) {
  if (access === "completa") return null;
  return (
    <span style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:3,
      fontSize:9,fontWeight:700,color:access==="lettura"?"#60a5fa":"#475569",
      background:access==="lettura"?"rgba(96,165,250,.15)":"rgba(255,255,255,.06)",
      borderRadius:4,padding:"1px 5px",textTransform:"uppercase",letterSpacing:.5}}>
      {access==="lettura" ? <><Eye size={9}/>RO</> : <><Lock size={9}/>—</>}
    </span>
  );
}

// -- NavGroup ------------------------------------------------------------------
function NavGroup({ section, items, page, onNavigate, collapsed, canAccess }) {
  const visibleItems = items.filter(i => canAccess(i.id) !== "nascosta");
  if (visibleItems.length === 0) return null;

  const isActive = visibleItems.some(i => i.id === page);
  const [open, setOpen] = useState(isActive || section === "Operativo");

  return (
    <div style={{marginBottom:2}}>
      {!collapsed && (
        <button onClick={() => setOpen(o => !o)}
          style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"6px 10px",
            background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,.28)",
            fontSize:10,fontWeight:700,letterSpacing:1.1,textTransform:"uppercase",
            justifyContent:"space-between",borderRadius:6,transition:"color .15s"}}
          onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,.5)"}
          onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,.28)"}>
          <span>{section}</span>
          <ChevronRight size={11} style={{transition:"transform .2s",transform:open?"rotate(90deg)":"none"}}/>
        </button>
      )}
      {(collapsed || open) && (
        <div style={!collapsed?{paddingLeft:4}:{}}>
          {visibleItems.map(item => {
            const access = canAccess(item.id);
            const isPageActive = page === item.id;
            return (
              <button key={item.id} onClick={() => onNavigate(item.id)}
                className={`nav-item${isPageActive?" active":""}`}
                title={collapsed ? item.label : ""}>
                <item.icon size={16} style={{flexShrink:0}}/>
                {!collapsed && (
                  <>
                    <span style={{flex:1}}>{item.label}</span>
                    {!isPageActive && <AccessBadge access={access}/>}
                    {isPageActive && <span style={{width:4,height:4,borderRadius:"50%",background:ORANGE,flexShrink:0}}/>}
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// -- Sidebar -------------------------------------------------------------------
function Sidebar({ page, onNavigate, collapsed, setCollapsed, canAccess }) {
  const { user, logout, isAdmin } = useAuth();

  return (
    <aside style={{width:collapsed?60:220,background:"#204769",display:"flex",flexDirection:"column",
      height:"100vh",transition:"width .22s",overflow:"hidden",flexShrink:0,
      boxShadow:"2px 0 16px rgba(0,0,0,.25)",borderRight:"1px solid rgba(255,255,255,.04)"}}>

      {/* Logo */}
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"16px 12px 14px",
        borderBottom:"1px solid rgba(255,255,255,.06)",flexShrink:0}}>
        <div style={{width:34,height:34,borderRadius:10,flexShrink:0,
          background:"linear-gradient(135deg, #204769 0%, #244F75 100%)",
          display:"flex",alignItems:"center",justifyContent:"center",
          boxShadow:"0 2px 10px rgba(32,71,105,.4)"}}>
          <ChefHat size={18} color="white"/>
        </div>
        {!collapsed && (
          <div style={{minWidth:0}}>
            <div style={{color:"white",fontWeight:800,fontSize:13,letterSpacing:.2,lineHeight:1}}>Outlet Manager</div>
            <div style={{color:"rgba(255,255,255,.3)",fontSize:9,letterSpacing:1.2,textTransform:"uppercase",marginTop:2}}>by Sibylla Platform</div>
          </div>
        )}
      </div>

      {/* Dashboard */}
      <div style={{padding:"10px 8px 4px",flexShrink:0}}>
        <button onClick={() => onNavigate("dashboard")}
          className={`nav-item${page==="dashboard"?" active":""}`}
          title={collapsed?"Dashboard":""}>
          <LayoutDashboard size={16} style={{flexShrink:0}}/>
          {!collapsed && "Dashboard"}
        </button>
      </div>

      {/* Nav */}
      <nav style={{flex:1,overflowY:"auto",padding:"4px 8px 8px"}} className="scrollbar-thin">
        {NAV.map(s => (
          <NavGroup key={s.section} section={s.section} items={s.items}
            page={page} onNavigate={onNavigate} collapsed={collapsed} canAccess={canAccess}/>
        ))}
      </nav>

      {/* User + footer */}
      <div style={{borderTop:"1px solid rgba(255,255,255,.06)",flexShrink:0}}>
        {/* User info */}
        {!collapsed && user && (
          <div style={{padding:"10px 12px 6px",display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:30,height:30,borderRadius:"50%",flexShrink:0,
              background:"linear-gradient(135deg,#204769,#244F75)",
              display:"flex",alignItems:"center",justifyContent:"center",
              color:"white",fontSize:11,fontWeight:700}}>
              {(user.full_name||user.username||"?").slice(0,2).toUpperCase()}
            </div>
            <div style={{minWidth:0,flex:1}}>
              <div style={{color:"white",fontSize:12,fontWeight:600,lineHeight:1,
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {user.full_name||user.username}
              </div>
              <div style={{color:"rgba(255,255,255,.35)",fontSize:10,marginTop:1,display:"flex",alignItems:"center",gap:3}}>
                {user.is_admin ? <><ShieldCheck size={9}/> Admin</> : <>{user.ruolo_nome||"Utente"}</>}
              </div>
            </div>
            <button onClick={logout} title="Esci"
              style={{width:26,height:26,borderRadius:7,background:"rgba(255,255,255,.06)",
                border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                color:"rgba(255,255,255,.4)",transition:"all .15s",flexShrink:0}}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(239,68,68,.2)";e.currentTarget.style.color="#f87171";}}
              onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.06)";e.currentTarget.style.color="rgba(255,255,255,.4)";}}>
              <LogOut size={13}/>
            </button>
          </div>
        )}
        <div style={{padding:"4px 8px 10px"}}>
          <button onClick={() => setCollapsed(c => !c)}
            className="nav-item"
            style={{color:"rgba(255,255,255,.3)",justifyContent:collapsed?"center":"flex-start"}}
            title={collapsed?"Espandi":""}>
            {collapsed ? <ChevronsRight size={15}/> : <><ChevronsLeft size={15}/><span>Comprimi</span></>}
          </button>
        </div>
      </div>
    </aside>
  );
}

// -- Topbar --------------------------------------------------------------------
function Topbar({ page, canAccess }) {
  const access = canAccess(page);
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t=setInterval(()=>setTime(new Date()),30000); return ()=>clearInterval(t); },[]);

  return (
    <header style={{height:56,background:"#204769",borderBottom:"none",
      display:"flex",alignItems:"center",padding:"0 24px",flexShrink:0,
      boxShadow:"0 1px 4px rgba(0,0,0,.05)",zIndex:10,gap:16}}>
      <div style={{flex:1,display:"flex",alignItems:"center",gap:10}}>
        <div style={{fontWeight:700,fontSize:16,color:"white",fontFamily:"'Poppins',sans-serif",lineHeight:1}}>
          {PAGE_META[page]||"Dashboard"}
        </div>
        {page!=="dashboard" && access==="lettura" && (
          <span style={{display:"flex",alignItems:"center",gap:4,fontSize:11,fontWeight:700,
            color:"white",background:"rgba(92,156,212,.4)",border:"1px solid rgba(92,156,212,.5)",
            borderRadius:6,padding:"2px 8px"}}>
            <Eye size={11}/> Solo lettura
          </span>
        )}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{fontSize:12,color:"rgba(255,255,255,.7)",background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.2)",
          borderRadius:7,padding:"4px 12px",fontWeight:600}}>
          {time.toLocaleDateString("it-IT",{weekday:"short",day:"2-digit",month:"short"})}
          {" · "}
          {time.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}
        </div>
      </div>
    </header>
  );
}

// -- Pagina bloccata -----------------------------------------------------------
function AccessDenied({ page }) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      height:"100%",gap:14,color:"#94a3b8"}}>
      <Lock size={48} color="#e2e8f0"/>
      <div style={{fontSize:16,fontWeight:700,color:"#475569"}}>Accesso non consentito</div>
      <div style={{fontSize:13,color:"#94a3b8",textAlign:"center",maxWidth:300}}>
        Il tuo ruolo non ha i permessi per visualizzare questa pagina.<br/>
        Contatta un amministratore per richiedere l'accesso.
      </div>
    </div>
  );
}

// -- Dashboard -----------------------------------------------------------------
// -- Helper: formatta minuti in ore/minuti ------------------------------------
function formatDurata(min) {
  if(min === null || min === undefined) return "";
  if(min < 60) return `${min}m`;
  return `${Math.floor(min/60)}h ${min%60}m`;
}

// -- Helper: colore in base alla durata ---------------------------------------
function durataColor(min) {
  if(min === null) return "#94a3b8";
  if(min > 120) return "#dc2626";
  if(min > 75)  return "#f59e0b";
  return "#22c55e";
}

// -- Mini bar chart SVG --------------------------------------------------------
function BarChart({ data, color = ORANGE, height = 80 }) {
  if(!data || !data.length) return (
    <div style={{height,display:"flex",alignItems:"center",justifyContent:"center",color:"#94a3b8",fontSize:11}}>
      Nessun dato
    </div>
  );
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const W = 100 / data.length;

  return (
    <div style={{position:"relative",height,display:"flex",alignItems:"flex-end",gap:2}}>
      {data.map((d,i) => {
        const perc = (d.value / maxVal) * 100;
        return (
          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,height:"100%",justifyContent:"flex-end"}}
            title={`${d.label}: ${d.value}`}>
            <div style={{width:"100%",borderRadius:"3px 3px 0 0",
              background:d.value>0?color:"#f1f5f9",
              height:Math.max(perc,d.value>0?6:0)+"%",transition:"height .4s"}}>
            </div>
            <div style={{fontSize:9,color:"#94a3b8",textAlign:"center",lineHeight:1,
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",width:"100%",paddingBottom:1}}>
              {d.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -- Donut chart SVG -----------------------------------------------------------
function DonutChart({ segments, size = 100 }) {
  const total = segments.reduce((s,x) => s + x.value, 0);
  if(!total) return (
    <div style={{width:size,height:size,borderRadius:"50%",background:"#f1f5f9",
      display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
      <span style={{fontSize:10,color:"#94a3b8"}}>—</span>
    </div>
  );
  const r = 42, cx = 50, cy = 50;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const arcs = segments.filter(s=>s.value>0).map(s => {
    const pct = s.value / total;
    const dash = pct * circumference;
    const arc = { ...s, dash, offset };
    offset += dash;
    return arc;
  });

  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="14"/>
        {arcs.map((a,i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={a.color} strokeWidth="14"
            strokeDasharray={`${a.dash} ${circumference - a.dash}`}
            strokeDashoffset={-a.offset}
            style={{transform:"rotate(-90deg)",transformOrigin:"50% 50%"}}/>
        ))}
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:16,fontWeight:800,color:"#0f172a",lineHeight:1}}>{total}</span>
        <span style={{fontSize:9,color:"#94a3b8",marginTop:1}}>tavoli</span>
      </div>
    </div>
  );
}

// -- TavoloCard — card singolo tavolo con timer --------------------------------
function TavoloCard({ t, onGestione }) {
  const [elapsed, setElapsed] = useState(t.durata_min);
  useEffect(() => {
    if(t.status !== "occupato" && t.status !== "chiesto_conto") return;
    const interval = setInterval(() => setElapsed(e => (e||0)+1), 60000);
    return () => clearInterval(interval);
  }, [t.status]);

  const statusCfg = {
    disponibile:   { label:"Libero",         bg:"#f0fdf4", border:"#bbf7d0", dot:"#22c55e" },
    occupato:      { label:"Occupato",        bg:"#fff5f5", border:"#fecaca", dot:"#ef4444" },
    riservato:     { label:"Riservato",       bg:"#eff6ff", border:"#bfdbfe", dot:"#3b82f6" },
    chiesto_conto: { label:"Chiesto conto",   bg:"#fffbeb", border:"#fde68a", dot:"#f59e0b" },
    uscita:        { label:"In uscita",       bg:"#f8fafc", border:"#e2e8f0", dot:"#94a3b8" },
    bloccato:      { label:"Bloccato",        bg:"#f1f5f9", border:"#e2e8f0", dot:"#475569" },
  };
  const cfg = statusCfg[t.status] || statusCfg.disponibile;
  const showTimer = (t.status==="occupato"||t.status==="chiesto_conto") && elapsed!==null;

  return (
    <div style={{background:cfg.bg,border:`1.5px solid ${cfg.border}`,borderRadius:10,
      padding:"10px 11px",cursor:"pointer",transition:"all .15s",minWidth:100,
      boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}
      onClick={()=>onGestione&&onGestione(t)}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 14px rgba(0,0,0,.12)";e.currentTarget.style.transform="translateY(-1px)";}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,.06)";e.currentTarget.style.transform="none";}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
        <span style={{fontSize:15,fontWeight:800,color:"#0f172a"}}>T.{t.numero}</span>
        <span style={{width:8,height:8,borderRadius:"50%",background:cfg.dot,flexShrink:0,marginTop:2}}/>
      </div>
      {t.ha_prenotazione && t.nome_pren && (
        <div style={{fontSize:9,color:"#2563eb",fontWeight:600,marginBottom:2,
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          📋 {t.nome_pren}
        </div>
      )}
      {t.coperti>0 && (
        <div style={{fontSize:10,color:"#64748b",marginBottom:2}}>👥 {t.coperti}/{t.capienza} pax</div>
      )}
      {showTimer && (
        <div style={{fontSize:10,fontWeight:700,color:durataColor(elapsed),marginBottom:2}}>
          ⏱ {formatDurata(elapsed)}
        </div>
      )}
      {t.totale_comanda>0 && (
        <div style={{fontSize:10,fontWeight:700,color:"#059669"}}>
          € {t.totale_comanda.toFixed(2)}
        </div>
      )}
      <div style={{fontSize:9,color:cfg.dot,fontWeight:700,marginTop:3}}>{cfg.label}</div>
    </div>
  );
}

// -- SezioneServizio — pannello per una sala -----------------------------------
function SezioneServizio({ sala, onGestione }) {
  const stati = sala.stats || {};
  const liberi    = stati.disponibile||0;
  const occupati  = stati.occupato||0;
  const conto     = (stati.chiesto_conto||0)+(stati.uscita||0);
  const riservati = stati.riservato||0;
  const bloccati  = stati.bloccato||0;

  const segments = [
    { value:liberi,    color:"#22c55e", label:"Liberi" },
    { value:occupati,  color:"#ef4444", label:"Occupati" },
    { value:conto,     color:"#f59e0b", label:"Conto" },
    { value:riservati, color:"#3b82f6", label:"Riservati" },
    { value:bloccati,  color:"#94a3b8", label:"Bloccati" },
  ];

  // Tavoli con prenotazioni non ancora arrivate
  const nonArrivati = sala.tavoli.filter(t =>
    t.status==="riservato" && t.ha_prenotazione && t.status!=="occupato"
  ).length;

  // Tavoli occupati più a lungo (top 3)
  const topOccupati = [...sala.tavoli]
    .filter(t => t.status==="occupato" && t.durata_min!==null)
    .sort((a,b) => (b.durata_min||0)-(a.durata_min||0))
    .slice(0,3);

  return (
    <div style={{background:"white",borderRadius:12,border:"1px solid #e2e8f0",
      padding:"14px 16px",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div>
          <span style={{fontWeight:700,fontSize:14,color:"#0f172a"}}>{sala.sala_nome}</span>
          {sala.fatturato_oggi>0 && (
            <span style={{marginLeft:10,fontSize:12,color:"#059669",fontWeight:700}}>
              € {sala.fatturato_oggi.toFixed(2)} oggi
            </span>
          )}
        </div>
        <div style={{fontSize:11,color:"#64748b"}}>{sala.totale_tavoli} tavoli</div>
      </div>

      <div style={{display:"flex",gap:14,marginBottom:14}}>
        {/* Donut */}
        <DonutChart segments={segments} size={90}/>

        {/* Legenda */}
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:5,justifyContent:"center"}}>
          {[
            {v:liberi,    c:"#22c55e", l:"Liberi"},
            {v:occupati,  c:"#ef4444", l:"Occupati"},
            {v:conto,     c:"#f59e0b", l:"Conto/Uscita"},
            {v:riservati, c:"#3b82f6", l:"Riservati"},
            ...(nonArrivati>0?[{v:nonArrivati,c:"#8b5cf6",l:"Non arrivati"}]:[]),
            ...(bloccati>0?[{v:bloccati,c:"#94a3b8",l:"Bloccati"}]:[]),
          ].filter(x=>x.v>0).map(s=>(
            <div key={s.l} style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:10,height:10,borderRadius:3,background:s.c,flexShrink:0}}/>
              <span style={{fontSize:11,color:"#64748b",flex:1}}>{s.l}</span>
              <span style={{fontSize:13,fontWeight:800,color:"#0f172a"}}>{s.v}</span>
            </div>
          ))}
        </div>

        {/* Top occupati */}
        {topOccupati.length>0 && (
          <div style={{borderLeft:"1px solid #f1f5f9",paddingLeft:14,minWidth:110}}>
            <div style={{fontSize:10,fontWeight:700,color:"#94a3b8",marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>
              Più lunghi
            </div>
            {topOccupati.map(t=>(
              <div key={t.id} style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",marginBottom:4,gap:6}}>
                <span style={{fontSize:11,fontWeight:600,color:"#0f172a"}}>T.{t.numero}</span>
                <span style={{fontSize:11,fontWeight:700,color:durataColor(t.durata_min)}}>
                  {formatDurata(t.durata_min)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Griglia tavoli compatta */}
      <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
        {sala.tavoli.map(t=>(
          <TavoloCard key={t.id} t={t} onGestione={onGestione}/>
        ))}
      </div>
    </div>
  );
}

// -- Dashboard principale ------------------------------------------------------

// ── Tempo Reale Page ─────────────────────────────────────────────────────────
function TempoRealePage({ onNavigate }) {
  const [live, setLive]      = useState(null);
  const [lastUpdate, setLU]  = useState(null);
  const [loading, setLoading]= useState(true);
  const token = () => localStorage.getItem("outlet_token")||"";

  const fetchLive = useCallback(async () => {
    try {
      const r = await fetch("/api/dashboard/live", { headers:{ Authorization:`Bearer ${token()}` } });
      if(r.ok) { const d = await r.json(); setLive(d); setLU(new Date()); }
    } catch(e) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchLive();
    const t = setInterval(fetchLive, 30000); // refresh ogni 30s
    return () => clearInterval(t);
  }, [fetchLive]);

  const andamentoData = (live?.andamento_prenotazioni||[]).map(d=>({
    label: d.ora+"h", value: d.coperti, pren: d.prenotazioni,
  }));
  const r = live?.riepilogo || {};

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        marginBottom:20,paddingBottom:14,borderBottom:"1px solid #e2e8f0"}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:700,color:ORANGE,margin:0,fontFamily:"'Poppins',sans-serif"}}>
            📡 Monitoraggio Tempo Reale
          </h1>
          <p style={{fontSize:12,color:"#94a3b8",margin:"4px 0 0"}}>
            Stato in tempo reale di tutte le sale e i servizi attivi
          </p>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {lastUpdate&&<span style={{fontSize:11,color:"#94a3b8"}}>
            Aggiornato: {lastUpdate.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}
          </span>}
          <button onClick={fetchLive}
            style={{padding:"6px 14px",borderRadius:7,border:"1px solid #e2e8f0",background:"white",
              cursor:"pointer",fontSize:12,color:"#64748b",fontWeight:600}}>
            ↻ Aggiorna
          </button>
        </div>
      </div>

      {loading&&<div style={{textAlign:"center",padding:60,color:"#94a3b8",fontSize:14}}>
        Caricamento dati in corso...
      </div>}

      {!loading&&(
        <>
      {/* Sezione monitoraggio in tempo reale + grafico */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:14,marginBottom:20}}>

        {/* Stato globale tavoli */}
        <div style={{background:"white",borderRadius:12,border:"1px solid #e2e8f0",padding:"16px 18px",boxShadow:"0 1px 4px rgba(0,0,0,.05)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <span style={{fontWeight:700,fontSize:14,color:"#0f172a"}}>Stato servizio globale</span>
            <span style={{fontSize:10,color:"#94a3b8",fontWeight:600}}>TUTTE LE SALE</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
            {[
              {v:r.tavoli_liberi||0,    l:"Liberi",         c:"#22c55e", bg:"#f0fdf4", ic:"✅"},
              {v:r.tavoli_occupati||0,  l:"Occupati",       c:"#ef4444", bg:"#fff5f5", ic:"🔴"},
              {v:r.tavoli_conto||0,     l:"Conto/Uscita",   c:"#f59e0b", bg:"#fffbeb", ic:"💳"},
              {v:r.tavoli_riservati||0, l:"Riservati",      c:"#3b82f6", bg:"#eff6ff", ic:"📋"},
              {v:r.ospiti_vip||0,       l:"VIP oggi",       c:"#d97706", bg:"#fffbeb", ic:"⭐"},
            ].map(s=>(
              <div key={s.l} style={{background:s.bg,borderRadius:10,padding:"12px 10px",textAlign:"center",border:`1px solid ${s.c}25`}}>
                <div style={{fontSize:22,marginBottom:4}}>{s.ic}</div>
                <div style={{fontSize:22,fontWeight:800,color:s.c,lineHeight:1}}>{s.v}</div>
                <div style={{fontSize:10,color:"#64748b",marginTop:3}}>{s.l}</div>
              </div>
            ))}
          </div>
          {/* Turni stats */}
          {live?.turni_stats?.length>0 && (
            <div style={{marginTop:14,borderTop:"1px solid #f1f5f9",paddingTop:12}}>
              <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>
                Riempimento turni
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {live.turni_stats.filter(t=>t.prenotazioni>0).map(t=>(
                  <div key={t.turno_id}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                      <span style={{fontSize:12,fontWeight:600,color:"#0f172a"}}>{t.servizio} · {t.nome}</span>
                      <span style={{fontSize:11,color:"#64748b"}}>
                        {t.coperti} pax{t.capacita_max>0?` / ${t.capacita_max}`:""}
                        {t.perc_riempimento!==null?` (${t.perc_riempimento}%)`:""}
                      </span>
                    </div>
                    {t.capacita_max>0 && (
                      <div style={{height:5,background:"#f1f5f9",borderRadius:3}}>
                        <div style={{height:"100%",borderRadius:3,transition:"width .4s",
                          width:`${Math.min(100,t.perc_riempimento||0)}%`,
                          background:t.perc_riempimento>=100?"#dc2626":t.perc_riempimento>=80?"#f59e0b":"#22c55e"}}/>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Grafico prenotazioni giornaliere */}
        <div style={{background:"white",borderRadius:12,border:"1px solid #e2e8f0",padding:"16px 18px",boxShadow:"0 1px 4px rgba(0,0,0,.05)",display:"flex",flexDirection:"column"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <span style={{fontWeight:700,fontSize:14,color:"#0f172a"}}>Prenotazioni per ora</span>
            <span style={{fontSize:11,color:"#94a3b8"}}>{r.prenotazioni_oggi||0} tot.</span>
          </div>
          <div style={{flex:1,minHeight:0}}>
            <BarChart data={andamentoData.map(d=>({label:d.label,value:d.value}))} color={ORANGE} height={120}/>
          </div>
          <div style={{marginTop:8,display:"flex",gap:14,fontSize:11,color:"#64748b"}}>
            <span>📋 {r.prenotazioni_oggi||0} prenotazioni</span>
            <span>👥 {r.coperti_previsti||0} coperti</span>
          </div>
          {/* Dettaglio per ora */}
          {andamentoData.length>0 && (
            <div style={{marginTop:10,borderTop:"1px solid #f1f5f9",paddingTop:8,
              maxHeight:100,overflowY:"auto",display:"flex",flexDirection:"column",gap:3}} className="scrollbar-light">
              {andamentoData.filter(d=>d.value>0).map(d=>(
                <div key={d.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11}}>
                  <span style={{color:"#64748b"}}>{d.label}</span>
                  <div style={{display:"flex",gap:10}}>
                    <span style={{color:"#0f172a",fontWeight:600}}>{d.pren} pren.</span>
                    <span style={{color:ORANGE,fontWeight:700}}>{d.value} pax</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Monitoraggio per sala */}
      {live?.sale?.length>0 && (
        <div style={{marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>
            Monitoraggio sale — tempo reale
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {live.sale.filter(s=>s.totale_tavoli>0).map(sala=>(
              <SezioneServizio key={sala.sala_id} sala={sala}
                onGestione={(t)=>{
                  if(t.status==="occupato"||t.status==="chiesto_conto"||t.status==="uscita"){
                    onNavigate("gestione");
                  } else {
                    onNavigate("sala");
                  }
                }}/>
            ))}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}



// ── KDS Monitor View — standalone full-screen display ─────────────────────────
function KDSMonitorView({ slug }) {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [lastUpd,    setLastUpd]    = useState(null);
  const [time,       setTime]       = useState(new Date());
  const [blinkingId, setBlinkingId] = useState(null);   // comanda id currently blinking
  const [lastEventId,setLastEventId]= useState(null);   // last triggered comanda (stays highlighted)
  const [turnoTimers,setTurnoTimers] = useState({});    // {comandaId_turnoIdx: timestampMs}
  const prevDataRef  = useRef(null);
  const POLL_MS = 8000;

  // -- Web Audio — single shared context, unlocked on first user gesture ------
  const audioCtxRef = useRef(null);
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext||window.webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Unlock on first click anywhere in the monitor page
  useEffect(() => {
    const unlock = () => { try { getAudioCtx(); } catch {} };
    document.addEventListener("click", unlock, { once: true });
    return () => document.removeEventListener("click", unlock);
  }, [getAudioCtx]);

  const playBeep = useCallback(() => {
    try {
      const ctx = getAudioCtx();
      const now = ctx.currentTime;
      const beep = (freq, start, dur) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = "sine"; o.frequency.value = freq;
        g.gain.setValueAtTime(0, now+start);
        g.gain.linearRampToValueAtTime(0.5, now+start+0.01);
        g.gain.linearRampToValueAtTime(0, now+start+dur-0.01);
        o.start(now+start);
        o.stop(now+start+dur);
      };
      beep(880,  0,    0.10);
      beep(1100, 0.13, 0.10);
      beep(1320, 0.26, 0.15);
    } catch {}
  }, [getAudioCtx]);

  // -- Detect changes in comande data (new comanda or turno advance) ------------
  const detectAndAlert = useCallback((newData) => {
    const prev = prevDataRef.current;
    if (!prev || !newData) { prevDataRef.current = newData; return; }
    const prevMap = Object.fromEntries((prev.comande||[]).map(c=>[c.id, c.turno_corrente]));
    let alertId = null;
    for (const c of (newData.comande||[])) {
      const wasPresent = c.id in prevMap;
      const turnoChanged = wasPresent && (prevMap[c.id] !== c.turno_corrente);
      if (!wasPresent || turnoChanged) { alertId = c.id; break; }
    }
    prevDataRef.current = newData;
    if (alertId) {
      setBlinkingId(alertId);
      setLastEventId(alertId);
      playBeep();
      // Record timer for the current turno of this comanda
      const alertComanda = (newData.comande||[]).find(c=>c.id===alertId);
      if (alertComanda) {
        const key = `${alertId}_${alertComanda.turno_corrente||0}`;
        setTurnoTimers(prev => ({...prev, [key]: Date.now()}));
      }
      setTimeout(() => setBlinkingId(null), 10000);
    }
  }, [playBeep]);

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch(`/api/monitor/${slug}/live`);
      if(r.ok) {
        const d = await r.json();
        detectAndAlert(d);
        setData(d);
        setLastUpd(new Date());
      }
    } catch {}
    finally { setLoading(false); }
  }, [slug, detectAndAlert]);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, POLL_MS);
    return ()=>clearInterval(t);
  }, [fetchData]);

  useEffect(() => {
    const t = setInterval(()=>setTime(new Date()), 1000);
    return ()=>clearInterval(t);
  }, []);

  const mon = data?.monitor;
  const comande = data?.comande || [];
  const sfondo  = mon?.colore_sfondo || "#1a1a2e";
  const testo   = mon?.colore_testo  || "#ffffff";

  // Format elapsed seconds from a turnoTimers key
  const elapsedStr = (comandaId, turnoIdx) => {
    const key = `${comandaId}_${turnoIdx}`;
    const ts = turnoTimers[key];
    if (!ts) return null;
    const secs = Math.floor((Date.now() - ts) / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}′${String(s).padStart(2,"0")}"` : `${s}"`;
  };
  const elapsedColor = (comandaId, turnoIdx) => {
    const key = `${comandaId}_${turnoIdx}`;
    const ts = turnoTimers[key];
    if (!ts) return "#f59e0b";
    const mins = (Date.now() - ts) / 60000;
    if (mins < 8)  return "#22c55e";
    if (mins < 15) return "#f59e0b";
    return "#ef4444";
  };

  const waitColor = (min) => {
    if (min < 10) return "#22c55e";
    if (min < 20) return "#f59e0b";
    return "#ef4444";
  };

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#1a1a2e",display:"flex",
      alignItems:"center",justifyContent:"center",color:"white",fontSize:20,fontFamily:"monospace"}}>
      ⏳ Caricamento monitor...
    </div>
  );

  if (!mon) return (
    <div style={{minHeight:"100vh",background:"#1a1a2e",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",color:"white",fontFamily:"monospace"}}>
      <div style={{fontSize:48,marginBottom:16}}>❌</div>
      <div style={{fontSize:18,fontWeight:700}}>Monitor non trovato</div>
      <div style={{fontSize:13,opacity:.6,marginTop:8}}>Slug: {slug}</div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:sfondo,color:testo,
      fontFamily:"'Courier New',monospace,sans-serif",userSelect:"none",overflow:"hidden"}}>
      <style>{`
        @keyframes kds-blink {
          0%,100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); border-color: transparent; }
          25%      { box-shadow: 0 0 0 12px rgba(245,158,11,.6), 0 0 32px rgba(245,158,11,.4); border-color: #f59e0b; }
          50%      { box-shadow: 0 0 0 4px rgba(245,158,11,.3); border-color: #f59e0b88; }
          75%      { box-shadow: 0 0 0 18px rgba(245,158,11,.5), 0 0 48px rgba(245,158,11,.3); border-color: #f59e0b; }
        }
        @keyframes kds-pulse {
          0%,100% { opacity:1; }
          50%      { opacity:0.4; }
        }
        .kds-blinking  { animation: kds-blink 0.6s ease-in-out infinite; border: 2px solid #f59e0b !important; }
        .kds-last-event{ border: 2px solid #f59e0b !important; box-shadow: 0 0 0 4px rgba(245,158,11,.3), 0 0 20px rgba(245,158,11,.25); }
        .kds-blink-label{ animation: kds-pulse 0.5s ease-in-out infinite; }
      `}</style>

      {/* Top bar */}
      {(()=>{
        const hColor = mon?.colore_header || testo;
        return (
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"10px 20px",borderBottom:`1px solid ${hColor}22`,background:`${sfondo}ee`,
          position:"sticky",top:0,zIndex:10}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <span style={{fontSize:22,fontWeight:900,letterSpacing:2,color:hColor}}>{mon.nome.toUpperCase()}</span>
            <span style={{fontSize:12,color:hColor,opacity:.6,background:`${hColor}15`,padding:"2px 10px",borderRadius:20}}>
              {data?.comande?.length||0} comande attive
            </span>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:22,fontWeight:900,fontFamily:"monospace",letterSpacing:2,color:hColor}}>
              {time.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}
            </div>
            <div style={{fontSize:10,color:hColor,opacity:.5}}>
              {lastUpd?`Aggiornato ${lastUpd.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}`:""} 
              {" "}· Auto-refresh {POLL_MS/1000}s
            </div>
          </div>
        </div>
        );
      })()}

      {/* Empty state */}
      {comande.length===0&&(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",
          justifyContent:"center",height:"calc(100vh - 60px)",gap:16}}>
          <div style={{fontSize:80,opacity:.15}}>🍽️</div>
          <div style={{fontSize:24,fontWeight:700,opacity:.4}}>Nessuna comanda attiva</div>
          <div style={{fontSize:13,opacity:.25}}>In attesa di ordini...</div>
        </div>
      )}

      {/* Comande grid */}
      {comande.length>0&&(
        <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(comande.length,4)},1fr)`,
          gap:12,padding:16,height:"calc(100vh - 60px)",overflowY:"auto",alignContent:"start"}}>
          {comande.map(c=>{
            const tc = c.turno_corrente ?? 0;
            const nt = c.num_turni ?? 1;
            // Group righe by turno_idx
            const byTurno = {};
            for (const r of c.righe) {
              const ti = r.turno_idx ?? 0;
              if(!byTurno[ti]) byTurno[ti]=[];
              byTurno[ti].push(r);
            }
            const maxTurno = Math.max(...Object.keys(byTurno).map(Number));
            return (
            <div key={c.id}
              className={blinkingId===c.id?"kds-blinking":lastEventId===c.id&&blinkingId===null?"kds-last-event":""}
              style={{background:mon?.colore_griglia||`${testo}10`,
                border:`1px solid ${testo}25`,
                borderRadius:12,overflow:"hidden",display:"flex",flexDirection:"column",
                transition:"box-shadow .3s,border-color .3s"}}>
              {/* Alert banner: blinks during alert, stays solid as last-event */}
              {(blinkingId===c.id||lastEventId===c.id)&&(
                <div className={blinkingId===c.id?"kds-blink-label":undefined}
                  style={{background:"#f59e0b",color:"#000",
                    textAlign:"center",fontSize:11,fontWeight:900,letterSpacing:1.5,padding:"3px 0",
                    opacity:blinkingId===c.id?undefined:0.85}}>
                  🔔 {blinkingId===c.id?"NUOVO ORDINE / TURNO":"ULTIMO ORDINE"}
                </div>
              )}
              {/* Comanda header — redesigned: big tavolo+pax row + timers */}
              <div style={{padding:"10px 14px",background:`${testo}22`,
                borderBottom:`1px solid ${testo}20`}}>
                {/* Row 1: Tavolo + Pax */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"baseline",gap:10}}>
                    <span style={{fontSize:32,fontWeight:900,letterSpacing:2,lineHeight:1}}>
                      {c.tavolo_num!=="—"?`T.${c.tavolo_num}`:`#${c.numero}`}
                    </span>
                    {c.coperti>0&&(
                      <span style={{fontSize:32,fontWeight:900,color:testo,opacity:.9,letterSpacing:1}}>
                        👥{c.coperti}
                      </span>
                    )}
                  </div>
                  {/* Total wait */}
                  {(()=>{
                    const wh = Math.floor(c.wait_min/60);
                    const wm = c.wait_min % 60;
                    const wStr = wh>0 ? `${wh}h ${wm}m` : `${wm}m`;
                    return (
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:28,fontWeight:900,color:waitColor(c.wait_min),lineHeight:1,fontFamily:"monospace"}}>
                          {wStr}
                        </div>
                        <div style={{fontSize:10,fontWeight:700,color:waitColor(c.wait_min),opacity:.6,marginTop:3,letterSpacing:.5,textTransform:"uppercase"}}>
                          tempo totale
                        </div>
                      </div>
                    );
                  })()}
                </div>
                {/* Row 2: Turno call timer — only for current turno */}
                {(()=>{
                  const el = elapsedStr(c.id, tc);
                  if(!el) return null;
                  const col = elapsedColor(c.id, tc);
                  return (
                    <div style={{display:"flex",alignItems:"center",gap:6,
                      background:`${col}22`,borderRadius:6,padding:"3px 8px"}}>
                      <span style={{fontSize:11,fontWeight:700,color:col,letterSpacing:.5}}>
                        🔔 Turno {tc+1} chiamato
                      </span>
                      <span style={{fontFamily:"monospace",fontSize:14,fontWeight:900,color:col,marginLeft:"auto"}}>
                        {el}
                      </span>
                    </div>
                  );
                })()}
              </div>
              {/* Righe per turno */}
              <div style={{flex:1,padding:"10px 14px",display:"flex",flexDirection:"column",gap:10}}>
                {Array.from({length:maxTurno+1},(_,ti)=>byTurno[ti]||[]).map((righe,ti)=>{
                  if(!righe.length) return null;
                  const isCurrent  = ti===tc;
                  const isDone     = ti<tc;
                  const isFuture   = ti>tc;
                  return (
                    <div key={ti}>
                      {/* Turno separator label */}
                      {(maxTurno>0)&&(
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                          <div style={{flex:1,height:"1px",background:`${testo}20`}}/>
                          <span style={{
                            fontSize:10,fontWeight:800,letterSpacing:.8,
                            padding:"2px 10px",borderRadius:10,
                            background:isCurrent?"#f59e0b":isDone?`${testo}15`:`${testo}08`,
                            color:isCurrent?"#000":isDone?`${testo}55`:`${testo}44`,
                            border:isCurrent?"2px solid #f59e0b":"none",
                            display:"flex",alignItems:"center",gap:6,
                          }}>
                            <span>{isDone?"✓ ":""}TURNO {ti+1}{isCurrent?" 🔔":""}</span>
                            {isCurrent&&(()=>{
                              const el=elapsedStr(c.id,ti);
                              if(!el) return null;
                              return <span style={{fontFamily:"monospace",fontWeight:900,fontSize:11}}>{el}</span>;
                            })()}
                          </span>
                          <div style={{flex:1,height:"1px",background:`${testo}20`}}/>
                        </div>
                      )}
                      {/* Items */}
                      {righe.map((r,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:8,
                          padding:"7px 10px",marginBottom:4,
                          background:isCurrent?`${(mon?.colore_griglia||testo)}33`:isDone?`${testo}08`:`${testo}05`,
                          borderRadius:8,
                          borderLeft:`4px solid ${isCurrent?"#f59e0b":isDone?`${testo}30`:`${testo}15`}`,
                          opacity:isFuture?0.45:1,
                          transition:"all .3s",
                          boxShadow:isCurrent?"0 0 12px rgba(245,158,11,.3)":"none"}}>
                          {/* Bell or check */}
                          <span style={{fontSize:15,flexShrink:0,minWidth:22,textAlign:"center"}}>
                            {isDone?"✅":isCurrent?"🔔":"⏳"}
                          </span>
                          <span style={{fontSize:16,fontWeight:900,
                            color:isCurrent?"#f59e0b":isDone?`${testo}55`:`${testo}66`,
                            minWidth:28,textAlign:"center"}}>{r.qty}×</span>
                          <span style={{fontSize:13,fontWeight:isCurrent?700:500,flex:1,lineHeight:1.3,
                            color:isDone?`${testo}55`:testo,
                            textDecoration:isDone?"line-through":"none"}}>
                            {r.nome}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
              {/* Note */}
              {c.note&&(
                <div style={{padding:"6px 14px",background:"#b45309",fontSize:11,fontWeight:700,
                  color:"white",borderTop:`1px solid ${testo}20`}}>
                  ⚠️ {c.note}
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── CalendarHeatmap: booking density calendar for Dashboard ───────────────────
function CalendarHeatmap({ onNavigate }) {
  const today    = new Date();
  const [year,   setYear]  = useState(today.getFullYear());
  const [month,  setMonth] = useState(today.getMonth()); // 0-indexed
  const [heat,   setHeat]  = useState({});   // {"YYYY-MM-DD": {count, coperti}}
  const [sel,    setSel]   = useState(null); // selected date string
  const [selData,setSelData]=useState(null); // prenotazioni for selected day
  const token = () => localStorage.getItem("outlet_token")||"";

  const MONTHS = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
                  "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
  const DAYS   = ["L","M","M","G","V","S","D"];

  const loadHeat = useCallback(async (y, m) => {
    try {
      const r = await fetch(`/api/prenotazioni/heatmap?year=${y}&month=${m+1}`,
        { headers:{ Authorization:`Bearer ${token()}` }});
      if(r.ok) setHeat(await r.json());
    } catch {}
  }, []);

  useEffect(() => { loadHeat(year, month); }, [year, month, loadHeat]);

  const loadSelDay = async (dateStr) => {
    setSel(dateStr); setSelData(null);
    try {
      const r = await fetch(`/api/prenotazioni?data=${dateStr}`,
        { headers:{ Authorization:`Bearer ${token()}` }});
      if(r.ok) setSelData(await r.json());
    } catch {}
  };

  // Calendar math
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const adj      = firstDay === 0 ? 6 : firstDay - 1; // Mon-based
  const daysInMonth = new Date(year, month+1, 0).getDate();

  // Color scale based on booking count
  const heatColor = (count) => {
    if (!count) return { bg:"#f8fafc", border:"#e2e8f0", text:"#94a3b8" };
    if (count <= 2)  return { bg:"#dbeafe", border:"#93c5fd", text:"#1d4ed8" };
    if (count <= 5)  return { bg:"#bfdbfe", border:"#60a5fa", text:"#1e40af" };
    if (count <= 10) return { bg:"#2d5a7b", border:"#2d5a7b", text:"white" };
    return { bg:"#1e3a52", border:"#1e3a52", text:"white" };
  };

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  return (
    <div style={{background:"white",border:"1px solid #e2e8f0",borderRadius:12,
      padding:"16px 18px",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:"#0f172a"}}>📅 Calendario Prenotazioni</div>
          <div style={{fontSize:11,color:"#94a3b8"}}>Densità per giorno</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <button onClick={()=>{
            const d = new Date(year,month-1,1);
            setYear(d.getFullYear()); setMonth(d.getMonth()); setSel(null);
          }} style={{width:28,height:28,border:"1px solid #e2e8f0",borderRadius:6,background:"white",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
          <span style={{fontSize:13,fontWeight:700,color:ORANGE,minWidth:110,textAlign:"center"}}>
            {MONTHS[month]} {year}
          </span>
          <button onClick={()=>{
            const d = new Date(year,month+1,1);
            setYear(d.getFullYear()); setMonth(d.getMonth()); setSel(null);
          }} style={{width:28,height:28,border:"1px solid #e2e8f0",borderRadius:6,background:"white",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
          <button onClick={()=>{setYear(today.getFullYear());setMonth(today.getMonth());setSel(null);}}
            style={{marginLeft:4,padding:"3px 8px",border:"1px solid #e2e8f0",borderRadius:6,background:"white",cursor:"pointer",fontSize:11,color:"#64748b",fontWeight:600}}>Oggi</button>
        </div>
      </div>

      {/* Day headers */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:3}}>
        {DAYS.map((d,i)=>(
          <div key={i} style={{textAlign:"center",fontSize:10,fontWeight:700,
            color:i>=5?"#ef4444":"#94a3b8",padding:"2px 0"}}>{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
        {Array.from({length:adj}).map((_,i)=><div key={"e"+i}/>)}
        {Array.from({length:daysInMonth},(_,i)=>i+1).map(day=>{
          const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const h = heat[dateStr];
          const c = heatColor(h?.count||0);
          const isToday = dateStr===todayStr;
          const isSel   = dateStr===sel;
          return (
            <div key={day} onClick={()=>loadSelDay(dateStr)}
              style={{
                background: isSel?"#2d5a7b":c.bg,
                border:`1.5px solid ${isSel?"#1e3a52":isToday?"#f59e0b":c.border}`,
                borderRadius:7, padding:"4px 2px", cursor:"pointer",
                textAlign:"center", transition:"all .12s",
                outline:isToday?"2px solid #f59e0b":"none",
                outlineOffset:"-1px",
              }}
              onMouseEnter={e=>!isSel&&(e.currentTarget.style.boxShadow="0 2px 8px rgba(45,90,123,.2)")}
              onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
              <div style={{fontSize:11,fontWeight:isToday?800:600,
                color:isSel?"white":isToday?"#b45309":c.text,lineHeight:1.3}}>{day}</div>
              {h?.count>0&&(
                <div style={{fontSize:8,fontWeight:700,color:isSel?"rgba(255,255,255,.8)":c.text,lineHeight:1.2}}>
                  {h.count}p
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{display:"flex",gap:8,marginTop:12,alignItems:"center",flexWrap:"wrap"}}>
        <span style={{fontSize:10,color:"#94a3b8",fontWeight:600}}>Densità:</span>
        {[["Nessuna","#f8fafc","#e2e8f0"],["1-2","#dbeafe","#93c5fd"],["3-5","#bfdbfe","#60a5fa"],["6-10","#2d5a7b","#2d5a7b"],["10+","#1e3a52","#1e3a52"]].map(([l,bg,br])=>(
          <span key={l} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"#64748b"}}>
            <span style={{width:12,height:12,borderRadius:3,background:bg,border:`1px solid ${br}`,display:"inline-block"}}/>
            {l}
          </span>
        ))}
      </div>

      {/* Selected day detail */}
      {sel&&(
        <div style={{marginTop:12,borderTop:"1px solid #f1f5f9",paddingTop:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontSize:12,fontWeight:700,color:ORANGE}}>
              {new Date(sel+"T12:00:00").toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"})}
            </span>
            {selData&&<span style={{fontSize:11,color:"#64748b"}}>{selData.length} prenotazioni</span>}
            <button onClick={()=>onNavigate("prenotazioni")}
              style={{fontSize:10,color:"#2d5a7b",background:"transparent",border:"none",cursor:"pointer",fontWeight:600,textDecoration:"underline"}}>
              Apri →
            </button>
          </div>
          {selData===null&&<div style={{fontSize:12,color:"#94a3b8",textAlign:"center",padding:8}}>Caricamento...</div>}
          {selData?.length===0&&<div style={{fontSize:12,color:"#94a3b8",textAlign:"center",padding:8}}>Nessuna prenotazione</div>}
          {selData?.slice(0,4).map((p,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"5px 8px",borderRadius:6,background:"#f8fafc",marginBottom:4}}>
              <div>
                <span style={{fontSize:12,fontWeight:600,color:"#0f172a"}}>{p.nome||"—"}</span>
                <span style={{fontSize:10,color:"#94a3b8",marginLeft:6}}>👥 {p.coperti}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:11,fontWeight:700,color:ORANGE}}>{p.orario}</span>
                <span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:4,
                  background:p.confermata?"#f0fdf4":"#fff7ed",
                  color:p.confermata?"#16a34a":"#f97316",
                  border:`1px solid ${p.confermata?"#bbf7d0":"#fed7aa"}`}}>
                  {p.confermata?"✓":"⏳"}
                </span>
              </div>
            </div>
          ))}
          {selData?.length>4&&(
            <div style={{fontSize:11,color:"#94a3b8",textAlign:"center"}}>+{selData.length-4} altre</div>
          )}
        </div>
      )}
    </div>
  );
}

function Dashboard({ onNavigate, canAccess }) {
  const [stats, setStats]     = useState(null);
  const [live, setLive]       = useState(null);
  const [lastUpdate, setLU]   = useState(null);
  const [loadingLive, setLL]  = useState(true);
  const { user, isAdmin }     = useAuth();
  const token = () => localStorage.getItem("outlet_token")||"";

  const fetchLive = useCallback(async () => {
    try {
      const r = await fetch("/api/dashboard/live", { headers:{ Authorization:`Bearer ${token()}` } });
      if(r.ok) { const d = await r.json(); setLive(d); setLU(new Date()); }
    } catch(e) {}
    finally { setLL(false); }
  }, []);

  useEffect(() => {
    api.dashboard().then(setStats).catch(()=>{});
    fetchLive();
    // Aggiorna ogni 60 secondi
    const t = setInterval(fetchLive, 60000);
    return () => clearInterval(t);
  }, [fetchLive]);

  const oggi = new Date().toLocaleDateString("it-IT",{weekday:"long",year:"numeric",month:"long",day:"numeric"});

  // Dati per grafico prenotazioni
  const andamentoData = (live?.andamento_prenotazioni||[]).map(d=>({
    label: d.ora+"h",
    value: d.coperti,
    pren:  d.prenotazioni,
  }));

  const r = live?.riepilogo || {};

  const kpis = [
    { v: stats?.outlets||0,          l:"Outlet",           c:ORANGE,    ic:"🏢" },
    { v: r.prenotazioni_oggi||0,     l:"Prenotazioni oggi",c:"#0ea5e9", ic:"📖" },
    { v: r.coperti_previsti||0,      l:"Coperti previsti", c:"#8b5cf6", ic:"👥" },
    { v: `€${(r.fatturato_oggi||0).toFixed(0)}`, l:"Fatturato oggi", c:"#22c55e", ic:"💶" },
  ];

  const operativi = [
    {id:"sala",        icon:UtensilsCrossed, label:"Sala Ristorante",  desc:"Stato tavoli live",  color:ORANGE,    bg:"#fff7ed"},
    {id:"prenotazioni",icon:BookOpen,         label:"Prenotazioni",     desc:"Calendario e turni", color:"#0ea5e9", bg:"#f0f9ff"},
    {id:"gestione",    icon:ClipboardList,   label:"Gestione Sala",    desc:"Comande e conto",    color:"#8b5cf6", bg:"#faf5ff"},
  ].filter(c=>canAccess(c.id)!=="nascosta");

  return (
    <div style={{padding:"20px 24px 32px",overflowY:"auto",height:"100%"}} className="scrollbar-light">

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:600,color:"#204769",margin:0,fontFamily:"'Poppins',sans-serif"}}>
            Buongiorno{user?.full_name?`, ${user.full_name.split(" ")[0]}`:""}👋
          </h1>
          <p style={{fontSize:13,color:"#64748b",marginTop:4}}>{oggi}</p>
        </div>
        {lastUpdate && (
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#94a3b8",
            background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:20,padding:"4px 12px"}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:loadingLive?"#94a3b8":"#22c55e",flexShrink:0}}/>
            Live · {lastUpdate.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}
            <button onClick={fetchLive} style={{background:"none",border:"none",cursor:"pointer",color:"#94a3b8",fontSize:13,padding:0,lineHeight:1}}
              title="Aggiorna">↻</button>
          </div>
        )}
      </div>

      {/* KPI row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {kpis.map(k=>(
          <div key={k.l} style={{background:"white",borderRadius:12,border:"1px solid #e2e8f0",
            padding:"16px 18px",boxShadow:"0 1px 4px rgba(0,0,0,.05)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <span style={{fontSize:20}}>{k.ic}</span>
              <span style={{fontSize:10,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,textAlign:"right"}}>{k.l}</span>
            </div>
            <div style={{fontSize:26,fontWeight:800,color:k.c,lineHeight:1}}>{k.v}</div>
          </div>
        ))}
      </div>


      {/* ── Andamento vendite + Alerts ── */}
      {live&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 280px",gap:14,marginBottom:20}}>
          {/* Area chart andamento coperti */}
          <div style={{background:"white",border:"1px solid #e2e8f0",borderRadius:12,padding:"16px 18px",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:"#0f172a"}}>Andamento Vendite</div>
                <div style={{fontSize:11,color:"#94a3b8"}}>Coperti per fascia oraria</div>
              </div>
              <div style={{display:"flex",gap:14}}>
                {[["Oggi","#2d5a7b"],["Prenotati","#93c5fd"]].map(([l,c])=>(
                  <span key={l} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#64748b"}}>
                    <span style={{width:10,height:10,borderRadius:"50%",background:c,display:"inline-block"}}/>{l}
                  </span>
                ))}
              </div>
            </div>
            {(()=>{
              const andData = (live?.andamento_prenotazioni||[]).map(d=>({
                time: d.ora+"h", coperti: d.coperti, pren: d.prenotazioni
              }));
              if(!andData.length) return <div style={{height:160,display:"flex",alignItems:"center",justifyContent:"center",color:"#94a3b8",fontSize:13}}>Nessun dato oggi</div>;
              const W=500,H=140,pad=28;
              const maxV=Math.max(1,...andData.map(d=>Math.max(d.coperti,d.pren)));
              const xs=andData.map((_,i)=>pad+i*(W-2*pad)/(andData.length-1||1));
              const ys=v=>H-pad-(v/maxV)*(H-2*pad);
              const polyPts=(key)=>andData.map((d,i)=>`${xs[i]},${ys(d[key])}`).join(" ");
              const areaPath=(key)=>`M${xs[0]},${ys(andData[0][key])} `+andData.slice(1).map((d,i)=>`L${xs[i+1]},${ys(d[key])}`).join(" ")+` L${xs[xs.length-1]},${H-pad} L${xs[0]},${H-pad} Z`;
              return (
                <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:160}}>
                  <defs>
                    <linearGradient id="gCop" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2d5a7b" stopOpacity="0.2"/><stop offset="100%" stopColor="#2d5a7b" stopOpacity="0"/></linearGradient>
                    <linearGradient id="gPr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#93c5fd" stopOpacity="0.25"/><stop offset="100%" stopColor="#93c5fd" stopOpacity="0"/></linearGradient>
                  </defs>
                  {[0.25,0.5,0.75,1].map(f=><line key={f} x1={pad} y1={H-pad-f*(H-2*pad)} x2={W-pad} y2={H-pad-f*(H-2*pad)} stroke="#f1f5f9" strokeWidth="1"/>)}
                  <path d={areaPath("pren")} fill="url(#gPr)"/>
                  <polyline points={polyPts("pren")} fill="none" stroke="#93c5fd" strokeWidth="1.5" strokeDasharray="4 2"/>
                  <path d={areaPath("coperti")} fill="url(#gCop)"/>
                  <polyline points={polyPts("coperti")} fill="none" stroke="#2d5a7b" strokeWidth="2.5"/>
                  {andData.map((d,i)=><text key={i} x={xs[i]} y={H-6} textAnchor="middle" fontSize="9" fill="#94a3b8">{d.time}</text>)}
                  <text x={pad-4} y={pad+4} textAnchor="end" fontSize="9" fill="#94a3b8">{maxV}</text>
                </svg>
              );
            })()}
          </div>

          {/* Pannello alert + occupazione */}
          <div style={{background:"white",border:"1px solid #e2e8f0",borderRadius:12,padding:"16px",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#0f172a",marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
              🔔 Stato Outlet
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[
                live?.riepilogo?.tavoli_liberi>0&&{tipo:"success",msg:`${live.riepilogo.tavoli_liberi} tavoli liberi disponibili`},
                live?.riepilogo?.tavoli_occupati>0&&{tipo:"warning",msg:`${live.riepilogo.tavoli_occupati} tavoli occupati in servizio`},
                live?.riepilogo?.tavoli_conto>0&&{tipo:"info",msg:`${live.riepilogo.tavoli_conto} tavoli in chiusura conto`},
                live?.riepilogo?.prenotazioni_oggi>0&&{tipo:"info",msg:`${live.riepilogo.prenotazioni_oggi} prenotazioni totali oggi`},
              ].filter(Boolean).map((a,i)=>{
                const m={success:{c:"#16a34a",bg:"#f0fdf4",border:"#bbf7d0",ico:"✅"},warning:{c:"#f97316",bg:"#fff7ed",border:"#fed7aa",ico:"⚠️"},info:{c:"#2563eb",bg:"#eff6ff",border:"#bfdbfe",ico:"ℹ️"},error:{c:"#dc2626",bg:"#fef2f2",border:"#fecaca",ico:"❌"}}[a.tipo]||{};
                return <div key={i} style={{background:m.bg,border:`1px solid ${m.border}`,borderRadius:8,padding:"8px 10px",fontSize:11,color:"#475569",display:"flex",gap:7,alignItems:"flex-start"}}>
                  <span style={{flexShrink:0}}>{m.ico}</span><span>{a.msg}</span>
                </div>;
              })}
            </div>
            {live?.riepilogo&&(
              <div style={{marginTop:16}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#64748b",marginBottom:6}}>
                  <span>Occupazione attuale</span>
                  <span style={{color:ORANGE,fontWeight:700}}>
                    {live.riepilogo.tavoli_liberi+live.riepilogo.tavoli_occupati>0
                      ? Math.round(live.riepilogo.tavoli_occupati/(live.riepilogo.tavoli_liberi+live.riepilogo.tavoli_occupati+live.riepilogo.tavoli_conto)*100)+"%"
                      : "0%"}
                  </span>
                </div>
                <div style={{background:"#f1f5f9",borderRadius:99,height:7,overflow:"hidden"}}>
                  <div style={{width:live.riepilogo.tavoli_liberi+live.riepilogo.tavoli_occupati>0
                    ? Math.min(100,Math.round(live.riepilogo.tavoli_occupati/(live.riepilogo.tavoli_liberi+live.riepilogo.tavoli_occupati+live.riepilogo.tavoli_conto)*100))+"%"
                    : "0%",height:"100%",background:`linear-gradient(90deg,#f59e0b,${ORANGE})`,borderRadius:99,transition:"width .5s"}}/>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Prenotazioni prossime ── */}
      {live?.prenotazioni_prossime?.length>0&&(
        <div style={{marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:.8,marginBottom:10}}>
            📋 Prossime prenotazioni
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
            {live.prenotazioni_prossime.slice(0,6).map((p,i)=>{
              const conf = p.stato==="confermata";
              return (
                <div key={i} style={{background:"white",border:"1px solid #e2e8f0",borderRadius:10,
                  padding:"10px 14px",borderLeft:`3px solid ${conf?"#22c55e":"#f97316"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{p.nome||"—"}</span>
                    <span style={{fontSize:12,fontWeight:700,color:ORANGE}}>{p.ora}</span>
                  </div>
                  <div style={{fontSize:11,color:"#64748b"}}>👥 {p.coperti} coperti</div>
                  <div style={{fontSize:10,fontWeight:600,color:conf?"#16a34a":"#f97316",marginTop:2}}>
                    {conf?"✓ Confermata":"⏳ In attesa"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* ── Calendario prenotazioni ── */}
      <div style={{marginBottom:20}}>
        <CalendarHeatmap onNavigate={onNavigate}/>
      </div>

      {/* Monitoraggio live → pagina Tempo Reale */}
      <div style={{marginBottom:20,padding:"12px 18px",borderRadius:10,
        border:"1px solid #dbeafe",background:"#eff6ff",cursor:"pointer",
        display:"flex",alignItems:"center",justifyContent:"space-between"}}
        onClick={()=>onNavigate("tempo-reale")}>
        <div>
          <div style={{fontWeight:700,fontSize:14,color:ORANGE}}>📡 Monitoraggio Tempo Reale</div>
          <div style={{fontSize:12,color:"#64748b",marginTop:3}}>Stato in tempo reale di tutte le sale e i servizi attivi</div>
        </div>
        <div style={{fontSize:12,color:"#3b82f6",fontWeight:600}}>Apri →</div>
      </div>


      {/* Accesso rapido operativo */}
      {operativi.length>0 && (
        <div style={{marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>Accesso rapido</div>
          <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(operativi.length,3)},1fr)`,gap:12}}>
            {operativi.map(c=>(
              <div key={c.id} onClick={()=>onNavigate(c.id)}
                style={{background:"white",borderRadius:12,border:"1px solid #e2e8f0",padding:18,
                  cursor:"pointer",boxShadow:"0 1px 4px rgba(0,0,0,.05)",transition:"all .18s",
                  display:"flex",alignItems:"center",gap:14}}
                onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 6px 24px rgba(32,71,105,.15)";e.currentTarget.style.borderColor=c.color;}}
                onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,.05)";e.currentTarget.style.borderColor="#e2e8f0";}}>
                <div style={{width:44,height:44,borderRadius:11,background:c.bg,flexShrink:0,
                  display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${c.color}25`}}>
                  <c.icon size={20} color={c.color}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14,color:"#0f172a"}}>{c.label}</div>
                  <div style={{fontSize:11,color:"#64748b"}}>{c.desc}</div>
                </div>
                <ChevronRight size={16} color="#94a3b8"/>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Config rapida */}
      {(()=>{
        const cfg=[
          {id:"outlets",icon:Building2,label:"Outlet",color:ORANGE},
          {id:"sale",icon:DoorOpen,label:"Sale e Tavoli",color:"#0ea5e9"},
          {id:"turni",icon:Clock,label:"Turni",color:"#22c55e"},
          {id:"voci-menu",icon:Utensils,label:"Voci Menu",color:"#8b5cf6"},
          {id:"utenti",icon:Users,label:"Utenti",color:"#f59e0b"},
          {id:"ruoli",icon:Shield,label:"Ruoli",color:"#ec4899"},
        ].filter(c=>canAccess(c.id)!=="nascosta");
        if(!cfg.length) return null;
        return(
          <div>
            <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Configurazione</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {cfg.map(c=>(
                <div key={c.id} onClick={()=>onNavigate(c.id)}
                  style={{background:"white",borderRadius:8,border:"1px solid #DBDBDB",padding:"10px 14px",
                    cursor:"pointer",display:"flex",alignItems:"center",gap:10,transition:"all .12s"}}
                  onMouseEnter={e=>{e.currentTarget.style.background="#f8fafc";e.currentTarget.style.borderColor=c.color;}}
                  onMouseLeave={e=>{e.currentTarget.style.background="white";e.currentTarget.style.borderColor="#e2e8f0";}}>
                  <div style={{width:30,height:30,borderRadius:7,background:`${c.color}12`,
                    display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <c.icon size={14} color={c.color}/>
                  </div>
                  <span style={{fontSize:12,fontWeight:600,color:"#0f172a",flex:1}}>{c.label}</span>
                  <ChevronRight size={12} color="#94a3b8"/>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default function App() {
  // Check for monitor view URL: /monitor/slug or ?monitor=slug
  const monitorSlug = (() => {
    const path = window.location.pathname;
    const m = path.match(/^\/monitor\/([^/]+)$/);
    if (m) return m[1];
    return new URLSearchParams(window.location.search).get("monitor");
  })();
  if (monitorSlug) return <KDSMonitorView slug={monitorSlug}/>;
  // Note: /menu/:slug is served directly by Flask backend, no React routing needed

  const { user, loading, canAccess, isAdmin } = useAuth();
  const [page, setPage]         = useState("dashboard");
  const [ctx, setCtx]           = useState({});
  const [collapsed, setCollapsed] = useState(false);

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",
      background:"#0f172a",fontFamily:"system-ui"}}>
      <div style={{textAlign:"center",color:"white"}}>
        <div style={{width:48,height:48,border:"3px solid rgba(255,255,255,.15)",borderTopColor:ORANGE,
          borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 16px"}}/>
        <div style={{fontSize:13,color:"rgba(255,255,255,.4)"}}>Caricamento...</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!user) return <LoginPage/>;

  const navigate = (id) => {
    if (id === "dashboard") { setPage("dashboard"); return; }
    const access = canAccess(id);
    if (access === "nascosta") return;
    setPage(id);
  };

  const handleGestione = (tavolo, sala, outlet, turno) => { setCtx({tavolo,sala,outlet,turno}); setPage("gestione"); };
  const isFullPage = ["sala","prenotazioni","gestione"].includes(page);
  const access = canAccess(page);

  const renderPage = () => {
    if (page !== "dashboard" && access === "nascosta") return <AccessDenied page={page}/>;
    const ro = access === "lettura";
    switch(page) {
      case "dashboard":       return <Dashboard onNavigate={navigate} canAccess={canAccess}/>;
      case "tempo-reale":     return <TempoRealePage onNavigate={navigate}/>;
      case "outlets":         return <OutletPage readOnly={ro}/>;
      case "sale":            return <SalePage readOnly={ro}/>;
      case "turni":           return <TurniPage readOnly={ro}/>;
      case "allergeni":       return <AllergeniPage readOnly={ro}/>;
      case "tipi-menu":       return <TipiMenuPage readOnly={ro}/>;
      case "categorie-menu":  return <CategorieMenuPage readOnly={ro}/>;
      case "cat-cliente":     return <CategorieClientePage readOnly={ro}/>;
      case "stampanti":        return <StampantiPage readOnly={ro}/>;
      case "config-email":        return <ConfigEmailPage readOnly={ro}/>;
      case "mobile-wallet":       return <MobileWalletPage readOnly={ro}/>;
      case "monitor":          return <ServiceMonitorPage readOnly={ro}/>;
      case "voci-menu":       return <VociMenuPage readOnly={ro}/>;
      case "menu-giorno":     return <MenuDelGiornoPage readOnly={ro}/>;
      case "web-menu":        return <WebMenuPage readOnly={ro}/>;
      case "sala":            return <SalaRistorante onGestione={handleGestione} initSala={ctx?.sala||null} initOutlet={ctx?.outlet||null} onGoPrenotazioni={(pren,outlet,sala,turno)=>{setCtx(c=>({...c,editPren:pren||null,outlet:outlet||c.outlet,sala:sala||c.sala,turno:turno||c.turno}));navigate("prenotazioni");}}/>;
      case "ospiti":          return <OspitiGiorno/>;
      case "prenotazioni":    return <LibroPrenotazioni initEditPren={ctx?.editPren||null} initOutlet={ctx?.outlet||null} initSala={ctx?.sala||null} initTurno={ctx?.turno||null} onClearCtx={()=>setCtx(c=>({...c,editPren:null}))} onGoToSala={(outlet,sala,turno)=>{setCtx(c=>({...c,outlet:outlet||c.outlet,sala:sala||c.sala,turno:turno||null}));navigate("sala");}}/>;
      case "gestione":        return <GestioneSala {...ctx} onGoToSala={(sala,outlet)=>{ setCtx(c=>({...c,sala,outlet})); navigate("sala"); }}/>;
      case "wallets":         return <WalletPage readOnly={ro}/>;
      case "utenti":          return <UtentiPage/>;
      case "ruoli":           return <RuoliPage/>;
      default:                return <Dashboard onNavigate={navigate} canAccess={canAccess}/>;
    }
  };

  return (
    <div style={{display:"flex",height:"100vh",fontFamily:"'Segoe UI',system-ui,sans-serif",overflow:"hidden"}}>
      <Sidebar page={page} onNavigate={navigate} collapsed={collapsed}
        setCollapsed={setCollapsed} canAccess={canAccess}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
        <Topbar page={page} canAccess={canAccess}/>
        <main style={{flex:1,overflow:isFullPage?"hidden":"auto",background:"#f2f5f6"}}>
          {isFullPage
            ? renderPage()
            : <div style={{padding:"24px 28px",minHeight:"100%"}}>{renderPage()}</div>}
        </main>
      </div>
    </div>
  );
}