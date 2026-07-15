// ─── PlanimetriaEditor ────────────────────────────────────────────────────────
// Pagina-editor con cui l'albergatore (dal Planner) o l'operatore (dall'Admin
// Panel) disegna la planimetria di un piano: posiziona su una griglia le camere
// reali del piano e gli elementi di struttura (corridoi, scale, ascensori…).
// La planimetria salvata alimenta poi il viewer (PlanimetriaModal) nel Planner.
//
// Raggiunta via page id `planimetria-editor:<struttura>__<pianoId>`.
import React, { useMemo, useRef, useState } from 'react';
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
  | { mode: 'move'; id: string; sx: number; sy: number; ox: number; oy: number }
  | { mode: 'resize'; id: string; sx: number; sy: number; ow: number; oh: number };

const PlanimetriaEditor: React.FC<Props> = ({ navigate = () => {}, struttura, pianoId }) => {
  const piano = PIANI_DATA.find(p => p.id === pianoId);
  const getPlan  = usePlanimetrieStore(s => s.getPlan);
  const savePlan = usePlanimetrieStore(s => s.savePlan);
  const confirm  = useConfirmStore(s => s.confirm);

  const [draft, setDraft] = useState<Planimetria>(
    () => getPlan(struttura, pianoId) ?? { cols: 14, rows: 8, items: [] },
  );
  const [selId, setSelId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const drag = useRef<Drag | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Camere del piano non ancora posizionate
  const placedNums = useMemo(
    () => new Set(draft.items.filter(i => i.kind === 'camera').map(i => i.numero)),
    [draft.items],
  );
  const camereDisponibili = piano ? piano.camere.filter(c => !placedNums.has(c.numero)) : [];
  const tipoOf = (numero?: string) => piano?.camere.find(c => c.numero === numero)?.tipo ?? '';

  const sel = draft.items.find(i => i.id === selId) ?? null;
  // opzioni tipologia: unione delle tipologie del piano + eventuale valore corrente
  const tipoOptions = useMemo(() => {
    const set = new Set<string>();
    piano?.camere.forEach(c => set.add(c.tipo));
    draft.items.forEach(i => i.tipologia && set.add(i.tipologia));
    return Array.from(set).map(t => ({ value: t, label: t }));
  }, [piano, draft.items]);

  const dirty = JSON.stringify(getPlan(struttura, pianoId) ?? { cols: 14, rows: 8, items: [] }) !== JSON.stringify(draft);

  // ── Occupazione griglia (esclude un id, per move/resize del selezionato) ──────
  const cellFree = (x: number, y: number, w: number, h: number, exceptId?: string) => {
    if (x < 0 || y < 0 || x + w > draft.cols || y + h > draft.rows) return false;
    return !draft.items.some(it => {
      if (it.id === exceptId) return false;
      return x < it.x + it.w && x + w > it.x && y < it.y + it.h && y + h > it.y;
    });
  };

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
    setSelId(id);
    setSaved(false);
  };

  const updateItem = (id: string, patch: Partial<PlanItem>) =>
    setDraft(d => ({ ...d, items: d.items.map(it => (it.id === id ? { ...it, ...patch } : it)) }));

  const removeItem = async (id: string) => {
    if (await confirm({ message: 'Rimuovere questo elemento dalla planimetria?' })) {
      setDraft(d => ({ ...d, items: d.items.filter(it => it.id !== id) }));
      setSelId(null);
      setSaved(false);
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

  // ── Drag & resize (pointer) ───────────────────────────────────────────────────
  const onPointerMove = (e: PointerEvent) => {
    const dr = drag.current;
    if (!dr) return;
    const dx = Math.round((e.clientX - dr.sx) / CELL);
    const dy = Math.round((e.clientY - dr.sy) / CELL);
    setDraft(d => ({
      ...d,
      items: d.items.map(it => {
        if (it.id !== dr.id) return it;
        if (dr.mode === 'move') {
          const nx = Math.min(d.cols - it.w, Math.max(0, dr.ox + dx));
          const ny = Math.min(d.rows - it.h, Math.max(0, dr.oy + dy));
          return cellFree(nx, ny, it.w, it.h, it.id) ? { ...it, x: nx, y: ny } : it;
        }
        const nw = Math.min(d.cols - it.x, Math.max(1, dr.ow + dx));
        const nh = Math.min(d.rows - it.y, Math.max(1, dr.oh + dy));
        return cellFree(it.x, it.y, nw, nh, it.id) ? { ...it, w: nw, h: nh } : it;
      }),
    }));
  };
  const endDrag = () => {
    drag.current = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', endDrag);
  };
  const startDrag = (e: React.PointerEvent, dr: Drag) => {
    e.stopPropagation();
    drag.current = dr;
    setSelId(dr.id);
    setSaved(false);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endDrag);
  };

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
            onPointerDown={() => setSelId(null)}
          >
            {draft.items.map(it => {
              const isCam = it.kind === 'camera';
              const sel = it.id === selId;
              const style = {
                '--x': it.x, '--y': it.y, '--w': it.w, '--h': it.h,
                ...(isCam ? { '--room-clr': CAM_CLR[piano.camere.find(c => c.numero === it.numero)?.stato ?? 'libera'] } : {}),
              } as React.CSSProperties;
              return (
                <div
                  key={it.id}
                  className={`plan-editor__item plan-editor__item--${it.kind}${sel ? ' is-selected' : ''}`}
                  style={style}
                  onPointerDown={(e) => startDrag(e, { mode: 'move', id: it.id, sx: e.clientX, sy: e.clientY, ox: it.x, oy: it.y })}
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
                  {sel && (
                    <>
                      <button
                        type="button"
                        className="plan-editor__item-del"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); removeItem(it.id); }}
                      >
                        <i className="fa-solid fa-trash-can" />
                      </button>
                      <span
                        className="plan-editor__item-resize"
                        onPointerDown={(e) => startDrag(e, { mode: 'resize', id: it.id, sx: e.clientX, sy: e.clientY, ow: it.w, oh: it.h })}
                      />
                    </>
                  )}
                </div>
              );
            })}

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
          {!sel && (
            <div className="plan-editor__insp-empty">
              <i className="fa-solid fa-arrow-pointer" />
              <span>Seleziona un elemento sulla griglia per modificarne i dettagli</span>
            </div>
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

                <button type="button" className="sib-btn sib-btn--secondary plan-editor__insp-del" onClick={() => removeItem(sel.id)}>
                  <i className="fa-solid fa-trash-can" /> Rimuovi camera
                </button>
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
                <button type="button" className="sib-btn sib-btn--secondary plan-editor__insp-del" onClick={() => removeItem(sel.id)}>
                  <i className="fa-solid fa-trash-can" /> Rimuovi elemento
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
};

export default PlanimetriaEditor;
