/*
 * AdminNuoveRisorsePage — moderazione degli annunci "Nuove risorse".
 *
 * Gli annunci di lavoro (offerta/ricerca) e i corsi di formazione creati dagli
 * utenti arrivano qui in stato "Da approvare". Il supporto Sibylla può:
 *   - pubblicare l'annuncio → diventa visibile nella sezione Nuove risorse;
 *   - rigettarlo → l'utente riceve una notifica con l'eventuale motivazione e
 *     può correggerlo e ri-sottoporlo (l'iter ricomincia da capo).
 * Lo stato vive in useNuoveRisorseStore (condiviso/persistito); l'esito viene
 * comunicato all'utente via useNotificheRisorseStore.
 */

import { useMemo, useState } from 'react';
import { Icon } from '../ds/icon';
import { AdminPageHeader } from './AdminPageHeader';
import { toast } from '../../../../core/components/Toast/useToast';
import {
  STATO_MODERAZIONE_META,
  submissionTitle,
  useNuoveRisorseStore,
  type ResourceSubmission,
  type StatoModerazione,
} from '../../../../store/useNuoveRisorseStore';
import { useNotificheRisorseStore } from '../../../../store/useNotificheRisorseStore';
import './AdminNuoveRisorsePage.css';

type StatusFilter = StatoModerazione | 'tutti';
type KindFilter = 'tutti' | 'personnel' | 'course';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'in-attesa', label: 'Da approvare' },
  { value: 'approvato', label: 'Pubblicati' },
  { value: 'rifiutato', label: 'Rigettati' },
  { value: 'tutti', label: 'Tutti' },
];

const KIND_TABS: { value: KindFilter; label: string }[] = [
  { value: 'tutti', label: 'Tutti i tipi' },
  { value: 'personnel', label: 'Lavoro' },
  { value: 'course', label: 'Corsi' },
];

const CONTRACT_LABELS: Record<string, string> = {
  indeterminato: 'Indeterminato', determinato: 'Determinato', stage: 'Stage',
  freelance: 'Freelance / P.IVA', apprendistato: 'Apprendistato',
};
const WORKMODE_LABELS: Record<string, string> = {
  'in-presenza': 'In presenza', ibrido: 'Ibrido', remoto: 'Remoto',
};
const COURSEMODE_LABELS: Record<string, string> = {
  online: 'Online', 'in-presenza': 'In presenza', ibrido: 'Ibrido',
};
const LEVEL_LABELS: Record<string, string> = {
  base: 'Base', intermedio: 'Intermedio', avanzato: 'Avanzato',
};

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function kindLabel(s: ResourceSubmission): string {
  if (s.kind === 'course') return 'Corso di formazione';
  return s.listing.kind === 'offerta' ? 'Offerta di lavoro' : 'Ricerca di lavoro';
}

function authorOf(s: ResourceSubmission): string {
  return s.kind === 'personnel' ? s.listing.organization : s.course.instructor;
}

