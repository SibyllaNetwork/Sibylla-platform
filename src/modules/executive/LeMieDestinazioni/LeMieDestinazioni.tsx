import React, { useState } from 'react';
import clsx from 'clsx';
import T from '../../../core/tokens';
import Ico from '../../../core/icons/Ico';
import MenuIco from '../../../core/icons/MenuIco';
import PageHead from '../../../core/components/PageHead';
import Tooltip from '../../../core/components/Tooltip';
import './LeMieDestinazioni.sass'

// ─── LE MIE DESTINAZIONI (lato tour operator) ──────────────────────────────────
//  Gemella di "I miei business" (Platform) e "I miei ristoranti" (F&B): stesso
//  impianto — calendario + elenco a sinistra, data/segmento/modalità e tabella a
//  destra — ma l'oggetto non è la struttura di proprietà: sono le DESTINAZIONI del
//  catalogo del tour operator, con i numeri che contano da quel lato del tavolo
//  (passeggeri, venduto, ticket medio, margine sul netto dei fornitori).

// Segmento della partenza: scala passeggeri / venduto / costo rispetto al dato pieno.
// Individuali → più prenotazioni ma ticket più basso; Gruppi → meno pratiche, ticket
// più alto e netto contrattato migliore.
type Segmento = 'Tutte le partenze' | 'Individuali' | 'Gruppi';
const SEGMENTI: { id: Segmento; icon: string }[] = [
  { id: 'Tutte le partenze', icon: 'fa-plane-departure' },
  { id: 'Individuali',       icon: 'fa-user'            },
  { id: 'Gruppi',            icon: 'fa-users'           },
];
const SEGMENT_FACTOR: Record<Segmento, { pax: number; ven: number; cos: number }> = {
  'Tutte le partenze': { pax: 1,    ven: 1,    cos: 1    },
  'Individuali':       { pax: 0.42, ven: 0.38, cos: 0.40 },
  'Gruppi':            { pax: 0.58, ven: 0.62, cos: 0.60 },
};

// Previsione di domanda per destinazione (moltiplicatore su passeggeri e venduto
// attesi per la data selezionata). >1 = trend in crescita, <1 = in calo.
const FORECAST_FACTOR = [1.14, 1.06, 0.98, 1.09, 1.21, 1.03, 0.96, 1.11, 1.05, 1.17];

