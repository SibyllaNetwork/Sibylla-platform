import { useState } from 'react';
import { format } from 'date-fns';
import { Layout } from './Layout';
import { PageHeader } from './PageHeader';
import { useAnnouncements } from '../context/AnnouncementsContext';
import { Icon } from '../ds/icon';
import { Button } from '../ds/button';
import { Input } from '../ds/input';
import { Select } from '../ds/select';
import { Label } from '../ds/label';
import { Field } from '../ds/field';
import type {
  AnnouncementType,
  AnnouncementStructureType,
  GuestType,
  BaseType,
  LotType,
  AnnouncementCategory,
} from '../context/AnnouncementsContext';
import './AnnouncementManagementPage.css';

const mockHotels: Record<string, AnnouncementCategory> = {
  'Grand Hotel Milano': 'business',
  'Luxury Resort Sardegna': 'mare',
  'Hotel Duomo Firenze': 'citta_arte',
  'Alpine Resort Bormio': 'montagna',
  'Como Luxury Hotel': 'citta_arte',
  'Airport Business Hotel': 'business',
  'Venetian Palace Hotel': 'citta_arte',
  'Rome Imperial Hotel': 'citta_arte',
  'Seaside Resort Amalfi': 'mare',
  'Mountain Lodge Cortina': 'montagna',
  'Spa & Wellness Center': 'wellness',
  'Conference Center Plaza': 'eventi',
};

