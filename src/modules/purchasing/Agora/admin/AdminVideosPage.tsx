/*
 * AdminVideosPage — CRUD video tutorial e-learning.
 *
 * Layout: header con titolo + logout + reset, tabella video, drawer laterale
 * per creazione/modifica. Tutti i dati persistono via VideosContext (localStorage).
 */

import { useMemo, useState, type FormEvent } from 'react';
import { Icon } from '../ds/icon';
import { VideoPlayer } from '../VideoPlayer';
import { AdminPageHeader } from './AdminPageHeader';
import {
  useVideos,
  videoPoster,
  VIDEO_CATEGORIES,
  type Video,
  type VideoLevel,
  type VideoProvider,
} from '../context/VideosContext';
import './AdminVideosPage.css';

const LEVEL_OPTIONS: { value: VideoLevel; label: string }[] = [
  { value: 'base',       label: 'Base'       },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzato',   label: 'Avanzato'   },
];

const PROVIDER_OPTIONS: { value: VideoProvider; label: string; hint: string }[] = [
  { value: 'youtube', label: 'YouTube',     hint: 'Incolla l\'URL o l\'ID del video (es. dQw4w9WgXcQ)' },
  { value: 'vimeo',   label: 'Vimeo',       hint: 'Incolla l\'URL o l\'ID numerico del video Vimeo'     },
  { value: 'url',     label: 'URL diretto', hint: 'URL MP4/WebM o HLS (.m3u8) — es. da Mux/Cloudflare'   },
];

interface FormState {
  title: string;
  description: string;
  category: string;
  level: VideoLevel;
  duration: string;
  views: string;
  daysAgo: string;
  provider: VideoProvider;
  source: string;
  poster: string;
  published: boolean;
}

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  category: VIDEO_CATEGORIES[0]?.id ?? '',
  level: 'base',
  duration: '',
  views: '0',
  daysAgo: '0',
  provider: 'youtube',
  source: '',
  poster: '',
  published: true,
};

function videoToForm(v: Video): FormState {
  return {
    title:       v.title,
    description: v.description,
    category:    v.category,
    level:       v.level,
    duration:    v.duration,
    views:       String(v.views),
    daysAgo:     String(v.daysAgo),
    provider:    v.provider,
    source:      v.source,
    poster:      v.poster ?? '',
    published:   v.published,
  };
}

