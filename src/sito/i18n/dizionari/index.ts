import { Dizionario } from '../lingue'
import acquisto from './acquisto'
import contenuti from './contenuti'
import dati from './dati'
import home from './home'
import riservata from './riservata'
import soggiorni from './soggiorni'
import totem from './totem'

/** Un dizionario per area del sito: ognuno nel proprio file, uniti in i18n/index.ts. */
const aree: Dizionario[] = [dati, contenuti, riservata, totem, soggiorni, acquisto, home]

export default aree
