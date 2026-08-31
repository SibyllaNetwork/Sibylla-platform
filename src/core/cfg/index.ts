// ─── KIT CONFIGURATORE (src/core/cfg) ────────────────────────────────────────
//  Componenti condivisi della sezione Configuratore, sul modello di
//  src/core/bi: un .tsx + un .sass per componente, esportati da qui.
//  I pane si costruiscono SOLO con questo kit + i componenti condivisi di
//  core/components (form, Tooltip, TruncatedText, Modal, Pagination, …).

export { default as CfgPane }       from './CfgPane'
export { default as CfgToolbar }    from './CfgToolbar'
export { default as CfgTable }      from './CfgTable'
export { default as CfgRangeRules, cfgRangeHasErrors } from './CfgRangeRules'
export { default as CfgSaveBar }    from './CfgSaveBar'
export { default as CfgLocked }     from './CfgLocked'
export { default as CfgOpzioneErrore } from './CfgOpzioneErrore'
export { default as CfgEmpty }      from './CfgEmpty'
export { default as CfgBadge }      from './CfgBadge'
export { cfgPrefersReducedMotion }  from './cfgMotion'

export type { CfgPaneProps }                                          from './CfgPane'
export type { CfgToolbarProps }                                       from './CfgToolbar'
export type { CfgTableProps, CfgColumn }                              from './CfgTable'
export type { CfgRangeRulesProps, CfgRangeRow, CfgRangeExtraColumn }  from './CfgRangeRules'
export type { CfgSaveBarProps }                                       from './CfgSaveBar'
export type { CfgLockedProps }                                        from './CfgLocked'
export type { CfgOpzioneErroreProps }                                 from './CfgOpzioneErrore'
export type { CfgEmptyProps }                                         from './CfgEmpty'
export type { CfgBadgeProps, CfgBadgeStatus }                         from './CfgBadge'
