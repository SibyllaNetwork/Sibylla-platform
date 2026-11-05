// ─── CATALOGO DEI SOFTWARE PAGHE ────────────────────────────────────────────────
//  I software paghe più diffusi in Italia con quello che serve per collegarli:
//  canali supportati (API, SFTP, email al consulente), campi del collegamento
//  per canale, formati del tracciato presenze e codici voce proposti.
//  Configurazione HR › Integrazione paghe li mostra; Registro presenze ›
//  Trasmetti consuntivo usa quello attivo. L'invio vero è del connettore BE.

export type SoftwarePagheId = 'zucchetti' | 'teamsystem' | 'inaz' | 'sistemi' | 'ranocchi' | 'adp'
export type CanalePaghe = 'api' | 'sftp' | 'email'

export interface CampoPaghe {
  key: string
  label: string
  tipo?: 'text' | 'password' | 'url' | 'email' | 'select'
  placeholder?: string
  hint?: string
  options?: string[]
  /** Se indicato, il campo compare solo per questi canali. */
  canali?: CanalePaghe[]
  obbligatorio?: boolean
}

export interface SoftwarePaghe {
  id: SoftwarePagheId
  nome: string
  produttore: string
  /** Sigla del riquadro (niente loghi di terzi). */
  sigla: string
  descrizione: string
  canali: CanalePaghe[]
  formati: string[]
  campi: CampoPaghe[]
  /** Codice voce proposto per ciascuna voce del registro. */
  voci: Record<string, string>
  /** Come il software riconosce il dipendente nel tracciato. */
  chiaveDipendente: string[]
}

export const CANALI_PAGHE: Record<CanalePaghe, { label: string; icon: string; descrizione: string }> = {
  api:   { label: 'Collegamento diretto (API)', icon: 'fa-plug', descrizione: 'Il consuntivo arriva nel software paghe senza passaggi manuali.' },
  sftp:  { label: 'File su SFTP', icon: 'fa-server', descrizione: 'Sibylla deposita il tracciato nella cartella del consulente.' },
  email: { label: 'Email al consulente', icon: 'fa-envelope', descrizione: 'Il tracciato parte in allegato all’indirizzo del consulente.' },
}

/** Voci del registro presenze trasmesse nel consuntivo. */
export const VOCI_CONSUNTIVO: { voce: string; descrizione: string }[] = [
  { voce: 'Ordinarie', descrizione: 'Ore ordinarie lavorate' },
  { voce: 'Straordinario', descrizione: "Straordinario oltre l'orario" },
  { voce: 'Festive', descrizione: 'Ore lavorate di domenica e nei festivi' },
  { voce: 'Permessi', descrizione: 'Permessi e ROL a ore' },
  { voce: 'Ferie', descrizione: 'Giornate di ferie' },
  { voce: 'Malattia', descrizione: 'Giornate di malattia (con PUC)' },
  { voce: 'Infortunio', descrizione: 'Giornate di infortunio' },
  { voce: 'Trasferta', descrizione: 'Giornate in trasferta' },
  { voce: 'Assenza', descrizione: 'Assenza non giustificata' },
]

const SFTP: CampoPaghe[] = [
  { key: 'sftpHost', label: 'Host SFTP', placeholder: 'sftp.studio.it', canali: ['sftp'], obbligatorio: true },
  { key: 'sftpPorta', label: 'Porta', placeholder: '22', canali: ['sftp'] },
  { key: 'sftpUtente', label: 'Utente SFTP', canali: ['sftp'], obbligatorio: true },
  { key: 'sftpPassword', label: 'Password o chiave', tipo: 'password', canali: ['sftp'], obbligatorio: true },
  { key: 'sftpCartella', label: 'Cartella di destinazione', placeholder: '/in/presenze', canali: ['sftp'] },
]
const EMAIL: CampoPaghe[] = [
  { key: 'studio', label: 'Studio del consulente', placeholder: 'Studio Rossi consulenti del lavoro', canali: ['email'] },
  { key: 'emailConsulente', label: 'Email del consulente', tipo: 'email', placeholder: 'paghe@studio.it', canali: ['email'], obbligatorio: true },
  { key: 'emailCc', label: 'In copia', tipo: 'email', placeholder: 'amministrazione@hotel.it', canali: ['email'] },
]

