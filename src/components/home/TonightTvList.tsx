import { Fragment, useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  ExternalLink,
  Film,
  Info,
  Radio,
  Trophy,
  Tv,
  Tv2,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  STREAMING_FAMILIES,
  type TvFamilyPayload,
} from "@/hooks/useStreamingData";
import { streamingApi, type StreamingFamilyId } from "@/lib/api/sportsApi";
import { formatDuration, formatDurationSpoken, toRomeDate } from "@/lib/dateUtils";
import { inferGenre } from "@/lib/genreUtils";

// Pittogrammi per famiglia: scelti per evocare l'identita' del broadcaster
// senza dipendere da loghi proprietari (Radio = RAI servizio pubblico,
// Tv = Mediaset generalista, Trophy = Sky Sport, Film = Sky Cinema,
// Compass = Discovery / esplorazione).
const FAMILY_ICONS: Record<StreamingFamilyId, LucideIcon> = {
  rai: Radio,
  mediaset: Tv,
  "sky-sport": Trophy,
  "sky-cinema": Film,
  discovery: Compass,
};

/**
 * Pagine ufficiali della guida TV per famiglia. Usate come fonte esterna
 * di fallback quando il palinsesto restituito dalle Edge Functions e'
 * incompleto (programmi senza orario di fine), in modo che l'utente
 * possa sempre verificare la programmazione reale sul sito ufficiale.
 */
const FAMILY_EPG_URLS: Record<StreamingFamilyId, { url: string; label: string }> = {
  rai: { url: "https://www.rai.it/guidatv/", label: "Apri Guida TV RAI" },
  mediaset: {
    url: "https://www.mediasetinfinity.mediaset.it/guidatv",
    label: "Apri Guida TV Mediaset",
  },
  "sky-sport": { url: "https://guidatv.sky.it/", label: "Apri Guida TV Sky" },
  "sky-cinema": { url: "https://guidatv.sky.it/", label: "Apri Guida TV Sky" },
  discovery: {
    url: "https://www.discoveryplus.com/it/guida-tv",
    label: "Apri Guida TV Discovery",
  },
};

interface TvHighlight {
  family: StreamingFamilyId;
  channel: string;
  channelNumber?: number;
  time: string;
  startMs: number;
  durationMin: number;
  hourRome: number;
  minuteRome: number;
  /**
   * Minuti totali dalla mezzanotte Europe/Rome dell'orario di fine
   * programma. Per programmi che attraversano la mezzanotte (es. start
   * 23:30, end 01:15) viene normalizzato aggiungendo 24*60 in modo che
   * `endMinutesFromMidnight > startMinutes` sia sempre vero. Cosi' il
   * test di overlap con la finestra di prima serata e' un semplice
   * confronto numerico, senza casi speciali per il wrap.
   */
  endMinutesFromMidnight: number;
  /**
   * `true` quando la fonte ha fornito un orario di fine reale per il
   * programma. Quando `false` significa che `endMinutesFromMidnight` e
   * `durationMin` sono solo stime: il programma viene mostrato per
   * trasparenza ma annotato come "dati incompleti" e indirizzato alla
   * Guida TV ufficiale.
   */
  hasExplicitEnd: boolean;
  title: string;
  genre?: string;
}

type FilterValue = "all" | StreamingFamilyId;

const TV_PAGE_SIZE = 8;

// Prima serata italiana: dalle 21:00 incluse alle 22:59 incluse.
// I programmi che iniziano alle 23:00 o dopo appartengono alla
// seconda serata e non devono comparire nella scheda Home.
const PRIME_TIME_START_MIN = 21 * 60;       // 21:00
const PRIME_TIME_END_EXCLUSIVE_MIN = 23 * 60; // 23:00 (escluso)

/**
 * Scheda "Stasera in TV" della Home: aggrega i palinsesti delle 5 famiglie
 * (RAI, Mediaset, Sky Sport, Sky Cinema, Discovery), filtra per prima serata
 * e mostra il programma principale per canale con filtri rapidi e
 * paginazione interna. Tutta la logica e' incapsulata qui per non far
 * crescere ulteriormente Index.tsx.
 */
