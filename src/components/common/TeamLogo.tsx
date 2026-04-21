import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TeamLogoProps {
  src?: string | null;
  name: string;
  size?: number;
  shape?: "circle" | "rounded";
  className?: string;
  /** Override automatic initials (e.g. driver code like "MCL"). */
  initials?: string;
  alt?: string;
}

function computeInitials(name: string): string {
  const cleaned = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !/^(racing|team|motogp|motogp\.|f1|gp|the|of|de|di|du)$/i.test(w));
  if (cleaned.length === 0) return name.slice(0, 2).toUpperCase();
  if (cleaned.length === 1) return cleaned[0].slice(0, 2).toUpperCase();
  return (cleaned[0][0] + cleaned[1][0]).toUpperCase();
}

/**
 * Robust logo/avatar renderer that falls back to text initials when the
 * image fails to load (Wikimedia rate-limit, hot-link block, 404, ...).
 * Always renders a visible placeholder — never empty space.
 */
export default function TeamLogo({
  src,
  name,
  size = 32,
  shape = "rounded",
  className,
  initials,
  alt,
}: TeamLogoProps) {
  const [failed, setFailed] = useState(false);

  // Reset failure state if src changes
  useEffect(() => {
    setFailed(false);
  }, [src]);

  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-md";
  const dimensions = { width: size, height: size };
  const fallbackText = initials ?? computeInitials(name);

  if (!src || failed) {
    return (
      <div
        aria-label={alt ?? name}
        role="img"
        style={dimensions}
        className={cn(
          "flex items-center justify-center flex-shrink-0 bg-muted text-foreground font-heading font-bold border border-border/60 select-none",
          shapeClass,
          className,
        )}
      >
        <span style={{ fontSize: Math.max(10, Math.floor(size * 0.38)) }}>{fallbackText}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt ?? name}
      style={dimensions}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn("object-contain flex-shrink-0 bg-background/40", shapeClass, className)}
    />
  );
}