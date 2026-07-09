import PageHead from '../../../../core/components/PageHead'
import './PickupAnalysis.sass'

// Pagina Pickup analysis: contenuto BI da definire.
// Per il momento è un semplice placeholder di riferimento.
export default function PickupAnalysis({ navigate: _navigate }: { navigate: (p: string) => void }) {
  return (
    <div className="pickup-analysis">
      <PageHead
        title="Pickup analysis"
        subtitle="Analisi dinamica dell'andamento delle prenotazioni nel tempo"
      />
      <div className="pickup-analysis__placeholder">PAGINA BI</div>
    </div>
  )
}
