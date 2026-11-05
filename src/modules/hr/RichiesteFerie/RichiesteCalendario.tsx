import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Tooltip from '../../../core/components/Tooltip'
import {
  DIPENDENTI_HR, fmtDataHr, type RichiestaAssenza, type StatoRichiesta, type TipoAssenza,
} from '../../../store/useHrGestioneStore'
import { dataDa, festivitaNazionale, GSETT, isoDi, MESI_LUNGHI, repartoIcon } from '../_presenze/presenze.model'
import './RichiesteCalendario.sass'

/**
 * Richieste — vista calendario. Una riga per dipendente, i giorni del mese in
 * colonna: ogni richiesta è una barra sui suoi giorni, colorata per tipo
 * (ferie, ROL, permesso, malattia) e disegnata secondo lo stato (piena se
 * approvata, tratteggiata se in attesa dell'HR o del responsabile, barrata se
 * rifiutata). Clic sulla barra: si apre il dettaglio con tutte le azioni.
 * Trascinando una richiesta la si sposta su altri giorni (o su un altro
 * dipendente); tasto destro su una richiesta: modifica; tasto destro su una
 * casella vuota: nuova richiesta in quel giorno.
 */

export type AzioneRichiesta = 'dettaglio' | 'modifica' | 'approva' | 'rifiuta' | 'sollecita' | 'elimina'

/** Opzioni per usare il calendario dentro un piano ferie. */
export interface CalendarioOpzioni {
  /** Periodo navigabile (es. un piano ferie): solo i suoi mesi, i giorni fuori sono velati. */
  limiti?: { dal: string; al: string }
  /** Avviso accanto al nome del dipendente (es. regole del piano non rispettate). */
  segnalaDipendente?: (dipId: number) => { testo: string; livello: 'warn' | 'ko' } | null
  /** Avviso sul giorno (es. reparti sotto la presenza minima). */
  allertaGiorno?: (iso: string) => string | null
  /** Colonna finale per dipendente (es. ferie residue). */
  colonnaFinale?: { titolo: string; tooltip?: string; valore: (dipId: number, anno: number) => React.ReactNode }
}

interface Props extends CalendarioOpzioni {
  /** Richieste già filtrate dalla pagina (stato, reparto, filtri di colonna). */
  richieste: RichiestaAssenza[]
  reparto: string
  onApri: (r: RichiestaAssenza) => void
  /** Tasto destro: nuova richiesta del dipendente in quel giorno. */
  onNuova?: (dipendenteId: number, iso: string, tipo: TipoAssenza) => void
  /** Tasto destro su una richiesta: azione (la pagina apre la modifica). */
  onAzione?: (r: RichiestaAssenza, azione: AzioneRichiesta) => void
  /** Richiesta trascinata e rilasciata su altri giorni o su un altro dipendente. */
  onSposta?: (r: RichiestaAssenza, dipendenteId: number, dal: string, al: string) => void
  /** Strumenti a destra della barra del mese (es. selettore di vista). */
  azioni?: React.ReactNode
}

const SIGLA: Record<TipoAssenza, string> = { Ferie: 'FER', ROL: 'ROL', Permesso: 'PER', Malattia: 'MAL' }
const TIPO_ICO: Record<TipoAssenza, string> = { Ferie: 'fa-umbrella-beach', Permesso: 'fa-clock', ROL: 'fa-hourglass-half', Malattia: 'fa-notes-medical' }
const STATO_CLS = (s: StatoRichiesta) => (s === 'Approvata' ? 'ok' : s === 'Rifiutata' ? 'ko' : 'attesa')
const STATO_LBL = (s: StatoRichiesta) => (s === 'Al responsabile' ? 'Al responsabile di reparto' : s)

interface Segmento { r: RichiestaAssenza; da: number; span: number }

interface Menu { x: number; y: number; dipId: number; iso: string }
interface Drop { r: RichiestaAssenza; dipId: number; dal: string; al: string }
interface Drag { r: RichiestaAssenza; offset: number; x0: number; y0: number; moving: boolean; cols: { iso: string; left: number; right: number }[] }

const addG = (iso: string, n: number) => { const d = dataDa(iso); d.setDate(d.getDate() + n); return isoDi(d) }
const diffG = (a: string, b: string) => Math.round((dataDa(b).getTime() - dataDa(a).getTime()) / 86_400_000)

const meseDi = (iso: string) => ({ anno: Number(iso.slice(0, 4)), mese: Number(iso.slice(5, 7)) - 1 })

