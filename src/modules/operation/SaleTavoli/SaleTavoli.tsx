// ─── Sale e tavoli ────────────────────────────────────────────────────────────
// Pagina Food & Beverage in stile Planner: a sinistra la PLANIMETRIA della sala
// (griglia con tavoli ed elementi), a destra il DETTAGLIO ingrandito del tavolo
// selezionato. Due modalità:
//  • Composizione — si crea la sala: aggiunta/spostamento tavoli (capienza+numero)
//    ed elementi (bar, cucina, ingresso…).
//  • Servizio — il capo sala gestisce: assegna/sposta/prenota tavoli, imposta lo
//    stato e annota allergie/intolleranze.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import PageHead from '../../../core/components/PageHead';
import { InputField, SelectField, TextareaField } from '../../../core/components/form';
import { useConfirmStore } from '../../../store/useConfirmStore';
import { toast } from '../../../core/components/Toast/useToast';
import {
  useSaleStore,
  SALA_EL_META,
  TAVOLO_STATO_META,
  CAMERIERI,
  SalaElementKind,
  SalaElement,
  TavoloForma,
  TavoloStato,
  Tavolo,
  Sala,
} from '../../../store/useSaleStore';
import { useClientiStore } from '../../../store/useClientiStore';
import { PRENS } from '../planner/planner.data';
import ClientiModal from './ClientiModal';
import './SaleTavoli.sass';

// Camere/soggiorni "in casa" (ospiti con check-in effettuato): sorgente per
// l'addebito del conto alla camera. Derivate dai dati Planner, deduplicate.
const CAMERE_IN_CASA: { numero: string; ospite: string }[] = (() => {
  const seen = new Set<string>();
  const out: { numero: string; ospite: string }[] = [];
  PRENS.filter(p => p.stato === 'checkin' || p.stato === 'checkin_p').forEach(p => {
    if (seen.has(p.numeroCamera)) return;
    seen.add(p.numeroCamera);
    out.push({ numero: p.numeroCamera, ospite: p.cliente || p.nominativo });
  });
  return out.sort((a, b) => (parseInt(a.numero, 10) || 0) - (parseInt(b.numero, 10) || 0));
})();

const CELL = 40;
const SEAT_GAP = 7;   // distanza sedia dal bordo tavolo (px)

// Posizioni delle sedie attorno a un tavolo sulla planimetria (coordinate in px
// relative al centro del tavolo): lungo i due lati lunghi per i rettangolari,
// distribuite in cerchio per rotondi/quadrati.
// rot = rotazione (deg) così lo schienale della sedia guarda verso l'esterno
const canvasSeats = (t: Tavolo): { x: number; y: number; rot: number }[] => {
  const W = t.w * CELL - 8, H = t.h * CELL - 8, hw = W / 2, hh = H / 2;
  const out: { x: number; y: number; rot: number }[] = [];
  if (t.forma === 'rettangolare') {
    const top = Math.ceil(t.capienza / 2), bot = t.capienza - top;
    for (let i = 0; i < top; i++) out.push({ x: -hw + (W * (i + 1)) / (top + 1), y: -(hh + SEAT_GAP), rot: 0 });
    for (let i = 0; i < bot; i++) out.push({ x: -hw + (W * (i + 1)) / (bot + 1), y: hh + SEAT_GAP, rot: 180 });
  } else {
    for (let i = 0; i < t.capienza; i++) {
      const a = (i / t.capienza) * Math.PI * 2 - Math.PI / 2;
      out.push({ x: Math.cos(a) * (hw + SEAT_GAP), y: Math.sin(a) * (hh + SEAT_GAP), rot: (a * 180) / Math.PI + 90 });
    }
  }
  return out;
};

const FORME: TavoloForma[] = ['rotondo', 'quadrato', 'rettangolare'];
const CAPIENZE = [2, 4, 6, 8];
const STATI: TavoloStato[] = ['libero', 'occupato', 'riservato', 'conto', 'pulizia'];

const PRINT_STATO_LABEL = TAVOLO_STATO_META;  // alias per la stampa

interface Props { navigate?: (page: string) => void }

