import React, { useState } from 'react';
import T from '../../../core/tokens';
import Ico from '../../../core/icons/Ico';
import BtnBack from '../../../core/components/BtnBack';
import GaugeArc from '../../../core/components/GaugeArc';
import PageHeader from '../../../core/components/PageHeader';
import AnalisiBadge from '../../../core/components/AnalisiBadge';
import { SelectField, DateRangeField } from '../../../core/components/form'
import './AnalisiDistribuzione.sass'

export default function AnalisiDistribuzione({navigate}:{navigate:(p:string)=>void}) {
  const [struttura,    setStruttura]    = useState("Hotel Archimede");
  const [dateFrom,     setDateFrom]     = useState("2026-04-03");
  const [dateTo,       setDateTo]       = useState("2026-10-29");
  const [stagionalita, setStagionalita] = useState<"individuale"|"gruppo">("individuale");
  const [expanded,     setExpanded]     = useState<Set<number>>(new Set());
  const toggle = (i:number) => setExpanded(p=>{const n=new Set(p);n.has(i)?n.delete(i):n.add(i);return n;});

  // ── MeteoCell ───────────────────────────────────────────────────────────────
  const METEO_ICO: Record<string,string> = {
    sunny: 'fa-sun', cloudy: 'fa-cloud', rainy: 'fa-cloud-rain', partly: 'fa-cloud-sun',
  };
  const METEO_COL: Record<string,string> = {
    sunny: '#F57D03', cloudy: '#8399ab', rainy: '#5C9CD4', partly: '#8399ab',
  };
  const MeteoCell = ({type,temp="",size=15}:{type:string;temp?:string;size?:number}) => {
    const col = METEO_COL[type] || T.textInactive;
    const ico = METEO_ICO[type] || 'fa-circle';
    return (
      <div className="analisi__meteo-cell">
        <i className={`fa-duotone ${ico} analisi__meteo-ico`} style={{'--meteo-size':`${size}px`, '--meteo-col':col} as React.CSSProperties} aria-hidden="true"/>
        {temp && <span className="analisi__meteo-temp" style={{'--meteo-col':col} as React.CSSProperties}>{temp}</span>}
      </div>
    );
  };

  // ── EvIco ───────────────────────────────────────────────────────────────────
  const EV_ICO: Record<string,string> = {
    sports: 'fa-futbol', culture: 'fa-masks-theater', music: 'fa-music',
  };
  const EV_COL: Record<string,string> = {
    sports: '#5C9CD4', culture: '#9B59B6', music: '#E07B39',
  };
  const EvIco = ({type}:{type:string}) => {
    const col = EV_COL[type] || T.textDisabled;
    const ico = EV_ICO[type] || 'fa-calendar';
    return <i className={`fa-duotone ${ico} analisi__ev-ico`} style={{'--ev-col':col} as React.CSSProperties} aria-hidden="true"/>;
  };

  // ── TH / TD ─────────────────────────────────────────────────────────────────
  const TH = ({ch,align="left",colSpan=1,last=false}:{ch?:React.ReactNode;align?:string;colSpan?:number;last?:boolean}) => (
    <th colSpan={colSpan} className={`analisi__th ${last?'analisi__th--last':''}`} style={{'--cell-align':align} as React.CSSProperties}>{ch}</th>
  );
  const TD = ({ch,align="left",last=false,className=""}:{ch?:React.ReactNode;align?:string;last?:boolean;className?:string}) => (
    <td className={`analisi__td ${last?'analisi__td--last':''} ${className}`} style={{'--cell-align':align} as React.CSSProperties}>{ch}</td>
  );

  const PKL   = ["1d","7d","30d","60d","90d"];
  const NCOLS = 20;

  type Ev  = {name:string;addr:string;time?:string};
  type Row = {date:string;evType:string;eventi:Ev[];market:string;meteo:{type:string;city:string;temp:string;desc:string};stag:string;occ:string;pct:string;rev:string;adr:string;pickup:number[];analisi:{type:"warning"|"success";text:string};cam:string;disp:number;dispTrend:"up"|"down";sug:number;comp:string;pickupNote?:string};

  const rows:Row[] = [
    {date:"11/06/2023",evType:"sports",eventi:[{name:"Finale Champions League",addr:"Stadio Olimpico, Roma",time:"20:30"}],market:"very-high",meteo:{type:"sunny",city:"Roma",temp:"24°",desc:"Soleggiato, vento 15 km/h"},stag:"Bassa Stagione",occ:"high",pct:"84,3%",rev:"15.111,28",adr:"123,86",pickup:[2,9,11,1,0],analisi:{type:"success",text:"Aumento consigliato"},cam:"143,54 €",disp:15,dispTrend:"up",sug:0,comp:"10%"},
    {date:"21/09/2023",evType:"culture",eventi:[{name:"Mostra Arte Contemporanea",addr:"Palazzo delle Esposizioni",time:"10:00–20:00"}],market:"very-high",meteo:{type:"cloudy",city:"Roma",temp:"19°",desc:"Nuvoloso, umidità 66%"},stag:"Bassa Stagione",occ:"low",pct:"56,3%",rev:"21.111,28",adr:"223,86",pickup:[5,33,2,4,2],analisi:{type:"warning",text:"Verificare Fattori Esterni"},cam:"143,54 €",disp:36,dispTrend:"down",sug:0,comp:"10%"},
    {date:"21/09/2023",evType:"music",eventi:[{name:"Festival Jazz Roma",addr:"Piazza Navona",time:"21:00"}],market:"low",meteo:{type:"sunny",city:"Roma",temp:"22°",desc:"Soleggiato, sereno"},stag:"Bassa Stagione",occ:"middle",pct:"16,8%",rev:"12.171,78",adr:"554,86",pickup:[0,56,6,7,5],analisi:{type:"success",text:"Aumento consigliato"},cam:"143,54 €",disp:66,dispTrend:"down",sug:0,comp:"10%"},
    {date:"21/09/2023",evType:"sports",eventi:[{name:"Finale di Champions league",addr:"Stadio Olimpico",time:"20:30"},{name:"Sezze – Frascati",addr:"",time:""}],market:"middle",meteo:{type:"rainy",city:"Roma",temp:"17°",desc:"Precipitazioni 70%, umidità 66%, vento 18 km/h"},stag:"Bassa Stagione",occ:"very-high",pct:"6,3%",rev:"41.111,28",adr:"423,86",pickup:[9,99,8,5,55],analisi:{type:"success",text:"Aumento consigliato"},cam:"143,54 €",disp:18,dispTrend:"up",sug:0,comp:"10%",pickupNote:"È sconsigliato un aumento dei prezzi"},
    {date:"11/06/2023",evType:"sports",eventi:[{name:"Coppa Italia – Semifinale",addr:"Stadio Olimpico",time:"19:00"}],market:"very-high",meteo:{type:"partly",city:"Roma",temp:"21°",desc:"Parzialmente nuvoloso, umidità 55%"},stag:"Alta Stagione",occ:"very-high",pct:"84,3%",rev:"15.111,28",adr:"123,86",pickup:[2,9,11,1,0],analisi:{type:"success",text:"Aumento consigliato"},cam:"143,54 €",disp:15,dispTrend:"up",sug:0,comp:"10%"},
    {date:"21/09/2023",evType:"culture",eventi:[{name:"Teatro dell'Opera – Stagione",addr:"Teatro dell'Opera di Roma",time:"20:00"}],market:"very-high",meteo:{type:"cloudy",city:"Roma",temp:"18°",desc:"Nuvoloso, vento leggero"},stag:"Alta Stagione",occ:"very-high",pct:"56,3%",rev:"21.111,28",adr:"223,86",pickup:[5,33,2,4,2],analisi:{type:"warning",text:"Verificare Fattori Esterni"},cam:"143,54 €",disp:36,dispTrend:"down",sug:0,comp:"10%"},
    {date:"21/09/2023",evType:"music",eventi:[{name:"Roma Creativa – Concerto",addr:"Auditorium Parco della Musica",time:"21:30"}],market:"very-high",meteo:{type:"sunny",city:"Roma",temp:"20°",desc:"Sereno e soleggiato"},stag:"Alta Stagione",occ:"very-high",pct:"16,8%",rev:"12.171,78",adr:"554,86",pickup:[0,56,6,7,5],analisi:{type:"success",text:"Aumento consigliato"},cam:"143,54 €",disp:66,dispTrend:"down",sug:0,comp:"10%"},
  ];

  return (
    <div>
      <BtnBack onClick={()=>navigate("home")}/>

      <PageHeader title="Analisi della distribuzione" subtitle="Esplorazione analitica della distribuzione basata su dati granulari e KPI strategici per guidare decisioni mirate" className="analisi__page-title"/>

      {/* ── Filter bar ──────────────────────────────────────────────────── */}

<div className="analisi__filter-bar">
        <div className="analisi__filter-group">
          <SelectField
            name="struttura"
            label="Struttura"
            value={struttura}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStruttura(e.target.value)}
            options={["Hotel Archimede","Hotel Noto","Grand Hotel Roma"].map(s => ({ value: s, label: s }))}
            className="w-36"
          />
        </div>
        <div className="analisi__filter-group">
          <DateRangeField
            nameFrom="dateFrom"
            nameTo="dateTo"
            label="Periodo"
            valueFrom={dateFrom}
            valueTo={dateTo}
            onChangeFrom={(e: React.ChangeEvent<HTMLInputElement>) => setDateFrom(e.target.value)}
            onChangeTo={(e: React.ChangeEvent<HTMLInputElement>) => setDateTo(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold font-opensans text-ink">Stagionalità</span>
          <div className="flex items-center gap-4 h-9">
            {(["individuale","gruppo"] as const).map(s=>(
              <label key={s} className="analisi__radio-label">
                <input type="radio" name="stag-dist-v2" checked={stagionalita===s} onChange={()=>setStagionalita(s)} className="sib-radio"/>
                {s.charAt(0).toUpperCase()+s.slice(1)}
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold font-opensans text-ink">&nbsp;</span>
          <div className="flex items-center gap-2 h-9">
            <button className="analisi__filter-btn">
              <Ico n="refresh" s={13} c="currentColor"/> Pickup
            </button>
            <div className="analisi__filter-chip">
              <Ico n="calendar" s={13} c={T.textDisabled}/>0
            </div>
            <div className="analisi__filter-chip">
              <Ico n="info" s={13} c={T.textDisabled}/>0,00 €
            </div>
            {["image","upload"].map((ic,i)=>(
              <button key={i} className="analisi__icon-btn">
                <Ico n={ic} s={13} c={T.textInactive}/>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1 ml-auto">
          <span className="text-[11px] font-semibold font-opensans text-ink">&nbsp;</span>
          <div className="flex items-center gap-2 h-9">
            {["user","bar","alert"].map((ic,i)=>(
              <button key={i} className="analisi__icon-btn">
                <Ico n={ic} s={13} c={T.textInactive}/>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="analisi__table-wrap">
        <div className="analisi__table-scroll">
          <table className="analisi__table">
            <thead>
              <tr>
                <TH/>
                <TH ch="Data"/>
                <TH ch="Evento" align="center"/>
                <TH ch="Mercato" align="center"/>
                <TH ch="Meteo" align="center"/>
                <TH ch="Stagionalità"/>
                <TH ch="Occ." align="center"/>
                <TH ch="%" align="right"/>
                <TH ch="Revenue" align="right"/>
                <TH ch="ADR" align="right"/>
                {PKL.map(l=><TH key={l} ch={l} align="center"/>)}
                <TH ch="Analisi"/>
                <TH ch="CAM" align="right"/>
                <TH ch="Disp." align="center"/>
                <TH ch="Sug." align="center"/>
                <TH ch="Comp." align="center" last/>
              </tr>
            </thead>
            <tbody>
              {rows.map((row,i)=>{
                const isExp = expanded.has(i);
                const bg    = isExp ? "#F0F7FF" : "transparent";
                return (
                  <React.Fragment key={i}>
                    <tr
                      className="analisi__row"
                      style={{'--row-bg':bg} as React.CSSProperties}
                      onMouseEnter={e=>{if(!isExp)(e.currentTarget as HTMLTableRowElement).style.background="#F8FCFF";}}
                      onMouseLeave={e=>{(e.currentTarget as HTMLTableRowElement).style.background=bg;}}
                    >
                      <TD ch={
                        <button onClick={()=>toggle(i)} className={`analisi__expand-btn ${isExp?'analisi__expand-btn--open':''}`}>
                          <Ico n="chevd" s={11} c={T.primary}/>
                        </button>
                      }/>
                      <TD ch={<span className="analisi__date-cell">{row.date}</span>}/>
                      <TD align="center" ch={<EvIco type={row.evType}/>}/>
                      <TD align="center" ch={<GaugeArc level={row.market}/>}/>
                      <TD align="center" ch={<MeteoCell type={row.meteo.type} temp={row.meteo.temp}/>}/>
                      <TD ch={<span className="analisi__stag-badge">{row.stag}</span>}/>
                      <TD align="center" ch={<GaugeArc level={row.occ}/>}/>
                      <TD align="right" ch={<span className="analisi__pct-val">{row.pct}</span>}/>
                      <TD align="right" ch={<span className="analisi__rev-val">{row.rev}</span>}/>
                      <TD align="right" className="analisi__td--sm" ch={row.adr}/>
                      {row.pickup.map((n,j)=>(
                        <TD key={j} align="center" ch={
                          <span className={`analisi__pickup-cell ${n>0?'analisi__pickup-cell--active':''}`}>{n}</span>
                        }/>
                      ))}
                      <TD ch={<AnalisiBadge type={row.analisi.type} text={row.analisi.text}/>}/>
                      <TD align="right" className="analisi__td--sm" ch={row.cam}/>
                      <TD align="center" ch={
                        <div className="analisi__disp-cell">
                          <span className="analisi__disp-num">{row.disp}</span>
                          <i className="fa-duotone fa-bed analisi__disp-bed" aria-hidden="true"/>
                          <i
                            className={`fa-duotone ${row.dispTrend==='up'?'fa-arrow-trend-up':'fa-arrow-trend-down'} analisi__disp-trend analisi__disp-trend--${row.dispTrend}`}
                            aria-hidden="true"
                          />
                        </div>
                      }/>
                      <TD align="center" className="analisi__td--sm" ch={row.sug}/>
                      <TD align="center" last className="analisi__td--sm analisi__td--inactive" ch={row.comp}/>
                    </tr>

                    {isExp && (
                      <tr>
                        <td colSpan={NCOLS} className="analisi__exp-row">
                          <div className="analisi__exp-grid">

                            {/* Eventi */}
                            <div className="analisi__exp-col analisi__exp-col--border">
                              <div className="analisi__exp-label">Data di riferimento: {row.date}</div>
                              {row.eventi.filter(e=>e.name).map((ev,j)=>(
                                <div key={j} className={j<row.eventi.length-1?'analisi__event--mb':''}>
                                  <div className="analisi__event-name">{ev.name}</div>
                                  {ev.addr && <div className="analisi__event-addr">{ev.addr}</div>}
                                  {ev.time && (
                                    <div className="analisi__event-time">
                                      <Ico n="clock" s={9} c={T.textDisabled}/> {ev.time}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Meteo */}
                            <div className="analisi__exp-col analisi__exp-col--border">
                              <div className="analisi__exp-label">Meteo</div>
                              <div className="analisi__meteo-row">
                                <MeteoCell type={row.meteo.type} size={26}/>
                                <div>
                                  <div className="analisi__meteo-city">{row.meteo.city}</div>
                                  <div className="analisi__meteo-big-temp">{row.meteo.temp}</div>
                                </div>
                              </div>
                              <p className="analisi__meteo-desc">{row.meteo.desc}</p>
                            </div>

                            {/* Riepilogo */}
                            <div className="analisi__exp-col analisi__exp-col--border">
                              <div className="analisi__exp-label">Riepilogo</div>
                              {([{label:"%",val:row.pct,c:T.textActive},{label:"Revenue",val:row.rev+" €",c:T.success},{label:"ADR",val:row.adr+" €",c:T.primary}] as {label:string;val:string;c:string}[]).map(item=>(
                                <div key={item.label} className="analisi__kpi-item">
                                  <div className="analisi__kpi-label">{item.label}</div>
                                  <div className="analisi__kpi-val" style={{'--kpi-col':item.c} as React.CSSProperties}>{item.val}</div>
                                </div>
                              ))}
                            </div>

                            {/* Pickup */}
                            <div className="analisi__exp-col">
                              <div className="analisi__exp-label">Pickup</div>
                              <div className="analisi__pickup-row">
                                {PKL.map((lbl,j)=>(
                                  <div key={j} className="analisi__pickup-item">
                                    <div className="analisi__pickup-item-lbl">{lbl}</div>
                                    <div className={`analisi__pickup-item-val ${row.pickup[j]>0?'analisi__pickup-item-val--active':''}`}>{row.pickup[j]}</div>
                                  </div>
                                ))}
                              </div>
                              {row.pickupNote && (
                                <div className="analisi__pickup-note">
                                  <Ico n="alert" s={11} c={T.warning}/>
                                  <span className="analisi__pickup-note-text">{row.pickupNote}</span>
                                </div>
                              )}
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
