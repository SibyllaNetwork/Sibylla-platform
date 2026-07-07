import BtnBack from '../../core/components/BtnBack'
import PageHeader from '../../core/components/PageHeader'
import { buildCrumbs } from '../../navigation/menuHelpers'
import MENU from '../../navigation/menu'
import { PAGE_SUBTITLES } from '../../navigation/pageSubtitles'
import './BiPlaceholder.sass'

// Placeholder di riferimento per le pagine BI ancora da realizzare.
// Titolo e sottotitolo sono risolti dal menu / dalla mappa dei sottotitoli.
export default function BiPlaceholder({ page }: { page: string; navigate: (p: string) => void }) {
  const crumbs = buildCrumbs(MENU, page) || []
  const title = crumbs[crumbs.length - 1]?.label ?? page
  const subtitle = PAGE_SUBTITLES[page]
  return (
    <div className="bi-placeholder">
      <BtnBack />
      <PageHeader title={title} subtitle={subtitle} />
      <div className="bi-placeholder__box">PAGINA BI</div>
    </div>
  )
}
