import React, { useMemo, useState } from 'react'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import { toast } from '../../../core/components/Toast/useToast'
import { SearchField, SelectField } from '../../../core/components/form'
import { useConfirmStore } from '../../../store/useConfirmStore'
import { useCatalogoStore } from '../../../store/useCatalogoStore'
import { useHrConfigStore, findById } from '../../../store/useHrConfigStore'
import {
  useCollaboratoriEsterniStore, chiaveOpEsterno, statoAutorizzazione, documentiMancanti, STATO_AUT_LABEL,
  type CollaboratoreEsterno, type StatoAutorizzazione,
} from '../../../store/useCollaboratoriEsterniStore'
import { useAnagraficaOpStore } from '../../../store/useAnagraficaOpStore'
import { useModuloAttivo } from '../../../hooks/useModuloAttivo'
import { nomeReparto } from '../../appop/opCatalogo'
import { formatoData, type InvitoOp } from '../../appop/opApi'
import OpInvitoModal from '../../appop/OpInvitoModal'
import { invitaDipendenteOp, useStrutturaOp } from '../../appop/invitoAnagrafica'
import { useStrutturaCorrente } from '../../../hooks/useStrutturaCorrente'
import { stampaBadge } from '../_badge/badgeEsterno'
import './EsterniTable.sass'

// ─── ARCHIVIO DEL PERSONALE › COLLABORATORI ESTERNI ──────────────────────────
//  Addetti delle ditte in appalto: azienda (fornitore di Purchasing), categoria,
//  reparti App Op!, periodo e stato dell'autorizzazione, documenti mancanti e
//  azione «Invita Op!» (modulo attivo + abilitato + autorizzazione in corso).

