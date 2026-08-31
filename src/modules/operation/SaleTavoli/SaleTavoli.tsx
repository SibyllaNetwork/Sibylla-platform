// ─── Sale e tavoli ────────────────────────────────────────────────────────────
// Pagina Food & Beverage in stile Planner: a sinistra la PLANIMETRIA della sala
// (griglia con tavoli ed elementi), a destra il DETTAGLIO ingrandito del tavolo
// selezionato. Due modalità:
//  • Composizione — si crea la sala: aggiunta/spostamento tavoli (capienza+numero)
//    ed elementi (bar, cucina, ingresso…).
//  • Servizio — il capo sala gestisce: assegna/sposta/prenota tavoli, imposta lo
//    stato e annota allergie/intolleranze.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import PageHead from '../../../core/components/PageHead';
import { InputField, SelectField, TextareaField } from '../../../core/components/form';
import Modal from '../../../core/components/Modal';
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
  ClipItem,
} from '../../../store/useSaleStore';
import { useClientiStore } from '../../../store/useClientiStore';
import { useSalePanelStore } from '../../../store/useSalePanelStore';
import { PRENS } from '../planner/planner.data';
import ClientiModal from './ClientiModal';
import './SaleTavoli.sass';

// Una card del pannello laterale (riordinabile + apribile/chiudibile)
interface PanelCard { id: string; title: string; icon?: string; body: React.ReactNode }

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

// Icone "cibo" per gli elementi imbanditi (buffet / carrello dolci)
const EL_FOOD: Partial<Record<SalaElementKind, string[]>> = {
  buffet: ['fa-drumstick-bite', 'fa-fish', 'fa-cheese', 'fa-apple-whole', 'fa-bowl-food', 'fa-pizza-slice', 'fa-carrot', 'fa-shrimp'],
  carrello: ['fa-cake-candles', 'fa-ice-cream', 'fa-cookie-bite', 'fa-mug-hot'],
};
const FOOD_LABEL: Record<string, string> = {
  'fa-drumstick-bite': 'Carne', 'fa-fish': 'Pesce', 'fa-cheese': 'Formaggi', 'fa-apple-whole': 'Frutta',
  'fa-bowl-food': 'Primi', 'fa-pizza-slice': 'Pizza', 'fa-carrot': 'Verdure', 'fa-shrimp': 'Crostacei',
  'fa-cake-candles': 'Torte', 'fa-ice-cream': 'Gelato', 'fa-cookie-bite': 'Biscotti', 'fa-mug-hot': 'Caffetteria',
};

const FORME: TavoloForma[] = ['rotondo', 'quadrato', 'rettangolare'];
const CAPIENZE = [2, 4, 6, 8];
const STATI: TavoloStato[] = ['libero', 'occupato', 'riservato', 'conto', 'pulizia'];

const PRINT_STATO_LABEL = TAVOLO_STATO_META;  // alias per la stampa

interface Props {
  navigate?: (page: string) => void
  /**
   * Montata dentro un contenitore che ha già la propria intestazione (il pane
   * del Configuratore): salta il PageHead e tiene solo le azioni, così non
   * compare un secondo titolo.
   */
  embedded?: boolean
}

