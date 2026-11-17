-- ============================================================================
-- Configurazione HR tipo di una struttura ricettiva (generato da
-- src/store/data/hr-struttura-ricettiva.json di sibylla-platform, versione 2026-11-17).
-- Precompila Reparti, Orari di lavoro e Turnistica di UNA struttura.
-- Idempotente: inserisce solo cio' che manca (per Id) e non tocca i dati esistenti.
-- Uso in DbUp: script "1 - Data" con @StrutturaId valorizzato dalla procedura
-- di creazione struttura (oppure eseguito per ogni struttura esistente).
-- Tabelle: vedi 17-turni-e-turnistica-v2.md par. 2.6 e 6.
-- ============================================================================
DECLARE @StrutturaId INT = 0; -- id della struttura da precompilare
SET XACT_ABORT ON;
BEGIN TRAN;

-- Reparti
IF NOT EXISTS (SELECT 1 FROM HrReparto WHERE StrutturaId=@StrutturaId AND Id=N'rep-dir')
  INSERT INTO HrReparto(StrutturaId, Id, Nome, Codice, Responsabile, CentroCosto, Colore, RepartoOp, Attivo, Descrizione)
  VALUES(@StrutturaId, N'rep-dir', N'Direzione', N'DIR', N'', N'CDC-05 Sede', 7, NULL, 1, N'Direzione della struttura e qualità.');
IF NOT EXISTS (SELECT 1 FROM HrReparto WHERE StrutturaId=@StrutturaId AND Id=N'rep-fo')
  INSERT INTO HrReparto(StrutturaId, Id, Nome, Codice, Responsabile, CentroCosto, Colore, RepartoOp, Attivo, Descrizione)
  VALUES(@StrutturaId, N'rep-fo', N'Front office', N'FO', N'', N'CDC-01 Ricevimento', 1, N'frontOffice', 1, N'Ricevimento, check-in e check-out, portiere di notte e night audit.');
IF NOT EXISTS (SELECT 1 FROM HrReparto WHERE StrutturaId=@StrutturaId AND Id=N'rep-port')
  INSERT INTO HrReparto(StrutturaId, Id, Nome, Codice, Responsabile, CentroCosto, Colore, RepartoOp, Attivo, Descrizione)
  VALUES(@StrutturaId, N'rep-port', N'Portineria e facchinaggio', N'PORT', N'', N'CDC-01 Ricevimento', 8, N'frontOffice', 1, N'Concierge, bagagli, navette e parcheggio.');
IF NOT EXISTS (SELECT 1 FROM HrReparto WHERE StrutturaId=@StrutturaId AND Id=N'rep-hk')
  INSERT INTO HrReparto(StrutturaId, Id, Nome, Codice, Responsabile, CentroCosto, Colore, RepartoOp, Attivo, Descrizione)
  VALUES(@StrutturaId, N'rep-hk', N'Housekeeping', N'HK', N'', N'CDC-03 Piani', 3, N'pulizie', 1, N'Pulizia e rifacimento delle camere, aree comuni, couverture.');
IF NOT EXISTS (SELECT 1 FROM HrReparto WHERE StrutturaId=@StrutturaId AND Id=N'rep-lav')
  INSERT INTO HrReparto(StrutturaId, Id, Nome, Codice, Responsabile, CentroCosto, Colore, RepartoOp, Attivo, Descrizione)
  VALUES(@StrutturaId, N'rep-lav', N'Lavanderia e guardaroba', N'LAV', N'', N'CDC-03 Piani', 6, N'pulizie', 1, N'Biancheria, divise e lavanderia ospiti.');
IF NOT EXISTS (SELECT 1 FROM HrReparto WHERE StrutturaId=@StrutturaId AND Id=N'rep-fb')
  INSERT INTO HrReparto(StrutturaId, Id, Nome, Codice, Responsabile, CentroCosto, Colore, RepartoOp, Attivo, Descrizione)
  VALUES(@StrutturaId, N'rep-fb', N'F&B', N'FB', N'', N'CDC-02 Ristorazione', 2, N'foodBeverage', 1, N'Sala ristorante: colazioni, pranzo e cena.');
IF NOT EXISTS (SELECT 1 FROM HrReparto WHERE StrutturaId=@StrutturaId AND Id=N'rep-bar')
  INSERT INTO HrReparto(StrutturaId, Id, Nome, Codice, Responsabile, CentroCosto, Colore, RepartoOp, Attivo, Descrizione)
  VALUES(@StrutturaId, N'rep-bar', N'Bar', N'BAR', N'', N'CDC-02 Ristorazione', 4, N'foodBeverage', 1, N'Bar, lounge e servizio in camera serale.');
IF NOT EXISTS (SELECT 1 FROM HrReparto WHERE StrutturaId=@StrutturaId AND Id=N'rep-cuc')
  INSERT INTO HrReparto(StrutturaId, Id, Nome, Codice, Responsabile, CentroCosto, Colore, RepartoOp, Attivo, Descrizione)
  VALUES(@StrutturaId, N'rep-cuc', N'Cucina', N'CUC', N'', N'CDC-02 Ristorazione', 5, N'foodBeverage', 1, N'Brigata di cucina e pasticceria.');
IF NOT EXISTS (SELECT 1 FROM HrReparto WHERE StrutturaId=@StrutturaId AND Id=N'rep-spa')
  INSERT INTO HrReparto(StrutturaId, Id, Nome, Codice, Responsabile, CentroCosto, Colore, RepartoOp, Attivo, Descrizione)
  VALUES(@StrutturaId, N'rep-spa', N'Spa e benessere', N'SPA', N'', N'CDC-06 Servizi', 7, NULL, 1, N'Centro benessere, piscina e palestra.');
