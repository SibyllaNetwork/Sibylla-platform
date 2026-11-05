import React, { useMemo, useState } from 'react'
import Tooltip from '../../../core/components/Tooltip'
import {
  DIPENDENTI_HR, fmtDataHr, type RichiestaAssenza, type StatoRichiesta, type TipoAssenza,
} from '../../../store/useHrGestioneStore'
import { festivitaNazionale, GSETT, isoDi, MESI_LUNGHI, repartoIcon } from '../_presenze/presenze.model'
import './RichiesteCalendario.sass'

/**
 * Richieste — vista calendario. Una riga per dipendente, i giorni del mese in
 * colonna: ogni richiesta è una barra sui suoi giorni, colorata per tipo
 * (ferie, ROL, permesso, malattia) e disegnata secondo lo stato (piena se
 * approvata, tratteggiata se in attesa dell'HR o del responsabile, barrata se
 * rifiutata). Clic sulla barra: si apre il dettaglio con tutte le azioni.
 */

interface Props {
  /** Richieste già filtrate dalla pagina (stato, reparto, filtri di colonna). */
  richieste: RichiestaAssenza[]
  reparto: string
  onApri: (r: RichiestaAssenza) => void
  /** Strumenti a destra della barra del mese (es. selettore di vista). */
  azioni?: React.ReactNode
}

const SIGLA: Record<TipoAssenza, string> = { Ferie: 'FER', ROL: 'ROL', Permesso: 'PER', Malattia: 'MAL' }
const TIPO_ICO: Record<TipoAssenza, string> = { Ferie: 'fa-umbrella-beach', Permesso: 'fa-clock', ROL: 'fa-hourglass-half', Malattia: 'fa-notes-medical' }
const STATO_CLS = (s: StatoRichiesta) => (s === 'Approvata' ? 'ok' : s === 'Rifiutata' ? 'ko' : 'attesa')
const STATO_LBL = (s: StatoRichiesta) => (s === 'Al responsabile' ? 'Al responsabile di reparto' : s)

interface Segmento { r: RichiestaAssenza; da: number; span: number }