export const SOFTWARE_PAGHE: SoftwarePaghe[] = [
  {
    id: 'zucchetti', nome: 'Paghe Project / Infinity HR', produttore: 'Zucchetti', sigla: 'ZU',
    descrizione: 'Rilevazione presenze verso Paghe Project o Infinity HR: tracciato a campi fissi o servizio web di Infinity.',
    canali: ['api', 'sftp', 'email'],
    formati: ['Tracciato presenze Zucchetti (TXT a campi fissi)', 'Infinity HR – import giustificativi (CSV)'],
    campi: [
      { key: 'codiceDitta', label: 'Codice ditta', placeholder: '000123', obbligatorio: true, hint: 'Codice della ditta in Paghe Project.' },
      { key: 'codiceAzienda', label: 'Codice azienda', placeholder: '0001' },
      { key: 'tenant', label: 'URL del tenant Infinity', tipo: 'url', placeholder: 'https://hotelnoto.infinity.zucchetti.it', canali: ['api'], obbligatorio: true },
      { key: 'clientId', label: 'Client ID', canali: ['api'], obbligatorio: true },
      { key: 'clientSecret', label: 'Client secret', tipo: 'password', canali: ['api'], obbligatorio: true },
      ...SFTP, ...EMAIL,
    ],
    voci: { Ordinarie: '0001', Straordinario: '0101', Festive: '0110', Permessi: '0310', Ferie: '0300', Malattia: '0400', Infortunio: '0410', Trasferta: '0500', Assenza: '0900' },
    chiaveDipendente: ['Matricola Zucchetti', 'Codice fiscale'],
  },
  {
    id: 'teamsystem', nome: 'Paghe / HR Lynfa Studio', produttore: 'TeamSystem', sigla: 'TS',
    descrizione: 'Import presenze in TeamSystem Paghe e Lynfa Studio, via TeamSystem Digital Hub o file per lo studio.',
    canali: ['api', 'sftp', 'email'],
    formati: ['Import presenze TeamSystem (CSV)', 'Tracciato presenze TS (TXT)'],
    campi: [
      { key: 'codiceStudio', label: 'Codice studio', placeholder: 'ST0042', obbligatorio: true },
      { key: 'codiceDitta', label: 'Codice ditta', placeholder: '1234', obbligatorio: true },
      { key: 'ambiente', label: 'Ambiente', tipo: 'select', options: ['Produzione', 'Test'], canali: ['api'] },
      { key: 'apiKey', label: 'API key Digital Hub', tipo: 'password', canali: ['api'], obbligatorio: true },
      ...SFTP, ...EMAIL,
    ],
    voci: { Ordinarie: 'ORD', Straordinario: 'STR', Festive: 'FES', Permessi: 'PER', Ferie: 'FER', Malattia: 'MAL', Infortunio: 'INF', Trasferta: 'TRA', Assenza: 'ASS' },
    chiaveDipendente: ['Codice dipendente TeamSystem', 'Codice fiscale'],
  },
  {
    id: 'inaz', nome: 'Paghe Inaz / HRM', produttore: 'Inaz', sigla: 'IN',
    descrizione: 'Giustificativi e ore verso le paghe Inaz tramite web service o tracciato XML.',
    canali: ['api', 'sftp'],
    formati: ['Inaz presenze (XML)', 'Inaz giustificativi (CSV)'],
    campi: [
      { key: 'codiceAzienda', label: 'Codice azienda', placeholder: 'A001', obbligatorio: true },
      { key: 'codiceFiliale', label: 'Codice filiale', placeholder: '01' },
      { key: 'wsUrl', label: 'URL del web service', tipo: 'url', placeholder: 'https://ws.inaz.it/presenze', canali: ['api'], obbligatorio: true },
      { key: 'wsUtente', label: 'Utente web service', canali: ['api'], obbligatorio: true },
      { key: 'wsPassword', label: 'Password web service', tipo: 'password', canali: ['api'], obbligatorio: true },
      ...SFTP,
    ],
    voci: { Ordinarie: 'HO', Straordinario: 'S1', Festive: 'FE', Permessi: 'PR', Ferie: 'FR', Malattia: 'MA', Infortunio: 'IN', Trasferta: 'TR', Assenza: 'AI' },
    chiaveDipendente: ['Matricola Inaz', 'Codice fiscale'],
  },
  {
    id: 'sistemi', nome: 'Job Paghe', produttore: 'Sistemi', sigla: 'SI',
    descrizione: 'Tracciato presenze per Job Paghe depositato su SFTP o inviato allo studio.',
    canali: ['sftp', 'email'],
    formati: ['Tracciato presenze Job (TXT)', 'Import presenze Job (CSV)'],
    campi: [
      { key: 'codiceAzienda', label: 'Codice azienda Job', placeholder: '00042', obbligatorio: true },
      { key: 'codiceStudio', label: 'Codice studio', placeholder: 'S12' },
      ...SFTP, ...EMAIL,
    ],
    voci: { Ordinarie: '01', Straordinario: '20', Festive: '30', Permessi: '41', Ferie: '40', Malattia: '50', Infortunio: '55', Trasferta: '60', Assenza: '90' },
    chiaveDipendente: ['Matricola Job', 'Codice fiscale'],
  },
  {
    id: 'ranocchi', nome: 'Paghe Web', produttore: 'Ranocchi', sigla: 'RA',
    descrizione: 'Presenze verso Paghe Web via API o file per lo studio.',
    canali: ['api', 'email'],
    formati: ['Paghe Web – import presenze (CSV)'],
    campi: [
      { key: 'codiceStudio', label: 'Codice studio', obbligatorio: true },
      { key: 'codiceDitta', label: 'Codice ditta', obbligatorio: true },
      { key: 'apiToken', label: 'Token API', tipo: 'password', canali: ['api'], obbligatorio: true },
      ...EMAIL,
    ],
    voci: { Ordinarie: 'OR', Straordinario: 'ST', Festive: 'FS', Permessi: 'PE', Ferie: 'FE', Malattia: 'MA', Infortunio: 'IF', Trasferta: 'TR', Assenza: 'AN' },
    chiaveDipendente: ['Codice dipendente Paghe Web', 'Codice fiscale'],
  },
  {
    id: 'adp', nome: 'Workforce Now / GlobalView', produttore: 'ADP', sigla: 'AD',
    descrizione: 'Time & Attendance verso ADP con API OAuth e certificato client, oppure file su SFTP.',
    canali: ['api', 'sftp'],
    formati: ['ADP Time & Attendance (CSV)', 'ADP pay data input (XML)'],
    campi: [
      { key: 'companyCode', label: 'Company code', placeholder: 'HN01', obbligatorio: true },
      { key: 'clientId', label: 'Client ID OAuth', canali: ['api'], obbligatorio: true },
      { key: 'clientSecret', label: 'Client secret', tipo: 'password', canali: ['api'], obbligatorio: true },
      { key: 'certificato', label: 'Certificato client (alias)', placeholder: 'adp-hotelnoto-2026', canali: ['api'], hint: 'Il certificato si carica dal portale ADP e resta sul server di Sibylla.' },
      ...SFTP,
    ],
    voci: { Ordinarie: 'REG', Straordinario: 'OT1', Festive: 'HOL', Permessi: 'PTO', Ferie: 'VAC', Malattia: 'SCK', Infortunio: 'INJ', Trasferta: 'TRV', Assenza: 'UNA' },
    chiaveDipendente: ['Associate ID ADP', 'Codice fiscale'],
  },
]

export const softwarePaghe = (id: SoftwarePagheId) => SOFTWARE_PAGHE.find((s) => s.id === id) ?? SOFTWARE_PAGHE[0]
export const nomeSoftwarePaghe = (id: SoftwarePagheId) => { const s = softwarePaghe(id); return `${s.produttore} ${s.nome}` }
