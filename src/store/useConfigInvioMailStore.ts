import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Configurazione del servizio di invio dei preventivi ─────────────────────
//  Per struttura: come si spediscono le mail (casella SMTP o servizio di invio),
//  mittente, dominio, pagina pubblica dei link nelle mail, pagamenti Nexi XPay.
//
//  SICUREZZA: password, chiavi API e chiave segreta Nexi NON si salvano nel
//  browser (partialize le toglie): restano in memoria per la sessione e, col
//  backend collegato, si inviano al server che le conserva cifrate. Si
//  persiste solo che sono state inserite (`*Impostata`).

export type MetodoInvio = 'smtp' | 'provider'
export type ProviderInvio = 'brevo' | 'sendgrid' | 'ses' | 'postmark' | 'mailgun'
export type Sicurezza = 'ssl' | 'starttls' | 'nessuna'

export interface ConfigInvioMail {
  attivo: boolean
  metodo: MetodoInvio
  // Casella SMTP
  smtpPreset: string
  smtpHost: string
  smtpPorta: number
  smtpSicurezza: Sicurezza
  smtpUtente: string
  smtpPassword: string
  smtpPasswordImpostata: boolean
  // Servizio di invio
  provider: ProviderInvio
  apiKey: string
  apiKeyImpostata: boolean
  regione: string
  // Mittente
  nomeMittente: string
  emailMittente: string
  rispondiA: string
  copiaNascosta: string
  // Dominio
  dominio: string
  // Pagina pubblica dei link nelle mail (Accetta, Paga, Riprova)
  urlPubblico: string
  validitaLink: number
  // Pagamenti Nexi XPay
  nexiAttivo: boolean
  nexiAmbiente: 'test' | 'produzione'
  nexiAlias: string
  nexiChiave: string
  nexiChiaveImpostata: boolean
  // Stato
  aggiornato?: string
}

export const CONFIG_VUOTA: ConfigInvioMail = {
  attivo: false, metodo: 'smtp',
  smtpPreset: 'custom', smtpHost: '', smtpPorta: 587, smtpSicurezza: 'starttls', smtpUtente: '', smtpPassword: '', smtpPasswordImpostata: false,
  provider: 'brevo', apiKey: '', apiKeyImpostata: false, regione: 'eu-south-1',
  nomeMittente: '', emailMittente: '', rispondiA: '', copiaNascosta: '',
  dominio: '', urlPubblico: '', validitaLink: 30,
  nexiAttivo: false, nexiAmbiente: 'test', nexiAlias: '', nexiChiave: '', nexiChiaveImpostata: false,
}

interface ConfigInvioState {
  config: Record<string, ConfigInvioMail>
  salva: (struttura: string, c: ConfigInvioMail) => void
}

const senzaSegreti = (c: ConfigInvioMail): ConfigInvioMail => ({ ...c, smtpPassword: '', apiKey: '', nexiChiave: '' })

export const useConfigInvioMailStore = create<ConfigInvioState>()(
  persist(
    (set) => ({
      config: {},
      salva: (struttura, c) => set((s) => ({
        config: {
          ...s.config,
          [struttura]: {
            ...c,
            smtpPasswordImpostata: c.smtpPasswordImpostata || !!c.smtpPassword,
            apiKeyImpostata: c.apiKeyImpostata || !!c.apiKey,
            nexiChiaveImpostata: c.nexiChiaveImpostata || !!c.nexiChiave,
            aggiornato: new Date().toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }),
          },
        },
      })),
    }),
    {
      name: 'sibylla.config-invio-preventivi',
      version: 1,
      partialize: (s) => ({ config: Object.fromEntries(Object.entries(s.config).map(([k, c]) => [k, senzaSegreti(c)])) }),
    },
  ),
)

export const configDi = (struttura: string, config = useConfigInvioMailStore.getState().config): ConfigInvioMail =>
  ({ ...CONFIG_VUOTA, ...config[struttura] })