IF NOT EXISTS (SELECT 1 FROM HrReparto WHERE StrutturaId=@StrutturaId AND Id=N'rep-man')
  INSERT INTO HrReparto(StrutturaId, Id, Nome, Codice, Responsabile, CentroCosto, Colore, RepartoOp, Attivo, Descrizione)
  VALUES(@StrutturaId, N'rep-man', N'Manutenzione', N'MAN', N'', N'CDC-04 Manutenzione', 4, N'manutenzione', 1, N'Manutenzione ordinaria, impianti e reperibilità.');
IF NOT EXISTS (SELECT 1 FROM HrReparto WHERE StrutturaId=@StrutturaId AND Id=N'rep-mag')
  INSERT INTO HrReparto(StrutturaId, Id, Nome, Codice, Responsabile, CentroCosto, Colore, RepartoOp, Attivo, Descrizione)
  VALUES(@StrutturaId, N'rep-mag', N'Magazzino', N'MAG', N'', N'CDC-04 Manutenzione', 6, N'magazzino', 1, N'Ricevimento merci, scorte e inventari.');
IF NOT EXISTS (SELECT 1 FROM HrReparto WHERE StrutturaId=@StrutturaId AND Id=N'rep-amm')
  INSERT INTO HrReparto(StrutturaId, Id, Nome, Codice, Responsabile, CentroCosto, Colore, RepartoOp, Attivo, Descrizione)
  VALUES(@StrutturaId, N'rep-amm', N'Amministrazione', N'AMM', N'', N'CDC-05 Sede', 6, N'risorseUmane', 1, N'Contabilità, personale e acquisti.');
IF NOT EXISTS (SELECT 1 FROM HrReparto WHERE StrutturaId=@StrutturaId AND Id=N'rep-com')
  INSERT INTO HrReparto(StrutturaId, Id, Nome, Codice, Responsabile, CentroCosto, Colore, RepartoOp, Attivo, Descrizione)
  VALUES(@StrutturaId, N'rep-com', N'Commerciale e booking', N'COM', N'', N'CDC-05 Sede', 8, NULL, 1, N'Vendite, revenue, gruppi ed eventi.');

-- Orari di lavoro (Giorni = JSON di 7 FasciaGiorno, Lun-Dom)
IF NOT EXISTS (SELECT 1 FROM HrOrario WHERE StrutturaId=@StrutturaId AND Id=N'ora-ft5')
  INSERT INTO HrOrario(StrutturaId, Id, Nome, Regime, ATurni, OreSettimanali, GiorniSettimana, FlessibilitaMin, Giorni)
  VALUES(@StrutturaId, N'ora-ft5', N'Full time 40 h · 5 giorni', N'full-time', 0, 40, 5, 15, N'[{"attivo":true,"fasce":[{"inizio":"09:00","fine":"13:00"},{"inizio":"14:00","fine":"18:00"}],"pausaMin":0},{"attivo":true,"fasce":[{"inizio":"09:00","fine":"13:00"},{"inizio":"14:00","fine":"18:00"}],"pausaMin":0},{"attivo":true,"fasce":[{"inizio":"09:00","fine":"13:00"},{"inizio":"14:00","fine":"18:00"}],"pausaMin":0},{"attivo":true,"fasce":[{"inizio":"09:00","fine":"13:00"},{"inizio":"14:00","fine":"18:00"}],"pausaMin":0},{"attivo":true,"fasce":[{"inizio":"09:00","fine":"13:00"},{"inizio":"14:00","fine":"18:00"}],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0}]');
IF NOT EXISTS (SELECT 1 FROM HrOrario WHERE StrutturaId=@StrutturaId AND Id=N'ora-ft6')
  INSERT INTO HrOrario(StrutturaId, Id, Nome, Regime, ATurni, OreSettimanali, GiorniSettimana, FlessibilitaMin, Giorni)
  VALUES(@StrutturaId, N'ora-ft6', N'Full time 40 h · 6 giorni', N'full-time', 0, 40, 6, 10, N'[{"attivo":true,"fasce":[{"inizio":"08:00","fine":"15:10"}],"pausaMin":30},{"attivo":true,"fasce":[{"inizio":"08:00","fine":"15:10"}],"pausaMin":30},{"attivo":true,"fasce":[{"inizio":"08:00","fine":"15:10"}],"pausaMin":30},{"attivo":true,"fasce":[{"inizio":"08:00","fine":"15:10"}],"pausaMin":30},{"attivo":true,"fasce":[{"inizio":"08:00","fine":"15:10"}],"pausaMin":30},{"attivo":true,"fasce":[{"inizio":"08:00","fine":"15:10"}],"pausaMin":30},{"attivo":false,"fasce":[],"pausaMin":0}]');
