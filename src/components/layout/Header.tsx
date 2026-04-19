import { useRef, useState, MouseEvent as ReactMouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  HomeBrandIcon,
  StreamingBrandIcon,
  TennisBrandIcon,
  JuveBrandIcon,
  F1BrandIcon,
  MotoGPBrandIcon,
} from "./BrandIcons";
import { SparkleLoop } from "./SparkleLoop";

interface HeaderProps {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const navItems = [
  { label: "HOME", shortLabel: "HOME", path: "/", Icon: HomeBrandIcon },
  { label: "STREAMING", shortLabel: "STREAMING", path: "/streaming", Icon: StreamingBrandIcon },
  { label: "JANNIK SINNER", shortLabel: "SINNER", path: "/sinner", Icon: TennisBrandIcon },
  { label: "JUVENTUS", shortLabel: "JUVE", path: "/juventus", Icon: JuveBrandIcon },
  { label: "FORMULA 1", shortLabel: "F1", path: "/formula1", Icon: F1BrandIcon },
  { label: "MOTOGP", shortLabel: "MOTOGP", path: "/motogp", Icon: MotoGPBrandIcon },
] as const;

interface Burst {
  id: number;
  x: number;
  y: number;
}

export default function Header({ theme, toggleTheme }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bursts, setBursts] = useState<Record<string, Burst | null>>({});
  const location = useLocation();
  const navigate = useNavigate();
  const burstSeq = useRef(0);

  const triggerBurst = (path: string, e: ReactMouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = ++burstSeq.current;
    setBursts((prev) => ({ ...prev, [path]: { id, x, y } }));
    window.setTimeout(() => {
      setBursts((prev) => (prev[path]?.id === id ? { ...prev, [path]: null } : prev));
    }, 700);
  };

  const handleDesktopClick = (path: string) => (e: ReactMouseEvent<HTMLAnchorElement>) => {
    triggerBurst(path, e);
  };

