/* === Academy data types & mock dataset === */

export type PersonnelKind = 'offerta' | 'richiesta';
/* offerta = azienda offre lavoro (post by employer)
   richiesta = candidato cerca lavoro / si propone (post by job-seeker) */

export type ContractType = 'indeterminato' | 'determinato' | 'stage' | 'freelance' | 'apprendistato';
export type WorkMode = 'in-presenza' | 'ibrido' | 'remoto';
export type PersonnelStatus = 'aperto' | 'chiuso';

export interface PersonnelListing {
  id: string;
  kind: PersonnelKind;
  title: string;            // ruolo: "Sous Chef" / "Cameriere ai piani con esperienza"
  organization: string;     // nome azienda (offerta) o nome candidato (richiesta)
  city: string;
  region: string;
  contractType: ContractType;
  workMode: WorkMode;
  description: string;
  requirements: string[];
  salaryRange?: string;     // optional, e.g. "€ 28.000 - 35.000 lordi/anno"
  experienceYears?: number; // anni di esperienza richiesti (offerta) o maturati (richiesta)
  publishedDate: string;
  status: PersonnelStatus;
  contactName: string;
  contactEmail: string;
}

export type CourseMode = 'online' | 'in-presenza' | 'ibrido';
export type CourseLevel = 'base' | 'intermedio' | 'avanzato';

export interface AcademyCourse {
  id: string;
  title: string;
  category: string;          // "Hospitality Management", "Sicurezza HACCP", ecc.
  instructor: string;
  description: string;
  syllabus: string[];        // bullet della struttura del corso
  mode: CourseMode;
  level: CourseLevel;
  durationHours: number;
  startDate: string;
  endDate: string;
  city?: string;             // se mode include in-presenza
  seatsAvailable: number;
  totalSeats: number;
  price: number;             // 0 = gratuito
  publishedDate: string;
}

/* === MOCK PERSONNEL === */

