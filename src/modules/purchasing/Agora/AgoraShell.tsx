/*
 * AgoraShell — punto di ingresso unico per la sub-app Agorà portata da Newagora.
 *
 * Strategia:
 *  - Tutte le pagine Newagora usano react-router internamente (useNavigate,
 *    useLocation, useParams, Link, ...). Per non riscriverle, montiamo qui un
 *    MemoryRouter limitato all'albero Agorà.
 *  - L'integrazione con il routing state-based di Sibylla avviene tramite la
 *    prop `initialPath`: quando l'utente seleziona una voce dal menu Sibylla
 *    legata all'Agorà, PageContent.tsx renderizza <AgoraShell initialPath="/quotes"/>
 *    e il MemoryRouter naviga subito a quel punto. La navigazione interna fra
 *    pagine Agorà (es. dettaglio prodotto) resta confinata al MemoryRouter e
 *    non altera l'URL browser, in linea con il modello state-based di Sibylla.
 *  - I context (Cart/Announcements/Academy/VoucherParking) sono locali alla
 *    sub-app.
 */
import { MemoryRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { CartProvider } from './context/CartContext';
import { AnnouncementsProvider } from './context/AnnouncementsContext';
import { AcademyProvider } from './context/AcademyContext';
import { VoucherParkingProvider } from './context/VoucherParkingContext';
import { VideosProvider } from './context/VideosContext';
import { DynamicPackagesConfigProvider } from './context/DynamicPackagesConfigContext';

import { LandingPage } from './landing/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { AccommodationsPage } from './pages/AccommodationsPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { CategoryDetailPage } from './pages/CategoryDetailPage';
import { ProductListPage } from './pages/ProductListPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { SuppliersListPage } from './pages/SuppliersListPage';
import { SupplierDetailPage } from './pages/SupplierDetailPage';
import { QuotesPage } from './pages/QuotesPage';
import { CreateQuotePage } from './pages/CreateQuotePage';
import { AcademyHubPage } from './pages/AcademyHubPage';
import { AcademyPolicyPage } from './pages/AcademyPolicyPage';
import { AcademyPersonnelPage } from './pages/AcademyPersonnelPage';
import { AcademyPersonnelDetailPage } from './pages/AcademyPersonnelDetailPage';
import { AcademyCoursesPage } from './pages/AcademyCoursesPage';
import { AcademyCourseDetailPage } from './pages/AcademyCourseDetailPage';
import { DynamicPackagesPage } from './pages/DynamicPackagesPage';
import { ElearningPage } from './pages/ElearningPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import ComponiAnnunci from '../../sales/ricavi/ComponiAnnunci/ComponiAnnunci';
import { MatchZonePage } from './pages/MatchZonePage';
import { GroupPurchasesPage } from './pages/GroupPurchasesPage';
import { ActiveGroupsPage } from './pages/ActiveGroupsPage';

import { AdminLayout } from './admin/AdminLayout';
import { AdminVideosPage } from './admin/AdminVideosPage';
import { AdminSettingsPage } from './admin/AdminSettingsPage';
import { AdminPackagesPage } from './admin/AdminPackagesPage';
import { AdminModulesPage } from './admin/AdminModulesPage';
import { AdminNuoveRisorsePage } from './admin/AdminNuoveRisorsePage';
import StruttureTab from '../../../admin/SibyllaAdminPanel/tabs/StruttureTab/StruttureTab';

interface AgoraShellProps {
  initialPath?: string;
  /** Callback Sibylla per uscire dall'Agorà verso un'altra pageId della piattaforma. */
  navigate?: (page: string) => void;
}

function AgoraRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/accommodations" element={<AccommodationsPage />} />
      <Route path="/categories" element={<SuppliersPage />} />
      <Route path="/category/:categoryId" element={<CategoryDetailPage />} />
      <Route path="/category/:categoryId/products/:productClassId" element={<ProductListPage />} />
      <Route path="/category/:categoryId/products/:productClassId/:productId" element={<ProductDetailPage />} />
      <Route path="/suppliers" element={<SuppliersListPage />} />
      <Route path="/supplier/:supplierId" element={<SupplierDetailPage />} />
      <Route path="/quotes" element={<QuotesPage />} />
      <Route path="/quotes/create" element={<CreateQuotePage />} />
      <Route path="/academy" element={<AcademyHubPage />} />
      <Route path="/academy/policy" element={<AcademyPolicyPage />} />
      <Route path="/academy/personnel" element={<AcademyPersonnelPage />} />
      <Route path="/academy/personnel/:id" element={<AcademyPersonnelDetailPage />} />
      <Route path="/academy/courses" element={<AcademyCoursesPage />} />
      <Route path="/academy/courses/:id" element={<AcademyCourseDetailPage />} />
      <Route path="/dynamic-packages" element={<DynamicPackagesPage />} />
      <Route path="/elearning" element={<ElearningPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/announcements" element={<AnnouncementsPage />} />
      <Route path="/announcements/manage" element={<ComponiAnnunci navigate={() => {}} />} />
      <Route path="/match-zone" element={<MatchZonePage />} />
      <Route path="/group-purchases" element={<GroupPurchasesPage />} />
      <Route path="/group-purchases/active" element={<ActiveGroupsPage />} />

      {/* ── Console Admin Agorà ────────────────────────────────────────── */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="videos" replace />} />
        <Route path="videos" element={<AdminVideosPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="announcements" element={<AdminNuoveRisorsePage />} />
        <Route path="packages" element={<AdminPackagesPage />} />
        <Route path="accommodations" element={<StruttureTab />} />
        <Route path="modules" element={<AdminModulesPage />} />
      </Route>
    </Routes>
  );
}

/** Sincronizza initialPath con MemoryRouter quando cambia (cambio pageId Sibylla). */
function PathSync({ path }: { path: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(path, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
  return null;
}

export default function AgoraShell({ initialPath = '/' }: AgoraShellProps) {
  return (
    <CartProvider>
      <AnnouncementsProvider>
        <AcademyProvider>
          <VoucherParkingProvider>
            <VideosProvider>
              <DynamicPackagesConfigProvider>
                <MemoryRouter initialEntries={[initialPath]}>
                  <PathSync path={initialPath} />
                  <AgoraRoutes />
                </MemoryRouter>
              </DynamicPackagesConfigProvider>
            </VideosProvider>
          </VoucherParkingProvider>
        </AcademyProvider>
      </AnnouncementsProvider>
    </CartProvider>
  );
}
