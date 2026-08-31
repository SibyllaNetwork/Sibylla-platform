import React, { useMemo, useState } from 'react'
import clsx from 'clsx'
import { CfgToolbar, CfgTable } from '../../../../../core/cfg'
import { SelectField, InputField, ToggleSwitch } from '../../../../../core/components/form'
import Modal from '../../../../../core/components/Modal'
import Tooltip from '../../../../../core/components/Tooltip'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { toast } from '../../../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import { useVociMenuStore, OUTLET_FB } from '../../../../../store/useVociMenuStore'
import {
  useStampantiStore,
  stampantiOrdinate,
  tipoStampanteMeta,
  protocolloLabel,
  ipValido,
  TIPI_STAMPANTE,
  PROTOCOLLI_STAMPANTE,
  REPARTI_STAMPA,
  type Stampante,
  type TipoStampante,
  type ConnessioneStampante,
  type ProtocolloStampante,
} from '../../../../../store/useStampantiStore'
import type { CfgPaneComponentProps } from '../../Configuratore'
import './Stampanti.sass'

// ─── STAMPANTI (F&B) ──────────────────────────────────────────────────────────
//  Anagrafica delle stampanti di reparto e di cassa. Rispetto alla pagina
//  precedente:
//   • il «—» nella colonna IP ora ha una ragione dichiarata: la stampante è
//     collegata alla cassa (locale) e non in rete, e l'IP si chiede soltanto
//     alle stampanti in rete — dove viene anche validato;
//   • ogni riga dice quante voci di menu le instradano la comanda: una
//     stampante di reparto senza voci non stamperà nulla, e si vede;
//   • «Stampa di prova» sulla riga: il modo con cui in reparto si verifica
//     davvero una configurazione.

const PANE_ID = 'fb-stampanti'
const TUTTI = 'tutti'

interface Form {
  nome: string
  tipo: TipoStampante
  connessione: ConnessioneStampante
  ip: string
  protocollo: ProtocolloStampante
  outletId: number | null
  reparto: string
}

const FORM_VUOTO: Form = {
  nome: '', tipo: 'produzione', connessione: 'rete', ip: '',
  protocollo: 'epson', outletId: OUTLET_FB[0].id, reparto: REPARTI_STAMPA[0],
}

