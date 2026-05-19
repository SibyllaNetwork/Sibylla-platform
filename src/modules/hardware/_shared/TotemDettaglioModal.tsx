import React from 'react'
import Tooltip from '../../../core/components/Tooltip'
import './TotemDettaglioModal.sass'

interface TotemSpecs {
  modello: string
  cpu: string
  memoria: string
  so: string
  gpu: string
  touch: string
  risoluzione: string
  wifi: string
  cellular: string
  statusOk: boolean
}

const DEFAULT_SPECS: TotemSpecs = {
  modello:     'Totem digitale Tork Mag 3',
  cpu:         'Intel i5 12 gen',
  memoria:     '128 Gb',
  so:          'Windows 11',
  gpu:         'Nvidia GeForce 2040',
  touch:       'Touch capacitivo',
  risoluzione: '4K',
  wifi:        '2.4G/5G/6G',
  cellular:    'Presente',
  statusOk:    true,
}

interface Props {
  open: boolean
  strutturaName?: string
  specs?: Partial<TotemSpecs>
  onClose: () => void
  onAssistenza?: () => void
}

export default function TotemDettaglioModal({
  open, strutturaName, specs, onClose, onAssistenza,
}: Props) {
  if (!open) return null
  const s = { ...DEFAULT_SPECS, ...specs }

  return (
    <div className="totem-dett__backdrop" onClick={onClose}>
      <div className="totem-dett__modal" onClick={e => e.stopPropagation()}>
        <header className="totem-dett__head">
          <h3 className="totem-dett__title">Dettaglio Totem</h3>
          <Tooltip text="Chiudi">
            <button type="button" className="sib-btn sib-btn--icon" onClick={onClose} aria-label="Chiudi">
              <i className="fa-light fa-xmark" />
            </button>
          </Tooltip>
        </header>

        <div className="totem-dett__body">
          <dl className="totem-dett__specs">
            <Spec label="Modello"           value={s.modello} />
            <Spec label="CPU"               value={s.cpu} />
            <Spec label="Memoria Interna"   value={s.memoria} />
            <Spec label="Sistema Operativo" value={s.so} />
            <Spec label="Scheda Grafica"    value={s.gpu} />
            <Spec label="Schermo tattile"   value={s.touch} />
            <Spec label="Risoluzione"       value={s.risoluzione} />
            <Spec label="WiFi"              value={s.wifi} />
            <Spec label="3G/4G"             value={s.cellular} />

            <h4 className="totem-dett__section">Diagnostica</h4>
            <div className="totem-dett__spec totem-dett__spec--row">
              <dt>Status</dt>
              <dd>
                <span className={'totem-dett__status' + (s.statusOk ? ' totem-dett__status--on' : ' totem-dett__status--off')}>
                  <i className={'fa-light ' + (s.statusOk ? 'fa-lightbulb-on' : 'fa-lightbulb-slash')} aria-hidden="true" />
                </span>
              </dd>
            </div>
          </dl>

          <div className="totem-dett__device">
            <DeviceMockup />
            {strutturaName && (
              <p className="totem-dett__device-caption">{strutturaName}</p>
            )}
          </div>
        </div>

        <footer className="totem-dett__foot">
          <button
            type="button"
            className="sib-btn sib-btn--primary"
            onClick={onAssistenza ?? onClose}
          >
            <i className="fa-light fa-headset" /> Richiedi Assistenza
          </button>
        </footer>
      </div>
    </div>
  )
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="totem-dett__spec">
      <dt>{label}:</dt>
      <dd>{value}</dd>
    </div>
  )
}

// ─── Mockup device totem (foto stilizzata) ──────────────────────────
function DeviceMockup() {
  return (
    <div className="totem-dett__mockup" aria-hidden="true">
      <div className="totem-dett__mockup-screen">
        <div className="totem-dett__mockup-content">
          <span className="totem-dett__mockup-headline">OH MY<br/>LOVE</span>
          <span className="totem-dett__mockup-image">
            <i className="fa-light fa-burger" />
          </span>
        </div>
      </div>
      <div className="totem-dett__mockup-base">
        <span className="totem-dett__mockup-sensor" aria-hidden="true">
          <i className="fa-light fa-qrcode" />
        </span>
      </div>
    </div>
  )
}