  const handleMobileClick = (path: string) => (e: ReactMouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    triggerBurst(path, e);
    window.setTimeout(() => {
      setMobileOpen(false);
      navigate(path);
    }, 220);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-card/80 backdrop-blur-xl">
      <div className="container flex h-16 md:h-20 items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" aria-label="Calendar Events — vai alla home" className="flex items-center shrink-0">
          <img
            src="/logo-header.jpg"
            alt="Calendar Events"
            className="h-10 md:h-14 w-auto rounded-md object-contain"
            width={2064}
            height={512}
          />
        </Link>

        {/* Desktop nav */}
        <LayoutGroup id="desktop-nav">
          <nav
            className={cn(
              "hidden md:flex items-center gap-0.5 rounded-full px-1.5 py-1.5",
              "border border-[hsl(var(--gold))]/25 bg-card/60 backdrop-blur-md",
              "shadow-[0_4px_18px_-10px_hsl(var(--gold)/0.45),0_1px_0_hsl(var(--gold-light)/0.15)_inset]"
            )}
          >
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              const Icon = item.Icon;
              const burst = bursts[item.path];
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={handleDesktopClick(item.path)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative inline-flex items-center gap-1.5 px-3 lg:px-4 py-2 rounded-full overflow-hidden",
                    "text-[15px] lg:text-base font-heading font-semibold tracking-[0.12em] uppercase",
                    "transition-colors duration-200",
                    active
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className={cn(
                        "absolute inset-0 rounded-full -z-10",
                        "bg-gradient-to-br from-[hsl(var(--gold-dark))] via-[hsl(var(--gold))] to-[hsl(var(--gold-light))]",
                        "shadow-[0_6px_20px_-6px_hsl(var(--gold)/0.65),0_1px_0_hsl(var(--gold-light)/0.7)_inset]"
                      )}
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}

                  {/* Click burst */}
                  <AnimatePresence>
                    {burst && (
                      <motion.span
                        key={burst.id}
                        className="pointer-events-none absolute rounded-full"
                        style={{
                          left: burst.x,
                          top: burst.y,
                          width: 10,
                          height: 10,
                          marginLeft: -5,
                          marginTop: -5,
                          background:
                            "radial-gradient(circle, hsl(var(--gold-light)) 0%, hsl(var(--gold)) 45%, transparent 70%)",
                        }}
                        initial={{ scale: 0, opacity: 0.9 }}
                        animate={{ scale: 18, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    )}
                  </AnimatePresence>

                  <motion.span
                    className="relative z-10 inline-flex"
                    whileHover={{ rotate: -8, scale: 1.12 }}
                    whileTap={{ scale: 0.85, rotate: 6 }}
                    transition={{ type: "spring", stiffness: 500, damping: 18 }}
                  >
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px] transition-opacity duration-200",
                        active ? "opacity-100 drop-shadow-[0_1px_0_hsl(var(--navy-dark)/0.4)]" : "opacity-80 group-hover:opacity-100"
                      )}
                    />
                    {active && <SparkleLoop count={4} intervalMs={4500} radius={16} size={4} glow />}
                  </motion.span>
                  <span className="relative z-10 hidden lg:inline">{item.label}</span>
                  <span className="relative z-10 lg:hidden">{item.shortLabel}</span>
                </Link>
              );
            })}
          </nav>
        </LayoutGroup>

        {/* Theme toggle + mobile menu */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Tema chiaro" : "Tema scuro"}
            className="rounded-full border border-border/60 hover:border-[hsl(var(--gold))]/50 hover:bg-[hsl(var(--gold))]/10 transition-colors"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={mobileOpen ? "Chiudi menu" : "Apri menu"}
            className="md:hidden rounded-full border border-border/60 hover:border-[hsl(var(--gold))]/50 hover:bg-[hsl(var(--gold))]/10 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="md:hidden overflow-hidden border-t border-border/50 bg-card/95 backdrop-blur-xl"
          >
            <div className="container py-4 flex flex-col gap-2">
              {navItems.map((item, idx) => {
                const active = location.pathname === item.path;
                const Icon = item.Icon;
                const burst = bursts[item.path];
                return (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04, duration: 0.2 }}
                  >
                    <Link
                      to={item.path}
                      onClick={handleMobileClick(item.path)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex items-center gap-3 pl-5 pr-4 py-3.5 rounded-xl border overflow-hidden transition-all duration-200",
                        "text-base font-heading font-semibold tracking-widest uppercase",
                        active
                          ? "text-primary-foreground bg-gradient-to-r from-[hsl(var(--gold-dark))] via-[hsl(var(--gold))] to-[hsl(var(--gold-light))] border-[hsl(var(--gold-dark))]/60 shadow-[0_8px_22px_-8px_hsl(var(--gold)/0.6)]"
                          : "text-foreground/85 border-border/60 bg-muted/30 hover:text-foreground hover:border-[hsl(var(--gold))]/45 hover:bg-muted/60"
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1 rounded-r-full bg-[hsl(var(--gold-light))]" />
                      )}

                      <AnimatePresence>
                        {burst && (
                          <motion.span
                            key={burst.id}
                            className="pointer-events-none absolute rounded-full"
                            style={{
                              left: burst.x,
                              top: burst.y,
                              width: 12,
                              height: 12,
                              marginLeft: -6,
                              marginTop: -6,
                              background:
                                "radial-gradient(circle, hsl(var(--gold-light)) 0%, hsl(var(--gold)) 45%, transparent 70%)",
                            }}
                            initial={{ scale: 0, opacity: 0.9 }}
                            animate={{ scale: 22, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.55, ease: "easeOut" }}
                          />
                        )}
                      </AnimatePresence>

                      <Icon className="relative z-10 h-5 w-5 shrink-0" />
                      <span className="relative z-10">{item.label}</span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
