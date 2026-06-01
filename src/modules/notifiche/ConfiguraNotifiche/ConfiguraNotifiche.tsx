import MENU from '../../../navigation/menu';
import React, { useState } from 'react';
import T from '../../../core/tokens';
import Ico from '../../../core/icons/Ico';
import BtnBack from '../../../core/components/BtnBack';
import PageHeader from '../../../core/components/PageHeader'
import AlertBanner from '../../../core/components/AlertBanner'
import './ConfiguraNotifiche.sass'

type NotifRow  = {label:string;cn:boolean;email:boolean;scad:boolean;gg:number|null};
type PersonRow = {label:string;mostra:boolean};

const GENERALI_INIT:NotifRow[] = [
  {label:"Richiesta prenotazione extra",   cn:true, email:true, scad:false,gg:null},
  {label:"Scadenza opzione",               cn:true, email:true, scad:true, gg:8},
  {label:"Richiesta acquisto lotti",       cn:true, email:true, scad:true, gg:1},
  {label:"Scadenza contratto",             cn:true, email:true, scad:true, gg:10},
  {label:"Scadenza garanzia contratto",    cn:true, email:true, scad:true, gg:5},
  {label:"Cambio stagionalità",            cn:true, email:true, scad:true, gg:0},
  {label:"Notifica interna estensione",    cn:true, email:true, scad:false,gg:null},
  {label:"Comunicazione Sibylla",          cn:true, email:true, scad:false,gg:0},
  {label:"Richiesta preventivo",           cn:true, email:true, scad:false,gg:0},
  {label:"Sconti e promozioni",            cn:true, email:true, scad:false,gg:0},
  {label:"Comunicazione acquisti di rete", cn:true, email:true, scad:true, gg:0},
  {label:"Ordine di servizio",             cn:false,email:false,scad:false,gg:0},
  {label:"Domande Sspi",                   cn:false,email:false,scad:false,gg:0},
  {label:"Report disponibilità camere",    cn:true, email:false,scad:true, gg:0},
  {label:"Segnalazione presa in carico",   cn:false,email:false,scad:false,gg:0},
  {label:"Segnalazione ripristinata",      cn:false,email:false,scad:false,gg:0},
  {label:"Op. Nuovo incarico assegnato",   cn:false,email:false,scad:true, gg:0},
  {label:"Incarico rimosso",               cn:false,email:false,scad:false,gg:0},
  {label:"Acquisto spazio pubblicitario",  cn:false,email:false,scad:false,gg:0},
  {label:"Gestione portafoglio aziendale", cn:false,email:false,scad:false,gg:0},
  {label:"Distribuzione di rete",          cn:false,email:false,scad:false,gg:0},
  {label:"Storico modifiche prenotazioni", cn:true, email:true, scad:true, gg:0},
];

const PERSON_INIT:PersonRow[] = [
  {label:"Carrello aziendale",           mostra:true},
  {label:"Carrello personale",           mostra:true},
  {label:"Slider panoramica giornaliera",mostra:true},
  {label:"Carrello aziendale",           mostra:true},
  {label:"Carrello personale",           mostra:true},
];

const CARRELLO_INIT:PersonRow[] = [
  {label:"Notifica carrello pieno",mostra:false},
  {label:"Notifica acquisto",      mostra:false},
];

