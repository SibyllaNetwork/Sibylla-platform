import { useState } from "react";

// -- Sibylla Design System Tokens ---------------------------------------------
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
const var_radius_lg = "12px";

// -- Toast --------------------------------------------------------------------
export function Toast({ msg, type, onClose }) {
  if (!msg) return null;
  const ok = type !== "error";
  return (
    <div style={{position:"fixed",top:20,right:20,zIndex:9999,
      background:ok?"#E4F8EE":"#FFEAEF",
      border:"1px solid " + (ok ? "#00CF86" : "#FF616F") + "",
      borderRadius:10,padding:"12px 18px",
      color:ok?"#007035":"#D10011",
      fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:10,
      boxShadow:"0 8px 24px rgba(32,71,105,.18)",
      fontFamily:"'Open Sans',sans-serif"}}>
      <span style={{fontSize:16}}>{ok?"✓":"✕"}</span>{msg}
      <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"inherit",fontSize:18,marginLeft:4,lineHeight:1}}>×</button>
    </div>
  );
}

// -- Modal --------------------------------------------------------------------
export function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(32,71,105,.45)",zIndex:1000,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
      onClick={onClose}>
      <div style={{background:C.bgCard,borderRadius:15,width:"100%",maxWidth:wide?840:560,
        maxHeight:"92vh",overflow:"auto",boxShadow:"0 24px 64px rgba(32,71,105,.25)"}}
        onClick={e=>e.stopPropagation()}>
        {/* Modal header — primary bg */}
        <div style={{padding:"16px 22px",background:C.navy,borderRadius:"15px 15px 0 0",
          display:"flex",alignItems:"center",justifyContent:"space-between",
          position:"sticky",top:0,zIndex:1}}>
          <span style={{fontWeight:700,fontSize:15,color:"white",fontFamily:"'Poppins',sans-serif"}}>{title}</span>
          <button onClick={onClose} style={{background:"rgba(255,255,255,.15)",border:"none",
            cursor:"pointer",fontSize:16,color:"white",lineHeight:1,
            width:28,height:28,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        <div style={{padding:22}}>{children}</div>
      </div>
    </div>
  );
}

