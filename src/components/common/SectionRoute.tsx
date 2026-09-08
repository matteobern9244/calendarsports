import { Navigate } from "react-router";
import { useUserPrefs, type SectionKey } from "@/contexts/useUserPrefs";
import type { ReactNode } from "react";

/**
 * Nasconde una sezione disattivata nel profilo: chi ci arriva da un link
 * diretto torna alla Home invece di vedere una pagina che ha scelto di
 * nascondere.
 */
export default function SectionRoute({
  section,
  children,
}: {
  section: SectionKey;
  children: ReactNode;
}) {
  const { sections } = useUserPrefs();
  if (!sections[section]) return <Navigate to="/" replace />;
  return <>{children}</>;
}
