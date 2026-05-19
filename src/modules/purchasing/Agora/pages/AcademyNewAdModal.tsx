import { useEffect, useState, type FormEvent } from 'react';
import { Icon } from '../ds/icon';
import { useAcademy } from '../context/AcademyContext';
import type {
  AcademyCourse,
  ContractType,
  CourseLevel,
  CourseMode,
  PersonnelKind,
  PersonnelListing,
  WorkMode,
} from '../data/academy';
import './AcademyContactModal.css';
import './AcademyNewAdModal.css';

type AdType = 'personnel' | 'course';

interface AcademyNewAdModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AcademyNewAdModal({ isOpen, onClose }: AcademyNewAdModalProps) {
  const { addPersonnelListing, addCourse } = useAcademy();
  const [adType, setAdType] = useState<AdType>('personnel');
  const [submitted, setSubmitted] = useState(false);

  /* Personnel fields */
  const [pKind, setPKind] = useState<PersonnelKind>('offerta');
  const [pTitle, setPTitle] = useState('');
  const [pOrg, setPOrg] = useState('');
  const [pCity, setPCity] = useState('');
  const [pRegion, setPRegion] = useState('');
  const [pContract, setPContract] = useState<ContractType>('indeterminato');
  const [pWorkMode, setPWorkMode] = useState<WorkMode>('in-presenza');
  const [pDescription, setPDescription] = useState('');
  const [pRequirements, setPRequirements] = useState('');
  const [pSalary, setPSalary] = useState('');
  const [pExperience, setPExperience] = useState('');
  const [pContactName, setPContactName] = useState('');
  const [pContactEmail, setPContactEmail] = useState('');

