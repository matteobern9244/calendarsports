import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import DataSection, { type ExternalSource } from "@/components/common/DataSection";
import LandingSpinner from "@/components/common/LandingSpinner";
import OfflinePageFallback from "@/components/common/OfflinePageFallback";
import SportTabs from "@/components/common/SportTabs";
import HighlightsSection from "@/components/highlights/HighlightsSection";
import CalendarList from "@/components/juventus/CalendarList";
import NextMatchCard from "@/components/juventus/NextMatchCard";
import StandingsTable from "@/components/juventus/StandingsTable";
import { TabsContent } from "@/components/ui/tabs";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useSerieAStandings, useJuventusCalendar } from "@/hooks/useSportsData";
import { type SerieATeam } from "@/lib/serieATeams";
import { paginatedCalendarOf } from "@/lib/api/schemas";
import { footballApi } from "@/lib/api/sportsApi";
import { getCurrentJuventusSeason } from "@/lib/currentSeason";
import { pageOfIndex, pickNextMatch } from "@/lib/juventusCalendar";
import { allSectionsUnavailable } from "@/lib/offlineSections";
import { queryKeys } from "@/lib/queryKeys";
import { skyTeamPageUrl } from "@/lib/teamRoutes";

const PAGE_SIZE = 12;

const TABS = [
  { value: "calendario", label: "Calendario" },
  { value: "classifica", label: "Classifica" },
  { value: "highlights", label: "Highlights" },
] as const;

// Le due sezioni della pagina squadra non offrono il link a Sky Sport durante
// il caricamento (nessun `loadingLabel`): lo propongono solo quando c'e'
// davvero qualcosa da aggirare, cioe' in errore o a fonte vuota.
const STANDINGS_SOURCE: ExternalSource = {
  href: "https://sport.sky.it/calcio/serie-a/classifica",
  label: "Vedi classifica su Sky Sport",
};

interface TeamPageProps {
  /**
   * La squadra **dell'indirizzo**, gia' risolta da `TeamRoute`. Arriva da li'
   * e non dalle preferenze: fra URL e preferenza vince l'URL, altrimenti un
   * link condiviso mostrerebbe cose diverse a chi lo apre.
   */
  team: SerieATeam;
}

