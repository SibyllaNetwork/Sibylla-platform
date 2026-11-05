import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import PageHead from '../../../core/components/PageHead'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import { apiFetchSibylla } from '../../../services/api'
import { avatarUrl } from '../../../core/avatar'
import { setEditingAnagrafica } from '../CreaAnagrafica/_state'
import { useContrattiPersonaleStore, type ContrattoPersonale } from '../../../store/useContrattiPersonaleStore'
import Tabs from '../../../core/components/Tabs'
import EsterniTable from './EsterniTable'
import { useCollaboratoriEsterniStore } from '../../../store/useCollaboratoriEsterniStore'
import './ArchivioPersonale.sass'
import TruncatedText from '../../../core/components/TruncatedText'
import { toast } from '../../../core/components/Toast/useToast'
import { useHrConfigStore, findById, oreSettimanaliOrario } from '../../../store/useHrConfigStore'
import { useAnagraficaOpStore } from '../../../store/useAnagraficaOpStore'
import { useModuloAttivo } from '../../../hooks/useModuloAttivo'
import { invitaDipendenteOp, useStrutturaOp } from '../../appop/invitoAnagrafica'
import { formatoData, type InvitoOp } from '../../appop/opApi'
import OpInvitoModal from '../../appop/OpInvitoModal'
import { InputField } from '../../../core/components/form'
import { useConfirmStore } from '../../../store/useConfirmStore'
import { useAnagrafichePersonaleStore } from '../../../store/useAnagrafichePersonaleStore'
import { type PersonaleItem, elencoDemo, backendNonRaggiungibile, messaggioErrore } from './personaleDemo'

// yyyy-mm-dd → dd/mm/yyyy
const fmtDate = (iso?: string) => {
  if (!iso) return '—'
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

// ─── PDF: visualizza / scarica / stampa (data-URL) ────────────────────────────
const viewPdf = (url: string) => window.open(url, '_blank')
const downloadPdf = (url: string, name?: string) => {
  const a = document.createElement('a')
  a.href = url
  a.download = name || 'contratto.pdf'
  document.body.appendChild(a)
  a.click()
  a.remove()
}
const printPdf = (url: string, name?: string) => {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`<title>${name || 'contratto'}</title><iframe src="${url}" style="border:0;width:100%;height:100vh" onload="setTimeout(()=>{try{this.contentWindow.focus();this.contentWindow.print()}catch(e){}},300)"></iframe>`)
  w.document.close()
}

// dd/mm/yyyy → yyyy-mm-dd (per il date input della scheda)
const toIsoDate = (d?: string) => {
  if (!d) return ''
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : d
}

/**
 * Archivio del personale — replica `Views/HumanResource/AnagraficaPersonale.cshtml`.
 * BE Razor: `AnagraficaPersonaleController.GetPersonale` → catch-all
 * `/Sibylla/anagrafica-personale/GetAll`.
 */

// Documenti obbligatori del fascicolo dipendente. Il "Contratto di lavoro" NON
// è qui: è gestito nella sezione "Contratti del personale" (colonna PDF dedicata).
const REQUIRED_DOCS = [
  { key: 'identita',      label: "Documento d'identità" },
  { key: 'codiceFiscale', label: 'Codice fiscale / Tessera sanitaria' },
  { key: 'privacy',       label: 'Informativa privacy' },
  { key: 'sicurezza',     label: 'Formazione sicurezza' },
] as const

// Il "Contratto di lavoro" fa parte del fascicolo come gli altri documenti, ma
// la sua presenza si valuta dallo storico contratti (sezione "Contratti del
// personale"), non da un file caricato tra i documenti allegati.
const FASCICOLO_ITEM_CONTRATTO = { key: 'contratto', label: 'Contratto di lavoro' }
const FASCICOLO_TOTALE = REQUIRED_DOCS.length + 1

const docMancantiList = (p: PersonaleItem) =>
  REQUIRED_DOCS.filter((d) => !p.documenti?.[d.key])

