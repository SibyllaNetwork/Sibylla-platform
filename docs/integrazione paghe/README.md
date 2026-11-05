# Integrazione paghe — TeamSystem RILPRE

Specifica: `Tracciato_RILPRE.pdf` (TeamSystem, note operative di release).

## Il file

- Binario, **senza fine riga**: un record da **1707 caratteri** per dipendente, concatenati.
- Nome del file: `RILPRE`.
- Numerici non valorizzati a `0`, alfanumerici a spazio. Solo ASCII: i caratteri accentati diventano la lettera semplice, quindi le posizioni non slittano.
- Generato in `src/modules/hr/_presenze/rilpre.ts` (`generaRilpre`) dalle stesse giornate del Registro presenze.

## Da dove vengono i campi

| Campo (pos., lungh.) | Origine in Sibylla |
| --- | --- |
| Codice azienda (1, 4) | Configurazione HR › Integrazione paghe › TeamSystem › Codice azienda |
| Codice filiale (5, 2) | Codice filiale. Con 3 cifre va negli ultimi 3 caratteri del nome (pos. 81–83) e qui resta `00` |
| Codice dipendente (7, 9) | Integrazione paghe › Codici dei dipendenti (variante RP: `RP ` a pos. 7 e codice di 6 cifre a pos. 10) |
| Cognome (16, 34) / Nome (50, 34) | Anagrafica, in maiuscolo |
| Data inizio / fine mese (84 / 90, 6) | Mese trasmesso, formato GGMMAA |
| Ore ordinario (96 + 52·g, 4) | Ore ordinarie della giornata in hhcc (0 nei giorni festivi: vanno nel giustificativo Festive) |
| Giustificativi 1–6 (codice 4 + ore 4) | Nell'ordine: Straordinario, Festive, Permessi/ROL, Ferie, Malattia, Infortunio, Trasferta, Assenza. Codici in Integrazione paghe › Codici voce (TB1103). Variante RP: sigla 2 + «somma all'ordinario» + «stampa descrizione» + ore |

- Ferie, malattia e assenza valgono 8 h per giornata.
- Lo straordinario parte dalla mezz'ora oltre l'orario ordinario.
- I giorni oltre la fine del mese (es. il 31 di novembre) sono a zero e spazi.

## Invio

**Registro presenze › Trasmetti consuntivo** genera il RILPRE e lo passa al backend:

```
POST /Sibylla/hr/paghe/trasmetti
{
  software: 'teamsystem', canale: 'api' | 'sftp' | 'email', mese: 'aaaa-mm', formato,
  parametri: { codiceAzienda, codiceFiliale, sftpHost, sftpCartella, emailConsulente, … },  // senza segreti
  file: { nome: 'RILPRE', base64, record, lunghezzaRecord: 1707 },
  riepilogo: { dipendenti, oreOrdinarie, oreStraordinario, giorniFerie, orePermessi, giorniMalattia, anomalie },
  note
}
→ { esito: 'inviato', protocollo?, messaggio? }
```

- Il backend conserva le credenziali (API key Digital Hub, password SFTP) e fa la consegna sul canale scelto.
- Finché l'endpoint non esiste o non risponde, come nella demo online, l'invio risulta **simulato**; il file resta scaricabile con «Scarica RILPRE».
