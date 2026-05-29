import React, { useRef, useEffect } from 'react';
import T from '../core/tokens';
import Ico from '../core/icons/Ico';

function ContextMenu({x,y,pageId,label,favorites,onToggle,onClose}:{x:number;y:number;pageId:string;label:string;favorites:string[];onToggle:(p:string)=>void;onClose:()=>void}) {
  const isFav=favorites.includes(pageId);
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const hM=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))onClose();};
    const hK=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose();};
    document.addEventListener("mousedown",hM);
    document.addEventListener("keydown",hK);
    return()=>{document.removeEventListener("mousedown",hM);document.removeEventListener("keydown",hK);};
  },[onClose]);
  return(
    <div ref={ref} style={{position:"fixed",left:x,top:y,zIndex:300,background:T.white,borderRadius:8,boxShadow:"0 4px 24px rgba(0,0,0,0.16)",border:"1px solid "+T.border,minWidth:216,overflow:"hidden"}}>
      <div style={{padding:"7px 14px 5px",fontSize:10,fontWeight:700,color:T.textDisabled,textTransform:"uppercase",letterSpacing:"0.5px",borderBottom:"1px solid "+T.border}}>{label}</div>
      <div onClick={()=>{onToggle(pageId);onClose();}} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",cursor:"pointer",transition:"background 0.1s"}} onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background="#F8FCFF"} onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background="transparent"}>
        {isFav
          ?<><Ico n="trash" s={14} c={T.error}/><span style={{fontSize:13,color:T.error}}>Rimuovi dai preferiti</span></>
          :<><Ico n="plus" s={14} c={T.primary}/><span style={{fontSize:13,color:T.textActive}}>Aggiungi ai preferiti</span></>
        }
      </div>
    </div>
  );
}

export default ContextMenu;
