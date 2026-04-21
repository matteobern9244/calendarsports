/**
 * Helpers che restituiscono la stagione "in corso" per ciascuno sport.
 * - Tennis (Sinner), F1, MotoGP: anno solare corrente.
 * - Calcio (Juventus): stagione Serie A in corso (cutoff luglio).
 *   Se mese >= luglio (0-indexed >= 6) -> anno corrente (es. ago 2026 -> 2026 = 2026/27).
 *   Altrimenti -> anno-1 (es. apr 2026 -> 2025 = 2025/26).
 *
 * L'argomento `now` serve solo ai test: in produzione si usa `new Date()`.
 */

export function getCurrentSinnerSeason(now: Date = new Date()): number {
  return now.getFullYear();
}

export function getCurrentF1Season(now: Date = new Date()): number {
  return now.getFullYear();
}

export function getCurrentMotoGPSeason(now: Date = new Date()): number {
  return now.getFullYear();
}

export function getCurrentJuventusSeason(now: Date = new Date()): number {
  const year = now.getFullYear();
  const month = now.getMonth();
  return month >= 6 ? year : year - 1;
}