export default function TonightTvList() {
  const [familyFilter, setFamilyFilter] = useState<FilterValue>("all");
  const [tvPage, setTvPage] = useState(0);

  // Fetch parallelo di tutte le 5 famiglie TV
  const tvQueries = useQueries({
    queries: STREAMING_FAMILIES.map((f) => ({
      queryKey: ["streaming-tv", f.id],
      queryFn: () => streamingApi.getTvByFamily(f.id),
      staleTime: 15 * 60 * 1000,
    })),
  });

  // Aggrega tutti i programmi reali da tutte le famiglie con etichetta family
  const allHighlights = useMemo<TvHighlight[]>(() => {
    const rows: TvHighlight[] = [];
    const timeFmt = new Intl.DateTimeFormat("it-IT", {
      timeZone: "Europe/Rome",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    tvQueries.forEach((q, idx) => {
      const fam = STREAMING_FAMILIES[idx].id;
      const data = q.data as TvFamilyPayload | undefined;
      if (!data?.programsAvailable) return;
      for (const ch of data.channels ?? []) {
        // In home limitiamo le famiglie ai canali principali per non
        // saturare la scheda Stasera in TV.
        if (fam === "rai" && ch.id !== "rai-1" && ch.id !== "rai-2") continue;
        if (fam === "mediaset" && ch.id !== "canale-5" && ch.id !== "italia-1") continue;
        for (const p of ch.programs) {
          const d = new Date(p.start);
          const hhmm = timeFmt.format(d);
          const [hStr, mStr] = hhmm.split(":");
          const hasExplicitEnd = Boolean(p.end);
          // Quando la fonte non fornisce l'orario di fine assumiamo una
          // durata "open-ended" pari alla finestra di prima serata: il
          // programma e' candidato per la visualizzazione purche' parta
          // prima delle 23:00 (vedi overlapsPrimeWindow piu' in basso).
          // La durata mostrata in cella resta pero' 0 cosi' l'utente non
          // legge una durata inventata.
          const endMs = hasExplicitEnd
            ? new Date(p.end).getTime()
            : d.getTime() + 24 * 60 * 60 * 1000; // sentinel "fine ignota"
          const durationMin = hasExplicitEnd
            ? Math.max(0, Math.round((endMs - d.getTime()) / 60000))
            : 0;
          const endHHMM = timeFmt.format(new Date(endMs));
          const [endHStr, endMStr] = endHHMM.split(":");
          const startMinutes = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
          let endMinutesFromMidnight = parseInt(endHStr, 10) * 60 + parseInt(endMStr, 10);
          // Normalizza il wrap dopo mezzanotte: se la fine cade lo stesso
          // giorno o prima dell'inizio (es. start 23:30, end 01:15)
          // aggiungiamo 24h in modo che il confronto con la finestra di
          // prima serata resti monotono.
          if (endMinutesFromMidnight <= startMinutes) {
            endMinutesFromMidnight += 24 * 60;
          }
          rows.push({
            family: fam,
            channel: ch.name,
            channelNumber: ch.number,
            time: hhmm,
            startMs: d.getTime(),
            durationMin,
            hourRome: parseInt(hStr, 10),
            minuteRome: parseInt(mStr, 10),
            endMinutesFromMidnight,
            hasExplicitEnd,
            title: p.title,
            genre: p.genre,
          });
        }
      }
    });
    return rows;
  }, [tvQueries]);

  // "Prima fascia serale" italiana: ~21:00 - 22:30 Europe/Rome.
  // Selezioniamo per ogni canale il primo programma in quella finestra,
  // poi ordiniamo per famiglia (RAI -> Mediaset -> Sky Sport -> Sky Cinema
  // -> Discovery) e per numero canale.
  const familyOrder = useMemo(() => {
    const m: Record<StreamingFamilyId, number> = {} as Record<StreamingFamilyId, number>;
    STREAMING_FAMILIES.forEach((f, i) => { m[f.id] = i; });
    return m;
  }, []);

  const tonightHighlights = useMemo(() => {
    // Prima serata italiana: finestra [21:00, 23:00) Europe/Rome.
    // Algoritmo intelligente: un programma e' rilevante se il suo
    // intervallo [start, end) si interseca con la finestra di prima
    // serata. Cosi' un kickoff anticipato lungo (es. Coppa Italia
    // 20:40 -> 22:50) resta visibile perche' attraversa la fascia,
    // mentre programmi che iniziano alle 23:00 o dopo, o che
    // finiscono entro le 21:00, vengono esclusi.
    //
    // Programmi senza orario di fine reale (`hasExplicitEnd === false`)
    // ricevono un trattamento dedicato: vengono inclusi solo quando
    // l'inizio cade prima delle 23:00 (la fascia li potrebbe coprire),
    // senza richiedere il check sulla fine, perche' la durata effettiva
    // non e' nota. Vengono comunque marcati come "dati incompleti" cosi'
    // l'UI mostra il banner con link alla Guida TV ufficiale.
    const overlapsPrimeWindow = (h: TvHighlight) => {
      const startMin = h.hourRome * 60 + h.minuteRome;
      if (!h.hasExplicitEnd) {
        return startMin < PRIME_TIME_END_EXCLUSIVE_MIN;
      }
      return (
        startMin < PRIME_TIME_END_EXCLUSIVE_MIN &&
        h.endMinutesFromMidnight > PRIME_TIME_START_MIN
      );
    };
    // Minuti di sovrapposizione effettiva con la fascia di prima serata.
    // Usato come criterio principale per scegliere il "main program" di
    // ciascun canale: vince chi copre piu' minuti della fascia.
    const overlapMinutes = (h: TvHighlight) => {
      const startMin = h.hourRome * 60 + h.minuteRome;
      const overlapStart = Math.max(startMin, PRIME_TIME_START_MIN);
      const overlapEnd = Math.min(h.endMinutesFromMidnight, PRIME_TIME_END_EXCLUSIVE_MIN);
      return Math.max(0, overlapEnd - overlapStart);
    };
    // Soglia 40 min: con la finestra piu' larga servono criteri piu' stretti
    // per il "vero" programma di prima serata. Calcio 100+, fiction 90+,
    // film 100+, news show 40+. Tg regionali (~30 min) esclusi.
    const MIN_DURATION = 40;

    const pool = familyFilter === "all"
      ? allHighlights
      : allHighlights.filter((r) => r.family === familyFilter);

    // Per ogni canale: scegli il programma che massimizza l'overlap con
    // la fascia di prima serata. Tie-break: durata totale (preferisce il
    // "main", scartando TG/promo brevi anche a parita' di overlap),
    // poi startMs piu' basso per stabilita'.
    const byChannel = new Map<string, TvHighlight>();
    for (const h of pool) {
      if (!overlapsPrimeWindow(h)) continue;
      const key = `${h.family}|${h.channel}`;
      const existing = byChannel.get(key);
      if (!existing) {
        byChannel.set(key, h);
        continue;
      }
      const hOverlap = overlapMinutes(h);
      const existingOverlap = overlapMinutes(existing);
      if (hOverlap !== existingOverlap) {
        if (hOverlap > existingOverlap) byChannel.set(key, h);
        continue;
      }
      // Stesso overlap: preferisci la durata maggiore (vero "main"
      // program), con MIN_DURATION come soglia minima preferenziale.
      const hIsMain = h.durationMin >= MIN_DURATION;
      const existingIsMain = existing.durationMin >= MIN_DURATION;
      if (hIsMain !== existingIsMain) {
        if (hIsMain) byChannel.set(key, h);
        continue;
      }
      if (h.durationMin !== existing.durationMin) {
        if (h.durationMin > existing.durationMin) byChannel.set(key, h);
        continue;
      }
      if (h.startMs < existing.startMs) byChannel.set(key, h);
    }

    return Array.from(byChannel.values())
      .sort((a, b) => {
        const fa = familyOrder[a.family] - familyOrder[b.family];
        if (fa !== 0) return fa;
        const cn = (a.channelNumber ?? 9999) - (b.channelNumber ?? 9999);
        if (cn !== 0) return cn;
        return a.startMs - b.startMs;
      });
  }, [allHighlights, familyFilter, familyOrder]);

  const familyLabelMap = useMemo(() => {
    const m: Record<StreamingFamilyId, string> = {} as Record<StreamingFamilyId, string>;
    STREAMING_FAMILIES.forEach((f) => { m[f.id] = f.label; });
    return m;
  }, []);

  const filteredFamilyLabel = familyFilter !== "all"
    ? familyLabelMap[familyFilter]
    : null;

  // Reset paginazione quando cambia il filtro famiglia
  useEffect(() => {
    setTvPage(0);
  }, [familyFilter]);

  const totalTvPages = Math.max(1, Math.ceil(tonightHighlights.length / TV_PAGE_SIZE));
  const safePage = Math.min(tvPage, totalTvPages - 1);
  const pagedHighlights = useMemo(
    () => tonightHighlights.slice(safePage * TV_PAGE_SIZE, safePage * TV_PAGE_SIZE + TV_PAGE_SIZE),
    [tonightHighlights, safePage],
  );

  // Famiglie attualmente in pagina che hanno almeno un programma con
  // dati incompleti (orario di fine mancante). Per ciascuna mostriamo
  // un avviso con link alla Guida TV ufficiale, cosi' l'utente puo'
  // verificare la durata reale alla fonte.
  const incompleteFamilies = useMemo(() => {
    const seen = new Set<StreamingFamilyId>();
    for (const h of tonightHighlights) {
      if (!h.hasExplicitEnd) seen.add(h.family);
    }
    return Array.from(seen).sort(
      (a, b) => familyOrder[a] - familyOrder[b],
    );
  }, [tonightHighlights, familyOrder]);

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-card to-card/60">
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gold-gradient shrink-0">
              <Tv2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="font-heading text-lg font-bold uppercase tracking-wider">
                <span className="text-gold-gradient">Stasera in TV</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Prima serata (21:00 - 23:00) — RAI · Mediaset · Sky Sport · Sky Cinema · Discovery
              </p>
            </div>
          </div>
        </div>

        {/* Filtri rapidi: griglia 3 colonne su mobile (2 righe), wrap libero su desktop.
            Niente scroll orizzontale: tutte le 6 chip devono essere sempre visibili. */}
        <ToggleGroup
          type="single"
          value={familyFilter}
          onValueChange={(v) => v && setFamilyFilter(v as FilterValue)}
          className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:justify-start"
        >
          <ToggleGroupItem
            value="all"
            size="sm"
            aria-label="Mostra tutte le famiglie"
            className="h-9 w-full sm:w-auto px-2 sm:px-3 text-[11px] font-heading uppercase tracking-wider border border-primary/30 bg-card/60 text-foreground hover:bg-primary/15 hover:text-foreground hover:border-primary/60 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary data-[state=on]:shadow-[0_0_0_1px_hsl(var(--gold)/0.6)]"
          >
            Tutti
          </ToggleGroupItem>
          {STREAMING_FAMILIES.map((f) => (
            <ToggleGroupItem
              key={f.id}
              value={f.id}
              size="sm"
              aria-label={`Filtra ${f.label}`}
              className="h-9 w-full sm:w-auto px-2 sm:px-3 text-[11px] font-heading uppercase tracking-wider whitespace-nowrap border border-primary/30 bg-card/60 text-foreground hover:bg-primary/15 hover:text-foreground hover:border-primary/60 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary data-[state=on]:shadow-[0_0_0_1px_hsl(var(--gold)/0.6)]"
            >
              {f.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {tonightHighlights.length > 0 ? (
          <>
            {incompleteFamilies.length > 0 && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-md border border-[hsl(var(--gold))]/40 bg-[hsl(var(--gold))]/10 px-3 py-2.5 text-xs text-foreground/85 space-y-2"
              >
                <div className="flex items-start gap-2">
                  <Info
                    className="h-4 w-4 shrink-0 mt-0.5 text-[hsl(var(--gold-dark))] dark:text-[hsl(var(--gold))]"
                    aria-hidden="true"
                    focusable="false"
                  />
                  <p className="leading-snug">
                    Per alcuni canali la fonte non fornisce l'orario di fine: durata e
                    sovrapposizione con la prima serata sono stime. Verifica il palinsesto
                    reale sulla Guida TV ufficiale.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 pl-6">
                  {incompleteFamilies.map((fam) => {
                    const meta = FAMILY_EPG_URLS[fam];
                    const famLabel = familyLabelMap[fam];
                    return (
                      <a
                        key={fam}
                        href={meta.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${meta.label} (${famLabel}). Si apre in una nuova scheda del browser.`}
                        className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--gold))]/40 bg-card/60 px-2.5 py-1 text-[11px] font-heading uppercase tracking-wider text-foreground transition-colors hover:bg-[hsl(var(--gold))]/15 hover:border-[hsl(var(--gold))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold))] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <ExternalLink className="h-3 w-3" aria-hidden="true" focusable="false" />
                        <span>{meta.label}</span>
                        <span className="sr-only"> (si apre in una nuova scheda)</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
            <ul
              role="table"
              aria-label="Programmi in prima serata stasera"
              aria-rowcount={tonightHighlights.length + 1}
              aria-colcount={6}
              className="
                divide-y-2 divide-border rounded-md border-2 border-border bg-card/70 overflow-hidden
                sm:grid sm:divide-y-0
                sm:[grid-template-columns:3.5rem_minmax(5rem,auto)_minmax(0,1fr)_6.5rem_4.5rem]
                lg:[grid-template-columns:8rem_3.5rem_minmax(5rem,auto)_minmax(0,1fr)_7rem_4.5rem]
              "
            >
              {/* Riga di intestazione invisibile: espone i columnheader agli
                  screen reader senza impatto visivo. Su mobile (<sm) la <li>
                  e' completamente sr-only; su >=sm si fonde nella grid via
                  display:contents e ogni cella resta sr-only. */}
              <li
                role="row"
                aria-rowindex={1}
                className="sr-only sm:contents"
              >
                <div role="columnheader" aria-colindex={1} className="sr-only">Famiglia</div>
                <div role="columnheader" aria-colindex={2} className="sr-only">Ora</div>
                <div role="columnheader" aria-colindex={3} className="sr-only">Canale</div>
                <div role="columnheader" aria-colindex={4} className="sr-only">Titolo</div>
                <div role="columnheader" aria-colindex={5} className="sr-only">Genere</div>
                <div role="columnheader" aria-colindex={6} className="sr-only">Durata</div>
              </li>
              {pagedHighlights.map((row, i) => {
                const prev = pagedHighlights[i - 1];
                const showFamilyDivider = !prev || prev.family !== row.family;
                const ariaRowIndex = safePage * TV_PAGE_SIZE + i + 2;
                return (
                  <Fragment key={`${row.family}-${row.channel}-${row.time}-${i}`}>
                    {showFamilyDivider && i > 0 && (
                      <li
                        aria-hidden="true"
                        data-testid="family-divider"
                        data-family={row.family}
                        className="h-[3px] bg-primary border-y border-primary/40 list-none sm:col-span-full"
                      />
                    )}
                    {showFamilyDivider && (() => {
                      const FamilyIcon = FAMILY_ICONS[row.family];
                      return (
                        <li
                          data-testid="family-label-mobile"
                          data-family={row.family}
                          role="rowheader"
                          aria-label={`Famiglia ${familyLabelMap[row.family]}`}
                          className="lg:hidden flex items-center gap-1.5 px-2.5 pt-2 pb-1 bg-primary/5 sm:col-span-full"
                        >
                          <FamilyIcon className="h-3.5 w-3.5 text-primary/80 shrink-0" aria-hidden="true" />
                          <span className="font-heading font-bold text-[10px] uppercase tracking-widest text-primary/80">
                            {familyLabelMap[row.family]}
                          </span>
                        </li>
                      );
                    })()}
                    <li
                      role="row"
                      aria-rowindex={ariaRowIndex}
                      tabIndex={0}
                      className="group px-3 py-4 text-sm outline-none transition-colors hover:bg-primary/10 focus-visible:bg-primary/15 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset cursor-pointer sm:contents"
                    >
                      {/* Desktop/Tablet: celle grid (display:contents sul li) */}
                      {(() => {
                        const FamilyIcon = FAMILY_ICONS[row.family];
                        const g = row.genre || inferGenre(row.family, row.channel, row.title);
                        const dur = row.hasExplicitEnd ? formatDuration(row.durationMin) : "";
                        const durSpoken = row.hasExplicitEnd
                          ? formatDurationSpoken(row.durationMin)
                          : "";
                        const durDisplay = row.hasExplicitEnd ? dur : "—";
                        const durAriaLabel = row.hasExplicitEnd
                          ? (durSpoken ? `Durata ${durSpoken}` : undefined)
                          : "Durata non disponibile dalla fonte";
                        const familyLabel = familyLabelMap[row.family];
                        return (
                          <>
                            {/* Cella famiglia: solo lg, vuota se non e' la prima riga del gruppo */}
                            <div
                              role={showFamilyDivider ? "rowheader" : "cell"}
                              aria-colindex={1}
                              aria-label={showFamilyDivider ? `Famiglia ${familyLabel}` : undefined}
                              aria-hidden={showFamilyDivider ? undefined : true}
                              className="hidden lg:flex lg:items-center lg:gap-1.5 lg:pl-3 lg:pr-2 lg:py-4 lg:border-t-2 lg:border-border transition-colors lg:group-hover:bg-primary/10 lg:group-focus-visible:bg-primary/15"
                            >
                              {showFamilyDivider ? (
                                <>
                                  <FamilyIcon className="h-3.5 w-3.5 text-primary/80 shrink-0" aria-hidden="true" />
                                  <span className="font-heading font-bold text-xs uppercase tracking-wider text-primary/80 truncate">
                                    {familyLabel}
                                  </span>
                                </>
                              ) : null}
                            </div>
                            {/* Cella ora */}
                            <div
                              role="cell"
                              aria-colindex={2}
                              aria-label={`Inizio alle ${row.time}`}
                              className="hidden sm:flex sm:items-center sm:px-2 sm:py-4 sm:border-t-2 sm:border-border font-mono font-bold text-primary text-sm leading-none transition-colors sm:group-hover:bg-primary/10 sm:group-focus-visible:bg-primary/15"
                            >
                              {row.time}
                            </div>
                            {/* Cella canale */}
                            <div
                              role="cell"
                              aria-colindex={3}
                              aria-label={`Canale ${row.channel}`}
                              className="hidden sm:flex sm:items-center sm:px-2 sm:py-4 sm:border-t-2 sm:border-border transition-colors sm:group-hover:bg-primary/10 sm:group-focus-visible:bg-primary/15"
                            >
                              <Badge
                                variant="outline"
                                className="text-[10px] font-bold uppercase tracking-wider shrink-0 whitespace-nowrap leading-none"
                              >
                                {row.channel}
                              </Badge>
                            </div>
                            {/* Cella titolo */}
                            <div
                              role="cell"
                              aria-colindex={4}
                              className="hidden sm:flex sm:items-center sm:px-2 sm:py-4 sm:border-t-2 sm:border-border sm:min-w-0 transition-colors sm:group-hover:bg-primary/10 sm:group-focus-visible:bg-primary/15"
                            >
                              <span
                                className="truncate font-medium text-sm leading-tight text-foreground"
                                title={row.title}
                              >
                                {row.title}
                              </span>
                            </div>
                            {/* Cella genere — sempre presente per mantenere la colonna */}
                            <div
                              role="cell"
                              aria-colindex={5}
                              aria-label={`Genere ${g}`}
                              className="hidden sm:flex sm:items-center sm:justify-end sm:px-2 sm:py-4 sm:border-t-2 sm:border-border transition-colors sm:group-hover:bg-primary/10 sm:group-focus-visible:bg-primary/15"
                            >
                              <Badge
                                variant="secondary"
                                className="text-[9px] uppercase tracking-wider shrink-0 bg-primary/15 text-primary border-primary/20 hover:bg-primary/20 leading-none"
                              >
                                {g}
                              </Badge>
                            </div>
                            {/* Cella durata */}
                            <div
                              role="cell"
                              aria-colindex={6}
                              aria-label={durAriaLabel}
                              className="hidden sm:flex sm:items-center sm:justify-end sm:pr-3 sm:pl-2 sm:py-4 sm:border-t-2 sm:border-border font-mono text-xs text-foreground/75 tabular-nums whitespace-nowrap transition-colors sm:group-hover:bg-primary/10 sm:group-focus-visible:bg-primary/15"
                              title={row.hasExplicitEnd ? undefined : "Orario di fine non disponibile dalla fonte"}
                            >
                              {durDisplay}
                            </div>
                          </>
                        );
                      })()}

                      {/* Mobile: layout a 2 righe per migliore leggibilita'.
                          Per gli screen reader esponiamo una descrizione
                          aggregata via <article aria-label> cosi' la riga e'
                          annunciata in una sola frase coerente. */}
                      {(() => {
                        const g = row.genre || inferGenre(row.family, row.channel, row.title);
                        const durSpoken = row.hasExplicitEnd
                          ? formatDurationSpoken(row.durationMin)
                          : "";
                        const ariaParts = [
                          `${familyLabelMap[row.family]} ${row.channel}`,
                          `alle ${row.time}`,
                          row.title,
                        ];
                        ariaParts.push(`genere ${g}`);
                        if (durSpoken) ariaParts.push(`durata ${durSpoken}`);
                        else if (!row.hasExplicitEnd) ariaParts.push("durata non disponibile dalla fonte");
                        return (
                          <article
                            aria-label={ariaParts.join(", ")}
                            className="sm:hidden flex flex-col gap-2"
                          >
                        {/* Riga 1: ora + canale + durata */}
                        <div className="flex items-center gap-2 flex-wrap" aria-hidden="true">
                          <span className="font-mono font-bold text-primary text-sm leading-none shrink-0">
                            {row.time}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold uppercase tracking-wider shrink-0 whitespace-nowrap leading-none"
                          >
                            {row.channel}
                          </Badge>
                          {row.hasExplicitEnd && formatDuration(row.durationMin) && (
                            <span className="text-[11px] text-foreground/75 whitespace-nowrap font-mono leading-none ml-auto">
                              {formatDuration(row.durationMin)}
                            </span>
                          )}
                          {!row.hasExplicitEnd && (
                            <span
                              className="text-[11px] text-foreground/60 whitespace-nowrap font-mono leading-none ml-auto"
                              title="Orario di fine non disponibile dalla fonte"
                            >
                              —
                            </span>
                          )}
                        </div>
                        {/* Riga 2: titolo + genere */}
                        <div className="flex items-start gap-2 flex-wrap" aria-hidden="true">
                          <span className="font-medium text-[13px] leading-snug break-words flex-1 min-w-0 text-foreground">
                            {row.title}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-[9px] uppercase tracking-wider shrink-0 bg-primary/15 text-primary border-primary/20 hover:bg-primary/20 leading-none mt-0.5"
                          >
                            {g}
                          </Badge>
                        </div>
                          </article>
                        );
                      })()}
                    </li>
                  </Fragment>
                );
              })}
            </ul>

            {totalTvPages > 1 && (
              <div className="flex items-center justify-between gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTvPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="h-8 px-2 gap-1 text-xs"
                  aria-label="Pagina precedente"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Precedente</span>
                </Button>
                <span
                  aria-live="polite"
                  aria-atomic="true"
                  className="text-[11px] font-heading uppercase tracking-wider text-muted-foreground"
                >
                  Pagina {safePage + 1} / {totalTvPages} · {tonightHighlights.length} canali
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTvPage((p) => Math.min(totalTvPages - 1, p + 1))}
                  disabled={safePage >= totalTvPages - 1}
                  className="h-8 px-2 gap-1 text-xs"
                  aria-label="Pagina successiva"
                >
                  <span className="hidden sm:inline">Successiva</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-md border border-dashed border-border/60 bg-card/30 px-4 py-6 text-center text-sm text-muted-foreground">
            {filteredFamilyLabel ? (
              <>
                Palinsesto non disponibile per <strong>{filteredFamilyLabel}</strong>.
                <br />
                <button
                  type="button"
                  onClick={() => setFamilyFilter("all")}
                  className="mt-2 text-primary hover:underline text-xs font-heading uppercase tracking-wider"
                >
                  Mostra tutte le famiglie
                </button>
              </>
            ) : (
              "Palinsesto non ancora disponibile"
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
