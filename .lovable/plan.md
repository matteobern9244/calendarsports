

## Ottimizzazione caricamento immagini — SOLO compressione, zero modifiche visive

### Vincolo assoluto

**Nessuna immagine viene cambiata, ridisegnata, ritagliata o sostituita visivamente.** Si interviene solo su:
1. Compressione lossless/quasi-lossless dei file binari esistenti (stessi pixel, meno byte).
2. Attributi HTML `<img>` (`loading`, `decoding`, `width`, `height`, `fetchpriority`).
3. Hint browser (`preconnect`, `dns-prefetch`, `preload`).
4. Selezione dimensione corretta da CDN che già espone varianti (YouTube, TMDB) — l'immagine resta la stessa, cambia solo quale variante chiediamo al CDN.

Nessun resize aggressivo, nessuna conversione che alteri l'aspetto, nessun rinomina file, nessun nuovo asset grafico.

### Diagnosi (verificata)

Pesi attuali in `public/`:

| File | Peso | Uso |
|---|---|---|
| `logo-header.jpg` | 1.2 MB | Header (ogni pagina) |
| `og-image.jpg` | 1015 KB | meta OG |
| `favicon.png` | 736 KB | Favicon |
| `constructors-f1/audi.png` | 652 KB | Tabella costruttori F1 |
| `constructors-motogp/ktm.png` | 519 KB | Tabella costruttori MotoGP |
| altri loghi | 96-198 KB ciascuno | Tabelle |

Problemi codice:
- `Formula1Page.tsx`: foto piloti senza `loading="lazy"` né `decoding="async"` né `width`/`height`.
- `Header.tsx`: logo senza `decoding="async"` né `fetchpriority="high"`.
- `TeamLogo.tsx`: ha `loading="lazy"` ma manca `decoding="async"`.
- `index.html`: nessun `preconnect` per host esterni (flagcdn, ytimg, tmdb, supabase).
- `HighlightCard.tsx`: chiede a YouTube `hqdefault.jpg` (480×360) anche se la card mostra ~320px wide.
- `streaming-releases`: usa poster TMDB `w500` quando `w342` basterebbe.

### Soluzione (solo compressione + attributi)

#### A. Compressione lossless / quasi-lossless degli asset esistenti

Stessi file, stesso nome, stesse dimensioni in pixel, stesso aspetto visivo. Solo riduzione byte tramite re-encoding ottimizzato:

| File | Tool | Modalità | Risultato atteso |
|---|---|---|---|
| `logo-header.jpg` | `mozjpeg` / ImageMagick `-quality 85 -strip` | Quasi-lossless, mantiene 2064×512 | ~150-200 KB |
| `favicon.png` | `pngquant --quality=90-100` o `oxipng -o max` | Lossless o quasi, mantiene dimensione | ~60-80 KB |
| `og-image.jpg` | `mozjpeg -quality 85 -strip` | Quasi-lossless | ~200-300 KB |
| `constructors-f1/*.png` | `pngquant --quality=85-100` + `oxipng` | Lossless palette + zlib max | ~30-80 KB ciascuno |
| `constructors-motogp/*.png` | Idem | Idem | ~30-80 KB ciascuno |

**Garanzia visiva**: dimensioni in pixel invariate, qualità percepita identica (compressione mirata su metadata, zlib level, palette PNG, chroma subsampling JPEG quality 85+ — soglia indistinguibile a occhio nudo). Nessuna conversione WebP, nessun resize, nessun rinomina.

QA obbligatoria post-compressione: confronto visivo before/after di ogni file modificato per verificare che siano percettivamente identici.

#### B. Attributi `<img>` (zero impatto visivo)

Aggiungere a tutti i tag `<img>` esistenti:
- `loading="lazy"` (eccetto LCP above-the-fold: header logo, foto Sinner)
- `decoding="async"`
- `width` / `height` espliciti per evitare CLS

File toccati:
- `src/pages/Formula1Page.tsx` (foto piloti riga 108-113)
- `src/components/common/TeamLogo.tsx` (aggiungere `decoding="async"`)
- `src/components/highlights/HighlightCard.tsx` (aggiungere `decoding="async"`, `width`/`height`)
- `src/components/streaming/ReleaseDetailDialog.tsx` (aggiungere `decoding="async"`)
- `src/pages/StreamingPage.tsx` (poster: `decoding="async"`, `width`/`height`)
- `src/components/sinner/PlayerHeader.tsx` (aggiungere `decoding="async"`, `loading="eager"` perché LCP)
- `src/components/layout/Header.tsx` (aggiungere `decoding="async"`, `fetchpriority="high"` al logo — niente `<picture>`, niente WebP)
- `src/pages/MotoGPPage.tsx` (bandiere: `width={20} height={14}`)

#### C. `index.html`: hint browser

Aggiungere in `<head>`:
```html
<link rel="preconnect" href="https://flagcdn.com" crossorigin>
<link rel="preconnect" href="https://i.ytimg.com" crossorigin>
<link rel="preconnect" href="https://image.tmdb.org" crossorigin>
<link rel="preconnect" href="https://jxijruuclgskxlbqittk.supabase.co" crossorigin>
<link rel="dns-prefetch" href="https://upload.wikimedia.org">
<link rel="preload" as="image" href="/logo-header.jpg" fetchpriority="high">
```

#### D. CDN: chiedere la variante giusta (stessa immagine, dimensione corretta)

YouTube e TMDB espongono lo stesso poster/thumbnail in più dimensioni. Cambiare la variante richiesta non cambia l'immagine, riduce solo i byte trasferiti.

