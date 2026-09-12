import { useCallback, useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { usePreferencesPanel } from "@/contexts/usePreferencesPanel";
import { useAuth } from "@/contexts/useAuth";
import { useSwipeFromRight, useTouchDevice } from "@/hooks/useSwipeFromRight";

const CHIAVE_VISTO = "cse-swipe-preferenze";

/**
 * Quanto resta l'indizio a ogni apertura dell'app, prima di togliersi di
 * mezzo da solo. Un suggerimento che non smette mai smette di essere un
 * suggerimento e diventa un elemento dell'interfaccia.
 */
const DURATA_INDIZIO_MS = 12_000;

function giaVisto(): boolean {
  try {
    return window.localStorage.getItem(CHIAVE_VISTO) === "1";
  } catch {
    return false;
  }
}

function segnaVisto() {
  try {
    window.localStorage.setItem(CHIAVE_VISTO, "1");
  } catch {
    /* localStorage puo' non essere disponibile */
  }
}

/**
 * Apre le preferenze con uno swipe da destra, e lo fa sapere.
 *
 * Il pulsante nell'intestazione resta dov'e': questo e' una scorciatoia in
 * piu', non un modo diverso di fare la stessa cosa. Un gesto che sostituisse
 * un comando visibile renderebbe la funzione invisibile a chi non lo scopre.
 *
 * L'indizio e' una striscia dorata sul bordo destro che respira verso
 * sinistra — la direzione del gesto — e sparisce in tre modi: dopo dodici
 * secondi, quando il pannello si apre, e per sempre dopo il primo swipe
 * riuscito. Chi ha imparato non ha piu' niente da imparare.
 *
 * Vive dentro il provider del pannello e non nel `Layout`, che quel provider
 * lo monta: da fuori l'hook non lo vedrebbe.
 */
export default function SwipeToPreferences() {
  const { open, setOpen } = usePreferencesPanel();
  const { user } = useAuth();
  const tattile = useTouchDevice();
  const [mostraIndizio, setMostraIndizio] = useState(() => tattile && !giaVisto());
  /*
    Il gesto apre le preferenze, e le preferenze esistono solo con l'accesso:
    senza sessione non c'e' niente da aprire, e un indizio che suggerisce un
    gesto inefficace e' peggio di nessun indizio.
  */
  const disponibile = tattile && Boolean(user);

  const apri = useCallback(() => {
    setOpen(true);
    segnaVisto();
    setMostraIndizio(false);
  }, [setOpen]);

  useSwipeFromRight(apri, disponibile);

  useEffect(() => {
    if (!mostraIndizio) return;
    const attesa = window.setTimeout(() => setMostraIndizio(false), DURATA_INDIZIO_MS);
    return () => window.clearTimeout(attesa);
  }, [mostraIndizio]);

  if (!disponibile || !mostraIndizio || open) return null;

  return (
    <div
      // Decorativo: quello che suggerisce e' gia' raggiungibile dal pulsante
      // nell'intestazione, quindi a un lettore di schermo direbbe solo una
      // cosa in piu' da ascoltare.
      aria-hidden="true"
      data-testid="indizio-swipe"
      className="pointer-events-none fixed right-0 top-1/2 z-30 -translate-y-1/2 motion-safe:animate-swipe-hint"
    >
      {/*
        La maschera sfuma la striscia in alto e in basso: senza, il rettangolo
        arrotondato legge come un pulsante d'oro che sporge dal bordo, e un
        suggerimento che sembra un comando invita a premerlo invece che a
        trascinarlo.
      */}
      <span className="flex h-32 w-5 items-center justify-center rounded-l-2xl bg-linear-to-l from-[hsl(var(--gold))]/22 via-[hsl(var(--gold))]/10 to-transparent [mask-image:linear-gradient(to_bottom,transparent,black_30%,black_70%,transparent)]">
        <ChevronLeft className="h-3 w-3 text-[hsl(var(--gold))]/70" />
      </span>
    </div>
  );
}
