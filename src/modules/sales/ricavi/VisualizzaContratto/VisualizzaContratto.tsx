import React, { useEffect, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import { apiFetchSibylla } from '../../../../services/api'
import './VisualizzaContratto.sass'

interface AnagraficaView {
  nomeAzienda: string
  email: string
  telefono: string
  hotelPartner: string
  specificheContratto: string
  inizioPeriodo: string  // dd/MM/yyyy
  finePeriodo: string
  tipologiaGaranzie: string
  durataGaranzieDal: string
  durataGaranzieAl: string
  tipologiaPagamento: string
  caricaPDF: string | null
  note: string
}

interface RigaCamera {
  id: number
  tipologia: 'Categoria' | 'Struttura'
  categoriaStruttura: string  // numero categoria o nome struttura
  tipologiaCamera: string     // 'mista' / 'doppia' / 'singola' ...
  quantita: string            // '0,50 lotto'
  inizioPeriodo: string
  finePeriodo: string
}

interface RigaTariffa {
  id: number
  tipologia: 'Categoria' | 'Struttura'
  categoriaStruttura: string
  tipologiaTariffa: string  // '40,00 € a Persona (Adulti)'
  supplemento: string       // '10,00 €'
  sconto: string            // '3,00 %'
  mercato: string           // ISO code 'it', 'de'...
  inizioPeriodo: string
  finePeriodo: string
}

interface Data {
  id: number
  anagrafica: AnagraficaView
  camere: RigaCamera[]
  tariffe: RigaTariffa[]
}

const FALLBACK: Data = {
  id: 234,
  anagrafica: {
    nomeAzienda: 'Tour Operator Test',
    email: 'dev@sibyllanetwork.com',
    telefono: '3271745759',
    hotelPartner: 'Sibylla',
    specificheContratto: 'Gruppi',
    inizioPeriodo: '19/12/2025',
    finePeriodo: '31/12/2026',
    tipologiaGaranzie: 'Fidejussione bancaria',
    durataGaranzieDal: '19/12/2025',
    durataGaranzieAl: '31/12/2026',
    tipologiaPagamento: 'VCC',
    caricaPDF: null,
    note: '',
  },
  camere: [
    { id: 1, tipologia: 'Categoria', categoriaStruttura: '3', tipologiaCamera: 'mista', quantita: '0,50 lotto', inizioPeriodo: '19/12/2025', finePeriodo: '31/12/2026' },
    { id: 2, tipologia: 'Categoria', categoriaStruttura: '4', tipologiaCamera: 'mista', quantita: '0,50 lotto', inizioPeriodo: '19/12/2025', finePeriodo: '31/12/2026' },
  ],
  tariffe: [
    { id: 1, tipologia: 'Categoria', categoriaStruttura: '3', tipologiaTariffa: '40,00 € a Persona (Adulti)',   supplemento: '10,00 €', sconto: '3,00 %', mercato: 'it', inizioPeriodo: '19/12/2025', finePeriodo: '31/12/2026' },
    { id: 2, tipologia: 'Categoria', categoriaStruttura: '4', tipologiaTariffa: '40,00 € a Persona (Adulti)',   supplemento: '10,00 €', sconto: '3,00 %', mercato: 'it', inizioPeriodo: '19/12/2025', finePeriodo: '31/12/2026' },
    { id: 3, tipologia: 'Categoria', categoriaStruttura: '3', tipologiaTariffa: '40,00 € a Persona (Studenti)', supplemento: '10,00 €', sconto: '3,00 %', mercato: 'it', inizioPeriodo: '19/12/2025', finePeriodo: '31/12/2026' },
    { id: 4, tipologia: 'Categoria', categoriaStruttura: '4', tipologiaTariffa: '40,00 € a Persona (Studenti)', supplemento: '10,00 €', sconto: '3,00 %', mercato: 'it', inizioPeriodo: '19/12/2025', finePeriodo: '31/12/2026' },
  ],
}

export default function VisualizzaContratto({ navigate }: { navigate: (p: string) => void }) {
  const [data, setData] = useState<Data>(FALLBACK)
  const [openAnagrafica, setOpenAnagrafica] = useState(true)
  const [openCamere, setOpenCamere] = useState(false)
  const [openTariffe, setOpenTariffe] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('contratti/GetVenditaDettaglio', { method: 'POST', body: { id: data.id } })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const a = data.anagrafica

  return (
    <div className="visualizza-contratto">
      <PageHead
        title="Visualizza contratto di vendita"
        onBack={() => navigate('miei-contratti-v')}
      />

      {/* ─── ANAGRAFICA ──────────────────────────────────────────────────────── */}
      <Section
        title="Anagrafica"
        icon="pen-to-square"
        open={openAnagrafica}
        onToggle={() => setOpenAnagrafica((v) => !v)}
      >
        <div className="visualizza-contratto__anag-grid">
          <ReadField label="Nome azienda"         value={a.nomeAzienda} />
          <ReadField label="E-mail"               value={a.email} />
          <ReadField label="Telefono"             value={a.telefono} />
          <ReadField label="Hotel Partner"        value={a.hotelPartner} />
          <ReadField label="Specifiche contratto" value={a.specificheContratto} />
          <ReadField label="Inizio periodo"       value={a.inizioPeriodo} icon="calendar" />
          <ReadField label="Fine periodo"         value={a.finePeriodo}   icon="calendar" />
          <ReadField label="Tipologia garanzie"   value={a.tipologiaGaranzie} />
          <ReadField label="Durata garanzie dal"  value={a.durataGaranzieDal} icon="calendar" />
          <ReadField label="Fino al"              value={a.durataGaranzieAl}  icon="calendar" />
          <ReadField label="Tipologia pagamento"  value={a.tipologiaPagamento} />
          <ReadField label="Carica PDF"           value={a.caricaPDF ?? '-'} />
          <div className="visualizza-contratto__anag-note">
            <ReadField label="Note" value={a.note || '-'} />
          </div>
        </div>
      </Section>

      {/* ─── CAMERE ──────────────────────────────────────────────────────────── */}
      <Section
        title="Camere"
        icon="bed-front"
        open={openCamere}
        onToggle={() => setOpenCamere((v) => !v)}
      >
        <div className="sib-table-wrap">
          <table className="sib-table visualizza-contratto__table">
            <thead>
              <tr>
                <th>#</th>
                <th>Tipologia</th>
                <th>Categoria/Struttura</th>
                <th>Tipologia camera</th>
                <th>Quantità</th>
                <th>Inizio periodo</th>
                <th>Fine periodo</th>
                <th>Azione</th>
              </tr>
            </thead>
            <tbody>
              {data.camere.length === 0 ? (
                <tr><td colSpan={8} className="sib-empty">Nessuna camera configurata.</td></tr>
              ) : data.camere.map((c) => (
                <tr key={c.id}>
                  <td><i className="fa-light fa-file-lines visualizza-contratto__file" /></td>
                  <td>{c.tipologia}</td>
                  <td className="visualizza-contratto__td-c">{c.categoriaStruttura}</td>
                  <td className="visualizza-contratto__td-c">{c.tipologiaCamera}</td>
                  <td>{c.quantita}</td>
                  <td>{c.inizioPeriodo}</td>
                  <td>{c.finePeriodo}</td>
                  <td className="visualizza-contratto__td-c">
                    <button type="button" className="visualizza-contratto__icon-btn" aria-label="Visualizza">
                      <i className="fa-solid fa-eye" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ─── TARIFFE ─────────────────────────────────────────────────────────── */}
      <Section
        title="Tariffe"
        icon="euro-sign"
        open={openTariffe}
        onToggle={() => setOpenTariffe((v) => !v)}
      >
        <div className="sib-table-wrap">
          <table className="sib-table visualizza-contratto__table">
            <thead>
              <tr>
                <th>#</th>
                <th>Tipologia</th>
                <th>Categoria/Struttura</th>
                <th>Tipologia tariffa</th>
                <th>Supplemento</th>
                <th>Sconto</th>
                <th>&nbsp;</th>
                <th>Inizio periodo</th>
                <th>Fine periodo</th>
                <th>Azione</th>
              </tr>
            </thead>
            <tbody>
              {data.tariffe.length === 0 ? (
                <tr><td colSpan={10} className="sib-empty">Nessuna tariffa configurata.</td></tr>
              ) : data.tariffe.map((t) => (
                <tr key={t.id}>
                  <td><i className="fa-light fa-file-lines visualizza-contratto__file" /></td>
                  <td>{t.tipologia}</td>
                  <td className="visualizza-contratto__td-c">{t.categoriaStruttura}</td>
                  <td>{t.tipologiaTariffa}</td>
                  <td>{t.supplemento}</td>
                  <td>{t.sconto}</td>
                  <td className="visualizza-contratto__td-c">
                    <img
                      className="visualizza-contratto__flag"
                      src={`https://flagcdn.com/w40/${t.mercato}.png`}
                      srcSet={`https://flagcdn.com/w80/${t.mercato}.png 2x`}
                      alt={t.mercato.toUpperCase()}
                      title={t.mercato.toUpperCase()}
                      loading="lazy"
                    />
                  </td>
                  <td>{t.inizioPeriodo}</td>
                  <td>{t.finePeriodo}</td>
                  <td className="visualizza-contratto__td-c">
                    <button type="button" className="visualizza-contratto__icon-btn" aria-label="Visualizza">
                      <i className="fa-solid fa-eye" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}

// ─── SECTION ──────────────────────────────────────────────────────────────────
function Section({
  title, icon, open, onToggle, children,
}: {
  title: string; icon: string; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <section className="visualizza-contratto__section">
      <header className="visualizza-contratto__sec-head" onClick={onToggle}>
        <h2 className="visualizza-contratto__sec-title">
          <i className={`fa-light fa-${icon}`} /> {title}
        </h2>
        <button
          type="button"
          className="visualizza-contratto__toggle"
          onClick={(e) => { e.stopPropagation(); onToggle() }}
          aria-label={open ? 'Comprimi sezione' : 'Espandi sezione'}
        >
          <i className={`fa-light fa-${open ? 'minus' : 'plus'}`} />
        </button>
      </header>
      {open && <div className="visualizza-contratto__sec-body">{children}</div>}
    </section>
  )
}

// ─── READ FIELD ───────────────────────────────────────────────────────────────
function ReadField({ label, value, icon }: { label: string; value: string; icon?: string }) {
  return (
    <div className="visualizza-contratto__field">
      <span className="visualizza-contratto__field-label">{label}</span>
      <span className="visualizza-contratto__field-value">
        {value || '-'}
        {icon && <i className={`fa-light fa-${icon} visualizza-contratto__field-ico`} />}
      </span>
    </div>
  )
}