// Elementi del fascicolo mancanti = documenti allegati mancanti + contratto (se assente).
const fascicoloMancanti = (p: PersonaleItem, hasContratto: boolean): { key: string; label: string }[] => {
  const miss: { key: string; label: string }[] = docMancantiList(p).map((d) => ({ key: d.key, label: d.label }))
  if (!hasContratto) miss.push(FASCICOLO_ITEM_CONTRATTO)
  return miss
}

// `short` = intestazione abbreviata (tooltip col nome intero), `w` = larghezza in %
// (riportata in ArchivioPersonale.sass sulle classi `arch-pers__col--<key>`):
// la tabella è a layout fisso e non scorre mai in orizzontale.
type Col = { key: string; label: string; short?: string; w: string; filter?: boolean }
const COLS: Col[] = [
  { key: 'matricola',     label: 'Matricola N°',        short: 'Matr.',  w: '7%' },
  { key: 'nome',          label: 'Nome',                                 w: '9%',  filter: true },
  { key: 'cognome',       label: 'Cognome',                              w: '8%',  filter: true },
  { key: 'reparto',       label: 'Reparto',                              w: '10%', filter: true },
  { key: 'telefono',      label: 'Contatto telefonico', short: 'Tel.',   w: '9%', filter: true },
  { key: 'nato_il',       label: 'Nato il',                              w: '7%' },
  { key: 'codice_fiscale',label: 'Codice Fiscale',      short: 'C.F.',   w: '10%', filter: true },
  { key: 'indirizzo',     label: 'Indirizzo',                            w: '9%' },
  { key: 'cap',           label: 'Cap',                                  w: '5%',  filter: true },
  { key: 'provincia',     label: 'Provincia',           short: 'Prov.',  w: '6%',  filter: true },
  { key: 'nazione',       label: 'Nazione',             short: 'Naz.',   w: '5%',  filter: true },
]
const cella = (v?: string | number | null) =>
  v != null && String(v) !== '' ? <TruncatedText text={String(v)} /> : <span className="text-text-muted">-</span>

