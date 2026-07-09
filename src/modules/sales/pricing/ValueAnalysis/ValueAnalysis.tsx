import PageHead from '../../../../core/components/PageHead'
import './ValueAnalysis.sass'

// Pagina Value analysis: contenuto BI da definire.
// Per il momento è un semplice placeholder di riferimento.
export default function ValueAnalysis({ navigate: _navigate }: { navigate: (p: string) => void }) {
  return (
    <div className="value-analysis">
      <PageHead
        title="Value analysis"
        subtitle="Analisi del markup e delle performance di occupancy e ADR"
      />
      <div className="value-analysis__placeholder">PAGINA BI</div>
    </div>
  )
}