export default function TeamPage({ team }: TeamPageProps) {
  const scheduleSource: ExternalSource = {
    href: skyTeamPageUrl(team),
    label: `Vedi ${team.name} su Sky Sport`,
  };
  const season = getCurrentJuventusSeason();
  const queryClient = useQueryClient();
  const {
    data: standings,
    isLoading: stLoading,
    error: stError,
    refetch: stRefetch,
  } = useSerieAStandings(season);
  const [page, setPage] = useState(1);
  const [userInteracted, setUserInteracted] = useState(false);
  // "Prossime" (default) nasconde le partite gia' giocate della stagione
  // in corso; "Tutte" mostra anche i risultati. Preferenza persistita.
  const [upcomingOnly, setUpcomingOnly] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("juventus-calendar-filter") !== "all";
  });
  const {
    data: calendarData,
    isLoading: calLoading,
    error: calError,
    refetch: calRefetch,
  } = useJuventusCalendar(team.slug, season, page, PAGE_SIZE, upcomingOnly);
  const { isOnline } = useOnlineStatus();

  const calendar = paginatedCalendarOf(calendarData);

  // La pagina che contiene la "prossima partita" globale, per mostrare la
  // card anche quando chi guarda si e' spostato su un'altra pagina.
  const nextMatchPage = calendar ? pageOfIndex(calendar.nextUpcomingIndex, PAGE_SIZE) : null;
  const nextOnCurrentPage = calendar && nextMatchPage !== null && nextMatchPage === calendar.page;
  const { data: nextMatchData, isLoading: nextMatchLoading } = useJuventusCalendar(
    team.slug,
    season,
    nextOnCurrentPage || nextMatchPage === null ? undefined : nextMatchPage,
    nextOnCurrentPage || nextMatchPage === null ? undefined : PAGE_SIZE,
    upcomingOnly,
  );
  const nextMatch = pickNextMatch({
    calendar,
    nextMatchPage,
    nextMatchCalendar: paginatedCalendarOf(nextMatchData),
    pageSize: PAGE_SIZE,
  });

  // Smart landing: al primo caricamento ci si posiziona sulla pagina che
  // contiene la prossima partita. Fatto in render invece che in un effect:
  // l'atterraggio avviene nello stesso passaggio in cui arrivano i dati,
  // senza far vedere prima la pagina 1 e poi saltare.
  if (!userInteracted && calendar && nextMatchPage !== null) {
    setUserInteracted(true);
    if (nextMatchPage !== calendar.page) setPage(nextMatchPage);
  }

  // Prefetch della pagina successiva del calendario quando la
  // pagina corrente e' stabile, cosi' lo scorrimento "Successiva" e'
  // istantaneo. Inoltre, se la "Prossima Partita" risiede su una pagina
  // diversa da quella visualizzata, garantiamo il prefetch di quella
  // pagina cross-page per ridurre lo sfarfallio in atterraggio anche dopo
  // il primo render (es. cambi di pagina manuali fatti dall'utente che
  // tornano lontani dal next match).
  useEffect(() => {
    if (!calendar) return;
    const totalPages = calendar.totalPages ?? 0;
    const currentPage = calendar.page ?? page;

    // Prefetch next page (currentPage + 1) when not on the last page.
    if (totalPages > 0 && currentPage + 1 <= totalPages) {
      const next = currentPage + 1;
      queryClient.prefetchQuery({
        queryKey: queryKeys.juventus.calendar(team.slug, season, next, PAGE_SIZE, upcomingOnly),
        queryFn: () => footballApi.getCalendar(team.slug, season, next, PAGE_SIZE, upcomingOnly),
        staleTime: 5 * 60 * 1000,
      });
    }

    // Prefetch the page containing the global "next upcoming" match if it
    // differs from the current page (cross-page warm-up for the
    // "Prossima Partita" card).
    if (
      nextMatchPage !== null &&
      nextMatchPage !== currentPage &&
      nextMatchPage >= 1 &&
      (totalPages === 0 || nextMatchPage <= totalPages)
    ) {
      queryClient.prefetchQuery({
        queryKey: queryKeys.juventus.calendar(
          team.slug,
          season,
          nextMatchPage,
          PAGE_SIZE,
          upcomingOnly,
        ),
        queryFn: () =>
          footballApi.getCalendar(team.slug, season, nextMatchPage, PAGE_SIZE, upcomingOnly),
        staleTime: 5 * 60 * 1000,
      });
    }
  }, [queryClient, season, calendar, nextMatchPage, page, upcomingOnly, team.slug]);

  const changeFilter = (onlyUpcoming: boolean) => {
    setUpcomingOnly(onlyUpcoming);
    setUserInteracted(false);
    setPage(1);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("juventus-calendar-filter", onlyUpcoming ? "upcoming" : "all");
    }
  };

  const goToPage = (p: number) => {
    setUserInteracted(true);
    setPage(p);
  };

  // Il calendario entra con `calendarData` grezzo, non con `calendar`
  // validato: e' quello che la condizione guardava prima, e un payload
  // che non passa lo schema non e' un'assenza di rete.
  const sezioni = [
    { data: standings, error: stError },
    { data: calendarData, error: calError },
  ];
  if (!isOnline && allSectionsUnavailable(sezioni)) {
    return (
      <OfflinePageFallback
        onRetry={() => {
          stRefetch();
          calRefetch();
        }}
      />
    );
  }

  // Spinner di atterraggio: la pagina squadra deve apparire "completa"
  // solo quando tutti i dati strutturali (calendario corrente, eventuale
  // pagina contenente la "Prossima Partita", classifica Serie A) sono
  // sincronizzati. Senza questo gate l'utente vedeva la pagina renderizzare
  // a tappe: prima il titolo, poi il calendario, e con un piccolo
  // sfarfallio compariva la card "Prossima Partita" quando la seconda
  // fetch (cross-page) arrivava in ritardo.
  //
  // Mostriamo lo spinner solo finche' nessun errore di rete e' presente:
  // gli errori vengono gestiti piu' avanti nei singoli tab con i loro
  // ErrorState dedicati e link esterni.
  const isAwaitingNextMatch =
    calendar !== undefined && nextMatchPage !== null && !nextOnCurrentPage && nextMatchLoading;
  const isInitialLoading =
    !calError && !stError && (calLoading || stLoading || isAwaitingNextMatch);
  if (isInitialLoading) {
    return <LandingSpinner title={team.name} message={`Caricamento dati ${team.name}...`} />;
  }

  return (
    <SportTabs
      title={team.name}
      defaultValue="calendario"
      tabs={TABS}
      beforeTabs={
        nextMatch && <NextMatchCard team={team} match={nextMatch} onRetry={() => calRefetch()} />
      }
    >
      <TabsContent value="classifica">
        <DataSection
          isLoading={stLoading}
          error={stError}
          isEmpty={!standings?.length}
          source={STANDINGS_SOURCE}
          loadingMessage="Caricamento classifica Serie A da Sky Sport..."
          errorMessage={`Classifica Serie A ${season} non disponibile`}
          errorDetail="La nostra fonte dati (Sky Sport) non risponde in questo momento. Riprova oppure apri direttamente la classifica ufficiale aggiornata su Sky Sport."
          errorCtaHint="Tocca qui per la graduatoria ufficiale ora"
          onRetry={() => stRefetch()}
          emptyTitle={`Classifica Serie A ${season}`}
          emptyDescription="La classifica della Serie A per questa stagione non è ancora disponibile dalla nostra fonte. Apri la classifica ufficiale Sky Sport qui sotto per consultare la graduatoria aggiornata, con punti, vittorie, pareggi e differenza reti di tutte le squadre del campionato."
          emptyCtaHint="Tocca qui per la graduatoria completa"
        >
          <StandingsTable team={team} standings={standings ?? []} />
        </DataSection>
      </TabsContent>

      <TabsContent value="calendario">
        {/*
            `isLoading` e `isEmpty` guardano cose diverse di proposito:
            `calendar` resta in mano (placeholderData) mentre arriva la
            pagina successiva, e in quel momento i dati devono restare in
            pagina invece di lasciare il posto allo spinner.
          */}
        <DataSection
          isLoading={calLoading && !calendar}
          error={calError}
          isEmpty={!calendar?.items.length}
          source={scheduleSource}
          loadingMessage="Caricamento calendario da Sky Sport..."
          errorMessage={`Calendario ${team.name} ${season} non disponibile`}
          errorDetail={`La nostra fonte dati (Sky Sport) non risponde in questo momento. Riprova oppure apri direttamente la pagina ufficiale su Sky Sport per consultare tutti gli appuntamenti.`}
          errorCtaHint="Tocca qui per il calendario completo"
          onRetry={() => calRefetch()}
          emptyTitle={`Calendario ${team.name} ${season}`}
          emptyDescription={`Il calendario delle partite di questa stagione non è ancora disponibile dalla nostra fonte. Apri la pagina ufficiale Sky Sport qui sotto per consultare tutti gli appuntamenti della squadra, con giornate, orari e competizioni (Serie A, Coppa Italia, Champions League).`}
          emptyCtaHint="Tocca qui per il calendario completo"
        >
          {calendar && (
            <CalendarList
              team={team}
              calendar={calendar}
              upcomingOnly={upcomingOnly}
              onChangeFilter={changeFilter}
              onGoToPage={goToPage}
            />
          )}
        </DataSection>
      </TabsContent>

      <TabsContent value="highlights">
        <HighlightsSection sport="juventus" accentVar="gold" />
      </TabsContent>
    </SportTabs>
  );
}