export default function ArchivioPersonale({ navigate, vista = 'dipendenti' }: { navigate: (p: string) => void; vista?: 'dipendenti' | 'esterni' }) {
  const [tab, setTab] = useState<'dipendenti' | 'esterni'>(vista)
  const nEsterni = useCollaboratoriEsterniStore((s) => s.collaboratori.length)
  // Elenco dal backend; finché non risponde (o se non è raggiungibile) si usa la
  // demo: dati di esempio + schede salvate in questo browser − eliminati.
  const [apiItems, setApiItems] = useState<PersonaleItem[] | null>(null)
  const locali = useAnagrafichePersonaleStore((s) => s.anagrafiche)
  const eliminati = useAnagrafichePersonaleStore((s) => s.eliminati)
  const eliminaLocale = useAnagrafichePersonaleStore((s) => s.elimina)
  const items = useMemo(() => apiItems ?? elencoDemo(locali, eliminati), [apiItems, locali, eliminati])
  const confirm = useConfirmStore((s) => s.confirm)
  const rimuoviContratti = useContrattiPersonaleStore((s) => s.rimuoviPerAnagrafica)
  const rimuoviAbilOp = useAnagraficaOpStore((s) => s.rimuovi)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [openFilter, setOpenFilter] = useState<string | null>(null)
  const [docPerson, setDocPerson] = useState<PersonaleItem | null>(null)
  const [contrattiPerson, setContrattiPerson] = useState<PersonaleItem | null>(null)
  const contratti = useContrattiPersonaleStore((s) => s.contratti)
  const abilitazioni = useAnagraficaOpStore((s) => s.abilitazioni)
  const appOpAttivo = useModuloAttivo('app-op')
  const strutturaOp = useStrutturaOp()
  const [invito, setInvito] = useState<{ invito: InvitoOp; nome: string } | null>(null)
  const [invitando, setInvitando] = useState<number | null>(null)

  // Reparto dal contratto vigente (inquadramento del Configuratore HR)
  const repartoDi = (p: PersonaleItem) =>
    [...contratti].filter((c) => c.anagraficaId === String(p.id))
      .sort((a, b) => (b.decorrenza ?? b.createdAt).localeCompare(a.decorrenza ?? a.createdAt))[0]?.reparto ?? ''

  const invitaOp = async (p: PersonaleItem) => {
    const abil = abilitazioni[String(p.id)]
    if (!abil) return
    setInvitando(p.id ?? null)
    try {
      const inv = await invitaDipendenteOp(String(p.id), { nome: p.nome ?? '', cognome: p.cognome ?? '' }, abil, strutturaOp)
      setInvito({ invito: inv, nome: `${p.nome ?? ''} ${p.cognome ?? ''}`.trim() })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Invito non inviato.', 'Invita Op!')
    } finally {
      setInvitando(null)
    }
  }

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<PersonaleItem[]>('anagrafica-personale/GetAll', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled && Array.isArray(d)) setApiItems(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const modificaPersona = (p: PersonaleItem) => {
    setEditingAnagrafica({
      id: p.id, matricola: p.matricola,
      nome: p.nome, cognome: p.cognome,
      data_nascita: toIsoDate(p.nato_il),
      sesso: p.sesso, codice_fiscale: p.codice_fiscale,
      email: p.email, email_aziendale: p.email_aziendale, telefono: p.telefono, contatto_emergenza: p.contatto_emergenza,
      indirizzo: p.indirizzo, indirizzo2: p.indirizzo2, cap: p.cap, provincia: p.provincia,
      // «ITA» (dati di esempio) → «ITALIA»; le schede salvate hanno già il nome esteso
      nazionalita: !p.nazione || /^ITA?$/i.test(p.nazione) ? 'ITALIA' : p.nazione.toUpperCase(),
      strutture: p.strutture, avatarUrl: p.avatarUrl,
      documenti: p.documenti,
    })
    navigate('modifica-anagrafica')
  }

  // Elimina: conferma che dice cosa sparisce (scheda, storico contrattuale,
  // abilitazione App Op!), poi backend o copia locale della demo, poi toast.
  const eliminaPersona = async (p: PersonaleItem) => {
    const id = String(p.id)
    const nome = `${p.nome ?? ''} ${p.cognome ?? ''}`.trim() || `matricola ${p.matricola ?? id}`
    const nCtr = contratti.filter((c) => c.anagraficaId === id).length
    const abil = abilitazioni[id]?.abilitato
    const ok = await confirm({
      title: 'Elimina dipendente',
      message: (
        <div className="arch-pers-conf">
          <p>Eliminare l’anagrafica di <strong>{nome}</strong> (matricola {p.matricola ?? id})? L’operazione non si può annullare.</p>
          <ul>
            <li>{nCtr === 0 ? 'Il dipendente non ha contratti registrati.'
              : nCtr === 1 ? 'Si elimina anche il contratto dello storico contrattuale, con il PDF.'
              : `Si eliminano anche i ${nCtr} contratti dello storico contrattuale, con i PDF.`}</li>
            {abil && <li>Si toglie l’abilitazione all’App Op!: l’eventuale utenza va bloccata da Utenti e ruoli.</li>}
          </ul>
        </div>
      ),
      confirmLabel: 'Elimina',
      danger: true,
    })
    if (!ok) return
    if (apiItems) {
      try {
        await apiFetchSibylla('anagrafica-personale/Delete', { method: 'POST', body: { id: p.id } })
      } catch (e) {
        toast.error(messaggioErrore(e, backendNonRaggiungibile(e)
          ? 'Il servizio dell’anagrafica non risponde: il dipendente non è stato eliminato.'
          : 'L’eliminazione non è riuscita.'), 'Dipendente non eliminato')
        return
      }
      setApiItems((list) => (list ?? []).filter((x) => String(x.id) !== id))
    } else {
      eliminaLocale(id)
    }
    rimuoviContratti(id)
    rimuoviAbilOp(id)
    if (docPerson && String(docPerson.id) === id) setDocPerson(null)
    toast.success(nCtr > 0
      ? `${nome} è stato tolto dall’Archivio del personale insieme a ${nCtr === 1 ? '1 contratto' : `${nCtr} contratti`}.`
      : `${nome} è stato tolto dall’Archivio del personale.`, 'Dipendente eliminato')
  }

  const filtered = useMemo(() => items.filter((p) => {
    for (const [k, v] of Object.entries(filters)) {
      if (!v) continue
      const cell = String(k === 'reparto' ? repartoDi(p) : (p as any)[k] ?? '').toLowerCase()
      if (!cell.includes(v.toLowerCase())) return false
    }
    return true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [items, filters, contratti])

  return (
    <div className="arch-pers">
      <PageHead
        title="Archivio del personale"
        subtitle="Gestione dei dati anagrafici e contrattuali di tutto il personale, con accesso rapido agli archivi contrattuali e possibilità di creare nuovi profili"
      />

      <div className="arch-pers__bar">
        <Tabs
          className="arch-pers__tabs"
          active={tab}
          onChange={(id) => setTab(id as 'dipendenti' | 'esterni')}
          tabs={[{ id: 'dipendenti', label: `Dipendenti (${items.length})` }, { id: 'esterni', label: `Collaboratori esterni (${nEsterni})` }]}
        />
        {tab === 'dipendenti' ? (
          <button className="sib-btn sib-btn--primary" onClick={() => navigate('crea-anagrafica')}>
            <i className="fa-light fa-id-card" /> Crea anagrafica profilo
          </button>
        ) : (
          <button className="sib-btn sib-btn--primary" onClick={() => navigate('crea-collaboratore-esterno')}>
            <i className="fa-light fa-user-helmet-safety" /> Nuovo collaboratore esterno
          </button>
        )}
      </div>

      {tab === 'esterni' && <EsterniTable navigate={navigate} />}

      {tab === 'dipendenti' && <div className="sib-table-wrap">
        <table className="sib-table arch-pers__table">
          <colgroup>
            {COLS.map((c) => <col key={c.key} className={`arch-pers__col--${c.key}`} />)}
            <col className="arch-pers__col--azioni" />
          </colgroup>
          <thead>
            <tr>
              {COLS.map((c) => (
                <th key={c.key}>
                  <span className="arch-pers__th">
                    <TruncatedText text={c.short ?? c.label} full={c.label} />
                    {c.filter && (
                      <FiltroColonna
                        label={c.label}
                        attivo={!!filters[c.key]}
                        aperto={openFilter === c.key}
                        onToggle={() => setOpenFilter(openFilter === c.key ? null : c.key)}
                        onClose={() => setOpenFilter(null)}
                        value={filters[c.key] ?? ''}
                        onChange={(v) => setFilters((f) => ({ ...f, [c.key]: v }))}
                        onReset={() => { setFilters((f) => { const n = { ...f }; delete n[c.key]; return n }); setOpenFilter(null) }}
                      />
                    )}
                  </span>
                </th>
              ))}
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const nCtr = contratti.filter((c) => c.anagraficaId === String(p.id)).length
              const mancanti = fascicoloMancanti(p, nCtr > 0)
              return (
              <tr key={p.id}>
                <td>
                  <span className="arch-pers__matr">
                    {mancanti.length > 0 && (
                      <Tooltip variant="light" position="right" content={
                        <div className="text-left">
                          <div className="font-semibold text-text mb-1">Documentazione incompleta</div>
                          <div className="text-[11px] text-text-muted mb-1">{mancanti.length}/{FASCICOLO_TOTALE} documenti mancanti — clicca per inserirli:</div>
                          <ul className="m-0 pl-4 list-disc text-[12px] text-text">
                            {mancanti.map((d) => <li key={d.key}>{d.label}</li>)}
                          </ul>
                        </div>
                      }>
                        <button type="button" className="bg-transparent border-0 p-0 cursor-pointer" aria-label="Documentazione incompleta — inserisci documenti mancanti" onClick={() => modificaPersona(p)}>
                          <i className="fa-solid fa-triangle-exclamation text-warning animate-pulse" />
                        </button>
                      </Tooltip>
                    )}
                    {p.matricola}
                  </span>
                </td>
                <td>{cella(p.nome)}</td>
                <td>{cella(p.cognome)}</td>
                <td>{cella(repartoDi(p))}</td>
                <td>{cella(p.telefono)}</td>
                <td>{cella(p.nato_il)}</td>
                <td>{cella(p.codice_fiscale)}</td>
                <td>{cella(p.indirizzo)}</td>
                <td>{cella(p.cap)}</td>
                <td>{cella(p.provincia)}</td>
                <td>{cella(p.nazione)}</td>
                <td>
                  <div className="arch-pers__acts">
                    <button className="sib-btn sib-btn--icon" title="Dettaglio dipendente" onClick={() => setDocPerson(p)}>
                      <i className="fa-solid fa-eye" />
                    </button>
                    <button className="sib-btn sib-btn--icon" title="Modifica" onClick={() => modificaPersona(p)}>
                      <i className="fa-solid fa-pen" />
                    </button>
                    <button className="sib-btn sib-btn--icon relative" title="Contratto (PDF)" onClick={() => setContrattiPerson(p)}>
                      <i className="fa-solid fa-file-pdf" />
                      {nCtr > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-primary text-white text-[9px] font-bold leading-[15px] text-center">{nCtr}</span>
                      )}
                    </button>
                    {appOpAttivo && abilitazioni[String(p.id)]?.abilitato && (() => {
                      const ab = abilitazioni[String(p.id)]
                      return (
                        <Tooltip text={ab.ultimoInvito
                          ? `Invita Op! — ultimo invito a ${ab.ultimoInvito.emailMascherata}, valido fino al ${formatoData(ab.ultimoInvito.scadeIl)}`
                          : `Invita Op! — invia il token di invito a ${ab.emailAziendale || 'email aziendale mancante'}`}>
                          <button className="sib-btn sib-btn--icon" aria-label={`Invita ${p.nome} ${p.cognome} all'App Op!`}
                            disabled={invitando === p.id} onClick={() => invitaOp(p)}>
                            <i className={`fa-solid ${invitando === p.id ? 'fa-spinner fa-spin' : 'fa-mobile-screen'}`} />
                          </button>
                        </Tooltip>
                      )
                    })()}
                    <button className="sib-btn sib-btn--icon" title="Elimina" aria-label={`Elimina ${p.nome ?? ''} ${p.cognome ?? ''}`.trim()} onClick={() => eliminaPersona(p)}>
                      <i className="fa-solid fa-trash-can" />
                    </button>
                  </div>
                </td>
              </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={COLS.length + 1} className="sib-empty">Nessun collaboratore trovato.</td></tr>
            )}
          </tbody>
        </table>
      </div>}

      <DocIdentitaModal persona={docPerson} onClose={() => setDocPerson(null)} />
      <ContrattiModal persona={contrattiPerson} onClose={() => setContrattiPerson(null)} />
      <OpInvitoModal invito={invito?.invito ?? null} nome={invito?.nome ?? ''} onClose={() => setInvito(null)} />
    </div>
  )
}

// ─── Filtro di colonna (Dipendenti) ───────────────────────────────────────────
// Il popover va in un portale su <body> con posizione fixed calcolata dal
// pulsante: le `th` hanno overflow hidden e il root pagina è un container
// (container-type crea un nuovo blocco di riferimento anche per i fixed), quindi
// dentro la tabella verrebbe tagliato o spostato. Si chiude con OK, Reset, Esc,
// clic fuori, scroll e ridimensionamento della finestra.
const FILTRO_W = 208
function FiltroColonna({ label, attivo, aperto, onToggle, onClose, value, onChange, onReset }: {
  label: string; attivo: boolean; aperto: boolean
  onToggle: () => void; onClose: () => void
  value: string; onChange: (v: string) => void; onReset: () => void
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    if (!aperto) return
    const r = btnRef.current?.getBoundingClientRect()
    const pop = popRef.current
    if (!r || !pop) return
    pop.style.top = `${r.bottom + 6}px`
    pop.style.left = `${Math.max(12, Math.min(r.left - 8, window.innerWidth - FILTRO_W - 12))}px`
    inputRef.current?.focus()
  }, [aperto])

  useEffect(() => {
    if (!aperto) return
    const chiudi = () => onClose()
    const tasto = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('scroll', chiudi, true)
    window.addEventListener('resize', chiudi)
    window.addEventListener('keydown', tasto)
    return () => {
      window.removeEventListener('scroll', chiudi, true)
      window.removeEventListener('resize', chiudi)
      window.removeEventListener('keydown', tasto)
    }
  }, [aperto, onClose])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`arch-pers__filtro-btn${attivo ? ' arch-pers__filtro-btn--on' : ''}`}
        title={attivo ? `Filtro attivo su ${label.toLowerCase()}` : 'Filtra'}
        aria-label={`Filtra ${label.toLowerCase()}`}
        aria-expanded={aperto}
        onClick={onToggle}
      >
        <i className="fa-solid fa-filter" aria-hidden="true" />
      </button>
      {aperto && createPortal(
        <>
          <div className="arch-pers-filtro__overlay" onClick={onClose} />
          <div ref={popRef} className="arch-pers-filtro" role="dialog" aria-label={`Filtra ${label.toLowerCase()}`}>
            <InputField
              ref={inputRef}
              name={`filtro-${label}`}
              ariaLabel={`Filtra ${label.toLowerCase()}`}
              placeholder={`Filtra ${label.toLowerCase()}`}
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
            <div className="arch-pers-filtro__acts">
              <button type="button" className="sib-btn sib-btn--ghost sib-btn--sm" onClick={onReset}>Reset</button>
              <button type="button" className="sib-btn sib-btn--primary sib-btn--sm" onClick={onClose}>OK</button>
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  )
}