// -- Field --------------------------------------------------------------------
export function Field({ label, required, children, half }) {
  return (
    <div style={{marginBottom:14,width:half?"calc(50% - 6px)":"100%",flexShrink:0}}>
      <label style={{display:"block",fontSize:12,fontWeight:600,
        color:C.text,marginBottom:5,fontFamily:"'Open Sans',sans-serif"}}>
        {label}{required&&<span style={{color:C.red,marginLeft:2}}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputBase = {
  width:"100%",border:`2px solid ${C.border}`,borderRadius:6,
  padding:"8px 12px",fontSize:14,boxSizing:"border-box",
  outline:"none",background:C.bgCard,color:C.text,
  transition:"border-color .15s",height:40,
  fontFamily:"'Open Sans',sans-serif",
};

export function Input({ value, onChange, type="text", placeholder, min, step, disabled }) {
  return <input value={value??""} onChange={e=>onChange(e.target.value)}
    type={type} placeholder={placeholder} min={min} step={step} disabled={disabled}
    style={{...inputBase,opacity:disabled?.6:1}}
    onFocus={e=>e.target.style.borderColor=C.link}
    onBlur={e=>e.target.style.borderColor=C.border}/>;
}

export function Textarea({ value, onChange, rows=3, placeholder }) {
  return <textarea value={value??""} onChange={e=>onChange(e.target.value)}
    rows={rows} placeholder={placeholder}
    style={{...inputBase,resize:"vertical",height:"auto"}}
    onFocus={e=>e.target.style.borderColor=C.link}
    onBlur={e=>e.target.style.borderColor=C.border}/>;
}

export function Select({ value, onChange, children, placeholder }) {
  return <select value={value??""} onChange={e=>onChange(e.target.value)}
    style={{...inputBase,cursor:"pointer"}}
    onFocus={e=>e.target.style.borderColor=C.link}
    onBlur={e=>e.target.style.borderColor=C.border}>
    {placeholder&&<option value="">{placeholder}</option>}
    {children}
  </select>;
}

// -- Btn — Sibylla button system -----------------------------------------------
export function Btn({ children, onClick, variant="primary", type="button", disabled, small, icon }) {
  const styles = {
    primary:   { background:C.navy,  color:"white",  border:`1.5px solid ${C.navy}` },
    secondary: { background:"transparent", color:C.navy, border:`2px solid ${C.navy}` },
    danger:    { background:"#FFEAEF", color:C.red,  border:`1.5px solid #FF616F` },
    ghost:     { background:"transparent", color:C.muted, border:"1.5px solid transparent" },
    outline:   { background:"transparent", color:C.link, border:`1.5px solid ${C.border}` },
  };
  const base = styles[variant] || styles.primary;
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{...base, borderRadius:6,
        padding: small ? "5px 14px" : "8px 24px",
        fontSize: small ? 11 : 14,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? .5 : 1,
        display: "inline-flex", alignItems:"center", gap:6,
        transition:"all .15s", whiteSpace:"nowrap",
        fontFamily:"'Open Sans',sans-serif",
        minWidth: small ? 80 : 120,
      }}
      onMouseEnter={e=>{ if(!disabled){ e.currentTarget.style.opacity=".85"; e.currentTarget.style.transform="translateY(-1px)"; }}}
      onMouseLeave={e=>{ e.currentTarget.style.opacity="1"; e.currentTarget.style.transform="none"; }}>
      {icon&&<span style={{fontSize:14}}>{icon}</span>}{children}
    </button>
  );
}

// -- PillBtn -------------------------------------------------------------------
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

// -- DataTable -----------------------------------------------------------------
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
      <div style={{fontSize:36,marginBottom:10}}>📭</div>{emptyMsg}
    </div>
  );
  return (
    <div style={{overflowX:"auto",borderRadius:var_radius_lg,border:`1px solid ${C.borderL}`,boxShadow:shadow}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead>
          <tr style={{background:C.navy}}>
            {cols.map(c=>(
              <th key={c.key} style={{padding:"12px 16px",textAlign:"left",
                fontWeight:700,color:"white",whiteSpace:"nowrap",
                fontSize:11,textTransform:"uppercase",letterSpacing:.6,
                fontFamily:"'Open Sans',sans-serif"}}>
                {c.label}
              </th>
            ))}
            {(onEdit||onDelete)&&<th style={{padding:"12px 16px",width:90,color:"white",fontSize:11,textTransform:"uppercase",letterSpacing:.6}}>Azioni</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row,i)=>(
            <tr key={row.id||i}
              style={{borderBottom:"1px solid " + C.borderL, background:i%2?"#f8fcff":"white",transition:"background .1s"}}
              onMouseEnter={e=>e.currentTarget.style.background="#e6eef5"}
              onMouseLeave={e=>e.currentTarget.style.background=i%2?"#f8fcff":"white"}>
              {cols.map(c=>(
                <td key={c.key} style={{padding:"11px 16px",color:C.text,verticalAlign:"middle"}}>
                  {c.render?c.render(row[c.key],row):(row[c.key]??"-")}
                </td>
              ))}
              {(onEdit||onDelete)&&(
                <td style={{padding:"8px 16px"}}>
                  <div style={{display:"flex",gap:4}}>
                    {onEdit&&<Btn small variant="outline" onClick={()=>onEdit(row)}>✏</Btn>}
                    {onDelete&&<Btn small variant="danger" onClick={()=>onDelete(row)}>🗑</Btn>}
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
// -- PageHeader ----------------------------------------------------------------
export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{marginBottom:0}}>
      {/* Title bar — Sibylla style: full width with primary color title */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"0 0 16px",borderBottom:`1px solid ${C.borderL}`,marginBottom:20,
        flexWrap:"wrap",gap:12}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:600,color:C.navy,margin:0,
            fontFamily:"'Poppins',sans-serif",lineHeight:"30px"}}>{title}</h1>
          {subtitle&&<p style={{fontSize:13,color:C.muted,margin:"4px 0 0",fontFamily:"'Open Sans',sans-serif"}}>{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

// -- Card ----------------------------------------------------------------------
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

// -- Badge ---------------------------------------------------------------------
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

// -- StatCard ------------------------------------------------------------------
export function StatCard({ value, label, color, icon }) {
  return (
    <div style={{background:C.bgCard,borderRadius:15,border:`1px solid ${C.borderL}`,
      padding:"18px 20px",boxShadow:shadow}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <span style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",
          letterSpacing:.6,fontFamily:"'Open Sans',sans-serif"}}>{label}</span>
        {icon&&<span style={{fontSize:20}}>{icon}</span>}
      </div>
      <div style={{fontSize:26,fontWeight:700,color:color||C.navy,
        fontFamily:"'Poppins',sans-serif"}}>{value}</div>
    </div>
  );
}

export function FormRow({ children }) {
  return <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>{children}</div>;
}

// -- useConfirm ----------------------------------------------------------------
export function useConfirm() {
  const [state, setState] = useState(null);
  const confirm = (msg, onOk) => setState({ msg, onOk });
  const Dialog = () => state ? (
    <div style={{position:"fixed",inset:0,background:"rgba(32,71,105,.45)",zIndex:2000,
      display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:C.bgCard,borderRadius:15,overflow:"hidden",maxWidth:400,width:"100%",
        boxShadow:"0 16px 48px rgba(32,71,105,.2)"}}>
        <div style={{background:C.navy,padding:"14px 20px"}}>
          <span style={{color:"white",fontWeight:700,fontSize:15,fontFamily:"'Poppins',sans-serif"}}>Conferma</span>
        </div>
        <div style={{padding:24}}>
          <div style={{fontSize:18,marginBottom:10}}>⚠️</div>
          <p style={{fontSize:14,color:C.text,marginBottom:22,lineHeight:1.6}}>{state.msg}</p>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn variant="secondary" onClick={()=>setState(null)}>Annulla</Btn>
            <Btn variant="danger" onClick={()=>{state.onOk();setState(null);}}>Elimina</Btn>
          </div>
        </div>
      </div>
    </div>
  ) : null;
  return { confirm, Dialog };
}

// -- useToast ------------------------------------------------------------------
export function useToast() {
  const [t, setT] = useState(null);
  const toast = (msg, type="success") => { setT({msg,type}); setTimeout(()=>setT(null),3500); };
  const ToastEl = () => t ? <Toast msg={t.msg} type={t.type} onClose={()=>setT(null)}/> : null;
  return { toast, ToastEl };
}

// -- MiniCalendar --------------------------------------------------------------
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
            display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
        <span style={{fontSize:12,fontWeight:700,color:C.navy}}>{MONTHS_CAL[mo]} {yr}</span>
        <button onClick={()=>setView(new Date(yr,mo+1,1))}
          style={{background:"none",border:`1px solid ${C.borderL}`,borderRadius:6,
            width:24,height:24,cursor:"pointer",fontSize:13,color:C.muted,
            display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
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
