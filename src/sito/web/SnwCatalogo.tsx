import React, { useMemo, useState } from 'react'
import { CheckboxField, RadioGroup, RangeField, SelectField, ToggleSwitch } from '../../core/components/form'
import { CATEGORIE, Categoria, FOTO, OFFERTE, eur } from '../sitoData'
import { useSitoStore } from '../useSitoStore'
import SnwCard from './SnwCard'
import SnwSoggiorni from './SnwSoggiorni'
import SnwTestata from './SnwTestata'
import './SnwCatalogo.sass'

/**
 * Catalogo: categoria (o tutto), filtri a sinistra (destinazione, prezzo,
 * valutazione, cancellazione gratuita, preferiti) e risultati ordinabili.
 */
type Ordine = 'consigliati' | 'prezzo-su' | 'prezzo-giu' | 'voto'

const FOTO_CAT: Record<Categoria | 'tutto', string> = {
  tutto: FOTO.vernazza, soggiorni: FOTO.cameraClassica, esperienze: FOTO.trevi, prodotti: FOTO.olio, servizi: FOTO.valigia,
}

export default function SnwCatalogo({ cat, dove }: { cat?: Categoria; dove?: string }) {
  // I soggiorni hanno la ricerca da sito di booking (date, ospiti, filtri di dettaglio)
  return cat === 'soggiorni' ? <SnwSoggiorni dove={dove} /> : <CatalogoOfferte cat={cat} dove={dove} />
}

