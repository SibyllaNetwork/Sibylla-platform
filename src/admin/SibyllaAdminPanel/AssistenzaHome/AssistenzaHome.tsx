import React, { useMemo, useState } from 'react'
import Ico from '../../../core/icons/Ico'
import { INTESTATARI_INIT, PACCHETTI_INIT } from '../constants'
import { useAccessStore } from '../../../store/useAccessStore'
import type { Intestatario } from '../types'
import { PLATFORM_ADMIN_PLATFORM_PAGE } from '../../../navigation/platformAdminMenu'
import './AssistenzaHome.sass'

interface Props {
  navigate: (p: string) => void
}

const moduloLabel = (id: string) => PACCHETTI_INIT.find(m => m.id === id)?.label ?? id

export default function AssistenzaHome({ navigate }: Props) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return INTESTATARI_INIT
    return INTESTATARI_INIT.filter(i => i.nome.toLowerCase().includes(q))
  }, [search])

  const stats = useMemo(() => ({
    clienti: INTESTATARI_INIT.length,
    strutture: INTESTATARI_INIT.reduce((s, i) => s + i.struttureIds.length, 0),
    moduli: new Set(INTESTATARI_INIT.flatMap(i => i.moduli)).size,
  }), [])

  // Avvia l'assistenza: tema oro + Admin Panel del cliente al centro.
  const enterCliente = (i: Intestatario) => {
    useAccessStore.getState().startAssist({
      intestatarioId: i.id,
      nome: i.nome,
      moduli: i.moduli,
      struttureIds: i.struttureIds,
    })
    navigate('assist-admin')
  }

  return (
    <div className="ahome">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <header className="ahome__hero">
        <div className="ahome__hero-glow" aria-hidden="true" />
        <div className="ahome__hero-main">
          <span className="ahome__hero-mark"><Ico n="layers" s={24} c="#fff" /></span>
          <div>
            <span className="ahome__eyebrow">Console amministrativa</span>
            <h1 className="ahome__title">Sibylla System Administration Console</h1>
            <p className="ahome__subtitle">
              Assisti i clienti della piattaforma e gestisci le funzionalità comuni, da un unico pannello.
            </p>
          </div>
        </div>
        <div className="ahome__stats">
          <div className="ahome__stat">
            <span className="ahome__stat-val">{stats.clienti}</span>
            <span className="ahome__stat-lbl">Clienti</span>
          </div>
          <div className="ahome__stat">
            <span className="ahome__stat-val">{stats.strutture}</span>
            <span className="ahome__stat-lbl">Strutture</span>
          </div>
          <div className="ahome__stat">
            <span className="ahome__stat-val">{stats.moduli}</span>
            <span className="ahome__stat-lbl">Moduli</span>
          </div>
        </div>
      </header>

      {/* ── Opzioni ──────────────────────────────────────────────────────── */}
      <div className="ahome__grid">
        {/* Gestisci un cliente */}
        <section className="ahome__card ahome__card--clienti">
          <div className="ahome__card-top">
            <span className="ahome__card-ico ahome__card-ico--gold"><Ico n="profile" s={20} c="#fff" /></span>
            <div className="ahome__card-head">
              <h2 className="ahome__card-title">Gestisci un cliente</h2>
              <p className="ahome__card-desc">Entra nell'account di un cliente per configurarne il prodotto e vederne le pagine.</p>
            </div>
          </div>

          <div className="ahome__search">
            <Ico n="search" s={14} c="var(--color-text-disabled)" />
            <input
              className="sib-search-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca cliente per nome…"
            />
          </div>

          <div className="ahome__list">
            {filtered.length === 0 ? (
              <div className="ahome__empty">Nessun cliente corrisponde alla ricerca.</div>
            ) : filtered.map(i => (
              <button key={i.id} type="button" className="ahome__client" onClick={() => enterCliente(i)}>
                <span className="ahome__client-avatar">{i.nome.slice(0, 2).toUpperCase()}</span>
                <span className="ahome__client-meta">
                  <span className="ahome__client-name">{i.nome}</span>
                  <span className="ahome__client-tags">
                    <span className="ahome__client-tag">
                      <Ico n="bed" s={10} c="var(--color-text-inactive)" />
                      {i.struttureIds.length} {i.struttureIds.length === 1 ? 'struttura' : 'strutture'}
                    </span>
                    {i.moduli.map(m => (
                      <span key={m} className="ahome__client-mod">{moduloLabel(m)}</span>
                    ))}
                  </span>
                </span>
                <span className="ahome__client-go"><Ico n="arrow-right" s={14} c="currentColor" /></span>
              </button>
            ))}
          </div>
        </section>

        {/* Amministrazione piattaforma */}
        <section className="ahome__card ahome__card--platform">
          <div className="ahome__card-top">
            <span className="ahome__card-ico ahome__card-ico--platform"><Ico n="gear" s={20} c="#fff" /></span>
            <div className="ahome__card-head">
              <h2 className="ahome__card-title">Amministrazione piattaforma</h2>
              <p className="ahome__card-desc">Funzioni comuni a tutti gli utenti: clienti, commissioni, bookings e configurazioni.</p>
            </div>
          </div>

          <ul className="ahome__feat">
            <li><span className="ahome__feat-dot"><Ico n="check" s={11} c="#fff" /></span> Gestione Clienti e aziende</li>
            <li><span className="ahome__feat-dot"><Ico n="check" s={11} c="#fff" /></span> Commissioni e bonifici</li>
            <li><span className="ahome__feat-dot"><Ico n="check" s={11} c="#fff" /></span> Bookings e Tableau Extra</li>
            <li><span className="ahome__feat-dot"><Ico n="check" s={11} c="#fff" /></span> Configurazioni e Sibylla admin</li>
          </ul>

          <button type="button" className="ahome__platform-btn" onClick={() => navigate(PLATFORM_ADMIN_PLATFORM_PAGE)}>
            <Ico n="gear" s={14} c="#fff" />
            Apri amministrazione piattaforma
            <span className="ahome__platform-arrow"><Ico n="arrow-right" s={14} c="#fff" /></span>
          </button>
        </section>
      </div>
    </div>
  )
}
