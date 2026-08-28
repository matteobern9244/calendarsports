import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  test: {
    // Due progetti perche' i due mondi non condividono l'ambiente: l'app gira
    // in jsdom, le edge function girano su Deno e non hanno un DOM. Tenerli
    // separati impedisce a un test del backend di appoggiarsi per sbaglio a
    // una global del browser che in produzione non esiste.
    projects: [
      {
        plugins: [react()],
        test: {
          name: "app",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
        },
        resolve: {
          alias: { "@": path.resolve(import.meta.dirname, "./src") },
        },
      },
      {
        test: {
          name: "edge",
          environment: "node",
          globals: true,
          include: ["supabase/functions/**/*.{test,spec}.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      reportsDirectory: "coverage",
      // I componenti shadcn arrivano dalla CLI e si ri-sincronizzano da
      // upstream: misurarne la copertura direbbe qualcosa su di loro, non
      // su questo progetto.
      exclude: ["src/components/ui/**", "src/test/**", "**/*.d.ts"],
    },
  },
});
