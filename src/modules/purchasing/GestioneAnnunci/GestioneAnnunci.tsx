import { AnnunciTable } from './AnnunciTable'

// Pagina "Annunci" (Purchasing → Agorà): destinazione degli annunci pubblicati
// da "Componi annunci". Il contenuto è la tabella standard condivisa AnnunciTable
// (alimentata da useAnnunciStore).
export default function GestioneAnnunci({ navigate }: { navigate: (p: string) => void }) {
  return (
    <AnnunciTable
      onBack={() => navigate('agora-announcements')}
      onMatchZone={() => navigate('matchzone')}
    />
  )
}
