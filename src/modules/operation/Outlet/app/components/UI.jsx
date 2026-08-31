import { useState } from "react";
// Componenti reali della piattaforma Sibylla: i primitivi qui sotto li usano
// così le pagine Outlet sono conformi PER COSTRUZIONE (stessi .sib-* e Modal).
import SibModal from "../../../../../core/components/Modal";

// ── Sibylla Design System Tokens ─────────────────────────────────────────────
export const C = {
  navy:    "#204769",   // Primary
  navy2:   "#244F75",   // Sidebar item bg
  link:    "#5C9CD4",   // Link / accent
  bg:      "#f2f5f6",   // Page background
  bgCard:  "#FFFFFF",
  bgFilter:"#dde9f2",
  white:   "white",
  border:  "#CFCFCF",
  borderL: "#DBDBDB",
  text:    "#4A4D53",   // Text/active
  muted:   "#6E7175",   // Text/inactive
  disabled:"#A9AAAD",   // Text/disabled
  blue:    "#5C9CD4",
  green:   "#00CF86",
  red:     "#FF616E",
  amber:   "#F57D03",
  purple:  "#8b5cf6",
};

const shadow     = "0 2px 8px rgba(32,71,105,.07)";
const shadowHover= "0 6px 24px rgba(32,71,105,.14)";

// ── Toast ────────────────────────────────────────────────────────────────────
export function Toast({ msg, type, onClose }) {
  if (!msg) return null;
  const ok = type !== "error";
  return (
    <div style={{position:"fixed",top:20,right:20,zIndex:9999,
      background:ok?"#E4F8EE":"#FFEAEF",
      border:`1px solid ${ok?"#00CF86":"#FF616F"}`,
      borderRadius:10,padding:"12px 18px",
      color:ok?"#007035":"#D10011",
      fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:10,
      boxShadow:"0 8px 24px rgba(32,71,105,.18)",
      fontFamily:"'Open Sans',sans-serif"}}>
      <i className={`fa-light ${ok?"fa-circle-check":"fa-circle-xmark"}`} style={{fontSize:16}}/>{msg}
      <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"inherit",fontSize:15,marginLeft:4,lineHeight:1}}><i className="fa-light fa-xmark"/></button>
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────
// Modale = il Modal della piattaforma (stesso overlay/header/close standard).
export function Modal({ title, onClose, children, wide }) {
  return (
    <SibModal open onClose={onClose} title={title} size={wide ? "xl" : "md"}>
      {children}
    </SibModal>
  );
}

// ── Field ────────────────────────────────────────────────────────────────────
export function Field({ label, required, children, half }) {
  return (
    <div style={{marginBottom:14,width:half?"calc(50% - 6px)":"100%",flexShrink:0}}>
      <label style={{display:"block",fontSize:12,fontWeight:600,
        color:C.muted,marginBottom:5,fontFamily:"'Open Sans',sans-serif"}}>
        {label}{required&&<span style={{color:C.red,marginLeft:2}}>*</span>}
      </label>
      {children}
    </div>
  );
}

export function Input({ value, onChange, type="text", placeholder, min, step, disabled }) {
  return <input className="sib-input" value={value??""} onChange={e=>onChange(e.target.value)}
    type={type} placeholder={placeholder} min={min} step={step} disabled={disabled}/>;
}

export function Textarea({ value, onChange, rows=3, placeholder }) {
  return <textarea className="sib-input" value={value??""} onChange={e=>onChange(e.target.value)}
    rows={rows} placeholder={placeholder}
    style={{height:"auto",paddingTop:8,paddingBottom:8,resize:"vertical"}}/>;
}

export function Select({ value, onChange, children, placeholder }) {
  return <select className="sib-select" value={value??""} onChange={e=>onChange(e.target.value)}>
    {placeholder&&<option value="">{placeholder}</option>}
    {children}
  </select>;
}

// ── Btn — bottone standard di piattaforma (.sib-btn) ──────────────────────────
const BTN_VARIANT = { primary:"primary", secondary:"secondary", danger:"danger", ghost:"ghost", outline:"secondary" };
export function Btn({ children, onClick, variant="primary", type="button", disabled, small, size, icon }) {
  const sm = small || size === "sm";
  const v = BTN_VARIANT[variant] || "primary";
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`sib-btn sib-btn--${v}${sm ? " sib-btn--sm" : ""}`}>
      {icon && <span>{icon}</span>}{children}
    </button>
  );
}

