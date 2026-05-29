import React, { useMemo, useState } from 'react'
import Ico from '../../../../core/icons/Ico'
import { Icon } from '../../../../modules/purchasing/_shared/Icon'
import { PageToolbar, type ViewMode } from '../../../../modules/purchasing/_shared/PageToolbar'
import ConfirmDeleteModal from '../../modals/ConfirmDeleteModal/ConfirmDeleteModal'
import StrutturaPlatformModal from '../../modals/StrutturaPlatformModal/StrutturaPlatformModal'
import StrutturaPreviewModal from '../../modals/StrutturaPreviewModal/StrutturaPreviewModal'
import { useStrutturaPlatformStore } from '../../../../store/useStrutturaPlatformStore'
import {
  AMBITI,
  CANALI_VENDITA,
  CLASSIFICAZIONI,
  TIPI_STRUTTURA,
  type AmbitoStruttura,
  type CanaleVendita,
  type Classificazione,
  type Struttura,
  type StrutturaForm,
  type TipoStruttura,
} from '../../strutture/types'
import './StruttureTab.sass'

type SortKey = 'name-asc' | 'name-desc' | 'tipo' | 'city' | 'rooms-desc' | 'rooms-asc'

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'name-asc',   label: 'Nome (A → Z)' },
  { value: 'name-desc',  label: 'Nome (Z → A)' },
  { value: 'tipo',       label: 'Tipo' },
  { value: 'city',       label: 'Città' },
  { value: 'rooms-desc', label: 'Camere ↓' },
  { value: 'rooms-asc',  label: 'Camere ↑' },
]

const DEFAULT_SORT: SortKey = 'name-asc'

const EMPTY_FORM: StrutturaForm = {
  nome: '', tipo: 'hotel', classificazione: '4★', ambito: 'urbano',
  indirizzo: '', citta: '', provincia: '', regione: '', cap: '', paese: 'Italia',
  lat: '', lon: '',
  email: '', telefono: '', sito: '', logoUrl: '', descrizione: '',
  camere: '20', valuta: 'EUR', lingua: 'it', timezone: 'Europe/Rome',
  arrangiamenti: 'BB',
  tassaSoggiorno: '0', checkInOra: '15:00', checkOutOra: '11:00',
  clienteId: '', clienteNome: '',
  descrizioneLocalita: '',
  fotoPrincipale: '',
  galleria: '',
  canaleAgoraPubblicata: false, canaleAgoraTagline: '', canaleAgoraNote: '',
  canaleB2BPubblicata:   false, canaleB2BTagline:   '', canaleB2BNote:   '',
  canaleB2CPubblicata:   false, canaleB2CTagline:   '', canaleB2CNote:   '',
  tipologieCamere: [],
  attiva: true,
}

const tipoLabel = (t: TipoStruttura) => TIPI_STRUTTURA.find(x => x.value === t)?.label ?? t
const tipoIcon  = (t: TipoStruttura) => TIPI_STRUTTURA.find(x => x.value === t)?.icon  ?? 'building'

const formToStruttura = (f: StrutturaForm): Omit<Struttura, 'id'> => ({
  nome: f.nome.trim(),
  tipo: f.tipo,
  classificazione: f.classificazione,
  ambito: f.ambito,
  indirizzo: f.indirizzo.trim(),
  citta: f.citta.trim(),
  provincia: f.provincia.trim().toUpperCase(),
  regione: f.regione.trim(),
  cap: f.cap.trim(),
  paese: f.paese.trim() || 'Italia',
  lat: f.lat ? parseFloat(f.lat) : undefined,
  lon: f.lon ? parseFloat(f.lon) : undefined,
  email: f.email.trim(),
  telefono: f.telefono.trim(),
  sito: f.sito.trim(),
  logoUrl: f.logoUrl.trim(),
  descrizione: f.descrizione.trim(),
  camere: parseInt(f.camere) || 0,
  valuta: f.valuta.trim().toUpperCase() || 'EUR',
  lingua: f.lingua.trim().toLowerCase() || 'it',
  timezone: f.timezone.trim() || 'Europe/Rome',
  arrangiamenti: f.arrangiamenti.split(',').map(x => x.trim().toUpperCase()).filter(Boolean),
  tassaSoggiorno: parseFloat(f.tassaSoggiorno) || 0,
  checkInOra: f.checkInOra || '15:00',
  checkOutOra: f.checkOutOra || '11:00',
  clienteId: f.clienteId ? parseInt(f.clienteId) : undefined,
  clienteNome: f.clienteNome.trim() || undefined,
  descrizioneLocalita: f.descrizioneLocalita.trim(),
  fotoPrincipale: f.fotoPrincipale.trim(),
  galleria: f.galleria.split('\n').map(x => x.trim()).filter(Boolean),
  tipologieCamere: f.tipologieCamere,
  canali: {
    agora: { pubblicata: f.canaleAgoraPubblicata, tagline: f.canaleAgoraTagline.trim(), notePubblicazione: f.canaleAgoraNote.trim() },
    b2b:   { pubblicata: f.canaleB2BPubblicata,   tagline: f.canaleB2BTagline.trim(),   notePubblicazione: f.canaleB2BNote.trim() },
    b2c:   { pubblicata: f.canaleB2CPubblicata,   tagline: f.canaleB2CTagline.trim(),   notePubblicazione: f.canaleB2CNote.trim() },
  },
  attiva: f.attiva,
})