  /* Course fields */
  const [cTitle, setCTitle] = useState('');
  const [cCategory, setCCategory] = useState('');
  const [cInstructor, setCInstructor] = useState('');
  const [cDescription, setCDescription] = useState('');
  const [cSyllabus, setCSyllabus] = useState('');
  const [cMode, setCMode] = useState<CourseMode>('online');
  const [cLevel, setCLevel] = useState<CourseLevel>('base');
  const [cDuration, setCDuration] = useState('');
  const [cStart, setCStart] = useState('');
  const [cEnd, setCEnd] = useState('');
  const [cCity, setCCity] = useState('');
  const [cTotalSeats, setCTotalSeats] = useState('');
  const [cPrice, setCPrice] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setSubmitted(false);
      setAdType('personnel');
      setPKind('offerta');
      setPTitle(''); setPOrg(''); setPCity(''); setPRegion('');
      setPContract('indeterminato'); setPWorkMode('in-presenza');
      setPDescription(''); setPRequirements(''); setPSalary(''); setPExperience('');
      setPContactName(''); setPContactEmail('');
      setCTitle(''); setCCategory(''); setCInstructor(''); setCDescription('');
      setCSyllabus(''); setCMode('online'); setCLevel('base');
      setCDuration(''); setCStart(''); setCEnd(''); setCCity('');
      setCTotalSeats(''); setCPrice('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (adType === 'personnel') {
      const listing: PersonnelListing = {
        id: `user-p-${Date.now()}`,
        kind: pKind,
        title: pTitle,
        organization: pOrg,
        city: pCity,
        region: pRegion,
        contractType: pContract,
        workMode: pWorkMode,
        description: pDescription,
        requirements: pRequirements
          .split('\n')
          .map((r) => r.trim())
          .filter(Boolean),
        salaryRange: pSalary || undefined,
        experienceYears: pExperience ? Number(pExperience) : undefined,
        publishedDate: today,
        status: 'aperto',
        contactName: pContactName,
        contactEmail: pContactEmail,
      };
      addPersonnelListing(listing);
    } else {
      const course: AcademyCourse = {
        id: `user-c-${Date.now()}`,
        title: cTitle,
        category: cCategory,
        instructor: cInstructor,
        description: cDescription,
        syllabus: cSyllabus
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        mode: cMode,
        level: cLevel,
        durationHours: Number(cDuration),
        startDate: cStart,
        endDate: cEnd,
        city: cMode !== 'online' ? cCity : undefined,
        seatsAvailable: Number(cTotalSeats),
        totalSeats: Number(cTotalSeats),
        price: cPrice ? Number(cPrice) : 0,
        publishedDate: today,
      };
      addCourse(course);
    }
    setSubmitted(true);
  };

  return (
    <div
      className="academy-modal academy-new-ad"
      role="dialog"
      aria-modal="true"
      aria-labelledby="academy-newad-title"
    >
      <div className="academy-modal__backdrop" onClick={onClose} aria-hidden="true" />

      <div className="academy-modal__dialog academy-new-ad__dialog">
        <header className="academy-modal__head">
          <div>
            <p className="academy-modal__eyebrow">Pubblica annuncio</p>
            <h2 id="academy-newad-title" className="academy-modal__title">
              Nuovo annuncio in Accademia
            </h2>
            <p className="academy-modal__subtitle">
              Inserisci un'offerta di lavoro, una candidatura o un corso di formazione
            </p>
          </div>
          <button
            type="button"
            className="academy-modal__close"
            onClick={onClose}
            aria-label="Chiudi"
          >
            <Icon family="regular" name="xmark" />
          </button>
        </header>

        {submitted ? (
          <div className="academy-modal__success">
            <Icon family="regular" name="circle-check" className="academy-modal__success-icon" />
            <h3 className="academy-modal__success-title">Annuncio pubblicato</h3>
            <p className="academy-modal__success-text">
              Il tuo annuncio è stato pubblicato e sarà visibile nella sezione corrispondente.
            </p>
            <button type="button" className="academy-modal__cta" onClick={onClose}>
              Chiudi
            </button>
          </div>
        ) : (
          <form className="academy-modal__form" onSubmit={handleSubmit}>
            <div className="academy-new-ad__type">
              <p className="academy-modal__label">Tipo di annuncio</p>
              <div className="academy-new-ad__type-options">
                <label
                  className={`academy-new-ad__type-card${adType === 'personnel' ? ' is-active' : ''}`}
                >
                  <input
                    type="radio"
                    name="adType"
                    value="personnel"
                    checked={adType === 'personnel'}
                    onChange={() => setAdType('personnel')}
                  />
                  <Icon family="light" name="briefcase" />
                  <span className="academy-new-ad__type-label">Ricerca Personale</span>
                </label>
                <label
                  className={`academy-new-ad__type-card${adType === 'course' ? ' is-active' : ''}`}
                >
                  <input
                    type="radio"
                    name="adType"
                    value="course"
                    checked={adType === 'course'}
                    onChange={() => setAdType('course')}
                  />
                  <Icon family="light" name="graduation-cap" />
                  <span className="academy-new-ad__type-label">Corso di formazione</span>
                </label>
              </div>
            </div>

            {adType === 'personnel' && (
              <>
                <div className="academy-new-ad__type-options">
                  <label
                    className={`academy-new-ad__sub-card${pKind === 'offerta' ? ' is-active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="pKind"
                      value="offerta"
                      checked={pKind === 'offerta'}
                      onChange={() => setPKind('offerta')}
                    />
                    Offro lavoro
                    <span className="academy-new-ad__sub-hint">Sto cercando personale</span>
                  </label>
                  <label
                    className={`academy-new-ad__sub-card${pKind === 'richiesta' ? ' is-active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="pKind"
                      value="richiesta"
                      checked={pKind === 'richiesta'}
                      onChange={() => setPKind('richiesta')}
                    />
                    Cerco lavoro
                    <span className="academy-new-ad__sub-hint">Mi propongo come candidato</span>
                  </label>
                </div>

                <label className="academy-modal__field">
                  <span className="academy-modal__label">
                    {pKind === 'offerta' ? 'Posizione cercata' : 'Ruolo proposto'}
                  </span>
                  <input
                    type="text"
                    required
                    value={pTitle}
                    onChange={(e) => setPTitle(e.target.value)}
                    className="academy-modal__input"
                    placeholder={pKind === 'offerta' ? 'es. Sous Chef' : 'es. Receptionist con 5 anni di esperienza'}
                  />
                </label>

                <label className="academy-modal__field">
                  <span className="academy-modal__label">
                    {pKind === 'offerta' ? 'Azienda / struttura' : 'Nome candidato'}
                  </span>
                  <input
                    type="text"
                    required
                    value={pOrg}
                    onChange={(e) => setPOrg(e.target.value)}
                    className="academy-modal__input"
                  />
                </label>

                <div className="academy-modal__row">
                  <label className="academy-modal__field">
                    <span className="academy-modal__label">Città</span>
                    <input
                      type="text"
                      required
                      value={pCity}
                      onChange={(e) => setPCity(e.target.value)}
                      className="academy-modal__input"
                    />
                  </label>
                  <label className="academy-modal__field">
                    <span className="academy-modal__label">Regione</span>
                    <input
                      type="text"
                      required
                      value={pRegion}
                      onChange={(e) => setPRegion(e.target.value)}
                      className="academy-modal__input"
                    />
                  </label>
                </div>

                <div className="academy-modal__row">
                  <label className="academy-modal__field">
                    <span className="academy-modal__label">Tipo contratto</span>
                    <select
                      required
                      value={pContract}
                      onChange={(e) => setPContract(e.target.value as ContractType)}
                      className="academy-modal__input"
                    >
                      <option value="indeterminato">Indeterminato</option>
                      <option value="determinato">Determinato</option>
                      <option value="stage">Stage</option>
                      <option value="freelance">Freelance / P.IVA</option>
                      <option value="apprendistato">Apprendistato</option>
                    </select>
                  </label>
                  <label className="academy-modal__field">
                    <span className="academy-modal__label">Modalità</span>
                    <select
                      required
                      value={pWorkMode}
                      onChange={(e) => setPWorkMode(e.target.value as WorkMode)}
                      className="academy-modal__input"
                    >
                      <option value="in-presenza">In presenza</option>
                      <option value="ibrido">Ibrido</option>
                      <option value="remoto">Remoto</option>
                    </select>
                  </label>
                </div>

                <label className="academy-modal__field">
                  <span className="academy-modal__label">Descrizione</span>
                  <textarea
                    required
                    rows={3}
                    value={pDescription}
                    onChange={(e) => setPDescription(e.target.value)}
                    className="academy-modal__textarea"
                  />
                </label>

                <label className="academy-modal__field">
                  <span className="academy-modal__label">
                    {pKind === 'offerta' ? 'Requisiti richiesti' : 'Competenze offerte'}
                    <span className="academy-modal__hint"> (uno per riga)</span>
                  </span>
                  <textarea
                    required
                    rows={3}
                    value={pRequirements}
                    onChange={(e) => setPRequirements(e.target.value)}
                    className="academy-modal__textarea"
                  />
                </label>

                <div className="academy-modal__row">
                  <label className="academy-modal__field">
                    <span className="academy-modal__label">
                      Esperienza
                      <span className="academy-modal__hint"> (anni)</span>
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={pExperience}
                      onChange={(e) => setPExperience(e.target.value)}
                      className="academy-modal__input"
                    />
                  </label>
                  <label className="academy-modal__field">
                    <span className="academy-modal__label">
                      Compenso
                      <span className="academy-modal__hint"> (opzionale)</span>
                    </span>
                    <input
                      type="text"
                      value={pSalary}
                      onChange={(e) => setPSalary(e.target.value)}
                      className="academy-modal__input"
                      placeholder="es. € 30.000 lordi/anno"
                    />
                  </label>
                </div>

                <div className="academy-modal__row">
                  <label className="academy-modal__field">
                    <span className="academy-modal__label">Referente</span>
                    <input
                      type="text"
                      required
                      value={pContactName}
                      onChange={(e) => setPContactName(e.target.value)}
                      className="academy-modal__input"
                    />
                  </label>
                  <label className="academy-modal__field">
                    <span className="academy-modal__label">Email contatto</span>
                    <input
                      type="email"
                      required
                      value={pContactEmail}
                      onChange={(e) => setPContactEmail(e.target.value)}
                      className="academy-modal__input"
                    />
                  </label>
                </div>
              </>
            )}

            {adType === 'course' && (
              <>
                <label className="academy-modal__field">
                  <span className="academy-modal__label">Titolo del corso</span>
                  <input
                    type="text"
                    required
                    value={cTitle}
                    onChange={(e) => setCTitle(e.target.value)}
                    className="academy-modal__input"
                  />
                </label>

                <div className="academy-modal__row">
                  <label className="academy-modal__field">
                    <span className="academy-modal__label">Categoria</span>
                    <input
                      type="text"
                      required
                      value={cCategory}
                      onChange={(e) => setCCategory(e.target.value)}
                      className="academy-modal__input"
                      placeholder="es. F&B Operations"
                    />
                  </label>
                  <label className="academy-modal__field">
                    <span className="academy-modal__label">Docente</span>
                    <input
                      type="text"
                      required
                      value={cInstructor}
                      onChange={(e) => setCInstructor(e.target.value)}
                      className="academy-modal__input"
                    />
                  </label>
                </div>

                <label className="academy-modal__field">
                  <span className="academy-modal__label">Descrizione</span>
                  <textarea
                    required
                    rows={3}
                    value={cDescription}
                    onChange={(e) => setCDescription(e.target.value)}
                    className="academy-modal__textarea"
                  />
                </label>

                <label className="academy-modal__field">
                  <span className="academy-modal__label">
                    Programma
                    <span className="academy-modal__hint"> (uno per riga)</span>
                  </span>
                  <textarea
                    required
                    rows={3}
                    value={cSyllabus}
                    onChange={(e) => setCSyllabus(e.target.value)}
                    className="academy-modal__textarea"
                  />
                </label>

                <div className="academy-modal__row">
                  <label className="academy-modal__field">
                    <span className="academy-modal__label">Modalità</span>
                    <select
                      required
                      value={cMode}
                      onChange={(e) => setCMode(e.target.value as CourseMode)}
                      className="academy-modal__input"
                    >
                      <option value="online">Online</option>
                      <option value="in-presenza">In presenza</option>
                      <option value="ibrido">Ibrido</option>
                    </select>
                  </label>
                  <label className="academy-modal__field">
                    <span className="academy-modal__label">Livello</span>
                    <select
                      required
                      value={cLevel}
                      onChange={(e) => setCLevel(e.target.value as CourseLevel)}
                      className="academy-modal__input"
                    >
                      <option value="base">Base</option>
                      <option value="intermedio">Intermedio</option>
                      <option value="avanzato">Avanzato</option>
                    </select>
                  </label>
                </div>

                {cMode !== 'online' && (
                  <label className="academy-modal__field">
                    <span className="academy-modal__label">Città sede</span>
                    <input
                      type="text"
                      required
                      value={cCity}
                      onChange={(e) => setCCity(e.target.value)}
                      className="academy-modal__input"
                    />
                  </label>
                )}

                <div className="academy-modal__row">
                  <label className="academy-modal__field">
                    <span className="academy-modal__label">Durata (ore)</span>
                    <input
                      type="number"
                      min={1}
                      required
                      value={cDuration}
                      onChange={(e) => setCDuration(e.target.value)}
                      className="academy-modal__input"
                    />
                  </label>
                  <label className="academy-modal__field">
                    <span className="academy-modal__label">Posti totali</span>
                    <input
                      type="number"
                      min={1}
                      required
                      value={cTotalSeats}
                      onChange={(e) => setCTotalSeats(e.target.value)}
                      className="academy-modal__input"
                    />
                  </label>
                </div>

                <div className="academy-modal__row">
                  <label className="academy-modal__field">
                    <span className="academy-modal__label">Data inizio</span>
                    <input
                      type="date"
                      required
                      value={cStart}
                      onChange={(e) => setCStart(e.target.value)}
                      className="academy-modal__input"
                    />
                  </label>
                  <label className="academy-modal__field">
                    <span className="academy-modal__label">Data fine</span>
                    <input
                      type="date"
                      required
                      value={cEnd}
                      onChange={(e) => setCEnd(e.target.value)}
                      className="academy-modal__input"
                    />
                  </label>
                </div>

                <label className="academy-modal__field">
                  <span className="academy-modal__label">
                    Prezzo (€)
                    <span className="academy-modal__hint"> — lascia vuoto per gratuito</span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={cPrice}
                    onChange={(e) => setCPrice(e.target.value)}
                    className="academy-modal__input"
                  />
                </label>
              </>
            )}

            <div className="academy-modal__actions">
              <button type="button" className="academy-modal__cancel" onClick={onClose}>
                Annulla
              </button>
              <button type="submit" className="academy-modal__cta">
                Pubblica annuncio
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
