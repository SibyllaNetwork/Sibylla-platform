import React, { useEffect, useMemo, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import { InputField, SelectField } from '../../../../../core/components/form'
import Tooltip from '../../../../../core/components/Tooltip'
import { toast } from '../../../../../core/components/Toast/useToast'
import { CfgToolbar, CfgSaveBar } from '../../../../../core/cfg'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import './Gateway.sass'

// ─── GATEWAY (§4.21) ──────────────────────────────────────────────────────────
//  Gateway di pagamento della struttura: una card per gateway con stato,
//  API key (password + occhio mostra/nascondi) e salvataggio. Il layout è a
//  griglia perché la pagina deve reggere PIÙ gateway (oggi in produzione ce
//  n'è uno solo, Nexy): ogni card ha il proprio stato per struttura.

interface GatewayDef {
  id: string
  nome: string
  codice: string
  descrizione: string
  icona: string
}

/** Configurazione di un gateway per una struttura. */
interface GatewayConf {
  apiKey: string
}

interface Data {
  strutture: string[]
  gateways: GatewayDef[]
  /** conf[struttura][gatewayId] — assente = mai configurato. */
  conf: Record<string, Record<string, GatewayConf>>
}

const FALLBACK: Data = {
  strutture: ['HOTEL DEI MILLE', "GRIM'S HOTEL", 'HOTEL PARKER'],
  gateways: [
    {
      id: 'nexy', nome: 'Nexy', codice: 'NEXY', icona: 'credit-card',
      descrizione: 'Incassi con carta al check-in e link di pagamento dalle conferme di prenotazione.',
    },
    {
      id: 'axerve', nome: 'Axerve', codice: 'AXERVE', icona: 'building-columns',
      descrizione: 'POS fisici della reception e degli outlet, con riconciliazione automatica degli incassi.',
    },
  ],
  conf: {
    'HOTEL DEI MILLE': { axerve: { apiKey: 'axr_live_9f27c1b4e8d0' } },
    "GRIM'S HOTEL": {},
    'HOTEL PARKER': { nexy: { apiKey: 'nxy_live_51ab04c2277e' } },
  },
}

export default function Gateway() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [saved, setSaved] = useState<Data>(FALLBACK)
  const [struttura, setStruttura] = useState<string>(FALLBACK.strutture[0])

  const markDirty     = useConfiguratoreStore(s => s.markDirty)
  const resetDirty    = useConfiguratoreStore(s => s.resetDirty)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetGateway', { method: 'POST', body: {} })
      .then((d) => {
        if (cancelled) return
        setData(d)
        setSaved(d)
        if (d.strutture.length) setStruttura(d.strutture[0])
      })
      .catch(() => { /* fallback silenzioso */ })
    return () => { cancelled = true }
  }, [])

  const keyOf = (d: Data, s: string, gw: string) => d.conf[s]?.[gw]?.apiKey ?? ''

  // ── Dirty: gateway (su tutte le strutture) la cui chiave differisce dal salvato
  const dirty = useMemo(() => {
    let n = 0
    for (const s of data.strutture) {
      for (const gw of data.gateways) {
        if (keyOf(data, s, gw.id) !== keyOf(saved, s, gw.id)) n += 1
      }
    }
    return n
  }, [data, saved])

  useEffect(() => { markDirty('gateway', dirty) }, [dirty, markDirty])

  const setKey = (gwId: string, apiKey: string) => {
    setData(d => ({
      ...d,
      conf: {
        ...d.conf,
        [struttura]: { ...d.conf[struttura], [gwId]: { apiKey } },
      },
    }))
  }

  const completionAfter = (d: Data) => {
    const total = d.strutture.length * d.gateways.length
    const done = d.strutture.reduce(
      (acc, s) => acc + d.gateways.filter(gw => keyOf(d, s, gw.id).trim() !== '').length, 0)
    return done === 0 ? 'empty' : done === total ? 'configured' : 'partial'
  }

  const persist = () => new Promise<void>((resolve) => {
    setTimeout(() => {
      setSaved(data)
      setCompletion('gateway', completionAfter(data))
      resetDirty()
      resolve()
    }, 450)
  })

  const cancel = () => {
    setData(saved)
    resetDirty()
  }

  // Salvataggio della singola card: persiste SOLO la chiave di quel gateway
  // per la struttura selezionata (le altre modifiche restano pendenti).
  const persistCard = (gwId: string, nome: string) => {
    const next: Data = {
      ...saved,
      conf: {
        ...saved.conf,
        [struttura]: { ...saved.conf[struttura], [gwId]: { apiKey: keyOf(data, struttura, gwId) } },
      },
    }
    setSaved(next)
    setCompletion('gateway', completionAfter(next))
    toast.success(`Chiave di ${nome} salvata per ${struttura}`)
  }

  return (
    <div className="cfg-gateway">
      <CfgToolbar>
        <SelectField
          name="gw-struttura"
          label="Struttura"
          value={struttura}
          onChange={(e) => setStruttura(e.target.value)}
          options={data.strutture.map(s => ({ value: s, label: s }))}
        />
      </CfgToolbar>

      <div className="cfg-gateway__grid">
        {data.gateways.map((gw) => {
          const apiKey = keyOf(data, struttura, gw.id)
          const savedKey = keyOf(saved, struttura, gw.id)
          const configured = savedKey.trim() !== ''
          const changed = apiKey !== savedKey
          return (
            <article key={gw.id} className="cfg-gateway__card">
              <header className="cfg-gateway__card-head">
                <span className="cfg-gateway__card-ico" aria-hidden="true">
                  <i className={`fa-light fa-${gw.icona}`} />
                </span>
                <div className="cfg-gateway__card-titles">
                  <h3 className="cfg-gateway__card-name">{gw.nome}</h3>
                  <span className="cfg-gateway__card-code">{gw.codice}</span>
                </div>
                <span className={`cfg-gateway__status cfg-gateway__status--${configured ? 'ok' : 'todo'}`}>
                  <i className={`fa-solid ${configured ? 'fa-check' : 'fa-triangle-exclamation'}`} aria-hidden="true" />
                  {configured ? 'Configurato' : 'Da configurare'}
                </span>
              </header>

              <p className="cfg-gateway__card-desc">{gw.descrizione}</p>

              <div className="cfg-gateway__card-form">
                <InputField
                  name={`apikey-${gw.id}`}
                  label="API key struttura"
                  type="password"
                  placeholder="Incolla la chiave fornita dal gateway"
                  autoComplete="off"
                  value={apiKey}
                  onChange={(e) => setKey(gw.id, e.target.value)}
                />
                <Tooltip text={changed ? `Salva la chiave di ${gw.nome} per ${struttura}` : 'Nessuna modifica da salvare'}>
                  <button
                    type="button"
                    className="sib-btn sib-btn--secondary cfg-gateway__card-save"
                    disabled={!changed}
                    onClick={() => persistCard(gw.id, gw.nome)}
                  >
                    <i className="fa-light fa-floppy-disk" aria-hidden="true" /> Salva chiave
                  </button>
                </Tooltip>
              </div>

              <footer className="cfg-gateway__card-foot">
                <i className="fa-light fa-lock" aria-hidden="true" />
                La chiave è cifrata e vale solo per {struttura}.
              </footer>
            </article>
          )
        })}
      </div>

      <CfgSaveBar
        count={dirty}
        onSave={persist}
        onCancel={cancel}
        successMessage="Gateway salvati"
      />
    </div>
  )
}
