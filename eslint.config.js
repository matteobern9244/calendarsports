import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      // Stato locale dei plugin per agenti AI: non e' codice del progetto e non
      // deve comparire fra gli errori di lint.
      ".remember",
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
      "@typescript-eslint/no-unused-vars": "off",
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
              group: [
                "**/integrations/supabase/client",
                "src/integrations/supabase/client",
              ],
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
);
