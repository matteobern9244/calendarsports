
## Piano: barra di progresso visiva durante Sincronizza

### Obiettivo
Sotto il bottone "Sincronizza" mostrare un `<Progress>` (shadcn) che avanza in 3 step:
- 0% → start
- 33% → fine sport
- 66% → fine palinsesti TV
- 100% → fine nuove uscite + auto-hide dopo ~600ms

### Modifica
**`src/pages/Index.tsx`**:
- Nuovo state `syncProgress: number` (0-100).
- Aggiornarlo nelle 3 fasi di `handleSync`.
- Renderizzare `<Progress value={syncProgress} />` larghezza ~240px allineato a destra sotto il bottone, visibile solo quando `syncing` è true.
- Reset a 0 a fine handler dopo breve delay.

### Vincoli
- Nessuna nuova dipendenza (`@/components/ui/progress` già presente).
- UI invariata fuori dall'area sync.