export default function Stampanti({ onGoTo }: CfgPaneComponentProps) {
  const stampanti      = useStampantiStore(s => s.stampanti)
  const addStampante    = useStampantiStore(s => s.addStampante)
  const updateStampante = useStampantiStore(s => s.updateStampante)
  const removeStampante = useStampantiStore(s => s.removeStampante)
  const toggleStampante = useStampantiStore(s => s.toggleStampante)
  const voci    = useVociMenuStore(s => s.voci)
  const confirm = useConfirmStore(s => s.confirm)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)

  const [outlet, setOutlet] = useState<number | typeof TUTTI>(TUTTI)
  const [famiglia, setFamiglia] = useState<'tutte' | 'produzione' | 'cassa'>('tutte')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Form>(FORM_VUOTO)

  const righe = useMemo(() =>
    stampantiOrdinate(stampanti, outlet === TUTTI ? 'tutti' : outlet)
      .filter(s => famiglia === 'tutte' || tipoStampanteMeta(s.tipo).famiglia === famiglia),
    [stampanti, outlet, famiglia])

  /** Quante voci di menu instradano la comanda a ciascuna stampante. */
  const conteggi = useMemo(() => {
    const m = new Map<string, number>()
    voci.forEach(v => new Set(v.stampanti.map(r => r.stampanteId))
      .forEach(id => m.set(id, (m.get(id) ?? 0) + 1)))
    return m
  }, [voci])

  const upd = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))

  const apriNuova = () => {
    setEditId(null)
    setForm({ ...FORM_VUOTO, outletId: outlet === TUTTI ? OUTLET_FB[0].id : outlet })
    setModalOpen(true)
  }

  const apriModifica = (s: Stampante) => {
    setEditId(s.id)
    setForm({
      nome: s.nome, tipo: s.tipo, connessione: s.connessione, ip: s.ip,
      protocollo: s.protocollo, outletId: s.outletId,
      reparto: s.reparto || REPARTI_STAMPA[0],
    })
    setModalOpen(true)
  }

  const diProduzione = form.tipo === 'produzione'
  const inRete = form.connessione === 'rete'
  const ipErrato = inRete && form.ip.trim() !== '' && !ipValido(form.ip)
  const nomeDuplicato = stampanti.some(s =>
    s.id !== editId && s.nome.trim().toLowerCase() === form.nome.trim().toLowerCase())
  const ipDuplicato = inRete && ipValido(form.ip) && stampanti.some(s =>
    s.id !== editId && s.ip.trim() === form.ip.trim())

  const salvabile = !!form.nome.trim()
    && !nomeDuplicato
    && !ipDuplicato
    && (!inRete || ipValido(form.ip))

  const salva = () => {
    if (!salvabile) return
    const dati = {
      nome: form.nome.trim(),
      tipo: form.tipo,
      connessione: form.connessione,
      ip: inRete ? form.ip.trim() : '',
      protocollo: form.protocollo,
      outletId: form.outletId,
      reparto: diProduzione ? form.reparto : '',
    }
    if (editId) {
      updateStampante(editId, dati)
      toast.success(`Stampante «${dati.nome}» aggiornata`)
    } else {
      addStampante({ ...dati, attiva: true })
      toast.success(`Stampante «${dati.nome}» aggiunta`)
    }
    setCompletion(PANE_ID, 'configured')
    setModalOpen(false)
  }

  const elimina = async (s: Stampante) => {
    const usata = conteggi.get(s.id) ?? 0
    const ok = await confirm({
      title: 'Elimina stampante',
      message: usata > 0
        ? `«${s.nome}» è l'instradamento di ${usata} voci di menu: eliminandola quelle comande non verranno più stampate. Procedere?`
        : `Eliminare la stampante «${s.nome}»?`,
      confirmLabel: 'Elimina', danger: true,
    })
    if (!ok) return
    removeStampante(s.id)
    toast.success('Stampante eliminata')
  }

  const stampaDiProva = (s: Stampante) => {
    if (!s.attiva) {
      toast.error(`«${s.nome}» è disattivata: attivala prima di provarla.`)
      return
    }
    toast.success(s.connessione === 'rete'
      ? `Stampa di prova inviata a ${s.nome} (${s.ip})`
      : `Stampa di prova inviata a ${s.nome} (collegata alla cassa)`)
  }

  const nomeOutlet = (id: number | null): string =>
    id === null ? 'Tutti' : `${id} - ${OUTLET_FB.find(o => o.id === id)?.nome ?? ''}`

  return (
    <div className="stampanti">
      <CfgToolbar
        actions={(
          <button type="button" className="sib-btn sib-btn--primary" onClick={apriNuova}>
            <i className="fa-solid fa-plus" aria-hidden="true" />
            Nuova stampante
          </button>
        )}
      >
        <SelectField
          name="outlet"
          label="Outlet"
          value={outlet}
          onChange={(e) => setOutlet(e.target.value === TUTTI ? TUTTI : Number(e.target.value))}
          options={[
            { value: TUTTI, label: 'Tutti gli outlet' },
            ...OUTLET_FB.map(o => ({ value: o.id, label: `${o.id} - ${o.nome}` })),
          ]}
        />
        <SelectField
          name="famiglia"
          label="Destinazione"
          value={famiglia}
          onChange={(e) => setFamiglia(e.target.value as 'tutte' | 'produzione' | 'cassa')}
          options={[
            { value: 'tutte',      label: 'Tutte le stampanti' },
            { value: 'produzione', label: 'Reparto produzione (cucina/bar)' },
            { value: 'cassa',      label: 'Cassa (fiscale/preconto)' },
          ]}
        />
      </CfgToolbar>

      <CfgTable
        columns={[
          { key: 'nome',   label: 'Nome',        width: '18%' },
          { key: 'tipo',   label: 'Tipo',        width: '15%' },
          { key: 'ip',     label: 'Indirizzo',   width: '12%' },
          { key: 'proto',  label: 'Protocollo',  width: '12%' },
          { key: 'outlet', label: 'Outlet',      width: '13%' },
          { key: 'voci',   label: 'Voci',        width: '5%',  align: 'right' },
          { key: 'stato',  label: 'Stato',       width: '14%' },
          { key: 'azioni', label: 'Azioni',      width: '11%', align: 'right' },
        ]}
        empty={<span>Nessuna stampante per i filtri impostati.</span>}
      >
        {righe.map(s => {
          const meta = tipoStampanteMeta(s.tipo)
          const usata = conteggi.get(s.id) ?? 0
          return (
            <tr key={s.id} className={clsx(!s.attiva && 'stampanti__row--off')}>
              <td className="stampanti__td-nome">
                <TruncatedText text={s.nome} />
                {s.reparto && <span className="stampanti__reparto">{s.reparto}</span>}
              </td>
              <td>
                <Tooltip content={meta.hint}>
                  <span className="stampanti__tipo" style={{ ['--st-c' as any]: meta.colore }}>
                    <span className="stampanti__tipo-dot" aria-hidden="true" />
                    {meta.label}
                  </span>
                </Tooltip>
              </td>
              <td className="stampanti__td-ip">
                {s.connessione === 'rete' ? s.ip : (
                  <Tooltip content="Stampante collegata alla cassa: non ha indirizzo di rete">
                    <span className="stampanti__locale">
                      <i className="fa-solid fa-plug" aria-hidden="true" /> locale
                    </span>
                  </Tooltip>
                )}
              </td>
              <td className="stampanti__td-proto">{protocolloLabel(s.protocollo)}</td>
              <td className="stampanti__td-outlet">
                <TruncatedText text={nomeOutlet(s.outletId)} />
              </td>
              <td className="stampanti__td-num">
                {usata > 0 ? (
                  <Tooltip content={`${usata} voci di menu stampano qui`}>
                    <span>{usata}</span>
                  </Tooltip>
                ) : (
                  <Tooltip content="Nessuna voce di menu instrada la comanda a questa stampante">
                    <span className="stampanti__zero">0</span>
                  </Tooltip>
                )}
              </td>
              <td>
                <ToggleSwitch
                  checked={s.attiva}
                  label={s.attiva ? 'Attiva' : 'Disattiva'}
                  onChange={() => toggleStampante(s.id)}
                />
              </td>
              <td className="stampanti__td-azioni">
                <Tooltip content="Stampa di prova">
                  <button
                    type="button" className="sib-btn sib-btn--icon"
                    onClick={() => stampaDiProva(s)}
                    aria-label={`Stampa di prova su ${s.nome}`}
                  >
                    <i className="fa-solid fa-print" />
                  </button>
                </Tooltip>
                <Tooltip content="Modifica">
                  <button
                    type="button" className="sib-btn sib-btn--icon"
                    onClick={() => apriModifica(s)}
                    aria-label={`Modifica ${s.nome}`}
                  >
                    <i className="fa-solid fa-pen" />
                  </button>
                </Tooltip>
                <Tooltip content="Elimina">
                  <button
                    type="button" className="sib-btn sib-btn--icon"
                    onClick={() => elimina(s)}
                    aria-label={`Elimina ${s.nome}`}
                  >
                    <i className="fa-solid fa-trash" />
                  </button>
                </Tooltip>
              </td>
            </tr>
          )
        })}
      </CfgTable>

      <p className="stampanti__nota">
        <i className="fa-light fa-circle-info" aria-hidden="true" />
        Qui si dichiarano le stampanti disponibili; una stampante «Tutti» serve ogni outlet.
        Le comande si instradano poi voce per voce
        {onGoTo ? (
          <>
            {' in '}
            <button type="button" className="stampanti__link" onClick={() => onGoTo('fb-voci-menu')}>
              Voci menu
            </button>.
          </>
        ) : ' in «Voci menu».'}
      </p>

      {modalOpen && (
        <Modal
          open
          onClose={() => setModalOpen(false)}
          title={editId ? 'Modifica stampante' : 'Nuova stampante'}
          size="md"
        >
          <div className="stampanti__form">
            <div className="stampanti__form-grid">
              <InputField
                name="nome"
                label="Nome"
                required
                value={form.nome}
                placeholder="es. Cucina - Caldi"
                error={nomeDuplicato ? 'Esiste già una stampante con questo nome.' : undefined}
                onChange={(e) => upd('nome', e.target.value)}
              />
              <SelectField
                name="tipo"
                label="Tipo"
                value={form.tipo}
                onChange={(e) => upd('tipo', e.target.value as TipoStampante)}
                options={TIPI_STAMPANTE.map(t => ({ value: t.id, label: `${t.label} — ${t.hint}` }))}
              />
              {diProduzione && (
                <SelectField
                  name="reparto"
                  label="Reparto servito"
                  value={form.reparto}
                  onChange={(e) => upd('reparto', e.target.value)}
                  options={REPARTI_STAMPA.map(r => ({ value: r, label: r }))}
                />
              )}
              <SelectField
                name="outlet"
                label="Outlet"
                value={form.outletId === null ? 'null' : form.outletId}
                onChange={(e) => upd('outletId', e.target.value === 'null' ? null : Number(e.target.value))}
                options={[
                  { value: 'null', label: 'Tutti gli outlet' },
                  ...OUTLET_FB.map(o => ({ value: o.id, label: `${o.id} - ${o.nome}` })),
                ]}
              />
              <SelectField
                name="connessione"
                label="Connessione"
                value={form.connessione}
                onChange={(e) => upd('connessione', e.target.value as ConnessioneStampante)}
                options={[
                  { value: 'rete',   label: 'In rete (indirizzo IP)' },
                  { value: 'locale', label: 'Collegata alla cassa' },
                ]}
              />
              <InputField
                name="ip"
                label="Indirizzo IP"
                required={inRete}
                disabled={!inRete}
                value={inRete ? form.ip : ''}
                placeholder={inRete ? '192.168.1.70' : 'non richiesto'}
                error={ipErrato
                  ? 'Indirizzo IPv4 non valido.'
                  : ipDuplicato ? 'Indirizzo già usato da un\'altra stampante.' : undefined}
                onChange={(e) => upd('ip', e.target.value)}
              />
              <SelectField
                name="protocollo"
                label="Protocollo"
                value={form.protocollo}
                onChange={(e) => upd('protocollo', e.target.value as ProtocolloStampante)}
                options={PROTOCOLLI_STAMPANTE.map(p => ({ value: p.id, label: p.label }))}
              />
            </div>
            <div className="stampanti__form-foot">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setModalOpen(false)}>
                Annulla
              </button>
              <button type="button" className="sib-btn sib-btn--primary" disabled={!salvabile} onClick={salva}>
                Salva
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
