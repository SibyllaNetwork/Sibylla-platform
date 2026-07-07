import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import './AdrAnalysis.sass'

// Pagina ADR Analysis: contenuto BI da definire.
// Per il momento è un semplice placeholder di riferimento.
export default function AdrAnalysis({ navigate: _navigate }: { navigate: (p: string) => void }) {
  return (
    <div className="adr-analysis">
      <BtnBack />
      <PageHeader
        title="ADR Analysis"
        subtitle="Analisi dell'ADR nel tempo"
      />
      <div className="adr-analysis__placeholder">PAGINA BI</div>
    </div>
  )
}
