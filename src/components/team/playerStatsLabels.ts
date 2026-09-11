/**
 * Come si chiamano in italiano le statistiche che Sky pubblica in inglese.
 *
 * ## L'ordine e' il contenuto
 *
 * L'elenco e' **ordinato**, e l'ordine e' quello in cui si leggono: prima
 * quanto ha giocato, poi cosa ha prodotto, poi cosa ha subito. La fonte le
 * consegna gia' in un ordine sensato, ma ne consegna di diversi per ruolo, e
 * affidarsi al suo renderebbe la pagina diversa da giocatore a giocatore.
 *
 * ## Cosa succede a una voce che non e' qui
 *
 * **Non viene mostrata.** E' una scelta, e ha un costo da conoscere: se Sky
 * aggiungesse `ExpectedGoals`, comparirebbe nel dato e non sullo schermo
 * finche' qualcuno non aggiunge una riga a questo file. L'alternativa —
 * mostrare l'identificatore grezzo — metterebbe parole inglesi in una
 * interfaccia italiana, e la regola della lingua non ha eccezioni per i dati
 * che non conosciamo.
 *
 * L'elenco viene dalle due forme osservate dal vivo l'11 settembre 2026, un
 * portiere e un giocatore di movimento. Sono insiemi **disgiunti** in parte:
 * nessun giocatore le ha tutte.
 */
export const ETICHETTE_STATISTICHE: { id: string; label: string }[] = [
  { id: "GamesPlayed", label: "Presenze" },
  { id: "Starts", label: "Da titolare" },
  { id: "TimePlayed", label: "Minuti" },
  { id: "Goals", label: "Gol" },
  { id: "PenaltyGoals", label: "Rigori segnati" },
  { id: "Assists", label: "Assist" },
  { id: "TotalShots", label: "Tiri" },
  { id: "KeyPasses", label: "Passaggi chiave" },
  { id: "Recoveries", label: "Palloni recuperati" },
  { id: "TotalLossesOfPossession", label: "Palloni persi" },
  // Da qui in giu' le voci del portiere.
  { id: "SavesMade", label: "Parate" },
  { id: "Cleansheets", label: "Porte inviolate" },
  { id: "GoalsConceded", label: "Gol subiti" },
  { id: "PenaltiesSaved", label: "Rigori parati" },
  // E infine la disciplina, per tutti.
  { id: "TotalFoulsWon", label: "Falli subiti" },
  { id: "TotalFoulsConceded", label: "Falli commessi" },
  { id: "YellowCards", label: "Ammonizioni" },
  { id: "TotalRedCards", label: "Espulsioni" },
];

/**
 * Le coppie riuscito/sbagliato. Restano coppie: 165 passaggi riusciti su 188
 * e 165 su 400 sono due partite diverse, e un totale solo le confonderebbe.
 */
export const ETICHETTE_GRAFICI: Record<string, string> = {
  TotalPasses: "Passaggi",
  TotalShots: "Tiri",
  Duels: "Duelli",
};
