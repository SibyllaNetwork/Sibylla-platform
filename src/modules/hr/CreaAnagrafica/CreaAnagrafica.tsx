import React, { useRef, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import TruncatedText from '../../../core/components/TruncatedText'
import { InputField, SelectField, DatePickerField } from '../../../core/components/form'
import { withFlag } from '../../../core/utils/countryFlags'
import { apiFetchSibylla } from '../../../services/api'
import { useContrattiPersonaleStore } from '../../../store/useContrattiPersonaleStore'
import { useRuoliStore } from '../../../store/useRuoliStore'
import { useConfirmStore } from '../../../store/useConfirmStore'
import { getEditingAnagrafica, clearEditingAnagrafica } from './_state'
import {
  useHrConfigStore, findById, percentualePartTime, spettanzeAnnue, ralMinima, fmtEuro,
  oreSettimanaliOrario, giorniLavorativiOrario, MATURAZIONI,
} from '../../../store/useHrConfigStore'
import { useAnagraficaOpStore, abilitazioneVuota, type AbilitazioneOp } from '../../../store/useAnagraficaOpStore'
import { useModuloAttivo } from '../../../hooks/useModuloAttivo'
import OpAccessoAnagrafica from '../../appop/OpAccessoAnagrafica'
import './CreaAnagrafica.sass'
import { useStrutturaCorrente } from '../../../hooks/useStrutturaCorrente'

/**
 * Crea anagrafica personale — scheda del dipendente (stile "scheda personale",
 * sezioni raggruppate) anziché il vecchio layout "profilo" con avatar dominante.
 * BE: `anagrafica-personale/Insert`.
 */

const SESSI = [
  { value: '', label: 'Seleziona sesso' },
  { value: 'M', label: 'Maschio' },
  { value: 'F', label: 'Femmina' },
  { value: 'A', label: 'Altro' },
]

const NAZIONALITA = ['ITALIA', 'FRANCIA', 'GERMANIA', 'SPAGNA', 'REGNO UNITO', 'STATI UNITI', 'ALBANIA', 'ROMANIA', 'MAROCCO', 'CINA']
// Reparti, orari, turni, tipologie e CCNL arrivano dal Configuratore HR
// (Human Resources › Configurazione → useHrConfigStore).

// Sezione comprimibile: header cliccabile (icona + titolo + chevron) per
// espandere/richiudere e recuperare spazio verticale; `actions` è uno slot a
// destra dell'header (es. il pulsante "Storico" dei Contratti) che non innesca
// il toggle.
function Section({ icon, title, actions, defaultOpen = true, children }: {
  icon: string; title: string; actions?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className={`crea-anag__section${open ? '' : ' crea-anag__section--collapsed'}`}>
      <header className="crea-anag__section-head">
        <button
          type="button"
          className="crea-anag__section-toggle"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <i className={`fa-duotone ${icon}`} aria-hidden="true" />
          <h3>{title}</h3>
          <i className={`fa-solid fa-chevron-down crea-anag__section-chev${open ? '' : ' is-collapsed'}`} aria-hidden="true" />
        </button>
        {actions && <div className="crea-anag__section-actions">{actions}</div>}
      </header>
      {open && <div className="crea-anag__section-body">{children}</div>}
    </section>
  )
}

interface AcqFile { name: string; dataUrl?: string }

// NB: il "Contratto di lavoro" NON è più qui — è gestito nella sezione
// "Contratti del personale" (con tipologia/RAL/storico + PDF).
type DocKey = 'identita' | 'codiceFiscale' | 'privacy' | 'sicurezza'
const DOC_SLOTS: { key: DocKey; label: string }[] = [
  { key: 'identita',      label: "Documento d'identità" },
  { key: 'codiceFiscale', label: 'Codice fiscale / Tessera sanitaria' },
  { key: 'privacy',       label: 'Informativa privacy' },
  { key: 'sicurezza',     label: 'Formazione sicurezza' },
]

const viewDoc = (f: AcqFile) => { if (f.dataUrl) window.open(f.dataUrl, '_blank') }
const printDoc = (f: AcqFile) => {
  if (!f.dataUrl) return
  const w = window.open('', '_blank')
  if (w) { w.document.write(`<img src="${f.dataUrl}" style="max-width:100%" onload="window.focus();window.print()" />`); w.document.close() }
}

// Riga documento: etichetta + stato; se presente mostra file con azioni
// (visualizza / stampa / elimina); le opzioni di acquisizione (Scanner / File /
// Fotocamera) sono sempre disponibili (per inserire o sostituire).
function DocSlot({ label, value, onAcquire, onRemove }: {
  label: string; value: AcqFile | null; onAcquire: (f: AcqFile) => void; onRemove: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (f.type.startsWith('image/')) {
      const r = new FileReader()
      r.onload = () => onAcquire({ name: f.name, dataUrl: r.result as string })
      r.readAsDataURL(f)
    } else onAcquire({ name: f.name })
  }
  return (
    <div className="crea-anag__doc-row">
      <div className="crea-anag__doc-row-label">
        <span className="crea-anag__doc-row-title">{label}</span>
        {value
          ? <span className="crea-anag__doc-badge crea-anag__doc-badge--ok"><i className="fa-solid fa-circle-check" /> Caricato</span>
          : <span className="crea-anag__doc-badge crea-anag__doc-badge--ko"><i className="fa-solid fa-triangle-exclamation" /> Mancante</span>}
      </div>
      <div className="crea-anag__doc-row-main">
        {value && (
          <span className="crea-anag__doc-file">
            {value.dataUrl
              ? <img className="crea-anag__doc-thumb" src={value.dataUrl} alt={value.name} />
              : <i className="fa-light fa-file-lines crea-anag__doc-ico" />}
            <span className="crea-anag__doc-name" title={value.name}>{value.name}</span>
            <button type="button" className="sib-btn sib-btn--icon" title="Visualizza" onClick={() => viewDoc(value)}><i className="fa-light fa-eye" /></button>
            <button type="button" className="sib-btn sib-btn--icon" title="Stampa" onClick={() => printDoc(value)}><i className="fa-light fa-print" /></button>
            <button type="button" className="sib-btn sib-btn--icon" title="Elimina" onClick={onRemove}><i className="fa-light fa-trash-can" /></button>
          </span>
        )}
        <span className="crea-anag__doc-ins">
          <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" title={value ? 'Sostituisci da scanner' : 'Scanner'} onClick={() => fileRef.current?.click()}><i className="fa-light fa-scanner-image" /> Scanner</button>
          <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" title={value ? 'Sostituisci da file' : 'File'} onClick={() => fileRef.current?.click()}><i className="fa-light fa-folder-open" /> File</button>
          <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" title={value ? 'Sostituisci da fotocamera' : 'Fotocamera'} onClick={() => camRef.current?.click()}><i className="fa-light fa-camera" /> Foto</button>
        </span>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handle} />
        <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handle} />
      </div>
    </div>
  )
}

