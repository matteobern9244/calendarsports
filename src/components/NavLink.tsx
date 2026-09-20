import { forwardRef, type ComponentProps } from "react";
import { Link, useLocation } from "@/lib/router-compat";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<ComponentProps<typeof Link>, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

/**
 * NavLink compatibile: lo stato attivo si calcola dal percorso corrente.
 * (Il router TanStack non passa `isActive` come funzione di className;
 * `pendingClassName` resta accettata per compatibilita' ma non si applica.)
 */
const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName: _pendingClassName, to, ...props }, ref) => {
    const { pathname } = useLocation();
    const target = typeof to === "string" ? to : "";
    const isActive = pathname === target || (target !== "/" && pathname.startsWith(`${target}/`));
    return <Link ref={ref} to={to} className={cn(className, isActive && activeClassName)} {...props} />;
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