const fmt = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '—')
/** gg/mm/aa: il periodo sta per intero nella colonna. */
const fmtBreve = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}` : '—')

export default function EsterniTable({ navigate }: { navigate: (p: string) => void }) {
  const collaboratori = useCollaboratoriEsterniStore((s) => s.collaboratori)
  const remove = useCollaboratoriEsterniStore((s) => s.remove)
  const categorie = useHrConfigStore((s) => s.categorieEsterni)
  const fornitori = useCatalogoStore((s) => s.fornitori)
  const abilitazioni = useAnagraficaOpStore((s) => s.abilitazioni)
  const appOpAttivo = useModuloAttivo('app-op')
  const struttura = useStrutturaOp()
  const confirm = useConfirmStore((s) => s.confirm)
  const badgeCfg = useHrConfigStore((s) => s.badge)
  const { struttura: nomeStruttura } = useStrutturaCorrente()

  const [q, setQ] = useState('')
  const [azienda, setAzienda] = useState('')
  const [stato, setStato] = useState<StatoAutorizzazione | ''>('')
  const [invitando, setInvitando] = useState<string | null>(null)
  const [invito, setInvito] = useState<{ invito: InvitoOp; nome: string } | null>(null)

  const nomeAzienda = (id: string) => fornitori.find((f) => f.id === id)?.nome ?? '—'
  const righe = useMemo(() => collaboratori
    .filter((c) => !azienda || c.fornitoreId === azienda)
    .filter((c) => !stato || statoAutorizzazione(c) === stato)
    .filter((c) => !q || `${c.nome} ${c.cognome} ${c.email}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => `${a.cognome}${a.nome}`.localeCompare(`${b.cognome}${b.nome}`)),
  [collaboratori, azienda, stato, q])

  const invita = async (c: CollaboratoreEsterno) => {
    const abil = abilitazioni[chiaveOpEsterno(c.id)]
    const cat = findById(categorie, c.categoriaId)
    if (!abil || !cat) return
    setInvitando(c.id)
    try {
      const inv = await invitaDipendenteOp(chiaveOpEsterno(c.id), c, {
        ...abil, emailAziendale: c.email, livello: 'impiegato', hr: false, responsabile: false,
        reparti: abil.reparti.filter((r) => cat.repartiOp.includes(r)),
      }, struttura)
      setInvito({ invito: inv, nome: `${c.nome} ${c.cognome}` })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Invito non inviato.', 'Invita Op!')
    } finally {
      setInvitando(null)
    }
  }

  const stampa = async (c: CollaboratoreEsterno) => {
    try {
      await stampaBadge([{ collaboratore: c, azienda: fornitori.find((f) => f.id === c.fornitoreId), categoria: findById(categorie, c.categoriaId), struttura: nomeStruttura || 'Struttura' }], badgeCfg)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Stampa non riuscita.', 'Badge')
    }
  }

  const elimina = async (c: CollaboratoreEsterno) => {
    const ok = await confirm({
      title: 'Elimina collaboratore esterno',
      message: `Eliminare la scheda di ${c.nome} ${c.cognome}? L’eventuale utenza nell’App Op! va bloccata da Utenti e ruoli.`,
      confirmLabel: 'Elimina', danger: true,
    })
    if (ok) remove(c.id)
  }

  return (
    <div className="arch-est">
      <div className="arch-est__filters">
        <SearchField name="est-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per nome o email" />
        <SelectField name="est-az" label="Azienda" value={azienda} onChange={(e) => setAzienda(e.target.value)}
          options={[{ value: '', label: 'Tutte le aziende' }, ...fornitori.filter((f) => f.appalto).map((f) => ({ value: f.id, label: f.nome }))]} />
        <SelectField name="est-stato" label="Autorizzazione" value={stato} onChange={(e) => setStato(e.target.value as StatoAutorizzazione | '')}
          options={[{ value: '', label: 'Tutte' }, ...(Object.keys(STATO_AUT_LABEL) as StatoAutorizzazione[]).map((k) => ({ value: k, label: STATO_AUT_LABEL[k] }))]} />
      </div>

      <div className="sib-table-wrap">
        <table className="sib-table arch-est__table">
          <colgroup>
            <col className="arch-est__c-nome" /><col className="arch-est__c-az" /><col className="arch-est__c-cat" />
            <col className="arch-est__c-rep" /><col className="arch-est__c-aut" /><col className="arch-est__c-stato" /><col className="arch-est__c-act" />
          </colgroup>
          <thead>
            <tr>
              <th>Nominativo</th><th>Azienda</th><th>Categoria</th><th><TruncatedText text="Reparti App Op!" /></th>
              <th>Autorizzazione</th><th>Stato</th><th className="arch-est__th-act">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {righe.map((c) => {
              const cat = findById(categorie, c.categoriaId)
              const st = statoAutorizzazione(c)
              const mancanti = documentiMancanti(c, cat)
              const abil = abilitazioni[chiaveOpEsterno(c.id)]
              const invitabile = appOpAttivo && abil?.abilitato
              const autorizzato = st === 'attiva' || st === 'in-scadenza'
              return (
                <tr key={c.id}>
                  <td>
                    <span className="arch-est__nome">
                      {mancanti.length > 0 && (
                        <Tooltip variant="light" position="right" content={
                          <div className="arch-est__tip">
                            <strong>Documentazione incompleta</strong>
                            <ul>{mancanti.map((d) => <li key={d}>{d}</li>)}</ul>
                          </div>
                        }>
                          <button type="button" className="arch-est__warn" aria-label="Documentazione incompleta" onClick={() => navigate(`modifica-collaboratore-esterno:${c.id}`)}>
                            <i className="fa-solid fa-triangle-exclamation" />
                          </button>
                        </Tooltip>
                      )}
                      <TruncatedText text={`${c.cognome} ${c.nome}`} />
                      <span className="arch-est__tag">Esterno</span>
                    </span>
                  </td>
                  <td><TruncatedText text={nomeAzienda(c.fornitoreId)} /></td>
                  <td><TruncatedText text={cat?.nome ?? '—'} /></td>
                  <td><TruncatedText text={abil?.abilitato ? abil.reparti.map(nomeReparto).join(', ') || '—' : 'Non abilitato'} /></td>
                  <td><TruncatedText text={`${fmtBreve(c.autorizzatoDal)} – ${fmtBreve(c.autorizzatoAl)}`} full={`Dal ${fmt(c.autorizzatoDal)} al ${fmt(c.autorizzatoAl)}`} /></td>
                  <td><span className={`arch-est__badge arch-est__badge--${st}`}><TruncatedText text={STATO_AUT_LABEL[st]} /></span></td>
                  <td>
                    <div className="arch-est__acts">
                      <Tooltip text="Modifica">
                        <button className="sib-btn sib-btn--icon" aria-label={`Modifica ${c.nome} ${c.cognome}`} onClick={() => navigate(`modifica-collaboratore-esterno:${c.id}`)}>
                          <i className="fa-solid fa-pen" />
                        </button>
                      </Tooltip>
                      {invitabile && (
                        <Tooltip text={!autorizzato
                          ? `Invita Op! non disponibile: autorizzazione ${st === 'scaduta' ? 'scaduta' : 'non ancora attiva'}`
                          : abil.ultimoInvito
                            ? `Invita Op! — ultimo invito a ${abil.ultimoInvito.emailMascherata}, valido fino al ${formatoData(abil.ultimoInvito.scadeIl)}`
                            : `Invita Op! — invia il token di invito a ${c.email || 'email mancante'}`}>
                          <button className="sib-btn sib-btn--icon" aria-label={`Invita ${c.nome} ${c.cognome} all'App Op!`}
                            disabled={!autorizzato || invitando === c.id} onClick={() => invita(c)}>
                            <i className={`fa-solid ${invitando === c.id ? 'fa-spinner fa-spin' : 'fa-mobile-screen'}`} />
                          </button>
                        </Tooltip>
                      )}
                      <Tooltip text="Stampa badge">
                        <button className="sib-btn sib-btn--icon" aria-label={`Stampa badge di ${c.nome} ${c.cognome}`} onClick={() => stampa(c)}>
                          <i className="fa-solid fa-id-badge" />
                        </button>
                      </Tooltip>
                      <Tooltip text="Elimina">
                        <button className="sib-btn sib-btn--icon" aria-label={`Elimina ${c.nome} ${c.cognome}`} onClick={() => elimina(c)}>
                          <i className="fa-solid fa-trash-can" />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              )
            })}
            {righe.length === 0 && (
              <tr><td colSpan={7} className="sib-empty">Nessun collaboratore esterno.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <OpInvitoModal invito={invito?.invito ?? null} nome={invito?.nome ?? ''} onClose={() => setInvito(null)} />
    </div>
  )
}