// ─── Contratti del personale ────────────────────────────────────────────────
// Sezione dedicata al contratto collegato all'anagrafica: CCNL, livello e
// tipologia vengono dal Configuratore HR (useHrConfigStore); dall'orario
// assegnato si ricava il part time e da CCNL + livello la RAL minima, il periodo
// di prova e le spettanze annue di ferie e permessi. Ogni variazione
// contrattuale è un nuovo record dello storico (pulsante "Storico"); il PDF è
// quello poi visualizzabile dall'"Archivio del personale".
const fmtDate = (iso?: string) => {
  if (!iso) return '—'
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}
const parseEuro = (v: string) => Number(v.replace(/\./g, '').replace(',', '.')) || 0
const mesiTra = (da: string, a: string) => {
  const d1 = new Date(da), d2 = new Date(a)
  return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()) + (d2.getDate() >= d1.getDate() ? 0 : -1)
}

export interface Inquadramento { repartoId: string; orarioId: string; schemaTurniId: string }

function ContrattiSection({ anagraficaId, nomeDefault, inq, navigate }: {
  anagraficaId: string; nomeDefault: string; inq: Inquadramento; navigate: (p: string) => void
}) {
  // sottoscrivo l'array così la lista si aggiorna a ogni add/remove
  const contratti = useContrattiPersonaleStore((s) => s.contratti)
  const addContratto = useContrattiPersonaleStore((s) => s.addContratto)
  const removeContratto = useContrattiPersonaleStore((s) => s.removeContratto)
  const confirm = useConfirmStore((s) => s.confirm)
  const { ccnl: ccnlList, tipologie, orari, reparti } = useHrConfigStore()

  // Ruoli configurati nella piattaforma (pagina Ruoli & funzioni), dedup + no vuoti.
  const ruoliPiattaforma = useRuoliStore((s) => s.ruoli)
  const ruoliOptions = Array.from(
    new Set(ruoliPiattaforma.map((r) => r.nome.trim()).filter(Boolean)),
  ).map((nome) => ({ value: nome, label: nome }))

  const storico = [...contratti]
    .filter((r) => r.anagraficaId === anagraficaId)
    .sort((a, b) => (b.decorrenza ?? b.createdAt).localeCompare(a.decorrenza ?? a.createdAt))
  const vigente = storico[0]
  const [showStorico, setShowStorico] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pdfRef = useRef<HTMLInputElement>(null)
  const [pdf, setPdf] = useState<AcqFile | null>(null)
  const iniziale = () => ({
    nomeImpiegato: nomeDefault,
    ruolo: vigente?.ruolo ?? '',
    ccnlId: vigente?.ccnlId ?? ccnlList[0]?.id ?? '',
    livelloId: vigente?.livelloId ?? '',
    tipologiaId: vigente?.tipologiaId ?? '',
    ral: '', decorrenza: '', scadenza: '', prova: '', note: '',
  })
  const [c, setC] = useState(iniziale)
  const setField = (k: keyof typeof c, v: string) => setC((p) => ({ ...p, [k]: v }))

  const ccnl = findById(ccnlList, c.ccnlId)
  const livello = ccnl ? findById(ccnl.livelli, c.livelloId) : undefined
  const tipologia = findById(tipologie, c.tipologiaId)
  const orario = findById(orari, inq.orarioId)
  const perc = percentualePartTime(orario, ccnl)
  const spett = ccnl ? spettanzeAnnue(ccnl, perc) : null
  const ralMin = ccnl && livello ? ralMinima(ccnl, livello, perc) : 0
  const provaGiorni = c.prova !== '' ? Number(c.prova) : (tipologia?.periodoProva === false ? 0 : livello?.provaGiorni ?? 0)
  const ralSotto = ralMin > 0 && c.ral !== '' && parseEuro(c.ral) < ralMin
  const oltreDurata = tipologia?.durataMaxMesi && c.decorrenza && c.scadenza && mesiTra(c.decorrenza, c.scadenza) > tipologia.durataMaxMesi

  const onPdf = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const r = new FileReader()
    r.onload = () => setPdf({ name: f.name, dataUrl: r.result as string })
    r.readAsDataURL(f)
  }

  const aggiungiVariazione = () => {
    if (!ccnl || !livello) { setError('Seleziona CCNL e livello di inquadramento.'); return }
    if (!tipologia) { setError('Seleziona la tipologia del contratto.'); return }
    if (tipologia.conScadenza && !c.scadenza) { setError(`Il contratto «${tipologia.nome}» richiede la data di fine rapporto.`); return }
    if (!pdf) { setError('Carica il PDF del contratto.'); return }
    setError(null)
    const reparto = findById(reparti, inq.repartoId)
    addContratto({
      anagraficaId,
      nomeImpiegato: c.nomeImpiegato || nomeDefault,
      ruolo: c.ruolo, livello: livello.codice, tipologia: tipologia.nome,
      ral: c.ral || fmtEuro(ralMin),
      decorrenza: c.decorrenza, scadenza: tipologia.conScadenza ? c.scadenza : undefined, note: c.note,
      ccnlId: ccnl.id, ccnl: ccnl.nome, livelloId: livello.id, tipologiaId: tipologia.id,
      repartoId: reparto?.id, reparto: reparto?.nome, orarioId: inq.orarioId || undefined, schemaTurniId: inq.schemaTurniId || undefined,
      partTimePerc: perc, provaGiorni,
      ferieGiorni: spett?.ferieGiorni, rolOre: spett?.rolOre, exFestivitaOre: spett?.exFestivitaOre,
      pdfName: pdf.name, pdfDataUrl: pdf.dataUrl,
    })
    setC({ ...iniziale(), ccnlId: ccnl.id, livelloId: livello.id, tipologiaId: tipologia.id, ruolo: c.ruolo })
    setPdf(null)
    setShowStorico(true)
  }

  const elimina = async (id: string) => {
    if (await confirm({ message: 'Eliminare questa variazione contrattuale dallo storico?', danger: true })) {
      removeContratto(id)
    }
  }

  return (
    <Section
      icon="fa-file-contract"
      title="Contratto"
      actions={
        <button
          type="button"
          className="sib-btn sib-btn--secondary sib-btn--sm"
          onClick={() => setShowStorico((s) => !s)}
        >
          <i className={`fa-light ${showStorico ? 'fa-chevron-up' : 'fa-clock-rotate-left'}`} /> Storico
          {storico.length > 0 && <span className="crea-anag__ctr-count">{storico.length}</span>}
        </button>
      }
    >
      {error && <p className="crea-anag__error"><i className="fa-light fa-circle-exclamation" /> {error}</p>}

      {/* Nuova variazione contrattuale */}
      <div className="crea-anag__grid crea-anag__grid--3">
        <InputField  name="ctr_nome"      label="Nome impiegato"          value={c.nomeImpiegato} placeholder={nomeDefault} onChange={(e) => setField('nomeImpiegato', e.target.value)} />
        <SelectField name="ctr_ruolo"     label="Ruolo / mansione"        value={c.ruolo}         onChange={(e) => setField('ruolo', e.target.value)}
          options={[{ value: '', label: 'Seleziona' }, ...ruoliOptions]} />
        <SelectField name="ctr_tipologia" label="Tipologia del contratto" value={c.tipologiaId}   onChange={(e) => setField('tipologiaId', e.target.value)}
          options={[{ value: '', label: 'Seleziona' }, ...tipologie.filter((t) => t.attiva).map((t) => ({ value: t.id, label: t.nome }))]} />
        <SelectField name="ctr_ccnl"      label="CCNL applicato"          value={c.ccnlId}
          onChange={(e) => setC((p) => ({ ...p, ccnlId: e.target.value, livelloId: '', prova: '' }))}
          options={[{ value: '', label: 'Seleziona' }, ...ccnlList.map((x) => ({ value: x.id, label: x.nome }))]} />
        <SelectField name="ctr_livello"   label="Livello"                 value={c.livelloId}     disabled={!ccnl}
          onChange={(e) => setC((p) => ({ ...p, livelloId: e.target.value, prova: '' }))}
          options={[{ value: '', label: ccnl ? 'Seleziona' : 'Scegli prima il CCNL' }, ...(ccnl?.livelli ?? []).map((l) => ({ value: l.id, label: `${l.codice} – ${l.descrizione}` }))]} />
        <InputField  name="ctr_ral"       label="RAL (€)"                 value={c.ral}           onChange={(e) => setField('ral', e.target.value)}
          placeholder={ralMin ? fmtEuro(ralMin) : 'es. 28.000'} iconLeft="fa-light fa-euro-sign"
          hint={ralMin ? `Minimo da CCNL: € ${fmtEuro(ralMin)}${perc < 100 ? ` (part time ${perc}%)` : ''}` : undefined}
          error={ralSotto ? `Sotto il minimo del livello (€ ${fmtEuro(ralMin)})` : undefined} />
        <DatePickerField name="ctr_decorrenza" label="Decorrenza"         value={c.decorrenza}    onChange={(e) => setField('decorrenza', e.target.value)} />
        {tipologia?.conScadenza && (
          <DatePickerField name="ctr_scadenza" label="Fine rapporto"       value={c.scadenza}      onChange={(e) => setField('scadenza', e.target.value)}
            error={oltreDurata ? `Oltre la durata massima di ${tipologia.durataMaxMesi} mesi` : undefined}
            hint={tipologia.durataMaxMesi ? `Durata massima ${tipologia.durataMaxMesi} mesi` : undefined} />
        )}
        {tipologia?.periodoProva !== false && (
          <InputField name="ctr_prova" label="Periodo di prova (giorni)" type="number" min={0} value={c.prova !== '' ? c.prova : String(provaGiorni || '')}
            onChange={(e) => setField('prova', e.target.value)} hint={livello ? `Dal livello: ${livello.provaGiorni} giorni` : undefined} />
        )}
      </div>

      {/* Spettanze e dati di inquadramento ricavati dal CCNL */}
      {ccnl && spett ? (
        <div className="crea-anag__spett">
          <div className="crea-anag__spett-head">
            <span className="crea-anag__spett-title"><i className="fa-light fa-scale-balanced" /> Inquadramento e spettanze annue</span>
            <span className="crea-anag__spett-perc">
              {orario ? `${orario.nome} · ${perc < 100 ? `part time ${perc}%` : 'full time'}` : 'Nessun orario: calcolo su full time'}
            </span>
          </div>
          <dl className="crea-anag__spett-grid">
            <div><dt>Categoria</dt><dd>{livello?.categoria ?? '—'}</dd></div>
            <div><dt>Ferie</dt><dd>{spett.ferieGiorni} gg/anno</dd></div>
            <div><dt>Permessi ROL</dt><dd>{spett.rolOre} h/anno</dd></div>
            <div><dt>Ex festività</dt><dd>{spett.exFestivitaOre} h/anno</dd></div>
            <div><dt>Maturazione</dt><dd>{ccnl.maturazione === 'mensile' ? `${spett.ferieMese} gg + ${spett.permessiMeseOre} h al mese` : MATURAZIONI.find((m) => m.value === ccnl.maturazione)?.label}</dd></div>
            <div><dt>Mensilità</dt><dd>{ccnl.mensilita}</dd></div>
            <div><dt>Preavviso</dt><dd>{livello ? `${livello.preavvisoGiorni} giorni` : '—'}</dd></div>
            <div><dt>Scatti di anzianità</dt><dd>{ccnl.scattiNumero} ogni {ccnl.scattiCadenzaAnni} anni{livello ? ` · € ${fmtEuro(livello.scattoImporto)}` : ''}</dd></div>
            <div><dt>Fondi</dt><dd><TruncatedText text={[ccnl.fondoSanitario, ccnl.previdenzaComplementare, ccnl.enteBilaterale].filter(Boolean).join(' · ') || '—'} /></dd></div>
          </dl>
        </div>
      ) : (
        <p className="crea-anag__hint">
          Nessun CCNL configurato.{' '}
          <button type="button" className="crea-anag__link" onClick={() => navigate('hr-configurazione:hr-ccnl')}>Configuralo in Human Resources › Configurazione</button>
        </p>
      )}

      {/* Caricamento PDF del contratto */}
      <div className="crea-anag__ctr-pdf">
        <div className="crea-anag__ctr-pdf-label">
          <span className="crea-anag__doc-row-title">Contratto (PDF)</span>
          {pdf
            ? <span className="crea-anag__doc-badge crea-anag__doc-badge--ok"><i className="fa-solid fa-circle-check" /> Caricato</span>
            : <span className="crea-anag__doc-badge crea-anag__doc-badge--ko"><i className="fa-solid fa-triangle-exclamation" /> Da caricare</span>}
        </div>
        <div className="crea-anag__ctr-pdf-main">
          {pdf && (
            <span className="crea-anag__doc-file">
              <i className="fa-light fa-file-pdf crea-anag__doc-ico" />
              <span className="crea-anag__doc-name" title={pdf.name}>{pdf.name}</span>
              {pdf.dataUrl && <button type="button" className="sib-btn sib-btn--icon" title="Visualizza" onClick={() => window.open(pdf.dataUrl!, '_blank')}><i className="fa-light fa-eye" /></button>}
              <button type="button" className="sib-btn sib-btn--icon" title="Rimuovi" onClick={() => setPdf(null)}><i className="fa-light fa-trash-can" /></button>
            </span>
          )}
          <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={() => pdfRef.current?.click()}>
            <i className="fa-light fa-folder-open" /> {pdf ? 'Sostituisci PDF' : 'Carica PDF'}
          </button>
          <input ref={pdfRef} type="file" accept="application/pdf" className="hidden" onChange={onPdf} />
        </div>
      </div>

      <div className="crea-anag__ctr-add">
        <button type="button" className="sib-btn sib-btn--primary" onClick={aggiungiVariazione}>
          <i className="fa-light fa-circle-plus" /> Aggiungi variazione contrattuale
        </button>
      </div>

      {/* Storico delle variazioni */}
      {showStorico && (
        <div className="crea-anag__ctr-storico">
          <h4 className="crea-anag__ctr-storico-title"><i className="fa-light fa-clock-rotate-left" /> Storico contrattuale</h4>
          {storico.length === 0 ? (
            <p className="crea-anag__ctr-empty">Nessun contratto registrato per questo profilo.</p>
          ) : (
            <ul className="crea-anag__ctr-list">
              {storico.map((r, i) => (
                <li key={r.id} className="crea-anag__ctr-item">
                  <div className="crea-anag__ctr-item-main">
                    {i === 0 && <span className="crea-anag__ctr-tag">Vigente</span>}
                    <span className="crea-anag__ctr-item-tip">{r.tipologia}</span>
                    <span className="crea-anag__ctr-item-meta">
                      {r.ruolo || '—'}{r.livello ? ` · ${r.livello} livello` : ''}{r.ccnl ? ` · ${r.ccnl}` : ''}{r.reparto ? ` · ${r.reparto}` : ''} · RAL € {r.ral || '—'} · dal {fmtDate(r.decorrenza)}{r.scadenza ? ` al ${fmtDate(r.scadenza)}` : ''}
                    </span>
                  </div>
                  <div className="crea-anag__ctr-item-acts">
                    {r.pdfName && (
                      <span className="crea-anag__ctr-item-pdf" title={r.pdfName}><i className="fa-light fa-file-pdf" /> {r.pdfName}</span>
                    )}
                    {r.pdfDataUrl && (
                      <button type="button" className="sib-btn sib-btn--icon" title="Visualizza PDF" onClick={() => window.open(r.pdfDataUrl!, '_blank')}><i className="fa-light fa-eye" /></button>
                    )}
                    <button type="button" className="sib-btn sib-btn--icon" title="Elimina variazione" onClick={() => elimina(r.id)}><i className="fa-light fa-trash-can" /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Section>
  )
}

export default function CreaAnagrafica({ navigate, editing = false }: { navigate: (p: string) => void; editing?: boolean }) {
  // Strutture abilitabili: quelle del cliente corrente.
  const { elenco: STRUTTURE } = useStrutturaCorrente()
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const initial = editing ? getEditingAnagrafica() : null
  const appOpAttivo = useModuloAttivo('app-op')
  const { reparti: repartiHr, orari, schemi, turni } = useHrConfigStore()
  const ultimoContratto = useContrattiPersonaleStore((s) => s.ultimoContratto)
  const updateContratto = useContrattiPersonaleStore((s) => s.updateContratto)
  const salvaAbilOp = useAnagraficaOpStore((s) => s.set)

  // Chiave stabile per collegare i contratti a questa anagrafica: in modifica è
  // l'id del dipendente, in creazione un id di sessione (i contratti restano
  // agganciati al profilo appena creato).
  const [anagId] = useState(() =>
    initial?.id != null ? String(initial.id) : `nuovo-${Math.round(performance.now())}`)
  const vigente = ultimoContratto(anagId)
  const [abilOp, setAbilOp] = useState<AbilitazioneOp>(() => useAnagraficaOpStore.getState().abilitazioni[anagId] ?? abilitazioneVuota())

  const mkSlot = (name?: string): AcqFile | null => (name ? { name } : null)
  const [docs, setDocs] = useState<Record<DocKey, AcqFile | null>>({
    identita:      mkSlot(initial?.documenti?.identita),
    codiceFiscale: mkSlot(initial?.documenti?.codiceFiscale),
    privacy:       mkSlot(initial?.documenti?.privacy),
    sicurezza:     mkSlot(initial?.documenti?.sicurezza),
  })
  const [altri, setAltri] = useState<AcqFile[]>((initial?.documenti?.altri ?? []).map((n) => ({ name: n })))
  const altriRef = useRef<HTMLInputElement>(null)
  const onAltri = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fs = e.target.files
    e.target.value = ''
    if (!fs) return
    Array.from(fs).forEach((f) => {
      if (f.type.startsWith('image/')) {
        const r = new FileReader()
        r.onload = () => setAltri((p) => [...p, { name: f.name, dataUrl: r.result as string }])
        r.readAsDataURL(f)
      } else setAltri((p) => [...p, { name: f.name }])
    })
  }
  const setDoc = (k: DocKey, f: AcqFile | null) => setDocs((p) => ({ ...p, [k]: f }))

  const [form, setForm] = useState({
    nome: '', cognome: '', data_nascita: '', sesso: '',
    codice_fiscale: '', email: '', email_aziendale: abilOp.emailAziendale, telefono: '', contatto_emergenza: '',
    indirizzo: '', indirizzo2: '', cap: '', provincia: '', nazionalita: 'ITALIA',
    strutture: '',
    repartoId: vigente?.repartoId ?? '', orarioId: vigente?.orarioId ?? '', schemaTurniId: vigente?.schemaTurniId ?? '',
    ...(initial ? {
      nome: initial.nome ?? '', cognome: initial.cognome ?? '', data_nascita: initial.data_nascita ?? '',
      codice_fiscale: initial.codice_fiscale ?? '', indirizzo: initial.indirizzo ?? '',
      cap: initial.cap ?? '', provincia: initial.provincia ?? '', nazionalita: initial.nazionalita ?? 'ITALIA',
    } : {}),
  })

  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }))

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(f)
  }

  async function handleSave() {
    if (!form.nome || !form.cognome) {
      setError('Nome e cognome sono obbligatori'); return
    }
    setError(null); setPending(true)
    try {
      await apiFetchSibylla(editing ? 'anagrafica-personale/Update' : 'anagrafica-personale/Insert', { method: 'POST', body: form })
    } catch { /* mock: salva comunque */ }
    // L'inquadramento operativo (reparto, orario, turnazione) vive sul contratto vigente
    if (vigente) {
      const rep = findById(repartiHr, form.repartoId)
      updateContratto(vigente.id, {
        repartoId: rep?.id, reparto: rep?.nome, orarioId: form.orarioId || undefined, schemaTurniId: form.schemaTurniId || undefined,
      })
    }
    // Abilitazione App Op! (l'invito resta un'azione esplicita della sezione)
    salvaAbilOp(anagId, { ...useAnagraficaOpStore.getState().abilitazioni[anagId], ...abilOp, emailAziendale: form.email_aziendale })
    setPending(false)
    clearEditingAnagrafica()
    navigate('archivio-personale')
  }

  return (
    <div className="crea-anag">
      <PageHead
        title={editing ? 'Modifica anagrafica personale' : 'Crea anagrafica personale'}
        subtitle="Scheda del dipendente: dati anagrafici, contatti, residenza, inquadramento contrattuale e accesso all’App Op!"
        onBack={() => { clearEditingAnagrafica(); navigate('archivio-personale') }}
      />

      {error && <p className="crea-anag__error"><i className="fa-light fa-circle-exclamation" /> {error}</p>}

      <div className="crea-anag__sheet">
        <Section icon="fa-id-card" title="Dati anagrafici">
          <div className="crea-anag__identity">
            {/* Foto compatta */}
            <div className="crea-anag__photo">
              <div className="crea-anag__photo-thumb" onClick={() => photoInputRef.current?.click()}>
                {photoPreview
                  ? <img src={photoPreview} alt="anteprima" />
                  : <i className="fa-duotone fa-user" />}
              </div>
              <div className="crea-anag__photo-btns">
                <button type="button" className="sib-btn sib-btn--icon" title="Scatta foto" onClick={() => photoInputRef.current?.click()}>
                  <i className="fa-duotone fa-camera" />
                </button>
                <button type="button" className="sib-btn sib-btn--icon" title="Carica immagine" onClick={() => photoInputRef.current?.click()}>
                  <i className="fa-duotone fa-image" />
                </button>
              </div>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
            </div>

            {/* Campi anagrafici */}
            <div className="crea-anag__grid crea-anag__grid--3 crea-anag__identity-fields">
              <InputField      name="nome"           label="Nome"            value={form.nome}           onChange={(e) => set('nome', e.target.value)} />
              <InputField      name="cognome"        label="Cognome"         value={form.cognome}        onChange={(e) => set('cognome', e.target.value)} />
              <DatePickerField name="data_nascita"   label="Data di nascita" value={form.data_nascita}   onChange={(e) => set('data_nascita', e.target.value)} />
              <SelectField     name="sesso"          label="Sesso"           value={form.sesso}          onChange={(e) => set('sesso', e.target.value)} options={SESSI} />
              <InputField      name="codice_fiscale" label="Codice fiscale"  value={form.codice_fiscale} onChange={(e) => set('codice_fiscale', e.target.value)} />
              <SelectField     name="nazionalita"    label="Nazionalità"     value={form.nazionalita}    onChange={(e) => set('nazionalita', e.target.value)}
                options={NAZIONALITA.map((n) => ({ value: n, label: withFlag(n) }))} />
            </div>
          </div>
        </Section>

        <Section icon="fa-address-book" title="Contatti">
          <div className="crea-anag__grid crea-anag__grid--3">
            <InputField name="email"              label="E-mail personale" type="email" value={form.email}      onChange={(e) => set('email', e.target.value)} />
            <InputField name="email_aziendale"    label="E-mail aziendale" type="email" value={form.email_aziendale} onChange={(e) => set('email_aziendale', e.target.value)} />
            <InputField name="telefono"           label="Telefono" type="tel"   value={form.telefono}           onChange={(e) => set('telefono', e.target.value)} />
            <InputField name="contatto_emergenza" label="Contatto di emergenza" value={form.contatto_emergenza} onChange={(e) => set('contatto_emergenza', e.target.value)} />
          </div>
        </Section>

        <Section icon="fa-location-dot" title="Residenza">
          <div className="crea-anag__grid crea-anag__grid--res">
            <InputField name="indirizzo"  label="Indirizzo"                 value={form.indirizzo}  onChange={(e) => set('indirizzo', e.target.value)} />
            <InputField name="indirizzo2" label="Indirizzo 2 (facoltativo)" value={form.indirizzo2} onChange={(e) => set('indirizzo2', e.target.value)} />
            <InputField name="cap"        label="CAP"                       value={form.cap}        onChange={(e) => set('cap', e.target.value)} />
            <InputField name="provincia"  label="Provincia"                 value={form.provincia}  onChange={(e) => set('provincia', e.target.value)} />
          </div>
        </Section>

        <Section icon="fa-briefcase" title="Inquadramento e turni" actions={
          <button type="button" className="sib-btn sib-btn--ghost sib-btn--sm" onClick={() => navigate('hr-configurazione')}>
            <i className="fa-light fa-sliders" /> Configurazione HR
          </button>
        }>
          <div className="crea-anag__grid crea-anag__grid--3">
            <SelectField name="strutture"   label="Strutture abilitate"     value={form.strutture}   onChange={(e) => set('strutture', e.target.value)}
              options={[{ value: '', label: 'Seleziona' }, ...STRUTTURE.map((s) => ({ value: s, label: s }))]} />
            <SelectField name="reparto"     label="Reparto"                 value={form.repartoId}   onChange={(e) => set('repartoId', e.target.value)}
              hint={findById(repartiHr, form.repartoId)?.responsabile ? `Responsabile: ${findById(repartiHr, form.repartoId)!.responsabile}` : undefined}
              options={[{ value: '', label: 'Seleziona' }, ...repartiHr.filter((r) => r.attivo || r.id === form.repartoId).map((r) => ({ value: r.id, label: r.nome }))]} />
            <SelectField name="orario"      label="Orario di lavoro"        value={form.orarioId}    onChange={(e) => set('orarioId', e.target.value)}
              hint={(() => { const o = findById(orari, form.orarioId); return o ? `${oreSettimanaliOrario(o)} h su ${giorniLavorativiOrario(o)} giorni${o.aTurni ? ' · a turni' : ''}` : undefined })()}
              options={[{ value: '', label: 'Seleziona' }, ...orari.map((o) => ({ value: o.id, label: o.nome }))]} />
            <SelectField name="schema_turni" label="Schema di turnazione"   value={form.schemaTurniId} onChange={(e) => set('schemaTurniId', e.target.value)}
              hint={(() => {
                const sc = findById(schemi, form.schemaTurniId)
                return sc ? sc.sequenza.map((id) => turni.find((t) => t.id === id)?.sigla ?? 'R').join(' · ') : findById(orari, form.orarioId)?.aTurni ? 'Orario a turni: scegli la rotazione' : undefined
              })()}
              options={[{ value: '', label: 'Nessuna (orario fisso)' }, ...schemi.map((x) => ({ value: x.id, label: x.nome }))]} />
          </div>
        </Section>

        <ContrattiSection anagraficaId={anagId} nomeDefault={`${form.nome} ${form.cognome}`.trim()} navigate={navigate}
          inq={{ repartoId: form.repartoId, orarioId: form.orarioId, schemaTurniId: form.schemaTurniId }} />

        {appOpAttivo && (
          <Section icon="fa-mobile-screen" title="App Op!">
            <OpAccessoAnagrafica
              anagraficaId={anagId}
              persona={{ nome: form.nome, cognome: form.cognome }}
              email={form.email_aziendale}
              onEmail={(v) => set('email_aziendale', v)}
              abil={abilOp}
              onAbil={(p) => setAbilOp((a) => ({ ...a, ...p }))}
              repartiSuggeriti={(() => { const r = findById(repartiHr, form.repartoId)?.repartoOp; return r ? [r] : [] })()}
            />
          </Section>
        )}

        <Section icon="fa-folder-open" title="Documenti e allegati">
          <div className="crea-anag__doc-rows">
            {DOC_SLOTS.map((s) => (
              <DocSlot key={s.key} label={s.label} value={docs[s.key]}
                onAcquire={(f) => setDoc(s.key, f)} onRemove={() => setDoc(s.key, null)} />
            ))}
          </div>

          <div className="crea-anag__field crea-anag__doc-altri">
            <label className="crea-anag__label">Documentazione contrattuale / altri allegati</label>
            <div className="crea-anag__docs">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => altriRef.current?.click()}>
                <i className="fa-light fa-circle-plus" /> Aggiungi documenti
              </button>
              <input ref={altriRef} type="file" accept="application/pdf,image/*" multiple className="hidden" onChange={onAltri} />
              {altri.length > 0 && (
                <ul className="crea-anag__doc-list">
                  {altri.map((d, i) => (
                    <li key={i} className="crea-anag__doc-item">
                      <span><i className="fa-light fa-file-lines" /> {d.name}</span>
                      <span className="crea-anag__doc-item-acts">
                        <button type="button" className="sib-btn sib-btn--icon" title="Visualizza" onClick={() => viewDoc(d)}><i className="fa-light fa-eye" /></button>
                        <button type="button" className="sib-btn sib-btn--icon" title="Stampa" onClick={() => printDoc(d)}><i className="fa-light fa-print" /></button>
                        <button type="button" className="sib-btn sib-btn--icon" title="Elimina" onClick={() => setAltri((prev) => prev.filter((_, idx) => idx !== i))}><i className="fa-light fa-trash-can" /></button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Section>
      </div>

      <div className="crea-anag__actions">
        <button type="button" className="sib-btn sib-btn--ghost" onClick={() => { clearEditingAnagrafica(); navigate('archivio-personale') }}>Annulla</button>
        <button type="button" className="sib-btn sib-btn--primary" onClick={handleSave} disabled={pending}>
          {pending ? 'Salvataggio…' : 'Salva'}
        </button>
      </div>
    </div>
  )
}
