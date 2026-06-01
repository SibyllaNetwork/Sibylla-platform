/**
 * RazorScaffold — pattern condiviso per tutte le pagine portate da
 * `platform/Portal/sibylla/Views/<Razor>.cshtml` → `sibylla-platform`.
 *
 * Tutte le pagine:
 *  - usano BtnBack(home) + PageHeader
 *  - chiamano `apiFetchSibylla<T[]>(apiPath, body)` on mount
 *  - mostrano AlertBanner warning con i mock se backend KO
 *  - rispettano il design system (`sib-*`, FormGrid, StatusBadge, ecc.)
 */

import React, { useEffect, useState } from 'react'
import BtnBack from '../../core/components/BtnBack'
import PageHeader from '../../core/components/PageHeader'
import AlertBanner from '../../core/components/AlertBanner'
import StatusBadge from '../../core/components/StatusBadge'
import FormGrid from '../../core/components/FormGrid'
import FormActions from '../../core/components/FormActions'
import { InputField, SelectField, DatePickerField, TextareaField, CheckboxField } from '../../core/components/form'
import { apiFetchSibylla } from '../../services/api'
import './RazorScaffold.sass'

export interface ScaffoldColumn<T = any> {
  key: keyof T | string
  label: string
  render?: (row: T) => React.ReactNode
  className?: string
}

export interface RazorScaffoldProps<T = any> {
  pageId?: string
  razorPath: string
  apiPath?: string
  apiBody?: unknown
  title: string
  subtitle?: string
  columns?: ScaffoldColumn<T>[]
  fallback?: T[]
  filters?: React.ReactNode
  actions?: React.ReactNode
  onBack?: () => void
  children?: (data: T[], loaded: boolean, error: string | null) => React.ReactNode
}

