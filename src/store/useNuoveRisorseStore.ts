import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AcademyCourse, PersonnelListing } from '../modules/purchasing/Agora/data/academy'

// ─── Moderazione "Nuove risorse" (Academy) ───────────────────────────────────────
//  Ogni annuncio creato dall'utente (offerta/ricerca di lavoro o corso di formazione)
//  entra qui in stato 'in-attesa' e viene pubblicato solo dopo l'approvazione del
//  supporto Sibylla. Store condiviso (singleton) e persistito su localStorage: la
//  pagina utente (mount /academy) e la console admin (mount /admin) sono alberi React
//  separati e comunicano attraverso questo store.

export type StatoModerazione = 'in-attesa' | 'approvato' | 'rifiutato'

export const STATO_MODERAZIONE_META: Record<
  StatoModerazione,
  { label: string; tone: 'warn' | 'ok' | 'ko'; icon: string }
> = {
  'in-attesa': { label: 'Da approvare', tone: 'warn', icon: 'clock' },
  approvato: { label: 'Pubblicato', tone: 'ok', icon: 'circle-check' },
  rifiutato: { label: 'Rigettato', tone: 'ko', icon: 'circle-xmark' },
}

interface SubmissionBase {
  id: string
  stato: StatoModerazione
  /** Motivazione del rifiuto, valorizzata quando stato = 'rifiutato'. */
  motivazione?: string
  submittedAt: number
  updatedAt: number
}

export interface PersonnelSubmission extends SubmissionBase {
  kind: 'personnel'
  listing: PersonnelListing
}

export interface CourseSubmission extends SubmissionBase {
  kind: 'course'
  course: AcademyCourse
}

export type ResourceSubmission = PersonnelSubmission | CourseSubmission

/** Titolo da mostrare in liste e notifiche. */
export function submissionTitle(s: ResourceSubmission): string {
  return s.kind === 'personnel' ? s.listing.title : s.course.title
}

interface NuoveRisorseState {
  submissions: ResourceSubmission[]
  submitPersonnel: (listing: PersonnelListing) => void
  submitCourse: (course: AcademyCourse) => void
  resubmitPersonnel: (id: string, listing: PersonnelListing) => void
  resubmitCourse: (id: string, course: AcademyCourse) => void
  approve: (id: string) => void
  reject: (id: string, motivazione: string) => void
  remove: (id: string) => void
}

const now = () => Date.now()

export const useNuoveRisorseStore = create<NuoveRisorseState>()(
  persist(
    (set) => ({
      submissions: [],
      submitPersonnel: (listing) =>
        set((state) => ({
          submissions: [
            { id: listing.id, kind: 'personnel', listing, stato: 'in-attesa', submittedAt: now(), updatedAt: now() },
            ...state.submissions,
          ],
        })),
      submitCourse: (course) =>
        set((state) => ({
          submissions: [
            { id: course.id, kind: 'course', course, stato: 'in-attesa', submittedAt: now(), updatedAt: now() },
            ...state.submissions,
          ],
        })),
      resubmitPersonnel: (id, listing) =>
        set((state) => ({
          submissions: state.submissions.map((s) =>
            s.id === id && s.kind === 'personnel'
              ? { ...s, listing, stato: 'in-attesa', motivazione: undefined, updatedAt: now() }
              : s,
          ),
        })),
      resubmitCourse: (id, course) =>
        set((state) => ({
          submissions: state.submissions.map((s) =>
            s.id === id && s.kind === 'course'
              ? { ...s, course, stato: 'in-attesa', motivazione: undefined, updatedAt: now() }
              : s,
          ),
        })),
      approve: (id) =>
        set((state) => ({
          submissions: state.submissions.map((s) =>
            s.id === id ? { ...s, stato: 'approvato', motivazione: undefined, updatedAt: now() } : s,
          ),
        })),
      reject: (id, motivazione) =>
        set((state) => ({
          submissions: state.submissions.map((s) =>
            s.id === id ? { ...s, stato: 'rifiutato', motivazione, updatedAt: now() } : s,
          ),
        })),
      remove: (id) =>
        set((state) => ({ submissions: state.submissions.filter((s) => s.id !== id) })),
    }),
    { name: 'sibylla.nuove-risorse' },
  ),
)

// ─── Selettori puri (operano sull'array submissions) ─────────────────────────────

/** Annunci di personale approvati, pronti per la lista pubblica. */
export function approvedPersonnel(subs: ResourceSubmission[]): PersonnelListing[] {
  return subs
    .filter((s): s is PersonnelSubmission => s.kind === 'personnel' && s.stato === 'approvato')
    .map((s) => s.listing)
}

/** Corsi approvati, pronti per la lista pubblica. */
export function approvedCourses(subs: ResourceSubmission[]): AcademyCourse[] {
  return subs
    .filter((s): s is CourseSubmission => s.kind === 'course' && s.stato === 'approvato')
    .map((s) => s.course)
}

/** Numero di annunci in attesa di moderazione. */
export function pendingCount(subs: ResourceSubmission[]): number {
  return subs.filter((s) => s.stato === 'in-attesa').length
}
