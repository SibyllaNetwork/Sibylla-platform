import { createContext, useContext, useState, ReactNode } from 'react';

export type AnnouncementType = 'vendita' | 'acquisto';
export type AnnouncementStructureType = 'struttura' | 'categoria';
export type GuestType = 'gruppi' | 'individuali';
export type BaseType = 'base_doppia' | 'base_multipla' | 'mista';
export type LotType = 'lotto' | 'mezzo_lotto';
export type AnnouncementCategory = 'mare' | 'montagna' | 'citta_arte' | 'business' | 'wellness' | 'eventi';

export interface ManagementAnnouncement {
  id: string;
  type: AnnouncementType;
  structureType: AnnouncementStructureType;
  structure: string;
  guestType: GuestType;
  baseType: BaseType;
  lotType: LotType;
  checkInDate: string;
  checkOutDate: string;
  quantity: number;
  createdDate: string;
  published: boolean;
  category: AnnouncementCategory;
}

interface AnnouncementsContextType {
  managementAnnouncements: ManagementAnnouncement[];
  addAnnouncement: (announcement: ManagementAnnouncement) => void;
  deleteAnnouncement: (id: string) => void;
  publishAnnouncement: (id: string) => void;
}

const AnnouncementsContext = createContext<AnnouncementsContextType | undefined>(undefined);

export function AnnouncementsProvider({ children }: { children: ReactNode }) {
  const [managementAnnouncements, setManagementAnnouncements] = useState<ManagementAnnouncement[]>([]);

  const addAnnouncement = (announcement: ManagementAnnouncement) => {
    setManagementAnnouncements([...managementAnnouncements, announcement]);
  };

  const deleteAnnouncement = (id: string) => {
    setManagementAnnouncements(managementAnnouncements.filter(a => a.id !== id));
  };

  const publishAnnouncement = (id: string) => {
    setManagementAnnouncements(managementAnnouncements.map(a => 
      a.id === id ? { ...a, published: true } : a
    ));
  };

  return (
    <AnnouncementsContext.Provider value={{
      managementAnnouncements,
      addAnnouncement,
      deleteAnnouncement,
      publishAnnouncement
    }}>
      {children}
    </AnnouncementsContext.Provider>
  );
}

export function useAnnouncements() {
  const context = useContext(AnnouncementsContext);
  if (context === undefined) {
    throw new Error('useAnnouncements must be used within an AnnouncementsProvider');
  }
  return context;
}