export const PERSONNEL_LISTINGS: PersonnelListing[] = [
  {
    id: 'p1',
    kind: 'offerta',
    title: 'Sous Chef - Ristorante Stellato',
    organization: 'Hotel Splendid Roma',
    city: 'Roma',
    region: 'Lazio',
    contractType: 'indeterminato',
    workMode: 'in-presenza',
    description:
      "Cerchiamo Sous Chef con esperienza in cucina di alto livello per il nostro ristorante stellato. La figura affiancherà l'Executive Chef nella gestione della brigata, nella progettazione menu e nel controllo qualità.",
    requirements: [
      'Almeno 5 anni di esperienza in ristoranti stellati o di alta categoria',
      'Conoscenza approfondita della cucina italiana e internazionale',
      'Capacità di gestione team (8-12 persone)',
      'Disponibilità a turni serali e weekend',
    ],
    salaryRange: '€ 38.000 - 45.000 lordi/anno + benefit',
    experienceYears: 5,
    publishedDate: '2026-04-10',
    status: 'aperto',
    contactName: 'Maria Bianchi',
    contactEmail: 'recruiting@hotelsplendid.it',
  },
  {
    id: 'p2',
    kind: 'offerta',
    title: 'Receptionist Notturno',
    organization: 'Boutique Hotel Venezia',
    city: 'Venezia',
    region: 'Veneto',
    contractType: 'determinato',
    workMode: 'in-presenza',
    description:
      'Selezioniamo receptionist per il turno notturno (22:00 - 06:00). La figura si occuperà di accoglienza ospiti late check-in, gestione richieste e prenotazioni notturne.',
    requirements: [
      'Esperienza pregressa minimo 2 anni in hotel 4/5 stelle',
      'Inglese fluente, gradita seconda lingua (francese o tedesco)',
      'Conoscenza PMS (Opera o Protel)',
      'Disponibilità immediata',
    ],
    salaryRange: '€ 1.700 - 2.000 netti/mese',
    experienceYears: 2,
    publishedDate: '2026-04-15',
    status: 'aperto',
    contactName: 'Luigi Verdi',
    contactEmail: 'hr@boutiquevenice.it',
  },
  {
    id: 'p3',
    kind: 'offerta',
    title: 'F&B Manager - Resort 5 Stelle',
    organization: 'Luxury Resort Sardegna',
    city: 'Costa Smeralda',
    region: 'Sardegna',
    contractType: 'indeterminato',
    workMode: 'in-presenza',
    description:
      'Resort di lusso in Costa Smeralda cerca Food & Beverage Manager esperto. Coordinerà 4 outlet (ristorante stellato, bistrò, beach club, banchettistica) con un team di oltre 40 persone.',
    requirements: [
      'Almeno 7 anni di esperienza F&B in strutture luxury',
      'Esperienza P&L e gestione budget multi-outlet',
      'Inglese e italiano madrelingua, preferibile terza lingua',
      'Disponibilità trasferta stagionale (aprile-ottobre)',
    ],
    salaryRange: '€ 65.000 - 80.000 lordi/anno + alloggio + benefit',
    experienceYears: 7,
    publishedDate: '2026-04-08',
    status: 'aperto',
    contactName: 'Paolo Costa',
    contactEmail: 'careers@sardinia.it',
  },
  {
    id: 'p4',
    kind: 'offerta',
    title: 'Stagista Reception',
    organization: 'Grand Hotel Firenze',
    city: 'Firenze',
    region: 'Toscana',
    contractType: 'stage',
    workMode: 'in-presenza',
    description:
      "Stage curriculare/extracurriculare di 6 mesi presso il front-office di hotel 5 stelle nel centro storico di Firenze. Affiancamento a senior receptionist per apprendere l'intero ciclo di accoglienza.",
    requirements: [
      'Iscrizione corso di laurea in Hospitality / Turismo / Lingue',
      "Inglese B2 o superiore",
      'Disponibilità 6 mesi full-time',
    ],
    salaryRange: '€ 600 mensili rimborso spese',
    publishedDate: '2026-04-18',
    status: 'aperto',
    contactName: 'Anna Rossi',
    contactEmail: 'stage@grandhotelfirenze.com',
  },
  {
    id: 'p5',
    kind: 'richiesta',
    title: 'Cameriere ai piani con 8 anni di esperienza',
    organization: 'Marco Esposito',
    city: 'Napoli',
    region: 'Campania',
    contractType: 'indeterminato',
    workMode: 'in-presenza',
    description:
      'Professionista del settore housekeeping con 8 anni di esperienza in hotel 4/5 stelle (di cui 3 come capo piano) cerca nuova posizione. Disponibilità immediata per Napoli, Costiera Amalfitana e Sorrento.',
    requirements: [
      'Esperienza diretta hotel 4/5 stelle',
      "Conoscenza protocolli sanificazione e standard internazionali",
      "Capacità di coordinare team fino a 6 persone",
    ],
    experienceYears: 8,
    publishedDate: '2026-04-20',
    status: 'aperto',
    contactName: 'Marco Esposito',
    contactEmail: 'marco.esposito.hsk@email.it',
  },
  {
    id: 'p6',
    kind: 'richiesta',
    title: 'Chef de Rang con esperienza ristoranti stellati',
    organization: 'Sara Ferrari',
    city: 'Milano',
    region: 'Lombardia',
    contractType: 'determinato',
    workMode: 'in-presenza',
    description:
      "Chef de Rang con 6 anni in ristoranti stellati (1-2 stelle Michelin), inglese e francese fluenti, sommelier AIS livello 2. Cerca posizione di prestigio in Lombardia o estero.",
    requirements: [
      'Servizio di sala fine dining',
      'Conoscenza wine pairing e abbinamenti',
      'Disponibilità trasferte estere brevi',
    ],
    experienceYears: 6,
    publishedDate: '2026-04-22',
    status: 'aperto',
    contactName: 'Sara Ferrari',
    contactEmail: 'sara.ferrari.dr@email.it',
  },
  {
    id: 'p7',
    kind: 'richiesta',
    title: 'Revenue Manager freelance',
    organization: 'Davide Greco',
    city: 'Bologna',
    region: 'Emilia-Romagna',
    contractType: 'freelance',
    workMode: 'remoto',
    description:
      "Revenue Manager freelance con portfolio di 15+ strutture seguite (boutique hotel e residence). Disponibile per consulenze, ottimizzazione canali, pricing dinamico e formazione team.",
    requirements: [
      'Esperienza con channel manager (Booking, Expedia, Airbnb)',
      'Modelli pricing dinamici',
      'Reportistica P&L mensile',
    ],
    experienceYears: 9,
    publishedDate: '2026-04-19',
    status: 'aperto',
    contactName: 'Davide Greco',
    contactEmail: 'davide.greco.rm@email.it',
  },
  {
    id: 'p8',
    kind: 'richiesta',
    title: 'Bartender / Mixologist diplomato BAR Academy',
    organization: 'Giulia Conti',
    city: 'Roma',
    region: 'Lazio',
    contractType: 'indeterminato',
    workMode: 'in-presenza',
    description:
      "Bartender con diploma BAR Academy e 4 anni di esperienza in cocktail bar di hotel di lusso. Esperienza in signature cocktail e formazione team junior.",
    requirements: [
      'Mixology classica e contemporanea',
      'Inglese B2',
      'Disponibilità weekend e festività',
    ],
    experienceYears: 4,
    publishedDate: '2026-04-21',
    status: 'aperto',
    contactName: 'Giulia Conti',
    contactEmail: 'giulia.conti.bar@email.it',
  },
];

/* === MOCK COURSES === */

