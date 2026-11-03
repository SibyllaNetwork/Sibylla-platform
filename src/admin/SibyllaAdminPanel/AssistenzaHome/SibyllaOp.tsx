import React, { useCallback, useEffect, useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import AlertBanner from '../../../core/components/AlertBanner'
import Button from '../../../core/components/Button/Button'
import StatusBadge from '../../../core/components/StatusBadge'
import TruncatedText from '../../../core/components/TruncatedText'
import { SearchField } from '../../../core/components/form'
import OpNuovaAzienda from '../../../modules/appop/OpNuovaAzienda'
import { formatoData, OpApiError, opAdminApi, type ClienteOp } from '../../../modules/appop/opApi'
import { nomeReparto } from '../../../modules/appop/opCatalogo'
import './SibyllaOp.sass'

// ─── SIBYLLA OP! ──────────────────────────────────────────────────────────────
//  Aziende dell'app Op! (Op.Api, /admin/indipendenti). Come sibyllaop.it/admin:
//  elenco delle aziende e "Nuova azienda" con dati, abbonamento, strutture,
//  reparti e moduli e l'amministratore invitato via email. Creata qui, dentro
//  Platform, l'azienda si può anche collegare a un'azienda di Sibylla Platform.
//  Il resto della gestione (amministratori, sospensione, eliminazione) resta su
//  sibyllaop.it/admin; strutture, camere e utenti li configura l'azienda su
//  sibyllaop.it/azienda.

interface Props {
  /** Dentro il pannello Sibylla Admin → Piattaforma: il titolo lo mostra già il pannello. */
  incorporata?: boolean
}

const SITO = 'https://sibyllaop.it'

const NOMI_PIANO: Record<string, string> = { base: 'Base', completo: 'Completo', personalizzato: 'Personalizzato' }

export default function SibyllaOp({ incorporata = false }: Props) {
  const [vista, setVista] = useState<'elenco' | 'nuova'>('elenco')
  const [aziende, setAziende] = useState<ClienteOp[] | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [cerca, setCerca] = useState('')

  const carica = useCallback(async () => {
    setErrore(null)
    try {
      setAziende(await opAdminApi.clienti())
    } catch (e) {
      setErrore(e instanceof OpApiError ? e.message : 'Elenco delle aziende non disponibile.')
    }
  }, [])

  useEffect(() => { carica() }, [carica])

  /** Aziende di Platform già collegate → azienda Op: il selettore della nuova azienda le segna come già usate. */
  const collegate = useMemo(
    () => new Map((aziende ?? []).filter(a => a.idAziendaPlatform).map(a => [a.idAziendaPlatform as number, a.ragioneSociale])),
    [aziende],
  )

  const filtrate = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    return (aziende ?? []).filter(a => !q || a.ragioneSociale.toLowerCase().includes(q) || (a.partitaIva ?? '').includes(q))
  }, [aziende, cerca])

  return (
    <div className="sibylla-op">
      {!incorporata && (
        <PageHead title="Sibylla Op!" subtitle="Aziende dell’app Op!: creazione e collegamento a Sibylla Platform." back={false} />
      )}

      {vista === 'nuova' ? (
        <OpNuovaAzienda collegate={collegate} onAnnulla={() => setVista('elenco')} onFine={() => { setVista('elenco'); carica() }} />
      ) : (
        <>
          <div className="sibylla-op__barra">
            <SearchField className="sibylla-op__cerca" placeholder="Ragione sociale o partita IVA" value={cerca}
              onChange={e => setCerca(e.target.value)} onClear={() => setCerca('')} />
            <Button icon="plus" onClick={() => setVista('nuova')}>Nuova azienda</Button>
          </div>

          {errore && <AlertBanner type="warning">{errore}</AlertBanner>}

          <div className="sib-table-wrap">
            <table className="sib-table sibylla-op__tabella">
              <thead>
                <tr>
                  <th>Azienda</th>
                  <th>P.IVA</th>
                  <th>Piano</th>
                  <th>Stato</th>
                  <th>Attiva dal</th>
                  <th>Utenti attivi</th>
                  <th>Reparti</th>
                  <th>Sibylla Platform</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {aziende === null && !errore && (
                  <tr><td colSpan={9} className="sib-empty">Caricamento…</td></tr>
                )}
                {aziende && filtrate.length === 0 && (
                  <tr><td colSpan={9} className="sib-empty">{aziende.length === 0 ? 'Nessuna azienda: crea la prima.' : 'Nessuna azienda corrisponde alla ricerca.'}</td></tr>
                )}
                {filtrate.map(a => {
                  const reparti = a.reparti.map(nomeReparto).join(', ')
                  return (
                    <tr key={a.id}>
                      <td><TruncatedText className="sibylla-op__nome" text={a.ragioneSociale} /></td>
                      <td className="sib-cell--muted">{a.partitaIva ?? '—'}</td>
                      <td>{NOMI_PIANO[a.piano] ?? a.piano}</td>
                      <td>{a.stato === 'attivo' ? <StatusBadge variant="success">Attiva</StatusBadge> : <StatusBadge variant="warning">Sospesa</StatusBadge>}</td>
                      <td className="sib-cell--muted">{formatoData(a.attivoDal)}</td>
                      <td>{a.dipendentiAttivi} su {a.dipendenti}</td>
                      <td><TruncatedText className="sibylla-op__reparti" text={reparti || '—'} /></td>
                      <td>{a.idAziendaPlatform ? <StatusBadge variant="info">Collegata · id {a.idAziendaPlatform}</StatusBadge> : <StatusBadge variant="disabled">Non collegata</StatusBadge>}</td>
                      <td>
                        <a className="sib-btn sib-btn--ghost sibylla-op__apri" href={`${SITO}/admin/azienda?id=${a.id}`} target="_blank" rel="noopener noreferrer">
                          Apri <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <p className="sibylla-op__intro">
            Amministratori, sospensione ed eliminazione delle aziende restano su <a href={`${SITO}/admin`} target="_blank" rel="noopener noreferrer">sibyllaop.it/admin</a>;
            strutture, camere, utenti, QR e totem li configura l’amministratore dell’azienda su <a href={`${SITO}/azienda`} target="_blank" rel="noopener noreferrer">sibyllaop.it/azienda</a>.
          </p>
        </>
      )}
    </div>
  )
}