IF NOT EXISTS (SELECT 1 FROM HrOrario WHERE StrutturaId=@StrutturaId AND Id=N'ora-ftsab')
  INSERT INTO HrOrario(StrutturaId, Id, Nome, Regime, ATurni, OreSettimanali, GiorniSettimana, FlessibilitaMin, Giorni)
  VALUES(@StrutturaId, N'ora-ftsab', N'Full time 40 h · sabato mattina', N'full-time', 0, 40, 6, 10, N'[{"attivo":true,"fasce":[{"inizio":"08:30","fine":"12:30"},{"inizio":"13:30","fine":"17:00"}],"pausaMin":0},{"attivo":true,"fasce":[{"inizio":"08:30","fine":"12:30"},{"inizio":"13:30","fine":"17:00"}],"pausaMin":0},{"attivo":true,"fasce":[{"inizio":"08:30","fine":"12:30"},{"inizio":"13:30","fine":"17:00"}],"pausaMin":0},{"attivo":true,"fasce":[{"inizio":"08:30","fine":"12:30"},{"inizio":"13:30","fine":"17:00"}],"pausaMin":0},{"attivo":true,"fasce":[{"inizio":"08:30","fine":"12:30"},{"inizio":"13:30","fine":"17:00"}],"pausaMin":0},{"attivo":true,"fasce":[{"inizio":"08:30","fine":"11:00"}],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0}]');
IF NOT EXISTS (SELECT 1 FROM HrOrario WHERE StrutturaId=@StrutturaId AND Id=N'ora-tur')
  INSERT INTO HrOrario(StrutturaId, Id, Nome, Regime, ATurni, OreSettimanali, GiorniSettimana, FlessibilitaMin, Giorni)
  VALUES(@StrutturaId, N'ora-tur', N'Turnista 40 h · 6 giorni', N'full-time', 1, 40, 6, 0, N'[{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0}]');
IF NOT EXISTS (SELECT 1 FROM HrOrario WHERE StrutturaId=@StrutturaId AND Id=N'ora-tur5')
  INSERT INTO HrOrario(StrutturaId, Id, Nome, Regime, ATurni, OreSettimanali, GiorniSettimana, FlessibilitaMin, Giorni)
  VALUES(@StrutturaId, N'ora-tur5', N'Turnista 40 h · 5 giorni', N'full-time', 1, 40, 5, 5, N'[{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0}]');
IF NOT EXISTS (SELECT 1 FROM HrOrario WHERE StrutturaId=@StrutturaId AND Id=N'ora-tur32')
  INSERT INTO HrOrario(StrutturaId, Id, Nome, Regime, ATurni, OreSettimanali, GiorniSettimana, FlessibilitaMin, Giorni)
  VALUES(@StrutturaId, N'ora-tur32', N'Turnista part time 32 h · 4 giorni', N'part-time-verticale', 1, 32, 4, 5, N'[{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0}]');
IF NOT EXISTS (SELECT 1 FROM HrOrario WHERE StrutturaId=@StrutturaId AND Id=N'ora-tur16')
  INSERT INTO HrOrario(StrutturaId, Id, Nome, Regime, ATurni, OreSettimanali, GiorniSettimana, FlessibilitaMin, Giorni)
  VALUES(@StrutturaId, N'ora-tur16', N'Turnista part time 16 h · 2 giorni', N'part-time-verticale', 1, 16, 2, 5, N'[{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0}]');
IF NOT EXISTS (SELECT 1 FROM HrOrario WHERE StrutturaId=@StrutturaId AND Id=N'ora-chi24')
  INSERT INTO HrOrario(StrutturaId, Id, Nome, Regime, ATurni, OreSettimanali, GiorniSettimana, FlessibilitaMin, Giorni)
  VALUES(@StrutturaId, N'ora-chi24', N'A chiamata fino a 24 h · 3 giorni', N'part-time-misto', 1, 24, 3, 5, N'[{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0}]');
IF NOT EXISTS (SELECT 1 FROM HrOrario WHERE StrutturaId=@StrutturaId AND Id=N'ora-pt30')
  INSERT INTO HrOrario(StrutturaId, Id, Nome, Regime, ATurni, OreSettimanali, GiorniSettimana, FlessibilitaMin, Giorni)
  VALUES(@StrutturaId, N'ora-pt30', N'Part time 30 h orizzontale', N'part-time-orizzontale', 0, 30, 5, 10, N'[{"attivo":true,"fasce":[{"inizio":"09:00","fine":"15:00"}],"pausaMin":0},{"attivo":true,"fasce":[{"inizio":"09:00","fine":"15:00"}],"pausaMin":0},{"attivo":true,"fasce":[{"inizio":"09:00","fine":"15:00"}],"pausaMin":0},{"attivo":true,"fasce":[{"inizio":"09:00","fine":"15:00"}],"pausaMin":0},{"attivo":true,"fasce":[{"inizio":"09:00","fine":"15:00"}],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0}]');
IF NOT EXISTS (SELECT 1 FROM HrOrario WHERE StrutturaId=@StrutturaId AND Id=N'ora-pt24')
  INSERT INTO HrOrario(StrutturaId, Id, Nome, Regime, ATurni, OreSettimanali, GiorniSettimana, FlessibilitaMin, Giorni)
  VALUES(@StrutturaId, N'ora-pt24', N'Part time 24 h verticale', N'part-time-verticale', 0, 24, 3, 10, N'[{"attivo":true,"fasce":[{"inizio":"08:00","fine":"16:30"}],"pausaMin":30},{"attivo":true,"fasce":[{"inizio":"08:00","fine":"16:30"}],"pausaMin":30},{"attivo":true,"fasce":[{"inizio":"08:00","fine":"16:30"}],"pausaMin":30},{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0},{"attivo":false,"fasce":[],"pausaMin":0}]');

-- Turni di servizio e reparti in cui si usano (nessuna riga = tutti i reparti)
IF NOT EXISTS (SELECT 1 FROM HrTurno WHERE StrutturaId=@StrutturaId AND Id=N'tur-m')
BEGIN
  INSERT INTO HrTurno(StrutturaId, Id, Sigla, Nome, Inizio, Fine, Inizio2, Fine2, PausaMin, Colore)
  VALUES(@StrutturaId, N'tur-m', N'M', N'Mattina', '07:00', '15:00', NULL, NULL, 30, 1);
