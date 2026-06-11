// Canale globale fra le pagine (routing state-based, navigate passa solo la pagina).
//   pending → nuova prenotazione appena salvata (consumata dal tableau)
//   editing → prenotazione esistente da aprire in modifica in NuovaPrenotazione
export const bookingStore:{pending:any; editing:any}={pending:null, editing:null};