export function AnnouncementManagementPage() {
  const { managementAnnouncements, addAnnouncement, deleteAnnouncement, publishAnnouncement } =
    useAnnouncements();
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    type: 'vendita' as AnnouncementType,
    structureType: 'struttura' as AnnouncementStructureType,
    structure: '',
    guestType: 'gruppi' as GuestType,
    baseType: 'base_doppia' as BaseType,
    lotType: 'lotto' as LotType,
    quantity: 1,
  });

  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const selectedAnnouncement = managementAnnouncements.find((a) => a.id === selectedAnnouncementId);

  const handleCreateAnnouncement = () => {
    if (!formData.structure || !dateFrom || !dateTo) {
      window.alert('Compila tutti i campi obbligatori, incluso il periodo con date di inizio e fine');
      return;
    }
    if (new Date(dateTo) < new Date(dateFrom)) {
      window.alert('La data "Al" non può essere precedente alla data "Dal"');
      return;
    }
    const category = mockHotels[formData.structure] || 'business';
    const newAnnouncement = {
      id: Date.now().toString(),
      type: formData.type,
      structureType: formData.structureType,
      structure: formData.structure,
      guestType: formData.guestType,
      baseType: formData.baseType,
      lotType: formData.lotType,
      checkInDate: new Date(dateFrom).toISOString(),
      checkOutDate: new Date(dateTo).toISOString(),
      quantity: formData.quantity,
      createdDate: new Date().toISOString(),
      published: false,
      category,
    };

    addAnnouncement(newAnnouncement);
    setSelectedAnnouncementId(newAnnouncement.id);
    setFormData({ ...formData, structure: '', quantity: 1 });
    setDateFrom('');
    setDateTo('');
  };

  const handleDeleteAnnouncement = (id: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questo annuncio?')) {
      deleteAnnouncement(id);
      if (selectedAnnouncementId === id) setSelectedAnnouncementId(null);
    }
  };

  const handlePublishAnnouncement = (id: string) => {
    const announcement = managementAnnouncements.find((a) => a.id === id);
    if (announcement && !announcement.published) {
      publishAnnouncement(id);
      window.alert(`Annuncio "${announcement.structure}" pubblicato con successo nella sezione Annunci!`);
    }
  };

  const getTypeLabel = (type: AnnouncementType) => (type === 'vendita' ? 'Vendita' : 'Acquisto');
  const getStructureTypeLabel = (type: AnnouncementStructureType) =>
    type === 'struttura' ? 'Struttura' : 'Categoria';
  const getGuestTypeLabel = (type: GuestType) => (type === 'gruppi' ? 'Gruppi' : 'Individuali');
  const getBaseTypeLabel = (type: BaseType) => {
    switch (type) {
      case 'base_doppia':
        return 'Base Doppia';
      case 'base_multipla':
        return 'Base Multipla';
      case 'mista':
        return 'Mista';
    }
  };
  const getLotTypeLabel = (type: LotType) => (type === 'lotto' ? 'Lotto' : 'Mezzo Lotto');

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  const formatDateRange = (checkIn: string, checkOut: string) => {
    const dateIn = new Date(checkIn);
    const dateOut = new Date(checkOut);
    return `${format(dateIn, 'dd/MM/yy')} - ${format(dateOut, 'dd/MM/yy')}`;
  };

  return (
    <Layout>
      <PageHeader
        title="Componi annuncio"
        subtitle="Crea e gestisci i tuoi annunci di vendita o acquisto"
      />

      <section className="announcements-mgmt__form-card">
        <h3 className="announcements-mgmt__form-title">
          <Icon family="regular" name="plus"  />
          Crea Nuovo Annuncio
        </h3>

        <div className="announcements-mgmt__form-body">
          <div className="announcements-mgmt__row-primary">
            <Field>
              <Label>Tipo</Label>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as AnnouncementType })}
              >
                <option value="vendita">Vendita</option>
                <option value="acquisto">Acquisto</option>
              </Select>
            </Field>

            <Field>
              <Label>Tipologia</Label>
              <Select
                value={formData.structureType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    structureType: e.target.value as AnnouncementStructureType,
                  })
                }
              >
                <option value="struttura">Struttura</option>
                <option value="categoria">Categoria</option>
              </Select>
            </Field>

            <Field>
              <Label>Ospiti</Label>
              <Select
                value={formData.guestType}
                onChange={(e) => setFormData({ ...formData, guestType: e.target.value as GuestType })}
              >
                <option value="gruppi">Gruppi</option>
                <option value="individuali">Individuali</option>
              </Select>
            </Field>

            <Field>
              <Label>Base</Label>
              <Select
                value={formData.baseType}
                onChange={(e) => setFormData({ ...formData, baseType: e.target.value as BaseType })}
              >
                <option value="base_doppia">Base Doppia</option>
                <option value="base_multipla">Base Multipla</option>
                <option value="mista">Mista</option>
              </Select>
            </Field>

            <Field>
              <Label>Lotti</Label>
              <Select
                value={formData.lotType}
                onChange={(e) => setFormData({ ...formData, lotType: e.target.value as LotType })}
              >
                <option value="lotto">Lotto</option>
                <option value="mezzo_lotto">Mezzo Lotto</option>
              </Select>
            </Field>

            <Field>
              <Label>Quantità</Label>
              <Input
                type="number"
                min={1}
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 1 })
                }
              />
            </Field>
          </div>

          <div className="announcements-mgmt__row-secondary">
            <Field>
              <Label>Struttura</Label>
              <Select
                value={formData.structure}
                onChange={(e) => setFormData({ ...formData, structure: e.target.value })}
              >
                <option value="">Seleziona hotel...</option>
                {Object.keys(mockHotels).map((hotel) => (
                  <option key={hotel} value={hotel}>
                    {hotel}
                  </option>
                ))}
              </Select>
            </Field>

            <Field>
              <Label>Dal</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </Field>

            <Field>
              <Label>Al</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                min={dateFrom || undefined}
              />
            </Field>

            <div className="announcements-mgmt__submit">
              <Button variant="primary" size="lg" onClick={handleCreateAnnouncement}>
                <Icon family="regular" name="plus" data-slot="icon" />
                Aggiungi
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="announcements-mgmt__grid">
        <section className="announcements-mgmt__panel">
          <header className="announcements-mgmt__panel-head">
            <h3 className="announcements-mgmt__panel-title">
              <Icon family="regular" name="file-lines"  />
              La Mia Bacheca
              <span className="announcements-mgmt__panel-count">
                {managementAnnouncements.length}
              </span>
            </h3>
          </header>

          {managementAnnouncements.length === 0 ? (
            <div className="announcements-mgmt__empty">
              <div className="announcements-mgmt__empty-icon">
                <Icon family="regular" name="file-lines"  />
              </div>
              <h4 className="announcements-mgmt__empty-title">Nessun annuncio creato</h4>
              <p className="announcements-mgmt__empty-text">
                Utilizza il form sopra per creare il tuo primo annuncio
              </p>
            </div>
          ) : (
            <div>
              <table className="sib-table announcements-mgmt__table">
                <thead className="announcements-mgmt__thead">
                  <tr>
                    <th className="announcements-mgmt__th">Periodo</th>
                    <th className="announcements-mgmt__th">Tipologia</th>
                    <th className="announcements-mgmt__th">Quantità</th>
                    <th className="announcements-mgmt__th">Contratto</th>
                    <th className="announcements-mgmt__th announcements-mgmt__th--center">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {managementAnnouncements.map((announcement) => (
                    <tr
                      key={announcement.id}
                      className={`announcements-mgmt__row${selectedAnnouncementId === announcement.id ? ' announcements-mgmt__row--selected' : ''}`}
                      onClick={() => setSelectedAnnouncementId(announcement.id)}
                    >
                      <td className="announcements-mgmt__td">
                        {formatDateRange(announcement.checkInDate, announcement.checkOutDate)}
                      </td>
                      <td className="announcements-mgmt__td">
                        <p className="announcements-mgmt__structure">
                          {getStructureTypeLabel(announcement.structureType)}
                        </p>
                        <p className="announcements-mgmt__structure-name">
                          {announcement.structure}
                        </p>
                      </td>
                      <td className="announcements-mgmt__td">
                        {announcement.quantity} {announcement.quantity === 1 ? 'lotto' : 'lotti'}
                      </td>
                      <td className="announcements-mgmt__td">
                        <span className="announcements-mgmt__pill">
                          <Icon family="regular" name="file-lines"  />
                          {getTypeLabel(announcement.type)}
                        </span>
                      </td>
                      <td className="announcements-mgmt__td announcements-mgmt__td--center">
                        <div className="announcements-mgmt__row-actions">
                          {announcement.published ? (
                            <span
                              className="announcements-mgmt__row-action announcements-mgmt__row-action--published"
                              title="Pubblicato"
                            >
                              <Icon family="regular" name="circle-check"  />
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePublishAnnouncement(announcement.id);
                              }}
                              className="announcements-mgmt__row-action"
                              title="Pubblica"
                            >
                              <Icon family="regular" name="paper-plane"  />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAnnouncement(announcement.id);
                            }}
                            className="announcements-mgmt__row-action announcements-mgmt__row-action--danger"
                            title="Elimina"
                          >
                            <Icon family="regular" name="trash"  />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="announcements-mgmt__panel announcements-mgmt__panel--sticky">
          <header className="announcements-mgmt__panel-head">
            <h3 className="announcements-mgmt__panel-title">
              <Icon family="regular" name="file-lines"  />
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
                    Documento generato il {formatDate(selectedAnnouncement.createdDate)}
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
                      <p className="contract-doc__field-value">
                        {getTypeLabel(selectedAnnouncement.type)}
                      </p>
                    </div>

                    <div className="contract-doc__field">
                      <p className="contract-doc__label">Tipologia</p>
                      <p className="contract-doc__field-value">
                        {getStructureTypeLabel(selectedAnnouncement.structureType)}
                      </p>
                    </div>

                    <div className="contract-doc__field contract-doc__field--full">
                      <p className="contract-doc__label">Struttura</p>
                      <p className="contract-doc__field-highlight">
                        {selectedAnnouncement.structure}
                      </p>
                    </div>

                    <div className="contract-doc__field contract-doc__field--full">
                      <p className="contract-doc__label">Periodo</p>
                      <p className="contract-doc__field-value">
                        {formatDateRange(
                          selectedAnnouncement.checkInDate,
                          selectedAnnouncement.checkOutDate,
                        )}
                      </p>
                    </div>

                    <div className="contract-doc__field">
                      <p className="contract-doc__label">Quantità</p>
                      <p className="contract-doc__field-value">
                        {selectedAnnouncement.quantity}{' '}
                        {selectedAnnouncement.quantity === 1 ? 'lotto' : 'lotti'}
                      </p>
                    </div>

                    <div className="contract-doc__field">
                      <p className="contract-doc__label">Tipo Ospiti</p>
                      <p className="contract-doc__field-value">
                        {getGuestTypeLabel(selectedAnnouncement.guestType)}
                      </p>
                    </div>

                    <div className="contract-doc__field">
                      <p className="contract-doc__label">Tipologia Base</p>
                      <p className="contract-doc__field-value">
                        {getBaseTypeLabel(selectedAnnouncement.baseType)}
                      </p>
                    </div>

                    <div className="contract-doc__field">
                      <p className="contract-doc__label">Tipo Lotti</p>
                      <p className="contract-doc__field-value">
                        {getLotTypeLabel(selectedAnnouncement.lotType)}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="contract-doc__section">
                  <h2 className="contract-doc__section-title">Termini e Condizioni</h2>
                  <div className="contract-doc__terms">
                    <p>
                      1. Il presente contratto regola la {selectedAnnouncement.type} di
                      disponibilità alberghiere presso {selectedAnnouncement.structure}.
                    </p>
                    <p>
                      2. Le parti concordano sulle modalità di {selectedAnnouncement.type} per il
                      periodo dal {formatDate(selectedAnnouncement.checkInDate)} al{' '}
                      {formatDate(selectedAnnouncement.checkOutDate)}.
                    </p>
                    <p>
                      3. La quantità concordata è di {selectedAnnouncement.quantity}{' '}
                      {selectedAnnouncement.quantity === 1 ? 'lotto' : 'lotti'} in modalità{' '}
                      {getLotTypeLabel(selectedAnnouncement.lotType)}.
                    </p>
                    <p>
                      4. La tipologia base concordata è{' '}
                      {getBaseTypeLabel(selectedAnnouncement.baseType)} per ospiti{' '}
                      {getGuestTypeLabel(selectedAnnouncement.guestType)}.
                    </p>
                    <p>
                      5. Il contratto è soggetto alle condizioni generali di vendita e alle
                      normative vigenti.
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
                  <Icon family="regular" name="file-lines"  />
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
    </Layout>
  );
}
