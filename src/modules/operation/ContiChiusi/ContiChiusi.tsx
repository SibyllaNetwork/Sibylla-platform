import React, { useEffect, useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import { apiFetchSibylla } from '../../../services/api'
import { DateRangeField, SelectField } from '../../../core/components/form'
import './ContiChiusi.sass'

interface ContoChiuso {
  id: number
  prenotazioneNum: string
  camera: string
  ospite: string
  dataChiusura: string
  importo: number
}

interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  conti: ContoChiuso[]
}

const FALLBACK: Data = {
  Strutture: [
    { Id: 1, nome: 'Hotel Tutorial' },
    { Id: 2, nome: 'Hotel Azzurro Mare' },
  ],
  StrutturaId: 2,
  conti: [],
}

export default function ContiChiusi({ navigate }: { navigate: (p: string) => void }) {
  const [data, setData] = useState<Data>(FALLBACK)
  const [search, setSearch] = useState('')
  const [dataDa, setDataDa] = useState('2026-04-23')
  const [dataA, setDataA] = useState('2026-04-30')

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('frontoffice/GetContiChiusi', {
      method: 'POST',
      body: { strutturaId: data.StrutturaId, da: dataDa, a: dataA },
    })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataDa, dataA, data.StrutturaId])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return data.conti
    const isCamera = q.startsWith('#')
    const term = isCamera ? q.slice(1) : q
    return data.conti.filter((r) =>
      isCamera
        ? r.camera.toLowerCase().includes(term)
        : r.prenotazioneNum.includes(term) ||
          r.camera.toLowerCase().includes(term) ||
          r.ospite.toLowerCase().includes(term),
    )
  }, [data.conti, search])

  return (
    <div className="conti-chiusi">
      <BtnBack />
      <PageHeader
        title="Conti chiusi"
        subtitle="Storico dei conti chiusi e fatturati"
      />

      <div className="conti-chiusi__bar">
        <SelectField
          className="conti-chiusi__field conti-chiusi__select"
          name="struttura"
          label="Struttura"
          value={data.StrutturaId ?? ''}
          onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}
          options={data.Strutture.map((s) => ({ value: s.Id, label: s.nome }))}
        />

        <DateRangeField
          className="conti-chiusi__field"
          nameFrom="dataDa"
          nameTo="dataA"
          label="Periodo"
          valueFrom={dataDa}
          valueTo={dataA}
          onChangeFrom={(e) => setDataDa(e.target.value)}
          onChangeTo={(e) => setDataA(e.target.value)}
        />

        <div className="conti-chiusi__field-raw conti-chiusi__field--grow">
          <label>Cerca</label>
          <div className="conti-chiusi__search">
            <input
              type="search"
              className="sib-input"
              placeholder="Prenotazione, camera (anteponendo #) o ospite"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <i className="fa-light fa-magnifying-glass conti-chiusi__search-ico" />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="conti-chiusi__empty">Nessun ospite presente.</div>
      ) : (
        <div className="sib-table-wrap">
          <table className="sib-table">
            <thead>
              <tr>
                <th>Prenotazione</th>
                <th>Camera</th>
                <th>Ospite</th>
                <th>Data chiusura</th>
                <th className="conti-chiusi__th-num">Importo</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>{r.prenotazioneNum}</td>
                  <td>{r.camera}</td>
                  <td>{r.ospite}</td>
                  <td>{r.dataChiusura}</td>
                  <td className="conti-chiusi__td-num">{r.importo.toFixed(2).replace('.', ',')} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