// ─── MODAL: Contratti del personale (storico + PDF) ───────────────────────────

function ContrattiModal({ persona, onClose }: { persona: PersonaleItem | null; onClose: () => void }) {
  const contrattiFor = useContrattiPersonaleStore((s) => s.contrattiFor)
  const fullName = persona ? `${persona.nome ?? ''} ${persona.cognome ?? ''}`.trim() : ''
  const storico: ContrattoPersonale[] = persona ? contrattiFor(String(persona.id)) : []
  return (
    <Modal open={!!persona} onClose={onClose} title={`Contratto — ${fullName}`} size="xl">
      {persona && (
        storico.length === 0 ? (
          <p className="text-[13px] text-text-muted m-0">
            Nessun contratto registrato per questo profilo. Aggiungilo dalla scheda anagrafica → sezione “Contratto”.
          </p>
        ) : (
          <ul className="m-0 p-0 list-none flex flex-col gap-2">
            {storico.map((r, i) => (
              <li key={r.id} className="flex items-center justify-between gap-3 flex-wrap border border-line rounded-lg p-3">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  {i === 0 && <span className="arch-pers-ctr__vigente"><i className="fa-solid fa-circle-check" aria-hidden="true" /> Vigente</span>}
                  <span className="font-semibold text-text text-[13px]">{r.tipologia}</span>
                  <span className="text-[12px] text-text-muted">
                    {r.ruolo || '—'}{r.livello ? ` · ${r.livello} livello` : ''}{r.ccnl ? ` · ${r.ccnl}` : ''}{r.reparto ? ` · ${r.reparto}` : ''} · RAL € {r.ral || '—'} · dal {fmtDate(r.decorrenza)}{r.scadenza ? ` al ${fmtDate(r.scadenza)}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  {r.pdfName && (
                    <span className="inline-flex items-center gap-2 text-[12px] text-text-muted truncate max-w-[200px]" title={r.pdfName}>
                      <i className="fa-light fa-file-pdf text-primary" /> {r.pdfName}
                    </span>
                  )}
                  {r.pdfDataUrl
                    ? <button type="button" className="sib-btn sib-btn--icon" title="Apri PDF" onClick={() => window.open(r.pdfDataUrl!, '_blank')}><i className="fa-light fa-eye" /></button>
                    : <span className="text-[11px] text-text-muted italic">PDF non disponibile</span>}
                </div>
              </li>
            ))}
          </ul>
        )
      )}
    </Modal>
  )
}

// ─── MODAL: Documento di identità ─────────────────────────────────────────────

function DocIdentitaModal({ persona, onClose }: { persona: PersonaleItem | null; onClose: () => void }) {
  const contratti = useContrattiPersonaleStore((s) => s.contratti)
  const ultimoContratto = persona
    ? [...contratti]
        .filter((c) => c.anagraficaId === String(persona.id))
        .sort((a, b) => (b.decorrenza ?? b.createdAt).localeCompare(a.decorrenza ?? a.createdAt))[0]
    : undefined
  const fullName = persona ? `${persona.nome ?? ''} ${persona.cognome ?? ''}`.trim() : ''
  const fields: [string, unknown][] = persona ? [
    ['Matricola N°', persona.matricola],
    ['Nome', persona.nome],
    ['Cognome', persona.cognome],
    ['Contatto telefonico', persona.telefono],
    ['E-mail', persona.email],
    ['Contatto di emergenza', persona.contatto_emergenza],
    ['Nato il', persona.nato_il],
    ['Codice fiscale', persona.codice_fiscale],
    ['Indirizzo', persona.indirizzo],
    ['CAP', persona.cap],
    ['Provincia', persona.provincia],
    ['Nazione', persona.nazione],
  ] : []
  return (
    <Modal open={!!persona} onClose={onClose} title="Dettaglio dipendente" size="xl">
      {persona && (
        <div className="flex gap-5">
          <div className="flex-none">
            <img src={avatarUrl(persona.avatarUrl || fullName || String(persona.id ?? ''))} alt={fullName}
              className="w-28 h-36 rounded-lg object-cover border border-line bg-canvas" />
          </div>
          <dl className="flex-1 grid grid-cols-2 gap-x-5 gap-y-3 text-[13px] m-0">
            {fields.map(([label, value]) => (
              <div key={label} className="flex flex-col">
                <dt className="text-text-muted text-[11px]">{label}</dt>
                <dd className="m-0 font-semibold text-text break-words">{value ? String(value) : '-'}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {persona && <InquadramentoBlock contratto={ultimoContratto} />}

      {persona && (() => {
        const mancanti = docMancantiList(persona).length + (ultimoContratto ? 0 : 1)
        const altri = persona.documenti?.altri ?? []
        return (
          <div className="mt-5 pt-4 border-t border-line">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[13px] font-semibold text-text">Documenti allegati</h4>
              {mancanti > 0
                ? <span className="arch-pers-doc__stato arch-pers-doc__stato--ko">
                    <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> Documentazione incompleta — {mancanti}/{FASCICOLO_TOTALE} mancanti
                  </span>
                : <span className="arch-pers-doc__stato arch-pers-doc__stato--ok">
                    <i className="fa-solid fa-circle-check" aria-hidden="true" /> Documentazione completa
                  </span>}
            </div>
            <ul className="m-0 p-0 list-none">
              {REQUIRED_DOCS.map((d) => (
                <DocRow key={d.key} label={d.label} name={persona.documenti?.[d.key]} required />
              ))}
              <DocRow
                key="contratto"
                label="Contratto di lavoro"
                name={ultimoContratto?.pdfName}
                pdfUrl={ultimoContratto?.pdfDataUrl}
                required
              />
              {altri.map((n, i) => (
                <DocRow key={`altro-${i}`} label={`Altro documento ${i + 1}`} name={n} />
              ))}
            </ul>
          </div>
        )
      })()}
    </Modal>
  )
}

// ─── Inquadramento del contratto vigente (dati del Configuratore HR) ──────────
function InquadramentoBlock({ contratto: c }: { contratto?: ContrattoPersonale }) {
  const { orari, schemi } = useHrConfigStore()
  if (!c) return null
  const orario = findById(orari, c.orarioId)
  const schema = findById(schemi, c.schemaTurniId)
  const voci: [string, string][] = [
    ['Reparto', c.reparto || '—'],
    ['Ruolo', c.ruolo || '—'],
    ['CCNL', c.ccnl || '—'],
    ['Livello', c.livello || '—'],
    ['Tipologia', `${c.tipologia}${c.scadenza ? ` · fino al ${fmtDate(c.scadenza)}` : ''}`],
    ['Orario', orario ? `${orario.nome} (${oreSettimanaliOrario(orario)} h)` : '—'],
    ['Turnazione', schema?.nome || '—'],
    ['Part time', c.partTimePerc != null && c.partTimePerc < 100 ? `${c.partTimePerc}%` : 'Full time'],
    ['Ferie annue', c.ferieGiorni != null ? `${c.ferieGiorni} giorni` : '—'],
    ['Permessi annui', c.rolOre != null ? `${c.rolOre} h ROL + ${c.exFestivitaOre ?? 0} h ex fest.` : '—'],
    ['Periodo di prova', c.provaGiorni ? `${c.provaGiorni} giorni` : '—'],
    ['RAL', c.ral ? `€ ${c.ral}` : '—'],
  ]
  return (
    <div className="mt-5 pt-4 border-t border-line">
      <h4 className="text-[13px] font-semibold text-text mb-2">Inquadramento contrattuale</h4>
      <dl className="grid grid-cols-3 gap-x-5 gap-y-3 text-[13px] m-0">
        {voci.map(([label, value]) => (
          <div key={label} className="flex flex-col min-w-0">
            <dt className="text-text-muted text-[11px]">{label}</dt>
            <dd className="m-0 font-semibold text-text min-w-0"><TruncatedText text={value} /></dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function DocRow({ label, name, required, pdfUrl }: { label: string; name?: string; required?: boolean; pdfUrl?: string }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2 border-b border-line last:border-b-0">
      <span className="flex items-center gap-2 text-[13px] text-text">
        <i className="fa-light fa-file-lines text-text-muted" /> {label}
        {required && <span className="text-error">*</span>}
      </span>
      {name ? (
        <span className="flex items-center gap-2">
          <span className="text-[12px] text-text-muted truncate max-w-[200px]" title={name}>{name}</span>
          <button type="button" className="sib-btn sib-btn--icon" title="Visualizza documento" disabled={!pdfUrl} onClick={pdfUrl ? () => viewPdf(pdfUrl) : undefined}><i className="fa-light fa-eye" /></button>
          <button type="button" className="sib-btn sib-btn--icon" title="Scarica documento" disabled={!pdfUrl} onClick={pdfUrl ? () => downloadPdf(pdfUrl, name) : undefined}><i className="fa-light fa-download" /></button>
          <button type="button" className="sib-btn sib-btn--icon" title="Stampa documento" disabled={!pdfUrl} onClick={pdfUrl ? () => printPdf(pdfUrl, name) : undefined}><i className="fa-light fa-print" /></button>
        </span>
      ) : (
        <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-warning">
          <i className="fa-solid fa-triangle-exclamation animate-pulse" /> Mancante
        </span>
      )}
    </li>
  )
}
