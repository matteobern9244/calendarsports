/**
 * Arricchimento dei titoli del palinsesto TV.
 *
 * Vive fuori da `index.ts` perche' quel file chiama `Deno.serve` a livello di
 * modulo: importarlo da un test farebbe partire un server. Finche' la
 * funzione stava li', il test la ricopiava a mano e lo dichiarava nel
 * commento in testa ("una divergenza tra questa copia e la funzione live
 * passa inosservata in CI").
 */

export type RichTitle = { title: string; hh?: number; mm?: number };

// Normalizza per match tollerante: minuscolo, rimuove punteggiatura,
// collassa spazi, rimuove articoli/parole comuni di poco valore.
function normForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function enrichTitle(
  rawUpper: string,
  rich: RichTitle[],
  rawHh?: number,
  rawMm?: number,
): { title: string; genre?: string } {
  if (!rawUpper) return { title: rawUpper };
  const norm = normForMatch(rawUpper);
  const normTokens = norm.split(" ").filter(Boolean);
  // Cerca un titolo "ricco" che condivida un prefisso significativo (>=3 parole
  // o >=15 char) con la riga grezza, ignorando trattini e punteggiatura.
  // Es. raw "Roberta Valente - Notaio in Sorrento - S1E3" matcha rich
  // "Roberta Valente Notaio in Sorrento - Stagione 1 Episodio 3 (Fiction)".
  let best = "";
  for (const cand of rich) {
    const candNorm = normForMatch(cand.title);
    const candTokens = candNorm.split(" ").filter(Boolean);
    // Trova lunghezza prefisso comune di token.
    let common = 0;
    const lim = Math.min(normTokens.length, candTokens.length);
    while (common < lim && normTokens[common] === candTokens[common]) common += 1;
    const commonChars = candTokens.slice(0, common).join(" ").length;
    if ((common >= 3 || commonChars >= 15) && cand.title.length > best.length) {
      best = cand.title;
    }
  }
  // Fallback (NUOVO): se nessun prefisso ha matchato e abbiamo l'orario della
  // Fallback per placeholder generici (EV-SP/EV-CN/EV-FILM/EV-TV): scoring
  // deterministico che combina vincolo di genere atteso e distanza temporale
  // dal raw. Evita associazioni spurie quando lo stesso canale ha piu' eventi
  // sequenziali col placeholder identico (es. partita 20:40 + highlights 23:00,
  // entrambi "(Sport)"): vince quello col genere giusto piu' vicino in tempo.
  // NOTA: per estendere a nuovi placeholder o nuovi generi, aggiornare
  // PLACEHOLDER_TO_GENRE qui sotto.
  const PLACEHOLDER_TO_GENRE: Record<string, string[]> = {
    "EV-SP": [
      "Sport",
      "Calcio",
      "Tennis",
      "Motori",
      "Basket",
      "Pallavolo",
      "Pallacanestro",
      "Rugby",
      "Volley",
      "Nuoto",
      "Ciclismo",
    ],
    "EV-CN": ["Film", "Cinema"],
    "EV-FILM": ["Film", "Cinema"],
    "EV-TV": ["Fiction", "Serie Tv", "Telefilm", "Miniserie"],
  };
  const placeholder = rawUpper.toUpperCase().replace(/\s+/g, "").trim();
  const wanted = PLACEHOLDER_TO_GENRE[placeholder];
  if (!best && wanted) {
    let bestScore = -Infinity;
    let phBest = "";
    for (const cand of rich) {
      const mm = cand.title.match(/\(([^()]{2,40})\)\s*$/);
      if (!mm) continue;
      const genreCanon = mm[1]
        .trim()
        .toLowerCase()
        .replace(/(^|\s)(\p{L})/gu, (_, p, c) => p + c.toUpperCase());
      if (!wanted.includes(genreCanon)) continue;
      // Score: bonus orario esatto (+1000), penalita' distanza minuti (clamp
      // 720 = 12h per evitare overflow su gap notte/mattina), tiebreaker
      // lengthBonus capped a +1.0 (molto < di 1 minuto di distanza).
      let score = 0;
      if (
        rawHh !== undefined &&
        rawMm !== undefined &&
        cand.hh !== undefined &&
        cand.mm !== undefined
      ) {
        const distance = Math.min(720, Math.abs(cand.hh * 60 + cand.mm - rawHh * 60 - rawMm));
        if (distance === 0) score += 1000;
        score -= distance;
      }
      score += Math.min(cand.title.length, 100) * 0.01;
      if (score > bestScore) {
        bestScore = score;
        phBest = cand.title;
      }
    }
    if (phBest) best = phBest;
  }
  // Safety net: se nessun candidato del genere atteso e' stato trovato (o il
  // raw non e' un placeholder noto), prova match per orario esatto puro
  // (comportamento pre-scoring preservato per non-placeholder e per casi
  // limite tipo "Atletica" non in PLACEHOLDER_TO_GENRE).
  if (!best && rawHh !== undefined && rawMm !== undefined) {
    let timeBest = "";
    for (const cand of rich) {
      if (cand.hh !== rawHh || cand.mm !== rawMm) continue;
      if (cand.title.length > timeBest.length) timeBest = cand.title;
    }
    if (timeBest) best = timeBest;
  }
  const source =
    best ||
    rawUpper.toLowerCase().replace(/(^|[\s\-:'"(])(\p{L})/gu, (_, p, c) => p + c.toUpperCase());

  // Estrai genere fra parentesi a fine titolo: "... (Fiction)" / "(Film)" / "(Sport)".
  // Whitelist generi noti per evitare di confondere parentesi descrittive
  // (es. "(Replica)", "(2023)").
  const GENRE_WHITELIST = new Set([
    "Fiction",
    "Film",
    "Serie",
    "Serie Tv",
    "Serie Tv Drammatica",
    "Telefilm",
    "Miniserie",
    "Soap Opera",
    "Soap",
    "Sport",
    "Calcio",
    "Tennis",
    "Motori",
    "Formula 1",
    "Motogp",
    "Ciclismo",
    "Basket",
    "Pallavolo",
    "Pallacanestro",
    "Rugby",
    "Volley",
    "Nuoto",
    "Documentario",
    "Reality",
    "Talk Show",
    "Talkshow",
    "Show",
    "Varieta'",
    "Varieta",
    "Intrattenimento",
    "Cartoni",
    "Cartoni Animati",
    "Animazione",
    "News",
    "Telegiornale",
    "Attualita'",
    "Attualita",
    "Rubrica",
    "Magazine",
    "Approfondimento",
    "Inchiesta",
    "Meteo",
    "Cucina",
    "Lifestyle",
    "Musica",
    "Quiz",
    "Cinema",
    "Game Show",
    "Commedia",
    "Azione",
    "Thriller",
    "Avventura",
    "Horror",
    "Romantico",
    "Drammatico",
    "Biografico",
    "Storico",
    "Western",
    "Fantascienza",
    "Religione",
    "Educativo",
    "Cultura",
    "Viaggi",
  ]);
  // Normalizza varianti note in forma canonica.
  const GENRE_ALIASES: Record<string, string> = {
    Talkshow: "Talk Show",
    Varieta: "Varieta'",
  };
  const tryExtractGenre = (s: string): { stripped: string; genre?: string } => {
    const mm = s.match(/\s*\(([^()]{2,40})\)\s*$/);
    if (!mm) return { stripped: s };
    const candidate = mm[1].trim();
    const candidateNorm = candidate
      .toLowerCase()
      .replace(/(^|\s)(\p{L})/gu, (_, p, c) => p + c.toUpperCase());
    if (GENRE_WHITELIST.has(candidateNorm)) {
      const canonical = GENRE_ALIASES[candidateNorm] ?? candidateNorm;
      return { stripped: s.slice(0, mm.index).trim(), genre: canonical };
    }
    return { stripped: s };
  };
  // 1) Tenta sul titolo "ricco" (es. "Racconto di una notte ... (Fiction)").
  let { stripped: title, genre } = tryExtractGenre(source);
  // 2) Fallback: tenta direttamente sul raw uppercase quando il rich block
  // non ha una parentesi finale (es. la riga grezza "RACCONTO ... (FICTION)").
  if (!genre) {
    const rawTry = tryExtractGenre(rawUpper);
    if (rawTry.genre) {
      genre = rawTry.genre;
      // Se il raw conteneva il genere ma il rich no, mantieni il rich come
      // titolo (gia' senza parentesi) o usa il raw strippato se non c'e'
      // alcun rich match.
      if (!best)
        title = rawTry.stripped
          .toLowerCase()
          .replace(/(^|[\s\-:'"(])(\p{L})/gu, (_, p, c) => p + c.toUpperCase());
    }
  }
  return { title, genre };
}