export default function RichiesteCalendario({ richieste, reparto, onApri, azioni }: Props) {
  const oggi = new Date()
  const [rif, setRif] = useState(() => ({ anno: oggi.getFullYear(), mese: oggi.getMonth() }))
  const { anno, mese } = rif
  const n = new Date(anno, mese + 1, 0).getDate()
  const oggiIso = isoDi(oggi)
  const giorni = Array.from({ length: n }, (_, i) => {
    const d = new Date(anno, mese, i + 1)
    const fest = festivitaNazionale(d)
    return { iso: isoDi(d), n: i + 1, dow: d.getDay(), fest, we: d.getDay() === 0 || d.getDay() === 6 || !!fest }
  })
  const primo = giorni[0].iso
  const ultimo = giorni[n - 1].iso

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

  /** Celle di una corsia: barre per le richieste, celle vuote per gli altri giorni. */
  function celle(corsia: Segmento[], dipId: number) {
    const out: React.ReactNode[] = []
    let g = 1
    const ordinati = [...corsia].sort((a, b) => a.da - b.da)
    ordinati.forEach((s) => {
      for (; g < s.da; g++) out.push(<td key={`${dipId}-${g}`} className={cls(giorni[g - 1], oggiIso)} />)
      const r = s.r
      const continuaPrima = r.dal < primo
      const continuaDopo = r.al > ultimo
      out.push(
        <td key={`${dipId}-${r.id}`} colSpan={s.span} className="rfc__bar-cell">
          <Tooltip content={
            <span className="rfc__tip">
              <span className="rfc__tip-t">{r.tipo} · {STATO_LBL(r.stato)}</span>
              <span>{r.dal === r.al ? fmtDataHr(r.dal) : `dal ${fmtDataHr(r.dal)} al ${fmtDataHr(r.al)}`}{r.ore ? ` · ${r.ore} h` : ''}</span>
              {r.note && <span>{r.note}</span>}
              <span className="rfc__tip-hint">Clic per il dettaglio e le azioni</span>
            </span>
          }>
            <button type="button"
              className={`rfc__bar rfc__bar--${r.tipo.toLowerCase()}${s.span === 1 ? ' rfc__bar--uno' : ''} rfc__bar--${STATO_CLS(r.stato)}${continuaPrima ? ' rfc__bar--prima' : ''}${continuaDopo ? ' rfc__bar--dopo' : ''}`}
              onClick={() => onApri(r)} aria-label={`${r.tipo} ${STATO_LBL(r.stato)} dal ${fmtDataHr(r.dal)} al ${fmtDataHr(r.al)}`}>
              <i className={`fa-solid ${TIPO_ICO[r.tipo]}`} aria-hidden="true" />
              {s.span > 1 && <span className="rfc__bar-txt">{s.span >= 3 ? r.tipo : SIGLA[r.tipo]}</span>}
              {s.span >= 4 && r.stato !== 'Approvata' && <span className="rfc__bar-stato">{r.stato === 'Al responsabile' ? 'al resp.' : r.stato === 'Da approvare' ? 'da approvare' : 'rifiutata'}</span>}
            </button>
          </Tooltip>
        </td>,
      )
      g = s.da + s.span
    })
    for (; g <= n; g++) out.push(<td key={`${dipId}-${g}`} className={cls(giorni[g - 1], oggiIso)} />)
    return out
  }

  return (
    <div className="rfc">
      <div className="rfc__bar-top">
        <div className="rfc__nav">
          <Tooltip text="Mese precedente">
            <button type="button" className="sib-btn sib-btn--icon rfc__nav-btn" onClick={() => sposta(-1)} aria-label="Mese precedente"><i className="fa-solid fa-chevron-left" /></button>
          </Tooltip>
          <span className="rfc__mese">{MESI_LUNGHI[mese]} {anno}</span>
          <Tooltip text="Mese successivo">
            <button type="button" className="sib-btn sib-btn--icon rfc__nav-btn" onClick={() => sposta(1)} aria-label="Mese successivo"><i className="fa-solid fa-chevron-right" /></button>
          </Tooltip>
          <button type="button" className="sib-btn sib-btn--ghost rfc__oggi" onClick={() => setRif({ anno: oggi.getFullYear(), mese: oggi.getMonth() })}>Oggi</button>
          <span className="rfc__count">{totale === 1 ? '1 richiesta nel mese' : `${totale} richieste nel mese`}</span>
        </div>
        <div className="rfc__legend" aria-label="Legenda">
          {(['Ferie', 'ROL', 'Permesso', 'Malattia'] as TipoAssenza[]).map((t) => (
            <span key={t} className="rfc__leg"><span className={`rfc__leg-dot rfc__leg-dot--${t.toLowerCase()}`} aria-hidden="true" />{t}</span>
          ))}
          <span className="rfc__leg-sep" aria-hidden="true" />
          <span className="rfc__leg"><span className="rfc__sw rfc__sw--ok" aria-hidden="true" />Approvata</span>
          <span className="rfc__leg"><span className="rfc__sw rfc__sw--attesa" aria-hidden="true" />In attesa</span>
          <span className="rfc__leg"><span className="rfc__sw rfc__sw--ko" aria-hidden="true" />Rifiutata</span>
          {azioni && <span className="rfc__azioni">{azioni}</span>}
        </div>
      </div>

      <div className="rfc__wrap">
        <table className="rfc__grid">
          <colgroup>
            <col className="rfc__c-dip" />
            {giorni.map((g) => <col key={g.iso} />)}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="rfc__dip-h">Dipendente</th>
              {giorni.map((g) => (
                <th key={g.iso} scope="col" className={cls(g, oggiIso)}>
                  {g.fest ? <Tooltip text={g.fest}><span className="rfc__fest">{g.n}</span></Tooltip> : g.n}
                </th>
              ))}
            </tr>
            <tr className="rfc__r-gsett">
              <th scope="col" />
              {giorni.map((g) => <th key={g.iso} className={cls(g, oggiIso)}>{GSETT[g.dow]}</th>)}
            </tr>
          </thead>
          <tbody>
            {righe.map(({ d, corsie }) => corsie.map((corsia, i) => (
              <tr key={`${d.id}-${i}`} className={i === corsie.length - 1 ? 'rfc__row-end' : undefined}>
                {i === 0 && (
                  <th scope="row" rowSpan={corsie.length} className="rfc__dip">
                    <span className="rfc__dip-nome">{d.nome} {d.cognome}</span>
                    <span className="rfc__dip-rep"><i className={`fa-solid ${repartoIcon(d.reparto)}`} aria-hidden="true" />{d.reparto}</span>
                  </th>
                )}
                {celle(corsia, d.id)}
              </tr>
            )))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function cls(g: { we: boolean; iso: string }, oggiIso: string) {
  return [g.we ? 'rfc__we' : '', g.iso === oggiIso ? 'rfc__oggi-col' : ''].filter(Boolean).join(' ') || undefined
}