// ── PillBtn ───────────────────────────────────────────────────────────────────
export function PillBtn({ label, active, onClick, color }) {
  const col = color || C.navy;
  return (
    <button onClick={onClick}
      style={{padding:"6px 16px",borderRadius:6,
        border: `1.5px solid ${active ? col : C.border}`,
        background: active ? col : C.bgCard,
        color: active ? "white" : C.muted,
        fontSize:12, fontWeight:700, cursor:"pointer", transition:"all .15s",
        fontFamily:"'Open Sans',sans-serif"}}
      onMouseEnter={e=>{ if(!active){ e.currentTarget.style.borderColor=col; e.currentTarget.style.color=C.text; }}}
      onMouseLeave={e=>{ if(!active){ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.muted; }}}>
      {label}
    </button>
  );
}

// ── DataTable ─────────────────────────────────────────────────────────────────
export function DataTable({ cols, rows, onEdit, onDelete, loading, emptyMsg="Nessun dato" }) {
  if (loading) return (
    <div style={{textAlign:"center",padding:"60px",color:C.muted,fontSize:13}}>
      <div style={{width:36,height:36,border:"3px solid #e6eaee",borderTopColor:C.navy,
        borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 14px"}}/>
      Caricamento...
    </div>
  );
  if (!rows.length) return (
    <div style={{textAlign:"center",padding:"60px",color:C.muted,fontSize:13}}>
      <div style={{fontSize:30,marginBottom:10,color:C.disabled}}><i className="fa-light fa-inbox"/></div>{emptyMsg}
    </div>
  );
  return (
    <div className="sib-table-wrap" style={{overflowX:"auto"}}>
      <table className="sib-table">
        <thead>
          <tr>
            {cols.map(c=>(<th key={c.key}>{c.label}</th>))}
            {(onEdit||onDelete)&&<th style={{width:90}}>Azioni</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row,i)=>(
            <tr key={row.id||i}>
              {cols.map(c=>(
                <td key={c.key}>{c.render?c.render(row[c.key],row):(row[c.key]??"-")}</td>
              ))}
              {(onEdit||onDelete)&&(
                <td>
                  <div style={{display:"flex",gap:4}}>
                    {onEdit&&<Btn small variant="outline" onClick={()=>onEdit(row)}><i className="fa-light fa-pen"/></Btn>}
                    {onDelete&&<Btn small variant="danger" onClick={()=>onDelete(row)}><i className="fa-light fa-trash-can"/></Btn>}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  // Le classi om-pagehead* servono alla shell del Configuratore Sibylla per
  // spegnere il secondo page-head quando la pagina è montata dentro CfgPane
  // (il titolo lì lo dà la shell); fuori dal Configuratore non cambiano nulla.
  return (
    <div className="om-pagehead" style={{marginBottom:0}}>
      {/* Title bar — Sibylla style: full width with primary color title */}
      <div className="om-pagehead__bar" style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"0 0 16px",borderBottom:`1px solid ${C.borderL}`,marginBottom:20,
        flexWrap:"wrap",gap:12}}>
        <div className="om-pagehead__titles">
          <h1 style={{fontSize:18,fontWeight:600,color:C.navy,margin:0,
            fontFamily:"'Poppins',sans-serif",lineHeight:"24px"}}>{title}</h1>
          {subtitle&&<p style={{fontSize:13,color:C.muted,margin:"4px 0 0",fontFamily:"'Open Sans',sans-serif"}}>{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style={}, onClick, hover=true }) {
  return (
    <div style={{background:C.bgCard,borderRadius:15,border:`1px solid ${C.borderL}`,
      boxShadow:shadow,transition:"all .18s",cursor:onClick?"pointer":"default",...style}}
      onClick={onClick}
      onMouseEnter={e=>{if(hover&&onClick){e.currentTarget.style.boxShadow=shadowHover;e.currentTarget.style.transform="translateY(-2px)";}}}
      onMouseLeave={e=>{if(hover&&onClick){e.currentTarget.style.boxShadow=shadow;e.currentTarget.style.transform="none";}}}>
      {children}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ label, color="#5C9CD4", dot=false }) {
  return (
    <span style={{background:`${color}18`,color,border:`1px solid ${color}35`,
      borderRadius:6,padding:"2px 9px",fontSize:11,fontWeight:700,
      display:"inline-flex",alignItems:"center",gap:4,whiteSpace:"nowrap",
      fontFamily:"'Open Sans',sans-serif"}}>
      {dot&&<span style={{width:6,height:6,borderRadius:"50%",background:color,display:"inline-block"}}/>}
      {label}
    </span>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────
export function StatCard({ value, label, color, icon }) {
  return (
    <div style={{background:C.bgCard,borderRadius:15,border:`1px solid ${C.borderL}`,
      padding:"18px 20px",boxShadow:shadow}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <span style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",
          letterSpacing:.6,fontFamily:"'Open Sans',sans-serif"}}>{label}</span>
        {icon&&<span style={{fontSize:20}}>{icon}</span>}
      </div>
      <div style={{fontSize:22,fontWeight:700,color:color||C.navy,
        fontFamily:"'Poppins',sans-serif"}}>{value}</div>
    </div>
  );
}

export function FormRow({ children }) {
  return <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>{children}</div>;
}

// ── useConfirm ────────────────────────────────────────────────────────────────
export function useConfirm() {
  const [state, setState] = useState(null);
  const confirm = (msg, onOk) => setState({ msg, onOk });
  const Dialog = () => state ? (
    <SibModal open onClose={()=>setState(null)} title="Conferma" size="sm">
      <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:22}}>
        <span style={{fontSize:20,color:C.amber,marginTop:1}}><i className="fa-light fa-triangle-exclamation"/></span>
        <p style={{fontSize:13,color:C.text,lineHeight:1.6,margin:0}}>{state.msg}</p>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn variant="secondary" onClick={()=>setState(null)}>Annulla</Btn>
        <Btn variant="danger" onClick={()=>{state.onOk();setState(null);}}>Elimina</Btn>
      </div>
    </SibModal>
  ) : null;
  return { confirm, Dialog };
}

// ── useToast ──────────────────────────────────────────────────────────────────
export function useToast() {
  const [t, setT] = useState(null);
  const toast = (msg, type="success") => { setT({msg,type}); setTimeout(()=>setT(null),3500); };
  const ToastEl = () => t ? <Toast msg={t.msg} type={t.type} onClose={()=>setT(null)}/> : null;
  return { toast, ToastEl };
}

// ── MiniCalendar ──────────────────────────────────────────────────────────────
const MONTHS_CAL = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
                    "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

export function MiniCalendar({ sel, onSel }) {
  const [view, setView] = useState(new Date(sel||new Date()));
  const yr = view.getFullYear(), mo = view.getMonth();
  const firstWd = new Date(yr,mo,1).getDay();
  const adj = firstWd===0?6:firstWd-1;
  const dim = new Date(yr,mo+1,0).getDate();
  const today = new Date();
  const selDate = sel || new Date();
  const isSel  = d=>d&&selDate.getDate()===d&&selDate.getMonth()===mo&&selDate.getFullYear()===yr;
  const isToday= d=>d&&today.getDate()===d&&today.getMonth()===mo&&today.getFullYear()===yr;
  const days   = [...Array(adj).fill(null),...Array.from({length:dim},(_,i)=>i+1)];
  const DAY_LABELS = ["L","M","M","G","V","S","D"];
  return (
    <div style={{fontFamily:"'Open Sans',sans-serif"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <button onClick={()=>setView(new Date(yr,mo-1,1))}
          style={{background:"none",border:`1px solid ${C.borderL}`,borderRadius:6,
            width:24,height:24,cursor:"pointer",fontSize:13,color:C.muted,
            display:"flex",alignItems:"center",justifyContent:"center"}}><i className="fa-light fa-chevron-left"/></button>
        <span style={{fontSize:12,fontWeight:700,color:C.navy}}>{MONTHS_CAL[mo]} {yr}</span>
        <button onClick={()=>setView(new Date(yr,mo+1,1))}
          style={{background:"none",border:`1px solid ${C.borderL}`,borderRadius:6,
            width:24,height:24,cursor:"pointer",fontSize:13,color:C.muted,
            display:"flex",alignItems:"center",justifyContent:"center"}}><i className="fa-light fa-chevron-right"/></button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1}}>
        {DAY_LABELS.map((d,i)=>(
          <div key={i} style={{textAlign:"center",fontSize:9,fontWeight:700,
            color:i>=5?C.link:C.disabled,padding:"2px 0"}}>{d}</div>
        ))}
        {days.map((d,i)=>{
          const isWknd=i%7>=5, sel_=isSel(d), tod=isToday(d);
          return (
            <div key={i} onClick={()=>d&&onSel(new Date(yr,mo,d))}
              style={{textAlign:"center",fontSize:11,padding:"4px 2px",borderRadius:6,
                cursor:d?"pointer":"default",
                background:sel_?C.navy:tod?"#dbeafe":"transparent",
                color:d?(sel_?"white":isWknd?C.link:C.text):"transparent",
                fontWeight:sel_||tod?700:"normal",transition:"background .12s"}}
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
