import type { ReactNode } from "react";
import SectionHeader from "@/components/common/SectionHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface SportTab {
  value: string;
  label: string;
}

interface SportTabsProps {
  /** Titolo della pagina: diventa l'`h1`, sopra le schede. */
  title: string;
  /** Scheda aperta all'arrivo sulla pagina. */
  defaultValue: string;
  /** Le schede, nell'ordine in cui vanno mostrate. */
  tabs: readonly SportTab[];
  /**
   * Classi della `TabsList`. Il default e' quello di tre pagine su quattro;
   * `SinnerPage` ne ha due sole e usa un contenitore piu' semplice, quindi
   * questa prop **sostituisce** le classi invece di aggiungersi: e' l'unico
   * modo per non uniformare in silenzio una differenza voluta.
   */
  listClassName?: string;
  /** Contenuto fra intestazione e schede: la scheda giocatore di Sinner. */
  beforeTabs?: ReactNode;
  /** I `TabsContent`, uno per scheda. */
  children: ReactNode;
}

const DEFAULT_LIST_CLASS = "mb-6 bg-muted flex-wrap h-auto gap-1 p-1";

/**
 * Il guscio delle pagine sportive: contenitore, intestazione e schede.
 * Era ripetuto in `Formula1Page`, `MotoGPPage`, `SinnerPage` e
 * `JuventusPage`, con differenze reali fra le quattro copie — le schede,
 * e in un caso le classi della lista. Qui restano differenze dichiarate,
 * non ripetizioni.
 */
export default function SportTabs({
  title,
  defaultValue,
  tabs,
  listClassName,
  beforeTabs,
  children,
}: SportTabsProps) {
  return (
    <div className="container py-8 sm:py-12">
      <div className="mb-2">
        <SectionHeader title={title} />
      </div>

      {beforeTabs}

      <Tabs defaultValue={defaultValue} className="w-full">
        <TabsList className={listClassName ?? DEFAULT_LIST_CLASS}>
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="font-heading text-xs tracking-wider uppercase"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {children}
      </Tabs>
    </div>
  );
}