function CatalogoOfferte({ cat, dove }: { cat?: Categoria; dove?: string }) {
  const vai = useSitoStore(s => s.vai)
  const preferiti = useSitoStore(s => s.preferiti)
  const base = OFFERTE.filter(o => !cat || o.cat === cat)
  const citta = Array.from(new Set(base.map(o => o.citta)))
  const tetto = Math.ceil(Math.max(...base.map(o => o.prezzo)) / 10) * 10

  const [luoghi, setLuoghi] = useState<string[]>(dove ? [dove] : [])
  const [maxPrezzo, setMaxPrezzo] = useState(tetto)
  const [votoMin, setVotoMin] = useState('0')
  const [soloCanc, setSoloCanc] = useState(false)
  const [soloPref, setSoloPref] = useState(false)
  const [ordine, setOrdine] = useState<Ordine>('consigliati')

  const risultati = useMemo(() => {
    const r = base.filter(o =>
      (!luoghi.length || luoghi.includes(o.citta)) && o.prezzo <= maxPrezzo && o.voto >= Number(votoMin)
      && (!soloCanc || o.cancellazione) && (!soloPref || preferiti.includes(o.id)))
    if (ordine === 'prezzo-su') r.sort((a, b) => a.prezzo - b.prezzo)
    if (ordine === 'prezzo-giu') r.sort((a, b) => b.prezzo - a.prezzo)
    if (ordine === 'voto') r.sort((a, b) => b.voto - a.voto)
    return r
  }, [base, luoghi, maxPrezzo, votoMin, soloCanc, soloPref, ordine, preferiti])

  const info = CATEGORIE.find(c => c.id === cat)
  const azzera = () => { setLuoghi([]); setMaxPrezzo(tetto); setVotoMin('0'); setSoloCanc(false); setSoloPref(false) }

  return (
    <div className="snw-cat">
      <SnwTestata kicker={dove ? `Catalogo · ${dove}` : 'Catalogo'} titolo={info ? (info.id === 'esperienze' ? 'Scegli tra le' : 'Scegli tra i') : 'Tutte le'} enfasi={info ? info.nome.toLowerCase() : 'offerte'}
        sotto={info?.claim ?? 'Soggiorni, esperienze, prodotti e servizi della rete Sibylla'} foto={FOTO_CAT[cat ?? 'tutto']} icona={info?.icona ?? 'fa-grid-2'}
        briciole={[{ nome: info?.nome ?? 'Tutte le offerte' }]}
        extra={<span className="snw-cat__conta"><b>{base.length}</b> offerte in {citta.length} località</span>} />
      <div className="snw__wrap">
      <div className="snw-cat__tab snw-cat__tab--barra" role="tablist" aria-label="Categoria">
        <button type="button" role="tab" aria-selected={!cat} className={!cat ? 'snw-cat__t snw-cat__t--on' : 'snw-cat__t'} onClick={() => vai({ nome: 'catalogo' })}>Tutto</button>
        {CATEGORIE.map(c => (
          <button key={c.id} type="button" role="tab" aria-selected={cat === c.id} className={cat === c.id ? 'snw-cat__t snw-cat__t--on' : 'snw-cat__t'}
            onClick={() => vai({ nome: 'catalogo', cat: c.id })}>
            <i className={`fa-light ${c.icona}`} aria-hidden="true" />{c.nome}
          </button>
        ))}
      </div>

      <div className="snw-cat__layout">
        <aside className="snw-cat__filtri" aria-label="Filtri">
          <div className="snw-cat__filtri-head">
            <h2><i className="fa-solid fa-sliders" aria-hidden="true" /> Filtri</h2>
            <button type="button" className="sib-btn sib-btn--ghost" onClick={azzera}>Azzera</button>
          </div>
          <fieldset>
            <legend>Destinazione</legend>
            {citta.map(c => (
              <CheckboxField key={c} name={`luogo-${c}`} label={`${c} (${base.filter(o => o.citta === c).length})`} checked={luoghi.includes(c)}
                onChange={e => setLuoghi(l => (e.target.checked ? [...l, c] : l.filter(x => x !== c)))} />
            ))}
          </fieldset>
          <fieldset>
            <RangeField label="Prezzo massimo" name="prezzo" value={maxPrezzo} onChange={setMaxPrezzo} min={0} max={tetto} step={tetto > 100 ? 10 : 1}
              valueLabel={eur(maxPrezzo)} resetTo={tetto} />
          </fieldset>
          <fieldset>
            <RadioGroup label="Valutazione" name="voto" value={votoMin} onChange={setVotoMin}
              options={[{ value: '0', label: 'Tutte' }, { value: '4.5', label: '4,5 e oltre' }, { value: '4.8', label: '4,8 e oltre' }]} />
          </fieldset>
          <fieldset>
            <ToggleSwitch label="Cancellazione gratuita" checked={soloCanc} onChange={setSoloCanc} />
            <ToggleSwitch label="Solo preferiti" checked={soloPref} onChange={setSoloPref} />
          </fieldset>
        </aside>

        <section className="snw-cat__ris">
          <div className="snw-cat__barra">
            <span><b>{risultati.length}</b> {risultati.length === 1 ? 'offerta' : 'offerte'}{luoghi.length ? ` a ${luoghi.join(', ')}` : ''}</span>
            <SelectField name="ordine" label="Ordina per" value={ordine} onChange={e => setOrdine(e.target.value as Ordine)} className="snw-cat__ordine"
              options={[
                { value: 'consigliati', label: 'Consigliati' },
                { value: 'prezzo-su', label: 'Prezzo: dal più basso' },
                { value: 'prezzo-giu', label: 'Prezzo: dal più alto' },
                { value: 'voto', label: 'Valutazione' },
              ]} />
          </div>
          {risultati.length ? (
            <div className="snw-cat__griglia">
              {risultati.map(o => <SnwCard key={o.id} o={o} />)}
            </div>
          ) : (
            <div className="snw-cat__vuoto">
              <i className="fa-light fa-compass" aria-hidden="true" />
              <b>Nessuna offerta con questi filtri</b>
              <button type="button" className="sib-btn sib-btn--secondary" onClick={azzera}>Azzera i filtri</button>
            </div>
          )}
        </section>
      </div>
      </div>
    </div>
  )
}
