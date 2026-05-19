import React, { useState } from 'react'
import T from '../../../core/tokens'
import Ico from '../../../core/icons/Ico'
import BtnBack from '../../../core/components/BtnBack'
import { SelectField } from '../../../core/components/form'
import './GiornaleImpresa.sass'

export default function GiornaleImpresa({ navigate }: { navigate: (p: string) => void }) {
  const today     = new Date()
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  const [struttura, setStruttura] = useState('Hotel Noto')
  const [activeTab, setActiveTab] = useState('panoramica')

  const MONTHS = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
  const WDAYS  = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato']
  const fmtDay = (d: Date) => `${WDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`

  const strutture = ['Hotel Noto','Grand Hotel Roma','Villa Bellini','Terrazza sul Mare','Palazzo Storico']
  const tabs = [
    {id:'panoramica',label:'Panoramica impresa'},
    {id:'vendite',   label:'Analisi vendite'},
    {id:'gestione',  label:'Controllo gestione'},
    {id:'acquisti',  label:'Analisi acquisti'},
    {id:'operativa', label:'Analisi operativa'},
    {id:'personale', label:'Analisi del personale'},
  ]
  const statsRows = [
    {label:'Arrivi',val:'0'},{label:'Partenze',val:'0'},{label:'Gruppi',val:'100,00%'},{label:'Individuali',val:'0,00%'},
    {label:'Camere',val:'0'},{label:'Presenze',val:'0'},{label:'Occupazione',val:'0,00 %'},{label:'Revenue',val:'0,00 €'},
    {label:'Av. Daily Rate',val:'0,00 €'},{label:'Av. Daily Guest',val:'0,00 €'},
  ]
  const eventi = ['Roma Creativa 365 – Cultura tutto l\'anno','Stagione del Teatro dell\'Opera di Roma','Mostra "Tesori dei Faraoni"']

  return (
    <div>
      {/* Top bar */}
      <div className="giornale__top-bar">
        <div>
          <BtnBack onClick={() => navigate('home')} />
          <h1 className="giornale__title">Giornale impresa</h1>
          <p className="giornale__subtitle">
            Centro strategico per il monitoraggio aziendale, che offre una visione complessiva e dettagliata dell'andamento economico e operativo della struttura
          </p>
        </div>
        <button className="giornale__live-btn" onClick={() => navigate('sugg-data-driven')}>
          <div className="giornale__live-dot" />LIVE
        </button>
      </div>

      {/* Struttura selector */}
<div className="giornale__struttura-bar">
        <SelectField
          name="struttura"
          label="Struttura"
          value={struttura}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStruttura(e.target.value)}
          options={strutture.map(s => ({ value: s, label: s }))}
          className="w-48"
        />
      </div>

      {/* Tabs */}
      <div className="giornale__tabs">
        {tabs.map(tab => (
          <button key={tab.id} className={`giornale__tab ${activeTab === tab.id ? 'giornale__tab--active' : ''}`} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats panels */}
      <div className="giornale__stats-grid">
        {[
          { label:`I numeri di oggi – ${fmtDay(today)}`,     footer:'Distribuzione di rete', nav:'tariffe-disp' },
          { label:`I numeri di ieri – ${fmtDay(yesterday)}`, footer:'Prenotazioni IDS',      nav:'prenotazioni-ids' },
        ].map((panel, pi) => (
          <div key={pi} className="giornale__stat-panel">
            <div className="giornale__panel-header">
              <div className="giornale__panel-title">
                <Ico n="bar" s={14} c={T.primary} />
                {panel.label}
              </div>
              <span className="giornale__panel-sdly">S.D.L.Y.</span>
            </div>
            {statsRows.map((row, i) => (
              <div key={i} className="giornale__stat-row">
                <div className="giornale__stat-label">{row.label}</div>
                <div className="giornale__stat-val">{row.val}</div>
                <div className="giornale__stat-delta">–</div>
              </div>
            ))}
            <div className="giornale__panel-footer">
              <button className="giornale__panel-link" onClick={() => navigate(panel.nav)}>
                {panel.footer} <Ico n="chevr" s={11} c={T.blue} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info cards row */}
      <div className="giornale__info-grid">

        {/* Almanacco */}
        <div className="giornale__card">
          <div className="giornale__info-header">
            <Ico n="scadenzario" s={13} c={T.primary} />Almanacco
          </div>
          <div className="giornale__almanacco-body">
            <div className="giornale__almanacco-date">
              <div className="giornale__almanacco-day-name">{WDAYS[today.getDay()]}</div>
              <div className="giornale__almanacco-day-num">{today.getDate()}</div>
              <div className="giornale__almanacco-month">{MONTHS[today.getMonth()]}</div>
            </div>
            <div className="giornale__almanacco-content">
              <div className="giornale__almanacco-text-title">Accadde nel mese con riferimento a {MONTHS[today.getMonth()]}:</div>
              <p className="giornale__almanacco-text">Un mese di contrasti, tra piogge che bagnano l'anima e giornate di sole che la illuminano.</p>
              <button className="giornale__almanacco-link" onClick={() => navigate('scadenzario')}>
                Scadenzario <Ico n="chevr" s={11} c={T.blue} />
              </button>
            </div>
          </div>
        </div>

        {/* Meteo */}
        <div className="giornale__card">
          <div className="giornale__info-header">
            <Ico n="wheel" s={13} c={T.primary} />Meteo
          </div>
          <div className="giornale__meteo-body">
            <p className="giornale__meteo-desc">
              Velature sparse. Soleggiato per il resto del giorno. Folate di vento fino a 3,6 km/h.
            </p>
            <div className="giornale__meteo-row">
              <i className="fa-duotone fa-sun giornale__meteo-icon" aria-hidden="true" />
              <div>
                <div className="giornale__meteo-city">MILAN</div>
                <div className="giornale__meteo-temp">19°</div>
              </div>
            </div>
          </div>
        </div>

        {/* Eventi */}
        <div className="giornale__card">
          <div className="giornale__info-header">
            <Ico n="bell" s={13} c={T.primary} />Eventi
          </div>
          <div className="giornale__eventi-body">
            {eventi.map((ev, i) => (
              <div key={i} className={`giornale__event-item ${i < eventi.length - 1 ? 'giornale__event-item--border' : ''}`}>
                {ev}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom cards */}
      <div className="giornale__bottom-grid">
        {[{label:'Turni di oggi',empty:'Non ci sono turni per oggi.'},{label:'Oggi è il compleanno di',empty:'Non ci sono compleanni.'}].map((w, i) => (
          <div key={i} className="giornale__card">
            <div className="giornale__info-header">
              <Ico n="refresh" s={13} c={T.primary} />{w.label}
            </div>
            <div className="giornale__empty"><p>{w.empty}</p></div>
          </div>
        ))}
      </div>
    </div>
  )
}