export default function ConfiguraNotifiche({navigate}:{navigate:(p:string)=>void}) {
  const [rows,     setRows]     = useState<NotifRow[]>(GENERALI_INIT.map(r=>({...r})));
  const [person,   setPerson]   = useState<PersonRow[]>(PERSON_INIT.map(r=>({...r})));
  const [carrello, setCarrello] = useState<PersonRow[]>(CARRELLO_INIT.map(r=>({...r})));
  const [saved,    setSaved]    = useState(false);

  const toggle  = (ri:number, field:"cn"|"email"|"scad") =>
    setRows(prev=>prev.map((r,i)=>i===ri?{...r,[field]:!r[field]}:r));
  const setGg   = (ri:number, v:number) =>
    setRows(prev=>prev.map((r,i)=>i===ri?{...r,gg:Math.max(0,v)}:r));
  const toggleP = (arr:PersonRow[], set:React.Dispatch<React.SetStateAction<PersonRow[]>>, ri:number) =>
    set(arr.map((r,i)=>i===ri?{...r,mostra:!r.mostra}:r));

  const handleSave = () => { setSaved(true); setTimeout(()=>setSaved(false),3000); };

  // ── Checkbox ────────────────────────────────────────────────────────────────
  const Chk = ({checked,onChange}:{checked:boolean;onChange:()=>void}) => (
    <div onClick={onChange} className={`cn-chk ${checked?'cn-chk--checked':''}`}>
      {checked && <i className="fa-solid fa-check cn-chk__ico" aria-hidden="true"/>}
    </div>
  );

  // ── Column header ────────────────────────────────────────────────────────────
  const ColHdr = ({label}:{label:string}) => (
    <th className="cn-table__col-hdr">{label}</th>
  );

  // ── Row hover handlers ────────────────────────────────────────────────────────
  const rowHover = {
    onMouseEnter:(e:React.MouseEvent<HTMLTableRowElement>)=>(e.currentTarget.style.background="#F8FCFF"),
    onMouseLeave:(e:React.MouseEvent<HTMLTableRowElement>)=>(e.currentTarget.style.background="transparent"),
  };

  return (
    <div>
      <BtnBack onClick={()=>navigate("centro-notifiche")}/>

      <PageHeader title="Configura notifiche" subtitle="Gestisci le preferenze di ricezione per ogni tipo di notifica"/>

      {saved && <AlertBanner type="success" className="cn-saved-banner">Impostazioni salvate con successo</AlertBanner>}

      {/* ── Two-column layout ─────────────────────────────────────────── */}
      <div className="cn-layout">

        {/* Generali */}
        <div className="cn-card cn-card--generali">
          <div className="cn-card__header">
            <h2 className="cn-card__title">Generali</h2>
          </div>
          <div className="cn-table-scroll">
            <table className="cn-table">
              <thead>
                <tr className="cn-table__head-row">
                  <th className="cn-table__th-label"/>
                  <ColHdr label="Centro notifiche"/>
                  <ColHdr label="E-mail"/>
                  <ColHdr label="Scadenzario"/>
                  <ColHdr label="Preavviso gg"/>
                </tr>
              </thead>
              <tbody>
                {rows.map((r,ri)=>(
                  <tr key={ri} className={`cn-table__row ${ri<rows.length-1?'cn-table__row--border':''}`} {...rowHover}>
                    <td className="cn-table__td-label">{r.label}</td>
                    <td className="cn-table__td-center">
                      <div className="cn-table__chk-wrap"><Chk checked={r.cn} onChange={()=>toggle(ri,"cn")}/></div>
                    </td>
                    <td className="cn-table__td-center">
                      <div className="cn-table__chk-wrap"><Chk checked={r.email} onChange={()=>toggle(ri,"email")}/></div>
                    </td>
                    <td className="cn-table__td-center">
                      <div className="cn-table__chk-wrap"><Chk checked={r.scad} onChange={()=>toggle(ri,"scad")}/></div>
                    </td>
                    <td className="cn-table__td-center cn-table__td-gg">
                      {r.gg !== null ? (
                        <div className="cn-spinner">
                          <input
                            type="number" value={r.gg} min={0}
                            onChange={e=>setGg(ri,parseInt(e.target.value)||0)}
                            className="sib-input sib-input--dense cn-spinner__input"
                          />
                          <div className="cn-spinner__btns">
                            <button onClick={()=>setGg(ri,(r.gg??0)+1)} className="cn-spinner__btn cn-spinner__btn--up">
                              <i className="fa-solid fa-chevron-up cn-spinner__chevron" aria-hidden="true"/>
                            </button>
                            <button onClick={()=>setGg(ri,Math.max(0,(r.gg??0)-1))} className="cn-spinner__btn cn-spinner__btn--down">
                              <i className="fa-solid fa-chevron-down cn-spinner__chevron" aria-hidden="true"/>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="cn-spinner__dash">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div className="cn-right-col">

          {/* Personalizzazioni */}
          <div className="cn-card">
            <div className="cn-card__header">
              <h2 className="cn-card__title">Personalizzazioni</h2>
            </div>
            <table className="cn-table">
              <thead>
                <tr className="cn-table__head-row">
                  <th className="cn-table__th-label"/>
                  <th className="cn-table__col-hdr cn-table__col-hdr--right">Mostra</th>
                </tr>
              </thead>
              <tbody>
                {person.map((r,ri)=>(
                  <tr key={ri} className={`cn-table__row ${ri<person.length-1?'cn-table__row--border':''}`} {...rowHover}>
                    <td className="cn-table__td-label cn-table__td-label--pad">{r.label}</td>
                    <td className="cn-table__td-right">
                      <div className="cn-table__chk-wrap cn-table__chk-wrap--right">
                        <Chk checked={r.mostra} onChange={()=>toggleP(person,setPerson,ri)}/>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Carrello */}
          <div className="cn-card">
            <div className="cn-card__header">
              <h2 className="cn-card__title">Carrello</h2>
            </div>
            <table className="cn-table">
              <thead>
                <tr className="cn-table__head-row">
                  <th className="cn-table__th-label"/>
                  <th className="cn-table__col-hdr cn-table__col-hdr--right">Mostra</th>
                </tr>
              </thead>
              <tbody>
                {carrello.map((r,ri)=>(
                  <tr key={ri} className={`cn-table__row ${ri<carrello.length-1?'cn-table__row--border':''}`} {...rowHover}>
                    <td className="cn-table__td-label cn-table__td-label--pad">{r.label}</td>
                    <td className="cn-table__td-right">
                      <div className="cn-table__chk-wrap cn-table__chk-wrap--right">
                        <Chk checked={r.mostra} onChange={()=>toggleP(carrello,setCarrello,ri)}/>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="cn-footer">
        <button
          onClick={()=>navigate("centro-notifiche")}
          className="cn-footer__cancel"
          onMouseEnter={e=>(e.currentTarget.style.borderColor=T.primary)}
          onMouseLeave={e=>(e.currentTarget.style.borderColor=T.border)}
        >
          Annulla
        </button>
        <button
          onClick={handleSave}
          className="cn-footer__save"
          onMouseEnter={e=>(e.currentTarget.style.background=T.primary800)}
          onMouseLeave={e=>(e.currentTarget.style.background=T.primary)}
        >
          <Ico n="check" s={13} c="#fff"/> Salva
        </button>
      </div>
    </div>
  );
}