END
IF NOT EXISTS (SELECT 1 FROM HrTurno WHERE StrutturaId=@StrutturaId AND Id=N'tur-p')
BEGIN
  INSERT INTO HrTurno(StrutturaId, Id, Sigla, Nome, Inizio, Fine, Inizio2, Fine2, PausaMin, Colore)
  VALUES(@StrutturaId, N'tur-p', N'P', N'Pomeriggio', '15:00', '23:00', NULL, NULL, 30, 3);
END
IF NOT EXISTS (SELECT 1 FROM HrTurno WHERE StrutturaId=@StrutturaId AND Id=N'tur-n')
BEGIN
  INSERT INTO HrTurno(StrutturaId, Id, Sigla, Nome, Inizio, Fine, Inizio2, Fine2, PausaMin, Colore)
  VALUES(@StrutturaId, N'tur-n', N'N', N'Notte', '23:00', '07:00', NULL, NULL, 30, 6);
  INSERT INTO HrTurnoReparto(StrutturaId, TurnoId, RepartoId) VALUES(@StrutturaId, N'tur-n', N'rep-fo');
END
IF NOT EXISTS (SELECT 1 FROM HrTurno WHERE StrutturaId=@StrutturaId AND Id=N'tur-i')
BEGIN
  INSERT INTO HrTurno(StrutturaId, Id, Sigla, Nome, Inizio, Fine, Inizio2, Fine2, PausaMin, Colore)
  VALUES(@StrutturaId, N'tur-i', N'I', N'Intermedio check-in', '11:00', '19:00', NULL, NULL, 30, 7);
  INSERT INTO HrTurnoReparto(StrutturaId, TurnoId, RepartoId) VALUES(@StrutturaId, N'tur-i', N'rep-fo');
  INSERT INTO HrTurnoReparto(StrutturaId, TurnoId, RepartoId) VALUES(@StrutturaId, N'tur-i', N'rep-port');
END
IF NOT EXISTS (SELECT 1 FROM HrTurno WHERE StrutturaId=@StrutturaId AND Id=N'tur-m6')
BEGIN
  INSERT INTO HrTurno(StrutturaId, Id, Sigla, Nome, Inizio, Fine, Inizio2, Fine2, PausaMin, Colore)
  VALUES(@StrutturaId, N'tur-m6', N'M6', N'Mattina 6 giorni', '07:00', '14:00', NULL, NULL, 20, 1);
END
IF NOT EXISTS (SELECT 1 FROM HrTurno WHERE StrutturaId=@StrutturaId AND Id=N'tur-p6')
BEGIN
  INSERT INTO HrTurno(StrutturaId, Id, Sigla, Nome, Inizio, Fine, Inizio2, Fine2, PausaMin, Colore)
  VALUES(@StrutturaId, N'tur-p6', N'P6', N'Pomeriggio 6 giorni', '15:00', '22:00', NULL, NULL, 20, 3);
END
IF NOT EXISTS (SELECT 1 FROM HrTurno WHERE StrutturaId=@StrutturaId AND Id=N'tur-co')
BEGIN
  INSERT INTO HrTurno(StrutturaId, Id, Sigla, Nome, Inizio, Fine, Inizio2, Fine2, PausaMin, Colore)
  VALUES(@StrutturaId, N'tur-co', N'CO', N'Colazioni', '06:00', '14:00', NULL, NULL, 30, 4);
  INSERT INTO HrTurnoReparto(StrutturaId, TurnoId, RepartoId) VALUES(@StrutturaId, N'tur-co', N'rep-fb');
  INSERT INTO HrTurnoReparto(StrutturaId, TurnoId, RepartoId) VALUES(@StrutturaId, N'tur-co', N'rep-cuc');
  INSERT INTO HrTurnoReparto(StrutturaId, TurnoId, RepartoId) VALUES(@StrutturaId, N'tur-co', N'rep-bar');
END
IF NOT EXISTS (SELECT 1 FROM HrTurno WHERE StrutturaId=@StrutturaId AND Id=N'tur-s')
BEGIN
  INSERT INTO HrTurno(StrutturaId, Id, Sigla, Nome, Inizio, Fine, Inizio2, Fine2, PausaMin, Colore)
  VALUES(@StrutturaId, N'tur-s', N'S', N'Spezzato pranzo e cena', '10:00', '14:00', '18:00', '22:00', 0, 5);
  INSERT INTO HrTurnoReparto(StrutturaId, TurnoId, RepartoId) VALUES(@StrutturaId, N'tur-s', N'rep-fb');
  INSERT INTO HrTurnoReparto(StrutturaId, TurnoId, RepartoId) VALUES(@StrutturaId, N'tur-s', N'rep-cuc');
  INSERT INTO HrTurnoReparto(StrutturaId, TurnoId, RepartoId) VALUES(@StrutturaId, N'tur-s', N'rep-bar');
END
IF NOT EXISTS (SELECT 1 FROM HrTurno WHERE StrutturaId=@StrutturaId AND Id=N'tur-ce')
BEGIN
  INSERT INTO HrTurno(StrutturaId, Id, Sigla, Nome, Inizio, Fine, Inizio2, Fine2, PausaMin, Colore)
  VALUES(@StrutturaId, N'tur-ce', N'CE', N'Cena', '16:00', '00:00', NULL, NULL, 30, 8);
  INSERT INTO HrTurnoReparto(StrutturaId, TurnoId, RepartoId) VALUES(@StrutturaId, N'tur-ce', N'rep-fb');
  INSERT INTO HrTurnoReparto(StrutturaId, TurnoId, RepartoId) VALUES(@StrutturaId, N'tur-ce', N'rep-cuc');
