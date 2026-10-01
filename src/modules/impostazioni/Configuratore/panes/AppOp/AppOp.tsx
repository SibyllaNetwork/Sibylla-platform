import React, { useCallback, useEffect, useState } from 'react'
import AlertBanner from '../../../../../core/components/AlertBanner'
import Button from '../../../../../core/components/Button/Button'
import Tabs from '../../../../../core/components/Tabs'
import { toast } from '../../../../../core/components/Toast/useToast'
import { CfgSaveBar } from '../../../../../core/cfg'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import OpModuliEditor from '../../../../appop/OpModuliEditor'
import OpDipendenteModal from '../../../../appop/OpDipendenteModal'
import OpDipendentiTable from '../../../../appop/OpDipendentiTable'
import OpInvitoModal from '../../../../appop/OpInvitoModal'
import { appOpSibylla, type FonteAppOp } from '../../../../appop/appOpSibylla'
import type { RepartiModuli, RepartoOp } from '../../../../appop/opCatalogo'
import type { DipendenteOp, DipendenteRichiesta, InvitoOp } from '../../../../appop/opApi'
import './AppOp.sass'

// ─── APP OP! ──────────────────────────────────────────────────────────────────
//  Visibile con il modulo App Op! installato. Utenze dei dipendenti (reparto,
//  grado, responsabilità, HR) con il codice di invito con cui entrano nell'app,
//  e funzioni dell'app attive per ogni reparto.

const PANE_ID = 'app-op'

type Sezione = 'utenze' | 'moduli'

export default function AppOp() {
  const markDirty     = useConfiguratoreStore(s => s.markDirty)
  const resetDirty    = useConfiguratoreStore(s => s.resetDirty)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)

  const [sezione, setSezione] = useState<Sezione>('utenze')
  const [fonte, setFonte] = useState<FonteAppOp>('portal')
  const [azienda, setAzienda] = useState<string | undefined>()
  const [salvati, setSalvati] = useState<RepartiModuli>({})
  const [reparti, setReparti] = useState<RepartiModuli>({})
  const [dipendenti, setDipendenti] = useState<DipendenteOp[]>([])
  const [problema, setProblema] = useState<string | null>(null)
  const [modifica, setModifica] = useState<DipendenteOp | null | undefined>(undefined)
  const [invito, setInvito] = useState<{ invito: InvitoOp; nome: string } | null>(null)

  const carica = useCallback(async () => {
    try {
      const c = await appOpSibylla.leggi()
      setFonte(c.fonte)
      setAzienda(c.azienda)
      setSalvati(c.reparti)
      setReparti(c.reparti)
      setDipendenti(c.dipendenti)
      setProblema(null)
      if (c.dipendenti.length > 0) setCompletion(PANE_ID, 'configured')
    } catch (e) {
      setProblema(e instanceof Error ? e.message : 'Configurazione non disponibile.')
    }
  }, [setCompletion])

  useEffect(() => { carica() }, [carica])

  const modificati = JSON.stringify(salvati) === JSON.stringify(reparti) ? 0 : 1
  useEffect(() => { markDirty(PANE_ID, modificati) }, [modificati, markDirty])
  useEffect(() => () => { resetDirty() }, [resetDirty])

  const salvaModuli = async () => {
    await appOpSibylla.salvaModuli(reparti, fonte)
    setSalvati(reparti)
    resetDirty()
  }

  const salvaUtente = async (d: DipendenteRichiesta) => {
    const { invito: nuovo } = await appOpSibylla.salvaUtente(modifica?.id ?? null, d, fonte)
    toast.success(modifica ? 'Utenza aggiornata.' : `Utenza di ${d.nome} ${d.cognome} creata.`, 'App Op!')
    if (nuovo) setInvito({ invito: nuovo, nome: `${d.nome} ${d.cognome}` })
    setModifica(undefined)
    await carica()
  }

  const invita = async (d: DipendenteOp) => {
    try {
      setInvito({ invito: await appOpSibylla.invita(d.id, fonte), nome: `${d.nome} ${d.cognome}` })
      await carica()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Invito non inviato.', 'App Op!')
    }
  }

  const attivi = Object.keys(salvati) as RepartoOp[]

  return (
    <div className="app-op">
      {fonte === 'op' && (
        <AlertBanner type="info">
          Ambiente di prova di Op: utenze e moduli sono quelli dell’azienda {azienda ?? 'del simulatore'} nel simulatore di
          Sibylla. Gli inviti arrivano davvero via email e i dipendenti entrano nell’app.
        </AlertBanner>
      )}
      {fonte === 'prova' && (
        <AlertBanner type="warning">
          Dati di prova salvati in questo browser: il Portal non espone ancora le API dell’App Op! (inviti e moduli). Le utenze
          create qui non ricevono email e non entrano nell’app.
        </AlertBanner>
      )}
      {problema && <AlertBanner type="error">{problema}</AlertBanner>}

      <Tabs tabs={[{ id: 'utenze', label: `Utenze (${dipendenti.length})` }, { id: 'moduli', label: 'Reparti e moduli' }]} active={sezione} onChange={s => setSezione(s as Sezione)} />

      {sezione === 'utenze' && (
        <div className="app-op__sezione">
          <div className="app-op__bar">
            <p className="app-op__nota">
              Crea l’utenza del dipendente con reparto e grado: riceve un codice di invito via email, con cui crea la password
              nell’app ed entra direttamente nel suo reparto.
            </p>
            <Button icon="plus" onClick={() => setModifica(null)} disabled={attivi.length === 0}>Nuova utenza</Button>
          </div>
          <OpDipendentiTable dipendenti={dipendenti} onModifica={setModifica} onInvito={invita} />
          <p className="app-op__nota">Blocco ed eliminazione degli account seguono gli utenti di Sibylla Platform (Utenti e ruoli).</p>
        </div>
      )}

      {sezione === 'moduli' && (
        <div className="app-op__sezione">
          <p className="app-op__nota">Scegli le funzioni dell’app per ogni reparto: i dipendenti vedono solo quelle attive.</p>
          <OpModuliEditor value={reparti} onChange={setReparti} />
        </div>
      )}

      <CfgSaveBar
        className="app-op__savebar"
        count={modificati}
        onSave={salvaModuli}
        onCancel={() => setReparti(salvati)}
        successMessage="Reparti e moduli dell’App Op! salvati"
      />

      <OpDipendenteModal open={modifica !== undefined} dipendente={modifica} reparti={attivi} onClose={() => setModifica(undefined)} onSalva={salvaUtente} />
      <OpInvitoModal invito={invito?.invito ?? null} nome={invito?.nome ?? ''} onClose={() => setInvito(null)} />
    </div>
  )
}