const SaleTavoli: React.FC<Props> = () => {
  const sale = useSaleStore(s => s.sale);
  const addTavolo = useSaleStore(s => s.addTavolo);
  const addElemento = useSaleStore(s => s.addElemento);
  const updateTavolo = useSaleStore(s => s.updateTavolo);
  const updateElemento = useSaleStore(s => s.updateElemento);
  const moveItem = useSaleStore(s => s.moveItem);
  const removeItem = useSaleStore(s => s.removeItem);
  const setGrid = useSaleStore(s => s.setGrid);
  const addSala = useSaleStore(s => s.addSala);
  const renameSala = useSaleStore(s => s.renameSala);
  const removeSala = useSaleStore(s => s.removeSala);
  const unisciTavoli = useSaleStore(s => s.unisciTavoli);
  const separaGruppo = useSaleStore(s => s.separaGruppo);
  const trasferisci = useSaleStore(s => s.trasferisci);
  const confirm = useConfirmStore(s => s.confirm);

  const [mode, setMode] = useState<'compose' | 'service'>('service');
  const [salaId, setSalaId] = useState(sale[0]?.id ?? '');
  const [newForma, setNewForma] = useState<TavoloForma>('quadrato');
  const [selId, setSelId] = useState<string | null>(null);
  const [showClienti, setShowClienti] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const [moveMode, setMoveMode] = useState<string | null>(null);

  const sala = sale.find(s => s.id === salaId) ?? sale[0];
  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; ox: number; oy: number; moved: boolean } | null>(null);

  useEffect(() => { if (sala && salaId !== sala.id) setSalaId(sala.id); }, [sala, salaId]);
  useEffect(() => { setSelId(null); setMenu(null); setMoveMode(null); }, [salaId, mode]);

  // chiudi il menu contestuale al click fuori / Esc
  useEffect(() => {
    if (!menu && !moveMode) return;
    const close = () => { setMenu(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenu(null); setMoveMode(null); } };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('keydown', onKey); };
  }, [menu, moveMode]);

  const selTavolo = sala?.tavoli.find(t => t.id === selId) ?? null;
  const selEl = sala?.elementi.find(e => e.id === selId) ?? null;

  // ── Drag & drop (sposta tavoli/elementi sulla griglia) ──
  useEffect(() => {
    if (!sala) return;
    const onMove = (e: PointerEvent) => {
      const d = drag.current; const c = canvasRef.current;
      if (!d || !c) return;
      const r = c.getBoundingClientRect();
      const cx = Math.round((e.clientX - r.left) / CELL - d.ox);
      const cy = Math.round((e.clientY - r.top) / CELL - d.oy);
      d.moved = true;
      moveItem(sala.id, d.id, cx, cy);
    };
    const onUp = () => { drag.current = null; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, [sala, moveItem]);

  if (!sala) return <div className="sale"><PageHead title="Sale e tavoli" subtitle="Nessuna sala" /></div>;

  const startDrag = (e: React.PointerEvent, id: string, ix: number, iy: number) => {
    if (e.button !== 0 || moveMode) return;   // solo tasto sinistro; niente drag in modalità "sposta"
    const r = canvasRef.current!.getBoundingClientRect();
    drag.current = { id, ox: (e.clientX - r.left) / CELL - ix, oy: (e.clientY - r.top) / CELL - iy, moved: false };
    setSelId(id);
  };

  // apre il menu contestuale su un tavolo (tasto destro)
  const openMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    setMoveMode(null);
    setSelId(id);
    setMenu({ x: e.clientX, y: e.clientY, id });
  };

  // posiziona il tavolo (modalità "sposta" da menu): click su una cella libera
  const placeMove = (e: React.PointerEvent) => {
    if (!moveMode) return;
    const tv = sala.tavoli.find(t => t.id === moveMode);
    const r = canvasRef.current!.getBoundingClientRect();
    const cx = Math.max(0, Math.min(sala.cols - (tv?.w ?? 1), Math.round((e.clientX - r.left) / CELL - (tv?.w ?? 1) / 2)));
    const cy = Math.max(0, Math.min(sala.rows - (tv?.h ?? 1), Math.round((e.clientY - r.top) / CELL - (tv?.h ?? 1) / 2)));
    moveItem(sala.id, moveMode, cx, cy);
    setMoveMode(null);
    toast.success('Tavolo spostato');
  };

  const coperti = sala.tavoli.reduce((m, t) => m + t.capienza, 0);
  const cnt = (st: TavoloStato) => sala.tavoli.filter(t => t.stato === st).length;
  const lib = cnt('libero'), occ = cnt('occupato'), ris = cnt('riservato'), conto = cnt('conto');

  const del = async (id: string) => {
    const tv = sala.tavoli.find(t => t.id === id);
    const ok = await confirm({
      title: 'Rimuovi elemento',
      message: tv ? `Rimuovere il tavolo n. ${tv.numero}?` : 'Rimuovere questo elemento dalla sala?',
      confirmLabel: 'Rimuovi', danger: true,
    });
    if (!ok) return;
    removeItem(sala.id, id);
    setSelId(null);
  };

  const delSala = async () => {
    if (sale.length <= 1) return;
    const ok = await confirm({
      title: 'Elimina sala',
      message: `Eliminare la sala "${sala.nome}" con tutti i suoi tavoli? L'operazione non è reversibile.`,
      confirmLabel: 'Elimina', danger: true,
    });
    if (!ok) return;
    const next = sale.find(s => s.id !== sala.id);
    removeSala(sala.id);
    if (next) setSalaId(next.id);
    toast.success('Sala eliminata');
  };

  // Stampa disposizione sala (SVG + legenda stati)
  const printPlan = () => {
    const C = 40;
    const W = sala.cols * C, H = sala.rows * C;
    const esc = (s: unknown) => String(s ?? '').replace(/[&<>]/g, c => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
    const els = sala.elementi.map(el => {
      const x = el.x * C, y = el.y * C, w = el.w * C, h = el.h * C;
      return `<rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" rx="6" fill="#eef2f6" stroke="#8aa0b4" stroke-width="1" stroke-dasharray="4 3"/><text x="${x + w / 2}" y="${y + h / 2 + 3}" text-anchor="middle" font-size="10" fill="#43617c">${esc(el.label ?? '')}</text>`;
    }).join('');
    const tavs = sala.tavoli.map(t => {
      const x = t.x * C, y = t.y * C, w = t.w * C, h = t.h * C, cx = x + w / 2, cy = y + h / 2;
      const col = TAVOLO_STATO_META[t.stato].color;
      const shape = t.forma === 'rotondo'
        ? `<ellipse cx="${cx}" cy="${cy}" rx="${w / 2 - 6}" ry="${h / 2 - 6}" fill="#fff" stroke="${col}" stroke-width="2.5"/>`
        : `<rect x="${x + 5}" y="${y + 5}" width="${w - 10}" height="${h - 10}" rx="${t.forma === 'quadrato' ? 10 : 12}" fill="#fff" stroke="${col}" stroke-width="2.5"/>`;
      const nom = t.nominativo ? `<text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="9" fill="#6E7175">${esc(t.nominativo)}</text>` : '';
      return `${shape}<text x="${cx}" y="${cy - 1}" text-anchor="middle" font-size="15" font-weight="700" fill="#204769">${esc(t.numero)}</text><text x="${cx}" y="${cy + 9}" text-anchor="middle" font-size="8.5" fill="#6E7175">${t.capienza} cop.</text>${nom}`;
    }).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#fff"/>${els}${tavs}</svg>`;
    const legend = STATI.map(s => `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:14px"><span style="width:11px;height:11px;border-radius:3px;background:${PRINT_STATO_LABEL[s].color};display:inline-block"></span>${PRINT_STATO_LABEL[s].label}</span>`).join('');
    const win = window.open('', '_blank', 'width=1000,height=760');
    if (!win) { toast.error('Consenti i popup del browser per stampare'); return; }
    win.document.write(`<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Sala — ${esc(sala.nome)}</title><style>@page{margin:12mm}body{margin:0;font-family:Poppins,Arial,sans-serif;color:#204769}.wrap{padding:18px}h1{font-size:16px;margin:0 0 2px}p{font-size:12px;color:#6E7175;margin:0 0 8px}.leg{font-size:11px;margin:8px 0 14px}svg{max-width:100%;height:auto;border:1px solid #e6eaee;border-radius:8px}</style></head><body class="wrap"><h1>Sala — ${esc(sala.nome)}</h1><p>${sala.tavoli.length} tavoli · ${sala.tavoli.reduce((m, t) => m + t.capienza, 0)} coperti</p><div class="leg">${legend}</div>${svg}<scr` + `ipt>window.onload=function(){setTimeout(function(){window.print()},200)}</scr` + `ipt></body></html>`);
    win.document.close();
  };

  return (
    <div className="sale">
      <PageHead
        title="Sale e tavoli"
        subtitle={`Food & Beverage · ${sala.nome}`}
        actions={
          <div className="sale__actions">
            <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={() => setShowClienti(true)}>
              <i className="fa-solid fa-address-book" /> Clienti
            </button>
            <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={printPlan}>
              <i className="fa-solid fa-print" /> Stampa
            </button>
            <div className="sale__modes" role="tablist" aria-label="Modalità">
              <button type="button" role="tab" aria-selected={mode === 'compose'}
                className={`sale__mode${mode === 'compose' ? ' is-active' : ''}`} onClick={() => setMode('compose')}>
                <i className="fa-solid fa-pen-ruler" /> Composizione
              </button>
              <button type="button" role="tab" aria-selected={mode === 'service'}
                className={`sale__mode${mode === 'service' ? ' is-active' : ''}`} onClick={() => setMode('service')}>
                <i className="fa-solid fa-bell-concierge" /> Servizio
              </button>
            </div>
          </div>
        }
      />

      {/* barra: sala + riepilogo */}
      <div className="sale__bar">
        <div className="sale__bar-sala">
          <SelectField name="sala" label="Sala" value={sala.id} onChange={e => setSalaId(e.target.value)}
            options={sale.map(s => ({ value: s.id, label: s.nome }))} />
        </div>
        {mode === 'compose' && (
          <div className="sale__bar-manage">
            <InputField name="sala-nome" label="Nome sala" value={sala.nome} onChange={e => renameSala(sala.id, e.target.value)} />
            <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={() => { const id = addSala('Nuova sala'); setSalaId(id); }}>
              <i className="fa-solid fa-plus" /> Nuova sala
            </button>
            {sale.length > 1 && (
              <button type="button" className="sib-btn sib-btn--danger sib-btn--sm" onClick={delSala}>
                <i className="fa-solid fa-trash" /> Elimina sala
              </button>
            )}
          </div>
        )}
        <div className="sale__stats">
          <span className="sale__stat"><b>{sala.tavoli.length}</b> tavoli</span>
          <span className="sale__stat"><b>{coperti}</b> coperti</span>
          <span className="sale__stat sale__stat--lib"><b>{lib}</b> liberi</span>
          <span className="sale__stat sale__stat--occ"><b>{occ}</b> occupati</span>
          <span className="sale__stat sale__stat--ris"><b>{ris}</b> prenotati</span>
          <span className="sale__stat sale__stat--conto"><b>{conto}</b> conto</span>
        </div>
      </div>

      <div className="sale__body">
        {/* ── PLANIMETRIA (sinistra) ─────────────────────────────────────────── */}
        <div className="sale__plan">
          <div
            ref={canvasRef}
            className={`sale__canvas${mode === 'compose' ? ' is-compose' : ''}${moveMode ? ' is-moving' : ''}`}
            style={{ '--cols': sala.cols, '--rows': sala.rows, '--cell': `${CELL}px` } as React.CSSProperties}
            onPointerDown={e => { if (e.target === e.currentTarget) setSelId(null); }}
          >
            {moveMode && (
              <div className="sale__moveovl" onPointerDown={e => { e.stopPropagation(); placeMove(e); }}>
                <span className="sale__moveovl-hint"><i className="fa-solid fa-hand-pointer" /> Clicca dove posizionare il tavolo · <kbd>Esc</kbd> annulla</span>
              </div>
            )}
            {/* elementi sala (bar, cucina…) */}
            {sala.elementi.map(el => (
              <div
                key={el.id}
                className={`sale__el sale__el--${el.kind}${selId === el.id ? ' is-sel' : ''}`}
                style={{ '--x': el.x, '--y': el.y, '--w': el.w, '--h': el.h } as React.CSSProperties}
                onPointerDown={e => startDrag(e, el.id, el.x, el.y)}
              >
                <i className={`fa-solid ${SALA_EL_META[el.kind].icon}`} />
                <span>{el.label}</span>
              </div>
            ))}
            {/* tavoli */}
            {sala.tavoli.map(t => (
              <div
                key={t.id}
                className={`sale__tav sale__tav--${t.forma} is-${t.stato}${selId === t.id ? ' is-sel' : ''}${t.gruppo ? ' is-uni' : ''}`}
                style={{ '--x': t.x, '--y': t.y, '--w': t.w, '--h': t.h } as React.CSSProperties}
                onPointerDown={e => startDrag(e, t.id, t.x, t.y)}
                onContextMenu={e => openMenu(e, t.id)}
                title={`Tavolo ${t.numero} · ${t.capienza} coperti${t.gruppo ? ' · unito' : ''}`}
              >
                {canvasSeats(t).map((s, i) => (
                  <span key={i} className="sale__tav-seat"
                    style={{ '--sx': `${s.x}px`, '--sy': `${s.y}px`, '--rot': `${s.rot}deg` } as React.CSSProperties} />
                ))}
                <span className="sale__tav-surface" aria-hidden="true" />
                <span className="sale__tav-num">{t.numero}</span>
                <span className="sale__tav-cap"><i className="fa-solid fa-chair" /> {t.capienza}</span>
                {t.nominativo && <span className="sale__tav-nom">{t.nominativo}</span>}
                {t.camera && <span className="sale__tav-room" title={`Addebito camera ${t.camera}`}><i className="fa-solid fa-bed" /> {t.camera}</span>}
                {t.gruppo && <span className="sale__tav-link" title="Tavolo unito"><i className="fa-solid fa-link" /></span>}
              </div>
            ))}
            {sala.tavoli.length === 0 && sala.elementi.length === 0 && (
              <div className="sale__empty">Aggiungi tavoli ed elementi dalla palette</div>
            )}
          </div>
        </div>

        {/* ── DETTAGLIO (destra) ─────────────────────────────────────────────── */}
        <aside className="sale__side">
          {mode === 'compose' ? (
            <ComposePanel
              sala={sala}
              selTavolo={selTavolo}
              selEl={selEl}
              newForma={newForma} setNewForma={setNewForma}
              addTavolo={(cap) => { const id = addTavolo(sala.id, cap, newForma); if (id) setSelId(id); }}
              addElemento={(k) => addElemento(sala.id, k)}
              updateTavolo={(patch) => selTavolo && updateTavolo(sala.id, selTavolo.id, patch)}
              updateElemento={(patch) => selEl && updateElemento(sala.id, selEl.id, patch)}
              del={del}
              setGrid={(c, r) => setGrid(sala.id, c, r)}
            />
          ) : (
            <ServicePanel
              sala={sala}
              selTavolo={selTavolo}
              updateTavolo={(id, patch) => updateTavolo(sala.id, id, patch)}
              unisci={(ids) => unisciTavoli(sala.id, ids)}
              separa={(g) => separaGruppo(sala.id, g)}
            />
          )}
        </aside>
      </div>

      {menu && (() => {
        const tv = sala.tavoli.find(t => t.id === menu.id);
        if (!tv) return null;
        return (
          <TavMenu
            sala={sala} tavolo={tv} x={menu.x} y={menu.y} mode={mode}
            onClose={() => setMenu(null)}
            onSposta={() => { setMoveMode(tv.id); setMenu(null); toast.info('Clicca sulla planimetria dove posizionare il tavolo'); }}
            onUnisci={(otherId) => { unisciTavoli(sala.id, [tv.id, otherId]); setMenu(null); toast.success('Tavoli uniti'); }}
            onTrasferisci={(toId) => { trasferisci(sala.id, tv.id, toId); setMenu(null); setSelId(toId); toast.success(`Servizio trasferito al tavolo ${sala.tavoli.find(t => t.id === toId)?.numero ?? ''}`); }}
            onSepara={() => { if (tv.gruppo) separaGruppo(sala.id, tv.gruppo); setMenu(null); toast.info('Tavoli separati'); }}
            onLibera={() => { updateTavolo(sala.id, tv.id, { stato: 'libero', nominativo: undefined, telefono: undefined, orario: undefined, data: undefined, coperti: undefined, note: undefined, clienteId: undefined, seatedAt: undefined, camera: undefined, cameraOspite: undefined }); setMenu(null); }}
            onRimuovi={() => { setMenu(null); del(tv.id); }}
          />
        );
      })()}

      {showClienti && <ClientiModal onClose={() => setShowClienti(false)} />}
    </div>
  );
};

// ── Menu contestuale (tasto destro) su un tavolo ──────────────────────────────
const TavMenu: React.FC<{
  sala: Sala;
  tavolo: Tavolo;
  x: number; y: number;
  mode: 'compose' | 'service';
  onClose: () => void;
  onSposta: () => void;
  onUnisci: (otherId: string) => void;
  onTrasferisci: (toId: string) => void;
  onSepara: () => void;
  onLibera: () => void;
  onRimuovi: () => void;
}> = ({ sala, tavolo, x, y, mode, onSposta, onUnisci, onTrasferisci, onSepara, onLibera, onRimuovi }) => {
  const [view, setView] = useState<'root' | 'unisci' | 'trasferisci'>('root');
  const altri = sala.tavoli.filter(t => t.id !== tavolo.id);
  const unibili = altri.filter(t => !tavolo.gruppo || t.gruppo !== tavolo.gruppo);
  const liberi = altri.filter(t => t.stato === 'libero' && !t.gruppo);
  // riposiziona per non uscire dal viewport (menu ~200×260)
  const left = Math.min(x, window.innerWidth - 210);
  const top = Math.min(y, window.innerHeight - 280);

  return (
    <div className="sale__menu" style={{ left, top }} onPointerDown={e => e.stopPropagation()} onContextMenu={e => e.preventDefault()}>
      {view === 'root' && (
        <>
          <div className="sale__menu-head">Tavolo {tavolo.numero}</div>
          <button type="button" className="sale__menu-item" onClick={onSposta}>
            <i className="fa-solid fa-up-down-left-right" /> Sposta
          </button>
          <button type="button" className="sale__menu-item" disabled={!unibili.length} onClick={() => setView('unisci')}>
            <i className="fa-solid fa-object-group" /> Unisci con… <i className="fa-solid fa-chevron-right sale__menu-arr" />
          </button>
          {mode === 'service' && (
            <button type="button" className="sale__menu-item" disabled={!liberi.length} onClick={() => setView('trasferisci')}>
              <i className="fa-solid fa-right-left" /> Trasferisci a… <i className="fa-solid fa-chevron-right sale__menu-arr" />
            </button>
          )}
          {tavolo.gruppo && (
            <button type="button" className="sale__menu-item" onClick={onSepara}>
              <i className="fa-solid fa-link-slash" /> Separa dal gruppo
            </button>
          )}
          {mode === 'service' && tavolo.stato !== 'libero' && (
            <button type="button" className="sale__menu-item" onClick={onLibera}>
              <i className="fa-solid fa-rotate-left" /> Libera tavolo
            </button>
          )}
          {mode === 'compose' && (
            <>
              <div className="sale__menu-sep" />
              <button type="button" className="sale__menu-item sale__menu-item--danger" onClick={onRimuovi}>
                <i className="fa-solid fa-trash" /> Rimuovi tavolo
              </button>
            </>
          )}
        </>
      )}
      {view === 'unisci' && (
        <>
          <button type="button" className="sale__menu-back" onClick={() => setView('root')}>
            <i className="fa-solid fa-chevron-left" /> Unisci con
          </button>
          <div className="sale__menu-list">
            {unibili.map(t => (
              <button key={t.id} type="button" className="sale__menu-item" onClick={() => onUnisci(t.id)}>
                <span className="sale__menu-num">{t.numero}</span> {t.capienza} cop.
                {t.gruppo && <i className="fa-solid fa-link sale__menu-flag" />}
                <span className="sale__uni-dot" style={{ background: TAVOLO_STATO_META[t.stato].color }} />
              </button>
            ))}
          </div>
        </>
      )}
      {view === 'trasferisci' && (
        <>
          <button type="button" className="sale__menu-back" onClick={() => setView('root')}>
            <i className="fa-solid fa-chevron-left" /> Trasferisci a
          </button>
          <div className="sale__menu-list">
            {liberi.map(t => (
              <button key={t.id} type="button" className="sale__menu-item" onClick={() => onTrasferisci(t.id)}>
                <span className="sale__menu-num">{t.numero}</span> {t.capienza} cop.
              </button>
            ))}
            {!liberi.length && <div className="sale__menu-empty">Nessun tavolo libero</div>}
          </div>
        </>
      )}
    </div>
  );
};

// ── Disegno ingrandito del tavolo con i coperti attorno ───────────────────────
const TavoloBig: React.FC<{ t: Tavolo; seats?: number; caption?: string }> = ({ t, seats, caption }) => {
  const n = Math.min(seats ?? t.capienza, 14);   // sedie disegnate (cap per non affollare)
  const color = TAVOLO_STATO_META[t.stato].color;
  const wide = t.forma === 'rettangolare';
  const tw = wide ? 150 : 96, th = 96;
  return (
    <div className="sale__big" style={{ '--stato': color } as React.CSSProperties}>
      <div className="sale__big-area">
        {Array.from({ length: n }).map((_, i) => {
          const a = (i / n) * Math.PI * 2 - Math.PI / 2;
          const rx = wide ? 100 : 72, ry = 66;
          const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
          return <span key={i} className="sale__seat"
            style={{ '--sx': `${x}px`, '--sy': `${y}px`, '--rot': `${(a * 180) / Math.PI + 90}deg` } as React.CSSProperties} />;
        })}
        <div className={`sale__big-top sale__big-top--${t.forma}`} style={{ '--tw': `${tw}px`, '--th': `${th}px` } as React.CSSProperties}>
          <span className="sale__big-num">{t.numero}</span>
          <span className="sale__big-cap">{caption ?? `${t.capienza} coperti`}</span>
        </div>
      </div>
      <div className="sale__big-state" style={{ '--stato': color } as React.CSSProperties}>
        {TAVOLO_STATO_META[t.stato].label}
      </div>
    </div>
  );
};

// ── Pannello COMPOSIZIONE ─────────────────────────────────────────────────────
const ComposePanel: React.FC<{
  sala: import('../../../store/useSaleStore').Sala;
  selTavolo: Tavolo | null;
  selEl: SalaElement | null;
  newForma: TavoloForma; setNewForma: (f: TavoloForma) => void;
  addTavolo: (cap: number) => void;
  addElemento: (k: SalaElementKind) => void;
  updateTavolo: (patch: Partial<Tavolo>) => void;
  updateElemento: (patch: Partial<SalaElement>) => void;
  del: (id: string) => void;
  setGrid: (cols: number, rows: number) => void;
}> = ({ sala, selTavolo, selEl, newForma, setNewForma, addTavolo, addElemento, updateTavolo, updateElemento, del, setGrid }) => (
  <>
    <div className="sale__group">
      <div className="sale__group-title">Aggiungi tavolo</div>
      <SelectField name="new-forma" label="Forma" value={newForma} onChange={e => setNewForma(e.target.value as TavoloForma)}
        options={FORME.map(f => ({ value: f, label: f.charAt(0).toUpperCase() + f.slice(1) }))} />
      <div className="sale__cap-btns">
        {CAPIENZE.map(c => (
          <button key={c} type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={() => addTavolo(c)}>
            <i className="fa-solid fa-plus" /> {c} cop.
          </button>
        ))}
      </div>
    </div>

    <div className="sale__group">
      <div className="sale__group-title">Elementi sala</div>
      <div className="sale__el-btns">
        {(Object.keys(SALA_EL_META) as SalaElementKind[]).map(k => (
          <button key={k} type="button" className="sale__chip" onClick={() => addElemento(k)}>
            <i className={`fa-solid ${SALA_EL_META[k].icon}`} /> {SALA_EL_META[k].label}
          </button>
        ))}
      </div>
    </div>

    <div className="sale__group">
      <div className="sale__group-title">Griglia</div>
      <div className="sale__grid-ctrls">
        <Stepper label="Colonne" value={sala.cols} min={8} max={30} onChange={c => setGrid(c, sala.rows)} />
        <Stepper label="Righe" value={sala.rows} min={6} max={24} onChange={r => setGrid(sala.cols, r)} />
      </div>
    </div>

    {selTavolo ? (
      <div className="sale__group sale__group--detail">
        <div className="sale__group-title">Tavolo selezionato</div>
        <InputField name="tav-num" label="Numero" value={selTavolo.numero} onChange={e => updateTavolo({ numero: e.target.value })} />
        <Stepper label="Capienza" value={selTavolo.capienza} min={1} max={12} onChange={c => updateTavolo({ capienza: c })} />
        <SelectField name="tav-forma" label="Forma" value={selTavolo.forma} onChange={e => updateTavolo({ forma: e.target.value as TavoloForma })}
          options={FORME.map(f => ({ value: f, label: f.charAt(0).toUpperCase() + f.slice(1) }))} />
        <button type="button" className="sib-btn sib-btn--danger sib-btn--sm sale__del" onClick={() => del(selTavolo.id)}>
          <i className="fa-solid fa-trash" /> Rimuovi tavolo
        </button>
      </div>
    ) : selEl ? (
      <div className="sale__group sale__group--detail">
        <div className="sale__group-title">Elemento selezionato</div>
        <div className="sale__el-sel"><i className={`fa-solid ${SALA_EL_META[selEl.kind].icon}`} /> {SALA_EL_META[selEl.kind].label}</div>
        <InputField name="el-label" label="Etichetta" value={selEl.label ?? ''} onChange={e => updateElemento({ label: e.target.value })} />
        <button type="button" className="sib-btn sib-btn--danger sib-btn--sm sale__del" onClick={() => del(selEl.id)}>
          <i className="fa-solid fa-trash" /> Rimuovi elemento
        </button>
      </div>
    ) : (
      <div className="sale__hint">Seleziona un tavolo o un elemento per modificarlo/rimuoverlo, oppure trascina per posizionarlo.</div>
    )}
  </>
);

// ── Pannello SERVIZIO (capo sala) ─────────────────────────────────────────────
const ServicePanel: React.FC<{
  sala: Sala;
  selTavolo: Tavolo | null;
  updateTavolo: (id: string, patch: Partial<Tavolo>) => void;
  unisci: (ids: string[]) => void;
  separa: (gruppo: string) => void;
}> = ({ sala, selTavolo, updateTavolo, unisci, separa }) => {
  const clienti = useClientiStore(s => s.clienti);
  const addCliente = useClientiStore(s => s.addCliente);
  const updateCliente = useClientiStore(s => s.updateCliente);
  const [now, setNow] = useState(() => Date.now());
  const [joinSel, setJoinSel] = useState<string[]>([]);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id); }, []);
  useEffect(() => { setJoinSel([]); }, [selTavolo?.id]);

  if (!selTavolo) {
    return <div className="sale__hint"><i className="fa-solid fa-hand-pointer" /> Seleziona un tavolo dalla planimetria per assegnarlo, prenotarlo, unirlo ad altri, gestire lo stato o annotare le allergie. Trascina un tavolo per spostarlo.</div>;
  }

  // ── Gruppo di unione: il capofila (numero più basso) tiene la prenotazione ──
  const members = selTavolo.gruppo
    ? sala.tavoli.filter(x => x.gruppo === selTavolo.gruppo)
      .sort((a, b) => (parseInt(a.numero, 10) || 0) - (parseInt(b.numero, 10) || 0))
    : [selTavolo];
  const isGroup = members.length > 1;
  // capofila: chi ha la prenotazione, poi chi è non-libero, poi numero più basso
  const p = members.find(m => m.nominativo) ?? members.find(m => m.stato !== 'libero') ?? members[0];
  const capBase = members.reduce((m, x) => m + x.capienza, 0);
  const coperti = p.coperti ?? capBase;

  // aggiorna un campo prenotazione sul capofila
  const upP = (patch: Partial<Tavolo>) => updateTavolo(p.id, patch);
  // applica lo stato a tutti i membri del gruppo
  const setStato = (s: TavoloStato) => {
    members.forEach((m) => {
      const isP = m.id === p.id;
      if (s === 'libero') updateTavolo(m.id, isP
        ? { stato: 'libero', nominativo: undefined, telefono: undefined, orario: undefined, data: undefined, coperti: undefined, note: undefined, clienteId: undefined, seatedAt: undefined, camera: undefined, cameraOspite: undefined }
        : { stato: 'libero', seatedAt: undefined });
      else if (s === 'occupato') updateTavolo(m.id, { stato: 'occupato', seatedAt: p.seatedAt ?? Date.now() });
      else if (s === 'riservato') updateTavolo(m.id, { stato: 'riservato', seatedAt: undefined });
      else updateTavolo(m.id, { stato: s });
    });
  };

  const linkCliente = (id: string) => {
    if (!id) { upP({ clienteId: undefined }); return; }
    const c = clienti.find(x => x.id === id); if (!c) return;
    upP({
      clienteId: id,
      nominativo: c.nome,
      telefono: c.telefono ?? p.telefono,
      note: [c.allergie, c.note].filter(Boolean).join(' · ') || p.note,
    });
  };

  const salvaCliente = () => {
    if (!p.nominativo) { toast.warning('Inserisci il nominativo prima di salvare'); return; }
    if (p.clienteId) { updateCliente(p.clienteId, { nome: p.nominativo, telefono: p.telefono, note: p.note }); toast.success('Anagrafica aggiornata'); }
    else { const id = addCliente({ nome: p.nominativo, telefono: p.telefono, note: p.note }); upP({ clienteId: id }); toast.success('Cliente salvato in anagrafica'); }
  };

  const linkCamera = (numero: string) => {
    if (!numero) { upP({ camera: undefined, cameraOspite: undefined }); return; }
    const c = CAMERE_IN_CASA.find(x => x.numero === numero);
    upP({ camera: numero, cameraOspite: c?.ospite });
  };

  const mins = p.seatedAt ? Math.max(0, Math.floor((now - p.seatedAt) / 60000)) : null;
  const showResa = p.stato === 'riservato' || p.stato === 'occupato' || p.stato === 'conto';

  // tavoli unibili: gli altri tavoli della sala non già nello stesso gruppo del selezionato
  const unibili = sala.tavoli.filter(x => x.id !== selTavolo.id && (!selTavolo.gruppo || x.gruppo !== selTavolo.gruppo));
  const toggleJoin = (id: string) => setJoinSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const doUnisci = () => {
    if (!joinSel.length) return;
    unisci([selTavolo.id, ...joinSel]);
    setJoinSel([]);
    toast.success(`${joinSel.length + 1} tavoli uniti`);
  };
  const doSepara = () => { if (selTavolo.gruppo) { separa(selTavolo.gruppo); toast.info('Tavoli separati'); } };

  const capLabel = `${coperti} coperti${isGroup ? ` · ${members.length} tavoli uniti` : ''}${!isGroup && p.coperti && p.coperti > p.capienza ? ` (+${p.coperti - p.capienza} extra)` : ''}`;

  return (
    <>
      <TavoloBig t={p} seats={coperti} caption={capLabel} />

      {mins !== null && (p.stato === 'occupato' || p.stato === 'conto') && (
        <div className="sale__timer"><i className="fa-regular fa-clock" /> Occupato da {mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`}</div>
      )}

      {isGroup && (
        <div className="sale__uni-bar">
          <span><i className="fa-solid fa-link" /> Tavoli uniti: <b>{members.map(m => m.numero).join(' + ')}</b></span>
          <button type="button" className="sale__uni-sep" onClick={doSepara}>
            <i className="fa-solid fa-link-slash" /> Separa
          </button>
        </div>
      )}

      <div className="sale__group">
        <div className="sale__group-title">Stato</div>
        <div className="sale__stato-btns">
          {STATI.map(s => (
            <button key={s} type="button"
              className={`sale__stato${p.stato === s ? ' is-active' : ''} sale__stato--${s}`}
              onClick={() => setStato(s)}>
              {TAVOLO_STATO_META[s].label}
            </button>
          ))}
        </div>
      </div>

      <div className="sale__group">
        <div className="sale__group-title">Cameriere</div>
        <SelectField name="tav-cam" value={p.cameriere ?? '—'}
          onChange={e => upP({ cameriere: e.target.value === '—' ? undefined : e.target.value })}
          options={CAMERIERI.map(c => ({ value: c, label: c === '—' ? 'Non assegnato' : c }))} />
      </div>

      {showResa && (
        <div className="sale__group">
          <div className="sale__group-title">{p.stato === 'riservato' ? 'Prenotazione' : 'Servizio al tavolo'}</div>
          <SelectField name="tav-cli" label="Cliente abituale" value={p.clienteId ?? ''}
            onChange={e => linkCliente(e.target.value)}
            options={[{ value: '', label: '— nuovo / occasionale —' }, ...clienti.map(c => ({ value: c.id, label: c.nome }))]} />
          <InputField name="tav-nom" label="Nominativo" value={p.nominativo ?? ''} onChange={e => upP({ nominativo: e.target.value })} placeholder="Es. Rossi" />
          <div className="sale__row2">
            <InputField name="tav-tel" label="Telefono" value={p.telefono ?? ''} onChange={e => upP({ telefono: e.target.value })} placeholder="+39…" />
            <Stepper label="Coperti" value={coperti} min={1} max={capBase + 8} onChange={c => upP({ coperti: c })} />
          </div>
          {coperti > capBase && (
            <div className="sale__note-inline"><i className="fa-solid fa-chair" /> {coperti - capBase} copert{coperti - capBase === 1 ? 'o' : 'i'} extra rispetto alla capienza ({capBase}).</div>
          )}
          <div className="sale__row2">
            <InputField name="tav-data" label="Data" value={p.data ?? ''} onChange={e => upP({ data: e.target.value })} placeholder="gg/mm" />
            <InputField name="tav-ora" label="Orario" value={p.orario ?? ''} onChange={e => upP({ orario: e.target.value })} placeholder="HH:MM" />
          </div>
          <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm sale__savecli" onClick={salvaCliente}>
            <i className="fa-solid fa-user-plus" /> {p.clienteId ? 'Aggiorna anagrafica' : 'Salva in anagrafica'}
          </button>
        </div>
      )}

      {showResa && (
        <div className="sale__group">
          <div className="sale__group-title"><i className="fa-solid fa-bed" /> Addebito camera</div>
          <SelectField name="tav-camera" label="Collega camera / soggiorno" value={p.camera ?? ''}
            onChange={e => linkCamera(e.target.value)}
            options={[{ value: '', label: '— pagamento diretto —' }, ...CAMERE_IN_CASA.map(c => ({ value: c.numero, label: `Camera ${c.numero} · ${c.ospite}` }))]} />
          {p.camera ? (
            <div className="sale__room-link">
              <i className="fa-solid fa-receipt" /> Conto ed extra addebitati alla <b>camera {p.camera}</b>{p.cameraOspite ? ` · ${p.cameraOspite}` : ''}.
            </div>
          ) : (
            <div className="sale__note-inline"><i className="fa-solid fa-circle-info" /> Nessuna camera collegata: pagamento diretto al tavolo.</div>
          )}
        </div>
      )}

      <div className="sale__group">
        <div className="sale__group-title"><i className="fa-solid fa-triangle-exclamation sale__aller-ico" /> Note &amp; allergie</div>
        <TextareaField name="tav-note" value={p.note ?? ''} onChange={e => upP({ note: e.target.value })}
          placeholder="Allergie, intolleranze, richieste particolari…" rows={3} />
      </div>

      {/* ── Unione tavoli ── */}
      <div className="sale__group">
        <div className="sale__group-title"><i className="fa-solid fa-object-group" /> Unisci tavoli</div>
        {unibili.length === 0 ? (
          <div className="sale__hint sale__hint--sm">Nessun altro tavolo disponibile per l'unione.</div>
        ) : (
          <>
            <div className="sale__uni-list">
              {unibili.map(x => (
                <label key={x.id} className={`sale__uni-item${joinSel.includes(x.id) ? ' is-on' : ''}`}>
                  <input type="checkbox" checked={joinSel.includes(x.id)} onChange={() => toggleJoin(x.id)} />
                  <span className="sale__uni-num">{x.numero}</span>
                  <span className="sale__uni-cap">{x.capienza} cop.</span>
                  <span className="sale__uni-dot" style={{ background: TAVOLO_STATO_META[x.stato].color }} title={TAVOLO_STATO_META[x.stato].label} />
                  {x.gruppo && <i className="fa-solid fa-link sale__uni-flag" title="Già in un gruppo" />}
                </label>
              ))}
            </div>
            <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" disabled={!joinSel.length} onClick={doUnisci}>
              <i className="fa-solid fa-object-group" /> Unisci con selezionati{joinSel.length ? ` (${joinSel.length})` : ''}
            </button>
          </>
        )}
      </div>

      {p.stato !== 'libero' && (
        <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm sale__free" onClick={() => setStato('libero')}>
          <i className="fa-solid fa-rotate-left" /> Libera tavolo{isGroup ? ' (gruppo)' : ''}
        </button>
      )}
    </>
  );
};

// piccolo stepper numerico
const Stepper: React.FC<{ label: string; value: number; min: number; max: number; onChange: (v: number) => void }> =
  ({ label, value, min, max, onChange }) => (
    <div className="sale__stepper">
      <span className="sale__stepper-label">{label}</span>
      <div className="sale__stepper-ctrl">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>−</button>
        <span>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>+</button>
      </div>
    </div>
  );

export default SaleTavoli;
