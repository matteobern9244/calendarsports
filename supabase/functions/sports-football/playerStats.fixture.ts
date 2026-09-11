/**
 * Ritagli **veri** delle schede atleta di Sky, presi l'11 settembre 2026.
 *
 * Sono due e non uno di proposito: la forma delle statistiche **cambia con il
 * ruolo**. Il portiere ha `SavesMade`, `Cleansheets`, `GoalsConceded` e
 * `PenaltiesSaved`, e **non ha** `Starts`, `Goals` ne' `Assists`. Un parser
 * scritto guardando solo un giocatore di movimento non fallirebbe sul portiere:
 * gli darebbe zero gol e zero presenze da titolare, che sembrano dati.
 *
 * Nel ritaglio resta solo il blocco JSON dentro il suo `<script>`: la pagina
 * vera pesa 460 KB e il resto non serve a nessun test.
 */

/** Alex Meret, portiere: tre presenze, 270 minuti, un clean sheet. */
export const PORTIERE_HTML = String.raw`<!doctype html><html><body>
<script type="application/json" data-props="true">{
  "dropdown": {
    "text": "Serie A",
    "links": [
      {
        "label": "Serie A",
        "isSelected": true
      },
      {
        "label": "Champions League",
        "isSelected": false
      },
      {
        "label": "Europei",
        "isSelected": false
      }
    ],
    "showSelected": true,
    "menuSize": "medium"
  },
  "subtitle": "STAGIONE 2026/2027",
  "statisticsMap": [
    {
      "seasonAndCompId": "2026#21",
      "customSeasonName": "2026/2027",
      "customCompetitionName": "Serie A",
      "items": [
        {
          "type": "stat",
          "id": "GamesPlayed",
          "value": 3
        },
        {
          "type": "stat",
          "id": "TimePlayed",
          "value": 270
        },
        {
          "type": "stat",
          "id": "SavesMade",
          "value": 11
        },
        {
          "type": "stat",
          "id": "Cleansheets",
          "value": 1
        },
        {
          "type": "chart",
          "charts": [
            {
              "id": "TotalPasses",
              "success": 64,
              "failure": 27
            }
          ]
        },
        {
          "type": "stat",
          "id": "GoalsConceded",
          "value": 5
        },
        {
          "type": "stat",
          "id": "PenaltiesSaved",
          "value": 0
        },
        {
          "type": "stat",
          "id": "YellowCards",
          "value": 0
        },
        {
          "type": "stat",
          "id": "TotalRedCards",
          "value": 0
        }
      ]
    },
    {
      "seasonAndCompId": "2026#5",
      "customSeasonName": "2026/2027",
      "customCompetitionName": "Champions League",
      "items": [
        {
          "type": "stat",
          "id": "GamesPlayed",
          "value": 1
        },
        {
          "type": "stat",
          "id": "TimePlayed",
          "value": 45
        },
        {
          "type": "stat",
          "id": "SavesMade",
          "value": 3
        },
        {
          "type": "stat",
          "id": "Cleansheets",
          "value": 0
        },
        {
          "type": "chart",
          "charts": [
            {
              "id": "TotalPasses",
              "success": 19,
              "failure": 7
            }
          ]
        },
        {
          "type": "stat",
          "id": "GoalsConceded",
          "value": 0
        },
        {
          "type": "stat",
          "id": "PenaltiesSaved",
          "value": 0
        },
        {
          "type": "stat",
          "id": "YellowCards",
          "value": 0
        },
        {
          "type": "stat",
          "id": "TotalRedCards",
          "value": 0
        }
      ]
    },
    {
      "seasonAndCompId": "2023#3",
      "customSeasonName": "2024",
      "customCompetitionName": "Europei",
      "items": [
        {
          "type": "stat",
          "id": "GamesPlayed",
          "value": 0
        },
        {
          "type": "stat",
          "id": "TimePlayed",
          "value": 0
        },
        {
          "type": "stat",
          "id": "SavesMade",
          "value": 0
        },
        {
          "type": "stat",
          "id": "Cleansheets",
          "value": 0
        },
        {
          "type": "chart",
          "charts": [
            {
              "id": "TotalPasses",
              "success": 0,
              "failure": 0
            }
          ]
        },
        {
          "type": "stat",
          "id": "GoalsConceded",
          "value": 0
        },
        {
          "type": "stat",
          "id": "PenaltiesSaved",
          "value": 0
        },
        {
          "type": "stat",
          "id": "YellowCards",
          "value": 0
        },
        {
          "type": "stat",
          "id": "TotalRedCards",
          "value": 0
        }
      ]
    }
  ],
  "statistics": {
    "playerId": "171366",
    "playerRole": "Goalkeeper",
    "items": [
      {
        "type": "stat",
        "id": "GamesPlayed",
        "value": 3
      },
      {
        "type": "stat",
        "id": "TimePlayed",
        "value": 270
      },
      {
        "type": "stat",
        "id": "SavesMade",
        "value": 11
      },
      {
        "type": "stat",
        "id": "Cleansheets",
        "value": 1
      },
      {
        "type": "chart",
        "charts": [
          {
            "id": "TotalPasses",
            "success": 64,
            "failure": 27
          }
        ]
      },
      {
        "type": "stat",
        "id": "GoalsConceded",
        "value": 5
      },
      {
        "type": "stat",
        "id": "PenaltiesSaved",
        "value": 0
      },
      {
        "type": "stat",
        "id": "YellowCards",
        "value": 0
      },
      {
        "type": "stat",
        "id": "TotalRedCards",
        "value": 0
      }
    ]
  }
}</script>
</body></html>`;

