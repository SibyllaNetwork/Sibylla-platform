import React, { useMemo, useState } from 'react'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import FormGrid from '../../../../core/components/FormGrid'
import FormActions from '../../../../core/components/FormActions'
import { InputField, SelectField, TextareaField, ToggleSwitch, DateRangeField } from '../../../../core/components/form'
import { Icon } from '../../../purchasing/_shared/Icon'
import { useServiziStore } from '../../../../store/useServiziStore'
import { useNotificheServiziStore } from '../../../../store/useNotificheServiziStore'
import type { Servizio, FormFieldSpec, FormFieldKind } from '../../../purchasing/Servizi/servizi-types'
import './CreaServizio.sass'

const AREE: string[] = [
  'Servizi di Alloggio', 'Ristorazione e Cibo', 'Servizi per il Benessere e la Salute',
  'Intrattenimento e Ricreazione', 'Tecnologia e Comunicazione', 'Servizi per Riunioni e Conferenze',
  'Servizi per Famiglie e Bambini', 'Servizi per Animali Domestici', 'Servizi di Informazione e Assistenza',
  'Altro', 'Esperienze', 'Trasferimenti', 'Ristoranti per gruppi', 'Facchinaggio', 'Delivery',
]

const CLASSI: string[] = [
  'NCC', 'Taxi', 'Adrenalina', 'Tours', 'Fitness', 'Facchinaggio',
  'Servizio di assistenza per ospiti con mobilità ridotta', 'Servizio di sicurezza 24 ore su 24',
  'Servizio di babysitter', 'Servizio di attività per bambini', 'Servizio di organizzazione eventi e conferenze',
  'Servizio di videoconferenza', 'Servizio di assistenza tecnica', 'Servizio di intrattenimento serale',
  'Servizio di escursioni e tour guidati', 'Servizio di palestra e fitness center',
  'Servizio di piscina e jacuzzi', 'Servizio di sauna e bagno turco',
]

const COMMISSIONE_MIN = 3.5

// Tipi di campo per il builder dei campi di prenotazione (per-servizio)
const KIND_LABELS_SRV: Record<FormFieldKind, string> = {
  date: 'Data', time: 'Orario', number: 'Numero', text: 'Testo',
  select: 'Scelta', checkbox: 'Sì/No', document: 'Documento',
}

// Campi pronti all'uso per le tipologie più comuni di servizio turistico
const PRESET_CAMPI: Array<{ label: string; field: Omit<FormFieldSpec, 'name'> }> = [
  { label: 'Data',        field: { kind: 'date',     label: 'Data',                  required: true } },
  { label: 'Orario',      field: { kind: 'time',     label: 'Orario',                required: true } },
  { label: 'Età minima',  field: { kind: 'number',   label: 'Età',                   min: 18, required: true } },
  { label: 'N° persone',  field: { kind: 'number',   label: 'Numero persone',        min: 1, required: true } },
  { label: 'Posto/Settore', field: { kind: 'select', label: 'Posto', options: ['Standard', 'VIP'] } },
  { label: 'Documento',   field: { kind: 'document', label: "Documento d'identità",  required: true } },
  { label: 'Consenso',    field: { kind: 'checkbox', label: 'Accetto le condizioni', required: true } },
]

const newFieldName = () => 'c' + Math.random().toString(36).slice(2, 7)

interface FormState {
  visibilita: 'pubblico' | 'privato'
  area: string
  classe: string
  nome: string
  indirizzo: string
  logoUrl: string
  fotoUrl: string
  descrizione: string
  prezzo: string            // prezzo base B2C (€)
  commissione: string       // % (min 3,5)
  distB2c: boolean
  distB2b: boolean
  incrementoB2b: string     // % di incremento da B2C a B2B
  codArticolo: string
  quantitaMin: string
  quantitaMax: string
  sconto1: string
  sconto2: string
  sconto3: string
  attivo: boolean
  disponibileDal: string
  disponibileAl: string
  adultiMax: string
  bambiniMax: string
  campiPrenotazione: FormFieldSpec[]
}

