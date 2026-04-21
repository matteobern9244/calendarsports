

## Rimozione nota fonte palinsesto

### Modifica

In `src/pages/StreamingPage.tsx`, tab "TV stasera", rimuovere il paragrafo informativo che recita:

> "Fonte palinsesto: staseraintv.com (scraping pubblico). I dati possono variare o non essere disponibili per alcuni canali (es. Sky Sport non e' coperto dalla fonte)."

Si trova subito sopra l'`Accordion` dei canali, dentro il blocco `tvQuery.isSuccess && channels.length > 0`.

### File da modificare

| File | Modifica |
|---|---|
| `src/pages/StreamingPage.tsx` | Rimuovere il `<p className="text-xs text-muted-foreground italic">…</p>` con la nota sulla fonte palinsesto. |
| `changelog.md` | Voce sotto 2.1.0: "Streaming: rimossa nota informativa sulla fonte del palinsesto TV (scraping invariato lato edge function)." |

### Cosa NON cambia

- Logica di scraping in `supabase/functions/streaming-tv` (resta `staseraintv.com` + fallback `superguidatv.it`).
- Accordion canali, paginazione, selettore famiglia, default RAI.
- Versione resta **2.1.0**.

### Checklist post-edit

1. `/streaming?tab=tv` → la nota non compare più, l'accordion canali resta invariato.
2. `npm run lint` + `npm run build`.
3. Aggiornare `changelog.md`.
4. Lavorare su `develop`, PR verso `develop`, assegnare `@matteobern9244`.