export default function RazorScaffold<T = any>({
  razorPath, apiPath, apiBody, title, subtitle,
  columns = [], fallback = [], filters, actions, onBack, children,
}: RazorScaffoldProps<T>) {
  const [items, setItems] = useState<T[]>(fallback as T[])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!apiPath) { setLoaded(true); return }
    let cancelled = false
    apiFetchSibylla<T[]>(apiPath, { method: 'POST', body: apiBody ?? {} })
      .then((data) => {
        if (cancelled) return
        if (Array.isArray(data) && data.length > 0) setItems(data)
        setLoaded(true)
      })
      .catch((err) => { if (!cancelled) { setError(err?.message ?? 'Errore'); setLoaded(true) } })
    return () => { cancelled = true }
  }, [apiPath])

  return (
    <div data-razor-source={razorPath}>
      {onBack && <BtnBack onClick={onBack} />}
      <PageHeader title={title} subtitle={subtitle} />

      {error && loaded && (
        <AlertBanner type="warning">
          Backend non raggiungibile — mostro dati di esempio. ({error})
        </AlertBanner>
      )}

      {(filters || actions) && (
        <div className="flex items-end gap-3 flex-wrap mb-5">
          <div className="flex items-end gap-3 flex-wrap flex-1 min-w-0">
            {filters}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}

      {children
        ? children(items, loaded, error)
        : (
          <div className="sib-table-wrap">
            <table className="sib-table">
              <thead>
                <tr>
                  {columns.map((c) => <th key={String(c.key)}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {items.map((row, i) => (
                  <tr key={i}>
                    {columns.map((c) => (
                      <td key={String(c.key)} className={c.className}>
                        {c.render ? c.render(row) : String((row as any)[c.key] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={columns.length} className="sib-empty">Nessun dato.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// TEMPLATE PAGINE — usati dal registry portedPages.tsx
// ──────────────────────────────────────────────────────────────────────

const TONE_BY_LABEL: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  attivo: 'success', attiva: 'success', confermato: 'success', confermata: 'success',
  pagato: 'success', pagata: 'success', completato: 'success', completata: 'success',
  ok: 'success', online: 'success',
  inviato: 'info', inviata: 'info', in_corso: 'info', 'in corso': 'info', aperto: 'info', aperta: 'info',
  bozza: 'neutral', 'da fare': 'warning', 'da pulire': 'warning', warning: 'warning',
  scaduto: 'error', scaduta: 'error', annullato: 'error', annullata: 'error', errore: 'error',
  rifiutato: 'error', rifiutata: 'error', offline: 'error', guasto: 'error',
  disattivo: 'neutral', disattiva: 'neutral', sospeso: 'neutral', sospesa: 'neutral',
}

export function autoToneFor(value: any): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  if (typeof value !== 'string') return 'neutral'
  return TONE_BY_LABEL[value.toLowerCase()] ?? 'info'
}

export interface KpiTile {
  label: string
  value: string | number
  variant?: 'default' | 'success' | 'error' | 'warning'
}

export interface ListPageProps {
  pageId?: string
  razorPath: string
  apiPath?: string
  title: string
  subtitle?: string
  /** KPI mostrate sopra la tabella. */
  kpis?: KpiTile[]
  /** Filtri standard (ricerca + select). Lascia vuoto per nessuno. */
  searchPlaceholder?: string
  selectFilter?: { label: string; options: string[] }
  /** Colonne tabella. */
  columns: ScaffoldColumn<any>[]
  /** Dati mock di partenza (usati anche come fallback). */
  mock?: any[]
  /** Etichetta del bottone "Crea / Aggiungi" (se omesso non viene mostrato). */
  createLabel?: string
  /** Bottoni extra a destra del toolbar. */
  extraActions?: React.ReactNode
  onBack?: () => void
  /** Pagina target per il bottone Crea. */
  createNavTarget?: string
  navigate?: (p: string) => void
}

/**
 * Layout list-style standard: PageHeader + KPI cards + filtri + tabella.
 * Usato dal 90% delle pagine portate (Razor era quasi sempre lista filtrabile).
 */
export function ListPage({
  pageId, razorPath, apiPath, title, subtitle, kpis = [], searchPlaceholder,
  selectFilter, columns, mock = [], createLabel, extraActions,
  onBack, createNavTarget, navigate,
}: ListPageProps) {
  const [search, setSearch] = useState('')
  const [filterValue, setFilterValue] = useState(selectFilter?.options[0] ?? 'Tutti')

  const filterRow = (searchPlaceholder || selectFilter) ? (
    <>
      {searchPlaceholder && (
        <InputField name="search" label="Ricerca" placeholder={searchPlaceholder}
                    value={search} onChange={(e) => setSearch(e.target.value)} />
      )}
      {selectFilter && (
        <SelectField name="filter" label={selectFilter.label} value={filterValue}
                     onChange={(e) => setFilterValue(e.target.value)}
                     options={selectFilter.options.map((o) => ({ value: o, label: o }))} />
      )}
    </>
  ) : null

  const actions = (
    <>
      {extraActions}
      {createLabel && (
        <button className="sib-btn sib-btn--primary" onClick={() => createNavTarget && navigate?.(createNavTarget)}>
          <i className="fa-duotone fa-plus" /> {createLabel}
        </button>
      )}
    </>
  )

  return (
    <RazorScaffold
      pageId={pageId} razorPath={razorPath} apiPath={apiPath}
      title={title} subtitle={subtitle} fallback={mock} columns={columns}
      onBack={onBack} filters={filterRow} actions={(createLabel || extraActions) ? actions : undefined}
    >
      {(data) => {
        const filtered = data.filter((r: any) => {
          if (search) {
            const txt = JSON.stringify(r).toLowerCase()
            if (!txt.includes(search.toLowerCase())) return false
          }
          return true
        })
        return (
          <>
            {kpis.length > 0 && (
              <div className="sib-stats-row">
                {kpis.map((k, i) => (
                  <div className="sib-stat-card" key={i}>
                    <div className="sib-stat-card__label">{k.label}</div>
                    <div className={`sib-stat-card__value ${k.variant === 'success' ? 'sib-stat-card__value--success' : k.variant === 'error' ? 'sib-stat-card__value--error' : k.variant === 'warning' ? 'sib-stat-card__value--warning' : ''}`}>
                      {k.value}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="sib-table-wrap">
              <table className="sib-table">
                <thead>
                  <tr>{columns.map((c) => <th key={String(c.key)}>{c.label}</th>)}</tr>
                </thead>
                <tbody>
                  {filtered.map((row: any, i: number) => (
                    <tr key={i}>
                      {columns.map((c) => (
                        <td key={String(c.key)} className={c.className}>
                          {c.render ? c.render(row) : (
                            (() => {
                              const v = (row as any)[c.key]
                              if (typeof c.key === 'string' && c.key.toLowerCase().includes('stato')) {
                                return v ? <StatusBadge variant={autoToneFor(v)}>{v}</StatusBadge> : '-'
                              }
                              if (v === undefined || v === null || v === '') return '-'
                              if (typeof v === 'boolean') return v ? '✓' : '—'
                              if (typeof v === 'number') return v.toLocaleString('it-IT')
                              return String(v)
                            })()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={columns.length} className="sib-empty">Nessun risultato.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )
      }}
    </RazorScaffold>
  )
}

// ──────────────────────────────────────────────────────────────────────
// FORM PAGE — pagine "Crea/Modifica X"
// ──────────────────────────────────────────────────────────────────────

export type FormFieldType = 'text' | 'email' | 'tel' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox'

export interface FormPageField {
  name: string
  label: string
  type?: FormFieldType
  options?: string[]
  required?: boolean
  cols?: 1 | 2 | 3 | 4
  defaultValue?: string | number | boolean
}

export interface FormPageProps {
  pageId?: string
  razorPath: string
  apiPath?: string
  title: string
  subtitle?: string
  /** Sezioni del form: titolo + lista campi. */
  sections: { title?: string; fields: FormPageField[]; cols?: 2 | 3 | 4 }[]
  onBack?: () => void
  navigate?: (p: string) => void
  /** Pagina alla quale tornare dopo il salvataggio. */
  doneNavTarget?: string
  saveLabel?: string
}

export function FormPage({
  pageId, razorPath, apiPath, title, subtitle, sections,
  onBack, navigate, doneNavTarget, saveLabel = 'Salva',
}: FormPageProps) {
  const [form, setForm] = useState<Record<string, any>>(() => {
    const out: Record<string, any> = {}
    sections.forEach((s) => s.fields.forEach((f) => { out[f.name] = f.defaultValue ?? (f.type === 'checkbox' ? false : '') }))
    return out
  })
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    if (!apiPath) { setSaved(true); return }
    setError(null); setPending(true)
    try {
      await apiFetchSibylla(apiPath, { method: 'POST', body: form })
      setSaved(true)
      if (doneNavTarget && navigate) setTimeout(() => navigate(doneNavTarget), 800)
    } catch (err: any) {
      setError(err?.message ?? 'Salvataggio fallito')
    } finally { setPending(false) }
  }

  return (
    <div data-razor-source={razorPath}>
      {onBack && <BtnBack onClick={onBack} />}
      <PageHeader title={title} subtitle={subtitle} />

      {error && <AlertBanner type="error">{error}</AlertBanner>}
      {saved && <AlertBanner type="success">Salvato</AlertBanner>}

      {sections.map((sec, i) => (
        <React.Fragment key={i}>
          {sec.title && <h3 className="sib-section-title">{sec.title}</h3>}
          <FormGrid cols={sec.cols ?? 2}>
            {sec.fields.map((f) => {
              const common = {
                name: f.name,
                label: f.label,
                value: String(form[f.name] ?? ''),
                onChange: (e: any) => setForm((s) => ({ ...s, [f.name]: e.target.value })),
              }
              if (f.type === 'select') {
                return <SelectField key={f.name} {...common} options={[{ value: '', label: 'Seleziona...' }, ...(f.options ?? []).map((o) => ({ value: o, label: o }))]} />
              }
              if (f.type === 'date') {
                return <DatePickerField key={f.name} name={f.name} label={f.label} value={String(form[f.name] ?? '')} onChange={(e: any) => setForm((s) => ({ ...s, [f.name]: e.target.value }))} />
              }
              if (f.type === 'textarea') {
                return <TextareaField key={f.name} name={f.name} label={f.label} value={String(form[f.name] ?? '')} onChange={(e: any) => setForm((s) => ({ ...s, [f.name]: e.target.value }))} />
              }
              if (f.type === 'checkbox') {
                return <CheckboxField key={f.name} name={f.name} label={f.label} checked={!!form[f.name]} onChange={(e: any) => setForm((s) => ({ ...s, [f.name]: e.target.checked }))} />
              }
              return <InputField key={f.name} name={f.name} label={f.label} type={f.type ?? 'text'} value={String(form[f.name] ?? '')} onChange={(e: any) => setForm((s) => ({ ...s, [f.name]: e.target.value }))} />
            })}
          </FormGrid>
        </React.Fragment>
      ))}

      <FormActions
        onCancel={() => doneNavTarget && navigate?.(doneNavTarget)}
        onConfirm={handleSave}
        confirmLabel={pending ? 'Salvataggio…' : saveLabel}
        confirmDisabled={pending}
      />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// DASHBOARD / EMBED PAGE — KPI grid + iframe placeholder
// ──────────────────────────────────────────────────────────────────────

export interface DashboardPageProps {
  pageId?: string
  razorPath: string
  apiPath?: string
  title: string
  subtitle?: string
  kpis: KpiTile[]
  onBack?: () => void
}

export function DashboardPage({ pageId, razorPath, apiPath, title, subtitle, kpis, onBack }: DashboardPageProps) {
  return (
    <RazorScaffold pageId={pageId} razorPath={razorPath} apiPath={apiPath} title={title} subtitle={subtitle} onBack={onBack}>
      {() => (
        <>
          <div className="sib-stats-row">
            {kpis.map((k, i) => (
              <div className="sib-stat-card" key={i}>
                <div className="sib-stat-card__label">{k.label}</div>
                <div className={`sib-stat-card__value ${k.variant === 'success' ? 'sib-stat-card__value--success' : k.variant === 'error' ? 'sib-stat-card__value--error' : k.variant === 'warning' ? 'sib-stat-card__value--warning' : ''}`}>
                  {k.value}
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white border border-line rounded-field p-6 text-center text-ink-muted">
            <i className="fa-duotone fa-chart-line scaffold-chart-icon" aria-hidden="true" />
            <p className="mt-2 text-[13px]">Grafico interattivo collegato all'endpoint backend.</p>
          </div>
        </>
      )}
    </RazorScaffold>
  )
}

export interface EmbedPageProps {
  pageId?: string
  razorPath: string
  title: string
  subtitle?: string
  embedUrl?: string
  onBack?: () => void
}

export function EmbedPage({ razorPath, title, subtitle, embedUrl, onBack }: EmbedPageProps) {
  return (
    <div data-razor-source={razorPath}>
      {onBack && <BtnBack onClick={onBack} />}
      <PageHeader title={title} subtitle={subtitle} />
      <div className="bg-white border border-line rounded-field overflow-hidden scaffold-embed">
        {embedUrl ? (
          <iframe title={title} src={embedUrl} className="w-full h-full border-0" />
        ) : (
          <div className="h-full flex items-center justify-center text-ink-muted">
            <div className="text-center">
              <i className="fa-duotone fa-chart-line scaffold-chart-icon--lg" aria-hidden="true" />
              <p className="mt-2">Report embed pronto: collega l'URL del backend per visualizzarlo.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// StubPage retrocompatibile (alias di ListPage con dati generici)
// ──────────────────────────────────────────────────────────────────────

export function StubPage({
  pageId, razorPath, title, subtitle, apiPath, onBack,
}: {
  pageId?: string
  razorPath: string
  title: string
  subtitle?: string
  apiPath?: string
  onBack?: () => void
}) {
  const COLS: ScaffoldColumn[] = [
    { key: 'id', label: '#' },
    { key: 'descrizione', label: 'Descrizione' },
    { key: 'data', label: 'Data' },
    { key: 'importo', label: 'Importo' },
    { key: 'stato', label: 'Stato' },
  ]
  const MOCK = [
    { id: 1, descrizione: 'Voce di esempio 1', data: '15/04/2026', importo: '€ 1.250', stato: 'Attivo' },
    { id: 2, descrizione: 'Voce di esempio 2', data: '14/04/2026', importo: '€ 850',   stato: 'Attivo' },
    { id: 3, descrizione: 'Voce di esempio 3', data: '12/04/2026', importo: '€ 420',   stato: 'Bozza' },
  ]
  return (
    <ListPage
      pageId={pageId} razorPath={razorPath} apiPath={apiPath}
      title={title} subtitle={subtitle ?? `Portata da ${razorPath}`}
      columns={COLS} mock={MOCK} searchPlaceholder="Filtra…"
      onBack={onBack}
    />
  )
}