export default function LeMieDestinazioni({navigate}:{navigate:(p:string)=>void}) {
  const today   = new Date();
  const [curDate, setCurDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selDay,  setSelDay]  = useState(today.getDate());
  const [selDest, setSelDest] = useState<number|null>(null);
  const [segmento, setSegmento] = useState<Segmento>('Tutte le partenze');
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

  // Dato pieno giornaliero per destinazione:
  //  pacchetti = pacchetti di catalogo con partenza sulla data
  //  pax       = passeggeri confermati
  //  venduto   = ricavo lordo del tour operator
  //  costo     = netto riconosciuto ai fornitori (hotel, trasporti, servizi a terra)
  //  allotment = camere in allotment ancora libere sulla data
  const base = [
    {name:"Sicilia orientale",   type:"Mare",            pacchetti:8, pax:186, venduto:41200, costo:29900, allotment:34},
    {name:"Costa Amalfitana",    type:"Mare",            pacchetti:6, pax:124, venduto:38600, costo:28100, allotment:12},
    {name:"Roma",                type:"Città d'arte",    pacchetti:11,pax:242, venduto:47800, costo:35600, allotment:58},
    {name:"Firenze e Toscana",   type:"Città d'arte",    pacchetti:9, pax:168, venduto:36400, costo:26700, allotment:41},
    {name:"Dolomiti",            type:"Montagna",        pacchetti:5, pax:96,  venduto:27300, costo:19100, allotment:23},
    {name:"Salento",             type:"Mare",            pacchetti:7, pax:154, venduto:29800, costo:22300, allotment:47},
    {name:"Lago di Garda",       type:"Laghi",           pacchetti:4, pax:88,  venduto:19400, costo:14200, allotment:19},
    {name:"Barcellona",          type:"Estero",          pacchetti:6, pax:132, venduto:33500, costo:25400, allotment:26},
    {name:"Praga",               type:"Estero",          pacchetti:5, pax:104, venduto:24600, costo:18700, allotment:31},
    {name:"Marrakech",           type:"Estero",          pacchetti:3, pax:64,  venduto:21800, costo:15300, allotment:8 },
  ];

  // Applica il fattore del segmento e, se attivo, la previsione (forecast).
  const f = SEGMENT_FACTOR[segmento];
  const destinazioni = base.map((b,i) => {
    const aPax     = Math.round(b.pax     * f.pax);
    const aVenduto = Math.round(b.venduto * f.ven);
    const fcF = FORECAST_FACTOR[i] ?? 1.05;
    // In forecast: passeggeri e venduto proiettati; il ticket sale leggermente
    const pax     = isForecast ? Math.round(aPax * fcF)              : aPax;
    const venduto = isForecast ? Math.round(aVenduto * fcF * 1.01)   : aVenduto;
    const costo   = isForecast
      ? Math.round(b.costo * f.cos * (1 + (fcF - 1) * 0.7))
      : Math.round(b.costo * f.cos);
    const margine = venduto - costo;
    const perc = venduto ? (margine / venduto) * 100 : 0;
    const ticket = pax ? venduto / pax : 0;
    // I pacchetti del segmento: i gruppi viaggiano su meno partenze
    const pacchetti = segmento === 'Tutte le partenze' ? b.pacchetti : Math.max(1, Math.round(b.pacchetti * f.pax));
    return { ...b, pacchetti, pax, venduto, costo, margine, perc, ticket, idx: i };
  });

  // Tipologie di destinazione (filter chips) + conteggi
  const tipi = Array.from(new Set(base.map(b => b.type)));
  const countByType = (t: string) => base.filter(b => b.type === t).length;
  const toggleType = (t: string) =>
    setActiveTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const filtered = activeTypes.length ? destinazioni.filter(d => activeTypes.includes(d.type)) : destinazioni;

  const fmtEur  = (n:number) => `€ ${n.toLocaleString("it-IT")}`;
  const fmtEur2 = (n:number) => `€ ${n.toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const totPax        = filtered.reduce((s,d)=>s+d.pax,0);
  const totPacchetti  = filtered.reduce((s,d)=>s+d.pacchetti,0);

  const selDate   = new Date(yr, mo, selDay);
  const dateStr   = selDate.toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const dateStrCap = dateStr.charAt(0).toUpperCase()+dateStr.slice(1);

  return (
    <div>
      <PageHead title="Le mie destinazioni" subtitle="Le destinazioni del tuo catalogo: passeggeri, venduto e marginalità per data e segmento"/>

      <div className="dest__layout">

        {/* ── Left sidebar ────────────────────────────────────────────── */}
        <div className="dest__sidebar">

          {/* Calendar */}
          <div className="dest__sidebar-section">
            <div className="dest__section-label">CALENDARIO</div>
            <div className="dest__cal-card">
              <div className="dest__cal-nav">
                <button className="dest__cal-nav-btn"
                  onClick={()=>setCurDate(new Date(yr,mo-1,1))}>
                  <Ico n="back" s={11} c={T.textInactive}/>
                </button>
                <span className="dest__cal-month">{MONTHS[mo]} {yr}</span>
                <button className="dest__cal-nav-btn"
                  onClick={()=>setCurDate(new Date(yr,mo+1,1))}>
                  <Ico n="chevr" s={11} c={T.textInactive}/>
                </button>
              </div>
              <div className="dest__cal-days-hdr">
                {DAYS_S.map(d=><div key={d} className="dest__cal-day-name">{d}</div>)}
              </div>
              <div className="dest__cal-cells">
                {cells.map((cell,idx)=>{
                  const isT=isToday(cell.day,cell.type), isS=isSel(cell.day,cell.type), isOut=cell.type!=='current';
                  let mod='';
                  if(isT) mod='dest__cal-cell--today';
                  else if(isS) mod='dest__cal-cell--sel';
                  else if(isOut) mod='dest__cal-cell--out';
                  return (
                    <div key={idx}
                      className={`dest__cal-cell ${mod}`}
                      onClick={()=>{if(!isOut) setSelDay(cell.day);}}>
                      {cell.day}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Destination list */}
          <div className="dest__sidebar-section">
            <div className="dest__section-label">DESTINAZIONI ({destinazioni.length})</div>
            <div className="dest__list">
              {destinazioni.map((d,i)=>(
                <div key={i}
                  className={`dest__list-item ${selDest===i?'dest__list-item--active':''}`}
                  onClick={()=>setSelDest(selDest===i?null:i)}>
                  <div className={`dest__list-ico ${selDest===i?'dest__list-ico--active':''}`}>
                    <MenuIco id="le-mie-destinazioni" s={13} c={selDest===i?"#fff":T.primary}/>
                  </div>
                  <div className="dest__list-info">
                    <div className={`dest__list-name ${selDest===i?'dest__list-name--active':''}`}>{d.name}</div>
                    <div className="dest__list-type">{d.type} · {d.pacchetti} pacchetti</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right content ────────────────────────────────────────────── */}
        <div className="dest__content">

          {/* Date + segmento + legenda Forecast / Production */}
          <div className="dest__content-top">
            <div className="dest__date-card">
              <i className="fa-duotone fa-calendar dest__date-ico" aria-hidden="true"/>
              <div>
                <div className="dest__date-label">DATA DI PARTENZA</div>
                <div className="dest__date-val">{dateStrCap}</div>
              </div>
            </div>
            <div className="dest__top-right">
              <div className="dest__segmento" role="radiogroup" aria-label="Segmento">
                {SEGMENTI.map(s=>(
                  <button key={s.id} type="button" role="radio" aria-checked={segmento===s.id}
                    className={clsx('dest__segmento-btn', segmento===s.id && 'dest__segmento-btn--active')}
                    onClick={()=>setSegmento(s.id)}>
                    <i className={`fa-duotone ${s.icon}`} aria-hidden="true"/>
                    {s.id}
                  </button>
                ))}
              </div>
              <div className="dest__mode">
                <span className={clsx('dest__mode-opt dest__mode-opt--forecast', isForecast && 'is-active')}>
                  <span className="dest__mode-dot"/>
                  <i className="fa-duotone fa-arrow-trend-up" aria-hidden="true"/>
                  Forecast
                </span>
                <span className={clsx('dest__mode-opt dest__mode-opt--production', !isForecast && 'is-active')}>
                  <span className="dest__mode-dot"/>
                  <i className="fa-duotone fa-circle-check" aria-hidden="true"/>
                  Production
                </span>
              </div>
            </div>
          </div>

          {/* Filter chips per tipologia di destinazione */}
          <div className="dest__chips">
            <button
              className={`dest__chip ${activeTypes.length===0?'dest__chip--active':''}`}
              onClick={()=>setActiveTypes([])}>
              <i className="fa-duotone fa-layer-group dest__chip-ico" aria-hidden="true"/>
              Tutte
              <span className="dest__chip-count">{base.length}</span>
            </button>
            {tipi.map(t=>(
              <button key={t}
                className={`dest__chip ${activeTypes.includes(t)?'dest__chip--active':''}`}
                onClick={()=>toggleType(t)}>
                {t}
                <span className="dest__chip-count">{countByType(t)}</span>
              </button>
            ))}
          </div>

          {/* Table — bordo del colore della modalità attiva (data futura/passata) */}
          <div className={clsx('dest__table-wrap', isForecast ? 'dest__table-wrap--forecast' : 'dest__table-wrap--production')}>
            <div className="dest__table-top">
              <span className="dest__table-title">Partenze del {selDay} {MONTHS[mo].toLowerCase()} {yr} · {segmento}</span>
              <span className="dest__table-count">
                {totPax.toLocaleString("it-IT")} pax · {totPacchetti} pacchetti · {filtered.length} {filtered.length===1?'destinazione':'destinazioni'}
              </span>
            </div>
            <div className="dest__table-head">
              {["DESTINAZIONE","PAX","VENDUTO","TICKET MEDIO","MARGINE","%","BI"].map((h,i)=>(
                <div key={i} className={`dest__table-hcell ${i>0?'dest__table-hcell--right':''}`}>{h}</div>
              ))}
            </div>
            {filtered.map((d,i)=>{
              const active = selDest===d.idx;
              return (
                <div key={d.idx}
                  className={`dest__table-row ${active?'dest__table-row--active':''} ${i<filtered.length-1?'dest__table-row--border':''}`}
                  onClick={()=>setSelDest(active?null:d.idx)}>

                  <div className="dest__row-name-cell">
                    <div className={`dest__row-ico ${active?'dest__row-ico--active':''}`}>
                      <MenuIco id="le-mie-destinazioni" s={15} c={active?"#fff":T.primary}/>
                    </div>
                    <div>
                      <div className={`dest__row-name ${active?'dest__row-name--active':''}`}>{d.name}</div>
                      {/* Allotment residuo: lato TO è l'informazione che dice se la
                          destinazione può ancora vendere o va rinegoziata */}
                      <div className="dest__row-type">{d.type} · allotment libero {d.allotment}</div>
                    </div>
                  </div>

                  <div className="dest__row-val--right">
                    <span className="dest__pax-badge"><i className="fa-duotone fa-users" aria-hidden="true"/>{d.pax}</span>
                  </div>
                  <div className="dest__row-val">{fmtEur(d.venduto)}</div>
                  <div className="dest__row-val dest__row-val--ticket">{fmtEur2(d.ticket)}</div>
                  <div className="dest__row-val dest__row-val--margine">{fmtEur(d.margine)}</div>
                  <div className="dest__row-val--right">
                    <span className="dest__perc-badge">+{d.perc.toFixed(1)}%</span>
                  </div>
                  <div className="dest__row-val--right">
                    {/* Il pulsante BI porta al benchmark della destinazione (Market lens) */}
                    <Tooltip text={`Analisi di mercato · ${d.name}`}>
                      <button className="dest__bi-btn"
                        aria-label={`Apri l'analisi di mercato di ${d.name}`}
                        onClick={e=>{e.stopPropagation(); navigate('market-lens');}}>
                        <i className="fa-duotone fa-chart-column dest__bi-ico" aria-hidden="true"/>
                      </button>
                    </Tooltip>
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