const SaleTavoli: React.FC<Props> = ({ embedded = false }) => {
  const sale = useSaleStore(s => s.sale);
  const addTavolo = useSaleStore(s => s.addTavolo);
  const addElemento = useSaleStore(s => s.addElemento);
  const updateTavolo = useSaleStore(s => s.updateTavolo);
  const updateElemento = useSaleStore(s => s.updateElemento);
  const moveItem = useSaleStore(s => s.moveItem);
  const setPositions = useSaleStore(s => s.setPositions);
  const removeItem = useSaleStore(s => s.removeItem);
  const removeItems = useSaleStore(s => s.removeItems);
  const pasteItems = useSaleStore(s => s.pasteItems);
  const resizeItem = useSaleStore(s => s.resizeItem);
  const rotateItem = useSaleStore(s => s.rotateItem);
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
  const [selIds, setSelIds] = useState<string[]>([]);
  const [showClienti, setShowClienti] = useState(false);
  // Pannello di gestione delle sale: elenco, creazione, rinomina con
  // salvataggio esplicito, eliminazione.
  const [showSale, setShowSale] = useState(false);
  // id della sala in modifica nel pannello + valore in corso (bozza)
  const [editSalaId, setEditSalaId] = useState<string | null>(null);
  const [editSalaNome, setEditSalaNome] = useState('');
  const [menu, setMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const [moveMode, setMoveMode] = useState<string | null>(null);
  const [clip, setClip] = useState<ClipItem[]>([]);
  // rettangolo di selezione (marquee) in px relativi al canvas
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const sala = sale.find(s => s.id === salaId) ?? sale[0];
  const canvasRef = useRef<HTMLDivElement>(null);
  // drag di uno o più item: memorizza le posizioni originali per applicare il delta
  const drag = useRef<{ ids: string[]; ocx: number; ocy: number; orig: Record<string, { x: number; y: number }>; moved: boolean } | null>(null);
  const mq = useRef<{ x0: number; y0: number } | null>(null);

  // id selezionato "singolo" (per il pannello dettaglio); null se selezione multipla/vuota
  const selId = selIds.length === 1 ? selIds[0] : null;
  const setSelId = (id: string | null) => setSelIds(id ? [id] : []);

  useEffect(() => { if (sala && salaId !== sala.id) setSalaId(sala.id); }, [sala, salaId]);
  useEffect(() => { setSelIds([]); setMenu(null); setMoveMode(null); setMarquee(null); }, [salaId, mode]);

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

  // ── Drag & drop (sposta uno o più item) + marquee (selezione a rettangolo) ──
  useEffect(() => {
    if (!sala) return;
    const onMove = (e: PointerEvent) => {
      const c = canvasRef.current; if (!c) return;
      const r = c.getBoundingClientRect();
      // marquee di selezione
      if (mq.current) {
        const { x0, y0 } = mq.current;
        const x1 = e.clientX - r.left, y1 = e.clientY - r.top;
        const rx = Math.min(x0, x1), ry = Math.min(y0, y1), rw = Math.abs(x1 - x0), rh = Math.abs(y1 - y0);
        setMarquee({ x: rx, y: ry, w: rw, h: rh });
        const hit = [...sala.tavoli, ...sala.elementi].filter(it => {
          const ix = it.x * CELL, iy = it.y * CELL, iw = it.w * CELL, ih = it.h * CELL;
          return rx < ix + iw && rx + rw > ix && ry < iy + ih && ry + rh > iy;
        }).map(it => it.id);
        setSelIds(hit);
        return;
      }
      // trascinamento di uno o più item
      const d = drag.current; if (!d) return;
      const dx = (e.clientX - r.left) / CELL - d.ocx;
      const dy = (e.clientY - r.top) / CELL - d.ocy;
      d.moved = true;
      if (d.ids.length === 1) {
        const o = d.orig[d.ids[0]];
        moveItem(sala.id, d.ids[0], Math.round(o.x + dx), Math.round(o.y + dy));
      } else {
        setPositions(sala.id, d.ids.map(id => ({ id, x: d.orig[id].x + dx, y: d.orig[id].y + dy })));
      }
    };
    const onUp = () => { drag.current = null; mq.current = null; setMarquee(null); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, [sala, moveItem, setPositions]);

  // ── Copia / taglia / incolla ──
  const selectAll = useCallback(() => {
    if (!sala) return;
    setSelIds([...sala.tavoli.map(t => t.id), ...sala.elementi.map(e => e.id)]);
  }, [sala]);
  const rotateSel = () => { if (sala && selId) rotateItem(sala.id, selId); };
  const resizeSel = (w: number, h: number) => { if (sala && selId) resizeItem(sala.id, selId, w, h); };
  const buildClip = useCallback((): ClipItem[] => {
    if (!sala) return [];
    return [...sala.tavoli, ...sala.elementi]
      .filter(i => selIds.includes(i.id))
      .map(i => 'forma' in i
        ? { type: 'tavolo', x: i.x, y: i.y, w: i.w, h: i.h, rot: i.rot, forma: i.forma, capienza: i.capienza }
        : { type: 'elemento', x: i.x, y: i.y, w: i.w, h: i.h, rot: i.rot, kind: i.kind, label: i.label });
  }, [sala, selIds]);
  const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;
  const copy = useCallback(() => {
    const c = buildClip(); if (!c.length) return;
    setClip(c); toast.info(`${plural(c.length, 'elemento copiato', 'elementi copiati')}`);
  }, [buildClip]);
  const cut = useCallback(() => {
    const c = buildClip(); if (!c.length || !sala) return;
    setClip(c); removeItems(sala.id, selIds); setSelIds([]);
    toast.info(`${plural(c.length, 'elemento tagliato', 'elementi tagliati')}`);
  }, [buildClip, sala, selIds, removeItems]);
  const paste = useCallback(() => {
    if (!sala || !clip.length) return;
    const ids = pasteItems(sala.id, clip, 1);
    setSelIds(ids); toast.success(`${plural(ids.length, 'elemento incollato', 'elementi incollati')}`);
  }, [sala, clip, pasteItems]);

  // scorciatoie da tastiera (solo Composizione)
  useEffect(() => {
    if (mode !== 'compose') return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      const k = e.key.toLowerCase();
      if (k === 'c' && selIds.length) { copy(); e.preventDefault(); }
      else if (k === 'x' && selIds.length) { cut(); e.preventDefault(); }
      else if (k === 'v' && clip.length) { paste(); e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, selIds, clip, copy, cut, paste]);

  if (!sala) return (
    <div className="sale">
      {embedded
        ? <p className="sale__vuoto">Nessuna sala configurata per questo outlet.</p>
        : <PageHead title="Sale e tavoli" subtitle="Nessuna sala" />}
    </div>
  );

  const startDrag = (e: React.PointerEvent, id: string) => {
    if (e.button !== 0 || moveMode) return;   // solo tasto sinistro; niente drag in modalità "sposta"
    const r = canvasRef.current!.getBoundingClientRect();
    const multi = e.shiftKey || e.ctrlKey || e.metaKey;
    // Ctrl/Cmd/Shift+click in composizione: aggiunge/toglie dalla selezione (no drag)
    if (mode === 'compose' && multi) {
      e.stopPropagation();
      setSelIds(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));
      return;
    }
    // set da trascinare: la selezione multipla se il tavolo ne fa parte, altrimenti solo lui
    let ids: string[];
    if (mode === 'compose' && selIds.length > 1 && selIds.includes(id)) ids = selIds;
    else { ids = [id]; setSelIds([id]); }
    const all = [...sala.tavoli, ...sala.elementi];
    const orig: Record<string, { x: number; y: number }> = {};
    ids.forEach(i => { const it = all.find(a => a.id === i); if (it) orig[i] = { x: it.x, y: it.y }; });
    drag.current = { ids, ocx: (e.clientX - r.left) / CELL, ocy: (e.clientY - r.top) / CELL, orig, moved: false };
  };

  // avvia il marquee di selezione sullo sfondo (solo composizione)
  const startMarquee = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget) return;
    if (mode === 'compose' && e.button === 0 && !moveMode) {
      const r = canvasRef.current!.getBoundingClientRect();
      mq.current = { x0: e.clientX - r.left, y0: e.clientY - r.top };
      if (!(e.shiftKey || e.ctrlKey || e.metaKey)) setSelIds([]);
    } else {
      setSelIds([]);
    }
  };

  // ── Allineamento / distribuzione / disposizione della selezione ──
  const selItems = () => [...sala.tavoli, ...sala.elementi].filter(i => selIds.includes(i.id));
  const align = (kind: 'left' | 'centerH' | 'right' | 'top' | 'middleV' | 'bottom') => {
    const items = selItems(); if (items.length < 2) return;
    const minX = Math.min(...items.map(i => i.x)), maxR = Math.max(...items.map(i => i.x + i.w));
    const minY = Math.min(...items.map(i => i.y)), maxB = Math.max(...items.map(i => i.y + i.h));
    const cx = (minX + maxR) / 2, cy = (minY + maxB) / 2;
    setPositions(sala.id, items.map(i => {
      switch (kind) {
        case 'left': return { id: i.id, x: minX, y: i.y };
        case 'right': return { id: i.id, x: maxR - i.w, y: i.y };
        case 'centerH': return { id: i.id, x: Math.round(cx - i.w / 2), y: i.y };
        case 'top': return { id: i.id, x: i.x, y: minY };
        case 'bottom': return { id: i.id, x: i.x, y: maxB - i.h };
        default: return { id: i.id, x: i.x, y: Math.round(cy - i.h / 2) };
      }
    }));
  };
  const distribute = (axis: 'h' | 'v') => {
    const items = selItems(); if (items.length < 3) return;
    const key = axis === 'h' ? 'x' : 'y';
    const size = axis === 'h' ? 'w' : 'h';
    const sorted = [...items].sort((a, b) => a[key] - b[key]);
    const total = sorted.reduce((s, i) => s + i[size], 0);
    const last = sorted[sorted.length - 1];
    const span = (last[key] + last[size]) - sorted[0][key];
    const gap = (span - total) / (sorted.length - 1);
    let cur = sorted[0][key];
    setPositions(sala.id, sorted.map(i => {
      const pos = axis === 'h' ? { id: i.id, x: Math.round(cur), y: i.y } : { id: i.id, x: i.x, y: Math.round(cur) };
      cur += i[size] + gap;
      return pos;
    }));
  };
  const tidyGrid = () => {
    const items = selItems(); if (items.length < 2) return;
    const minX = Math.min(...items.map(i => i.x)), minY = Math.min(...items.map(i => i.y));
    const stepX = Math.max(...items.map(i => i.w)) + 1, stepY = Math.max(...items.map(i => i.h)) + 1;
    const cols = Math.ceil(Math.sqrt(items.length));
    const sorted = [...items].sort((a, b) => (a.y - b.y) || (a.x - b.x));
    setPositions(sala.id, sorted.map((i, idx) => ({ id: i.id, x: minX + (idx % cols) * stepX, y: minY + Math.floor(idx / cols) * stepY })));
  };
  const delSelezione = async () => {
    const items = selItems(); if (!items.length) return;
    const ok = await confirm({ title: 'Rimuovi elementi', message: `Rimuovere ${items.length} elementi selezionati dalla sala?`, confirmLabel: 'Rimuovi', danger: true });
    if (!ok) return;
    removeItems(sala.id, items.map(i => i.id));
    setSelIds([]);
  };

  // apre il menu contestuale su un tavolo (tasto destro)
  const openMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    setMoveMode(null);
    if (!selIds.includes(id)) setSelId(id);   // mantiene la selezione multipla se il tavolo ne fa parte
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

  // ── Pannello «Gestisci sale» ───────────────────────────────────────────────
  //  Creazione, elenco, rinomina con SALVATAGGIO ESPLICITO (la bozza vive nello
  //  stato locale e finisce nello store solo su «Salva») ed eliminazione.
  const creaSala = () => {
    const id = addSala('Nuova sala');
    setSalaId(id);
    setEditSalaId(id);
    setEditSalaNome('Nuova sala');
    toast.success('Sala creata: assegnale un nome e salva');
  };

  const avviaModifica = (id: string, nome: string) => {
    setEditSalaId(id);
    setEditSalaNome(nome);
  };

  const annullaModifica = () => {
    setEditSalaId(null);
    setEditSalaNome('');
  };

  const salvaModifica = () => {
    const nome = editSalaNome.trim();
    if (!editSalaId || !nome) return;
    renameSala(editSalaId, nome);
    annullaModifica();
    toast.success('Sala salvata');
  };

  const eliminaSalaDaPannello = async (id: string, nome: string) => {
    if (sale.length <= 1) {
      toast.warning('Deve restare almeno una sala');
      return;
    }
    const ok = await confirm({
      title: 'Elimina sala',
      message: `Eliminare la sala "${nome}" con tutti i suoi tavoli? L'operazione non è reversibile.`,
      confirmLabel: 'Elimina', danger: true,
    });
    if (!ok) return;
    if (editSalaId === id) annullaModifica();
    removeSala(id);
    if (salaId === id) {
      const next = sale.find(s => s.id !== id);
      if (next) setSalaId(next.id);
    }
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

  // Azioni della pagina: Clienti, Stampa e il selettore di modalità
  const azioni = (
    <>
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
    </>
  );

  return (
    <div className="sale">
      {/* Le azioni sono le stesse in pagina e dentro il pane: cambia solo il
          contenitore, perché in embedded il titolo lo dà già il pane. */}
      {embedded
        ? <div className="sale__actions sale__actions--embedded">{azioni}</div>
        : <PageHead
            title="Sale e tavoli"
            subtitle={`Food & Beverage · ${sala.nome}`}
            actions={<div className="sale__actions">{azioni}</div>}
          />}
      {/* barra: sala + riepilogo */}
      <div className="sale__bar">
        <div className="sale__bar-sala">
          <SelectField name="sala" label="Sala" value={sala.id} onChange={e => setSalaId(e.target.value)}
            options={sale.map(s => ({ value: s.id, label: s.nome }))} />
        </div>
        {mode === 'compose' && (
          <div className="sale__bar-manage">
            {/* Un solo comando: la gestione delle sale (elenco, creazione,
                rinomina con salvataggio, eliminazione) vive nel pannello. */}
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setShowSale(true)}>
              <i className="fa-solid fa-table-list" /> Gestisci sale
              <span className="sale__bar-count">{sale.length}</span>
            </button>
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
            onPointerDown={startMarquee}
          >
            {moveMode && (
              <div className="sale__moveovl" onPointerDown={e => { e.stopPropagation(); placeMove(e); }}>
                <span className="sale__moveovl-hint"><i className="fa-solid fa-hand-pointer" /> Clicca dove posizionare il tavolo · <kbd>Esc</kbd> annulla</span>
              </div>
            )}
            {marquee && (
              <div className="sale__marquee" style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }} />
            )}
            {/* elementi sala (bar, cucina…) */}
            {sala.elementi.map(el => {
              const rot = el.rot ?? 0, sw = rot % 180 === 90;
              const lw = sw ? el.h : el.w, lh = sw ? el.w : el.h;
              return (
              <div
                key={el.id}
                className={`sale__el sale__el--${el.kind}${selIds.includes(el.id) ? ' is-sel' : ''}${el.refill ? ' is-refill' : ''}`}
                style={{ '--x': el.x, '--y': el.y, '--fw': el.w, '--fh': el.h, '--lw': lw, '--lh': lh, '--irot': `${rot}deg` } as React.CSSProperties}
                onPointerDown={e => startDrag(e, el.id)}
                onContextMenu={e => openMenu(e, el.id)}
              >
                {EL_FOOD[el.kind] ? (
                  <>
                    <div className="sale__el-food">
                      {EL_FOOD[el.kind]!.map((ic, i) => (
                        <span key={i} className={`sale__el-dish${el.esauriti?.includes(ic) ? ' is-out' : ''}`}><i className={`fa-solid ${ic}`} /></span>
                      ))}
                    </div>
                    <span className="sale__el-label"><i className={`fa-solid ${SALA_EL_META[el.kind].icon}`} /> {el.label}</span>
                    {el.refill && <span className="sale__el-refill" title="Refill richiesto in cucina"><i className="fa-solid fa-bell" /> refill</span>}
                  </>
                ) : el.kind === 'bar' ? (
                  <>
                    <BarStools w={lw} h={lh} />
                    <i className={`fa-solid ${SALA_EL_META[el.kind].icon}`} />
                    <span>{el.label}</span>
                  </>
                ) : (
                  <>
                    <i className={`fa-solid ${SALA_EL_META[el.kind].icon}`} />
                    <span>{el.label}</span>
                  </>
                )}
              </div>
              );
            })}
            {/* tavoli */}
            {sala.tavoli.map(t => {
              const rot = t.rot ?? 0, sw = rot % 180 === 90;
              const lw = sw ? t.h : t.w, lh = sw ? t.w : t.h;
              return (
              <div
                key={t.id}
                className={`sale__tav sale__tav--${t.forma} is-${t.stato}${selIds.includes(t.id) ? ' is-sel' : ''}${t.gruppo ? ' is-uni' : ''}`}
                style={{ '--x': t.x, '--y': t.y, '--fw': t.w, '--fh': t.h, '--lw': lw, '--lh': lh, '--irot': `${rot}deg` } as React.CSSProperties}
                onPointerDown={e => startDrag(e, t.id)}
                onContextMenu={e => openMenu(e, t.id)}
                title={`Tavolo ${t.numero} · ${t.capienza} coperti${t.gruppo ? ' · unito' : ''}`}
              >
                {canvasSeats({ ...t, w: lw, h: lh }).map((s, i) => (
                  <span key={i} className="sale__tav-seat"
                    style={{ '--sx': `${s.x}px`, '--sy': `${s.y}px`, '--rot': `${s.rot}deg` } as React.CSSProperties} />
                ))}
                <span className="sale__tav-surface" aria-hidden="true" />
                <span className="sale__tav-num" style={{ '--irot': `${-rot}deg` } as React.CSSProperties}>{t.numero}</span>
                <span className="sale__tav-cap" style={{ '--irot': `${-rot}deg` } as React.CSSProperties}><i className="fa-solid fa-chair" /> {t.capienza}</span>
                {t.nominativo && <span className="sale__tav-nom">{t.nominativo}</span>}
                {t.camera && <span className="sale__tav-room" title={`Addebito camera ${t.camera}`}><i className="fa-solid fa-bed" /> {t.camera}</span>}
                {t.gruppo && <span className="sale__tav-link" title="Tavolo unito"><i className="fa-solid fa-link" /></span>}
              </div>
              );
            })}
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
              selCount={selIds.length}
              newForma={newForma} setNewForma={setNewForma}
              addTavolo={(cap) => { const id = addTavolo(sala.id, cap, newForma); if (id) setSelId(id); }}
              addElemento={(k) => addElemento(sala.id, k)}
              updateTavolo={(patch) => selTavolo && updateTavolo(sala.id, selTavolo.id, patch)}
              updateElemento={(patch) => selEl && updateElemento(sala.id, selEl.id, patch)}
              del={del}
              setGrid={(c, r) => setGrid(sala.id, c, r)}
              align={align}
              distribute={distribute}
              tidyGrid={tidyGrid}
              delSelezione={delSelezione}
              selectAll={selectAll}
              copy={copy}
              cut={cut}
              paste={paste}
              clipCount={clip.length}
              rotateSel={rotateSel}
              resizeSel={resizeSel}
            />
          ) : selEl ? (
            <div className="sale__group">
              <div className="sale__group-title"><i className={`fa-solid ${SALA_EL_META[selEl.kind].icon}`} /> {selEl.label}</div>
              {selEl.kind === 'buffet'
                ? <BuffetRefill el={selEl} update={(patch) => updateElemento(sala.id, selEl.id, patch)} />
                : <div className="sale__hint sale__hint--sm">Elemento di sala. Passa a Composizione per modificarlo.</div>}
            </div>
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
        const tv = sala.tavoli.find(t => t.id === menu.id) ?? null;
        const el = sala.elementi.find(e => e.id === menu.id) ?? null;
        if (!tv && !el) return null;
        const title = tv ? `Tavolo ${tv.numero}` : (el?.label ?? 'Elemento');
        return (
          <TavMenu
            sala={sala} tavolo={tv} isTavolo={!!tv} title={title} x={menu.x} y={menu.y} mode={mode}
            selCount={selIds.length} canPaste={clip.length > 0}
            onClose={() => setMenu(null)}
            onRuota={() => { rotateItem(sala.id, menu.id); setMenu(null); }}
            onCopia={() => { copy(); setMenu(null); }}
            onTaglia={() => { cut(); setMenu(null); }}
            onIncolla={() => { paste(); setMenu(null); }}
            onSposta={() => { setMoveMode(menu.id); setMenu(null); toast.info('Clicca sulla planimetria dove posizionare l\'elemento'); }}
            onUnisci={(otherId) => { if (tv) { unisciTavoli(sala.id, [tv.id, otherId]); toast.success('Tavoli uniti'); } setMenu(null); }}
            onTrasferisci={(toId) => { if (tv) { trasferisci(sala.id, tv.id, toId); setSelId(toId); toast.success(`Servizio trasferito al tavolo ${sala.tavoli.find(t => t.id === toId)?.numero ?? ''}`); } setMenu(null); }}
            onSepara={() => { if (tv?.gruppo) separaGruppo(sala.id, tv.gruppo); setMenu(null); toast.info('Tavoli separati'); }}
            onLibera={() => { if (tv) updateTavolo(sala.id, tv.id, { stato: 'libero', nominativo: undefined, telefono: undefined, orario: undefined, data: undefined, coperti: undefined, note: undefined, clienteId: undefined, seatedAt: undefined, camera: undefined, cameraOspite: undefined }); setMenu(null); }}
            onRimuovi={() => { setMenu(null); del(menu.id); }}
          />
        );
      })()}

      {showClienti && <ClientiModal onClose={() => setShowClienti(false)} />}

      {/* ── Gestisci sale: elenco + crea / modifica e salva / elimina ───────── */}
      {showSale && (
        <Modal open onClose={() => { annullaModifica(); setShowSale(false); }} title="Gestisci sale" size="lg">
          <div className="sale__gest">
            <p className="sale__gest-intro">
              Le sale dell'outlet: creane di nuove, rinominale e salva, oppure eliminale.
              Selezionando una sala si apre la sua planimetria.
            </p>

            <div className="sib-table-wrap">
              <table className="sib-table sale__gest-table">
                {/* larghezze in % nel .sass, non inline */}
                <colgroup>
                  <col /><col /><col /><col />
                </colgroup>
                <thead>
                  <tr>
                    <th>Sala</th>
                    <th className="sale__gest-num">Tavoli</th>
                    <th className="sale__gest-num">Coperti</th>
                    <th className="sale__gest-az">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.map(s => {
                    const inModifica = editSalaId === s.id;
                    const coperti = s.tavoli.reduce((m, t) => m + t.capienza, 0);
                    return (
                      <tr key={s.id} className={s.id === salaId ? 'sale__gest-row--current' : undefined}>
                        <td>
                          {inModifica ? (
                            <InputField
                              name={`sala-nome-${s.id}`}
                              ariaLabel={`Nome della sala ${s.nome}`}
                              value={editSalaNome}
                              onChange={e => setEditSalaNome(e.target.value)}
                              className="sale__gest-input"
                            />
                          ) : (
                            <button
                              type="button"
                              className="sale__gest-nome"
                              onClick={() => { setSalaId(s.id); setShowSale(false); }}
                            >
                              {s.nome}
                              {s.id === salaId && <span className="sale__gest-badge">in planimetria</span>}
                            </button>
                          )}
                        </td>
                        <td className="sale__gest-num">{s.tavoli.length}</td>
                        <td className="sale__gest-num">{coperti}</td>
                        <td className="sale__gest-az">
                          {inModifica ? (
                            <>
                              <button type="button" className="sib-btn sib-btn--ghost sib-btn--sm" onClick={annullaModifica}>
                                Annulla
                              </button>
                              <button
                                type="button"
                                className="sib-btn sib-btn--primary sib-btn--sm"
                                onClick={salvaModifica}
                                disabled={!editSalaNome.trim()}
                              >
                                Salva
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="sib-btn sib-btn--icon"
                                onClick={() => avviaModifica(s.id, s.nome)}
                                aria-label={`Modifica la sala ${s.nome}`}
                              >
                                <i className="fa-solid fa-pen" />
                              </button>
                              <button
                                type="button"
                                className="sib-btn sib-btn--icon"
                                onClick={() => eliminaSalaDaPannello(s.id, s.nome)}
                                disabled={sale.length <= 1}
                                aria-label={`Elimina la sala ${s.nome}`}
                              >
                                <i className="fa-solid fa-trash" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="sale__gest-foot">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={creaSala}>
                <i className="fa-solid fa-plus" /> Nuova sala
              </button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={() => { annullaModifica(); setShowSale(false); }}>
                Chiudi
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── Blocco di card riordinabili (drag & drop) + apribili/chiudibili ───────────
const PanelCards: React.FC<{ storeKey: string; cards: PanelCard[] }> = ({ storeKey, cards }) => {
  const order = useSalePanelStore(s => s.order[storeKey]);
  const collapsed = useSalePanelStore(s => s.collapsed);
  const setOrder = useSalePanelStore(s => s.setOrder);
  const toggle = useSalePanelStore(s => s.toggle);
  const dragId = useRef<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // ordine canonico: quello salvato (ripulito), poi eventuali card nuove in coda
  const catalog = cards.map(c => c.id);
  const known = (order ?? []).filter(id => catalog.includes(id));
  const full = [...known, ...catalog.filter(id => !known.includes(id))];
  const byId = new Map(cards.map(c => [c.id, c]));
  const visible = full.filter(id => byId.has(id));

  const reorder = (from: string, to: string) => {
    if (!from || from === to) return;
    const next = full.filter(id => id !== from);
    const at = next.indexOf(to);
    next.splice(at < 0 ? next.length : at, 0, from);
    setOrder(storeKey, next);
  };

  return (
    <div className="sale__cards">
      {visible.map(id => {
        const c = byId.get(id)!;
        const isClosed = !!collapsed[`${storeKey}:${id}`];
        return (
          <div
            key={id}
            className={`sale__card${isClosed ? ' is-collapsed' : ''}${overId === id ? ' is-over' : ''}`}
            onDragOver={e => { if (dragId.current) { e.preventDefault(); setOverId(id); } }}
            onDragLeave={() => setOverId(o => (o === id ? null : o))}
            onDrop={e => { e.preventDefault(); if (dragId.current) reorder(dragId.current, id); dragId.current = null; setOverId(null); }}
          >
            <div className="sale__card-head" onClick={() => toggle(storeKey, id)}>
              <span
                className="sale__card-grip" title="Trascina per riordinare"
                draggable
                onClick={e => e.stopPropagation()}
                onDragStart={e => { dragId.current = id; e.dataTransfer.effectAllowed = 'move'; }}
                onDragEnd={() => { dragId.current = null; setOverId(null); }}
              >
                <i className="fa-solid fa-grip-vertical" />
              </span>
              {c.icon && <i className={c.icon} />}
              <span className="sale__card-title">{c.title}</span>
              <i className={`fa-solid fa-chevron-${isClosed ? 'right' : 'down'} sale__card-chev`} />
            </div>
            {!isClosed && <div className="sale__card-body">{c.body}</div>}
          </div>
        );
      })}
    </div>
  );
};

// ── Menu contestuale (tasto destro) su un tavolo ──────────────────────────────
const TavMenu: React.FC<{
  sala: Sala;
  tavolo: Tavolo | null;
  isTavolo: boolean;
  title: string;
  x: number; y: number;
  mode: 'compose' | 'service';
  selCount: number;
  canPaste: boolean;
  onClose: () => void;
  onRuota: () => void;
  onCopia: () => void;
  onTaglia: () => void;
  onIncolla: () => void;
  onSposta: () => void;
  onUnisci: (otherId: string) => void;
  onTrasferisci: (toId: string) => void;
  onSepara: () => void;
  onLibera: () => void;
  onRimuovi: () => void;
}> = ({ sala, tavolo, isTavolo, title, x, y, mode, selCount, canPaste, onRuota, onCopia, onTaglia, onIncolla, onSposta, onUnisci, onTrasferisci, onSepara, onLibera, onRimuovi }) => {
  const multi = selCount > 1;
  const [view, setView] = useState<'root' | 'unisci' | 'trasferisci'>('root');
  const altri = sala.tavoli.filter(t => t.id !== tavolo?.id);
  const unibili = isTavolo ? altri.filter(t => !tavolo!.gruppo || t.gruppo !== tavolo!.gruppo) : [];
  const liberi = isTavolo ? altri.filter(t => t.stato === 'libero' && !t.gruppo) : [];
  // riposiziona per non uscire dal viewport (menu ~200×260)
  const left = Math.min(x, window.innerWidth - 210);
  const top = Math.min(y, window.innerHeight - 280);

  return (
    <div className="sale__menu" style={{ left, top }} onPointerDown={e => e.stopPropagation()} onContextMenu={e => e.preventDefault()}>
      {view === 'root' && (
        <>
          <div className="sale__menu-head">{multi ? `${selCount} elementi` : title}</div>
          <button type="button" className="sale__menu-item" onClick={onSposta}>
            <i className="fa-solid fa-up-down-left-right" /> Sposta
          </button>
          <button type="button" className="sale__menu-item" onClick={onRuota}>
            <i className="fa-solid fa-rotate" /> Ruota 90°
          </button>
          {mode === 'compose' && (
            <>
              <div className="sale__menu-sep" />
              <button type="button" className="sale__menu-item" onClick={onCopia}>
                <i className="fa-solid fa-copy" /> Copia <span className="sale__menu-kbd">⌘C</span>
              </button>
              <button type="button" className="sale__menu-item" onClick={onTaglia}>
                <i className="fa-solid fa-scissors" /> Taglia <span className="sale__menu-kbd">⌘X</span>
              </button>
              <button type="button" className="sale__menu-item" disabled={!canPaste} onClick={onIncolla}>
                <i className="fa-solid fa-paste" /> Incolla <span className="sale__menu-kbd">⌘V</span>
              </button>
              <div className="sale__menu-sep" />
            </>
          )}
          {isTavolo && (
            <button type="button" className="sale__menu-item" disabled={!unibili.length} onClick={() => setView('unisci')}>
              <i className="fa-solid fa-object-group" /> Unisci con… <i className="fa-solid fa-chevron-right sale__menu-arr" />
            </button>
          )}
          {isTavolo && mode === 'service' && (
            <button type="button" className="sale__menu-item" disabled={!liberi.length} onClick={() => setView('trasferisci')}>
              <i className="fa-solid fa-right-left" /> Trasferisci a… <i className="fa-solid fa-chevron-right sale__menu-arr" />
            </button>
          )}
          {isTavolo && tavolo!.gruppo && (
            <button type="button" className="sale__menu-item" onClick={onSepara}>
              <i className="fa-solid fa-link-slash" /> Separa dal gruppo
            </button>
          )}
          {isTavolo && mode === 'service' && tavolo!.stato !== 'libero' && (
            <button type="button" className="sale__menu-item" onClick={onLibera}>
              <i className="fa-solid fa-rotate-left" /> Libera tavolo
            </button>
          )}
          {mode === 'compose' && (
            <>
              <div className="sale__menu-sep" />
              <button type="button" className="sale__menu-item sale__menu-item--danger" onClick={onRimuovi}>
                <i className="fa-solid fa-trash" /> Rimuovi {isTavolo ? 'tavolo' : 'elemento'}
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

// ── Sgabelli davanti al bancone bar ───────────────────────────────────────────
const BarStools: React.FC<{ w: number; h: number }> = ({ w, h }) => {
  const horizontal = w >= h;
  const n = Math.max(2, horizontal ? w : h);
  return (
    <>
      {Array.from({ length: n }).map((_, i) => {
        const p = ((i + 0.5) / n) * 100;
        const style = (horizontal ? { left: `${p}%`, top: 'calc(100% + 6px)' } : { top: `${p}%`, left: 'calc(100% + 6px)' }) as React.CSSProperties;
        return <span key={i} className="sale__stool" style={style} />;
      })}
    </>
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

// ── Buffet: segnala pietanze esaurite e richiedi refill in cucina ─────────────
const BuffetRefill: React.FC<{ el: SalaElement; update: (patch: Partial<SalaElement>) => void }> = ({ el, update }) => {
  const dishes = EL_FOOD.buffet!;
  const out = el.esauriti ?? [];
  const toggle = (ic: string) => update({ esauriti: out.includes(ic) ? out.filter(x => x !== ic) : [...out, ic] });
  const richiedi = () => {
    if (!out.length) { toast.warning('Segna prima le pietanze esaurite'); return; }
    update({ refill: true });
    toast.success(`Refill richiesto in cucina: ${out.map(ic => FOOD_LABEL[ic] ?? ic).join(', ')}`);
  };
  const rifornito = () => { update({ esauriti: [], refill: false }); toast.info('Buffet rifornito'); };
  return (
    <div className="sale__buffet">
      <div className="sale__buffet-title">Pietanze — tocca per segnalare esaurito</div>
      <div className="sale__buffet-dishes">
        {dishes.map(ic => (
          <button key={ic} type="button" className={`sale__buffet-dish${out.includes(ic) ? ' is-out' : ''}`} onClick={() => toggle(ic)}>
            <i className={`fa-solid ${ic}`} /> {FOOD_LABEL[ic] ?? ''}
          </button>
        ))}
      </div>
      {el.refill && <div className="sale__buffet-req"><i className="fa-solid fa-bell" /> Refill richiesto in cucina</div>}
      <div className="sale__buffet-btns">
        <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" disabled={!out.length || el.refill} onClick={richiedi}>
          <i className="fa-solid fa-bell-concierge" /> Richiedi refill
        </button>
        <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" disabled={!out.length && !el.refill} onClick={rifornito}>
          <i className="fa-solid fa-check" /> Rifornito
        </button>
      </div>
    </div>
  );
};

// ── Pannello COMPOSIZIONE ─────────────────────────────────────────────────────
const ComposePanel: React.FC<{
  sala: Sala;
  selTavolo: Tavolo | null;
  selEl: SalaElement | null;
  selCount: number;
  newForma: TavoloForma; setNewForma: (f: TavoloForma) => void;
  addTavolo: (cap: number) => void;
  addElemento: (k: SalaElementKind) => void;
  updateTavolo: (patch: Partial<Tavolo>) => void;
  updateElemento: (patch: Partial<SalaElement>) => void;
  del: (id: string) => void;
  setGrid: (cols: number, rows: number) => void;
  align: (kind: 'left' | 'centerH' | 'right' | 'top' | 'middleV' | 'bottom') => void;
  distribute: (axis: 'h' | 'v') => void;
  tidyGrid: () => void;
  delSelezione: () => void;
  selectAll: () => void;
  copy: () => void;
  cut: () => void;
  paste: () => void;
  clipCount: number;
  rotateSel: () => void;
  resizeSel: (w: number, h: number) => void;
}> = ({ sala, selTavolo, selEl, selCount, newForma, setNewForma, addTavolo, addElemento, updateTavolo, updateElemento, del, setGrid, align, distribute, tidyGrid, delSelezione, selectAll, copy, cut, paste, clipCount, rotateSel, resizeSel }) => {
  const multi = selCount >= 2;
  const cards: PanelCard[] = [
    {
      id: 'add-tavolo', title: 'Aggiungi tavolo', body: (
        <>
          <SelectField name="new-forma" label="Forma" value={newForma} onChange={e => setNewForma(e.target.value as TavoloForma)}
            options={FORME.map(f => ({ value: f, label: f.charAt(0).toUpperCase() + f.slice(1) }))} />
          <div className="sale__cap-btns">
            {CAPIENZE.map(c => (
              <button key={c} type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={() => addTavolo(c)}>
                <i className="fa-solid fa-plus" /> {c} cop.
              </button>
            ))}
          </div>
        </>
      ),
    },
    {
      id: 'elementi', title: 'Elementi sala', body: (
        <div className="sale__el-btns">
          {(Object.keys(SALA_EL_META) as SalaElementKind[]).map(k => (
            <button key={k} type="button" className="sale__chip" onClick={() => addElemento(k)}>
              <i className={`fa-solid ${SALA_EL_META[k].icon}`} /> {SALA_EL_META[k].label}
            </button>
          ))}
        </div>
      ),
    },
    {
      id: 'griglia', title: 'Griglia', body: (
        <div className="sale__grid-ctrls">
          <Stepper label="Colonne" value={sala.cols} min={8} max={30} onChange={c => setGrid(c, sala.rows)} />
          <Stepper label="Righe" value={sala.rows} min={6} max={24} onChange={r => setGrid(sala.cols, r)} />
        </div>
      ),
    },
  ];
  if (selTavolo) {
    cards.push({
      id: 'detail', title: 'Tavolo selezionato', icon: 'fa-solid fa-pen', body: (
        <>
          <InputField name="tav-num" label="Numero" value={selTavolo.numero} onChange={e => updateTavolo({ numero: e.target.value })} />
          <Stepper label="Capienza" value={selTavolo.capienza} min={1} max={12} onChange={c => updateTavolo({ capienza: c })} />
          <SelectField name="tav-forma" label="Forma" value={selTavolo.forma} onChange={e => updateTavolo({ forma: e.target.value as TavoloForma })}
            options={FORME.map(f => ({ value: f, label: f.charAt(0).toUpperCase() + f.slice(1) }))} />
          <div className="sale__dim-row">
            <Stepper label="Largh." value={selTavolo.w} min={1} max={sala.cols} onChange={w => resizeSel(w, selTavolo.h)} />
            <Stepper label="Alt." value={selTavolo.h} min={1} max={sala.rows} onChange={h => resizeSel(selTavolo.w, h)} />
          </div>
          <button type="button" className="sale__cc" onClick={rotateSel}><i className="fa-solid fa-rotate" /> Ruota 90°</button>
          <div className="sale__cc-btns">
            <button type="button" className="sale__cc" title="Copia (Ctrl/Cmd+C)" onClick={copy}><i className="fa-solid fa-copy" /> Copia</button>
            <button type="button" className="sale__cc" title="Taglia (Ctrl/Cmd+X)" onClick={cut}><i className="fa-solid fa-scissors" /> Taglia</button>
          </div>
          <button type="button" className="sib-btn sib-btn--danger sib-btn--sm sale__del" onClick={() => del(selTavolo.id)}>
            <i className="fa-solid fa-trash" /> Rimuovi tavolo
          </button>
        </>
      ),
    });
  } else if (selEl) {
    cards.push({
      id: 'detail', title: 'Elemento selezionato', icon: 'fa-solid fa-pen', body: (
        <>
          <div className="sale__el-sel"><i className={`fa-solid ${SALA_EL_META[selEl.kind].icon}`} /> {SALA_EL_META[selEl.kind].label}</div>
          <InputField name="el-label" label="Etichetta" value={selEl.label ?? ''} onChange={e => updateElemento({ label: e.target.value })} />
          <div className="sale__dim-row">
            <Stepper label="Largh." value={selEl.w} min={1} max={sala.cols} onChange={w => resizeSel(w, selEl.h)} />
            <Stepper label="Alt." value={selEl.h} min={1} max={sala.rows} onChange={h => resizeSel(selEl.w, h)} />
          </div>
          <button type="button" className="sale__cc" onClick={rotateSel}><i className="fa-solid fa-rotate" /> Ruota 90°</button>
          {selEl.kind === 'buffet' && (
            <BuffetRefill el={selEl} update={updateElemento} />
          )}
          <div className="sale__cc-btns">
            <button type="button" className="sale__cc" title="Copia (Ctrl/Cmd+C)" onClick={copy}><i className="fa-solid fa-copy" /> Copia</button>
            <button type="button" className="sale__cc" title="Taglia (Ctrl/Cmd+X)" onClick={cut}><i className="fa-solid fa-scissors" /> Taglia</button>
          </div>
          <button type="button" className="sib-btn sib-btn--danger sib-btn--sm sale__del" onClick={() => del(selEl.id)}>
            <i className="fa-solid fa-trash" /> Rimuovi elemento
          </button>
        </>
      ),
    });
  }

  return (
    <>
      {clipCount > 0 && (
        <div className="sale__paste-bar">
          <span><i className="fa-solid fa-clipboard" /> {clipCount} negli appunti</span>
          <button type="button" className="sale__paste-btn" onClick={paste}>
            <i className="fa-solid fa-paste" /> Incolla
          </button>
        </div>
      )}
      {multi && <AlignToolbar count={selCount} align={align} distribute={distribute} tidyGrid={tidyGrid} delSelezione={delSelezione} copy={copy} cut={cut} />}
      <PanelCards storeKey="compose" cards={cards} />
      {!multi && !selTavolo && !selEl && (
        <div className="sale__hint">
          Seleziona un tavolo o un elemento per modificarlo, oppure trascina per posizionarlo.
          <br />Per <b>selezionare più elementi</b>: trascina un riquadro sullo sfondo, oppure Ctrl/Cmd/Shift+click. <button type="button" className="sale__selall" onClick={selectAll}>Seleziona tutto</button>
          <br /><span className="sale__kbd-hint">Copia <kbd>Ctrl/Cmd+C</kbd> · Taglia <kbd>Ctrl/Cmd+X</kbd> · Incolla <kbd>Ctrl/Cmd+V</kbd></span>
        </div>
      )}
    </>
  );
};

// ── Barra allineamento / distribuzione (selezione multipla) ───────────────────
const AlignToolbar: React.FC<{
  count: number;
  align: (kind: 'left' | 'centerH' | 'right' | 'top' | 'middleV' | 'bottom') => void;
  distribute: (axis: 'h' | 'v') => void;
  tidyGrid: () => void;
  delSelezione: () => void;
  copy: () => void;
  cut: () => void;
}> = ({ count, align, distribute, tidyGrid, delSelezione, copy, cut }) => {
  const can3 = count >= 3;
  return (
    <div className="sale__align">
      <div className="sale__align-head">
        <i className="fa-solid fa-object-ungroup" /> {count} elementi selezionati
      </div>
      <div className="sale__align-sec">Allinea</div>
      <div className="sale__align-row">
        <button type="button" className="sale__align-btn" title="Allinea a sinistra" onClick={() => align('left')}><i className="fa-solid fa-align-left" /></button>
        <button type="button" className="sale__align-btn" title="Centra orizzontalmente" onClick={() => align('centerH')}><i className="fa-solid fa-align-center" /></button>
        <button type="button" className="sale__align-btn" title="Allinea a destra" onClick={() => align('right')}><i className="fa-solid fa-align-right" /></button>
        <span className="sale__align-div" />
        <button type="button" className="sale__align-btn" title="Allinea in alto" onClick={() => align('top')}><i className="fa-solid fa-align-left fa-rotate-90" /></button>
        <button type="button" className="sale__align-btn" title="Centra verticalmente" onClick={() => align('middleV')}><i className="fa-solid fa-align-center fa-rotate-90" /></button>
        <button type="button" className="sale__align-btn" title="Allinea in basso" onClick={() => align('bottom')}><i className="fa-solid fa-align-right fa-rotate-90" /></button>
      </div>
      <div className="sale__align-sec">Distribuisci (equidistanzia)</div>
      <div className="sale__align-row">
        <button type="button" className="sale__align-btn" title="Distribuisci orizzontalmente" disabled={!can3} onClick={() => distribute('h')}><i className="fa-solid fa-arrows-left-right-to-line" /></button>
        <button type="button" className="sale__align-btn" title="Distribuisci verticalmente" disabled={!can3} onClick={() => distribute('v')}><i className="fa-solid fa-arrows-up-to-line" /></button>
        <span className="sale__align-div" />
        <button type="button" className="sale__align-btn sale__align-btn--wide" title="Disponi a griglia ordinata" onClick={tidyGrid}><i className="fa-solid fa-table-cells" /> Ordina a griglia</button>
      </div>
      <div className="sale__align-sec">Appunti</div>
      <div className="sale__align-row">
        <button type="button" className="sale__align-btn sale__align-btn--wide" title="Copia (Ctrl/Cmd+C)" onClick={copy}><i className="fa-solid fa-copy" /> Copia</button>
        <button type="button" className="sale__align-btn sale__align-btn--wide" title="Taglia (Ctrl/Cmd+X)" onClick={cut}><i className="fa-solid fa-scissors" /> Taglia</button>
      </div>
      <button type="button" className="sib-btn sib-btn--danger sib-btn--sm sale__align-del" onClick={delSelezione}>
        <i className="fa-solid fa-trash" /> Rimuovi selezionati
      </button>
    </div>
  );
};

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

  const cards: PanelCard[] = [
    {
      id: 'stato', title: 'Stato', body: (
        <div className="sale__stato-btns">
          {STATI.map(s => (
            <button key={s} type="button"
              className={`sale__stato${p.stato === s ? ' is-active' : ''} sale__stato--${s}`}
              onClick={() => setStato(s)}>
              {TAVOLO_STATO_META[s].label}
            </button>
          ))}
        </div>
      ),
    },
    {
      id: 'cameriere', title: 'Cameriere', body: (
        <SelectField name="tav-cam" value={p.cameriere ?? '—'}
          onChange={e => upP({ cameriere: e.target.value === '—' ? undefined : e.target.value })}
          options={CAMERIERI.map(c => ({ value: c, label: c === '—' ? 'Non assegnato' : c }))} />
      ),
    },
  ];
  if (showResa) {
    cards.push({
      id: 'prenotazione', title: p.stato === 'riservato' ? 'Prenotazione' : 'Servizio al tavolo', body: (
        <>
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
        </>
      ),
    });
    cards.push({
      id: 'camera', title: 'Addebito camera', icon: 'fa-solid fa-bed', body: (
        <>
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
        </>
      ),
    });
  }
  cards.push({
    id: 'note', title: 'Note & allergie', icon: 'fa-solid fa-triangle-exclamation sale__aller-ico', body: (
      <TextareaField name="tav-note" value={p.note ?? ''} onChange={e => upP({ note: e.target.value })}
        placeholder="Allergie, intolleranze, richieste particolari…" rows={3} />
    ),
  });
  cards.push({
    id: 'unisci', title: 'Unisci tavoli', icon: 'fa-solid fa-object-group', body: (
      unibili.length === 0 ? (
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
      )
    ),
  });

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

      <PanelCards storeKey="service" cards={cards} />

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
