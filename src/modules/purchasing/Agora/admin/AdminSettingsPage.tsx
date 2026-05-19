/*
 * AdminSettingsPage — configurazione console admin.
 *
 * Per la versione client-only, le impostazioni sono espositive:
 *   - info sul passcode attivo (mascherato)
 *   - export/import dei video in JSON
 *   - cancellazione dati locali (videos + auth)
 * Una volta introdotto un BE, qui andranno: gestione utenti admin reali,
 * preferenze provider video, webhooks, ecc.
 */

import { useRef, useState } from 'react';
import { Icon } from '../ds/icon';
import { AdminPageHeader } from './AdminPageHeader';
import { useVideos, type Video } from '../context/VideosContext';
import './AdminSettingsPage.css';

export function AdminSettingsPage() {
  const { videos, addVideo, resetToSeed, removeVideo } = useVideos();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const passcodeFromEnv = Boolean(typeof process !== 'undefined' && process.env.REACT_APP_ADMIN_PASSCODE);

  const handleExport = () => {
    const data = JSON.stringify(videos, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agora-videos-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setFeedback({ tone: 'ok', text: `Esportati ${videos.length} video in JSON.` });
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const arr = JSON.parse(text) as Video[];
      if (!Array.isArray(arr)) throw new Error('JSON non valido');
      // Strategia: aggiunge ai video esistenti (no merge per id)
      let count = 0;
      arr.forEach((v) => {
        if (!v.title) return;
        addVideo({
          title:       v.title,
          description: v.description ?? '',
          category:    v.category ?? 'primi-passi',
          level:       v.level ?? 'base',
          duration:    v.duration ?? '0:00',
          views:       v.views ?? 0,
          daysAgo:     v.daysAgo ?? 0,
          provider:    v.provider ?? 'youtube',
          source:      v.source ?? '',
          poster:      v.poster,
          published:   v.published ?? true,
        });
        count++;
      });
      setFeedback({ tone: 'ok', text: `Importati ${count} video.` });
    } catch (err) {
      setFeedback({ tone: 'err', text: `Import fallito: ${(err as Error).message}` });
    }
  };

  const handleClearAll = () => {
    if (!window.confirm('Cancellare tutti i video memorizzati? Questa azione non può essere annullata.')) {
      return;
    }
    videos.forEach((v) => removeVideo(v.id));
    setFeedback({ tone: 'ok', text: 'Lista video svuotata.' });
  };

  const handleResetSeed = () => {
    if (!window.confirm('Ripristinare i 12 video iniziali? Tutte le modifiche locali andranno perse.')) {
      return;
    }
    resetToSeed();
    setFeedback({ tone: 'ok', text: 'Lista video riportata al contenuto iniziale.' });
  };

  return (
    <div className="admin-settings">
      <AdminPageHeader
        title="Impostazioni"
        subtitle="Configurazione del pannello e gestione dei dati locali"
      />

      {feedback && (
        <div className={`admin-settings__feedback admin-settings__feedback--${feedback.tone}`}>
          <Icon family="solid" name={feedback.tone === 'ok' ? 'circle-check' : 'circle-exclamation'} />
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} aria-label="Chiudi messaggio">
            <Icon family="light" name="xmark" />
          </button>
        </div>
      )}

      <section className="admin-settings__group">
        <h2>Sicurezza</h2>
        <div className="admin-settings__row">
          <div className="admin-settings__row-info">
            <span className="admin-settings__row-title">Passcode di accesso</span>
            <span className="admin-settings__row-sub">
              {passcodeFromEnv
                ? 'Definito tramite variabile d\'ambiente VITE_ADMIN_PASSCODE.'
                : 'Passcode di default. In produzione impostare VITE_ADMIN_PASSCODE.'}
            </span>
          </div>
          <span className="admin-settings__chip">
            <Icon family="solid" name="lock" />
            ••••••••
          </span>
        </div>
      </section>

      <section className="admin-settings__group">
        <h2>Dati video</h2>
        <p className="admin-settings__hint">
          I metadati video sono memorizzati in <code>localStorage</code> del browser. Per backup o
          migrazione, usa export/import. In futuro saranno sincronizzati con il backend.
        </p>

        <div className="admin-settings__actions">
          <button type="button" className="admin-settings__btn" onClick={handleExport}>
            <Icon family="solid" name="file-arrow-down" />
            Esporta JSON ({videos.length})
          </button>
          <button type="button" className="admin-settings__btn" onClick={handleImportClick}>
            <Icon family="solid" name="file-arrow-up" />
            Importa da JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            hidden
            onChange={handleImportFile}
          />
          <button type="button" className="admin-settings__btn admin-settings__btn--ghost" onClick={handleResetSeed}>
            <Icon family="solid" name="arrow-rotate-left" />
            Ripristina seed iniziale
          </button>
          <button type="button" className="admin-settings__btn admin-settings__btn--danger" onClick={handleClearAll}>
            <Icon family="solid" name="trash" />
            Svuota lista
          </button>
        </div>
      </section>

      <section className="admin-settings__group">
        <h2>Informazioni</h2>
        <dl className="admin-settings__info">
          <div>
            <dt>Versione console</dt>
            <dd>1.0.0</dd>
          </div>
          <div>
            <dt>Provider video supportati</dt>
            <dd>YouTube • Vimeo • URL diretto (MP4/HLS)</dd>
          </div>
          <div>
            <dt>Persistenza</dt>
            <dd>localStorage (client-only)</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
