import { Outlet } from "react-router-dom";
import Header from "./Header";
import { useTheme } from "@/hooks/useTheme";

export default function Layout() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col">
      <Header theme={theme} toggleTheme={toggleTheme} />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border/50 py-6">
        <div className="container text-center text-xs text-muted-foreground">
          <span className="font-heading tracking-wider uppercase">Calendar Sports Events</span>
        </div>
      </footer>
    </div>
  );
}
