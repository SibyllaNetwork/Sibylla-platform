import React from 'react';
import T from '../core/tokens';
import Ico from '../core/icons/Ico';

export default function GenericPage({item,page,modColor,navigate}:any) {
  const label=item?.label??page;
  return (
    <div>
      <div style={{marginBottom:22}}>
        <h1 style={{margin:0,fontFamily:"Poppins,sans-serif",fontSize:24,fontWeight:600,color:T.primary}}>{label}</h1>
        <p style={{margin:"4px 0 0",fontSize:13,color:T.textInactive}}>Hotel Noto — Sibylla Platform</p>
      </div>
      <div style={{background:T.white,borderRadius:12,border:"1px solid "+T.border,padding:48,textAlign:"center"}}>
        <div style={{width:52,height:52,borderRadius:14,background:(modColor||T.blue)+"18",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
          <div style={{width:14,height:14,borderRadius:"50%",background:modColor||T.blue}}/>
        </div>
        <h2 style={{fontFamily:"Poppins,sans-serif",fontSize:18,fontWeight:600,color:T.primary,margin:"0 0 8px"}}>{label}</h2>
        <p style={{fontSize:13,color:T.textInactive,margin:"0 0 24px"}}>Questa pagina sarà sviluppata nel prossimo sprint.</p>
        <button onClick={()=>navigate("home")} style={{background:"transparent",border:"1px solid "+T.border,borderRadius:8,padding:"8px 20px",fontSize:13,color:T.textInactive,cursor:"pointer"}}
          onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background=T.white;(e.currentTarget as HTMLButtonElement).style.color=T.primary;(e.currentTarget as HTMLButtonElement).style.borderColor=T.primary;}}
          onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background="transparent";(e.currentTarget as HTMLButtonElement).style.color=T.textInactive;(e.currentTarget as HTMLButtonElement).style.borderColor=T.border;}}>
          ← Torna alla home
        </button>
      </div>
    </div>
  );
}
