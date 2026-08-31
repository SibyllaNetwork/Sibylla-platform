import React, { useEffect, useMemo, useState } from 'react'
import { CfgToolbar, CfgTable, CfgSaveBar, CfgEmpty } from '../../../../../core/cfg'
import { SelectField, InputField } from '../../../../../core/components/form'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import ListiniCalendario from '../_listini/ListiniCalendario'
import ListiniOpzioneErrore from '../_listini/ListiniOpzioneErrore'
import type { CfgPaneComponentProps } from '../../Configuratore'
import {
  LST_STRUTTURE,
  LST_CAMERE,
  LST_TIPOLOGIE,
  keyInd,
  fmtEuro,
  tipologiaNome,
  seedPrezziIndividuali,
} from '../_listini/listiniData'
import { useStagionalitaStore, stagioniDaPeriodi } from '../Stagionalita/stagionalitaData'
import { exportListiniIndividualiPdf } from './listiniIndividualiPdf'
import './ListiniIndividuali.sass'

// ─── LISTINI INDIVIDUALI (§4.17) ─────────────────────────────────────────────
//  Contesto in alto (Struttura + Stagionalità B2B) → a sinistra la sezione
//  "Camere Hotel" con i NOMI ASSOCIATI DALLA STRUTTURA (mai lo standard
//  Sibylla) e la tariffa editabile per camera; a destra il riepilogo
//  calendario per tipologia × stagionalità (prezzo della stessa tipologia
//  nelle diverse stagioni). Il funzionale prevede il blocco fino alla
//  Stagionalità B2B: la pagina si apre sempre sui contenuti e quello stato
//  resta consultabile nel box «Opzione errore» in fondo al pane.

const PANE_ID = 'listini-individuali'

