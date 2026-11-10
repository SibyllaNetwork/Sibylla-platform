// ─── Magazzino ristorazione: cornice comune delle pagine ─────────────────────
//  Intestazione standard (PageHead), selettore della struttura di Op se ce n'è
//  più di una, e i tre stati del § B4: caricamento, azienda non collegata,
//  Op non raggiungibile con "Riprova". Le pagine ricevono il contesto pronto.

import React, { useEffect, useMemo } from 'react'
import PageHead from '../../../../../core/components/PageHead'
import EmptyState from '../../../../../core/components/EmptyState'
import Skeleton from '../../../../../core/components/Skeleton'
import { SelectField } from '../../../../../core/components/form'
import { PAGE_SUBTITLES } from '../../../../../navigation/pageSubtitles'
import { useStrutturaCorrente } from '../../../../../hooks/useStrutturaCorrente'
import { CLIENTS_INIT } from '../../../../../admin/SibyllaAdminPanel/constants'
import { DATI_DIMOSTRATIVI, impostaStrutturaDemo, NON_RAGGIUNGIBILE } from '../api/magazzinoFbOp'
import type { Contesto, Punto } from '../api/tipi'
import { useMagazzinoFb } from './useMagazzinoFb'
import './MagShell.sass'

export interface MagCtx {
  contesto: Contesto
  idStruttura: number
  gestore: boolean
  /** Punti della struttura scelta (anche disattivati: le pagine filtrano se serve). */
  punti: Punto[]
  puntiAttivi: Punto[]
}

interface Props {
  page: string
  title: string
  className?: string
  actions?: (ctx: MagCtx) => React.ReactNode
  children: (ctx: MagCtx) => React.ReactNode
}

export default function MagShell({ page, title, className, actions, children }: Props) {
  const { struttura } = useStrutturaCorrente()
  const { stato, errore, contesto, idStruttura, carica, setStruttura } = useMagazzinoFb()

  // La rotta demo di Op lavora sulla struttura di Platform selezionata in alto.
  useEffect(() => {
    const c = CLIENTS_INIT.find(x => x.nome === struttura)
    impostaStrutturaDemo(c ? { id: c.id, nome: c.nome } : null)
    carica(struttura ?? '', false, c?.id ?? null)
  }, [struttura, carica])

  const ctx = useMemo<MagCtx | null>(() => {
    if (stato !== 'pronto' || !contesto || idStruttura == null) return null
    const punti = contesto.punti.filter(p => p.id_struttura === idStruttura)
    return { contesto, idStruttura, gestore: contesto.permessi.gestore, punti, puntiAttivi: punti.filter(p => p.attivo) }
  }, [stato, contesto, idStruttura])

  const selettore = ctx && ctx.contesto.strutture.length > 1 && (
    <SelectField
      name="mag-struttura" ariaLabel="Struttura" className="magshell__struttura"
      value={ctx.idStruttura}
      options={ctx.contesto.strutture.map(s => ({ value: s.id, label: s.nome }))}
      onChange={e => setStruttura(Number(e.target.value))}
    />
  )

  return (
    <div className={`magshell ${className ?? ''}`}>
      <PageHead
        title={title}
        subtitle={PAGE_SUBTITLES[page]}
        actions={ctx && (
          <div className="magshell__azioni">
            {selettore}
            {actions?.(ctx)}
          </div>
        )}
      />

      {(stato === 'iniziale' || stato === 'caricamento') && (
        <div className="magshell__attesa"><Skeleton count={8} /></div>
      )}

      {stato === 'non-collegata' && (
        <div className="magshell__stato">
          <EmptyState
            icon="warehouse"
            title="Magazzino non attivo"
            subtitle="Il magazzino della ristorazione non è attivo per la tua azienda: verifica che il modulo Ristorazione sia attivo o contatta l'assistenza Sibylla."
          />
        </div>
      )}

      {stato === 'errore' && (
        <div className="magshell__stato">
          <EmptyState
            icon="plug-circle-xmark"
            title="Magazzino non raggiungibile"
            subtitle={errore && errore !== NON_RAGGIUNGIBILE ? errore : 'Il collegamento con il gestionale non risponde: riprova tra poco.'}
            action={(
              <button type="button" className="sib-btn sib-btn--primary" onClick={() => carica(struttura ?? '', true, CLIENTS_INIT.find(x => x.nome === struttura)?.id ?? null)}>
                <i className="fa-solid fa-rotate-right" aria-hidden="true" /> Riprova
              </button>
            )}
          />
        </div>
      )}

      {ctx && DATI_DIMOSTRATIVI && (
        <p className="magshell__demo">
          <i className="fa-solid fa-flask" aria-hidden="true" /> Dati dimostrativi: le modifiche restano solo in questa pagina e si perdono ricaricandola.
        </p>
      )}
      {ctx && <div className="magshell__corpo">{children(ctx)}</div>}
    </div>
  )
}
