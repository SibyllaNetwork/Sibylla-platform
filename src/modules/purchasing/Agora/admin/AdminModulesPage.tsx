/*
 * AdminModulesPage — sezione "Nuovo modulo" del pannello Amministrazione
 * piattaforma (Console Agorà). Crea/gestisce i MODULI della piattaforma
 * (insiemi di pagine + voci Configuratore) che vengono poi assegnati ai
 * clienti nel pannello admin del cliente.
 *
 * I dati sono nello store globale `useModuliStore`; la creazione/modifica
 * riusa la modale condivisa `ModuloModal` del SibyllaAdminPanel.
 */

import { useState } from 'react';
import { Icon } from '../ds/icon';
import { AdminPageHeader } from './AdminPageHeader';
import { useModuliStore } from '../../../../store/useModuliStore';
import ModuloModal from '../../../../admin/SibyllaAdminPanel/modals/ModuloModal/ModuloModal';
import type { Modulo, ModuloForm } from '../../../../admin/SibyllaAdminPanel/types';
import { ALL_CONFIGURATORE_IDS } from '../../../impostazioni/Configuratore/registry';
import './AdminModulesPage.css';

const EMPTY: ModuloForm = { nome: '', desc: '', pagesSet: new Set(), configItemsSet: new Set() };

export function AdminModulesPage() {
  const moduli       = useModuliStore((s) => s.moduli);
  const addModulo    = useModuliStore((s) => s.addModulo);
  const updateModulo = useModuliStore((s) => s.updateModulo);
  const removeModulo = useModuliStore((s) => s.removeModulo);

  const [open, setOpen]       = useState(false);
  const [editing, setEditing] = useState<Modulo | null>(null);
  const [form, setForm]       = useState<ModuloForm>(EMPTY);

  const openCreate = () => {
    setEditing(null);
    // Nuovo modulo: tutte le voci del Configuratore visibili di default.
    setForm({ nome: '', desc: '', pagesSet: new Set(), configItemsSet: new Set(ALL_CONFIGURATORE_IDS) });
    setOpen(true);
  };
  const openEdit = (m: Modulo) => {
    setEditing(m);
    setForm({
      nome: m.label,
      desc: m.desc || '',
      pagesSet: new Set(m.pages),
      configItemsSet: new Set(m.configuratoreItems ?? ALL_CONFIGURATORE_IDS),
    });
    setOpen(true);
  };
  const confirm = () => {
    if (!form.nome.trim() || form.pagesSet.size === 0) return;
    const configuratoreItems = Array.from(form.configItemsSet);
    if (editing) {
      updateModulo(editing.id, { label: form.nome, desc: form.desc, pages: Array.from(form.pagesSet), configuratoreItems });
    } else {
      addModulo({ label: form.nome, desc: form.desc, pages: Array.from(form.pagesSet), configuratoreItems });
    }
    setOpen(false);
  };
  const del = (m: Modulo) => {
    if (window.confirm(`Eliminare il modulo «${m.label}»?`)) removeModulo(m.id);
  };

  return (
    <div className="admin-modules">
      <AdminPageHeader
        title="Nuovo modulo"
        subtitle="Crea e gestisci i moduli della piattaforma: insiemi di pagine assegnabili ai clienti"
        actions={
          <button type="button" className="admin-modules__new" onClick={openCreate}>
            <Icon family="light" name="plus" /> Nuovo modulo
          </button>
        }
      />

      <div className="admin-modules__list">
        {moduli.length === 0 && (
          <div className="admin-modules__empty">Nessun modulo. Crea il primo con «Nuovo modulo».</div>
        )}
        {moduli.map((m) => (
          <div key={m.id} className="admin-modules__card">
            <div className="admin-modules__card-main">
              <div className="admin-modules__card-title">{m.label}</div>
              <div className="admin-modules__card-desc">{m.desc || 'Nessuna descrizione'}</div>
            </div>
            <span className="admin-modules__badge">{m.pages.length} pagine</span>
            <div className="admin-modules__actions">
              <button type="button" onClick={() => openEdit(m)} aria-label="Modifica modulo">
                <Icon family="light" name="pen" />
              </button>
              <button type="button" className="admin-modules__del" onClick={() => del(m)} aria-label="Elimina modulo">
                <Icon family="light" name="trash" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ModuloModal
        open={open}
        editing={editing}
        form={form}
        setForm={setForm}
        onClose={() => setOpen(false)}
        onConfirm={confirm}
      />
    </div>
  );
}