**`supabase/functions/highlights-youtube/index.ts`**: cambiare `thumbnailUrl` da `hqdefault.jpg` (480×360, ~30 KB) a `mqdefault.jpg` (320×180, ~12 KB). La card visualizza già a ~320px wide, quindi `mqdefault` è la dimensione naturale. Aggiungere `srcset` in `HighlightCard.tsx` per servire `hqdefault` su display retina (2x):
```tsx
srcSet={`${item.thumbnailUrl} 1x, ${item.thumbnailUrl.replace('mqdefault', 'hqdefault')} 2x`}
```

**`supabase/functions/streaming-releases/index.ts`**: in `normalizeItem`, se l'URL TMDB del poster contiene `/w500/` o `/original/`, sostituire con `/w342/`. Card mostra ~150-200px, dialog ~180px, quindi `w342` copre anche retina.

### File modificati

| File | Tipo | Modifica |
|---|---|---|
| `public/logo-header.jpg` | REPLACE | Compressione mozjpeg q85 (stesso pixel, stesso aspetto) |
| `public/favicon.png` | REPLACE | pngquant q90-100 + oxipng -o max (lossless) |
| `public/og-image.jpg` | REPLACE | Compressione mozjpeg q85 |
| `public/constructors-f1/*.png` | REPLACE | pngquant q85-100 + oxipng -o max |
| `public/constructors-motogp/*.png` | REPLACE | Idem |
| `index.html` | EDIT | preconnect/dns-prefetch + preload logo |
| `src/components/layout/Header.tsx` | EDIT | `decoding="async"` + `fetchpriority="high"` (niente `<picture>`, niente WebP) |
| `src/components/common/TeamLogo.tsx` | EDIT | Aggiungere `decoding="async"` |
| `src/components/highlights/HighlightCard.tsx` | EDIT | `decoding="async"`, `width`/`height`, `srcSet` 1x/2x |
| `src/components/sinner/PlayerHeader.tsx` | EDIT | `decoding="async"` |
| `src/components/streaming/ReleaseDetailDialog.tsx` | EDIT | `decoding="async"` su poster e cast |
| `src/pages/Formula1Page.tsx` | EDIT | Foto piloti: `loading="lazy"`, `decoding="async"`, `width={32} height={32}` |
| `src/pages/MotoGPPage.tsx` | EDIT | Bandiere: `width={20} height={14}` |
| `src/pages/StreamingPage.tsx` | EDIT | Poster: `decoding="async"`, `width`/`height` |
| `supabase/functions/highlights-youtube/index.ts` | EDIT | `thumbnailUrl` → `mqdefault.jpg` |
| `supabase/functions/streaming-releases/index.ts` | EDIT | `normalizeItem`: forzare `/w342/` sui poster |
| `changelog.md` | EDIT | `### Performance`: compressione asset + lazy/async + preconnect |
| `README.md` | EDIT | Sezione "Performance immagini": tutte le immagini sono solo ricompresse, mai sostituite |

### Cosa NON cambia (garanzie esplicite)

- **Nessuna immagine viene sostituita o ridisegnata**: stessi file, stessi nomi, stesse dimensioni in pixel, stesso aspetto visivo.
- **Nessuna conversione WebP / AVIF**: solo re-encoding nello stesso formato.
- **Nessun resize**: 2064×512 resta 2064×512, 512×512 resta 512×512.
- **Nessun nuovo file asset creato**.
- **Layout, hover, animazioni, colori, font**: invariati.
- API edge functions: schema invariato, cambia solo il contenuto della stringa URL nel campo `thumbnailUrl`/`poster`.
- Nessuna nuova dipendenza npm/Deno.
- Branch policy invariata.

### Risparmio atteso (solo compressione + variant CDN)

| Pagina | Prima | Dopo | Risparmio |
|---|---|---|---|
| Header (ogni pagina) | 1.2 MB | ~180 KB | -85% |
| Favicon | 736 KB | ~70 KB | -90% |
| F1 tab Costruttori | 850 KB | ~120 KB | -86% |
| MotoGP tab Costruttori | 1.1 MB | ~200 KB | -82% |
| Highlights (12 card) | ~360 KB | ~150 KB | -58% |
| Streaming releases (8-12 poster) | ~800 KB | ~480 KB | -40% |

### Validazione

1. `npm run lint`, `npm run build`, `npm run test`, `npm run check:italian`, `npm run check:tz-juventus`.
2. **QA visiva post-compressione**: confronto pixel-by-pixel (o visivo affiancato) di ogni file modificato in `public/`. Se anche uno solo mostra artefatti percepibili, ridurre la qualità (es. q90 invece di q85) e ricomprimere.
3. `ls -lah public/` mostra i file con peso ridotto.
4. Apertura preview, DevTools Network: header logo <200 KB, costruttori <100 KB ciascuno, highlights ~150 KB totali.
5. Verifica visiva su tutte le pagine: header, F1 costruttori, MotoGP costruttori, Highlights, Streaming → identico a prima della modifica.

### Checklist post-edit

1. Tutti gli asset in `public/` ricompressi, verificati visivamente identici.
2. Nessun file rinominato, nessun nuovo file asset.
3. Tutti i `<img>` hanno `loading`, `decoding`, dimensioni esplicite.
4. `index.html` include preconnect + preload logo.
5. YouTube → `mqdefault` con `srcset` 2x → `hqdefault`.
6. TMDB poster → `w342`.
7. `changelog.md` e `README.md` aggiornati con la nota "solo compressione, mai sostituzione visiva".
8. Branch `develop`, PR verso `develop`, assegnata `@matteobern9244`.

