export interface CategoryClassItem {
  name: string;
  isBold?: boolean;
}

export interface CategoryClass {
  title: string;
  items: CategoryClassItem[];
}

export interface CategoryData {
  name: string;
  classes: CategoryClass[];
  suppliers: string[];
  imageUrl?: string;
}

export const categoryData: Record<number, CategoryData> = {
  1: {
    name: 'Alimenti, Ristorazione e Buoni Pasto',
    classes: [
      {
        title: 'Alimenti e derivati',
        items: [
          { name: 'Alimenti' },
          { name: 'Alimentari e affini' },
          { name: 'Pasta' },
          { name: 'Formaggi' },
          { name: 'Salumi' },
          { name: 'Olio' },
          { name: 'Sughi artigianali e passate' },
          { name: 'Miele' },
          { name: 'Tonno' },
          { name: 'Dolci' },
          { name: 'Aceto' },
          { name: 'Taralli pugliesi' },
          { name: 'Tartufo' },
          { name: 'Alimenti per animali' },
          { name: 'Torrefazione' },
        ],
      },
      {
        title: 'Bevande',
        items: [
          { name: 'Acqua' },
          { name: 'Vini' },
          { name: 'Liquori' },
          { name: 'Birra' },
        ],
      },
      {
        title: 'Ristorazione e buoni',
        items: [
          { name: 'Ristorazione', isBold: true },
          { name: 'Buoni pasto' },
        ],
      },
    ],
    suppliers: [
      'Barilla', 'Parmalat', 'Gardani', 'Galbani', 'Valdobbiaddene',
      'Carli', 'Sammontana', 'Fini', 'Palmera', 'Findus',
      'Molinari', 'Campari', 'Algida', 'Ferrero', 'Alphalink',
    ],
  },
  2: {
    name: 'Energia, Carburanti e Lubrificanti',
    classes: [
      {
        title: 'Energia',
        items: [
          { name: 'Energia elettrica' },
          { name: 'Gas metano' },
          { name: 'Energia rinnovabile' },
          { name: 'Fotovoltaico' },
        ],
      },
      {
        title: 'Carburanti',
        items: [
          { name: 'Benzina' },
          { name: 'Diesel' },
          { name: 'GPL' },
          { name: 'Metano' },
        ],
      },
      {
        title: 'Lubrificanti',
        items: [
          { name: 'Oli motore' },
          { name: 'Oli industriali' },
          { name: 'Grassi lubrificanti' },
        ],
      },
    ],
    suppliers: [
      'Enel', 'Eni', 'A2A', 'Edison', 'Sorgenia',
      'Shell', 'IP', 'Q8', 'Tamoil', 'Esso',
      'Castrol', 'Mobil', 'Total',
    ],
  },
  3: {
    name: 'Cancelleria, Carta e Consumabili',
    classes: [
      {
        title: 'Cancelleria',
        items: [
          { name: 'Penne e matite' },
          { name: 'Quaderni e blocchi' },
          { name: 'Raccoglitori e cartelline' },
          { name: 'Articoli da scrivania' },
        ],
      },
      {
        title: 'Carta',
        items: [
          { name: 'Carta per stampanti' },
          { name: 'Carta fotografica' },
          { name: 'Carta speciale' },
        ],
      },
      {
        title: 'Consumabili',
        items: [
          { name: 'Toner e cartucce' },
          { name: 'Nastri per stampanti' },
          { name: 'CD e DVD' },
        ],
      },
    ],
    suppliers: [
      'Buffetti', 'Fabriano', 'Bic', 'Stabilo', 'Pilot',
      'HP', 'Canon', 'Epson', 'Brother', 'Samsung',
    ],
  },
  4: {
    name: 'Informatica, Elettronica e Macchinari',
    classes: [
      {
        title: 'Informatica',
        items: [
          { name: 'Computer e laptop' },
          { name: 'Server e networking' },
          { name: 'Periferiche' },
          { name: 'Software e licenze' },
        ],
      },
      {
        title: 'Elettronica',
        items: [
          { name: 'Smartphone e tablet' },
          { name: 'Fotocamere e videocamere' },
          { name: 'Audio e video' },
        ],
      },
      {
        title: 'Macchinari',
        items: [
          { name: 'Stampanti e scanner' },
          { name: 'Fotocopiatrici' },
          { name: 'Plotter' },
        ],
      },
    ],
    suppliers: [
      'Dell', 'HP', 'Lenovo', 'Apple', 'Asus',
      'Samsung', 'Microsoft', 'Cisco', 'Xerox', 'Canon',
    ],
  },
  5: {
    name: 'Editoria, Eventi e Comunicazione',
    classes: [
      {
        title: 'Editoria',
        items: [
          { name: 'Stampa tipografica' },
          { name: 'Editoria digitale' },
          { name: 'Libri e pubblicazioni' },
          { name: 'Riviste e periodici' },
          { name: 'Grafica pubblicitaria' },
        ],
      },
      {
        title: 'Eventi',
        items: [
          { name: 'Organizzazione eventi' },
          { name: 'Catering per eventi' },
          { name: 'Allestimenti fieristici' },
          { name: 'Noleggio attrezzature' },
          { name: 'Hostess e personale' },
        ],
      },
      {
        title: 'Comunicazione',
        items: [
          { name: 'Agenzie di comunicazione' },
          { name: 'Ufficio stampa' },
          { name: 'Social media marketing' },
          { name: 'Content marketing' },
          { name: 'Pubblicità online' },
        ],
      },
    ],
    suppliers: [
      'Mondadori', 'RCS', 'Rizzoli', 'Giunti', 'De Agostini',
      'Fiera Milano', 'SGP', 'Mailander', 'Ogilvy', 'Saatchi',
      'Publicis', 'Dentsu', 'Havas',
    ],
  },
  6: {
    name: 'Lavori di Manutenzione',
    classes: [
      {
        title: 'Manutenzione ordinaria',
        items: [
          { name: 'Pulizie e sanificazione' },
          { name: 'Giardinaggio e verde' },
          { name: 'Controlli periodici' },
          { name: 'Piccole riparazioni' },
        ],
      },
      {
        title: 'Manutenzione straordinaria',
        items: [
          { name: 'Ristrutturazioni' },
          { name: 'Impianti elettrici' },
          { name: 'Impianti idraulici' },
          { name: 'Impianti termici' },
          { name: 'Rifacimento facciate' },
        ],
      },
      {
        title: 'Servizi specialistici',
        items: [
          { name: 'Manutenzione ascensori' },
          { name: 'Condizionamento' },
          { name: 'Antincendio' },
          { name: 'Sicurezza impianti' },
        ],
      },
    ],
    suppliers: [
      'ISS', 'Dussmann', 'Manital', 'Otis', 'Schindler',
      'Kone', 'Daikin', 'Carrier', 'Vaillant', 'Bosch',
      'Siemens', 'ABB', 'Schneider Electric',
    ],
  },
  7: {
    name: 'Idraulica, Edilizia e Materiale Elettrico',
    classes: [
      {
        title: 'Idraulica',
        items: [
          { name: 'Rubinetteria' },
          { name: 'Sanitari' },
          { name: 'Tubazioni e raccordi' },
          { name: 'Pompe e valvole' },
          { name: 'Riscaldamento' },
        ],
      },
      {
        title: 'Edilizia',
        items: [
          { name: 'Cementi e malte' },
          { name: 'Laterizi e blocchi' },
          { name: 'Isolanti termici' },
          { name: 'Impermeabilizzanti' },
          { name: 'Pavimenti e rivestimenti' },
          { name: 'Serramenti e infissi' },
        ],
      },
      {
        title: 'Materiale elettrico',
        items: [
          { name: 'Cavi e conduttori' },
          { name: 'Quadri elettrici' },
          { name: 'Interruttori e prese' },
          { name: 'Illuminazione LED' },
          { name: 'Domotica' },
        ],
      },
    ],
    suppliers: [
      'Grohe', 'Hansgrohe', 'Geberit', 'Ideal Standard', 'Roca',
      'Knauf', 'Saint-Gobain', 'Mapei', 'Kerakoll', 'Fassa Bortolo',
      'BTicino', 'Vimar', 'Gewiss', 'ABB', 'Finder',
    ],
  },
  8: {
    name: 'Attrezzature e Impianti',
    classes: [
      {
        title: 'Attrezzature industriali',
        items: [
          { name: 'Macchinari di produzione' },
          { name: 'Utensili elettrici' },
          { name: 'Compressori' },
          { name: 'Generatori' },
          { name: 'Saldatrici' },
        ],
      },
      {
        title: 'Impianti tecnologici',
        items: [
          { name: 'Impianti di climatizzazione' },
          { name: 'Impianti di ventilazione' },
          { name: 'Impianti frigoriferi' },
          { name: 'Centrali termiche' },
        ],
      },
      {
        title: 'Sicurezza',
        items: [
          { name: 'Videosorveglianza' },
          { name: 'Controllo accessi' },
          { name: 'Antifurto' },
          { name: 'Antincendio' },
        ],
      },
    ],
    suppliers: [
      'Bosch', 'Makita', 'Dewalt', 'Hilti', 'Stanley',
      'Atlas Copco', 'Ingersoll Rand', 'Carel', 'Honeywell',
      'Axis', 'Hikvision', 'Dahua', 'Comelit',
    ],
  },
  9: {
    name: 'Monouso, Pulizie e Igiene',
    classes: [
      {
        title: 'Monouso',
        items: [
          { name: 'Piatti e posate monouso' },
          { name: 'Bicchieri e cannucce' },
          { name: 'Contenitori take away' },
          { name: 'Tovaglioli e tovaglie' },
          { name: 'Sacchetti e shoppers' },
        ],
      },
      {
        title: 'Pulizie',
        items: [
          { name: 'Detergenti multiuso' },
          { name: 'Sgrassatori' },
          { name: 'Disinfettanti' },
          { name: 'Scope e spazzole' },
          { name: 'Carrelli e attrezzature' },
          { name: 'Panni e spugne' },
        ],
      },
      {
        title: 'Igiene',
        items: [
          { name: 'Carta igienica' },
          { name: 'Asciugamani' },
          { name: 'Saponi e detergenti mani' },
          { name: 'Dispenser' },
          { name: 'Deodoranti ambientali' },
        ],
      },
    ],
    suppliers: [
      'Papernet', 'Lucart', 'Regina', 'Fato', 'Tork',
      'Vileda', 'Perfetto', 'ACE', 'Lysoform', 'Amuchina',
      'Scotch-Brite', 'Chilly', 'Greenweez',
    ],
  },
  10: {
    name: 'Rifiuti e Riciclo',
    classes: [
      {
        title: 'Gestione rifiuti',
        items: [
          { name: 'Raccolta differenziata' },
          { name: 'Smaltimento rifiuti speciali' },
          { name: 'Trasporto rifiuti' },
          { name: 'Noleggio contenitori' },
        ],
      },
      {
        title: 'Riciclaggio',
        items: [
          { name: 'Riciclo carta e cartone' },
          { name: 'Riciclo plastica' },
          { name: 'Riciclo vetro' },
          { name: 'Riciclo metalli' },
          { name: 'Compostaggio organico' },
        ],
      },
      {
        title: 'Rifiuti speciali',
        items: [
          { name: 'RAEE (elettronici)' },
          { name: 'Oli esausti' },
          { name: 'Batterie e pile' },
          { name: 'Toner e cartucce' },
        ],
      },
    ],
    suppliers: [
      'AMSA', 'Hera', 'A2A', 'Iren', 'AMA',
      'Corepla', 'Comieco', 'CoReVe', 'Rilegno',
      'Ecolight', 'Remedia', 'Cobat',
    ],
  },
  11: {
    name: 'Ricerca, Welfare e Benefit',
    classes: [
      {
        title: 'Ricerca del personale',
        items: [
          { name: 'Selezione e recruiting' },
          { name: 'Somministrazione lavoro' },
          { name: 'Executive search' },
          { name: 'Assessment' },
        ],
      },
      {
        title: 'Welfare aziendale',
        items: [
          { name: 'Piattaforme welfare' },
          { name: 'Assicurazioni sanitarie' },
          { name: 'Previdenza complementare' },
          { name: 'Servizi di conciliazione' },
          { name: 'Smart working tools' },
        ],
      },
      {
        title: 'Benefit e formazione',
        items: [
          { name: 'Buoni acquisto' },
          { name: 'Convenzioni aziendali' },
          { name: 'Corsi di formazione' },
          { name: 'Team building' },
          { name: 'Programmi benessere' },
        ],
      },
    ],
    suppliers: [
      'Randstad', 'Manpower', 'Adecco', 'GiGroup', 'Hunters',
      'Edenred', 'Sodexo', 'Day', 'Welfare Company',
      'Generali', 'Unipol', 'Allianz', 'AXA', 'Reale Mutua',
    ],
  },
  12: {
    name: 'Arredi, Complementi ed Elettrodomestici',
    classes: [
      {
        title: 'Arredi ufficio',
        items: [
          { name: 'Scrivanie e tavoli' },
          { name: 'Sedie ergonomiche' },
          { name: 'Armadi e contenitori' },
          { name: 'Librerie e scaffalature' },
          { name: 'Reception e sale riunioni' },
        ],
      },
      {
        title: 'Complementi',
        items: [
          { name: 'Illuminazione' },
          { name: 'Tende e oscuranti' },
          { name: 'Tappeti e moquette' },
          { name: 'Decorazioni' },
          { name: 'Piante ornamentali' },
        ],
      },
      {
        title: 'Elettrodomestici',
        items: [
          { name: 'Frigoriferi e freezer' },
          { name: 'Forni e microonde' },
          { name: 'Lavastoviglie' },
          { name: 'Macchine caffè' },
          { name: 'Distributori automatici' },
        ],
      },
    ],
    suppliers: [
      'Tecno', 'Fantoni', 'Martex', 'Kinnarps', 'Steelcase',
      'Herman Miller', 'Artemide', 'Flos', 'Luceplan',
      'Electrolux', 'Whirlpool', 'Bosch', 'Miele', 'Smeg',
      'De Longhi', 'Lavazza', 'Nespresso',
    ],
  },
};

export function slugifySupplier(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface SupplierLookup {
  name: string;
  categoryId: number;
  categoryName: string;
}

export function findSupplierBySlug(slug: string): SupplierLookup | null {
  for (const [idStr, cat] of Object.entries(categoryData)) {
    const match = cat.suppliers.find((s) => slugifySupplier(s) === slug);
    if (match) {
      return {
        name: match,
        categoryId: Number(idStr),
        categoryName: cat.name,
      };
    }
  }
  return null;
}