export function AdminNuoveRisorsePage() {
  const submissions = useNuoveRisorseStore((s) => s.submissions);
  const approve = useNuoveRisorseStore((s) => s.approve);
  const reject = useNuoveRisorseStore((s) => s.reject);
  const remove = useNuoveRisorseStore((s) => s.remove);
  const pushNotifica = useNotificheRisorseStore((s) => s.push);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('in-attesa');
  const [kindFilter, setKindFilter] = useState<KindFilter>('tutti');
  const [search, setSearch] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ResourceSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const pendingCount = useMemo(
    () => submissions.filter((s) => s.stato === 'in-attesa').length,
    [submissions],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return submissions
      .filter((s) => (statusFilter === 'tutti' ? true : s.stato === statusFilter))
      .filter((s) => (kindFilter === 'tutti' ? true : s.kind === kindFilter))
      .filter((s) => {
        if (!q) return true;
        return (
          submissionTitle(s).toLowerCase().includes(q) ||
          authorOf(s).toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        // In attesa sempre in cima, poi per data di aggiornamento decrescente.
        if (a.stato === 'in-attesa' && b.stato !== 'in-attesa') return -1;
        if (b.stato === 'in-attesa' && a.stato !== 'in-attesa') return 1;
        return b.updatedAt - a.updatedAt;
      });
  }, [submissions, statusFilter, kindFilter, search]);

  const preview = useMemo(
    () => (previewId ? submissions.find((s) => s.id === previewId) ?? null : null),
    [previewId, submissions],
  );

  const doApprove = (s: ResourceSubmission) => {
    approve(s.id);
    pushNotifica({ tipo: 'approvato', risorsaId: s.id, titolo: submissionTitle(s), kind: s.kind });
    toast.success(`«${submissionTitle(s)}» è stato pubblicato nella sezione Nuove risorse.`, 'Annuncio approvato');
    if (previewId === s.id) setPreviewId(null);
  };

  const openReject = (s: ResourceSubmission) => {
    setRejectTarget(s);
    setRejectReason('');
  };

  const confirmReject = () => {
    if (!rejectTarget) return;
    const motivazione = rejectReason.trim();
    reject(rejectTarget.id, motivazione);
    pushNotifica({
      tipo: 'rifiutato',
      risorsaId: rejectTarget.id,
      titolo: submissionTitle(rejectTarget),
      kind: rejectTarget.kind,
      motivazione: motivazione || undefined,
    });
    toast.warning(`«${submissionTitle(rejectTarget)}» è stato rigettato. L'utente è stato avvisato.`, 'Annuncio rigettato');
    if (previewId === rejectTarget.id) setPreviewId(null);
    setRejectTarget(null);
    setRejectReason('');
  };

  const doRemove = (s: ResourceSubmission) => {
    if (window.confirm(`Eliminare definitivamente «${submissionTitle(s)}» dalla moderazione?`)) {
      remove(s.id);
      if (previewId === s.id) setPreviewId(null);
    }
  };

  return (
    <>
      <div className="admin-mod">
        <AdminPageHeader
          title="Nuove risorse"
          subtitle="Modera gli annunci di lavoro e i corsi di formazione prima della pubblicazione"
          actions={
            pendingCount > 0 ? (
              <button
                type="button"
                className="admin-mod__pending"
                onClick={() => setStatusFilter('in-attesa')}
              >
                <Icon family="duotone" name="clock" />
                {pendingCount} in attesa di approvazione
              </button>
            ) : (
              <span className="admin-mod__pending admin-mod__pending--clear">
                <Icon family="solid" name="circle-check" />
                Nessun annuncio in attesa
              </span>
            )
          }
        />

        <div className="admin-mod__toolbar">
          <div className="admin-mod__tabs" role="tablist" aria-label="Filtra per stato">
            {STATUS_TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={statusFilter === t.value}
                className={`admin-mod__tab${statusFilter === t.value ? ' admin-mod__tab--active' : ''}`}
                onClick={() => setStatusFilter(t.value)}
              >
                {t.label}
                {t.value === 'in-attesa' && pendingCount > 0 && (
                  <span className="admin-mod__tab-count">{pendingCount}</span>
                )}
              </button>
            ))}
          </div>

          <div className="admin-mod__kinds">
            {KIND_TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                className={`admin-mod__kind${kindFilter === t.value ? ' admin-mod__kind--active' : ''}`}
                onClick={() => setKindFilter(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-mod__toolbar">
          <div className="admin-mod__search">
            <Icon family="light" name="magnifying-glass" />
            <input
              type="text"
              placeholder="Cerca per titolo o autore…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Cerca tra gli annunci"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} aria-label="Cancella ricerca" className="admin-mod__search-clear">
                <Icon family="light" name="xmark" />
              </button>
            )}
          </div>
          <span className="admin-mod__count">{filtered.length} annunci</span>
        </div>

        <div className="admin-mod__table-wrap">
          <table className="sib-table admin-mod__table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Titolo</th>
                <th>Autore</th>
                <th>Inviato</th>
                <th>Stato</th>
                <th className="admin-mod__col-actions">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-mod__empty">
                    Nessun annuncio in questa vista.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const meta = STATO_MODERAZIONE_META[s.stato];
                  return (
                    <tr key={s.id}>
                      <td>
                        <span className={`admin-mod__kind-badge admin-mod__kind-badge--${s.kind}`}>
                          <Icon family="solid" name={s.kind === 'course' ? 'graduation-cap' : 'briefcase'} />
                          {kindLabel(s)}
                        </span>
                      </td>
                      <td>
                        <button type="button" className="admin-mod__title-link" onClick={() => setPreviewId(s.id)}>
                          {submissionTitle(s)}
                        </button>
                        {s.stato === 'rifiutato' && s.motivazione && (
                          <div className="admin-mod__reject-note" title={s.motivazione}>
                            <Icon family="solid" name="comment" /> {s.motivazione}
                          </div>
                        )}
                      </td>
                      <td>{authorOf(s)}</td>
                      <td className="admin-mod__date">{fmtDate(s.submittedAt)}</td>
                      <td>
                        <span className={`admin-mod__badge admin-mod__badge--${meta.tone}`}>
                          <Icon family="solid" name={meta.icon} /> {meta.label}
                        </span>
                      </td>
                      <td className="admin-mod__col-actions">
                        <button
                          type="button"
                          className="admin-mod__icon-btn"
                          onClick={() => setPreviewId(s.id)}
                          aria-label="Anteprima"
                          title="Anteprima"
                        >
                          <Icon family="light" name="eye" />
                        </button>
                        {s.stato !== 'approvato' && (
                          <button
                            type="button"
                            className="admin-mod__icon-btn admin-mod__icon-btn--ok"
                            onClick={() => doApprove(s)}
                            aria-label="Pubblica"
                            title="Pubblica annuncio"
                          >
                            <Icon family="light" name="check" />
                          </button>
                        )}
                        {s.stato !== 'rifiutato' && (
                          <button
                            type="button"
                            className="admin-mod__icon-btn admin-mod__icon-btn--danger"
                            onClick={() => openReject(s)}
                            aria-label="Rigetta"
                            title="Rigetta annuncio"
                          >
                            <Icon family="light" name="xmark" />
                          </button>
                        )}
                        <button
                          type="button"
                          className="admin-mod__icon-btn admin-mod__icon-btn--danger"
                          onClick={() => doRemove(s)}
                          aria-label="Elimina"
                          title="Elimina dalla moderazione"
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

      {preview && (
        <div className="admin-mod__modal-backdrop" onClick={() => setPreviewId(null)}>
          <div className="admin-mod__modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <header className="admin-mod__modal-head">
              <span className={`admin-mod__kind-badge admin-mod__kind-badge--${preview.kind}`}>
                <Icon family="solid" name={preview.kind === 'course' ? 'graduation-cap' : 'briefcase'} />
                {kindLabel(preview)}
              </span>
              <button type="button" className="admin-mod__modal-close" onClick={() => setPreviewId(null)} aria-label="Chiudi">
                <Icon family="light" name="xmark" />
              </button>
            </header>

            <div className="admin-mod__modal-body">
              <SubmissionDetail submission={preview} />
            </div>

            <footer className="admin-mod__modal-foot">
              {preview.stato !== 'approvato' && (
                <button type="button" className="admin-mod__btn admin-mod__btn--ok" onClick={() => doApprove(preview)}>
                  <Icon family="solid" name="check" /> Pubblica
                </button>
              )}
              {preview.stato !== 'rifiutato' && (
                <button type="button" className="admin-mod__btn admin-mod__btn--danger" onClick={() => openReject(preview)}>
                  <Icon family="solid" name="xmark" /> Rigetta
                </button>
              )}
            </footer>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="admin-mod__modal-backdrop" onClick={() => setRejectTarget(null)}>
          <div className="admin-mod__modal admin-mod__modal--reject" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <header className="admin-mod__modal-head">
              <h2 className="admin-mod__modal-title">Rigetta annuncio</h2>
              <button type="button" className="admin-mod__modal-close" onClick={() => setRejectTarget(null)} aria-label="Chiudi">
                <Icon family="light" name="xmark" />
              </button>
            </header>
            <div className="admin-mod__modal-body">
              <p className="admin-mod__reject-sub">
                Annuncio: <strong>{submissionTitle(rejectTarget)}</strong>. Puoi indicare una
                motivazione che verrà comunicata all'utente (facoltativa).
              </p>
              <textarea
                className="admin-mod__reject-text"
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Es. Il contenuto non rispetta le policy Sibylla: rimuovi i riferimenti a contatti esterni e ripresenta."
                autoFocus
              />
            </div>
            <footer className="admin-mod__modal-foot">
              <button type="button" className="admin-mod__btn admin-mod__btn--ghost" onClick={() => setRejectTarget(null)}>
                Annulla
              </button>
              <button type="button" className="admin-mod__btn admin-mod__btn--danger" onClick={confirmReject}>
                <Icon family="solid" name="xmark" /> Rigetta e notifica
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-mod__detail-row">
      <span className="admin-mod__detail-label">{label}</span>
      <span className="admin-mod__detail-value">{value}</span>
    </div>
  );
}

function SubmissionDetail({ submission }: { submission: ResourceSubmission }) {
  if (submission.kind === 'personnel') {
    const l = submission.listing;
    return (
      <>
        <h2 className="admin-mod__detail-title">{l.title}</h2>
        <p className="admin-mod__detail-org">{l.organization}</p>
        <div className="admin-mod__detail-grid">
          <DetailRow label="Località" value={`${l.city} (${l.region})`} />
          <DetailRow label="Contratto" value={CONTRACT_LABELS[l.contractType] ?? l.contractType} />
          <DetailRow label="Modalità" value={WORKMODE_LABELS[l.workMode] ?? l.workMode} />
          {l.experienceYears != null && <DetailRow label="Esperienza" value={`${l.experienceYears} anni`} />}
          {l.salaryRange && <DetailRow label="Compenso" value={l.salaryRange} />}
          <DetailRow label="Referente" value={`${l.contactName} · ${l.contactEmail}`} />
        </div>
        <h3 className="admin-mod__detail-sub">Descrizione</h3>
        <p className="admin-mod__detail-text">{l.description}</p>
        {l.requirements.length > 0 && (
          <>
            <h3 className="admin-mod__detail-sub">{l.kind === 'offerta' ? 'Requisiti' : 'Competenze'}</h3>
            <ul className="admin-mod__detail-list">
              {l.requirements.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </>
        )}
      </>
    );
  }
  const c = submission.course;
  return (
    <>
      <h2 className="admin-mod__detail-title">{c.title}</h2>
      <p className="admin-mod__detail-org">{c.category} · {c.instructor}</p>
      <div className="admin-mod__detail-grid">
        <DetailRow label="Modalità" value={COURSEMODE_LABELS[c.mode] ?? c.mode} />
        <DetailRow label="Livello" value={LEVEL_LABELS[c.level] ?? c.level} />
        <DetailRow label="Durata" value={`${c.durationHours} ore`} />
        <DetailRow label="Periodo" value={`${c.startDate} → ${c.endDate}`} />
        {c.city && <DetailRow label="Sede" value={c.city} />}
        <DetailRow label="Posti" value={`${c.totalSeats}`} />
        <DetailRow label="Prezzo" value={c.price > 0 ? `€ ${c.price}` : 'Gratuito'} />
      </div>
      <h3 className="admin-mod__detail-sub">Descrizione</h3>
      <p className="admin-mod__detail-text">{c.description}</p>
      {c.syllabus.length > 0 && (
        <>
          <h3 className="admin-mod__detail-sub">Programma</h3>
          <ul className="admin-mod__detail-list">
            {c.syllabus.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </>
      )}
    </>
  );
}
