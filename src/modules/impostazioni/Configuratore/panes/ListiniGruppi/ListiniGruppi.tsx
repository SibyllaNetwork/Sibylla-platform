import React, { useEffect, useMemo, useState } from 'react'
import { CfgToolbar, CfgTable, CfgSaveBar, CfgLocked, CfgEmpty } from '../../../../../core/cfg'
import { SelectField, InputField, RadioGroup } from '../../../../../core/components/form'
import Tooltip from '../../../../../core/components/Tooltip'
import { useConfiguratoreStore, isUnlocked } from '../../../../../store/useConfiguratoreStore'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { configuratoreById } from '../../registry'
import ListiniCalendario from '../_listini/ListiniCalendario'
import {
  LST_STRUTTURE,
  LST_CATEGORIE,
  TIPI_LOTTO,
  contestoStruttura,
  contestoCategoria,
  seedGruppiConfig,
  tariffeVuote,
  fmtEuro,
  type GruppiConfig,
  type LottoRiga,
  type TariffeLotto,
  type TipoLotto,
  type DistribuzioneGruppi,
} from '../_listini/listiniData'
import { useStagionalitaStore, stagioniDaPeriodi } from '../Stagionalita/stagionalitaData'
import './ListiniGruppi.sass'

// ─── LISTINI GRUPPI (§4.18) ──────────────────────────────────────────────────
//  Contesto ALTERNATIVO Struttura ⇆ Categoria (selezionata una, l'altra si
//  disabilita e diventa grigia), parametro Distribuzione (per camera / per
//  persona), tabella dei lotti con Tariffa/Suppl. adulti e studenti sulla
//  stagionalità selezionata, calendario con le tariffe alle relative
//  stagionalità gruppi. Gating: Stagionalità gruppi completata (primo scudo
//  nella shell; qui la difesa per i mount fuori dalla shell).

const PANE_ID = 'listini-gruppi'

type CampoTariffa = keyof TariffeLotto

const CAMPI: { key: CampoTariffa; label: string }[] = [
  { key: 'tariffaAdulti',   label: 'Tariffa adulti' },
  { key: 'supplAdulti',     label: 'Suppl. adulti' },
  { key: 'tariffaStudenti', label: 'Tariffa studenti' },
  { key: 'supplStudenti',   label: 'Suppl. studenti' },
]

// Modifiche pendenti: distribuzioni cambiate + lotti aggiunti/rimossi/variati
function countGruppiDiff(saved: GruppiConfig, draft: GruppiConfig): number {
  let n = 0
  const contesti = new Set([...Object.keys(saved.lotti), ...Object.keys(draft.lotti)])
  contesti.forEach(ctx => {
    if ((saved.distribuzione[ctx] ?? 'camera') !== (draft.distribuzione[ctx] ?? 'camera')) n += 1
    const before = saved.lotti[ctx] ?? []
    const after = draft.lotti[ctx] ?? []
    const beforeById = new Map(before.map(l => [l.id, l]))
    const afterIds = new Set(after.map(l => l.id))
    after.forEach(l => {
      const prev = beforeById.get(l.id)
      if (!prev) n += 1
      else if (JSON.stringify(prev) !== JSON.stringify(l)) n += 1
    })
    before.forEach(l => { if (!afterIds.has(l.id)) n += 1 })
  })
  return n
}

