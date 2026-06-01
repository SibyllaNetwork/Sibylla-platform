import React, { useEffect, useMemo, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import './MappingSegmentoMercato.sass'

interface Sib { id: number; nome: string }
interface Hotel { id: number; nome: string; idSibylla: number | null }
interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  isPms: boolean
  segmentiSibylla: Sib[]
  segmentiHotel: Hotel[]
}

const SEGMENT_META: Record<string, { icon: string; tone: string; descr: string }> = {
  'Dirette':       { icon: 'globe',         tone: 'blue',   descr: 'Prenotazioni dirette dal sito o reception' },
  'Corporate':     { icon: 'briefcase',     tone: 'slate',  descr: 'Aziende e contratti business'              },
  'B2C':           { icon: 'user',          tone: 'orange', descr: 'Online travel agency e portali'            },
  'Gruppi':        { icon: 'users',         tone: 'violet', descr: 'Tour operator e gruppi organizzati'        },
  'B2B':           { icon: 'handshake',     tone: 'green',  descr: 'Tour operator e canali B2B'                },
  'Complementary': { icon: 'gift',          tone: 'pink',   descr: 'Servizi accessori e cortesie'              },
}

const FALLBACK: Data = {
  Strutture: [],
  StrutturaId: null,
  isPms: false,
  segmentiSibylla: [
    { id: 1, nome: 'Dirette'       },
    { id: 2, nome: 'Corporate'     },
    { id: 3, nome: 'B2C'           },
    { id: 4, nome: 'Gruppi'        },
    { id: 5, nome: 'B2B'           },
    { id: 6, nome: 'Complementary' },
  ],
  segmentiHotel: [
    { id: 1, nome: 'WEB',         idSibylla: 1    },
    { id: 2, nome: 'BOOKING',     idSibylla: 3    },
    { id: 3, nome: 'EXPEDIA',     idSibylla: 3    },
    { id: 4, nome: 'CORP',        idSibylla: 2    },
    { id: 5, nome: 'GRUPPI 2026', idSibylla: null },
    { id: 6, nome: 'OMAGGI',      idSibylla: null },
  ],
}

export default function MappingSegmentoMercato() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetSegmentiMapping', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { /* silent */ })
    return () => { cancelled = true }
  }, [])

  const updateHotel = (id: number, idSibylla: number | null) => {
    setData({ ...data, segmentiHotel: data.segmentiHotel.map((h) => h.id === id ? { ...h, idSibylla } : h) })
  }

  const save = async () => {
    setSaving(true)
    try { await apiFetchSibylla('configura/SetSegmentiMapping', { method: 'POST', body: data }) } catch { /* silent */ }
    setSaving(false)
  }

  const togglePms = () => setData({ ...data, isPms: !data.isPms })

  const stats = useMemo(() => {
    const total   = data.segmentiHotel.length
    const mapped  = data.segmentiHotel.filter(h => h.idSibylla != null).length
    return { total, mapped }
  }, [data.segmentiHotel])

  const sibyllaById = (id: number | null) => data.segmentiSibylla.find(s => s.id === id) ?? null

  return (
    <div className="mapping-segmento">
      <div className="mapping-segmento__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> <strong>Mapping segmenti</strong>
      </div>

      <div className="mapping-segmento__intro">
        <div className="mapping-segmento__intro-icon">
          <i className="fa-light fa-diagram-project" aria-hidden="true" />
        </div>
        <div className="mapping-segmento__intro-text">
          <h3>Segmenti standard di Sibylla</h3>
          <p>
            Sono 6 categorie con cui Sibylla classifica le prenotazioni. Se la struttura
            è collegata a un PMS, qui puoi mappare i segmenti del PMS verso questi standard.
          </p>
        </div>
        <label className="mapping-segmento__pms-toggle">
          <input
            type="checkbox"
            className="sib-checkbox"
            checked={data.isPms}
            onChange={togglePms}
          />
          <span>Mappa segmenti PMS</span>
        </label>
      </div>

      <div className="mapping-segmento__cards">
        {data.segmentiSibylla.map((s) => {
          const meta = SEGMENT_META[s.nome] ?? { icon: 'tag', tone: 'slate', descr: '' }
          const linkedCount = data.isPms
            ? data.segmentiHotel.filter(h => h.idSibylla === s.id).length
            : 0
          return (
            <div
              key={s.id}
              className={`mapping-segmento__card mapping-segmento__card--${meta.tone}`}
            >
              <div className="mapping-segmento__card-icon">
                <i className={`fa-light fa-${meta.icon}`} aria-hidden="true" />
              </div>
              <div className="mapping-segmento__card-body">
                <div className="mapping-segmento__card-name">{s.nome}</div>
                <div className="mapping-segmento__card-descr">{meta.descr}</div>
              </div>
              {data.isPms && (
                <div className="mapping-segmento__card-badge" title="Segmenti PMS collegati">
                  {linkedCount}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {data.isPms && (
        <>
          <div className="mapping-segmento__map-header">
            <h3>Mappa segmenti PMS</h3>
            <div className="mapping-segmento__progress">
              <span className="mapping-segmento__progress-text">
                <strong>{stats.mapped}</strong> di {stats.total} mappati
              </span>
              <div className="mapping-segmento__progress-bar">
                <div
                  className="mapping-segmento__progress-bar-fill"
                  style={{ '--fill': `${stats.total === 0 ? 0 : (stats.mapped / stats.total) * 100}%` } as React.CSSProperties}
                />
              </div>
            </div>
          </div>

          <div className="mapping-segmento__table-wrap">
            <table className="mapping-segmento__table">
              <thead>
                <tr>
                  <th>Segmento PMS</th>
                  <th className="mapping-segmento__th--arrow" aria-hidden="true" />
                  <th>Segmento Sibylla</th>
                  <th className="mapping-segmento__th--stato">Stato</th>
                </tr>
              </thead>
              <tbody>
                {data.segmentiHotel.map((h) => {
                  const sib = sibyllaById(h.idSibylla)
                  const meta = sib ? SEGMENT_META[sib.nome] : null
                  return (
                    <tr key={h.id}>
                      <td className="mapping-segmento__td--name">{h.nome}</td>
                      <td className="mapping-segmento__td--arrow">
                        <i className="fa-light fa-arrow-right-long" aria-hidden="true" />
                      </td>
                      <td>
                        <select
                          className="sib-select sib-select--dense mapping-segmento__select"
                          value={h.idSibylla ?? ''}
                          onChange={(e) => updateHotel(h.id, e.target.value ? Number(e.target.value) : null)}
                          aria-label={`Mapping ${h.nome}`}
                        >
                          <option value="">— Non mappato —</option>
                          {data.segmentiSibylla.map((s) => (
                            <option key={s.id} value={s.id}>{s.nome}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {sib && meta ? (
                          <span className={`mapping-segmento__chip mapping-segmento__chip--${meta.tone}`}>
                            <i className="fa-light fa-check" aria-hidden="true" />
                            <span>Mappato</span>
                          </span>
                        ) : (
                          <span className="mapping-segmento__chip mapping-segmento__chip--empty">
                            <i className="fa-light fa-circle-dashed" aria-hidden="true" />
                            <span>Da mappare</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mapping-segmento__actions">
            <button
              type="button"
              className="sib-btn sib-btn--primary"
              onClick={save}
              disabled={saving}
            >
              Salva mapping
            </button>
          </div>
        </>
      )}
    </div>
  )
}