const EMPTY_FORM: FormState = {
  visibilita: 'pubblico',
  area: '', classe: '', nome: '', indirizzo: '', logoUrl: '', fotoUrl: '', descrizione: '',
  prezzo: '', commissione: String(COMMISSIONE_MIN),
  distB2c: true, distB2b: true, incrementoB2b: '10',
  codArticolo: '', quantitaMin: '0', quantitaMax: '0', sconto1: '', sconto2: '', sconto3: '',
  attivo: true,
  disponibileDal: '', disponibileAl: '', adultiMax: '20', bambiniMax: '10',
  campiPrenotazione: [],
}

function servizioToForm(s: Servizio): FormState {
  return {
    visibilita: s.visibilita ?? 'pubblico',
    area: s.area ?? '',
    classe: s.classe ?? '',
    nome: s.nome,
    indirizzo: s.indirizzo ?? '',
    logoUrl: s.logoUrl ?? '',
    fotoUrl: s.immagineUrl ?? '',
    descrizione: s.descrizione ?? '',
    prezzo: s.prezzoB2C ? String(s.prezzoB2C) : '',
    commissione: s.commissione != null ? String(s.commissione) : String(COMMISSIONE_MIN),
    distB2c: s.distribuzioneB2c ?? true,
    distB2b: s.distribuzioneB2b ?? true,
    incrementoB2b: s.incrementoB2bPct != null ? String(s.incrementoB2bPct) : '10',
    codArticolo: s.codArticolo ?? '',
    quantitaMin: s.quantitaMin != null ? String(s.quantitaMin) : '0',
    quantitaMax: s.quantitaMax != null ? String(s.quantitaMax) : '0',
    sconto1: s.sconto1 != null ? String(s.sconto1) : '',
    sconto2: s.sconto2 != null ? String(s.sconto2) : '',
    sconto3: s.sconto3 != null ? String(s.sconto3) : '',
    attivo: s.attivo,
    disponibileDal: s.disponibileDal ?? '',
    disponibileAl: s.disponibileAl ?? '',
    adultiMax: s.adultiMax != null ? String(s.adultiMax) : '20',
    bambiniMax: s.bambiniMax != null ? String(s.bambiniMax) : '10',
    campiPrenotazione: s.campiPrenotazione ?? [],
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100

export default function CreaServizio({ navigate, servizioId }: { navigate: (p: string) => void; servizioId?: string }) {
  const servizi       = useServiziStore(s => s.servizi)
  const addServizio   = useServiziStore(s => s.addServizio)
  const updateServizio = useServiziStore(s => s.updateServizio)
  const pushNotifica  = useNotificheServiziStore(s => s.push)

  const editing = servizioId ? servizi.find(s => s.id === servizioId) : undefined
  const [form, setForm] = useState<FormState>(editing ? servizioToForm(editing) : EMPTY_FORM)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }))

  // ── Builder campi di prenotazione (per-servizio) ───────────────────────────
  const addCampo = (preset?: Omit<FormFieldSpec, 'name'>) =>
    set('campiPrenotazione', [...form.campiPrenotazione, { name: newFieldName(), ...(preset ?? { kind: 'text', label: 'Nuovo campo' }) }])
  const updCampo = (i: number, patch: Partial<FormFieldSpec>) =>
    set('campiPrenotazione', form.campiPrenotazione.map((f, idx) => idx === i ? { ...f, ...patch } : f))
  const rmCampo = (i: number) =>
    set('campiPrenotazione', form.campiPrenotazione.filter((_, idx) => idx !== i))
  const moveCampo = (i: number, dir: -1 | 1) => {
    const n = [...form.campiPrenotazione]; const j = i + dir
    if (j < 0 || j >= n.length) return
    ;[n[i], n[j]] = [n[j], n[i]]
    set('campiPrenotazione', n)
  }

  const prezzoN      = parseFloat(form.prezzo)
  const commissioneN = parseFloat(form.commissione)
  const incrementoN  = parseFloat(form.incrementoB2b)

  const prezzoB2b = useMemo(() => {
    if (!form.distB2b || isNaN(prezzoN) || prezzoN <= 0) return null
    const inc = isNaN(incrementoN) ? 0 : incrementoN
    return round2(prezzoN * (1 + inc / 100))
  }, [form.distB2b, prezzoN, incrementoN])

  const noCanale = !form.distB2c && !form.distB2b
  const commissioneInvalida = isNaN(commissioneN) || commissioneN < COMMISSIONE_MIN
  const incrementoInvalido = form.distB2b && (form.incrementoB2b === '' || isNaN(incrementoN) || incrementoN < 0)

  const disabled =
    !form.nome.trim() || !form.area || !form.classe ||
    !form.prezzo || isNaN(prezzoN) || prezzoN <= 0 ||
    commissioneInvalida || noCanale || incrementoInvalido

  const handleCancel = () => navigate('i-miei-servizi')

  const handleSave = () => {
    if (disabled) return
    const data: Omit<Servizio, 'id'> = {
      tipo: 'attrazione',
      nome: form.nome.trim(),
      descrizione: form.descrizione,
      citta: '',
      paese: 'Italia',
      immagineUrl: form.fotoUrl,
      logoUrl: form.logoUrl,
      indirizzo: form.indirizzo,
      disponibileDal: form.disponibileDal,
      disponibileAl: form.disponibileAl,
      adultiMax: parseInt(form.adultiMax) || 0,
      bambiniMax: parseInt(form.bambiniMax) || 0,
      pricingMode: 'per-persona',
      prezzoAgora: prezzoN,
      prezzoB2C: prezzoN,
      prezzoB2B: prezzoB2b ?? prezzoN,
      durata: '',
      caratteristiche: [],
      attivo: form.attivo,
      pubblicato: false,
      stato: 'in-attesa',
      motivazioneRifiuto: undefined,
      visibilita: form.visibilita,
      area: form.area,
      classe: form.classe,
      incrementoB2bPct: isNaN(incrementoN) ? 0 : incrementoN,
      commissione: commissioneN,
      distribuzioneB2c: form.distB2c,
      distribuzioneB2b: form.distB2b,
      quantitaMin: parseInt(form.quantitaMin) || 0,
      quantitaMax: parseInt(form.quantitaMax) || 0,
      sconto1: parseFloat(form.sconto1) || 0,
      sconto2: parseFloat(form.sconto2) || 0,
      sconto3: parseFloat(form.sconto3) || 0,
      codArticolo: form.codArticolo,
      campiPrenotazione: form.campiPrenotazione.filter(f => f.label.trim()),
    }

    if (editing) {
      updateServizio(editing.id, data)
      pushNotifica({ destinatario: 'supporto', tipo: 'richiesta', servizioId: editing.id, servizioNome: data.nome, ts: Date.now() })
    } else {
      const created = addServizio(data)
      pushNotifica({ destinatario: 'supporto', tipo: 'richiesta', servizioId: created.id, servizioNome: data.nome, ts: Date.now() })
    }
    navigate('i-miei-servizi')
  }

  return (
    <div className="crea-servizio">
      <BtnBack onClick={handleCancel} />
      <PageHeader
        title={editing ? 'Modifica servizio' : 'Crea servizio'}
        subtitle="Configura il tuo servizio: andrà in verifica al supporto Sibylla prima della pubblicazione"
      />

      {editing?.stato === 'rifiutato' && editing.motivazioneRifiuto && (
        <div className="crea-servizio__rejected">
          <Icon family="regular" name="circle-xmark" />
          <div>
            <strong>Servizio rifiutato.</strong> Motivazione del supporto Sibylla: «{editing.motivazioneRifiuto}».
            Apporta le correzioni e ri-sottoponi il servizio per una nuova verifica.
          </div>
        </div>
      )}

      {/* ── Visibilità & classificazione ─────────────────────────────────── */}
      <section className="crea-servizio__section">
        <h3 className="sib-section-title">Pubblicazione e classificazione</h3>
        <FormGrid cols={3}>
          <div className="crea-servizio__field">
            <span className="crea-servizio__label">Visibilità</span>
            <div className="crea-servizio__radio-row">
              {(['pubblico', 'privato'] as const).map(v => (
                <label key={v} className="crea-servizio__radio">
                  <input type="radio" name="visibilita" checked={form.visibilita === v} onChange={() => set('visibilita', v)} className="sib-radio" />
                  {v === 'pubblico' ? 'Pubblico' : 'Privato'}
                </label>
              ))}
            </div>
          </div>
          <SelectField name="area" label="Area" required value={form.area}
            onChange={e => set('area', e.target.value)} placeholder="Seleziona area..."
            options={AREE.map(a => ({ value: a, label: a }))} />
          <SelectField name="classe" label="Classe" required value={form.classe}
            onChange={e => set('classe', e.target.value)} placeholder="Seleziona classe..."
            options={CLASSI.map(c => ({ value: c, label: c }))} />
        </FormGrid>
      </section>

      {/* ── Il tuo servizio ──────────────────────────────────────────────── */}
      <section className="crea-servizio__section">
        <h3 className="sib-section-title">Il tuo servizio</h3>
        <FormGrid cols={2}>
          <InputField name="nome" label="Nome" required value={form.nome}
            onChange={e => set('nome', e.target.value)} placeholder="Es. Transfer aeroporto" />
          <InputField name="indirizzo" label="Indirizzo" value={form.indirizzo}
            onChange={e => set('indirizzo', e.target.value)} placeholder="Indirizzo del servizio (se applicabile)" />
        </FormGrid>

        <FormGrid cols={2}>
          <div className="crea-servizio__field">
            <span className="crea-servizio__label">Logo</span>
            <div className="crea-servizio__media">
              <span className="crea-servizio__media-preview crea-servizio__media-preview--logo">
                {form.logoUrl ? <img src={form.logoUrl} alt="logo" /> : <Icon family="light" name="image" />}
              </span>
              <input className="sib-input" value={form.logoUrl} onChange={e => set('logoUrl', e.target.value)} placeholder="URL del logo" />
            </div>
          </div>
          <div className="crea-servizio__field">
            <span className="crea-servizio__label">Foto</span>
            <div className="crea-servizio__media">
              <span className="crea-servizio__media-preview">
                {form.fotoUrl ? <img src={form.fotoUrl} alt="foto" /> : <Icon family="light" name="image" />}
              </span>
              <input className="sib-input" value={form.fotoUrl} onChange={e => set('fotoUrl', e.target.value)} placeholder="URL della foto" />
            </div>
          </div>
        </FormGrid>

        <TextareaField name="descrizione" label="Descrizione" rows={3} value={form.descrizione}
          onChange={e => set('descrizione', e.target.value)} placeholder="Descrizione, dettagli, condizioni..." />

        <FormGrid cols={2}>
          <InputField name="prezzo" label="Prezzo (€)" required type="number" step={0.01} min={0}
            value={form.prezzo} onChange={e => set('prezzo', e.target.value)} placeholder="0,00"
            hint="Prezzo base al cliente finale (B2C)" />
          <InputField name="commissione" label="Commissione (%)" required type="number" step={0.1} min={COMMISSIONE_MIN}
            value={form.commissione} onChange={e => set('commissione', e.target.value)} placeholder="3,5"
            hint={`Minimo ${COMMISSIONE_MIN.toString().replace('.', ',')}%`}
            error={form.commissione !== '' && commissioneInvalida ? `La commissione minima è ${COMMISSIONE_MIN.toString().replace('.', ',')}%` : undefined} />
        </FormGrid>
      </section>

      {/* ── Disponibilità e capienza ─────────────────────────────────────── */}
      <section className="crea-servizio__section">
        <h3 className="sib-section-title">Disponibilità e capienza</h3>
        <p className="crea-servizio__hint">
          Periodo in cui il servizio è prenotabile e numero massimo di persone per prenotazione
          (usati per mostrare e filtrare il servizio nel catalogo).
        </p>
        <FormGrid cols={3}>
          <DateRangeField
            nameFrom="disponibileDal"
            nameTo="disponibileAl"
            label="Periodo di disponibilità"
            valueFrom={form.disponibileDal}
            valueTo={form.disponibileAl}
            onChangeFrom={(e: React.ChangeEvent<HTMLInputElement>) => set('disponibileDal', e.target.value)}
            onChangeTo={(e: React.ChangeEvent<HTMLInputElement>) => set('disponibileAl', e.target.value)}
          />
          <InputField name="adultiMax" label="Capienza adulti" type="number" min={0}
            value={form.adultiMax} onChange={e => set('adultiMax', e.target.value)} placeholder="20"
            hint="Max adulti per prenotazione" />
          <InputField name="bambiniMax" label="Capienza bambini" type="number" min={0}
            value={form.bambiniMax} onChange={e => set('bambiniMax', e.target.value)} placeholder="10" />
        </FormGrid>
      </section>

      {/* ── Configuratore: distribuzione ─────────────────────────────────── */}
      <section className="crea-servizio__section">
        <h3 className="sib-section-title">Distribuzione servizio</h3>
        <p className="crea-servizio__hint">Scegli i canali di distribuzione e l'incremento del prezzo da B2C a B2B.</p>

        <div className="crea-servizio__dist">
          <ToggleSwitch checked={form.distB2c} onChange={v => set('distB2c', v)} label="B2C" description="Vendita diretta al cliente finale" />
          <ToggleSwitch checked={form.distB2b} onChange={v => set('distB2b', v)} label="B2B" description="Vendita ad aziende e operatori della rete" />
        </div>

        {form.distB2b && (
          <FormGrid cols={2}>
            <InputField name="incrementoB2b" label="Incremento % da B2C a B2B" required type="number" step={0.5} min={0}
              value={form.incrementoB2b} onChange={e => set('incrementoB2b', e.target.value)} placeholder="10" />
            <div className="crea-servizio__field">
              <span className="crea-servizio__label">Prezzo B2B calcolato</span>
              <div className="crea-servizio__derived">{prezzoB2b != null ? `€ ${prezzoB2b.toFixed(2)}` : '—'}</div>
            </div>
          </FormGrid>
        )}

        {noCanale && <div className="crea-servizio__error">Seleziona almeno un canale di distribuzione</div>}
      </section>

      {/* ── Campi di prenotazione (per-servizio) ─────────────────────────── */}
      <section className="crea-servizio__section">
        <h3 className="sib-section-title">Campi di prenotazione</h3>
        <p className="crea-servizio__hint">
          Definisci i campi che il cliente dovrà compilare per prenotare/acquistare questo servizio
          (data, orario, età, posto, documento, consenso…). Ogni tipo di servizio può avere campi diversi.
        </p>

        <div className="crea-servizio__presets">
          {PRESET_CAMPI.map(p => (
            <button key={p.label} type="button" className="crea-servizio__preset" onClick={() => addCampo(p.field)}>
              <Icon family="regular" name="plus" /> {p.label}
            </button>
          ))}
        </div>

        {form.campiPrenotazione.length === 0 ? (
          <div className="crea-servizio__campi-empty">
            Nessun campo richiesto: usa i pulsanti qui sopra o «Aggiungi campo».
          </div>
        ) : (
          <div className="crea-servizio__campi">
            {form.campiPrenotazione.map((f, i) => (
              <div key={i} className="crea-servizio__campo">
                <div className="crea-servizio__campo-head">
                  <span className="crea-servizio__campo-idx">#{i + 1}</span>
                  <div className="crea-servizio__campo-ctrls">
                    <button type="button" onClick={() => moveCampo(i, -1)} disabled={i === 0} title="Sposta su"><Icon family="regular" name="chevron-up" /></button>
                    <button type="button" onClick={() => moveCampo(i, 1)} disabled={i === form.campiPrenotazione.length - 1} title="Sposta giù"><Icon family="regular" name="chevron-down" /></button>
                    <button type="button" className="crea-servizio__campo-del" onClick={() => rmCampo(i)} title="Elimina campo"><Icon family="regular" name="trash-can" /></button>
                  </div>
                </div>
                <div className="crea-servizio__campo-grid">
                  <div className="crea-servizio__field">
                    <span className="crea-servizio__label">Tipo</span>
                    <select className="sib-select" value={f.kind} onChange={e => updCampo(i, { kind: e.target.value as FormFieldKind })}>
                      {(Object.keys(KIND_LABELS_SRV) as FormFieldKind[]).map(k => <option key={k} value={k}>{KIND_LABELS_SRV[k]}</option>)}
                    </select>
                  </div>
                  <div className="crea-servizio__field">
                    <span className="crea-servizio__label">Etichetta</span>
                    <input className="sib-input" value={f.label} onChange={e => updCampo(i, { label: e.target.value })} placeholder="es. Data, Età, Posto…" />
                  </div>
                  <label className="crea-servizio__campo-check">
                    <input type="checkbox" checked={!!f.required} onChange={e => updCampo(i, { required: e.target.checked })} /> Obbligatorio
                  </label>

                  {f.kind === 'number' && (
                    <>
                      <div className="crea-servizio__field">
                        <span className="crea-servizio__label">Min</span>
                        <input type="number" className="sib-input" value={f.min ?? ''} onChange={e => updCampo(i, { min: e.target.value === '' ? undefined : parseInt(e.target.value, 10) })} />
                      </div>
                      <div className="crea-servizio__field">
                        <span className="crea-servizio__label">Max</span>
                        <input type="number" className="sib-input" value={f.max ?? ''} onChange={e => updCampo(i, { max: e.target.value === '' ? undefined : parseInt(e.target.value, 10) })} />
                      </div>
                    </>
                  )}
                  {f.kind === 'text' && (
                    <div className="crea-servizio__field crea-servizio__field--wide">
                      <span className="crea-servizio__label">Placeholder</span>
                      <input className="sib-input" value={f.placeholder ?? ''} onChange={e => updCampo(i, { placeholder: e.target.value })} />
                    </div>
                  )}
                  {f.kind === 'select' && (
                    <div className="crea-servizio__field crea-servizio__field--wide">
                      <span className="crea-servizio__label">Opzioni <em>(separate da virgola)</em></span>
                      <input className="sib-input" value={(f.options ?? []).join(', ')} onChange={e => updCampo(i, { options: e.target.value.split(',').map(o => o.trim()).filter(Boolean) })} placeholder="es. Standard, VIP" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <button type="button" className="sib-btn sib-btn--ghost crea-servizio__add-campo" onClick={() => addCampo()}>
          <Icon family="regular" name="plus" /> Aggiungi campo
        </button>
      </section>

      {/* ── Avanzate ─────────────────────────────────────────────────────── */}
      <section className="crea-servizio__section">
        <h3 className="sib-section-title">Impostazioni avanzate</h3>
        <FormGrid cols={4}>
          <InputField name="codArticolo" label="Cod. articolo" value={form.codArticolo}
            onChange={e => set('codArticolo', e.target.value)} placeholder="Opzionale" />
          <InputField name="quantitaMin" label="Quantità minima" type="number" min={0}
            value={form.quantitaMin} onChange={e => set('quantitaMin', e.target.value)} placeholder="0" />
          <InputField name="quantitaMax" label="Quantità massima" type="number" min={0}
            value={form.quantitaMax} onChange={e => set('quantitaMax', e.target.value)} placeholder="0 (= illimitata)" />
          <div className="crea-servizio__field">
            <span className="crea-servizio__label">Stato</span>
            <ToggleSwitch checked={form.attivo} onChange={v => set('attivo', v)} label={form.attivo ? 'Attivo' : 'Disattivo'} />
          </div>
        </FormGrid>
        <FormGrid cols={3}>
          <InputField name="sconto1" label="Sconto 1 (%)" type="number" step={0.01} min={0} max={100}
            value={form.sconto1} onChange={e => set('sconto1', e.target.value)} placeholder="0,00" />
          <InputField name="sconto2" label="Sconto 2 (%)" type="number" step={0.01} min={0} max={100}
            value={form.sconto2} onChange={e => set('sconto2', e.target.value)} placeholder="0,00" />
          <InputField name="sconto3" label="Sconto 3 (%)" type="number" step={0.01} min={0} max={100}
            value={form.sconto3} onChange={e => set('sconto3', e.target.value)} placeholder="0,00" />
        </FormGrid>
      </section>

      <FormActions
        onCancel={handleCancel}
        onConfirm={handleSave}
        confirmLabel={editing ? 'Ri-sottometti per approvazione' : 'Invia per approvazione'}
        confirmIcon="fa-paper-plane"
        confirmDisabled={disabled}
      />
    </div>
  )
}
