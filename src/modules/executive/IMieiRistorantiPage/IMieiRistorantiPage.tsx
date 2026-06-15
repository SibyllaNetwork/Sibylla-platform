import React, { useState } from 'react';
import clsx from 'clsx';
import T from '../../../core/tokens';
import Ico from '../../../core/icons/Ico';
import MenuIco from '../../../core/icons/MenuIco';
import BtnBack from '../../../core/components/BtnBack';
import PageHeader from '../../../core/components/PageHeader';
import './IMieiRistorantiPage.sass'

// Servizio della giornata: scala coperti / ricavi / costi rispetto al dato pieno.
// Pranzo → più coperti ma scontrino più basso; Cena → meno coperti, scontrino più alto.
type Servizio = 'Intera giornata' | 'Pranzo' | 'Cena';
const SERVIZI: { id: Servizio; icon: string }[] = [
  { id: 'Intera giornata', icon: 'fa-utensils' },
  { id: 'Pranzo',          icon: 'fa-sun'      },
  { id: 'Cena',            icon: 'fa-moon'     },
];
const SERVICE_FACTOR: Record<Servizio, { cop: number; ric: number; cos: number }> = {
  'Intera giornata': { cop: 1,    ric: 1,    cos: 1    },
  'Pranzo':          { cop: 0.45, ric: 0.38, cos: 0.40 },
  'Cena':            { cop: 0.55, ric: 0.62, cos: 0.60 },
};

// Previsione di domanda per ristorante (moltiplicatore sui coperti/ricavi attesi
// per la data selezionata). >1 = trend in crescita, <1 = in calo.
const FORECAST_FACTOR = [1.12, 0.97, 1.05, 1.18, 1.02, 0.95, 1.09, 1.15, 1.04, 1.10];

