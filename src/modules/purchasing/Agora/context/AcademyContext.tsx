import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  ACADEMY_COURSES,
  PERSONNEL_LISTINGS,
  type AcademyCourse,
  type PersonnelListing,
} from '../data/academy';
import {
  approvedCourses,
  approvedPersonnel,
  useNuoveRisorseStore,
} from '../../../../store/useNuoveRisorseStore';

interface AcademyContextType {
  /** Dataset mock + annunci approvati dalla moderazione (visibili al pubblico). */
  personnelListings: PersonnelListing[];
  courses: AcademyCourse[];
  /** Invia un annuncio alla moderazione (stato iniziale: "Da approvare"). */
  addPersonnelListing: (listing: PersonnelListing) => void;
  addCourse: (course: AcademyCourse) => void;
}

const AcademyContext = createContext<AcademyContextType | undefined>(undefined);

export function AcademyProvider({ children }: { children: ReactNode }) {
  // Gli annunci utente vivono nello store di moderazione (condiviso + persistito);
  // qui esponiamo al pubblico solo quelli approvati, uniti al dataset mock.
  const submissions = useNuoveRisorseStore((s) => s.submissions);
  const submitPersonnel = useNuoveRisorseStore((s) => s.submitPersonnel);
  const submitCourse = useNuoveRisorseStore((s) => s.submitCourse);

  const personnelListings = useMemo(
    () => [...approvedPersonnel(submissions), ...PERSONNEL_LISTINGS],
    [submissions],
  );

  const courses = useMemo(
    () => [...approvedCourses(submissions), ...ACADEMY_COURSES],
    [submissions],
  );

  return (
    <AcademyContext.Provider
      value={{
        personnelListings,
        courses,
        addPersonnelListing: submitPersonnel,
        addCourse: submitCourse,
      }}
    >
      {children}
    </AcademyContext.Provider>
  );
}

export function useAcademy() {
  const ctx = useContext(AcademyContext);
  if (!ctx) {
    throw new Error('useAcademy must be used within an AcademyProvider');
  }
  return ctx;
}
