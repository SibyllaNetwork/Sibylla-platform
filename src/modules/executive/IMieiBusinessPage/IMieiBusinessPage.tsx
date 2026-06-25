import React, { useState } from 'react';
import clsx from 'clsx';
import T from '../../../core/tokens';
import Ico from '../../../core/icons/Ico';
import MenuIco from '../../../core/icons/MenuIco';
import BtnBack from '../../../core/components/BtnBack';
import PageHeader from '../../../core/components/PageHeader';
import './IMieiBusinessPage.sass'

// Previsione di crescita per struttura (moltiplicatore sui ricavi attesi per la
// data futura selezionata). >1 = trend in crescita, <1 = in calo.
const FORECAST_FACTOR = [1.08, 0.96, 1.12, 1.03, 1.15, 0.98, 1.06, 1.10, 1.02, 1.07];

export default function IMieiBusinessPage({navigate}:{navigate:(p:string)=>void}) {
  const today   = new Date();
  const [curDate, setCurDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selDay,  setSelDay]  = useState(today.getDate());
  const [selBiz,  setSelBiz]  = useState<number|null>(null);
  const [activeTypes, setActiveTypes] = useState<string[]>([]);

  const yr = curDate.getFullYear(), mo = curDate.getMonth();
  const MONTHS  = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
  const DAYS_S  = ["Lu","Ma","Me","Gi","Ve","Sa","Do"];

  const getDIM   = (y:number,m:number) => new Date(y,m+1,0).getDate();
  const getFirst = (y:number,m:number) => { const d=new Date(y,m,1).getDay(); return d===0?6:d-1; };
  const dim=getDIM(yr,mo), first=getFirst(yr,mo), prevDim=getDIM(yr,mo-1);

  const cells:any[]=[];
  for(let i=first-1;i>=0;i--) cells.push({day:prevDim-i,type:'prev'});
  for(let i=1;i<=dim;i++)      cells.push({day:i,type:'current'});
  let nd=1; while(cells.length<42) cells.push({day:nd++,type:'next'});

  const isToday = (d:number,t:string) => t==='current'&&d===today.getDate()&&mo===today.getMonth()&&yr===today.getFullYear();
  const isSel   = (d:number,t:string) => t==='current'&&d===selDay&&mo===curDate.getMonth()&&yr===curDate.getFullYear();

  const businesses = [
    {name:"Hotel Noto",          type:"Resort 5★",       ricavi:142800,costi:68432, profitto:74368, perc:52.1},
    {name:"Grand Hotel Roma",    type:"Hotel 4★",         ricavi:98500, costi:54180, profitto:44320, perc:45.0},
    {name:"Villa Bellini",       type:"Boutique Hotel",   ricavi:67300, costi:31792, profitto:35508, perc:52.8},
    {name:"Terrazza sul Mare",   type:"Resort 4★",        ricavi:115200,costi:71340, profitto:43860, perc:38.1},
    {name:"Palazzo Storico",     type:"Luxury Hotel",     ricavi:189700,costi:88614, profitto:101086,perc:53.3},
    {name:"Locanda dei Fiori",   type:"Agriturismo",      ricavi:41200, costi:22104, profitto:19096, perc:46.4},
    {name:"Hotel Milano Centro", type:"Business Hotel",   ricavi:76800, costi:43430, profitto:33370, perc:43.4},
    {name:"Masseria Pugliese",   type:"Agriturismo",      ricavi:53400, costi:28894, profitto:24506, perc:45.9},
    {name:"Castello del Vino",   type:"Wine Resort",      ricavi:94100, costi:49780, profitto:44320, perc:47.1},
    {name:"Hotel Firenze Arte",  type:"Design Hotel",     ricavi:81600, costi:42316, profitto:39284, perc:48.2},
  ];

  // Modalità di analisi guidata dalla data: futuro → Forecast, passato/oggi → Production
  const todayMid   = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const selDateMid = new Date(yr, mo, selDay);
  const isForecast = selDateMid.getTime() > todayMid.getTime();

  // Valori mostrati: a consuntivo (Production) o proiettati (Forecast).
  // `idx` = indice originale, stabile per la selezione anche dopo il filtro.
  const view = businesses.map((b, i) => {
    if (!isForecast) return { ...b, trend: 0, idx: i };
    const fcF = FORECAST_FACTOR[i] ?? 1.05;
    const ricavi   = Math.round(b.ricavi * fcF);
    const costi    = Math.round(b.costi * (1 + (fcF - 1) * 0.7));
    const profitto = ricavi - costi;
    const perc     = ricavi ? (profitto / ricavi) * 100 : 0;
    const trend    = b.ricavi ? ((ricavi - b.ricavi) / b.ricavi) * 100 : 0;
    return { ...b, ricavi, costi, profitto, perc, trend, idx: i };
  });

  // Tipologie di attività (filter chips) + conteggi
  const tipi = Array.from(new Set(businesses.map(b => b.type)));
  const countByType = (t: string) => businesses.filter(b => b.type === t).length;
  const toggleType = (t: string) =>
    setActiveTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const filtered = activeTypes.length ? view.filter(b => activeTypes.includes(b.type)) : view;

  const fmtEur    = (n:number) => `€ ${n.toLocaleString("it-IT")}`;
  const selDate   = new Date(yr, mo, selDay);
  const dateStr   = selDate.toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const dateStrCap = dateStr.charAt(0).toUpperCase()+dateStr.slice(1);

  return (
    <div>
      <BtnBack />

      <PageHeader title="I miei business" subtitle="Panoramica delle performance e dei dati finanziari di tutte le tue strutture"/>

      <div className="biz__layout">

        {/* ── Left sidebar ────────────────────────────────────────────── */}
        <div className="biz__sidebar">

          {/* Calendar */}
          <div className="biz__sidebar-section">
            <div className="biz__section-label">CALENDARIO</div>
            <div className="biz__cal-card">
              <div className="biz__cal-nav">
                <button className="biz__cal-nav-btn"
                  onClick={()=>setCurDate(new Date(yr,mo-1,1))}>
                  <Ico n="back" s={11} c={T.textInactive}/>
                </button>
                <span className="biz__cal-month">{MONTHS[mo]} {yr}</span>
                <button className="biz__cal-nav-btn"
                  onClick={()=>setCurDate(new Date(yr,mo+1,1))}>
                  <Ico n="chevr" s={11} c={T.textInactive}/>
                </button>
              </div>
              <div className="biz__cal-days-hdr">
                {DAYS_S.map(d=><div key={d} className="biz__cal-day-name">{d}</div>)}
              </div>
              <div className="biz__cal-cells">
                {cells.map((cell,idx)=>{
                  const isT=isToday(cell.day,cell.type), isS=isSel(cell.day,cell.type), isOut=cell.type!=='current';
                  let mod='';
                  if(isT) mod='biz__cal-cell--today';
                  else if(isS) mod='biz__cal-cell--sel';
                  else if(isOut) mod='biz__cal-cell--out';
                  return (
                    <div key={idx}
                      className={`biz__cal-cell ${mod}`}
                      onClick={()=>{if(!isOut) setSelDay(cell.day);}}>
                      {cell.day}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Business list */}
          <div className="biz__sidebar-section">
            <div className="biz__section-label">STRUTTURE ({businesses.length})</div>
            <div className="biz__list">
              {businesses.map((b,i)=>(
                <div key={i}
                  className={`biz__list-item ${selBiz===i?'biz__list-item--active':''}`}
                  onClick={()=>setSelBiz(selBiz===i?null:i)}>
                  <div className={`biz__list-ico ${selBiz===i?'biz__list-ico--active':''}`}>
                    <MenuIco id="i-miei-business" s={13} c={selBiz===i?"#fff":T.primary}/>
                  </div>
                  <div className="biz__list-info">
                    <div className={`biz__list-name ${selBiz===i?'biz__list-name--active':''}`}>{b.name}</div>
                    <div className="biz__list-type">{b.type}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right content ────────────────────────────────────────────── */}
        <div className="biz__content">

          {/* Date + legenda Forecast / Production */}
          <div className="biz__content-top">
            <div className="biz__date-card">
              <i className="fa-duotone fa-calendar biz__date-ico" aria-hidden="true"/>
              <div>
                <div className="biz__date-label">DATA SELEZIONATA</div>
                <div className="biz__date-val">{dateStrCap}</div>
              </div>
            </div>
            <div className="biz__mode">
              <span className={clsx('biz__mode-opt biz__mode-opt--forecast', isForecast && 'is-active')}>
                <span className="biz__mode-dot"/>
                <i className="fa-duotone fa-arrow-trend-up" aria-hidden="true"/>
                Forecast
              </span>
              <span className={clsx('biz__mode-opt biz__mode-opt--production', !isForecast && 'is-active')}>
                <span className="biz__mode-dot"/>
                <i className="fa-duotone fa-circle-check" aria-hidden="true"/>
                Production
              </span>
            </div>
          </div>

          {/* Filter chips per tipologia di attività */}
          <div className="biz__chips">
            <button
              className={`biz__chip ${activeTypes.length===0?'biz__chip--active':''}`}
              onClick={()=>setActiveTypes([])}>
              <i className="fa-duotone fa-layer-group biz__chip-ico" aria-hidden="true"/>
              Tutte
              <span className="biz__chip-count">{businesses.length}</span>
            </button>
            {tipi.map(t=>(
              <button key={t}
                className={`biz__chip ${activeTypes.includes(t)?'biz__chip--active':''}`}
                onClick={()=>toggleType(t)}>
                {t}
                <span className="biz__chip-count">{countByType(t)}</span>
              </button>
            ))}
          </div>

          {/* Table — bordo del colore della modalità attiva (data futura/passata) */}
          <div className={clsx('biz__table-wrap', isForecast ? 'biz__table-wrap--forecast' : 'biz__table-wrap--production')}>
            <div className="biz__table-top">
              <span className="biz__table-title">Dati del {selDay} {MONTHS[mo].toLowerCase()} {yr}</span>
              <span className="biz__table-count">{filtered.length} {filtered.length===1?'struttura':'strutture'}</span>
            </div>
            <div className="biz__table-head">
              {["STRUTTURA","RICAVI","COSTI","PROFITTO","%","BI"].map((h,i)=>(
                <div key={i} className={`biz__table-hcell ${i>0?'biz__table-hcell--right':''}`}>{h}</div>
              ))}
            </div>
            {filtered.map((b,i)=>{
              const active = selBiz===b.idx;
              return (
                <div key={b.idx}
                  className={`biz__table-row ${active?'biz__table-row--active':''} ${i<filtered.length-1?'biz__table-row--border':''}`}
                  onClick={()=>setSelBiz(active?null:b.idx)}>

                  <div className="biz__row-name-cell">
                    <div className={`biz__row-ico ${active?'biz__row-ico--active':''}`}>
                      <MenuIco id="i-miei-business" s={15} c={active?"#fff":T.primary}/>
                    </div>
                    <div>
                      <div className={`biz__row-name ${active?'biz__row-name--active':''}`}>{b.name}</div>
                      <div className="biz__row-type">{b.type}</div>
                    </div>
                  </div>

                  <div className="biz__row-val">{fmtEur(b.ricavi)}</div>
                  <div className="biz__row-val biz__row-val--costi">{fmtEur(b.costi)}</div>
                  <div className="biz__row-val biz__row-val--profitto">{fmtEur(b.profitto)}</div>
                  <div className="biz__row-val--right">
                    <span className="biz__perc-badge">+{b.perc.toFixed(1)}%</span>
                  </div>
                  <div className="biz__row-val--right">
                    <button className="biz__bi-btn"
                      onClick={e=>e.stopPropagation()}>
                      <i className="fa-duotone fa-chart-column biz__bi-ico" aria-hidden="true"/>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