END
IF NOT EXISTS (SELECT 1 FROM HrTurno WHERE StrutturaId=@StrutturaId AND Id=N'tur-bs')
BEGIN
  INSERT INTO HrTurno(StrutturaId, Id, Sigla, Nome, Inizio, Fine, Inizio2, Fine2, PausaMin, Colore)
  VALUES(@StrutturaId, N'tur-bs', N'BS', N'Bar sera', '18:00', '02:00', NULL, NULL, 30, 8);
  INSERT INTO HrTurnoReparto(StrutturaId, TurnoId, RepartoId) VALUES(@StrutturaId, N'tur-bs', N'rep-bar');
END
IF NOT EXISTS (SELECT 1 FROM HrTurno WHERE StrutturaId=@StrutturaId AND Id=N'tur-c')
BEGIN
  INSERT INTO HrTurno(StrutturaId, Id, Sigla, Nome, Inizio, Fine, Inizio2, Fine2, PausaMin, Colore)
  VALUES(@StrutturaId, N'tur-c', N'C', N'Centrale', '09:00', '17:00', NULL, NULL, 60, 2);
  INSERT INTO HrTurnoReparto(StrutturaId, TurnoId, RepartoId) VALUES(@StrutturaId, N'tur-c', N'rep-hk');
  INSERT INTO HrTurnoReparto(StrutturaId, TurnoId, RepartoId) VALUES(@StrutturaId, N'tur-c', N'rep-lav');
  INSERT INTO HrTurnoReparto(StrutturaId, TurnoId, RepartoId) VALUES(@StrutturaId, N'tur-c', N'rep-mag');
  INSERT INTO HrTurnoReparto(StrutturaId, TurnoId, RepartoId) VALUES(@StrutturaId, N'tur-c', N'rep-amm');
  INSERT INTO HrTurnoReparto(StrutturaId, TurnoId, RepartoId) VALUES(@StrutturaId, N'tur-c', N'rep-man');
END
IF NOT EXISTS (SELECT 1 FROM HrTurno WHERE StrutturaId=@StrutturaId AND Id=N'tur-hk')
BEGIN
  INSERT INTO HrTurno(StrutturaId, Id, Sigla, Nome, Inizio, Fine, Inizio2, Fine2, PausaMin, Colore)
  VALUES(@StrutturaId, N'tur-hk', N'HK', N'Rifacimento camere', '08:00', '16:00', NULL, NULL, 30, 2);
  INSERT INTO HrTurnoReparto(StrutturaId, TurnoId, RepartoId) VALUES(@StrutturaId, N'tur-hk', N'rep-hk');
END
IF NOT EXISTS (SELECT 1 FROM HrTurno WHERE StrutturaId=@StrutturaId AND Id=N'tur-cv')
BEGIN
  INSERT INTO HrTurno(StrutturaId, Id, Sigla, Nome, Inizio, Fine, Inizio2, Fine2, PausaMin, Colore)
  VALUES(@StrutturaId, N'tur-cv', N'CV', N'Couverture serale', '17:00', '22:00', NULL, NULL, 0, 6);
  INSERT INTO HrTurnoReparto(StrutturaId, TurnoId, RepartoId) VALUES(@StrutturaId, N'tur-cv', N'rep-hk');
END
IF NOT EXISTS (SELECT 1 FROM HrTurno WHERE StrutturaId=@StrutturaId AND Id=N'tur-sm')
BEGIN
  INSERT INTO HrTurno(StrutturaId, Id, Sigla, Nome, Inizio, Fine, Inizio2, Fine2, PausaMin, Colore)
  VALUES(@StrutturaId, N'tur-sm', N'SM', N'Spa mattina', '09:00', '17:00', NULL, NULL, 30, 5);
  INSERT INTO HrTurnoReparto(StrutturaId, TurnoId, RepartoId) VALUES(@StrutturaId, N'tur-sm', N'rep-spa');
END
IF NOT EXISTS (SELECT 1 FROM HrTurno WHERE StrutturaId=@StrutturaId AND Id=N'tur-sp')
BEGIN
  INSERT INTO HrTurno(StrutturaId, Id, Sigla, Nome, Inizio, Fine, Inizio2, Fine2, PausaMin, Colore)
  VALUES(@StrutturaId, N'tur-sp', N'SP', N'Spa pomeriggio', '13:00', '21:00', NULL, NULL, 30, 7);
  INSERT INTO HrTurnoReparto(StrutturaId, TurnoId, RepartoId) VALUES(@StrutturaId, N'tur-sp', N'rep-spa');
END
IF NOT EXISTS (SELECT 1 FROM HrTurno WHERE StrutturaId=@StrutturaId AND Id=N'tur-u')
BEGIN
  INSERT INTO HrTurno(StrutturaId, Id, Sigla, Nome, Inizio, Fine, Inizio2, Fine2, PausaMin, Colore)
  VALUES(@StrutturaId, N'tur-u', N'U', N'Ufficio', '09:00', '13:00', '14:00', '18:00', 0, 1);
  INSERT INTO HrTurnoReparto(StrutturaId, TurnoId, RepartoId) VALUES(@StrutturaId, N'tur-u', N'rep-amm');
  INSERT INTO HrTurnoReparto(StrutturaId, TurnoId, RepartoId) VALUES(@StrutturaId, N'tur-u', N'rep-dir');
  INSERT INTO HrTurnoReparto(StrutturaId, TurnoId, RepartoId) VALUES(@StrutturaId, N'tur-u', N'rep-com');