export function AdminVideosPage() {
  const { videos, addVideo, updateVideo, removeVideo, resetToSeed } = useVideos();

  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return videos;
    return videos.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q),
    );
  }, [videos, search]);

  const previewVideo = useMemo(
    () => (previewId ? videos.find((v) => v.id === previewId) ?? null : null),
    [previewId, videos],
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  };

  const openEdit = (v: Video) => {
    setEditingId(v.id);
    setForm(videoToForm(v));
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingId(null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      title:       form.title.trim(),
      description: form.description.trim(),
      category:    form.category,
      level:       form.level,
      duration:    form.duration.trim() || '0:00',
      views:       Math.max(0, parseInt(form.views, 10) || 0),
      daysAgo:     Math.max(0, parseInt(form.daysAgo, 10) || 0),
      provider:    form.provider,
      source:      form.source.trim(),
      poster:      form.poster.trim() || undefined,
      published:   form.published,
    };
    if (!payload.title || !payload.category) {
      window.alert('Titolo e categoria sono obbligatori.');
      return;
    }
    if (editingId) {
      updateVideo(editingId, payload);
    } else {
      addVideo(payload);
    }
    closeDrawer();
  };

  const handleTogglePublish = (v: Video) => {
    updateVideo(v.id, { published: !v.published });
  };

  const handleDelete = (v: Video) => {
    if (window.confirm(`Eliminare il video "${v.title}"?`)) {
      removeVideo(v.id);
      if (previewId === v.id) setPreviewId(null);
    }
  };

  const handleReset = () => {
    if (
      window.confirm(
        'Ripristinare la lista video al contenuto iniziale? Tutte le modifiche locali andranno perse.',
      )
    ) {
      resetToSeed();
      setPreviewId(null);
    }
  };

  return (
    <>
      <div className="admin-videos">
        <AdminPageHeader
          title="E-learning"
          subtitle="Gestisci i video tutorial pubblicati nella pagina E-learning"
          actions={
            <div className="admin-videos__actions">
              <button type="button" className="admin-videos__btn admin-videos__btn--ghost" onClick={handleReset}>
                <Icon family="light" name="arrow-rotate-left" />
                Ripristina seed
              </button>
              <button type="button" className="admin-videos__btn admin-videos__btn--primary" onClick={openCreate}>
                <Icon family="solid" name="plus" />
                Nuovo video
              </button>
            </div>
          }
        />

        <div className="admin-videos__toolbar">
          <div className="admin-videos__search">
            <Icon family="light" name="magnifying-glass" />
            <input
              type="text"
              placeholder="Cerca per titolo, descrizione, categoria…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Cerca tra i video"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Cancella ricerca"
                className="admin-videos__search-clear"
              >
                <Icon family="light" name="xmark" />
              </button>
            )}
          </div>
          <span className="admin-videos__count">{filtered.length} video</span>
        </div>

        <div className="admin-videos__table-wrap">
          <table className="sib-table admin-videos__table">
            <thead>
              <tr>
                <th>Anteprima</th>
                <th>Titolo</th>
                <th>Categoria</th>
                <th>Provider</th>
                <th>Durata</th>
                <th>Stato</th>
                <th className="admin-videos__col-actions">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-videos__empty">
                    Nessun video corrisponde alla ricerca.
                  </td>
                </tr>
              ) : (
                filtered.map((v) => {
                  const cat = VIDEO_CATEGORIES.find((c) => c.id === v.category);
                  const poster = videoPoster(v);
                  return (
                    <tr key={v.id}>
                      <td>
                        <button
                          type="button"
                          className="admin-videos__thumb"
                          style={
                            poster
                              ? { background: `#000 url(${poster}) center/cover no-repeat` }
                              : undefined
                          }
                          onClick={() => setPreviewId(v.id)}
                          aria-label={`Anteprima: ${v.title}`}
                        >
                          <Icon family="solid" name="play" />
                        </button>
                      </td>
                      <td>
                        <div className="admin-videos__title">{v.title}</div>
                        <div className="admin-videos__desc">{v.description}</div>
                      </td>
                      <td>{cat?.label ?? v.category}</td>
                      <td>
                        <span className={`admin-videos__provider admin-videos__provider--${v.provider}`}>
                          {v.provider}
                        </span>
                      </td>
                      <td>{v.duration}</td>
                      <td>
                        <div className="admin-videos__status">
                          {v.published ? (
                            <span className="admin-videos__badge admin-videos__badge--ok">
                              <Icon family="solid" name="circle-check" /> Pubblicato
                            </span>
                          ) : (
                            <span className="admin-videos__badge admin-videos__badge--muted">
                              <Icon family="solid" name="eye-slash" /> Bozza
                            </span>
                          )}
                          {!v.source && (
                            <span className="admin-videos__badge admin-videos__badge--warn">
                              <Icon family="solid" name="triangle-exclamation" /> Sorgente mancante
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="admin-videos__col-actions">
                        <button
                          type="button"
                          className={`admin-videos__icon-btn${
                            v.published ? ' admin-videos__icon-btn--publish' : ''
                          }`}
                          onClick={() => handleTogglePublish(v)}
                          aria-label={v.published ? 'Togli dalla pubblicazione' : 'Pubblica'}
                          title={
                            v.published
                              ? 'Togli dalla pubblicazione (resta nell\'elenco)'
                              : 'Pubblica sulla pagina E-learning'
                          }
                        >
                          <Icon family="light" name={v.published ? 'eye' : 'eye-slash'} />
                        </button>
                        <button
                          type="button"
                          className="admin-videos__icon-btn"
                          onClick={() => openEdit(v)}
                          aria-label="Modifica"
                          title="Modifica"
                        >
                          <Icon family="light" name="pen-to-square" />
                        </button>
                        <button
                          type="button"
                          className="admin-videos__icon-btn admin-videos__icon-btn--danger"
                          onClick={() => handleDelete(v)}
                          aria-label="Elimina"
                          title="Elimina"
                        >
                          <Icon family="light" name="trash" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {drawerOpen && (
        <div className="admin-drawer__backdrop" onClick={closeDrawer}>
          <aside
            className="admin-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-drawer-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="admin-drawer__head">
              <h2 id="admin-drawer-title">
                {editingId ? 'Modifica video' : 'Nuovo video'}
              </h2>
              <button
                type="button"
                onClick={closeDrawer}
                className="admin-drawer__close"
                aria-label="Chiudi"
              >
                <Icon family="light" name="xmark" />
              </button>
            </header>

            <form onSubmit={handleSubmit} className="admin-drawer__form">
              <Field label="Titolo *" htmlFor="f-title">
                <input
                  id="f-title"
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  autoFocus
                />
              </Field>

              <Field label="Descrizione" htmlFor="f-desc">
                <textarea
                  id="f-desc"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Field>

              <div className="admin-drawer__row">
                <Field label="Categoria *" htmlFor="f-cat">
                  <select
                    id="f-cat"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {VIDEO_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Livello" htmlFor="f-level">
                  <select
                    id="f-level"
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: e.target.value as VideoLevel })}
                  >
                    {LEVEL_OPTIONS.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="admin-drawer__row">
                <Field label="Durata" htmlFor="f-dur" hint="Formato libero, es. 5:24">
                  <input
                    id="f-dur"
                    type="text"
                    placeholder="5:24"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  />
                </Field>

                <Field label="Visualizzazioni" htmlFor="f-views">
                  <input
                    id="f-views"
                    type="number"
                    min={0}
                    value={form.views}
                    onChange={(e) => setForm({ ...form, views: e.target.value })}
                  />
                </Field>

                <Field label="Giorni dalla pubblicazione" htmlFor="f-days">
                  <input
                    id="f-days"
                    type="number"
                    min={0}
                    value={form.daysAgo}
                    onChange={(e) => setForm({ ...form, daysAgo: e.target.value })}
                  />
                </Field>
              </div>

              <fieldset className="admin-drawer__provider">
                <legend>Provider video</legend>
                <div className="admin-drawer__provider-options">
                  {PROVIDER_OPTIONS.map((p) => (
                    <label
                      key={p.value}
                      className={`admin-drawer__provider-opt${form.provider === p.value ? ' is-active' : ''}`}
                    >
                      <input
                        type="radio"
                        name="provider"
                        value={p.value}
                        checked={form.provider === p.value}
                        onChange={() => setForm({ ...form, provider: p.value })}
                      />
                      <span>{p.label}</span>
                    </label>
                  ))}
                </div>
                <p className="admin-drawer__hint">
                  {PROVIDER_OPTIONS.find((p) => p.value === form.provider)?.hint}
                </p>
              </fieldset>

              <Field label="Sorgente *" htmlFor="f-src">
                <input
                  id="f-src"
                  type="text"
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  placeholder={
                    form.provider === 'youtube'
                      ? 'https://www.youtube.com/watch?v=…'
                      : form.provider === 'vimeo'
                        ? 'https://vimeo.com/…'
                        : 'https://cdn.example.com/video.mp4'
                  }
                />
              </Field>

              <Field
                label="Poster (opzionale)"
                htmlFor="f-poster"
                hint="URL immagine. Se omesso e provider=YouTube, viene usata la thumbnail di YouTube."
              >
                <input
                  id="f-poster"
                  type="text"
                  value={form.poster}
                  onChange={(e) => setForm({ ...form, poster: e.target.value })}
                  placeholder="https://…"
                />
              </Field>

              <label className="admin-drawer__toggle">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm({ ...form, published: e.target.checked })}
                />
                <span className="admin-drawer__toggle-track" aria-hidden="true">
                  <span className="admin-drawer__toggle-knob" />
                </span>
                <span className="admin-drawer__toggle-text">
                  <strong>{form.published ? 'Pubblicato' : 'Non pubblicato'}</strong>
                  <em>
                    {form.published
                      ? 'Visibile agli utenti nella pagina E-learning.'
                      : 'Resta nell\'elenco admin ma non compare lato utente.'}
                  </em>
                </span>
              </label>

              <footer className="admin-drawer__foot">
                <button type="button" className="admin-videos__btn admin-videos__btn--ghost" onClick={closeDrawer}>
                  Annulla
                </button>
                <button type="submit" className="admin-videos__btn admin-videos__btn--primary">
                  <Icon family="solid" name="check" />
                  {editingId ? 'Salva modifiche' : 'Crea video'}
                </button>
              </footer>
            </form>
          </aside>
        </div>
      )}

      {previewVideo && (
        <div className="admin-preview__backdrop" onClick={() => setPreviewId(null)}>
          <div className="admin-preview" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="admin-preview__close"
              onClick={() => setPreviewId(null)}
              aria-label="Chiudi anteprima"
            >
              <Icon family="light" name="xmark" />
            </button>
            <VideoPlayer video={previewVideo} />
            <div className="admin-preview__caption">{previewVideo.title}</div>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}

function Field({ label, htmlFor, hint, children }: FieldProps) {
  return (
    <div className="admin-drawer__field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <p className="admin-drawer__hint">{hint}</p>}
    </div>
  );
}
