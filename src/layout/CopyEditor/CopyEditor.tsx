import { useAccessStore } from '../../store/useAccessStore'
import {
  useCopyStore, resolveCopy, serializeForCommit, copyKeys, draftCount,
  SUPPORTED_LANGS, SOURCE_LANG, type Lang,
} from '../../store/useCopyStore'
import { useCurrentClientKey } from '../../core/i18n/copy'
import { useConfirmStore } from '../../store/useConfirmStore'
import { SelectField, TextareaField } from '../../core/components/form'
import './CopyEditor.sass'

// ─────────────────────────────────────────────────────────────────────────────
//  Editor testi nel clone (sessione di assistenza).
//  • Selettore lingua di destinazione → il clone si mostra in quella lingua.
//  • Modifica testi → pannello con IT sorgente + traduzione editabile per chiave.
//  • Le modifiche sono BOZZE (localStorage). "Esporta per il deploy" produce il
//    copy.json aggiornato da committare (pubblicazione = commit + deploy).
//  Visibile solo quando è attiva una sessione di assistenza.
// ─────────────────────────────────────────────────────────────────────────────

export default function CopyEditor() {
  const assist = useAccessStore((s) => s.assist)
  const clientKey = useCurrentClientKey()
  const lang = useCopyStore((s) => s.lang)
  const setLang = useCopyStore((s) => s.setLang)
  const editMode = useCopyStore((s) => s.editMode)
  const setEditMode = useCopyStore((s) => s.setEditMode)
  const overrides = useCopyStore((s) => s.overrides)
  const setEntry = useCopyStore((s) => s.setEntry)
  const resetEntry = useCopyStore((s) => s.resetEntry)
  const clearDrafts = useCopyStore((s) => s.clearDrafts)
  const confirm = useConfirmStore((s) => s.confirm)

  // Solo in sessione di assistenza.
  if (!assist) return null

  const keys = copyKeys()
  const nDraft = draftCount(overrides, clientKey)
  const hasDraft = (key: string) => overrides[clientKey]?.[lang]?.[key] !== undefined

  const esporta = () => {
    const json = serializeForCommit(overrides)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'copy.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const scarta = async () => {
    if (await confirm({
      title: 'Scarta bozze',
      message: `Scartare le ${nDraft} modifiche non esportate di ${assist.nome}?`,
      confirmLabel: 'Scarta', danger: true,
    })) clearDrafts(clientKey)
  }

  return (
    <div className={'copy-editor' + (editMode ? ' copy-editor--open' : '')}>
      <div className="copy-editor__bar">
        <span className="copy-editor__title">
          <i className="fa-light fa-language" /> Testi — {assist.nome}
        </span>

        <div className="copy-editor__lang">
          <SelectField
            name="copy-lang" label="Lingua"
            value={lang} onChange={(e) => setLang(e.target.value as Lang)}
            options={SUPPORTED_LANGS.map((l) => ({ value: l.id, label: `${l.flag} ${l.label}` }))}
          />
        </div>

        <button type="button" className={'sib-btn ' + (editMode ? 'sib-btn--primary' : 'sib-btn--secondary')}
          onClick={() => setEditMode(!editMode)}>
          <i className="fa-light fa-pen-to-square" /> {editMode ? 'Chiudi modifica' : 'Modifica testi'}
        </button>

        {nDraft > 0 && <span className="copy-editor__badge">{nDraft} bozze</span>}

        <div className="copy-editor__spacer" />

        <button type="button" className="sib-btn sib-btn--secondary" onClick={scarta} disabled={nDraft === 0}>
          <i className="fa-light fa-rotate-left" /> Scarta bozze
        </button>
        <button type="button" className="sib-btn sib-btn--primary" onClick={esporta}>
          <i className="fa-light fa-file-export" /> Esporta per il deploy
        </button>
      </div>

      {editMode && (
        <div className="copy-editor__panel">
          <p className="copy-editor__hint">
            Modifica il testo nella lingua selezionata ({SUPPORTED_LANGS.find((l) => l.id === lang)?.label}).
            Le modifiche sono bozze locali finché non esporti <em>copy.json</em> e non lo deployi.
          </p>
          {keys.length === 0 ? (
            <div className="sib-empty-state">Nessun testo migrato al sistema editabile.</div>
          ) : keys.map((key) => {
            const source = resolveCopy(overrides, clientKey, SOURCE_LANG, key)
            const current = resolveCopy(overrides, clientKey, lang, key)
            return (
              <div key={key} className="copy-editor__row">
                <div className="copy-editor__key">
                  {key}
                  {hasDraft(key) && <span className="copy-editor__dot" title="Modifica non esportata" />}
                </div>
                {lang !== SOURCE_LANG && (
                  <div className="copy-editor__source">
                    <span className="copy-editor__source-lbl">IT</span> {source}
                  </div>
                )}
                <div className="copy-editor__field">
                  <TextareaField
                    name={`copy-${key}`} label="" rows={2}
                    value={current}
                    onChange={(e) => setEntry(clientKey, lang, key, e.target.value)}
                  />
                  {hasDraft(key) && (
                    <button type="button" className="sib-btn sib-btn--icon" title="Ripristina dal repo"
                      onClick={() => resetEntry(clientKey, lang, key)}>
                      <i className="fa-light fa-rotate-left" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