END

-- Schemi di rotazione (TurnoId NULL = riposo)
IF NOT EXISTS (SELECT 1 FROM HrSchemaTurni WHERE StrutturaId=@StrutturaId AND Id=N'sch-cc')
BEGIN
  INSERT INTO HrSchemaTurni(StrutturaId, Id, Nome, Descrizione) VALUES(@StrutturaId, N'sch-cc', N'Ciclo continuo 3 turni', N'Due mattine, due pomeriggi, due notti, due riposi: copre le 24 ore del ricevimento.');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-cc', 0, N'tur-m');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-cc', 1, N'tur-m');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-cc', 2, N'tur-p');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-cc', 3, N'tur-p');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-cc', 4, N'tur-n');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-cc', 5, N'tur-n');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-cc', 6, NULL);
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-cc', 7, NULL);
END
IF NOT EXISTS (SELECT 1 FROM HrSchemaTurni WHERE StrutturaId=@StrutturaId AND Id=N'sch-61')
BEGIN
  INSERT INTO HrSchemaTurni(StrutturaId, Id, Nome, Descrizione) VALUES(@StrutturaId, N'sch-61', N'Rotazione 6+1 M/P', N'Settimana di mattine e settimana di pomeriggi alternate, un riposo a settimana.');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-61', 0, N'tur-m');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-61', 1, N'tur-m');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-61', 2, N'tur-m');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-61', 3, N'tur-m');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-61', 4, N'tur-m');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-61', 5, N'tur-m');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-61', 6, NULL);
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-61', 7, N'tur-p');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-61', 8, N'tur-p');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-61', 9, N'tur-p');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-61', 10, N'tur-p');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-61', 11, N'tur-p');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-61', 12, N'tur-p');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-61', 13, NULL);
END
IF NOT EXISTS (SELECT 1 FROM HrSchemaTurni WHERE StrutturaId=@StrutturaId AND Id=N'sch-52')
BEGIN
  INSERT INTO HrSchemaTurni(StrutturaId, Id, Nome, Descrizione) VALUES(@StrutturaId, N'sch-52', N'Centrale 5+2', N'Cinque giorni sul turno centrale, sabato e domenica di riposo.');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-52', 0, N'tur-c');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-52', 1, N'tur-c');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-52', 2, N'tur-c');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-52', 3, N'tur-c');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-52', 4, N'tur-c');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-52', 5, NULL);
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-52', 6, NULL);
END
IF NOT EXISTS (SELECT 1 FROM HrSchemaTurni WHERE StrutturaId=@StrutturaId AND Id=N'sch-fo52')
BEGIN
  INSERT INTO HrSchemaTurni(StrutturaId, Id, Nome, Descrizione) VALUES(@StrutturaId, N'sch-fo52', N'Ricevimento 5+2 M/I/P', N'Ricevimento senza notte: mattine, intermedio sui check-in e pomeriggi, due riposi consecutivi.');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-fo52', 0, N'tur-m');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-fo52', 1, N'tur-m');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-fo52', 2, N'tur-i');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-fo52', 3, N'tur-p');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-fo52', 4, N'tur-p');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-fo52', 5, NULL);
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-fo52', 6, NULL);
END
IF NOT EXISTS (SELECT 1 FROM HrSchemaTurni WHERE StrutturaId=@StrutturaId AND Id=N'sch-sala')
BEGIN
  INSERT INTO HrSchemaTurni(StrutturaId, Id, Nome, Descrizione) VALUES(@StrutturaId, N'sch-sala', N'Sala colazioni e cena', N'Due colazioni, uno spezzato, due cene, due riposi: alterna apertura e chiusura del ristorante.');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-sala', 0, N'tur-co');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-sala', 1, N'tur-co');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-sala', 2, N'tur-s');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-sala', 3, N'tur-ce');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-sala', 4, N'tur-ce');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-sala', 5, NULL);
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-sala', 6, NULL);
END
IF NOT EXISTS (SELECT 1 FROM HrSchemaTurni WHERE StrutturaId=@StrutturaId AND Id=N'sch-piani')
BEGIN
  INSERT INTO HrSchemaTurni(StrutturaId, Id, Nome, Descrizione) VALUES(@StrutturaId, N'sch-piani', N'Piani 5+2 con couverture', N'Quattro giorni di rifacimento camere e una couverture serale, due riposi.');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-piani', 0, N'tur-hk');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-piani', 1, N'tur-hk');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-piani', 2, N'tur-hk');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-piani', 3, N'tur-hk');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-piani', 4, N'tur-cv');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-piani', 5, NULL);
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-piani', 6, NULL);
END
IF NOT EXISTS (SELECT 1 FROM HrSchemaTurni WHERE StrutturaId=@StrutturaId AND Id=N'sch-6c')
BEGIN
  INSERT INTO HrSchemaTurni(StrutturaId, Id, Nome, Descrizione) VALUES(@StrutturaId, N'sch-6c', N'Turnista 6+1 a turni corti', N'Tre mattine e tre pomeriggi da 6 h 40, un riposo: 40 ore su 6 giorni.');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-6c', 0, N'tur-m6');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-6c', 1, N'tur-m6');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-6c', 2, N'tur-m6');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-6c', 3, N'tur-p6');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-6c', 4, N'tur-p6');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-6c', 5, N'tur-p6');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-6c', 6, NULL);
