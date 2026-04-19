import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
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
    // Il wrapper sicuro e il file auto-generato possono restare liberi dalla regola.
    files: [
      "src/lib/supabaseClient.ts",
      "src/integrations/supabase/client.ts",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    // I componenti UI shadcn esportano spesso helper/varianti oltre al componente.
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
);