export default function ListiniIndividuali({ onGoTo }: CfgPaneComponentProps) {
  const markDirty     = useConfiguratoreStore(s => s.markDirty)
  const resetDirty    = useConfiguratoreStore(s => s.resetDirty)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)

  // Le stagionalità sono quelle EFFETTIVAMENTE configurate per il segmento B2B
  // nel configuratore Stagionalità (che sblocca questo pane): stesse etichette,
  // stessi periodi, nessun elenco proprio.
  const periodiB2b = useStagionalitaStore(s => s.periodi.b2b)
  const stagioni   = useMemo(() => stagioniDaPeriodi(periodiB2b), [periodiB2b])

  const [strutturaId, setStrutturaId] = useState(LST_STRUTTURE[0].id)
  const [stagioneId, setStagioneId]   = useState(() => stagioni[0]?.id ?? '')

  const [saved, setSaved] = useState<Record<string, number>>(() => seedPrezziIndividuali(stagioni))
  const [draft, setDraft] = useState<Record<string, number>>(saved)

  const camere = LST_CAMERE[strutturaId] ?? []
  const struttura = LST_STRUTTURE.find(s => s.id === strutturaId)
  const stagione = stagioni.find(s => s.id === stagioneId) ?? stagioni[0]

  // Tipologie presenti nella struttura, nell'ordine dello standard
  const tipologie = useMemo(
    () => LST_TIPOLOGIE.filter(t => camere.some(c => c.tipologiaId === t.id)),
    [camere],
  )

  // ── Dirty state: celle (struttura × stagione × camera) diverse dal salvato
  const dirtyCount = useMemo(() => {
    const keys = new Set([...Object.keys(saved), ...Object.keys(draft)])
    let n = 0
    keys.forEach(k => { if ((saved[k] ?? 0) !== (draft[k] ?? 0)) n += 1 })
    return n
  }, [saved, draft])

  useEffect(() => {
    markDirty(PANE_ID, dirtyCount)
  }, [dirtyCount, markDirty])

  // Nessun periodo B2B a calendario: il pane non ha colonne su cui lavorare.
  if (!stagione) {
    return (
      <CfgEmpty
        icon="calendar-xmark"
        title="Nessuna stagionalità B2B a calendario"
        subtitle="Configura i periodi del segmento B2B in Stagionalità: i listini si costruiscono su quelle stagioni."
      />
    )
  }

  const setPrezzo = (cameraId: string, value: number) => {
    setDraft(d => ({ ...d, [keyInd(strutturaId, stagioneId, cameraId)]: value }))
  }

  // Cella del calendario: prezzo della tipologia nella stagione (se le camere
  // della stessa tipologia hanno prezzi diversi → intervallo min–max).
  const cellaCalendario = (tipologiaId: string, stagId: string) => {
    const valori = camere
      .filter(c => c.tipologiaId === tipologiaId)
      .map(c => draft[keyInd(strutturaId, stagId, c.id)])
      .filter((v): v is number => v != null && v > 0)
    if (valori.length === 0) return null
    const min = Math.min(...valori)
    const max = Math.max(...valori)
    const text = min === max ? fmtEuro(min) : `${fmtEuro(min)}–${fmtEuro(max)}`
    const nomi = camere.filter(c => c.tipologiaId === tipologiaId).map(c => c.nomeLocale).join(', ')
    return { text, tooltip: `${tipologiaNome(tipologiaId)} · ${nomi}` }
  }

  const save = async () => {
    // Persistenza simulata (nessun backend in questa fase del rifacimento)
    await new Promise(resolve => setTimeout(resolve, 400))
    setSaved(draft)
    resetDirty()
    const completo = LST_STRUTTURE.every(s =>
      stagioni.every(st =>
        (LST_CAMERE[s.id] ?? []).every(c => (draft[keyInd(s.id, st.id, c.id)] ?? 0) > 0)))
    setCompletion(PANE_ID, completo ? 'configured' : 'partial')
  }

  const cancel = () => {
    setDraft(saved)
    resetDirty()
  }

  const scaricaPdf = () => {
    exportListiniIndividualiPdf({
      strutturaId,
      strutturaNome: struttura?.nome ?? strutturaId,
      stagioneSelezionata: stagione,
      stagioni,
      camere,
      prezzi: draft,
    })
  }

  return (
    <div className="listini-individuali">
      <CfgToolbar
        actions={(
          <button type="button" className="sib-btn sib-btn--secondary" onClick={scaricaPdf}>
            <i className="fa-regular fa-file-pdf" aria-hidden="true" />
            Scarica PDF
          </button>
        )}
      >
        <SelectField
          name="struttura"
          label="Struttura"
          value={strutturaId}
          onChange={e => setStrutturaId(e.target.value)}
          options={LST_STRUTTURE.map(s => ({ value: s.id, label: s.nome }))}
        />
        <SelectField
          name="stagionalita"
          label="Stagionalità"
          value={stagioneId}
          onChange={e => setStagioneId(e.target.value)}
          options={stagioni.map(s => ({ value: s.id, label: `${s.nome} · ${s.periodo}` }))}
        />
      </CfgToolbar>

      {/* Oltre tre stagionalità il calendario non sta in colonna laterale:
          passa a larghezza piena, così le intestazioni restano su una riga
          senza troncature e senza scroll orizzontale. */}
      <div className={'listini-individuali__grid' + (stagioni.length > 3 ? ' listini-individuali__grid--stacked' : '')}>
        <section className="listini-individuali__card">
          <h3 className="listini-individuali__card-title">Camere Hotel</h3>
          <p className="listini-individuali__card-sub">
            Nomi come associati dalla struttura (non lo standard Sibylla) · tariffa della stagionalità {stagione.nome}
          </p>
          <CfgTable
            columns={[
              { key: 'camera',    label: 'Camera',    width: '42%' },
              { key: 'tipologia', label: 'Tipologia', width: '28%' },
              { key: 'tariffa',   label: 'Tariffa',   width: '30%', align: 'right' },
            ]}
            empty={<span>Nessuna camera associata dalla struttura</span>}
          >
            {camere.map(cam => {
              const value = draft[keyInd(strutturaId, stagioneId, cam.id)] ?? 0
              return (
                <tr key={cam.id}>
                  <td>
                    <TruncatedText text={cam.nomeLocale} className="listini-individuali__camera" />
                  </td>
                  <td className="listini-individuali__tipologia">{tipologiaNome(cam.tipologiaId)}</td>
                  <td className="listini-individuali__prezzo-cell">
                    <span className="listini-individuali__prezzo">
                      <InputField
                        name={`prezzo-${cam.id}`}
                        type="number"
                        min={0}
                        step={1}
                        placeholder="0"
                        value={value === 0 ? '' : value}
                        onChange={e => setPrezzo(cam.id, Number(e.target.value) || 0)}
                        className="listini-individuali__prezzo-input"
                      />
                      <span className="listini-individuali__unit">€</span>
                    </span>
                  </td>
                </tr>
              )
            })}
          </CfgTable>
        </section>

        <section className="listini-individuali__card">
          <h3 className="listini-individuali__card-title">Riepilogo calendario</h3>
          <p className="listini-individuali__card-sub">
            Prezzo della stessa tipologia nelle diverse stagionalità
          </p>
          <ListiniCalendario
            firstColLabel="Tipologia"
            seasons={stagioni}
            rows={tipologie.map(t => ({ id: t.id, label: t.nome }))}
            value={cellaCalendario}
            activeSeasonId={stagioneId}
            legend="Intervallo min–max quando camere della stessa tipologia hanno tariffe diverse"
          />
        </section>
      </div>

      <ListiniOpzioneErrore
        paneLabel="Listini individuali"
        requirementLabel="Stagionalità B2B"
        reason="Richiede la Stagionalità B2B completata: i listini individuali si agganciano ai periodi stagionali."
        onGoToRequirement={onGoTo ? () => onGoTo('stagionalita') : undefined}
      />

      <CfgSaveBar
        count={dirtyCount}
        onSave={save}
        onCancel={cancel}
        successMessage="Listini individuali salvati"
        errorMessage="Salvataggio dei listini non riuscito. Riprova."
      />
    </div>
  )
}
