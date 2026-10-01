import React, { useMemo, useState } from 'react'
import Ico from '../../../core/icons/Ico'
import { ASSIGNED_MODULI_INIT, CLIENTS_INIT, INTESTATARI_INIT, PACCHETTI_INIT } from '../constants'
import { fotoProfilo } from '../../../store/fotoProfili'
import { profiloDellaStruttura, useAccessStore } from '../../../store/useAccessStore'
import type { Cliente } from '../types'
import { PLATFORM_ADMIN_PLATFORM_PAGE } from '../../../navigation/platformAdminMenu'
import './AssistenzaHome.sass'

interface Props {
  navigate: (p: string) => void
}

const moduloLabel = (id: string) => PACCHETTI_INIT.find(m => m.id === id)?.label ?? id

export default function AssistenzaHome({ navigate }: Props) {
  const [search, setSearch] = useState('')
  const profiles = useAccessStore(s => s.profiles)

  // Le stesse strutture di "Accesso profili": ognuna con il suo amministratore e i moduli del suo contratto.
  const strutture = useMemo(() => CLIENTS_INIT.map(c => {
    const profilo = profiloDellaStruttura(c.id, profiles)
    return { struttura: c, amministratore: profilo?.nome ?? '', foto: fotoProfilo(profilo), moduli: profilo?.moduli ?? ASSIGNED_MODULI_INIT[c.id] ?? [] }
  }), [profiles])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return strutture
    return strutture.filter(x => x.struttura.nome.toLowerCase().includes(q) || x.amministratore.toLowerCase().includes(q))
  }, [search, strutture])

  const stats = useMemo(() => ({
    clienti: INTESTATARI_INIT.length,
    strutture: strutture.length,
    moduli: new Set(strutture.flatMap(x => x.moduli)).size,
  }), [strutture])

  // Avvia l'assistenza sulla struttura: tema oro + Admin Panel della struttura al centro.
  const enterCliente = (c: Cliente, moduli: string[]) => {
    useAccessStore.getState().startAssist({
      intestatarioId: INTESTATARI_INIT.find(i => i.struttureIds.includes(c.id))?.id ?? `str-${c.id}`,
      nome: c.nome,
      moduli,
      struttureIds: [c.id],
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
              placeholder="Cerca struttura o amministratore…"
            />
          </div>

          <div className="ahome__list">
            {filtered.length === 0 ? (
              <div className="ahome__empty">Nessun cliente corrisponde alla ricerca.</div>
            ) : filtered.map(({ struttura: c, amministratore, foto, moduli }) => (
              <button key={c.id} type="button" className="ahome__client" onClick={() => enterCliente(c, moduli)}>
                {foto
                  ? <img className="ahome__client-avatar ahome__client-avatar--foto" src={foto} alt="" />
                  : <span className="ahome__client-avatar">{c.nome.slice(0, 2).toUpperCase()}</span>}
                <span className="ahome__client-meta">
                  <span className="ahome__client-name">{c.nome}</span>
                  <span className="ahome__client-tags">
                    {amministratore && (
                      <span className="ahome__client-tag">
                        <Ico n="profile" s={10} c="var(--color-text-inactive)" />
                        {amministratore}
                      </span>
                    )}
                    {moduli.map(m => (
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
