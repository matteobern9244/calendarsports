import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface RemoteImageProps {
  src: string | null | undefined;
  alt: string;
  className: string;
  fallbackClassName?: string;
  decorative?: boolean;
}

/**
 * Un'immagine pubblicata da una fonte esterna, con un'assenza esplicita.
 *
 * Una URL presente non garantisce che il file esista ancora: Sky conserva
 * l'indirizzo nel JSON anche quando il suo CDN risponde 404. In quel caso il
 * browser non deve mostrare la propria icona rotta, ma lo stesso segnaposto
 * usato quando la URL non e' stata pubblicata affatto.
 */
export default function RemoteImage({
  src,
  alt,
  className,
  fallbackClassName,
  decorative = false,
}: RemoteImageProps) {
  const [errore, setErrore] = useState(false);

  useEffect(() => setErrore(false), [src]);

  if (!src || errore) {
    return (
      <span
        className={cn("grid place-items-center bg-muted text-muted-foreground", fallbackClassName)}
        aria-label={decorative ? undefined : `Foto non disponibile per ${alt}`}
        aria-hidden={decorative || undefined}
      >
        <ImageOff className="h-1/2 w-1/2" aria-hidden="true" />
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={decorative ? "" : alt}
      aria-hidden={decorative || undefined}
      loading="lazy"
      className={className}
      onError={() => setErrore(true)}
    />
  );
}