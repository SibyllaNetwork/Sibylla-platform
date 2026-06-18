import { useNavigate } from 'react-router-dom';
import { Layout } from './Layout';
import { PageHeader } from './PageHeader';
import { Icon } from '../ds/icon';
import './AcademyPolicyPage.css';

/*
 * AcademyPolicyPage — Policy Sibylla per l'inserimento di annunci nella sezione
 * "Nuove risorse" (ricerca personale e corsi di formazione). Documento redatto a
 * nome di Sibylla S.r.l. e allineato al Regolamento (UE) 2016/679 (GDPR) e alla
 * normativa nazionale in materia di protezione dei dati e di annunci di lavoro.
 */

const LAST_UPDATE = '18 giugno 2026';
const VERSION = '1.0';

export function AcademyPolicyPage() {
  const navigate = useNavigate();

  return (
    <Layout>
      <PageHeader
        title="Policy per l'inserimento di annunci"
        subtitle="Regole di pubblicazione e informativa sul trattamento dei dati personali — sezione Nuove risorse"
        backLabel="Torna a Nuove risorse"
        onBack={() => navigate('/academy')}
      />

      <article className="academy-policy">
        <div className="academy-policy__meta">
          <span className="academy-policy__badge">
            <Icon family="light" name="shield-check" /> Conforme al GDPR — Reg. (UE) 2016/679
          </span>
          <span className="academy-policy__meta-item">Versione {VERSION}</span>
          <span className="academy-policy__meta-item">Ultimo aggiornamento: {LAST_UPDATE}</span>
        </div>

        <p className="academy-policy__lead">
          La presente Policy disciplina la pubblicazione di annunci nella sezione «Nuove risorse»
          della piattaforma Sibylla — offerte e richieste di lavoro e corsi di formazione — e
          fornisce l'informativa sul trattamento dei dati personali ai sensi degli artt. 13 e 14
          del Regolamento (UE) 2016/679 («GDPR»). Pubblicando un annuncio l'utente dichiara di
          aver letto, compreso e accettato quanto segue.
        </p>

        <section className="academy-policy__section">
          <h2>1. Titolare del trattamento</h2>
          <p>
            Titolare del trattamento dei dati personali raccolti tramite la piattaforma è
            <strong> Sibylla S.r.l.</strong> («Sibylla»), con sede legale in Italia.
            È possibile contattare il Titolare e il Responsabile della Protezione dei Dati (DPO)
            agli indirizzi: <a href="mailto:privacy@sibyllanetwork.com">privacy@sibyllanetwork.com</a> e
            {' '}<a href="mailto:dpo@sibyllanetwork.com">dpo@sibyllanetwork.com</a>.
          </p>
        </section>

        <section className="academy-policy__section">
          <h2>2. Ambito di applicazione</h2>
          <p>
            La Policy si applica a chiunque pubblichi contenuti nella sezione «Nuove risorse»,
            ossia: aziende e operatori del settore che pubblicano offerte di lavoro, professionisti
            che propongono la propria candidatura, ed enti o formatori che pubblicano corsi.
            Si integra con la Privacy Policy generale e con i Termini e Condizioni della piattaforma
            Sibylla, di cui costituisce parte integrante.
          </p>
        </section>

        <section className="academy-policy__section">
          <h2>3. Ruoli e responsabilità privacy</h2>
          <p>
            In relazione ai dati personali contenuti negli annunci e a quelli raccolti in risposta
            agli stessi (es. candidature, curriculum, dati di contatto):
          </p>
          <ul>
            <li>
              <strong>L'inserzionista</strong> agisce come <em>titolare autonomo del trattamento</em>
              dei dati personali che pubblica e di quelli che riceve direttamente dagli interessati,
              ed è responsabile della liceità e correttezza di tali trattamenti.
            </li>
            <li>
              <strong>Sibylla</strong> agisce come titolare del trattamento per la gestione tecnica
              della piattaforma, la moderazione, la sicurezza e la conservazione dei contenuti
              pubblicati, e mette a disposizione l'infrastruttura senza entrare nel merito dei
              rapporti tra inserzionista e interessati.
            </li>
          </ul>
        </section>

        <section className="academy-policy__section">
          <h2>4. Basi giuridiche del trattamento</h2>
          <p>I dati sono trattati sulla base di una o più delle seguenti condizioni (art. 6 GDPR):</p>
          <ul>
            <li>esecuzione di un contratto o di misure precontrattuali richieste dall'utente (art. 6.1.b);</li>
            <li>consenso libero, specifico e informato dell'interessato, ove richiesto (art. 6.1.a);</li>
            <li>legittimo interesse del Titolare alla gestione e sicurezza della piattaforma (art. 6.1.f);</li>
            <li>adempimento di obblighi legali a cui è soggetto il Titolare (art. 6.1.c).</li>
          </ul>
        </section>

        <section className="academy-policy__section">
          <h2>5. Regole di pubblicazione</h2>
          <p>Ogni annuncio deve rispettare i seguenti principi. È <strong>vietato</strong> pubblicare:</p>
          <ul>
            <li>
              <strong>dati personali eccedenti</strong> rispetto alla finalità dell'annuncio
              (principio di minimizzazione, art. 5.1.c GDPR): non inserire dati di contatto di terzi
              senza base giuridica, né informazioni non necessarie alla selezione o all'iscrizione;
            </li>
            <li>
              <strong>categorie particolari di dati</strong> (art. 9 GDPR) — origine razziale o etnica,
              opinioni politiche, convinzioni religiose o filosofiche, appartenenza sindacale, dati
              relativi alla salute, alla vita sessuale o all'orientamento sessuale — salvo i casi
              espressamente consentiti dalla legge;
            </li>
            <li>
              <strong>contenuti discriminatori</strong>: gli annunci di lavoro non possono contenere
              riferimenti, requisiti o preferenze basati su sesso, età, origine, religione, opinioni
              personali, disabilità, orientamento sessuale o condizioni personali e sociali, in
              conformità all'art. 8 della L. 300/1970 (Statuto dei Lavoratori) e al D.Lgs. 198/2006,
              D.Lgs. 215/2003 e D.Lgs. 216/2003;
            </li>
            <li>informazioni false, ingannevoli o non verificabili sulla posizione, sull'azienda o sul corso;</li>
            <li>
              contenuti illeciti, offensivi, diffamatori, o lesivi di diritti di proprietà
              intellettuale di terzi (inclusi i materiali didattici dei corsi);
            </li>
            <li>richieste di pagamento all'atto della candidatura o altre pratiche scorrette verso i candidati.</li>
          </ul>
          <p>
            L'inserzionista garantisce di disporre di idonea base giuridica e, ove necessario, del
            consenso degli interessati per i dati pubblicati, e di aver fornito loro l'informativa
            prevista dagli artt. 13-14 GDPR.
          </p>
        </section>

        <section className="academy-policy__section">
          <h2>6. Dati degli interessati che rispondono agli annunci</h2>
          <p>
            I dati trasmessi dai candidati o dagli iscritti (curriculum, dati di contatto, ecc.)
            devono essere trattati dall'inserzionista esclusivamente per le finalità di selezione o
            iscrizione dichiarate, per il tempo strettamente necessario, e non possono essere
            riutilizzati per finalità diverse senza un'autonoma base giuridica. È vietata la
            comunicazione o diffusione a terzi non autorizzati.
          </p>
        </section>

        <section className="academy-policy__section">
          <h2>7. Conservazione dei dati</h2>
          <p>
            Gli annunci restano pubblicati per il tempo necessario alla finalità (fino alla chiusura
            della selezione o del corso) e comunque non oltre i termini indicati nella Privacy Policy.
            I curricula e i dati dei candidati vanno conservati per il tempo strettamente necessario
            e cancellati al termine, salvo distinto consenso alla conservazione per future selezioni.
          </p>
        </section>

        <section className="academy-policy__section">
          <h2>8. Diritti degli interessati</h2>
          <p>
            Gli interessati possono esercitare in qualsiasi momento i diritti previsti dagli artt.
            15-22 GDPR: accesso, rettifica, cancellazione («diritto all'oblio»), limitazione del
            trattamento, portabilità dei dati e opposizione. Le richieste relative ai dati gestiti
            dalla piattaforma possono essere inviate a
            {' '}<a href="mailto:privacy@sibyllanetwork.com">privacy@sibyllanetwork.com</a>; resta
            ferma la facoltà di proporre reclamo all'Autorità Garante per la protezione dei dati
            personali (www.garanteprivacy.it).
          </p>
        </section>

        <section className="academy-policy__section">
          <h2>9. Sicurezza e trasferimenti</h2>
          <p>
            Sibylla adotta misure tecniche e organizzative adeguate a garantire un livello di
            sicurezza appropriato al rischio (art. 32 GDPR). Eventuali trasferimenti di dati verso
            Paesi terzi avvengono solo in presenza di adeguate garanzie ai sensi degli artt. 44 e
            seguenti del GDPR.
          </p>
        </section>

        <section className="academy-policy__section">
          <h2>10. Moderazione, sospensione e rimozione</h2>
          <p>
            Ogni annuncio è sottoposto a moderazione preventiva da parte del supporto Sibylla prima
            della pubblicazione. Sibylla si riserva di non pubblicare, sospendere o rimuovere
            annunci non conformi alla presente Policy o alla legge, dandone comunicazione
            all'inserzionista con l'eventuale motivazione. L'annuncio corretto può essere
            ri-sottoposto a una nuova moderazione.
          </p>
        </section>

        <section className="academy-policy__section">
          <h2>11. Responsabilità dell'inserzionista</h2>
          <p>
            L'inserzionista è l'unico responsabile dei contenuti pubblicati e del trattamento dei
            dati personali ivi inseriti o raccolti, e manleva Sibylla da qualsiasi pretesa di terzi
            derivante dalla violazione della presente Policy, della normativa sulla protezione dei
            dati o della normativa giuslavoristica applicabile.
          </p>
        </section>

        <section className="academy-policy__section">
          <h2>12. Modifiche alla Policy</h2>
          <p>
            Sibylla può aggiornare la presente Policy per adeguarla a modifiche normative o
            operative. La versione vigente è sempre disponibile in questa pagina, con indicazione
            della data di ultimo aggiornamento.
          </p>
        </section>

        <section className="academy-policy__refs">
          <h2>Riferimenti normativi</h2>
          <ul>
            <li>Regolamento (UE) 2016/679 (GDPR);</li>
            <li>D.Lgs. 196/2003 (Codice Privacy) come modificato dal D.Lgs. 101/2018;</li>
            <li>L. 300/1970 (Statuto dei Lavoratori), art. 8;</li>
            <li>D.Lgs. 198/2006 (Codice delle pari opportunità);</li>
            <li>D.Lgs. 215/2003 e D.Lgs. 216/2003 (parità di trattamento e non discriminazione).</li>
          </ul>
          <p className="academy-policy__disclaimer">
            Documento informativo a cura di Sibylla S.r.l. Da leggere congiuntamente alla
            Privacy Policy e ai Termini e Condizioni della piattaforma; non sostituisce la consulenza
            legale per i casi specifici.
          </p>
        </section>

        <div className="academy-policy__foot">
          <button type="button" className="academy-policy__back" onClick={() => navigate('/academy')}>
            <Icon family="regular" name="arrow-left" />
            Torna a Nuove risorse
          </button>
        </div>
      </article>
    </Layout>
  );
}
