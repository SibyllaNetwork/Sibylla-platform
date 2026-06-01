import React, { useState } from 'react'
import T from '../../../../core/tokens'
import Ico from '../../../../core/icons/Ico'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import './PrenotazioniIDS.sass'

type ImportRow = { data: string; prenotazioni: number }

const STRUTTURE = ['Tutte le strutture','Hotel Archimede','Hotel Floridia','Hotel Lazio','Hotel Luce','Hotel Lux','Hotel Noto','Hotel Regio']

const HOTEL_DATA: Record<string, ImportRow[]> = {
  'Hotel Archimede': [{data:'05/04/2026',prenotazioni:17},{data:'06/04/2026',prenotazioni:21},{data:'07/04/2026',prenotazioni:48},{data:'08/04/2026',prenotazioni:11}],
  'Hotel Floridia':  [{data:'05/04/2026',prenotazioni:8}, {data:'06/04/2026',prenotazioni:14},{data:'07/04/2026',prenotazioni:32},{data:'08/04/2026',prenotazioni:6}],
  'Hotel Lazio':     [{data:'05/04/2026',prenotazioni:23},{data:'06/04/2026',prenotazioni:41},{data:'07/04/2026',prenotazioni:19},{data:'08/04/2026',prenotazioni:28}],
  'Hotel Luce':      [{data:'05/04/2026',prenotazioni:55},{data:'06/04/2026',prenotazioni:62},{data:'07/04/2026',prenotazioni:38},{data:'08/04/2026',prenotazioni:44}],
  'Hotel Lux':       [{data:'05/04/2026',prenotazioni:12},{data:'06/04/2026',prenotazioni:9}, {data:'07/04/2026',prenotazioni:27},{data:'08/04/2026',prenotazioni:15}],
  'Hotel Noto':      [{data:'05/04/2026',prenotazioni:33},{data:'06/04/2026',prenotazioni:47},{data:'07/04/2026',prenotazioni:52},{data:'08/04/2026',prenotazioni:29}],
  'Hotel Regio':     [{data:'05/04/2026',prenotazioni:18},{data:'06/04/2026',prenotazioni:24},{data:'07/04/2026',prenotazioni:31},{data:'08/04/2026',prenotazioni:16}],
}

export default function PrenotazioniIDS({ navigate }: { navigate: (p: string) => void }) {
  const [struttura,   setStruttura]   = useState('Tutte le strutture')
  const [dataUltMod,  setDataUltMod]  = useState('2026-03-26')
  const [expanded,    setExpanded]    = useState<Set<string>>(new Set(['Hotel Archimede']))

  const toggleExp = (h: string) => setExpanded(prev => { const n = new Set(prev); n.has(h) ? n.delete(h) : n.add(h); return n })

  const visibleHotels  = struttura === 'Tutte le strutture' ? Object.keys(HOTEL_DATA) : [struttura]
  const totaleGlobale  = visibleHotels.reduce((acc, h) => acc + (HOTEL_DATA[h] || []).reduce((s, r) => s + r.prenotazioni, 0), 0)

  return (
    <div>
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader title="Prenotazioni IDS" subtitle="Visione centralizzata per monitoraggio in tempo reale delle prenotazioni ricevute dai canali di distribuzione online"/>

      {/* Filtri */}
      <div className="ids__filters">
        <div>
          <label className="text-[11px] font-semibold font-opensans text-ink">Struttura</label>
          <select className="sib-select sib-select--dense w-[180px]" value={struttura} onChange={e => setStruttura(e.target.value)}>
            {STRUTTURE.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold font-opensans text-ink">Data ultima modifica</label>
          <input type="date" className="sib-input sib-input--dense" value={dataUltMod} onChange={e => setDataUltMod(e.target.value)} />
        </div>
      </div>

      {/* Accordion */}
      <div className="ids__accordion">
        {visibleHotels.map((hotel, hi) => {
          const rows       = HOTEL_DATA[hotel] || []
          const isExp      = expanded.has(hotel)
          const totaleHotel = rows.reduce((s, r) => s + r.prenotazioni, 0)
          return (
            <div key={hotel} className="ids__hotel-group ids__hotel-group--dyn" style={{ '--hotel-border': hi < visibleHotels.length - 1 ? `1px solid ${T.border}` : 'none' } as React.CSSProperties}>
              <div className="ids__hotel-row" onClick={() => toggleExp(hotel)}>
                <div className="ids__hotel-left">
                  <div className="ids__hotel-dot ids__hotel-dot--dyn" style={{ '--hotel-dot-bg': isExp ? T.blue : T.border } as React.CSSProperties} />
                  <span className="ids__hotel-name">{hotel}</span>
                  {isExp && <span className="ids__hotel-count">{totaleHotel} prenotazioni</span>}
                </div>
                <div className={`ids__chevron ${isExp ? 'ids__chevron--open' : 'ids__chevron--closed'}`}>
                  <Ico n="chevd" s={14} c={isExp ? T.primary : T.textDisabled} />
                </div>
              </div>
              {isExp && (
                <div>
                  <div className="ids__import-header">
                    <div className="ids__import-th">Data dell'import</div>
                    <div className="ids__import-th ids__import-th--right">Prenotazioni</div>
                  </div>
                  {rows.map((row, ri) => (
                    <div key={ri} className="ids__import-row ids__import-row--dyn" style={{ '--row-border': ri < rows.length - 1 ? `1px solid ${T.border}` : 'none' } as React.CSSProperties}>
                      <div className="ids__import-date">{row.data}</div>
                      <div className="ids__import-val">{row.prenotazioni}</div>
                    </div>
                  ))}
                  <div className="ids__hotel-footer">
                    <div className="ids__hotel-total-label">Totale {hotel}</div>
                    <div className="ids__hotel-total-val">{totaleHotel}</div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer globale */}
      <div className="ids__global-footer">
        <div className="ids__global-label">Prenotazioni totali</div>
        <div className="ids__global-val">{totaleGlobale.toLocaleString('it-IT')}</div>
      </div>
    </div>
  )
}