export default function IMieiRistorantiPage({navigate}:{navigate:(p:string)=>void}) {
  const today   = new Date();
  const [curDate, setCurDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selDay,  setSelDay]  = useState(today.getDate());
  const [selRist, setSelRist] = useState<number|null>(null);
  const [servizio, setServizio] = useState<Servizio>('Intera giornata');
  const [activeTypes, setActiveTypes] = useState<string[]>([]);

  const yr = curDate.getFullYear(), mo = curDate.getMonth();

  // Modalità di analisi guidata dalla data: futuro → Forecast, passato/oggi → Production
  const todayMid    = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const selDateMid  = new Date(yr, mo, selDay);
  const isForecast  = selDateMid.getTime() > todayMid.getTime();
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

  // Dato pieno giornaliero per ristorante (coperti / ricavi / costi)
  const base = [
    {name:"Tullio al Centro",    type:"Ristorante Gourmet",     coperti:120, ricavi:8400,  costi:4620 },
    {name:"La Pergola",          type:"Fine Dining 1★",         coperti:64,  ricavi:11500, costi:6210 },
    {name:"Trattoria del Porto", type:"Trattoria di pesce",     coperti:95,  ricavi:5320,  costi:2980 },
    {name:"Pizzeria Vesuvio",    type:"Pizzeria napoletana",    coperti:210, ricavi:4620,  costi:2310 },
    {name:"Bistrot Aurora",      type:"Bistrot & Brunch",       coperti:88,  ricavi:3960,  costi:2178 },
    {name:"Osteria del Borgo",   type:"Osteria tipica",         coperti:76,  ricavi:3420,  costi:1881 },
    {name:"Sushi Zen",           type:"Ristorante giapponese",  coperti:102, ricavi:6630,  costi:3580 },
    {name:"Lounge Bar Skyline",  type:"Lounge & Cocktail Bar",  coperti:145, ricavi:5075,  costi:2436 },
    {name:"Braceria Sud",        type:"Steakhouse",             coperti:134, ricavi:7370,  costi:4054 },
    {name:"Caffè Letterario",    type:"Caffetteria & Brunch",   coperti:165, ricavi:2970,  costi:1604 },
  ];

  // Applica il fattore del servizio e, se attivo, la previsione (forecast).
  const f = SERVICE_FACTOR[servizio];
  const ristoranti = base.map((b,i) => {
    const aCoperti = Math.round(b.coperti * f.cop);
    const aRicavi  = Math.round(b.ricavi  * f.ric);
    const fcF = FORECAST_FACTOR[i] ?? 1.05;
    // In forecast: coperti e ricavi proiettati; lo scontrino sale leggermente
    const coperti = isForecast ? Math.round(aCoperti * fcF)         : aCoperti;
    const ricavi  = isForecast ? Math.round(aRicavi  * fcF * 1.01)  : aRicavi;
    const costi   = isForecast ? Math.round(b.costi * f.cos * (1 + (fcF - 1) * 0.7)) : Math.round(b.costi * f.cos);
    const profitto = ricavi - costi;
    const perc = ricavi ? (profitto / ricavi) * 100 : 0;
    const scontrino = coperti ? ricavi / coperti : 0;
    return { ...b, coperti, ricavi, costi, profitto, perc, scontrino, idx: i };
  });

  // Tipologie di ristorante (filter chips) + conteggi
  const tipi = Array.from(new Set(base.map(b => b.type)));
  const countByType = (t: string) => base.filter(b => b.type === t).length;
  const toggleType = (t: string) =>
    setActiveTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const filtered = activeTypes.length ? ristoranti.filter(r => activeTypes.includes(r.type)) : ristoranti;

  const fmtEur  = (n:number) => `€ ${n.toLocaleString("it-IT")}`;
  const fmtEur2 = (n:number) => `€ ${n.toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const totCoperti = filtered.reduce((s,r)=>s+r.coperti,0);

  const selDate   = new Date(yr, mo, selDay);
  const dateStr   = selDate.toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const dateStrCap = dateStr.charAt(0).toUpperCase()+dateStr.slice(1);

  return (
    <div>
      <BtnBack onClick={()=>navigate("home")}/>

      <PageHeader title="I miei ristoranti" subtitle="Performance, coperti e dati finanziari dei tuoi ristoranti, per servizio"/>

      <div className="rist__layout">

        {/* ── Left sidebar ────────────────────────────────────────────── */}
        <div className="rist__sidebar">

          {/* Calendar */}
          <div className="rist__sidebar-section">
            <div className="rist__section-label">CALENDARIO</div>
            <div className="rist__cal-card">
              <div className="rist__cal-nav">
                <button className="rist__cal-nav-btn"
                  onClick={()=>setCurDate(new Date(yr,mo-1,1))}>
                  <Ico n="back" s={11} c={T.textInactive}/>
                </button>
                <span className="rist__cal-month">{MONTHS[mo]} {yr}</span>
                <button className="rist__cal-nav-btn"
                  onClick={()=>setCurDate(new Date(yr,mo+1,1))}>
                  <Ico n="chevr" s={11} c={T.textInactive}/>
                </button>
              </div>
              <div className="rist__cal-days-hdr">
                {DAYS_S.map(d=><div key={d} className="rist__cal-day-name">{d}</div>)}
              </div>
              <div className="rist__cal-cells">
                {cells.map((cell,idx)=>{
                  const isT=isToday(cell.day,cell.type), isS=isSel(cell.day,cell.type), isOut=cell.type!=='current';
                  let mod='';
                  if(isT) mod='rist__cal-cell--today';
                  else if(isS) mod='rist__cal-cell--sel';
                  else if(isOut) mod='rist__cal-cell--out';
                  return (
                    <div key={idx}
                      className={`rist__cal-cell ${mod}`}
                      onClick={()=>{if(!isOut) setSelDay(cell.day);}}>
                      {cell.day}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Restaurant list */}
          <div className="rist__sidebar-section">
            <div className="rist__section-label">RISTORANTI ({ristoranti.length})</div>
            <div className="rist__list">
              {ristoranti.map((r,i)=>(
                <div key={i}
                  className={`rist__list-item ${selRist===i?'rist__list-item--active':''}`}
                  onClick={()=>setSelRist(selRist===i?null:i)}>
                  <div className={`rist__list-ico ${selRist===i?'rist__list-ico--active':''}`}>
                    <MenuIco id="i-miei-ristoranti" s={13} c={selRist===i?"#fff":T.primary}/>
                  </div>
                  <div className="rist__list-info">
                    <div className={`rist__list-name ${selRist===i?'rist__list-name--active':''}`}>{r.name}</div>
                    <div className="rist__list-type">{r.type}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right content ────────────────────────────────────────────── */}
        <div className="rist__content">

          {/* Date + servizio + legenda Forecast / Production */}
          <div className="rist__content-top">
            <div className="rist__date-card">
              <i className="fa-duotone fa-calendar rist__date-ico" aria-hidden="true"/>
              <div>
                <div className="rist__date-label">DATA SELEZIONATA</div>
                <div className="rist__date-val">{dateStrCap}</div>
              </div>
            </div>
            <div className="rist__top-right">
              <div className="rist__servizio" role="radiogroup" aria-label="Servizio">
                {SERVIZI.map(s=>(
                  <button key={s.id} type="button" role="radio" aria-checked={servizio===s.id}
                    className={clsx('rist__servizio-btn', servizio===s.id && 'rist__servizio-btn--active')}
                    onClick={()=>setServizio(s.id)}>
                    <i className={`fa-duotone ${s.icon}`} aria-hidden="true"/>
                    {s.id}
                  </button>
                ))}
              </div>
              <div className="rist__mode">
                <span className={clsx('rist__mode-opt rist__mode-opt--forecast', isForecast && 'is-active')}>
                  <span className="rist__mode-dot"/>
                  <i className="fa-duotone fa-arrow-trend-up" aria-hidden="true"/>
                  Forecast
                </span>
                <span className={clsx('rist__mode-opt rist__mode-opt--production', !isForecast && 'is-active')}>
                  <span className="rist__mode-dot"/>
                  <i className="fa-duotone fa-circle-check" aria-hidden="true"/>
                  Production
                </span>
              </div>
            </div>
          </div>

          {/* Filter chips per tipologia di ristorante */}
          <div className="rist__chips">
            <button
              className={`rist__chip ${activeTypes.length===0?'rist__chip--active':''}`}
              onClick={()=>setActiveTypes([])}>
              <i className="fa-duotone fa-layer-group rist__chip-ico" aria-hidden="true"/>
              Tutti
              <span className="rist__chip-count">{base.length}</span>
            </button>
            {tipi.map(t=>(
              <button key={t}
                className={`rist__chip ${activeTypes.includes(t)?'rist__chip--active':''}`}
                onClick={()=>toggleType(t)}>
                {t}
                <span className="rist__chip-count">{countByType(t)}</span>
              </button>
            ))}
          </div>

          {/* Table — bordo del colore della modalità attiva (data futura/passata) */}
          <div className={clsx('rist__table-wrap', isForecast ? 'rist__table-wrap--forecast' : 'rist__table-wrap--production')}>
            <div className="rist__table-top">
              <span className="rist__table-title">Dati del {selDay} {MONTHS[mo].toLowerCase()} {yr} · {servizio}</span>
              <span className="rist__table-count">{totCoperti.toLocaleString("it-IT")} coperti · {filtered.length} {filtered.length===1?'ristorante':'ristoranti'}</span>
            </div>
            <div className="rist__table-head">
              {["RISTORANTE","COPERTI","RICAVI","SCONTRINO","PROFITTO","%","BI"].map((h,i)=>(
                <div key={i} className={`rist__table-hcell ${i>0?'rist__table-hcell--right':''}`}>{h}</div>
              ))}
            </div>
            {filtered.map((r,i)=>{
              const active = selRist===r.idx;
              return (
                <div key={r.idx}
                  className={`rist__table-row ${active?'rist__table-row--active':''} ${i<filtered.length-1?'rist__table-row--border':''}`}
                  onClick={()=>setSelRist(active?null:r.idx)}>

                  <div className="rist__row-name-cell">
                    <div className={`rist__row-ico ${active?'rist__row-ico--active':''}`}>
                      <MenuIco id="i-miei-ristoranti" s={15} c={active?"#fff":T.primary}/>
                    </div>
                    <div>
                      <div className={`rist__row-name ${active?'rist__row-name--active':''}`}>{r.name}</div>
                      <div className="rist__row-type">{r.type}</div>
                    </div>
                  </div>

                  <div className="rist__row-val--right">
                    <span className="rist__coperti-badge"><i className="fa-duotone fa-chair" aria-hidden="true"/>{r.coperti}</span>
                  </div>
                  <div className="rist__row-val">{fmtEur(r.ricavi)}</div>
                  <div className="rist__row-val rist__row-val--scontrino">{fmtEur2(r.scontrino)}</div>
                  <div className="rist__row-val rist__row-val--profitto">{fmtEur(r.profitto)}</div>
                  <div className="rist__row-val--right">
                    <span className="rist__perc-badge">+{r.perc.toFixed(1)}%</span>
                  </div>
                  <div className="rist__row-val--right">
                    <button className="rist__bi-btn"
                      onClick={e=>e.stopPropagation()}>
                      <i className="fa-duotone fa-chart-column rist__bi-ico" aria-hidden="true"/>
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
