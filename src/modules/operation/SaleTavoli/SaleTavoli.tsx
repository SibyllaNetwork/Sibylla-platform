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
  SalaElementKind,
  SalaElement,
  TavoloForma,
  TavoloStato,
  Tavolo,
} from '../../../store/useSaleStore';
import './SaleTavoli.sass';

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
const STATI: TavoloStato[] = ['libero', 'occupato', 'riservato'];

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
  const confirm = useConfirmStore(s => s.confirm);

  const [mode, setMode] = useState<'compose' | 'service'>('service');
  const [salaId, setSalaId] = useState(sale[0]?.id ?? '');
  const [newForma, setNewForma] = useState<TavoloForma>('quadrato');
  const [selId, setSelId] = useState<string | null>(null);

  const sala = sale.find(s => s.id === salaId) ?? sale[0];
  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; ox: number; oy: number; moved: boolean } | null>(null);

  useEffect(() => { if (sala && salaId !== sala.id) setSalaId(sala.id); }, [sala, salaId]);
  useEffect(() => { setSelId(null); }, [salaId, mode]);

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
    const r = canvasRef.current!.getBoundingClientRect();
    drag.current = { id, ox: (e.clientX - r.left) / CELL - ix, oy: (e.clientY - r.top) / CELL - iy, moved: false };
    setSelId(id);
  };

  const coperti = sala.tavoli.reduce((m, t) => m + t.capienza, 0);
  const occ = sala.tavoli.filter(t => t.stato === 'occupato').length;
  const ris = sala.tavoli.filter(t => t.stato === 'riservato').length;
  const lib = sala.tavoli.length - occ - ris;

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

  return (
    <div className="sale">
      <PageHead
        title="Sale e tavoli"
        subtitle={`Food & Beverage · ${sala.nome}`}
        actions={
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
        }
      />

      {/* barra: sala + riepilogo */}
      <div className="sale__bar">
        <div className="sale__bar-sala">
          <SelectField name="sala" label="Sala" value={sala.id} onChange={e => setSalaId(e.target.value)}
            options={sale.map(s => ({ value: s.id, label: s.nome }))} />
        </div>
        <div className="sale__stats">
          <span className="sale__stat"><b>{sala.tavoli.length}</b> tavoli</span>
          <span className="sale__stat"><b>{coperti}</b> coperti</span>
          <span className="sale__stat sale__stat--lib"><b>{lib}</b> liberi</span>
          <span className="sale__stat sale__stat--occ"><b>{occ}</b> occupati</span>
          <span className="sale__stat sale__stat--ris"><b>{ris}</b> riservati</span>
        </div>
      </div>

      <div className="sale__body">
        {/* ── PLANIMETRIA (sinistra) ─────────────────────────────────────────── */}
        <div className="sale__plan">
          <div
            ref={canvasRef}
            className={`sale__canvas${mode === 'compose' ? ' is-compose' : ''}`}
            style={{ '--cols': sala.cols, '--rows': sala.rows, '--cell': `${CELL}px` } as React.CSSProperties}
            onPointerDown={e => { if (e.target === e.currentTarget) setSelId(null); }}
          >
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
                className={`sale__tav sale__tav--${t.forma} is-${t.stato}${selId === t.id ? ' is-sel' : ''}`}
                style={{ '--x': t.x, '--y': t.y, '--w': t.w, '--h': t.h } as React.CSSProperties}
                onPointerDown={e => startDrag(e, t.id, t.x, t.y)}
                title={`Tavolo ${t.numero} · ${t.capienza} coperti`}
              >
                {canvasSeats(t).map((s, i) => (
                  <span key={i} className="sale__tav-seat"
                    style={{ '--sx': `${s.x}px`, '--sy': `${s.y}px`, '--rot': `${s.rot}deg` } as React.CSSProperties} />
                ))}
                <span className="sale__tav-surface" aria-hidden="true" />
                <span className="sale__tav-num">{t.numero}</span>
                <span className="sale__tav-cap"><i className="fa-solid fa-chair" /> {t.capienza}</span>
                {t.nominativo && <span className="sale__tav-nom">{t.nominativo}</span>}
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
              selTavolo={selTavolo}
              updateTavolo={(patch) => selTavolo && updateTavolo(sala.id, selTavolo.id, patch)}
            />
          )}
        </aside>
      </div>
    </div>
  );
};

