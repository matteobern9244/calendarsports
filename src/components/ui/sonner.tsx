import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * I colori arrivano dai token del tema invece che dalla prop `theme` di
 * sonner. Il wrapper originale leggeva il tema da `next-themes`, che questa
 * app non monta: senza provider ricadeva su "system" e mostrava toast chiari
 * sopra l'interfaccia scura. I token seguono la classe `.dark` impostata da
 * `useTheme`, quindi il toast e' sempre coerente con la pagina.
 */
const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    className="toaster group"
    style={
      {
        "--normal-bg": "var(--color-popover)",
        "--normal-text": "var(--color-popover-foreground)",
        "--normal-border": "var(--color-border)",
      } as React.CSSProperties
    }
    {...props}
  />
);

export { Toaster, toast };
