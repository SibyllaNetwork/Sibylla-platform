import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  ACADEMY_COURSES,
  PERSONNEL_LISTINGS,
  type AcademyCourse,
  type PersonnelListing,
} from '../data/academy';

interface AcademyContextType {
  /** Mock dataset + tutti gli annunci aggiunti dall'utente in sessione */
  personnelListings: PersonnelListing[];
  courses: AcademyCourse[];
  addPersonnelListing: (listing: PersonnelListing) => void;
  addCourse: (course: AcademyCourse) => void;
}

const AcademyContext = createContext<AcademyContextType | undefined>(undefined);

export function AcademyProvider({ children }: { children: ReactNode }) {
  const [extraPersonnel, setExtraPersonnel] = useState<PersonnelListing[]>([]);
  const [extraCourses, setExtraCourses] = useState<AcademyCourse[]>([]);

  const personnelListings = useMemo(
    () => [...extraPersonnel, ...PERSONNEL_LISTINGS],
    [extraPersonnel],
  );

  const courses = useMemo(
    () => [...extraCourses, ...ACADEMY_COURSES],
    [extraCourses],
  );

  const addPersonnelListing = (listing: PersonnelListing) => {
    setExtraPersonnel((prev) => [listing, ...prev]);
  };

  const addCourse = (course: AcademyCourse) => {
    setExtraCourses((prev) => [course, ...prev]);
  };

  return (
    <AcademyContext.Provider
      value={{ personnelListings, courses, addPersonnelListing, addCourse }}
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
