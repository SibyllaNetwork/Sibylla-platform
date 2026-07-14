import React, { useEffect, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import Pagination from '../../../../../core/components/Pagination'
import './FbListaMenu.sass'

interface Menu { id: number; nome: string; dataCreazione: string; dettagli: string; ok: boolean }
interface Data { menus: Menu[]; totalPages: number; page: number }

const FALLBACK: Data = {
  menus: [
    { id: 1, nome: 'Menu Gennaio 2025',  dataCreazione: '2025-01-12', dettagli: 'Menu carne e pesce invernale', ok: true },
    { id: 2, nome: 'Menu Pesce',          dataCreazione: '2025-02-02', dettagli: 'Menu di pesce fresco',          ok: false },
    { id: 3, nome: 'Menu Vegetariano',    dataCreazione: '2025-02-15', dettagli: 'Menu vegetariano stagionale',   ok: true },
    { id: 4, nome: 'Menu Bambini',        dataCreazione: '2025-02-20', dettagli: 'Menu dedicato ai bambini',      ok: false },
  ],
  totalPages: 3, page: 1,
}

export default function FbListaMenu() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetFbListaMenu', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const fmt = (s: string) => {
    const d = new Date(s)
    if (Number.isNaN(d.valueOf())) return s
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <div className="fb-lista-menu">
      <div className="fb-lista-menu__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> Food &amp; Beverage <i className="fa-light fa-chevron-right" /> <strong>Lista Menu</strong>
      </div>

      <div className="fb-lista-menu__table-wrap">
        <table className="fb-lista-menu__table">
          <thead><tr><th>Nome</th><th>Data creazione</th><th>Dettagli</th><th>Allergeni</th><th>Azioni</th></tr></thead>
          <tbody>
            {data.menus.map((m) => (
              <tr key={m.id}>
                <td>{m.nome}</td><td>{fmt(m.dataCreazione)}</td><td>{m.dettagli}</td>
                <td>
                  <i className={`fa-solid fa-thumbs-${m.ok ? 'up' : 'down'} fb-lista-menu__thumb fb-lista-menu__thumb--${m.ok ? 'ok' : 'ko'}`} />
                </td>
                <td className="fb-lista-menu__row-actions">
                  <button type="button" className="sib-btn sib-btn--icon"><i className="fa-solid fa-pen" /></button>
                  <button type="button" className="sib-btn sib-btn--icon"><i className="fa-solid fa-eye" /></button>
                  <button type="button" className="sib-btn sib-btn--icon"><i className="fa-solid fa-trash" /></button>
                  <button type="button" className="sib-btn sib-btn--icon"><i className="fa-solid fa-book-open" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="fb-lista-menu__pagination">
        <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
      </div>
    </div>
  )
}
