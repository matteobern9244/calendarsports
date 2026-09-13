/**
 * Il modello del widget calendario di Sky, nella forma che la fonte pubblica
 * davvero.
 *
 * Le tre partite `PreMatch` e `FullTime` ricalcano il payload osservato il
 * 13 settembre 2026 sul widget della Serie A: prima del fischio d'inizio la
 * fonte scrive **`goal: 0`**, non `null`, ed e' il motivo per cui il punteggio
 * non puo' essere lasciato passare in base al solo «non e' finita».
 *
 * La partita in corso e' invece **sintetica, e va detto**: quel giorno, alla
 * mattina, non si giocava, quindi la forma del widget calendario durante i
 * novanta minuti non e' stata osservata. Il valore `SecondHalf` viene dalla
 * famiglia di widget del dettaglio (`matchDetail.fixture.ts`, dove compare come
 * `matchStatus`). Se la fonte dovesse restare ferma su `PreMatch` anche a
 * partita iniziata, il codice degrada senza mentire: nessun punteggio, e
 * l'etichetta «in corso» la decide l'orologio lato app.
 */
export const CALENDARIO_WIDGET = {
  competitionMatchList: [
    {
      round: 3,
      matchDayList: [
        {
          matchList: [
            {
              id: "2638147",
              date: "2026-09-05T16:00:00.000Z",
              status: "FullTime",
              link: "https://sport.sky.it/calcio/serie-a/partite/2026/giornata-3/inter-napoli",
              home: { name: "Inter", goal: 3, logoUrl: "https://static.sky.it/inter.png" },
              away: { name: "Napoli", goal: 2, logoUrl: "https://static.sky.it/napoli.png" },
            },
          ],
        },
      ],
    },
    {
      round: 4,
      matchDayList: [
        {
          matchList: [
            {
              id: "2638157",
              date: "2026-09-13T13:00:00.000Z",
              status: "PreMatch",
              link: "https://sport.sky.it/calcio/serie-a/partite/2026/giornata-4/napoli-lecce",
              // Lo zero prepartita: la fonte lo scrive, e non significa 0-0.
              home: { name: "Napoli", goal: 0, logoUrl: "https://static.sky.it/napoli.png" },
              away: { name: "Lecce", goal: 0, logoUrl: "https://static.sky.it/lecce.png" },
            },
            {
              id: "2638158",
              date: "2026-09-13T16:00:00.000Z",
              status: "SecondHalf", // sintetico: vedi il commento in testa al file
              link: "https://sport.sky.it/calcio/serie-a/partite/2026/giornata-4/lazio-napoli",
              home: { name: "Lazio", goal: 2, logoUrl: "https://static.sky.it/lazio.png" },
              away: { name: "Napoli", goal: 0, logoUrl: "https://static.sky.it/napoli.png" },
            },
          ],
        },
      ],
    },
  ],
};

/** Un torneo che la mappa statica non conosce: il nome esce dallo slug del link. */
export const CALENDARIO_TORNEO_IGNOTO = {
  competitionMatchList: [
    {
      round: 1,
      matchDayList: [
        {
          matchList: [
            {
              id: "9000001",
              date: "2027-01-05T19:00:00.000Z",
              status: "PreMatch",
              link: "https://sport.sky.it/calcio/supercoppa-italiana/partite/2027/finale/napoli-milan",
              home: { name: "Napoli", goal: 0 },
              away: { name: "Milan", goal: 0 },
            },
          ],
        },
      ],
    },
  ],
};