export const ACADEMY_COURSES: AcademyCourse[] = [
  {
    id: 'c1',
    title: 'Hospitality Revenue Management',
    category: 'Revenue & Pricing',
    instructor: 'Prof. Andrea Lombardi',
    description:
      'Corso completo sulle logiche di revenue management nel settore alberghiero: forecasting, pricing dinamico, channel mix, distribuzione e reportistica.',
    syllabus: [
      'Fondamenti di revenue management',
      'KPI e metriche (RevPAR, ADR, Occupancy)',
      'Strumenti di forecasting',
      'Channel mix e disparità',
      'Pricing dinamico e parity',
      'Case study e simulazioni',
    ],
    mode: 'ibrido',
    level: 'intermedio',
    durationHours: 24,
    startDate: '2026-05-12',
    endDate: '2026-05-30',
    city: 'Milano',
    seatsAvailable: 8,
    totalSeats: 20,
    price: 850,
    publishedDate: '2026-04-01',
  },
  {
    id: 'c2',
    title: 'HACCP per Operatori del Settore Alimentare',
    category: 'Sicurezza & Compliance',
    instructor: 'Dott.ssa Chiara Marini',
    description:
      'Corso obbligatorio HACCP rivolto a tutti gli operatori del settore alimentare. Rilascio attestato valido a livello nazionale.',
    syllabus: [
      'Normativa europea e italiana',
      'Principi HACCP',
      'Pulizia e sanificazione',
      'Allergeni e contaminazioni',
      'Rintracciabilità',
      'Test finale e attestato',
    ],
    mode: 'online',
    level: 'base',
    durationHours: 8,
    startDate: '2026-05-05',
    endDate: '2026-05-06',
    seatsAvailable: 45,
    totalSeats: 60,
    price: 120,
    publishedDate: '2026-04-05',
  },
  {
    id: 'c3',
    title: 'Mixology - Tecniche Avanzate',
    category: 'F&B Operations',
    instructor: 'Marco Rinaldi (World Class Champion 2023)',
    description:
      "Workshop intensivo di 3 giorni sulle tecniche più avanzate di mixology: infusioni, spume, clarificazione, pairing con il cibo.",
    syllabus: [
      'Storia della mixology contemporanea',
      'Infusioni a freddo e a caldo',
      'Tecnica del clarified milk punch',
      'Spume e texture innovative',
      'Food pairing creativo',
      'Sessione pratica con valutazione',
    ],
    mode: 'in-presenza',
    level: 'avanzato',
    durationHours: 24,
    startDate: '2026-06-02',
    endDate: '2026-06-04',
    city: 'Milano',
    seatsAvailable: 4,
    totalSeats: 12,
    price: 1200,
    publishedDate: '2026-04-12',
  },
  {
    id: 'c4',
    title: 'Inglese per il Front Office',
    category: 'Lingue',
    instructor: 'Sarah Thompson',
    description:
      'Corso pratico di inglese per receptionist e front office staff. Focus su situazioni reali di accoglienza, gestione complaint e telefonate.',
    syllabus: [
      'Welcome script e check-in/check-out',
      'Gestione richieste speciali',
      'Phone English',
      "Complaint handling",
      'Cultural awareness',
      'Role-play e simulazioni',
    ],
    mode: 'online',
    level: 'intermedio',
    durationHours: 30,
    startDate: '2026-05-19',
    endDate: '2026-06-30',
    seatsAvailable: 18,
    totalSeats: 25,
    price: 480,
    publishedDate: '2026-04-08',
  },
  {
    id: 'c5',
    title: 'Sommelier - 1° Livello AIS',
    category: 'F&B Operations',
    instructor: 'Delegazione AIS Roma',
    description:
      'Corso ufficiale AIS di primo livello. Avvicinamento al mondo del vino: viticoltura, vinificazione, tecnica di degustazione, abbinamento cibo-vino.',
    syllabus: [
      'Storia e cultura del vino',
      'Tecnica di degustazione AIS',
      'Vitigni autoctoni italiani',
      'Vinificazione bianchi e rossi',
      'Abbinamento cibo-vino',
      'Esame finale',
    ],
    mode: 'in-presenza',
    level: 'base',
    durationHours: 60,
    startDate: '2026-09-15',
    endDate: '2026-12-20',
    city: 'Roma',
    seatsAvailable: 22,
    totalSeats: 30,
    price: 750,
    publishedDate: '2026-04-15',
  },
  {
    id: 'c6',
    title: 'Hospitality Digital Marketing',
    category: 'Marketing & Sales',
    instructor: 'Elena Russo (Marketing Director)',
    description:
      'Strategie digitali per hotel indipendenti: SEO/SEM, social media, content marketing, gestione reputazione online e campagne ADV.',
    syllabus: [
      "Funnel di acquisizione hotel",
      'SEO e Local SEO',
      'Google Hotel Ads e meta-search',
      'Social media per hotel',
      'Online reputation',
      'Misurazione ROI',
    ],
    mode: 'online',
    level: 'intermedio',
    durationHours: 16,
    startDate: '2026-05-26',
    endDate: '2026-06-09',
    seatsAvailable: 30,
    totalSeats: 40,
    price: 290,
    publishedDate: '2026-04-10',
  },
];