/** Amir Rrahmani, difensore: tre presenze da titolare, 165 passaggi riusciti. */
export const DIFENSORE_HTML = String.raw`<!doctype html><html><body>
<script type="application/json" data-props="true">{
  "dropdown": {
    "text": "Serie A",
    "links": [
      {
        "label": "Serie A",
        "isSelected": true
      },
      {
        "label": "Champions League",
        "isSelected": false
      }
    ],
    "showSelected": true,
    "menuSize": "medium"
  },
  "subtitle": "STAGIONE 2026/2027",
  "statisticsMap": [
    {
      "seasonAndCompId": "2026#21",
      "customSeasonName": "2026/2027",
      "customCompetitionName": "Serie A",
      "items": [
        {
          "type": "stat",
          "id": "GamesPlayed",
          "value": 3
        },
        {
          "type": "stat",
          "id": "Starts",
          "value": 3
        },
        {
          "type": "stat",
          "id": "Goals",
          "value": 0
        },
        {
          "type": "stat",
          "id": "TimePlayed",
          "value": 270
        },
        {
          "type": "stat",
          "id": "PenaltyGoals",
          "value": 0
        },
        {
          "type": "stat",
          "id": "Assists",
          "value": 0
        },
        {
          "type": "stat",
          "id": "TotalShots",
          "value": 1
        },
        {
          "type": "stat",
          "id": "KeyPasses",
          "value": 0
        },
        {
          "type": "chart",
          "charts": [
            {
              "id": "TotalPasses",
              "success": 165,
              "failure": 23
            },
            {
              "id": "TotalShots",
              "success": 0,
              "failure": 1
            },
            {
              "id": "Duels",
              "success": 25,
              "failure": 13
            }
          ]
        },
        {
          "type": "stat",
          "id": "Recoveries",
          "value": 10
        },
        {
          "type": "stat",
          "id": "TotalLossesOfPossession",
          "value": 27
        },
        {
          "type": "stat",
          "id": "TotalFoulsConceded",
          "value": 5
        },
        {
          "type": "stat",
          "id": "TotalFoulsWon",
          "value": 1
        },
        {
          "type": "stat",
          "id": "YellowCards",
          "value": 0
        },
        {
          "type": "stat",
          "id": "TotalRedCards",
          "value": 0
        }
      ]
    },
    {
      "seasonAndCompId": "2026#5",
      "customSeasonName": "2026/2027",
      "customCompetitionName": "Champions League",
      "items": [
        {
          "type": "stat",
          "id": "GamesPlayed",
          "value": 1
        },
        {
          "type": "stat",
          "id": "Starts",
          "value": 1
        },
        {
          "type": "stat",
          "id": "Goals",
          "value": 0
        },
        {
          "type": "stat",
          "id": "TimePlayed",
          "value": 90
        },
        {
          "type": "stat",
          "id": "PenaltyGoals",
          "value": 0
        },
        {
          "type": "stat",
          "id": "Assists",
          "value": 0
        },
        {
          "type": "stat",
          "id": "TotalShots",
          "value": 0
        },
        {
          "type": "stat",
          "id": "KeyPasses",
          "value": 0
        },
        {
          "type": "chart",
          "charts": [
            {
              "id": "TotalPasses",
              "success": 60,
              "failure": 5
            },
            {
              "id": "TotalShots",
              "success": 0,
              "failure": 0
            },
            {
              "id": "Duels",
              "success": 3,
              "failure": 1
            }
          ]
        },
        {
          "type": "stat",
          "id": "Recoveries",
          "value": 2
        },
        {
          "type": "stat",
          "id": "TotalLossesOfPossession",
          "value": 6
        },
        {
          "type": "stat",
          "id": "TotalFoulsConceded",
          "value": 0
        },
        {
          "type": "stat",
          "id": "TotalFoulsWon",
          "value": 1
        },
        {
          "type": "stat",
          "id": "YellowCards",
          "value": 0
        },
        {
          "type": "stat",
          "id": "TotalRedCards",
          "value": 0
        }
      ]
    }
  ],
  "statistics": {
    "playerId": "165196",
    "playerRole": "Defender",
    "items": [
      {
        "type": "stat",
        "id": "GamesPlayed",
        "value": 3
      },
      {
        "type": "stat",
        "id": "Starts",
        "value": 3
      },
      {
        "type": "stat",
        "id": "Goals",
        "value": 0
      },
      {
        "type": "stat",
        "id": "TimePlayed",
        "value": 270
      },
      {
        "type": "stat",
        "id": "PenaltyGoals",
        "value": 0
      },
      {
        "type": "stat",
        "id": "Assists",
        "value": 0
      },
      {
        "type": "stat",
        "id": "TotalShots",
        "value": 1
      },
      {
        "type": "stat",
        "id": "KeyPasses",
        "value": 0
      },
      {
        "type": "chart",
        "charts": [
          {
            "id": "TotalPasses",
            "success": 165,
            "failure": 23
          },
          {
            "id": "TotalShots",
            "success": 0,
            "failure": 1
          },
          {
            "id": "Duels",
            "success": 25,
            "failure": 13
          }
        ]
      },
      {
        "type": "stat",
        "id": "Recoveries",
        "value": 10
      },
      {
        "type": "stat",
        "id": "TotalLossesOfPossession",
        "value": 27
      },
      {
        "type": "stat",
        "id": "TotalFoulsConceded",
        "value": 5
      },
      {
        "type": "stat",
        "id": "TotalFoulsWon",
        "value": 1
      },
      {
        "type": "stat",
        "id": "YellowCards",
        "value": 0
      },
      {
        "type": "stat",
        "id": "TotalRedCards",
        "value": 0
      }
    ]
  }
}</script>
</body></html>`;

/** Una scheda che esiste ma non ha nessuna statistica pubblicata. */
export const SENZA_STATISTICHE_HTML = String.raw`<!doctype html><html><body>
<script type="application/json" data-props="true">{"subtitle":"STAGIONE 2026/2027","statisticsMap":[]}</script>
</body></html>`;

/** Una pagina che risponde ma non porta il blocco: la fonte ha cambiato forma. */
export const SENZA_BLOCCO_HTML = String.raw`<!doctype html><html><body><p>Atleta</p></body></html>`;