END
IF NOT EXISTS (SELECT 1 FROM HrSchemaTurni WHERE StrutturaId=@StrutturaId AND Id=N'sch-bar')
BEGIN
  INSERT INTO HrSchemaTurni(StrutturaId, Id, Nome, Descrizione) VALUES(@StrutturaId, N'sch-bar', N'Bar giorno e sera', N'Due colazioni, uno spezzato, due serate, due riposi.');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-bar', 0, N'tur-co');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-bar', 1, N'tur-co');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-bar', 2, N'tur-s');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-bar', 3, N'tur-bs');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-bar', 4, N'tur-bs');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-bar', 5, NULL);
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-bar', 6, NULL);
END
IF NOT EXISTS (SELECT 1 FROM HrSchemaTurni WHERE StrutturaId=@StrutturaId AND Id=N'sch-spa')
BEGIN
  INSERT INTO HrSchemaTurni(StrutturaId, Id, Nome, Descrizione) VALUES(@StrutturaId, N'sch-spa', N'Spa 5+2', N'Mattine e pomeriggi alternati sulla Spa, due riposi.');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-spa', 0, N'tur-sm');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-spa', 1, N'tur-sm');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-spa', 2, N'tur-sp');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-spa', 3, N'tur-sp');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-spa', 4, N'tur-sm');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-spa', 5, NULL);
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-spa', 6, NULL);
END
IF NOT EXISTS (SELECT 1 FROM HrSchemaTurni WHERE StrutturaId=@StrutturaId AND Id=N'sch-uff')
BEGIN
  INSERT INTO HrSchemaTurni(StrutturaId, Id, Nome, Descrizione) VALUES(@StrutturaId, N'sch-uff', N'Ufficio 5+2', N'Cinque giorni d''ufficio, sabato e domenica di riposo.');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-uff', 0, N'tur-u');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-uff', 1, N'tur-u');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-uff', 2, N'tur-u');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-uff', 3, N'tur-u');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-uff', 4, N'tur-u');
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-uff', 5, NULL);
  INSERT INTO HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId) VALUES(@StrutturaId, N'sch-uff', 6, NULL);
END

-- Regole di pianificazione
IF NOT EXISTS (SELECT 1 FROM HrPianificazione WHERE StrutturaId=@StrutturaId)
  INSERT INTO HrPianificazione(StrutturaId, CoperturaMinOre, RiposoMinOre, TolleranzaSottoOre, Version) VALUES(@StrutturaId, 3, 11, 4, 1);
IF NOT EXISTS (SELECT 1 FROM HrFasciaCopertura WHERE StrutturaId=@StrutturaId AND Id='M')
  INSERT INTO HrFasciaCopertura(StrutturaId, Id, Nome, Inizio, Fine, Attiva) VALUES(@StrutturaId, 'M', N'Mattina', '07:00', '15:00', 1);
IF NOT EXISTS (SELECT 1 FROM HrFasciaCopertura WHERE StrutturaId=@StrutturaId AND Id='P')
  INSERT INTO HrFasciaCopertura(StrutturaId, Id, Nome, Inizio, Fine, Attiva) VALUES(@StrutturaId, 'P', N'Pomeriggio', '15:00', '23:00', 1);
IF NOT EXISTS (SELECT 1 FROM HrFasciaCopertura WHERE StrutturaId=@StrutturaId AND Id='N')
  INSERT INTO HrFasciaCopertura(StrutturaId, Id, Nome, Inizio, Fine, Attiva) VALUES(@StrutturaId, 'N', N'Notte', '23:00', '07:00', 1);
IF NOT EXISTS (SELECT 1 FROM HrFabbisognoReparto WHERE StrutturaId=@StrutturaId AND RepartoId=N'rep-dir')
  INSERT INTO HrFabbisognoReparto(StrutturaId, RepartoId, Modalita, TurnoPredefinitoId, BaseM, BaseP, BaseN, RinforzoM, RinforzoP, RinforzoN, SogliaOccupazione, GiorniChiusura)
  VALUES(@StrutturaId, N'rep-dir', 'fisso', N'tur-u', 1, 0, 0, 0, 0, 0, 85, '5,6');
IF NOT EXISTS (SELECT 1 FROM HrFabbisognoReparto WHERE StrutturaId=@StrutturaId AND RepartoId=N'rep-fo')
  INSERT INTO HrFabbisognoReparto(StrutturaId, RepartoId, Modalita, TurnoPredefinitoId, BaseM, BaseP, BaseN, RinforzoM, RinforzoP, RinforzoN, SogliaOccupazione, GiorniChiusura)
  VALUES(@StrutturaId, N'rep-fo', 'occupazione', N'tur-m', 1, 1, 0, 1, 0, 0, 85, '');
IF NOT EXISTS (SELECT 1 FROM HrFabbisognoReparto WHERE StrutturaId=@StrutturaId AND RepartoId=N'rep-port')
  INSERT INTO HrFabbisognoReparto(StrutturaId, RepartoId, Modalita, TurnoPredefinitoId, BaseM, BaseP, BaseN, RinforzoM, RinforzoP, RinforzoN, SogliaOccupazione, GiorniChiusura)
  VALUES(@StrutturaId, N'rep-port', 'occupazione', N'tur-m', 1, 1, 0, 1, 0, 0, 85, '');
IF NOT EXISTS (SELECT 1 FROM HrFabbisognoReparto WHERE StrutturaId=@StrutturaId AND RepartoId=N'rep-hk')
  INSERT INTO HrFabbisognoReparto(StrutturaId, RepartoId, Modalita, TurnoPredefinitoId, BaseM, BaseP, BaseN, RinforzoM, RinforzoP, RinforzoN, SogliaOccupazione, GiorniChiusura)
  VALUES(@StrutturaId, N'rep-hk', 'occupazione', N'tur-hk', 1, 0, 0, 1, 0, 0, 85, '');
