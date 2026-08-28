import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      // Stato locale dei plugin per agenti AI: non e' codice del progetto e non
      // deve comparire fra gli errori di lint.
      ".remember",
      // Artefatti di Playwright.
      "playwright-report",
      "test-results",
      // Generato dalla CLI Supabase: si ri-sincronizza da upstream.
      "src/integrations/supabase/types.ts",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        // Il prefisso `_` e' la deroga esplicita: dice al lettore che il
        // parametro esiste per posizione e non viene usato di proposito.
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // Resta spenta finche' non e' chiusa la tipizzazione dei payload al
      // confine delle edge function (voce "Tipizzazione dei payload API" in
      // docs/ROADMAP.md): oggi ci sono 25 `any` nelle pagine, ed e' quel
      // lavoro a doverli togliere, non un `eslint-disable` per ciascuno.
      "@typescript-eslint/no-explicit-any": "off",
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/integrations/supabase/client",
              message:
                "Importa il client Supabase da '@/lib/supabaseClient' invece che dal file auto-generato. Vedi AGENTS.md → 'Import del client Supabase'.",
            },
          ],
          patterns: [
            {
              group: ["**/integrations/supabase/client", "src/integrations/supabase/client"],
              message:
                "Importa il client Supabase da '@/lib/supabaseClient'. Il file auto-generato non e' sicuro in build di produzione (env var non sempre iniettate).",
            },
          ],
        },
      ],
    },
  },
  {
    // I file in `src/components/ui/` sono generati dalla CLI shadcn e vengono
    // ri-sincronizzati da upstream. Esportano di proposito anche varianti e
    // hook accanto al componente (`buttonVariants`, `useFormField`,
    // `navigationMenuTriggerStyle`, ...): separarli romperebbe il
    // ri-allineamento con la CLI. La regola resta attiva su tutto il resto.
    files: ["src/components/ui/**"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    // Il wrapper sicuro e' l'unico punto autorizzato a creare il client.
    // Il divieto sopra resta anche se Lovable rigenera
    // `src/integrations/supabase/client.ts`: e' proprio quel file a non
    // dover essere importato da nessuno.
    files: ["src/lib/supabaseClient.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    // Script di verifica e file di configurazione: girano su Node, non nel
    // browser. Prima di questo blocco non erano coperti da nessuna regola.
    files: ["scripts/**/*.{js,mjs}", "*.config.{js,ts}", "eslint.config.js"],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.node,
    },
  },
  {
    // Test end-to-end: girano in Node sotto Playwright, non nel browser.
    files: ["e2e/**/*.ts"],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
  {
    // Edge function: runtime Deno, non browser. `Deno`, `Response` e `fetch`
    // esistono, `document` e `window` no.
    //
    // `no-explicit-any` resta spenta anche qui: i payload delle fonti a monte
    // sono JSON non tipizzato e la tipizzazione al confine e' un lavoro a se',
    // tracciato in docs/ROADMAP.md.
    files: ["supabase/functions/**/*.ts"],
    languageOptions: {
      globals: { ...globals.denoBuiltin, ...globals.browser },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Prettier per ultimo: spegne le regole di stile che confliggono e
  // trasforma ogni differenza di formattazione in un errore di lint.
  // Deve restare l'ultimo elemento della flat config.
  prettierRecommended,
);