const strutturaToForm = (s: Struttura): StrutturaForm => ({
  nome: s.nome,
  tipo: s.tipo,
  classificazione: s.classificazione,
  ambito: s.ambito,
  indirizzo: s.indirizzo,
  citta: s.citta,
  provincia: s.provincia,
  regione: s.regione,
  cap: s.cap,
  paese: s.paese,
  lat: s.lat !== undefined ? String(s.lat) : '',
  lon: s.lon !== undefined ? String(s.lon) : '',
  email: s.email,
  telefono: s.telefono,
  sito: s.sito,
  logoUrl: s.logoUrl,
  descrizione: s.descrizione,
  camere: String(s.camere),
  valuta: s.valuta,
  lingua: s.lingua,
  timezone: s.timezone,
  arrangiamenti: s.arrangiamenti.join(', '),
  tassaSoggiorno: String(s.tassaSoggiorno),
  checkInOra: s.checkInOra,
  checkOutOra: s.checkOutOra,
  clienteId: s.clienteId !== undefined ? String(s.clienteId) : '',
  clienteNome: s.clienteNome ?? '',
  descrizioneLocalita: s.descrizioneLocalita,
  fotoPrincipale: s.fotoPrincipale,
  galleria: s.galleria.join('\n'),
  canaleAgoraPubblicata: s.canali.agora.pubblicata,
  canaleAgoraTagline:    s.canali.agora.tagline,
  canaleAgoraNote:       s.canali.agora.notePubblicazione,
  canaleB2BPubblicata:   s.canali.b2b.pubblicata,
  canaleB2BTagline:      s.canali.b2b.tagline,
  canaleB2BNote:         s.canali.b2b.notePubblicazione,
  canaleB2CPubblicata:   s.canali.b2c.pubblicata,
  canaleB2CTagline:      s.canali.b2c.tagline,
  canaleB2CNote:         s.canali.b2c.notePubblicazione,
  tipologieCamere: s.tipologieCamere.map(t => ({ ...t })),
  attiva: s.attiva,
})

