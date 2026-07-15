// ─── PlanimetriaEditor ────────────────────────────────────────────────────────
// Pagina-editor con cui l'albergatore (dal Planner) o l'operatore (dall'Admin
// Panel) disegna la planimetria di un piano: posiziona su una griglia le camere
// reali del piano e gli elementi di struttura (corridoi, scale, ascensori…).
// La planimetria salvata alimenta poi il viewer (PlanimetriaModal) nel Planner.
//
// Raggiunta via page id `planimetria-editor:<struttura>__<pianoId>`.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import PageHead from '../../../../core/components/PageHead';
import { InputField, SelectField, TextareaField, ToggleSwitch } from '../../../../core/components/form';
import { PIANI_DATA } from '../planner.data';
import { CAM_CLR } from '../planner.styles';
import { useConfirmStore } from '../../../../store/useConfirmStore';
import {
  usePlanimetrieStore,
  ELEMENTO_META,
  ESPOSIZIONI,
  ElementoKind,
  PlanItem,
  Planimetria,
} from '../../../../store/usePlanimetrieStore';
import './PlanimetriaEditor.sass';

const CELL = 44;                 // lato cella in px
const MIN_COLS = 6, MAX_COLS = 30;
const MIN_ROWS = 4, MAX_ROWS = 24;

// Dimensione di default per ogni tipo di elemento appena aggiunto
const DEFAULT_SIZE: Record<ElementoKind, [number, number]> = {
  camera: [2, 2], corridoio: [4, 1], scala: [2, 2], ascensore: [2, 2],
  ingresso: [2, 1], bagno: [2, 2], area: [3, 2],
};

interface Props {
  navigate?: (page: string) => void;
  struttura: string;
  pianoId: number;
}

type Drag =
  | { mode: 'move'; ids: string[]; sx: number; sy: number; origins: Record<string, { x: number; y: number }> }
  | { mode: 'resize'; id: string; sx: number; sy: number; ow: number; oh: number }
  | { mode: 'marquee' };

interface MarqueeRect { x0: number; y0: number; x1: number; y1: number; base: string[] }

// Area libera su una griglia data, escludendo un insieme di id (per move/resize/rotate)
const areaFree = (d: Planimetria, x: number, y: number, w: number, h: number, except: Set<string>) => {
  if (x < 0 || y < 0 || x + w > d.cols || y + h > d.rows) return false;
  return !d.items.some(it =>
    !except.has(it.id) && x < it.x + it.w && x + w > it.x && y < it.y + it.h && y + h > it.y);
};

