import { defineConfig, devices } from "@playwright/test";

const previewHost = "127.0.0.1";
const previewPort = 4173;
const baseURL = `http://${previewHost}:${previewPort}`;
const mockSupabaseUrl = "http://127.0.0.1:54321";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      // Le prove che valgono su entrambi restano qui: `mobile.spec.ts`
      // contiene solo cio' che ha bisogno di un dito e di uno schermo
      // stretto, e girerebbe due volte senza dire niente di nuovo.
      testIgnore: /mobile\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      testMatch: /mobile\.spec\.ts/,
      // Pixel 5: schermo stretto e `hasTouch`, cioe' le due condizioni che
      // separano il comportamento mobile da quello desktop.
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    /*
      Le due variabili sono **prefissi** della build, separati da spazi: unite
      con `&&` diventavano comandi a se' stanti, e un'assegnazione senza
      `export` crea una variabile di shell che i processi figli non vedono. La
      build ripiegava percio' sull'indirizzo di produzione scritto in
      `supabaseClient.ts`, e le prove parlavano con il Supabase vero invece che
      con il finto — senza che niente lo segnalasse, perche' senza sessione
      quelle richieste non servono a nessuno.
    */
    command:
      `VITE_SUPABASE_URL=${mockSupabaseUrl} VITE_SUPABASE_PUBLISHABLE_KEY=test-anon-key bun run build` +
      ` && bun run preview -- --host ${previewHost} --port ${previewPort} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
