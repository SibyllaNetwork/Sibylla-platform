import React, { useState, useRef, useEffect } from 'react';
import T from '../core/tokens';
import Ico from '../core/icons/Ico';
import { useOrgStore } from '../store/useOrgStore';

function AvatarMenu({navigate}:{navigate:(p:string)=>void}) {
  const [open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  const activeStruttura = useOrgStore(s => s.activeStruttura);
  useEffect(()=>{const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  return (
    <div ref={ref} style={{position:"relative"}}>
      <button onClick={()=>setOpen(v=>!v)} style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:22,padding:"4px 10px 4px 4px",cursor:"pointer"}} onMouseEnter={e=>(e.currentTarget as HTMLButtonElement).style.background="rgba(255,255,255,0.12)"} onMouseLeave={e=>(e.currentTarget as HTMLButtonElement).style.background="rgba(255,255,255,0.07)"}>
        <div style={{width:28,height:28,borderRadius:"50%",background:T.blue,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff"}}>LH</div>
        <span style={{fontSize:12,color:"rgba(255,255,255,0.7)",fontFamily:"Poppins,sans-serif"}}>Luca H.</span>
        <Ico n="chevd" s={10} c="rgba(255,255,255,0.4)"/>
      </button>
      {open&&<div style={{position:"absolute",right:0,top:"calc(100% + 8px)",width:200,background:T.white,borderRadius:12,boxShadow:"0 8px 32px rgba(32,71,105,0.15)",border:"0.5px solid "+T.border,overflow:"hidden",zIndex:50}}>
        <div style={{padding:"10px 14px",borderBottom:"0.5px solid "+T.border}}><div style={{fontSize:12,fontWeight:600,color:T.primary}}>Luca H.</div><div style={{fontSize:11,color:T.textDisabled}}>{activeStruttura}</div></div>
        {[{icon:"user",label:"Il mio profilo",page:"modifica-profilo",danger:false},{icon:"gear",label:"Impostazioni",page:"crea-struttura",danger:false},{icon:"logout",label:"Esci",page:null,danger:true}].map((item,i)=>(
          <div key={i} onClick={()=>{setOpen(false);if(item.page)navigate(item.page);}} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",cursor:"pointer",color:item.danger?T.error:T.textActive,borderTop:i===2?"0.5px solid "+T.border:"none"}} onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background=item.danger?T.errorLight:"#F8FCFF"} onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background="transparent"}>
            <Ico n={item.icon} s={15} c={item.danger?T.error:T.textInactive}/><span style={{fontSize:13}}>{item.label}</span>
          </div>
        ))}
      </div>}
    </div>
  );
}

export default AvatarMenu;