const PlanimetriaEditor: React.FC<Props> = ({ navigate = () => {}, struttura, pianoId }) => {
  const piano = PIANI_DATA.find(p => p.id === pianoId);
  const getPlan  = usePlanimetrieStore(s => s.getPlan);
  const savePlan = usePlanimetrieStore(s => s.savePlan);
  const confirm  = useConfirmStore(s => s.confirm);

  const [draft, setDraft] = useState<Planimetria>(
    () => getPlan(struttura, pianoId) ?? { cols: 14, rows: 8, items: [] },
  );
  const [selIds, setSelIds] = useState<string[]>([]);
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const [saved, setSaved] = useState(false);

  const drag = useRef<Drag | null>(null);
  const marqueeRef = useRef<MarqueeRect | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const selSet = useMemo(() => new Set(selIds), [selIds]);

  // Camere del piano non ancora posizionate
  const placedNums = useMemo(
    () => new Set(draft.items.filter(i => i.kind === 'camera').map(i => i.numero)),
    [draft.items],
  );
  const camereDisponibili = piano ? piano.camere.filter(c => !placedNums.has(c.numero)) : [];
  const tipoOf = (numero?: string) => piano?.camere.find(c => c.numero === numero)?.tipo ?? '';

  const sel = selIds.length === 1 ? draft.items.find(i => i.id === selIds[0]) ?? null : null;
  // opzioni tipologia: unione delle tipologie del piano + eventuale valore corrente
  const tipoOptions = useMemo(() => {
    const set = new Set<string>();
    piano?.camere.forEach(c => set.add(c.tipo));
    draft.items.forEach(i => i.tipologia && set.add(i.tipologia));
    return Array.from(set).map(t => ({ value: t, label: t }));
  }, [piano, draft.items]);

  const dirty = JSON.stringify(getPlan(struttura, pianoId) ?? { cols: 14, rows: 8, items: [] }) !== JSON.stringify(draft);

  const cellFree = (x: number, y: number, w: number, h: number, exceptId?: string) =>
    areaFree(draft, x, y, w, h, exceptId ? new Set([exceptId]) : new Set());

  const firstFree = (w: number, h: number): { x: number; y: number; grow: number } => {
    for (let y = 0; y <= draft.rows - h; y++)
      for (let x = 0; x <= draft.cols - w; x++)
        if (cellFree(x, y, w, h)) return { x, y, grow: 0 };
    // nessuno spazio: cresci in basso di h righe
    return { x: 0, y: draft.rows, grow: h };
  };

  const addItem = (kind: ElementoKind, numero?: string) => {
    const [w, h] = DEFAULT_SIZE[kind];
    const { x, y, grow } = firstFree(w, h);
    const id = `it-${kind}-${numero ?? draft.items.length}-${x}-${y}`;
    const item: PlanItem = {
      id, kind, x, y, w, h,
      numero: kind === 'camera' ? numero : undefined,
      label: kind === 'camera' ? undefined : ELEMENTO_META[kind].label,
    };
    setDraft(d => ({ ...d, rows: d.rows + grow, items: [...d.items, item] }));
    setSelIds([id]);
  };

  const updateItem = (id: string, patch: Partial<PlanItem>) =>
    setDraft(d => ({ ...d, items: d.items.map(it => (it.id === id ? { ...it, ...patch } : it)) }));

  // Ruota di 90° (scambia larghezza/altezza) gli elementi indicati, se c'è spazio
  const rotateItems = (ids: string[]) => {
    const set = new Set(ids);
    setDraft(d => ({
      ...d,
      items: d.items.map(it => {
        if (!set.has(it.id)) return it;
        const nw = it.h, nh = it.w;
        return areaFree(d, it.x, it.y, nw, nh, new Set([it.id])) ? { ...it, w: nw, h: nh } : it;
      }),
    }));
  };

  const removeItems = async (ids: string[]) => {
    if (!ids.length) return;
    const msg = ids.length > 1
      ? `Rimuovere ${ids.length} elementi selezionati?`
      : 'Rimuovere questo elemento dalla planimetria?';
    if (await confirm({ message: msg })) {
      const set = new Set(ids);
      setDraft(d => ({ ...d, items: d.items.filter(it => !set.has(it.id)) }));
      setSelIds([]);
    }
  };

  const setSize = (dim: 'cols' | 'rows', delta: number) =>
    setDraft(d => {
      const lo = dim === 'cols' ? MIN_COLS : MIN_ROWS;
      const hi = dim === 'cols' ? MAX_COLS : MAX_ROWS;
      const next = Math.min(hi, Math.max(lo, d[dim] + delta));
      // non rimpicciolire oltre gli elementi presenti
      const need = Math.max(lo, ...d.items.map(it => (dim === 'cols' ? it.x + it.w : it.y + it.h)));
      return { ...d, [dim]: Math.max(next, need) };
    });

  // ── Pointer: marquee (selezione area), spostamento di gruppo, resize ──────────
  const onPointerMove = (e: PointerEvent) => {
    const dr = drag.current;
    if (!dr) return;
    if (dr.mode === 'marquee') {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect || !marqueeRef.current) return;
      const next = { ...marqueeRef.current, x1: e.clientX - rect.left, y1: e.clientY - rect.top };
      marqueeRef.current = next;
      setMarquee(next);
      return;
    }
    const dxRaw = Math.round((e.clientX - dr.sx) / CELL);
    const dyRaw = Math.round((e.clientY - dr.sy) / CELL);
    setDraft(d => {
      if (dr.mode === 'resize') {
        return {
          ...d,
          items: d.items.map(it => {
            if (it.id !== dr.id) return it;
            const nw = Math.min(d.cols - it.x, Math.max(1, dr.ow + dxRaw));
            const nh = Math.min(d.rows - it.y, Math.max(1, dr.oh + dyRaw));
            return areaFree(d, it.x, it.y, nw, nh, new Set([it.id])) ? { ...it, w: nw, h: nh } : it;
          }),
        };
      }
      // spostamento di gruppo: un solo delta valido per tutti gli elementi mossi
      const set = new Set(dr.ids);
      const movers = d.items.filter(it => set.has(it.id));
      if (!movers.length) return d;
      let loX = -Infinity, hiX = Infinity, loY = -Infinity, hiY = Infinity;
      for (const it of movers) {
        const o = dr.origins[it.id];
        loX = Math.max(loX, -o.x); hiX = Math.min(hiX, d.cols - it.w - o.x);
        loY = Math.max(loY, -o.y); hiY = Math.min(hiY, d.rows - it.h - o.y);
      }
      const dx = Math.min(hiX, Math.max(loX, dxRaw));
      const dy = Math.min(hiY, Math.max(loY, dyRaw));
      const ok = movers.every(it => areaFree(d, dr.origins[it.id].x + dx, dr.origins[it.id].y + dy, it.w, it.h, set));
      if (!ok) return d;
      return {
        ...d,
        items: d.items.map(it => set.has(it.id)
          ? { ...it, x: dr.origins[it.id].x + dx, y: dr.origins[it.id].y + dy }
          : it),
      };
    });
  };

  const endDrag = () => {
    const dr = drag.current;
    if (dr?.mode === 'marquee' && marqueeRef.current) {
      const m = marqueeRef.current;
      const mx0 = Math.min(m.x0, m.x1), my0 = Math.min(m.y0, m.y1);
      const mx1 = Math.max(m.x0, m.x1), my1 = Math.max(m.y0, m.y1);
      if (mx1 - mx0 >= 4 || my1 - my0 >= 4) {
        const hits = draft.items.filter(it => {
          const l = it.x * CELL, t = it.y * CELL, r = (it.x + it.w) * CELL, b = (it.y + it.h) * CELL;
          return l < mx1 && r > mx0 && t < my1 && b > my0;   // intersezione col rettangolo
        }).map(it => it.id);
        setSelIds(Array.from(new Set([...m.base, ...hits])));
      }
    }
    marqueeRef.current = null;
    setMarquee(null);
    drag.current = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', endDrag);
  };

  const startDrag = (dr: Drag) => {
    drag.current = dr;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endDrag);
  };

  const onItemPointerDown = (e: React.PointerEvent, it: PlanItem) => {
    e.stopPropagation();
    if (e.shiftKey) {   // shift = aggiungi/togli dalla selezione (nessun drag)
      setSelIds(prev => prev.includes(it.id) ? prev.filter(x => x !== it.id) : [...prev, it.id]);
      return;
    }
    const group = selSet.has(it.id) && selIds.length > 1;
    const ids = group ? selIds : [it.id];
    if (!group) setSelIds([it.id]);
    const origins: Record<string, { x: number; y: number }> = {};
    draft.items.forEach(i => { if (ids.includes(i.id)) origins[i.id] = { x: i.x, y: i.y }; });
    startDrag({ mode: 'move', ids, sx: e.clientX, sy: e.clientY, origins });
  };

  const onCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.target !== canvasRef.current) return;   // solo sul vuoto della griglia
    const rect = canvasRef.current.getBoundingClientRect();
    const lx = e.clientX - rect.left, ly = e.clientY - rect.top;
    const base = e.shiftKey ? selIds : [];
    if (!e.shiftKey) setSelIds([]);
    const m: MarqueeRect = { x0: lx, y0: ly, x1: lx, y1: ly, base };
    marqueeRef.current = m;
    setMarquee(m);
    startDrag({ mode: 'marquee' });
  };

  // Scorciatoie: Canc = elimina selezione, R = ruota, Esc = deseleziona
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      if (e.key === 'Escape') { setSelIds([]); return; }
      if (!selIds.length) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeItems(selIds); }
      else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); rotateItems(selIds); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selIds]);

  const handleSave = () => {
    savePlan(struttura, pianoId, draft);
    setSaved(true);
  };

  if (!piano) {
    return (
      <div className="plan-editor">
        <PageHead title="Editor planimetria" subtitle="Piano non trovato" />
      </div>
    );
  }

  return (
    <div className="plan-editor">
      <PageHead
        title="Editor planimetria"
        subtitle={`${struttura} · ${piano.nome}`}
        actions={
          <>
            {saved && !dirty && (
              <span className="plan-editor__saved"><i className="fa-solid fa-circle-check" /> Salvata</span>
            )}
            <button type="button" className="sib-btn sib-btn--primary" disabled={!dirty} onClick={handleSave}>
              <i className="fa-solid fa-floppy-disk" /> Salva planimetria
            </button>
          </>
        }
      />

      <div className="plan-editor__body">

        {/* ── PALETTE ──────────────────────────────────────────────────────── */}
        <aside className="plan-editor__palette">
          <div className="plan-editor__pal-group">
            <div className="plan-editor__pal-title">
              Camere del piano
              <span className="plan-editor__pal-count">{placedNums.size}/{piano.camere.length}</span>
            </div>
            <div className="plan-editor__pal-hint">Clicca per posizionare sulla griglia</div>
            <div className="plan-editor__chips">
              {piano.camere.map(c => {
                const placed = placedNums.has(c.numero);
                return (
                  <button
                    key={c.numero}
                    type="button"
                    className={`plan-editor__chip${placed ? ' is-placed' : ''}`}
                    disabled={placed}
                    onClick={() => addItem('camera', c.numero)}
                    title={c.tipo}
                  >
                    <span className="plan-editor__chip-dot" style={{ '--dot': CAM_CLR[c.stato] } as React.CSSProperties} />
                    Cam. {c.numero}
                    {placed && <i className="fa-solid fa-check plan-editor__chip-ok" />}
                  </button>
                );
              })}
              {camereDisponibili.length === 0 && (
                <div className="plan-editor__pal-done"><i className="fa-solid fa-circle-check" /> Tutte posizionate</div>
              )}
            </div>
          </div>

          <div className="plan-editor__pal-group">
            <div className="plan-editor__pal-title">Elementi struttura</div>
            <div className="plan-editor__chips">
              {(Object.keys(ELEMENTO_META) as Array<keyof typeof ELEMENTO_META>).map(k => (
                <button key={k} type="button" className="plan-editor__chip plan-editor__chip--el" onClick={() => addItem(k)}>
                  <i className={`fa-solid ${ELEMENTO_META[k].icon}`} />
                  {ELEMENTO_META[k].label}
                </button>
              ))}
            </div>
          </div>

          <div className="plan-editor__pal-group">
            <div className="plan-editor__pal-title">Dimensione griglia</div>
            <div className="plan-editor__stepper">
              <span>Colonne</span>
              <button type="button" onClick={() => setSize('cols', -1)}><i className="fa-solid fa-minus" /></button>
              <b>{draft.cols}</b>
              <button type="button" onClick={() => setSize('cols', 1)}><i className="fa-solid fa-plus" /></button>
            </div>
            <div className="plan-editor__stepper">
              <span>Righe</span>
              <button type="button" onClick={() => setSize('rows', -1)}><i className="fa-solid fa-minus" /></button>
              <b>{draft.rows}</b>
              <button type="button" onClick={() => setSize('rows', 1)}><i className="fa-solid fa-plus" /></button>
            </div>
          </div>
        </aside>

        {/* ── CANVAS ───────────────────────────────────────────────────────── */}
        <div className="plan-editor__canvas-wrap">
          <div
            ref={canvasRef}
            className="plan-editor__canvas"
            style={{ '--cols': draft.cols, '--rows': draft.rows, '--cell': `${CELL}px` } as React.CSSProperties}
            onPointerDown={onCanvasPointerDown}
          >
            {draft.items.map(it => {
              const isCam = it.kind === 'camera';
              const isSel = selSet.has(it.id);
              const single = isSel && selIds.length === 1;
              const style = {
                '--x': it.x, '--y': it.y, '--w': it.w, '--h': it.h,
                ...(isCam ? { '--room-clr': CAM_CLR[piano.camere.find(c => c.numero === it.numero)?.stato ?? 'libera'] } : {}),
              } as React.CSSProperties;
              return (
                <div
                  key={it.id}
                  className={`plan-editor__item plan-editor__item--${it.kind}${isSel ? ' is-selected' : ''}`}
                  style={style}
                  onPointerDown={(e) => onItemPointerDown(e, it)}
                >
                  {isCam ? (
                    <>
                      <span className="plan-editor__item-bar" />
                      <span className="plan-editor__item-num">{it.numero}</span>
                      <span className="plan-editor__item-type">{tipoOf(it.numero)}</span>
                    </>
                  ) : (
                    <>
                      <i className={`fa-solid ${ELEMENTO_META[it.kind as Exclude<ElementoKind,'camera'>].icon} plan-editor__item-icon`} />
                      <span className="plan-editor__item-label">{it.label}</span>
                    </>
                  )}
                  {single && (
                    <>
                      <button
                        type="button"
                        className="plan-editor__item-rotate"
                        title="Ruota 90°"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); rotateItems([it.id]); }}
                      >
                        <i className="fa-solid fa-rotate" />
                      </button>
                      <button
                        type="button"
                        className="plan-editor__item-del"
                        title="Rimuovi"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); removeItems([it.id]); }}
                      >
                        <i className="fa-solid fa-trash-can" />
                      </button>
                      <span
                        className="plan-editor__item-resize"
                        onPointerDown={(e) => { e.stopPropagation(); startDrag({ mode: 'resize', id: it.id, sx: e.clientX, sy: e.clientY, ow: it.w, oh: it.h }); }}
                      />
                    </>
                  )}
                </div>
              );
            })}

            {marquee && (
              <div
                className="plan-editor__marquee"
                style={{
                  '--mx': `${Math.min(marquee.x0, marquee.x1)}px`,
                  '--my': `${Math.min(marquee.y0, marquee.y1)}px`,
                  '--mw': `${Math.abs(marquee.x1 - marquee.x0)}px`,
                  '--mh': `${Math.abs(marquee.y1 - marquee.y0)}px`,
                } as React.CSSProperties}
              />
            )}

            {draft.items.length === 0 && (
              <div className="plan-editor__empty">
                <i className="fa-solid fa-vector-square" />
                <span>Aggiungi camere ed elementi dalla palette per iniziare</span>
              </div>
            )}
          </div>
        </div>

        {/* ── ISPETTORE ────────────────────────────────────────────────────── */}
        <aside className="plan-editor__inspector">
          {selIds.length === 0 && (
            <div className="plan-editor__insp-empty">
              <i className="fa-solid fa-arrow-pointer" />
              <span>Seleziona un elemento, o trascina un'area sul vuoto per selezionarne più di uno. Shift-clic per aggiungere · R per ruotare · Canc per eliminare.</span>
            </div>
          )}

          {selIds.length > 1 && (
            <>
              <div className="plan-editor__insp-head">
                <span className="plan-editor__insp-eyebrow">Selezione area</span>
                <span className="plan-editor__insp-title">{selIds.length} elementi</span>
                <span className="plan-editor__insp-sub">Trascinali per spostarli insieme</span>
              </div>
              <div className="plan-editor__insp-fields">
                <div className="plan-editor__insp-actions">
                  <button type="button" className="sib-btn sib-btn--secondary" onClick={() => rotateItems(selIds)}>
                    <i className="fa-solid fa-rotate" /> Ruota 90°
                  </button>
                  <button type="button" className="sib-btn sib-btn--secondary plan-editor__insp-del" onClick={() => removeItems(selIds)}>
                    <i className="fa-solid fa-trash-can" /> Rimuovi selezione
                  </button>
                </div>
              </div>
            </>
          )}

          {sel && sel.kind === 'camera' && (
            <>
              <div className="plan-editor__insp-head">
                <span className="plan-editor__insp-eyebrow">Camera</span>
                <span className="plan-editor__insp-title">Cam. {sel.numero}</span>
                <span className="plan-editor__insp-sub">{piano.nome} · {struttura}</span>
              </div>

              <div className="plan-editor__insp-fields">
                <SelectField
                  name="tipologia" label="Tipologia"
                  value={sel.tipologia ?? tipoOf(sel.numero)}
                  options={tipoOptions}
                  onChange={e => updateItem(sel.id, { tipologia: e.target.value })}
                />
                <div className="plan-editor__insp-row">
                  <InputField
                    name="metratura" label="Metratura (m²)" type="number" min={0}
                    value={sel.metratura ?? ''}
                    onChange={e => updateItem(sel.id, { metratura: e.target.value === '' ? undefined : Number(e.target.value) })}
                  />
                  <InputField
                    name="capacita" label="Capacità (pax)" type="number" min={1}
                    value={sel.capacita ?? ''}
                    onChange={e => updateItem(sel.id, { capacita: e.target.value === '' ? undefined : Number(e.target.value) })}
                  />
                </div>
                <InputField
                  name="letti" label="Letti"
                  placeholder="es. 1 matrimoniale + 1 singolo"
                  value={sel.letti ?? ''}
                  onChange={e => updateItem(sel.id, { letti: e.target.value })}
                />
                <SelectField
                  name="esposizione" label="Esposizione / affaccio"
                  value={sel.esposizione ?? ''}
                  placeholder="Seleziona…"
                  options={ESPOSIZIONI.map(e => ({ value: e, label: e }))}
                  onChange={e => updateItem(sel.id, { esposizione: e.target.value as PlanItem['esposizione'] })}
                />
                <ToggleSwitch
                  label="Camera accessibile (disabili)"
                  checked={!!sel.accessibile}
                  onChange={v => updateItem(sel.id, { accessibile: v })}
                />
                <TextareaField
                  name="note" label="Note operative" rows={3}
                  value={sel.note ?? ''}
                  onChange={e => updateItem(sel.id, { note: e.target.value })}
                />

                <div className="plan-editor__insp-meta">
                  <span>Posizione: col {sel.x + 1}, riga {sel.y + 1}</span>
                  <span>Ingombro: {sel.w}×{sel.h} celle</span>
                </div>

                <div className="plan-editor__insp-actions">
                  <button type="button" className="sib-btn sib-btn--secondary" onClick={() => rotateItems([sel.id])}>
                    <i className="fa-solid fa-rotate" /> Ruota 90°
                  </button>
                  <button type="button" className="sib-btn sib-btn--secondary plan-editor__insp-del" onClick={() => removeItems([sel.id])}>
                    <i className="fa-solid fa-trash-can" /> Rimuovi camera
                  </button>
                </div>
              </div>
            </>
          )}

          {sel && sel.kind !== 'camera' && (
            <>
              <div className="plan-editor__insp-head">
                <span className="plan-editor__insp-eyebrow">Elemento</span>
                <span className="plan-editor__insp-title">
                  <i className={`fa-solid ${ELEMENTO_META[sel.kind as Exclude<ElementoKind,'camera'>].icon}`} /> {ELEMENTO_META[sel.kind as Exclude<ElementoKind,'camera'>].label}
                </span>
              </div>
              <div className="plan-editor__insp-fields">
                <InputField
                  name="label" label="Etichetta"
                  value={sel.label ?? ''}
                  onChange={e => updateItem(sel.id, { label: e.target.value })}
                />
                <div className="plan-editor__insp-meta">
                  <span>Posizione: col {sel.x + 1}, riga {sel.y + 1}</span>
                  <span>Ingombro: {sel.w}×{sel.h} celle</span>
                </div>
                <div className="plan-editor__insp-actions">
                  <button type="button" className="sib-btn sib-btn--secondary" onClick={() => rotateItems([sel.id])}>
                    <i className="fa-solid fa-rotate" /> Ruota 90°
                  </button>
                  <button type="button" className="sib-btn sib-btn--secondary plan-editor__insp-del" onClick={() => removeItems([sel.id])}>
                    <i className="fa-solid fa-trash-can" /> Rimuovi elemento
                  </button>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
};

export default PlanimetriaEditor;