export default function RichiesteCalendario({
  richieste, reparto, onApri, onNuova, onAzione, onSposta, azioni, limiti, segnalaDipendente, allertaGiorno, colonnaFinale,
}: Props) {
  const [menu, setMenu] = useState<Menu | null>(null)
  const gridRef = useRef<HTMLTableElement>(null)
  const dragRef = useRef<Drag | null>(null)
  const dropRef = useRef<Drop | null>(null)
  const [drop, setDropState] = useState<Drop | null>(null)
  const setDrop = (d: Drop | null) => { dropRef.current = d; setDropState(d) }

  // Trascinamento: sotto i 5 px è un clic (apre il dettaglio), oltre sposta la richiesta.
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      if (!d.moving && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 5) return
      d.moving = true
      if (!d.cols.length) return
      const col = d.cols.find((c) => e.clientX >= c.left && e.clientX < c.right) ?? (e.clientX < d.cols[0].left ? d.cols[0] : d.cols[d.cols.length - 1])
      const tr = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest('tr[data-dip]') as HTMLElement | null
      const dipId = tr ? Number(tr.dataset.dip) : dropRef.current?.dipId ?? d.r.dipendenteId
      const dal = addG(col.iso, -d.offset)
      const prev = dropRef.current
      if (prev && prev.dipId === dipId && prev.dal === dal) return
      setDrop({ r: d.r, dipId, dal, al: addG(dal, diffG(d.r.dal, d.r.al)) })
    }
    const up = () => {
      const d = dragRef.current
      dragRef.current = null
      if (!d) return
      document.body.classList.remove('rfc-dragging')
      if (!d.moving) { onApri(d.r); return }
      const cur = dropRef.current
      setDrop(null)
      if (cur && onSposta && (cur.dal !== d.r.dal || cur.dipId !== d.r.dipendenteId)) onSposta(cur.r, cur.dipId, cur.dal, cur.al)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  }, [onApri, onSposta])
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!menu) return
    const fuori = (e: Event) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(null) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null) }
    document.addEventListener('mousedown', fuori)
    document.addEventListener('keydown', esc)
    window.addEventListener('scroll', fuori, true)
    return () => { document.removeEventListener('mousedown', fuori); document.removeEventListener('keydown', esc); window.removeEventListener('scroll', fuori, true) }
  }, [menu])
  useLayoutEffect(() => {
    if (!menu || !menuRef.current) { setPos(null); return }
    const b = menuRef.current.getBoundingClientRect()
    setPos({
      x: Math.max(8, Math.min(menu.x, window.innerWidth - b.width - 8)),
      y: menu.y + b.height > window.innerHeight - 8 ? Math.max(8, menu.y - b.height) : menu.y,
    })
  }, [menu])

  const oggi = new Date()
  /** Mese iniziale: quello di oggi, oppure il primo del periodo se oggi ne è fuori. */
  const meseIniziale = () => {
    const ora = { anno: oggi.getFullYear(), mese: oggi.getMonth() }
    if (!limiti) return ora
    const k = (x: { anno: number; mese: number }) => x.anno * 12 + x.mese
    const a = meseDi(limiti.dal), b = meseDi(limiti.al)
    return k(ora) >= k(a) && k(ora) <= k(b) ? ora : a
  }
  const [rif, setRif] = useState(meseIniziale)
  // Cambiando periodo (altro piano) si riparte dal suo mese.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setRif(meseIniziale()) }, [limiti?.dal, limiti?.al])
  const { anno, mese } = rif
  const n = new Date(anno, mese + 1, 0).getDate()
  const oggiIso = isoDi(oggi)
  const giorni = Array.from({ length: n }, (_, i) => {
    const d = new Date(anno, mese, i + 1)
    const fest = festivitaNazionale(d)
    const iso = isoDi(d)
    return { iso, n: i + 1, dow: d.getDay(), fest, we: d.getDay() === 0 || d.getDay() === 6 || !!fest, fuori: !!limiti && (iso < limiti.dal || iso > limiti.al) }
  })
  const primo = giorni[0].iso
  const ultimo = giorni[n - 1].iso

  const kMese = anno * 12 + mese
  const puoPrima = !limiti || kMese > meseDi(limiti.dal).anno * 12 + meseDi(limiti.dal).mese
  const puoDopo = !limiti || kMese < meseDi(limiti.al).anno * 12 + meseDi(limiti.al).mese
  const sposta = (delta: number) => setRif(({ anno: a, mese: m }) => { const d = new Date(a, m + delta, 1); return { anno: d.getFullYear(), mese: d.getMonth() } })

  // Per dipendente, le richieste del mese in corsie che non si sovrappongono.
  const righe = useMemo(() => {
    const delMese = richieste.filter((r) => r.al >= primo && r.dal <= ultimo)
    return DIPENDENTI_HR
      .filter((d) => !reparto || d.reparto === reparto)
      .map((d) => {
        const sue = delMese.filter((r) => r.dipendenteId === d.id).sort((a, b) => a.dal.localeCompare(b.dal))
        const corsie: Segmento[][] = []
        sue.forEach((r) => {
          const da = Math.max(1, r.dal < primo ? 1 : Number(r.dal.slice(8)))
          const a = r.al > ultimo ? n : Number(r.al.slice(8))
          const seg = { r, da, span: a - da + 1 }
          const libera = corsie.find((c) => c.every((x) => x.da + x.span - 1 < da || a < x.da))
          if (libera) libera.push(seg)
          else corsie.push([seg])
        })
        return { d, corsie: corsie.length ? corsie : [[]], conteggio: sue.length }
      })
  }, [richieste, reparto, primo, ultimo, n])

  const totale = righe.reduce((s, x) => s + x.conteggio, 0)

  const apriMenu = (e: React.MouseEvent, dipId: number, iso: string) => {
    if (!onNuova) return
    e.preventDefault()
    setMenu({ x: e.clientX, y: e.clientY, dipId, iso })
  }
  /** Giorno sotto il puntatore in una barra che copre più giorni. */
  const giornoInBarra = (e: React.MouseEvent, s: Segmento) => {
    const b = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const i = Math.min(s.span - 1, Math.max(0, Math.floor(((e.clientX - b.left) / b.width) * s.span)))
    return giorni[s.da - 1 + i].iso
  }
  const iniziaDrag = (e: React.PointerEvent, s: Segmento) => {
    if (e.button !== 0) return
    const cols = onSposta && gridRef.current
      ? Array.from(gridRef.current.querySelectorAll<HTMLElement>('thead tr:first-child th[data-iso]')).map((th) => {
          const b = th.getBoundingClientRect()
          return { iso: th.dataset.iso as string, left: b.left, right: b.right }
        })
      : []
    dragRef.current = { r: s.r, offset: diffG(s.r.dal, giornoInBarra(e, s)), x0: e.clientX, y0: e.clientY, moving: false, cols }
    if (onSposta) document.body.classList.add('rfc-dragging')
  }
  const inDrop = (dipId: number, iso: string) => !!drop && drop.dipId === dipId && iso >= drop.dal && iso <= drop.al
  const vuota = (dipId: number, g: number) => (
    <td key={`${dipId}-${g}`} className={[
      cls(giorni[g - 1], oggiIso),
      menu?.dipId === dipId && menu.iso === giorni[g - 1].iso ? 'rfc__cell--on' : '',
      inDrop(dipId, giorni[g - 1].iso) ? 'rfc__cell--drop' : '',
    ].filter(Boolean).join(' ') || undefined}
      onContextMenu={(e) => apriMenu(e, dipId, giorni[g - 1].iso)} />
  )

  /** Celle di una corsia: barre per le richieste, celle vuote per gli altri giorni. */
  function celle(corsia: Segmento[], dipId: number) {
    const out: React.ReactNode[] = []
    let g = 1
    const ordinati = [...corsia].sort((a, b) => a.da - b.da)
    ordinati.forEach((s) => {
      for (; g < s.da; g++) out.push(vuota(dipId, g))
      const r = s.r
      const continuaPrima = r.dal < primo
      const continuaDopo = r.al > ultimo
      out.push(
        <td key={`${dipId}-${r.id}`} colSpan={s.span}
          className={`rfc__bar-cell${drop && drop.dipId === dipId && r.al >= drop.dal && r.dal <= drop.al ? ' rfc__cell--drop' : ''}`}
          onContextMenu={(e) => { e.preventDefault(); onAzione?.(r, 'modifica') }}>
          <Tooltip content={
            <span className="rfc__tip">
              <span className="rfc__tip-t">{r.tipo} · {STATO_LBL(r.stato)}</span>
              <span>{r.dal === r.al ? fmtDataHr(r.dal) : `dal ${fmtDataHr(r.dal)} al ${fmtDataHr(r.al)}`}{r.ore ? ` · ${r.ore} h` : ''}</span>
              {r.note && <span>{r.note}</span>}
              <span className="rfc__tip-hint">Clic: dettaglio e azioni · trascina: sposta · tasto destro: modifica</span>
            </span>
          }>
            <button type="button"
              className={`rfc__bar rfc__bar--${r.tipo.toLowerCase()}${s.span === 1 ? ' rfc__bar--uno' : ''} rfc__bar--${STATO_CLS(r.stato)}${continuaPrima ? ' rfc__bar--prima' : ''}${continuaDopo ? ' rfc__bar--dopo' : ''}${drop?.r.id === r.id ? ' rfc__bar--drag' : ''}${onSposta ? ' rfc__bar--mobile' : ''}`}
              onPointerDown={(e) => iniziaDrag(e, s)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onApri(r) } }}
              aria-label={`${r.tipo} ${STATO_LBL(r.stato)} dal ${fmtDataHr(r.dal)} al ${fmtDataHr(r.al)}`}>
              <i className={`fa-solid ${TIPO_ICO[r.tipo]}`} aria-hidden="true" />
              {s.span > 1 && <span className="rfc__bar-txt">{s.span >= 3 ? r.tipo : SIGLA[r.tipo]}</span>}
              {s.span >= 4 && r.stato !== 'Approvata' && <span className="rfc__bar-stato">{r.stato === 'Al responsabile' ? 'al resp.' : r.stato === 'Da approvare' ? 'da approvare' : 'rifiutata'}</span>}
            </button>
          </Tooltip>
        </td>,
      )
      g = s.da + s.span
    })
    for (; g <= n; g++) out.push(vuota(dipId, g))
    return out
  }

  return (
    <div className="rfc">
      <div className="rfc__bar-top">
        <div className="rfc__nav">
          <Tooltip text="Mese precedente">
            <button type="button" className="sib-btn sib-btn--icon rfc__nav-btn" onClick={() => sposta(-1)} disabled={!puoPrima} aria-label="Mese precedente"><i className="fa-solid fa-chevron-left" /></button>
          </Tooltip>
          <span className="rfc__mese">{MESI_LUNGHI[mese]} {anno}</span>
          <Tooltip text="Mese successivo">
            <button type="button" className="sib-btn sib-btn--icon rfc__nav-btn" onClick={() => sposta(1)} disabled={!puoDopo} aria-label="Mese successivo"><i className="fa-solid fa-chevron-right" /></button>
          </Tooltip>
          {!limiti && <button type="button" className="sib-btn sib-btn--ghost rfc__oggi" onClick={() => setRif({ anno: oggi.getFullYear(), mese: oggi.getMonth() })}>Oggi</button>}
          {drop ? (
            <span className="rfc__count rfc__count--drop">
              <i className="fa-solid fa-arrows-up-down-left-right" aria-hidden="true" />
              Rilascia per spostare {drop.r.tipo.toLowerCase()} {drop.dipId !== drop.r.dipendenteId ? `a ${DIPENDENTI_HR.find((x) => x.id === drop.dipId)?.nome} ` : ''}
              {drop.dal === drop.al ? `al ${fmtDataHr(drop.dal)}` : `dal ${fmtDataHr(drop.dal)} al ${fmtDataHr(drop.al)}`}
            </span>
          ) : (
            <span className="rfc__count">{totale === 1 ? '1 richiesta nel mese' : `${totale} richieste nel mese`}</span>
          )}
        </div>
        <div className="rfc__legend" aria-label="Legenda">
          {(['Ferie', 'ROL', 'Permesso', 'Malattia'] as TipoAssenza[]).map((t) => (
            <span key={t} className="rfc__leg"><span className={`rfc__leg-dot rfc__leg-dot--${t.toLowerCase()}`} aria-hidden="true" />{t}</span>
          ))}
          <span className="rfc__leg-sep" aria-hidden="true" />
          <span className="rfc__leg"><span className="rfc__sw rfc__sw--ok" aria-hidden="true" />Approvata</span>
          <span className="rfc__leg"><span className="rfc__sw rfc__sw--attesa" aria-hidden="true" />In attesa</span>
          <span className="rfc__leg"><span className="rfc__sw rfc__sw--ko" aria-hidden="true" />Rifiutata</span>
          {limiti && <span className="rfc__leg"><span className="rfc__sw rfc__sw--fuori" aria-hidden="true" />Fuori dal periodo</span>}
          {azioni && <span className="rfc__azioni">{azioni}</span>}
        </div>
      </div>

      <div className="rfc__wrap">
        <table className="rfc__grid" ref={gridRef}>
          <colgroup>
            <col className="rfc__c-dip" />
            {giorni.map((g) => <col key={g.iso} />)}
            {colonnaFinale && <col className="rfc__c-fin" />}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="rfc__dip-h">Dipendente</th>
              {giorni.map((g) => (
                <th key={g.iso} scope="col" data-iso={g.iso} className={[cls(g, oggiIso), allertaGiorno?.(g.iso) ? 'rfc__allerta' : ''].filter(Boolean).join(' ') || undefined}>
                  {(() => {
                    const testo = [g.fest, allertaGiorno?.(g.iso)].filter(Boolean).join(' · ')
                    return testo ? <Tooltip text={testo}><span className={g.fest ? 'rfc__fest' : undefined}>{g.n}</span></Tooltip> : g.n
                  })()}
                </th>
              ))}
              {colonnaFinale && <th scope="col" className="rfc__fin">{colonnaFinale.tooltip ? <Tooltip text={colonnaFinale.tooltip}><span>{colonnaFinale.titolo}</span></Tooltip> : colonnaFinale.titolo}</th>}
            </tr>
            <tr className="rfc__r-gsett">
              <th scope="col" />
              {giorni.map((g) => <th key={g.iso} className={cls(g, oggiIso)}>{GSETT[g.dow]}</th>)}
              {colonnaFinale && <th />}
            </tr>
          </thead>
          <tbody>
            {righe.map(({ d, corsie }) => corsie.map((corsia, i) => (
              <tr key={`${d.id}-${i}`} data-dip={d.id} className={[i === corsie.length - 1 ? 'rfc__row-end' : '', drop?.dipId === d.id ? 'rfc__row--drop' : ''].filter(Boolean).join(' ') || undefined}>
                {i === 0 && (
                  <th scope="row" rowSpan={corsie.length} className="rfc__dip">
                    <span className="rfc__dip-nome">
                      <span className="rfc__dip-txt">{d.nome} {d.cognome}</span>
                      {(() => {
                        const sg = segnalaDipendente?.(d.id)
                        return sg ? (
                          <Tooltip text={sg.testo}>
                            <i className={`fa-solid fa-triangle-exclamation rfc__segnala rfc__segnala--${sg.livello}`} aria-label="Regole del piano non rispettate" />
                          </Tooltip>
                        ) : null
                      })()}
                    </span>
                    <span className="rfc__dip-rep"><i className={`fa-solid ${repartoIcon(d.reparto)}`} aria-hidden="true" />{d.reparto}</span>
                  </th>
                )}
                {celle(corsia, d.id)}
                {colonnaFinale && i === 0 && <td rowSpan={corsie.length} className="rfc__fin">{colonnaFinale.valore(d.id, anno)}</td>}
              </tr>
            )))}
          </tbody>
        </table>
      </div>

      {menu && (() => {
        const dip = DIPENDENTI_HR.find((d) => d.id === menu.dipId)
        const [y, m, g] = menu.iso.split('-').map(Number)
        const esegui = (f: () => void) => () => { setMenu(null); f() }
        return (
          <div ref={menuRef} role="menu" className={`rfc__menu${pos ? ' rfc__menu--ready' : ''}`}
            style={{ '--mx': `${(pos ?? menu).x}px`, '--my': `${(pos ?? menu).y}px` } as React.CSSProperties}>
            <div className="rfc__menu-title">{dip?.nome} {dip?.cognome} · {g} {MESI_LUNGHI[m - 1].slice(0, 3).toLowerCase()} {y}</div>
            {onNuova && (
              <div className="rfc__menu-group">
                <div className="rfc__menu-sub">Nuova richiesta</div>
                {(['Ferie', 'ROL', 'Permesso', 'Malattia'] as TipoAssenza[]).map((t) => (
                  <button key={t} type="button" role="menuitem" className="rfc__menu-item" onClick={esegui(() => onNuova(menu.dipId, menu.iso, t))}>
                    <span className={`rfc__leg-dot rfc__leg-dot--${t.toLowerCase()}`} aria-hidden="true" />{t}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}

function cls(g: { we: boolean; iso: string; fuori?: boolean }, oggiIso: string) {
  return [g.we ? 'rfc__we' : '', g.iso === oggiIso ? 'rfc__oggi-col' : '', g.fuori ? 'rfc__fuori' : ''].filter(Boolean).join(' ') || undefined
}