// ── Disegno ingrandito del tavolo con i coperti attorno ───────────────────────
const TavoloBig: React.FC<{ t: Tavolo }> = ({ t }) => {
  const R = 96;                            // raggio area
  const seats = Array.from({ length: t.capienza });
  const color = TAVOLO_STATO_META[t.stato].color;
  const wide = t.forma === 'rettangolare';
  const tw = wide ? 150 : 96, th = 96;
  return (
    <div className="sale__big" style={{ '--stato': color } as React.CSSProperties}>
      <div className="sale__big-area">
        {seats.map((_, i) => {
          const a = (i / t.capienza) * Math.PI * 2 - Math.PI / 2;
          const rx = wide ? 100 : 72, ry = 66;
          const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
          return <span key={i} className="sale__seat"
            style={{ '--sx': `${x}px`, '--sy': `${y}px`, '--rot': `${(a * 180) / Math.PI + 90}deg` } as React.CSSProperties} />;
        })}
        <div className={`sale__big-top sale__big-top--${t.forma}`} style={{ '--tw': `${tw}px`, '--th': `${th}px` } as React.CSSProperties}>
          <span className="sale__big-num">{t.numero}</span>
          <span className="sale__big-cap">{t.capienza} coperti</span>
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
  selTavolo: Tavolo | null;
  updateTavolo: (patch: Partial<Tavolo>) => void;
}> = ({ selTavolo, updateTavolo }) => {
  if (!selTavolo) {
    return <div className="sale__hint"><i className="fa-solid fa-hand-pointer" /> Seleziona un tavolo dalla planimetria per assegnarlo, prenotarlo o annotare le allergie.</div>;
  }
  const t = selTavolo;
  return (
    <>
      <TavoloBig t={t} />

      <div className="sale__group">
        <div className="sale__group-title">Stato</div>
        <div className="sale__stato-btns">
          {STATI.map(s => (
            <button key={s} type="button"
              className={`sale__stato${t.stato === s ? ' is-active' : ''} sale__stato--${s}`}
              onClick={() => updateTavolo({ stato: s })}>
              {TAVOLO_STATO_META[s].label}
            </button>
          ))}
        </div>
      </div>

      {t.stato !== 'libero' && (
        <div className="sale__group">
          <div className="sale__group-title">{t.stato === 'riservato' ? 'Prenotazione' : 'Servizio al tavolo'}</div>
          <InputField name="tav-nom" label="Nominativo" value={t.nominativo ?? ''} onChange={e => updateTavolo({ nominativo: e.target.value })} placeholder="Es. Rossi" />
          <div className="sale__row2">
            <InputField name="tav-ora" label="Orario" value={t.orario ?? ''} onChange={e => updateTavolo({ orario: e.target.value })} placeholder="HH:MM" />
            <Stepper label="Coperti" value={t.coperti ?? t.capienza} min={1} max={t.capienza} onChange={c => updateTavolo({ coperti: c })} />
          </div>
        </div>
      )}

      <div className="sale__group">
        <div className="sale__group-title"><i className="fa-solid fa-triangle-exclamation sale__aller-ico" /> Note &amp; allergie</div>
        <TextareaField name="tav-note" value={t.note ?? ''} onChange={e => updateTavolo({ note: e.target.value })}
          placeholder="Allergie, intolleranze, richieste particolari…" rows={3} />
      </div>

      {t.stato !== 'libero' && (
        <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm sale__free"
          onClick={() => updateTavolo({ stato: 'libero', nominativo: undefined, orario: undefined, coperti: undefined, note: undefined })}>
          <i className="fa-solid fa-rotate-left" /> Libera tavolo
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
