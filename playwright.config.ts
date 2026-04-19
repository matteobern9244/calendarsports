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
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: [
      `VITE_SUPABASE_URL=${mockSupabaseUrl}`,
      "VITE_SUPABASE_PUBLISHABLE_KEY=test-anon-key",
      "VITE_DISABLE_QUERY_RETRIES=true",
      "npm run build",
      `npm run preview -- --host ${previewHost} --port ${previewPort} --strictPort`,
    ].join(" && "),
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
