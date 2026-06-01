import React, { useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import { Icon } from '../_shared/Icon'
import {
  HOTEL_CATEGORY_MAP,
  addManagementAnnouncement,
  deleteManagementAnnouncement,
  publishManagementAnnouncement,
  formatDateLongIT,
  formatDateShortIT,
  useManagementAnnouncements,
  type AnnouncementStructureType,
  type AnnouncementType,
  type BaseType,
  type GuestType,
  type LotType,
  type ManagementAnnouncement,
} from '../_shared/announcementsData'
import './GestioneAnnunci.css'

export default function GestioneAnnunci({ navigate }: { navigate: (p: string) => void }) {
  const managementAnnouncements = useManagementAnnouncements()
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    type: 'vendita' as AnnouncementType,
    structureType: 'struttura' as AnnouncementStructureType,
    structure: '',
    guestType: 'gruppi' as GuestType,
    baseType: 'base_doppia' as BaseType,
    lotType: 'lotto' as LotType,
    quantity: 1,
  })
  const [checkInDate, setCheckInDate] = useState('')
  const [checkOutDate, setCheckOutDate] = useState('')

  const selectedAnnouncement = managementAnnouncements.find((a) => a.id === selectedAnnouncementId)

  const handleCreateAnnouncement = () => {
    if (!formData.structure || !checkInDate || !checkOutDate) {
      alert('Compila tutti i campi obbligatori, incluso il periodo con date di inizio e fine')
      return
    }
    if (new Date(checkOutDate).getTime() <= new Date(checkInDate).getTime()) {
      alert('La data di fine periodo deve essere successiva a quella di inizio')
      return
    }
    const category = HOTEL_CATEGORY_MAP[formData.structure] ?? 'business'
    const newAnnouncement: ManagementAnnouncement = {
      id: Date.now().toString(),
      type: formData.type,
      structureType: formData.structureType,
      structure: formData.structure,
      guestType: formData.guestType,
      baseType: formData.baseType,
      lotType: formData.lotType,
      checkInDate: new Date(checkInDate).toISOString(),
      checkOutDate: new Date(checkOutDate).toISOString(),
      quantity: formData.quantity,
      createdDate: new Date().toISOString(),
      published: false,
      category,
    }

    addManagementAnnouncement(newAnnouncement)
    setSelectedAnnouncementId(newAnnouncement.id)
    setFormData({ ...formData, structure: '', quantity: 1 })
    setCheckInDate('')
    setCheckOutDate('')
  }

  const handleDeleteAnnouncement = (id: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questo annuncio?')) {
      deleteManagementAnnouncement(id)
      if (selectedAnnouncementId === id) setSelectedAnnouncementId(null)
    }
  }

  const handlePublishAnnouncement = (id: string) => {
    const announcement = managementAnnouncements.find((a) => a.id === id)
    if (announcement && !announcement.published) {
      publishManagementAnnouncement(id)
      alert(`Annuncio "${announcement.structure}" pubblicato con successo nella sezione Annunci!`)
    }
  }

  const getTypeLabel = (type: AnnouncementType) => (type === 'vendita' ? 'Vendita' : 'Acquisto')
  const getStructureTypeLabel = (type: AnnouncementStructureType) =>
    type === 'struttura' ? 'Struttura' : 'Categoria'
  const getGuestTypeLabel = (type: GuestType) => (type === 'gruppi' ? 'Gruppi' : 'Individuali')
  const getBaseTypeLabel = (type: BaseType) => {
    switch (type) {
      case 'base_doppia':   return 'Base Doppia'
      case 'base_multipla': return 'Base Multipla'
      case 'mista':         return 'Mista'
    }
  }
  const getLotTypeLabel = (type: LotType) => (type === 'lotto' ? 'Lotto' : 'Mezzo Lotto')

  const formatDateRange = (checkIn: string, checkOut: string) =>
    `${formatDateShortIT(checkIn)} - ${formatDateShortIT(checkOut)}`

  return (
    <div className="gestione-annunci">
      <BtnBack onClick={() => navigate('agora-announcements')} />
      <PageHeader
        title="Gestione Annunci"
        subtitle="Crea e gestisci i tuoi annunci di vendita o acquisto"
      />

      <section className="announcements-mgmt__form-card">
        <h3 className="announcements-mgmt__form-title">
          <Icon family="regular" name="plus" />
          Crea Nuovo Annuncio
        </h3>

        <div className="announcements-mgmt__form-body">
          <div className="announcements-mgmt__row-primary">
            <label className="announcements-mgmt__field">
              <span className="announcements-mgmt__field-label">Tipo</span>
              <select
                className="sib-select"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as AnnouncementType })}
              >
                <option value="vendita">Vendita</option>
                <option value="acquisto">Acquisto</option>
              </select>
            </label>

            <label className="announcements-mgmt__field">
              <span className="announcements-mgmt__field-label">Tipologia</span>
              <select
                className="sib-select"
                value={formData.structureType}
                onChange={(e) => setFormData({ ...formData, structureType: e.target.value as AnnouncementStructureType })}
              >
                <option value="struttura">Struttura</option>
                <option value="categoria">Categoria</option>
              </select>
            </label>

            <label className="announcements-mgmt__field">
              <span className="announcements-mgmt__field-label">Ospiti</span>
              <select
                className="sib-select"
                value={formData.guestType}
                onChange={(e) => setFormData({ ...formData, guestType: e.target.value as GuestType })}
              >
                <option value="gruppi">Gruppi</option>
                <option value="individuali">Individuali</option>
              </select>
            </label>

            <label className="announcements-mgmt__field">
              <span className="announcements-mgmt__field-label">Base</span>
              <select
                className="sib-select"
                value={formData.baseType}
                onChange={(e) => setFormData({ ...formData, baseType: e.target.value as BaseType })}
              >
                <option value="base_doppia">Base Doppia</option>
                <option value="base_multipla">Base Multipla</option>
                <option value="mista">Mista</option>
              </select>
            </label>

            <label className="announcements-mgmt__field">
              <span className="announcements-mgmt__field-label">Lotti</span>
              <select
                className="sib-select"
                value={formData.lotType}
                onChange={(e) => setFormData({ ...formData, lotType: e.target.value as LotType })}
              >
                <option value="lotto">Lotto</option>
                <option value="mezzo_lotto">Mezzo Lotto</option>
              </select>
            </label>

            <label className="announcements-mgmt__field">
              <span className="announcements-mgmt__field-label">Quantità</span>
              <input
                type="number"
                className="sib-input"
                min={1}
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 1 })}
              />
            </label>
          </div>

          <div className="announcements-mgmt__row-secondary">
            <label className="announcements-mgmt__field">
              <span className="announcements-mgmt__field-label">Struttura</span>
              <select
                className="sib-select"
                value={formData.structure}
                onChange={(e) => setFormData({ ...formData, structure: e.target.value })}
              >
                <option value="">Seleziona hotel...</option>
                {Object.keys(HOTEL_CATEGORY_MAP).map((hotel) => (
                  <option key={hotel} value={hotel}>{hotel}</option>
                ))}
              </select>
            </label>

            <label className="announcements-mgmt__field">
              <span className="announcements-mgmt__field-label">Periodo</span>
              <div className="announcements-mgmt__date-range">
                <input
                  type="date"
                  className="sib-input"
                  aria-label="Check-in"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                />
                <span className="announcements-mgmt__date-range-sep">→</span>
                <input
                  type="date"
                  className="sib-input"
                  aria-label="Check-out"
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                />
              </div>
            </label>

            <div className="announcements-mgmt__submit">
              <button type="button" className="announcements-mgmt__submit-btn" onClick={handleCreateAnnouncement}>
                <Icon family="regular" name="plus" />
                Aggiungi
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="announcements-mgmt__grid">
        <section className="announcements-mgmt__panel">
          <header className="announcements-mgmt__panel-head">
            <h3 className="announcements-mgmt__panel-title">
              <Icon family="regular" name="file-lines" />
              La Mia Bacheca
              <span className="announcements-mgmt__panel-count">{managementAnnouncements.length}</span>
            </h3>
          </header>

          {managementAnnouncements.length === 0 ? (
            <div className="announcements-mgmt__empty">
              <div className="announcements-mgmt__empty-icon">
                <Icon family="regular" name="file-lines" />
              </div>
              <h4 className="announcements-mgmt__empty-title">Nessun annuncio creato</h4>
              <p className="announcements-mgmt__empty-text">
                Utilizza il form sopra per creare il tuo primo annuncio
              </p>
            </div>
          ) : (
            <table className="sib-table announcements-mgmt__table">
              <thead className="announcements-mgmt__thead">
                <tr>
                  <th className="announcements-mgmt__th">Periodo</th>
                  <th className="announcements-mgmt__th">Tipologia</th>
                  <th className="announcements-mgmt__th">Quantità</th>
                  <th className="announcements-mgmt__th">Contratto</th>
                  <th className="announcements-mgmt__th announcements-mgmt__th--center">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {managementAnnouncements.map((a) => (
                  <tr
                    key={a.id}
                    className={`announcements-mgmt__row${selectedAnnouncementId === a.id ? ' announcements-mgmt__row--selected' : ''}`}
                    onClick={() => setSelectedAnnouncementId(a.id)}
                  >
                    <td className="announcements-mgmt__td">
                      {formatDateRange(a.checkInDate, a.checkOutDate)}
                    </td>
                    <td className="announcements-mgmt__td">
                      <p className="announcements-mgmt__structure">
                        {getStructureTypeLabel(a.structureType)}
                      </p>
                      <p className="announcements-mgmt__structure-name">{a.structure}</p>
                    </td>
                    <td className="announcements-mgmt__td">
                      {a.quantity} {a.quantity === 1 ? 'lotto' : 'lotti'}
                    </td>
                    <td className="announcements-mgmt__td">
                      <span className="announcements-mgmt__pill">
                        <Icon family="regular" name="file-lines" />
                        {getTypeLabel(a.type)}
                      </span>
                    </td>
                    <td className="announcements-mgmt__td announcements-mgmt__td--center">
                      <div className="announcements-mgmt__row-actions">
                        {a.published ? (
                          <span
                            className="announcements-mgmt__row-action announcements-mgmt__row-action--published"
                            title="Pubblicato"
                          >
                            <Icon family="regular" name="circle-check" />
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handlePublishAnnouncement(a.id) }}
                            className="announcements-mgmt__row-action"
                            title="Pubblica"
                          >
                            <Icon family="regular" name="paper-plane" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteAnnouncement(a.id) }}
                          className="announcements-mgmt__row-action announcements-mgmt__row-action--danger"
                          title="Elimina"
                        >
                          <Icon family="regular" name="trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="announcements-mgmt__panel announcements-mgmt__panel--sticky">
          <header className="announcements-mgmt__panel-head">
            <h3 className="announcements-mgmt__panel-title">
              <Icon family="regular" name="file-lines" />
              Anteprima Contratto
            </h3>
          </header>

          <div className="announcements-mgmt__panel-body">
            {selectedAnnouncement ? (
              <div className="contract-doc">
                <div className="contract-doc__head">
                  <h1 className="contract-doc__title">
                    CONTRATTO DI {getTypeLabel(selectedAnnouncement.type).toUpperCase()}
                  </h1>
                  <p className="contract-doc__date">
                    Documento generato il {formatDateLongIT(selectedAnnouncement.createdDate)}
                  </p>
                </div>

                <div className="contract-doc__number">
                  <p className="contract-doc__label">Numero Contratto</p>
                  <p className="contract-doc__id">#{selectedAnnouncement.id}</p>
                </div>

                <section className="contract-doc__section">
                  <h2 className="contract-doc__section-title">Dettagli dell'Annuncio</h2>

                  <div className="contract-doc__fields">
                    <div className="contract-doc__field">
                      <p className="contract-doc__label">Tipo</p>
                      <p className="contract-doc__field-value">{getTypeLabel(selectedAnnouncement.type)}</p>
                    </div>

                    <div className="contract-doc__field">
                      <p className="contract-doc__label">Tipologia</p>
                      <p className="contract-doc__field-value">{getStructureTypeLabel(selectedAnnouncement.structureType)}</p>
                    </div>

                    <div className="contract-doc__field contract-doc__field--full">
                      <p className="contract-doc__label">Struttura</p>
                      <p className="contract-doc__field-highlight">{selectedAnnouncement.structure}</p>
                    </div>

                    <div className="contract-doc__field contract-doc__field--full">
                      <p className="contract-doc__label">Periodo</p>
                      <p className="contract-doc__field-value">
                        {formatDateRange(selectedAnnouncement.checkInDate, selectedAnnouncement.checkOutDate)}
                      </p>
                    </div>

                    <div className="contract-doc__field">
                      <p className="contract-doc__label">Quantità</p>
                      <p className="contract-doc__field-value">
                        {selectedAnnouncement.quantity} {selectedAnnouncement.quantity === 1 ? 'lotto' : 'lotti'}
                      </p>
                    </div>

                    <div className="contract-doc__field">
                      <p className="contract-doc__label">Tipo Ospiti</p>
                      <p className="contract-doc__field-value">{getGuestTypeLabel(selectedAnnouncement.guestType)}</p>
                    </div>

                    <div className="contract-doc__field">
                      <p className="contract-doc__label">Tipologia Base</p>
                      <p className="contract-doc__field-value">{getBaseTypeLabel(selectedAnnouncement.baseType)}</p>
                    </div>

                    <div className="contract-doc__field">
                      <p className="contract-doc__label">Tipo Lotti</p>
                      <p className="contract-doc__field-value">{getLotTypeLabel(selectedAnnouncement.lotType)}</p>
                    </div>
                  </div>
                </section>

                <section className="contract-doc__section">
                  <h2 className="contract-doc__section-title">Termini e Condizioni</h2>
                  <div className="contract-doc__terms">
                    <p>
                      1. Il presente contratto regola la {selectedAnnouncement.type} di disponibilità
                      alberghiere presso {selectedAnnouncement.structure}.
                    </p>
                    <p>
                      2. Le parti concordano sulle modalità di {selectedAnnouncement.type} per il periodo dal{' '}
                      {formatDateLongIT(selectedAnnouncement.checkInDate)} al{' '}
                      {formatDateLongIT(selectedAnnouncement.checkOutDate)}.
                    </p>
                    <p>
                      3. La quantità concordata è di {selectedAnnouncement.quantity}{' '}
                      {selectedAnnouncement.quantity === 1 ? 'lotto' : 'lotti'} in modalità{' '}
                      {getLotTypeLabel(selectedAnnouncement.lotType)}.
                    </p>
                    <p>
                      4. La tipologia base concordata è {getBaseTypeLabel(selectedAnnouncement.baseType)} per
                      ospiti {getGuestTypeLabel(selectedAnnouncement.guestType)}.
                    </p>
                    <p>
                      5. Il contratto è soggetto alle condizioni generali di vendita e alle normative vigenti.
                    </p>
                  </div>
                </section>

                <div className="contract-doc__signatures">
                  <div>
                    <p className="contract-doc__label">Firma Venditore</p>
                    <div className="contract-doc__signature-line" />
                  </div>
                  <div>
                    <p className="contract-doc__label">Firma Acquirente</p>
                    <div className="contract-doc__signature-line" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="contract-placeholder">
                <div className="contract-placeholder__icon">
                  <Icon family="regular" name="file-lines" />
                </div>
                <h4 className="contract-placeholder__title">Nessun Contratto Selezionato</h4>
                <p className="contract-placeholder__text">
                  Seleziona un annuncio dalla tabella per visualizzare l'anteprima del contratto
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
