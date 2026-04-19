import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (
            id.includes("react/") ||
            id.includes("react-dom") ||
            id.includes("scheduler") ||
            id.includes("react-router") ||
            id.includes("@tanstack/react-query")
          ) {
            return "framework";
          }

          if (id.includes("framer-motion")) {
            return "motion";
          }

          if (id.includes("lucide-react")) {
            return "icons";
          }

          if (id.includes("@radix-ui") || id.includes("sonner") || id.includes("vaul")) {
            return "ui-vendor";
          }

          if (id.includes("recharts")) {
            return "charts";
          }
        },
      },
    },
  },
}));
