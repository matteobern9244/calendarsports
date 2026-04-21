

## Foto piloti mancanti + formato "Nome Cognome" completo

### Problema

1. **MotoGP**: alcuni piloti (es. "Pirro M.") non hanno foto perché la mappa `MOTOGP_RIDER_PHOTOS_BY_SURNAME` in `supabase/functions/sports-motogp/index.ts` copre solo i titolari principali. Wildcard / sostituti / collaudatori non sono mappati.
2. **Formato nome**: Sky Sport restituisce i nomi nel formato "Cognome I." (es. "Pirro M.", "Bagnaia F."). L'utente vuole vedere "Nome Cognome" completo (es. "Michele Pirro", "Francesco Bagnaia") per tutti i piloti, sia MotoGP che F1.

### Approccio

#### MotoGP (`supabase/functions/sports-motogp/index.ts`)

1. **Estendere `MOTOGP_RIDER_PHOTOS_BY_SURNAME`** con i piloti wildcard / sostituti mancanti (Pirro, Savadori, Pedrosa, Crutchlow, Bradl, Fernandez A., e altri che possono comparire come wildcard nel 2026). Foto da MotoGP.com / Wikipedia (URL stabili).
2. **Aggiungere mappa `MOTOGP_RIDER_FULL_NAMES`**: dizionario `{ "surname-initial": "Nome Cognome" }` per espandere "Pirro M." → "Michele Pirro", "Bagnaia F." → "Francesco Bagnaia", ecc. Coprire tutti i piloti già presenti in `MOTOGP_RIDER_PHOTOS_BY_SURNAME` + wildcard aggiunti.
3. **Nuova funzione `expandRiderName(skyName: string): string`**: lookup nella mappa, fallback al nome originale di Sky se non trovato (così non perdiamo dati).
4. In `fetchSkyStandings`, applicare `expandRiderName` al campo `name` prima di restituirlo.

#### Formula 1 (`supabase/functions/sports-f1/index.ts`)

Verificare il formato attuale del nome restituito da Jolpica/Ergast nell'azione `driver-standings`. Ergast normalmente restituisce `givenName` + `familyName` separati, quindi probabilmente già concatenati come "Nome Cognome". Se è già così, **nessuna modifica**. Se invece è troncato, applicare lo stesso schema (mappa o concatenazione `givenName + familyName`).

→ Verificherò il file in fase implementativa: se la concatenazione è già corretta, scriverò nel changelog "F1: formato nome già corretto, nessuna modifica".

### File da modificare

| File | Modifica |
|---|---|
| `supabase/functions/sports-motogp/index.ts` | Estendere `MOTOGP_RIDER_PHOTOS_BY_SURNAME` con wildcard mancanti; aggiungere mappa `MOTOGP_RIDER_FULL_NAMES` e funzione `expandRiderName`; applicarla in `fetchSkyStandings`. |
| `supabase/functions/sports-f1/index.ts` | Solo se il nome non è già "Nome Cognome": forzare concatenazione `givenName + familyName`. |
| `changelog.md` | Voce sotto 2.1.0: "MotoGP: aggiunte foto wildcard/sostituti e nomi piloti completi 'Nome Cognome'. F1: verificato/normalizzato formato nome." |

### Cosa NON cambia

- Logica di scraping Sky Sport, calendario statico 2026, mapping team/costruttori.
- Layout tabella, ordine colonne, classifiche.
- Versione resta **2.1.0**.

### Note di fragilità

- I dati Sky possono cambiare formato senza preavviso. La mappa `expandRiderName` ha fallback al nome originale, quindi nessun pilota sparisce se il mapping manca.
- Le foto wildcard sono URL pubblici Wikipedia/MotoGP.com: se un URL si rompe, comparirà l'icona `User` come oggi.

### Checklist post-edit

1. `/motogp` tab "Classifica Piloti" → tutti i piloti hanno foto (o icona placeholder) e nome completo "Nome Cognome".
2. `/formula1` tab "Classifica Piloti" → nomi nel formato "Nome Cognome" (probabilmente già corretto).
3. `npm run lint` + `npm run build`.
4. Aggiornare `changelog.md`.
5. Lavorare su `develop`, PR verso `develop`, assegnare `@matteobern9244`.

