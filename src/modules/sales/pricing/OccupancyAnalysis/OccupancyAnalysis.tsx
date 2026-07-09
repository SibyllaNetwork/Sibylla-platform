import PageHead from '../../../../core/components/PageHead'
import './OccupancyAnalysis.sass'

// Pagina Occupancy Analysis: contenuto BI da definire.
// Per il momento è un semplice placeholder di riferimento.
export default function OccupancyAnalysis({ navigate: _navigate }: { navigate: (p: string) => void }) {
  return (
    <div className="occupancy-analysis">
      <PageHead
        title="Occupancy Analysis"
        subtitle="Analisi dell'occupazione nel tempo"
      />
      <div className="occupancy-analysis__placeholder">PAGINA BI</div>
    </div>
  )
}
