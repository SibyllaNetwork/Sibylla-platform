import { useNavigate } from 'react-router-dom';
import { Layout } from './Layout';
import { AnnunciTable } from '../../GestioneAnnunci/AnnunciTable';

// Pagina "Annunci" dentro l'Agorà (route /announcements): stessa tabella standard
// di Purchasing → Annunci, alimentata da useAnnunciStore.
export function AnnouncementsPage() {
  const navigate = useNavigate();
  return (
    <Layout>
      <AnnunciTable onMatchZone={() => navigate('/match-zone')} />
    </Layout>
  );
}
