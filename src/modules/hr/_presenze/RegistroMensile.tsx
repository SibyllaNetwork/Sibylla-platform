import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Tooltip from '../../../core/components/Tooltip'
import { InputField } from '../../../core/components/form'
import {
  chiaveGiorno, fmtExtra, fmtOre, giorniDelMese, GSETT, LEGENDA, MESI_LUNGHI, minToHHMM, oreDecimali, SIGLA, totaliMese,
  type CodiceGiorno, type GiornataRegistro, type GiornoMese, type GiornoRegistro,
} from './presenze.model'
import './RegistroMensile.sass'

/**
 * Presenze del mese, un riquadro per dipendente (Registro presenze › vista
 * dettagliata e Cedolini › vista dettagliata). Per ogni giorno: tipo di
 * giornata, ingresso, uscita e ore extra; sotto i totali del mese.
 *  - variante `registro`: tasto destro su un giorno per cambiarne il tipo,
 *    gestirne le timbrature o eliminarne l'assegnazione;
 *  - variante `cedolino`: sola lettura sulle presenze, si approva lo
 *    straordinario giorno per giorno (o tutto il mese) prima della busta paga.
 */

export interface DipendenteMese {
  id: number
  nome: string
  cognome: string
  reparto: string
  avatar?: string
}

export type AzioneGiorno = 'presente' | 'ferie' | 'rol' | 'permesso' | 'malattia' | 'assente' | 'timbrature' | 'modifica' | 'elimina'

interface Props {
  dipendenti: DipendenteMese[]
  anno: number
  /** Mese 0-based. */
  mese: number
  giornata: (dipId: number, iso: string) => GiornataRegistro
  repartoIcon: (reparto: string) => string
  variante?: 'registro' | 'cedolino'
  onAzione?: (dip: DipendenteMese, iso: string, azione: AzioneGiorno) => void
  /** Cedolino: minuti di straordinario approvati per giornata. */
  straordinarioApprovato?: Record<string, number>
  onApprovaStraordinario?: (dipId: number, iso: string, minuti: number | null) => void
  /** Azioni extra nell'intestazione del riquadro (es. export del dipendente). */
  azioniDipendente?: (dip: DipendenteMese) => React.ReactNode
  /** Contenuto a destra della legenda (es. il selettore di vista). */
  legendaExtra?: React.ReactNode
}

const MESI_BREVI = MESI_LUNGHI.map((m) => m.slice(0, 3).toLowerCase())

// Voci del menu contestuale: tipo di giornata assegnabile e codici che la rappresentano.
const VOCI: { azione: AzioneGiorno; label: string; codici: CodiceGiorno[]; dot: string; nota?: string }[] = [
  { azione: 'presente', label: 'Presente', codici: ['ORD', 'STR', 'O+P', 'ANO'], dot: 'ord' },
  { azione: 'ferie', label: 'Ferie', codici: ['FER'], dot: 'fer' },
  { azione: 'rol', label: 'ROL', codici: ['ROL'], dot: 'rol', nota: 'a ore' },
  { azione: 'permesso', label: 'Permesso', codici: ['PER'], dot: 'per', nota: 'a ore' },
  { azione: 'malattia', label: 'Malattia', codici: ['MAL'], dot: 'mal', nota: 'con codice PUC' },
  { azione: 'assente', label: 'Assente', codici: ['ASS'], dot: 'ass', nota: 'nessuna giustifica' },
]

interface Menu { dip: DipendenteMese; giorno: GiornoMese; x: number; y: number }
interface MenuStr { dip: DipendenteMese; giorno: GiornoMese; x: number; y: number; valore: string }

const chipClass = (c: CodiceGiorno) => `rpm__chip--${c === 'O+P' ? 'op' : c.toLowerCase()}`

