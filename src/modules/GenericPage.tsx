import React from 'react';
import T from '../core/tokens';
import './GenericPage.sass';

export default function GenericPage({item,page,modColor,navigate}:any) {
  const label=item?.label??page;
  const modVars = { '--mod-color': modColor || T.blue } as React.CSSProperties;
  return (
    <div>
      <div className="generic-page__header">
        <h1 className="generic-page__title">{label}</h1>
        <p className="generic-page__sub">Hotel Noto — Sibylla Platform</p>
      </div>
      <div className="generic-page__card">
        <div className="generic-page__icon" style={modVars}>
          <div className="generic-page__dot" style={modVars}/>
        </div>
        <h2 className="generic-page__card-title">{label}</h2>
        <p className="generic-page__card-text">Questa pagina sarà sviluppata nel prossimo sprint.</p>
        <button onClick={()=>navigate("home")} className="generic-page__back"
          onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background=T.white;(e.currentTarget as HTMLButtonElement).style.color=T.primary;(e.currentTarget as HTMLButtonElement).style.borderColor=T.primary;}}
          onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background="transparent";(e.currentTarget as HTMLButtonElement).style.color=T.textInactive;(e.currentTarget as HTMLButtonElement).style.borderColor=T.border;}}>
          ← Torna alla home
        </button>
      </div>
    </div>
  );
}