export default function ListiniGruppi() {
  const completion    = useConfiguratoreStore(s => s.completion)
  const markDirty     = useConfiguratoreStore(s => s.markDirty)
  const resetDirty    = useConfiguratoreStore(s => s.resetDirty)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)
  const confirm       = useConfirmStore(s => s.confirm)

  // Stagionalità EFFETTIVAMENTE configurate per il segmento Gruppi nel
  // configuratore Stagionalità (che sblocca questo pane): nessun elenco proprio.
  const periodiGruppi = useStagionalitaStore(s => s.periodi.gruppi)
  const stagioni      = useMemo(() => stagioniDaPeriodi(periodiGruppi), [periodiGruppi])

  // Selezione ALTERNATIVA: struttura O categoria (mai entrambe)
  const [strutturaId, setStrutturaId] = useState(LST_STRUTTURE[0].id)
  const [categoriaId, setCategoriaId] = useState('')
  const [stagioneId, setStagioneId]   = useState(() => stagioni[0]?.id ?? '')
  const [tipoFiltro, setTipoFiltro]   = useState<'tutti' | TipoLotto>('tutti')

  const [saved, setSaved] = useState<GruppiConfig>(() => seedGruppiConfig(stagioni))
  const [draft, setDraft] = useState<GruppiConfig>(saved)

  const contesto = strutturaId
    ? contestoStruttura(strutturaId)
    : categoriaId ? contestoCategoria(categoriaId) : null

  const stagione = stagioni.find(s => s.id === stagioneId) ?? stagioni[0]
  const lotti = contesto ? draft.lotti[contesto] ?? [] : []
  const distribuzione: DistribuzioneGruppi = contesto
    ? draft.distribuzione[contesto] ?? 'camera'
    : 'camera'

  const lottiVisibili = tipoFiltro === 'tutti' ? lotti : lotti.filter(l => l.tipo === tipoFiltro)

  const dirtyCount = useMemo(() => countGruppiDiff(saved, draft), [saved, draft])

  useEffect(() => {
    markDirty(PANE_ID, dirtyCount)
  }, [dirtyCount, markDirty])

  // ── Gating (difesa nel pane: la shell mostra già CfgLocked prima del mount)
  if (!isUnlocked(completion, PANE_ID)) {
    const def = configuratoreById(PANE_ID)
    const requirement = def?.requires ? configuratoreById(def.requires.id) : undefined
    return (
      <CfgLocked
        title={def?.label ?? 'Listini gruppi'}
        requirementLabel={requirement?.label ?? 'Stagionalità'}
        reason={def?.requires?.reason ?? 'Richiede la Stagionalità Gruppi completata.'}
      />
    )
  }

  // Nessun periodo Gruppi a calendario: il pane non ha stagioni su cui tariffare.
  if (!stagione) {
    return (
      <CfgEmpty
        icon="calendar-xmark"
        title="Nessuna stagionalità Gruppi a calendario"
        subtitle="Configura i periodi del segmento Gruppi in Stagionalità: le tariffe dei lotti si appoggiano a quelle stagioni."
      />
    )
  }

  const updateLotto = (lottoId: string, updater: (l: LottoRiga) => LottoRiga) => {
    if (!contesto) return
    setDraft(d => ({
      ...d,
      lotti: {
        ...d.lotti,
        [contesto]: (d.lotti[contesto] ?? []).map(l => (l.id === lottoId ? updater(l) : l)),
      },
    }))
  }

  const setTariffa = (lottoId: string, campo: CampoTariffa, value: number) => {
    updateLotto(lottoId, l => ({
      ...l,
      tariffe: {
        ...l.tariffe,
        [stagioneId]: { ...(l.tariffe[stagioneId] ?? tariffeVuote(stagioni)[stagioneId]), [campo]: value },
      },
    }))
  }

  const setDistribuzione = (value: DistribuzioneGruppi) => {
    if (!contesto) return
    setDraft(d => ({ ...d, distribuzione: { ...d.distribuzione, [contesto]: value } }))
  }

  const addLotto = () => {
    if (!contesto) return
    const nuovo: LottoRiga = {
      id: `${contesto}-${Date.now()}`,
      nome: 'Nuovo lotto',
      tipo: 'Standard',
      tariffe: tariffeVuote(stagioni),
    }
    setDraft(d => ({
      ...d,
      lotti: { ...d.lotti, [contesto]: [...(d.lotti[contesto] ?? []), nuovo] },
    }))
  }

  const removeLotto = async (lotto: LottoRiga) => {
    if (!contesto) return
    const ok = await confirm({
      title: 'Elimina lotto',
      message: `Eliminare il lotto "${lotto.nome}" e le sue tariffe per tutte le stagionalità?`,
      confirmLabel: 'Elimina',
      danger: true,
    })
    if (!ok) return
    setDraft(d => ({
      ...d,
      lotti: { ...d.lotti, [contesto]: (d.lotti[contesto] ?? []).filter(l => l.id !== lotto.id) },
    }))
  }

  const save = async () => {
    // Persistenza simulata (nessun backend in questa fase del rifacimento)
    await new Promise(resolve => setTimeout(resolve, 400))
    setSaved(draft)
    resetDirty()
    const completo = Object.values(draft.lotti).every(list =>
      list.every(l => stagioni.every(s => {
        const t = l.tariffe[s.id]
        return t != null && t.tariffaAdulti > 0 && t.tariffaStudenti > 0
      })))
    setCompletion(PANE_ID, completo ? 'configured' : 'partial')
  }

  const cancel = () => {
    setDraft(saved)
    resetDirty()
  }

  // Cella del calendario: tariffa adulti / studenti del lotto nella stagione
  const cellaCalendario = (lottoId: string, stagId: string) => {
    const lotto = lotti.find(l => l.id === lottoId)
    const t = lotto?.tariffe[stagId]
    if (!t || (t.tariffaAdulti <= 0 && t.tariffaStudenti <= 0)) return null
    return {
      text: `${fmtEuro(t.tariffaAdulti)} / ${fmtEuro(t.tariffaStudenti)}`,
      tooltip: `Adulti ${fmtEuro(t.tariffaAdulti)} (suppl. ${fmtEuro(t.supplAdulti)}) · Studenti ${fmtEuro(t.tariffaStudenti)} (suppl. ${fmtEuro(t.supplStudenti)})`,
    }
  }

  const unitaLabel = distribuzione === 'camera' ? 'per camera' : 'per persona'

  return (
    <div className="listini-gruppi">
      <CfgToolbar
        className="listini-gruppi__ambito"
        actions={(
          <button type="button" className="sib-btn sib-btn--secondary" onClick={addLotto} disabled={!contesto}>
            <i className="fa-solid fa-plus" aria-hidden="true" />
            Aggiungi lotto
          </button>
        )}
      >
        <SelectField
          name="struttura"
          label="Struttura"
          value={strutturaId}
          disabled={categoriaId !== ''}
          hint={categoriaId !== '' ? 'In alternativa alla categoria' : undefined}
          onChange={e => { setStrutturaId(e.target.value); if (e.target.value) setCategoriaId('') }}
          options={[
            { value: '', label: '—' },
            ...LST_STRUTTURE.map(s => ({ value: s.id, label: s.nome })),
          ]}
        />
        <SelectField
          name="categoria"
          label="Categoria"
          value={categoriaId}
          disabled={strutturaId !== ''}
          hint={strutturaId !== '' ? 'In alternativa alla struttura' : undefined}
          onChange={e => { setCategoriaId(e.target.value); if (e.target.value) setStrutturaId('') }}
          options={[
            { value: '', label: '—' },
            ...LST_CATEGORIE.map(c => ({ value: c.id, label: c.nome })),
          ]}
        />
        <RadioGroup
          name="distribuzione"
          label="Distribuzione"
          value={distribuzione}
          disabled={!contesto}
          onChange={v => setDistribuzione(v as DistribuzioneGruppi)}
          options={[
            { value: 'camera',  label: 'Per camera',  tooltip: 'Tariffa in funzione della camera' },
            { value: 'persona', label: 'Per persona', tooltip: 'Tariffa in funzione del numero di persone' },
          ]}
        />
        <SelectField
          name="tipo-lotto"
          label="Tipo lotto"
          value={tipoFiltro}
          onChange={e => setTipoFiltro(e.target.value as 'tutti' | TipoLotto)}
          options={[
            { value: 'tutti', label: 'Tutti' },
            ...TIPI_LOTTO.map(t => ({ value: t, label: t })),
          ]}
        />
        <SelectField
          name="stagionalita"
          label="Stagionalità"
          value={stagioneId}
          onChange={e => setStagioneId(e.target.value)}
          options={stagioni.map(s => ({ value: s.id, label: `${s.nome} · ${s.periodo}` }))}
        />
      </CfgToolbar>

      {contesto == null ? (
        <CfgEmpty
          icon="users"
          title="Seleziona una struttura o una categoria"
          subtitle="I listini gruppi si configurano su una struttura oppure su una categoria di strutture: la selezione è alternativa."
        />
      ) : (
        <>
          <p className="listini-gruppi__caption">
            Tariffe {unitaLabel} · stagionalità {stagione.nome} ({stagione.periodo})
          </p>

          <CfgTable
            columns={[
              { key: 'lotto', label: 'Lotto', width: '24%' },
              { key: 'tipo',  label: 'Tipo',  width: '15%' },
              ...CAMPI.map(c => ({ key: c.key, label: c.label, width: '13.25%', align: 'right' as const })),
              { key: 'azioni', label: '', width: '8%', align: 'center' as const },
            ]}
            empty={<span>Nessun lotto per questo filtro</span>}
          >
            {lottiVisibili.map(lotto => {
              const t = lotto.tariffe[stagioneId] ?? tariffeVuote(stagioni)[stagioneId]
              return (
                <tr key={lotto.id}>
                  <td>
                    <InputField
                      name={`nome-${lotto.id}`}
                      value={lotto.nome}
                      onChange={e => updateLotto(lotto.id, l => ({ ...l, nome: e.target.value }))}
                      className="listini-gruppi__nome"
                    />
                  </td>
                  <td>
                    <SelectField
                      name={`tipo-${lotto.id}`}
                      value={lotto.tipo}
                      onChange={e => updateLotto(lotto.id, l => ({ ...l, tipo: e.target.value as TipoLotto }))}
                      options={TIPI_LOTTO.map(tp => ({ value: tp, label: tp }))}
                    />
                  </td>
                  {CAMPI.map(campo => (
                    <td key={campo.key} className="listini-gruppi__tariffa-cell">
                      <InputField
                        name={`${campo.key}-${lotto.id}`}
                        type="number"
                        min={0}
                        step={1}
                        placeholder="0"
                        value={t[campo.key] === 0 ? '' : t[campo.key]}
                        onChange={e => setTariffa(lotto.id, campo.key, Number(e.target.value) || 0)}
                        className="listini-gruppi__tariffa"
                      />
                    </td>
                  ))}
                  <td className="listini-gruppi__azioni">
                    <Tooltip text="Elimina lotto">
                      <button
                        type="button"
                        className="sib-btn sib-btn--icon"
                        aria-label={`Elimina ${lotto.nome}`}
                        onClick={() => { void removeLotto(lotto) }}
                      >
                        <i className="fa-solid fa-trash-can" aria-hidden="true" />
                      </button>
                    </Tooltip>
                  </td>
                </tr>
              )
            })}
          </CfgTable>

          <section className="listini-gruppi__calendario">
            <h3 className="listini-gruppi__calendario-title">Calendario tariffe</h3>
            <p className="listini-gruppi__calendario-sub">
              Tariffe {unitaLabel} alle relative stagionalità gruppi
            </p>
            <ListiniCalendario
              firstColLabel="Lotto"
              seasons={stagioni}
              rows={lotti.map(l => ({ id: l.id, label: l.nome }))}
              value={cellaCalendario}
              activeSeasonId={stagioneId}
              legend="Tariffa adulti / tariffa studenti — supplementi nel dettaglio all'hover"
            />
          </section>
        </>
      )}

      <CfgSaveBar
        count={dirtyCount}
        onSave={save}
        onCancel={cancel}
        successMessage="Listini gruppi salvati"
        errorMessage="Salvataggio dei listini non riuscito. Riprova."
      />
    </div>
  )
}