export default function RegistroMensile({
  dipendenti, anno, mese, giornata, repartoIcon, variante = 'registro', onAzione,
  straordinarioApprovato = {}, onApprovaStraordinario, azioniDipendente, legendaExtra,
}: Props) {
  const cedolino = variante === 'cedolino'
  const [menu, setMenu] = useState<Menu | null>(null)
  const [menuStr, setMenuStr] = useState<MenuStr | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const aperto = menu ?? menuStr

  // Il menu si chiude con un clic fuori, con Esc e quando la pagina scorre.
  useEffect(() => {
    if (!aperto) return
    const chiudi = (e: Event) => { if (!menuRef.current?.contains(e.target as Node)) { setMenu(null); setMenuStr(null) } }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenu(null); setMenuStr(null) } }
    const scroll = (e: Event) => { if (!menuRef.current?.contains(e.target as Node)) { setMenu(null); setMenuStr(null) } }
    document.addEventListener('mousedown', chiudi)
    document.addEventListener('keydown', esc)
    window.addEventListener('scroll', scroll, true)
    return () => {
      document.removeEventListener('mousedown', chiudi)
      document.removeEventListener('keydown', esc)
      window.removeEventListener('scroll', scroll, true)
    }
  }, [aperto])

  // Il menu resta dentro la finestra anche cliccando sugli ultimi giorni o in fondo alla pagina.
  useLayoutEffect(() => {
    if (!aperto || !menuRef.current) { setPos(null); return }
    const r = menuRef.current.getBoundingClientRect()
    const M = 8
    setPos({
      x: Math.max(M, Math.min(aperto.x, window.innerWidth - r.width - M)),
      y: aperto.y + r.height > window.innerHeight - M ? Math.max(M, aperto.y - r.height) : aperto.y,
    })
  }, [aperto])

  function apriMenu(e: React.MouseEvent, dip: DipendenteMese, giorno: GiornoMese) {
    if (cedolino || !onAzione) return
    e.preventDefault()
    setMenuStr(null)
    setMenu({ dip, giorno, x: e.clientX, y: e.clientY })
  }

  function apriStraordinario(e: React.MouseEvent, dip: DipendenteMese, giorno: GiornoMese) {
    if (!onApprovaStraordinario || (giorno.g.codice !== 'STR' && straordinarioApprovato[chiaveGiorno(dip.id, giorno.iso)] == null)) return
    e.preventDefault()
    const att = straordinarioApprovato[chiaveGiorno(dip.id, giorno.iso)]
    setMenu(null)
    setMenuStr({ dip, giorno, x: e.clientX, y: e.clientY, valore: String(att ?? giorno.g.straordinari) })
  }

  function esegui(azione: AzioneGiorno) {
    if (!menu || !onAzione) return
    const { dip, giorno } = menu
    setMenu(null)
    onAzione(dip, giorno.iso, azione)
  }

  function salvaStraordinario(minuti: number | null) {
    if (!menuStr || !onApprovaStraordinario) return
    onApprovaStraordinario(menuStr.dip.id, menuStr.giorno.iso, minuti)
    setMenuStr(null)
  }

  const dataDi = (iso: string) => { const [, m, g] = iso.split('-').map(Number); return `${g} ${MESI_BREVI[m - 1]} ${anno}` }

  return (
    <div className="rpm">
      <div className="rpm__legend" aria-label="Legenda">
        {LEGENDA.map((v) => (
          v.codice === 'ANO' ? (
            <Tooltip key={v.codice} text={v.label}>
              <span className="rpm__leg"><span className={`rpm__leg-dot ${chipClass(v.codice)}`} aria-hidden="true" />Anomalia</span>
            </Tooltip>
          ) : (
            <span key={v.codice} className="rpm__leg">
              <span className={`rpm__leg-dot ${chipClass(v.codice)}`} aria-hidden="true" />
              {v.label}
            </span>
          )
        ))}
        <span className="rpm__legend-end">
          {!cedolino && <span className="rpm__leg"><i className="fa-solid fa-pen" aria-hidden="true" />Modificato dall'HR</span>}
          {legendaExtra}
        </span>
      </div>

      {dipendenti.map((dip) => {
        const giorni = giorniDelMese(anno, mese, (iso) => giornata(dip.id, iso))
        const t = totaliMese(giorni)
        const extraTot = giorni.reduce((s, x) => s + x.g.straordinari, 0)
        const apprTot = giorni.reduce((s, x) => s + (straordinarioApprovato[chiaveGiorno(dip.id, x.iso)] ?? 0), 0)
        // Si approva lo straordinario vero (oltre la soglia): i pochi minuti oltre l'orario restano ore extra.
        const daApprovare = giorni.filter((x) => x.g.codice === 'STR' && straordinarioApprovato[chiaveGiorno(dip.id, x.iso)] == null)
        return (
          <section key={dip.id} className="rpm__card">
            <header className="rpm__head">
              {dip.avatar
                ? <img src={dip.avatar} alt="" className="rpm__avatar" />
                : <span className="rpm__avatar rpm__avatar--ini">{dip.nome[0]}{dip.cognome[0]}</span>}
              <span className="rpm__nome">{dip.nome} {dip.cognome}</span>
              <span className="rpm__reparto"><i className={`fa-solid ${repartoIcon(dip.reparto)}`} aria-hidden="true" />{dip.reparto}</span>
              <span className="rpm__head-actions">
                {cedolino && onApprovaStraordinario && daApprovare.length > 0 && (
                  <button type="button" className="sib-btn sib-btn--ghost rpm__approva"
                    onClick={() => daApprovare.forEach((x) => onApprovaStraordinario(dip.id, x.iso, x.g.straordinari))}>
                    <i className="fa-solid fa-check-double" aria-hidden="true" />Approva straordinario del mese ({fmtExtra(daApprovare.reduce((s, x) => s + x.g.straordinari, 0))})
                  </button>
                )}
                {azioniDipendente?.(dip)}
              </span>
            </header>

            <table className="rpm__grid">
              <colgroup>
                <col className="rpm__c-label" />
                {giorni.map((g) => <col key={g.iso} />)}
                <col className="rpm__c-tot" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="row">Giorno</th>
                  {giorni.map((g) => (
                    <th key={g.iso} className={cls(g)}>
                      {g.festivita ? <Tooltip text={g.festivita}><span className="rpm__fest">{g.n}</span></Tooltip> : g.n}
                    </th>
                  ))}
                  <th className="rpm__tot-col">Totale</th>
                </tr>
                <tr className="rpm__r-gsett">
                  <th scope="row">G. sett.</th>
                  {giorni.map((g) => <th key={g.iso} className={cls(g)}>{GSETT[g.dow]}</th>)}
                  <th className="rpm__tot-col" />
                </tr>
              </thead>
              <tbody>
                {(['tipo', 'ingresso', 'uscita', 'extra'] as const).map((riga) => (
                  <tr key={riga} className={`rpm__r-${riga}`}>
                    <th scope="row" className={riga === 'extra' ? 'rpm__lbl-extra' : undefined}>
                      {riga === 'tipo' ? 'Tipo' : riga === 'ingresso' ? 'Ingresso' : riga === 'uscita' ? 'Uscita' : 'Ore extra'}
                    </th>
                    {giorni.map((x) => {
                      const { g } = x
                      const on = menu?.dip.id === dip.id && menu.giorno.iso === x.iso
                      return (
                        <td key={x.iso}
                          className={`${cls(x)}${on ? ' rpm__cell--on' : ''}${cedolino ? ' rpm__cell--ro' : ''}`}
                          onContextMenu={(e) => apriMenu(e, dip, x)}
                          onDoubleClick={() => !cedolino && onAzione?.(dip, x.iso, 'timbrature')}>
                          {riga === 'tipo' && g.codice !== 'VUO' && (
                            <Tooltip content={<CellaTooltip g={g} modificato={x.modificato} festivita={x.festivita} />}>
                              <span className={`rpm__chip rpm__chip--sm ${chipClass(g.codice)}`}>
                                {SIGLA[g.codice]}
                                {x.modificato && !cedolino && <i className="fa-solid fa-pen rpm__mod" aria-label="modificato dall'ufficio del personale" />}
                              </span>
                            </Tooltip>
                          )}
                          {riga === 'ingresso' && g.ingresso != null && <span className="rpm__in">{minToHHMM(g.ingresso)}</span>}
                          {riga === 'uscita' && g.uscita != null && <span className="rpm__out">{minToHHMM(g.uscita)}</span>}
                          {riga === 'extra' && g.straordinari > 0 && <span className="rpm__extra">{fmtExtra(g.straordinari)}</span>}
                        </td>
                      )
                    })}
                    <td className="rpm__tot-col">
                      {riga === 'extra' && extraTot > 0 && <span className="rpm__extra">{fmtExtra(extraTot)}</span>}
                    </td>
                  </tr>
                ))}
                {cedolino && (
                  <tr className="rpm__r-appr">
                    <th scope="row" className="rpm__lbl-extra"><Tooltip text="Straordinario approvato"><span>Str. approvato</span></Tooltip></th>
                    {giorni.map((x) => {
                      const k = chiaveGiorno(dip.id, x.iso)
                      const appr = straordinarioApprovato[k]
                      const attivo = x.g.codice === 'STR' || appr != null
                      const on = menuStr?.dip.id === dip.id && menuStr.giorno.iso === x.iso
                      return (
                        <td key={x.iso} className={`${cls(x)}${attivo ? ' rpm__cell--appr' : ''}${on ? ' rpm__cell--on' : ''}`}
                          onClick={(e) => apriStraordinario(e, dip, x)}>
                          {appr != null
                            ? <span className="rpm__appr">{fmtExtra(appr)}</span>
                            : x.g.codice === 'STR' && <Tooltip text="Straordinario da approvare: clic per decidere"><span className="rpm__appr-da" aria-label="Da approvare" /></Tooltip>}
                        </td>
                      )
                    })}
                    <td className="rpm__tot-col">{apprTot > 0 && <span className="rpm__appr">{fmtExtra(apprTot)}</span>}</td>
                  </tr>
                )}
              </tbody>
            </table>

            <footer className="rpm__foot">
              <div className="rpm__tot">
                <span><b className="rpm__tot-ord">{oreDecimali(t.ordinari)}</b> Ordinarie</span>
                {t.straordinari > 0 && <span><b className="rpm__tot-str">{fmtExtra(t.straordinari)}</b> Ore extra</span>}
                {cedolino && apprTot > 0 && <span><b className="rpm__tot-str">{fmtExtra(apprTot)}</b> Straordinario approvato</span>}
                {t.ferie > 0 && <span><b className="rpm__tot-fer">{t.ferie} gg</b> Ferie</span>}
                {t.rol > 0 && <span><b className="rpm__tot-rol">{oreDecimali(t.rol)}</b> ROL</span>}
                {t.permessi > 0 && <span><b className="rpm__tot-per">{oreDecimali(t.permessi)}</b> Permessi</span>}
                {t.malattia > 0 && <span><b className="rpm__tot-mal">{t.malattia} gg</b> Malattia</span>}
                {t.assenze > 0 && <span><b className="rpm__tot-ass">{t.assenze} gg</b> Assenze</span>}
                {t.anomalie > 0 && <span><b className="rpm__tot-ano">{t.anomalie}</b> {t.anomalie === 1 ? 'Timbratura anomala' : 'Timbrature anomale'}</span>}
                {!cedolino && t.modificati > 0 && <span className="rpm__tot-mod"><i className="fa-solid fa-pen" aria-hidden="true" /> {t.modificati} {t.modificati === 1 ? 'giorno modificato' : 'giorni modificati'}</span>}
              </div>
              <span className="rpm__hint">
                {cedolino ? 'Clic su una cella di Straord. approvato per approvarlo o correggerlo' : 'Tasto destro su un giorno per modificarlo · doppio clic per le timbrature'}
              </span>
            </footer>
          </section>
        )
      })}

      {dipendenti.length === 0 && <div className="rpm__empty">Nessun dipendente per i filtri selezionati.</div>}

      {menu && (
        <div ref={menuRef} role="menu" className={`rpm__menu${pos ? ' rpm__menu--ready' : ''}`}
          style={{ '--mx': `${(pos ?? menu).x}px`, '--my': `${(pos ?? menu).y}px` } as React.CSSProperties}>
          <div className="rpm__menu-title">{menu.dip.nome} {menu.dip.cognome} · {dataDi(menu.giorno.iso)}</div>
          <div className="rpm__menu-group">
            {VOCI.map((v) => {
              const g = menu.giorno.g
              const attivo = v.codici.includes(g.codice)
              const nota = v.azione === 'presente'
                ? (attivo && g.ingresso != null && g.uscita != null ? `${minToHHMM(g.ingresso)} – ${minToHHMM(g.uscita)}` : '09:00 – 18:00')
                : v.nota
              return (
                <button key={v.azione} type="button" role="menuitem" className={`rpm__menu-item${attivo ? ' rpm__menu-item--on' : ''}`} onClick={() => esegui(v.azione)}>
                  <span className={`rpm__dot rpm__dot--${v.dot}`} aria-hidden="true" />
                  <span className="rpm__menu-label">{v.label}</span>
                  {nota && <span className="rpm__menu-note">{nota}</span>}
                  {attivo && <i className="fa-solid fa-check rpm__menu-check" aria-hidden="true" />}
                </button>
              )
            })}
          </div>
          <div className="rpm__menu-group">
            <button type="button" role="menuitem" className="rpm__menu-item rpm__menu-item--act" onClick={() => esegui('timbrature')}>
              <i className="fa-regular fa-clock" aria-hidden="true" /><span className="rpm__menu-label">Gestisci timbrature del giorno</span>
            </button>
            <button type="button" role="menuitem" className="rpm__menu-item rpm__menu-item--act" onClick={() => esegui('modifica')}>
              <i className="fa-regular fa-pen-to-square" aria-hidden="true" /><span className="rpm__menu-label">Modifica presenza…</span>
            </button>
          </div>
          <div className="rpm__menu-group">
            <button type="button" role="menuitem" className="rpm__menu-item rpm__menu-item--danger" onClick={() => esegui('elimina')} disabled={menu.giorno.g.codice === 'VUO'}>
              <i className="fa-regular fa-trash" aria-hidden="true" /><span className="rpm__menu-label">Elimina assegnazione</span>
            </button>
          </div>
        </div>
      )}

      {menuStr && (
        <div ref={menuRef} role="dialog" aria-label="Straordinario approvato" className={`rpm__menu rpm__menu--str${pos ? ' rpm__menu--ready' : ''}`}
          style={{ '--mx': `${(pos ?? menuStr).x}px`, '--my': `${(pos ?? menuStr).y}px` } as React.CSSProperties}>
          <div className="rpm__menu-title">{menuStr.dip.nome} {menuStr.dip.cognome} · {dataDi(menuStr.giorno.iso)}</div>
          <div className="rpm__str">
            <p className="rpm__str-info">Ore extra timbrate: <b>{fmtExtra(menuStr.giorno.g.straordinari)}</b></p>
            <InputField name="str-min" label="Straordinario approvato (minuti)" type="number" value={menuStr.valore}
              onChange={(e) => setMenuStr((m) => (m ? { ...m, valore: e.target.value } : m))} />
            <div className="rpm__str-actions">
              {straordinarioApprovato[chiaveGiorno(menuStr.dip.id, menuStr.giorno.iso)] != null && (
                <button type="button" className="sib-btn sib-btn--ghost" onClick={() => salvaStraordinario(null)}>Rimuovi</button>
              )}
              <button type="button" className="sib-btn sib-btn--primary"
                disabled={!(Number(menuStr.valore) >= 0) || menuStr.valore === ''}
                onClick={() => salvaStraordinario(Math.round(Number(menuStr.valore)))}>Approva</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function cls(g: GiornoMese) {
  return [g.festivo || g.dow === 6 ? 'rpm__we' : '', g.oggi ? 'rpm__oggi' : ''].filter(Boolean).join(' ')
}

function CellaTooltip({ g, modificato, festivita }: { g: GiornoRegistro; modificato: boolean; festivita: string | null }) {
  return (
    <span className="rpm__tip">
      <span className="rpm__tip-t">{g.descrizione}</span>
      {festivita && <span>{festivita}</span>}
      {g.ingresso != null && g.uscita != null && (
        <span>{minToHHMM(g.ingresso)} – {minToHHMM(g.uscita)} · {fmtOre(g.lavorati)} lavorate</span>
      )}
      {modificato && <span className="rpm__tip-mod">Modificato dall'ufficio del personale</span>}
    </span>
  )
}
