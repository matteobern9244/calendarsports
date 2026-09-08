# Utenti e profilo con preferenze

Aggiungere account utente all'applicazione, mantenendo intatta l'esperienza attuale per chi non accede.

## Cosa vedrà l'utente

1. **Nuova pagina "Accedi"** (`/accedi`), raggiungibile da una voce nel menu.
   - Registrazione e accesso con email e password.
   - Pulsanti "Continua con Google" e "Continua con Apple" (gestiti da Lovable Cloud).
   - Recupero password con pagina dedicata per impostare la nuova password.
   - Tutta l'interfaccia in italiano.
2. **Profilo utente**, modificabile dal pannello Preferenze già esistente, che salva online:
   - tema dell'applicazione (predefinito: scuro);
   - squadra di calcio preferita (predefinito: Juventus) — per ora solo un valore salvato, non cambia i dati mostrati;
   - tre interruttori per abilitare Jannik Sinner, Formula 1 e MotoGP (predefinito: attivi).
3. **Sezioni disattivate**: la voce sparisce dal menu, la relativa pagina rimanda alla Home e i suoi eventi spariscono dal Calendario (e dai riquadri di Home collegati).
4. **Primo accesso**: le scelte già presenti sul dispositivo (tema, filtri del calendario) vengono trasferite nel profilo appena creato; dai successivi accessi vale sempre il profilo.
5. **Senza accesso**: nulla cambia rispetto a oggi — tutte le sezioni visibili, preferenze salvate solo sul dispositivo.

## Come funziona (parte tecnica)

**Backend (Lovable Cloud)**

- Tabella `public.profiles`: `id` (uguale all'utente), `display_name`, `theme` (`dark` predefinito), `favorite_team` (`Juventus` predefinito), `show_sinner` / `show_f1` / `show_motogp` (`true` predefiniti), `created_at`, `updated_at`.
- `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated` e `GRANT ALL ... TO service_role`, poi RLS attiva con policy limitate a `auth.uid() = id`. Nessun accesso `anon`.
- Trigger su nuovo utente che crea il profilo con i valori predefiniti; trigger `updated_at`.
- Attivazione dei provider Google e Apple gestiti (strumento Configure Social Login) nello stesso intervento in cui viene aggiunto il codice, mantenendo attivo l'accesso email.
- Conferma email: comportamento predefinito di Cloud (l'utente conferma via email prima di essere autenticato); da confermare se si preferisce l'accesso immediato.

**Frontend**

- `src/lib/supabaseClient.ts` resta l'unico punto di import del client (regola ESLint esistente); OAuth tramite `lovable.auth.signInWithOAuth` con `redirect_uri: window.location.origin`.
- Nuovo `src/contexts/AuthContext.tsx` + `useAuth`: ascolta `onAuthStateChange`, espone sessione e utente.
- Nuovo hook `src/hooks/useProfile.ts` (React Query) per lettura e aggiornamento del profilo.
- Nuovo `src/hooks/useUserPreferences.ts`: sorgente unica delle preferenze — profilo se autenticato, `localStorage` altrimenti. Le chiavi esistenti (`cse-theme`, filtri del Calendario) restano il fallback locale e vengono migrate al primo accesso.
- `useTheme` legge il tema da questa sorgente unica, senza cambiare lo script anti-FOUC in `index.html`.
- `Header.tsx`: filtro delle voci di menu in base alle sezioni abilitate, più voce "Accedi" / area account.
- `App.tsx`: nuove route `/accedi` e `/reimposta-password`; guardia leggera sulle pagine disabilitate che rimanda alla Home.
- `useCalendarEvents.ts` e la legenda del Calendario rispettano le sezioni disattivate.
- `PreferencesPanel.tsx`: nuovo blocco profilo (squadra preferita, sezioni, uscita dall'account) visibile solo da autenticati.

**Verifiche**

- Test unitari per la fusione preferenze locali/profilo e per il filtro delle sezioni (menu e calendario).
- Gate `bun run verify` (typecheck, lint, guardiano lingua e fuso, test, build) e `bun run test:e2e` per la navigazione, incluso il percorso da non autenticato.
- Aggiornamento di `changelog.md`, `README.md` e della documentazione in `docs/` toccata (architettura, sicurezza), con nuova versione minore.