IF NOT EXISTS (SELECT 1 FROM HrFabbisognoReparto WHERE StrutturaId=@StrutturaId AND RepartoId=N'rep-lav')
  INSERT INTO HrFabbisognoReparto(StrutturaId, RepartoId, Modalita, TurnoPredefinitoId, BaseM, BaseP, BaseN, RinforzoM, RinforzoP, RinforzoN, SogliaOccupazione, GiorniChiusura)
  VALUES(@StrutturaId, N'rep-lav', 'occupazione', N'tur-c', 1, 0, 0, 1, 0, 0, 90, '6');
IF NOT EXISTS (SELECT 1 FROM HrFabbisognoReparto WHERE StrutturaId=@StrutturaId AND RepartoId=N'rep-fb')
  INSERT INTO HrFabbisognoReparto(StrutturaId, RepartoId, Modalita, TurnoPredefinitoId, BaseM, BaseP, BaseN, RinforzoM, RinforzoP, RinforzoN, SogliaOccupazione, GiorniChiusura)
  VALUES(@StrutturaId, N'rep-fb', 'occupazione', N'tur-s', 1, 1, 0, 0, 1, 0, 80, '');
IF NOT EXISTS (SELECT 1 FROM HrFabbisognoReparto WHERE StrutturaId=@StrutturaId AND RepartoId=N'rep-bar')
  INSERT INTO HrFabbisognoReparto(StrutturaId, RepartoId, Modalita, TurnoPredefinitoId, BaseM, BaseP, BaseN, RinforzoM, RinforzoP, RinforzoN, SogliaOccupazione, GiorniChiusura)
  VALUES(@StrutturaId, N'rep-bar', 'occupazione', N'tur-s', 1, 1, 0, 0, 1, 0, 80, '');
IF NOT EXISTS (SELECT 1 FROM HrFabbisognoReparto WHERE StrutturaId=@StrutturaId AND RepartoId=N'rep-cuc')
  INSERT INTO HrFabbisognoReparto(StrutturaId, RepartoId, Modalita, TurnoPredefinitoId, BaseM, BaseP, BaseN, RinforzoM, RinforzoP, RinforzoN, SogliaOccupazione, GiorniChiusura)
  VALUES(@StrutturaId, N'rep-cuc', 'occupazione', N'tur-s', 1, 1, 0, 0, 1, 0, 80, '');
IF NOT EXISTS (SELECT 1 FROM HrFabbisognoReparto WHERE StrutturaId=@StrutturaId AND RepartoId=N'rep-spa')
  INSERT INTO HrFabbisognoReparto(StrutturaId, RepartoId, Modalita, TurnoPredefinitoId, BaseM, BaseP, BaseN, RinforzoM, RinforzoP, RinforzoN, SogliaOccupazione, GiorniChiusura)
  VALUES(@StrutturaId, N'rep-spa', 'fisso', N'tur-sm', 1, 1, 0, 0, 0, 0, 85, '');
IF NOT EXISTS (SELECT 1 FROM HrFabbisognoReparto WHERE StrutturaId=@StrutturaId AND RepartoId=N'rep-man')
  INSERT INTO HrFabbisognoReparto(StrutturaId, RepartoId, Modalita, TurnoPredefinitoId, BaseM, BaseP, BaseN, RinforzoM, RinforzoP, RinforzoN, SogliaOccupazione, GiorniChiusura)
  VALUES(@StrutturaId, N'rep-man', 'fisso', N'tur-m', 1, 0, 0, 0, 0, 0, 85, '6');
IF NOT EXISTS (SELECT 1 FROM HrFabbisognoReparto WHERE StrutturaId=@StrutturaId AND RepartoId=N'rep-mag')
  INSERT INTO HrFabbisognoReparto(StrutturaId, RepartoId, Modalita, TurnoPredefinitoId, BaseM, BaseP, BaseN, RinforzoM, RinforzoP, RinforzoN, SogliaOccupazione, GiorniChiusura)
  VALUES(@StrutturaId, N'rep-mag', 'fisso', N'tur-c', 1, 0, 0, 0, 0, 0, 85, '5,6');
IF NOT EXISTS (SELECT 1 FROM HrFabbisognoReparto WHERE StrutturaId=@StrutturaId AND RepartoId=N'rep-amm')
  INSERT INTO HrFabbisognoReparto(StrutturaId, RepartoId, Modalita, TurnoPredefinitoId, BaseM, BaseP, BaseN, RinforzoM, RinforzoP, RinforzoN, SogliaOccupazione, GiorniChiusura)
  VALUES(@StrutturaId, N'rep-amm', 'fisso', N'tur-c', 1, 0, 0, 0, 0, 0, 85, '5,6');
IF NOT EXISTS (SELECT 1 FROM HrFabbisognoReparto WHERE StrutturaId=@StrutturaId AND RepartoId=N'rep-com')
  INSERT INTO HrFabbisognoReparto(StrutturaId, RepartoId, Modalita, TurnoPredefinitoId, BaseM, BaseP, BaseN, RinforzoM, RinforzoP, RinforzoN, SogliaOccupazione, GiorniChiusura)
  VALUES(@StrutturaId, N'rep-com', 'fisso', N'tur-u', 1, 0, 0, 0, 0, 0, 85, '5,6');

COMMIT;
