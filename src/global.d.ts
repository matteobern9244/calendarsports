/**
 * Identificativo della build iniettato da Vite (vedi `vite.config.ts`).
 * Prima viveva in `src/vite-env.d.ts`, rimosso dalla migrazione a TanStack
 * Start; serve alla registrazione del service worker in `__root.tsx`.
 */
declare const __BUILD_ID__: string;