export default function StruttureProprieView() {
  const strutture        = useStrutturaPlatformStore(s => s.strutture)
  const addStruttura     = useStrutturaPlatformStore(s => s.addStruttura)
  const updateStruttura  = useStrutturaPlatformStore(s => s.updateStruttura)
  const removeStruttura  = useStrutturaPlatformStore(s => s.removeStruttura)
  const toggleAttiva     = useStrutturaPlatformStore(s => s.toggleAttiva)
  const toggleCanale     = useStrutturaPlatformStore(s => s.toggleCanale)

  const [view, setView] = useState<ViewMode>('list')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>(DEFAULT_SORT)
  const [tipoFilter, setTipoFilter]   = useState<TipoStruttura | ''>('')
  const [ambitoFilter, setAmbitoFilter] = useState<AmbitoStruttura | ''>('')
  const [classFilter, setClassFilter] = useState<Classificazione | ''>('')

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Struttura | null>(null)
  const [form, setForm] = useState<StrutturaForm>(EMPTY_FORM)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Stato dell'anteprima canale aperta dalla lista
  const [previewState, setPreviewState] = useState<{ struttura: Struttura; canale: CanaleVendita } | null>(null)
  const openPreview = (s: Struttura, canale: CanaleVendita) => setPreviewState({ struttura: s, canale })

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = strutture.filter(s => {
      if (tipoFilter && s.tipo !== tipoFilter) return false
      if (ambitoFilter && s.ambito !== ambitoFilter) return false
      if (classFilter && s.classificazione !== classFilter) return false
      if (!q) return true
      return (
        s.nome.toLowerCase().includes(q) ||
        s.citta.toLowerCase().includes(q) ||
        s.regione.toLowerCase().includes(q) ||
        (s.clienteNome || '').toLowerCase().includes(q) ||
        tipoLabel(s.tipo).toLowerCase().includes(q)
      )
    })
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':   return a.nome.localeCompare(b.nome)
        case 'name-desc':  return b.nome.localeCompare(a.nome)
        case 'tipo':       return a.tipo.localeCompare(b.tipo) || a.nome.localeCompare(b.nome)
        case 'city':       return a.citta.localeCompare(b.citta) || a.nome.localeCompare(b.nome)
        case 'rooms-desc': return b.camere - a.camere
        case 'rooms-asc':  return a.camere - b.camere
      }
    })
  }, [strutture, search, sortBy, tipoFilter, ambitoFilter, classFilter])

  const filtersDirty =
    sortBy !== DEFAULT_SORT || tipoFilter !== '' || ambitoFilter !== '' || classFilter !== ''
  const resetFilters = () => {
    setSortBy(DEFAULT_SORT); setTipoFilter(''); setAmbitoFilter(''); setClassFilter('')
  }

  // Stats
  const stats = useMemo(() => {
    const totalCamere = strutture.reduce((acc, s) => acc + s.camere, 0)
    const attive  = strutture.filter(s => s.attiva).length
    const onAny   = strutture.filter(s => s.canali.agora.pubblicata || s.canali.b2b.pubblicata || s.canali.b2c.pubblicata).length
    const cliCnt  = new Set(strutture.map(s => s.clienteId).filter(Boolean)).size
    return { total: strutture.length, totalCamere, attive, onAny, cliCnt }
  }, [strutture])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }
  const openEdit = (s: Struttura) => {
    setEditing(s)
    setForm(strutturaToForm(s))
    setShowModal(true)
  }
  const confirmEdit = () => {
    const data = formToStruttura(form)
    if (!data.nome || !data.citta) return
    if (editing) updateStruttura(editing.id, data)
    else addStruttura(data)
    setShowModal(false)
  }
  const confirmDelete = () => {
    if (!deletingId) return
    removeStruttura(deletingId)
    setDeletingId(null)
  }

  return (
    <div className="strutt-prop strutt-prop--fullwidth">
      <div className="strutt-prop__counters">
        <div className="strutt-prop__counter">
          <i className="fa-duotone fa-building strutt-prop__counter-ico" />
          <div>
            <div className="strutt-prop__counter-value">{stats.total}</div>
            <div className="strutt-prop__counter-label">Strutture</div>
          </div>
        </div>
        <div className="strutt-prop__counter">
          <i className="fa-duotone fa-bed strutt-prop__counter-ico" />
          <div>
            <div className="strutt-prop__counter-value">{stats.totalCamere}</div>
            <div className="strutt-prop__counter-label">Camere totali</div>
          </div>
        </div>
        <div className="strutt-prop__counter">
          <i className="fa-duotone fa-circle-check strutt-prop__counter-ico" />
          <div>
            <div className="strutt-prop__counter-value">{stats.attive}</div>
            <div className="strutt-prop__counter-label">Attive</div>
          </div>
        </div>
        <div className="strutt-prop__counter">
          <i className="fa-duotone fa-globe strutt-prop__counter-ico" />
          <div>
            <div className="strutt-prop__counter-value">{stats.onAny}</div>
            <div className="strutt-prop__counter-label">Sui canali</div>
          </div>
        </div>
        <div className="strutt-prop__counter">
          <i className="fa-duotone fa-user strutt-prop__counter-ico" />
          <div>
            <div className="strutt-prop__counter-value">{stats.cliCnt}</div>
            <div className="strutt-prop__counter-label">Clienti</div>
          </div>
        </div>
      </div>

      <PageToolbar
        search={{ value: search, onChange: setSearch, placeholder: 'Cerca per nome, città, cliente…' }}
        view={view}
        onViewChange={setView}
        filtersDirty={filtersDirty}
        onResetFilters={resetFilters}
        extraActions={
          <button type="button" className="sib-btn sib-btn--primary" onClick={openCreate}>
            <Ico n="plus" s={12} c="#fff" />
            Nuova struttura
          </button>
        }
        filterPanel={
          <>
            <fieldset className="page-toolbar__filter-section">
              <legend className="page-toolbar__filter-label">Ordina per</legend>
              <div className="page-toolbar__filter-options">
                {SORT_OPTIONS.map(opt => (
                  <label key={opt.value} className="page-toolbar__filter-option">
                    <input
                      type="radio"
                      name="strutt-sortBy"
                      value={opt.value}
                      checked={sortBy === opt.value}
                      onChange={() => setSortBy(opt.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="page-toolbar__filter-section">
              <legend className="page-toolbar__filter-label">Tipo</legend>
              <select
                className="sib-select"
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value as TipoStruttura | '')}
              >
                <option value="">Tutti</option>
                {TIPI_STRUTTURA.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </fieldset>

            <fieldset className="page-toolbar__filter-section">
              <legend className="page-toolbar__filter-label">Ambito</legend>
              <select
                className="sib-select"
                value={ambitoFilter}
                onChange={(e) => setAmbitoFilter(e.target.value as AmbitoStruttura | '')}
              >
                <option value="">Tutti</option>
                {AMBITI.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </fieldset>

            <fieldset className="page-toolbar__filter-section">
              <legend className="page-toolbar__filter-label">Classificazione</legend>
              <select
                className="sib-select"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value as Classificazione | '')}
              >
                <option value="">Tutte</option>
                {CLASSIFICAZIONI.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </fieldset>
          </>
        }
      />

      <div className="strutt-prop__count">
        {displayed.length} strutture{displayed.length !== strutture.length && ` su ${strutture.length}`}
      </div>

      {displayed.length === 0 ? (
        <div className="strutt-prop__empty">Nessuna struttura corrisponde ai filtri impostati.</div>
      ) : view === 'list' ? (
        <div className="sib-table-wrap">
          <table className="sib-table strutt-prop__table">
            <thead>
              <tr>
                <th style={{ width: 56 }}></th>
                <th>Struttura</th>
                <th>Tipo</th>
                <th>★</th>
                <th>Località</th>
                <th>Cam.</th>
                <th>Cliente</th>
                <th>Att.</th>
                <th>Canali Sibylla Network</th>
                <th className="strutt-prop__th-actions">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(s => (
                <tr key={s.id} className={s.attiva ? '' : 'strutt-prop__row--off'}>
                  <td>
                    <div className="strutt-prop__thumb">
                      {s.logoUrl
                        ? <img src={s.logoUrl} alt={s.nome} />
                        : <Ico n="image" s={16} c="var(--color-text-disabled)" />}
                    </div>
                  </td>
                  <td>
                    <div className="strutt-prop__name">{s.nome}</div>
                    <div className="strutt-prop__sub">{s.indirizzo}</div>
                  </td>
                  <td>
                    <span className="strutt-prop__tipo-badge">
                      <Icon family="light" name={tipoIcon(s.tipo)} />
                      {tipoLabel(s.tipo)}
                    </span>
                  </td>
                  <td className="strutt-prop__class-cell">{s.classificazione}</td>
                  <td>
                    {s.citta}
                    <div className="strutt-prop__sub">{s.regione} · {AMBITI.find(a => a.value === s.ambito)?.label}</div>
                  </td>
                  <td className="strutt-prop__num">{s.camere}</td>
                  <td>{s.clienteNome || '—'}</td>
                  <td>
                    <label className="strutt-prop__switch" title={s.attiva ? 'Disattiva' : 'Attiva'}>
                      <input type="checkbox" checked={s.attiva} onChange={() => toggleAttiva(s.id)} />
                      <span className="strutt-prop__switch-slider" />
                    </label>
                  </td>
                  <td>
                    <div className="strutt-prop__canali">
                      {CANALI_VENDITA.map(c => {
                        const on = s.canali[c.id].pubblicata
                        return (
                          <div
                            key={c.id}
                            className="strutt-prop__canale-group"
                            style={{ '--canale-color': c.color } as React.CSSProperties}
                          >
                            <button
                              type="button"
                              className={`strutt-prop__canale-pill${on ? ' strutt-prop__canale-pill--on' : ''}`}
                              onClick={() => toggleCanale(s.id, c.id)}
                              title={`${on ? 'Nascondi su' : 'Pubblica su'} ${c.label} — destinazione: ${c.destinazione}`}
                            >
                              {c.label}
                            </button>
                            <button
                              type="button"
                              className="strutt-prop__canale-preview"
                              onClick={() => openPreview(s, c.id)}
                              title={`Anteprima su ${c.destinazione}`}
                              aria-label={`Anteprima ${c.label}`}
                            >
                              <Icon family="regular" name="eye" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </td>
                  <td className="strutt-prop__cell-actions">
                    <button
                      type="button"
                      className="strutt-prop__icon-btn"
                      title="Modifica struttura"
                      aria-label="Modifica"
                      onClick={() => openEdit(s)}
                    >
                      <Ico n="edit" s={13} c="var(--color-primary)" />
                    </button>
                    <button
                      type="button"
                      className="strutt-prop__icon-btn strutt-prop__icon-btn--danger"
                      title="Elimina struttura"
                      aria-label="Elimina"
                      onClick={() => setDeletingId(s.id)}
                    >
                      <Ico n="trash" s={13} c="var(--color-error, #c0392b)" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="strutt-prop__grid">
          {displayed.map(s => (
            <article key={s.id} className={`strutt-card${s.attiva ? '' : ' strutt-card--off'}`}>
              <div className="strutt-card__logo">
                {s.logoUrl
                  ? <img src={s.logoUrl} alt={s.nome} />
                  : <Ico n="image" s={22} c="var(--color-text-disabled)" />}
                <span className="strutt-card__class-badge">{s.classificazione}</span>
              </div>
              <div className="strutt-card__body">
                <span className="strutt-card__tipo">
                  <Icon family="light" name={tipoIcon(s.tipo)} />
                  {tipoLabel(s.tipo)} · {AMBITI.find(a => a.value === s.ambito)?.label}
                </span>
                <h3 className="strutt-card__title">{s.nome}</h3>
                <p className="strutt-card__location">
                  <Icon family="regular" name="location-dot" />
                  {s.citta}, {s.regione}
                </p>
                <p className="strutt-card__desc">{s.descrizione}</p>
                <dl className="strutt-card__meta">
                  <div><dt>Camere</dt><dd>{s.camere}</dd></div>
                  <div><dt>Cliente</dt><dd>{s.clienteNome || '—'}</dd></div>
                </dl>
                <div className="strutt-card__canali">
                  {CANALI_VENDITA.map(c => {
                    const on = s.canali[c.id].pubblicata
                    return (
                      <div
                        key={c.id}
                        className="strutt-prop__canale-group"
                        style={{ '--canale-color': c.color } as React.CSSProperties}
                      >
                        <button
                          type="button"
                          className={`strutt-prop__canale-pill${on ? ' strutt-prop__canale-pill--on' : ''}`}
                          onClick={() => toggleCanale(s.id, c.id)}
                          title={`${on ? 'Nascondi su' : 'Pubblica su'} ${c.label} — ${c.destinazione}`}
                        >
                          {c.label}
                        </button>
                        <button
                          type="button"
                          className="strutt-prop__canale-preview"
                          onClick={() => openPreview(s, c.id)}
                          title={`Anteprima su ${c.destinazione}`}
                          aria-label={`Anteprima ${c.label}`}
                        >
                          <Icon family="regular" name="eye" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="strutt-card__actions">
                <button type="button" className="sib-btn sib-btn--ghost" onClick={() => openEdit(s)}>
                  <Ico n="edit" s={11} c="var(--color-text-inactive)" />
                  Modifica
                </button>
                <button
                  type="button"
                  className="strutt-card__icon-btn strutt-card__icon-btn--danger"
                  onClick={() => setDeletingId(s.id)}
                  title="Elimina"
                >
                  <Ico n="trash" s={12} c="var(--color-text-inactive)" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <StrutturaPlatformModal
        open={showModal}
        editing={editing}
        form={form}
        setForm={setForm}
        onClose={() => setShowModal(false)}
        onConfirm={confirmEdit}
      />

      <ConfirmDeleteModal
        open={deletingId !== null}
        title="Elimina struttura"
        itemName={strutture.find(s => s.id === deletingId)?.nome || ''}
        onClose={() => setDeletingId(null)}
        onConfirm={confirmDelete}
      />

      <StrutturaPreviewModal
        open={previewState !== null}
        struttura={previewState?.struttura ?? null}
        initialCanale={previewState?.canale}
        onClose={() => setPreviewState(null)}
      />
    </div>
  )
}
