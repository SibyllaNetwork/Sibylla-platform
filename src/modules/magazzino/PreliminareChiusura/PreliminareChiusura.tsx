// ─── Preliminare di chiusura (Magazzino) ──────────────────────────────────────
//  La chiusura di fine mese di un magazzino si prepara in tre passi, nell'ordine
//  in cui li fa un economo:
//
//   1. Controlli — prima di contare, il teorico deve essere giusto: DDT arrivati
//      ma non caricati, buoni di prelievo non confermati, trasferimenti ancora
//      in viaggio. Finché ce n'è uno bloccante la chiusura non parte.
//   2. Conta fisica — la conta si scrive riga per riga (anche "alla cieca", senza
//      vedere il teorico, per non farsi influenzare); ogni differenza vuole una
//      causale, perché in contabilità diventa un costo con un nome.
//   3. Riepilogo — valorizzazione a costo medio per categoria (rimanenze,
//      consumi, differenze) e conferma: il periodo passa nel Registro chiusure
//      e le giacenze ripartono dal contato.
//
//  La bozza della conta si salva da sola: si può contare in più riprese.
import React, { useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import FilterToolbar from '../../../core/components/FilterToolbar'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import {
  SelectField, SearchField, CheckboxField, NumCell, TextareaField,
} from '../../../core/components/form'
import { useConfirmStore } from '../../../store/useConfirmStore'
import { toast } from '../../../core/components/Toast/useToast'
import { exportTableToXls } from '../../sales/booking/GrigliaDisponibilita/exportGriglia'
import {
  useChiusureMagazzinoStore, chiaveBozza, magazziniDi, periodoAperto, righeCorrenti, ultimaChiusura,
} from '../../../store/useChiusureMagazzinoStore'
import {
  CATEGORIE_ARTICOLO, CAUSALI_DIFFERENZA, PERIODO_CORRENTE, STRUTTURE_MAG,
  articoloById, consumoDi, dataOra, decimaliDi, euro, labelPeriodo, magazzinoById, perCategoria,
  qta, teoricaDi, valorizza,
  type CategoriaArticolo, type CausaleDifferenza, type RigaChiusura,
} from '../_data/chiusure.model'
import './PreliminareChiusura.sass'

type Fase = 'controlli' | 'conta' | 'riepilogo'

/** Oltre questa quota del valore teorico la differenza va giustificata a parte. */
const SOGLIA_DIFFERENZA = 0.015

const tondo = (n: number, dec: number) => Math.round(n * 10 ** dec) / 10 ** dec
const diffDi = (r: RigaChiusura) => {
  const a = articoloById(r.articoloId)
  return r.contato == null ? 0 : tondo(r.contato - teoricaDi(r), a ? decimaliDi(a.um) : 0)
}

interface Controllo {
  id: string
  esito: 'ok' | 'bloccante' | 'avviso'
  titolo: string
  dettaglio: string
  azione?: { label: string; icon: string; run: () => void }
  risolto?: string
}

export default function PreliminareChiusura({ navigate }: { navigate?: (p: string) => void }) {
  const store = useChiusureMagazzinoStore()
  const confirm = useConfirmStore(s => s.confirm)

  const [strutturaId, setStrutturaId] = useState(STRUTTURE_MAG[0].id)
  const [magazzinoId, setMagazzinoId] = useState(magazziniDi(STRUTTURE_MAG[0].id)[0].id)
  const [fase, setFase] = useState<Fase>('controlli')
  const [categoria, setCategoria] = useState<CategoriaArticolo | 'tutte'>('tutte')
  const [cerca, setCerca] = useState('')
  const [soloDiff, setSoloDiff] = useState(false)
  const [soloDaContare, setSoloDaContare] = useState(false)
  const [cieca, setCieca] = useState(false)

  const magazzino = magazzinoById(magazzinoId)!
  const periodo = periodoAperto(store, magazzinoId)
  const precedente = ultimaChiusura(store, magazzinoId)
  const bozza = store.bozze[chiaveBozza(magazzinoId, periodo)]
  const righe = useMemo(
    () => righeCorrenti(store, magazzinoId, periodo),
    [store.bozze, store.movExtra, store.chiusure, magazzinoId, periodo],
  )
  const inAttesa = periodo > PERIODO_CORRENTE

  // ── Numeri della conta ───────────────────────────────────────────────────
  const daContare = righe.filter(r => r.contato == null)
  const conDiff = righe.filter(r => diffDi(r) !== 0)
  const senzaCausale = conDiff.filter(r => !r.causale)
  const valori = valorizza(righe)
  const quotaDiff = valori.teorica ? Math.abs(valori.differenza) / valori.teorica : 0

  // ── Controlli pre-chiusura ───────────────────────────────────────────────
  const controlli: Controllo[] = useMemo(() => {
    const out: Controllo[] = []
    store.pendenze
      .filter(p => p.magazzinoId === magazzinoId && p.periodo === periodo)
      .forEach(p => {
        const ris = store.risolte[p.id]
        out.push({
          id: p.id,
          esito: ris ? 'ok' : p.bloccante ? 'bloccante' : 'avviso',
          titolo: p.titolo,
          dettaglio: p.dettaglio,
          risolto: ris ? `Risolto da ${ris.da} il ${dataOra(ris.il)}` : undefined,
          azione: ris ? undefined : {
            label: p.tipo === 'ddt' ? 'Registra carico' : p.tipo === 'scarico' && p.movimento ? 'Conferma scarico' : 'Presa visione',
            icon: p.tipo === 'ddt' ? 'fa-truck-ramp-box' : p.tipo === 'scarico' && p.movimento ? 'fa-cart-flatbed' : 'fa-eye',
            run: () => {
              store.risolviPendenza(p.id)
              toast.success(p.movimento ? 'Movimento registrato: il teorico è aggiornato' : 'Segnalazione archiviata', p.titolo)
            },
          },
        })
      })

    store.trasferimenti
      .filter(t => t.aId === magazzinoId)
      .filter(t => t.stato === 'in-transito' || (t.ricevutoIl ?? 0) > Date.now() - 86_400_000 * 3)
      .forEach(t => {
        const da = magazzinoById(t.daId)?.nome ?? ''
        const cosa = t.righe.map(r => { const a = articoloById(r.articoloId); return `${qta(r.qta, a?.um)} ${a?.um ?? ''} ${a?.nome ?? ''}` }).join(', ')
        out.push({
          id: t.id,
          esito: t.stato === 'ricevuto' ? 'ok' : 'bloccante',
          titolo: `Trasferimento ${t.numero} da ${da}`,
          dettaglio: t.stato === 'ricevuto'
            ? `Ricevuto: ${cosa}`
            : `Merce in viaggio, non ancora caricata qui: ${cosa}`,
          risolto: t.ricevutoIl ? `Ricevuto il ${dataOra(t.ricevutoIl)}` : undefined,
          azione: t.stato === 'ricevuto' ? undefined : {
            label: 'Conferma ricevimento', icon: 'fa-circle-check',
            run: () => { store.riceviTrasferimento(t.id); toast.success(`${t.numero} ricevuto e caricato`) },
          },
        })
      })

    const inUscita = store.trasferimenti.filter(t => t.daId === magazzinoId && t.stato === 'in-transito')
    if (inUscita.length) {
      out.push({
        id: 'uscita',
        esito: 'avviso',
        titolo: `${inUscita.length} ${inUscita.length === 1 ? 'trasferimento inviato' : 'trasferimenti inviati'} non ancora ricevuti`,
        dettaglio: `${inUscita.map(t => `${t.numero} → ${magazzinoById(t.aId)?.nome}`).join(', ')}. Lo scarico da qui è già registrato: la chiusura non ne risente.`,
        azione: { label: 'Apri bilanciamento', icon: 'fa-scale-balanced', run: () => navigate?.('bilanciamento-scorte') },
      })
    }

    out.push({
      id: 'conta',
      esito: daContare.length ? 'bloccante' : 'ok',
      titolo: 'Conta fisica completa',
      dettaglio: daContare.length
        ? `${daContare.length} ${daContare.length === 1 ? 'articolo' : 'articoli'} su ${righe.length} ancora da contare`
        : `Tutti i ${righe.length} articoli sono stati contati`,
      azione: daContare.length ? { label: 'Vai alla conta', icon: 'fa-clipboard-list', run: () => { setSoloDaContare(true); setFase('conta') } } : undefined,
    })
    out.push({
      id: 'causali',
      esito: senzaCausale.length ? 'bloccante' : 'ok',
      titolo: 'Differenze giustificate',
      dettaglio: senzaCausale.length
        ? `${senzaCausale.length} ${senzaCausale.length === 1 ? 'differenza' : 'differenze'} fra teorico e contato senza causale`
        : conDiff.length ? `${conDiff.length} differenze, tutte con la loro causale` : 'Nessuna differenza fra teorico e contato',
      azione: senzaCausale.length ? { label: 'Assegna causali', icon: 'fa-tags', run: () => { setSoloDiff(true); setFase('conta') } } : undefined,
    })
    out.push({
      id: 'soglia',
      esito: quotaDiff > SOGLIA_DIFFERENZA ? 'avviso' : 'ok',
      titolo: 'Differenza inventariale entro la soglia',
      dettaglio: `${euro(valori.differenza)} pari al ${(quotaDiff * 100).toLocaleString('it-IT', { maximumFractionDigits: 2 })}% del valore teorico (soglia ${(SOGLIA_DIFFERENZA * 100).toLocaleString('it-IT')}%)`
        + (quotaDiff > SOGLIA_DIFFERENZA ? ': spiegala nelle note di chiusura' : ''),
    })
    return out
  }, [store.pendenze, store.risolte, store.trasferimenti, magazzinoId, periodo, righe])

  const bloccanti = controlli.filter(c => c.esito === 'bloccante')
  const pendentiPrima = controlli.filter(c => c.esito === 'bloccante' && c.id !== 'conta' && c.id !== 'causali')

  // ── Righe visibili nella conta ──────────────────────────────────────────
  const visibili = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    return righe.filter(r => {
      const a = articoloById(r.articoloId)!
      return (categoria === 'tutte' || a.categoria === categoria)
        && (!soloDiff || diffDi(r) !== 0)
        && (!soloDaContare || r.contato == null)
        && (!q || a.nome.toLowerCase().includes(q) || a.codice.toLowerCase().includes(q))
    })
  }, [righe, categoria, soloDiff, soloDaContare, cerca])
  const gruppi = perCategoria(visibili)

  // ── Azioni ───────────────────────────────────────────────────────────────
  const cambiaStruttura = (id: string) => {
    setStrutturaId(id)
    setMagazzinoId(magazziniDi(id)[0].id)
    setFase('controlli')
  }

  const allinea = async () => {
    const ok = await confirm({
      title: 'Allinea i non contati',
      message: `Ai ${daContare.length} articoli non contati verrà assegnata la giacenza teorica, senza differenza. Usalo solo per ciò che hai verificato a vista.`,
      confirmLabel: 'Allinea', danger: false,
    })
    if (ok) toast.info(`${store.allineaNonContati(magazzinoId, periodo, righe)} articoli allineati al teorico`)
  }

  const azzera = async () => {
    const ok = await confirm({
      title: 'Azzera la conta',
      message: 'Tutte le quantità contate e le causali di questo periodo verranno cancellate. Procedere?',
      confirmLabel: 'Azzera',
    })
    if (ok) { store.azzeraConta(magazzinoId, periodo); toast.info('Conta azzerata') }
  }

  const esportaFoglio = () => {
    exportTableToXls(
      `foglio-conta-${magazzino.nome.toLowerCase().replace(/\W+/g, '-')}-${periodo}.xlsx`,
      cieca
        ? ['Codice', 'Articolo', 'Categoria', 'U.M.', 'Contato']
        : ['Codice', 'Articolo', 'Categoria', 'U.M.', 'Teorica', 'Contato'],
      righe.map(r => {
        const a = articoloById(r.articoloId)!
        const base = [a.codice, a.nome, a.categoria, a.um]
        return cieca ? [...base, r.contato ?? ''] : [...base, tondo(teoricaDi(r), decimaliDi(a.um)), r.contato ?? '']
      }),
      `Conta ${labelPeriodo(periodo)}`,
    )
    toast.success('Foglio di conta scaricato', magazzino.nome)
  }

  const chiudi = async () => {
    const ok = await confirm({
      title: `Chiudi ${labelPeriodo(periodo)}`,
      message: (
        <>
          Il periodo di <b>{magazzino.nome}</b> verrà chiuso con rimanenze finali per <b>{euro(valori.finale)}</b> e
          differenze inventariali per <b>{euro(valori.differenza)}</b>. Le rettifiche verranno registrate e il
          periodo non sarà più modificabile, se non riaprendolo dal Registro chiusure.
        </>
      ),
      confirmLabel: 'Chiudi il periodo', danger: false,
    })
    if (!ok) return
    const c = store.chiudiPeriodo(magazzinoId, periodo, righe, bozza?.note ?? '')
    toast.success(`${labelPeriodo(periodo)} chiuso — ${c.numero}`, magazzino.nome)
    setFase('controlli')
  }

  const fasi: Array<{ id: Fase; n: number; label: string; stato: string; ok: boolean }> = [
    { id: 'controlli', n: 1, label: 'Controlli', ok: !pendentiPrima.length,
      stato: pendentiPrima.length ? `${pendentiPrima.length} da risolvere` : 'Nessuna pendenza' },
    { id: 'conta', n: 2, label: 'Conta fisica', ok: !daContare.length && !senzaCausale.length,
      stato: `${righe.length - daContare.length}/${righe.length} contati` },
    { id: 'riepilogo', n: 3, label: 'Riepilogo e chiusura', ok: false,
      stato: bloccanti.length ? `${bloccanti.length} ${bloccanti.length === 1 ? 'blocco' : 'blocchi'}` : 'Pronto da chiudere' },
  ]

  return (
    <div className="prel">
      <PageHead
        title="Preliminare di chiusura"
        subtitle="Controlli, conta fisica e valorizzazione delle rimanenze prima della chiusura definitiva del periodo"
        actions={!inAttesa && (
          <button type="button" className="sib-btn sib-btn--secondary" onClick={esportaFoglio}>
            <i className="fa-regular fa-file-xls" aria-hidden="true" /> Foglio di conta
          </button>
        )}
      />

      <FilterToolbar className="prel__bar">
        <SelectField
          name="struttura" label="Struttura" className="prel__f"
          value={strutturaId}
          options={STRUTTURE_MAG.map(s => ({ value: s.id, label: s.nome }))}
          onChange={e => cambiaStruttura(e.target.value)}
        />
        <SelectField
          name="magazzino" label="Magazzino" className="prel__f"
          value={magazzinoId}
          options={magazziniDi(strutturaId).map(m => ({ value: m.id, label: m.nome }))}
          onChange={e => { setMagazzinoId(e.target.value); setFase('controlli') }}
        />
        <div className="prel__periodo">
          <span className="prel__lab">Periodo in chiusura</span>
          <span className="prel__periodo-val">
            <i className="fa-solid fa-calendar-check" aria-hidden="true" />
            {labelPeriodo(periodo)}
          </span>
        </div>
        <p className="prel__meta">
          {precedente
            ? <>Ultima chiusura: <b>{labelPeriodo(precedente.periodo)}</b>, il {dataOra(precedente.chiusaIl)} da {precedente.operatore}</>
            : 'Nessuna chiusura precedente'}
          {bozza?.aggiornata && !inAttesa && <> · Bozza salvata alle {new Date(bozza.aggiornata).toLocaleTimeString('it-IT', { timeStyle: 'short' })}</>}
        </p>
      </FilterToolbar>

      {inAttesa ? (
        <div className="prel__attesa">
          <i className="fa-solid fa-lock" aria-hidden="true" />
          <h3>{labelPeriodo(precedente!.periodo)} è chiuso</h3>
          <p>
            Chiusura {precedente!.numero} del {dataOra(precedente!.chiusaIl)}, da {precedente!.operatore}.
            Il prossimo periodo, {labelPeriodo(periodo)}, si potrà chiudere a fine mese.
          </p>
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => navigate?.('registro-chiusure')}>
            <i className="fa-solid fa-rectangle-list" aria-hidden="true" /> Apri il registro chiusure
          </button>
        </div>
      ) : (
        <>
          {/* ── Fasi ─────────────────────────────────────────────────────── */}
          <nav className="prel__fasi" aria-label="Fasi della chiusura">
            {fasi.map(f => (
              <button
                key={f.id} type="button"
                className={`prel__fase ${fase === f.id ? 'is-on' : ''} ${f.ok ? 'is-ok' : ''}`}
                onClick={() => setFase(f.id)}
                aria-current={fase === f.id ? 'step' : undefined}
              >
                <span className="prel__fase-n">
                  {f.ok ? <i className="fa-solid fa-check" aria-hidden="true" /> : f.n}
                </span>
                <span className="prel__fase-txt">
                  <span className="prel__fase-lab">{f.label}</span>
                  <span className="prel__fase-stato">{f.stato}</span>
                </span>
              </button>
            ))}
          </nav>

          {/* ── 1. Controlli ─────────────────────────────────────────────── */}
          {fase === 'controlli' && (
            <div className="prel__corpo">
              <ul className="prel__checks">
                {controlli.map(c => (
                  <li key={c.id} className={`prel__check is-${c.esito}`}>
                    <i
                      className={`fa-solid ${c.esito === 'ok' ? 'fa-circle-check' : c.esito === 'bloccante' ? 'fa-circle-xmark' : 'fa-triangle-exclamation'} prel__check-ico`}
                      aria-hidden="true"
                    />
                    <div className="prel__check-txt">
                      <span className="prel__check-tit">
                        {c.titolo}
                        {c.esito === 'bloccante' && <span className="prel__tag prel__tag--ko">Bloccante</span>}
                        {c.esito === 'avviso' && <span className="prel__tag prel__tag--warn">Avviso</span>}
                      </span>
                      <span className="prel__check-det">{c.dettaglio}</span>
                      {c.risolto && <span className="prel__check-ris">{c.risolto}</span>}
                    </div>
                    {c.azione && (
                      <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={c.azione.run}>
                        <i className={`fa-solid ${c.azione.icon}`} aria-hidden="true" /> {c.azione.label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <div className="prel__avanti">
                <button type="button" className="sib-btn sib-btn--primary" onClick={() => setFase('conta')}>
                  Passa alla conta fisica <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* ── 2. Conta fisica ──────────────────────────────────────────── */}
          {fase === 'conta' && (
            <div className="prel__corpo">
              <FilterToolbar
                className="prel__bar prel__bar--conta"
                actions={
                  <>
                    <Tooltip text="Assegna la giacenza teorica agli articoli non contati">
                      <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={allinea} disabled={!daContare.length}>
                        <i className="fa-solid fa-equals" aria-hidden="true" /> Allinea non contati
                      </button>
                    </Tooltip>
                    <button type="button" className="sib-btn sib-btn--danger-outline sib-btn--sm" onClick={azzera} disabled={!bozza}>
                      <i className="fa-solid fa-eraser" aria-hidden="true" /> Azzera conta
                    </button>
                  </>
                }
              >
                <SelectField
                  name="categoria" label="Categoria" className="prel__f"
                  value={categoria}
                  options={[{ value: 'tutte', label: 'Tutte' }, ...CATEGORIE_ARTICOLO.map(c => ({ value: c, label: c }))]}
                  onChange={e => setCategoria(e.target.value as CategoriaArticolo | 'tutte')}
                />
                <div className="prel__cerca">
                  <span className="prel__lab">Cerca</span>
                  <SearchField
                    name="cerca" value={cerca} placeholder="Articolo o codice…"
                    onChange={e => setCerca(e.target.value)} onClear={() => setCerca('')}
                  />
                </div>
                <CheckboxField name="dacontare" label={`Da contare (${daContare.length})`} checked={soloDaContare} onChange={e => setSoloDaContare(e.target.checked)} />
                <CheckboxField name="diff" label={`Con differenza (${conDiff.length})`} checked={soloDiff} onChange={e => setSoloDiff(e.target.checked)} />
                <Tooltip text="Nasconde la giacenza teorica: chi conta non si fa influenzare dal numero atteso">
                  <span><CheckboxField name="cieca" label="Conta alla cieca" checked={cieca} onChange={e => setCieca(e.target.checked)} /></span>
                </Tooltip>
              </FilterToolbar>

              <div className="prel__scroll">
                <div className="sib-table-wrap">
                  <table className={`sib-table prel__table ${cieca ? 'is-cieca' : ''}`}>
                    <colgroup>
                      <col className="prel__c-art" />
                      <col className="prel__c-um" />
                      {!cieca && <><col className="prel__c-n" /><col className="prel__c-n" /><col className="prel__c-n" /><col className="prel__c-n" /></>}
                      <col className="prel__c-conta" />
                      {!cieca && <><col className="prel__c-n" /><col className="prel__c-val" /><col className="prel__c-cau" /></>}
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Articolo</th>
                        <th>U.M.</th>
                        {!cieca && (
                          <>
                            <th className="prel__num"><TruncatedText text="Iniziale" full="Giacenza iniziale (contato alla chiusura precedente)" /></th>
                            <th className="prel__num"><TruncatedText text="Entrate" full="Carichi da fornitore e trasferimenti ricevuti" /></th>
                            <th className="prel__num"><TruncatedText text="Uscite" full="Scarichi ai reparti, consumi e trasferimenti inviati" /></th>
                            <th className="prel__num"><TruncatedText text="Teorica" full="Giacenza teorica = iniziale + entrate − uscite" /></th>
                          </>
                        )}
                        <th className="prel__num">Contato</th>
                        {!cieca && (
                          <>
                            <th className="prel__num">Diff.</th>
                            <th className="prel__num"><TruncatedText text="Valore diff." full="Valore della differenza a costo medio" /></th>
                            <th>Causale</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {gruppi.map(g => (
                        <React.Fragment key={g.categoria}>
                          <tr className="prel__grp">
                            <td colSpan={cieca ? 3 : 10}>
                              {g.categoria} <span>· {g.righe.length} {g.righe.length === 1 ? 'articolo' : 'articoli'}</span>
                            </td>
                          </tr>
                          {g.righe.map(r => {
                            const a = articoloById(r.articoloId)!
                            const dec = decimaliDi(a.um)
                            const d = diffDi(r)
                            return (
                              <tr key={r.articoloId} className={r.contato == null ? 'is-dacontare' : d !== 0 && !r.causale ? 'is-ko' : ''}>
                                <td>
                                  <span className="prel__art">
                                    <TruncatedText text={a.nome} />
                                    <span className="prel__cod">{a.codice}</span>
                                  </span>
                                </td>
                                <td className="prel__um">{a.um}</td>
                                {!cieca && (
                                  <>
                                    <td className="prel__num">{qta(r.iniziale, a.um)}</td>
                                    <td className="prel__num">{qta(r.entrate, a.um)}</td>
                                    <td className="prel__num">{qta(r.uscite, a.um)}</td>
                                    <td className="prel__num prel__teo">{qta(tondo(teoricaDi(r), dec), a.um)}</td>
                                  </>
                                )}
                                <td className="prel__num">
                                  <span className="prel__conta">
                                    <NumCell
                                      className="sib-input prel__in"
                                      min={0} decimals={dec} step={dec ? 0.1 : 1}
                                      value={r.contato ?? NaN}
                                      placeholder="—"
                                      aria-label={`Contato di ${a.nome}`}
                                      onChange={n => store.setConta(magazzinoId, periodo, a.id, n)}
                                      // Passare dal campo senza scrivere non vale come "contato zero"
                                      onBlur={e => { if (!e.target.value.trim()) store.setConta(magazzinoId, periodo, a.id, undefined) }}
                                    />
                                    {r.contato != null && (
                                      <Tooltip text="Togli la conta di questa riga">
                                        <button
                                          type="button" className="prel__clear"
                                          onClick={() => store.setConta(magazzinoId, periodo, a.id, undefined)}
                                          aria-label={`Togli la conta di ${a.nome}`}
                                        >
                                          <i className="fa-solid fa-xmark" aria-hidden="true" />
                                        </button>
                                      </Tooltip>
                                    )}
                                  </span>
                                </td>
                                {!cieca && (
                                  <>
                                    <td className={`prel__num ${d < 0 ? 'prel__neg' : d > 0 ? 'prel__pos' : ''}`}>
                                      {r.contato == null ? <span className="prel__nd">—</span> : `${d > 0 ? '+' : ''}${qta(d, a.um)}`}
                                    </td>
                                    <td className={`prel__num ${d < 0 ? 'prel__neg' : d > 0 ? 'prel__pos' : ''}`}>
                                      {d !== 0 ? euro(d * r.costo) : <span className="prel__nd">—</span>}
                                    </td>
                                    <td>
                                      {d !== 0 ? (
                                        <SelectField
                                          name={`causale-${a.id}`} className="prel__cau"
                                          ariaLabel={`Causale della differenza di ${a.nome}`}
                                          placeholder="Scegli causale"
                                          value={r.causale ?? ''}
                                          options={CAUSALI_DIFFERENZA.map(c => ({ value: c, label: c }))}
                                          onChange={e => store.setCausale(magazzinoId, periodo, a.id, e.target.value as CausaleDifferenza)}
                                        />
                                      ) : <span className="prel__nd">—</span>}
                                    </td>
                                  </>
                                )}
                              </tr>
                            )
                          })}
                        </React.Fragment>
                      ))}
                      {!gruppi.length && (
                        <tr><td colSpan={cieca ? 3 : 10} className="prel__vuoto">Nessun articolo con questi filtri.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Totali sotto la tabella, mai in cima alla pagina */}
                <p className="prel__somma">
                  {righe.length - daContare.length} di {righe.length} articoli contati
                  {!cieca && (
                    <>
                      {' · '}valore teorico <b>{euro(valori.teorica)}</b>
                      {' · '}valore contato <b>{euro(valori.finale)}</b>
                      {' · '}differenza <b className={valori.differenza < 0 ? 'prel__neg' : ''}>{euro(valori.differenza)}</b>
                    </>
                  )}
                </p>
              </div>

              <div className="prel__avanti">
                <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setFase('controlli')}>
                  <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Controlli
                </button>
                <button type="button" className="sib-btn sib-btn--primary" onClick={() => setFase('riepilogo')}>
                  Riepilogo e chiusura <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* ── 3. Riepilogo e chiusura ──────────────────────────────────── */}
          {fase === 'riepilogo' && (
            <div className="prel__corpo prel__scroll">
              <h3 className="prel__h">Valorizzazione a costo medio ponderato</h3>
              <div className="sib-table-wrap">
                <table className="sib-table prel__table prel__table--rie">
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th className="prel__num"><TruncatedText text="Rim. iniziale" full="Rimanenza iniziale" /></th>
                      <th className="prel__num">Entrate</th>
                      <th className="prel__num">Uscite</th>
                      <th className="prel__num"><TruncatedText text="Rim. teorica" full="Rimanenza teorica" /></th>
                      <th className="prel__num"><TruncatedText text="Rim. finale" full="Rimanenza finale (contato; teorica per i non contati)" /></th>
                      <th className="prel__num">Differenze</th>
                      <th className="prel__num"><TruncatedText text="Consumo" full="Consumo del periodo = rimanenza iniziale + entrate − rimanenza finale" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {perCategoria(righe).map(g => (
                      <tr key={g.categoria}>
                        <td>{g.categoria}</td>
                        <td className="prel__num">{euro(g.valori.iniziale)}</td>
                        <td className="prel__num">{euro(g.valori.entrate)}</td>
                        <td className="prel__num">{euro(g.valori.uscite)}</td>
                        <td className="prel__num">{euro(g.valori.teorica)}</td>
                        <td className="prel__num"><b>{euro(g.valori.finale)}</b></td>
                        <td className={`prel__num ${g.valori.differenza < 0 ? 'prel__neg' : g.valori.differenza > 0 ? 'prel__pos' : ''}`}>{euro(g.valori.differenza)}</td>
                        <td className="prel__num">{euro(consumoDi(g.valori))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="prel__tot">
                      <td>Totale {magazzino.nome}</td>
                      <td className="prel__num">{euro(valori.iniziale)}</td>
                      <td className="prel__num">{euro(valori.entrate)}</td>
                      <td className="prel__num">{euro(valori.uscite)}</td>
                      <td className="prel__num">{euro(valori.teorica)}</td>
                      <td className="prel__num">{euro(valori.finale)}</td>
                      <td className="prel__num">{euro(valori.differenza)}</td>
                      <td className="prel__num">{euro(consumoDi(valori))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <h3 className="prel__h">Rettifiche inventariali da registrare ({conDiff.length})</h3>
              {conDiff.length ? (
                <div className="sib-table-wrap">
                  <table className="sib-table prel__table prel__table--ret">
                    <thead>
                      <tr>
                        <th>Articolo</th>
                        <th>Causale</th>
                        <th className="prel__num">Quantità</th>
                        <th className="prel__num">Valore</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conDiff.map(r => {
                        const a = articoloById(r.articoloId)!
                        const d = diffDi(r)
                        return (
                          <tr key={r.articoloId}>
                            <td><TruncatedText text={a.nome} /></td>
                            <td>{r.causale ?? <span className="prel__neg">Manca la causale</span>}</td>
                            <td className={`prel__num ${d < 0 ? 'prel__neg' : 'prel__pos'}`}>{d > 0 ? '+' : ''}{qta(d, a.um)} {a.um}</td>
                            <td className={`prel__num ${d < 0 ? 'prel__neg' : 'prel__pos'}`}>{euro(d * r.costo)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="prel__nota">La conta coincide con il teorico: nessuna rettifica.</p>
              )}

              <TextareaField
                name="note" label="Note di chiusura" rows={3}
                placeholder={quotaDiff > SOGLIA_DIFFERENZA ? 'La differenza supera la soglia: spiega qui cosa è successo' : 'Facoltative: annotazioni per il controllo di gestione'}
                value={bozza?.note ?? ''}
                onChange={e => store.setNote(magazzinoId, periodo, e.target.value)}
              />

              <div className="prel__avanti">
                <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setFase('conta')}>
                  <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Conta fisica
                </button>
                {bloccanti.length ? (
                  <Tooltip text={`Prima risolvi: ${bloccanti.map(b => b.titolo).join(' · ')}`}>
                    <button type="button" className="sib-btn sib-btn--primary" disabled>
                      <i className="fa-solid fa-lock" aria-hidden="true" /> Chiudi {labelPeriodo(periodo)}
                    </button>
                  </Tooltip>
                ) : (
                  <button type="button" className="sib-btn sib-btn--primary" onClick={chiudi}>
                    <i className="fa-solid fa-lock" aria-hidden="true" /> Chiudi {labelPeriodo(periodo)}
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
