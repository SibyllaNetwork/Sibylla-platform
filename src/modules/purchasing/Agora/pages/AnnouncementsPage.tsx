import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from './Layout';
import BtnBack from '../../../../core/components/BtnBack';
import PageHeader from '../../../../core/components/PageHeader';
import Pagination from '../../../../core/components/Pagination';
import Tooltip from '../../../../core/components/Tooltip';
import { useAnnunciStore, annuncioPerMe, type AnnuncioPubblicato } from '../../../../store/useAnnunciStore';
import './AnnouncementsPage.sass';

const PAGE_SIZE = 10;

// Stelle categoria struttura (oro).
function Stelle({ n }: { n: number }) {
  return (
    <span className="ann__stars" aria-label={`${n} stelle`}>
      {Array.from({ length: n }, (_, i) => (
        <i key={i} className="fa-solid fa-star" aria-hidden="true" />
      ))}
    </span>
  );
}

export function AnnouncementsPage() {
  const navigate = useNavigate();
  const annunci = useAnnunciStore((s) => s.annunci);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(annunci.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => annunci.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [annunci, page],
  );

  return (
    <Layout>
      <div className="ann">
        <BtnBack />

        <div className="ann__top">
          <PageHeader
            title="Annunci"
            subtitle="Il centro di scambio dove le opportunità si incontrano, le relazioni crescono e il valore si moltiplica."
          />
          <button type="button" className="sib-btn sib-btn--secondary ann__matchzone" onClick={() => navigate('/match-zone')}>
            <i className="fa-light fa-arrows-repeat" aria-hidden="true" /> Match zone
          </button>
        </div>

        <div className="sib-table-wrap">
          <table className="sib-table ann__table">
            <thead>
              <tr>
                <th className="ann__c-logo" aria-label="Logo" />
                <th>Ragione sociale</th>
                <th>Periodo</th>
                <th>Tipologia</th>
                <th className="ann__c-num">Lotti</th>
                <th>Struttura</th>
                <th>Categoria</th>
                <th className="ann__c-num">Camere</th>
                <th>Pubblicazione</th>
                <th>Genere</th>
                <th className="ann__c-center">Destinatario</th>
                <th className="ann__c-center">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((a: AnnuncioPubblicato) => {
                const perMe = annuncioPerMe(a);
                const g = a.genere.toLowerCase();
                return (
                  <tr key={a.id} className={`ann__row ann__row--${g}${perMe ? '' : ' ann__row--reserved'}`}>
                    <td className="ann__c-logo">
                      {perMe && a.logo
                        ? <img src={a.logo} alt="" className="ann__logo" />
                        : <span className="ann__logo ann__logo--ph"><i className="fa-light fa-hotel" aria-hidden="true" /></span>}
                    </td>
                    <td>{perMe ? a.ragioneSociale : <span className="ann__masked">Riservato</span>}</td>
                    <td className="ann__nowrap">{a.periodo}</td>
                    <td>{a.tipologia}</td>
                    <td className="ann__c-num">{a.lotti}</td>
                    <td>{perMe ? a.struttura : <span className="ann__masked">Riservato</span>}</td>
                    <td><Stelle n={a.categoria} /></td>
                    <td className="ann__c-num">{a.camere}</td>
                    <td className="ann__nowrap">{a.pubblicazione}</td>
                    <td>
                      <span className={`ann__genere ann__genere--${g}`}>
                        <i className={`fa-solid ${a.genere === 'Vendita' ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`} aria-hidden="true" />
                        {a.genere}
                      </span>
                    </td>
                    <td className="ann__c-center">
                      <Tooltip text={perMe ? 'Destinato a te' : 'Non destinato a te'}>
                        <i className={`fa-light ${perMe ? 'fa-eye' : 'fa-eye-slash'} ann__dest${perMe ? '' : ' ann__dest--off'}`} aria-hidden="true" />
                      </Tooltip>
                    </td>
                    <td className="ann__c-center">
                      <button type="button" className="ann__act" title="Dettagli annuncio" onClick={() => navigate(`/match-zone?id=${a.id}`)}>
                        <i className="fa-light fa-file-lines" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {annunci.length === 0 && (
          <div className="ann__empty">Nessun annuncio pubblicato.</div>
        )}

        {totalPages > 1 && (
          <div className="ann__pager">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
    </Layout>
  );
}
